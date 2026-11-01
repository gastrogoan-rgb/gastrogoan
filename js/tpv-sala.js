/* ============================================================
   TPV (1/11) — pantalla de mesas rehecha desde cero
   Pensada para un servicio con volumen y para móvil y tablet primero:
   · una franja corta arriba (cifras + 3 botones + «más»), no cinco filas de botones;
   · las cartas y menús activos ya no ocupan dos recuadros: un botón que los enseña;
   · las mesas son FICHAS grandes de color (libre · tomando nota · en cocina · servida),
     con el tiempo, el total, las personas y quién la lleva, y se filtran con un toque
     (libres, ocupadas, servidas, mis mesas) o por número;
   · tocar una ficha abre la comanda (js/tpv.js: openTableOrder).
   Lo que NO cambia: las comandas, el cobro, el reparto, las cuentas.
   ============================================================ */

let tpvMesaFiltro = 'todas';   // 'todas' | 'libres' | 'ocupadas' | 'servidas' | 'mias'
let tpvMesaBusca = '';
let tpvZonaSel = '';           // '' = todas las zonas

function tpvEmpleadoSesion(){
  try{ const s = getAccessSession(); return s && s.type === 'employee' ? s.employeeId : null; }catch(e){ return null; }
}
function tpvNombreMesa(table, order){
  const baseName = table.zona ? (table.name || '').replace(/\s*\([^)]*\)\s*$/, '') : table.name;
  // Una mesa que absorbió otra al fusionarse se ve como «Mesa 3 + Mesa 4» en el propio plano (confirmMergeTable).
  return order && order.mergedTableNames && order.mergedTableNames.length ? `${baseName} + ${order.mergedTableNames.join(' + ')}` : baseName;
}
// Estado de una mesa para pintarla y filtrarla: libre · tomando · cocina · servida · ocupada.
function tpvEstadoMesa(table){
  const order = getOpenOrderForTable(table.id);
  if(!order) return {order: null, key: 'libre', phase: null};
  const phase = mesaPhase(order);
  const key = !phase ? 'servida' : phase.key === 'served' ? 'servida' : phase.key === 'preparing' || phase.key === 'kitchen' ? 'cocina' : phase.key === 'taking' ? 'tomando' : 'ocupada';
  return {order, key, phase};
}

/* ── La franja de arriba ──────────────────────────────────────────────── */
function renderTpvKpis(){
  const todaySalesArr = DB.sales.filter(s => s.date === todayStr());
  const todayTotal = todaySalesArr.reduce((sum, s) => sum + s.total, 0);
  const ticketCount = todaySalesArr.length;
  const avgTicket = ticketCount ? todayTotal / ticketCount : 0;
  const comandasEnCocina = DB.tpvOrders
    .filter(o => o.status !== 'pagada' && !o.cerrada)
    .reduce((s, o) => s + ((o.items || []).some(l => l.estado === 'cocina' || l.estado === 'preparando') ? 1 : 0), 0);
  return `
    <div class="tp-cifras" role="group" aria-label="${escapeHtml(gl({es:'Cifras de hoy', ca:'Xifres d\'avui', en:'Today\'s figures'}))}">
      <button type="button" class="tp-cifra is-ventas" onclick="openTodaySalesModal()" title="${escapeHtml(t('tpv.salesToday.clickHint'))}">
        <span class="tp-cifra-et">${escapeHtml(gl({es:'Ventas hoy', ca:'Vendes avui', en:'Sales today'}))}</span><b class="tp-cifra-v">${fmtMoney(todayTotal)}</b></button>
      <div class="tp-cifra is-sec"><span class="tp-cifra-et">${escapeHtml(gl({es:'Tickets', ca:'Tiquets', en:'Tickets'}))}</span><b class="tp-cifra-v">${ticketCount}</b></div>
      <div class="tp-cifra is-sec"><span class="tp-cifra-et">${escapeHtml(gl({es:'Ticket medio', ca:'Tiquet mitjà', en:'Avg ticket'}))}</span><b class="tp-cifra-v">${fmtMoney(avgTicket)}</b></div>
      <div class="tp-cifra${comandasEnCocina ? ' is-cocina' : ''}"><span class="tp-cifra-et"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(gl({es:'En cocina', ca:'A cuina', en:'In kitchen'}))}</span><b class="tp-cifra-v">${comandasEnCocina}</b></div>
    </div>`;
}

