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
  plagas: {fields:['fecha','area','hallazgos','accion','proxima'], labelKeys:['common.date','label.area','label.findings','label.actionTaken','label.nextReview']}
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
  return DB.recipes.filter(r => (r.area||'cocina') === currentArea() && r.name)
    .map(r => ({name: r.name, allergens: [...recipeAllergens(r)]}))
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
        <tbody>${dishes.map(d => `<tr><td>${escapeHtml(d.name)}</td><td class="wrap">${d.allergens.length ? d.allergens.map(a=>`<span class="badge badge-amber">${escapeHtml(a)}</span>`).join(' ') : `<span style="color:var(--muted)">${t('label.noAllergensDetected')}</span>`}</td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty" style="padding:14px">${t('empty.noDishesForAllergens')}</div>`}
    </div>
  `;
}
const LIMPIEZA_DEFAULT_MANOS = ['Mójate las manos con agua tibia','Aplica jabón bactericida (mínimo 3ml)','Frota palmas, dorso, dedos y muñecas durante 20 segundos','Aclara con agua','Seca con papel de un solo uso','Cierra el grifo con el papel'];
const LIMPIEZA_DEFAULT_APERTURA = ['Encender luces y climatización','Verificar temperaturas de cámaras frigoríficas','Comprobar stock de materia prima','Preparar mise en place','Limpiar superficies de trabajo','Verificar que los baños están limpios y equipados'];
const LIMPIEZA_DEFAULT_CIERRE = ['Limpiar y desinfectar todas las superficies','Barrer y fregar suelos','Vaciar cubos de basura','Verificar que todo el equipamiento está apagado','Cerrar cámaras y comprobar temperaturas','Activar alarma y cerrar con llave'];
// Checklists propias de Sala: barra/grifos/cafetera en vez de cámaras/plancha de cocina.
const LIMPIEZA_DEFAULT_APERTURA_SALA = ['Encender luces y música ambiente','Comprobar temperatura de neveras y grifos de cerveza','Preparar hielo, guarniciones y cristalería','Revisar stock de bebidas en barra','Limpiar barra y mesas','Verificar que los baños están limpios y equipados'];
const LIMPIEZA_DEFAULT_CIERRE_SALA = ['Limpiar y desinfectar la barra y mesas','Lavar y guardar la cristalería','Vaciar posos de cafetera/molinillo y limpiar grifos de cerveza','Verificar que todo el equipamiento está apagado','Cerrar neveras y comprobar temperaturas','Activar alarma y cerrar con llave'];

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
      cocina: legacy || [...(type==='apertura' ? LIMPIEZA_DEFAULT_APERTURA : LIMPIEZA_DEFAULT_CIERRE)],
      sala: [...(type==='apertura' ? LIMPIEZA_DEFAULT_APERTURA_SALA : LIMPIEZA_DEFAULT_CIERRE_SALA)]
    };
  }
  const area = currentArea();
  if(!l[key][area]) l[key][area] = [...(type==='apertura' ? (area==='sala'?LIMPIEZA_DEFAULT_APERTURA_SALA:LIMPIEZA_DEFAULT_APERTURA) : (area==='sala'?LIMPIEZA_DEFAULT_CIERRE_SALA:LIMPIEZA_DEFAULT_CIERRE))];
  return l[key][area];
}

function ensureLimpiezaData(){
  if(!DB.limpieza) DB.limpieza = {};
  const l = DB.limpieza;
  if(!l.manosPasos) l.manosPasos = [...LIMPIEZA_DEFAULT_MANOS];
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
  const pasos = DB.limpieza.manosPasos;
  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3 style="justify-content:space-between"><span><i class="ti ti-droplet"></i> ${t('title.handWashingProtocol')}</span><button class="btn btn-sm" onclick="printManosProtocolo()"><i class="ti ti-printer"></i></button></h3>
        ${pasos.map((p,i) => `
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            <div class="step-num">${i+1}</div>
            <input type="text" value="${escapeHtml(p)}" style="flex:1" onchange="updateManosPaso(${i}, this.value)" ${editUnlocked?'':'disabled'}>
            <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeManosPaso(${i})" ${pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
          </div>
        `).join('')}
        <button class="owner-only btn btn-sm" onclick="addManosPaso()"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
        <button class="owner-only btn btn-sm btn-secondary" style="margin-left:8px" onclick="resetManosPasos()"><i class="ti ti-restore"></i> ${t('btn.resetToDefault')}</button>
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
          <h3>✅ ${t('title.minimumDuration')}</h3>
          <p style="font-size:28px;font-weight:800;color:var(--brand-orange);margin:0">${t('label.20seconds')}</p>
          <p style="font-size:13px;color:var(--muted);margin-top:4px">${t('msg.happyBirthdayEquivalent')}</p>
        </div>
      </div>
    </div>
  `;
}
function resetManosPasos(){ DB.limpieza.manosPasos = [...LIMPIEZA_DEFAULT_MANOS]; saveDB(); renderLimpiezaManos(); showToast(t('msg.stepsReset')); }
function updateManosPaso(i, val){ DB.limpieza.manosPasos[i] = val; saveDB(); }
function addManosPaso(){ DB.limpieza.manosPasos.push('Nuevo paso'); saveDB(); renderLimpiezaManos(); }
function removeManosPaso(i){
  if(DB.limpieza.manosPasos.length<=1) return;
  DB.limpieza.manosPasos.splice(i,1);
  saveDB();
  renderLimpiezaManos();
}
function renderLimpiezaProtocolo(){
  const box = document.getElementById('limpieza-tab-content');
  const ap = limpiezaProtocoloPasos('apertura');
  const ci = limpiezaProtocoloPasos('cierre');
  const empOptions = areaEmployees().map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
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
          <div class="owner-only" style="display:flex;gap:2px">
            ${reorderButtons(`moveProtocoloPaso('${type}',${i},-1)`, `moveProtocoloPaso('${type}',${i},1)`, i===0, i===pasos.length-1)}
          </div>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeProtocoloPaso('${type}',${i})" ${pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
        </div>
      `).join('')}
      <button class="owner-only btn btn-sm" onclick="addProtocoloPaso('${type}')"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
      <button class="owner-only btn btn-sm btn-secondary" style="margin-left:8px" onclick="resetProtocoloPasos('${type}')"><i class="ti ti-restore"></i> ${t('common.reset')}</button>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase">${t('title.dailyCompliance')}</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <select id="protocolo-resp-${type}" style="flex:1">
            <option value="">${t('label.responsible')}</option>
            ${empOptions}
          </select>
          <button class="btn btn-sm btn-primary" onclick="registerProtocoloCompliance('${type}')"><i class="ti ti-check"></i> ${t('btn.registerToday')}</button>
        </div>
        ${logEntries.length ? `<div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow:auto">${logEntries.map(entry => {
          const resp = entry.responsableId ? DB.employees.find(e=>e.id===entry.responsableId) : null;
          return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px">
            <span><i class="ti ti-check" style="color:var(--green)"></i> ${escapeHtml(entry.fecha)} · ${escapeHtml(entry.hora)}${resp?` · ${escapeHtml(resp.name)}`:''}</span>
            <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteProtocoloComplianceEntry('${type}',${entry.id})"><i class="ti ti-trash"></i></button>
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
function registerProtocoloCompliance(type){
  const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
  const sel = document.getElementById(`protocolo-resp-${type}`);
  const responsableId = sel && sel.value ? parseInt(sel.value) : null;
  const now = new Date();
  DB.limpieza[logKey].push({id: genId(), fecha: todayStr(), hora: now.toTimeString().slice(0,5), responsableId, area: currentArea()});
  saveDB();
  renderLimpiezaProtocolo();
  showToast(t('msg.complianceRegistered'));
}
function deleteProtocoloComplianceEntry(type, id){
  const logKey = type==='apertura' ? 'aperturaLog' : 'cierreLog';
  DB.limpieza[logKey] = DB.limpieza[logKey].filter(x => x.id !== id);
  saveDB();
  renderLimpiezaProtocolo();
}
function addProtocoloPaso(type){ limpiezaProtocoloPasos(type).push('Nuevo paso'); saveDB(); renderLimpiezaProtocolo(); }
function removeProtocoloPaso(type,i){
  const pasos = limpiezaProtocoloPasos(type);
  if(pasos.length<=1) return;
  pasos.splice(i,1);
  saveDB();
  renderLimpiezaProtocolo();
}
function resetProtocoloPasos(type){
  const area = currentArea();
  const isSala = area === 'sala';
  DB.limpieza[_protocoloKey(type)][area] = [...(type==='apertura' ? (isSala?LIMPIEZA_DEFAULT_APERTURA_SALA:LIMPIEZA_DEFAULT_APERTURA) : (isSala?LIMPIEZA_DEFAULT_CIERRE_SALA:LIMPIEZA_DEFAULT_CIERRE))];
  saveDB(); renderLimpiezaProtocolo(); showToast(t('msg.stepsReset'));
}
function printProtocolo(type){
  const pasos = limpiezaProtocoloPasos(type);
  const title = type==='apertura' ? t('title.openingProtocol') : t('title.closingProtocol');
  const w = window.open('','_blank');
  w.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:40px}h2{margin-bottom:20px}ol li{padding:6px 0;font-size:16px}</style></head><body><h2>${title}</h2><ol>${pasos.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ol></body></html>`);
  w.document.close(); w.print();
}
function printManosProtocolo(){
  const pasos = DB.limpieza.manosPasos;
  const html = `<h2>Protocolo de lavado de manos</h2><ol>${pasos.map(p=>`<li style="margin-bottom:8px">${escapeHtml(p)}</li>`).join('')}</ol>`;
  const w = window.open('', '_blank', 'width=500,height=600');
  if(!w){ showToast(t('msg.allowPopupsPrint')); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Protocolo de lavado de manos</title><style>body{font-family:Arial,sans-serif;padding:24px;font-size:14px}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
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
          return `
          <div style="margin-bottom:4px;cursor:pointer" onclick="openLimpiezaTareaMesModal(${t.id})">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer" onclick="event.stopPropagation()" title="${info?`Hecho el ${escapeHtml(info.fecha||'')} ${escapeHtml(info.hora||'')}`:''}">
              <input type="checkbox" ${info?'checked':''} onchange="toggleLimpiezaCheckMes('${monthKey}',${t.id},this.checked)">
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
      <button class="owner-only btn btn-sm btn-primary" onclick="openLimpiezaTareaMesModal()"><i class="ti ti-plus"></i> ${t('btn.addTask')}</button>
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
function toggleLimpiezaCheckMes(monthKey, tareaId, val){
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5)} : null;
  saveDB();
  renderLimpiezaMes();
}
function toggleLimpiezaCheckMesFromDist(monthKey, tareaId, val){
  if(!DB.limpieza.checksMes) DB.limpieza.checksMes = {};
  if(!DB.limpieza.checksMes[monthKey]) DB.limpieza.checksMes[monthKey] = {};
  const now = new Date();
  DB.limpieza.checksMes[monthKey][tareaId] = val ? {done:true, fecha: todayStr(), hora: now.toTimeString().slice(0,5)} : null;
  saveDB();
  renderDistDetail();
}

function openLimpiezaTareaMesModal(id){
  const tarea = id ? DB.limpieza.tareas.find(x=>x.id===id) : null;
  const empOptions = DB.employees.filter(e=>(e.area||'cocina')===currentArea()).map(e=>`<option value="${e.id}"${tarea&&tarea.responsableId===e.id?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <h3>${tarea?'Editar':'Nueva'} tarea de limpieza mensual</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Área o tarea de limpieza</label>
      <input type="text" id="new-limpieza-area" value="${tarea?escapeHtml(tarea.area):''}" placeholder="${currentArea()==='sala' ? 'Ej. Grifos de cerveza, Cafetera, Cristalería...' : 'Ej. Campana extractora, Cámara frigorífica...'}">
    </div>
    <div class="field">
      <label>Producto limpiador (opcional)</label>
      <input type="text" id="new-limpieza-producto" value="${tarea?escapeHtml(tarea.producto||''):''}" placeholder="Ej. Desengrasante">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Día del mes</label>
        <input type="number" id="new-limpieza-diames" min="1" max="31" value="${tarea?tarea.diaMes:1}">
      </div>
      <div class="field">
        <label>Responsable</label>
        <select id="new-limpieza-responsable">
          <option value="">Sin asignar</option>
          ${empOptions}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      ${tarea ? `<button class="owner-only btn btn-danger" onclick="deleteLimpiezaTarea(${tarea.id});closeModal()">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmLimpiezaTareaMes(${tarea?tarea.id:'null'})">${tarea?'Guardar':'Añadir'}</button>
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

  const formFields = cfg.fields.map((f,i) => {
    let input;
    if(f === 'estado' && key === 'temperaturas') input = `<div style="font-size:12px;color:var(--muted);padding-top:8px">${t('label.autoCalculated')}</div>`;
    else if(f === 'estado') input = `<select id="lp-${key}-${f}"><option value="OK">✅ OK</option><option value="NOK">❌ No OK</option></select>`;
    else if(f === 'tipo' && key === 'temperaturas') input = `<select id="lp-${key}-${f}">${limpiezaTempTipoOptions().map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`;
    else if(f === 'fecha') input = `<input type="date" id="lp-${key}-${f}" value="${todayStr()}">`;
    else if(f === 'hora') input = `<input type="time" id="lp-${key}-${f}">`;
    else if(f === 'temp' && key === 'temperaturas') input = `<input type="number" step="0.1" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    else input = `<input type="text" id="lp-${key}-${f}" placeholder="${cfg.labels[i]}">`;
    return `<div class="field" style="margin-bottom:0"><label>${cfg.labels[i]}</label>${input}</div>`;
  }).join('');

  const rows = entries.length ? [...entries].slice().reverse().map(e => `
    <tr>${cfg.fields.map(f => {
      if(f === 'estado'){
        if(e[f]==='OK') return `<td style="font-weight:700;color:var(--green)">✅ OK</td>`;
        if(e[f]==='NOK') return `<td style="font-weight:700;color:var(--red)">❌ No OK</td>`;
        return `<td style="color:var(--muted)">ℹ️ ${t('status.notEvaluated')}</td>`;
      }
      if(f === 'tipo' && key === 'temperaturas') return `<td>${escapeHtml(limpiezaTempTipoLabel(e[f]))}</td>`;
      return `<td>${escapeHtml(String(e[f]||'—'))}</td>`;
    }).join('')}<td><button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteLimpiezaLogEntry('${key}',${e.id})"><i class="ti ti-trash"></i></button></td></tr>
  `).join('') : `<tr><td colspan="${cfg.fields.length+1}"><div class="empty" style="padding:14px">Sin registros todavía.</div></td></tr>`;

  box.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="grid grid-3" style="margin-bottom:10px">${formFields}</div>
      <button class="btn btn-primary" onclick="addLimpiezaLogEntry('${key}')"><i class="ti ti-plus"></i> ${t('common.register')}</button>
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
  const cfg = limpiezaLogConfig(key);
  const entry = {id: genId()};
  cfg.fields.forEach(f => {
    if(f === 'estado' && key === 'temperaturas') return; // se calcula solo, más abajo
    const el = document.getElementById(`lp-${key}-${f}`);
    entry[f] = el ? el.value : '';
  });
  if(key === 'temperaturas'){
    entry.estado = computeTempEstado(entry.tipo, parseFloat(entry.temp)) || null;
  }
  entry.zona = currentArea();
  DB.limpieza[key].push(entry);
  saveDB();
  renderLimpiezaLog(key);
}
function deleteLimpiezaLogEntry(key, id){
  if(!confirm(t('msg.confirmDeleteShift'))) return;
  DB.limpieza[key] = DB.limpieza[key].filter(e => e.id!==id);
  saveDB();
  renderLimpiezaLog(key);
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
      <button class="owner-only btn btn-primary" onclick="addMantenimientoEquipo()"><i class="ti ti-plus"></i> ${t('btn.addEquipment')}</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('label.equipment')}</th><th>${t('label.lastMaintenance')}</th><th>${t('label.next')}</th><th>${t('label.responsible')}</th><th>${t('label.status')}</th><th>${t('th.notes')}</th><th></th></tr></thead>
        <tbody>${equipos.length ? equipos.map(e => {
          const due = limpiezaMantenimientoDueStatus(e);
          return `
          <tr>
            <td><strong>${escapeHtml(e.nombre)}</strong></td>
            <td><input type="date" value="${e.ultimo||''}" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'ultimo',this.value)"></td>
            <td>
              <input type="date" value="${e.proximo||''}" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'proximo',this.value)">
              ${due==='overdue' ? `<span class="badge badge-red" style="margin-left:4px;white-space:nowrap"><i class="ti ti-alert-triangle"></i> ${t('badge.overdue')}</span>` : ''}
              ${due==='soon' ? `<span class="badge badge-amber" style="margin-left:4px;white-space:nowrap"><i class="ti ti-clock"></i> ${t('badge.dueSoon')}</span>` : ''}
            </td>
            <td><input type="text" value="${escapeHtml(e.responsable||'')}" placeholder="—" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px;width:100px" onchange="updateMantenimientoEquipo(${e.id},'responsable',this.value)"></td>
            <td><select style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px" onchange="updateMantenimientoEquipo(${e.id},'estado',this.value)">
              ${[['OK','status.ok'],['Pendiente','status.pendingM'],['Urgente','status.urgent']].map(([opt,key])=>`<option value="${opt}"${e.estado===opt?' selected':''}>${t(key)}</option>`).join('')}
            </select></td>
            <td><input type="text" value="${escapeHtml(e.notas||'')}" placeholder="—" style="border:1px solid var(--border);border-radius:6px;padding:4px;font-size:12px;width:120px" onchange="updateMantenimientoEquipo(${e.id},'notas',this.value)"></td>
            <td><button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteMantenimientoEquipo(${e.id})"><i class="ti ti-trash"></i></button></td>
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
  DB.limpieza.mantenimiento.push({id: genId(), nombre: nombre.trim(), ultimo:'', proximo:'', responsable:'', estado:'OK', notas:'', zona: currentArea()});
  saveDB();
  closeModal();
  renderLimpiezaMantenimiento();
}
function updateMantenimientoEquipo(id, field, val){
  const e = DB.limpieza.mantenimiento.find(x => x.id===id);
  if(e) e[field] = val;
  saveDB();
}
function deleteMantenimientoEquipo(id){
  if(!confirm(t('msg.confirmDeleteShift'))) return;
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
    Object.keys(d.produccion||{}).forEach(dayIdx => {
      d.produccion[dayIdx] = (d.produccion[dayIdx]||[]).map(t => typeof t === 'string' ? {id: genId(), text: t} : t);
    });
  });
}

function getDistEmpData(empId){
  if(!DB.workDistribution[empId]) DB.workDistribution[empId] = { platos: [], produccion: {}, doneDates: {} };
  const d = DB.workDistribution[empId];
  if(!d.platos) d.platos = [];
  if(!d.produccion) d.produccion = {};
  if(!d.doneDates) d.doneDates = {};
  return d;
}

