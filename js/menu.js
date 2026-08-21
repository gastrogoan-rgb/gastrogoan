/* ============================================================
   CARTA — Sistema multi-carta con secciones y horarios
   ============================================================ */
const CARTA_TIPOS = ['MEDIODÍA','NOCHE','FIN DE SEMANA','DEGUSTACIÓN','TEMPORADA','GENERAL'];
let cartaEdit = null; // {id, nombre, horario:[7x{activo,desde,hasta}], secciones:[]}
let cartaSearchQuery = '';

// Mueve un elemento dentro de un array una posición arriba/abajo (in place).
function moveArrayItem(arr, index, dir){
  const j = index + dir;
  if(j < 0 || j >= arr.length) return;
  [arr[index], arr[j]] = [arr[j], arr[index]];
}
function reorderButtons(onUp, onDown, isFirst, isLast){
  return `<button class="btn btn-sm btn-icon" ${isFirst?'disabled':''} onclick="${onUp}" title="${t('title.moveUp')}"><i class="ti ti-chevron-up"></i></button>`
    + `<button class="btn btn-sm btn-icon" ${isLast?'disabled':''} onclick="${onDown}" title="${t('title.moveDown')}"><i class="ti ti-chevron-down"></i></button>`;
}

function migrateCartas(){
  if((!DB.cartas || !DB.cartas.length) && DB.menuItems && DB.menuItems.length){
    const groups = {};
    DB.menuItems.forEach(m => {
      const cat = (m.category || 'Otros').toUpperCase();
      const r = getRecipe(m.recipeId);
      (groups[cat] = groups[cat] || []).push({
        id: genId(),
        recipeId: m.recipeId,
        nombre: r ? r.name : (m.name || 'Plato'),
        precio: m.price != null ? m.price : (r ? r.price : 0),
        disponible: m.available !== false
      });
    });
    DB.cartas = [{
      id: genId(), nombre:'CARTA GENERAL', tipo:'GENERAL', desde:'', hasta:'', dias:[0,1,2,3,4,5,6],
      secciones: Object.keys(groups).map(cat => ({id: genId(), nombre: cat, platos: groups[cat]}))
    }];
    DB.menuItems = [];
    saveDB();
  }
  if(!DB.cartas) DB.cartas = [];
}

// Resume el horario semanal propio de una carta/menú como un pequeño grupo
// de etiquetas (días en negrita + badge de horas por cada tramo), agrupando
// los días que comparten exactamente las mismas franjas horarias. Antes era
// una única línea de texto en gris pequeño y todo apretado, costaba
// distinguir de un vistazo los días de las horas cuando una carta tenía
// varios tramos, todo pegado y sin separación visual real. Además leía
// d.desde/d.hasta directamente, un esquema antiguo de una sola franja por
// día — desde que un día admite varias franjas (p.ej. mediodía Y noche) el
// horario real vive en d.franjas[], así que la versión vieja ya no reflejaba
// bien cartas con más de un tramo al día.
// Agrupa los días activos de un horario (ya migrado, con d.franjas[]) por
// franja horaria compartida — usado tanto en la lista (renderItemScheduleHtml)
// como en el resumen colapsado del editor (scheduleSummaryText), para no
// repetir la misma lógica de agrupación dos veces.
function groupScheduleDays(horario){
  const active = horario.map((d,i)=>({i, d})).filter(x=>x.d.activo!==false);
  if(!active.length) return null;
  const groups = {};
  active.forEach(({i,d})=>{
    const franjas = (d.franjas||[]).filter(f=>f.desde && f.hasta);
    const label = franjas.length ? franjas.map(f=>`${f.desde}–${f.hasta}`).join(', ') : t('label.allDayLong');
    (groups[label] = groups[label] || []).push(i);
  });
  return Object.entries(groups).map(([label, idxs]) => ({
    label,
    days: idxs.length===7 ? t('common.allDays') : idxs.map(i=>weekDayShort(i)).join(', ')
  }));
}
function renderItemScheduleHtml(item){
  const groups = groupScheduleDays(migrateItemHorario(item));
  if(!groups) return `<span style="font-size:12px;color:var(--muted)">${t('empty.noActiveDays')}</span>`;
  return `<div style="display:flex;flex-direction:column;gap:3px">${groups.map(({label, days})=>`
    <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;white-space:nowrap">
      <span style="font-weight:600">${escapeHtml(days)}</span>
      <span class="badge badge-gray" style="font-size:11.5px"><i class="ti ti-clock" style="margin-right:2px"></i>${escapeHtml(label)}</span>
    </div>
  `).join('')}</div>`;
}
// Versión en texto plano (sin HTML) del horario, para el resumen que se ve
// en la cabecera colapsada del editor.
function scheduleSummaryText(horario){
  const groups = groupScheduleDays(horario);
  if(!groups) return t('empty.noActiveDays');
  return groups.map(({label, days}) => `${days}: ${label}`).join(' · ');
}

/* ============================================================
   AFORO POR TURNO — Disponibilidad para reservas
   ============================================================ */
// Devuelve los turnos (franjas horarias) configurados para el día de la semana
// de dateStr, o null si no hay horario configurado (sin restricción de turnos).
// "HH:MM" → minutos desde medianoche, para poder comparar horas que cruzan
// la medianoche (un turno de madrugada, ej. 20:00-02:00) sin depender de
// una comparación de texto que solo funciona si la hora de cierre es
// "mayor" como string que la de apertura.
function timeStrToMinutes(str){
  if(!str || typeof str !== 'string' || !str.includes(':')) return null;
  const [h,m] = str.split(':').map(Number);
  if(isNaN(h) || isNaN(m)) return null;
  return h*60+m;
}
function getTurnosForDate(dateStr){
  const horario = (DB.business || {}).horario;
  if(!horario || horario.length !== 7) return null;
  const jsDay = new Date(dateStr + 'T00:00:00').getDay(); // 0=domingo..6=sábado
  const d = migrateHorarioDia(horario[(jsDay + 6) % 7]); // 0=lunes..6=domingo
  if(!d || d.abierto === false) return [];
  const turnos = [];
  // Antes se exigía s.fin &gt; s.ini (comparación de texto): un turno de
  // madrugada como 20:00-02:00 nunca pasaba el filtro ("02:00" &lt; "20:00"
  // como string), así que ese día se trataba como "sin horario configurado"
  // — el aforo dejaba de controlarse por completo, justo en el turno donde
  // más hace falta. Basta con que abra y cierre sean horas distintas.
  if(d.modo === 'seguido'){
    const s = d.seguido;
    if(s && s.ini && s.fin && s.ini !== s.fin) turnos.push({abre:s.ini, cierra:s.fin});
  }else{
    (d.turnos||[]).forEach(t => {
      if(t && t.ini && t.fin && t.ini !== t.fin) turnos.push({abre:t.ini, cierra:t.fin});
    });
  }
  // Un día marcado como abierto pero sin ninguna franja horaria rellenada
  // (el estado de fábrica: defaultHorario() deja ini/fin en blanco) no
  // significa "cerrado" — significa que el negocio aún no ha configurado
  // Horario de apertura en Mi Negocio. Tratarlo como cerrado bloqueaba el
  // selector de hora de Reservas a un único valor fijo (el que quedara por
  // defecto) en cualquier negocio recién dado de alta. Se trata igual que
  // "sin horario configurado" (null): hora libre, sin restricción.
  if(!turnos.length && d.abierto !== false) return null;
  return turnos;
}

