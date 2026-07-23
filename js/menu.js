/* ============================================================
   CARTA — Sistema multi-carta con secciones y horarios
   ============================================================ */
const CARTA_TIPOS = ['MEDIODÍA','NOCHE','FIN DE SEMANA','DEGUSTACIÓN','TEMPORADA','GENERAL'];
let cartaEdit = null; // {id, nombre, horario:[7x{activo,desde,hasta}], secciones:[]}

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
  if(!active.length) return 'Sin días activos';
  const groups = {};
  active.forEach(({i,d})=>{
    const label = (d.desde && d.hasta) ? `${d.desde}-${d.hasta}` : 'Todo el día';
    (groups[label] = groups[label] || []).push(i);
  });
  return Object.entries(groups).map(([label, idxs])=>{
    const days = idxs.length===7 ? 'Todos los días' : idxs.map(i=>WEEK_DAYS[i].slice(0,3)).join(', ');
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

function renderOferta(){
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
        <thead><tr><th>Nombre</th><th>Horario</th><th>Secciones</th><th>Platos</th><th></th></tr></thead>
        <tbody>
          ${cartas.map(c => {
            const nsec = (c.secciones||[]).length;
            const nplat = (c.secciones||[]).reduce((s,sec)=>s+(sec.platos||[]).length,0);
            return `<tr>
              <td><strong>${escapeHtml(tItem(c))}</strong>${(DB.activeCartaIds||[]).includes(c.id)?' <span class="badge badge-green">Activa en TPV</span>':''}</td>
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
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">${horario.map((d,i) => {
    const franjas = d.franjas && d.franjas.length ? d.franjas : [{desde:'', hasta:''}];
    return `
    <div style="padding:8px;border:1px solid var(--border);border-radius:8px;${d.activo===false?'opacity:.5':''}">
      <label style="display:flex;align-items:center;gap:5px;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:4px">
        <input type="checkbox" id="${prefix}-hor-${i}-activo" ${d.activo!==false?'checked':''} onchange="toggleScheduleDia('${prefix}',${i})">
        ${WEEK_DAYS[i].slice(0,3)}
      </label>
      <div id="${prefix}-hor-${i}-rango" style="display:${d.activo!==false?'flex':'none'};flex-direction:column;gap:4px">
        ${franjas.map((f,j) => `
          <div style="display:flex;align-items:center;gap:3px">
            <input type="time" id="${prefix}-hor-${i}-${j}-desde" value="${escapeHtml(f.desde||'')}" style="padding:2px 4px;font-size:12px;width:58px;min-height:28px">
            <span style="color:var(--muted);font-size:11px">-</span>
            <input type="time" id="${prefix}-hor-${i}-${j}-hasta" value="${escapeHtml(f.hasta||'')}" style="padding:2px 4px;font-size:12px;width:58px;min-height:28px">
            ${j>0 ? `<button class="btn btn-sm btn-icon btn-danger" style="padding:2px 4px;min-height:24px;min-width:24px" onclick="removeScheduleFranja('${prefix}',${i},${j})" title="Quitar"><i class="ti ti-x" style="font-size:13px"></i></button>` : ''}
          </div>
        `).join('')}
        ${franjas.length < 2 ? `<button class="btn btn-sm" style="padding:2px 6px;font-size:11px;margin-top:2px" onclick="addScheduleFranja('${prefix}',${i})"><i class="ti ti-plus"></i></button>` : ''}
      </div>
    </div>
  `}).join('')}</div><p style="font-size:11px;color:var(--muted);margin-top:4px">Vacío = todo el día</p>`;
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

function renderCartaSecciones(){
  const box = document.getElementById('carta-secciones');
  if(!cartaEdit.secciones.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-list"></i>${t('empty.sections')}</div>`;
    return;
  }
  box.innerHTML = cartaEdit.secciones.map(sec => `
    <div class="ge-section">
      <div class="ge-sec-head">
        <h4>${escapeHtml(tItem(sec))}</h4>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="addCartaPlato(${sec.id})"><i class="ti ti-plus"></i> ${currentArea()==='sala' ? t('btn.newDrinkManual') : t('btn.newDishManual')}</button>
          <button class="btn btn-sm" onclick="importFromEscandallo(${sec.id})"><i class="ti ti-download"></i> ${t('btn.escandalloShort')}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeCartaSection(${sec.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      ${(sec.platos||[]).length ? sec.platos.map(p => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(tItem(p))}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px">${fmtMoney(p.precio)}</span>
          <button class="btn btn-sm" onclick="openPlatoModsModal(${sec.id},${p.id})"><i class="ti ti-adjustments"></i> ${t('title.extras')}${(p.modificadores||[]).length ? ` (${p.modificadores.length})` : ''}</button>
          <button class="btn btn-sm ${p.disponible===false?'btn-danger':''}" onclick="toggleCartaPlato(${sec.id},${p.id})">${p.disponible===false?t('common.unavailable'):t('common.available')}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeCartaPlato(${sec.id},${p.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:14px">${currentArea()==='sala' ? t('empty.sectionDrinks') : t('empty.sectionDishes')}</div>`}
    </div>
  `).join('');
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
      <button class="btn btn-primary" onclick="confirmNewCartaSection()">Añadir</button>
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
  const menus = areaMenus();
  const totalGrupos = menus.reduce((s,m)=>s+(m.grupos||[]).length,0);
  document.getElementById('menu-stats').innerHTML = `
    <div class="kpi"><div class="label">${t('common.menus')}</div><div class="value">${menus.length}</div></div>
    <div class="kpi"><div class="label">${t('label.totalGroups')}</div><div class="value">${totalGrupos}</div></div>
  `;
  const box = document.getElementById('menu-list');
  if(!menus.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-list-details"></i>${t('empty.menus')}</div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Precio</th><th>Horario</th><th>Grupos</th><th></th></tr></thead>
        <tbody>
          ${menus.map(m => {
            const ngrupos = (m.grupos||[]).length;
            return `<tr>
              <td><strong>${escapeHtml(tItem(m))}</strong>${(DB.activeMenuIds||[]).includes(m.id)?' <span class="badge badge-green">Activo en TPV</span>':''}</td>
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
    if(!g.opciones.length){ showToast(`El grupo "${g.nombre}" necesita al menos una opción`); return; }
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
  document.getElementById('menu-f-nombre').value = menuEdit.nombre || '';
  document.getElementById('menu-f-precio').value = menuEdit.precio || 0;
  document.getElementById('menu-horario').innerHTML = renderScheduleRows('menu', menuEdit.horario);
  renderMenuGrupos();
}

function renderMenuGrupos(){
  const box = document.getElementById('menu-grupos');
  if(!menuEdit.grupos.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-list"></i>${t('empty.groups')}</div>`;
    return;
  }
  box.innerHTML = menuEdit.grupos.map(g => `
    <div class="ge-section">
      <div class="ge-sec-head">
        <h4>${escapeHtml(g.nombre)}${g.bebida ? ' <span style="font-size:11px;color:var(--muted);font-weight:400"><i class="ti ti-glass-full"></i> Sala</span>' : ''}</h4>
        <div class="actions-cell">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:400;cursor:pointer"><input type="checkbox" style="width:auto" ${g.bebida?'checked':''} onchange="toggleGrupoBebida(${g.id},this.checked)"> Bebidas (sala)</label>
          <button class="btn btn-sm" onclick="addMenuOpcion(${g.id})"><i class="ti ti-plus"></i> Opción</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeMenuGrupo(${g.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      ${(g.opciones||[]).length ? g.opciones.map(o => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(o.nombre)}</span>
          ${o.suplemento ? `<span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--brand-orange)">+${fmtMoney(o.suplemento)}</span>` : ''}
          <button class="btn btn-sm" onclick="openMenuOpcionModsModal(${g.id},${o.id})"><i class="ti ti-adjustments"></i> Extras${(o.modificadores||[]).length ? ` (${o.modificadores.length})` : ''}</button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcion(${g.id},${o.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:14px">Sin opciones en este grupo.</div>`}
    </div>
  `).join('');
}

function newMenuGrupo(){
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newGroup')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('ph.sectionName')}</label>
      <input type="text" id="new-menu-grupo-name" placeholder="Ej. Primero, Segundo, Postre, Bebida...">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmNewMenuGrupo()">Añadir</button>
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

function addMenuOpcion(grupoId){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const opcionArea = (g && g.bebida) ? 'sala' : currentArea();
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === opcionArea);
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newOption')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Origen del plato</label>
      <select id="new-menu-opcion-tipo" onchange="toggleMenuOpcionTipo()">
        <option value="escandallo">Plato del Escandallo</option>
        <option value="manual">Escribir nombre manualmente</option>
      </select>
    </div>
    <div class="field" id="new-menu-opcion-recipe-field" style="display:${areaRecipes.length?'':'none'}">
      <label>Plato (Escandallo)</label>
      <select id="new-menu-opcion-recipe">
        ${areaRecipes.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}
      </select>
    </div>
    <div class="field" id="new-menu-opcion-manual-field" style="display:${areaRecipes.length?'none':''}">
      <label>Nombre del plato</label>
      <input type="text" id="new-menu-opcion-nombre" placeholder="Ej. Ensalada de la casa">
    </div>
    <div class="field">
      <label>Suplemento (€) <span style="color:var(--muted);font-weight:400">opcional, extra sobre el precio del menú</span></label>
      <input type="number" id="new-menu-opcion-suplemento" step="0.01" min="0" value="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddMenuOpcion(${grupoId})">Añadir</button>
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
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Configura extras opcionales (ej. "Extra queso" +1€). Se podrán añadir al tomar la comanda.</p>
    <div id="menu-opcion-mods-list">
      ${mods.length ? mods.map(m => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(m.nombre)}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--brand-orange)">+${fmtMoney(m.precio||0)}</span>
          <button class="btn btn-sm btn-icon btn-danger" onclick="removeMenuOpcionMod(${grupoId},${opcionId},${m.id})"><i class="ti ti-x"></i></button>
        </div>
      `).join('') : `<div class="empty" style="padding:10px">Sin extras configurados.</div>`}
    </div>
    <div class="field-row" style="margin-top:10px">
      <input type="text" id="new-menu-mod-nombre" placeholder="Nombre del extra" style="flex:1">
      <input type="number" id="new-menu-mod-precio" placeholder="Precio" step="0.01" min="0" style="width:90px">
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