// «Cartas activas» ya no son dos recuadros con casillas que nadie podía tocar (seguían el horario solas):
// un botón dice cuántas hay y, al pulsarlo, se ven.
function tpvCartasChipHtml(){
  const activeCartas = getActiveCartas();
  const activeMenus = (typeof getActiveMenus === 'function' ? getActiveMenus() : []) || [];
  const totalPlatos = activeCartas.reduce((s, c) => s + (c.secciones || []).reduce((ss, sec) => ss + (sec.platos || []).length, 0), 0);
  const n = activeCartas.length + activeMenus.length;
  const sin = !activeCartas.length;
  return `<button type="button" class="btn btn-fino tp-chip-cartas${sin ? ' is-off' : ''}" onclick="openCartasActivasModal()" aria-haspopup="dialog">
    <i class="ti ti-book-2"></i> ${escapeHtml(gl({es:'Cartas', ca:'Cartes', en:'Menus'}))} <b>${n}</b>${sin ? ` <i class="ti ti-alert-triangle"></i>` : ''}</button>`;
}
function openCartasActivasModal(){
  const activeIds = DB.activeCartaIds || [];
  const activeMenuIds = DB.activeMenuIds || [];
  const fila = (nombre, activa, extra, ic) => `<li class="tp-ca-fila${activa ? ' is-on' : ''}"><i class="ti ${ic}"></i><span class="tp-ca-nom">${escapeHtml(nombre)}${extra ? ` <small>${extra}</small>` : ''}</span><span class="pm-et${activa ? ' is-ok' : ''}">${escapeHtml(activa ? gl({es:'Activa', ca:'Activa', en:'Active'}) : gl({es:'Fuera de horario', ca:'Fora d\'horari', en:'Off schedule'}))}</span></li>`;
  const totalPlatos = getActiveCartas().reduce((s, c) => s + (c.secciones || []).reduce((ss, sec) => ss + (sec.platos || []).length, 0), 0);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-book-2"></i> ${escapeHtml(t('label.activeCartas'))}</h3><button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    <p class="pr-ayuda"><i class="ti ti-clock"></i> ${escapeHtml(t('label.autoSwitchBySchedule'))}: ${escapeHtml(gl({es:'cada carta se activa sola según el horario que pusiste en Oferta.', ca:'cada carta s\'activa sola segons l\'horari que vas posar a Oferta.', en:'each menu switches on by itself following the schedule you set in Offer.'}))}</p>
    ${DB.cartas.length ? `<ul class="tp-ca-lista">${DB.cartas.map(c => fila(tItem(c), activeIds.includes(c.id), '', isBebidaCarta(c) ? 'ti-glass-cocktail' : 'ti-tools-kitchen-2')).join('')}</ul>` : `<div class="empty es-vacio"><i class="ti ti-book-2"></i>${escapeHtml(t('empty.noCartasCreated'))}</div>`}
    ${DB.menus.length ? `<div class="es-tit es-tit-2">${escapeHtml(t('label.activeMenus'))}</div><ul class="tp-ca-lista">${DB.menus.map(m => fila(tItem(m), activeMenuIds.includes(m.id), fmtMoney(m.precio), 'ti-list-details')).join('')}</ul>` : ''}
    <p class="pr-ayuda">${escapeHtml(totalPlatos === 1 ? t('label.oneDishAvailable') : totalPlatos + ' ' + t('label.dishesAvailable'))}${getActiveCartas().length ? '' : ' · ' + escapeHtml(t('label.selectAtLeastOneCarta'))}</p>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${escapeHtml(t('common.close'))}</button><button class="btn btn-primary" onclick="closeModal();navigate('carta')"><i class="ti ti-edit"></i> ${escapeHtml(gl({es:'Ir a Oferta', ca:'Anar a Oferta', en:'Go to Offer'}))}</button></div>`);
}

// La barra: cifras, y debajo los pocos botones que se usan en servicio. El resto, en «Más».
function tpvBarraHtml(){
  const esperando = (DB.waitlist || []).filter(w => w.status === 'esperando').length;
  const cajon = (DB.business && DB.business.cashDrawerOnSale && typeof thermalPrintingSupported === 'function' && getPrintMode('ticket') === 'bluetooth');
  const larg = (largo, corto) => `<span class="tp-largo">${escapeHtml(largo)}</span><span class="tp-corto">${escapeHtml(corto)}</span>`;
  return `
    <div class="tp-cab">
    ${renderTpvKpis()}
    <div class="tp-acciones">
      ${tpvCartasChipHtml()}
      <button type="button" class="btn btn-fino${esperando ? ' is-on' : ''}" onclick="openWaitlistModal()"><i class="ti ti-users-group"></i> ${larg(t('waitlist.btn'), gl({es:'Espera', ca:'Espera', en:'Waitlist'}))}${esperando ? ` <b>${esperando}</b>` : ''}</button>
      <button type="button" class="btn btn-fino tp-caja" id="tpv-close-cash-btn" onclick="openCashClosureModal()"><i class="ti ti-cash-register"></i> ${larg(t('btn.cashClose'), gl({es:'Caja', ca:'Caixa', en:'Cash'}))}</button>
    </div>
    <div class="tp-acciones tp-acciones-sec">
      <button type="button" class="btn btn-sm btn-fino" onclick="openVoidLogModal()"><i class="ti ti-alert-triangle"></i> ${larg(t('title.voidLog'), gl({es:'Anulaciones', ca:'Anul·lacions', en:'Voids'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="openMarkDishOutModal()"><i class="ti ti-flame-off"></i> ${larg(t('btn.markDishOut'), gl({es:'Agotado', ca:'Esgotat', en:'Sold out'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="openCashClosureHistory()"><i class="ti ti-history"></i> ${larg(t('title.cashHistory'), gl({es:'Arqueos', ca:'Arqueigs', en:'Closures'}))}</button>
      ${cajon ? `<button type="button" class="btn btn-sm btn-fino" onclick="openCashDrawerManually()"><i class="ti ti-cash"></i> ${larg(t('drawer.openBtn'), gl({es:'Cajón', ca:'Calaix', en:'Drawer'}))}</button>` : ''}
    </div>
    </div>`;
}

function renderTPV(){
  markTpvSeen();
  migrateCartas();
  const box = document.getElementById('tpv-content');
  const tiposServicio = (DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true};
  box.innerHTML = `
    ${tpvBarraHtml()}
    ${renderLastCallBanner()}
    ${renderQrMesaPendientes()}
    <div id="tpv-mesas-section">${renderTpvMesas(tiposServicio)}</div>
    <div id="tpv-togo-section">${renderTpvToGo(tiposServicio)}</div>
  `;
}

// Pedidos llegados por la carta QR de una mesa que esperan a que sala los acepte (si el negocio no los manda
// directo a cocina). Arriba del todo: el comensal está esperando, no puede quedar escondido en una pestaña.
function renderQrMesaPendientes(){
  const lista = (typeof pedidosMesaQrPendientes === 'function') ? pedidosMesaQrPendientes() : [];
  if(!lista.length) return '';
  return `
    <section class="tp-aviso-sec">
      <h3 class="es-tit"><i class="ti ti-qrcode"></i> ${escapeHtml(t('qrMesa.tpv.titulo'))} <span class="dp-cuenta">${lista.length}</span></h3>
      <div class="pr-grid pm-grid" id="tpv-qr-mesa-pendientes">
        ${lista.map(p => `
          <article class="pm-card" style="border-color:var(--ink)">
            <div class="pm-card-cab"><span class="pm-card-tit is-texto"><i class="ti ti-armchair"></i> ${escapeHtml(p.mesaNombre || '')}</span><span class="pm-et is-dto">${escapeHtml(t('badge.newF'))}</span></div>
            ${p.clienteNombre ? `<p class="pm-desc">${escapeHtml(p.clienteNombre)}</p>` : ''}
            <ul class="tp-mini">${(p.items || []).map(l => `<li><b>${l.qty}×</b> ${escapeHtml(l.name)}</li>`).join('')}</ul>
            ${p.notas ? `<p class="pm-desc"><i class="ti ti-note"></i> ${escapeHtml(p.notas)}</p>` : ''}
            ${p.preciosCorregidos ? `<p class="pm-desc"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('qrMesa.tpv.preciosCorregidos'))}</p>` : ''}
            <div class="tp-total-grande">${fmtMoney((p.items || []).reduce((s, l) => s + l.price * l.qty, 0))}</div>
            <div class="pm-card-pie">
              <button class="btn btn-sm btn-fino is-on" onclick="aceptarPedidoMesaQr(${JSON.stringify(p.id)})"><i class="ti ti-check"></i> ${escapeHtml(t('qrMesa.tpv.aceptar'))}</button>
              <button class="btn btn-sm btn-fino is-off" onclick="rechazarPedidoMesaQr(${JSON.stringify(p.id)})"><i class="ti ti-x"></i> ${escapeHtml(t('common.reject'))}</button>
            </div>
          </article>`).join('')}
      </div>
    </section>`;
}

/* ── Las mesas ────────────────────────────────────────────────────────── */
let chaosMode = false;
function toggleChaosMode(){ chaosMode = !chaosMode; renderTPV(); }
function setTpvMesaFiltro(f){ tpvMesaFiltro = f; renderTpvMesasZona(); }
function setTpvZona(z){ tpvZonaSel = z; renderTpvMesasZona(); }
function setTpvMesaBusca(v){
  tpvMesaBusca = v;
  const zona = document.getElementById('tpv-mesas-tiles');
  if(zona){ zona.innerHTML = tpvMesasTilesHtml(); return; }
  renderTpvMesasZona();
}
function renderTpvMesasZona(){
  const sec = document.getElementById('tpv-mesas-section');
  if(sec) sec.innerHTML = renderTpvMesas((DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true});
}

function mesaPasaFiltro(table, est){
  const f = tpvMesaFiltro;
  if(f === 'libres' && est.key !== 'libre') return false;
  if(f === 'ocupadas' && est.key === 'libre') return false;
  if(f === 'servidas' && est.key !== 'servida') return false;
  if(f === 'mias'){ const yo = tpvEmpleadoSesion(); if(!est.order || !(yo ? est.order.camareroId === yo : est.order.openedByOwner || !est.order.camareroId)) return false; }
  if(tpvZonaSel && table.zona !== tpvZonaSel) return false;
  const q = pmSinTildes(tpvMesaBusca.trim());
  if(q && !pmSinTildes(tpvNombreMesa(table, est.order)).includes(q)) return false;
  return true;
}

function renderMesaCard(table){
  const est = tpvEstadoMesa(table);
  const order = est.order, phase = est.phase;
  const total = order ? orderTotal(order) : 0;
  const hayNuevos = order && (order.items || []).some(l => l.nuevo);
  const nombre = tpvNombreMesa(table, order);
  const mins = order && order.createdAt ? minutesSince(order.createdAt) : null;
  const claseTiempo = mins === null ? '' : mins >= 120 ? ' is-urgente' : mins >= 60 ? ' is-aviso' : '';
  const upcomingRes = !order ? getUpcomingReservationForTable(table.id) : null;
  const upcomingResClient = upcomingRes ? (DB.clients.find(c => c.id === upcomingRes.clientId)?.name || upcomingRes.clientName || '') : '';
  // «Mesa fría»: todo servido y lleva un rato sin que nadie la cobre ni la revise (suele ser un olvido).
  const MESA_FRIA_MIN = 15;
  let mesaFria = false;
  if(order && phase && phase.key === 'served'){
    const t0 = (order.items || []).filter(l => !l.bebida && l.entregadoAt).map(l => new Date(l.entregadoAt).getTime());
    if(t0.length) mesaFria = (Date.now() - Math.max(...t0)) / 60000 >= MESA_FRIA_MIN;
  }
  const parpadeo = (chaosMode && mins !== null && mins >= 90) ? ' mesa-blink-urgent' : '';
  const nQr = (typeof pedidosMesaQrPendientes === 'function') ? pedidosMesaQrPendientes(table.id).length : 0;
  const incid = order && incidenciaAbierta(order);
  const avisos = [
    nQr ? `<span class="tp-av is-qr" title="${escapeHtml(t('qrMesa.tpv.titulo'))}"><i class="ti ti-qrcode"></i>${nQr}</span>` : '',
    incid ? `<span class="tp-av is-inc${incidenciaSinLeer(order, 'sala') ? ' nuevo' : ''}" title="${escapeHtml(gl({es:'Incidencia en cocina', ca:'Incidència a cuina', en:'Kitchen incident'}))}"><i class="ti ti-alert-triangle"></i></span>` : '',
    hayNuevos ? `<span class="tp-av is-nuevo" title="${escapeHtml(t('label.newItemsFromClient'))}"><i class="ti ti-bell-ringing"></i></span>` : '',
    mesaFria ? `<span class="tp-av is-fria" title="${escapeHtml(t('tpv.mesaFria.hint'))}"><i class="ti ti-snowflake"></i></span>` : '',
    order && order.pagado ? `<span class="tp-av is-pago" title="${escapeHtml(t('label.paidOnline'))}"><i class="ti ti-credit-card"></i></span>` : '',
  ].join('');
  const camarero = order ? mesaWaiterChipHtml(order.camareroId, order.openedByOwner) : '';
  const estadoTxt = order ? (phase ? phase.label : t('status.occupied')) : t('status.free');
  const estadoIc = order ? (phase ? phase.icon : 'ti-users') : 'ti-door-enter';
  const aria = `${nombre}, ${estadoTxt}${order ? ', ' + fmtMoney(total) : ''}${order && order.pax ? ', ' + order.pax + ' ' + t('common.persAbbr') : ''}${mins !== null ? ', ' + mins + ' min' : ''}`;
  return `
  <button type="button" class="tp-mesa is-${est.key}${upcomingRes ? ' es-reservada' : ''}${mesaFria ? ' es-fria' : ''}${parpadeo}" data-mesa="${table.id}" onclick="openTableOrder(${table.id})" aria-label="${escapeHtml(aria)}">
    <span class="tp-mesa-top">
      <b class="tp-mesa-nombre">${escapeHtml(nombre)}</b>
      ${mins !== null ? `<span class="tp-mesa-tiempo${claseTiempo}" title="${escapeHtml(t('label.timeOpen'))}"><i class="ti ti-clock"></i> ${mins}'</span>` : ''}
    </span>
    <span class="tp-mesa-estado"><i class="ti ${estadoIc}"></i> ${escapeHtml(estadoTxt)}</span>
    ${order
      ? `<span class="tp-mesa-total">${fmtMoney(total)}</span>
         <span class="tp-mesa-pie">${order.pax ? `<span class="tp-mesa-pax"><i class="ti ti-users"></i> ${order.pax}</span>` : ''}${camarero}${avisos ? `<span class="tp-avisos">${avisos}</span>` : ''}</span>`
      : `<span class="tp-mesa-libre">${table.plazas ? `<i class="ti ti-users"></i> ${table.plazas} ${escapeHtml(t('common.persAbbr'))}` : '&nbsp;'}</span>
         ${upcomingRes ? `<span class="tp-mesa-reserva" title="${escapeHtml(upcomingResClient)}"><i class="ti ti-calendar-event"></i> ${escapeHtml(upcomingRes.time || '')}${upcomingResClient ? ' · ' + escapeHtml(upcomingResClient.split(' ')[0]) : ''}</span>` : ''}
         ${avisos ? `<span class="tp-avisos">${avisos}</span>` : ''}`}
  </button>`;
}

// Las fichas de las mesas que pasan el filtro, por zona (o todas por tiempo en el «modo caos»).
function tpvMesasTilesHtml(){
  const sorted = [...DB.tables].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', {numeric: true}));
  const lista = sorted.map(table => ({table, est: tpvEstadoMesa(table)})).filter(x => mesaPasaFiltro(x.table, x.est));
  if(!lista.length){
    return `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(tpvMesaFiltro === 'mias' ? gl({es:'No tienes ninguna mesa abierta.', ca:'No tens cap taula oberta.', en:'You have no open tables.'}) : t('common.noResults'))}</div>`;
  }
  // Modo caos: una sola lista con las ocupadas, la que más lleva esperando primero.
  if(chaosMode){
    const ocupadas = lista.filter(x => x.est.order).sort((a, b) => new Date(a.est.order.createdAt) - new Date(b.est.order.createdAt));
    if(!ocupadas.length) return `<div class="empty es-vacio"><i class="ti ti-mood-smile"></i>${escapeHtml(t('tpv.chaos.empty'))}</div>`;
    return `<div class="tp-grid">${ocupadas.map(x => renderMesaCard(x.table)).join('')}</div>`;
  }
  const hasZonas = lista.some(x => x.table.zona);
  if(!hasZonas) return `<div class="tp-grid">${lista.map(x => renderMesaCard(x.table)).join('')}</div>`;
  const zonas = getZonaOrder();
  let html = '';
  zonas.forEach(z => {
    const mesas = lista.filter(x => x.table.zona === z);
    if(!mesas.length) return;
    const todasZona = DB.tables.filter(x => x.zona === z);
    const ocup = todasZona.filter(x => getOpenOrderForTable(x.id)).length;
    html += `<section class="tp-zona"><h3 class="tp-zona-tit"><i class="ti ${zonaIconClass(z)}"></i> ${escapeHtml(zonaLabel(z))} <span class="dp-cuenta" title="${escapeHtml(gl({es:'ocupadas / mesas', ca:'ocupades / taules', en:'occupied / tables'}))}">${ocup}/${todasZona.length}</span></h3>
      <div class="tp-grid">${mesas.map(x => renderMesaCard(x.table)).join('')}</div></section>`;
  });
  const sinZona = lista.filter(x => !x.table.zona);
  if(sinZona.length){
    html += `<section class="tp-zona"><h3 class="tp-zona-tit"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(gl({es:'Otras mesas', ca:'Altres taules', en:'Other tables'}))}</h3><div class="tp-grid">${sinZona.map(x => renderMesaCard(x.table)).join('')}</div></section>`;
  }
  return html;
}

function renderTpvMesas(tiposServicio){
  if(!tiposServicio.mesa) return '';
  if(!DB.tables.length){
    return `<h3 class="tp-sec-tit"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(t('label.tables'))}</h3><div class="empty es-vacio"><i class="ti ti-armchair"></i>${escapeHtml(t('empty.tables'))}</div>`;
  }
  const estados = DB.tables.map(table => tpvEstadoMesa(table));
  const cuenta = f => estados.filter((e, i) => {
    if(f === 'todas') return true;
    if(f === 'libres') return e.key === 'libre';
    if(f === 'ocupadas') return e.key !== 'libre';
    if(f === 'servidas') return e.key === 'servida';
    if(f === 'mias'){ const yo = tpvEmpleadoSesion(); return !!(e.order && (yo ? e.order.camareroId === yo : (e.order.openedByOwner || !e.order.camareroId))); }
    return false;
  }).length;
  const filtros = [['todas', gl({es:'Todas', ca:'Totes', en:'All'}), ''], ['libres', gl({es:'Libres', ca:'Lliures', en:'Free'}), ''], ['ocupadas', gl({es:'Ocupadas', ca:'Ocupades', en:'Occupied'}), gl({es:'Ocup.', ca:'Ocup.', en:'Busy'})], ['servidas', gl({es:'Servidas', ca:'Servides', en:'Served'}), gl({es:'Serv.', ca:'Serv.', en:'Served'})], ['mias', gl({es:'Mis mesas', ca:'Les meves taules', en:'My tables'}), gl({es:'Mías', ca:'Meves', en:'Mine'})]];
  const zonas = getZonaOrder().filter(z => DB.tables.some(x => x.zona === z));
  const zonaBtns = zonas.length > 1 && !chaosMode ? `<span class="tp-sep" aria-hidden="true"></span>
        <button type="button" class="btn btn-sm btn-fino tp-zona-todas${!tpvZonaSel ? ' is-on' : ''}" aria-pressed="${!tpvZonaSel}" onclick="setTpvZona('')">${escapeHtml(gl({es:'Todas las zonas', ca:'Totes les zones', en:'All zones'}))}</button>
        ${zonas.map(z => `<button type="button" class="btn btn-sm btn-fino${tpvZonaSel === z ? ' is-on' : ''}" aria-pressed="${tpvZonaSel === z}" onclick="setTpvZona(tpvZonaSel === '${escapeJsAttr(z)}' ? '' : '${escapeJsAttr(z)}')"><i class="ti ${zonaIconClass(z)}"></i> ${escapeHtml(zonaLabel(z))}</button>`).join('')}` : '';
  return `
    <div class="tp-mesas-barra">
      <div class="cl-chips tp-filtros" role="group" aria-label="${escapeHtml(gl({es:'Filtrar mesas', ca:'Filtrar taules', en:'Filter tables'}))}">
        ${filtros.map(([k, et, corto]) => `<button type="button" class="btn btn-sm btn-fino${tpvMesaFiltro === k ? ' is-on' : ''}" aria-pressed="${tpvMesaFiltro === k}" aria-label="${escapeHtml(et)}" onclick="setTpvMesaFiltro('${k}')">${corto ? `<span class="tp-largo">${escapeHtml(et)}</span><span class="tp-corto">${escapeHtml(corto)}</span>` : escapeHtml(et)} <b>${cuenta(k)}</b></button>`).join('')}
        ${zonaBtns}
      </div>
      <div class="tp-mesas-herr">
        <input type="search" class="search-input tp-buscar" id="tpv-mesa-busca" inputmode="search" value="${escapeHtml(tpvMesaBusca)}" placeholder="${escapeHtml(gl({es:'Ir a mesa…', ca:'Anar a taula…', en:'Go to table…'}))}" aria-label="${escapeHtml(gl({es:'Buscar mesa', ca:'Cercar taula', en:'Find table'}))}" oninput="setTpvMesaBusca(this.value)">
        <button type="button" class="btn btn-fino${chaosMode ? ' is-off' : ''}" aria-pressed="${chaosMode}" onclick="toggleChaosMode()" title="${escapeHtml(t('tpv.chaos.hint'))}"><i class="ti ti-flame"></i> ${escapeHtml(t('tpv.chaos.btn'))}</button>
      </div>
    </div>
    <div id="tpv-mesas-tiles">${tpvMesasTilesHtml()}</div>`;
}

/* ============================================================
   TPV (1/11) — TOMAR NOTA rehecho
   La comanda ya no es una lista de botoncitos al lado de una carta de botoncitos:
   · la carta son fichas GRANDES (carpetas y platos) con el precio, y cada plato dice
     cuántos lleva ya la mesa (×2) con su «−» al lado: de un vistazo se ve lo pedido
     sin cambiar de pantalla;
   · hay un buscador de platos para no abrir carpeta por carpeta con la sala llena;
   · la comanda (a la derecha en tablet y PC) tiene cada línea con SU cantidad
     (−  2  +), su nombre completo, su estado y su precio; en móvil queda una barra
     abajo con el total que la abre;
   · cabecera corta: mesa, personas y camarero; lo demás, en «⋯».
   Misma lógica de siempre: marchar, vales, menús, alérgenos, cobro.
   ============================================================ */

let tpvPlatoBusca = '';

function tpvCantidadPlato(order, platoId){
  return (order.items || []).filter(l => l.platoId === platoId && !l.menuId).reduce((s, l) => s + l.qty, 0);
}
function tpvCantidadSeccion(order, sec){
  return (order.items || []).filter(l => !l.menuId && (l.tanda || '') === (sec.nombre || '')).reduce((s, l) => s + l.qty, 0);
}
// «−» desde la ficha del plato: quita una unidad de la línea que aún no se ha marchado (o de la última).
function tpvQuitarUno(orderId, platoId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || esPedidoSoloLectura(order)) return;
  const idxs = (order.items || []).map((l, i) => i).filter(i => order.items[i].platoId === platoId && !order.items[i].menuId);
  if(!idxs.length) return;
  const sinMarchar = idxs.filter(i => order.items[i].qty > (order.items[i].marchada || 0));
  changeOrderItemQty(orderId, (sinMarchar.length ? sinMarchar : idxs).slice(-1)[0], -1);
}
function tpvBuscarPlato(v, orderId){
  tpvPlatoBusca = v;
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const carta = order && getActiveCartas().find(c => c.id === tpvSelectedCartaId);
  const caja = document.getElementById('tp-selector-zona');
  if(order && carta && caja){ caja.innerHTML = tpvCartaZonaHtml(order, carta); return; }
  renderTableOrderModal(orderId);
}

function tpvPlatoHtml(order, sec, p, conSeccion){
  const n = tpvCantidadPlato(order, p.id);
  return `
    <div class="tp-plato${n ? ' tiene' : ''}">
      <button type="button" class="tp-plato-main" onclick="addOrderItem(${order.id}, ${sec.id}, ${p.id})" aria-label="${escapeHtml(tItem(p))} ${fmtMoney(platoPriceForOrder(p, order))}${n ? ', ' + n : ''}">
        ${conSeccion ? `<span class="tp-plato-sec">${escapeHtml(tItem(sec))}</span>` : ''}
        <span class="tp-plato-nom">${escapeHtml(tItem(p))}</span>
        <span class="tp-plato-pre">${fmtMoney(platoPriceForOrder(p, order))}</span>
        ${n ? `<span class="tp-plato-n" aria-hidden="true">×${n}</span>` : ''}
      </button>
      <span class="tp-plato-acc">
        ${n ? `<button type="button" class="tp-plato-menos" aria-label="${escapeHtml(gl({es:'Quitar uno', ca:'Treure\'n un', en:'Remove one'}))}" onclick="event.stopPropagation();tpvQuitarUno(${order.id}, ${p.id})"><i class="ti ti-minus"></i></button>` : ''}
        <button type="button" class="tp-plato-info" aria-label="${escapeHtml(t('label.dishInfo'))}" title="${escapeHtml(t('label.dishInfo'))}" onclick="event.stopPropagation();openDishInfoModal(${p.recipeId ? p.recipeId : 'null'}, '${escapeJsAttr(tItem(p))}', '${escapeJsAttr(p.alergenos || '')}', 'renderTableOrderModal(${order.id})')"><i class="ti ti-info-circle"></i></button>
      </span>
    </div>`;
}

// La zona de la carta: buscador + (carpetas | platos de la carpeta abierta | resultados de la búsqueda).
function tpvCartaZonaHtml(order, carta){
  const secciones = (carta.secciones || []).filter(sec => (sec.platos || []).some(p => p.disponible !== false));
  if(!secciones.length) return `<div class="empty es-vacio"><i class="ti ti-tools-kitchen-2"></i>${escapeHtml(t('empty.noDishesInCarta'))}</div>`;
  const q = pmSinTildes(tpvPlatoBusca.trim());
  if(q){
    const hallados = [];
    secciones.forEach(sec => (sec.platos || []).filter(p => p.disponible !== false && pmSinTildes(tItem(p)).includes(q)).forEach(p => hallados.push([sec, p])));
    return hallados.length
      ? `<div class="tp-platos">${hallados.map(([sec, p]) => tpvPlatoHtml(order, sec, p, true)).join('')}</div>`
      : `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`;
  }
  const abierta = tpvSelectedSeccionId != null ? secciones.find(s => s.id === tpvSelectedSeccionId) : null;
  if(abierta){
    const platos = (abierta.platos || []).filter(p => p.disponible !== false);
    return `
      <div class="tp-sec-cab">
        <button type="button" class="btn btn-sm btn-fino" onclick="tpvSelectedSeccionId=null;renderTableOrderModal(${order.id})"><i class="ti ti-arrow-left"></i> ${escapeHtml(t('common.sections'))}</button>
        <h4 class="tp-sec-nombre">${iconoSeccionHtml(abierta.icono, abierta.nombre, 22)} ${escapeHtml(tItem(abierta))}</h4>
      </div>
      <div class="tp-platos">${platos.map(p => tpvPlatoHtml(order, abierta, p, false)).join('')}</div>`;
  }
  return `
    <div class="tp-secciones">
      ${secciones.map(sec => {
        const platos = (sec.platos || []).filter(p => p.disponible !== false);
        const n = tpvCantidadSeccion(order, sec);
        return `
        <button type="button" class="tp-seccion${n ? ' tiene' : ''}" onclick="tpvSelectedSeccionId=${sec.id};renderTableOrderModal(${order.id})">
          ${n ? `<span class="tp-seccion-n" title="${escapeHtml(gl({es:'ya en la comanda', ca:'ja a la comanda', en:'already on the order'}))}">${n}</span>` : ''}
          <span class="tp-seccion-ico">${iconoSeccionHtml(sec.icono, sec.nombre, 30)}</span>
          <span class="tp-seccion-nom">${escapeHtml(tItem(sec))}</span>
          <span class="tp-seccion-cuenta">${platos.length} ${platos.length === 1 ? t('noun.product') : t('noun.products')}</span>
        </button>`;
      }).join('')}
    </div>`;
}
function renderCartaSelectorInline(order, carta){
  const hayAlgo = (carta.secciones || []).some(sec => (sec.platos || []).some(p => p.disponible !== false));
  return `
    ${hayAlgo ? `<div class="tp-buscar-caja"><i class="ti ti-search"></i><input type="search" id="tp-plato-busca" class="tp-plato-busca" inputmode="search" autocomplete="off" value="${escapeHtml(tpvPlatoBusca)}" placeholder="${escapeHtml(gl({es:'Buscar un plato o bebida…', ca:'Cercar un plat o beguda…', en:'Find a dish or drink…'}))}" aria-label="${escapeHtml(gl({es:'Buscar un plato o bebida', ca:'Cercar un plat o beguda', en:'Find a dish or drink'}))}" oninput="tpvBuscarPlato(this.value, ${order.id})"></div>` : ''}
    <div id="tp-selector-zona">${tpvCartaZonaHtml(order, carta)}</div>`;
}

// Selector de menú (combo con grupos y opciones).
function renderMenuSelectorInline(order, menu){
  return `
    <div class="tp-menu-ficha">
      <div class="tp-menu-nom"><i class="ti ti-list-details"></i> <b>${escapeHtml(tItem(menu))}</b></div>
      <div class="tp-menu-pre">${fmtMoney(menu.precio)}</div>
      <button type="button" class="btn btn-fino is-on tp-menu-add" onclick="openMenuConfigModal(${order.id}, ${menu.id})"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.addToOrderNamed').replace('${name}', tItem(menu)))}</button>
    </div>`;
}

// Las insignias de una línea (promoción, pagado online, precio cambiado, plato que ya no está).
function tpvLineaInsigniasHtml(line){
  return `${line.promoId ? ` <span class="badge badge-green txt-xs"><i class="ti ti-discount-2"></i> -${line.promoPct}%</span>` : ''}${line.pagadoOnline ? ` <span class="badge badge-green txt-xs" title="${escapeHtml((line.pagadorNombre ? t('label.paidOnlineByHint').replace('${name}', line.pagadorNombre) : t('label.paidOnline')))}"><i class="ti ti-credit-card"></i></span>` : line.pagoOnlinePendiente ? ` <span class="badge badge-amber txt-xs" title="${escapeHtml(t('label.paymentPending'))}"><i class="ti ti-clock-exclamation"></i></span>` : ''}${line.priceMismatch ? ` <i class="ti ti-alert-triangle" style="color:var(--ink)" title="${escapeHtml(t('msg.priceChangedSinceOrder'))}"></i>` : ''}${line.unavailableNow ? ` <i class="ti ti-alert-circle" style="color:var(--red)" title="${escapeHtml(t('msg.dishNoLongerInCarta'))}"></i>` : ''}`;
}

// Una tanda (un «tiempo» de la comida): su cabecera con el estado y «Marchar», y sus líneas.
function renderTandaGroupCard(order, g, isMenu, ocultarNombreMenuEnCabecera){
  const pendingCount = orderPendingKitchenLines(order, g.tanda, isMenu).reduce((s, l) => s + l.qty, 0);
  const allInGroup = g.items;
  const allFired = allInGroup.every(({line}) => line.estado && line.qty <= (line.marchada || 0));
  // Las bebidas no pasan por cocina: si la tanda es solo de bebidas, el único control vive en la cabecera
  // (un botón que avanza todas a la vez) y cada línea queda con una insignia de solo lectura.
  const foodInGroup = allInGroup.filter(({line}) => !line.bebida);
  const bebidaInGroup = allInGroup.filter(({line}) => line.bebida);
  const isPureBebidaGroup = bebidaInGroup.length > 0 && foodInGroup.length === 0;
  // «Listo para recoger» (cocina terminó) y «Recogido» (sala se lo ha llevado) son cosas distintas y las decide gente distinta.
  const listos = foodInGroup.filter(({line}) => line.estado === 'entregado');
  const porRecoger = listos.filter(({line}) => !line.recogidoAt);
  const allPicked = foodInGroup.length > 0 && listos.length === foodInGroup.length && !porRecoger.length;
  const esq = escapeJsAttr(g.tanda || '');
  const bt = (clase, fn, txt, ic) => `<button type="button" class="btn btn-sm tp-tanda-bt ${clase}" onclick="${fn}"><i class="ti ${ic}"></i> ${txt}</button>`;
  let statusBadge = '';
  if(isPureBebidaGroup){
    const hasCocina = bebidaInGroup.some(({line}) => line.estado === 'cocina');
    const hasPreparando = bebidaInGroup.some(({line}) => line.estado === 'preparando');
    const allServed = bebidaInGroup.every(({line}) => line.estado === 'entregado');
    if(allServed) statusBadge = `<span class="badge badge-green txt-xs"><i class="ti ti-check"></i> ${t('kitchen.delivered')}</span>`;
    else if(hasCocina) statusBadge = bt('is-lim', `cycleGroupEstado(${order.id}, '${esq}')`, escapeHtml(t('kitchen.waiting')), 'ti-clock');
    else if(hasPreparando) statusBadge = bt('', `cycleGroupEstado(${order.id}, '${esq}')`, escapeHtml(t('kitchen.preparing')), 'ti-flame');
  }else{
    if(allPicked) statusBadge = `<span class="badge badge-green txt-xs"><i class="ti ti-check"></i> ${t('tpv.pickedUp')}</span>`;
    // Aquí es donde SALA da el último toque: cocina ya lo ha dejado servido y es sala quien confirma que se lo han llevado.
    else if(listos.length) statusBadge = esPedidoSoloLectura(order)
      ? `<span class="badge badge-green txt-xs"><i class="ti ti-tools-kitchen-2"></i> ${t('tpv.readyToPickup')}</span>`
      : bt('btn-primary', `marcarTandaRecogidaDesdeSala(${order.id}, '${esq}')`, escapeHtml(t('tpv.markPickedUp')), 'ti-truck-delivery');
    else if(foodInGroup.some(({line}) => line.estado === 'preparando')) statusBadge = `<span class="badge badge-blue txt-xs"><i class="ti ti-flame"></i> ${t('kitchen.preparing')}</span>`;
    else if(allFired) statusBadge = `<span class="badge badge-amber txt-xs"><i class="ti ti-clock"></i> ${t('tpv.fired')}</span>`;
  }
  // Si TODA la tanda es del mismo menú, se dice una vez en la cabecera en vez de repetirlo debajo de cada plato.
  const nombresMenuEnGrupo = isMenu ? [...new Set(g.items.map(({line}) => { const m = line.menuId ? (DB.menus || []).find(x => x.id === line.menuId) : null; return m ? tItem(m) : null; }).filter(Boolean))] : [];
  const nombreMenuUnico = nombresMenuEnGrupo.length === 1 ? nombresMenuEnGrupo[0] : null;
  const soloLectura = esPedidoSoloLectura(order);

  const filas = allInGroup.map(({line, idx}) => {
    let lineStatus = '';
    if(line.bebida && line.estado){
      if(line.estado === 'entregado') lineStatus = ' <span class="badge badge-green txt-xs"><i class="ti ti-check"></i></span>';
      else if(line.estado === 'preparando') lineStatus = ' <span class="badge badge-blue txt-xs"><i class="ti ti-flame"></i></span>';
      else if(line.estado === 'cocina') lineStatus = ' <span class="badge badge-amber txt-xs"><i class="ti ti-clock"></i></span>';
    }else{
      if(line.estado === 'entregado' && line.recogidoAt) lineStatus = ` <span class="badge badge-green txt-xs" title="${escapeHtml(t('tpv.pickedUp'))}"><i class="ti ti-check"></i></span>`;
      else if(line.estado === 'entregado') lineStatus = ` <span class="badge badge-green txt-xs" title="${escapeHtml(t('tpv.readyToPickup'))}"><i class="ti ti-bell-ringing"></i></span>`;
      else if(line.estado === 'preparando') lineStatus = ' <span class="badge badge-blue txt-xs"><i class="ti ti-flame"></i></span>';
      else if(line.estado === 'cocina') lineStatus = ' <span class="badge badge-amber txt-xs"><i class="ti ti-clock"></i></span>';
    }
    const menu = line.menuId ? (DB.menus || []).find(m => m.id === line.menuId) : null;
    const menuBadge = (menu && !nombreMenuUnico) ? ` <span class="badge badge-blue txt-xs"><i class="ti ti-list-details"></i> ${escapeHtml(tItem(menu))}</span>` : '';
    const esNotaAutoDeMenu = menu && line.notas === `Menú: ${tItem(menu)}`;
    const nota = (!line.notas || (esNotaAutoDeMenu && nombreMenuUnico)) ? '' : `<small class="tp-linea-nota"><i class="ti ti-note"></i> ${escapeHtml(line.notas)}</small>`;
    const pendiente = line.qty > (line.marchada || 0);
    return `
    <div class="tp-linea${pendiente ? '' : ' marchada'}">
      <div class="tp-linea-cant">
        ${soloLectura ? `<b>${line.qty}×</b>` : `
        <button type="button" class="tp-q" aria-label="${escapeHtml(gl({es:'Quitar uno', ca:'Treure\'n un', en:'Remove one'}))}" onclick="changeOrderItemQty(${order.id}, ${idx}, -1)"><i class="ti ti-minus"></i></button>
        <b class="tp-q-n" aria-label="${escapeHtml(gl({es:'Cantidad', ca:'Quantitat', en:'Quantity'}))}">${line.qty}</b>
        <button type="button" class="tp-q" aria-label="${escapeHtml(gl({es:'Añadir uno', ca:'Afegir-ne un', en:'Add one'}))}" onclick="changeOrderItemQty(${order.id}, ${idx}, 1)"><i class="ti ti-plus"></i></button>`}
      </div>
      <div class="tp-linea-txt"><span class="tp-linea-nom">${escapeHtml(line.name)}</span>${lineStatus}${menuBadge}${tpvLineaInsigniasHtml(line)}${nota}</div>
      <div class="tp-linea-pre">${fmtMoney(line.price * line.qty)}</div>
      ${soloLectura ? '' : `<div class="tp-linea-acc">
        <button type="button" class="tp-ac" onclick="openLineNotesModal(${order.id}, ${idx})" aria-label="${escapeHtml(t('common.notes'))}" data-tip="${escapeHtml(t('common.notes'))}"><i class="ti ti-note"></i></button>
        ${pendiente ? `<button type="button" class="tp-ac is-marchar" onclick="marcharLine(${order.id}, ${idx})" aria-label="${escapeHtml(t('title.sendDishToKitchen'))}" data-tip="${escapeHtml(t('title.sendDishToKitchen'))}"><i class="ti ti-chef-hat"></i></button>` : ''}
        ${line.estado === 'entregado' ? '' : `<button type="button" class="tp-ac is-quitar" onclick="removeOrderItem(${order.id}, ${idx})" aria-label="${escapeHtml(t('common.delete'))}" data-tip="${escapeHtml(t('common.delete'))}"><i class="ti ti-x"></i></button>`}
      </div>`}
    </div>`;
  }).join('');

  return `
  <section class="tp-tanda">
    <header class="tp-tanda-cab">
      <div class="tp-tanda-nom"><i class="ti ti-chevrons-right"></i> ${g.tanda ? escapeHtml(g.tanda) : escapeHtml(t('label.noCategory'))}
        ${(nombreMenuUnico && !ocultarNombreMenuEnCabecera) ? `<span class="badge badge-blue txt-xs"><i class="ti ti-list-details"></i> ${escapeHtml(nombreMenuUnico)}</span>` : ''}</div>
      <div class="tp-tanda-bts">
        ${statusBadge}
        ${pendingCount && !soloLectura ? `<button type="button" class="btn btn-sm btn-primary tp-tanda-bt" onclick="marcharComanda(${order.id}, '${esq}', ${isMenu})"><i class="ti ti-chef-hat"></i> ${escapeHtml(t('btn.sendToKitchen'))}</button>` : ''}
      </div>
    </header>
    ${filas}
  </section>`;
}

// Panel de comanda: arriba el total en grande y las unidades; debajo, la carta suelta y los menús por separado.
function renderOrderComandaPanel(order){
  const sortBebidaFirst = groups => groups.sort((a, b) => {
    const aB = a.items.some(({line}) => line.bebida) ? 0 : 1;
    const bB = b.items.some(({line}) => line.bebida) ? 0 : 1;
    return aB - bB;
  });
  const cartaItems = (order.items || []).map((line, idx) => ({line, idx})).filter(({line}) => !line.menuId);
  const menuItems = (order.items || []).map((line, idx) => ({line, idx})).filter(({line}) => !!line.menuId);
  const cartaGroups = sortBebidaFirst(groupOrderItemsByTanda(order, cartaItems));
  const menuGroups = sortBebidaFirst(groupOrderItemsByTanda(order, menuItems));
  const unidades = (order.items || []).reduce((s, l) => s + l.qty, 0);
  const total = orderTotal(order);
  const cab = `<div class="tp-com-cab"><span class="tp-com-tit"><i class="ti ti-clipboard-list"></i> ${escapeHtml(t('label.order'))}${unidades ? ` <b class="tp-com-uds">${unidades}</b>` : ''}</span><span class="tp-com-total">${fmtMoney(total)}</span></div>`;
  if(!cartaGroups.length && !menuGroups.length){
    return `${cab}<div class="empty es-vacio tp-com-vacia"><i class="ti ti-clipboard-list"></i>${escapeHtml(t('empty.orderEmpty'))}<small>${escapeHtml(t('label.selectFromMenu'))}</small></div>`;
  }
  let html = cab;
  const showSectionTitles = cartaGroups.length > 0 && menuGroups.length > 0;
  if(cartaGroups.length){
    if(showSectionTitles) html += `<div class="tp-com-seccion"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(t('tpv.section.carta'))}</div>`;
    html += cartaGroups.map(g => renderTandaGroupCard(order, g, false)).join('');
  }
  // Más de un menú a la vez (grupos grandes): cada uno en su bloque, con su nombre.
  if(menuGroups.length){
    [...new Set(menuItems.map(({line}) => line.menuId))].forEach(menuId => {
      const menu = (DB.menus || []).find(m => m.id === menuId);
      const itemsDeEsteMenu = menuItems.filter(({line}) => line.menuId === menuId);
      const gruposDeEsteMenu = sortBebidaFirst(groupOrderItemsByTanda(order, itemsDeEsteMenu));
      html += `<div class="tp-com-seccion"><i class="ti ti-list-details"></i> ${escapeHtml(menu ? tItem(menu) : t('tpv.section.menu'))}</div>`;
      html += gruposDeEsteMenu.map(g => renderTandaGroupCard(order, g, true, true)).join('');
    });
  }
  return html;
}

/* La pantalla de tomar nota: cabecera corta, carta a un lado y comanda al otro (en móvil, una barra con el total que abre la comanda). */
function renderTableOrderModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  // La comanda puede haber desaparecido entre que se abrió el modal y que se vuelve a pintar (otro dispositivo la
  // cobró o la canceló mientras este camarero la tenía abierta): cerrar en vez de romper con un error.
  if(!order){ closeModal(); renderTPV(); return; }
  const table = order.tableId ? DB.tables.find(t => t.id === order.tableId) : null;
  const nombre = table ? orderTableDisplayName(order, table) : togoOrderLabel(order);
  const subtitulo = [table && order.pax ? `${order.pax} ${t('common.persAbbr')}` : '', order.clienteNombre || ''].filter(Boolean).join(' · ');
  const reservaBadge = order.reservationId ? `<span class="badge badge-blue"><i class="ti ti-calendar-event"></i> ${t('label.reservationShort')}</span>` : '';
  const pagadoBadge = (order.clientRef && order.origenOnline ? `<span class="badge" title="${escapeHtml(t('label.publicCodeHint'))}">Nº ${escapeHtml(codigoCortoPublico(order.clientRef))}</span>` : '') +
    (order.pagado ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}${order.pagoImporte != null ? ' (' + fmtMoney(order.pagoImporte) + ')' : ''}</span>` : '');
  const camarero = order.camareroId ? DB.employees.find(e => e.id === order.camareroId) : null;
  const camareroLabel = camarero ? escapeHtml(camarero.name) : (order.openedByOwner ? escapeHtml(t('label.owner')) : t('label.assignWaiter'));
  const camareroBadge = DB.employees.length ? `<span class="badge badge-pulsable" role="button" tabindex="0" onclick="openSetCamareroModal(${order.id})" title="${t('title.changeWaiter')}"><i class="ti ti-user"></i> ${camareroLabel}</span>` : '';
  const allergensBadge = `<span class="badge badge-pulsable ${order.tableAllergens ? 'badge-red' : ''}" role="button" tabindex="0" onclick="promptTableAllergens(${order.id})" title="${t('tpv.tableAllergens.hint')}"><i class="ti ti-alert-triangle"></i> ${order.tableAllergens ? escapeHtml(order.tableAllergens) : t('tpv.tableAllergens.add')}</span>`;
  // Confirmación visible de que la comanda llegó de verdad a la pantalla de Cocina (recibidoEnCocinaAt).
  const hasFiredLines = (order.items || []).some(l => l.estado && !l.bebida);
  const kitchenAckBadge = hasFiredLines
    ? (order.recibidoEnCocinaAt
      ? `<span class="badge badge-green" title="${t('tpv.kitchenAck.confirmed')}"><i class="ti ti-check"></i> ${t('tpv.kitchenAck.confirmedShort')}</span>`
      : `<span class="badge badge-amber" title="${t('tpv.kitchenAck.pending')}"><i class="ti ti-clock"></i> ${t('tpv.kitchenAck.pendingShort')}</span>`)
    : '';

  const total = orderTotal(order);
  if(order.items.some(l => l.nuevo)){ order.items.forEach(l => delete l.nuevo); saveDB(); }

  // Todas las cartas y menús activos, bebidas primero. Navegar libremente entre todas las que estén activas es el comportamiento querido.
  const activeCartas = getActiveCartas();
  const bebidaCartas = activeCartas.filter(isBebidaCarta);
  const comidaCartas = activeCartas.filter(c => !isBebidaCarta(c));
  const allCartas = [...bebidaCartas, ...comidaCartas];
  // Un menú ya empezado en ESTE pedido debe poder completarse aunque su horario haya terminado a mitad de servicio
  // (el 2º plato de un cliente que ya se está comiendo el primero); un menú agotado no aparece para empezar uno nuevo.
  const activeMenusBase = (getActiveMenus ? getActiveMenus() : (DB.menus || [])).filter(m => m.disponible !== false);
  const inProgressMenuIds = new Set(order.items.filter(l => l.menuId).map(l => l.menuId));
  const inProgressExtraMenus = (DB.menus || []).filter(m => inProgressMenuIds.has(m.id) && !activeMenusBase.some(x => x.id === m.id));
  const activeMenus = [...activeMenusBase, ...inProgressExtraMenus];

  if(!tpvSelectedCartaId || !allCartas.some(c => c.id === tpvSelectedCartaId) && !activeMenus.some(m => m.id === tpvSelectedCartaId)){
    tpvSelectedCartaId = allCartas.length ? allCartas[0].id : (activeMenus.length ? activeMenus[0].id : null);
  }
  const pestana = (id, ic, txt) => `<button type="button" class="tp-or-tab${tpvSelectedCartaId === id ? ' is-on' : ''}" aria-pressed="${tpvSelectedCartaId === id}" onclick="tpvSelectedCartaId=${id};tpvSelectedSeccionId=null;tpvPlatoBusca='';renderTableOrderModal(${order.id})"><i class="ti ${ic}"></i> ${escapeHtml(txt)}</button>`;
  const cartaTabs = allCartas.map(c => pestana(c.id, isBebidaCarta(c) ? 'ti-glass-cocktail' : 'ti-tools-kitchen-2', tItem(c))).join('');
  const menuTabs = activeMenus.map(m => pestana(m.id, 'ti-clipboard-list', tItem(m))).join('');

  /* ⚠️ UN PEDIDO QUE HIZO EL CLIENTE POR LA WEB NO SE TOCA: el cliente ya pidió —y muchas veces ya PAGÓ— una lista
     concreta; si alguien añade algo, el total deja de cuadrar con lo cobrado y nadie se entera hasta el cierre de caja.
     Aquí solo se consulta lo que pidió. `clientRef` como respaldo: lo pone SOLO la web pública. */
  const soloConsulta = esPedidoSoloLectura(order);
  let selectorHtml = '';
  const selectedMenu = activeMenus.find(m => m.id === tpvSelectedCartaId);
  const selectedCarta = allCartas.find(c => c.id === tpvSelectedCartaId);
  if(soloConsulta){
    selectorHtml = `<div class="empty es-vacio"><i class="ti ti-lock"></i><strong>${t('tpv.onlineReadOnlyTitle')}</strong><small>${t('tpv.onlineReadOnlyDesc')}</small></div>`;
  } else if(selectedMenu){
    selectorHtml = renderMenuSelectorInline(order, selectedMenu);
  } else if(selectedCarta){
    selectorHtml = renderCartaSelectorInline(order, selectedCarta);
  }
  const comandaHtml = renderOrderComandaPanel(order);

  // Estado del servicio y botones de acción.
  const allDelivered = order.items.length > 0 && (order.items || []).filter(l => !l.bebida).every(l => l.estado === 'entregado');
  /* ⚠️ Si ya está TODO pagado online, el botón no puede decir «Cobrar · 25 €»: invita a cobrar en caja algo que el
     cliente ya pagó con tarjeta. Se calcula lo que falta de verdad (orderAmountPaidOnline) y, si es 0, solo se ofrece
     cerrar el pedido. El modal de pago (openPaymentModal) sigue siendo el único sitio que abre el formulario de cobro. */
  const yaPagadoDelTodo = order.items.length > 0 && Math.max(0, roundMoney(total - orderAmountPaidOnline(order))) <= 0.001;
  const botonCobrarOCerrar = yaPagadoDelTodo
    ? `<button type="button" class="btn btn-primary tp-or-cobrar" onclick="cerrarPedidoPagadoOnline(${order.id})"><i class="ti ti-check"></i> ${t('btn.closeOrderPaidOnline')}</button>`
    : `<button type="button" class="btn ${allDelivered && order.items.length ? 'btn-primary ' : ''}tp-or-cobrar" onclick="openPaymentModal(${order.id})" ${!order.items.length ? 'disabled' : ''}><i class="ti ti-cash"></i> ${t('btn.charge')}<span class="tp-pto"> ·</span> <b>${fmtMoney(total)}</b></button>`;
  const actionButtons = `<div class="tp-or-acciones">${allDelivered && order.items.length ? '' : renderOrderMarcharButtons(order)}${botonCobrarOCerrar}</div>`;

  const unidades = order.items.reduce((s, l) => s + l.qty, 0);
  const panel = tpvOrderMobilePane;
  openModal(`
    <div id="table-order-modal-marker" data-order-id="${order.id}" style="display:none"></div>
    <div class="modal-header tp-or-cab">
      ${order.tableId ? `<button type="button" class="btn btn-sm btn-fino tp-or-cambiar" onclick="openTableTransferModal(${order.id})" title="${escapeHtml(t('title.transferTable'))}"><i class="ti ti-transfer"></i> ${escapeHtml(t('title.transferTable'))}</button>` : ''}
      <h3 class="tp-or-mesa">${escapeHtml(nombre)}${subtitulo ? ` <span class="tp-or-sub">${escapeHtml(subtitulo)}</span>` : ''}</h3>
      ${order.tableId && !order.items.length ? `<button type="button" class="btn btn-sm btn-fino is-off" onclick="releaseEmptyTable(${order.id})" title="${escapeHtml(t('btn.releaseTable'))}"><i class="ti ti-door-exit"></i> ${escapeHtml(t('btn.releaseTable'))}</button>` : ''}
      ${(!order.tableId && (order.tipo === 'delivery' || order.tipo === 'takeaway') && order.status !== 'pagada') ? `<button type="button" class="owner-only btn btn-sm btn-fino is-off" onclick="cancelAcceptedOnlineOrder(${order.id})" title="${escapeHtml(t('title.cancelOrder'))}"><i class="ti ti-x"></i> ${escapeHtml(t('btn.cancelOrder'))}</button>` : ''}
      <button class="modal-close" onclick="closeModal();renderTPV()" aria-label="${escapeHtml(t('common.close'))}">&times;</button>
    </div>
    <div class="tp-or-chips">${reservaBadge}${pagadoBadge}${camareroBadge}${allergensBadge}${kitchenAckBadge}</div>
    ${renderOrderClientNotesHtml(order)}
    ${incidenciaFranjaHtml(order, 'sala')}
    ${esRepartoPropio(order) ? renderRepartoControlCardHtml(order) : ''}
    <div class="tp-or-cuerpo">
      <section class="tp-or-col tp-or-carta ${panel === 'carta' ? 'tpv-pane-active' : ''}" aria-label="${escapeHtml(t('tpv.section.carta'))}">
        ${soloConsulta || (!cartaTabs && !menuTabs) ? '' : `<div class="tp-or-tabs" role="group">${cartaTabs}${menuTabs}</div>`}
        ${selectorHtml}
      </section>
      <aside class="tp-or-col tp-or-comanda ${panel === 'comanda' ? 'tpv-pane-active' : ''}" aria-label="${escapeHtml(t('label.order'))}">
        <button type="button" class="btn btn-sm btn-fino tp-or-volver" onclick="setTpvOrderMobilePane('carta', ${order.id})"><i class="ti ti-arrow-left"></i> ${escapeHtml(t('tpv.section.carta'))}</button>
        ${comandaHtml}
      </aside>
    </div>
    <div class="modal-footer tp-or-pie">
    <button type="button" class="tp-or-barra${panel === 'carta' ? '' : ' is-oculta'}" onclick="setTpvOrderMobilePane('comanda', ${order.id})" aria-label="${escapeHtml(t('label.order'))}">
      <span class="tp-or-barra-izq"><i class="ti ti-clipboard-list"></i> ${escapeHtml(t('label.order'))}${unidades ? ` <b class="tp-or-barra-n">${unidades}</b>` : ''}</span>
      <span class="tp-or-barra-total">${fmtMoney(total)} <i class="ti ti-chevron-up"></i></span>
    </button>
      ${actionButtons}</div>
  `, {order: true});
}

/* ============================================================
   PARA LLEVAR Y DELIVERY (1/11) — mismo lenguaje que las mesas
   Una ficha por pedido (hora, cliente, total, pago, dirección) y los pendientes de la web
   con «Aceptar» y «Rechazar» grandes. Misma lógica: pestañas Pendientes / En curso, el
   interruptor de pedidos online, repartos y calendario.
   ============================================================ */
function renderTpvToGo(tiposServicio){
  if(tiposServicio.takeaway === false && tiposServicio.delivery === false) return '';
  const toGoOrders = DB.tpvOrders.filter(o => o.status !== 'pagada' && o.status !== 'pendiente-online' && (o.tipo === 'takeaway' || o.tipo === 'delivery') && isTogoOrderVisibleNow(o));
  // Sin hora programada (ya) primero; el resto, por hora, para ver antes lo más urgente.
  toGoOrders.sort((a, b) => {
    const ma = a.time ? (reservaTimeToMinutes(a.time) ?? 9999) : -1;
    const mb = b.time ? (reservaTimeToMinutes(b.time) ?? 9999) : -1;
    return ma - mb;
  });
  const pedidosOnlineOn = DB.business.pedidosOnlineActivos !== false;
  const pendingCount = getPendingOnlineOrders().length;
  const repartos = getActiveRepartosOrders().length;
  // Mientras nadie elija pestaña a mano, se sigue el contenido: lo que llega por aceptar salta solo a «Pendientes».
  if(!togoTabManual) togoTab = pendingCount ? 'pendientes' : 'activos';
  const cuerpo = togoTab === 'pendientes'
    ? renderTpvPendingOnline()
    : (!toGoOrders.length
      ? `<div class="empty es-vacio"><i class="ti ti-moped"></i>${escapeHtml(t('empty.noTogoOrders'))}</div>`
      : `<div class="tp-grid tp-grid-ped">${toGoOrders.map(o => tpvPedidoFichaHtml(o)).join('')}</div>`);
  return `
    <div class="tp-togo-cab">
      <h3 class="tp-sec-tit tp-togo-tit"><i class="ti ti-shopping-bag"></i> ${escapeHtml(t('title.togoDelivery'))}</h3>
      <div class="tp-togo-acc">
        <button type="button" class="btn btn-fino ${pedidosOnlineOn ? 'is-on' : 'is-off'}" id="tpv-online-toggle-btn" aria-pressed="${pedidosOnlineOn}" onclick="toggleOnlineOrdersSwitch()" title="${escapeHtml(t('tpv.onlineOrdersSwitchHint'))}"><i class="ti ${pedidosOnlineOn ? 'ti-toggle-right' : 'ti-toggle-left'}"></i> ${escapeHtml(t('tpv.onlineOrders'))}: ${escapeHtml(pedidosOnlineOn ? t('common.on') : t('common.off'))}</button>
        ${repartos ? `<button type="button" class="btn btn-fino is-on" onclick="openRepartosControlModal()"><i class="ti ti-moped"></i> ${escapeHtml(t('title.repartosControl'))} <b>${repartos}</b></button>` : ''}
        <button type="button" class="btn btn-fino" onclick="openTogoCalendarModal()"><i class="ti ti-calendar-stats"></i> ${escapeHtml(t('title.togoCalendar'))}</button>
      </div>
    </div>
    ${!pedidosOnlineOn ? `<div class="manual-warning tp-togo-aviso"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('tpv.onlineOrdersPausedWarning'))}</div>` : ''}
    <div class="cl-chips tp-togo-tabs" role="group">
      <button type="button" class="btn btn-sm btn-fino${togoTab === 'pendientes' ? ' is-on' : ''}" aria-pressed="${togoTab === 'pendientes'}" onclick="setTogoTabManual('pendientes')"><i class="ti ti-bell-ringing"></i> ${escapeHtml(t('tab.pendingOnline'))}${pendingCount ? ` <b>${pendingCount}</b>` : ''}</button>
      <button type="button" class="btn btn-sm btn-fino${togoTab === 'activos' ? ' is-on' : ''}" aria-pressed="${togoTab === 'activos'}" onclick="setTogoTabManual('activos')"><i class="ti ti-list-check"></i> ${escapeHtml(t('tab.activeTogoOrders'))}${toGoOrders.length ? ` <b>${toGoOrders.length}</b>` : ''}</button>
    </div>
    ${cuerpo}`;
}

