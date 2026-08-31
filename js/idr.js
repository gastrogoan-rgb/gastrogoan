/* ============================================================
   I+D — Creación de platos, menús y cartas
   ============================================================
   Ver PLAN-IDR.md. Resumen de las decisiones que explican este código:

   - La clave del proveedor va en localStorage, POR DISPOSITIVO, y NO en
     DB.business: ese bloque se sincroniza con la Firebase del negocio y
     su propio personal podría leerla. Mismo criterio que se tomó con el
     idioma cuando el selector no funcionaba.
   - Se pide DENTRO del módulo, nunca en el alta: el alta es el punto
     donde un cliente se atasca y llama, y quien no use I+D no debe
     enterarse siquiera de que esto existe.
   - Una capa fina delante del proveedor (llmChat) para que sea un ajuste
     y no una decisión de por vida.
   - Sin IA el módulo SIGUE: lo ya creado se ve, se edita y se imprime.
     La IA es el ayudante, no el soporte.
   ============================================================ */

const IDR_KEY_LS = 'gastrogoan_idr_key';        // {proveedor, clave, modelo}
const IDR_GASTO_LS = 'gastrogoan_idr_gasto';    // {dia, llamadas}
// Tope duro de llamadas por día y dispositivo. El consumo lo paga el dueño
// de la clave, así que nada puede engancharse gastando su cuota sin que se
// vea. No es el límite de verdad -ese lo pone su proveedor-, es un freno
// para que un fallo nuestro no le salga caro.
const IDR_TOPE_DIA = 500;
// Cuantos modelos se prueban al pedir la lista. Cada prueba es una llamada
// minima, pero la cuota es del cliente: con los primeros hay de sobra.
const IDR_MAX_MODELOS_A_PROBAR = 10;
// Lo que se espera a una respuesta antes de darla por perdida.
const IDR_ESPERA_MAX_MS = 25000;

const IDR_PROVEEDORES = {
  google: {
    l:{es:'Google (Gemini)',ca:'Google (Gemini)',en:'Google (Gemini)'},
    // ⚠️ Google RETIRA modelos cada pocos meses: gemini-2.0-flash dejó de
    // existir y devolvía un 404 que, sin el botón de probar la conexión, un
    // hostelero solo veía como "el asistente no ha podido responder". Por eso
    // el modelo es un campo editable y hay un botón que le pregunta a Google
    // qué modelos admite ESA clave: cuando vuelva a pasar, se arregla desde
    // los ajustes sin tocar la app ni volver a subirla.
    modeloPorDefecto: 'gemini-3.6-flash',
    // Lista de modelos disponibles para la clave del negocio.
    listaModelos: k => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`,
    extraerModelos: j => (j.models||[])
      .filter(m => (m.supportedGenerationMethods||[]).includes('generateContent'))
      .map(m => String(m.name||'').replace(/^models\//, ''))
      .filter(Boolean),
    // Verificado: responde a la llamada directa desde el navegador.
    url: (m, k) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(k)}`,
    cabeceras: () => ({'content-type':'application/json'}),
    cuerpo: (sistema, mensajes, maxTokens) => ({
      systemInstruction: {parts:[{text: sistema}]},
      contents: mensajes.map(m => ({role: m.role === 'assistant' ? 'model' : 'user', parts:[{text: m.content}]})),
      generationConfig: {maxOutputTokens: maxTokens, temperature: 0.8},
    }),
    extraer: j => {
      const c = j && j.candidates && j.candidates[0];
      const partes = c && c.content && c.content.parts;
      return (partes||[]).map(p => p.text||'').join('').trim();
    },
    motivoCorte: j => (j && j.candidates && j.candidates[0] && j.candidates[0].finishReason) || '',
    ayuda: 'https://aistudio.google.com/apikey',
  },
  anthropic: {
    l:{es:'Anthropic (Claude)',ca:'Anthropic (Claude)',en:'Anthropic (Claude)'},
    modeloPorDefecto: 'claude-sonnet-4-5',
    url: () => 'https://api.anthropic.com/v1/messages',
    // Sin esta cabecera el navegador NO deja pasar la llamada. Verificado.
    cabeceras: k => ({
      'content-type':'application/json',
      'x-api-key': k,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
    }),
    cuerpo: (sistema, mensajes, maxTokens, modelo) => ({
      model: modelo, max_tokens: maxTokens, system: sistema,
      messages: mensajes.map(m => ({role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content})),
    }),
    extraer: j => ((j && j.content) || []).map(p => p.text||'').join('').trim(),
    motivoCorte: j => (j && j.stop_reason) || '',
    listaModelos: () => 'https://api.anthropic.com/v1/models',
    cabecerasLista: k => ({'x-api-key': k, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'}),
    extraerModelos: j => (j.data||[]).map(m => m.id).filter(Boolean),
    ayuda: 'https://console.anthropic.com/settings/keys',
  },
};

function idrConfig(){
  try{
    const raw = localStorage.getItem(IDR_KEY_LS);
    if(!raw) return null;
    const c = JSON.parse(raw);
    return (c && c.clave && IDR_PROVEEDORES[c.proveedor]) ? c : null;
  }catch(e){ return null; }
}
function idrGuardarConfig(proveedor, clave, modelo){
  const def = IDR_PROVEEDORES[proveedor];
  if(!def) return false;
  localStorage.setItem(IDR_KEY_LS, JSON.stringify({
    proveedor, clave: (clave||'').trim(), modelo: (modelo||'').trim() || def.modeloPorDefecto,
  }));
  return true;
}
function idrBorrarConfig(){ localStorage.removeItem(IDR_KEY_LS); }
function idrHayIA(){ return !!idrConfig(); }

/* ── Tope de gasto ──
   Se cuenta por día natural y por dispositivo. No mide euros (el precio
   depende del proveedor y del modelo), mide llamadas, que es lo que el
   cliente puede entender y lo que hace falta para que nada se desboque. */
function idrGastoHoy(){
  const hoy = new Date().toISOString().slice(0,10);
  try{
    const g = JSON.parse(localStorage.getItem(IDR_GASTO_LS) || '{}');
    return (g && g.dia === hoy) ? (g.llamadas||0) : 0;
  }catch(e){ return 0; }
}
function idrApuntarLlamada(){
  const hoy = new Date().toISOString().slice(0,10);
  localStorage.setItem(IDR_GASTO_LS, JSON.stringify({dia: hoy, llamadas: idrGastoHoy() + 1}));
}
function idrQuedanLlamadas(){ return Math.max(0, IDR_TOPE_DIA - idrGastoHoy()); }

/* ── La llamada ──
   Devuelve {ok:true, texto} o {ok:false, motivo, detalle}. Los motivos son
   los que un hostelero puede entender y resolver; el detalle técnico queda
   para el aviso de ayuda, no para la cara. */
async function llmChat(sistema, mensajes, opciones){
  const o = opciones || {};
  const cfg = idrConfig();
  if(!cfg) return {ok:false, motivo:'sin-clave'};
  if(idrQuedanLlamadas() <= 0) return {ok:false, motivo:'tope'};
  const def = IDR_PROVEEDORES[cfg.proveedor];
  const modelo = cfg.modelo || def.modeloPorDefecto;
  const maxTokens = o.maxTokens || 2000;

  idrApuntarLlamada();
  let res;
  // Tope de espera: sin esto, una respuesta que no llega nunca deja el
  // boton en "Pensando..." para siempre, sin error ni aviso. Desde fuera
  // parece que el boton no hace nada, que es justo lo que reporto el dueño.
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), IDR_ESPERA_MAX_MS);
  try{
    res = await fetch(def.url(modelo, cfg.clave), {
      method:'POST',
      headers: def.cabeceras(cfg.clave),
      body: JSON.stringify(def.cuerpo(sistema, mensajes, maxTokens, modelo)),
      signal: corte.signal,
    });
  }catch(e){
    clearTimeout(reloj);
    if(e && e.name === 'AbortError') return {ok:false, motivo:'tardanza'};
    // fetch solo revienta así si no salió del dispositivo: sin cobertura,
    // o el navegador bloqueó la llamada.
    return {ok:false, motivo:'sin-conexion', detalle:e.message};
  }
  clearTimeout(reloj);
  if(!res.ok){
    let detalle = '';
    try{ detalle = (await res.text()).slice(0, 300); }catch(e){}
    if(res.status === 401 || res.status === 403) return {ok:false, motivo:'clave-mala', detalle};
    if(res.status === 429) return {ok:false, motivo:'cuota', detalle};
    // 404 = el modelo ya no existe. Pasa cada pocos meses y no es culpa de
    // nadie: se arregla eligiendo otro en los ajustes, sin tocar la app.
    if(res.status === 404) return {ok:false, motivo:'modelo', detalle};
    return {ok:false, motivo:'proveedor', detalle: `HTTP ${res.status} ${detalle}`};
  }
  let j;
  try{ j = await res.json(); }catch(e){ return {ok:false, motivo:'proveedor', detalle:'respuesta ilegible'}; }
  const texto = def.extraer(j);
  if(!texto){
    /* Los modelos "que piensan" (gemini-3.6-flash, entre otros) gastan parte
       del presupuesto de tokens razonando ANTES de escribir. Con unas
       instrucciones largas —y las de oficio lo son— se quedan sin margen y
       devuelven un candidato VACÍO, sin una sola palabra. Desde fuera es
       "el asistente no contesta nunca", que es justo lo que reportó el dueño.
       No se puede desactivar el razonamiento sin arriesgarse a que el modelo
       rechace la petición, así que se reintenta UNA vez con el triple de
       margen. Una sola vez: si vuelve vacía, es otra cosa y hay que verla. */
    const corte = def.motivoCorte ? def.motivoCorte(j) : '';
    const sinSitio = /MAX_TOKENS|max_tokens|length/i.test(String(corte));
    if(sinSitio && !o.reintento){
      return llmChat(sistema, mensajes, Object.assign({}, o, {
        maxTokens: Math.min(maxTokens * 3, 8000), reintento: true,
      }));
    }
    return {ok:false, motivo:'vacia', detalle: corte ? `motivo de corte: ${corte}` : 'sin texto en la respuesta'};
  }
  return {ok:true, texto};
}

const IDR_MOTIVO_KEYS = {
  'sin-clave':'idr.err.noKey', 'tope':'idr.err.limit', 'sin-conexion':'idr.err.offline',
  'clave-mala':'idr.err.badKey', 'cuota':'idr.err.quota', 'proveedor':'idr.err.provider', 'modelo':'idr.err.model',
  'vacia':'idr.err.empty', 'tardanza':'idr.err.timeout',
  'pantalla':'idr.err.render', 'avanzar':'idr.err.render', 'excepcion':'idr.err.render', 'js':'idr.err.render',
};
// El último fallo real, con su detalle técnico. En la cara del hostelero va
// el mensaje en cristiano; el detalle se guarda para que se pueda ver desde
// los ajustes del asistente y contárselo a quien pueda arreglarlo. Sin
// esto, un "no ha podido responder" no se puede diagnosticar de ninguna
// manera desde el otro lado del teléfono.
let idrUltimoFallo = null;
function idrMensajeError(r){
  if(r && !r.ok) idrUltimoFallo = {motivo: r.motivo, detalle: r.detalle || '', cuando: new Date().toISOString()};
  return t(IDR_MOTIVO_KEYS[r && r.motivo] || 'idr.err.provider');
}

/* Ultima red: cualquier error de JavaScript que se escape queda apuntado con
   su detalle. Diagnosticar "los botones no hacen nada" por telefono, sin esto,
   es imposible. */
if(typeof window !== 'undefined'){
  window.addEventListener('error', ev => {
    idrUltimoFallo = {motivo:'js', detalle: String((ev.error && ev.error.stack) || ev.message || '') + ' @ ' + (ev.filename||'') + ':' + (ev.lineno||''), cuando: new Date().toISOString()};
    if(idrVista === 'creacion' && typeof showToast === 'function') showToast(t('idr.err.render'));
  });
  window.addEventListener('unhandledrejection', ev => {
    const r = ev.reason;
    idrUltimoFallo = {motivo:'js', detalle: String((r && (r.stack || r.message)) || r || ''), cuando: new Date().toISOString()};
  });
}

/* Leer un campo de la ventana de ajustes sin dar por hecho que sigue ahí.
   Probar los modelos tarda (una llamada por modelo), y en ese rato el
   hostelero puede cerrar la ventana o cambiar de proveedor: al volver, los
   campos ya no existen y la app reventaba con "no puedo leer 'value' de
   null". Con esto, si la ventana ya no está, se sale sin ruido. */
function idrValorCampo(id){
  const el = document.getElementById(id);
  return el ? (el.value || '') : null;
}

/* Le pregunta al proveedor qué modelos admite ESTA clave y los ofrece en una
   lista. Es la respuesta al problema de fondo: los modelos se retiran cada
   pocos meses, y sin esto un cliente se queda con el asistente muerto y un
   error que no sabe interpretar. Con esto lo arregla él en dos toques. */