// Promociones asignadas a un empleado para una fecha exacta (no solo el
// mismo día de la semana, que haría reaparecer promos de otras semanas).
function getPromosForEmployeeDate(empId, dateStr){
  return DB.promos.filter(p => p.responsableId === empId && p.fecha === dateStr)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
function togglePromoDone(promoId, checked){
  const p = DB.promos.find(x=>x.id===promoId);
  if(!p) return;
  p.done = checked;
  // Traza de cuándo se completó (no solo un booleano reversible sin rastro),
  // mismo espíritu que la fecha/hora añadida a las tareas de Plan de Limpieza.
  const now = new Date();
  p.doneAt = checked ? now.toISOString() : null;
  saveDB();
  if(document.getElementById('distribucion-content')) renderDistDetail();
  if(document.getElementById('promo-tab-content')) renderPromocion();
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

function renderDistribucion(){
  migrateWorkDistribution();
  const box = document.getElementById('distribucion-content');

  if(!areaEmployees().length){
    box.innerHTML = `
      <div class="toolbar"><div class="left"></div><button class="owner-only btn btn-primary" onclick="addEmployeeFromDistribucion()"><i class="ti ti-plus"></i> ${t('btn.addEmployee')}</button></div>
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
  const emps = distSearch ? allEmps.filter(e => e.name.toLowerCase().includes(distSearch) || (e.rol||'').toLowerCase().includes(distSearch)) : allEmps;
  const cards = emps.map(emp => {
    const d = getDistEmpData(emp.id);
    const nPlatos = d.platos.length;
    const nTareas = Object.values(d.produccion).reduce((s,arr)=>s+arr.length, 0);
    return `
      <div class="card" style="cursor:pointer" onclick="openDistEmployee(${emp.id})">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:14px;height:14px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
          <strong>${escapeHtml(emp.name)}</strong>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${escapeHtml(emp.rol||'Sin rol')}</div>
        <div style="display:flex;gap:12px;font-size:12px;color:${nPlatos||nTareas?'var(--brand-orange)':'var(--muted)'}">
          ${isSala ? '' : `<span><i class="ti ti-tools-kitchen-2"></i> ${nPlatos} plato${nPlatos!==1?'s':''}</span>`}
          <span><i class="ti ti-clipboard-list"></i> ${nTareas} tarea${nTareas!==1?'s':''}</span>
        </div>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left"><input type="text" class="search-input" value="${escapeHtml(distSearch)}" placeholder="${t('ph.searchEmployee')}" oninput="setDistSearch(this.value)"></div>
      <button class="btn btn-default" onclick="printDistribucion()"><i class="ti ti-printer"></i> ${t('btn.printAll')}</button>
    </div>
    ${emps.length ? `<div class="grid grid-3">${cards}</div>` : `<div class="empty"><i class="ti ${allEmps.length?'ti-search-off':'ti-users'}"></i>${allEmps.length?t('common.noResults'):t('empty.employees')}</div>`}
  `;
}

// Igual que en la pestaña Personal: para ver la distribución de tareas de un
// empleado hay que introducir su PIN primero, así cada uno solo ve lo suyo.
let distPendingPinEmployeeId = null;
function openDistEmployee(id){
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
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
  const allDishes = getAllDishNames();
  // En Sala no tiene sentido el concepto de "plan de producción semanal de
  // platos" (eso es propio de cocina); ahí este módulo es solo el calendario
  // de tareas (Sala + Limpieza + Promos) de cada persona.
  const isSala = currentArea() === 'sala';

  const platosHtml = d.platos.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-bottom:8px">` + d.platos.map((pl,i)=>`
        <div class="actions-cell" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer" onclick="goToFichaForDish('${escapeJsAttr(pl)}')" title="Ver ficha técnica">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(pl)}</span>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="event.stopPropagation();removeDistPlato(${i})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') + `</div>`
    : '<div class="empty" style="padding:10px"><i class="ti ti-tools-kitchen-2"></i>Sin platos asignados</div>';

  const platosOptions = allDishes.filter(pl=>!d.platos.includes(pl))
    .map(pl=>`<option value="${escapeHtml(pl)}">${escapeHtml(pl)}</option>`).join('');

  ensureLimpiezaData();
  const weekDates = getWeekDates(distWeekOffset);
  const weekRangeLabel = `${weekDates[0].getDate()} ${monthFull(weekDates[0].getMonth()).slice(0,3)} – ${weekDates[6].getDate()} ${monthFull(weekDates[6].getMonth()).slice(0,3)}`;

  let nTareasTotal = 0, nTareasHechas = 0;

  const diasHtml = weekDates.map((date, idx) => {
    const label = weekDayFull(idx);
    const ds = dateStr(date);
    const isToday = ds === todayStr();

    // Producción: plantilla recurrente por día de la semana, "hecha" se
    // guarda por fecha concreta (con el id propio de cada tarea).
    const tareas = d.produccion[idx] || [];
    const tareasHtml = tareas.map(task => {
      const done = isDistTareaDone(emp.id, ds, task.id);
      nTareasTotal++; if(done) nTareasHechas++;
      return `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${done?'checked':''} onchange="toggleDistTareaDone('${ds}','${task.id}',this.checked)" title="Marcar como hecha">
        <input type="text" value="${escapeHtml(task.text)}" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':''}" onchange="updateDistTarea(${idx},'${task.id}',this.value)" ${editUnlocked?'':'disabled'}>
        <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeDistTarea(${idx},'${task.id}')"><i class="ti ti-x"></i></button>
      </div>
    `;}).join('');

    // Limpieza mensual: la tarea "toca" ese día si el día del mes coincide
    // con la fecha real de esta semana.
    const tareasLimpiezaDia = DB.limpieza.tareas.filter(lt => lt.tipo==='mensual' && lt.responsableId===emp.id && lt.diaMes===date.getDate() && (lt.zona||'cocina')===(emp.area||'cocina'));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    const checksMes = DB.limpieza.checksMes[monthKey] || {};
    const limpiezaHtml = tareasLimpiezaDia.map(lt => {
      const done = !!limpiezaCheckInfo(checksMes, lt.id);
      nTareasTotal++; if(done) nTareasHechas++;
      return `
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer">
        <input type="checkbox" ${done?'checked':''} onchange="toggleLimpiezaCheckMesFromDist('${monthKey}',${lt.id},this.checked)">
        <span class="badge badge-blue" style="font-size:10px"><i class="ti ti-spray"></i> Limpieza</span>
        <span style="flex:1;font-size:13px;${done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(lt.area)}${lt.producto?` <span style="color:var(--muted);font-size:12px">(${escapeHtml(lt.producto)})</span>`:''}</span>
      </label>
    `;}).join('');

    // Promociones: asignadas a esta fecha exacta (no se repiten cada semana).
    const promos = getPromosForEmployeeDate(emp.id, ds);
    const promosHtml = promos.map(p => {
      const done = !!p.done;
      nTareasTotal++; if(done) nTareasHechas++;
      return `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${done?'checked':''} onchange="event.stopPropagation();togglePromoDone(${p.id},this.checked)" title="Marcar como hecha">
        <span class="badge badge-amber" style="font-size:10px"><i class="ti ti-speakerphone"></i> Promo</span>
        <span style="flex:1;font-size:13px;cursor:pointer;${done?'text-decoration:line-through;color:var(--muted)':''}" onclick="openPromoModal(${p.id})">${escapeHtml(p.titulo)}</span>
      </div>
    `;}).join('');

    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);${isToday?'background:var(--brand-cream)':''}">
        <div style="font-size:12px;font-weight:700;color:var(--brand-orange);margin-bottom:6px;text-transform:uppercase">${label} · ${date.getDate()}/${date.getMonth()+1}${isToday?` <span class="badge badge-green" style="font-size:10px">${t('common.today')}</span>`:''}</div>
        ${promosHtml}
        ${limpiezaHtml}
        ${tareasHtml}
        ${!tareasHtml && !limpiezaHtml && !promosHtml ? `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${t('empty.noTasksThisDay')}</div>` : ''}
        <div class="owner-only" style="display:flex;gap:6px;margin-top:4px">
          <input type="text" id="dist-tarea-${idx}" placeholder="Nueva tarea..." style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" onkeydown="if(event.key==='Enter')addDistTarea(${idx})">
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
      ${isSala ? '' : `<div class="kpi"><div class="label">Platos a su cargo</div><div class="value">${d.platos.length}</div></div>`}
      <div class="kpi"><div class="label">Tareas de esta semana</div><div class="value">${nTareasHechas} / ${nTareasTotal}</div></div>
    </div>

    ${isSala ? '' : `
    <div class="card">
      <h3><i class="ti ti-tools-kitchen-2"></i> Platos a su cargo</h3>
      ${platosHtml}
      <div class="owner-only field-row" style="margin-top:8px">
        <select id="dist-plato-sel" style="flex:1">
          <option value="">— Selecciona plato —</option>
          ${platosOptions}
        </select>
        <button class="btn btn-default" onclick="addDistPlato()">Asignar</button>
      </div>
      <div class="owner-only field-row" style="margin-top:6px">
        <input type="text" id="dist-plato-manual" placeholder="O escribe un plato manualmente..." style="flex:1" onkeydown="if(event.key==='Enter')addDistPlatoManual()">
        <button class="btn btn-default" onclick="addDistPlatoManual()"><i class="ti ti-plus"></i> Añadir</button>
      </div>
    </div>
    `}

    <div class="card">
      <h3 style="justify-content:space-between">
        <span><i class="ti ti-clipboard-list"></i> Tareas de la semana</span>
        <span style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-sm btn-icon" onclick="distWeekShift(-1)" title="Semana anterior"><i class="ti ti-chevron-left"></i></button>
          <span style="font-size:13px;font-weight:600">${weekRangeLabel}</span>
          <button class="btn btn-sm btn-icon" onclick="distWeekShift(1)" title="Semana siguiente"><i class="ti ti-chevron-right"></i></button>
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
  const sel = document.getElementById('dist-plato-sel');
  const nombre = sel.value;
  if(!nombre) return;
  const d = getDistEmpData(distCurrentEmployeeId);
  if(!d.platos.includes(nombre)) d.platos.push(nombre);
  saveDB();
  renderDistDetail();
}

function addDistPlatoManual(){
  const inp = document.getElementById('dist-plato-manual');
  const nombre = inp.value.trim();
  if(!nombre) return;
  const d = getDistEmpData(distCurrentEmployeeId);
  if(!d.platos.includes(nombre)) d.platos.push(nombre);
  saveDB();
  renderDistDetail();
}

function removeDistPlato(idx){
  const d = getDistEmpData(distCurrentEmployeeId);
  d.platos.splice(idx,1);
  saveDB();
  renderDistDetail();
}

function addDistTarea(dayIdx){
  const inp = document.getElementById('dist-tarea-'+dayIdx);
  const val = inp.value.trim();
  if(!val) return;
  const d = getDistEmpData(distCurrentEmployeeId);
  if(!d.produccion[dayIdx]) d.produccion[dayIdx] = [];
  d.produccion[dayIdx].push({id: genId(), text: val});
  saveDB();
  renderDistDetail();
}

function updateDistTarea(dayIdx, taskId, val){
  const d = getDistEmpData(distCurrentEmployeeId);
  const task = (d.produccion[dayIdx]||[]).find(t=>t.id===taskId);
  if(task) task.text = val;
  saveDB();
}

function removeDistTarea(dayIdx, taskId){
  const d = getDistEmpData(distCurrentEmployeeId);
  if(d.produccion[dayIdx]){
    d.produccion[dayIdx] = d.produccion[dayIdx].filter(t=>t.id!==taskId);
    saveDB();
    renderDistDetail();
  }
}

function printDistribucion(empId){
  migrateWorkDistribution();
  const targets = empId ? DB.employees.filter(e=>e.id===empId) : areaEmployees();
  const isSala = currentArea() === 'sala';
  let html = `<h2 style="margin:0 0 16px">${t('view.distribucion.title')}</h2>`;
  targets.forEach(emp => {
    const d = getDistEmpData(emp.id);
    html += `<div style="margin-bottom:20px;break-inside:avoid;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="background:#f5f5f5;padding:8px 14px;font-weight:700">${escapeHtml(emp.name)} <span style="font-weight:400;color:#666">${escapeHtml(emp.rol||'')}</span></div>`;
    if(!isSala && d.platos.length) html += `<div style="padding:8px 14px;border-bottom:1px solid #eee"><b>Platos:</b> ${d.platos.map(escapeHtml).join(' · ')}</div>`;
    WEEK_DAYS.forEach((_, idx) => {
      const label = weekDayFull(idx);
      const tasks = d.produccion[idx] || [];
      if(tasks.length) html += `<div style="padding:6px 14px;border-bottom:1px solid #eee"><b>${label}:</b> ${tasks.map(task=>escapeHtml(task.text)).join(' · ')}</div>`;
    });
    html += `</div>`;
  });
  const w = window.open('', '_blank', 'width=620,height=700');
  if(!w){ showToast(t('msg.allowPopupsPrint')); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('view.distribucion.title')}</title><style>body{font-family:Arial;padding:24px;font-size:13px}@media print{body{padding:0}}</style></head><body>${html}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
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
function clientSalesStats(c){
  const matches = clientSales(c);
  const visitas = matches.length;
  const total = matches.reduce((sum,s)=>sum+s.total,0);
  const ticketMedio = visitas ? total/visitas : 0;
  const lastDate = matches.length ? matches.map(s=>s.date).sort().slice(-1)[0] : null;
  let recency = null;
  if(lastDate){
    recency = Math.floor((new Date(todayStr()) - new Date(lastDate)) / 86400000);
  }
  return {visitas, ticketMedio, lastDate, recency};
}

function renderClientes(){
  const search = document.getElementById('clientes-search').value.toLowerCase();
  const filter = document.getElementById('clientes-filter')?.value || '';
  let items = DB.clients.filter(c => !search || c.name.toLowerCase().includes(search) || (c.phone||'').includes(search));
  if(filter === 'inactive') items = items.filter(c => { const r = clientSalesStats(c).recency; return r === null || r > 60; });
  else if(filter === 'allergies') items = items.filter(c => (c.allergies||'').trim());
  else if(filter === 'vip') items = items.filter(c => (c.points||0) >= 7);
  else if(filter === 'noshows') items = items.filter(c => (c.noShows||0) > 0);
  else if(filter === 'noconsent') items = items.filter(c => c.marketingConsent === false);
  const tbody = document.getElementById('clientes-tbody');

  if(!items.length){
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><i class="ti ti-address-book"></i>${t("empty.clients")}</div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(c => {
    const stats = clientSalesStats(c);
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
      <td><strong>${escapeHtml(c.name)}</strong>${c.noShows ? ` <span class="badge badge-red" style="font-size:9px" title="${t('label.noShowCount')}"><i class="ti ti-user-x"></i> ${c.noShows}</span>` : ''}${c.marketingConsent===false ? ` <span class="badge badge-gray" style="font-size:9px" title="${t('label.noMarketingConsent')}"><i class="ti ti-mail-off"></i></span>` : ''}${c.cumpleanos ? `<div style="font-size:11px;color:var(--muted)"><i class="ti ti-cake"></i> ${escapeHtml(c.cumpleanos)}</div>` : ''}</td>
      <td>
        ${c.phone ? `<div><a href="https://wa.me/${escapeHtml(c.phone.replace(/\D/g,''))}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${escapeHtml(c.phone)}</a></div>` : ''}
        ${c.email ? `<div><a href="mailto:${escapeHtml(c.email)}"><i class="ti ti-mail"></i> ${escapeHtml(c.email)}</a></div>` : ''}
        ${!c.phone && !c.email ? '—' : ''}
      </td>
      <td><button class="btn btn-sm" style="background:none;border:none;padding:0" onclick="openClientHistoryModal(${c.id})" title="${t('btn.viewOrderHistory')}"><span class="badge badge-blue">${stats.visitas}</span></button></td>
      <td>${fmtMoney(stats.ticketMedio)}</td>
      <td>${stats.lastDate ? `${stats.lastDate} <span style="color:var(--muted);font-size:11px">(${t('label.daysAgo').replace('${n}', stats.recency)})</span>` : '—'}</td>
      <td><span class="badge ${loyaltyCls}">${points}/10</span> ${loyaltyBtn}</td>
      <td class="wrap">${escapeHtml(c.notes||'—')}</td>
      <td class="actions-cell">
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

function renderLoyaltyRewardsList(){
  const rewards = DB.loyaltyRewards||[];
  if(!rewards.length) return `<p style="font-size:12px;color:var(--muted)">${t('empty.noRewardsDefined')}</p>`;
  return rewards.map((r,i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${escapeHtml(r)}</span>
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
      <label>${t('common.name')}</label>
      <input type="text" id="client-name" value="${escapeHtml(c.name)}" placeholder="${t('ph.clientName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.phone')}</label>
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
    ${id ? `<button class="btn btn-sm" style="margin-bottom:14px" onclick="openClientHistoryModal(${id})"><i class="ti ti-receipt"></i> ${t('btn.viewOrderHistory')}</button>` : ''}
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
  const name = document.getElementById('client-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const phone = document.getElementById('client-phone').value.trim();
  const email = document.getElementById('client-email').value.trim();
  const cp = document.getElementById('client-cp').value.trim();
  const cumpleanos = document.getElementById('client-cumpleanos').value;
  const ultimoContacto = document.getElementById('client-ultimo-contacto').value;
  const allergies = document.getElementById('client-allergies').value.trim();
  const notes = document.getElementById('client-notes').value.trim();
  const marketingConsent = document.getElementById('client-marketing-consent').checked;

  // Aviso (no bloqueante) de posible cliente duplicado: mismo teléfono/email
  // ya dado de alta, o mismo nombre exacto, para no partir sus puntos e
  // historial en dos fichas sin querer.
  const dupe = DB.clients.find(x =>
    x.id !== id && (
      (phone && x.phone && x.phone.replace(/\D/g,'') === phone.replace(/\D/g,'')) ||
      (email && x.email && x.email.trim().toLowerCase() === email.trim().toLowerCase()) ||
      x.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
  );
  if(dupe && !confirm(t('msg.confirmDuplicateClient').replace('${name}', dupe.name))) return;

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
  const sales = [...clientSales(c)].sort((a,b) => (b.createdAt||b.date).localeCompare(a.createdAt||a.date));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-receipt"></i> ${t('title.orderHistoryOf')} ${escapeHtml(c.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${sales.length ? `<div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('label.dishElaboration')}</th><th>${t('label.total')}</th></tr></thead>
        <tbody>${sales.map(s => `<tr><td>${escapeHtml(s.date)}</td><td class="wrap">${(s.items||[]).map(it=>`${it.qty}× ${escapeHtml(it.name)}`).join(', ')}</td><td>${fmtMoney(s.total)}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-receipt"></i>${t('empty.noOrderHistory')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

// Exporta la lista de clientes visible (respetando el buscador/filtro activo) a CSV.
function exportClientsCSV(){
  const search = document.getElementById('clientes-search').value.toLowerCase();
  const filter = document.getElementById('clientes-filter')?.value || '';
  let items = DB.clients.filter(c => !search || c.name.toLowerCase().includes(search) || (c.phone||'').includes(search));
  if(filter === 'inactive') items = items.filter(c => { const r = clientSalesStats(c).recency; return r === null || r > 60; });
  else if(filter === 'allergies') items = items.filter(c => (c.allergies||'').trim());
  else if(filter === 'vip') items = items.filter(c => (c.points||0) >= 7);
  else if(filter === 'noshows') items = items.filter(c => (c.noShows||0) > 0);
  else if(filter === 'noconsent') items = items.filter(c => c.marketingConsent === false);
  const rows = [[t('common.name'), t('common.phone'), t('common.email'), t('label.visits'), t('label.avgTicket'), t('label.lastVisit'), t('label.loyaltyPoints'), t('label.noShowCount'), t('label.allergiesPrefs'), t('th.notes')]];
  items.forEach(c => {
    const stats = clientSalesStats(c);
    rows.push([c.name, c.phone||'', c.email||'', stats.visitas, stats.ticketMedio, stats.lastDate||'', c.points||0, c.noShows||0, c.allergies||'', c.notes||'']);
  });
  downloadCSV(rows, `clientes-${todayStr()}.csv`);
}

// Cumpleaños en los próximos 14 días (por día/mes, sin importar el año), para
// poder felicitar a los clientes sin tener que acordarte tú de mirarlo cada día.
function getUpcomingBirthdays(days){
  const today = new Date();
  const upcoming = [];
  DB.clients.forEach(c => {
    if(!c.cumpleanos) return;
    const parts = c.cumpleanos.split('-');
    if(parts.length !== 3) return;
    const month = parseInt(parts[1]) - 1, day = parseInt(parts[2]);
    for(let offset = 0; offset <= days; offset++){
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      if(d.getMonth() === month && d.getDate() === day){
        upcoming.push({client: c, date: d, inDays: offset});
        break;
      }
    }
  });
  return upcoming.sort((a,b) => a.inDays - b.inDays);
}
function openBirthdaysModal(){
  const upcoming = getUpcomingBirthdays(14);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cake"></i> ${t('title.upcomingBirthdays')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${upcoming.length ? upcoming.map(({client:c, inDays}) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <strong>${escapeHtml(c.name)}</strong>
          <div style="font-size:12px;color:var(--muted)">${inDays===0?t('label.today'):inDays===1?t('label.tomorrow'):t('label.inNDays').replace('${n}', inDays)}</div>
        </div>
        <button class="btn btn-sm" onclick="openBirthdayGreetingModal(${c.id})" ${(!c.phone && !c.email)?'disabled':''}><i class="ti ti-bell"></i> ${t('btn.sendGreeting')}</button>
      </div>
    `).join('') : `<div class="empty"><i class="ti ti-cake"></i>${t('empty.noUpcomingBirthdays')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function birthdayGreetingText(c){
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  return `¡Feliz cumpleaños, ${c.name}! 🎂 Todo el equipo de ${bizName} te desea un día genial. ¡Esperamos verte pronto para celebrarlo!`;
}
function openBirthdayGreetingModal(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const msg = birthdayGreetingText(c);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cake"></i> ${escapeHtml(c.name)}</h3>
      <button class="modal-close" onclick="openBirthdaysModal()">&times;</button>
    </div>
    <div class="field"><textarea id="birthday-greeting-text" rows="4">${escapeHtml(msg)}</textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendBirthdayWhatsapp(${id})" ${!c.phone?'disabled':''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendBirthdayEmail(${id})" ${!c.email?'disabled':''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openBirthdaysModal()">${t('common.back')}</button>
    </div>
  `);
}
function sendBirthdayWhatsapp(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.phone){ showToast(t('msg.noPhone')); return; }
  const tel = c.phone.replace(/\D/g,'');
  const txt = encodeURIComponent(document.getElementById('birthday-greeting-text').value);
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
}
function sendBirthdayEmail(id){
  const c = DB.clients.find(x=>x.id===id);
  if(!c || !c.email){ showToast(t('msg.noEmail')); return; }
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  const subject = encodeURIComponent('¡Feliz cumpleaños de parte de ' + bizName + '!');
  const body = encodeURIComponent(document.getElementById('birthday-greeting-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(c.email)+'?subject='+subject+'&body='+body;
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
      <h3><i class="ti ti-gift"></i> Premio de fidelidad</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px;line-height:1.6">¡<strong>${escapeHtml(c.name)}</strong> ha llegado a 10 puntos! Elige el premio que le vas a entregar.</p>
    ${suggestion ? `
    <div style="background:var(--cream,#FBF3EA);border-left:3px solid var(--brand-orange);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;line-height:1.5">
      <i class="ti ti-sparkles"></i> Sugerencia de la app: su producto favorito es <strong>${escapeHtml(fav)}</strong> (el que más ha pedido), así que podrías ofrecerle <strong>"${escapeHtml(suggestion)}"</strong>.
    </div>` : ''}
    <div class="field">
      <label>Premio a entregar</label>
      <select id="reward-select" onchange="document.getElementById('reward-custom-wrap').style.display = this.value==='__custom__' ? '' : 'none'">
        ${options.map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
        <option value="__custom__">Otro (escribir)...</option>
      </select>
    </div>
    <div class="field" id="reward-custom-wrap" style="display:none">
      <label>Premio personalizado</label>
      <input type="text" id="reward-custom" placeholder="Ej. Postre + café gratis">
    </div>
    <p style="font-size:12px;color:var(--muted)">Al confirmar, el contador de ${escapeHtml(c.name)} se reiniciará a 0 y empezará una nueva ronda hacia su próximo premio.</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmClientReward(${id})"><i class="ti ti-gift"></i> Entregar premio y reiniciar</button>
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
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  return `¡Hola ${c.name}! 🎉 Gracias por tu fidelidad en ${bizName}. Has conseguido un premio: ${reward}. ¡Te esperamos para que lo disfrutes en tu próxima visita!`;
}

// Tras dar un premio, ofrece avisar al cliente por WhatsApp/SMS o email con el texto ya preparado.
function openRewardNotifyModal(id, reward){
  const c = DB.clients.find(x=>x.id===id);
  if(!c) return;
  const msg = rewardMessageText(c, reward);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-bell"></i> Avisar a ${escapeHtml(c.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13.5px;line-height:1.6">Puedes avisar a ${escapeHtml(c.name)} de su premio ahora mismo con un mensaje ya preparado:</p>
    <div class="field">
      <textarea id="reward-notify-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendRewardWhatsapp(${id})" ${!c.phone?'disabled title="Este cliente no tiene teléfono guardado"':''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendRewardEmail(${id})" ${!c.email?'disabled title="Este cliente no tiene email guardado"':''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Ahora no</button>
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
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  const subject = encodeURIComponent('¡Tienes un premio en ' + bizName + '!');
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
    DB.clients = DB.clients.filter(x=>x.id!==id);
    DB.reservations.forEach(r => { if(r.clientId===id) r.clientId = null; });
    DB.sales.forEach(s => { if(s.clientId===id) s.clientId = null; });
    saveDB();
    renderClientes();
    showToast(t('msg.clientDeleted'));
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
  document.querySelectorAll('#view-reservas .ge-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.getElementById('reservas-tab-'+reservasTab);
  if(tabBtn) tabBtn.classList.add('active');

  renderReservasPendingOnline();
  if(reservasTab === 'semana') renderReservasSemana();
  else if(reservasTab === 'mes') renderReservasMes();
  else renderReservasDia();
}

function renderReservasPendingOnline(){
  const box = document.getElementById('reservas-pending-online');
  if(!box) return;
  const pending = DB.reservations.filter(r => r.status === 'pendiente');
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
          <div style="font-size:13px"><i class="ti ti-calendar"></i> ${escapeHtml(r.date)} · <i class="ti ti-clock"></i> ${escapeHtml(r.time)} · 👥 ${r.people}</div>
          ${r.clientPhone ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-phone"></i> ${escapeHtml(r.clientPhone)}</div>` : ''}
          ${r.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px"><i class="ti ti-note"></i> ${escapeHtml(r.notes)}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="setReservationStatus(${r.id}, 'confirmada')"><i class="ti ti-check"></i> ${t('common.confirm')}</button>
            <button class="btn btn-sm btn-danger" style="flex:1" onclick="setReservationStatus(${r.id}, 'cancelada')"><i class="ti ti-x"></i> ${t('common.reject')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function setReservationStatus(id, status){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;

  if(status === 'confirmada'){
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

  const yaConfirmada = r.status === 'confirmada';
  r.status = status;
  // Solo sumar visita/punto de fidelidad en la transición real pendiente→confirmada,
  // no al reconfirmar una reserva que ya estaba confirmada.
  if(status === 'confirmada' && !yaConfirmada){
    let cid = r.clientId;
    if(!cid && r.clientPhone){
      const match = findClientByPhone(r.clientPhone);
      if(match) cid = match.id;
    }
    if(cid) registerClientVisit(cid);
  }
  saveDB();
  renderReservas();
  showToast(status==='confirmada' ? t('msg.reservationConfirmed') : t('msg.reservationRejected'));
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
    : `<div class="table-wrap"><table>
        <thead><tr><th>${t('th.time')}</th><th>${t('th.client')}</th><th>${t('th.people')}</th><th>${t('th.table')}</th><th>${t('th.notes')}</th><th>${t('th.status')}</th><th>${t('th.arrival')}</th><th></th></tr></thead>
        <tbody>
          ${items.map(r => {
            const client = DB.clients.find(c=>c.id===r.clientId);
            const table = DB.tables.find(t=>t.id===r.tableId);
            return `
              <tr>
                <td><strong>${escapeHtml(r.time)}</strong></td>
                <td>${escapeHtml(client ? client.name : (r.clientName||'—'))}</td>
                <td>${r.people}</td>
                <td>${table ? escapeHtml(table.name) : `<span class="badge badge-gray">${t('label.notAssigned')}</span>`}</td>
                <td class="wrap">${escapeHtml(r.notes||'—')}</td>
                <td>${reservationStatusBadge(r.status)}</td>
                <td>
                  ${r.status==='confirmada' ? `
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <button class="btn btn-sm ${r.llegada?'btn-primary':''}" onclick="toggleReservaLlegada(${r.id})">${r.llegada?`<i class="ti ti-check"></i> ${t('btn.arrived')}`:t('btn.notYet')}</button>
                      ${!r.llegada ? `<button class="btn btn-sm btn-danger" onclick="markReservationNoShow(${r.id})" title="${t('btn.noShow')}"><i class="ti ti-user-x"></i></button>` : ''}
                    </div>
                  ` : '—'}
                </td>
                <td class="actions-cell">
                  ${r.status==='confirmada' && (client?.phone || client?.email || r.clientPhone) ? `<button class="btn btn-sm btn-icon" onclick="openReservationReminderModal(${r.id})" title="${t('btn.sendReminder')}"><i class="ti ti-bell"></i></button>` : ''}
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
      ${aforoInfo.map((t,i) => {
        const lleno = t.aforo>0 && t.reservados >= t.aforo;
        const cerca = t.aforo>0 && t.reservados >= t.aforo*0.8 && !lleno;
        const cls = lleno ? 'badge-red' : cerca ? 'badge-amber' : 'badge-green';
        return `<span class="badge ${cls}"><i class="ti ti-users"></i> Turno ${i+1} (${t.abre}-${t.cierra}): ${t.reservados}${t.aforo?'/'+t.aforo:''} personas${lleno?' · AFORO COMPLETO':''}</span>`;
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
    const items = DB.reservations.filter(r => r.date === ds).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const isToday = ds === todayStr();
    return `
      <div class="card" style="cursor:pointer;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToReservasDia('${ds}')">
        <h3 style="justify-content:space-between;font-size:14px">
          <span>${weekDayFull(i)} ${d.getDate()}/${d.getMonth()+1}</span>
          ${items.length ? `<span class="badge badge-blue">${items.length}</span>` : ''}
        </h3>
        ${items.length ? items.map(r => {
          const client = DB.clients.find(c=>c.id===r.clientId);
          return `<div style="font-size:12px;padding:2px 0">${escapeHtml(r.time)} · ${escapeHtml(client ? client.name : (r.clientName||'—'))} (${r.people}p)</div>`;
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
  DB.reservations.forEach(r => { counts[r.date] = (counts[r.date]||0) + 1; });

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

// Ventana mínima entre dos reservas de la misma mesa: 90 min (hora y media)
// de base, +15 min más por cada comensal por encima de 4 (un grupo grande
// tarda más en comer que una mesa de 2, así que necesita más margen).
const RESERVA_VENTANA_MIN = 90;
function reservaVentanaMin(people){
  return RESERVA_VENTANA_MIN + Math.max(0, (people||1) - 4) * 15;
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
        const ventana = reservaVentanaMin(Math.max(people||1, r.people||1));
        return Math.abs(rMin - reqMin) < ventana;
      })
      .map(r => r.tableId)
      .filter(Boolean)
  );
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
  return `
    <select id="reservation-time" onchange="updateReservationTableOptions()">
      ${options.map(t=>`<option value="${t}" ${r.time===t?'selected':''}>${t}</option>`).join('')}
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
  return `
    <select id="reservation-table">
      <option value="">${t('label.notAssigned')}</option>
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

  const clientOptions = `<option value="">${t('label.clientNoRecord')}</option>` + DB.clients.map(c=>`<option value="${c.id}" ${r.clientId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('');

  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editReservation'):t('title.newReservation')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('th.client')}</label>
      <select id="reservation-client">${clientOptions}</select>
    </div>
    <div class="field">
      <label>${t('label.nameIfNoClientRecord')}</label>
      <input type="text" id="reservation-client-name" value="${escapeHtml(r.clientName||'')}" placeholder="${t('ph.nameForReservation')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.date')}</label>
        <input type="date" id="reservation-date" value="${r.date}" onchange="updateReservationTimeOptions()">
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
        <label>${t('label.tablePos')}</label>
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

  // No permitir reservar la misma mesa dos veces con menos de 1h30 de diferencia
  // (más si el grupo es grande, ver reservaVentanaMin).
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
    const isSameClient = (clientId && r.clientId === clientId) || (!clientId && clientName && (r.clientName||'').trim().toLowerCase() === clientName.toLowerCase());
    if(!isSameClient) return false;
    const rMin = reservaTimeToMinutes(r.time), reqMin = reservaTimeToMinutes(time);
    if(rMin == null || reqMin == null) return r.time === time;
    return Math.abs(rMin - reqMin) < reservaVentanaMin(Math.max(people||1, r.people||1));
  });
  if(dupe){
    if(!confirm(t('msg.confirmDuplicateReservation'))) return;
  }

  const existing = id ? DB.reservations.find(x=>x.id===id) : null;
  const status = existing ? existing.status : 'confirmada';

  if(status === 'confirmada' || status === 'pendiente'){
    const turnoIdx = getTurnoIndexForTime(date, time);
    const aforo = parseInt(DB.business.aforo) || 0;
    if(turnoIdx !== null && aforo){
      const yaReservado = getReservedPeopleForTurno(date, turnoIdx, id);
      const turnos = getTurnosForDate(date);
      const turno = turnos[turnoIdx];
      if(yaReservado + people > aforo){
        const ok = confirm(t('msg.confirmOverbookedShift').replace('${range}', `${turno.abre}-${turno.cierra}`).replace('${already}', yaReservado).replace('${wouldBe}', yaReservado + people).replace('${cap}', aforo));
        if(!ok) return;
      }
    }
  }

  if(existing){
    Object.assign(existing, {clientId, clientName, date, time, people, tableId, notes});
  }else{
    DB.reservations.push({id: genId(), clientId, clientName, date, time, people, tableId, notes, status});
  }
  saveDB();
  closeModal();
  renderReservas();
  showToast(t('msg.reservationSaved'));
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
  setReservationArrival(id, !r.llegada);
  renderReservas();
}

function deleteReservation(id){
  if(!confirm(t('msg.confirmDeleteReservation'))) return;
  DB.reservations = DB.reservations.filter(r=>r.id!==id);
  saveDB();
  renderReservas();
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
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  const msg = `Hola ${name}, te recordamos tu reserva en ${bizName} el ${r.date} a las ${r.time} para ${r.people} persona${r.people!==1?'s':''}. ¡Te esperamos!`;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-bell"></i> ${t('title.sendReminderTo')} ${escapeHtml(name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <textarea id="reservation-reminder-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendReservationReminderWhatsapp(${id})" ${!phone?'disabled title="Sin teléfono guardado"':''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendReservationReminderEmail(${id})" ${!email?'disabled title="Sin email guardado"':''}><i class="ti ti-mail"></i> Email</button>
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
}
function sendReservationReminderEmail(id){
  const r = DB.reservations.find(x=>x.id===id);
  if(!r) return;
  const client = r.clientId ? DB.clients.find(c=>c.id===r.clientId) : null;
  if(!client || !client.email){ showToast(t('msg.noEmail')); return; }
  const bizName = (DB.business && DB.business.name) || 'nuestro restaurante';
  const subject = encodeURIComponent('Recordatorio de tu reserva en ' + bizName);
  const body = encodeURIComponent(document.getElementById('reservation-reminder-text').value);
  window.location.href = 'mailto:'+encodeURIComponent(client.email)+'?subject='+subject+'&body='+body;
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

function renderPromocion(){
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
  const box = document.getElementById('promo-tab-content');
  const date = promoDate;
  const salaEmployees = DB.employees.filter(e=>(e.area||'cocina')==='sala');
  const allItems = DB.promos.filter(p => p.fecha === date);
  const items = allItems.filter(p =>
    (!promoFilterResponsable || String(p.responsableId||'')===promoFilterResponsable) &&
    (!promoFilterStatus || (promoFilterStatus==='done' ? p.done : !p.done))
  );

  const listHtml = !allItems.length
    ? `<div class="empty"><i class="ti ti-speakerphone"></i>No hay acciones de promoción para este día.</div>`
    : !items.length
    ? `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`
    : `<div class="grid grid-3">
        ${items.map(p => `
          <div class="card">
            <h3 style="justify-content:space-between;font-size:14px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700">
                <input type="checkbox" ${p.done?'checked':''} onchange="togglePromoDone(${p.id},this.checked)">
                <span style="${p.done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(p.titulo)}</span>
              </label>
            </h3>
            ${p.descripcion ? `<div style="font-size:13px;color:var(--muted)">${escapeHtml(p.descripcion)}</div>` : ''}
            ${p.responsableId ? `<div style="font-size:12px;color:var(--brand-orange);margin-top:4px"><i class="ti ti-user"></i> ${escapeHtml((DB.employees.find(e=>e.id===p.responsableId)||{}).name||'')}</div>` : ''}
            ${p.done && p.doneAt ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">Hecho el ${escapeHtml(new Date(p.doneAt).toLocaleString('es-ES'))}</div>` : ''}
            <div class="actions-cell owner-only" style="margin-top:10px">
              <button class="btn btn-sm btn-icon" onclick="openPromoModal(${p.id})"><i class="ti ti-edit"></i></button>
              <button class="btn btn-sm btn-icon btn-danger" onclick="deletePromo(${p.id})"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        `).join('')}
      </div>`;

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <input type="date" id="promo-filter-date" value="${date}" onchange="promoDate=this.value;renderPromocion()">
        <select onchange="setPromoFilter('resp', this.value)" style="max-width:180px">
          <option value="">Todos los responsables</option>
          ${salaEmployees.map(e=>`<option value="${e.id}" ${promoFilterResponsable===String(e.id)?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
        </select>
        <select onchange="setPromoFilter('status', this.value)" style="max-width:140px">
          <option value="">Todos los estados</option>
          <option value="done" ${promoFilterStatus==='done'?'selected':''}>Hechas</option>
          <option value="pending" ${promoFilterStatus==='pending'?'selected':''}>Pendientes</option>
        </select>
      </div>
      <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> Nueva Acción</button>
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
    const items = DB.promos.filter(p => p.fecha === ds);
    return `
      <td style="vertical-align:top;min-width:140px">
        ${items.map(p => `
          <div style="display:block;padding:4px 8px;border-radius:6px;background:var(--bg-2,#fdf1e7);color:var(--brand-orange);font-weight:700;font-size:12px;text-align:left;cursor:pointer;margin-bottom:4px" onclick="openPromoModal(${p.id})">${escapeHtml(p.titulo)}</div>
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
      <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> Nueva Acción</button>
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

  const counts = {};
  DB.promos.forEach(p => { counts[p.fecha] = (counts[p.fecha]||0) + 1; });

  // Estadísticas rápidas del mes visible: cuánto se ha planificado/hecho, y
  // cuánta biblioteca de ideas queda aún por explorar.
  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthPromos = DB.promos.filter(p => p.fecha.startsWith(monthPrefix));
  const monthDone = monthPromos.filter(p => p.done).length;
  const usedCategories = CONTENT_IDEAS.filter((_, i) => categoryUsedCount(i) > 0).length;

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const count = counts[ds] || 0;
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
        <button class="btn" onclick="printPromoMes(${year},${month})"><i class="ti ti-printer"></i> Imprimir</button>
        <button class="owner-only btn btn-primary" onclick="openPromoModal()"><i class="ti ti-plus"></i> Nueva Acción</button>
      </div>
    </div>
    <div class="grid grid-3" style="margin-bottom:12px">
      <div class="kpi"><div class="label">Acciones este mes</div><div class="value">${monthPromos.length}</div></div>
      <div class="kpi ok"><div class="label">Completadas</div><div class="value">${monthDone} / ${monthPromos.length}</div></div>
      <div class="kpi"><div class="label">Categorías de ideas usadas</div><div class="value">${usedCategories} / ${CONTENT_IDEAS.length}</div></div>
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
    const items = DB.promos.filter(p => p.fecha === ds);
    items.forEach(p => {
      const resp = p.responsableId ? DB.employees.find(e=>e.id===p.responsableId) : null;
      rows.push(`<tr><td>${ds}</td><td>${escapeHtml(p.titulo)}</td><td>${escapeHtml(p.descripcion||'')}</td><td>${resp?escapeHtml(resp.name):'—'}</td><td>${p.done?'✅':'—'}</td></tr>`);
    });
  }
  const win = window.open('', '_blank', 'width=900,height=1000');
  if(!win){ showToast('Permite las ventanas emergentes para imprimir'); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Promoción — ${monthFull(month)} ${year}</title>
  <style>body{font-family:Arial,sans-serif;font-size:10pt;color:#111;padding:12mm}
  h1{font-size:15pt;margin:0 0 10px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
  th{background:#f5f5f3}
  @media print{body{padding:8mm}}</style></head><body>
  <h1>Promoción — ${monthFull(month)} ${year}</h1>
  <table><thead><tr><th>Fecha</th><th>Título</th><th>Descripción</th><th>Responsable</th><th>Hecho</th></tr></thead>
  <tbody>${rows.join('') || '<tr><td colspan="5">Sin acciones este mes.</td></tr>'}</tbody></table>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/* ============================================================
   IDEAS DE CONTENIDO — Biblioteca de formatos para redes sociales,
   pensada para bares, restaurantes y cafeterías. Cada idea se puede
   convertir con un clic en una Acción de Promoción con fecha y responsable.
   ============================================================ */
const CONTENT_IDEAS = [
  { cat: 'Detrás de cámaras', icon: 'ti-video', ideas: [
    { t: 'Un día en la vida del chef o camarero/a', h: 'Vídeo corto desde la apertura hasta el cierre, mostrando el ritmo real de un turno.' },
    { t: 'Cómo se monta la sala antes de abrir', h: 'Time-lapse de mesas, mantelería y luces preparándose para el servicio.' },
    { t: 'El briefing de equipo antes del servicio', h: 'Los minutos previos: qué platos destacar, mesas reservadas, avisos del día.' },
    { t: 'Recibiendo el pedido de proveedores', h: 'Muestra la frescura del producto nada más llegar por la puerta.' },
    { t: 'Preparando la mise en place', h: 'Cortes, salsas y guarniciones listas antes de que lleguen los primeros clientes.' },
    { t: 'Cierre y limpieza al final del día', h: 'Time-lapse del recogido, transmite orden y profesionalidad.' },
    { t: 'Un vistazo a la cocina en pleno rush', h: 'El caos organizado de una hora punta, siempre motivador de ver.' },
    { t: 'Cómo se diseña la carta o el menú del día', h: 'El proceso de pensar combinaciones, precios y nombres de los platos.' },
    { t: 'Probando un plato nuevo antes de sacarlo', h: 'Reacciones sinceras del equipo catando algo antes de que sea oficial.' },
    { t: 'Un día de compras en el mercado', h: 'El chef eligiendo producto de temporada en el mercado o con el proveedor local.' },
    { t: 'Decorando la sala para una fecha especial', h: 'Antes/después de vestir el local para Navidad, San Valentín, etc.' },
    { t: 'La comida del personal (family meal)', h: 'El momento en que el equipo come junto antes de abrir, cercano y humano.' },
  ]},
  { cat: 'Producto — platos y bebidas', icon: 'ti-tools-kitchen-2', ideas: [
    { t: 'Plato del día explicado en 15 segundos', h: 'Ingredientes, punto fuerte y precio, directo a cámara.' },
    { t: 'Cóctel de la semana, paso a paso', h: 'Grabación cenital de la coctelera preparando la receta destacada.' },
    { t: 'Top 3 platos más pedidos este mes', h: 'Ranking con imágenes, genera curiosidad y prueba social.' },
    { t: 'Adivina el ingrediente secreto', h: 'Reto interactivo: el equipo da pistas y el público adivina en comentarios.' },
    { t: 'Del fuego al plato: el emplatado', h: 'Últimos segundos de cocción hasta el emplatado final, muy visual.' },
    { t: 'Maridaje: qué bebida va con cada plato', h: 'Recomendaciones rápidas de vino, cerveza o cóctel para un plato concreto.' },
    { t: '¿Te atreves con el picante?', h: 'Reacciones probando el plato más picante de la carta.' },
    { t: 'ASMR de la preparación', h: 'Sonido del corte, la plancha o la coctelera, sin música, muy relajante.' },
    { t: 'La carta de temporada, plato a plato', h: 'Recorrido breve por cada novedad de la nueva carta.' },
    { t: 'Ingrediente sorpresa: crea algo en directo', h: 'El chef recibe un ingrediente al azar y improvisa una receta.' },
    { t: 'Individual vs. para compartir', h: 'Comparativa visual de raciones, ayuda a decidir qué pedir.' },
    { t: 'La bebida perfecta: copa, hielo y temperatura', h: 'Cómo se sirve correctamente para que sepa mejor.' },
  ]},
  { cat: 'Proceso y elaboración', icon: 'ti-flame', ideas: [
    { t: 'Cómo se hace el pan o la masa madre', h: 'Desde el amasado hasta que sale del horno, con tiempos.' },
    { t: 'Un fondo o caldo casero, de cero a listo', h: 'El paso lento que nadie ve pero que marca la diferencia de sabor.' },
    { t: 'Elaborando un almíbar o infusión para cócteles', h: 'La "elaboración base" del Escandallo, explicada al público.' },
    { t: 'Fermentación o maceración en directo', h: 'Muestra el "antes" de un producto que normalmente solo se ve terminado.' },
    { t: 'El café perfecto: tips de barista', h: 'Molienda, temperatura y tiempo de extracción explicados en 30 segundos.' },
    { t: 'El postre de la casa, paso a paso', h: 'Desde la mezcla hasta el emplatado final del postre estrella.' },
    { t: 'La salsa estrella del restaurante', h: 'Sin desvelar la receta completa, muestra el proceso y el resultado.' },
    { t: 'Ahumado o curado de un producto', h: 'Proceso lento y visual que transmite artesanía.' },
    { t: 'Cómo cuidan y afilan los cuchillos', h: 'Detalle de profesionalidad que sorprende al público no hostelero.' },
    { t: 'Selección del pescado o la carne del día', h: 'Cómo eligen el mejor producto antes de que llegue a la carta.' },
  ]},
  { cat: 'Equipo y personas', icon: 'ti-users', ideas: [
    { t: 'Presentación del chef: quién es y su historia', h: 'Vídeo corto con su trayectoria y qué le apasiona de cocinar.' },
    { t: 'Mini entrevista a cada camarero/a', h: 'Preguntas rápidas: plato favorito, anécdota, por qué le gusta el oficio.' },
    { t: 'Pregúntame lo que quieras (Q&A en directo)', h: 'El equipo responde preguntas del público en historias o directo.' },
    { t: 'Cómo empezó el dueño/a este negocio', h: 'La motivación real detrás de abrir el local, genera cercanía.' },
    { t: 'Aniversario de un empleado en la casa', h: 'Reconocimiento público a la antigüedad y fidelidad del equipo.' },
    { t: 'Un día en la vida del bartender', h: 'Desde la apertura de barra hasta el cierre de caja.' },
    { t: 'El chef reacciona a comentarios de clientes', h: 'Lee reseñas (buenas y constructivas) y responde con humor y respeto.' },
    { t: 'Anécdota graciosa del servicio', h: 'Con permiso de los implicados, una situación divertida del día a día.' },
    { t: 'Quién es quién: el equipo al completo', h: 'Presentación coral de todo el personal, con nombre y puesto.' },
    { t: 'Celebrando un cumpleaños del equipo', h: 'Momento cercano que humaniza la marca.' },
  ]},
  { cat: 'Clientes y comunidad', icon: 'ti-heart', ideas: [
    { t: 'Leyendo reseñas de clientes en voz alta', h: 'El equipo reacciona a comentarios reales de Google/TripAdvisor.' },
    { t: 'Clientes disfrutando (con su permiso)', h: 'Fotos o vídeos espontáneos de mesas felices durante el servicio.' },
    { t: '"El de siempre": un cliente habitual cuenta por qué vuelve', h: 'Testimonio breve y genuino de fidelidad.' },
    { t: 'Reto: foto con el plato y etiquetar al local', h: 'Incentiva contenido generado por el propio cliente (UGC).' },
    { t: 'Testimonio en vídeo tras la comida', h: 'Pregunta rápida a la salida: "¿qué te ha parecido?"' },
    { t: 'Sorpresa a un cliente fiel', h: 'Graba el momento de un descuento o detalle inesperado.' },
    { t: 'Responde las preguntas frecuentes de tus clientes', h: 'Horario, reservas, alérgenos, aparcamiento... en formato ágil.' },
    { t: 'Un cliente elige el menú del día', h: 'Colaboración divertida: un habitual "diseña" el menú de una jornada.' },
    { t: 'Mesa cero: primeras reacciones a un plato nuevo', h: 'Clientes de confianza prueban una novedad antes que nadie.' },
    { t: 'Historias de clientes de toda la vida', h: 'Quién lleva viniendo años y qué ha vivido en el local.' },
  ]},
  { cat: 'Temporada y fechas señaladas', icon: 'ti-calendar-event', ideas: [
    { t: 'Especial San Valentín', h: 'Menú, decoración o detalle romántico para parejas.' },
    { t: 'Especial Navidad y Nochevieja', h: 'Decoración, menú de grupos y últimas mesas disponibles.' },
    { t: 'Halloween: platos y cócteles temáticos', h: 'Nombres y presentación terrorífica para la ocasión.' },
    { t: 'Vuelta al cole: menú rápido de mediodía', h: 'Ideal para familias con poco tiempo entre semana.' },
    { t: 'Verano: bebidas refrescantes y terraza', h: 'Contenido pensado para las horas de más calor.' },
    { t: 'Día del Padre / de la Madre', h: 'Menú especial o detalle de regalo para la ocasión.' },
    { t: 'Black Friday o rebajas de temporada', h: 'Promoción puntual con sensación de urgencia.' },
    { t: 'Semana Santa: menú de cuaresma', h: 'Platos de bacalao, potaje o torrijas de la casa.' },
    { t: 'Fiestas o feria local', h: 'Platos típicos de la zona durante las fiestas del pueblo/barrio.' },
    { t: 'Aniversario del negocio', h: 'Celebración con clientes: tarta, descuentos o sorteo especial.' },
    { t: 'Cambio de carta de temporada', h: '"Despedida" de los platos que se van y bienvenida a los nuevos.' },
  ]},
  { cat: 'Promociones y ofertas', icon: 'ti-discount-2', ideas: [
    { t: 'Happy hour con cuenta atrás', h: 'Historia con temporizador para crear urgencia real.' },
    { t: '2x1 en un cóctel o bebida concreta', h: 'Oferta puntual para atraer tráfico en horas valle.' },
    { t: 'Menú del día explicado (precio y qué incluye)', h: 'Contenido informativo que resuelve la duda más frecuente.' },
    { t: 'Descuento por traer a un amigo nuevo', h: 'Incentiva el boca a boca con una ventaja concreta.' },
    { t: 'Sorteo en redes', h: 'Like + comentario + etiquetar a un amigo para ganar una cena.' },
    { t: 'Oferta relámpago solo en stories', h: 'Válida unas horas, exclusiva para quien vea las historias.' },
    { t: 'Combo especial (entrante + bebida + postre)', h: 'Precio cerrado atractivo para aumentar el ticket medio.' },
    { t: 'Descuento a estudiantes un día concreto', h: 'Fideliza a un público que vuelve varias veces por semana.' },
    { t: '"Trae tu propia taza o vaso"', h: 'Promoción sostenible con descuento simbólico.' },
    { t: 'Últimas raciones antes de cerrar', h: 'Aviso en tiempo real de un plato a punto de agotarse, genera urgencia.' },
  ]},
  { cat: 'Historia y valores', icon: 'ti-book', ideas: [
    { t: 'Por qué el negocio se llama así', h: 'El origen del nombre suele ser una historia bonita y poco contada.' },
    { t: 'La historia del local antes de ser tu negocio', h: 'Qué había antes en ese mismo espacio.' },
    { t: 'La receta familiar que sigue en la carta', h: 'Un plato heredado de un abuelo/a o familiar, con su historia.' },
    { t: 'Por qué eligen a estos proveedores', h: 'Kilómetro cero, calidad o relación de confianza con quien suministra.' },
    { t: 'Los valores del negocio', h: 'Sostenibilidad, producto local, trato humano... explicados con ejemplos reales.' },
    { t: 'Cómo ha evolucionado la carta con los años', h: 'Comparativa de la primera carta con la actual.' },
    { t: 'El objeto con historia del local', h: 'Un cuadro, una silla o una foto antigua con una anécdota detrás.' },
    { t: 'La primera noche de apertura', h: 'Recuerdos y fotos de cuando todo empezó.' },
    { t: 'Premios o certificaciones conseguidas', h: 'Reconocimientos que dan confianza a quien no os conoce.' },
    { t: 'El "por qué" de una sección de la carta', h: 'Qué inspiró a crear ese apartado concreto del menú.' },
  ]},
  { cat: 'Formatos de tendencia', icon: 'ti-trending-up', ideas: [
    { t: 'Audio de moda aplicado a un plato o bebida', h: 'Usa la canción/sonido viral del momento con vuestro producto.' },
    { t: '"POV: eres camarero/a un viernes noche"', h: 'Formato POV muy popular, con humor y ritmo rápido.' },
    { t: 'Reto de comida picante o de ración gigante', h: 'Challenge grabado con reacciones exageradas.' },
    { t: 'Transición "antes de cocinar" → "plato listo"', h: 'Corte seco muy usado en TikTok/Reels, muy efectivo.' },
    { t: 'El equipo puntúa sus propios platos', h: 'Formato "rating" del 1 al 10 con opiniones sinceras.' },
    { t: 'Responder a un comentario con humor', h: 'Convierte un comentario gracioso en un vídeo de respuesta.' },
    { t: '"Get Ready With Me" del local antes de abrir', h: 'Formato GRWM aplicado a preparar la sala/barra.' },
    { t: 'Unboxing de un producto o proveedor nuevo', h: 'Reacción genuina al probar algo que acaba de llegar.' },
    { t: '"Cosas que solo entienden en hostelería"', h: 'Formato relatable que genera muchos comentarios e identificación.' },
    { t: 'Reacciona a una reseña de una estrella', h: 'Con humor y sin faltar al respeto, suele generar mucho engagement.' },
  ]},
  { cat: 'Educativo / tips', icon: 'ti-school', ideas: [
    { t: 'Cómo maridar vino con quesos o platos', h: 'Consejos prácticos y sencillos de aplicar en casa.' },
    { t: 'Cómo se cata un vino correctamente', h: 'Vista, nariz y boca explicados en menos de un minuto.' },
    { t: 'Diferencias entre tipos de café', h: 'Espresso, cortado, americano... explicado con la máquina en mano.' },
    { t: 'Cómo pedir tapas como un local', h: 'Tips pensados también para turistas, muy compartible.' },
    { t: 'Cómo gestionan los alérgenos en el local', h: 'Transmite confianza y seguridad alimentaria.' },
    { t: 'Trucos para conservar sobras en casa', h: 'Contenido de valor que no vende directamente pero genera marca.' },
    { t: 'Qué copa usar para cada bebida', h: 'Guía rápida y visual, muy guardable/compartible.' },
    { t: 'Qué significan los términos de la carta', h: '"Al punto", "poco hecho", "reducción"... explicado sencillo.' },
    { t: 'El origen de un plato típico de la zona', h: 'Curiosidad histórica o cultural sobre un plato de la carta.' },
    { t: 'Producto fresco vs. congelado: cómo distinguirlos', h: 'Consejo útil que además pone en valor vuestro producto fresco.' },
  ]},
  { cat: 'Barra y coctelería', icon: 'ti-glass-cocktail', ideas: [
    { t: 'Flair o técnica de coctelería en directo', h: 'Espectáculo visual detrás de la barra, muy compartible.' },
    { t: 'Mocktail de la casa (sin alcohol)', h: 'Cada vez más demandado, buen contenido inclusivo.' },
    { t: 'La historia de un cóctel clásico', h: 'Origen y anécdota de un cóctel icónico de la carta.' },
    { t: 'Tutorial de decoración de copa (garnish)', h: 'Paso a paso de cómo se monta la guarnición de un cóctel.' },
    { t: 'Cata de cervezas artesanas de la casa', h: 'Presenta variedades poco conocidas de la carta de cervezas.' },
    { t: 'Maridaje de cócteles con tapas', h: 'Recomendaciones cruzadas entre barra y cocina.' },
    { t: 'El tiro perfecto de cerveza', h: 'Ritual de servido correcto, con espuma y temperatura ideal.' },
    { t: 'Cóctel de temporada con fruta de mercado', h: 'Aprovecha producto de temporada también en la barra.' },
    { t: 'Cóctel clásico con un twist propio de la casa', h: 'Vuestra versión personal de un cóctel de toda la vida.' },
    { t: 'Cata a ciegas del propio equipo', h: 'El equipo prueba cócteles sin ver la etiqueta y adivina cuál es cuál.' },
  ]},
  { cat: 'Eventos y experiencias', icon: 'ti-confetti', ideas: [
    { t: 'Música en directo o DJ en el local', h: 'Anuncio con adelanto del ambiente que se van a encontrar.' },
    { t: 'Cata maridaje con el chef', h: 'Evento especial de pago, ideal para promocionar con antelación.' },
    { t: 'Clase de coctelería para clientes', h: 'Experiencia diferencial que genera contenido y ventas extra.' },
    { t: 'Retransmisión de un partido o evento deportivo', h: 'Aviso de ambiente y promoción específica para la ocasión.' },
    { t: 'Noche temática (italiana, mexicana...)', h: 'Menú y ambientación especial durante una noche concreta.' },
    { t: 'Evento privado o de empresa en el local', h: 'Muestra las instalaciones para captar futuras reservas de grupo.' },
    { t: 'Colaboración con otro negocio local', h: 'Foodtruck, bodega o productor invitado un día concreto.' },
    { t: 'Mercadillo o feria gastronómica', h: 'Participación del negocio fuera de sus paredes habituales.' },
    { t: 'Recap del evento del fin de semana', h: 'Mejores momentos montados en un vídeo corto al día siguiente.' },
    { t: 'Montaje del escenario o equipo de sonido', h: 'Detrás de cámaras preparando un evento en directo.' },
  ]},
  { cat: 'Sostenibilidad y proveedores', icon: 'ti-leaf', ideas: [
    { t: 'Visita al proveedor o productor local', h: 'Muestra de dónde viene realmente el producto que sirven.' },
    { t: 'Cómo reducen el desperdicio alimentario', h: 'Prácticas reales de aprovechamiento, genera buena imagen.' },
    { t: 'Producto de temporada explicado', h: 'Por qué ahora sí está en carta y en otra época del año no.' },
    { t: 'Reciclaje o compostaje en el local', h: 'Detalle sostenible que valoran cada vez más los clientes.' },
    { t: 'Packaging sostenible para delivery', h: 'Envases reciclables o reutilizables usados en los pedidos para llevar.' },
    { t: 'Colaboración con productores de la zona', h: 'Queso, vino, embutido... con nombre y cara del productor.' },
    { t: 'Menú de aprovechamiento', h: 'Un plato hecho con excedente del día anterior, explicando la filosofía anti-desperdicio.' },
    { t: 'Reducción de plástico de un solo uso en barra', h: 'Pajitas, agitadores o vasos reutilizables como gesto sostenible.' },
  ]},
  { cat: 'Humor y entretenimiento', icon: 'ti-mood-smile', ideas: [
    { t: 'Sketch cómico sobre un cliché de hostelería', h: 'Situaciones exageradas que todo el mundo reconoce.' },
    { t: '"Cosas que nunca le digas a un camarero"', h: 'Lista humorística basada en situaciones reales del servicio.' },
    { t: 'Blooper o momento gracioso del servicio', h: 'Con permiso de los implicados, un fallo divertido y sin mala imagen.' },
    { t: 'Meme propio sobre un plato o el día a día', h: 'Contenido ligero que humaniza la marca y genera comentarios.' },
    { t: 'Canción o rap improvisado sobre el menú', h: 'Formato divertido y muy compartible si sale bien.' },
    { t: 'El cliente indeciso', h: 'Sketch sobre esa persona que tarda diez minutos en elegir plato.' },
    { t: '"Sin gluten, pero ponme pan"', h: 'Situaciones contradictorias reales del servicio, contadas con cariño.' },
    { t: 'Traducciones graciosas de la carta', h: 'Errores de traducción reales (o inventados) de un menú a otro idioma.' },
  ]},
  { cat: 'Delivery y para llevar', icon: 'ti-package', ideas: [
    { t: 'Cómo llega tu pedido: el packaging por dentro', h: 'Muestra el cuidado con el que preparáis cada pedido a domicilio.' },
    { t: 'Qué platos viajan mejor a domicilio', h: 'Recomendaciones para acertar al pedir para llevar.' },
    { t: 'Cómo recalentar en casa sin perder calidad', h: 'Tips prácticos que mejoran la experiencia post-compra.' },
    { t: 'Oferta especial solo para pedidos por delivery', h: 'Incentiva el canal de reparto en horas valle.' },
    { t: 'Mismo plato en sala vs. en el envase de reparto', h: 'Comparativa honesta que genera confianza.' },
    { t: 'El repartidor recogiendo el pedido', h: 'Colaboración con la app de delivery, cercano y transparente.' },
    { t: 'Reseña de un cliente de delivery', h: 'Testimonio leído en directo sobre un pedido a domicilio.' },
    { t: 'Plato exclusivo para la carta de delivery', h: 'Algo pensado específicamente para llevar, no solo para sala.' },
    { t: 'Pedir por WhatsApp o web y ahorrar comisión', h: 'Explica la alternativa directa a las apps de reparto.' },
    { t: 'Un pedido grande para oficina o evento', h: 'Detrás de cámaras preparando un pedido corporativo grande.' },
  ]},
  { cat: 'Reservas y disponibilidad', icon: 'ti-calendar-check', ideas: [
    { t: 'Quedan pocas mesas para esta noche', h: 'Aviso puntual que genera urgencia real (solo si es cierto).' },
    { t: 'Cómo reservar en 30 segundos', h: 'Tutorial rápido del proceso de reserva (web, teléfono, redes).' },
    { t: 'Ventajas de reservar frente a venir sin avisar', h: 'Explica por qué conviene asegurar mesa en días de mucha gente.' },
    { t: 'Mesa libre de última hora por cancelación', h: 'Aprovecha una baja para llenar el hueco al momento.' },
    { t: 'Recuerda que se puede reservar terraza', h: 'Muchos clientes no saben que existe esa opción concreta.' },
    { t: 'Esta semana casi completo, no te quedes sin sitio', h: 'Aviso de ocupación alta para animar a reservar con tiempo.' },
    { t: 'Cómo modificar o cancelar tu reserva', h: 'Tutorial breve que reduce llamadas y confusiones.' },
    { t: 'Aforo limitado para una fecha señalada', h: 'Nochevieja, San Valentín... aviso de plazas limitadas.' },
    { t: 'Reservas para grupos grandes: qué necesitáis saber', h: 'Condiciones, anticipación y menú cerrado para grupos.' },
    { t: 'Apúntate a la lista de espera', h: 'Explica que merece la pena esperar aunque parezca completo.' },
  ]},
  { cat: 'Salud, dietas y opciones especiales', icon: 'ti-apple', ideas: [
    { t: 'Opciones veganas o vegetarianas de la carta', h: 'Recorrido por los platos aptos, con foto de cada uno.' },
    { t: 'Platos sin gluten y cómo evitáis la contaminación cruzada', h: 'Genera confianza real en clientes celíacos.' },
    { t: 'Opciones más ligeras o bajas en calorías', h: 'Útil para quien busca comer fuera cuidándose.' },
    { t: 'Menú keto o bajo en carbohidratos', h: 'Si el negocio lo ofrece, un nicho con demanda creciente.' },
    { t: 'Cómo adaptáis un plato ante una intolerancia', h: 'Muestra flexibilidad real del equipo de cocina.' },
    { t: 'Beneficios nutricionales de un ingrediente estrella', h: 'Contenido educativo ligado directamente a vuestra carta.' },
    { t: 'Opciones bajas en azúcar para diabéticos', h: 'Nicho poco cubierto por la competencia, gran valor percibido.' },
    { t: 'Menú infantil saludable', h: 'Tranquiliza a familias que buscan algo más que fritos para niños.' },
    { t: 'Ingredientes ecológicos o de cultivo propio', h: 'Si tenéis huerto propio o proveedores ecológicos certificados.' },
    { t: 'Cómo equilibráis sabor y salud en un plato', h: 'La reflexión del chef detrás de una receta "sana pero rica".' },
  ]},
  { cat: 'Comparativas y listas', icon: 'ti-list-numbers', ideas: [
    { t: 'Top 5 platos para probar si es tu primera vez', h: 'Guía de bienvenida para clientes nuevos.' },
    { t: '"Si te gusta X, prueba Y"', h: 'Recomendaciones cruzadas basadas en gustos conocidos.' },
    { t: 'Los 3 cócteles más pedidos de la temporada', h: 'Ranking con datos reales de ventas, genera curiosidad.' },
    { t: 'Comparativa de raciones: precio y cantidad', h: 'Ayuda a decidir entre individual, media ración o para compartir.' },
    { t: 'Ranking de los postres más fotografiados', h: 'Aprovecha el atractivo visual para animar a pedirlos.' },
    { t: 'Cómo ha cambiado la carta este año', h: 'Comparativa de novedades frente a la carta anterior.' },
    { t: '5 razones para venir esta semana', h: 'Lista dinámica que combina novedades, eventos y promos.' },
    { t: 'Lo más pedido por turistas vs. por locales', h: 'Curiosidad que genera comentarios y comparaciones.' },
    { t: 'Menú del día vs. fin de semana vs. grupos', h: 'Comparativa clara de las distintas opciones disponibles.' },
    { t: 'Los platos favoritos... del propio equipo', h: 'Qué pide el personal cuando come en su día libre.' },
  ]},
  { cat: 'Por franja horaria', icon: 'ti-clock', ideas: [
    { t: 'Qué pedir para desayunar rápido antes de trabajar', h: 'Propuesta ágil para el desayuno de entre semana.' },
    { t: 'Brunch de fin de semana', h: 'Carta especial más relajada para sábados y domingos.' },
    { t: 'Menú de mediodía para una pausa corta', h: 'Pensado para quien tiene poco tiempo para comer.' },
    { t: 'La merienda perfecta con café o té de la casa', h: 'Propuesta dulce para la media tarde.' },
    { t: 'Aperitivo de media tarde-noche', h: 'Algo para picar antes de la cena, con bebida recomendada.' },
    { t: 'Cena tranquila entre semana', h: 'Propuesta ligera para quien no quiere una cena copiosa un día laborable.' },
    { t: 'La última copa antes de cerrar', h: 'Ambiente de última hora, tranquilo y con buena música.' },
    { t: 'Plan de domingo: comida larga y sobremesa', h: 'Propuesta pensada para quedarse charlando sin prisa.' },
    { t: 'Desayuno especial de fin de semana', h: 'Algo más elaborado que entre semana, con más tiempo para disfrutarlo.' },
    { t: 'Menú nocturno después de un evento cercano', h: 'Para quien sale de un concierto o cine y busca cenar tarde.' },
  ]},
  { cat: 'Encuestas e interacción', icon: 'ti-message-2', ideas: [
    { t: 'Encuesta en historias: ¿cuál prefieres, A o B?', h: 'Formato rápido de interacción con dos opciones visuales.' },
    { t: 'Vota el próximo plato que entra en carta', h: 'Involucra a la audiencia en una decisión real del negocio.' },
    { t: '¿Qué plato quieres que traigamos de vuelta?', h: 'Pregunta abierta que recupera nostalgia por platos antiguos.' },
    { t: 'Trivia gastronómica sobre vuestra cocina', h: 'Preguntas curiosas relacionadas con vuestros platos o bebidas.' },
    { t: 'Adivina el precio de un plato', h: 'Juego sencillo que genera muchos comentarios.' },
    { t: 'Encuesta de horario: ¿abrimos los domingos?', h: 'Decisión real del negocio consultada a la comunidad.' },
    { t: 'Buzón de preguntas para el chef o el equipo', h: 'Caja de preguntas en historias, responded en un vídeo recopilatorio.' },
    { t: 'Elige el nombre de nuestro nuevo cóctel', h: 'Dinámica colaborativa que genera pertenencia a la marca.' },
    { t: 'Test: ¿qué tipo de cliente eres?', h: 'Formato ligero con resultados divertidos y compartibles.' },
    { t: 'Cuenta atrás para una novedad', h: 'Genera expectativa antes de lanzar un plato, carta o evento.' },
  ]},
  { cat: 'Días mundiales y efemérides gastronómicas', icon: 'ti-stars', ideas: [
    { t: 'Día Mundial de la Pizza (9 de febrero)', h: 'Si tenéis pizza en carta, promoción o receta especial ese día.' },
    { t: 'Día Internacional del Café (1 de octubre)', h: 'Contenido sobre vuestro café, tueste u origen.' },
    { t: 'Día Mundial del Vino (fecha variable, comprobar cada año)', h: 'Recomendación de maridaje o cata especial.' },
    { t: 'Día de la Hamburguesa (28 de mayo)', h: 'Promoción o receta destacada si tenéis hamburguesas en carta.' },
    { t: 'Día Mundial de la Cerveza (primer viernes de agosto)', h: 'Cata o promoción de vuestras cervezas de barril/artesanas.' },
    { t: 'Día Mundial del Chocolate (7 de julio)', h: 'Postre especial o promoción temática de chocolate.' },
    { t: 'Día de la Tapa (fecha variable según ciudad)', h: 'Buen momento para destacar vuestras tapas de autor.' },
    { t: 'Día Mundial de la Gastronomía (18 de octubre)', h: 'Contenido sobre vuestra filosofía culinaria o historia.' },
    { t: 'Día Mundial del Cóctel o de un cóctel concreto', h: 'Muchos cócteles clásicos tienen su propio día (comprobar fecha).' },
    { t: 'Día Mundial del Sushi (18 de junio)', h: 'Si tenéis oferta de sushi o fusión asiática en carta.' },
    { t: 'Día Mundial sin Alcohol', h: 'Buen momento para promocionar vuestros mocktails y bebidas sin alcohol.' },
    { t: 'Efeméride o plato típico local', h: 'Muchas regiones tienen su propio "día de..." para un plato tradicional; aprovechadlo si aplica.' },
  ]},
  { cat: 'Grupos, celebraciones y eventos privados', icon: 'ti-users-group', ideas: [
    { t: 'Menú especial para cumpleaños en grupo', h: 'Propuesta cerrada pensada para celebraciones.' },
    { t: 'Paquete para despedidas de soltero/a', h: 'Menú, ambientación o detalle especial para el grupo.' },
    { t: 'Menú de comunión o celebración familiar', h: 'Propuesta específica para este tipo de eventos.' },
    { t: 'Cómo organizar una cena de empresa', h: 'Explica el proceso, precios y opciones disponibles.' },
    { t: 'Detalle de bienvenida para grupos grandes', h: 'Un pequeño gesto que marca la diferencia en la experiencia.' },
    { t: 'Menú de Navidad para grupos y empresas', h: 'Promoción con antelación suficiente para reservar diciembre.' },
    { t: 'Tarta o postre personalizado para ocasiones especiales', h: 'Servicio añadido que puede generar ingresos extra.' },
    { t: 'Espacio privado o reservado disponible', h: 'Muestra la sala o reservado para eventos exclusivos.' },
    { t: 'Decoración de una mesa para un cumpleaños sorpresa', h: 'Detrás de cámaras montando una sorpresa para un cliente.' },
    { t: 'Detalle especial para el homenajeado del grupo', h: 'Postre gratis, foto de recuerdo o vela de cumpleaños.' },
  ]},
  { cat: 'Accesibilidad, familias y mascotas', icon: 'ti-accessible', ideas: [
    { t: 'Menú infantil: qué incluye y precio', h: 'Información práctica para familias que buscan dónde comer con niños.' },
    { t: 'Trona o zona para bebés disponible', h: 'Detalle que facilita la decisión a familias con bebés.' },
    { t: 'Aquí sí se admiten mascotas', h: 'Foto de un perro en la terraza, muy compartido por dueños de mascotas.' },
    { t: 'Accesibilidad para sillas de ruedas', h: 'Rampas, baños adaptados y mesas accesibles.' },
    { t: 'Zona tranquila con wifi y enchufes', h: 'Útil para quien quiere trabajar o estudiar un rato.' },
    { t: 'Aparcamiento cercano o facilidades de acceso', h: 'Información práctica que resuelve una duda frecuente.' },
    { t: 'Actividades para niños mientras esperan', h: 'Lápices, juegos o menú para colorear en la mesa.' },
    { t: 'Menús adaptados para personas mayores', h: 'Raciones y texturas pensadas para ese público.' },
    { t: 'Normas básicas del espacio pet-friendly', h: 'Transparencia sobre dónde y cómo pueden estar las mascotas.' },
    { t: 'Espacio para carritos de bebé', h: 'Detalle práctico que agradecen mucho las familias.' },
  ]},
  { cat: 'Reclutamiento y vida laboral', icon: 'ti-briefcase', ideas: [
    { t: '"Estamos contratando"', h: 'Puesto, requisitos y cómo apuntarse, con buena presentación visual.' },
    { t: 'Un día de prueba de un nuevo empleado', h: 'Muestra el ambiente de trabajo desde dentro.' },
    { t: 'Por qué trabajar en este equipo', h: 'Testimonios internos sinceros sobre el ambiente laboral.' },
    { t: 'Beneficios de trabajar aquí', h: 'Horarios, formación, ambiente... lo que os diferencia como empleador.' },
    { t: 'Cómo es el proceso de selección', h: 'Transparencia que atrae a mejores candidatos.' },
    { t: 'Nueva incorporación al equipo', h: 'Bienvenida pública que también genera cercanía con el cliente.' },
    { t: 'Formación interna a un nuevo camarero/a', h: 'Muestra el cuidado que ponéis en formar a vuestro personal.' },
    { t: 'De becario/a a jefe/a de sala', h: 'Historia de crecimiento interno, muy inspiradora.' },
  ]},
  { cat: 'Reseñas y reputación online', icon: 'ti-star', ideas: [
    { t: 'Cómo dejar una reseña en Google en 30 segundos', h: 'Tutorial que facilita conseguir más reseñas.' },
    { t: 'Agradecimiento a quien deja una reseña de 5 estrellas', h: 'Reconocimiento público que anima a otros a hacerlo.' },
    { t: 'Reacción del equipo a la mejor reseña del mes', h: 'Formato divertido y cercano de compartir feedback positivo.' },
    { t: 'Cómo responden a una crítica constructiva', h: 'Muestra profesionalidad y ganas de mejorar.' },
    { t: 'Reseña destacada convertida en post visual', h: 'Cita textual de un cliente con buen diseño.' },
    { t: 'Invitación a dejar reseña con un pequeño detalle', h: 'Incentivo dentro de la normativa de la plataforma usada.' },
    { t: 'Antes y después de mejoras tras el feedback', h: 'Demuestra que escucháis y aplicáis lo que dicen los clientes.' },
    { t: 'Menciones en prensa o medios locales', h: 'Comparte reconocimientos externos que dan credibilidad.' },
  ]},
  { cat: 'Oportunismo y actualidad', icon: 'ti-cloud', ideas: [
    { t: 'Día de lluvia: plan perfecto con algo calentito', h: 'Aprovecha el tiempo meteorológico real del día.' },
    { t: 'Ola de calor: bebida o helado destacado', h: 'Contenido reactivo a la temperatura del momento.' },
    { t: 'Aprovechar un partido importante', h: 'Ambiente del bar para ver el evento deportivo del día.' },
    { t: 'Festivo inesperado o puente', h: 'Aviso de horario especial cuando cambia lo habitual.' },
    { t: 'Tendencia de actualidad aplicada con buen gusto', h: 'Sube al tren de una conversación del momento, con cuidado.' },
    { t: '"Lunes de vuelta al trabajo"', h: 'Oferta o mensaje que anima a arrancar bien la semana.' },
    { t: 'Apertura especial un día que normalmente cerráis', h: 'Aviso puntual de un cambio de horario excepcional.' },
    { t: 'Reacción con humor a un titular de actualidad gastronómica', h: 'Contenido oportunista y ligero, siempre con cuidado.' },
  ]},
  { cat: 'Google Business y reseñas', icon: 'ti-brand-google', ideas: [
    { t: 'Responder las reseñas nuevas de Google', h: 'Tarea de mantenimiento (no contenido creativo): revisa y contesta lo que dejen esta semana.' },
    { t: 'Responder a una reseña negativa con profesionalidad', h: 'Sin discutir: agradecer, pedir disculpas si procede y ofrecer solucionarlo fuera de la reseña.' },
    { t: 'Actualizar el horario en Google si cambia', h: 'Festivos, vacaciones o cambios de temporada — evita que llegue gente con el negocio cerrado.' },
    { t: 'Subir fotos nuevas al perfil de Google Business', h: 'Fotos recientes de platos, sala o fachada; los perfiles con fotos actualizadas destacan más.' },
    { t: 'Publicar una novedad como "Google Post"', h: 'Oferta, evento o plato nuevo publicado directamente en la ficha de Google.' },
    { t: 'Revisar que los datos del perfil sean correctos', h: 'Teléfono, dirección, web y enlace de reservas al día.' },
    { t: 'Comprobar la carta/menú de Google', h: 'Que los platos, precios y fotos del menú en Google coincidan con la carta real.' },
    { t: 'Pedir reseña a los últimos clientes', h: 'Mensaje directo (WhatsApp/email) a quien ha visitado recientemente, con el enlace directo a Google.' },
    { t: 'Revisar preguntas y respuestas públicas del perfil', h: 'La gente pregunta cosas ahí (horario, aparcamiento...); contestar rápido da buena imagen.' },
    { t: 'Comprobar atributos del negocio en Google', h: 'Pet-friendly, accesible en silla de ruedas, terraza, wifi... marcados correctamente.' },
    { t: 'Verificar que el local aparece bien situado en Google Maps', h: 'Un pin mal ubicado hace perder clientes que no encuentran el sitio.' },
    { t: 'Responder mensajes recibidos por Google', h: 'El chat de Google Business Profile también necesita revisión periódica.' },
  ]},
  { cat: 'Redes sociales — gestión y mantenimiento', icon: 'ti-share', ideas: [
    { t: 'Actualizar biografía y enlace de Instagram/Facebook', h: 'Que el enlace de la bio lleve a la web, carta o reservas actuales, no a algo desactualizado.' },
    { t: 'Revisar y responder mensajes directos pendientes', h: 'Tarea de mantenimiento: vaciar la bandeja de DMs sin contestar.' },
    { t: 'Comprobar que el horario esté al día en Facebook', h: 'Facebook tiene su propio horario, independiente del de Google.' },
    { t: 'Planificar las publicaciones de la semana', h: 'Bloque de tiempo fijo para programar contenido con antelación, no improvisar cada día.' },
    { t: 'Responder comentarios pendientes en publicaciones antiguas', h: 'Revisión periódica de comentarios que se quedaron sin respuesta.' },
    { t: 'Actualizar los destacados de Instagram (Stories)', h: 'Menú, horario, ubicación y promos siempre visibles y actualizados en el perfil.' },
    { t: 'Repostear contenido en el que os etiquetan clientes', h: 'Aprovechar el contenido que generan los propios clientes (UGC).' },
    { t: 'Comprobar que los enlaces de reserva/pedido funcionan', h: 'Revisión rápida de que el botón de reservar o pedir online no esté roto.' },
    { t: 'Revisar qué publicaciones han funcionado mejor', h: 'Repasar estadísticas del mes para repetir lo que mejor funciona.' },
    { t: 'Actualizar el catálogo de Instagram/Facebook Shop', h: 'Si vendéis productos propios (salsas, mercancía...) mantenerlo al día.' },
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
        <i class="ti ti-bulb"></i> ${contentIdeasTotalCount()} ideas de contenido y gestión online, listas para usar. Elige una categoría, y cuando tengas clara una, pulsa "Crear acción" para planificarla con fecha y responsable.
      </p>
      <button class="owner-only btn btn-primary" style="margin-bottom:14px" onclick="surprisePromoIdea()"><i class="ti ti-dice"></i> Sorpréndeme (idea rápida para hoy)</button>
      <div class="grid grid-3">
        ${CONTENT_IDEAS.map((c, i) => {
          const used = categoryUsedCount(i);
          return `
          <div class="card" style="cursor:pointer" onclick="openPromoIdeasCategory(${i})">
            <h3><i class="ti ${c.icon}"></i> ${escapeHtml(c.cat)}</h3>
            <div style="font-size:12px;color:var(--muted)">${c.ideas.length} ideas${used?` · <span style="color:var(--brand-orange)">${used} usada${used!==1?'s':''}</span>`:''}</div>
          </div>
        `;}).join('')}
      </div>
    `;
  } else {
    const c = CONTENT_IDEAS[promoIdeasCategory];
    box.innerHTML = `
      <button class="btn btn-sm" style="margin-bottom:10px" onclick="promoIdeasCategory=null;renderPromoIdeas()"><i class="ti ti-arrow-left"></i> Categorías</button>
      <h3 style="margin-bottom:10px"><i class="ti ${c.icon}"></i> ${escapeHtml(c.cat)}</h3>
      <div class="grid grid-3">
        ${c.ideas.map((idea, ideaIdx) => {
          const usage = promoIdeaUsage(promoIdeasCategory, ideaIdx);
          return `
          <div class="card">
            <h3 style="font-size:14px">${escapeHtml(idea.t)}</h3>
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${escapeHtml(idea.h)}</div>
            ${usage.length ? `<div style="font-size:11px;color:var(--brand-orange);margin-bottom:8px"><i class="ti ti-check"></i> Usada el ${escapeHtml(usage[0].fecha)}${usage.length>1?` (y ${usage.length-1} vez${usage.length-1!==1?'es':''} más)`:''}</div>` : ''}
            <button class="owner-only btn btn-sm btn-primary" style="width:100%" onclick="createPromoFromIdea(${promoIdeasCategory},${ideaIdx})"><i class="ti ti-plus"></i> Crear acción</button>
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
  openPromoModal(null, promoDate || todayStr(), {titulo: idea.t, descripcion: idea.h, ideaRef: {cat: catIdx, idx: ideaIdx}});
}

// Mensajes preconfigurados para la interacción post-servicio con el cliente
// (cumpleaños, reseñas, clientes que hace tiempo no vienen).
const PROMO_MESSAGE_TEMPLATES = {
  cumple: (c, biz) => `¡Feliz cumpleaños, ${c.name}! 🎉 Todo el equipo de ${biz} te desea un día genial. Ven a celebrarlo con nosotros, ¡te invitamos a un postre o una bebida! 🎂🥂`,
  resena: (c, biz) => `¡Hola ${c.name}! Gracias por tu visita a ${biz} 🙏 Si te ha gustado la experiencia, nos ayudaría mucho que nos dejaras una breve reseña. ¡Gracias de corazón!`,
  vuelve: (c, biz) => `¡Hola ${c.name}! Hace tiempo que no te vemos por ${biz} y te echamos de menos 😊 Si te apetece volver, nos encantaría tenerte de nuevo por aquí. ¡Un saludo!`
};
const PROMO_MESSAGE_SUBJECTS = {
  cumple: '¡Feliz cumpleaños! 🎉',
  resena: '¿Nos dejas una reseña?',
  vuelve: 'Te echamos de menos'
};

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

function renderPromoClientes(){
  const box = document.getElementById('promo-tab-content');
  const today = new Date(); today.setHours(0,0,0,0);

  const birthdays = DB.clients
    .map(c => ({c, days: nextBirthdayDays(c.cumpleanos)}))
    .filter(x => x.days !== null && x.days <= 30)
    .sort((a,b) => a.days - b.days);

  const withContact = DB.clients.filter(c => c.phone || c.email);
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
        <button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!c.phone?'disabled title="Sin teléfono guardado"':''}><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
        <button class="btn btn-sm" style="flex:1" onclick="openClientMessageModal(${c.id}, '${templateKey}')" ${!c.email?'disabled title="Sin email guardado"':''}><i class="ti ti-mail"></i> Email</button>
      </div>
      <button class="owner-only btn btn-sm" style="width:100%;margin-top:6px" ${registered?'disabled':''} onclick="registerClientOutreachAsPromo(${c.id},'${templateKey}')"><i class="ti ${registered?'ti-check':'ti-calendar-plus'}"></i> ${registered?'Ya registrada hoy':'Registrar como acción'}</button>
    </div>
  `;};

  box.innerHTML = `
    <p style="font-size:13px;color:var(--muted);margin-bottom:14px"><i class="ti ti-info-circle"></i> Acciones rápidas de fidelización: felicitar cumpleaños, pedir reseñas tras la visita e invitar a volver a clientes que hace tiempo no vienen. Los mensajes ya están escritos, listos para enviar por WhatsApp o email.</p>

    <h3><i class="ti ti-cake"></i> Próximos cumpleaños (30 días)</h3>
    <div class="grid grid-3" style="margin-bottom:18px">
      ${birthdays.length ? birthdays.map(({c,days}) => clientCard(c, 'cumple', days===0 ? '<span class="badge badge-amber">¡Hoy!</span>' : `<span class="badge badge-gray">en ${days} día${days!==1?'s':''}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-cake"></i>Sin cumpleaños en los próximos 30 días.</div>`}
    </div>

    <h3><i class="ti ti-star"></i> Visitas recientes — pedir reseña</h3>
    <div class="grid grid-3" style="margin-bottom:18px">
      ${recientes.length ? recientes.map(({c,days}) => clientCard(c, 'resena', `<span class="badge badge-green">hace ${days===0?'hoy':days+' día'+(days!==1?'s':'')}</span>`)).join('')
        : `<div class="empty"><i class="ti ti-star"></i>Sin visitas recientes con datos de contacto.</div>`}
    </div>

    <h3><i class="ti ti-mood-empty"></i> Clientes que hace tiempo no vienen</h3>
    <div class="grid grid-3">
      ${inactivos.length ? inactivos.slice(0,12).map(({c,days}) => clientCard(c, 'vuelve', days!=null ? `<span class="badge badge-gray">${days} días</span>` : '<span class="badge badge-gray">sin visitas</span>')).join('')
        : `<div class="empty"><i class="ti ti-users"></i>No hay clientes inactivos.</div>`}
    </div>
  `;
}

// Abre un mensaje preconfigurado (cumpleaños, reseña, recuperación de cliente) listo
// para enviar por WhatsApp/SMS o email, igual que en el premio de fidelidad.
function openClientMessageModal(clientId, templateKey){
  const c = DB.clients.find(x=>x.id===clientId);
  if(!c) return;
  const biz = (DB.business && DB.business.name) || 'nuestro restaurante';
  const msg = PROMO_MESSAGE_TEMPLATES[templateKey](c, biz);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-message"></i> Mensaje para ${escapeHtml(c.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <textarea id="promo-msg-text" rows="4">${escapeHtml(msg)}</textarea>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366" onclick="sendPromoClientWhatsapp(${clientId})" ${!c.phone?'disabled title="Sin teléfono guardado"':''}><i class="ti ti-brand-whatsapp"></i> WhatsApp / SMS</button>
      <button class="btn" style="flex:1" onclick="sendPromoClientEmail(${clientId}, '${escapeJsAttr(PROMO_MESSAGE_SUBJECTS[templateKey]||'')}')" ${!c.email?'disabled title="Sin email guardado"':''}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cerrar</button>
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
  cumple: 'Felicitar cumpleaños a', resena: 'Pedir reseña a', vuelve: 'Recuperar cliente inactivo:'
};
function registerClientOutreachAsPromo(clientId, templateKey){
  const c = DB.clients.find(x=>x.id===clientId);
  if(!c) return;
  const now = new Date();
  DB.promos.push({
    id: genId(), fecha: todayStr(),
    titulo: `${CLIENT_OUTREACH_LABELS[templateKey]||'Contactar a'} ${c.name}`,
    descripcion: 'Acción de fidelización de clientes (Promoción → Clientes).',
    responsableId: null, done: true, doneAt: now.toISOString(), zona: currentArea(),
    clienteId: clientId, ideaRef: {clientTemplate: templateKey}
  });
  saveDB();
  renderPromoClientes();
  showToast('Acción registrada en el calendario de Promoción');
}

// Guarda el ideaRef de la idea de contenido con la que se abrió el modal
// (si viene de "Crear acción"/"Sorpréndeme"), para que savePromo lo adjunte
// al crear la promo y así poder marcar esa idea como ya usada.
let pendingPromoIdeaRef = null;
function openPromoModal(id, fecha, prefill){
  const p = id ? DB.promos.find(x=>x.id===id) : {fecha: fecha || promoDate || todayStr(), titulo:(prefill&&prefill.titulo)||'', descripcion:(prefill&&prefill.descripcion)||'', responsableId:null};
  pendingPromoIdeaRef = (!id && prefill && prefill.ideaRef) ? prefill.ideaRef : null;
  const ro = !editUnlocked;
  const dis = ro ? 'disabled' : '';

  openModal(`
    <div class="modal-header">
      <h3>${id?'Editar':'Nueva'} Acción de Promoción</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Fecha</label>
      <input type="date" id="promo-date" value="${p.fecha}" ${dis}>
    </div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="promo-titulo" value="${escapeHtml(p.titulo||'')}" placeholder="Ej: Responder reseñas, vídeo de un plato..." ${dis}>
    </div>
    <div class="field">
      <label>Descripción</label>
      <textarea id="promo-descripcion" placeholder="Detalles de la acción..." ${dis}>${escapeHtml(p.descripcion||'')}</textarea>
    </div>
    <div class="field">
      <label>Responsable</label>
      <select id="promo-responsable" ${dis}>
        <option value="">— Sin asignar —</option>
        ${DB.employees.filter(e=>(e.area||'cocina')==='sala').map(e=>`<option value="${e.id}" ${p.responsableId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${ro?'Cerrar':'Cancelar'}</button>
      ${ro ? '' : `<button class="btn btn-primary" onclick="savePromo(${id||'null'})">${t("common.save")}</button>`}
    </div>
  `);
}

function savePromo(id){
  const fecha = document.getElementById('promo-date').value || todayStr();
  const titulo = document.getElementById('promo-titulo').value.trim();
  const descripcion = document.getElementById('promo-descripcion').value.trim();
  const responsableIdRaw = document.getElementById('promo-responsable').value;
  const responsableId = responsableIdRaw ? parseInt(responsableIdRaw) : null;

  if(!titulo){ showToast(t('msg.indicateTitle')); return; }

  const isDuplicate = DB.promos.some(p => p.id!==id && p.fecha===fecha && p.titulo.toLowerCase()===titulo.toLowerCase() && p.responsableId===responsableId);

  if(id){
    const promo = DB.promos.find(x=>x.id===id);
    if(!promo){ showToast(t('msg.promoNotFound')); return; }
    Object.assign(promo, {fecha, titulo, descripcion, responsableId});
  }else{
    DB.promos.push({id: genId(), fecha, titulo, descripcion, responsableId, done:false, doneAt:null, zona:'sala', ideaRef: pendingPromoIdeaRef});
  }
  pendingPromoIdeaRef = null;
  saveDB();
  closeModal();
  renderPromocion();
  showToast(isDuplicate ? 'Guardado — ya había otra acción igual ese día para esa persona' : t('msg.actionSaved'));
}

function deletePromo(id){
  if(!confirm(t('msg.confirmDeletePromotion'))) return;
  DB.promos = DB.promos.filter(p=>p.id!==id);
  saveDB();
  renderPromocion();
}

/* ============================================================
   MI NEGOCIO — Datos del establecimiento
   ============================================================ */
const BUSINESS_TIPOS = ['Restaurante','Bar','Cafetería','Brasería','Cervecería','Gastrobar','Catering','Food truck','Otro'];

// Renderiza los campos de un tramo (seguido o turno): horas de apertura/cierre.
function renderTramoFields(prefix, tramo, label){
  tramo = tramo || {};
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="font-size:12px;color:var(--muted);min-width:52px">${label}</span>
      <input type="time" id="${prefix}-ini" value="${escapeHtml(tramo.ini||'')}" style="padding:4px 6px;font-size:13px;width:auto;min-height:auto" onchange="saveBusiness(true)">
      <span style="color:var(--muted);font-size:12px">a</span>
      <input type="time" id="${prefix}-fin" value="${escapeHtml(tramo.fin||'')}" style="padding:4px 6px;font-size:13px;width:auto;min-height:auto" onchange="saveBusiness(true)">
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
          ${DIAS_SEMANA[i]}
        </label>
        <select id="mn-hor-${i}-modo" onchange="toggleHorarioModo(${i})" style="padding:2px 4px;font-size:11px;width:auto;min-height:auto;display:${d.abierto!==false?'inline-block':'none'}">
          <option value="turnos" ${!modoSeguido?'selected':''}>Por turnos</option>
          <option value="seguido" ${modoSeguido?'selected':''}>Seguido</option>
        </select>
      </div>
      <div id="mn-hor-${i}-turnos" style="display:${d.abierto!==false?'block':'none'};padding:8px 10px">
        <div id="mn-hor-${i}-seguido-box" style="display:${modoSeguido?'block':'none'}">
          ${renderTramoFields(`mn-hor-${i}-seguido`, d.seguido, 'Horario')}
        </div>
        <div id="mn-hor-${i}-turnos-box" style="display:${modoSeguido?'none':'block'}">
          ${renderTramoFields(`mn-hor-${i}-t1`, d.turnos && d.turnos[0], 'Turno 1')}
          ${renderTramoFields(`mn-hor-${i}-t2`, d.turnos && d.turnos[1], 'Turno 2')}
        </div>
      </div>
    </div>
  `;
  });
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${cards.join('')}</div>`;
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

function readTramoFromForm(prefix){
  return {
    ini: document.getElementById(`${prefix}-ini`).value,
    fin: document.getElementById(`${prefix}-fin`).value,
  };
}

function readHorarioFromForm(){
  return DIAS_SEMANA.map((_,i) => ({
    modo: document.getElementById(`mn-hor-${i}-modo`).value,
    abierto: document.getElementById(`mn-hor-${i}-abierto`).checked,
    seguido: readTramoFromForm(`mn-hor-${i}-seguido`),
    turnos: [
      readTramoFromForm(`mn-hor-${i}-t1`),
      readTramoFromForm(`mn-hor-${i}-t2`),
    ],
  }));
}

function renderMiNegocio(){
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
    <div class="card" style="max-width:720px;border:2px solid var(--brand-orange);background:var(--brand-cream)">
      <h3 style="color:var(--brand-orange)"><i class="ti ti-lock"></i> Acceso propietario</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">El acceso a Gestión está protegido por PIN. Cámbialo cuando quieras.</p>
      <div class="field-row">
        <div class="field">
          <label>Nuevo PIN (4 dígitos)</label>
          <input type="password" id="mn-pin-new" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:20px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div class="field">
          <label>Repite el nuevo PIN</label>
          <input type="password" id="mn-pin-new2" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:20px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
      </div>
      <button class="btn btn-sm" onclick="changeOwnerPin()"><i class="ti ti-key"></i> Cambiar PIN</button>
    </div>

    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-building-store"></i> Datos del negocio</h3>

      <h4 style="margin-top:0"><i class="ti ti-id-badge-2"></i> Identidad</h4>
      <div class="field">
        <label>Logo del establecimiento</label>
        <div style="display:flex;align-items:center;gap:12px">
          <div id="mn-logo-preview" style="width:64px;height:64px;border-radius:10px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff">
            ${b.logo ? `<img src="${b.logo}" style="width:100%;height:100%;object-fit:contain">` : `<i class="ti ti-photo" style="color:var(--muted)"></i>`}
          </div>
          <div>
            <input type="file" id="mn-logo-input" accept="image/*" style="display:none" onchange="handleLogoUpload(this)">
            <button class="btn btn-sm" onclick="document.getElementById('mn-logo-input').click()"><i class="ti ti-upload"></i> Subir logo</button>
            ${b.logo ? `<button class="btn btn-sm btn-danger" onclick="removeLogo()"><i class="ti ti-trash"></i> Quitar</button>` : ''}
          </div>
        </div>
      </div>
      <div class="field">
        <label>Nombre del establecimiento *</label>
        <input type="text" id="business-name" value="${escapeHtml(b.name||'')}" placeholder="Ej. Restaurante GastroGoan" onchange="saveBusiness(true)">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Tipo de negocio</label>
          <select id="mn-tipo" onchange="saveBusiness(true)">
            ${BUSINESS_TIPOS.map(t=>`<option ${b.tipo===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Año de apertura</label>
          <input type="number" id="mn-anyo" value="${escapeHtml(b.anyo||'')}" placeholder="2020" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field">
        <label>Propietario</label>
        <input type="text" id="mn-prop" value="${escapeHtml(b.prop||'')}" placeholder="Nombre completo" onchange="saveBusiness(true)">
      </div>

      <h4><i class="ti ti-notes"></i> Descripción</h4>
      <div class="field">
        <label>Descripción / Concepto</label>
        <textarea id="business-description" placeholder="Breve descripción del negocio..." onchange="saveBusiness(true)">${escapeHtml(b.description||'')}</textarea>
      </div>

      <h4><i class="ti ti-address-book"></i> Contacto</h4>
      <div class="field">
        <label>Dirección</label>
        <input type="text" id="business-address" value="${escapeHtml(b.address||'')}" placeholder="Calle, número, ciudad" onchange="saveBusiness(true)">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Teléfono</label>
          <input type="text" id="business-phone" value="${escapeHtml(b.phone||'')}" placeholder="Ej. 900 000 000" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="business-email" value="${escapeHtml(b.email||'')}" placeholder="contacto@negocio.com" onchange="saveBusiness(true)">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Web</label>
          <input type="url" id="mn-web" value="${escapeHtml(b.web||'')}" placeholder="www.milocal.com" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>CIF/NIF</label>
          <input type="text" id="mn-cif" value="${escapeHtml(b.cif||'')}" placeholder="B12345678" onchange="saveBusiness(true)">
        </div>
      </div>

      <h4><i class="ti ti-brand-instagram"></i> Redes sociales</h4>
      <div class="field-row">
        <div class="field">
          <label>Instagram</label>
          <input type="text" id="mn-ig" value="${escapeHtml(b.ig||'')}" placeholder="@milocal" onchange="saveBusiness(true)">
        </div>
        <div class="field">
          <label>Facebook</label>
          <input type="text" id="mn-fb" value="${escapeHtml(b.fb||'')}" placeholder="milocal" onchange="saveBusiness(true)">
        </div>
      </div>

      <button class="btn btn-primary" onclick="saveBusiness()"><i class="ti ti-device-floppy"></i> Guardar todo</button>
    </div>

    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-layout-grid"></i> Operativa</h3>
      <div class="field">
        <label>Aforo (plazas por turno)</label>
        <input type="number" id="mn-aforo" value="${escapeHtml(b.aforo||'')}" placeholder="40" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">Capacidad máxima de comensales por turno de comida/cena. Se usa para avisar de reservas que la superen.</small>
      </div>
      <div class="field">
        <label>Antelación mínima para reservar mesa y pedir online (minutos)</label>
        <input type="number" id="mn-leadtime-min" min="0" step="5" value="${escapeHtml(b.leadTimeMin!=null ? b.leadTimeMin : (b.pedidos?.leadTimeMin||''))}" placeholder="30" onchange="saveBusiness(true)">
        <small style="color:var(--muted)">Tus clientes no podrán reservar una mesa ni pedir online para una hora antes de este tiempo desde ahora. Ej: si son las 14:00 y pones 30, lo antes que podrán elegir hoy son las 14:30. Pon 0 para no exigir antelación.</small>
      </div>
      <h4 style="margin:16px 0 4px"><i class="ti ti-layout-grid"></i> Crea el plano de tu sala</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Define las zonas o rangos de mesas que tenga tu sala (por ejemplo "Rango 1" con 4 mesas, "Rango 2" con 6, "Terraza" con 3) y créalas de golpe, indicando para cuántas personas es cada mesa. Verás las mesas agrupadas exactamente así en el plano del TPV, y en Reservas se avisará si una mesa no tiene plazas suficientes. Después puedes renombrar o ajustar cada mesa individualmente más abajo.</p>
      <div class="field-row">
        <div class="field">
          <label>Nombre de la zona/rango</label>
          <input type="text" id="mn-zona-nombre" placeholder="Ej. Rango 1, Terraza...">
        </div>
        <div class="field">
          <label>Nº de mesas</label>
          <input type="number" id="mn-zona-cantidad" min="1" max="50" value="4">
        </div>
        <div class="field">
          <label>Plazas por mesa</label>
          <input type="number" id="mn-zona-plazas" min="1" max="50" value="4">
        </div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="addZonaConMesas()"><i class="ti ti-plus"></i> Crear zona</button>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <h4 style="margin:0 0 8px"><i class="ti ti-list-details"></i> Mesas configuradas</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Edita el nombre o número de cada mesa, muévela de zona, o añade/elimina mesas sueltas. Estas son exactamente las mesas que aparecen en el TPV y en las reservas.</p>
      <div id="mn-mesas-list"></div>
    </div>

    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-toggle-right"></i> Tipos de servicio</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Activa los servicios que ofrece tu negocio. Esto controla qué opciones aparecen en el TPV y en la página de reservas online para tus clientes. <strong>Los cambios se guardan al instante.</strong></p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-mesa" ${tiposServicio.mesa?'checked':''} onchange="toggleTipoServicio('mesa', this.checked)" style="width:18px;height:18px"> 🍽️ Mesa / Sala (reservas y comandas en el local)
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-takeaway" ${tiposServicio.takeaway?'checked':''} onchange="toggleTipoServicio('takeaway', this.checked)" style="width:18px;height:18px"> 🥡 Take Away (recogida en el local)
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mn-serv-delivery" ${tiposServicio.delivery?'checked':''} onchange="toggleTipoServicio('delivery', this.checked)" style="width:18px;height:18px"> 🛵 Delivery (entrega a domicilio)
        </label>
      </div>
    </div>

    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-calendar-time"></i> Horario de apertura</h3>
      <p style="font-size:13px;color:var(--muted,#888)">Es el horario general de tu negocio, día por día. Si un día tienes horario partido (ej. abres a mediodía, cierras, y vuelves a abrir por la noche), rellena también el "Turno 2". Marca como cerrado los días que no abras.</p>
      <p style="font-size:13px;color:var(--muted,#888)">Este horario se usa para calcular el aforo disponible por turno en Reservas, y para limitar las horas que tus clientes pueden elegir al reservar mesa o hacer un pedido para llevar/domicilio online. Dentro de cada franja, la carta que verán tus clientes es la que tengas marcada como disponible en cada momento (sección Carta).</p>
      <div id="mn-horario-list">${renderHorarioRows(b.horario)}</div>
    </div>

    ${renderTicketConfigCard()}

    ${renderComandaPrintCard()}

    ${renderRedsysCard()}

    ${renderPedidosConfigCard()}

    ${renderDeliveryPlatformsCard()}

    ${renderOnlineCard()}

    ${renderTableQrCard()}

    ${renderDataMaintenanceCard()}
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
    box.innerHTML = `<p style="font-size:13px;color:var(--muted)">No hay mesas todavía. Crea una zona arriba para empezar.</p>`;
    return;
  }
  const zonas = [...getZonaOrder(), null];
  let html = '';
  zonas.forEach(z => {
    const tables = DB.tables.filter(t => (t.zona||null) === z);
    if(!tables.length) return;
    html += `<div style="display:flex;align-items:center;gap:6px;margin:12px 0 4px">
      ${z ? `<input type="text" value="${escapeHtml(zonaLabel(z))}" onchange="renameZona('${escapeJsAttr(z)}', this.value)" title="Renombrar zona" style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;border:1px solid transparent;background:transparent;padding:2px 4px;border-radius:4px;flex:1;min-width:80px;max-width:220px" onfocus="this.style.borderColor='var(--border)'" onblur="this.style.borderColor='transparent'">`
        : `<span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;flex:1">Sin zona</span>`}
      ${z ? `<button class="btn btn-sm btn-icon" onclick="addTableToZona('${escapeJsAttr(z)}')" title="Añadir mesa a esta zona"><i class="ti ti-plus"></i></button>` : ''}
      ${z ? `<button class="btn btn-sm btn-icon btn-danger" onclick="deleteZonaCompleta('${escapeJsAttr(z)}')" title="Eliminar zona completa"><i class="ti ti-trash"></i></button>` : ''}
    </div>`;
    html += tables.map(t => {
      return `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="text" value="${escapeHtml(t.name||'')}" onchange="updateTableName(${t.id}, this.value)" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="Nombre o nº de mesa">
        <input type="number" min="1" max="50" value="${t.plazas||''}" onchange="updateTablePlazas(${t.id}, this.value)" style="width:64px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="Plazas" title="Nº de plazas (opcional)">
        <button class="btn btn-sm btn-icon btn-danger" onclick="deleteTableFromConfig(${t.id})" title="Eliminar mesa"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join('');
  });
  box.innerHTML = html;
}

// Renombra una zona/rango entera de una vez: se aplica a todas sus mesas y
// se actualiza el orden de zonas guardado.
function renameZona(oldName, newNameRaw){
  const newName = (newNameRaw||'').trim();
  if(!newName || newName === zonaLabel(oldName)){ renderMesasConfigList(); return; }
  if(!Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = getZonaOrder();
  DB.tables.forEach(t => { if(t.zona === oldName) t.zona = newName; });
  const idx = DB.business.zonaOrder.indexOf(oldName);
  if(idx !== -1) DB.business.zonaOrder[idx] = newName;
  else if(!DB.business.zonaOrder.includes(newName)) DB.business.zonaOrder.push(newName);
  saveDB();
  renderMesasConfigList();
  showToast(`Zona renombrada a "${newName}"`);
}

// Elimina una zona entera junto con todas sus mesas. Si alguna tiene una
// comanda abierta, se bloquea (igual que al borrar una mesa suelta).
function deleteZonaCompleta(zona){
  const tables = DB.tables.filter(t => t.zona === zona);
  if(tables.some(t => getOpenOrderForTable(t.id))){
    showToast('No se puede eliminar: hay mesas de esta zona con comandas abiertas.');
    return;
  }
  if(!confirm(`¿Eliminar la zona "${zonaLabel(zona)}" y sus ${tables.length} mesa${tables.length!==1?'s':''}?`)) return;
  clearDanglingTableRefs(tables.map(t => t.id));
  DB.tables = DB.tables.filter(t => t.zona !== zona);
  if(Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = DB.business.zonaOrder.filter(z => z !== zona);
  saveDB();
  renderMesasConfigList();
  showToast('Zona eliminada');
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
  const plazasEl = document.getElementById('mn-zona-plazas');
  const plazas = plazasEl ? Math.max(1, Math.min(50, parseInt(plazasEl.value)||0)) || null : null;
  if(!nombre){ showToast('Escribe un nombre para la zona'); return; }
  if(!Array.isArray(DB.business.zonaOrder)) DB.business.zonaOrder = getZonaOrder();
  if(!DB.business.zonaOrder.includes(nombre)) DB.business.zonaOrder.push(nombre);
  const existingInZone = DB.tables.filter(t => t.zona === nombre).length;
  for(let i = 1; i <= cantidad; i++){
    DB.tables.push({id: genId(), name: `Mesa ${existingInZone+i}`, zona: nombre, plazas});
  }
  saveDB();
  document.getElementById('mn-zona-nombre').value = '';
  document.getElementById('mn-zona-cantidad').value = '4';
  renderMesasConfigList();
  showToast(`Zona "${nombre}" creada con ${cantidad} mesa${cantidad!==1?'s':''}`);
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
  if(order){
    // Comanda vacía (mesa abierta por error, sin platos): se puede liberar sin más.
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== order.id);
  }
  if(!confirm(t('msg.confirmDeleteTable'))) return;
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
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-database"></i> Mantenimiento de datos</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Tamaño actual de los datos del negocio: <strong>${sizeKB} KB</strong>. Cuanto más pequeño, más rápido va todo (guardado y sincronización entre dispositivos).</p>
      <button class="btn btn-sm" onclick="downloadFullBackup()"><i class="ti ti-download"></i> Descargar copia de seguridad completa</button>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <p style="font-size:13px;font-weight:700;margin-bottom:6px">📦 Archivar datos antiguos</p>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Mueve a un archivo descargable las ventas, reservas finalizadas y cierres de caja anteriores a la fecha elegida. Se descarga primero una copia de seguridad de esos datos y luego se eliminan de la app (dejarán de contar en los informes de Gestión Económica de esos meses).</p>
      <div class="field">
        <label>Archivar todo lo anterior a</label>
        <input type="date" id="mn-archive-before" value="${dataMaintenanceCutoff()}">
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Con la fecha elegida se archivarían: <strong>${ventasAntiguas}</strong> ventas, <strong>${reservasAntiguas}</strong> reservas finalizadas/canceladas y <strong>${cierresAntiguos}</strong> cierres de caja.</p>
      <button class="btn btn-sm btn-danger" onclick="archiveOldData()"><i class="ti ti-archive"></i> Archivar y descargar</button>
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
  showToast(t('msg.backupDownloaded'));
}

function archiveOldData(){
  const before = document.getElementById('mn-archive-before').value;
  if(!before){ showToast(t('msg.chooseDate')); return; }
  const sales = DB.sales.filter(s => s.date && s.date < before);
  const reservations = DB.reservations.filter(r => r.date && r.date < before && (r.status==='completada'||r.status==='cancelada'));
  const cashClosures = DB.cashClosures.filter(c => c.fecha && c.fecha < before);
  const total = sales.length + reservations.length + cashClosures.length;
  if(total === 0){ showToast(t('msg.noDataToArchive')); return; }
  if(!confirm(`Se descargará un archivo con ${sales.length} ventas, ${reservations.length} reservas y ${cashClosures.length} cierres de caja anteriores a ${before}, y se eliminarán de la app (dejarán de aparecer en los informes de esos meses).\n\nGuarda bien el archivo descargado. ¿Continuar?`)) return;
  downloadJSON({ before, sales, reservations, cashClosures }, `gastrogoan-archivo-hasta-${before}.json`);
  DB.sales = DB.sales.filter(s => !(s.date && s.date < before));
  DB.reservations = DB.reservations.filter(r => !(r.date && r.date < before && (r.status==='completada'||r.status==='cancelada')));
  DB.cashClosures = DB.cashClosures.filter(c => !(c.fecha && c.fecha < before));
  saveDB();
  checkArchiveReminder();
  renderMiNegocio();
  showToast(t('msg.dataArchived'));
}

function handleLogoUpload(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){ showToast('Imagen demasiado grande (máx. 2 MB)'); return; }
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
  DB.business.logo = '';
  saveDB();
  renderMiNegocio();
  renderHeader();
}

function renderHeader(){
  const b = DB.business || {};
  const icon = document.getElementById('app-logo-icon');
  icon.innerHTML = b.logo ? `<img src="${b.logo}" alt="Logo">` : `<i class="ti ti-tools-kitchen-2"></i>`;
  const text = document.getElementById('app-logo-text');
  if(b.name){
    text.innerHTML = `${escapeHtml(b.name)}<span class="app-logo-sub" style="margin-left:8px">GastroGoan · ${t('hdr.subtitle')}</span>`;
  }else{
    text.innerHTML = `GastroGoan<span style="color:var(--olive);font-size:18px;line-height:1;margin:0 2px">·</span><span class="app-logo-sub">${t('hdr.subtitle')}</span>`;
  }
  syncLangButton();
  checkArchiveReminder();
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
  showToast(`Servicio ${checked?'activado':'desactivado'}`);
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
  if(el('mn-aforo')) DB.business.aforo = el('mn-aforo').value.trim();
  if(el('mn-leadtime-min')){
    DB.business.leadTimeMin = Math.max(0, parseInt(el('mn-leadtime-min').value) || 0);
    // Mantener el valor antiguo de pedidos en sincronía para compatibilidad.
    if(!DB.business.pedidos) DB.business.pedidos = {};
    DB.business.pedidos.leadTimeMin = DB.business.leadTimeMin;
  }
  if(el('mn-ig')) DB.business.ig = el('mn-ig').value.trim();
  if(el('mn-fb')) DB.business.fb = el('mn-fb').value.trim();
  if(el('mn-serv-mesa') && el('mn-serv-takeaway') && el('mn-serv-delivery')) {
    DB.business.tiposServicio = {
      mesa: el('mn-serv-mesa').checked,
      takeaway: el('mn-serv-takeaway').checked,
      delivery: el('mn-serv-delivery').checked,
    };
  }
  DB.business.horario = readHorarioFromForm();
  saveDB();
  renderHeader();
  updateAutoActiveCarta(true);
  updateAutoActiveMenu(true);
  if(!silent) showToast(t('msg.businessSaved'));
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
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-moped"></i> Plataformas de delivery</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Si trabajas con apps como Glovo, Uber Eats o Just Eat, añádelas aquí con la comisión que te cobran. Así, cuando registres una venta de delivery a través de esa plataforma, esa comisión se restará automáticamente como gasto en Gestión Económica.</p>
      <div id="delivery-platforms-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${platforms.length ? platforms.map(p=>`
          <div class="ge-item">
            <span style="flex:1;font-size:14px;font-weight:600">${escapeHtml(p.nombre)}</span>
            <span style="font-size:12px;color:var(--muted);margin-right:8px">Comisión ${fmtNum(p.comisionPct)}% + IVA ${fmtNum(p.ivaPct)}%</span>
            <button class="btn btn-sm btn-icon" onclick="editDeliveryPlatform(${p.id})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="deleteDeliveryPlatform(${p.id})"><i class="ti ti-trash"></i></button>
          </div>`).join('')
        : `<div class="empty" style="padding:12px 16px">Sin plataformas configuradas. Si recibes pedidos solo por tu cuenta (reparto propio), no necesitas añadir nada.</div>`}
      </div>
      <button class="btn btn-sm" onclick="newDeliveryPlatform()"><i class="ti ti-plus"></i> Añadir plataforma</button>

      <h4><i class="ti ti-user-bolt"></i> Repartidores propios</h4>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Si reparties los pedidos a domicilio con tu propio personal (sin pasar por una plataforma), anota aquí a tus repartidores para localizarlos rápido por WhatsApp y coordinar quién lleva cada pedido.</p>
      <div id="own-couriers-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${couriers.length ? couriers.map(c=>`
          <div class="ge-item">
            <span style="flex:1;font-size:14px;font-weight:600">${escapeHtml(c.nombre)}</span>
            ${c.telefono ? `<a class="btn btn-sm btn-icon" style="color:#25D366" href="https://wa.me/${c.telefono.replace(/[^0-9]/g,'')}" target="_blank" rel="noopener" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
            <button class="btn btn-sm btn-icon" onclick="editOwnCourier(${c.id})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-sm btn-icon btn-danger" onclick="deleteOwnCourier(${c.id})"><i class="ti ti-trash"></i></button>
          </div>`).join('')
        : `<div class="empty" style="padding:12px 16px">Sin repartidores propios registrados.</div>`}
      </div>
      <button class="btn btn-sm" onclick="newOwnCourier()"><i class="ti ti-plus"></i> Añadir repartidor</button>
    </div>
  `;
}

function newOwnCourier(){
  openOwnCourierModal('Añadir repartidor', {id:null, nombre:'', telefono:''});
}
function editOwnCourier(id){
  const c = (DB.business.ownCouriers||[]).find(x=>x.id===id); if(!c) return;
  openOwnCourierModal('Editar repartidor', c);
}
function openOwnCourierModal(title, c){
  openModal(`
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="field">
      <label>Nombre</label>
      <input type="text" id="oc-f-nombre" value="${escapeHtml(c.nombre)}" placeholder="Ej. Juan">
    </div>
    <div class="field">
      <label>Teléfono con prefijo del país (WhatsApp)</label>
      <input type="text" id="oc-f-telefono" value="${escapeHtml(c.telefono||'')}" placeholder="Ej. +34 600 000 000">
      <div style="font-size:12px;color:var(--muted);margin-top:4px">Incluye el prefijo del país (ej. <strong>+34</strong> en España). Sin él, el botón de WhatsApp no funciona.</div>
    </div>
    <input type="hidden" id="oc-f-id" value="${c.id||''}">
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveOwnCourier()">Guardar</button>
    </div>
  `);
}
function saveOwnCourier(){
  const nombre = document.getElementById('oc-f-nombre').value.trim();
  const telefono = document.getElementById('oc-f-telefono').value.trim();
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  if(!telefono){ showToast(t('msg.phoneRequired')); return; }
  if(telefono.replace(/[^0-9]/g,'').length < 10){ showToast(t('msg.includePrefix')); return; }
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
  openDeliveryPlatformModal('Añadir plataforma de delivery', {id:null, nombre:'', comisionPct:30, ivaPct:21});
}
function editDeliveryPlatform(id){
  const p = (DB.business.deliveryPlatforms||[]).find(x=>x.id===id); if(!p) return;
  openDeliveryPlatformModal('Editar plataforma', p);
}
function openDeliveryPlatformModal(title, p){
  const sugerencias = DELIVERY_PLATFORM_SUGGESTIONS.map(s=>`<option value="${s}">`).join('');
  openModal(`
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="field">
      <label>Nombre de la plataforma</label>
      <input type="text" id="dp-f-nombre" list="dp-sugerencias" value="${escapeHtml(p.nombre)}" placeholder="Ej. Glovo">
      <datalist id="dp-sugerencias">${sugerencias}</datalist>
    </div>
    <div class="field-row">
      <div class="field"><label>Comisión (%)</label><input type="number" id="dp-f-comision" min="0" max="100" step="0.1" value="${p.comisionPct!=null?p.comisionPct:30}"></div>
      <div class="field"><label>IVA sobre la comisión (%)</label><input type="number" id="dp-f-iva" min="0" max="100" step="0.1" value="${p.ivaPct!=null?p.ivaPct:21}"></div>
    </div>
    <p style="font-size:12px;color:var(--muted)">Por cada venta a través de esta plataforma, GastroGoan calculará automáticamente: comisión = total venta × ${'comisión%'} × (1 + IVA%), y lo registrará como gasto.</p>
    <input type="hidden" id="dp-f-id" value="${p.id||''}">
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveDeliveryPlatform()">Guardar</button>
    </div>
  `);
}
function saveDeliveryPlatform(){
  const nombre = document.getElementById('dp-f-nombre').value.trim();
  const comisionPct = parseFloat(document.getElementById('dp-f-comision').value);
  const ivaPct = parseFloat(document.getElementById('dp-f-iva').value);
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  if(isNaN(comisionPct) || comisionPct<0){ showToast(t('msg.enterCommission')); return; }
  if(!DB.business.deliveryPlatforms) DB.business.deliveryPlatforms = [];
  const idVal = document.getElementById('dp-f-id').value;
  const data = {nombre, comisionPct, ivaPct: isNaN(ivaPct)?0:ivaPct};
  if(idVal){
    const p = DB.business.deliveryPlatforms.find(x=>x.id===parseInt(idVal));
    if(p) Object.assign(p, data);
  }else{
    DB.business.deliveryPlatforms.push({id: genId(), ...data});
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
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-receipt"></i> Configuración del ticket</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Personaliza qué información aparece en el ticket que se entrega a los clientes al cobrar.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-direccion" ${tc.mostrarDireccion!==false?'checked':''} style="width:18px;height:18px"> Mostrar dirección
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-telefono" ${tc.mostrarTelefono!==false?'checked':''} style="width:18px;height:18px"> Mostrar teléfono
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-web" ${tc.mostrarWeb?'checked':''} style="width:18px;height:18px"> Mostrar web
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="tk-nif" ${tc.mostrarNif!==false?'checked':''} style="width:18px;height:18px"> Mostrar CIF/NIF (necesario para emitir facturas)
        </label>
      </div>
      <div class="field">
        <label>Mensaje final del ticket</label>
        <textarea id="tk-pie" placeholder="Ej. ¡Gracias por su visita! Síguenos en @milocal">${escapeHtml(tc.pie||'')}</textarea>
      </div>
      <div class="field">
        <label>% de IVA a aplicar en las facturas</label>
        <input type="number" id="tk-iva" min="0" max="100" step="0.1" value="${tc.ivaPct!=null?tc.ivaPct:10}" style="max-width:120px">
        <small style="color:var(--muted)">Se usa para desglosar base imponible e IVA cuando el cliente pide factura. Por defecto, el 10% de hostelería.</small>
      </div>
      <button class="btn btn-primary" onclick="saveTicketConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
    </div>
  `;
}

// Configuración de cómo se gestionan las comandas de cocina y sala: verlas en
// pantalla (pantalla de Cocina) o imprimir un vale automáticamente al marchar.
function renderComandaPrintCard(){
  const c = (DB.business && DB.business.comandas) || {modo:'pantalla', anchoTicket:80};
  const esImpresion = c.modo === 'impresion';
  return `
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-printer"></i> Comandas de cocina y sala</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Elige cómo quieres que el personal reciba las comandas cuando se marchan desde el TPV.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="radio" name="comanda-modo" value="pantalla" ${!esImpresion?'checked':''} onchange="setComandaModo('pantalla')" style="width:18px;height:18px"> 🖥️ Verlas en pantalla (pantalla de Cocina / Sala)
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="radio" name="comanda-modo" value="impresion" ${esImpresion?'checked':''} onchange="setComandaModo('impresion')" style="width:18px;height:18px"> 🧾 Imprimir un vale al marchar
        </label>
      </div>
      <div id="comanda-print-opts" style="display:${esImpresion?'block':'none'}">
        <div class="field">
          <label>Ancho del papel de la impresora</label>
          <select id="comanda-ancho" onchange="setComandaAncho(this.value)" style="max-width:200px">
            <option value="80" ${c.anchoTicket!=58?'selected':''}>80 mm (estándar)</option>
            <option value="58" ${c.anchoTicket==58?'selected':''}>58 mm (compacta)</option>
          </select>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:10px">La impresora se selecciona en el cuadro de impresión del navegador/sistema que aparece al imprimir. Si tienes una impresora de tickets (térmica) conectada por USB/red, configúrala como impresora del dispositivo y elígela ahí. Recomendamos activar la impresión automática en el navegador para que no pida confirmar cada vez.</p>
        <button class="btn btn-sm" onclick="testComandaPrint()"><i class="ti ti-printer"></i> Imprimir vale de prueba</button>
      </div>
    </div>
  `;
}
function setComandaModo(modo){
  DB.business.comandas = {...(DB.business.comandas||{anchoTicket:80}), modo};
  saveDB();
  const opts = document.getElementById('comanda-print-opts');
  if(opts) opts.style.display = modo==='impresion' ? 'block' : 'none';
  showToast(modo==='impresion' ? 'Las comandas se imprimirán al marchar' : 'Las comandas se verán en pantalla');
}
function setComandaAncho(val){
  DB.business.comandas = {...(DB.business.comandas||{modo:'impresion'}), anchoTicket: parseInt(val)||80};
  saveDB();
}
function comandaPrintEnabled(){
  return (DB.business && DB.business.comandas && DB.business.comandas.modo === 'impresion');
}
// Imprime un vale de comanda (cocina o sala) con las líneas marchadas.
function printComandaTicket(destino, titulo, lineas){
  if(!lineas || !lineas.length) return;
  const ancho = (DB.business && DB.business.comandas && DB.business.comandas.anchoTicket) || 80;
  const widthPx = ancho == 58 ? 200 : 280;
  const hora = new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
  const filas = lineas.map(l => `<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-bottom:3px"><span>${escapeHtml(l.qty)}× ${escapeHtml(l.name)}</span></div>${l.notas?`<div style="font-size:12px;margin:0 0 4px 10px">▸ ${escapeHtml(l.notas)}</div>`:''}`).join('');
  const win = window.open('', '_blank', `width=${widthPx+40},height=520`);
  if(!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title></head>
    <body style="font-family:monospace;width:${widthPx}px;padding:8px;margin:0">
      <div style="text-align:center;font-weight:700;font-size:16px;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:6px">${escapeHtml(destino)}</div>
      <div style="font-size:13px;margin-bottom:6px">${escapeHtml(titulo)} · ${hora}</div>
      ${filas}
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}
function testComandaPrint(){
  printComandaTicket('COCINA', 'Mesa de prueba', [{qty:2, name:'Ejemplo de plato', notas:'sin sal'}, {qty:1, name:'Otro plato'}]);
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
  showToast(t('msg.ticketConfigSaved'));
}

function changeOwnerPin(){
  const n1 = document.getElementById('mn-pin-new').value;
  const n2 = document.getElementById('mn-pin-new2').value;
  if(!/^\d{4}$/.test(n1)){ showToast(t('msg.pinMustBe4')); return; }
  if(n1 !== n2){ showToast(t('msg.pinsDontMatch')); return; }
  DB.business.pin = n1;
  DB.business.pinSet = true;
  saveDB();
  renderMiNegocio();
  showToast(t('msg.pinUpdated'));
}

/* ============================================================
   MANUAL DE USO — Guía rápida de la app
   ============================================================ */
let manualChapter = 0;
const MANUAL_CHAPTERS = [
  {
    title:'<i class="ti ti-rocket"></i> Cómo empezar',
    content:`<h3>Qué es GastroGoan y cómo está organizado</h3>
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
    <div class="manual-step"><div class="sn">4</div><div class="st"><strong>Escandallo</strong> (en Cocina) — Crea cada plato como una receta: elige los ingredientes de la Mega Lista, indica los gramajes netos y la merma de cada uno. La app calcula automáticamente el coste por ración, el food cost y el margen sobre el precio de venta que tú definas.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st"><strong>Fichas Técnicas</strong> (en Cocina) — Para cada receta del Escandallo, añade los pasos de elaboración, la presentación y los alérgenos. Sirven como procedimiento estándar para que cualquier cocinero elabore el plato siempre igual, y son obligatorias de cara a inspección sanitaria por el tema de alérgenos.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st"><strong>Carta</strong> (en Cocina o Sala) — Crea una o varias cartas importando los platos directamente del Escandallo (ya con su precio de coste calculado), organízalos por secciones (Entrantes, Principales, Postres...) y marca cuáles están disponibles. Puedes programar distintas cartas según el horario (comidas, cenas, fin de semana, carta de bebidas...).</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st"><strong>Stock y Pedidos</strong> (en Cocina y Sala) — Define el stock mínimo de cada ingrediente o elaboración. A partir de aquí, el sistema descuenta stock automáticamente con cada venta del TPV y lo repone automáticamente cuando marcas un pedido a proveedor como "Recibido".</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st"><strong>Personal y Plan de Limpieza</strong> (en Cocina y Sala) — Da de alta a tu equipo, organiza turnos y reparte tareas. Configura el plan de limpieza APPCC para cumplir con la normativa de higiene alimentaria.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st"><strong>TPV</strong> (en Sala) — Aquí es donde tu equipo trabaja cada turno: abrir mesas (cliente de paso o con reserva), tomar la comanda con las pestañas de cartas (bebidas primero), marchar por grupos o con "Marchar vale", seguir el estado del servicio y cobrar cuando todo está servido. Cada venta queda registrada y alimenta el resto del sistema sin pasos adicionales. (Ver el detalle en la sección "🆕 Novedades" de arriba.)</div></div>
    <div class="manual-step"><div class="sn">10</div><div class="st"><strong>Gestión Económica</strong> (en Gestión) — Añade tus gastos fijos (nóminas, alquiler, suministros...) una sola vez. A partir de ahí, la Cuenta de Resultados, el Punto de Equilibrio y la Tesorería se calculan solos combinando estos gastos con las ventas reales del TPV.</div></div>
    <div class="manual-step"><div class="sn">11</div><div class="st"><strong>Panel de Control</strong> (en Gestión) — Tu pantalla de control diario. Una vez que los módulos anteriores están en marcha, aquí verás en segundos cómo va el negocio: ventas, resultado, alertas y próximas reservas.</div></div>
    <div class="manual-tip">💡 No hace falta completar el 100% de cada módulo antes de pasar al siguiente. Puedes empezar con lo básico (ingredientes y recetas más vendidas, por ejemplo) e ir ampliando poco a poco mientras ya usas el TPV en el día a día.</div>
    <h4>Cómo se guardan los datos</h4>
    <p>Todo lo que introduces se guarda automáticamente en tu dispositivo (no hace falta pulsar ningún botón de "Guardar" salvo en formularios concretos que sí lo indican). Si activas la <strong>licencia y la nube</strong> desde Mi Negocio, además los datos se sincronizan entre todos los dispositivos del negocio (móvil del camarero, tablet de cocina, ordenador de oficina) y quedan respaldados en caso de que se borre el navegador o se cambie de dispositivo.</p>
    <div class="manual-warning">⚠️ Si trabajas sin la nube activada, los datos quedan solo en ese navegador/dispositivo. Te recomendamos activar la licencia cuanto antes y, además, hacer copias de seguridad periódicas desde Mi Negocio → Mantenimiento de datos.</div>
    <h4>Usar el Kit como una app (móvil, tablet y ordenador)</h4>
    <p>El Kit funciona perfectamente en cualquier dispositivo desde el navegador, sin instalar nada de una tienda de aplicaciones. Para acceder más rápido, sin escribir la dirección cada vez y con una pantalla más limpia (a pantalla completa, sin barra del navegador), puedes <strong>anclarlo a la pantalla de inicio</strong> como si fuera una app nativa:</p>
    <div class="manual-step"><div class="sn">1</div><div class="st"><strong>Móvil/tablet Android (Chrome):</strong> abre el Kit → pulsa el menú de tres puntos ⋮ (arriba a la derecha) → "Añadir a pantalla de inicio" o "Instalar app" → confirma. Aparecerá un icono de GastroGoan junto a tus demás apps.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone/iPad (Safari):</strong> abre el Kit → pulsa el botón de compartir <i class="ti ti-share-2"></i> (el cuadrado con la flecha hacia arriba, en la barra inferior) → desplázate y elige "Añadir a pantalla de inicio" → confirma el nombre y pulsa "Añadir".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st"><strong>Ordenador (Chrome/Edge):</strong> abre el Kit → busca el icono de instalar (un monitor con una flecha) en el extremo derecho de la barra de direcciones, o entra al menú ⋮ → "Instalar aplicación" o "Aplicaciones" → "Instalar este sitio como aplicación".</div></div>
    <div class="manual-tip">💡 Así tendrás un icono propio de GastroGoan para abrir el Kit al instante, igual que cualquier otra app: en el TPV de la barra, en la tablet de la cocina o en el móvil del encargado. Recomendamos instalarlo en cada dispositivo que vaya a usarse a diario.</div>
    <h4>Roles: quién ve qué</h4>
    <p>La sección <strong>Gestión</strong> está protegida con un PIN (configurable en Mi Negocio) porque contiene información sensible: finanzas, costes y configuración general. El equipo de cocina y sala puede usar libremente sus respectivos módulos (TPV, comandas, fichas técnicas, limpieza, personal, chat interno...) sin necesidad de ese PIN. Reparte el PIN de Gestión solo a quien deba ver esos datos.</p>`
  },
  {
    title:'<i class="ti ti-list"></i> Mega Lista',
    content:`<h3>Qué es y por qué es el módulo más importante</h3>
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
    <div class="manual-tip">💡 Cuando actualices el precio de un ingrediente, el coste de <strong>todas</strong> las recetas del Escandallo que lo usen se recalcula automáticamente al instante — incluyendo su food cost y su margen. Así, mantener la Mega Lista al día es la forma más rápida de tener un control de costes realista sin recalcular receta por receta.</div>
    <div class="manual-warning">⚠️ Si un ingrediente aparece con coste 0 o muy bajo en el Escandallo, normalmente es porque su precio o cantidad de compra están mal puestos aquí (por ejemplo, se ha confundido la cantidad de compra en gramos con la cantidad en kilos). Revisa siempre estos dos campos si un coste no te encaja.</div>`
  },
  {
    title:'<i class="ti ti-building-factory"></i> Proveedores',
    content:`<h3>Tu agenda de proveedores centralizada</h3>
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
    <div class="manual-tip">💡 Cuantos más ingredientes tengas correctamente vinculados a su proveedor, más útil será el módulo de Pedidos: podrás generar el pedido completo de un proveedor con un solo clic en lugar de añadir línea a línea.</div>`
  },
  {
    title:'<i class="ti ti-calculator"></i> Escandallo',
    content:`<h3>Qué es un escandallo y para qué sirve</h3>
    <p>El escandallo es la <strong>ficha de coste de cada plato</strong>: el desglose de qué ingredientes lleva, en qué cantidad, y cuánto cuesta cada uno según los precios de tu Mega Lista. Con él sabes <strong>cuánto te cuesta realmente producir un plato</strong> y, comparándolo con su precio de venta, si ese plato te da margen o te hace perder dinero. Es la herramienta más directa para fijar precios de carta con criterio en lugar de "a ojo".</p>
    <div class="manual-tip">💡 Al entrar en Escandallo ves primero las <strong>carpetas por categoría</strong>; al pulsar una, la lista de <strong>nombres de platos</strong>; y al pulsar un nombre, su <strong>escandallo completo</strong>. Así no se satura la pantalla cuando tienes muchos platos. (El buscador sigue mostrando los resultados directos.) El Stock funciona igual: carpetas → producto → detalle.</div>
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
    <div class="manual-warning">⚠️ Si dejas la merma a 0% en productos que sí tienen desperdicio (pescados con piel/espina, verduras sin pelar, carnes con grasa o hueso), tu coste real estará infravalorado y el food cost que verás será más bajo que el real. Revisa la merma de cada ingrediente con cuidado, especialmente en pescados y carnes.</div>
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
    <div class="manual-tip">💡 Una vez creado el escandallo de un plato, ya no tienes que volver a calcular nada manualmente: si cambia el precio de un ingrediente en la Mega Lista, este plato (y su food cost y margen) se actualizan solos. Revisa el Escandallo periódicamente, sobre todo tras subidas de precios de proveedores, para detectar platos que han pasado a zona ámbar o roja.</div>`
  },
  {
    title:'<i class="ti ti-file-text"></i> Fichas Técnicas',
    content:`<h3>El "manual de instrucciones" de cada plato</h3>
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
    <div class="manual-warning">⚠️ Revisa los alérgenos cada vez que cambies un ingrediente de una receta en el Escandallo (por ejemplo, si sustituyes un caldo casero por uno comercial). Un cambio de proveedor o de producto puede introducir un alérgeno que antes no estaba presente.</div>
    <h4>Presentación / emplatado</h4>
    <p>Describe cómo debe verse el plato en el momento de servir: tipo de plato o recipiente, disposición de los elementos, salsas y su colocación, guarniciones, decoración y temperatura de servicio. Si es posible, complementa la descripción con una foto de referencia que el equipo pueda consultar.</p>
    <h4>Imprimir y usar en cocina</h4>
    <p>El botón <strong>Imprimir</strong> genera una hoja limpia con toda la información de la ficha (ingredientes, pasos, alérgenos y presentación), lista para imprimir, plastificar y colgar en la partida correspondiente de la cocina. Es especialmente útil para:</p>
    <ul>
      <li>Formar a personal nuevo sin depender de que alguien le "enseñe de memoria"</li>
      <li>Mantener la consistencia cuando hay varios turnos o varios cocineros rotando</li>
      <li>Tener a mano la información de alérgenos para responder con seguridad a un cliente que pregunte</li>
    </ul>
    <div class="manual-tip">💡 Dedica un rato a completar las fichas de los platos más vendidos primero — son los que más impacto tienen en la consistencia del servicio y en las preguntas de alérgenos de los clientes.</div>`
  },
  {
    title:'<i class="ti ti-tools-kitchen-2"></i> Carta',
    content:`<h3>De las recetas a lo que ve el cliente</h3>
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
    <div class="manual-warning">⚠️ Si tus clientes ven el mensaje "La carta no está disponible" en la web de pedidos online, comprueba: (1) que exista una carta programada para el día y hora actuales en su horario de activación, y (2) que esa carta tenga al menos un plato marcado como Disponible. Si ambas cosas están en orden, el aviso desaparecerá en cuanto entréis en ese tramo horario.</div>
    <div class="manual-tip">💡 Organiza las secciones en el mismo orden en que aparecen físicamente en tu carta de papel o pizarra — facilita que el equipo encuentre rápido los platos durante el servicio, sobre todo en horas de mucho ritmo.</div>`
  },
  {
    title:'<i class="ti ti-box"></i> Stock',
    content:`<h3>Saber qué tienes y cuándo se te va a acabar</h3>
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
    <div class="manual-tip">💡 Revisa la pestaña de alertas de stock bajo justo antes de planificar el pedido de la semana — así generas pedidos completos y evitas rotos de producto durante el servicio.</div>`
  },
  {
    title:'<i class="ti ti-shopping-cart"></i> Pedidos',
    content:`<h3>El ciclo completo de una compra a proveedor</h3>
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
    <div class="manual-warning">⚠️ Solo los pedidos marcados como <strong>Recibido</strong> afectan al Stock y se contabilizan como gasto en la Gestión Económica (Gastos Variables). Un pedido en Borrador o Enviado no mueve ningún número económico — es importante recordar pasar el pedido a Recibido cuando la mercancía llegue, o tus informes de stock y de gastos no reflejarán la realidad.</div>
    <h4>Buenas prácticas</h4>
    <ul>
      <li>Genera un pedido por proveedor para mantener cada pedido claro y fácil de comunicar.</li>
      <li>Si el proveedor entrega menos cantidad de la pedida (rotura de stock en su almacén, por ejemplo), ajusta las cantidades del pedido antes de marcarlo como Recibido, para que el Stock refleje lo que realmente ha entrado.</li>
      <li>Revisa periódicamente los pedidos "Enviados" que lleven mucho tiempo sin marcarse como Recibidos — puede ser una señal de que se olvidó actualizar el estado tras la entrega.</li>
    </ul>`
  },
  {
    title:'<i class="ti ti-calendar"></i> Horario del Personal',
    content:`<h3>Qué es y para qué sirve</h3>
    <p>Este módulo es el corazón de la gestión de tu equipo: aquí das de alta a cada trabajador, organizas sus turnos semana a semana en formato calendario, controlas las horas que ficha cada persona y mantienes sus datos de contacto a mano. Tener el horario bien planificado evita los dos problemas más típicos de un restaurante: quedarte corto de personal en una hora punta, o pagar horas de más porque "nadie sabía quién tenía que venir".</p>

    <h4>Pestaña Personal: dar de alta a un empleado</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nuevo empleado"</strong>.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escribe su <strong>nombre</strong> y elige un <strong>rol</strong> (Camarero/a, Cocinero/a, Ayudante, Encargado/a...). El rol es solo descriptivo, te ayuda a identificar quién hace qué.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Elige un <strong>color identificativo</strong>. Ese color se usará en todo el calendario de turnos para reconocer a esa persona de un vistazo, sin tener que leer el nombre cada vez.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Rellena <strong>teléfono</strong> y <strong>email</strong> si los tienes. Aparecerán como enlaces directos para llamar/escribir por WhatsApp o enviar un correo sin tener que copiar el número.</div></div>
    <p><strong>El área (Cocina o Sala) ya no se pregunta:</strong> el empleado se asigna automáticamente al área desde la que lo creas. Si entras a Personal desde <strong>Cocina</strong>, ves y das de alta personal de cocina; desde <strong>Sala</strong>, personal de sala. Lo mismo aplica en Distribución del trabajo, Fichar y los turnos.</p>
    <div class="manual-step"><div class="sn">6</div><div class="st">Define un <strong>PIN de 4 dígitos</strong> para que el empleado pueda fichar y, si tu plan lo permite, acceder a su propia vista de la app. El PIN por defecto es "1234"; pídele que lo cambie la primera vez que lo use.</div></div>
    <div class="manual-warning">⚠️ No repitas el mismo PIN para dos empleados distintos: el PIN identifica a la persona en Fichar, en el Chat interno y en cualquier acción que quede registrada a su nombre.</div>

    <h4>Asignar turnos: desde Día, Semana o Mes</h4>
    <p>Los turnos se asignan desde las vistas <strong>Día, Semana o Mes</strong>: pulsa sobre el empleado/día y elige el turno. (La asignación masiva por periodo se ha retirado de la pestaña Personal para que todo el reparto de turnos esté en un solo sitio, el calendario.)</p>
    <h4>Pestaña Horario: el calendario semanal</h4>
    <p>Aquí ves la semana en columnas (Lunes a Domingo) y una fila por cada empleado.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Haz clic en la celda del día y empleado que quieras editar.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Elige el tipo de turno: <strong>Mañana</strong>, <strong>Tarde</strong>, <strong>Partido</strong> (mañana y tarde con descanso entre medio), <strong>Libre</strong>, <strong>Vacaciones</strong> o <strong>Baja</strong>. Indica también la hora de inicio y fin si quieres que conste en el horario.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">El calendario pinta cada turno con el color del empleado, así puedes ver de un vistazo si un día está bien cubierto o si te falta alguien en sala o en cocina.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">Usa las flechas de navegación para moverte a la semana anterior o siguiente y planificar con antelación.</div></div>
    <div class="manual-tip">💡 Planifica el horario con al menos una semana de antelación y avisa al equipo. Así evitas cambios de última hora y reclamaciones por turnos no comunicados.</div>

    <h4>Control de horas: Fichar</h4>
    <p>En la pestaña <strong>Fichar</strong>, cada empleado puede registrar su entrada y salida con su PIN. La app suma automáticamente las horas trabajadas y muestra el total de <strong>"Horas este mes"</strong> por empleado, para que puedas comparar las horas planificadas con las horas reales fichadas.</p>
    <div class="manual-tip">💡 Si ves que un empleado acumula muchas más horas de las que tenía asignadas en el calendario, revisa si hubo turnos extra, sustituciones o si simplemente se olvidó de fichar la salida.</div>`
  },
  {
    title:'<i class="ti ti-clipboard-list"></i> Distribución del Trabajo',
    content:`<h3>Qué es y para qué sirve</h3>
    <p>Una cosa es saber <strong>cuándo</strong> trabaja cada empleado (eso lo controla Horario del Personal) y otra muy distinta es saber <strong>qué tiene que hacer exactamente</strong> durante ese turno. Este módulo resuelve el segundo problema: te permite repartir responsabilidades concretas — qué platos prepara cada cocinero, qué tareas de limpieza o mise en place le tocan cada día — y dejarlo todo por escrito para que no haya confusiones ni "yo pensaba que eso lo hacías tú".</p>

    <h4>Vista maestro-detalle</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">A la izquierda verás la lista de tu equipo (los empleados que diste de alta en Horario del Personal). Haz clic en uno para abrir su ficha de trabajo a la derecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Todo lo que edites se guarda asociado a ese empleado, así que puedes ir pasando de uno a otro para repartir el trabajo de todo el equipo.</div></div>

    <h4>Platos a su cargo</h4>
    <p>Aquí defines qué platos prepara habitualmente ese empleado.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Añadir plato"</strong> y elige uno de tu Escandallo o Carta (así queda enlazado a la ficha técnica real), o escribe el nombre a mano si es algo puntual.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Repite para todos los platos de los que sea responsable. Por ejemplo, a tu pastelero le asignas todos los postres; a tu cocinero de partida fría, las ensaladas y entrantes fríos.</div></div>
    <div class="manual-tip">💡 Esta lista es muy útil para formar a un empleado nuevo: en cuanto entra, ya sabe qué platos tiene que dominar.</div>

    <h4>Plan de producción semanal</h4>
    <p>Aquí añades tareas concretas, día por día, además de la elaboración de platos.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Elige el día de la semana (Lunes a Domingo).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Escribe la tarea: por ejemplo "Mise en place de salsas", "Limpiar cámara fría", "Hacer pedido a proveedor de pescado", "Revisar caducidades de la nevera de postres".</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Añade tantas tareas como necesites por día. Quedan listadas bajo cada jornada, así el empleado ve de un vistazo su plan completo de la semana.</div></div>
    <div class="manual-tip">💡 Reparte también las tareas "menos agradecidas" (limpieza profunda, control de caducidades) de forma rotativa entre el equipo usando este plan, así queda constancia de quién la tiene asignada cada semana.</div>

    <h4>Imprimir y repartir</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Con la ficha de un empleado abierta, pulsa <strong>Imprimir</strong> para generar una hoja solo con su asignación (platos a su cargo + plan de producción).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si quieres la hoja de todo el equipo de golpe, usa la opción de imprimir todo: genera una hoja por empleado, lista para repartir o pegar en el tablón de cocina.</div></div>
    <div class="manual-warning">⚠️ Si cambias la carta o el escandallo (por ejemplo, eliminas un plato), revisa este módulo: los platos "a cargo" de cada empleado no se actualizan solos si el plato ya no existe.</div>`
  },
  {
    title:'<i class="ti ti-spray"></i> Plan de Limpieza',
    content:`<h3>Qué es y para qué sirve</h3>
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
    <div class="manual-warning">⚠️ Si una temperatura sale fuera de rango (cámaras normalmente entre 0-4ºC, congeladores a -18ºC o menos), anótalo igualmente y registra la acción correctiva (se avisó al técnico, se trasladó el género...). Esa traza es justo lo que pide una inspección.</div>

    <h4>4. Alérgenos — control de alérgenos</h4>
    <p>Registra qué alérgenos contiene cada plato o materia prima y mantén actualizada esa información, especialmente si cambias proveedores o recetas.</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Revisa periódicamente que la lista de alérgenos de tus platos sigue siendo correcta (sobre todo tras cambios de receta o de marca de un ingrediente).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si trabajas con Fichas Técnicas, puedes apoyarte en los ingredientes ahí indicados para no olvidar ninguno.</div></div>
    <div class="manual-tip">💡 La información de alérgenos debe estar disponible para el cliente que la pida (en carta, cartel o verbalmente). Tenla siempre actualizada, no solo registrada.</div>

    <h4>5. Plagas — control de plagas</h4>
    <p>Registra las visitas de tu empresa de control de plagas, los tratamientos realizados y cualquier incidencia detectada (presencia de insectos, roedores...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Cada vez que venga el técnico de plagas, registra la fecha, lo que se hizo y, si te entrega un certificado, guárdalo como referencia.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si detectas tú mismo algún indicio entre visitas, regístralo también: ayuda a justificar visitas extra si fuera necesario.</div></div>

    <h4>6. Mantenimiento — incidencias y revisiones de equipos</h4>
    <p>Registra averías, reparaciones y revisiones periódicas de tus equipos (hornos, cámaras, lavavajillas, extractores...).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Cuando detectes una avería, regístrala aquí: equipo afectado, descripción del problema y fecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Cuando se repare o revise, marca la incidencia como resuelta y anota qué se hizo. Así tienes el historial completo de cada equipo, útil para decidir si conviene repararlo otra vez o sustituirlo.</div></div>

    <div class="manual-tip">💡 La rutina ganadora es: dedica 5 minutos al abrir y 5 minutos al cerrar para repasar estas 6 pestañas y registrar lo que toque. En un mes tendrás un historial completo, sin esfuerzo añadido en tu día a día.</div>
    <div class="manual-warning">⚠️ Mantener estos registros al día no es opcional: es un requisito legal y lo primero que se revisa en una inspección sanitaria. Un registro vacío o desactualizado puede acarrear sanciones aunque tu cocina esté impecable.</div>`
  },
  {
    title:'<i class="ti ti-user"></i> Clientes',
    content:`<h3>Qué es y para qué sirve</h3>
    <p>Conocer a tus clientes habituales es una de las formas más baratas de aumentar tus ventas: cuesta mucho menos conseguir que un cliente que ya te conoce vuelva, que atraer a uno nuevo. Este módulo es tu base de datos de clientes: guarda sus datos de contacto y calcula automáticamente, a partir de las ventas registradas en el TPV, cómo se está comportando cada uno (cuánto gasta, con qué frecuencia viene y cuándo fue la última vez).</p>

    <h4>Dar de alta a un cliente</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>"+ Nuevo cliente"</strong> y rellena nombre, teléfono y email (al menos uno de los dos para poder contactarle).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si quieres, añade notas: alergias, preferencias ("siempre pide mesa en terraza"), fecha de cumpleaños, etc. Esa información te permite dar un trato más personal.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Cuando creas una reserva nueva con un teléfono que no está en la base de datos, la app te ofrecerá añadirlo directamente desde ahí, sin tener que venir a este módulo.</div></div>

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

    <div class="manual-tip">💡 Filtra por clientes en ámbar o rojo una vez al mes y dedica 15 minutos a escribirles. Es la lista de clientes con más probabilidad de responder a una promoción, porque ya te conocen.</div>
    <div class="manual-tip">💡 Combina este módulo con la pestaña "Clientes" de Promoción: desde ahí puedes lanzar campañas dirigidas a estos grupos.</div>`
  },
  {
    title:'<i class="ti ti-calendar-event"></i> Reservas',
    content:`<h3>Qué es y para qué sirve</h3>
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
    <div class="manual-tip">💡 Cuando un cliente con reserva se sienta y abres su mesa en el TPV, su reserva se marca automáticamente como "llegada" y desaparece de la lista de reservas del día para no estorbar la vista.</div>

    <h4>Aforo por turno</h4>
    <p>Si en Mi Negocio configuraste el <strong>Aforo (plazas por turno)</strong>, la vista del día muestra para cada turno cuántas personas hay reservadas frente al máximo:</p>
    <table>
      <tr><th>Color</th><th>Situación</th></tr>
      <tr><td>🟢 Verde</td><td>Hay sitio de sobra</td></tr>
      <tr><td>🟡 Ámbar</td><td>El turno está cerca de completarse</td></tr>
      <tr><td>🔴 Rojo</td><td>El turno está completo</td></tr>
    </table>
    <p>Si al crear o confirmar una reserva se supera el aforo, la app te avisa con los números exactos (por ejemplo "ya hay 38 de 40 plazas, esta reserva añade 6") y te pregunta si quieres confirmarla igualmente, por si puedes habilitar mesas extra.</p>

    <h4>Solicitudes online pendientes</h4>
    <p>Las reservas que un cliente hace desde tu página web pública no se confirman solas: llegan a la sección <strong>"Solicitudes online pendientes"</strong>, donde puedes revisarlas y decidir si las aceptas, las modificas (por ejemplo cambiar la mesa) o las rechazas si no tienes disponibilidad real.</p>
    <div class="manual-tip">💡 Revisa las solicitudes pendientes varias veces al día, especialmente antes de cada servicio, para no dejar a un cliente esperando confirmación.</div>

    <h4>En el Panel de Control</h4>
    <p>Las reservas de <strong>hoy y de mañana</strong> aparecen automáticamente en el Panel de Control, para que al abrir la app por la mañana ya sepas cuántos comensales esperas y puedas avisar a cocina y sala con tiempo.</p>
    <div class="manual-warning">⚠️ Si cancelas o cambias una reserva confirmada desde la web pública, recuerda avisar al cliente por teléfono o WhatsApp: la cancelación no le envía un mensaje automático.</div>`
  },
  {
    title:'<i class="ti ti-device-desktop"></i> TPV',
    content:`<h3>Comandas, mesas y tickets</h3>
    <h4>Plano de sala</h4>
    <p>Las mesas que aparecen en el TPV son <strong>exactamente las que configuras en Mi Negocio → Operativa</strong>, agrupadas por zona (Interior, Terraza, Barra). Allí puedes ponerle a cada mesa el nombre o número que quieras, añadir o eliminar mesas. Cada mesa ocupada muestra de un vistazo en qué <strong>fase del servicio</strong> está (📝 Tomando nota, ⏳ Marchado, 🔥 En cocina, ✅ Servido), su número de comensales y el total.</p>
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
    <div class="manual-tip">💡 Puedes elegir en <strong>Mi Negocio → Comandas de cocina y sala</strong> si las comandas se ven en la <strong>pantalla de Cocina/Sala</strong> o se <strong>imprimen en un vale</strong> al marchar (un vale de cocina con la comida y otro de sala/barra con las bebidas).</div>
    <h4>Para llevar / Delivery</h4>
    <p>También puedes registrar ventas para llevar o a domicilio sin asignarlas a una mesa.</p>
    <h4>Cierre de caja / Arqueo</h4>
    <p>Al finalizar un turno o el día, pulsa <strong>Cerrar caja</strong>:</p>
    <ul>
      <li>El sistema calcula automáticamente el total de ventas por <strong>método de pago</strong> (Efectivo, Tarjeta, Otro) desde el último cierre del día (o desde el inicio del día si es el primero)</li>
      <li>Indica el <strong>fondo de caja inicial</strong> (si lo hay) y el <strong>efectivo contado</strong> físicamente en caja</li>
      <li>La app calcula el <strong>efectivo esperado</strong> y la <strong>diferencia</strong> (sobra/falta)</li>
      <li>Puedes añadir notas y se genera un <strong>ticket imprimible</strong> con el resumen del cierre</li>
    </ul>
    <p>Puedes hacer varios cierres al día (por turnos) o uno solo al final del día. Consulta cierres anteriores en <strong>Historial de arqueos</strong>.</p>
    <div class="manual-tip">💡 Las ventas registradas en el TPV alimentan automáticamente la Gestión Económica, el Stock y el Panel de Control.</div>`
  },
  {
    title:'<i class="ti ti-chart-bar"></i> Gestión Económica',
    content:`<h3>Qué es y para qué sirve</h3>
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
    <div class="manual-warning">⚠️ Si tu food cost real está muy por encima del objetivo, revisa: escandallos sin actualizar, mermas, robos/descontrol de stock, o precios de carta/carta de bebidas desactualizados frente a lo que te cuesta ahora la materia prima.</div>

    <h4>3. Cuenta de Resultados</h4>
    <p>Vista mensual automática: <strong>Facturación</strong> (sumada del TPV) menos <strong>Gastos</strong> (de las dos pestañas anteriores) = <strong>Resultado del mes</strong>. Usa las flechas para moverte entre meses y años y ver tu evolución histórica de un vistazo.</p>
    <div class="manual-tip">💡 Revisa esta pestaña el día 1 o 2 de cada mes, en cuanto tengas cerrado el mes anterior. Te da una foto rápida de cómo te ha ido.</div>

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
    <div class="manual-tip">💡 Muchos negocios "ganan dinero sobre el papel" pero van ahogados porque gastan el IVA cobrado como si fuera suyo. Si separas mentalmente (o en una cuenta aparte) el % de IVA que indica esta pestaña, evitas ese problema.</div>

    <h4>6. Punto de Equilibrio</h4>
    <p>Te dice cuántos cubiertos al mes necesitas vender como mínimo para que tus ingresos cubran tus gastos (ni ganas ni pierdes).</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Introduce tu <strong>ticket medio</strong> (lo que gasta de media un cliente).</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Introduce los <strong>días de apertura al mes</strong>.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">Introduce tu <strong>food cost objetivo</strong> (% que quieres que represente la materia prima sobre tus ventas, normalmente 28-35% según el tipo de negocio).</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">La app cruza estos datos con tus Gastos Fijos y te devuelve los <strong>cubiertos/mes</strong> y <strong>cubiertos/día</strong> que necesitas para cubrir gastos. Todo lo que vendas por encima de esa cifra es lo que empieza a generar beneficio real.</div></div>
    <p><strong>Ejemplo:</strong> si tus gastos fijos son 6.000€/mes, tu ticket medio es 18€ y tu food cost objetivo es 30% (es decir, cada 18€ de venta dejan 12,60€ de margen bruto), necesitarías unos 6.000 / 12,60 ≈ 476 cubiertos al mes para cubrir gastos. Si abres 26 días, son unos 18-19 cubiertos al día como mínimo.</p>
    <div class="manual-tip">💡 Compara cada mes tus cubiertos reales (los puedes estimar dividiendo la facturación entre el ticket medio) con este mínimo. El Panel de Control te muestra esta comparación automáticamente.</div>

    <h4>7. CAPEX (inversiones y equipamiento)</h4>
    <p>Registra aquí las inversiones grandes: horno nuevo, cámara, obra, mobiliario...</p>
    <div class="manual-step"><div class="sn">1</div><div class="st">Da de alta la inversión con su importe total y fecha.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">Si la has financiado a plazos, marca la opción correspondiente e indica la <strong>cuota mensual</strong> y el <strong>número de cuotas</strong>. Esa cuota se sumará como gasto mensual mientras dure la financiación, y desaparecerá sola cuando termine.</div></div>

    <div class="manual-tip">💡 El ranking de platos más/menos vendidos y más/menos rentables (Análisis de Platos) se encuentra ahora en el Panel de Control.</div>`
  },
  {
    title:'<i class="ti ti-dashboard"></i> Panel de Control',
    content:`<h3>Qué es y para qué sirve</h3>
    <p>El Panel de Control es la primera pantalla que deberías mirar cada día. No introduces nada aquí: simplemente reúne y resume datos de todos los demás módulos (TPV, Gestión Económica, Stock, Reservas, Fichas Técnicas...) para darte, de un vistazo, el estado de salud de tu negocio. Si solo tuvieras un minuto al día para "mirar" la app, sería este.</p>

    <h4>Qué encontrarás y cómo interpretarlo</h4>
    <div class="manual-step"><div class="sn">1</div><div class="st">💰 <strong>Ventas hoy / últimos 7 días / mes en curso</strong> — el ritmo de facturación en tiempo real, en tres cifras.</div></div>
    <div class="manual-step"><div class="sn">2</div><div class="st">📈 <strong>Comparación de ventas del año</strong> — gráfico con la facturación de cada uno de los últimos 12 meses. Te ayuda a detectar estacionalidad (meses fuertes y flojos) y a ver la evolución de tu negocio mes a mes.</div></div>
    <div class="manual-step"><div class="sn">3</div><div class="st">🧾 <strong>Gastos hoy / últimos 7 días / mes en curso</strong> — incluye las compras registradas con fecha en Gestión Económica (gastos variables) más una parte proporcional de tus gastos fijos mensuales (alquiler, personal, suministros...), repartida día a día. Así puedes ver cuánto te está costando el negocio al mismo ritmo que ves las ventas.</div></div>
    <div class="manual-step"><div class="sn">4</div><div class="st">📊 <strong>Comparación de gastos del año</strong> — gráfico con el total de gastos (fijos + variables) de cada uno de los últimos 12 meses, para comparar con el gráfico de ventas y ver si tus costes crecen al mismo ritmo que tu facturación.</div></div>
    <div class="manual-step"><div class="sn">5</div><div class="st">📋 <strong>Resultado del mes (P&amp;L)</strong> — facturación, gastos variables, gastos fijos y resultado (beneficio o pérdida) del mes en curso, más el <strong>margen sobre ventas</strong> y el <strong>% Food Cost medio</strong> frente a tu objetivo. Si el resultado está en rojo a mitad de mes no es necesariamente malo, pero conviene vigilar la evolución.</div></div>
    <div class="manual-step"><div class="sn">6</div><div class="st">📉 <strong>Comparación del resultado mensual del año</strong> — gráfico con el resultado (ventas menos gastos) de cada uno de los últimos 12 meses. Las barras en rojo señalan los meses con pérdidas y las naranjas los meses con beneficio, para ver de un vistazo la rentabilidad real mes a mes.</div></div>
    <div class="manual-step"><div class="sn">7</div><div class="st">🥧 <strong>Análisis de ventas (últimos 30 días)</strong> — ticket medio, número de ventas, platos más vendidos, platos de mayor margen bruto y la distribución de ventas por hora del día. Te dice qué está funcionando ahora mismo y a qué horas se concentra tu facturación.</div></div>
    <div class="manual-step"><div class="sn">8</div><div class="st">⚖️ <strong>Punto de equilibrio</strong> — compara los cubiertos/ventas reales del mes con el mínimo que calculaste en Gestión Económica. Si vas por debajo del objetivo, este es el primer aviso para reaccionar antes de que acabe el mes.</div></div>
    <div class="manual-step"><div class="sn">9</div><div class="st">🍽️ <strong>Análisis de Platos</strong> — ranking de los platos más y menos vendidos, y más y menos rentables, por el periodo que elijas. Cruza esta información con el Escandallo: un plato que vende mucho pero deja poco margen es candidato a subir de precio o rediseñar; uno que vende poco y deja mucho margen es candidato a promocionar más.</div></div>

    <h4>Rutina recomendada</h4>
    <p>Cada mañana, antes de abrir:</p>
    <ol>
      <li>Mira las <strong>ventas y gastos de hoy/semana/mes</strong> y compáralos con los gráficos de los últimos 12 meses para saber si vas en línea con lo esperado.</li>
      <li>Revisa el <strong>Resultado del mes</strong> y el <strong>Punto de equilibrio</strong> para saber si vas camino de cubrir gastos o necesitas reaccionar.</li>
      <li>Echa un ojo al <strong>Análisis de Platos</strong> para detectar qué platos potenciar o revisar.</li>
    </ol>
    <div class="manual-tip">💡 En 30 segundos sabes cómo está tu negocio: si las ventas y el resultado van en línea con los meses anteriores y por encima del punto de equilibrio, todo va bien. Si algo destaca en rojo, ahí está tu prioridad del día.</div>`
  },
  {
    title:'<i class="ti ti-building-store"></i> Mi Negocio',
    content:`<h3>Datos del establecimiento</h3>
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
    <div class="manual-tip">💡 <strong>Crear mesas automáticamente</strong>: crea las mesas que falten hasta llegar a las cantidades indicadas. Después, en la lista <strong>"Mesas configuradas"</strong> de más abajo puedes <strong>ponerle a cada mesa el nombre o número que quieras</strong>, cambiarle la zona, o añadir/eliminar mesas una a una. Esas mesas son exactamente las que aparecen en el TPV, en las reservas y en los QR de auto-pedido (un QR por mesa).</div>

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
    <p>Muestra un botón pequeño por cada <strong>mesa</strong> que hayas configurado en Operativa (interior, exterior/terraza y barra). Al pulsar sobre el nombre de una mesa (ej. "Mesa 3 (Interior)" o "Barra 1") se abre su <strong>código QR</strong>, listo para descargar e imprimir. Cuando un cliente lo escanea desde esa mesa, el pedido que haga llegará directamente asignado a ese número de mesa en el TPV, sin pasar por la bandeja de pedidos pendientes.</p>`
  },
  {
    title:'<i class="ti ti-world"></i> Reservas y Pedidos Online',
    content:`<h3>Tu web pública para clientes</h3>
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
    <p>Las reservas y pedidos que hagan los clientes desde la web pública llegan a tu Kit automáticamente: las reservas aparecen en <strong>Reservas → Solicitudes online pendientes</strong>, y los pedidos en <strong>TPV</strong> como pedidos pendientes online.</p>
    <h4>Aforo por turno</h4>
    <p>En <strong>Mi Negocio</strong> indica tu <strong>Aforo (plazas por turno)</strong>: el número máximo de comensales que puedes atender en cada turno de comida/cena (según tu Horario de apertura).</p>
    <ul>
      <li>En <strong>Reservas → vista del día</strong> verás, para cada turno, cuántas personas hay reservadas frente al aforo (verde = hay sitio, ámbar = cerca del límite, rojo = aforo completo)</li>
      <li>Si al crear o confirmar una reserva se supera el aforo del turno, la app te avisa con los números exactos y te pregunta si quieres confirmarla igualmente (por ejemplo, si puedes habilitar mesas extra)</li>
      <li>En la <strong>web pública de reservas</strong>, si un turno ya está completo, el cliente recibe un aviso para elegir otro horario, reducir comensales o llamar al restaurante — así evitas sobre-reservas automáticas</li>
    </ul>
    <div class="manual-tip">💡 Tras cambiar datos importantes (carta, disponibilidad, horarios, aforo o reservas), espera unos segundos: los cambios se sincronizan automáticamente con la web pública.</div>`
  },
];

function renderManual(){
  const nav = document.getElementById('manual-nav');
  const detail = document.getElementById('manual-detail');
  nav.innerHTML = MANUAL_CHAPTERS.map((ch,i) => `
    <div class="manual-chapter${i===manualChapter?' active':''}" onclick="goManualChapter(${i})">${ch.title}</div>
  `).join('');
  detail.innerHTML = MANUAL_CHAPTERS[manualChapter].content;
}
function goManualChapter(i){
  manualChapter = i;
  renderManual();
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  await dbReadyPromise;
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
  const onbRole = localStorage.getItem(ONBOARDING_ROLE_LS) || 'owner';
  const alreadySetUp = getLicense() && getCloudConfig();
  if(onbRole === 'owner' && !DB.business.netlifySetupDone && !alreadySetUp){
    showNetlifySetupGate();
  }else if(!getCloudConfig()){
    showFirebaseSetupGate();
  }else if(!getLicense()){
    showActivationGate();
  }else if(!DB.business.tourSeen){
    promptAppTour();
  }
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
    showBusinessSelectScreen();
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
