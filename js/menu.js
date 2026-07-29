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

// Resume en texto el horario semanal propio de una carta/menú, agrupando
// los días que comparten la misma franja horaria.
function fmtItemSchedule(item){
  const horario = migrateItemHorario(item);
  const active = horario.map((d,i)=>({i, d})).filter(x=>x.d.activo!==false);
  if(!active.length) return t('empty.noActiveDays');
  const groups = {};
  active.forEach(({i,d})=>{
    const label = (d.desde && d.hasta) ? `${d.desde}-${d.hasta}` : t('label.allDayLong');
    (groups[label] = groups[label] || []).push(i);
  });
  return Object.entries(groups).map(([label, idxs])=>{
    const days = idxs.length===7 ? t('common.allDays') : idxs.map(i=>weekDayShort(i)).join(', ');
    return `${days}: ${label}`;
  }).join(' · ');
}

/* ============================================================
   AFORO POR TURNO — Disponibilidad para reservas
   ============================================================ */
// Devuelve los turnos (franjas horarias) configurados para el día de la semana
// de dateStr, o null si no hay horario configurado (sin restricción de turnos).
function getTurnosForDate(dateStr){
  const horario = (DB.business || {}).horario;
  if(!horario || horario.length !== 7) return null;
  const jsDay = new Date(dateStr + 'T00:00:00').getDay(); // 0=domingo..6=sábado
  const d = migrateHorarioDia(horario[(jsDay + 6) % 7]); // 0=lunes..6=domingo
  if(!d || d.abierto === false) return [];
  const turnos = [];
  if(d.modo === 'seguido'){
    const s = d.seguido;
    if(s && s.ini && s.fin && s.fin > s.ini) turnos.push({abre:s.ini, cierra:s.fin});
  }else{
    (d.turnos||[]).forEach(t => {
      if(t && t.ini && t.fin && t.fin > t.ini) turnos.push({abre:t.ini, cierra:t.fin});
    });
  }
  return turnos;
}

// Índice del turno (0,1,...) al que pertenece una hora dada, o null si no
// hay horario configurado o la hora no encaja en ningún turno.
function getTurnoIndexForTime(dateStr, time){
  const turnos = getTurnosForDate(dateStr);
  if(!turnos || !turnos.length) return null;
  const idx = turnos.findIndex(t => time >= t.abre && time <= t.cierra);
  return idx === -1 ? null : idx;
}

