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

/* ═══ OFERTA GASTRONÓMICA: piezas compartidas (29/10) ═══ */
function ocRacionesTexto(stock){
  if(stock == null) return gl({es:'Sin límite', ca:'Sense límit', en:'No limit'});
  if(stock <= 0) return gl({es:'Agotado', ca:'Esgotat', en:'Sold out'});
  return `${stock} ${gl({es:stock === 1 ? 'ración' : 'raciones', ca:stock === 1 ? 'ració' : 'racions', en:stock === 1 ? 'portion' : 'portions'})}`;
}
// «Disponible / No disponible» y «Raciones», los dos mismos botones para platos, opciones de menú y menús.
function ocBtnDisponible(agotado, onclick){
  return `<button type="button" class="btn btn-sm btn-fino${agotado ? ' is-off' : ''}" onclick="${onclick}" title="${escapeHtml(t('label.markDishOutHelp'))}"><i class="ti ${agotado ? 'ti-flame-off' : 'ti-check'}"></i> ${agotado ? t('common.unavailable') : t('common.available')}</button>`;
}
function ocBtnRaciones(stock, onclick){
  const cls = stock != null && stock <= 0 ? ' is-off' : (stock != null ? ' is-lim' : '');
  return `<button type="button" class="btn btn-sm btn-fino${cls}" onclick="${onclick}" title="${escapeHtml(t('title.limitPortions'))}"><i class="ti ${stock == null ? 'ti-infinity' : 'ti-stack-2'}"></i> ${escapeHtml(ocRacionesTexto(stock))}</button>`;
}
// Lo único del estado que se ve con la fila plegada (móvil): agotado o con límite de raciones.
function ocEstadoPlegado(agotado, stock){
  if(agotado || (stock != null && stock <= 0)) return `<span class="oc-estado is-off">${gl({es:'Agotado', ca:'Esgotat', en:'Sold out'})}</span>`;
  if(stock != null) return `<span class="oc-estado is-lim">${escapeHtml(ocRacionesTexto(stock))}</span>`;
  return '';
}
function ocChevHtml(){
  return `<button type="button" class="pl-chev" aria-expanded="false" aria-label="${escapeHtml(gl({es:'Ver el resto', ca:'Veure la resta', en:'Show more'}))}" onclick="event.stopPropagation();ggTogglePlegable(event, this.closest('.plegable'))"><i class="ti ti-chevron-down"></i></button>`;
}
function ocBtnExtras(n, onclick){
  return `<button type="button" class="btn btn-sm btn-fino" onclick="${onclick}"><i class="ti ti-adjustments"></i> ${t('title.extras')}${n ? ` (${n})` : ''}</button>`;
}
// Quita lo que cambia SOLO con el servicio (platos agotados, raciones que quedan) para comparar un borrador con
// su original: marcar un plato como agotado no es «un cambio sin guardar», ya queda guardado al momento.
function ocSinVivos(secs, hijos){
  return (secs||[]).map(x => Object.assign({}, x, {[hijos]: (x[hijos]||[]).map(p => { const c = Object.assign({}, p); delete c.disponible; delete c.stock; return c; })}));
}
/* Las raciones y el «agotado» son estado del SERVICIO: el TPV los cambia solo a cada venta. Por eso se aplican AL
   MOMENTO sobre lo guardado (no esperan al botón Guardar) y, al guardar un borrador, siempre manda lo vivo: antes
   un borrador abierto antes del servicio machacaba al guardar las raciones que las ventas habían ido restando. */
