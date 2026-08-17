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
  return DB.recipes.filter(r => (r.area||'cocina') === currentArea() && r.name)
    .map(r => ({name: r.name, allergens: [...recipeAllergens(r)]}))
    .filter(d => d.allergens.length)
    .sort((a,b) => a.name.localeCompare(b.name));
}
function renderLimpiezaAlergenos(){
  const box = document.getElementById('limpieza-tab-content');
  const dishes = getAllDishAllergens();
  box.innerHTML = `
    <div class="card">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.dishAllergensOverview')}</h3>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('msg.dishAllergensOverviewDesc')}</p>
      ${dishes.length ? `<div class="table-wrap"><table>
        <thead><tr><th>${t('label.dishElaboration')}</th><th>${t('label.allergensPresent')}</th></tr></thead>
        <tbody>${dishes.map(d => `<tr><td>${escapeHtml(d.name)}</td><td class="wrap">${d.allergens.map(a=>`<span class="badge badge-amber">${escapeHtml(a)}</span>`).join(' ')}</td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty" style="padding:14px">${t('empty.noDishesForAllergens')}</div>`}
    </div>
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
let limpiezaMonthOffset = 0;

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
function quarterKey(fecha){
  const d = new Date(fecha);
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`;
}
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

function renderLimpieza(){
  ensureLimpiezaData();
  const isSala = currentArea()==='sala';
  const titleEl = document.querySelector('#view-limpieza .view-title');
  const subtitleEl = document.querySelector('#view-limpieza .view-subtitle');
  if(titleEl) titleEl.textContent = isSala ? t('view.limpieza.title.sala') : t('view.limpieza.title');
  if(subtitleEl) subtitleEl.textContent = isSala ? t('view.limpieza.subtitle.sala') : t('view.limpieza.subtitle');
  const box = document.getElementById('limpieza-content');
  box.innerHTML = `
    <nav class="ge-tab-row">
      ${LIMPIEZA_TABS.map(tb => `<button class="ge-tab ${limpiezaTab===tb?'active':''}" onclick="setLimpiezaTab('${tb}')">${limpiezaTabLabel(tb)}</button>`).join('')}
    </nav>
    <div id="limpieza-tab-content"></div>
  `;
  renderLimpiezaTab();
}
function setLimpiezaTab(tab){ limpiezaTab = tab; renderLimpieza(); }
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
}

function renderLimpiezaManos(){
  const box = document.getElementById('limpieza-tab-content');
  const pasos = limpiezaManosPasos();
  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3 style="justify-content:space-between"><span><i class="ti ti-droplet"></i> ${t('title.handWashingProtocol')}</span><button class="btn btn-sm" onclick="printManosProtocolo()"><i class="ti ti-printer"></i></button></h3>
        ${pasos.map((p,i) => `
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            <div class="step-num">${i+1}</div>
            <input type="text" value="${escapeHtml(p)}" style="flex:1" onchange="updateManosPaso(${i}, this.value)" ${editUnlocked?'':'disabled'}>
            <button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="removeManosPaso(${i})" ${pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
          </div>
        `).join('')}
        <button class="owner-strict btn btn-sm" onclick="addManosPaso()"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
        <button class="owner-strict btn btn-sm btn-secondary" style="margin-left:8px" onclick="resetManosPasos()"><i class="ti ti-restore"></i> ${t('btn.resetToDefault')}</button>
      </div>
      <div>
        <div class="card">
          <h3>⏰ ${t('title.whenToWashHands')}</h3>
          <ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:2">
            <li>${t('li.startingWork')}</li>
            <li>${t('li.afterHandlingWaste')}</li>
            <li>${t('li.afterTouchingFaceHair')}</li>
            <li>${t('li.afterUsingRestroom')}</li>
            <li>${t('li.rawToCookedProduct')}</li>
            <li>${t('li.afterEatingSmoking')}</li>
          </ul>
        </div>
        <div class="card">
          <h3><i class="ti ti-check"></i> ${t('title.minimumDuration')}</h3>
          <p style="font-size:28px;font-weight:800;color:var(--brand-orange);margin:0">${t('label.20seconds')}</p>
          <p style="font-size:13px;color:var(--muted);margin-top:4px">${t('msg.happyBirthdayEquivalent')}</p>
        </div>
      </div>
    </div>
  `;
}
function resetManosPasos(){ DB.limpieza.manosPasos[currentArea()] = [...getLimpiezaDefaultManos()]; saveDB(); renderLimpiezaManos(); showToast(t('msg.stepsReset')); }
function updateManosPaso(i, val){ limpiezaManosPasos()[i] = val; saveDB(); }
function addManosPaso(){ limpiezaManosPasos().push(t('label.newStep')); saveDB(); renderLimpiezaManos(); }
function removeManosPaso(i){
  const pasos = limpiezaManosPasos();
  if(pasos.length<=1) return;
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  pasos.splice(i,1);
  saveDB();
  renderLimpiezaManos();
}
function renderLimpiezaProtocolo(){
  const box = document.getElementById('limpieza-tab-content');
  const ap = limpiezaProtocoloPasos('apertura');
  const ci = limpiezaProtocoloPasos('cierre');
  const renderBlock = (title, icon, pasos, type) => {
    const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
    const log = (DB.limpieza[logKey] || []).filter(e => (e.area||'cocina')===currentArea());
    const logEntries = [...log].reverse().slice(0, 5);
    return `
    <div class="card">
      <h3 style="justify-content:space-between"><span><i class="ti ti-${icon}"></i> ${title}</span><button class="btn btn-sm" onclick="printProtocolo('${type}')"><i class="ti ti-printer"></i></button></h3>
      ${pasos.map((p,i) => `
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <div class="step-num">${i+1}</div>
          <input type="text" value="${escapeHtml(p)}" style="flex:1" onchange="updateProtocoloPaso('${type}',${i},this.value)" ${editUnlocked?'':'disabled'}>
          <div class="owner-strict" style="display:flex;gap:2px">
            ${reorderButtons(`moveProtocoloPaso('${type}',${i},-1)`, `moveProtocoloPaso('${type}',${i},1)`, i===0, i===pasos.length-1)}
          </div>
          <button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="removeProtocoloPaso('${type}',${i})" ${pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
        </div>
      `).join('')}
      <button class="owner-strict btn btn-sm" onclick="addProtocoloPaso('${type}')"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
      <button class="owner-strict btn btn-sm btn-secondary" style="margin-left:8px" onclick="resetProtocoloPasos('${type}')"><i class="ti ti-restore"></i> ${t('common.reset')}</button>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase">${t('title.dailyCompliance')}</div>
        <div style="margin-bottom:10px">
          <button class="btn btn-sm btn-primary" onclick="registerProtocoloCompliance('${type}')"><i class="ti ti-check"></i> ${t('btn.registerToday')}</button>
          <p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">${t('msg.complianceRegistersYou')}</p>
        </div>
        ${logEntries.length ? `<div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow:auto">${logEntries.map(entry => {
          // responsableNombre es una foto fija de quién lo registró en ese
          // momento (por sesión, no elegido a mano); se conserva aunque esa
          // persona se renombre o se borre luego. Entradas antiguas (antes
          // de este cambio) solo tenían responsableId, así que se resuelve
          // el nombre por si acaso para no perder el dato ya guardado.
          const respName = entry.responsableNombre || (entry.responsableId ? (DB.employees.find(e=>e.id===entry.responsableId)||{}).name : null);
          return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px">
            <span><i class="ti ti-check" style="color:var(--green)"></i> ${escapeHtml(entry.fecha)} · ${escapeHtml(entry.hora)}${respName?` · ${escapeHtml(respName)}`:''}</span>
            <button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="deleteProtocoloComplianceEntry('${type}',${entry.id})"><i class="ti ti-trash"></i></button>
          </div>`;
        }).join('')}</div>` : `<div style="font-size:12px;color:var(--muted)">${t('empty.noComplianceLog')}</div>`}
      </div>
    </div>`;
  };
  box.innerHTML = `<div class="grid grid-2">${renderBlock(t('title.openingProtocol'),'sunrise',ap,'apertura')}${renderBlock(t('title.closingProtocol'),'sunset',ci,'cierre')}</div>`;
}
function _protocoloKey(type){ return type==='apertura' ? 'aperturaPasos' : 'cierrePasos'; }
function updateProtocoloPaso(type,i,val){ limpiezaProtocoloPasos(type)[i] = val; saveDB(); }
function moveProtocoloPaso(type,i,dir){
  moveArrayItem(limpiezaProtocoloPasos(type), i, dir);
  saveDB();
  renderLimpiezaProtocolo();
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
  const now = new Date();
  const authorId = getChatAuthor();
  DB.limpieza[logKey].push({
    id: genId(), fecha: todayStr(), hora: now.toTimeString().slice(0,5),
    responsableId: authorId==='owner' ? null : authorId,
    responsableNombre: getChatAuthorName(authorId),
    area: currentArea()
  });
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
function addProtocoloPaso(type){ limpiezaProtocoloPasos(type).push(t('label.newStep')); saveDB(); renderLimpiezaProtocolo(); }
function removeProtocoloPaso(type,i){
  const pasos = limpiezaProtocoloPasos(type);
  if(pasos.length<=1) return;
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  pasos.splice(i,1);
  saveDB();
  renderLimpiezaProtocolo();
}
function resetProtocoloPasos(type){
  const area = currentArea();
  const isSala = area === 'sala';
  DB.limpieza[_protocoloKey(type)][area] = [...(type==='apertura' ? (isSala?getLimpiezaDefaultAperturaSala():getLimpiezaDefaultApertura()) : (isSala?getLimpiezaDefaultCierreSala():getLimpiezaDefaultCierre()))];
  saveDB(); renderLimpiezaProtocolo(); showToast(t('msg.stepsReset'));
}
function printProtocolo(type){
  const pasos = limpiezaProtocoloPasos(type);
  const title = type==='apertura' ? t('title.openingProtocol') : t('title.closingProtocol');
  const body = `
    ${printReportHeaderHtml(title)}
    <ul class="pr-steps">${pasos.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
  `;
  printReportWindow(title, body);
}
function printManosProtocolo(){
  const pasos = limpiezaManosPasos();
  const title = t('title.handWashingProtocol');
  const body = `
    ${printReportHeaderHtml(title)}
    <ul class="pr-steps">${pasos.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
  `;
  printReportWindow(title, body);
}

function deleteLimpiezaTarea(id){
  if(!confirm(t('msg.confirmDeleteTask'))) return;
  DB.limpieza.tareas = DB.limpieza.tareas.filter(t => t.id!==id);
  saveDB();
  renderLimpiezaTab();
}

function renderLimpiezaMes(){
  const box = document.getElementById('limpieza-tab-content');
  const tareasMes = DB.limpieza.tareas.filter(t => t.tipo === 'mensual' && (t.zona||'cocina')===currentArea());
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + limpiezaMonthOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const checks = DB.limpieza.checksMes[monthKey];

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay()+6)%7; // Lunes = 0
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Capturadas fuera del bucle: dentro de tareasDelDia.map(t => ...) el
  // parámetro "t" es la tarea (nombre ya usado en todo este módulo), y tapa
  // a la función global de traducción t() — llamarla ahí dentro fallaba
  // con "t is not a function".
  const doneOnLabel = t('limpieza.doneOn');
  const notYourTaskLabel = t('limpieza.notYourTask');

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const tareasDelDia = tareasMes.filter(t => parseInt(t.diaMes)===day);
    const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
    cells += `
      <div class="card" style="padding:8px;${isToday?'border-color:var(--brand-orange)':''}">
        <div style="font-weight:700;margin-bottom:4px">${day}</div>
        ${tareasDelDia.map(t => {
          const resp = t.responsableId ? DB.employees.find(e=>e.id===t.responsableId) : null;
          const info = limpiezaCheckInfo(checks, t.id);
          const canToggle = canToggleLimpiezaTarea(t);
          const doneTitle = info ? `${doneOnLabel.replace('${date}', escapeHtml(info.fecha||''))} ${escapeHtml(info.hora||'')}${info.checkedByNombre?` · ${escapeHtml(info.checkedByNombre)}`:''}` : (canToggle ? '' : notYourTaskLabel);
          return `
          <div style="margin-bottom:4px;cursor:pointer" onclick="openLimpiezaTareaMesModal(${t.id})">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:${canToggle?'pointer':'not-allowed'}" onclick="event.stopPropagation()" title="${doneTitle}">
              <input type="checkbox" ${info?'checked':''} ${canToggle?'':'disabled'} onchange="toggleLimpiezaCheckMes('${monthKey}',${t.id},this.checked)">
              <span style="${info?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(t.area)}</span>
            </label>
            ${resp ? `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--muted);margin-left:20px"><span style="width:8px;height:8px;border-radius:50%;background:${resp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>${escapeHtml(resp.name)}</div>` : ''}
          </div>
        `;}).join('')}
      </div>
    `;
  }

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="limpiezaMonthOffset--;renderLimpiezaMes()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="limpiezaMonthOffset=0;renderLimpiezaMes()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="limpiezaMonthOffset++;renderLimpiezaMes()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${monthFull(month)} ${year}</strong>
      </div>
      <button class="owner-strict btn btn-sm btn-primary" onclick="openLimpiezaTareaMesModal()"><i class="ti ti-plus"></i> ${t('btn.addTask')}</button>
    </div>
    ${tareasMes.length ? `
    <div class="grid" style="grid-template-columns:repeat(7,1fr);gap:6px">
      ${t('days.short').map(d=>`<div style="text-align:center;font-size:12px;font-weight:700;color:var(--muted)">${d}</div>`).join('')}
      ${cells}
    </div>` : `<div class="empty"><i class="ti ti-calendar-month"></i>${t('empty.noMonthlyCleaningTasks')}</div>`}
  `;
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
function toggleLimpiezaCheckMes(monthKey, tareaId, val){
  const tarea = DB.limpieza.tareas.find(x => x.id === tareaId);
  if(tarea && !canToggleLimpiezaTarea(tarea)){ showToast(t('limpieza.notYourTaskToast')); renderLimpiezaMes(); return; }
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  // Quién lo marca lo dice la sesión, no un campo a elegir — igual que el
  // registro de cumplimiento del protocolo de apertura/cierre.
  const authorId = getChatAuthor();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5), checkedByNombre: getChatAuthorName(authorId)} : null;
  saveDB();
  renderLimpiezaMes();
}
function toggleLimpiezaCheckMesFromDist(monthKey, tareaId, val){
  const tarea = DB.limpieza.tareas.find(x => x.id === tareaId);
  if(tarea && !canToggleLimpiezaTarea(tarea)){ showToast(t('limpieza.notYourTaskToast')); renderDistDetail(); return; }
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  const authorId = getChatAuthor();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5), checkedByNombre: getChatAuthorName(authorId)} : null;
  saveDB();
  renderDistDetail();
}

function openLimpiezaTareaMesModal(id){
  const tarea = id ? DB.limpieza.tareas.find(x=>x.id===id) : null;
  const empOptions = DB.employees.filter(e=>(e.area||'cocina')===currentArea()).map(e=>`<option value="${e.id}"${tarea&&tarea.responsableId===e.id?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <h3>${tarea?t('common.edit'):t('common.newF')} ${t('limpieza.monthlyTask')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('limpieza.areaOrTask')}</label>
      <input type="text" id="new-limpieza-area" value="${tarea?escapeHtml(tarea.area):''}" placeholder="${currentArea()==='sala' ? t('limpieza.areaPhSala') : t('limpieza.areaPhCocina')}">
    </div>
    <div class="field">
      <label>${t('limpieza.cleaningProduct')}</label>
      <input type="text" id="new-limpieza-producto" value="${tarea?escapeHtml(tarea.producto||''):''}" placeholder="${t('limpieza.productPh')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('limpieza.dayOfMonth')}</label>
        <input type="number" id="new-limpieza-diames" min="1" max="31" value="${tarea?tarea.diaMes:1}">
      </div>
      <div class="field">
        <label>${t('label.responsible')}</label>
        <select id="new-limpieza-responsable">
          <option value="">${t('common.unassigned')}</option>
          ${empOptions}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      ${tarea ? `<button class="owner-strict btn btn-danger" onclick="deleteLimpiezaTarea(${tarea.id});closeModal()">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmLimpiezaTareaMes(${tarea?tarea.id:'null'})">${tarea?t('common.save'):t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-limpieza-area')?.focus(), 50);
}
function confirmLimpiezaTareaMes(id){
  const area = document.getElementById('new-limpieza-area').value;
  if(!area || !area.trim()){ showToast(t('msg.writeAreaTask')); return; }
  const producto = document.getElementById('new-limpieza-producto').value || '';
  let dia = parseInt(document.getElementById('new-limpieza-diames').value) || 1;
  dia = Math.min(31, Math.max(1, dia));
  const responsableVal = document.getElementById('new-limpieza-responsable').value;
  const responsableId = responsableVal ? parseInt(responsableVal) : null;
  if(id){
    const tarea = DB.limpieza.tareas.find(x=>x.id===id);
    Object.assign(tarea, {area: area.trim(), producto: producto.trim(), diaMes: dia, responsableId});
  } else {
    // Ojo: "area" aquí es el campo de texto libre ("Campana extractora"...);
    // el área de negocio (cocina/sala) se guarda aparte como zona, para poder
    // filtrar sin chocar con ese nombre de campo ya existente.
    DB.limpieza.tareas.push({id: genId(), area: area.trim(), producto: producto.trim(), tipo:'mensual', diaMes: dia, responsableId, zona: currentArea()});
  }
  saveDB();
  closeModal();
  renderLimpiezaTab();
}

function renderLimpiezaLog(key){
  const box = document.getElementById('limpieza-tab-content');
  const cfg = limpiezaLogConfig(key);
  const entries = DB.limpieza[key].filter(e => (e.zona||'cocina')===currentArea());

  // "Responsable" ya no se escribe/elige a mano: lo dice la sesión con la
  // que se ha entrado (igual que el cumplimiento de apertura/cierre), así
  // que ni siquiera aparece como campo del formulario — se rellena solo al
  // guardar y se ve en la tabla como cualquier otro dato ya registrado.
  const formFields = cfg.fields.filter(f => f !== 'responsable').map((f) => {
    const i = cfg.fields.indexOf(f);
    let input;
    if(f === 'estado' && key === 'temperaturas') input = `<div style="font-size:12px;color:var(--muted);padding-top:8px">${t('label.autoCalculated')}</div>`;
    else if(f === 'estado') input = `<select id="lp-${key}-${f}"><option value="OK">OK</option><option value="NOK">No OK</option></select>`;
    else if(f === 'tipo' && key === 'temperaturas') input = `<select id="lp-${key}-${f}">${limpiezaTempTipoOptions().map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`;
    else if(f === 'fecha') input = `<input type="date" id="lp-${key}-${f}" value="${todayStr()}" max="${todayStr()}">`;
    else if(f === 'proxima' && key === 'plagas') input = `<input type="date" id="lp-${key}-${f}">`;
    else if(f === 'hora') input = `<input type="time" id="lp-${key}-${f}">`;
    else if(f === 'temp' && key === 'temperaturas') input = `<input type="number" step="0.1" min="-60" max="300" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    else input = `<input type="text" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    return `<div class="field" style="margin-bottom:0"><label>${cfg.labels[i]}</label>${input}</div>`;
  }).join('');

  const rows = entries.length ? [...entries].slice().reverse().map(e => `
    <tr>${cfg.fields.map(f => {
      if(f === 'estado'){
        if(e[f]==='OK') return `<td style="font-weight:700;color:var(--green)"><i class="ti ti-check"></i> OK</td>`;
        if(e[f]==='NOK') return `<td style="font-weight:700;color:var(--red)"><i class="ti ti-x"></i> No OK</td>`;
        return `<td style="color:var(--muted)"><i class="ti ti-info-circle"></i> ${t('status.notEvaluated')}</td>`;
      }
      if(f === 'tipo' && key === 'temperaturas') return `<td>${escapeHtml(limpiezaTempTipoLabel(e[f]))}</td>`;
      if(f === 'proxima' && key === 'plagas'){
        if(!e.proxima) return `<td>—</td>`;
        const due = limpiezaMantenimientoDueStatus({proximo: e.proxima});
        return `<td>${escapeHtml(e.proxima)}${due==='overdue'?` <span class="badge badge-red" style="white-space:nowrap"><i class="ti ti-alert-triangle"></i> ${t('badge.overdue')}</span>`:''}${due==='soon'?` <span class="badge badge-amber" style="white-space:nowrap"><i class="ti ti-clock"></i> ${t('badge.dueSoon')}</span>`:''}</td>`;
      }
      return `<td>${escapeHtml(String(e[f]||'—'))}</td>`;
    }).join('')}<td><button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="deleteLimpiezaLogEntry('${key}',${e.id})"><i class="ti ti-trash"></i></button></td></tr>
  `).join('') : `<tr><td colspan="${cfg.fields.length+1}"><div class="empty" style="padding:14px">${t('empty.noLogEntries')}</div></td></tr>`;

  // El control de temperaturas es una tarea operativa normal del día a día
  // (mirar la cámara, anotar el grado) que puede hacer cualquier empleado
  // de cocina, no una acción sensible que exija permiso de editar — a
  // diferencia de borrar un registro ya hecho, que sí sigue exigiéndolo
  // (no se toca un registro de seguridad alimentaria ya escrito sin más).
  const canAddThisLog = editUnlocked || key === 'temperaturas';
  box.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      ${canAddThisLog ? `
      <div class="grid grid-3" style="margin-bottom:10px">${formFields}</div>
      <button class="btn btn-primary" onclick="addLimpiezaLogEntry('${key}')"><i class="ti ti-plus"></i> ${t('common.register')}</button>
      ` : `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-lock"></i> ${t('msg.editModeRequiredForLog')}</div>`}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${cfg.labels.map(l=>`<th>${l}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
function addLimpiezaLogEntry(key){
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
    if(!isNaN(tempVal) && (tempVal < -60 || tempVal > 300) && !confirm(t('msg.confirmExtremeTemp').replace('${temp}', tempVal))) return;
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
  renderLimpiezaLog(key);
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
    renderLimpiezaLog(key);
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
function renderLimpiezaMantenimiento(){
  const box = document.getElementById('limpieza-tab-content');
  const equipos = DB.limpieza.mantenimiento.filter(e => (e.zona||'cocina')===currentArea());
  box.innerHTML = `
    <div class="toolbar">
      <div class="left"></div>
      <button class="owner-strict btn btn-primary" onclick="addMantenimientoEquipo()"><i class="ti ti-plus"></i> ${t('btn.addEquipment')}</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('label.equipment')}</th><th>${t('label.lastMaintenance')}</th><th>${t('label.next')}</th><th>${t('label.responsible')}</th><th>${t('label.status')}</th><th>${t('th.notes')}</th><th></th></tr></thead>
        <tbody>${equipos.length ? equipos.map(e => {
          const due = limpiezaMantenimientoDueStatus(e);
          return `
          <tr>
            <td><strong>${escapeHtml(e.nombre)}</strong></td>
            <td><input type="date" value="${e.ultimo||''}" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'ultimo',this.value)" ${editUnlocked?'':'disabled'}></td>
            <td>
              <input type="date" value="${e.proximo||''}" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'proximo',this.value)" ${editUnlocked?'':'disabled'}>
              ${due==='overdue' ? `<span class="badge badge-red" style="margin-left:4px;white-space:nowrap"><i class="ti ti-alert-triangle"></i> ${t('badge.overdue')}</span>` : ''}
              ${due==='soon' ? `<span class="badge badge-amber" style="margin-left:4px;white-space:nowrap"><i class="ti ti-clock"></i> ${t('badge.dueSoon')}</span>` : ''}
            </td>
            <td><input type="text" value="${escapeHtml(e.responsable||'')}" placeholder="—" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px;width:100px" onchange="updateMantenimientoEquipo(${e.id},'responsable',this.value)" ${editUnlocked?'':'disabled'}></td>
            <td><select style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'estado',this.value)" ${editUnlocked?'':'disabled'}>
              ${[['OK','status.ok'],['Pendiente','status.pendingM'],['Urgente','status.urgent']].map(([opt,key])=>`<option value="${opt}"${e.estado===opt?' selected':''}>${t(key)}</option>`).join('')}
            </select></td>
            <td><input type="text" value="${escapeHtml(e.notas||'')}" placeholder="—" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px;width:120px" onchange="updateMantenimientoEquipo(${e.id},'notas',this.value)" ${editUnlocked?'':'disabled'}></td>
            <td><button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="deleteMantenimientoEquipo(${e.id})"><i class="ti ti-trash"></i></button></td>
          </tr>
        `;}).join('') : `<tr><td colspan="7"><div class="empty" style="padding:14px">${t('empty.noEquipmentRegistered')}</div></td></tr>`}</tbody>
      </table>
    </div>
  `;
}
function addMantenimientoEquipo(){
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newEquipment')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.equipmentName')}</label>
      <input type="text" id="new-mantenimiento-equipo" placeholder="${currentArea()==='sala' ? t('ph.equipmentExampleSala') : t('ph.equipmentExample')}">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmAddMantenimientoEquipo()">${t('common.add')}</button>
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
  renderLimpiezaMantenimiento();
}
function updateMantenimientoEquipo(id, field, val){
  if(!editUnlocked) return;
  const e = DB.limpieza.mantenimiento.find(x => x.id===id);
  if(e) e[field] = val;
  saveDB();
}
function deleteMantenimientoEquipo(id){
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  DB.limpieza.mantenimiento = DB.limpieza.mantenimiento.filter(x => x.id!==id);
  saveDB();
  renderLimpiezaMantenimiento();
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
  if(p.recurrence === 'weekly' && ds > p.fecha){
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
function togglePromoDone(promoId, checked, ds){
  const p = DB.promos.find(x=>x.id===promoId);
  if(!p) return;
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
function toggleDistTareaDone(dateStr, taskId, checked){
  const d = getDistEmpData(distCurrentEmployeeId);
  if(!d.doneDates[dateStr]) d.doneDates[dateStr] = {};
  d.doneDates[dateStr][taskId] = checked;
  saveDB();
  renderDistDetail();
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
  for(const c of DB.cartas){
    if(isBebidaCarta(c) !== (currentArea()==='sala')) continue;
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

function renderDistribucion(){
  migrateWorkDistribution();
  const box = document.getElementById('distribucion-content');

  if(!areaEmployees().length){
    box.innerHTML = `
      <div class="toolbar"><div class="left"></div><button class="owner-strict btn btn-primary" onclick="addEmployeeFromDistribucion()"><i class="ti ti-plus"></i> ${t('btn.addEmployee')}</button></div>
      <div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>
    `;
    return;
  }

  if(distCurrentEmployeeId && DB.employees.find(e=>e.id===distCurrentEmployeeId) && (DB.employees.find(e=>e.id===distCurrentEmployeeId).area||'cocina')===currentArea()){
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
}

function renderDistList(){
  const box = document.getElementById('distribucion-content');
  const isSala = currentArea() === 'sala';
  const allEmps = areaEmployees();
  // Igual que en Personal: en sesión de empleado (Acceso Empleados) solo se
  // ve la propia tarjeta, no la de los compañeros.
  const myEmployeeId = loggedInEmployeeId();
  const visibleEmps = myEmployeeId != null ? allEmps.filter(e => e.id === myEmployeeId) : allEmps;
  const emps = distSearch ? visibleEmps.filter(e => e.name.toLowerCase().includes(distSearch) || (e.rol||'').toLowerCase().includes(distSearch)) : visibleEmps;
  const cards = emps.map(emp => {
    const d = getDistEmpData(emp.id);
    const nPlatos = d.platos.length;
    const nTareas = Object.values(d.produccion).reduce((s,arr)=>s+arr.length, 0);
    // Un empleado dado de baja seguía apareciendo igual que uno activo,
    // pudiendo asignársele trabajo sin darse cuenta hasta entrar en su
    // ficha de Personal — mismo aviso visual que ya usa esa pestaña.
    const isInactive = emp.active === false;
    return `
      <div class="card" style="cursor:pointer${isInactive?';opacity:.6':''}" onclick="openDistEmployee(${emp.id})">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:14px;height:14px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
          <strong>${escapeHtml(emp.name)}</strong>
          ${isInactive ? `<span class="badge badge-gray" style="white-space:nowrap">${t('label.inactive')}</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${escapeHtml(emp.rol||t('label.noRole'))}</div>
        <div style="display:flex;gap:12px;font-size:12px;color:${nPlatos||nTareas?'var(--brand-orange)':'var(--muted)'}">
          ${isSala ? '' : `<span><i class="ti ti-tools-kitchen-2"></i> ${nPlatos===1?t('dist.oneDish'):t('dist.nDishes').replace('${n}', nPlatos)}</span>`}
          <span><i class="ti ti-clipboard-list"></i> ${nTareas===1?t('dist.oneTask'):t('dist.nTasks').replace('${n}', nTareas)}</span>
        </div>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    ${myEmployeeId == null ? `
    <div class="toolbar">
      <div class="left"><input type="text" class="search-input" value="${escapeHtml(distSearch)}" placeholder="${t('ph.searchEmployee')}" oninput="setDistSearch(this.value)"></div>
      <button class="btn btn-default" onclick="printDistribucion()"><i class="ti ti-printer"></i> ${t('btn.printAll')}</button>
    </div>
    ` : ''}
    ${emps.length ? `<div class="grid grid-3">${cards}</div>` : `<div class="empty"><i class="ti ${allEmps.length?'ti-search-off':'ti-users'}"></i>${allEmps.length?t('common.noResults'):t('empty.employees')}</div>`}
  `;
}

// Igual que en la pestaña Personal: para ver la distribución de tareas de un
// empleado hay que introducir su PIN primero, así cada uno solo ve lo suyo.
let distPendingPinEmployeeId = null;
function openDistEmployee(id){
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
  // El dueño ya se identificó a nivel de sesión al entrar: no tiene sentido
  // volver a pedirle el PIN del empleado solo para ver o repartir su
  // trabajo (igual que en Personal — openEmployeePersonalCard).
  if(isOwnerSession()){ openDistEmployeeAuthed(id); return; }
  distPendingPinEmployeeId = id;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.distPinDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="dist-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmDistEmployeePin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmDistEmployeePin()">${t('common.unlock')}</button>
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
  distCurrentEmployeeId = id;
  distWeekOffset = 0;
  renderDistribucion();
}

function backToDistList(){
  distCurrentEmployeeId = null;
  renderDistribucion();
}

function distWeekShift(delta){
  distWeekOffset += delta;
  renderDistDetail();
}

function renderDistDetail(){
  const box = document.getElementById('distribucion-content');
  const emp = DB.employees.find(e=>e.id===distCurrentEmployeeId);
  if(!emp){ backToDistList(); return; }
  const d = getDistEmpData(emp.id);
  const allDishes = getDishNamesWithFicha();
  // En Sala no tiene sentido el concepto de "plan de producción semanal de
  // platos" (eso es propio de cocina); ahí este módulo es solo el calendario
  // de tareas (Sala + Limpieza + Promos) de cada persona.
  const isSala = currentArea() === 'sala';
  // Distinto de editUnlocked: asignar/quitar el trabajo de OTRO compañero es
  // cosa del propietario real, no de cualquier empleado con "puede editar"
  // (antes se usaba editUnlocked/.owner-only aquí y un compañero con ese
  // permiso podía tocar el trabajo asignado a cualquier otro).
  const ownerSess = isOwnerSession();

  // Un plato asignado se guarda por nombre (texto suelto), no por id de
  // receta: si luego se renombra o se borra en el Escandallo/Carta, la
  // asignación se quedaba con el nombre viejo para siempre, sin ningún
  // aviso — se veía igual que un plato válido hasta que se pulsaba y salía
  // el aviso de "ficha no encontrada". Ahora se marca en rojo de antemano.
  // Tarjetas grandes y táctiles: en la práctica se usan para tocar el plato
  // en una tablet en mitad de cocina e ir directo a producir, no para
  // gestionarlas con precisión de ratón — la fila estrecha de antes era
  // fácil de fallar con el dedo.
  const platosHtml = d.platos.length
    ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">` + d.platos.map((pl,i)=>{
        const broken = !allDishes.includes(pl);
        return `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 8px;min-height:76px;border:2px solid ${broken?'var(--red)':'var(--border)'};border-radius:12px;cursor:pointer;text-align:center;background:${broken?'var(--red-l)':'var(--surface)'}" onclick="goToFichaForDish('${escapeJsAttr(pl)}')" title="${broken?t('dist.dishNoLongerExists'):t('title.viewTechSpec')}">
          <button class="owner-strict btn btn-sm btn-icon btn-danger" style="position:absolute;top:4px;right:4px" onclick="event.stopPropagation();removeDistPlato(${i})"><i class="ti ti-x"></i></button>
          <i class="ti ${broken?'ti-link-off':'ti-tools-kitchen-2'}" style="font-size:20px;color:${broken?'var(--red)':'var(--brand-orange)'}"></i>
          <span style="font-size:12.5px;font-weight:600;line-height:1.2;${broken?'color:var(--red)':''}">${escapeHtml(pl)}</span>
        </div>
      `;}).join('') + `</div>`
    : `<div class="empty" style="padding:10px"><i class="ti ti-tools-kitchen-2"></i>${t('dist.noDishesAssigned')}</div>`;

  const platosOptions = allDishes.filter(pl=>!d.platos.includes(pl))
    .map(pl=>`<option value="${escapeHtml(pl)}">${escapeHtml(pl)}</option>`).join('');

  ensureLimpiezaData();
  const weekDates = getWeekDates(distWeekOffset);
  const weekRangeLabel = `${weekDates[0].getDate()} ${monthFull(weekDates[0].getMonth()).slice(0,3)} – ${weekDates[6].getDate()} ${monthFull(weekDates[6].getMonth()).slice(0,3)}`;

  let nTareasTotal = 0, nTareasHechas = 0, nTareasAtrasadas = 0;
  const todayDs = todayStr();

  const diasHtml = weekDates.map((date, idx) => {
    const label = weekDayFull(idx);
    const ds = dateStr(date);
    const isToday = ds === todayStr();
    const isPast = ds < todayDs;
    let dayHasPending = false;

    // Producción: plantilla recurrente por día de la semana, "hecha" se
    // guarda por fecha concreta (con el id propio de cada tarea).
    const tareas = d.produccion[idx] || [];
    const tareasHtml = tareas.map(task => {
      const done = isDistTareaDone(emp.id, ds, task.id);
      nTareasTotal++; if(done) nTareasHechas++; else if(isPast){ nTareasAtrasadas++; dayHasPending = true; }
      const canEditThis = ownerSess || task.bySelf;
      return `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${done?'checked':''} onchange="toggleDistTareaDone('${ds}','${task.id}',this.checked)" title="${t('title.markAsDone')}">
        <input type="text" value="${escapeHtml(task.text)}" style="flex:1;padding:5px 8px;border:1px solid ${task.bySelf?'var(--teal)':'var(--border)'};border-radius:6px;font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':(isPast?'color:var(--red)':'')}" onchange="updateDistTarea(${idx},'${task.id}',this.value)" ${canEditThis?'':'disabled'}>
        ${task.bySelf ? `<span class="badge" style="font-size:10px;color:var(--teal);background:transparent" title="${t('dist.selfAddedHint')}"><i class="ti ti-user"></i> ${t('dist.selfAdded')}</span>` : ''}
        <button class="${task.bySelf?'':'owner-strict'} btn btn-sm btn-icon btn-danger" onclick="removeDistTarea(${idx},'${task.id}')"><i class="ti ti-x"></i></button>
      </div>
    `;}).join('');

    // Tareas únicas: puntuales para esta fecha exacta, no se repiten cada semana.
    const tareasUnicas = d.tareasUnicas[ds] || [];
    const tareasUnicasHtml = tareasUnicas.map(task => {
      const done = isDistTareaDone(emp.id, ds, task.id);
      nTareasTotal++; if(done) nTareasHechas++; else if(isPast){ nTareasAtrasadas++; dayHasPending = true; }
      const canEditThis = ownerSess || task.bySelf;
      return `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${done?'checked':''} onchange="toggleDistTareaDone('${ds}','${task.id}',this.checked)" title="${t('title.markAsDone')}">
        <input type="text" value="${escapeHtml(task.text)}" style="flex:1;padding:5px 8px;border:1px solid ${task.bySelf?'var(--teal)':'var(--border)'};border-radius:6px;font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':(isPast?'color:var(--red)':'')}" onchange="updateDistTareaUnica('${ds}','${task.id}',this.value)" ${canEditThis?'':'disabled'}>
        <span class="badge badge-purple" style="font-size:10px" title="${t('dist.onlyThisWeek')}"><i class="ti ti-calendar-event"></i></span>
        ${task.bySelf ? `<span class="badge" style="font-size:10px;color:var(--teal);background:transparent" title="${t('dist.selfAddedHint')}"><i class="ti ti-user"></i> ${t('dist.selfAdded')}</span>` : ''}
        <button class="${task.bySelf?'':'owner-strict'} btn btn-sm btn-icon btn-danger" onclick="removeDistTareaUnica('${ds}','${task.id}')"><i class="ti ti-x"></i></button>
      </div>
    `;}).join('');

    // Limpieza mensual: la tarea "toca" ese día si el día del mes coincide
    // con la fecha real de esta semana.
    const tareasLimpiezaDia = DB.limpieza.tareas.filter(lt => lt.tipo==='mensual' && lt.responsableId===emp.id && lt.diaMes===date.getDate() && (lt.zona||'cocina')===(emp.area||'cocina'));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    const checksMes = DB.limpieza.checksMes[monthKey] || {};
    const limpiezaHtml = tareasLimpiezaDia.map(lt => {
      const done = !!limpiezaCheckInfo(checksMes, lt.id);
      const canToggle = canToggleLimpiezaTarea(lt);
      nTareasTotal++; if(done) nTareasHechas++; else if(isPast){ nTareasAtrasadas++; dayHasPending = true; }
      return `
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:${canToggle?'pointer':'not-allowed'}">
        <input type="checkbox" ${done?'checked':''} ${canToggle?'':'disabled'} onchange="toggleLimpiezaCheckMesFromDist('${monthKey}',${lt.id},this.checked)">
        <span class="badge badge-blue" style="font-size:10px"><i class="ti ti-spray"></i> Limpieza</span>
        <span style="flex:1;font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(lt.area)}${lt.producto?` <span style="color:var(--muted);font-size:12px">(${escapeHtml(lt.producto)})</span>`:''}</span>
      </label>
    `;}).join('');

    // Promociones: asignadas a esta fecha, incluidas las recurrentes que caen ese día.
    const promos = getPromosForEmployeeDate(emp.id, ds);
    const promosHtml = promos.map(p => {
      const done = !!(promoDoneInfo(p, ds) || {}).done;
      nTareasTotal++; if(done) nTareasHechas++; else if(isPast){ nTareasAtrasadas++; dayHasPending = true; }
      return `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${done?'checked':''} onchange="event.stopPropagation();togglePromoDone(${p.id},this.checked,'${ds}')" title="${t('title.markAsDone')}">
        <span class="badge badge-amber" style="font-size:10px"><i class="ti ti-speakerphone"></i> Promo</span>
        <span style="flex:1;font-size:13px;cursor:pointer;${done?'text-decoration:line-through;color:var(--muted)':''}" onclick="openPromoModal(${p.id})">${escapeHtml(p.titulo)}</span>
      </div>
    `;}).join('');

    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);${isToday?'background:var(--brand-cream)':(dayHasPending?'background:var(--red-l)':'')}">
        <div style="font-size:12px;font-weight:700;color:var(--brand-orange);margin-bottom:6px;text-transform:uppercase">${label} · ${date.getDate()}/${date.getMonth()+1}${isToday?` <span class="badge badge-green" style="font-size:10px">${t('common.today')}</span>`:''}${dayHasPending?` <span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle"></i> ${t('dist.overdue')}</span>`:''}</div>
        ${promosHtml}
        ${limpiezaHtml}
        ${tareasHtml}
        ${tareasUnicasHtml}
        ${!tareasHtml && !tareasUnicasHtml && !limpiezaHtml && !promosHtml ? `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${t('empty.noTasksThisDay')}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:4px">
          <input type="text" id="dist-tarea-${idx}" placeholder="${t('ph.newTask')}" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" onkeydown="if(event.key==='Enter')addDistTarea(${idx})">
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);white-space:nowrap;cursor:pointer"><input type="checkbox" id="dist-once-${idx}" style="width:auto">${t('dist.onlyThisWeek')}</label>
          <button class="btn btn-sm btn-default" onclick="addDistTarea(${idx})"><i class="ti ti-plus"></i></button>
        </div>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm btn-default" onclick="backToDistList()"><i class="ti ti-arrow-left"></i> ${t('label.team')}</button>
        <span style="width:14px;height:14px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block"></span>
        <strong>${escapeHtml(emp.name)}</strong>
        <span style="font-size:12px;color:var(--muted)">${escapeHtml(emp.rol||'')}</span>
      </div>
      <button class="btn btn-default" onclick="printDistribucion(${emp.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
    </div>

    <div class="grid ${isSala?'':'grid-2'}" style="${isSala?'max-width:280px':''}">
      ${isSala ? '' : `<div class="kpi"><div class="label">${t('dist.dishesInCharge')}</div><div class="value">${d.platos.length}</div></div>`}
      <div class="kpi"><div class="label">${t('dist.tasksThisWeek')}</div><div class="value">${nTareasHechas} / ${nTareasTotal}</div></div>
    </div>
    ${nTareasAtrasadas ? `<div class="badge badge-red" style="font-size:12px;margin:8px 0;padding:6px 10px;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-alert-triangle"></i> ${nTareasAtrasadas===1?t('dist.oneOverdueTask'):t('dist.nOverdueTasks').replace('${n}', nTareasAtrasadas)}</div>` : ''}

    ${isSala ? '' : `
    <div class="card">
      <h3><i class="ti ti-tools-kitchen-2"></i> ${t('dist.dishesInChargeTitle')}</h3>
      ${platosHtml}
      <div class="owner-strict" style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
        <select id="dist-plato-sel" style="flex:1;min-width:140px">
          <option value="">${t('dist.selectDish')}</option>
          ${platosOptions}
        </select>
        <button class="btn btn-default" style="flex:none" onclick="addDistPlato()">${t('btn.assign')}</button>
      </div>
      ${!allDishes.length ? `<p class="owner-strict" style="font-size:12px;color:var(--muted);margin:6px 0 0">${t('dist.noFichasYet')}</p>` : ''}
    </div>
    `}

    <div class="card">
      <h3 style="justify-content:space-between">
        <span><i class="ti ti-clipboard-list"></i> ${t('dist.weekTasksTitle')}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-sm btn-icon" onclick="distWeekShift(-1)" title="${t('title.prevWeek')}"><i class="ti ti-chevron-left"></i></button>
          <span style="font-size:13px;font-weight:600">${weekRangeLabel}</span>
          <button class="btn btn-sm btn-icon" onclick="distWeekShift(1)" title="${t('title.nextWeek')}"><i class="ti ti-chevron-right"></i></button>
          ${distWeekOffset!==0 ? `<button class="btn btn-sm" onclick="distWeekOffset=0;renderDistDetail()">${t('common.today')}</button>` : ''}
        </span>
      </h3>
      <p style="font-size:12px;color:var(--muted);margin:-4px 0 8px">${t('msg.unifiedTasksDesc')}</p>
      ${diasHtml}
    </div>
  `;
}

function addEmployeeFromDistribucion(){
  openEmployeeModal();
}

function addDistPlato(){
  if(!isOwnerSession()) return;
  const sel = document.getElementById('dist-plato-sel');
  const nombre = sel.value;
  if(!nombre) return;
  const d = getDistEmpData(distCurrentEmployeeId);
  if(!d.platos.includes(nombre)) d.platos.push(nombre);
  saveDB();
  renderDistDetail();
}

function removeDistPlato(idx){
  if(!isOwnerSession()) return;
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  const d = getDistEmpData(distCurrentEmployeeId);
  d.platos.splice(idx,1);
  saveDB();
  renderDistDetail();
}

function addDistTarea(dayIdx){
  const inp = document.getElementById('dist-tarea-'+dayIdx);
  const val = inp.value.trim();
  if(!val) return;
  const onlyThisWeek = document.getElementById('dist-once-'+dayIdx)?.checked;
  const d = getDistEmpData(distCurrentEmployeeId);
  // Si quien añade la tarea no es el propietario real, es el propio
  // empleado auto-organizándose su trabajo (no el jefe asignándoselo), así
  // que se marca como "suya" para poder editarla/borrarla libremente y
  // distinguirla visualmente de las tareas que le asigna el jefe. Antes se
  // comprobaba editUnlocked, así que un compañero con permiso de editar
  // veía sus propias tareas marcadas como "del jefe" sin serlo.
  const bySelf = !isOwnerSession();
  if(onlyThisWeek){
    const ds = dateStr(getWeekDates(distWeekOffset)[dayIdx]);
    if(!d.tareasUnicas[ds]) d.tareasUnicas[ds] = [];
    // Evita duplicar la misma tarea el mismo día por doble Enter/doble
    // clic, igual que ya se comprueba para los platos asignados.
    if(d.tareasUnicas[ds].some(t => t.text.trim().toLowerCase() === val.toLowerCase())){ showToast(t('msg.taskAlreadyExists')); return; }
    d.tareasUnicas[ds].push({id: genId(), text: val, bySelf});
  } else {
    if(!d.produccion[dayIdx]) d.produccion[dayIdx] = [];
    if(d.produccion[dayIdx].some(t => t.text.trim().toLowerCase() === val.toLowerCase())){ showToast(t('msg.taskAlreadyExists')); return; }
    d.produccion[dayIdx].push({id: genId(), text: val, bySelf});
  }
  saveDB();
  renderDistDetail();
}

// El id de cada tarea lo genera genId() como NÚMERO, pero al llegar aquí
// desde un onclick/onchange del HTML siempre es TEXTO (viene interpolado
// entre comillas en la plantilla) — comparar con === los dejaba sin
// coincidir nunca, así que editar el texto no guardaba nada y el botón de
// borrar (la X roja) no borraba nunca, en silencio. String() a ambos lados
// para que la comparación no dependa del tipo.
function updateDistTarea(dayIdx, taskId, val){
  const d = getDistEmpData(distCurrentEmployeeId);
  const task = (d.produccion[dayIdx]||[]).find(t=>String(t.id)===String(taskId));
  if(!task || !(isOwnerSession() || task.bySelf)) return;
  task.text = val;
  saveDB();
}

function removeDistTarea(dayIdx, taskId){
  const d = getDistEmpData(distCurrentEmployeeId);
  const task = (d.produccion[dayIdx]||[]).find(t=>String(t.id)===String(taskId));
  if(task && !(isOwnerSession() || task.bySelf)) return;
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  if(d.produccion[dayIdx]){
    d.produccion[dayIdx] = d.produccion[dayIdx].filter(t=>String(t.id)!==String(taskId));
    saveDB();
    renderDistDetail();
  }
}

// Tareas únicas: puntuales para una fecha concreta, no forman parte de la
// plantilla recurrente por día de la semana.
function updateDistTareaUnica(ds, taskId, val){
  const d = getDistEmpData(distCurrentEmployeeId);
  const task = (d.tareasUnicas[ds]||[]).find(t=>String(t.id)===String(taskId));
  if(!task || !(isOwnerSession() || task.bySelf)) return;
  task.text = val;
  saveDB();
}

function removeDistTareaUnica(ds, taskId){
  const d = getDistEmpData(distCurrentEmployeeId);
  const task = (d.tareasUnicas[ds]||[]).find(t=>String(t.id)===String(taskId));
  if(task && !(isOwnerSession() || task.bySelf)) return;
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  if(d.tareasUnicas[ds]){
    d.tareasUnicas[ds] = d.tareasUnicas[ds].filter(t=>String(t.id)!==String(taskId));
    saveDB();
    renderDistDetail();
  }
}

function printDistribucion(empId){
  migrateWorkDistribution();
  const targets = empId ? DB.employees.filter(e=>e.id===empId) : areaEmployees();
  const isSala = currentArea() === 'sala';
  const title = t('view.distribucion.title');
  let body = printReportHeaderHtml(title);
  if(!targets.length){
    body += `<div class="pr-empty">${t('common.noResults')}</div>`;
  }
  targets.forEach(emp => {
    const d = getDistEmpData(emp.id);
    const rows = [];
    if(!isSala && d.platos.length) rows.push(`<tr><td style="width:110px"><strong>${t('common.dishes')}</strong></td><td>${d.platos.map(escapeHtml).join(' · ')}</td></tr>`);
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
  if(dates.length >= 3){
    const spanDays = (new Date(lastDate) - new Date(firstDate)) / 86400000;
    avgIntervalDays = spanDays / (dates.length - 1);
  }
  const isNew = firstDate!=null && recency!=null ? (Math.floor((new Date(todayStr()) - new Date(firstDate))/86400000) <= 30) : false;
  const atRisk = avgIntervalDays!=null && recency!=null && recency > avgIntervalDays * 2;
  return {visitas, ticketMedio, total, lastDate, firstDate, recency, avgIntervalDays, isNew, atRisk};
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

// Estado de ordenación de la tabla de clientes (se mantiene mientras dure la sesión).
let clientesSortField = null;
let clientesSortDir = 'desc';
function setClientesSort(field){
  if(clientesSortField === field){
    clientesSortDir = clientesSortDir === 'desc' ? 'asc' : 'desc';
  } else {
    clientesSortField = field;
    clientesSortDir = 'desc';
  }
  renderClientes();
}

function renderClientes(){
  const getStats = computeClientStatsIndexed();
  const search = document.getElementById('clientes-search').value.toLowerCase();
  const filter = document.getElementById('clientes-filter')?.value || '';
  let items = DB.clients.filter(c => !search || c.name.toLowerCase().includes(search) || (c.phone||'').includes(search));
  if(filter === 'inactive') items = items.filter(c => { const r = getStats(c).recency; return r === null || r > 60; });
  else if(filter === 'allergies') items = items.filter(c => (c.allergies||'').trim());
  else if(filter === 'vip') items = items.filter(c => (c.points||0) >= 7);
  else if(filter === 'noshows') items = items.filter(c => (c.noShows||0) > 0);
  else if(filter === 'noconsent') items = items.filter(c => c.marketingConsent === false);
  else if(filter === 'new') items = items.filter(c => getStats(c).isNew);
  else if(filter === 'atrisk') items = items.filter(c => getStats(c).atRisk);

  if(clientesSortField){
    const dir = clientesSortDir === 'asc' ? 1 : -1;
    items = items.map(c => ({c, stats: getStats(c)}))
      .sort((a,b) => {
        let va, vb;
        if(clientesSortField === 'visitas'){ va = a.stats.visitas; vb = b.stats.visitas; }
        else if(clientesSortField === 'ticket'){ va = a.stats.ticketMedio; vb = b.stats.ticketMedio; }
        else if(clientesSortField === 'total'){ va = a.stats.total; vb = b.stats.total; }
        else if(clientesSortField === 'lastDate'){ va = a.stats.lastDate || ''; vb = b.stats.lastDate || ''; }
        return va < vb ? -1*dir : va > vb ? 1*dir : 0;
      })
      .map(x => x.c);
  }
  document.querySelectorAll('#view-clientes .th-sort i').forEach(i => { i.className = 'ti ti-arrows-sort'; i.style.opacity = '.5'; });
  if(clientesSortField){
    const icon = document.getElementById(`clientes-sort-${clientesSortField}`);
    if(icon){ icon.className = clientesSortDir === 'asc' ? 'ti ti-sort-ascending' : 'ti ti-sort-descending'; icon.style.opacity = '1'; }
  }

  const tbody = document.getElementById('clientes-tbody');

  if(!items.length){
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><i class="ti ti-address-book"></i>${t("empty.clients")}</div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(c => {
    const stats = getStats(c);
    const segmentBadge = stats.isNew ? `<span class="badge badge-blue" style="font-size:9px" title="${t('label.newClientHint')}">${t('badge.new')}</span>`
      : stats.atRisk ? `<span class="badge badge-amber" style="font-size:9px" title="${t('label.atRiskClientHint')}">${t('badge.atRisk')}</span>` : '';
    const points = c.points||0;
    let loyaltyCls, loyaltyBtn;
    if(points >= 10){
      loyaltyCls = 'badge-green';
      loyaltyBtn = `<button class="btn btn-sm" onclick="openRewardModal(${c.id})" title="${t('title.giveRewardReset')}"><i class="ti ti-gift"></i> ${t('btn.giveReward')}</button>`;
    } else {
      loyaltyCls = points >= 7 ? 'badge-amber' : 'badge-gray';
      loyaltyBtn = '';
    }
    return `
    <tr>
      <td data-label="${t('common.name')}"><strong>${escapeHtml(c.name)}</strong> ${segmentBadge}${c.noShows ? ` <span class="badge badge-red" style="font-size:9px" title="${t('label.noShowCount')}"><i class="ti ti-user-x"></i> ${c.noShows}</span>` : ''}${c.marketingConsent===false ? ` <span class="badge badge-gray" style="font-size:9px" title="${t('label.noMarketingConsent')}"><i class="ti ti-mail-off"></i></span>` : ''}${c.cumpleanos ? `<div style="font-size:11px;color:var(--muted)"><i class="ti ti-cake"></i> ${escapeHtml(c.cumpleanos)}</div>` : ''}</td>
      <td data-label="${t('label.contact')}">
        ${c.phone ? `<div><a href="https://wa.me/${escapeHtml(c.phone.replace(/\D/g,''))}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${escapeHtml(c.phone)}</a></div>` : ''}
        ${c.email ? `<div><a href="mailto:${escapeHtml(c.email)}"><i class="ti ti-mail"></i> ${escapeHtml(c.email)}</a></div>` : ''}
        ${!c.phone && !c.email ? '—' : ''}
      </td>
      <td data-label="${t('label.visits')}"><button class="btn btn-sm" style="background:none;border:none;padding:0" onclick="openClientHistoryModal(${c.id})" title="${t('btn.viewOrderHistory')}"><span class="badge badge-blue">${stats.visitas}</span></button></td>
      <td data-label="${t('label.avgTicket')}">${fmtMoney(stats.ticketMedio)}</td>
      <td data-label="${t('common.total')}">${fmtMoney(stats.total)}</td>
      <td data-label="${t('label.lastVisit')}">${stats.lastDate ? `${stats.lastDate} <span style="color:var(--muted);font-size:11px">(${t('label.daysAgo').replace('${n}', stats.recency)})</span>` : '—'}</td>
      <td data-label="${t('label.loyaltyPoints')}"><span class="badge ${loyaltyCls}">${points}/10</span> ${loyaltyBtn}</td>
      <td class="wrap" data-label="${t('common.notes')}">${escapeHtml(c.notes||'—')}</td>
      <td class="actions-cell" data-label="">
        <button class="btn btn-sm btn-icon" onclick="openClientModal(${c.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-icon btn-danger" onclick="deleteClient(${c.id})"><i class="ti ti-trash"></i></button>
      </td>
    </tr>
  `;
  }).join('');
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
function removeLoyaltyReward(i){
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  DB.loyaltyRewards.splice(i,1);
  saveDB();
  document.getElementById('loyalty-rewards-list').innerHTML = renderLoyaltyRewardsList();
}

function openClientModal(id){
  const c = id ? DB.clients.find(x=>x.id===id) : {name:'',phone:'',email:'',notes:'',allergies:'',points:0,cp:'',cumpleanos:'',ultimoContacto:''};
  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editClient'):t('title.newClient')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')} *</label>
      <input type="text" id="client-name" value="${escapeHtml(c.name)}" placeholder="${t('ph.clientName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.phone')} *</label>
        <input type="text" id="client-phone" value="${escapeHtml(c.phone)}" placeholder="${t('ph.phoneExample')}">
      </div>
      <div class="field">
        <label>${t('common.email')}</label>
        <input type="email" id="client-email" value="${escapeHtml(c.email)}" placeholder="cliente@email.com">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.postalCode')}</label>
        <input type="text" id="client-cp" value="${escapeHtml(c.cp||'')}" placeholder="${t('ph.postalCodeExample')}">
      </div>
      <div class="field">
        <label>${t('label.birthday')}</label>
        <input type="date" id="client-cumpleanos" value="${escapeHtml(c.cumpleanos||'')}">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.lastContact')}</label>
        <input type="date" id="client-ultimo-contacto" value="${escapeHtml(c.ultimoContacto||'')}">
      </div>
      <div class="field">
        <label>${t('label.loyaltyPoints')}</label>
        <div style="padding:10px 0;font-size:14px"><span class="badge ${(c.points||0)>=10?'badge-green':(c.points||0)>=7?'badge-amber':'badge-gray'}">${c.points||0}/10</span> <span style="font-size:12px;color:var(--muted)">${t('msg.pointsAutoAdded')}</span></div>
      </div>
    </div>
    <div class="field">
      <label>${t('label.allergiesPrefs')}</label>
      <input type="text" id="client-allergies" value="${escapeHtml(c.allergies||'')}" placeholder="${t('ph.allergiesExample')}">
    </div>
    <div class="field">
      <label>${t('th.notes')}</label>
      <textarea id="client-notes" placeholder="${t('ph.additionalNotes')}">${escapeHtml(c.notes||'')}</textarea>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:14px;cursor:pointer">
      <input type="checkbox" id="client-marketing-consent" ${c.marketingConsent!==false?'checked':''} style="width:auto">
      ${t('label.marketingConsent')}
    </label>
    ${id ? `<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="openClientHistoryModal(${id})"><i class="ti ti-receipt"></i> ${t('btn.viewOrderHistory')}</button>
      <button class="btn btn-sm btn-danger" onclick="eraseClientDataRGPD(${id})" title="${t('rgpd.eraseHint')}"><i class="ti ti-shield-off"></i> ${t('title.eraseClientRGPD')}</button>
    </div>` : ''}
    ${(c.rewardsHistory&&c.rewardsHistory.length) ? `
    <div class="field">
      <label>${t('label.rewardHistory')}</label>
      <div style="font-size:12px;color:var(--muted);line-height:1.6">
        ${[...c.rewardsHistory].reverse().map(r=>`${escapeHtml(r.fecha)} — ${escapeHtml(r.premio)}`).join('<br>')}
      </div>
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveClient(${id||'null'})">${t("common.save")}</button>
    </div>
  `);
}

function saveClient(id){
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
  if(phone && phone.replace(/[^\d]/g,'').length < 9 && !confirm(t('msg.confirmOddPhone'))) return;
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !confirm(t('msg.confirmOddEmail'))) return;
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
  if(dupeContact && !confirm(t('msg.confirmDuplicateClient').replace('${name}', dupeContact.name))) return;

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

// Historial de pedidos de un cliente: cada venta con su fecha, platos y total.
function openClientHistoryModal(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const sales = clientSales(c).map(s => ({type:'sale', date:s.date, sortKey: s.createdAt||s.date, data:s}));
  const reservations = DB.reservations.filter(r =>
    r.clientId === c.id || (r.clientName && r.clientName.trim().toLowerCase() === c.name.trim().toLowerCase())
  ).map(r => ({type:'reservation', date:r.date, sortKey: r.date+' '+(r.time||''), data:r}));
  const timeline = [...sales, ...reservations].sort((a,b) => b.sortKey.localeCompare(a.sortKey));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-receipt"></i> ${t('title.orderHistoryOf')} ${escapeHtml(c.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${timeline.length ? `<div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('label.dishElaboration')}</th><th>${t('label.total')}</th></tr></thead>
        <tbody>${timeline.map(entry => {
          if(entry.type === 'sale'){
            const s = entry.data;
            return `<tr><td>${escapeHtml(s.date)} <span class="badge badge-blue" style="font-size:9px">${t('label.orderTag')}</span></td><td class="wrap">${(s.items||[]).map(it=>`${it.qty}× ${escapeHtml(it.name)}`).join(', ')}</td><td>${fmtMoney(s.total)}</td></tr>`;
          }
          const r = entry.data;
          return `<tr style="cursor:pointer" onclick="closeModal();navigate('reservas');goToReservasDia('${r.date}')"><td>${escapeHtml(r.date)} <span class="badge badge-gray" style="font-size:9px">${t('label.reservationTag')}</span></td><td class="wrap">${escapeHtml(r.time||'')} · ${r.people} ${t('common.persAbbr')} · ${reservationStatusBadge(r.status)}</td><td>—</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-receipt"></i>${t('empty.noOrderHistory')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
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
    <div style="background:var(--cream,#FBF3EA);border-left:3px solid var(--brand-orange);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;line-height:1.5">
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
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendRewardWhatsapp(${id})" ${!c.phone?`disabled title="${t('msg.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
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
  const tel = c.phone.replace(/\D/g,'');
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
    moveToTrash('client', c);
    logAudit('delete', t('audit.deletedClient').replace('${name}', c.name));
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
    logAudit('rgpd_erase', t('audit.erasedClientRGPD').replace('${name}', c.name));
    c.name = t('label.erasedClientName');
    c.phone = ''; c.email = ''; c.allergies = ''; c.notes = ''; c.cp = ''; c.cumpleanos = '';
    c.marketingConsent = false;
    c.erasedAt = new Date().toISOString();
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
let reservasMonthOffset = 0;

function reservationStatusBadge(status){
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
function markReservationNoShow(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  if(!confirm(t('msg.confirmNoShow'))) return;
  r.status = 'no_show';
  let cid = r.clientId;
  if(!cid && r.clientPhone){
    const match = findClientByPhone(r.clientPhone);
    if(match) cid = match.id;
  }
  if(cid){
    const c = DB.clients.find(x=>x.id===cid);
    if(c) c.noShows = (c.noShows||0) + 1;
  }
  saveDB();
  renderReservas();
  showToast(t('msg.markedNoShow'));
}

function setReservasTab(t){
  reservasTab = t;
  renderReservas();
}

function renderReservas(){
  markReservasSeen();
  const searchInput = document.getElementById('reservas-search-input');
  if(searchInput && searchInput.value.trim()){ renderReservasSearch(); return; }

  document.querySelectorAll('#view-reservas .ge-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.getElementById('reservas-tab-'+reservasTab);
  if(tabBtn) tabBtn.classList.add('active');

  renderReservasPendingOnline();
  renderReservasRemindersDue();
  if(reservasTab === 'semana') renderReservasSemana();
  else if(reservasTab === 'mes') renderReservasMes();
  else renderReservasDia();
}

// Búsqueda de reservas por nombre de cliente o teléfono, a través de TODAS
// las fechas (no solo el día/semana/mes que se esté viendo), para encontrar
// reservas pasadas o futuras sin tener que navegar el calendario.
function renderReservasSearch(){
  const input = document.getElementById('reservas-search-input');
  const query = (input ? input.value : '').trim().toLowerCase();
  const resultsBox = document.getElementById('reservas-search-results');
  const tabsRow = document.getElementById('reservas-tabs-row');
  const tabContent = document.getElementById('reservas-tab-content');
  const pendingBox = document.getElementById('reservas-pending-online');
  const remindersBox = document.getElementById('reservas-reminders-due');
  if(!query){
    resultsBox.style.display = 'none';
    resultsBox.innerHTML = '';
    if(tabsRow) tabsRow.style.display = '';
    if(tabContent) tabContent.style.display = '';
    if(pendingBox) pendingBox.style.display = '';
    if(remindersBox) remindersBox.style.display = '';
    renderReservas();
    return;
  }
  if(tabsRow) tabsRow.style.display = 'none';
  if(tabContent) tabContent.style.display = 'none';
  if(pendingBox) pendingBox.style.display = 'none';
  if(remindersBox) remindersBox.style.display = 'none';
  const normQuery = stripAccents(query);
  const matches = DB.reservations.filter(r => {
    const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
    const name = stripAccents(((client?client.name:'') || r.clientName || '').toLowerCase());
    const phone = ((client && client.phone) || r.clientPhone || '').replace(/\D/g,'');
    return (name && name.includes(normQuery)) || (phone && query.replace(/\D/g,'') && phone.includes(query.replace(/\D/g,'')));
  }).sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));

  resultsBox.style.display = '';
  if(!matches.length){
    resultsBox.innerHTML = `<div class="empty"><i class="ti ti-search"></i>${t('empty.noReservationsMatch')}</div>`;
    return;
  }
  resultsBox.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('th.client')}</th><th>${t('label.numberOfPeople')}</th><th>${t('th.status')}</th></tr></thead>
        <tbody>
          ${matches.map(r => {
            const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
            const name = client ? client.name : (r.clientName || '—');
            return `<tr style="cursor:pointer" onclick="openReservationModal(${r.id})">
              <td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.time||'')}</td><td>${escapeHtml(name)}</td><td>${r.people}</td><td>${reservationStatusBadge(r.status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderReservasPendingOnline(){
  const box = document.getElementById('reservas-pending-online');
  if(!box) return;
  // Una solicitud "pendiente" de una fecha ya pasada que nadie confirmó ni
  // rechazó ya no tiene sentido gestionarla — antes se quedaba aquí para
  // siempre, ensuciando la bandeja de "por hacer" indefinidamente. Se sigue
  // viendo en el histórico normal de reservas, solo desaparece de este aviso.
  const pending = DB.reservations.filter(r => r.status === 'pendiente' && r.date >= todayStr());
  if(!pending.length){ box.innerHTML = ''; return; }
  box.innerHTML = `
    <h3 style="margin-top:0"><i class="ti ti-bell-ringing"></i> ${t('title.pendingOnlineRequests')}</h3>
    <div class="grid grid-3" style="margin-bottom:16px">
      ${pending.map(r => `
        <div class="card" style="border:2px solid var(--brand-orange)">
          <h3 style="justify-content:space-between;font-size:14px">
            <span>${escapeHtml(r.clientName||'—')}</span>
            <span class="badge badge-amber">${t('badge.newF')}</span>
          </h3>
          ${(() => {
            const waitMin = r.createdAt ? minutesSince(r.createdAt) : 0;
            if(waitMin < 30) return '';
            return `<div style="font-size:12px;color:var(--red);margin-bottom:2px"><i class="ti ti-clock-exclamation"></i> ${t('label.waitingSince').replace('${min}', waitMin)}</div>`;
          })()}
          <div style="font-size:13px"><i class="ti ti-calendar"></i> ${escapeHtml(r.date)} · <i class="ti ti-clock"></i> ${escapeHtml(r.time)} · <i class="ti ti-users"></i> ${r.people}</div>
          ${r.clientPhone ? `<div style="font-size:12px;color:${r.phoneOdd?'var(--red)':'var(--muted)'}"><i class="ti ti-phone"></i> ${escapeHtml(r.clientPhone)}${r.phoneOdd ? ` <i class="ti ti-alert-triangle" title="${t('msg.phoneLooksOdd')}"></i>` : ''}</div>` : ''}
          ${r.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px"><i class="ti ti-note"></i> ${escapeHtml(r.notes)}</div>` : ''}
          ${r.depositRequired ? `<div style="margin-top:4px">${r.depositConfirmed
            ? `<span class="badge badge-green"><i class="ti ti-cash"></i> ${t('deposit.received')} (${r.depositAmount}€)</span>`
            : `<span class="badge badge-amber" style="cursor:pointer" onclick="confirmReservationDeposit(${r.id})" title="${t('deposit.confirmHint')}"><i class="ti ti-cash-banknote"></i> ${t('deposit.pending')} (${r.depositAmount}€)</span>`}</div>` : ''}
          ${(() => {
            const turnoIdx = getTurnoIndexForTime(r.date, r.time);
            if(turnoIdx === null) return '';
            const info = getAforoInfoForDate(r.date);
            const turno = info && info[turnoIdx];
            if(!turno || !turno.aforo) return '';
            const wouldBe = turno.reservados + (r.people||0);
            const full = wouldBe > turno.aforo;
            return `<div style="font-size:12px;margin-top:4px;color:${full?'var(--red)':'var(--muted)'}"><i class="ti ti-users"></i> ${t('label.turnoOccupancy').replace('${used}', turno.reservados).replace('${cap}', turno.aforo).replace('${range}', turno.abre+'–'+turno.cierra)}</div>`;
          })()}
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="setReservationStatus(${r.id}, 'confirmada')"><i class="ti ti-check"></i> ${t('common.confirm')}</button>
            <button class="btn btn-sm btn-danger" style="flex:1" onclick="rejectOnlineReservation(${r.id})"><i class="ti ti-x"></i> ${t('common.reject')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
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
  logAudit('deposit_confirmed', t('audit.depositConfirmed').replace('${name}', r.clientName||'—'));
  saveDB();
  renderReservasPendingOnline();
  renderReservas();
  showToast(t('deposit.confirmedOk'));
}

function rejectOnlineReservation(id){
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
function cancelReservation(id){
  if(!confirm(t('msg.confirmCancelReservation'))) return;
  setReservationStatus(id, 'cancelada');
}

function setReservationStatus(id, status){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;

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
        const ok = confirm(t('msg.confirmOverbookedShift').replace('${range}', `${turno.abre}-${turno.cierra}`).replace('${already}', yaReservado).replace('${wouldBe}', yaReservado + r.people).replace('${cap}', aforo));
        if(!ok) return;
      }
    }
  }

  // Ojo: la visita/punto de fidelidad NO se suma aquí. Confirmar una reserva
  // no es lo mismo que la visita real — eso ya lo registra registerClientVisit()
  // cuando se cobra la venta (tpv.js). Sumarlo también al confirmar duplicaba
  // el punto por una sola visita, y dejaba un punto "fantasma" si el cliente
  // acababa siendo un no-show.
  const wasConfirmed = r.status === 'confirmada';
  const wasCancelled = r.status === 'cancelada';
  r.status = status;
  saveDB();
  if(r.publicToken && typeof syncReservationStatusForPublic === 'function') syncReservationStatusForPublic(r);
  renderReservas();
  showToast(status==='confirmada' ? t('msg.reservationConfirmed') : status==='cancelada' ? t('msg.reservationCancelled') : t('msg.reservationRejected'));
  // El aviso al cliente solo tiene sentido la primera vez que pasa a
  // confirmada (p.ej. cuando el personal por fin le asigna mesa a una que se
  // había quedado pendiente) — no en cada guardado posterior de una reserva
  // que ya estaba confirmada.
  if(status === 'confirmada' && !wasConfirmed && typeof sendReservationConfirmationEmail === 'function'){
    const table = r.tableId ? DB.tables.find(t=>t.id===r.tableId) : null;
    sendReservationConfirmationEmail({...r, tableName: table ? table.name : ''}).catch(()=>{});
  }
  // Igual con la cancelación: solo se avisa la primera vez que pasa a
  // 'cancelada' (cubre tanto cancelar una ya confirmada como rechazar una
  // que estaba pendiente — para el cliente es la misma noticia).
  if(status === 'cancelada' && !wasCancelled && typeof sendReservationCancellationEmail === 'function'){
    sendReservationCancellationEmail(r).catch(()=>{});
  }
}

function goToReservasDia(date){
  reservasDate = date;
  reservasTab = 'dia';
  renderReservas();
}

function renderReservasDia(){
  const box = document.getElementById('reservas-tab-content');
  const date = reservasDate;
  // Las reservas ya llegadas (marcadas desde el TPV) se ocultan para no molestar.
  const items = DB.reservations.filter(r => r.date === date && !r.llegada).sort((a,b)=> (a.time||'').localeCompare(b.time||''));

  const tableHtml = !items.length
    ? `<div class="empty"><i class="ti ti-calendar-event"></i>${t('empty.noReservationsDay')}</div>`
    : `<div class="table-wrap"><table class="table-cards">
        <thead><tr><th>${t('th.time')}</th><th>${t('th.client')}</th><th>${t('th.people')}</th><th>${t('th.table')}</th><th>${t('th.notes')}</th><th>${t('th.status')}</th><th>${t('th.arrival')}</th><th></th></tr></thead>
        <tbody>
          ${items.map(r => {
            const client = DB.clients.find(c=>c.id===r.clientId);
            const table = DB.tables.find(t=>t.id===r.tableId);
            return `
              <tr>
                <td data-label="${t('th.time')}"><strong>${escapeHtml(r.time)}</strong></td>
                <td data-label="${t('th.client')}">${escapeHtml(client ? client.name : (r.clientName||'—'))}</td>
                <td data-label="${t('th.people')}">${r.people}</td>
                <td data-label="${t('th.table')}">${table ? escapeHtml(table.name) : `<span class="badge badge-gray">${t('label.notAssigned')}</span>`}</td>
                <td class="wrap" data-label="${t('th.notes')}">${escapeHtml(r.notes||'—')}</td>
                <td data-label="${t('th.status')}">${reservationStatusBadge(r.status)}</td>
                <td data-label="${t('th.arrival')}">
                  ${r.status==='confirmada' ? `
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <button class="btn btn-sm ${r.llegada?'btn-primary':''}" onclick="toggleReservaLlegada(${r.id})">${r.llegada?`<i class="ti ti-check"></i> ${t('btn.arrived')}`:t('btn.notYet')}</button>
                      ${!r.llegada ? `<button class="btn btn-sm btn-danger" onclick="markReservationNoShow(${r.id})" title="${t('btn.noShow')}"><i class="ti ti-user-x"></i></button>` : ''}
                    </div>
                  ` : '—'}
                </td>
                <td class="actions-cell" data-label="">
                  ${r.status==='lista_espera' ? `<button class="btn btn-sm btn-primary" onclick="setReservationStatus(${r.id}, 'confirmada')" title="${t('btn.confirmAnyway')}"><i class="ti ti-check"></i> ${t('common.confirm')}</button>` : ''}
                  ${r.status==='confirmada' && (client?.phone || client?.email || r.clientPhone) ? `<button class="btn btn-sm btn-icon" onclick="openReservationReminderModal(${r.id})" title="${t('btn.sendReminder')}"><i class="ti ti-bell"></i></button>` : ''}
                  ${r.status==='confirmada' ? `<button class="btn btn-sm btn-icon" onclick="cancelReservation(${r.id})" title="${t('btn.cancelReservation')}"><i class="ti ti-calendar-x"></i></button>` : ''}
                  <button class="btn btn-sm btn-icon" onclick="openReservationModal(${r.id})"><i class="ti ti-edit"></i></button>
                  <button class="btn btn-sm btn-icon btn-danger" onclick="deleteReservation(${r.id})"><i class="ti ti-trash"></i></button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table></div>`;

  const aforoInfo = getAforoInfoForDate(date);
  const aforoHtml = (aforoInfo && aforoInfo.length) ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${aforoInfo.map((tr,i) => {
        const lleno = tr.aforo>0 && tr.reservados >= tr.aforo;
        const cerca = tr.aforo>0 && tr.reservados >= tr.aforo*0.8 && !lleno;
        const cls = lleno ? 'badge-red' : cerca ? 'badge-amber' : 'badge-green';
        return `<span class="badge ${cls}"><i class="ti ti-users"></i> ${t('mn.schedule.slotN').replace('${n}', i+1)} (${tr.abre}-${tr.cierra}): ${tr.reservados}${tr.aforo?'/'+tr.aforo:''} ${t('common.people')}${lleno?' · '+t('label.fullCapacity'):''}</span>`;
      }).join('')}
    </div>
  ` : '';

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <input type="date" id="reservas-filter-date" value="${date}" onchange="reservasDate=this.value;renderReservas()">
      </div>
      <button class="btn btn-primary" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${t('btn.newReservation')}</button>
    </div>
    ${aforoHtml}
    ${tableHtml}
  `;
}

function renderReservasSemana(){
  const box = document.getElementById('reservas-tab-content');
  const dates = getWeekDates(reservasWeekOffset);

  const cardsHtml = dates.map((d, i) => {
    const ds = dateStr(d);
    // Las canceladas/no-show no cuentan como ocupación real del día: se
    // muestran igual (tachadas) para que quede constancia, pero no inflan
    // el número ni dan una idea equivocada de cuán lleno está el día.
    const items = DB.reservations.filter(r => r.date === ds).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const activeCount = items.filter(r => r.status !== 'cancelada' && r.status !== 'no_show').length;
    const isToday = ds === todayStr();
    return `
      <div class="card" style="cursor:pointer;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToReservasDia('${ds}')">
        <h3 style="justify-content:space-between;font-size:14px">
          <span>${weekDayFull(i)} ${d.getDate()}/${d.getMonth()+1}</span>
          ${activeCount ? `<span class="badge badge-blue">${activeCount}</span>` : ''}
        </h3>
        ${items.length ? items.map(r => {
          const client = DB.clients.find(c=>c.id===r.clientId);
          const cancelled = r.status === 'cancelada' || r.status === 'no_show';
          return `<div style="font-size:12px;padding:2px 0;${cancelled?'color:var(--muted);text-decoration:line-through':''}">${escapeHtml(r.time)} · ${escapeHtml(client ? client.name : (r.clientName||'—'))} (${r.people}p)</div>`;
        }).join('') : `<div style="font-size:12px;color:var(--muted)">${t('empty.noReservations')}</div>`}
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="reservasWeekOffset--;renderReservas()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="reservasWeekOffset=0;renderReservas()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="reservasWeekOffset++;renderReservas()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${dates[0].getDate()}/${dates[0].getMonth()+1} – ${dates[6].getDate()}/${dates[6].getMonth()+1}</strong>
      </div>
      <button class="btn btn-primary" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${t('btn.newReservation')}</button>
    </div>
    <div class="grid grid-3">${cardsHtml}</div>
  `;
}

function renderReservasMes(){
  const box = document.getElementById('reservas-tab-content');
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + reservasMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const counts = {};
  DB.reservations.forEach(r => {
    if(r.status === 'cancelada' || r.status === 'no_show') return;
    counts[r.date] = (counts[r.date]||0) + 1;
  });

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const count = counts[ds] || 0;
    const isToday = ds === todayStr();
    cells += `
      <div class="card" style="cursor:pointer;padding:8px;text-align:center;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToReservasDia('${ds}')">
        <div style="font-weight:700">${day}</div>
        ${count ? `<span class="badge badge-blue">${count}</span>` : ''}
      </div>
    `;
  }

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="reservasMonthOffset--;renderReservas()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="reservasMonthOffset=0;renderReservas()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="reservasMonthOffset++;renderReservas()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${monthFull(month)} ${year}</strong>
      </div>
      <button class="btn btn-primary" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${t('btn.newReservation')}</button>
    </div>
    <div class="grid" style="grid-template-columns:repeat(7,1fr);gap:6px">
      ${t('days.short').map(d=>`<div style="text-align:center;font-size:12px;font-weight:700;color:var(--muted)">${d}</div>`).join('')}
      ${cells}
    </div>
  `;
}

// Franjas horarias de 30 min en las que se puede reservar ese día, según el
// horario de apertura del negocio. La última reserva posible es media hora
// antes del cierre. Devuelve null si no hay horario configurado (sin restricción).
function getReservationTimeSlots(dateStr){
  const turnos = getTurnosForDate(dateStr);
  if(turnos === null) return null;
  const slots = [];
  turnos.forEach(t => {
    const [ah,am] = t.abre.split(':').map(Number);
    const [ch,cm] = t.cierra.split(':').map(Number);
    let cur = ah*60+am;
    const last = ch*60+cm - 30;
    while(cur <= last){
      slots.push(String(Math.floor(cur/60)).padStart(2,'0')+':'+String(cur%60).padStart(2,'0'));
      cur += 30;
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
        if(r.date !== dateStr || r.id === excludeId || r.status === 'cancelada' || r.status === 'no_show') return false;
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
  if(r.time && !options.includes(r.time)) options.push(r.time);
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
  wrap.innerHTML = reservationTimeFieldHtml({date, time: currentTime});
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

  const clientOptions = `<option value="">${t('label.clientNoRecord')}</option>` + DB.clients.map(c=>`<option value="${c.id}" ${r.clientId===c.id?'selected':''}>${escapeHtml(c.name)}${c.noShows?` (${c.noShows} no-show${c.noShows===1?'':'s'})`:''}</option>`).join('');

  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editReservation'):t('title.newReservation')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('th.client')}</label>
      <select id="reservation-client" onchange="updateReservationClientNoShowHint()">${clientOptions}</select>
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
        <input type="number" id="reservation-people" value="${r.people}" min="1" onchange="updateReservationTableOptions()">
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

function saveReservation(id){
  const clientIdVal = document.getElementById('reservation-client').value;
  const clientId = clientIdVal ? parseInt(clientIdVal) : null;
  const clientName = document.getElementById('reservation-client-name').value.trim();
  const date = document.getElementById('reservation-date').value || todayStr();
  const time = document.getElementById('reservation-time').value || '20:00';
  const people = parseInt(document.getElementById('reservation-people').value) || 1;
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
      if(!confirm(t('msg.confirmTableTooSmall').replace('${table}', table.name).replace('${plazas}', table.plazas).replace('${people}', people))) return;
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
    if(!confirm(t('msg.confirmDuplicateReservation'))) return;
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
  if(existing){
    Object.assign(existing, {clientId, clientName, date, time, people, tableId, notes, status});
  }else{
    DB.reservations.push({id: genId(), clientId, clientName, date, time, people, tableId, notes, status});
  }
  saveDB();
  closeModal();
  renderReservas();
  // Aviso no bloqueante (no se impide guardar, el personal puede necesitar
  // registrar reservas de fechas pasadas para el historial) si la fecha
  // elegida es anterior a hoy.
  showToast(status === 'lista_espera' ? t('msg.reservationWaitlisted') : date < todayStr() ? t('msg.reservationSavedPastDate') : t('msg.reservationSaved'));
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
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  requestBusinessPinAction(t('title.deleteReservation'), t('msg.confirmDeleteReservation'), () => {
    moveToTrash('reservation', r);
    logAudit('delete', t('audit.deletedReservation').replace('${name}', r.clientName||'?').replace('${date}', r.date));
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
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendReservationReminderWhatsapp(${id})" ${!phone?`disabled title="${t('promo.clients.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
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
  const tel = phone.replace(/\D/g,'');
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

// Recordatorios "automáticos" de reserva: no hay backend para enviarlos solos
// sin intervención humana (no hay servidor ni API de WhatsApp/SMS propia), así
// que la app hace el trabajo de detectarlos y prepararlos: cada vez que se
// abre Reservas, se muestran las reservas de mañana que aún no tienen
// recordatorio enviado, listas para mandar con un solo click por cliente.
function renderReservasRemindersDue(){
  const box = document.getElementById('reservas-reminders-due');
  if(!box) return;
  const tomorrowDate = dateStr(new Date(Date.now() + 86400000));
  const due = DB.reservations.filter(r =>
    r.date === tomorrowDate && !r.reminderSentAt && !r.llegada &&
    (r.status==='confirmada' || r.status==='pendiente') &&
    ((r.clientId && DB.clients.find(c=>c.id===r.clientId)?.phone) || r.clientPhone)
  );
  if(!due.length){ box.innerHTML = ''; return; }
  box.innerHTML = `
    <h3 style="margin-top:0"><i class="ti ti-bell-ringing"></i> ${t('title.remindersDueTomorrow')}</h3>
    <div class="grid grid-3" style="margin-bottom:16px">
      ${due.map(r => {
        const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
        const name = client ? client.name : (r.clientName || '—');
        return `
        <div class="card">
          <h3 style="justify-content:space-between;font-size:14px"><span>${escapeHtml(name)}</span></h3>
          <div style="font-size:13px"><i class="ti ti-clock"></i> ${escapeHtml(r.time||'')} · <i class="ti ti-users"></i> ${r.people}</div>
          <button class="btn btn-sm" style="margin-top:8px;width:100%;background:#25D366;color:#fff;border-color:#25D366" onclick="openReservationReminderModal(${r.id})"><i class="ti ti-brand-whatsapp"></i> ${t('btn.sendReminder')}</button>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ============================================================
   PROMOCIÓN — Calendario de marketing del negocio
   ============================================================ */
let promoTab = 'dia';
let promoDate = todayStr();
let promoWeekOffset = 0;
let promoMonthOffset = 0;

function setPromoTab(t){
  promoTab = t;
  renderPromocion();
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
    box.innerHTML = `<p style="font-size:12.5px;color:var(--muted);margin-bottom:10px"><i class="ti ti-info-circle"></i> ${t('promo.social.emptyHint')}</p>`;
    return;
  }
  box.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      ${links.map(l => `<a class="btn btn-sm" style="text-decoration:none" href="${escapeHtml(l.url)}" target="_blank" rel="noopener"><i class="ti ${l.icon}"></i> ${escapeHtml(l.label)}</a>`).join('')}
    </div>`;
}

function renderPromocion(){
  renderPromoSocialLinks();
  document.querySelectorAll('#view-promocion .ge-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.getElementById('promo-tab-'+promoTab);
  if(tabBtn) tabBtn.classList.add('active');

  if(promoTab === 'semana') renderPromoSemana();
  else if(promoTab === 'mes') renderPromoMes();
  else if(promoTab === 'clientes') renderPromoClientes();
  else if(promoTab === 'ideas') renderPromoIdeas();
  else renderPromoDia();
}

function goToPromoDia(date){
  promoDate = date;
  promoTab = 'dia';
  renderPromocion();
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
  const salaEmployees = DB.employees.filter(e=>(e.area||'cocina')==='sala');
  const allItems = getPromosForDate(date);
  const items = allItems.filter(p => {
    const info = promoDoneInfo(p, date);
    return (!promoFilterResponsable || String(p.responsableId||'')===promoFilterResponsable) &&
      (!promoFilterStatus || (promoFilterStatus==='done' ? !!(info&&info.done) : !(info&&info.done)));
  });

  const listHtml = !allItems.length
    ? `<div class="empty"><i class="ti ti-speakerphone"></i>${t('promo.day.noActions')}</div>`
    : !items.length
    ? `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`
    : `<div class="grid grid-3">
        ${items.map(p => {
          const info = promoDoneInfo(p, date);
          const done = !!(info && info.done);
          return `
          <div class="card">
            <h3 style="justify-content:space-between;font-size:14px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700">
                <input type="checkbox" ${done?'checked':''} onchange="togglePromoDone(${p.id},this.checked,'${date}')">
                <span style="${done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(p.titulo)}</span>
              </label>
              ${p.recurrence==='weekly' ? `<span class="badge badge-blue" style="font-size:10px" title="${t('promo.modal.recurrenceHint')}"><i class="ti ti-repeat"></i></span>` : ''}
            </h3>
            ${p.descripcion ? `<div style="font-size:13px;color:var(--muted)">${escapeHtml(p.descripcion)}</div>` : ''}
            ${p.menuItemName ? `<div style="font-size:12px;margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
              <span class="badge badge-green"><i class="ti ti-discount-2"></i> ${escapeHtml(p.menuItemName)} -${p.discountPct}%</span>
              ${p.horaInicio && p.horaFin ? `<span class="badge" style="font-size:10px"><i class="ti ti-clock"></i> ${escapeHtml(p.horaInicio)}-${escapeHtml(p.horaFin)}</span>` : ''}
              ${p.maxUses ? `<span class="badge" style="font-size:10px" title="${t('promo.modal.maxUsesHint')}"><i class="ti ti-ticket"></i> ${promoUsesToday(p)}/${p.maxUses}</span>` : ''}
            </div>` : ''}
            ${p.responsableId ? `<div style="font-size:12px;color:var(--brand-orange);margin-top:4px"><i class="ti ti-user"></i> ${escapeHtml((DB.employees.find(e=>e.id===p.responsableId)||{}).name||'')}</div>` : ''}
            ${done && info.doneAt ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${t('promo.day.doneOn').replace('${date}', escapeHtml(new Date(info.doneAt).toLocaleString('es-ES')))}</div>` : ''}
            <div class="actions-cell owner-strict" style="margin-top:10px">
              <button class="btn btn-sm btn-icon" onclick="openPromoModal(${p.id})"><i class="ti ti-edit"></i></button>
              <button class="btn btn-sm btn-icon btn-danger" onclick="deletePromo(${p.id})"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        `;}).join('')}
      </div>`;

  const discountStats = promoDiscountTotalForDate(date);
  box.innerHTML = `
    ${discountStats.count ? `<div class="card" style="margin-bottom:12px;padding:10px 14px;display:flex;align-items:center;gap:8px">
      <i class="ti ti-discount-2" style="color:var(--brand-orange)"></i>
      <span style="font-size:13px">${t('promo.day.discountGranted').replace('${amount}', fmtMoney(discountStats.total)).replace('${count}', discountStats.count)}</span>
    </div>` : ''}
    <div class="toolbar">
      <div class="left">
        <input type="date" id="promo-filter-date" value="${date}" onchange="promoDate=this.value;renderPromocion()">
        <select onchange="setPromoFilter('resp', this.value)" style="max-width:180px">
          <option value="">${t('promo.day.allResponsibles')}</option>
          ${salaEmployees.map(e=>`<option value="${e.id}" ${promoFilterResponsable===String(e.id)?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
        </select>
        <select onchange="setPromoFilter('status', this.value)" style="max-width:140px">
          <option value="">${t('promo.day.allStatuses')}</option>
          <option value="done" ${promoFilterStatus==='done'?'selected':''}>${t('promo.day.done')}</option>
          <option value="pending" ${promoFilterStatus==='pending'?'selected':''}>${t('promo.day.pending')}</option>
        </select>
      </div>
      <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> ${t("promo.newAction")}</button>
    </div>
    ${listHtml}
  `;
}

function renderPromoSemana(){
  const box = document.getElementById('promo-tab-content');
  const dates = getWeekDates(promoWeekOffset);

  const headerCells = dates.map((d,i) => {
    const ds = dateStr(d);
    const isToday = ds === todayStr();
    return `<th ${isToday?'style="color:var(--brand-orange)"':''}>${weekDayShort(i)}<br><span style="font-size:10px;font-weight:400">${d.getDate()}/${d.getMonth()+1}</span></th>`;
  }).join('');

  const bodyCells = dates.map(d => {
    const ds = dateStr(d);
    const items = getPromosForDate(ds);
    return `
      <td style="vertical-align:top;min-width:140px">
        ${items.map(p => `
          <div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#fdf1e7);color:var(--brand-orange);font-weight:700;font-size:12px;text-align:left;cursor:pointer;margin-bottom:4px" onclick="openPromoModal(${p.id})">${p.recurrence==='weekly'?'<i class="ti ti-repeat" style="font-size:11px"></i>':''}${escapeHtml(p.titulo)}</div>
        `).join('')}
        <span class="owner-only" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--muted)" onclick="openPromoModal(null, '${ds}')">+</span>
      </td>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="promoWeekOffset--;renderPromocion()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="promoWeekOffset=0;renderPromocion()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="promoWeekOffset++;renderPromocion()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${dates[0].getDate()}/${dates[0].getMonth()+1} – ${dates[6].getDate()}/${dates[6].getMonth()+1}</strong>
      </div>
      <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> ${t('promo.newAction')}</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody><tr>${bodyCells}</tr></tbody>
      </table>
    </div>
  `;
}

function renderPromoMes(){
  const box = document.getElementById('promo-tab-content');
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + promoMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Contadores por día calculados con getPromosForDate para incluir también
  // las apariciones de promos recurrentes, no solo las creadas exactamente
  // ese día.
  let monthTotal = 0, monthDone = 0;
  const dayPromos = {};
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const items = getPromosForDate(ds);
    dayPromos[ds] = items;
    monthTotal += items.length;
    monthDone += items.filter(p => !!(promoDoneInfo(p, ds)||{}).done).length;
  }
  const usedCategories = CONTENT_IDEAS.filter((_, i) => categoryUsedCount(i) > 0).length;

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const count = dayPromos[ds].length;
    const isToday = ds === todayStr();
    cells += `
      <div class="card" style="cursor:pointer;padding:8px;text-align:center;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToPromoDia('${ds}')">
        <div style="font-weight:700">${day}</div>
        ${count ? `<span class="badge badge-blue">${count}</span>` : ''}
      </div>
    `;
  }

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="promoMonthOffset--;renderPromocion()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="promoMonthOffset=0;renderPromocion()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="promoMonthOffset++;renderPromocion()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${monthFull(month)} ${year}</strong>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="printPromoMes(${year},${month})"><i class="ti ti-printer"></i> ${t('promo.print')}</button>
        <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> ${t('promo.newAction')}</button>
      </div>
    </div>
    <div class="grid grid-3" style="margin-bottom:12px">
      <div class="kpi"><div class="label">${t('promo.kpi.actionsThisMonth')}</div><div class="value">${monthTotal}</div></div>
      <div class="kpi ok"><div class="label">${t('promo.kpi.completed')}</div><div class="value">${monthDone} / ${monthTotal}</div></div>
      <div class="kpi"><div class="label">${t('promo.kpi.categoriesUsed')}</div><div class="value">${usedCategories} / ${CONTENT_IDEAS.length}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(7,1fr);gap:6px">
      ${t('days.short').map(d=>`<div style="text-align:center;font-size:12px;font-weight:700;color:var(--muted)">${d}</div>`).join('')}
      ${cells}
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
      rows.push(`<tr><td>${ds}</td><td>${escapeHtml(p.titulo)}</td><td>${escapeHtml(p.descripcion||'')}</td><td>${resp?escapeHtml(resp.name):'—'}</td><td>${done?'<i class="ti ti-check"></i>':'—'}</td></tr>`);
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

function renderPromoIdeas(){
  const box = document.getElementById('promo-tab-content');
  if(promoIdeasCategory === null){
    box.innerHTML = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">
        <i class="ti ti-bulb"></i> ${t('promo.ideas.intro').replace('${count}', contentIdeasTotalCount())}
      </p>
      <button class="owner-only btn btn-primary" style="margin-bottom:14px" onclick="surprisePromoIdea()"><i class="ti ti-dice"></i> ${t('promo.ideas.surpriseMe')}</button>
      <div class="grid grid-3">
        ${CONTENT_IDEAS.map((c, i) => {
          const used = categoryUsedCount(i);
          return `
          <div class="card" style="cursor:pointer" onclick="openPromoIdeasCategory(${i})">
            <h3><i class="ti ${c.icon}"></i> ${escapeHtml(gl(c.cat))}</h3>
            <div style="font-size:12px;color:var(--muted)">${t('promo.ideas.ideasCount').replace('${count}', c.ideas.length)}${used?` · <span style="color:var(--brand-orange)">${t('promo.ideas.usedCount').replace('${count}', used).replace('${s}', used!==1?'s':'')}</span>`:''}</div>
          </div>
        `;}).join('')}
      </div>
    `;
  } else {
    const c = CONTENT_IDEAS[promoIdeasCategory];
    box.innerHTML = `
      <button class="btn btn-sm" style="margin-bottom:10px" onclick="promoIdeasCategory=null;renderPromoIdeas()"><i class="ti ti-arrow-left"></i> ${t('promo.ideas.categories')}</button>
      <h3 style="margin-bottom:10px"><i class="ti ${c.icon}"></i> ${escapeHtml(gl(c.cat))}</h3>
      <div class="grid grid-3">
        ${c.ideas.map((idea, ideaIdx) => {
          const usage = promoIdeaUsage(promoIdeasCategory, ideaIdx);
          const extra = usage.length>1 ? t('promo.ideas.usedMoreTimes').replace('${count}', usage.length-1).replace('${es}', usage.length-1!==1?'es':'') : '';
          return `
          <div class="card">
            <h3 style="font-size:14px">${escapeHtml(gl(idea.title))}</h3>
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${escapeHtml(gl(idea.description))}</div>
            ${usage.length ? `<div style="font-size:11px;color:var(--brand-orange);margin-bottom:8px"><i class="ti ti-check"></i> ${t('promo.ideas.usedOn').replace('${date}', escapeHtml(usage[0].fecha)).replace('${extra}', extra)}</div>` : ''}
            <button class="owner-only btn btn-sm btn-primary" style="width:100%" onclick="createPromoFromIdea(${promoIdeasCategory},${ideaIdx})"><i class="ti ti-plus"></i> ${t('promo.ideas.createAction')}</button>
          </div>
        `;}).join('')}
      </div>
    `;
  }
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
              <div style="width:${pct}%;background:var(--olive-l,var(--brand-orange));height:100%"></div>
            </div>
            <span style="width:56px;text-align:right;font-size:12px;color:var(--muted);flex:none">${n} (${pct}%)</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

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
  const recientes = withContact
    .map(c => ({c, days: c.ultimoContacto ? Math.round((today - new Date(c.ultimoContacto+'T00:00:00')) / 86400000) : null}))
    .filter(x => x.days !== null && x.days >= 0 && x.days <= 7)
    .sort((a,b) => a.days - b.days);
  const inactivos = withContact
    .map(c => ({c, days: c.ultimoContacto ? Math.round((today - new Date(c.ultimoContacto+'T00:00:00')) / 86400000) : null}))
    .filter(x => x.days === null || x.days >= 60)
    .sort((a,b) => (b.days ?? 999999) - (a.days ?? 999999));

  const clientCard = (c, templateKey, badge) => {
    const registered = DB.promos.some(p => p.clienteId===c.id && p.ideaRef && p.ideaRef.clientTemplate===templateKey && p.fecha===todayStr());
    return `
    <div class="card">
      <h3 style="font-size:14px;justify-content:space-between;gap:6px"><span>${escapeHtml(c.name)}</span>${badge}</h3>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!c.phone?`disabled title="${t('promo.clients.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
        <button class="btn btn-sm" style="flex:1" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!c.email?`disabled title="${t('promo.clients.noEmail')}"`:''}><i class="ti ti-mail"></i> Email</button>
      </div>
      <button class="owner-only btn btn-sm" style="width:100%;margin-top:6px" ${registered?'disabled':''} onclick="registerClientOutreachAsPromo(${c.id},'${templateKey}')"><i class="ti ${registered?'ti-check':'ti-calendar-plus'}"></i> ${registered?t('promo.clients.alreadyRegisteredToday'):t('promo.clients.registerAsAction')}</button>
    </div>
  `;};

  box.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-bottom:14px"><i class="ti ti-info-circle"></i> ${t('promo.clients.intro')}</p>

    ${renderReferralSummaryHtml()}

    <h3><i class="ti ti-cake"></i> ${t('promo.clients.upcomingBirthdays')}</h3>
    <div class="grid grid-3" style="margin-bottom:18px">
      ${birthdays.length ? birthdays.map(({c,days}) => clientCard(c, 'cumple', days===0 ? `<span class="badge badge-amber">${t('promo.clients.today')}</span>` : `<span class="badge badge-gray">${t('promo.clients.inDays').replace('${n}', days).replace('${s}', days!==1?'s':'')}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-cake"></i>${t('promo.clients.noBirthdays')}</div>`}
    </div>

    <h3><i class="ti ti-star"></i> ${t('promo.clients.recentVisits')}</h3>
    <div class="grid grid-3" style="margin-bottom:18px">
      ${recientes.length ? recientes.map(({c,days}) => clientCard(c, 'resena', `<span class="badge badge-green">${days===0?t('promo.clients.agoToday'):t('promo.clients.agoDaysSuffix').replace('${n}', days).replace('${s}', days!==1?'s':'')}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-star"></i>${t('promo.clients.noRecentVisits')}</div>`}
    </div>

    <h3><i class="ti ti-mood-empty"></i> ${t('promo.clients.inactiveClients')}</h3>
    <div class="grid grid-3" style="margin-bottom:18px">
      ${inactivos.length ? inactivos.slice(0,12).map(({c,days}) => clientCard(c, 'vuelve', days!=null ? `<span class="badge badge-gray">${t('promo.clients.daysAgo').replace('${n}', days)}</span>` : `<span class="badge badge-gray">${t('promo.clients.noVisits')}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-users"></i>${t('promo.clients.noInactiveClients')}</div>`}
    </div>

    <h3><i class="ti ti-mood-smile"></i> ${t('nps.sectionTitle')}</h3>
    ${renderNpsSummaryHtml()}
    <div class="grid grid-3" style="margin-top:10px">
      ${recientes.length ? recientes.map(({c,days}) => clientCard(c, 'nps', `<span class="badge badge-green">${days===0?t('promo.clients.agoToday'):t('promo.clients.agoDaysSuffix').replace('${n}', days).replace('${s}', days!==1?'s':'')}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-mood-smile"></i>${t('promo.clients.noRecentVisits')}</div>`}
    </div>
  `;
}

// Resumen NPS: media simple (0-10) sobre las últimas respuestas, más las
// últimas con comentario (lo que más útil es leer directamente, ya que un
// número solo no dice nada del porqué).
function renderNpsSummaryHtml(){
  const scores = DB.npsScores || [];
  if(!scores.length){
    return `<div class="empty" style="margin-top:10px"><i class="ti ti-chart-bar"></i>${t('nps.noResponsesYet')}</div>`;
  }
  const avg = (scores.reduce((s,x)=>s+x.score,0) / scores.length).toFixed(1);
  const detractors = scores.filter(x=>x.score<=6).length;
  const withComments = [...scores].filter(x=>x.comment).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5);
  return `
    <div class="card" style="max-width:520px">
      <div style="display:flex;gap:18px;align-items:center">
        <div style="font-size:28px;font-weight:700">${avg}<span style="font-size:14px;color:var(--muted)">/10</span></div>
        <div style="font-size:12.5px;color:var(--muted)">${t('nps.responsesCount').replace('${n}', scores.length)}${detractors ? `<br>${t('nps.detractorsCount').replace('${n}', detractors)}` : ''}</div>
      </div>
      ${withComments.length ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
        ${withComments.map(x => `<div style="font-size:12.5px;border-top:1px solid var(--border);padding-top:6px"><strong>${x.score}/10</strong> — ${escapeHtml(x.comment)}</div>`).join('')}
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
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-message"></i> ${t('promo.clients.messageFor').replace('${name}', escapeHtml(c.name))}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <textarea id="promo-msg-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div class="promo-share-actions" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendPromoClientWhatsapp(${clientId})" ${!c.phone?`disabled title="${t('promo.clients.noPhone')}"`:''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendPromoClientEmail(${clientId}, '${escapeJsAttr((PROMO_MESSAGE_SUBJECTS[templateKey]&&PROMO_MESSAGE_SUBJECTS[templateKey]())||'')}')" ${!c.email?`disabled title="${t('promo.clients.noEmail')}"`:''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('promo.clients.close')}</button>
    </div>
  `);
}

function sendPromoClientWhatsapp(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.phone){ showToast(t('msg.noPhone')); return; }
  const tel = c.phone.replace(/\D/g,'');
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

// Guarda el ideaRef de la idea de contenido con la que se abrió el modal
// (si viene de "Crear acción"/"Sorpréndeme"), para que savePromo lo adjunte
// al crear la promo y así poder marcar esa idea como ya usada.
let pendingPromoIdeaRef = null;
function openPromoModal(id, fecha, prefill){
  const p = id ? DB.promos.find(x=>x.id===id) : {fecha: fecha || promoDate || todayStr(), titulo:(prefill&&prefill.titulo)||'', descripcion:(prefill&&prefill.descripcion)||'', responsableId:null, recurrence:null, menuItemName:null, discountPct:null, horaInicio:null, horaFin:null, maxUses:null};
  pendingPromoIdeaRef = (!id && prefill && prefill.ideaRef) ? prefill.ideaRef : null;
  const ro = !editUnlocked;
  const dis = ro ? 'disabled' : '';
  const dishNames = getAllDishNames();
  const hasDiscount = !!p.menuItemName;

  openModal(`
    <div class="modal-header">
      <h3>${id?t('promo.modal.editTitle'):t('promo.modal.newTitle')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('promo.modal.date')}</label>
      <input type="date" id="promo-date" value="${p.fecha}" ${dis}>
    </div>
    <label class="owner-only" style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:14px;cursor:pointer">
      <input type="checkbox" id="promo-recurrence" ${p.recurrence==='weekly'?'checked':''} style="width:auto" ${dis}>
      ${t('promo.modal.recurrenceLabel')}
    </label>
    <p class="owner-only" style="font-size:12px;color:var(--muted);margin:-10px 0 6px">${t('promo.modal.recurrenceHint')}</p>
    <div class="field">
      <label>${t('promo.modal.title')}</label>
      <input type="text" id="promo-titulo" value="${escapeHtml(p.titulo||'')}" placeholder="${t('promo.modal.titlePlaceholder')}" ${dis}>
    </div>
    <div class="field">
      <label>${t('promo.modal.description')}</label>
      <textarea id="promo-descripcion" placeholder="${t('promo.modal.descriptionPlaceholder')}" ${dis}>${escapeHtml(p.descripcion||'')}</textarea>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:10px;cursor:pointer">
      <input type="checkbox" id="promo-has-discount" ${hasDiscount?'checked':''} style="width:auto" onchange="togglePromoDiscountFields()" ${dis}>
      ${t('promo.modal.hasDiscountLabel')}
    </label>
    <div id="promo-discount-fields" style="display:${hasDiscount?'':'none'}">
      <div class="field-row">
        <div class="field">
          <label>${t('promo.modal.dish')}</label>
          <select id="promo-dish" ${dis}>
            <option value="">${t('label.selectDish')}</option>
            ${dishNames.map(n => `<option value="${escapeHtml(n)}" ${p.menuItemName===n?'selected':''}>${escapeHtml(n)}</option>`).join('')}
          </select>
          ${p.menuItemName && !p.menuItemPlatoId ? `<small style="color:var(--amber,#B8860B)">${t('promo.modal.dishLinkedByNameHint')}</small>` : ''}
        </div>
        <div class="field">
          <label>${t('promo.modal.discountPct')}</label>
          <input type="number" id="promo-discount-pct" min="1" max="100" step="1" value="${p.discountPct||10}" ${dis}>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 6px">${t('promo.modal.discountHint')}</p>
      <div class="field-row">
        <div class="field">
          <label>${t('promo.modal.horaInicio')}</label>
          <input type="time" id="promo-hora-inicio" value="${p.horaInicio||''}" ${dis}>
        </div>
        <div class="field">
          <label>${t('promo.modal.horaFin')}</label>
          <input type="time" id="promo-hora-fin" value="${p.horaFin||''}" ${dis}>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 6px">${t('promo.modal.horaHint')}</p>
      <div class="field">
        <label>${t('promo.modal.maxUses')}</label>
        <input type="number" id="promo-max-uses" min="1" step="1" value="${p.maxUses||''}" placeholder="${t('promo.modal.maxUsesPlaceholder')}" ${dis}>
        ${p.maxUses ? `<small style="color:var(--muted)">${t('promo.modal.usedTodayHint').replace('${used}', (p.usedDates&&p.usedDates[todayStr()])||0).replace('${max}', p.maxUses)}</small>` : ''}
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 6px">${t('promo.modal.maxUsesHint')}</p>
    </div>
    <div class="field">
      <label>${t('promo.modal.responsible')}</label>
      <select id="promo-responsable" ${dis}>
        <option value="">${t('promo.modal.unassigned')}</option>
        ${DB.employees.filter(e=>(e.area||'cocina')==='sala').map(e=>`<option value="${e.id}" ${p.responsableId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${ro?t('promo.modal.close'):t('promo.modal.cancel')}</button>
      ${ro ? '' : `<button class="btn btn-primary" onclick="savePromo(${id||'null'})">${t("common.save")}</button>`}
    </div>
  `);
}
function togglePromoDiscountFields(){
  const checked = document.getElementById('promo-has-discount').checked;
  document.getElementById('promo-discount-fields').style.display = checked ? '' : 'none';
}

function savePromo(id){
  const fecha = document.getElementById('promo-date').value || todayStr();
  const titulo = document.getElementById('promo-titulo').value.trim();
  const descripcion = document.getElementById('promo-descripcion').value.trim();
  const responsableIdRaw = document.getElementById('promo-responsable').value;
  const responsableId = responsableIdRaw ? parseInt(responsableIdRaw) : null;
  const recurrence = document.getElementById('promo-recurrence').checked ? 'weekly' : null;
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

  // Aviso de posible duplicado: en vez de guardarla igual con solo un toast
  // distinto, se ofrece abrir la que ya existe en su lugar.
  const dupe = DB.promos.find(p => p.id!==id && p.fecha===fecha && p.titulo.toLowerCase()===titulo.toLowerCase() && p.responsableId===responsableId);
  if(dupe && !confirm(t('promo.confirmDuplicate'))){
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
      : (promoOccursOn(p2, fecha) || promoOccursOn({fecha, recurrence}, p2.fecha));
    const conflict = DB.promos.find(p2 => p2.id!==id && p2.discountPct && sameDish(p2) && dayOverlaps(p2)
      && promoTimeRangesOverlap({horaInicio, horaFin}, p2));
    if(conflict && !confirm(t('promo.confirmDishDiscountConflict').replace('${dish}', menuItemName).replace('${title}', conflict.titulo))){
      openPromoModal(conflict.id);
      return;
    }
  }

  if(id){
    const promo = DB.promos.find(x=>x.id===id);
    if(!promo){ showToast(t('msg.promoNotFound')); return; }
    Object.assign(promo, {fecha, titulo, descripcion, responsableId, recurrence, menuItemName, menuItemPlatoId, discountPct, horaInicio, horaFin, maxUses});
  }else{
    DB.promos.push({id: genId(), fecha, titulo, descripcion, responsableId, recurrence, menuItemName, menuItemPlatoId, discountPct, horaInicio, horaFin, maxUses, usedDates:{}, done:false, doneAt:null, doneDates:{}, zona:'sala', ideaRef: pendingPromoIdeaRef});
  }
  pendingPromoIdeaRef = null;
  saveDB();
  closeModal();
  renderPromocion();
  showToast(t('msg.actionSaved'));
}

function deletePromo(id){
  if(!confirm(t('msg.confirmDeletePromotion'))) return;
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
    <div class="mn-tramo-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--muted);min-width:52px">${label}</span>
      <input type="time" id="${prefix}-ini" class="mn-horario-time" value="${escapeHtml(tramo.ini||'')}" style="padding:4px 6px;font-size:13px;width:auto;min-height:auto" onchange="saveBusiness(true)">
      <span style="color:var(--muted);font-size:12px">${t('common.to')}</span>
      <input type="time" id="${prefix}-fin" class="mn-horario-time" value="${escapeHtml(finDisplay)}" style="padding:4px 6px;font-size:13px;width:auto;min-height:auto" onchange="saveBusiness(true)">
      <span style="font-size:11px;color:var(--muted)">${t('mn.schedule.midnightHint')}</span>
    </div>
  `;
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
        <select id="mn-hor-${i}-modo" onchange="toggleHorarioModo(${i})" style="padding:2px 4px;font-size:11px;width:auto;min-height:auto;display:${d.abierto!==false?'inline-block':'none'}">
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
  return `<div class="mn-horario-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${cards.join('')}</div>`;
}

function toggleHorarioDia(i){
  const open = document.getElementById(`mn-hor-${i}-abierto`).checked;
  document.getElementById(`mn-hor-${i}-turnos`).style.display = open ? 'block' : 'none';
  document.getElementById(`mn-hor-${i}-modo`).style.display = open ? 'inline-block' : 'none';
  saveBusiness(true);
}

function toggleHorarioModo(i){
  const seguido = document.getElementById(`mn-hor-${i}-modo`).value === 'seguido';
  document.getElementById(`mn-hor-${i}-seguido-box`).style.display = seguido ? 'block' : 'none';
  document.getElementById(`mn-hor-${i}-turnos-box`).style.display = seguido ? 'none' : 'block';
  saveBusiness(true);
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
function renderMiNegocio(){
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
    <div class="card" style="border:2px solid var(--teal);background:var(--teal-l, #eef7f6)">
      <h3 style="color:var(--teal)"><i class="ti ti-key"></i> ${t('mn.businessCode.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.businessCode.desc')}</p>
      <div style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border)">${escapeHtml((getBusinessSlots().find(s=>s.id===ACTIVE_SLOT)||{}).code || '—')}</div>
    </div>

    <!-- El PIN de aquí abajo NO es la contraseña de acceso del propietario:
         esa es por dispositivo (gastrogoan_owner_login), no por negocio, y su
         cambio vive en la pantalla de elegir negocio (renderBusinessSelectScreenHtml,
         js/core.js) — un único sitio, en vez de repetirlo en cada Mi Negocio
         cuando el dueño tiene varios locales. Este PIN, en cambio, sí es
         propio de este negocio: confirma acciones delicadas del día a día. -->
    <div class="card" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
      <h3 style="color:var(--brand-orange)"><i class="ti ti-lock"></i> ${t('mn.ownerAccess.title')}</h3>
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
        <div class="field">
          <label>${t('mn.business.brandColor')}</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="color" id="mn-brand-color" value="${escapeHtml(b.brandColor||'#4A5D4E')}" style="width:48px;height:36px;padding:2px;cursor:pointer" onchange="saveBusiness(true)">
            <span style="font-size:12px;color:var(--muted)">${t('mn.business.brandColorHint')}</span>
          </div>
        </div>
      </div>

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
        <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:${redsysIsConfigured?'pointer':'default'}">
          <input type="checkbox" id="mn-require-deposit" style="width:auto" ${(b.requireDeposit && redsysIsConfigured)?'checked':''} ${redsysIsConfigured?'':'disabled'} onchange="saveBusiness(true);renderMiNegocio()">
          ${t('mn.ops.requireDeposit')}
        </label>
        <small id="mn-require-deposit-hint" style="display:block;color:${redsysIsConfigured?'var(--muted)':'var(--brand-orange)'}">${redsysIsConfigured ? t('mn.ops.requireDepositDesc') : t('mn.ops.requireDepositNeedsRedsys')}</small>
        ${!redsysIsConfigured ? `<button class="btn btn-sm" style="margin-top:6px" onclick="scrollToMnCard('mn-card-redsys')" type="button"><i class="ti ti-credit-card"></i> ${t('mn.ops.goToRedsys')}</button>` : ''}
      </div>
      ${(b.requireDeposit && redsysIsConfigured) ? `
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
        <label>${t('mn.ops.depositInstructions')}</label>
        <textarea id="mn-deposit-instructions" rows="2" placeholder="${t('mn.ops.depositInstructionsPh')}" onchange="saveBusiness(true)">${escapeHtml(b.depositInstructions||'')}</textarea>
        <small style="color:var(--muted)">${t('mn.ops.depositInstructionsDesc')}</small>
      </div>` : ''}
      <h4 style="margin:16px 0 4px"><i class="ti ti-layout-grid"></i> ${t('mn.ops.floorPlan')}</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('mn.ops.floorPlanDesc')}</p>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.ops.zoneName')}</label>
          <input type="text" id="mn-zona-nombre" placeholder="${t('mn.ops.zoneNamePh')}">
        </div>
        <div class="field">
          <label>${t('mn.ops.tableCount')}</label>
          <input type="number" id="mn-zona-cantidad" min="1" max="50" value="4">
        </div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="addZonaConMesas()"><i class="ti ti-plus"></i> ${t('mn.ops.createZone')}</button>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <h4 style="margin:0 0 8px"><i class="ti ti-list-details"></i> ${t('mn.ops.configuredTables')}</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('mn.ops.configuredTablesDesc')}</p>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:2px;padding:0 78px 0 0">
        <span style="flex:1"></span>
        <span style="width:64px;font-size:11px;font-weight:700;color:var(--muted);text-align:center;text-transform:uppercase">${t('mn.ops.seatsPerTable')}</span>
      </div>
      <div id="mn-mesas-list"></div>
      <div id="mn-aforo-warning"></div>
    </div>

    ${renderTicketConfigCard()}

    ${renderTableQrCard()}

    ${renderComandaPrintCard()}

    ${renderOnlineCard()}

    ${renderPedidosConfigCard()}

    ${renderDeliveryPlatformsCard()}

    ${renderRedsysCard()}

    ${renderEmailConfirmCard()}

    ${renderVerifactuConfigCard()}

    ${renderDataMaintenanceCard()}
    </div>
  `;
  loadRedsysCardStatus();
  renderMesasConfigList();
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
      ${z ? `<input type="text" value="${escapeHtml(zonaLabel(z))}" onchange="renameZona('${escapeJsAttr(z)}', this.value)" title="${t('mn.ops.renameZone')}" style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;border:1px solid transparent;background:transparent;padding:2px 4px;border-radius:4px;flex:1;min-width:80px;max-width:220px" onfocus="this.style.borderColor='var(--border)'" onblur="this.style.borderColor='transparent'">`
        : `<span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;flex:1">${t('mn.ops.noZone')}</span>`}
      ${z ? `<button class="btn btn-sm btn-icon" onclick="addTableToZona('${escapeJsAttr(z)}')" title="${t('mn.ops.addTableToZone')}"><i class="ti ti-plus"></i></button>` : ''}
      ${z ? `<button class="btn btn-sm btn-icon btn-danger" onclick="deleteZonaCompleta('${escapeJsAttr(z)}')" title="${t('mn.ops.deleteWholeZone')}"><i class="ti ti-trash"></i></button>` : ''}
    </div>`;
    html += tables.map(t2 => {
      return `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="text" value="${escapeHtml(t2.name||'')}" onchange="updateTableName(${t2.id}, this.value)" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="${t('mn.ops.tableNamePh')}">
        <input type="number" min="1" max="50" value="${t2.plazas||''}" onchange="updateTablePlazas(${t2.id}, this.value)" style="width:64px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="${t('mn.ops.seats')}" title="${t('mn.ops.seatsOptional')}">
        <button class="btn btn-sm btn-icon btn-danger" onclick="deleteTableFromConfig(${t2.id})" title="${t('mn.ops.deleteTable')}"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join('');
  });
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
  box.innerHTML = msg ? `<p style="font-size:12px;color:var(--brand-orange);margin-top:8px"><i class="ti ti-alert-triangle"></i> ${msg}</p>` : '';
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
function deleteZonaCompleta(zona){
  const tables = DB.tables.filter(tb => tb.zona === zona);
  if(tables.some(tb => getOpenOrderForTable(tb.id))){
    showToast(t('msg.cannotDeleteZoneOpenOrders'));
    return;
  }
  if(!confirm(t('msg.confirmDeleteZone').replace('${name}', zonaLabel(zona)).replace('${count}', tables.length))) return;
  clearDanglingTableRefs(tables.map(tb => tb.id));
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
function addZonaConMesas(){
  const nombre = (document.getElementById('mn-zona-nombre').value||'').trim();
  const cantidad = Math.max(1, Math.min(50, parseInt(document.getElementById('mn-zona-cantidad').value)||0));
  if(!nombre){ showToast(t('msg.enterZoneName')); return; }
  if(!Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = getZonaOrder();
  if(!DB.business.zonaOrder.includes(nombre)) DB.business.zonaOrder.push(nombre);
  const existingInZone = DB.tables.filter(t => t.zona === nombre).length;
  // Si la zona ya tiene mesas, confirma antes de añadir más: evita duplicar
  // el rango entero por pulsar el botón dos veces sin darse cuenta.
  if(existingInZone > 0 && !confirm(t('msg.confirmAddMoreTablesToZone').replace('${zone}', nombre).replace('${count}', existingInZone))) return;
  // Las plazas de cada mesa se rellenan después, en "Mesas configuradas"
  // (más abajo en esta misma pantalla) — no se piden aquí para no obligar a
  // que todas las mesas de una zona tengan la misma capacidad de entrada.
  for(let i = 1; i <= cantidad; i++){
    DB.tables.push({id: genId(), name: `Mesa ${existingInZone+i}`, zona: nombre, plazas: null});
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
  // Misma validación que addZonaConMesas, por si algún dato heredado quedara
  // fuera de rango (p.ej. importado de otra fuente).
  if(plazas != null) plazas = Math.max(1, Math.min(50, parseInt(plazas)||0)) || null;
  DB.tables.push({id: genId(), name: `Mesa ${tablesInZone.length+1}`, zona, plazas});
  saveDB();
  renderMesasConfigList();
  if(plazas == null && tablesInZone.length) showToast(t('mn.ops.seatsHintSingle'));
}

function updateTableName(id, val){
  const tbl = DB.tables.find(x => x.id === id);
  if(!tbl) return;
  tbl.name = (val||'').trim() || tbl.name;
  saveDB();
}
// Nº de plazas de la mesa (opcional): se usa solo para avisar en Reservas si
// un grupo no cabe, no limita nada por sí sola en el TPV.
function updateTablePlazas(id, val){
  const tbl = DB.tables.find(x => x.id === id);
  if(!tbl) return;
  const n = parseInt(val);
  tbl.plazas = (n && n > 0) ? n : null;
  saveDB();
}
function deleteTableFromConfig(id){
  const order = getOpenOrderForTable(id);
  // Si la comanda tiene platos sin cobrar, no se puede borrar la mesa desde
  // aquí: antes se marcaba como "pagada" sin generar venta, sin descontar
  // stock y sin dejar ningún registro, perdiendo esa comanda sin rastro.
  // Hay que cobrarla o vaciarla desde el TPV primero.
  if(order && order.items && order.items.length){
    showToast(t('msg.tableHasOpenOrderItems'));
    return;
  }
  if(!confirm(t('msg.confirmDeleteTable'))) return;
  if(order){
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
function getDBSizeKB(){
  return Math.round(JSON.stringify(DB).length / 1024 * 10) / 10;
}

function renderDataMaintenanceCard(){
  const sizeKB = getDBSizeKB();
  const ventasAntiguas = DB.sales.filter(s => s.date && s.date < dataMaintenanceCutoff()).length;
  const reservasAntiguas = DB.reservations.filter(r => r.date && r.date < dataMaintenanceCutoff() && (r.status==='completada'||r.status==='cancelada')).length;
  const cierresAntiguos = DB.cashClosures.filter(c => c.fecha && c.fecha < dataMaintenanceCutoff()).length;
  return `
    <div class="card">
      <h3><i class="ti ti-database"></i> ${t('mn.data.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.data.sizeDesc').replace('${size}', sizeKB + ' KB')}</p>
      <button class="btn btn-sm" onclick="downloadFullBackup()"><i class="ti ti-download"></i> ${t('mn.data.downloadBackup')}</button>
      <div style="font-size:12px;color:${daysSinceLastBackup()>=BACKUP_REMINDER_DAYS?'var(--red)':'var(--muted)'};margin-top:6px">
        ${daysSinceLastBackup()===Infinity ? t('mn.data.neverBackedUp') : t('mn.data.lastBackup').replace('${n}', daysSinceLastBackup())}
      </div>
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
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('mn.data.archivePreview').replace('${sales}', ventasAntiguas).replace('${reservations}', reservasAntiguas).replace('${closures}', cierresAntiguos)}</p>
      <button class="btn btn-sm btn-danger" onclick="archiveOldData()"><i class="ti ti-archive"></i> ${t('mn.data.archiveAndDownload')}</button>
    </div>
  `;
}

// Por defecto, sugiere archivar todo lo anterior a hace 1 año
function dataMaintenanceCutoff(){
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0,10);
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
function checkArchiveReminder(){
  const cutoff = dataMaintenanceCutoff();
  const oldCount = DB.sales.filter(s => s.date && s.date < cutoff).length
    + DB.reservations.filter(r => r.date && r.date < cutoff && (r.status==='completada'||r.status==='cancelada')).length
    + DB.cashClosures.filter(c => c.fecha && c.fecha < cutoff).length;
  const btn = document.getElementById('archive-reminder-btn');
  if(btn) btn.style.display = oldCount >= 50 ? '' : 'none';
}

function goToArchiveFromReminder(){
  navigate('minegocio');
  setTimeout(() => {
    const el = document.getElementById('mn-archive-before');
    if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
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
  const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadFullBackup(){
  downloadJSON(DB, `gastrogoan-backup-${todayStr()}.json`);
  if(!DB.business) DB.business = {};
  DB.business.lastBackupAt = new Date().toISOString();
  saveDB();
  checkBackupReminder();
  showToast(t('msg.backupDownloaded'));
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
// sesión — una vez por sesión, para no ser pesado si el dueño decide
// posponerlo y sigue trabajando — con un botón directo para descargarla ya.
let backupReminderShownThisSession = false;
function checkBackupReminder(){
  if(backupReminderShownThisSession) return;
  if(daysSinceLastBackup() < BACKUP_REMINDER_DAYS) return;
  const session = getAccessSession();
  if(!session || session.type !== 'owner') return;
  backupReminderShownThisSession = true;
  openBackupReminderModal();
}
function openBackupReminderModal(){
  const never = daysSinceLastBackup() === Infinity;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cloud-download"></i> ${t('hdr.backup')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px">${never ? t('mn.data.neverBackedUp') : t('mn.data.lastBackup').replace('${n}', daysSinceLastBackup())}</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('msg.backupRemindLater')}</button>
      <button class="btn btn-primary" onclick="closeModal();downloadFullBackup()"><i class="ti ti-download"></i> ${t('mn.data.downloadBackup')}</button>
    </div>
  `);
}

function archiveOldData(){
  const before = document.getElementById('mn-archive-before').value;
  if(!before){ showToast(t('msg.chooseDate')); return; }
  const sales = DB.sales.filter(s => s.date && s.date < before);
  const reservations = DB.reservations.filter(r => r.date && r.date < before && (r.status==='completada'||r.status==='cancelada'));
  const cashClosures = DB.cashClosures.filter(c => c.fecha && c.fecha < before);
  const total = sales.length + reservations.length + cashClosures.length;
  if(total === 0){ showToast(t('msg.noDataToArchive')); return; }
  if(!confirm(t('msg.confirmArchiveDataStrong').replace('${sales}', sales.length).replace('${reservations}', reservations.length).replace('${closures}', cashClosures.length).replace('${date}', before))) return;
  try{
    downloadJSON({ before, sales, reservations, cashClosures }, `gastrogoan-archivo-hasta-${before}.json`);
  }catch(e){
    showToast(t('msg.backupFailedNoDelete'));
    return;
  }
  DB.sales = DB.sales.filter(s => !(s.date && s.date < before));
  DB.reservations = DB.reservations.filter(r => !(r.date && r.date < before && (r.status==='completada'||r.status==='cancelada')));
  DB.cashClosures = DB.cashClosures.filter(c => !(c.fecha && c.fecha < before));
  saveDB();
  checkArchiveReminder();
  checkBackupReminder();
  renderMiNegocio();
  showToast(t('msg.dataArchived'));
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

function removeLogo(){
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  DB.business.logo = '';
  saveDB();
  renderMiNegocio();
  renderHeader();
}

function renderHeader(){
  const b = DB.business || {};
  const icon = document.getElementById('app-logo-icon');
  icon.innerHTML = `<img src="${b.logo || GASTROGOAN_LOGO_URI}" alt="Logo">`;
  const text = document.getElementById('app-logo-text');
  if(b.name){
    text.innerHTML = `${escapeHtml(b.name)}<span class="app-logo-sub" style="margin-left:8px">GastroGoan · ${t('hdr.subtitle')}</span>`;
  }else{
    text.innerHTML = `GastroGoan<span style="color:var(--olive);font-size:18px;line-height:1;margin:0 2px">·</span><span class="app-logo-sub">${t('hdr.subtitle')}</span>`;
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
function logoutAccessSession(){
  if(!confirm(t('msg.confirmLogout'))) return;
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

function saveBusiness(silent){
  const el = id => document.getElementById(id);
  if(!DB.business) DB.business = {};
  if(el('business-name')) DB.business.name = el('business-name').value.trim();
  if(el('business-address')) DB.business.address = el('business-address').value.trim();
  if(el('business-phone')) DB.business.phone = el('business-phone').value.trim();
  if(el('business-email')) DB.business.email = el('business-email').value.trim();
  if(el('business-description')) DB.business.description = el('business-description').value.trim();
  if(el('mn-tipo')) DB.business.tipo = el('mn-tipo').value;
  if(el('mn-anyo')) DB.business.anyo = el('mn-anyo').value.trim();
  if(el('mn-web')) DB.business.web = el('mn-web').value.trim();
  if(el('mn-cif')) DB.business.cif = el('mn-cif').value.trim();
  if(el('mn-prop')) DB.business.prop = el('mn-prop').value.trim();
  if(el('mn-brand-color')) DB.business.brandColor = el('mn-brand-color').value;
  if(el('mn-aforo')) DB.business.aforo = Math.max(0, parseInt(el('mn-aforo').value) || 0) || '';
  if(el('mn-reserva-duracion')) DB.business.reservaDuracionMin = Math.max(0, parseInt(el('mn-reserva-duracion').value) || 0) || '';
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
  if(el('mn-require-deposit')) DB.business.requireDeposit = el('mn-require-deposit').checked && redsysIsConfigured;
  if(el('mn-deposit-amount')) DB.business.depositAmount = Math.max(0, parseFloat(el('mn-deposit-amount').value) || 0) || '';
  if(el('mn-deposit-type')) DB.business.depositType = el('mn-deposit-type').value;
  if(el('mn-deposit-instructions')) DB.business.depositInstructions = el('mn-deposit-instructions').value.trim();
  if(el('mn-ig')) DB.business.ig = el('mn-ig').value.trim();
  if(el('mn-fb')) DB.business.fb = el('mn-fb').value.trim();
  if(el('mn-gmaps')) DB.business.gmaps = el('mn-gmaps').value.trim();
  if(el('mn-tiktok')) DB.business.tiktok = el('mn-tiktok').value.trim();
  if(el('mn-serv-mesa') && el('mn-serv-takeaway') && el('mn-serv-delivery')) {
    DB.business.tiposServicio = {
      mesa: el('mn-serv-mesa').checked,
      takeaway: el('mn-serv-takeaway').checked,
      delivery: el('mn-serv-delivery').checked,
    };
  }
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
    if(!confirm(horarioWarnings[0] + '\n\n' + t('msg.confirmSaveAnyway'))){
      horarioRechazado = true;
    }
  }
  DB.business.horario = horarioRechazado ? (DB.business.horario||newHorario) : newHorario;
  // Se avisa con el mayor de los dos (reservas/pedidos): si ese ya encaja en
  // el horario, el otro (siempre menor o igual) también encaja.
  const leadTimeWarning = leadTimeVsHorarioWarning(DB.business.horario, Math.max(DB.business.leadTimeMinReservas||0, DB.business.leadTimeMinPedidos||0));
  saveDB();
  // El selector de negocios mostraba siempre "Mi negocio", el nombre de
  // relleno con el que nace el hueco: nadie sincronizaba el nombre real con
  // él (updateActiveSlotName existía pero no la llamaba nadie). Con un solo
  // negocio se notaba poco; con varios, todos se llamaban igual y no había
  // forma de distinguirlos en la pantalla desde la que se elige.
  updateActiveSlotName(DB.business.name);
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

// Compara el tiempo mínimo de antelación (lead time) con la duración del
// horario de apertura de cada día abierto: si algún día el negocio abre
// menos tiempo del que exige la antelación configurada, el pedido nunca
// podría prepararse a tiempo ese día, así que avisamos (sin bloquear).
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
            ${c.telefono ? `<a class="btn btn-sm btn-icon" style="color:#25D366" href="https://wa.me/${c.telefono.replace(/[^0-9]/g,'')}" target="_blank" rel="noopener" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
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
function deleteOwnCourier(id){
  if(!confirm(t('msg.confirmDeleteCourier'))) return;
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
  const data = {nombre, comisionPct, ivaPct: (isNaN(ivaPct)||ivaPct<0) ? 0 : Math.min(100, ivaPct), comisionSobreEnvio};
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
function deleteDeliveryPlatform(id){
  if(!confirm(t('msg.confirmDeletePlatform'))) return;
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
          <input type="checkbox" id="tk-nif" ${tc.mostrarNif!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.ticket.showTaxId')}
        </label>
      </div>
      <div class="field">
        <label>${t('mn.ticket.footerMessage')}</label>
        <textarea id="tk-pie" placeholder="${t('ph.egTicketFooter')}">${escapeHtml(tc.pie||'')}</textarea>
      </div>
      <div class="field">
        <label>${t('mn.ticket.vatPct')}</label>
        <input type="number" id="tk-iva" min="0" max="100" step="0.1" value="${tc.ivaPct!=null?tc.ivaPct:10}" style="max-width:120px">
        <small style="color:var(--muted)">${t('mn.ticket.vatDescLong')}</small>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveTicketConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
        <button class="btn btn-sm" onclick="previewTicketConfig()"><i class="ti ti-eye"></i> ${t('mn.ticket.preview')}</button>
      </div>
      ${thermalPrintingSupported() ? `
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="ti ti-device-usb"></i> ${t('thermal.sectionTitle')}</p>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('thermal.sectionDesc')}</p>
      <button class="btn btn-sm" onclick="connectThermalPrinter()"><i class="ti ti-bluetooth"></i> ${t('thermal.connectBtn')}</button>
      ` : `
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:12.5px;color:var(--muted)"><i class="ti ti-device-usb-off"></i> ${t('thermal.notSupportedHint')}</p>
      `}
    </div>
  `;
}

// Vista previa del ticket de cliente con datos de ejemplo, usando el mismo
// generador de texto que el TPV al cobrar (buildTicketText), para que el
// dueño vea de verdad el resultado con su configuración actual (dirección,
// teléfono, web, NIF, pie e IVA) sin tener que hacer una venta de prueba.
function previewTicketConfig(){
  const sampleSale = {
    date: new Date().toLocaleString('es-ES'),
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
  const vf = (DB.business && DB.business.verifactu) || {enabled:false, provider:'', apiKey:''};
  const pendingSales = (DB.sales||[]).filter(s => s.verifactu && s.verifactu.status === 'pending');
  const providerOptions = Object.keys(VERIFACTU_PROVIDERS).map(k =>
    `<option value="${k}" ${vf.provider===k?'selected':''}>${escapeHtml(VERIFACTU_PROVIDERS[k].label)}</option>`
  ).join('');
  return `
    <div class="card" style="position:relative;opacity:0.85">
      <h3 style="display:flex;align-items:center;gap:8px">
        <i class="ti ti-file-invoice"></i> ${t('mn.verifactu.title')}
        <span class="badge" style="background:var(--muted,#888);color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:10.5px"><i class="ti ti-hourglass-low"></i> ${t('mn.verifactu.draftBadge')}</span>
      </h3>
      <div style="background:var(--bg-soft,#f4f4f4);border:1px dashed var(--border);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.55;margin-bottom:12px;color:var(--muted)">
        <p style="margin:0">${t('mn.verifactu.draftNotice')}</p>
      </div>
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
      ${pendingSales.length ? `<p style="font-size:12.5px;color:var(--brand-orange);cursor:pointer" onclick="openVerifactuPendingModal()"><i class="ti ti-alert-triangle"></i> ${t('mn.verifactu.pendingCount').replace('${n}', pendingSales.length)} <span style="text-decoration:underline">${t('common.viewDetail')}</span></p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <button class="btn btn-primary" onclick="saveVerifactuConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px">
        <h3 style="font-size:14px"><i class="ti ti-file-shield"></i> ${t('mn.verifactu.declarationsTitle')}</h3>
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${t('mn.verifactu.declarationsDesc')}</p>
        ${renderVerifactuDeclarationRow('ownDeclarationUrl', t('mn.verifactu.ownDeclaration'), t('mn.verifactu.ownDeclarationPending'))}
        ${renderVerifactuDeclarationRow('providerDeclarationUrl', t('mn.verifactu.providerDeclaration'), t('mn.verifactu.providerDeclarationPending'))}
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
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:4px"><i class="ti ti-external-link"></i> ${t('common.view')}</a>`
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
  DB.business.verifactu = {...vfPrev, enabled, provider, apiKey, domain, lockedOnce: vfPrev.lockedOnce || enabled};
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
        <label class="ge-item" style="flex:1;min-width:200px;cursor:pointer;gap:10px;${modo==='pantalla'?'border-color:var(--brand-orange);background:var(--brand-cream)':''}">
          <input type="radio" name="comanda-modo" value="pantalla" ${modo==='pantalla'?'checked':''} onchange="setComandaModo('pantalla')" style="width:18px;height:18px">
          <span><strong>${t('mn.comandas.modeScreen')}</strong><br><small style="color:var(--muted)">${t('mn.comandas.modeScreenDesc')}</small></span>
        </label>
        <label class="ge-item" style="flex:1;min-width:200px;cursor:pointer;gap:10px;${modo==='impresion'?'border-color:var(--brand-orange);background:var(--brand-cream)':''}">
          <input type="radio" name="comanda-modo" value="impresion" ${modo==='impresion'?'checked':''} onchange="setComandaModo('impresion')" style="width:18px;height:18px">
          <span><strong>${t('mn.comandas.modePrint')}</strong><br><small style="color:var(--muted)">${t('mn.comandas.modePrintDesc')}</small></span>
        </label>
      </div>
      ${modo === 'impresion' ? `
      <div id="comanda-printers-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${printers.length ? printers.map(p=>`
          <div class="ge-item" style="flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-right:8px">
              <input type="checkbox" ${p.activo?'checked':''} onchange="toggleComandaPrinter('${p.id}', this.checked)" style="width:18px;height:18px">
            </label>
            <input type="text" value="${escapeHtml(p.nombre)}" onchange="renameComandaPrinter('${p.id}', this.value)" placeholder="${t('ph.egPrinterName')}" style="flex:1;min-width:120px;font-weight:600">
            <select onchange="setComandaPrinterAncho('${p.id}', this.value)" style="max-width:170px">
              <option value="80" ${p.anchoTicket!=58?'selected':''}>80 mm (${t('mn.comandas.standard')})</option>
              <option value="58" ${p.anchoTicket==58?'selected':''}>58 mm (${t('mn.comandas.compact')})</option>
            </select>
            <select onchange="setComandaPrinterContenido('${p.id}', this.value)" style="max-width:170px">
              <option value="comida" ${p.contenido==='comida'?'selected':''}>${t('mn.comandas.contentFood')}</option>
              <option value="bebida" ${p.contenido==='bebida'?'selected':''}>${t('mn.comandas.contentDrinks')}</option>
              <option value="todo" ${p.contenido==='todo'?'selected':''}>${t('mn.comandas.contentAll')}</option>
            </select>
            <button class="btn btn-sm" onclick="testComandaPrint('${p.id}')"><i class="ti ti-printer"></i> ${t('mn.comandas.testPrint')}</button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="deleteComandaPrinter('${p.id}')"><i class="ti ti-trash"></i></button>
          </div>`).join('')
        : `<div class="empty" style="padding:12px 16px">${t('mn.comandas.empty')}</div>`}
      </div>
      <button class="btn btn-sm" onclick="addComandaPrinter()"><i class="ti ti-plus"></i> ${t('mn.comandas.addPrinter')}</button>
      ` : ''}
    </div>
  `;
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
function addComandaPrinter(){
  const printers = ensureComandaPrinters();
  printers.push({id: genId(), nombre: t('mn.comandas.newPrinterName'), activo:true, anchoTicket:80, contenido:'todo'});
  saveDB();
  renderMiNegocio();
}
function deleteComandaPrinter(id){
  if(!confirm(t('msg.confirmDeletePrinter'))) return;
  DB.business.comandas.printers = ensureComandaPrinters().filter(p=>p.id!=id);
  saveDB();
  renderMiNegocio();
}
// Imprime un vale de comanda (cocina, sala, barra...) con las líneas marchadas.
function printComandaTicket(destino, titulo, lineas, anchoTicket, alergenos){
  if(!lineas || !lineas.length) return;
  const ancho = anchoTicket || 80;
  const widthPx = ancho == 58 ? 200 : 280;
  const hora = new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
  const filas = lineas.map(l => `<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-bottom:3px"><span>${escapeHtml(l.qty)}× ${escapeHtml(l.name)}</span></div>${l.notas?`<div style="font-size:12px;margin:0 0 4px 10px">▸ ${escapeHtml(l.notas)}</div>`:''}`).join('');
  // Alérgenos de la mesa (independiente de cualquier cliente vinculado): se
  // imprime destacado arriba del todo, en grande, para que no pase
  // desapercibido entre las líneas del pedido.
  const alergenosHtml = alergenos ? `<div style="border:2px solid #000;padding:4px 6px;margin-bottom:6px;font-weight:700;font-size:14px;text-align:center">⚠ ${escapeHtml(alergenos)}</div>` : '';
  const win = window.open('', '_blank', `width=${widthPx+40},height=520`);
  if(!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title></head>
    <body style="font-family:monospace;width:${widthPx}px;padding:8px;margin:0">
      <div style="text-align:center;font-weight:700;font-size:16px;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:6px">${escapeHtml(destino)}</div>
      <div style="font-size:13px;margin-bottom:6px">${escapeHtml(titulo)} · ${hora}</div>
      ${alergenosHtml}
      ${filas}
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}
function testComandaPrint(printerId){
  const sample = [{qty:2, name:'Ejemplo de plato', notas:'sin sal', bebida:false}, {qty:1, name:'Ejemplo de bebida', bebida:true}];
  let printer = printerId ? ensureComandaPrinters().find(p=>p.id==printerId) : null;
  if(!printer) printer = {nombre:'COCINA', anchoTicket:80, contenido:'todo'};
  const lineas = printer.contenido==='todo' ? sample : sample.filter(l => printer.contenido==='comida' ? !l.bebida : l.bebida);
  if(!lineas.length){ showToast(t('mn.comandas.testNoLines')); return; }
  printComandaTicket(printer.nombre, 'Mesa de prueba', lineas, printer.anchoTicket);
}

function saveTicketConfig(){
  DB.business.ticket = {
    pie: document.getElementById('tk-pie').value.trim(),
    mostrarDireccion: document.getElementById('tk-direccion').checked,
    mostrarTelefono: document.getElementById('tk-telefono').checked,
    mostrarWeb: document.getElementById('tk-web').checked,
    mostrarNif: document.getElementById('tk-nif').checked,
    ivaPct: parseFloat(document.getElementById('tk-iva').value) || 0
  };
  saveDB();
  renderMiNegocio();
  showToast(t('msg.ticketConfigSaved'));
}

// Cambiar el PIN de Gestión es tan sensible como cualquier otra acción
// protegida esta sesión (borrar cliente, ingrediente...): exige el PIN
// actual antes de aceptar uno nuevo, no basta con tener Gestión ya abierta.
// Registro ligero de cambios en ajustes sensibles del negocio (PIN,
// comisiones de delivery...), para poder consultar más adelante qué cambió
// y cuándo — mismo espíritu que el historial de Stock/Personal.
function logBusinessSettingChange(desc){
  if(!DB.settingsLog) DB.settingsLog = [];
  DB.settingsLog.push({id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), desc});
  if(DB.settingsLog.length > 300) DB.settingsLog = DB.settingsLog.slice(-300);
}

function changeOwnerPin(){
  const n1 = document.getElementById('mn-pin-new').value;
  const n2 = document.getElementById('mn-pin-new2').value;
  if(!/^\d{4}$/.test(n1)){ showToast(t('msg.pinMustBe4')); return; }
  if(n1 !== n2){ showToast(t('msg.pinsDontMatch')); return; }
  if(DB.business.pinSet && n1 === DB.business.pin){ showToast(t('msg.pinSameAsOld')); return; }
  const WEAK_PINS = ['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','1212','2580','0123'];
  const isWeak = WEAK_PINS.includes(n1);
  requestBusinessPinAction(t('title.changeOwnerPin'), t('msg.confirmCurrentPin'), () => {
    DB.business.pin = n1;
    DB.business.pinSet = true;
    logBusinessSettingChange('PIN del negocio cambiado');
    saveDB();
    renderMiNegocio();
    showToast(isWeak ? t('msg.pinTooWeak') : t('msg.pinUpdated'));
  });
}

/* ============================================================
   MANUAL DE USO — Guía rápida de la app
   ============================================================ */
let manualChapter = 0;
const MANUAL_CHAPTERS = [
  {
    title:{es:'<i class="ti ti-rocket"></i> Cómo empezar', ca:'<i class="ti ti-rocket"></i> Com començar', en:'<i class="ti ti-rocket"></i> Getting Started'},
    content:{es:`<h3>Qué es GastroGoan y cómo está organizado</h3>
    <p>GastroGoan es un <strong>kit de gestión integral</strong> para bares y restaurantes: un único sistema donde la información fluye de un módulo a otro sin que tengas que copiar nada a mano. La app está dividida en tres grandes áreas, accesibles desde la pantalla de inicio:</p>
    <ul>
      <li><strong>Cocina</strong> — ingredientes, recetas, escandallos, fichas técnicas, stock, pedidos a proveedores, personal y limpieza del lado de cocina.</li>
      <li><strong>Sala</strong> — los mismos módulos pero para el equipo de sala, más TPV, clientes, reservas y promoción.</li>
      <li><strong>Gestión</strong> — la parte económica y administrativa: finanzas, panel de control, datos del negocio y este manual.</li>
    </ul>
    <p>La idea central es que <strong>cada dato se introduce una sola vez</strong> y se reutiliza en cascada: el precio de un ingrediente en la Mega Lista recalcula el coste de la receta en el Escandallo, esa receta alimenta la Ficha Técnica y la Carta, la Carta se usa en el TPV, y las ventas del TPV alimentan automáticamente la Gestión Económica, el Stock y el Panel de Control. Si sigues el orden correcto desde el principio, te ahorrarás trabajo repetido y los números del negocio estarán siempre actualizados solos.</p>
    <h4>Ruta recomendada para configurar tu negocio desde cero</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Mi Negocio</strong> (en Gestión) — Es el primer paso siempre. Rellena el nombre, dirección, horario semanal, tipos de servicio (mesa/take away/delivery) y configuración del ticket. Estos datos personalizan toda la app: aparecen en los tickets impresos, en la web de pedidos online y condicionan qué carta se activa en cada horario.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Mega Lista</strong> (en Cocina) — Da de alta todos los ingredientes y productos que compras, con su precio de compra, formato (cantidad por la que pagas ese precio) y unidad. Es la base de todos los cálculos de coste posteriores: si esta lista no es precisa, ningún food cost del resto de la app lo será.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Proveedores</strong> (en Cocina) — Da de alta tus proveedores habituales y vincula cada ingrediente al proveedor que te lo suministra. Esto te permitirá generar pedidos por proveedor más adelante.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Escandallo</strong> (en Cocina y Sala) — Crea cada plato o bebida como una receta: elige los ingredientes de la Mega Lista, indica los gramajes netos y la merma de cada uno. La app calcula automáticamente el coste por ración, el food cost y el margen sobre el precio de venta que tú definas.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Fichas Técnicas</strong> (en Cocina y Sala) — Para cada receta del Escandallo, añade los pasos de elaboración, la presentación y los alérgenos. Sirven como procedimiento estándar para que cualquier cocinero o bartender elabore el plato o la bebida siempre igual, y son obligatorias de cara a inspección sanitaria por el tema de alérgenos.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Carta</strong> (en Cocina y Sala) — Crea una o varias cartas importando los platos o bebidas directamente del Escandallo (ya con su precio de venta de ese momento — si luego cambias el precio en el Escandallo, recuerda pulsar "Actualizar precio" en la Carta para que se refleje ahí también), organízalos por secciones (Entrantes, Principales, Postres... o Cervezas, Cócteles, Vinos...) y marca cuáles están disponibles. Puedes programar distintas cartas según el horario (comidas, cenas, fin de semana, carta de bebidas...).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Stock y Pedidos</strong> (en Cocina y Sala) — Define el stock mínimo de cada ingrediente o elaboración. A partir de aquí, el sistema descuenta stock automáticamente con cada venta del TPV y lo repone automáticamente cuando marcas un pedido a proveedor como "Recibido".</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st"><strong>Personal y Plan de Limpieza</strong> (en Cocina y Sala) — Da de alta a tu equipo, organiza turnos y reparte tareas. Configura el plan de limpieza APPCC para cumplir con la normativa de higiene alimentaria.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st"><strong>TPV</strong> (en Sala) — Aquí es donde tu equipo trabaja cada turno: abrir mesas (cliente de paso o con reserva), tomar la comanda con las pestañas de cartas (bebidas primero), marchar por grupos o con "Marchar vale", seguir el estado del servicio y cobrar cuando todo está servido. Cada venta queda registrada y alimenta el resto del sistema sin pasos adicionales. (Ver el detalle en la sección "🆕 Novedades" de arriba.)</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st"><strong>Gestión Económica</strong> (en Gestión) — Añade tus gastos fijos (nóminas, alquiler, suministros...) una sola vez. A partir de ahí, la Cuenta de Resultados, el Punto de Equilibrio y la Tesorería se calculan solos combinando estos gastos con las ventas reales del TPV.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st"><strong>Panel de Control</strong> (en Gestión) — Tu pantalla de control diario. Una vez que los módulos anteriores están en marcha, aquí verás en segundos cómo va el negocio: ventas, resultado, alertas y próximas reservas.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>No hace falta completar el 100% de cada módulo antes de pasar al siguiente. Puedes empezar con lo básico (ingredientes y recetas más vendidas, por ejemplo) e ir ampliando poco a poco mientras ya usas el TPV en el día a día.</div>
    <h4>Cómo se guardan los datos</h4>
    <p>Todo lo que introduces se guarda automáticamente en tu dispositivo (no hace falta pulsar ningún botón de "Guardar" salvo en formularios concretos que sí lo indican). Si activas la <strong>licencia y la nube</strong> desde Mi Negocio, además los datos se sincronizan entre todos los dispositivos del negocio (móvil del camarero, tablet de cocina, ordenador de oficina) y quedan respaldados en caso de que se borre el navegador o se cambie de dispositivo.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si trabajas sin la nube activada, los datos quedan solo en ese navegador/dispositivo. Te recomendamos activar la licencia cuanto antes y, además, hacer copias de seguridad periódicas desde Mi Negocio → Mantenimiento de datos.</div>
    <h4>Usar el Kit como una app (móvil, tablet y ordenador)</h4>
    <p>El Kit funciona perfectamente en cualquier dispositivo desde el navegador, sin instalar nada de una tienda de aplicaciones. Para acceder más rápido, sin escribir la dirección cada vez y con una pantalla más limpia (a pantalla completa, sin barra del navegador), puedes <strong>anclarlo a la pantalla de inicio</strong> como si fuera una app nativa:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Móvil/tablet Android (Chrome):</strong> abre el Kit → pulsa el menú de tres puntos ⋮ (arriba a la derecha) → "Añadir a pantalla de inicio" o "Instalar app" → confirma. Aparecerá un icono de GastroGoan junto a tus demás apps.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone/iPad (Safari):</strong> abre el Kit → pulsa el botón de compartir <i class="ti ti-share-2"></i> (el cuadrado con la flecha hacia arriba, en la barra inferior) → desplázate y elige "Añadir a pantalla de inicio" → confirma el nombre y pulsa "Añadir".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Ordenador (Chrome/Edge):</strong> abre el Kit → busca el icono de instalar (un monitor con una flecha) en el extremo derecho de la barra de direcciones, o entra al menú ⋮ → "Instalar aplicación" o "Aplicaciones" → "Instalar este sitio como aplicación".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Así tendrás un icono propio de GastroGoan para abrir el Kit al instante, igual que cualquier otra app: en el TPV de la barra, en la tablet de la cocina o en el móvil del encargado. Recomendamos instalarlo en cada dispositivo que vaya a usarse a diario.</div>
    <h4>Cómo entra cada persona a la app</h4>
    <p>Al abrir la app aparece una pantalla inicial con dos accesos:</p>
    <ul>
      <li><strong>Acceso Empleados</strong> — el trabajador escribe su nombre, su PIN (4 dígitos, "1234" la primera vez) y el <strong>código de negocio</strong> (se lo da el propietario). Entra directamente a su área de trabajo (Cocina o Sala, según lo configurado en su ficha de Personal), sin más preguntas. Funciona incluso en un dispositivo que nunca se usó antes para ese negocio: no hace falta que el propietario "presente" el dispositivo primero.</li>
      <li><strong>Acceso Propietarios</strong> — pide el código de negocio y una contraseña (la de la licencia, o la que hayas cambiado después desde el panel). Da acceso al panel de negocios: cambiar de negocio o sucursal, dar de alta uno nuevo con su propia licencia, y todo lo que antes se veía nada más entrar.</li>
    </ul>
    <p>Un empleado que entra por su acceso solo ve su área de trabajo (Cocina o Sala) y nunca ve el selector de negocios ni el botón "Negocios" de la cabecera — solo tiene un botón de "Cerrar sesión". El botón "Negocios" queda reservado a quien entró como propietario, y dentro de esa misma sesión ya no vuelve a pedir PIN.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Si alguien olvida su contraseña (propietario) o su PIN (empleado), escribe <strong>GGGG</strong> en el campo de contraseña/PIN: la app pedirá fijar uno nuevo en el momento, sin necesidad de contactar con soporte.</div>
    <h4>Licencias y varios negocios</h4>
    <p>Cada negocio (o sucursal) tiene su propio código y contraseña, generados al comprar la licencia. Al registrar un negocio o sucursal nuevos desde el panel, siempre hay que introducir su código y contraseña reales — así se activa. Si el mismo propietario tiene varios negocios, basta con iniciar sesión en cualquier dispositivo con el código y contraseña de UNO de ellos: los demás negocios vinculados a ese propietario aparecen automáticamente en el panel, sin tener que registrarlos también ahí.</p>
    <p>Desde el panel de negocios puedes borrar un negocio o sucursal de ese dispositivo (icono de papelera junto a su nombre). Te pedirá escribir el nombre exacto del negocio para confirmarlo, así no se borra nada por error. Borrarlo de un dispositivo no borra la licencia ni los datos en la nube: puedes volver a activarlo cuando quieras con su código y contraseña.</p>
    <h4>Roles: quién ve qué</h4>
    <p>Dentro de la app, la sección <strong>Gestión</strong> sigue protegida con su propio PIN (configurable en Mi Negocio), independiente del acceso de empleados/propietarios, porque contiene información sensible: finanzas, costes y configuración general. El equipo de Cocina o Sala solo ve los módulos de su área (TPV, comandas, fichas técnicas, limpieza, personal, chat interno...). Si das de alta empleados en un área, hace falta el PIN de alguno de ellos (o el del propietario) para entrar en ella; si un área no tiene ningún empleado dado de alta, se puede entrar libremente. Cada ficha de empleado tiene una casilla <strong>Activo</strong>: si la desmarcas, pierde el acceso a su área al instante sin borrar su ficha (útil para bajas temporales); si lo eliminas del todo, pierde el acceso y se borra su ficha.</p>`,
    ca:`<h3>Què és GastroGoan i com està organitzat</h3>
    <p>GastroGoan és un <strong>kit de gestió integral</strong> per a bars i restaurants: un únic sistema on la informació flueix d'un mòdul a un altre sense que hagis de copiar res a mà. L'app està dividida en tres grans àrees, accessibles des de la pantalla d'inici:</p>
    <ul>
      <li><strong>Cuina</strong> — ingredients, receptes, escandalls, fitxes tècniques, estoc, comandes a proveïdors, personal i neteja del costat de cuina.</li>
      <li><strong>Sala</strong> — els mateixos mòduls però per a l'equip de sala, més TPV, clients, reserves i promoció.</li>
      <li><strong>Gestió</strong> — la part econòmica i administrativa: finances, panell de control, dades del negoci i aquest manual.</li>
    </ul>
    <p>La idea central és que <strong>cada dada s'introdueix una sola vegada</strong> i es reutilitza en cascada: el preu d'un ingredient a la Mega Llista recalcula el cost de la recepta a l'Escandall, aquesta recepta alimenta la Fitxa Tècnica i la Carta, la Carta s'utilitza al TPV, i les vendes del TPV alimenten automàticament la Gestió Econòmica, l'Estoc i el Panell de Control. Si segueixes l'ordre correcte des del principi, t'estalviaràs feina repetida i els números del negoci estaran sempre actualitzats sols.</p>
    <h4>Ruta recomanada per configurar el teu negoci des de zero</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>El Meu Negoci</strong> (a Gestió) — És el primer pas sempre. Emplena el nom, l'adreça, l'horari setmanal, els tipus de servei (taula/take away/delivery) i la configuració del tiquet. Aquestes dades personalitzen tota l'app: apareixen als tiquets impresos, a la web de comandes en línia i condicionen quina carta s'activa a cada horari.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Mega Llista</strong> (a Cuina) — Dona d'alta tots els ingredients i productes que compres, amb el seu preu de compra, format (quantitat per la qual pagues aquest preu) i unitat. És la base de tots els càlculs de cost posteriors: si aquesta llista no és precisa, cap food cost de la resta de l'app ho serà.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Proveïdors</strong> (a Cuina) — Dona d'alta els teus proveïdors habituals i vincula cada ingredient al proveïdor que te'l subministra. Això et permetrà generar comandes per proveïdor més endavant.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Escandall</strong> (a Cuina i Sala) — Crea cada plat o beguda com una recepta: tria els ingredients de la Mega Llista, indica els gramatges nets i la merma de cadascun. L'app calcula automàticament el cost per ració, el food cost i el marge sobre el preu de venda que tu defineixis.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Fitxes Tècniques</strong> (a Cuina i Sala) — Per a cada recepta de l'Escandall, afegeix els passos d'elaboració, la presentació i els al·lergens. Serveixen com a procediment estàndard perquè qualsevol cuiner o bartender elabori el plat o la beguda sempre igual, i són obligatòries de cara a inspecció sanitària pel tema dels al·lergens.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Carta</strong> (a Cuina i Sala) — Crea una o diverses cartes important els plats o begudes directament de l'Escandall (ja amb el seu preu de venda d'aquell moment — si més tard canvies el preu a l'Escandall, recorda prémer "Actualitzar preu" a la Carta perquè es reflecteixi també allà), organitza'ls per seccions (Entrants, Principals, Postres... o Cerveses, Còctels, Vins...) i marca quins estan disponibles. Pots programar diferents cartes segons l'horari (dinars, sopars, cap de setmana, carta de begudes...).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Estoc i Comandes</strong> (a Cuina i Sala) — Defineix l'estoc mínim de cada ingredient o elaboració. A partir d'aquí, el sistema descompta estoc automàticament amb cada venda del TPV i el reposa automàticament quan marques una comanda a proveïdor com "Rebuda".</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st"><strong>Personal i Pla de Neteja</strong> (a Cuina i Sala) — Dona d'alta el teu equip, organitza torns i reparteix tasques. Configura el pla de neteja APPCC per complir amb la normativa d'higiene alimentària.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st"><strong>TPV</strong> (a Sala) — Aquí és on el teu equip treballa cada torn: obrir taules (client de pas o amb reserva), prendre la comanda amb les pestanyes de cartes (begudes primer), marxar per grups o amb "Marxar val", seguir l'estat del servei i cobrar quan tot està servit. Cada venda queda registrada i alimenta la resta del sistema sense passos addicionals. (Vegeu el detall a la secció "🆕 Novetats" de dalt.)</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st"><strong>Gestió Econòmica</strong> (a Gestió) — Afegeix les teves despeses fixes (nòmines, lloguer, subministraments...) una sola vegada. A partir d'aquí, el Compte de Resultats, el Punt d'Equilibri i la Tresoreria es calculen sols combinant aquestes despeses amb les vendes reals del TPV.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st"><strong>Panell de Control</strong> (a Gestió) — La teva pantalla de control diari. Un cop els mòduls anteriors estan en marxa, aquí veuràs en segons com va el negoci: vendes, resultat, alertes i properes reserves.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>No cal completar el 100% de cada mòdul abans de passar al següent. Pots començar amb el bàsic (ingredients i receptes més venudes, per exemple) i anar ampliant a poc a poc mentre ja fas servir el TPV en el dia a dia.</div>
    <h4>Com es guarden les dades</h4>
    <p>Tot el que introdueixes es guarda automàticament al teu dispositiu (no cal prémer cap botó de "Desar" excepte en formularis concrets que sí que ho indiquen). Si actives la <strong>llicència i el núvol</strong> des d'El Meu Negoci, a més les dades se sincronitzen entre tots els dispositius del negoci (mòbil del cambrer, tauleta de cuina, ordinador d'oficina) i queden protegides en cas que s'esborri el navegador o es canviï de dispositiu.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si treballes sense el núvol activat, les dades queden només en aquest navegador/dispositiu. Et recomanem activar la llicència com més aviat millor i, a més, fer còpies de seguretat periòdiques des d'El Meu Negoci → Manteniment de dades.</div>
    <h4>Fer servir el Kit com una app (mòbil, tauleta i ordinador)</h4>
    <p>El Kit funciona perfectament en qualsevol dispositiu des del navegador, sense instal·lar res d'una botiga d'aplicacions. Per accedir-hi més ràpid, sense escriure l'adreça cada vegada i amb una pantalla més neta (a pantalla completa, sense barra del navegador), pots <strong>ancorar-lo a la pantalla d'inici</strong> com si fos una app nativa:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Mòbil/tauleta Android (Chrome):</strong> obre el Kit → prem el menú de tres punts ⋮ (a dalt a la dreta) → "Afegeix a la pantalla d'inici" o "Instal·la l'app" → confirma. Apareixerà una icona de GastroGoan al costat de les teves altres apps.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone/iPad (Safari):</strong> obre el Kit → prem el botó de compartir <i class="ti ti-share-2"></i> (el quadrat amb la fletxa cap amunt, a la barra inferior) → desplaça't i tria "Afegeix a la pantalla d'inici" → confirma el nom i prem "Afegeix".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Ordinador (Chrome/Edge):</strong> obre el Kit → busca la icona d'instal·lar (un monitor amb una fletxa) a l'extrem dret de la barra d'adreces, o entra al menú ⋮ → "Instal·la l'aplicació" o "Aplicacions" → "Instal·la aquest lloc com a aplicació".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Així tindràs una icona pròpia de GastroGoan per obrir el Kit a l'instant, igual que qualsevol altra app: al TPV de la barra, a la tauleta de la cuina o al mòbil de l'encarregat. Recomanem instal·lar-lo a cada dispositiu que s'utilitzi diàriament.</div>
    <h4>Com hi entra cada persona</h4>
    <p>En obrir l'app apareix una pantalla inicial amb dos accessos:</p>
    <ul>
      <li><strong>Accés Empleats</strong> — el treballador escriu el seu nom, el seu PIN (4 dígits, "1234" la primera vegada) i el <strong>codi de negoci</strong> (l'hi dona el propietari). Entra directament a la seva àrea de treball (Cuina o Sala, segons la seva fitxa de Personal), sense més preguntes. Funciona fins i tot en un dispositiu que mai s'havia fet servir per a aquest negoci: no cal que el propietari "presenti" el dispositiu abans.</li>
      <li><strong>Accés Propietaris</strong> — demana el codi de negoci i una contrasenya (la de la llicència, o la que hagis canviat després des del panell). Dona accés al panell de negocis: canviar de negoci o sucursal, donar-ne d'alta un de nou amb la seva pròpia llicència, i tot el que abans es veia just en entrar.</li>
    </ul>
    <p>Un empleat que hi entra pel seu accés només veu la seva àrea de treball (Cuina o Sala) i mai veu el selector de negocis ni el botó "Negocis" de la capçalera — només té un botó de "Tancar sessió". El botó "Negocis" queda reservat a qui hi ha entrat com a propietari, i dins d'aquesta mateixa sessió ja no torna a demanar PIN.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Si algú oblida la seva contrasenya (propietari) o el seu PIN (empleat), escriu <strong>GGGG</strong> al camp de contrasenya/PIN: l'app demanarà fixar-ne un de nou al moment, sense necessitat de contactar amb suport.</div>
    <h4>Llicències i diversos negocis</h4>
    <p>Cada negoci (o sucursal) té el seu propi codi i contrasenya, generats en comprar la llicència. En registrar un negoci o sucursal nous des del panell, sempre cal introduir el seu codi i contrasenya reals — així s'activa. Si el mateix propietari té diversos negocis, n'hi ha prou d'iniciar sessió en qualsevol dispositiu amb el codi i contrasenya d'UN d'ells: la resta de negocis vinculats a aquest propietari apareixen automàticament al panell, sense haver-los de registrar també allà.</p>
    <p>Des del panell de negocis pots esborrar un negoci o sucursal d'aquest dispositiu (icona de paperera al costat del nom). Et demanarà escriure el nom exacte del negoci per confirmar-ho, així no s'esborra res per error. Esborrar-lo d'un dispositiu no esborra la llicència ni les dades al núvol: el pots tornar a activar quan vulguis amb el seu codi i contrasenya.</p>
    <h4>Rols: qui veu què</h4>
    <p>Dins de l'app, la secció <strong>Gestió</strong> continua protegida amb el seu propi PIN (configurable a El Meu Negoci), independent de l'accés d'empleats/propietaris, perquè conté informació sensible: finances, costos i configuració general. L'equip de Cuina o Sala només veu els mòduls de la seva àrea (TPV, comandes, fitxes tècniques, neteja, personal, xat intern...). Si dones d'alta empleats en una àrea, cal el PIN d'algun d'ells (o el del propietari) per entrar-hi; si una àrea no té cap empleat donat d'alta, s'hi pot entrar lliurement. Cada fitxa d'empleat té una casella <strong>Actiu</strong>: si la desmarques, perd l'accés a la seva àrea a l'instant sense esborrar la fitxa (útil per a baixes temporals); si l'elimines del tot, perd l'accés i s'esborra la fitxa.</p>`,
    en:`<h3>What GastroGoan is and how it's organized</h3>
    <p>GastroGoan is an <strong>all-in-one management kit</strong> for bars and restaurants: a single system where information flows from one module to the next without you having to copy anything by hand. The app is split into three main areas, accessible from the home screen:</p>
    <ul>
      <li><strong>Kitchen</strong> — ingredients, recipes, costing, technical sheets, stock, supplier orders, staff and cleaning on the kitchen side.</li>
      <li><strong>Floor</strong> — the same modules but for the floor/bar team, plus POS, customers, reservations and promotion.</li>
      <li><strong>Management</strong> — the financial and administrative side: finances, dashboard, business data and this manual.</li>
    </ul>
    <p>The core idea is that <strong>each piece of data is entered only once</strong> and reused downstream: an ingredient's price in the Master List recalculates the recipe cost in Costing, that recipe feeds the Technical Sheet and the Menu, the Menu is used in the POS, and POS sales automatically feed Financial Management, Stock and the Dashboard. If you follow the right order from the start, you'll save repeated work and your business numbers will always stay up to date on their own.</p>
    <h4>Recommended path to set up your business from scratch</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>My Business</strong> (in Management) — Always the first step. Fill in the name, address, weekly hours, service types (table/take away/delivery) and receipt settings. This data personalises the whole app: it appears on printed receipts, on the online ordering website, and determines which menu is active at each time slot.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Master List</strong> (in Kitchen) — Register every ingredient and product you buy, with its purchase price, pack size (the quantity you pay that price for) and unit. It's the foundation for every cost calculation that follows: if this list isn't accurate, no food cost anywhere else in the app will be either.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Suppliers</strong> (in Kitchen) — Register your regular suppliers and link each ingredient to the supplier who provides it. This is what lets you later generate orders per supplier.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Costing</strong> (in Kitchen and Floor) — Create each dish or drink as a recipe: pick ingredients from the Master List, and enter the net weight and waste percentage for each. The app automatically calculates the cost per serving, the food cost and the margin against the selling price you set.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Technical Sheets</strong> (in Kitchen and Floor) — For each recipe in Costing, add the preparation steps, plating and allergens. These act as a standard procedure so any cook or bartender makes the dish or drink the same way every time, and they're mandatory for health inspections regarding allergens.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Menu</strong> (in Kitchen and Floor) — Create one or more menus by importing dishes or drinks straight from Costing (already carrying the selling price at that moment — if you later change the price in Costing, remember to press "Update price" in the Menu so it's reflected there too), organise them into sections (Starters, Mains, Desserts... or Beers, Cocktails, Wines...) and mark which ones are available. You can schedule different menus by time slot (lunch, dinner, weekend, drinks menu...).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Stock and Orders</strong> (in Kitchen and Floor) — Set the minimum stock for each ingredient or preparation. From here, the system automatically deducts stock with every POS sale and replenishes it automatically when you mark a supplier order as "Received".</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st"><strong>Staff and Cleaning Plan</strong> (in Kitchen and Floor) — Register your team, organise shifts and assign tasks. Set up the HACCP cleaning plan to comply with food-hygiene regulations.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st"><strong>POS</strong> (in Floor) — This is where your team works every shift: opening tables (walk-in or with a reservation), taking the order using the menu tabs (drinks first), firing by course or with "Fire ticket", tracking service status and charging once everything has been served. Every sale is logged and feeds the rest of the system with no extra steps. (See the details in the "🆕 What's new" section above.)</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st"><strong>Financial Management</strong> (in Management) — Add your fixed costs (payroll, rent, utilities...) just once. From there, the Profit & Loss statement, the Break-even Point and Cash Flow are calculated automatically by combining these costs with real POS sales.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st"><strong>Dashboard</strong> (in Management) — Your daily control screen. Once the modules above are up and running, here you'll see in seconds how the business is doing: sales, results, alerts and upcoming reservations.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>You don't need to fully complete every module before moving to the next. You can start with the basics (ingredients and best-selling recipes, for example) and expand little by little while already using the POS day to day.</div>
    <h4>How data is saved</h4>
    <p>Everything you enter is saved automatically on your device (no need to press any "Save" button except in specific forms that say so). If you activate the <strong>licence and the cloud</strong> from My Business, data is also synced across all the business's devices (the waiter's phone, the kitchen tablet, the office computer) and backed up in case the browser is cleared or the device is changed.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If you work without the cloud enabled, data stays only on that browser/device. We recommend activating the licence as soon as possible, and also making periodic backups from My Business → Data Maintenance.</div>
    <h4>Using the Kit as an app (phone, tablet and computer)</h4>
    <p>The Kit works perfectly on any device straight from the browser, with nothing to install from an app store. To open it faster, without typing the address every time and with a cleaner screen (full-screen, no browser bar), you can <strong>pin it to your home screen</strong> as if it were a native app:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Android phone/tablet (Chrome):</strong> open the Kit → tap the three-dot menu ⋮ (top right) → "Add to Home screen" or "Install app" → confirm. A GastroGoan icon will appear next to your other apps.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone/iPad (Safari):</strong> open the Kit → tap the share button <i class="ti ti-share-2"></i> (the square with an upward arrow, in the bottom bar) → scroll and choose "Add to Home Screen" → confirm the name and tap "Add".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Computer (Chrome/Edge):</strong> open the Kit → look for the install icon (a monitor with an arrow) at the right end of the address bar, or open the ⋮ menu → "Install app" or "Apps" → "Install this site as an app".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>That way you'll have your own GastroGoan icon to open the Kit instantly, just like any other app: on the bar's POS, on the kitchen tablet, or on the manager's phone. We recommend installing it on every device that will be used daily.</div>
    <h4>How each person signs in</h4>
    <p>When you open the app, a landing screen offers two entry points:</p>
    <ul>
      <li><strong>Staff Access</strong> — the employee types their name, their PIN (4 digits, "1234" the first time) and the <strong>business code</strong> (given by the owner). They go straight into their work area (Kitchen or Floor, as set on their Staff record) with no further questions. This works even on a device that has never been used for that business before — the owner doesn't need to "introduce" the device first.</li>
      <li><strong>Owner Access</strong> — asks for the business code and a password (the one from the licence, or one you changed later from the panel). It gives access to the business panel: switching business/branch, registering a new one with its own licence, and everything that used to appear right after opening the app.</li>
    </ul>
    <p>An employee who signs in through Staff Access only sees their work area (Kitchen or Floor) and never sees the business selector or the "Businesses" header button — they only have a "Log out" button. The "Businesses" button is reserved for whoever signed in as owner, and within that same session it no longer asks for a PIN.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>If someone forgets their password (owner) or their PIN (employee), type <strong>GGGG</strong> in the password/PIN field: the app will ask you to set a new one right there, no need to contact support.</div>
    <h4>Licences and multiple businesses</h4>
    <p>Each business (or branch) has its own code and password, generated when the licence is purchased. Registering a new business or branch from the panel always requires entering its real code and password — that's what activates it. If the same owner has several businesses, signing in on any device with the code and password of just ONE of them is enough: the other businesses linked to that owner appear automatically in the panel, without needing to register them there too.</p>
    <p>From the business panel you can remove a business or branch from that device (trash icon next to its name). It will ask you to type the exact business name to confirm, so nothing gets deleted by mistake. Removing it from a device doesn't delete the licence or the cloud data: you can reactivate it anytime with its code and password.</p>
    <h4>Roles: who sees what</h4>
    <p>Inside the app, the <strong>Management</strong> section is still protected by its own PIN (configurable in My Business), independent of the employee/owner access, because it contains sensitive information: finances, costs and general settings. The Kitchen or Floor team only sees the modules for their area (POS, tickets, technical sheets, cleaning, staff, internal chat...). If you register employees in an area, one of their PINs (or the owner's) is needed to enter it; if an area has no registered employees, it can be entered freely. Every staff record has an <strong>Active</strong> checkbox: unchecking it removes access to their area instantly without deleting the record (useful for temporary leave); deleting the record entirely removes access and the record itself.</p>`},
  },
  {
    title:{es:'<i class="ti ti-list"></i> Mega Lista', ca:'<i class="ti ti-list"></i> Mega Llista', en:'<i class="ti ti-list"></i> Master List'},
    content:{es:`<h3>Qué es y por qué es el módulo más importante</h3>
    <p>La Mega Lista es el <strong>catálogo maestro de todos los ingredientes y productos</strong> que compras: desde materias primas (carne, pescado, verdura) hasta productos ya elaborados que utilizas para montar tus platos (salsas envasadas, panes, bebidas...). Es la primera pieza que debes montar bien, porque <strong>todo lo demás se calcula a partir de los precios que pongas aquí</strong>: el coste de las recetas del Escandallo, el food cost de cada plato, el valor del stock y, en cascada, los informes de la Gestión Económica.</p>
    <p>Piensa en la Mega Lista como la "lista de la compra permanente" de tu negocio: cada vez que un producto nuevo entra en tu cocina o tu barra, debe tener aquí una ficha.</p>
    <h4>Cómo añadir un ingrediente, paso a paso</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"Nuevo Ingrediente"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escribe el <strong>Nombre</strong> tal y como lo identificas habitualmente (ej. "Solomillo de ternera", "Aceite de oliva virgen extra", "Coca-Cola lata 33cl"). Usa nombres claros: este nombre aparecerá luego en los desplegables del Escandallo.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Elige o crea la <strong>Categoría</strong> (Carnes, Pescados, Verduras, Lácteos, Bebidas, Limpieza...) para poder filtrar y organizar la lista cuando crezca.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Selecciona el <strong>Proveedor</strong> habitual de ese producto (si todavía no lo has creado, puedes hacerlo desde el módulo Proveedores y volver después a vincularlo).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Indica la <strong>Unidad</strong> de medida: usa <strong>g</strong> (gramos) o <strong>ml</strong> (mililitros) para todo lo que se pesa, mide o se sirve a granel, y <strong>UNIDAD</strong> para productos que cuentas por piezas (huevos, latas, limones, botellas...).</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Indica la <strong>Cantidad de compra</strong>: el tamaño del formato en el que realmente lo compras, expresado en la unidad anterior. Por ejemplo, si compras una caja de tomates de 5&nbsp;kg, pon <strong>5000</strong> (g); si compras una botella de aceite de 1&nbsp;litro, pon <strong>1000</strong> (ml); si compras huevos por docenas, pon <strong>12</strong> (UNIDAD).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">Indica el <strong>Precio</strong> que pagas por esa cantidad de compra completa (el precio de la caja, de la botella, de la docena...), no el precio por gramo — la app hace esa división automáticamente.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Guarda. La app calculará y mostrará el <strong>precio unitario</strong> (precio por gramo, mililitro o unidad), que es el valor que se usará después en el Escandallo para calcular el coste de cada receta.</div></div>
    <h4>Ejemplo práctico</h4>
    <p>Compras una garrafa de aceite de oliva de 5&nbsp;litros por 22&nbsp;€. En la Mega Lista crearías: Nombre "Aceite de oliva 0,4º", Unidad "ml", Cantidad de compra "5000", Precio "22". La app calcula automáticamente 22&nbsp;÷&nbsp;5000&nbsp;=&nbsp;0,0044&nbsp;€/ml. Si una receta usa 30&nbsp;ml de ese aceite, el Escandallo sumará 0,132&nbsp;€ por ese ingrediente sin que tengas que calcular nada a mano.</p>
    <h4>Buscar, filtrar y mantener la lista al día</h4>
    <ul>
      <li>Usa el <strong>buscador</strong> para localizar rápidamente un producto cuando la lista crezca.</li>
      <li>Filtra por <strong>categoría</strong> para revisar solo, por ejemplo, las bebidas o los lácteos.</li>
      <li>Filtra por <strong>proveedor</strong> para ver de golpe qué productos compras a un proveedor concreto (útil al preparar un pedido o revisar precios de ese proveedor).</li>
      <li>El icono de <strong>editar</strong> (lápiz) te permite actualizar precio, proveedor o cualquier dato sin tener que crear el ingrediente de nuevo.</li>
      <li>El icono de <strong>eliminar</strong> (papelera) borra el ingrediente — solo hazlo si no se usa en ninguna receta activa, porque las recetas que lo usaran perderían esa línea de coste.</li>
    </ul>
    <h4>Mantener los precios actualizados: la clave del food cost real</h4>
    <p>Cuando recibas una factura nueva del proveedor con un precio distinto, entra en la Mega Lista, edita ese ingrediente y actualiza el <strong>Precio</strong> (y la Cantidad de compra si el formato ha cambiado). No necesitas tocar nada más.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Cuando actualices el precio de un ingrediente, el coste de <strong>todas</strong> las recetas del Escandallo que lo usen se recalcula automáticamente al instante — incluyendo su food cost y su margen. Así, mantener la Mega Lista al día es la forma más rápida de tener un control de costes realista sin recalcular receta por receta.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si un ingrediente aparece con coste 0 o muy bajo en el Escandallo, normalmente es porque su precio o cantidad de compra están mal puestos aquí (por ejemplo, se ha confundido la cantidad de compra en gramos con la cantidad en kilos). Revisa siempre estos dos campos si un coste no te encaja.</div>`,
    ca:`<h3>Què és i per què és el mòdul més important</h3>
    <p>La Mega Llista és el <strong>catàleg mestre de tots els ingredients i productes</strong> que compres: des de matèries primeres (carn, peix, verdura) fins a productes ja elaborats que fas servir per muntar els teus plats (salses envasades, pans, begudes...). És la primera peça que has de muntar bé, perquè <strong>tota la resta es calcula a partir dels preus que posis aquí</strong>: el cost de les receptes de l'Escandall, el food cost de cada plat, el valor de l'estoc i, en cascada, els informes de la Gestió Econòmica.</p>
    <p>Pensa en la Mega Llista com la "llista de la compra permanent" del teu negoci: cada vegada que un producte nou entra a la teva cuina o la teva barra, hi ha d'haver una fitxa aquí.</p>
    <h4>Com afegir un ingredient, pas a pas</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"Nou Ingredient"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escriu el <strong>Nom</strong> tal com l'identifiques habitualment (ex. "Filet de vedella", "Oli d'oliva verge extra", "Coca-Cola llauna 33cl"). Fes servir noms clars: aquest nom apareixerà després als desplegables de l'Escandall.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Tria o crea la <strong>Categoria</strong> (Carns, Peixos, Verdures, Làctics, Begudes, Neteja...) per poder filtrar i organitzar la llista quan creixi.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Selecciona el <strong>Proveïdor</strong> habitual d'aquest producte (si encara no l'has creat, ho pots fer des del mòdul Proveïdors i tornar després a vincular-lo).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Indica la <strong>Unitat</strong> de mesura: fes servir <strong>g</strong> (grams) o <strong>ml</strong> (mil·lilitres) per a tot allò que es pesa, es mesura o se serveix a doll, i <strong>UNITAT</strong> per a productes que comptes per peces (ous, llaunes, llimones, ampolles...).</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Indica la <strong>Quantitat de compra</strong>: la mida del format en què realment el compres, expressada en la unitat anterior. Per exemple, si compres una caixa de tomàquets de 5&nbsp;kg, posa <strong>5000</strong> (g); si compres una ampolla d'oli d'1&nbsp;litre, posa <strong>1000</strong> (ml); si compres ous per dotzenes, posa <strong>12</strong> (UNITAT).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">Indica el <strong>Preu</strong> que pagues per aquesta quantitat de compra completa (el preu de la caixa, de l'ampolla, de la dotzena...), no el preu per gram — l'app fa aquesta divisió automàticament.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Desa. L'app calcularà i mostrarà el <strong>preu unitari</strong> (preu per gram, mil·lilitre o unitat), que és el valor que es farà servir després a l'Escandall per calcular el cost de cada recepta.</div></div>
    <h4>Exemple pràctic</h4>
    <p>Compres una garrafa d'oli d'oliva de 5&nbsp;litres per 22&nbsp;€. A la Mega Llista crearies: Nom "Oli d'oliva 0,4º", Unitat "ml", Quantitat de compra "5000", Preu "22". L'app calcula automàticament 22&nbsp;÷&nbsp;5000&nbsp;=&nbsp;0,0044&nbsp;€/ml. Si una recepta fa servir 30&nbsp;ml d'aquest oli, l'Escandall sumarà 0,132&nbsp;€ per aquest ingredient sense que hagis de calcular res a mà.</p>
    <h4>Cercar, filtrar i mantenir la llista al dia</h4>
    <ul>
      <li>Fes servir el <strong>cercador</strong> per localitzar ràpidament un producte quan la llista creixi.</li>
      <li>Filtra per <strong>categoria</strong> per revisar només, per exemple, les begudes o els làctics.</li>
      <li>Filtra per <strong>proveïdor</strong> per veure de cop quins productes compres a un proveïdor concret (útil en preparar una comanda o revisar preus d'aquest proveïdor).</li>
      <li>La icona d'<strong>editar</strong> (llapis) et permet actualitzar preu, proveïdor o qualsevol dada sense haver de crear l'ingredient de nou.</li>
      <li>La icona d'<strong>eliminar</strong> (paperera) esborra l'ingredient — fes-ho només si no es fa servir a cap recepta activa, perquè les receptes que l'utilitzessin perdrien aquella línia de cost.</li>
    </ul>
    <h4>Mantenir els preus actualitzats: la clau del food cost real</h4>
    <p>Quan rebis una factura nova del proveïdor amb un preu diferent, entra a la Mega Llista, edita aquell ingredient i actualitza el <strong>Preu</strong> (i la Quantitat de compra si el format ha canviat). No cal tocar res més.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Quan actualitzis el preu d'un ingredient, el cost de <strong>totes</strong> les receptes de l'Escandall que el facin servir es recalcula automàticament a l'instant — incloent-hi el food cost i el marge. Així, mantenir la Mega Llista al dia és la manera més ràpida de tenir un control de costos realista sense recalcular recepta per recepta.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si un ingredient apareix amb cost 0 o molt baix a l'Escandall, normalment és perquè el preu o la quantitat de compra estan mal posats aquí (per exemple, s'ha confós la quantitat de compra en grams amb la quantitat en quilos). Revisa sempre aquests dos camps si un cost no et quadra.</div>`,
    en:`<h3>What it is and why it's the most important module</h3>
    <p>The Master List is the <strong>master catalogue of every ingredient and product</strong> you buy: from raw materials (meat, fish, vegetables) to already-prepared products you use to build your dishes (bottled sauces, bread, drinks...). It's the first piece you need to get right, because <strong>everything else is calculated from the prices you set here</strong>: the cost of recipes in Costing, the food cost of each dish, the value of stock and, downstream, the Financial Management reports.</p>
    <p>Think of the Master List as your business's "permanent shopping list": every time a new product enters your kitchen or bar, it should have an entry here.</p>
    <h4>How to add an ingredient, step by step</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"New Ingredient"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Type the <strong>Name</strong> as you usually identify it (e.g. "Beef sirloin", "Extra virgin olive oil", "Coca-Cola can 33cl"). Use clear names: this name will later appear in Costing's dropdowns.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Choose or create the <strong>Category</strong> (Meat, Fish, Vegetables, Dairy, Beverages, Cleaning...) so you can filter and organise the list as it grows.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Select the usual <strong>Supplier</strong> for that product (if you haven't created it yet, you can do so from the Suppliers module and come back later to link it).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Set the <strong>Unit</strong> of measure: use <strong>g</strong> (grams) or <strong>ml</strong> (millilitres) for anything weighed, measured or served loose, and <strong>UNIT</strong> for products you count by pieces (eggs, cans, lemons, bottles...).</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Enter the <strong>Pack size</strong>: the size of the format you actually buy it in, expressed in the unit above. For example, if you buy a 5&nbsp;kg box of tomatoes, enter <strong>5000</strong> (g); if you buy a 1-litre bottle of oil, enter <strong>1000</strong> (ml); if you buy eggs by the dozen, enter <strong>12</strong> (UNIT).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">Enter the <strong>Price</strong> you pay for that whole pack (the price of the box, the bottle, the dozen...), not the price per gram — the app does that division automatically.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Save. The app will calculate and show the <strong>unit price</strong> (price per gram, millilitre or unit), the value that will later be used in Costing to calculate each recipe's cost.</div></div>
    <h4>Worked example</h4>
    <p>You buy a 5-litre jug of olive oil for €22. In the Master List you'd create: Name "Olive oil 0.4º", Unit "ml", Pack size "5000", Price "22". The app automatically calculates 22&nbsp;÷&nbsp;5000&nbsp;=&nbsp;€0.0044/ml. If a recipe uses 30&nbsp;ml of that oil, Costing will add €0.132 for that ingredient without you calculating anything by hand.</p>
    <h4>Search, filter and keep the list up to date</h4>
    <ul>
      <li>Use the <strong>search box</strong> to quickly find a product once the list grows.</li>
      <li>Filter by <strong>category</strong> to review, say, only drinks or dairy.</li>
      <li>Filter by <strong>supplier</strong> to see at a glance which products you buy from a given supplier (handy when preparing an order or reviewing that supplier's prices).</li>
      <li>The <strong>edit</strong> icon (pencil) lets you update the price, supplier or any field without recreating the ingredient.</li>
      <li>The <strong>delete</strong> icon (bin) removes the ingredient — only do this if it isn't used in any active recipe, since those recipes would lose that cost line.</li>
    </ul>
    <h4>Keeping prices up to date: the key to a real food cost</h4>
    <p>When you receive a new invoice from a supplier with a different price, open the Master List, edit that ingredient and update the <strong>Price</strong> (and the Pack size if the format has changed). You don't need to touch anything else.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>When you update an ingredient's price, the cost of <strong>every</strong> Costing recipe that uses it is instantly recalculated — including its food cost and margin. Keeping the Master List up to date is therefore the fastest way to have realistic cost control without recalculating recipe by recipe.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If an ingredient shows a cost of 0 or very low in Costing, it's usually because its price or pack size are set incorrectly here (for example, the pack size in grams was mixed up with the quantity in kilos). Always check these two fields if a cost doesn't add up.</div>`},
  },
  {
    title:{es:'<i class="ti ti-building-factory"></i> Proveedores', ca:'<i class="ti ti-building-factory"></i> Proveïdors', en:'<i class="ti ti-building-factory"></i> Suppliers'},
    content:{es:`<h3>Tu agenda de proveedores centralizada</h3>
    <p>Este módulo es la agenda de contactos de todos los proveedores con los que trabajas: desde el mayorista de congelados hasta el repartidor de bebidas o el proveedor de productos de limpieza. Tenerlos bien dados de alta aquí es lo que permite que, más adelante, generar un pedido sea cuestión de un par de clics en lugar de buscar el número de teléfono en una libreta.</p>
    <h4>Cómo dar de alta un proveedor</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"Nuevo Proveedor"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Nombre</strong> — el nombre comercial por el que lo reconoces (ej. "Mariscos Hermanos López", "Distribuciones Bebidas Goan").</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Contacto, Teléfono y Email</strong> — la persona de contacto habitual y sus datos. Estos campos generan enlaces directos para llamar o escribir sin copiar números.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Condiciones de pago</strong> — anota aquí cómo y cuándo pagas (ej. "Contado", "30 días fecha factura", "Transferencia semanal") para tenerlo siempre a la vista y evitar confusiones con la administración.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Día y hora de entrega</strong> — si el proveedor tiene un día fijo de reparto (ej. "Martes y viernes, por la mañana"), anótalo. Te ayuda a planificar cuándo hacer el pedido para que llegue a tiempo.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Dirección e IBAN</strong> — útiles si necesitas domiciliar pagos o enviar correspondencia.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Notas</strong> — cualquier información adicional: mínimos de pedido, descuentos por volumen, productos estacionales, incidencias habituales...</div></div>
    <h4>Vincular ingredientes a su proveedor</h4>
    <p>Desde la <strong>Mega Lista</strong>, al crear o editar cada ingrediente, asigna el proveedor correspondiente de esta lista. Esta vinculación es la que permite que, en el módulo <strong>Pedidos</strong>, puedas generar un pedido filtrado por proveedor: la app te propone automáticamente todos los ingredientes de ese proveedor que están por debajo de su stock mínimo.</p>
    <h4>Uso en el día a día</h4>
    <ul>
      <li>Antes de hacer una llamada de pedido, abre la ficha del proveedor para tener a mano el teléfono y las condiciones acordadas.</li>
      <li>Si cambias de proveedor para un producto, simplemente edítalo en la Mega Lista y selecciona el nuevo proveedor — no es necesario tocar las recetas, porque el Escandallo solo usa el precio, no el proveedor.</li>
      <li>Mantén actualizada esta lista cuando incorpores nuevos proveedores de temporada (ej. proveedor de marisco solo en Navidad).</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Cuantos más ingredientes tengas correctamente vinculados a su proveedor, más útil será el módulo de Pedidos: podrás generar el pedido completo de un proveedor con un solo clic en lugar de añadir línea a línea.</div>`,
    ca:`<h3>La teva agenda de proveïdors centralitzada</h3>
    <p>Aquest mòdul és l'agenda de contactes de tots els proveïdors amb qui treballes: des del majorista de congelats fins al repartidor de begudes o el proveïdor de productes de neteja. Tenir-los ben donats d'alta aquí és el que permet que, més endavant, generar una comanda sigui qüestió d'un parell de clics en lloc de buscar el número de telèfon en una llibreta.</p>
    <h4>Com donar d'alta un proveïdor</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"Nou Proveïdor"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Nom</strong> — el nom comercial pel qual el reconeixes (ex. "Marisc Germans López", "Distribucions Begudes Goan").</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Contacte, Telèfon i Email</strong> — la persona de contacte habitual i les seves dades. Aquests camps generen enllaços directes per trucar o escriure sense copiar números.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Condicions de pagament</strong> — anota aquí com i quan pagues (ex. "Comptat", "30 dies data factura", "Transferència setmanal") per tenir-ho sempre a la vista i evitar confusions amb l'administració.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Dia i hora de lliurament</strong> — si el proveïdor té un dia fix de repartiment (ex. "Dimarts i divendres, al matí"), anota-ho. T'ajuda a planificar quan fer la comanda perquè arribi a temps.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Adreça i IBAN</strong> — útils si necessites domiciliar pagaments o enviar correspondència.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Notes</strong> — qualsevol informació addicional: mínims de comanda, descomptes per volum, productes de temporada, incidències habituals...</div></div>
    <h4>Vincular ingredients al seu proveïdor</h4>
    <p>Des de la <strong>Mega Llista</strong>, en crear o editar cada ingredient, assigna el proveïdor corresponent d'aquesta llista. Aquesta vinculació és el que permet que, al mòdul <strong>Comandes</strong>, puguis generar una comanda filtrada per proveïdor: l'app et proposa automàticament tots els ingredients d'aquell proveïdor que estan per sota del seu estoc mínim.</p>
    <h4>Ús en el dia a dia</h4>
    <ul>
      <li>Abans de fer una trucada de comanda, obre la fitxa del proveïdor per tenir a mà el telèfon i les condicions acordades.</li>
      <li>Si canvies de proveïdor per a un producte, simplement edita'l a la Mega Llista i selecciona el nou proveïdor — no cal tocar les receptes, perquè l'Escandall només fa servir el preu, no el proveïdor.</li>
      <li>Mantén actualitzada aquesta llista quan incorporis nous proveïdors de temporada (ex. proveïdor de marisc només a Nadal).</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Com més ingredients tinguis correctament vinculats al seu proveïdor, més útil serà el mòdul de Comandes: podràs generar la comanda completa d'un proveïdor amb un sol clic en lloc d'afegir línia a línia.</div>`,
    en:`<h3>Your centralised supplier directory</h3>
    <p>This module is the contact directory for every supplier you work with: from the frozen-food wholesaler to the drinks delivery driver or the cleaning-products supplier. Registering them properly here is what later lets you generate an order in a couple of clicks instead of hunting for a phone number in a notebook.</p>
    <h4>How to register a supplier</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"New Supplier"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Name</strong> — the trade name you recognise them by (e.g. "López Bros. Seafood", "Goan Beverage Distribution").</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Contact, Phone and Email</strong> — the usual contact person and their details. These fields generate direct links to call or message without copying numbers.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Payment terms</strong> — note here how and when you pay (e.g. "Cash", "30 days from invoice date", "Weekly transfer") so it's always visible and avoids confusion with admin.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Delivery day and time</strong> — if the supplier has a fixed delivery day (e.g. "Tuesdays and Fridays, morning"), note it down. It helps you plan when to place an order so it arrives on time.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Address and IBAN</strong> — useful if you need to set up direct debits or send correspondence.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Notes</strong> — any extra information: minimum order sizes, volume discounts, seasonal products, recurring issues...</div></div>
    <h4>Linking ingredients to their supplier</h4>
    <p>From the <strong>Master List</strong>, when creating or editing each ingredient, assign the matching supplier from this list. This link is what lets you, in the <strong>Orders</strong> module, generate an order filtered by supplier: the app automatically suggests every ingredient from that supplier that's below its minimum stock.</p>
    <h4>Day-to-day use</h4>
    <ul>
      <li>Before making an order call, open the supplier's record to have their phone number and agreed terms at hand.</li>
      <li>If you switch suppliers for a product, simply edit it in the Master List and select the new supplier — there's no need to touch recipes, since Costing only uses the price, not the supplier.</li>
      <li>Keep this list updated when you bring on new seasonal suppliers (e.g. a seafood supplier only around Christmas).</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>The more ingredients you have properly linked to their supplier, the more useful the Orders module becomes: you'll be able to generate a supplier's full order in a single click instead of adding it line by line.</div>`},
  },
  {
    title:{es:'<i class="ti ti-calculator"></i> Escandallo', ca:'<i class="ti ti-calculator"></i> Escandall', en:'<i class="ti ti-calculator"></i> Costing'},
    content:{es:`<h3>Qué es un escandallo y para qué sirve</h3>
    <p>El escandallo es la <strong>ficha de coste de cada plato</strong>: el desglose de qué ingredientes lleva, en qué cantidad, y cuánto cuesta cada uno según los precios de tu Mega Lista. Con él sabes <strong>cuánto te cuesta realmente producir un plato</strong> y, comparándolo con su precio de venta, si ese plato te da margen o te hace perder dinero. Es la herramienta más directa para fijar precios de carta con criterio en lugar de "a ojo".</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Al entrar en Escandallo ves primero las <strong>carpetas por categoría</strong>; al pulsar una, la lista de <strong>nombres de platos</strong>; y al pulsar un nombre, su <strong>escandallo completo</strong>. Así no se satura la pantalla cuando tienes muchos platos. (El buscador sigue mostrando los resultados directos.) El Stock funciona igual: carpetas → producto → detalle.</div>
    <h4>Cómo crear una receta paso a paso</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"Nuevo Plato"</strong> (o "Nueva Elaboración" si es un semielaborado que usarás dentro de otras recetas, como una salsa o un caldo base).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Ponle <strong>nombre</strong> (el mismo que aparecerá luego en la Carta) y elige la <strong>categoría</strong> (Entrantes, Principales, Postres, Cócteles...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Indica los <strong>comensales/raciones</strong> que rinde la receta tal y como la estás introduciendo — esto es clave si introduces, por ejemplo, una receta de fondo de tomate para 10 raciones: el sistema calculará el coste por ración dividiendo entre 10.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Añade líneas de <strong>ingredientes</strong>: selecciona cada uno del desplegable (proviene directamente de tu Mega Lista — si no aparece el que buscas, primero debes crearlo allí).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Para cada ingrediente indica la <strong>cantidad neta</strong> que lleva el plato en la unidad correspondiente (gramos, mililitros o unidades): la cantidad que realmente queda en el plato servido, ya limpia y lista.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Indica la <strong>merma</strong> de ese ingrediente: el porcentaje de producto que se pierde al limpiar, pelar, deshuesar o cocinar (por ejemplo, un pescado entero puede tener un 30-40% de merma entre espinas, piel y cabeza; una verdura pelada puede tener un 10-15%).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">El sistema calcula automáticamente la <strong>cantidad bruta</strong> (lo que realmente debes comprar/sacar de almacén) y el <strong>coste</strong> de esa línea, multiplicando la cantidad bruta por el precio unitario de la Mega Lista.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Repite para todos los ingredientes del plato. El <strong>coste total</strong> de la receta es la suma de todas las líneas, y el <strong>coste por ración</strong> es ese total dividido entre los comensales indicados.</div></div>
    <h4>La fórmula de la merma, explicada con un ejemplo</h4>
    <p>La relación es: <strong>cantidad bruta = cantidad neta × (1 + merma%)</strong>.</p>
    <p>Ejemplo: tu receta necesita <strong>100&nbsp;g netos</strong> de lomo de merluza ya limpio para el plato. Si al limpiar la merluza entera pierdes un 20% (espinas, piel, recortes), necesitas comprar/usar <strong>100 × (1 + 0,20) = 120&nbsp;g brutos</strong> de merluza para obtener esos 100&nbsp;g netos. El escandallo calculará el coste de la receta usando esos 120&nbsp;g al precio por gramo de la Mega Lista — no los 100&nbsp;g, porque esos 20&nbsp;g de merma también los has pagado.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si dejas la merma a 0% en productos que sí tienen desperdicio (pescados con piel/espina, verduras sin pelar, carnes con grasa o hueso), tu coste real estará infravalorado y el food cost que verás será más bajo que el real. Revisa la merma de cada ingrediente con cuidado, especialmente en pescados y carnes.</div>
    <h4>Consumibles: el "extra" que no se mide plato a plato</h4>
    <p>El campo <strong>Consumibles (%)</strong> añade un porcentaje sobre el coste de la receta para cubrir ingredientes que serían imposibles o muy tediosos de medir línea a línea: el chorrito de aceite para saltear, la sal, las especias, el agua, el gas o la electricidad del horno, el papel de horno, etc. Un valor habitual está entre el <strong>5% y el 8%</strong> del coste de la receta, aunque puede variar según el tipo de plato (un plato muy elaborado con muchas cocciones puede justificar un % algo mayor).</p>
    <h4>PVP (precio de venta) y food cost</h4>
    <p>En el campo <strong>PVP</strong> introduce el precio al que vendes (o quieres vender) ese plato al cliente, IVA incluido o sin él según cómo trabajes habitualmente — sé consistente con el resto de tus cálculos. La app calcula automáticamente el <strong>food cost</strong> como: <em>coste de la receta (con consumibles) ÷ PVP × 100</em>.</p>
    <p>El resultado se colorea como semáforo para que lo veas de un vistazo:</p>
    <table>
      <tr><th>Color</th><th>Food cost</th><th>Qué significa</th></tr>
      <tr><td>🟢 Verde</td><td>menor del 30%</td><td>Margen saludable, plato muy rentable</td></tr>
      <tr><td>🟡 Ámbar</td><td>entre 30% y 35%</td><td>Margen aceptable, vigílalo</td></tr>
      <tr><td>🔴 Rojo</td><td>mayor del 35%</td><td>Margen ajustado o negativo — revisa precio, ración o proveedor</td></tr>
    </table>
    <h4>Qué hacer cuando un plato sale en rojo</h4>
    <ul>
      <li><strong>Sube el PVP</strong> si el mercado lo permite (compara con la competencia).</li>
      <li><strong>Ajusta la ración</strong> — quizá la cantidad neta es mayor de lo necesario para el tipo de plato.</li>
      <li><strong>Busca otro proveedor o formato de compra</strong> más económico para los ingredientes que más pesan en el coste.</li>
      <li><strong>Revisa la merma real</strong> — a veces una mejor técnica de limpieza/corte reduce el desperdicio.</li>
      <li>Si nada de esto es viable, valora si ese plato debe seguir en carta o sustituirlo por otro con mejor margen.</li>
    </ul>
    <h4>Elaboraciones propias (semielaborados)</h4>
    <p>Usa <strong>"Nueva Elaboración"</strong> para crear bases que luego se usan dentro de otras recetas (caldos, salsas, masas, mises en place). Defínelas igual que una receta normal, indicando para cuántas raciones o qué cantidad total rinden; después podrás añadirlas como un "ingrediente" más dentro de otras recetas del Escandallo, y su coste por unidad se calculará y propagará igual que el de cualquier ingrediente de la Mega Lista.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Una vez creado el escandallo de un plato, ya no tienes que volver a calcular nada manualmente: si cambia el precio de un ingrediente en la Mega Lista, este plato (y su food cost y margen) se actualizan solos. Revisa el Escandallo periódicamente, sobre todo tras subidas de precios de proveedores, para detectar platos que han pasado a zona ámbar o roja.</div>`,
    ca:`<h3>Què és un escandall i per a què serveix</h3>
    <p>L'escandall és la <strong>fitxa de cost de cada plat</strong>: el desglossament de quins ingredients porta, en quina quantitat, i quant costa cadascun segons els preus de la teva Mega Llista. Amb ell saps <strong>quant et costa realment produir un plat</strong> i, comparant-ho amb el seu preu de venda, si aquest plat et dona marge o et fa perdre diners. És l'eina més directa per fixar preus de carta amb criteri en lloc de "a ull".</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>En entrar a Escandall veus primer les <strong>carpetes per categoria</strong>; en prémer-ne una, la llista de <strong>noms de plats</strong>; i en prémer un nom, el seu <strong>escandall complet</strong>. Així no se satura la pantalla quan tens molts plats. (El cercador continua mostrant els resultats directes.) L'Estoc funciona igual: carpetes → producte → detall.</div>
    <h4>Com crear una recepta pas a pas</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"Nou Plat"</strong> (o "Nova Elaboració" si és un semielaborat que faràs servir dins d'altres receptes, com una salsa o un brou base).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Posa-li <strong>nom</strong> (el mateix que apareixerà després a la Carta) i tria la <strong>categoria</strong> (Entrants, Principals, Postres, Còctels...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Indica els <strong>comensals/racions</strong> que rendeix la recepta tal com l'estàs introduint — això és clau si introdueixes, per exemple, una recepta de sofregit per a 10 racions: el sistema calcularà el cost per ració dividint entre 10.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Afegeix línies d'<strong>ingredients</strong>: selecciona cadascun del desplegable (prové directament de la teva Mega Llista — si no apareix el que busques, primer l'has de crear allà).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Per a cada ingredient indica la <strong>quantitat neta</strong> que porta el plat en la unitat corresponent (grams, mil·lilitres o unitats): la quantitat que realment queda al plat servit, ja neta i llesta.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Indica la <strong>merma</strong> d'aquest ingredient: el percentatge de producte que es perd en netejar, pelar, desossar o cuinar (per exemple, un peix sencer pot tenir un 30-40% de merma entre espines, pell i cap; una verdura pelada pot tenir un 10-15%).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">El sistema calcula automàticament la <strong>quantitat bruta</strong> (el que realment has de comprar/treure del magatzem) i el <strong>cost</strong> d'aquesta línia, multiplicant la quantitat bruta pel preu unitari de la Mega Llista.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Repeteix per a tots els ingredients del plat. El <strong>cost total</strong> de la recepta és la suma de totes les línies, i el <strong>cost per ració</strong> és aquest total dividit entre els comensals indicats.</div></div>
    <h4>La fórmula de la merma, explicada amb un exemple</h4>
    <p>La relació és: <strong>quantitat bruta = quantitat neta × (1 + merma%)</strong>.</p>
    <p>Exemple: la teva recepta necessita <strong>100&nbsp;g nets</strong> de llom de lluç ja net per al plat. Si en netejar el lluç sencer perds un 20% (espines, pell, retalls), necessites comprar/fer servir <strong>100 × (1 + 0,20) = 120&nbsp;g bruts</strong> de lluç per obtenir aquests 100&nbsp;g nets. L'escandall calcularà el cost de la recepta fent servir aquests 120&nbsp;g al preu per gram de la Mega Llista — no els 100&nbsp;g, perquè aquells 20&nbsp;g de merma també els has pagat.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si deixes la merma a 0% en productes que sí que tenen rebuig (peixos amb pell/espina, verdures sense pelar, carns amb greix o os), el teu cost real estarà infravalorat i el food cost que veuràs serà més baix que el real. Revisa la merma de cada ingredient amb cura, especialment en peixos i carns.</div>
    <h4>Consumibles: l'"extra" que no es mesura plat a plat</h4>
    <p>El camp <strong>Consumibles (%)</strong> afegeix un percentatge sobre el cost de la recepta per cobrir ingredients que serien impossibles o molt feixucs de mesurar línia a línia: el rajolí d'oli per saltejar, la sal, les espècies, l'aigua, el gas o l'electricitat del forn, el paper de forn, etc. Un valor habitual és entre el <strong>5% i el 8%</strong> del cost de la recepta, tot i que pot variar segons el tipus de plat (un plat molt elaborat amb moltes coccions pot justificar un % una mica més gran).</p>
    <h4>PVP (preu de venda) i food cost</h4>
    <p>Al camp <strong>PVP</strong> introdueix el preu al qual vens (o vols vendre) aquest plat al client, IVA inclòs o sense segons com treballis habitualment — sigues consistent amb la resta dels teus càlculs. L'app calcula automàticament el <strong>food cost</strong> com: <em>cost de la recepta (amb consumibles) ÷ PVP × 100</em>.</p>
    <p>El resultat es pinta com un semàfor perquè el vegis d'un cop d'ull:</p>
    <table>
      <tr><th>Color</th><th>Food cost</th><th>Què significa</th></tr>
      <tr><td>🟢 Verd</td><td>menys del 30%</td><td>Marge saludable, plat molt rendible</td></tr>
      <tr><td>🟡 Ambre</td><td>entre 30% i 35%</td><td>Marge acceptable, vigila'l</td></tr>
      <tr><td>🔴 Vermell</td><td>més del 35%</td><td>Marge ajustat o negatiu — revisa preu, ració o proveïdor</td></tr>
    </table>
    <h4>Què fer quan un plat surt en vermell</h4>
    <ul>
      <li><strong>Puja el PVP</strong> si el mercat ho permet (compara amb la competència).</li>
      <li><strong>Ajusta la ració</strong> — potser la quantitat neta és més gran del necessari per al tipus de plat.</li>
      <li><strong>Busca un altre proveïdor o format de compra</strong> més econòmic per als ingredients que més pesen en el cost.</li>
      <li><strong>Revisa la merma real</strong> — de vegades una millor tècnica de neteja/tall redueix el rebuig.</li>
      <li>Si res d'això és viable, valora si aquest plat ha de seguir a la carta o substituir-lo per un altre amb millor marge.</li>
    </ul>
    <h4>Elaboracions pròpies (semielaborats)</h4>
    <p>Fes servir <strong>"Nova Elaboració"</strong> per crear bases que després es fan servir dins d'altres receptes (brous, salses, masses, mises en place). Defineix-les igual que una recepta normal, indicant per a quantes racions o quina quantitat total rendeixen; després les podràs afegir com un "ingredient" més dins d'altres receptes de l'Escandall, i el seu cost per unitat es calcularà i es propagarà igual que el de qualsevol ingredient de la Mega Llista.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Un cop creat l'escandall d'un plat, ja no has de tornar a calcular res manualment: si canvia el preu d'un ingredient a la Mega Llista, aquest plat (i el seu food cost i marge) s'actualitzen sols. Revisa l'Escandall periòdicament, sobretot després de pujades de preus de proveïdors, per detectar plats que han passat a zona ambre o vermella.</div>`,
    en:`<h3>What a costing sheet is and what it's for</h3>
    <p>Costing is the <strong>cost record for each dish</strong>: the breakdown of which ingredients go into it, in what quantity, and how much each one costs based on your Master List prices. With it, you know <strong>how much a dish really costs you to make</strong> and, comparing it with its selling price, whether it earns you a margin or loses you money. It's the most direct tool for setting menu prices with judgement instead of guesswork.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>When you open Costing you first see <strong>folders by category</strong>; tapping one shows the list of <strong>dish names</strong>; and tapping a name shows its <strong>full costing sheet</strong>. This keeps the screen from getting cluttered when you have many dishes. (The search box still shows direct results.) Stock works the same way: folders → product → detail.</div>
    <h4>How to create a recipe step by step</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"New Dish"</strong> (or "New Preparation" if it's a semi-finished item you'll use inside other recipes, such as a sauce or a base stock).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Give it a <strong>name</strong> (the same one that will later appear in the Menu) and choose the <strong>category</strong> (Starters, Mains, Desserts, Cocktails...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Enter the <strong>servings</strong> the recipe yields as you're entering it — this is key if, for example, you enter a tomato-sauce-base recipe for 10 servings: the system will calculate the cost per serving by dividing by 10.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Add <strong>ingredient</strong> lines: pick each one from the dropdown (it comes straight from your Master List — if the one you want isn't there, create it there first).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">For each ingredient, enter the <strong>net quantity</strong> the dish contains in the matching unit (grams, millilitres or units): the amount that's actually left on the served plate, already cleaned and ready.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Enter that ingredient's <strong>waste %</strong>: the percentage of product lost while cleaning, peeling, boning or cooking (for example, a whole fish can lose 30-40% to bones, skin and head; a peeled vegetable can lose 10-15%).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">The system automatically calculates the <strong>gross quantity</strong> (what you actually need to buy/pull from storage) and the <strong>cost</strong> of that line, by multiplying the gross quantity by the Master List's unit price.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">Repeat for every ingredient in the dish. The recipe's <strong>total cost</strong> is the sum of all lines, and the <strong>cost per serving</strong> is that total divided by the number of servings entered.</div></div>
    <h4>The waste formula, explained with an example</h4>
    <p>The relationship is: <strong>gross quantity = net quantity × (1 + waste%)</strong>.</p>
    <p>Example: your recipe needs <strong>100&nbsp;g net</strong> of already-cleaned hake loin for the dish. If cleaning the whole hake loses 20% (bones, skin, trimmings), you need to buy/use <strong>100 × (1 + 0.20) = 120&nbsp;g gross</strong> of hake to get those 100&nbsp;g net. Costing will calculate the recipe's cost using those 120&nbsp;g at the Master List's price per gram — not the 100&nbsp;g, because you also paid for that 20&nbsp;g of waste.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If you leave waste at 0% for products that do have waste (fish with skin/bones, unpeeled vegetables, meat with fat or bone), your real cost will be understated and the food cost you see will be lower than the real one. Check each ingredient's waste carefully, especially for fish and meat.</div>
    <h4>Consumables: the "extra" that isn't measured dish by dish</h4>
    <p>The <strong>Consumables (%)</strong> field adds a percentage on top of the recipe cost to cover ingredients that would be impossible or too tedious to measure line by line: the splash of oil for sautéing, salt, spices, water, oven gas or electricity, baking paper, etc. A typical value is between <strong>5% and 8%</strong> of the recipe's cost, though it can vary by dish type (a very elaborate dish with many cooking steps may justify a slightly higher %).</p>
    <h4>Selling price and food cost</h4>
    <p>In the <strong>Selling price</strong> field, enter the price you sell (or want to sell) that dish to the customer for, VAT included or not depending on how you usually work — be consistent with the rest of your calculations. The app automatically calculates the <strong>food cost</strong> as: <em>recipe cost (with consumables) ÷ selling price × 100</em>.</p>
    <p>The result is colour-coded like a traffic light so you can see it at a glance:</p>
    <table>
      <tr><th>Colour</th><th>Food cost</th><th>What it means</th></tr>
      <tr><td>🟢 Green</td><td>under 30%</td><td>Healthy margin, very profitable dish</td></tr>
      <tr><td>🟡 Amber</td><td>between 30% and 35%</td><td>Acceptable margin, keep an eye on it</td></tr>
      <tr><td>🔴 Red</td><td>over 35%</td><td>Tight or negative margin — review price, portion size or supplier</td></tr>
    </table>
    <h4>What to do when a dish shows red</h4>
    <ul>
      <li><strong>Raise the selling price</strong> if the market allows it (compare with competitors).</li>
      <li><strong>Adjust the portion size</strong> — the net quantity may be larger than needed for that type of dish.</li>
      <li><strong>Look for a cheaper supplier or pack size</strong> for the ingredients that weigh most on the cost.</li>
      <li><strong>Review the actual waste</strong> — sometimes a better cleaning/cutting technique reduces waste.</li>
      <li>If none of this is viable, consider whether that dish should stay on the menu or be replaced with one with a better margin.</li>
    </ul>
    <h4>In-house preparations (semi-finished items)</h4>
    <p>Use <strong>"New Preparation"</strong> to create bases that are later used inside other recipes (stocks, sauces, doughs, mise en place). Define them just like a normal recipe, stating how many servings or what total quantity they yield; afterwards you can add them as another "ingredient" inside other Costing recipes, and their cost per unit will be calculated and propagated just like any Master List ingredient.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Once a dish's costing sheet is created, you never have to recalculate anything manually again: if an ingredient's price changes in the Master List, this dish (and its food cost and margin) update automatically. Review Costing periodically, especially after supplier price rises, to spot dishes that have moved into the amber or red zone.</div>`},
  },
  {
    title:{es:'<i class="ti ti-file-text"></i> Fichas Técnicas', ca:'<i class="ti ti-file-text"></i> Fitxes Tècniques', en:'<i class="ti ti-file-text"></i> Technical Sheets'},
    content:{es:`<h3>El "manual de instrucciones" de cada plato</h3>
    <p>Mientras que el Escandallo se centra en el <strong>coste</strong> de un plato, la Ficha Técnica se centra en su <strong>ejecución</strong>: cómo se prepara paso a paso, cómo se presenta y qué alérgenos contiene. Es la herramienta que garantiza que un plato salga igual sin importar quién esté ese día en la partida, y es también el documento que necesitas tener a mano (y a veces mostrar) ante una inspección de seguridad alimentaria por el control de alérgenos.</p>
    <h4>Creación automática desde el Escandallo</h4>
    <p>Para no tener que volver a escribir nombre, comensales e ingredientes, al entrar en Fichas Técnicas la app te muestra automáticamente la lista de <strong>recetas del Escandallo que todavía no tienen ficha creada</strong>. Pulsa sobre una de ellas y se generará una ficha nueva pre-rellenada con:</p>
    <ul>
      <li>El nombre del plato</li>
      <li>El número de comensales/raciones</li>
      <li>La lista de ingredientes con sus gramajes (netos y brutos) tal y como están en el Escandallo</li>
    </ul>
    <p>A partir de esa base, solo tienes que completar la parte que no está en el Escandallo: los pasos y los alérgenos.</p>
    <h4>Cómo redactar los pasos de elaboración</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Añade los pasos <strong>en el orden real de trabajo</strong>, desde la preparación de ingredientes (mise en place) hasta el emplatado final.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Sé concreto con tiempos, temperaturas y técnicas: por ejemplo, "Sellar el solomillo en plancha muy caliente, 1 minuto por cada lado" en lugar de "cocinar la carne".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Separa los pasos en unidades pequeñas y numeradas — es más fácil de seguir durante el servicio que un párrafo largo.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Si hay puntos críticos de seguridad alimentaria (temperaturas mínimas de cocción, tiempos de regeneración, etc.), indícalos explícitamente en el paso correspondiente.</div></div>
    <h4>Alérgenos: los 14 reglamentarios de la UE</h4>
    <p>La normativa europea obliga a informar de la presencia de 14 alérgenos e intolerancias en los alimentos que se sirven: <strong>cereales con gluten, crustáceos, huevos, pescado, cacahuetes, soja, leche/lácteos, frutos de cáscara, apio, mostaza, sésamo, dióxido de azufre/sulfitos, altramuces y moluscos</strong>. En la Ficha Técnica marca todos los que apliquen al plato, revisando también los ingredientes "ocultos" (por ejemplo, muchas salsas comerciales llevan gluten o lácteos como espesante).</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Revisa los alérgenos cada vez que cambies un ingrediente de una receta en el Escandallo (por ejemplo, si sustituyes un caldo casero por uno comercial). Un cambio de proveedor o de producto puede introducir un alérgeno que antes no estaba presente.</div>
    <h4>Presentación / emplatado</h4>
    <p>Describe cómo debe verse el plato en el momento de servir: tipo de plato o recipiente, disposición de los elementos, salsas y su colocación, guarniciones, decoración y temperatura de servicio. Si es posible, complementa la descripción con una foto de referencia que el equipo pueda consultar.</p>
    <h4>Imprimir y usar en cocina</h4>
    <p>El botón <strong>Imprimir</strong> genera una hoja limpia con toda la información de la ficha (ingredientes, pasos, alérgenos y presentación), lista para imprimir, plastificar y colgar en la partida correspondiente de la cocina. Es especialmente útil para:</p>
    <ul>
      <li>Formar a personal nuevo sin depender de que alguien le "enseñe de memoria"</li>
      <li>Mantener la consistencia cuando hay varios turnos o varios cocineros rotando</li>
      <li>Tener a mano la información de alérgenos para responder con seguridad a un cliente que pregunte</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Dedica un rato a completar las fichas de los platos más vendidos primero — son los que más impacto tienen en la consistencia del servicio y en las preguntas de alérgenos de los clientes.</div>`,
    ca:`<h3>El "manual d'instruccions" de cada plat</h3>
    <p>Mentre que l'Escandall se centra en el <strong>cost</strong> d'un plat, la Fitxa Tècnica se centra en la seva <strong>execució</strong>: com es prepara pas a pas, com es presenta i quins al·lergens conté. És l'eina que garanteix que un plat surti igual sigui qui sigui qui estigui aquell dia a la partida, i és també el document que necessites tenir a mà (i de vegades mostrar) davant una inspecció de seguretat alimentària pel control d'al·lergens.</p>
    <h4>Creació automàtica des de l'Escandall</h4>
    <p>Per no haver de tornar a escriure nom, comensals i ingredients, en entrar a Fitxes Tècniques l'app et mostra automàticament la llista de <strong>receptes de l'Escandall que encara no tenen fitxa creada</strong>. Prem sobre una i es generarà una fitxa nova preomplerta amb:</p>
    <ul>
      <li>El nom del plat</li>
      <li>El nombre de comensals/racions</li>
      <li>La llista d'ingredients amb els seus gramatges (nets i bruts) tal com estan a l'Escandall</li>
    </ul>
    <p>A partir d'aquesta base, només has de completar la part que no és a l'Escandall: els passos i els al·lergens.</p>
    <h4>Com redactar els passos d'elaboració</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Afegeix els passos <strong>en l'ordre real de treball</strong>, des de la preparació d'ingredients (mise en place) fins a l'emplatat final.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Sigues concret amb temps, temperatures i tècniques: per exemple, "Segellar el filet a la planxa molt calenta, 1 minut per cada costat" en lloc de "cuinar la carn".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Separa els passos en unitats petites i numerades — és més fàcil de seguir durant el servei que un paràgraf llarg.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Si hi ha punts crítics de seguretat alimentària (temperatures mínimes de cocció, temps de regeneració, etc.), indica'ls explícitament al pas corresponent.</div></div>
    <h4>Al·lergens: els 14 reglamentaris de la UE</h4>
    <p>La normativa europea obliga a informar de la presència de 14 al·lergens i intoleràncies als aliments que se serveixen: <strong>cereals amb gluten, crustacis, ous, peix, cacauets, soja, llet/làctics, fruits de closca, api, mostassa, sèsam, diòxid de sofre/sulfits, tramussos i mol·luscos</strong>. A la Fitxa Tècnica marca tots els que apliquin al plat, revisant també els ingredients "ocults" (per exemple, moltes salses comercials porten gluten o làctics com a espessidor).</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Revisa els al·lergens cada vegada que canviïs un ingredient d'una recepta a l'Escandall (per exemple, si substitueixes un brou casolà per un de comercial). Un canvi de proveïdor o de producte pot introduir un al·lergen que abans no hi era present.</div>
    <h4>Presentació / emplatat</h4>
    <p>Descriu com ha de veure's el plat en el moment de servir: tipus de plat o recipient, disposició dels elements, salses i la seva col·locació, guarnicions, decoració i temperatura de servei. Si és possible, complementa la descripció amb una foto de referència que l'equip pugui consultar.</p>
    <h4>Imprimir i fer servir a cuina</h4>
    <p>El botó <strong>Imprimir</strong> genera un full net amb tota la informació de la fitxa (ingredients, passos, al·lergens i presentació), a punt per imprimir, plastificar i penjar a la partida corresponent de la cuina. És especialment útil per:</p>
    <ul>
      <li>Formar personal nou sense dependre que algú li "ensenyi de memòria"</li>
      <li>Mantenir la consistència quan hi ha diversos torns o diversos cuiners rotant</li>
      <li>Tenir a mà la informació d'al·lergens per respondre amb seguretat a un client que pregunti</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Dedica una estona a completar les fitxes dels plats més venuts primer — són els que més impacte tenen en la consistència del servei i en les preguntes d'al·lergens dels clients.</div>`,
    en:`<h3>The "instruction manual" for each dish</h3>
    <p>While Costing focuses on a dish's <strong>cost</strong>, the Technical Sheet focuses on its <strong>execution</strong>: how it's prepared step by step, how it's plated and which allergens it contains. It's the tool that ensures a dish comes out the same regardless of who's on that station that day, and it's also the document you need to have on hand (and sometimes show) during a food-safety inspection for allergen control.</p>
    <h4>Automatic creation from Costing</h4>
    <p>So you don't have to re-type the name, servings and ingredients, when you open Technical Sheets the app automatically shows you the list of <strong>Costing recipes that don't have a sheet yet</strong>. Tap one and a new sheet is generated, pre-filled with:</p>
    <ul>
      <li>The dish's name</li>
      <li>The number of servings</li>
      <li>The ingredient list with its weights (net and gross) as they appear in Costing</li>
    </ul>
    <p>From that base, you only need to fill in what isn't in Costing: the steps and the allergens.</p>
    <h4>How to write the preparation steps</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Add the steps <strong>in the actual working order</strong>, from ingredient prep (mise en place) to final plating.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Be specific about times, temperatures and techniques: for example, "Sear the sirloin on a very hot griddle, 1 minute per side" instead of "cook the meat".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Split the steps into small, numbered units — easier to follow during service than one long paragraph.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">If there are critical food-safety points (minimum cooking temperatures, reheating times, etc.), state them explicitly in the relevant step.</div></div>
    <h4>Allergens: the EU's 14 regulated allergens</h4>
    <p>EU regulations require disclosing the presence of 14 allergens and intolerances in food served: <strong>cereals containing gluten, crustaceans, eggs, fish, peanuts, soybeans, milk/dairy, tree nuts, celery, mustard, sesame, sulphur dioxide/sulphites, lupin and molluscs</strong>. In the Technical Sheet, tick every one that applies to the dish, also checking for "hidden" ingredients (for example, many commercial sauces contain gluten or dairy as a thickener).</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Review the allergens every time you change an ingredient in a Costing recipe (for example, if you swap a homemade stock for a commercial one). A change of supplier or product can introduce an allergen that wasn't there before.</div>
    <h4>Plating / presentation</h4>
    <p>Describe how the dish should look when served: type of plate or dish, layout of the elements, sauces and their placement, garnishes, decoration and serving temperature. If possible, add a reference photo the team can check.</p>
    <h4>Print and use in the kitchen</h4>
    <p>The <strong>Print</strong> button generates a clean sheet with all the sheet's information (ingredients, steps, allergens and plating), ready to print, laminate and hang at the relevant kitchen station. It's especially useful for:</p>
    <ul>
      <li>Training new staff without relying on someone "teaching from memory"</li>
      <li>Keeping consistency when there are several shifts or several cooks rotating</li>
      <li>Having allergen information at hand to answer a customer's question confidently</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Spend some time completing the sheets for your best-selling dishes first — they have the biggest impact on service consistency and on customers' allergen questions.</div>`},
  },
  {
    title:{es:'<i class="ti ti-tools-kitchen-2"></i> Carta', ca:'<i class="ti ti-tools-kitchen-2"></i> Carta', en:'<i class="ti ti-tools-kitchen-2"></i> Menu'},
    content:{es:`<h3>De las recetas a lo que ve el cliente</h3>
    <p>La Carta es la traducción de tu Escandallo en algo que el cliente puede pedir: una colección de platos organizados por secciones, con su precio de venta, agrupados en una o varias "cartas" que se activan según el día y la hora. Es el puente entre tu trabajo de cocina (recetas con coste calculado) y la operativa de sala (TPV y pedidos online).</p>
    <h4>Por qué tener varias cartas</h4>
    <p>Muchos negocios no ofrecen siempre lo mismo: el menú del mediodía no es la carta de la noche, el fin de semana hay platos especiales, o existe una carta de bebidas distinta a la de comida. GastroGoan permite crear <strong>tantas cartas como necesites</strong> (Carta de Mediodía, Carta de Noche, Carta de Bebidas, Carta de Fin de Semana...) y programarlas para que se activen solas según el horario.</p>
    <h4>Cartas de comida (Cocina) y cartas de bebidas (Sala)</h4>
    <p>El módulo Carta está tanto en <strong>Cocina</strong> como en <strong>Sala</strong>. Cualquier carta o menú que crees entrando desde <strong>Sala se considera carta de bebidas</strong>; las que creas desde <strong>Cocina son de comida</strong>. Esto es importante porque las <strong>bebidas no aparecen en la pantalla de Cocina</strong> (allí solo sale la comida a elaborar), y en el TPV las pestañas de carta salen siempre con las bebidas primero. No tienes que marcar nada: se sabe por el área desde la que creas la carta.</p>
    <h4>Traducción automática de la carta</h4>
    <p>Los nombres de secciones y platos se <strong>traducen solos</strong> (castellano, catalán e inglés) en segundo plano al guardar la carta, usando un traductor automático. Cuando cambies el idioma de la app (selector de arriba), la carta se mostrará en ese idioma tanto al equipo como, en la web pública, a tus clientes.</p>
    <h4>Cómo crear una carta paso a paso</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"Nueva Carta"</strong> y dale un nombre descriptivo (ej. "Carta Mediodía", "Carta Bebidas").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Configura el <strong>horario de activación</strong>: elige el <strong>Turno</strong> (Turno 1, Turno 2, o "todo el horario de apertura") y marca los <strong>días de la semana</strong> en los que esta carta debe estar activa. Las horas concretas de cada turno se toman del <strong>Horario de apertura</strong> que hayas configurado en Mi Negocio — así no tienes que repetir horarios en cada carta.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Crea <strong>secciones</strong> para organizar la carta (ej. Entrantes, Arroces, Carnes, Pescados, Postres, Cócteles, Refrescos...). Pulsa <strong>"Nueva Sección"</strong> y dale nombre.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Dentro de cada sección, pulsa <strong>"Importar del Escandallo"</strong> para añadir platos que ya tienes definidos con su receta y coste. Se importan con el nombre y puedes ajustar el precio de venta si todavía no lo habías fijado en el Escandallo.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Si necesitas un plato que no tiene receta en el Escandallo (por ejemplo, un producto envasado que revendes tal cual, como una lata de refresco o un postre comprado), añádelo como <strong>plato manual</strong> directamente desde la Carta, indicando nombre y precio.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Repite para todas las secciones hasta tener la carta completa.</div></div>
    <h4>Disponibilidad de platos: el interruptor más usado del día a día</h4>
    <p>Cada plato de la carta tiene un interruptor <strong>Disponible / No disponible</strong>. Cuando se te acabe un producto durante el servicio (por ejemplo, "se ha terminado el rape"), simplemente desactiva ese plato:</p>
    <ul>
      <li>Deja de aparecer inmediatamente en el <strong>TPV</strong>, así el equipo de sala no puede comandarlo por error.</li>
      <li>Deja de aparecer en la <strong>web de pedidos online</strong> (Take Away/Delivery), evitando que un cliente pida algo que no puedes servir.</li>
    </ul>
    <p>Al día siguiente, cuando vuelvas a tener el producto, simplemente reactiva el interruptor — no hace falta volver a crear el plato.</p>
    <h4>Cómo se decide qué carta está activa en el TPV</h4>
    <p>Con la opción <strong>"Cambio automático según horario"</strong> activada (que es el comportamiento por defecto), GastroGoan revisa continuamente el día y la hora actuales y activa automáticamente la carta (y la carta de bebidas, si la tienes separada) que hayas programado para ese momento según el paso 2. El equipo de sala no tiene que hacer nada: al entrar en el TPV, la carta correcta ya está activa.</p>
    <p>Si por alguna razón necesitas forzar manualmente otra carta (por ejemplo, un evento especial), puedes <strong>desactivar el cambio automático</strong> desde la configuración y elegir tú mismo la carta activa desde el desplegable correspondiente en el TPV. Recuerda volver a activarlo después si quieres que el sistema retome el control automático.</p>
    <h4>La carta y los pedidos online</h4>
    <p>La carta activa en el TPV es exactamente la misma que se muestra en la página pública de pedidos online (Take Away/Delivery) y en el QR de las mesas. Esto significa que cualquier cambio que hagas aquí (disponibilidad, precios, secciones) se refleja también de cara al cliente, normalmente en pocos segundos.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si tus clientes ven el mensaje "La carta no está disponible" en la web de pedidos online, comprueba: (1) que exista una carta programada para el día y hora actuales en su horario de activación, y (2) que esa carta tenga al menos un plato marcado como Disponible. Si ambas cosas están en orden, el aviso desaparecerá en cuanto entréis en ese tramo horario.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Organiza las secciones en el mismo orden en que aparecen físicamente en tu carta de papel o pizarra — facilita que el equipo encuentre rápido los platos durante el servicio, sobre todo en horas de mucho ritmo.</div>`,
    ca:`<h3>De les receptes al que veu el client</h3>
    <p>La Carta és la traducció del teu Escandall en alguna cosa que el client pot demanar: una col·lecció de plats organitzats per seccions, amb el seu preu de venda, agrupats en una o diverses "cartes" que s'activen segons el dia i l'hora. És el pont entre la teva feina de cuina (receptes amb cost calculat) i l'operativa de sala (TPV i comandes en línia).</p>
    <h4>Per què tenir diverses cartes</h4>
    <p>Molts negocis no ofereixen sempre el mateix: el menú del migdia no és la carta de la nit, el cap de setmana hi ha plats especials, o hi ha una carta de begudes diferent de la de menjar. GastroGoan permet crear <strong>tantes cartes com necessitis</strong> (Carta de Migdia, Carta de Nit, Carta de Begudes, Carta de Cap de Setmana...) i programar-les perquè s'activin soles segons l'horari.</p>
    <h4>Cartes de menjar (Cuina) i cartes de begudes (Sala)</h4>
    <p>El mòdul Carta és tant a <strong>Cuina</strong> com a <strong>Sala</strong>. Qualsevol carta o menú que creïs entrant des de <strong>Sala es considera carta de begudes</strong>; les que crees des de <strong>Cuina són de menjar</strong>. Això és important perquè les <strong>begudes no apareixen a la pantalla de Cuina</strong> (allà només surt el menjar a elaborar), i al TPV les pestanyes de carta surten sempre amb les begudes primer. No cal que marquis res: se sap per l'àrea des de la qual crees la carta.</p>
    <h4>Traducció automàtica de la carta</h4>
    <p>Els noms de seccions i plats es <strong>tradueixen sols</strong> (castellà, català i anglès) en segon pla en desar la carta, fent servir un traductor automàtic. Quan canviïs l'idioma de l'app (selector de dalt), la carta es mostrarà en aquell idioma tant a l'equip com, a la web pública, als teus clients.</p>
    <h4>Com crear una carta pas a pas</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"Nova Carta"</strong> i posa-li un nom descriptiu (ex. "Carta Migdia", "Carta Begudes").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Configura l'<strong>horari d'activació</strong>: tria el <strong>Torn</strong> (Torn 1, Torn 2, o "tot l'horari d'obertura") i marca els <strong>dies de la setmana</strong> en què aquesta carta ha d'estar activa. Les hores concretes de cada torn es prenen de l'<strong>Horari d'obertura</strong> que hagis configurat a El Meu Negoci — així no cal repetir horaris a cada carta.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Crea <strong>seccions</strong> per organitzar la carta (ex. Entrants, Arrossos, Carns, Peixos, Postres, Còctels, Refrescos...). Prem <strong>"Nova Secció"</strong> i posa-li nom.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Dins de cada secció, prem <strong>"Importar de l'Escandall"</strong> per afegir plats que ja tens definits amb la seva recepta i cost. S'importen amb el nom i pots ajustar el preu de venda si encara no l'havies fixat a l'Escandall.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Si necessites un plat que no té recepta a l'Escandall (per exemple, un producte envasat que revens tal qual, com una llauna de refresc o una postres comprada), afegeix-lo com a <strong>plat manual</strong> directament des de la Carta, indicant nom i preu.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Repeteix per a totes les seccions fins a tenir la carta completa.</div></div>
    <h4>Disponibilitat de plats: l'interruptor més usat del dia a dia</h4>
    <p>Cada plat de la carta té un interruptor <strong>Disponible / No disponible</strong>. Quan se t'acabi un producte durant el servei (per exemple, "s'ha acabat el rap"), simplement desactiva aquell plat:</p>
    <ul>
      <li>Deixa d'aparèixer immediatament al <strong>TPV</strong>, així l'equip de sala no el pot comandar per error.</li>
      <li>Deixa d'aparèixer a la <strong>web de comandes en línia</strong> (Take Away/Delivery), evitant que un client demani alguna cosa que no pots servir.</li>
    </ul>
    <p>L'endemà, quan tornis a tenir el producte, simplement reactiva l'interruptor — no cal tornar a crear el plat.</p>
    <h4>Com es decideix quina carta està activa al TPV</h4>
    <p>Amb l'opció <strong>"Canvi automàtic segons horari"</strong> activada (que és el comportament per defecte), GastroGoan revisa contínuament el dia i l'hora actuals i activa automàticament la carta (i la carta de begudes, si la tens separada) que hagis programat per a aquell moment segons el pas 2. L'equip de sala no ha de fer res: en entrar al TPV, la carta correcta ja està activa.</p>
    <p>Si per algun motiu necessites forçar manualment una altra carta (per exemple, un esdeveniment especial), pots <strong>desactivar el canvi automàtic</strong> des de la configuració i triar tu mateix la carta activa des del desplegable corresponent al TPV. Recorda tornar-lo a activar després si vols que el sistema recuperi el control automàtic.</p>
    <h4>La carta i les comandes en línia</h4>
    <p>La carta activa al TPV és exactament la mateixa que es mostra a la pàgina pública de comandes en línia (Take Away/Delivery) i al QR de les taules. Això significa que qualsevol canvi que facis aquí (disponibilitat, preus, seccions) es reflecteix també de cara al client, normalment en pocs segons.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si els teus clients veuen el missatge "La carta no està disponible" a la web de comandes en línia, comprova: (1) que hi hagi una carta programada per al dia i l'hora actuals en el seu horari d'activació, i (2) que aquesta carta tingui almenys un plat marcat com a Disponible. Si totes dues coses estan en ordre, l'avís desapareixerà tan bon punt entreu en aquell tram horari.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Organitza les seccions en el mateix ordre en què apareixen físicament a la teva carta de paper o pissarra — facilita que l'equip trobi ràpid els plats durant el servei, sobretot en hores de molt ritme.</div>`,
    en:`<h3>From recipes to what the customer sees</h3>
    <p>The Menu translates your Costing into something the customer can order: a collection of dishes organised into sections, with their selling price, grouped into one or more "menus" that activate depending on the day and time. It's the bridge between your kitchen work (recipes with a calculated cost) and floor operations (POS and online ordering).</p>
    <h4>Why have several menus</h4>
    <p>Many businesses don't always offer the same thing: the lunch menu isn't the dinner menu, there are weekend specials, or there's a separate drinks menu from the food one. GastroGoan lets you create <strong>as many menus as you need</strong> (Lunch Menu, Dinner Menu, Drinks Menu, Weekend Menu...) and schedule them to activate on their own by time slot.</p>
    <h4>Food menus (Kitchen) and drinks menus (Floor)</h4>
    <p>The Menu module exists in both <strong>Kitchen</strong> and <strong>Floor</strong>. Any menu you create while in <strong>Floor is treated as a drinks menu</strong>; the ones you create from <strong>Kitchen are food menus</strong>. This matters because <strong>drinks don't show up on the Kitchen screen</strong> (only food to prepare appears there), and in the POS, menu tabs always show drinks first. You don't need to flag anything: it's inferred from the area you create the menu from.</p>
    <h4>Automatic menu translation</h4>
    <p>Section and dish names are <strong>translated automatically</strong> (Spanish, Catalan and English) in the background when you save the menu, using an automatic translator. When you change the app's language (selector at the top), the menu will be shown in that language both to the team and, on the public website, to your customers.</p>
    <h4>How to create a menu step by step</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"New Menu"</strong> and give it a descriptive name (e.g. "Lunch Menu", "Drinks Menu").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Set the <strong>activation schedule</strong>: choose the <strong>Time slot</strong> (Slot 1, Slot 2, or "the whole opening schedule") and tick the <strong>days of the week</strong> this menu should be active on. The exact hours for each slot are taken from the <strong>Opening hours</strong> you set up in My Business — so you don't have to repeat times in every menu.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Create <strong>sections</strong> to organise the menu (e.g. Starters, Rice Dishes, Meat, Fish, Desserts, Cocktails, Soft Drinks...). Press <strong>"New Section"</strong> and name it.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Inside each section, press <strong>"Import from Costing"</strong> to add dishes you've already defined with their recipe and cost. They're imported with their name, and you can adjust the selling price if you hadn't set it in Costing yet.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">If you need a dish that has no recipe in Costing (for example, a packaged product you resell as-is, like a canned drink or a bought-in dessert), add it as a <strong>manual dish</strong> directly from the Menu, entering a name and price.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">Repeat for every section until the menu is complete.</div></div>
    <h4>Dish availability: the most-used switch day to day</h4>
    <p>Every dish on the menu has an <strong>Available / Unavailable</strong> toggle. When you run out of a product mid-service (for example, "we're out of monkfish"), simply switch that dish off:</p>
    <ul>
      <li>It stops appearing immediately in the <strong>POS</strong>, so the floor team can't order it by mistake.</li>
      <li>It stops appearing on the <strong>online ordering website</strong> (Take Away/Delivery), preventing a customer from ordering something you can't serve.</li>
    </ul>
    <p>The next day, once you have the product again, simply switch it back on — no need to recreate the dish.</p>
    <h4>How the app decides which menu is active in the POS</h4>
    <p>With the <strong>"Automatic schedule switching"</strong> option enabled (the default behaviour), GastroGoan continuously checks the current day and time and automatically activates the menu (and the drinks menu, if you keep it separate) you scheduled for that moment in step 2. The floor team doesn't have to do anything: when they open the POS, the right menu is already active.</p>
    <p>If for some reason you need to manually force a different menu (for example, for a special event), you can <strong>turn off automatic switching</strong> in the settings and choose the active menu yourself from the corresponding dropdown in the POS. Remember to turn it back on afterwards if you want the system to resume automatic control.</p>
    <h4>The menu and online ordering</h4>
    <p>The menu active in the POS is exactly the same one shown on the public online ordering page (Take Away/Delivery) and on the table QR codes. This means any change you make here (availability, prices, sections) is also reflected to the customer, usually within seconds.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If your customers see the message "The menu isn't available" on the online ordering website, check: (1) that a menu is scheduled for the current day and time within its activation hours, and (2) that menu has at least one dish marked as Available. If both are in order, the message will disappear as soon as you enter that time slot.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Organise sections in the same order they physically appear on your paper menu or blackboard — it helps the team find dishes quickly during service, especially at busy times.</div>`},
  },
  {
    title:{es:'<i class="ti ti-box"></i> Stock', ca:'<i class="ti ti-box"></i> Estoc', en:'<i class="ti ti-box"></i> Stock'},
    content:{es:`<h3>Saber qué tienes y cuándo se te va a acabar</h3>
    <p>El módulo de Stock mantiene el inventario de cantidades disponibles de cada ingrediente de tu Mega Lista, y te avisa cuando algo está a punto de agotarse. Su gran ventaja es que <strong>no tienes que actualizarlo manualmente cada vez que vendes o recibes algo</strong>: se mueve solo en función de lo que pasa en el TPV y en Pedidos.</p>
    <h4>Configurar el stock mínimo</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Para cada ingrediente, indica la <strong>cantidad actual</strong> que tienes (puedes hacer un inventario inicial contando lo que hay físicamente en cocina, almacén o barra).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Indica el <strong>stock mínimo</strong>: la cantidad por debajo de la cual quieres recibir un aviso porque hay riesgo de quedarte sin ese producto antes del próximo pedido. Piensa en tu ritmo de consumo y en cuántos días tardas en recibir un pedido nuevo de ese proveedor.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Activa el filtro <strong>"Solo alertas"</strong> para ver de un vistazo únicamente los ingredientes que están en (o por debajo de) su mínimo — es la lista que debes repasar antes de hacer un pedido.</div></div>
    <h4>Cómo se mueve el stock automáticamente</h4>
    <ul>
      <li><strong>Bajan las existencias</strong> cuando se cierra una comanda en el TPV: la app descuenta de cada ingrediente la cantidad bruta que indica el Escandallo del plato vendido, multiplicada por las unidades vendidas.</li>
      <li><strong>Suben las existencias</strong> cuando marcas un pedido a proveedor como <strong>"Recibido"</strong> en el módulo Pedidos: se añaden al stock las cantidades de ese pedido.</li>
    </ul>
    <p>Esto significa que el stock que ves aquí es una <strong>estimación calculada</strong>, no necesariamente el conteo físico exacto en cada momento (las mermas reales, roturas, autoconsumo del personal, etc. no se descuentan automáticamente). Por eso es recomendable hacer recuentos físicos periódicos — puedes imprimir una <strong>hoja de recuento</strong> con el botón correspondiente en la parte superior de Stock — y ajustar el stock manualmente cuando detectes diferencias importantes. Cada ajuste manual queda guardado en el <strong>Historial</strong>, con fecha y cantidad antes/después, para poder investigar mermas o descuadres.</p>
    <h4>Elaboraciones propias en el stock</h4>
    <p>Las elaboraciones propias (caldos, salsas, almíbares, infusiones...) creadas en el Escandallo también pueden tener su propio stock y mínimo, igual que los ingredientes comprados — útil para controlar, por ejemplo, cuánto caldo casero o almíbar preparado te queda para el servicio. Si un plato o bebida usa una elaboración como ingrediente, vender ese plato descuenta automáticamente el stock de la elaboración, no el de sus ingredientes por separado.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa la pestaña de alertas de stock bajo justo antes de planificar el pedido de la semana — así generas pedidos completos y evitas rotos de producto durante el servicio.</div>`,
    ca:`<h3>Saber què tens i quan se t'acabarà</h3>
    <p>El mòdul d'Estoc manté l'inventari de quantitats disponibles de cada ingredient de la teva Mega Llista, i t'avisa quan alguna cosa està a punt d'esgotar-se. El seu gran avantatge és que <strong>no has d'actualitzar-lo manualment cada vegada que vens o reps alguna cosa</strong>: es mou sol en funció del que passa al TPV i a Comandes.</p>
    <h4>Configurar l'estoc mínim</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Per a cada ingredient, indica la <strong>quantitat actual</strong> que tens (pots fer un inventari inicial comptant el que hi ha físicament a cuina, magatzem o barra).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Indica l'<strong>estoc mínim</strong>: la quantitat per sota de la qual vols rebre un avís perquè hi ha risc de quedar-te sense aquest producte abans de la propera comanda. Pensa en el teu ritme de consum i en quants dies trigues a rebre una comanda nova d'aquest proveïdor.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Activa el filtre <strong>"Només alertes"</strong> per veure d'un cop d'ull només els ingredients que estan en (o per sota de) el seu mínim — és la llista que has de repassar abans de fer una comanda.</div></div>
    <h4>Com es mou l'estoc automàticament</h4>
    <ul>
      <li><strong>Baixen les existències</strong> quan es tanca una comanda al TPV: l'app descompta de cada ingredient la quantitat bruta que indica l'Escandall del plat venut, multiplicada per les unitats venudes.</li>
      <li><strong>Pugen les existències</strong> quan marques una comanda a proveïdor com <strong>"Rebuda"</strong> al mòdul Comandes: s'afegeixen a l'estoc les quantitats d'aquella comanda.</li>
    </ul>
    <p>Això significa que l'estoc que veus aquí és una <strong>estimació calculada</strong>, no necessàriament el recompte físic exacte en cada moment (les mermes reals, trencaments, autoconsum del personal, etc. no es descompten automàticament). Per això és recomanable fer recomptes físics periòdics — pots imprimir un <strong>full de recompte</strong> amb el botó corresponent a la part superior d'Estoc — i ajustar l'estoc manualment quan detectis diferències importants. Cada ajust manual queda desat a l'<strong>Historial</strong>, amb data i quantitat abans/després, per poder investigar mermes o descaptaments.</p>
    <h4>Elaboracions pròpies a l'estoc</h4>
    <p>Les elaboracions pròpies (brous, salses, xarops, infusions...) creades a l'Escandall també poden tenir el seu propi estoc i mínim, igual que els ingredients comprats — útil per controlar, per exemple, quant brou casolà o xarop preparat et queda per al servei. Si un plat o beguda fa servir una elaboració com a ingredient, vendre aquell plat descompta automàticament l'estoc de l'elaboració, no el dels seus ingredients per separat.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa la pestanya d'alertes d'estoc baix just abans de planificar la comanda de la setmana — així generes comandes completes i evites trencaments de producte durant el servei.</div>`,
    en:`<h3>Knowing what you have and when it'll run out</h3>
    <p>The Stock module keeps track of the quantities available for each ingredient in your Master List, and warns you when something is about to run out. Its big advantage is that <strong>you don't have to update it manually every time you sell or receive something</strong>: it moves on its own based on what happens in the POS and in Orders.</p>
    <h4>Setting the minimum stock</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">For each ingredient, enter the <strong>current quantity</strong> you have (you can do an initial count by physically checking what's in the kitchen, storeroom or bar).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Enter the <strong>minimum stock</strong>: the quantity below which you want to get a warning because there's a risk of running out before the next order. Think about your consumption rate and how many days it takes to get a new order from that supplier.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Turn on the <strong>"Alerts only"</strong> filter to see at a glance just the ingredients that are at (or below) their minimum — this is the list you should review before placing an order.</div></div>
    <h4>How stock moves automatically</h4>
    <ul>
      <li><strong>Stock goes down</strong> when an order is closed in the POS: the app deducts from each ingredient the gross quantity Costing states for the dish sold, multiplied by the units sold.</li>
      <li><strong>Stock goes up</strong> when you mark a supplier order as <strong>"Received"</strong> in the Orders module: that order's quantities are added to stock.</li>
    </ul>
    <p>This means the stock you see here is a <strong>calculated estimate</strong>, not necessarily the exact physical count at every moment (real waste, breakages, staff self-consumption, etc. aren't deducted automatically). That's why it's a good idea to do periodic physical counts — you can print a <strong>count sheet</strong> using the button at the top of Stock — and adjust stock manually when you spot significant differences. Every manual adjustment is saved in the <strong>History</strong>, with the date and the quantity before/after, so you can investigate waste or mismatches.</p>
    <h4>In-house preparations in stock</h4>
    <p>In-house preparations (stocks, sauces, syrups, infusions...) created in Costing can also have their own stock and minimum, just like purchased ingredients — useful for tracking, for example, how much homemade stock or prepared syrup you have left for service. If a dish or drink uses a preparation as an ingredient, selling that dish automatically deducts the preparation's stock, not its individual ingredients.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Check the low-stock alerts tab right before planning the week's order — that way you generate complete orders and avoid running out of product during service.</div>`},
  },
  {
    title:{es:'<i class="ti ti-shopping-cart"></i> Pedidos', ca:'<i class="ti ti-shopping-cart"></i> Comandes', en:'<i class="ti ti-shopping-cart"></i> Orders'},
    content:{es:`<h3>El ciclo completo de una compra a proveedor</h3>
    <p>El módulo de Pedidos te permite preparar, enviar y recibir pedidos a tus proveedores, y es el paso que conecta el aviso de "stock bajo" con la reposición real de producto — y de ahí, automáticamente, con el Stock y con la Gestión Económica (gastos variables).</p>
    <h4>Los tres estados de un pedido</h4>
    <table>
      <tr><th>Estado</th><th>Qué significa</th><th>Qué puedes hacer</th></tr>
      <tr><td><strong>Borrador</strong></td><td>Estás preparando el pedido, todavía no se ha comunicado a nadie</td><td>Añadir, quitar o modificar líneas y cantidades libremente</td></tr>
      <tr><td><strong>Enviado</strong></td><td>El pedido ya se ha comunicado al proveedor (por teléfono, email, etc.)</td><td>Sirve como registro de "lo pedido", a la espera de recepción</td></tr>
      <tr><td><strong>Recibido</strong></td><td>La mercancía ha llegado físicamente</td><td>Al marcarlo, el Stock se actualiza automáticamente sumando las cantidades del pedido</td></tr>
    </table>
    <h4>Dos pestañas: Realizar Pedido e Historial</h4>
    <p>El módulo Pedidos tiene dos pestañas: en <strong>"Realizar Pedido"</strong> compones el pedido (eliges proveedor, fecha y cantidades, con sugerencia por déficit de stock) y lo envías por <strong>WhatsApp o Email</strong> o lo imprimes. En <strong>"Historial de Pedidos"</strong> tienes todos los pedidos hechos con su estado. Al enviar un pedido, pasa automáticamente al historial.</p>
    <h4>Cómo crear y gestionar un pedido</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">En la pestaña <strong>"Realizar Pedido"</strong>, elige el <strong>proveedor</strong> al que va dirigido.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Añade líneas con los <strong>ingredientes</strong> que necesitas reponer (la pantalla de Stock con el filtro de alertas activado te ayuda a saber qué incluir) y la <strong>cantidad</strong> que vas a pedir de cada uno.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Revisa el pedido completo — en estado <strong>Borrador</strong> puedes seguir ajustando cantidades o quitar líneas hasta que esté tal y como vas a comunicarlo.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Cuando hayas hablado con el proveedor (llamada, email, app del proveedor...) y el pedido esté confirmado, cambia el estado a <strong>Enviado</strong>. Esto te sirve de recordatorio de "pedido pendiente de llegar".</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Cuando la mercancía llegue físicamente a tu cocina, marca el pedido como <strong>Recibido</strong>. En ese momento, y solo en ese momento, el Stock de cada ingrediente del pedido aumenta con las cantidades indicadas.</div></div>
    <h4>Conexión con Stock y Gestión Económica</h4>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Solo los pedidos marcados como <strong>Recibido</strong> afectan al Stock y se contabilizan como gasto en la Gestión Económica (Gastos Variables). Un pedido en Borrador o Enviado no mueve ningún número económico — es importante recordar pasar el pedido a Recibido cuando la mercancía llegue, o tus informes de stock y de gastos no reflejarán la realidad.</div>
    <h4>Buenas prácticas</h4>
    <ul>
      <li>Genera un pedido por proveedor para mantener cada pedido claro y fácil de comunicar.</li>
      <li>Si el proveedor entrega menos cantidad de la pedida (rotura de stock en su almacén, por ejemplo), ajusta las cantidades del pedido antes de marcarlo como Recibido, para que el Stock refleje lo que realmente ha entrado.</li>
      <li>Revisa periódicamente los pedidos "Enviados" que lleven mucho tiempo sin marcarse como Recibidos — puede ser una señal de que se olvidó actualizar el estado tras la entrega.</li>
    </ul>`,
    ca:`<h3>El cicle complet d'una compra a proveïdor</h3>
    <p>El mòdul de Comandes et permet preparar, enviar i rebre comandes als teus proveïdors, i és el pas que connecta l'avís d'"estoc baix" amb la reposició real de producte — i d'aquí, automàticament, amb l'Estoc i amb la Gestió Econòmica (despeses variables).</p>
    <h4>Els tres estats d'una comanda</h4>
    <table>
      <tr><th>Estat</th><th>Què significa</th><th>Què pots fer</th></tr>
      <tr><td><strong>Esborrany</strong></td><td>Estàs preparant la comanda, encara no s'ha comunicat a ningú</td><td>Afegir, treure o modificar línies i quantitats lliurement</td></tr>
      <tr><td><strong>Enviada</strong></td><td>La comanda ja s'ha comunicat al proveïdor (per telèfon, email, etc.)</td><td>Serveix com a registre del "demanat", a l'espera de recepció</td></tr>
      <tr><td><strong>Rebuda</strong></td><td>La mercaderia ha arribat físicament</td><td>En marcar-la, l'Estoc s'actualitza automàticament sumant les quantitats de la comanda</td></tr>
    </table>
    <h4>Dues pestanyes: Fer Comanda i Historial</h4>
    <p>El mòdul Comandes té dues pestanyes: a <strong>"Fer Comanda"</strong> compons la comanda (tries proveïdor, data i quantitats, amb suggeriment per dèficit d'estoc) i l'envies per <strong>WhatsApp o Email</strong> o la imprimeixes. A <strong>"Historial de Comandes"</strong> tens totes les comandes fetes amb el seu estat. En enviar una comanda, passa automàticament a l'historial.</p>
    <h4>Com crear i gestionar una comanda</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A la pestanya <strong>"Fer Comanda"</strong>, tria el <strong>proveïdor</strong> al qual va dirigida.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Afegeix línies amb els <strong>ingredients</strong> que necessites reposar (la pantalla d'Estoc amb el filtre d'alertes activat t'ajuda a saber què incloure) i la <strong>quantitat</strong> que demanaràs de cadascun.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Revisa la comanda completa — en estat <strong>Esborrany</strong> pots continuar ajustant quantitats o treure línies fins que estigui tal com la comunicaràs.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Quan hagis parlat amb el proveïdor (trucada, email, app del proveïdor...) i la comanda estigui confirmada, canvia l'estat a <strong>Enviada</strong>. Això et serveix de recordatori de "comanda pendent d'arribar".</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Quan la mercaderia arribi físicament a la teva cuina, marca la comanda com a <strong>Rebuda</strong>. En aquell moment, i només en aquell moment, l'Estoc de cada ingredient de la comanda augmenta amb les quantitats indicades.</div></div>
    <h4>Connexió amb Estoc i Gestió Econòmica</h4>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Només les comandes marcades com a <strong>Rebuda</strong> afecten l'Estoc i es comptabilitzen com a despesa a la Gestió Econòmica (Despeses Variables). Una comanda en Esborrany o Enviada no mou cap número econòmic — és important recordar passar la comanda a Rebuda quan arribi la mercaderia, o els teus informes d'estoc i de despeses no reflectiran la realitat.</div>
    <h4>Bones pràctiques</h4>
    <ul>
      <li>Genera una comanda per proveïdor per mantenir cada comanda clara i fàcil de comunicar.</li>
      <li>Si el proveïdor lliura menys quantitat de la demanada (trencament d'estoc al seu magatzem, per exemple), ajusta les quantitats de la comanda abans de marcar-la com a Rebuda, perquè l'Estoc reflecteixi el que realment ha entrat.</li>
      <li>Revisa periòdicament les comandes "Enviades" que portin molt de temps sense marcar-se com a Rebudes — pot ser un senyal que es va oblidar actualitzar l'estat després del lliurament.</li>
    </ul>`,
    en:`<h3>The full cycle of a supplier purchase</h3>
    <p>The Orders module lets you prepare, send and receive orders to your suppliers, and it's the step that connects the "low stock" warning with actually restocking product — and from there, automatically, with Stock and with Financial Management (variable costs).</p>
    <h4>An order's three statuses</h4>
    <table>
      <tr><th>Status</th><th>What it means</th><th>What you can do</th></tr>
      <tr><td><strong>Draft</strong></td><td>You're preparing the order, it hasn't been sent to anyone yet</td><td>Freely add, remove or change lines and quantities</td></tr>
      <tr><td><strong>Sent</strong></td><td>The order has already been communicated to the supplier (by phone, email, etc.)</td><td>Acts as a record of "what was ordered", awaiting receipt</td></tr>
      <tr><td><strong>Received</strong></td><td>The goods have physically arrived</td><td>Marking it automatically updates Stock, adding the order's quantities</td></tr>
    </table>
    <h4>Two tabs: Place Order and History</h4>
    <p>The Orders module has two tabs: in <strong>"Place Order"</strong> you build the order (choose supplier, date and quantities, with a suggestion based on stock shortfall) and send it by <strong>WhatsApp or Email</strong> or print it. In <strong>"Order History"</strong> you have every order placed with its status. Sending an order automatically moves it to history.</p>
    <h4>How to create and manage an order</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">In the <strong>"Place Order"</strong> tab, choose the <strong>supplier</strong> it's addressed to.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Add lines with the <strong>ingredients</strong> you need to restock (the Stock screen with the alerts filter turned on helps you know what to include) and the <strong>quantity</strong> you'll order of each.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Review the full order — while in <strong>Draft</strong> status you can keep adjusting quantities or removing lines until it's exactly as you'll communicate it.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Once you've spoken with the supplier (call, email, supplier app...) and the order is confirmed, change the status to <strong>Sent</strong>. This acts as a reminder of "order pending arrival".</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">When the goods physically arrive at your kitchen, mark the order as <strong>Received</strong>. At that point, and only then, the Stock of every ingredient in the order increases by the stated quantities.</div></div>
    <h4>Connection with Stock and Financial Management</h4>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Only orders marked as <strong>Received</strong> affect Stock and are counted as an expense in Financial Management (Variable Costs). A Draft or Sent order doesn't move any financial figure — it's important to remember to switch the order to Received once the goods arrive, or your stock and expense reports won't reflect reality.</div>
    <h4>Best practices</h4>
    <ul>
      <li>Generate one order per supplier to keep each order clear and easy to communicate.</li>
      <li>If the supplier delivers less than what was ordered (out of stock at their warehouse, for example), adjust the order's quantities before marking it as Received, so Stock reflects what actually came in.</li>
      <li>Periodically review "Sent" orders that have gone a long time without being marked as Received — it may be a sign the status update after delivery was forgotten.</li>
    </ul>`},
  },
  {
    title:{es:'<i class="ti ti-calendar"></i> Horario del Personal', ca:'<i class="ti ti-calendar"></i> Horari del Personal', en:'<i class="ti ti-calendar"></i> Staff Schedule'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Este módulo es el corazón de la gestión de tu equipo: aquí das de alta a cada trabajador, organizas sus turnos semana a semana en formato calendario, controlas las horas que ficha cada persona y mantienes sus datos de contacto a mano. Tener el horario bien planificado evita los dos problemas más típicos de un restaurante: quedarte corto de personal en una hora punta, o pagar horas de más porque "nadie sabía quién tenía que venir".</p>

    <h4>Pestaña Personal: dar de alta a un empleado</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nuevo empleado"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escribe su <strong>nombre</strong> y elige un <strong>rol</strong> (Camarero/a, Cocinero/a, Ayudante, Encargado/a...). El rol es solo descriptivo, te ayuda a identificar quién hace qué.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Elige un <strong>color identificativo</strong>. Ese color se usará en todo el calendario de turnos para reconocer a esa persona de un vistazo, sin tener que leer el nombre cada vez.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Rellena <strong>teléfono</strong> y <strong>email</strong> si los tienes. Aparecerán como enlaces directos para llamar/escribir por WhatsApp o enviar un correo sin tener que copiar el número.</div></div>
    <p><strong>El área (Cocina o Sala) ya no se pregunta:</strong> el empleado se asigna automáticamente al área desde la que lo creas. Si entras a Personal desde <strong>Cocina</strong>, ves y das de alta personal de cocina; desde <strong>Sala</strong>, personal de sala. Lo mismo aplica en Distribución del trabajo, Fichar y los turnos.</p>
    <p>Si el empleado es de <strong>Sala</strong>, puedes marcar la casilla <strong>"Es repartidor"</strong>: así entra en el reparto automático de pedidos a domicilio (reparto propio) cuando esté de turno — la app le asigna solo los pedidos según su horario y su carga actual, sin que nadie tenga que elegirlo a mano cada vez.</p>
    <div class="manual-step"><div class="sn">6</div><div class="st">Define un <strong>PIN de 4 dígitos</strong> para que el empleado pueda fichar y, si tu plan lo permite, acceder a su propia vista de la app. El PIN por defecto es "1234"; pídele que lo cambie la primera vez que lo use.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>No repitas el mismo PIN para dos empleados distintos: el PIN identifica a la persona en Fichar, en el Chat interno y en cualquier acción que quede registrada a su nombre.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Ese mismo PIN (junto con su nombre y el código de negocio) es lo que el empleado usa para entrar en la app desde "Acceso Empleados" en la pantalla inicial — no hace falta que nadie lo "dé de alta" antes en ese dispositivo en concreto. Si el empleado deja el negocio temporalmente, desmarca su casilla <strong>Activo</strong> (pierde el acceso sin borrar su ficha ni su histórico de horas); si se va definitivamente, elimina su ficha directamente.</div>

    <h4>Asignar turnos: desde Día, Semana o Mes</h4>
    <p>Los turnos se asignan desde las vistas <strong>Día, Semana o Mes</strong>: pulsa sobre el empleado/día y elige el turno. (La asignación masiva por periodo se ha retirado de la pestaña Personal para que todo el reparto de turnos esté en un solo sitio, el calendario.)</p>
    <h4>Pestaña Horario: el calendario semanal</h4>
    <p>Aquí ves la semana en columnas (Lunes a Domingo) y una fila por cada empleado.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Haz clic en la celda del día y empleado que quieras editar.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Elige el tipo de turno: <strong>Mañana</strong>, <strong>Tarde</strong>, <strong>Partido</strong> (mañana y tarde con descanso entre medio), <strong>Libre</strong>, <strong>Vacaciones</strong> o <strong>Baja</strong>. Indica también la hora de inicio y fin si quieres que conste en el horario.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">El calendario pinta cada turno con el color del empleado, así puedes ver de un vistazo si un día está bien cubierto o si te falta alguien en sala o en cocina.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Usa las flechas de navegación para moverte a la semana anterior o siguiente y planificar con antelación.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Planifica el horario con al menos una semana de antelación y avisa al equipo. Así evitas cambios de última hora y reclamaciones por turnos no comunicados.</div>

    <h4>Control de horas: Fichar</h4>
    <p>En la pestaña <strong>Fichar</strong>, cada empleado puede registrar su entrada y salida con su PIN. La app suma automáticamente las horas trabajadas y muestra el total de <strong>"Horas este mes"</strong> por empleado, para que puedas comparar las horas planificadas con las horas reales fichadas.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Si ves que un empleado acumula muchas más horas de las que tenía asignadas en el calendario, revisa si hubo turnos extra, sustituciones o si simplemente se olvidó de fichar la salida.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Aquest mòdul és el cor de la gestió del teu equip: aquí dones d'alta cada treballador, organitzes els seus torns setmana a setmana en format calendari, controles les hores que fitxa cada persona i mantens les seves dades de contacte a mà. Tenir l'horari ben planificat evita els dos problemes més típics d'un restaurant: quedar-te curt de personal en una hora punta, o pagar hores de més perquè "ningú sabia qui havia de venir".</p>

    <h4>Pestanya Personal: donar d'alta un empleat</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"+ Nou empleat"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escriu el seu <strong>nom</strong> i tria un <strong>rol</strong> (Cambrer/a, Cuiner/a, Ajudant, Encarregat/da...). El rol és només descriptiu, t'ajuda a identificar qui fa què.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Tria un <strong>color identificatiu</strong>. Aquest color es farà servir a tot el calendari de torns per reconèixer aquesta persona d'un cop d'ull, sense haver de llegir el nom cada vegada.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Emplena <strong>telèfon</strong> i <strong>email</strong> si els tens. Apareixeran com a enllaços directes per trucar/escriure per WhatsApp o enviar un correu sense haver de copiar el número.</div></div>
    <p><strong>L'àrea (Cuina o Sala) ja no es pregunta:</strong> l'empleat s'assigna automàticament a l'àrea des de la qual el crees. Si entres a Personal des de <strong>Cuina</strong>, veus i dones d'alta personal de cuina; des de <strong>Sala</strong>, personal de sala. El mateix aplica a Distribució del treball, Fitxar i els torns.</p>
    <p>Si l'empleat és de <strong>Sala</strong>, pots marcar la casella <strong>"És repartidor"</strong>: així entra en el repartiment automàtic de comandes a domicili (repartiment propi) quan estigui de torn — l'app li assigna soles les comandes segons el seu horari i la seva càrrega actual, sense que ningú l'hagi de triar a mà cada vegada.</p>
    <div class="manual-step"><div class="sn">6</div><div class="st">Defineix un <strong>PIN de 4 dígits</strong> perquè l'empleat pugui fitxar i, si el teu pla ho permet, accedir a la seva pròpia vista de l'app. El PIN per defecte és "1234"; demana-li que el canviï la primera vegada que el faci servir.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>No repeteixis el mateix PIN per a dos empleats diferents: el PIN identifica la persona a Fitxar, al Xat intern i en qualsevol acció que quedi registrada al seu nom.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Aquest mateix PIN (junt amb el seu nom i el codi de negoci) és el que l'empleat fa servir per entrar a l'app des d'"Accés Empleats" a la pantalla inicial — no cal que ningú el "doni d'alta" abans en aquest dispositiu en concret. Si l'empleat deixa el negoci temporalment, desmarca la seva casella <strong>Actiu</strong> (perd l'accés sense esborrar la fitxa ni l'historial d'hores); si marxa definitivament, elimina la fitxa directament.</div>

    <h4>Assignar torns: des de Dia, Setmana o Mes</h4>
    <p>Els torns s'assignen des de les vistes <strong>Dia, Setmana o Mes</strong>: prem sobre l'empleat/dia i tria el torn. (L'assignació massiva per període s'ha retirat de la pestanya Personal perquè tot el repartiment de torns estigui en un sol lloc, el calendari.)</p>
    <h4>Pestanya Horari: el calendari setmanal</h4>
    <p>Aquí veus la setmana en columnes (Dilluns a Diumenge) i una fila per cada empleat.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Fes clic a la cel·la del dia i empleat que vulguis editar.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Tria el tipus de torn: <strong>Matí</strong>, <strong>Tarda</strong>, <strong>Partit</strong> (matí i tarda amb descans entre mig), <strong>Lliure</strong>, <strong>Vacances</strong> o <strong>Baixa</strong>. Indica també l'hora d'inici i fi si vols que consti a l'horari.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">El calendari pinta cada torn amb el color de l'empleat, així pots veure d'un cop d'ull si un dia està ben cobert o si et falta algú a sala o a cuina.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Fes servir les fletxes de navegació per moure't a la setmana anterior o següent i planificar amb antelació.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Planifica l'horari amb almenys una setmana d'antelació i avisa l'equip. Així evites canvis d'última hora i reclamacions per torns no comunicats.</div>

    <h4>Control d'hores: Fitxar</h4>
    <p>A la pestanya <strong>Fitxar</strong>, cada empleat pot registrar la seva entrada i sortida amb el seu PIN. L'app suma automàticament les hores treballades i mostra el total d'<strong>"Hores aquest mes"</strong> per empleat, perquè puguis comparar les hores planificades amb les hores reals fitxades.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Si veus que un empleat acumula moltes més hores de les que tenia assignades al calendari, revisa si hi va haver torns extra, substitucions o si simplement es va oblidar de fitxar la sortida.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>This module is the heart of managing your team: here you register each worker, organise their shifts week by week in a calendar format, track the hours each person clocks in, and keep their contact details at hand. A well-planned schedule avoids the two most typical restaurant problems: being short-staffed at a busy time, or paying extra hours because "nobody knew who was supposed to come in".</p>

    <h4>Staff tab: registering an employee</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"+ New employee"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Enter their <strong>name</strong> and choose a <strong>role</strong> (Waiter/Waitress, Cook, Assistant, Manager...). The role is just descriptive, it helps you identify who does what.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Choose an <strong>identifying colour</strong>. This colour is used throughout the shift calendar to recognise that person at a glance, without reading the name every time.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Fill in <strong>phone</strong> and <strong>email</strong> if you have them. They'll appear as direct links to call/message on WhatsApp or send an email without copying the number.</div></div>
    <p><strong>The area (Kitchen or Floor) is no longer asked:</strong> the employee is automatically assigned to the area you create them from. If you open Staff from <strong>Kitchen</strong>, you see and register kitchen staff; from <strong>Floor</strong>, floor staff. The same applies to Work Distribution, Clock-in and shifts.</p>
    <p>If the employee is <strong>Floor</strong> staff, you can check <strong>"Is a delivery rider"</strong>: this makes them eligible for automatic assignment of delivery orders (own delivery) while on shift — the app assigns them orders on its own based on their schedule and current workload, with nobody needing to pick a name each time.</p>
    <div class="manual-step"><div class="sn">6</div><div class="st">Set a <strong>4-digit PIN</strong> so the employee can clock in and, if your plan allows it, access their own view of the app. The default PIN is "1234"; ask them to change it the first time they use it.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Don't reuse the same PIN for two different employees: the PIN identifies the person in Clock-in, in the internal Chat and in any action logged under their name.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>That same PIN (together with their name and the business code) is what the employee uses to sign into the app from "Staff Access" on the landing screen — no one needs to "register" it on that specific device beforehand. If the employee leaves temporarily, uncheck their <strong>Active</strong> checkbox (they lose access without deleting their record or hours history); if they leave for good, delete their record directly.</div>

    <h4>Assigning shifts: from Day, Week or Month</h4>
    <p>Shifts are assigned from the <strong>Day, Week or Month</strong> views: tap the employee/day and pick the shift. (Bulk assignment by period has been removed from the Staff tab so all shift assignment lives in one place, the calendar.)</p>
    <h4>Schedule tab: the weekly calendar</h4>
    <p>Here you see the week in columns (Monday to Sunday) and one row per employee.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Click the cell for the day and employee you want to edit.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Choose the shift type: <strong>Morning</strong>, <strong>Afternoon</strong>, <strong>Split</strong> (morning and afternoon with a break in between), <strong>Off</strong>, <strong>Holiday</strong> or <strong>Sick leave</strong>. Also enter the start and end time if you want it to appear on the schedule.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">The calendar colours each shift with the employee's colour, so you can see at a glance whether a day is well covered or you're short-staffed on the floor or in the kitchen.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Use the navigation arrows to move to the previous or next week and plan ahead.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Plan the schedule at least a week ahead and let the team know. This avoids last-minute changes and complaints about uncommunicated shifts.</div>

    <h4>Hours tracking: Clock-in</h4>
    <p>In the <strong>Clock-in</strong> tab, each employee can log their entry and exit time with their PIN. The app automatically adds up worked hours and shows the total <strong>"Hours this month"</strong> per employee, so you can compare planned hours with actual clocked hours.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>If you see an employee racking up far more hours than they were assigned on the calendar, check whether there were extra shifts, cover shifts, or whether they simply forgot to clock out.</div>`},
  },
  {
    title:{es:'<i class="ti ti-clipboard-list"></i> Distribución del Trabajo', ca:'<i class="ti ti-clipboard-list"></i> Distribució del Treball', en:'<i class="ti ti-clipboard-list"></i> Work Distribution'},
    // El Manual se abre desde Gestión, que no es ni Cocina ni Sala, así que
    // currentArea() aquí siempre daría 'cocina' por defecto; se usa la
    // última área en la que el usuario trabajó de verdad (lastArea).
    content: {
    es: () => lastArea==='sala' ? `<h3>Qué es y para qué sirve</h3>
    <p>Una cosa es saber <strong>cuándo</strong> trabaja cada empleado (eso lo controla Horario del Personal) y otra muy distinta es saber <strong>qué tiene que hacer exactamente</strong> durante ese turno. En Sala este módulo es el <strong>calendario de tareas</strong> de cada persona: no habla de "platos a su cargo" (eso es cosa de Cocina), sino de todo lo que tiene que hacer día a día en barra/sala.</p>

    <h4>Vista maestro-detalle</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A la izquierda verás la lista de tu equipo de Sala (los empleados que diste de alta en Horario del Personal). Haz clic en uno para abrir su calendario de tareas a la derecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Todo lo que edites se guarda asociado a ese empleado, así que puedes ir pasando de uno a otro para repartir el trabajo de todo el equipo.</div></div>

    <h4>Tareas de la semana</h4>
    <p>Aquí ves, día por día, todo lo que tiene asignado esa persona — y viene de tres sitios distintos, unificado en un solo calendario:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Tareas propias</strong> que añadas a mano: "Reponer barra", "Revisar carta de bebidas", "Preparar hielo y guarniciones"... Escribe la tarea en el día que corresponda y pulsa "+".</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Tareas de Plan de Limpieza</strong> que tengan a esa persona como responsable ese día del mes (barra, grifos de cerveza, cafetera...) aparecen aquí solas, con la etiqueta "Limpieza" — no hace falta duplicarlas a mano.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Acciones de Promoción</strong> asignadas a esa persona para esa fecha exacta también aparecen aquí, con la etiqueta "Promo".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Marca cada tarea como hecha con su casilla — el contador de "Tareas de esta semana" te dice de un vistazo cuánto lleva completado cada persona.</div>

    <h4>Imprimir y repartir</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Con la ficha de un empleado abierta, pulsa <strong>Imprimir</strong> para generar una hoja solo con sus tareas de la semana.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si quieres la hoja de todo el equipo de golpe, usa la opción de imprimir todo: genera una hoja por empleado, lista para repartir o pegar en barra.</div></div>` : `<h3>Qué es y para qué sirve</h3>
    <p>Una cosa es saber <strong>cuándo</strong> trabaja cada empleado (eso lo controla Horario del Personal) y otra muy distinta es saber <strong>qué tiene que hacer exactamente</strong> durante ese turno. Este módulo resuelve el segundo problema: te permite repartir responsabilidades concretas — qué platos prepara cada cocinero, qué tareas de limpieza o mise en place le tocan cada día — y dejarlo todo por escrito para que no haya confusiones ni "yo pensaba que eso lo hacías tú".</p>

    <h4>Vista maestro-detalle</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A la izquierda verás la lista de tu equipo (los empleados que diste de alta en Horario del Personal). Haz clic en uno para abrir su ficha de trabajo a la derecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Todo lo que edites se guarda asociado a ese empleado, así que puedes ir pasando de uno a otro para repartir el trabajo de todo el equipo.</div></div>

    <h4>Platos a su cargo</h4>
    <p>Aquí defines qué platos prepara habitualmente ese empleado.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Añadir plato"</strong> y elige uno de tu Escandallo o Carta (así queda enlazado a la ficha técnica real), o escribe el nombre a mano si es algo puntual.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repite para todos los platos de los que sea responsable. Por ejemplo, a tu pastelero le asignas todos los postres; a tu cocinero de partida fría, las ensaladas y entrantes fríos.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Esta lista es muy útil para formar a un empleado nuevo: en cuanto entra, ya sabe qué platos tiene que dominar.</div>

    <h4>Plan de producción semanal</h4>
    <p>Aquí añades tareas concretas, día por día, además de la elaboración de platos.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Elige el día de la semana (Lunes a Domingo).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escribe la tarea: por ejemplo "Mise en place de salsas", "Limpiar cámara fría", "Hacer pedido a proveedor de pescado", "Revisar caducidades de la nevera de postres".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Añade tantas tareas como necesites por día. Quedan listadas bajo cada jornada, así el empleado ve de un vistazo su plan completo de la semana.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Reparte también las tareas "menos agradecidas" (limpieza profunda, control de caducidades) de forma rotativa entre el equipo usando este plan, así queda constancia de quién la tiene asignada cada semana.</div>

    <h4>Imprimir y repartir</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Con la ficha de un empleado abierta, pulsa <strong>Imprimir</strong> para generar una hoja solo con su asignación (platos a su cargo + plan de producción).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si quieres la hoja de todo el equipo de golpe, usa la opción de imprimir todo: genera una hoja por empleado, lista para repartir o pegar en el tablón de cocina.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si cambias la carta o el escandallo (por ejemplo, eliminas un plato), revisa este módulo: los platos "a cargo" de cada empleado no se actualizan solos si el plato ya no existe.</div>`,
    ca: () => lastArea==='sala' ? `<h3>Què és i per a què serveix</h3>
    <p>Una cosa és saber <strong>quan</strong> treballa cada empleat (això ho controla Horari del Personal) i una altra molt diferent és saber <strong>què ha de fer exactament</strong> durant aquell torn. A Sala aquest mòdul és el <strong>calendari de tasques</strong> de cada persona: no parla de "plats a càrrec seu" (això és cosa de Cuina), sinó de tot el que ha de fer dia a dia a la barra/sala.</p>

    <h4>Vista mestre-detall</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A l'esquerra veuràs la llista del teu equip de Sala (els empleats que vas donar d'alta a Horari del Personal). Fes clic en un per obrir el seu calendari de tasques a la dreta.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Tot el que editis es desa associat a aquell empleat, així que pots anar passant d'un a l'altre per repartir la feina de tot l'equip.</div></div>

    <h4>Tasques de la setmana</h4>
    <p>Aquí veus, dia per dia, tot el que té assignat aquella persona — i ve de tres llocs diferents, unificat en un sol calendari:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Tasques pròpies</strong> que afegeixis a mà: "Reposar barra", "Revisar carta de begudes", "Preparar gel i guarnicions"... Escriu la tasca al dia corresponent i prem "+".</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Tasques de Pla de Neteja</strong> que tinguin aquella persona com a responsable aquell dia del mes (barra, aixetes de cervesa, cafetera...) apareixen aquí soles, amb l'etiqueta "Neteja" — no cal duplicar-les a mà.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Accions de Promoció</strong> assignades a aquella persona per a aquella data exacta també apareixen aquí, amb l'etiqueta "Promo".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Marca cada tasca com a feta amb la seva casella — el comptador de "Tasques d'aquesta setmana" et diu d'un cop d'ull quant porta completat cada persona.</div>

    <h4>Imprimir i repartir</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Amb la fitxa d'un empleat oberta, prem <strong>Imprimir</strong> per generar un full només amb les seves tasques de la setmana.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si vols el full de tot l'equip de cop, fes servir l'opció d'imprimir-ho tot: genera un full per empleat, a punt per repartir o enganxar a la barra.</div></div>` : `<h3>Què és i per a què serveix</h3>
    <p>Una cosa és saber <strong>quan</strong> treballa cada empleat (això ho controla Horari del Personal) i una altra molt diferent és saber <strong>què ha de fer exactament</strong> durant aquell torn. Aquest mòdul resol el segon problema: et permet repartir responsabilitats concretes — quins plats prepara cada cuiner, quines tasques de neteja o mise en place li toquen cada dia — i deixar-ho tot per escrit perquè no hi hagi confusions ni "jo pensava que allò ho feies tu".</p>

    <h4>Vista mestre-detall</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A l'esquerra veuràs la llista del teu equip (els empleats que vas donar d'alta a Horari del Personal). Fes clic en un per obrir la seva fitxa de treball a la dreta.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Tot el que editis es desa associat a aquell empleat, així que pots anar passant d'un a l'altre per repartir la feina de tot l'equip.</div></div>

    <h4>Plats a càrrec seu</h4>
    <p>Aquí defineixes quins plats prepara habitualment aquell empleat.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"+ Afegir plat"</strong> i tria'n un del teu Escandall o Carta (així queda enllaçat a la fitxa tècnica real), o escriu el nom a mà si és una cosa puntual.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repeteix per a tots els plats dels quals sigui responsable. Per exemple, al teu pastisser li assignes totes les postres; al teu cuiner de partida freda, les amanides i entrants freds.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Aquesta llista és molt útil per formar un empleat nou: així que entra, ja sap quins plats ha de dominar.</div>

    <h4>Pla de producció setmanal</h4>
    <p>Aquí afegeixes tasques concretes, dia per dia, a més de l'elaboració de plats.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Tria el dia de la setmana (Dilluns a Diumenge).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escriu la tasca: per exemple "Mise en place de salses", "Netejar cambra freda", "Fer comanda a proveïdor de peix", "Revisar caducitats de la nevera de postres".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Afegeix tantes tasques com necessitis per dia. Queden llistades sota cada jornada, així l'empleat veu d'un cop d'ull el seu pla complet de la setmana.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Reparteix també les tasques "menys agraïdes" (neteja profunda, control de caducitats) de forma rotativa entre l'equip fent servir aquest pla, així queda constància de qui la té assignada cada setmana.</div>

    <h4>Imprimir i repartir</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Amb la fitxa d'un empleat oberta, prem <strong>Imprimir</strong> per generar un full només amb la seva assignació (plats a càrrec seu + pla de producció).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si vols el full de tot l'equip de cop, fes servir l'opció d'imprimir-ho tot: genera un full per empleat, a punt per repartir o enganxar al tauler de cuina.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si canvies la carta o l'escandall (per exemple, elimines un plat), revisa aquest mòdul: els plats "a càrrec" de cada empleat no s'actualitzen sols si el plat ja no existeix.</div>`,
    en: () => lastArea==='sala' ? `<h3>What it is and what it's for</h3>
    <p>Knowing <strong>when</strong> each employee works is one thing (that's handled by Staff Schedule) and knowing <strong>exactly what they need to do</strong> during that shift is quite another. On the Floor side, this module is each person's <strong>task calendar</strong>: it doesn't talk about "dishes in charge" (that's a Kitchen thing), but about everything they need to do day to day at the bar/floor.</p>

    <h4>Master-detail view</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">On the left you'll see your Floor team list (the employees you registered in Staff Schedule). Click one to open their task calendar on the right.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Everything you edit is saved against that employee, so you can move from one to another to distribute work across the whole team.</div></div>

    <h4>This week's tasks</h4>
    <p>Here you see, day by day, everything assigned to that person — pulled from three different sources, unified into a single calendar:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Own tasks</strong> you add by hand: "Restock the bar", "Check the drinks menu", "Prepare ice and garnishes"... Type the task on the right day and press "+".</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>Cleaning Plan tasks</strong> that have that person as the responsible party for that day of the month (bar, beer taps, coffee machine...) show up here on their own, tagged "Cleaning" — no need to duplicate them by hand.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Promotion actions</strong> assigned to that person for that exact date also appear here, tagged "Promo".</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Tick each task as done with its checkbox — the "This week's tasks" counter tells you at a glance how much each person has completed.</div>

    <h4>Print and hand out</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">With an employee's record open, press <strong>Print</strong> to generate a sheet with just their tasks for the week.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you want the whole team's sheets at once, use the print-all option: it generates one sheet per employee, ready to hand out or stick up at the bar.</div></div>` : `<h3>What it is and what it's for</h3>
    <p>Knowing <strong>when</strong> each employee works is one thing (that's handled by Staff Schedule) and knowing <strong>exactly what they need to do</strong> during that shift is quite another. This module solves the second problem: it lets you assign concrete responsibilities — which dishes each cook prepares, which cleaning or mise en place tasks fall to them each day — and put it all in writing so there's no confusion or "I thought you were doing that".</p>

    <h4>Master-detail view</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">On the left you'll see your team list (the employees you registered in Staff Schedule). Click one to open their work record on the right.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Everything you edit is saved against that employee, so you can move from one to another to distribute work across the whole team.</div></div>

    <h4>Dishes in charge</h4>
    <p>Here you define which dishes that employee usually prepares.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"+ Add dish"</strong> and pick one from your Costing or Menu (so it stays linked to the real technical sheet), or type the name by hand if it's a one-off.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repeat for every dish they're responsible for. For example, assign all desserts to your pastry cook, or cold starters and salads to your cold-station cook.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>This list is very useful for training a new employee: as soon as they start, they already know which dishes they need to master.</div>

    <h4>Weekly production plan</h4>
    <p>Here you add specific tasks, day by day, on top of preparing dishes.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Choose the day of the week (Monday to Sunday).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Type the task: for example "Prep sauces", "Clean the walk-in fridge", "Order fish from the supplier", "Check expiry dates in the dessert fridge".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Add as many tasks per day as you need. They're listed under each day, so the employee sees their whole week's plan at a glance.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Also distribute the "less pleasant" tasks (deep cleaning, checking expiry dates) on a rotating basis among the team using this plan, so there's a record of who has it assigned each week.</div>

    <h4>Print and hand out</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">With an employee's record open, press <strong>Print</strong> to generate a sheet with just their assignment (dishes in charge + production plan).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you want the whole team's sheets at once, use the print-all option: it generates one sheet per employee, ready to hand out or pin on the kitchen board.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If you change the menu or Costing (for example, you remove a dish), check this module: each employee's "in charge" dishes don't update automatically if the dish no longer exists.</div>`,
    },
  },
  {
    title:{es:'<i class="ti ti-spray"></i> Plan de Limpieza', ca:'<i class="ti ti-spray"></i> Pla de Neteja', en:'<i class="ti ti-spray"></i> Cleaning Plan'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Todo restaurante está obligado por ley a tener un sistema de <strong>APPCC</strong> (Análisis de Peligros y Puntos de Control Crítico) y a poder demostrar, con registros fechados, que se cumple. Este módulo te da las 6 hojas de registro más habituales que pide Sanidad, ya organizadas y listas para rellenar desde el móvil o la tablet de cocina, sin papeles que se manchan o se pierden. Si te visita un inspector, aquí tienes el historial completo.</p>

    <h4>1. Manos — registro de lavado de manos</h4>
    <p>Cada vez que un empleado se lava las manos en momentos críticos (al empezar turno, tras tocar alimentos crudos, tras ir al baño, tras tocar dinero o basura), registra la hora y la persona.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa "+ Registrar" en la pestaña Manos.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Selecciona el empleado y, si quieres, el motivo (cambio de tarea, después del baño...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Queda guardado con fecha y hora automáticas.</div></div>

    <h4>2. Limpieza — calendario por zona y frecuencia</h4>
    <p>Define las zonas de tu local (cocina, cámaras, baños, sala, almacén...) y la frecuencia de limpieza de cada una (diaria, semanal, mensual).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Crea cada zona/tarea con su frecuencia.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Cuando se realiza la limpieza, márcala como hecha: queda registrada la fecha y quién la hizo.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Si una tarea lleva varios días sin marcarse y ya toca, destaca visualmente para que no se te olvide.</div></div>

    <h4>3. Temperaturas — control de cámaras y equipos de frío</h4>
    <p>Registra periódicamente la temperatura de cada cámara, congelador o vitrina.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Da de alta cada equipo de frío con un nombre (ej. "Cámara pescado", "Congelador 1").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Cada día (o varias veces al día), anota la temperatura leída en el termómetro del equipo.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si una temperatura sale fuera de rango (cámaras normalmente entre 0-4ºC, congeladores a -18ºC o menos), anótalo igualmente y registra la acción correctiva (se avisó al técnico, se trasladó el género...). Esa traza es justo lo que pide una inspección.</div>

    <h4>4. Alérgenos — control de alérgenos</h4>
    <p>Registra qué alérgenos contiene cada plato o materia prima y mantén actualizada esa información, especialmente si cambias proveedores o recetas.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Revisa periódicamente que la lista de alérgenos de tus platos sigue siendo correcta (sobre todo tras cambios de receta o de marca de un ingrediente).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si trabajas con Fichas Técnicas, puedes apoyarte en los ingredientes ahí indicados para no olvidar ninguno.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>La información de alérgenos debe estar disponible para el cliente que la pida (en carta, cartel o verbalmente). Tenla siempre actualizada, no solo registrada.</div>

    <h4>5. Plagas — control de plagas</h4>
    <p>Registra las visitas de tu empresa de control de plagas, los tratamientos realizados y cualquier incidencia detectada (presencia de insectos, roedores...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Cada vez que venga el técnico de plagas, registra la fecha, lo que se hizo y, si te entrega un certificado, guárdalo como referencia.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si detectas tú mismo algún indicio entre visitas, regístralo también: ayuda a justificar visitas extra si fuera necesario.</div></div>

    <h4>6. Mantenimiento — incidencias y revisiones de equipos</h4>
    <p>Registra averías, reparaciones y revisiones periódicas de tus equipos (hornos, cámaras, lavavajillas, extractores...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Cuando detectes una avería, regístrala aquí: equipo afectado, descripción del problema y fecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Cuando se repare o revise, marca la incidencia como resuelta y anota qué se hizo. Así tienes el historial completo de cada equipo, útil para decidir si conviene repararlo otra vez o sustituirlo.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>La rutina ganadora es: dedica 5 minutos al abrir y 5 minutos al cerrar para repasar estas 6 pestañas y registrar lo que toque. En un mes tendrás un historial completo, sin esfuerzo añadido en tu día a día.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Mantener estos registros al día no es opcional: es un requisito legal y lo primero que se revisa en una inspección sanitaria. Un registro vacío o desactualizado puede acarrear sanciones aunque tu cocina esté impecable.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Tot restaurant està obligat per llei a tenir un sistema d'<strong>APPCC</strong> (Anàlisi de Perills i Punts de Control Crític) i a poder demostrar, amb registres datats, que es compleix. Aquest mòdul et dona els 6 fulls de registre més habituals que demana Sanitat, ja organitzats i a punt per emplenar des del mòbil o la tauleta de cuina, sense papers que es taquen o es perden. Si et visita un inspector, aquí tens l'historial complet.</p>

    <h4>1. Mans — registre de rentat de mans</h4>
    <p>Cada vegada que un empleat es renta les mans en moments crítics (en començar el torn, després de tocar aliments crus, després d'anar al lavabo, després de tocar diners o escombraries), registra l'hora i la persona.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem "+ Registrar" a la pestanya Mans.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Selecciona l'empleat i, si vols, el motiu (canvi de tasca, després del lavabo...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Queda desat amb data i hora automàtiques.</div></div>

    <h4>2. Neteja — calendari per zona i freqüència</h4>
    <p>Defineix les zones del teu local (cuina, cambres, lavabos, sala, magatzem...) i la freqüència de neteja de cadascuna (diària, setmanal, mensual).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Crea cada zona/tasca amb la seva freqüència.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Quan es fa la neteja, marca-la com a feta: queda registrada la data i qui la va fer.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Si una tasca porta diversos dies sense marcar-se i ja toca, es destaca visualment perquè no se t'oblidi.</div></div>

    <h4>3. Temperatures — control de cambres i equips de fred</h4>
    <p>Registra periòdicament la temperatura de cada cambra, congelador o vitrina.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Dona d'alta cada equip de fred amb un nom (ex. "Cambra peix", "Congelador 1").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Cada dia (o diverses vegades al dia), anota la temperatura llegida al termòmetre de l'equip.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si una temperatura surt fora de rang (cambres normalment entre 0-4ºC, congeladors a -18ºC o menys), anota-ho igualment i registra l'acció correctiva (es va avisar el tècnic, es va traslladar el gènere...). Aquesta traça és justament el que demana una inspecció.</div>

    <h4>4. Al·lergens — control d'al·lergens</h4>
    <p>Registra quins al·lergens conté cada plat o matèria primera i mantén actualitzada aquesta informació, especialment si canvies proveïdors o receptes.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Revisa periòdicament que la llista d'al·lergens dels teus plats continua sent correcta (sobretot després de canvis de recepta o de marca d'un ingredient).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si treballes amb Fitxes Tècniques, pots recolzar-te en els ingredients allà indicats per no oblidar-ne cap.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>La informació d'al·lergens ha d'estar disponible per al client que la demani (a la carta, en un cartell o verbalment). Tingues-la sempre actualitzada, no només registrada.</div>

    <h4>5. Plagues — control de plagues</h4>
    <p>Registra les visites de la teva empresa de control de plagues, els tractaments fets i qualsevol incidència detectada (presència d'insectes, rosegadors...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Cada vegada que vingui el tècnic de plagues, registra la data, el que es va fer i, si et lliura un certificat, guarda'l com a referència.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si tu mateix detectes algun indici entre visites, registra-ho també: ajuda a justificar visites extra si calgués.</div></div>

    <h4>6. Manteniment — incidències i revisions d'equips</h4>
    <p>Registra avaries, reparacions i revisions periòdiques dels teus equips (forns, cambres, rentavaixelles, extractors...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Quan detectis una avaria, registra-la aquí: equip afectat, descripció del problema i data.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Quan es repari o revisi, marca la incidència com a resolta i anota què es va fer. Així tens l'historial complet de cada equip, útil per decidir si convé reparar-lo una altra vegada o substituir-lo.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>La rutina guanyadora és: dedica 5 minuts en obrir i 5 minuts en tancar per repassar aquestes 6 pestanyes i registrar el que toqui. En un mes tindràs un historial complet, sense esforç afegit en el teu dia a dia.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Mantenir aquests registres al dia no és opcional: és un requisit legal i el primer que es revisa en una inspecció sanitària. Un registre buit o desactualitzat pot comportar sancions encara que la teva cuina estigui impecable.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>Every restaurant is legally required to have a <strong>HACCP</strong> system (Hazard Analysis and Critical Control Points) and to be able to prove, with dated records, that it's being followed. This module gives you the 6 record sheets Health Authorities most commonly ask for, already organised and ready to fill in from the kitchen phone or tablet, with no paper that gets dirty or lost. If an inspector visits, you have the full history right here.</p>

    <h4>1. Hands — hand-washing log</h4>
    <p>Every time an employee washes their hands at critical moments (starting a shift, after handling raw food, after using the toilet, after handling money or rubbish), log the time and the person.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press "+ Log" in the Hands tab.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Select the employee and, if you like, the reason (task change, after the toilet...).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">It's saved with an automatic date and time.</div></div>

    <h4>2. Cleaning — schedule by zone and frequency</h4>
    <p>Define your premises' zones (kitchen, walk-ins, toilets, dining room, storeroom...) and how often each one needs cleaning (daily, weekly, monthly).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Create each zone/task with its frequency.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">When cleaning is carried out, mark it as done: the date and who did it are logged.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">If a task has gone several days unmarked and it's due, it's visually highlighted so you don't forget.</div></div>

    <h4>3. Temperatures — cold-storage equipment control</h4>
    <p>Periodically log the temperature of each fridge, freezer or display cabinet.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Register each cold-storage unit with a name (e.g. "Fish fridge", "Freezer 1").</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Every day (or several times a day), note the temperature read off the unit's thermometer.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If a temperature is out of range (fridges are usually 0-4ºC, freezers -18ºC or below), log it anyway and record the corrective action (technician called, stock moved...). That trace is exactly what an inspection asks for.</div>

    <h4>4. Allergens — allergen control</h4>
    <p>Log which allergens each dish or raw ingredient contains and keep that information up to date, especially if you change suppliers or recipes.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Periodically check that your dishes' allergen list is still correct (especially after recipe changes or a change of ingredient brand).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you work with Technical Sheets, you can rely on the ingredients listed there so you don't miss any.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Allergen information must be available to any customer who asks for it (on the menu, on a sign, or verbally). Keep it up to date, not just logged.</div>

    <h4>5. Pests — pest control</h4>
    <p>Log your pest-control company's visits, the treatments carried out and any incident detected (presence of insects, rodents...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Every time the pest technician comes, log the date, what was done and, if they give you a certificate, keep it as a reference.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you notice any sign yourself between visits, log it too: it helps justify extra visits if needed.</div></div>

    <h4>6. Maintenance — equipment incidents and check-ups</h4>
    <p>Log breakdowns, repairs and periodic check-ups of your equipment (ovens, walk-ins, dishwashers, extractor hoods...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">When you spot a breakdown, log it here: affected equipment, description of the problem and date.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Once it's repaired or checked, mark the incident as resolved and note what was done. That way you have the full history for each piece of equipment, useful for deciding whether it's worth repairing again or replacing.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>The winning routine is: spend 5 minutes on opening and 5 minutes on closing to go through these 6 tabs and log whatever's due. In a month you'll have a full history, with no extra effort added to your day.</div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Keeping these records up to date isn't optional: it's a legal requirement and the first thing checked during a health inspection. An empty or outdated record can lead to penalties even if your kitchen is spotless.</div>`},
  },
  {
    title:{es:'<i class="ti ti-user"></i> Clientes', ca:'<i class="ti ti-user"></i> Clients', en:'<i class="ti ti-user"></i> Customers'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Conocer a tus clientes habituales es una de las formas más baratas de aumentar tus ventas: cuesta mucho menos conseguir que un cliente que ya te conoce vuelva, que atraer a uno nuevo. Este módulo es tu base de datos de clientes: guarda sus datos de contacto y calcula automáticamente, a partir de las ventas registradas en el TPV, cómo se está comportando cada uno (cuánto gasta, con qué frecuencia viene y cuándo fue la última vez).</p>

    <h4>Dar de alta a un cliente</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nuevo cliente"</strong> y rellena el <strong>nombre y apellidos</strong> (obligatorio, para poder distinguir a clientes con el mismo nombre de pila) y el <strong>teléfono</strong> (obligatorio); el email es opcional. Si el nombre coincide exactamente con el de un cliente ya existente, la app no te deja guardar, para evitar fichas duplicadas de la misma persona.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si quieres, añade notas: alergias, preferencias ("siempre pide mesa en terraza"), fecha de cumpleaños, etc. Esa información te permite dar un trato más personal.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Cuando un cliente reserva o pide desde la web pública con un teléfono que ya está en tu base de datos, la reserva o el pedido quedan vinculados a su ficha automáticamente, sin que nadie tenga que hacer nada a mano.</div></div>

    <h4>Métricas automáticas</h4>
    <p>Cada vez que se registra una venta en el TPV asociada a un cliente, la app actualiza por sí sola:</p>
    <ul>
      <li><strong>Nº de visitas</strong> — cuántas veces ha venido en total</li>
      <li><strong>Ticket medio</strong> — cuánto gasta de media cada vez</li>
      <li><strong>Última visita</strong> — la fecha de su última compra/reserva</li>
    </ul>
    <p>No tienes que calcular ni actualizar nada a mano: simplemente usa el TPV con normalidad y este módulo se mantiene al día solo.</p>

    <h4>Semáforo de actividad</h4>
    <p>Cada cliente lleva un indicador de color según su frecuencia de visita reciente:</p>
    <table>
      <tr><th>Color</th><th>Significado</th><th>Qué hacer</th></tr>
      <tr><td>🟢 Verde</td><td>Cliente activo, viene con normalidad</td><td>Nada especial, mantén el buen servicio</td></tr>
      <tr><td>🟡 Ámbar</td><td>Cliente en riesgo, tarda más de lo habitual en volver</td><td>Una llamada, un mensaje o una oferta personalizada puede recuperarlo</td></tr>
      <tr><td>🔴 Rojo</td><td>Cliente inactivo, hace mucho que no viene</td><td>Campaña de reactivación: descuento de bienvenida, novedades de carta...</td></tr>
    </table>

    <h4>Contactar directamente</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa el icono de <strong>WhatsApp</strong> junto al teléfono de un cliente para abrir directamente una conversación con él, sin copiar números.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Pulsa el icono de <strong>email</strong> para abrir tu gestor de correo con la dirección del cliente ya puesta en el destinatario.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>Filtra por clientes en ámbar o rojo una vez al mes y dedica 15 minutos a escribirles. Es la lista de clientes con más probabilidad de responder a una promoción, porque ya te conocen.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Combina este módulo con la pestaña "Clientes" de Promoción: desde ahí puedes lanzar campañas dirigidas a estos grupos.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Conèixer els teus clients habituals és una de les maneres més barates d'augmentar les teves vendes: costa molt menys aconseguir que un client que ja et coneix torni, que atraure'n un de nou. Aquest mòdul és la teva base de dades de clients: desa les seves dades de contacte i calcula automàticament, a partir de les vendes registrades al TPV, com es comporta cadascun (quant gasta, amb quina freqüència ve i quan va ser l'última vegada).</p>

    <h4>Donar d'alta un client</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"+ Nou client"</strong> i emplena el <strong>nom i cognoms</strong> (obligatori, per poder distingir clients amb el mateix nom de pila) i el <strong>telèfon</strong> (obligatori); l'email és opcional. Si el nom coincideix exactament amb el d'un client ja existent, l'app no et deixa desar, per evitar fitxes duplicades de la mateixa persona.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si vols, afegeix notes: al·lèrgies, preferències ("sempre demana taula a la terrassa"), data d'aniversari, etc. Aquesta informació et permet donar un tracte més personal.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Quan un client reserva o demana des de la web pública amb un telèfon que ja és a la teva base de dades, la reserva o la comanda queden vinculades a la seva fitxa automàticament, sense que ningú hagi de fer res a mà.</div></div>

    <h4>Mètriques automàtiques</h4>
    <p>Cada vegada que es registra una venda al TPV associada a un client, l'app actualitza per si sola:</p>
    <ul>
      <li><strong>Nombre de visites</strong> — quantes vegades ha vingut en total</li>
      <li><strong>Tiquet mitjà</strong> — quant gasta de mitjana cada vegada</li>
      <li><strong>Última visita</strong> — la data de la seva última compra/reserva</li>
    </ul>
    <p>No has de calcular ni actualitzar res a mà: simplement fes servir el TPV amb normalitat i aquest mòdul es manté al dia sol.</p>

    <h4>Semàfor d'activitat</h4>
    <p>Cada client porta un indicador de color segons la seva freqüència de visita recent:</p>
    <table>
      <tr><th>Color</th><th>Significat</th><th>Què fer</th></tr>
      <tr><td>🟢 Verd</td><td>Client actiu, ve amb normalitat</td><td>Res d'especial, mantén el bon servei</td></tr>
      <tr><td>🟡 Ambre</td><td>Client en risc, triga més del que és habitual a tornar</td><td>Una trucada, un missatge o una oferta personalitzada el pot recuperar</td></tr>
      <tr><td>🔴 Vermell</td><td>Client inactiu, fa temps que no ve</td><td>Campanya de reactivació: descompte de benvinguda, novetats de carta...</td></tr>
    </table>

    <h4>Contactar directament</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem la icona de <strong>WhatsApp</strong> al costat del telèfon d'un client per obrir directament una conversa amb ell, sense copiar números.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Prem la icona d'<strong>email</strong> per obrir el teu gestor de correu amb l'adreça del client ja posada al destinatari.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>Filtra per clients en ambre o vermell un cop al mes i dedica 15 minuts a escriure'ls. És la llista de clients amb més probabilitat de respondre a una promoció, perquè ja et coneixen.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Combina aquest mòdul amb la pestanya "Clients" de Promoció: des d'allà pots llançar campanyes dirigides a aquests grups.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>Knowing your regular customers is one of the cheapest ways to boost sales: it costs far less to get a customer who already knows you to come back than to attract a new one. This module is your customer database: it stores their contact details and automatically calculates, from sales logged in the POS, how each one is behaving (how much they spend, how often they visit and when they last came).</p>

    <h4>Registering a customer</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"+ New customer"</strong> and fill in their <strong>full name</strong> (required, so you can tell apart customers with the same first name) and <strong>phone number</strong> (required); email is optional. If the name exactly matches an existing customer, the app won't let you save, to avoid duplicate records for the same person.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you like, add notes: allergies, preferences ("always asks for a terrace table"), birthday, etc. That information lets you give more personal service.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">When a customer books or orders from the public website with a phone number that's already in your database, the reservation or order gets linked to their record automatically, with nothing to do by hand.</div></div>

    <h4>Automatic metrics</h4>
    <p>Every time a POS sale linked to a customer is logged, the app updates on its own:</p>
    <ul>
      <li><strong>Number of visits</strong> — how many times they've come in total</li>
      <li><strong>Average ticket</strong> — how much they spend on average each time</li>
      <li><strong>Last visit</strong> — the date of their last purchase/reservation</li>
    </ul>
    <p>You don't need to calculate or update anything by hand: just use the POS as normal and this module stays up to date on its own.</p>

    <h4>Activity traffic light</h4>
    <p>Each customer carries a colour indicator based on how recently they've been visiting:</p>
    <table>
      <tr><th>Colour</th><th>Meaning</th><th>What to do</th></tr>
      <tr><td>🟢 Green</td><td>Active customer, visiting as usual</td><td>Nothing special, keep up the good service</td></tr>
      <tr><td>🟡 Amber</td><td>At-risk customer, taking longer than usual to come back</td><td>A call, a message or a personalised offer might win them back</td></tr>
      <tr><td>🔴 Red</td><td>Inactive customer, hasn't visited in a long time</td><td>Reactivation campaign: welcome-back discount, menu news...</td></tr>
    </table>

    <h4>Contacting directly</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press the <strong>WhatsApp</strong> icon next to a customer's phone number to open a chat with them directly, without copying numbers.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Press the <strong>email</strong> icon to open your mail client with the customer's address already in the recipient field.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>Filter for amber or red customers once a month and spend 15 minutes writing to them. They're the customers most likely to respond to a promotion, since they already know you.</div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Combine this module with Promotion's "Customers" tab: from there you can launch campaigns targeted at these groups.</div>`},
  },
  {
    title:{es:'<i class="ti ti-calendar-event"></i> Reservas', ca:'<i class="ti ti-calendar-event"></i> Reserves', en:'<i class="ti ti-calendar-event"></i> Reservations'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Este módulo es tu libro de reservas digital. Te permite ver y gestionar todas las reservas de tu negocio en tres vistas (Día, Semana, Mes), controlar el aforo de cada turno y atender automáticamente las reservas que tus clientes hagan desde tu web pública (módulo Reservas y Pedidos Online).</p>

    <h4>Vistas disponibles</h4>
    <ul>
      <li><strong>Día</strong> — la más usada en el servicio: lista de reservas de hoy, hora a hora, con el aforo de cada turno.</li>
      <li><strong>Semana</strong> — visión general de los próximos 7 días, útil para planificar personal y compras.</li>
      <li><strong>Mes</strong> — calendario completo, ideal para ver de un vistazo días flojos o fechas con muchas reservas (festivos, eventos...).</li>
    </ul>

    <h4>Crear una reserva manualmente</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nueva reserva"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Indica fecha, hora, número de comensales y, opcionalmente, la mesa a asignar.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Escribe el nombre y teléfono del cliente. Si ese teléfono no está en tu base de datos de Clientes, la app te preguntará si quieres añadirlo: di que sí para empezar a acumular su historial de visitas.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Añade notas si hace falta (alergias, celebración, silla para bebé, mesa junto a la ventana...).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Guarda. La reserva aparecerá en la vista Día correspondiente.</div></div>
    <p>Las mesas que puedes asignar son las que tengas configuradas en <strong>Mi Negocio → Operativa</strong> (con el nombre/número que les hayas puesto). Una misma mesa <strong>no se puede reservar dos veces con menos de 1 hora y media de diferencia</strong>: por ejemplo, si está reservada a las 13:30, vuelve a aparecer como disponible a partir de las 15:00. El desplegable solo muestra las mesas libres para esa hora.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Cuando un cliente con reserva se sienta y abres su mesa en el TPV, su reserva se marca automáticamente como "llegada" y desaparece de la lista de reservas del día para no estorbar la vista.</div>

    <h4>Aforo por turno</h4>
    <p>Si en Mi Negocio configuraste el <strong>Aforo (plazas por turno)</strong>, la vista del día muestra para cada turno cuántas personas hay reservadas frente al máximo:</p>
    <table>
      <tr><th>Color</th><th>Situación</th></tr>
      <tr><td>🟢 Verde</td><td>Hay sitio de sobra</td></tr>
      <tr><td>🟡 Ámbar</td><td>El turno está cerca de completarse</td></tr>
      <tr><td>🔴 Rojo</td><td>El turno está completo</td></tr>
    </table>
    <p>Si al crear o confirmar una reserva se supera el aforo, la app te avisa con los números exactos (por ejemplo "ya hay 38 de 40 plazas, esta reserva añade 6") y te da a elegir entre <strong>confirmarla igualmente</strong> (si puedes habilitar mesas extra), <strong>ponerla en lista de espera</strong> (no cuenta para el aforo, y tiene su propio botón para confirmarla en cuanto haya sitio) o cancelarla.</p>
    <p>Una reserva confirmada se puede <strong>cancelar</strong> (queda registrada como "cancelada", no desaparece sin más) en vez de solo borrarla, y si un cliente ya ha fallado antes, al elegirlo en el desplegable del formulario verás un aviso con el número de no-shows anteriores. Al marcar la "llegada" de una reserva (tanto desde aquí como desde el TPV) puedes confirmar o corregir en qué mesa se ha sentado el grupo, por si al final se organizó en una distinta a la reservada.</p>

    <h4>Reservas online: confirmación automática</h4>
    <p>Las reservas que un cliente hace desde tu página web pública se confirman <strong>solas</strong>: la app le asigna mesa automáticamente si hay una libre con plazas suficientes para esa hora, sin que tengas que hacer nada. Solo si ningún hueco encaja bien (por ejemplo un grupo grande y solo quedan mesas pequeñas sueltas), la reserva se queda en <strong>"Solicitudes online pendientes"</strong> esperando a que le asignes mesa tú a mano — ahí ya no hace falta revisar nada más, todo lo demás (aforo, horario) ya se comprobó al recibirla.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa "Solicitudes online pendientes" varias veces al día, especialmente antes de cada servicio, por si ha quedado alguna reserva grande esperando mesa.</div>

    <h4>Que el cliente se entere: confirmación por email</h4>
    <p>Para que el cliente sepa con seguridad si su reserva está confirmada (y no se quede con la duda), puedes activar el envío automático de un email en cuanto se confirme —tanto si fue sola como si la confirmaste tú a mano—. Se configura en <strong>Mi Negocio → Confirmación de reservas por email</strong>, con una cuenta gratuita tuya de <strong>EmailJS</strong> (no hace falta programar nada):</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Entra en <strong>emailjs.com</strong> y crea una cuenta gratis.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">En <strong>"Email Services" → "Add New Email Service"</strong>, elige Gmail (o el correo que uses) y conéctalo con <strong>"Connect Account"</strong> — un solo clic, inicias sesión con Google y ya está. Copia el <strong>Service ID</strong> que te da.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">En <strong>"Email Templates"</strong>, coge una plantilla ya hecha de la galería (busca alguna de confirmación/reserva) en vez de crearla desde cero, y solo ajusta el texto a tu gusto. Usa estas variables tal cual: <code>{{to_email}}</code>, <code>{{client_name}}</code>, <code>{{business_name}}</code>, <code>{{date}}</code>, <code>{{time}}</code>, <code>{{people}}</code>, <code>{{table_name}}</code>. Copia el <strong>Template ID</strong>.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">En <strong>"Account" → "General"</strong>, copia tu <strong>Public Key</strong>.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Pega los 3 códigos en <strong>Mi Negocio → Confirmación de reservas por email</strong>, activa el interruptor y pulsa <strong>"Enviar email de prueba"</strong> para comprobar que llega.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Es totalmente gratis hasta 200 emails al mes — de sobra para las reservas de un solo restaurante.</div>

    <h4>En el Panel de Control</h4>
    <p>Las reservas de <strong>hoy y de mañana</strong> aparecen automáticamente en el Panel de Control, para que al abrir la app por la mañana ya sepas cuántos comensales esperas y puedas avisar a cocina y sala con tiempo.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si cancelas o cambias una reserva ya confirmada, recuerda avisar al cliente por teléfono o WhatsApp: cancelar no le envía ningún mensaje automático (el email automático solo se manda al confirmarla).</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Aquest mòdul és el teu llibre de reserves digital. Et permet veure i gestionar totes les reserves del teu negoci en tres vistes (Dia, Setmana, Mes), controlar l'aforament de cada torn i atendre automàticament les reserves que els teus clients facin des de la teva web pública (mòdul Reserves i Comandes en Línia).</p>

    <h4>Vistes disponibles</h4>
    <ul>
      <li><strong>Dia</strong> — la més usada en el servei: llista de reserves d'avui, hora a hora, amb l'aforament de cada torn.</li>
      <li><strong>Setmana</strong> — visió general dels propers 7 dies, útil per planificar personal i compres.</li>
      <li><strong>Mes</strong> — calendari complet, ideal per veure d'un cop d'ull dies fluixos o dates amb moltes reserves (festius, esdeveniments...).</li>
    </ul>

    <h4>Crear una reserva manualment</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"+ Nova reserva"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Indica data, hora, nombre de comensals i, opcionalment, la taula a assignar.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Escriu el nom i telèfon del client. Si aquell telèfon no és a la teva base de dades de Clients, l'app et preguntarà si el vols afegir: digues que sí per començar a acumular el seu historial de visites.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Afegeix notes si cal (al·lèrgies, celebració, cadira per a nadó, taula al costat de la finestra...).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Desa. La reserva apareixerà a la vista Dia corresponent.</div></div>
    <p>Les taules que pots assignar són les que tinguis configurades a <strong>El Meu Negoci → Operativa</strong> (amb el nom/número que els hagis posat). Una mateixa taula <strong>no es pot reservar dues vegades amb menys d'1 hora i mitja de diferència</strong>: per exemple, si està reservada a les 13:30, torna a aparèixer com a disponible a partir de les 15:00. El desplegable només mostra les taules lliures per a aquella hora.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Quan un client amb reserva s'asseu i obres la seva taula al TPV, la seva reserva es marca automàticament com a "arribada" i desapareix de la llista de reserves del dia per no destorbar la vista.</div>

    <h4>Aforament per torn</h4>
    <p>Si a El Meu Negoci vas configurar l'<strong>Aforament (places per torn)</strong>, la vista del dia mostra per a cada torn quantes persones hi ha reservades enfront del màxim:</p>
    <table>
      <tr><th>Color</th><th>Situació</th></tr>
      <tr><td>🟢 Verd</td><td>Hi ha lloc de sobra</td></tr>
      <tr><td>🟡 Ambre</td><td>El torn està a prop de completar-se</td></tr>
      <tr><td>🔴 Vermell</td><td>El torn està complet</td></tr>
    </table>
    <p>Si en crear o confirmar una reserva se supera l'aforament, l'app t'avisa amb els números exactes (per exemple "ja hi ha 38 de 40 places, aquesta reserva n'afegeix 6") i et deixa triar entre <strong>confirmar-la igualment</strong> (si pots habilitar taules extra), <strong>posar-la en llista d'espera</strong> (no compta per a l'aforament, i té el seu propi botó per confirmar-la quan hi hagi lloc) o cancel·lar-la.</p>
    <p>Una reserva confirmada es pot <strong>cancel·lar</strong> (queda registrada com a "cancel·lada", no desapareix sense més) en comptes de només esborrar-la, i si un client ja ha fallat abans, en triar-lo al desplegable del formulari veuràs un avís amb el nombre de no-shows anteriors. En marcar l'"arribada" d'una reserva (tant des d'aquí com des del TPV) pots confirmar o corregir a quina taula s'ha assegut el grup, per si al final es va organitzar en una de diferent a la reservada.</p>

    <h4>Reserves online: confirmació automàtica</h4>
    <p>Les reserves que un client fa des de la teva pàgina web pública es confirmen <strong>soles</strong>: l'app li assigna taula automàticament si n'hi ha una lliure amb places suficients per a aquella hora, sense que hagis de fer res. Només si cap taula encaixa bé (per exemple un grup gran i només queden taules petites soltes), la reserva es queda a <strong>"Sol·licituds en línia pendents"</strong> esperant que li assignis taula tu a mà — aquí ja no cal revisar res més, la resta (aforament, horari) ja s'ha comprovat en rebre-la.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa "Sol·licituds en línia pendents" diverses vegades al dia, especialment abans de cada servei, per si ha quedat alguna reserva gran esperant taula.</div>

    <h4>Que el client s'assabenti: confirmació per email</h4>
    <p>Perquè el client sàpiga amb seguretat si la seva reserva està confirmada (i no es quedi amb el dubte), pots activar l'enviament automàtic d'un email en quant es confirmi —tant si va ser sola com si la vas confirmar tu a mà—. Es configura a <strong>El Meu Negoci → Confirmació de reserves per email</strong>, amb un compte gratuït teu d'<strong>EmailJS</strong> (no cal programar res):</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Entra a <strong>emailjs.com</strong> i crea un compte gratis.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">A <strong>"Email Services" → "Add New Email Service"</strong>, tria Gmail (o el correu que facis servir) i connecta'l amb <strong>"Connect Account"</strong> — un sol clic, inicies sessió amb Google i ja està. Copia el <strong>Service ID</strong> que et dona.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">A <strong>"Email Templates"</strong>, agafa una plantilla ja feta de la galeria (busca'n alguna de confirmació/reserva) en lloc de crear-la des de zero, i només ajusta el text al teu gust. Usa aquestes variables tal qual: <code>{{to_email}}</code>, <code>{{client_name}}</code>, <code>{{business_name}}</code>, <code>{{date}}</code>, <code>{{time}}</code>, <code>{{people}}</code>, <code>{{table_name}}</code>. Copia el <strong>Template ID</strong>.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">A <strong>"Account" → "General"</strong>, copia la teva <strong>Public Key</strong>.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Enganxa els 3 codis a <strong>El Meu Negoci → Confirmació de reserves per email</strong>, activa l'interruptor i prem <strong>"Enviar email de prova"</strong> per comprovar que arriba.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>És totalment gratis fins a 200 emails al mes — de sobres per a les reserves d'un sol restaurant.</div>

    <h4>Al Panell de Control</h4>
    <p>Les reserves d'<strong>avui i de demà</strong> apareixen automàticament al Panell de Control, perquè en obrir l'app al matí ja sàpigues quants comensals esperes i puguis avisar cuina i sala amb temps.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si cancel·les o canvies una reserva ja confirmada, recorda avisar el client per telèfon o WhatsApp: cancel·lar no li envia cap missatge automàtic (l'email automàtic només s'envia en confirmar-la).</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>This module is your digital reservation book. It lets you view and manage every reservation for your business in three views (Day, Week, Month), control each time slot's capacity, and automatically handle reservations your customers make from your public website (Reservations and Online Ordering module).</p>

    <h4>Available views</h4>
    <ul>
      <li><strong>Day</strong> — the most used during service: today's reservations, hour by hour, with each slot's capacity.</li>
      <li><strong>Week</strong> — an overview of the next 7 days, useful for planning staff and purchases.</li>
      <li><strong>Month</strong> — a full calendar, ideal for spotting quiet days or dates with many reservations (holidays, events...) at a glance.</li>
    </ul>

    <h4>Creating a reservation manually</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"+ New reservation"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Enter the date, time, number of guests and, optionally, the table to assign.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Enter the customer's name and phone number. If that phone isn't in your Customers database, the app will ask if you want to add it: say yes to start building their visit history.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Add notes if needed (allergies, celebration, high chair, table by the window...).</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Save. The reservation will appear in the corresponding Day view.</div></div>
    <p>The tables you can assign are the ones set up in <strong>My Business → Operations</strong> (with whatever name/number you gave them). The same table <strong>can't be booked twice less than 1.5 hours apart</strong>: for example, if it's booked at 1:30pm, it becomes available again from 3:00pm. The dropdown only shows tables free at that time.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>When a customer with a reservation sits down and you open their table in the POS, their reservation is automatically marked as "arrived" and disappears from the day's reservation list so it doesn't clutter the view.</div>

    <h4>Capacity per time slot</h4>
    <p>If you set up <strong>Capacity (seats per slot)</strong> in My Business, the day view shows, for each slot, how many people are booked against the maximum:</p>
    <table>
      <tr><th>Colour</th><th>Situation</th></tr>
      <tr><td>🟢 Green</td><td>Plenty of room</td></tr>
      <tr><td>🟡 Amber</td><td>The slot is close to full</td></tr>
      <tr><td>🔴 Red</td><td>The slot is full</td></tr>
    </table>
    <p>If creating or confirming a reservation would exceed capacity, the app warns you with the exact numbers (for example "already 38 of 40 seats, this reservation adds 6") and lets you choose between <strong>confirming it anyway</strong> (if you can open up extra tables), <strong>adding it to the waitlist</strong> (doesn't count towards capacity, with its own button to confirm it once there's room) or cancelling it.</p>
    <p>A confirmed reservation can be <strong>cancelled</strong> (it's kept on record as "cancelled", not just deleted) instead of only being deleted, and if a client has failed to show up before, picking them from the form's dropdown shows a warning with their previous no-show count. Marking a reservation as "arrived" (from here or from the POS) lets you confirm or correct which table the group actually sat at, in case it ended up being a different one than booked.</p>

    <h4>Online reservations: automatic confirmation</h4>
    <p>Reservations a customer makes from your public website confirm <strong>themselves</strong>: the app assigns a table automatically if there's a free one with enough seats for that time, with nothing for you to do. Only if no table fits well (say, a large group when only small separate tables are left) does the reservation stay in <strong>"Pending online requests"</strong> waiting for you to assign a table by hand — at that point there's nothing else to check, everything else (capacity, opening hours) was already validated when it came in.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Check "Pending online requests" a few times a day, especially before each service, in case a large reservation is left waiting for a table.</div>

    <h4>Letting the customer know: email confirmation</h4>
    <p>So the customer knows for sure whether their reservation is confirmed (instead of being left wondering), you can turn on an automatic email as soon as it's confirmed — whether that happened on its own or you confirmed it by hand. Set it up in <strong>My Business → Reservation confirmation by email</strong>, with your own free <strong>EmailJS</strong> account (no coding needed):</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>emailjs.com</strong> and create a free account.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Under <strong>"Email Services" → "Add New Email Service"</strong>, pick Gmail (or whichever email you use) and connect it with <strong>"Connect Account"</strong> — one click, sign in with Google, done. Copy the <strong>Service ID</strong> it gives you.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Under <strong>"Email Templates"</strong>, pick a ready-made template from the gallery (look for a booking/confirmation one) instead of building one from scratch, and just tweak the wording. Use these variables as-is: <code>{{to_email}}</code>, <code>{{client_name}}</code>, <code>{{business_name}}</code>, <code>{{date}}</code>, <code>{{time}}</code>, <code>{{people}}</code>, <code>{{table_name}}</code>. Copy the <strong>Template ID</strong>.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Under <strong>"Account" → "General"</strong>, copy your <strong>Public Key</strong>.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">Paste the 3 codes into <strong>My Business → Reservation confirmation by email</strong>, turn the switch on, and press <strong>"Send test email"</strong> to check it arrives.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>It's completely free up to 200 emails a month — plenty for a single restaurant's reservations.</div>

    <h4>On the Dashboard</h4>
    <p><strong>Today's and tomorrow's</strong> reservations show up automatically on the Dashboard, so when you open the app in the morning you already know how many guests to expect and can give the kitchen and floor advance notice.</p>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If you cancel or change an already-confirmed reservation, remember to notify the customer by phone or WhatsApp: cancelling doesn't send them any automatic message (the automatic email is only sent when confirming).</div>`},
  },
  {
    title:{es:'<i class="ti ti-device-desktop"></i> TPV', ca:'<i class="ti ti-device-desktop"></i> TPV', en:'<i class="ti ti-device-desktop"></i> POS'},
    content:{es:`<h3>Comandas, mesas y tickets</h3>
    <h4>Plano de sala</h4>
    <p>Las mesas que aparecen en el TPV son <strong>exactamente las que configuras en Mi Negocio → Operativa</strong>, agrupadas por zona (Interior, Terraza, Barra). Allí puedes ponerle a cada mesa el nombre o número que quieras, añadir o eliminar mesas. Cada mesa ocupada se pinta con un <strong>color de borde según la fase del servicio</strong> (gris = tomando nota, ámbar = en cocina, morado = preparando, verde = servido/listo para cobrar), muestra el <strong>camarero/a asignado</strong> (avatar con su color de identificación), el número de comensales y el total. Una mesa libre con una reserva confirmada dentro de la próxima hora se marca con un borde discontinuo naranja y la hora, para no sentar ahí a nadie sin reserva justo antes de que llegue quien la reservó.</p>
    <h4>Abrir una mesa: cliente de paso o con reserva</h4>
    <p>Al pulsar una mesa libre, eliges si el cliente es <strong>"de paso"</strong> (indicas el número de comensales) o <strong>"tiene reserva"</strong> (eliges la reserva del día y se rellena solo). El camarero/a que se asigna a la comanda solo puede ser <strong>personal del área Sala</strong>.</p>
    <h4>Tomar la comanda (selector a dos columnas)</h4>
    <ul>
      <li>Arriba aparecen las <strong>pestañas de cartas y menús</strong> disponibles, siempre con las <strong>bebidas primero</strong> (así no se olvida pedir la bebida).</li>
      <li>A la <strong>izquierda</strong> eliges los platos: ves todas las secciones (Entrantes, Principales...) con sus platos a la vista. Al pulsar un plato se suma a la comanda.</li>
      <li>A la <strong>derecha</strong> se va formando la <strong>comanda en vivo</strong>, en el mismo orden en que eliges los platos (arriba lo primero que se come, abajo lo último). De cada plato ves el nombre, la cantidad, puedes ponerle <strong>notas</strong> o quitarlo.</li>
    </ul>
    <h4>Marchar y seguimiento del servicio</h4>
    <ul>
      <li>Cada grupo de platos (sección) tiene su botón <strong>Marchar</strong>, y muestra su estado, sincronizado con la pantalla de Cocina: <strong>⏳ Marchado → 🔥 En preparación → 🍽️ Listo para recoger → ✅ Recogido</strong>. Cuando en Cocina marcan un plato como listo/recogido, en Sala se actualiza solo.</li>
      <li>El botón <strong>"Marchar vale"</strong> envía de una vez <strong>todas las bebidas a sala/barra y el primer grupo de comida a cocina</strong>. Los siguientes grupos (segundos, postres...) se marchan con su propio botón cuando el cliente esté listo.</li>
      <li>Cuando <strong>todos los platos están servidos</strong>, aparece abajo el botón <strong>Cobrar</strong>, que abre el desglose de pago, genera el ticket, registra la venta y libera la mesa.</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Puedes elegir en <strong>Mi Negocio → Comandas de cocina y sala</strong> si las comandas se ven en la <strong>pantalla de Cocina/Sala</strong> o se <strong>imprimen en un vale</strong> al marchar (un vale de cocina con la comida y otro de sala/barra con las bebidas).</div>
    <h4>Para llevar / Delivery</h4>
    <p>Estos pedidos <strong>no se crean a mano desde el TPV</strong>: llegan siempre desde la web pública de pedidos online del negocio (ver capítulo "Reservas y Pedidos Online"), donde el propio cliente elige <strong>Para recoger</strong> o <strong>A domicilio</strong> y rellena sus datos. Si su teléfono coincide con un cliente ya dado de alta, el pedido queda vinculado a su ficha automáticamente (suma puntos de fidelidad y aparece en su historial).</p>
    <ul>
      <li><strong>Fecha y hora de recogida/entrega</strong> (opcional en el formulario público): si la deja en blanco se entiende "cuanto antes" y el pedido aparece ya en pantalla. Si se programa para más tarde o para otro día, <strong>el pedido no aparece en el TPV hasta una hora antes</strong> de la hora indicada, para no acumular pedidos lejanos en la pantalla.</li>
      <li>Para "A domicilio": dirección, la plataforma (Glovo, Uber Eats...) o <strong>"Reparto propio"</strong> si lo lleva alguien del propio negocio. Si es reparto propio, la app <strong>asigna sola</strong> el pedido al repartidor de turno (empleado de Sala marcado como "Es repartidor" en Personal) con menos repartos activos en ese momento — no hace falta elegirlo a mano, aunque puedes cambiarlo tú desde la ficha del pedido si hace falta. El coste de envío configurado en Mi Negocio solo se aplica cuando es reparto propio — si es una plataforma externa, esa plataforma ya cobra su propio envío aparte.</li>
    </ul>
    <p>Estos pedidos aparecen en la sección <strong>"Para Llevar / Delivery"</strong>, al final de la pantalla de Sala, con el mismo estilo de tarjeta que las mesas — no es un panel aparte. Se muestra siempre que tengas alguno de los dos servicios activado en Mi Negocio → Tipos de servicio (aunque no haya ningún pedido abierto en ese momento). Las bebidas de estos pedidos no pasan por la pantalla de Cocina; su estado (pedida/preparando/servida) se marca desde el propio panel de Sala.</p>
    <h4>Control de repartos</h4>
    <p>Junto al título <strong>"Para Llevar / Delivery"</strong>, el botón <strong>"Control de repartos"</strong> abre un resumen con todos los repartos propios en curso y el histórico de entregados hoy. Dentro de cada pedido de reparto propio verás una tarjeta con todo lo necesario para llevarlo: <strong>dirección con botón directo a Google Maps</strong>, teléfono, importe a cobrar (o si ya está pagado online), repartidor asignado, y un espacio de <strong>observaciones</strong> para anotar incidencias ("no tenía cambio", "cancelado por llegar tarde"...). Si el cliente indicó en la web pública con qué billete iba a pagar, el <strong>cambio a preparar</strong> ya sale calculado. Cuando el mismo repartidor tiene varios pedidos activos a la vez, la app los agrupa solos en una <strong>ruta</strong> (respetando los límites de paradas y ventana de tiempo configurados en Mi Negocio → Pedidos) y el botón de Maps abre el recorrido completo optimizado en vez de una única dirección. Al entregar, un solo botón: <strong>"Marcar entregado"</strong>.</p>
    <h4>Anulaciones y descuentos</h4>
    <p>Si borras o reduces la cantidad de un plato que <strong>ya se ha marchado a cocina</strong> (incluso si ya está servido), la app pide un <strong>motivo</strong> antes de permitirlo, y queda registrado en <strong>"Anulaciones"</strong> (botón del TPV) con fecha, mesa, plato y <strong>quién lo hizo</strong> (se toma solo de la sesión del empleado conectado, sin tener que elegirlo a mano) — para que el responsable pueda revisarlo después. Si el plato todavía no se ha marchado, se borra libremente sin pedir nada.</p>
    <p>Al cobrar, puedes aplicar un <strong>% de descuento manual</strong> (exige indicar responsable y motivo) que solo se ve reflejado en el total una vez pulsas "Aplicar" — mientras escribes el porcentaje no se previsualiza para evitar confusiones. Si hay una <strong>promoción activa</strong> ese día para un plato o bebida concreto (configurada desde Promoción), su descuento se aplica automáticamente al añadirlo a la comanda, sin tener que hacer nada más.</p>
    <h4>Cierre de caja / Arqueo</h4>
    <p>Al finalizar un turno o el día, pulsa <strong>Cerrar caja</strong>:</p>
    <ul>
      <li>El sistema calcula automáticamente el total de ventas por <strong>método de pago</strong> (Efectivo, Tarjeta, Otro) desde el último cierre del día (o desde el inicio del día si es el primero)</li>
      <li>Indica el <strong>fondo de caja inicial</strong> (si lo hay) y el <strong>efectivo contado</strong> físicamente en caja</li>
      <li>La app calcula el <strong>efectivo esperado</strong> y la <strong>diferencia</strong> (sobra/falta)</li>
      <li>Puedes añadir notas y se genera un <strong>ticket imprimible</strong> con el resumen del cierre</li>
    </ul>
    <p>Puedes hacer varios cierres al día (por turnos) o uno solo al final del día. Consulta cierres anteriores en <strong>Historial de arqueos</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Las ventas registradas en el TPV alimentan automáticamente la Gestión Económica, el Stock y el Panel de Control.</div>`,
    ca:`<h3>Comandes, taules i tiquets</h3>
    <h4>Plànol de sala</h4>
    <p>Les taules que apareixen al TPV són <strong>exactament les que configures a El Meu Negoci → Operativa</strong>, agrupades per zona (Interior, Terrassa, Barra). Allà pots posar a cada taula el nom o número que vulguis, afegir o eliminar taules. Cada taula ocupada es pinta amb un <strong>color de vora segons la fase del servei</strong> (gris = prenent nota, ambre = a cuina, morat = preparant, verd = servit/llest per cobrar), mostra el <strong>cambrer/a assignat</strong> (avatar amb el seu color d'identificació), el nombre de comensals i el total. Una taula lliure amb una reserva confirmada dins la propera hora es marca amb una vora discontínua taronja i l'hora, per no asseure-hi ningú sense reserva just abans que arribi qui l'ha reservat.</p>
    <h4>Obrir una taula: client de pas o amb reserva</h4>
    <p>En prémer una taula lliure, tries si el client és <strong>"de pas"</strong> (indiques el nombre de comensals) o <strong>"té reserva"</strong> (tries la reserva del dia i s'omple sol). El cambrer/a que s'assigna a la comanda només pot ser <strong>personal de l'àrea Sala</strong>.</p>
    <h4>Prendre la comanda (selector a dues columnes)</h4>
    <ul>
      <li>A dalt apareixen les <strong>pestanyes de cartes i menús</strong> disponibles, sempre amb les <strong>begudes primer</strong> (així no s'oblida demanar la beguda).</li>
      <li>A l'<strong>esquerra</strong> tries els plats: veus totes les seccions (Entrants, Principals...) amb els seus plats a la vista. En prémer un plat se suma a la comanda.</li>
      <li>A la <strong>dreta</strong> es va formant la <strong>comanda en viu</strong>, en el mateix ordre en què tries els plats (a dalt el primer que es menja, a baix l'últim). De cada plat veus el nom, la quantitat, hi pots posar <strong>notes</strong> o treure'l.</li>
    </ul>
    <h4>Marxar i seguiment del servei</h4>
    <ul>
      <li>Cada grup de plats (secció) té el seu botó <strong>Marxar</strong>, i mostra el seu estat, sincronitzat amb la pantalla de Cuina: <strong>⏳ Marxat → 🔥 En preparació → 🍽️ Llest per recollir → ✅ Recollit</strong>. Quan a Cuina marquen un plat com a llest/recollit, a Sala s'actualitza sol.</li>
      <li>El botó <strong>"Marxar val"</strong> envia de cop <strong>totes les begudes a sala/barra i el primer grup de menjar a cuina</strong>. Els grups següents (segons, postres...) es marxen amb el seu propi botó quan el client estigui llest.</li>
      <li>Quan <strong>tots els plats estan servits</strong>, apareix a baix el botó <strong>Cobrar</strong>, que obre el desglossament de pagament, genera el tiquet, registra la venda i allibera la taula.</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Pots triar a <strong>El Meu Negoci → Comandes de cuina i sala</strong> si les comandes es veuen a la <strong>pantalla de Cuina/Sala</strong> o s'<strong>imprimeixen en un val</strong> en marxar (un val de cuina amb el menjar i un altre de sala/barra amb les begudes).</div>
    <h4>Per emportar / Delivery</h4>
    <p>Aquestes comandes <strong>no es creen a mà des del TPV</strong>: arriben sempre des de la web pública de comandes en línia del negoci (vegeu el capítol "Reserves i Comandes en línia"), on el mateix client tria <strong>Per recollir</strong> o <strong>A domicili</strong> i emplena les seves dades. Si el seu telèfon coincideix amb un client ja donat d'alta, la comanda queda vinculada a la seva fitxa automàticament (suma punts de fidelitat i apareix al seu historial).</p>
    <ul>
      <li><strong>Data i hora de recollida/lliurament</strong> (opcional al formulari públic): si la deixa en blanc s'entén "com més aviat millor" i la comanda apareix ja en pantalla. Si es programa per més tard o per un altre dia, <strong>la comanda no apareix al TPV fins una hora abans</strong> de l'hora indicada, per no acumular comandes llunyanes a la pantalla.</li>
      <li>Per a "A domicili": adreça, la plataforma (Glovo, Uber Eats...) o <strong>"Repartiment propi"</strong> si ho porta algú del propi negoci. Si és repartiment propi, l'app <strong>assigna sola</strong> la comanda al repartidor de torn (empleat de Sala marcat com a "És repartidor" a Personal) amb menys repartiments actius en aquell moment — no cal triar-lo a mà, encara que pots canviar-ho tu des de la fitxa de la comanda si cal. El cost d'enviament configurat a El Meu Negoci només s'aplica quan és repartiment propi — si és una plataforma externa, aquesta plataforma ja cobra el seu propi enviament a part.</li>
    </ul>
    <p>Aquestes comandes apareixen a la secció <strong>"Per Emportar / Delivery"</strong>, al final de la pantalla de Sala, amb el mateix estil de targeta que les taules — no és un panell a part. Es mostra sempre que tinguis algun dels dos serveis activat a El Meu Negoci → Tipus de servei (encara que no hi hagi cap comanda oberta en aquell moment). Les begudes d'aquestes comandes no passen per la pantalla de Cuina; el seu estat (demanada/preparant/servida) es marca des del propi panell de Sala.</p>
    <h4>Control de repartiments</h4>
    <p>Al costat del títol <strong>"Per Emportar / Delivery"</strong>, el botó <strong>"Control de repartiments"</strong> obre un resum amb tots els repartiments propis en curs i l'històric d'entregats avui. Dins de cada comanda de repartiment propi veuràs una targeta amb tot el necessari per portar-la: <strong>adreça amb botó directe a Google Maps</strong>, telèfon, import a cobrar (o si ja està pagat en línia), repartidor assignat, i un espai d'<strong>observacions</strong> per anotar incidències ("no tenia canvi", "cancel·lat per arribar tard"...). Si el client va indicar a la web pública amb quin bitllet pagaria, el <strong>canvi a preparar</strong> ja surt calculat. Quan el mateix repartidor té diverses comandes actives alhora, l'app les agrupa soles en una <strong>ruta</strong> (respectant els límits de parades i finestra de temps configurats a El Meu Negoci → Comandes) i el botó de Maps obre el recorregut complet optimitzat en comptes d'una única adreça. En entregar, un sol botó: <strong>"Marcar entregat"</strong>.</p>
    <h4>Anul·lacions i descomptes</h4>
    <p>Si esborres o redueixes la quantitat d'un plat que <strong>ja s'ha marxat a cuina</strong> (fins i tot si ja està servit), l'app demana un <strong>motiu</strong> abans de permetre-ho, i queda registrat a <strong>"Anul·lacions"</strong> (botó del TPV) amb data, taula, plat i <strong>qui ho ha fet</strong> (es pren sol de la sessió de l'empleat connectat, sense haver de triar-lo a mà) — perquè el responsable ho pugui revisar després. Si el plat encara no s'ha marxat, s'esborra lliurement sense demanar res.</p>
    <p>En cobrar, pots aplicar un <strong>% de descompte manual</strong> (exigeix indicar responsable i motiu) que només es veu reflectit al total un cop prems "Aplicar" — mentre escrius el percentatge no es previsualitza per evitar confusions. Si hi ha una <strong>promoció activa</strong> aquell dia per a un plat o beguda concreta (configurada des de Promoció), el seu descompte s'aplica automàticament en afegir-lo a la comanda, sense haver de fer res més.</p>
    <h4>Tancament de caixa / Arqueig</h4>
    <p>En finalitzar un torn o el dia, prem <strong>Tancar caixa</strong>:</p>
    <ul>
      <li>El sistema calcula automàticament el total de vendes per <strong>mètode de pagament</strong> (Efectiu, Targeta, Altre) des de l'últim tancament del dia (o des de l'inici del dia si és el primer)</li>
      <li>Indica el <strong>fons de caixa inicial</strong> (si n'hi ha) i l'<strong>efectiu comptat</strong> físicament a caixa</li>
      <li>L'app calcula l'<strong>efectiu esperat</strong> i la <strong>diferència</strong> (sobra/falta)</li>
      <li>Pots afegir notes i es genera un <strong>tiquet imprimible</strong> amb el resum del tancament</li>
    </ul>
    <p>Pots fer diversos tancaments al dia (per torns) o un de sol al final del dia. Consulta tancaments anteriors a l'<strong>Historial d'arqueigs</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Les vendes registrades al TPV alimenten automàticament la Gestió Econòmica, l'Estoc i el Panell de Control.</div>`,
    en:`<h3>Orders, tables and receipts</h3>
    <h4>Floor plan</h4>
    <p>The tables shown in the POS are <strong>exactly the ones you set up in My Business → Operations</strong>, grouped by zone (Indoor, Terrace, Bar). There you can give each table whatever name or number you like, and add or remove tables. Every occupied table is shown with a <strong>border colour matching its service phase</strong> (grey = taking order, amber = in the kitchen, purple = preparing, green = served/ready to charge), the <strong>assigned waiter/waitress</strong> (an avatar in their identification colour), the number of guests and the total. A free table with a confirmed reservation within the next hour is marked with a dashed orange border and the time, so no walk-in gets seated right before the reservation arrives.</p>
    <h4>Opening a table: walk-in or reservation</h4>
    <p>Tapping a free table, you choose whether the customer is a <strong>"walk-in"</strong> (you enter the number of guests) or <strong>"has a reservation"</strong> (you pick the day's reservation and it fills in on its own). The waiter/waitress assigned to the order can only be <strong>Floor-area staff</strong>.</p>
    <h4>Taking the order (two-column selector)</h4>
    <ul>
      <li>At the top are the <strong>menu tabs</strong> available, always with <strong>drinks first</strong> (so ordering a drink never gets forgotten).</li>
      <li>On the <strong>left</strong> you pick the dishes: you see every section (Starters, Mains...) with its dishes visible. Tapping a dish adds it to the order.</li>
      <li>On the <strong>right</strong>, the <strong>live order</strong> builds up, in the same order you pick the dishes (top = eaten first, bottom = eaten last). For each dish you see the name, the quantity, and you can add <strong>notes</strong> or remove it.</li>
    </ul>
    <h4>Firing and tracking service</h4>
    <ul>
      <li>Each group of dishes (section) has its own <strong>Fire</strong> button, and shows its status, synced with the Kitchen screen: <strong>⏳ Fired → 🔥 Being prepared → 🍽️ Ready to collect → ✅ Collected</strong>. When Kitchen marks a dish as ready/collected, Floor updates on its own.</li>
      <li>The <strong>"Fire ticket"</strong> button sends, all at once, <strong>every drink to the floor/bar and the first food course to the kitchen</strong>. Later courses (mains, desserts...) are fired with their own button once the customer is ready.</li>
      <li>Once <strong>every dish has been served</strong>, the <strong>Charge</strong> button appears at the bottom, opening the payment breakdown, generating the receipt, logging the sale and freeing the table.</li>
    </ul>
    <div class="manual-tip"><i class="ti ti-bulb"></i>In <strong>My Business → Kitchen and floor tickets</strong> you can choose whether orders are shown on the <strong>Kitchen/Floor screen</strong> or <strong>printed on a ticket</strong> when fired (a kitchen ticket with the food and a separate floor/bar ticket with the drinks).</div>
    <h4>Take away / Delivery</h4>
    <p>These orders <strong>aren't created by hand from the POS</strong>: they always come from the business's public online ordering page (see the "Online Reservations and Orders" chapter), where the customer themselves picks <strong>Pickup</strong> or <strong>Delivery</strong> and fills in their details. If their phone matches a client already on file, the order gets linked to their record automatically (earns loyalty points and shows up in their history).</p>
    <ul>
      <li><strong>Pickup/delivery date and time</strong> (optional on the public form): leave it blank and it's treated as "as soon as possible", showing up on screen right away. Schedule it for later or another day, and <strong>the order won't appear in the POS until one hour before</strong> that time, so distant orders don't clutter the screen.</li>
      <li>For "Delivery": address, the platform (Glovo, Uber Eats...) or <strong>"Own delivery"</strong> if someone from the business delivers it themselves. For own delivery, the app <strong>auto-assigns</strong> the order to the rider on shift (a Floor employee marked as "Is a delivery rider" in Staff) with the fewest active deliveries right now — no need to pick one by hand, though you can still change it from the order's card if needed. The delivery fee set in My Business only applies for own delivery — an external platform already charges its own delivery fee separately.</li>
    </ul>
    <p>These orders show up in the <strong>"Take Away / Delivery"</strong> section, at the bottom of the Floor screen, with the same card style as the tables — not a separate panel. It's shown whenever you have either service enabled in My Business → Service Types (even with no order currently open). Drinks on these orders don't go through the Kitchen screen; their status (ordered/preparing/served) is set from the Floor panel itself.</p>
    <h4>Delivery control</h4>
    <p>Next to the <strong>"Take Away / Delivery"</strong> title, the <strong>"Delivery control"</strong> button opens a summary of every own-delivery order in progress and today's delivered history. Inside each own-delivery order you'll find a card with everything the rider needs: <strong>address with a direct Google Maps button</strong>, phone number, amount to collect (or whether it's already paid online), the assigned rider, and a <strong>notes</strong> field for incidents ("no change available", "cancelled for being late"...). If the customer said on the public site what bill they'd pay with, the <strong>change to prepare</strong> is already worked out. When the same rider has several active orders at once, the app groups them into a <strong>route</strong> on its own (respecting the stop limit and time window set in My Business → Orders), and the Maps button opens the full optimised route instead of a single address. Delivering it is a single button: <strong>"Mark delivered"</strong>.</p>
    <h4>Voids and discounts</h4>
    <p>Deleting or reducing the quantity of a dish that's <strong>already been fired to the kitchen</strong> (even if already served) requires a <strong>reason</strong> before it's allowed, and gets logged in <strong>"Voids"</strong> (POS button) with date, table, dish and <strong>who did it</strong> (taken automatically from the logged-in employee's session, no need to pick a name) — so whoever is responsible can review it later. A dish that hasn't been fired yet can be removed freely with no prompt.</p>
    <p>When charging, you can apply a <strong>manual % discount</strong> (requires naming a responsible person and a reason) that only shows up in the total once you press "Apply" — the percentage isn't previewed live while you type it, to avoid confusion. If there's an <strong>active promotion</strong> that day for a specific dish or drink (set up from Promotion), its discount is applied automatically when it's added to the order, with nothing else to do.</p>
    <h4>Till closing / Cash count</h4>
    <p>At the end of a shift or the day, press <strong>Close till</strong>:</p>
    <ul>
      <li>The system automatically calculates total sales by <strong>payment method</strong> (Cash, Card, Other) since the last closing of the day (or since the start of the day if it's the first)</li>
      <li>Enter the <strong>starting float</strong> (if any) and the <strong>cash physically counted</strong> in the till</li>
      <li>The app calculates the <strong>expected cash</strong> and the <strong>difference</strong> (over/short)</li>
      <li>You can add notes, and a <strong>printable receipt</strong> with the closing summary is generated</li>
    </ul>
    <p>You can do several closings a day (per shift) or just one at the end of the day. Check past closings in <strong>Cash Count History</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Sales logged in the POS automatically feed Financial Management, Stock and the Dashboard.</div>`},
  },
  {
    title:{es:'<i class="ti ti-speakerphone"></i> Promoción', ca:'<i class="ti ti-speakerphone"></i> Promoció', en:'<i class="ti ti-speakerphone"></i> Promotion'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Este módulo es exclusivo de Sala y sirve para planificar de verdad el marketing del negocio: qué acción hacer, cuándo y quién es responsable — en vez de dejarlo en buenas intenciones. Tiene 5 pestañas.</p>

    <h4>Día / Semana / Mes</h4>
    <p>El calendario de acciones de promoción. Cada acción tiene un título, una descripción, un responsable (de tu equipo de Sala) y una casilla para marcarla como hecha (queda registrada la fecha y hora exacta en la que se completó).</p>
    <p>Una acción puede ser solo un recordatorio, o tener un <strong>efecto real en el TPV</strong>: marca "Aplica un descuento real" y elige un plato/bebida de la carta y un %; ese día, al añadir ese artículo en una comanda, el precio rebajado se aplica solo, sin que nadie tenga que acordarse de hacer nada a mano. También puedes marcar <strong>"Se repite cada semana"</strong> para no tener que recrear la misma acción cada vez (por ejemplo, un 2x1 todos los martes); el estado de "hecha" se lleva por cada día concreto, no se comparte entre semanas.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nueva Acción"</strong> desde cualquiera de las tres vistas, o el "+" de un día concreto en la vista semanal.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">En la vista de Día puedes filtrar por responsable y por estado (hechas/pendientes), y marcar directamente la casilla de "hecha".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">En la vista de Mes tienes un resumen rápido: cuántas acciones hay planificadas, cuántas completadas, y cuántas categorías de la biblioteca de ideas has usado ya.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Pulsa "Imprimir" en la vista de mes para tener el plan del mes en una hoja, útil para repasarlo en una reunión de equipo.</div>

    <h4>Clientes</h4>
    <p>Acciones rápidas de fidelización con mensajes ya escritos, listos para enviar por WhatsApp o email: felicitar cumpleaños próximos, pedir reseña a quien ha visitado recientemente, o intentar recuperar a un cliente que hace tiempo no viene. El botón <strong>"Registrar como acción"</strong> de cada tarjeta la apunta también en el calendario de Día/Mes, ya marcada como hecha.</p>

    <h4>Ideas de contenido</h4>
    <p>Una biblioteca de más de 250 ideas de contenido para redes sociales y de gestión online, organizadas por categorías (detrás de cámaras, producto, temporada, Google Business y reseñas, redes sociales...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Elige una categoría y, cuando tengas clara una idea, pulsa <strong>"Crear acción"</strong> para planificarla con fecha y responsable — queda enlazada a esa idea, así sabrás que ya la usaste (y cuándo) la próxima vez que mires esa categoría.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si no tienes tiempo de mirar todas las categorías, pulsa <strong>"Sorpréndeme"</strong>: elige una idea al azar (priorizando las que nunca has probado) y la abre directamente lista para planificar.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Las categorías "Google Business y reseñas" y "Redes sociales — gestión y mantenimiento" no son contenido creativo, sino tareas de mantenimiento real (responder reseñas, actualizar horario en Google...) igual de importantes para que la publicidad del negocio funcione.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Aquest mòdul és exclusiu de Sala i serveix per planificar de veritat el màrqueting del negoci: quina acció fer, quan i qui n'és responsable — en lloc de deixar-ho en bones intencions. Té 5 pestanyes.</p>

    <h4>Dia / Setmana / Mes</h4>
    <p>El calendari d'accions de promoció. Cada acció té un títol, una descripció, un responsable (del teu equip de Sala) i una casella per marcar-la com a feta (queda registrada la data i hora exacta en què es va completar).</p>
    <p>Una acció pot ser només un recordatori, o tenir un <strong>efecte real al TPV</strong>: marca "Aplica un descompte real" i tria un plat/beguda de la carta i un %; aquell dia, en afegir aquell article en una comanda, el preu rebaixat s'aplica sol, sense que ningú s'hagi de recordar de fer res a mà. També pots marcar <strong>"Es repeteix cada setmana"</strong> per no haver de recrear la mateixa acció cada vegada (per exemple, un 2x1 tots els dimarts); l'estat de "feta" es porta per cada dia concret, no es comparteix entre setmanes.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>"+ Nova Acció"</strong> des de qualsevol de les tres vistes, o el "+" d'un dia concret a la vista setmanal.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">A la vista de Dia pots filtrar per responsable i per estat (fetes/pendents), i marcar directament la casella de "feta".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">A la vista de Mes tens un resum ràpid: quantes accions hi ha planificades, quantes completades, i quantes categories de la biblioteca d'idees ja has fet servir.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Prem "Imprimir" a la vista de mes per tenir el pla del mes en un full, útil per repassar-lo en una reunió d'equip.</div>

    <h4>Clients</h4>
    <p>Accions ràpides de fidelització amb missatges ja escrits, a punt per enviar per WhatsApp o email: felicitar aniversaris propers, demanar ressenya a qui ha visitat recentment, o intentar recuperar un client que fa temps que no ve. El botó <strong>"Registrar com a acció"</strong> de cada targeta l'apunta també al calendari de Dia/Mes, ja marcada com a feta.</p>

    <h4>Idees de contingut</h4>
    <p>Una biblioteca de més de 250 idees de contingut per a xarxes socials i de gestió en línia, organitzades per categories (darrere les càmeres, producte, temporada, Google Business i ressenyes, xarxes socials...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Tria una categoria i, quan tinguis clara una idea, prem <strong>"Crear acció"</strong> per planificar-la amb data i responsable — queda enllaçada a aquella idea, així sabràs que ja la vas fer servir (i quan) la propera vegada que miris aquella categoria.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si no tens temps de mirar totes les categories, prem <strong>"Sorprèn-me"</strong>: tria una idea a l'atzar (prioritzant les que mai has provat) i l'obre directament a punt per planificar.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Les categories "Google Business i ressenyes" i "Xarxes socials — gestió i manteniment" no són contingut creatiu, sinó tasques de manteniment real (respondre ressenyes, actualitzar horari a Google...) igual d'importants perquè la publicitat del negoci funcioni.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>This module is exclusive to Floor and is for genuinely planning the business's marketing: what action to take, when, and who's responsible — instead of leaving it as good intentions. It has 5 tabs.</p>

    <h4>Day / Week / Month</h4>
    <p>The promotional actions calendar. Each action has a title, a description, a person responsible (from your Floor team) and a checkbox to mark it done (the exact date and time it was completed is logged).</p>
    <p>An action can be just a reminder, or have a <strong>real effect at the till</strong>: tick "Applies a real discount" and pick a dish/drink from the menu and a %; that day, adding that item to an order applies the discounted price on its own, with nobody having to remember to do anything by hand. You can also tick <strong>"Repeats every week"</strong> so you don't have to recreate the same action every time (e.g. a 2-for-1 every Tuesday); the "done" status is tracked per specific day, not shared across weeks.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>"+ New Action"</strong> from any of the three views, or the "+" on a specific day in the week view.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">In the Day view you can filter by person responsible and by status (done/pending), and tick the "done" checkbox directly.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">In the Month view you get a quick summary: how many actions are planned, how many completed, and how many categories from the idea library you've already used.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Press "Print" in the month view to get the month's plan on a single sheet, handy for going over in a team meeting.</div>

    <h4>Customers</h4>
    <p>Quick loyalty actions with pre-written messages, ready to send by WhatsApp or email: wishing an upcoming birthday, asking for a review from someone who visited recently, or trying to win back a customer who hasn't been in for a while. The <strong>"Log as action"</strong> button on each card also adds it to the Day/Month calendar, already marked as done.</p>

    <h4>Content ideas</h4>
    <p>A library of more than 250 content ideas for social media and online management, organised into categories (behind the scenes, product, seasonal, Google Business and reviews, social media...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Choose a category and, once you've settled on an idea, press <strong>"Create action"</strong> to schedule it with a date and person responsible — it stays linked to that idea, so you'll know you've already used it (and when) next time you look at that category.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you don't have time to browse every category, press <strong>"Surprise me"</strong>: it picks a random idea (prioritising ones you've never tried) and opens it directly, ready to schedule.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>The "Google Business and reviews" and "Social media — management and maintenance" categories aren't creative content, but real maintenance tasks (replying to reviews, updating your Google hours...) just as important for the business's advertising to actually work.</div>`},
  },
  {
    title:{es:'<i class="ti ti-chart-bar"></i> Gestión Económica', ca:'<i class="ti ti-chart-bar"></i> Gestió Econòmica', en:'<i class="ti ti-chart-bar"></i> Financial Management'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>Esta sección es la "contabilidad de gestión" de tu negocio: junta lo que vendes (datos del TPV) con lo que gastas (lo que registras tú aquí) para decirte, sin esperar a fin de año ni a que te lo diga la gestoría, si tu negocio gana dinero, cuánto, y cuántos cubiertos necesitas vender para no perder. Tiene 7 pestañas que conviene rellenar en este orden.</p>

    <h4>1. Gastos Fijos</h4>
    <p>Aquí van todos los gastos mensuales que <strong>no cambian</strong> aunque vendas más o menos: nóminas (incluida la tuya si te pagas un sueldo), alquiler, seguros, cuotas de autónomo, luz/agua/internet si son más o menos estables, software, etc.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa "+ Añadir gasto fijo", escribe el concepto (ej. "Alquiler local") y el importe mensual.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repite con todos tus gastos fijos. Revísalos cada vez que cambie algo (nueva contratación, subida de alquiler, nuevo seguro...).</div></div>
    <p>Estos importes alimentan automáticamente el Punto de Equilibrio y la Cuenta de Resultados.</p>

    <h4>2. Gastos Variables</h4>
    <p>Aquí registras las compras a proveedores, mes a mes: comida, bebida, desechables... todo lo que varía según cuánto produces y vendes.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Registra cada compra con su importe y mes. Si ya gestionas tus compras en el módulo Proveedores/Pedidos, procura mantener ambos coherentes.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">La app calcula tu <strong>food cost real</strong> (coste de materia prima real sobre facturación, ya sea comida o bebida) y lo compara con tu <strong>food cost objetivo</strong>, que configuras en Punto de Equilibrio.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si tu food cost real está muy por encima del objetivo, revisa: escandallos sin actualizar, mermas, robos/descontrol de stock, o precios de carta/carta de bebidas desactualizados frente a lo que te cuesta ahora la materia prima.</div>

    <h4>3. Cuenta de Resultados</h4>
    <p>Vista mensual automática: <strong>Facturación</strong> (sumada del TPV) menos <strong>Gastos</strong> (de las dos pestañas anteriores) = <strong>Resultado del mes</strong>. Usa las flechas para moverte entre meses y años y ver tu evolución histórica de un vistazo.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa esta pestaña el día 1 o 2 de cada mes, en cuanto tengas cerrado el mes anterior. Te da una foto rápida de cómo te ha ido.</div>

    <h4>4. Resultado (P&amp;L)</h4>
    <p>Cuenta de pérdidas y ganancias trimestral y anual, calculada en cascada:</p>
    <table>
      <tr><th>Paso</th><th>Qué es</th></tr>
      <tr><td>Ventas</td><td>Toda tu facturación del periodo</td></tr>
      <tr><td>− Coste de ventas</td><td>Lo que te ha costado producir lo que has vendido (food cost)</td></tr>
      <tr><td>= Margen Bruto</td><td>Lo que te queda para pagar el resto</td></tr>
      <tr><td>− Gastos fijos y de estructura</td><td>Personal, alquiler, suministros...</td></tr>
      <tr><td>= EBITDA</td><td>Resultado antes de financiación, amortizaciones e impuestos</td></tr>
      <tr><td>− Amortizaciones / financiación (CAPEX)</td><td>Cuotas de equipamiento financiado</td></tr>
      <tr><td>= Resultado Antes de Impuestos</td><td>Lo que "ganarías" antes de pagar IRPF/Sociedades</td></tr>
      <tr><td>− Impuesto sobre beneficios</td><td>Según el % que configures (IRPF si eres autónomo, IS si eres sociedad)</td></tr>
      <tr><td>= Resultado Neto</td><td>Lo que realmente te queda</td></tr>
    </table>
    <div class="manual-step"><div class="sn">1</div><div class="st">Configura el % de impuesto sobre beneficios que te corresponde según tu forma de tributación (consulta a tu gestor si no lo sabes con exactitud).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Revisa el P&amp;L cada trimestre para detectar tendencias (¿el margen bruto está bajando? ¿los gastos fijos pesan cada vez más sobre las ventas?).</div></div>

    <h4>5. Tesorería: a dónde va cada euro que entra</h4>
    <p>Esta pestaña reparte tu facturación en partidas para que sepas, de cada 100€ que entran en caja, cuánto es realmente "tuyo" y cuánto está comprometido.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Configura el % objetivo de cada partida: Personal, Gastos Fijos, Gastos Variables, Otros y Beneficio (deben sumar el 100% de la facturación).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">La app calcula también cuánto debes reservar de IVA (normalmente repercutido en tus ventas y que no es "tuyo") y cuánto de impuesto sobre el beneficio (IRPF/IS).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">El resultado final es tu <strong>beneficio neto realmente disponible</strong>: el dinero que puedes usar sin sorpresas, después de apartar lo de Hacienda.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Muchos negocios "ganan dinero sobre el papel" pero van ahogados porque gastan el IVA cobrado como si fuera suyo. Si separas mentalmente (o en una cuenta aparte) el % de IVA que indica esta pestaña, evitas ese problema.</div>

    <h4>6. Punto de Equilibrio</h4>
    <p>Te dice cuántos cubiertos al mes necesitas vender como mínimo para que tus ingresos cubran tus gastos (ni ganas ni pierdes).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Introduce tu <strong>ticket medio</strong> (lo que gasta de media un cliente).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Introduce los <strong>días de apertura al mes</strong>.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Introduce tu <strong>food cost objetivo</strong> (% que quieres que represente la materia prima sobre tus ventas, normalmente 28-35% según el tipo de negocio).</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">La app cruza estos datos con tus Gastos Fijos y te devuelve los <strong>cubiertos/mes</strong> y <strong>cubiertos/día</strong> que necesitas para cubrir gastos. Todo lo que vendas por encima de esa cifra es lo que empieza a generar beneficio real.</div></div>
    <p><strong>Ejemplo:</strong> si tus gastos fijos son 6.000€/mes, tu ticket medio es 18€ y tu food cost objetivo es 30% (es decir, cada 18€ de venta dejan 12,60€ de margen bruto), necesitarías unos 6.000 / 12,60 ≈ 476 cubiertos al mes para cubrir gastos. Si abres 26 días, son unos 18-19 cubiertos al día como mínimo.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Compara cada mes tus cubiertos reales (los puedes estimar dividiendo la facturación entre el ticket medio) con este mínimo. El Panel de Control te muestra esta comparación automáticamente.</div>

    <h4>7. CAPEX (inversiones y equipamiento)</h4>
    <p>Registra aquí las inversiones grandes: horno nuevo, cámara, obra, mobiliario...</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Da de alta la inversión con su importe total y fecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si la has financiado a plazos, marca la opción correspondiente e indica la <strong>cuota mensual</strong> y el <strong>número de cuotas</strong>. Esa cuota se sumará como gasto mensual mientras dure la financiación, y desaparecerá sola cuando termine.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>El ranking de platos más/menos vendidos y más/menos rentables (Análisis de Platos) se encuentra ahora en el Panel de Control.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>Aquesta secció és la "comptabilitat de gestió" del teu negoci: ajunta el que vens (dades del TPV) amb el que gastes (el que tu registres aquí) per dir-te, sense esperar a final d'any ni que t'ho digui la gestoria, si el teu negoci guanya diners, quant, i quants comensals necessites vendre per no perdre. Té 7 pestanyes que convé emplenar en aquest ordre.</p>

    <h4>1. Despeses Fixes</h4>
    <p>Aquí van totes les despeses mensuals que <strong>no canvien</strong> tot i que venguis més o menys: nòmines (inclosa la teva si et pagues un sou), lloguer, assegurances, quotes d'autònom, llum/aigua/internet si són més o menys estables, programari, etc.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Prem "+ Afegir despesa fixa", escriu el concepte (ex. "Lloguer local") i l'import mensual.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repeteix amb totes les teves despeses fixes. Revisa-les cada vegada que canviï alguna cosa (nova contractació, pujada de lloguer, nova assegurança...).</div></div>
    <p>Aquests imports alimenten automàticament el Punt d'Equilibri i el Compte de Resultats.</p>

    <h4>2. Despeses Variables</h4>
    <p>Aquí registres les compres a proveïdors, mes a mes: menjar, beguda, deixalles... tot el que varia segons quant produeixes i vens.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Registra cada compra amb el seu import i mes. Si ja gestiones les teves compres al mòdul Proveïdors/Comandes, procura mantenir tots dos coherents.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">L'app calcula el teu <strong>food cost real</strong> (cost de matèria primera real sobre facturació, sigui menjar o beguda) i el compara amb el teu <strong>food cost objectiu</strong>, que configures a Punt d'Equilibri.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si el teu food cost real està molt per sobre de l'objectiu, revisa: escandalls sense actualitzar, mermes, robatoris/descontrol d'estoc, o preus de carta/carta de begudes desactualitzats respecte al que et costa ara la matèria primera.</div>

    <h4>3. Compte de Resultats</h4>
    <p>Vista mensual automàtica: <strong>Facturació</strong> (sumada del TPV) menys <strong>Despeses</strong> (de les dues pestanyes anteriors) = <strong>Resultat del mes</strong>. Fes servir les fletxes per moure't entre mesos i anys i veure la teva evolució històrica d'un cop d'ull.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Revisa aquesta pestanya el dia 1 o 2 de cada mes, així que tinguis tancat el mes anterior. Et dona una foto ràpida de com t'ha anat.</div>

    <h4>4. Resultat (P&amp;L)</h4>
    <p>Compte de pèrdues i guanys trimestral i anual, calculat en cascada:</p>
    <table>
      <tr><th>Pas</th><th>Què és</th></tr>
      <tr><td>Vendes</td><td>Tota la teva facturació del període</td></tr>
      <tr><td>− Cost de vendes</td><td>El que t'ha costat produir el que has venut (food cost)</td></tr>
      <tr><td>= Marge Brut</td><td>El que et queda per pagar la resta</td></tr>
      <tr><td>− Despeses fixes i d'estructura</td><td>Personal, lloguer, subministraments...</td></tr>
      <tr><td>= EBITDA</td><td>Resultat abans de finançament, amortitzacions i impostos</td></tr>
      <tr><td>− Amortitzacions / finançament (CAPEX)</td><td>Quotes d'equipament finançat</td></tr>
      <tr><td>= Resultat Abans d'Impostos</td><td>El que "guanyaries" abans de pagar IRPF/Societats</td></tr>
      <tr><td>− Impost sobre beneficis</td><td>Segons el % que configuris (IRPF si ets autònom, IS si ets societat)</td></tr>
      <tr><td>= Resultat Net</td><td>El que realment et queda</td></tr>
    </table>
    <div class="manual-step"><div class="sn">1</div><div class="st">Configura el % d'impost sobre beneficis que et correspon segons la teva forma de tributació (consulta el teu gestor si no ho saps amb exactitud).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Revisa el P&amp;L cada trimestre per detectar tendències (el marge brut baixa? les despeses fixes pesen cada vegada més sobre les vendes?).</div></div>

    <h4>5. Tresoreria: a on va cada euro que entra</h4>
    <p>Aquesta pestanya reparteix la teva facturació en partides perquè sàpigues, de cada 100€ que entren a caixa, quant és realment "teu" i quant està compromès.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Configura el % objectiu de cada partida: Personal, Despeses Fixes, Despeses Variables, Altres i Benefici (han de sumar el 100% de la facturació).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">L'app calcula també quant has de reservar d'IVA (normalment repercutit a les teves vendes i que no és "teu") i quant d'impost sobre el benefici (IRPF/IS).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">El resultat final és el teu <strong>benefici net realment disponible</strong>: els diners que pots fer servir sense sorpreses, després d'apartar el d'Hisenda.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Molts negocis "guanyen diners sobre el paper" però van escanyats perquè es gasten l'IVA cobrat com si fos seu. Si separes mentalment (o en un compte a part) el % d'IVA que indica aquesta pestanya, evites aquest problema.</div>

    <h4>6. Punt d'Equilibri</h4>
    <p>Et diu quants comensals al mes necessites vendre com a mínim perquè els teus ingressos cobreixin les teves despeses (ni guanyes ni perds).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Introdueix el teu <strong>tiquet mitjà</strong> (el que gasta de mitjana un client).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Introdueix els <strong>dies d'obertura al mes</strong>.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Introdueix el teu <strong>food cost objectiu</strong> (% que vols que representi la matèria primera sobre les teves vendes, normalment 28-35% segons el tipus de negoci).</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">L'app creua aquestes dades amb les teves Despeses Fixes i et retorna els <strong>comensals/mes</strong> i <strong>comensals/dia</strong> que necessites per cobrir despeses. Tot el que venguis per sobre d'aquesta xifra és el que comença a generar benefici real.</div></div>
    <p><strong>Exemple:</strong> si les teves despeses fixes són 6.000€/mes, el teu tiquet mitjà és 18€ i el teu food cost objectiu és 30% (és a dir, cada 18€ de venda deixen 12,60€ de marge brut), necessitaries uns 6.000 / 12,60 ≈ 476 comensals al mes per cobrir despeses. Si obres 26 dies, són uns 18-19 comensals al dia com a mínim.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Compara cada mes els teus comensals reals (els pots estimar dividint la facturació entre el tiquet mitjà) amb aquest mínim. El Panell de Control et mostra aquesta comparació automàticament.</div>

    <h4>7. CAPEX (inversions i equipament)</h4>
    <p>Registra aquí les inversions grans: forn nou, cambra, obra, mobiliari...</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Dona d'alta la inversió amb el seu import total i data.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si l'has finançat a terminis, marca l'opció corresponent i indica la <strong>quota mensual</strong> i el <strong>nombre de quotes</strong>. Aquesta quota se sumarà com a despesa mensual mentre duri el finançament, i desapareixerà sola quan acabi.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>El rànquing de plats més/menys venuts i més/menys rendibles (Anàlisi de Plats) es troba ara al Panell de Control.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>This section is your business's "management accounting": it combines what you sell (POS data) with what you spend (what you record here) to tell you, without waiting until year-end or for your accountant to tell you, whether your business makes money, how much, and how many covers you need to sell to break even. It has 7 tabs, best filled in in this order.</p>

    <h4>1. Fixed Costs</h4>
    <p>This is where every monthly cost that <strong>doesn't change</strong> regardless of how much you sell goes: payroll (including your own if you pay yourself a salary), rent, insurance, self-employment contributions, electricity/water/internet if fairly stable, software, etc.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Press "+ Add fixed cost", type the item (e.g. "Premises rent") and the monthly amount.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repeat for all your fixed costs. Review them whenever something changes (a new hire, a rent increase, a new insurance policy...).</div></div>
    <p>These amounts automatically feed the Break-even Point and the Profit & Loss statement.</p>

    <h4>2. Variable Costs</h4>
    <p>Here you log purchases from suppliers, month by month: food, drink, disposables... anything that varies with how much you produce and sell.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Log each purchase with its amount and month. If you already manage purchases in the Suppliers/Orders module, try to keep both consistent.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">The app calculates your <strong>real food cost</strong> (real raw-material cost against revenue, whether food or drink) and compares it with your <strong>target food cost</strong>, set in Break-even Point.</div></div>
    <div class="manual-warning"><i class="ti ti-alert-triangle"></i>If your real food cost is well above target, check for: outdated costing sheets, waste, theft/stock control issues, or menu/drinks-menu prices that haven't kept up with current raw-material costs.</div>

    <h4>3. Profit & Loss Statement</h4>
    <p>Automatic monthly view: <strong>Revenue</strong> (totalled from the POS) minus <strong>Costs</strong> (from the two previous tabs) = <strong>Result for the month</strong>. Use the arrows to move between months and years and see your historical trend at a glance.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Check this tab on the 1st or 2nd of each month, as soon as the previous month is closed. It gives you a quick snapshot of how you did.</div>

    <h4>4. Result (P&amp;L)</h4>
    <p>Quarterly and annual profit-and-loss statement, calculated top to bottom:</p>
    <table>
      <tr><th>Step</th><th>What it is</th></tr>
      <tr><td>Sales</td><td>All your revenue for the period</td></tr>
      <tr><td>− Cost of sales</td><td>What it cost you to produce what you sold (food cost)</td></tr>
      <tr><td>= Gross Margin</td><td>What's left to pay for everything else</td></tr>
      <tr><td>− Fixed and overhead costs</td><td>Staff, rent, utilities...</td></tr>
      <tr><td>= EBITDA</td><td>Result before financing, depreciation and taxes</td></tr>
      <tr><td>− Depreciation / financing (CAPEX)</td><td>Instalments on financed equipment</td></tr>
      <tr><td>= Result Before Tax</td><td>What you'd "earn" before paying income/corporate tax</td></tr>
      <tr><td>− Tax on profit</td><td>Based on the % you set (personal income tax if self-employed, corporate tax if a company)</td></tr>
      <tr><td>= Net Result</td><td>What's actually left for you</td></tr>
    </table>
    <div class="manual-step"><div class="sn">1</div><div class="st">Set the profit tax % that applies to you based on how you're taxed (ask your accountant if you're not sure of the exact figure).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Review the P&amp;L every quarter to spot trends (is gross margin dropping? are fixed costs weighing more and more on sales?).</div></div>

    <h4>5. Cash Flow: where every euro that comes in goes</h4>
    <p>This tab splits your revenue into categories so you know, out of every €100 that comes into the till, how much is really "yours" and how much is already committed.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Set the target % for each category: Staff, Fixed Costs, Variable Costs, Other and Profit (they must add up to 100% of revenue).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">The app also calculates how much VAT you should set aside (usually passed on through your sales and not really "yours") and how much profit tax (income/corporate tax).</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">The final result is your <strong>actually available net profit</strong>: the money you can use with no surprises, after setting aside what's owed to the tax office.</div></div>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Many businesses "make money on paper" but end up strapped for cash because they spend collected VAT as if it were their own. If you mentally set aside (or keep in a separate account) the VAT % this tab shows, you avoid that problem.</div>

    <h4>6. Break-even Point</h4>
    <p>Tells you the minimum number of covers you need to sell per month for your revenue to cover your costs (breaking even, neither profit nor loss).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Enter your <strong>average ticket</strong> (what a customer spends on average).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Enter your <strong>opening days per month</strong>.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Enter your <strong>target food cost</strong> (the % you want raw materials to represent of sales, typically 28-35% depending on the type of business).</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">The app cross-references this with your Fixed Costs and gives you the <strong>covers/month</strong> and <strong>covers/day</strong> you need to cover costs. Anything you sell above that figure is what starts generating real profit.</div></div>
    <p><strong>Example:</strong> if your fixed costs are €6,000/month, your average ticket is €18 and your target food cost is 30% (i.e. every €18 sale leaves €12.60 of gross margin), you'd need around 6,000 / 12.60 ≈ 476 covers a month to cover costs. If you're open 26 days, that's about 18-19 covers a day at minimum.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Compare your actual covers each month (you can estimate them by dividing revenue by the average ticket) against this minimum. The Dashboard shows you this comparison automatically.</div>

    <h4>7. CAPEX (investments and equipment)</h4>
    <p>Log big investments here: a new oven, a walk-in, refurbishment work, furniture...</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Register the investment with its total amount and date.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">If you financed it in instalments, tick the corresponding option and enter the <strong>monthly instalment</strong> and the <strong>number of instalments</strong>. That instalment will be added as a monthly cost for as long as the financing lasts, and will disappear on its own once it ends.</div></div>

    <div class="manual-tip"><i class="ti ti-bulb"></i>The ranking of best/worst-selling and most/least profitable dishes (Dish Analysis) is now found in the Dashboard.</div>`},
  },
  {
    title:{es:'<i class="ti ti-dashboard"></i> Panel de Control', ca:'<i class="ti ti-dashboard"></i> Panell de Control', en:'<i class="ti ti-dashboard"></i> Dashboard'},
    content:{es:`<h3>Qué es y para qué sirve</h3>
    <p>El Panel de Control es la primera pantalla que deberías mirar cada día. No introduces nada aquí: simplemente reúne y resume datos de todos los demás módulos (TPV, Gestión Económica, Stock, Reservas, Fichas Técnicas...) para darte, de un vistazo, el estado de salud de tu negocio. Si solo tuvieras un minuto al día para "mirar" la app, sería este.</p>

    <h4>Qué encontrarás y cómo interpretarlo</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">💰 <strong>Ventas hoy / últimos 7 días / mes en curso</strong> — el ritmo de facturación en tiempo real, en tres cifras.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">📈 <strong>Comparación de ventas del año</strong> — gráfico con la facturación de cada uno de los últimos 12 meses. Te ayuda a detectar estacionalidad (meses fuertes y flojos) y a ver la evolución de tu negocio mes a mes.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🧾 <strong>Gastos hoy / últimos 7 días / mes en curso</strong> — incluye las compras registradas con fecha en Gestión Económica (gastos variables) más una parte proporcional de tus gastos fijos mensuales (alquiler, personal, suministros...), repartida día a día. Así puedes ver cuánto te está costando el negocio al mismo ritmo que ves las ventas.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">📊 <strong>Comparación de gastos del año</strong> — gráfico con el total de gastos (fijos + variables) de cada uno de los últimos 12 meses, para comparar con el gráfico de ventas y ver si tus costes crecen al mismo ritmo que tu facturación.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📋 <strong>Resultado del mes (P&amp;L)</strong> — facturación, gastos variables, gastos fijos y resultado (beneficio o pérdida) del mes en curso, más el <strong>margen sobre ventas</strong> y el <strong>% Food Cost medio</strong> frente a tu objetivo. Si el resultado está en rojo a mitad de mes no es necesariamente malo, pero conviene vigilar la evolución.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">📉 <strong>Comparación del resultado mensual del año</strong> — gráfico con el resultado (ventas menos gastos) de cada uno de los últimos 12 meses. Las barras en rojo señalan los meses con pérdidas y las naranjas los meses con beneficio, para ver de un vistazo la rentabilidad real mes a mes.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">🥧 <strong>Análisis de ventas (últimos 30 días)</strong> — ticket medio, número de ventas, platos/bebidas más vendidos, platos/bebidas de mayor margen bruto y la distribución de ventas por hora del día. Te dice qué está funcionando ahora mismo y a qué horas se concentra tu facturación.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">⚖️ <strong>Punto de equilibrio</strong> — compara los cubiertos/ventas reales del mes con el mínimo que calculaste en Gestión Económica. Si vas por debajo del objetivo, este es el primer aviso para reaccionar antes de que acabe el mes.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🍽️ <strong>Análisis de Platos</strong> — ranking de los platos y bebidas más y menos vendidos, y más y menos rentables, por el periodo que elijas. Cruza esta información con el Escandallo: un plato o bebida que vende mucho pero deja poco margen es candidato a subir de precio o rediseñar; uno que vende poco y deja mucho margen es candidato a promocionar más.</div></div>

    <h4>Rutina recomendada</h4>
    <p>Cada mañana, antes de abrir:</p>
    <ol>
      <li>Mira las <strong>ventas y gastos de hoy/semana/mes</strong> y compáralos con los gráficos de los últimos 12 meses para saber si vas en línea con lo esperado.</li>
      <li>Revisa el <strong>Resultado del mes</strong> y el <strong>Punto de equilibrio</strong> para saber si vas camino de cubrir gastos o necesitas reaccionar.</li>
      <li>Echa un ojo al <strong>Análisis de Platos</strong> para detectar qué platos o bebidas potenciar o revisar.</li>
    </ol>
    <div class="manual-tip"><i class="ti ti-bulb"></i>En 30 segundos sabes cómo está tu negocio: si las ventas y el resultado van en línea con los meses anteriores y por encima del punto de equilibrio, todo va bien. Si algo destaca en rojo, ahí está tu prioridad del día.</div>`,
    ca:`<h3>Què és i per a què serveix</h3>
    <p>El Panell de Control és la primera pantalla que hauries de mirar cada dia. No hi introdueixes res: simplement reuneix i resumeix dades de tots els altres mòduls (TPV, Gestió Econòmica, Estoc, Reserves, Fitxes Tècniques...) per donar-te, d'un cop d'ull, l'estat de salut del teu negoci. Si només tinguessis un minut al dia per "mirar" l'app, seria aquest.</p>

    <h4>Què hi trobaràs i com interpretar-ho</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">💰 <strong>Vendes avui / últims 7 dies / mes en curs</strong> — el ritme de facturació en temps real, en tres xifres.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">📈 <strong>Comparació de vendes de l'any</strong> — gràfic amb la facturació de cadascun dels últims 12 mesos. T'ajuda a detectar estacionalitat (mesos forts i fluixos) i a veure l'evolució del teu negoci mes a mes.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🧾 <strong>Despeses avui / últims 7 dies / mes en curs</strong> — inclou les compres registrades amb data a Gestió Econòmica (despeses variables) més una part proporcional de les teves despeses fixes mensuals (lloguer, personal, subministraments...), repartida dia a dia. Així pots veure quant et costa el negoci al mateix ritme que veus les vendes.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">📊 <strong>Comparació de despeses de l'any</strong> — gràfic amb el total de despeses (fixes + variables) de cadascun dels últims 12 mesos, per comparar amb el gràfic de vendes i veure si els teus costos creixen al mateix ritme que la teva facturació.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📋 <strong>Resultat del mes (P&amp;L)</strong> — facturació, despeses variables, despeses fixes i resultat (benefici o pèrdua) del mes en curs, més el <strong>marge sobre vendes</strong> i el <strong>% Food Cost mitjà</strong> respecte al teu objectiu. Si el resultat està en vermell a mitja mes no és necessàriament dolent, però convé vigilar l'evolució.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">📉 <strong>Comparació del resultat mensual de l'any</strong> — gràfic amb el resultat (vendes menys despeses) de cadascun dels últims 12 mesos. Les barres en vermell assenyalen els mesos amb pèrdues i les taronges els mesos amb benefici, per veure d'un cop d'ull la rendibilitat real mes a mes.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">🥧 <strong>Anàlisi de vendes (últims 30 dies)</strong> — tiquet mitjà, nombre de vendes, plats/begudes més venuts, plats/begudes de més marge brut i la distribució de vendes per hora del dia. Et diu què funciona ara mateix i a quines hores es concentra la teva facturació.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">⚖️ <strong>Punt d'equilibri</strong> — compara els comensals/vendes reals del mes amb el mínim que vas calcular a Gestió Econòmica. Si vas per sota de l'objectiu, aquest és el primer avís per reaccionar abans que acabi el mes.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🍽️ <strong>Anàlisi de Plats</strong> — rànquing dels plats i begudes més i menys venuts, i més i menys rendibles, pel període que triïs. Creua aquesta informació amb l'Escandall: un plat o beguda que ven molt però deixa poc marge és candidat a pujar de preu o redissenyar; un que ven poc i deixa molt marge és candidat a promocionar més.</div></div>

    <h4>Rutina recomanada</h4>
    <p>Cada matí, abans d'obrir:</p>
    <ol>
      <li>Mira les <strong>vendes i despeses d'avui/setmana/mes</strong> i compara-les amb els gràfics dels últims 12 mesos per saber si vas en línia amb l'esperat.</li>
      <li>Revisa el <strong>Resultat del mes</strong> i el <strong>Punt d'equilibri</strong> per saber si vas camí de cobrir despeses o necessites reaccionar.</li>
      <li>Fes un cop d'ull a l'<strong>Anàlisi de Plats</strong> per detectar quins plats o begudes potenciar o revisar.</li>
    </ol>
    <div class="manual-tip"><i class="ti ti-bulb"></i>En 30 segons saps com està el teu negoci: si les vendes i el resultat van en línia amb els mesos anteriors i per sobre del punt d'equilibri, tot va bé. Si alguna cosa destaca en vermell, aquí tens la teva prioritat del dia.</div>`,
    en:`<h3>What it is and what it's for</h3>
    <p>The Dashboard is the first screen you should check every day. You don't enter anything here: it simply gathers and summarises data from every other module (POS, Financial Management, Stock, Reservations, Technical Sheets...) to give you, at a glance, your business's health status. If you only had one minute a day to "look at" the app, this would be it.</p>

    <h4>What you'll find and how to read it</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">💰 <strong>Sales today / last 7 days / current month</strong> — your real-time revenue pace, in three figures.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">📈 <strong>Yearly sales comparison</strong> — a chart with revenue for each of the last 12 months. It helps you spot seasonality (strong and weak months) and see your business's month-by-month trend.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🧾 <strong>Costs today / last 7 days / current month</strong> — includes purchases logged with a date in Financial Management (variable costs) plus a proportional share of your monthly fixed costs (rent, staff, utilities...), spread out day by day. This lets you see what the business is costing you at the same pace as sales.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">📊 <strong>Yearly cost comparison</strong> — a chart with total costs (fixed + variable) for each of the last 12 months, to compare with the sales chart and see whether your costs are growing at the same pace as revenue.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📋 <strong>Result for the month (P&amp;L)</strong> — revenue, variable costs, fixed costs and result (profit or loss) for the current month, plus the <strong>margin on sales</strong> and the <strong>average Food Cost %</strong> against your target. Being in the red mid-month isn't necessarily bad, but the trend is worth watching.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">📉 <strong>Yearly monthly result comparison</strong> — a chart with the result (sales minus costs) for each of the last 12 months. Red bars flag loss-making months and orange bars profitable ones, so you can see real month-by-month profitability at a glance.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">🥧 <strong>Sales analysis (last 30 days)</strong> — average ticket, number of sales, best-selling dishes/drinks, highest gross-margin dishes/drinks, and the distribution of sales by hour of day. It tells you what's working right now and at what times your revenue is concentrated.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">⚖️ <strong>Break-even point</strong> — compares this month's real covers/sales with the minimum you calculated in Financial Management. If you're below target, this is your first warning to react before the month ends.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🍽️ <strong>Dish Analysis</strong> — ranking of your best and worst-selling, and most and least profitable, dishes and drinks over whatever period you choose. Cross-reference this with Costing: a dish or drink that sells a lot but leaves little margin is a candidate for a price rise or a redesign; one that sells little but leaves a big margin is a candidate to promote more.</div></div>

    <h4>Recommended routine</h4>
    <p>Every morning, before opening:</p>
    <ol>
      <li>Look at <strong>today's/this week's/this month's sales and costs</strong> and compare them with the last 12 months' charts to see if you're on track.</li>
      <li>Check the <strong>Result for the month</strong> and the <strong>Break-even Point</strong> to see whether you're on course to cover costs or need to react.</li>
      <li>Glance at the <strong>Dish Analysis</strong> to spot which dishes or drinks to push or review.</li>
    </ol>
    <div class="manual-tip"><i class="ti ti-bulb"></i>In 30 seconds you know how your business is doing: if sales and results are in line with previous months and above the break-even point, everything's fine. If something stands out in red, that's your priority for the day.</div>`},
  },
  {
    title:{es:'<i class="ti ti-building-store"></i> Mi Negocio', ca:'<i class="ti ti-building-store"></i> El Meu Negoci', en:'<i class="ti ti-building-store"></i> My Business'},
    content:{es:`<h3>Datos del establecimiento</h3>
    <p>Esta sección reúne toda la configuración de tu negocio, organizada en tarjetas. El orden actual es:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">🔒 <strong>Acceso propietario</strong> — cambia el PIN que protege la sección de Gestión.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">🏢 <strong>Datos del negocio</strong> — identidad (logo, nombre, propietario, tipo, año), descripción, contacto y redes sociales. Aquí está el botón <strong>Guardar todo</strong>, que guarda los datos de todas las tarjetas de esta pantalla a la vez.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🏬 <strong>Operativa</strong> — aforo por turno y número de mesas de interior, exterior/terraza y barra.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">🔁 <strong>Tipos de servicio</strong> — activa/desactiva Mesa, Take Away y Delivery.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📅 <strong>Horario de apertura</strong> — horario general del negocio, configurable día por día.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">🧾 <strong>Configuración del ticket</strong> — datos que aparecen impresos en los tickets.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">💳 <strong>TPV virtual</strong> — cobro online con tarjeta (Redsys).</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">🥡 <strong>Pedidos para llevar/domicilio</strong> — antelación, coste de envío y zona de reparto.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🛵 <strong>Plataformas de delivery y repartidores propios</strong> — Glovo, Uber Eats, Just Eat... con su comisión, y tu propio equipo de reparto.</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st">📱 <strong>Reserva y pedidos online</strong> — enlace y QR para que tus clientes reserven o pidan desde el móvil.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st">🔳 <strong>QR auto pedido</strong> — un botón con QR por cada mesa configurada.</div></div>
    <div class="manual-step"><div class="sn">12</div><div class="st">🗄️ <strong>Mantenimiento de datos</strong> — copias de seguridad y archivado.</div></div>

    <h4>🔒 Acceso propietario (PIN)</h4>
    <p>Toda la sección de Gestión está protegida por PIN (por defecto <strong>1234</strong>). La primera vez que entres se te pedirá crear un PIN nuevo. Después puedes cambiarlo desde aquí. Usa el botón <strong>Bloquear</strong> de la cabecera para volver a cerrar el acceso.</p>

    <h4>🏢 Datos del negocio</h4>
    <p>Es la tarjeta principal con toda la información de identidad y contacto, dividida en cuatro bloques:</p>
    <ul>
      <li><strong>Identidad</strong> — logo, nombre del negocio, <strong>propietario</strong>, tipo de negocio y año de apertura.</li>
      <li><strong>Descripción</strong> — el concepto de tu local (aparece en la web de pedidos online).</li>
      <li><strong>Contacto</strong> — dirección, teléfono, email, web y CIF/NIF.</li>
      <li><strong>Redes sociales</strong> — Instagram y Facebook.</li>
    </ul>
    <p>Al final de esta tarjeta está el botón <strong>Guardar todo</strong>, que guarda los cambios de <em>todas</em> las tarjetas de Mi Negocio a la vez.</p>

    <h4>🏬 Operativa</h4>
    <p>Aquí defines la capacidad y distribución física de tu local:</p>
    <ul>
      <li><strong>Aforo (plazas por turno)</strong> — número máximo de comensales que puedes atender en cada turno de comida/cena. Se usa en Reservas para avisarte si un turno se llena.</li>
      <li><strong>Mesas de interior</strong>, <strong>mesas de exterior/terraza</strong> y <strong>mesas/taburetes de barra</strong> — indica cuántas tienes de cada tipo.</li>
    </ul>
    <p>Estas tres cantidades son las que verás organizadas por zonas (<strong>Interior</strong>, <strong>Terraza</strong>, <strong>Barra</strong>) en el plano de mesas del TPV.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i><strong>Crear mesas automáticamente</strong>: crea las mesas que falten hasta llegar a las cantidades indicadas. Después, en la lista <strong>"Mesas configuradas"</strong> de más abajo puedes <strong>ponerle a cada mesa el nombre o número que quieras</strong>, cambiarle la zona, o añadir/eliminar mesas una a una. Esas mesas son exactamente las que aparecen en el TPV, en las reservas y en los QR de auto-pedido (un QR por mesa).</div>

    <h4>🖨️ Comandas de cocina y sala</h4>
    <p>Elige cómo recibe el equipo las comandas al marchar: <strong>verlas en pantalla</strong> (la pantalla de Cocina/Sala) o <strong>imprimir un vale</strong> automáticamente (un vale de cocina con la comida y otro de sala/barra con las bebidas). Si eliges imprimir, indica el ancho del papel (58 u 80 mm) y usa "Imprimir vale de prueba". La impresora concreta se elige en el cuadro de impresión del navegador/sistema; si tienes una impresora térmica de tickets, configúrala como impresora del dispositivo.</p>

    <h4>🔁 Tipos de servicio</h4>
    <p>Activa o desactiva con las casillas los servicios que ofreces: <strong>Mesa/Sala</strong>, <strong>Take Away</strong> y <strong>Delivery</strong>. Esto controla qué botones y opciones aparecen en el TPV y en la página de pedidos online (por ejemplo, si desactivas Delivery, tus clientes ya no podrán elegir esa opción al pedir desde el móvil). <strong>Cada cambio se guarda al instante</strong> al marcar/desmarcar (debe quedar al menos un servicio activo).</p>

    <h4>📅 Horario de apertura</h4>
    <p>Es el horario general de tu negocio, configurado <strong>día por día</strong> porque no todos los días tienen por qué ser iguales. Para cada día de la semana (<strong>Lunes a Domingo</strong>), primero decides si ese día abres (casilla) y luego eliges el <strong>modo de horario</strong>:</p>
    <ul>
      <li><strong>Horario seguido</strong> — un único tramo (apertura y cierre), por ejemplo si tu local abre sin descanso de 12:00 a 00:00.</li>
      <li><strong>Por turnos</strong> — hasta dos tramos (ej. comidas de 12:00 a 16:00 y cenas de 20:00 a 23:30), típico del horario partido. Si un día tienes horario partido, rellena también el "Turno 2".</li>
    </ul>
    <p>Marca como <strong>cerrado</strong> los días que no abras.</p>
    <p>Este horario tiene dos usos:</p>
    <ul>
      <li>Calcula el <strong>aforo disponible por turno</strong> en Reservas (cuántas personas hay reservadas frente al máximo de cada turno).</li>
      <li>Limita las horas que tus clientes pueden elegir al <strong>reservar mesa</strong> o hacer un <strong>pedido para llevar/domicilio</strong> online: solo podrán elegir horas dentro de los tramos que hayas abierto aquí.</li>
    </ul>
    <p>Dentro de cada franja horaria, la <strong>carta concreta</strong> que verán tus clientes (tanto en el TPV como en los pedidos online) es la que tengas marcada como <strong>disponible</strong> en cada momento desde la sección <strong>Carta</strong> — ahí decides qué platos y cartas están activos en cada horario, sin tener que repetir esa configuración aquí.</p>

    <h4>🛵 Plataformas de delivery y repartidores propios</h4>
    <p>Si trabajas con apps como Glovo, Uber Eats o Just Eat, añádelas en <strong>Plataformas de delivery</strong> con la comisión que te cobran: así, cuando registres una venta de delivery a través de esa plataforma, esa comisión se restará automáticamente como gasto en Gestión Económica.</p>
    <p>Si además (o en su lugar) repartes los pedidos a domicilio con tu <strong>propio personal</strong>, usa la sección <strong>Repartidores propios</strong> para anotar a tus repartidores (nombre y teléfono). Tendrás un acceso directo por <strong>WhatsApp</strong> para localizarlos rápido y coordinar quién lleva cada pedido.</p>

    <h4>📱 Reserva y pedidos online</h4>
    <p>Con la licencia y la nube activadas, esta tarjeta te da el <strong>enlace público</strong> y el <strong>código QR</strong> general de tu negocio para que los clientes reserven mesa o pidan take away/delivery desde el móvil.</p>

    <h4>🔳 QR auto pedido</h4>
    <p>Muestra un botón pequeño por cada <strong>mesa</strong> que hayas configurado en Operativa (interior, exterior/terraza y barra). Al pulsar sobre el nombre de una mesa (ej. "Mesa 3 (Interior)" o "Barra 1") se abre su <strong>código QR</strong>, listo para descargar e imprimir. Cuando un cliente lo escanea desde esa mesa, el pedido que haga llegará directamente asignado a ese número de mesa en el TPV, sin pasar por la bandeja de pedidos pendientes.</p>`,
    ca:`<h3>Dades de l'establiment</h3>
    <p>Aquesta secció reuneix tota la configuració del teu negoci, organitzada en targetes. L'ordre actual és:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">🔒 <strong>Accés propietari</strong> — canvia el PIN que protegeix la secció de Gestió.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">🏢 <strong>Dades del negoci</strong> — identitat (logo, nom, propietari, tipus, any), descripció, contacte i xarxes socials. Aquí hi ha el botó <strong>Desar-ho tot</strong>, que desa les dades de totes les targetes d'aquesta pantalla de cop.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🏬 <strong>Operativa</strong> — aforament per torn i nombre de taules d'interior, exterior/terrassa i barra.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">🔁 <strong>Tipus de servei</strong> — activa/desactiva Taula, Take Away i Delivery.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📅 <strong>Horari d'obertura</strong> — horari general del negoci, configurable dia per dia.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">🧾 <strong>Configuració del tiquet</strong> — dades que apareixen impreses als tiquets.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">💳 <strong>TPV virtual</strong> — cobrament en línia amb targeta (Redsys).</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">🥡 <strong>Comandes per emportar/domicili</strong> — antelació, cost d'enviament i zona de repartiment.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🛵 <strong>Plataformes de delivery i repartidors propis</strong> — Glovo, Uber Eats, Just Eat... amb la seva comissió, i el teu propi equip de repartiment.</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st">📱 <strong>Reserva i comandes en línia</strong> — enllaç i QR perquè els teus clients reservin o demanin des del mòbil.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st">🔳 <strong>QR autocomanda</strong> — un botó amb QR per cada taula configurada.</div></div>
    <div class="manual-step"><div class="sn">12</div><div class="st">🗄️ <strong>Manteniment de dades</strong> — còpies de seguretat i arxivament.</div></div>

    <h4>🔒 Accés propietari (PIN)</h4>
    <p>Tota la secció de Gestió està protegida per PIN (per defecte <strong>1234</strong>). La primera vegada que hi entris se't demanarà crear un PIN nou. Després el pots canviar des d'aquí. Fes servir el botó <strong>Bloquejar</strong> de la capçalera per tornar a tancar l'accés.</p>

    <h4>🏢 Dades del negoci</h4>
    <p>És la targeta principal amb tota la informació d'identitat i contacte, dividida en quatre blocs:</p>
    <ul>
      <li><strong>Identitat</strong> — logo, nom del negoci, <strong>propietari</strong>, tipus de negoci i any d'obertura.</li>
      <li><strong>Descripció</strong> — el concepte del teu local (apareix a la web de comandes en línia).</li>
      <li><strong>Contacte</strong> — adreça, telèfon, email, web i CIF/NIF.</li>
      <li><strong>Xarxes socials</strong> — Instagram i Facebook.</li>
    </ul>
    <p>Al final d'aquesta targeta hi ha el botó <strong>Desar-ho tot</strong>, que desa els canvis de <em>totes</em> les targetes d'El Meu Negoci de cop.</p>

    <h4>🏬 Operativa</h4>
    <p>Aquí defineixes la capacitat i distribució física del teu local:</p>
    <ul>
      <li><strong>Aforament (places per torn)</strong> — nombre màxim de comensals que pots atendre en cada torn de dinar/sopar. S'utilitza a Reserves per avisar-te si un torn s'omple.</li>
      <li><strong>Taules d'interior</strong>, <strong>taules d'exterior/terrassa</strong> i <strong>taules/tamborets de barra</strong> — indica quantes tens de cada tipus.</li>
    </ul>
    <p>Aquestes tres quantitats són les que veuràs organitzades per zones (<strong>Interior</strong>, <strong>Terrassa</strong>, <strong>Barra</strong>) al plànol de taules del TPV.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i><strong>Crear taules automàticament</strong>: crea les taules que faltin fins arribar a les quantitats indicades. Després, a la llista <strong>"Taules configurades"</strong> de més avall pots <strong>posar a cada taula el nom o número que vulguis</strong>, canviar-li la zona, o afegir/eliminar taules una a una. Aquestes taules són exactament les que apareixen al TPV, a les reserves i als QR d'autocomanda (un QR per taula).</div>

    <h4>🖨️ Comandes de cuina i sala</h4>
    <p>Tria com rep l'equip les comandes en marxar: <strong>veure-les en pantalla</strong> (la pantalla de Cuina/Sala) o <strong>imprimir un val</strong> automàticament (un val de cuina amb el menjar i un altre de sala/barra amb les begudes). Si tries imprimir, indica l'amplada del paper (58 o 80 mm) i fes servir "Imprimir val de prova". La impressora concreta es tria al quadre d'impressió del navegador/sistema; si tens una impressora tèrmica de tiquets, configura-la com a impressora del dispositiu.</p>

    <h4>🔁 Tipus de servei</h4>
    <p>Activa o desactiva amb les caselles els serveis que ofereixes: <strong>Taula/Sala</strong>, <strong>Take Away</strong> i <strong>Delivery</strong>. Això controla quins botons i opcions apareixen al TPV i a la pàgina de comandes en línia (per exemple, si desactives Delivery, els teus clients ja no podran triar aquesta opció en demanar des del mòbil). <strong>Cada canvi es desa a l'instant</strong> en marcar/desmarcar (n'ha de quedar almenys un d'actiu).</p>

    <h4>📅 Horari d'obertura</h4>
    <p>És l'horari general del teu negoci, configurat <strong>dia per dia</strong> perquè no tots els dies han de ser iguals. Per a cada dia de la setmana (<strong>Dilluns a Diumenge</strong>), primer decideixes si aquell dia obres (casella) i després tries el <strong>mode d'horari</strong>:</p>
    <ul>
      <li><strong>Horari seguit</strong> — un únic tram (obertura i tancament), per exemple si el teu local obre sense descans de 12:00 a 00:00.</li>
      <li><strong>Per torns</strong> — fins a dos trams (ex. dinars de 12:00 a 16:00 i sopars de 20:00 a 23:30), típic de l'horari partit. Si un dia tens horari partit, emplena també el "Torn 2".</li>
    </ul>
    <p>Marca com a <strong>tancat</strong> els dies que no obris.</p>
    <p>Aquest horari té dos usos:</p>
    <ul>
      <li>Calcula l'<strong>aforament disponible per torn</strong> a Reserves (quantes persones hi ha reservades enfront del màxim de cada torn).</li>
      <li>Limita les hores que els teus clients poden triar en <strong>reservar taula</strong> o fer una <strong>comanda per emportar/domicili</strong> en línia: només podran triar hores dins dels trams que hagis obert aquí.</li>
    </ul>
    <p>Dins de cada franja horària, la <strong>carta concreta</strong> que veuran els teus clients (tant al TPV com a les comandes en línia) és la que tinguis marcada com a <strong>disponible</strong> en cada moment des de la secció <strong>Carta</strong> — allà decideixes quins plats i cartes estan actius en cada horari, sense haver de repetir aquesta configuració aquí.</p>

    <h4>🛵 Plataformes de delivery i repartidors propis</h4>
    <p>Si treballes amb apps com Glovo, Uber Eats o Just Eat, afegeix-les a <strong>Plataformes de delivery</strong> amb la comissió que et cobren: així, quan registris una venda de delivery a través d'aquella plataforma, aquella comissió es restarà automàticament com a despesa a Gestió Econòmica.</p>
    <p>Si a més (o en lloc d'això) reparteixes les comandes a domicili amb el teu <strong>propi personal</strong>, fes servir la secció <strong>Repartidors propis</strong> per anotar els teus repartidors (nom i telèfon). Tindràs un accés directe per <strong>WhatsApp</strong> per localitzar-los ràpid i coordinar qui porta cada comanda.</p>

    <h4>📱 Reserva i comandes en línia</h4>
    <p>Amb la llicència i el núvol activats, aquesta targeta et dona l'<strong>enllaç públic</strong> i el <strong>codi QR</strong> general del teu negoci perquè els clients reservin taula o demanin take away/delivery des del mòbil.</p>

    <h4>🔳 QR autocomanda</h4>
    <p>Mostra un botó petit per cada <strong>taula</strong> que hagis configurat a Operativa (interior, exterior/terrassa i barra). En prémer sobre el nom d'una taula (ex. "Taula 3 (Interior)" o "Barra 1") s'obre el seu <strong>codi QR</strong>, a punt per descarregar i imprimir. Quan un client l'escaneja des d'aquella taula, la comanda que faci arribarà directament assignada a aquell número de taula al TPV, sense passar per la safata de comandes pendents.</p>`,
    en:`<h3>Business details</h3>
    <p>This section brings together your entire business configuration, organised into cards. The current order is:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">🔒 <strong>Owner access</strong> — change the PIN that protects the Management section.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">🏢 <strong>Business details</strong> — identity (logo, name, owner, type, year), description, contact and social media. This is where the <strong>Save all</strong> button lives, which saves every card on this screen at once.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🏬 <strong>Operations</strong> — capacity per time slot and number of indoor, outdoor/terrace and bar tables.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">🔁 <strong>Service types</strong> — enable/disable Table, Take Away and Delivery.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📅 <strong>Opening hours</strong> — the business's general schedule, configurable day by day.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">🧾 <strong>Receipt settings</strong> — the details printed on receipts.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">💳 <strong>Virtual POS</strong> — online card payment (Redsys).</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">🥡 <strong>Take away/delivery orders</strong> — lead time, delivery fee and delivery zone.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🛵 <strong>Delivery platforms and in-house couriers</strong> — Glovo, Uber Eats, Just Eat... with their commission, and your own delivery team.</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st">📱 <strong>Reservations and online ordering</strong> — the link and QR code for customers to book or order from their phone.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st">🔳 <strong>Table self-order QR</strong> — one QR button per configured table.</div></div>
    <div class="manual-step"><div class="sn">12</div><div class="st">🗄️ <strong>Data maintenance</strong> — backups and archiving.</div></div>

    <h4>🔒 Owner access (PIN)</h4>
    <p>The whole Management section is PIN-protected (default <strong>1234</strong>). The first time you enter you'll be asked to create a new PIN. You can change it here afterwards. Use the header's <strong>Lock</strong> button to close access again.</p>

    <h4>🏢 Business details</h4>
    <p>This is the main card with all your identity and contact information, split into four blocks:</p>
    <ul>
      <li><strong>Identity</strong> — logo, business name, <strong>owner</strong>, business type and year opened.</li>
      <li><strong>Description</strong> — your venue's concept (shown on the online ordering website).</li>
      <li><strong>Contact</strong> — address, phone, email, website and tax ID.</li>
      <li><strong>Social media</strong> — Instagram and Facebook.</li>
    </ul>
    <p>At the bottom of this card is the <strong>Save all</strong> button, which saves changes across <em>every</em> card in My Business at once.</p>

    <h4>🏬 Operations</h4>
    <p>Here you define your venue's physical capacity and layout:</p>
    <ul>
      <li><strong>Capacity (seats per slot)</strong> — the maximum number of guests you can serve in each lunch/dinner slot. Used in Reservations to warn you when a slot is filling up.</li>
      <li><strong>Indoor tables</strong>, <strong>outdoor/terrace tables</strong> and <strong>bar tables/stools</strong> — enter how many you have of each.</li>
    </ul>
    <p>These three numbers are what you'll see organised by zone (<strong>Indoor</strong>, <strong>Terrace</strong>, <strong>Bar</strong>) on the POS's table plan.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i><strong>Create tables automatically</strong>: creates whatever tables are missing to reach the stated numbers. Afterwards, in the <strong>"Configured tables"</strong> list below, you can <strong>give each table whatever name or number you like</strong>, change its zone, or add/remove tables one by one. These tables are exactly the ones that show up in the POS, in reservations and on the self-order QR codes (one QR per table).</div>

    <h4>🖨️ Kitchen and floor tickets</h4>
    <p>Choose how the team receives orders when fired: <strong>viewing them on screen</strong> (the Kitchen/Floor screen) or <strong>automatically printing a ticket</strong> (one kitchen ticket with the food and a separate floor/bar ticket with the drinks). If you choose printing, set the paper width (58 or 80 mm) and use "Print test ticket". The specific printer is chosen in your browser/system's print dialog; if you have a thermal receipt printer, set it up as your device's printer.</p>

    <h4>🔁 Service types</h4>
    <p>Enable or disable, with the checkboxes, the services you offer: <strong>Table/Floor</strong>, <strong>Take Away</strong> and <strong>Delivery</strong>. This controls which buttons and options show up in the POS and on the online ordering page (for example, if you disable Delivery, your customers will no longer be able to choose that option when ordering from their phone). <strong>Every change saves instantly</strong> as you check/uncheck (at least one service must stay active).</p>

    <h4>📅 Opening hours</h4>
    <p>This is your business's general schedule, configured <strong>day by day</strong> because not every day has to be the same. For each day of the week (<strong>Monday to Sunday</strong>), you first decide whether you open that day (checkbox) and then choose the <strong>schedule mode</strong>:</p>
    <ul>
      <li><strong>Continuous hours</strong> — a single block (opening and closing), for example if your venue runs non-stop from 12:00 to midnight.</li>
      <li><strong>By shift</strong> — up to two blocks (e.g. lunch 12:00-16:00 and dinner 20:00-23:30), typical of split hours. If a day has split hours, also fill in "Slot 2".</li>
    </ul>
    <p>Mark as <strong>closed</strong> the days you don't open.</p>
    <p>This schedule serves two purposes:</p>
    <ul>
      <li>It calculates the <strong>available capacity per slot</strong> in Reservations (how many people are booked against each slot's maximum).</li>
      <li>It limits the times customers can choose when <strong>booking a table</strong> or placing a <strong>take-away/delivery order</strong> online: they'll only be able to pick times within the hours you've opened here.</li>
    </ul>
    <p>Within each time slot, the <strong>specific menu</strong> your customers see (both in the POS and in online orders) is whichever one you have marked as <strong>available</strong> at that moment from the <strong>Menu</strong> section — that's where you decide which dishes and menus are active at each time, without having to repeat that setup here.</p>

    <h4>🛵 Delivery platforms and in-house couriers</h4>
    <p>If you work with apps like Glovo, Uber Eats or Just Eat, add them under <strong>Delivery platforms</strong> with the commission they charge you: that way, when you log a delivery sale through that platform, the commission is automatically deducted as an expense in Financial Management.</p>
    <p>If you also (or instead) deliver orders with your <strong>own staff</strong>, use the <strong>In-house couriers</strong> section to note down your delivery riders (name and phone). You'll get a direct <strong>WhatsApp</strong> link to reach them quickly and coordinate who's carrying each order.</p>

    <h4>📱 Reservations and online ordering</h4>
    <p>With the licence and cloud enabled, this card gives you your business's general <strong>public link</strong> and <strong>QR code</strong> so customers can book a table or order take away/delivery from their phone.</p>

    <h4>🔳 Table self-order QR</h4>
    <p>Shows a small button for every <strong>table</strong> you've set up in Operations (indoor, outdoor/terrace and bar). Tapping a table's name (e.g. "Table 3 (Indoor)" or "Bar 1") opens its <strong>QR code</strong>, ready to download and print. When a customer scans it from that table, whatever they order arrives in the POS directly assigned to that table number, without going through the pending-orders tray.</p>`},
  },
  {
    title:{es:'<i class="ti ti-world"></i> Reservas y Pedidos Online', ca:'<i class="ti ti-world"></i> Reserves i Comandes en Línia', en:'<i class="ti ti-world"></i> Online Reservations and Ordering'},
    content:{es:`<h3>Tu web pública para clientes</h3>
    <p>GastroGoan genera automáticamente una página web (y un código QR) donde tus clientes pueden reservar mesa o hacer pedidos para recoger/delivery, sin que tengas que programar nada.</p>
    <h4>Activar la nube</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Ve a <strong>Mi Negocio</strong> y activa tu licencia de GastroGoan (te conecta a la nube compartida).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Una vez activada, en <strong>Mi Negocio</strong> aparece tu <strong>enlace público</strong> y un <strong>código QR</strong>. Compártelos con tus clientes (en mesas, carta, redes sociales...).</div></div>
    <h4>Para que aparezca la carta en pedidos online</h4>
    <ul>
      <li>En <strong>TPV</strong>, selecciona la carta que quieres usar como <strong>carta activa</strong>.</li>
      <li>En esa carta, marca cada plato como <strong>Disponible</strong> (en la sección Carta).</li>
      <li>Si no hay carta activa o ningún plato disponible, los clientes verán el aviso "La carta no está disponible para pedidos online".</li>
    </ul>
    <h4>Horario de reservas y pedidos</h4>
    <p>En <strong>Mi Negocio</strong>, configura el <strong>Horario de apertura</strong> (día por día, con turnos). La web de reservas y pedidos solo permitirá elegir fecha/hora dentro de tu horario de ese día. Si no configuras ningún horario, no se aplica ningún límite.</p>
    <h4>Solicitudes de clientes</h4>
    <p>Las reservas y pedidos que hagan los clientes desde la web pública se aceptan solos: las reservas se confirman con mesa asignada automáticamente (solo se quedan en <strong>Reservas → Solicitudes online pendientes</strong> si ningún hueco encaja), y los pedidos de Take Away/Delivery pasan a cocina sin intervención mientras el interruptor de <strong>TPV → Pedidos online</strong> esté en ON.</p>
    <h4>Aforo por turno</h4>
    <p>En <strong>Mi Negocio</strong> indica tu <strong>Aforo (plazas por turno)</strong>: el número máximo de comensales que puedes atender en cada turno de comida/cena (según tu Horario de apertura).</p>
    <ul>
      <li>En <strong>Reservas → vista del día</strong> verás, para cada turno, cuántas personas hay reservadas frente al aforo (verde = hay sitio, ámbar = cerca del límite, rojo = aforo completo)</li>
      <li>Si al crear o confirmar una reserva se supera el aforo del turno, la app te avisa con los números exactos y te pregunta si quieres confirmarla igualmente (por ejemplo, si puedes habilitar mesas extra)</li>
      <li>En la <strong>web pública de reservas</strong>, si un turno ya está completo, el cliente recibe un aviso para elegir otro horario, reducir comensales o llamar al restaurante — así evitas sobre-reservas automáticas</li>
    </ul>
    <h4>Formas de pago en pedidos online</h4>
    <p>En <strong>Mi Negocio → Pedidos</strong> marcas qué formas de pago aceptas para pedidos a domicilio/para llevar: <strong>Efectivo</strong>, <strong>Tarjeta</strong> (datáfono al entregar/recoger) y <strong>TPV virtual</strong> (pagar ya online con tarjeta — necesita tener el TPV virtual configurado en su propia tarjeta de esa pantalla, si no la casilla queda bloqueada). Si aceptas varias, el cliente elige en el propio pedido; si solo aceptas una, se la fija sin preguntarle. Para pedidos <strong>a domicilio</strong> pagados en efectivo, se le pregunta al cliente con qué billete va a pagar, y ese dato llega ya relleno a la tarjeta de reparto del TPV: el cambio a preparar sale calculado solo, sin que nadie tenga que preguntarlo por teléfono.</p>
    <h4>Límites de pedidos</h4>
    <ul>
      <li><strong>Pedido mínimo</strong>: importe mínimo para poder pedir online.</li>
      <li><strong>Máx. pedidos por franja de 30 min</strong>: para no saturar la cocina en hora punta, pon 0 para no limitar.</li>
      <li><strong>Dejar de aceptar pedidos X min antes del cierre</strong>: por ejemplo, si cierras a las 23:00 y pones 60, el último pedido posible para esa franja es a las 22:00. La web pública avisa al cliente de esa hora límite antes de que intente enviar el pedido.</li>
    </ul>
    <h4>Tiempo estimado de preparación</h4>
    <p>La web pública muestra al cliente "tu pedido debería estar listo en unos X min", calculado en tiempo real según cuántos pedidos hay ahora mismo en cocina sin terminar — no un número fijo. La fórmula (tiempo base + minutos extra por cada pedido en cola, con un máximo) se ajusta en <strong>Mi Negocio → Pedidos</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Tras cambiar datos importantes (carta, disponibilidad, horarios, aforo o reservas), espera unos segundos: los cambios se sincronizan automáticamente con la web pública.</div>`,
    ca:`<h3>La teva web pública per a clients</h3>
    <p>GastroGoan genera automàticament una pàgina web (i un codi QR) on els teus clients poden reservar taula o fer comandes per recollir/delivery, sense que hagis de programar res.</p>
    <h4>Activar el núvol</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Vés a <strong>El Meu Negoci</strong> i activa la teva llicència de GastroGoan (et connecta al núvol compartit).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Un cop activada, a <strong>El Meu Negoci</strong> apareix el teu <strong>enllaç públic</strong> i un <strong>codi QR</strong>. Comparteix-los amb els teus clients (a les taules, a la carta, a les xarxes socials...).</div></div>
    <h4>Perquè aparegui la carta a les comandes en línia</h4>
    <ul>
      <li>Al <strong>TPV</strong>, selecciona la carta que vols fer servir com a <strong>carta activa</strong>.</li>
      <li>En aquella carta, marca cada plat com a <strong>Disponible</strong> (a la secció Carta).</li>
      <li>Si no hi ha carta activa o cap plat disponible, els clients veuran l'avís "La carta no està disponible per a comandes en línia".</li>
    </ul>
    <h4>Horari de reserves i comandes</h4>
    <p>A <strong>El Meu Negoci</strong>, configura l'<strong>Horari d'obertura</strong> (dia per dia, amb torns). La web de reserves i comandes només permetrà triar data/hora dins del teu horari d'aquell dia. Si no configures cap horari, no s'aplica cap límit.</p>
    <h4>Sol·licituds de clients</h4>
    <p>Les reserves i comandes que facin els clients des de la web pública s'accepten soles: les reserves es confirmen amb taula assignada automàticament (només es queden a <strong>Reserves → Sol·licituds en línia pendents</strong> si cap taula encaixa), i les comandes de Take Away/Delivery passen a cuina sense intervenció mentre l'interruptor de <strong>TPV → Comandes online</strong> estigui en ON.</p>
    <h4>Aforament per torn</h4>
    <p>A <strong>El Meu Negoci</strong> indica el teu <strong>Aforament (places per torn)</strong>: el nombre màxim de comensals que pots atendre en cada torn de dinar/sopar (segons el teu Horari d'obertura).</p>
    <ul>
      <li>A <strong>Reserves → vista del dia</strong> veuràs, per a cada torn, quantes persones hi ha reservades enfront de l'aforament (verd = hi ha lloc, ambre = a prop del límit, vermell = aforament complet)</li>
      <li>Si en crear o confirmar una reserva se supera l'aforament del torn, l'app t'avisa amb els números exactes i et pregunta si la vols confirmar igualment (per exemple, si pots habilitar taules extra)</li>
      <li>A la <strong>web pública de reserves</strong>, si un torn ja està complet, el client rep un avís per triar un altre horari, reduir comensals o trucar al restaurant — així evites sobrereserves automàtiques</li>
    </ul>
    <h4>Formes de pagament en comandes en línia</h4>
    <p>A <strong>El Meu Negoci → Comandes</strong> marques quines formes de pagament acceptes per a comandes a domicili/per emportar: <strong>Efectiu</strong>, <strong>Targeta</strong> (datàfon en entregar/recollir) i <strong>TPV virtual</strong> (pagar ja en línia amb targeta — necessita tenir el TPV virtual configurat a la seva pròpia targeta d'aquesta pantalla, si no la casella queda bloquejada). Si n'acceptes diverses, el client tria a la mateixa comanda; si només n'acceptes una, se li fixa sense preguntar-li. Per a comandes <strong>a domicili</strong> pagades en efectiu, es pregunta al client amb quin bitllet pagarà, i aquesta dada arriba ja emplenada a la targeta de repartiment del TPV: el canvi a preparar surt calculat sol, sense que ningú l'hagi de preguntar per telèfon.</p>
    <h4>Límits de comandes</h4>
    <ul>
      <li><strong>Comanda mínima</strong>: import mínim per poder demanar en línia.</li>
      <li><strong>Màx. comandes per franja de 30 min</strong>: per no saturar la cuina en hora punta, posa 0 per no limitar.</li>
      <li><strong>Deixar d'acceptar comandes X min abans del tancament</strong>: per exemple, si tanques a les 23:00 i poses 60, l'última comanda possible per a aquesta franja és a les 22:00. La web pública avisa el client d'aquesta hora límit abans que intenti enviar la comanda.</li>
    </ul>
    <h4>Temps estimat de preparació</h4>
    <p>La web pública mostra al client "la teva comanda hauria d'estar llesta en uns X min", calculat en temps real segons quantes comandes hi ha ara mateix a cuina sense acabar — no un número fix. La fórmula (temps base + minuts extra per cada comanda en cua, amb un màxim) s'ajusta a <strong>El Meu Negoci → Comandes</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>Després de canviar dades importants (carta, disponibilitat, horaris, aforament o reserves), espera uns segons: els canvis se sincronitzen automàticament amb la web pública.</div>`,
    en:`<h3>Your public website for customers</h3>
    <p>GastroGoan automatically generates a website (and a QR code) where your customers can book a table or place pickup/delivery orders, with nothing for you to build.</p>
    <h4>Activating the cloud</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>My Business</strong> and activate your GastroGoan licence (it connects you to the shared cloud).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Once activated, your <strong>public link</strong> and a <strong>QR code</strong> appear in <strong>My Business</strong>. Share them with your customers (on tables, on the menu, on social media...).</div></div>
    <h4>Getting the menu to show up in online orders</h4>
    <ul>
      <li>In the <strong>POS</strong>, select the menu you want to use as the <strong>active menu</strong>.</li>
      <li>In that menu, mark each dish as <strong>Available</strong> (in the Menu section).</li>
      <li>If there's no active menu or no dish is available, customers will see the message "The menu isn't available for online orders".</li>
    </ul>
    <h4>Reservation and ordering hours</h4>
    <p>In <strong>My Business</strong>, set up the <strong>Opening hours</strong> (day by day, with time slots). The reservations and ordering website will only allow choosing a date/time within that day's hours. If you don't set any schedule, no limit is applied.</p>
    <h4>Customer requests</h4>
    <p>Reservations and orders customers place from the public website get accepted on their own: reservations get confirmed with a table assigned automatically (they only sit in <strong>Reservations → Pending online requests</strong> if no table fits), and Take Away/Delivery orders go straight to the kitchen with no intervention needed while the <strong>POS → Online orders</strong> switch is ON.</p>
    <h4>Capacity per time slot</h4>
    <p>In <strong>My Business</strong>, set your <strong>Capacity (seats per slot)</strong>: the maximum number of guests you can serve in each lunch/dinner slot (based on your Opening hours).</p>
    <ul>
      <li>In <strong>Reservations → day view</strong> you'll see, for each slot, how many people are booked against capacity (green = room available, amber = close to the limit, red = full)</li>
      <li>If creating or confirming a reservation would exceed a slot's capacity, the app warns you with the exact numbers and asks whether you want to confirm it anyway (for example, if you can open up extra tables)</li>
      <li>On the <strong>public reservations website</strong>, if a slot is already full, the customer is prompted to choose another time, reduce the party size, or call the restaurant — this way you avoid automatic overbooking</li>
    </ul>
    <h4>Payment methods on online orders</h4>
    <p>In <strong>My Business → Orders</strong>, choose which payment methods you accept for delivery/takeaway orders: <strong>Cash</strong>, <strong>Card</strong> (reader on delivery/pickup) and <strong>Virtual POS</strong> (pay now online by card — needs the virtual POS configured in its own card on that screen, otherwise the checkbox stays locked). If you accept several, the customer picks one on the order itself; if you only accept one, it's fixed without asking. For <strong>delivery</strong> orders paid in cash, the customer is asked what bill they'll pay with, and that reaches the POS delivery card already filled in: the change to prepare is worked out automatically, with nobody having to ask over the phone.</p>
    <h4>Order limits</h4>
    <ul>
      <li><strong>Minimum order</strong>: minimum amount to order online.</li>
      <li><strong>Max. orders per 30-min slot</strong>: to avoid overloading the kitchen at peak times, set to 0 for no limit.</li>
      <li><strong>Stop accepting orders X min before closing</strong>: for example, if you close at 23:00 and set 60, the last possible order for that slot is 22:00. The public site warns the customer of that cutoff time before they try to send the order.</li>
    </ul>
    <h4>Estimated prep time</h4>
    <p>The public site shows the customer "your order should be ready in about X min", calculated in real time from how many orders are currently unfinished in the kitchen — not a fixed number. The formula (base time + extra minutes per order in the queue, with a cap) is adjusted in <strong>My Business → Orders</strong>.</p>
    <div class="manual-tip"><i class="ti ti-bulb"></i>After changing important data (menu, availability, hours, capacity or reservations), wait a few seconds: changes sync automatically with the public website.</div>`},
  },
];

let manualSearch = '';
function setManualSearch(val){
  manualSearch = val;
  const el = document.getElementById('manual-search-input');
  const pos = el ? el.selectionStart : null;
  renderManual();
  const newEl = document.getElementById('manual-search-input');
  if(newEl && pos != null){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
}
// El título/contenido de cada capítulo es un {es,ca,en}; el valor de cada
// idioma puede ser directamente el HTML o una función (para el único
// capítulo que depende de lastArea). Si el idioma actual no existe (no
// debería pasar), se cae a español.
function manualChapterTitle(ch){
  const lang = getLang();
  const raw = ch.title[lang] !== undefined ? ch.title[lang] : ch.title.es;
  return typeof raw === 'function' ? raw() : raw;
}
function manualChapterText(ch){
  const lang = getLang();
  const raw = ch.content[lang] !== undefined ? ch.content[lang] : ch.content.es;
  return typeof raw === 'function' ? raw() : raw;
}
// Busca en el título y en el texto (sin etiquetas HTML) de cada capítulo,
// no solo en los títulos de la lista lateral.
function manualChapterMatches(ch, q){
  if(!q) return true;
  if(manualChapterTitle(ch).toLowerCase().includes(q)) return true;
  const plain = manualChapterText(ch).replace(/<[^>]+>/g,' ').toLowerCase();
  return plain.includes(q);
}
function renderManual(){
  const nav = document.getElementById('manual-nav');
  const detail = document.getElementById('manual-detail');
  const q = manualSearch.trim().toLowerCase();
  const matches = MANUAL_CHAPTERS.map((ch,i) => ({ch,i})).filter(({ch}) => manualChapterMatches(ch, q));
  nav.innerHTML = matches.length ? matches.map(({ch,i}) => `
    <div class="manual-chapter${i===manualChapter?' active':''}" onclick="goManualChapter(${i})">${manualChapterTitle(ch)}</div>
  `).join('') : `<div class="empty" style="padding:14px"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
  detail.innerHTML = matches.length ? manualChapterText(MANUAL_CHAPTERS[manualChapter]) : '';
}
function goManualChapter(i){
  manualChapter = i;
  renderManual();
}
function printManualChapter(){
  const ch = MANUAL_CHAPTERS[manualChapter];
  const title = manualChapterTitle(ch).replace(/<[^>]+>/g,'');
  const win = window.open('', '_blank', 'width=800,height=1000');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:20mm 18mm;max-width:180mm;margin:0 auto}
  .pr-brand{font-size:11.5px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  h2{font-size:17pt;margin:0 0 16px}h4{font-size:12.5pt;color:#555;margin-top:16px}
  .manual-step{display:flex;gap:10px;margin-bottom:8px}.sn{flex:none;width:22px;height:22px;border-radius:50%;background:#DF7039;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
  .manual-tip,.manual-warning{background:#F5F0E3;border-left:3px solid #DF7039;border-radius:6px;padding:8px 12px;margin:10px 0;font-size:10.5pt}
  @media print{body{padding:10mm}}</style></head><body>
  <div class="pr-brand">${escapeHtml((DB.business&&DB.business.name)||'GastroGoan')}</div>
  <h2>${title}</h2>
  ${manualChapterText(ch)}
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  await dbReadyPromise;
  if(isAccessSessionExpiredByInactivity()) clearAccessSession();
  // Cualquier interacción cuenta como actividad, para que la sesión no
  // caduque mientras el dispositivo se está usando de verdad.
  ['pointerdown','keydown'].forEach(evt => document.addEventListener(evt, recordAccessActivity, {passive:true}));
  document.addEventListener('visibilitychange', () => { if(!document.hidden && isAccessSessionExpiredByInactivity()){ clearAccessSession(); location.reload(); } });
  renderHeader();
  initCloud();
  syncPublicMirror();
  initPublicRequestsListener();
  applyHelpI18n();
  updateChatBadge();
  const initial = (location.hash || '#home').replace('#','');
  if(MODULE_FOLDER[initial]) currentFolder = MODULE_FOLDER[initial];
  navigate(initial === 'folder' && !currentFolder ? 'home' : initial);
  applyI18n();
  if(getLicense()) checkLicenseRevocation();

  setInterval(() => {
    const active = document.querySelector('.view.active');
    if(active && active.id === 'view-comandascocina') renderComandasCocina();
  }, 3000);

  updateAutoActiveCarta();
  updateAutoActiveMenu();
  setInterval(() => { updateAutoActiveCarta(); updateAutoActiveMenu(); purgePaidOrders(); }, 60000);

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