function tpvPedidoFichaHtml(o){
  const plat = o.tipo === 'delivery' && o.plataformaId ? (DB.business.deliveryPlatforms || []).find(p => p.id === o.plataformaId) : null;
  const dueMins = o.time ? minutesUntilScheduled(o.time) : null;
  const urgente = dueMins !== null && dueMins <= 30;
  const esDel = o.tipo === 'delivery';
  const repartidor = esDel ? mesaRepartidorChipHtml(o.repartidorId, o.repartidorCourierId) : '';
  const metodo = o.metodoPagoLocal === 'tarjeta' ? t('pay.card') : o.metodoPagoLocal === 'efectivo' ? t('pay.cash') : null;
  const dir = o.clienteDireccion || o.clienteAddress || '';
  const nom = o.clienteNombre || togoOrderLabel(o);
  const mins = o.createdAt ? minutesSince(o.createdAt) : null;
  return `
  <button type="button" class="tp-ped ${esDel ? 'es-delivery' : 'es-recoger'}${urgente ? ' es-urgente' : ''}" onclick="openTableOrder(null, ${o.id})" aria-label="${escapeHtml(nom + ', ' + fmtMoney(orderTotal(o)))}">
    <span class="tp-ped-top">
      <span class="tp-ped-tipo"><i class="ti ${esDel ? 'ti-moped' : 'ti-walk'}"></i> ${escapeHtml(esDel ? t('label.deliveryShort') : t('label.pickupOrder'))}</span>
      ${o.time ? `<span class="tp-ped-hora${urgente ? ' is-urgente' : ''}"><i class="ti ${urgente ? 'ti-alarm' : 'ti-clock'}"></i> ${escapeHtml(o.time)}</span>` : (mins !== null ? `<span class="tp-ped-hora">${mins}'</span>` : '')}
    </span>
    <b class="tp-ped-nom">${escapeHtml(nom)}</b>
    ${o.clientRef && o.origenOnline ? `<span class="tp-ped-ref">Nº ${escapeHtml(codigoCortoPublico(o.clientRef))}</span>` : ''}
    ${dir ? `<span class="tp-ped-dir"><i class="ti ti-map-pin"></i> ${escapeHtml(dir)}</span>` : ''}
    <span class="tp-ped-total">${fmtMoney(orderTotal(o))}</span>
    <span class="tp-ped-pie">
      ${o.pagado ? `<span class="tp-av is-pago"><i class="ti ti-credit-card"></i> ${escapeHtml(t('label.paidOnline'))}</span>` : `<span class="tp-av"><i class="ti ti-clock-exclamation"></i> ${escapeHtml(t('label.paymentPending'))}</span>`}
      ${metodo ? `<span class="tp-av"><i class="ti ${o.metodoPagoLocal === 'tarjeta' ? 'ti-credit-card' : 'ti-cash'}"></i> ${escapeHtml(metodo)}</span>` : ''}
      ${incidenciaAbierta(o) ? `<span class="tp-av is-inc"><i class="ti ti-alert-triangle"></i></span>` : ''}
      ${esDel ? `<span class="tp-av">${escapeHtml(plat ? plat.nombre : t('label.directOrder'))}</span>${repartidor}` : ''}
    </span>
  </button>`;
}

// Pedidos de HOY ya aceptados pero programados para más tarde: no están en «En curso» (se ocultan a propósito
// hasta que falta poco), pero el personal tiene que ver qué hay comprometido sin abrir el calendario.
function renderTpvScheduledLaterCard(o){
  const esDel = o.tipo === 'delivery';
  return `
    <button type="button" class="tp-ped ${esDel ? 'es-delivery' : 'es-recoger'}" onclick="openTableOrder(null, ${o.id})">
      <span class="tp-ped-top"><span class="tp-ped-tipo"><i class="ti ${esDel ? 'ti-moped' : 'ti-walk'}"></i> ${escapeHtml(esDel ? t('label.deliveryShort') : t('label.pickupOrder'))}</span><span class="tp-ped-hora"><i class="ti ti-clock"></i> ${escapeHtml(o.time)}</span></span>
      <b class="tp-ped-nom">${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</b>
      <span class="tp-ped-lineas">${(o.items || []).map(l => `${l.qty}× ${escapeHtml(l.name)}`).join('<br>')}</span>
      <span class="tp-ped-total">${fmtMoney(orderTotal(o))}</span>
    </button>`;
}

function renderTpvPendingOnline(){
  const pendingOnline = getPendingOnlineOrders();
  const scheduledLater = getTodayScheduledLaterOrders();
  const laterSection = scheduledLater.length ? `
    <h4 class="tp-sec-tit"><i class="ti ti-clock-hour-4"></i> ${escapeHtml(t('title.scheduledLaterToday'))} <span class="dp-cuenta">${scheduledLater.length}</span></h4>
    <p class="pr-ayuda">${escapeHtml(t('label.scheduledLaterTodayDesc'))}</p>
    <div class="tp-grid tp-grid-ped">${scheduledLater.map(renderTpvScheduledLaterCard).join('')}</div>` : '';
  if(!pendingOnline.length) return `<div class="empty es-vacio"><i class="ti ti-bell-ringing"></i>${escapeHtml(t('empty.noPendingOnline'))}</div>${laterSection}`;
  return `
    <div class="tp-grid tp-grid-ped">
      ${pendingOnline.map(o => {
        const esDel = o.tipo === 'delivery';
        const esperaMin = o.createdAt ? minutesSince(o.createdAt) : 0;
        return `
        <article class="tp-ped is-nuevo ${esDel ? 'es-delivery' : 'es-recoger'}">
          <span class="tp-ped-top"><span class="tp-ped-tipo"><i class="ti ${esDel ? 'ti-moped' : 'ti-shopping-bag'}"></i> ${escapeHtml(esDel ? t('label.deliveryShort') : t('label.pickupOrder'))}</span><span class="pm-et is-dto">${escapeHtml(t('badge.newF'))}</span></span>
          <b class="tp-ped-nom">${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</b>
          ${o.clientRef ? `<span class="tp-ped-ref">Nº ${escapeHtml(codigoCortoPublico(o.clientRef))}</span>` : ''}
          ${esperaMin >= 30 ? `<span class="tp-ped-alerta"><i class="ti ti-clock-exclamation"></i> ${escapeHtml(t('label.waitingSince').replace('${min}', esperaMin))}</span>` : ''}
          ${o.pendienteVerificarZona ? `<span class="tp-ped-alerta"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('label.zoneNotVerified'))}</span>` : ''}
          <span class="tp-ped-pie">${o.pagado ? `<span class="tp-av is-pago"><i class="ti ti-credit-card"></i> ${escapeHtml(t('label.paidOnline'))}</span>`
            : o.pagoInsuficiente ? `<span class="tp-av is-inc"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('label.paymentShort'))}</span>`
            : (o.origenOnline && !o.metodoPagoLocal) ? `<span class="tp-av"><i class="ti ti-clock"></i> ${escapeHtml(t('label.awaitingCardPayment'))}</span>` : ''}</span>
          ${o.clienteTelefono ? `<span class="tp-ped-dir${o.phoneOdd ? ' is-alerta' : ''}"><i class="ti ti-phone"></i> ${escapeHtml(o.clienteTelefono)}${o.phoneOdd ? ` <i class="ti ti-alert-triangle" title="${escapeHtml(t('msg.phoneLooksOdd'))}"></i>` : ''}</span>` : ''}
          ${o.time ? `<span class="tp-ped-dir"><i class="ti ti-clock"></i> ${escapeHtml(t('label.scheduledFor'))} ${escapeHtml(o.time)}${o.date && o.date !== todayStr() ? ' (' + escapeHtml(o.date) + ')' : ''}</span>` : ''}
          ${o.clienteDireccion ? `<span class="tp-ped-dir"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteDireccion)}${o.clienteCodigoPostal ? ' (' + escapeHtml(o.clienteCodigoPostal) + ')' : ''}</span>` : ''}
          <ul class="tp-mini">${(o.items || []).map(l => `<li><b>${l.qty}×</b> ${escapeHtml(l.name)}</li>`).join('')}</ul>
          ${o.notas ? `<span class="tp-ped-dir"><i class="ti ti-note"></i> ${escapeHtml(o.notas)}</span>` : ''}
          <span class="tp-ped-total">${fmtMoney(orderTotal(o))}</span>
          <span class="tp-ped-botones">
            <button type="button" class="btn btn-fino is-on" onclick="acceptOnlineOrder(${o.id})"><i class="ti ti-check"></i> ${escapeHtml(t('common.accept'))}</button>
            <button type="button" class="owner-only btn btn-fino is-off" onclick="rejectOnlineOrder(${o.id})"><i class="ti ti-x"></i> ${escapeHtml(t('common.reject'))}</button>
          </span>
        </article>`;
      }).join('')}
    </div>
    ${laterSection}`;
}

// Aviso de «última hora»: si el turno cierra en menos de 30 minutos, se ve arriba del todo.
function renderLastCallBanner(){
  try{
    const horarioHoy = (DB.business.horario || [])[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    if(!horarioHoy || horarioHoy.abierto === false) return '';
    const tramos = horarioHoy.modo === 'seguido' ? [horarioHoy.seguido] : (horarioHoy.turnos || []);
    const toMin = hhmm => { const [h, m] = (hhmm || '').split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0); };
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const closingsSoon = tramos.map(tr => toMin(tr && tr.fin)).filter(fin => fin != null && fin - nowMin > 0 && fin - nowMin <= 30);
    if(!closingsSoon.length) return '';
    const minsLeft = Math.min(...closingsSoon.map(fin => fin - nowMin));
    return `<div class="tp-lastcall" role="status"><i class="ti ti-clock-exclamation"></i><span>${escapeHtml(t('tpv.lastCall.msg').replace('${n}', minsLeft))}</span></div>`;
  }catch(e){ return ''; }
}


/* ── Notas rápidas: lo que más se pide a cocina, a un toque (en un servicio con volumen nadie escribe «sin cebolla» con el pulgar) ── */
const TPV_NOTAS_RAPIDAS = [
  {es:'Sin cebolla', ca:'Sense ceba', en:'No onion'}, {es:'Sin gluten', ca:'Sense gluten', en:'Gluten free'},
  {es:'Sin lactosa', ca:'Sense lactosa', en:'Lactose free'}, {es:'Poco hecho', ca:'Poc fet', en:'Rare'},
  {es:'Al punto', ca:'Al punt', en:'Medium'}, {es:'Muy hecho', ca:'Molt fet', en:'Well done'},
  {es:'Sin sal', ca:'Sense sal', en:'No salt'}, {es:'Sin picante', ca:'Sense picant', en:'Not spicy'},
  {es:'Para compartir', ca:'Per compartir', en:'To share'}, {es:'Con prisa', ca:'Amb pressa', en:'In a hurry'},
];
function tpvNotasRapidasHtml(){
  return `<div class="tp-notas-rapidas" role="group" aria-label="${escapeHtml(gl({es:'Notas rápidas', ca:'Notes ràpides', en:'Quick notes'}))}">
    ${TPV_NOTAS_RAPIDAS.map(n => { const txt = gl(n); return `<button type="button" class="btn btn-sm btn-fino" data-nota="${escapeHtml(txt)}" aria-pressed="false" onclick="tpvNotaRapida(this)">${escapeHtml(txt)}</button>`; }).join('')}
  </div>`;
}
document.addEventListener('input', e => { if(e.target && e.target.id === 'line-notas-input') tpvNotasRapidasMarcar(); });
// Añade o quita la frase del campo de notas (separadas por comas) y marca el botón.
function tpvNotaRapida(btn){
  const campo = document.getElementById('line-notas-input');
  if(!campo) return;
  const txt = btn.getAttribute('data-nota');
  const partes = campo.value.split(',').map(s => s.trim()).filter(Boolean);
  const i = partes.findIndex(p => p.toLowerCase() === txt.toLowerCase());
  if(i >= 0) partes.splice(i, 1); else partes.push(txt);
  campo.value = partes.join(', ');
  tpvNotasRapidasMarcar();
}
function tpvNotasRapidasMarcar(){
  const campo = document.getElementById('line-notas-input');
  if(!campo) return;
  const partes = campo.value.split(',').map(s => s.trim().toLowerCase());
  document.querySelectorAll('.tp-notas-rapidas [data-nota]').forEach(b => {
    const on = partes.includes(b.getAttribute('data-nota').toLowerCase());
    b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