// Suma de personas reservadas (pendientes + confirmadas) para un turno concreto de un día.
function getReservedPeopleForTurno(dateStr, turnoIdx, excludeId){
  return DB.reservations
    .filter(r => r.date === dateStr && r.id !== excludeId && (r.status === 'pendiente' || r.status === 'confirmada'))
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
        <thead><tr><th>${t('common.name')}</th><th>${t('label.schedule')}</th><th>${t('label.sections')}</th><th>${t('label.dishesTh')}</th><th></th></tr></thead>
        <tbody>
          ${cartas.map(c => {
            const nsec = (c.secciones||[]).length;
            const nplat = (c.secciones||[]).reduce((s,sec)=>s+(sec.platos||[]).length,0);
            return `<tr>
              <td><strong>${escapeHtml(tItem(c))}</strong>${(DB.activeCartaIds||[]).includes(c.id)?` <span class="badge badge-green">${t('badge.activeInPos')}</span>`:''}</td>
              <td style="font-size:12px;color:var(--muted)">${fmtItemSchedule(c)}</td>
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
// Renderiza las filas de días/horario compartidas por el editor de cartas y menús.
// Diseño compacto: una fila por día, con hasta 2 franjas horarias apilables.
function renderScheduleRows(prefix, horario){
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,98px));gap:4px">${horario.map((d,i) => {
    const franjas = d.franjas && d.franjas.length ? d.franjas : [{desde:'', hasta:''}];
    return `
    <div style="padding:5px 6px;border:1px solid var(--border);border-radius:6px;${d.activo===false?'opacity:.5':''}">
      <label style="display:flex;align-items:center;gap:4px;font-weight:700;font-size:11px;cursor:pointer;margin-bottom:3px">
        <input type="checkbox" id="${prefix}-hor-${i}-activo" ${d.activo!==false?'checked':''} onchange="toggleScheduleDia('${prefix}',${i})" style="width:12px;height:12px;margin:0">
        ${weekDayShort(i)}
      </label>
      <div id="${prefix}-hor-${i}-rango" style="display:${d.activo!==false?'flex':'none'};flex-direction:column;gap:3px">
        ${franjas.map((f,j) => `
          <div style="display:flex;align-items:center;gap:2px">
            <input type="time" id="${prefix}-hor-${i}-${j}-desde" value="${escapeHtml(f.desde||'')}" style="padding:1px 2px;font-size:10px;width:46px;min-height:22px">
            <span style="color:var(--muted);font-size:9px">-</span>
            <input type="time" id="${prefix}-hor-${i}-${j}-hasta" value="${escapeHtml(f.hasta||'')}" style="padding:1px 2px;font-size:10px;width:46px;min-height:22px">
            ${j>0 ? `<button class="btn btn-sm btn-icon btn-danger" style="padding:1px 3px;min-height:20px;min-width:20px" onclick="removeScheduleFranja('${prefix}',${i},${j})" title="${t('common.remove')}"><i class="ti ti-x" style="font-size:11px"></i></button>` : ''}
          </div>
        `).join('')}
        ${franjas.length < 2 ? `<button class="btn btn-sm" style="padding:1px 5px;font-size:10px;margin-top:1px" onclick="addScheduleFranja('${prefix}',${i})"><i class="ti ti-plus"></i></button>` : ''}
      </div>
    </div>
  `}).join('')}</div><p style="font-size:10px;color:var(--muted);margin-top:3px">${t('common.emptyAllDay')}</p>`;
}
function toggleScheduleDia(prefix, i){
  const on = document.getElementById(`${prefix}-hor-${i}-activo`).checked;
  document.getElementById(`${prefix}-hor-${i}-rango`).style.display = on ? 'flex' : 'none';
}
function addScheduleFranja(prefix, i){
  const horario = readScheduleFromForm(prefix);
  if(horario[i].franjas.length < 2) horario[i].franjas.push({desde:'', hasta:''});
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, horario);
}
function removeScheduleFranja(prefix, i, j){
  const horario = readScheduleFromForm(prefix);
  horario[i].franjas.splice(j, 1);
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, horario);
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
function deleteCarta(id){
  if(!confirm(t('msg.confirmDeleteCarta'))) return;
  DB.cartas = DB.cartas.filter(c=>c.id!==id);
  DB.activeCartaIds = (DB.activeCartaIds||[]).filter(cid=>cid!==id);
  saveDB();
  renderCarta();
  showToast(t('msg.cartaDeleted'));
}
function saveCarta(){
  const nombre = document.getElementById('carta-f-nombre').value.trim();
  if(!nombre){ showToast(t('msg.cartaNameRequired')); return; }
  cartaEdit.nombre = nombre.toUpperCase();
  // Asegura el área: una carta editada en Sala es de bebidas, en Cocina de comida.
  if(!cartaEdit.area) cartaEdit.area = currentArea();
  cartaEdit.horario = readScheduleFromForm('carta');
  delete cartaEdit.turno;
  delete cartaEdit.dias;
  const idx = DB.cartas.findIndex(c=>c.id===cartaEdit.id);
  if(idx>=0) DB.cartas[idx] = cartaEdit;
  else DB.cartas.push(cartaEdit);
  saveDB();
  autoTranslateCarta(cartaEdit).catch(()=>{});
  cartaEdit = null;
  updateAutoActiveCarta(true);
  renderCarta();
  showToast(t('msg.cartaSaved'));
}

function renderCartaEditor(){
  document.getElementById('carta-f-nombre').value = cartaEdit.nombre || '';
  document.getElementById('carta-horario').innerHTML = renderScheduleRows('carta', cartaEdit.horario);
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
        // Al importar desde Escandallo se copia el precio en ese momento; si
        // luego cambia el precio de venta de la receta, esto avisa del
        // desfase en vez de dejarlo desactualizado en silencio.
        const linkedRecipe = p.recipeId ? getRecipe(p.recipeId) : null;
        const priceStale = linkedRecipe && (linkedRecipe.price||0) !== (p.precio||0);
        return `
        <div class="ge-item">
          <div style="display:flex;align-items:center;gap:2px">${reorderButtons(`moveCartaPlato(${sec.id},${pi},-1)`, `moveCartaPlato(${sec.id},${pi},1)`, pi===0, pi===platos.length-1)}</div>
          <span style="flex:1;font-weight:600">${escapeHtml(tItem(p))}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px">${fmtMoney(p.precio)}</span>
          ${priceStale ? `<button class="btn btn-sm" style="color:var(--brand-orange);border-color:var(--brand-orange)" onclick="syncCartaPlatoPrice(${sec.id},${p.id})" title="El escandallo tiene un precio de venta distinto (${fmtMoney(linkedRecipe.price||0)})"><i class="ti ti-refresh-alert"></i> ${t('btn.updatePrice')}</button>` : ''}
          <button class="btn btn-sm" onclick="openPlatoModsModal(${sec.id},${p.id})"><i class="ti ti-adjustments"></i> ${t('title.extras')}${(p.modificadores||[]).length ? ` (${p.modificadores.length})` : ''}</button>
          <button class="btn btn-sm ${p.disponible===false?'btn-danger':''}" onclick="toggleCartaPlato(${sec.id},${p.id})">${p.disponible===false?t('common.unavailable'):t('common.available')}</button>
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
function removeCartaSection(secId){
  if(!confirm(t('msg.confirmDeleteSection'))) return;
  cartaEdit.secciones = cartaEdit.secciones.filter(s=>s.id!==secId);
  renderCartaSecciones();
}
function toggleCartaPlato(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  p.disponible = p.disponible===false ? true : false;
  renderCartaSecciones();
}
function removeCartaPlato(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  sec.platos = sec.platos.filter(p=>p.id!==platoId);
  renderCartaSecciones();
}
// El precio se copia del escandallo solo al importar; si luego cambia el
// precio de venta de la receta, esto lo trae de vuelta a la carta (no se
// hace solo, para no pisar en silencio un precio ajustado a mano en carta).
function syncCartaPlatoPrice(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec && sec.platos.find(x=>x.id===platoId);
  if(!p || !p.recipeId) return;
  const r = getRecipe(p.recipeId);
  if(!r) return;
  p.precio = r.price||0;
  renderCartaSecciones();
  showToast(t('msg.priceUpdated'));
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
    <div class="field">
      <label>${t('common.price')} (€)</label>
      <input type="number" id="new-carta-plato-precio" step="0.01" min="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddCartaPlato(${secId})">${t('common.add')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('new-carta-plato-nombre')?.focus(), 50);
}
function confirmAddCartaPlato(secId){
  const nombre = document.getElementById('new-carta-plato-nombre').value;
  if(!nombre || !nombre.trim()){ showToast(currentArea()==='sala' ? t('msg.needDrinkName') : t('msg.needDishName')); return; }
  const precioStr = document.getElementById('new-carta-plato-precio').value;
  const precio = parseFloat((precioStr||'').replace(',','.'));
  if(isNaN(precio) || precio < 0){ showToast(t('msg.invalidPrice')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  sec.platos.push({id: genId(), recipeId:null, nombre: nombre.trim(), precio, disponible:true, modificadores:[]});
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
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  if(!p.modificadores) p.modificadores = [];
  p.modificadores.push({id: genId(), nombre, precio});
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
function removePlatoMod(secId, platoId, modId){
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
      <button class="btn btn-primary" onclick="confirmImportEsc(${secId==null?'null':secId})">${t('common.import')}</button>
    </div>
  `);
}
function toggleImportEscAll(checked){
  document.querySelectorAll('#import-esc-list input[type=checkbox]:not(:disabled)').forEach(c=>c.checked=checked);
}
function confirmImportEsc(secId){
  const checked = [...document.querySelectorAll('#import-esc-list input[type=checkbox]:checked:not(:disabled)')].map(c=>parseInt(c.value));
  if(!checked.length){ showToast(currentArea()==='sala' ? t('msg.selectAtLeastOneDrink') : t('msg.selectAtLeastOneDish')); return; }
  let sec;
  if(secId != null){
    sec = cartaEdit.secciones.find(s=>s.id===secId);
  }else{
    sec = cartaEdit.secciones.find(s=>s.nombre==='OTROS PLATOS');
    if(!sec){ sec = {id: genId(), nombre:'OTROS PLATOS', platos:[]}; cartaEdit.secciones.push(sec); }
  }
  checked.forEach(rid => {
    const r = getRecipe(rid);
    if(!r) return;
    sec.platos.push({id: genId(), recipeId: r.id, nombre: r.name, precio: r.price||0, disponible:true});
  });
  closeModal();
  renderCartaSecciones();
  showToast(checked.length + ' platos importados');
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
  if(!DB.business || DB.business.cartaAuto === false) return;
  const autoIds = computeAutoActiveMenuIds();
  if(!autoIds.length) return;
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
  if(newBtn) newBtn.textContent = isSala ? t('label.newMaridaje') : t('label.menuName');
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
              <td style="font-size:12px;color:var(--muted)">${fmtItemSchedule(m)}</td>
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
function deleteMenu(id){
  if(!confirm(t('msg.confirmDeleteMenu'))) return;
  DB.menus = DB.menus.filter(m=>m.id!==id);
  DB.activeMenuIds = (DB.activeMenuIds||[]).filter(mid=>mid!==id);
  saveDB();
  renderMenu();
  showToast(t('msg.menuDeleted'));
}
function saveMenu(){
  const nombre = document.getElementById('menu-f-nombre').value.trim();
  if(!nombre){ showToast(t('msg.menuNameRequired')); return; }
  const precioStr = document.getElementById('menu-f-precio').value;
  const precio = parseFloat((precioStr||'').replace(',','.'));
  if(isNaN(precio) || precio < 0){ showToast(t('msg.invalidPrice')); return; }
  if(!menuEdit.grupos.length){ showToast(t('msg.menuNeedsGroup')); return; }
  for(const g of menuEdit.grupos){
    if(!g.opciones.length){ showToast(t('msg.groupNeedsOneOption').replace('${name}', g.nombre)); return; }
  }
  menuEdit.nombre = nombre;
  menuEdit.precio = precio;
  menuEdit.horario = readScheduleFromForm('menu');
  delete menuEdit.turno;
  delete menuEdit.dias;
  menuEdit.desglosarPases = true;
  const idx = DB.menus.findIndex(m=>m.id===menuEdit.id);
  if(idx>=0) DB.menus[idx] = menuEdit;
  else DB.menus.push(menuEdit);
  saveDB();
  autoTranslateMenu(menuEdit).catch(()=>{});
  menuEdit = null;
  updateAutoActiveMenu(true);
  renderMenu();
  showToast(t('msg.menuSaved'));
}

function renderMenuEditor(){
  const isSala = currentArea()==='sala';
  document.getElementById('menu-editor-back-label').textContent = isSala ? t('tab.maridajes') : t('common.menus');
  document.getElementById('menu-f-nombre').value = menuEdit.nombre || '';
  document.getElementById('menu-f-nombre').placeholder = isSala ? t('ph.maridajeName') : t('ph.menuName');
  document.getElementById('menu-f-precio').value = menuEdit.precio || 0;
  document.getElementById('menu-horario').innerHTML = renderScheduleRows('menu', menuEdit.horario);
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
          <h4 style="margin:0">${escapeHtml(g.nombre)}${g.bebida ? ' <span style="font-size:11px;color:var(--muted);font-weight:400"><i class="ti ti-glass-full"></i> Sala</span>' : ''}</h4>
        </div>
        <div class="actions-cell">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:400;cursor:pointer"><input type="checkbox" style="width:auto" ${g.bebida?'checked':''} onchange="toggleGrupoBebida(${g.id},this.checked)"> Bebidas (sala)</label>
          <button class="btn btn-sm" onclick="addMenuOpcion(${g.id})"><i class="ti ti-plus"></i> Opción</button>
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
          <button class="btn btn-sm" onclick="openMenuOpcionModsModal(${g.id},${o.id})"><i class="ti ti-adjustments"></i> Extras${(o.modificadores||[]).length ? ` (${o.modificadores.length})` : ''}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcion(${g.id},${o.id})"><i class="ti ti-x"></i></button>
        </div>
      `;}).join('') : `<div class="empty" style="padding:14px">${q ? t('empty.noSearchResults') : 'Sin opciones en este grupo.'}</div>`}
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
  menuEdit.grupos.push({id: genId(), nombre: nombre.trim(), opciones:[], bebida: false});
  closeModal();
  renderMenuGrupos();
}
function removeMenuGrupo(grupoId){
  if(!confirm(t('msg.confirmDeleteGroup'))) return;
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
function removeMenuOpcion(grupoId, opcionId){
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
          <span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--brand-orange)">+${fmtMoney(m.precio||0)}</span>
          <button class="btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcionMod(${grupoId},${opcionId},${m.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:10px">${t('empty.mods')}</div>`}
    </div>
    <div class="field-row" style="margin-top:10px">
      <input type="text" id="new-menu-mod-nombre" placeholder="${t('label.extraName')}" style="flex:1">
      <input type="number" id="new-menu-mod-precio" placeholder="${t('common.price')}" step="0.01" min="0" style="width:90px">
      <button class="btn btn-sm" onclick="addMenuOpcionMod(${grupoId},${opcionId})"><i class="ti ti-plus"></i></button>
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

function removeMenuOpcionMod(grupoId, opcionId, modId){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  o.modificadores = (o.modificadores||[]).filter(m=>m.id!==modId);
  openMenuOpcionModsModal(grupoId, opcionId);
}

