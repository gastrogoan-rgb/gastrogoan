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
// Tope duro de llamadas por día y dispositivo. El que paga es el cliente,
// así que nada puede engancharse consumiendo su cuota sin que se vea.
const IDR_TOPE_DIA = 120;

const IDR_PROVEEDORES = {
  google: {
    l:{es:'Google (Gemini)',ca:'Google (Gemini)',en:'Google (Gemini)'},
    modeloPorDefecto: 'gemini-2.0-flash',
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
  try{
    res = await fetch(def.url(modelo, cfg.clave), {
      method:'POST',
      headers: def.cabeceras(cfg.clave),
      body: JSON.stringify(def.cuerpo(sistema, mensajes, maxTokens, modelo)),
    });
  }catch(e){
    // fetch solo revienta así si no salió del dispositivo: sin cobertura,
    // o el navegador bloqueó la llamada.
    return {ok:false, motivo:'sin-conexion', detalle:e.message};
  }
  if(!res.ok){
    let detalle = '';
    try{ detalle = (await res.text()).slice(0, 300); }catch(e){}
    if(res.status === 401 || res.status === 403) return {ok:false, motivo:'clave-mala', detalle};
    if(res.status === 429) return {ok:false, motivo:'cuota', detalle};
    return {ok:false, motivo:'proveedor', detalle: `HTTP ${res.status} ${detalle}`};
  }
  let j;
  try{ j = await res.json(); }catch(e){ return {ok:false, motivo:'proveedor', detalle:'respuesta ilegible'}; }
  const texto = def.extraer(j);
  if(!texto) return {ok:false, motivo:'vacia'};
  return {ok:true, texto};
}

const IDR_MOTIVO_KEYS = {
  'sin-clave':'idr.err.noKey', 'tope':'idr.err.limit', 'sin-conexion':'idr.err.offline',
  'clave-mala':'idr.err.badKey', 'cuota':'idr.err.quota', 'proveedor':'idr.err.provider',
  'vacia':'idr.err.empty',
};
function idrMensajeError(r){
  return t(IDR_MOTIVO_KEYS[r && r.motivo] || 'idr.err.provider');
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
   Lo que evita que a una casa de comidas catalana le proponga un ramen en
   vez de una escudella. Se rellena una vez, se edita cuando cambia el
   negocio, y entra en CADA generación. */

const IDR_ADN_CAMPOS = [
  {k:'cocina', tipo:'text', l:{es:'Cocina y tradición',ca:'Cuina i tradició',en:'Cuisine and tradition'},
   ph:{es:'Ej. Catalana de mercado con toques de brasa',ca:'Ex. Catalana de mercat amb tocs de brasa',en:'e.g. Catalan market cooking with grill accents'},
   ayuda:{es:'La línea maestra. Es lo que más pesa en todo lo que se proponga.',ca:'La línia mestra. És el que més pesa en tot el que es proposi.',en:'The guiding line. It weighs most on everything proposed.'}},
  {k:'nivel', tipo:'sel', l:{es:'Nivel de la casa',ca:'Nivell de la casa',en:'Level'}, opts:[
    {v:'Casa de comidas', l:{es:'Casa de comidas',ca:'Casa de menjars',en:'Home-style eatery'}},
    {v:'Bistró', l:{es:'Bistró / cocina de mercado',ca:'Bistró / cuina de mercat',en:'Bistro / market cooking'}},
    {v:'Gastronómico', l:{es:'Gastronómico',ca:'Gastronòmic',en:'Fine dining'}},
    {v:'Tapas', l:{es:'Tapas y raciones',ca:'Tapes i racions',en:'Tapas and sharing plates'}},
    {v:'Casual', l:{es:'Casual / informal',ca:'Casual / informal',en:'Casual'}},
  ]},
  {k:'insignia', tipo:'area', l:{es:'Producto insignia',ca:'Producte insígnia',en:'Signature product'},
   ph:{es:'Lo que no puede faltar nunca en esta casa',ca:'El que no pot faltar mai en aquesta casa',en:'What must never be missing here'}},
  {k:'lineasRojas', tipo:'area', l:{es:'Líneas rojas',ca:'Línies vermelles',en:'Red lines'},
   ph:{es:'Lo que en esta casa NO se hace nunca',ca:'El que en aquesta casa NO es fa mai',en:'What is never done here'},
   ayuda:{es:'Tan importante como lo anterior: marca lo que no se debe proponer.',ca:'Tan important com l\'anterior: marca el que no s\'ha de proposar.',en:'As important as the above: it marks what must not be proposed.'}},
  {k:'publico', tipo:'text', l:{es:'Público',ca:'Públic',en:'Clientele'},
   ph:{es:'Ej. Barrio y oficinas entre semana',ca:'Ex. Barri i oficines entre setmana',en:'e.g. Locals and offices on weekdays'}},
  {k:'foodCostObjetivo', tipo:'num', unidad:'%', min:0, max:100, l:{es:'Food cost objetivo',ca:'Food cost objectiu',en:'Target food cost'},
   ph:{es:'Ej. 30',ca:'Ex. 30',en:'e.g. 30'}},
  {k:'equipamiento', tipo:'area', l:{es:'Equipamiento',ca:'Equipament',en:'Equipment'},
   ph:{es:'Ej. Horno mixto, brasa, abatidor. Sin Roner ni deshidratador',ca:'Ex. Forn mixt, brasa, abatedor. Sense Roner ni deshidratador',en:'e.g. Combi oven, grill, blast chiller. No sous-vide or dehydrator'},
   ayuda:{es:'Sin esto puede proponerte técnicas que no puedes hacer.',ca:'Sense això pot proposar-te tècniques que no pots fer.',en:'Without this it may propose techniques you cannot do.'}},
  {k:'equipo', tipo:'text', l:{es:'Equipo en partida',ca:'Equip a partida',en:'Kitchen brigade'},
   ph:{es:'Ej. 2 cocineros y un ayudante',ca:'Ex. 2 cuiners i un ajudant',en:'e.g. 2 cooks and one helper'},
   ayuda:{es:'Limita cuántos platos pueden pedir trabajo al momento.',ca:'Limita quants plats poden demanar feina al moment.',en:'Limits how many dishes can need à la minute work.'}},
  {k:'producto', tipo:'sel', l:{es:'Producto',ca:'Producte',en:'Sourcing'}, opts:[
    {v:'Mercado y temporada', l:{es:'Mercado y temporada',ca:'Mercat i temporada',en:'Market and seasonal'}},
    {v:'Proximidad', l:{es:'Proximidad / km 0',ca:'Proximitat / km 0',en:'Local / farm to table'}},
    {v:'Carta fija', l:{es:'Carta fija todo el año',ca:'Carta fixa tot l\'any',en:'Fixed menu year-round'}},
    {v:'Mixto', l:{es:'Mixto',ca:'Mixt',en:'Mixed'}},
  ]},
  {k:'dietas', tipo:'text', l:{es:'Dietas obligatorias',ca:'Dietes obligatòries',en:'Required diets'},
   ph:{es:'Ej. Siempre una opción vegetariana y una sin gluten',ca:'Ex. Sempre una opció vegetariana i una sense gluten',en:'e.g. Always a vegetarian and a gluten-free option'}},
  {k:'idiomaPlatos', tipo:'text', l:{es:'Idioma de los platos',ca:'Idioma dels plats',en:'Language of dish names'},
   ph:{es:'Ej. Catalán',ca:'Ex. Català',en:'e.g. Catalan'}},
];

function idrAdn(){
  if(!DB.idr || typeof DB.idr !== 'object') DB.idr = {};
  // Firebase no guarda objetos vacíos: puede volver sin adn.
  if(!DB.idr.adn || typeof DB.idr.adn !== 'object') DB.idr.adn = {};
  return DB.idr.adn;
}
function idrAdnRelleno(){
  const a = idrAdn();
  return IDR_ADN_CAMPOS.some(c => a[c.k] !== undefined && String(a[c.k]).trim() !== '');
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

function idrContextoNegocio(){
  const partes = [];
  const adn = idrAdnTexto();
  if(adn) partes.push('ADN GASTRONÓMICO DE LA CASA (manda sobre todo lo demás):\n' + adn);
  else partes.push('ADN GASTRONÓMICO: sin definir. Avisa de que las propuestas serán genéricas y ofrece rellenarlo.');
  const ings = idrIngredientesTexto();
  if(ings) partes.push('INGREDIENTES QUE YA COMPRA, con su precio real:\n' + ings);
  const carta = idrCartaTexto();
  if(carta) partes.push('YA TIENE EN CARTA (no lo repitas salvo que se pida una variante):\n' + carta);
  const ventas = idrVentasTexto();
  if(ventas) partes.push('VENTAS:\n' + ventas);
  else partes.push('VENTAS: no hay datos suficientes. No opines sobre qué se vende.');
  return partes.join('\n\n');
}

/* ============================================================
   LAS INSTRUCCIONES DEL ASISTENTE
   ============================================================
   Aquí vive lo que separa esto de un chat tonto. Las reglas de honestidad
   son literales y van primero, porque el fallo más caro de un modelo no es
   no saber: es inventarse algo con aplomo y que un cocinero se lo crea. */

const IDR_REGLAS = `Eres el asistente de I+D de una cocina profesional. Ayudas a crear platos, menús y cartas PARA ESTE RESTAURANTE CONCRETO.

REGLAS QUE NO SE ROMPEN NUNCA:

1. NO INVENTES. Si no conoces bien un plato, una técnica o una tradición regional, DILO y pide ayuda: "no conozco bien ese plato, ¿me lo describes o me pegas una receta de referencia y trabajo sobre ella?". Es mejor preguntar que rellenar el hueco con algo verosímil. No puedes buscar en internet por tu cuenta: si necesitas una fuente, pide que te peguen el texto.

2. LOS NÚMEROS NO LOS PONES TÚ. El coste, el food cost y el margen los calcula la aplicación con los precios reales del negocio. Puedes decir si algo te parece caro o barato, pero nunca des una cifra de coste como si fuera un dato.

3. USA SUS INGREDIENTES. Trabaja con los que ya compra. Si necesitas algo que no tiene, márcalo aparte y di claramente que habría que comprarlo.

4. RESPETA SU ADN. La cocina, el nivel de la casa y sobre todo sus LÍNEAS ROJAS mandan sobre cualquier idea tuya. Si te piden algo que choca con su ADN, dilo antes de proponerlo.

5. RESPETA SU COCINA REAL. No propongas técnicas que su equipamiento no permite, ni platos que su equipo no pueda sacar en servicio.

6. DISTINGUE TRADICIÓN DE INVENCIÓN. Di cuándo algo es un clásico y cuándo es una adaptación tuya.

7. SIN DATOS, NO OPINAS. Si no hay ventas suficientes, no hables de lo que se vende.

8. CONSERVACIÓN FUERA. No des tiempos ni temperaturas de conservación, fermentación, envasado al vacío, curados ni conservas: es seguridad alimentaria y no es tu terreno. Si sale el tema, dilo y remite al APPCC del negocio.

CÓMO TRABAJAS: paso a paso, un paso corto cada vez. En cada uno propones DOS O TRES caminos con el motivo de cada uno, para que el cocinero elija; no impones uno solo. Hablas como un jefe de partida: claro, sin florituras y sin darle lecciones a alguien que lleva años en esto.`;

function idrSistema(extra){
  return IDR_REGLAS + '\n\n' + idrContextoNegocio() + (extra ? '\n\n' + extra : '');
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
  return DB.idr.creaciones;
}
function idrCreacion(id){ return idrCreaciones().find(c => c.id === id) || null; }

// Los pasos de cada tipo. Añadir un paso es añadir una entrada: el guion
// del asistente sale de aquí, no está escrito a mano en ningún sitio.
const IDR_PASOS = {
  plato: [
    {k:'base', l:{es:'Producto base',ca:'Producte base',en:'Base product'}, p:'¿De qué producto partimos? Propón 3 opciones de temporada coherentes con su ADN, o trabaja sobre la que te diga.'},
    {k:'tecnica', l:{es:'Técnica principal',ca:'Tècnica principal',en:'Main technique'}, p:'¿Cómo tratamos el producto base elegido? Propón 3 técnicas posibles CON SU EQUIPAMIENTO, di qué aporta cada una.'},
    {k:'salsa', l:{es:'Salsa o fondo',ca:'Salsa o fons',en:'Sauce or stock'}, p:'Propón 3 salsas o fondos que acompañen, coherentes con la casa.'},
    {k:'guarnicion', l:{es:'Guarnición',ca:'Guarnició',en:'Garnish'}, p:'Propón 3 guarniciones. Ten en cuenta la carga de trabajo en servicio.'},
    {k:'acabado', l:{es:'Acabado y emplatado',ca:'Acabat i emplatat',en:'Finish and plating'}, p:'Propón 3 formas de acabar y emplatar el plato.'},
    {k:'nombre', l:{es:'Nombre de carta',ca:'Nom de carta',en:'Menu name'}, p:'Propón 3 nombres para la carta, en el idioma de la casa, y una descripción corta para cada uno.'},
  ],
  menu: [
    {k:'formato', l:{es:'Formato',ca:'Format',en:'Format'}, p:'¿Menú tradicional (coste y rotación) o degustación (progresión)? Explica en una línea qué cambia y pregunta cuál quiere.'},
    {k:'estructura', l:{es:'Estructura',ca:'Estructura',en:'Structure'}, p:'Propón 3 estructuras posibles: cuántos platos y de qué tipo.'},
    {k:'platos', l:{es:'Los platos',ca:'Els plats',en:'The dishes'}, p:'Propón los platos del menú. Aprovecha fondos y mise en place entre ellos, y no repitas técnicas.'},
    {k:'cierre', l:{es:'Postre y cierre',ca:'Postres i tancament',en:'Dessert and close'}, p:'Propón 3 cierres para el menú.'},
  ],
  carta: [
    {k:'secciones', l:{es:'Secciones',ca:'Seccions',en:'Sections'}, p:'Propón 3 estructuras de secciones y cuántos platos en cada una.'},
    {k:'reparto', l:{es:'Reparto de técnicas',ca:'Repartiment de tècniques',en:'Technique spread'}, p:'Propón cómo repartir bases y técnicas para que no vaya todo al horno ni todo lleve la misma crema.'},
    {k:'platos', l:{es:'Los platos',ca:'Els plats',en:'The dishes'}, p:'Propón los platos sección a sección, cubriendo las dietas obligatorias de su ADN.'},
    {k:'servicio', l:{es:'Carga de servicio',ca:'Càrrega de servei',en:'Service load'}, p:'Revisa cuántos platos exigen trabajo al momento y si su equipo puede sacarlo. Ajusta lo que haga falta.'},
  ],
};

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

function navIdr(vista, id){
  idrVista = vista;
  idrCreacionActiva = id || null;
  renderIdr();
}

function renderIdr(){
  const box = document.getElementById('view-idr');
  if(!box) return;
  if(idrVista === 'creacion' && idrCreacion(idrCreacionActiva)){ renderIdrCreacion(box); return; }
  idrVista = 'inicio';

  const adnOk = idrAdnRelleno();
  const iaOk = idrHayIA();
  const creaciones = idrCreaciones().slice().sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''));

  const burbuja = (tipo, icono, titulo, desc) => `
    <div class="card" style="cursor:pointer;text-align:center;padding:22px 16px" onclick="idrEmpezar('${tipo}')">
      <i class="ti ${icono}" style="font-size:34px;color:var(--brand-orange)"></i>
      <h3 style="justify-content:center;margin:10px 0 4px">${titulo}</h3>
      <p style="font-size:12.5px;color:var(--muted);margin:0">${desc}</p>
    </div>`;

  box.innerHTML = `
    <div class="view-header">
      <div>
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
        ${iaOk ? `<button class="btn btn-sm" onclick="idrAdnBorrador()"><i class="ti ti-wand"></i> ${t('idr.dnaDraft')}</button>` : ''}
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:14px">
      ${burbuja('plato','ti-tools-kitchen-2', t('idr.newDish'), t('idr.newDishDesc'))}
      ${burbuja('menu','ti-list-numbers', t('idr.newMenu'), t('idr.newMenuDesc'))}
      ${burbuja('carta','ti-book', t('idr.newCarta'), t('idr.newCartaDesc'))}
    </div>

    <h3 class="cat-heading">${t('idr.myWork')}</h3>
    ${creaciones.length ? `<div class="grid grid-2">` + creaciones.map(c => `
      <div class="card card-compact" style="cursor:pointer" onclick="navIdr('creacion', ${c.id})">
        <h3 style="justify-content:space-between"><span style="overflow:visible;white-space:normal"><i class="ti ${c.tipo==='plato'?'ti-tools-kitchen-2':(c.tipo==='menu'?'ti-list-numbers':'ti-book')}"></i> ${escapeHtml(c.titulo || t('idr.untitled'))}</span></h3>
        <p style="font-size:12px;color:var(--muted);margin:2px 0 8px">${idrProgresoTexto(c)}</p>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();navIdr('creacion', ${c.id})"><i class="ti ti-arrow-right"></i> ${t('idr.continue')}</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="event.stopPropagation();idrBorrarCreacion(${c.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('') + `</div>` : `<div class="empty"><i class="ti ti-flask"></i>${t('idr.noWorkYet')}</div>`}
  `;
}

function idrAdnResumen(){
  const a = idrAdn();
  return [a.cocina, a.nivel, a.publico].filter(Boolean).join(' · ');
}
function idrProgresoTexto(c){
  const total = (IDR_PASOS[c.tipo]||[]).length;
  const hechos = (c.pasos||[]).filter(p => p && p.elegido).length;
  return `${t('idr.step')} ${Math.min(hechos+1, total)}/${total}`;
}

// Sin IA se puede empezar igual: los pasos se rellenan a mano. La IA es el
// ayudante, no el soporte.
function idrEmpezar(tipo){
  if(!IDR_PASOS[tipo]) return;
  if(!idrAdnRelleno() && !(DB.idr && DB.idr.avisoAdnVisto)){
    DB.idr.avisoAdnVisto = true;
    saveDB();
    showToast(t('idr.dnaFirstHint'));
  }
  const c = idrNuevaCreacion(tipo);
  navIdr('creacion', c.id);
}

/* ============================================================
   EL PASO A PASO
   ============================================================
   Un paso corto cada vez. En cada uno el asistente propone dos o tres
   caminos CON SU MOTIVO, y el cocinero elige o escribe el suyo: elegir es
   más fácil que inventar, y el criterio se queda donde tiene que estar.

   Volver atrás borra lo que dependía de ese paso y respeta lo anterior,
   en vez de tirar la conversación entera. */

function renderIdrCreacion(box){
  const c = idrCreacion(idrCreacionActiva);
  if(!c){ navIdr('inicio'); return; }
  const pasos = IDR_PASOS[c.tipo] || [];
  const iaOk = idrHayIA();

  const hechos = pasos.map((def, i) => {
    const p = (c.pasos||[])[i];
    if(!p || !p.elegido) return null;
    return `
      <div class="list-row">
        <div class="list-row-name"><span><strong>${escapeHtml(gl(def.l))}:</strong> ${escapeHtml(p.elegido)}</span></div>
        <button class="owner-only btn btn-sm btn-icon" onclick="idrVolverA(${i})" title="${t('idr.redoFromHere')}"><i class="ti ti-arrow-back-up"></i></button>
      </div>`;
  }).filter(Boolean).join('');

  const i = c.pasoActual;
  const defActual = pasos[i];
  const pActual = (c.pasos||[])[i] || {};
  const terminado = i >= pasos.length;

  box.innerHTML = `
    <div class="view-header">
      <div>
        <button class="btn btn-sm btn-back" onclick="navIdr('inicio')"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
        <h2>${escapeHtml(c.titulo || t('idr.untitled'))}</h2>
        <p class="view-sub">${idrProgresoTexto(c)}</p>
      </div>
    </div>

    ${hechos ? `<div class="card"><h3><i class="ti ti-checks"></i> ${t('idr.decided')}</h3>${hechos}</div>` : ''}

    ${terminado ? `
      <div class="card">
        <h3><i class="ti ti-flag-check"></i> ${t('idr.done')}</h3>
        <p style="font-size:13px;color:var(--muted)">${t('idr.doneBody')}</p>
        ${c.tipo === 'plato' ? `<button class="owner-only btn btn-primary" onclick="idrCrearPlatoReal(${c.id})"><i class="ti ti-plus"></i> ${t('idr.createDish')}</button>` : ''}
        <button class="btn" onclick="idrImprimir(${c.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
      </div>
    ` : `
      <div class="card">
        <h3><i class="ti ti-message-circle"></i> ${escapeHtml(gl(defActual.l))}</h3>

        ${pActual.texto ? `<div style="white-space:pre-wrap;font-size:13.5px;line-height:1.5;margin-bottom:12px">${escapeHtml(pActual.texto)}</div>` : ''}

        ${Array.isArray(pActual.opciones) && pActual.opciones.length ? `
          <div class="grid grid-3" style="margin-bottom:12px">
            ${pActual.opciones.map((o, oi) => `
              <div class="card card-compact" style="cursor:pointer" onclick="idrElegir(${oi})">
                <h3 style="font-size:14px"><span style="overflow:visible;white-space:normal">${escapeHtml(o.titulo||'')}</span></h3>
                <p style="font-size:12px;color:var(--muted);margin:4px 0 0">${escapeHtml(o.motivo||'')}</p>
              </div>`).join('')}
          </div>` : ''}

        ${!pActual.texto && iaOk ? `
          <button class="btn btn-primary" id="idr-pedir" onclick="idrPedirPaso()"><i class="ti ti-sparkles"></i> ${t('idr.askAssistant')}</button>
          <span style="font-size:12px;color:var(--muted);margin-left:10px">${t('idr.callsLeft').replace('${n}', idrQuedanLlamadas())}</span>
        ` : ''}
        ${!iaOk ? `<p style="font-size:12.5px;color:var(--muted)">${t('idr.manualHint')}</p>` : ''}

        <div class="field" style="margin-top:12px">
          <label>${t('idr.orWriteYours')}</label>
          <textarea id="idr-libre" placeholder="${escapeHtml(t('idr.orWriteYoursPh'))}"></textarea>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="idrElegirLibre()"><i class="ti ti-check"></i> ${t('idr.useThis')}</button>
          ${pActual.texto && iaOk ? `<button class="btn" onclick="idrPedirPaso(true)"><i class="ti ti-refresh"></i> ${t('idr.otherIdeas')}</button>` : ''}
        </div>
      </div>
    `}
  `;
}

// Le pide al asistente el paso actual. Le pasa lo ya decidido, para que no
// vuelva a proponer lo mismo ni se contradiga.
async function idrPedirPaso(otras){
  const c = idrCreacion(idrCreacionActiva);
  if(!c) return;
  const pasos = IDR_PASOS[c.tipo] || [];
  const def = pasos[c.pasoActual];
  if(!def) return;

  const btn = document.getElementById('idr-pedir');
  if(btn){ btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader"></i> ${t('idr.thinking')}`; }

  const decidido = (c.pasos||[]).map((p, i) => (p && p.elegido) ? `${gl(pasos[i].l)}: ${p.elegido}` : null).filter(Boolean).join('\n');
  const previo = decidido ? `Ya está decidido:\n${decidido}\n\n` : '';
  const evitar = otras && Array.isArray((c.pasos[c.pasoActual]||{}).opciones)
    ? `Ya propusiste esto y no ha convencido, propón otras distintas: ${c.pasos[c.pasoActual].opciones.map(o=>o.titulo).join(', ')}.\n\n` : '';

  const instruccion = `${previo}${evitar}${def.p}

Responde SOLO con este JSON, sin texto alrededor:
{"comentario":"una o dos frases tuyas, o una pregunta si te falta información","opciones":[{"titulo":"...","motivo":"por qué lo propones"}]}
Si te falta información para proponer con criterio, deja "opciones" vacío y pregunta en "comentario".`;

  const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 1200});
  if(!r.ok){ showToast(idrMensajeError(r)); renderIdr(); return; }

  const j = idrExtraerJson(r.texto);
  if(!c.pasos[c.pasoActual]) c.pasos[c.pasoActual] = {};
  const paso = c.pasos[c.pasoActual];
  if(j && (j.comentario || j.opciones)){
    paso.texto = j.comentario || '';
    paso.opciones = Array.isArray(j.opciones) ? j.opciones.slice(0, 4) : [];
  } else {
    // Contestó en prosa. Se enseña igual: es información útil, aunque no se
    // pueda pintar en tarjetas.
    paso.texto = r.texto;
    paso.opciones = [];
  }
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}