// Índice del turno (0,1,...) al que pertenece una hora dada, o null si no
// hay horario configurado o la hora no encaja en ningún turno.
function getTurnoIndexForTime(dateStr, time){
  const turnos = getTurnosForDate(dateStr);
  if(!turnos || !turnos.length) return null;
  const timeMin = timeStrToMinutes(time);
  if(timeMin == null) return null;
  // Límite de cierre exclusivo (para no solapar con el turno siguiente),
  // salvo en el último turno del día, donde se mantiene inclusivo: una
  // reserva justo a la hora de cierre debe seguir contando en ese turno.
  // Comparado en minutos (no como texto) para que un turno que cruza la
  // medianoche (ej. 20:00-02:00) también encaje bien.
  const idx = turnos.findIndex((t, i) => {
    const abreMin = timeStrToMinutes(t.abre), cierraMin = timeStrToMinutes(t.cierra);
    if(abreMin == null || cierraMin == null) return false;
    const isLast = i === turnos.length - 1;
    if(cierraMin > abreMin){
      return timeMin >= abreMin && (isLast ? timeMin <= cierraMin : timeMin < cierraMin);
    }
    // Cruza medianoche: la hora encaja si está a partir de la apertura
    // (hasta las 23:59) O antes/hasta el cierre (ya en el día siguiente).
    return timeMin >= abreMin || (isLast ? timeMin <= cierraMin : timeMin < cierraMin);
  });
  return idx === -1 ? null : idx;
}

// Suma de personas reservadas (pendientes + confirmadas + ya llegadas/completadas)
// para un turno concreto de un día. "Completada" (el cliente ya está sentado)
// sigue ocupando sitio en ese turno igual que "Confirmada" — antes se dejaba
// de contar justo al marcar la llegada, así que el aforo caía a 0 en pleno
// servicio, cuando el turno está más lleno de verdad.
function getReservedPeopleForTurno(dateStr, turnoIdx, excludeId){
  return DB.reservations
    .filter(r => r.date === dateStr && r.id !== excludeId && (r.status === 'pendiente' || r.status === 'confirmada' || r.status === 'completada'))
    .filter(r => getTurnoIndexForTime(dateStr, r.time) === turnoIdx)
    .reduce((sum, r) => sum + (r.people||0), 0);
}

// Devuelve {turnos:[{abre,cierra,reservados,aforo,disponible}]} para un día, o null si no hay horario configurado.
function getAforoInfoForDate(dateStr){
  const turnos = getTurnosForDate(dateStr);
  if(!turnos) return null;
  const aforo = parseInt(DB.business.aforo) || 0;
  return turnos.map((t, idx) => ({
    abre: t.abre, cierra: t.cierra,
    reservados: getReservedPeopleForTurno(dateStr, idx),
    aforo,
    disponible: aforo ? Math.max(0, aforo - getReservedPeopleForTurno(dateStr, idx)) : null
  }));
}
let ofertaTab = 'carta'; // 'carta' | 'menus'

// La segunda pestaña es "Menús" (combos de varios platos a precio fijo) en
// Cocina, y "Maridajes" en Sala (una combinación de bebidas a precio
// cerrado — mismo modelo de datos, grupos y opciones, solo cambia el nombre
// y el icono para que tenga sentido en una carta de bebidas).
function renderOferta(){
  const isSala = currentArea()==='sala';
  const cartaTabBtn = document.getElementById('oferta-tab-carta');
  cartaTabBtn.innerHTML = `<i class="ti ${isSala?'ti-glass-cocktail':'ti-tools-kitchen-2'}"></i> ${t('tab.carta')}`;
  const menusTabBtn = document.getElementById('oferta-tab-menus');
  menusTabBtn.innerHTML = `<i class="ti ${isSala?'ti-glass-full':'ti-list-details'}"></i> ${isSala ? t('tab.maridajes') : t('tab.menus')}`;
  document.getElementById('oferta-carta-tab').style.display = ofertaTab==='carta' ? '' : 'none';
  document.getElementById('oferta-menus-tab').style.display = ofertaTab==='menus' ? '' : 'none';
  document.getElementById('oferta-tab-carta').classList.toggle('btn-primary', ofertaTab==='carta');
  document.getElementById('oferta-tab-menus').classList.toggle('btn-primary', ofertaTab==='menus');
  if(ofertaTab==='carta') renderCarta();
  else renderMenu();
}
function setOfertaTab(tab){
  ofertaTab = tab;
  renderOferta();
  scrollContentToTop();
}

function renderCarta(){
  migrateCartas();
  const isBebidas = currentArea()==='sala';
  const titleEl = document.querySelector('#view-carta .view-title');
  const subtitleEl = document.querySelector('#view-carta .view-subtitle');
  if(titleEl) titleEl.textContent = isBebidas ? t('view.carta.title.sala') : t('view.carta.title');
  if(subtitleEl) subtitleEl.textContent = isBebidas ? t('view.carta.subtitle.sala') : t('view.carta.subtitle');
  const newCartaBtn = document.querySelector('#carta-list-view .toolbar button[onclick="newCarta()"]');
  if(newCartaBtn) newCartaBtn.innerHTML = isBebidas ? `<i class="ti ti-plus"></i> ${t('btn.newBeverageCarta')}` : `<i class="ti ti-plus"></i> ${t('btn.newCarta')}`;
  const newSecBtn = document.querySelector('#carta-editor-view button[onclick="newCartaSection()"]');
  if(newSecBtn) newSecBtn.innerHTML = `<i class="ti ti-plus"></i> ${t('btn.newSection')}`;
  document.getElementById('carta-list-view').style.display = cartaEdit ? 'none' : '';
  document.getElementById('carta-editor-view').style.display = cartaEdit ? '' : 'none';
  if(cartaEdit) renderCartaEditor();
  else renderCartaList();
}

