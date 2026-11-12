/* ============================================================
   PLAN DE LIMPIEZA — APPCC e higiene alimentaria
   ============================================================ */
const LIMPIEZA_TABS = ['protocolo','manos','mes','temperaturas','alergenos','plagas','mantenimiento'];
const LIMPIEZA_TAB_LABEL_KEYS = {
  manos: 'tab.handHygiene', protocolo: 'tab.openingClosing', mes: 'tab.monthlyCleaning', temperaturas: 'tab.temperatures',
  alergenos: 'tab.allergens', plagas: 'tab.pests', mantenimiento: 'tab.maintenance'
};
const LIMPIEZA_TAB_ICONS = {
  manos: 'ti-droplet', protocolo: 'ti-door', mes: 'ti-calendar-month', temperaturas: 'ti-temperature',
  alergenos: 'ti-alert-triangle', plagas: 'ti-bug', mantenimiento: 'ti-settings'
};
function limpiezaTabLabel(k){ return `<i class="ti ${LIMPIEZA_TAB_ICONS[k]}"></i> ${t(LIMPIEZA_TAB_LABEL_KEYS[k])}`; }
const LIMPIEZA_LOG_CONFIG_KEYS = {
  temperaturas: {fields:['fecha','hora','equipo','tipo','temp','estado','responsable'], labelKeys:['common.date','th.time','label.equipment','label.equipmentType','label.tempC','label.status','label.responsible']},
  plagas: {fields:['fecha','area','hallazgos','accion','proxima','responsable'], labelKeys:['common.date','label.area','label.findings','label.actionTaken','label.nextReview','label.responsible']}
};
function limpiezaLogConfig(key){
  const c = LIMPIEZA_LOG_CONFIG_KEYS[key];
  return {fields: c.fields, labels: c.labelKeys.map(k => t(k))};
}

// Rangos seguros de temperatura por tipo de equipo, para calcular el estado
// (OK/No OK) automáticamente en vez de que el usuario tenga que juzgarlo.
const LIMPIEZA_TEMP_RANGES = {
  nevera: {min:0, max:5},
  congelador: {min:-25, max:-18},
  caliente: {min:65, max:120}
};
function limpiezaTempTipoOptions(){
  return [['nevera', t('opt.tempFridge')], ['congelador', t('opt.tempFreezer')], ['caliente', t('opt.tempHot')], ['otro', t('opt.tempOther')]];
}
function limpiezaTempTipoLabel(tipo){
  const found = limpiezaTempTipoOptions().find(([v]) => v === tipo);
  return found ? found[1] : (tipo || '—');
}
function computeTempEstado(tipo, temp){
  const r = LIMPIEZA_TEMP_RANGES[tipo];
  if(!r || isNaN(temp)) return null;
  return (temp >= r.min && temp <= r.max) ? 'OK' : 'NOK';
}

// Alérgenos de un plato: los de sus ingredientes (y, recursivamente, los de
// cualquier elaboración base que use), tal como se dieron de alta en Mega
// Lista/Stock. Así no hay que volver a escribirlos a mano en Plan de Limpieza.
function recipeAllergens(r, visited){
  visited = visited || new Set();
  const result = new Set();
  if(!r || visited.has(r.id)) return result;
  visited.add(r.id);
  (r.ingredients||[]).forEach(line => {
    if(line.type === 'base'){
      const baseRecipe = getRecipe(line.baseRecipeId);
      recipeAllergens(baseRecipe, visited).forEach(a => result.add(a));
    } else {
      const ing = getIngredient(line.ingredientId);
      if(ing && ing.allergens) ing.allergens.forEach(a => result.add(a));
    }
  });
  return result;
}
function getAllDishAllergens(){
  // Solo interesan aquí los platos que SÍ tienen algún alérgeno: es un aviso
  // de alérgenos, no un listado general de la carta (eso ya está en Escandallo).
  //
  // ⚠️ Antes esto leía SOLO los escandallos, y los alérgenos del escandallo
  // se deducen de los ingredientes. Pero el único sitio donde se marcan A
  // MANO es la ficha técnica (toggleFichaAllergen): el sésamo del pan, el
  // huevo de un rebozado comprado hecho, la traza que avisa el proveedor.
  // Todo eso lo marcaba el cocinero en la ficha y NO llegaba aquí — que es
  // justo el papel que se enseña en una inspección. Y una ficha sin
  // escandallo detrás no aparecía en absoluto.
  //
  // Ahora manda la ficha (lo deducido MÁS lo marcado a mano) y los
  // escandallos sin ficha se añaden detrás, para que no falte nada.
  const area = currentArea();
  const porNombre = new Map();
  const anotar = (nombre, alergenos) => {
    const n = (nombre||'').trim();
    if(!n || !alergenos.length) return;
    const clave = n.toLowerCase();
    const previo = porNombre.get(clave);
    if(previo) previo.allergens = Array.from(new Set([...previo.allergens, ...alergenos]));
    else porNombre.set(clave, {name: n, allergens: [...alergenos]});
  };
  (DB.fichas||[]).forEach(f => {
    const r = (typeof getFichaLiveRecipe === 'function') ? getFichaLiveRecipe(f) : null;
    // Una ficha de bebida (lleva «tipo de bebida») es de Sala aunque se creara antes de que existieran las áreas (7/11).
    const fArea = f.area || (r && r.area) || ((f.bebidaTipo || f.bebida) ? 'sala' : 'cocina');
    if(fArea !== area) return;
    // El nombre que vale es el del plato vinculado si existe (por si se
    // renombró en el escandallo después de crear la ficha).
    anotar(r ? r.name : f.name, (typeof getFichaAllergens === 'function') ? getFichaAllergens(f) : (f.allergens||[]));
  });
  (DB.recipes||[]).forEach(r => {
    if((r.area||'cocina') !== area) return;
    anotar(r.name, [...recipeAllergens(r)]);
  });
  // Los menús/combos (Menú del día, etc.) referencian recetas reales por
  // recipeId pero tienen su propia lista de nombres — sin este bloque, un
  // plato con alérgeno metido dentro de un menú no salía aquí aunque su
  // ficha sí lo tuviera marcado.
  (DB.menus||[]).forEach(m => {
    if((m.area||'cocina') !== area) return;
    (m.grupos||[]).forEach(g => (g.opciones||[]).forEach(o => {
      if(!o.recipeId) return;
      const r = getRecipe(o.recipeId);
      if(!r) return;
      anotar(o.nombre || r.name, [...recipeAllergens(r)]);
    }));
  });
  // Un plato manual de Carta sin recipeId (típicamente una bebida) no tiene
  // escandallo del que deducir nada: sus alérgenos, si los tiene, son
  // SIEMPRE los marcados a mano (p.allergensManual, ver openPlatoAllergensModal).
  (DB.cartas||[]).forEach(c => {
    // Una carta antigua sin área y que se llama «Bebidas…» es de Sala (misma regla que isBebidaCarta).
    if((c.area || (isBebidaCarta(c) ? 'sala' : 'cocina')) !== area) return;
    (c.secciones||[]).forEach(sec => (sec.platos||[]).forEach(p => {
      if(p.recipeId || !(p.allergensManual||[]).length) return;
      anotar(p.nombre, p.allergensManual);
    }));
  });
  return [...porNombre.values()].sort((a,b) => a.name.localeCompare(b.name));
}
let lpAlergBusca = '', lpAlergSel = [];
function lpAlergToggle(nombre){
  lpAlergSel = lpAlergSel.includes(nombre) ? lpAlergSel.filter(a => a !== nombre) : [...lpAlergSel, nombre];
  renderLimpiezaAlergenos();
}
function lpAlergLimpiar(){ lpAlergSel = []; lpAlergBusca = ''; renderLimpiezaAlergenos(); }
function lpAlergBuscar(v){
  lpAlergBusca = v.toLowerCase();
  renderLimpiezaAlergenos();
  const c = document.getElementById('lp-alerg-q'); if(c){ c.focus(); const n = c.value.length; try{ c.setSelectionRange(n, n); }catch(e){} }
}
function printAlergenos(){
  const dishes = lpAlergFiltrados();
  const title = tA('title.dishAllergensOverview');
  const body = `${printReportHeaderHtml(title, lpAlergSel.length ? lpAlergSel.map(a => allergenLabel(a)).join(' · ') : '')}<table><thead><tr><th>${tA('label.dishElaboration')}</th><th>${t('label.allergensPresent')}</th></tr></thead><tbody>${dishes.map(d => `<tr><td>${escapeHtml(d.name)}</td><td>${d.allergens.map(a => escapeHtml(allergenLabel(a))).join(' · ')}</td></tr>`).join('')}</tbody></table>`;
  printReportWindow(title, body);
}
// Platos que llevan ALGUNO de los alérgenos marcados (sin ninguno marcado, todos los de la lista).
function lpAlergFiltrados(){
  let dishes = getAllDishAllergens();
  if(lpAlergBusca) dishes = dishes.filter(d => d.name.toLowerCase().includes(lpAlergBusca));
  if(lpAlergSel.length) dishes = dishes.filter(d => d.allergens.some(a => lpAlergSel.includes(a)));
  return dishes;
}
function renderLimpiezaAlergenos(){
  const box = document.getElementById('limpieza-tab-content');
  const todos = getAllDishAllergens();
  const cuenta = {};
  todos.forEach(d => d.allergens.forEach(a => { cuenta[a] = (cuenta[a]||0) + 1; }));
  const lista = Object.keys(cuenta).sort((a,b) => allergenLabel(a).localeCompare(allergenLabel(b)));
  lpAlergSel = lpAlergSel.filter(a => lista.includes(a));
  const dishes = lpAlergFiltrados();
  const filtrando = !!(lpAlergSel.length || lpAlergBusca);
  box.innerHTML = `
    <section class="lp-card lp-alerg-filtro">
      <div class="lp-barra">
        <div class="es-tit" style="margin:0">${(currentArea()==='sala' ? gl({es:'Ver las bebidas que llevan…', ca:'Veure les begudes que porten…', en:'Show the drinks that contain…'}) : gl({es:'Ver los platos que llevan…', ca:'Veure els plats que porten…', en:'Show the dishes that contain…'}))}</div>
        <div class="lp-filtros">
          <input type="text" class="search-input st-buscar" id="lp-alerg-q" value="${escapeHtml(lpAlergBusca)}" placeholder="${escapeHtml((currentArea()==='sala' ? gl({es:'Buscar bebida…', ca:'Cercar beguda…', en:'Search drink…'}) : gl({es:'Buscar plato…', ca:'Cercar plat…', en:'Search dish…'})))}" oninput="lpAlergBuscar(this.value)" aria-label="${escapeHtml(tA('label.dishElaboration'))}">
          ${filtrando ? `<button type="button" class="btn btn-sm btn-fino" onclick="lpAlergLimpiar()"><i class="ti ti-x"></i> ${gl({es:'Quitar filtros', ca:'Treure filtres', en:'Clear filters'})}</button>` : ''}
          <button type="button" class="btn btn-fino" onclick="printAlergenos()"><i class="ti ti-printer"></i> ${t('common.print')}</button>
        </div>
      </div>
      ${lista.length ? `<div class="lp-alerg-chips" role="group" aria-label="${escapeHtml(t('label.allergens'))}">${lista.map(a => `<button type="button" class="lp-alerg${lpAlergSel.includes(a) ? ' on' : ''}" aria-pressed="${lpAlergSel.includes(a)}" onclick="lpAlergToggle('${escapeJsAttr(a)}')">${escapeHtml(allergenLabel(a))}<span>${cuenta[a]}</span></button>`).join('')}</div>
      ${lpAlergSel.length ? `<p class="pr-ayuda">${(currentArea()==='sala' ? gl({es:'Se muestran las bebidas que llevan alguno de los alérgenos marcados.', ca:'Es mostren les begudes que porten algun dels al·lèrgens marcats.', en:'Showing drinks that contain any of the selected allergens.'}) : gl({es:'Se muestran los platos que llevan alguno de los alérgenos marcados.', ca:'Es mostren els plats que porten algun dels al·lèrgens marcats.', en:'Showing dishes that contain any of the selected allergens.'}))}</p>` : ''}` : ''}
    </section>
    <section class="lp-card">
      <h3 class="dp-h"><i class="ti ti-alert-triangle"></i> ${tA('title.dishAllergensOverview')} <span class="dp-cuenta">${dishes.length}</span></h3>
      <p class="pr-ayuda">${tA('msg.dishAllergensOverviewDesc')}</p>
      ${dishes.length ? `<div class="table-wrap"><table class="table-cards">
        <thead><tr><th>${tA('label.dishElaboration')}</th><th>${t('label.allergensPresent')}</th></tr></thead>
        <tbody>${dishes.map(d => `<tr><td data-label="${escapeHtml(tA('label.dishElaboration'))}">${escapeHtml(d.name)}</td><td class="wrap" data-label="${escapeHtml(t('label.allergensPresent'))}">${d.allergens.map(a=>`<span class="badge badge-amber${lpAlergSel.includes(a) ? ' lp-marcado' : ''}">${escapeHtml(a)}</span>`).join(' ')}</td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty es-vacio">${filtrando ? t('common.noResults') : tA('empty.noDishesForAllergens')}</div>`}
    </section>
  `;
}
// Pasos de lavado de manos, separados por área igual que el protocolo de
// apertura/cierre: editar desde Cocina no debe cambiar lo que ve Sala.
function limpiezaManosPasos(){
  const l = DB.limpieza;
  if(!l.manosPasos || Array.isArray(l.manosPasos)){
    const legacy = Array.isArray(l.manosPasos) ? l.manosPasos : null;
    l.manosPasos = { cocina: legacy || [...getLimpiezaDefaultManos()], sala: [...getLimpiezaDefaultManos()] };
  }
  const area = currentArea();
  if(!l.manosPasos[area]) l.manosPasos[area] = [...getLimpiezaDefaultManos()];
  return l.manosPasos[area];
}
// Checklists por defecto que la app sugiere al crear el plan de limpieza por
// primera vez: son contenido de la app (de serie), no texto escrito por el
// negocio, así que se traducen igual que el resto de la interfaz. Como
// cualquier t('lang.xxx'), esto se recalcula en cada carga de página y un
// cambio de idioma siempre recarga la página (ver setLang()), así que es
// seguro leerlo aquí una sola vez a nivel de módulo.
function getLimpiezaDefaultManos(){ return t('limpieza.defaultManos'); }
function getLimpiezaDefaultApertura(){ return t('limpieza.defaultAperturaCocina'); }
function getLimpiezaDefaultCierre(){ return t('limpieza.defaultCierreCocina'); }
// Checklists propias de Sala: barra/grifos/cafetera en vez de cámaras/plancha de cocina.
function getLimpiezaDefaultAperturaSala(){ return t('limpieza.defaultAperturaSala'); }
function getLimpiezaDefaultCierreSala(){ return t('limpieza.defaultCierreSala'); }

let limpiezaTab = 'protocolo';
// Antes la vista de mes pintaba el nombre completo de cada tarea + su
// checkbox dentro de la casilla del día — con dos o tres tareas ese día ya
// no cabía y se salía de la casilla (mismo problema que el calendario de
// Turnos, ver .cal-day-cell/.cal-day-badge). Ahora el mes solo muestra un
// contador por día (como Turnos y el calendario de pedidos programados) y
// hay vistas de semana y día para ver el detalle real con sitio de sobra.
let limpiezaCalMode = 'mes'; // 'dia'|'semana'|'mes'
let limpiezaCalDate = null; // Date del día de referencia

// Devuelve la lista de pasos (apertura o cierre) del área actual, creándola
// con sus valores por defecto propios si aún no existe para esa área.
function limpiezaProtocoloPasos(type){
  const l = DB.limpieza;
  const key = _protocoloKey(type);
  if(!l[key] || Array.isArray(l[key])){
    // Migración: antes era un array plano (siempre pensado para Cocina).
    const legacy = Array.isArray(l[key]) ? l[key] : null;
    l[key] = {
      cocina: legacy || [...(type==='apertura' ? getLimpiezaDefaultApertura() : getLimpiezaDefaultCierre())],
      sala: [...(type==='apertura' ? getLimpiezaDefaultAperturaSala() : getLimpiezaDefaultCierreSala())]
    };
  }
  const area = currentArea();
  if(!l[key][area]) l[key][area] = [...(type==='apertura' ? (area==='sala'?getLimpiezaDefaultAperturaSala():getLimpiezaDefaultApertura()) : (area==='sala'?getLimpiezaDefaultCierreSala():getLimpiezaDefaultCierre()))];
  return l[key][area];
}

function ensureLimpiezaData(){
  if(!DB.limpieza) DB.limpieza = {};
  const l = DB.limpieza;
  limpiezaManosPasos();
  if(!l.tareas) l.tareas = [];
  if(!l.checks) l.checks = {};
  if(!l.checksMes) l.checksMes = {};
  if(!l.temperaturas) l.temperaturas = [];
  if(!l.alergenos) l.alergenos = [];
  if(!l.plagas) l.plagas = [];
  if(!l.mantenimiento) l.mantenimiento = [];
  limpiezaProtocoloPasos('apertura');
  limpiezaProtocoloPasos('cierre');
  if(!l.aperturaLog) l.aperturaLog = [];
  if(!l.cierreLog) l.cierreLog = [];
  pruneLimpiezaLogs();
}

// El historial de cumplimiento diario (apertura/cierre) no es un archivo
// permanente: si se acumulara para siempre dejaría de ser útil de un
// vistazo, así que se queda solo con los últimos 3 días.
//
// Temperaturas y plagas SÍ son registros de seguridad alimentaria (APPCC) que
// normalmente hay que poder conservar/consultar durante bastante más tiempo
// que un simple checklist — antes se borraban solos y sin ningún aviso al
// cambiar de trimestre (se quedaba solo con el trimestre EN CURSO), lo cual
// es un riesgo real de cumplimiento normativo. Ahora se conservan 4 trimestres
// (1 año) en vez de solo el actual, y se avisa la primera vez que de verdad
// se borra algo para que el dueño sepa que debe exportar/archivar antes.
const LIMPIEZA_COMPLIANCE_KEEP_DAYS = 3;
const LIMPIEZA_APPCC_KEEP_QUARTERS = 4;
function quarterIndex(fecha){
  const d = new Date(fecha);
  return d.getFullYear()*4 + Math.floor(d.getMonth()/3);
}
function pruneLimpiezaLogs(){
  const l = DB.limpieza;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (LIMPIEZA_COMPLIANCE_KEEP_DAYS - 1));
  const cutoffStr = dateStr(cutoff);
  let changed = false;
  ['aperturaLog','cierreLog'].forEach(k => {
    const before = l[k].length;
    l[k] = l[k].filter(e => e.fecha >= cutoffStr);
    if(l[k].length !== before) changed = true;
  });
  const currentQIdx = quarterIndex(todayStr());
  let appccPurged = false;
  ['temperaturas','plagas'].forEach(k => {
    const before = l[k].length;
    // Un registro sin fecha (dato incompleto) NO se borra por error de
    // cumplimiento — antes `e.fecha && ...` hacía que se descartara igual
    // que uno realmente antiguo, perdiendo el dato en vez de solo dejarlo
    // sin poder clasificar por trimestre.
    l[k] = l[k].filter(e => !e.fecha || (currentQIdx - quarterIndex(e.fecha)) < LIMPIEZA_APPCC_KEEP_QUARTERS);
    if(l[k].length !== before){ changed = true; appccPurged = true; }
  });
  if(appccPurged && l.appccLastPurgeWarnedQuarter !== currentQIdx){
    l.appccLastPurgeWarnedQuarter = currentQIdx;
    showToast(t('msg.appccLogsPurged'));
  }
  if(changed) saveDB();
}

/* ============== Plan de Limpieza, diseño nuevo (31/10) ==============
   Arriba, SIEMPRE, el estado de hoy: lo que una inspección pregunta primero (¿se abrió y se cerró con el protocolo?, ¿se tomaron
   las temperaturas?, ¿está la limpieza del día hecha?, ¿hay algo de mantenimiento vencido?). Cada cifra lleva a su pestaña. */
function limpiezaEstadoHoy(){
  const area = currentArea();
  const hoy = todayStr();
  const reg = key => (DB.limpieza[key]||[]).find(e => e.fecha === hoy && (e.area||'cocina') === area) || null;
  const tareasHoy = limpiezaTareasParaDia(new Date());
  const checks = limpiezaChecksFor(limpiezaMonthKeyFor(new Date()));
  const hechas = tareasHoy.filter(tk => limpiezaCheckInfo(checks, tk.id)).length;
  const temps = (DB.limpieza.temperaturas||[]).filter(e => (e.zona||'cocina') === area && e.fecha === hoy);
  const tempNok = temps.filter(e => e.estado === 'NOK').length;
  const equipos = (DB.limpieza.mantenimiento||[]).filter(e => (e.zona||'cocina') === area);
  const vencidos = equipos.filter(e => limpiezaMantenimientoDueStatus(e) === 'overdue').length;
  const proximos = equipos.filter(e => limpiezaMantenimientoDueStatus(e) === 'soon').length;
  return {apertura: reg('aperturaLog'), cierre: reg('cierreLog'), tareas: tareasHoy.length, hechas, temps: temps.length, tempNok, vencidos, proximos};
}
function lpResumenHtml(){
  const h = limpiezaEstadoHoy();
  const celda = (tab, et, v, sub, clase) => `<button type="button" class="st-cel st-cel-btn${clase ? ' ' + clase : ''}" onclick="setLimpiezaTab('${tab}')"><span class="st-cel-et">${et}</span><span class="st-cel-v">${v}</span>${sub ? `<span class="st-cel-s">${sub}</span>` : ''}</button>`;
  const reg = e => e ? `${gl({es:'Registrado', ca:'Registrat', en:'Logged'})} ${escapeHtml(e.hora||'')}` : gl({es:'Pendiente', ca:'Pendent', en:'Pending'});
  return `
    <div class="st-resumen lp-resumen">
      ${celda('protocolo', t('title.openingProtocol'), h.apertura ? '<i class="ti ti-circle-check"></i>' : '—', reg(h.apertura), h.apertura ? 'is-ok' : '')}
      ${celda('protocolo', t('title.closingProtocol'), h.cierre ? '<i class="ti ti-circle-check"></i>' : '—', reg(h.cierre), h.cierre ? 'is-ok' : '')}
      ${celda('mes', t('tab.monthlyCleaning'), h.tareas ? `${h.hechas}/${h.tareas}` : '—', h.tareas ? gl({es:'tareas de hoy', ca:'tasques d\'avui', en:'today\'s tasks'}) : gl({es:'nada para hoy', ca:'res per avui', en:'nothing today'}), h.tareas && h.hechas === h.tareas ? 'is-ok' : '')}
      ${celda('temperaturas', t('tab.temperatures'), h.temps, h.tempNok ? `${h.tempNok} ${gl({es:'fuera de rango', ca:'fora de rang', en:'out of range'})}` : gl({es:'lecturas hoy', ca:'lectures avui', en:'readings today'}), h.tempNok ? 'is-bajo' : '')}
      ${celda('mantenimiento', t('tab.maintenance'), h.vencidos + h.proximos, h.vencidos ? `${h.vencidos} ${gl({es:'vencidos', ca:'vençuts', en:'overdue'})}` : h.proximos ? gl({es:'vencen pronto', ca:'vencen aviat', en:'due soon'}) : gl({es:'al día', ca:'al dia', en:'up to date'}), h.vencidos ? 'is-bajo' : '')}
    </div>`;
}
function renderLimpieza(){
  ensureLimpiezaData();
  const isSala = currentArea()==='sala';
  const titleEl = document.querySelector('#view-limpieza .view-title');
  const subtitleEl = document.querySelector('#view-limpieza .view-subtitle');
  if(titleEl) titleEl.textContent = isSala ? t('view.limpieza.title.sala') : t('view.limpieza.title');
  if(subtitleEl) subtitleEl.textContent = isSala ? t('view.limpieza.subtitle.sala') : t('view.limpieza.subtitle');
  const box = document.getElementById('limpieza-content');
  box.innerHTML = `
    ${lpResumenHtml()}
    <div class="toolbar es-tabs lp-tabs" id="limpieza-tabs-row"><div class="left">
      ${LIMPIEZA_TABS.map(tb => `<button type="button" class="btn btn-sm btn-fino ge-tab${limpiezaTab===tb?' is-on active':''}" aria-pressed="${limpiezaTab===tb}" onclick="setLimpiezaTab('${tb}')">${limpiezaTabLabel(tb)}</button>`).join('')}
    </div></div>
    <div id="limpieza-tab-content"></div>
  `;
  renderLimpiezaTab();
}
function setLimpiezaTab(tab){ limpiezaTab = tab; renderLimpieza(); scrollContentToTop(); }
function renderLimpiezaTab(){
  switch(limpiezaTab){
    case 'manos': renderLimpiezaManos(); break;
    case 'protocolo': renderLimpiezaProtocolo(); break;
    case 'mes': renderLimpiezaMes(); break;
    case 'temperaturas': renderLimpiezaLog('temperaturas'); break;
    case 'alergenos': renderLimpiezaAlergenos(); break;
    case 'plagas': renderLimpiezaLog('plagas'); break;
    case 'mantenimiento': renderLimpiezaMantenimiento(); break;
  }
  lpRefrescarResumen();
}
// Las cifras de arriba cambian con lo que se registra en cualquier pestaña: cada una de ellas lo llama al terminar de pintarse.
function lpRefrescarResumen(){
  const r = document.querySelector('#limpieza-content .lp-resumen');
  if(r) r.outerHTML = lpResumenHtml();
  lpAutoTodos();
}

/* Una casilla de texto que se estira hacia ABAJO cuando el texto es largo: antes un paso largo se «comía» por la derecha y no
   se podía leer entero. Todas las cajas de texto libre de Limpieza son así (lpAuto las ajusta al escribir y al pintar). */
function lpAuto(el){ el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight + 2, 44) + 'px'; }
function lpAutoTodos(){ document.querySelectorAll('#limpieza-content textarea.lp-auto-alto').forEach(lpAuto); }
// Un paso numerado de un protocolo: el texto se edita en su sitio (si hay permiso) y subir / bajar / quitar viven en el ⋯.
function lpPasoHtml(i, total, texto, fnCambiar, fnMover, fnQuitar){
  return `
    <div class="lp-paso">
      <span class="lp-num">${i+1}</span>
      <textarea class="lp-paso-txt lp-auto-alto" rows="1" oninput="lpAuto(this);${fnCambiar}" ${editUnlocked?'':'readonly'} aria-label="${escapeHtml(t('label.newStep') + ' ' + (i+1))}">${escapeHtml(texto)}</textarea>
      ${ggMenuAcciones([
        i > 0 ? {icono:'ti-arrow-up', texto:gl({es:'Subir', ca:'Pujar', en:'Move up'}), fn:fnMover(-1), estricto:true} : null,
        i < total - 1 ? {icono:'ti-arrow-down', texto:gl({es:'Bajar', ca:'Baixar', en:'Move down'}), fn:fnMover(1), estricto:true} : null,
        total > 1 ? {icono:'ti-trash', texto:t('common.delete'), fn:fnQuitar, peligro:true, estricto:true} : null
      ], {clase:'btn btn-fino mn-btn lp-mas', tip:true})}
    </div>`;
}
function renderLimpiezaManos(){
  const box = document.getElementById('limpieza-tab-content');
  const pasos = limpiezaManosPasos();
  box.innerHTML = `
    <div class="lp-dos">
      <section class="lp-card">
        <div class="lp-card-cab">
          <h3 class="dp-h"><i class="ti ti-droplet"></i> ${t('title.handWashingProtocol')}</h3>
          <div class="lp-card-bt">
            <button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(t('common.print'))}" aria-label="${escapeHtml(t('common.print'))}" onclick="printManosProtocolo()"><i class="ti ti-printer"></i></button>
            ${ggMenuAcciones([{icono:'ti-restore', texto:t('btn.resetToDefault'), fn:'resetManosPasos()', estricto:true}], {clase:'btn btn-fino mn-btn pr-ico', tip:true, etiqueta:gl({es:'Más opciones', ca:'Més opcions', en:'More options'})})}
          </div>
        </div>
        ${pasos.map((p,i) => lpPasoHtml(i, pasos.length, p, `updateManosPaso(${i}, this.value)`, d => `moveManosPaso(${i},${d})`, `removeManosPaso(${i})`)).join('')}
        <button type="button" class="owner-strict btn btn-fino lp-anadir" onclick="addManosPaso()"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
      </section>
      <div class="lp-lado">
        <section class="lp-card">
          <h3 class="dp-h"><i class="ti ti-clock"></i> ${t('title.whenToWashHands')}</h3>
          <ul class="lp-lista-puntos">
            <li>${t('li.startingWork')}</li>
            <li>${t('li.afterHandlingWaste')}</li>
            <li>${t('li.afterTouchingFaceHair')}</li>
            <li>${t('li.afterUsingRestroom')}</li>
            <li>${tA('li.rawToCookedProduct')}</li>
            <li>${t('li.afterEatingSmoking')}</li>
          </ul>
        </section>
        <section class="lp-card lp-duracion">
          <div class="es-tit">${t('title.minimumDuration')}</div>
          <p class="lp-grande">${t('label.20seconds')}</p>
        </section>
      </div>
    </div>
  `;
  lpAutoTodos();
}
function resetManosPasos(){ DB.limpieza.manosPasos[currentArea()] = [...getLimpiezaDefaultManos()]; saveDB(); renderLimpiezaManos(); showToast(t('msg.stepsReset')); }
function moveManosPaso(i,dir){
  moveArrayItem(limpiezaManosPasos(), i, dir);
  saveDB();
  renderLimpiezaManos();
}
function updateManosPaso(i, val){ if(!editUnlocked) return; limpiezaManosPasos()[i] = val; saveDB(); }
function addManosPaso(){ limpiezaManosPasos().push(t('label.newStep')); saveDB(); renderLimpiezaManos(); }
async function removeManosPaso(i){
  const pasos = limpiezaManosPasos();
  if(pasos.length<=1) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  pasos.splice(i,1);
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderLimpiezaManos());
}
/* ============== Apertura y cierre como lista de comprobación (31/10) ==============
   Cada paso se contesta Sí o No; hasta que no están TODOS contestados no se puede guardar. Se guarda lo que se contestó (y una nota
   si hubo un «No»), no solo «se hizo»: en una inspección importa saber QUÉ no estaba bien. Las respuestas se quedan en este aparato
   mientras se rellena (no se sincronizan a medias); al guardar pasan al registro de hoy. */
let lpBorrador = {};   // {'cocina:apertura': {fecha, resp:{i:true|false}, nota:{i:texto}}}
let lpEditandoPasos = {};  // {apertura:bool, cierre:bool}
function lpBorradorDe(type){
  const k = currentArea() + ':' + type;
  const hoy = todayStr();
  if(!lpBorrador[k] || lpBorrador[k].fecha !== hoy) lpBorrador[k] = {fecha: hoy, resp: {}, nota: {}};
  return lpBorrador[k];
}
function lpBorradorReset(type){ delete lpBorrador[currentArea() + ':' + type]; }
function lpCheckResp(type, i, valor){
  const b = lpBorradorDe(type);
  b.resp[i] = valor;
  if(valor) delete b.nota[i];
  withScrollPreserved(() => renderLimpiezaProtocolo());
}
function lpCheckNota(type, i, texto){ lpBorradorDe(type).nota[i] = texto; }
function lpEditarPasos(type, si){ lpEditandoPasos[type] = !!si; lpBorradorReset(type); renderLimpiezaProtocolo(); }
function renderLimpiezaProtocolo(){
  const box = document.getElementById('limpieza-tab-content');
  const hoy = todayStr();
  const renderBlock = (title, icon, type) => {
    const pasos = limpiezaProtocoloPasos(type);
    const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
    const log = (DB.limpieza[logKey] || []).filter(e => (e.area||'cocina')===currentArea());
    const deHoy = log.find(e => e.fecha === hoy);
    const nombreDe = entry => entry.responsableNombre || (entry.responsableId ? (DB.employees.find(e=>e.id===entry.responsableId)||{}).name : null);
    const editando = !!lpEditandoPasos[type] && editUnlocked;
    const b = lpBorradorDe(type);
    const contestados = pasos.filter((_, i) => b.resp[i] === true || b.resp[i] === false).length;
    const noes = pasos.filter((_, i) => b.resp[i] === false).length;
    const completo = pasos.length > 0 && contestados === pasos.length;
    // Los últimos tres días (es lo que se conserva): un punto verde por cada día que se registró.
    const dias = [2, 1, 0].map(n => { const ds = addDaysStr(hoy, -n); return {ds, hecho: log.some(e => e.fecha === ds)}; });
    const historial = [...log].reverse().slice(0, 5);
    const resumenEntrada = e => (e.respuestas && e.respuestas.length) ? `${e.si} ${gl({es:'Sí', ca:'Sí', en:'Yes'})} · ${e.no} No` : '';
    let lista;
    if(editando){
      lista = pasos.map((p,i) => lpPasoHtml(i, pasos.length, p, `updateProtocoloPaso('${type}',${i},this.value)`, d => `moveProtocoloPaso('${type}',${i},${d})`, `removeProtocoloPaso('${type}',${i})`)).join('')
        + `<div class="lp-edicion-bt"><button type="button" class="owner-strict btn btn-fino" onclick="addProtocoloPaso('${type}')"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button><button type="button" class="btn btn-fino is-on" onclick="lpEditarPasos('${type}', false)"><i class="ti ti-check"></i> ${gl({es:'Listo', ca:'Llest', en:'Done'})}</button></div>`;
    } else if(deHoy){
      // Ya registrado hoy: se ve lo que se contestó, sin posibilidad de repetirlo.
      lista = (deHoy.respuestas && deHoy.respuestas.length ? deHoy.respuestas : pasos.map(texto => ({texto, ok: null}))).map((r, i) => `
        <div class="lp-chk is-cerrado">
          <span class="lp-num">${i+1}</span>
          <div class="lp-chk-txt"><span>${escapeHtml(r.texto)}</span>${r.nota ? `<small class="lp-chk-nota"><i class="ti ti-note"></i> ${escapeHtml(r.nota)}</small>` : ''}</div>
          ${r.ok === true ? `<span class="lp-resp si"><i class="ti ti-check"></i> ${gl({es:'Sí', ca:'Sí', en:'Yes'})}</span>` : r.ok === false ? `<span class="lp-resp no"><i class="ti ti-x"></i> No</span>` : ''}
        </div>`).join('');
    } else {
      lista = pasos.map((p, i) => `
        <div class="lp-chk${b.resp[i] === false ? ' es-no' : b.resp[i] === true ? ' es-si' : ''}">
          <span class="lp-num">${i+1}</span>
          <div class="lp-chk-txt"><span>${escapeHtml(p)}</span>
            ${b.resp[i] === false ? `<textarea class="lp-chk-nota-in lp-auto-alto" rows="1" placeholder="${escapeHtml(gl({es:'¿Qué ha pasado? (opcional)', ca:'Què ha passat? (opcional)', en:'What happened? (optional)'}))}" oninput="lpAuto(this);lpCheckNota('${type}',${i},this.value)" aria-label="${escapeHtml(gl({es:'Qué ha pasado', ca:'Què ha passat', en:'What happened'}))}">${escapeHtml(b.nota[i] || '')}</textarea>` : ''}
          </div>
          <div class="lp-sino" role="group" aria-label="${escapeHtml(p)}">
            <button type="button" class="lp-sn si${b.resp[i] === true ? ' on' : ''}" aria-pressed="${b.resp[i] === true}" onclick="lpCheckResp('${type}',${i},true)"><i class="ti ti-check"></i> ${gl({es:'Sí', ca:'Sí', en:'Yes'})}</button>
            <button type="button" class="lp-sn no${b.resp[i] === false ? ' on' : ''}" aria-pressed="${b.resp[i] === false}" onclick="lpCheckResp('${type}',${i},false)"><i class="ti ti-x"></i> No</button>
          </div>
        </div>`).join('');
    }
    const pie = editando ? '' : deHoy
      ? `<div class="lp-cumple-ok"><i class="ti ti-circle-check"></i> <span>${escapeHtml(deHoy.fecha)} · ${escapeHtml(deHoy.hora||'')}${nombreDe(deHoy) ? ` · ${escapeHtml(nombreDe(deHoy))}` : ''}${resumenEntrada(deHoy) ? ` · ${resumenEntrada(deHoy)}` : ''}</span></div>`
      : `<div class="lp-guardar">
           <div class="lp-progreso"><b>${contestados}</b> / ${pasos.length} ${gl({es:'contestados', ca:'contestats', en:'answered'})}${noes ? ` · <span class="lp-no-n">${noes} No</span>` : ''}</div>
           <div class="dp-barra${completo ? ' ok' : ''}"><span style="width:${pasos.length ? Math.round(contestados / pasos.length * 100) : 0}%"></span></div>
           <button type="button" class="btn btn-fino is-on" ${completo ? '' : 'disabled'} onclick="registerProtocoloCompliance('${type}')"><i class="ti ti-device-floppy"></i> ${gl({es:'Guardar registro de hoy', ca:'Desar el registre d\'avui', en:'Save today\'s log'})}</button>
           ${completo ? '' : `<p class="pr-ayuda">${gl({es:'Contesta Sí o No en cada paso para poder guardar.', ca:'Contesta Sí o No a cada pas per poder desar.', en:'Answer Yes or No on every step to be able to save.'})}</p>`}
         </div>`;
    return `
    <section class="lp-card">
      <div class="lp-card-cab">
        <h3 class="dp-h"><i class="ti ti-${icon}"></i> ${title}</h3>
        <div class="lp-card-bt">
          ${editUnlocked && !editando ? `<button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(gl({es:'Editar los pasos', ca:'Editar els passos', en:'Edit the steps'}))}" aria-label="${escapeHtml(gl({es:'Editar los pasos', ca:'Editar els passos', en:'Edit the steps'}))}" onclick="lpEditarPasos('${type}', true)"><i class="ti ti-pencil"></i></button>` : ''}
          <button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(t('common.print'))}" aria-label="${escapeHtml(t('common.print'))}" onclick="printProtocolo('${type}')"><i class="ti ti-printer"></i></button>
          ${ggMenuAcciones([{icono:'ti-restore', texto:t('common.reset'), fn:`resetProtocoloPasos('${type}')`, estricto:true}], {clase:'btn btn-fino mn-btn pr-ico', tip:true, etiqueta:gl({es:'Más opciones', ca:'Més opcions', en:'More options'})})}
        </div>
      </div>
      ${lista}
      ${pie}
      <div class="lp-cumple">
        <div class="es-tit">${t('title.dailyCompliance')}</div>
        <div class="lp-dias" aria-label="${escapeHtml(gl({es:'Últimos tres días', ca:'Darrers tres dies', en:'Last three days'}))}">
          ${dias.map(d => `<span class="lp-dia${d.hecho ? ' ok' : ''}" title="${escapeHtml(d.ds)}"><i class="ti ${d.hecho ? 'ti-check' : 'ti-minus'}"></i>${escapeHtml(new Date(d.ds + 'T12:00:00').toLocaleDateString(localeActual(), {weekday:'short', day:'numeric'}))}</span>`).join('')}
        </div>
        ${historial.length ? `<ul class="lp-historial">${historial.map(entry => `<li><span>${escapeHtml(entry.fecha)} · ${escapeHtml(entry.hora||'')}${nombreDe(entry) ? ` · ${escapeHtml(nombreDe(entry))}` : ''}${resumenEntrada(entry) ? ` · <b>${resumenEntrada(entry)}</b>` : ''}</span>${ggMenuAcciones([{icono:'ti-trash', texto:t('common.delete'), fn:`deleteProtocoloComplianceEntry('${type}',${entry.id})`, peligro:true, estricto:true}], {clase:'btn btn-fino mn-btn lp-mas', tip:true})}</li>`).join('')}</ul>` : `<p class="pr-ayuda">${t('empty.noComplianceLog')}</p>`}
      </div>
    </section>`;
  };
  box.innerHTML = `<div class="lp-dos">${renderBlock(t('title.openingProtocol'),'sunrise','apertura')}${renderBlock(t('title.closingProtocol'),'sunset','cierre')}</div>`;
  lpRefrescarResumen();
}
function _protocoloKey(type){ return type==='apertura' ? 'aperturaPasos' : 'cierrePasos'; }
function updateProtocoloPaso(type,i,val){ if(!editUnlocked) return; limpiezaProtocoloPasos(type)[i] = val; saveDB(); }
function moveProtocoloPaso(type,i,dir){
  moveArrayItem(limpiezaProtocoloPasos(type), i, dir);
  lpBorradorReset(type);
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderLimpiezaProtocolo());
}
// Quién registra el cumplimiento lo decide la propia sesión con la que se
// ha entrado (igual que el chat interno), no un desplegable donde se podía
// "registrar en nombre de" cualquier compañero sin verificar que fuera él.
function registerProtocoloCompliance(type){
  const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
  const area = currentArea();
  const already = (DB.limpieza[logKey]||[]).find(e => e.fecha===todayStr() && (e.area||'cocina')===area);
  if(already){
    showToast(t('msg.complianceAlreadyToday').replace('${name}', already.responsableNombre || '?'));
    return;
  }
  const pasos = limpiezaProtocoloPasos(type);
  const b = lpBorradorDe(type);
  // Nada se guarda a medias: cada paso tiene que estar contestado, y el aviso dice cuántos faltan.
  const faltan = pasos.filter((_, i) => b.resp[i] !== true && b.resp[i] !== false).length;
  if(faltan){ showToast(gl({es:'Faltan ' + faltan + ' pasos por contestar (Sí o No).', ca:'Falten ' + faltan + ' passos per contestar (Sí o No).', en:faltan + ' steps left to answer (Yes or No).'})); return; }
  const respuestas = pasos.map((texto, i) => ({texto, ok: b.resp[i] === true, nota: b.resp[i] === false ? (b.nota[i] || '').trim() : ''}));
  const now = new Date();
  const authorId = getChatAuthor();
  DB.limpieza[logKey].push({
    id: genId(), fecha: todayStr(), hora: now.toTimeString().slice(0,5),
    responsableId: authorId==='owner' ? null : authorId,
    responsableNombre: getChatAuthorName(authorId),
    area: currentArea(),
    respuestas, si: respuestas.filter(r => r.ok).length, no: respuestas.filter(r => !r.ok).length
  });
  lpBorradorReset(type);
  saveDB();
  renderLimpiezaProtocolo();
  showToast(t('msg.complianceRegistered'));
}
// Registro APPCC (prueba de cumplimiento ante una inspección): borrarlo
// exige el PIN de negocio y queda auditado, igual que cualquier otro dato
// sensible — antes bastaba un simple "¿seguro?" y lo podía borrar cualquier
// empleado con edición desbloqueada.
function deleteProtocoloComplianceEntry(type, id){
  requestBusinessPinAction(t('title.deleteComplianceEntry'), t('msg.confirmDeleteComplianceEntry'), () => {
    const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
    const entry = DB.limpieza[logKey].find(x => x.id === id);
    DB.limpieza[logKey] = DB.limpieza[logKey].filter(x => x.id !== id);
    if(entry) logAudit('delete', t('audit.deletedComplianceEntry').replace('${type}', type==='apertura'?t('title.openingProtocol'):t('title.closingProtocol')).replace('${date}', entry.fecha));
    saveDB();
    closeModal();
    renderLimpiezaProtocolo();
  });
}
function addProtocoloPaso(type){ limpiezaProtocoloPasos(type).push(t('label.newStep')); lpBorradorReset(type); saveDB(); renderLimpiezaProtocolo(); }
async function removeProtocoloPaso(type,i){
  const pasos = limpiezaProtocoloPasos(type);
  if(pasos.length<=1) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  pasos.splice(i,1);
  lpBorradorReset(type);
  saveDB();
  renderLimpiezaProtocolo();
}
function resetProtocoloPasos(type){
  const area = currentArea();
  const isSala = area === 'sala';
  DB.limpieza[_protocoloKey(type)][area] = [...(type==='apertura' ? (isSala?getLimpiezaDefaultAperturaSala():getLimpiezaDefaultApertura()) : (isSala?getLimpiezaDefaultCierreSala():getLimpiezaDefaultCierre()))];
  lpBorradorReset(type); saveDB(); renderLimpiezaProtocolo(); showToast(t('msg.stepsReset'));
}
function printProtocolo(type){
  const pasos = limpiezaProtocoloPasos(type);
  const title = type==='apertura' ? t('title.openingProtocol') : t('title.closingProtocol');
  const body = `
    ${printReportHeaderHtml(title)}
    ${printChecklistHtml(pasos)}
  `;
  printReportWindow(title, body);
}
function printManosProtocolo(){
  const pasos = limpiezaManosPasos();
  const title = t('title.handWashingProtocol');
  const body = `
    ${printReportHeaderHtml(title)}
    ${printChecklistHtml(pasos, {sinTurno: true})}
  `;
  printReportWindow(title, body);
}

async function deleteLimpiezaTarea(id){
  if(!(await confirmModal(t('msg.confirmDeleteTask')))) return;
  DB.limpieza.tareas = DB.limpieza.tareas.filter(t => t.id!==id);
  saveDB();
  renderLimpiezaTab();
}

// Checklist del mes para una fecha concreta. Dos tipos de tarea conviven:
// las mensuales se definen por "día del mes" (t.diaMes, 1-31) y se repiten
// todos los meses; las puntuales (5/09, a petición del dueño: antes solo se
// podían crear tareas que se repitieran cada mes, sin forma de anotar una
// limpieza de un día suelto) llevan una fecha exacta (t.fecha) y no vuelven
// a aparecer. El checkKey de si se hizo o no sí es siempre por mes concreto
// (monthKey), en DB.limpieza.checksMes, para las dos.
function limpiezaTareasParaDia(date){
  const day = date.getDate();
  const fecha = dateStr(date);
  return DB.limpieza.tareas.filter(t => (t.zona||'cocina')===currentArea() && (
    (t.tipo === 'mensual' && parseInt(t.diaMes)===day) ||
    (t.tipo === 'puntual' && t.fecha === fecha)
  ));
}
function limpiezaMonthKeyFor(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function limpiezaChecksFor(monthKey){
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  return DB.limpieza.checksMes[monthKey];
}
// Fila de detalle completo de una tarea (nombre, checkbox, responsable) —
// compartida por la vista de semana y la de día, donde sí hay sitio de
// sobra para verla entera (a diferencia de la casilla del mes, que ahora
// solo muestra un contador).
function limpiezaTareaRowHtml(tarea, checks, monthKey, compacta){
  // OJO: el parámetro NUNCA debe llamarse "t" — tapa a la función global de
  // traducción t() y provoca "t is not a function" en cuanto se pinta una
  // tarea ya hecha o asignada a otra persona, rompiendo el render entero.
  const resp = tarea.responsableId ? DB.employees.find(e=>e.id===tarea.responsableId) : null;
  const info = limpiezaCheckInfo(checks, tarea.id);
  const canToggle = canToggleLimpiezaTarea(tarea);
  const quien = info ? `${t('limpieza.doneOn').replace('${date}', escapeHtml(info.fecha||''))} ${escapeHtml(info.hora||'')}${info.checkedByNombre ? ` · ${escapeHtml(info.checkedByNombre)}` : ''}` : '';
  return `
    <div class="lp-tarea${info ? ' is-hecha' : ''}${compacta ? ' es-compacta' : ''}">
      <label class="dp-check${canToggle ? '' : ' is-off'}" title="${escapeHtml(canToggle ? t('title.markAsDone') : t('limpieza.notYourTaskToast'))}">
        <input type="checkbox" ${info ? 'checked' : ''} ${canToggle ? '' : 'disabled'} onchange="toggleLimpiezaCheckMes('${monthKey}',${tarea.id},this.checked)" aria-label="${escapeHtml(t('title.markAsDone') + ': ' + tarea.area)}">
        <span class="dp-check-caja"><i class="ti ti-check"></i></span>
      </label>
      <div class="lp-tarea-txt">
        <span class="dp-txt">${escapeHtml(tarea.area)}${tarea.tipo==='puntual' ? ` <i class="ti ti-calendar-event lp-puntual" title="${escapeHtml(t('limpieza.recurrenceOnce'))}"></i>` : ''}</span>
        <span class="lp-tarea-sub">
          ${tarea.producto ? `<span><i class="ti ti-spray"></i> ${escapeHtml(tarea.producto)}</span>` : ''}
          ${resp ? `<span class="lp-resp"><i style="background:${escapeHtml(resp.color||'#DF7039')}"></i>${escapeHtml(resp.name)}</span>` : ''}
          ${quien ? `<span class="lp-hecha-por"><i class="ti ti-check"></i> ${quien}</span>` : ''}
        </span>
      </div>
      ${ggMenuAcciones([
        {icono:'ti-pencil', texto:t('common.edit'), fn:`openLimpiezaTareaMesModal(${tarea.id})`, estricto:true},
        {icono:'ti-trash', texto:t('common.delete'), fn:`deleteLimpiezaTarea(${tarea.id})`, peligro:true, estricto:true}
      ], {clase:'btn btn-fino mn-btn lp-mas', tip:true})}
    </div>`;
}
function setLimpiezaCalMode(mode){ limpiezaCalMode = mode; renderLimpiezaMes(); }
function shiftLimpiezaCal(delta){
  const d = new Date(limpiezaCalDate);
  if(limpiezaCalMode==='dia') d.setDate(d.getDate()+delta);
  else if(limpiezaCalMode==='semana') d.setDate(d.getDate()+delta*7);
  else{
    // Sin normalizar el día, cambiar de mes estando en un 29/30/31 puede
    // saltarse un mes entero: 31 ene + 1 mes = "31 feb" no existe, Date lo
    // rebota a marzo (Date.setMonth no clampa) — nunca se llegaba a ver
    // febrero. Se fuerza al día 1 antes de cambiar de mes, que es lo único
    // que importa aquí (mes/año), y luego se recalcula el día real si hacía
    // falta conservarlo — pero como esta vista solo pinta el mes entero,
    // basta con día 1.
    d.setDate(1);
    d.setMonth(d.getMonth()+delta);
  }
  limpiezaCalDate = d;
  renderLimpiezaMes();
}
function goToLimpiezaDia(dateStrVal){
  limpiezaCalDate = new Date(dateStrVal+'T00:00:00');
  limpiezaCalMode = 'dia';
  renderLimpiezaMes();
}
function limpiezaMesCb(anio, mes){
  limpiezaCalDate = new Date(anio, mes, Math.min((limpiezaCalDate || new Date()).getDate(), 28));
  renderLimpiezaMes();
}
function limpiezaHoy(){ limpiezaCalDate = new Date(); renderLimpiezaMes(); }
function renderLimpiezaMes(){
  const box = document.getElementById('limpieza-tab-content');
  if(!limpiezaCalDate) limpiezaCalDate = new Date();
  const modo = (m, txt, ico) => `<button type="button" class="btn btn-sm btn-fino${limpiezaCalMode===m ? ' is-on active' : ''}" aria-pressed="${limpiezaCalMode===m}" onclick="setLimpiezaCalMode('${m}')"><i class="ti ${ico}"></i> ${txt}</button>`;
  const hoyDs = todayStr();
  const tareasZona = DB.limpieza.tareas.filter(x => (x.zona||'cocina')===currentArea() && (x.tipo === 'mensual' || x.tipo === 'puntual'));
  let nav = '', cuerpo = '';
  const flecha = (d, txt, ico) => `<button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(txt)}" aria-label="${escapeHtml(txt)}" onclick="shiftLimpiezaCal(${d})"><i class="ti ${ico}"></i></button>`;
  if(limpiezaCalMode === 'mes'){
    const year = limpiezaCalDate.getFullYear(), month = limpiezaCalDate.getMonth();
    // Cuántas tareas hay en cada mes, para el selector de periodo (solo las puntuales cambian de mes a mes; las mensuales están en todos).
    const porMes = {};
    for(let i = -6; i <= 6; i++){
      const f = new Date(year, month + i, 1);
      const k = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`;
      porMes[k] = tareasZona.filter(x => x.tipo === 'mensual' || (x.fecha||'').slice(0,7) === k).length;
    }
    nav = `<div class="cal-nav">${ggPeriodoHtml({anio: year, mes: month, cb: 'limpiezaMesCb', datos: porMes, anual: false})}</div>`;
    const startOffset = (new Date(year, month, 1).getDay()+6)%7;
    const daysInMonth = new Date(year, month+1, 0).getDate();
    let cells = '';
    for(let i=0; i<startOffset; i++) cells += `<div class="cal-mes-vacia"></div>`;
    for(let day=1; day<=daysInMonth; day++){
      const fecha = new Date(year, month, day);
      const tareasDia = limpiezaTareasParaDia(fecha);
      const checks = limpiezaChecksFor(limpiezaMonthKeyFor(fecha));
      const hechas = tareasDia.filter(tk => limpiezaCheckInfo(checks, tk.id)).length;
      const ds = dateStr(fecha);
      const dow = (startOffset + day - 1) % 7;
      const pend = ds < hoyDs && tareasDia.length > hechas;
      cells += `
        <button type="button" class="cal-mes-dia${ds === hoyDs ? ' is-hoy' : ''}${dow >= 5 ? ' es-finde' : ''}${tareasDia.length ? ' tiene' : ''}${pend ? ' is-pend' : ''}" onclick="goToLimpiezaDia('${ds}')" aria-label="${escapeHtml(`${day} ${monthFull(month)}: ${tareasDia.length === 1 ? t('limpieza.oneTask') : t('limpieza.nTasks').replace('${n}', tareasDia.length)}`)}">
          <span class="cal-mes-n">${day}</span>
          ${tareasDia.length ? `<span class="cal-mes-c"><i class="ti ti-spray"></i> ${hechas}/${tareasDia.length}</span>` : ''}
        </button>`;
    }
    cuerpo = `<div class="cal-mes">${t('days.short').map((d, i) => `<div class="cal-mes-cab${i >= 5 ? ' es-finde' : ''}">${d}</div>`).join('')}${cells}</div>`;
  } else if(limpiezaCalMode === 'semana'){
    const dow = (limpiezaCalDate.getDay()+6)%7;
    const monday = new Date(limpiezaCalDate); monday.setDate(limpiezaCalDate.getDate()-dow);
    const days = Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });
    nav = `<div class="cal-nav">${flecha(-1, t('title.prevWeek'), 'ti-chevron-left')}<strong class="cal-nav-txt">${days[0].toLocaleDateString(localeActual(), {day:'numeric', month:'short'})} – ${days[6].toLocaleDateString(localeActual(), {day:'numeric', month:'short', year:'numeric'})}</strong>${flecha(1, t('title.nextWeek'), 'ti-chevron-right')}<button type="button" class="btn btn-sm btn-fino" onclick="limpiezaHoy()">${t('common.today')}</button></div>`;
    cuerpo = `<div class="lp-semana">${days.map(d => {
      const tareasDelDia = limpiezaTareasParaDia(d);
      const monthKey = limpiezaMonthKeyFor(d);
      const checks = limpiezaChecksFor(monthKey);
      const ds = dateStr(d);
      return `
        <section class="lp-semana-dia${ds === hoyDs ? ' is-hoy' : ''}">
          <button type="button" class="lp-semana-cab" onclick="goToLimpiezaDia('${ds}')"><span>${t('days.short')[(d.getDay()+6)%7]}</span><b>${d.getDate()}</b></button>
          ${tareasDelDia.length ? tareasDelDia.map(tarea => limpiezaTareaRowHtml(tarea, checks, monthKey, true)).join('') : `<div class="cal-nada lp-nada">—</div>`}
        </section>`;
    }).join('')}</div>`;
  } else {
    const monthKey = limpiezaMonthKeyFor(limpiezaCalDate);
    const checks = limpiezaChecksFor(monthKey);
    const tareasDelDia = limpiezaTareasParaDia(limpiezaCalDate);
    const hechas = tareasDelDia.filter(tk => limpiezaCheckInfo(checks, tk.id)).length;
    nav = `<div class="cal-nav">${flecha(-1, gl({es:'Día anterior', ca:'Dia anterior', en:'Previous day'}), 'ti-chevron-left')}<strong class="cal-nav-txt lp-fecha">${escapeHtml(limpiezaCalDate.toLocaleDateString(localeActual(), {weekday:'long', day:'numeric', month:'long', year:'numeric'}))}</strong>${flecha(1, gl({es:'Día siguiente', ca:'Dia següent', en:'Next day'}), 'ti-chevron-right')}${dateStr(limpiezaCalDate) !== hoyDs ? `<button type="button" class="btn btn-sm btn-fino" onclick="limpiezaHoy()">${t('common.today')}</button>` : ''}</div>`;
    cuerpo = tareasDelDia.length
      ? `<section class="lp-card"><div class="dp-dia-cab"><h3 class="dp-h">${t('tab.monthlyCleaning')}</h3><span class="dp-dia-cuenta">${hechas} / ${tareasDelDia.length}</span></div>${tareasDelDia.map(tarea => limpiezaTareaRowHtml(tarea, checks, monthKey)).join('')}</section>`
      : `<div class="empty es-vacio"><i class="ti ti-calendar-month"></i>${t('empty.noMonthlyCleaningTasks')}</div>`;
  }
  box.innerHTML = `
    <div class="lp-barra">
      <div class="cal-modos" role="group">${modo('dia', t('togocal.dia'), 'ti-calendar-event')}${modo('semana', t('togocal.semana'), 'ti-calendar-week')}${modo('mes', t('togocal.mes'), 'ti-calendar-month')}</div>
      <button type="button" class="owner-strict btn btn-fino is-on" onclick="openLimpiezaTareaMesModal()"><i class="ti ti-plus"></i> ${t('btn.addTask')}</button>
    </div>
    ${tareasZona.length ? nav + cuerpo : `<div class="empty es-vacio"><i class="ti ti-calendar-month"></i>${t('empty.noMonthlyCleaningTasks')}</div>`}
  `;
  lpRefrescarResumen();
}
// Una tarea marcada como hecha guarda quién y cuándo (no solo un booleano
// reversible), para dejar traza APPCC de verdad; los valores antiguos (un
// simple true/false) se siguen leyendo bien vía limpiezaCheckInfo().
function limpiezaCheckInfo(checks, taskId){
  const v = checks ? checks[taskId] : null;
  if(v && typeof v === 'object') return v;
  return v ? {done:true} : null;
}
// Como el login ya identifica a cada persona, cada uno solo puede marcar
// como hecha su propia tarea asignada — el dueño puede marcar cualquiera.
// Una tarea sin responsable asignado es de cualquiera del área (compartida).
function canToggleLimpiezaTarea(tarea){
  if((getAccessSession()||{}).type === 'owner') return true;
  if(tarea.responsableId == null) return true;
  const empId = loggedInEmployeeId();
  return empId != null && empId === tarea.responsableId;
}
async function toggleLimpiezaCheckMes(monthKey, tareaId, val){
  const tarea = DB.limpieza.tareas.find(x => x.id === tareaId);
  if(tarea && !canToggleLimpiezaTarea(tarea)){ showToast(t('limpieza.notYourTaskToast')); renderLimpiezaMes(); return; }
  if(!val && !(await dpConfirmarDesmarcar())){ renderLimpiezaMes(); return; }
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  // Quién lo marca lo dice la sesión, no un campo a elegir — igual que el
  // registro de cumplimiento del protocolo de apertura/cierre.
  const authorId = getChatAuthor();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5), checkedByNombre: getChatAuthorName(authorId)} : null;
  if(val && tarea && typeof logAudit === 'function') logAudit('task_done', t('audit.taskMarkedDone').replace('${name}', tarea.producto||tarea.area||'?'));
  saveDB();
  renderLimpiezaMes();
}
async function toggleLimpiezaCheckMesFromDist(monthKey, tareaId, val){
  const tarea = DB.limpieza.tareas.find(x => x.id === tareaId);
  if(tarea && !canToggleLimpiezaTarea(tarea)){ showToast(t('limpieza.notYourTaskToast')); renderDistDetail(); return; }
  if(!val && !(await dpConfirmarDesmarcar())){ renderDistDetail(); return; }
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  const authorId = getChatAuthor();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5), checkedByNombre: getChatAuthorName(authorId)} : null;
  if(val && tarea && typeof logAudit === 'function') logAudit('task_done', t('audit.taskMarkedDone').replace('${name}', tarea.producto||tarea.area||'?'));
  saveDB();
  renderDistDetail();
}

function openLimpiezaTareaMesModal(id){
  const tarea = id ? DB.limpieza.tareas.find(x=>x.id===id) : null;
  const empOptions = DB.employees.filter(e=>(e.area||'cocina')===currentArea()).map(e=>`<option value="${e.id}"${tarea&&tarea.responsableId===e.id?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const esPuntual = tarea ? tarea.tipo === 'puntual' : false;
  // Fecha por defecto para una tarea puntual nueva: el día que se estaba
  // viendo en el calendario (si se pulsó "+ Tarea" desde la vista de día),
  // o si no hoy — nunca en blanco.
  const fechaDefault = tarea && tarea.fecha ? tarea.fecha : (limpiezaCalDate ? dateStr(limpiezaCalDate) : todayStr());
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-spray"></i> ${tarea?t('common.edit'):t('common.newF')} ${t('limpieza.monthlyTask')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label for="new-limpieza-area">${t('limpieza.areaOrTask')}</label>
      <input type="text" id="new-limpieza-area" value="${tarea?escapeHtml(tarea.area):''}" placeholder="${currentArea()==='sala' ? t('limpieza.areaPhSala') : t('limpieza.areaPhCocina')}">
    </div>
    <div class="field">
      <label for="new-limpieza-producto">${t('limpieza.cleaningProduct')}</label>
      <input type="text" id="new-limpieza-producto" value="${tarea?escapeHtml(tarea.producto||''):''}" placeholder="${t('limpieza.productPh')}">
    </div>
    <div class="field">
      <label for="new-limpieza-tipo">${t('limpieza.recurrence')}</label>
      <select id="new-limpieza-tipo" onchange="toggleLimpiezaTareaTipoFields(this.value)">
        <option value="mensual" ${!esPuntual?'selected':''}>${t('limpieza.recurrenceMonthly')}</option>
        <option value="puntual" ${esPuntual?'selected':''}>${t('limpieza.recurrenceOnce')}</option>
      </select>
    </div>
    <div class="field-row">
      <div class="field" id="limpieza-diames-wrap" style="${esPuntual?'display:none':''}">
        <label for="new-limpieza-diames">${t('limpieza.dayOfMonth')}</label>
        <input type="number" id="new-limpieza-diames" min="1" max="31" value="${tarea&&tarea.diaMes?tarea.diaMes:1}">
      </div>
      <div class="field" id="limpieza-fecha-wrap" style="${esPuntual?'':'display:none'}">
        <label for="new-limpieza-fecha">${t('limpieza.oneOffDate')}</label>
        <input type="date" id="new-limpieza-fecha" value="${escapeHtml(fechaDefault)}">
      </div>
      <div class="field">
        <label for="new-limpieza-responsable">${t('label.responsible')}</label>
        <select id="new-limpieza-responsable">
          <option value="">${t('common.unassigned')}</option>
          ${empOptions}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      ${tarea ? `<button type="button" class="owner-strict btn btn-fino is-off" style="margin-right:auto" onclick="deleteLimpiezaTarea(${tarea.id});closeModal()"><i class="ti ti-trash"></i> ${t("common.delete")}</button>` : ''}
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t("common.cancel")}</button>
      <button type="button" class="btn btn-fino is-on" onclick="confirmLimpiezaTareaMes(${tarea?tarea.id:'null'})"><i class="ti ti-check"></i> ${tarea?t('common.save'):t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-limpieza-area')?.focus(), 50);
}
function toggleLimpiezaTareaTipoFields(tipo){
  document.getElementById('limpieza-diames-wrap').style.display = tipo==='puntual' ? 'none' : '';
  document.getElementById('limpieza-fecha-wrap').style.display = tipo==='puntual' ? '' : 'none';
}
function confirmLimpiezaTareaMes(id){
  const area = document.getElementById('new-limpieza-area').value;
  if(!area || !area.trim()){ showToast(t('msg.writeAreaTask')); return; }
  const producto = document.getElementById('new-limpieza-producto').value || '';
  const tipo = document.getElementById('new-limpieza-tipo').value === 'puntual' ? 'puntual' : 'mensual';
  let dia = null, fecha = null;
  if(tipo === 'puntual'){
    fecha = document.getElementById('new-limpieza-fecha').value;
    if(!fecha){ showToast(t('msg.chooseOneOffDate')); return; }
  } else {
    dia = parseInt(document.getElementById('new-limpieza-diames').value) || 1;
    dia = Math.min(31, Math.max(1, dia));
  }
  const responsableVal = document.getElementById('new-limpieza-responsable').value;
  const responsableId = responsableVal ? parseInt(responsableVal) : null;
  if(id){
    const tarea = DB.limpieza.tareas.find(x=>x.id===id);
    // Al cambiar de tipo se suelta el campo del tipo anterior (una tarea
    // puntual no debe arrastrar un diaMes viejo que la resucitaría cada mes
    // si algún día se le vuelve a cambiar el tipo, y viceversa).
    Object.assign(tarea, {area: area.trim(), producto: producto.trim(), tipo, diaMes: dia, fecha, responsableId});
  } else {
    // Ojo: "area" aquí es el campo de texto libre ("Campana extractora"...);
    // el área de negocio (cocina/sala) se guarda aparte como zona, para poder
    // filtrar sin chocar con ese nombre de campo ya existente.
    DB.limpieza.tareas.push({id: genId(), area: area.trim(), producto: producto.trim(), tipo, diaMes: dia, fecha, responsableId, zona: currentArea()});
  }
  saveDB();
  closeModal();
  renderLimpiezaTab();
}

// Qué hay en cada equipo: la última lectura, si está dentro de rango y si hoy ya se ha mirado. Pulsar la tarjeta deja el formulario
// preparado para anotar la siguiente lectura de ESE equipo.
function lpEquiposTemp(entries){
  const porEquipo = new Map();
  entries.forEach(e => {
    const nombre = String(e.equipo||'').trim();
    if(!nombre) return;
    const k = nombre.toLowerCase();
    const prev = porEquipo.get(k);
    const sello = (e.fecha||'') + ' ' + (e.hora||'');
    if(!prev || sello >= prev.sello) porEquipo.set(k, {nombre, e, sello});
  });
  return [...porEquipo.values()].sort((a,b) => a.nombre.localeCompare(b.nombre));
}
function lpPrefillEquipo(nombre, tipo){
  const eq = document.getElementById('lp-temperaturas-equipo'), ti = document.getElementById('lp-temperaturas-tipo'), te = document.getElementById('lp-temperaturas-temp');
  if(eq) eq.value = nombre;
  if(ti && tipo) ti.value = tipo;
  if(te){ te.focus(); te.scrollIntoView({block:'center', behavior:'smooth'}); }
}
function renderLimpiezaLog(key){
  const box = document.getElementById('limpieza-tab-content');
  const cfg = limpiezaLogConfig(key);
  const entries = DB.limpieza[key].filter(e => (e.zona||'cocina')===currentArea());
  const hoy = todayStr();

  // "Responsable" ya no se escribe/elige a mano: lo dice la sesión con la
  // que se ha entrado (igual que el cumplimiento de apertura/cierre), así
  // que ni siquiera aparece como campo del formulario — se rellena solo al
  // guardar y se ve en la tabla como cualquier otro dato ya registrado.
  const formFields = cfg.fields.filter(f => f !== 'responsable').map((f) => {
    const i = cfg.fields.indexOf(f);
    let input;
    if(f === 'estado' && key === 'temperaturas') input = `<div class="pr-ayuda lp-auto">${t('label.autoCalculated')}</div>`;
    else if(f === 'estado') input = `<select id="lp-${key}-${f}"><option value="OK">OK</option><option value="NOK">No OK</option></select>`;
    else if(f === 'tipo' && key === 'temperaturas') input = `<select id="lp-${key}-${f}">${limpiezaTempTipoOptions().map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`;
    // En una barra los equipos son otros: se sugieren los de siempre (se puede escribir cualquiera).
    else if(f === 'equipo' && key === 'temperaturas' && currentArea() === 'sala') input = `<input type="text" id="lp-${key}-${f}" list="lp-equipos-sala" placeholder="${escapeHtml(cfg.labels[i])}"><datalist id="lp-equipos-sala">${[gl({es:'Cámara de cerveza', ca:'Cambra de cervesa', en:'Beer cooler'}), gl({es:'Botellero', ca:'Ampollero', en:'Bottle fridge'}), gl({es:'Máquina de hielo', ca:'Màquina de gel', en:'Ice machine'}), gl({es:'Nevera de barra', ca:'Nevera de barra', en:'Bar fridge'}), gl({es:'Vitrina de postres', ca:'Vitrina de postres', en:'Dessert display'})].map(n => `<option value="${escapeHtml(n)}"></option>`).join('')}</datalist>`;
    else if(f === 'fecha') input = `<input type="date" id="lp-${key}-${f}" value="${hoy}" max="${hoy}">`;
    else if(f === 'proxima' && key === 'plagas') input = `<input type="date" id="lp-${key}-${f}">`;
    else if(f === 'hora') input = `<input type="time" id="lp-${key}-${f}">`;
    else if(f === 'temp' && key === 'temperaturas') input = `<input type="number" step="0.1" min="-60" max="300" inputmode="decimal" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    else if(['hallazgos','accion','area'].includes(f)) input = `<textarea class="lp-auto-alto" rows="1" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}" oninput="lpAuto(this)"></textarea>`;
    else input = `<input type="text" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    return `<div class="field${['hallazgos','accion'].includes(f) ? ' lp-ancho' : ''}" style="margin-bottom:0"><label for="lp-${key}-${f}">${cfg.labels[i]}</label>${input}</div>`;
  }).join('');

  /* Un registro de temperaturas se escribe varias veces al día: en un mes
     son cientos de filas y encontrar la de ayer obligaba a bajar media
     pantalla. Se enseñan los DIEZ últimos, que es lo que se mira a diario,
     con un botón para ver el resto — nunca se borra nada solo: un registro
     APPCC hay que poder enseñarlo en una inspección, y borrarlo sigue
     exigiendo el PIN de negocio y quedando auditado. */
  const LOG_VISIBLES = 10;
  const todos = [...entries].slice().reverse();
  const visibles = limpiezaLogVerTodo[key] ? todos : todos.slice(0, LOG_VISIBLES);
  const ocultos = todos.length - visibles.length;

  const rows = visibles.length ? visibles.map(e => `
    <tr>${cfg.fields.map((f, i) => {
      const et = `data-label="${escapeHtml(cfg.labels[i])}"`;
      if(f === 'estado'){
        if(e[f]==='OK') return `<td ${et}><span class="lp-estado ok"><i class="ti ti-check"></i> OK</span></td>`;
        if(e[f]==='NOK') return `<td ${et}><span class="lp-estado nok"><i class="ti ti-x"></i> No OK</span></td>`;
        return `<td ${et}><span class="lp-estado"><i class="ti ti-info-circle"></i> ${t('status.notEvaluated')}</span></td>`;
      }
      if(f === 'tipo' && key === 'temperaturas') return `<td ${et}>${escapeHtml(limpiezaTempTipoLabel(e[f]))}</td>`;
      if(f === 'temp' && key === 'temperaturas') return `<td ${et}><b class="lp-num-t">${escapeHtml(String(e[f] ?? '—'))}${e[f] !== '' && e[f] != null ? ' °C' : ''}</b></td>`;
      if(f === 'proxima' && key === 'plagas'){
        if(!e.proxima) return `<td ${et}>—</td>`;
        const due = limpiezaMantenimientoDueStatus({proximo: e.proxima});
        return `<td ${et}>${escapeHtml(e.proxima)}${due==='overdue'?` <span class="badge badge-red"><i class="ti ti-alert-triangle"></i> ${t('badge.overdue')}</span>`:''}${due==='soon'?` <span class="badge badge-amber"><i class="ti ti-clock"></i> ${t('badge.dueSoon')}</span>`:''}</td>`;
      }
      return `<td ${et}>${escapeHtml(String(e[f]||'—'))}</td>`;
    }).join('')}<td class="lp-fila-acc">${ggMenuAcciones([{icono:'ti-trash', texto:t('common.delete'), fn:`deleteLimpiezaLogEntry('${key}',${e.id})`, peligro:true, estricto:true}], {clase:'btn btn-fino mn-btn lp-mas', tip:true})}</td></tr>
  `).join('') : `<tr><td colspan="${cfg.fields.length+1}"><div class="empty es-vacio">${t('empty.noLogEntries')}</div></td></tr>`;

  // El control de temperaturas es una tarea operativa normal del día a día
  // (mirar la cámara, anotar el grado) que puede hacer cualquier empleado
  // de cocina, no una acción sensible que exija permiso de editar — a
  // diferencia de borrar un registro ya hecho, que sí sigue exigiéndolo
  // (no se toca un registro de seguridad alimentaria ya escrito sin más).
  const canAddThisLog = editUnlocked || key === 'temperaturas';
  const equipos = key === 'temperaturas' ? lpEquiposTemp(entries) : [];
  const tarjetasEquipo = equipos.length ? `
    <div class="lp-equipos">
      ${equipos.map(({nombre, e}) => {
        const hoyLeido = e.fecha === hoy;
        const nok = e.estado === 'NOK';
        return `<button type="button" class="lp-equipo${nok ? ' is-nok' : ''}${hoyLeido ? '' : ' es-viejo'}" ${canAddThisLog ? `onclick="lpPrefillEquipo('${escapeJsAttr(nombre)}','${escapeJsAttr(e.tipo||'')}')"` : 'disabled'}>
          <span class="lp-equipo-nom">${escapeHtml(nombre)}</span>
          <b class="lp-equipo-t">${escapeHtml(String(e.temp ?? '—'))}${e.temp !== '' && e.temp != null ? ' °C' : ''}</b>
          <span class="lp-equipo-sub">${nok ? `<i class="ti ti-alert-triangle"></i> ${gl({es:'Fuera de rango', ca:'Fora de rang', en:'Out of range'})}` : e.estado === 'OK' ? `<i class="ti ti-check"></i> OK` : ''} · ${hoyLeido ? escapeHtml(e.hora||gl({es:'hoy', ca:'avui', en:'today'})) : escapeHtml(e.fecha||'')}</span>
          ${hoyLeido ? '' : `<span class="lp-equipo-pend">${gl({es:'Sin lectura hoy', ca:'Sense lectura avui', en:'No reading today'})}</span>`}
        </button>`;
      }).join('')}
    </div>` : '';
  box.innerHTML = `
    ${tarjetasEquipo}
    <section class="lp-card lp-form">
      ${canAddThisLog ? `
      <div class="es-tit">${gl({es:'Nuevo registro', ca:'Nou registre', en:'New entry'})}</div>
      <div class="lp-form-campos">${formFields}</div>
      <button type="button" class="btn btn-fino is-on" onclick="addLimpiezaLogEntry('${key}')"><i class="ti ti-plus"></i> ${t('common.register')}</button>
      ` : `<div class="pr-ayuda"><i class="ti ti-lock"></i> ${t('msg.editModeRequiredForLog')}</div>`}
    </section>
    <div class="table-wrap lp-tabla">
      <table class="table-cards">
        <thead><tr>${cfg.labels.map(l=>`<th>${l}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${(ocultos > 0 || limpiezaLogVerTodo[key]) ? `
    <div class="lp-vermas">
      <button type="button" class="btn btn-sm btn-fino" onclick="toggleLimpiezaLogVerTodo('${key}')">
        <i class="ti ti-${limpiezaLogVerTodo[key]?'chevron-up':'history'}"></i>
        ${limpiezaLogVerTodo[key] ? t('limpieza.log.showLast').replace('${n}', LOG_VISIBLES) : t('limpieza.log.showAll').replace('${n}', todos.length)}
      </button>
      ${!limpiezaLogVerTodo[key] ? `<span class="pr-ayuda">${t('limpieza.log.hiddenCount').replace('${n}', ocultos)}</span>` : ''}
    </div>` : ''}
  `;
}
// Qué registros se ven enteros y cuáles solo los diez últimos. Es de la
// pantalla, no del negocio: no se guarda ni se sincroniza.
let limpiezaLogVerTodo = {};
function toggleLimpiezaLogVerTodo(key){
  limpiezaLogVerTodo[key] = !limpiezaLogVerTodo[key];
  renderLimpiezaLog(key);
}
async function addLimpiezaLogEntry(key){
  if(!editUnlocked && key !== 'temperaturas') return;
  const cfg = limpiezaLogConfig(key);
  // La fecha no puede ser futura (el campo ya lo limita con max, esto es
  // por si acaso) — sí se permite alguna del pasado reciente, para poder
  // anotar a posteriori una visita de control de plagas que llegó tarde.
  const fechaEl = document.getElementById(`lp-${key}-fecha`);
  if(fechaEl && fechaEl.value > todayStr()){ showToast(t('msg.dateCannotBeFuture')); return; }
  if(key === 'temperaturas'){
    const tempVal = parseFloat(document.getElementById(`lp-${key}-temp`).value);
    // No bloquea (podría ser un dato real raro), pero avisa de que igual es
    // un error de tecleo antes de guardar algo como "950°C" sin darse cuenta.
    if(!isNaN(tempVal) && (tempVal < -60 || tempVal > 300) && !(await confirmModal(t('msg.confirmExtremeTemp').replace('${temp}', tempVal)))) return;
  }
  const entry = {id: genId()};
  cfg.fields.forEach(f => {
    if(f === 'estado' && key === 'temperaturas') return; // se calcula solo, más abajo
    if(f === 'responsable') return; // se rellena solo, más abajo, según la sesión
    const el = document.getElementById(`lp-${key}-${f}`);
    entry[f] = el ? el.value : '';
  });
  if(key === 'temperaturas'){
    entry.estado = computeTempEstado(entry.tipo, parseFloat(entry.temp)) || null;
  }
  entry.zona = currentArea();
  // Registro APPCC: queda quién lo introdujo, según la sesión con la que se
  // ha entrado — no un campo "responsable" a elegir a mano.
  entry.responsable = getChatAuthorName(getChatAuthor());
  DB.limpieza[key].push(entry);
  saveDB();
  renderLimpiezaTab();
}
// Registro APPCC (temperaturas/plagas): borrarlo exige el PIN de negocio y
// queda auditado — es justo el tipo de dato que hay que poder demostrar
// intacto ante una inspección, no algo que se borre con un simple "¿seguro?".
function deleteLimpiezaLogEntry(key, id){
  requestBusinessPinAction(t('title.deleteAppccEntry'), t('msg.confirmDeleteAppccEntry'), () => {
    const entry = DB.limpieza[key].find(e => e.id === id);
    DB.limpieza[key] = DB.limpieza[key].filter(e => e.id!==id);
    if(entry) logAudit('delete', t('audit.deletedAppccEntry').replace('${type}', key==='temperaturas'?t('tab.temperatures'):t('tab.pests')).replace('${date}', entry.fecha||'?'));
    saveDB();
    closeModal();
    renderLimpiezaTab();
  });
}

// Vencido si "próximo" ya pasó; próximo a vencer si faltan 7 días o menos.
function limpiezaMantenimientoDueStatus(e){
  if(!e.proximo) return null;
  const diffDays = Math.floor((new Date(e.proximo) - new Date(todayStr())) / 86400000);
  if(diffDays < 0) return 'overdue';
  if(diffDays <= 7) return 'soon';
  return null;
}
let lpEqEditando = null;   // equipo que se está editando (solo uno a la vez)
function lpEqEditar(id){ lpEqEditando = id; renderLimpiezaMantenimiento(); }
function lpEqCancelar(){ lpEqEditando = null; renderLimpiezaMantenimiento(); }
function lpEqGuardar(id){
  if(!editUnlocked) return;
  const e = DB.limpieza.mantenimiento.find(x => x.id === id);
  if(!e) return;
  const v = k => { const el = document.getElementById(`mt-${k}-${id}`); return el ? el.value : ''; };
  Object.assign(e, {ultimo: v('u'), proximo: v('p'), responsable: v('r').trim(), estado: v('e') || e.estado, notas: v('n').trim()});
  lpEqEditando = null;
  saveDB();
  renderLimpiezaTab();
  showToast(gl({es:'Equipo guardado', ca:'Equip desat', en:'Equipment saved'}));
}
function renderLimpiezaMantenimiento(){
  const box = document.getElementById('limpieza-tab-content');
  const equipos = DB.limpieza.mantenimiento.filter(e => (e.zona||'cocina')===currentArea());
  if(lpEqEditando != null && !equipos.some(e => e.id === lpEqEditando)) lpEqEditando = null;
  const estadoTxt = {OK: t('status.ok'), Pendiente: t('status.pendingM'), Urgente: t('status.urgent')};
  const fecha = f => f ? escapeHtml(new Date(f + 'T12:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'short', year:'numeric'})) : '—';
  const tarjeta = e => {
    const due = limpiezaMantenimientoDueStatus(e);
    const edit = lpEqEditando === e.id && editUnlocked;
    const cab = `
      <div class="lp-eq-cab">
        <b class="lp-eq-nom">${escapeHtml(e.nombre)}</b>
        ${due==='overdue' ? `<span class="pr-chip msg"><i class="ti ti-alert-triangle"></i> ${t('badge.overdue')}</span>` : due==='soon' ? `<span class="pr-chip dp-amb"><i class="ti ti-clock"></i> ${t('badge.dueSoon')}</span>` : ''}
        ${edit ? '' : `${editUnlocked ? `<button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(t('common.edit'))}" aria-label="${escapeHtml(t('common.edit') + ': ' + e.nombre)}" onclick="lpEqEditar(${e.id})"><i class="ti ti-pencil"></i></button>` : ''}
        ${ggMenuAcciones([{icono:'ti-trash', texto:t('common.delete'), fn:`deleteMantenimientoEquipo(${e.id})`, peligro:true, estricto:true}], {clase:'btn btn-fino mn-btn lp-mas', tip:true})}`}
      </div>`;
    if(edit){
      return `
      <article class="lp-eq is-editando">
        ${cab}
        <div class="lp-eq-campos">
          <div class="field"><label for="mt-u-${e.id}">${t('label.lastMaintenance')}</label><input type="date" id="mt-u-${e.id}" value="${escapeHtml(e.ultimo||'')}"></div>
          <div class="field"><label for="mt-p-${e.id}">${t('label.next')}</label><input type="date" id="mt-p-${e.id}" value="${escapeHtml(e.proximo||'')}"></div>
          <div class="field"><label for="mt-r-${e.id}">${t('label.responsible')}</label><textarea class="lp-auto-alto" rows="1" id="mt-r-${e.id}" placeholder="—" oninput="lpAuto(this)">${escapeHtml(e.responsable||'')}</textarea></div>
          <div class="field"><label for="mt-e-${e.id}">${t('label.status')}</label><select id="mt-e-${e.id}">
            ${[['OK','status.ok'],['Pendiente','status.pendingM'],['Urgente','status.urgent']].map(([opt,k])=>`<option value="${opt}"${e.estado===opt?' selected':''}>${t(k)}</option>`).join('')}
          </select></div>
          <div class="field lp-eq-notas"><label for="mt-n-${e.id}">${t('th.notes')}</label><textarea class="lp-auto-alto" rows="2" id="mt-n-${e.id}" placeholder="—" oninput="lpAuto(this)">${escapeHtml(e.notas||'')}</textarea></div>
        </div>
        <div class="lp-eq-bt"><button type="button" class="btn btn-fino" onclick="lpEqCancelar()">${t('common.cancel')}</button><button type="button" class="btn btn-fino is-on" onclick="lpEqGuardar(${e.id})"><i class="ti ti-check"></i> ${t('common.save')}</button></div>
      </article>`;
    }
    return `
    <article class="lp-eq${due === 'overdue' ? ' is-vencido' : ''}${e.estado === 'Urgente' ? ' is-urgente' : ''}">
      ${cab}
      <dl class="lp-eq-datos">
        <div><dt>${t('label.lastMaintenance')}</dt><dd>${fecha(e.ultimo)}</dd></div>
        <div><dt>${t('label.next')}</dt><dd>${fecha(e.proximo)}</dd></div>
        <div><dt>${t('label.responsible')}</dt><dd>${e.responsable ? escapeHtml(e.responsable) : '—'}</dd></div>
        <div><dt>${t('label.status')}</dt><dd><span class="lp-estado-eq ${e.estado === 'Urgente' ? 'nok' : e.estado === 'Pendiente' ? 'pend' : 'ok'}">${escapeHtml(estadoTxt[e.estado] || e.estado || '—')}</span></dd></div>
        <div class="lp-eq-notas"><dt>${t('th.notes')}</dt><dd>${e.notas ? escapeHtml(e.notas) : '—'}</dd></div>
      </dl>
    </article>`;
  };
  box.innerHTML = `
    <div class="lp-barra">
      <div class="es-tit" style="margin:0">${gl({es:'Equipos y mantenimiento', ca:'Equips i manteniment', en:'Equipment and maintenance'})} · ${equipos.length}</div>
      <button type="button" class="owner-strict btn btn-fino is-on" onclick="addMantenimientoEquipo()"><i class="ti ti-plus"></i> ${t('btn.addEquipment')}</button>
    </div>
    ${equipos.length ? `<div class="lp-eqs">${equipos.map(tarjeta).join('')}</div>` : `<div class="empty es-vacio"><i class="ti ti-settings"></i>${t('empty.noEquipmentRegistered')}</div>`}
  `;
  lpRefrescarResumen();
}
function addMantenimientoEquipo(){
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-settings"></i> ${t('title.newEquipment')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label for="new-mantenimiento-equipo">${t('label.equipmentName')}</label>
      <input type="text" id="new-mantenimiento-equipo" placeholder="${currentArea()==='sala' ? t('ph.equipmentExampleSala') : t('ph.equipmentExample')}" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmAddMantenimientoEquipo()}">
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t("common.cancel")}</button>
      <button type="button" class="btn btn-fino is-on" onclick="confirmAddMantenimientoEquipo()"><i class="ti ti-plus"></i> ${t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-mantenimiento-equipo')?.focus(), 50);
}
function confirmAddMantenimientoEquipo(){
  const nombre = document.getElementById('new-mantenimiento-equipo').value;
  if(!nombre || !nombre.trim()){ showToast(t('msg.writeEquipName')); return; }
  // El responsable de mantenimiento suele ser una empresa externa (no un
  // empleado de la ficha de Personal), así que es texto libre.
  DB.limpieza.mantenimiento.push({id: genId(), nombre: nombre.trim(), ultimo:'', proximo:'', responsable:'', estado:'OK', notas:'', zona: currentArea()});
  saveDB();
  closeModal();
  renderLimpiezaTab();
}
function updateMantenimientoEquipo(id, field, val){
  if(!editUnlocked) return;
  const e = DB.limpieza.mantenimiento.find(x => x.id===id);
  if(e) e[field] = val;
  saveDB();
  // La fecha y el estado cambian los avisos de «vencido» y las cifras de arriba.
  if(field === 'proximo' || field === 'estado') withScrollPreserved(() => renderLimpiezaTab());
}
async function deleteMantenimientoEquipo(id){
  if(!editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  DB.limpieza.mantenimiento = DB.limpieza.mantenimiento.filter(x => x.id!==id);
  saveDB();
  renderLimpiezaTab();
}

/* ============================================================
   DISTRIBUCIÓN DEL TRABAJO — Master-detail por empleado
   ============================================================ */
let distCurrentEmployeeId = null;
let distWeekOffset = 0; // semana mostrada en la cuadrícula de tareas (0 = actual)

function migrateWorkDistribution(){
  DB.workDistribution = DB.workDistribution || {};
  Object.keys(DB.workDistribution).forEach(empId => {
    const val = DB.workDistribution[empId];
    if(Array.isArray(val)){
      const produccion = {};
      val.forEach((txt, idx) => {
        if(txt && txt.trim()) produccion[idx] = [{id: genId(), text: txt.trim()}];
      });
      DB.workDistribution[empId] = { platos: [], produccion, doneDates: {} };
    } else if(val && !val.produccion){
      DB.workDistribution[empId] = { platos: val.platos || [], produccion: val.produccion || {}, doneDates: val.doneDates || {} };
    }
    // Cada tarea de producción pasa a tener un id propio y estable (antes era
    // solo texto), para poder marcarla como hecha por fecha sin que el
    // estado se desplace a otra tarea si se borra o reordena alguna.
    const d = DB.workDistribution[empId];
    // Cinturón además del arreglo de mergeStockField: una entrada sin valor
    // (empleado borrado desde otro dispositivo) hacía reventar la línea de
    // abajo, y como esto se ejecuta ANTES de pintar nada, la pantalla entera
    // se quedaba como estaba y los botones parecían muertos. Se descarta y
    // se sigue, que es lo único sensato: esa persona ya no existe.
    if(!d || typeof d !== 'object'){ delete DB.workDistribution[empId]; return; }
    if(!d.doneDates) d.doneDates = {};
    if(!d.tareasUnicas) d.tareasUnicas = {};
    Object.keys(d.produccion||{}).forEach(dayIdx => {
      d.produccion[dayIdx] = (d.produccion[dayIdx]||[]).map(t => typeof t === 'string' ? {id: genId(), text: t} : t);
    });
  });
}

function getDistEmpData(empId){
  if(!DB.workDistribution[empId]) DB.workDistribution[empId] = { platos: [], produccion: {}, doneDates: {}, tareasUnicas: {} };
  const d = DB.workDistribution[empId];
  if(!d.platos) d.platos = [];
  if(!d.produccion) d.produccion = {};
  if(!d.doneDates) d.doneDates = {};
  if(!d.tareasUnicas) d.tareasUnicas = {};
  // Sala reparte rangos (mesas, barra, terraza) donde cocina reparte platos.
  // Antes a sala simplemente se le quitaba la columna de platos y no se le
  // ponía nada en su lugar, así que la pantalla se quedaba coja.
  if(!Array.isArray(d.rangos)) d.rangos = [];
  // Mesas a su cargo (12/11): ids de las mesas del plano de sala. El texto libre de arriba (`rangos`) queda solo para lo que ya estaba escrito.
  if(!Array.isArray(d.mesas)) d.mesas = [];
  // Elaboraciones a su cargo (31/10): nombres de elaboraciones base, igual que d.platos guarda los de los platos.
  if(!Array.isArray(d.elabs)) d.elabs = [];
  // Manual del puesto (31/10). Firebase no guarda [] ni {}: sin items, el manual vuelve de la nube sin la lista.
  if(!d.manual || typeof d.manual !== 'object') d.manual = {items: [], version: 0};
  if(!Array.isArray(d.manual.items)) d.manual.items = [];
  if(typeof d.manual.version !== 'number') d.manual.version = 0;
  return d;
}

// Una promo puede repetirse cada semana el mismo día (p.ej. "Menú del día
// todos los martes") en vez de tener que crearla a mano cada vez. `fecha` es
// la fecha ancla (la primera vez que se creó); si `recurrence==='weekly'`,
// ocurre también en cualquier fecha posterior que caiga en el mismo día de
// la semana.
function promoWeekday(p){ return new Date(p.fecha+'T00:00:00').getDay(); }
function promoOccursOn(p, ds){
  if(p.fecha === ds) return true;
  if(p.recurrence === 'weekly' && ds > p.fecha && (!p.hasta || ds <= p.hasta)){
    return new Date(ds+'T00:00:00').getDay() === promoWeekday(p);
  }
  return false;
}
function getPromosForDate(ds){
  return DB.promos.filter(p => promoOccursOn(p, ds));
}

// Cuánto se ha descontado de verdad ese día por promociones con efecto real
// en el TPV — a partir de las ventas ya cobradas (líneas con promoId), no de
// las promos "programadas": una promo puede estar activa y no venderse nada
// ese día, esto solo cuenta lo que de verdad se descontó en caja.
function promoDiscountTotalForDate(ds){
  let total = 0, count = 0;
  (DB.sales||[]).filter(s => s.date === ds).forEach(s => {
    (s.items||[]).forEach(l => {
      if(l.promoId && l.originalPrice != null){
        total += (l.originalPrice - l.price) * l.qty;
        count += l.qty;
      }
    });
  });
  return {total: roundMoney(total), count};
}

// Franja horaria opcional del descuento (p.ej. happy hour 18:00-20:00). Sin
// horaInicio/horaFin, se entiende que dura todo el día, como siempre. Admite
// que cruce medianoche (p.ej. 22:00-02:00): si la hora de fin es menor o
// igual que la de inicio, se interpreta que termina al día siguiente.
function promoTimeToMin(hhmm){
  const [h,m] = (hhmm||'').split(':').map(Number);
  return (h||0)*60 + (m||0);
}
function promoTimeActiveNow(p){
  if(!p.horaInicio || !p.horaFin) return true;
  const nowMin = new Date().getHours()*60 + new Date().getMinutes();
  const start = promoTimeToMin(p.horaInicio);
  const end = promoTimeToMin(p.horaFin);
  if(end > start) return nowMin >= start && nowMin < end;
  // Cruza medianoche (p.ej. 22:00-02:00): activa desde el inicio hasta las
  // 23:59 y también desde las 00:00 hasta la hora de fin.
  return nowMin >= start || nowMin < end;
}
// Dos franjas horarias "chocan" si se solapan; si alguna de las dos aplica
// todo el día (sin horaInicio/horaFin), se considera que choca con
// cualquier franja de la otra — se usa solo para avisar de promos con
// descuento en conflicto sobre el mismo plato/día (ver savePromo).
function promoTimeRangesOverlap(a, b){
  if(!a.horaInicio || !a.horaFin || !b.horaInicio || !b.horaFin) return true;
  let aS = promoTimeToMin(a.horaInicio), aE = promoTimeToMin(a.horaFin);
  if(aE <= aS) aE += 24*60;
  let bS = promoTimeToMin(b.horaInicio), bE = promoTimeToMin(b.horaFin);
  if(bE <= bS) bE += 24*60;
  return aS < bE && bS < aE;
}
// ¿Cuántas veces se ha aplicado ya hoy una promo con límite de usos? Se
// cuenta por fecha concreta (no en total), igual que doneDates: una promo
// recurrente semanal empieza de cero su tope cada vez que vuelve a tocarle.
function promoUsesToday(p){
  return (p.usedDates && p.usedDates[todayStr()]) || 0;
}
// Como cada aparición de una promo recurrente es la misma ficha en varias
// fechas, "hecha" se guarda por fecha concreta (igual que ya hacen las
// tareas de producción de Distribución), no como un booleano único que se
// compartiría entre todas las semanas.
function promoDoneInfo(p, ds){
  if(p.recurrence === 'weekly') return (p.doneDates && p.doneDates[ds]) || null;
  return p.done ? {done:true, doneAt:p.doneAt} : null;
}
function setPromoDone(p, ds, checked){
  const now = new Date().toISOString();
  if(p.recurrence === 'weekly'){
    if(!p.doneDates) p.doneDates = {};
    p.doneDates[ds] = checked ? {done:true, doneAt:now} : null;
  } else {
    p.done = checked;
    p.doneAt = checked ? now : null;
  }
}

// Promociones asignadas a un empleado para una fecha concreta, incluyendo
// las que ocurren ese día por ser recurrentes (no solo las creadas
// exactamente para esa fecha).
function getPromosForEmployeeDate(empId, dateStr){
  return DB.promos.filter(p => p.responsableId === empId && promoOccursOn(p, dateStr))
    .sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
async function togglePromoDone(promoId, checked, ds){
  const p = DB.promos.find(x=>x.id===promoId);
  if(!p) return;
  if(!checked && !(await dpConfirmarDesmarcar())){
    if(document.getElementById('distribucion-content')) renderDistDetail();
    if(document.getElementById('promo-tab-content')) renderPromocion();
    return;
  }
  setPromoDone(p, ds || p.fecha, checked);
  saveDB();
  if(document.getElementById('distribucion-content')) renderDistDetail();
  if(document.getElementById('promo-tab-content')) renderPromocion();
}

// Promo con descuento real activa HOY para un plato/bebida concreto, si la
// hay — se usa desde el TPV al añadir el artículo a una comanda para aplicar
// el precio rebajado solo. Se prioriza el enlace por platoId (el mismo id
// real del plato de Carta, que sobrevive a un cambio de nombre); si la promo
// es antigua y no tiene platoId guardado, se cae al match por nombre de
// siempre (insensible a mayúsculas/tildes).
function getActivePromoForDish(name, platoId){
  const today = todayStr();
  const usableNow = p => promoOccursOn(p, today) && promoTimeActiveNow(p) && !(p.maxUses && promoUsesToday(p) >= p.maxUses);
  if(platoId != null){
    const byId = DB.promos.find(p => p.discountPct && p.menuItemPlatoId === platoId && usableNow(p));
    if(byId) return byId;
  }
  if(!name) return null;
  const norm = stripAccents(name.trim().toLowerCase());
  return DB.promos.find(p => p.discountPct && p.menuItemName && !p.menuItemPlatoId && usableNow(p) && stripAccents(p.menuItemName.trim().toLowerCase()) === norm) || null;
}
// Se llama justo después de que una promo se haya aplicado de verdad a una
// línea (ver applyActivePromoToLine, js/tpv.js) para descontar del cupo
// diario si tiene límite de usos — separado de getActivePromoForDish porque
// esa solo CONSULTA si hay promo, no debe tener efectos secundarios.
function registerPromoUse(promoId){
  const p = DB.promos.find(x => x.id === promoId);
  if(!p || !p.maxUses) return;
  if(!p.usedDates) p.usedDates = {};
  const today = todayStr();
  p.usedDates[today] = (p.usedDates[today] || 0) + 1;
}

// Purga las promos NO recurrentes cuya fecha ya pasó hace más de 3 meses:
// una promo puntual de hace medio año ya no aporta nada y solo ensucia el
// calendario. Las recurrentes nunca se purgan solas (siguen vigentes
// indefinidamente hasta que alguien las borra a mano).
const PROMO_RETENTION_MONTHS = 3;
function pruneOldPromos(){
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - PROMO_RETENTION_MONTHS);
  const cutoffStr = dateStr(cutoff);
  const before = DB.promos.length;
  DB.promos = DB.promos.filter(p => p.recurrence === 'weekly' || p.fecha >= cutoffStr);
  if(DB.promos.length !== before) saveDB();
}

// Tareas de producción: son una plantilla recurrente por día de la semana
// (no atada a una fecha), pero si se marcan como "hecha" o no, eso sí que se
// guarda por fecha concreta (por el id propio de la tarea), para no marcar
// todas las semanas a la vez ni desplazar el estado a otra tarea.
function isDistTareaDone(empId, dateStr, taskId){
  const d = getDistEmpData(empId);
  return !!(d.doneDates[dateStr] && d.doneDates[dateStr][taskId]);
}
function goToFichaForDish(name){
  const r = DB.recipes.find(rec => rec.name === name && (rec.area||'cocina') === currentArea());
  if(!r){ showToast(t('msg.techSheetNotFound')); return; }
  const ficha = DB.fichas.find(f => f.recipeId === r.id);
  if(ficha) openFichaModal(ficha.id);
  else openFichaModal(null, r.id);
}

// Solo platos/bebidas del área actual: en Sala, fichas con area:'sala' y cartas de
// bebidas; en Cocina, fichas con area:'cocina' y cartas de comida.
function getAllDishNames(){
  const names = new Set();
  DB.recipes.filter(r => (r.area||'cocina') === currentArea()).forEach(r => { if(r.name) names.add(r.name); });
  DB.cartas.forEach(c => {
    if(isBebidaCarta(c) !== (currentArea()==='sala')) return;
    (c.secciones||[]).forEach(sec => {
      (sec.platos||[]).forEach(p => { if(p.nombre) names.add(p.nombre); });
    });
  });
  return [...names].sort((a,b)=>a.localeCompare(b));
}

// Id del plato de Carta que corresponde a un nombre (el mismo que verá el
// TPV en line.platoId al añadirlo a una comanda) — permite que una promo se
// enlace al plato de verdad en vez de a su nombre en texto, para que
// renombrarlo en Carta no la deje huérfana en silencio. Si el nombre no
// corresponde a ningún plato de Carta (p.ej. viene solo de una Ficha
// Técnica que aún no está en ninguna carta), no hay id que enlazar y la
// promo se queda con el nombre como único criterio (ver getActivePromoForDish).
function getDishPlatoIdForName(name){
  if(!name) return null;
  // En TODAS las cartas, de comida y de bebida: Promoción vive en Sala, pero
  // el TPV vende las dos cosas y la promo se engancha por el id del plato.
  for(const c of DB.cartas){
    for(const sec of (c.secciones||[])){
      const p = (sec.platos||[]).find(x => x.nombre === name);
      if(p) return p.id;
    }
  }
  return null;
}

// Solo los nombres con una Ficha Técnica de verdad ya creada — a diferencia
// de getAllDishNames() (usado en Promos, donde cualquier nombre de la
// Carta/Escandallo vale), aquí hace falta que exista la ficha porque el
// sentido de "platos a su cargo" es poder tocar el plato y que lleve
// directo a la receta para producir. Antes se podía asignar cualquier
// plato del Escandallo/Carta aunque no tuviera ficha (o un nombre suelto de
// Carta sin receta vinculada), y al pulsar no llevaba a ningún sitio útil.
function getDishNamesWithFicha(){
  const names = new Set();
  DB.fichas.forEach(f => {
    const r = f.recipeId ? DB.recipes.find(rec => rec.id === f.recipeId) : null;
    const fArea = f.area || (r && r.area) || 'cocina';
    if(fArea !== currentArea()) return;
    const name = r ? r.name : f.name;
    if(name) names.add(name);
  });
  return [...names].sort((a,b)=>a.localeCompare(b));
}

/* ============================================================
   «MI PUESTO» — el mundo de cada empleado (31/10)
   Un empleado entra y ve SU día: su turno, lo que tiene que hacer hoy (con
   lo atrasado), su semana de un vistazo, los platos o zonas que lleva, su
   manual del puesto y los accesos que de verdad usa. El propietario ve el
   equipo entero y, dentro de cada uno, lo mismo más los mandos para repartir.

   ⚠️ Un empleado SOLO ve su panel. Antes era la lista la que se filtraba,
   pero `openDistEmployee(id)` y `distCurrentEmployeeId` aceptaban cualquier
   id: quien llegara por otro camino (la ficha de un compañero, un id que se
   quedó de otra sesión) veía el trabajo ajeno. Ahora lo decide una sola
   función (`distPuedeVer`) y todas las puertas de entrada y de escritura
   pasan por ella.
   ============================================================ */
let distDiaSel = null;      // fecha elegida en la tira de la semana (null = hoy, o el lunes si se mira otra semana)
let dpManualEdit = null;    // {tipo, id} del apartado del manual que se está editando

// Quién puede ver el panel de `id`: el propietario y un dispositivo sin sesión de empleado, cualquiera; un empleado, solo el suyo.
function distPuedeVer(id){
  const yo = loggedInEmployeeId();
  return yo == null || yo === id;
}
// Datos del empleado abierto, o null si esa sesión no puede verlo. TODAS las escrituras de abajo parten de aquí.
function distDatosActuales(){
  if(distCurrentEmployeeId == null || !distPuedeVer(distCurrentEmployeeId)) return null;
  return getDistEmpData(distCurrentEmployeeId);
}

// Para el empleado esta pantalla es SU puesto, no un reparto de trabajo: el título lo dice (y vuelve al de siempre para el propietario).
function dpTitulos(esEmpleado){
  const tit = document.querySelector('#view-distribucion .view-title'), sub = document.querySelector('#view-distribucion .view-subtitle');
  if(!tit || !sub) return;
  if(esEmpleado){
    tit.removeAttribute('data-i18n'); sub.removeAttribute('data-i18n');
    tit.textContent = gl({es:'Mi puesto', ca:'El meu lloc', en:'My workspace'});
    sub.textContent = gl({es:'Tu día, tu semana y lo que se espera de ti', ca:'El teu dia, la teva setmana i el que s\'espera de tu', en:'Your day, your week and what is expected of you'});
  } else {
    tit.setAttribute('data-i18n', 'view.distribucion.title'); sub.setAttribute('data-i18n', 'view.distribucion.subtitle');
    tit.textContent = t('view.distribucion.title'); sub.textContent = t('view.distribucion.subtitle');
  }
}
function renderDistribucion(){
  migrateWorkDistribution();
  const box = document.getElementById('distribucion-content');
  dpTitulos(loggedInEmployeeId() != null);

  if(!areaEmployees().length){
    box.innerHTML = `
      <div class="toolbar"><div class="left"></div><button class="owner-strict btn btn-fino is-on" onclick="addEmployeeFromDistribucion()"><i class="ti ti-plus"></i> ${t('btn.addEmployee')}</button></div>
      <div class="empty es-vacio"><i class="ti ti-users"></i>${t("empty.employees")}</div>
    `;
    return;
  }

  // Un empleado que entra por Acceso Empleados no tiene equipo que mirar:
  // se abre SIEMPRE su propio panel, y da igual qué id hubiera quedado
  // guardado de antes (otra sesión, otra persona en el mismo aparato).
  const yo = loggedInEmployeeId();
  if(yo != null){
    const mine = DB.employees.find(e => e.id === yo);
    if(mine && (mine.area||'cocina') === currentArea()) distCurrentEmployeeId = yo;
    else distCurrentEmployeeId = null;
  }

  const emp = distCurrentEmployeeId != null ? DB.employees.find(e => e.id === distCurrentEmployeeId) : null;
  if(emp && (emp.area||'cocina') === currentArea() && distPuedeVer(emp.id)){
    renderDistDetail();
  } else {
    distCurrentEmployeeId = null;
    renderDistList();
  }
}

let distSearch = '';
function setDistSearch(val){
  distSearch = val.toLowerCase();
  renderDistList();
  const campo = document.querySelector('#distribucion-content .dp-busca .search-input');
  if(campo){ campo.focus(); const n = campo.value.length; try{ campo.setSelectionRange(n, n); }catch(e){} }
}

/* ---------- Qué toca cada día ---------- */
// Todo lo que tiene un empleado en una fecha, venga de donde venga (plantilla semanal, tarea puntual, limpieza, promo), con su
// estado. El resumen, la tira de la semana y la lista del día salen de AQUÍ: así el «3 de 7» de arriba y las filas de abajo
// no pueden contarse distinto.
function distTareasDelDia(emp, ds, idx, date){
  const d = getDistEmpData(emp.id);
  const out = [];
  (d.produccion[idx]||[]).forEach(task => out.push({k:'prod', id:task.id, text:task.text, bySelf:!!task.bySelf, done:isDistTareaDone(emp.id, ds, task.id), idx}));
  ((d.tareasUnicas||{})[ds]||[]).forEach(task => out.push({k:'unica', id:task.id, text:task.text, bySelf:!!task.bySelf, done:isDistTareaDone(emp.id, ds, task.id)}));
  ensureLimpiezaData();
  const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  const checksMes = DB.limpieza.checksMes[monthKey] || {};
  DB.limpieza.tareas.filter(lt => lt.responsableId === emp.id && (lt.zona||'cocina') === (emp.area||'cocina') && (
    (lt.tipo === 'mensual' && lt.diaMes === date.getDate()) || (lt.tipo === 'puntual' && lt.fecha === ds)
  )).forEach(lt => out.push({k:'limp', id:lt.id, text: lt.area + (lt.producto ? ` (${lt.producto})` : ''), done:!!limpiezaCheckInfo(checksMes, lt.id), canToggle:canToggleLimpiezaTarea(lt), monthKey}));
  getPromosForEmployeeDate(emp.id, ds).forEach(p => out.push({k:'promo', id:p.id, text:p.titulo, done:!!(promoDoneInfo(p, ds) || {}).done}));
  return out;
}
// Cifras de una semana (offset 0 = la actual): total, hechas, atrasadas y el primer día con algo atrasado.
// Cómo se pinta una cuenta «hechas / total»: verde si está todo hecho, rojo si queda algo de un día que ya pasó, neutro si todavía hay tiempo.
function dpEstadoCuenta(hechas, total, atrasadas){
  if(total > 0 && hechas === total) return 'ok';
  if(atrasadas > 0) return 'mal';
  return '';
}
function distResumenSemana(emp, offset){
  const hoy = todayStr();
  const dias = getWeekDates(offset).map((date, idx) => {
    const ds = dateStr(date);
    const tareas = distTareasDelDia(emp, ds, idx, date);
    const hechas = tareas.filter(x => x.done).length;
    return {date, idx, ds, tareas, total: tareas.length, hechas, atrasadas: ds < hoy ? tareas.length - hechas : 0};
  });
  const total = dias.reduce((s, x) => s + x.total, 0), hechas = dias.reduce((s, x) => s + x.hechas, 0), atrasadas = dias.reduce((s, x) => s + x.atrasadas, 0);
  return {dias, total, hechas, atrasadas, primerAtrasado: dias.find(x => x.atrasadas)};
}
function distTurnoDe(empId, ds){
  return (DB.turnos||[]).find(x => x.employeeId === empId && x.fecha === ds) || null;
}
function distTurnoTexto(tr){
  if(!tr) return null;
  const tipo = SHIFT_TYPES[tr.tipo] || SHIFT_TYPES.C;
  const horas = tr.entrada && tr.salida ? `${tr.entrada}–${tr.salida}${tr.entrada2 && tr.salida2 ? ` · ${tr.entrada2}–${tr.salida2}` : ''}` : '';
  return {etiqueta: tipo.label, horas, bg: tipo.bg, tx: tipo.tx, trabaja: ['M','T','P','C'].includes(tr.tipo)};
}

/* ---------- Lista del equipo (propietario) ---------- */
function renderDistList(){
  const box = document.getElementById('distribucion-content');
  const isSala = currentArea() === 'sala';
  const allEmps = areaEmployees();
  // En sesión de empleado solo se ve la propia (aunque normalmente ni se llega aquí: se abre directo su panel).
  const yo = loggedInEmployeeId();
  const visibleEmps = yo != null ? allEmps.filter(e => e.id === yo) : allEmps;
  const emps = distSearch ? visibleEmps.filter(e => e.name.toLowerCase().includes(distSearch) || (e.rol||'').toLowerCase().includes(distSearch)) : visibleEmps;
  const hoy = todayStr();
  const filas = emps.map(emp => {
    const d = getDistEmpData(emp.id);
    const sem = distResumenSemana(emp, 0);
    const diaHoy = sem.dias.find(x => x.ds === hoy);
    const hoyTotal = diaHoy ? diaHoy.total : 0, hoyHechas = diaHoy ? diaHoy.hechas : 0;
    const turno = distTurnoTexto(distTurnoDe(emp.id, hoy));
    const nCargo = isSala ? distRangoLabels(d).length : d.platos.length + d.elabs.length;
    const m = d.manual || {items:[], version:0};
    const manual = !(m.items||[]).length ? 'sin' : (d.manualLeido && d.manualLeido.version === m.version ? 'leido' : 'pendiente');
    return {emp, d, sem, hoyTotal, hoyHechas, turno, nCargo, manual};
  });
  const sumHoyT = filas.reduce((s, f) => s + f.hoyTotal, 0), sumHoyH = filas.reduce((s, f) => s + f.hoyHechas, 0);
  const sumAtr = filas.reduce((s, f) => s + f.sem.atrasadas, 0);
  const sumPend = filas.filter(f => f.manual === 'pendiente').length, sumSin = filas.filter(f => f.manual === 'sin').length;
  const resumen = yo != null ? '' : `
    <div class="st-resumen dp-resumen">
      <div class="st-cel${sumHoyT && sumHoyH === sumHoyT ? ' is-ok' : ''}"><span class="st-cel-et">${gl({es:'Hoy hecho', ca:'Avui fet', en:'Done today'})}</span><span class="st-cel-v">${sumHoyH} / ${sumHoyT}</span><span class="st-cel-s">${gl({es:'tareas de todo el equipo', ca:'tasques de tot l\'equip', en:'tasks across the team'})}</span></div>
      <div class="st-cel${sumAtr ? ' is-bajo' : ''}"><span class="st-cel-et">${gl({es:'Atrasadas', ca:'Endarrerides', en:'Overdue'})}</span><span class="st-cel-v">${sumAtr}</span><span class="st-cel-s">${gl({es:'de días anteriores de esta semana', ca:'de dies anteriors d\'aquesta setmana', en:'from earlier days this week'})}</span></div>
      <div class="st-cel${sumPend ? ' is-bajo' : ''}"><span class="st-cel-et">${gl({es:'Manual sin leer', ca:'Manual sense llegir', en:'Manual unread'})}</span><span class="st-cel-v">${sumPend}</span><span class="st-cel-s">${sumSin ? sumSin + ' ' + gl({es:'aún sin manual', ca:'encara sense manual', en:'have no manual yet'}) : gl({es:'todos tienen el suyo', ca:'tots tenen el seu', en:'everyone has one'})}</span></div>
    </div>`;
  const tarjetas = filas.map(({emp, sem, hoyTotal, hoyHechas, turno, nCargo, manual}) => {
    const isInactive = emp.active === false;
    const pct = hoyTotal ? Math.round(hoyHechas / hoyTotal * 100) : 0;
    const chipManual = manual === 'leido' ? `<span class="pr-chip ok"><i class="ti ti-book-2"></i> ${gl({es:'Manual leído', ca:'Manual llegit', en:'Manual read'})}</span>`
      : manual === 'pendiente' ? `<span class="pr-chip msg"><i class="ti ti-book-2"></i> ${gl({es:'Manual por leer', ca:'Manual per llegir', en:'Manual unread'})}</span>`
      : `<span class="pr-chip"><i class="ti ti-book-2"></i> ${gl({es:'Sin manual', ca:'Sense manual', en:'No manual'})}</span>`;
    return `
    <article class="pr-card dp-emp${isInactive ? ' is-baja' : ''}" tabindex="0" role="button" aria-label="${escapeHtml(emp.name)}" onclick="openDistEmployee(${emp.id})" onkeydown="if((event.key==='Enter'||event.key===' ') && event.target===this){event.preventDefault();openDistEmployee(${emp.id})}">
      <div class="pr-cab">
        <span class="pr-av" style="--c:${escapeHtml(emp.color||'#DF7039')}" aria-hidden="true">${escapeHtml(prIniciales(emp.name))}</span>
        <div class="pr-id"><b class="pr-nom">${escapeHtml(emp.name)}</b><span class="pr-sub">${escapeHtml(emp.rol||t('label.noRole'))}</span></div>
        <button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(t('label.viewEmployeeFile'))}" aria-label="${escapeHtml(t('label.viewEmployeeFile'))}" onclick="event.stopPropagation();openEmployeePersonalCard(${emp.id})"><i class="ti ti-id-badge-2"></i></button>
      </div>
      <div class="dp-hoy-mini">
        <div class="dp-hoy-mini-t"><span>${gl({es:'Hoy', ca:'Avui', en:'Today'})}</span><b class="${dpEstadoCuenta(hoyHechas, hoyTotal, sem.atrasadas)}">${hoyTotal ? `${hoyHechas} / ${hoyTotal}` : gl({es:'sin tareas', ca:'sense tasques', en:'no tasks'})}</b></div>
        <div class="dp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      </div>
      <div class="pr-estados">
        ${isInactive ? `<span class="pr-chip">${t('label.inactive')}</span>` : turno ? `<span class="pr-chip dp-turno-chip" style="background:${turno.bg};color:${turno.tx}">${escapeHtml(turno.etiqueta)}${turno.horas ? ' · ' + escapeHtml(turno.horas) : ''}</span>` : `<span class="pr-chip">${gl({es:'Sin turno hoy', ca:'Sense torn avui', en:'No shift today'})}</span>`}
        ${sem.atrasadas ? `<span class="pr-chip msg"><i class="ti ti-alert-triangle"></i> ${sem.atrasadas} ${gl({es:'atrasadas', ca:'endarrerides', en:'overdue'})}</span>` : ''}
        ${chipManual}
      </div>
      <div class="pr-pie">
        <span class="dp-cargo-n"><i class="ti ${isSala ? 'ti-map-pin' : 'ti-tools-kitchen-2'}"></i> ${isSala ? (nCargo === 1 ? t('dist.oneZone') : t('dist.nZones').replace('${n}', nCargo)) : (nCargo === 1 ? t('dist.oneDish') : t('dist.nDishes').replace('${n}', nCargo))}</span>
        <span class="pr-ver">${gl({es:'Abrir su puesto', ca:'Obrir el seu lloc', en:'Open workspace'})} →</span>
      </div>
    </article>`;
  }).join('');

  box.innerHTML = `
    ${resumen}
    ${yo == null ? `
    <div class="toolbar dp-barra-t pr-barra">
      <div class="left"><input type="text" class="search-input st-buscar" value="${escapeHtml(distSearch)}" placeholder="${t('ph.searchEmployee')}" oninput="setDistSearch(this.value)"></div>
      <div class="pr-barra-bt"><button type="button" class="btn btn-fino" onclick="printDistribucion()"><i class="ti ti-printer"></i> ${t('btn.printAll')}</button></div>
    </div>` : ''}
    ${emps.length ? `<div class="pr-grid">${tarjetas}</div>` : `<div class="empty es-vacio"><i class="ti ${allEmps.length?'ti-search-off':'ti-users'}"></i>${allEmps.length?t('common.noResults'):t('empty.employees')}</div>`}
  `;
  // La búsqueda vive en la propia barra: la clase de abajo es el gancho de setDistSearch.
  const barra = box.querySelector('.dp-barra-t'); if(barra) barra.classList.add('dp-busca');
}

// Para ver el trabajo de un empleado: el propietario entra directo; un empleado, solo al SUYO (su sesión ya demostró quién es).
// A un compañero NO se entra, ni con su PIN: lo que se ve ahí es de él.
let distPendingPinEmployeeId = null;
function openDistEmployee(id){
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
  if(!distPuedeVer(id)){ showToast(gl({es:'Solo puedes ver tu propio puesto de trabajo.', ca:'Només pots veure el teu propi lloc de treball.', en:'You can only see your own workspace.'}), 4000); return; }
  // Sin sesión de empleado (propietario, o un aparato compartido): el dueño entra directo y, en un aparato sin sesión, se pide el PIN de ese empleado.
  if(isOwnerSession() || loggedInEmployeeId() === id){ openDistEmployeeAuthed(id); return; }
  distPendingPinEmployeeId = id;
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="ml-intro">${t('msg.distPinDesc')}</p>
    <div class="field">
      <label for="dist-pin-input">${t('label.accessPin')}</label>
      <input type="password" id="dist-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmDistEmployeePin()">
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button type="button" class="btn btn-fino is-on" onclick="confirmDistEmployeePin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('dist-pin-input')?.focus(), 50);
}
function confirmDistEmployeePin(){
  const e = DB.employees.find(x=>x.id===distPendingPinEmployeeId);
  if(!e) return;
  const val = document.getElementById('dist-pin-input').value;
  if(!pinMatchesEmployeeOrBusiness(val, e)){ showToast(t('msg.pinIncorrect')); return; }
  closeModal();
  openDistEmployeeAuthed(e.id);
}
function openDistEmployeeAuthed(id){
  if(!distPuedeVer(id)) return;
  distCurrentEmployeeId = id;
  distWeekOffset = 0;
  distDiaSel = null;
  renderDistribucion();
}
function backToDistList(){
  // Un empleado no tiene equipo al que volver: su panel es el único que existe para él.
  if(loggedInEmployeeId() != null) return;
  distCurrentEmployeeId = null;
  renderDistribucion();
}
function distWeekShift(delta){
  distWeekOffset += delta;
  distDiaSel = null;
  renderDistDetail();
}
function distElegirDia(ds){
  distDiaSel = ds;
  renderDistDetail();
}
function distHoy(){
  distWeekOffset = 0;
  distDiaSel = null;
  renderDistDetail();
}

/* ---------- El panel del empleado ---------- */
function dpFilaHtml(emp, ds, tk, puedeGestionar){
  const k = escapeJsAttr(String(tk.id));
  const onchange = tk.k === 'limp' ? `toggleLimpiezaCheckMesFromDist('${tk.monthKey}',${tk.id},this.checked)`
    : tk.k === 'promo' ? `togglePromoDone(${tk.id},this.checked,'${ds}')`
    : `toggleDistTareaDone('${ds}','${k}',this.checked)`;
  // Solo la etiqueta que toca: la de «Cada lunes» necesita el día, y las demás tareas no lo tienen.
  const etiqueta = tk.k === 'prod' ? `<span class="dp-et"><i class="ti ti-repeat"></i> ${gl({es:'Cada ' + weekDayFull(tk.idx).toLowerCase(), ca:'Cada ' + weekDayFull(tk.idx).toLowerCase(), en:'Every ' + weekDayFull(tk.idx)})}</span>`
    : tk.k === 'unica' ? `<span class="dp-et"><i class="ti ti-calendar-event"></i> ${gl({es:'Solo este día', ca:'Només aquest dia', en:'This day only'})}</span>`
    : tk.k === 'limp' ? `<span class="dp-et"><i class="ti ti-spray"></i> ${gl({es:'Limpieza', ca:'Neteja', en:'Cleaning'})}</span>`
    : `<span class="dp-et"><i class="ti ti-speakerphone"></i> Promo</span>`;
  const puedeTocar = (tk.k === 'prod' || tk.k === 'unica') && (puedeGestionar || tk.bySelf);
  const menu = puedeTocar ? ggMenuAcciones([
    {icono:'ti-pencil', texto:t('common.edit'), fn:`dpEditarTarea('${tk.k}','${ds}','${k}'${tk.k === 'prod' ? `,${tk.idx}` : ''})`},
    {icono:'ti-trash', texto:t('common.delete'), fn:tk.k === 'prod' ? `removeDistTarea(${tk.idx},'${k}')` : `removeDistTareaUnica('${ds}','${k}')`, peligro:true}
  ], {clase:'btn btn-fino mn-btn dp-mas', tip:true}) : '';
  const deshab = tk.k === 'limp' && !tk.canToggle;
  /* De quién es cada tarea se ve a primera vista (7/11: las del jefe dicen SIEMPRE «el jefe», también si quien mira es él; «por ti» confundía): las que pone el jefe llevan su sello en tinta y las que se pone el propio
     empleado, otro en verde y la fila más clara. Antes era una etiqueta gris que se perdía entre las demás. */
  const verComoEmpleado = loggedInEmployeeId() === emp.id;
  const origen = (tk.k === 'prod' || tk.k === 'unica')
    ? (tk.bySelf
      ? `<span class="dp-origen mia"><i class="ti ti-user"></i> ${verComoEmpleado ? gl({es:'Puesta por mí', ca:'Posada per mi', en:'Set by me'}) : gl({es:'Puesta por ' + emp.name.split(' ')[0], ca:'Posada per ' + emp.name.split(' ')[0], en:'Set by ' + emp.name.split(' ')[0]})}</span>`
      : `<span class="dp-origen jefe"><i class="ti ti-briefcase"></i> ${gl({es:'Puesta por el jefe', ca:'Posada pel cap', en:'Set by the boss'})}</span>`)
    : '';
  return `
    <div class="dp-tarea${tk.done ? ' is-hecha' : ''}${tk.bySelf ? ' es-mia' : ''}">
      <label class="dp-check${deshab ? ' is-off' : ''}" title="${deshab ? escapeHtml(t('limpieza.notYourTaskToast')) : escapeHtml(t('title.markAsDone'))}">
        <input type="checkbox" ${tk.done ? 'checked' : ''} ${deshab ? 'disabled' : ''} onchange="${onchange}" aria-label="${escapeHtml(t('title.markAsDone') + ': ' + tk.text)}">
        <span class="dp-check-caja"><i class="ti ti-check"></i></span>
      </label>
      <div class="dp-tarea-txt">
        ${tk.k === 'promo' ? `<a class="dp-txt" href="#" onclick="event.preventDefault();openPromoModal(${tk.id})">${escapeHtml(tk.text)}</a>` : `<span class="dp-txt">${escapeHtml(tk.text)}</span>`}
        <span class="dp-et-fila">${etiqueta}${origen}</span>
      </div>
      ${menu}
    </div>`;
}

function renderDistDetail(){
  const box = document.getElementById('distribucion-content');
  const emp = DB.employees.find(e=>e.id===distCurrentEmployeeId);
  if(!emp || !distPuedeVer(emp.id)){ distCurrentEmployeeId = null; renderDistList(); return; }
  const d = getDistEmpData(emp.id);
  const allDishes = getDishNamesWithFicha();
  const isSala = currentArea() === 'sala';
  // Distinto de editUnlocked: asignar/quitar el trabajo de OTRO compañero es cosa del propietario real, no de cualquier
  // empleado con «puede editar».
  const ownerSess = isOwnerSession();
  const yo = loggedInEmployeeId();
  const esMio = yo === emp.id;
  const hoy = todayStr();

  const sem = distResumenSemana(emp, distWeekOffset);
  const semHoy = distWeekOffset === 0 ? sem : distResumenSemana(emp, 0);
  const diaHoy = semHoy.dias.find(x => x.ds === hoy);
  const semDs = sem.dias.map(x => x.ds);
  const selDs = distDiaSel && semDs.includes(distDiaSel) ? distDiaSel : (semDs.includes(hoy) ? hoy : semDs[0]);
  const sel = sem.dias.find(x => x.ds === selDs);
  const weekDates = sem.dias.map(x => x.date);
  const weekRangeLabel = `${weekDates[0].getDate()} ${monthFull(weekDates[0].getMonth()).slice(0,3)} – ${weekDates[6].getDate()} ${monthFull(weekDates[6].getMonth()).slice(0,3)}`;

  // ---- Hero: HOY ----
  const turnoHoy = distTurnoTexto(distTurnoDe(emp.id, hoy));
  const hoyTotal = diaHoy ? diaHoy.total : 0, hoyHechas = diaHoy ? diaHoy.hechas : 0;
  const hoyPct = hoyTotal ? Math.round(hoyHechas / hoyTotal * 100) : 0;
  const open = getOpenFichaje(emp.id);
  const fechaLarga = new Date().toLocaleDateString(localeActual(), {weekday:'long', day:'numeric', month:'long'});
  const hero = `
    <section class="dp-hoy">
      <div class="dp-hoy-izq">
        <div class="es-tit">${gl({es:'Hoy', ca:'Avui', en:'Today'})} · ${escapeHtml(fechaLarga)}</div>
        <div class="dp-turno-fila">
          ${turnoHoy ? `<span class="pr-chip dp-turno-chip" style="background:${turnoHoy.bg};color:${turnoHoy.tx}">${escapeHtml(turnoHoy.etiqueta)}</span>${turnoHoy.horas ? `<b class="dp-horas">${escapeHtml(turnoHoy.horas)}</b>` : ''}` : `<span class="pr-chip">${gl({es:'Sin turno asignado hoy', ca:'Sense torn assignat avui', en:'No shift assigned today'})}</span>`}
          ${open ? `<span class="pr-chip ok"><i class="ti ti-clock-play"></i> ${t('hr2.checkedInSince').replace('${time}', fmtHora(open.entrada))}</span>` : `<span class="pr-chip off">${t('hr2.offDuty')}</span>`}
        </div>
        <div class="dp-prog">
          <div class="dp-prog-t ${dpEstadoCuenta(hoyHechas, hoyTotal, 0)}"><b>${hoyHechas}</b> ${gl({es:'de', ca:'de', en:'of'})} <b>${hoyTotal}</b> ${gl({es:'tareas de hoy hechas', ca:'tasques d\'avui fetes', en:'of today\'s tasks done'})}</div>
          <div class="dp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hoyPct}"><span style="width:${hoyPct}%"></span></div>
        </div>
        ${hoyTotal && hoyHechas === hoyTotal ? `<div class="dp-ok"><i class="ti ti-circle-check"></i> ${gl({es:'Todo hecho por hoy. Buen trabajo.', ca:'Tot fet per avui. Bona feina.', en:'All done for today. Nice work.'})}</div>` : ''}
      </div>
      <div class="dp-hoy-der">
        ${esMio || ownerSess ? `<button type="button" class="btn btn-fino is-on dp-principal" onclick="openEmployeePersonalCard(${emp.id})"><i class="ti ti-clock-play"></i> ${esMio ? gl({es:'Mi ficha y fichaje', ca:'La meva fitxa i fitxatge', en:'My profile & clock-in'}) : gl({es:'Ver ficha', ca:'Veure fitxa', en:'Open profile'})}</button>` : ''}
        <button type="button" class="btn btn-fino" onclick="printDistribucion(${emp.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
      </div>
    </section>`;

  // ---- Atrasadas ----
  const atrasadas = sem.atrasadas && sem.primerAtrasado ? `
    <div class="dp-aviso"><i class="ti ti-alert-triangle"></i>
      <span>${sem.atrasadas === 1 ? t('dist.oneOverdueTask') : t('dist.nOverdueTasks').replace('${n}', sem.atrasadas)}</span>
      <button type="button" class="btn btn-sm btn-fino" onclick="distElegirDia('${sem.primerAtrasado.ds}')">${gl({es:'Verlas', ca:'Veure-les', en:'Show me'})}</button>
    </div>` : '';

  // ---- Tira de la semana ----
  const tira = sem.dias.map(x => {
    const tr = distTurnoTexto(distTurnoDe(emp.id, x.ds));
    const cod = (distTurnoDe(emp.id, x.ds) || {}).tipo || '';
    return `
      <button type="button" class="dp-dia${x.ds === selDs ? ' is-sel' : ''}${x.ds === hoy ? ' is-hoy' : ''}${x.atrasadas ? ' is-atr' : ''}" onclick="distElegirDia('${x.ds}')" aria-pressed="${x.ds === selDs}" aria-label="${escapeHtml(weekDayFull(x.idx) + ' ' + x.date.getDate())}">
        <span class="dp-dia-n">${escapeHtml(t('days.short')[x.idx])}</span>
        <span class="dp-dia-f">${x.date.getDate()}</span>
        <span class="dp-dia-t"${tr ? ` style="background:${tr.bg};color:${tr.tx}" title="${escapeHtml(tr.etiqueta)}"` : ''}>${cod || '·'}</span>
        <span class="dp-dia-c ${dpEstadoCuenta(x.hechas, x.total, x.atrasadas)}">${x.total ? `${x.hechas}/${x.total}` : '—'}</span>
      </button>`;
  }).join('');

  // ---- Lista del día elegido ----
  const puedeGestionar = ownerSess;
  const filasDia = sel.tareas.map(tk => dpFilaHtml(emp, selDs, tk, puedeGestionar)).join('');
  const diaTitulo = `${weekDayFull(sel.idx)} ${sel.date.getDate()} ${monthFull(sel.date.getMonth())}`;
  const formAnadir = `
    <div class="dp-anadir">
      <input type="text" id="dist-tarea-${sel.idx}" placeholder="${escapeHtml(esMio ? gl({es:'Añadir algo a mi día…', ca:'Afegir alguna cosa al meu dia…', en:'Add something to my day…'}) : t('ph.newTask'))}" maxlength="140" onkeydown="if(event.key==='Enter'){event.preventDefault();addDistTarea(${sel.idx})}">
      <div class="dp-rep" role="radiogroup" aria-label="${escapeHtml(gl({es:'Cuándo', ca:'Quan', en:'When'}))}">
        <label><input type="radio" name="dp-rep" value="semanal" ${ownerSess ? 'checked' : ''}> <span>${gl({es:'Cada ' + weekDayFull(sel.idx).toLowerCase(), ca:'Cada ' + weekDayFull(sel.idx).toLowerCase(), en:'Every ' + weekDayFull(sel.idx)})}</span></label>
        <label><input type="radio" name="dp-rep" value="dia" id="dist-once-${sel.idx}" ${ownerSess ? '' : 'checked'}> <span>${gl({es:'Solo este día', ca:'Només aquest dia', en:'This day only'})}</span></label>
      </div>
      <button type="button" class="btn btn-fino is-on" onclick="addDistTarea(${sel.idx})"><i class="ti ti-plus"></i> ${gl({es:'Añadir', ca:'Afegir', en:'Add'})}</button>
    </div>`;
  const dia = `
    <section class="dp-dia-panel" id="dp-dia-panel">
      <div class="dp-dia-cab">
        <h3 class="dp-h">${escapeHtml(diaTitulo)}${selDs === hoy ? ` <span class="pr-chip ok">${t('common.today')}</span>` : ''}</h3>
        <span class="dp-dia-cuenta ${dpEstadoCuenta(sel.hechas, sel.total, sel.atrasadas)}">${sel.hechas} / ${sel.total}</span>
      </div>
      ${filasDia || `<div class="empty es-vacio dp-vacio"><i class="ti ti-mood-smile"></i>${t('empty.noTasksThisDay')}</div>`}
      ${formAnadir}
    </section>`;

  // ---- A su cargo y manual: dos botones; lo que hay dentro se abre sin salir de aquí ----
  const nPlatos = d.platos.length, nElabs = d.elabs.length, rangoEtiquetas = distRangoLabels(d), nCargo = isSala ? rangoEtiquetas.length : nPlatos + nElabs;
  const cargoResumen = isSala
    ? (rangoEtiquetas.length ? rangoEtiquetas.slice(0, 3).join(' · ') + (rangoEtiquetas.length > 3 ? ' …' : '') : t('dist.noZonesAssigned'))
    : (nCargo ? `${nPlatos} ${nPlatos === 1 ? gl({es:'plato', ca:'plat', en:'dish'}) : gl({es:'platos', ca:'plats', en:'dishes'})} · ${nElabs} ${nElabs === 1 ? gl({es:'elaboración', ca:'elaboració', en:'preparation'}) : gl({es:'elaboraciones', ca:'elaboracions', en:'preparations'})}` : t('dist.noDishesAssigned'));
  const man = d.manual;
  const nMan = man.items.length;
  const leido = d.manualLeido && d.manualLeido.version === man.version;
  const manualEstado = !nMan ? (ownerSess ? gl({es:'Aún sin escribir', ca:'Encara sense escriure', en:'Not written yet'}) : gl({es:'Tu encargado aún no lo ha escrito', ca:'El teu encarregat encara no l\'ha escrit', en:'Your manager has not written it yet'}))
    : leido ? gl({es:'Leído', ca:'Llegit', en:'Read'}) : (d.manualLeido ? gl({es:'Ha cambiado: por leer', ca:'Ha canviat: per llegir', en:'Changed: unread'}) : gl({es:'Por leer', ca:'Per llegir', en:'Unread'}));
  const botones = `
    <div class="dp-tiles">
      <button type="button" class="dp-tile" onclick="openDistCargo(${emp.id})">
        <span class="dp-tile-ico"><i class="ti ${isSala ? 'ti-map-pin' : 'ti-tools-kitchen-2'}"></i></span>
        <span class="dp-tile-txt"><b>${isSala ? t('dist.zonesTitle') : gl({es:'Platos y elaboraciones a su cargo', ca:'Plats i elaboracions al seu càrrec', en:'Dishes and preparations in their charge'})}</b><small>${escapeHtml(cargoResumen)}</small></span>
        <span class="dp-tile-n">${nCargo}</span>
      </button>
      <button type="button" class="dp-tile${nMan && !leido ? ' is-pend' : ''}" onclick="${nMan ? `openDistManual(${emp.id})` : (ownerSess ? `openDistManualEditor(${emp.id})` : `openDistManual(${emp.id})`)}">
        <span class="dp-tile-ico"><i class="ti ti-book-2"></i></span>
        <span class="dp-tile-txt"><b>${gl({es:'Manual del puesto', ca:'Manual del lloc', en:'Job manual'})}</b><small class="${nMan ? (leido ? 'ok' : 'mal') : ''}">${escapeHtml(manualEstado)}</small></span>
        ${ownerSess ? `<span class="dp-tile-edit" role="button" tabindex="0" data-tip="${escapeHtml(nMan ? t('common.edit') : gl({es:'Escribir el manual', ca:'Escriure el manual', en:'Write the manual'}))}" aria-label="${escapeHtml(nMan ? t('common.edit') : gl({es:'Escribir el manual', ca:'Escriure el manual', en:'Write the manual'}))}" onclick="event.stopPropagation();openDistManualEditor(${emp.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openDistManualEditor(${emp.id})}"><i class="ti ti-pencil"></i></span>` : `<span class="dp-tile-n">${nMan}</span>`}
      </button>
    </div>`;

  // ---- Próximos turnos + semana en cifras ----
  const proximos = (DB.turnos||[]).filter(x => x.employeeId === emp.id && x.fecha > hoy && ['M','T','P','C'].includes(x.tipo)).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0, 4);
  const horasSem = employeeHoursInRange(emp.id, getWeekDates(0).map(dateStr));
  const ventas = isSala ? camareroSalesInRange(emp.id, getWeekDates(0).map(dateStr)) : null;
  const turnosCard = `
    <section class="dp-card">
      <h3 class="dp-h"><i class="ti ti-calendar-time"></i> ${gl({es:'Mis próximos turnos', ca:'Els meus propers torns', en:'My next shifts'})}</h3>
      ${proximos.length ? `<div class="dp-proximos">${proximos.map(tr => {
        const tx = distTurnoTexto(tr);
        const f = new Date(tr.fecha + 'T12:00:00');
        return `<div class="dp-prox"><span class="dp-prox-f">${escapeHtml(f.toLocaleDateString(localeActual(), {weekday:'short', day:'numeric', month:'short'}))}</span><span class="pr-chip dp-turno-chip" style="background:${tx.bg};color:${tx.tx}">${escapeHtml(tx.etiqueta)}</span>${tx.horas ? `<span class="dp-prox-h">${escapeHtml(tx.horas)}</span>` : ''}</div>`;
      }).join('')}</div>` : `<p class="pr-ayuda">${gl({es:'No hay turnos asignados en los próximos días.', ca:'No hi ha torns assignats els propers dies.', en:'No shifts assigned in the coming days.'})}</p>`}
      <div class="dp-cifras">
        <div><span class="st-cel-et">${t('hr2.hoursThisWeek')}</span><b>${fmtDuracion(horasSem)}</b></div>
        <div><span class="st-cel-et">${gl({es:'Tareas de la semana', ca:'Tasques de la setmana', en:'Tasks this week'})}</span><b>${semHoy.hechas} / ${semHoy.total}</b></div>
        ${ventas ? `<div><span class="st-cel-et">${t('hr2.salesServedWeek')}</span><b>${ventas.count} · ${fmtMoney(ventas.total)}</b></div>` : ''}
      </div>
    </section>`;

  // ---- Nota para el siguiente turno (la de siempre: se escribe aquí y la lee quien entra después) ----
  const areaEmp = emp.area || 'cocina';
  const nota = `
    <section class="dp-card">
      <h3 class="dp-h"><i class="ti ti-notes"></i> ${t('handoff.label')}</h3>
      <textarea id="dp-nota-turno" rows="3" maxlength="500" placeholder="${escapeHtml(t('handoff.placeholder'))}" aria-label="${escapeHtml(t('handoff.label'))}" onchange="saveShiftHandoffNote('${escapeJsAttr(areaEmp)}', this.value)">${escapeHtml(getShiftHandoffNote(areaEmp))}</textarea>
    </section>`;

  box.innerHTML = `
    <div class="dp-cab">
      ${yo == null ? `<button type="button" class="btn btn-fino pr-ico" data-tip="${escapeHtml(gl({es:'Volver al equipo', ca:'Tornar a l\'equip', en:'Back to the team'}))}" aria-label="${escapeHtml(t('common.back'))}" onclick="backToDistList()"><i class="ti ti-arrow-left"></i></button>` : ''}
      <span class="pr-av" style="--c:${escapeHtml(emp.color||'#DF7039')}" aria-hidden="true">${escapeHtml(prIniciales(emp.name))}</span>
      <div class="pr-id"><b class="dp-nombre">${escapeHtml(emp.name)}</b><span class="pr-sub">${escapeHtml(emp.rol||'')}</span></div>
    </div>
    ${hero}
    <div class="dp-cols">
      <div class="dp-col-main">
        ${atrasadas}
        <div class="dp-semana-cab">
          <div class="es-tit">${gl({es:'Mi semana', ca:'La meva setmana', en:'My week'})} · ${weekRangeLabel}</div>
          <div class="dp-semana-nav">
            <button type="button" class="btn btn-sm btn-fino pr-ico" data-tip="${escapeHtml(t('title.prevWeek'))}" aria-label="${escapeHtml(t('title.prevWeek'))}" onclick="distWeekShift(-1)"><i class="ti ti-chevron-left"></i></button>
            <button type="button" class="btn btn-sm btn-fino pr-ico" data-tip="${escapeHtml(t('title.nextWeek'))}" aria-label="${escapeHtml(t('title.nextWeek'))}" onclick="distWeekShift(1)"><i class="ti ti-chevron-right"></i></button>
            ${distWeekOffset !== 0 || selDs !== hoy ? `<button type="button" class="btn btn-sm btn-fino" onclick="distHoy()">${t('common.today')}</button>` : ''}
          </div>
        </div>
        <div class="dp-tira">${tira}</div>
        ${dia}
      </div>
      <div class="dp-col-lado">${botones}${turnosCard}${nota}</div>
    </div>
  `;
}

function addEmployeeFromDistribucion(){
  openEmployeeModal();
}

/* ---------- Escrituras (todas pasan por distDatosActuales) ---------- */
function addDistPlato(){
  if(!isOwnerSession()) return;
  const sel = document.getElementById('dist-plato-sel');
  const val = sel && sel.value;
  if(!val) return;
  // El desplegable mezcla platos y elaboraciones: «plato:Nombre» / «elab:Nombre» (un nombre suelto se toma por plato, como siempre).
  const m = /^(plato|elab):(.*)$/.exec(val);
  const tipo = m ? m[1] : 'plato', nombre = m ? m[2] : val;
  const d = distDatosActuales(); if(!d) return;
  const lista = tipo === 'elab' ? d.elabs : d.platos;
  if(!lista.includes(nombre)) lista.push(nombre);
  dpCargoSel = {tipo, nombre};
  saveDB();
  renderDistDetail();
  dpRefrescarCargo();
}
/* ---------- Mesas a cargo de un camarero (12/11) ----------
   Antes el «rango» era un texto libre («Mesas 1-8, Terraza») que no se comparaba con nada. Ahora se ELIGE entre las mesas del plano de
   sala: la zona entera (la «familia») o las mesas sueltas que se quieran. Se guardan los ids de las mesas, así que renombrar una zona
   no rompe nada, y el TPV usa lo mismo para «Mis mesas». */
function distZonasMesas(){
  const mapa = new Map();
  (DB.tables || []).forEach(tb => { const z = tb.zona || ''; if(!mapa.has(z)) mapa.set(z, []); mapa.get(z).push(tb); });
  const orden = typeof getZonaOrder === 'function' ? getZonaOrder() : [];
  const claves = [...mapa.keys()].sort((a, b) => { const ia = orden.indexOf(a), ib = orden.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
  return claves.map(z => ({zona: z, mesas: mapa.get(z)}));
}
function distEmpTieneMesa(empId, tableId){
  const d = DB.workDistribution && DB.workDistribution[empId];
  return !!(d && Array.isArray(d.mesas) && d.mesas.some(x => String(x) === String(tableId)));
}
// Quién más lleva esa mesa (para avisarlo en el selector; se puede repartir igualmente: un compañero cubre a otro).
function distOtrosConMesa(tableId, exceptoId){
  return (DB.employees || []).filter(e => e.id !== exceptoId && e.active !== false && distEmpTieneMesa(e.id, tableId)).map(e => e.name);
}
// Texto de lo que lleva: «Terraza (toda)», «Salón: Mesa 1, Mesa 2», más lo escrito a mano de antes.
function distRangoLabels(d){
  const ids = new Set((d.mesas || []).map(String)), out = [];
  distZonasMesas().forEach(({zona, mesas}) => {
    const sel = mesas.filter(tb => ids.has(String(tb.id)));
    if(!sel.length) return;
    if(sel.length === mesas.length && mesas.length > 1) out.push((zona || gl({es:'Sin zona', ca:'Sense zona', en:'No zone'})) + ' ' + gl({es:'(toda)', ca:'(tota)', en:'(all)'}));
    else out.push((zona ? zona + ': ' : '') + sel.map(tb => (tb.name || '').replace(/\s*\([^)]*\)\s*$/, '')).join(', '));
  });
  return out.concat(d.rangos || []);
}
function distToggleMesa(id){
  if(!isOwnerSession()) return;
  const d = distDatosActuales(); if(!d) return;
  const i = d.mesas.findIndex(x => String(x) === String(id));
  if(i >= 0) d.mesas.splice(i, 1);
  else { const tb = (DB.tables || []).find(x => String(x.id) === String(id)); if(!tb) return; d.mesas.push(tb.id); }
  saveDB(); renderDistDetail(); dpRefrescarCargo();
}
function distToggleZona(idx){
  if(!isOwnerSession()) return;
  const d = distDatosActuales(); if(!d) return;
  const z = distZonasMesas()[idx]; if(!z) return;
  const ids = new Set(d.mesas.map(String));
  const todas = z.mesas.every(tb => ids.has(String(tb.id)));
  if(todas){ const quitar = new Set(z.mesas.map(tb => String(tb.id))); d.mesas = d.mesas.filter(x => !quitar.has(String(x))); }
  else z.mesas.forEach(tb => { if(!ids.has(String(tb.id))) d.mesas.push(tb.id); });
  saveDB(); renderDistDetail(); dpRefrescarCargo();
}
function addDistRango(){
  if(!isOwnerSession()) return;
  const input = document.getElementById('dist-rango-input');
  if(!input) return;
  const nombre = (input.value||'').trim().slice(0, 60);
  if(!nombre) return;
  const d = distDatosActuales(); if(!d) return;
  // Sin distinguir mayúsculas: «Terraza» y «terraza» son el mismo sitio, y duplicarlas dejaría a dos camareros creyendo que llevan zonas distintas.
  if(d.rangos.some(r => r.toLowerCase() === nombre.toLowerCase())){
    showToast(t('dist.zoneAlreadyAssigned'));
    input.value = '';
    return;
  }
  d.rangos.push(nombre);
  saveDB();
  renderDistDetail();
  dpRefrescarCargo();
}
async function removeDistRango(idx){
  if(!isOwnerSession()) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const d = distDatosActuales(); if(!d) return;
  d.rangos.splice(idx, 1);
  saveDB();
  renderDistDetail();
  dpRefrescarCargo();
}
async function removeDistPlato(idx){
  if(!isOwnerSession()) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const d = distDatosActuales(); if(!d) return;
  d.platos.splice(idx,1);
  dpCargoSel = null;
  saveDB();
  renderDistDetail();
  dpRefrescarCargo();
}
async function removeDistElab(idx){
  if(!isOwnerSession()) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const d = distDatosActuales(); if(!d) return;
  d.elabs.splice(idx,1);
  dpCargoSel = null;
  saveDB();
  renderDistDetail();
  dpRefrescarCargo();
}
// Marcar una tarea como hecha es un toque; DESMARCARLA pregunta antes: un dedo de más en una tablet de cocina no debe borrar lo hecho.
async function dpConfirmarDesmarcar(){
  return await confirmModal(gl({es:'¿Seguro que quieres desmarcar esta tarea? Volverá a figurar como pendiente.', ca:'Segur que vols desmarcar aquesta tasca? Tornarà a figurar com a pendent.', en:'Are you sure you want to untick this task? It will go back to pending.'}));
}
async function toggleDistTareaDone(dateStr, taskId, checked){
  if(!checked && !(await dpConfirmarDesmarcar())){ renderDistDetail(); return; }
  const d = distDatosActuales(); if(!d) return;
  if(!d.doneDates[dateStr]) d.doneDates[dateStr] = {};
  d.doneDates[dateStr][taskId] = checked;
  saveDB();
  renderDistDetail();
}
function addDistTarea(dayIdx){
  const inp = document.getElementById('dist-tarea-'+dayIdx);
  if(!inp) return;
  const val = inp.value.trim();
  if(!val) return;
  const d = distDatosActuales(); if(!d) return;
  const rep = document.querySelector('input[name="dp-rep"]:checked');
  const onlyThisDay = rep ? rep.value === 'dia' : false;
  // Si quien añade la tarea no es el propietario real, es el propio empleado auto-organizándose el trabajo (no el jefe
  // asignándoselo), así que se marca como «suya» para poder editarla/borrarla libremente y distinguirla de las que le asigna el jefe.
  const bySelf = !isOwnerSession();
  if(onlyThisDay){
    const ds = dateStr(getWeekDates(distWeekOffset)[dayIdx]);
    if(!d.tareasUnicas[ds]) d.tareasUnicas[ds] = [];
    // Evita duplicar la misma tarea el mismo día por doble Enter/doble clic.
    if(d.tareasUnicas[ds].some(t => t.text.trim().toLowerCase() === val.toLowerCase())){ showToast(t('msg.taskAlreadyExists')); return; }
    d.tareasUnicas[ds].push({id: genId(), text: val, bySelf});
  } else {
    if(!d.produccion[dayIdx]) d.produccion[dayIdx] = [];
    if(d.produccion[dayIdx].some(t => t.text.trim().toLowerCase() === val.toLowerCase())){ showToast(t('msg.taskAlreadyExists')); return; }
    d.produccion[dayIdx].push({id: genId(), text: val, bySelf});
  }
  saveDB();
  renderDistDetail();
  // Para seguir añadiendo: el cursor vuelve al campo.
  const nuevo = document.getElementById('dist-tarea-'+dayIdx);
  if(nuevo) nuevo.focus();
}
// El id de cada tarea lo genera genId() como NÚMERO, pero al llegar aquí desde un onclick/onchange del HTML siempre es TEXTO
// (viene interpolado entre comillas en la plantilla) — comparar con === los dejaba sin coincidir nunca, así que editar no
// guardaba nada y la X no borraba nunca, en silencio. String() a ambos lados.
function updateDistTarea(dayIdx, taskId, val){
  const d = distDatosActuales(); if(!d) return;
  const task = (d.produccion[dayIdx]||[]).find(t=>String(t.id)===String(taskId));
  if(!task || !(isOwnerSession() || task.bySelf)) return;
  task.text = val;
  saveDB();
}
function updateDistTareaUnica(ds, taskId, val){
  const d = distDatosActuales(); if(!d) return;
  const task = (d.tareasUnicas[ds]||[]).find(t=>String(t.id)===String(taskId));
  if(!task || !(isOwnerSession() || task.bySelf)) return;
  task.text = val;
  saveDB();
}
async function removeDistTarea(dayIdx, taskId){
  const d = distDatosActuales(); if(!d) return;
  const task = (d.produccion[dayIdx]||[]).find(t=>String(t.id)===String(taskId));
  if(task && !(isOwnerSession() || task.bySelf)) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  if(d.produccion[dayIdx]){
    d.produccion[dayIdx] = d.produccion[dayIdx].filter(t=>String(t.id)!==String(taskId));
    saveDB();
    renderDistDetail();
  }
}
async function removeDistTareaUnica(ds, taskId){
  const d = distDatosActuales(); if(!d) return;
  const task = (d.tareasUnicas[ds]||[]).find(t=>String(t.id)===String(taskId));
  if(task && !(isOwnerSession() || task.bySelf)) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  if(d.tareasUnicas[ds]){
    d.tareasUnicas[ds] = d.tareasUnicas[ds].filter(t=>String(t.id)!==String(taskId));
    saveDB();
    renderDistDetail();
  }
}
// Editar el texto de una tarea (la plantilla semanal o la puntual): una ventana pequeña, en vez de un campo suelto en cada fila.
function dpEditarTarea(k, ds, taskId, idx){
  const d = distDatosActuales(); if(!d) return;
  const lista = k === 'prod' ? (d.produccion[idx]||[]) : (d.tareasUnicas[ds]||[]);
  const task = lista.find(x => String(x.id) === String(taskId));
  if(!task || !(isOwnerSession() || task.bySelf)) return;
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header"><h3><i class="ti ti-pencil"></i> ${t('common.edit')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="field"><label for="dp-edit-txt">${gl({es:'Tarea', ca:'Tasca', en:'Task'})}</label><input type="text" id="dp-edit-txt" maxlength="140" value="${escapeHtml(task.text)}" onkeydown="if(event.key==='Enter'){event.preventDefault();dpGuardarTarea('${k}','${escapeJsAttr(ds)}','${escapeJsAttr(String(taskId))}',${idx == null ? 'null' : idx})}"></div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button type="button" class="btn btn-fino is-on" onclick="dpGuardarTarea('${k}','${escapeJsAttr(ds)}','${escapeJsAttr(String(taskId))}',${idx == null ? 'null' : idx})"><i class="ti ti-check"></i> ${t('common.save')}</button>
    </div>`);
  setTimeout(() => { const i = document.getElementById('dp-edit-txt'); if(i){ i.focus(); i.select(); } }, 50);
}
function dpGuardarTarea(k, ds, taskId, idx){
  const inp = document.getElementById('dp-edit-txt');
  const val = inp ? inp.value.trim() : '';
  if(!val){ showToast(t('msg.nameRequired')); return; }
  if(k === 'prod') updateDistTarea(idx, taskId, val); else updateDistTareaUnica(ds, taskId, val);
  closeModal();
  renderDistDetail();
}

/* ---------- A su cargo: todo en una ventana, y cada cosa se lee ahí mismo ----------
   Antes eran tarjetas en una columna que crecía con cada plato, y pulsar una llevaba a la ficha técnica y había que volver.
   Ahora un botón abre la lista entera (platos y elaboraciones) y, al elegir una, su receta se ve debajo sin salir. */
let dpCargoSel = null;   // {tipo:'plato'|'elab', nombre}
function dpFichaPorNombre(nombre){
  return (DB.fichas||[]).find(f => {
    const r = f.recipeId ? DB.recipes.find(x => x.id === f.recipeId) : null;
    const fArea = f.area || (r && r.area) || 'cocina';
    return fArea === currentArea() && (r ? r.name : f.name) === nombre;
  }) || null;
}
function dpElaboracionesDisponibles(){
  return DB.recipes.filter(r => r.isBase && (r.area||'cocina') === currentArea() && r.name).map(r => r.name).sort((a, b) => a.localeCompare(b));
}
function dpCargoDetalleHtml(tipo, nombre){
  const rec = DB.recipes.find(r => r.name === nombre && (r.area||'cocina') === currentArea()) || null;
  const f = dpFichaPorNombre(nombre);
  if(!rec && !f){
    return `<div class="empty es-vacio"><i class="ti ti-link-off"></i>${gl({es:'Ya no existe su ficha ni su escandallo. Quítalo de su cargo o vuelve a crearlo.', ca:'Ja no existeix la seva fitxa ni el seu escandall. Treu-lo del seu càrrec o torna a crear-lo.', en:'Its recipe sheet and costing no longer exist. Remove it from their charge or create it again.'})}</div>`;
  }
  const alerg = f ? getFichaAllergens(f) : [...recipeAllergens(rec)];
  const lineas = f ? getFichaIngredientLines(f) : (rec.ingredients||[]).map(line => { const info = renderEscandalloLineLabel(line); return info ? {qty: line.qty, unit: info.unit, name: info.name} : null; }).filter(Boolean);
  const fx = f ? fiFactor(f) : {factor: 1, produccion: (rec && rec.comensales) || 1};
  const pasos = f ? (f.pasos||[]).map((p, i) => ({p, d: (f.pasosDet||[])[i] || {}})).filter(x => x.p && String(x.p).trim()) : [];
  const tiempo = pasos.reduce((n, x) => n + (parseFloat(x.d.min) || 0), 0);
  return `
    <div class="dp-det-cab">
      ${f && f.photo ? `<img class="dp-det-foto" src="${f.photo}" alt="" onclick="openFichaPhotoLightbox(this.src)">` : ''}
      <div class="dp-det-tit">
        <h4>${escapeHtml(nombre)}</h4>
        <span class="pr-chip">${tipo === 'elab' ? gl({es:'Elaboración', ca:'Elaboració', en:'Preparation'}) : gl({es:'Plato', ca:'Plat', en:'Dish'})}</span>
        ${alerg.length ? `<div class="dp-det-alerg">${alerg.map(a => `<span class="ml-al">${escapeHtml(allergenLabel(a))}</span>`).join('')}</div>` : `<div class="pr-ayuda">${gl({es:'Sin alérgenos declarados', ca:'Sense al·lèrgens declarats', en:'No allergens declared'})}</div>`}
      </div>
    </div>
    <div class="dp-det-stats">
      <div><span>${t('label.ingredients')}</span><b>${lineas.length}</b></div>
      <div><span>${gl({es:'Pasos', ca:'Passos', en:'Steps'})}</span><b>${pasos.length}</b></div>
      <div><span>${gl({es:'Tiempo', ca:'Temps', en:'Time'})}</span><b>${tiempo ? tiempo + ' min' : '—'}</b></div>
      <div><span>${gl({es:'Raciones', ca:'Racions', en:'Servings'})}</span><b>${fmtNum(fx.produccion)}</b></div>
    </div>
    <div class="dp-det-cols">
      <section>
        <div class="es-tit">${t('label.ingredients')}</div>
        ${lineas.length ? `<ul class="dp-ings">${lineas.map(l => `<li><span class="dp-ing-q">${l.qty != null ? `${fmtNum(l.qty * fx.factor)} <small>${escapeHtml(l.unit)}</small>` : '—'}</span><span>${escapeHtml(l.name)}</span></li>`).join('')}</ul>` : `<p class="pr-ayuda">${t('empty.noIngredients')}</p>`}
      </section>
      <section>
        <div class="es-tit">${gl({es:'Paso a paso', ca:'Pas a pas', en:'Step by step'})}</div>
        ${pasos.length ? `<ol class="dp-pasos">${pasos.map(x => `<li><p>${escapeHtml(x.p)}</p>${x.d.min ? `<div class="dp-paso-chips"><span class="fi-chip"><i class="ti ti-clock"></i> ${escapeHtml(String(x.d.min))} min</span></div>` : ''}${x.d.aviso ? `<div class="fi-ojo"><b>${gl({es:'Ojo', ca:'Ull', en:'Watch out'})}</b> ${escapeHtml(x.d.aviso)}</div>` : ''}</li>`).join('')}</ol>` : `<p class="pr-ayuda">${f ? t('label.notSpecified') : gl({es:'Todavía no tiene ficha técnica con el paso a paso.', ca:'Encara no té fitxa tècnica amb el pas a pas.', en:'It has no recipe sheet with steps yet.'})}</p>`}
      </section>
    </div>`;
}
function dpCargoElegir(tipo, nombre){
  dpCargoSel = {tipo, nombre};
  dpRefrescarCargo();
}
// Si la ventana de «a su cargo» está abierta, se vuelve a pintar (tras asignar, quitar o elegir otro).
function dpRefrescarCargo(){
  if(document.getElementById('dp-cargo-modal') && distCurrentEmployeeId != null) openDistCargo(distCurrentEmployeeId);
}
function openDistCargo(empId){
  if(!distPuedeVer(empId)) return;
  const emp = DB.employees.find(e => e.id === empId);
  if(!emp) return;
  const d = getDistEmpData(empId);
  const isSala = currentArea() === 'sala';
  const ownerSess = isOwnerSession();
  distCurrentEmployeeId = empId;
  let cuerpo = '', asignar = '';
  if(isSala){
    const ids = new Set(d.mesas.map(String));
    const legado = d.rangos.length
      ? `<div class="dp-grupo"><div class="es-tit">${gl({es:'Escrito a mano (de antes)', ca:'Escrit a mà (d\'abans)', en:'Typed by hand (from before)'})}</div><div class="dp-chips">${d.rangos.map((rg, i) => `<span class="dp-chip es-zona"><i class="ti ti-map-pin"></i> ${escapeHtml(rg)}${ownerSess ? ggMenuAcciones([{icono:'ti-trash', texto:t('common.delete'), fn:`removeDistRango(${i})`, peligro:true}], {clase:'ggma-chip'}) : ''}</span>`).join('')}</div></div>`
      : '';
    const zonas = distZonasMesas();
    if(!zonas.length){
      cuerpo = `<div class="empty es-vacio"><i class="ti ti-map-pin"></i>${gl({es:'Aún no hay mesas. Créalas en Mi Negocio → Plano de sala y aquí las podrás asignar con un toque.', ca:'Encara no hi ha taules. Crea-les a El meu negoci → Plànol de sala i aquí les podràs assignar amb un toc.', en:'There are no tables yet. Create them in My Business → Floor plan and you can assign them here with one tap.'})}</div>${legado}`;
    } else if(ownerSess){
      cuerpo = `<p class="dp-ayuda-mesas">${gl({es:'Toca una zona para darle toda la zona, o toca las mesas que quieras. Verá estas mesas como «Mis mesas» en el TPV; el resto las sigue viendo y puede ayudar en ellas.', ca:'Toca una zona per donar-li tota la zona, o toca les taules que vulguis. Veurà aquestes taules com «Les meves taules» al TPV; la resta les continua veient i pot ajudar-hi.', en:'Tap a zone to give the whole zone, or tap the tables you want. They will see these as “My tables” in the POS; they still see the rest and can help out.'})}</p>
        ${zonas.map((z, zi) => {
          const todas = z.mesas.every(tb => ids.has(String(tb.id)));
          const n = z.mesas.filter(tb => ids.has(String(tb.id))).length;
          return `<div class="dp-grupo dp-mesas-zona"><div class="es-tit"><button type="button" class="btn btn-sm btn-fino${todas ? ' is-on' : ''}" aria-pressed="${todas}" onclick="distToggleZona(${zi})"><i class="ti ti-map-pin"></i> ${escapeHtml(z.zona || gl({es:'Sin zona', ca:'Sense zona', en:'No zone'}))} · ${gl({es:'toda la zona', ca:'tota la zona', en:'whole zone'})}</button> <span class="dp-cuenta">${n}/${z.mesas.length}</span></div>
            <div class="dp-chips">${z.mesas.map(tb => { const sel = ids.has(String(tb.id)); const otros = distOtrosConMesa(tb.id, empId); return `<button type="button" class="dp-chip${sel ? ' is-sel' : ''}" aria-pressed="${sel}" data-mid="${escapeHtml(String(tb.id))}" onclick="distToggleMesa(this.dataset.mid)">${escapeHtml((tb.name || '').replace(/\s*\([^)]*\)\s*$/, ''))}${otros.length ? `<small class="dp-otros"> · ${gl({es:'también', ca:'també', en:'also'})} ${escapeHtml(otros.slice(0, 2).join(', '))}</small>` : ''}</button>`; }).join('')}</div></div>`;
        }).join('')}${legado}`;
    } else {
      const etq = distRangoLabels(d);
      cuerpo = etq.length ? `<div class="dp-chips">${etq.map(x => `<span class="dp-chip es-zona"><i class="ti ti-map-pin"></i> ${escapeHtml(x)}</span>`).join('')}</div>` : `<div class="empty es-vacio"><i class="ti ti-map-pin"></i>${t('dist.noZonesAssigned')}</div>`;
    }
  } else {
    const todos = [...d.platos.map((n, i) => ({tipo:'plato', nombre:n, idx:i})), ...d.elabs.map((n, i) => ({tipo:'elab', nombre:n, idx:i}))];
    if(!dpCargoSel || !todos.some(x => x.tipo === dpCargoSel.tipo && x.nombre === dpCargoSel.nombre)) dpCargoSel = todos[0] ? {tipo: todos[0].tipo, nombre: todos[0].nombre} : null;
    const conFicha = getDishNamesWithFicha();
    const roto = x => x.tipo === 'plato' ? !conFicha.includes(x.nombre) && !DB.recipes.some(r => r.name === x.nombre) : !dpElaboracionesDisponibles().includes(x.nombre);
    const esSel = x => !!(dpCargoSel && dpCargoSel.tipo === x.tipo && dpCargoSel.nombre === x.nombre);
    const grupo = (tipo, titulo, ico) => {
      const items = todos.filter(x => x.tipo === tipo);
      if(!items.length) return '';
      return `<div class="dp-grupo"><div class="es-tit">${titulo} <span class="dp-cuenta">${items.length}</span></div><div class="dp-chips">${items.map(x => `<button type="button" class="dp-chip${esSel(x) ? ' is-sel' : ''}${roto(x) ? ' is-roto' : ''}" aria-pressed="${esSel(x)}" onclick="dpCargoElegir('${x.tipo}','${escapeJsAttr(x.nombre)}')"><i class="ti ${roto(x) ? 'ti-link-off' : ico}"></i><span>${escapeHtml(x.nombre)}</span></button>`).join('')}</div></div>`;
    };
    const quitar = dpCargoSel && ownerSess ? (() => { const x = todos.find(esSel); return x ? ggMenuAcciones([{icono:'ti-trash', texto:gl({es:'Quitar de su cargo', ca:'Treure del seu càrrec', en:'Remove from their charge'}), fn: x.tipo === 'elab' ? `removeDistElab(${x.idx})` : `removeDistPlato(${x.idx})`, peligro:true}], {clase:'btn btn-fino mn-btn dp-mas', tip:true}) : ''; })() : '';
    const opcP = conFicha.filter(n => !d.platos.includes(n)).map(n => `<option value="plato:${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    const opcE = dpElaboracionesDisponibles().filter(n => !d.elabs.includes(n)).map(n => `<option value="elab:${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    cuerpo = todos.length
      ? `<div class="dp-cargo-grid">
           <nav class="dp-cargo-lista" aria-label="${escapeHtml(gl({es:'Platos y elaboraciones', ca:'Plats i elaboracions', en:'Dishes and preparations'}))}">${grupo('plato', gl({es:'Platos', ca:'Plats', en:'Dishes'}), 'ti-tools-kitchen-2')}${grupo('elab', gl({es:'Elaboraciones', ca:'Elaboracions', en:'Preparations'}), 'ti-soup')}</nav>
           <section class="dp-detalle">${quitar ? `<div class="dp-detalle-bt">${quitar}</div>` : ''}${dpCargoSel ? dpCargoDetalleHtml(dpCargoSel.tipo, dpCargoSel.nombre) : ''}</section>
         </div>`
      : `<div class="empty es-vacio"><i class="ti ti-tools-kitchen-2"></i>${t('dist.noDishesAssigned')}${!opcP && !opcE ? `<br><small>${t('dist.noFichasYet')}</small>` : ''}</div>`;
    // El botón de asignar va ARRIBA, junto al título: con muchos platos la lista crece y abajo del todo no se encontraba.
    if(ownerSess) asignar = `<div class="dp-asignar-cab"><select id="dist-plato-sel" aria-label="${escapeHtml(t('dist.selectDish'))}"><option value="">${t('dist.selectDish')}</option>${opcP ? `<optgroup label="${escapeHtml(gl({es:'Platos', ca:'Plats', en:'Dishes'}))}">${opcP}</optgroup>` : ''}${opcE ? `<optgroup label="${escapeHtml(gl({es:'Elaboraciones', ca:'Elaboracions', en:'Preparations'}))}">${opcE}</optgroup>` : ''}</select><button type="button" class="btn btn-fino is-on" onclick="addDistPlato()"><i class="ti ti-plus"></i> ${t('btn.assign')}</button></div>`;
  }
  openModal(`
    <div class="idr-modal"></div>
    <div id="dp-cargo-modal">
      <div class="modal-header dp-cargo-cab">
        <h3><i class="ti ${isSala ? 'ti-map-pin' : 'ti-tools-kitchen-2'}"></i> ${isSala ? t('dist.zonesTitle') : gl({es:'A su cargo', ca:'Al seu càrrec', en:'In their charge'})} · ${escapeHtml(emp.name)}</h3>
        ${asignar}
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      ${cuerpo}
      <div class="modal-footer"><button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button></div>
    </div>`, {xl: true});
}

/* ---------- Manual del puesto ----------
   El propietario escribe, por cada empleado, lo que se espera de su puesto: qué hace, de qué responde y qué normas sigue.
   Cada cambio sube la versión; el empleado confirma «lo he leído» y se guarda de QUÉ versión. Si el dueño lo cambia después,
   vuelve a salir «por leer»: así hay constancia de que la persona conoce lo vigente, sin depender de la memoria de nadie. */
const DP_MANUAL_TIPOS = [
  {k:'obligacion', ico:'ti-checklist', titulo: () => gl({es:'Obligaciones', ca:'Obligacions', en:'Duties'}), corto: () => gl({es:'obligaciones', ca:'obligacions', en:'duties'}), ayuda: () => gl({es:'Lo que haces en cada turno.', ca:'El que fas a cada torn.', en:'What you do on every shift.'})},
  {k:'responsabilidad', ico:'ti-shield-check', titulo: () => gl({es:'Responsabilidades', ca:'Responsabilitats', en:'Responsibilities'}), corto: () => gl({es:'responsab.', ca:'responsab.', en:'responsib.'}), ayuda: () => gl({es:'De lo que respondes tú.', ca:'Del que respons tu.', en:'What you answer for.'})},
  {k:'norma', ico:'ti-alert-triangle', titulo: () => gl({es:'Normas y límites', ca:'Normes i límits', en:'Rules and limits'}), corto: () => gl({es:'normas', ca:'normes', en:'rules'}), ayuda: () => gl({es:'Lo que se hace siempre y lo que no se hace nunca.', ca:'El que es fa sempre i el que no es fa mai.', en:'What is always done and what is never done.'})},
  {k:'nota', ico:'ti-bulb', titulo: () => gl({es:'Consejos y contactos', ca:'Consells i contactes', en:'Tips and contacts'}), corto: () => gl({es:'consejos', ca:'consells', en:'tips'}), ayuda: () => gl({es:'A quién llamar, trucos, dónde está cada cosa.', ca:'A qui trucar, trucs, on és cada cosa.', en:'Who to call, tricks, where things are.'})}
];
function dpManualTocar(d){
  d.manual.version = (d.manual.version || 0) + 1;
  d.manual.actualizado = new Date().toISOString();
  saveDB();
}
function dpManualPlantilla(area){
  const sala = area === 'sala';
  const o = (es, ca, en, tipo) => ({id: genId(), tipo, titulo: gl({es, ca, en}), texto: ''});
  return sala ? [
    o('Llegar con tiempo y de uniforme limpio', 'Arribar amb temps i amb l\'uniforme net', 'Arrive on time in a clean uniform', 'obligacion'),
    o('Montar y revisar mis mesas antes de abrir', 'Muntar i revisar les meves taules abans d\'obrir', 'Set up and check my tables before opening', 'obligacion'),
    o('Tomar nota con claridad, avisando siempre de alérgenos', 'Prendre nota amb claredat, avisant sempre d\'al·lèrgens', 'Take orders clearly, always flagging allergens', 'obligacion'),
    o('Dejar mi zona recogida y limpia al cerrar', 'Deixar la meva zona recollida i neta en tancar', 'Leave my area tidy and clean when closing', 'obligacion'),
    o('El estado y la limpieza de mi zona', 'L\'estat i la neteja de la meva zona', 'The condition and cleanliness of my area', 'responsabilidad'),
    o('Cobrar bien y avisar de cualquier incidencia de caja', 'Cobrar bé i avisar de qualsevol incidència de caixa', 'Charge correctly and report any till issue', 'responsabilidad'),
    o('Nunca prometer a un cliente algo sin consultarlo con cocina', 'Mai prometre a un client res sense consultar-ho amb cuina', 'Never promise a guest anything without checking with the kitchen', 'norma'),
    o('El móvil, fuera del salón durante el servicio', 'El mòbil, fora de la sala durant el servei', 'No phone on the floor during service', 'norma')
  ] : [
    o('Llegar con tiempo, uniforme limpio y manos lavadas', 'Arribar amb temps, uniforme net i mans rentades', 'Arrive on time, in a clean uniform with washed hands', 'obligacion'),
    o('Revisar mi mise en place y las fichas técnicas del día', 'Revisar la meva mise en place i les fitxes tècniques del dia', 'Check my mise en place and the day\'s recipe sheets', 'obligacion'),
    o('Etiquetar y fechar todo lo que preparo', 'Etiquetar i datar tot el que preparo', 'Label and date everything I prepare', 'obligacion'),
    o('Dejar mi puesto limpio y recogido al terminar', 'Deixar el meu lloc net i recollit en acabar', 'Leave my station clean and tidy when finished', 'obligacion'),
    o('Los platos y elaboraciones que tengo a mi cargo', 'Els plats i elaboracions que tinc al meu càrrec', 'The dishes and preparations I am in charge of', 'responsabilidad'),
    o('Avisar de lo que falta antes de que se acabe', 'Avisar del que falta abans que s\'acabi', 'Flag what is running low before it runs out', 'responsabilidad'),
    o('Respetar siempre la cadena de frío y las temperaturas', 'Respectar sempre la cadena de fred i les temperatures', 'Always respect the cold chain and temperatures', 'norma'),
    o('Nunca tirar ni sustituir un ingrediente sin avisar', 'Mai llençar ni substituir un ingredient sense avisar', 'Never discard or swap an ingredient without telling anyone', 'norma')
  ];
}
function dpManualLector(d, emp, ownerSess){
  const man = d.manual;
  const leido = d.manualLeido && d.manualLeido.version === man.version;
  const esMio = loggedInEmployeeId() === emp.id;
  return DP_MANUAL_TIPOS.map(tp => {
    const items = man.items.filter(x => x.tipo === tp.k);
    if(!items.length) return '';
    return `
      <section class="dp-man-sec">
        <div class="es-tit"><i class="ti ${tp.ico}"></i> ${escapeHtml(tp.titulo())}</div>
        <ol class="dp-man-lista">${items.map(it => `<li><b>${escapeHtml(it.titulo)}</b>${it.texto ? `<span>${escapeHtml(it.texto)}</span>` : ''}</li>`).join('')}</ol>
      </section>`;
  }).join('');
}
function openDistManual(empId){
  if(!distPuedeVer(empId)) return;
  const emp = DB.employees.find(e => e.id === empId);
  if(!emp) return;
  const d = getDistEmpData(empId);
  const man = d.manual;
  const ownerSess = isOwnerSession();
  const esMio = loggedInEmployeeId() === empId;
  const leido = d.manualLeido && d.manualLeido.version === man.version;
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-book-2"></i> ${gl({es:'Manual del puesto', ca:'Manual del lloc', en:'Job manual'})} · ${escapeHtml(emp.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="ml-intro">${esMio ? gl({es:'Esto es lo que se espera de ti en tu puesto. Léelo con calma y, cuando lo tengas claro, confírmalo abajo.', ca:'Això és el que s\'espera de tu al teu lloc. Llegeix-lo amb calma i, quan ho tinguis clar, confirma-ho a baix.', en:'This is what is expected of you in your role. Read it carefully and confirm below once it is clear.'}) : gl({es:'Obligaciones y responsabilidades de este puesto.', ca:'Obligacions i responsabilitats d\'aquest lloc.', en:'Duties and responsibilities of this role.'})}</p>
    ${dpManualLector(d, emp, ownerSess) || `<div class="empty es-vacio"><i class="ti ti-book-off"></i>${gl({es:'Aún no hay nada escrito.', ca:'Encara no hi ha res escrit.', en:'Nothing written yet.'})}</div>`}
    <div class="modal-footer">
      ${ownerSess ? `<button type="button" class="btn btn-fino" style="margin-right:auto" onclick="printManualEmpleado(${empId})"><i class="ti ti-printer"></i> ${t('common.print')}</button>` : ''}
      ${leido ? `<span class="pr-chip ok" style="margin-right:auto"><i class="ti ti-circle-check"></i> ${gl({es:'Leído el ', ca:'Llegit el ', en:'Read on '})}${escapeHtml(new Date(d.manualLeido.ts).toLocaleDateString(localeActual(), {day:'numeric', month:'long'}))}</span>` : ''}
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button>
      ${esMio && !leido && man.items.length ? `<button type="button" class="btn btn-fino is-on" onclick="dpManualConfirmar(${empId})"><i class="ti ti-check"></i> ${gl({es:'He leído mi manual', ca:'He llegit el meu manual', en:'I have read my manual'})}</button>` : ''}
    </div>`, {xl: true});
}
function dpManualConfirmar(empId){
  if(loggedInEmployeeId() !== empId) return;
  const d = getDistEmpData(empId);
  d.manualLeido = {version: d.manual.version, ts: new Date().toISOString()};
  logAudit('manual_read', gl({es:'Ha confirmado la lectura de su manual del puesto', ca:'Ha confirmat la lectura del seu manual del lloc', en:'Confirmed reading their job manual'}));
  saveDB();
  closeModal();
  showToast(gl({es:'Anotado. Gracias.', ca:'Anotat. Gràcies.', en:'Noted. Thank you.'}));
  renderDistDetail();
}

function openDistManualEditor(empId){
  if(!isOwnerSession()) return;
  const emp = DB.employees.find(e => e.id === empId);
  if(!emp) return;
  const d = getDistEmpData(empId);
  const man = d.manual;
  const sec = tp => {
    const items = man.items.filter(x => x.tipo === tp.k);
    const editando = dpManualEdit && dpManualEdit.tipo === tp.k ? man.items.find(x => x.id === dpManualEdit.id) : null;
    return `
      <section class="dp-man-sec">
        <div class="es-tit"><i class="ti ${tp.ico}"></i> ${escapeHtml(tp.titulo())} <span class="dp-man-ay">${escapeHtml(tp.ayuda())}</span></div>
        ${items.length ? `<ol class="dp-man-lista dp-man-ed">${items.map((it, i) => `<li><div class="dp-man-ed-txt"><b>${escapeHtml(it.titulo)}</b>${it.texto ? `<span>${escapeHtml(it.texto)}</span>` : ''}</div>${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`dpManualEditar('${tp.k}','${escapeJsAttr(String(it.id))}')`},
          i > 0 ? {icono:'ti-arrow-up', texto:gl({es:'Subir', ca:'Pujar', en:'Move up'}), fn:`dpManualMover('${escapeJsAttr(String(it.id))}',-1)`} : null,
          i < items.length - 1 ? {icono:'ti-arrow-down', texto:gl({es:'Bajar', ca:'Baixar', en:'Move down'}), fn:`dpManualMover('${escapeJsAttr(String(it.id))}',1)`} : null,
          {icono:'ti-trash', texto:t('common.delete'), fn:`dpManualBorrar('${escapeJsAttr(String(it.id))}')`, peligro:true}
        ], {clase:'btn btn-fino mn-btn dp-mas', tip:true})}</li>`).join('')}</ol>` : ''}
        <div class="dp-man-form">
          <input type="text" id="dpm-t-${tp.k}" maxlength="120" placeholder="${escapeHtml(gl({es:'Escribe una frase corta…', ca:'Escriu una frase curta…', en:'Write a short sentence…'}))}" value="${escapeHtml(editando ? editando.titulo : '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();dpManualGuardar('${tp.k}')}">
          <textarea id="dpm-x-${tp.k}" rows="2" maxlength="600" placeholder="${escapeHtml(gl({es:'Detalle (opcional)', ca:'Detall (opcional)', en:'Detail (optional)'}))}">${escapeHtml(editando ? editando.texto : '')}</textarea>
          <div class="dp-man-form-bt">
            ${editando ? `<button type="button" class="btn btn-sm btn-fino" onclick="dpManualEdit=null;openDistManualEditor(${empId})">${t('common.cancel')}</button>` : ''}
            <button type="button" class="btn btn-sm btn-fino is-on" onclick="dpManualGuardar('${tp.k}')"><i class="ti ${editando ? 'ti-check' : 'ti-plus'}"></i> ${editando ? t('common.save') : gl({es:'Añadir', ca:'Afegir', en:'Add'})}</button>
          </div>
        </div>
      </section>`;
  };
  const estado = !man.items.length ? '' : (d.manualLeido && d.manualLeido.version === man.version
    ? `<span class="pr-chip ok"><i class="ti ti-circle-check"></i> ${escapeHtml(emp.name.split(' ')[0])} ${gl({es:'lo leyó el ', ca:'el va llegir el ', en:'read it on '})}${escapeHtml(new Date(d.manualLeido.ts).toLocaleDateString(localeActual(), {day:'numeric', month:'short'}))}</span>`
    : `<span class="pr-chip msg"><i class="ti ti-eye-off"></i> ${d.manualLeido ? gl({es:'Cambiado desde su última lectura', ca:'Canviat des de la seva última lectura', en:'Changed since last read'}) : gl({es:'Aún sin leer', ca:'Encara sense llegir', en:'Not read yet'})}</span>`);
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-book-2"></i> ${gl({es:'Manual de', ca:'Manual de', en:'Manual for'})} ${escapeHtml(emp.name)}</h3>
      <button class="modal-close" onclick="dpManualEdit=null;closeModal();renderDistDetail()">&times;</button>
    </div>
    <div class="dp-man-estado">${estado}
      ${!man.items.length ? `<button type="button" class="btn btn-sm btn-fino" onclick="dpManualAplicarPlantilla(${empId})"><i class="ti ti-wand"></i> ${gl({es:'Empezar con una plantilla', ca:'Començar amb una plantilla', en:'Start from a template'})}</button>` : `<button type="button" class="btn btn-sm btn-fino" onclick="printManualEmpleado(${empId})"><i class="ti ti-printer"></i> ${t('common.print')}</button>`}
    </div>
    <p class="ml-intro">${gl({es:'Cada cambio que hagas hará que el empleado tenga que volver a confirmar que lo ha leído.', ca:'Cada canvi que facis farà que l\'empleat hagi de tornar a confirmar que l\'ha llegit.', en:'Every change you make asks the employee to confirm they have read it again.'})}</p>
    ${DP_MANUAL_TIPOS.map(sec).join('')}
    <div class="modal-footer">
      <button type="button" class="btn btn-fino is-on" onclick="dpManualEdit=null;closeModal();renderDistDetail()"><i class="ti ti-check"></i> ${gl({es:'Listo', ca:'Llest', en:'Done'})}</button>
    </div>`, {xl: true});
}
function dpManualGuardar(tipo){
  if(!isOwnerSession()) return;
  const d = distDatosActuales(); if(!d) return;
  const ti = document.getElementById('dpm-t-' + tipo), tx = document.getElementById('dpm-x-' + tipo);
  const titulo = ti ? ti.value.trim() : '', texto = tx ? tx.value.trim() : '';
  if(!titulo){ showToast(gl({es:'Escribe al menos una frase.', ca:'Escriu almenys una frase.', en:'Write at least one sentence.'})); if(ti) ti.focus(); return; }
  if(dpManualEdit && dpManualEdit.tipo === tipo){
    const it = d.manual.items.find(x => x.id === dpManualEdit.id);
    if(it){ it.titulo = titulo; it.texto = texto; }
    dpManualEdit = null;
  } else {
    d.manual.items.push({id: genId(), tipo, titulo, texto});
  }
  dpManualTocar(d);
  openDistManualEditor(distCurrentEmployeeId);
  const nuevo = document.getElementById('dpm-t-' + tipo); if(nuevo) nuevo.focus();
}
function dpManualEditar(tipo, id){
  const d = distDatosActuales(); if(!d) return;
  const it = d.manual.items.find(x => String(x.id) === String(id));
  if(!it) return;
  dpManualEdit = {tipo, id: it.id};
  openDistManualEditor(distCurrentEmployeeId);
  const ti = document.getElementById('dpm-t-' + tipo); if(ti){ ti.focus(); ti.scrollIntoView({block:'center'}); }
}
function dpManualMover(id, dir){
  if(!isOwnerSession()) return;
  const d = distDatosActuales(); if(!d) return;
  const lista = d.manual.items;
  const i = lista.findIndex(x => String(x.id) === String(id));
  if(i < 0) return;
  // Se mueve dentro de su mismo apartado: se busca el vecino anterior/siguiente del MISMO tipo.
  const tipo = lista[i].tipo;
  let j = i + dir;
  while(j >= 0 && j < lista.length && lista[j].tipo !== tipo) j += dir;
  if(j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  dpManualTocar(d);
  openDistManualEditor(distCurrentEmployeeId);
}
async function dpManualBorrar(id){
  if(!isOwnerSession()) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const d = distDatosActuales(); if(!d) return;
  d.manual.items = d.manual.items.filter(x => String(x.id) !== String(id));
  if(dpManualEdit && String(dpManualEdit.id) === String(id)) dpManualEdit = null;
  dpManualTocar(d);
  openDistManualEditor(distCurrentEmployeeId);
}
function dpManualAplicarPlantilla(empId){
  if(!isOwnerSession()) return;
  const emp = DB.employees.find(e => e.id === empId);
  const d = distDatosActuales(); if(!d || !emp || d.manual.items.length) return;
  d.manual.items = dpManualPlantilla(emp.area || currentArea());
  dpManualTocar(d);
  openDistManualEditor(empId);
}
function printManualEmpleado(empId){
  if(!distPuedeVer(empId)) return;
  const emp = DB.employees.find(e => e.id === empId);
  if(!emp) return;
  const d = getDistEmpData(empId);
  const title = gl({es:'Manual del puesto', ca:'Manual del lloc', en:'Job manual'});
  let body = printReportHeaderHtml(title, emp.name + (emp.rol ? ' — ' + emp.rol : ''));
  body += DP_MANUAL_TIPOS.map(tp => {
    const items = d.manual.items.filter(x => x.tipo === tp.k);
    if(!items.length) return '';
    return `<h2>${escapeHtml(tp.titulo())}</h2><ol>${items.map(it => `<li><strong>${escapeHtml(it.titulo)}</strong>${it.texto ? `<br><span>${escapeHtml(it.texto)}</span>` : ''}</li>`).join('')}</ol>`;
  }).join('') || `<div class="pr-empty">${t('common.noResults')}</div>`;
  body += `<table style="margin-top:36px"><tr><td style="width:50%;height:70px;vertical-align:bottom">${gl({es:'Recibí y entiendo este manual. Firma:', ca:'He rebut i entenc aquest manual. Signatura:', en:'I have received and understand this manual. Signature:'})}</td><td style="vertical-align:bottom">${gl({es:'Fecha:', ca:'Data:', en:'Date:'})}</td></tr></table>`;
  printReportWindow(title, body);
}

function printDistribucion(empId){
  migrateWorkDistribution();
  // Un empleado imprime solo lo suyo, aunque pidiera «todo el equipo».
  const yo = loggedInEmployeeId();
  const targets = yo != null ? DB.employees.filter(e => e.id === yo) : (empId ? DB.employees.filter(e=>e.id===empId) : areaEmployees());
  const isSala = currentArea() === 'sala';
  const title = t('view.distribucion.title');
  let body = printReportHeaderHtml(title);
  if(!targets.length){
    body += `<div class="pr-empty">${t('common.noResults')}</div>`;
  }
  targets.forEach(emp => {
    const d = getDistEmpData(emp.id);
    const rows = [];
    if(isSala && distRangoLabels(d).length) rows.push(`<tr><td style="width:110px"><strong>${t('common.zones')}</strong></td><td>${distRangoLabels(d).map(escapeHtml).join(' · ')}</td></tr>`);
    if(!isSala && d.platos.length) rows.push(`<tr><td style="width:110px"><strong>${t('common.dishes')}</strong></td><td>${d.platos.map(escapeHtml).join(' · ')}</td></tr>`);
    if(!isSala && d.elabs.length) rows.push(`<tr><td style="width:110px"><strong>${gl({es:'Elaboraciones', ca:'Elaboracions', en:'Preparations'})}</strong></td><td>${d.elabs.map(escapeHtml).join(' · ')}</td></tr>`);
    WEEK_DAYS.forEach((_, idx) => {
      const label = weekDayFull(idx);
      const tasks = d.produccion[idx] || [];
      if(tasks.length) rows.push(`<tr><td><strong>${escapeHtml(label)}</strong></td><td>${tasks.map(task=>escapeHtml(task.text)).join(' · ')}</td></tr>`);
    });
    body += `
      <h2>${escapeHtml(emp.name)}${emp.rol ? ` <span style="text-transform:none;font-weight:400;color:#888">— ${escapeHtml(emp.rol)}</span>` : ''}</h2>
      ${rows.length ? `<table>${rows.join('')}</table>` : `<div class="pr-empty">${t('common.noResults')}</div>`}
    `;
  });
  printReportWindow(title, body);
}

/* ============================================================
   CLIENTES — Fichas de cliente y fidelización
   ============================================================ */
// Ventas de un cliente: por clientId siempre que la venta lo tenga guardado
// (así un cambio de nombre o dos clientes con el mismo nombre no mezclan ni
// pierden el historial); solo si la venta es antigua y no tiene clientId se
// cae al criterio anterior de comparar el nombre en texto.
function clientSales(c){
  return DB.sales.filter(s => s.clientId != null ? s.clientId === c.id : (s.clienteNombre && s.clienteNombre.trim().toLowerCase() === c.name.trim().toLowerCase()));
}
// Cálculo compartido a partir de un array de ventas YA filtradas para un
// cliente (separado de clientSalesStats para poder reutilizarlo desde
// renderClientes con un índice precalculado — ver computeClientStatsIndexed
// — en vez de recorrer DB.sales entero una vez por cliente).
function computeClientStatsFromSales(matches){
  const visitas = matches.length;
  const total = matches.reduce((sum,s)=>sum+s.total,0);
  const ticketMedio = visitas ? total/visitas : 0;
  // Además del total histórico, dos ventanas más útiles para ver de un
  // vistazo si un cliente sigue activo AHORA: cuánto ha gastado en los
  // últimos 30 días y en lo que va de año natural.
  const todayD = new Date(todayStr());
  const cutoff30 = new Date(todayD.getTime() - 30*86400000);
  const matches30d = matches.filter(s => s.date && new Date(s.date) >= cutoff30);
  const total30d = matches30d.reduce((sum,s)=>sum+s.total,0);
  const visitas30d = matches30d.length;
  const currentYear = todayStr().slice(0,4);
  const matchesYear = matches.filter(s => (s.date||'').slice(0,4) === currentYear);
  const totalYear = matchesYear.reduce((sum,s)=>sum+s.total,0);
  const visitasYear = matchesYear.length;
  const dates = matches.map(s=>s.date).sort();
  const lastDate = dates.length ? dates[dates.length-1] : null;
  const firstDate = dates.length ? dates[0] : null;
  let recency = null;
  if(lastDate){
    recency = Math.floor((new Date(todayStr()) - new Date(lastDate)) / 86400000);
  }
  // Intervalo medio entre visitas, para poder distinguir a un cliente que
  // "siempre viene poco" (inactivo normal) de uno que venía a menudo y de
  // repente ha dejado de venir mucho más tiempo del que solía tardar (en riesgo).
  let avgIntervalDays = null;
  let spanDays = null;
  if(dates.length >= 3){
    spanDays = (new Date(lastDate) - new Date(firstDate)) / 86400000;
    avgIntervalDays = spanDays / (dates.length - 1);
  }
  const isNew = firstDate!=null && recency!=null ? (Math.floor((new Date(todayStr()) - new Date(firstDate))/86400000) <= 30) : false;
  /* "En riesgo" era `recency > avgIntervalDays * 2` a secas, y con un cliente
     habitual eso no significa nada: uno que viene casi a diario tiene un
     intervalo medio de 0,4 días, así que con UN día sin aparecer ya
     superaba el doble y salía marcado. En el negocio del dueño había gente
     con mil visitas y la última AYER etiquetada "en riesgo" (13/09).

     Dos condiciones más, y las dos son de sentido común:
     · hace falta histórico suficiente para saber su ritmo — con tres visitas
       de un mismo fin de semana no se sabe nada de nadie;
     · y tiene que haber pasado tiempo DE VERDAD. Avisar de que se pierde a
       alguien que vino la semana pasada no lleva a ninguna acción, y un
       aviso que no lleva a nada enseña a ignorar todos los demás. */
  const HISTORIAL_MINIMO_DIAS = 30;   // desde su primera visita
  const AUSENCIA_MINIMA_DIAS = 14;    // por debajo de esto, no es "en riesgo"
  const atRisk = avgIntervalDays != null && recency != null
    && spanDays >= HISTORIAL_MINIMO_DIAS
    && recency > Math.max(avgIntervalDays * 2, AUSENCIA_MINIMA_DIAS);
  return {visitas, visitas30d, visitasYear, ticketMedio, total, total30d, totalYear, lastDate, firstDate, recency, avgIntervalDays, spanDays, isNew, atRisk};
}
function clientSalesStats(c){
  return computeClientStatsFromSales(clientSales(c));
}
// Construye un índice de DB.sales agrupado por cliente en UNA sola pasada
// (clientId cuando lo hay, nombre normalizado como respaldo para ventas
// antiguas sin vincular) — evita que renderClientes() recorra TODO el
// historial de ventas una vez POR CADA cliente (con años de datos reales y
// cientos de clientes, esto pasa de tardar cerca de un segundo a ser
// instantáneo). Devuelve una función getStats(c) memoizada por cliente,
// para que tampoco se recalculen las estadísticas de un mismo cliente más
// de una vez si se usan en el filtro, la ordenación y la fila a la vez.
function computeClientStatsIndexed(){
  const byId = new Map();
  const byName = new Map();
  (DB.sales||[]).forEach(s => {
    if(s.clientId != null){
      if(!byId.has(s.clientId)) byId.set(s.clientId, []);
      byId.get(s.clientId).push(s);
    }else if(s.clienteNombre){
      const key = s.clienteNombre.trim().toLowerCase();
      if(!byName.has(key)) byName.set(key, []);
      byName.get(key).push(s);
    }
  });
  const statsCache = new Map();
  return function getStats(c){
    if(statsCache.has(c.id)) return statsCache.get(c.id);
    const matches = byId.get(c.id) || byName.get((c.name||'').trim().toLowerCase()) || [];
    const stats = computeClientStatsFromSales(matches);
    statsCache.set(c.id, stats);
    return stats;
  };
}

function showLoyaltyInfo(){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-info-circle"></i> ${t('title.loyaltyPoints')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px;line-height:1.6">
      ${t('msg.loyaltyPointsIntro')}
    </p>
    <p style="font-size:13.5px;line-height:1.6">
      <span class="badge badge-gray">0-6/10</span> ${t('msg.loyaltyTierLow')}<br>
      <span class="badge badge-amber">7-9/10</span> ${t('msg.loyaltyTierMid')}<br>
      <span class="badge badge-green">10/10</span> ${t('msg.loyaltyTierMax')}
    </p>
    <div class="owner-only" style="margin-top:14px">
      <h3 style="font-size:14px">${t('title.suggestedRewardsCatalog')}</h3>
      <p style="font-size:12px;color:var(--muted);margin-top:-4px">${t('msg.suggestedRewardsDesc')}</p>
      <div id="loyalty-rewards-list">${renderLoyaltyRewardsList()}</div>
      <div class="field-row" style="margin-top:8px">
        <input type="text" id="new-loyalty-reward" placeholder="${t('ph.rewardExample')}" style="flex:1">
        <button class="btn btn-sm" onclick="addLoyaltyReward()"><i class="ti ti-plus"></i> ${t('common.add')}</button>
      </div>
    </div>
  `);
}

// Los 5 premios de fidelización por defecto son texto sugerido por la app
// (no escrito por el negocio), así que se traduce su etiqueta mostrada igual
// que allergenLabel()/businessTypeLabel(). Cualquier premio personalizado
// que el negocio añada no está en el diccionario y se muestra tal cual.
function rewardLabel(name){
  const dict = t('loyaltyRewards.map');
  return (dict && dict[name]) || name;
}
function renderLoyaltyRewardsList(){
  const rewards = DB.loyaltyRewards||[];
  if(!rewards.length) return `<p style="font-size:12px;color:var(--muted)">${t('empty.noRewardsDefined')}</p>`;
  return rewards.map((r,i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${escapeHtml(rewardLabel(r))}</span>
      <button class="btn btn-sm btn-icon btn-danger" onclick="removeLoyaltyReward(${i})"><i class="ti ti-trash"></i></button>
    </div>
  `).join('');
}
function addLoyaltyReward(){
  const input = document.getElementById('new-loyalty-reward');
  const val = input.value.trim();
  if(!val) return;
  if(!Array.isArray(DB.loyaltyRewards)) DB.loyaltyRewards = [];
  DB.loyaltyRewards.push(val);
  saveDB();
  input.value = '';
  document.getElementById('loyalty-rewards-list').innerHTML = renderLoyaltyRewardsList();
}
async function removeLoyaltyReward(i){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  DB.loyaltyRewards.splice(i,1);
  saveDB();
  document.getElementById('loyalty-rewards-list').innerHTML = renderLoyaltyRewardsList();
}

// --- Vale regalo ---------------------------------------------------------
// Código corto y legible (para poder escribirlo a mano en un vale físico o
// leerlo por teléfono), no un id numérico interno.
function giftVoucherCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I, para no confundir al leerlo
  let code = '';
  for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return 'VR-' + code;
}

// Vale regalo imprimible: pensado para entregarse en mano o enviarse en PDF,
// así que cuida el diseño (tipografía, marco, color de marca) en vez de ser
// un simple volcado de datos como el resto de informes de la app.
function printGiftVoucher(id){
  const v = (DB.giftVouchers||[]).find(x=>x.id===id);
  if(!v) return;
  const win = window.open('', '_blank', 'width=760,height=560');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  const bizName = (DB.business && DB.business.name) || 'GastroGoan';
  const accent = ggAcentoSobreOscuro((DB.business && DB.business.brandColor) || '#4A5D4E');
  const logo = DB.business && DB.business.logo;
  const mainLabel = v.tipo === 'experiencia' ? escapeHtml(v.descripcion) : fmtMoney(v.importe);
  const dateStr = new Date(v.createdAt || Date.now()).toLocaleDateString(localeActual(), {day:'numeric', month:'long', year:'numeric'});
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('title.giftVouchers')} — ${escapeHtml(v.code)}</title>
    <style>
      ${ggFuentesImpresionCss()}
      *{box-sizing:border-box}
      body{margin:0;padding:30px;background:#F1EFE9;font-family:'Schibsted Grotesk',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .voucher{
        position:relative;width:760px;max-width:100%;display:grid;grid-template-columns:1fr 208px;
        background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.16);
      }
      .v-main{
        background:#1C1A17;color:#F1EFE9;padding:40px 44px;position:relative;
      }
      .v-main::after{
        content:'';position:absolute;inset:0;pointer-events:none;
        background:linear-gradient(135deg, rgba(255,255,255,.05), transparent 55%);
      }
      .v-brand{display:flex;align-items:center;gap:12px;margin-bottom:34px}
      .v-logo{max-height:38px;max-width:150px}
      .v-biz{font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:${accent};font-weight:600}
      .v-kicker{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a89f92;font-weight:600;margin-bottom:16px}
      .v-main-amount{font-family:'IBM Plex Mono',ui-monospace,monospace;letter-spacing:-.03em;font-size:56px;font-weight:600;color:${accent};line-height:1}
      .v-main-exp{font-family:'Schibsted Grotesk',Arial,sans-serif;font-weight:600;letter-spacing:-.01em;font-size:25px;color:#f4efe7;line-height:1.35;max-width:420px}
      .v-for{font-size:13.5px;color:#a89f92;margin-top:20px;letter-spacing:.2px}
      .v-for strong{color:#fff;font-weight:600}
      .v-stub{
        background:#FAF8F4;padding:32px 22px;display:flex;flex-direction:column;align-items:center;justify-content:center;
        text-align:center;position:relative;border-left:2px dashed #d8d2c6;gap:22px;
      }
      .v-stub::before, .v-stub::after{
        content:'';position:absolute;left:-11px;width:22px;height:22px;border-radius:50%;background:#F1EFE9;
      }
      .v-stub::before{top:-11px}
      .v-stub::after{bottom:-11px}
      .v-stub-label{font-size:9.5px;letter-spacing:1.8px;text-transform:uppercase;color:#a89f92;font-weight:600;margin-bottom:6px}
      .v-code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:18px;font-weight:700;letter-spacing:1.5px;color:#181512;word-break:break-all}
      .v-barcode{display:flex;gap:2px;height:34px;align-items:flex-end;justify-content:center}
      .v-barcode i{display:block;width:2px;background:#181512}
      .v-date{font-size:11px;color:#8f8779;line-height:1.5}
      .v-note{font-size:9.5px;color:#a89f92;font-style:italic;max-width:150px;line-height:1.4}
      /* Papel: apaisado, el vale a todo lo ancho de la hoja y centrado (antes salía pequeño en una esquina de una hoja vertical). */
      @media print{
        html,body{height:100%}
        body{background:#fff;padding:0;min-height:100vh;display:flex;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .voucher{box-shadow:none;border:0;transform:scale(1.28);transform-origin:center center}
        @page{size:A4 landscape;margin:8mm}
      }
    </style>
    </head><body>
      <div class="voucher">
        <div class="v-main">
          <div class="v-brand">
            ${logo ? `<img class="v-logo" src="${logo}">` : `<div class="v-biz">${escapeHtml(bizName)}</div>`}
          </div>
          <div class="v-kicker">${t('title.giftVouchers')}</div>
          ${v.tipo === 'experiencia'
            ? `<div class="v-main-exp">&ldquo;${mainLabel}&rdquo;</div>`
            : `<div class="v-main-amount">${mainLabel}</div>`}
          ${v.clienteNombre ? `<div class="v-for">${t('label.voucherFor')} <strong>${escapeHtml(v.clienteNombre)}</strong></div>` : ''}
        </div>
        <div class="v-stub">
          <div>
            <div class="v-stub-label">${t('label.voucherCode')}</div>
            <div class="v-code">${escapeHtml(v.code)}</div>
          </div>
          <div class="v-barcode">${Array.from({length:26}).map((_,i)=>`<i style="height:${14+((i*37)%20)}px"></i>`).join('')}</div>
          <div class="v-date">${t('label.voucherIssuedOn')}<br>${escapeHtml(dateStr)}${v.venceEn ? '<br><strong>' + escapeHtml(gl({es:'Válido hasta', ca:'Vàlid fins', en:'Valid until'})) + ' ' + escapeHtml(new Date(v.venceEn + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'long', year:'numeric'})) + '</strong>' : ''}</div>
          <div class="v-note">${t('msg.voucherPrintNote')}</div>
        </div>
      </div>
    </body></html>`);
  win.document.close();
  ggEsperarYImprimir(win);
}

// Fusionar dos fichas de cliente duplicadas: saveClient() ya avisa si el
// teléfono/email coincide con otro cliente, pero deja seguir y crea una
// ficha nueva de todas formas — sin esto no había ninguna forma de arreglar
// después esos duplicados, cada uno se quedaba con sus puntos/historial por
// separado para siempre.
function openMergeClientModal(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const others = DB.clients.filter(x=>x.id!==id);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-git-merge"></i> ${t('btn.mergeClient')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('merge.desc').replace('${name}', escapeHtml(c.name))}</p>
    <div class="field" style="position:relative">
      <label>${t('merge.pickDuplicate')}</label>
      <input type="text" id="merge-client-search" placeholder="${t('ph.clientName')}" autocomplete="off" oninput="runTypeahead('merge-client-search')" onfocus="runTypeahead('merge-client-search')" onblur="setTimeout(()=>hideTypeahead('merge-client-search'),150)">
      <div id="merge-client-search-results" class="typeahead-results" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openClientModal(${id})">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmMergeClient(${id})"><i class="ti ti-git-merge"></i> ${t('btn.mergeClient')}</button>
    </div>
  `);
  attachTypeahead('merge-client-search', 'merge-client-search-results',
    q => others.filter(o => o.name.toLowerCase().includes(q)),
    o => escapeHtml(o.name),
    o => { document.getElementById('merge-client-search').value = o.name; });
}
async function confirmMergeClient(targetId){
  const target = DB.clients.find(x=>x.id===targetId);
  const typed = (document.getElementById('merge-client-search').value||'').trim().toLowerCase();
  const source = DB.clients.find(x=>x.id!==targetId && x.name.trim().toLowerCase()===typed);
  if(!target || !source){ showToast(t('merge.notFound')); return; }
  if(!(await confirmModal(t('merge.confirm').replace('${source}', source.name).replace('${target}', target.name)))) return;
  mergeClients(source.id, target.id);
  closeModal();
  showToast(t('merge.ok').replace('${target}', target.name));
  renderClientes();
}
function mergeClients(sourceId, targetId){
  const source = DB.clients.find(x=>x.id===sourceId);
  const target = DB.clients.find(x=>x.id===targetId);
  if(!source || !target) return;
  // Puntos: se suman y se limitan igual que registerClientVisit (0-10) —
  // si la suma ya daba para premio, el propietario lo verá y podrá canjearlo
  // desde la ficha fusionada con normalidad.
  target.points = Math.min(10, (target.points||0) + (source.points||0));
  target.rewardsHistory = [...(target.rewardsHistory||[]), ...(source.rewardsHistory||[])]
    .sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  // No se pisa ningún dato del destino: solo se rellena lo que le faltara,
  // para no perder por accidente una alergia o nota ya anotada en el que se
  // conserva.
  if(!target.allergies && source.allergies) target.allergies = source.allergies;
  if(!target.email && source.email) target.email = source.email;
  if(!target.cp && source.cp) target.cp = source.cp;
  if(!target.cumpleanos && source.cumpleanos) target.cumpleanos = source.cumpleanos;
  if(source.notes){
    target.notes = target.notes ? `${target.notes}\n${source.notes}` : source.notes;
  }
  (DB.sales||[]).forEach(s => { if(s.clientId===sourceId) s.clientId = targetId; });
  (DB.reservations||[]).forEach(r => { if(r.clientId===sourceId) r.clientId = targetId; });
  (DB.tpvOrders||[]).forEach(o => { if(o.clientId===sourceId) o.clientId = targetId; });
  (DB.giftVouchers||[]).forEach(v => { if(v.clienteId===sourceId){ v.clienteId = targetId; if(!v.paraNombre || v.paraNombre === source.name) v.paraNombre = target.name; v.clienteNombre = v.paraNombre; } });
  DB.clients = DB.clients.filter(x=>x.id!==sourceId);
  moveToTrash('client', source);
  logAudit('merge', t('audit.mergedClients').replace('${source}', source.name).replace('${target}', target.name), 'critical');
  saveDB();
}

async function saveClient(id){
  const name = document.getElementById('client-name').value.trim().replace(/\s+/g, ' ');
  if(!name){ showToast(t('msg.nameRequired')); return; }
  // Nombre y apellidos: exige al menos dos palabras, para no acabar con
  // fichas de un solo nombre de pila que luego son imposibles de distinguir
  // entre sí (p.ej. varios clientes llamados "Juan").
  if(!name.includes(' ')){ showToast(t('msg.fullNameRequired')); return; }
  const phone = document.getElementById('client-phone').value.trim();
  const email = document.getElementById('client-email').value.trim();
  if(!phone){ showToast(t('msg.phoneRequired')); return; }
  // Aviso (no bloqueante) de un teléfono/email con pinta de mal escrito —
  // antes no se comprobaba nada aquí, y el error solo se descubría mucho
  // más tarde y lejos de esta ficha, al fallar en silencio el envío de un
  // WhatsApp o email (recordatorio de reserva, premio de fidelidad...).
  if(phone && phone.replace(/[^\d]/g,'').length < 9 && !(await confirmModal(t('msg.confirmOddPhone')))) return;
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !(await confirmModal(t('msg.confirmOddEmail')))) return;
  const cp = document.getElementById('client-cp').value.trim();
  const cumpleanos = document.getElementById('client-cumpleanos').value;
  const ultimoContacto = document.getElementById('client-ultimo-contacto').value;
  const allergies = document.getElementById('client-allergies').value.trim();
  const notes = document.getElementById('client-notes').value.trim();
  const marketingConsent = document.getElementById('client-marketing-consent').checked;

  // Un mismo nombre no puede repetirse: bloquea el guardado sin más, en vez
  // de solo avisar — así no hay que confiar en que quien lo está creando se
  // dé cuenta y decida bien.
  const dupeName = DB.clients.find(x => x.id !== id && x.name.trim().toLowerCase() === name.toLowerCase());
  if(dupeName){ showToast(t('msg.duplicateClientNameBlocked').replace('${name}', dupeName.name)); return; }
  // Teléfono/email repetido sí se deja avisar y continuar: puede ser un
  // familiar en la misma casa, o dos negocios que comparten un teléfono fijo.
  const dupeContact = DB.clients.find(x =>
    x.id !== id && (
      (phone && x.phone && x.phone.replace(/\D/g,'') === phone.replace(/\D/g,'')) ||
      (email && x.email && x.email.trim().toLowerCase() === email.trim().toLowerCase())
    )
  );
  if(dupeContact && !(await confirmModal(t('msg.confirmDuplicateClient').replace('${name}', dupeContact.name)))) return;

  if(id){
    const client = DB.clients.find(x=>x.id===id);
    if(!client) return;
    Object.assign(client, {name, phone, email, cp, cumpleanos, ultimoContacto, allergies, notes, marketingConsent});
  }else{
    DB.clients.push({id: genId(), name, phone, email, cp, cumpleanos, ultimoContacto, points:0, allergies, notes, marketingConsent});
  }
  saveDB();
  closeModal();
  renderClientes();
  showToast(t('msg.clientSaved'));
}


// Suma un punto de fidelidad a un cliente (p.ej. al confirmar su llegada desde una reserva,
// para que el contador se rellene solo sin tener que hacerlo a mano en Clientes).
function registerClientVisit(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  c.points = Math.min((c.points||0) + 1, 10);
  c.ultimoContacto = todayStr();
  saveDB();
  if(c.points >= 10) showToast(t('msg.loyaltyPrize').replace('${name}', c.name));
  else showToast(t('msg.loyaltyPoint').replace('${name}', c.name));
}

function clientFavoriteItem(c){
  const matches = clientSales(c);
  const counts = {};
  matches.forEach(s => (s.items||[]).forEach(it => { counts[it.name] = (counts[it.name]||0) + (it.qty||1); }));
  let best = null, bestQty = 0;
  Object.entries(counts).forEach(([name,qty]) => { if(qty > bestQty){ best = name; bestQty = qty; } });
  return best;
}

function openRewardModal(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const fav = clientFavoriteItem(c);
  const suggestion = fav ? `${fav} gratis` : null;
  const catalog = (DB.loyaltyRewards||[]).filter(r => r !== suggestion);
  const options = [...(suggestion?[suggestion]:[]), ...catalog];

  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-gift"></i> ${t('reward.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px;line-height:1.6">${t('reward.reached10pts').replace('${name}', `<strong>${escapeHtml(c.name)}</strong>`)}</p>
    ${suggestion ? `
    <div style="background:var(--cream,#F5F0E3);border-left:3px solid var(--ink);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;line-height:1.5">
      <i class="ti ti-sparkles"></i> ${t('reward.suggestion').replace('${fav}', `<strong>${escapeHtml(fav)}</strong>`).replace('${suggestion}', `<strong>"${escapeHtml(suggestion)}"</strong>`)}
    </div>` : ''}
    <div class="field">
      <label>${t('reward.rewardToGive')}</label>
      <select id="reward-select" onchange="document.getElementById('reward-custom-wrap').style.display = this.value==='__custom__' ? '' : 'none'">
        ${options.map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(rewardLabel(o))}</option>`).join('')}
        <option value="__custom__">${t('reward.otherWrite')}</option>
      </select>
    </div>
    <div class="field" id="reward-custom-wrap" style="display:none">
      <label>${t('reward.customReward')}</label>
      <input type="text" id="reward-custom" placeholder="${t('reward.customRewardPh')}">
    </div>
    <p style="font-size:12px;color:var(--muted)">${t('reward.resetNote').replace('${name}', escapeHtml(c.name))}</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmClientReward(${id})"><i class="ti ti-gift"></i> ${t('reward.giveAndReset')}</button>
    </div>
  `);
}

function confirmClientReward(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const sel = document.getElementById('reward-select').value;
  const reward = sel === '__custom__' ? document.getElementById('reward-custom').value.trim() : sel;
  if(!reward){ showToast(t('msg.indicateReward')); return; }
  c.points = 0;
  if(!Array.isArray(c.rewardsHistory)) c.rewardsHistory = [];
  c.rewardsHistory.push({fecha: todayStr(), premio: reward});
  saveDB();
  renderClientes();
  showToast(t('msg.rewardDelivered').replace('${reward}', reward));
  openRewardNotifyModal(id, reward);
}

// Texto preconfigurado para avisar al cliente de su premio de fidelidad.
function rewardMessageText(c, reward){
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  return t('msg.rewardMessage').replace('${name}', c.name).replace('${biz}', bizName).replace('${reward}', reward);
}

// Tras dar un premio, ofrece avisar al cliente por WhatsApp/SMS o email con el texto ya preparado.
function openRewardNotifyModal(id, reward){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const msg = rewardMessageText(c, reward);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-bell"></i> ${t('reward.notifyTitle').replace('${name}', escapeHtml(c.name))}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px;line-height:1.6">${t('reward.notifyDesc').replace('${name}', escapeHtml(c.name))}</p>
    <div class="field">
      <textarea id="reward-notify-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div class="promo-share-actions" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-fino is-on" style="flex:1" onclick="sendRewardWhatsapp(${id})" ${!c.phone?`disabled title="${t('msg.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendRewardEmail(${id})" ${!c.email?`disabled title="${t('msg.noEmail')}"`:''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.notNow')}</button>
    </div>
  `);
}

function sendRewardWhatsapp(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.phone){ showToast(t('msg.noPhone')); return; }
  const tel = whatsappDeTelefono(c.phone);
  if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil.', ca:'Aquest telèfon no sembla un mòbil.', en:'This number does not look like a mobile.'})); return; }
  const txt = encodeURIComponent(document.getElementById('reward-notify-text').value);
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
}

function sendRewardEmail(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.email){ showToast(t('msg.noEmail')); return; }
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  const subject = encodeURIComponent(t('msg.rewardSubject').replace('${name}', bizName));
  const body = encodeURIComponent(document.getElementById('reward-notify-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(c.email)+'?subject='+subject+'&body='+body;
}

// Borrar un cliente exige el PIN del negocio (no un simple "¿seguro?", como
// el resto de acciones sensibles de la app). Las reservas y ventas que lo
// referenciaban no se borran: solo se desvinculan (quedan como estaban,
// sin cliente asociado), para no perder ese historial.
function deleteClient(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  requestBusinessPinAction(t('title.deleteClient'), t('msg.confirmDeleteClient'), () => {
    // Se guarda aparte qué reservas/ventas quedan desvinculadas, para poder
    // re-vincularlas si el cliente se restaura desde Papelera dentro de los
    // 30 días — antes restaurar el cliente lo devolvía con el mismo id pero
    // su historial de ventas/reservas se quedaba huérfano para siempre
    // (clientId ya puesto a null), como si el "deshacer" no hubiera servido
    // para nada de cara al histórico.
    const linkedReservationIds = DB.reservations.filter(r => r.clientId===id).map(r => r.id);
    const linkedSaleIds = DB.sales.filter(s => s.clientId===id).map(s => s.id);
    moveToTrash('client', {...c, _unlinkedReservationIds: linkedReservationIds, _unlinkedSaleIds: linkedSaleIds});
    logAudit('delete', t('audit.deletedClient').replace('${name}', c.name), 'critical');
    DB.clients = DB.clients.filter(x=>x.id!==id);
    DB.reservations.forEach(r => { if(r.clientId===id) r.clientId = null; });
    DB.sales.forEach(s => { if(s.clientId===id) s.clientId = null; });
    saveDB();
    renderClientes();
    showToast(t('msg.clientDeleted'));
  });
}

// Derecho al olvido (RGPD): a diferencia de un borrado normal (que pasa
// por la papelera y se conserva 30 días, precisamente para poder
// recuperarlo), esto borra los datos personales de verdad y al instante,
// sin dejar rastro recuperable — es lo que corresponde cuando un cliente
// pide expresamente que se eliminen sus datos. Se conserva solo un
// registro anónimo de que existió (para no romper el histórico de
// ventas/reservas ya hechas), sin ningún dato identificativo.
function eraseClientDataRGPD(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  requestBusinessPinAction(t('title.eraseClientRGPD'), t('msg.confirmEraseClientRGPD').replace('${name}', c.name), () => {
    logAudit('rgpd_erase', t('audit.erasedClientRGPD').replace('${name}', c.name), 'critical');
    c.name = t('label.erasedClientName');
    c.phone = ''; c.email = ''; c.allergies = ''; c.notes = ''; c.cp = ''; c.cumpleanos = '';
    c.marketingConsent = false;
    c.erasedAt = new Date().toISOString();
    (DB.giftVouchers||[]).forEach(v => { if(v.clienteId===id){ v.paraNombre = ''; v.clienteNombre = ''; } });
    saveDB();
    closeModal();
    renderClientes();
    showToast(t('msg.clientErasedOk'));
  });
}

/* ============================================================
   RESERVAS — Reservas vinculadas a mesas del TPV
   ============================================================ */
let reservasTab = 'dia';
let reservasDate = todayStr();
let reservasWeekOffset = 0;
// Qué reservas del día están desplegadas (mostrando mesa/notas/acciones).
// Colapsadas por defecto: con muchas reservas en un mismo día, verlas todas
// desplegadas a la vez obligaba a un scroll larguísimo para encontrar una.
let reservaExpandedIds = new Set();
// "Ha llegado" es un dato aparte de `status` (la reserva sigue
// 'confirmada' tras marcar la llegada, ver toggleReservaLlegada) — antes
// no se distinguía aquí, así que una reserva ya llegada seguía mostrando
// el mismo badge verde de "Confirmada" que una que aún no se ha
// presentado, sin ninguna forma de diferenciarlas de un vistazo.
function reservationStatusBadge(status, llegada){
  if(status==='completada' && llegada) return `<span class="badge badge-blue"><i class="ti ti-door-enter"></i> ${t('status.arrived')}</span>`;
  return status==='pendiente' ? `<span class="badge badge-amber"><i class="ti ti-bell-ringing"></i> ${t('status.pending')}</span>`
    : status==='confirmada' ? `<span class="badge badge-green">${t('status.confirmed')}</span>`
    : status==='lista_espera' ? `<span class="badge badge-amber"><i class="ti ti-clock-hour-4"></i> ${t('status.waitlisted')}</span>`
    : status==='cancelada' ? `<span class="badge badge-red">${t('status.cancelled')}</span>`
    : status==='no_show' ? `<span class="badge badge-red"><i class="ti ti-user-x"></i> ${t('status.noShow')}</span>`
    : `<span class="badge badge-blue">${t('status.completed')}</span>`;
}

// Busca un cliente ya dado de alta por teléfono (comparando solo dígitos),
// para vincular reservas online que no traen clientId. Un único punto para
// esta normalización: si algún día cambia (p.ej. prefijos internacionales),
// se corrige aquí una vez en vez de en cada sitio que la repetía por su cuenta.
function findClientByPhone(phone){
  if(!phone) return null;
  const digits = phone.replace(/\D/g,'');
  if(!digits) return null;
  return DB.clients.find(c => c.phone && c.phone.replace(/\D/g,'') === digits) || null;
}

// Marca una reserva confirmada como "no presentado" (el cliente no vino) y
// suma un aviso al historial del cliente, para detectar quién falla a menudo.
async function markReservationNoShow(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  if(!(await confirmModal(t('msg.confirmNoShow')))) return;
  r.status = 'no_show';
  let cid = r.clientId;
  if(!cid && r.clientPhone){
    const match = findClientByPhone(r.clientPhone);
    if(match) cid = match.id;
  }
  if(cid){
    const c = DB.clients.find(x=>x.id===cid);
    if(c) c.noShows = (c.noShows||0) + 1;
    // Se guarda a qué cliente se le sumó el aviso, para poder revertirlo
    // exactamente a ese si se deshace — antes un clic accidental en "Marcar
    // no presentado" dejaba el aviso para siempre, sin ninguna forma de
    // corregirlo desde la UI.
    r._noShowClientId = cid;
  }
  saveDB();
  renderReservas();
  showToast(t('msg.markedNoShow'));
}
function undoReservationNoShow(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r || r.status !== 'no_show') return;
  r.status = 'confirmada';
  if(r._noShowClientId){
    const c = DB.clients.find(x=>x.id===r._noShowClientId);
    if(c) c.noShows = Math.max(0, (c.noShows||0) - 1);
    delete r._noShowClientId;
  }
  saveDB();
  renderReservas();
  showToast(t('msg.noShowUndone'));
}

// Rechazar una reserva PENDIENTE que llegó desde la web pública exige el PIN
// del negocio, igual que rechazar un pedido online en el TPV (rejectOnlineOrder):
// es una acción sensible de cara al cliente, no un simple cambio de estado
// interno como sí lo es la gestión normal de reservas ya creadas por el personal.
// Marca el depósito de una reserva como recibido (no hay pasarela de pago
// automática para reservas — el negocio lo confirma a mano tras verlo en su
// cuenta/Bizum, siguiendo las instrucciones que él mismo definió).
function confirmReservationDeposit(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  r.depositConfirmed = true;
  r.depositConfirmedAt = new Date().toISOString();
  // ⚠️ Esta es la confirmación A MANO (alguien marca la señal como recibida).
  // La automática, cuando llega el pago, es otra y tiene su propio texto: las
  // dos compartían clave y la segunda pisaba a la primera, así que el
  // registro decía "confirmada automáticamente" incluso cuando la había
  // confirmado una persona. En un registro de auditoría eso es atribuir mal
  // una acción.
  logAudit('deposit_confirmed', t('audit.depositConfirmedByStaff').replace('${name}', r.clientName||'—'));
  saveDB();
  renderReservasPendingOnline();
  renderReservas();
  showToast(t('deposit.confirmedOk'));
}

function rejectOnlineReservation(id){
  if(!puedeCancelar()) return;
  requestBusinessPinAction(t('title.rejectReservation'), t('msg.confirmRejectReservation'), () => {
    setReservationStatus(id, 'cancelada');
  });
}

// Cancelar una reserva YA confirmada (a diferencia de borrarla): deja el
// registro con estado 'cancelada' en vez de eliminarlo, para que quede
// rastro de que existió y se canceló (auditoría, y para que el hueco de la
// mesa/turno se libere correctamente en las comprobaciones de disponibilidad
// que sí distinguen 'cancelada' de "nunca existió"). Borrar sigue existiendo
// para corregir un duplicado o un error real al crearla.
async function cancelReservation(id){
  if(!puedeCancelar()) return;
  const r0 = DB.reservations.find(x=>x.id===id);
  if(!r0 || r0.status === 'completada') return;
  if(!(await confirmModal(t('msg.confirmCancelReservation')))) return;
  setReservationStatus(id, 'cancelada');
  openReservationNotifyChangeModal(id, 'cancelada');
}

async function setReservationStatus(id, status){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  // Defensa en profundidad: una reserva ya completada (el cliente llegó y
  // se sentó) no debe poder degradarse a cancelada/pendiente por ningún
  // camino, aunque la UI ya no ofrezca el botón para intentarlo.
  if(r.status === 'completada' && status !== 'completada') return;

  // Cancelar una reserva que ya tenía la señal cobrada online no avisaba de
  // nada: el dinero seguía contándose como venta del mes (ventasDepositosForMonth)
  // y no quedaba ningún rastro de que hubiera que devolvérselo al cliente.
  // Se marca aquí, no se intenta devolver solo (eso requeriría acceso a la
  // pasarela de pago) — solo asegura que quede constancia clara.
  if(status === 'cancelada' && r.depositConfirmed && !r.depositNeedsRefund){
    r.depositNeedsRefund = true;
    logAudit('edit', t('audit.reservationDepositNeedsRefund').replace('${name}', r.clientName||'?').replace('${amount}', fmtMoney(r.depositPagoImporte||0)), 'critical');
    showToast(t('msg.reservationDepositNeedsRefund').replace('${amount}', fmtMoney(r.depositPagoImporte||0)));
  }

  if(status === 'confirmada'){
    // Las reservas que llegan de la web pública nunca traen mesa asignada
    // (el cliente no elige mesa, solo el negocio) — asignar mesa es
    // obligatorio para CUALQUIER reserva, así que aquí también hace falta
    // antes de poder confirmarla, no solo al crearla o editarla a mano.
    if(!r.tableId && DB.tables.length){
      showToast(t('msg.assignTableBeforeConfirm'));
      openReservationModal(id);
      return;
    }
    const turnoIdx = getTurnoIndexForTime(r.date, r.time);
    const aforo = parseInt(DB.business.aforo) || 0;
    if(turnoIdx !== null && aforo){
      const yaReservado = getReservedPeopleForTurno(r.date, turnoIdx, id);
      const turnos = getTurnosForDate(r.date);
      const turno = turnos[turnoIdx];
      if(yaReservado + r.people > aforo){
        const ok = (await confirmModal(t('msg.confirmOverbookedShift').replace('${range}', `${turno.abre}-${turno.cierra}`).replace('${already}', yaReservado).replace('${wouldBe}', yaReservado + r.people).replace('${cap}', aforo)));
        if(!ok) return;
      }
    }
  }

  // Ojo: la visita/punto de fidelidad NO se suma aquí. Confirmar una reserva
  // no es lo mismo que la visita real — eso ya lo registra registerClientVisit()
  // cuando se cobra la venta (tpv.js). Sumarlo también al confirmar duplicaba
  // el punto por una sola visita, y dejaba un punto "fantasma" si el cliente
  // acababa siendo un no-show.
  r.status = status;
  saveDB();
  if(r.publicToken && typeof syncReservationStatusForPublic === 'function') syncReservationStatusForPublic(r);
  renderReservas();
  showToast(status==='confirmada' ? t('msg.reservationConfirmed') : status==='cancelada' ? t('msg.reservationCancelled') : t('msg.reservationRejected'));
}

function goToReservasDia(date){
  reservasDate = date;
  reservasTab = 'dia';
  renderReservas();
}

// Cuántos minutos antes del cierre se admite la ÚLTIMA reserva (8/11): lo decide cada negocio en Mi Negocio (30 por defecto; 0 = hasta la hora
// exacta de cierre). La web pública lee el mismo valor (está en CAMPOS_PUBLICOS_DEL_NEGOCIO).
function reservaMargenCierreMin(){
  const v = (DB.business || {}).reservaMargenCierreMin;
  if(v === '' || v == null) return 30;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? 30 : n;
}
// Franjas horarias de 15 min (cuartos de hora) en las que se puede reservar ese día, según el horario de apertura del negocio. La última
// reserva posible es `reservaMargenCierreMin()` minutos antes del cierre. Devuelve null si no hay horario configurado (sin restricción).
function getReservationTimeSlots(dateStr){
  const turnos = getTurnosForDate(dateStr);
  if(turnos === null) return null;
  const slots = [];
  turnos.forEach(t => {
    const [ah,am] = t.abre.split(':').map(Number);
    const [ch,cm] = t.cierra.split(':').map(Number);
    let cur = ah*60+am;
    const last = ch*60+cm - reservaMargenCierreMin();
    while(cur <= last){
      slots.push(String(Math.floor(cur/60)).padStart(2,'0')+':'+String(cur%60).padStart(2,'0'));
      cur += 15;
    }
  });
  return slots;
}

// Mesas disponibles para una fecha/hora: excluye las que ya tienen otra
// reserva (no cancelada) a esa misma hora.
// Minutos desde medianoche de una hora "HH:MM" (null si no es válida).
function reservaTimeToMinutes(t){
  if(!t || !t.includes(':')) return null;
  const [h,m] = t.split(':').map(Number);
  if(isNaN(h) || isNaN(m)) return null;
  return h*60 + m;
}

// Ventana mínima entre dos reservas de la misma mesa — cuánto tiempo ocupa
// una reserva la mesa antes de poder volver a reservarse. 90 minutos de
// base, configurable en Mi Negocio (mn-reserva-duracion) porque cada
// negocio rota sus mesas a un ritmo distinto. Fijo (sin excepciones por
// tamaño del grupo) — a petición del usuario, mismo margen entre mesa y
// mesa siempre. Se usa tanto aquí (reservas hechas por el personal) como
// en la web pública (reservagastrogoan.html, que tiene su propia copia de
// este mismo valor vía DB.business.reservaDuracionMin, ya que es un
// archivo aparte sin acceso a este código).
const RESERVA_VENTANA_MIN = 90;
function reservaVentanaMin(){
  return parseInt((DB.business||{}).reservaDuracionMin) || RESERVA_VENTANA_MIN;
}

// La reserva confirmada de hoy más próxima para una mesa concreta, si hay
// alguna dentro del mismo margen que separa una reserva de otra (o ya
// debería haber llegado hace poco). Así una mesa que se ve "libre" en
// el TPV puede avisar de que en realidad está a punto de ocuparse, en vez
// de que un camarero siente ahí a alguien que no tiene reserva justo antes
// de que llegue quien sí la tiene — mismo margen en los dos sitios.
function getUpcomingReservationForTable(tableId){
  if(!tableId) return null;
  const today = todayStr();
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  let soonest = null, soonestMin = null;
  DB.reservations.forEach(r => {
    if(r.tableId !== tableId || r.date !== today || r.status !== 'confirmada' || r.llegada) return;
    const mins = reservaTimeToMinutes(r.time);
    if(mins == null) return;
    const until = mins - nowMin;
    if(until < -15 || until > reservaVentanaMin()) return;
    if(soonestMin === null || mins < soonestMin){ soonest = r; soonestMin = mins; }
  });
  return soonest;
}

function getAvailableTablesForReservation(dateStr, time, excludeId, people){
  const reqMin = reservaTimeToMinutes(time);
  const occupied = new Set(
    DB.reservations
      .filter(r => {
        // 'lista_espera' no cuenta para el aforo hasta que se confirme de
        // verdad (ver getReservedPeopleForTurno) — tampoco debe bloquear la
        // mesa aquí, por la misma razón: si no, el personal no puede
        // ofrecer esa mesa a otra reserva mientras la web pública SÍ la
        // sigue ofreciendo (getMesasOcupadasForSync tampoco la cuenta como
        // ocupada), abriendo la puerta a que dos reservas reales choquen en
        // la misma mesa si la de lista de espera acaba confirmándose.
        if(r.date !== dateStr || r.id === excludeId || r.status === 'cancelada' || r.status === 'no_show' || r.status === 'lista_espera') return false;
        const rMin = reservaTimeToMinutes(r.time);
        // Si no podemos comparar horas, caemos al criterio antiguo (hora exacta).
        if(reqMin == null || rMin == null) return r.time === time;
        const ventana = reservaVentanaMin();
        return Math.abs(rMin - reqMin) < ventana;
      })
      .map(r => r.tableId)
      .filter(Boolean)
  );
  // Si la reserva es para hoy y a una hora cercana a la actual, también se
  // excluyen las mesas ocupadas ahora mismo por una comanda de TPV abierta
  // (walk-in sentado), para no ofrecer como "disponible" una mesa que en
  // realidad está ocupada en este momento.
  if(dateStr === todayStr()){
    const nowMin = (() => { const d = new Date(); return d.getHours()*60 + d.getMinutes(); })();
    const ventanaAhora = reservaVentanaMin();
    if(reqMin == null || Math.abs(reqMin - nowMin) < ventanaAhora){
      DB.tables.forEach(tb => {
        if(getOpenOrderForTable(tb.id)) occupied.add(tb.id);
      });
    }
  }
  return DB.tables.filter(t => !occupied.has(t.id));
}

function reservationTimeFieldHtml(r){
  const slots = getReservationTimeSlots(r.date);
  if(slots === null){
    return `<input type="time" id="reservation-time" value="${escapeHtml(r.time)}" onchange="updateReservationTableOptions()">`;
  }
  const options = [...slots];
  // Solo se conserva una hora fuera de los turnos configurados al EDITAR una
  // reserva que ya la tenía puesta (r.id) — si no, un día realmente cerrado
  // (o sin horario configurado todavía en ese día) mostraría igualmente un
  // desplegable con la hora por defecto (20:00) como si fuera válida.
  if(r.id && r.time && !options.includes(r.time)) options.push(r.time);
  options.sort();
  if(!options.length) return `<select id="reservation-time" disabled><option>${t('label.closedThisDay')}</option></select>`;
  // Pista visual (no bloqueante) de ocupación del turno junto a cada hora, para
  // que el personal vea de un vistazo si esa franja está cerca de completarse
  // antes de elegirla; sigue pudiendo seleccionar cualquier hora igualmente.
  const aforoInfo = getAforoInfoForDate(r.date);
  return `
    <select id="reservation-time" onchange="updateReservationTableOptions()">
      ${options.map(slot => {
        const turnoIdx = getTurnoIndexForTime(r.date, slot);
        const turno = aforoInfo && turnoIdx !== null ? aforoInfo[turnoIdx] : null;
        const hint = turno && turno.aforo ? ` (${turno.reservados}/${turno.aforo} ${t('label.full')})` : '';
        return `<option value="${slot}" ${r.time===slot?'selected':''}>${slot}${hint}</option>`;
      }).join('')}
    </select>
  `;
}

function reservationTableFieldHtml(r){
  const date = r.date, time = r.time;
  const available = getAvailableTablesForReservation(date, time, r.id, r.people);
  const options = [...available];
  if(r.tableId && !available.some(t=>t.id===r.tableId)){
    const current = DB.tables.find(t=>t.id===r.tableId);
    if(current) options.unshift(current);
  }
  // Si la mesa tiene un nº de plazas configurado y no llegan para el grupo,
  // se avisa en la propia opción (no bloquea, por si se quieren juntar mesas).
  const tableLabel = tb => {
    if(!tb.plazas) return tb.name;
    const short = tb.plazas < (r.people||1) ? ` ⚠ ${tb.plazas}p` : ` (${tb.plazas}p)`;
    return tb.name + short;
  };
  // Ya no se puede dejar "sin asignar" (asignar mesa es obligatorio) — si el
  // negocio no tiene ninguna mesa dada de alta todavía, no tiene sentido
  // exigirlo, así que se deja el placeholder solo en ese caso.
  return `
    <select id="reservation-table">
      ${DB.tables.length ? `<option value="">${t('label.chooseTableRequired')}</option>` : `<option value="">${t('label.notAssigned')}</option>`}
      ${options.map(tb=>`<option value="${tb.id}" ${r.tableId===tb.id?'selected':''}>${escapeHtml(tableLabel(tb))}</option>`).join('')}
    </select>
  `;
}

// Cuando cambia la fecha: regenera las franjas horarias válidas y, en cadena,
// las mesas disponibles para la nueva fecha/hora.
function updateReservationTimeOptions(){
  const date = document.getElementById('reservation-date').value || todayStr();
  const timeEl = document.getElementById('reservation-time');
  const currentTime = timeEl.value || '20:00';
  const wrap = timeEl.parentElement;
  wrap.innerHTML = reservationTimeFieldHtml({date, time: currentTime, id: currentReservationId});
  updateReservationTableOptions();
}

// Regenera la lista de mesas disponibles para la fecha/hora seleccionadas.
function updateReservationTableOptions(){
  const date = document.getElementById('reservation-date').value || todayStr();
  const time = document.getElementById('reservation-time').value;
  const tableEl = document.getElementById('reservation-table');
  const currentTableId = tableEl.value ? parseInt(tableEl.value) : null;
  const peopleEl = document.getElementById('reservation-people');
  const people = peopleEl ? parseInt(peopleEl.value) || 1 : 1;
  const wrap = tableEl.parentElement;
  wrap.innerHTML = reservationTableFieldHtml({date, time, tableId: currentTableId, id: currentReservationId, people});
}

let currentReservationId = null;

function openReservationModal(id){
  const r = id ? DB.reservations.find(x=>x.id===id) : {clientId:null, clientName:'', date: reservasDate || todayStr(), time:'20:00', people:2, tableId:null, notes:'', status:'confirmada'};
  currentReservationId = id || null;

  const selectedClient = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;

  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editReservation'):t('title.newReservation')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field" style="position:relative">
      <label>${t('th.client')}</label>
      <input type="text" id="reservation-client-search" placeholder="${t('label.clientNoRecord')}" autocomplete="off" value="${escapeHtml(selectedClient?selectedClient.name:'')}" oninput="runTypeahead('reservation-client-search')" onfocus="runTypeahead('reservation-client-search')" onblur="setTimeout(()=>hideTypeahead('reservation-client-search'),150)">
      <input type="hidden" id="reservation-client" value="${r.clientId||''}">
      <div id="reservation-client-search-results" class="typeahead-results" style="display:none"></div>
      <div id="reservation-client-noshow-hint"></div>
    </div>
    <div class="field">
      <label>${t('label.nameIfNoClientRecord')}</label>
      <input type="text" id="reservation-client-name" value="${escapeHtml(r.clientName||'')}" placeholder="${t('ph.nameForReservation')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.date')}</label>
        <input type="date" id="reservation-date" value="${r.date}" min="${todayStr()}" onchange="updateReservationTimeOptions()">
      </div>
      <div class="field">
        <label>${t('th.time')}</label>
        ${reservationTimeFieldHtml(r)}
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.numberOfPeople')}</label>
        <input type="number" id="reservation-people" value="${r.people}" min="1" max="50" onchange="updateReservationTableOptions()">
      </div>
      <div class="field">
        <label>${t('label.tablePos')}${DB.tables.length ? ' *' : ''}</label>
        ${reservationTableFieldHtml(r)}
      </div>
    </div>
    <div class="field">
      <label>${t('th.notes')}</label>
      <textarea id="reservation-notes" placeholder="${t('ph.reservationNotes')}">${escapeHtml(r.notes||'')}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveReservation(${id||'null'})">${t("common.save")}</button>
    </div>
  `);
  attachTypeahead('reservation-client-search', 'reservation-client-search-results',
    q => DB.clients.filter(c => c.name.toLowerCase().includes(q)),
    c => `${escapeHtml(c.name)}${c.noShows?` (${c.noShows} no-show${c.noShows===1?'':'s'})`:''}`,
    c => {
      document.getElementById('reservation-client').value = c.id;
      document.getElementById('reservation-client-search').value = c.name;
      updateReservationClientNoShowHint();
    },
    { hiddenId: 'reservation-client', onClear: updateReservationClientNoShowHint });
  updateReservationClientNoShowHint();
}

// Aviso (no bloqueante) de cuántas veces ha fallado este cliente antes,
// justo donde se elige a quién es la reserva — antes ese dato (`c.noShows`)
// solo se veía en la ficha de Clientes, sin conexión con Reservas.
function updateReservationClientNoShowHint(){
  const sel = document.getElementById('reservation-client');
  const hint = document.getElementById('reservation-client-noshow-hint');
  if(!sel || !hint) return;
  const clientId = sel.value ? parseInt(sel.value) : null;
  const client = clientId ? DB.clients.find(c=>c.id===clientId) : null;
  hint.innerHTML = (client && client.noShows)
    ? `<small style="color:var(--red)"><i class="ti ti-alert-triangle"></i> ${t('msg.clientHasNoShows').replace('${n}', client.noShows)}</small>`
    : '';
}

async function saveReservation(id){
  const clientIdVal = document.getElementById('reservation-client').value;
  const clientId = clientIdVal ? parseInt(clientIdVal) : null;
  const clientName = document.getElementById('reservation-client-name').value.trim();
  const date = document.getElementById('reservation-date').value || todayStr();
  const time = document.getElementById('reservation-time').value || '20:00';
  const people = Math.min(parseInt(document.getElementById('reservation-people').value) || 1, 50);
  const tableIdVal = document.getElementById('reservation-table').value;
  const tableId = tableIdVal ? parseInt(tableIdVal) : null;
  const notes = document.getElementById('reservation-notes').value.trim();

  if(!clientId && !clientName){ showToast(t('msg.indicateClient')); return; }

  // Obligatorio asignar una mesa concreta a toda reserva (si el negocio
  // tiene mesas dadas de alta): así el margen de 90 minutos entre mesa y
  // mesa (reservaVentanaMin) tiene siempre algo real que proteger, y en el
  // TPV se puede avisar de verdad al sentar a alguien en una mesa que
  // tiene una reserva próxima, en vez de que la reserva quede "flotando"
  // sin mesa asignada.
  if(!tableId && DB.tables.length){ showToast(t('msg.selectReservationTableRequired')); return; }

  // No permitir reservar la misma mesa dos veces con menos de 90 min de diferencia.
  if(tableId){
    const disponible = getAvailableTablesForReservation(date, time, id, people).some(t => t.id === tableId);
    if(!disponible){
      const table = DB.tables.find(t=>t.id===tableId);
      showToast(`${table?table.name:t('label.thatTable')} ${t('msg.tableReservedNearby')}`);
      return;
    }
    // Aviso (no bloqueante) si la mesa elegida tiene menos plazas que el grupo.
    const table = DB.tables.find(t=>t.id===tableId);
    if(table && table.plazas && people > table.plazas){
      if(!(await confirmModal(t('msg.confirmTableTooSmall').replace('${table}', table.name).replace('${plazas}', table.plazas).replace('${people}', people)))) return;
    }
  }

  // Aviso (no bloqueante) si ya hay otra reserva sin cancelar para el mismo
  // cliente cerca de la misma fecha y hora (mismo margen que se usa para
  // decidir si dos reservas "chocan" al asignar mesa, en vez de exigir que
  // la hora coincida al minuto exacto — 20:00 y 20:05 son la misma reserva
  // duplicada por error, no dos reservas distintas).
  const dupe = DB.reservations.find(r => {
    if(r.id === id || r.date !== date || r.status === 'cancelada' || r.status === 'no_show') return false;
    const isSameClient = (clientId && r.clientId === clientId) || (!clientId && clientName && stripAccents((r.clientName||'').trim().toLowerCase()) === stripAccents(clientName.toLowerCase()));
    if(!isSameClient) return false;
    const rMin = reservaTimeToMinutes(r.time), reqMin = reservaTimeToMinutes(time);
    if(rMin == null || reqMin == null) return r.time === time;
    return Math.abs(rMin - reqMin) < reservaVentanaMin();
  });
  if(dupe){
    if(!(await confirmModal(t('msg.confirmDuplicateReservation')))) return;
  }

  const existing = id ? DB.reservations.find(x=>x.id===id) : null;
  const status = existing ? existing.status : 'confirmada';
  const data = {id, clientId, clientName, date, time, people, tableId, notes, status};

  if(status === 'confirmada' || status === 'pendiente'){
    const turnoIdx = getTurnoIndexForTime(date, time);
    const aforo = parseInt(DB.business.aforo) || 0;
    if(turnoIdx !== null && aforo){
      const yaReservado = getReservedPeopleForTurno(date, turnoIdx, id);
      const turnos = getTurnosForDate(date);
      const turno = turnos[turnoIdx];
      if(yaReservado + people > aforo){
        // En vez de un simple confirm() de "sí/no" que solo permite forzar
        // el turno lleno o cancelar, se ofrece una tercera vía: poner en
        // lista de espera (no cuenta para el aforo hasta que se confirme de
        // verdad), para no tener que aceptar un turno reventado a ciegas ni
        // perder al cliente si simplemente no cabe hoy.
        openOverbookedChoiceModal(data, turno, yaReservado, aforo);
        return;
      }
    }
  }

  finalizeSaveReservation(data);
}

let pendingReservationSave = null;
function openOverbookedChoiceModal(data, turno, yaReservado, aforo){
  pendingReservationSave = data;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.overbookedShift')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.overbookedShiftInfo').replace('${range}', `${turno.abre}-${turno.cierra}`).replace('${already}', yaReservado).replace('${wouldBe}', yaReservado + data.people).replace('${cap}', aforo)}</p>
    <div class="modal-footer" style="flex-wrap:wrap">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn" onclick="confirmReservationAsWaitlist()"><i class="ti ti-clock-hour-4"></i> ${t('btn.addToWaitlist')}</button>
      <button class="btn btn-primary" onclick="confirmReservationOverbooked()"><i class="ti ti-check"></i> ${t('btn.confirmAnyway')}</button>
    </div>
  `);
}
function confirmReservationOverbooked(){
  if(!pendingReservationSave) return;
  finalizeSaveReservation(pendingReservationSave);
  pendingReservationSave = null;
}
function confirmReservationAsWaitlist(){
  if(!pendingReservationSave) return;
  finalizeSaveReservation({...pendingReservationSave, status: 'lista_espera'});
  pendingReservationSave = null;
}
function finalizeSaveReservation(data){
  const {id, clientId, clientName, date, time, people, tableId, notes, status} = data;
  const existing = id ? DB.reservations.find(x=>x.id===id) : null;
  // Se compara ANTES de sobrescribir: es lo que decide si hay algo que
  // avisarle al cliente (cambiar fecha/hora es la noticia; tocar solo la
  // mesa o las notas internas no le afecta a él para nada).
  const cambioFechaHora = existing && (existing.date !== date || existing.time !== time);
  if(existing){
    Object.assign(existing, {clientId, clientName, date, time, people, tableId, notes, status});
  }else{
    DB.reservations.push({id: genId(), clientId, clientName, date, time, people, tableId, notes, status});
  }
  saveDB();
  // Igual que syncReservationStatusForPublic ya hace desde setReservationStatus:
  // sin esto, editar la fecha/hora a mano no llegaba nunca al enlace público
  // de gestión, que se quedaba enseñando los datos viejos para siempre.
  if(existing && existing.publicToken && typeof syncReservationStatusForPublic === 'function') syncReservationStatusForPublic(existing);
  closeModal();
  renderReservas();
  // Aviso no bloqueante (no se impide guardar, el personal puede necesitar
  // registrar reservas de fechas pasadas para el historial) si la fecha
  // elegida es anterior a hoy.
  showToast(status === 'lista_espera' ? t('msg.reservationWaitlisted') : date < todayStr() ? t('msg.reservationSavedPastDate') : t('msg.reservationSaved'));
  if(cambioFechaHora) openReservationNotifyChangeModal(id, 'editada');
}

// Marca (o desmarca) la llegada de una reserva, actualizando su estado a la
// vez: al llegar pasa a "completada" (antes se quedaba en "confirmada" para
// siempre, contando de más si alguna vez se recontaba el aforo del turno).
// Solo tiene sentido sobre una reserva confirmada o ya completada — no sobre
// una cancelada o marcada como no presentada.
// `tableId`, si se indica, actualiza la mesa de la reserva a la mesa real
// donde se ha sentado (evita que se quede "reservada" una mesa distinta a
// la que realmente se usó, si se reorganizó sobre la marcha).
function setReservationArrival(id, arrived, tableId){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  if(r.status !== 'confirmada' && r.status !== 'completada') return;
  r.llegada = arrived;
  r.status = arrived ? 'completada' : 'confirmada';
  if(arrived && tableId) r.tableId = tableId;
  saveDB();
  // Sin esto, el enlace público de gestión de la reserva se quedaba
  // mostrando "confirmada" para siempre (nunca se enteraba de la llegada),
  // así que el cliente seguía viendo los botones de Editar/Cancelar sobre
  // una reserva que ya está sentada.
  if(r.publicToken && typeof syncReservationStatusForPublic === 'function') syncReservationStatusForPublic(r);
}

function toggleReservaLlegada(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  // Al marcar la llegada (no al desmarcarla) se confirma/corrige en qué mesa
  // se ha sentado el grupo, por si al final se organizó en una distinta a
  // la reservada — antes esto solo se podía hacer sentando la reserva desde
  // el TPV; marcar "Llegada" directamente desde Reservas dejaba la mesa
  // reservada original aunque el grupo se hubiera sentado en otra.
  if(!r.llegada){
    openReservaArrivalTableModal(id);
    return;
  }
  setReservationArrival(id, false);
  renderReservas();
}

function openReservaArrivalTableModal(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const sortedTables = [...DB.tables].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es', {numeric:true}));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-check"></i> ${t('btn.arrived')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.confirmArrivalTable')}</p>
    <div class="field">
      <label>${t('th.table')}</label>
      <select id="reserva-arrival-table-sel">
        <option value="">${t('label.notAssigned')}</option>
        ${sortedTables.map(tb => `<option value="${tb.id}" ${tb.id===r.tableId?'selected':''}>${escapeHtml(tb.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmReservaArrival(${id})"><i class="ti ti-check"></i> ${t('btn.arrived')}</button>
    </div>
  `);
}
function confirmReservaArrival(id){
  const sel = document.getElementById('reserva-arrival-table-sel');
  const tableId = sel && sel.value ? parseInt(sel.value) : null;
  setReservationArrival(id, true, tableId);
  closeModal();
  renderReservas();
}

// Antes solo una solicitud pendiente venida de la web pública exigía PIN;
// cualquier otra reserva (confirmada, completada, gestionada por el
// personal) se borraba con un simple confirm(), perdiendo para siempre su
// histórico/notas — a diferencia de borrar un cliente, que sí pasa por PIN
// + papelera. Ahora todas las reservas usan el mismo nivel de protección.
function deleteReservation(id){
  if(!puedeCancelar()) return;
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  requestBusinessPinAction(t('title.deleteReservation'), t('msg.confirmDeleteReservation'), () => {
    moveToTrash('reservation', r);
    logAudit('delete', t('audit.deletedReservation').replace('${name}', r.clientName||'?').replace('${date}', r.date), 'critical');
    DB.reservations = DB.reservations.filter(x=>x.id!==id);
    saveDB();
    closeModal();
    renderReservas();
  });
}

// Recordatorio de la reserva por WhatsApp/email, con el mismo patrón que el
// aviso de premio de fidelidad en Clientes.
function openReservationReminderModal(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  const name = client ? client.name : (r.clientName || '');
  const phone = (client && client.phone) || r.clientPhone || '';
  const email = client && client.email;
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  const peopleLabel = r.people===1 ? t('label.oneReservationPerson') : t('label.nReservationPeople').replace('${n}', r.people);
  const msg = t('msg.reservationReminder').replace('${name}', name).replace('${biz}', bizName).replace('${date}', r.date).replace('${time}', r.time).replace('${people}', peopleLabel);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-bell"></i> ${t('title.sendReminderTo')} ${escapeHtml(name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <textarea id="reservation-reminder-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div class="promo-share-actions" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-fino is-on" style="flex:1" onclick="sendReservationReminderWhatsapp(${id})" ${!phone?`disabled title="${t('promo.clients.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendReservationReminderEmail(${id})" ${!email?`disabled title="${t('msg.noEmail')}"`:''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function sendReservationReminderWhatsapp(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  const phone = (client && client.phone) || r.clientPhone;
  if(!phone){ showToast(t('msg.noPhone')); return; }
  const tel = whatsappDeTelefono(phone);   // con prefijo de país: «612345678» a secas no abre ningún chat
  if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil: WhatsApp no lo abre.', ca:'Aquest telèfon no sembla un mòbil: WhatsApp no l\'obre.', en:'This number does not look like a mobile: WhatsApp will not open it.'})); return; }
  const txt = encodeURIComponent(document.getElementById('reservation-reminder-text').value);
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
  r.reminderSentAt = new Date().toISOString();
  saveDB();
  renderReservasRemindersDue();
}
function sendReservationReminderEmail(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  if(!client || !client.email){ showToast(t('msg.noEmail')); return; }
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  const subject = encodeURIComponent(t('msg.reservationReminderSubject').replace('${biz}', bizName));
  const body = encodeURIComponent(document.getElementById('reservation-reminder-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(client.email)+'?subject='+subject+'&body='+body;
  r.reminderSentAt = new Date().toISOString();
  saveDB();
  renderReservasRemindersDue();
}

// Avisar al cliente de un cambio hecho por el NEGOCIO (cancelar o editar
// fecha/hora) — mismo patrón que el recordatorio de arriba (WhatsApp/email
// vía enlaces nativos, sin ninguna API de pago ni backend), pero con su
// propio texto y sin tocar reminderSentAt (es un aviso distinto, no un
// recordatorio de que se acerca la reserva).
function openReservationNotifyChangeModal(id, tipo){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  const name = client ? client.name : (r.clientName || '');
  const phone = (client && client.phone) || r.clientPhone || '';
  const email = (client && client.email) || r.clientEmail || '';
  if(!phone && !email) return; // nada que ofrecer: ni teléfono ni email guardados
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  const peopleLabel = r.people===1 ? t('label.oneReservationPerson') : t('label.nReservationPeople').replace('${n}', r.people);
  const claveMsg = tipo === 'cancelada' ? 'msg.reservationCancelledNotify' : 'msg.reservationEditedNotify';
  const msg = t(claveMsg).replace('${name}', name).replace('${biz}', bizName).replace('${date}', r.date).replace('${time}', r.time).replace('${people}', peopleLabel);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-message-circle"></i> ${t('title.notifyReservationChange')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted)">${t('msg.notifyReservationHint')}</p>
    <div class="field">
      <textarea id="reservation-notify-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div class="promo-share-actions" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-fino is-on" style="flex:1" onclick="sendReservationNotifyWhatsapp(${id})" ${!phone?`disabled title="${t('promo.clients.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendReservationNotifyEmail(${id})" ${!email?`disabled title="${t('msg.noEmail')}"`:''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function sendReservationNotifyWhatsapp(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  const phone = (client && client.phone) || r.clientPhone;
  if(!phone){ showToast(t('msg.noPhone')); return; }
  const tel = whatsappDeTelefono(phone);   // con prefijo de país: «612345678» a secas no abre ningún chat
  if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil: WhatsApp no lo abre.', ca:'Aquest telèfon no sembla un mòbil: WhatsApp no l\'obre.', en:'This number does not look like a mobile: WhatsApp will not open it.'})); return; }
  const txt = encodeURIComponent(document.getElementById('reservation-notify-text').value);
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
  closeModal();
}
function sendReservationNotifyEmail(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  const email = (client && client.email) || r.clientEmail;
  if(!email){ showToast(t('msg.noEmail')); return; }
  const bizName = (DB.business && DB.business.name) || t('mn.online.ourRestaurant');
  const subject = encodeURIComponent(t('msg.reservationChangeSubject').replace('${biz}', bizName));
  const body = encodeURIComponent(document.getElementById('reservation-notify-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(email)+'?subject='+subject+'&body='+body;
  closeModal();
}

// Recordatorios "automáticos" de reserva: no hay backend para enviarlos solos
// sin intervención humana (no hay servidor ni API de WhatsApp/SMS propia), así
// que la app hace el trabajo de detectarlos y prepararlos: cada vez que se
// abre Reservas, se muestran las reservas de mañana que aún no tienen
// recordatorio enviado, listas para mandar con un solo click por cliente.
/* ============================================================
   PROMOCIÓN — Calendario de marketing del negocio
   ============================================================ */
let promoTab = 'dia';
let promoDate = todayStr();
let promoWeekOffset = 0;

function setPromoTab(tab){
  promoTab = tab;
  renderPromocion();
  scrollContentToTop();
}

// Enlaces directos a Instagram/Facebook/Google (los mismos datos que en Mi
// Negocio → Redes sociales), para que quien gestione Promoción pueda abrir
// la cuenta de un toque y colgar un post o responder una reseña sin salir
// de la app ni tener que buscar el perfil a mano.
function instagramProfileUrl(handle){
  const h = (handle||'').trim().replace(/^@/, '');
  if(!h) return '';
  return /^https?:\/\//i.test(h) ? h : 'https://instagram.com/' + encodeURIComponent(h);
}
function facebookProfileUrl(handle){
  const h = (handle||'').trim();
  if(!h) return '';
  return /^https?:\/\//i.test(h) ? h : 'https://facebook.com/' + encodeURIComponent(h);
}
function tiktokProfileUrl(handle){
  const h = (handle||'').trim().replace(/^@/, '');
  if(!h) return '';
  return /^https?:\/\//i.test(h) ? h : 'https://www.tiktok.com/@' + encodeURIComponent(h);
}
function renderPromoSocialLinks(){
  const box = document.getElementById('promo-social-links');
  if(!box) return;
  const b = DB.business || {};
  const links = [
    { url: instagramProfileUrl(b.ig), icon: 'ti-brand-instagram', label: 'Instagram' },
    { url: facebookProfileUrl(b.fb), icon: 'ti-brand-facebook', label: 'Facebook' },
    { url: tiktokProfileUrl(b.tiktok), icon: 'ti-brand-tiktok', label: 'TikTok' },
    { url: (b.gmaps||'').trim(), icon: 'ti-brand-google', label: t('mn.business.gmapsLabel') },
  ].filter(l => l.url);
  if(!links.length){
    box.innerHTML = `<p class="pr-ayuda pm-redes"><i class="ti ti-info-circle"></i> ${t('promo.social.emptyHint')}</p>`;
    return;
  }
  box.innerHTML = `
    <div class="pm-redes" role="group" aria-label="${escapeHtml(gl({es:'Tus redes', ca:'Les teves xarxes', en:'Your social accounts'}))}">
      ${links.map(l => `<a class="btn btn-sm btn-fino" href="${escapeHtml(l.url)}" target="_blank" rel="noopener"><i class="ti ${l.icon}"></i> ${escapeHtml(l.label)}</a>`).join('')}
    </div>`;
}

/* Pestañas de Promoción: se pintan desde aquí (y no en el HTML) para que el
   texto salga en el idioma activo sin una clave suelta por cada una. */
function promoTabsHtml(){
  const tabs = [
    ['dia', 'ti-calendar-event', t('common.day')],
    ['semana', 'ti-calendar-week', t('common.week')],
    ['mes', 'ti-calendar-month', t('common.month')],
    ['novedades', 'ti-send', gl({es:'Novedades', ca:'Novetats', en:'News'}), ' owner-only'],
    ['clientes', 'ti-users', t('view.clientes.title')],
    ['ideas', 'ti-bulb', t('tab.contentIdeas')],
  ];
  return `<div class="left">${tabs.map(([id, ic, txt, extra]) =>
    `<button type="button" class="btn btn-sm btn-fino${extra || ''}${promoTab===id ? ' is-on active' : ''}" id="promo-tab-${id}" aria-pressed="${promoTab===id}" onclick="setPromoTab('${id}')"><i class="ti ${ic}"></i> ${escapeHtml(txt)}</button>`).join('')}</div>`;
}

function renderPromocion(){
  renderPromoSocialLinks();
  const fila = document.getElementById('promo-tabs-row');
  if(fila){ fila.innerHTML = promoTabsHtml(); scrollActiveTabIntoView(fila); }
  if(promoTab === 'semana') renderPromoSemana();
  else if(promoTab === 'mes') renderPromoMes();
  else if(promoTab === 'novedades' && typeof renderNovedades === 'function') renderNovedades();
  else if(promoTab === 'clientes') renderPromoClientes();
  else if(promoTab === 'ideas') renderPromoIdeas();
  else renderPromoDia();
}

function goToPromoDia(date){
  promoDate = date;
  promoTab = 'dia';
  renderPromocion();
}

// Franja de cifras de arriba (misma pieza que Stock y Personal).
function pmResumenHtml(celdas){
  return `<div class="st-resumen pm-resumen">${celdas.map(c => `
    <div class="st-cel${c.cls ? ' ' + c.cls : ''}"><span class="st-cel-et">${escapeHtml(c.et)}</span><span class="st-cel-v">${c.v}</span>${c.sub ? `<span class="st-cel-s">${c.sub}</span>` : ''}</div>`).join('')}</div>`;
}
function pmFechaLarga(ds, mayus){
  const f = new Date(ds + 'T00:00:00').toLocaleDateString(localeActual(), {weekday:'long', day:'numeric', month:'long'});
  return mayus ? f.charAt(0).toUpperCase() + f.slice(1) : f;
}
function pmSumaDias(ds, n){
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
// Etiquetas pequeñas de una acción (descuento, franja, usos, repetición).
function pmEtiquetasHtml(p, ds){
  const et = [];
  if(p.menuItemName) et.push(`<span class="pm-et is-dto"><i class="ti ti-discount-2"></i> ${escapeHtml(p.menuItemName)} −${p.discountPct}%</span>`);
  if(p.menuItemName && p.horaInicio && p.horaFin) et.push(`<span class="pm-et"><i class="ti ti-clock"></i> ${escapeHtml(p.horaInicio)}–${escapeHtml(p.horaFin)}</span>`);
  if(p.menuItemName && p.maxUses) et.push(`<span class="pm-et" title="${escapeHtml(t('promo.modal.maxUsesHint'))}"><i class="ti ti-ticket"></i> ${ds === todayStr() ? promoUsesToday(p) : ((p.usedDates && p.usedDates[ds]) || 0)}/${p.maxUses}</span>`);
  if(p.recurrence === 'weekly') et.push(`<span class="pm-et" title="${escapeHtml(t('promo.modal.recurrenceHint'))}"><i class="ti ti-repeat"></i> ${escapeHtml(p.hasta ? gl({es:'Cada semana hasta el ', ca:'Cada setmana fins al ', en:'Weekly until '}) + new Date(p.hasta + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'short'}) : gl({es:'Cada semana', ca:'Cada setmana', en:'Every week'}))}</span>`);
  return et.length ? `<div class="pm-ets">${et.join('')}</div>` : '';
}

let promoFilterResponsable = '';
let promoFilterStatus = '';
function setPromoFilter(field, val){
  if(field==='resp') promoFilterResponsable = val; else promoFilterStatus = val;
  renderPromoDia();
}

function renderPromoDia(){
  pruneOldPromos();
  const box = document.getElementById('promo-tab-content');
  const date = promoDate;
  const hoy = todayStr();
  const salaEmployees = DB.employees.filter(e=>(e.area||'cocina')==='sala');
  const allItems = getPromosForDate(date);
  const hechas = allItems.filter(p => !!(promoDoneInfo(p, date) || {}).done).length;
  const items = allItems.filter(p => {
    const info = promoDoneInfo(p, date);
    return (!promoFilterResponsable || String(p.responsableId||'')===promoFilterResponsable) &&
      (!promoFilterStatus || (promoFilterStatus==='done' ? !!(info&&info.done) : !(info&&info.done)));
  });
  let proximos = 0;
  for(let i = 1; i <= 7; i++) proximos += getPromosForDate(pmSumaDias(date, i)).length;
  const dto = promoDiscountTotalForDate(date);

  const tarjeta = p => {
    const info = promoDoneInfo(p, date);
    const done = !!(info && info.done);
    const resp = p.responsableId ? DB.employees.find(e => e.id === p.responsableId) : null;
    const menu = ggMenuAcciones([
      {icono:'ti-edit', texto:t('common.edit'), fn:`openPromoModal(${p.id})`, owner:true},
      {icono:'ti-copy', texto:gl({es:'Duplicar al día siguiente', ca:'Duplicar al dia següent', en:'Duplicate to the next day'}), fn:`duplicarPromo(${p.id})`, owner:true},
      {icono:'ti-trash', texto:t('common.delete'), fn:`deletePromo(${p.id})`, peligro:true, owner:true},
    ]);
    return `
    <article class="pm-card${done ? ' is-hecha' : ''}">
      <div class="pm-card-cab">
        <label class="dp-check" title="${escapeHtml(t('title.markAsDone'))}">
          <input type="checkbox" ${done ? 'checked' : ''} aria-label="${escapeHtml(t('title.markAsDone'))}: ${escapeHtml(p.titulo)}" onchange="togglePromoDone(${p.id},this.checked,'${date}')">
          <span class="dp-check-caja"><i class="ti ti-check"></i></span>
        </label>
        <button type="button" class="pm-card-tit" onclick="openPromoModal(${p.id})">${escapeHtml(p.titulo)}</button>
        ${menu}
      </div>
      ${p.descripcion ? `<p class="pm-desc">${escapeHtml(p.descripcion)}</p>` : ''}
      ${pmEtiquetasHtml(p, date)}
      <div class="pm-card-pie">
        ${resp ? `<span class="pm-resp"><span class="pr-av pr-av-s" style="--c:${escapeHtml(resp.color || '#8A7440')}">${escapeHtml(prIniciales(resp.name))}</span>${escapeHtml(resp.name)}</span>` : `<span class="pm-resp is-vacio"><i class="ti ti-user-question"></i> ${escapeHtml(t('promo.modal.unassigned'))}</span>`}
        ${done && info.doneAt ? `<span class="pm-hecho"><i class="ti ti-check"></i> ${escapeHtml(new Date(info.doneAt).toLocaleString(localeActual(), {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}))}</span>` : ''}
        ${p.menuItemName && typeof promoAnunciar === 'function' ? `<button type="button" class="btn btn-sm btn-fino owner-only" onclick="promoAnunciar(${p.id})"><i class="ti ti-send"></i> ${escapeHtml(gl({es:'Anunciar a clientes', ca:'Anunciar als clients', en:'Tell customers'}))}</button>` : ''}
      </div>
    </article>`;
  };

  const lista = !allItems.length
    ? `<div class="empty es-vacio"><i class="ti ti-speakerphone"></i>${t('promo.day.noActions')}
        <div class="owner-only"><button type="button" class="btn btn-fino is-on" onclick="openPromoModal(null,'${date}')"><i class="ti ti-plus"></i> ${t('promo.newAction')}</button> <button type="button" class="btn btn-fino" onclick="setPromoTab('ideas')"><i class="ti ti-bulb"></i> ${t('tab.contentIdeas')}</button></div></div>`
    : !items.length
    ? `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`
    : `<div class="pr-grid pm-grid">${items.map(tarjeta).join('')}</div>`;

  const etEstado = (v, txt) => `<button type="button" class="btn btn-sm btn-fino${promoFilterStatus===v ? ' is-on' : ''}" aria-pressed="${promoFilterStatus===v}" onclick="setPromoFilter('status','${v}')">${escapeHtml(txt)}</button>`;
  box.innerHTML = `
    ${pmResumenHtml([
      {et: gl({es:'Acciones del día', ca:'Accions del dia', en:'Actions today'}), v: allItems.length},
      {et: t('promo.kpi.completed'), v: `${hechas} / ${allItems.length}`, cls: allItems.length && hechas === allItems.length ? 'is-ok' : ''},
      {et: gl({es:'Descuento concedido', ca:'Descompte concedit', en:'Discount given'}), v: fmtMoney(dto.total), sub: dto.count ? escapeHtml(gl({es:`${dto.count} uso(s) en caja`, ca:`${dto.count} ús(os) a caixa`, en:`${dto.count} use(s) at the till`})) : escapeHtml(gl({es:'ninguno en caja', ca:'cap a caixa', en:'none at the till'}))},
      {et: gl({es:'Próximos 7 días', ca:'Propers 7 dies', en:'Next 7 days'}), v: proximos},
    ])}
    <div class="toolbar pm-barra">
      <div class="left pm-nav">
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Día anterior', ca:'Dia anterior', en:'Previous day'}))}" onclick="promoDate=pmSumaDias(promoDate,-1);renderPromocion()"><i class="ti ti-chevron-left"></i></button>
        <label class="pm-fecha"><span class="pm-fecha-txt">${escapeHtml(pmFechaLarga(date, true))}</span><input type="date" id="promo-filter-date" value="${date}" aria-label="${escapeHtml(t('promo.modal.date'))}" onchange="if(this.value){promoDate=this.value;renderPromocion()}"></label>
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Día siguiente', ca:'Dia següent', en:'Next day'}))}" onclick="promoDate=pmSumaDias(promoDate,1);renderPromocion()"><i class="ti ti-chevron-right"></i></button>
        ${date !== hoy ? `<button type="button" class="btn btn-sm btn-fino" onclick="promoDate=todayStr();renderPromocion()">${t('common.today')}</button>` : ''}
      </div>
      <button type="button" class="owner-only btn btn-fino is-on" onclick="openPromoModal(null,'${date}')"><i class="ti ti-plus"></i> ${t("promo.newAction")}</button>
    </div>
    ${allItems.length ? `<div class="toolbar pm-filtros">
      <div class="left">
        ${salaEmployees.length ? `<select aria-label="${escapeHtml(t('promo.modal.responsible'))}" onchange="setPromoFilter('resp', this.value)">
          <option value="">${t('promo.day.allResponsibles')}</option>
          ${salaEmployees.map(e=>`<option value="${e.id}" ${promoFilterResponsable===String(e.id)?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
        </select>` : ''}
        ${etEstado('', t('promo.day.allStatuses'))}${etEstado('pending', t('promo.day.pending'))}${etEstado('done', t('promo.day.done'))}
      </div>
    </div>` : ''}
    ${lista}
  `;
}

function renderPromoSemana(){
  const box = document.getElementById('promo-tab-content');
  const dates = getWeekDates(promoWeekOffset);
  const hoy = todayStr();
  let total = 0, hechas = 0;
  const columnas = dates.map((d, i) => {
    const ds = dateStr(d);
    const items = getPromosForDate(ds);
    total += items.length;
    hechas += items.filter(p => !!(promoDoneInfo(p, ds) || {}).done).length;
    return `
      <section class="pm-sem-dia${ds === hoy ? ' is-hoy' : ''}${ds < hoy ? ' es-pasado' : ''}" aria-label="${escapeHtml(pmFechaLarga(ds))}">
        <header class="pm-sem-cab" onclick="goToPromoDia('${ds}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goToPromoDia('${ds}')}">
          <span class="pm-sem-dia-nom">${escapeHtml(weekDayShort(i))}</span><b class="pm-sem-dia-num">${d.getDate()}</b><span class="pm-sem-dia-mes">${escapeHtml(t('months.short')[d.getMonth()])}</span>
        </header>
        <div class="pm-sem-lista">
          ${items.map(p => { const done = !!(promoDoneInfo(p, ds) || {}).done; return `
            <button type="button" class="pm-chip${done ? ' is-hecha' : ''}${p.menuItemName ? ' es-dto' : ''}" onclick="openPromoModal(${p.id})">
              ${done ? '<i class="ti ti-check"></i>' : p.menuItemName ? '<i class="ti ti-discount-2"></i>' : p.recurrence === 'weekly' ? '<i class="ti ti-repeat"></i>' : ''}
              <span>${escapeHtml(p.titulo)}</span>
            </button>`; }).join('')}
          <button type="button" class="pm-mas owner-only" aria-label="${escapeHtml(t('promo.newAction'))} · ${escapeHtml(pmFechaLarga(ds))}" onclick="openPromoModal(null,'${ds}')"><i class="ti ti-plus"></i></button>
        </div>
      </section>`;
  }).join('');

  box.innerHTML = `
    <div class="toolbar pm-barra">
      <div class="left pm-nav">
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Semana anterior', ca:'Setmana anterior', en:'Previous week'}))}" onclick="promoWeekOffset--;renderPromocion()"><i class="ti ti-chevron-left"></i></button>
        <span class="pm-rango">${dates[0].getDate()} ${escapeHtml(t('months.short')[dates[0].getMonth()])} – ${dates[6].getDate()} ${escapeHtml(t('months.short')[dates[6].getMonth()])}</span>
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Semana siguiente', ca:'Setmana següent', en:'Next week'}))}" onclick="promoWeekOffset++;renderPromocion()"><i class="ti ti-chevron-right"></i></button>
        ${promoWeekOffset !== 0 ? `<button type="button" class="btn btn-sm btn-fino" onclick="promoWeekOffset=0;renderPromocion()">${t('common.today')}</button>` : ''}
      </div>
      <button type="button" class="owner-only btn btn-fino is-on" onclick="openPromoModal()"><i class="ti ti-plus"></i> ${t('promo.newAction')}</button>
    </div>
    ${pmResumenHtml([
      {et: gl({es:'Acciones de la semana', ca:'Accions de la setmana', en:'Actions this week'}), v: total},
      {et: t('promo.kpi.completed'), v: `${hechas} / ${total}`, cls: total && hechas === total ? 'is-ok' : ''},
    ])}
    <div class="pm-sem">${columnas}</div>
  `;
}

let promoMes = null;   // {anio, mes} que se mira; null = el mes en curso
function promoMesActual(){
  if(!promoMes){ const h = new Date(); promoMes = {anio: h.getFullYear(), mes: h.getMonth()}; }
  return promoMes;
}
function promoMesCb(anio, mes){
  promoMes = {anio, mes: mes == null ? promoMesActual().mes : mes};
  renderPromoMes();
}

function renderPromoMes(){
  const box = document.getElementById('promo-tab-content');
  const {anio: year, mes: month} = promoMesActual();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hoy = todayStr();

  // Contadores por día con getPromosForDate: así cuentan también las
  // apariciones de las recurrentes, no solo las creadas ese día exacto.
  let monthTotal = 0, monthDone = 0;
  const dayPromos = {};
  for(let day = 1; day <= daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const items = getPromosForDate(ds);
    dayPromos[ds] = items;
    monthTotal += items.length;
    monthDone += items.filter(p => !!(promoDoneInfo(p, ds) || {}).done).length;
  }
  // Cuántas acciones hay en cada mes del año (para el selector de periodo).
  const datos = {};
  for(let m = 0; m < 12; m++){
    let n = 0;
    for(let d = 1; d <= new Date(year, m + 1, 0).getDate(); d++) n += getPromosForDate(dateStr(new Date(year, m, d))).length;
    if(n) datos[`${year}-${String(m + 1).padStart(2, '0')}`] = n;
  }
  const usedCategories = CONTENT_IDEAS.filter((_, i) => categoryUsedCount(i) > 0).length;

  let celdas = '';
  for(let i = 0; i < startOffset; i++) celdas += `<div class="pm-mes-vacio" aria-hidden="true"></div>`;
  for(let day = 1; day <= daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const items = dayPromos[ds];
    celdas += `
      <button type="button" class="pm-mes-dia${ds === hoy ? ' is-hoy' : ''}${items.length ? ' tiene' : ''}" onclick="goToPromoDia('${ds}')" aria-label="${escapeHtml(pmFechaLarga(ds))}${items.length ? ' · ' + items.length : ''}">
        <b>${day}</b>
        ${items.length ? `<span class="pm-mes-n">${items.length}</span>` : ''}
        <span class="pm-mes-tits">${items.slice(0, 2).map(p => `<i class="${p.menuItemName ? 'es-dto' : ''}">${escapeHtml(p.titulo)}</i>`).join('')}${items.length > 2 ? `<i class="mas">+${items.length - 2}</i>` : ''}</span>
      </button>`;
  }

  box.innerHTML = `
    <div class="toolbar pm-barra">
      <div class="left">${ggPeriodoHtml({anio: year, mes: month, cb: 'promoMesCb', datos, anual: false})}</div>
      <div class="pm-acciones">
        <button type="button" class="btn btn-fino" onclick="printPromoMes(${year},${month})"><i class="ti ti-printer"></i> ${t('promo.print')}</button>
        <button type="button" class="owner-only btn btn-fino is-on" onclick="openPromoModal()"><i class="ti ti-plus"></i> ${t('promo.newAction')}</button>
      </div>
    </div>
    ${pmResumenHtml([
      {et: t('promo.kpi.actionsThisMonth'), v: monthTotal},
      {et: t('promo.kpi.completed'), v: `${monthDone} / ${monthTotal}`, cls: monthTotal && monthDone === monthTotal ? 'is-ok' : ''},
      {et: t('promo.kpi.categoriesUsed'), v: `${usedCategories} / ${CONTENT_IDEAS.length}`},
    ])}
    <div class="pm-mes" role="grid">
      ${t('days.short').map(d => `<div class="pm-mes-cab" role="columnheader">${escapeHtml(d)}</div>`).join('')}
      ${celdas}
    </div>
  `;
}

// Listado imprimible de las acciones de promoción del mes visible.
function printPromoMes(year, month){
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const rows = [];
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const items = getPromosForDate(ds);
    items.forEach(p => {
      const resp = p.responsableId ? DB.employees.find(e=>e.id===p.responsableId) : null;
      const done = !!(promoDoneInfo(p, ds)||{}).done;
      // La fecha se lee como una fecha («jue 12 nov»), no como 2026-11-12, y «Hecho» es una casilla (marcada si ya se hizo) para tachar a mano en el papel.
      const fechaLeible = new Date(year, month, day).toLocaleDateString(localeActual(), {weekday:'short', day:'numeric', month:'short'});
      rows.push(`<tr><td style="white-space:nowrap"><strong>${escapeHtml(fechaLeible)}</strong></td><td><strong>${escapeHtml(p.titulo)}</strong></td><td>${escapeHtml(p.descripcion||'')}</td><td>${resp?escapeHtml(resp.name):'—'}</td><td style="text-align:center"><span style="display:inline-block;width:15px;height:15px;border:1.5px solid #1C1A17;line-height:12px;font-size:13px;font-weight:700">${done?'✓':''}</span></td></tr>`);
    });
  }
  const printTitle = t('promo.print.title').replace('${month}', monthFull(month)).replace('${year}', year);
  const body = `
    ${printReportHeaderHtml(printTitle)}
    <table><thead><tr><th>${t('promo.print.date')}</th><th>${t('promo.print.title.col')}</th><th>${t('promo.print.description')}</th><th>${t('promo.print.responsible')}</th><th>${t('promo.print.done')}</th></tr></thead>
    <tbody>${rows.join('') || `<tr><td colspan="5" class="pr-empty">${t('promo.print.noActions')}</td></tr>`}</tbody></table>
  `;
  printReportWindow(printTitle, body, {winSize:'width=900,height=1000'});
}

/* ============================================================
   IDEAS DE CONTENIDO — Biblioteca de formatos para redes sociales,
   pensada para bares, restaurantes y cafeterías. Cada idea se puede
   convertir con un clic en una Acción de Promoción con fecha y responsable.
   ============================================================ */
const CONTENT_IDEAS = [
  { cat: {es:'Detrás de cámaras', ca:'Darrere les càmeres', en:'Behind the scenes'}, icon: 'ti-video', ideas: [
    { title:{es:'Un día en la vida del chef o camarero/a', ca:'Un dia a la vida del xef o cambrer/a', en:'A day in the life of the chef or waiter/waitress'}, description:{es:'Vídeo corto desde la apertura hasta el cierre, mostrando el ritmo real de un turno.', ca:'Vídeo curt des de l\'obertura fins al tancament, mostrant el ritme real d\'un torn.', en:'Short video from opening to closing, showing the real pace of a shift.'} },
    { title:{es:'Cómo se monta la sala antes de abrir', ca:'Com es munta la sala abans d\'obrir', en:'How the dining room is set up before opening'}, description:{es:'Time-lapse de mesas, mantelería y luces preparándose para el servicio.', ca:'Time-lapse de taules, mantelería i llums preparant-se per al servei.', en:'Time-lapse of tables, linens and lights getting ready for service.'} },
    { title:{es:'El briefing de equipo antes del servicio', ca:'El briefing de l\'equip abans del servei', en:'The team briefing before service'}, description:{es:'Los minutos previos: qué platos destacar, mesas reservadas, avisos del día.', ca:'Els minuts previs: quins plats destacar, taules reservades, avisos del dia.', en:'The moments before: which dishes to highlight, reserved tables, notices for the day.'} },
    { title:{es:'Recibiendo el pedido de proveedores', ca:'Rebent la comanda dels proveïdors', en:'Receiving the supplier delivery'}, description:{es:'Muestra la frescura del producto nada más llegar por la puerta.', ca:'Mostra la frescor del producte just quan arriba per la porta.', en:'Shows how fresh the product is the moment it comes through the door.'} },
    { title:{es:'Preparando la mise en place', ca:'Preparant la mise en place', en:'Preparing the mise en place'}, description:{es:'Cortes, salsas y guarniciones listas antes de que lleguen los primeros clientes.', ca:'Talls, salses i guarnicions a punt abans que arribin els primers clients.', en:'Cuts, sauces and garnishes ready before the first customers arrive.'} },
    { title:{es:'Cierre y limpieza al final del día', ca:'Tancament i neteja al final del dia', en:'Closing and cleaning at the end of the day'}, description:{es:'Time-lapse del recogido, transmite orden y profesionalidad.', ca:'Time-lapse de la recollida, transmet ordre i professionalitat.', en:'Time-lapse of the clean-up, conveys order and professionalism.'} },
    { title:{es:'Un vistazo a la barra en plena hora punta', ca:'Un cop d\'ull a la barra en plena hora punta', en:'A look at the bar during peak hour'}, description:{es:'El caos organizado de un viernes noche, siempre motivador de ver.', ca:'El caos organitzat d\'un divendres a la nit, sempre motivador de veure.', en:'The organized chaos of a Friday night, always fun to watch.'} },
    { title:{es:'Cómo se diseña la carta o el menú del día', ca:'Com es dissenya la carta o el menú del dia', en:'How the menu or daily set menu is designed'}, description:{es:'El proceso de pensar combinaciones, precios y nombres de los platos.', ca:'El procés de pensar combinacions, preus i noms dels plats.', en:'The process of thinking up combinations, prices and dish names.'} },
    { title:{es:'Probando un plato nuevo antes de sacarlo', ca:'Provant un plat nou abans de treure\'l', en:'Trying a new dish before launching it'}, description:{es:'Reacciones sinceras del equipo catando algo antes de que sea oficial.', ca:'Reaccions sinceres de l\'equip tastant alguna cosa abans que sigui oficial.', en:'Honest reactions from the team tasting something before it goes official.'} },
    { title:{es:'Un día de compras en el mercado', ca:'Un dia de compres al mercat', en:'A day of shopping at the market'}, description:{es:'El equipo eligiendo fruta de temporada, café o producto local para la barra.', ca:'L\'equip triant fruita de temporada, cafè o producte local per a la barra.', en:'The team choosing seasonal fruit, coffee or local produce for the bar.'} },
    { title:{es:'Decorando la sala para una fecha especial', ca:'Decorant la sala per a una data especial', en:'Decorating the dining room for a special date'}, description:{es:'Antes/después de vestir el local para Navidad, San Valentín, etc.', ca:'Abans/després de vestir el local per Nadal, Sant Valentí, etc.', en:'Before/after dressing up the venue for Christmas, Valentine\'s Day, etc.'} },
    { title:{es:'La comida del personal (family meal)', ca:'El menjar del personal (family meal)', en:'The staff meal (family meal)'}, description:{es:'El momento en que el equipo come junto antes de abrir, cercano y humano.', ca:'El moment en què l\'equip menja junt abans d\'obrir, proper i humà.', en:'The moment the team eats together before opening, warm and human.'} },
  ]},
  { cat: {es:'Producto — platos y bebidas', ca:'Producte — plats i begudes', en:'Product — dishes and drinks'}, icon: 'ti-tools-kitchen-2', ideas: [
    { title:{es:'Plato del día explicado en 15 segundos', ca:'Plat del dia explicat en 15 segons', en:'Dish of the day explained in 15 seconds'}, description:{es:'Ingredientes, punto fuerte y precio, directo a cámara.', ca:'Ingredients, punt fort i preu, directe a càmera.', en:'Ingredients, standout feature and price, straight to camera.'} },
    { title:{es:'Cóctel de la semana, paso a paso', ca:'Còctel de la setmana, pas a pas', en:'Cocktail of the week, step by step'}, description:{es:'Grabación cenital de la coctelera preparando la receta destacada.', ca:'Gravació zenital de la coctelera preparant la recepta destacada.', en:'Overhead shot of the shaker preparing the featured recipe.'} },
    { title:{es:'Top 3 platos más pedidos este mes', ca:'Top 3 plats més demanats aquest mes', en:'Top 3 most ordered dishes this month'}, description:{es:'Ranking con imágenes, genera curiosidad y prueba social.', ca:'Rànquing amb imatges, genera curiositat i prova social.', en:'A ranking with images, builds curiosity and social proof.'} },
    { title:{es:'Adivina el ingrediente secreto', ca:'Endevina l\'ingredient secret', en:'Guess the secret ingredient'}, description:{es:'Reto interactivo: el equipo da pistas y el público adivina en comentarios.', ca:'Repte interactiu: l\'equip dona pistes i el públic endevina als comentaris.', en:'Interactive challenge: the team gives clues and the audience guesses in the comments.'} },
    { title:{es:'Del fuego al plato: el emplatado', ca:'Del foc al plat: l\'emplatat', en:'From the stove to the plate: plating'}, description:{es:'Últimos segundos de cocción hasta el emplatado final, muy visual.', ca:'Últims segons de cocció fins a l\'emplatat final, molt visual.', en:'The final seconds of cooking through to plating, very visual.'} },
    { title:{es:'Maridaje: qué bebida va con cada plato', ca:'Maridatge: quina beguda va amb cada plat', en:'Pairing: which drink goes with each dish'}, description:{es:'Recomendaciones rápidas de vino, cerveza o cóctel para un plato concreto.', ca:'Recomanacions ràpides de vi, cervesa o còctel per a un plat concret.', en:'Quick recommendations of wine, beer or a cocktail for a specific dish.'} },
    { title:{es:'¿Te atreves con el picante?', ca:'T\'atreveixes amb el picant?', en:'Do you dare go spicy?'}, description:{es:'Reacciones probando el plato más picante de la carta.', ca:'Reaccions provant el plat més picant de la carta.', en:'Reactions to trying the spiciest dish on the menu.'} },
    { title:{es:'ASMR de la preparación', ca:'ASMR de la preparació', en:'ASMR of the preparation'}, description:{es:'Sonido del corte, la plancha o la coctelera, sin música, muy relajante.', ca:'So del tall, la planxa o la coctelera, sense música, molt relaxant.', en:'Sound of the chopping, the grill or the shaker, no music, very soothing.'} },
    { title:{es:'La carta de temporada, plato a plato', ca:'La carta de temporada, plat a plat', en:'The seasonal menu, dish by dish'}, description:{es:'Recorrido breve por cada novedad de la nueva carta.', ca:'Recorregut breu per cada novetat de la nova carta.', en:'A brief tour through every new item on the new menu.'} },
    { title:{es:'Ingrediente sorpresa: crea algo en directo', ca:'Ingredient sorpresa: crea alguna cosa en directe', en:'Surprise ingredient: create something live'}, description:{es:'El chef recibe un ingrediente al azar y improvisa una receta.', ca:'El xef rep un ingredient a l\'atzar i improvisa una recepta.', en:'The chef receives a random ingredient and improvises a recipe.'} },
    { title:{es:'Individual vs. para compartir', ca:'Individual vs. per compartir', en:'Individual vs. to share'}, description:{es:'Comparativa visual de raciones, ayuda a decidir qué pedir.', ca:'Comparativa visual de racions, ajuda a decidir què demanar.', en:'A visual comparison of portions, helps decide what to order.'} },
    { title:{es:'La bebida perfecta: copa, hielo y temperatura', ca:'La beguda perfecta: copa, gel i temperatura', en:'The perfect drink: glass, ice and temperature'}, description:{es:'Cómo se sirve correctamente para que sepa mejor.', ca:'Com es serveix correctament perquè sàpiga millor.', en:'How to serve it correctly so it tastes better.'} },
  ]},
  { cat: {es:'Proceso y elaboración', ca:'Procés i elaboració', en:'Process and preparation'}, icon: 'ti-flame', ideas: [
    { title:{es:'Cómo se hace el pan o la masa madre', ca:'Com es fa el pa o la massa mare', en:'How the bread or sourdough is made'}, description:{es:'Desde el amasado hasta que sale del horno, con tiempos.', ca:'Des de l\'amassat fins que surt del forn, amb temps.', en:'From kneading to coming out of the oven, with timings.'} },
    { title:{es:'Un fondo o caldo casero, de cero a listo', ca:'Un fons o brou casolà, de zero a llest', en:'A homemade stock, from scratch to ready'}, description:{es:'El paso lento que nadie ve pero que marca la diferencia de sabor.', ca:'El pas lent que ningú veu però que marca la diferència de sabor.', en:'The slow step nobody sees but that makes all the difference in flavour.'} },
    { title:{es:'Elaborando un almíbar o infusión para cócteles', ca:'Elaborant un almívar o infusió per a còctels', en:'Making a syrup or infusion for cocktails'}, description:{es:'La "elaboración base" del Escandallo, explicada al público.', ca:'L\'"elaboració base" de l\'Escandall, explicada al públic.', en:'The "base preparation" from the Costing sheet, explained to the audience.'} },
    { title:{es:'Fermentación o maceración en directo', ca:'Fermentació o maceració en directe', en:'Fermentation or maceration live'}, description:{es:'Muestra el "antes" de un producto que normalmente solo se ve terminado.', ca:'Mostra el "abans" d\'un producte que normalment només es veu acabat.', en:'Shows the "before" of a product that\'s normally only seen finished.'} },
    { title:{es:'El café perfecto: tips de barista', ca:'El cafè perfecte: consells de barista', en:'The perfect coffee: barista tips'}, description:{es:'Molienda, temperatura y tiempo de extracción explicados en 30 segundos.', ca:'Mòlta, temperatura i temps d\'extracció explicats en 30 segons.', en:'Grind, temperature and extraction time explained in 30 seconds.'} },
    { title:{es:'El postre de la casa, paso a paso', ca:'El postre de la casa, pas a pas', en:'The house dessert, step by step'}, description:{es:'Desde la mezcla hasta el emplatado final del postre estrella.', ca:'Des de la barreja fins a l\'emplatat final del postre estrella.', en:'From the mix to the final plating of the star dessert.'} },
    { title:{es:'La salsa estrella del restaurante', ca:'La salsa estrella del restaurant', en:'The restaurant\'s signature sauce'}, description:{es:'Sin desvelar la receta completa, muestra el proceso y el resultado.', ca:'Sense desvelar la recepta completa, mostra el procés i el resultat.', en:'Without revealing the whole recipe, shows the process and the result.'} },
    { title:{es:'Ahumado o curado de un producto', ca:'Fumat o curat d\'un producte', en:'Smoking or curing a product'}, description:{es:'Proceso lento y visual que transmite artesanía.', ca:'Procés lent i visual que transmet artesania.', en:'A slow, visual process that conveys craftsmanship.'} },
    { title:{es:'Cómo cuidan y afilan los cuchillos', ca:'Com cuiden i esmolen els ganivets', en:'How the knives are cared for and sharpened'}, description:{es:'Detalle de profesionalidad que sorprende al público no hostelero.', ca:'Detall de professionalitat que sorprèn el públic no hostaler.', en:'A touch of professionalism that surprises people outside the trade.'} },
    { title:{es:'Selección del pescado o la carne del día', ca:'Selecció del peix o la carn del dia', en:'Selecting the fish or meat of the day'}, description:{es:'Cómo eligen el mejor producto antes de que llegue a la carta.', ca:'Com trien el millor producte abans que arribi a la carta.', en:'How they choose the best product before it reaches the menu.'} },
  ]},
  { cat: {es:'Equipo y personas', ca:'Equip i persones', en:'Team and people'}, icon: 'ti-users', ideas: [
    { title:{es:'Presentación del chef: quién es y su historia', ca:'Presentació del xef: qui és i la seva història', en:'Chef introduction: who they are and their story'}, description:{es:'Vídeo corto con su trayectoria y qué le apasiona de cocinar.', ca:'Vídeo curt amb la seva trajectòria i què li apassiona de cuinar.', en:'A short video about their journey and what they love about cooking.'} },
    { title:{es:'Mini entrevista a cada camarero/a', ca:'Mini entrevista a cada cambrer/a', en:'Mini interview with each waiter/waitress'}, description:{es:'Preguntas rápidas: plato favorito, anécdota, por qué le gusta el oficio.', ca:'Preguntes ràpides: plat preferit, anècdota, per què li agrada l\'ofici.', en:'Quick questions: favourite dish, an anecdote, why they love the job.'} },
    { title:{es:'Pregúntame lo que quieras (Q&A en directo)', ca:'Pregunta\'m el que vulguis (Q&A en directe)', en:'Ask me anything (live Q&A)'}, description:{es:'El equipo responde preguntas del público en historias o directo.', ca:'L\'equip respon preguntes del públic a les històries o en directe.', en:'The team answers audience questions on stories or live.'} },
    { title:{es:'Cómo empezó el dueño/a este negocio', ca:'Com va començar el propietari/a aquest negoci', en:'How the owner started this business'}, description:{es:'La motivación real detrás de abrir el local, genera cercanía.', ca:'La motivació real darrere d\'obrir el local, genera proximitat.', en:'The real motivation behind opening the venue, builds closeness.'} },
    { title:{es:'Aniversario de un empleado en la casa', ca:'Aniversari d\'un empleat a la casa', en:'An employee\'s work anniversary'}, description:{es:'Reconocimiento público a la antigüedad y fidelidad del equipo.', ca:'Reconeixement públic a l\'antiguitat i fidelitat de l\'equip.', en:'Public recognition of a team member\'s seniority and loyalty.'} },
    { title:{es:'Un día en la vida del bartender', ca:'Un dia a la vida del bartender', en:'A day in the life of the bartender'}, description:{es:'Desde la apertura de barra hasta el cierre de caja.', ca:'Des de l\'obertura de la barra fins al tancament de caixa.', en:'From opening the bar to closing the till.'} },
    { title:{es:'El chef reacciona a comentarios de clientes', ca:'El xef reacciona a comentaris de clients', en:'The chef reacts to customer comments'}, description:{es:'Lee reseñas (buenas y constructivas) y responde con humor y respeto.', ca:'Llegeix ressenyes (bones i constructives) i respon amb humor i respecte.', en:'Reads reviews (good and constructive) and responds with humour and respect.'} },
    { title:{es:'Anécdota graciosa del servicio', ca:'Anècdota divertida del servei', en:'A funny anecdote from service'}, description:{es:'Con permiso de los implicados, una situación divertida del día a día.', ca:'Amb permís dels implicats, una situació divertida del dia a dia.', en:'With permission from those involved, a funny everyday moment.'} },
    { title:{es:'Quién es quién: el equipo al completo', ca:'Qui és qui: l\'equip complet', en:'Who\'s who: the whole team'}, description:{es:'Presentación coral de todo el personal, con nombre y puesto.', ca:'Presentació coral de tot el personal, amb nom i lloc.', en:'A group introduction of the entire staff, with name and role.'} },
    { title:{es:'Celebrando un cumpleaños del equipo', ca:'Celebrant l\'aniversari d\'algú de l\'equip', en:'Celebrating a team member\'s birthday'}, description:{es:'Momento cercano que humaniza la marca.', ca:'Moment proper que humanitza la marca.', en:'A warm moment that humanizes the brand.'} },
  ]},
  { cat: {es:'Clientes y comunidad', ca:'Clients i comunitat', en:'Customers and community'}, icon: 'ti-heart', ideas: [
    { title:{es:'Leyendo reseñas de clientes en voz alta', ca:'Llegint ressenyes de clients en veu alta', en:'Reading customer reviews out loud'}, description:{es:'El equipo reacciona a comentarios reales de Google/TripAdvisor.', ca:'L\'equip reacciona a comentaris reals de Google/TripAdvisor.', en:'The team reacts to real comments from Google/TripAdvisor.'} },
    { title:{es:'Clientes disfrutando (con su permiso)', ca:'Clients gaudint (amb el seu permís)', en:'Customers enjoying themselves (with their permission)'}, description:{es:'Fotos o vídeos espontáneos de mesas felices durante el servicio.', ca:'Fotos o vídeos espontanis de taules felices durant el servei.', en:'Spontaneous photos or videos of happy tables during service.'} },
    { title:{es:'"El de siempre": un cliente habitual cuenta por qué vuelve', ca:'"El de sempre": un client habitual explica per què torna', en:'"The regular": a loyal customer explains why they keep coming back'}, description:{es:'Testimonio breve y genuino de fidelidad.', ca:'Testimoni breu i genuí de fidelitat.', en:'A short, genuine testimony of loyalty.'} },
    { title:{es:'Reto: foto con el plato y etiquetar al local', ca:'Repte: foto amb el plat i etiquetar el local', en:'Challenge: photo with the dish and tag the venue'}, description:{es:'Incentiva contenido generado por el propio cliente (UGC).', ca:'Incentiva contingut generat pel propi client (UGC).', en:'Encourages user-generated content (UGC) from customers.'} },
    { title:{es:'Testimonio en vídeo tras la comida', ca:'Testimoni en vídeo després de menjar', en:'Video testimonial after the meal'}, description:{es:'Pregunta rápida a la salida: "¿qué te ha parecido?"', ca:'Pregunta ràpida a la sortida: "què t\'ha semblat?"', en:'A quick question on the way out: "how was it?"'} },
    { title:{es:'Sorpresa a un cliente fiel', ca:'Sorpresa a un client fidel', en:'A surprise for a loyal customer'}, description:{es:'Graba el momento de un descuento o detalle inesperado.', ca:'Grava el moment d\'un descompte o detall inesperat.', en:'Film the moment of an unexpected discount or gift.'} },
    { title:{es:'Responde las preguntas frecuentes de tus clientes', ca:'Respon les preguntes freqüents dels teus clients', en:'Answer your customers\' frequently asked questions'}, description:{es:'Horario, reservas, alérgenos, aparcamiento... en formato ágil.', ca:'Horari, reserves, al·lergens, aparcament... en format àgil.', en:'Hours, bookings, allergens, parking... in a quick format.'} },
    { title:{es:'Un cliente elige el menú del día', ca:'Un client tria el menú del dia', en:'A customer chooses the daily set menu'}, description:{es:'Colaboración divertida: un habitual "diseña" el menú de una jornada.', ca:'Col·laboració divertida: un habitual "dissenya" el menú d\'una jornada.', en:'A fun collaboration: a regular "designs" the menu for a day.'} },
    { title:{es:'Mesa cero: primeras reacciones a un plato nuevo', ca:'Taula zero: primeres reaccions a un plat nou', en:'Table zero: first reactions to a new dish'}, description:{es:'Clientes de confianza prueban una novedad antes que nadie.', ca:'Clients de confiança tasten una novetat abans que ningú.', en:'Trusted customers try a new dish before anyone else.'} },
    { title:{es:'Historias de clientes de toda la vida', ca:'Històries de clients de tota la vida', en:'Stories from lifelong customers'}, description:{es:'Quién lleva viniendo años y qué ha vivido en el local.', ca:'Qui porta anys venint i què ha viscut al local.', en:'Someone who has been coming for years and what they\'ve experienced there.'} },
  ]},
  { cat: {es:'Temporada y fechas señaladas', ca:'Temporada i dates assenyalades', en:'Season and special dates'}, icon: 'ti-calendar-event', ideas: [
    { title:{es:'Especial San Valentín', ca:'Especial Sant Valentí', en:'Valentine\'s Day special'}, description:{es:'Menú, decoración o detalle romántico para parejas.', ca:'Menú, decoració o detall romàntic per a parelles.', en:'A menu, decor or romantic touch for couples.'} },
    { title:{es:'Especial Navidad y Nochevieja', ca:'Especial Nadal i Cap d\'Any', en:'Christmas and New Year\'s Eve special'}, description:{es:'Decoración, menú de grupos y últimas mesas disponibles.', ca:'Decoració, menú de grups i últimes taules disponibles.', en:'Decor, group menus and last available tables.'} },
    { title:{es:'Halloween: platos y cócteles temáticos', ca:'Halloween: plats i còctels temàtics', en:'Halloween: themed dishes and cocktails'}, description:{es:'Nombres y presentación terrorífica para la ocasión.', ca:'Noms i presentació terrorífica per a l\'ocasió.', en:'Spooky names and presentation for the occasion.'} },
    { title:{es:'Vuelta al cole: menú rápido de mediodía', ca:'Tornada a l\'escola: menú ràpid de migdia', en:'Back to school: quick lunchtime menu'}, description:{es:'Ideal para familias con poco tiempo entre semana.', ca:'Ideal per a famílies amb poc temps entre setmana.', en:'Ideal for families short on time during the week.'} },
    { title:{es:'Verano: bebidas refrescantes y terraza', ca:'Estiu: begudes refrescants i terrassa', en:'Summer: refreshing drinks and the terrace'}, description:{es:'Contenido pensado para las horas de más calor.', ca:'Contingut pensat per a les hores de més calor.', en:'Content designed for the hottest hours of the day.'} },
    { title:{es:'Día del Padre / de la Madre', ca:'Dia del Pare / de la Mare', en:'Father\'s Day / Mother\'s Day'}, description:{es:'Menú especial o detalle de regalo para la ocasión.', ca:'Menú especial o detall de regal per a l\'ocasió.', en:'A special menu or gift touch for the occasion.'} },
    { title:{es:'Black Friday o rebajas de temporada', ca:'Black Friday o rebaixes de temporada', en:'Black Friday or seasonal sales'}, description:{es:'Promoción puntual con sensación de urgencia.', ca:'Promoció puntual amb sensació d\'urgència.', en:'A one-off promotion with a sense of urgency.'} },
    { title:{es:'Semana Santa: menú de cuaresma', ca:'Setmana Santa: menú de quaresma', en:'Easter: Lenten menu'}, description:{es:'Platos de bacalao, potaje o torrijas de la casa.', ca:'Plats de bacallà, potatge o torrades de la casa.', en:'House dishes of salt cod, stew or French toast.'} },
    { title:{es:'Fiestas o feria local', ca:'Festes o fira local', en:'Local festival or fair'}, description:{es:'Platos típicos de la zona durante las fiestas del pueblo/barrio.', ca:'Plats típics de la zona durant les festes del poble/barri.', en:'Local specialties during the town/neighbourhood festival.'} },
    { title:{es:'Aniversario del negocio', ca:'Aniversari del negoci', en:'Business anniversary'}, description:{es:'Celebración con clientes: tarta, descuentos o sorteo especial.', ca:'Celebració amb clients: pastís, descomptes o sorteig especial.', en:'Celebrate with customers: cake, discounts or a special giveaway.'} },
    { title:{es:'Cambio de carta de temporada', ca:'Canvi de carta de temporada', en:'Seasonal menu change'}, description:{es:'"Despedida" de los platos que se van y bienvenida a los nuevos.', ca:'"Comiat" dels plats que se\'n van i benvinguda als nous.', en:'A "farewell" to the outgoing dishes and a welcome to the new ones.'} },
  ]},
  { cat: {es:'Promociones y ofertas', ca:'Promocions i ofertes', en:'Promotions and offers'}, icon: 'ti-discount-2', ideas: [
    { title:{es:'Happy hour con cuenta atrás', ca:'Happy hour amb compte enrere', en:'Happy hour with a countdown'}, description:{es:'Historia con temporizador para crear urgencia real.', ca:'Història amb temporitzador per crear urgència real.', en:'A story with a timer to create real urgency.'} },
    { title:{es:'2x1 en un cóctel o bebida concreta', ca:'2x1 en un còctel o beguda concreta', en:'2-for-1 on a specific cocktail or drink'}, description:{es:'Oferta puntual para atraer tráfico en horas valle.', ca:'Oferta puntual per atreure trànsit en hores vall.', en:'A one-off offer to attract traffic during off-peak hours.'} },
    { title:{es:'Menú del día explicado (precio y qué incluye)', ca:'Menú del dia explicat (preu i què inclou)', en:'Set menu explained (price and what\'s included)'}, description:{es:'Contenido informativo que resuelve la duda más frecuente.', ca:'Contingut informatiu que resol el dubte més freqüent.', en:'Informative content that answers the most common question.'} },
    { title:{es:'Descuento por traer a un amigo nuevo', ca:'Descompte per portar un amic nou', en:'Discount for bringing a new friend'}, description:{es:'Incentiva el boca a boca con una ventaja concreta.', ca:'Incentiva el boca a boca amb un avantatge concret.', en:'Encourages word of mouth with a concrete perk.'} },
    { title:{es:'Sorteo en redes', ca:'Sorteig a les xarxes', en:'Social media giveaway'}, description:{es:'Like + comentario + etiquetar a un amigo para ganar una cena.', ca:'Like + comentari + etiquetar un amic per guanyar un sopar.', en:'Like + comment + tag a friend to win dinner.'} },
    { title:{es:'Oferta relámpago solo en stories', ca:'Oferta llampec només a les stories', en:'Flash offer only on stories'}, description:{es:'Válida unas horas, exclusiva para quien vea las historias.', ca:'Vàlida unes hores, exclusiva per a qui vegi les històries.', en:'Valid for a few hours, exclusive to whoever sees the stories.'} },
    { title:{es:'Combo especial (entrante + bebida + postre)', ca:'Combo especial (entrant + beguda + postre)', en:'Special combo (starter + drink + dessert)'}, description:{es:'Precio cerrado atractivo para aumentar el ticket medio.', ca:'Preu tancat atractiu per augmentar el tiquet mitjà.', en:'An attractive fixed price to increase the average ticket.'} },
    { title:{es:'Descuento a estudiantes un día concreto', ca:'Descompte a estudiants un dia concret', en:'Student discount on a specific day'}, description:{es:'Fideliza a un público que vuelve varias veces por semana.', ca:'Fidelitza un públic que torna diverses vegades per setmana.', en:'Builds loyalty with an audience that comes back several times a week.'} },
    { title:{es:'"Trae tu propia taza o vaso"', ca:'"Porta la teva pròpia tassa o got"', en:'"Bring your own cup or glass"'}, description:{es:'Promoción sostenible con descuento simbólico.', ca:'Promoció sostenible amb descompte simbòlic.', en:'A sustainable promotion with a token discount.'} },
    { title:{es:'Últimas raciones antes de cerrar', ca:'Últimes racions abans de tancar', en:'Last portions before closing'}, description:{es:'Aviso en tiempo real de un plato a punto de agotarse, genera urgencia.', ca:'Avís en temps real d\'un plat a punt d\'esgotar-se, genera urgència.', en:'A real-time notice that a dish is about to run out, creates urgency.'} },
  ]},
  { cat: {es:'Historia y valores', ca:'Història i valors', en:'History and values'}, icon: 'ti-book', ideas: [
    { title:{es:'Por qué el negocio se llama así', ca:'Per què el negoci es diu així', en:'Why the business is named that'}, description:{es:'El origen del nombre suele ser una historia bonita y poco contada.', ca:'L\'origen del nom sol ser una història bonica i poc explicada.', en:'The origin of the name is usually a nice story rarely told.'} },
    { title:{es:'La historia del local antes de ser tu negocio', ca:'La història del local abans de ser el teu negoci', en:'The history of the venue before it was your business'}, description:{es:'Qué había antes en ese mismo espacio.', ca:'Què hi havia abans en aquest mateix espai.', en:'What was there before in that same space.'} },
    { title:{es:'La receta familiar que sigue en la carta', ca:'La recepta familiar que continua a la carta', en:'The family recipe still on the menu'}, description:{es:'Un plato heredado de un abuelo/a o familiar, con su historia.', ca:'Un plat heretat d\'un avi/àvia o familiar, amb la seva història.', en:'A dish inherited from a grandparent or relative, with its story.'} },
    { title:{es:'Por qué eligen a estos proveedores', ca:'Per què trien aquests proveïdors', en:'Why they choose these suppliers'}, description:{es:'Kilómetro cero, calidad o relación de confianza con quien suministra.', ca:'Quilòmetre zero, qualitat o relació de confiança amb qui subministra.', en:'Local sourcing, quality or a trusted relationship with the supplier.'} },
    { title:{es:'Los valores del negocio', ca:'Els valors del negoci', en:'The business\'s values'}, description:{es:'Sostenibilidad, producto local, trato humano... explicados con ejemplos reales.', ca:'Sostenibilitat, producte local, tracte humà... explicats amb exemples reals.', en:'Sustainability, local produce, personal service... explained with real examples.'} },
    { title:{es:'Cómo ha evolucionado la carta con los años', ca:'Com ha evolucionat la carta amb els anys', en:'How the menu has evolved over the years'}, description:{es:'Comparativa de la primera carta con la actual.', ca:'Comparativa de la primera carta amb l\'actual.', en:'A comparison of the first menu with the current one.'} },
    { title:{es:'El objeto con historia del local', ca:'L\'objecte amb història del local', en:'The venue\'s object with a story'}, description:{es:'Un cuadro, una silla o una foto antigua con una anécdota detrás.', ca:'Un quadre, una cadira o una foto antiga amb una anècdota al darrere.', en:'A painting, a chair or an old photo with a story behind it.'} },
    { title:{es:'La primera noche de apertura', ca:'La primera nit d\'obertura', en:'The first opening night'}, description:{es:'Recuerdos y fotos de cuando todo empezó.', ca:'Records i fotos de quan tot va començar.', en:'Memories and photos of when it all started.'} },
    { title:{es:'Premios o certificaciones conseguidas', ca:'Premis o certificacions aconseguides', en:'Awards or certifications earned'}, description:{es:'Reconocimientos que dan confianza a quien no os conoce.', ca:'Reconeixements que donen confiança a qui no us coneix.', en:'Recognitions that build trust with people who don\'t know you yet.'} },
    { title:{es:'El "por qué" de una sección de la carta', ca:'El "per què" d\'una secció de la carta', en:'The "why" behind a section of the menu'}, description:{es:'Qué inspiró a crear ese apartado concreto del menú.', ca:'Què va inspirar a crear aquest apartat concret del menú.', en:'What inspired the creation of that specific menu section.'} },
  ]},
  { cat: {es:'Formatos de tendencia', ca:'Formats de tendència', en:'Trending formats'}, icon: 'ti-trending-up', ideas: [
    { title:{es:'Audio de moda aplicado a un plato o bebida', ca:'Àudio de moda aplicat a un plat o beguda', en:'Trending audio applied to a dish or drink'}, description:{es:'Usa la canción/sonido viral del momento con vuestro producto.', ca:'Fes servir la cançó/so viral del moment amb el vostre producte.', en:'Use the viral song/sound of the moment with your product.'} },
    { title:{es:'"POV: eres camarero/a un viernes noche"', ca:'"POV: ets cambrer/a un divendres a la nit"', en:'"POV: you\'re a waiter/waitress on a Friday night"'}, description:{es:'Formato POV muy popular, con humor y ritmo rápido.', ca:'Format POV molt popular, amb humor i ritme ràpid.', en:'A very popular POV format, with humour and fast pacing.'} },
    { title:{es:'Reto de comida picante o de ración gigante', ca:'Repte de menjar picant o de ració gegant', en:'Spicy food or giant portion challenge'}, description:{es:'Challenge grabado con reacciones exageradas.', ca:'Challenge gravat amb reaccions exagerades.', en:'A filmed challenge with over-the-top reactions.'} },
    { title:{es:'Transición "antes de cocinar" → "plato listo"', ca:'Transició "abans de cuinar" → "plat llest"', en:'Transition "before cooking" → "dish ready"'}, description:{es:'Corte seco muy usado en TikTok/Reels, muy efectivo.', ca:'Tall sec molt usat a TikTok/Reels, molt efectiu.', en:'A hard cut widely used on TikTok/Reels, very effective.'} },
    { title:{es:'El equipo puntúa sus propios platos', ca:'L\'equip puntua els seus propis plats', en:'The team rates their own dishes'}, description:{es:'Formato "rating" del 1 al 10 con opiniones sinceras.', ca:'Format "rating" de l\'1 al 10 amb opinions sinceres.', en:'A 1-to-10 "rating" format with honest opinions.'} },
    { title:{es:'Responder a un comentario con humor', ca:'Respondre a un comentari amb humor', en:'Reply to a comment with humour'}, description:{es:'Convierte un comentario gracioso en un vídeo de respuesta.', ca:'Converteix un comentari divertit en un vídeo de resposta.', en:'Turn a funny comment into a video reply.'} },
    { title:{es:'"Get Ready With Me" del local antes de abrir', ca:'"Get Ready With Me" del local abans d\'obrir', en:'"Get Ready With Me" of the venue before opening'}, description:{es:'Formato GRWM aplicado a preparar la sala/barra.', ca:'Format GRWM aplicat a preparar la sala/barra.', en:'The GRWM format applied to getting the dining room/bar ready.'} },
    { title:{es:'Unboxing de un producto o proveedor nuevo', ca:'Unboxing d\'un producte o proveïdor nou', en:'Unboxing a new product or supplier delivery'}, description:{es:'Reacción genuina al probar algo que acaba de llegar.', ca:'Reacció genuïna en tastar alguna cosa que acaba d\'arribar.', en:'A genuine reaction to trying something that just arrived.'} },
    { title:{es:'"Cosas que solo entienden en hostelería"', ca:'"Coses que només entenen en hostaleria"', en:'"Things only hospitality people understand"'}, description:{es:'Formato relatable que genera muchos comentarios e identificación.', ca:'Format relatable que genera molts comentaris i identificació.', en:'A relatable format that sparks lots of comments and recognition.'} },
    { title:{es:'Reacciona a una reseña de una estrella', ca:'Reacciona a una ressenya d\'una estrella', en:'React to a one-star review'}, description:{es:'Con humor y sin faltar al respeto, suele generar mucho engagement.', ca:'Amb humor i sense faltar al respecte, sol generar molt engagement.', en:'With humour and respect, this usually drives a lot of engagement.'} },
  ]},
  { cat: {es:'Educativo / tips', ca:'Educatiu / consells', en:'Educational / tips'}, icon: 'ti-school', ideas: [
    { title:{es:'Cómo maridar vino con quesos o platos', ca:'Com maridar vi amb formatges o plats', en:'How to pair wine with cheeses or dishes'}, description:{es:'Consejos prácticos y sencillos de aplicar en casa.', ca:'Consells pràctics i senzills d\'aplicar a casa.', en:'Practical tips that are easy to apply at home.'} },
    { title:{es:'Cómo se cata un vino correctamente', ca:'Com es tasta un vi correctament', en:'How to properly taste a wine'}, description:{es:'Vista, nariz y boca explicados en menos de un minuto.', ca:'Vista, nas i boca explicats en menys d\'un minut.', en:'Sight, nose and palate explained in under a minute.'} },
    { title:{es:'Diferencias entre tipos de café', ca:'Diferències entre tipus de cafè', en:'Differences between types of coffee'}, description:{es:'Espresso, cortado, americano... explicado con la máquina en mano.', ca:'Espresso, tallat, americà... explicat amb la màquina a la mà.', en:'Espresso, cortado, americano... explained with the machine in hand.'} },
    { title:{es:'Cómo pedir tapas como un local', ca:'Com demanar tapes com un local', en:'How to order tapas like a local'}, description:{es:'Tips pensados también para turistas, muy compartible.', ca:'Consells pensats també per a turistes, molt compartible.', en:'Tips aimed also at tourists, very shareable.'} },
    { title:{es:'Cómo gestionan los alérgenos en el local', ca:'Com gestionen els al·lergens al local', en:'How allergens are managed on-site'}, description:{es:'Transmite confianza y seguridad alimentaria.', ca:'Transmet confiança i seguretat alimentària.', en:'Builds trust and shows food safety in practice.'} },
    { title:{es:'Trucos para conservar sobras en casa', ca:'Trucs per conservar les sobres a casa', en:'Tricks for storing leftovers at home'}, description:{es:'Contenido de valor que no vende directamente pero genera marca.', ca:'Contingut de valor que no ven directament però genera marca.', en:'Valuable content that doesn\'t sell directly but builds the brand.'} },
    { title:{es:'Qué copa usar para cada bebida', ca:'Quina copa fer servir per a cada beguda', en:'Which glass to use for each drink'}, description:{es:'Guía rápida y visual, muy guardable/compartible.', ca:'Guia ràpida i visual, molt guardable/compartible.', en:'A quick, visual guide, easy to save and share.'} },
    { title:{es:'Qué significan los términos de la carta', ca:'Què signifiquen els termes de la carta', en:'What the menu terms mean'}, description:{es:'"Al punto", "poco hecho", "reducción"... explicado sencillo.', ca:'"Al punt", "poc fet", "reducció"... explicat de manera senzilla.', en:'"Medium", "rare", "reduction"... explained simply.'} },
    { title:{es:'El origen de un plato típico de la zona', ca:'L\'origen d\'un plat típic de la zona', en:'The origin of a local dish'}, description:{es:'Curiosidad histórica o cultural sobre un plato de la carta.', ca:'Curiositat històrica o cultural sobre un plat de la carta.', en:'A historical or cultural fun fact about a dish on the menu.'} },
    { title:{es:'Producto fresco vs. congelado: cómo distinguirlos', ca:'Producte fresc vs. congelat: com distingir-los', en:'Fresh vs. frozen product: how to tell them apart'}, description:{es:'Consejo útil que además pone en valor vuestro producto fresco.', ca:'Consell útil que a més posa en valor el vostre producte fresc.', en:'A useful tip that also highlights your fresh produce.'} },
  ]},
  { cat: {es:'Barra y coctelería', ca:'Barra i coctelería', en:'Bar and mixology'}, icon: 'ti-glass-cocktail', ideas: [
    { title:{es:'Flair o técnica de coctelería en directo', ca:'Flair o tècnica de coctelería en directe', en:'Flair or mixology technique live'}, description:{es:'Espectáculo visual detrás de la barra, muy compartible.', ca:'Espectacle visual darrere la barra, molt compartible.', en:'A visual show behind the bar, very shareable.'} },
    { title:{es:'Mocktail de la casa (sin alcohol)', ca:'Mocktail de la casa (sense alcohol)', en:'House mocktail (alcohol-free)'}, description:{es:'Cada vez más demandado, buen contenido inclusivo.', ca:'Cada cop més demandat, bon contingut inclusiu.', en:'Increasingly in demand, great inclusive content.'} },
    { title:{es:'La historia de un cóctel clásico', ca:'La història d\'un còctel clàssic', en:'The story of a classic cocktail'}, description:{es:'Origen y anécdota de un cóctel icónico de la carta.', ca:'Origen i anècdota d\'un còctel icònic de la carta.', en:'The origin and story of an iconic cocktail on the menu.'} },
    { title:{es:'Tutorial de decoración de copa (garnish)', ca:'Tutorial de decoració de copa (garnish)', en:'Glass garnish tutorial'}, description:{es:'Paso a paso de cómo se monta la guarnición de un cóctel.', ca:'Pas a pas de com es munta la guarnició d\'un còctel.', en:'A step-by-step of how a cocktail garnish is put together.'} },
    { title:{es:'Cata de cervezas artesanas de la casa', ca:'Tast de cerveses artesanes de la casa', en:'House craft beer tasting'}, description:{es:'Presenta variedades poco conocidas de la carta de cervezas.', ca:'Presenta varietats poc conegudes de la carta de cerveses.', en:'Presents lesser-known varieties from the beer menu.'} },
    { title:{es:'Maridaje de cócteles con tapas', ca:'Maridatge de còctels amb tapes', en:'Pairing cocktails with tapas'}, description:{es:'Recomendaciones cruzadas entre barra y cocina.', ca:'Recomanacions creuades entre barra i cuina.', en:'Cross-recommendations between the bar and the kitchen.'} },
    { title:{es:'El tiro perfecto de cerveza', ca:'El tir perfecte de cervesa', en:'The perfect pour of beer'}, description:{es:'Ritual de servido correcto, con espuma y temperatura ideal.', ca:'Ritual de servei correcte, amb escuma i temperatura ideal.', en:'The correct pouring ritual, with ideal foam and temperature.'} },
    { title:{es:'Cóctel de temporada con fruta de mercado', ca:'Còctel de temporada amb fruita de mercat', en:'Seasonal cocktail with market fruit'}, description:{es:'Aprovecha producto de temporada también en la barra.', ca:'Aprofita producte de temporada també a la barra.', en:'Makes the most of seasonal produce at the bar too.'} },
    { title:{es:'Cóctel clásico con un twist propio de la casa', ca:'Còctel clàssic amb un twist propi de la casa', en:'A classic cocktail with the house\'s own twist'}, description:{es:'Vuestra versión personal de un cóctel de toda la vida.', ca:'La vostra versió personal d\'un còctel de tota la vida.', en:'Your own personal take on a classic cocktail.'} },
    { title:{es:'Cata a ciegas del propio equipo', ca:'Tast a cegues del mateix equip', en:'Blind tasting by the team itself'}, description:{es:'El equipo prueba cócteles sin ver la etiqueta y adivina cuál es cuál.', ca:'L\'equip tasta còctels sense veure l\'etiqueta i endevina quin és quin.', en:'The team tries cocktails without seeing the label and guesses which is which.'} },
  ]},
  { cat: {es:'Eventos y experiencias', ca:'Esdeveniments i experiències', en:'Events and experiences'}, icon: 'ti-confetti', ideas: [
    { title:{es:'Música en directo o DJ en el local', ca:'Música en directe o DJ al local', en:'Live music or a DJ at the venue'}, description:{es:'Anuncio con adelanto del ambiente que se van a encontrar.', ca:'Anunci amb avançament de l\'ambient que es trobaran.', en:'A teaser announcement of the atmosphere guests will find.'} },
    { title:{es:'Cata maridaje con el chef', ca:'Tast maridatge amb el xef', en:'Pairing tasting with the chef'}, description:{es:'Evento especial de pago, ideal para promocionar con antelación.', ca:'Esdeveniment especial de pagament, ideal per promocionar amb antelació.', en:'A special ticketed event, ideal to promote well in advance.'} },
    { title:{es:'Clase de coctelería para clientes', ca:'Classe de coctelería per a clients', en:'Mixology class for customers'}, description:{es:'Experiencia diferencial que genera contenido y ventas extra.', ca:'Experiència diferencial que genera contingut i vendes extra.', en:'A distinctive experience that generates content and extra sales.'} },
    { title:{es:'Retransmisión de un partido o evento deportivo', ca:'Retransmissió d\'un partit o esdeveniment esportiu', en:'Broadcasting a match or sporting event'}, description:{es:'Aviso de ambiente y promoción específica para la ocasión.', ca:'Avís d\'ambient i promoció específica per a l\'ocasió.', en:'An atmosphere notice and specific promotion for the occasion.'} },
    { title:{es:'Noche temática (italiana, mexicana...)', ca:'Nit temàtica (italiana, mexicana...)', en:'Themed night (Italian, Mexican...)'}, description:{es:'Menú y ambientación especial durante una noche concreta.', ca:'Menú i ambientació especial durant una nit concreta.', en:'A special menu and decor for one specific night.'} },
    { title:{es:'Evento privado o de empresa en el local', ca:'Esdeveniment privat o d\'empresa al local', en:'Private or corporate event at the venue'}, description:{es:'Muestra las instalaciones para captar futuras reservas de grupo.', ca:'Mostra les instal·lacions per captar futures reserves de grup.', en:'Shows off the venue to attract future group bookings.'} },
    { title:{es:'Colaboración con otro negocio local', ca:'Col·laboració amb un altre negoci local', en:'Collaboration with another local business'}, description:{es:'Foodtruck, bodega o productor invitado un día concreto.', ca:'Foodtruck, celler o productor convidat un dia concret.', en:'A guest food truck, winery or producer for one specific day.'} },
    { title:{es:'Mercadillo o feria gastronómica', ca:'Mercadet o fira gastronòmica', en:'Market or food fair'}, description:{es:'Participación del negocio fuera de sus paredes habituales.', ca:'Participació del negoci fora de les seves parets habituals.', en:'The business taking part outside its usual walls.'} },
    { title:{es:'Recap del evento del fin de semana', ca:'Recapitulació de l\'esdeveniment del cap de setmana', en:'Recap of the weekend event'}, description:{es:'Mejores momentos montados en un vídeo corto al día siguiente.', ca:'Millors moments muntats en un vídeo curt l\'endemà.', en:'Best moments edited into a short video the next day.'} },
    { title:{es:'Montaje del escenario o equipo de sonido', ca:'Muntatge de l\'escenari o l\'equip de so', en:'Setting up the stage or sound equipment'}, description:{es:'Detrás de cámaras preparando un evento en directo.', ca:'Darrere les càmeres preparant un esdeveniment en directe.', en:'Behind the scenes preparing a live event.'} },
  ]},
  { cat: {es:'Sostenibilidad y proveedores', ca:'Sostenibilitat i proveïdors', en:'Sustainability and suppliers'}, icon: 'ti-leaf', ideas: [
    { title:{es:'Visita al proveedor o productor local', ca:'Visita al proveïdor o productor local', en:'Visit to the local supplier or producer'}, description:{es:'Muestra de dónde viene realmente el producto que sirven.', ca:'Mostra d\'on ve realment el producte que serveixen.', en:'Shows where the product they serve really comes from.'} },
    { title:{es:'Cómo reducen el desperdicio alimentario', ca:'Com redueixen el malbaratament alimentari', en:'How they reduce food waste'}, description:{es:'Prácticas reales de aprovechamiento, genera buena imagen.', ca:'Pràctiques reals d\'aprofitament, genera bona imatge.', en:'Real practices to make the most of ingredients, builds a good image.'} },
    { title:{es:'Producto de temporada explicado', ca:'Producte de temporada explicat', en:'Seasonal product explained'}, description:{es:'Por qué ahora sí está en carta y en otra época del año no.', ca:'Per què ara sí que és a la carta i en una altra època de l\'any no.', en:'Why it\'s on the menu now, but not at other times of the year.'} },
    { title:{es:'Reciclaje o compostaje en el local', ca:'Reciclatge o compostatge al local', en:'Recycling or composting on-site'}, description:{es:'Detalle sostenible que valoran cada vez más los clientes.', ca:'Detall sostenible que valoren cada cop més els clients.', en:'A sustainable touch that customers increasingly value.'} },
    { title:{es:'Packaging sostenible para delivery', ca:'Packaging sostenible per a delivery', en:'Sustainable packaging for delivery'}, description:{es:'Envases reciclables o reutilizables usados en los pedidos para llevar.', ca:'Envasos reciclables o reutilitzables usats en les comandes per emportar.', en:'Recyclable or reusable containers used for takeaway orders.'} },
    { title:{es:'Colaboración con productores de la zona', ca:'Col·laboració amb productors de la zona', en:'Collaboration with local producers'}, description:{es:'Queso, vino, embutido... con nombre y cara del productor.', ca:'Formatge, vi, embotit... amb nom i cara del productor.', en:'Cheese, wine, cured meats... with the producer\'s name and face.'} },
    { title:{es:'Menú de aprovechamiento', ca:'Menú d\'aprofitament', en:'Zero-waste menu'}, description:{es:'Un plato hecho con excedente del día anterior, explicando la filosofía anti-desperdicio.', ca:'Un plat fet amb l\'excedent del dia anterior, explicant la filosofia antimalbaratament.', en:'A dish made from the previous day\'s surplus, explaining the anti-waste philosophy.'} },
    { title:{es:'Reducción de plástico de un solo uso en barra', ca:'Reducció de plàstic d\'un sol ús a la barra', en:'Reducing single-use plastic at the bar'}, description:{es:'Pajitas, agitadores o vasos reutilizables como gesto sostenible.', ca:'Palletes, agitadors o gots reutilitzables com a gest sostenible.', en:'Reusable straws, stirrers or cups as a sustainable gesture.'} },
  ]},
  { cat: {es:'Humor y entretenimiento', ca:'Humor i entreteniment', en:'Humour and entertainment'}, icon: 'ti-mood-smile', ideas: [
    { title:{es:'Sketch cómico sobre un cliché de hostelería', ca:'Sketch còmic sobre un clixé d\'hostaleria', en:'A comedy sketch about a hospitality cliché'}, description:{es:'Situaciones exageradas que todo el mundo reconoce.', ca:'Situacions exagerades que tothom reconeix.', en:'Exaggerated situations everyone recognizes.'} },
    { title:{es:'"Cosas que nunca le digas a un camarero"', ca:'"Coses que mai li diguis a un cambrer"', en:'"Things you should never say to a waiter"'}, description:{es:'Lista humorística basada en situaciones reales del servicio.', ca:'Llista humorística basada en situacions reals del servei.', en:'A humorous list based on real service situations.'} },
    { title:{es:'Blooper o momento gracioso del servicio', ca:'Blooper o moment divertit del servei', en:'A blooper or funny moment during service'}, description:{es:'Con permiso de los implicados, un fallo divertido y sin mala imagen.', ca:'Amb permís dels implicats, un error divertit i sense mala imatge.', en:'With permission from those involved, a funny slip-up with no bad image.'} },
    { title:{es:'Meme propio sobre un plato o el día a día', ca:'Meme propi sobre un plat o el dia a dia', en:'A homemade meme about a dish or everyday life'}, description:{es:'Contenido ligero que humaniza la marca y genera comentarios.', ca:'Contingut lleuger que humanitza la marca i genera comentaris.', en:'Light content that humanizes the brand and sparks comments.'} },
    { title:{es:'Canción o rap improvisado sobre el menú', ca:'Cançó o rap improvisat sobre el menú', en:'An improvised song or rap about the menu'}, description:{es:'Formato divertido y muy compartible si sale bien.', ca:'Format divertit i molt compartible si surt bé.', en:'A fun, highly shareable format if it goes well.'} },
    { title:{es:'El cliente indeciso', ca:'El client indecís', en:'The indecisive customer'}, description:{es:'Sketch sobre esa persona que tarda diez minutos en elegir plato.', ca:'Sketch sobre aquella persona que triga deu minuts a triar plat.', en:'A sketch about that person who takes ten minutes to choose a dish.'} },
    { title:{es:'"Sin gluten, pero ponme pan"', ca:'"Sense gluten, però posa\'m pa"', en:'"Gluten-free, but give me bread"'}, description:{es:'Situaciones contradictorias reales del servicio, contadas con cariño.', ca:'Situacions contradictòries reals del servei, explicades amb estima.', en:'Real contradictory situations from service, told with affection.'} },
    { title:{es:'Traducciones graciosas de la carta', ca:'Traduccions divertides de la carta', en:'Funny menu translations'}, description:{es:'Errores de traducción reales (o inventados) de un menú a otro idioma.', ca:'Errors de traducció reals (o inventats) d\'un menú a un altre idioma.', en:'Real (or made-up) translation errors of a menu into another language.'} },
  ]},
  { cat: {es:'Delivery y para llevar', ca:'Delivery i per emportar', en:'Delivery and takeaway'}, icon: 'ti-package', ideas: [
    { title:{es:'Cómo llega tu pedido: el packaging por dentro', ca:'Com arriba la teva comanda: el packaging per dins', en:'How your order arrives: the packaging from the inside'}, description:{es:'Muestra el cuidado con el que preparáis cada pedido a domicilio.', ca:'Mostra la cura amb què preparau cada comanda a domicili.', en:'Shows the care put into preparing every home delivery order.'} },
    { title:{es:'Qué platos viajan mejor a domicilio', ca:'Quins plats viatgen millor a domicili', en:'Which dishes travel best for delivery'}, description:{es:'Recomendaciones para acertar al pedir para llevar.', ca:'Recomanacions per encertar en demanar per emportar.', en:'Recommendations for getting your takeaway order right.'} },
    { title:{es:'Cómo recalentar en casa sin perder calidad', ca:'Com reescalfar a casa sense perdre qualitat', en:'How to reheat at home without losing quality'}, description:{es:'Tips prácticos que mejoran la experiencia post-compra.', ca:'Consells pràctics que milloren l\'experiència posterior a la compra.', en:'Practical tips that improve the post-purchase experience.'} },
    { title:{es:'Oferta especial solo para pedidos por delivery', ca:'Oferta especial només per a comandes per delivery', en:'Special offer only for delivery orders'}, description:{es:'Incentiva el canal de reparto en horas valle.', ca:'Incentiva el canal de repartiment en hores vall.', en:'Encourages the delivery channel during off-peak hours.'} },
    { title:{es:'Mismo plato en sala vs. en el envase de reparto', ca:'Mateix plat a sala vs. a l\'envàs de repartiment', en:'Same dish in the dining room vs. in the delivery container'}, description:{es:'Comparativa honesta que genera confianza.', ca:'Comparativa honesta que genera confiança.', en:'An honest comparison that builds trust.'} },
    { title:{es:'El repartidor recogiendo el pedido', ca:'El repartidor recollint la comanda', en:'The delivery rider picking up the order'}, description:{es:'Colaboración con la app de delivery, cercano y transparente.', ca:'Col·laboració amb l\'app de delivery, proper i transparent.', en:'Collaboration with the delivery app, close and transparent.'} },
    { title:{es:'Reseña de un cliente de delivery', ca:'Ressenya d\'un client de delivery', en:'Review from a delivery customer'}, description:{es:'Testimonio leído en directo sobre un pedido a domicilio.', ca:'Testimoni llegit en directe sobre una comanda a domicili.', en:'A live-read testimonial about a home delivery order.'} },
    { title:{es:'Plato exclusivo para la carta de delivery', ca:'Plat exclusiu per a la carta de delivery', en:'Exclusive dish for the delivery menu'}, description:{es:'Algo pensado específicamente para llevar, no solo para sala.', ca:'Alguna cosa pensada específicament per emportar, no només per a sala.', en:'Something designed specifically for takeaway, not just the dining room.'} },
    { title:{es:'Pedir por WhatsApp o web y ahorrar comisión', ca:'Demanar per WhatsApp o web i estalviar comissió', en:'Order via WhatsApp or the website and save on commission'}, description:{es:'Explica la alternativa directa a las apps de reparto.', ca:'Explica l\'alternativa directa a les apps de repartiment.', en:'Explains the direct alternative to delivery apps.'} },
    { title:{es:'Un pedido grande para oficina o evento', ca:'Una comanda gran per a oficina o esdeveniment', en:'A large order for an office or event'}, description:{es:'Detrás de cámaras preparando un pedido corporativo grande.', ca:'Darrere les càmeres preparant una comanda corporativa gran.', en:'Behind the scenes preparing a large corporate order.'} },
  ]},
  { cat: {es:'Reservas y disponibilidad', ca:'Reserves i disponibilitat', en:'Bookings and availability'}, icon: 'ti-calendar-check', ideas: [
    { title:{es:'Quedan pocas mesas para esta noche', ca:'Queden poques taules per a aquesta nit', en:'Few tables left for tonight'}, description:{es:'Aviso puntual que genera urgencia real (solo si es cierto).', ca:'Avís puntual que genera urgència real (només si és cert).', en:'A one-off notice that creates real urgency (only if it\'s true).'} },
    { title:{es:'Cómo reservar en 30 segundos', ca:'Com reservar en 30 segons', en:'How to book in 30 seconds'}, description:{es:'Tutorial rápido del proceso de reserva (web, teléfono, redes).', ca:'Tutorial ràpid del procés de reserva (web, telèfon, xarxes).', en:'A quick tutorial of the booking process (website, phone, social media).'} },
    { title:{es:'Ventajas de reservar frente a venir sin avisar', ca:'Avantatges de reservar enfront de venir sense avisar', en:'Benefits of booking vs. walking in without notice'}, description:{es:'Explica por qué conviene asegurar mesa en días de mucha gente.', ca:'Explica per què convé assegurar taula en dies de molta gent.', en:'Explains why it\'s worth securing a table on busy days.'} },
    { title:{es:'Mesa libre de última hora por cancelación', ca:'Taula lliure d\'última hora per cancel·lació', en:'Last-minute free table due to a cancellation'}, description:{es:'Aprovecha una baja para llenar el hueco al momento.', ca:'Aprofita una baixa per omplir el buit a l\'instant.', en:'Uses a cancellation to fill the slot right away.'} },
    { title:{es:'Recuerda que se puede reservar terraza', ca:'Recorda que es pot reservar terrassa', en:'Reminder: the terrace can be booked too'}, description:{es:'Muchos clientes no saben que existe esa opción concreta.', ca:'Molts clients no saben que existeix aquesta opció concreta.', en:'Many customers don\'t know that specific option exists.'} },
    { title:{es:'Esta semana casi completo, no te quedes sin sitio', ca:'Aquesta setmana gairebé complet, no et quedis sense lloc', en:'Almost fully booked this week, don\'t miss out'}, description:{es:'Aviso de ocupación alta para animar a reservar con tiempo.', ca:'Avís d\'ocupació alta per animar a reservar amb temps.', en:'A high-occupancy notice to encourage booking ahead.'} },
    { title:{es:'Cómo modificar o cancelar tu reserva', ca:'Com modificar o cancel·lar la teva reserva', en:'How to change or cancel your booking'}, description:{es:'Tutorial breve que reduce llamadas y confusiones.', ca:'Tutorial breu que redueix trucades i confusions.', en:'A brief tutorial that reduces calls and confusion.'} },
    { title:{es:'Aforo limitado para una fecha señalada', ca:'Aforament limitat per a una data assenyalada', en:'Limited capacity for a special date'}, description:{es:'Nochevieja, San Valentín... aviso de plazas limitadas.', ca:'Cap d\'Any, Sant Valentí... avís de places limitades.', en:'New Year\'s Eve, Valentine\'s Day... a limited-spots notice.'} },
    { title:{es:'Reservas para grupos grandes: qué necesitáis saber', ca:'Reserves per a grups grans: què necessiteu saber', en:'Bookings for large groups: what you need to know'}, description:{es:'Condiciones, anticipación y menú cerrado para grupos.', ca:'Condicions, antelació i menú tancat per a grups.', en:'Conditions, advance notice and set menus for groups.'} },
    { title:{es:'Apúntate a la lista de espera', ca:'Apunta\'t a la llista d\'espera', en:'Join the waiting list'}, description:{es:'Explica que merece la pena esperar aunque parezca completo.', ca:'Explica que val la pena esperar encara que sembli complet.', en:'Explains it\'s worth waiting even if it looks fully booked.'} },
  ]},
  { cat: {es:'Salud, dietas y opciones especiales', ca:'Salut, dietes i opcions especials', en:'Health, diets and special options'}, icon: 'ti-apple', ideas: [
    { title:{es:'Opciones veganas o vegetarianas de la carta', ca:'Opcions veganes o vegetarianes de la carta', en:'Vegan or vegetarian options on the menu'}, description:{es:'Recorrido por los platos aptos, con foto de cada uno.', ca:'Recorregut pels plats aptes, amb foto de cadascun.', en:'A tour of the suitable dishes, with a photo of each one.'} },
    { title:{es:'Platos sin gluten y cómo evitáis la contaminación cruzada', ca:'Plats sense gluten i com eviteu la contaminació creuada', en:'Gluten-free dishes and how you avoid cross-contamination'}, description:{es:'Genera confianza real en clientes celíacos.', ca:'Genera confiança real en clients celíacs.', en:'Builds real trust with coeliac customers.'} },
    { title:{es:'Opciones más ligeras o bajas en calorías', ca:'Opcions més lleugeres o baixes en calories', en:'Lighter or lower-calorie options'}, description:{es:'Útil para quien busca comer fuera cuidándose.', ca:'Útil per a qui busca menjar fora cuidant-se.', en:'Useful for those wanting to eat out while watching what they eat.'} },
    { title:{es:'Menú keto o bajo en carbohidratos', ca:'Menú keto o baix en carbohidrats', en:'Keto or low-carb menu'}, description:{es:'Si el negocio lo ofrece, un nicho con demanda creciente.', ca:'Si el negoci ho ofereix, un nínxol amb demanda creixent.', en:'If the business offers it, a niche with growing demand.'} },
    { title:{es:'Cómo adaptáis un plato ante una intolerancia', ca:'Com adapteu un plat davant d\'una intolerància', en:'How you adapt a dish for an intolerance'}, description:{es:'Muestra flexibilidad real del equipo de cocina.', ca:'Mostra flexibilitat real de l\'equip de cuina.', en:'Shows the kitchen team\'s real flexibility.'} },
    { title:{es:'Beneficios nutricionales de un ingrediente estrella', ca:'Beneficis nutricionals d\'un ingredient estrella', en:'Nutritional benefits of a star ingredient'}, description:{es:'Contenido educativo ligado directamente a vuestra carta.', ca:'Contingut educatiu lligat directament a la vostra carta.', en:'Educational content directly tied to your menu.'} },
    { title:{es:'Opciones bajas en azúcar para diabéticos', ca:'Opcions baixes en sucre per a diabètics', en:'Low-sugar options for diabetics'}, description:{es:'Nicho poco cubierto por la competencia, gran valor percibido.', ca:'Nínxol poc cobert per la competència, gran valor percebut.', en:'A niche barely covered by competitors, high perceived value.'} },
    { title:{es:'Menú infantil saludable', ca:'Menú infantil saludable', en:'Healthy kids\' menu'}, description:{es:'Tranquiliza a familias que buscan algo más que fritos para niños.', ca:'Tranquil·litza famílies que busquen alguna cosa més que fregits per als nens.', en:'Reassures families looking for more than fried food for kids.'} },
    { title:{es:'Ingredientes ecológicos o de cultivo propio', ca:'Ingredients ecològics o de cultiu propi', en:'Organic or own-grown ingredients'}, description:{es:'Si tenéis huerto propio o proveedores ecológicos certificados.', ca:'Si teniu hort propi o proveïdors ecològics certificats.', en:'If you have your own garden or certified organic suppliers.'} },
    { title:{es:'Cómo equilibráis sabor y salud en un plato', ca:'Com equilibreu sabor i salut en un plat', en:'How you balance flavour and health in a dish'}, description:{es:'La reflexión del chef detrás de una receta "sana pero rica".', ca:'La reflexió del xef darrere d\'una recepta "sana però bona".', en:'The chef\'s thinking behind a "healthy but tasty" recipe.'} },
  ]},
  { cat: {es:'Comparativas y listas', ca:'Comparatives i llistes', en:'Comparisons and lists'}, icon: 'ti-list-numbers', ideas: [
    { title:{es:'Top 5 platos para probar si es tu primera vez', ca:'Top 5 plats per provar si és la teva primera vegada', en:'Top 5 dishes to try if it\'s your first visit'}, description:{es:'Guía de bienvenida para clientes nuevos.', ca:'Guia de benvinguda per a clients nous.', en:'A welcome guide for new customers.'} },
    { title:{es:'"Si te gusta X, prueba Y"', ca:'"Si t\'agrada X, prova Y"', en:'"If you like X, try Y"'}, description:{es:'Recomendaciones cruzadas basadas en gustos conocidos.', ca:'Recomanacions creuades basades en gustos coneguts.', en:'Cross-recommendations based on known tastes.'} },
    { title:{es:'Los 3 cócteles más pedidos de la temporada', ca:'Els 3 còctels més demanats de la temporada', en:'The 3 most ordered cocktails of the season'}, description:{es:'Ranking con datos reales de ventas, genera curiosidad.', ca:'Rànquing amb dades reals de vendes, genera curiositat.', en:'A ranking with real sales data, sparks curiosity.'} },
    { title:{es:'Comparativa de raciones: precio y cantidad', ca:'Comparativa de racions: preu i quantitat', en:'Portion comparison: price and quantity'}, description:{es:'Ayuda a decidir entre individual, media ración o para compartir.', ca:'Ajuda a decidir entre individual, mitja ració o per compartir.', en:'Helps decide between individual, half portion or to share.'} },
    { title:{es:'Ranking de los postres más fotografiados', ca:'Rànquing dels postres més fotografiats', en:'Ranking of the most photographed desserts'}, description:{es:'Aprovecha el atractivo visual para animar a pedirlos.', ca:'Aprofita l\'atractiu visual per animar a demanar-los.', en:'Uses the visual appeal to encourage people to order them.'} },
    { title:{es:'Cómo ha cambiado la carta este año', ca:'Com ha canviat la carta aquest any', en:'How the menu has changed this year'}, description:{es:'Comparativa de novedades frente a la carta anterior.', ca:'Comparativa de novetats enfront de la carta anterior.', en:'A comparison of new items versus the previous menu.'} },
    { title:{es:'5 razones para venir esta semana', ca:'5 raons per venir aquesta setmana', en:'5 reasons to come this week'}, description:{es:'Lista dinámica que combina novedades, eventos y promos.', ca:'Llista dinàmica que combina novetats, esdeveniments i promocions.', en:'A dynamic list combining news, events and promotions.'} },
    { title:{es:'Lo más pedido por turistas vs. por locales', ca:'El més demanat pels turistes vs. pels locals', en:'What tourists order vs. what locals order'}, description:{es:'Curiosidad que genera comentarios y comparaciones.', ca:'Curiositat que genera comentaris i comparacions.', en:'A fun fact that sparks comments and comparisons.'} },
    { title:{es:'Menú del día vs. fin de semana vs. grupos', ca:'Menú del dia vs. cap de setmana vs. grups', en:'Weekday set menu vs. weekend vs. groups'}, description:{es:'Comparativa clara de las distintas opciones disponibles.', ca:'Comparativa clara de les diferents opcions disponibles.', en:'A clear comparison of the different options available.'} },
    { title:{es:'Los platos favoritos... del propio equipo', ca:'Els plats preferits... del mateix equip', en:'The favourite dishes... of the team itself'}, description:{es:'Qué pide el personal cuando come en su día libre.', ca:'Què demana el personal quan menja en el seu dia lliure.', en:'What the staff order when they eat here on their day off.'} },
  ]},
  { cat: {es:'Por franja horaria', ca:'Per franja horària', en:'By time of day'}, icon: 'ti-clock', ideas: [
    { title:{es:'Qué pedir para desayunar rápido antes de trabajar', ca:'Què demanar per esmorzar ràpid abans de treballar', en:'What to order for a quick breakfast before work'}, description:{es:'Propuesta ágil para el desayuno de entre semana.', ca:'Proposta àgil per a l\'esmorzar entre setmana.', en:'A quick option for weekday breakfast.'} },
    { title:{es:'Brunch de fin de semana', ca:'Brunch de cap de setmana', en:'Weekend brunch'}, description:{es:'Carta especial más relajada para sábados y domingos.', ca:'Carta especial més relaxada per a dissabtes i diumenges.', en:'A more relaxed special menu for Saturdays and Sundays.'} },
    { title:{es:'Menú de mediodía para una pausa corta', ca:'Menú de migdia per a una pausa curta', en:'Midday menu for a short break'}, description:{es:'Pensado para quien tiene poco tiempo para comer.', ca:'Pensat per a qui té poc temps per menjar.', en:'Designed for those with little time to eat.'} },
    { title:{es:'La merienda perfecta con café o té de la casa', ca:'El berenar perfecte amb cafè o te de la casa', en:'The perfect afternoon snack with house coffee or tea'}, description:{es:'Propuesta dulce para la media tarde.', ca:'Proposta dolça per a mitja tarda.', en:'A sweet option for mid-afternoon.'} },
    { title:{es:'Aperitivo de media tarde-noche', ca:'Aperitiu de mitja tarda-nit', en:'Early-evening aperitif'}, description:{es:'Algo para picar antes de la cena, con bebida recomendada.', ca:'Alguna cosa per picar abans del sopar, amb beguda recomanada.', en:'Something to nibble on before dinner, with a recommended drink.'} },
    { title:{es:'Cena tranquila entre semana', ca:'Sopar tranquil entre setmana', en:'A quiet weekday dinner'}, description:{es:'Propuesta ligera para quien no quiere una cena copiosa un día laborable.', ca:'Proposta lleugera per a qui no vol un sopar copiós un dia laborable.', en:'A light option for those who don\'t want a heavy dinner on a workday.'} },
    { title:{es:'La última copa antes de cerrar', ca:'L\'última copa abans de tancar', en:'The last drink before closing'}, description:{es:'Ambiente de última hora, tranquilo y con buena música.', ca:'Ambient d\'última hora, tranquil i amb bona música.', en:'A late-night vibe, relaxed and with good music.'} },
    { title:{es:'Plan de domingo: comida larga y sobremesa', ca:'Pla de diumenge: dinar llarg i sobretaula', en:'Sunday plan: a long lunch and after-dinner chat'}, description:{es:'Propuesta pensada para quedarse charlando sin prisa.', ca:'Proposta pensada per quedar-se xerrant sense pressa.', en:'An option designed for lingering and chatting without rushing.'} },
    { title:{es:'Desayuno especial de fin de semana', ca:'Esmorzar especial de cap de setmana', en:'Special weekend breakfast'}, description:{es:'Algo más elaborado que entre semana, con más tiempo para disfrutarlo.', ca:'Alguna cosa més elaborada que entre setmana, amb més temps per gaudir-ho.', en:'Something more elaborate than on weekdays, with more time to enjoy it.'} },
    { title:{es:'Menú nocturno después de un evento cercano', ca:'Menú nocturn després d\'un esdeveniment proper', en:'Late-night menu after a nearby event'}, description:{es:'Para quien sale de un concierto o cine y busca cenar tarde.', ca:'Per a qui surt d\'un concert o cinema i busca sopar tard.', en:'For those leaving a concert or the cinema looking for a late dinner.'} },
  ]},
  { cat: {es:'Encuestas e interacción', ca:'Enquestes i interacció', en:'Polls and interaction'}, icon: 'ti-message-2', ideas: [
    { title:{es:'Encuesta en historias: ¿cuál prefieres, A o B?', ca:'Enquesta a les històries: quin prefereixes, A o B?', en:'Story poll: which do you prefer, A or B?'}, description:{es:'Formato rápido de interacción con dos opciones visuales.', ca:'Format ràpid d\'interacció amb dues opcions visuals.', en:'A quick interaction format with two visual options.'} },
    { title:{es:'Vota el próximo plato que entra en carta', ca:'Vota el proper plat que entra a la carta', en:'Vote for the next dish to join the menu'}, description:{es:'Involucra a la audiencia en una decisión real del negocio.', ca:'Involucra l\'audiència en una decisió real del negoci.', en:'Involves the audience in a real business decision.'} },
    { title:{es:'¿Qué plato quieres que traigamos de vuelta?', ca:'Quin plat vols que tornem a portar?', en:'Which dish do you want us to bring back?'}, description:{es:'Pregunta abierta que recupera nostalgia por platos antiguos.', ca:'Pregunta oberta que recupera nostàlgia per plats antics.', en:'An open question that taps into nostalgia for old dishes.'} },
    { title:{es:'Trivia gastronómica sobre vuestra cocina', ca:'Trivial gastronòmic sobre la vostra cuina', en:'Food trivia about your kitchen'}, description:{es:'Preguntas curiosas relacionadas con vuestros platos o bebidas.', ca:'Preguntes curioses relacionades amb els vostres plats o begudes.', en:'Fun questions related to your dishes or drinks.'} },
    { title:{es:'Adivina el precio de un plato', ca:'Endevina el preu d\'un plat', en:'Guess the price of a dish'}, description:{es:'Juego sencillo que genera muchos comentarios.', ca:'Joc senzill que genera molts comentaris.', en:'A simple game that generates lots of comments.'} },
    { title:{es:'Encuesta de horario: ¿abrimos los domingos?', ca:'Enquesta d\'horari: obrim els diumenges?', en:'Schedule poll: should we open on Sundays?'}, description:{es:'Decisión real del negocio consultada a la comunidad.', ca:'Decisió real del negoci consultada a la comunitat.', en:'A real business decision put to the community.'} },
    { title:{es:'Buzón de preguntas para el chef o el equipo', ca:'Bústia de preguntes per al xef o l\'equip', en:'Question box for the chef or the team'}, description:{es:'Caja de preguntas en historias, responded en un vídeo recopilatorio.', ca:'Caixa de preguntes a les històries, responeu en un vídeo recopilatori.', en:'A question box on stories, answered in a compilation video.'} },
    { title:{es:'Elige el nombre de nuestro nuevo cóctel', ca:'Tria el nom del nostre còctel nou', en:'Choose the name of our new cocktail'}, description:{es:'Dinámica colaborativa que genera pertenencia a la marca.', ca:'Dinàmica col·laborativa que genera pertinença a la marca.', en:'A collaborative activity that builds a sense of belonging to the brand.'} },
    { title:{es:'Test: ¿qué tipo de cliente eres?', ca:'Test: quin tipus de client ets?', en:'Quiz: what kind of customer are you?'}, description:{es:'Formato ligero con resultados divertidos y compartibles.', ca:'Format lleuger amb resultats divertits i compartibles.', en:'A light format with fun, shareable results.'} },
    { title:{es:'Cuenta atrás para una novedad', ca:'Compte enrere per a una novetat', en:'Countdown to something new'}, description:{es:'Genera expectativa antes de lanzar un plato, carta o evento.', ca:'Genera expectació abans de llançar un plat, carta o esdeveniment.', en:'Builds anticipation before launching a dish, menu or event.'} },
  ]},
  { cat: {es:'Días mundiales y efemérides gastronómicas', ca:'Dies mundials i efemèrides gastronòmiques', en:'World days and food-related dates'}, icon: 'ti-stars', ideas: [
    { title:{es:'Día Mundial de la Pizza (9 de febrero)', ca:'Dia Mundial de la Pizza (9 de febrer)', en:'World Pizza Day (February 9)'}, description:{es:'Si tenéis pizza en carta, promoción o receta especial ese día.', ca:'Si teniu pizza a la carta, promoció o recepta especial aquell dia.', en:'If you have pizza on the menu, a promotion or special recipe that day.'} },
    { title:{es:'Día Internacional del Café (1 de octubre)', ca:'Dia Internacional del Cafè (1 d\'octubre)', en:'International Coffee Day (October 1)'}, description:{es:'Contenido sobre vuestro café, tueste u origen.', ca:'Contingut sobre el vostre cafè, torrefacció o origen.', en:'Content about your coffee, roast or origin.'} },
    { title:{es:'Día Mundial del Vino (fecha variable, comprobar cada año)', ca:'Dia Mundial del Vi (data variable, comprovar cada any)', en:'World Wine Day (variable date, check each year)'}, description:{es:'Recomendación de maridaje o cata especial.', ca:'Recomanació de maridatge o tast especial.', en:'A pairing recommendation or special tasting.'} },
    { title:{es:'Día de la Hamburguesa (28 de mayo)', ca:'Dia de l\'Hamburguesa (28 de maig)', en:'Burger Day (May 28)'}, description:{es:'Promoción o receta destacada si tenéis hamburguesas en carta.', ca:'Promoció o recepta destacada si teniu hamburgueses a la carta.', en:'A promotion or featured recipe if you have burgers on the menu.'} },
    { title:{es:'Día Mundial de la Cerveza (primer viernes de agosto)', ca:'Dia Mundial de la Cervesa (primer divendres d\'agost)', en:'International Beer Day (first Friday of August)'}, description:{es:'Cata o promoción de vuestras cervezas de barril/artesanas.', ca:'Tast o promoció de les vostres cerveses de barril/artesanes.', en:'A tasting or promotion of your draft/craft beers.'} },
    { title:{es:'Día Mundial del Chocolate (7 de julio)', ca:'Dia Mundial de la Xocolata (7 de juliol)', en:'World Chocolate Day (July 7)'}, description:{es:'Postre especial o promoción temática de chocolate.', ca:'Postre especial o promoció temàtica de xocolata.', en:'A special dessert or chocolate-themed promotion.'} },
    { title:{es:'Día de la Tapa (fecha variable según ciudad)', ca:'Dia de la Tapa (data variable segons ciutat)', en:'Tapas Day (date varies by city)'}, description:{es:'Buen momento para destacar vuestras tapas de autor.', ca:'Bon moment per destacar les vostres tapes d\'autor.', en:'A great time to showcase your signature tapas.'} },
    { title:{es:'Día Mundial de la Gastronomía (18 de octubre)', ca:'Dia Mundial de la Gastronomia (18 d\'octubre)', en:'World Gastronomy Day (October 18)'}, description:{es:'Contenido sobre vuestra filosofía culinaria o historia.', ca:'Contingut sobre la vostra filosofia culinària o història.', en:'Content about your culinary philosophy or history.'} },
    { title:{es:'Día Mundial del Cóctel o de un cóctel concreto', ca:'Dia Mundial del Còctel o d\'un còctel concret', en:'World Cocktail Day or a specific cocktail\'s day'}, description:{es:'Muchos cócteles clásicos tienen su propio día (comprobar fecha).', ca:'Molts còctels clàssics tenen el seu propi dia (comprovar data).', en:'Many classic cocktails have their own day (check the date).'} },
    { title:{es:'Día Mundial del Sushi (18 de junio)', ca:'Dia Mundial del Sushi (18 de juny)', en:'World Sushi Day (June 18)'}, description:{es:'Si tenéis oferta de sushi o fusión asiática en carta.', ca:'Si teniu oferta de sushi o fusió asiàtica a la carta.', en:'If you have sushi or Asian fusion on the menu.'} },
    { title:{es:'Día Mundial sin Alcohol', ca:'Dia Mundial sense Alcohol', en:'World No Alcohol Day'}, description:{es:'Buen momento para promocionar vuestros mocktails y bebidas sin alcohol.', ca:'Bon moment per promocionar els vostres mocktails i begudes sense alcohol.', en:'A great time to promote your mocktails and alcohol-free drinks.'} },
    { title:{es:'Efeméride o plato típico local', ca:'Efemèride o plat típic local', en:'Local anniversary or traditional dish'}, description:{es:'Muchas regiones tienen su propio "día de..." para un plato tradicional; aprovechadlo si aplica.', ca:'Moltes regions tenen el seu propi "dia de..." per a un plat tradicional; aprofiteu-lo si s\'escau.', en:'Many regions have their own "day of..." for a traditional dish; take advantage of it if it applies.'} },
  ]},
  { cat: {es:'Grupos, celebraciones y eventos privados', ca:'Grups, celebracions i esdeveniments privats', en:'Groups, celebrations and private events'}, icon: 'ti-users-group', ideas: [
    { title:{es:'Menú especial para cumpleaños en grupo', ca:'Menú especial per a aniversaris en grup', en:'Special menu for group birthdays'}, description:{es:'Propuesta cerrada pensada para celebraciones.', ca:'Proposta tancada pensada per a celebracions.', en:'A fixed offer designed for celebrations.'} },
    { title:{es:'Paquete para despedidas de soltero/a', ca:'Paquet per a comiats de solter/a', en:'Package for stag/hen parties'}, description:{es:'Menú, ambientación o detalle especial para el grupo.', ca:'Menú, ambientació o detall especial per al grup.', en:'A menu, decor or special touch for the group.'} },
    { title:{es:'Menú de comunión o celebración familiar', ca:'Menú de comunió o celebració familiar', en:'Communion or family celebration menu'}, description:{es:'Propuesta específica para este tipo de eventos.', ca:'Proposta específica per a aquest tipus d\'esdeveniments.', en:'A specific offer for this kind of event.'} },
    { title:{es:'Cómo organizar una cena de empresa', ca:'Com organitzar un sopar d\'empresa', en:'How to organize a corporate dinner'}, description:{es:'Explica el proceso, precios y opciones disponibles.', ca:'Explica el procés, preus i opcions disponibles.', en:'Explains the process, prices and available options.'} },
    { title:{es:'Detalle de bienvenida para grupos grandes', ca:'Detall de benvinguda per a grups grans', en:'Welcome touch for large groups'}, description:{es:'Un pequeño gesto que marca la diferencia en la experiencia.', ca:'Un petit gest que marca la diferència en l\'experiència.', en:'A small gesture that makes all the difference in the experience.'} },
    { title:{es:'Menú de Navidad para grupos y empresas', ca:'Menú de Nadal per a grups i empreses', en:'Christmas menu for groups and companies'}, description:{es:'Promoción con antelación suficiente para reservar diciembre.', ca:'Promoció amb prou antelació per reservar desembre.', en:'A promotion with enough advance notice to book December.'} },
    { title:{es:'Tarta o postre personalizado para ocasiones especiales', ca:'Pastís o postre personalitzat per a ocasions especials', en:'Custom cake or dessert for special occasions'}, description:{es:'Servicio añadido que puede generar ingresos extra.', ca:'Servei afegit que pot generar ingressos extra.', en:'An add-on service that can generate extra revenue.'} },
    { title:{es:'Espacio privado o reservado disponible', ca:'Espai privat o reservat disponible', en:'Private or reserved space available'}, description:{es:'Muestra la sala o reservado para eventos exclusivos.', ca:'Mostra la sala o reservat per a esdeveniments exclusius.', en:'Shows off the private room for exclusive events.'} },
    { title:{es:'Decoración de una mesa para un cumpleaños sorpresa', ca:'Decoració d\'una taula per a un aniversari sorpresa', en:'Table decoration for a surprise birthday'}, description:{es:'Detrás de cámaras montando una sorpresa para un cliente.', ca:'Darrere les càmeres muntant una sorpresa per a un client.', en:'Behind the scenes setting up a surprise for a customer.'} },
    { title:{es:'Detalle especial para el homenajeado del grupo', ca:'Detall especial per a l\'homenatjat del grup', en:'Special touch for the group\'s guest of honour'}, description:{es:'Postre gratis, foto de recuerdo o vela de cumpleaños.', ca:'Postre gratis, foto de record o espelma d\'aniversari.', en:'A free dessert, a keepsake photo or a birthday candle.'} },
  ]},
  { cat: {es:'Accesibilidad, familias y mascotas', ca:'Accessibilitat, famílies i mascotes', en:'Accessibility, families and pets'}, icon: 'ti-accessible', ideas: [
    { title:{es:'Menú infantil: qué incluye y precio', ca:'Menú infantil: què inclou i preu', en:'Kids\' menu: what\'s included and the price'}, description:{es:'Información práctica para familias que buscan dónde comer con niños.', ca:'Informació pràctica per a famílies que busquen on menjar amb nens.', en:'Practical information for families looking for somewhere to eat with kids.'} },
    { title:{es:'Trona o zona para bebés disponible', ca:'Trona o zona per a nadons disponible', en:'High chair or baby area available'}, description:{es:'Detalle que facilita la decisión a familias con bebés.', ca:'Detall que facilita la decisió a famílies amb nadons.', en:'A detail that makes the decision easier for families with babies.'} },
    { title:{es:'Aquí sí se admiten mascotas', ca:'Aquí sí que s\'admeten mascotes', en:'Pets are welcome here'}, description:{es:'Foto de un perro en la terraza, muy compartido por dueños de mascotas.', ca:'Foto d\'un gos a la terrassa, molt compartit per propietaris de mascotes.', en:'A photo of a dog on the terrace, widely shared by pet owners.'} },
    { title:{es:'Accesibilidad para sillas de ruedas', ca:'Accessibilitat per a cadires de rodes', en:'Wheelchair accessibility'}, description:{es:'Rampas, baños adaptados y mesas accesibles.', ca:'Rampes, banys adaptats i taules accessibles.', en:'Ramps, adapted restrooms and accessible tables.'} },
    { title:{es:'Zona tranquila con wifi y enchufes', ca:'Zona tranquil·la amb wifi i endolls', en:'Quiet area with wifi and power outlets'}, description:{es:'Útil para quien quiere trabajar o estudiar un rato.', ca:'Útil per a qui vol treballar o estudiar una estona.', en:'Useful for anyone wanting to work or study for a while.'} },
    { title:{es:'Aparcamiento cercano o facilidades de acceso', ca:'Aparcament proper o facilitats d\'accés', en:'Nearby parking or access facilities'}, description:{es:'Información práctica que resuelve una duda frecuente.', ca:'Informació pràctica que resol un dubte freqüent.', en:'Practical information that answers a common question.'} },
    { title:{es:'Actividades para niños mientras esperan', ca:'Activitats per a nens mentre esperen', en:'Activities for kids while they wait'}, description:{es:'Lápices, juegos o menú para colorear en la mesa.', ca:'Llapis, jocs o menú per pintar a la taula.', en:'Crayons, games or a colouring menu at the table.'} },
    { title:{es:'Menús adaptados para personas mayores', ca:'Menús adaptats per a gent gran', en:'Menus adapted for older adults'}, description:{es:'Raciones y texturas pensadas para ese público.', ca:'Racions i textures pensades per a aquest públic.', en:'Portions and textures designed for that audience.'} },
    { title:{es:'Normas básicas del espacio pet-friendly', ca:'Normes bàsiques de l\'espai pet-friendly', en:'Basic rules of the pet-friendly area'}, description:{es:'Transparencia sobre dónde y cómo pueden estar las mascotas.', ca:'Transparència sobre on i com poden estar les mascotes.', en:'Transparency about where and how pets can be.'} },
    { title:{es:'Espacio para carritos de bebé', ca:'Espai per a cotxets de nadó', en:'Space for baby strollers'}, description:{es:'Detalle práctico que agradecen mucho las familias.', ca:'Detall pràctic que agraeixen molt les famílies.', en:'A practical touch families really appreciate.'} },
  ]},
  { cat: {es:'Reclutamiento y vida laboral', ca:'Reclutament i vida laboral', en:'Recruitment and work life'}, icon: 'ti-briefcase', ideas: [
    { title:{es:'"Estamos contratando"', ca:'"Estem contractant"', en:'"We\'re hiring"'}, description:{es:'Puesto, requisitos y cómo apuntarse, con buena presentación visual.', ca:'Lloc, requisits i com apuntar-s\'hi, amb bona presentació visual.', en:'Position, requirements and how to apply, with a good visual presentation.'} },
    { title:{es:'Un día de prueba de un nuevo empleado', ca:'Un dia de prova d\'un nou empleat', en:'A new employee\'s trial day'}, description:{es:'Muestra el ambiente de trabajo desde dentro.', ca:'Mostra l\'ambient de treball des de dins.', en:'Shows the working atmosphere from the inside.'} },
    { title:{es:'Por qué trabajar en este equipo', ca:'Per què treballar en aquest equip', en:'Why work with this team'}, description:{es:'Testimonios internos sinceros sobre el ambiente laboral.', ca:'Testimonis interns sincers sobre l\'ambient laboral.', en:'Honest internal testimonials about the work environment.'} },
    { title:{es:'Beneficios de trabajar aquí', ca:'Beneficis de treballar aquí', en:'Benefits of working here'}, description:{es:'Horarios, formación, ambiente... lo que os diferencia como empleador.', ca:'Horaris, formació, ambient... el que us diferencia com a ocupador.', en:'Hours, training, atmosphere... what sets you apart as an employer.'} },
    { title:{es:'Cómo es el proceso de selección', ca:'Com és el procés de selecció', en:'What the hiring process is like'}, description:{es:'Transparencia que atrae a mejores candidatos.', ca:'Transparència que atreu millors candidats.', en:'Transparency that attracts better candidates.'} },
    { title:{es:'Nueva incorporación al equipo', ca:'Nova incorporació a l\'equip', en:'New team member'}, description:{es:'Bienvenida pública que también genera cercanía con el cliente.', ca:'Benvinguda pública que també genera proximitat amb el client.', en:'A public welcome that also builds closeness with customers.'} },
    { title:{es:'Formación interna a un nuevo camarero/a', ca:'Formació interna a un nou cambrer/a', en:'Internal training for a new waiter/waitress'}, description:{es:'Muestra el cuidado que ponéis en formar a vuestro personal.', ca:'Mostra la cura que poseu a formar el vostre personal.', en:'Shows the care you put into training your staff.'} },
    { title:{es:'De becario/a a jefe/a de sala', ca:'De becari/ària a cap de sala', en:'From intern to floor manager'}, description:{es:'Historia de crecimiento interno, muy inspiradora.', ca:'Història de creixement intern, molt inspiradora.', en:'A story of internal growth, very inspiring.'} },
  ]},
  { cat: {es:'Reseñas y reputación online', ca:'Ressenyes i reputació en línia', en:'Reviews and online reputation'}, icon: 'ti-star', ideas: [
    { title:{es:'Cómo dejar una reseña en Google en 30 segundos', ca:'Com deixar una ressenya a Google en 30 segons', en:'How to leave a Google review in 30 seconds'}, description:{es:'Tutorial que facilita conseguir más reseñas.', ca:'Tutorial que facilita aconseguir més ressenyes.', en:'A tutorial that makes it easier to get more reviews.'} },
    { title:{es:'Agradecimiento a quien deja una reseña de 5 estrellas', ca:'Agraïment a qui deixa una ressenya de 5 estrelles', en:'Thanking whoever leaves a 5-star review'}, description:{es:'Reconocimiento público que anima a otros a hacerlo.', ca:'Reconeixement públic que anima altres a fer-ho.', en:'Public recognition that encourages others to do the same.'} },
    { title:{es:'Reacción del equipo a la mejor reseña del mes', ca:'Reacció de l\'equip a la millor ressenya del mes', en:'The team\'s reaction to the best review of the month'}, description:{es:'Formato divertido y cercano de compartir feedback positivo.', ca:'Format divertit i proper de compartir feedback positiu.', en:'A fun, warm way of sharing positive feedback.'} },
    { title:{es:'Cómo responden a una crítica constructiva', ca:'Com responen a una crítica constructiva', en:'How they respond to constructive criticism'}, description:{es:'Muestra profesionalidad y ganas de mejorar.', ca:'Mostra professionalitat i ganes de millorar.', en:'Shows professionalism and a will to improve.'} },
    { title:{es:'Reseña destacada convertida en post visual', ca:'Ressenya destacada convertida en post visual', en:'A featured review turned into a visual post'}, description:{es:'Cita textual de un cliente con buen diseño.', ca:'Cita textual d\'un client amb bon disseny.', en:'A word-for-word customer quote with nice design.'} },
    { title:{es:'Invitación a dejar reseña con un pequeño detalle', ca:'Invitació a deixar ressenya amb un petit detall', en:'Invitation to leave a review with a small perk'}, description:{es:'Incentivo dentro de la normativa de la plataforma usada.', ca:'Incentiu dins de la normativa de la plataforma utilitzada.', en:'An incentive within the rules of the platform used.'} },
    { title:{es:'Antes y después de mejoras tras el feedback', ca:'Abans i després de millores després del feedback', en:'Before and after improvements based on feedback'}, description:{es:'Demuestra que escucháis y aplicáis lo que dicen los clientes.', ca:'Demostra que escolteu i apliqueu el que diuen els clients.', en:'Shows that you listen and act on what customers say.'} },
    { title:{es:'Menciones en prensa o medios locales', ca:'Mencions a la premsa o mitjans locals', en:'Mentions in the press or local media'}, description:{es:'Comparte reconocimientos externos que dan credibilidad.', ca:'Comparteix reconeixements externs que donen credibilitat.', en:'Shares external recognition that builds credibility.'} },
  ]},
  { cat: {es:'Oportunismo y actualidad', ca:'Oportunisme i actualitat', en:'Timeliness and current events'}, icon: 'ti-cloud', ideas: [
    { title:{es:'Día de lluvia: plan perfecto con algo calentito', ca:'Dia de pluja: pla perfecte amb alguna cosa calenteta', en:'Rainy day: the perfect plan with something warm'}, description:{es:'Aprovecha el tiempo meteorológico real del día.', ca:'Aprofita el temps meteorològic real del dia.', en:'Makes the most of the actual weather that day.'} },
    { title:{es:'Ola de calor: bebida o helado destacado', ca:'Onada de calor: beguda o gelat destacat', en:'Heatwave: featured drink or ice cream'}, description:{es:'Contenido reactivo a la temperatura del momento.', ca:'Contingut reactiu a la temperatura del moment.', en:'Content reacting to the current temperature.'} },
    { title:{es:'Aprovechar un partido importante', ca:'Aprofitar un partit important', en:'Making the most of a big match'}, description:{es:'Ambiente del bar para ver el evento deportivo del día.', ca:'Ambient del bar per veure l\'esdeveniment esportiu del dia.', en:'The bar\'s vibe for watching the day\'s sporting event.'} },
    { title:{es:'Festivo inesperado o puente', ca:'Festiu inesperat o pont', en:'Unexpected public holiday or long weekend'}, description:{es:'Aviso de horario especial cuando cambia lo habitual.', ca:'Avís d\'horari especial quan canvia l\'habitual.', en:'A special hours notice when the usual schedule changes.'} },
    { title:{es:'Tendencia de actualidad aplicada con buen gusto', ca:'Tendència d\'actualitat aplicada amb bon gust', en:'A current trend applied tastefully'}, description:{es:'Sube al tren de una conversación del momento, con cuidado.', ca:'Puja al tren d\'una conversa del moment, amb cura.', en:'Jumps on a current conversation, carefully.'} },
    { title:{es:'"Lunes de vuelta al trabajo"', ca:'"Dilluns de tornada a la feina"', en:'"Back-to-work Monday"'}, description:{es:'Oferta o mensaje que anima a arrancar bien la semana.', ca:'Oferta o missatge que anima a començar bé la setmana.', en:'An offer or message that helps kick off the week well.'} },
    { title:{es:'Apertura especial un día que normalmente cerráis', ca:'Obertura especial un dia que normalment tanqueu', en:'Special opening on a day you\'re usually closed'}, description:{es:'Aviso puntual de un cambio de horario excepcional.', ca:'Avís puntual d\'un canvi d\'horari excepcional.', en:'A one-off notice of an exceptional schedule change.'} },
    { title:{es:'Reacción con humor a un titular de actualidad gastronómica', ca:'Reacció amb humor a un titular d\'actualitat gastronòmica', en:'A humorous reaction to a current food-news headline'}, description:{es:'Contenido oportunista y ligero, siempre con cuidado.', ca:'Contingut oportunista i lleuger, sempre amb cura.', en:'Timely, light content, always handled carefully.'} },
  ]},
  { cat: {es:'Google Business y reseñas', ca:'Google Business i ressenyes', en:'Google Business and reviews'}, icon: 'ti-brand-google', ideas: [
    { title:{es:'Responder las reseñas nuevas de Google', ca:'Respondre les ressenyes noves de Google', en:'Reply to new Google reviews'}, description:{es:'Tarea de mantenimiento (no contenido creativo): revisa y contesta lo que dejen esta semana.', ca:'Tasca de manteniment (no contingut creatiu): revisa i respon el que deixin aquesta setmana.', en:'A maintenance task (not creative content): review and reply to whatever comes in this week.'} },
    { title:{es:'Responder a una reseña negativa con profesionalidad', ca:'Respondre a una ressenya negativa amb professionalitat', en:'Respond to a negative review professionally'}, description:{es:'Sin discutir: agradecer, pedir disculpas si procede y ofrecer solucionarlo fuera de la reseña.', ca:'Sense discutir: agrair, demanar disculpes si escau i oferir solucionar-ho fora de la ressenya.', en:'Without arguing: thank them, apologize if appropriate, and offer to resolve it outside the review.'} },
    { title:{es:'Actualizar el horario en Google si cambia', ca:'Actualitzar l\'horari a Google si canvia', en:'Update Google hours if they change'}, description:{es:'Festivos, vacaciones o cambios de temporada — evita que llegue gente con el negocio cerrado.', ca:'Festius, vacances o canvis de temporada — evita que arribi gent amb el negoci tancat.', en:'Holidays, vacations or seasonal changes — avoids people showing up when you\'re closed.'} },
    { title:{es:'Subir fotos nuevas al perfil de Google Business', ca:'Pujar fotos noves al perfil de Google Business', en:'Upload new photos to the Google Business profile'}, description:{es:'Fotos recientes de platos, sala o fachada; los perfiles con fotos actualizadas destacan más.', ca:'Fotos recents de plats, sala o façana; els perfils amb fotos actualitzades destaquen més.', en:'Recent photos of dishes, the dining room or the facade; profiles with up-to-date photos stand out more.'} },
    { title:{es:'Publicar una novedad como "Google Post"', ca:'Publicar una novetat com a "Google Post"', en:'Publish an update as a "Google Post"'}, description:{es:'Oferta, evento o plato nuevo publicado directamente en la ficha de Google.', ca:'Oferta, esdeveniment o plat nou publicat directament a la fitxa de Google.', en:'An offer, event or new dish published directly on the Google listing.'} },
    { title:{es:'Revisar que los datos del perfil sean correctos', ca:'Revisar que les dades del perfil siguin correctes', en:'Check that the profile details are correct'}, description:{es:'Teléfono, dirección, web y enlace de reservas al día.', ca:'Telèfon, adreça, web i enllaç de reserves al dia.', en:'Phone number, address, website and booking link up to date.'} },
    { title:{es:'Comprobar la carta/menú de Google', ca:'Comprovar la carta/menú de Google', en:'Check the Google menu'}, description:{es:'Que los platos, precios y fotos del menú en Google coincidan con la carta real.', ca:'Que els plats, preus i fotos del menú a Google coincideixin amb la carta real.', en:'Make sure the dishes, prices and photos on the Google menu match the real one.'} },
    { title:{es:'Pedir reseña a los últimos clientes', ca:'Demanar ressenya als últims clients', en:'Ask recent customers for a review'}, description:{es:'Mensaje directo (WhatsApp/email) a quien ha visitado recientemente, con el enlace directo a Google.', ca:'Missatge directe (WhatsApp/email) a qui ha visitat recentment, amb l\'enllaç directe a Google.', en:'A direct message (WhatsApp/email) to recent visitors, with the direct link to Google.'} },
    { title:{es:'Revisar preguntas y respuestas públicas del perfil', ca:'Revisar preguntes i respostes públiques del perfil', en:'Check the profile\'s public Q&A'}, description:{es:'La gente pregunta cosas ahí (horario, aparcamiento...); contestar rápido da buena imagen.', ca:'La gent pregunta coses allà (horari, aparcament...); respondre ràpid dona bona imatge.', en:'People ask things there (hours, parking...); replying quickly gives a good impression.'} },
    { title:{es:'Comprobar atributos del negocio en Google', ca:'Comprovar atributs del negoci a Google', en:'Check the business attributes on Google'}, description:{es:'Pet-friendly, accesible en silla de ruedas, terraza, wifi... marcados correctamente.', ca:'Pet-friendly, accessible en cadira de rodes, terrassa, wifi... marcats correctament.', en:'Pet-friendly, wheelchair accessible, terrace, wifi... correctly marked.'} },
    { title:{es:'Verificar que el local aparece bien situado en Google Maps', ca:'Verificar que el local apareix ben situat a Google Maps', en:'Verify the venue is correctly located on Google Maps'}, description:{es:'Un pin mal ubicado hace perder clientes que no encuentran el sitio.', ca:'Un pin mal ubicat fa perdre clients que no troben el lloc.', en:'A misplaced pin loses customers who can\'t find the venue.'} },
    { title:{es:'Responder mensajes recibidos por Google', ca:'Respondre missatges rebuts per Google', en:'Reply to messages received via Google'}, description:{es:'El chat de Google Business Profile también necesita revisión periódica.', ca:'El xat de Google Business Profile també necessita revisió periòdica.', en:'The Google Business Profile chat also needs periodic checking.'} },
  ]},
  { cat: {es:'Redes sociales — gestión y mantenimiento', ca:'Xarxes socials — gestió i manteniment', en:'Social media — management and maintenance'}, icon: 'ti-share', ideas: [
    { title:{es:'Actualizar biografía y enlace de Instagram/Facebook', ca:'Actualitzar biografia i enllaç d\'Instagram/Facebook', en:'Update Instagram/Facebook bio and link'}, description:{es:'Que el enlace de la bio lleve a la web, carta o reservas actuales, no a algo desactualizado.', ca:'Que l\'enllaç de la bio porti a la web, carta o reserves actuals, no a alguna cosa desactualitzada.', en:'Make sure the bio link points to the current website, menu or bookings, not something outdated.'} },
    { title:{es:'Revisar y responder mensajes directos pendientes', ca:'Revisar i respondre missatges directes pendents', en:'Review and reply to pending direct messages'}, description:{es:'Tarea de mantenimiento: vaciar la bandeja de DMs sin contestar.', ca:'Tasca de manteniment: buidar la safata de DMs sense contestar.', en:'A maintenance task: clear the inbox of unanswered DMs.'} },
    { title:{es:'Comprobar que el horario esté al día en Facebook', ca:'Comprovar que l\'horari estigui al dia a Facebook', en:'Check that the hours are up to date on Facebook'}, description:{es:'Facebook tiene su propio horario, independiente del de Google.', ca:'Facebook té el seu propi horari, independent del de Google.', en:'Facebook has its own hours, separate from Google\'s.'} },
    { title:{es:'Planificar las publicaciones de la semana', ca:'Planificar les publicacions de la setmana', en:'Plan the week\'s posts'}, description:{es:'Bloque de tiempo fijo para programar contenido con antelación, no improvisar cada día.', ca:'Bloc de temps fix per programar contingut amb antelació, no improvisar cada dia.', en:'A fixed time block to schedule content in advance, instead of improvising every day.'} },
    { title:{es:'Responder comentarios pendientes en publicaciones antiguas', ca:'Respondre comentaris pendents en publicacions antigues', en:'Reply to pending comments on older posts'}, description:{es:'Revisión periódica de comentarios que se quedaron sin respuesta.', ca:'Revisió periòdica de comentaris que es van quedar sense resposta.', en:'A periodic check of comments that were left unanswered.'} },
    { title:{es:'Actualizar los destacados de Instagram (Stories)', ca:'Actualitzar els destacats d\'Instagram (Stories)', en:'Update Instagram Story highlights'}, description:{es:'Menú, horario, ubicación y promos siempre visibles y actualizados en el perfil.', ca:'Menú, horari, ubicació i promocions sempre visibles i actualitzats al perfil.', en:'Menu, hours, location and promos always visible and up to date on the profile.'} },
    { title:{es:'Repostear contenido en el que os etiquetan clientes', ca:'Repostar contingut en què us etiqueten clients', en:'Repost content where customers tag you'}, description:{es:'Aprovechar el contenido que generan los propios clientes (UGC).', ca:'Aprofitar el contingut que generen els mateixos clients (UGC).', en:'Make the most of the content customers generate themselves (UGC).'} },
    { title:{es:'Comprobar que los enlaces de reserva/pedido funcionan', ca:'Comprovar que els enllaços de reserva/comanda funcionen', en:'Check that booking/order links work'}, description:{es:'Revisión rápida de que el botón de reservar o pedir online no esté roto.', ca:'Revisió ràpida que el botó de reservar o demanar en línia no estigui trencat.', en:'A quick check that the booking or online ordering button isn\'t broken.'} },
    { title:{es:'Revisar qué publicaciones han funcionado mejor', ca:'Revisar quines publicacions han funcionat millor', en:'Review which posts have performed best'}, description:{es:'Repasar estadísticas del mes para repetir lo que mejor funciona.', ca:'Repassar estadístiques del mes per repetir el que millor funciona.', en:'Go over the month\'s stats to repeat what works best.'} },
    { title:{es:'Actualizar el catálogo de Instagram/Facebook Shop', ca:'Actualitzar el catàleg d\'Instagram/Facebook Shop', en:'Update the Instagram/Facebook Shop catalogue'}, description:{es:'Si vendéis productos propios (salsas, mercancía...) mantenerlo al día.', ca:'Si veneu productes propis (salses, mercaderia...) mantenir-lo al dia.', en:'If you sell your own products (sauces, merchandise...) keep it up to date.'} },
  ]},
];

function contentIdeasTotalCount(){
  return CONTENT_IDEAS.reduce((sum, c) => sum + c.ideas.length, 0);
}

// Promos (de cualquier fecha) creadas a partir de una idea concreta, para
// saber si ya se usó y cuándo por última vez, y no repetirla sin darse cuenta.
function promoIdeaUsage(catIdx, ideaIdx){
  return DB.promos.filter(p => p.ideaRef && p.ideaRef.cat===catIdx && p.ideaRef.idx===ideaIdx)
    .sort((a,b) => b.fecha.localeCompare(a.fecha));
}
function categoryUsedCount(catIdx){
  const c = CONTENT_IDEAS[catIdx];
  return c.ideas.filter((_, idx) => promoIdeaUsage(catIdx, idx).length > 0).length;
}
// Elige una idea al azar para el botón "Sorpréndeme": prioriza las que nunca
// se han usado; si ya se han probado todas, elige cualquiera.
function pickRandomIdea(){
  const all = [];
  const unused = [];
  CONTENT_IDEAS.forEach((c, catIdx) => c.ideas.forEach((_, ideaIdx) => {
    all.push({catIdx, ideaIdx});
    if(promoIdeaUsage(catIdx, ideaIdx).length === 0) unused.push({catIdx, ideaIdx});
  }));
  const pool = unused.length ? unused : all;
  return pool[Math.floor(Math.random()*pool.length)];
}
function surprisePromoIdea(){
  const pick = pickRandomIdea();
  if(!pick) return;
  createPromoFromIdea(pick.catIdx, pick.ideaIdx);
}

let promoIdeasCategory = null;
let promoIdeasQuery = '';

function pmSinTildes(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function renderPromoIdeas(){
  const box = document.getElementById('promo-tab-content');
  const q = pmSinTildes(promoIdeasQuery.trim());
  const buscador = `
    <div class="toolbar pm-barra">
      <div class="left">
        <input type="search" class="search-input st-buscar" id="promo-ideas-q" value="${escapeHtml(promoIdeasQuery)}" placeholder="${escapeHtml(gl({es:'Buscar entre las ideas…', ca:'Cercar entre les idees…', en:'Search the ideas…'}))}" aria-label="${escapeHtml(gl({es:'Buscar ideas', ca:'Cercar idees', en:'Search ideas'}))}" oninput="promoIdeasBuscar(this.value)">
        ${promoIdeasCategory !== null && !q ? `<button type="button" class="btn btn-sm btn-fino" onclick="promoIdeasCategory=null;renderPromoIdeas()"><i class="ti ti-arrow-left"></i> ${t('promo.ideas.categories')}</button>` : ''}
      </div>
      <button type="button" class="owner-only btn btn-fino is-on" onclick="surprisePromoIdea()"><i class="ti ti-dice"></i> ${t('promo.ideas.surpriseMe')}</button>
    </div>`;

  const ideaCard = (catIdx, ideaIdx, conCategoria) => {
    const idea = CONTENT_IDEAS[catIdx].ideas[ideaIdx];
    const usage = promoIdeaUsage(catIdx, ideaIdx);
    const extra = usage.length > 1 ? t('promo.ideas.usedMoreTimes').replace('${count}', usage.length-1).replace('${es}', usage.length-1!==1?'es':'') : '';
    return `
      <article class="pm-card pm-idea${usage.length ? ' is-usada' : ''}">
        ${conCategoria ? `<span class="pm-idea-cat"><i class="ti ${CONTENT_IDEAS[catIdx].icon}"></i> ${escapeHtml(gl(CONTENT_IDEAS[catIdx].cat))}</span>` : ''}
        <h3 class="pm-idea-tit">${escapeHtml(gl(idea.title))}</h3>
        <p class="pm-desc">${escapeHtml(gl(idea.description))}</p>
        ${usage.length ? `<div class="pm-hecho"><i class="ti ti-check"></i> ${t('promo.ideas.usedOn').replace('${date}', escapeHtml(usage[0].fecha)).replace('${extra}', extra)}</div>` : ''}
        <div class="pm-card-pie"><button type="button" class="owner-only btn btn-sm btn-fino is-on" onclick="createPromoFromIdea(${catIdx},${ideaIdx})"><i class="ti ti-plus"></i> ${t('promo.ideas.createAction')}</button></div>
      </article>`;
  };

  if(q){
    const hallazgos = [];
    CONTENT_IDEAS.forEach((c, ci) => c.ideas.forEach((idea, ii) => {
      if(pmSinTildes(gl(idea.title) + ' ' + gl(idea.description) + ' ' + gl(c.cat)).includes(q)) hallazgos.push([ci, ii]);
    }));
    box.innerHTML = buscador + (hallazgos.length
      ? `<p class="pr-ayuda">${hallazgos.length} ${escapeHtml(gl({es:'ideas encontradas', ca:'idees trobades', en:'ideas found'}))}</p><div class="pr-grid pm-grid">${hallazgos.map(([ci, ii]) => ideaCard(ci, ii, true)).join('')}</div>`
      : `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`);
  } else if(promoIdeasCategory === null){
    const usadasTotal = CONTENT_IDEAS.reduce((s, _c, i) => s + categoryUsedCount(i), 0);
    box.innerHTML = buscador + `
      <p class="pr-ayuda"><i class="ti ti-bulb"></i> ${t('promo.ideas.intro').replace('${count}', contentIdeasTotalCount())}</p>
      ${pmResumenHtml([
        {et: gl({es:'Ideas en la biblioteca', ca:'Idees a la biblioteca', en:'Ideas in the library'}), v: contentIdeasTotalCount()},
        {et: gl({es:'Ya usadas', ca:'Ja usades', en:'Already used'}), v: usadasTotal},
      ])}
      <div class="pr-grid pm-grid">
        ${CONTENT_IDEAS.map((c, i) => {
          const used = categoryUsedCount(i);
          return `
          <button type="button" class="pm-card pm-cat" onclick="openPromoIdeasCategory(${i})">
            <span class="pm-cat-ico"><i class="ti ${c.icon}"></i></span>
            <span class="pm-cat-txt"><b>${escapeHtml(gl(c.cat))}</b>
            <small>${t('promo.ideas.ideasCount').replace('${count}', c.ideas.length)}${used ? ' · ' + t('promo.ideas.usedCount').replace('${count}', used).replace('${s}', used !== 1 ? 's' : '') : ''}</small></span>
            <i class="ti ti-chevron-right pm-cat-flecha"></i>
          </button>`;
        }).join('')}
      </div>`;
  } else {
    const c = CONTENT_IDEAS[promoIdeasCategory];
    box.innerHTML = buscador + `
      <h3 class="es-tit"><i class="ti ${c.icon}"></i> ${escapeHtml(gl(c.cat))}</h3>
      <div class="pr-grid pm-grid">${c.ideas.map((_idea, ideaIdx) => ideaCard(promoIdeasCategory, ideaIdx, false)).join('')}</div>`;
  }
}
// Buscar repinta toda la pestaña: se devuelve el foco al final del campo.
function promoIdeasBuscar(v){
  promoIdeasQuery = v;
  renderPromoIdeas();
  const c = document.getElementById('promo-ideas-q');
  if(c){ c.focus(); try{ c.setSelectionRange(c.value.length, c.value.length); }catch(e){} }
}
function openPromoIdeasCategory(i){
  promoIdeasCategory = i;
  renderPromoIdeas();
}
function createPromoFromIdea(catIdx, ideaIdx){
  const idea = CONTENT_IDEAS[catIdx].ideas[ideaIdx];
  openPromoModal(null, promoDate || todayStr(), {titulo: gl(idea.title), descripcion: gl(idea.description), ideaRef: {cat: catIdx, idx: ideaIdx}});
}

// Mensajes preconfigurados para la interacción post-servicio con el cliente
// (cumpleaños, reseñas, clientes que hace tiempo no vienen).
const PROMO_MESSAGE_TEMPLATES = {
  cumple: (c, biz) => t('promo.clients.template.cumple').replace('${name}', c.name).replace('${biz}', biz),
  // Justo tras la visita es el mejor momento para pedir una reseña — con el
  // enlace directo a la ficha de Google puesto (Mi Negocio → Redes sociales),
  // el cliente solo tiene que tocar una vez y puntuar, en vez de tener que
  // buscar el negocio él mismo en Google.
  resena: (c, biz) => {
    const base = t('promo.clients.template.resena').replace('${name}', c.name).replace('${biz}', biz);
    const link = (DB.business && DB.business.gmaps || '').trim();
    return link ? base + '\n' + link : base;
  },
  vuelve: (c, biz) => t('promo.clients.template.vuelve').replace('${name}', c.name).replace('${biz}', biz),
  nps: (c, biz) => {
    const base = t('promo.clients.template.nps').replace('${name}', c.name).replace('${biz}', biz);
    return base + '\n' + npsSurveyLink();
  }
};
const PROMO_MESSAGE_SUBJECTS = {
  cumple: () => t('promo.clients.subject.cumple'),
  resena: () => t('promo.clients.subject.resena'),
  vuelve: () => t('promo.clients.subject.vuelve'),
  nps: () => t('promo.clients.subject.nps')
};
// El enlace de la encuesta privada reutiliza el mismo enlace público de
// reservas/pedidos, con &nps=1 añadido — así reservagastrogoan.html sabe
// que tiene que mostrar el formulario de puntuación en vez de las pestañas
// normales de reserva/pedido.
function npsSurveyLink(){
  const base = getPublicClientLink();
  if(!base) return '';
  return base + (base.includes('?') ? '&nps=1' : '?nps=1');
}

// Días que faltan hasta el próximo cumpleaños (cumpleanos en formato YYYY-MM-DD).
function nextBirthdayDays(cumpleanos){
  if(!cumpleanos) return null;
  const parts = cumpleanos.split('-');
  if(parts.length < 3) return null;
  const month = parseInt(parts[1]) - 1, day = parseInt(parts[2]);
  if(isNaN(month) || isNaN(day)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  let next = new Date(today.getFullYear(), month, day);
  if(next < today) next = new Date(today.getFullYear()+1, month, day);
  return Math.round((next - today) / 86400000);
}

// Resumen de "¿cómo nos conociste?" (últimos 90 días), a partir de las
// reservas hechas desde la web pública que trajeron esa respuesta — así se
// puede ver de un vistazo qué canal está trayendo clientes de verdad, sin
// necesitar ninguna API de redes sociales.
const REFERRAL_LABEL_KEYS = {instagram:'referral.instagram', facebook:'referral.facebook', tiktok:'referral.tiktok', google:'referral.google', friend:'referral.friend', returning:'referral.returning', other:'referral.other'};
function renderReferralSummaryHtml(){
  const since = dateStr(new Date(Date.now() - 90*86400000));
  const withReferral = DB.reservations.filter(r => r.origen==='publico' && r.referral && r.date >= since);
  if(!withReferral.length) return '';
  const counts = {};
  withReferral.forEach(r => { counts[r.referral] = (counts[r.referral]||0) + 1; });
  const total = withReferral.length;
  const rows = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  return `
    <div class="card" style="margin-bottom:18px">
      <h3 style="font-size:14px"><i class="ti ti-route"></i> ${t('promo.referral.title')}</h3>
      <p style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${t('promo.referral.desc')}</p>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${rows.map(([key,n]) => {
          const pct = Math.round(n/total*100);
          const label = t(REFERRAL_LABEL_KEYS[key]) || key;
          return `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:110px;font-size:12.5px;flex:none">${escapeHtml(label)}</span>
            <div style="flex:1;background:var(--brand-cream);height:10px;border-radius:6px;overflow:hidden">
              <div style="width:${pct}%;background:var(--olive-l,var(--ink));height:100%"></div>
            </div>
            <span style="width:56px;text-align:right;font-size:12px;color:var(--muted);flex:none">${n} (${pct}%)</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

let promoInactivosTodos = false;

function renderPromoClientes(){
  const box = document.getElementById('promo-tab-content');
  const today = new Date(); today.setHours(0,0,0,0);

  // Igual que en la exportación de marketing de Clientes: si un cliente ha
  // retirado el consentimiento de marketing, no debe aparecer aquí como
  // candidato a un WhatsApp/email de felicitación o de "vuelve pronto" —
  // antes esta pantalla ignoraba ese campo y ofrecía contactar a cualquiera
  // con teléfono o email, sin importar si había dicho que no.
  const withConsent = DB.clients.filter(c => c.marketingConsent !== false);

  const birthdays = withConsent
    .map(c => ({c, days: nextBirthdayDays(c.cumpleanos)}))
    .filter(x => x.days !== null && x.days <= 30)
    .sort((a,b) => a.days - b.days);
  const withContact = withConsent.filter(c => c.phone || c.email);
  /* «Visitas recientes» e «Inactivos» miran la ÚLTIMA VISITA REAL (las ventas del cliente), no el campo «último contacto» de la ficha (8/11).
     Ese campo lo rellena a mano quien escribe al cliente: casi siempre estaba vacío, así que «Visitas recientes» salía siempre vacía y
     «Inactivos» listaba a TODO el mundo. Misma cuenta que los filtros de Clientes (`computeClientStatsIndexed`). */
  const getStats = computeClientStatsIndexed();
  const conDias = withContact.map(c => ({c, days: getStats(c).recency}));
  // Pedir reseña tiene sentido cuando aún lo recuerdan y ya han llegado a casa: de ayer a hace tres días.
  const recientes = conDias.filter(x => x.days !== null && x.days >= 1 && x.days <= 3).sort((a,b) => a.days - b.days);
  const inactivos = conDias.filter(x => x.days === null || x.days > 60).sort((a,b) => (b.days ?? -1) - (a.days ?? -1));

  const scores = DB.npsScores || [];
  const npsMedia = scores.length ? (scores.reduce((s,x)=>s+x.score,0) / scores.length).toFixed(1) : null;

  const tarjeta = (c, templateKey, badge) => {
    const registered = DB.promos.some(p => p.clienteId===c.id && p.ideaRef && p.ideaRef.clientTemplate===templateKey && p.fecha===todayStr());
    const movil = whatsappDeTelefono(c.phone);
    const menu = registered
      ? `<span class="pm-et is-ok"><i class="ti ti-check"></i> ${escapeHtml(t('promo.clients.alreadyRegisteredToday'))}</span>`
      : ggMenuAcciones([{icono:'ti-calendar-plus', texto:t('promo.clients.registerAsAction'), fn:`registerClientOutreachAsPromo(${c.id},'${templateKey}')`, owner:true}]);
    return `
    <article class="pm-card pm-cli">
      <div class="pm-card-cab">
        <span class="pr-av pr-av-s" style="--c:#8A7440">${escapeHtml(prIniciales(c.name))}</span>
        <span class="pm-card-tit is-texto">${escapeHtml(c.name)}</span>
        ${menu}
      </div>
      <div class="pm-ets">${badge}</div>
      <div class="pm-card-pie pm-cli-bt">
        <button type="button" class="btn btn-sm btn-fino is-on" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!movil ? `disabled title="${escapeHtml(c.phone ? gl({es:'Este teléfono no parece un móvil: WhatsApp no lo abre', ca:'Aquest telèfon no sembla un mòbil: WhatsApp no l\'obre', en:'This number does not look like a mobile: WhatsApp will not open it'}) : t('promo.clients.noPhone'))}"` : ''}><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
        <button type="button" class="btn btn-sm btn-fino" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!c.email ? `disabled title="${escapeHtml(t('promo.clients.noEmail'))}"` : ''}><i class="ti ti-mail"></i> Email</button>
      </div>
    </article>`;
  };
  const dias = n => `<span class="pm-et">${n === 0 ? t('promo.clients.agoToday') : t('promo.clients.agoDaysSuffix').replace('${n}', n).replace('${s}', n!==1?'s':'')}</span>`;
  const seccion = (icono, titulo, cuenta, cuerpo, extra) => `
    <section class="pm-sec">
      <div class="pm-sec-cab"><h3 class="es-tit"><i class="ti ${icono}"></i> ${escapeHtml(titulo)} <span class="dp-cuenta">${cuenta}</span></h3>${extra || ''}</div>
      ${cuerpo}
    </section>`;
  const vacio = (icono, txt) => `<div class="empty es-vacio"><i class="ti ${icono}"></i>${txt}</div>`;

  const inactivosVisibles = promoInactivosTodos ? inactivos : inactivos.slice(0, 12);
  box.innerHTML = `
    <p class="pr-ayuda"><i class="ti ti-info-circle"></i> ${t('promo.clients.intro')}</p>
    ${pmResumenHtml([
      {et: t('promo.clients.upcomingBirthdays'), v: birthdays.length},
      {et: t('promo.clients.recentVisits'), v: recientes.length},
      {et: t('promo.clients.inactiveClients'), v: inactivos.length, cls: inactivos.length ? 'is-bajo' : ''},
      {et: 'NPS', v: npsMedia !== null ? npsMedia + '<small>/10</small>' : '—', sub: npsMedia !== null ? escapeHtml(t('nps.responsesCount').replace('${n}', scores.length)) : ''},
    ])}
    ${renderReferralSummaryHtml()}

    ${seccion('ti-cake', t('promo.clients.upcomingBirthdays'), birthdays.length, birthdays.length
      ? `<div class="pr-grid pm-grid">${birthdays.map(({c,days}) => tarjeta(c, 'cumple', days===0 ? `<span class="pm-et is-dto">${t('promo.clients.today')}</span>` : `<span class="pm-et">${t('promo.clients.inDays').replace('${n}', days).replace('${s}', days!==1?'s':'')}</span>`)).join('')}</div>`
      : vacio('ti-cake', t('promo.clients.noBirthdays')))}

    ${seccion('ti-star', t('promo.clients.recentVisits'), recientes.length, recientes.length
      ? `<div class="pr-grid pm-grid">${recientes.map(({c,days}) => tarjeta(c, 'resena', dias(days))).join('')}</div>`
      : vacio('ti-star', t('promo.clients.noRecentVisits')))}

    ${seccion('ti-mood-empty', t('promo.clients.inactiveClients'), inactivos.length, inactivos.length
      ? `<div class="pr-grid pm-grid">${inactivosVisibles.map(({c,days}) => tarjeta(c, 'vuelve', days != null ? `<span class="pm-et">${t('promo.clients.daysAgo').replace('${n}', days)}</span>` : `<span class="pm-et">${t('promo.clients.noVisits')}</span>`)).join('')}</div>
         ${inactivos.length > 12 ? `<div class="pm-ver-mas"><button type="button" class="btn btn-sm btn-fino" onclick="promoInactivosTodos=!promoInactivosTodos;renderPromoClientes()">${escapeHtml(promoInactivosTodos ? gl({es:'Ver menos', ca:'Veure\'n menys', en:'Show fewer'}) : gl({es:`Ver los ${inactivos.length}`, ca:`Veure\'ls ${inactivos.length}`, en:`Show all ${inactivos.length}`}))}</button></div>` : ''}`
      : vacio('ti-users', t('promo.clients.noInactiveClients')),
      (inactivos.length && typeof novedadesConSegmento === 'function') ? `<button type="button" class="owner-only btn btn-sm btn-fino" onclick="novedadesConSegmento('inactivos')"><i class="ti ti-send"></i> ${escapeHtml(gl({es:'Escribirles a todos', ca:'Escriure\'ls a tots', en:'Write to all of them'}))}</button>` : '')}

    ${seccion('ti-mood-smile', t('nps.sectionTitle'), scores.length, `
      ${renderNpsSummaryHtml()}
      ${recientes.length ? `<div class="pr-grid pm-grid pm-nps-pedir">${recientes.map(({c,days}) => tarjeta(c, 'nps', dias(days))).join('')}</div>` : vacio('ti-mood-smile', t('promo.clients.noRecentVisits'))}`)}
  `;
}

// Resumen NPS: media simple (0-10) sobre las últimas respuestas, más las
// últimas con comentario (lo que más útil es leer directamente, ya que un
// número solo no dice nada del porqué).
function renderNpsSummaryHtml(){
  const scores = DB.npsScores || [];
  if(!scores.length){
    return `<div class="empty es-vacio"><i class="ti ti-chart-bar"></i>${t('nps.noResponsesYet')}</div>`;
  }
  const avg = (scores.reduce((s,x)=>s+x.score,0) / scores.length).toFixed(1);
  const detractors = scores.filter(x=>x.score<=6).length;
  const withComments = [...scores].filter(x=>x.comment).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5);
  return `
    <div class="lp-card pm-nps">
      <div class="pm-nps-cab">
        <div class="pm-nps-media">${avg}<small>/10</small></div>
        <div class="pr-ayuda">${t('nps.responsesCount').replace('${n}', scores.length)}${detractors ? `<br>${t('nps.detractorsCount').replace('${n}', detractors)}` : ''}</div>
      </div>
      ${withComments.length ? `<div class="pm-nps-coms">
        ${withComments.map(x => `<div class="pm-nps-com"><b>${escapeHtml(String(x.score))}/10</b> — ${escapeHtml(x.comment)}</div>`).join('')}
      </div>` : ''}
    </div>
  `;
}

// Abre un mensaje preconfigurado (cumpleaños, reseña, recuperación de cliente) listo
// para enviar por WhatsApp/SMS o email, igual que en el premio de fidelidad.
function openClientMessageModal(clientId, templateKey){
  const c = DB.clients.find(x=>x.id===clientId);
  if(!c) return;
  const biz = (DB.business && DB.business.name) || t('promo.clients.defaultBusinessName');
  const msg = PROMO_MESSAGE_TEMPLATES[templateKey](c, biz);
  const movil = whatsappDeTelefono(c.phone);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-message"></i> ${t('promo.clients.messageFor').replace('${name}', escapeHtml(c.name))}</h3>
      <button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('promo.clients.close'))}">&times;</button>
    </div>
    <div class="field">
      <label for="promo-msg-text">${escapeHtml(gl({es:'Mensaje (puedes cambiarlo antes de enviar)', ca:'Missatge (el pots canviar abans d\'enviar)', en:'Message (you can edit it before sending)'}))}</label>
      <textarea id="promo-msg-text" class="lp-auto-alto" rows="5" oninput="lpAuto(this)">${escapeHtml(msg)}</textarea>
    </div>
    <div class="promo-share-actions pm-modal-bt">
      <button type="button" class="btn btn-fino is-on" onclick="sendPromoClientWhatsapp(${clientId})" ${!movil ? `disabled title="${escapeHtml(c.phone ? gl({es:'Este teléfono no parece un móvil', ca:'Aquest telèfon no sembla un mòbil', en:'This number does not look like a mobile'}) : t('promo.clients.noPhone'))}"` : ''}><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
      <button type="button" class="btn btn-fino" onclick="sendPromoClientEmail(${clientId}, '${escapeJsAttr((PROMO_MESSAGE_SUBJECTS[templateKey]&&PROMO_MESSAGE_SUBJECTS[templateKey]())||'')}')" ${!c.email ? `disabled title="${escapeHtml(t('promo.clients.noEmail'))}"` : ''}><i class="ti ti-mail"></i> Email</button>
      <button type="button" class="btn btn-fino" onclick="pmCopiarMensaje()"><i class="ti ti-copy"></i> ${escapeHtml(gl({es:'Copiar', ca:'Copiar', en:'Copy'}))}</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('promo.clients.close')}</button>
    </div>
  `);
  const ta = document.getElementById('promo-msg-text'); if(ta && typeof lpAuto === 'function') lpAuto(ta);
}
function pmCopiarMensaje(){
  const v = (document.getElementById('promo-msg-text') || {}).value || '';
  copiarTextoPlano(v).then(ok => showToast(ok ? gl({es:'Copiado', ca:'Copiat', en:'Copied'}) : gl({es:'No se pudo copiar', ca:'No s\'ha pogut copiar', en:'Could not copy'})));
}
// Copiar texto: la API moderna y, si el navegador la niega (http, iframe), el
// truco del campo oculto.
async function copiarTextoPlano(txt){
  try{ await navigator.clipboard.writeText(txt); return true; }catch(e){}
  try{
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return !!ok;
  }catch(e){ return false; }
}

function sendPromoClientWhatsapp(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.phone){ showToast(t('msg.noPhone')); return; }
  // wa.me quiere el número con prefijo de país: «612345678» a secas no abre
  // ningún chat. whatsappDeTelefono lo completa y descarta los fijos.
  const tel = whatsappDeTelefono(c.phone);
  if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil: WhatsApp no lo abre.', ca:'Aquest telèfon no sembla un mòbil: WhatsApp no l\'obre.', en:'This number does not look like a mobile: WhatsApp will not open it.'})); return; }
  const txt = encodeURIComponent(document.getElementById('promo-msg-text').value);
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
}

function sendPromoClientEmail(id, subject){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.email){ showToast(t('msg.noEmail')); return; }
  const body = encodeURIComponent(document.getElementById('promo-msg-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(c.email)+'?subject='+encodeURIComponent(subject)+'&body='+body;
}

// Deja constancia en el calendario de Promoción (Día/Mes) de una acción de
// fidelización de clientes ya hecha, para que quede en el mismo historial
// de "hecho/doneAt" que el resto de acciones, y no sea un flujo aislado.
const CLIENT_OUTREACH_LABELS = {
  cumple: () => t('promo.clients.outreachLabel.cumple'),
  resena: () => t('promo.clients.outreachLabel.resena'),
  vuelve: () => t('promo.clients.outreachLabel.vuelve'),
  nps: () => t('promo.clients.outreachLabel.nps')
};
function registerClientOutreachAsPromo(clientId, templateKey){
  const c = DB.clients.find(x=>x.id===clientId);
  if(!c) return;
  const now = new Date();
  const label = (CLIENT_OUTREACH_LABELS[templateKey] && CLIENT_OUTREACH_LABELS[templateKey]()) || t('promo.clients.outreachLabel.default');
  DB.promos.push({
    id: genId(), fecha: todayStr(),
    titulo: `${label} ${c.name}`,
    descripcion: t('promo.clients.outreachDescription'),
    responsableId: null, done: true, doneAt: now.toISOString(), zona: currentArea(),
    clienteId: clientId, ideaRef: {clientTemplate: templateKey}
  });
  saveDB();
  renderPromoClientes();
  showToast(t('promo.clients.outreachRegistered'));
}

/* Los platos y bebidas con los que se puede hacer una promoción con
   descuento. Antes, desde Sala, el desplegable solo traía las BEBIDAS (el
   filtro por área de getAllDishNames): un restaurante no podía rebajar una
   hamburguesa desde Promoción, que es lo primero que se prueba. El TPV vende
   las dos cosas, así que aquí se ofrecen todas, separadas por tipo. */
function promoDishOptions(){
  const platos = new Map(), bebidas = new Map();
  (DB.cartas || []).forEach(c => {
    const destino = isBebidaCarta(c) ? bebidas : platos;
    (c.secciones || []).forEach(sec => (sec.platos || []).forEach(p => {
      if(p.nombre && !destino.has(p.nombre)) destino.set(p.nombre, p);
    }));
  });
  (DB.recipes || []).forEach(r => {
    if(!r.name || r.isBase) return;
    const destino = (r.area || 'cocina') === 'sala' ? bebidas : platos;
    if(!destino.has(r.name) && !platos.has(r.name) && !bebidas.has(r.name)) destino.set(r.name, null);
  });
  const orden = m => [...m.keys()].sort((a, b) => a.localeCompare(b));
  return {platos: orden(platos), bebidas: orden(bebidas)};
}
// Precio de carta de un plato/bebida por nombre (para enseñar el antes y el después).
function promoPrecioDePlato(name){
  for(const c of (DB.cartas || [])){
    for(const sec of (c.secciones || [])){
      const p = (sec.platos || []).find(x => x.nombre === name);
      if(p && Number(p.precio) > 0) return Number(p.precio);
    }
  }
  return null;
}
function promoPrecioPrev(){
  const out = document.getElementById('promo-precio-prev');
  if(!out) return;
  const nombre = (document.getElementById('promo-dish') || {}).value;
  const pct = parseInt((document.getElementById('promo-discount-pct') || {}).value);
  const precio = nombre ? promoPrecioDePlato(nombre) : null;
  if(!precio || !(pct > 0)){ out.textContent = ''; return; }
  const nuevo = Math.round(precio * (1 - Math.min(100, pct) / 100) * 100) / 100;
  out.innerHTML = `<i class="ti ti-tag"></i> ${escapeHtml(gl({es:'En carta', ca:'A la carta', en:'On the menu'}))}: <s>${fmtMoney(precio)}</s> → <b>${fmtMoney(nuevo)}</b>`;
}

// Guarda el ideaRef de la idea de contenido con la que se abrió el modal
// (si viene de "Crear acción"/"Sorpréndeme"), para que savePromo lo adjunte
// al crear la promo y así poder marcar esa idea como ya usada.
let pendingPromoIdeaRef = null;
function openPromoModal(id, fecha, prefill){
  const p = id ? DB.promos.find(x=>x.id===id) : {fecha: fecha || promoDate || todayStr(), titulo:(prefill&&prefill.titulo)||'', descripcion:(prefill&&prefill.descripcion)||'', responsableId:null, recurrence:null, hasta:null, menuItemName:null, discountPct:null, horaInicio:null, horaFin:null, maxUses:null};
  if(!p){ showToast(t('msg.promoNotFound')); return; }
  pendingPromoIdeaRef = (!id && prefill && prefill.ideaRef) ? prefill.ideaRef : null;
  const ro = !editUnlocked;
  const dis = ro ? 'disabled' : '';
  const dishes = promoDishOptions();
  const hasDiscount = !!p.menuItemName;
  const opcion = n => `<option value="${escapeHtml(n)}" ${p.menuItemName===n?'selected':''}>${escapeHtml(n)}</option>`;
  const conocido = p.menuItemName && (dishes.platos.includes(p.menuItemName) || dishes.bebidas.includes(p.menuItemName));

  openModal(`
    <div class="modal-header">
      <h3>${id?t('promo.modal.editTitle'):t('promo.modal.newTitle')}</h3>
      <button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('promo.modal.close'))}">&times;</button>
    </div>
    <div class="pr-sec pm-sec-modal">
      <div class="es-tit">${escapeHtml(gl({es:'Qué vas a hacer', ca:'Què faràs', en:'What you will do'}))}</div>
      <div class="field">
        <label for="promo-titulo">${t('promo.modal.title')}</label>
        <input type="text" id="promo-titulo" value="${escapeHtml(p.titulo||'')}" placeholder="${t('promo.modal.titlePlaceholder')}" ${dis}>
      </div>
      <div class="field">
        <label for="promo-descripcion">${t('promo.modal.description')}</label>
        <textarea id="promo-descripcion" class="lp-auto-alto" rows="2" oninput="lpAuto(this)" placeholder="${t('promo.modal.descriptionPlaceholder')}" ${dis}>${escapeHtml(p.descripcion||'')}</textarea>
      </div>
    </div>
    <div class="pr-sec pm-sec-modal">
      <div class="es-tit">${escapeHtml(gl({es:'Cuándo y quién', ca:'Quan i qui', en:'When and who'}))}</div>
      <div class="field-row">
        <div class="field">
          <label for="promo-date">${t('promo.modal.date')}</label>
          <input type="date" id="promo-date" value="${p.fecha}" ${dis}>
        </div>
        <div class="field">
          <label for="promo-responsable">${t('promo.modal.responsible')}</label>
          <select id="promo-responsable" ${dis}>
            <option value="">${t('promo.modal.unassigned')}</option>
            ${DB.employees.filter(e=>(e.area||'cocina')==='sala').map(e=>`<option value="${e.id}" ${p.responsableId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <label class="pm-opcion owner-only">
        <input type="checkbox" id="promo-recurrence" ${p.recurrence==='weekly'?'checked':''} ${dis} onchange="document.getElementById('promo-hasta-campo').hidden=!this.checked">
        <span>${t('promo.modal.recurrenceLabel')}</span>
      </label>
      <p class="pr-ayuda owner-only">${t('promo.modal.recurrenceHint')}</p>
      <div class="field" id="promo-hasta-campo" ${p.recurrence==='weekly' ? '' : 'hidden'}>
        <label for="promo-hasta">${escapeHtml(gl({es:'Se repite hasta (opcional)', ca:'Es repeteix fins (opcional)', en:'Repeats until (optional)'}))}</label>
        <input type="date" id="promo-hasta" value="${escapeHtml(p.hasta||'')}" ${dis}>
        <small class="pr-ayuda">${escapeHtml(gl({es:'Vacío = sin fecha de fin. Pon una para una promo de temporada (verano, Navidad…).', ca:'Buit = sense data de fi. Posa\'n una per a una promo de temporada (estiu, Nadal…).', en:'Empty = no end date. Set one for a seasonal promo (summer, Christmas…).'}))}</small>
      </div>
    </div>
    <div class="pr-sec pm-sec-modal">
      <div class="es-tit">${escapeHtml(gl({es:'Descuento en caja', ca:'Descompte a caixa', en:'Discount at the till'}))}</div>
      <label class="pm-opcion">
        <input type="checkbox" id="promo-has-discount" ${hasDiscount?'checked':''} onchange="togglePromoDiscountFields()" ${dis}>
        <span>${t('promo.modal.hasDiscountLabel')}</span>
      </label>
      <div id="promo-discount-fields" style="display:${hasDiscount?'':'none'}">
        <div class="field-row">
          <div class="field">
            <label for="promo-dish">${t('promo.modal.dish')}</label>
            <select id="promo-dish" ${dis} onchange="promoPrecioPrev()">
              <option value="">${t('label.selectDish')}</option>
              ${p.menuItemName && !conocido ? opcion(p.menuItemName) : ''}
              ${dishes.platos.length ? `<optgroup label="${escapeHtml(gl({es:'Platos', ca:'Plats', en:'Dishes'}))}">${dishes.platos.map(opcion).join('')}</optgroup>` : ''}
              ${dishes.bebidas.length ? `<optgroup label="${escapeHtml(gl({es:'Bebidas', ca:'Begudes', en:'Drinks'}))}">${dishes.bebidas.map(opcion).join('')}</optgroup>` : ''}
            </select>
            ${p.menuItemName && !p.menuItemPlatoId ? `<small style="color:var(--amber,#8A7440)">${t('promo.modal.dishLinkedByNameHint')}</small>` : ''}
          </div>
          <div class="field">
            <label for="promo-discount-pct">${t('promo.modal.discountPct')}</label>
            <input type="number" id="promo-discount-pct" min="1" max="100" step="1" value="${p.discountPct||10}" ${dis} oninput="promoPrecioPrev()">
          </div>
        </div>
        <p class="pr-ayuda" id="promo-precio-prev"></p>
        <p class="pr-ayuda">${t('promo.modal.discountHint')}</p>
        <div class="field-row">
          <div class="field">
            <label for="promo-hora-inicio">${t('promo.modal.horaInicio')}</label>
            <input type="time" id="promo-hora-inicio" value="${p.horaInicio||''}" ${dis}>
          </div>
          <div class="field">
            <label for="promo-hora-fin">${t('promo.modal.horaFin')}</label>
            <input type="time" id="promo-hora-fin" value="${p.horaFin||''}" ${dis}>
          </div>
        </div>
        <p class="pr-ayuda">${t('promo.modal.horaHint')}</p>
        <div class="field">
          <label for="promo-max-uses">${t('promo.modal.maxUses')}</label>
          <input type="number" id="promo-max-uses" min="1" step="1" value="${p.maxUses||''}" placeholder="${t('promo.modal.maxUsesPlaceholder')}" ${dis}>
          ${p.maxUses ? `<small class="pr-ayuda">${t('promo.modal.usedTodayHint').replace('${used}', (p.usedDates&&p.usedDates[todayStr()])||0).replace('${max}', p.maxUses)}</small>` : ''}
        </div>
        <p class="pr-ayuda">${t('promo.modal.maxUsesHint')}</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${ro?t('promo.modal.close'):t('promo.modal.cancel')}</button>
      ${ro ? '' : `<button class="btn btn-primary" onclick="savePromo(${id||'null'})">${t("common.save")}</button>`}
    </div>
  `);
  promoPrecioPrev();
  const ta = document.getElementById('promo-descripcion'); if(ta && typeof lpAuto === 'function') lpAuto(ta);
}
function togglePromoDiscountFields(){
  const checked = document.getElementById('promo-has-discount').checked;
  document.getElementById('promo-discount-fields').style.display = checked ? '' : 'none';
}

async function savePromo(id){
  const fecha = document.getElementById('promo-date').value || todayStr();
  const titulo = document.getElementById('promo-titulo').value.trim();
  const descripcion = document.getElementById('promo-descripcion').value.trim();
  const responsableIdRaw = document.getElementById('promo-responsable').value;
  const responsableId = responsableIdRaw ? parseInt(responsableIdRaw) : null;
  const recurrence = document.getElementById('promo-recurrence').checked ? 'weekly' : null;
  const hastaRaw = (document.getElementById('promo-hasta') || {}).value || '';
  const hasta = recurrence && hastaRaw ? hastaRaw : null;
  const hasDiscount = document.getElementById('promo-has-discount').checked;
  const menuItemName = hasDiscount ? (document.getElementById('promo-dish').value || null) : null;
  const menuItemPlatoId = hasDiscount ? getDishPlatoIdForName(menuItemName) : null;
  const discountPct = hasDiscount ? Math.max(1, Math.min(100, parseInt(document.getElementById('promo-discount-pct').value)||10)) : null;
  const horaInicio = hasDiscount ? (document.getElementById('promo-hora-inicio').value || null) : null;
  const horaFin = hasDiscount ? (document.getElementById('promo-hora-fin').value || null) : null;
  const maxUsesRaw = hasDiscount ? parseInt(document.getElementById('promo-max-uses').value) : NaN;
  const maxUses = hasDiscount && maxUsesRaw > 0 ? maxUsesRaw : null;

  if(!titulo){ showToast(t('msg.indicateTitle')); return; }
  if(hasDiscount && !menuItemName){ showToast(t('msg.selectDish')); return; }
  if(hasDiscount && (!!horaInicio !== !!horaFin)){ showToast(t('msg.promoHorarioIncompleto')); return; }
  // Una promo que termina antes de empezar no se vería nunca y nadie sabría por qué.
  if(hasta && hasta < fecha){ showToast(gl({es:'La fecha de fin no puede ser anterior al día de inicio.', ca:'La data de fi no pot ser anterior al dia d\'inici.', en:'The end date cannot be before the start day.'})); return; }

  // Aviso de posible duplicado: en vez de guardarla igual con solo un toast
  // distinto, se ofrece abrir la que ya existe en su lugar.
  const dupe = DB.promos.find(p => p.id!==id && p.fecha===fecha && p.titulo.toLowerCase()===titulo.toLowerCase() && p.responsableId===responsableId);
  if(dupe && !(await confirmModal(t('promo.confirmDuplicate')))){
    openPromoModal(dupe.id);
    return;
  }

  // Aviso de descuento en conflicto: dos promos con descuento sobre el MISMO
  // plato el mismo día competían en silencio (ganaba la que el .find()
  // encontrase primero, por orden interno, sin ningún criterio) — se avisa
  // igual que con el duplicado por título, comprobando el solape real de
  // fechas (incluye recurrencia semanal) en vez de solo la fecha exacta.
  if(hasDiscount){
    const sameDish = p2 => menuItemPlatoId != null ? p2.menuItemPlatoId === menuItemPlatoId : p2.menuItemName === menuItemName;
    const dayOverlaps = p2 => (recurrence==='weekly' && p2.recurrence==='weekly')
      ? new Date(fecha+'T00:00:00').getDay() === promoWeekday(p2)
      : (promoOccursOn(p2, fecha) || promoOccursOn({fecha, recurrence, hasta}, p2.fecha));
    const conflict = DB.promos.find(p2 => p2.id!==id && p2.discountPct && sameDish(p2) && dayOverlaps(p2)
      && promoTimeRangesOverlap({horaInicio, horaFin}, p2));
    if(conflict && !(await confirmModal(t('promo.confirmDishDiscountConflict').replace('${dish}', menuItemName).replace('${title}', conflict.titulo)))){
      openPromoModal(conflict.id);
      return;
    }
  }

  if(id){
    const promo = DB.promos.find(x=>x.id===id);
    if(!promo){ showToast(t('msg.promoNotFound')); return; }
    Object.assign(promo, {fecha, titulo, descripcion, responsableId, recurrence, hasta, menuItemName, menuItemPlatoId, discountPct, horaInicio, horaFin, maxUses});
  }else{
    DB.promos.push({id: genId(), fecha, titulo, descripcion, responsableId, recurrence, hasta, menuItemName, menuItemPlatoId, discountPct, horaInicio, horaFin, maxUses, usedDates:{}, done:false, doneAt:null, doneDates:{}, zona:'sala', ideaRef: pendingPromoIdeaRef});
  }
  pendingPromoIdeaRef = null;
  saveDB();
  closeModal();
  renderPromocion();
  showToast(t('msg.actionSaved'));
}

// Copia una acción al día siguiente (sin lo hecho ni lo gastado): la forma
// rápida de montar una semana de lo mismo sin rellenar el formulario siete veces.
function duplicarPromo(id){
  const p = DB.promos.find(x => x.id === id);
  if(!p) return;
  const copia = Object.assign({}, p, {
    id: genId(), fecha: pmSumaDias(p.fecha, 1), done: false, doneAt: null, doneDates: {}, usedDates: {},
    clienteId: undefined, ideaRef: p.ideaRef && !p.ideaRef.clientTemplate ? p.ideaRef : null
  });
  if(copia.hasta && copia.hasta < copia.fecha) copia.hasta = null;
  DB.promos.push(copia);
  saveDB();
  promoDate = copia.fecha;
  renderPromocion();
  showToast(gl({es:'Duplicada para el día siguiente', ca:'Duplicada per al dia següent', en:'Duplicated for the next day'}));
}

async function deletePromo(id){
  if(!(await confirmModal(t('msg.confirmDeletePromotion')))) return;
  const p = DB.promos.find(x=>x.id===id);
  DB.promos = DB.promos.filter(p=>p.id!==id);
  if(p) logAudit('delete', t('audit.deletedPromo').replace('${title}', p.titulo));
  saveDB();
  renderPromocion();
}

/* ============================================================
   MI NEGOCIO — Datos del establecimiento
   ============================================================ */
const BUSINESS_TIPOS = ['Restaurante','Bar','Cafetería','Brasería','Cervecería','Gastrobar','Catering','Food truck','Otro'];
// El valor guardado (b.tipo) siempre es el nombre en español (clave estable),
// pero se muestra traducido según el idioma activo — mismo patrón que allergenLabel().
function businessTypeLabel(name){
  const dict = t('businessTypes.map');
  return (dict && dict[name]) || name;
}

// Renderiza los campos de un tramo (seguido o turno): horas de apertura/cierre.
function renderTramoFields(prefix, tramo, label){
  tramo = tramo || {};
  // El input de hora de cierre no puede mostrar literalmente "24:00" (no es
  // un valor válido de <input type="time">), así que un cierre a medianoche
  // guardado como "24:00" se muestra como "00:00" — es el valor más
  // cercano representable, y readTramoFromForm ya sabe volver a
  // interpretarlo como medianoche si se vuelve a guardar sin tocarlo.
  const finDisplay = tramo.fin === '24:00' ? '00:00' : (tramo.fin||'');
  return `
    <div class="mn-tramo-row" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:nowrap">
      <span style="font-size:11.5px;color:var(--muted);min-width:44px">${label}</span>
      <input type="time" id="${prefix}-ini" class="mn-horario-time" value="${escapeHtml(tramo.ini||'')}" style="padding:3px 5px;font-size:12.5px;width:auto;min-height:auto" onchange="saveBusiness()">
      <span style="color:var(--muted);font-size:12px">${t('common.to')}</span>
      <input type="time" id="${prefix}-fin" class="mn-horario-time" value="${escapeHtml(finDisplay)}" style="padding:3px 5px;font-size:12.5px;width:auto;min-height:auto" onchange="saveBusiness()">
    </div>
  `;
}

/* Días cerrados fuera del horario habitual (2/11): vacaciones, obras, un puente, una boda… Se apuntan con fechas y, mientras duran,
   la web de reservas y pedidos no ofrece esos días y la app los trata como cerrados. Los que ya pasaron se pliegan. */
function renderDiasCerradosHtml(){
  const lista = [...((DB.business && DB.business.diasCerrados) || [])].sort((a, b) => (a.desde || '').localeCompare(b.desde || ''));
  const hoy = todayStr();
  const vigentes = lista.filter(c => (c.hasta || c.desde) >= hoy), pasados = lista.filter(c => (c.hasta || c.desde) < hoy);
  const fmt = d => { try{ return new Date(d + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'short', year:'numeric'}); }catch(e){ return d; } };
  const fila = c => `<li class="dc-fila"><span class="dc-fechas"><i class="ti ti-calendar-off"></i> ${escapeHtml(c.hasta && c.hasta !== c.desde ? fmt(c.desde) + ' → ' + fmt(c.hasta) : fmt(c.desde))}</span>${c.motivo ? `<span class="dc-motivo">${escapeHtml(c.motivo)}</span>` : ''}<button type="button" class="btn btn-sm btn-fino is-off" onclick="quitarDiaCerrado('${escapeJsAttr(c.id)}')" aria-label="${escapeHtml(t('common.delete'))}"><i class="ti ti-trash"></i></button></li>`;
  return `
    <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
    <h4 style="margin-top:0"><i class="ti ti-calendar-off"></i> ${escapeHtml(gl({es:'Días cerrados y vacaciones', ca:'Dies tancats i vacances', en:'Closed days and holidays'}))}</h4>
    <p style="font-size:13px;color:var(--muted)">${escapeHtml(gl({es:'Días en los que NO abres aunque tu horario diga que sí: vacaciones, obras, un puente… Mientras duran, la web de reservas y pedidos no ofrece esos días.', ca:'Dies en què NO obres encara que el teu horari digui que sí: vacances, obres, un pont… Mentre duren, la web de reserves i comandes no ofereix aquests dies.', en:'Days you will NOT open even though your hours say so: holidays, works, a long weekend… While they last, the booking and ordering site does not offer those days.'}))}</p>
    ${vigentes.length ? `<ul class="dc-lista">${vigentes.map(fila).join('')}</ul>` : `<p class="txt-xs" style="color:var(--muted)">${escapeHtml(gl({es:'No hay ningún cierre programado.', ca:'No hi ha cap tancament programat.', en:'No closures scheduled.'}))}</p>`}
    <div class="field-row dc-form">
      <div class="field"><label for="dc-desde">${escapeHtml(gl({es:'Desde', ca:'Des de', en:'From'}))}</label><input type="date" id="dc-desde" min="${hoy}"></div>
      <div class="field"><label for="dc-hasta">${escapeHtml(gl({es:'Hasta (incluido)', ca:'Fins (inclòs)', en:'Until (included)'}))}</label><input type="date" id="dc-hasta" min="${hoy}"></div>
      <div class="field"><label for="dc-motivo">${escapeHtml(gl({es:'Motivo (opcional)', ca:'Motiu (opcional)', en:'Reason (optional)'}))}</label><input type="text" id="dc-motivo" maxlength="60" placeholder="${escapeHtml(gl({es:'Vacaciones de verano', ca:'Vacances d\'estiu', en:'Summer holiday'}))}"></div>
    </div>
    <button type="button" class="btn btn-sm btn-primary" onclick="anadirDiaCerrado()"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Añadir cierre', ca:'Afegir tancament', en:'Add closure'}))}</button>
    ${pasados.length ? `<details class="dc-pasados"><summary>${escapeHtml(gl({es:'Cierres pasados', ca:'Tancaments passats', en:'Past closures'}))} (${pasados.length})</summary><ul class="dc-lista">${pasados.map(fila).join('')}</ul></details>` : ''}`;
}
function anadirDiaCerrado(){
  const desde = (document.getElementById('dc-desde') || {}).value || '';
  let hasta = (document.getElementById('dc-hasta') || {}).value || '';
  const motivo = ((document.getElementById('dc-motivo') || {}).value || '').trim().slice(0, 60);
  if(!desde){ showToast(gl({es:'Pon la fecha de inicio del cierre.', ca:'Posa la data d\'inici del tancament.', en:'Enter the closure start date.'})); return; }
  if(!hasta) hasta = desde;
  if(hasta < desde){ showToast(gl({es:'La fecha final no puede ser anterior a la inicial.', ca:'La data final no pot ser anterior a la inicial.', en:'The end date cannot be earlier than the start date.'})); return; }
  if(!Array.isArray(DB.business.diasCerrados)) DB.business.diasCerrados = [];
  // Reservas ya hechas dentro del cierre: se avisa (no se cancelan solas, eso lo decide el negocio).
  const afectadas = (DB.reservations || []).filter(r => r.date >= desde && r.date <= hasta && r.status !== 'cancelada' && r.status !== 'cancelled').length;
  DB.business.diasCerrados.push({id: genId(), desde, hasta, motivo});
  saveDB();
  if(typeof syncPublicMirror === 'function') syncPublicMirror();
  renderMiNegocio();
  showToast(afectadas ? gl({es:'Cierre guardado. Ojo: hay ' + afectadas + ' reserva(s) en esas fechas; avisa a esos clientes.', ca:'Tancament desat. Compte: hi ha ' + afectadas + ' reserva(es) en aquestes dates; avisa aquests clients.', en:'Closure saved. Note: there are ' + afectadas + ' booking(s) on those dates; let those customers know.'}) : gl({es:'Cierre guardado.', ca:'Tancament desat.', en:'Closure saved.'}));
}
function quitarDiaCerrado(id){
  DB.business.diasCerrados = (DB.business.diasCerrados || []).filter(c => String(c.id) !== String(id));
  saveDB();
  if(typeof syncPublicMirror === 'function') syncPublicMirror();
  renderMiNegocio();
}
/* Horario especial (8/11): un día —o unos días— en que abres con OTRAS horas que las de tu semana (una víspera, un evento,
   un festivo con servicio reducido). Se guarda con el mismo formato que un día de la semana (ver horarioEspecialDe en menu.js),
   así que reservas, pedidos, aforo por turno y los avisos del TPV lo usan sin más. Si un día también está en «cerrados», el cierre gana. */
function renderHorarioEspecialHtml(){
  const lista = [...((DB.business && DB.business.horariosEspeciales) || [])].sort((a, b) => (a.desde || '').localeCompare(b.desde || ''));
  const hoy = todayStr();
  const vigentes = lista.filter(c => (c.hasta || c.desde) >= hoy), pasados = lista.filter(c => (c.hasta || c.desde) < hoy);
  const fmt = d => { try{ return new Date(d + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'short', year:'numeric'}); }catch(e){ return d; } };
  const horas = c => (c.turnos || []).filter(x => x && x.ini && x.fin).map(x => escapeHtml(x.ini + ' – ' + x.fin)).join('  ·  ');
  const fila = c => `<li class="dc-fila"><span class="dc-fechas"><i class="ti ti-clock-edit"></i> ${escapeHtml(c.hasta && c.hasta !== c.desde ? fmt(c.desde) + ' → ' + fmt(c.hasta) : fmt(c.desde))}</span><span class="he-horas">${horas(c)}</span>${c.motivo ? `<span class="dc-motivo">${escapeHtml(c.motivo)}</span>` : '<span class="dc-motivo"></span>'}<button type="button" class="btn btn-sm btn-icon" onclick="quitarHorarioEspecial('${escapeJsAttr(String(c.id))}')" data-tip="${escapeHtml(gl({es:'Quitar', ca:'Treure', en:'Remove'}))}" aria-label="${escapeHtml(gl({es:'Quitar este horario especial', ca:'Treure aquest horari especial', en:'Remove this special schedule'}))}"><i class="ti ti-trash"></i></button></li>`;
  return `
    <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
    <h4 style="margin-top:0"><i class="ti ti-clock-edit"></i> ${escapeHtml(gl({es:'Horario especial', ca:'Horari especial', en:'Special hours'}))}</h4>
    <p style="font-size:13px;color:var(--muted)">${escapeHtml(gl({es:'Un día en que abres con otras horas que las de siempre (una víspera, un evento, un festivo con servicio reducido). Ese día, la web de reservas, los pedidos online, el aforo y el TPV usan este horario en lugar del de tu semana.', ca:'Un dia en què obres amb altres hores que les de sempre (una vigília, un esdeveniment, un festiu amb servei reduït). Aquell dia, la web de reserves, les comandes en línia, l\'aforament i el TPV fan servir aquest horari en lloc del de la setmana.', en:'A day when you open at different hours than usual (an eve, an event, a holiday with reduced service). That day the booking site, online orders, capacity and the POS use these hours instead of your weekly ones.'}))}</p>
    ${vigentes.length ? `<ul class="dc-lista">${vigentes.map(fila).join('')}</ul>` : `<p class="txt-xs" style="color:var(--muted)">${escapeHtml(gl({es:'No hay ningún horario especial programado.', ca:'No hi ha cap horari especial programat.', en:'No special hours scheduled.'}))}</p>`}
    <div class="he-form">
      <div class="field"><label for="he-desde">${escapeHtml(gl({es:'Día (o desde)', ca:'Dia (o des de)', en:'Day (or from)'}))}</label><input type="date" id="he-desde" min="${hoy}"></div>
      <div class="field"><label for="he-hasta">${escapeHtml(gl({es:'Hasta (opcional)', ca:'Fins (opcional)', en:'Until (optional)'}))}</label><input type="date" id="he-hasta" min="${hoy}"></div>
      <div class="field he-motivo"><label for="he-motivo">${escapeHtml(gl({es:'Motivo (opcional)', ca:'Motiu (opcional)', en:'Reason (optional)'}))}</label><input type="text" id="he-motivo" maxlength="60" placeholder="${escapeHtml(gl({es:'Nochevieja, evento privado…', ca:'Cap d\'any, esdeveniment privat…', en:'New Year\'s Eve, private event…'}))}"></div>
      <div class="field he-srv"><label for="he-t1-ini">${escapeHtml(gl({es:'Servicio 1', ca:'Servei 1', en:'Service 1'}))}</label><div class="he-par"><input type="time" id="he-t1-ini" aria-label="${escapeHtml(gl({es:'Abre', ca:'Obre', en:'Opens'}))}"><span>–</span><input type="time" id="he-t1-fin" aria-label="${escapeHtml(gl({es:'Cierra', ca:'Tanca', en:'Closes'}))}"></div></div>
      <div class="field he-srv"><label for="he-t2-ini">${escapeHtml(gl({es:'Servicio 2 (si partes el día)', ca:'Servei 2 (si parteixes el dia)', en:'Service 2 (if split)'}))}</label><div class="he-par"><input type="time" id="he-t2-ini" aria-label="${escapeHtml(gl({es:'Abre', ca:'Obre', en:'Opens'}))}"><span>–</span><input type="time" id="he-t2-fin" aria-label="${escapeHtml(gl({es:'Cierra', ca:'Tanca', en:'Closes'}))}"></div></div>
      <div class="he-ok"><button type="button" class="btn btn-sm btn-primary" onclick="anadirHorarioEspecial()"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Añadir horario especial', ca:'Afegir horari especial', en:'Add special hours'}))}</button></div>
    </div>
    ${pasados.length ? `<details class="dc-pasados"><summary>${escapeHtml(gl({es:'Horarios especiales pasados', ca:'Horaris especials passats', en:'Past special hours'}))} (${pasados.length})</summary><ul class="dc-lista">${pasados.map(fila).join('')}</ul></details>` : ''}`;
}
function anadirHorarioEspecial(){
  const v = id => ((document.getElementById(id) || {}).value || '').trim();
  const desde = v('he-desde'); let hasta = v('he-hasta');
  const motivo = v('he-motivo').slice(0, 60);
  const msg = (es, ca, en) => showToast(gl({es, ca, en}));
  if(!desde){ msg('Pon el día del horario especial.', 'Posa el dia de l\'horari especial.', 'Enter the day of the special hours.'); return; }
  if(!hasta) hasta = desde;
  if(hasta < desde){ msg('La fecha final no puede ser anterior a la inicial.', 'La data final no pot ser anterior a la inicial.', 'The end date cannot be earlier than the start date.'); return; }
  const turnos = [];
  for(const n of [1, 2]){
    const ini = v('he-t' + n + '-ini'), fin = v('he-t' + n + '-fin');
    if(!ini && !fin) continue;
    if(!ini || !fin){ msg('Cada servicio necesita hora de apertura y de cierre.', 'Cada servei necessita hora d\'obertura i de tancament.', 'Each service needs an opening and a closing time.'); return; }
    if(ini === fin){ msg('La hora de apertura y la de cierre no pueden ser la misma.', 'L\'hora d\'obertura i la de tancament no poden ser la mateixa.', 'Opening and closing times cannot be the same.'); return; }
    turnos.push({ini, fin});
  }
  if(!turnos.length){ msg('Pon al menos un servicio con su hora de apertura y de cierre.', 'Posa almenys un servei amb la seva hora d\'obertura i de tancament.', 'Enter at least one service with opening and closing times.'); return; }
  // Con dos servicios, el segundo no puede empezar antes de que acabe el primero (se pisarían en el aforo por turno).
  if(turnos.length === 2){
    const m = x => { const [h, mi] = x.split(':').map(Number); return h * 60 + mi; };
    const [a, b] = turnos;
    if(m(a.fin) > m(a.ini) && m(b.ini) < m(a.fin)){ msg('Los dos servicios se pisan: el segundo debe empezar cuando acaba el primero.', 'Els dos serveis es trepitgen: el segon ha de començar quan acaba el primer.', 'The two services overlap: the second must start after the first ends.'); return; }
  }
  if(!Array.isArray(DB.business.horariosEspeciales)) DB.business.horariosEspeciales = [];
  // Dos horarios especiales en el mismo día serían ambiguos: se avisa en vez de elegir uno en silencio.
  const choca = DB.business.horariosEspeciales.some(h => h && h.desde && desde <= (h.hasta || h.desde) && hasta >= h.desde);
  if(choca){ msg('Ya hay un horario especial en esas fechas. Quítalo antes de poner otro.', 'Ja hi ha un horari especial en aquestes dates. Treu-lo abans de posar-ne un altre.', 'There is already special hours on those dates. Remove it before adding another.'); return; }
  const afectadas = (DB.reservations || []).filter(r => r.date >= desde && r.date <= hasta && r.status !== 'cancelada' && r.status !== 'cancelled').length;
  DB.business.horariosEspeciales.push({id: genId(), desde, hasta, motivo, abierto: true, modo: 'turnos', seguido: {ini: '', fin: ''}, turnos});
  saveDB();
  if(typeof syncPublicMirror === 'function') syncPublicMirror();
  renderMiNegocio();
  showToast(afectadas
    ? gl({es:'Horario especial guardado. Ojo: hay ' + afectadas + ' reserva(s) en esas fechas; revisa que encajen.', ca:'Horari especial desat. Compte: hi ha ' + afectadas + ' reserva(es) en aquestes dates; revisa que hi encaixin.', en:'Special hours saved. Note: there are ' + afectadas + ' booking(s) on those dates; check they still fit.'})
    : gl({es:'Horario especial guardado.', ca:'Horari especial desat.', en:'Special hours saved.'}));
}
function quitarHorarioEspecial(id){
  DB.business.horariosEspeciales = (DB.business.horariosEspeciales || []).filter(c => String(c.id) !== String(id));
  saveDB();
  if(typeof syncPublicMirror === 'function') syncPublicMirror();
  renderMiNegocio();
}

function renderHorarioRows(horario){
  horario = horario && horario.length===7 ? horario.map(migrateHorarioDia) : defaultHorario();
  const cards = horario.map((d,i) => {
    const modoSeguido = d.modo === 'seguido';
    return `
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:var(--brand-cream);border-bottom:1px solid var(--border)">
        <label style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;cursor:pointer">
          <input type="checkbox" id="mn-hor-${i}-abierto" ${d.abierto!==false?'checked':''} onchange="toggleHorarioDia(${i})">
          ${weekDayFull(i)}
        </label>
        <select id="mn-hor-${i}-modo" onchange="toggleHorarioModo(${i})" style="padding:4px 6px;font-size:11.5px;width:auto;min-height:32px;display:${d.abierto!==false?'inline-block':'none'}">
          <option value="turnos" ${!modoSeguido?'selected':''}>${t('mn.schedule.byShift')}</option>
          <option value="seguido" ${modoSeguido?'selected':''}>${t('mn.schedule.continuous')}</option>
        </select>
      </div>
      <div id="mn-hor-${i}-turnos" style="display:${d.abierto!==false?'block':'none'};padding:8px 10px">
        <div id="mn-hor-${i}-seguido-box" style="display:${modoSeguido?'block':'none'}">
          ${renderTramoFields(`mn-hor-${i}-seguido`, d.seguido, t('mn.schedule.hours'))}
        </div>
        <div id="mn-hor-${i}-turnos-box" style="display:${modoSeguido?'none':'block'}">
          ${renderTramoFields(`mn-hor-${i}-t1`, d.turnos && d.turnos[0], t('mn.schedule.slot1'))}
          ${renderTramoFields(`mn-hor-${i}-t2`, d.turnos && d.turnos[1], t('mn.schedule.slot2'))}
        </div>
      </div>
    </div>
  `;
  });
  // La nota de la medianoche salía repetida en cada tramo (hasta 21 veces),
  // y era lo que hacía que cada día ocupara el triple de alto de lo
  // necesario. Se dice una sola vez, arriba.
  return `<p style="font-size:11px;color:var(--muted);margin:0 0 6px">${t('mn.schedule.midnightHint')}</p>
    <div class="mn-horario-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${cards.join('')}</div>`;
}

function toggleHorarioDia(i){
  const open = document.getElementById(`mn-hor-${i}-abierto`).checked;
  document.getElementById(`mn-hor-${i}-turnos`).style.display = open ? 'block' : 'none';
  document.getElementById(`mn-hor-${i}-modo`).style.display = open ? 'inline-block' : 'none';
  // Sin silenciar: es el propio horario el que acaba de cambiar, así que la
  // validación (cierre antes que apertura, etc.) tiene que poder bloquear el
  // guardado aquí — silenciarlo era lo que dejaba pasar horarios inválidos
  // sin preguntar nunca. Hallazgo de una auditoría externa.
  saveBusiness();
}

function toggleHorarioModo(i){
  const seguido = document.getElementById(`mn-hor-${i}-modo`).value === 'seguido';
  document.getElementById(`mn-hor-${i}-seguido-box`).style.display = seguido ? 'block' : 'none';
  document.getElementById(`mn-hor-${i}-turnos-box`).style.display = seguido ? 'none' : 'block';
  saveBusiness();
}

// Un <input type="time"> nunca puede llevar el valor "24:00" (el navegador
// lo rechaza y deja el campo vacío sin avisar) — así que cerrar "a
// medianoche" es imposible de teclear literalmente, aunque sea la hora de
// cierre más habitual de bares y restaurantes. Como convención, "00:00"
// tecleado en el campo de HORA DE CIERRE (no en el de inicio, donde 00:00
// sí es una apertura real de madrugada) se interpreta como medianoche y se
// guarda internamente como "24:00", que si compara bien como texto contra
// cualquier hora del día (isTimeAllowed, aforo, corte de pedidos...) sin
// tocar esa lógica.
function readTramoFromForm(prefix){
  const finRaw = document.getElementById(`${prefix}-fin`).value;
  return {
    ini: document.getElementById(`${prefix}-ini`).value,
    fin: finRaw === '00:00' ? '24:00' : finRaw,
  };
}

function readHorarioFromForm(){
  return t('days.full').map((_,i) => ({
    modo: document.getElementById(`mn-hor-${i}-modo`).value,
    abierto: document.getElementById(`mn-hor-${i}-abierto`).checked,
    seguido: readTramoFromForm(`mn-hor-${i}-seguido`),
    turnos: [
      readTramoFromForm(`mn-hor-${i}-t1`),
      readTramoFromForm(`mn-hor-${i}-t2`),
    ],
  }));
}

// Detecta horas de fin anteriores al inicio y turnos que se solapan, para
// no dejar que un horario mal introducido rompa en silencio los cálculos
// de aforo/reservas que dependen de él.
function validateHorario(horario){
  const warnings = [];
  const toMin = s => { if(!s) return null; const p = s.split(':'); return parseInt(p[0])*60 + parseInt(p[1]||0); };
  horario.forEach((d, i) => {
    if(d.abierto === false) return;
    const tramos = d.modo === 'seguido' ? [d.seguido] : (d.turnos||[]);
    const ranges = [];
    (tramos||[]).forEach(tr => {
      if(!tr || !tr.ini || !tr.fin) return;
      const ini = toMin(tr.ini), fin = toMin(tr.fin);
      if(fin <= ini){ warnings.push(`${weekDayFull(i)}: ${t('msg.scheduleEndBeforeStart')}`); return; }
      ranges.push([ini, fin]);
    });
    if(ranges.length === 2){
      const [[a1,a2],[b1,b2]] = ranges;
      if(a1 < b2 && b1 < a2) warnings.push(`${weekDayFull(i)}: ${t('msg.scheduleShiftsOverlap')}`);
    }
  });
  return warnings;
}

// Antelación mínima: hasta ahora era un único ajuste compartido entre
// reservas y pedidos online (DB.business.leadTimeMin, con una copia
// redundante en DB.business.pedidos.leadTimeMin). Un negocio puede querer
// pedir más antelación para reservar mesa que para un pedido para llevar
// (o al revés), así que se separan en dos campos nuevos. Los negocios que
// ya tenían el ajuste antiguo migran su mismo valor a ambos campos nuevos
// la primera vez que se abre Mi Negocio (ver saveBusiness), sin perder nada.
function leadTimeMinFor(b, kind){
  const specific = kind === 'reservas' ? b.leadTimeMinReservas : b.leadTimeMinPedidos;
  if(specific != null) return specific;
  return b.leadTimeMin != null ? b.leadTimeMin : (b.pedidos?.leadTimeMin || '');
}

// La antelación se guarda internamente en minutos totales (leadTimeMinReservas/
// leadTimeMinPedidos), pero escribir "2160" para decir "1 día y 12 horas" es
// poco amigable — se muestra y edita como tres campos días/horas/minutos que
// se recombinan a minutos totales al guardar (ver readLeadTimeDHM en saveBusiness).
function minutesToDHM(totalMin){
  totalMin = Math.max(0, parseInt(totalMin) || 0);
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60 };
}
function leadTimeFieldHtml(idPrefix, totalMinutes){
  const {d,h,m} = minutesToDHM(totalMinutes);
  return `
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input type="number" id="${idPrefix}-d" min="0" max="30" value="${d}" style="width:56px" onchange="saveBusiness(true)">
      <span style="font-size:12.5px;color:var(--muted)">${t('common.days')}</span>
      <input type="number" id="${idPrefix}-h" min="0" max="23" value="${h}" style="width:56px" onchange="saveBusiness(true)">
      <span style="font-size:12.5px;color:var(--muted)">${t('common.hours')}</span>
      <input type="number" id="${idPrefix}-m" min="0" max="59" step="5" value="${m}" style="width:56px" onchange="saveBusiness(true)">
      <span style="font-size:12.5px;color:var(--muted)">${t('common.minutes')}</span>
    </div>
  `;
}
function readLeadTimeDHM(idPrefix){
  const el = id => document.getElementById(id);
  const d = el(idPrefix + '-d'), h = el(idPrefix + '-h'), m = el(idPrefix + '-m');
  if(!d || !h || !m) return null;
  return Math.max(0, (parseInt(d.value)||0)*1440 + (parseInt(h.value)||0)*60 + (parseInt(m.value)||0));
}

// Última barrera antes de pintar Mi Negocio, por si se llega aquí
// saltándose navigate()/renderView() (p.ej. renderMiNegocio() a mano desde
// la consola de un dispositivo de empleado).
/* Mi Negocio son 24 apartados y casi 16 pantallas de móvil seguidas: para
   cambiar un teléfono o llegar a "Mantenimiento de datos" hay que
   recorrerla entera. Se le pone un índice arriba que salta a cada sitio.

   Se construye SOBRE LO YA PINTADO en vez de tocar las diez funciones que
   generan los apartados: así el índice se mantiene solo si mañana se
   añade o se quita uno. */
function renderMiNegocioIndice(){
  const cont = document.getElementById('minegocio-content');
  if(!cont) return;
  const grid = cont.querySelector('.mn-grid');
  if(!grid) return;
  cont.querySelector('.mn-indice')?.remove();

  const apartados = [...grid.children]
    .filter(el => el.classList && el.classList.contains('card'))
    .map((el, i) => {
      const h = el.querySelector('h3');
      if(!h) return null;
      if(!el.id) el.id = 'mn-ap-' + i;
      // Solo el texto, sin el icono, y sin insignias tipo "Próximamente"
      const titulo = [...h.childNodes]
        .filter(n => n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('badge') && n.tagName !== 'I'))
        .map(n => n.textContent).join(' ').trim().replace(/\s+/g, ' ');
      return titulo ? {id: el.id, titulo} : null;
    })
    .filter(Boolean);
  mnAcordeonAplicar(grid);   // en móvil, cada apartado es un acordeón (ver más abajo)
  if(apartados.length < 5) return;   // con pocos apartados el índice sobra

  const nav = document.createElement('div');
  nav.className = 'mn-indice';
  // En móvil los 14 accesos ocupaban unos 400 px antes del primer bloque: allí se ve UN desplegable («Ir a: …») y los botones se
  // quedan para PC. Mismos apartados, mismo destino (irAApartadoMiNegocio).
  nav.innerHTML = `<span class="mn-indice-lbl">${escapeHtml(t('mn.indexLabel'))}</span>` +
    apartados.map(a => `<button type="button" class="mn-indice-chip" onclick="irAApartadoMiNegocio('${a.id}')">${escapeHtml(a.titulo)}</button>`).join('') +
    `<select class="mn-indice-sel" id="mn-indice-sel" aria-label="${escapeHtml(t('mn.indexLabel'))}" onchange="if(this.value){irAApartadoMiNegocio(this.value); this.selectedIndex=0;}">
      <option value="">${escapeHtml(t('mn.indexLabel'))} …</option>` +
    apartados.map(a => `<option value="${a.id}">${escapeHtml(a.titulo)}</option>`).join('') + `</select>`;
  cont.insertBefore(nav, cont.firstChild);
  updateTabRowFade(nav);
}
/* Mi Negocio en móvil (7/11): 24 apartados seguidos eran ~16.850 px (casi 20 pantallas). En móvil cada apartado es un ACORDEÓN: se ve
   su título y se abre con un toque. Lo abierto se recuerda (MN_ABIERTOS) porque guardar repinta toda la pantalla y, si no, se
   plegaría lo que acabas de editar. En PC no cambia nada (las reglas solo viven en el @media del CSS). */
const MN_ABIERTOS = new Set();
function mnAcordeonAplicar(grid){
  [...grid.children].filter(el => el.classList && el.classList.contains('card') && el.querySelector(':scope > h3')).forEach(el => {
    if(!el.id) return;
    const h = el.querySelector(':scope > h3'), abierto = MN_ABIERTOS.has(el.id);
    el.classList.add('mn-acc'); el.classList.toggle('mn-cerrado', !abierto);
    h.setAttribute('role', 'button'); h.tabIndex = 0; h.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    h.addEventListener('click', () => mnToggle(el.id));
    h.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); mnToggle(el.id); } });
  });
}
function mnToggle(id, abrir){
  const el = document.getElementById(id); if(!el || !el.classList.contains('mn-acc')) return;
  const ab = abrir === undefined ? el.classList.contains('mn-cerrado') : !!abrir;
  el.classList.toggle('mn-cerrado', !ab);
  ab ? MN_ABIERTOS.add(id) : MN_ABIERTOS.delete(id);
  const h = el.querySelector(':scope > h3'); if(h) h.setAttribute('aria-expanded', ab ? 'true' : 'false');
}
// Abre el apartado que contiene un elemento (para saltar a un campo concreto desde otra pantalla).
function mnAbrirDe(el){ const card = el && el.closest && el.closest('.mn-acc'); if(card) mnToggle(card.id, true); }
function irAApartadoMiNegocio(id){
  const el = document.getElementById(id);
  if(!el) return;
  mnToggle(id, true);   // en móvil el apartado puede estar plegado: se abre antes de saltar
  el.scrollIntoView({behavior:'smooth', block:'start'});
  // Un destello breve para que se vea a cuál se ha saltado: en una pantalla
  // tan larga, aterrizar sin más deja dudando si se ha movido algo.
  el.classList.add('mn-ap-resaltado');
  setTimeout(()=>el.classList.remove('mn-ap-resaltado'), 1400);
}

// El seguimiento mensual (acumulativo, sin fecha de fin) es OTRA cosa y se
// plantea aparte: esto es solo el programa inicial. Cada negocio tiene su
// PROPIA copia editable de todo (ensurePlan360Program, js/core.js), así
// que tocar algo aquí no afecta a ningún otro cliente.
//
// Agenda de fechas REALES (no "Día 1, Día 2..."): el día 1 es el día en
// que de verdad arranca el programa con ese cliente (DB.business.plan360StartDate,
// fijado una sola vez). Documentación inicial (antes "Día 0") y Recursos
// (antes "GG") son sitios aparte, no casillas de la cuadrícula de trabajo.
// Cada casilla —día, documentación, recursos, resumen— es una pantalla
// completa a la que se entra (sustituye todo #plan360-content), no un
// modal flotante encima.
function plan360PriorityColor(p){
  return p === 'alta' ? 'var(--red)' : p === 'media' ? 'var(--amber)' : p === 'baja' ? 'var(--green)' : null;
}
// Urgencia de los OBJETIVOS (prioritario/esencial/complementario) —
// distinta de la prioridad del DÍA (alta/media/baja) de arriba.
function plan360ObjPriorityColor(p){
  return p === 'prioritario' ? 'var(--red)' : p === 'esencial' ? 'var(--amber)' : p === 'complementario' ? 'var(--green)' : null;
}
function plan360EnfoqueColorHex(c){
  return c === 'rojo' ? 'var(--red)' : c === 'ambar' ? 'var(--amber)' : c === 'verde' ? 'var(--green)' : 'var(--border)';
}
function plan360FormatDate(day){
  const dstr = plan360DateForDay(day);
  const [y, m, d] = dstr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString(localeActual(), {weekday: 'short'}),
    dayMonth: dt.toLocaleDateString(localeActual(), {day: 'numeric', month: 'short'}),
  };
}
function renderPlan360(){
  if(isGestionLocked('plan360')){ denyGestionAccess(); return; }
  ensurePlan360Program();
  if(!DB.business.plan360WelcomeShown){ renderPlan360Welcome(false); return; }
  renderPlan360Grid();
}
// Un texto plano (carta de bienvenida, contrato) con la jerarquía que ya trae: las líneas en
// MAYÚSCULAS son títulos de apartado y las que empiezan por «—» son puntos de lista.
// Se compone al pintar; el texto guardado y firmado no cambia ni un carácter.
function plan360TextoHtml(texto){
  let html = '', lista = false;
  const cierra = () => { if(lista){ html += '</ul>'; lista = false; } };
  String(texto || '').split('\n').forEach(l => {
    const x = l.trim();
    if(!x){ cierra(); return; }
    if(/^[—–-]\s/.test(x)){ if(!lista){ html += '<ul class="p360-txt-ul">'; lista = true; } html += `<li>${escapeHtml(x.replace(/^[—–-]\s*/, ''))}</li>`; return; }
    cierra();
    if(x.length >= 6 && x === x.toUpperCase() && !/[a-záéíóúñ]/.test(x) && /[A-ZÁÉÍÓÚÑ]/.test(x)){ html += `<h4 class="p360-txt-h">${escapeHtml(x)}</h4>`; return; }
    html += `<p>${escapeHtml(x)}</p>`;
  });
  cierra();
  return html;
}
// La carta se ve entera una vez, sola, la primera vez que se entra — y
// queda siempre accesible después desde Documentación inicial (fromIntake).
function renderPlan360Welcome(fromIntake){
  const nombre = (DB.business.plan360Contract && DB.business.plan360Contract.clienteNombre) || DB.business.name || '';
  const texto = plan360FillTemplate(PLAN360_WELCOME_TEXT, {clienteNombre: nombre});
  const volver = fromIntake ? `<button class="btn btn-sm btn-back" onclick="renderPlan360Intake()"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>` : '';
  document.getElementById('plan360-content').innerHTML = `
    ${volver}
    <div class="card p360-txt" style="margin-top:${fromIntake ? '10' : '0'}px">${plan360TextoHtml(texto)}</div>
    ${fromIntake ? '' : `<button class="btn btn-primary" style="margin-top:14px" onclick="plan360ConfirmWelcome()">${escapeHtml(t('plan360.welcomeContinue'))}</button>`}
  `;
}
// Pulsar "Entendido, continuar" ES la confirmación de recepción que pide
// la propia carta como primer paso — no hace falta un botón aparte para
// lo mismo. Avisa al coach de que ya se ha leído.
function plan360ConfirmWelcome(){
  DB.business.plan360WelcomeShown = true;
  DB.business.plan360ReceivedConfirmedAt = Date.now();
  saveDB();
  plan360PingActivity();
  renderPlan360Grid();
}
// Qué día N del programa cae HOY, comparando la fecha real contra
// plan360StartDate — así "Hoy" y "atrasado" se calculan contra el
// calendario, no contra un contador suelto. Devuelve null si el negocio
// todavía no tiene fecha de arranque fijada (no debería pasar: se fija
// sola al crear el programa, ver ensurePlan360Program en js/core.js).
function plan360DiaDeHoy(){
  const start = DB.business.plan360StartDate;
  if(!start) return null;
  const [ys, ms, ds] = start.split('-').map(Number);
  const [yt, mt, dt] = todayStr().split('-').map(Number);
  const diffDays = Math.round((new Date(yt, mt - 1, dt) - new Date(ys, ms - 1, ds)) / 86400000);
  return diffDays + 1;
}
// Cualquier tarea de un día de trabajo YA PASADO que no esté "hecha" —
// da igual que esté en pendiente o en no_hecha, las dos cuentan como
// trabajo que se quedó sin cerrar. Es la pieza que de verdad desincentiva
// posponer: lo que no se hizo no desaparece, se acumula y se ve.
function plan360TareasAtrasadas(diaHoy){
  const prog = DB.business.plan360Program || [];
  const atrasadas = [];
  prog.filter(d => d.phase === 'trabajo' && d.day < diaHoy).forEach(d => {
    (d.tasks || []).forEach((tk, i) => {
      if(tk.title && tk.status !== 'hecha') atrasadas.push({day: d.day, i, tk, retraso: diaHoy - d.day});
    });
  });
  return atrasadas;
}
// La tarjeta "Hoy": lo primero que se ve al entrar a Plan 360°, sin tener
// que buscar el día en el calendario de abajo. Muestra las tareas de HOY
// mismo (con sus botones de estado, ya operativos) y, si las hay, las
// atrasadas de días anteriores — con cuántos días de retraso llevan cada
// una, para que ignorarlas cueste ver algo en vez de no ver nada.
function plan360HoyCardHtml(){
  const diaHoy = plan360DiaDeHoy();
  if(diaHoy === null) return '';
  const prog = DB.business.plan360Program || [];
  const dHoy = prog.find(x => x.day === diaHoy);
  const atrasadas = plan360TareasAtrasadas(diaHoy);
  const fechaHoy = dHoy ? plan360FormatDate(diaHoy) : {weekday: '', dayMonth: ''};

  let cuerpoHoy;
  if(!dHoy){
    cuerpoHoy = `<p class="muted" style="margin:0">${escapeHtml(t(diaHoy < 1 ? 'plan360.programNotStartedYet' : 'plan360.programFinished'))}</p>`;
  } else if(dHoy.phase === 'presencial'){
    cuerpoHoy = `<p style="margin:0 0 10px;font-size:13.5px">${escapeHtml(t('plan360.todayIsPresencial'))}</p><button class="btn btn-sm" onclick="renderPlan360DayDetail(${diaHoy})">${escapeHtml(t('common.view'))} <i class="ti ti-chevron-right"></i></button>`;
  } else {
    const conTitulo = dHoy.tasks.filter(tk => tk.title);
    cuerpoHoy = conTitulo.length
      ? dHoy.tasks.map((tk, i) => tk.title ? plan360TaskRow(diaHoy, tk, i) : '').join('')
      : `<p class="muted" style="margin:0">${escapeHtml(t('plan360.todayNoTasks'))}</p>`;
  }

  return `<div class="card" style="margin-bottom:14px;border-left:3px solid var(--ink);box-shadow:0 6px 18px rgba(28,26,23,.08)">
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px">
      <strong style="font-size:16px"><i class="ti ti-sun"></i> ${escapeHtml(t('plan360.today'))}</strong>
      ${dHoy ? `<span class="muted" style="font-size:12px">${escapeHtml(fechaHoy.weekday)} · ${escapeHtml(fechaHoy.dayMonth)}</span>` : ''}
    </div>
    ${cuerpoHoy}
    ${atrasadas.length ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-weight:700;color:var(--red);font-size:13px;margin-bottom:8px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('plan360.overdue'))} (${atrasadas.length})</div>
        ${atrasadas.map(a => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border);cursor:pointer" onclick="renderPlan360DayDetail(${a.day})">
            <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;color:#fff;background:var(--red);flex:none;white-space:nowrap">${escapeHtml(a.retraso === 1 ? t('plan360.overdueOneDay') : t('plan360.overdueDays').replace('${n}', String(a.retraso)))}</span>
            <span style="flex:1;font-size:13px">${escapeHtml(a.tk.title)}</span>
          </div>
        `).join('')}
      </div>` : ''}
  </div>`;
}
// La cabecera de todo Plan 360º: día del programa, tareas hechas y
// objetivos cumplidos, con una barra de avance — lo primero que se ve al
// entrar, para que de un vistazo se sepa "dónde estoy" sin tener que
// bajar a buscarlo en el calendario o en el resumen.
function plan360HeroHtml(diaHoy, hechos, totalTareas){
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  const objetivos = ((dia2 && dia2.objectives) || []).filter(o => o.titulo);
  const cumplidos = objetivos.filter(o => o.estadoFinal === 'cumplido').length;
  const diaMostrado = diaHoy === null ? 0 : Math.max(1, Math.min(28, diaHoy));
  const pct = totalTareas ? Math.round((hechos / totalTareas) * 100) : 0;
  return `<div class="p360-hero">
    <div class="p360-hero-title">${escapeHtml(t('plan360.programTitle'))}</div>
    <div class="p360-hero-sub">${escapeHtml(t('plan360.heroSub'))}</div>
    <div class="p360-hero-stats">
      <div class="p360-hero-stat"><div class="p360-hero-stat-num">${diaMostrado}<span style="font-size:14px;opacity:.6">/28</span></div><div class="p360-hero-stat-label">${escapeHtml(t('plan360.heroDay'))}</div></div>
      <div class="p360-hero-stat"><div class="p360-hero-stat-num">${hechos}<span style="font-size:14px;opacity:.6">/${totalTareas}</span></div><div class="p360-hero-stat-label">${escapeHtml(t('plan360.tasksDone'))}</div></div>
      <div class="p360-hero-stat"><div class="p360-hero-stat-num">${cumplidos}<span style="font-size:14px;opacity:.6">/${objetivos.length}</span></div><div class="p360-hero-stat-label">${escapeHtml(t('plan360.heroObjectives'))}</div></div>
    </div>
    <div class="p360-hero-bar"><div class="p360-hero-bar-fill" style="width:${pct}%"></div></div>
  </div>`;
}
let plan360MantAutoAbierto = false;
function renderPlan360Grid(){
  // En mantenimiento, lo que toca es su mes, no el calendario de 28 días
  // (que sigue a un clic, como histórico). Solo la primera vez por sesión.
  if(!plan360MantAutoAbierto && (DB.business.plan360Servicio || {}).fase === 'mant'){ plan360MantAutoAbierto = true; renderPlan360Mant(); return; }
  plan360MantAutoAbierto = true;
  const prog = DB.business.plan360Program || [];
  const trabajo = prog.filter(d => d.phase === 'trabajo');
  const hechos = trabajo.reduce((n, d) => n + d.tasks.filter(x => x.status === 'hecha').length, 0);
  const totalTareas = trabajo.reduce((n, d) => n + d.tasks.length, 0);
  const diaHoy = plan360DiaDeHoy();

  // Semanas de verdad (lunes a domingo), no bloques sueltos de 7 — así la
  // cuadrícula se lee como un calendario real.
  const semanas = [];
  prog.forEach(d => {
    const fecha = plan360DateForDay(d.day);
    const [y, m, dd] = fecha.split('-').map(Number);
    const diaSemana = (new Date(y, m - 1, dd).getDay() + 6) % 7; // 0 = lunes
    const inicioSemana = addDaysStr(fecha, -diaSemana);
    let semana = semanas.find(s => s.inicio === inicioSemana);
    if(!semana){ semana = {inicio: inicioSemana, dias: []}; semanas.push(semana); }
    semana.dias.push(d);
  });

  const dayCard = (d, k, dias) => {
    const {weekday, dayMonth} = plan360FormatDate(d.day);
    // Cada día en SU columna (lunes = 1): la primera semana del programa
    // puede empezar un domingo y, sin esto, aparecía en la columna del lunes.
    const [yy, mm, ddd] = plan360DateForDay(d.day).split('-').map(Number);
    const col = (new Date(yy, mm - 1, ddd).getDay() + 6) % 7 + 1;
    const colStyle = k === 0 ? `grid-column-start:${col};` : '';
    const [diaNum, ...mesPartes] = dayMonth.split(' ');
    const fechaHtml = `${escapeHtml(diaNum)}<span class="p360-day-mes"> ${escapeHtml(mesPartes.join(' '))}</span>`;
    const esHoy = d.day === diaHoy;
    const anillo = esHoy ? 'outline:2px solid var(--ink);outline-offset:-2px' : '';
    if(d.phase === 'presencial'){
      return `<div class="p360-day p360-day-presencial" style="${colStyle}${anillo}" onclick="renderPlan360DayDetail(${d.day})">
        <div class="p360-day-weekday">${escapeHtml(weekday)}</div>
        <div class="p360-day-date">${fechaHtml}</div>
        <div class="p360-day-tag"><i class="ti ti-users"></i><span class="p360-tag-txt"> ${escapeHtml(t('plan360.presencial'))}</span></div>
      </div>`;
    }
    const pendientes = d.tasks.filter(tk => tk.title && tk.status !== 'hecha').length;
    const atrasado = diaHoy !== null && d.day < diaHoy && pendientes > 0;
    const colorBorde = atrasado ? 'var(--red)' : plan360PriorityColor(d.priority);
    const done = d.tasks.length && d.tasks.every(x => x.status === 'hecha');
    const doneCount = d.tasks.filter(x => x.status === 'hecha').length;
    return `<div class="p360-day" style="${colStyle}${colorBorde ? 'border-left-color:' + colorBorde + ';' : ''}${anillo}" onclick="renderPlan360DayDetail(${d.day})">
      <div class="p360-day-weekday">${escapeHtml(weekday)}</div>
      <div class="p360-day-date">${fechaHtml}</div>
      ${atrasado ? `<div class="p360-day-tag" style="color:var(--red);font-weight:700"><i class="ti ti-alert-triangle"></i><span class="p360-tag-txt"> ${escapeHtml(t('plan360.overdueShort'))}</span></div>`
        : d.reunion ? `<div class="p360-day-tag"><i class="ti ${d.reunion.tipo === 'online' ? 'ti-video' : 'ti-users'}"></i><span class="p360-tag-txt"> ${escapeHtml(t('plan360.reviewType.' + d.reunion.tipo))}</span></div>` : ''}
      ${d.tasks.length ? `<div class="p360-day-progress">${done ? '<i class="ti ti-circle-check"></i>' : doneCount + '/' + d.tasks.length}</div>` : ''}
    </div>`;
  };

  document.getElementById('plan360-content').innerHTML = `
    ${plan360HeroHtml(diaHoy, hechos, totalTareas)}
    ${plan360HoyCardHtml()}
    <div class="p360-toprow">
      <div class="p360-card" onclick="renderPlan360Intake()">
        <i class="ti ti-clipboard-text"></i>
        <div><h3>${escapeHtml(t('plan360.initialDocs'))}</h3><p>${escapeHtml(t('plan360.initialDocsDesc'))}</p></div>
      </div>
      <div class="p360-card" onclick="renderPlan360Docs()">
        <i class="ti ti-folder"></i>
        <div><h3>${escapeHtml(t('plan360.resources'))}</h3><p>${escapeHtml(t('plan360.resourcesDesc'))}</p></div>
      </div>
      ${plan360MantHayAlgo() ? `<div class="p360-card" onclick="renderPlan360Mant()">
        <i class="ti ti-calendar-repeat"></i>
        <div><h3>${escapeHtml(t('plan360.mant.title'))}</h3><p>${escapeHtml(t('plan360.mant.cardDesc'))}</p></div>
      </div>` : ''}
    </div>
    <div class="card p360-summary-bar" onclick="renderPlan360SummaryPage()">
      <div><i class="ti ti-compass"></i> ${escapeHtml(t('plan360.programTitle'))}</div>
      <div class="p360-summary-count"><i class="ti ti-star"></i> ${hechos} / ${totalTareas}</div>
    </div>
    ${semanas.map((s, i) => `
      <div class="p360-week">
        <div class="p360-week-label">${escapeHtml(t('plan360.week'))} ${i + 1}</div>
        <div class="p360-week-grid">${s.dias.map(dayCard).join('')}</div>
      </div>
    `).join('')}
    ${plan360CierreHtml()}
  `;
}
// Debajo de la última semana, a propósito: es lo que viene después de las
// 4 semanas. Los KPI antes→hoy y qué objetivos se cumplieron los rellena
// el coach en la revisión final — aquí solo se leen. Lo único que el
// negocio SÍ toca es la respuesta al plan de mantenimiento: una oferta
// real, con precio y firma, no un mensaje suelto (mismo criterio que la
// firma del contrato inicial — solo el propietario puede responder).
const PLAN360_ESTADO_FINAL_LABEL = {cumplido: 'plan360.estadoFinal.cumplido', parcial: 'plan360.estadoFinal.parcial', no_cumplido: 'plan360.estadoFinal.noCumplido'};
const PLAN360_ESTADO_FINAL_COLOR = {cumplido: 'var(--green)', parcial: 'var(--amber)', no_cumplido: 'var(--red)'};
const PLAN360_CIERRE_KPIS = [
  {key: 'notaLocal', label: 'plan360.kpi.notaLocal'},
  {key: 'ticketMedio', label: 'plan360.kpi.ticketMedio'},
  {key: 'foodCostPct', label: 'plan360.kpi.foodCostPct'},
  {key: 'costePersonalPct', label: 'plan360.kpi.costePersonalPct'},
  {key: 'ventasMensuales', label: 'plan360.kpi.ventasMensuales'},
  {key: 'resenasGoogle', label: 'plan360.kpi.resenasGoogle'},
  {key: 'horasSemanaDueno', label: 'plan360.kpi.horasSemanaDueno'},
];
const PLAN360_NIVEL_LABEL = {prioritario: 'plan360.priority.prioritario', esencial: 'plan360.priority.esencial', complementario: 'plan360.priority.complementario'};
function plan360AccionesPorNivel(){
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  const objetivos = ((dia2 && dia2.objectives) || []);
  const trabajo = (DB.business.plan360Program || []).filter(x => x.phase === 'trabajo');
  const tareas = trabajo.reduce((arr, d) => arr.concat(d.tasks.filter(tk => tk.title)), []);
  return ['prioritario', 'esencial', 'complementario'].map(nivel => {
    const idsDeNivel = new Set(objetivos.filter(o => o.prioridad === nivel).map(o => o.id));
    const deEseNivel = tareas.filter(tk => idsDeNivel.has(tk.objectiveId));
    return {nivel, total: deEseNivel.length, hechas: deEseNivel.filter(tk => tk.status === 'hecha').length};
  });
}
// Balance del mes de trabajo: lo conseguido y lo que falta, en dos
// columnas. Lo que falta es justo lo que se sigue en el mantenimiento, y
// así se presenta: no como un extra, sino como la continuación.
function plan360Balance(objetivos){
  const trabajo = (DB.business.plan360Program || []).filter(x => x.phase === 'trabajo');
  const tareas = trabajo.reduce((arr, d) => arr.concat((d.tasks || []).filter(tk => tk && tk.title)), []);
  return {
    conseguidos: objetivos.filter(o => o.estadoFinal === 'cumplido'),
    pendientes: objetivos.filter(o => o.estadoFinal !== 'cumplido'),
    hechas: tareas.filter(tk => tk.status === 'hecha').length,
    total: tareas.length,
    sinHacer: tareas.filter(tk => tk.status !== 'hecha').map(tk => tk.title),
  };
}
function plan360BalanceHtml(objetivos){
  const b = plan360Balance(objetivos);
  if(!objetivos.length && !b.total) return '';
  const lista = (arr, n) => arr.slice(0, n).map(x => `<li>${escapeHtml(x)}</li>`).join('') + (arr.length > n ? `<li class="muted">${escapeHtml(t('plan360.bal.yMas').replace('${n}', arr.length - n))}</li>` : '');
  return `<div class="card" style="margin-bottom:10px">
    <div style="font-weight:700;margin-bottom:8px">${escapeHtml(t('plan360.bal.titulo'))}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <div><div style="font-weight:600;color:var(--green);margin-bottom:4px"><i class="ti ti-circle-check"></i> ${escapeHtml(t('plan360.bal.conseguido'))}</div>
        <div style="font-size:13px;margin-bottom:4px">${escapeHtml(t('plan360.bal.tareas').replace('${n}', b.hechas).replace('${t}', b.total))}</div>
        ${b.conseguidos.length ? `<ul style="margin:0;padding-left:18px;font-size:13px">${lista(b.conseguidos.map(o => o.titulo), 6)}</ul>` : ''}</div>
      <div><div style="font-weight:600;color:var(--amber-dark);margin-bottom:4px"><i class="ti ti-target-arrow"></i> ${escapeHtml(t('plan360.bal.falta'))}</div>
        ${b.pendientes.length || b.sinHacer.length ? `<ul style="margin:0;padding-left:18px;font-size:13px">${lista([...b.pendientes.map(o => o.titulo), ...b.sinHacer], 6)}</ul>
        <div class="txt-xs" style="color:var(--muted);margin-top:6px">${escapeHtml(t('plan360.bal.seguimos'))}</div>` : `<div style="font-size:13px">${escapeHtml(t('plan360.bal.todo'))}</div>`}</div>
    </div>
  </div>`;
}
function plan360CierreHtml(){
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  const objetivos = ((dia2 && dia2.objectives) || []).filter(o => o.titulo);
  const cierre = DB.business.plan360Cierre;
  if(!cierre) return '';
  const hayKpis = cierre.kpis && Object.values(cierre.kpis).some(v => v && (v.antes || v.hoy));
  const acciones = plan360AccionesPorNivel();
  const hayAcciones = acciones.some(n => n.total > 0);
  const m = cierre.mantenimiento || {};
  // El cierre (y con él la oferta de mantenimiento) solo aparece cuando
  // toca: en el día 28 o cuando el coach ya ha empezado la revisión final.
  // Antes bastaba con tener objetivos — o sea, desde el Día 2 — y el
  // negocio podía «aceptar» el mantenimiento a mitad de programa.
  const diaHoy = plan360DiaDeHoy();
  const revisionFinal = hayKpis || objetivos.some(o => o.estadoFinal) || cierre.mejorasVisibles || cierre.queVigilar || cierre.siguienteNivel;
  if(!((diaHoy !== null && diaHoy >= 28) || revisionFinal || m.respuesta)) return '';
  const esOwner = plan360EsOwner();
  return `
    <div class="p360-week">
      <div class="p360-week-label">${escapeHtml(t('plan360.closing'))}</div>
      ${plan360BalanceHtml(objetivos)}
      ${hayKpis ? `<div class="card" style="margin-bottom:10px">
        <div style="font-weight:600;margin-bottom:8px">${escapeHtml(t('plan360.kpisTitle'))}</div>
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px 10px;align-items:center">
          <div></div><div style="font-size:11px;color:var(--muted);text-align:center">${escapeHtml(t('plan360.kpiBefore'))}</div><div style="font-size:11px;color:var(--muted);text-align:center">${escapeHtml(t('plan360.kpiNow'))}</div>
          ${PLAN360_CIERRE_KPIS.filter(k => cierre.kpis[k.key] && (cierre.kpis[k.key].antes || cierre.kpis[k.key].hoy)).map(k => `
            <div style="font-size:13px">${escapeHtml(t(k.label))}</div>
            <div style="text-align:center;font-size:13px">${escapeHtml(cierre.kpis[k.key].antes || '—')}</div>
            <div style="text-align:center;font-size:13px;font-weight:700">${escapeHtml(cierre.kpis[k.key].hoy || '—')}</div>
          `).join('')}
        </div>
      </div>` : ''}
      ${hayAcciones ? `<div class="card" style="margin-bottom:10px">
        <div style="font-weight:600;margin-bottom:8px">${escapeHtml(t('plan360.actionsByLevel'))}</div>
        ${acciones.filter(n => n.total > 0).map(n => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>${escapeHtml(t(PLAN360_NIVEL_LABEL[n.nivel]))}</span><span>${n.hechas} / ${n.total}</span></div>`).join('')}
      </div>` : ''}
      ${objetivos.length ? `<div class="card" style="margin-bottom:10px">
        ${objetivos.map(o => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <strong style="flex:1">${escapeHtml(o.titulo)}</strong>
              ${o.estadoFinal ? `<span class="p360-day-tag" style="margin:0;background:${PLAN360_ESTADO_FINAL_COLOR[o.estadoFinal]};color:#fff">${escapeHtml(t(PLAN360_ESTADO_FINAL_LABEL[o.estadoFinal]))}</span>` : `<span class="p360-day-tag" style="margin:0">${escapeHtml(t('plan360.estadoFinal.pending'))}</span>`}
            </div>
            ${plan360MedicionesResumenHtml(o)}
          </div>`).join('')}
      </div>` : ''}
      ${(cierre.mejorasVisibles || cierre.queVigilar || cierre.siguienteNivel) ? `<div class="card" style="margin-bottom:10px">
        ${cierre.mejorasVisibles ? `<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--muted)">${escapeHtml(t('plan360.visibleImprovements'))}</div><p style="margin:2px 0 0;font-size:13.5px">${escapeHtml(cierre.mejorasVisibles)}</p></div>` : ''}
        ${cierre.queVigilar ? `<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--muted)">${escapeHtml(t('plan360.watchOutFor'))}</div><p style="margin:2px 0 0;font-size:13.5px">${escapeHtml(cierre.queVigilar)}</p></div>` : ''}
        ${cierre.siguienteNivel ? `<div><div style="font-size:12px;color:var(--muted)">${escapeHtml(t('plan360.nextLevel'))}</div><p style="margin:2px 0 0;font-size:13.5px">${escapeHtml(cierre.siguienteNivel)}</p></div>` : ''}
      </div>` : ''}
      <div class="card" style="background:var(--ink);color:#fff">
        <div style="font-weight:700;margin-bottom:6px"><i class="ti ti-rocket"></i> ${escapeHtml(t('plan360.maintenancePlan'))}</div>
        <p style="margin:0 0 10px;font-size:13.5px;opacity:.9">${escapeHtml(t('plan360.maintenanceIncludes'))}</p>
        <div style="font-size:22px;font-weight:800;margin-bottom:12px">${escapeHtml(m.precio && m.precio !== '99€/mes' && m.precio !== '75€/mes' ? m.precio : '75 € + IVA al mes')}</div>
        ${m.respuesta === 'acepta' ? `<div style="background:rgba(255,255,255,.12);padding:10px;border-radius:8px;font-size:13.5px">
            ✓ ${escapeHtml(t('plan360.maintenanceAccepted'))} <strong>${escapeHtml(m.firmaNombre)}</strong> — ${escapeHtml(new Date(m.firmaFecha).toLocaleDateString(localeActual()))}
          </div>`
        : esOwner ? `
          ${m.respuesta === 'piensa' ? `<div style="background:rgba(255,255,255,.12);padding:10px;border-radius:8px;font-size:13.5px;margin-bottom:10px">${escapeHtml(t('plan360.maintenanceThinking'))} ${escapeHtml(plan360FechaLegible(m.volverAHablarFecha))}</div>` : ''}
          <div class="field" style="margin-bottom:8px"><label style="color:#fff">${escapeHtml(t('plan360.signName'))}</label><input id="p360-mant-firma" style="color:var(--text)"></div>
          <button class="btn btn-primary btn-sm" onclick="plan360MantenimientoAceptar()" style="margin-right:6px">${escapeHtml(t('plan360.maintenanceAcceptBtn'))}</button>
          <div class="field" style="margin:10px 0 6px"><label style="color:#fff">${escapeHtml(t('plan360.maintenanceThinkDate'))}</label><input id="p360-mant-fecha" type="date" style="color:var(--text);max-width:180px"></div>
          <button class="btn btn-sm" onclick="plan360MantenimientoPensar()">${escapeHtml(t('plan360.maintenanceThinkBtn'))}</button>
        ` : m.respuesta === 'piensa' ? `<p style="margin:0;font-size:13.5px">${escapeHtml(t('plan360.maintenanceThinking'))} ${escapeHtml(plan360FechaLegible(m.volverAHablarFecha))}</p>` : `<p style="margin:0;font-size:12px;opacity:.8">${escapeHtml(t('plan360.maintenanceOwnerOnly'))}</p>`}
      </div>
    </div>
  `;
}
// Fechas guardadas como AAAA-MM-DD, pintadas en el idioma de la app.
function plan360FechaLegible(f){
  if(!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return f || '—';
  const [y, mo, d] = f.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(localeActual(), {day: 'numeric', month: 'long', year: 'numeric'});
}
function plan360MantenimientoAceptar(){
  if(!plan360EsOwner()) return;
  const nombre = (document.getElementById('p360-mant-firma').value || '').trim();
  if(!nombre){ showToast(t('plan360.signMissing')); return; }
  const c = DB.business.plan360Cierre;
  if(!c || !c.mantenimiento) return;
  c.mantenimiento.respuesta = 'acepta';
  c.mantenimiento.firmaNombre = nombre;
  c.mantenimiento.firmaFecha = Date.now();
  c.mantenimiento.respondidoEn = Date.now();
  // El panel del coach lo pasa solo a «Mantenimiento» (6/10).
  DB.business.plan360Servicio = Object.assign({}, DB.business.plan360Servicio || {}, {fase: 'mant', mantDesde: plan360MantClave(new Date()), cambiado: Date.now()});   // fusionar: ahí van también los cobros del coach
  saveDB();
  plan360PingActivity();
  showToast(t('plan360.saved'));
  renderPlan360Grid();
}
function plan360MantenimientoPensar(){
  if(!plan360EsOwner()) return;
  const c = DB.business.plan360Cierre;
  if(!c || !c.mantenimiento) return;
  const fecha = (document.getElementById('p360-mant-fecha').value || '').trim();
  // Sin fecha salía «Volvemos a hablar el: —» y el coach no se enteraba.
  if(!fecha){ showToast(t('plan360.maintenanceDateMissing')); return; }
  c.mantenimiento.respuesta = 'piensa';
  c.mantenimiento.respondidoEn = Date.now();
  c.mantenimiento.volverAHablarFecha = fecha;
  saveDB();
  plan360PingActivity();
  showToast(t('plan360.saved'));
  renderPlan360Grid();
}
/* ---- Mantenimiento (29/09): el mes con el coach, después del programa ----
   El coach lo monta en su panel (plan360Mant.meses['AAAA-MM'].semanas.sN.items).
   Aquí el negocio ve cada lunes cómo se trabaja (WhatsApp o videollamada),
   lo que el coach le entrega y SUS tareas, que marca él. Son objetos con
   clave y no listas: si el coach añade un gadget mientras aquí se marca
   una tarea, la fusión a tres bandas no se pisa por posición. */
let plan360MantMes = null;
// «Septiembre de 2026», no «Septiembre De 2026»: text-transform:capitalize
// sube TODAS las palabras.
function plan360Mayus(txt){ return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : ''; }
function plan360MantHayAlgo(){
  const m = DB.business.plan360Mant;
  return !!(m && m.meses && typeof m.meses === 'object' && Object.keys(m.meses).length);
}
function plan360MantClave(fecha){ return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0'); }
function plan360MantLunes(clave){
  const [y, m] = clave.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  while(d.getDay() !== 1) d.setDate(d.getDate() + 1);
  const out = [];
  while(d.getMonth() === m - 1){ out.push(new Date(d)); d.setDate(d.getDate() + 7); }
  return out;
}
// Cada gadget cae en su lunes + el día que el coach le haya puesto (0-6).
function plan360MantFechaItem(clave, sk, it){
  const lunes = plan360MantLunes(clave)[Number(String(sk).slice(1)) - 1];
  if(!lunes) return null;
  const f = new Date(lunes);
  f.setDate(f.getDate() + Math.max(0, Math.min(6, Number((it && it.dia) || 0))));
  return f;
}
// Todos los gadgets, con su fecha, recorriendo todos los meses. Firebase
// borra lo vacío: cualquier nivel puede faltar.
function plan360MantTodos(){
  const meses = ((DB.business.plan360Mant || {}).meses) || {};
  const out = [];
  Object.keys(meses).forEach(clave => {
    const semanas = (meses[clave] && meses[clave].semanas) || {};
    Object.keys(semanas).forEach(sk => {
      const items = (semanas[sk] && semanas[sk].items) || {};
      Object.keys(items).forEach(id => {
        const it = items[id];
        if(!it || !it.titulo) return;
        out.push({clave, sk, id, it, fecha: plan360MantFechaItem(clave, sk, it)});
      });
    });
  });
  return out;
}
// Las tareas del negocio que caen en ESTA semana y siguen sin hacer: es lo
// que sale en el Panel de Control, donde entra cada día — dentro del Plan
// 360 no las vería nadie.
function plan360MantPendientesSemana(){
  if(!DB.business || !plan360MantHayAlgo()) return [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const fin = new Date(lunes); fin.setDate(lunes.getDate() + 7);
  return plan360MantTodos().filter(x => x.it.tipo === 'tarea' && !x.it.hecho && x.fecha && x.fecha >= lunes && x.fecha < fin);
}
function plan360IrAMantenimiento(){
  navigate('plan360');
  plan360MantMes = null;
  renderPlan360Mant();
}
// «Lo que llevamos juntos»: lo que justifica cada mes el mantenimiento, a
// la vista. Se cuenta solo de lo que ya hay: nada que rellenar a mano.
function plan360MantMarcador(){
  const todos = plan360MantTodos();
  const hechas = todos.filter(x => x.it.hecho);
  const esLlamada = it => it.icono === 'ti-video' || it.icono === 'ti-calendar-stats' || /^videollamada/i.test(it.titulo);
  const esReporte = it => it.icono === 'ti-file-analytics' || it.icono === 'ti-report-money' || /^reporte/i.test(it.titulo);
  const claves = Object.keys(((DB.business.plan360Mant || {}).meses) || {}).sort();
  const desde = claves.length ? claves[0] + '-01' : null;
  const subidas = desde ? (DB.preciosHistorial || []).filter(h => h && h.fecha >= desde && Number(h.despues) > Number(h.antes)).length : 0;
  return {
    desde,
    tareas: hechas.filter(x => x.it.tipo === 'tarea').length,
    entregas: hechas.filter(x => x.it.tipo !== 'tarea' && !esLlamada(x.it) && !esReporte(x.it)).length,
    reportes: hechas.filter(x => x.it.tipo !== 'tarea' && esReporte(x.it)).length,
    llamadas: hechas.filter(x => x.it.tipo !== 'tarea' && esLlamada(x.it)).length,
    subidas,
  };
}
function plan360MantMarcadorHtml(){
  const m = plan360MantMarcador();
  if(!m.desde) return '';
  const [y, mo] = m.desde.split('-').map(Number);
  const desdeTxt = new Date(y, mo - 1, 1).toLocaleDateString(localeActual(), {month: 'long', year: 'numeric'});
  const celda = (n, icono, clave) => `<div style="flex:1;min-width:92px;text-align:center;padding:6px 4px">
      <i class="ti ${icono}" style="font-size:20px;opacity:.85"></i>
      <div style="font-size:24px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums">${n}</div>
      <div class="txt-xs" style="opacity:.85">${escapeHtml(t(clave))}</div>
    </div>`;
  return `<div class="card" style="background:var(--ink);color:#fff;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:2px">${escapeHtml(t('plan360.mant.scoreTitle'))}</div>
    <div class="txt-xs" style="opacity:.8;margin-bottom:8px;text-transform:none">${escapeHtml(t('plan360.mant.scoreSince'))} ${escapeHtml(desdeTxt)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      ${celda(m.tareas, 'ti-checkbox', 'plan360.mant.scoreTasks')}
      ${celda(m.reportes, 'ti-file-analytics', 'plan360.mant.scoreReports')}
      ${celda(m.llamadas, 'ti-video', 'plan360.mant.scoreCalls')}
      ${celda(m.entregas, 'ti-send', 'plan360.mant.scoreDeliveries')}
      ${celda(m.subidas, 'ti-trending-up', 'plan360.mant.scoreRises')}
    </div>
    ${plan360MarcadorEurosHtml()}
  </div>`;
}
// Lo mismo en NÚMEROS: el Día 1 frente al último mes, y lo que supone al
// mes en euros. Es lo que se compara con lo que cuesta el mantenimiento.
function plan360MarcadorEurosHtml(){
  const m = plan360MarcadorEuros();
  if(!m || !m.filas.length) return '';
  const nombreMes = c => { const [y, mo] = c.split('-').map(Number); return new Date(y, mo-1, 1).toLocaleDateString(localeActual(), {month:'long', year:'numeric'}); };
  const fmt = (k, v) => v == null ? '—' : (k === 'foodCost' || k === 'personal') ? (Math.round(v*10)/10).toLocaleString(localeActual()) + ' %' : fmtMoney(v);
  return `<div style="border-top:1px solid rgba(255,255,255,.2);margin-top:8px;padding-top:8px">
    <div class="txt-xs" style="opacity:.85;margin-bottom:4px;text-transform:none">${escapeHtml(t('plan360.k.titulo').replace('${desde}', nombreMes(m.desde)).replace('${hasta}', nombreMes(m.mes)))}</div>
    ${m.filas.map(f => `<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:2px 0;font-size:13.5px">
      <span style="flex:1;min-width:120px">${escapeHtml(t('plan360.k.'+f.k))}</span>
      <span style="font-variant-numeric:tabular-nums">${fmt(f.k, f.antes)} → <strong>${fmt(f.k, f.hoy)}</strong></span>
      ${f.euros != null && Math.abs(f.euros) >= 1 ? `<span class="txt-xs" style="font-weight:700;color:${f.euros > 0 ? '#C9D6CC' : '#E3C8BF'}">${f.euros > 0 ? '+' : '−'}${fmtMoney(Math.abs(f.euros))} ${escapeHtml(t('plan360.k.alMes'))}</span>` : ''}
    </div>`).join('')}
  </div>`;
}
function renderPlan360Mant(clave){
  if(clave) plan360MantMes = clave;
  if(!plan360MantMes) plan360MantMes = plan360MantClave(new Date());
  const mant = DB.business.plan360Mant || {};
  const meses = (mant.meses && typeof mant.meses === 'object') ? mant.meses : {};
  const mes = meses[plan360MantMes];
  const semanas = (mes && mes.semanas && typeof mes.semanas === 'object') ? mes.semanas : {};
  const [y, m] = plan360MantMes.split('-').map(Number);
  const nombreMes = new Date(y, m - 1, 1).toLocaleDateString(localeActual(), {month: 'long', year: 'numeric'});
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const esOwner = plan360EsOwner();
  // El icono lo elige el coach en su catálogo (admin-panel/plan360.html,
  // que el recortador de iconos también rastrea). Solo se acepta un nombre
  // de icono limpio: es dato que viene de la nube y va a un class="".
  const icono = it => /^ti-[a-z0-9-]+$/.test(it.icono || '') ? it.icono : (it.tipo === 'tarea' ? 'ti-checkbox' : 'ti-send');
  const semanaHtml = (lunes, i) => {
    const sk = 's' + (i + 1);
    const sem = semanas[sk];
    const items = Object.keys((sem && sem.items) || {}).map(id => Object.assign({id}, sem.items[id]))
      .filter(it => it && it.titulo)
      .sort((a, b) => ((a.dia || 0) - (b.dia || 0)) || ((a.orden || 0) - (b.orden || 0)));
    if(!sem || !items.length) return '';
    const esEsta = hoy >= lunes && hoy < new Date(lunes.getTime() + 7 * 86400000);
    const video = sem.canal === 'video';
    const fila = it => {
      const tarea = it.tipo === 'tarea';
      const fecha = plan360MantFechaItem(plan360MantMes, sk, it);
      const atrasada = tarea && !it.hecho && fecha && fecha < hoy;
      const idSeguro = escapeHtml(it.id);
      const marca = tarea
        ? `<input type="checkbox" ${it.hecho ? 'checked' : ''} ${esOwner ? '' : 'disabled'} onchange="plan360MantMarcar('${sk}','${idSeguro}',this.checked)" style="width:22px;height:22px;flex:none;margin-top:1px" aria-label="${escapeHtml(t('plan360.mant.markDone'))}">`
        : `<i class="ti ${it.hecho ? 'ti-circle-check' : 'ti-circle'}" style="font-size:22px;flex:none;color:${it.hecho ? 'var(--green)' : 'var(--muted)'}"></i>`;
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border)">
        ${marca}
        <div style="flex:1;min-width:0">
          <div class="txt-xs" style="font-weight:700;color:${tarea ? 'var(--amber, #8A7440)' : 'var(--muted)'};text-transform:uppercase;letter-spacing:.04em"><i class="ti ${icono(it)}" style="font-size:15px;vertical-align:-2px"></i> ${escapeHtml(t(tarea ? 'plan360.mant.yourTask' : 'plan360.mant.fromCoach'))} · <span style="text-transform:none">${escapeHtml(fecha ? plan360Mayus(fecha.toLocaleDateString(localeActual(), {weekday: 'short', day: 'numeric'})) : '')}</span></div>
          <div style="font-weight:600;${it.hecho ? 'text-decoration:line-through;opacity:.65' : ''}">${escapeHtml(it.titulo)}</div>
          ${it.detalle ? `<div style="font-size:13px;color:var(--muted);white-space:pre-wrap;margin-top:2px">${escapeHtml(it.detalle)}</div>` : ''}
          ${!tarea && it.hecho ? `<div class="txt-xs" style="color:var(--green);margin-top:2px">${escapeHtml(t('plan360.mant.delivered'))}</div>` : ''}
          ${atrasada ? `<div class="txt-xs" style="color:var(--red);margin-top:2px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('plan360.mant.overdue'))}</div>` : ''}
          ${it.respuesta ? `<div style="margin-top:6px;padding:7px 10px;background:var(--bg);border-left:3px solid var(--green);font-size:13px;white-space:pre-wrap">${escapeHtml(it.respuesta)}</div>` : ''}
          ${esOwner ? `<details style="margin-top:4px">
            <summary class="txt-xs" style="cursor:pointer;color:var(--muted);min-height:32px;display:flex;align-items:center;gap:4px"><i class="ti ti-message-circle"></i> ${escapeHtml(t(it.respuesta ? 'plan360.mant.editReply' : 'plan360.mant.reply'))}</summary>
            <textarea id="p360-mant-resp-${sk}-${idSeguro}" rows="2" placeholder="${escapeHtml(t('plan360.mant.replyPh'))}" style="margin-top:4px;font-size:13px">${escapeHtml(it.respuesta || '')}</textarea>
            <button class="btn btn-sm btn-primary" style="margin-top:4px" onclick="plan360MantResponder('${sk}','${idSeguro}')">${escapeHtml(t('plan360.mant.sendReply'))}</button>
          </details>` : ''}
        </div>
      </div>`;
    };
    return `<div class="card" style="margin-bottom:10px;${esEsta ? 'outline:2px solid var(--ink);outline-offset:-2px' : ''}">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <strong style="flex:1;min-width:150px">${escapeHtml(plan360Mayus(lunes.toLocaleDateString(localeActual(), {weekday: 'long', day: 'numeric', month: 'long'})))}</strong>
        <span class="p360-day-tag" style="margin:0"><i class="ti ${video ? 'ti-video' : 'ti-brand-whatsapp'}"></i> ${escapeHtml(t(video ? 'plan360.mant.video' : 'plan360.mant.whatsapp'))}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px" aria-hidden="true">${items.map(it => `<i class="ti ${icono(it)}" style="font-size:20px;color:${it.hecho ? 'var(--muted)' : it.tipo === 'tarea' ? 'var(--amber, #8A7440)' : 'var(--green)'}"></i>`).join('')}</div>
      ${items.map(fila).join('')}
    </div>`;
  };
  const cuerpo = plan360MantLunes(plan360MantMes).map(semanaHtml).join('');
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(t('plan360.mant.title'), t('plan360.mant.desc'))}
    <div style="margin-top:12px">${plan360MantMarcadorHtml()}</div>
    <div style="display:flex;align-items:center;gap:8px;margin:12px 0">
      <button class="btn btn-sm" onclick="plan360MantMover(-1)" aria-label="${escapeHtml(t('plan360.mant.prev'))}"><i class="ti ti-chevron-left"></i></button>
      <strong style="flex:1;text-align:center;font-size:16px">${escapeHtml(plan360Mayus(nombreMes))}</strong>
      <button class="btn btn-sm" onclick="plan360MantMover(1)" aria-label="${escapeHtml(t('plan360.mant.next'))}"><i class="ti ti-chevron-right"></i></button>
    </div>
    ${mes && mes.objetivo ? `<div class="card" style="margin-bottom:10px"><div class="txt-xs" style="font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)"><i class="ti ti-target-arrow"></i> ${escapeHtml(t('plan360.mant.goal'))}</div><div style="font-weight:600;margin-top:2px">${escapeHtml(mes.objetivo)}</div></div>` : ''}
    ${cuerpo || `<div class="card"><p class="muted" style="margin:0">${escapeHtml(t('plan360.mant.empty'))}</p></div>`}
    ${plan360MantCierreHtml(mes)}
  `;
}
// El cierre del mes que escribe el coach (6/10): qué ha ido bien, qué
// hay que mejorar, si se cumplió el objetivo y el siguiente. Las cifras
// salen de plan360Kpis, las mismas que ve el coach.
function plan360MantCierreHtml(mes){
  const c = mes && mes.cierre;
  if(!c || !c.ts) return '';
  const k = ((DB.business.plan360Kpis || {}).meses || {})[plan360MantMes];
  const eur = n => Math.round(n).toLocaleString(localeActual()) + ' €';
  const pct = n => n.toLocaleString(localeActual(), {maximumFractionDigits: 1}) + ' %';
  const cifras = k ? [k.netas != null ? escapeHtml(t('plan360.mant.cSales')) + ': <strong>' + eur(k.netas) + '</strong>' : '', k.foodCostPct != null ? escapeHtml(t('plan360.mant.cFoodCost')) + ': <strong>' + pct(k.foodCostPct) + '</strong>' : '', k.resultado != null ? escapeHtml(t('plan360.mant.cResult')) + ': <strong>' + eur(k.resultado) + '</strong>' : ''].filter(Boolean).join(' · ') : '';
  const obj = {si: 'plan360.mant.cGoalYes', parcial: 'plan360.mant.cGoalHalf', no: 'plan360.mant.cGoalNo'}[c.objetivo];
  const bloque = (titulo, txt, color) => txt ? `<div style="margin-top:8px"><div class="txt-xs" style="font-weight:700;color:${color}">${escapeHtml(t(titulo))}</div><div style="white-space:pre-wrap">${escapeHtml(txt)}</div></div>` : '';
  return `<div class="card" style="margin-top:12px;outline:2px solid var(--ink);outline-offset:-2px">
    <strong><i class="ti ti-flag-check"></i> ${escapeHtml(t('plan360.mant.cTitle'))}</strong>
    ${cifras ? `<div style="font-size:13px;margin-top:6px">${cifras}</div>` : ''}
    ${obj && mes.objetivo ? `<div style="font-size:13px;margin-top:6px">${escapeHtml(t('plan360.mant.goal'))}: ${escapeHtml(mes.objetivo)} — <strong>${escapeHtml(t(obj))}</strong></div>` : ''}
    ${bloque('plan360.mant.cGood', c.bien, 'var(--green)')}
    ${bloque('plan360.mant.cBad', c.mal, 'var(--amber, #8A7440)')}
    ${bloque('plan360.mant.cNext', c.siguiente, 'var(--ink)')}
  </div>`;
}
function plan360MantMover(delta){
  const [y, m] = plan360MantMes.split('-').map(Number);
  renderPlan360Mant(plan360MantClave(new Date(y, m - 1 + delta, 1)));
}
function plan360MantItem(sk, id){
  const mes = ((DB.business.plan360Mant || {}).meses || {})[plan360MantMes];
  return mes && mes.semanas && mes.semanas[sk] && mes.semanas[sk].items && mes.semanas[sk].items[id];
}
function plan360MantMarcar(sk, id, hecho){
  if(!plan360EsOwner()){ showToast(t('plan360.mant.ownerOnly')); renderPlan360Mant(); return; }
  const it = plan360MantItem(sk, id);
  if(!it || it.tipo !== 'tarea') return;
  it.hecho = !!hecho;
  it.hechoEn = hecho ? Date.now() : null;
  saveDB();
  plan360PingActivity();
  withScrollPreserved(() => renderPlan360Mant());
}
// La respuesta del negocio en cada gadget: «hecho, el proveedor nuevo es
// un 8 % más barato» o «no he podido, falta gente». Así la llamada empieza
// sabiendo qué ha pasado. Avisa al coach como cualquier otra actividad.
function plan360MantResponder(sk, id){
  if(!plan360EsOwner()){ showToast(t('plan360.mant.ownerOnly')); return; }
  const it = plan360MantItem(sk, id);
  const ta = document.getElementById('p360-mant-resp-' + sk + '-' + id);
  if(!it || !ta) return;
  const texto = ta.value.trim().slice(0, 2000);
  it.respuesta = texto || null;
  it.respuestaEn = texto ? Date.now() : null;
  saveDB();
  plan360PingActivity();
  showToast(t(texto ? 'plan360.mant.replySent' : 'plan360.saved'));
  withScrollPreserved(() => renderPlan360Mant());
}
function plan360PageHeader(title, subtitle, backFn){
  return `<button class="btn btn-sm btn-back" onclick="${backFn || 'renderPlan360Grid'}()"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(title)}</div>
    ${subtitle ? `<div class="view-subtitle">${escapeHtml(subtitle)}</div>` : ''}`;
}

/* ---- Documentación inicial (antes "Día 0"): lo responde el negocio ----
   Lleva tres partes, en el mismo orden en que se entregan de verdad: la
   carta de bienvenida (para releerla), el contrato + RGPD (se lee y se
   firma aquí mismo), y el cuestionario inicial. */
function renderPlan360Intake(){
  const sections = (DB.business.plan360Intake || {}).sections || [];
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(t('plan360.initialDocs'), t('plan360.initialDocsDesc'))}
    <div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360Welcome(true)">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ${DB.business.plan360WelcomeShown ? 'ti-circle-check' : 'ti-mail'}" style="font-size:20px;${DB.business.plan360WelcomeShown ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.welcomeLetter'))}</strong></div>
        <i class="ti ti-chevron-right"></i>
      </div>
    </div>
    <div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360Contract()">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ${(DB.business.plan360Contract && DB.business.plan360Contract.signedAt) ? 'ti-circle-check' : 'ti-file-text'}" style="font-size:20px;${(DB.business.plan360Contract && DB.business.plan360Contract.signedAt) ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1">
          <strong>${escapeHtml(t('plan360.contract'))}</strong>
          ${(DB.business.plan360Contract && DB.business.plan360Contract.signedAt) ? `<div class="p360-day-tag">${escapeHtml(t('plan360.signedBy'))} ${escapeHtml(DB.business.plan360Contract.signedName)}</div>` : ''}
        </div>
        <i class="ti ti-chevron-right"></i>
      </div>
    </div>
    <div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360Questionnaire()">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-clipboard-list" style="font-size:20px"></i>
        <div style="flex:1">
          <strong>${escapeHtml(t('plan360.questionnaire'))}</strong>
          <div class="p360-day-tag">${plan360IntakeAnswered(sections)} / ${plan360IntakeTotal(sections)}</div>
        </div>
        <i class="ti ti-chevron-right"></i>
      </div>
    </div>
  `;
}
function plan360IntakeTotal(sections){ return sections.reduce((n, s) => n + s.questions.length, 0); }
function plan360IntakeAnswered(sections){ return sections.reduce((n, s) => n + s.questions.filter(q => q.a).length, 0); }
/* ---- Cuestionario inicial: su propia pantalla, no un bloque más dentro
   de Documentación inicial — con 28 preguntas de un tirón, mezclado con la
   carta y el contrato, no hay quien lo lea con calma. */
function renderPlan360Questionnaire(){
  const sections = (DB.business.plan360Intake || {}).sections || [];
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(t('plan360.questionnaire'), null, 'renderPlan360Intake')}
    <div class="card" style="margin-top:14px">
      ${sections.map((s, si) => `
        <div style="font-weight:600;margin:${si ? '18' : '0'}px 0 8px">${escapeHtml(s.title)}</div>
        ${s.questions.map((q, qi) => `
          <div class="field">
            <label>${escapeHtml(q.q)}</label>
            <textarea id="p360-intake-${si}-${qi}" rows="2">${escapeHtml(q.a)}</textarea>
          </div>
        `).join('')}
      `).join('')}
      <button class="btn btn-primary" onclick="savePlan360Intake()">${escapeHtml(t('common.save'))}</button>
    </div>
  `;
}
/* ---- Contrato + RGPD: se lee y se firma en el sitio (firma electrónica
   simple: nombre + DNI + fecha, sobre el texto exacto aceptado). No es una
   firma digital certificada, pero es una aceptación electrónica válida —
   suficiente para un contrato de servicios de este importe.
   Es su propia pantalla (como la carta de bienvenida), no un bloque más
   suelto dentro de Documentación inicial: un contrato entero de un tirón
   ahí mezclado con lo demás no queda profesional. */
function renderPlan360Contract(){
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360Intake()"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.contract'))}</div>
    ${plan360ContractSectionHtml()}
  `;
}
function plan360ContractSectionHtml(){
  const c = DB.business.plan360Contract || {};
  // Firmado, se enseña el texto que se firmó (guardado al firmar), no el
  // de la versión actual de la app: si el contrato cambia, el firmado no.
  const texto = (c.signedAt && c.signedText) || plan360FillTemplate(PLAN360_CONTRACT_TEXT, c);
  if(c.signedAt){
    return `<div class="card" style="margin-top:14px">
      <div class="p360-txt p360-txt-box" style="margin-bottom:10px">${plan360TextoHtml(texto)}</div>
      <div class="card" style="background:var(--green-l);border-color:var(--green)">
        <i class="ti ti-circle-check" style="color:var(--green)"></i>
        ${escapeHtml(t('plan360.signedBy'))} <strong>${escapeHtml(c.signedName)}</strong> (${escapeHtml(c.signedDNI)}) — ${escapeHtml(new Date(c.signedAt).toLocaleString(localeActual()))}
      </div>
      <button class="btn btn-sm" style="margin-top:10px" onclick="plan360PrintContract()"><i class="ti ti-printer"></i> ${escapeHtml(t('plan360.contractPrint'))}</button>
    </div>`;
  }
  // Sin precio o forma de pago (los pacta el coach, no se tocan desde
  // aquí) no se puede firmar: si no, se firma un contrato con el precio
  // en blanco, y eso no vale como acuerdo de servicios.
  const listoParaFirmar = !!(c.precio && c.formaPago);
  return `<div class="card" style="margin-top:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="field" style="flex:1;min-width:200px"><label>${escapeHtml(t('plan360.contractName'))}</label><input id="p360-c-nombre" value="${escapeHtml(c.clienteNombre || '')}"></div>
      <div class="field" style="flex:1;min-width:140px"><label>${escapeHtml(t('plan360.contractNIF'))}</label><input id="p360-c-nif" value="${escapeHtml(c.clienteNIF || '')}"></div>
    </div>
    <div class="field"><label>${escapeHtml(t('plan360.contractAddress'))}</label><input id="p360-c-direccion" value="${escapeHtml(c.clienteDireccion || '')}"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="field" style="flex:1;min-width:160px"><label>${escapeHtml(t('plan360.contractPrice'))}</label><div style="min-height:46px;display:flex;align-items:center;padding:0 11px;border:1px solid var(--border);background:var(--cream, #F1EFE9);color:var(--muted)">${escapeHtml(c.precio || '—')}</div></div>
      <div class="field" style="flex:1;min-width:160px"><label>${escapeHtml(t('plan360.contractPayment'))}</label><div style="min-height:46px;display:flex;align-items:center;padding:0 11px;border:1px solid var(--border);background:var(--cream, #F1EFE9);color:var(--muted)">${escapeHtml(c.formaPago || '—')}</div></div>
    </div>
    <p class="view-subtitle" style="margin:-4px 0 10px">${escapeHtml(t('plan360.priceLockedHint'))}</p>
    <button class="btn btn-sm" onclick="plan360SaveContractFields();renderPlan360Contract()" style="margin-bottom:10px">${escapeHtml(t('plan360.contractUpdate'))}</button>
    <div class="p360-txt p360-txt-box" style="margin-bottom:14px">${plan360TextoHtml(texto)}</div>
    ${!listoParaFirmar ? `<div class="card" style="background:var(--amber-l);border-color:var(--amber);margin-bottom:14px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('plan360.signBlockedNoPrice'))}</div>` : ''}
    <div style="font-weight:600;margin-bottom:6px">${escapeHtml(t('plan360.signHere'))}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="field" style="flex:1;min-width:180px"><label>${escapeHtml(t('plan360.signName'))}</label><input id="p360-sign-name" ${listoParaFirmar ? '' : 'disabled'}></div>
      <div class="field" style="flex:1;min-width:140px"><label>${escapeHtml(t('plan360.signDNI'))}</label><input id="p360-sign-dni" ${listoParaFirmar ? '' : 'disabled'}></div>
    </div>
    <button class="btn btn-primary" onclick="plan360SignContract()" ${listoParaFirmar ? '' : 'disabled'}>${escapeHtml(t('plan360.signSubmit'))}</button>
    <p class="view-subtitle" style="margin-top:8px">${escapeHtml(t('plan360.signLegalNote'))}</p>
  </div>`;
}
// Ventana aparte con el texto ya rellenado + el bloque de firma, para que
// el cliente se lleve una copia de verdad del contrato firmado — antes
// solo se podía leer dentro de la app, sin imprimir ni exportar.
function plan360PrintContract(){
  const c = DB.business.plan360Contract || {};
  if(!c.signedAt) return;
  const texto = c.signedText || plan360FillTemplate(PLAN360_CONTRACT_TEXT, c);
  const win = window.open('', '_blank', 'width=700,height=800');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(t('plan360.contract'))}</title>
    <style>${ggFuentesImpresionCss()} ${GG_BARRA_IMPRESION_CSS} @page{margin:18mm 16mm} body{font-family:'Schibsted Grotesk',Arial,sans-serif;color:#1C1A17;white-space:pre-wrap;line-height:1.65;font-size:13px;padding:0 6px;-webkit-print-color-adjust:exact;print-color-adjust:exact} .firma{margin-top:28px;padding:14px 16px;border:1px solid #D5CFC4;border-top:3px solid #1C1A17;background:#FAF8F4;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;white-space:normal;break-inside:avoid}</style>
    </head><body>${ggBarraImpresionHtml()}${escapeHtml(texto)}
    <div class="firma">${escapeHtml(t('plan360.signedBy'))} ${escapeHtml(c.signedName)} (${escapeHtml(c.signedDNI)}) — ${escapeHtml(new Date(c.signedAt).toLocaleString(localeActual()))}</div>
    </body></html>`);
  win.document.close();
  ggEsperarYImprimir(win);
}
// El precio y la forma de pago NO se tocan desde aquí: los pacta el coach,
// no se editan desde la app del negocio (solo se ven, en gris). Se cambian
// exclusivamente desde admin-panel/plan360.html.
function plan360SaveContractFields(){
  const c = DB.business.plan360Contract;
  c.clienteNombre = (document.getElementById('p360-c-nombre').value || '').trim();
  c.clienteNIF = (document.getElementById('p360-c-nif').value || '').trim();
  c.clienteDireccion = (document.getElementById('p360-c-direccion').value || '').trim();
  saveDB();
}
function plan360SignContract(){
  const c = DB.business.plan360Contract || {};
  if(!c.precio || !c.formaPago){ showToast(t('plan360.signBlockedNoPrice')); return; }
  const name = (document.getElementById('p360-sign-name').value || '').trim();
  const dni = (document.getElementById('p360-sign-dni').value || '').trim();
  if(!name || !dni){ showToast(t('plan360.signMissing')); return; }
  plan360SaveContractFields();
  c.signedName = name;
  c.signedDNI = dni;
  c.signedAt = Date.now();
  c.signedText = plan360FillTemplate(PLAN360_CONTRACT_TEXT, c);
  saveDB();
  plan360PingActivity();
  showToast(t('plan360.saved'));
  renderPlan360Contract();
}
function savePlan360Intake(){
  const sections = (DB.business.plan360Intake || {}).sections || [];
  sections.forEach((s, si) => {
    s.questions.forEach((q, qi) => { q.a = (document.getElementById('p360-intake-' + si + '-' + qi).value || '').trim(); });
  });
  saveDB();
  plan360PingActivity();
  showToast(t('plan360.saved'));
  renderPlan360Intake();
}

/* ---- Recursos (antes "GG"): identidad de marca, playbooks... ----
   Los rellena el coach desde su panel; aquí el negocio SOLO LOS LEE — de
   ahí que no lleve textarea ni Guardar, a diferencia de todo lo demás en
   Plan 360º. Mismo criterio que la nota privada del día 1: lo que es
   trabajo del coach no se edita desde la app del cliente, ni de adorno. */
const PLAN360_DOCS_CATEGORIAS_ORDEN = ['Marca', 'Cocina', 'Sala', 'Personal', 'Marketing', 'Gestión'];
function plan360DocCategoria(id){
  const t2 = PLAN360_DOCS_TEMPLATE.find(x => x.id === id);
  return (t2 && t2.categoria) || 'Otros';
}
function plan360DocSubtitulo(id){
  const t2 = PLAN360_DOCS_TEMPLATE.find(x => x.id === id);
  return (t2 && t2.subtitulo) || '';
}
// El texto de cada documento se escribe con una marca ligera (## título de
// sección, > frase destacada, - punto de lista, | fila de tabla, ✎ campo
// para rellenar) y esta función la convierte en un documento de verdad
// (títulos, listas, citas, tablas) en vez de un bloque de texto plano —
// así cada recurso se lee como el documento cuidado que es, con la
// identidad visual de GastroGoan, no como una nota pegada sin formato.
function plan360RenderDocBody(body){
  if(!body) return '';
  const lines = body.split('\n');
  let html = '', list = [], quote = [], table = [];
  const flushList = () => { if(list.length){ html += '<ul class="p360-doc-list">' + list.map(x => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>'; list = []; } };
  const flushQuote = () => { if(quote.length){ html += '<div class="p360-doc-quote">' + quote.map(x => `<p>${escapeHtml(x)}</p>`).join('') + '</div>'; quote = []; } };
  const flushTable = () => {
    if(table.length){
      const [head, ...rows] = table;
      html += '<table class="p360-doc-table"><thead><tr>' + head.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>'
        + rows.map(r => '<tr>' + r.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
      table = [];
    }
  };
  const flushAll = () => { flushList(); flushQuote(); flushTable(); };
  lines.forEach(raw => {
    const l = raw.trim();
    if(!l){ flushAll(); return; }
    if(l.startsWith('### ')){ flushAll(); html += `<h4 class="p360-doc-h3">${escapeHtml(l.slice(4))}</h4>`; return; }
    if(l.startsWith('## ')){ flushAll(); html += `<h3 class="p360-doc-h2">${escapeHtml(l.slice(3))}</h3>`; return; }
    if(l.startsWith('> ')){ flushList(); flushTable(); quote.push(l.slice(2)); return; }
    if(l.startsWith('- ')){ flushQuote(); flushTable(); list.push(l.slice(2)); return; }
    if(l.startsWith('|')){ flushList(); flushQuote(); table.push(l.split('|').map(c => c.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''))); return; }
    if(l.startsWith('✎')){ flushAll(); html += `<div class="p360-doc-fill">${escapeHtml(l)}</div>`; return; }
    flushAll();
    html += `<p class="p360-doc-p">${escapeHtml(l)}</p>`;
  });
  flushAll();
  return html;
}
function renderPlan360Docs(){
  const docs = DB.business.plan360Docs || [];
  const categorias = [...new Set([...PLAN360_DOCS_CATEGORIAS_ORDEN, ...docs.map(d => plan360DocCategoria(d.id))])]
    .filter(cat => docs.some(d => plan360DocCategoria(d.id) === cat));
  const filaDoc = doc => {
    if(doc.id === 'identidad'){
      const listo = !!(doc.sentAt && plan360LibroPdfData(doc));
      return `<div class="card" style="margin-top:14px;${listo ? 'cursor:pointer' : 'opacity:.55'}" ${listo ? 'onclick="renderPlan360LibroMarca()"' : ''}>
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ${listo ? 'ti-circle-check' : 'ti-book-2'}" style="font-size:20px;${listo ? 'color:var(--green)' : ''}"></i>
          <div style="flex:1"><strong>${escapeHtml(doc.title)}</strong>
            <div class="p360-day-tag">${escapeHtml(listo ? t('plan360.libroReady') : t('plan360.libroPending'))}</div>
          </div>
          ${listo ? '<i class="ti ti-chevron-right"></i>' : ''}
        </div>
      </div>`;
    }
    const pl = PLAN360_DOC_PLANTILLAS[doc.id];
    if(pl){
      return `<div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360DocRico('${doc.id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ti-file-text" style="font-size:20px;color:var(--olive)"></i>
          <div style="flex:1"><strong>${escapeHtml(pl.titulo)}</strong>
            <div class="p360-day-tag">${escapeHtml(pl.sub)}</div>
          </div>
          <i class="ti ti-chevron-right"></i>
        </div>
      </div>`;
    }
    const subtitulo = plan360DocSubtitulo(doc.id);
    return `<div class="card p360-doc" style="margin-top:14px">
      <div class="p360-doc-header">
        <div class="p360-doc-eyebrow">${escapeHtml(plan360DocCategoria(doc.id))}</div>
        <div class="p360-doc-title">${escapeHtml(doc.title)}</div>
        ${subtitulo ? `<div class="p360-doc-subtitle">${escapeHtml(subtitulo)}</div>` : ''}
      </div>
      ${doc.body ? plan360RenderDocBody(doc.body) : `<p class="muted">${escapeHtml(t('plan360.resourceEmpty'))}</p>`}
    </div>`;
  };
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(t('plan360.resources'), t('plan360.resourcesDesc'))}
    ${categorias.map(cat => `
      <div class="p360-week-label" style="margin-top:14px">${escapeHtml(cat)}</div>
      ${docs.filter(d => plan360DocCategoria(d.id) === cat).map(filaDoc).join('')}
    `).join('')}
  `;
}
/* Recurso maquetado (Playbook de cocina…): contenido fijo + lo que el
   coach haya escrito para este negocio. Solo lectura. */
function renderPlan360DocRico(id){
  const doc = (DB.business.plan360Docs || []).find(d => d.id === id);
  const pl = PLAN360_DOC_PLANTILLAS[id];
  if(!doc || !pl) return;
  document.getElementById('plan360-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm btn-back" onclick="renderPlan360Docs()"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
      <button class="btn btn-sm" onclick="descargarPlan360DocRico('${id}')"><i class="ti ti-download"></i> <span>${escapeHtml(t('plan360.libroMarcaDescargarPdf'))}</span></button>
    </div>
    ${plan360DocRicoHtml(pl, doc.campos, 'ver', escapeHtml, DB.business.name || '', plan360DocTextoAnterior(doc))}
  `;
}
function descargarPlan360DocRico(id){
  const doc = (DB.business.plan360Docs || []).find(d => d.id === id);
  const pl = PLAN360_DOC_PLANTILLAS[id];
  if(!doc || !pl) return;
  plan360ImprimirHtml(pl.titulo, plan360DocRicoHtml(pl, doc.campos, 'ver', escapeHtml, DB.business.name || '', plan360DocTextoAnterior(doc)));
}
/* ---- Libro de marca: ES el cuestionario "Este es tu negocio", con sus
   mismas áreas/preguntas, mostrado como documento final de solo lectura
   con el diseño de GastroGoan (26/09 — antes era un resumen aparte que el
   coach redactaba; ahora es el mismo documento, no una versión distinta). */
/* El PDF vive en su propio nodo (DB.plan360LibroPdf), no dentro de
   business: ahí viajaba entero con cada cambio. Los libros subidos antes
   pueden traerlo todavía en doc.pdfData hasta que el coach abra el negocio.
   Solo se acepta un PDF de verdad: es un texto que llega de la nube y va a
   un href. */
function plan360LibroPdfData(doc){
  if(!doc) return '';
  const nodo = DB.plan360LibroPdf;
  const data = doc.pdfData || (doc.pdfName && nodo && nodo.data) || '';
  return typeof data === 'string' && data.startsWith('data:application/pdf') ? data : '';
}
function renderPlan360LibroMarca(){
  const doc = (DB.business.plan360Docs || []).find(d => d.id === 'identidad');
  const pdf = plan360LibroPdfData(doc);
  // Antes exigía además los datos del Día 1, que ni se usan: la tarjeta
  // salía como lista, y al pulsarla no pasaba nada.
  if(!doc || !doc.sentAt || !pdf) return;
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360Docs()"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(doc.title)}</div>
    <a href="${escapeHtml(pdf)}" download="${escapeHtml(doc.pdfName || 'libro-de-marca.pdf')}" class="btn btn-primary" style="margin-top:10px"><i class="ti ti-download"></i> ${escapeHtml(t('plan360.libroMarcaDescargarPdf'))}</a>
    <div class="card" style="margin-top:14px;padding:0;overflow:hidden">
      <embed src="${escapeHtml(pdf)}" type="application/pdf" style="width:100%;height:75vh;display:block">
    </div>
  `;
}
/* ---- Un día concreto: presencial o de trabajo ---- */
function renderPlan360DayDetail(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d) return;
  if(d.phase === 'presencial') renderPlan360PresencialDetail(d);
  else renderPlan360TrabajoDetail(d);
}
function renderPlan360PresencialDetail(d){
  if(d.day === 1){ renderPlan360Dia1Hub(d); return; }
  if(d.day === 2){ renderPlan360Dia2Hub(d); return; }
  const {weekday, dayMonth} = plan360FormatDate(d.day);
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(d.title, weekday + ' · ' + dayMonth)}
    <div class="card" style="margin-top:14px">
      <div class="field"><label>${escapeHtml(t('plan360.dayTask'))}</label><textarea id="p360-notes" rows="4">${escapeHtml(d.notes || '')}</textarea></div>
      <button class="btn btn-primary" onclick="savePlan360Presencial(${d.day})">${escapeHtml(t('common.save'))}</button>
    </div>
  `;
}
/* ---- Día 1: tres sitios propios ----
   El cliente misterioso lo redacta el coach entero desde su panel — aquí
   no hay nada que rellenar. Antes de "Enviar" no se ve ni que existe; en
   cuanto se envía, aparece el informe COMPLETO (todas las notas), de solo
   lectura. Nunca editable desde la app del negocio. */
function renderPlan360Dia1Hub(d){
  const {weekday, dayMonth} = plan360FormatDate(d.day);
  const mc = d.misteryCheck;
  const enviado = !!(mc && mc.sentAt);
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(d.title, weekday + ' · ' + dayMonth)}
    <div class="card" style="margin-top:14px;${enviado ? 'cursor:pointer' : 'opacity:.55'}" ${enviado ? `onclick="renderPlan360MisteryReport(${d.day})"` : ''}>
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ${enviado ? 'ti-circle-check' : 'ti-user-search'}" style="font-size:20px;${enviado ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.misteryClient'))}</strong>
          <div class="p360-day-tag">${escapeHtml(enviado ? t('plan360.misteryReady') : t('plan360.misteryPending'))}</div>
        </div>
        ${enviado ? '<i class="ti ti-chevron-right"></i>' : ''}
      </div>
    </div>
    <div class="card" style="margin-top:14px;${d.reunionInicial && d.reunionInicial.sentAt ? 'cursor:pointer' : 'opacity:.55'}" ${d.reunionInicial && d.reunionInicial.sentAt ? `onclick="renderPlan360ReunionReport(${d.day})"` : ''}>
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ${d.reunionInicial && d.reunionInicial.sentAt ? 'ti-circle-check' : 'ti-users'}" style="font-size:20px;${d.reunionInicial && d.reunionInicial.sentAt ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.presentialMeeting'))}</strong>
          <div class="p360-day-tag">${escapeHtml(d.reunionInicial && d.reunionInicial.sentAt ? t('plan360.misteryReady') : t('plan360.misteryPending'))}</div>
        </div>
        ${d.reunionInicial && d.reunionInicial.sentAt ? '<i class="ti ti-chevron-right"></i>' : ''}
      </div>
    </div>
    ${d.reunionPersonal && d.reunionPersonal.resumenSentAt ? `
    <div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360StaffVoice(${d.day})">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-circle-check" style="font-size:20px;color:var(--green)"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.staffVoice'))}</strong>
          <div class="p360-day-tag">${escapeHtml(t('plan360.staffVoiceReady'))}</div>
        </div>
        <i class="ti ti-chevron-right"></i>
      </div>
    </div>` : ''}
  `;
}
/* ---- Día 2: presentación y entrega del plan. Orden real de la sesión
   (según el coach, 20/09): objetivos por prioridad → plan de acción de las
   4 semanas → masterclass de la app → team building. La masterclass es una
   dinámica presencial del coach y no tiene contenido propio que ver aquí.
   El team building SÍ lo tiene desde que el negocio pidió verlo (25/09):
   quién ganó y un check de a quién ya se le dio el premio — lo juega el
   coach desde su panel (admin-panel/plan360.html) y esto es de solo
   lectura salvo el check, que sí guarda el negocio. */
function renderPlan360Dia2Hub(d){
  const {weekday, dayMonth} = plan360FormatDate(d.day);
  const tb = d.teamBuilding;
  const listo = !!(tb && tb.completadoAt);
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(d.title, weekday + ' · ' + dayMonth)}
    <div class="card" style="margin-top:14px;cursor:pointer" onclick="renderPlan360PlanAccion(${d.day})">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-calendar-event" style="font-size:20px"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.actionPlan'))}</strong></div>
        <i class="ti ti-chevron-right"></i>
      </div>
    </div>
    <div class="card" style="margin-top:14px;${(d.inversiones || []).length ? 'cursor:pointer' : 'opacity:.55'}" ${(d.inversiones || []).length ? `onclick="renderPlan360Inversiones(${d.day})"` : ''}>
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-coin" style="font-size:20px;${(d.inversiones || []).length ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.investmentPlan'))}</strong>
          <div class="p360-day-tag">${escapeHtml((d.inversiones || []).length ? t('plan360.invReady') : t('plan360.invPendingCoach'))}</div>
        </div>
        ${(d.inversiones || []).length ? '<i class="ti ti-chevron-right"></i>' : ''}
      </div>
    </div>
    <div class="card" style="margin-top:14px;${listo ? 'cursor:pointer' : 'opacity:.55'}" ${listo ? `onclick="renderPlan360TeamBuilding(${d.day})"` : ''}>
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-trophy" style="font-size:20px;${listo ? 'color:var(--green)' : ''}"></i>
        <div style="flex:1"><strong>${escapeHtml(t('plan360.teamBuilding'))}</strong>
          <div class="p360-day-tag">${escapeHtml(listo ? t('plan360.teamBuildingReady') : t('plan360.teamBuildingPending'))}</div>
        </div>
        ${listo ? '<i class="ti ti-chevron-right"></i>' : ''}
      </div>
    </div>
  `;
}
// Mismo cálculo que tbTotalGeneral del panel del coach (admin-panel/
// plan360.html), reimplementado aquí porque esta pantalla vive en un HTML
// distinto y de solo lectura no vale la pena compartir módulo por esto.
// Se detecta la forma del sentido en vez de dar por hecho una lista fija
// (vista tiene .palabras+.encontradas, el resto tiene .items) para que
// siga funcionando aunque el panel del coach añada o quite sentidos.
function plan360TbTotal(tb, equipo){
  let total = (tb.kahoot && tb.kahoot.puntos && tb.kahoot.puntos[equipo]) || 0;
  total += (tb.creatividad && tb.creatividad.puntos && tb.creatividad.puntos[equipo]) || 0;
  Object.values(tb.sentidos || {}).forEach(sen => {
    if(!sen) return;
    if(Array.isArray(sen.palabras)){
      total += Object.values(sen.encontradas || {}).filter(f => f.equipo === equipo).length;
    } else if(Array.isArray(sen.items)){
      total += sen.items.filter(it => equipo === 'A' ? it.aciertoA : it.aciertoB).length;
    }
  });
  return total;
}
function renderPlan360TeamBuilding(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const tb = d && d.teamBuilding;
  if(!tb){ renderPlan360DayDetail(day); return; }
  const totalA = plan360TbTotal(tb, 'A'), totalB = plan360TbTotal(tb, 'B');
  const ganaA = totalA > totalB, ganaB = totalB > totalA, empate = totalA === totalB;
  const equipoGanador = empate ? null : (ganaA ? 'A' : 'B');
  const nombreGanador = empate ? '' : (ganaA ? tb.equipoA : tb.equipoB);
  const integrantesGanador = empate ? [] : ((ganaA ? tb.integrantesA : tb.integrantesB) || '')
    .split('\n').map(s => s.trim()).filter(Boolean);
  const entregado = tb.premioEntregado || {};
  // Clave por NOMBRE (antes por posición: si el coach reordenaba o quitaba a
  // alguien, las marcas pasaban a otra persona). La clave antigua se sigue
  // leyendo para no perder lo ya marcado.
  const premioDado = (nombre, idx) => !!(entregado[equipoGanador + '_n_' + plan360ClaveFirebase(nombre)] ?? entregado[equipoGanador + '_' + idx]);
  const hechos = integrantesGanador.filter((n, idx) => premioDado(n, idx)).length;
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.tbResultsTitle'))}</div>
    <div class="card" style="margin-top:14px;background:var(--ink);color:#fff;text-align:center;padding:24px 16px">
      <div style="display:flex;align-items:center;justify-content:center;gap:16px">
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(tb.equipoA)}</div>
          <div style="font-size:42px;font-weight:800;${ganaA ? 'color:#8A7440' : ''}">${totalA}</div>
        </div>
        <div style="opacity:.5;font-size:20px">—</div>
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(tb.equipoB)}</div>
          <div style="font-size:42px;font-weight:800;${ganaB ? 'color:#8A7440' : ''}">${totalB}</div>
        </div>
      </div>
      <div style="margin-top:12px;font-size:16px">${empate ? '<i class="ti ti-heart-handshake"></i> ' + escapeHtml(t('plan360.tbTie')) : '<i class="ti ti-trophy"></i> ' + escapeHtml(nombreGanador)}</div>
    </div>
    ${tb.premio ? `
    <div class="card" style="margin-top:14px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${escapeHtml(t('plan360.tbPrize'))}</div>
      <div style="font-size:15px;font-weight:600">${escapeHtml(tb.premio)}</div>
    </div>` : ''}
    ${!empate ? `
    <div class="card" style="margin-top:14px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--muted)">${escapeHtml(t('plan360.tbChecklistTitle'))}</div>
        ${integrantesGanador.length ? `<div style="font-size:12px;color:var(--muted);white-space:nowrap">${escapeHtml(t('plan360.tbChecklistProgress').replace('${n}', String(hechos)).replace('${total}', String(integrantesGanador.length)))}</div>` : ''}
      </div>
      ${integrantesGanador.length ? integrantesGanador.map((nombre, idx) => {
        const marcado = premioDado(nombre, idx);
        return `<label style="display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid var(--border);cursor:pointer;min-height:44px">
          <input type="checkbox" ${marcado ? 'checked' : ''} onchange="plan360TbTogglePremio(${day},${idx},this.checked)" style="width:22px;height:22px;flex:none">
          <span style="flex:1;${marcado ? 'text-decoration:line-through;color:var(--muted)' : ''}">${escapeHtml(nombre)}</span>
        </label>`;
      }).join('') : `<p class="muted" style="margin:0">${escapeHtml(t('plan360.tbChecklistEmpty'))}</p>`}
    </div>` : ''}
  `;
}
// Firebase rechaza la escritura ENTERA si una clave lleva . # $ / [ ]:
// un nombre como «J. García» habría dejado al negocio sin guardar nada.
function plan360ClaveFirebase(txt){ return String(txt).replace(/[.#$/\[\]]/g, '_').slice(0, 120); }
function plan360TbTogglePremio(day, idx, checked){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const tb = d && d.teamBuilding;
  if(!tb) return;
  const totalA = plan360TbTotal(tb, 'A'), totalB = plan360TbTotal(tb, 'B');
  if(totalA === totalB) return;
  const equipo = totalA > totalB ? 'A' : 'B';
  const nombre = ((equipo === 'A' ? tb.integrantesA : tb.integrantesB) || '').split('\n').map(x => x.trim()).filter(Boolean)[idx];
  if(!nombre) return;
  if(!tb.premioEntregado) tb.premioEntregado = {};
  tb.premioEntregado[equipo + '_n_' + plan360ClaveFirebase(nombre)] = checked;
  delete tb.premioEntregado[equipo + '_' + idx];
  saveDB();
  renderPlan360TeamBuilding(day);
}
/* ---- Plan de acción: objetivos por prioridad + resumen visual de los
   días 3-28 — cada día trae su propio contenido detallado al abrirlo. */
function plan360DiasTrabajoVisual(){
  const trabajo = (DB.business.plan360Program || []).filter(x => x.phase === 'trabajo');
  return trabajo.map(x => {
    const {weekday, dayMonth} = plan360FormatDate(x.day);
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="renderPlan360DayDetail(${x.day})">
      <div style="width:56px;flex:none;font-size:11px;color:var(--muted);line-height:1.3">${escapeHtml(weekday)}<br>${escapeHtml(dayMonth)}</div>
      <span style="flex:1;font-size:13.5px">${x.enfoqueTitulo ? escapeHtml(x.enfoqueTitulo) : '<span style="color:var(--muted)">' + escapeHtml(t('plan360.dayFocusEmpty')) + '</span>'}</span>
      <span style="width:12px;height:12px;border-radius:50%;flex:none;background:${plan360EnfoqueColorHex(x.enfoqueColor)}"></span>
    </div>`;
  }).join('');
}
function renderPlan360PlanAccion(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d) return;
  const orden = {prioritario: 0, esencial: 1, complementario: 2};
  const objetivos = (d.objectives || []).filter(o => o.titulo).slice().sort((a, b) => (orden[a.prioridad] ?? 1) - (orden[b.prioridad] ?? 1));
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.actionPlan'))}</div>
    <div class="card" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <strong>${escapeHtml(t('plan360.objectives'))}</strong>
        ${plan360EsOwner() ? `<button class="btn btn-sm" onclick="renderPlan360Objectives(${day})">${escapeHtml(t('common.edit'))}</button>` : ''}
      </div>
      ${objetivos.length ? objetivos.map(o => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:9px;height:9px;border-radius:50%;background:${plan360ObjPriorityColor(o.prioridad)};flex:none"></span>
            <strong style="flex:1">${escapeHtml(o.titulo)}</strong>
          </div>
          ${o.explicacion ? `<p class="muted" style="margin:4px 0 0 17px;font-size:13px">${escapeHtml(o.explicacion)}</p>` : ''}
        </div>
      `).join('') : `<p class="muted">${escapeHtml(t('plan360.noObjectivesYet'))}</p>`}
    </div>
    <div class="card" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <strong>${escapeHtml(t('plan360.investmentPlan'))}</strong>
        ${(d.inversiones || []).length ? `<button class="btn btn-sm" onclick="renderPlan360Inversiones(${day})">${escapeHtml(t('common.view'))}</button>` : ''}
      </div>
      ${(d.inversiones || []).filter(inv => inv.nombre).length ? (d.inversiones || []).filter(inv => inv.nombre).map(inv => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span>${escapeHtml(inv.nombre)}</span><span style="white-space:nowrap">${escapeHtml(plan360InvEuros(inv.coste))}</span>
        </div>`).join('') : `<p class="muted">${escapeHtml(t('plan360.noInvestmentsYet'))}</p>`}
    </div>
    <p class="muted" style="margin:16px 0 6px">${escapeHtml(t('plan360.visualSummary'))}</p>
    <div class="card">${plan360DiasTrabajoVisual()}</div>
  `;
}
/* Plan de inversiones: lo rellena el coach en su panel (Día 2) y aquí
   se ve en solo lectura, con el mismo diseño que los recursos
   (plan360InversionesHtml, en el bloque compartido de js/core.js). Antes
   lo editaba el propio negocio; el coach pidió hacerlo él en la sesión
   (28/09) y que el negocio lo reciba ya ordenado por colores. */
function renderPlan360Inversiones(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d) return;
  document.getElementById('plan360-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
      <button class="btn btn-sm" onclick="descargarPlan360Inversiones(${day})"><i class="ti ti-download"></i> <span>${escapeHtml(t('plan360.libroMarcaDescargarPdf'))}</span></button>
    </div>
    ${plan360InversionesHtml(d, escapeHtml, DB.business.name || '')}
  `;
}
function descargarPlan360Inversiones(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d) return;
  plan360ImprimirHtml(t('plan360.investmentPlan'), plan360InversionesHtml(d, escapeHtml, DB.business.name || ''));
}
// Ventana de impresión con los estilos de la app (la misma que los
// recursos). ⚠️ <\/script> escapado: sin la barra, cierra el script de fuera.
function plan360ImprimirHtml(titulo, cuerpo){
  const win = window.open('', '_blank');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  const estilos = [...document.querySelectorAll('style')].map(x => x.outerHTML).join('');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title>${estilos}
    <style>@page{size:A4;margin:12mm}html,body{overflow:visible!important;height:auto!important;display:block!important;background:#fff!important;padding:0!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head>
    <body>${cuerpo}</body></html>`);
  win.document.close();
  ggEsperarYImprimir(win);
}
function renderPlan360StaffVoice(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const r = d && d.reunionPersonal;
  if(!r || !r.resumenSentAt) return;
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.staffVoice'))}</div>
    <div class="card" style="margin-top:14px">
      <p style="font-size:14px;white-space:pre-wrap">${escapeHtml(r.resumenNegocio || '')}</p>
    </div>
  `;
}
// Los objetivos son el plan estratégico del negocio: es el propietario
// quien los pacta con el coach, igual que el resto del Día 1 es "el coach
// escribe, el negocio lee". No tenía NINGÚN guard — cualquier empleado
// con la pestaña Plan 360° visible podía reescribirlos.
function plan360EsOwner(){
  const s = getAccessSession();
  return !!(s && s.type === 'owner');
}
function renderPlan360Objectives(day){
  if(!plan360EsOwner()){ showToast(t('plan360.objectivesOwnerOnly')); renderPlan360PlanAccion(day); return; }
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d || !Array.isArray(d.objectives)) return;
  plan360ObjetivosDiaActivo = d;
  // Se entra desde el Plan de acción: «Volver» lleva ahí, no al centro del Día 2.
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360PlanAccion(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.objectives'))}</div>
    <div class="card" style="margin-top:14px">
      <div id="p360-obj-list">${d.objectives.map((o, i) => plan360ObjectiveRow(day, o, i)).join('')}</div>
      <button class="btn btn-sm" onclick="addPlan360Objective(${day})" style="margin:6px 0 16px"><i class="ti ti-plus"></i> ${escapeHtml(t('plan360.addObjective'))}</button>
      <button class="btn btn-primary" onclick="savePlan360ObjectivesOnly(${day})">${escapeHtml(t('common.save'))}</button>
    </div>
  `;
}
function savePlan360ObjectivesOnly(day){
  if(!plan360EsOwner()) return;   // segunda barrera: la pantalla que llama aquí ya está gateada
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d || !Array.isArray(d.objectives)) return;
  plan360SyncObjectivesFromForm(d);
  const orden = {prioritario: 0, esencial: 1, complementario: 2};
  d.objectives = d.objectives.filter(o => o.titulo).sort((a, b) => (orden[a.prioridad] ?? 1) - (orden[b.prioridad] ?? 1));
  saveDB();
  showToast(t('plan360.saved'));
  renderPlan360Objectives(day);
}
/* ---- Informe de cliente misterioso: SOLO LECTURA, y solo tras enviarlo ---- */
function plan360MisteryBlockAvgClient(block){
  const scored = block.items.filter(i => i.score !== null && i.score !== undefined && i.score !== '');
  if(!scored.length) return null;
  return Math.round((scored.reduce((s, i) => s + Number(i.score), 0) / scored.length) * 10) / 10;
}
function plan360MisteryOverallAvgClient(mc){
  const avgs = mc.blocks.map(plan360MisteryBlockAvgClient).filter(a => a !== null);
  if(!avgs.length) return null;
  return Math.round((avgs.reduce((s, a) => s + a, 0) / avgs.length) * 10) / 10;
}
// Semáforo de la nota (0-10): mismos umbrales y colores que el panel del coach.
function plan360ScoreColorClient(score){
  if(score === null || score === undefined) return null;
  if(score < 5) return 'var(--red)';
  if(score < 7.5) return 'var(--amber)';
  return 'var(--green)';
}
function renderPlan360MisteryReport(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const mc = d && d.misteryCheck;
  if(!mc || !mc.sentAt) return;
  const media = plan360MisteryOverallAvgClient(mc);
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.misteryClient'))}</div>
    <div class="card" style="margin-top:14px;text-align:center">
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(t('plan360.misteryOverallScore'))}</div>
      <div style="font-size:32px;font-weight:700;${plan360ScoreColorClient(media) ? `color:${plan360ScoreColorClient(media)}` : ''}">${media !== null ? media + '/10' : '—'}</div>
    </div>
    ${mc.blocks.map(b => {
      const avg = plan360MisteryBlockAvgClient(b);
      const col = plan360ScoreColorClient(avg);
      return `<div class="card" style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px">
          <strong>${escapeHtml(b.title)}</strong>
          <span class="p360-day-tag" style="margin:0;flex:none;${col ? `background:${col};color:#fff` : ''}">${avg !== null ? avg + '/10' : '—'}</span>
        </div>
        ${b.items.map(it => `
          <div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">
            <span style="flex:1">${escapeHtml(it.text)}</span>
            <span style="font-family:'IBM Plex Mono',monospace;color:var(--muted);flex:none">${it.score === null || it.score === undefined ? '—' : escapeHtml(String(it.score))}</span>
          </div>
        `).join('')}
        ${b.comment ? `<p style="margin-top:8px;font-size:13px;color:var(--muted)">${escapeHtml(b.comment)}</p>` : ''}
        ${(b.openQuestions || []).filter(q => q.a).map(q => `<div style="margin-top:8px"><div style="font-weight:600;font-size:12.5px">${escapeHtml(q.q)}</div><p style="font-size:13px">${escapeHtml(q.a)}</p></div>`).join('')}
      </div>`;
    }).join('')}
  `;
}
/* ---- Reunión inicial: SOLO LECTURA, y solo tras enviarla ---- */
function renderPlan360ReunionReport(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const r = d && d.reunionInicial;
  if(!r || !r.sentAt) return;
  document.getElementById('plan360-content').innerHTML = `
    <button class="btn btn-sm btn-back" onclick="renderPlan360DayDetail(${day})"><i class="ti ti-arrow-left"></i> <span>${escapeHtml(t('common.back'))}</span></button>
    <div class="view-title" style="margin-top:10px">${escapeHtml(t('plan360.presentialMeeting'))}</div>
    <div class="card" style="margin-top:14px">
      ${r.answers.map(it => `
        <div style="margin-bottom:14px">
          <div style="font-weight:600;font-size:13px">${escapeHtml(it.q)}</div>
          <p style="font-size:14px;margin-top:4px">${it.a ? escapeHtml(it.a) : '—'}</p>
        </div>
      `).join('')}
      ${r.notaLibre ? `<div>
        <div style="font-weight:600;font-size:13px">${escapeHtml(t('plan360.freeSpace'))}</div>
        <p style="font-size:14px;margin-top:4px">${escapeHtml(r.notaLibre)}</p>
      </div>` : ''}
    </div>
  `;
}
// La métrica y sus mediciones son lo que distingue "hice las tareas" de
// "el objetivo se está cumpliendo de verdad" — tareas tachadas miden
// actividad, no resultado. El propietario dice CÓMO se mide su objetivo
// (ej. "% de mermas semanales") y va anotando el valor cada vez que
// corresponda (típicamente en cada reunión de seguimiento, ver
// plan360ReunionAgendaHtml), quedando un historial real, no solo una lista
// de tareas cerradas.
function plan360ObjectiveRow(day, o, i){
  const col = plan360ObjPriorityColor(o.prioridad);
  const mediciones = o.mediciones || [];
  return `<div class="card" style="margin-bottom:10px;${col ? 'border-left:4px solid ' + col : ''}">
    <div class="field" style="margin-bottom:8px">
      <label>${escapeHtml(t('plan360.objTitle'))}</label>
      <input id="p360-obj-titulo-${i}" value="${escapeHtml(o.titulo || '')}">
    </div>
    <div class="field" style="margin-bottom:8px">
      <label>${escapeHtml(t('plan360.objWhy'))}</label>
      <textarea id="p360-obj-explicacion-${i}" rows="3">${escapeHtml(o.explicacion || '')}</textarea>
    </div>
    <div class="field" style="margin-bottom:8px">
      <label>${escapeHtml(t('plan360.objUrgency'))}</label>
      <select id="p360-obj-prioridad-${i}">
        <option value="prioritario" ${o.prioridad === 'prioritario' ? 'selected' : ''}>${escapeHtml(t('plan360.priority.prioritario'))}</option>
        <option value="esencial" ${o.prioridad === 'esencial' ? 'selected' : ''}>${escapeHtml(t('plan360.priority.esencial'))}</option>
        <option value="complementario" ${o.prioridad === 'complementario' ? 'selected' : ''}>${escapeHtml(t('plan360.priority.complementario'))}</option>
      </select>
    </div>
    <div class="field" style="margin-bottom:0">
      <label>${escapeHtml(t('plan360.objMetric'))}</label>
      <input id="p360-obj-metrica-${i}" value="${escapeHtml(o.metrica || '')}" placeholder="${escapeHtml(t('plan360.objMetricPlaceholder'))}">
    </div>
    ${o.metrica ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${escapeHtml(t('plan360.objMeasurements'))}</div>
        ${mediciones.length ? mediciones.map(m => `<div style="display:flex;gap:8px;padding:3px 0;font-size:13px"><span class="muted" style="flex:none">${escapeHtml(plan360FechaLegible(m.fecha))}</span><span style="font-weight:600">${escapeHtml(m.valor)}</span>${m.nota ? `<span class="muted">— ${escapeHtml(m.nota)}</span>` : ''}</div>`).join('')
          : `<p class="muted" style="margin:0;font-size:13px">${escapeHtml(t('plan360.objNoMeasurementsYet'))}</p>`}
        <div style="display:flex;gap:6px;margin-top:8px">
          <input id="p360-obj-medicion-${i}" placeholder="${escapeHtml(t('plan360.objMeasurementValue'))}" style="flex:1">
          <button class="btn btn-sm" onclick="plan360AddMedicion(${i})">${escapeHtml(t('plan360.objMeasurementAdd'))}</button>
        </div>
      </div>` : ''}
  </div>`;
}
let plan360ObjetivosDiaActivo = null;
function addPlan360Objective(day){
  if(!plan360EsOwner()) return;   // segunda barrera: la pantalla que llama aquí ya está gateada
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d || !Array.isArray(d.objectives)) return;
  plan360SyncObjectivesFromForm(d);
  d.objectives.push({id: genId(), titulo: '', explicacion: '', prioridad: 'esencial', metrica: '', mediciones: [], estadoFinal: null});
  document.getElementById('p360-obj-list').innerHTML = d.objectives.map((o, i) => plan360ObjectiveRow(day, o, i)).join('');
}
// La medición se guarda al momento (no espera al botón Guardar general de
// la pantalla) porque es un hecho puntual — "hoy tocaba anotar el número"
// — no un borrador de texto que tenga sentido dejar a medias.
function plan360AddMedicion(i){
  if(!plan360EsOwner() || !plan360ObjetivosDiaActivo) return;
  // Se vuelve a buscar el día en DB: si mientras tanto llegó el bloque de la
  // nube, el objeto guardado ya no es el de DB y la medición se perdía (la
  // misma trampa que el cVivo del I+D). Y antes de repintar se recoge lo
  // escrito en el formulario: repintar sin eso borraba lo no guardado.
  const d = (DB.business.plan360Program || []).find(x => x.day === plan360ObjetivosDiaActivo.day);
  if(!d || !Array.isArray(d.objectives)) return;
  plan360ObjetivosDiaActivo = d;
  plan360SyncObjectivesFromForm(d);
  const o = d.objectives[i];
  const input = document.getElementById('p360-obj-medicion-' + i);
  if(!o || !input || !input.value.trim()) return;
  if(!Array.isArray(o.mediciones)) o.mediciones = [];
  o.mediciones.push({fecha: todayStr(), valor: input.value.trim(), nota: ''});
  saveDB();
  document.getElementById('p360-obj-list').innerHTML = d.objectives.map((ob, j) => plan360ObjectiveRow(d.day, ob, j)).join('');
}
function plan360SyncObjectivesFromForm(d){
  d.objectives.forEach((o, i) => {
    const tituloEl = document.getElementById('p360-obj-titulo-' + i);
    const explEl = document.getElementById('p360-obj-explicacion-' + i);
    const prioEl = document.getElementById('p360-obj-prioridad-' + i);
    const metricaEl = document.getElementById('p360-obj-metrica-' + i);
    if(metricaEl) o.metrica = metricaEl.value.trim();
    if(tituloEl) o.titulo = tituloEl.value.trim();
    if(explEl) o.explicacion = explEl.value.trim();
    if(prioEl) o.prioridad = prioEl.value;
  });
}
// Solo para el día 2 (presentación): el día 1 tiene su propio hub con tres
// sitios separados, ver renderPlan360Dia1Hub.
function savePlan360Presencial(day){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d) return;
  d.notes = (document.getElementById('p360-notes').value || '').trim();
  saveDB();
  showToast(t('plan360.saved'));
  renderPlan360Grid();
}

/* ---- Días de trabajo ---- */
// Las tareas de los 26 días de trabajo ya no las escribe libremente el
// negocio: título, descripción y a qué objetivo del Día 2 responden los
// plantea el coach (mismo criterio que el resto del programa — ver el
// comentario junto a renderPlan360Docs). Lo que SÍ es del negocio es
// marcar el estado (pendiente/hecha/no hecha) y dejar su nota — el
// feedback real de cómo ha ido. Encargo del propietario: "poder añadir
// una tarea que va enlazada a un objetivo... espacio para las notas...
// marcar la actividad como hecha o no hecha" — el enlace y el título los
// pone el coach al planificar, el estado y la nota los pone el negocio
// al ejecutar.
const PLAN360_TASK_ESTADOS = ['pendiente', 'hecha', 'no_hecha'];
const PLAN360_TASK_ESTADO_COLOR = {pendiente: 'var(--muted)', hecha: 'var(--green)', no_hecha: 'var(--red)'};
function plan360TaskEstadoLabel(estado){
  return t('plan360.taskStatus.' + (estado || 'pendiente'));
}
function plan360ObjetivoDeTarea(tk){
  if(tk.objectiveId == null) return null;   // nunca cruzar por id "undefined === undefined" con un objetivo de antes de tener id
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  return ((dia2 && dia2.objectives) || []).find(o => o.id === tk.objectiveId) || null;
}
function renderPlan360TrabajoDetail(d){
  const {weekday, dayMonth} = plan360FormatDate(d.day);
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(d.title, weekday + ' · ' + dayMonth)}
    ${plan360ReunionCardHtml(d.day, d.reunion)}
    <div class="card" style="margin-top:14px">
      <div style="font-weight:600;margin-bottom:6px">${escapeHtml(t('plan360.tasks'))}</div>
      <div id="p360-task-list">${d.tasks.length ? d.tasks.map((tk, i) => plan360TaskRow(d.day, tk, i)).join('') : `<p class="muted">${escapeHtml(t('plan360.noTasksYet'))}</p>`}</div>
    </div>
  `;
}
// La reunión (presencial u online) la plantea el coach desde su panel:
// tipo + agenda (qué objetivos se revisan ese día). El negocio la marca
// como hecha, deja sus notas/acuerdos, y — el enlace real con "¿se está
// cumpliendo el objetivo?" — puede anotar ahí mismo el valor de cada
// métrica de la agenda, en el momento en que se acaba de hablar de ella.
function plan360ReunionCardHtml(day, reunion){
  if(!reunion) return '';
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  const objetivos = ((dia2 && dia2.objectives) || []).filter(o => (reunion.objectiveIds || []).includes(o.id));
  const esOwner = plan360EsOwner();
  return `<div class="card" style="margin-top:14px;border-color:var(--ink)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <i class="ti ${reunion.tipo === 'online' ? 'ti-video' : 'ti-users'}" style="font-size:20px"></i>
      <strong style="flex:1">${escapeHtml(t('plan360.meeting'))} — ${escapeHtml(t('plan360.reviewType.' + reunion.tipo))}</strong>
      <span class="p360-day-tag" style="margin:0;${reunion.hecha ? 'background:var(--green);color:#fff' : ''}">${escapeHtml(t(reunion.hecha ? 'plan360.meetingDone' : 'plan360.meetingPending'))}</span>
    </div>
    ${objetivos.length ? `
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${escapeHtml(t('plan360.meetingAgenda'))}</div>
      <ul style="margin:0 0 10px 18px;padding:0;font-size:13.5px">${objetivos.map(o => `<li>${escapeHtml(o.titulo)}</li>`).join('')}</ul>
    ` : `<p class="muted" style="font-size:13px">${escapeHtml(t('plan360.meetingNoAgenda'))}</p>`}
    ${esOwner && !reunion.hecha ? `<button class="btn btn-sm btn-primary" onclick="plan360MarcarReunionHecha(${day})">${escapeHtml(t('plan360.meetingMarkDone'))}</button>` : ''}
    ${reunion.hecha && objetivos.length ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${escapeHtml(t('plan360.meetingLogProgress'))}</div>
        ${objetivos.map(o => `
          <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
            <span style="flex:1;font-size:13px">${escapeHtml(o.titulo)}</span>
            ${esOwner ? `
              <input id="p360-reunion-medicion-${o.id}" placeholder="${escapeHtml(t('plan360.objMeasurementValue'))}" style="width:110px">
              <button class="btn btn-sm" onclick="plan360AddMedicionDesdeReunion(${day},${o.id})">${escapeHtml(t('plan360.objMeasurementAdd'))}</button>
            ` : `<span class="muted" style="font-size:12px">${(o.mediciones || []).length ? escapeHtml(o.mediciones[o.mediciones.length - 1].valor) : '—'}</span>`}
          </div>
        `).join('')}
      </div>` : ''}
    ${esOwner ? `<div class="field" style="margin-top:10px">
      <label>${escapeHtml(t('plan360.meetingNotes'))}</label>
      <textarea id="p360-reunion-notas" rows="3" onchange="plan360SaveReunionNotas(${day},this.value)">${escapeHtml(reunion.notas || '')}</textarea>
    </div>` : (reunion.notas ? `<p style="font-size:13px;margin-top:10px">${escapeHtml(reunion.notas)}</p>` : '')}
  </div>`;
}
function plan360MarcarReunionHecha(day){
  if(!plan360EsOwner()) return;
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d || !d.reunion) return;
  d.reunion.hecha = true;
  d.reunion.completadaAt = Date.now();
  saveDB();
  renderPlan360TrabajoDetail(d);
}
function plan360SaveReunionNotas(day, valor){
  if(!plan360EsOwner()) return;
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  if(!d || !d.reunion) return;
  d.reunion.notas = valor.trim();
  saveDB();
}
function plan360AddMedicionDesdeReunion(day, objId){
  if(!plan360EsOwner()) return;
  const dia2 = (DB.business.plan360Program || []).find(x => x.day === 2);
  if(!dia2) return;
  const o = (dia2.objectives || []).find(x => x.id === objId);
  const input = document.getElementById('p360-reunion-medicion-' + objId);
  if(!o || !input || !input.value.trim()) return;
  if(!Array.isArray(o.mediciones)) o.mediciones = [];
  o.mediciones.push({fecha: todayStr(), valor: input.value.trim(), nota: ''});
  saveDB();
  input.value = '';
  showToast(t('plan360.saved'));
}
function plan360TaskRow(day, tk, i){
  const obj = plan360ObjetivoDeTarea(tk);
  const estado = tk.status || 'pendiente';
  return `<div class="card" style="padding:10px;margin-bottom:8px">
    ${obj ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:${plan360ObjPriorityColor(obj.prioridad)};flex:none"></span><span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em">${escapeHtml(obj.titulo)}</span></div>` : ''}
    <div style="font-weight:700;font-size:14.5px">${escapeHtml(tk.title)}</div>
    ${tk.description ? `<p style="font-size:13.5px;margin:4px 0 0;color:var(--body)">${escapeHtml(tk.description)}</p>` : ''}
    ${tk.fileName ? `<div style="margin-top:6px;font-size:12px"><i class="ti ti-paperclip"></i> ${escapeHtml(tk.fileName)}</div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      ${PLAN360_TASK_ESTADOS.map(e => `<button class="btn btn-sm ${estado === e ? ({pendiente:'is-lim', hecha:'is-on', no_hecha:'is-off'}[e]) : ''}" aria-pressed="${estado === e}" onclick="plan360SetTaskEstado(${day},${i},'${e}',${Number(tk.id) || 0})">${escapeHtml(plan360TaskEstadoLabel(e))}</button>`).join('')}
    </div>
    <div class="field" style="margin:10px 0 0">
      <label>${escapeHtml(t('plan360.taskNote'))}</label>
      <textarea id="p360-task-note-${i}" rows="2" onchange="plan360SaveTaskNote(${day},${i},this.value,${Number(tk.id) || 0})">${escapeHtml(tk.note || '')}</textarea>
    </div>
  </div>`;
}
// Las tareas se buscan por su id: por posición, si el coach reordenaba o
// quitaba una con esta pantalla abierta, el estado caía en otra tarea.
function plan360BuscarTarea(d, i, id){
  const tareas = (d && d.tasks) || [];
  return (id && tareas.find(tk => Number(tk.id) === Number(id))) || (!id ? tareas[i] : null);
}
function plan360SetTaskEstado(day, i, estado, id){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const tk = plan360BuscarTarea(d, i, id);
  if(!tk) return;
  tk.status = estado;
  saveDB();
  // El mismo botón se pinta en dos sitios distintos (el detalle del día y
  // la tarjeta "Hoy" de la pantalla principal), y solo el primero tiene el
  // contenedor #p360-task-list — en el segundo hay que repintar la
  // pantalla entera para que también se actualicen los atrasados.
  const lista = document.getElementById('p360-task-list');
  if(lista) lista.innerHTML = d.tasks.map((tk2, j) => plan360TaskRow(day, tk2, j)).join('');
  else withScrollPreserved(() => renderPlan360Grid());
}
function plan360SaveTaskNote(day, i, valor, id){
  const d = (DB.business.plan360Program || []).find(x => x.day === day);
  const tk = plan360BuscarTarea(d, i, id);
  if(!tk) return;
  tk.note = valor.trim();
  saveDB();
}

/* ---- ★ Resumen ---- */
// De un vistazo: primer valor registrado vs. el último, para ver si el
// objetivo se mueve de verdad — no solo si hay tareas tachadas debajo.
function plan360MedicionesResumenHtml(obj){
  if(!obj.metrica) return '';
  const m = obj.mediciones || [];
  if(!m.length) return `<p class="muted" style="margin:0 0 6px;font-size:12.5px">${escapeHtml(obj.metrica)} — ${escapeHtml(t('plan360.objNoMeasurementsYet'))}</p>`;
  const primero = m[0], ultimo = m[m.length - 1];
  return `<div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">
    ${escapeHtml(obj.metrica)}: ${m.length > 1 ? `<strong style="color:var(--text)">${escapeHtml(primero.valor)}</strong> → ` : ''}<strong style="color:var(--text)">${escapeHtml(ultimo.valor)}</strong> <span>(${escapeHtml(plan360FechaLegible(ultimo.fecha))})</span>
  </div>`;
}
function renderPlan360SummaryPage(){
  const prog = DB.business.plan360Program || [];
  const dia2 = prog.find(x => x.day === 2);
  const orden = {prioritario: 0, esencial: 1, complementario: 2};
  const objetivos = ((dia2 && dia2.objectives) || []).filter(o => o.titulo).slice().sort((a, b) => (orden[a.prioridad] ?? 1) - (orden[b.prioridad] ?? 1));
  const trabajo = prog.filter(x => x.phase === 'trabajo');
  const tareas = trabajo.reduce((arr, d) => arr.concat(d.tasks.filter(tk => tk.title).map(tk => ({...tk, day: d.day}))), []);
  const hechas = tareas.filter(tk => tk.status === 'hecha');
  const grupos = objetivos.map(o => ({obj: o, tareas: tareas.filter(tk => tk.objectiveId === o.id)}));
  const tareaLinea = tk => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">
    <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;color:#fff;background:${PLAN360_TASK_ESTADO_COLOR[tk.status || 'pendiente']};flex:none">${escapeHtml(plan360TaskEstadoLabel(tk.status))}</span>
    <span class="muted" style="flex:none">${escapeHtml(plan360FormatDate(tk.day).dayMonth)}</span>
    <span style="flex:1">${escapeHtml(tk.title)}</span>
  </div>`;
  document.getElementById('plan360-content').innerHTML = `
    ${plan360PageHeader(t('plan360.summaryTitle'))}
    <div class="card" style="margin-top:14px">
      <div style="font-weight:600">${escapeHtml(t('plan360.tasksDone'))}</div>
      <div style="font-size:28px;font-weight:800;margin-top:4px">${hechas.length}<span style="font-size:16px;color:var(--muted);font-weight:600"> / ${tareas.length}</span></div>
    </div>
    <div style="font-weight:600;margin:16px 0 4px">${escapeHtml(t('plan360.objectives'))}</div>
    ${!objetivos.length ? `<p style="color:var(--muted)">${escapeHtml(t('plan360.noObjectives'))}</p>` : grupos.map(g => `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="width:9px;height:9px;border-radius:50%;background:${plan360ObjPriorityColor(g.obj.prioridad)};flex:none"></span>
          <strong style="flex:1">${escapeHtml(g.obj.titulo)}</strong>
        </div>
        ${plan360MedicionesResumenHtml(g.obj)}
        ${g.tareas.length ? g.tareas.map(tareaLinea).join('') : `<p class="muted" style="margin:0;font-size:13px">${escapeHtml(t('plan360.noTasksYet'))}</p>`}
      </div>`).join('')}
  `;
}
// Comunidad de Bienes: NO es una sociedad — no tributa ella, tributa CADA
// comunero por SU IRPF según SU porcentaje de participación, y cada uno
// puede estar en un tramo distinto (uno puede tener otros ingresos, el
// otro no). Por eso aquí no hay un único "% de impuesto": hay una lista de
// comuneros, cada uno con su % y su propio tipo — se suma lo que le toca
// a cada uno sobre su parte del resultado. Ver resultadoMes (js/hr.js).
function renderComunerosHtml(b){
  const comuneros = b.comuneros || [];
  const sumaPct = comuneros.reduce((s,c)=>s+(parseFloat(c.pct)||0), 0);
  return `
    <div class="ge-section" style="margin:4px 0 10px">
      <div class="ge-sec-head"><h4 style="margin:0">${t('mn.fiscal.comuneros')}</h4>
        <button class="btn btn-sm" onclick="addComunero()"><i class="ti ti-plus"></i> ${t('common.add')}</button></div>
      <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${t('mn.fiscal.comunerosDesc')}</p>
      ${comuneros.length ? comuneros.map((c,i)=>`
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input type="text" value="${escapeHtml(c.nombre||'')}" placeholder="${t('mn.fiscal.comuneroNombrePh')}" style="flex:1;min-width:0;padding:6px 8px;font-size:13px" onchange="updateComunero(${i},'nombre',this.value)">
          <input type="number" min="0" max="100" step="0.01" value="${c.pct!=null?c.pct:''}" placeholder="%" style="width:72px;padding:6px 4px;font-size:13px;text-align:center" onchange="updateComunero(${i},'pct',this.value)">
          <input type="number" min="0" max="100" step="0.5" value="${c.tipoIrpf!=null?c.tipoIrpf:''}" placeholder="${t('mn.fiscal.comuneroIrpfPh')}" style="width:72px;padding:6px 4px;font-size:13px;text-align:center" onchange="updateComunero(${i},'tipoIrpf',this.value)">
          <button class="btn btn-sm btn-icon btn-danger" onclick="removeComunero(${i})"><i class="ti ti-trash"></i></button>
        </div>`).join('') : `<p style="font-size:13px;color:var(--muted)">${t('mn.fiscal.comunerosEmpty')}</p>`}
      ${comuneros.length ? `<p style="font-size:12px;margin:4px 0 0;color:${Math.abs(sumaPct-100)>0.5?'var(--red)':'var(--muted)'}">${t('mn.fiscal.comunerosSuma').replace('${pct}', sumaPct.toFixed(2))}</p>` : ''}
    </div>`;
}
function addComunero(){
  if(!DB.business.comuneros) DB.business.comuneros = [];
  DB.business.comuneros.push({nombre:'', pct:'', tipoIrpf:''});
  saveDB(); renderMiNegocio();
}
function updateComunero(i, field, val){
  const c = (DB.business.comuneros||[])[i];
  if(!c) return;
  c[field] = (field==='nombre') ? val.trim() : (parseFloat(val)||0);
  saveDB(); renderMiNegocio();
}
function removeComunero(i){
  DB.business.comuneros = (DB.business.comuneros||[]).filter((_,idx)=>idx!==i);
  saveDB(); renderMiNegocio();
}
function renderMiNegocio(){
  aplicarFiscalDeLicencia();   // forma jurídica y régimen fijados por GastroGoan: siempre al día antes de pintar
  if(isGestionLocked('minegocio')){ denyGestionAccess(); return; }
  const b = DB.business || {};
  // Si el formulario ya estaba pintado y el usuario había cambiado los
  // checkboxes de "Tipos de servicio" sin pulsar aún "Guardar", conservamos
  // esos valores al re-renderizar (p.ej. tras guardar el logo, una plataforma
  // de delivery o el PIN), para que no se reviertan los cambios sin guardar.
  const prevServ = {
    mesa: document.getElementById('mn-serv-mesa')?.checked,
    takeaway: document.getElementById('mn-serv-takeaway')?.checked,
    delivery: document.getElementById('mn-serv-delivery')?.checked,
  };
  const tiposServicio = {
    mesa: prevServ.mesa !== undefined ? prevServ.mesa : (b.tiposServicio?.mesa !== false),
    takeaway: prevServ.takeaway !== undefined ? prevServ.takeaway : (b.tiposServicio?.takeaway !== false),
    delivery: prevServ.delivery !== undefined ? prevServ.delivery : (b.tiposServicio?.delivery !== false),
  };
  document.getElementById('minegocio-content').innerHTML = `
    <div class="mn-grid">
    <div class="card" style="border:2px solid var(--ink);background:var(--teal-l, #EDF1EC)">
      <h3 style="color:var(--ink)"><i class="ti ti-key"></i> ${t('mn.businessCode.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.businessCode.desc')}</p>
      <div style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border)">${escapeHtml((getBusinessSlots().find(s=>s.id===ACTIVE_SLOT)||{}).code || '—')}</div>
    </div>

    <!-- El PIN de aquí abajo NO es la contraseña de acceso del propietario:
         esa es por dispositivo (gastrogoan_owner_login), no por negocio, y su
         cambio vive en la pantalla de elegir negocio (renderBusinessSelectScreenHtml,
         js/core.js) — un único sitio, en vez de repetirlo en cada Mi Negocio
         cuando el dueño tiene varios locales. Este PIN, en cambio, sí es
         propio de este negocio: confirma acciones delicadas del día a día. -->
    <div class="card" style="border:2px solid var(--ink);background:var(--brand-cream)">
      <h3 style="color:var(--ink)"><i class="ti ti-lock"></i> ${t('mn.ownerAccess.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.ownerAccess.desc')}</p>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.ownerAccess.newPin')}</label>
          <input type="password" id="mn-pin-new" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:20px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div class="field">
          <label>${t('mn.ownerAccess.repeatPin')}</label>
          <input type="password" id="mn-pin-new2" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:20px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
      </div>
      <button class="btn btn-sm" onclick="changeOwnerPin()"><i class="ti ti-key"></i> ${t('mn.ownerAccess.changePin')}</button>
    </div>

    ${renderExternalConnectionsCard()}


    <div class="card mn-grid-full">
      <h3><i class="ti ti-building-store"></i> ${t('mn.business.title')}</h3>

      <h4 style="margin-top:0"><i class="ti ti-id-badge-2"></i> ${t('mn.business.identity')}</h4>
      <div class="field">
        <label>${t('mn.business.logo')}</label>
        <div style="display:flex;align-items:center;gap:12px">
          <div id="mn-logo-preview" style="width:64px;height:64px;border-radius:10px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff">
            ${b.logo ? `<img src="${b.logo}" style="width:100%;height:100%;object-fit:contain">` : `<i class="ti ti-photo" style="color:var(--muted)"></i>`}
          </div>
          <div>
            <input type="file" id="mn-logo-input" accept="image/*" style="display:none" onchange="handleLogoUpload(this)">
            <button class="btn btn-sm" onclick="document.getElementById('mn-logo-input').click()"><i class="ti ti-upload"></i> ${t('mn.business.uploadLogo')}</button>
            ${b.logo ? `<button class="btn btn-sm btn-danger" onclick="removeLogo()"><i class="ti ti-trash"></i> ${t('common.remove')}</button>` : ''}
          </div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.business.name')}</label>
          <input type="text" id="business-name" value="${escapeHtml(b.name||'')}" placeholder="${t('mn.business.namePh')}" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>${t('mn.business.owner')}</label>
          <input type="text" id="mn-prop" value="${escapeHtml(b.prop||'')}" placeholder="${t('mn.business.ownerPh')}" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.business.type')}</label>
          <select id="mn-tipo" onchange="saveBusiness(true)">
            ${BUSINESS_TIPOS.map(bt=>`<option value="${bt}" ${b.tipo===bt?'selected':''}>${escapeHtml(businessTypeLabel(bt))}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${t('mn.business.yearOpened')}</label>
          <input type="number" id="mn-anyo" value="${escapeHtml(b.anyo||'')}" placeholder="2020" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field bc-bloque">
        <label>${escapeHtml(gl({es:'Colores de marca', ca:'Colors de marca', en:'Brand colours'}))}</label>
        <p class="txt-xs" style="color:var(--muted);margin:0 0 8px">${t('mn.business.brandColorHint')} ${escapeHtml(gl({es:'El principal es para botones y acentos; el secundario, para títulos y pestañas.', ca:'El principal és per a botons i accents; el secundari, per a títols i pestanyes.', en:'Primary is for buttons and accents; secondary for headings and tabs.'}))}</p>
        <div class="bc-fila">
          <label class="bc-color"><input type="color" id="mn-brand-color" value="${escapeHtml(b.brandColor||'#4A5D4E')}" onchange="saveBusiness(true);renderMiNegocio()"><span>${escapeHtml(gl({es:'Principal', ca:'Principal', en:'Primary'}))} <code>${escapeHtml((b.brandColor||'#4A5D4E').toUpperCase())}</code></span></label>
          <label class="bc-color"><input type="color" id="mn-brand-color2" value="${escapeHtml(b.brandColor2||'#1C1A17')}" onchange="saveBusiness(true);renderMiNegocio()"><span>${escapeHtml(gl({es:'Secundario', ca:'Secundari', en:'Secondary'}))} <code>${escapeHtml((b.brandColor2||'#1C1A17').toUpperCase())}</code></span></label>
          <button type="button" class="btn btn-sm btn-fino" onclick="restablecerColoresMarca()"><i class="ti ti-refresh"></i> ${escapeHtml(gl({es:'Restablecer', ca:'Restablir', en:'Reset'}))}</button>
        </div>
        ${ggContrasteHex(b.brandColor||'#4A5D4E', '#FFFFFF') < 4.5 ? `<p class="manual-warning" style="margin-top:8px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es:'Con ese color principal el texto blanco de los botones se lee mal; en la web de reservas se usará una versión más oscura (' + ggOscurecerHasta(b.brandColor||'#4A5D4E', 4.5).toUpperCase() + ') para que se lea bien.', ca:'Amb aquest color principal el text blanc dels botons es llegeix malament; a la web de reserves es farà servir una versió més fosca (' + ggOscurecerHasta(b.brandColor||'#4A5D4E', 4.5).toUpperCase() + ') perquè es llegeixi bé.', en:'With this primary colour the white button text is hard to read; the booking site will use a darker version (' + ggOscurecerHasta(b.brandColor||'#4A5D4E', 4.5).toUpperCase() + ') so it stays legible.'}))}</p>` : ''}
        <div id="mn-logo-colores"></div>
        <div class="bc-vista" style="--bc1:${escapeHtml(ggOscurecerHasta(b.brandColor||'#4A5D4E', 4.5))};--bc2:${escapeHtml(ggContrasteHex(b.brandColor2||'#1C1A17', '#FFFFFF') >= 3 ? (b.brandColor2||'#1C1A17') : ggOscurecerHasta(b.brandColor2||'#1C1A17', 3))}" aria-hidden="true"><span class="bc-v-tit">${escapeHtml(b.name || 'Tu restaurante')}</span><span class="bc-v-btn">${escapeHtml(gl({es:'Reservar mesa', ca:'Reservar taula', en:'Book a table'}))}</span></div>
      </div>

      <h4><i class="ti ti-building-bank"></i> ${t('mn.fiscal.title')}</h4>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">${t('mn.fiscal.desc')}</p>
      ${b.fiscalFijado ? `<p class="mn-bloqueo"><i class="ti ti-lock"></i> <span>${gl({es:'La forma jurídica y el régimen los fija GastroGoan al darte de alta, según lo que declara tu gestoría: de ellos depende cómo se calcula tu impuesto. Si ha cambiado (por ejemplo, pasas de autónomo a sociedad), pídenoslo y pulsa «Comprobar cambios».', ca:'La forma jurídica i el règim els fixa GastroGoan en donar-te d\'alta, segons el que declara la teva gestoria: d\'ells depèn com es calcula el teu impost. Si ha canviat (per exemple, passes d\'autònom a societat), demana-ho\'ns i prem «Comprovar canvis».', en:'The legal form and tax regime are set by GastroGoan when you sign up, based on what your accountant files: your tax calculation depends on them. If it changed (for example, from self-employed to company), ask us and press «Check for changes».'})}</span> <button type="button" class="btn btn-sm" onclick="refrescarFiscalDeLicencia()"><i class="ti ti-refresh"></i> ${gl({es:'Comprobar cambios', ca:'Comprovar canvis', en:'Check for changes'})}</button></p>` : ''}
      ${!b.fiscalFijado ? `<p class="mn-bloqueo mn-bloqueo-aviso"><i class="ti ti-lock"></i> <span>${gl({es:'Aún no los ha fijado GastroGoan. La forma jurídica y el régimen no se eligen aquí: los pone GastroGoan al darte de alta, según lo que declara tu gestoría (de ellos depende cómo se calcula tu impuesto). Escríbenos y, cuando los hayamos puesto, pulsa «Comprobar cambios».', ca:'Encara no els ha fixat GastroGoan. La forma jurídica i el règim no s\'trien aquí: els posa GastroGoan en donar-te d\'alta, segons el que declara la teva gestoria (d\'ells depèn com es calcula el teu impost). Escriu-nos i, quan els hàgim posat, prem «Comprovar canvis».', en:'GastroGoan has not set them yet. The legal form and tax regime are not chosen here: GastroGoan sets them when you sign up, based on what your accountant files (your tax calculation depends on them). Write to us and, once we have set them, press «Check for changes».'})}</span> <button type="button" class="btn btn-sm" onclick="refrescarFiscalDeLicencia()"><i class="ti ti-refresh"></i> ${gl({es:'Comprobar cambios', ca:'Comprovar canvis', en:'Check for changes'})}</button></p>` : ''}
      <div class="field-row">
        <div class="field">
          <label>${t('mn.fiscal.forma')}</label>
          <select id="mn-forma-juridica" onchange="saveBusiness(true);renderMiNegocio()" disabled>
            <option value="" ${b.formaJuridica?'':'selected'} disabled>${t('mn.fiscal.chooseForma')}</option>
            <option value="autonomo" ${b.formaJuridica==='autonomo'?'selected':''}>${t('mn.fiscal.autonomo')}</option>
            <option value="cb" ${b.formaJuridica==='cb'?'selected':''}>${t('mn.fiscal.cb')}</option>
            <option value="sociedad" ${b.formaJuridica==='sociedad'?'selected':''}>${t('mn.fiscal.sociedad')}</option>
            <option value="cooperativa" ${b.formaJuridica==='cooperativa'?'selected':''}>${t('mn.fiscal.cooperativa')}</option>
          </select>
        </div>
        ${b.formaJuridica==='autonomo' ? `
        <div class="field">
          <label>${t('mn.fiscal.regimen')}</label>
          <select id="mn-regimen-fiscal" onchange="saveBusiness(true);renderMiNegocio()" disabled>
            <option value="" ${b.regimenFiscal?'':'selected'} disabled>${t('mn.fiscal.chooseRegimen')}</option>
            <option value="directa" ${b.regimenFiscal==='directa'?'selected':''}>${t('mn.fiscal.directa')}</option>
            <option value="modulos" ${b.regimenFiscal==='modulos'?'selected':''}>${t('mn.fiscal.modulos')}</option>
          </select>
        </div>
        ${b.regimenFiscal==='directa' ? `<div class="field">
          <label>${t('mn.fiscal.modalidad')}</label>
          <select id="mn-modalidad-directa" onchange="saveBusiness(true)" disabled>
            <option value="simplificada" ${b.modalidadDirecta!=='normal'?'selected':''}>${t('mn.fiscal.simplificada')}</option>
            <option value="normal" ${b.modalidadDirecta==='normal'?'selected':''}>${t('mn.fiscal.normal')}</option>
          </select>
        </div>
        <label style="display:flex;align-items:flex-start;gap:8px;min-height:44px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="mn-inicio-actividad" ${b.inicioActividad20?'checked':''} onchange="saveBusiness(true)" style="width:auto;margin-top:3px">
          <span>${t('mn.fiscal.inicioActividad')}</span>
        </label>` : ''}` : ''}
      </div>
      ${(b.formaJuridica==='autonomo' || b.formaJuridica==='cb') ? `<div class="field-row"><div class="field">
          <label>${gl({es:'Comunidad autónoma (escala del IRPF)', ca:'Comunitat autònoma (escala de l\'IRPF)', en:'Region (income-tax scale)'})}</label>
          <select id="mn-territorio" onchange="saveBusiness(true);renderMiNegocio()" disabled>
            ${fiscalTerritoriosLista().map(k => `<option value="${k}" ${(b.territorio||'general')===k?'selected':''}>${FISCAL_TERRITORIOS[k]()}</option>`).join('')}
          </select>
          <div class="txt-xs" style="color:var(--muted);margin-top:4px">${gl({es:'Cada comunidad tiene su escala. Solo Cataluña está cargada y verificada; para el resto se usa una escala general de referencia (la previsión lo avisa).', ca:'Cada comunitat té la seva escala. Només Catalunya està carregada i verificada; per a la resta s\'usa una escala general de referència (la previsió ho avisa).', en:'Each region has its own scale. Only Catalonia is loaded and verified; the rest use a reference general scale (the forecast warns you).'})}</div>
        </div></div>` : ''}
      ${b.formaJuridica==='sociedad' ? `<p style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${t('mn.fiscal.sociedadHint')}</p>` : ''}
      ${b.formaJuridica==='cooperativa' ? `<p style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${t('mn.fiscal.cooperativaHint')}</p>` : ''}
      ${b.formaJuridica==='cb' ? renderComunerosHtml(b) : ''}
      ${(b.formaJuridica==='autonomo' || b.formaJuridica==='cb') ? `<div class="grid-2" style="gap:10px;margin-bottom:6px">
        <div class="field"><label for="mn-otras-rentas">${t('mn.fiscal.otrasRentas')}</label><input type="number" id="mn-otras-rentas" min="0" step="1" value="${escapeHtml(String(b.otrasRentasTitular||''))}" onchange="saveBusiness(true)" ></div>
        <div class="field"><label for="mn-hijos">${t('mn.fiscal.hijos')}</label><input type="number" id="mn-hijos" min="0" step="1" value="${escapeHtml(String(b.hijosTitular||''))}" onchange="saveBusiness(true)" ></div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-2px 0 10px">${t('mn.fiscal.otrasRentasHint')}</p>` : ''}
      ${(b.formaJuridica==='sociedad' || b.formaJuridica==='cooperativa') ? `<div class="grid-2" style="gap:10px;margin-bottom:6px">
        <div class="field"><label for="mn-incn-anterior">${t('mn.fiscal.incnAnterior')}</label><input type="number" id="mn-incn-anterior" min="0" step="1" value="${escapeHtml(String(b.incnAnterior!=null?b.incnAnterior:''))}" onchange="saveBusiness(true)" ></div>
      </div>` : ''}
      ${b.formaJuridica==='cooperativa' ? `<div class="grid-2" style="gap:10px;margin-bottom:6px">
        <div class="field"><label for="mn-coop-tipo">${t('mn.fiscal.coopTipo')}</label>
          <select id="mn-coop-tipo" onchange="saveBusiness(true)">
            <option value="protegida" ${b.coopTipo!=='especial'?'selected':''}>${t('mn.fiscal.coopProtegida')}</option>
            <option value="especial" ${b.coopTipo==='especial'?'selected':''}>${t('mn.fiscal.coopEspecial')}</option>
          </select></div>
        <div class="field"><label for="mn-coop-fro">${t('mn.fiscal.coopFro')}</label><input type="number" id="mn-coop-fro" min="0" step="1" value="${escapeHtml(String(b.coopFro!=null?b.coopFro:20))}" onchange="saveBusiness(true)" ></div>
        <div class="field"><label for="mn-coop-fep">${t('mn.fiscal.coopFep')}</label><input type="number" id="mn-coop-fep" min="0" step="1" value="${escapeHtml(String(b.coopFep!=null?b.coopFep:5))}" onchange="saveBusiness(true)" ></div>
      </div>` : ''}

      <h4><i class="ti ti-notes"></i> ${t('mn.business.description')}</h4>
      <div class="field">
        <label>${t('mn.business.descriptionLabel')}</label>
        <textarea id="business-description" placeholder="${t('mn.business.descriptionPh')}" onchange="saveBusiness(true)">${escapeHtml(b.description||'')}</textarea>
      </div>

      <h4><i class="ti ti-address-book"></i> ${t('mn.business.contact')}</h4>
      <div class="field">
        <label>${t('mn.business.address')}</label>
        <input type="text" id="business-address" value="${escapeHtml(b.address||'')}" placeholder="${t('mn.business.addressPh')}" onchange="saveBusiness(true)">
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t('common.phone')}</label>
          <input type="text" id="business-phone" value="${escapeHtml(b.phone||'')}" placeholder="${t('mn.business.phonePh')}" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>${t('common.email')}</label>
          <input type="email" id="business-email" value="${escapeHtml(b.email||'')}" placeholder="contacto@negocio.com" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.business.web')}</label>
          <input type="url" id="mn-web" value="${escapeHtml(b.web||'')}" placeholder="www.milocal.com" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>${t('mn.business.taxId')}</label>
          <input type="text" id="mn-cif" value="${escapeHtml(b.cif||'')}" placeholder="B12345678" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field">
        <label>${t('mn.legal.titular')}</label>
        <input type="text" id="mn-legal-titular" value="${escapeHtml((b.legalPublico||{}).titular||'')}" placeholder="${t('mn.legal.titularPh')}" onchange="saveBusiness(true)">
        <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;margin-top:8px;cursor:pointer">
          <input type="checkbox" id="mn-legal-nif" ${(b.legalPublico||{}).nif?'checked':''} onchange="saveBusiness(true)" style="width:auto;margin-top:3px">
          <span class="txt-xs">${t('mn.legal.nifPublico')}</span>
        </label>
      </div>

      <h4><i class="ti ti-brand-instagram"></i> ${t('mn.business.socialMedia')}</h4>
      <div class="field-row">
        <div class="field">
          <label>Instagram</label>
          <input type="text" id="mn-ig" value="${escapeHtml(b.ig||'')}" placeholder="@milocal" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>Facebook</label>
          <input type="text" id="mn-fb" value="${escapeHtml(b.fb||'')}" placeholder="milocal" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>TikTok</label>
          <input type="text" id="mn-tiktok" value="${escapeHtml(b.tiktok||'')}" placeholder="@milocal" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>${t('mn.business.gmapsLabel')}</label>
          <input type="url" id="mn-gmaps" value="${escapeHtml(b.gmaps||'')}" placeholder="https://maps.app.goo.gl/..." onchange="saveBusiness(true)">
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 14px">${t('mn.business.gmapsHint')}</p>

      <button class="btn btn-primary" onclick="saveBusiness()"><i class="ti ti-device-floppy"></i> ${t('mn.business.saveAll')}</button>

      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
      <h4 style="margin-top:0"><i class="ti ti-toggle-right"></i> ${t('mn.serviceTypes.title')}</h4>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.serviceTypes.desc')}</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-mesa" ${tiposServicio.mesa?'checked':''} onchange="toggleTipoServicio('mesa', this.checked)" style="width:18px;height:18px"> <i class="ti ti-tools-kitchen-2"></i> ${t('mn.serviceTypes.table')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-takeaway" ${tiposServicio.takeaway?'checked':''} onchange="toggleTipoServicio('takeaway', this.checked)" style="width:18px;height:18px"> <i class="ti ti-shopping-bag"></i> ${t('mn.serviceTypes.takeaway')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-delivery" ${tiposServicio.delivery?'checked':''} onchange="toggleTipoServicio('delivery', this.checked)" style="width:18px;height:18px"> <i class="ti ti-moped"></i> ${t('mn.serviceTypes.delivery')}
        </label>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
      <h4 style="margin-top:0"><i class="ti ti-calendar-time"></i> ${t('mn.schedule.title')}</h4>
      <p style="font-size:13px;color:var(--muted,#888)">${t('mn.schedule.desc1')}</p>
      <p style="font-size:13px;color:var(--muted,#888)">${t('mn.schedule.desc2')}</p>
      <div id="mn-horario-list">${renderHorarioRows(b.horario)}</div>
      ${renderDiasCerradosHtml()}
      ${renderHorarioEspecialHtml()}
    </div>

    <div class="card mn-grid-full">
      <h3><i class="ti ti-layout-grid"></i> ${t('mn.ops.title')}</h3>
      <div class="field">
        <label>${t('mn.ops.capacity')}</label>
        <input type="number" id="mn-aforo" value="${escapeHtml(b.aforo||'')}" placeholder="40" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">${t('mn.ops.capacityDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.ops.tableDuration')}</label>
        <input type="number" id="mn-reserva-duracion" min="15" step="15" value="${escapeHtml(b.reservaDuracionMin||'')}" placeholder="90" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">${t('mn.ops.tableDurationDesc')}</small>
      </div>
      <div class="field">
        <label for="mn-reserva-margen-cierre">${t('mn.ops.lastBookingMargin')}</label>
        <input type="number" id="mn-reserva-margen-cierre" min="0" step="5" value="${escapeHtml(b.reservaMargenCierreMin === undefined || b.reservaMargenCierreMin === '' ? '' : b.reservaMargenCierreMin)}" placeholder="30" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">${t('mn.ops.lastBookingMarginDesc')}</small>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.ops.leadTimeReservas')}</label>
          ${leadTimeFieldHtml('mn-leadtime-reservas', leadTimeMinFor(b,'reservas'))}
          <small style="color:var(--muted)">${t('mn.ops.leadTimeReservasDesc')}</small>
        </div>
        <div class="field">
          <label>${t('mn.ops.leadTimePedidos')}</label>
          ${leadTimeFieldHtml('mn-leadtime-pedidos', leadTimeMinFor(b,'pedidos'))}
          <small style="color:var(--muted)">${t('mn.ops.leadTimePedidosDesc')}</small>
        </div>
      </div>
      <div class="field" style="border-top:1px solid var(--border);padding-top:12px;margin-top:6px">
        <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-require-manual-confirm" style="width:auto" ${(b.reservaConfirmManualDesde > 0)?'checked':''} onchange="toggleReservaConfirmManual(this.checked)">
          ${t('mn.ops.requireManualConfirm')}
        </label>
        <small style="color:var(--muted)">${t('mn.ops.requireManualConfirmDesc')}</small>
        ${(b.reservaConfirmManualDesde > 0) ? `
        <div class="field" style="margin-top:8px;max-width:160px">
          <label>${t('mn.ops.requireManualConfirmFrom')}</label>
          <input type="number" id="mn-require-manual-confirm-from" min="1" step="1" value="${escapeHtml(b.reservaConfirmManualDesde)}" onchange="saveBusiness(true)">
        </div>` : ''}
      </div>
      <div class="field" style="border-top:1px solid var(--border);padding-top:12px;margin-top:6px">
        <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:${pagoOnlineActivo?'pointer':'default'}">
          <input type="checkbox" id="mn-require-deposit" style="width:auto" ${(b.requireDeposit && pagoOnlineActivo)?'checked':''} ${pagoOnlineActivo?'':'disabled'} onchange="saveBusiness(true);renderMiNegocio()">
          ${t('mn.ops.requireDeposit')}
        </label>
        <small id="mn-require-deposit-hint" style="display:block;color:${pagoOnlineActivo?'var(--muted)':'var(--ink)'}">${pagoOnlineActivo ? t('mn.ops.requireDepositDesc') : t('mn.ops.requireDepositNeedsPago')}</small>
        ${!pagoOnlineActivo ? `<button class="btn btn-sm" style="margin-top:6px" onclick="scrollToMnCard('mn-card-pago-online')" type="button"><i class="ti ti-credit-card"></i> ${t('mn.ops.goToPago')}</button>` : ''}
      </div>
      ${(b.requireDeposit && pagoOnlineActivo) ? `
      <div class="field-row">
        <div class="field">
          <label>${t('mn.ops.depositAmount')}</label>
          <input type="number" id="mn-deposit-amount" min="0" step="0.5" value="${escapeHtml(b.depositAmount||'')}" placeholder="10" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>${t('mn.ops.depositType')}</label>
          <select id="mn-deposit-type" onchange="saveBusiness(true)">
            <option value="fixed" ${b.depositType!=='perPerson'?'selected':''}>${t('mn.ops.depositFixed')}</option>
            <option value="perPerson" ${b.depositType==='perPerson'?'selected':''}>${t('mn.ops.depositPerPerson')}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>${t('mn.ops.depositMinPeople')}</label>
        <input type="number" id="mn-deposit-minpeople" min="0" step="1" value="${escapeHtml(b.depositMinPeople||0)}" placeholder="0" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">${t('mn.ops.depositMinPeopleDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.ops.depositInstructions')}</label>
        <textarea id="mn-deposit-instructions" rows="2" placeholder="${t('mn.ops.depositInstructionsPh')}" onchange="saveBusiness(true)">${escapeHtml(b.depositInstructions||'')}</textarea>
        <small style="color:var(--muted)">${t('mn.ops.depositInstructionsDesc')}</small>
      </div>` : ''}
      <h4 style="margin:16px 0 4px"><i class="ti ti-layout-grid"></i> ${t('mn.ops.floorPlan')}</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('mn.ops.floorPlanDesc')}</p>
      <div class="mn-zona-nueva">
        <div class="field">
          <label for="mn-zona-nombre">${t('mn.ops.zoneName')}</label>
          <input type="text" id="mn-zona-nombre" placeholder="${t('mn.ops.zoneNamePh')}">
        </div>
        <div class="field">
          <label for="mn-zona-cantidad">${t('mn.ops.tableCount')}</label>
          <input type="number" id="mn-zona-cantidad" min="1" max="50" value="4">
        </div>
        <button class="btn btn-sm btn-primary" onclick="addZonaConMesas()"><i class="ti ti-plus"></i> ${t('mn.ops.createZone')}</button>
      </div>
      <p class="txt-xs" style="color:var(--muted);margin:0 0 10px">${escapeHtml(gl({es:'Cada mesa nace con ' + MESA_PLAZAS_DEFECTO + ' plazas; ajusta las de cada una en la lista de abajo (la web de reservas las usa para saber qué mesa le va a cada grupo).', ca:'Cada taula neix amb ' + MESA_PLAZAS_DEFECTO + ' places; ajusta les de cadascuna a la llista de sota (la web de reserves les fa servir per saber quina taula va a cada grup).', en:'Each table starts with ' + MESA_PLAZAS_DEFECTO + ' seats; adjust each one in the list below (the booking site uses them to know which table fits each party).'}))}</p>
      <div class="mn-mesas-cab"><i class="ti ti-list-details"></i> ${t('mn.ops.configuredTables')} <span>${t('mn.ops.configuredTablesDesc')}</span></div>
      <div id="mn-mesas-list"></div>
      <div id="mn-aforo-warning"></div>
    </div>

    ${renderTicketConfigCard()}

    ${renderTableQrCard()}

    ${renderComandaPrintCard()}

    ${renderIaConfigCard()}

    ${renderOnlineCard()}

    ${renderPedidosConfigCard()}

    ${renderDeliveryPlatformsCard()}

    ${renderPagoOnlineCard()}

    ${renderVerifactuConfigCard()}

    ${renderDataMaintenanceCard()}
    </div>
  `;
  renderMiNegocioIndice();
  loadPagoOnlineStatus();
  renderMesasConfigList();
  ggPintarColoresDelLogo();
}

// Lista editable de mesas en Mi Negocio: nombre/número editable, zona y borrar.
// Las zonas ya no son 3 fijas (interior/terraza/barra): son las que el negocio
// ha ido creando en "Crea el plano de tu sala" (getZonaOrder), en ese orden.
function renderMesasConfigList(){
  const box = document.getElementById('mn-mesas-list');
  if(!box) return;
  if(!DB.tables.length){
    box.innerHTML = `<p style="font-size:13px;color:var(--muted)">${t('mn.ops.noTablesYet')}</p>`;
    return;
  }
  const zonas = [...getZonaOrder(), null];
  let html = '';
  zonas.forEach(z => {
    const tables = DB.tables.filter(t => (t.zona||null) === z);
    if(!tables.length) return;
    html += `<div style="display:flex;align-items:center;gap:6px;margin:12px 0 4px">
      ${z ? `<input type="text" value="${escapeHtml(zonaLabel(z))}" onchange="renameZona('${escapeJsAttr(z)}', this.value)" title="${t('mn.ops.renameZone')}" style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;border:1px solid transparent;background:transparent;padding:2px 4px;border-radius:4px;flex:1;min-width:0" onfocus="this.style.borderColor='var(--border)'" onblur="this.style.borderColor='transparent'">`
        : `<span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;flex:1">${t('mn.ops.noZone')}</span>`}
      ${z ? `<button class="btn btn-sm btn-icon" style="flex-shrink:0" onclick="addTableToZona('${escapeJsAttr(z)}')" title="${t('mn.ops.addTableToZone')}"><i class="ti ti-plus"></i></button>` : ''}
      ${z ? `<button class="btn btn-sm btn-icon btn-danger" style="flex-shrink:0" onclick="deleteZonaCompleta('${escapeJsAttr(z)}')" title="${t('mn.ops.deleteWholeZone')}"><i class="ti ti-trash"></i></button>` : ''}
    </div>`;
    html += '<div class="mn-mesas-grid">' + tables.map(t2 => {
      return `
      <div class="mn-mesa">
        <input type="text" class="mn-mesa-nombre" value="${escapeHtml(t2.name||'')}" onchange="updateTableName(${t2.id}, this.value)" placeholder="${t('mn.ops.tableNamePh')}" aria-label="${t('mn.ops.tableNamePh')}">
        <label class="mn-mesa-plazas${t2.plazas?'':' falta'}"><span>${escapeHtml(gl({es:'Plazas', ca:'Places', en:'Seats'}))}</span><input type="number" min="1" max="50" required value="${t2.plazas||''}" onchange="updateTablePlazas(${t2.id}, this.value)" placeholder="${t('mn.ops.seats')}" title="${t('mn.ops.seatsOptional')}" aria-invalid="${!t2.plazas}"></label>
        <button class="btn btn-sm btn-icon btn-danger" onclick="deleteTableFromConfig(${t2.id})" title="${t('mn.ops.deleteTable')}" aria-label="${t('mn.ops.deleteTable')}"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join('') + '</div>';
  });
  const sinPlazas = DB.tables.filter(tb => !tb.plazas).length;
  if(sinPlazas) html = `<div class="card" style="border-color:var(--red);background:var(--red-l);padding:10px 12px;margin:8px 0;font-size:13px"><strong>${t('mn.ops.tablesWithoutSeats').replace('${n}', sinPlazas)}</strong></div>` + html;
  box.innerHTML = html;
  checkAforoWarning();
}

// Compara la suma de plazas de las mesas configuradas con el aforo indicado
// en "Operativa" y muestra un aviso suave (no bloqueante) si no cuadran, para
// detectar aforos desactualizados o mesas sin plazas indicadas.
function checkAforoWarning(){
  const box = document.getElementById('mn-aforo-warning');
  if(!box) return;
  const aforo = parseInt(DB.business?.aforo);
  const seats = DB.tables.reduce((sum,t2) => sum + (t2.plazas||0), 0);
  let msg = '';
  if(aforo > 0 && DB.tables.length){
    if(seats === 0){
      msg = t('mn.aforo.warningNoSeats').replace('${aforo}', aforo);
    }else if(seats > aforo * 1.15){
      msg = t('mn.aforo.warningExceeded').replace('${seats}', seats).replace('${aforo}', aforo);
    }else if(seats < aforo * 0.5){
      msg = t('mn.aforo.warningLow').replace('${seats}', seats).replace('${aforo}', aforo);
    }
  }
  box.innerHTML = msg ? `<p style="font-size:12px;color:var(--ink);margin-top:8px"><i class="ti ti-alert-triangle"></i> ${msg}</p>` : '';
}

// Renombra una zona/rango entera de una vez: se aplica a todas sus mesas y
// se actualiza el orden de zonas guardado.
function renameZona(oldName, newNameRaw){
  const newName = (newNameRaw||'').trim();
  if(!newName || newName === zonaLabel(oldName)){ renderMesasConfigList(); return; }
  if(!Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = getZonaOrder();
  DB.tables.forEach(tb => { if(tb.zona === oldName) tb.zona = newName; });
  const idx = DB.business.zonaOrder.indexOf(oldName);
  if(idx !== -1) DB.business.zonaOrder[idx] = newName;
  else if(!DB.business.zonaOrder.includes(newName)) DB.business.zonaOrder.push(newName);
  saveDB();
  renderMesasConfigList();
  showToast(t('msg.zoneRenamed').replace('${name}', newName));
}

// Elimina una zona entera junto con todas sus mesas. Si alguna tiene una
// comanda abierta, se bloquea (igual que al borrar una mesa suelta).
async function deleteZonaCompleta(zona){
  const tables = DB.tables.filter(tb => tb.zona === zona);
  if(tables.some(tb => getOpenOrderForTable(tb.id))){
    showToast(t('msg.cannotDeleteZoneOpenOrders'));
    return;
  }
  if(!(await confirmModal(t('msg.confirmDeleteZone').replace('${name}', zonaLabel(zona)).replace('${count}', tables.length)))) return;
  // ⚠️ Se vuelve a consultar la zona AQUÍ, justo antes de borrar, en vez de
  // usar la lista capturada antes del confirmModal: durante esa espera pudo
  // llegar por sincronización una mesa nueva en esta misma zona (o una
  // comanda abierta en una mesa que ya existía). Sin esto, esa mesa nueva se
  // borraba igual (nunca se mostró ni se confirmó) y clearDanglingTableRefs
  // no la incluía, dejando una reserva apuntando a una mesa ya eliminada.
  // Hallazgo de una auditoría externa.
  const tablesNow = DB.tables.filter(tb => tb.zona === zona);
  if(tablesNow.some(tb => getOpenOrderForTable(tb.id))){
    showToast(t('msg.cannotDeleteZoneOpenOrders'));
    return;
  }
  clearDanglingTableRefs(tablesNow.map(tb => tb.id));
  DB.tables = DB.tables.filter(tb => tb.zona !== zona);
  if(Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = DB.business.zonaOrder.filter(z => z !== zona);
  saveDB();
  renderMesasConfigList();
  showToast(t('msg.zoneDeleted'));
}

// Al borrar una o varias mesas, quita cualquier referencia a ellas que quede
// suelta (p.ej. una reserva con tableId apuntando a una mesa que ya no existe),
// para que luego no se intente usar un id de mesa inexistente.
function clearDanglingTableRefs(tableIds){
  const idSet = new Set(tableIds);
  DB.reservations.forEach(r => { if(r.tableId && idSet.has(r.tableId)) r.tableId = null; });
}

// Crea de golpe N mesas nuevas en una zona/rango con el nombre que indique el
// negocio (por ejemplo "Rango 1" con 4 mesas), tal como se pidió: que el plano
// de sala se organice como cada restaurante quiera, no en 3 zonas fijas.
const MESA_PLAZAS_DEFECTO = 4;
async function addZonaConMesas(){
  const nombre = (document.getElementById('mn-zona-nombre').value||'').trim();
  const cantidad = Math.max(1, Math.min(50, parseInt(document.getElementById('mn-zona-cantidad').value)||0));
  if(!nombre){ showToast(t('msg.enterZoneName')); return; }
  // Las plazas son OBLIGATORIAS en cada mesa (1/10): sin ellas la web de reservas no puede saber qué mesa le va a
  // un grupo. Pero al crear la zona ya NO se piden (2/11, el dueño: «nombre de la zona y número de mesas, y las
  // personas se ponen después en cada mesa»): la mesa nace con un valor corriente y se ajusta en su casilla.
  const plazasZona = MESA_PLAZAS_DEFECTO;
  if(!Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = getZonaOrder();
  if(!DB.business.zonaOrder.includes(nombre)) DB.business.zonaOrder.push(nombre);
  const existingInZone = DB.tables.filter(t => t.zona === nombre).length;
  // Si la zona ya tiene mesas, confirma antes de añadir más: evita duplicar
  // el rango entero por pulsar el botón dos veces sin darse cuenta.
  if(existingInZone > 0 && !(await confirmModal(t('msg.confirmAddMoreTablesToZone').replace('${zone}', nombre).replace('${count}', existingInZone)))) return;
  for(let i = 1; i <= cantidad; i++){
    DB.tables.push({id: genId(), name: `Mesa ${existingInZone+i}`, zona: nombre, plazas: plazasZona});
  }
  saveDB();
  document.getElementById('mn-zona-nombre').value = '';
  document.getElementById('mn-zona-cantidad').value = '4';
  renderMesasConfigList();
  showToast(t('msg.zoneCreated').replace('${name}', nombre).replace('${count}', cantidad));
}

// Añade una mesa suelta más a una zona ya existente, sin tener que recrearla.
// Hereda las plazas de las mesas de esa zona si todas tienen la misma.
function addTableToZona(zona){
  const tablesInZone = DB.tables.filter(t => t.zona === zona);
  const plazasSet = new Set(tablesInZone.map(t => t.plazas||null));
  let plazas = plazasSet.size === 1 ? [...plazasSet][0] : null;
  // Si no son todas iguales, la nueva copia la última mesa con plazas: nunca
  // nace sin ellas (se cambian después en su casilla).
  if(plazas == null){ const conPlazas = tablesInZone.filter(t => t.plazas); if(conPlazas.length) plazas = conPlazas[conPlazas.length-1].plazas; }
  // Misma validación que addZonaConMesas, por si algún dato heredado quedara
  // fuera de rango (p.ej. importado de otra fuente).
  if(plazas != null) plazas = Math.max(1, Math.min(50, parseInt(plazas)||0)) || null;
  DB.tables.push({id: genId(), name: `Mesa ${tablesInZone.length+1}`, zona, plazas});
  saveDB();
  renderMesasConfigList();
  if(plazas == null) showToast(t('msg.enterSeats'));
}

function updateTableName(id, val){
  const tbl = DB.tables.find(x => x.id === id);
  if(!tbl) return;
  tbl.name = (val||'').trim() || tbl.name;
  saveDB();
}
// Nº de plazas de la mesa (obligatorio desde el 1/10): con él la web de
// reservas decide qué mesas le valen a un grupo (de N a N+2 plazas).
function updateTablePlazas(id, val){
  const tbl = DB.tables.find(x => x.id === id);
  if(!tbl) return;
  const n = parseInt(val);
  // Obligatorias: borrarlas dejaría la mesa fuera de las reservas online.
  if(!(n >= 1 && n <= 50)){ showToast(t('msg.enterSeats')); renderMesasConfigList(); return; }
  tbl.plazas = n;
  saveDB();
  renderMesasConfigList();
}
async function deleteTableFromConfig(id){
  const order = getOpenOrderForTable(id);
  // Si la comanda tiene platos sin cobrar, no se puede borrar la mesa desde
  // aquí: antes se marcaba como "pagada" sin generar venta, sin descontar
  // stock y sin dejar ningún registro, perdiendo esa comanda sin rastro.
  // Hay que cobrarla o vaciarla desde el TPV primero.
  if(order && order.items && order.items.length){
    showToast(t('msg.tableHasOpenOrderItems'));
    return;
  }
  if(!(await confirmModal(t('msg.confirmDeleteTable')))) return;
  if(order){
    // ⚠️ Se vuelve a consultar la comanda AQUÍ, justo antes de borrar, en vez
    // de fiarse de la referencia capturada antes del confirmModal: mientras
    // se esperaba la confirmación, otro dispositivo pudo añadirle platos a
    // esa misma mesa (dos camareros a la vez). Sin esto, se borraba por el
    // id la versión YA ACTUAL de la comanda (con esos platos nuevos),
    // perdiéndolos sin aviso. Hallazgo de una auditoría externa.
    const ordenActual = DB.tpvOrders.find(o => o.id === order.id);
    if(ordenActual && ordenActual.items && ordenActual.items.length){
      showToast(t('msg.tableHasOpenOrderItems'));
      return;
    }
    // Comanda vacía (mesa abierta por error, sin platos): se puede liberar sin más.
    // Se borra DESPUÉS de confirmar — si se cancelaba antes de este cambio, la
    // comanda vacía ya se había borrado igualmente, dejando la mesa "libre"
    // sin que el usuario lo hubiera pedido.
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== order.id);
  }
  clearDanglingTableRefs([id]);
  DB.tables = DB.tables.filter(t => t.id !== id);
  saveDB();
  renderMesasConfigList();
}

/* ============================================================
   MANTENIMIENTO DE DATOS — copia de seguridad y archivado
   ============================================================ */
/* Pesar el negocio es convertirlo ENTERO a texto: 100-400 ms en un móvil con un historial grande, cada vez
   que se abre o se repinta Mi Negocio. Es un dato orientativo («tu negocio ocupa X MB»), así que vale el de
   hace medio minuto. */
let dbSizeCache = {ts: 0, db: null, kb: 0};
function getDBSizeKB(){
  const c = dbSizeCache;
  if(c.db === DB && Date.now() - c.ts < 30000) return c.kb;
  const kb = Math.round(JSON.stringify(DB).length / 1024 * 10) / 10;
  dbSizeCache = {ts: Date.now(), db: DB, kb};
  return kb;
}

function renderDataMaintenanceCard(){
  /* El peso se calcula DESPUÉS de pintar (convertir el negocio entero a texto tarda 100-400 ms en un móvil y
     bloqueaba la apertura de Mi Negocio). Mientras llega, el hueco enseña «…». */
  const sizeKB = dbSizeCache.db === DB && Date.now() - dbSizeCache.ts < 30000 ? dbSizeCache.kb : null;
  if(sizeKB === null) setTimeout(() => {
    const kb = getDBSizeKB();
    document.querySelectorAll('.mn-data-size').forEach(el => { el.textContent = kb + ' KB'; });
  }, 60);
  const ventasAntiguas = DB.sales.filter(s => s.date && s.date < dataMaintenanceCutoff()).length;
  const reservasAntiguas = DB.reservations.filter(r => r.date && r.date < dataMaintenanceCutoff() && (r.status==='completada'||r.status==='cancelada')).length;
  const cierresAntiguos = DB.cashClosures.filter(c => c.fecha && c.fecha < dataMaintenanceCutoff()).length;
  const pedidosAntiguos = DB.purchaseOrders.filter(o => o.date && o.date < dataMaintenanceCutoff() && o.estado === 'RECIBIDO').length;
  return `
    <div class="card">
      <h3><i class="ti ti-database"></i> ${t('mn.data.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.data.sizeDesc').replace('${size}', '<span class="mn-data-size">' + (sizeKB === null ? '…' : sizeKB + ' KB') + '</span>')}</p>
      <button class="btn btn-sm" onclick="downloadFullBackup()"><i class="ti ti-download"></i> ${t('mn.data.downloadBackup')}</button>
      <div style="font-size:12px;color:${daysSinceLastBackup()>=BACKUP_REMINDER_DAYS?'var(--red)':'var(--muted)'};margin-top:6px">
        ${daysSinceLastBackup()===Infinity ? t('mn.data.neverBackedUp') : t('mn.data.lastBackup').replace('${n}', daysSinceLastBackup())}
      </div>
      <input type="file" id="restore-backup-input" accept="application/json" style="display:none" onchange="handleRestoreBackupFile(this.files[0])">
      <button class="btn btn-sm" onclick="document.getElementById('restore-backup-input').click()"><i class="ti ti-upload"></i> ${t('mn.data.restoreBackup')}</button>
      <button class="btn btn-sm" onclick="openTrashModal()"><i class="ti ti-trash"></i> ${t('trash.title')}${(DB.trash||[]).length ? ` (${DB.trash.length})` : ''}</button>
      <button class="btn btn-sm" onclick="openAuditLogModal()"><i class="ti ti-list-details"></i> ${t('audit.title')}</button>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="ti ti-bell"></i> ${t('notif.title')}</p>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('notif.desc')}</p>
      ${desktopNotificationsEnabled()
        ? `<span class="badge badge-green" style="margin-bottom:8px;display:inline-block"><i class="ti ti-bell-check"></i> ${t('notif.enabledBadge')}</span><br><button class="btn btn-sm" onclick="disableDesktopNotifications()">${t('notif.disable')}</button>`
        : `<button class="btn btn-sm btn-primary" onclick="requestDesktopNotifications()"><i class="ti ti-bell"></i> ${t('notif.enableBtn')}</button>`}
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="ti ti-archive"></i> ${t('mn.data.archiveTitle')}</p>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('mn.data.archiveDesc')}</p>
      <div class="field">
        <label>${t('mn.data.archiveBefore')}</label>
        <input type="date" id="mn-archive-before" value="${dataMaintenanceCutoff()}">
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('mn.data.archivePreview').replace('${sales}', ventasAntiguas).replace('${reservations}', reservasAntiguas).replace('${closures}', cierresAntiguos).replace('${orders}', pedidosAntiguos)}</p>
      <button class="btn btn-sm btn-danger" onclick="archiveOldData()"><i class="ti ti-archive"></i> ${t('mn.data.archiveAndDownload')}</button>
    </div>
  `;
}

// Por defecto, sugiere archivar todo lo anterior a hace 1 año
function dataMaintenanceCutoff(){
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  // Nunca con toISOString (desfase de un día en cualquier huso por delante
  // de UTC, como España, sobre todo a primera hora de la mañana) — ver
  // dateStr() en js/hr.js.
  return dateStr(d);
}

/* ============================================================
   AVISO DE ARCHIVADO
   Si hay bastantes ventas/reservas/cierres de más de un año de
   antigüedad, muestra un botón rojo fijo en la cabecera para que no
   pase desapercibido (sin esto, los datos seguirían creciendo hasta
   poder colapsar el TPV de negocios muy activos). El botón desaparece
   solo cuando se archivan esos datos (Mi Negocio > Mantenimiento de
   datos). Solo afecta a histórico del TPV; recetas, cartas, empleados,
   etc. nunca se tocan.
   ============================================================ */
// ⚠️ (17/09) Antes esto encendía un botón "Archivar" fijo en la cabecera,
// macizo y en rojizo, permanentemente al lado de "Actualizar" mientras
// hubiera 50+ registros antiguos — se veía apelotonado y no se podía
// descartar. Ahora sigue el MISMO patrón que checkBackupReminder: avisa una
// vez al día como mucho, solo al propietario, con un modal que deja elegir
// "Ahora no" o ir a archivar — no una pieza fija en la barra superior.
const ARCHIVE_REMINDER_DAY_KEY = 'gastrogoan_archive_reminder_day';
function oldDataCount(){
  const cutoff = dataMaintenanceCutoff();
  return DB.sales.filter(s => s.date && s.date < cutoff).length
    + DB.reservations.filter(r => r.date && r.date < cutoff && (r.status==='completada'||r.status==='cancelada')).length
    + DB.cashClosures.filter(c => c.fecha && c.fecha < cutoff).length;
}
function checkArchiveReminder(){
  if(oldDataCount() < 50) return;
  // Igual que el recordatorio de copia de seguridad: solo al propietario,
  // que es quien puede archivar; a un empleado no le sirve de nada.
  const session = getAccessSession();
  if(!session || session.type !== 'owner') return;
  const hoy = todayStr();
  try{ if(localStorage.getItem(ARCHIVE_REMINDER_DAY_KEY) === hoy) return; }catch(e){}
  try{ localStorage.setItem(ARCHIVE_REMINDER_DAY_KEY, hoy); }catch(e){}
  openArchiveReminderModal();
}

function goToArchiveFromReminder(){
  navigate('minegocio');
  setTimeout(() => {
    const el = document.getElementById('mn-archive-before');
    if(el){ mnAbrirDe(el); el.scrollIntoView({behavior:'smooth', block:'center'}); }
  }, 200);
}

// Genera y descarga un CSV en formato español (separador ";", decimales con
// coma) a partir de una matriz de filas, para que un gestor pueda abrirlo
// directamente en Excel/Google Sheets.
function downloadCSV(rows, filename){
  const csvCell = v => {
    if(typeof v === 'number') return (Math.round(v*100)/100).toFixed(2).replace('.', ',');
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const csv = rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  guardarArchivo(new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'}), filename);
}

function downloadJSON(obj, filename){
  // ⚠️ Sin este `return`, la promesa de guardarArchivo() se tiraba: quien
  // hiciera `await downloadJSON(...)` (el archivado, que BORRA después)
  // recibía `undefined` al instante, nunca el rechazo de una hoja de
  // compartir cancelada en iPad — el `catch` que protege el borrado no
  // llegaba a dispararse nunca. Hallazgo de una auditoría externa.
  return guardarArchivo(new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'}), filename);
}

/* Guardar un archivo, también en iPhone y iPad.
   El `<a download>` de toda la vida funciona en Chrome y en Android, pero en
   Safari de iOS el atributo `download` sobre un blob se ignora: en vez de
   guardarlo, ABRE el archivo en la misma pestaña. Y eso no es "no descarga":
   es que al hostelero se le va la app de delante, con lo que estuviera
   haciendo. Justo en la copia de seguridad, que es lo último que puede
   fallar.
   En iOS se usa la hoja de compartir del sistema (Web Share con archivos),
   que es de donde se guarda en Archivos, se manda por correo o va a Drive —
   el gesto que un usuario de iPad ya conoce. Si tampoco estuviera, se abre en
   una pestaña NUEVA para no perder la app, y se le dice qué hacer. */
/* Devuelve una PROMESA que solo resuelve si el archivo se guardó de verdad.
   Antes no devolvía nada y no lanzaba nunca: en Apple, cancelar la hoja de
   compartir se tragaba con un `.catch(()=>{})`. Quien archivaba datos (que
   BORRA el histórico después) tenía un try/catch que era código muerto: en un
   iPad, cancelar dejaba al hostelero sin archivo Y sin ventas. */
function guardarArchivo(blob, filename){
  const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS se hace pasar por Mac
  if(esApple && typeof File === 'function' && navigator.canShare){
    try{
      const archivo = new File([blob], filename, {type: blob.type});
      if(navigator.canShare({files: [archivo]})){
        // Cancelar NO es un error para una descarga normal, pero sí tiene que
        // notarse para quien vaya a borrar algo después.
        return navigator.share({files: [archivo], title: filename});
      }
    }catch(e){ /* sigue por el camino de abajo */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  if(esApple){ a.target = '_blank'; a.rel = 'noopener'; }
  document.body.appendChild(a);
  a.click();
  a.remove();
  if(esApple && typeof showToast === 'function') showToast(t('msg.iosSaveHint'), 6000);
  // En iOS la pestaña nueva todavía está leyendo el blob cuando esto corre:
  // revocarlo al instante deja la descarga a medias.
  setTimeout(() => URL.revokeObjectURL(url), esApple ? 20000 : 0);
  /* Por este camino el navegador no dice si el archivo llegó a guardarse. Se
     resuelve, pero quien vaya a BORRAR algo después no debe fiarse de esto:
     tiene que preguntar (ver archiveOldData). */
  return Promise.resolve();
}

async function downloadFullBackup(){
  // Antes se marcaba lastBackupAt aunque se cancelara la hoja de compartir
  // (en iPad) o fallara el guardado: el aviso de "hace tiempo que no hay
  // copia" se callaba creyendo que sí la había. Hallazgo de una auditoría
  // externa, mismo origen que el de downloadJSON.
  try{
    await downloadJSON(DB, `gastrogoan-backup-${todayStr()}.json`);
  }catch(e){
    showToast(t('msg.backupFailedNoDelete'), 6000);
    return;
  }
  if(!DB.business) DB.business = {};
  DB.business.lastBackupAt = new Date().toISOString();
  saveDB();
  checkBackupReminder();
  showToast(t('msg.backupDownloaded'));
}

// Antes se podía DESCARGAR una copia pero no había ninguna forma de volver
// a cargarla: una copia de seguridad que no se puede restaurar no protege
// de nada de verdad. Se valida la forma mínima del archivo antes de
// aceptarlo (para no aceptar cualquier JSON al azar como si fuera un
// backup válido) y se pide confirmación escribiendo el nombre del negocio
// actual, porque esto SUSTITUYE TODOS los datos de este dispositivo — no
// hay deshacer una vez confirmado.
function handleRestoreBackupFile(file){
  if(!file) return;
  const input = document.getElementById('restore-backup-input');
  const reader = new FileReader();
  reader.onload = () => {
    if(input) input.value = '';
    let parsed;
    try{ parsed = JSON.parse(reader.result); }catch(e){
      showToast(t('msg.restoreInvalidFile'));
      return;
    }
    // Comprobación mínima de forma: no valida CADA campo (sería frágil ante
    // cambios futuros del esquema), pero sí que tenga la pinta de un backup
    // real de esta app y no un JSON cualquiera o el de otro negocio con un
    // tenantId de licencia distinto (eso se resuelve al canjear, no aquí,
    // pero al menos se avisa de que no coincide).
    const looksValid = parsed && typeof parsed === 'object'
      && Array.isArray(parsed.sales) && Array.isArray(parsed.employees)
      && Array.isArray(parsed.ingredients) && parsed.business && typeof parsed.business === 'object';
    if(!looksValid){
      showToast(t('msg.restoreInvalidFile'));
      return;
    }
    openConfirmRestoreBackupModal(parsed);
  };
  reader.onerror = () => showToast(t('msg.restoreInvalidFile'));
  reader.readAsText(file);
}
function openConfirmRestoreBackupModal(parsed){
  const currentName = (DB.business && DB.business.name) || t('bs.defaultBusinessName');
  const backupName = (parsed.business && parsed.business.name) || '—';
  const backupSales = (parsed.sales||[]).length;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${t('mn.data.restoreBackup')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="manual-warning" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i>${t('msg.restoreWarning')}</div>
    <p style="font-size:13px;margin-bottom:4px">${t('mn.data.restoreBackupOf')}: <strong>${escapeHtml(backupName)}</strong></p>
    <p style="font-size:13px;margin-bottom:14px">${t('mn.data.restoreBackupSalesCount').replace('${n}', backupSales)}</p>
    <div class="field">
      <label>${t('msg.restoreTypeToConfirm').replace('${name}', currentName)}</label>
      <input type="text" id="restore-confirm-name" autocomplete="off">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmRestoreBackup()"><i class="ti ti-database-import"></i> ${t('mn.data.restoreBackup')}</button>
    </div>
  `);
  window._pendingRestoreBackup = parsed;
  window._pendingRestoreBackupExpectedName = currentName;
}
function confirmRestoreBackup(){
  const parsed = window._pendingRestoreBackup;
  const expected = window._pendingRestoreBackupExpectedName || '';
  const typed = (document.getElementById('restore-confirm-name').value || '').trim();
  if(!parsed || typed.toLowerCase() !== expected.trim().toLowerCase()){
    showToast(t('gate.removeBusinessNameMismatch'));
    return;
  }
  // El backup restaurado trae SU mapa de lápidas (DB.borrados), de la fecha
  // en que se descargó. Sustituirlo sin más borraba de la memoria cualquier
  // cosa eliminada DESPUÉS de esa fecha: al volver a sincronizar con la
  // nube, mergeArraysById la resucitaba (sin lápida no hay quien la pare) y
  // el borrado reaparecía en toda la flota de dispositivos del negocio. Se
  // fusionan las dos listas de lápidas, quedándose con la fecha más nueva
  // de cada clave, para no perder ninguna.
  const lapidasActuales = (DB && DB.borrados) || {};
  const lapidasBackup = parsed.borrados || {};
  const lapidasFusionadas = {...lapidasBackup};
  Object.keys(lapidasActuales).forEach(clave => {
    if(!lapidasFusionadas[clave] || lapidasActuales[clave] > lapidasFusionadas[clave]) lapidasFusionadas[clave] = lapidasActuales[clave];
  });
  parsed.borrados = lapidasFusionadas;
  idbSet(DB_KEY, parsed).then(() => {
    delete window._pendingRestoreBackup;
    delete window._pendingRestoreBackupExpectedName;
    location.reload();
  }).catch(e => {
    console.error('Error restaurando backup', e);
    showToast(t('msg.restoreInvalidFile'));
  });
}

// No hay backend para backups automáticos de verdad (eso sería un proyecto
// aparte con su propio servidor) — lo que sí se puede hacer sin depender de
// nada externo es recordar activamente que hace demasiado que no se
// descarga una copia, igual que ya se hace con el aviso de archivado.
const BACKUP_REMINDER_DAYS = 30;
function daysSinceLastBackup(){
  const last = DB.business && DB.business.lastBackupAt;
  if(!last) return Infinity;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}
// Antes esto solo encendía un botón discreto en la cabecera (fácil de no
// ver nunca si no se mira arriba a la derecha). Ahora, en vez de vivir
// callado en la barra, se avisa activamente con un modal al entrar en la
// sesión, con un botón directo para descargarla ya.
// "Una vez por sesión" resultó ser pesadísimo en la práctica: cada recarga
// de la app es una sesión nueva, así que el dueño se lo comía diez veces al
// día. Ahora se recuerda el día en el que ya se avisó (en localStorage, que
// sobrevive a la recarga) y no se vuelve a pedir hasta el día siguiente.
const BACKUP_REMINDER_DAY_KEY = 'gastrogoan_backup_reminder_day';
function checkBackupReminder(){
  if(daysSinceLastBackup() < BACKUP_REMINDER_DAYS) return;
  // Solo el propietario: un empleado no puede (ni debe) descargarse la
  // base entera del negocio, así que avisarle a él no sirve de nada.
  const session = getAccessSession();
  if(!session || session.type !== 'owner') return;
  const hoy = todayStr();
  try{ if(localStorage.getItem(BACKUP_REMINDER_DAY_KEY) === hoy) return; }catch(e){}
  try{ localStorage.setItem(BACKUP_REMINDER_DAY_KEY, hoy); }catch(e){}
  openBackupReminderModal();
}
function openArchiveReminderModal(){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-archive"></i> ${t('hdr.archive')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px">${t('mn.data.archiveReminderBody').replace('${n}', oldDataCount())}</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.notNow')}</button>
      <button class="btn btn-primary" onclick="closeModal();goToArchiveFromReminder()"><i class="ti ti-archive"></i> ${t('mn.data.archiveTitle')}</button>
    </div>
  `);
}

function openBackupReminderModal(){
  const never = daysSinceLastBackup() === Infinity;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cloud-download"></i> ${t('hdr.backup')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px">${never ? t('mn.data.neverBackedUp') : t('mn.data.lastBackup').replace('${n}', daysSinceLastBackup())}</p>
    <div class="modal-footer" style="flex-wrap:wrap">
      <button class="btn" onclick="closeModal()">${t('msg.backupRemindLater')}</button>
      <button class="btn btn-primary" onclick="closeModal();downloadFullBackup()"><i class="ti ti-download"></i> ${t('mn.data.downloadBackup')}</button>
    </div>
  `);
}

async function archiveOldData(){
  const before = document.getElementById('mn-archive-before').value;
  if(!before){ showToast(t('msg.chooseDate')); return; }
  const sales = DB.sales.filter(s => s.date && s.date < before);
  const reservations = DB.reservations.filter(r => r.date && r.date < before && (r.status==='completada'||r.status==='cancelada'));
  const cashClosures = DB.cashClosures.filter(c => c.fecha && c.fecha < before);
  /* Los pedidos a proveedor se quedaron fuera de esta herramienta desde
     siempre, y son justo lo que más se acumula: tres pedidos al día son mil
     al año, y el bloque entero viaja en cada subida a la nube. Solo los
     RECIBIDOS: un borrador o un pedido enviado y no recibido sigue siendo
     trabajo pendiente, por viejo que sea. */
  const purchaseOrders = DB.purchaseOrders.filter(o => o.date && o.date < before && o.estado === 'RECIBIDO');
  const total = sales.length + reservations.length + cashClosures.length + purchaseOrders.length;
  if(total === 0){ showToast(t('msg.noDataToArchive')); return; }
  if(!(await confirmModal(t('msg.confirmArchiveDataStrong').replace('${sales}', sales.length).replace('${reservations}', reservations.length).replace('${closures}', cashClosures.length).replace('${orders}', purchaseOrders.length).replace('${date}', before)))) return;
  /* ⚠️ Aquí se BORRA el histórico, así que la copia tiene que estar guardada
     de verdad. Dos redes: se espera a que el guardado resuelva (en Apple,
     cancelar la hoja de compartir ahora sí se nota), y además se PREGUNTA,
     porque por el camino de la descarga normal el navegador no informa de
     nada y no hay forma de saberlo. Antes se borraba sin comprobar ninguna de
     las dos cosas. */
  // Los IDs de lo exportado se capturan AQUÍ, antes de las dos esperas
  // (confirmModal, downloadJSON) que vienen a continuación — durante esas
  // esperas puede llegar por sincronización una venta/reserva/cierre más
  // antiguo que "before" que otro dispositivo aún no había subido. Si al
  // borrar se volviera a aplicar el mismo filtro de fecha sobre DB en vez de
  // borrar por estos IDs concretos, ese registro recién llegado (que nunca
  // salió en el archivo descargado) se borraría igual. Hallazgo de una
  // auditoría externa.
  const salesIds = new Set(sales.map(s => s.id));
  const reservationIds = new Set(reservations.map(r => r.id));
  const cashClosureIds = new Set(cashClosures.map(c => c.id));
  const purchaseOrderIds = new Set(purchaseOrders.map(o => o.id));
  try{
    await downloadJSON({ before, sales, reservations, cashClosures, purchaseOrders }, `gastrogoan-archivo-hasta-${before}.json`);
  }catch(e){
    showToast(t('msg.backupFailedNoDelete'), 6000);
    return;
  }
  if(!(await confirmModal(t('msg.confirmArchiveFileSaved')))){
    showToast(t('msg.backupFailedNoDelete'), 6000);
    return;
  }
  DB.sales = DB.sales.filter(s => !salesIds.has(s.id));
  DB.reservations = DB.reservations.filter(r => !reservationIds.has(r.id));
  DB.cashClosures = DB.cashClosures.filter(c => !cashClosureIds.has(c.id));
  DB.purchaseOrders = DB.purchaseOrders.filter(o => !purchaseOrderIds.has(o.id));
  saveDB();
  checkArchiveReminder();
  checkBackupReminder();
  renderMiNegocio();
  showToast(t('msg.dataArchived'));
}

function restablecerColoresMarca(){
  delete DB.business.brandColor; delete DB.business.brandColor2;
  saveDB(); renderMiNegocio();
}
function handleLogoUpload(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){ showToast(t('msg.imageTooLarge')); return; }
  const reader = new FileReader();
  reader.onload = e => {
    DB.business.logo = e.target.result;
    saveDB();
    renderMiNegocio();
    renderHeader();
    showToast(t('msg.logoUpdated'));
  };
  reader.readAsDataURL(file);
}

async function removeLogo(){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  DB.business.logo = '';
  saveDB();
  renderMiNegocio();
  renderHeader();
}

function renderHeader(){
  if(typeof avisosProgramar === 'function') avisosProgramar();
  const b = DB.business || {};
  const icon = document.getElementById('app-logo-icon');
  icon.innerHTML = `<img src="${b.logo || GASTROGOAN_LOGO_URI}" alt="Logo">`;
  const text = document.getElementById('app-logo-text');
  text.classList.toggle('es-negocio', !!b.name);
  if(b.name){
    text.textContent = b.name;
  }else{
    text.innerHTML = `gastro<b>goan</b><span class="gg-punto">.</span>`;
  }
  syncLangButton();
  checkArchiveReminder();
  checkBackupReminder();
  updateLogoutBtn();
}

// "Cerrar sesión" aparece con cualquier sesión activa (empleado o
// propietario), para poder dejar el dispositivo listo para que entre otra
// persona sin cerrar la app entera. "Negocios" solo tiene sentido para el
// propietario — un empleado no puede usarlo de todas formas (pide el PIN
// de propietario), así que ya ni se le muestra.
function updateLogoutBtn(){
  const logoutBtn = document.getElementById('logout-btn');
  const bizBtn = document.getElementById('business-switch-btn');
  const session = getAccessSession();
  if(logoutBtn) logoutBtn.style.display = session ? '' : 'none';
  if(bizBtn) bizBtn.style.display = (session && session.type === 'employee') ? 'none' : '';
}
async function logoutAccessSession(){
  if(ggEditorSucio()){ return ggGuardarSiHaceFalta(() => logoutAccessSession()); }
  if(!(await confirmModal(t('msg.confirmLogout')))) return;
  clearAccessSession();
  areaUnlocked = {cocina:false, sala:false};
  ownerUnlocked = false;
  document.body.classList.remove('owner-session');
  lockEditMode();
  const lockBtn = document.getElementById('lock-btn');
  if(lockBtn) lockBtn.style.display = 'none';
  updateLogoutBtn();
  goHome();
  showAccessSelectScreen();
}

// Marca/desmarca la exigencia de confirmar a mano las reservas grandes.
// El valor de verdad es reservaConfirmManualDesde (0/undefined = desactivado,
// un número = a partir de cuántos comensales exige confirmación manual) —
// la casilla es solo la forma de activarlo con un valor por defecto razonable.
function toggleReservaConfirmManual(checked){
  DB.business.reservaConfirmManualDesde = checked ? (DB.business.reservaConfirmManualDesde > 0 ? DB.business.reservaConfirmManualDesde : 8) : 0;
  saveBusiness(true);
  renderMiNegocio();
}

// Activa/desactiva un tipo de servicio (mesa/takeaway/delivery) y lo guarda al
// instante. Debe quedar siempre al menos un servicio activo.
function toggleTipoServicio(tipo, checked){
  const actual = (DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true};
  const nuevo = {
    mesa: actual.mesa !== false,
    takeaway: actual.takeaway !== false,
    delivery: actual.delivery !== false,
    [tipo]: checked
  };
  if(!nuevo.mesa && !nuevo.takeaway && !nuevo.delivery){
    showToast(t('msg.keepOneService'));
    const el = document.getElementById('mn-serv-'+tipo);
    if(el) el.checked = true;
    return;
  }
  DB.business = {...DB.business, tiposServicio: nuevo};
  saveDB();
  const warn = businessTypeServiceMismatchWarning(DB.business.tipo, nuevo);
  showToast(warn || (checked ? t('msg.serviceEnabled') : t('msg.serviceDisabled')));
}

// Tipos de negocio que normalmente trabajan solo para llevar/delivery (sin
// servicio de mesa). Es solo una guía orientativa para el aviso, no bloquea
// nada: cualquier negocio puede combinar los servicios que quiera.
const TAKEAWAY_ONLY_BUSINESS_TYPES = ['Food truck', 'Catering'];
function businessTypeServiceMismatchWarning(tipo, tiposServicio){
  if(!tipo || !tiposServicio) return null;
  const esSoloLlevar = TAKEAWAY_ONLY_BUSINESS_TYPES.includes(tipo);
  if(esSoloLlevar && !tiposServicio.takeaway && !tiposServicio.delivery){
    return t('mn.serviceTypes.warnTakeawayOnlyNoToggle');
  }
  if(!esSoloLlevar && tipo !== 'Otro' && !tiposServicio.mesa && (tiposServicio.takeaway || tiposServicio.delivery)){
    return t('mn.serviceTypes.warnTableOnlyButTakeaway');
  }
  return null;
}

let _lastLinkedBusinessName = null;
async function saveBusiness(silent){
  const el = id => document.getElementById(id);
  if(!DB.business) DB.business = {};
  if(el('business-name')) DB.business.name = el('business-name').value.trim();
  if(el('business-address')) DB.business.address = el('business-address').value.trim();
  if(el('business-phone')) DB.business.phone = el('business-phone').value.trim();
  if(el('business-email')) DB.business.email = el('business-email').value.trim();
  if(el('business-description')) DB.business.description = el('business-description').value.trim();
  if(el('mn-tipo')) DB.business.tipo = el('mn-tipo').value;
  if(el('mn-forma-juridica')) DB.business.formaJuridica = el('mn-forma-juridica').value;
  if(el('mn-regimen-fiscal')) DB.business.regimenFiscal = el('mn-regimen-fiscal').value;
  if(el('mn-modalidad-directa')) DB.business.modalidadDirecta = el('mn-modalidad-directa').value;
  if(el('mn-territorio')) DB.business.territorio = el('mn-territorio').value;
  if(el('mn-inicio-actividad')) DB.business.inicioActividad20 = el('mn-inicio-actividad').checked;
  const num = id => { const v = el(id) && el(id).value.trim(); return v === '' || v == null ? null : Math.max(0, parseFloat(v)); };
  if(el('mn-otras-rentas')) DB.business.otrasRentasTitular = num('mn-otras-rentas');
  if(el('mn-hijos')) DB.business.hijosTitular = num('mn-hijos');
  if(el('mn-incn-anterior')) DB.business.incnAnterior = num('mn-incn-anterior');
  if(el('mn-coop-tipo')) DB.business.coopTipo = el('mn-coop-tipo').value;
  if(el('mn-coop-fro')) DB.business.coopFro = num('mn-coop-fro');
  if(el('mn-coop-fep')) DB.business.coopFep = num('mn-coop-fep');
  if(el('mn-anyo')) DB.business.anyo = el('mn-anyo').value.trim();
  if(el('mn-web')) DB.business.web = el('mn-web').value.trim();
  if(el('mn-cif')) DB.business.cif = el('mn-cif').value.trim();
  // Aviso legal y privacidad de la web de reservas (LSSI art. 10, RGPD art.
  // 13): el titular y su NIF tienen que salir. Se publica SOLO lo que el
  // dueño pone aquí a propósito; el CIF sigue sin ir al espejo por su cuenta.
  if(el('mn-legal-titular')){
    const nifOn = el('mn-legal-nif') && el('mn-legal-nif').checked;
    DB.business.legalPublico = {titular: el('mn-legal-titular').value.trim(), nif: nifOn ? (DB.business.cif||'') : ''};
  }
  if(el('mn-prop')) DB.business.prop = el('mn-prop').value.trim();
  if(el('mn-brand-color')) DB.business.brandColor = el('mn-brand-color').value;
  if(el('mn-brand-color2')) DB.business.brandColor2 = el('mn-brand-color2').value;
  if(el('mn-aforo')) DB.business.aforo = Math.max(0, parseInt(el('mn-aforo').value) || 0) || '';
  if(el('mn-reserva-duracion')) DB.business.reservaDuracionMin = Math.max(0, parseInt(el('mn-reserva-duracion').value) || 0) || '';
  if(el('mn-reserva-margen-cierre')){ const m = parseInt(el('mn-reserva-margen-cierre').value); DB.business.reservaMargenCierreMin = isNaN(m) ? '' : Math.max(0, m); }
  const leadTimeReservas = readLeadTimeDHM('mn-leadtime-reservas');
  if(leadTimeReservas != null) DB.business.leadTimeMinReservas = leadTimeReservas;
  const leadTimePedidos = readLeadTimeDHM('mn-leadtime-pedidos');
  if(leadTimePedidos != null){
    DB.business.leadTimeMinPedidos = leadTimePedidos;
    // Se mantienen los campos antiguos en sincronía con el de pedidos (no el
    // de reservas) por compatibilidad: eran el mismo valor compartido antes
    // de separarlos, y reservagastrogoan.html todavía puede caer en ellos
    // como último recurso si una versión en caché no trae los nuevos.
    DB.business.leadTimeMin = DB.business.leadTimeMinPedidos;
    if(!DB.business.pedidos) DB.business.pedidos = {};
    DB.business.pedidos.leadTimeMin = DB.business.leadTimeMinPedidos;
  }
  // La casilla manda: si está desmarcada el valor es 0 aunque el campo del número
  // siga en pantalla (toggleReservaConfirmManual guarda ANTES de repintar, y leer
  // el campo volvía a dejar el valor en ≥1: la casilla no se podía desmarcar).
  if(el('mn-require-manual-confirm')){
    DB.business.reservaConfirmManualDesde = el('mn-require-manual-confirm').checked
      ? Math.max(1, parseInt((el('mn-require-manual-confirm-from')||{}).value) || DB.business.reservaConfirmManualDesde || 8)
      : 0;
  }
  if(el('mn-require-deposit')) DB.business.requireDeposit = el('mn-require-deposit').checked && pagoOnlineActivo;
  if(el('mn-deposit-amount')) DB.business.depositAmount = Math.max(0, parseFloat(el('mn-deposit-amount').value) || 0) || '';
  if(el('mn-deposit-type')) DB.business.depositType = el('mn-deposit-type').value;
  if(el('mn-deposit-minpeople')) DB.business.depositMinPeople = Math.max(0, parseInt(el('mn-deposit-minpeople').value) || 0);
  if(el('mn-deposit-instructions')) DB.business.depositInstructions = el('mn-deposit-instructions').value.trim();
  if(el('mn-ig')) DB.business.ig = el('mn-ig').value.trim();
  if(el('mn-fb')) DB.business.fb = el('mn-fb').value.trim();
  if(el('mn-gmaps')) DB.business.gmaps = el('mn-gmaps').value.trim();
  if(el('mn-tiktok')) DB.business.tiktok = el('mn-tiktok').value.trim();
  // ⚠️ Los tipos de servicio NO se leen aquí del DOM a propósito: cada
  // checkbox ya se guarda al instante con toggleTipoServicio() en cuanto se
  // toca. Leerlos otra vez aquí era redundante y, además, la causa de un bug
  // real: renderMiNegocio() conserva lo que hay en el DOM al repintar (para
  // no perder un cambio sin guardar), así que si otro dispositivo desactivaba
  // un servicio por sincronización mientras esta pantalla seguía con el
  // checkbox antiguo marcado, "Guardar todo" (disparado por cualquier otro
  // campo, p.ej. el teléfono) volvía a activar ese servicio sin que nadie lo
  // pidiera. Hallazgo de una auditoría externa.
  const newHorario = readHorarioFromForm();
  const horarioWarnings = validateHorario(newHorario);
  // Antes esto se guardaba igual aunque el horario no tuviera sentido (p.ej.
  // hora de cierre antes que la de apertura): la validación se calculaba
  // DESPUÉS de asignarlo y de todas formas se persistía siempre, con un
  // simple toast no bloqueante como único aviso.
  //
  // La confirmación bloqueante solo tiene sentido en el guardado EXPLÍCITO
  // ("Guardar todo", silent=false/undefined) — saveBusiness(true) se llama
  // en el onchange de casi cualquier campo suelto del formulario (nombre,
  // tipo, año...), y ese horario ya vivía en el DOM aunque el campo que
  // cambió no tuviera nada que ver, así que un confirm() ahí interrumpía al
  // usuario por cambios ajenos al horario. Y si cancela, el resto de campos
  // (ya asignados arriba) se guardan igual: solo se descarta el horario.
  let horarioRechazado = false;
  if(horarioWarnings.length && !silent){
    if(!(await confirmModal(horarioWarnings[0] + '\n\n' + t('msg.confirmSaveAnyway')))){
      horarioRechazado = true;
    }
  }
  DB.business.horario = horarioRechazado ? (DB.business.horario||newHorario) : newHorario;
  // Solo tiene sentido comparar la antelación de PEDIDOS contra el horario
  // de un día: un pedido se prepara el mismo día que se hace, así que si el
  // negocio abre menos tiempo que la antelación exigida, ese pedido nunca
  // llegaría a tiempo. La antelación de RESERVAS es otra cosa por completo
  // — "reservar con 2 días de antelación" (2880 min) no tiene relación
  // alguna con cuánto dura el turno de un día suelto, así que compararla
  // contra un solo horario disparaba este aviso SIEMPRE que se guardara
  // cualquier cosa en Mi Negocio, aunque la antelación de reservas fuera
  // perfectamente razonable.
  const leadTimeWarning = leadTimeVsHorarioWarning(DB.business.horario, DB.business.leadTimeMinPedidos||0);
  saveDB();
  // El selector de negocios mostraba siempre "Mi negocio", el nombre de
  // relleno con el que nace el hueco: nadie sincronizaba el nombre real con
  // él (updateActiveSlotName existía pero no la llamaba nadie). Con un solo
  // negocio se notaba poco; con varios, todos se llamaban igual y no había
  // forma de distinguirlos en la pantalla desde la que se elige.
  updateActiveSlotName(DB.business.name);
  // Y también en la cuenta del dueño, no solo en este aparato. Ahí el
  // nombre se escribía únicamente al activar la licencia, cuando todavía
  // estaba vacío, y no se refrescaba nunca: en un móvil nuevo el negocio
  // aparecía en el selector como "Mi negocio" hasta que se entraba dentro
  // (que es cuando llega el nombre real por la nube). Con varios locales,
  // todos iguales y sin poder distinguirlos.
  if(DB.business.name && DB.license && DB.license.tenantId && typeof linkBusinessToOwnerAccount === 'function'
     && _lastLinkedBusinessName !== DB.business.name){
    _lastLinkedBusinessName = DB.business.name;
    linkBusinessToOwnerAccount(DB.license.tenantId, DB.license.code, DB.business.name);
  }
  renderHeader();
  updateAutoActiveCarta(true);
  updateAutoActiveMenu(true);
  checkAforoWarning();
  const serviceMismatchWarning = businessTypeServiceMismatchWarning(DB.business.tipo, DB.business.tiposServicio);
  if(horarioRechazado) showToast(t('msg.horarioNotSaved'));
  else if(horarioWarnings.length) showToast(horarioWarnings[0]);
  else if(leadTimeWarning) showToast(leadTimeWarning);
  else if(serviceMismatchWarning) showToast(serviceMismatchWarning);
  else if(!silent) showToast(t('msg.businessSaved'));
}

// Compara el tiempo mínimo de antelación de PEDIDOS (lead time) con la
// duración del horario de apertura de cada día abierto: si algún día el
// negocio abre menos tiempo del que exige esa antelación, el pedido nunca
// podría prepararse a tiempo ese día, así que avisamos (sin bloquear). Ojo:
// esto NO aplica a la antelación de RESERVAS, que se mide en días/horas
// hacia el futuro y no tiene ninguna relación con la duración de un turno
// concreto (llamarlo con esa antelación disparaba este aviso siempre).
function leadTimeVsHorarioWarning(horario, leadTimeMin){
  if(!leadTimeMin || !Array.isArray(horario)) return null;
  const toMin = s => { if(!s) return null; const p = s.split(':'); return parseInt(p[0])*60 + parseInt(p[1]||0); };
  for(let i=0;i<horario.length;i++){
    const d = horario[i];
    if(!d || d.abierto === false) continue;
    const tramos = d.modo === 'seguido' ? [d.seguido] : (d.turnos||[]);
    let maxWindow = 0;
    (tramos||[]).forEach(tr => {
      if(!tr || !tr.ini || !tr.fin) return;
      const ini = toMin(tr.ini), fin = toMin(tr.fin);
      if(fin != null && ini != null && fin > ini) maxWindow = Math.max(maxWindow, fin - ini);
    });
    if(maxWindow > 0 && maxWindow < leadTimeMin){
      return t('mn.leadtime.warning').replace('${lead}', leadTimeMin).replace('${day}', weekDayFull(i)).replace('${window}', maxWindow);
    }
  }
  return null;
}

/* ============================================================
   PLATAFORMAS DE DELIVERY (Glovo, Uber Eats, Just Eat...)
   Cada plataforma cobra una comisión (% + IVA) sobre las ventas que
   llegan por ella. Esa comisión se descuenta automáticamente como
   gasto en Gestión Económica.
   ============================================================ */
const DELIVERY_PLATFORM_SUGGESTIONS = ['Glovo','Uber Eats','Just Eat','Deliveroo'];

function renderDeliveryPlatformsCard(){
  const platforms = (DB.business && DB.business.deliveryPlatforms) || [];
  const couriers = (DB.business && DB.business.ownCouriers) || [];
  return `
    <div class="card">
      <h3><i class="ti ti-moped"></i> ${t('mn.delivery.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.delivery.desc')}</p>
      <div id="delivery-platforms-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${platforms.length ? platforms.map(p=>`
          <div class="ge-item">
            <span style="flex:1;font-size:14px;font-weight:600">${escapeHtml(p.nombre)}</span>
            <span style="font-size:12px;color:var(--muted);margin-right:8px">${t('mn.delivery.commissionLabel')} ${fmtNum(p.comisionPct)}% + ${t('mn.delivery.vatLabel')} ${fmtNum(p.ivaPct)}%</span>
            <button class="btn btn-sm btn-icon" onclick="editDeliveryPlatform(${p.id})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="deleteDeliveryPlatform(${p.id})"><i class="ti ti-trash"></i></button>
          </div>`).join('')
        : `<div class="empty" style="padding:12px 16px">${t('mn.delivery.empty')}</div>`}
      </div>
      <button class="btn btn-sm" onclick="newDeliveryPlatform()"><i class="ti ti-plus"></i> ${t('mn.delivery.addPlatform')}</button>

      <h4><i class="ti ti-user-bolt"></i> ${t('mn.couriers.title')}</h4>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.couriers.desc')}</p>
      <div id="own-couriers-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${couriers.length ? couriers.map(c=>`
          <div class="ge-item">
            <span style="flex:1;font-size:14px;font-weight:600">${escapeHtml(c.nombre)}</span>
            ${c.telefono ? `<a class="btn btn-sm btn-icon" style="color:#4A5D4E" href="https://wa.me/${c.telefono.replace(/[^0-9]/g,'')}" target="_blank" rel="noopener" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
            <button class="btn btn-sm btn-icon" onclick="editOwnCourier(${c.id})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="deleteOwnCourier(${c.id})"><i class="ti ti-trash"></i></button>
          </div>`).join('')
        : `<div class="empty" style="padding:12px 16px">${t('mn.couriers.empty')}</div>`}
      </div>
      <button class="btn btn-sm" onclick="newOwnCourier()"><i class="ti ti-plus"></i> ${t('mn.couriers.addCourier')}</button>
    </div>
  `;
}

function newOwnCourier(){
  openOwnCourierModal(t('mn.couriers.addTitle'), {id:null, nombre:'', telefono:''});
}
function editOwnCourier(id){
  const c = (DB.business.ownCouriers||[]).find(x=>x.id===id); if(!c) return;
  openOwnCourierModal(t('mn.couriers.editTitle'), c);
}
function openOwnCourierModal(title, c){
  openModal(`
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="oc-f-nombre" value="${escapeHtml(c.nombre)}" placeholder="${t('ph.egCourierName')}">
    </div>
    <div class="field">
      <label>${t('mn.couriers.phoneLabel')}</label>
      <input type="text" id="oc-f-telefono" value="${escapeHtml(c.telefono||'')}" placeholder="${t('ph.egPhone')}">
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${t('mn.couriers.phoneHint')}</div>
      <button type="button" class="btn btn-sm" style="margin-top:6px" onclick="const p=document.getElementById('oc-f-telefono').value.replace(/[^0-9]/g,'');if(p)window.open('https://wa.me/'+p,'_blank')"><i class="ti ti-brand-whatsapp"></i> ${t('mn.couriers.testWhatsapp')}</button>
    </div>
    <input type="hidden" id="oc-f-id" value="${c.id||''}">
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveOwnCourier()">${t('common.save')}</button>
    </div>
  `);
}
function saveOwnCourier(){
  const nombre = document.getElementById('oc-f-nombre').value.trim();
  const telefono = document.getElementById('oc-f-telefono').value.trim();
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  if(!telefono){ showToast(t('msg.phoneRequired')); return; }
  const telefonoDigits = telefono.replace(/[^0-9]/g,'');
  if(telefonoDigits.length < 10){ showToast(t('msg.includePrefix')); return; }
  if(/^(\d)\1+$/.test(telefonoDigits)){ showToast(t('msg.invalidPhoneNumber')); return; }
  if(!DB.business.ownCouriers) DB.business.ownCouriers = [];
  const idVal = document.getElementById('oc-f-id').value;
  if(idVal){
    const c = DB.business.ownCouriers.find(x=>x.id===parseInt(idVal));
    if(c) Object.assign(c, {nombre, telefono});
  }else{
    DB.business.ownCouriers.push({id: genId(), nombre, telefono});
  }
  saveDB();
  closeModal();
  renderMiNegocio();
  showToast(t('msg.courierSaved'));
}
async function deleteOwnCourier(id){
  if(!(await confirmModal(t('msg.confirmDeleteCourier')))) return;
  DB.business.ownCouriers = (DB.business.ownCouriers||[]).filter(c=>c.id!==id);
  saveDB();
  renderMiNegocio();
}

function newDeliveryPlatform(){
  openDeliveryPlatformModal(t('mn.delivery.addTitle'), {id:null, nombre:'', comisionPct:30, ivaPct:21});
}
function editDeliveryPlatform(id){
  const p = (DB.business.deliveryPlatforms||[]).find(x=>x.id===id); if(!p) return;
  openDeliveryPlatformModal(t('mn.delivery.editTitle'), p);
}
function openDeliveryPlatformModal(title, p){
  const sugerencias = DELIVERY_PLATFORM_SUGGESTIONS.map(s=>`<option value="${s}">`).join('');
  openModal(`
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="field">
      <label>${t('mn.delivery.platformName')}</label>
      <input type="text" id="dp-f-nombre" list="dp-sugerencias" value="${escapeHtml(p.nombre)}" placeholder="${t('ph.egDeliveryPlatform')}">
      <datalist id="dp-sugerencias">${sugerencias}</datalist>
    </div>
    <div class="field-row">
      <div class="field"><label>${t('mn.delivery.commission')}</label><input type="number" id="dp-f-comision" min="0" max="100" step="0.1" value="${p.comisionPct!=null?p.comisionPct:30}" oninput="updateDeliveryPlatformExample()"></div>
      <div class="field"><label>${t('mn.delivery.vatOnCommission')}</label><input type="number" id="dp-f-iva" min="0" max="100" step="0.1" value="${p.ivaPct!=null?p.ivaPct:21}" oninput="updateDeliveryPlatformExample()"></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:4px;cursor:pointer">
      <input type="checkbox" id="dp-f-comision-envio" ${p.comisionSobreEnvio!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.delivery.commissionOnShipping')}
    </label>
    <p style="font-size:12px;color:var(--muted);margin:0 0 10px">${t('mn.delivery.commissionOnShippingDesc')}</p>
    <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;margin-bottom:4px;cursor:pointer">
      <input type="checkbox" id="dp-f-isp" ${p.isp?'checked':''} style="width:18px;height:18px;flex:none"> <span>${t('mn.delivery.isp')}</span>
    </label>
    <p class="txt-xs" style="color:var(--muted);margin:0 0 10px">${t('mn.delivery.ispDesc')}</p>
    <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;margin-bottom:4px;cursor:pointer">
      <input type="checkbox" id="dp-f-real" ${p.facturaReal?'checked':''} style="width:18px;height:18px;flex:none"> <span>${t('mn.delivery.facturaReal')}</span>
    </label>
    <p class="txt-xs" style="color:var(--muted);margin:0 0 10px">${t('mn.delivery.facturaRealDesc')}</p>
    <p style="font-size:12px;color:var(--muted)">${t('mn.delivery.calcHint')}</p>
    <p style="font-size:13px;font-weight:600" id="dp-example"></p>
    <input type="hidden" id="dp-f-id" value="${p.id||''}">
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveDeliveryPlatform()">${t('common.save')}</button>
    </div>
  `);
  updateDeliveryPlatformExample();
}
// Recalcula al vuelo el ejemplo "en un pedido de 20€, recibirías netos X" para
// que el negocio pueda comprobar los números antes de guardar la plataforma.
function updateDeliveryPlatformExample(){
  const el = document.getElementById('dp-example');
  if(!el) return;
  const comisionPct = parseFloat(document.getElementById('dp-f-comision').value) || 0;
  const ivaPct = parseFloat(document.getElementById('dp-f-iva').value) || 0;
  const ejemplo = 20;
  const comision = ejemplo * (comisionPct/100) * (1 + ivaPct/100);
  const neto = ejemplo - comision;
  el.textContent = t('mn.delivery.exampleLabel') + fmtMoney(neto);
}
function saveDeliveryPlatform(){
  const nombre = document.getElementById('dp-f-nombre').value.trim();
  const comisionPct = parseFloat(document.getElementById('dp-f-comision').value);
  const ivaPct = parseFloat(document.getElementById('dp-f-iva').value);
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  if(isNaN(comisionPct) || comisionPct<0 || comisionPct>100){ showToast(t('msg.enterCommission')); return; }
  if(!DB.business.deliveryPlatforms) DB.business.deliveryPlatforms = [];
  const idVal = document.getElementById('dp-f-id').value;
  // Evita dos plataformas con el mismo nombre (aunque difieran en mayúsculas),
  // que darían comisiones ambiguas al atribuir una venta por nombre de plataforma.
  const dupe = DB.business.deliveryPlatforms.find(p => p.nombre.trim().toLowerCase()===nombre.toLowerCase() && String(p.id)!==idVal);
  if(dupe){ showToast(t('msg.platformNameDuplicate')); return; }
  const comisionSobreEnvio = document.getElementById('dp-f-comision-envio').checked;
  const data = {nombre, comisionPct, ivaPct: (isNaN(ivaPct)||ivaPct<0) ? 0 : Math.min(100, ivaPct), comisionSobreEnvio,
    isp: document.getElementById('dp-f-isp').checked, facturaReal: document.getElementById('dp-f-real').checked};
  if(idVal){
    const p = DB.business.deliveryPlatforms.find(x=>x.id===parseInt(idVal));
    if(p){
      logBusinessSettingChange(`Plataforma "${nombre}": comisión ${p.comisionPct}% → ${comisionPct}%, IVA ${p.ivaPct}% → ${data.ivaPct}%`);
      Object.assign(p, data);
    }
  }else{
    DB.business.deliveryPlatforms.push({id: genId(), ...data});
    logBusinessSettingChange(`Nueva plataforma de delivery: "${nombre}" (comisión ${comisionPct}%, IVA ${data.ivaPct}%)`);
  }
  saveDB();
  closeModal();
  renderMiNegocio();
  showToast(t('msg.platformSaved'));
}
async function deleteDeliveryPlatform(id){
  if(!(await confirmModal(t('msg.confirmDeletePlatform')))) return;
  DB.business.deliveryPlatforms = (DB.business.deliveryPlatforms||[]).filter(p=>p.id!==id);
  saveDB();
  renderMiNegocio();
}

/* ============================================================
   CONFIGURACIÓN DEL TICKET
   ============================================================ */
function renderTicketConfigCard(){
  const tc = (DB.business && DB.business.ticket) || defaultData().business.ticket;
  return `
    <div class="card">
      <h3><i class="ti ti-receipt"></i> ${t('mn.ticket.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.ticket.desc')}</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-direccion" ${tc.mostrarDireccion!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.ticket.showAddress')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-telefono" ${tc.mostrarTelefono!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.ticket.showPhone')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-web" ${tc.mostrarWeb?'checked':''} style="width:18px;height:18px"> ${t('mn.ticket.showWeb')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-nif" checked disabled title="${t('factura.completa.desc')}" style="width:18px;height:18px"> ${t('mn.ticket.showTaxId')}
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:${(DB.business&&DB.business.gmaps)?'pointer':'default'};${(DB.business&&DB.business.gmaps)?'':'opacity:.5'}">
          <input type="checkbox" id="tk-review-qr" ${tc.mostrarResenaQr!==false?'checked':''} ${(DB.business&&DB.business.gmaps)?'':'disabled'} style="width:18px;height:18px"> ${t('mn.ticket.showReviewQr')}
        </label>
        ${(DB.business&&DB.business.gmaps) ? '' : `<p style="font-size:12px;color:var(--muted);margin:-4px 0 0 28px">${t('mn.ticket.showReviewQrHint')}</p>`}
      </div>
      <div class="field">
        <label>${t('mn.ticket.footerMessage')}</label>
        <textarea id="tk-pie" placeholder="${t('ph.egTicketFooter')}">${escapeHtml(tc.pie||'')}</textarea>
      </div>
      ${ivaResumenProductosHtml()}
      <div class="field-row tk-iva-row">
        <div class="field">
          <label for="tk-iva">${t('mn.ticket.vatPct')}</label>
          <input type="number" id="tk-iva" min="0" max="100" step="0.1" value="${tc.ivaPct!=null?tc.ivaPct:10}">
        </div>
        <div class="field">
          <label for="tk-iva-bebidas">${escapeHtml(gl({es:'IVA por defecto — bebidas (%)', ca:'IVA per defecte — begudes (%)', en:'Default VAT — drinks (%)'}))}</label>
          <input type="number" id="tk-iva-bebidas" min="0" max="100" step="0.1" value="${tc.ivaBebidasPct!=null && tc.ivaBebidasPct!=='' ? tc.ivaBebidasPct : ''}" placeholder="${escapeHtml(gl({es:'Igual que comida', ca:'Igual que menjar', en:'Same as food'}))}">
        </div>
      </div>
      <p class="txt-xs" style="color:var(--muted);margin:-4px 0 12px">${t('mn.ticket.vatDescLong')}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveTicketConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
        <button class="btn btn-sm" onclick="previewTicketConfig()"><i class="ti ti-eye"></i> ${t('mn.ticket.preview')}</button>
      </div>
    </div>
    <!-- Impresora y cajón en su propia tarjeta: dentro del ticket la hacían
         tan larga que descuadraba las dos columnas de Mi Negocio. -->
    <div class="card">
      <h3 style="color:var(--ink)"><i class="ti ti-printer"></i> ${t('print.sectionTitle')}</h3>
      ${renderPrintModeConfig('ticket', {ancho: true})}
      ${getPrintMode('ticket') === 'bluetooth' ? `
      <p style="font-size:12.5px;color:var(--muted);margin:10px 0">${t('thermal.sectionDesc')}</p>
      <button class="btn btn-sm" onclick="connectThermalPrinter()"><i class="ti ti-bluetooth"></i> ${t('thermal.connectBtn')}</button>` : ''}

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="ti ti-cash"></i> ${t('drawer.sectionTitle')}</p>
      ${getPrintMode('ticket') === 'bluetooth' ? `
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('drawer.sectionDesc')}</p>
      <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;font-size:13px;cursor:pointer;margin-bottom:10px">
        <input type="checkbox" id="mn-cash-drawer" ${DB.business.cashDrawerOnSale?'checked':''} onchange="saveCashDrawerSetting(this.checked)" style="width:auto;margin-top:2px">
        <span>${t('drawer.enableLabel')}</span>
      </label>
      ${DB.business.cashDrawerOnSale ? `<button class="btn btn-sm" onclick="openCashDrawerManually()"><i class="ti ti-cash"></i> ${t('drawer.testBtn')}</button>` : ''}
      ` : `<div class="manual-warning" id="print-drawer-browser"><i class="ti ti-alert-triangle"></i> ${t('print.drawerBrowser')}</div>`}
    </div>
  `;
}

// Vista previa del ticket de cliente con datos de ejemplo, usando el mismo
// generador de texto que el TPV al cobrar (buildTicketText), para que el
// dueño vea de verdad el resultado con su configuración actual (dirección,
// teléfono, web, NIF, pie e IVA) sin tener que hacer una venta de prueba.
function previewTicketConfig(){
  const sampleSale = {
    date: new Date().toLocaleString(localeActual()),
    tipo: 'mesa',
    items: [
      {qty:2, name:'Ejemplo de plato', price:9.5},
      {qty:1, name:'Bebida de ejemplo', price:2.5},
    ],
    total: 21.5,
    metodoPago: t('mn.ticket.samplePayment'),
  };
  const text = buildTicketText(sampleSale);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-receipt"></i> ${t('mn.ticket.previewTitle')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div style="background:#fff;color:#111;font-family:monospace;font-size:12.5px;white-space:pre-wrap;padding:16px;border:1px solid var(--border);border-radius:8px;max-width:320px;margin:0 auto">${escapeHtml(text)}</div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${t('common.close')}</button></div>
  `);
}

// Configuración de VeriFactu: cada negocio contrata y paga SU PROPIA cuenta
// con un proveedor de facturación certificado (no una cuenta de GastroGoan),
// y aquí solo pega su clave de API — igual que "conecta tu propia nube" con
// Firebase. GastroGoan no cobra ni gestiona nada de ese servicio, solo llama
// a su API al cerrar cada venta. Ver VERIFACTU_PROVIDERS (js/tpv.js) para la
// lista de proveedores soportados y submitSaleToVerifactu() para el envío.
function renderVerifactuConfigCard(){
  const vf = verifactuConfig();
  const pendingSales = (DB.sales||[]).filter(s => s.verifactu && s.verifactu.status === 'pending');
  const providerOptions = Object.keys(VERIFACTU_PROVIDERS).map(k =>
    `<option value="${k}" ${vf.provider===k?'selected':''}>${escapeHtml(VERIFACTU_PROVIDERS[k].label)}</option>`
  ).join('');
  return `
    <div class="card" style="position:relative;opacity:0.85">
      <h3 style="display:flex;align-items:center;gap:8px">
        <i class="ti ti-file-invoice"></i> ${t('mn.verifactu.title')}
        <span class="badge txt-xs" style="background:var(--muted,#888);color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:0.5px"><i class="ti ti-hourglass-low"></i> ${t('mn.verifactu.draftBadge')}</span>
      </h3>
      <div style="background:var(--bg-soft,#f4f4f4);border:1px dashed var(--border);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.55;margin-bottom:12px;color:var(--muted)">
        <p style="margin:0">${t('mn.verifactu.draftNotice')}</p>
      </div>
      <!-- Todo lo de abajo son campos reales de configuración (proveedor,
           clave de API...) que todavía no hacen nada mientras VeriFactu no
           sea obligatorio — se bloquean del todo (ni se puede escribir ni
           hacer clic) y en gris, para que quede claro de un vistazo que no
           es "puedes rellenarlo si quieres" sino "no toca todavía". -->
      <div style="pointer-events:none;filter:grayscale(1);opacity:.5" aria-disabled="true">
      <p style="font-size:13px;color:var(--muted)">${t('mn.verifactu.desc')}</p>
      <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.55;margin-bottom:12px">
        <p style="margin:0 0 6px"><strong>${t('mn.verifactu.howItWorksTitle')}</strong> ${t('mn.verifactu.howItWorks1')}</p>
        <p style="margin:0">${t('mn.verifactu.howItWorks2')}</p>
      </div>
      <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:${vf.lockedOnce?'default':'pointer'};margin-bottom:4px">
        <input type="checkbox" id="vf-enabled" ${vf.enabled?'checked':''} ${vf.lockedOnce?'disabled':''} style="width:18px;height:18px"> ${t('mn.verifactu.enable')}
      </label>
      ${vf.lockedOnce ? `<p style="font-size:12px;color:var(--muted);margin:0 0 10px"><i class="ti ti-lock"></i> ${t('mn.verifactu.lockedNotice')}</p>` : ''}
      <div class="field">
        <label>${t('mn.verifactu.provider')}</label>
        <select id="vf-provider" onchange="document.getElementById('vf-domain-field').style.display = this.value==='verifactuapi' ? '' : 'none'">
          <option value="">${t('mn.verifactu.selectProvider')}</option>
          ${providerOptions}
        </select>
      </div>
      <div class="field">
        <label>${t('mn.verifactu.apiKey')}</label>
        <input type="text" id="vf-apikey" value="${escapeHtml(vf.apiKey||'')}" placeholder="${t('ph.verifactuApiKey')}" style="font-family:monospace;font-size:12px">
        <small style="color:var(--muted)">${t('mn.verifactu.apiKeyHint')}</small>
      </div>
      <div class="field" id="vf-domain-field" style="${vf.provider==='verifactuapi'?'':'display:none'}">
        <label>${t('mn.verifactu.domain')}</label>
        <input type="text" id="vf-domain" value="${escapeHtml(vf.domain||'')}" placeholder="tunegocio.invo.cash" style="font-family:monospace;font-size:12px">
        <small style="color:var(--muted)">${t('mn.verifactu.domainHint')}</small>
      </div>
      <div class="field">
        <label>${t('mn.verifactu.serie')}</label>
        <input type="text" id="vf-serie" value="${escapeHtml(verifactuSerie())}" placeholder="T1" style="max-width:120px;font-family:monospace">
        <small style="color:var(--muted)">${t('mn.verifactu.serieHint')}</small>
      </div>
      ${pendingSales.length ? `<p style="font-size:12.5px;color:var(--ink);cursor:pointer" onclick="openVerifactuPendingModal()"><i class="ti ti-alert-triangle"></i> ${t('mn.verifactu.pendingCount').replace('${n}', pendingSales.length)} <span style="text-decoration:underline">${t('common.viewDetail')}</span></p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <button class="btn btn-primary" onclick="saveVerifactuConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px">
        <h3 style="font-size:14px"><i class="ti ti-file-shield"></i> ${t('mn.verifactu.declarationsTitle')}</h3>
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${t('mn.verifactu.declarationsDesc')}</p>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;flex-wrap:wrap">
          <span style="min-width:170px">${t('mn.verifactu.ownDeclaration')}</span>
          <a href="${DECLARACION_RESPONSABLE_URL}" target="_blank" rel="noopener" class="vf-declaracion-link" style="display:flex;align-items:center;gap:4px"><i class="ti ti-external-link"></i> ${t('common.view')}</a>
        </div>
        ${renderVerifactuDeclarationRow('providerDeclarationUrl', t('mn.verifactu.providerDeclaration'), t('mn.verifactu.providerDeclarationPending'))}
      </div>
      </div>
    </div>
  `;
}
function renderVerifactuDeclarationRow(field, label, pendingLabel){
  const vf = (DB.business && DB.business.verifactu) || {};
  const url = vf[field] || '';
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;flex-wrap:wrap">
      <span style="min-width:170px">${label}</span>
      ${url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="vf-declaracion-link" style="display:flex;align-items:center;gap:4px"><i class="ti ti-external-link"></i> ${t('common.view')}</a>`
        : `<span style="color:var(--muted)"><i class="ti ti-hourglass-empty"></i> ${pendingLabel}</span>`}
      <input type="text" id="vf-${field}" value="${escapeHtml(url)}" placeholder="https://..." style="flex:1;min-width:160px;font-size:12px;padding:3px 6px" onchange="setVerifactuDeclarationUrl('${field}', this.value)">
    </div>
  `;
}
function setVerifactuDeclarationUrl(field, val){
  if(!DB.business.verifactu) DB.business.verifactu = {enabled:false, provider:'', apiKey:''};
  DB.business.verifactu[field] = val.trim();
  saveDB();
  renderMiNegocio();
}
function openVerifactuPendingModal(){
  const pendingSales = (DB.sales||[]).filter(s => s.verifactu && s.verifactu.status === 'pending');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('mn.verifactu.pendingModalTitle')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('common.total')}</th><th>${t('mn.verifactu.incident')}</th></tr></thead>
        <tbody>${pendingSales.map(s => `
          <tr>
            <td>${escapeHtml(s.date||'—')}</td>
            <td>${fmtMoney(s.total||0)}</td>
            <td style="color:var(--red)">${escapeHtml(s.verifactu.lastError || t('mn.verifactu.noErrorYet'))}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function saveVerifactuConfig(){
  const vfPrev = (DB.business && DB.business.verifactu) || {};
  // "Exclusivamente VERI*FACTU": una vez activado no se puede volver a
  // desactivar, tal como exige declararse en ese modo ante la AEAT (igual
  // que hace Invocash en su propia Declaración Responsable). Un checkbox
  // deshabilitado en el HTML ya impide desmarcarlo desde la UI; esta
  // comprobación es solo el respaldo por si se llama a la función a mano.
  const enabled = vfPrev.lockedOnce ? true : document.getElementById('vf-enabled').checked;
  const provider = document.getElementById('vf-provider').value;
  const apiKey = document.getElementById('vf-apikey').value.trim();
  // Invocash/VeriFactuAPI no tiene una URL fija de API: cada negocio tiene
  // su propio dominio (el mismo que el de su panel, ej. "tunegocio.invo.cash"),
  // confirmado en vivo el 10/08/2026 (antes el código apuntaba a un dominio
  // fijo -app.verifactuapi.es- que ya no es el correcto para este esquema).
  const domain = document.getElementById('vf-domain') ? document.getElementById('vf-domain').value.trim().replace(/^https?:\/\//,'').replace(/\/$/,'') : (vfPrev.domain||'');
  const serie = document.getElementById('vf-serie').value.trim();
  if(enabled && (!provider || !apiKey)){ showToast(t('msg.verifactuMissingFields')); return; }
  if(enabled && provider === 'verifactuapi' && !domain){ showToast(t('msg.verifactuMissingDomain')); return; }
  if(enabled && !serie){ showToast(t('msg.verifactuMissingSerie')); return; }
  // La serie es POR DISPOSITIVO (localStorage), no se sincroniza entre
  // aparatos del mismo negocio — ver aviso en js/tpv.js sobre por qué.
  setVerifactuSerie(serie);
  try{ localStorage.setItem(verifactuKeyLS(), apiKey); }catch(e){}
  DB.business.verifactu = {...vfPrev, enabled, provider, apiKey:'', domain, lockedOnce: vfPrev.lockedOnce || enabled};
  saveDB();
  renderMiNegocio();
  showToast(t('msg.verifactuConfigSaved'));
}

// Configuración de cómo se gestionan las comandas de cocina y sala: verlas en
// pantalla o imprimirlas automáticamente al marchar, mediante uno o varios
// "perfiles de impresora" (uno por cada dispositivo/punto físico con impresora).
function ensureComandaPrinters(){
  if(!DB.business) return [];
  if(!DB.business.comandas) DB.business.comandas = {modo:'pantalla', anchoTicket:80};
  const c = DB.business.comandas;
  if(!Array.isArray(c.printers)){
    const esImpresion = c.modo === 'impresion';
    const ancho = c.anchoTicket || 80;
    c.printers = [
      {id: genId(), nombre: t('mn.comandas.defaultKitchen'), activo: esImpresion, anchoTicket: ancho, contenido: 'comida'},
      {id: genId(), nombre: t('mn.comandas.defaultDining'), activo: esImpresion, anchoTicket: ancho, contenido: 'bebida'}
    ];
    saveDB();
  }
  return c.printers;
}
function anyComandaPrinterActive(){
  return ensureComandaPrinters().some(p => p.activo);
}
// Resumen de una línea de lo que va a pasar AHORA con las comandas (antes había que deducirlo de los interruptores de abajo):
// pantalla, impresoras activas y qué falta por hacer si alguna no está lista.
function comandaEstadoHtml(modo, printers){
  const activas = printers.filter(p => p.activo);
  let tipo = 'ok', txt;
  if(modo !== 'impresion'){
    txt = gl({es:'Las comandas salen en la pantalla de Comandas (cocina y barra). No se imprime nada.', ca:'Les comandes surten a la pantalla de Comandes (cuina i barra). No s\'imprimeix res.', en:'Orders show on the Orders screen (kitchen and bar). Nothing is printed.'});
  }else if(!activas.length){
    tipo = 'warn';
    txt = gl({es:'Está en «Imprimir» pero no hay ninguna impresora activa: de momento las comandas salen en pantalla. Activa una abajo.', ca:'Està en «Imprimir» però no hi ha cap impressora activa: de moment les comandes surten a pantalla. Activa\'n una a sota.', en:'Set to "Print" but no printer is on: for now orders show on screen. Turn one on below.'});
  }else{
    const sinParear = activas.filter(p => getPrintMode(p.id) === 'bluetooth' && !(thermalPrintingSupported() && getThermalPrinterName(p.id)));
    txt = gl({es:'Se imprime en: ', ca:'S\'imprimeix a: ', en:'Printing on: '}) + activas.map(p => p.nombre).join(', ') + '.';
    if(sinParear.length){ tipo = 'warn'; txt += ' ' + gl({es:'Falta emparejar por Bluetooth: ', ca:'Falta emparellar per Bluetooth: ', en:'Bluetooth pairing needed: '}) + sinParear.map(p => p.nombre).join(', ') + '. ' + gl({es:'Mientras, sale por el navegador.', ca:'Mentrestant, surt pel navegador.', en:'Meanwhile it prints via the browser.'}); }
  }
  return `<div class="cp-estado-global ${tipo}" role="status"><i class="ti ${tipo === 'ok' ? 'ti-circle-check' : 'ti-alert-triangle'}"></i><span>${escapeHtml(txt)}</span></div>`;
}
function renderComandaPrintCard(){
  const printers = ensureComandaPrinters();
  const modo = (DB.business.comandas && DB.business.comandas.modo) || 'pantalla';
  return `
    <div class="card">
      <h3><i class="ti ti-printer"></i> ${t('mn.comandas.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.comandas.desc')}</p>
      <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.55;margin-bottom:10px">
        <p style="margin:0 0 6px"><strong>${t('mn.comandas.howItWorksTitle')}</strong> ${t('mn.comandas.howItWorks1')}</p>
        <p style="margin:0 0 6px">${t('mn.comandas.howItWorks2')}</p>
        <p style="margin:0">${t('mn.comandas.howItWorks3')}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <label class="ge-item" style="flex:1;min-width:200px;cursor:pointer;gap:10px;${modo==='pantalla'?'border-color:var(--ink);background:var(--brand-cream)':''}">
          <input type="radio" name="comanda-modo" value="pantalla" ${modo==='pantalla'?'checked':''} onchange="setComandaModo('pantalla')" style="width:18px;height:18px">
          <span><strong>${t('mn.comandas.modeScreen')}</strong><br><small style="color:var(--muted)">${t('mn.comandas.modeScreenDesc')}</small></span>
        </label>
        <label class="ge-item" style="flex:1;min-width:200px;cursor:pointer;gap:10px;${modo==='impresion'?'border-color:var(--ink);background:var(--brand-cream)':''}">
          <input type="radio" name="comanda-modo" value="impresion" ${modo==='impresion'?'checked':''} onchange="setComandaModo('impresion')" style="width:18px;height:18px">
          <span><strong>${t('mn.comandas.modePrint')}</strong><br><small style="color:var(--muted)">${t('mn.comandas.modePrintDesc')}</small></span>
        </label>
      </div>
      ${comandaEstadoHtml(modo, printers)}
      ${modo === 'impresion' ? `
      <div id="comanda-printers-list" class="cp-lista">
        ${printers.length ? printers.map(p=>{
          const bt = getPrintMode(p.id) === 'bluetooth';
          const pairedName = thermalPrintingSupported() ? getThermalPrinterName(p.id) : '';
          const estado = !p.activo ? {c:'off', x: gl({es:'Apagada', ca:'Apagada', en:'Off'})}
            : (bt && !pairedName) ? {c:'warn', x: gl({es:'Sin emparejar', ca:'Sense emparellar', en:'Not paired'})}
            : {c:'ok', x: bt ? gl({es:'Conectada por Bluetooth', ca:'Connectada per Bluetooth', en:'Connected by Bluetooth'}) : gl({es:'Lista (por el navegador)', ca:'Llesta (pel navegador)', en:'Ready (via browser)'})};
          return `
          <div class="cp-imp${p.activo ? '' : ' is-off'}">
            <div class="cp-cab">
              <label class="cp-activa"><input type="checkbox" ${p.activo?'checked':''} onchange="toggleComandaPrinter('${p.id}', this.checked)"><span>${escapeHtml(gl({es:'Activa', ca:'Activa', en:'On'}))}</span></label>
              <input type="text" class="cp-nombre" value="${escapeHtml(p.nombre)}" onchange="renameComandaPrinter('${p.id}', this.value)" placeholder="${t('ph.egPrinterName')}" aria-label="${escapeHtml(gl({es:'Nombre de la impresora', ca:'Nom de la impressora', en:'Printer name'}))}">
              <span class="cp-estado ${estado.c}">${escapeHtml(estado.x)}</span>
              <button class="btn btn-sm btn-fino" onclick="testComandaPrint('${p.id}')"><i class="ti ti-printer"></i> ${t('mn.comandas.testPrint')}</button>
              ${ggMenuAcciones([{icono:'ti-trash', texto: gl({es:'Eliminar impresora', ca:'Eliminar impressora', en:'Delete printer'}), fn: `deleteComandaPrinter('${p.id}')`, peligro:true}])}
            </div>
            <div class="cp-campos">
              <label class="field"><span class="cp-rot">${escapeHtml(gl({es:'Qué imprime', ca:'Què imprimeix', en:'What it prints'}))}</span>
                <select onchange="setComandaPrinterContenido('${p.id}', this.value)">
                  <option value="comida" ${p.contenido==='comida'?'selected':''}>${t('mn.comandas.contentFood')}</option>
                  <option value="bebida" ${p.contenido==='bebida'?'selected':''}>${t('mn.comandas.contentDrinks')}</option>
                  <option value="todo" ${p.contenido==='todo'?'selected':''}>${t('mn.comandas.contentAll')}</option>
                </select></label>
              <label class="field"><span class="cp-rot">${escapeHtml(gl({es:'Ancho del rollo', ca:'Ample del rotllo', en:'Paper width'}))}</span>
                <select onchange="setComandaPrinterAncho('${p.id}', this.value)">
                  <option value="80" ${p.anchoTicket!=58?'selected':''}>80 mm (${t('mn.comandas.standard')})</option>
                  <option value="58" ${p.anchoTicket==58?'selected':''}>58 mm (${t('mn.comandas.compact')})</option>
                </select></label>
              <div class="cp-conexion">${renderPrintModeConfig(p.id, {compacto: true})}</div>
            </div>
            ${bt ? `
            <div class="cp-bt">
              <i class="ti ti-bluetooth" style="color:${pairedName?'var(--ink)':'var(--muted)'}"></i>
              ${pairedName
                ? `<span class="cp-bt-txt"><strong>${escapeHtml(pairedName)}</strong> ${t('thermal.pairedHint')}</span>
                   <button class="btn btn-sm btn-fino" onclick="connectThermalPrinter('${p.id}')">${t('thermal.reconnectBtn')}</button>
                   <button class="btn btn-sm btn-fino is-off" onclick="forgetThermalPrinterUi('${p.id}')">${t('thermal.forgetBtn')}</button>`
                : `<span class="cp-bt-txt">${t('thermal.notPairedHint')}</span>
                   <button class="btn btn-sm btn-fino is-on" onclick="connectThermalPrinter('${p.id}')"><i class="ti ti-bluetooth"></i> ${t('thermal.connectBtn')}</button>`}
            </div>` : ''}
          </div>`;
        }).join('')
        : `<div class="empty" style="padding:12px 16px">${t('mn.comandas.empty')}</div>`}
      </div>
      <div class="cp-anadir">
        <button class="btn btn-sm btn-fino" onclick="addComandaPrinter('comida')"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Impresora de cocina', ca:'Impressora de cuina', en:'Kitchen printer'}))}</button>
        <button class="btn btn-sm btn-fino" onclick="addComandaPrinter('bebida')"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Impresora de barra', ca:'Impressora de barra', en:'Bar printer'}))}</button>
        <button class="btn btn-sm btn-fino" onclick="addComandaPrinter('todo')"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Otra (todo el pedido)', ca:'Una altra (tota la comanda)', en:'Other (whole order)'}))}</button>
      </div>
      ${thermalPrintingSupported() ? '' : `<div style="margin-top:10px">${renderNoBluetoothWarning()}</div>`}
      ` : ''}
    </div>
  `;
}
// Aviso de "este navegador no tiene Bluetooth". Antes era una línea gris
// que nadie leía, y en un iPad el hostelero solo veía que el botón de la
// térmica no estaba. Ahora dice QUÉ pasa y QUÉ hacer, con el color de aviso.
function renderNoBluetoothWarning(){
  return `<div class="manual-warning" id="print-no-bt-warning" role="note">
    <strong><i class="ti ti-bluetooth-off"></i> ${t('print.noBtTitle')}</strong><br>${t('print.noBtBody')}
  </div>`;
}
// Selector de modo (y, para el ticket de cliente, ancho del rollo) de una
// impresora en ESTE aparato. Sin Bluetooth, la opción sale desactivada y
// el aviso explica por qué, en vez de esconderla y dejar la duda.
function renderPrintModeConfig(printerId, opts){
  const o = opts || {};
  const bt = thermalPrintingSupported();
  const modo = getPrintMode(printerId);
  const idJs = String(printerId).replace(/[^\w-]/g, '');
  const anchoSel = o.ancho ? `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">${t('print.widthLabel')}
      <select id="print-width-${idJs}" onchange="setTicketPaperWidth(this.value)" style="max-width:220px">
        <option value="80" ${getTicketPaperWidth()!==58?'selected':''}>80 mm (${t('mn.comandas.standard')})</option>
        <option value="58" ${getTicketPaperWidth()===58?'selected':''}>58 mm (${t('mn.comandas.compact')})</option>
      </select></label>` : '';
  return `${(!bt && !o.compacto) ? renderNoBluetoothWarning() : ''}
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1;min-width:200px">${t('print.modeLabel')}
        <select id="print-mode-${idJs}" onchange="setPrintMode('${idJs}', this.value)">
          <option value="browser" ${modo==='browser'?'selected':''}>${t('print.modeBrowser')}</option>
          <option value="bluetooth" ${modo==='bluetooth'?'selected':''} ${bt?'':'disabled'}>${t('print.modeBluetooth')}${bt?'':' — '+t('print.notAvailable')}</option>
        </select>
      </label>
      ${anchoSel}
      ${(bt && modo === 'bluetooth' && !o.compacto) ? `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;min-width:200px">${escapeHtml(gl({es:'Juego de caracteres', ca:'Joc de caràcters', en:'Character set'}))}
        <select id="print-codepage-${idJs}" onchange="setPrintCodepage(this.value);showToast(t('common.save') + ' ✓')" style="max-width:300px">
          <option value="cp858" ${getPrintCodepage()==='cp858'?'selected':''}>${escapeHtml(gl({es:'Moderno (€ y acentos)', ca:'Modern (€ i accents)', en:'Modern (€ and accents)'}))}</option>
          <option value="cp437" ${getPrintCodepage()==='cp437'?'selected':''}>${escapeHtml(gl({es:'Clásico (si el € o los acentos salen mal)', ca:'Clàssic (si l\'€ o els accents surten malament)', en:'Classic (if the € or accents print wrong)'}))}</option>
        </select></label>` : ''}
    </div>
    ${o.compacto ? '' : `<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">${modo==='browser' ? t('print.browserDesc') + ' ' : ''}${t('print.perDeviceHint')}</p>`}`;
}
// Envoltorio del "Olvidar" de cada impresora de comandas: además de borrar
// la conexión guardada, repinta para que el botón vuelva a "Conectar".
function forgetThermalPrinterUi(printerId){
  forgetThermalPrinter(printerId);
  renderMiNegocio();
}
function setComandaModo(modo){
  if(!DB.business.comandas) DB.business.comandas = {modo:'pantalla', anchoTicket:80};
  DB.business.comandas.modo = modo;
  saveDB();
  renderMiNegocio();
  showToast(modo==='impresion' ? t('mn.comandas.willPrint') : t('mn.comandas.willShowScreen'));
}
function toggleComandaPrinter(id, activo){
  const p = ensureComandaPrinters().find(x=>x.id==id); if(!p) return;
  p.activo = !!activo;
  saveDB();
  showToast(anyComandaPrinterActive() ? t('mn.comandas.willPrint') : t('mn.comandas.willShowScreen'));
}
function renameComandaPrinter(id, nombre){
  const p = ensureComandaPrinters().find(x=>x.id==id); if(!p) return;
  p.nombre = nombre.trim();
  saveDB();
}
function setComandaPrinterAncho(id, val){
  const p = ensureComandaPrinters().find(x=>x.id==id); if(!p) return;
  p.anchoTicket = parseInt(val)||80;
  saveDB();
}
function setComandaPrinterContenido(id, val){
  const p = ensureComandaPrinters().find(x=>x.id==id); if(!p) return;
  p.contenido = val;
  saveDB();
}
function addComandaPrinter(contenido){
  const printers = ensureComandaPrinters();
  const c = ['comida', 'bebida', 'todo'].includes(contenido) ? contenido : 'todo';
  const nombre = c === 'comida' ? t('mn.comandas.defaultKitchen') : c === 'bebida' ? gl({es:'Barra', ca:'Barra', en:'Bar'}) : t('mn.comandas.newPrinterName');
  printers.push({id: genId(), nombre, activo:true, anchoTicket:80, contenido:c});
  saveDB();
  renderMiNegocio();
}
async function deleteComandaPrinter(id){
  if(!(await confirmModal(t('msg.confirmDeletePrinter')))) return;
  DB.business.comandas.printers = ensureComandaPrinters().filter(p=>p.id!=id);
  if(typeof forgetThermalPrinter === 'function') forgetThermalPrinter(id);
  saveDB();
  renderMiNegocio();
}
// Versión en texto plano del vale de comanda, para la impresora térmica por
// Bluetooth (textToEscPos espera texto, no HTML) — mismo contenido que la
// versión HTML de abajo, con el mismo ancho en caracteres que ya usa el
// ticket de cliente para 58/80mm (ver buildTicketText).
function buildComandaText(destino, titulo, lineas, alergenos, anchoTicket){
  const width = anchoTicket == 58 ? 32 : 42;
  const hora = new Date().toLocaleTimeString(localeActual(), {hour:'2-digit', minute:'2-digit'});
  const center = s => { const pad = Math.max(0, Math.floor((width - s.length) / 2)); return ' '.repeat(pad) + s; };
  const lines = [];
  lines.push(center(destino.toUpperCase()));
  lines.push('-'.repeat(width));
  lines.push(`${titulo} · ${hora}`);
  if(alergenos){ lines.push('-'.repeat(width)); lines.push('! ' + alergenos.toUpperCase()); }
  lines.push('-'.repeat(width));
  lineas.forEach(l => {
    lines.push(`${l.qty}x ${l.name}`);
    if(l.notas) lines.push(`  > ${l.notas}`);
  });
  return lines.join('\n');
}
// Imprime un vale de comanda (cocina, sala, barra...) con las líneas marchadas.
// Si esta impresora tiene una impresora térmica Bluetooth emparejada
// (getThermalPrinterName), se envía directamente ahí sin pasar por el
// diálogo de impresión del navegador; si no, se abre la ventana de siempre.
function printComandaTicket(destino, titulo, lineas, anchoTicket, alergenos, printerId, opts){
  if(!lineas || !lineas.length) return;
  const ancho = anchoTicket == 58 ? 58 : 80;
  const hora = new Date().toLocaleTimeString(localeActual(), {hour:'2-digit', minute:'2-digit'});
  const filas = lineas.map(l => `<div style="font-size:15px;font-weight:700;margin-bottom:3px">${escapeHtml(l.qty)}× ${escapeHtml(l.name)}</div>${l.notas?`<div style="font-size:12px;margin:0 0 4px 10px">▸ ${escapeHtml(l.notas)}</div>`:''}`).join('');
  // Alérgenos de la mesa (independiente de cualquier cliente vinculado): se
  // imprime destacado arriba del todo, en grande, para que no pase
  // desapercibido entre las líneas del pedido.
  const alergenosHtml = alergenos ? `<div style="border:2px solid #000;padding:4px 6px;margin-bottom:6px;font-weight:700;font-size:14px;text-align:center">⚠ ${escapeHtml(alergenos)}</div>` : '';
  const cuerpo = `<div style="text-align:center;font-weight:700;font-size:16px;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:6px">${escapeHtml(destino)}</div>
      <div style="font-size:13px;margin-bottom:6px">${escapeHtml(titulo)} · ${escapeHtml(hora)}</div>
      ${alergenosHtml}
      ${filas}`;
  // Bluetooth solo si este puesto lo tiene elegido Y hay una impresora
  // emparejada: sin emparejar, la comanda sale por el navegador como
  // siempre, en vez de abrir un selector de dispositivos en mitad del
  // servicio. Todo lo demás (iPad, Firefox, impresora de red/USB/AirPrint)
  // va por el navegador con el formato de rollo (@page 80/58 mm).
  const id = printerId || 'comanda';
  const usarBt = printerId && getPrintMode(printerId) === 'bluetooth' && getThermalPrinterName(printerId);
  if(usarBt){
    // noPrompt (salvo en la prueba, que es un botón): las comandas salen solas al marchar y, tras recargar la app, la conexión Bluetooth
    // se pierde; abrir el selector de dispositivos en mitad del servicio (sin gesto, falla y además interrumpe) era el comportamiento
    // que `noPrompt` debía evitar y que nadie pasaba (2/11).
    printToThermalPrinter(buildComandaText(destino, titulo, lineas, alergenos, ancho), id, {ancho, html: cuerpo, titulo, noPrompt: !(opts && opts.interactivo)});
    return;
  }
  printViaBrowser(cuerpo, ancho, titulo, {html: true});
}
function testComandaPrint(printerId){
  const sample = [{qty:2, name:'Ejemplo de plato', notas:'sin sal', bebida:false}, {qty:1, name:'Ejemplo de bebida', bebida:true}];
  let printer = printerId ? ensureComandaPrinters().find(p=>p.id==printerId) : null;
  if(!printer) printer = {nombre:'COCINA', anchoTicket:80, contenido:'todo'};
  const lineas = printer.contenido==='todo' ? sample : sample.filter(l => printer.contenido==='comida' ? !l.bebida : l.bebida);
  if(!lineas.length){ showToast(t('mn.comandas.testNoLines')); return; }
  printComandaTicket(printer.nombre, 'Mesa de prueba', lineas, printer.anchoTicket, null, printer.id, {interactivo: true});
}

// Se guarda al instante al marcar/desmarcar (no espera a "Guardar todo"),
// igual que los tipos de servicio: es un interruptor suelto y esperar a otro
// botón para que tenga efecto confunde.
function saveCashDrawerSetting(enabled){
  DB.business.cashDrawerOnSale = !!enabled;
  saveDB();
  renderMiNegocio();
  showToast(t(enabled ? 'drawer.enabled' : 'drawer.disabled'));
}

// Qué IVA lleva HOY cada producto de las cartas y menús (el tipo de cada plato se elige en Oferta / Escandallo). Sirve para ver de un
// vistazo que hay comida al 10 %, alguna cosa al 21 %… y para avisar de lo que no tiene tipo y caería en el IVA por defecto de abajo.
function ivaResumenProductosHtml(){
  const cuenta = {}; let sin = 0;
  const suma = p => { if(!p) return; if(p.ivaPct == null || p.ivaPct === '') sin++; else cuenta[p.ivaPct] = (cuenta[p.ivaPct] || 0) + 1; };
  (DB.cartas || []).forEach(c => (c.secciones || []).forEach(sec => (sec.platos || []).forEach(suma)));
  (DB.menus || []).forEach(suma);
  const tipos = Object.keys(cuenta).map(Number).sort((a, b) => b - a);
  if(!tipos.length && !sin) return '';
  const chips = tipos.map(r => `<span class="tk-iva-chip"><b>${r} %</b> · ${cuenta[r]} ${escapeHtml(gl({es: cuenta[r] === 1 ? 'producto' : 'productos', ca: cuenta[r] === 1 ? 'producte' : 'productes', en: cuenta[r] === 1 ? 'product' : 'products'}))}</span>`).join('');
  return `<div class="tk-iva-resumen">
    <div class="tk-iva-tit">${escapeHtml(gl({es:'IVA de tus productos', ca:'IVA dels teus productes', en:'VAT on your products'}))}</div>
    <div class="tk-iva-chips">${chips}${sin ? `<span class="tk-iva-chip falta"><b>${escapeHtml(gl({es:'Sin tipo', ca:'Sense tipus', en:'No rate'}))}</b> · ${sin}</span>` : ''}</div>
    <p class="txt-xs" style="color:var(--muted);margin:6px 0 0">${escapeHtml(gl({es:'Cada producto lleva su IVA (se elige en Oferta); el ticket y la contabilidad separan cada tipo. Un cambio de IVA en un plato no toca las ventas ya cobradas.', ca:'Cada producte porta el seu IVA (es tria a Oferta); el tiquet i la comptabilitat separen cada tipus. Un canvi d\'IVA en un plat no toca les vendes ja cobrades.', en:'Every product carries its own VAT (set in Offer); the receipt and the books keep each rate apart. Changing a dish\'s VAT does not touch sales already charged.'}))}${sin ? ' ' + escapeHtml(gl({es:'Los que no tienen tipo usan el IVA por defecto de abajo.', ca:'Els que no tenen tipus fan servir l\'IVA per defecte d\'avall.', en:'Those without a rate use the default VAT below.'})) : ''}</p>
  </div>`;
}

function saveTicketConfig(){
  // ⚠️ `parseFloat(...) || 0` solo descarta NaN, no un negativo ni uno por
  // encima de 100 — los atributos HTML min/max del campo no bloquean este
  // botón, así que un -100 guardado tal cual quedaba como ivaPct real. El
  // desglose fiscal que usa este IVA general (líneas sin tipo propio) hace
  // bruto / (1 + tipo/100): con -100 eso es una división por cero.
  // Hallazgo de una auditoría externa.
  const ivaPct = parseFloat(document.getElementById('tk-iva').value);
  if(!isFinite(ivaPct) || ivaPct < 0 || ivaPct > 100){
    showToast(t('msg.invalidTicketIva'));
    document.getElementById('tk-iva').focus();
    return;
  }
  // El IVA de bebidas es opcional: vacío = el mismo que el de comida.
  const bebRaw = (document.getElementById('tk-iva-bebidas') || {}).value;
  const ivaBebidasPct = (bebRaw === '' || bebRaw == null) ? null : parseFloat(bebRaw);
  if(ivaBebidasPct != null && (!isFinite(ivaBebidasPct) || ivaBebidasPct < 0 || ivaBebidasPct > 100)){
    showToast(t('msg.invalidTicketIva'));
    document.getElementById('tk-iva-bebidas').focus();
    return;
  }
  DB.business.ticket = {
    pie: document.getElementById('tk-pie').value.trim(),
    mostrarDireccion: document.getElementById('tk-direccion').checked,
    mostrarTelefono: document.getElementById('tk-telefono').checked,
    mostrarWeb: document.getElementById('tk-web').checked,
    mostrarNif: document.getElementById('tk-nif').checked,
    mostrarResenaQr: document.getElementById('tk-review-qr').checked,
    ivaPct,
    ivaBebidasPct
  };
  saveDB();
  renderMiNegocio();
  showToast(t('msg.ticketConfigSaved'));
}

// Cambiar el PIN de Gestión es tan sensible como cualquier otra acción
// protegida esta sesión (borrar cliente, ingrediente...): exige el PIN
// actual antes de aceptar uno nuevo, no basta con tener Gestión ya abierta.
// Antes esto se guardaba aparte (DB.settingsLog) sin ninguna pantalla que
// lo mostrara — quedaba registrado pero invisible. Ahora pasa por el
// mismo Registro de auditoría que todo lo demás (Mi Negocio → Registro de
// auditoría), marcado en rojo por tratarse de un ajuste sensible.
function logBusinessSettingChange(desc){
  logAudit('setting_change', desc, 'critical');
}

function changeOwnerPin(){
  const n1 = document.getElementById('mn-pin-new').value;
  const n2 = document.getElementById('mn-pin-new2').value;
  if(!/^\d{4}$/.test(n1)){ showToast(t('msg.pinMustBe4')); return; }
  if(n1 !== n2){ showToast(t('msg.pinsDontMatch')); return; }
  if(DB.business.pinSet && pinDeNegocioCoincide(n1)){ showToast(t('msg.pinSameAsOld')); return; }
  const WEAK_PINS = ['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','1212','2580','0123'];
  const isWeak = WEAK_PINS.includes(n1);
  requestBusinessPinAction(t('title.changeOwnerPin'), t('msg.confirmCurrentPin'), () => {
    DB.business.pin = hashPin(n1, codigoNegocioParaPin());
    DB.business.pinSet = true;
    logBusinessSettingChange('PIN del negocio cambiado');
    saveDB();
    renderMiNegocio();
    showToast(isWeak ? t('msg.pinTooWeak') : t('msg.pinUpdated'));
  });
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  await dbReadyPromise;
  if(isAccessSessionExpiredByInactivity()) clearAccessSession('inactividad');
  // Cualquier interacción cuenta como actividad, para que la sesión no
  // caduque mientras el dispositivo se está usando de verdad.
  ['pointerdown','keydown'].forEach(evt => document.addEventListener(evt, recordAccessActivity, {passive:true}));
  document.addEventListener('visibilitychange', () => { if(!document.hidden && isAccessSessionExpiredByInactivity()){ clearAccessSession('inactividad'); location.reload(); } });
  // Pide al navegador que NO borre los datos del aparato si le falta sitio o pasan días sin abrirla (Safari los purga a los 7 días):
  // un borrado así deja sin sesión, sin licencia y sin datos locales, y se ve como un login «que no toca».
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  renderHeader();
  initCloud();
  syncPublicMirror();
  initPublicRequestsListener();
  applyHelpI18n();
  updateChatBadge();
  let initial = (location.hash || '#home').replace('#','');
  // Sin sesión válida (caducada por inactividad, o borrada), la pantalla de ENTRADA manda: abrir aquí la pantalla de la dirección guardada
  // (#promocion…) disparaba el candado de área y salía un PIN de «Sala»/«Cocina» ENCIMA de la entrada, que sale 1,8 s después. Se leía como un
  // login doble que aparece solo. Tras identificarse se llega a Inicio, como siempre.
  if(!getAccessSession()) initial = 'home';
  if(MODULE_FOLDER[initial]) currentFolder = MODULE_FOLDER[initial];
  navigate(initial === 'folder' && !currentFolder ? 'home' : initial);
  applyI18n();
  if(getLicense()){ checkLicenseRevocation(); aplicarEnlaceFijado(); }

  setInterval(() => {
    const active = document.querySelector('.view.active');
    if(active && active.id === 'view-comandascocina') renderComandasCocina();
  }, 3000);

  updateAutoActiveCarta();
  updateAutoActiveMenu();
  setInterval(() => {
    updateAutoActiveCarta(); updateAutoActiveMenu(); purgePaidOrders();
    if(typeof avisosPintar === 'function') avisosPintar();   // cambia el día: cumpleaños, mantenimientos vencidos…
    if(typeof marcharPedidosProgramadosQueYaTocan === 'function') marcharPedidosProgramadosQueYaTocan();
  }, 60000);

  setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if(splash) splash.classList.add('hide');
    // La pantalla de "Acceso Empleados / Acceso Propietarios" es siempre lo
    // primero que se ve al abrir la app sin sesión activa, haya o no un
    // negocio ya configurado en este dispositivo: activar la licencia por
    // primera vez es simplemente lo que pide "Acceso Propietarios" cuando
    // todavía no hay ninguna. Sustituye tanto al viejo selector automático
    // de negocios como al "cualquiera puede tocar Cocina/Sala sin
    // identificarse".
    const session = getAccessSession();
    if(session && session.type === 'employee' && resumeEmployeeSession()) return;
    if(session && session.type === 'owner'){
      applyOwnerSessionEditRights();
      // Puede que quedara algún paso de la configuración inicial a medias
      // (p.ej. se cerró la pestaña justo tras activar la licencia, antes de
      // terminar de configurar la nube) — se retoma automáticamente.
      continuePendingOwnerSetup();
      return;
    }
    showAccessSelectScreen();
  }, 1800);

  // Si hay cambios pendientes de subir a la nube (agrupados) y el usuario
  // cierra la pestaña o cambia de app, los enviamos ya mismo para no perderlos.
  const flushPendingSync = () => {
    if(cloudSyncTimer) flushCloudSync();
    if(publicMirrorSyncTimer){ clearTimeout(publicMirrorSyncTimer); syncPublicMirror(); }
  };
  window.addEventListener('beforeunload', flushPendingSync);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden') flushPendingSync();
  });
});