async function idrCargarModelos(){
  try{ await idrCargarModelosInterno(); }
  catch(e){
    idrUltimoFallo = {motivo:'excepcion', detalle: String(e && (e.stack || e.message) || e), cuando: new Date().toISOString()};
    const b = document.getElementById('idr-modelos');
    if(b){ b.disabled = false; b.innerHTML = `<i class="ti ti-list"></i> ${t('idr.listModels')}`; }
    if(typeof showToast === 'function') showToast(t('idr.err.render'));
  }
}
async function idrCargarModelosInterno(){
  const btn = document.getElementById('idr-modelos');
  const res = document.getElementById('idr-test-res');
  const p = idrValorCampo('idr-prov');
  const kRaw = idrValorCampo('idr-clave');
  if(p === null || kRaw === null) return;   // la ventana ya no está abierta
  const k = kRaw.trim();
  const def = IDR_PROVEEDORES[p];
  if(!k){ showToast(t('idr.keyRequired')); return; }
  if(!def || !def.listaModelos){ showToast(t('idr.err.provider')); return; }
  if(btn){ btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader"></i> ${t('idr.testing')}`; }
  let modelos = [], fallo = null;
  try{
    const r = await fetch(def.listaModelos(k), {headers: def.cabecerasLista ? def.cabecerasLista(k) : {}});
    if(!r.ok) fallo = `HTTP ${r.status} ${(await r.text()).slice(0,200)}`;
    else modelos = def.extraerModelos(await r.json()) || [];
  }catch(e){ fallo = e.message; }
  if(btn){ btn.disabled = false; btn.innerHTML = `<i class="ti ti-list"></i> ${t('idr.listModels')}`; }
  if(fallo || !modelos.length){
    if(res) res.innerHTML = `<span style="color:var(--red)"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('idr.modelsFailed'))}</span>`
      + (fallo ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;word-break:break-word">${escapeHtml(String(fallo).slice(0,300))}</div>` : '');
    return;
  }

  /* El proveedor lista MUCHOS modelos y la mayoria no sirven aqui: unos son
     de otra generacion, otros piden permisos que esa clave no tiene, otros
     no valen para escribir. Ofrecerlos todos es mandar al hostelero a
     probar a ciegas — que es justo lo que le paso al dueño.
     Asi que se prueban de verdad, uno a uno, con la peticion mas pequeña
     posible, y solo se ofrecen los que contestan. */
  const candidatos = modelos.slice(0, IDR_MAX_MODELOS_A_PROBAR);
  const buenos = [];
  /* Para probar un modelo hay que guardarlo antes, así que durante este rato
     la configuración del asistente está prestada. Si algo revienta a mitad
     (o el hostelero cierra la ventana), ANTES se quedaba apuntando a un
     modelo cualquiera de la lista, elegido por nadie: el asistente dejaba de
     funcionar y no había forma de saber por qué. El `finally` garantiza que
     se devuelve siempre lo que había. */
  const configPrevia = idrConfig();
  try{
    for(let i = 0; i < candidatos.length; i++){
      if(res) res.innerHTML = `<span style="color:var(--muted)"><i class="ti ti-loader"></i> ${escapeHtml(t('idr.testingModels').replace('${i}', i+1).replace('${n}', candidatos.length))}</span>`;
      idrGuardarConfig(p, k, candidatos[i]);
      const prueba = await llmChat('Responde solo OK.', [{role:'user', content:'Di OK'}], {maxTokens: 12});
      if(prueba.ok) buenos.push(candidatos[i]);
    }
  } finally {
    if(configPrevia) idrGuardarConfig(configPrevia.proveedor, configPrevia.clave, configPrevia.modelo);
    else idrBorrarConfig();
  }
  modelos = buenos;
  if(!modelos.length){
    if(res) res.innerHTML = `<span style="color:var(--red)"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('idr.noModelsWork'))}</span>`;
    return;
  }
  // Se sustituye el campo de texto por una lista con lo que de verdad hay.
  const actual = (idrValorCampo('idr-modelo') || '').trim();
  const campo = document.getElementById('idr-modelo-campo');
  if(campo){
    campo.innerHTML = `<select id="idr-modelo">${modelos.map(m =>
      `<option value="${escapeHtml(m)}"${m===actual?' selected':''}>${escapeHtml(m)}</option>`).join('')}</select>`;
  }
  if(res) res.innerHTML = `<span style="color:#1F8A4C"><i class="ti ti-check"></i> ${escapeHtml(t('idr.modelsOk').replace('${n}', modelos.length))}</span>`;
}

// Comprueba la clave de verdad, con la llamada más pequeña posible, y dice
// exactamente qué ha pasado. Es lo primero que hay que hacer al configurar.
async function idrProbarConexion(){
  const btn = document.getElementById('idr-probar');
  if(btn){ btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader"></i> ${t('idr.testing')}`; }
  const p = idrValorCampo('idr-prov');
  const k = idrValorCampo('idr-clave');
  const m = idrValorCampo('idr-modelo');
  if(p === null || k === null){ if(btn){ btn.disabled = false; } return; }
  if(!(k||'').trim()){ showToast(t('idr.keyRequired')); idrConfigModal(); return; }
  // Se guarda antes de probar: si funciona, ya queda puesta.
  idrGuardarConfig(p, k, m);
  const r = await llmChat('Responde solo con la palabra OK.', [{role:'user', content:'Di OK'}], {maxTokens: 20});
  const res = document.getElementById('idr-test-res');
  if(r.ok){
    if(res) res.innerHTML = `<span style="color:#1F8A4C"><i class="ti ti-check"></i> ${escapeHtml(t('idr.testOk'))}</span>`;
  } else {
    const msg = idrMensajeError(r);
    if(res) res.innerHTML = `<span style="color:var(--red)"><i class="ti ti-alert-triangle"></i> ${escapeHtml(msg)}</span>`
      + (r.detalle ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;word-break:break-word;max-height:120px;overflow:auto">${escapeHtml(String(r.detalle).slice(0,400))}</div>` : '');
  }
  if(btn){ btn.disabled = false; btn.innerHTML = `<i class="ti ti-plug-connected"></i> ${t('idr.test')}`; }
}

/* ── Respuesta estructurada ──
   Se le pide JSON para poder COSTEAR y CREAR lo que propone. Si contesta
   con prosa, es un chat; si contesta con algo que la app entiende, es una
   herramienta. Los modelos a veces lo envuelven en ```json, y a veces
   añaden una frase antes: se rescata el bloque en vez de darlo por
   perdido. */
function idrExtraerJson(texto){
  if(!texto) return null;
  let s = String(texto).trim();
  const valla = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(valla) s = valla[1].trim();
  try{ return JSON.parse(s); }catch(e){}
  const ini = s.search(/[\[{]/);
  if(ini < 0) return null;
  const abre = s[ini];
  const cierra = abre === '{' ? '}' : ']';
  const fin = s.lastIndexOf(cierra);
  if(fin <= ini) return null;
  try{ return JSON.parse(s.slice(ini, fin+1)); }catch(e){ return null; }
}

/* ============================================================
   ADN GASTRONÓMICO
   ============================================================
   Lo que evita que a un negocio de cocina catalana le proponga un ramen en
   vez de una escudella. Se rellena una vez, se edita cuando cambia el
   negocio, y entra en CADA generación. */

const IDR_ADN_CAMPOS = [
  {k:'cocina', tipo:'text', l:{es:'Cocina y tradición',ca:'Cuina i tradició',en:'Cuisine and tradition'},
   ph:{es:'Ej. Catalana de mercado con toques de brasa',ca:'Ex. Catalana de mercat amb tocs de brasa',en:'e.g. Catalan market cooking with grill accents'},
   ayuda:{es:'La línea maestra: es lo que más pesa en todo lo que se proponga. Cuanto más concreto, mejor — "catalana de mercado" dice mucho más que "mediterránea".',
          ca:'La línia mestra: és el que més pesa en tot el que es proposi. Com més concret, millor — "catalana de mercat" diu molt més que "mediterrània".',
          en:'The guiding line: it weighs most on everything proposed. The more specific the better — "Catalan market cooking" says far more than "Mediterranean".'}},
  // Texto libre a propósito: un desplegable de cinco opciones no describe
  // ningún negocio de verdad, y el asistente saca más de una frase escrita
  // por el hostelero que de una etiqueta elegida de una lista.
  {k:'nivel', tipo:'area', l:{es:'Nivel',ca:'Nivell',en:'Level'},
   ph:{es:'Ej. Comida de diario, precio ajustado, sin pretensiones pero con producto bueno',
       ca:'Ex. Menjar de diari, preu ajustat, sense pretensions però amb producte bo',
       en:'e.g. Everyday food, keen prices, unpretentious but with good produce'},
   ayuda:{es:'Cuéntalo con tus palabras: si es comida de diario o de celebración, si se viene a comer rápido o a estar, y a qué precio trabajas.',
          ca:'Explica-ho amb les teves paraules: si és menjar de diari o de celebració, si s\'hi ve a menjar ràpid o a estar-s\'hi, i a quin preu treballes.',
          en:'In your own words: everyday food or special occasion, quick lunch or lingering, and at what price you work.'}},
  {k:'insignia', tipo:'area', l:{es:'Producto insignia',ca:'Producte insígnia',en:'Signature product'},
   ph:{es:'Ej. El arroz de los domingos y las croquetas de la abuela: si no están, la gente pregunta',
       ca:'Ex. L\'arròs dels diumenges i les croquetes de l\'àvia: si no hi són, la gent pregunta',
       en:'e.g. The Sunday rice and grandma\'s croquettes: if they are missing, people ask'},
   ayuda:{es:'Los platos o el producto por los que te conocen. El asistente los respetará y construirá alrededor.',
          ca:'Els plats o el producte pels quals et coneixen. L\'assistent els respectarà i construirà al voltant.',
          en:'The dishes or produce you are known for. The assistant will respect them and build around them.'}},
  {k:'lineasRojas', tipo:'area', l:{es:'Líneas rojas',ca:'Línies vermelles',en:'Red lines'},
   ph:{es:'Ej. Nada de fusión asiática, ni espumas, ni platos que no se entiendan leyendo el nombre',
       ca:'Ex. Res de fusió asiàtica, ni escumes, ni plats que no s\'entenguin llegint el nom',
       en:'e.g. No Asian fusion, no foams, no dishes you cannot understand from the name'},
   ayuda:{es:'Tan importante como lo de arriba: es lo que el asistente NO te va a proponer nunca. Escribe aquí lo que te haría decir "eso no es mi restaurante".',
          ca:'Tan important com el de dalt: és el que l\'assistent NO et proposarà mai. Escriu-hi el que et faria dir "això no és el meu restaurant".',
          en:'As important as the above: it is what the assistant will never propose. Write what would make you say "that is not my restaurant".'}},
  {k:'publico', tipo:'text', l:{es:'Público',ca:'Públic',en:'Clientele'},
   ph:{es:'Ej. Oficinas al mediodía y familias del barrio los fines de semana',ca:'Ex. Oficines al migdia i famílies del barri els caps de setmana',en:'e.g. Offices at lunch and local families at weekends'},
   ayuda:{es:'Quién se sienta en tus mesas y cuándo. Cambia el tamaño de las raciones, el precio y hasta el tiempo de espera que aguantan.',
          ca:'Qui s\'asseu a les teves taules i quan. Canvia la mida de les racions, el preu i fins i tot el temps d\'espera que aguanten.',
          en:'Who sits at your tables and when. It changes portion size, price and even how long they will wait.'}},
  {k:'foodCostObjetivo', tipo:'num', unidad:'%', min:0, max:100, l:{es:'Food cost objetivo',ca:'Food cost objectiu',en:'Target food cost'},
   ph:{es:'Ej. 30',ca:'Ex. 30',en:'e.g. 30'},
   ayuda:{es:'Qué parte del precio de venta quieres que sea coste de materia prima. Con esto la app te propone el precio de cada plato y te avisa si se pasa.',
          ca:'Quina part del preu de venda vols que sigui cost de matèria primera. Amb això l\'app et proposa el preu de cada plat i t\'avisa si es passa.',
          en:'What share of the selling price should be raw ingredient cost. With this the app suggests each dish price and warns you if it goes over.'}},
  {k:'equipamiento', tipo:'area', l:{es:'Equipamiento',ca:'Equipament',en:'Equipment'},
   ph:{es:'Ej. Horno mixto, brasa, abatidor. Sin Roner ni deshidratador',ca:'Ex. Forn mixt, brasa, abatedor. Sense Roner ni deshidratador',en:'e.g. Combi oven, grill, blast chiller. No sous-vide or dehydrator'},
   ayuda:{es:'Lo que tienes y —muy importante— lo que NO tienes. Escribe "sin" delante de lo que te falte: la app lo entiende y no te propondrá esa técnica.',
          ca:'El que tens i —molt important— el que NO tens. Escriu "sense" davant del que et falti: l\'app ho entén i no et proposarà aquesta tècnica.',
          en:'What you have and — importantly — what you do NOT. Write "no" before what you lack: the app understands it and will not propose that technique.'}},
  {k:'equipo', tipo:'text', l:{es:'Equipo en partida',ca:'Equip a partida',en:'Kitchen brigade'},
   ph:{es:'Ej. 2 cocineros y un ayudante',ca:'Ex. 2 cuiners i un ajudant',en:'e.g. 2 cooks and one helper'},
   ayuda:{es:'Cuántos sois en cocina durante el servicio. Con esto la app avisa si una carta pide más trabajo al momento del que podéis sacar.',
          ca:'Quants sou a cuina durant el servei. Amb això l\'app avisa si una carta demana més feina al moment de la que podeu treure.',
          en:'How many of you are on the line during service. With this the app warns if a menu needs more à la minute work than you can handle.'}},
  {k:'producto', tipo:'area', l:{es:'Producto',ca:'Producte',en:'Produce'},
   ph:{es:'Ej. Verdura del mercado cada mañana y pescado de lonja; la carne siempre del mismo ganadero',
       ca:'Ex. Verdura del mercat cada matí i peix de llotja; la carn sempre del mateix ramader',
       en:'e.g. Market veg every morning and fish from the quay; meat always from the same farmer'},
   ayuda:{es:'De dónde sale lo que cocinas y cada cuánto cambia: si sigues la temporada, si trabajas proveedores fijos, o si la carta es la misma todo el año.',
          ca:'D\'on surt el que cuines i cada quant canvia: si segueixes la temporada, si treballes amb proveïdors fixos, o si la carta és la mateixa tot l\'any.',
          en:'Where your produce comes from and how often it changes: seasonal, fixed suppliers, or the same menu all year.'}},
  {k:'dietas', tipo:'text', l:{es:'Dietas obligatorias',ca:'Dietes obligatòries',en:'Required diets'},
   ph:{es:'Ej. Siempre una opción vegetariana y una sin gluten',ca:'Ex. Sempre una opció vegetariana i una sense gluten',en:'e.g. Always a vegetarian and a gluten-free option'},
   ayuda:{es:'Lo que nunca puede faltar en tu carta. La app comprueba que se cumpla y te avisa si un menú se queda sin ello.',
          ca:'El que mai pot faltar a la teva carta. L\'app comprova que es compleixi i t\'avisa si un menú se\'n queda sense.',
          en:'What your menu must always include. The app checks it and warns you if a menu ends up without it.'}},
  {k:'idiomaPlatos', tipo:'text', l:{es:'Idioma de los platos',ca:'Idioma dels plats',en:'Language of dish names'},
   ph:{es:'Ej. Catalán',ca:'Ex. Català',en:'e.g. Catalan'},
   ayuda:{es:'En qué idioma quieres que salgan los nombres de los platos para la carta.',
          ca:'En quin idioma vols que surtin els noms dels plats per a la carta.',
          en:'Which language you want the dish names written in for the menu.'}},
];

function idrAdn(){
  if(!DB.idr || typeof DB.idr !== 'object') DB.idr = {};
  // Firebase no guarda objetos vacíos: puede volver sin adn.
  if(!DB.idr.adn || typeof DB.idr.adn !== 'object') DB.idr.adn = {};
  return DB.idr.adn;
}
/* Antes bastaba con UN campo cualquiera para dar el ADN por hecho. Ahora que
   el ADN es requisito para usar el asistente, "relleno" tiene que significar
   algo: se exigen los tres que de verdad cambian lo que propone — qué cocina
   es, a qué nivel juega y para quién cocina. Sin esos tres, cualquier
   propuesta vale igual, que es lo mismo que decir que ninguna sirve. */
const IDR_ADN_MINIMO = ['cocina', 'nivel', 'publico'];
function idrAdnRelleno(){
  const a = idrAdn();
  return IDR_ADN_MINIMO.every(k => a[k] !== undefined && String(a[k]).trim() !== '');
}
function idrAdnQueFalta(){
  const a = idrAdn();
  return IDR_ADN_MINIMO
    .filter(k => a[k] === undefined || String(a[k]).trim() === '')
    .map(k => { const c = IDR_ADN_CAMPOS.find(x => x.k === k); return c ? gl(c.l) : k; });
}
// El bloque que se le pasa al modelo en CADA generación. Corto a propósito:
// es lo que más cambia el resultado y lo que menos cuesta enviar.
function idrAdnTexto(){
  const a = idrAdn();
  const lineas = IDR_ADN_CAMPOS.map(c => {
    const v = a[c.k];
    if(v === undefined || String(v).trim() === '') return null;
    const etiqueta = (c.l.es || c.k);
    return `- ${etiqueta}: ${String(v).trim()}${c.unidad ? ' ' + c.unidad : ''}`;
  }).filter(Boolean);
  return lineas.length ? lineas.join('\n') : '';
}

/* ============================================================
   EL CONTEXTO DEL NEGOCIO
   ============================================================
   La diferencia entre "prueba un solomillo al oporto" y "con el solomillo
   que ya le compras a Cárnicas Pérez a 18,40 €/kg te sale a 4,10 € de
   coste". Lo segundo solo lo puede decir quien conoce el negocio.

   Se envía recortado: una carta de 400 platos no cabe (ni hace falta) en
   una petición, y el que paga la llamada es el cliente. */

const IDR_MAX_INGREDIENTES = 150;
const IDR_MAX_PLATOS = 60;

// Los ingredientes de cocina con su precio real por unidad.
function idrIngredientesTexto(){
  const ings = (DB.ingredients||[]).filter(i => (i.area||'cocina') === 'cocina');
  if(!ings.length) return '';
  const lineas = ings.slice(0, IDR_MAX_INGREDIENTES).map(i =>
    `${i.name} (${fmtNum(i.price)} €/${i.unit}${i.supplier ? ', ' + i.supplier : ''})`
  );
  const cola = ings.length > IDR_MAX_INGREDIENTES ? ` … y ${ings.length - IDR_MAX_INGREDIENTES} más` : '';
  return lineas.join(' · ') + cola;
}

// Los platos que ya están en carta, para no proponer lo que ya tiene.
function idrCartaTexto(){
  const cartas = (DB.cartas||[]).filter(c => typeof isBebidaCarta === 'function' ? !isBebidaCarta(c) : true);
  const nombres = [];
  cartas.forEach(c => (c.secciones||[]).forEach(s => (s.platos||[]).forEach(p => {
    const n = (p && (p.nombre || p.name)) || '';
    if(n && nombres.length < IDR_MAX_PLATOS) nombres.push(`${n} (${s.nombre||''})`);
  })));
  return nombres.join(' · ');
}

// Qué se vende de verdad. Sin datos suficientes NO se envía nada: es
// preferible que el asistente diga "no tengo datos" a que opine sobre una
// tendencia sacada de tres tickets.
const IDR_MIN_VENTAS = 40;
function idrVentasTexto(){
  const ventas = DB.ventas || [];
  if(ventas.length < IDR_MIN_VENTAS) return '';
  const cuenta = {};
  ventas.forEach(v => (v.items||[]).forEach(it => {
    if(!it || it.isShipping || it.bebida) return;
    const n = it.name || '';
    if(!n) return;
    cuenta[n] = (cuenta[n]||0) + (parseFloat(it.qty)||0);
  }));
  const orden = Object.keys(cuenta).sort((a,b) => cuenta[b]-cuenta[a]);
  if(!orden.length) return '';
  const top = orden.slice(0,10).map(n => `${n} (${fmtNum(cuenta[n])})`);
  const cola = orden.slice(-5).reverse().map(n => `${n} (${fmtNum(cuenta[n])})`);
  return `Más vendidos: ${top.join(' · ')}\nMenos vendidos: ${cola.join(' · ')}`;
}

/* Lo que YA tiene hecho. Era el hueco más grande del módulo: el asistente no
   sabía que en esa cocina ya se hace un fondo oscuro y un sofrito, así que
   empezaba cada plato desde cero. Un jefe de cocina no piensa así — monta
   sobre su mise en place, porque es lo que abarata el plato y lo que lo hace
   viable en un servicio de verdad.
   Además la app SABE costear un plato que use una elaboración (línea de tipo
   "base"), así que esto no es solo contexto: es coste real encadenado. */
const IDR_MAX_ELABORACIONES = 40;
function idrElaboracionesTexto(){
  const bases = (DB.recipes||[]).filter(r => r.isBase && (r.area||'cocina') === 'cocina');
  if(!bases.length) return '';
  const lineas = bases.slice(0, IDR_MAX_ELABORACIONES).map(r => {
    const porUnidad = (typeof recipeBaseCostPerUnit === 'function') ? recipeBaseCostPerUnit(r) : 0;
    return `${r.name} (${fmtNum(porUnidad)} €/${r.baseUnit||'L'})`;
  });
  return lineas.join(' · ');
}
// Sus fichas de plato, para que no repita lo que ya tiene resuelto y para que
// pueda decir "esto es una variante de tu X".
const IDR_MAX_FICHAS = 40;
function idrRecetasTexto(){
  const platos = (DB.recipes||[]).filter(r => !r.isBase && (r.area||'cocina') === 'cocina');
  if(!platos.length) return '';
  return platos.slice(0, IDR_MAX_FICHAS).map(r => r.name).join(' · ');
}

/* Lo que hay en cámara AHORA. Es lo que permite la pregunta que de verdad se
   hace cada semana en una cocina: "tengo esto, sácame algo". No hay fechas de
   caducidad por lote en la app, así que no se habla de lo que está a punto de
   irse — solo de lo que hay y cuánto. Decir más sería inventar. */
const IDR_MAX_STOCK = 40;
function idrStockTexto(){
  const stock = DB.stock || {};
  const lineas = [];
  (DB.ingredients||[]).forEach(i => {
    if((i.area||'cocina') !== 'cocina') return;
    const s2 = stock[i.id];
    const qty = s2 ? parseFloat(s2.qty) : 0;
    if(!isFinite(qty) || qty <= 0) return;
    lineas.push(`${i.name}: ${fmtNum(qty)} ${i.unit}`);
  });
  (DB.elaboraciones||[]).forEach(e => {
    if((e.area||'cocina') !== 'cocina') return;
    const qty = parseFloat(e.qty);
    if(!isFinite(qty) || qty <= 0) return;
    lineas.push(`${e.name}: ${fmtNum(qty)} ${e.unit||'L'}`);
  });
  if(!lineas.length) return '';
  return lineas.slice(0, IDR_MAX_STOCK).join(' · ');
}

function idrContextoNegocio(){
  const partes = [];
  const adn = idrAdnTexto();
  if(adn) partes.push('ADN GASTRONÓMICO DE LA CASA (manda sobre todo lo demás):\n' + adn);
  else partes.push('ADN GASTRONÓMICO: sin definir. Avisa de que las propuestas serán genéricas y ofrece rellenarlo.');
  const ings = idrIngredientesTexto();
  if(ings) partes.push('INGREDIENTES QUE YA COMPRA, con su precio real:\n' + ings);
  const carta = idrCartaTexto();
  if(carta) partes.push('YA TIENE EN CARTA (no lo repitas salvo que se pida una variante):\n' + carta);
  const elab = idrElaboracionesTexto();
  if(elab) partes.push('ELABORACIONES BASE QUE YA PRODUCE, con su coste por unidad. Móntate encima de ellas siempre que encajen: es lo que abarata el plato y lo hace viable en servicio. Para usar una, nómbrala TAL CUAL:\n' + elab);
  const fichas = idrRecetasTexto();
  if(fichas) partes.push('FICHAS DE PLATO QUE YA TIENE:\n' + fichas);
  const stock = idrStockTexto();
  if(stock) partes.push('EN CÁMARA AHORA MISMO (si te pide algo para dar salida a lo que tiene, tira de aquí):\n' + stock);
  const ventas = idrVentasTexto();
  if(ventas) partes.push('VENTAS:\n' + ventas);
  else partes.push('VENTAS: no hay datos suficientes. No opines sobre qué se vende.');
  const ing = idrIngenieriaTexto();
  if(ing) partes.push(ing);
  // Datos que viven en la app para que no salgan de la memoria del modelo.
  partes.push(idrTemporadaTexto());
  partes.push(IDR_PROPORCIONES);
  return partes.filter(Boolean).join('\n\n');
}

/* ============================================================
   LAS INSTRUCCIONES DEL ASISTENTE
   ============================================================
   Aquí vive lo que separa esto de un chat tonto. Las reglas de honestidad
   son literales y van primero, porque el fallo más caro de un modelo no es
   no saber: es inventarse algo con aplomo y que un cocinero se lo crea. */

const IDR_REGLAS = `Eres el asistente de I+D de una cocina profesional. Ayudas a crear platos y elaboraciones base PARA ESTE RESTAURANTE CONCRETO.

REGLAS QUE NO SE ROMPEN NUNCA:

1. NO INVENTES. Si no conoces bien un plato, una técnica o una tradición regional, DILO y pide ayuda: "no conozco bien ese plato, ¿me lo describes o me pegas una receta de referencia y trabajo sobre ella?". Es mejor preguntar que rellenar el hueco con algo verosímil. No puedes buscar en internet por tu cuenta: si necesitas una fuente, pide que te peguen el texto.

2. LOS NÚMEROS NO LOS PONES TÚ. El coste, el food cost y el margen los calcula la aplicación con los precios reales del negocio. Puedes decir si algo te parece caro o barato, pero nunca des una cifra de coste como si fuera un dato.

3. INGREDIENTES: PROPÓN CON LIBERTAD. Aprovecha lo que ya compra siempre que encaje, porque abarata y simplifica. Pero NO te limites a su lista: si un producto que no tiene mejora el plato, propónlo igual y di que habría que darlo de alta. Un módulo de I+D que solo recombina lo de siempre no sirve para crear nada nuevo.

4. RESPETA SU ADN. La cocina, el nivel del negocio y sobre todo sus LÍNEAS ROJAS mandan sobre cualquier idea tuya. Si te piden algo que choca con su ADN, dilo antes de proponerlo.

5. RESPETA SU COCINA REAL. No propongas técnicas que su equipamiento no permite, ni platos que su equipo no pueda sacar en servicio.

6. DISTINGUE TRADICIÓN DE INVENCIÓN. Di cuándo algo es un clásico y cuándo es una adaptación tuya.

7. SIN DATOS, NO OPINAS. Si no hay ventas suficientes, no hables de lo que se vende.

8. CONSERVACIÓN FUERA. No des tiempos ni temperaturas de conservación, fermentación, envasado al vacío, curados ni conservas: es seguridad alimentaria y no es tu terreno. Si sale el tema, dilo y remite al APPCC del negocio.

EL MARCO DE OFICIO (úsalo para pensar; NO lo recites ni lo cites):

1. LOS CINCO EJES DE UN SABOR. Todo plato se ajusta con sal, ácido, grasa, dulce y amargo, más el fondo umami.
- La SAL no "sala": abre el resto de sabores y quita amargor. Es lo último que se cierra y solo probando.
- El ÁCIDO (vinagre, cítrico, vino, encurtido, láctico) levanta un plato plano y corta la grasa. Cuando algo "no sabe a nada" y ya lleva sal, casi siempre le falta acidez.
- La GRASA transporta el aroma y da largura en boca. Sin ella el sabor se va rápido; de más, empasta y necesita ácido enfrente.
- El DULCE redondea aristas y equilibra el amargo y el ácido. En salado, en gotas.
- El AMARGO (brasa, tostado, hoja verde, cítrico rallado) da carácter y evita el empalago.
- El UMAMI (fondos, tomate concentrado, hongos, curados, quesos viejos, algas, fermentados) da profundidad. Es lo que separa un plato "correcto" de uno con fondo.
Si un plato no funciona, no añadas cosas: mira qué eje falta. Casi siempre es acidez o sal.

2. CÓMO SE MARIDAN LOS SABORES. Tres caminos, y conviene decir cuál usas:
- POR TRADICIÓN: lo que lleva siglos junto en una cocina funciona. Cordero y romero, bacalao y garbanzos, cerdo y manzana, tomate y albahaca. Es el camino más seguro y el que un cliente reconoce.
- POR AFINIDAD AROMÁTICA: productos que comparten familia de aromas ligan solos. Marisco con cerdo curado; fresa con tomate; chocolate con café, frutos secos y frutos rojos; queso azul con pera, miel y nuez; zanahoria con comino y naranja; cerdo con hinojo; pescado azul con cítrico y anís.
- POR CONTRASTE: lo que se enfrenta y se equilibra. Graso con ácido (foie y vinagre; sardina y encurtido), dulce con salado (melón y jamón), untuoso con crujiente.
Si tienes dudas entre una idea rara y una tradicional, propón la tradicional bien ejecutada y la otra como alternativa: en un servicio real gana la que sale bien 60 veces seguidas.

3. LA ESTRUCTURA DE UN PLATO. Un plato se sostiene sobre UN producto principal; todo lo demás está para que se entienda mejor.
Antes de darlo por cerrado, comprueba que hay:
- algo que dé JUGOSIDAD (una salsa, un jugo, un aceite, una emulsión),
- algo CRUJIENTE o con mordida, si el producto es blando,
- algo ÁCIDO o fresco, si el conjunto es graso,
- y un AROMÁTICO que lo identifique (una hierba, una especia, una piel de cítrico).
Si le sobra un elemento, quítalo. Un plato con cuatro cosas bien hechas gana a uno con siete.

4. LAS SALSAS, POR FAMILIAS. Cuando te pidan una salsa, no des tres versiones de lo mismo: elige familias distintas.
- JUGOS Y FONDOS REDUCIDOS: profundidad y brillo. Para carnes asadas y a la brasa.
- EMULSIONES FRÍAS (mayonesas, alioli, tártara): untuosas, para fritos, hervidos y pescado blanco.
- EMULSIONES CALIENTES (holandesa, beurre blanc, pilpil): delicadas y ácidas, para pescado y verdura.
- VINAGRETAS: la más ligera; ácido + grasa + un tercer elemento (mostaza, miel, hierba, fruto seco). Para pescado a la plancha, verduras y ahumados.
- PURÉS Y CREMAS DE VEGETAL: hacen de cama y aportan dulzor natural.
- LÁCTEAS Y FERMENTADAS (yogur, labneh, nata ácida, mantequilla tostada): frescor y acidez con cuerpo.
- PICADAS, PESTOS, SALSAS VERDES, ROMESCOS: aroma y textura sin cocción larga.
Di siempre cómo LIGA la salsa (reducción, emulsión, almidón, fruto seco, pan) y si aguanta el servicio o hay que hacerla al momento.

5. LAS TÉCNICAS Y LO QUE APORTAN. Elige por lo que le hace al producto, no por moda:
brasa y parrilla, amargor tostado y humo; horno seco, corteza y concentración; plancha, costra rápida en piezas finas; confitado, grasa y jugosidad en piezas duras; guiso y estofado, colágeno convertido en untuosidad; vapor y escalfado, respetan el producto delicado; frito, contraste de textura; escabeche y marinada, acidez que además conserva; crudo y curado en sal, textura y sabor limpio.
Piezas duras con colágeno piden calor bajo y largo. Piezas magras y delicadas piden calor corto o suave; pasarse las seca y no hay salsa que lo arregle.

6. LOS PUNTOS Y LO QUE NO SE NEGOCIA. Un pescado seco, una verdura sin color y una carne pasada no se corrigen con salsa. Si un plato depende de un punto justo, dilo claro: es lo que decide si sale bien en un servicio lleno.
El sazonado no lo puedes cerrar tú, porque no pruebas. Dilo así, sin fingir precisión.

7. ESCALAR NO ES MULTIPLICAR. Al subir raciones: la sal, el picante, las especias y los aromáticos suben MENOS que en proporción; las reducciones tardan más pero no el doble; las frituras y salteados no admiten tandas grandes sin perder la costra; y una salsa ligada a última hora no aguanta multiplicada. Di qué se puede dejar hecho y qué hay que hacer al momento.

8. QUE SE PUEDA COCINAR MAÑANA. Una idea sin cantidades ni orden de trabajo no vale para nada. Cuando el plato esté decidido, deja claro qué se adelanta en mise en place, qué se hace al pase y cuánto se tarda en sacarlo. Si un plato pide más de tres o cuatro minutos al pase, avísalo: en un servicio lleno es lo que revienta la partida.

CÓMO PIENSAS UN CONJUNTO (menú o carta):
- Que no se repitan la base ni la técnica principal entre platos. Tres cremas o todo al horno es una carta pobre aunque cada plato sea bueno.
- Aprovecha fondos y mise en place entre platos: es lo que hace viable una carta en un servicio real.
- Cuenta cuántos platos exigen trabajo al momento y compáralo con la gente que hay en partida.
- En un degustación manda la progresión: de menos a más intensidad, sin repetir técnicas, y con el postre cerrando lo que abrió el primer pase.
- En un menú del día mandan el coste y la rotación.

NO TE QUEDES EN LA IDEA. Cuando propongas algo, BAJA AL DETALLE: qué producto haría falta, en qué cantidad aproximada y cuánto trabajo lleva. Estás cocinando CON él, no dándole un listado: "para esto necesitaríamos unos 180 g de bacalao, garbanzos cocidos y un buen sofrito, ¿te encaja o prefieres tirar por otro lado?".

CÓMO HABLAS: como un jefe de partida. Claro, corto, sin florituras y sin darle lecciones a alguien que lleva años en esto. Nada de listas interminables ni de recitar este marco de trabajo.`;

function idrSistema(extra){
  // El encargo del negocio (precio, food cost, estructura) manda sobre
  // cualquier idea del asistente, así que va en TODAS las consultas.
  const c = idrCreacion(idrCreacionActiva);
  const enc = c ? idrEncargoTexto(c) : '';
  return IDR_REGLAS + '\n\n' + idrContextoNegocio() + (enc ? '\n\n' + enc : '') + (extra ? '\n\n' + extra : '');
}

/* ============================================================
   ESTADO: las creaciones
   ============================================================
   Se guardan en DB.idr.creaciones, así que se sincronizan y sobreviven a
   cerrar la tablet a media conversación — que es de las cosas que más
   enfadan cuando llevas seis pasos hechos. */

function idrCreaciones(){
  if(!DB.idr || typeof DB.idr !== 'object') DB.idr = {};
  if(!Array.isArray(DB.idr.creaciones)) DB.idr.creaciones = [];
  // Ver idrCreacion: la nube devuelve las creaciones sin los campos que
  // estaban vacíos. Se reponen aquí para que ninguna pantalla se encuentre
  // con un `undefined` donde esperaba una lista.
  DB.idr.creaciones.forEach(c => { if(c && !Array.isArray(c.pasos)) c.pasos = []; });
  return DB.idr.creaciones;
}
/* Devuelve la creación SIEMPRE con su lista de pasos puesta. Esto no es
   pedantería defensiva: una creación recién empezada tiene `pasos: []`, y
   **Firebase no guarda arrays ni objetos vacíos** — al volver de la nube el
   campo sencillamente no está. A partir de ahí, `c.pasos[0]` reventaba y la
   pantalla se quedaba con el botón en "Pensando..." para siempre, sin ningún
   aviso. Es el mismo fallo de raíz que el de Distribución del Trabajo.
   Se arregla aquí, en el único sitio por donde pasan todos. */
function idrCreacion(id){
  const c = idrCreaciones().find(x => x.id === id) || null;
  if(c && !Array.isArray(c.pasos)) c.pasos = [];
  return c;
}

// Los pasos de cada tipo. Añadir un paso es añadir una entrada: el guion
// del asistente sale de aquí, no está escrito a mano en ningún sitio.
/* Los pasos de cada tipo. El guion del asistente sale de aquí, no está
   escrito a mano en ningún sitio.

   Ya no hay botón de "pedir ideas": en cada paso lo explica la persona, con
   sus palabras. El asistente no adivina lo que quiere el cocinero — recoge lo
   que le dice y lo convierte en una receta costeada con SUS ingredientes.
   Cada paso lleva su ayuda y su ejemplo, porque "descríbelo" a secas deja en
   blanco a cualquiera.

   Aquí solo quedan `menu` y `carta`, que son de antes: ya no se pueden
   empezar, pero hay trabajo guardado y tiene que seguir abriéndose. Los
   platos y las elaboraciones ya no llevan guion — los lleva la conversación
   (ver idrGuionConversacion). */
const IDR_PASOS = {
  menu: [
    {k:'formato', l:{es:'Formato',ca:'Format',en:'Format'}},
    {k:'estructura', l:{es:'Estructura',ca:'Estructura',en:'Structure'}},
    {k:'platos', l:{es:'Los platos',ca:'Els plats',en:'The dishes'}},
    {k:'cierre', l:{es:'Postre y cierre',ca:'Postres i tancament',en:'Dessert and close'}},
  ],
  carta: [
    {k:'secciones', l:{es:'Secciones',ca:'Seccions',en:'Sections'}},
    {k:'reparto', l:{es:'Reparto de técnicas',ca:'Repartiment de tècniques',en:'Technique spread'}},
    {k:'platos', l:{es:'Los platos',ca:'Els plats',en:'The dishes'}},
    {k:'servicio', l:{es:'Carga de servicio',ca:'Càrrega de servei',en:'Service load'}},
  ],
};
// Solo se pueden EMPEZAR estos dos. Los otros siguen abriéndose si ya existen.
const IDR_TIPOS_NUEVOS = ['base', 'plato', 'menu', 'carta'];

function idrNuevaCreacion(tipo){
  const c = {
    id: genId(), tipo, titulo: '', pasoActual: 0,
    pasos: [], mensajes: [], propuesta: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  idrCreaciones().push(c);
  saveDB();
  return c;
}
async function idrBorrarCreacion(id){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  DB.idr.creaciones = idrCreaciones().filter(c => c.id !== id);
  saveDB();
  renderIdr();
}

/* ============================================================
   PANTALLA PRINCIPAL — las tres burbujas y el ADN
   ============================================================ */

let idrVista = 'inicio';       // 'inicio' | 'creacion'
let idrCreacionActiva = null;
let idrCarpetaActiva = null;   // null = todo el cuaderno
let idrFiltroTipo = '';        // '' | 'plato' | 'menu' | 'carta'
function idrVerCarpeta(id){ idrCarpetaActiva = id || null; renderIdr(); }
function idrFiltrar(tipo){ idrFiltroTipo = tipo || ''; renderIdr(); }

function navIdr(vista, id){
  idrVista = vista;
  idrCreacionActiva = id || null;
  renderIdr();
}

/* Si el repintado revienta, la pantalla se queda EXACTAMENTE como estaba: el
   botón sigue diciendo "Pensando...", el paso no avanza y no sale ningún
   aviso. Desde fuera es indistinguible de "los botones no hacen nada" — que
   es justo lo que reportó el dueño y lo que no había forma de diagnosticar.
   Ahora cualquier fallo al pintar se ve en pantalla y queda guardado. */
function renderIdr(){
  try{ renderIdrInterno(); }
  catch(e){
    idrUltimoFallo = {motivo:'pantalla', detalle: String(e && (e.stack || e.message) || e), cuando: new Date().toISOString()};
    const box = document.getElementById('view-idr');
    if(box){
      box.innerHTML = `<div class="card"><h3><i class="ti ti-alert-triangle"></i> ${t('idr.err.render')}</h3>`
        + `<div style="font-size:11px;color:var(--muted);word-break:break-word;max-height:200px;overflow:auto;margin:8px 0">${escapeHtml(idrUltimoFallo.detalle.slice(0,600))}</div>`
        + `<button class="btn" onclick="navIdr('inicio')"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button></div>`;
    }
    if(typeof showToast === 'function') showToast(t('idr.err.render'));
  }
}
function renderIdrInterno(){
  const box = document.getElementById('view-idr');
  if(!box) return;
  if(idrVista === 'creacion' && idrCreacion(idrCreacionActiva)){ renderIdrCreacion(box); return; }
  idrVista = 'inicio';

  const adnOk = idrAdnRelleno();
  const iaOk = idrHayIA();
  const todas = idrCreaciones();
  const sinClasificar = todas.filter(x => !x.carpetaId).length;
  const creaciones = todas
    .filter(x => idrCarpetaActiva === null ? true : (idrCarpetaActiva === '__sin' ? !x.carpetaId : x.carpetaId === idrCarpetaActiva))
    .filter(x => idrFiltroTipo ? x.tipo === idrFiltroTipo : true)
    .slice().sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''));

  const burbuja = (tipo, icono, titulo, desc) => `
    <div class="card" style="cursor:pointer;text-align:center;padding:22px 16px" onclick="idrEmpezar('${tipo}')">
      <i class="ti ${icono}" style="font-size:34px;color:var(--brand-orange)"></i>
      <h3 style="justify-content:center;margin:10px 0 4px">${titulo}</h3>
      <p style="font-size:12.5px;color:var(--muted);margin:0">${desc}</p>
    </div>`;

  box.innerHTML = `
    <div class="view-header">
      <div>
        <button class="btn btn-sm btn-back" onclick="navigate('folder')"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
        <h2>${t('view.idr.title')}</h2>
        <p class="view-sub">${t('view.idr.subtitle')}</p>
      </div>
      <button class="btn btn-sm" onclick="idrConfigModal()"><i class="ti ti-settings"></i> ${t('idr.assistant')}</button>
    </div>

    ${!iaOk ? `
      <div class="card" style="border-left:4px solid var(--brand-orange)">
        <h3><i class="ti ti-sparkles"></i> ${t('idr.noAssistantTitle')}</h3>
        <p style="font-size:13px;color:var(--muted)">${t('idr.noAssistantBody')}</p>
        <button class="btn btn-primary btn-sm" onclick="idrConfigModal()"><i class="ti ti-key"></i> ${t('idr.setUpAssistant')}</button>
      </div>` : ''}

    <div class="card ${adnOk?'':'owner-only'}" style="${adnOk?'':'border-left:4px solid var(--brand-orange)'}">
      <h3><i class="ti ti-dna"></i> ${t('idr.dna')}</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 10px">
        ${adnOk ? escapeHtml(idrAdnResumen()) : t('idr.dnaEmpty')}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm ${adnOk?'':'btn-primary'}" onclick="idrAdnModal()"><i class="ti ti-edit"></i> ${adnOk ? t('common.edit') : t('idr.fillDna')}</button>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:14px">
      ${burbuja('base','ti-soup', t('idr.newBase'), t('idr.newBaseDesc'))}
      ${burbuja('plato','ti-tools-kitchen-2', t('idr.newDish'), t('idr.newDishDesc'))}
      ${burbuja('menu','ti-list-numbers', t('idr.newMenu'), t('idr.newMenuDesc'))}
      ${burbuja('carta','ti-book', t('idr.newCarta'), t('idr.newCartaDesc'))}
    </div>

    <h3 class="cat-heading">${t('idr.myWork')}</h3>

    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <button class="btn btn-sm ${idrCarpetaActiva===null?'btn-primary':''}" onclick="idrVerCarpeta(null)"><i class="ti ti-stack"></i> ${t('idr.allWork')}</button>
      ${idrCarpetas().map(f => `
        <button class="btn btn-sm ${idrCarpetaActiva===f.id?'btn-primary':''}" onclick="idrVerCarpeta(${f.id})"><i class="ti ti-folder"></i> ${escapeHtml(f.nombre)} (${idrCreaciones().filter(x=>x.carpetaId===f.id).length})</button>
      `).join('')}
      ${sinClasificar ? `<button class="btn btn-sm ${idrCarpetaActiva==='__sin'?'btn-primary':''}" onclick="idrVerCarpeta('__sin')"><i class="ti ti-folder-off"></i> ${t('idr.unfiled')} (${sinClasificar})</button>` : ''}
      <button class="owner-only btn btn-sm" onclick="idrNuevaCarpeta()"><i class="ti ti-folder-plus"></i> ${t('idr.newFolder')}</button>
      ${idrCarpetaActiva && idrCarpetaActiva !== '__sin' ? `
        <button class="owner-only btn btn-sm btn-icon" onclick="idrRenombrarCarpeta(${idrCarpetaActiva})" title="${t('idr.renameFolder')}"><i class="ti ti-edit"></i></button>
        <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="idrBorrarCarpeta(${idrCarpetaActiva})" title="${t('common.delete')}"><i class="ti ti-trash"></i></button>` : ''}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${[['', t('idr.allTypes')], ['plato', t('idr.newDish')], ['base', t('idr.newBase')], ['menu', t('idr.newMenu')], ['carta', t('idr.newCarta')]]
        .map(([v, l]) =>
        `<button class="btn btn-sm ${idrFiltroTipo===v?'btn-primary':''}" onclick="idrFiltrar('${v}')">${escapeHtml(l)}</button>`).join('')}
    </div>

    ${creaciones.length ? `<div class="grid grid-2">` + creaciones.map(c => `
      <div class="card card-compact" style="cursor:pointer" onclick="navIdr('creacion', ${c.id})">
        <h3 style="justify-content:space-between"><span style="overflow:visible;white-space:normal"><i class="ti ${idrIconoTipo(c.tipo)}"></i> ${escapeHtml(c.titulo || t('idr.untitled'))}</span></h3>
        <p style="font-size:12px;color:var(--muted);margin:2px 0 8px">${idrProgresoTexto(c)}</p>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();navIdr('creacion', ${c.id})"><i class="ti ti-arrow-right"></i> ${t('idr.continue')}</button>
          <select class="owner-only" style="max-width:150px" onclick="event.stopPropagation()" onchange="idrMoverA(${c.id}, this.value ? Number(this.value) : null)">
            <option value="">${t('idr.unfiled')}</option>
            ${idrCarpetas().map(f=>`<option value="${f.id}"${f.id===c.carpetaId?' selected':''}>${escapeHtml(f.nombre)}</option>`).join('')}
          </select>
          <button class="owner-only btn btn-sm btn-danger" onclick="event.stopPropagation();idrBorrarCreacion(${c.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('') + `</div>` : `<div class="empty"><i class="ti ti-flask"></i>${todas.length ? t('idr.noneHere') : t('idr.noWorkYet')}</div>`}
  `;
}

function idrAdnResumen(){
  const a = idrAdn();
  return [a.cocina, a.nivel, a.publico].filter(Boolean).join(' · ');
}
function idrProgresoTexto(c){
  if(c.recipeId || (c.recipeIds||[]).length) return t('idr.stateCreated');
  // Menú y carta son de antes de R18 y siguen midiéndose por pasos.
  if(c.tipo === 'menu' || c.tipo === 'carta'){
    const total = (IDR_PASOS[c.tipo]||[]).length;
    const hechos = (c.pasos||[]).filter(p => p && p.elegido).length;
    return `${t('idr.step')} ${Math.min(hechos+1, total)}/${total}`;
  }
  const turnos = (c.mensajes||[]).filter(m => m && m.r === 'yo').length;
  if(!turnos) return t('idr.stateNew');
  return c.listo ? t('idr.stateReady') : t('idr.stateTalking').replace('${n}', turnos);
}

// Sin IA se puede empezar igual: los pasos se rellenan a mano. La IA es el
// ayudante, no el soporte.
function idrIconoTipo(tipo){
  return tipo === 'plato' ? 'ti-tools-kitchen-2'
       : tipo === 'base'  ? 'ti-soup'
       : tipo === 'menu'  ? 'ti-list-numbers' : 'ti-book';
}
/* El ADN pasa de consejo a REQUISITO. Sin él el asistente propone cocina de
   folleto: no sabe si es un bar de menú o un gastronómico, ni con qué
   equipamiento cuenta, ni qué no se toca en esa casa. Una propuesta genérica
   no solo no sirve — hace perder el tiempo y quema la confianza en la
   herramienta. Así que sin ADN no se empieza nada. */
function idrEmpezar(tipo){
  if(!IDR_TIPOS_NUEVOS.includes(tipo)) return;
  if(!idrAdnRelleno()){
    showToast(t('idr.dnaRequired') + ' (' + idrAdnQueFalta().join(', ') + ')', 5000);
    idrAdnModal();
    return;
  }
  const c = idrNuevaCreacion(tipo);
  // Nace donde estás mirando: si abres "Carta otoño 2026" y creas un plato,
  // lo lógico es que caiga ahí y no en el montón general.
  if(idrCarpetaActiva && idrCarpetaActiva !== '__sin') c.carpetaId = idrCarpetaActiva;
  saveDB();
  navIdr('creacion', c.id);
}

/* ============================================================
   EL ENCARGO — lo que se decide ANTES de hablar con nadie
   ============================================================
   La estructura y el precio no son cosa del asistente: son decisiones del
   negocio. Un menú de 38 € a cuatro pases no es lo mismo que uno de 18, y
   una carta de cinco bloques no se llena igual que una de tres. Si esto se
   deja a la conversación, la IA improvisa un formato y el hostelero acaba
   discutiendo con ella en vez de cocinando.

   Así que se pregunta primero, en un formulario corto, y ese encargo entra
   en TODAS las peticiones. La IA no elige la estructura: la rellena, y su
   trabajo es que quede equilibrada dentro de ella.

   Las recetas se escriben SIEMPRE para UNA persona: es como se escandalla
   un plato de carta, y así el coste por ración es el coste, sin dividir. */

const IDR_BLOQUES_MENU = [
  {es:'Aperitivos', ca:'Aperitius', en:'Snacks'},
  {es:'Entrantes', ca:'Entrants', en:'Starters'},
  {es:'Segundos', ca:'Segons', en:'Mains'},
  {es:'Postres', ca:'Postres', en:'Desserts'},
];
const IDR_BLOQUES_CARTA = [
  {es:'Entrantes fríos', ca:'Entrants freds', en:'Cold starters'},
  {es:'Entrantes calientes', ca:'Entrants calents', en:'Hot starters'},
  {es:'Carnes', ca:'Carns', en:'Meat'},
  {es:'Pescados', ca:'Peixos', en:'Fish'},
  {es:'Postres', ca:'Postres', en:'Desserts'},
];

/* Los bloques NACEN VACÍOS. Traerlos puestos ("Entrantes, Segundos,
   Postres...") parece una comodidad, pero decide por el hostelero la
   estructura de su carta, que es justo lo que él tiene que decidir: unos
   trabajan con entrantes fríos y calientes, otros con tapas y raciones, otros
   con un apartado de arroces que se lleva media carta. Lo que sí se hace es
   SUGERIR, en el texto gris del campo, para que no se quede mirando un hueco
   en blanco sin saber qué se espera de él. */
function idrBloquesVacios(tipo, cuantos){
  const out = [];
  for(let i = 0; i < cuantos; i++) out.push({nombre: '', n: ''});
  return out;
}
function idrSugerenciaBloque(tipo, i){
  const base = tipo === 'menu' ? IDR_BLOQUES_MENU : IDR_BLOQUES_CARTA;
  return base[i] ? gl(base[i]) : (tipo === 'menu' ? t('idr.briefPass') : t('idr.briefBlock'));
}

function idrEncargo(c){
  if(!c.encargo || typeof c.encargo !== 'object') c.encargo = {};
  return c.encargo;
}
function idrEncargoHecho(c){ return !!(c && c.encargo && c.encargo.hecho); }

// El encargo, en texto, para que viaje en cada consulta.
function idrEncargoTexto(c){
  const e = idrEncargo(c);
  if(!e.hecho) return '';
  const l = [];
  if(c.tipo === 'plato'){
    if(e.pvp) l.push(`Precio de venta objetivo (SIN IVA): ${fmtMoney(e.pvp)} por ración`);
    if(e.foodCost) l.push(`Food cost objetivo: ${e.foodCost}%`);
    if(e.pvp && e.foodCost) l.push(`Es decir, el plato NO puede costar más de ${fmtMoney(e.pvp * e.foodCost / 100)} de materia prima por ración`);
  } else if(c.tipo === 'menu' || c.tipo === 'carta'){
    if(e.pvp) l.push(c.tipo === 'menu'
      ? `Precio del menú completo (SIN IVA): ${fmtMoney(e.pvp)} por comensal`
      : `Precio medio por plato (SIN IVA): ${fmtMoney(e.pvp)}`);
    if(e.foodCost) l.push(`Food cost objetivo: ${e.foodCost}%`);
    if(e.pvp && e.foodCost){
      const tope = e.pvp * e.foodCost / 100;
      l.push(c.tipo === 'menu'
        // En un menú el food cost es del MENÚ ENTERO: repartirlo plato a plato
        // es cosa suya (un aperitivo no cuesta lo que un segundo), pero la
        // suma no puede pasar de aquí.
        ? `Es decir, la suma de materia prima de TODOS los pases no puede pasar de ${fmtMoney(tope)} por comensal. Repártelo con criterio: un aperitivo no cuesta lo que un segundo.`
        : `Es decir, cada plato debería moverse alrededor de ${fmtMoney(tope)} de materia prima por ración.`);
    }
    l.push(`ESTRUCTURA FIJADA POR EL NEGOCIO (no la cambies, ni añadas ni quites bloques):`);
    (e.bloques||[]).forEach(b => l.push(`- ${b.nombre}: ${b.n} ${b.n === 1 ? 'plato' : 'platos'}`));
    l.push(`Total: ${idrTotalPlatos(c)} platos. Tu trabajo es llenar ESA estructura de forma equilibrada, no proponer otra.`);
  }
  return l.length ? 'EL ENCARGO:\n' + l.join('\n') : '';
}
function idrTotalPlatos(c){
  return ((idrEncargo(c).bloques)||[]).reduce((s, b) => s + (parseInt(b.n, 10) || 0), 0);
}

function renderIdrEncargo(box, c){
  const e = idrEncargo(c);
  const esConjunto = c.tipo === 'menu' || c.tipo === 'carta';
  const bloques = Array.isArray(e.bloques) ? e.bloques : [];

  box.innerHTML = `
    <div class="view-header">
      <div>
        <button class="btn btn-sm btn-back" onclick="navIdr('inicio')"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
        <h2>${t('idr.briefTitle')}</h2>
        <p class="view-sub">${t('idr.briefSub')}</p>
      </div>
    </div>
    <div class="card">
      <div class="grid grid-2">
        <div class="field">
          <label>${c.tipo === 'menu' ? t('idr.briefPriceMenu') : c.tipo === 'carta' ? t('idr.briefPriceCarta') : t('idr.briefPriceDish')}</label>
          <input type="number" id="enc-pvp" step="0.01" min="0" value="${e.pvp || ''}" placeholder="0,00">
        </div>
        <div class="field">
          <label>${t('idr.briefFoodCost')}</label>
          <input type="number" id="enc-fc" step="1" min="1" max="90" value="${e.foodCost || idrAdn().foodCostObjetivo || ''}" placeholder="30">
        </div>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin:0">${t('idr.briefPerPerson')}</p>
    </div>

    ${esConjunto ? `
      <div class="card">
        <h3><i class="ti ti-layout-list"></i> ${c.tipo === 'menu' ? t('idr.briefPasses') : t('idr.briefBlocks')}</h3>
        <div class="field" style="max-width:260px">
          <label>${c.tipo === 'menu' ? t('idr.briefHowManyPasses') : t('idr.briefHowManyBlocks')}</label>
          <select id="enc-nbloques" onchange="idrCambiarNumBloques(${c.id}, this.value)">
            <option value="">${t('idr.briefChoose')}</option>
            ${[2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===bloques.length?' selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        ${bloques.length ? `
          <table class="table">
            <thead><tr><th>${c.tipo === 'menu' ? t('idr.briefPass') : t('idr.briefBlock')}</th><th style="width:140px">${t('idr.briefHowMany')}</th></tr></thead>
            <tbody>
              ${bloques.map((b, i) => `
                <tr>
                  <td><input type="text" id="enc-b-${i}" value="${escapeHtml(b.nombre||'')}" placeholder="${escapeHtml(t('idr.briefBlockPh').replace('${ej}', idrSugerenciaBloque(c.tipo, i)))}"></td>
                  <td><input type="number" id="enc-n-${i}" min="1" max="20" step="1" value="${b.n || ''}" placeholder="0"></td>
                </tr>`).join('')}
            </tbody>
          </table>
          <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">${t('idr.briefBlocksHint')}</p>
        ` : `<p style="font-size:13px;color:var(--muted);margin:0">${c.tipo === 'menu' ? t('idr.briefPassesFirst') : t('idr.briefBlocksFirst')}</p>`}
      </div>` : ''}

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="idrGuardarEncargo(${c.id})"><i class="ti ti-arrow-right"></i> ${t('idr.briefStart')}</button>
    </div>
  `;
}

// Cambiar el número de bloques conserva lo ya escrito en los que siguen
// existiendo: rehacer la tabla entera cada vez sería tirar el trabajo.
function idrCambiarNumBloques(id, cuantos){
  const c = idrCreacion(id);
  if(!c) return;
  const pedido = parseInt(cuantos, 10);
  if(!isFinite(pedido) || pedido < 1){
    idrEncargo(c).bloques = [];
    saveDB(); renderIdr(); return;
  }
  const n = Math.min(12, pedido);
  const e = idrEncargo(c);
  const actuales = idrLeerBloquesDelFormulario(e.bloques ? e.bloques.length : 0);
  const previos = actuales.length ? actuales : (e.bloques || []);
  const vacios = idrBloquesVacios(c.tipo, n);
  e.bloques = vacios.map((b, i) => previos[i] || b);
  e.pvp = parseFloat((document.getElementById('enc-pvp')||{}).value) || e.pvp;
  e.foodCost = parseFloat((document.getElementById('enc-fc')||{}).value) || e.foodCost;
  saveDB();
  renderIdr();
}
function idrLeerBloquesDelFormulario(cuantos){
  const out = [];
  for(let i = 0; i < cuantos; i++){
    const nom = document.getElementById('enc-b-' + i);
    const num = document.getElementById('enc-n-' + i);
    if(!nom) break;
    const cuantos = parseInt((num||{}).value, 10);
    out.push({nombre: (nom.value||'').trim(), n: isFinite(cuantos) && cuantos > 0 ? Math.min(20, cuantos) : 0});
  }
  return out;
}

function idrGuardarEncargo(id){
  const c = idrCreacion(id);
  if(!c) return;
  const e = idrEncargo(c);
  e.pvp = parseFloat((document.getElementById('enc-pvp')||{}).value) || 0;
  e.foodCost = parseFloat((document.getElementById('enc-fc')||{}).value) || 0;
  if(!e.pvp){ showToast(t('idr.briefNeedPrice')); return; }
  if(c.tipo === 'menu' || c.tipo === 'carta'){
    const cuantos = parseInt((document.getElementById('enc-nbloques')||{}).value, 10) || 0;
    if(!cuantos){ showToast(c.tipo === 'menu' ? t('idr.briefNeedPasses') : t('idr.briefNeedBlocks')); return; }
    const leidos = idrLeerBloquesDelFormulario(cuantos);
    if(!leidos.length || leidos.some(b => !b.nombre)){ showToast(t('idr.briefNeedBlockName')); return; }
    if(leidos.some(b => !b.n)){ showToast(t('idr.briefNeedHowMany')); return; }
    e.bloques = leidos;
  }
  e.hecho = true;
  // El asistente abre con el encargo entendido y la pregunta que de verdad
  // decide el camino: ¿tiramos de lo que ya tienes o creamos platos nuevos?
  if(c.tipo === 'menu' || c.tipo === 'carta'){
    idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: idrResumenDelEncargo(c)});
  }
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

function idrResumenDelEncargo(c){
  const e = idrEncargo(c);
  const lista = (e.bloques||[]).map(b => `· ${b.nombre}: ${b.n}`).join('\n');
  return t('idr.briefRecap')
    .replace('${que}', c.tipo === 'menu' ? t('idr.newMenu') : t('idr.newCarta'))
    .replace('${precio}', fmtMoney(e.pvp))
    .replace('${fc}', e.foodCost || '—')
    .replace('${lista}', lista)
    .replace('${total}', idrTotalPlatos(c));
}

/* ============================================================
   LA CONVERSACIÓN
   ============================================================
   Antes esto era un guion de pasos fijos: producto → técnica → salsa →
   guarnición. Se cayó solo en cuanto el dueño probó a hacer una ensalada,
   porque no lleva salsa, y un helado, que no lleva ni técnica de partida ni
   guarnición. Un guion no puede prever la cocina.

   Ahora lleva la conversación el asistente, como la llevaría un jefe de
   cocina: pregunta lo que le falta para ESE plato, uno o dos cabos cada vez,
   y cuando ya tiene bastante lo dice. La persona escribe con sus palabras, y
   quien decide sigue siendo ella: la app no crea nada hasta que se pulsa
   "Crear".

   El modelo contesta SIEMPRE en JSON ({"respuesta", "listo", "falta"}) para
   que la app sepa si ya se puede escribir la receta. Si contesta en prosa
   suelta, se enseña igual: es información útil aunque no se pueda medir. */

// Identidad de cada mensaje del hilo. Sin ella, fusionar la conversación con
// la de la nube obligaría a comparar textos, y dos "vale" seguidos se
// confundirían entre sí.
let idrMidSeguido = 0;
function idrNuevoMid(){
  idrMidSeguido += 1;
  return Date.now().toString(36) + '-' + idrMidSeguido.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}
function idrMensajes(c){
  // Firebase no guarda arrays vacíos: puede volver sin el hilo.
  if(!Array.isArray(c.mensajes)) c.mensajes = [];
  return c.mensajes;
}
// Lo primero que se ve al abrir. Se escribe en la app y no se le pide al
// modelo: abrir una prueba tiene que ser instantáneo y gratis.
function idrSaludo(tipo){
  return tipo === 'base' ? t('idr.chatHelloBase') : t('idr.chatHelloDish');
}
// El hilo en texto plano. Es lo que se le pasa al modelo para escribir la
// receta final, y lo que sale impreso.
function idrConversacionTexto(c){
  const partes = [];
  // Las creaciones de antes de R18 guardaban pasos, no conversación. Se
  // aprovechan igual en vez de dejarlas a medias.
  const pasos = IDR_PASOS[c.tipo] || [];
  (c.pasos||[]).forEach((p, i) => {
    if(p && p.elegido && pasos[i]) partes.push(`${gl(pasos[i].l)}: ${p.elegido}`);
  });
  idrMensajes(c).forEach(m => {
    partes.push(`${m.r === 'yo' ? 'COCINERO' : 'ASISTENTE'}: ${m.t}`);
  });
  return partes.join('\n');
}

function renderIdrCreacion(box){
  const c = idrCreacion(idrCreacionActiva);
  if(!c){ navIdr('inicio'); return; }
  // Primero el encargo: precio, food cost y estructura. Sin eso no hay
  // conversación que valga, porque la IA no sabría qué está llenando.
  if(!idrEncargoHecho(c) && !(c.pasos||[]).length){ renderIdrEncargo(box, c); return; }
  const iaOk = idrHayIA();
  const conjunto = c.tipo === 'menu' || c.tipo === 'carta';
  const legado = conjunto && !idrEncargoHecho(c);
  const hilo = idrMensajes(c);
  const hecho = !!(c.recipeId || (c.recipeIds||[]).length);

  // Lo decidido en el guion viejo se sigue viendo, para no perder trabajo.
  const pasos = IDR_PASOS[c.tipo] || [];
  const hechos = (c.pasos||[]).map((p, i) => (p && p.elegido && pasos[i])
    ? `<div class="list-row"><div class="list-row-name"><span><strong>${escapeHtml(gl(pasos[i].l))}:</strong> ${escapeHtml(p.elegido)}</span></div></div>` : '').join('');

  const burbuja = (m) => m.r === 'yo'
    ? `<div style="display:flex;justify-content:flex-end;margin:8px 0">
         <div style="max-width:80%;background:var(--brand-orange);color:#fff;padding:9px 12px;border-radius:14px 14px 3px 14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap">${escapeHtml(m.t)}</div>
       </div>`
    : `<div style="display:flex;justify-content:flex-start;margin:8px 0">
         <div style="max-width:85%;background:#F1EFE9;padding:9px 12px;border-radius:14px 14px 14px 3px;font-size:13.5px;line-height:1.5;white-space:pre-wrap">${escapeHtml(m.t)}</div>
       </div>`;

  box.innerHTML = `
    <div class="view-header">
      <div>
        <button class="btn btn-sm btn-back" onclick="navIdr('inicio')"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
        <h2>${escapeHtml(c.titulo || (c.tipo === 'base' ? t('idr.newBase') : t('idr.newDish')))}</h2>
        <p class="view-sub">${idrProgresoTexto(c)}</p>
      </div>
    </div>

    ${hechos ? `<div class="card"><h3><i class="ti ti-checks"></i> ${t('idr.decided')}</h3>${hechos}</div>` : ''}

    ${hecho ? `
      <div class="card">
        <h3><i class="ti ti-flag-check"></i> ${t('idr.done')}</h3>
        ${c.logica ? `<div class="card" style="border-left:4px solid var(--brand-orange)"><h3 style="font-size:14px"><i class="ti ti-bulb"></i> ${t('idr.setLogic')}</h3><p style="font-size:13px;margin:0;white-space:pre-wrap">${escapeHtml(c.logica)}</p></div>` : ''}
        ${c.recipeId && getRecipe(c.recipeId) ? `<p style="font-size:13px">${escapeHtml(getRecipe(c.recipeId).name)} · <strong>${fmtMoney(recipeCost(getRecipe(c.recipeId)))}</strong></p>` : ''}
        ${(c.recipeIds||[]).length ? `<p style="font-size:13px">${t('idr.setDishes').replace('${n}', c.recipeIds.length)} · <strong>${fmtMoney((c.recipeIds||[]).reduce((s,rid)=>{const rr=getRecipe(rid);return s+(rr?recipeCost(rr):0);},0))}</strong></p>` : ''}
        ${(c.faltan||[]).length ? `<p style="font-size:12.5px;color:var(--muted)">${t('idr.missingIngredients')}: ${escapeHtml(c.faltan.join(' · '))}</p>` : ''}
        ${c.corregido ? `<p style="font-size:12.5px;color:var(--muted)"><i class="ti ti-wand"></i> ${t('idr.autoFixed')}</p>` : ''}
        ${c.nota ? `<p style="font-size:12.5px;color:var(--muted)">${escapeHtml(c.nota)}</p>` : ''}
        ${(c.avisos||[]).length ? `
          <div class="card" style="border-left:4px solid var(--red)">
            <h3 style="font-size:14px"><i class="ti ti-alert-triangle"></i> ${t('idr.checksFailed')}</h3>
            <ul style="margin:4px 0 0;padding-left:18px;font-size:13px">${c.avisos.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>` : `<p style="font-size:12.5px;color:#1F8A4C"><i class="ti ti-check"></i> ${t('idr.checksPassed')}</p>`}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${c.recipeId ? `<button class="btn btn-primary" onclick="idrVerLaFicha(${c.id})"><i class="ti ti-file-text"></i> ${t('idr.seeSheet')}</button>` : ''}
          ${c.recipeId ? `<button class="owner-only btn" onclick="idrHablarDelCoste(${c.id})"><i class="ti ti-coin"></i> ${t('idr.adjustCost')}</button>` : ''}
          ${c.recipeId ? `<button class="owner-only btn" onclick="idrVariante(${c.id})"><i class="ti ti-git-branch"></i> ${t('idr.makeVariant')}</button>` : ''}
          <button class="btn" onclick="idrImprimir(${c.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
        </div>
      </div>` : ''}

    ${legado ? `
      <div class="card" style="border-left:4px solid var(--brand-orange)">
        <h3><i class="ti ti-archive"></i> ${t('idr.legacyTitle')}</h3>
        <p style="font-size:13px;color:var(--muted)">${t('idr.legacyBody')}</p>
        ${!hecho ? `<button class="owner-only btn btn-primary" onclick="idrCrearConjunto(${c.id})"><i class="ti ti-plus"></i> ${c.tipo==='menu' ? t('idr.createMenu') : t('idr.createCarta')}</button>` : ''}
      </div>
    ` : `
      <div class="card">
        <h3><i class="ti ti-message-circle"></i> ${t('idr.conversation')}</h3>

        <div id="idr-hilo" style="max-height:46vh;overflow:auto;padding:4px 2px">
          ${burbuja({r:'ia', t: idrSaludo(c.tipo)})}
          ${hilo.map(burbuja).join('')}
          ${idrPensando ? `<div style="display:flex;justify-content:flex-start;margin:8px 0"><div style="background:#F1EFE9;padding:9px 12px;border-radius:14px;font-size:13.5px;color:var(--muted)"><i class="ti ti-loader"></i> ${t('idr.thinking')}</div></div>` : ''}
        </div>

        ${idrUltimoFallo ? `<div style="margin-top:10px;padding:8px 10px;border-left:3px solid var(--red);font-size:12.5px">
          <strong>${escapeHtml(t(IDR_MOTIVO_KEYS[idrUltimoFallo.motivo] || 'idr.err.provider'))}</strong>
          <details style="margin-top:4px"><summary style="font-size:12px;color:var(--muted);cursor:pointer">${t('idr.lastError')}</summary>
          <div style="font-size:11px;color:var(--muted);word-break:break-word;max-height:160px;overflow:auto;margin-top:6px">${escapeHtml(idrUltimoFallo.motivo)} · ${escapeHtml(String(idrUltimoFallo.detalle).slice(0,600))}</div></details>
        </div>` : ''}

        ${!iaOk ? `<p style="font-size:12.5px;color:var(--muted)">${t('idr.noAssistantBody')}</p>` : `
          <div class="field" style="margin-top:12px">
            <textarea id="idr-libre" rows="3" placeholder="${escapeHtml(t('idr.chatPlaceholder'))}"
              oninput="idrGuardarLibre(this.value)"
              onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();idrEnviar();}">${escapeHtml(c.borrador||'')}</textarea>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-primary" id="idr-enviar" onclick="idrEnviar()"${idrPensando?' disabled':''}><i class="ti ti-send"></i> ${t('idr.send')}</button>
            ${c.tipo === 'plato'
              ? `<button class="owner-only btn ${c.listo?'btn-primary':''}" onclick="idrCrearPlatoReal(${c.id})"><i class="ti ti-plus"></i> ${t('idr.createDish')}</button>`
              : c.tipo === 'base'
              ? `<button class="owner-only btn ${c.listo?'btn-primary':''}" onclick="idrCrearBaseReal(${c.id})"><i class="ti ti-plus"></i> ${t('idr.createBase')}</button>`
              : c.propuesta
              ? `<button class="owner-only btn btn-primary" onclick="idrCrearLosPlatosPropuestos(${c.id})"><i class="ti ti-check"></i> ${t('idr.approveProposal')}</button>
                 <button class="owner-only btn" onclick="idrProponerPlatos(${c.id})"><i class="ti ti-refresh"></i> ${t('idr.proposeAgain')}</button>`
              : `<button class="owner-only btn" onclick="idrElegirExistentes(${c.id})"><i class="ti ti-checkbox"></i> ${t('idr.useExisting')}</button>
                 <button class="owner-only btn btn-primary" onclick="idrProponerPlatos(${c.id})"><i class="ti ti-sparkles"></i> ${t('idr.proposeNew')}</button>`}
            <span style="font-size:12px;color:var(--muted)">${t('idr.callsLeft').replace('${n}', idrQuedanLlamadas())}</span>
          </div>
          ${c.listo ? `<p style="font-size:12.5px;color:#1F8A4C;margin:8px 0 0"><i class="ti ti-check"></i> ${t('idr.readyToCreate')}</p>`
                    : `<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">${t('idr.keepTalking')}</p>`}
        `}
      </div>
    `}
  `;

  // El hilo se abre por el final, como cualquier conversación.
  const cajaHilo = document.getElementById('idr-hilo');
  if(cajaHilo) cajaHilo.scrollTop = cajaHilo.scrollHeight;
}

let idrPensando = false;

/* Un turno de conversación. Nada aquí dentro puede fallar en silencio: si el
   asistente revienta, se avisa y se puede reintentar — el fallo que dejaba el
   botón muerto costó una noche entera de diagnóstico. */
async function idrEnviar(){
  const cAntes = idrCreacion(idrCreacionActiva);
  const antes = cAntes ? idrMensajes(cAntes).length : 0;
  try{ await idrEnviarInterno(); }
  catch(e){
    idrUltimoFallo = {motivo:'excepcion', detalle: String(e && (e.stack || e.message) || e), cuando: new Date().toISOString()};
    if(typeof showToast === 'function') showToast(t('idr.err.render'));
  }
  /* GARANTÍA: un turno no puede terminar sin respuesta. Da igual por dónde se
     haya escapado —una rama que no contemplamos, un error dentro de un error,
     un proveedor que devuelve algo raro—: si el hilo se queda con la pregunta
     del cocinero y nada debajo, se escribe aquí qué ha pasado. Mirar una
     pantalla muda y no saber si el botón funciona o el asistente te ignora es
     lo peor que puede hacer esta herramienta, y ya ha pasado dos veces. */
  idrPensando = false;
  const c = idrCreacion(idrCreacionActiva);
  if(c){
    const hilo = idrMensajes(c);
    const ultimo = hilo[hilo.length - 1];
    if(hilo.length > antes && ultimo && ultimo.r === 'yo'){
      const f = idrUltimoFallo;
      const msg = f ? t(IDR_MOTIVO_KEYS[f.motivo] || 'idr.err.provider') : t('idr.err.provider');
      const detalle = f && f.detalle ? `\n\n(${f.motivo}: ${String(f.detalle).slice(0, 300)})` : '\n\n(sin detalle: el asistente no devolvió nada)';
      hilo.push({mid: idrNuevoMid(), r:'ia', t: `⚠ ${msg}${detalle}`, fallo: true});
      c.updatedAt = new Date().toISOString();
      saveDB();
    }
  }
  renderIdr();
}
async function idrEnviarInterno(){
  const c = idrCreacion(idrCreacionActiva);
  if(!c || idrPensando) return;
  const el = document.getElementById('idr-libre');
  const texto = ((el ? el.value : '') || c.borrador || '').trim();
  if(!texto){ showToast(t('idr.writeSomething')); return; }

  // Con `mid` propio: es lo que permite fusionar el hilo con el de la nube sin
  // duplicar mensajes ni perder ninguno (ver fusionarCreacionIdr).
  idrMensajes(c).push({mid: idrNuevoMid(), r:'yo', t: texto.slice(0, 2000)});
  c.borrador = '';
  // El primer mensaje bautiza la prueba mientras no haya un nombre mejor.
  if(!c.titulo) c.titulo = texto.slice(0, 60);
  c.updatedAt = new Date().toISOString();
  saveDB();
  idrPensando = true;
  renderIdr();

  const historial = idrMensajes(c).map(m => ({role: m.r === 'yo' ? 'user' : 'assistant', content: m.t}));
  const r = await llmChat(idrSistema(idrGuionConversacion(c.tipo)), historial, {maxTokens: 2500});
  idrPensando = false;
  /* Mientras el asistente pensaba, la nube ha podido devolver este bloque y
     SUSTITUIR el objeto de la creación dentro de DB. Escribir la respuesta en
     la referencia vieja es escribirla en un objeto que ya no está en ninguna
     parte: se guarda, se pinta... y no aparece nada. Hay que volver a
     buscarla siempre después de esperar. */
  const cVivo = idrCreacion(c.id) || c;
  if(!r || !r.ok){
    /* El fallo entra EN EL HILO, no solo en un aviso que se va en dos
       segundos. Un cocinero que pregunta y no ve nada concluye que la
       herramienta no funciona y no vuelve; y desde el otro lado del
       teléfono no hay forma de saber qué pasó. Aquí queda escrito, con su
       motivo técnico, y se puede leer o copiar cuando sea. */
    const msg = idrMensajeError(r || {});
    const detalle = (r && r.detalle) ? `\n\n(${String(r.detalle).slice(0, 300)})` : '';
    idrMensajes(cVivo).push({mid: idrNuevoMid(), r:'ia', t: `⚠ ${msg}${detalle}`, fallo: true});
    cVivo.updatedAt = new Date().toISOString();
    saveDB();
    showToast(msg);
    renderIdr();
    return;
  }
  idrUltimoFallo = null;

  const j = idrExtraerJson(r.texto);
  const respuesta = (j && j.respuesta) ? String(j.respuesta) : r.texto;
  idrMensajes(cVivo).push({mid: idrNuevoMid(), r:'ia', t: respuesta.slice(0, 4000)});
  cVivo.listo = !!(j && j.listo);
  cVivo.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

/* Lo que se le pide al asistente en la conversación. Es donde vive el oficio:
   preguntar poco y bien, no dar por supuesto lo que no le han dicho, y no
   arrastrar a un plato partes que no le tocan — el guion de pasos obligaba a
   ponerle salsa a una ensalada. */
function idrGuionConversacion(tipo){
  const queEs = tipo === 'base'
    ? `Estás creando una ELABORACIÓN BASE: algo que se produce de antemano y se usa después en varios platos (un fondo, una salsa madre, una crema, un escabeche, una picada).
Antes de darla por cerrada tienes que saber SIEMPRE cuánto sale (rendimiento con su unidad, por ejemplo "3 L"): sin eso no se puede costear por litro, y todos los platos que la lleven saldrán mal costeados.`
    : `Estás creando UN PLATO ENTERO para la carta: producto principal, cómo se trata, con qué se acompaña y cómo se acaba. Si el cocinero te pregunta solo por una parte (una salsa, una guarnición), respóndele a eso y ADEMÁS ayúdale a cerrar el plato alrededor, que es lo que va a acabar en la carta y en el escandallo.`;
  return `${queEs}

TU TRABAJO ES AYUDARLE A CREAR, NO INTERROGARLE.

Si te pide algo concreto — "un entrante de otoño", "una salsa para un salmón", "algo con calabaza" — CONTESTA CON PROPUESTAS DE VERDAD, ahí mismo, sin pedirle antes una lista de datos. Dale DOS O TRES caminos distintos entre sí, y de cada uno:
- qué es, en una línea,
- POR QUÉ funciona con ese producto (qué corta la grasa, qué aporta acidez, qué textura hace contraste),
- y qué lleva, con cantidades aproximadas, para que se pueda cocinar mañana.

Caminos DISTINTOS de verdad, no tres versiones de lo mismo: si una es una emulsión, que otra sea una vinagreta y otra un jugo o un fondo reducido. Y di cuál es un clásico y cuál es una vuelta tuya.

APORTA CRITERIO, NO SOLO OPCIONES. En cada respuesta, además de proponer, MÓJATE:
- di cuál elegirías tú y por qué, aunque le dejes decidir a él;
- avisa de lo que puede salir mal (una emulsión que se corta con el calor del pase, una fritura que se ablanda si espera, una acidez que se come al producto);
- señala lo que se puede dejar hecho en mise en place y lo que hay que hacer al momento;
- si algo choca con su ADN, con su equipamiento o con lo que ya tiene en carta, dilo ANTES de que se enamore de la idea.
Y cuenta lo que sabes del producto cuando venga a cuento: de dónde es el plato, qué temporada tiene, qué corte o qué punto pide. Un cocinero no quiere una lista: quiere hablar con alguien que sabe.

NO DEJES LA CONVERSACIÓN MUERTA. Termina SIEMPRE con un paso concreto: una pregunta que haga avanzar, o lo que harías a continuación. Nada de "avísame si necesitas algo".

Pregunta SOLO cuando la respuesta cambie de verdad lo que vas a proponer (el punto del pescado, si va frío o caliente, si es para carta o para menú del día). Una o dos preguntas como mucho, y NUNCA antes de haber dado algo con lo que trabajar. Un cocinero que viene a por ideas y se encuentra un cuestionario, se va.

No hay guion fijo: una ensalada no lleva salsa, un helado no lleva guarnición y un arroz no lleva emplatado de pinzas. Habla de lo que ese plato pida y calla lo que no.

No te limites a lo que ya compra: si un producto que no tiene mejora el plato, propónlo y di que habría que darlo de alta. Y no des por sabido lo que no te han dicho: si no conoces bien algo, dilo y pide una receta de referencia.

CUANDO YA ESTÉ DECIDIDO: en cuanto sepas qué lleva, cómo se hace y para cuántos, pon "listo": true y DILE EXPRESAMENTE que le dé al botón "${tipo === 'base' ? 'Crear la elaboración' : 'Crear el plato'}" para que la aplicación escriba la ficha y la cueste con sus precios. No sigas alargando la conversación por tu cuenta.

Responde SIEMPRE con este JSON, sin nada alrededor:
{"respuesta":"lo que le dices al cocinero","listo":false,"falta":["lo que todavía necesitas saber"]}`;
}

/* Lo que se escribe se guarda EN EL ESTADO, no solo en el cuadro. Si no, un
   repintado a media conversación se lo llevaba por delante y el botón parecía
   roto: fue el fallo que más costó encontrar. */
function idrGuardarLibre(v){
  const c = idrCreacion(idrCreacionActiva);
  if(!c) return;
  c.borrador = v;
}

/* ============================================================
   DE PROPUESTA A PLATO REAL
   ============================================================
   El momento en que esto deja de ser un chat. Se le pide la receta con
   ingredientes y cantidades, se casa cada ingrediente con los SUYOS, y se
   crea el escandallo de verdad.

   ⚠️ El coste NO lo pone el modelo: lo calcula recipeCost() con los
   precios reales del negocio. Si el modelo estimó otra cosa, manda la app. */

// Casa un nombre de ingrediente propuesto con uno real del negocio.
// Primero exacto, luego por contención: "cebolla de Figueres" debe
// encontrar "Cebolla" antes que rendirse.
/* ── Unidades ──
   El asistente contesta en gramos y mililitros, que es como se piensa una
   receta. Pero cada negocio tiene sus ingredientes dados de alta en LA UNIDAD
   EN QUE LOS COMPRA: el queso de cabra por kg, el aceite por litros. La línea
   de escandallo va siempre en la unidad del ingrediente, así que meter el 120
   tal cual convertía 120 g de queso en 120 kg — y el coste del plato con él.
   Aquí se pasa la cantidad del modelo a la unidad real del ingrediente. Si no
   se sabe convertir (unidades de familias distintas, o el modelo no dijo
   ninguna), se deja el número tal cual: es lo que el cocinero verá y podrá
   corregir, mejor que inventar un factor. */
const IDR_A_BASE = {g:1, kg:1000, mg:0.001, ml:1, cl:10, dl:100, l:1000, L:1000, ud:1, u:1, unidad:1, unidades:1, pza:1};
const IDR_FAMILIA = {g:'peso', kg:'peso', mg:'peso', ml:'vol', cl:'vol', dl:'vol', l:'vol', L:'vol', ud:'ud', u:'ud', unidad:'ud', unidades:'ud', pza:'ud'};
function idrNormalizaUnidad(u){
  const x = String(u||'').trim().toLowerCase().replace(/[.]/g,'');
  if(x === 'l' || x === 'litro' || x === 'litros') return 'L';
  if(x === 'gr' || x === 'gramo' || x === 'gramos') return 'g';
  if(x === 'kilo' || x === 'kilos' || x === 'kgs') return 'kg';
  if(x === 'mililitro' || x === 'mililitros') return 'ml';
  if(x === 'uds' || x === 'unidades' || x === 'unidad' || x === 'u') return 'ud';
  return x;
}
function idrConvertirCantidad(cantidad, unidadModelo, unidadIngrediente){
  const q = parseFloat(cantidad);
  if(!isFinite(q)) return 0;
  const de = idrNormalizaUnidad(unidadModelo);
  const a  = idrNormalizaUnidad(unidadIngrediente);
  if(!de || !a || de === a) return q;
  if(!IDR_FAMILIA[de] || !IDR_FAMILIA[a] || IDR_FAMILIA[de] !== IDR_FAMILIA[a]) return q;
  const v = q * IDR_A_BASE[de] / IDR_A_BASE[a];
  // Se redondea a 4 decimales: 120 g de queso son 0,12 kg, no 0,12000000000000001.
  return Math.round(v * 10000) / 10000;
}

function idrBuscarIngrediente(nombre){
  const n = (nombre||'').trim().toLowerCase();
  if(!n) return null;
  const ings = (DB.ingredients||[]).filter(i => (i.area||'cocina') === 'cocina');
  let hit = ings.find(i => (i.name||'').trim().toLowerCase() === n);
  if(hit) return hit;
  hit = ings.find(i => n.includes((i.name||'').trim().toLowerCase()) && (i.name||'').trim().length > 3);
  if(hit) return hit;
  return ings.find(i => (i.name||'').trim().toLowerCase().includes(n) && n.length > 3) || null;
}

/* Convierte una línea propuesta por el asistente en una línea de escandallo
   de verdad. Puede ser un ingrediente que compra o UNA DE SUS ELABORACIONES
   BASE: si el plato lleva su fondo oscuro, la línea apunta a esa ficha y el
   coste se encadena solo, igual que si la hubiera puesto un cocinero a mano.
   Lo que no case con nada vuelve como null y se marca como pendiente de dar
   de alta — nunca se inventa un ingrediente ni se descuenta del coste. */
function idrCasarLinea(ing){
  if(!ing || !ing.nombre) return null;
  const base = idrBuscarElaboracion(ing.nombre);
  if(base){
    const qty = Math.max(0, idrConvertirCantidad(ing.cantidad, ing.unidad, base.baseUnit || 'L'));
    if(qty > 0) return {type:'base', baseRecipeId: base.id, qty, merma: 0};
  }
  const real = idrBuscarIngrediente(ing.nombre);
  if(real){
    const qty = Math.max(0, idrConvertirCantidad(ing.cantidad, ing.unidad, real.unit));
    if(qty > 0) return {type:'ingredient', ingredientId: real.id, qty, merma: 0};
  }
  return null;
}
function idrBuscarElaboracion(nombre){
  const n = (nombre||'').trim().toLowerCase();
  if(!n) return null;
  const bases = (DB.recipes||[]).filter(r => r.isBase && (r.area||'cocina') === 'cocina');
  return bases.find(r => (r.name||'').trim().toLowerCase() === n)
      || bases.find(r => n.includes((r.name||'').trim().toLowerCase()) && (r.name||'').trim().length > 4)
      || null;
}

/* Para cuántos son las cantidades. Sale de la conversación, no de una
   constante: un plato de carta se piensa por ración y un menú del día se
   piensa para cuarenta, y el escandallo por comensal solo sale bien si el
   número es el de verdad. Se acota para que una cifra disparatada del modelo
   no deje el coste por comensal en algo sin sentido. */
function idrLeerComensales(v){
  const n = Math.round(parseFloat(v));
  if(!isFinite(n) || n < 1) return 1;
  return Math.min(n, 200);
}

async function idrCrearPlatoReal(id){
  try{ await idrCrearPlatoRealInterno(id); }
  catch(e){
    idrUltimoFallo = {motivo:'excepcion', detalle: String(e && (e.stack || e.message) || e), cuando: new Date().toISOString()};
    if(typeof showToast === 'function') showToast(t('idr.err.render'));
    renderIdr();
  }
}
async function idrCrearPlatoRealInterno(id){
  const c = idrCreacion(id);
  if(!c || c.tipo !== 'plato') return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }
  if(!idrAdnRelleno()){ showToast(t('idr.dnaRequired') + ' (' + idrAdnQueFalta().join(', ') + ')', 5000); idrAdnModal(); return; }

  const resumen = idrConversacionTexto(c);
  if(!resumen.trim()){ showToast(t('idr.nothingToBuild')); return; }

  showToast(t('idr.buildingDish'));
  const instruccion = `Esta es la conversación en la que hemos diseñado el plato:

${resumen}

Escribe la receta. Responde SOLO con este JSON:
{"nombre":"...","descripcion":"descripción corta de carta","comensales":2,"pasos":["paso 1","paso 2"],"ingredientes":[{"nombre":"tal y como lo llamaría el negocio","cantidad":120,"unidad":"g"}]}

Escríbela para UNA RACIÓN (un comensal), que es como se escandalla un plato de carta, y pon 1 en "comensales". Solo pon otro número si el cocinero ha pedido expresamente una producción para varios (por ejemplo cuarenta del menú del día).
Y ojo al escalar: la sal, el picante y las especias NO suben en proporción, y una reducción no tarda el doble por doblar el volumen. Ajusta con criterio, no multiplicando.

Si el plato usa una de SUS elaboraciones base, ponla como un ingrediente más con su nombre exacto y su cantidad en la unidad de la elaboración (por ejemplo {"nombre":"Fondo oscuro de ternera","cantidad":0.15,"unidad":"L"}). La aplicación le encadenará el coste real.

Las cantidades, SIEMPRE en gramos ("g"), mililitros ("ml") o unidades ("ud") — nunca en kilos ni litros. La aplicación ya las convierte a la unidad en que el negocio compra cada cosa.
Aprovecha los ingredientes que YA COMPRA cuando encajen, con el mismo nombre con el que los tiene. Y si el plato pide alguno que no tiene, INCLÚYELO igual: la aplicación lo marcará como pendiente de dar de alta. No pongas precios ni costes.`;

  const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 3000});
  if(!r.ok){ showToast(idrMensajeError(r)); return; }
  idrUltimoFallo = null;
  const j = idrExtraerJson(r.texto);
  if(!j || !j.nombre || !Array.isArray(j.ingredientes)){ showToast(t('idr.err.unreadable')); return; }

  const lineas = [];
  const faltan = [];
  j.ingredientes.forEach(ing => {
    const linea = idrCasarLinea(ing);
    if(linea) lineas.push(linea);
    else faltan.push(`${ing.nombre}${ing.cantidad ? ` (${ing.cantidad} ${ing.unidad||''})` : ''}`);
  });

  const nombre = String(j.nombre).slice(0, 80);
  // Si esta prueba ya creó su ficha, se REESCRIBE esa misma. Antes, pedirle
  // al asistente una versión más barata dejaba dos platos casi iguales en
  // fichas técnicas y en la carta: el trabajo del cocinero no es limpiar
  // duplicados detrás de la aplicación.
  const existente = c.recipeId && typeof getRecipe === 'function' ? getRecipe(c.recipeId) : null;
  const receta = existente || {
    id: genId(), name: nombre, price: 0, priceBase: 0,
    ivaPct: (DB.business && DB.business.ivaPct) || 10,
    // Una ración: es como se escandalla un plato de carta.
    comensales: idrLeerComensales(j.comensales),
    consumiblesPct: 5,
    category: (typeof areaRecipeCategories === 'function' && areaRecipeCategories()[0]) || '',
    ingredients: lineas, allergens: [], area: 'cocina',
    isBase: false, baseYield: 1, baseUnit: 'L',
    steps: Array.isArray(j.pasos) ? j.pasos.join('\n') : '',
    presentation: String(j.descripcion || ''),
  };
  if(existente){
    // Se reescribe lo que ha cambiado y se respeta lo que el cocinero haya
    // tocado a mano (categoría, IVA, alérgenos marcados).
    Object.assign(receta, {name: nombre, ingredients: lineas,
      comensales: idrLeerComensales(j.comensales),
      steps: Array.isArray(j.pasos) ? j.pasos.join('\n') : receta.steps,
      presentation: String(j.descripcion || receta.presentation || '')});
  } else {
    DB.recipes.push(receta);
  }

  /* El precio de venta.
     Si el hostelero lo fijó en el encargo, ESE es el precio y no se toca: se
     lo hemos preguntado expresamente, y calcularle otro por detrás sería
     ignorarle y, peor, hacerle creer que el plato cumple cuando no lo hemos
     medido contra lo que él quiere cobrar.
     Solo cuando no hay precio fijado se propone uno (coste ÷ objetivo,
     redondeado a los 10 céntimos de arriba), como punto de partida. */
  const enc = idrEncargo(c);
  const costeIni = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  if(enc.pvp > 0){
    receta.price = enc.pvp;
    receta.priceBase = enc.pvp;
  } else {
    const objetivoFC = idrObjetivoFoodCost(c);
    if(isFinite(objetivoFC) && objetivoFC > 0 && costeIni > 0){
      receta.price = Math.ceil((costeIni / (objetivoFC/100)) * 10) / 10;
      receta.priceBase = receta.price;
      c.precioSugerido = receta.price;
    }
  }

  c.recipeId = receta.id;
  c.faltan = faltan;

  // NIVEL 3 + 4: la app juzga el plato en frío contra sus datos, y lo que
  // falla vuelve al modelo para que lo corrija ANTES de que el cocinero lo
  // vea. Cuesta una consulta más y es lo que separa "opina" de "rinde
  // cuentas".
  const problemas = idrValidarPlato(receta, {textoLibre: resumen, creacion: c});
  c.avisos = problemas;
  if(problemas.length){
    const arreglo = await llmChat(idrSistema(), [
      {role:'user', content: instruccion},
      {role:'assistant', content: r.texto},
      {role:'user', content: `He comprobado tu propuesta contra los datos reales del negocio y falla en esto:\n- ${problemas.join('\n- ')}\n\nCorrígelo y devuelve el MISMO JSON con la receta arreglada. Si algo no se puede arreglar sin traicionar el plato, déjalo y explica por qué en "nota".`}
    ], {maxTokens: 3000});
    const j2 = arreglo.ok ? idrExtraerJson(arreglo.texto) : null;
    if(j2 && Array.isArray(j2.ingredientes)){
      const lineas2 = []; const faltan2 = [];
      j2.ingredientes.forEach(ing => {
        const linea = idrCasarLinea(ing);
        if(linea) lineas2.push(linea);
        else if(ing.nombre) faltan2.push(`${ing.nombre}${ing.cantidad ? ` (${ing.cantidad} ${ing.unidad||''})` : ''}`);
      });
      if(lineas2.length){
        receta.ingredients = lineas2;
        if(j2.nombre) receta.name = String(j2.nombre).slice(0,80);
        if(Array.isArray(j2.pasos)) receta.steps = j2.pasos.join('\n');
        if(j2.descripcion) receta.presentation = String(j2.descripcion);
        c.faltan = faltan2;
        c.nota = String(j2.nota||'');
        // Se vuelve a medir: si sigue fallando, el cocinero lo sabrá.
        c.avisos = idrValidarPlato(receta, {textoLibre: resumen, creacion: c});
        c.corregido = true;
      }
    }
  }
  c.updatedAt = new Date().toISOString();
  saveDB();

  // El coste lo calcula la app con SUS precios, nunca el modelo.
  idrCerrarConLaFicha(c, receta);
  saveDB();
  const coste = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  const aviso = faltan.length
    ? t('idr.dishCreatedMissing').replace('${n}', faltan.length).replace('${coste}', fmtMoney(coste))
    : t('idr.dishCreated').replace('${coste}', fmtMoney(coste));
  showToast(aviso);
  renderIdr();
}

/* ── Elaboración base ──
   Un fondo o una salsa madre no se cuestan "para dos comensales": se cuestan
   por lo que SALE de la olla, y de ahí la app saca el precio por litro que
   luego cobra cada plato que la usa. Por eso el rendimiento es un paso del
   guion y no una suposición: sin él, el coste de todos los platos que la
   lleven sale mal, y encima sin avisar. */
const IDR_UNIDADES_BASE = ['L','ml','kg','g','ud'];
function idrLeerRendimiento(texto){
  const s = String(texto||'').trim().toLowerCase().replace(',', '.');
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Zµ]+)?/);
  if(!m) return {qty: 1, unit: 'L'};
  const qty = parseFloat(m[1]);
  let unit = idrNormalizaUnidad(m[2] || 'L');
  // La ficha solo admite estas cinco. Lo que no sea una de ellas se lleva a
  // la de su familia (un "litro y medio" en cl, a L) en vez de perderse.
  if(!IDR_UNIDADES_BASE.includes(unit)){
    if(unit === 'cl' || unit === 'dl'){ return {qty: Math.round((qty * IDR_A_BASE[unit] / 1000) * 10000)/10000, unit: 'L'}; }
    if(unit === 'mg'){ return {qty: qty/1000, unit: 'g'}; }
    unit = 'L';
  }
  return {qty: isFinite(qty) && qty > 0 ? qty : 1, unit};
}

/* De todo lo hablado, ¿cuánto sale? Se mira primero lo que dijo el cocinero
   (manda él), de lo último a lo primero, y solo si no lo dijo se mira lo que
   propuso el asistente. Si no aparece por ningún lado, 1 L: un número con el
   que la ficha se puede corregir a mano, nunca un cero que reviente el coste
   por unidad de todos los platos que la usen. */
function idrRendimientoDeLaConversacion(c){
  const mios = idrMensajes(c).filter(m => m.r === 'yo').map(m => m.t).reverse();
  const suyos = idrMensajes(c).filter(m => m.r === 'ia').map(m => m.t).reverse();
  const viejos = (c.pasos||[]).map(p => p && p.elegido).filter(Boolean).reverse();
  const rx = /([0-9]+(?:[.,][0-9]+)?)\s*(l|litros?|ml|cl|dl|kg|kilos?|g|gr|gramos?|ud|uds|unidades?)\b/i;
  for(const texto of mios.concat(viejos, suyos)){
    const m = String(texto).match(rx);
    if(m) return idrLeerRendimiento(m[0]);
  }
  return {qty: 1, unit: 'L'};
}

async function idrCrearBaseReal(id){
  try{ await idrCrearBaseRealInterno(id); }
  catch(e){
    idrUltimoFallo = {motivo:'excepcion', detalle: String(e && (e.stack || e.message) || e), cuando: new Date().toISOString()};
    if(typeof showToast === 'function') showToast(t('idr.err.render'));
    renderIdr();
  }
}
async function idrCrearBaseRealInterno(id){
  const c = idrCreacion(id);
  if(!c || c.tipo !== 'base') return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }
  if(!idrAdnRelleno()){ showToast(t('idr.dnaRequired') + ' (' + idrAdnQueFalta().join(', ') + ')', 5000); idrAdnModal(); return; }

  const resumen = idrConversacionTexto(c);
  if(!resumen.trim()){ showToast(t('idr.nothingToBuild')); return; }
  // El rendimiento sale de lo hablado. Se busca de atrás adelante: si se ha
  // rectificado a mitad de conversación, manda lo último que se dijo.
  const rend = idrRendimientoDeLaConversacion(c);

  showToast(t('idr.buildingBase'));
  const instruccion = `Esta es la conversación en la que hemos diseñado la elaboración base:

${resumen}

Escribe la receta para que salgan EXACTAMENTE ${rend.qty} ${rend.unit}. Responde SOLO con este JSON:
{"nombre":"...","descripcion":"para qué sirve y cómo se guarda en servicio, en una línea","pasos":["paso 1","paso 2"],"ingredientes":[{"nombre":"tal y como lo llamaría el negocio","cantidad":120,"unidad":"g"}]}

Las cantidades, SIEMPRE en gramos ("g"), mililitros ("ml") o unidades ("ud") — nunca en kilos ni litros. La aplicación ya las convierte a la unidad en que el negocio compra cada cosa.
Las cantidades tienen que dar ese rendimiento de verdad, contando lo que se reduce o se pierde al colar.
Aprovecha los ingredientes que YA COMPRA cuando encajen, con el mismo nombre con el que los tiene. Si hace falta alguno que no tiene, INCLÚYELO igual: la aplicación lo marcará como pendiente de dar de alta. No pongas precios ni costes.`;

  const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 3000});
  if(!r.ok){ showToast(idrMensajeError(r)); return; }
  idrUltimoFallo = null;
  const j = idrExtraerJson(r.texto);
  if(!j || !j.nombre || !Array.isArray(j.ingredientes)){ showToast(t('idr.err.unreadable')); return; }

  const lineas = [];
  const faltan = [];
  j.ingredientes.forEach(ing => {
    const linea = idrCasarLinea(ing);
    if(linea) lineas.push(linea);
    else faltan.push(`${ing.nombre}${ing.cantidad ? ` (${ing.cantidad} ${ing.unidad||''})` : ''}`);
  });

  const existente = c.recipeId && typeof getRecipe === 'function' ? getRecipe(c.recipeId) : null;
  const receta = existente || {
    id: genId(), name: String(j.nombre).slice(0, 80), price: 0, priceBase: 0,
    ivaPct: (DB.business && DB.business.ivaPct) || 10,
    comensales: 1, consumiblesPct: 0,
    category: (typeof areaRecipeCategories === 'function' && areaRecipeCategories()[0]) || '',
    ingredients: lineas, allergens: [], area: 'cocina',
    isBase: true, baseYield: rend.qty, baseUnit: rend.unit,
    steps: Array.isArray(j.pasos) ? j.pasos.join('\n') : '',
    presentation: String(j.descripcion || ''),
  };
  if(existente){
    Object.assign(receta, {name: String(j.nombre).slice(0, 80), ingredients: lineas,
      baseYield: rend.qty, baseUnit: rend.unit,
      steps: Array.isArray(j.pasos) ? j.pasos.join('\n') : receta.steps,
      presentation: String(j.descripcion || receta.presentation || '')});
  } else {
    DB.recipes.push(receta);
  }
  // Sin esto la elaboración existe como ficha pero no aparece en el stock de
  // elaboraciones, que es donde el equipo la busca y la produce.
  if(typeof syncElaboracionForRecipe === 'function') syncElaboracionForRecipe(receta.id, true, receta.name, receta.baseUnit);

  c.recipeId = receta.id;
  c.faltan = faltan;
  c.avisos = [];
  c.updatedAt = new Date().toISOString();
  saveDB();

  idrCerrarConLaFicha(c, receta);
  saveDB();
  const coste = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  const porUnidad = rend.qty > 0 ? coste / rend.qty : 0;
  const aviso = faltan.length
    ? t('idr.baseCreatedMissing').replace('${n}', faltan.length).replace('${coste}', fmtMoney(coste)).replace('${unidad}', `${fmtMoney(porUnidad)}/${rend.unit}`)
    : t('idr.baseCreated').replace('${coste}', fmtMoney(coste)).replace('${unidad}', `${fmtMoney(porUnidad)}/${rend.unit}`);
  showToast(aviso, 5000);
  renderIdr();
}
/* El escandallo deja de ser un veredicto y pasa a ser parte de la
   conversación. Antes la app calculaba el coste, lo enseñaba y ahí moría: si
   salía caro, el cocinero tenía que empezar de cero. Ahora los números reales
   entran en el hilo y se puede seguir hablando — "bájalo sin tocar el
   producto principal" — y al volver a crear se reescribe la MISMA ficha. *//* Una variante parte de la ficha que ya existe, con sus ingredientes y sus
   pasos dentro de la conversación. Es lo que se hace de verdad en una cocina:
   el plato bueno no se tira, se adapta — la versión sin gluten, la del menú
   del día, la de temporada. Nace como prueba NUEVA para no pisar la original:
   las dos tienen que poder convivir en la carta. */
async function idrVariante(id){
  const c = idrCreacion(id);
  if(!c) return;
  const receta = c.recipeId && typeof getRecipe === 'function' ? getRecipe(c.recipeId) : null;
  if(!receta){ showToast(t('idr.nothingToBuild')); return; }

  const lineas = (receta.ingredients||[]).map(l => {
    if(l.type === 'base'){
      const b = getRecipe(l.baseRecipeId);
      return b ? `- ${fmtNum(l.qty)} ${b.baseUnit||'L'} de ${b.name} (elaboración propia)` : null;
    }
    const ing = getIngredient(l.ingredientId);
    return ing ? `- ${fmtNum(l.qty)} ${ing.unit} de ${ing.name}` : null;
  }).filter(Boolean).join('\n');

  const nueva = idrNuevaCreacion(c.tipo);
  if(c.carpetaId) nueva.carpetaId = c.carpetaId;
  nueva.titulo = t('idr.variantOf').replace('${n}', receta.name).slice(0, 60);
  nueva.origenRecipeId = receta.id;
  idrMensajes(nueva).push({mid: idrNuevoMid(), r:'yo', t:
    `${t('idr.variantIntro').replace('${n}', receta.name)}\n\n` +
    `${t('idr.variantFor').replace('${n}', receta.comensales || 2)}\n${lineas}\n\n` +
    (receta.steps ? `${t('idr.variantSteps')}\n${receta.steps}\n\n` : '') +
    t('idr.variantAsk')});
  saveDB();
  navIdr('creacion', nueva.id);
  showToast(t('idr.variantReady'), 4000);
}
/* Abre la ficha recién creada donde vive de verdad: Escandallo, en su
   pestaña, con su ventana abierta. Crear un plato y no saber dónde ha ido a
   parar deja el trabajo a medias — el dueño creó una receta y se quedó sin
   saber cómo seguir. */
function idrVerLaFicha(id){
  const c = idrCreacion(id);
  const receta = c && c.recipeId && typeof getRecipe === 'function' ? getRecipe(c.recipeId) : null;
  if(!receta){ showToast(t('idr.nothingToBuild')); return; }
  navigate('escandallo');
  if(typeof setEscandalloTab === 'function') setEscandalloTab(receta.isBase ? 'elaboraciones' : 'platos');
  if(typeof openRecipeModal === 'function') openRecipeModal(receta.id);
}

/* Lo que el asistente dice DESPUÉS de crear. Antes la conversación terminaba
   en seco: la ficha existía, pero nadie te decía dónde estaba ni qué hacer
   con ella. Ahora cierra el círculo con los números reales y con el siguiente
   paso, que es lo que convierte una idea en un plato que se vende. */
function idrCerrarConLaFicha(c, receta){
  if(!c || !receta) return;
  const coste = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  const partes = [];
  if(receta.isBase){
    const y = parseFloat(receta.baseYield) || 1;
    partes.push(t('idr.doneBaseWhere')
      .replace('${n}', receta.name)
      .replace('${coste}', fmtMoney(coste))
      .replace('${unidad}', `${fmtMoney(coste / y)}/${receta.baseUnit || 'L'}`));
  } else {
    const pvp = parseFloat(receta.price) || 0;
    partes.push(t('idr.doneDishWhere')
      .replace('${n}', receta.name)
      .replace('${comensales}', receta.comensales || 2)
      .replace('${coste}', fmtMoney(coste))
      .replace('${pvp}', fmtMoney(pvp)));
  }
  if((c.faltan||[]).length) partes.push(t('idr.doneMissing').replace('${n}', c.faltan.length).replace('${lista}', c.faltan.join(', ')));
  if((c.avisos||[]).length) partes.push(t('idr.doneWarnings') + '\n· ' + c.avisos.join('\n· '));
  partes.push(t('idr.doneNext'));
  idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: partes.join('\n\n')});
}
/* ============================================================
   MENÚ Y CARTA — los dos caminos
   ============================================================
   Una vez fijada la estructura, hay dos formas de llenarla, y son las dos
   que se usan en una cocina de verdad:

   1) CON LO QUE YA TIENES. Los platos escandallados se eligen a mano. No
      hace falta ninguna consulta al asistente ni se crea nada nuevo: el
      trabajo ya está hecho y solo hay que colocarlo.
   2) CON PLATOS NUEVOS. El asistente propone la lista entera —nombre y una
      línea de cada uno— y AHÍ SE PARA. Nada se crea hasta que la persona lo
      aprueba: escribir treinta fichas que no gustan es peor que no escribir
      ninguna, y cuesta dinero en consultas. Aprobado, se escriben las fichas
      con su escandallo y se monta la carta o el menú.
   ============================================================ */

// ── Camino 1: los que ya tienes ──
let idrSeleccionPlatos = {};   // {indiceDeBloque: [recipeId, ...]}

function idrPlatosEscandallados(){
  return (DB.recipes||[])
    .filter(r => !r.isBase && (r.area||'cocina') === 'cocina')
    .slice()
    .sort((a,b) => (a.name||'').localeCompare(b.name||''));
}

function idrElegirExistentes(id){
  const c = idrCreacion(id);
  if(!c) return;
  const platos = idrPlatosEscandallados();
  if(!platos.length){ showToast(t('idr.noDishesYet'), 4000); return; }
  idrSeleccionPlatos = {};
  (idrEncargo(c).bloques||[]).forEach((b, i) => { idrSeleccionPlatos[i] = []; });
  idrPintarSelectorPlatos(id);
}

function idrPintarSelectorPlatos(id){
  const c = idrCreacion(id);
  if(!c) return;
  const bloques = idrEncargo(c).bloques || [];
  const platos = idrPlatosEscandallados();
  const filas = bloques.map((b, i) => {
    const elegidos = idrSeleccionPlatos[i] || [];
    return `
      <div class="card card-compact">
        <h3 style="font-size:14px;justify-content:space-between">
          <span>${escapeHtml(b.nombre)}</span>
          <span style="font-size:12px;color:${elegidos.length === b.n ? '#1F8A4C' : 'var(--muted)'}">${elegidos.length}/${b.n}</span>
        </h3>
        <div style="max-height:150px;overflow:auto">
          ${platos.map(p => `
            <label style="display:flex;align-items:center;gap:8px;min-height:44px;font-size:13px;cursor:pointer">
              <input type="checkbox" ${elegidos.includes(p.id) ? 'checked' : ''} onchange="idrMarcarPlato(${id}, ${i}, ${p.id}, this.checked)">
              <span>${escapeHtml(p.name)} <span style="color:var(--muted)">· ${fmtMoney(recipeCost(p))}</span></span>
            </label>`).join('')}
        </div>
      </div>`;
  }).join('');
  openModal(`
    <div class="modal-head"><h3><i class="ti ti-checkbox"></i> ${t('idr.pickExisting')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--muted)">${t('idr.pickExistingHint')}</p>
      <div class="grid grid-2">${filas}</div>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="idrMontarConLosElegidos(${id})"><i class="ti ti-check"></i> ${t('idr.pickDone')}</button>
    </div>`);
}

function idrMarcarPlato(id, bloque, recipeId, marcado){
  const c = idrCreacion(id);
  if(!c) return;
  const b = (idrEncargo(c).bloques||[])[bloque];
  const lista = idrSeleccionPlatos[bloque] || (idrSeleccionPlatos[bloque] = []);
  if(marcado){
    // El tope del bloque lo puso el negocio: no se pasa de ahí sin decirlo.
    if(b && lista.length >= b.n){ showToast(t('idr.pickFull').replace('${n}', b.n).replace('${bloque}', b.nombre), 3500); idrPintarSelectorPlatos(id); return; }
    if(!lista.includes(recipeId)) lista.push(recipeId);
  } else {
    idrSeleccionPlatos[bloque] = lista.filter(x => x !== recipeId);
  }
  idrPintarSelectorPlatos(id);
}

function idrMontarConLosElegidos(id){
  const c = idrCreacion(id);
  if(!c) return;
  const bloques = idrEncargo(c).bloques || [];
  const secciones = [];
  const usados = [];
  bloques.forEach((b, i) => {
    const platos = (idrSeleccionPlatos[i] || []).map(rid => getRecipe(rid)).filter(Boolean);
    platos.forEach(p => usados.push(p.id));
    if(platos.length) secciones.push({
      id: genId(), nombre: String(b.nombre).slice(0,60),
      platos: platos.map(p => ({id: genId(), recipeId: p.id, nombre: p.name,
        precio: p.price || 0, precioBase: p.priceBase || 0, ivaPct: p.ivaPct || 10,
        disponible: true, modificadores: []})),
    });
  });
  if(!usados.length){ showToast(t('idr.pickNone')); return; }
  closeModal();
  idrGuardarConjunto(c, secciones, usados, '');
  showToast(t('idr.setBuilt').replace('${n}', usados.length), 5000);
  renderIdr();
}

/* Guardar el conjunto: una carta se crea de verdad; un menú se queda con sus
   platos en el cuaderno, porque un menú del día CONVIVE con la carta y no la
   sustituye — montarlo como carta es decisión del negocio, no nuestra. */
function idrGuardarConjunto(c, secciones, recipeIds, logica){
  c.recipeIds = recipeIds;
  if(logica) c.logica = logica;
  if(c.tipo === 'carta'){
    if(!Array.isArray(DB.cartas)) DB.cartas = [];
    const carta = {id: genId(), nombre: (c.titulo || t('idr.newCarta')).toUpperCase(), tipo:'GENERAL',
      desde:'', hasta:'', dias:[0,1,2,3,4,5,6], secciones};
    DB.cartas.push(carta);
    c.cartaId = carta.id;
  } else {
    c.secciones = secciones.map(sec => ({nombre: sec.nombre, platos: sec.platos.map(p => p.nombre)}));
  }
  c.updatedAt = new Date().toISOString();
  idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: t('idr.setDoneWhere')
    .replace('${n}', recipeIds.length)
    .replace('${donde}', c.tipo === 'carta' ? t('idr.setDoneCarta') : t('idr.setDoneMenu'))});
  saveDB();
}

// ── Camino 2: platos nuevos, con parada obligatoria antes de crear nada ──
async function idrProponerPlatos(id){
  const c = idrCreacion(id);
  if(!c) return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }
  const e = idrEncargo(c);
  showToast(t('idr.proposing'), 4000);
  const estructura = (e.bloques||[]).map(b => `- ${b.nombre}: ${b.n}`).join('\n');
  const conversacion = idrConversacionTexto(c);
  const instruccion = `Propón los platos que llenan esta estructura, y NADA MÁS todavía: solo el nombre y una línea de cada uno. No escribas recetas ni ingredientes.

${estructura}

${conversacion ? 'Lo que hemos hablado:\n' + conversacion + '\n' : ''}
Que el conjunto quede EQUILIBRADO: sin repetir base ni técnica principal entre platos, alternando temperaturas y texturas, aprovechando fondos y mise en place entre unos y otros, y sin que todos exijan trabajo al momento.

Responde SOLO con este JSON:
{"nombre":"nombre del conjunto","logica":"en dos o tres frases: qué lo hace coherente, cómo se reparten técnicas y bases, y qué se aprovecha entre platos","bloques":[{"nombre":"exactamente el nombre del bloque","platos":[{"nombre":"...","descripcion":"una línea"}]}]}`;

  const r = await llmChat(idrSistema(idrGuionConversacion(c.tipo)), [{role:'user', content: instruccion}], {maxTokens: 3000});
  if(!r || !r.ok){
    idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: `⚠ ${idrMensajeError(r||{})}`, fallo: true});
    saveDB(); renderIdr(); return;
  }
  idrUltimoFallo = null;
  const j = idrExtraerJson(r.texto);
  if(!j || !Array.isArray(j.bloques)){ showToast(t('idr.err.unreadable')); return; }
  c.propuesta = {nombre: String(j.nombre||''), logica: String(j.logica||''), bloques: j.bloques};
  if(j.nombre && !c.titulo) c.titulo = String(j.nombre).slice(0,60);
  const resumen = (j.bloques||[]).map(b =>
    `${b.nombre}\n` + (b.platos||[]).map(p => `  · ${p.nombre} — ${p.descripcion||''}`).join('\n')
  ).join('\n\n');
  idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t:
    `${j.logica ? j.logica + '\n\n' : ''}${resumen}\n\n${t('idr.proposalAsk')}`});
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

/* Aprobada la lista, se escriben las fichas. Una llamada por bloque y no una
   por plato: treinta llamadas serían treinta esperas y treinta cargos. */
async function idrCrearLosPlatosPropuestos(id){
  const c = idrCreacion(id);
  if(!c || !c.propuesta) return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }
  const e = idrEncargo(c);
  const secciones = [];
  const creados = [];
  const faltan = [];

  for(const bloque of (c.propuesta.bloques||[])){
    showToast(t('idr.writingBlock').replace('${n}', bloque.nombre), 4000);
    const lista = (bloque.platos||[]).map(p => `- ${p.nombre}: ${p.descripcion||''}`).join('\n');
    const instruccion = `Escribe la receta COMPLETA de cada uno de estos platos, ya aprobados:

${lista}

Cada receta para UNA persona (una ración de carta). Responde SOLO con este JSON:
{"platos":[{"nombre":"...","descripcion":"corta, de carta","pasos":["paso 1","paso 2"],"ingredientes":[{"nombre":"...","cantidad":120,"unidad":"g"}]}]}

Las cantidades, SIEMPRE en gramos ("g"), mililitros ("ml") o unidades ("ud"). Si el plato usa una de SUS elaboraciones base, ponla como un ingrediente más con su nombre exacto. Los ingredientes que no tenga, inclúyelos igual: se marcarán como pendientes de dar de alta.`;
    const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 4000});
    if(!r || !r.ok){
      idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: `⚠ ${idrMensajeError(r||{})}`, fallo: true});
      saveDB(); renderIdr(); return;
    }
    const j = idrExtraerJson(r.texto);
    if(!j || !Array.isArray(j.platos)) continue;
    const platosSec = [];
    j.platos.forEach(pl => {
      if(!pl || !pl.nombre) return;
      const lineas = [];
      (pl.ingredientes||[]).forEach(ing => {
        const linea = idrCasarLinea(ing);
        if(linea) lineas.push(linea);
        else if(ing.nombre) faltan.push(`${ing.nombre} — ${pl.nombre}`);
      });
      const receta = {
        id: genId(), name: String(pl.nombre).slice(0,80), price: 0, priceBase: 0,
        ivaPct: (DB.business && DB.business.ivaPct) || 10,
        comensales: 1, consumiblesPct: 5,
        category: (typeof areaRecipeCategories === 'function' && areaRecipeCategories()[0]) || '',
        ingredients: lineas, allergens: [], area: 'cocina',
        isBase: false, baseYield: 1, baseUnit: 'L',
        steps: Array.isArray(pl.pasos) ? pl.pasos.join('\n') : '',
        presentation: String(pl.descripcion || ''),
      };
      // El PVP sale del encargo, no del modelo: en una carta es el precio
      // medio que fijó el negocio; el escandallo dirá si sale o no.
      if(e.pvp && c.tipo === 'carta'){ receta.price = e.pvp; receta.priceBase = e.pvp; }
      DB.recipes.push(receta);
      creados.push(receta);
      platosSec.push({id: genId(), recipeId: receta.id, nombre: receta.name,
        precio: receta.price, precioBase: receta.priceBase, ivaPct: receta.ivaPct,
        disponible: true, modificadores: []});
    });
    if(platosSec.length) secciones.push({id: genId(), nombre: String(bloque.nombre||'').slice(0,60), platos: platosSec});
  }

  if(!creados.length){ showToast(t('idr.err.unreadable')); return; }
  c.faltan = faltan;
  /* El food cost de un MENÚ es el del menú entero, no el de cada pase por
     separado: un aperitivo al 4% y un segundo al 45% pueden dar un menú
     perfecto. La app comprobaba plato a plato y nunca sumaba, así que el
     número que de verdad decide si el menú es rentable no se miraba. */
  c.avisos = idrRevisarConjunto(c, creados);
  idrGuardarConjunto(c, secciones, creados.map(x => x.id), c.propuesta.logica);
  c.propuesta = null;
  saveDB();
  showToast(t('idr.setBuilt').replace('${n}', creados.length), 5000);
  renderIdr();
}

function idrHablarDelCoste(id){
  const c = idrCreacion(id);
  if(!c) return;
  const receta = c.recipeId && typeof getRecipe === 'function' ? getRecipe(c.recipeId) : null;
  if(!receta){ showToast(t('idr.nothingToBuild')); return; }
  const coste = recipeCost(receta);
  const pvp = parseFloat(receta.price) || 0;
  const objetivo = parseFloat(idrAdn().foodCostObjetivo);
  const partes = [];
  if(receta.isBase){
    const y = parseFloat(receta.baseYield) || 1;
    partes.push(t('idr.costTalkBase')
      .replace('${coste}', fmtMoney(coste))
      .replace('${unidad}', `${fmtMoney(coste / y)}/${receta.baseUnit || 'L'}`));
  } else {
    partes.push(t('idr.costTalkDish').replace('${coste}', fmtMoney(coste)).replace('${pvp}', fmtMoney(pvp)));
    if(pvp > 0 && isFinite(objetivo) && objetivo > 0){
      partes.push(t('idr.costTalkTarget')
        .replace('${pct}', ((coste / pvp) * 100).toFixed(1))
        .replace('${obj}', objetivo));
    }
  }
  (c.avisos||[]).forEach(a => partes.push('· ' + a));
  partes.push(t('idr.costTalkAsk'));
  idrMensajes(c).push({mid: idrNuevoMid(), r:'ia', t: partes.join('\n')});
  c.listo = false;
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

function idrImprimir(id){
  const c = idrCreacion(id);
  if(!c) return;
  const pasos = IDR_PASOS[c.tipo] || [];
  const filas = (c.pasos||[]).map((p, i) => (p && p.elegido && pasos[i])
    ? `<tr><td style="padding:4px 12px 4px 0;color:#777;white-space:nowrap"><strong>${escapeHtml(gl(pasos[i].l))}</strong></td><td style="padding:4px 0">${escapeHtml(p.elegido)}</td></tr>` : ''
  ).join('');
  const body = `
    ${printReportHeaderHtml(c.titulo || t('idr.untitled'))}
    <table style="width:100%;border-collapse:collapse;font-size:11pt">${filas}</table>
    ${c.logica ? `<h2>${t('idr.setLogic')}</h2><p>${escapeHtml(c.logica)}</p>` : ''}
    ${(c.recipeIds||[]).length ? `<h2>${t('idr.setDishesTitle')}</h2><ul class="pr-steps">${c.recipeIds.map(rid=>{const rr=getRecipe(rid);return rr?`<li>${escapeHtml(rr.name)} — ${fmtMoney(recipeCost(rr))}</li>`:'';}).join('')}</ul>` : ''}
    ${(c.faltan||[]).length ? `<h2>${t('idr.missingIngredients')}</h2><ul class="pr-steps">${c.faltan.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
  `;
  printReportWindow(c.titulo || t('idr.untitled'), body, {winSize:'width=800,height=1000'});
}

/* ============================================================
   CONFIGURACIÓN DEL ASISTENTE
   ============================================================
   Se pide AQUÍ y no en el alta a propósito: el alta es el punto donde un
   cliente se atasca y llama, y quien no use I+D no debe encontrarse un
   paso más. */

function idrConfigModal(){
  const cfg = idrConfig() || {proveedor:'google', clave:'', modelo:''};
  const opts = Object.keys(IDR_PROVEEDORES).map(k =>
    `<option value="${k}"${k===cfg.proveedor?' selected':''}>${escapeHtml(gl(IDR_PROVEEDORES[k].l))}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <h3>${t('idr.assistant')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('idr.keyExplain')}</p>
    <div class="field-row">
      <div class="field">
        <label>${t('idr.provider')}</label>
        <select id="idr-prov" onchange="idrConfigModalRefrescar()">${opts}</select>
      </div>
      <div class="field">
        <label>${t('idr.model')}</label>
        <div id="idr-modelo-campo"><input type="text" id="idr-modelo" value="${escapeHtml(cfg.modelo||'')}" placeholder="${escapeHtml(IDR_PROVEEDORES[cfg.proveedor].modeloPorDefecto)}"></div>
      </div>
    </div>
    <div class="field">
      <label>${t('idr.key')}</label>
      <input type="password" id="idr-clave" value="${escapeHtml(cfg.clave||'')}" placeholder="${t('idr.keyPh')}" autocomplete="off">
      <p style="font-size:12px;color:var(--muted);margin:6px 0 0" id="idr-ayuda">${t('idr.keyWhere')} <strong>${escapeHtml(IDR_PROVEEDORES[cfg.proveedor].ayuda)}</strong></p>
    </div>
    <div class="card" style="border-left:4px solid var(--brand-orange);margin-top:10px">
      <p style="font-size:12.5px;margin:0">${t('idr.keyWarning')}</p>
    </div>
    <div style="margin-top:12px">
      <button class="btn" id="idr-probar" onclick="idrProbarConexion()"><i class="ti ti-plug-connected"></i> ${t('idr.test')}</button>
      <button class="btn" id="idr-modelos" onclick="idrCargarModelos()"><i class="ti ti-list"></i> ${t('idr.listModels')}</button>
      <div id="idr-test-res" style="font-size:13px;margin-top:8px"></div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:10px">${t('idr.version').replace('${v}', (typeof GG_BUILD !== 'undefined' ? GG_BUILD : '—'))}</p>
    <p style="font-size:12px;color:var(--muted);margin-top:10px">${t('idr.callsToday').replace('${n}', idrGastoHoy()).replace('${tope}', IDR_TOPE_DIA)}</p>
    ${idrUltimoFallo ? `<details style="margin-top:8px"><summary style="font-size:12px;color:var(--muted);cursor:pointer">${t('idr.lastError')}</summary><div style="font-size:11px;color:var(--muted);word-break:break-word;max-height:140px;overflow:auto;margin-top:6px">${escapeHtml(idrUltimoFallo.motivo)} · ${escapeHtml(String(idrUltimoFallo.detalle).slice(0,400))}</div></details>` : ''}
    <div class="modal-footer">
      ${idrHayIA() ? `<button class="btn btn-danger" onclick="idrBorrarConfig();closeModal();renderIdr();showToast(t('idr.keyRemoved'))">${t('common.delete')}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="idrGuardarDesdeModal()">${t('common.save')}</button>
    </div>
  `);
}
function idrConfigModalRefrescar(){
  const p = idrValorCampo('idr-prov');
  if(p === null) return;
  const def = IDR_PROVEEDORES[p];
  if(!def) return;
  // Al cambiar de proveedor hay que soltar el modelo Y la clave: son de
  // otra casa. Antes solo cambiaba el texto de ayuda, asi que al pasar de
  // Google a Anthropic se seguia enviando el modelo de Google con la clave
  // de Google — y parecia que cambiar de proveedor no servia de nada.
  const campo = document.getElementById('idr-modelo-campo');
  if(campo) campo.innerHTML = `<input type="text" id="idr-modelo" value="" placeholder="${escapeHtml(def.modeloPorDefecto)}">`;
  const k = document.getElementById('idr-clave');
  if(k) k.value = '';
  const res = document.getElementById('idr-test-res');
  if(res) res.innerHTML = `<span style="color:var(--muted)">${escapeHtml(t('idr.providerChanged'))}</span>`;
  const a = document.getElementById('idr-ayuda');
  if(a) a.innerHTML = `${t('idr.keyWhere')} <strong>${escapeHtml(def.ayuda)}</strong>`;
}
function idrGuardarDesdeModal(){
  const p = idrValorCampo('idr-prov');
  const k = idrValorCampo('idr-clave');
  const m = idrValorCampo('idr-modelo');
  if(p === null || k === null) return;
  if(!(k||'').trim()){ showToast(t('idr.keyRequired')); return; }
  idrGuardarConfig(p, k, m);
  closeModal();
  renderIdr();
  showToast(t('idr.keySaved'));
}

/* ── El ADN ── */
function idrAdnModal(){
  const a = idrAdn();
  const campo = c => {
    const v = a[c.k] !== undefined ? String(a[c.k]) : '';
    const id = 'adn-' + c.k;
    const ayuda = c.ayuda ? `<p style="font-size:12px;color:var(--muted);margin:4px 0 0">${escapeHtml(gl(c.ayuda))}</p>` : '';
    const lab = `<label>${escapeHtml(gl(c.l))}${c.unidad?` <span style="color:var(--muted);font-weight:400">(${escapeHtml(c.unidad)})</span>`:''}</label>`;
    if(c.tipo === 'sel'){
      const opts = [{v:'', l:{es:'—',ca:'—',en:'—'}}, ...(c.opts||[])];
      return `<div class="field">${lab}<select id="${id}">${opts.map(o=>`<option value="${escapeHtml(o.v)}"${o.v===v?' selected':''}>${escapeHtml(gl(o.l))}</option>`).join('')}</select>${ayuda}</div>`;
    }
    if(c.tipo === 'area') return `<div class="field">${lab}<textarea id="${id}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}">${escapeHtml(v)}</textarea>${ayuda}</div>`;
    if(c.tipo === 'num') return `<div class="field">${lab}<input type="number" id="${id}" value="${escapeHtml(v)}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}"${c.min!==undefined?` min="${c.min}"`:''}${c.max!==undefined?` max="${c.max}"`:''}>${ayuda}</div>`;
    return `<div class="field">${lab}<input type="text" id="${id}" value="${escapeHtml(v)}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}">${ayuda}</div>`;
  };
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-dna"></i> ${t('idr.dna')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('idr.dnaExplain')}</p>
    ${IDR_ADN_CAMPOS.map(campo).join('')}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="idrGuardarAdn()">${t('common.save')}</button>
    </div>
  `, {xl:true});
}
function idrGuardarAdn(){
  const a = idrAdn();
  IDR_ADN_CAMPOS.forEach(c => {
    const el = document.getElementById('adn-' + c.k);
    if(!el) return;
    const v = (el.value||'').trim();
    if(v === ''){ delete a[c.k]; return; }
    if(c.tipo === 'num'){
      const n = parseFloat(v.replace(',', '.'));
      if(!isFinite(n)){ delete a[c.k]; return; }
      const min = c.min !== undefined ? c.min : -Infinity;
      const max = c.max !== undefined ? c.max : Infinity;
      a[c.k] = Math.min(max, Math.max(min, n));
      return;
    }
    a[c.k] = v;
  });
  saveDB();
  closeModal();
  renderIdr();
  showToast(t('idr.dnaSaved'));
}


/* ============================================================
   MENÚ Y CARTA — de la estructura a los platos, y luego el coste
   ============================================================
   El orden importa y es el que pidió el dueño: primero se define la
   ESTRUCTURA y la lógica del conjunto, después qué platos la componen, y
   solo al final el escandallo. Así el menú tiene sentido como conjunto en
   vez de ser una suma de platos sueltos que salen baratos.

   Se crea una receta por plato (con su coste real) y, si se quiere, la
   carta entera con sus secciones. */

async function idrCrearConjunto(id){
  const c = idrCreacion(id);
  if(!c || (c.tipo !== 'menu' && c.tipo !== 'carta')) return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }

  const pasos = IDR_PASOS[c.tipo];
  const resumen = (c.pasos||[]).map((p, i) => (p && p.elegido && pasos[i]) ? `${gl(pasos[i].l)}: ${p.elegido}` : null).filter(Boolean).join('\n');

  showToast(t('idr.buildingSet'));
  const esMenu = c.tipo === 'menu';
  const instruccion = `Esto es lo que hemos decidido para ${esMenu ? 'el menú' : 'la carta'}:

${resumen}

Ahora concrétalo. Responde SOLO con este JSON:
{"nombre":"nombre del conjunto","logica":"en dos o tres frases, la lógica del conjunto: qué lo hace coherente, cómo se reparten técnicas y bases, y qué se aprovecha entre platos","secciones":[{"nombre":"...","platos":[{"nombre":"...","descripcion":"corta, de carta","ingredientes":[{"nombre":"...","cantidad":120,"unidad":"g"}]}]}]}

Cada plato con su receta para 2 comensales. Aprovecha fondos y mise en place entre platos y no repitas técnicas. Los ingredientes que el negocio no tenga, inclúyelos igual: se marcarán como pendientes de dar de alta.`;

  const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 4000});
  if(!r.ok){ showToast(idrMensajeError(r)); return; }
  idrUltimoFallo = null;
  const j = idrExtraerJson(r.texto);
  if(!j || !Array.isArray(j.secciones)){ showToast(t('idr.err.unreadable')); return; }

  const faltan = [];
  const creados = [];
  const secciones = [];

  j.secciones.forEach(sec => {
    const platosSec = [];
    (sec.platos||[]).forEach(pl => {
      if(!pl || !pl.nombre) return;
      const lineas = [];
      (pl.ingredientes||[]).forEach(ing => {
        const real = idrBuscarIngrediente(ing.nombre);
        const qty = Math.max(0, parseFloat(ing.cantidad) || 0);
        if(real && qty > 0) lineas.push({type:'ingredient', ingredientId: real.id, qty, merma: 0});
        else if(ing.nombre) faltan.push(`${ing.nombre}${ing.cantidad ? ` (${ing.cantidad} ${ing.unidad||''})` : ''} — ${pl.nombre}`);
      });
      const receta = {
        id: genId(), name: String(pl.nombre).slice(0,80), price: 0, priceBase: 0,
        ivaPct: (DB.business && DB.business.ivaPct) || 10,
        comensales: 2, consumiblesPct: 5,
        category: (typeof areaRecipeCategories === 'function' && areaRecipeCategories()[0]) || '',
        ingredients: lineas, allergens: [], area: 'cocina',
        isBase: false, baseYield: 1, baseUnit: 'L',
        steps: '', presentation: String(pl.descripcion || ''),
      };
      DB.recipes.push(receta);
      creados.push(receta);
      platosSec.push({id: genId(), recipeId: receta.id, nombre: receta.name, precio: 0, precioBase: 0, ivaPct: receta.ivaPct, disponible: true, modificadores: []});
    });
    if(platosSec.length) secciones.push({id: genId(), nombre: String(sec.nombre||'').slice(0,60), platos: platosSec});
  });

  if(!creados.length){ showToast(t('idr.err.unreadable')); return; }

  c.logica = String(j.logica || '');
  c.faltan = faltan;
  c.recipeIds = creados.map(x => x.id);
  if(j.nombre) c.titulo = String(j.nombre).slice(0,60);
  c.updatedAt = new Date().toISOString();

  // La carta se crea de verdad, con sus secciones. Un menú se queda en el
  // cuaderno con sus platos ya creados: montarlo como carta es decisión
  // suya, porque un menú del día convive con la carta y no la sustituye.
  if(c.tipo === 'carta'){
    if(!Array.isArray(DB.cartas)) DB.cartas = [];
    const carta = {id: genId(), nombre: (c.titulo || 'NUEVA CARTA').toUpperCase(), tipo:'GENERAL', desde:'', hasta:'', dias:[0,1,2,3,4,5,6], secciones};
    DB.cartas.push(carta);
    c.cartaId = carta.id;
  }
  saveDB();

  // El coste, otra vez, lo pone la app con SUS precios.
  // La app juzga también el conjunto: bases repetidas, carga de servicio y
  // dietas obligatorias. Es lo que no se ve mirando plato a plato.
  const avisos = idrValidarConjunto(creados, {});
  creados.forEach(r2 => { idrValidarPlato(r2, {}).forEach(p2 => { if(!avisos.includes(p2)) avisos.push(p2); }); });
  c.avisos = avisos;
  saveDB();

  const costeTotal = creados.reduce((s, r2) => s + ((typeof recipeCost === 'function') ? recipeCost(r2) : 0), 0);
  showToast(t('idr.setCreated')
    .replace('${n}', creados.length)
    .replace('${coste}', fmtMoney(costeTotal))
    + (faltan.length ? ' ' + t('idr.setMissing').replace('${n}', faltan.length) : ''));
  renderIdr();
}

/* ============================================================
   CARPETAS DEL CUADERNO
   ============================================================
   I+D es un laboratorio: se lanzan hipótesis, muchas no llegan a nada, y
   las que llegan conviene tenerlas juntas ("Carta otoño 2026", "Pruebas de
   brasa"). Sin carpetas, a los dos meses el cuaderno es una lista de
   sesenta cosas sin orden.

   Una creación sin carpeta NO se pierde: vive en "Sin clasificar", que es
   donde caen todas las que nacen. Clasificar es opcional, como debe ser en
   un cuaderno de pruebas. */

function idrCarpetas(){
  if(!DB.idr || typeof DB.idr !== 'object') DB.idr = {};
  if(!Array.isArray(DB.idr.carpetas)) DB.idr.carpetas = [];
  return DB.idr.carpetas;
}
function idrCarpeta(id){ return idrCarpetas().find(c => c.id === id) || null; }

async function idrNuevaCarpeta(){
  const nombre = await promptText(t('idr.folderName'), '', {title: t('idr.newFolder'), icon:'ti-folder-plus'});
  if(nombre === null) return;
  const n = (nombre||'').trim().slice(0, 40);
  if(!n) return;
  if(idrCarpetas().some(c => c.nombre.toLowerCase() === n.toLowerCase())){ showToast(t('idr.folderExists')); return; }
  idrCarpetas().push({id: genId(), nombre: n});
  saveDB();
  renderIdr();
}
async function idrRenombrarCarpeta(id){
  const c = idrCarpeta(id);
  if(!c) return;
  const nombre = await promptText(t('idr.folderName'), c.nombre, {title: t('idr.renameFolder'), icon:'ti-edit'});
  if(nombre === null) return;
  const n = (nombre||'').trim().slice(0, 40);
  if(!n) return;
  c.nombre = n;
  saveDB();
  renderIdr();
}
// Borrar la carpeta NO borra el trabajo: lo devuelve a "Sin clasificar".
// Perder seis pruebas por vaciar una carpeta sería imperdonable.
async function idrBorrarCarpeta(id){
  const c = idrCarpeta(id);
  if(!c) return;
  const dentro = idrCreaciones().filter(x => x.carpetaId === id).length;
  if(!(await confirmModal(t('idr.confirmDeleteFolder').replace('${n}', dentro).replace('${nombre}', c.nombre)))) return;
  idrCreaciones().forEach(x => { if(x.carpetaId === id) delete x.carpetaId; });
  DB.idr.carpetas = idrCarpetas().filter(x => x.id !== id);
  if(idrCarpetaActiva === id) idrCarpetaActiva = null;
  saveDB();
  renderIdr();
}
function idrMoverA(creacionId, carpetaId){
  const c = idrCreacion(creacionId);
  if(!c) return;
  if(carpetaId) c.carpetaId = carpetaId; else delete c.carpetaId;
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

/* ============================================================
   CONOCIMIENTO QUE VIVE EN LA APP (no en la memoria del modelo)
   ============================================================
   Un modelo se sabe la temporada "de memoria", y de memoria se equivoca.
   Escrita aquí es un DATO: no se inventa, no cambia entre consultas y no
   depende de qué proveedor use el cliente. */

// Producto de temporada en España, por mes (1 = enero).
const IDR_TEMPORADA = {
  1:  {verduras:'alcachofa, cardo, col, puerro, acelga, escarola, calçot', frutas:'naranja, mandarina, kiwi, granada', pescados:'bacalao, dorada, lubina, sepia, angula'},
  2:  {verduras:'alcachofa, calçot, guisante, haba, espinaca, coliflor', frutas:'naranja, pomelo, manzana', pescados:'bacalao, rape, sardina, calamar'},
  3:  {verduras:'espárrago, guisante, haba, acelga, ajo tierno', frutas:'fresa, naranja, níspero', pescados:'boquerón, sardina, salmonete, pulpo'},
  4:  {verduras:'espárrago, guisante, haba, alcachofa, rábano', frutas:'fresa, níspero, cereza', pescados:'boquerón, caballa, salmonete, sepia'},
  5:  {verduras:'espárrago, judía verde, calabacín, pepino, cebolla tierna', frutas:'cereza, fresa, albaricoque, nísperos', pescados:'boquerón, atún, sardina, jurel'},
  6:  {verduras:'tomate, pimiento, calabacín, berenjena, judía verde', frutas:'cereza, melocotón, albaricoque, melón, ciruela', pescados:'atún, bonito, sardina, pulpo'},
  7:  {verduras:'tomate, pimiento, berenjena, calabacín, pepino, maíz', frutas:'melón, sandía, melocotón, higo, nectarina', pescados:'bonito, atún, sardina, caballa'},
  8:  {verduras:'tomate, pimiento, berenjena, judía verde, calabaza', frutas:'higo, melón, sandía, uva, ciruela', pescados:'bonito, sardina, jurel, calamar'},
  9:  {verduras:'calabaza, pimiento, berenjena, seta, acelga', frutas:'uva, higo, granada, manzana, membrillo', pescados:'caballa, sepia, pulpo, merluza'},
  10: {verduras:'calabaza, seta, boniato, col, brócoli, cardo', frutas:'granada, membrillo, caqui, castaña, manzana', pescados:'merluza, rape, besugo, calamar'},
  11: {verduras:'seta, alcachofa, col, puerro, coliflor, cardo', frutas:'caqui, granada, castaña, naranja, chirimoya', pescados:'besugo, rape, bacalao, dorada'},
  12: {verduras:'alcachofa, cardo, col lombarda, puerro, escarola', frutas:'naranja, mandarina, chirimoya, granada', pescados:'besugo, bacalao, lubina, gamba'},
};
function idrTemporadaTexto(mes){
  const m = mes || (new Date().getMonth() + 1);
  const d = IDR_TEMPORADA[m];
  if(!d) return '';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `PRODUCTO DE TEMPORADA en ${meses[m-1]} (dato, no lo cambies de memoria):\n- Verduras: ${d.verduras}\n- Frutas: ${d.frutas}\n- Pescados: ${d.pescados}`;
}

// Proporciones clásicas: números que no deberían salir de la memoria de
// nadie. NO incluye nada de conservación (salmueras de curado, fermentos):
// eso está fuera del módulo a propósito.
const IDR_PROPORCIONES = `PROPORCIONES CLÁSICAS (úsalas como referencia, no las cambies):
- Vinagreta: 3 partes de grasa por 1 de ácido.
- Arroz seco: 2 partes de caldo por 1 de arroz. Meloso: 3 a 1. Caldoso: 4 a 1.
- Bechamel media: 100 g de mantequilla + 100 g de harina por litro de leche.
- Pasta fresca al huevo: 1 huevo por cada 100 g de harina.
- Masa de pan corriente: 60-65% de hidratación sobre el peso de harina.
- Mayonesa: 200-250 ml de aceite por yema.
- Puré de patata: 20-25% del peso de la patata en grasa.
- Sal de sazonado: 8-12 g por kilo de género.
- Gelatina en hoja: 6-8 hojas por litro para un cuajado firme.
- Sorbete: 25-30% de azúcar sobre el peso de la fruta.`;

/* ── Ingeniería de menús ──
   Estrellas (se vende y deja margen), caballos de batalla (se vende y deja
   poco), puzles (deja margen pero no se vende) y perros (ni una cosa ni la
   otra). Se calcula con SUS ventas y SUS costes: ningún chat puede hacer
   esto porque hacen falta sus datos.

   Sin ventas suficientes NO se calcula: es preferible callar a opinar
   sobre una tendencia sacada de tres tickets. */
function idrIngenieriaMenu(){
  const ventas = DB.ventas || [];
  if(ventas.length < IDR_MIN_VENTAS) return null;
  const datos = {};
  ventas.forEach(v => (v.items||[]).forEach(it => {
    if(!it || it.isShipping || it.bebida || !it.name) return;
    const d = datos[it.name] || (datos[it.name] = {uds:0, ingreso:0, coste:0});
    const q = parseFloat(it.qty) || 0;
    d.uds += q;
    d.ingreso += (parseFloat(it.price)||0) * q;
    if(it.costeUnitario != null) d.coste += (parseFloat(it.costeUnitario)||0) * q;
  }));
  const nombres = Object.keys(datos);
  if(nombres.length < 4) return null;
  const totalUds = nombres.reduce((s,n) => s + datos[n].uds, 0);
  if(!totalUds) return null;
  // Un plato "se vende" si supera el 70% de lo que le tocaría en un reparto
  // equitativo: es el criterio habitual de la ingeniería de menús.
  const umbralUds = (totalUds / nombres.length) * 0.7;
  const margenes = nombres.map(n => datos[n].ingreso - datos[n].coste);
  const margenMedio = margenes.reduce((a,b)=>a+b,0) / nombres.length;
  const grupos = {estrella:[], caballo:[], puzle:[], perro:[]};
  nombres.forEach(n => {
    const d = datos[n];
    const vende = d.uds >= umbralUds;
    const margen = (d.ingreso - d.coste) >= margenMedio;
    const g = vende ? (margen ? 'estrella' : 'caballo') : (margen ? 'puzle' : 'perro');
    grupos[g].push(n);
  });
  return grupos;
}
function idrIngenieriaTexto(){
  const g = idrIngenieriaMenu();
  if(!g) return '';
  const l = (k, etiqueta) => g[k].length ? `- ${etiqueta}: ${g[k].slice(0,8).join(', ')}` : '';
  return ['INGENIERÍA DE MENÚ (calculada con SUS ventas y SUS costes, es un dato):',
    l('estrella','Estrellas (se venden y dejan margen: mantener y dar visibilidad)'),
    l('caballo','Caballos de batalla (se venden pero dejan poco: subir margen sin tocar el precio)'),
    l('puzle','Puzles (dejan margen pero no se venden: renombrar, recolocar o explicar mejor)'),
    l('perro','Perros (ni se venden ni dejan: candidatos a salir de la carta)'),
  ].filter(Boolean).join('\n');
}

/* ============================================================
   LA APP JUZGA AL MODELO
   ============================================================
   Esto es lo que ningún chat puede hacer, porque hace falta la base de
   datos del negocio. El modelo propone; aquí se comprueba EN FRÍO contra
   sus datos, y lo que falla vuelve para que lo corrija.

   Todas las comprobaciones son deterministas: no opinan, miden. Por eso se
   pueden probar y por eso son fiables. */

// Técnicas que necesitan un equipo concreto. Si el ADN dice que no lo
// tiene, proponerla es perder el tiempo del cocinero.
/* Solo se avisa de técnicas que piden un aparato ESPECIAL. Antes también
   estaban la plancha, la fritura y la brasa, y saltaba el aviso en cuanto el
   hostelero no las había escrito una por una en su ADN: "usa plancha y tu
   equipamiento no lo permite" en una cocina que evidentemente tiene plancha.
   Un aviso falso es peor que ninguno — enseña a ignorarlos, y el día que
   salte uno de verdad tampoco se leerá. El campo del ADN es una descripción,
   no un inventario cerrado: lo único que se puede afirmar de él es lo que
   NIEGA expresamente ("sin Roner"). */
const IDR_TECNICAS_EQUIPO = [
  {tecnica:'baja temperatura', equipos:['roner','sous','vacío','circulador','termocirculador']},
  {tecnica:'sous-vide', equipos:['roner','sous','vacío','circulador']},
  {tecnica:'deshidratad', equipos:['deshidratador']},
  {tecnica:'esferificación', equipos:['esferific','alginato','jeringa']},
  {tecnica:'nitrógeno', equipos:['nitrógeno']},
  {tecnica:'ahumad', equipos:['ahumador','pistola']},
  {tecnica:'abatid', equipos:['abatidor']},
  {tecnica:'sifón', equipos:['sifón','isi']},
  {tecnica:'pacojet', equipos:['pacojet']},
  {tecnica:'liofiliz', equipos:['liofiliz']},
];

/* ⚠️ "Horno y brasa. SIN Roner ni deshidratador" CONTIENE la palabra
   "Roner", así que buscarla a secas daba por bueno justo lo contrario de lo
   que dice el ADN. Se parte el texto en trozos y los que van detrás de un
   "sin" cuentan como lo que NO se tiene. */
// ¿El ADN dice EXPRESAMENTE que no tiene este aparato? ("Sin Roner ni
// deshidratador"). Es lo único que se puede dar por cierto de un campo que
// es una descripción libre, no un inventario.
function idrEquipoNegado(equipamiento, equipos){
  const trozos = String(equipamiento||'').split(/[.,;\n]/);
  return trozos.some(trozo => {
    const tn = idrNormalizar(trozo);
    if(!/(^|\s)(sin|no)\s/.test(' ' + tn)) return false;
    return equipos.some(e => tn.includes(idrNormalizar(e)));
  });
}

function idrTieneEquipo(equipamiento, equipos){
  const trozos = String(equipamiento||'').split(/[.,;\n]|\by\b/i);
  let tiene = false, negado = false;
  trozos.forEach(trozo => {
    const tn = idrNormalizar(trozo);
    if(!tn.trim()) return;
    const esNegado = /(^|\s)(sin|no)\s/.test(' ' + tn);
    const mencionado = equipos.some(e => tn.includes(idrNormalizar(e)));
    if(!mencionado) return;
    if(esNegado) negado = true; else tiene = true;
  });
  // `tiene` solo se pone a true en un trozo NO negado, así que basta con él;
  // `negado` queda para que se lea por qué existe la distinción.
  return tiene && !negado ? true : tiene;
}

function idrNormalizar(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

/* Comprueba UN plato contra el ADN y los datos del negocio.
   Devuelve una lista de problemas en cristiano, vacía si todo cuadra. */
/* El objetivo de food cost tiene dos fuentes y un orden claro: el del ENCARGO
   manda sobre el del ADN. El ADN es lo que la casa busca en general; el
   encargo es lo que se busca en ESTE plato o en ESTA carta, y es más
   reciente y más concreto. Sin este orden, el hostelero pedía un 28% y la
   app le decía que iba bien porque su ADN dice 35%. */
function idrObjetivoFoodCost(c){
  const delEncargo = c ? parseFloat(idrEncargo(c).foodCost) : NaN;
  if(isFinite(delEncargo) && delEncargo > 0) return delEncargo;
  return parseFloat(idrAdn().foodCostObjetivo);
}

/* Revisa el conjunto como conjunto. Un menú se cuesta entero por comensal;
   una carta, plato a plato contra su precio medio. */
function idrRevisarConjunto(c, recetas){
  const avisos = [];
  const e = idrEncargo(c);
  const objetivo = idrObjetivoFoodCost(c);
  if(!(e.pvp > 0) || !isFinite(objetivo) || objetivo <= 0) return avisos;
  const coste = recetas.reduce((sum, r) => sum + ((typeof recipeCost === 'function') ? recipeCost(r) : 0), 0);
  if(c.tipo === 'menu'){
    const pct = (coste / e.pvp) * 100;
    if(pct > objetivo + 2) avisos.push(t('idr.check.menuCost').replace('${coste}', fmtMoney(coste)).replace('${pct}', pct.toFixed(1)).replace('${obj}', objetivo));
    else if(pct < objetivo / 2) avisos.push(t('idr.check.menuCostLow').replace('${coste}', fmtMoney(coste)).replace('${pct}', pct.toFixed(1)).replace('${obj}', objetivo));
  }
  // Falten los platos que falten respecto a lo pedido, hay que decirlo: la
  // estructura la fijó el negocio y una carta a medias no se puede publicar.
  const pedidos = idrTotalPlatos(c);
  if(pedidos && recetas.length < pedidos) avisos.push(t('idr.check.fewDishes').replace('${n}', recetas.length).replace('${pedidos}', pedidos));
  return avisos;
}

function idrValidarPlato(receta, opciones){
  const o = opciones || {};
  const a = idrAdn();
  const problemas = [];
  if(!receta) return problemas;

  // 1) Food cost contra el objetivo del ADN. El coste sale del escandallo,
  //    con sus precios: es el número real, no una estimación del modelo.
  const objetivo = idrObjetivoFoodCost(o.creacion || idrCreacion(idrCreacionActiva));
  const coste = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  const pvp = parseFloat(receta.price) || 0;
  if(isFinite(objetivo) && objetivo > 0 && pvp > 0){
    const pct = (coste / pvp) * 100;
    if(pct > objetivo + 2) problemas.push(t('idr.check.foodCost').replace('${pct}', pct.toFixed(1)).replace('${obj}', objetivo));
    /* Y también MUY por debajo. Un plato al 5% cuando el objetivo es el 30%
       no es una buena noticia: o la ración se ha quedado corta, o falta media
       receta, o se está cobrando un precio que el plato no sostiene. La app
       solo miraba el exceso, así que este caso pasaba callado — y en la
       simulación salieron cuatro platos así seguidos. */
    else if(pct > 0 && pct < objetivo / 2) problemas.push(t('idr.check.foodCostLow').replace('${pct}', pct.toFixed(1)).replace('${obj}', objetivo));
  }

  // 2) Técnicas que su cocina no puede hacer.
  if(a.equipamiento){
    const texto = idrNormalizar((o.textoLibre||'') + ' ' + (receta.steps||'') + ' ' + (receta.presentation||''));
    IDR_TECNICAS_EQUIPO.forEach(({tecnica, equipos}) => {
      if(!texto.includes(idrNormalizar(tecnica))) return;
      // Solo se avisa si el ADN lo NIEGA expresamente. No tenerlo escrito no
      // significa no tenerlo, y suponer lo contrario llena la ficha de avisos
      // falsos que acaban ignorándose todos.
      if(idrEquipoNegado(a.equipamiento, equipos)) problemas.push(t('idr.check.equipment').replace('${tecnica}', tecnica));
    });
  }

  // 3) Alérgenos: los del plato salen de SUS ingredientes, no del modelo.
  const dietas = idrNormalizar(a.dietas);
  if(dietas){
    const alg = (typeof recipeComputedAllergens === 'function') ? recipeComputedAllergens(receta) : [];
    const algN = alg.map(idrNormalizar);
    if((dietas.includes('gluten') || dietas.includes('celia')) && algN.includes('gluten'))
      problemas.push(t('idr.check.gluten'));
    if(dietas.includes('vegetarian')){
      const carnico = (receta.ingredients||[]).some(l => {
        const ing = l.ingredientId ? getIngredient(l.ingredientId) : null;
        const cat = idrNormalizar(ing && ing.category);
        return cat.includes('carne') || cat.includes('pescado') || cat.includes('embutido');
      });
      if(carnico && o.exigirVegetariano) problemas.push(t('idr.check.vegetarian'));
    }
  }

  // 4) Temporada: se compara con el calendario de la app, no con la memoria
  //    del modelo. Solo si el negocio dice trabajar temporada.
  const producto = idrNormalizar(a.producto);
  if(producto.includes('temporada') || producto.includes('mercado')){
    const mes = o.mes || (new Date().getMonth() + 1);
    const dTemp = IDR_TEMPORADA[mes];
    if(dTemp){
      const enTemporada = idrNormalizar(`${dTemp.verduras}, ${dTemp.frutas}, ${dTemp.pescados}`);
      const fuera = (receta.ingredients||[]).map(l => {
        const ing = l.ingredientId ? getIngredient(l.ingredientId) : null;
        const cat = idrNormalizar(ing && ing.category);
        if(!ing || !(cat.includes('verdura') || cat.includes('fruta') || cat.includes('pescado'))) return null;
        const n = idrNormalizar(ing.name);
        // Un ingrediente cuenta como de temporada si su nombre aparece en el
        // calendario del mes (singular o plural).
        const raiz = n.replace(/s$/, '');
        return enTemporada.includes(raiz) ? null : ing.name;
      }).filter(Boolean);
      if(fuera.length) problemas.push(t('idr.check.season').replace('${lista}', fuera.join(', ')));
    }
  }

  return problemas;
}

/* Comprueba un CONJUNTO (menú o carta): lo que no se ve mirando plato a
   plato y es justo lo que hace que una carta esté bien construida. */
function idrValidarConjunto(recetas, opciones){
  const o = opciones || {};
  const a = idrAdn();
  const problemas = [];
  if(!recetas || !recetas.length) return problemas;

  // 1) Bases repetidas: si el mismo ingrediente principal está en media
  //    carta, la carta es más pobre de lo que parece.
  const cuenta = {};
  recetas.forEach(r => {
    const principal = (r.ingredients||[])
      .map(l => ({l, ing: l.ingredientId ? getIngredient(l.ingredientId) : null}))
      .filter(x => x.ing)
      .sort((x,y) => (y.l.qty||0) - (x.l.qty||0))[0];
    if(principal) cuenta[principal.ing.name] = (cuenta[principal.ing.name]||0) + 1;
  });
  Object.keys(cuenta).forEach(n => {
    if(cuenta[n] > Math.max(2, Math.ceil(recetas.length / 3)))
      problemas.push(t('idr.check.repeatedBase').replace('${ing}', n).replace('${n}', cuenta[n]));
  });

  // 2) Carga de servicio contra la gente que hay en partida.
  const equipo = String(a.equipo||'').match(/\d+/);
  const nCocineros = equipo ? parseInt(equipo[0]) : 0;
  if(nCocineros > 0 && o.alMomento != null && o.alMomento > nCocineros * 3)
    problemas.push(t('idr.check.serviceLoad').replace('${n}', o.alMomento).replace('${cocineros}', nCocineros));

  // 3) Dietas obligatorias cubiertas en el conjunto.
  const dietas = idrNormalizar(a.dietas);
  if(dietas.includes('vegetarian')){
    const hayVeg = recetas.some(r => !(r.ingredients||[]).some(l => {
      const ing = l.ingredientId ? getIngredient(l.ingredientId) : null;
      const cat = idrNormalizar(ing && ing.category);
      return cat.includes('carne') || cat.includes('pescado') || cat.includes('embutido');
    }));
    if(!hayVeg) problemas.push(t('idr.check.noVeg'));
  }
  if(dietas.includes('gluten') || dietas.includes('celia')){
    const haySinGluten = recetas.some(r => {
      const alg = (typeof recipeComputedAllergens === 'function') ? recipeComputedAllergens(r) : [];
      return !alg.map(idrNormalizar).includes('gluten');
    });
    if(!haySinGluten) problemas.push(t('idr.check.noGlutenFree'));
  }

  return problemas;
}