function renderCartaList(){
  // En Sala solo se listan las cartas de bebidas; en Cocina solo las de comida.
  const cartas = DB.cartas.filter(c => isBebidaCarta(c) === (currentArea()==='sala'));
  const totalPlatos = cartas.reduce((s,c)=> s + (c.secciones||[]).reduce((ss,sec)=>ss+(sec.platos||[]).length,0), 0);
  document.getElementById('carta-stats').innerHTML = `
    <div class="kpi"><div class="label">${t('label.cartasMenus')}</div><div class="value">${cartas.length}</div></div>
    <div class="kpi"><div class="label">${currentArea()==='sala' ? t('label.totalDrinks') : t('label.totalDishes')}</div><div class="value">${totalPlatos}</div></div>
  `;
  const box = document.getElementById('carta-list');
  if(!cartas.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-book-off"></i>${t('empty.cartas')}</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.name')}</th><th>${t('label.schedule')}</th><th>${t('label.sections')}</th><th>${currentArea()==='sala' ? t('label.drinksTh') : t('label.dishesTh')}</th><th></th></tr></thead>
        <tbody>
          ${cartas.map(c => {
            const nsec = (c.secciones||[]).length;
            const nplat = (c.secciones||[]).reduce((s,sec)=>s+(sec.platos||[]).length,0);
            return `<tr>
              <td><strong>${escapeHtml(tItem(c))}</strong>${(DB.activeCartaIds||[]).includes(c.id)?` <span class="badge badge-green">${t('badge.activeInPos')}</span>`:''}</td>
              <td>${renderItemScheduleHtml(c)}</td>
              <td>${nsec}</td>
              <td>${nplat}</td>
              <td class="actions-cell">
                <button class="owner-only btn btn-sm btn-icon" onclick="openCarta(${c.id})"><i class="ti ti-edit"></i></button>
                <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteCarta(${c.id})"><i class="ti ti-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Horario semanal por defecto para una carta/menú: activo todos los días, sin
// franja horaria concreta (= disponible todo el día). Cada día admite hasta 2
// franjas horarias (para horario partido, p.ej. mediodía y noche).
function defaultItemHorario(){
  return WEEK_DAYS.map(()=>({activo:true, franjas:[{desde:'', hasta:''}]}));
}
// Construye el horario semanal de una carta/menú a partir de formatos previos:
// - antiguo turno+dias (sin horario)
// - antiguo horario:[7x{activo,desde,hasta}] (1 sola franja por día)
function migrateItemHorario(item){
  if(Array.isArray(item.horario) && item.horario.length===7){
    return item.horario.map(d => {
      if(d && Array.isArray(d.franjas) && d.franjas.length) return {activo: d.activo!==false, franjas: d.franjas};
      return {activo: d ? d.activo!==false : true, franjas:[{desde:(d&&d.desde)||'', hasta:(d&&d.hasta)||''}]};
    });
  }
  const dias = Array.isArray(item.dias) ? item.dias : [0,1,2,3,4,5,6];
  return WEEK_DAYS.map((_,i)=>({activo: dias.includes(i), franjas:[{desde:'', hasta:''}]}));
}
// Renderiza las filas de días/horario compartidas por el editor de cartas y
// menús. Una tarjeta por día, con espacio suficiente para leer y tocar bien
// las horas (antes las columnas eran tan estrechas que el propio campo de
// hora cortaba el texto, p.ej. "11:0" en vez de "11:00").
function renderScheduleRows(prefix, horario){
  return `<div class="carta-schedule-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">${horario.map((d,i) => {
    const franjas = d.franjas && d.franjas.length ? d.franjas : [{desde:'', hasta:''}];
    return `
    <div class="carta-schedule-day" style="padding:10px;border:1px solid var(--border);border-radius:8px;${d.activo===false?'opacity:.55':''}">
      <label style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" id="${prefix}-hor-${i}-activo" ${d.activo!==false?'checked':''} onchange="toggleScheduleDia('${prefix}',${i});updateScheduleSummary('${prefix}')" style="width:15px;height:15px;margin:0">
        ${weekDayFull(i)}
      </label>
      <div id="${prefix}-hor-${i}-rango" style="display:${d.activo!==false?'flex':'none'};flex-direction:column;gap:6px">
        ${franjas.map((f,j) => `
          <div style="display:flex;align-items:center;gap:4px">
            <input type="time" id="${prefix}-hor-${i}-${j}-desde" class="carta-schedule-time" value="${escapeHtml(f.desde||'')}" style="padding:4px 5px;font-size:13px;width:112px;min-height:32px" onchange="updateScheduleSummary('${prefix}')">
            <span style="color:var(--muted);font-size:12px">–</span>
            <input type="time" id="${prefix}-hor-${i}-${j}-hasta" class="carta-schedule-time" value="${escapeHtml(f.hasta||'')}" style="padding:4px 5px;font-size:13px;width:112px;min-height:32px" onchange="updateScheduleSummary('${prefix}')">
            ${j>0 ? `<button class="btn btn-sm btn-icon btn-danger" style="flex-shrink:0" onclick="removeScheduleFranja('${prefix}',${i},${j})" title="${t('common.remove')}"><i class="ti ti-x"></i></button>` : ''}
          </div>
        `).join('')}
        ${franjas.length < 2 ? `<button class="btn btn-sm" style="align-self:flex-start" onclick="addScheduleFranja('${prefix}',${i})"><i class="ti ti-plus"></i> ${t('common.add')}</button>` : ''}
      </div>
    </div>
  `}).join('')}</div><p style="font-size:11.5px;color:var(--muted);margin-top:8px">${t('common.emptyAllDay')}</p>`;
}

// Bloque plegable que envuelve renderScheduleRows(): el horario no se ve
// siempre desplegado (antes ocupaba sitio permanentemente aunque no se
// estuviera tocando) — se abre solo al pulsar, y mientras está cerrado se ve
// un resumen de una línea de los días/horas ya configurados para no
// necesitar abrirlo solo para comprobar qué hay puesto.
let scheduleSectionOpen = {}; // prefix -> bool
function renderScheduleSection(prefix, horario, titleKey, hintKey){
  const open = !!scheduleSectionOpen[prefix];
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <button type="button" onclick="toggleScheduleSection('${prefix}')" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:none;border:none;cursor:pointer;text-align:left;color:inherit;font:inherit">
        <div style="min-width:0">
          <div style="font-weight:700;font-size:14px"><i class="ti ti-calendar-clock"></i> ${t(titleKey)}</div>
          <div id="${prefix}-schedule-summary" style="font-size:12px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(scheduleSummaryText(horario))}</div>
        </div>
        <i class="ti ${open?'ti-chevron-up':'ti-chevron-down'}" style="flex-shrink:0"></i>
      </button>
      <div id="${prefix}-schedule-body" style="display:${open?'':'none'};padding:0 14px 14px">
        <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">${t(hintKey)}</p>
        <div id="${prefix}-horario">${renderScheduleRows(prefix, horario)}</div>
      </div>
    </div>
  `;
}
function toggleScheduleSection(prefix){
  scheduleSectionOpen[prefix] = !scheduleSectionOpen[prefix];
  const body = document.getElementById(`${prefix}-schedule-body`);
  if(body) body.style.display = scheduleSectionOpen[prefix] ? '' : 'none';
  const btn = document.querySelector(`[onclick="toggleScheduleSection('${prefix}')"] .ti`);
  if(btn) btn.className = `ti ${scheduleSectionOpen[prefix] ? 'ti-chevron-up' : 'ti-chevron-down'}`;
}
// Refresca el resumen de la cabecera (colapsada o no) tras cualquier cambio
// en los días/horas — sin volver a pintar toda la rejilla, para no perder
// el foco del campo que se esté editando.
function updateScheduleSummary(prefix){
  const el = document.getElementById(`${prefix}-schedule-summary`);
  if(el) el.textContent = scheduleSummaryText(readScheduleFromForm(prefix));
}
function toggleScheduleDia(prefix, i){
  const on = document.getElementById(`${prefix}-hor-${i}-activo`).checked;
  document.getElementById(`${prefix}-hor-${i}-rango`).style.display = on ? 'flex' : 'none';
}
function addScheduleFranja(prefix, i){
  const horario = readScheduleFromForm(prefix);
  if(horario[i].franjas.length < 2) horario[i].franjas.push({desde:'', hasta:''});
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, horario);
  updateScheduleSummary(prefix);
}
function removeScheduleFranja(prefix, i, j){
  const horario = readScheduleFromForm(prefix);
  horario[i].franjas.splice(j, 1);
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, horario);
  updateScheduleSummary(prefix);
}
function readScheduleFromForm(prefix){
  return WEEK_DAYS.map((_,i)=>{
    const activo = document.getElementById(`${prefix}-hor-${i}-activo`).checked;
    const franjas = [];
    for(let j=0; j<2; j++){
      const elDesde = document.getElementById(`${prefix}-hor-${i}-${j}-desde`);
      if(!elDesde) break;
      const elHasta = document.getElementById(`${prefix}-hor-${i}-${j}-hasta`);
      franjas.push({desde: elDesde.value, hasta: elHasta.value});
    }
    return {activo, franjas: franjas.length ? franjas : [{desde:'', hasta:''}]};
  });
}

// True si el horario configurado NO va a coincidir NUNCA con "ahora" (todos
// los días desactivados) — para poder avisar de una carta/menú que quedaría
// invisible sin que nadie se dé cuenta.
function horarioNuncaActivo(horario){
  return !horario || !horario.length || horario.every(d => d && d.activo === false);
}

function newCarta(){
  // El área en que se crea la carta determina su tipo: en Sala es carta de
  // bebidas (no aparece en cocina); en Cocina es carta de comida.
  cartaEdit = {id: genId(), nombre:'', area: currentArea(), horario: defaultItemHorario(), secciones:[]};
  renderCarta();
}
function openCarta(id){
  const c = DB.cartas.find(x=>x.id===id);
  if(!c) return;
  cartaEdit = JSON.parse(JSON.stringify(c));
  // La nube no guarda listas vacías: restaurarlas si faltan
  if(!Array.isArray(cartaEdit.secciones)) cartaEdit.secciones = [];
  cartaEdit.horario = migrateItemHorario(cartaEdit);
  cartaEdit.secciones.forEach(s => { if(!Array.isArray(s.platos)) s.platos = []; });
  renderCarta();
}
function backToCartaList(){
  cartaEdit = null;
  renderCarta();
}
async function deleteCarta(id){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteCarta')))) return;
  DB.cartas = DB.cartas.filter(c=>c.id!==id);
  DB.activeCartaIds = (DB.activeCartaIds||[]).filter(cid=>cid!==id);
  saveDB();
  renderCarta();
  showToast(t('msg.cartaDeleted'));
}
function saveCarta(){
  if(!isOwnerSession() && !editUnlocked) return;
  const nombre = document.getElementById('carta-f-nombre').value.trim();
  if(!nombre){ showToast(t('msg.cartaNameRequired')); return; }
  cartaEdit.nombre = nombre.toUpperCase();
  // Asegura el área: una carta editada en Sala es de bebidas, en Cocina de comida.
  if(!cartaEdit.area) cartaEdit.area = currentArea();
  cartaEdit.horario = readScheduleFromForm('carta');
  delete cartaEdit.turno;
  delete cartaEdit.dias;
  const nuncaActiva = horarioNuncaActivo(cartaEdit.horario);
  const idx = DB.cartas.findIndex(c=>c.id===cartaEdit.id);
  if(idx>=0) DB.cartas[idx] = cartaEdit;
  else DB.cartas.push(cartaEdit);
  saveDB();
  autoTranslateCarta(cartaEdit).catch(()=>{});
  cartaEdit = null;
  updateAutoActiveCarta(true);
  renderCarta();
  showToast(nuncaActiva ? t('msg.horarioNuncaActivo') : t('msg.cartaSaved'));
}

function renderCartaEditor(){
  document.getElementById('carta-f-nombre').value = cartaEdit.nombre || '';
  document.getElementById('carta-horario-section').innerHTML = renderScheduleSection('carta', cartaEdit.horario, 'label.daysAndSchedule', 'label.cartaScheduleHint');
  renderCartaSecciones();
}

function setCartaSearchQuery(val){
  cartaSearchQuery = val;
  const el = document.getElementById('carta-search-input');
  const pos = el ? el.selectionStart : null;
  renderCartaSecciones();
  const newEl = document.getElementById('carta-search-input');
  if(newEl && pos != null){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
}
function renderCartaSecciones(){
  const box = document.getElementById('carta-secciones');
  const q = cartaSearchQuery.trim().toLowerCase();
  const searchBox = `
    <div class="field" style="margin-bottom:10px">
      <input type="text" id="carta-search-input" placeholder="${t('ph.searchDish')}" value="${escapeHtml(cartaSearchQuery)}" oninput="setCartaSearchQuery(this.value)" style="max-width:320px">
    </div>`;
  if(!cartaEdit.secciones.length){
    box.innerHTML = searchBox + `<div class="empty"><i class="ti ti-list"></i>${t('empty.sections')}</div>`;
    return;
  }
  const secciones = cartaEdit.secciones;
  const rows = secciones.map((sec, si) => {
    const platos = sec.platos || [];
    const secMatches = !q || tItem(sec).toLowerCase().includes(q);
    const visiblePlatos = q && !secMatches ? platos.filter(p => tItem(p).toLowerCase().includes(q)) : platos;
    if(q && !secMatches && !visiblePlatos.length) return '';
    return `
    <div class="ge-section">
      <div class="ge-sec-head">
        <div style="display:flex;align-items:center;gap:4px">
          ${reorderButtons(`moveCartaSection(${si},-1)`, `moveCartaSection(${si},1)`, si===0, si===secciones.length-1)}
          <h4 style="margin:0">${escapeHtml(tItem(sec))}</h4>
        </div>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="addCartaPlato(${sec.id})"><i class="ti ti-plus"></i> ${currentArea()==='sala' ? t('btn.newDrinkManual') : t('btn.newDishManual')}</button>
          <button class="btn btn-sm" onclick="importFromEscandallo(${sec.id})"><i class="ti ti-download"></i> ${t('btn.escandalloShort')}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeCartaSection(${sec.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      ${visiblePlatos.length ? visiblePlatos.map(p => {
        const pi = platos.indexOf(p);
        // El precio de venta se gestiona siempre desde el Escandallo — la
        // Carta solo guarda una copia para no tener que recalcularla en
        // cada render. Si el Escandallo cambió el precio desde que se
        // importó, se sincroniza aquí solo (antes hacía falta pulsar
        // "Actualizar precio" a mano cada vez).
        const linkedRecipe = p.recipeId ? getRecipe(p.recipeId) : null;
        if(linkedRecipe && (linkedRecipe.price||0) !== (p.precio||0)){
          p.precio = linkedRecipe.price||0;
          p.precioBase = linkedRecipe.priceBase;
          p.ivaPct = linkedRecipe.ivaPct;
        }
        // Semáforo de rentabilidad: mismos umbrales que en Escandallo (food
        // cost sobre el precio de venta), para ver de un vistazo, sin salir
        // de la Carta, qué platos tienen buen margen y cuáles lo están
        // comiendo. Sin receta vinculada no hay coste que calcular.
        const fcPct = linkedRecipe ? recipeFoodCostPct(linkedRecipe) : null;
        const marginDot = fcPct==null || !isFinite(fcPct) ? ''
          : `<span class="badge ${fcPct>35?'badge-red':fcPct>28?'badge-amber':'badge-green'}" style="flex:none" title="${t('carta.foodCostHint')}">${fcPct.toFixed(0)}% FC</span>`;
        return `
        <div class="ge-item">
          <div style="display:flex;align-items:center;gap:2px">${reorderButtons(`moveCartaPlato(${sec.id},${pi},-1)`, `moveCartaPlato(${sec.id},${pi},1)`, pi===0, pi===platos.length-1)}</div>
          ${marginDot}
          <span class="carta-plato-name" style="flex:1;font-weight:600">${escapeHtml(tItem(p))}</span>
          <span class="carta-plato-price" style="font-family:monospace;font-weight:600;margin-right:10px">${fmtMoney(p.precio)}</span>
          <button class="btn btn-sm" onclick="openPlatoModsModal(${sec.id},${p.id})"><i class="ti ti-adjustments"></i> ${t('title.extras')}${(p.modificadores||[]).length ? ` (${p.modificadores.length})` : ''}</button>
          <button class="btn btn-sm ${p.disponible===false?'btn-danger':''}" onclick="toggleCartaPlato(${sec.id},${p.id})">${p.disponible===false?t('common.unavailable'):t('common.available')}</button>
          <button class="btn btn-sm ${p.stock!=null && p.stock<=0?'btn-danger':''}" style="${p.stock!=null && p.stock>0?'background:var(--amber-l);border-color:var(--amber)':''}" onclick="setCartaPlatoStock(${sec.id},${p.id})" title="${t('title.limitPortions')}"><i class="ti ti-stack-2"></i> ${p.stock!=null ? t('label.portionsLeft').replace('${n}', p.stock) : t('btn.limitPortions')}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeCartaPlato(${sec.id},${p.id})"><i class="ti ti-x"></i></button>
        </div>
      `;}).join('') : `<div class="empty" style="padding:14px">${q ? t('empty.noSearchResults') : (currentArea()==='sala' ? t('empty.sectionDrinks') : t('empty.sectionDishes'))}</div>`}
    </div>
  `;
  }).join('');
  box.innerHTML = searchBox + (rows.trim() ? rows : `<div class="empty"><i class="ti ti-search"></i>${t('empty.noSearchResults')}</div>`);
}
function moveCartaSection(index, dir){
  moveArrayItem(cartaEdit.secciones, index, dir);
  renderCartaSecciones();
}
function moveCartaPlato(secId, index, dir){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  moveArrayItem(sec.platos, index, dir);
  renderCartaSecciones();
}

function newCartaSection(){
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newSection')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('ph.sectionName')}</label>
      <input type="text" id="new-carta-section-name" placeholder="${t('ph.sectionName')}">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmNewCartaSection()">${t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-carta-section-name')?.focus(), 50);
}
function confirmNewCartaSection(){
  const nombre = document.getElementById('new-carta-section-name').value;
  if(!nombre || !nombre.trim()){ showToast(t('msg.sectionNameRequired')); return; }
  cartaEdit.secciones.push({id: genId(), nombre: nombre.trim().toUpperCase(), platos:[]});
  closeModal();
  renderCartaSecciones();
}
async function removeCartaSection(secId){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteSection')))) return;
  cartaEdit.secciones = cartaEdit.secciones.filter(s=>s.id!==secId);
  renderCartaSecciones();
}
function toggleCartaPlato(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  p.disponible = p.disponible===false ? true : false;
  renderCartaSecciones();
}
// Raciones limitadas: p.stock es null/undefined si el plato no lleva
// control de cantidad (comportamiento normal, disponible/no disponible a
// mano). Si se le pone un número, el TPV lo va descontando solo cada vez
// que se marcha una unidad a cocina (ver decrementDishStock en tpv.js) y al
// llegar a 0 el plato pasa a "No disponible" sin que nadie tenga que
// acordarse — no se resetea solo: cuando se agote un día, hay que volver a
// aquí y ponerle de nuevo la cantidad para el día siguiente.
async function setCartaPlatoStock(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec && sec.platos.find(x=>x.id===platoId);
  if(!p) return;
  const current = p.stock!=null ? String(p.stock) : '';
  const val = await promptText(t('msg.setStockPrompt'), current, {allowEmpty:true});
  if(val === null) return;
  const trimmed = val.trim();
  if(trimmed === ''){ delete p.stock; renderCartaSecciones(); return; }
  const n = parseInt(trimmed);
  if(isNaN(n) || n < 0){ showToast(t('msg.invalidStockNumber')); return; }
  p.stock = n;
  p.disponible = n > 0;
  renderCartaSecciones();
}
async function removeCartaPlato(secId, platoId){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  sec.platos = sec.platos.filter(p=>p.id!==platoId);
  renderCartaSecciones();
}
function addCartaPlato(secId){
  const isBebidas = currentArea()==='sala';
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newDishManual')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${isBebidas ? t('label.newDrinkNameField') : t('label.newDishNameField')}</label>
      <input type="text" id="new-carta-plato-nombre" placeholder="${isBebidas ? t('ph.drinkNameExample') : t('ph.dishNameExample')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.priceBaseNoVat')}</label>
        <input type="number" id="new-carta-plato-precio-base" step="0.01" min="0" oninput="updateCartaPlatoFinalPriceDisplay()">
      </div>
      <div class="field">
        <label>${t('label.ivaTypeRepercutido')}</label>
        <select id="new-carta-plato-iva" onchange="updateCartaPlatoFinalPriceDisplay()">
          <option value="" selected disabled>${t('label.chooseIva')}</option>
          ${[21,10,4,0].map(pct => `<option value="${pct}">${pct}%</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field" style="margin-top:-8px">
      <span style="font-size:12.5px;color:var(--muted)">${t('label.finalPriceWithVat')}: <strong id="new-carta-plato-precio-final">${fmtMoney(0)}</strong></span>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddCartaPlato(${secId})">${t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-carta-plato-nombre')?.focus(), 50);
}
function updateCartaPlatoFinalPriceDisplay(){
  const base = parseFloat(document.getElementById('new-carta-plato-precio-base').value) || 0;
  const ivaVal = document.getElementById('new-carta-plato-iva').value;
  const iva = ivaVal === '' ? 0 : parseFloat(ivaVal);
  document.getElementById('new-carta-plato-precio-final').textContent = fmtMoney(base * (1 + iva/100));
}
function confirmAddCartaPlato(secId){
  const nombre = document.getElementById('new-carta-plato-nombre').value;
  if(!nombre || !nombre.trim()){ showToast(currentArea()==='sala' ? t('msg.needDrinkName') : t('msg.needDishName')); return; }
  const precioBaseStr = document.getElementById('new-carta-plato-precio-base').value;
  const precioBase = parseFloat((precioBaseStr||'').replace(',','.'));
  if(isNaN(precioBase) || precioBase < 0){ showToast(t('msg.invalidPrice')); return; }
  const ivaRaw = document.getElementById('new-carta-plato-iva').value;
  if(ivaRaw === ''){ showToast(t('msg.chooseIvaForDish')); return; }
  const ivaPct = parseFloat(ivaRaw);
  const precio = Math.round(precioBase * (1 + ivaPct/100) * 100) / 100;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  sec.platos.push({id: genId(), recipeId:null, nombre: nombre.trim(), precio, precioBase, ivaPct, disponible:true, modificadores:[]});
  closeModal();
  renderCartaSecciones();
}

/* ============== Modificadores / extras de plato ============== */
function openPlatoModsModal(secId, platoId){
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
function renderPlatoModsModalHtml(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  const mods = p.modificadores || [];
  const isBebidas = currentArea()==='sala';
  return `
    <div class="modal-header">
      <h3><i class="ti ti-adjustments"></i> ${t('title.extras')} "${escapeHtml(tItem(p))}"</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${isBebidas ? t('msg.extrasDescDrink') : t('msg.extrasDescDish')}</p>
    <div style="margin-bottom:12px">
      ${mods.length ? mods.map(m => `
        <div class="ge-item">
          <span style="flex:1">${escapeHtml(tItem(m))}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px">${m.precio ? '+'+fmtMoney(m.precio) : t('common.free')}</span>
          <button class="btn btn-sm btn-icon btn-danger" onclick="removePlatoMod(${secId},${platoId},${m.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:10px">${t('empty.mods')}</div>`}
    </div>
    <div class="field">
      <label>${t('label.extraName')}</label>
      <input type="text" id="new-mod-nombre" placeholder="${t('ph.extraNameExample')}">
    </div>
    <div class="field">
      <label>${t('label.extraPrice')}</label>
      <input type="number" id="new-mod-precio" step="0.01" min="0" value="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="addPlatoMod(${secId},${platoId})"><i class="ti ti-plus"></i> ${t('btn.addExtra')}</button>
    </div>
  `;
}
function addPlatoMod(secId, platoId){
  const nombre = (document.getElementById('new-mod-nombre').value||'').trim();
  if(!nombre){ showToast(t('msg.extraNameRequired')); return; }
  const precioStr = document.getElementById('new-mod-precio').value;
  const precio = parseFloat((precioStr||'0').replace(',','.')) || 0;
  if(precio < 0){ showToast(t('msg.invalidPrice')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  if(!p.modificadores) p.modificadores = [];
  p.modificadores.push({id: genId(), nombre, precio});
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
async function removePlatoMod(secId, platoId, modId){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  p.modificadores = (p.modificadores||[]).filter(m=>m.id!==modId);
  openModal(renderPlatoModsModalHtml(secId, platoId));
}

function importFromEscandallo(secId){
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && !r.isBase);
  if(!areaRecipes.length){ showToast(currentArea()==='sala' ? t('msg.noDrinksInCosting') : t('msg.noDishesInCosting')); return; }
  const existingIds = new Set(cartaEdit.secciones.flatMap(s=>(s.platos||[]).map(p=>p.recipeId).filter(Boolean)));
  openModal(`
    <div class="modal-header">
      <h3>${t('title.importFromCosting')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field" style="margin-bottom:8px">
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="import-esc-all" onchange="toggleImportEscAll(this.checked)" style="width:auto"> ${t('common.selectAll')}
      </label>
    </div>
    <div id="import-esc-list" style="max-height:320px;overflow:auto">
      ${areaRecipes.map(r => {
        const done = existingIds.has(r.id);
        return `<label style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);${done?'opacity:.5':''}">
          <input type="checkbox" value="${r.id}" ${done?'disabled checked':''} style="width:auto">
          <span style="flex:1">${escapeHtml(r.name)}</span>
          <span style="font-family:monospace;color:var(--brand-orange);font-weight:600">${fmtMoney(r.price)}</span>
        </label>`;
      }).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmImportEsc(${secId})">${t('common.import')}</button>
    </div>
  `);
}
function toggleImportEscAll(checked){
  document.querySelectorAll('#import-esc-list input[type=checkbox]:not(:disabled)').forEach(c=>c.checked=checked);
}
function confirmImportEsc(secId){
  const checked = [...document.querySelectorAll('#import-esc-list input[type=checkbox]:checked:not(:disabled)')].map(c=>parseInt(c.value));
  if(!checked.length){ showToast(currentArea()==='sala' ? t('msg.selectAtLeastOneDrink') : t('msg.selectAtLeastOneDish')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  checked.forEach(rid => {
    const r = getRecipe(rid);
    if(!r) return;
    sec.platos.push({id: genId(), recipeId: r.id, nombre: r.name, precio: r.price||0, precioBase: r.priceBase, ivaPct: r.ivaPct, disponible:true});
  });
  closeModal();
  renderCartaSecciones();
  const isDrink = currentArea()==='sala';
  if(checked.length===1) showToast(isDrink ? t('msg.oneDrinkImported') : t('msg.oneDishImported'));
  else showToast((isDrink ? t('msg.nDrinksImported') : t('msg.nDishesImported')).replace('${n}', checked.length));
}

/* ============================================================
   MENÚS — Combos de precio cerrado con grupos de opciones
   ============================================================ */
let menuEdit = null; // {id, nombre, precio, horario:[7x{activo,desde,hasta}], grupos:[{id, nombre, opciones:[{id, recipeId, nombre, suplemento}]}]}

function getActiveMenus(){
  const ids = DB.activeMenuIds||[];
  return DB.menus.filter(m=>ids.includes(m.id));
}
function toggleActiveMenu(id, checked){
  id = parseInt(id);
  if(!Array.isArray(DB.activeMenuIds)) DB.activeMenuIds = [];
  if(checked){
    if(!DB.activeMenuIds.includes(id)) DB.activeMenuIds.push(id);
  }else{
    DB.activeMenuIds = DB.activeMenuIds.filter(mid=>mid!==id);
  }
  saveDB();
  renderTPV();
}
function computeAutoActiveMenuIds(){
  if(!DB.menus || !DB.menus.length) return [];
  const now = new Date();
  return DB.menus.filter(m => cartaIsActiveNow(m, now)).map(m=>m.id);
}
function updateAutoActiveMenu(force){
  if(!DB.business) return;
  const autoIds = computeAutoActiveMenuIds();
  // Igual que en updateAutoActiveCarta(): si ahora mismo no hay ningún menú
  // que coincida con su horario, hay que vaciar activeMenuIds también, no
  // dejar el último activo para siempre.
  const current = DB.activeMenuIds||[];
  const changed = force || autoIds.length !== current.length || autoIds.some(id=>!current.includes(id));
  if(changed){
    DB.activeMenuIds = autoIds;
    saveDB();
    if(document.getElementById('view-tpv')?.classList.contains('active')) renderTPV();
  }
}

function renderMenu(){
  document.getElementById('menu-list-view').style.display = menuEdit ? 'none' : '';
  document.getElementById('menu-editor-view').style.display = menuEdit ? '' : 'none';
  if(menuEdit) renderMenuEditor();
  else renderMenuList();
}

function areaMenus(){
  return DB.menus.filter(m => !m.area || m.area === currentArea());
}
function renderMenuList(){
  const isSala = currentArea()==='sala';
  const menus = areaMenus();
  const totalGrupos = menus.reduce((s,m)=>s+(m.grupos||[]).length,0);
  const newBtn = document.querySelector('#menu-list-view button[onclick="newMenu()"] span');
  if(newBtn) newBtn.textContent = isSala ? t('label.newMaridaje') : t('btn.newMenu');
  document.getElementById('menu-stats').innerHTML = `
    <div class="kpi"><div class="label">${isSala ? t('tab.maridajes') : t('common.menus')}</div><div class="value">${menus.length}</div></div>
    <div class="kpi"><div class="label">${t('label.totalGroups')}</div><div class="value">${totalGrupos}</div></div>
  `;
  const box = document.getElementById('menu-list');
  if(!menus.length){
    box.innerHTML = `<div class="empty"><i class="ti ${isSala?'ti-glass-full':'ti-list-details'}"></i>${isSala ? t('empty.maridajes') : t('empty.menus')}</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.name')}</th><th>${t('common.price')}</th><th>${t('label.schedule')}</th><th>${t('label.groups')}</th><th></th></tr></thead>
        <tbody>
          ${menus.map(m => {
            const ngrupos = (m.grupos||[]).length;
            return `<tr>
              <td><strong>${escapeHtml(tItem(m))}</strong>${(DB.activeMenuIds||[]).includes(m.id)?` <span class="badge badge-green">${t('badge.activeInPosM')}</span>`:''}</td>
              <td style="font-family:monospace;font-weight:600">${fmtMoney(m.precio)}</td>
              <td>${renderItemScheduleHtml(m)}</td>
              <td>${ngrupos}</td>
              <td class="actions-cell">
                <button class="owner-only btn btn-sm btn-icon" onclick="openMenu(${m.id})"><i class="ti ti-edit"></i></button>
                <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteMenu(${m.id})"><i class="ti ti-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function newMenu(){
  menuEdit = {id: genId(), nombre:'', precio:0, horario: defaultItemHorario(), grupos:[], desglosarPases:true, area: currentArea()};
  renderMenu();
}
function openMenu(id){
  const m = DB.menus.find(x=>x.id===id);
  if(!m) return;
  menuEdit = JSON.parse(JSON.stringify(m));
  if(!Array.isArray(menuEdit.grupos)) menuEdit.grupos = [];
  menuEdit.horario = migrateItemHorario(menuEdit);
  menuEdit.grupos.forEach(g => { if(!Array.isArray(g.opciones)) g.opciones = []; });
  renderMenu();
}
function backToMenuList(){
  menuEdit = null;
  renderMenu();
}
async function deleteMenu(id){
  if(!(await confirmModal(t('msg.confirmDeleteMenu')))) return;
  DB.menus = DB.menus.filter(m=>m.id!==id);
  DB.activeMenuIds = (DB.activeMenuIds||[]).filter(mid=>mid!==id);
  saveDB();
  renderMenu();
  showToast(t('msg.menuDeleted'));
}
function updateMenuFinalPriceDisplay(){
  const base = parseFloat(document.getElementById('menu-f-precio-base').value) || 0;
  const ivaVal = document.getElementById('menu-f-iva').value;
  const iva = ivaVal === '' ? 0 : parseFloat(ivaVal);
  document.getElementById('menu-f-precio-final').textContent = fmtMoney(base * (1 + iva/100));
}
function saveMenu(){
  const nombre = document.getElementById('menu-f-nombre').value.trim();
  if(!nombre){ showToast(t('msg.menuNameRequired')); return; }
  const precioBaseStr = document.getElementById('menu-f-precio-base').value;
  const precioBase = parseFloat((precioBaseStr||'').replace(',','.'));
  if(isNaN(precioBase) || precioBase < 0){ showToast(t('msg.invalidPrice')); return; }
  const ivaRaw = document.getElementById('menu-f-iva').value;
  if(ivaRaw === ''){ showToast(t('msg.chooseIvaForDish')); return; }
  const ivaPct = parseFloat(ivaRaw);
  const precio = Math.round(precioBase * (1 + ivaPct/100) * 100) / 100;
  if(!menuEdit.grupos.length){ showToast(t('msg.menuNeedsGroup')); return; }
  for(const g of menuEdit.grupos){
    if(!g.opciones.length){ showToast(t('msg.groupNeedsOneOption').replace('${name}', g.nombre)); return; }
  }
  menuEdit.nombre = nombre;
  menuEdit.precio = precio;
  menuEdit.precioBase = precioBase;
  menuEdit.ivaPct = ivaPct;
  menuEdit.horario = readScheduleFromForm('menu');
  delete menuEdit.turno;
  delete menuEdit.dias;
  menuEdit.desglosarPases = true;
  const nuncaActivo = horarioNuncaActivo(menuEdit.horario);
  const idx = DB.menus.findIndex(m=>m.id===menuEdit.id);
  if(idx>=0) DB.menus[idx] = menuEdit;
  else DB.menus.push(menuEdit);
  saveDB();
  autoTranslateMenu(menuEdit).catch(()=>{});
  menuEdit = null;
  updateAutoActiveMenu(true);
  renderMenu();
  showToast(nuncaActivo ? t('msg.horarioNuncaActivo') : t('msg.menuSaved'));
}

function renderMenuEditor(){
  const isSala = currentArea()==='sala';
  document.getElementById('menu-editor-back-label').textContent = isSala ? t('tab.maridajes') : t('common.menus');
  document.getElementById('menu-f-nombre').value = menuEdit.nombre || '';
  document.getElementById('menu-f-nombre').placeholder = isSala ? t('ph.maridajeName') : t('ph.menuName');
  document.getElementById('menu-f-precio-base').value = menuEdit.precioBase!=null ? menuEdit.precioBase : (menuEdit.precio||0);
  const ivaSel = document.getElementById('menu-f-iva');
  ivaSel.value = menuEdit.ivaPct!=null ? menuEdit.ivaPct : '';
  updateMenuFinalPriceDisplay();
  document.getElementById('menu-horario-section').innerHTML = renderScheduleSection('menu', menuEdit.horario, 'label.daysAndScheduleMenu', 'label.menuScheduleHint');
  renderMenuGrupos();
}

let menuSearchQuery = '';
function setMenuSearchQuery(val){
  menuSearchQuery = val;
  const el = document.getElementById('menu-search-input');
  const pos = el ? el.selectionStart : null;
  renderMenuGrupos();
  const newEl = document.getElementById('menu-search-input');
  if(newEl && pos != null){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
}
function renderMenuGrupos(){
  const box = document.getElementById('menu-grupos');
  const q = menuSearchQuery.trim().toLowerCase();
  const searchBox = `
    <div class="field" style="margin-bottom:10px">
      <input type="text" id="menu-search-input" placeholder="${t('ph.searchDish')}" value="${escapeHtml(menuSearchQuery)}" oninput="setMenuSearchQuery(this.value)" style="max-width:320px">
    </div>`;
  if(!menuEdit.grupos.length){
    box.innerHTML = searchBox + `<div class="empty"><i class="ti ti-list"></i>${t('empty.groups')}</div>`;
    return;
  }
  const grupos = menuEdit.grupos;
  const rows = grupos.map((g, gi) => {
    const opciones = g.opciones || [];
    const grupoMatches = !q || g.nombre.toLowerCase().includes(q);
    const visibleOpciones = q && !grupoMatches ? opciones.filter(o => o.nombre.toLowerCase().includes(q)) : opciones;
    if(q && !grupoMatches && !visibleOpciones.length) return '';
    return `
    <div class="ge-section">
      <div class="ge-sec-head">
        <div style="display:flex;align-items:center;gap:4px">
          ${reorderButtons(`moveMenuGrupo(${gi},-1)`, `moveMenuGrupo(${gi},1)`, gi===0, gi===grupos.length-1)}
          <h4 style="margin:0">${escapeHtml(g.nombre)}${g.bebida ? ` <span style="font-size:11px;color:var(--muted);font-weight:400"><i class="ti ti-glass-full"></i> ${t('label.sala')}</span>` : ''}</h4>
        </div>
        <div class="actions-cell">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:400;cursor:pointer"><input type="checkbox" style="width:auto" ${g.bebida?'checked':''} onchange="toggleGrupoBebida(${g.id},this.checked)"> ${t('label.bebidaGroup')}</label>
          <button class="btn btn-sm" onclick="addMenuOpcion(${g.id})"><i class="ti ti-plus"></i> ${t('btn.newOption')}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeMenuGrupo(${g.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      ${visibleOpciones.length ? visibleOpciones.map(o => {
        const oi = opciones.indexOf(o);
        return `
        <div class="ge-item">
          <div style="display:flex;align-items:center;gap:2px">${reorderButtons(`moveMenuOpcion(${g.id},${oi},-1)`, `moveMenuOpcion(${g.id},${oi},1)`, oi===0, oi===opciones.length-1)}</div>
          <span style="flex:1;font-weight:600">${escapeHtml(o.nombre)}</span>
          ${o.suplemento ? `<span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--brand-orange)">+${fmtMoney(o.suplemento)}</span>` : ''}
          <button class="btn btn-sm" onclick="openMenuOpcionModsModal(${g.id},${o.id})"><i class="ti ti-adjustments"></i> ${t('title.extras')}${(o.modificadores||[]).length ? ` (${o.modificadores.length})` : ''}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcion(${g.id},${o.id})"><i class="ti ti-x"></i></button>
        </div>
      `;}).join('') : `<div class="empty" style="padding:14px">${q ? t('empty.noSearchResults') : t('empty.groupOptions')}</div>`}
    </div>
  `;
  }).join('');
  box.innerHTML = searchBox + (rows.trim() ? rows : `<div class="empty"><i class="ti ti-search"></i>${t('empty.noSearchResults')}</div>`);
}
function moveMenuGrupo(index, dir){
  moveArrayItem(menuEdit.grupos, index, dir);
  renderMenuGrupos();
}
function moveMenuOpcion(grupoId, index, dir){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  if(!g) return;
  moveArrayItem(g.opciones, index, dir);
  renderMenuGrupos();
}

function newMenuGrupo(){
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newGroup')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('ph.sectionName')}</label>
      <input type="text" id="new-menu-grupo-name" placeholder="${t('ph.egMenuGroups')}">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmNewMenuGrupo()">${t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-menu-grupo-name')?.focus(), 50);
}
function confirmNewMenuGrupo(){
  const nombre = document.getElementById('new-menu-grupo-name').value;
  if(!nombre || !nombre.trim()){ showToast(t('msg.groupNameRequired')); return; }
  menuEdit.grupos.push({id: genId(), nombre: nombre.trim(), opciones:[], bebida: currentArea()==='sala'});
  closeModal();
  renderMenuGrupos();
}
async function removeMenuGrupo(grupoId){
  if(!(await confirmModal(t('msg.confirmDeleteGroup')))) return;
  menuEdit.grupos = menuEdit.grupos.filter(g=>g.id!==grupoId);
  renderMenuGrupos();
}

function toggleGrupoBebida(grupoId, checked){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  if(g){ g.bebida = checked; g.opciones = []; }
  renderMenuGrupos();
}

// Todas las bebidas ya dadas de alta en las cartas de Sala (Carta de
// Bebidas), para poder elegirlas por nombre al montar un grupo de bebida
// de un Menú — sin arrastrar su precio de carta, ya que el menú es de
// precio fijo (solo se copia el nombre; el "Suplemento" sigue siendo un
// extra manual y opcional sobre el precio del menú).
function getCartaBebidaDishes(){
  const dishes = [];
  (DB.cartas||[]).filter(isBebidaCarta).forEach(c => {
    (c.secciones||[]).forEach(sec => {
      (sec.platos||[]).forEach(p => dishes.push({platoId: p.id, nombre: tItem(p)}));
    });
  });
  return dishes;
}
function addMenuOpcion(grupoId){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  if(g && g.bebida){
    const bebidas = getCartaBebidaDishes();
    openModal(`
      <div class="modal-header">
        <h3>${t('title.newOption')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="field">
        <label>${t('label.drinkOrigin')}</label>
        <select id="new-menu-opcion-tipo" onchange="toggleMenuOpcionTipo()">
          <option value="carta">${t('label.drinkFromCartaSala')}</option>
          <option value="manual">${t('label.typeNameManually')}</option>
        </select>
      </div>
      <div class="field" id="new-menu-opcion-recipe-field" style="display:${bebidas.length?'':'none'}">
        <label>${t('label.drinkCartaSala')}</label>
        <select id="new-menu-opcion-plato">
          ${bebidas.map(b=>`<option value="${b.platoId}">${escapeHtml(b.nombre)}</option>`).join('')}
        </select>
        <p style="font-size:12px;color:var(--muted);margin-top:4px">${t('label.onlyNameCopiedNote')}</p>
      </div>
      <div class="field" id="new-menu-opcion-manual-field" style="display:${bebidas.length?'none':''}">
        <label>${t('label.drinkName')}</label>
        <input type="text" id="new-menu-opcion-nombre" placeholder="${t('ph.egDrinkOption')}">
      </div>
      <div class="field">
        <label>${t('label.supplementEur')} <span style="color:var(--muted);font-weight:400">${t('label.supplementHint')}</span></label>
        <input type="number" id="new-menu-opcion-suplemento" step="0.01" min="0" value="0">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="confirmAddMenuOpcion(${grupoId})">${t('common.add')}</button>
      </div>
    `);
    if(!bebidas.length) document.getElementById('new-menu-opcion-tipo').value = 'manual';
    setTimeout(()=>document.getElementById('new-menu-opcion-nombre')?.focus(), 50);
    return;
  }
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea());
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newOption')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.dishOrigin')}</label>
      <select id="new-menu-opcion-tipo" onchange="toggleMenuOpcionTipo()">
        <option value="escandallo">${t('label.dishFromEscandallo')}</option>
        <option value="manual">${t('label.typeNameManually')}</option>
      </select>
    </div>
    <div class="field" id="new-menu-opcion-recipe-field" style="display:${areaRecipes.length?'':'none'}">
      <label>${t('label.dishEscandallo')}</label>
      <select id="new-menu-opcion-recipe">
        ${areaRecipes.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}
      </select>
    </div>
    <div class="field" id="new-menu-opcion-manual-field" style="display:${areaRecipes.length?'none':''}">
      <label>${t('label.dishName')}</label>
      <input type="text" id="new-menu-opcion-nombre" placeholder="${t('ph.dishNameExample')}">
    </div>
    <div class="field">
      <label>${t('label.supplementEur')} <span style="color:var(--muted);font-weight:400">${t('label.supplementHint')}</span></label>
      <input type="number" id="new-menu-opcion-suplemento" step="0.01" min="0" value="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddMenuOpcion(${grupoId})">${t('common.add')}</button>
    </div>
  `);
  if(!areaRecipes.length) document.getElementById('new-menu-opcion-tipo').value = 'manual';
  setTimeout(()=>document.getElementById('new-menu-opcion-nombre')?.focus(), 50);
}
function toggleMenuOpcionTipo(){
  const manual = document.getElementById('new-menu-opcion-tipo').value === 'manual';
  document.getElementById('new-menu-opcion-recipe-field').style.display = manual ? 'none' : '';
  document.getElementById('new-menu-opcion-manual-field').style.display = manual ? '' : 'none';
}
function confirmAddMenuOpcion(grupoId){
  const supStr = document.getElementById('new-menu-opcion-suplemento').value;
  const suplemento = parseFloat((supStr||'0').replace(',','.')) || 0;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const tipo = document.getElementById('new-menu-opcion-tipo').value;
  if(tipo === 'manual'){
    const nombre = document.getElementById('new-menu-opcion-nombre').value.trim();
    if(!nombre){ showToast(t('msg.dishNameRequired')); return; }
    g.opciones.push({id: genId(), recipeId: null, nombre, suplemento});
  } else if(tipo === 'carta'){
    const platoId = parseInt(document.getElementById('new-menu-opcion-plato').value);
    const b = getCartaBebidaDishes().find(x => x.platoId === platoId);
    if(!b){ showToast(t('msg.selectDish')); return; }
    g.opciones.push({id: genId(), recipeId: null, platoId: b.platoId, nombre: b.nombre, suplemento});
  } else {
    const recipeId = parseInt(document.getElementById('new-menu-opcion-recipe').value);
    const r = getRecipe(recipeId);
    if(!r){ showToast(t('msg.selectDish')); return; }
    g.opciones.push({id: genId(), recipeId: r.id, nombre: r.name, suplemento});
  }
  closeModal();
  renderMenuGrupos();
}
async function removeMenuOpcion(grupoId, opcionId){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  g.opciones = g.opciones.filter(o=>o.id!==opcionId);
  renderMenuGrupos();
}

function openMenuOpcionModsModal(grupoId, opcionId){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  if(!g) return;
  const o = g.opciones.find(x=>x.id===opcionId);
  if(!o) return;
  if(!o.modificadores) o.modificadores = [];
  const mods = o.modificadores;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-adjustments"></i> ${t('title.extras')} "${escapeHtml(o.nombre)}"</h3>
      <button class="modal-close" onclick="closeModal();renderMenuGrupos()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('msg.extrasDescDish')}</p>
    <div id="menu-opcion-mods-list">
      ${mods.length ? mods.map(m => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(m.nombre)}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--brand-orange)">${m.precio ? '+'+fmtMoney(m.precio) : t('common.free')}</span>
          <button class="btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcionMod(${grupoId},${opcionId},${m.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:10px">${t('empty.mods')}</div>`}
    </div>
    <div class="field-row" style="margin-top:10px">
      <input type="text" id="new-menu-mod-nombre" placeholder="${t('label.extraName')}" style="flex:1">
      <input type="number" id="new-menu-mod-precio" placeholder="${t('common.price')}" step="0.01" min="0" style="width:90px">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal();renderMenuGrupos()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="addMenuOpcionMod(${grupoId},${opcionId})"><i class="ti ti-plus"></i> ${t('btn.addExtra')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-menu-mod-nombre')?.focus(), 50);
}

function addMenuOpcionMod(grupoId, opcionId){
  const nombre = document.getElementById('new-menu-mod-nombre').value.trim();
  if(!nombre){ showToast(t('msg.extraNameRequired')); return; }
  const precio = parseFloat(document.getElementById('new-menu-mod-precio').value) || 0;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  if(!o.modificadores) o.modificadores = [];
  o.modificadores.push({id: genId(), nombre, precio});
  openMenuOpcionModsModal(grupoId, opcionId);
}

async function removeMenuOpcionMod(grupoId, opcionId, modId){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  o.modificadores = (o.modificadores||[]).filter(m=>m.id!==modId);
  openMenuOpcionModsModal(grupoId, opcionId);
}