function idrElegir(oi){
  const c = idrCreacion(idrCreacionActiva);
  if(!c) return;
  const paso = c.pasos[c.pasoActual] || {};
  const op = (paso.opciones||[])[oi];
  if(!op) return;
  idrAvanzar(op.titulo);
}
function idrElegirLibre(){
  const el = document.getElementById('idr-libre');
  const v = el ? (el.value||'').trim() : '';
  if(!v){ showToast(t('idr.writeSomething')); return; }
  idrAvanzar(v);
}
function idrAvanzar(elegido){
  const c = idrCreacion(idrCreacionActiva);
  if(!c) return;
  if(!c.pasos[c.pasoActual]) c.pasos[c.pasoActual] = {};
  c.pasos[c.pasoActual].elegido = elegido;
  // El primer paso da nombre a la creación mientras no haya uno mejor.
  if(!c.titulo) c.titulo = elegido.slice(0, 60);
  const pasos = IDR_PASOS[c.tipo] || [];
  // Si el paso del nombre existe, ese manda como título.
  if(pasos[c.pasoActual] && pasos[c.pasoActual].k === 'nombre') c.titulo = elegido.slice(0, 60);
  c.pasoActual = Math.min(c.pasoActual + 1, pasos.length);
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
}
// Volver a un paso: se borra ESE y los que venían detrás (dependen de él),
// y se respeta todo lo anterior.
function idrVolverA(i){
  const c = idrCreacion(idrCreacionActiva);
  if(!c) return;
  c.pasos = (c.pasos||[]).slice(0, i);
  c.pasoActual = i;
  c.updatedAt = new Date().toISOString();
  saveDB();
  renderIdr();
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

async function idrCrearPlatoReal(id){
  const c = idrCreacion(id);
  if(!c || c.tipo !== 'plato') return;
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }

  const pasos = IDR_PASOS.plato;
  const resumen = (c.pasos||[]).map((p, i) => (p && p.elegido) ? `${gl(pasos[i].l)}: ${p.elegido}` : null).filter(Boolean).join('\n');

  showToast(t('idr.buildingDish'));
  const instruccion = `Este es el plato que hemos diseñado:

${resumen}

Escribe la receta para 2 comensales. Responde SOLO con este JSON:
{"nombre":"...","descripcion":"descripción corta de carta","pasos":["paso 1","paso 2"],"ingredientes":[{"nombre":"tal y como lo llamaría el negocio","cantidad":120,"unidad":"g"}]}

Usa los ingredientes que YA COMPRA siempre que puedas, con el mismo nombre con el que los tiene. Si hace falta alguno que no tiene, inclúyelo igual: la aplicación lo marcará aparte. No pongas precios ni costes.`;

  const r = await llmChat(idrSistema(), [{role:'user', content: instruccion}], {maxTokens: 1500});
  if(!r.ok){ showToast(idrMensajeError(r)); return; }
  const j = idrExtraerJson(r.texto);
  if(!j || !j.nombre || !Array.isArray(j.ingredientes)){ showToast(t('idr.err.unreadable')); return; }

  const lineas = [];
  const faltan = [];
  j.ingredientes.forEach(ing => {
    const real = idrBuscarIngrediente(ing.nombre);
    const qty = Math.max(0, parseFloat(ing.cantidad) || 0);
    if(real && qty > 0) lineas.push({type:'ingredient', ingredientId: real.id, qty, merma: 0});
    else faltan.push(`${ing.nombre}${ing.cantidad ? ` (${ing.cantidad} ${ing.unidad||''})` : ''}`);
  });

  const nombre = String(j.nombre).slice(0, 80);
  const receta = {
    id: genId(), name: nombre, price: 0, priceBase: 0,
    ivaPct: (DB.business && DB.business.ivaPct) || 10,
    comensales: 2, consumiblesPct: 5,
    category: (typeof areaRecipeCategories === 'function' && areaRecipeCategories()[0]) || '',
    ingredients: lineas, allergens: [], area: 'cocina',
    isBase: false, baseYield: 1, baseUnit: 'L',
    steps: Array.isArray(j.pasos) ? j.pasos.join('\n') : '',
    presentation: String(j.descripcion || ''),
  };
  DB.recipes.push(receta);

  c.recipeId = receta.id;
  c.faltan = faltan;
  c.updatedAt = new Date().toISOString();
  saveDB();

  // El coste lo calcula la app con SUS precios, nunca el modelo.
  const coste = (typeof recipeCost === 'function') ? recipeCost(receta) : 0;
  const aviso = faltan.length
    ? t('idr.dishCreatedMissing').replace('${n}', faltan.length).replace('${coste}', fmtMoney(coste))
    : t('idr.dishCreated').replace('${coste}', fmtMoney(coste));
  showToast(aviso);
  renderIdr();
}