function cartaVivoPlato(platoId){
  for(const c of (DB.cartas||[])) for(const sec of (c.secciones||[])) for(const p of (sec.platos||[])) if(p.id === platoId) return p;
  return null;
}
function menuVivoOpcion(menuId, grupoId, opcionId){
  const m = (DB.menus||[]).find(x => x.id === menuId);
  const g = m && (m.grupos||[]).find(x => x.id === grupoId);
  return (g && (g.opciones||[]).find(x => x.id === opcionId)) || null;
}
function ocCopiarVivo(draft, vivo){
  if(!vivo) return;
  if(vivo.stock == null) delete draft.stock; else draft.stock = vivo.stock;
  if(vivo.disponible === undefined) delete draft.disponible; else draft.disponible = vivo.disponible;
}
// Raciones: un número (o «sin límite») en una ventana propia, con atajos, en vez de una caja de texto suelta.
let racionesCtx = null;
function openRacionesModal(ctx, actual, nombre){
  racionesCtx = ctx;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-stack-2"></i> ${t('title.limitPortions')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="inc-ayuda"><strong>${escapeHtml(nombre||'')}</strong><br>${gl({es:'Cuántas raciones quedan hoy. El TPV las va restando y, al llegar a 0, lo marca como agotado solo. No se reinician solas: mañana hay que volver a ponerlas.', ca:'Quantes racions queden avui. El TPV les va restant i, en arribar a 0, ho marca com a esgotat tot sol. No es reinicien soles: demà cal tornar-les a posar.', en:'How many portions are left today. The POS subtracts them and marks it sold out at 0. They do not reset by themselves: set them again tomorrow.'})}</p>
    <div class="field"><input type="number" id="raciones-n" min="0" step="1" inputmode="numeric" value="${actual != null ? actual : ''}" placeholder="${escapeHtml(gl({es:'Sin límite', ca:'Sense límit', en:'No limit'}))}"></div>
    <div class="inc-tipos">${[5,10,15,20,30,50].map(n => `<button type="button" class="btn btn-sm btn-fino" onclick="document.getElementById('raciones-n').value=${n}">${n}</button>`).join('')}<button type="button" class="btn btn-sm btn-fino" onclick="document.getElementById('raciones-n').value=''"><i class="ti ti-infinity"></i> ${gl({es:'Sin límite', ca:'Sense límit', en:'No limit'})}</button></div>
    <div class="modal-footer">
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmarRaciones()"><i class="ti ti-check"></i> ${t('common.save')}</button>
    </div>`);
  setTimeout(() => document.getElementById('raciones-n')?.focus(), 50);
}
function confirmarRaciones(){
  const txt = (document.getElementById('raciones-n').value || '').trim();
  let n = null;
  if(txt !== ''){
    n = parseInt(txt, 10);
    if(isNaN(n) || n < 0){ showToast(t('msg.invalidStockNumber')); return; }
  }
  const c = racionesCtx; racionesCtx = null;
  closeModal();
  if(!c) return;
  if(c.tipo === 'plato') aplicarRacionesPlato(c.secId, c.platoId, n);
  else if(c.tipo === 'opcion') aplicarRacionesOpcion(c.grupoId, c.opcionId, n);
  else if(c.tipo === 'menu') aplicarRacionesMenu(c.id, n);
}
function ocPonerRaciones(obj, n){
  if(n == null) delete obj.stock;
  else { obj.stock = n; obj.disponible = n > 0; }
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
// Las horas de un día en corto: «12–16» si son en punto, «12:30–16» si no.
function horaCorta(h){
  if(!h) return '';
  const [hh, mm] = h.split(':');
  return String(parseInt(hh, 10)) + (mm && mm !== '00' ? ':' + mm : '');
}
// El horario de una carta o menú como UNA tira de siete casillas (Lun … Dom), cada una con sus horas. Antes
// eran tantas líneas como horarios distintos hubiera, y una carta con horario diferente cada día ocupaba siete
// renglones y ensanchaba la fila de la lista. Un día sin horas concretas pone «Todo el día»; uno apagado, «—».
function renderItemScheduleHtml(item){
  const horario = migrateItemHorario(item);
  if(horarioNuncaActivo(horario)) return `<span class="horsem-vacio"><i class="ti ti-calendar-off"></i> ${t('empty.noActiveDays')}</span>`;
  return `<div class="horsem" role="list">${horario.map((d, i) => {
    const on = d.activo !== false;
    const fr = on ? (d.franjas||[]).filter(f => f.desde && f.hasta) : [];
    const horas = !on ? '<span>—</span>'
      : (fr.length ? fr.map(f => `<span>${escapeHtml(horaCorta(f.desde))}–${escapeHtml(horaCorta(f.hasta))}</span>`).join('')
        : `<span class="todo">${gl({es:'Todo', ca:'Tot', en:'All'})}</span>`);
    return `<div class="horsem-d${on ? '' : ' off'}" role="listitem" title="${escapeHtml(weekDayFull(i))}"><b>${escapeHtml(weekDayShort(i))}</b>${horas}</div>`;
  }).join('')}</div>`;
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
  document.getElementById('oferta-tab-carta').classList.toggle('is-on', ofertaTab==='carta');
  document.getElementById('oferta-tab-menus').classList.toggle('is-on', ofertaTab==='menus');
  if(ofertaTab==='carta') renderCarta();
  else renderMenu();
}
function setOfertaTab(tab){
  if(tab === ofertaTab) return;
  // Cambiar de pestaña con un borrador a medias también es «salir»: se pregunta.
  ggGuardarSiHaceFalta(() => { ofertaTab = tab; renderOferta(); scrollContentToTop(); });
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
  const bebidas = currentArea()==='sala';
  box.innerHTML = `<div class="oc-lista">${cartas.map(c => {
    const nsec = (c.secciones||[]).length;
    const nplat = (c.secciones||[]).reduce((s,sec)=>s+(sec.platos||[]).length,0);
    return `
    <article class="oc-item">
      <div class="oc-quien">
        <div class="oc-nombre">${escapeHtml(tItem(c))}${(DB.activeCartaIds||[]).includes(c.id) ? ` <span class="badge badge-green">${t('badge.activeInPos')}</span>` : ''}</div>
        <div class="oc-meta">${nsec} ${t('label.sections').toLowerCase()} · ${nplat} ${(bebidas ? t('label.drinksTh') : t('label.dishesTh')).toLowerCase()}</div>
      </div>
      ${renderItemScheduleHtml(c)}
      <div class="oc-acc">
        ${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`openCarta(${c.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteCarta(${c.id})`, peligro:true, owner:true}
        ])}
      </div>
    </article>`;
  }).join('')}</div>`;
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
// El editor del horario: los siete días EN UNA FILA (Lun … Dom), cada día con su casilla y, debajo, la hora de
// apertura y la de cierre apiladas (y una segunda franja si hace falta). En pantallas estrechas las casillas
// pasan a la línea de abajo en vez de desbordar. Los ids (`prefix-hor-i-activo`, `…-j-desde/hasta`) NO cambian:
// readScheduleFromForm() lee de ahí.
function renderScheduleRows(prefix, horario){
  const dias = horario.map((d, i) => {
    const franjas = d.franjas && d.franjas.length ? d.franjas : [{desde:'', hasta:''}];
    const on = d.activo !== false;
    return `
    <div class="hor-d${on ? '' : ' off'}" id="${prefix}-hor-${i}-card">
      <label class="hor-tit">
        <input type="checkbox" id="${prefix}-hor-${i}-activo" ${on ? 'checked' : ''} onchange="toggleScheduleDia('${prefix}',${i});updateScheduleSummary('${prefix}')">
        <span>${escapeHtml(weekDayShort(i))}</span>
      </label>
      <div id="${prefix}-hor-${i}-rango" class="hor-rango" style="display:${on ? 'flex' : 'none'}">
        ${franjas.map((f, j) => `
          <div class="hor-fr">
            <input type="time" id="${prefix}-hor-${i}-${j}-desde" class="carta-schedule-time" aria-label="${escapeHtml(weekDayFull(i))}: ${gl({es:'abre', ca:'obre', en:'opens'})}" value="${escapeHtml(f.desde||'')}" onchange="updateScheduleSummary('${prefix}')">
            <input type="time" id="${prefix}-hor-${i}-${j}-hasta" class="carta-schedule-time" aria-label="${escapeHtml(weekDayFull(i))}: ${gl({es:'cierra', ca:'tanca', en:'closes'})}" value="${escapeHtml(f.hasta||'')}" onchange="updateScheduleSummary('${prefix}')">
            ${j > 0 ? `<button type="button" class="hor-quitar" onclick="removeScheduleFranja('${prefix}',${i},${j})" title="${t('common.remove')}" aria-label="${t('common.remove')}"><i class="ti ti-x"></i></button>` : ''}
          </div>`).join('')}
        ${franjas.length < 2 ? `<button type="button" class="hor-mas" onclick="addScheduleFranja('${prefix}',${i})"><i class="ti ti-plus"></i> ${gl({es:'Otra franja', ca:'Una altra franja', en:'Add slot'})}</button>` : ''}
      </div>
    </div>`;
  }).join('');
  return `
    <div class="hor-acc">
      <button type="button" class="btn btn-sm btn-fino" onclick="copiarHorarioDelLunes('${prefix}')"><i class="ti ti-copy"></i> ${gl({es:'Mismo horario que el lunes', ca:'Mateix horari que el dilluns', en:'Same hours as Monday'})}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="horarioTodoElDia('${prefix}')"><i class="ti ti-clock-off"></i> ${gl({es:'Sin horas: todo el día', ca:'Sense hores: tot el dia', en:'No hours: all day'})}</button>
    </div>
    <div class="hor-sem">${dias}</div>
    <p class="hor-pie">${t('common.emptyAllDay')}</p>`;
}
// Copia el lunes (activo + franjas) a los seis días de después.
function copiarHorarioDelLunes(prefix){
  const h = readScheduleFromForm(prefix);
  const lunes = JSON.parse(JSON.stringify(h[0]));
  const nuevo = h.map((d, i) => i === 0 ? d : JSON.parse(JSON.stringify(lunes)));
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, nuevo);
  updateScheduleSummary(prefix);
  ofertaMarcarCambio(prefix);
}
function horarioTodoElDia(prefix){
  const h = readScheduleFromForm(prefix).map(d => ({activo: d.activo, franjas: [{desde:'', hasta:''}]}));
  document.getElementById(`${prefix}-horario`).innerHTML = renderScheduleRows(prefix, h);
  updateScheduleSummary(prefix);
  ofertaMarcarCambio(prefix);
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
    <div class="oc-hor">
      <button type="button" class="oc-hor-cab" onclick="toggleScheduleSection('${prefix}')" aria-expanded="${open}">
        <div style="min-width:0">
          <div class="oc-hor-tit"><i class="ti ti-calendar-clock"></i> ${t(titleKey)}</div>
          <div id="${prefix}-schedule-summary" class="oc-hor-res">${escapeHtml(scheduleSummaryText(horario))}</div>
        </div>
        <i class="ti ${open?'ti-chevron-up':'ti-chevron-down'}"></i>
      </button>
      <div id="${prefix}-schedule-body" style="display:${open?'':'none'};padding:4px 16px 16px">
        <p class="hor-ayuda">${t(hintKey)}</p>
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
  const card = document.getElementById(`${prefix}-hor-${i}-card`);
  if(card) card.classList.toggle('off', !on);
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
// Una franja a medias (solo la apertura, o solo el cierre) no se puede guardar: se leería como «todo el día» y
// el dueño creería que la carta cierra a una hora que en realidad no hay. Devuelve el texto del problema o ''.
function horarioIncompleto(horario){
  for(let i = 0; i < horario.length; i++){
    const d = horario[i];
    if(!d || d.activo === false) continue;
    for(const f of (d.franjas||[])){
      if(!!f.desde !== !!f.hasta){
        return gl({es:`El ${weekDayFull(i).toLowerCase()} tiene una franja a medias: pon la hora de apertura Y la de cierre, o déjala vacía.`,
                   ca:`El ${weekDayFull(i).toLowerCase()} té una franja a mitges: posa l'hora d'obertura I la de tancament, o deixa-la buida.`,
                   en:`${weekDayFull(i)} has a half-filled slot: set both opening and closing time, or leave it empty.`});
      }
    }
  }
  return '';
}

function newCarta(){
  // El área en que se crea la carta determina su tipo: en Sala es carta de
  // bebidas (no aparece en cocina); en Cocina es carta de comida.
  cartaEdit = {id: genId(), nombre:'', area: currentArea(), horario: defaultItemHorario(), secciones:[]};
  renderCarta();
  cartaBase = cartaSnapshot(); ofertaMarcarCambio('carta');
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
  // La «foto» de partida se toma DESPUÉS de pintar: al pintar, los platos enlazados a una receta se ponen al día
  // con su precio, y eso no es un cambio del dueño.
  cartaBase = cartaSnapshot(); ofertaMarcarCambio('carta');
}
function backToCartaList(){
  ggGuardarSiHaceFalta(() => { cartaEdit = null; cartaBase = ''; renderCarta(); });
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
  if(!isOwnerSession() && !editUnlocked) return false;
  const nombre = document.getElementById('carta-f-nombre').value.trim();
  if(!nombre){ showToast(t('msg.cartaNameRequired')); return false; }
  const horario = readScheduleFromForm('carta');
  const malHorario = horarioIncompleto(horario);
  if(malHorario){ showToast(malHorario); return false; }
  cartaEdit.nombre = nombre.toUpperCase();
  // Asegura el área: una carta editada en Sala es de bebidas, en Cocina de comida.
  if(!cartaEdit.area) cartaEdit.area = currentArea();
  cartaEdit.horario = horario;
  delete cartaEdit.turno;
  delete cartaEdit.dias;
  // Raciones y «agotado» mandan siempre desde lo guardado (ver ocCopiarVivo).
  (cartaEdit.secciones||[]).forEach(sec => (sec.platos||[]).forEach(p => ocCopiarVivo(p, cartaVivoPlato(p.id))));
  const nuncaActiva = horarioNuncaActivo(cartaEdit.horario);
  const idx = DB.cartas.findIndex(c=>c.id===cartaEdit.id);
  if(idx>=0) DB.cartas[idx] = cartaEdit;
  else DB.cartas.push(cartaEdit);
  saveDB();
  autoTranslateCarta(cartaEdit).catch(()=>{});
  cartaEdit = null; cartaBase = '';
  updateAutoActiveCarta(true);
  renderCarta();
  showToast(nuncaActiva ? t('msg.horarioNuncaActivo') : t('msg.cartaSaved'));
  return true;
}

/* Cambios sin guardar de la carta y del menú: la «foto» del borrador al abrirlo (cartaBase/menuBase) frente a
   cómo está ahora, leyendo también lo que hay escrito en el formulario (nombre, horario). */
let cartaBase = '';
let menuBase = '';
function cartaSnapshot(){
  if(!cartaEdit) return '';
  const n = document.getElementById('carta-f-nombre');
  let horario = cartaEdit.horario;
  if(document.getElementById('carta-hor-0-activo')){ try{ horario = readScheduleFromForm('carta'); }catch(e){} }
  return JSON.stringify({n: n ? n.value.trim() : cartaEdit.nombre, h: horario, s: ocSinVivos(cartaEdit.secciones, 'platos')});
}
function menuSnapshot(){
  if(!menuEdit) return '';
  const v = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  let horario = menuEdit.horario;
  if(document.getElementById('menu-hor-0-activo')){ try{ horario = readScheduleFromForm('menu'); }catch(e){} }
  return JSON.stringify({n: v('menu-f-nombre').trim(), pb: v('menu-f-precio-base'), iva: v('menu-f-iva'), h: horario, g: ocSinVivos(menuEdit.grupos, 'opciones'), b: menuEdit.grupos.map(g => !!g.bebida)});
}
function ofertaMarcarCambio(prefix){
  const el = document.getElementById(prefix + '-sucio');
  if(!el) return;
  const sucio = prefix === 'carta' ? (cartaEdit && cartaSnapshot() !== cartaBase) : (menuEdit && menuSnapshot() !== menuBase);
  el.hidden = !sucio;
}
if(typeof document !== 'undefined' && document.addEventListener){
  ['input','change'].forEach(ev => document.addEventListener(ev, e => {
    const t0 = e.target && e.target.closest ? e.target : null;
    if(!t0) return;
    if(t0.closest('#carta-editor-view')) ofertaMarcarCambio('carta');
    else if(t0.closest('#menu-editor-view')) ofertaMarcarCambio('menu');
  }));
}
ggRegistrarEditor('carta', {
  sucio: () => !!cartaEdit && cartaSnapshot() !== cartaBase,
  nombre: () => gl({es:'Carta: ', ca:'Carta: ', en:'Menu: '}) + ((cartaEdit && (document.getElementById('carta-f-nombre')?.value || cartaEdit.nombre)) || gl({es:'sin nombre', ca:'sense nom', en:'unnamed'})),
  guardar: () => saveCarta(),
  descartar: () => { cartaEdit = null; cartaBase = ''; renderCarta(); }
});
ggRegistrarEditor('menu', {
  sucio: () => !!menuEdit && menuSnapshot() !== menuBase,
  nombre: () => gl({es:'Menú: ', ca:'Menú: ', en:'Set menu: '}) + ((menuEdit && (document.getElementById('menu-f-nombre')?.value || menuEdit.nombre)) || gl({es:'sin nombre', ca:'sense nom', en:'unnamed'})),
  guardar: () => saveMenu(),
  descartar: () => { menuEdit = null; menuBase = ''; renderMenu(); }
});

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
  const bebidas = currentArea()==='sala';
  const searchBox = `
    <div class="oc-buscar"><i class="ti ti-search"></i><input type="text" id="carta-search-input" placeholder="${bebidas ? t('ph.searchDrink') : t('ph.searchDish')}" value="${escapeHtml(cartaSearchQuery)}" oninput="setCartaSearchQuery(this.value)"></div>`;
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
    const fuera = platos.filter(p => p.disponible === false).length;
    return `
    <section class="oc-sec">
      <div class="oc-sec-cab">
        <div class="oc-sec-tit">
          ${reorderButtons(`moveCartaSection(${si},-1)`, `moveCartaSection(${si},1)`, si===0, si===secciones.length-1)}
          <!-- El icono de la sección es el que ve el cliente en la web de reservas y pedidos: allí cada sección
               es una carpeta, y este es su dibujo. Se elige a mano porque adivinarlo por el nombre nunca acierta
               del todo ("Cosas del chef", "La pizarra"). -->
          <button type="button" class="oc-icono" title="${t('title.chooseFolderIcon')}" aria-label="${t('title.chooseFolderIcon')}" onclick="openCartaSectionIconModal(${sec.id})">${iconoSeccionHtml(sec.icono, tItem(sec), 24) || '<i class="ti ti-ban" style="opacity:.35"></i>'}</button>
          <div style="min-width:0"><h4>${escapeHtml(tItem(sec))}</h4><span class="oc-sec-n">${platos.length} ${(bebidas ? t('label.drinksTh') : t('label.dishesTh')).toLowerCase()}${fuera ? ` · <b class="dishout-fuera">${fuera} ${gl({es:fuera===1?'agotado':'agotados', ca:fuera===1?'esgotat':'esgotats', en:'out'})}</b>` : ''}</span></div>
        </div>
        <div class="oc-sec-acc">
          <button type="button" class="btn btn-sm btn-fino is-on" onclick="addCartaPlato(${sec.id})"><i class="ti ti-plus"></i> ${bebidas ? t('btn.newDrinkManual') : t('btn.newDishManual')}</button>
          <button type="button" class="btn btn-sm btn-fino" onclick="importFromEscandallo(${sec.id})"><i class="ti ti-download"></i> ${t('btn.escandalloShort')}</button>
          ${ggMenuAcciones([
            {icono:'ti-pencil', texto:t('title.renameSection'), fn:`renameCartaSeccion(${sec.id})`, owner:true},
            {icono:'ti-trash', texto:t('common.delete'), fn:`removeCartaSection(${sec.id})`, peligro:true, owner:true}
          ])}
        </div>
      </div>
      ${visiblePlatos.length ? visiblePlatos.map(p => {
        const pi = platos.indexOf(p);
        // El precio de venta se gestiona siempre desde el Escandallo — la Carta solo guarda una copia para no
        // tener que recalcularla en cada render. Si el Escandallo cambió el precio desde que se importó, se
        // sincroniza aquí solo (antes hacía falta pulsar "Actualizar precio" a mano cada vez).
        const linkedRecipe = p.recipeId ? getRecipe(p.recipeId) : null;
        if(linkedRecipe && (linkedRecipe.price||0) !== (p.precio||0)){
          p.precio = linkedRecipe.price||0;
          p.precioBase = linkedRecipe.priceBase;
          p.ivaPct = linkedRecipe.ivaPct;
        }
        // Mismo mecanismo que el precio de sala, para el suplemento delivery.
        if(linkedRecipe && (linkedRecipe.deliverySupplement||null) !== (p.deliverySupplement||null)){
          p.deliverySupplement = linkedRecipe.deliverySupplement||null;
        }
        // Semáforo de rentabilidad: mismos umbrales que en Escandallo (food cost sobre el precio de venta).
        const fcPct = linkedRecipe ? recipeFoodCostPct(linkedRecipe) : null;
        const marginDot = fcPct==null || !isFinite(fcPct) ? ''
          : `<span class="badge ${fcPct>35?'badge-red':fcPct>28?'badge-amber':'badge-green'}" style="flex:none" title="${t('carta.foodCostHint')}">${fcPct.toFixed(0)}% FC</span>`;
        const agotado = p.disponible === false;
        const nAler = (p.allergensManual||[]).length;
        return `
        <div class="oc-plato plegable${agotado ? ' agotado' : ''}${ggPlegableAbierta('cp-' + sec.id + '-' + p.id) ? ' is-abierta' : ''}" data-pl="cp-${sec.id}-${p.id}" onclick="ggTogglePlegable(event, this)">
          <div class="oc-mover pl-extra">${reorderButtons(`moveCartaPlato(${sec.id},${pi},-1)`, `moveCartaPlato(${sec.id},${pi},1)`, pi===0, pi===platos.length-1)}</div>
          <div class="oc-plato-nom">
            <span class="carta-plato-name" title="${p.recipeId ? t('title.renameDish') : t('title.editPrice')}" onclick="if(ggSiPlegada(event,this))return;${p.recipeId ? `renameCartaPlato(${sec.id},${p.id})` : `addCartaPlato(${sec.id},${p.id})`}">${escapeHtml(tItem(p))} <i class="ti ti-pencil owner-only"></i></span>
            ${marginDot}
            ${ocEstadoPlegado(agotado, p.stock)}
          </div>
          <!-- Un plato SIN receta vinculada no tiene "Escandallo" donde ir a cambiar el precio — por eso aquí el
               propio precio es clicable (y abre el mismo modal de alta). El de una receta vinculada sigue siendo de
               solo lectura: se gestiona desde Escandallo. -->
          <span class="carta-plato-price oc-precio${p.recipeId ? '' : ' editable'}" ${p.recipeId ? '' : `onclick="if(ggSiPlegada(event,this))return;addCartaPlato(${sec.id},${p.id})" title="${t('title.editPrice')}"`}>${fmtMoney(p.precio)}</span>
          ${ocChevHtml()}
          <div class="oc-ctrl pl-extra">
            ${ocBtnDisponible(agotado, `toggleCartaPlato(${sec.id},${p.id})`)}
            ${ocBtnRaciones(p.stock, `setCartaPlatoStock(${sec.id},${p.id})`)}
            ${ocBtnExtras((p.modificadores||[]).length, `openPlatoModsModal(${sec.id},${p.id})`)}
            ${!p.recipeId ? `<button type="button" class="btn btn-sm btn-fino${nAler ? ' is-off' : ''}" onclick="openPlatoAllergensModal(${sec.id},${p.id})" title="${t('label.allergens')}" aria-label="${t('label.allergens')}"><i class="ti ti-alert-triangle"></i>${nAler ? ` ${nAler}` : ''}</button>` : ''}
            ${ggMenuAcciones([
              {icono:'ti-pencil', texto:t('common.edit'), fn: p.recipeId ? `renameCartaPlato(${sec.id},${p.id})` : `addCartaPlato(${sec.id},${p.id})`, owner:true},
              {icono:'ti-trash', texto:t('common.delete'), fn:`removeCartaPlato(${sec.id},${p.id})`, peligro:true, owner:true}
            ])}
          </div>
        </div>`;
      }).join('') : `<div class="empty" style="padding:14px">${q ? t('empty.noSearchResults') : (bebidas ? t('empty.sectionDrinks') : t('empty.sectionDishes'))}</div>`}
    </section>`;
  }).join('');
  box.innerHTML = searchBox + (rows.trim() ? rows : `<div class="empty"><i class="ti ti-search"></i>${t('empty.noSearchResults')}</div>`);
}
/* ---- Icono de cada sección de la carta ----
   Catálogo de iconos de COMIDA de trazo (js/iconos-comida.js): los ve el cliente final en la web de reservas y
   pedidos, donde cada sección es una carpeta. Se elige a mano porque adivinarlo por el nombre nunca acierta del
   todo ("Cosas del chef", "La pizarra"); si no se elige, se adivina (iconoComidaPorNombre) y se puede dejar la
   sección SIN icono. Lo que se guarda en `sec.icono`: «ic:<clave>», «ic:none», o nada (= automático). */
const ICONOS_GRUPOS_BEBIDA = ['vino', 'cerveza', 'cafe', 'refresco'];
// Los grupos en el orden en que se enseñan: en Sala (carta de bebidas) primero los de bebida; en Cocina, al final.
function cartaSectionIconGrupos(){
  const todos = ICONOS_COMIDA_GRUPOS.map(g => g[0]);
  const bebida = todos.filter(g => ICONOS_GRUPOS_BEBIDA.includes(g));
  const comida = todos.filter(g => !ICONOS_GRUPOS_BEBIDA.includes(g));
  return currentArea() === 'sala' ? [...bebida, ...comida] : [...comida, ...bebida];
}
// Respaldo mientras el hostelero no elija: se adivina por el nombre de la sección (clave del catálogo).
function cartaSectionFallbackIcon(name){
  return iconoComidaPorNombre(name);
}
// El selector de iconos, con buscador, en grupos y con «Sin icono» / «Automático». Lo comparten la carta y las
// carpetas de Mega Lista: `accion(valor)` devuelve el onclick de cada botón.
function iconoSelectorHtml(actual, accion){
  const lang = getLang();
  const boton = (valor, html, titulo, extra) => `<button type="button" class="ico-btn${actual === 'ic:' + valor ? ' is-on' : ''}" data-n="${escapeHtml(iconoNombreNormal(extra||titulo))}" title="${escapeHtml(titulo)}" aria-label="${escapeHtml(titulo)}" onclick="${accion('ic:' + valor)}">${html}</button>`;
  const nombres = {es:0, ca:1, en:2};
  const grupos = cartaSectionIconGrupos().map(g => {
    const info = ICONOS_COMIDA_GRUPOS.find(x => x[0] === g);
    const items = Object.entries(ICONOS_COMIDA).filter(([, v]) => v[4] === g);
    return `<div class="ico-grupo"><h5>${escapeHtml(info[1 + (nombres[lang] ?? 0)])}</h5><div class="ico-grid">${
      items.map(([k, v]) => boton(k, iconoComidaSvg(k, 28), iconoComidaNombre(k, lang), v[1] + ' ' + v[2] + ' ' + v[3] + ' ' + k)).join('')
    }</div></div>`;
  }).join('');
  return `
    <div class="ico-cab">
      <div class="oc-buscar" style="margin:0"><i class="ti ti-search"></i><input type="text" id="ico-buscar" placeholder="${escapeHtml(gl({es:'Buscar icono: pizza, vino, postre…', ca:'Cercar icona: pizza, vi, postres…', en:'Search icon: pizza, wine, dessert…'}))}" oninput="filtrarIconosComida(this.value)"></div>
      <div class="ico-especiales">
        <button type="button" class="btn btn-sm btn-fino${actual === 'ic:none' ? ' is-on' : ''}" onclick="${accion('ic:none')}"><i class="ti ti-ban"></i> ${gl({es:'Sin icono', ca:'Sense icona', en:'No icon'})}</button>
        <button type="button" class="btn btn-sm btn-fino${actual === '' ? ' is-on' : ''}" onclick="${accion('')}" title="${escapeHtml(gl({es:'Se elige solo según el nombre', ca:'S\'escull sola segons el nom', en:'Picked automatically from the name'}))}"><i class="ti ti-wand"></i> ${gl({es:'Automático', ca:'Automàtic', en:'Automatic'})}</button>
      </div>
    </div>
    <div class="ico-lista" id="ico-lista">${grupos}</div>`;
}
function openCartaSectionIconModal(secId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  openModal(`
    <div class="modal-header">
      <h3>${t('title.chooseFolderIcon')}: ${escapeHtml(tItem(sec))}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="inc-ayuda">${t('carta.sectionIconHint')}</p>
    ${iconoSelectorHtml(sec.icono || '', v => `setCartaSectionIcon(${sec.id},'${v}')`)}
    <div class="modal-footer">
      <button class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `, {xl:true});
}
function filtrarIconosComida(q){
  const n = iconoNombreNormal(q).trim();
  document.querySelectorAll('#ico-lista .ico-btn').forEach(b => { b.hidden = !!n && !b.dataset.n.includes(n); });
  document.querySelectorAll('#ico-lista .ico-grupo').forEach(g => { g.hidden = ![...g.querySelectorAll('.ico-btn')].some(b => !b.hidden); });
}
function setCartaSectionIcon(secId, valor){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  if(valor) sec.icono = valor; else delete sec.icono;
  closeModal();
  renderCartaSecciones();
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
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmNewCartaSection()">${t('common.add')}</button>
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
/* ⚠️ Poder CORREGIR un nombre. Faltaba en los cuatro sitios: la sección y el
   plato de la carta, y el grupo y la opción de un menú. Sin esto, una falta de
   ortografía o un "Prueba" que se quedó puesto solo se arreglan borrando y
   volviendo a crearlo — perdiendo de paso los extras, el límite de raciones y
   el orden. El dueño lo dijo así: "no deja editar el nombre de la sección o el
   plato".

   El nombre del plato en la CARTA es suyo, aunque venga de una receta: en la
   carta puede llamarse "Nuestro steak tartar" y en el escandallo "Steak
   tartar". Renombrar aquí no toca la receta. */
/* Disponible y raciones de CADA PLATO del menú, que es donde está el límite
   real de una cocina: se compran 8 merluzas, no 20 menús. Al agotarse una
   opción, el TPV y la web pública dejan de ofrecerla y el menú se sigue
   vendiendo con las demás — que es exactamente lo que pasa en un servicio. */
function toggleMenuOpcionDisponible(grupoId, opcionId){
  const g = menuEdit && menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g && (g.opciones||[]).find(x=>x.id===opcionId);
  if(!o) return;
  o.disponible = o.disponible===false ? true : false;
  const vivo = menuVivoOpcion(menuEdit.id, grupoId, opcionId);
  if(vivo && vivo !== o){ vivo.disponible = o.disponible; saveDB(); }
  renderMenuGrupos();
}
function setMenuOpcionStock(grupoId, opcionId){
  const g = menuEdit && menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g && (g.opciones||[]).find(x=>x.id===opcionId);
  if(!o) return;
  openRacionesModal({tipo:'opcion', grupoId, opcionId}, o.stock != null ? o.stock : null, tItem(o));
}
function aplicarRacionesOpcion(grupoId, opcionId, n){
  const g = menuEdit && menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g && (g.opciones||[]).find(x=>x.id===opcionId);
  if(!o) return;
  ocPonerRaciones(o, n);
  const vivo = menuVivoOpcion(menuEdit.id, grupoId, opcionId);
  if(vivo && vivo !== o){ ocPonerRaciones(vivo, n); saveDB(); }
  renderMenuGrupos();
}

async function renameMenuGrupo(grupoId){
  if(!isOwnerSession() && !editUnlocked){ showToast(t('msg.needEditUnlockToRename')); return; }
  const g = menuEdit && menuEdit.grupos.find(x=>x.id===grupoId);
  if(!g) return;
  const nuevo = await promptText(t('msg.renameGroupPrompt'), g.nombre);
  if(nuevo === null) return;
  const limpio = nuevo.trim();
  if(!limpio){ showToast(t('msg.nameCannotBeEmpty')); return; }
  g.nombre = limpio;
  renderMenuGrupos();
}
async function renameMenuOpcion(grupoId, opcionId){
  if(!isOwnerSession() && !editUnlocked){ showToast(t('msg.needEditUnlockToRename')); return; }
  const g = menuEdit && menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g && (g.opciones||[]).find(x=>x.id===opcionId);
  if(!o) return;
  const nuevo = await promptText(t('msg.renameOptionPrompt'), o.nombre);
  if(nuevo === null) return;
  const limpio = nuevo.trim();
  if(!limpio){ showToast(t('msg.nameCannotBeEmpty')); return; }
  o.nombre = limpio;
  renderMenuGrupos();
}

async function renameCartaSeccion(secId){
  if(!isOwnerSession() && !editUnlocked){ showToast(t('msg.needEditUnlockToRename')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  const nuevo = await promptText(t('msg.renameSectionPrompt'), tItem(sec));
  if(nuevo === null) return;
  const limpio = nuevo.trim();
  if(!limpio){ showToast(t('msg.nameCannotBeEmpty')); return; }
  sec.nombre = limpio;
  renderCartaSecciones();
}
async function renameCartaPlato(secId, platoId){
  if(!isOwnerSession() && !editUnlocked){ showToast(t('msg.needEditUnlockToRename')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec && sec.platos.find(x=>x.id===platoId);
  if(!p) return;
  const nuevo = await promptText(t('msg.renameDishPrompt'), tItem(p));
  if(nuevo === null) return;
  const limpio = nuevo.trim();
  if(!limpio){ showToast(t('msg.nameCannotBeEmpty')); return; }
  p.nombre = limpio;
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
  // Es estado del servicio: se aplica ya sobre lo guardado, sin esperar a «Guardar» (ver ocCopiarVivo).
  const vivo = cartaVivoPlato(platoId);
  if(vivo && vivo !== p){
    vivo.disponible = p.disponible;
    logAudit('availability', t(p.disponible===false ? 'audit.dishMarkedOut' : 'audit.dishMarkedAvailable').replace('${name}', tItem(p)));
    saveDB();
  }
  renderCartaSecciones();
}
// Raciones limitadas: p.stock es null/undefined si el plato no lleva
// control de cantidad (comportamiento normal, disponible/no disponible a
// mano). Si se le pone un número, el TPV lo va descontando solo cada vez
// que se marcha una unidad a cocina (ver decrementDishStock en tpv.js) y al
// llegar a 0 el plato pasa a "No disponible" sin que nadie tenga que
// acordarse — no se resetea solo: cuando se agote un día, hay que volver a
// aquí y ponerle de nuevo la cantidad para el día siguiente.
// Raciones limitadas: p.stock es null/undefined si el plato no lleva control de cantidad (comportamiento normal,
// disponible/no disponible a mano). Si se le pone un número, el TPV lo va descontando solo cada vez que se marcha
// una unidad a cocina (ver decrementDishStock en tpv.js) y al llegar a 0 el plato pasa a "No disponible" sin que
// nadie tenga que acordarse — no se resetea solo: cuando se agote un día, hay que volver a aquí y ponerle de nuevo
// la cantidad para el día siguiente. Abre la ventana de raciones; aplicarRacionesPlato() hace el cambio.
function setCartaPlatoStock(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec && sec.platos.find(x=>x.id===platoId);
  if(!p) return;
  openRacionesModal({tipo:'plato', secId, platoId}, p.stock != null ? p.stock : null, tItem(p));
}
function aplicarRacionesPlato(secId, platoId, n){
  const sec = cartaEdit && cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec && sec.platos.find(x=>x.id===platoId);
  if(!p) return;
  ocPonerRaciones(p, n);
  const vivo = cartaVivoPlato(platoId);
  if(vivo && vivo !== p){ ocPonerRaciones(vivo, n); saveDB(); }
  renderCartaSecciones();
}
async function removeCartaPlato(secId, platoId){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  sec.platos = sec.platos.filter(p=>p.id!==platoId);
  renderCartaSecciones();
}
// `platoId` es null al CREAR, y el id del plato al EDITAR su precio — mismo
// modal para los dos casos (pedido del dueño, igual que ya hacen los
// modificadores de ingredientes.js). Hallazgo real (1/10): un plato manual
// sin receta vinculada (una bebida suelta, un plato sin escandallar) se
// podía crear con un precio, pero DESPUÉS no había ningún sitio donde
// cambiárselo — ni al tocar el nombre, ni al tocar el precio, ni en ningún
// otro botón de su fila. Subir un precio sin receta obligaba a borrar el
// plato entero y crearlo de nuevo, perdiendo su sitio en la carta.
function addCartaPlato(secId, platoId){
  const isBebidas = currentArea()==='sala';
  const sec = cartaEdit && cartaEdit.secciones ? cartaEdit.secciones.find(s=>s.id===secId) : null;
  const p = (sec && platoId) ? sec.platos.find(x=>x.id===platoId) : null;
  openModal(`
    <div class="modal-header">
      <h3>${p ? t('title.editPrice') : t('title.newDishManual')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${isBebidas ? t('label.newDrinkNameField') : t('label.newDishNameField')}</label>
      <input type="text" id="new-carta-plato-nombre" value="${p ? escapeHtml(p.nombre) : ''}" placeholder="${isBebidas ? t('ph.drinkNameExample') : t('ph.dishNameExample')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.priceBaseNoVat')}</label>
        <input type="number" id="new-carta-plato-precio-base" step="0.01" min="0" value="${p && p.precioBase!=null ? p.precioBase : ''}" oninput="updateCartaPlatoFinalPriceDisplay()">
      </div>
      <div class="field">
        <label>${t('label.ivaTypeRepercutido')}</label>
        <select id="new-carta-plato-iva" onchange="updateCartaPlatoFinalPriceDisplay()">
          <option value="" ${p && p.ivaPct!=null ? '' : 'selected'} disabled>${t('label.chooseIva')}</option>
          ${[21,10,4,0].map(pct => `<option value="${pct}" ${p && p.ivaPct===pct ? 'selected' : ''}>${pct}%</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field" style="margin-top:-8px">
      <span style="font-size:12.5px;color:var(--muted)">${t('label.finalPriceWithVat')}: <strong id="new-carta-plato-precio-final">${fmtMoney(p ? p.precio||0 : 0)}</strong></span>
    </div>
    <div class="txt-xs" style="color:var(--muted);margin-top:-6px;margin-bottom:10px">${t('label.ivaPlatoHint')}</div>
    <div class="modal-footer">
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmAddCartaPlato(${secId}${p ? ',' + p.id : ''})">${p ? t('common.save') : t('common.add')}</button>
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
function confirmAddCartaPlato(secId, platoId){
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
  if(platoId){
    const p = sec.platos.find(x=>x.id===platoId);
    if(!p) return;
    p.nombre = nombre.trim(); p.precioBase = precioBase; p.ivaPct = ivaPct; p.precio = precio;
  }else{
    sec.platos.push({id: genId(), recipeId:null, nombre: nombre.trim(), precio, precioBase, ivaPct, disponible:true, modificadores:[]});
  }
  closeModal();
  renderCartaSecciones();
}

/* ============== Modificadores / extras de plato ============== */
// Antes solo se podía añadir o borrar: un extra mal escrito o con el
// precio cambiado (el proveedor sube el queso, por ejemplo) obligaba a
// borrarlo y crearlo de nuevo, perdiendo su sitio en la lista. El mismo
// par de campos de abajo hace de "nuevo" o de "editar" según si hay un
// modificador seleccionado (platoModEditId) — pedido del dueño, 9/09.
let platoModEditId = null;
function openPlatoModsModal(secId, platoId){
  platoModEditId = null;
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
function renderPlatoModsModalHtml(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  const mods = p.modificadores || [];
  const isBebidas = currentArea()==='sala';
  const editing = platoModEditId != null ? mods.find(m=>m.id===platoModEditId) : null;
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
          ${ggMenuAcciones([
            {icono:'ti-pencil', texto:t('common.edit'), fn:`startEditPlatoMod(${secId},${platoId},${m.id})`},
            {icono:'ti-trash', texto:t('common.delete'), fn:`removePlatoMod(${secId},${platoId},${m.id})`, peligro:true}
          ])}
        </div>
      `).join('') : `<div class="empty" style="padding:10px">${t('empty.mods')}</div>`}
    </div>
    <div class="field">
      <label>${t('label.extraName')}</label>
      <input type="text" id="new-mod-nombre" placeholder="${t('ph.extraNameExample')}" value="${editing?escapeHtml(editing.nombre):''}">
    </div>
    <div class="field">
      <label>${t('label.extraPrice')}</label>
      <input type="number" id="new-mod-precio" step="0.01" min="0" value="${editing?editing.precio:0}">
    </div>
    <div class="modal-footer">
      ${editing ? `<button class="btn" onclick="cancelEditPlatoMod(${secId},${platoId})">${t('common.cancel')}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="${editing?`saveEditPlatoMod(${secId},${platoId})`:`addPlatoMod(${secId},${platoId})`}"><i class="ti ${editing?'ti-check':'ti-plus'}"></i> ${editing?t('common.save'):t('btn.addExtra')}</button>
    </div>
  `;
}
function readModFormOrToast(){
  const nombre = (document.getElementById('new-mod-nombre').value||'').trim();
  if(!nombre){ showToast(t('msg.extraNameRequired')); return null; }
  const precioStr = document.getElementById('new-mod-precio').value;
  const precio = parseFloat((precioStr||'0').replace(',','.')) || 0;
  if(precio < 0){ showToast(t('msg.invalidPrice')); return null; }
  return {nombre, precio};
}
function addPlatoMod(secId, platoId){
  const data = readModFormOrToast();
  if(!data) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  if(!p.modificadores) p.modificadores = [];
  p.modificadores.push({id: genId(), ...data});
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
function startEditPlatoMod(secId, platoId, modId){
  platoModEditId = modId;
  openModal(renderPlatoModsModalHtml(secId, platoId));
  setTimeout(()=>document.getElementById('new-mod-nombre')?.focus(), 50);
}
function cancelEditPlatoMod(secId, platoId){
  platoModEditId = null;
  openModal(renderPlatoModsModalHtml(secId, platoId));
}
function saveEditPlatoMod(secId, platoId){
  const data = readModFormOrToast();
  if(!data) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  const m = (p.modificadores||[]).find(x=>x.id===platoModEditId);
  if(m) Object.assign(m, data);
  platoModEditId = null;
  openModal(renderPlatoModsModalHtml(secId, platoId));
}
async function removePlatoMod(secId, platoId, modId){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  p.modificadores = (p.modificadores||[]).filter(m=>m.id!==modId);
  if(platoModEditId===modId) platoModEditId = null;
  openModal(renderPlatoModsModalHtml(secId, platoId));
}

/* ============== Alérgenos de un plato SIN receta vinculada ==============
   Un plato manual de Carta (recipeId:null — típicamente una bebida) no
   tiene ningún escandallo del que deducir alérgenos: sin esto, no había
   forma de avisar de gluten/frutos de cáscara/sulfitos aunque el hostelero
   lo supiera, ni en el aviso interno APPCC ni en la web pública. Se
   guardan a mano en el propio plato, igual que ya se hace en la ficha
   técnica (f.allergens) para casos sin escandallo. */
function openPlatoAllergensModal(secId, platoId){
  openModal(renderPlatoAllergensModalHtml(secId, platoId));
}
function renderPlatoAllergensModalHtml(secId, platoId){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  const selected = p.allergensManual || [];
  return `
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('label.allergens')} "${escapeHtml(tItem(p))}"</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('msg.dishAllergensOverviewDesc')}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${ALLERGENS.map(a => `<button class="badge ${selected.includes(a)?'badge-red':''}" style="cursor:pointer;border:1px solid var(--border)" onclick="togglePlatoAllergen(${secId},${platoId},'${a}')">${escapeHtml(allergenLabel(a))}</button>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `;
}
function togglePlatoAllergen(secId, platoId, a){
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  const p = sec.platos.find(x=>x.id===platoId);
  if(!p.allergensManual) p.allergensManual = [];
  const i = p.allergensManual.indexOf(a);
  if(i>=0) p.allergensManual.splice(i,1); else p.allergensManual.push(a);
  openModal(renderPlatoAllergensModalHtml(secId, platoId));
}

// Antes se listaban TODOS los platos/bebidas del escandallo de golpe, sin
// forma de buscar — con una carta grande, encontrar uno concreto significaba
// desplazarse a mano por decenas de líneas. Con un buscador que filtra por
// nombre, escribiendo 2-3 letras basta para encontrarlo.
let importEscSecId = null;
function importFromEscandallo(secId){
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && !r.isBase);
  if(!areaRecipes.length){ showToast(currentArea()==='sala' ? t('msg.noDrinksInCosting') : t('msg.noDishesInCosting')); return; }
  importEscSecId = secId;
  openModal(`
    <div class="modal-header">
      <h3>${t('title.importFromCosting')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field" style="margin-bottom:8px">
      <input type="text" id="import-esc-search" placeholder="${t('common.search')}" oninput="renderImportEscList()" autofocus>
    </div>
    <div class="field" style="margin-bottom:8px">
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="import-esc-all" onchange="toggleImportEscAll(this.checked)" style="width:auto"> ${t('common.selectAll')}
      </label>
    </div>
    <div id="import-esc-list" style="max-height:320px;overflow:auto"></div>
    <div class="modal-footer">
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmImportEsc(${secId})">${t('common.import')}</button>
    </div>
  `);
  renderImportEscList();
}
// Al filtrar, las casillas ya marcadas se conservan aunque el plato deje de
// verse (se guarda su estado en importEscChecked) — si no, buscar otra cosa
// después de marcar algunos platos los desmarcaba sin que nadie lo pidiera.
let importEscChecked = new Set();
function renderImportEscList(){
  const box = document.getElementById('import-esc-list');
  if(!box) return;
  // Conserva lo ya marcado en el DOM actual antes de volver a pintar.
  document.querySelectorAll('#import-esc-list input[type=checkbox]:checked:not(:disabled)').forEach(c => importEscChecked.add(parseInt(c.value)));
  document.querySelectorAll('#import-esc-list input[type=checkbox]:not(:checked):not(:disabled)').forEach(c => importEscChecked.delete(parseInt(c.value)));
  const query = (document.getElementById('import-esc-search')?.value || '').trim().toLowerCase();
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && !r.isBase);
  const existingIds = new Set(cartaEdit.secciones.flatMap(s=>(s.platos||[]).map(p=>p.recipeId).filter(Boolean)));
  const filtered = query ? areaRecipes.filter(r => (r.name||'').toLowerCase().includes(query)) : areaRecipes;
  box.innerHTML = filtered.length ? filtered.map(r => {
    const done = existingIds.has(r.id);
    return `<label style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);${done?'opacity:.5':''}">
      <input type="checkbox" value="${r.id}" ${done?'disabled checked':(importEscChecked.has(r.id)?'checked':'')} style="width:auto">
      <span style="flex:1">${escapeHtml(r.name)}</span>
      <span style="font-family:monospace;color:var(--ink);font-weight:600">${fmtMoney(r.price)}</span>
    </label>`;
  }).join('') : `<div class="empty" style="padding:16px 4px"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
  const allBox = document.getElementById('import-esc-all');
  if(allBox) allBox.checked = filtered.length > 0 && filtered.every(r => existingIds.has(r.id) || importEscChecked.has(r.id));
}
function toggleImportEscAll(checked){
  document.querySelectorAll('#import-esc-list input[type=checkbox]:not(:disabled)').forEach(c=>{
    c.checked = checked;
    if(checked) importEscChecked.add(parseInt(c.value)); else importEscChecked.delete(parseInt(c.value));
  });
}
function confirmImportEsc(secId){
  // No basta con leer las casillas visibles ahora mismo: si se marcó algo,
  // se buscó otra cosa distinta y esa selección quedó fuera del filtro
  // actual, seguiría contando (ver importEscChecked en renderImportEscList).
  document.querySelectorAll('#import-esc-list input[type=checkbox]:checked:not(:disabled)').forEach(c => importEscChecked.add(parseInt(c.value)));
  document.querySelectorAll('#import-esc-list input[type=checkbox]:not(:checked):not(:disabled)').forEach(c => importEscChecked.delete(parseInt(c.value)));
  const existingIds = new Set(cartaEdit.secciones.flatMap(s=>(s.platos||[]).map(p=>p.recipeId).filter(Boolean)));
  const checked = [...importEscChecked].filter(id => !existingIds.has(id));
  if(!checked.length){ showToast(currentArea()==='sala' ? t('msg.selectAtLeastOneDrink') : t('msg.selectAtLeastOneDish')); return; }
  const sec = cartaEdit.secciones.find(s=>s.id===secId);
  if(!sec) return;
  checked.forEach(rid => {
    const r = getRecipe(rid);
    if(!r) return;
    sec.platos.push({id: genId(), recipeId: r.id, nombre: r.name, precio: r.price||0, precioBase: r.priceBase, deliverySupplement: r.deliverySupplement||null, ivaPct: r.ivaPct, disponible:true});
  });
  importEscChecked = new Set();
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
  box.innerHTML = `<div class="oc-lista">${menus.map(m => {
    const ngrupos = (m.grupos||[]).length;
    return `
    <article class="oc-item oc-item-menu">
      <div class="oc-quien">
        <div class="oc-nombre">${escapeHtml(tItem(m))}${(DB.activeMenuIds||[]).includes(m.id) ? ` <span class="badge badge-green">${t('badge.activeInPosM')}</span>` : ''}</div>
        <div class="oc-meta"><span class="oc-precio-m">${fmtMoney(m.precio)}</span> · ${ngrupos} ${t('label.groups').toLowerCase()}</div>
      </div>
      ${renderItemScheduleHtml(m)}
      <div class="oc-acc">
        ${ocBtnDisponible(m.disponible===false, `toggleMenuDisponible(${m.id})`)}
        ${ocBtnRaciones(m.stock, `setMenuStock(${m.id})`)}
        ${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`openMenu(${m.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteMenu(${m.id})`, peligro:true, owner:true}
        ])}
      </div>
    </article>`;
  }).join('')}</div>`;
}

/* Disponible y raciones limitadas para el MENÚ entero, igual que para
   cualquier plato de la Carta.

   Faltaban aquí y es justo donde más falta hacen: el menú del día se agota
   antes que ningún plato suelto ("hoy solo hay 20"), y hasta ahora la única
   forma de quitarlo era el panel rápido del TPV — que no aparece por ningún
   lado en la pantalla donde se gestionan los menús. El dueño lo contó como
   que "las opciones no están", y tenía razón: en Carta cada plato tiene sus
   dos botones y aquí no había ninguno. */
function toggleMenuDisponible(id){
  const m = DB.menus.find(x=>x.id===id);
  if(!m) return;
  m.disponible = m.disponible===false ? true : false;
  logAudit('availability', t(m.disponible===false ? 'audit.dishMarkedOut' : 'audit.dishMarkedAvailable').replace('${name}', tItem(m)));
  saveDB();
  renderMenu();
}
// Mismo criterio que setCartaPlatoStock: vacío = sin límite (lo normal), un
// número = raciones que quedan. El TPV lo va descontando al marchar y al
// llegar a 0 el menú pasa a "No disponible" solo. No se resetea cada día a
// propósito: hay que volver aquí y ponerle la cantidad de mañana.
function setMenuStock(id){
  const m = DB.menus.find(x=>x.id===id);
  if(!m) return;
  openRacionesModal({tipo:'menu', id}, m.stock != null ? m.stock : null, tItem(m));
}
function aplicarRacionesMenu(id, n){
  const m = DB.menus.find(x=>x.id===id);
  if(!m) return;
  ocPonerRaciones(m, n);
  saveDB();
  renderMenu();
}

function newMenu(){
  menuEdit = {id: genId(), nombre:'', precio:0, horario: defaultItemHorario(), grupos:[], desglosarPases:true, area: currentArea()};
  renderMenu();
  menuBase = menuSnapshot(); ofertaMarcarCambio('menu');
}
function openMenu(id){
  const m = DB.menus.find(x=>x.id===id);
  if(!m) return;
  menuEdit = JSON.parse(JSON.stringify(m));
  if(!Array.isArray(menuEdit.grupos)) menuEdit.grupos = [];
  menuEdit.horario = migrateItemHorario(menuEdit);
  menuEdit.grupos.forEach(g => { if(!Array.isArray(g.opciones)) g.opciones = []; });
  renderMenu();
  menuBase = menuSnapshot(); ofertaMarcarCambio('menu');
}
function backToMenuList(){
  ggGuardarSiHaceFalta(() => { menuEdit = null; menuBase = ''; renderMenu(); });
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
  if(!nombre){ showToast(t('msg.menuNameRequired')); return false; }
  const precioBaseStr = document.getElementById('menu-f-precio-base').value;
  const precioBase = parseFloat((precioBaseStr||'').replace(',','.'));
  if(isNaN(precioBase) || precioBase < 0){ showToast(t('msg.invalidPrice')); return false; }
  const ivaRaw = document.getElementById('menu-f-iva').value;
  if(ivaRaw === ''){ showToast(t('msg.chooseIvaForDish')); return false; }
  const ivaPct = parseFloat(ivaRaw);
  const precio = Math.round(precioBase * (1 + ivaPct/100) * 100) / 100;
  if(!menuEdit.grupos.length){ showToast(t('msg.menuNeedsGroup')); return false; }
  for(const g of menuEdit.grupos){
    if(!g.opciones.length){ showToast(t('msg.groupNeedsOneOption').replace('${name}', g.nombre)); return false; }
  }
  const horario = readScheduleFromForm('menu');
  const malHorario = horarioIncompleto(horario);
  if(malHorario){ showToast(malHorario); return false; }
  menuEdit.nombre = nombre;
  menuEdit.precio = precio;
  menuEdit.precioBase = precioBase;
  menuEdit.ivaPct = ivaPct;
  menuEdit.horario = horario;
  delete menuEdit.turno;
  delete menuEdit.dias;
  menuEdit.desglosarPases = true;
  // Raciones y «agotado» mandan siempre desde lo guardado (ver ocCopiarVivo): el menú entero y cada opción.
  const vivoMenu = DB.menus.find(m => m.id === menuEdit.id);
  if(vivoMenu) ocCopiarVivo(menuEdit, vivoMenu);
  menuEdit.grupos.forEach(g => (g.opciones||[]).forEach(o => ocCopiarVivo(o, menuVivoOpcion(menuEdit.id, g.id, o.id))));
  const nuncaActivo = horarioNuncaActivo(menuEdit.horario);
  const idx = DB.menus.findIndex(m=>m.id===menuEdit.id);
  if(idx>=0) DB.menus[idx] = menuEdit;
  else DB.menus.push(menuEdit);
  saveDB();
  autoTranslateMenu(menuEdit).catch(()=>{});
  menuEdit = null; menuBase = '';
  updateAutoActiveMenu(true);
  renderMenu();
  showToast(nuncaActivo ? t('msg.horarioNuncaActivo') : t('msg.menuSaved'));
  return true;
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
  // En sala esto son menús de BEBIDA: buscar "plato" y proponer grupos de "Primero, Segundo, Postre" no tiene
  // sentido en una carta de vinos.
  const isBebidas = currentArea()==='sala';
  const searchBox = `
    <div class="oc-buscar"><i class="ti ti-search"></i><input type="text" id="menu-search-input" placeholder="${isBebidas ? t('ph.searchDrink') : t('ph.searchDish')}" value="${escapeHtml(menuSearchQuery)}" oninput="setMenuSearchQuery(this.value)"></div>`;
  if(!menuEdit.grupos.length){
    box.innerHTML = searchBox + `<div class="empty"><i class="ti ti-list"></i>${isBebidas ? t('empty.groups.sala') : t('empty.groups')}</div>`;
    return;
  }
  const grupos = menuEdit.grupos;
  const rows = grupos.map((g, gi) => {
    const opciones = g.opciones || [];
    const grupoMatches = !q || g.nombre.toLowerCase().includes(q);
    const visibleOpciones = q && !grupoMatches ? opciones.filter(o => o.nombre.toLowerCase().includes(q)) : opciones;
    if(q && !grupoMatches && !visibleOpciones.length) return '';
    const fuera = opciones.filter(o => o.disponible === false).length;
    return `
    <section class="oc-sec">
      <div class="oc-sec-cab">
        <div class="oc-sec-tit">
          ${reorderButtons(`moveMenuGrupo(${gi},-1)`, `moveMenuGrupo(${gi},1)`, gi===0, gi===grupos.length-1)}
          <div style="min-width:0"><h4>${escapeHtml(g.nombre)}${g.bebida ? ` <span class="oc-sec-n"><i class="ti ti-glass-full"></i> ${t('label.sala')}</span>` : ''}</h4><span class="oc-sec-n">${opciones.length} ${gl({es:opciones.length===1?'opción':'opciones', ca:opciones.length===1?'opció':'opcions', en:opciones.length===1?'option':'options'})}${fuera ? ` · <b class="dishout-fuera">${fuera} ${gl({es:fuera===1?'agotada':'agotadas', ca:fuera===1?'esgotada':'esgotades', en:'out'})}</b>` : ''}</span></div>
        </div>
        <div class="oc-sec-acc">
          <label class="oc-check"><input type="checkbox" ${g.bebida?'checked':''} onchange="toggleGrupoBebida(${g.id},this.checked)"> ${t('label.sala')}</label>
          <button type="button" class="btn btn-sm btn-fino is-on" onclick="addMenuOpcion(${g.id})"><i class="ti ti-plus"></i> ${t('btn.newOption')}</button>
          ${ggMenuAcciones([
            {icono:'ti-pencil', texto:t('title.renameGroup'), fn:`renameMenuGrupo(${g.id})`, owner:true},
            {icono:'ti-trash', texto:t('common.delete'), fn:`removeMenuGrupo(${g.id})`, peligro:true, owner:true}
          ])}
        </div>
      </div>
      ${visibleOpciones.length ? visibleOpciones.map(o => {
        const oi = opciones.indexOf(o);
        const agotado = o.disponible === false;
        return `
        <div class="oc-plato plegable${agotado ? ' agotado' : ''}${ggPlegableAbierta('mo-' + g.id + '-' + o.id) ? ' is-abierta' : ''}" data-pl="mo-${g.id}-${o.id}" onclick="ggTogglePlegable(event, this)">
          <div class="oc-mover pl-extra">${reorderButtons(`moveMenuOpcion(${g.id},${oi},-1)`, `moveMenuOpcion(${g.id},${oi},1)`, oi===0, oi===opciones.length-1)}</div>
          <div class="oc-plato-nom"><span class="carta-plato-name" title="${t('title.renameOption')}" onclick="if(ggSiPlegada(event,this))return;renameMenuOpcion(${g.id},${o.id})">${escapeHtml(o.nombre)} <i class="ti ti-pencil owner-only"></i></span>${ocEstadoPlegado(agotado, o.stock)}</div>
          ${o.suplemento ? `<span class="oc-precio">+${fmtMoney(o.suplemento)}</span>` : '<span class="oc-precio"></span>'}
          ${ocChevHtml()}
          <div class="oc-ctrl pl-extra">
            ${ocBtnDisponible(agotado, `toggleMenuOpcionDisponible(${g.id},${o.id})`)}
            ${ocBtnRaciones(o.stock, `setMenuOpcionStock(${g.id},${o.id})`)}
            ${ocBtnExtras((o.modificadores||[]).length, `openMenuOpcionModsModal(${g.id},${o.id})`)}
            ${ggMenuAcciones([
              {icono:'ti-pencil', texto:t('common.edit'), fn:`renameMenuOpcion(${g.id},${o.id})`, owner:true},
              {icono:'ti-trash', texto:t('common.delete'), fn:`removeMenuOpcion(${g.id},${o.id})`, peligro:true, owner:true}
            ])}
          </div>
        </div>`;
      }).join('') : `<div class="empty" style="padding:14px">${q ? t('empty.noSearchResults') : t('empty.groupOptions')}</div>`}
    </section>`;
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
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmNewMenuGrupo()">${t('common.add')}</button>
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
        <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-fino is-on" onclick="confirmAddMenuOpcion(${grupoId})">${t('common.add')}</button>
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
      <label>${currentArea()==='sala' ? t('label.drinkEscandallo') : t('label.dishEscandallo')}</label>
      <select id="new-menu-opcion-recipe">
        ${areaRecipes.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}
      </select>
    </div>
    <div class="field" id="new-menu-opcion-manual-field" style="display:${areaRecipes.length?'none':''}">
      <label>${currentArea()==='sala' ? t('label.drinkName') : t('label.dishName')}</label>
      <input type="text" id="new-menu-opcion-nombre" placeholder="${currentArea()==='sala' ? t('ph.drinkNameExample') : t('ph.dishNameExample')}">
    </div>
    <div class="field">
      <label>${t('label.supplementEur')} <span style="color:var(--muted);font-weight:400">${t('label.supplementHint')}</span></label>
      <input type="number" id="new-menu-opcion-suplemento" step="0.01" min="0" value="0">
    </div>
    <div class="modal-footer">
      <button class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-fino is-on" onclick="confirmAddMenuOpcion(${grupoId})">${t('common.add')}</button>
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

// Mismo criterio que en Carta (openPlatoModsModal): editar un extra ya
// creado en vez de tener que borrarlo y volver a escribirlo entero.
let menuOpcionModEditId = null;
function openMenuOpcionModsModal(grupoId, opcionId){
  menuOpcionModEditId = null;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  if(!g) return;
  const o = g.opciones.find(x=>x.id===opcionId);
  if(!o) return;
  if(!o.modificadores) o.modificadores = [];
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
  setTimeout(()=>document.getElementById('new-menu-mod-nombre')?.focus(), 50);
}
function renderMenuOpcionModsModalHtml(grupoId, opcionId){
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  const mods = o.modificadores || [];
  const editing = menuOpcionModEditId != null ? mods.find(m=>m.id===menuOpcionModEditId) : null;
  return `
    <div class="modal-header">
      <h3><i class="ti ti-adjustments"></i> ${t('title.extras')} "${escapeHtml(o.nombre)}"</h3>
      <button class="modal-close" onclick="closeModal();renderMenuGrupos()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('msg.extrasDescDish')}</p>
    <div id="menu-opcion-mods-list">
      ${mods.length ? mods.map(m => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(m.nombre)}</span>
          <span style="font-family:monospace;font-weight:600;margin-right:10px;color:var(--ink)">${m.precio ? '+'+fmtMoney(m.precio) : t('common.free')}</span>
          ${ggMenuAcciones([
            {icono:'ti-pencil', texto:t('common.edit'), fn:`startEditMenuOpcionMod(${grupoId},${opcionId},${m.id})`},
            {icono:'ti-trash', texto:t('common.delete'), fn:`removeMenuOpcionMod(${grupoId},${opcionId},${m.id})`, peligro:true}
          ])}
        </div>
      `).join('') : `<div class="empty" style="padding:10px">${t('empty.mods')}</div>`}
    </div>
    <div class="field-row" style="margin-top:10px">
      <input type="text" id="new-menu-mod-nombre" placeholder="${t('label.extraName')}" style="flex:1" value="${editing?escapeHtml(editing.nombre):''}">
      <input type="number" id="new-menu-mod-precio" placeholder="${t('common.price')}" step="0.01" min="0" style="width:90px" value="${editing?editing.precio:''}">
    </div>
    <div class="modal-footer">
      ${editing ? `<button class="btn" onclick="cancelEditMenuOpcionMod(${grupoId},${opcionId})">${t('common.cancel')}</button>` : ''}
      <button class="btn" onclick="closeModal();renderMenuGrupos()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="${editing?`saveEditMenuOpcionMod(${grupoId},${opcionId})`:`addMenuOpcionMod(${grupoId},${opcionId})`}"><i class="ti ${editing?'ti-check':'ti-plus'}"></i> ${editing?t('common.save'):t('btn.addExtra')}</button>
    </div>
  `;
}

function addMenuOpcionMod(grupoId, opcionId){
  const nombre = document.getElementById('new-menu-mod-nombre').value.trim();
  if(!nombre){ showToast(t('msg.extraNameRequired')); return; }
  const precio = parseFloat(document.getElementById('new-menu-mod-precio').value) || 0;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  if(!o.modificadores) o.modificadores = [];
  o.modificadores.push({id: genId(), nombre, precio});
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
  setTimeout(()=>document.getElementById('new-menu-mod-nombre')?.focus(), 50);
}
function startEditMenuOpcionMod(grupoId, opcionId, modId){
  menuOpcionModEditId = modId;
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
  setTimeout(()=>document.getElementById('new-menu-mod-nombre')?.focus(), 50);
}
function cancelEditMenuOpcionMod(grupoId, opcionId){
  menuOpcionModEditId = null;
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
}
function saveEditMenuOpcionMod(grupoId, opcionId){
  const nombre = document.getElementById('new-menu-mod-nombre').value.trim();
  if(!nombre){ showToast(t('msg.extraNameRequired')); return; }
  const precio = parseFloat(document.getElementById('new-menu-mod-precio').value) || 0;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  const m = (o.modificadores||[]).find(x=>x.id===menuOpcionModEditId);
  if(m) Object.assign(m, {nombre, precio});
  menuOpcionModEditId = null;
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
}

async function removeMenuOpcionMod(grupoId, opcionId, modId){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const g = menuEdit.grupos.find(x=>x.id===grupoId);
  const o = g.opciones.find(x=>x.id===opcionId);
  o.modificadores = (o.modificadores||[]).filter(m=>m.id!==modId);
  if(menuOpcionModEditId===modId) menuOpcionModEditId = null;
  openModal(renderMenuOpcionModsModalHtml(grupoId, opcionId));
}