function idrImprimir(id){
  const c = idrCreacion(id);
  if(!c) return;
  const pasos = IDR_PASOS[c.tipo] || [];
  const filas = (c.pasos||[]).map((p, i) => (p && p.elegido)
    ? `<tr><td style="padding:4px 12px 4px 0;color:#777;white-space:nowrap"><strong>${escapeHtml(gl(pasos[i].l))}</strong></td><td style="padding:4px 0">${escapeHtml(p.elegido)}</td></tr>` : ''
  ).join('');
  const body = `
    ${printReportHeaderHtml(c.titulo || t('idr.untitled'))}
    <table style="width:100%;border-collapse:collapse;font-size:11pt">${filas}</table>
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
        <input type="text" id="idr-modelo" value="${escapeHtml(cfg.modelo||'')}" placeholder="${escapeHtml(IDR_PROVEEDORES[cfg.proveedor].modeloPorDefecto)}">
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
    <p style="font-size:12px;color:var(--muted);margin-top:10px">${t('idr.callsToday').replace('${n}', idrGastoHoy()).replace('${tope}', IDR_TOPE_DIA)}</p>
    <div class="modal-footer">
      ${idrHayIA() ? `<button class="btn btn-danger" onclick="idrBorrarConfig();closeModal();renderIdr();showToast(t('idr.keyRemoved'))">${t('common.delete')}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="idrGuardarDesdeModal()">${t('common.save')}</button>
    </div>
  `);
}
function idrConfigModalRefrescar(){
  const p = document.getElementById('idr-prov').value;
  const def = IDR_PROVEEDORES[p];
  if(!def) return;
  const m = document.getElementById('idr-modelo');
  if(m) m.placeholder = def.modeloPorDefecto;
  const a = document.getElementById('idr-ayuda');
  if(a) a.innerHTML = `${t('idr.keyWhere')} <strong>${escapeHtml(def.ayuda)}</strong>`;
}
function idrGuardarDesdeModal(){
  const p = document.getElementById('idr-prov').value;
  const k = document.getElementById('idr-clave').value;
  const m = document.getElementById('idr-modelo').value;
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

// El atajo que engancha: en vez de empezar en blanco, el asistente lee la
// carta que YA tienen y propone un borrador para corregir.
async function idrAdnBorrador(){
  if(!idrHayIA()){ showToast(t('idr.err.noKey')); return; }
  const carta = idrCartaTexto();
  if(!carta){ showToast(t('idr.dnaNoCarta')); return; }
  showToast(t('idr.thinking'));
  const campos = IDR_ADN_CAMPOS.map(c => `"${c.k}"`).join(', ');
  const r = await llmChat(
    IDR_REGLAS,
    [{role:'user', content:`Esta es la carta de un restaurante:\n\n${carta}\n\nDeduce su identidad gastronómica. Responde SOLO con este JSON, con las claves ${campos}. Deja en blanco lo que no puedas deducir de la carta: no te lo inventes. En "cocina" sé concreto (por ejemplo "catalana de mercado", no "mediterránea").`}],
    {maxTokens: 900}
  );
  if(!r.ok){ showToast(idrMensajeError(r)); return; }
  const j = idrExtraerJson(r.texto);
  if(!j){ showToast(t('idr.err.unreadable')); return; }
  const a = idrAdn();
  IDR_ADN_CAMPOS.forEach(c => {
    const v = j[c.k];
    // Solo rellena lo que está vacío: no pisa lo que el cocinero ya escribió.
    if(v !== undefined && String(v).trim() !== '' && (a[c.k] === undefined || String(a[c.k]).trim() === '')) a[c.k] = String(v).trim();
  });
  saveDB();
  idrAdnModal();
  showToast(t('idr.dnaDraftDone'));
}
