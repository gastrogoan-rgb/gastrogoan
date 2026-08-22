/* ============================================================
   TPV — Comandas, mesas y tickets
   ============================================================ */
let _lastPurgeDate = '';
function purgePaidOrders(){
  const now = new Date();
  const today = todayStr();
  if(now.getHours() < 6 || _lastPurgeDate === today) return;
  const before = DB.tpvOrders.length;
  DB.tpvOrders = DB.tpvOrders.filter(o => o.status !== 'pagada');
  if(DB.tpvOrders.length < before){ saveDB(); }
  _lastPurgeDate = today;
}

// Control de repartos propios (reparto hecho por el propio negocio, no por
// una plataforma externa tipo Glovo/Uber Eats — esos ya llevan su propio
// repartidor y su propio seguimiento, fuera de esta app). El reparto se
// asigna solo (ver autoAssignRepartidor) a un repartidor de turno en cuanto
// el pedido entra, y el repartidor solo tiene que hacer una cosa al acabar:
// marcarlo como entregado.
function esRepartoPropio(order){
  return order.tipo === 'delivery' && !order.plataformaId;
}
function repartoStatusBadgeHtml(order){
  if(order.entregaEstado === 'entregado') return ` <span class="badge badge-green"><i class="ti ti-circle-check"></i> ${t('reparto.entregado')}</span>`;
  if(order.repartidorId || order.repartidorCourierId) return ` <span class="badge badge-blue"><i class="ti ti-moped"></i> ${t('reparto.enCamino')}</span>`;
  return ` <span class="badge badge-amber"><i class="ti ti-alert-triangle"></i> ${t('reparto.sinAsignar')}</span>`;
}
// Único paso que necesita el repartidor: marcar el pedido como entregado.
// Queda registrado en auditoría quién lo marcó (sesión del empleado
// conectado), igual que el resto de acciones sensibles de esta sesión.
function markRepartoEntregado(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || order.entregaEstado === 'entregado') return;
  order.entregaEstado = 'entregado';
  order.entregadoAt = new Date().toISOString();
  logAudit('edit', t('audit.orderDelivered').replace('${name}', order.clienteNombre||'?'));
  saveDB();
  if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
  refreshRepartoUI(orderId);
  showToast(t('msg.deliveryMarkedDelivered'));
}
// Vuelve a pintar lo que haga falta después de tocar algo del reparto
// (repartidor asignado, cambio a preparar, entregado...): el panel de
// control si está abierto, o si no la propia tarjeta del pedido si es esa
// la que está abierta — si no, el badge/importe se quedaban con el valor
// viejo hasta cerrar y reabrir el pedido a mano.
function refreshRepartoUI(orderId){
  if(document.getElementById('repartos-control-modal-body')) renderRepartosControlModalBody();
  else if(document.querySelector('.modal-overlay.active')) renderTableOrderModal(orderId);
  renderTPV();
}
function assignRepartidorForOrder(orderId, raw){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  // Mismo criterio que confirmSetCamarero: quitarle un reparto YA asignado
  // a otra persona para dárselo a otra es cosa del propietario, no de
  // cualquier empleado — la primera asignación (auto o manual) sigue
  // abierta a cualquiera, como el resto de esta sesión.
  const yaAsignado = order.repartidorId != null || order.repartidorCourierId != null;
  if(yaAsignado && !isOwnerSession()){
    showToast(t('msg.onlyOwnerCanReassignRider'));
    refreshRepartoUI(orderId); // repinta el <select> a su valor real (deshace el cambio visual)
    return;
  }
  Object.assign(order, parseRepartidorFieldValue(raw));
  logAudit('edit', t('audit.reassignedRider').replace('${name}', order.clienteNombre||'?').replace('${rider}', repartidorNombre(order)));
  saveDB();
  refreshRepartoUI(orderId);
}

// Asignación automática: entre los empleados de Sala marcados como
// "repartidor" y que están de turno AHORA MISMO (ver isEmployeeOnShiftNow,
// js/hr.js), se elige el que menos repartos activos tenga en este momento
// (reparto de la carga si hay varios), para no cargar siempre al mismo. Si
// no hay ningún repartidor de turno, el pedido se queda sin asignar y el
// personal lo asigna a mano desde la tarjeta del pedido.
function autoAssignRepartidor(order){
  if(order.repartidorId || order.repartidorCourierId) return; // ya tiene uno asignado a mano
  const candidatos = DB.employees.filter(e => e.area === 'sala' && e.active !== false && e.esRepartidor && typeof isEmployeeOnShiftNow === 'function' && isEmployeeOnShiftNow(e.id));
  if(!candidatos.length) return;
  const cargaActual = id => DB.tpvOrders.filter(o => esRepartoPropio(o) && o.repartidorId === id && o.entregaEstado !== 'entregado' && o.status !== 'pagada').length;
  candidatos.sort((a,b) => cargaActual(a.id) - cargaActual(b.id));
  order.repartidorId = candidatos[0].id;
  order.repartidorCourierId = null;
  order.entregaAsignadoAt = new Date().toISOString();
  // Si quien acaba de aceptar/crear el pedido en ESTE dispositivo es a la
  // vez el repartidor asignado (negocio pequeño, un solo dispositivo para
  // todo), el aviso es inmediato — si es otro dispositivo, se avisa al
  // llegar el cambio por la nube (ver applyRemoteBlock, js/core.js).
  if(order.repartidorId === loggedInEmployeeId()){
    if(typeof playNewRequestAlert === 'function') playNewRequestAlert();
    showToast(t('msg.newDeliveryAssignedToYou').replace('${name}', order.clienteNombre||'?'));
  }
}

// Pedidos de reparto propio "vivos" ahora mismo (aún sin entregar), para el
// contador del botón de la barra de herramientas.
function getActiveRepartosOrders(){
  return DB.tpvOrders.filter(o => esRepartoPropio(o) && o.status !== 'pagada' && o.status !== 'pendiente-online' && o.entregaEstado !== 'entregado');
}
// Pedidos de reparto propio entregados HOY, para el histórico del panel de
// control — así el dueño puede revisar a final del día quién repartió qué,
// a qué hora salió y a qué hora llegó, sin tener que ir pedido a pedido.
function getDeliveredTodayRepartosOrders(){
  const today = todayStr();
  return DB.tpvOrders.filter(o => esRepartoPropio(o) && o.entregaEstado === 'entregado' && o.entregadoAt && o.entregadoAt.slice(0,10) === today);
}
function repartidorNombre(order){
  if(order.repartidorId){ const e = DB.employees.find(x=>x.id===order.repartidorId); return e ? e.name : t('common.unassigned'); }
  if(order.repartidorCourierId){ const c = (DB.business.ownCouriers||[]).find(x=>x.id===order.repartidorCourierId); return c ? c.nombre : t('common.unassigned'); }
  return t('common.unassigned');
}

// Ruta agrupada: si el mismo repartidor tiene varios pedidos activos a la
// vez (lo normal cuando entran varios pedidos seguidos y no hay más
// repartidores de turno para repartir la carga), tiene sentido que los
// lleve todos en una sola vuelta en vez de ir y volver al negocio entre
// cada uno. Se agrupan por repartidor asignado (empleado o externo), no
// por franja horaria de llegada — si el repartidor los tiene todos a la
// vez sin entregar, es su ruta ahora mismo, da igual cuándo entró cada uno.
function getRouteGroupForOrder(order){
  const key = order.repartidorId ? `emp:${order.repartidorId}` : (order.repartidorCourierId ? `courier:${order.repartidorCourierId}` : null);
  if(!key) return [order];
  let group = getActiveRepartosOrders().filter(o => {
    const k = o.repartidorId ? `emp:${o.repartidorId}` : (o.repartidorCourierId ? `courier:${o.repartidorCourierId}` : null);
    return k === key;
  });
  const p = (DB.business && DB.business.pedidos) || {};
  const anchorTime = new Date(order.createdAt).getTime();
  // Ventana de tiempo: no agrupa en la misma ruta un pedido que lleva horas
  // esperando con uno que acaba de entrar, aunque el mismo repartidor los
  // tenga los dos activos a la vez — pueden ir en direcciones/momentos muy
  // distintos y no tiene sentido forzarlos juntos.
  const ventanaMin = p.ventanaRutaMin != null ? p.ventanaRutaMin : 30;
  if(ventanaMin > 0){
    group = group.filter(o => Math.abs(new Date(o.createdAt).getTime() - anchorTime) <= ventanaMin * 60000);
  }
  // Tope de paradas: si aun así quedan más pedidos de los que caben en una
  // ruta, se queda con los más cercanos en el tiempo a ESTE pedido (el resto
  // formará su propia ruta al mirarla desde su propia tarjeta).
  const maxParadas = p.maxParadasPorRuta != null ? p.maxParadasPorRuta : 4;
  if(maxParadas > 0 && group.length > maxParadas){
    group = [...group]
      .sort((a,b) => Math.abs(new Date(a.createdAt).getTime()-anchorTime) - Math.abs(new Date(b.createdAt).getTime()-anchorTime))
      .slice(0, maxParadas);
  }
  group.sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
  return group;
}
// URL de Google Maps con varias paradas (sin necesitar API de pago): el
// prefijo "optimize:true" en waypoints le pide a Maps que reordene las
// paradas intermedias por la ruta más rápida al abrir la app/web — no hay
// forma 100% oficial de pedir esto sin clave de la API de rutas de pago,
// pero este prefijo es el que usan históricamente apps de reparto para
// conseguirlo con la Maps normal y gratuita.
function buildRouteMapsUrl(orders){
  const addresses = orders.map(o => (o.clienteDireccion||'') + (o.clienteCodigoPostal ? ' ' + o.clienteCodigoPostal : '')).filter(Boolean);
  if(!addresses.length) return null;
  if(addresses.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addresses[0])}`;
  const destination = addresses[addresses.length-1];
  const waypoints = addresses.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=optimize:true|${waypoints.map(encodeURIComponent).join('|')}&travelmode=driving`;
}
function setRepartoNotasForOrder(orderId, value){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  order.repartoNotas = value.trim();
  saveDB();
}
// Panel central de control de repartos: pensado tanto para el dueño (ver de
// un vistazo todos los repartos en curso y quién lleva cada uno) como para
// quien reparte, si usa su propio móvil con su sesión de empleado — ve aquí
// mismo sus repartos pendientes con dirección, teléfono e importe a cobrar,
// sin tener que navegar el TPV completo.
function openRepartosControlModal(){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-moped"></i> ${t('title.repartosControl')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div id="repartos-control-modal-body"></div>
  `);
  renderRepartosControlModalBody();
}
function renderRepartosControlModalBody(){
  const box = document.getElementById('repartos-control-modal-body');
  if(!box) return;
  const active = getActiveRepartosOrders();
  const delivered = getDeliveredTodayRepartosOrders();
  // "Mis repartos" primero si quien está conectado es a la vez el repartidor
  // asignado — para que un empleado que reparte con su propio móvil vea de
  // inmediato lo suyo arriba del todo, sin tener que buscar entre todos.
  const myId = loggedInEmployeeId();
  active.sort((a,b) => {
    const aMine = myId && a.repartidorId === myId ? 0 : 1;
    const bMine = myId && b.repartidorId === myId ? 0 : 1;
    if(aMine !== bMine) return aMine - bMine;
    return (a.entregaSalidaAt||a.createdAt||'').localeCompare(b.entregaSalidaAt||b.createdAt||'');
  });
  const renderRow = o => {
    const group = getRouteGroupForOrder(o);
    const isRoute = group.length > 1;
    return `
    <div class="card" style="cursor:pointer" onclick="closeModal();openTableOrder(null, ${o.id})">
      <h3 style="justify-content:space-between;font-size:14px">
        <span>${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</span>
        ${repartoStatusBadgeHtml(o)}
      </h3>
      ${o.clienteDireccion ? `<div style="font-size:13px"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteDireccion)}</div>` : `<div style="font-size:12px;color:var(--muted)">${t('reparto.noAddress')}</div>`}
      ${o.clienteTelefono ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-phone"></i> ${escapeHtml(o.clienteTelefono)}</div>` : ''}
      ${isRoute ? `<div style="font-size:11px;color:var(--brand-orange);margin-top:4px"><i class="ti ti-route"></i> ${t('reparto.routeWith').replace('${n}', group.length)}</div>` : ''}
      ${o.repartoNotas ? `<div style="font-size:11px;color:var(--red);margin-top:4px"><i class="ti ti-note"></i> ${escapeHtml(o.repartoNotas)}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <span style="font-size:12px;color:var(--muted)"><i class="ti ti-user"></i> ${escapeHtml(repartidorNombre(o))}</span>
        <strong style="color:var(--brand-orange)">${o.pagado ? t('label.paidOnline') : fmtMoney(orderTotal(o))}</strong>
      </div>
    </div>
  `;};
  box.innerHTML = `
    <h4 style="margin:6px 0"><i class="ti ti-clock"></i> ${t('reparto.enCurso')} (${active.length})</h4>
    ${active.length ? `<div class="grid grid-3" style="margin-bottom:18px">${active.map(renderRow).join('')}</div>` : `<div class="empty" style="padding:14px;margin-bottom:14px">${t('reparto.emptyActive')}</div>`}
    <h4 style="margin:6px 0"><i class="ti ti-history"></i> ${t('reparto.historialHoy')} (${delivered.length})</h4>
    ${delivered.length ? `
      <table class="table" style="font-size:13px">
        <thead><tr><th>${t('label.client')}</th><th>${t('label.deliveryRider')}</th><th>${t('reparto.leftAt')}</th><th>${t('reparto.deliveredAt')}</th><th>${t('reparto.notas')}</th></tr></thead>
        <tbody>
          ${delivered.map(o => `<tr>
            <td>${escapeHtml(o.clienteNombre||'—')}</td>
            <td>${escapeHtml(repartidorNombre(o))}</td>
            <td>${o.entregaSalidaAt ? new Date(o.entregaSalidaAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
            <td>${new Date(o.entregadoAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</td>
            <td>${escapeHtml(o.repartoNotas||'—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    ` : `<div class="empty" style="padding:14px">${t('reparto.emptyHistorial')}</div>`}
  `;
}

// Tarjeta con todo lo que necesita quien reparte el pedido: dirección,
// teléfono, cuánto cobrar (si no está ya pagado online) y el repartidor
// asignado, más el botón para ir avanzando el estado del reparto.
function setPagaConForOrder(orderId, value){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const n = parseFloat(value);
  order.pagaCon = (value === '' || isNaN(n)) ? null : n;
  saveDB();
  refreshRepartoUI(orderId);
}
// Toda la información que necesita quien reparte, en una sola tarjeta:
// dirección (con botón directo a Google Maps), teléfono, cuánto cobrar y
// cambio a preparar si paga en efectivo, repartidor asignado y el único
// botón que necesita al acabar: marcar como entregado.
function renderRepartoControlCardHtml(order){
  const currentValue = order.repartidorId ? `emp:${order.repartidorId}` : (order.repartidorCourierId ? `courier:${order.repartidorCourierId}` : '');
  const repartidorSelectHtml = renderRepartidorFieldHtml('reparto-repartidor-sel-' + order.id, currentValue)
    .replace(`id="reparto-repartidor-sel-${order.id}"`, `id="reparto-repartidor-sel-${order.id}" onchange="assignRepartidorForOrder(${order.id}, this.value)"`);
  const total = orderTotal(order);
  const cambio = (!order.pagado && order.pagaCon != null && order.pagaCon >= total) ? order.pagaCon - total : null;
  const entregado = order.entregaEstado === 'entregado';
  const routeGroup = !entregado ? getRouteGroupForOrder(order) : [order];
  const isRoute = routeGroup.length > 1;
  const mapsUrl = isRoute ? buildRouteMapsUrl(routeGroup) : (order.clienteDireccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.clienteDireccion + (order.clienteCodigoPostal ? ' ' + order.clienteCodigoPostal : ''))}` : null);
  return `
    <div class="card" style="margin-bottom:10px;border:2px solid var(--brand-orange)">
      <h3 style="justify-content:space-between;font-size:14px"><span><i class="ti ti-moped"></i> ${t('reparto.title')}</span>${repartoStatusBadgeHtml(order)}</h3>
      ${isRoute ? `<div style="font-size:12px;color:var(--brand-orange);margin-top:2px"><i class="ti ti-route"></i> ${t('reparto.routeWith').replace('${n}', routeGroup.length)}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:6px">
        <div style="flex:1;min-width:220px">
          ${order.clienteDireccion ? `
            <div style="font-size:14px"><i class="ti ti-map-pin"></i> ${escapeHtml(order.clienteDireccion)}${order.clienteCodigoPostal ? ' ('+escapeHtml(order.clienteCodigoPostal)+')' : ''}</div>
            <a class="btn btn-sm" style="margin-top:6px;text-decoration:none;display:inline-flex" href="${mapsUrl}" target="_blank" rel="noopener"><i class="ti ${isRoute?'ti-route':'ti-map-2'}"></i> ${isRoute ? t('reparto.openRoute') : t('reparto.openMaps')}</a>
          ` : `<div style="font-size:13px;color:var(--muted)">${t('reparto.noAddress')}</div>`}
          ${order.clienteTelefono ? `<div style="font-size:14px;margin-top:8px"><i class="ti ti-phone"></i> <a href="tel:${escapeHtml(order.clienteTelefono)}">${escapeHtml(order.clienteTelefono)}</a></div>` : ''}
          <div style="font-size:14px;margin-top:8px">
            ${order.pagado
              ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}</span>`
              : `<strong style="color:var(--brand-orange)"><i class="ti ti-cash"></i> ${t('reparto.toCollect')}: ${fmtMoney(total)}</strong>`}
          </div>
          ${!order.pagado && order.metodoPagoLocal === 'tarjeta' ? `
            <div style="font-size:13px;margin-top:6px"><span class="badge badge-blue"><i class="ti ti-credit-card"></i> ${t('reparto.paysCardOnArrival')}</span></div>
          ` : ''}
          ${!order.pagado && order.metodoPagoLocal !== 'tarjeta' ? `
            <div class="field" style="margin-top:8px;max-width:220px">
              <label style="font-size:12px">${t('reparto.pagaCon')}</label>
              <input type="number" min="0" step="0.5" value="${order.pagaCon!=null?order.pagaCon:''}" placeholder="${t('reparto.pagaConPlaceholder')}" onchange="setPagaConForOrder(${order.id}, this.value)">
              ${order.pagaCon!=null && order.metodoPagoLocal==='efectivo' ? `<small style="color:var(--muted)">${t('reparto.pagaConFromClient')}</small>` : ''}
            </div>
            ${cambio != null ? `<div style="font-size:14px;margin-top:4px"><strong style="color:var(--red)"><i class="ti ti-cash-banknote"></i> ${t('reparto.change')}: ${fmtMoney(cambio)}</strong></div>` : ''}
            ${order.pagaCon != null && order.pagaCon < total ? `<div style="font-size:12px;margin-top:4px;color:var(--red)"><i class="ti ti-alert-triangle"></i> ${t('reparto.pagaConInsuficiente')}</div>` : ''}
          ` : ''}
          ${order.entregadoAt ? `<div style="font-size:12px;color:var(--muted);margin-top:8px"><i class="ti ti-flag-check"></i> ${t('reparto.deliveredAt')} ${new Date(order.entregadoAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>` : ''}
        </div>
        <div style="flex:1;min-width:200px">
          ${repartidorSelectHtml}
          ${!entregado ? `<button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="markRepartoEntregado(${order.id})"><i class="ti ti-circle-check"></i> ${t('reparto.btn.entregado')}</button>` : ''}
          <div class="field" style="margin-top:8px">
            <label style="font-size:12px">${t('reparto.notas')}</label>
            <textarea placeholder="${t('reparto.notasPlaceholder')}" onchange="setRepartoNotasForOrder(${order.id}, this.value)" style="min-height:50px">${escapeHtml(order.repartoNotas||'')}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}
function getActiveCartas(){
  const ids = DB.activeCartaIds||[];
  return DB.cartas.filter(c=>ids.includes(c.id));
}
function toggleActiveCarta(id, checked){
  id = parseInt(id);
  if(!Array.isArray(DB.activeCartaIds)) DB.activeCartaIds = [];
  if(checked){
    if(!DB.activeCartaIds.includes(id)) DB.activeCartaIds.push(id);
  }else{
    DB.activeCartaIds = DB.activeCartaIds.filter(cid=>cid!==id);
  }
  saveDB();
  renderTPV();
}


// Comprueba si una carta debería estar activa ahora mismo, según el horario
// semanal propio configurado en su editor (días + franjas horarias opcionales).
function cartaIsActiveNow(c, now){
  const jsDay = now.getDay();
  const dayIdx = (jsDay + 6) % 7; // 0=lunes..6=domingo
  const horario = migrateItemHorario(c);
  const day = horario[dayIdx];
  if(!day || day.activo === false) return false;
  const franjas = day.franjas && day.franjas.length ? day.franjas : [{desde:'', hasta:''}];
  const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  return franjas.some(f => {
    if(!f.desde || !f.hasta) return true; // sin franja concreta: activa todo el día
    // Franja que cruza medianoche (ej. 20:00-02:00)
    if(f.hasta < f.desde) return time >= f.desde || time <= f.hasta;
    return time >= f.desde && time <= f.hasta;
  });
}

// Todas las cartas que deberían estar activas ahora mismo (puede haber varias
// a la vez, p.ej. la carta de comida y la de bebidas), según el horario propio
// configurado en cada carta.
function computeAutoActiveCartaIds(){
  if(!DB.cartas || !DB.cartas.length) return [];
  const now = new Date();
  return DB.cartas.filter(c => cartaIsActiveNow(c, now)).map(c=>c.id);
}

// Si el cambio automático está activado, ajusta las cartas activas del TPV
// según lo programado. force=true vuelve a calcular aunque ya hubiera activas.
function updateAutoActiveCarta(force){
  if(!DB.business) return;
  const autoIds = computeAutoActiveCartaIds();
  // OJO: antes, si ninguna carta coincidía con el horario ahora mismo (autoIds
  // vacío), se salía sin tocar DB.activeCartaIds — así que la última carta
  // activa se quedaba "activa" para siempre tras cerrar su franja horaria, en
  // TPV y en la carta pública. Ahora sí se vacía también en ese caso.
  const current = DB.activeCartaIds||[];
  const changed = force || autoIds.length !== current.length || autoIds.some(id=>!current.includes(id));
  if(changed){
    DB.activeCartaIds = autoIds;
    saveDB();
    if(document.getElementById('view-tpv')?.classList.contains('active')) renderTPV();
  }
}
// "Otro" se mantiene aquí (usado por el cierre de caja como cajón de sastre
// para cualquier venta histórica con un método de pago no reconocido) pero
// ya NO se ofrece como opción al cobrar — solo Efectivo, Tarjeta o Mixto,
// para no dar pie a un método ambiguo que no aporta nada al cerrar caja.
const PAYMENT_METHODS = ['Efectivo','Tarjeta','Otro'];
const SELECTABLE_PAYMENT_METHODS = ['Efectivo','Tarjeta'];
// El método de pago se guarda siempre en español (valor interno/histórico);
// esto solo traduce la etiqueta que se le muestra al usuario.
const PAYMENT_METHOD_LABEL_KEYS = {'Efectivo':'pay.cash','Tarjeta':'pay.card','Otro':'pago.otro','Mixto':'pay.mixed'};
function paymentMethodTpvLabel(value){
  return PAYMENT_METHOD_LABEL_KEYS[value] ? t(PAYMENT_METHOD_LABEL_KEYS[value]) : (value||'');
}
let paymentTab = 'full'; // 'full' | 'equal' | 'items' — pestaña activa del modal de cobro
let tpvSelectedCartaId = null; // id de la carta/menú seleccionada en las pestañas de la comanda
let tpvSelectedSeccionId = null; // sección abierta dentro de la carta seleccionada (null = viendo las carpetas)
// En móvil, carta y comanda ya no van una al lado de la otra (no cabían
// bien) ni apiladas en dos cajas pequeñas con scroll propio cada una (poco
// sitio para ver de verdad lo que se está tomando): se muestra solo una de
// las dos a la vez, a casi toda la altura, con un interruptor para
// cambiar. Empieza en 'carta' (lo primero que hace falta al abrir una
// mesa) y se mantiene mientras se van añadiendo platos, para no tener que
// volver a tocar el interruptor entre plato y plato.
let tpvOrderMobilePane = 'carta';
function setTpvOrderMobilePane(pane, orderId){
  tpvOrderMobilePane = pane;
  renderTableOrderModal(orderId);
}

// Emoji por defecto para una sección de carta sin icono propio asignado
function guessSeccionEmoji(nombre){
  const n = (nombre||'').toLowerCase();
  if(/bebida|refresco|cerveza|vino|cava|cocktail|copa|cafe|café|infusi|licor/.test(n)) return '🥤';
  if(/entrante|aperitivo|tapa|ensalada/.test(n)) return '🥗';
  if(/primero|sopa|crema|arroz|pasta/.test(n)) return '🥣';
  if(/segundo|carne|pescado|principal/.test(n)) return '🍖';
  if(/postre|dulce/.test(n)) return '🍰';
  if(/pizza/.test(n)) return '🍕';
  if(/pan|bocadillo|sandwich/.test(n)) return '🥖';
  return '🍽️';
}

// Icono elegido a mano por el cliente para una carpeta de categoría, guardado
// por nombre de categoría en uno de dos espacios independientes:
// - 'recipe': Escandallo y Fichas Técnicas (categorías de platos/elaboraciones)
// - 'ingredient': Mega Lista y Stock (categorías de ingredientes)
// Así "Carnes" puede tener un icono distinto en cada lado si el negocio quiere,
// pero se mantiene coherente entre los dos apartados que comparten esa misma
// taxonomía. Sin icono elegido, se usa 📁 por defecto.
// Lista amplia a propósito (carnes, pescados/marisco, verduras, frutas,
// lácteos, panadería, especias, postres, bebidas con y sin alcohol, platos
// preparados, utensilios...) para que cualquier categoría de negocio
// encuentre un icono que le encaje, no solo lo más habitual.
const CATEGORY_ICON_CHOICES = [
  // Carnes
  '🥩','🍗','🍖','🥓','🌭','🍤','🍢','🫘',
  // Pescados y marisco
  '🐟','🐠','🐡','🦐','🦀','🦞','🐙','🦑','🍣','🐚',
  // Verduras y hortalizas
  '🥬','🥦','🥒','🌽','🥕','🍅','🍆','🧄','🧅','🥔','🫑','🌶️','🍄','🍠','🥑',
  // Frutas
  '🍎','🍏','🍌','🍇','🍓','🍉','🍊','🍋','🍑','🍒','🍍','🥝','🥭','🍐','🥥','🍈','🫐','🌰','🥜',
  // Lácteos y huevos
  '🥛','🧀','🧈','🥚',
  // Pan, cereales, arroces y pasta
  '🍞','🥐','🥖','🥨','🥯','🌾','🍚','🍙','🍝','🍜','🫓','🧇','🥞',
  // Especias, condimentos y conservas
  '🧂','🌿','🍯','🫒','🥫','🫗',
  // Postres y dulces
  '🍰','🎂','🧁','🍪','🍩','🍫','🍬','🍮','🍦','🍨','🍧','🥧','🍡','🥮',
  // Bebidas sin alcohol
  '🥤','☕','🍵','🧃','🧋','🍶',
  // Bebidas con alcohol
  '🍷','🍺','🍻','🥂','🍸','🍹','🥃','🍾',
  // Platos preparados
  '🍕','🍔','🌮','🌯','🥙','🍟','🥪','🍳','🥘','🍲','🥟','🍛','🍱','🫔','🧆','🍿',
  // Otros / utensilios
  '📦','🔪','🍽️','🥄','🍴','🧊','🥗',
];
function getCategoryIcon(key, ns){
  return (DB.categoryIcons && DB.categoryIcons[ns] && DB.categoryIcons[ns][key]) || '📁';
}
// Aviso de una sola vez (por negocio) para que se sepa que el icono de cada
// carpeta se puede cambiar — hoy el único indicio era el cursor y un title
// al pasar el ratón, poco visible sobre todo en pantallas táctiles. Se
// llama desde las pantallas que muestran carpetas con icono editable
// (Mega Lista, Stock, Escandallo, Fichas Técnicas); tras la primera vez que
// se ve cualquiera de ellas, ya no vuelve a salir.
function maybeShowCategoryIconHint(){
  if(!DB.business || DB.business.categoryIconHintSeen) return;
  DB.business.categoryIconHintSeen = true;
  saveDB();
  showToast(t('msg.categoryIconHint'), 6000);
}
function openCategoryIconModal(key, label, reRenderFn, ns){
  const safeKey = key.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const safeReRender = reRenderFn.replace(/'/g,"\\'");
  openModal(`
    <div class="modal-header">
      <h3>${t('title.chooseFolderIcon')}: ${escapeHtml(label)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:12px">
      ${CATEGORY_ICON_CHOICES.map(e => `<button class="btn btn-sm" style="font-size:22px;padding:8px" onclick="setCategoryIcon('${safeKey}','${e}','${safeReRender}','${ns}')">${e}</button>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="setCategoryIcon('${safeKey}','','${safeReRender}','${ns}')">${t('btn.removeIcon')}</button>
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function setCategoryIcon(key, emoji, reRenderFn, ns){
  if(!DB.categoryIcons) DB.categoryIcons = {recipe:{}, ingredient:{}};
  if(!DB.categoryIcons[ns]) DB.categoryIcons[ns] = {};
  if(emoji) DB.categoryIcons[ns][key] = emoji; else delete DB.categoryIcons[ns][key];
  saveDB();
  closeModal();
  if(typeof window[reRenderFn] === 'function') window[reRenderFn]();
}

function getOpenOrderForTable(tableId){
  return DB.tpvOrders.find(o => o.tableId === tableId && o.status !== 'pagada');
}

function renderTpvCartaSelector(){
  const activeCartas = getActiveCartas();
  const activeIds = DB.activeCartaIds||[];
  // Fijo desde ahora: la carta activa siempre sigue el horario que el
  // propio dueño configuró en Oferta Gastronómica, sin poder desactivarlo
  // ni elegir manualmente qué carta mostrar (evita el despiste de dejarlo
  // en manual sin querer y que se quede una carta vieja puesta).
  const cartaAuto = true;
  const totalPlatos = activeCartas.reduce((s,c)=>s+(c.secciones||[]).reduce((ss,sec)=>ss+(sec.platos||[]).length,0), 0);
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <i class="ti ti-book-2"></i>
      <span style="font-weight:600;font-size:14px">${t('label.activeCartas')}:</span>
      <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1">
        ${DB.cartas.length ? DB.cartas.map(c=>`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="checkbox" ${activeIds.includes(c.id)?'checked':''} ${cartaAuto?'disabled':''} onchange="toggleActiveCarta(${c.id}, this.checked)">
            ${escapeHtml(tItem(c))}
          </label>
        `).join('') : `<span style="font-size:12px;color:var(--muted)">${t('empty.noCartasCreated')}</span>`}
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:not-allowed;color:var(--muted)" title="${t('label.autoSwitchBySchedule.lockedHint')}">
        <input type="checkbox" id="tpv-carta-auto" checked disabled>
        ${t('label.autoSwitchBySchedule')}
      </label>
      <span style="font-size:12px;color:var(--muted)">
        ${activeCartas.length ? (totalPlatos===1 ? t('label.oneDishAvailable') : totalPlatos + ' ' + t('label.dishesAvailable')) : t('label.selectAtLeastOneCarta')}
      </span>
    </div>
  `;
}

function renderTpvMenuSelector(){
  if(!DB.menus.length) return '';
  const activeIds = DB.activeMenuIds||[];
  const cartaAuto = true; // fijo, ver comentario en renderTpvCartaSelector
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <i class="ti ti-list-details"></i>
      <span style="font-weight:600;font-size:14px">${t('label.activeMenus')}:</span>
      <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1">
        ${DB.menus.map(m=>`
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="checkbox" ${activeIds.includes(m.id)?'checked':''} ${cartaAuto?'disabled':''} onchange="toggleActiveMenu(${m.id}, this.checked)">
            ${escapeHtml(tItem(m))} · ${fmtMoney(m.precio)}
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTpvKpis(){
  const todaySalesArr = DB.sales.filter(s => s.date === todayStr());
  const todayTotal = todaySalesArr.reduce((sum,s)=>sum+s.total,0);
  const ticketCount = todaySalesArr.length;
  const avgTicket = ticketCount ? todayTotal/ticketCount : 0;

  const comandasEnCocina = DB.tpvOrders
    .filter(o => o.status !== 'pagada' && !o.cerrada)
    .reduce((s,o) => s + ((o.items||[]).some(l => l.estado === 'cocina' || l.estado === 'preparando') ? 1 : 0), 0);

  return `
    <div class="grid grid-4" style="margin-bottom:14px">
      <div class="kpi ok" style="cursor:pointer" onclick="openTodaySalesModal()" title="${t('tpv.salesToday.clickHint')}">
        <div class="label">${t('label.salesToday')}</div>
        <div class="value">${fmtMoney(todayTotal)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px"><i class="ti ti-list-details"></i> ${t('tpv.salesToday.clickHint')}</div>
      </div>
      <div class="kpi"><div class="label">${t('label.ticketsToday')}</div><div class="value">${ticketCount}</div></div>
      <div class="kpi"><div class="label">${t('label.avgTicketPerCover')}</div><div class="value">${fmtMoney(avgTicket)}</div></div>
      <div class="kpi ${comandasEnCocina ? 'ok' : ''}"><div class="label"><i class="ti ti-tools-kitchen-2"></i> ${t('label.inKitchen')}</div><div class="value">${comandasEnCocina}</div></div>
    </div>
  `;
}

// Zonas heredadas (fijas antiguamente) con traducción propia; cualquier zona
// nueva creada en Mi Negocio → Operativa es simplemente el nombre que le puso
// el negocio (Rango 1, Terraza grande...), sin traducir.
const ZONA_LABEL_KEYS = {interior:'zone.interior', terraza:'zone.terrace', barra:'zone.bar'};
const ZONA_ICONS = {interior:'ti-home', terraza:'ti-sun', barra:'ti-glass-cocktail'};
function zonaLabel(z){ return ZONA_LABEL_KEYS[z] ? t(ZONA_LABEL_KEYS[z]) : z; }
function zonaIconClass(z){ return ZONA_ICONS[z] || 'ti-map-pin'; }

// Orden en el que se muestran las zonas/rangos de mesas en el TPV: el que el
// negocio fue creando (DB.business.zonaOrder), más cualquier zona antigua o
// suelta que exista en las mesas pero no esté todavía en esa lista (para no
// perder mesas de instalaciones anteriores al plano de sala personalizado).
function getZonaOrder(){
  const stored = Array.isArray(DB.business.zonaOrder) ? [...DB.business.zonaOrder] : [];
  const seen = new Set(stored);
  ['interior','terraza','barra'].forEach(z => {
    if(!seen.has(z) && DB.tables.some(t => t.zona === z)){ stored.push(z); seen.add(z); }
  });
  DB.tables.forEach(t => {
    if(t.zona && !seen.has(t.zona)){ stored.push(t.zona); seen.add(t.zona); }
  });
  return stored;
}

// Chip de camarero/a a cargo de la mesa: círculo con su color de identificación
// (el mismo que en Personal/Distribución) y su nombre de pila, para saber de
// un vistazo quién atiende cada mesa sin tener que entrar en ella. Si la
// abrió el propietario (sin PIN de empleado concreto), se muestra un chip
// fijo de "Propietario" en vez de invitar a "asignar camarero" — ya se sabe
// quién la abrió, no hace falta preguntarlo ni ofrecer completarlo.
function mesaWaiterChipHtml(camareroId, openedByOwner){
  if(!camareroId){
    if(!openedByOwner) return '';
    return `
      <span class="mesa-waiter-chip" title="${escapeHtml(t('label.waiter'))}: ${escapeHtml(t('label.owner'))}">
        <span class="mesa-waiter-avatar" style="background:#1C1A17">${escapeHtml(t('label.owner').charAt(0).toUpperCase())}</span>
        ${escapeHtml(t('label.owner'))}
      </span>
    `;
  }
  const emp = DB.employees.find(e => e.id === camareroId);
  if(!emp) return '';
  const initial = (emp.name||'?').trim().charAt(0).toUpperCase();
  const firstName = (emp.name||'').trim().split(/\s+/)[0];
  return `
    <span class="mesa-waiter-chip" title="${escapeHtml(t('label.waiter'))}: ${escapeHtml(emp.name)}">
      <span class="mesa-waiter-avatar" style="background:${emp.color||'#DF7039'}">${escapeHtml(initial)}</span>
      ${escapeHtml(firstName)}
    </span>
  `;
}

// Igual que mesaWaiterChipHtml pero para el repartidor de un pedido delivery
// con reparto propio: mismo estilo de avatar, con un icono de moto delante
// para no confundirlo con el camarero/a que tomó el pedido.
function mesaRepartidorChipHtml(repartidorId, repartidorCourierId){
  // Puede ser un empleado de Sala (con color propio) o un repartidor
  // externo de Mi Negocio → Delivery (sin color de identificación, se usa
  // uno neutro fijo).
  let name, color;
  if(repartidorId){
    const emp = DB.employees.find(e => e.id === repartidorId);
    if(!emp) return '';
    name = emp.name; color = emp.color || '#DF7039';
  } else if(repartidorCourierId){
    const courier = (DB.business && DB.business.ownCouriers || []).find(c => c.id === repartidorCourierId);
    if(!courier) return '';
    name = courier.nombre; color = '#6E5A6B';
  } else {
    return '';
  }
  const initial = (name||'?').trim().charAt(0).toUpperCase();
  const firstName = (name||'').trim().split(/\s+/)[0];
  return `
    <span class="mesa-waiter-chip" title="${escapeHtml(t('label.deliveryRider'))}: ${escapeHtml(name)}">
      <i class="ti ti-moped" style="font-size:11px"></i>
      <span class="mesa-waiter-avatar" style="background:${color}">${escapeHtml(initial)}</span>
      ${escapeHtml(firstName)}
    </span>
  `;
}

// Fase de servicio de una mesa ocupada (la más avanzada de sus platos de
// comida; las bebidas no cuentan, se gestionan aparte desde Sala). Devuelve
// también una clave para pintar la mesa con un acento de color propio de esa
// fase, en vez de un verde plano igual para "recién sentados" que para
// "listos para cobrar".
function mesaPhase(order){
  if(!order) return null;
  // OJO: "servido" exige que TODOS los platos de comida (allFoodLines,
  // incluidos los que aún no tienen ni estado por no haberse marchado nunca)
  // estén entregados — antes solo miraba los que YA tenían estado, así que
  // un plato añadido a la comanda pero nunca enviado a cocina (p.ej. el
  // segundo de un menú aún sin marchar) quedaba excluido del cálculo, y si
  // el resto ya estaba servido la mesa se pintaba como "✅ Servido" en Sala
  // aunque en realidad quedara un plato pendiente de marchar.
  const allFoodLines = (order.items||[]).filter(l => !l.bebida);
  const foodItems = allFoodLines.filter(l => l.estado);
  const allDelivered = allFoodLines.length > 0 && allFoodLines.every(l => l.estado === 'entregado');
  if(allDelivered) return {key:'served', icon:'ti-check', label: t('status.served')};
  const preparing = foodItems.some(l => l.estado === 'preparando');
  if(preparing) return {key:'preparing', icon:'ti-flame', label: t('status.inKitchen')};
  const inKitchen = foodItems.some(l => l.estado === 'cocina');
  if(inKitchen) return {key:'kitchen', icon:'ti-clock', label: t('status.sentToKitchen')};
  const pending = (order.items||[]).some(l => !l.bebida && l.qty > (l.marchada||0));
  if(pending) return {key:'taking', icon:'ti-pencil', label: t('status.takingOrder')};
  return null;
}

function renderMesaCard(table){
  const order = getOpenOrderForTable(table.id);
  const total = order ? orderTotal(order) : 0;
  const hayNuevos = order && (order.items||[]).some(l => l.nuevo);
  const baseName = table.zona ? (table.name||'').replace(/\s*\([^)]*\)\s*$/, '') : table.name;
  // Si esta mesa absorbió otra al fusionarse (ver confirmMergeTable), se
  // muestra "Mesa 3 + Mesa 4" en el propio plano de sala, no solo dentro
  // de la comanda — antes la mesa fusionada desaparecía del plano sin
  // dejar ningún indicio de dónde estaba sentada esa gente.
  const displayName = order && order.mergedTableNames && order.mergedTableNames.length
    ? `${baseName} + ${order.mergedTableNames.join(' + ')}`
    : baseName;

  // Tiempo que lleva abierta la mesa, para detectar mesas "atascadas" de un
  // vistazo (normal en gris, aviso a partir de 60 min, urgente a partir de 120).
  let elapsedHtml = '';
  if(order && order.createdAt){
    const mins = minutesSince(order.createdAt);
    const cls = mins >= 120 ? 'mesa-elapsed-urgent' : mins >= 60 ? 'mesa-elapsed-warn' : 'mesa-elapsed-normal';
    elapsedHtml = `<span class="mesa-elapsed ${cls}" title="${t('label.timeOpen')}"><i class="ti ti-clock"></i> ${mins} min</span>`;
  }

  const phase = mesaPhase(order);
  const phaseClass = order ? `mesa-phase-${phase ? phase.key : 'served'}` : '';
  const waiterChip = order ? mesaWaiterChipHtml(order.camareroId, order.openedByOwner) : '';
  const upcomingRes = !order ? getUpcomingReservationForTable(table.id) : null;
  const upcomingResClient = upcomingRes ? (DB.clients.find(c=>c.id===upcomingRes.clientId)?.name || upcomingRes.clientName || '') : '';

  // "Mesa fría": todo servido pero lleva ya un rato sin que nadie la cobre
  // ni la revise — suele significar que se olvidó, y esa mesa retiene sitio
  // sin necesidad. Solo aplica una vez todos los platos están entregados.
  const MESA_FRIA_MIN = 15;
  let mesaFria = false;
  if(order && phase && phase.key==='served'){
    const entregadoTimes = (order.items||[]).filter(l=>!l.bebida && l.entregadoAt).map(l=>new Date(l.entregadoAt).getTime());
    if(entregadoTimes.length){
      const lastEntregado = Math.max(...entregadoTimes);
      mesaFria = (Date.now() - lastEntregado) / 60000 >= MESA_FRIA_MIN;
    }
  }
  const chaosBlink = (typeof chaosMode !== 'undefined' && chaosMode && order && order.createdAt && minutesSince(order.createdAt) >= 90) ? ' mesa-blink-urgent' : '';

  return `
    <div class="card mesa-card ${order?'mesa-occupied':'mesa-free'} ${phaseClass}${upcomingRes?' mesa-reserved-soon':''}${mesaFria?' mesa-fria':''}${chaosBlink}" style="text-align:center;cursor:pointer;position:relative" onclick="openTableOrder(${table.id})" title="${escapeHtml(table.name)}">
      <div class="mesa-icons-row">
        ${mesaFria ? `<span class="mesa-mini-badge" style="background:var(--blue,#4E5A63);color:#fff" title="${t('tpv.mesaFria.hint')}"><i class="ti ti-snowflake"></i></span>` : ''}
        ${hayNuevos ? `<span class="mesa-mini-badge" title="${t('label.newItemsFromClient')}"><i class="ti ti-bell-ringing"></i></span>` : ''}
        ${order && order.pagado ? `<span class="mesa-mini-badge" title="${t('label.paidOnline')}"><i class="ti ti-credit-card"></i></span>` : ''}
      </div>
      ${elapsedHtml ? `<div class="mesa-elapsed-row">${elapsedHtml}</div>` : ''}
      <div class="mesa-name">${escapeHtml(displayName)}</div>
      ${order
        ? `
          ${phase ? `<div class="mesa-phase-row"><i class="ti ${phase.icon}"></i> <span class="mesa-phase-label">${escapeHtml(phase.label)}</span></div>` : ''}
          <div class="mesa-total">${fmtMoney(total)}</div>
          <div class="mesa-meta-row">
            ${order.pax ? `<span class="mesa-pax"><i class="ti ti-users"></i> ${order.pax}</span>` : ''}
            ${waiterChip}
          </div>
        `
        : `<div class="mesa-status-free"><i class="ti ti-door-enter"></i> ${t('status.free')}</div>
           ${table.plazas ? `<div class="mesa-pax mesa-pax-free"><i class="ti ti-users"></i> ${table.plazas} ${t('common.persAbbr')}</div>` : ''}
           ${upcomingRes ? `<div class="mesa-reservation-hint" title="${escapeHtml(upcomingResClient)}"><i class="ti ti-calendar-event"></i> ${upcomingResClient ? t('label.reservedAtFor').replace('${time}', escapeHtml(upcomingRes.time)).replace('${name}', escapeHtml(upcomingResClient)) : t('label.reservedAt').replace('${time}', escapeHtml(upcomingRes.time))} · ${upcomingRes.people} <i class="ti ti-users"></i></div>` : ''}`}
    </div>
  `;
}

function renderTpvMesas(tiposServicio){
  if(!tiposServicio.mesa) return '';
  const sortedTables = [...DB.tables].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es', {numeric:true}));
  if(!sortedTables.length){
    return `
      <h3 style="margin-top:16px"><i class="ti ti-tools-kitchen-2"></i> ${t("label.tables")}</h3>
      <div class="grid grid-4"><div class="empty">${t('empty.tables')}</div></div>
    `;
  }

  // Si hay mesas con zona asignada (interior/terraza/barra), las agrupamos en
  // secciones; las mesas sin zona (creadas manualmente) van en un grupo aparte.
  const hasZonas = sortedTables.some(t => t.zona);
  if(!hasZonas){
    return `
      <h3 style="margin-top:16px"><i class="ti ti-tools-kitchen-2"></i> ${t("label.tables")}</h3>
      <div class="grid grid-mesas">${sortedTables.map(renderMesaCard).join('')}</div>
    `;
  }

  const zonas = getZonaOrder();
  let html = '';
  zonas.forEach(z => {
    const tables = sortedTables.filter(t => t.zona === z);
    if(!tables.length) return;
    html += `
      <h3 style="margin-top:16px"><i class="ti ${zonaIconClass(z)}"></i> ${escapeHtml(zonaLabel(z))}</h3>
      <div class="grid grid-mesas">${tables.map(renderMesaCard).join('')}</div>
    `;
  });
  const sinZona = sortedTables.filter(t => !t.zona);
  if(sinZona.length){
    html += `
      <h3 style="margin-top:16px"><i class="ti ti-tools-kitchen-2"></i> Otras mesas</h3>
      <div class="grid grid-mesas">${sinZona.map(renderMesaCard).join('')}</div>
    `;
  }
  return html;
}

function renderTpvToGo(tiposServicio){
  // Este canal se muestra siempre que el negocio tenga para llevar o
  // delivery dado de alta — no solo cuando hay algún pedido abierto — para
  // que sea un sitio fijo y predecible donde mirar. Se muestra con el mismo
  // estilo de sección que las mesas (mismo tipo de encabezado y rejilla), no
  // como un panel aparte, para que no se lea como "algo distinto".
  if(tiposServicio.takeaway === false && tiposServicio.delivery === false) return '';
  const toGoOrders = DB.tpvOrders.filter(o => o.status !== 'pagada' && o.status !== 'pendiente-online' && (o.tipo==='takeaway'||o.tipo==='delivery') && isTogoOrderVisibleNow(o));
  // Los pedidos sin hora programada (ASAP) van primero; el resto, por hora
  // programada ascendente, para que el personal vea antes lo más urgente.
  toGoOrders.sort((a,b) => {
    const ma = a.time ? (reservaTimeToMinutes(a.time) ?? 9999) : -1;
    const mb = b.time ? (reservaTimeToMinutes(b.time) ?? 9999) : -1;
    return ma - mb;
  });
  const pedidosOnlineOn = DB.business.pedidosOnlineActivos !== false;
  const pendingCount = getPendingOnlineOrders().length;
  // Mientras el personal no haya elegido pestaña a mano, se sigue el
  // contenido: en cuanto llega algo por aceptar, la vista salta sola a
  // "Pendientes" (para que no pase desapercibido); si no hay nada pendiente,
  // se queda en "En curso". Elegir una pestaña a mano (setTogoTabManual) dejar
  // de seguir esto hasta que se recargue la pantalla.
  if(!togoTabManual) togoTab = pendingCount ? 'pendientes' : 'activos';
  return `
    <h3 style="margin-top:16px;display:flex;align-items:center;flex-wrap:nowrap;gap:8px;overflow-x:auto">
      <span style="white-space:nowrap"><i class="ti ti-shopping-bag"></i> ${t('title.togoDelivery')}</span>
      <button class="btn btn-sm ${pedidosOnlineOn?'btn-primary':'btn-danger'}" id="tpv-online-toggle-btn" style="white-space:nowrap;margin-left:auto" onclick="toggleOnlineOrdersSwitch()" title="${t('tpv.onlineOrdersSwitchHint')}">
        <i class="ti ${pedidosOnlineOn?'ti-toggle-right':'ti-toggle-left'}"></i> ${t('tpv.onlineOrders')}: ${pedidosOnlineOn?t('common.on'):t('common.off')}
      </button>
      ${getActiveRepartosOrders().length ? `<button class="btn btn-sm btn-primary" style="white-space:nowrap" onclick="openRepartosControlModal()"><i class="ti ti-moped"></i> ${t('title.repartosControl')} (${getActiveRepartosOrders().length})</button>` : `<button class="btn btn-sm" style="white-space:nowrap" onclick="openRepartosControlModal()"><i class="ti ti-moped"></i> ${t('title.repartosControl')}</button>`}
      <button class="btn btn-sm" style="white-space:nowrap" onclick="openTogoCalendarModal()"><i class="ti ti-calendar-stats"></i> ${t('title.togoCalendar')}</button>
    </h3>
    <div style="display:flex;gap:6px;margin:10px 0">
      <button class="btn btn-sm ${togoTab==='pendientes'?'btn-primary':''}" onclick="setTogoTabManual('pendientes')"><i class="ti ti-bell-ringing"></i> ${t('tab.pendingOnline')}${pendingCount ? ` <span class="badge badge-amber">${pendingCount}</span>` : ''}</button>
      <button class="btn btn-sm ${togoTab==='activos'?'btn-primary':''}" onclick="setTogoTabManual('activos')"><i class="ti ti-list-check"></i> ${t('tab.activeTogoOrders')}${toGoOrders.length ? ` <span class="badge ${pedidosOnlineOn?'badge-blue':'badge-red'}">${toGoOrders.length}</span>` : ''}</button>
    </div>
    ${!pedidosOnlineOn ? `<div class="manual-warning" style="margin:10px 0"><i class="ti ti-alert-triangle"></i> ${t('tpv.onlineOrdersPausedWarning')}</div>` : ''}
    ${togoTab === 'pendientes' ? renderTpvPendingOnline() : (!toGoOrders.length
      ? `<div class="grid grid-4" style="margin-top:14px"><div class="empty"><i class="ti ti-moped"></i>${t('empty.noTogoOrders')}</div></div>`
      : `<div class="grid grid-togo" style="margin-top:14px">${toGoOrders.map(o => {
          const plat = o.tipo==='delivery' && o.plataformaId ? (DB.business.deliveryPlatforms||[]).find(p=>p.id===o.plataformaId) : null;
          const dueMins = o.time ? minutesUntilScheduled(o.time) : null;
          const urgent = dueMins !== null && dueMins <= 30;
          const isDelivery = o.tipo==='delivery';
          // Sin chip de camarero aquí: estos pedidos entran por teléfono o
          // por la web, no los toma nadie de sala en persona.
          const repartidorChip = isDelivery ? mesaRepartidorChipHtml(o.repartidorId, o.repartidorCourierId) : '';
          const metodoPagoLabel = o.metodoPagoLocal === 'tarjeta' ? t('pay.card') : o.metodoPagoLocal === 'efectivo' ? t('pay.cash') : null;
          return `
          <div class="card togo-order-card ${urgent?'togo-order-urgent':''}" onclick="openTableOrder(null, ${o.id})">
            <div class="togo-order-row togo-order-row-top">
              <span class="badge ${isDelivery?'badge-blue':'badge-amber'}"><i class="ti ${isDelivery?'ti-moped':'ti-walk'}"></i> ${isDelivery?t('label.deliveryShort'):t('label.pickupOrder')}</span>
              ${o.time ? `<span class="badge"><i class="ti ti-clock"></i> ${escapeHtml(o.time)}</span>` : ''}
              ${urgent ? `<span class="badge badge-red"><i class="ti ti-alarm"></i> ${t('label.dueSoon')}</span>` : ''}
            </div>
            <strong class="togo-order-client">${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</strong>
            ${(o.clienteDireccion||o.clienteAddress) ? `<div class="togo-order-address"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteDireccion||o.clienteAddress)}</div>` : ''}
            <div class="togo-order-row">
              <span class="togo-order-price">${fmtMoney(orderTotal(o))}</span>
              ${o.pagado ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}</span>` : `<span class="badge badge-amber"><i class="ti ti-clock-exclamation"></i> ${t('label.paymentPending')}</span>`}
              ${metodoPagoLabel ? `<span class="badge"><i class="ti ${o.metodoPagoLocal==='tarjeta'?'ti-credit-card':'ti-cash'}"></i> ${metodoPagoLabel}</span>` : ''}
            </div>
            ${isDelivery ? `<div class="togo-order-row">
              <span class="badge">${plat ? escapeHtml(plat.nombre) : t('label.directOrder')}</span>
              ${repartidorChip}
            </div>` : ''}
          </div>
        `}).join('')}</div>`)}
  `;
}

/* ============================================================
   CALENDARIO DE PEDIDOS PROGRAMADOS (Take Away / Delivery)
   Un pedido para llevar/delivery ya aceptado y programado para dentro de
   varios días no aparece en la pantalla principal (ver
   TOGO_VISIBILITY_WINDOW_MIN más abajo, a propósito para no saturarla), así
   que sin esto no había forma de ver de un vistazo cuántos pedidos hay ya
   comprometidos para un día/semana/mes concreto — solo lo del día a día.
   ============================================================ */
let togoCalMode = 'mes'; // 'dia'|'semana'|'mes'
let togoCalDate = null; // Date del día de referencia (hoy al abrir)
function togoOrdersForDate(dateStr){
  return (DB.tpvOrders||[]).filter(o => o.status !== 'pagada' && (o.tipo==='takeaway'||o.tipo==='delivery') && (o.date||todayStr())===dateStr);
}
function openTogoCalendarModal(){
  togoCalMode = 'mes';
  togoCalDate = new Date();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-calendar-stats"></i> ${t('title.togoCalendar')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div id="togo-cal-body"></div>
  `, {xl:true});
  renderTogoCalendarBody();
}
function setTogoCalMode(mode){ togoCalMode = mode; renderTogoCalendarBody(); }
function shiftTogoCal(delta){
  const d = new Date(togoCalDate);
  if(togoCalMode==='dia') d.setDate(d.getDate()+delta);
  else if(togoCalMode==='semana') d.setDate(d.getDate()+delta*7);
  else d.setMonth(d.getMonth()+delta);
  togoCalDate = d;
  renderTogoCalendarBody();
}
function renderTogoCalendarBody(){
  const box = document.getElementById('togo-cal-body');
  if(!box) return;
  const modeBtns = ['dia','semana','mes'].map(m => `<button class="btn btn-sm ${togoCalMode===m?'btn-primary':''}" onclick="setTogoCalMode('${m}')">${t('togocal.'+m)}</button>`).join('');
  let gridHtml = '', label = '', dayListHtml = '';
  if(togoCalMode==='mes'){
    const year = togoCalDate.getFullYear(), month = togoCalDate.getMonth();
    label = `${t('months.short')[month]} ${year}`;
    const firstDow = (new Date(year, month, 1).getDay()+6)%7; // 0=lunes
    const nDias = daysInMonth(year, month);
    let cells = '';
    for(let i=0;i<firstDow;i++) cells += `<div></div>`;
    for(let d=1; d<=nDias; d++){
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const n = togoOrdersForDate(ds).length;
      const isToday = ds === todayStr();
      cells += `
        <div class="card cal-day-cell" style="cursor:pointer;padding:8px;text-align:center;min-width:0;${isToday?'border-color:var(--brand-orange)':''}" onclick="togoCalDate=new Date('${ds}T00:00:00');setTogoCalMode('dia')">
          <div style="font-weight:700">${d}</div>
          ${n ? `<span class="badge badge-blue cal-day-badge">${n===1?t('togocal.oneOrder'):t('togocal.nOrders').replace('${n}', n)}</span>` : ''}
        </div>`;
    }
    gridHtml = `<div class="cal-grid">${cells}</div>`;
  }else if(togoCalMode==='semana'){
    const dow = (togoCalDate.getDay()+6)%7;
    const monday = new Date(togoCalDate); monday.setDate(togoCalDate.getDate()-dow);
    const days = Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });
    label = `${dateStr(days[0])} — ${dateStr(days[6])}`;
    let cells = '';
    days.forEach(d => {
      const ds = dateStr(d);
      const n = togoOrdersForDate(ds).length;
      const isToday = ds === todayStr();
      cells += `
        <div class="card cal-day-cell" style="cursor:pointer;padding:8px;text-align:center;min-width:0;${isToday?'border-color:var(--brand-orange)':''}" onclick="togoCalDate=new Date('${ds}T00:00:00');setTogoCalMode('dia')">
          <div style="font-weight:700">${t('days.short')[(d.getDay()+6)%7]} ${d.getDate()}</div>
          ${n ? `<span class="badge badge-blue cal-day-badge">${n===1?t('togocal.oneOrder'):t('togocal.nOrders').replace('${n}', n)}</span>` : ''}
        </div>`;
    });
    gridHtml = `<div class="cal-grid" style="grid-template-columns:repeat(7,1fr)">${cells}</div>`;
  }else{
    const ds = dateStr(togoCalDate);
    label = ds;
    const orders = togoOrdersForDate(ds).sort((a,b) => (a.time||'').localeCompare(b.time||''));
    dayListHtml = orders.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>${t('common.time')}</th><th>${t('th.client')}</th><th>${t('common.type')}</th><th>${t('common.total')}</th><th>${t('label.paidOnline')}</th></tr></thead>
        <tbody>${orders.map(o => `<tr style="cursor:pointer" onclick="closeModal();openTableOrder(null, ${o.id})">
          <td>${escapeHtml(o.time||'—')}</td><td>${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</td>
          <td>${o.tipo==='delivery'?t('label.deliveryShort'):t('label.pickupOrder')}</td><td>${fmtMoney(orderTotal(o))}</td>
          <td>${o.pagado ? `<span class="badge badge-green">${t('common.yes')}</span>` : `<span class="badge badge-amber">${t('common.no')}</span>`}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty"><i class="ti ti-calendar-off"></i>${t('togocal.emptyDay')}</div>`;
  }
  box.innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${modeBtns}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px">
      <button class="btn btn-sm btn-icon" onclick="shiftTogoCal(-1)"><i class="ti ti-chevron-left"></i></button>
      <span style="font-size:15px;font-weight:700">${label}</span>
      <button class="btn btn-sm btn-icon" onclick="shiftTogoCal(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    ${gridHtml}${dayListHtml}
  `;
}

// Minutos que faltan para la hora programada de un pedido (hoy); null si no
// se puede calcular. Se usa para ordenar y para marcar como "urgente" los
// pedidos para llevar/delivery cuya hora programada está cerca.
function minutesUntilScheduled(time){
  const mins = reservaTimeToMinutes ? reservaTimeToMinutes(time) : null;
  if(mins == null) return null;
  const now = new Date();
  return mins - (now.getHours()*60 + now.getMinutes());
}

// Un pedido para llevar/delivery (venga de la Central de Pedidos y Reservas
// o creado a mano en el TPV) solo debe aparecer en pantalla desde una hora
// antes de su recogida/entrega programada: si alguien lo hizo con dos
// semanas de antelación, no tiene sentido que ocupe sitio en el TPV todos
// esos días — debe aparecer justo cuando ya toca prepararlo.
const TOGO_VISIBILITY_WINDOW_MIN = 60;
function isTogoOrderVisibleNow(o){
  const today = todayStr();
  if(o.date && o.date > today) return false;
  if(!o.time) return true;
  if(o.date && o.date < today) return true;
  const dueMins = minutesUntilScheduled(o.time);
  return dueMins === null || dueMins <= TOGO_VISIBILITY_WINDOW_MIN;
}

// Pestaña activa dentro de Para Llevar/Delivery: 'activos' (pedidos ya
// aceptados/en curso) o 'pendientes' (recién llegados, esperando aceptar o
// rechazar). Antes los pendientes se mostraban en su propia sección arriba
// de TODO el TPV, lejos del interruptor de Pedidos Online y de la sección
// de Para Llevar/Delivery a la que en realidad pertenecen.
let togoTab = 'pendientes';
let togoTabManual = false;
function setTogoTabManual(tabName){
  togoTab = tabName;
  togoTabManual = true;
  renderTPV();
}
function getPendingOnlineOrders(){
  return DB.tpvOrders.filter(o => o.status === 'pendiente-online' && isTogoOrderVisibleNow(o));
}
function renderTpvPendingOnline(){
  const pendingOnline = getPendingOnlineOrders();
  if(!pendingOnline.length) return `<div class="grid grid-4" style="margin-top:14px"><div class="empty"><i class="ti ti-bell-ringing"></i>${t('empty.noPendingOnline')}</div></div>`;
  return `
    <div class="grid grid-4" style="margin-top:14px">
      ${pendingOnline.map(o => `
        <div class="card" style="border:2px solid var(--brand-orange)">
          <h3 style="justify-content:space-between;font-size:14px">
            <span><i class="ti ${o.tipo==='delivery'?'ti-moped':'ti-shopping-bag'}"></i> ${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</span>
            <span class="badge badge-amber">${t('badge.newF')}</span>
          </h3>
          ${(() => {
            const waitMin = o.createdAt ? minutesSince(o.createdAt) : 0;
            if(waitMin < 30) return '';
            return `<div style="font-size:12px;color:var(--red);margin-bottom:2px"><i class="ti ti-clock-exclamation"></i> ${t('label.waitingSince').replace('${min}', waitMin)}</div>`;
          })()}
          ${o.pendienteVerificarZona ? `<div style="font-size:12px;color:var(--brand-orange);margin:2px 0"><i class="ti ti-alert-triangle"></i> ${t('label.zoneNotVerified')}</div>` : ''}
          ${o.pagado ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}</span>` : ''}
          ${o.clienteTelefono ? `<div style="font-size:12px;color:${o.phoneOdd?'var(--red)':'var(--muted)'}"><i class="ti ti-phone"></i> ${escapeHtml(o.clienteTelefono)}${o.phoneOdd ? ` <i class="ti ti-alert-triangle" title="${t('msg.phoneLooksOdd')}"></i>` : ''}</div>` : ''}
          ${o.time ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-clock"></i> ${t('label.scheduledFor')} ${escapeHtml(o.time)}${o.date && o.date !== todayStr() ? ' (' + escapeHtml(o.date) + ')' : ''}</div>` : ''}
          ${o.clienteDireccion ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteDireccion)}${o.clienteCodigoPostal ? ' (' + escapeHtml(o.clienteCodigoPostal) + ')' : ''}</div>` : ''}
          <div style="margin:8px 0;font-size:13px">
            ${(o.items||[]).map(l => `${l.qty}× ${escapeHtml(l.name)}`).join('<br>')}
          </div>
          ${o.notas ? `<div style="font-size:12px;color:var(--muted);margin-bottom:6px"><i class="ti ti-note"></i> ${escapeHtml(o.notas)}</div>` : ''}
          <div style="font-weight:700;font-size:18px;margin-bottom:8px">${fmtMoney(orderTotal(o))}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="acceptOnlineOrder(${o.id})"><i class="ti ti-check"></i> ${t('common.accept')}</button>
            <button class="btn btn-sm btn-danger" style="flex:1" onclick="rejectOnlineOrder(${o.id})"><i class="ti ti-x"></i> ${t('common.reject')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTPV(){
  markTpvSeen();
  migrateCartas();
  const box = document.getElementById('tpv-content');
  const tiposServicio = (DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true};

  // Orden de arriba a abajo: primero los botones de acciones rápidas (como
  // estaban antes), luego las cifras del día, las mesas, y al final Para
  // Llevar/Delivery — todo en una sola pantalla sin paneles aparte.
  box.innerHTML = `
    <div class="toolbar">
      <div class="left"></div>
      <button class="btn ${(DB.waitlist||[]).filter(w=>w.status==='esperando').length ? 'btn-primary':''}" onclick="openWaitlistModal()"><i class="ti ti-users-group"></i> ${t('waitlist.btn')}${(DB.waitlist||[]).filter(w=>w.status==='esperando').length ? ` (${(DB.waitlist||[]).filter(w=>w.status==='esperando').length})` : ''}</button>
      <button class="btn ${chaosMode?'btn-danger':''}" onclick="toggleChaosMode()" title="${t('tpv.chaos.hint')}"><i class="ti ti-flame"></i> ${t('tpv.chaos.btn')}</button>
      <button class="btn" onclick="openVoidLogModal()"><i class="ti ti-alert-triangle"></i> ${t('title.voidLog')}</button>
      <button class="btn" onclick="openMarkDishOutModal()"><i class="ti ti-flame-off"></i> ${t('btn.markDishOut')}</button>
      <button class="btn" onclick="openCashClosureHistory()"><i class="ti ti-history"></i> ${t('title.cashHistory')}</button>
      <button class="btn" id="tpv-close-cash-btn" onclick="openCashClosureModal()"><i class="ti ti-cash-register"></i> ${t('btn.cashClose')}</button>
    </div>
    ${renderTpvKpis()}
    ${renderTpvCartaSelector()}
    ${renderTpvMenuSelector()}
    ${renderLastCallBanner()}
    <div id="tpv-mesas-section">${chaosMode ? renderChaosModeMesas() : renderTpvMesas(tiposServicio)}</div>
    <div id="tpv-togo-section">${renderTpvToGo(tiposServicio)}</div>
  `;
}

// "Modo caos": en vez de las mesas agrupadas por zona, una única lista con
// solo las mesas ocupadas, ordenada por la que lleva más tiempo esperando
// primero — para saber siempre qué sacar antes en una hora punta, sin tener
// que ir zona por zona calculando de memoria quién llegó antes.
let chaosMode = false;
function toggleChaosMode(){
  chaosMode = !chaosMode;
  renderTPV();
}
function renderChaosModeMesas(){
  const occupied = DB.tables
    .map(table => ({table, order: getOpenOrderForTable(table.id)}))
    .filter(x => x.order);
  if(!occupied.length){
    return `<h3 style="margin-top:16px"><i class="ti ti-flame"></i> ${t('tpv.chaos.title')}</h3><div class="empty"><i class="ti ti-mood-smile"></i>${t('tpv.chaos.empty')}</div>`;
  }
  occupied.sort((a,b) => new Date(a.order.createdAt) - new Date(b.order.createdAt));
  return `
    <h3 style="margin-top:16px"><i class="ti ti-flame"></i> ${t('tpv.chaos.title')}</h3>
    <div class="grid grid-mesas">${occupied.map(x => renderMesaCard(x.table)).join('')}</div>
  `;
}

function renderLastCallBanner(){
  try{
    const horarioHoy = (DB.business.horario||[])[new Date().getDay()===0?6:new Date().getDay()-1];
    if(!horarioHoy || horarioHoy.abierto===false) return '';
    const tramos = horarioHoy.modo==='seguido' ? [horarioHoy.seguido] : (horarioHoy.turnos||[]);
    const toMin = hhmm => { const [h,m] = (hhmm||'').split(':').map(Number); return isNaN(h)?null:h*60+(m||0); };
    const now = new Date();
    const nowMin = now.getHours()*60+now.getMinutes();
    const closingsSoon = tramos
      .map(tr => toMin(tr && tr.fin))
      .filter(fin => fin!=null && fin - nowMin > 0 && fin - nowMin <= 30);
    if(!closingsSoon.length) return '';
    const minsLeft = Math.min(...closingsSoon.map(fin => fin - nowMin));
    return `<div class="card" style="border:2px solid var(--red);background:var(--red-l);margin-bottom:10px;padding:10px 14px;display:flex;align-items:center;gap:8px"><i class="ti ti-clock-exclamation" style="font-size:20px;color:var(--red)"></i><span style="font-size:13.5px">${t('tpv.lastCall.msg').replace('${n}', minsLeft)}</span></div>`;
  }catch(e){ return ''; }
}

// Busca un plato por nombre (comparación insensible a mayúsculas/tildes) en
// las cartas activas ahora mismo, para poder avisar si un pedido online se
// pidió con un precio o disponibilidad que ya no coincide con la carta.
function findActiveDishByName(name){
  const norm = stripAccents(String(name||'').trim().toLowerCase());
  if(!norm) return null;
  for(const c of getActiveCartas()){
    for(const sec of (c.secciones||[])){
      for(const p of (sec.platos||[])){
        if(stripAccents(String(p.nombre||'').trim().toLowerCase()) === norm) return p;
      }
    }
  }
  return null;
}

// Interruptor de emergencia para cuando la cocina va desbordada: con los
// pedidos online en OFF, la web pública deja de aceptar Take Away/Delivery
// (avisando al cliente de que lo intente en unos minutos) y, por si llega
// alguno de todos modos por una carrera de tiempos, se queda en la bandeja
// de pendientes en vez de descartarse. Vuelve a ON por defecto: apagarlo es
// una decisión explícita del negocio, nunca el estado de partida.
function toggleOnlineOrdersSwitch(){
  DB.business.pedidosOnlineActivos = DB.business.pedidosOnlineActivos === false ? true : false;
  saveDB();
  renderTPV();
}

// `auto` distingue la aceptación automática (interruptor de Pedidos Online
// en ON, ver renderTpvToGo) de la manual desde la bandeja de pendientes: en
// automático nunca se puede mostrar un confirm() a nadie, así que si hay un
// desajuste de precio/disponibilidad en un pedido YA PAGADO (tarjeta virtual)
// se deja tal cual en pendiente-online para que el personal lo revise a
// mano — es el único caso en el que el auto-aceptar no acepta.
async function acceptOnlineOrder(orderId, auto){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return false;
  if(order.tipo === 'takeaway' || order.tipo === 'delivery'){
    // Comprobación de precio/disponibilidad frente a la carta activa actual,
    // ANTES de tocar nada: si el pedido ya está pagado (Redsys) y hay algún
    // desajuste, el personal debe confirmarlo explícitamente, porque al
    // cliente ya se le ha cobrado un importe que puede no coincidir con lo
    // que realmente se le va a servir.
    let anyMismatch = false;
    (order.items||[]).forEach(l => {
      const dish = findActiveDishByName(l.name);
      if(!dish || dish.disponible === false || (typeof dish.precio === 'number' && Math.abs(dish.precio - l.price) > 0.001)){
        anyMismatch = true;
      }
    });
    if(anyMismatch && order.pagado){
      if(auto) return false;
      if(!(await confirmModal(t('msg.confirmAcceptPaidMismatch'), {danger:true, confirmLabel:t('common.accept')}))) return false;
    }

    order.status = 'abierta';
    const ahora = new Date().toISOString();
    (order.items||[]).forEach(l => {
      const dish = findActiveDishByName(l.name);
      l.priceMismatch = false;
      l.unavailableNow = false;
      if(!dish){
        l.unavailableNow = true;
      }else{
        if(dish.disponible === false) l.unavailableNow = true;
        if(typeof dish.precio === 'number' && Math.abs(dish.precio - l.price) > 0.001) l.priceMismatch = true;
      }
      if(!l.estado){
        l.estado = 'cocina';
        delete l.recogidoAt;
        l.enviadoAt = ahora;
        l.marchada = l.qty;
        if(dish && !l.bebida) decrementDishStock(dish.id, l.qty);
      }
    });
    order.cerrada = false;
    if(esRepartoPropio(order)) autoAssignRepartidor(order);
    saveDB();
    if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
    if(!auto){ renderTPV(); showToast(anyMismatch ? t('msg.orderAcceptedWithMismatch') : t('msg.orderAccepted')); }
    return true;
  }
  order.status = 'abierta';
  saveDB();
  if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
  if(!auto){ renderTPV(); showToast(t('msg.orderAccepted')); }
  return true;
}

function rejectOnlineOrder(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  requestBusinessPinAction(t('title.rejectOrder'), t('msg.confirmRejectOrder'), () => {
    if(typeof sendOrderCancellationEmail === 'function') sendOrderCancellationEmail(order).catch(()=>{});
    // Se avisa ANTES de mover a la papelera/borrar: una vez borrado ya no
    // queda order.clientRef al que asociar el aviso.
    if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order, 'rechazado');
    moveToTrash('order', order);
    logAudit('delete', t('audit.rejectedOnlineOrder').replace('${name}', order.clienteNombre||'?'), 'critical');
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== orderId);
    saveDB();
    renderTPV();
    showToast(t('msg.orderRejected'));
  });
}

// A diferencia de rejectOnlineOrder (que solo aplica a un pedido AÚN pendiente
// de aceptar), esto cancela un pedido para llevar/delivery que YA está
// aceptado y en marcha (p.ej. se ha quedado sin un ingrediente a mitad de
// servicio). Igual que rechazar, pide PIN por ser una acción sensible que
// borra el pedido, y avisa al cliente por email si dejó su dirección.
function cancelAcceptedOnlineOrder(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  requestBusinessPinAction(t('title.cancelOrder'), t('msg.confirmCancelOrder'), () => {
    if(typeof sendOrderCancellationEmail === 'function') sendOrderCancellationEmail(order).catch(()=>{});
    // El stock ya se había descontado al aceptar el pedido (líneas ya
    // "marchadas" arriba) — al cancelarlo hay que devolverlo, si no el
    // contador de raciones/ingredientes queda corto para siempre.
    restockForVoidedItems(order.items);
    if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order, 'rechazado');
    moveToTrash('order', order);
    logAudit('delete', t('audit.cancelledOnlineOrder').replace('${name}', order.clienteNombre||'?'), 'critical');
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== orderId);
    saveDB();
    closeModal();
    renderTPV();
    showToast(t('msg.orderCancelled'));
  });
}

// Pide el PIN del negocio antes de ejecutar una acción sensible (rechazar un
// pedido online, borrar una mesa...), en vez de un simple confirm().
let businessPinPendingAction = null;
function requestBusinessPinAction(title, desc, actionFn){
  businessPinPendingAction = actionFn;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${escapeHtml(title)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${escapeHtml(desc)}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="biz-pin-action-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmBusinessPinAction()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmBusinessPinAction()">${t('common.confirm')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('biz-pin-action-input')?.focus(), 50);
}
function confirmBusinessPinAction(){
  const val = document.getElementById('biz-pin-action-input').value;
  const bp = DB.business.pin;
  const match = pinMatchesHash(val, bp);
  if(!match){ showToast(t('msg.pinIncorrect')); return; }
  const fn = businessPinPendingAction;
  businessPinPendingAction = null;
  closeModal();
  // El PIN ya validado se pasa a la acción — las "really*" más sensibles
  // (anular venta, borrar empleado/ingrediente/elaboración, borrar/revertir
  // pedido) lo vuelven a comprobar ellas mismas, para que el PIN sea una
  // protección real de la función y no solo de este modal: llamarlas
  // directamente desde la consola sin conocer el PIN ya no funciona.
  if(fn) fn(val);
}

// Ventas cerradas atendidas por un camarero/a en un conjunto de fechas
// (para Personal → Fichar), a partir del camareroId guardado en cada venta.
function camareroSalesInRange(empId, dateStrs){
  const dateSet = new Set(dateStrs);
  const sales = DB.sales.filter(s => s.camareroId === empId && dateSet.has(s.date));
  return {count: sales.length, total: sales.reduce((sum,s) => sum + (s.total||0), 0)};
}

// Selector de camarero/a que toma la comanda, para REASIGNAR el de una mesa
// ya abierta (quien la abre se asigna solo, sin preguntar nada — ver
// confirmOpenTableOrder). Se deja "sin asignar" como opción, por si hace
// falta corregirlo o dejarlo libre temporalmente.
function renderCamareroFieldHtml(selectId, selectedId){
  // Solo empleados del área sala que sean camareros
  const camareros = DB.employees.filter(e => (e.area||'cocina') === 'sala');
  if(!camareros.length) return '';
  return `
    <div class="field">
      <label>${t('label.waiter')}</label>
      <select id="${selectId}">
        <option value="">${t('common.unassigned')}</option>
        ${camareros.map(e => `<option value="${e.id}" ${e.id===selectedId?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>
  `;
}

// Repartidor a cargo del reparto propio de un pedido delivery (distinto del
// camarero/a que tomó el pedido): mismo pool de empleados de Sala, campo
// aparte y opcional, para no confundir "quién lo atendió" con "quién lo lleva".
// El repartidor puede ser un empleado de Sala (con PIN/color, ya dado de
// alta en Personal) o uno de los "repartidores propios" de Mi Negocio
// (colaboradores externos, solo nombre y teléfono, con acceso rápido a
// WhatsApp) — antes esa segunda lista se guardaba y editaba en Mi Negocio
// pero nunca aparecía aquí, así que no tenía ningún efecto real.
function renderRepartidorFieldHtml(selectId, selectedValue){
  const empleados = DB.employees.filter(e => (e.area||'cocina') === 'sala');
  const couriers = (DB.business && DB.business.ownCouriers) || [];
  if(!empleados.length && !couriers.length) return '';
  return `
    <div class="field">
      <label>${t('label.deliveryRider')}</label>
      <select id="${selectId}">
        <option value="">${t('common.unassigned')}</option>
        ${empleados.length ? `<optgroup label="${t('label.staff')}">${empleados.map(e => `<option value="emp:${e.id}" ${selectedValue===`emp:${e.id}`?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}</optgroup>` : ''}
        ${couriers.length ? `<optgroup label="${t('mn.couriers.title')}">${couriers.map(c => `<option value="courier:${c.id}" ${selectedValue===`courier:${c.id}`?'selected':''}>${escapeHtml(c.nombre)}</option>`).join('')}</optgroup>` : ''}
      </select>
    </div>
  `;
}

// A partir del valor del <select> (emp:123 / courier:456), devuelve
// {repartidorId, repartidorCourierId} listos para guardar en el pedido.
function parseRepartidorFieldValue(raw){
  if(!raw) return {repartidorId:null, repartidorCourierId:null};
  if(raw.startsWith('emp:')) return {repartidorId: parseInt(raw.slice(4)), repartidorCourierId:null};
  if(raw.startsWith('courier:')) return {repartidorId:null, repartidorCourierId: parseInt(raw.slice(8))};
  return {repartidorId:null, repartidorCourierId:null};
}

function orderTotal(order){
  return (order.items||[]).reduce((sum, line) => sum + line.price * line.qty, 0) + (order.costeEnvio || 0);
}

// Cuánto de esta comanda ya se cobró aparte, por móvil, antes de llegar a
// caja (autopedido de mesa con "Pagar ahora", QR por comensal — ver la rama
// 'pedido' tipo 'mesa' en initPublicRequestsListener, js/core.js). Solo
// cuenta lo YA CONFIRMADO por el banco (line.pagadoOnline), nunca lo
// pendiente de confirmar (line.pagoOnlinePendiente) — así un pago que
// fallara o nunca llegase a confirmarse no le regala comida a nadie.
// orderTotal() sigue representando el valor total de lo servido (para
// contabilidad); esto es aparte, para saber cuánto queda por cobrar en caja.
function orderAmountPaidOnline(order){
  const itemsPaid = (order.items||[]).filter(l => l.pagadoOnline).reduce((sum, l) => sum + l.price * l.qty, 0);
  // order.depositAmount: señal de la reserva vinculada, ya cobrada aparte
  // (ver confirmOpenTableOrder) — se resta igual que lo pagado por móvil,
  // para que el cliente no la pague dos veces al cobrar la mesa.
  return itemsPaid + (order.propinaPagadaOnline || 0) + (order.depositAmount || 0);
}

// Coste real de ingredientes de todo lo vendido en un pedido/venta, a
// partir del escandallo de cada receta — para saber el margen real de esa
// mesa concreta, no solo lo cobrado. Solo cuenta líneas con receta
// vinculada; lo que no tiene receta (p.ej. un extra manual) no suma coste.
function orderFoodCost(order){
  return (order.items||[]).reduce((sum, line) => {
    // Usa el coste estampado en la venta (costeUnitario/costeUnitario por
    // selección de menú) si ya existe — pedido todavía abierto sin cobrar
    // (nunca lo tiene) cae al cálculo en vivo de siempre.
    let costePorUnidad = 0;
    if(line.recipeId) costePorUnidad = costoUnitarioDeLinea(line);
    else if(Array.isArray(line.menuSelections)){
      costePorUnidad = line.menuSelections.reduce((s,sel) => {
        if(!sel.recipeId) return s;
        if(sel.costeUnitario != null) return s + sel.costeUnitario;
        const r = getRecipe(sel.recipeId);
        return s + (r ? recipeCost(r) : 0);
      }, 0);
    }
    return sum + costePorUnidad * line.qty;
  }, 0);
}

// Etiqueta del pedido para TPV, cocina y ticket: los tickets rápidos de mostrador se llaman "Pedido Express".
function togoOrderLabel(order){
  if(order.express) return t('title.expressOrder');
  return order.tipo==='delivery' ? t('label.deliveryShort') : t('label.takeawayShort');
}

function openTableOrder(tableId, orderId){
  if(orderId){
    renderTableOrderModal(orderId);
    return;
  }
  const order = getOpenOrderForTable(tableId);
  if(order){ renderTableOrderModal(order.id); return; }
  openNewOrderPaxModal(tableId);
}

function getTodayPendingReservations(){
  const today = todayStr();
  return DB.reservations.filter(r => r.date === today && (
    (r.status === 'confirmada' && !r.llegada) ||
    // Si la llegada ya se marcó desde la pestaña Reservas (toggleReservaLlegada,
    // que solo cambia el estado y no abre ninguna comanda) pero la señal
    // cobrada online todavía no se ha aplicado a ninguna mesa, la reserva
    // sigue apareciendo aquí — si no, en cuanto se marcaba la llegada
    // desaparecía de "Ya tiene reserva" y la señal se quedaba huérfana para
    // siempre: al cerrar la mesa como cliente de paso, se le cobraba al
    // cliente el importe completo, la señal ya pagada aparte.
    (r.status === 'completada' && r.llegada && (r.depositSalePending||0) > 0)
  )).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
}

function openNewOrderPaxModal(tableId){
  const table = DB.tables.find(t=>t.id===tableId);
  const pendingReservas = getTodayPendingReservations();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-users"></i> ${t('title.openTable')}${table?` — ${escapeHtml(table.name)}`:''}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.clientType')}</label>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="radio" name="new-order-tipo-cliente" value="paso" checked onchange="toggleNewOrderReservaField()" style="width:auto"> ${t('label.walkInClient')}</label>
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="radio" name="new-order-tipo-cliente" value="reserva" onchange="toggleNewOrderReservaField()" style="width:auto" ${!pendingReservas.length?'disabled':''}> ${t('label.hasReservation')}${pendingReservas.length?` (${pendingReservas.length} ${t('common.today')})`:''}</label>
      </div>
    </div>
    <div class="field" id="new-order-reserva-field" style="display:none">
      <label>${t('label.selectReservation')}</label>
      <select id="new-order-reserva-sel">
        ${pendingReservas.map(r=>{
          const client = DB.clients.find(c=>c.id===r.clientId);
          const name = client ? client.name : (r.clientName||'—');
          return `<option value="${r.id}">${escapeHtml(r.time)} · ${escapeHtml(name)} · ${r.people} ${t('common.persAbbr')}</option>`;
        }).join('')}
      </select>
    </div>
    <div class="field" id="new-order-pax-field">
      <label>${t('label.howManyPeople')}</label>
      <input type="number" id="new-order-pax" min="1" max="50" value="2">
      <label style="margin-top:8px">${t('label.walkInClientOptional')}</label>
      <div style="position:relative">
        <input type="text" id="new-order-client-name" placeholder="${t('ph.walkInClientName')}" autocomplete="off" oninput="runTypeahead('new-order-client-name')" onfocus="runTypeahead('new-order-client-name')" onblur="setTimeout(()=>hideTypeahead('new-order-client-name'),150)">
        <div id="new-order-client-name-results" class="typeahead-results" style="display:none"></div>
      </div>
      <small style="color:var(--muted)">${t('label.walkInClientHint')}</small>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmOpenTableOrder(${tableId})">${t('title.openTable')}</button>
    </div>
  `);
  attachTypeahead('new-order-client-name', 'new-order-client-name-results',
    q => DB.clients.filter(c => c.name.toLowerCase().includes(q)),
    c => escapeHtml(c.name),
    c => { document.getElementById('new-order-client-name').value = c.name; });
}

function toggleNewOrderReservaField(){
  const isReserva = document.querySelector('input[name="new-order-tipo-cliente"]:checked').value === 'reserva';
  document.getElementById('new-order-reserva-field').style.display = isReserva ? '' : 'none';
  document.getElementById('new-order-pax-field').style.display = isReserva ? 'none' : '';
}

async function confirmOpenTableOrder(tableId){
  const tipo = document.querySelector('input[name="new-order-tipo-cliente"]:checked')?.value || 'paso';
  let pax, clienteNombre = '', clientId = null, reservationId = null, depositToApply = 0;
  if(tipo === 'reserva'){
    const resId = parseInt(document.getElementById('new-order-reserva-sel').value);
    const r = DB.reservations.find(x=>x.id===resId);
    if(!r){ showToast(t('msg.selectReservation')); return; }
    pax = r.people;
    clientId = r.clientId;
    const client = DB.clients.find(c=>c.id===r.clientId);
    clienteNombre = client ? client.name : (r.clientName||'');
    reservationId = r.id;
    // Si esta reserva pagó una señal (ya registrada como venta aparte el
    // día que se cobró de verdad, ver 'pago_confirmado' en js/core.js), se
    // traslada aquí para descontarla del total quel se cobre en esta mesa
    // — si no, el cliente pagaría la señal dos veces. Se consume ahora
    // (depositSalePending a 0) para que no se pueda aplicar dos veces si la
    // mesa se abre/cierra/reabre varias veces para la misma reserva.
    if(r.depositSalePending){
      depositToApply = r.depositSalePending;
      r.depositSalePending = 0;
    }
    // Marca la llegada y, sobre todo, actualiza la mesa de la reserva a la
    // mesa REAL donde se sienta (no solo si estaba sin asignar): si la sala
    // se reorganiza sobre la marcha, la reserva no debe quedar "atada" a una
    // mesa distinta a la que de verdad se está usando.
    setReservationArrival(r.id, true, tableId);
  }else{
    pax = parseInt(document.getElementById('new-order-pax').value) || 0;
    if(pax <= 0){ showToast(t('msg.indicatePax')); return; }
    // Un descuido de un dígito de más (500 en vez de 50) consumiría de golpe
    // casi todo el aforo del turno configurado, bloqueando reservas online
    // reales sin ningún aviso — el atributo max del campo no basta por sí
    // solo, así que se acota también aquí.
    pax = Math.min(pax, 50);
    // Antes "Cliente de paso" nunca vinculaba clientId: un habitual con una
    // alergia grave registrada en su ficha, sentado directamente en una
    // mesa (el caso más común, sin pasar por reserva), no disparaba ningún
    // aviso de alergia ni en sala ni en cocina — el único aviso posible era
    // que el camarero se acordara de teclearla a mano. Si el nombre
    // tecleado aquí coincide con un cliente ya dado de alta, se vincula
    // igual que ya hace el flujo de reserva, y el aviso de alergias
    // (orderAllergyWarningHtml) empieza a funcionar también en este caso.
    const typedName = (document.getElementById('new-order-client-name')?.value || '').trim();
    if(typedName){
      const matched = DB.clients.find(c => c.name.trim().toLowerCase() === typedName.toLowerCase());
      if(matched){ clientId = matched.id; clienteNombre = matched.name; }
      else clienteNombre = typedName;
    }
    // Aviso (no bloqueante) si se va a sentar a alguien sin reserva en una
    // mesa que tiene una reserva próxima (dentro de la ventana de 90 min) —
    // el camarero decide si sentar igualmente porque sabe que esa mesa se
    // habrá ido a tiempo, en vez de impedírselo del todo.
    const upcoming = getUpcomingReservationForTable(tableId);
    if(upcoming){
      const client = DB.clients.find(c=>c.id===upcoming.clientId);
      const name = client ? client.name : (upcoming.clientName||'');
      if(!(await confirmModal(t('msg.confirmSeatDespiteReservation').replace('${time}', upcoming.time).replace('${name}', name).replace('${people}', upcoming.people), {icon:'ti-alert-triangle'}))) return;
      // Antes este aviso no dejaba rastro: si luego llegaba el cliente de
      // la reserva y la mesa estaba ocupada, no había forma de revisar que
      // ya se había avisado y quién decidió sentar al walk-in de todas
      // formas. Queda registrado en el mismo log de auditoría que ya usan
      // otras acciones de TPV.
      logAudit('reservation_warning_dismissed', t('audit.seatedDespiteReservation').replace('${table}', (DB.tables.find(t=>t.id===tableId)||{}).name||'').replace('${name}', name).replace('${time}', upcoming.time));
    }
  }
  // Si quien está fichado ahora mismo entró con su propio PIN de empleado,
  // la app ya sabe quién es — se asigna solo, sin preguntar nada. Si entra
  // como propietario (sin identidad de empleado concreta), también se
  // asigna solo: la mesa queda a nombre de "Propietario" en vez de pedirle
  // elegir a un camarero a mano cada vez que abre una mesa.
  const loggedEmployeeId = loggedInEmployeeId();
  const camareroId = loggedEmployeeId;
  const openedByOwner = loggedEmployeeId === null;

  const order = {id: genId(), tableId, tipo:'mesa', pax, clienteNombre, clientId, reservationId, camareroId, openedByOwner, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString(), depositAmount: depositToApply || undefined};
  DB.tpvOrders.push(order);
  saveDB();
  renderTableOrderModal(order.id);
}

// Liberar una mesa abierta por error (0 platos), sin salir del TPV. Antes
// la única forma de deshacer un "Abrir mesa" a la mesa equivocada era ir a
// Mi Negocio > Operativa y borrar la mesa física entera del plano de sala
// — un efecto colateral desproporcionado solo para deshacer un mis-clic.
async function releaseEmptyTable(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || (order.items||[]).length) return;
  if(!(await confirmModal(t('msg.confirmReleaseEmptyTable')))) return;
  DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== orderId);
  saveDB();
  closeModal();
  renderTPV();
}

// Una carta es de bebidas si se creó en el área de Sala (campo area==='sala').
// Para cartas antiguas sin ese campo, se mantiene la detección por nombre
// (p.ej. "Bebidas", "Carta de Bebidas"). El resto se consideran de comida.
function isBebidaCarta(c){
  if(c && c.area) return c.area === 'sala';
  return /bebida/i.test(c.nombre||'');
}

function findCartaSeccion(secId){
  for(const c of getActiveCartas()){
    const sec = (c.secciones||[]).find(s=>s.id===secId);
    if(sec) return sec;
  }
  return null;
}
function isSeccionBebida(secId){
  for(const c of (DB.cartas||[])){
    if((c.secciones||[]).some(s=>s.id===secId)) return isBebidaCarta(c);
  }
  return false;
}

function openMenuConfigModal(orderId, menuId){
  const m = DB.menus.find(x=>x.id===menuId);
  if(!m) return;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-list-details"></i> ${escapeHtml(tItem(m))} · ${fmtMoney(m.precio)}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    ${(m.grupos||[]).map(g => `
      <div class="field">
        <label>${escapeHtml(tItem(g))}</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${(() => {
            // Marcar una opción como agotada tiene que impedir pedirla, no solo
            // avisar: se deshabilita, y la primera marcada por defecto es la
            // primera DISPONIBLE (si no, el radio preseleccionado podía ser
            // justo el plato que se acaba de terminar).
            const primeraLibre = (g.opciones||[]).findIndex(o => o.disponible !== false);
            return (g.opciones||[]).map((o,i) => `
            <label style="display:flex;align-items:center;gap:8px;${o.disponible===false?'opacity:.5;cursor:not-allowed':'cursor:pointer'}">
              <input type="radio" name="menu-grupo-${g.id}" value="${o.id}" ${i===primeraLibre?'checked':''} ${o.disponible===false?'disabled':''} style="width:auto" onchange="toggleMenuExtras(${g.id})">
              ${escapeHtml(tItem(o))}${o.suplemento ? ` <span style="color:var(--brand-orange);font-weight:600">+${fmtMoney(o.suplemento)}</span>` : ''}${o.disponible===false ? ` <span class="badge badge-red" style="font-size:9px"><i class="ti ti-flame-off"></i> ${t('common.unavailable')}</span>` : ''}
            </label>
            ${(o.modificadores||[]).length ? `<div class="menu-extras-${g.id}-${o.id}" style="margin-left:28px;display:${i===0?'block':'none'}">
              ${o.modificadores.map(mod => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                  <input type="checkbox" class="menu-mod-${g.id}" data-opcion="${o.id}" data-mod-id="${mod.id}" style="width:auto">
                  ${escapeHtml(tItem(mod))}${mod.precio ? ` <span style="color:var(--brand-orange);font-weight:600">+${fmtMoney(mod.precio)}</span>` : ''}
                </label>
              `).join('')}
            </div>` : ''}
          `).join('');
          })()}
        </div>
      </div>
    `).join('')}
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddMenuToOrder(${orderId}, ${menuId})"><i class="ti ti-plus"></i> ${t("btn.addToOrder")}</button>
    </div>
  `);
}

function toggleMenuExtras(grupoId){
  const selected = document.querySelector(`input[name="menu-grupo-${grupoId}"]:checked`);
  if(!selected) return;
  const selId = selected.value;
  document.querySelectorAll(`[class^="menu-extras-${grupoId}-"]`).forEach(el => el.style.display = 'none');
  const extrasDiv = document.querySelector(`.menu-extras-${grupoId}-${selId}`);
  if(extrasDiv) extrasDiv.style.display = 'block';
  document.querySelectorAll(`.menu-mod-${grupoId}`).forEach(el => {
    if(el.dataset.opcion !== selId) el.checked = false;
  });
}

function confirmAddMenuToOrder(orderId, menuId){
  const order = DB.tpvOrders.find(o=>o.id===orderId);
  const m = DB.menus.find(x=>x.id===menuId);
  if(!order || !m) return;
  let suplementoTotal = 0;
  let extrasTotal = 0;
  const selections = (m.grupos||[]).map(g => {
    const selectedId = parseInt(document.querySelector(`input[name="menu-grupo-${g.id}"]:checked`)?.value);
    const o = (g.opciones||[]).find(x=>x.id===selectedId) || (g.opciones||[])[0];
    if(!o) return {grupoNombre: g.nombre, opcionNombre:'', recipeId:null, suplemento:0, modificadores:[]};
    suplementoTotal += o.suplemento||0;
    const selectedMods = [...document.querySelectorAll(`.menu-mod-${g.id}:checked`)]
      .filter(el => parseInt(el.dataset.opcion) === o.id)
      .map(el => (o.modificadores||[]).find(mod => mod.id === parseInt(el.dataset.modId)))
      .filter(Boolean);
    const modExtra = selectedMods.reduce((s,mod) => s + (mod.precio||0), 0);
    extrasTotal += modExtra;
    return {grupoNombre: g.nombre, opcionNombre: o.nombre, recipeId: o.recipeId, suplemento: o.suplemento||0, modificadores: selectedMods.map(mod => ({nombre: mod.nombre, precio: mod.precio}))};
  });
  const price = m.precio + suplementoTotal + extrasTotal;
  const notas = selections.map(s => {
    let txt = `${s.grupoNombre}: ${s.opcionNombre}`;
    if(s.suplemento) txt += ` (+${fmtMoney(s.suplemento)})`;
    if(s.modificadores.length) txt += ` [${s.modificadores.map(mod => mod.nombre + (mod.precio ? ' +' + fmtMoney(mod.precio) : '')).join(', ')}]`;
    return txt;
  }).join(' · ');

  // Todas las líneas de esta compra de menú (una por plato/grupo) comparten un
  // mismo menuInstanceId. Solo la primera línea "lleva" el precio del menú
  // (menuBaseAmount) para no sumarlo varias veces; si esa línea se borra más
  // tarde, reassignMenuBasePrice() traspasa ese importe a otra línea hermana
  // en vez de perderlo, para no acabar sirviendo el resto del menú gratis.
  const menuInstanceId = genId();
  order.tandas = order.tandas || [];
  selections.forEach((s, i) => {
    if(!order.tandas.includes(s.grupoNombre)) order.tandas.push(s.grupoNombre);
    const modExtra = s.modificadores.reduce((sum,mod) => sum + (mod.precio||0), 0);
    const lineName = s.modificadores.length ? `${s.opcionNombre} (${s.modificadores.map(mod=>mod.nombre).join(', ')})` : s.opcionNombre;
    const grupo = m.grupos.find(g => g.nombre === s.grupoNombre);
    const baseAmount = i===0 ? m.precio : 0;
    const linePrice = baseAmount + s.suplemento + modExtra;
    const isBebida = !!(grupo && grupo.bebida);
    const existing = order.items.find(l =>
      l.menuId === m.id && l.name === lineName && (l.tanda||'') === (s.grupoNombre||'') &&
      !l.estado && (l.marchada||0) === 0
    );
    let line;
    if(existing){
      existing.qty += 1;
      line = existing;
    } else {
      line = {
        menuId: m.id, recipeId: s.recipeId, platoId: null,
        name: lineName, price: linePrice,
        qty:1, tanda: s.grupoNombre, notas: `Menú: ${m.nombre}`,
        modificadores: s.modificadores, menuInstanceId, menuBaseAmount: baseAmount
      };
      if(isBebida) line.bebida = true;
      order.items.push(line);
      autoSendTakeawayLine(order, line);
    }
    syncBebidaLineEstado(line);
  });
  saveDB();
  renderTableOrderModal(orderId);
}

// Si se borra la línea que llevaba el precio base de un menú, ese importe pasa
// a otra línea del mismo menuInstanceId que siga en el pedido, para que el
// resto del menú no se quede sirviendo gratis por error.
function reassignMenuBasePrice(order, removedLine){
  if(!removedLine || !removedLine.menuInstanceId || !removedLine.menuBaseAmount) return;
  const sibling = order.items.find(l => l.menuInstanceId === removedLine.menuInstanceId);
  if(!sibling) return;
  sibling.price += removedLine.menuBaseAmount;
  sibling.menuBaseAmount = (sibling.menuBaseAmount||0) + removedLine.menuBaseAmount;
}

// itemsWithIdx opcional: si se pasa (ya filtrado, p.ej. solo carta o solo
// menú), agrupa ESE subconjunto por tanda en vez de todas las líneas del
// pedido — así carta y menú se pueden mostrar como dos bloques separados
// sin mezclar sus tandas aunque compartan nombre (ambos pueden tener un
// "Segundos", por ejemplo).
function groupOrderItemsByTanda(order, itemsWithIdx){
  const groups = {};
  const source = itemsWithIdx || (order.items||[]).map((line, idx) => ({line, idx}));
  source.forEach(({line, idx}) => {
    const key = line.tanda || '';
    if(!groups[key]) groups[key] = [];
    groups[key].push({line, idx});
  });
  return [...(order.tandas||[]), ''].filter(t => groups[t]).map(t => ({tanda: t, items: groups[t]}));
}

// Botón principal: marcha el primer grupo (tanda) con platos pendientes (p.ej. "Entrantes"
// primero). Los siguientes grupos (segundos, postres...) se marchan con su propio botón
// dentro de cada tarjeta cuando el cliente esté listo.
function renderOrderMarcharButtons(order){
  if(order.tipo === 'takeaway') return '';
  const groups = groupOrderItemsByTanda(order);
  const hasPending = groups.some(g => orderPendingKitchenLines(order, g.tanda).reduce((s,l)=>s+l.qty, 0) > 0);
  if(!hasPending) return '';

  // "Marchar vale": marcha todas las bebidas + el primer grupo de comida pendiente
  return `<button class="btn" style="background:var(--brand-orange);color:#fff;border-color:var(--brand-orange)" onclick="marcharValeCompleto(${order.id})"><i class="ti ti-chef-hat"></i> ${t('btn.sendFullTicket')}</button>`;
}

// Marcha automáticamente el primer grupo de comida con platos pendientes.
// Las bebidas nunca pasan por aquí: ya tienen su propio estado desde que se
// añaden (ver syncBebidaLineEstado), sin necesitar ningún "Marchar".
function marcharValeCompleto(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const ahora = new Date().toISOString();
  const fired = [];

  const groups = groupOrderItemsByTanda(order);
  const firstPendingFood = groups.find(g => g.items.some(({line}) => !line.bebida && line.qty > (line.marchada||0)));
  if(firstPendingFood){
    firstPendingFood.items.forEach(({line}) => {
      if(!line.bebida && line.qty > (line.marchada||0)){
        const qtyFired = line.qty - (line.marchada||0);
        fired.push({qty: qtyFired, name: line.name, notas: line.notas, bebida: false});
        line.estado = 'cocina';
        delete line.recogidoAt;
        line.enviadoAt = ahora;
        line.marchada = line.qty;
        decrementDishStock(line.platoId, qtyFired);
      }
    });
  }

  if(!fired.length){ showToast(t('msg.noNewDishes')); return; }
  order.cerrada = false;
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  printMarchadasIfEnabled(order, fired);
  renderTableOrderModal(order.id);
  showToast(t('msg.courseSent'));
}

// Marcha un solo plato (línea) a cocina, sin esperar al resto del grupo.
function marcharLine(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const line = (order.items||[])[idx];
  if(!line || line.qty <= (line.marchada||0)){ showToast(t('msg.noNewDishes')); return; }
  const qtyFired = line.qty - (line.marchada||0);
  const fired = [{qty: qtyFired, name: line.name, notas: line.notas, bebida: line.bebida}];
  line.estado = 'cocina';
  delete line.recogidoAt;
  line.enviadoAt = new Date().toISOString();
  line.marchada = line.qty;
  if(!line.bebida) decrementDishStock(line.platoId, qtyFired);
  order.cerrada = false;
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  printMarchadasIfEnabled(order, fired);
  renderTableOrderModal(order.id);
  showToast(t('msg.dishSentToKitchen'));
}

// Avisos de la reserva (notas) y del cliente (alergias/notas) vinculados a esta
// comanda, para que camareros y cocina los vean sin tener que ir a buscarlos
// a Reservas o Clientes.
function renderOrderClientNotesHtml(order){
  const parts = [];
  if(order.reservationId){
    const r = DB.reservations.find(x => x.id === order.reservationId);
    if(r && r.notes) parts.push({icon:'ti-calendar-event', text: r.notes});
  }
  if(order.clientId){
    const c = DB.clients.find(x => x.id === order.clientId);
    if(c){
      if(c.allergies) parts.push({icon:'ti-alert-triangle', text: `${t('label.allergensPresent')}: ${c.allergies}`});
      if(c.notes) parts.push({icon:'ti-note', text: c.notes});
    }
  }
  // Alérgenos anotados a mano para esta mesa (independiente de si hay algún
  // cliente vinculado) — para comensales sueltos que no están dados de alta
  // como cliente pero sí han avisado de una alergia al sentarse.
  if(order.tableAllergens) parts.push({icon:'ti-alert-triangle', text: `${t('label.allergensPresent')}: ${order.tableAllergens}`});
  if(!parts.length) return '';
  return `<div class="card" style="border:2px solid var(--brand-orange);background:var(--amber-l);margin-bottom:10px;padding:8px 12px">
    ${parts.map(p => `<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin-bottom:2px"><i class="ti ${p.icon}" style="margin-top:2px;color:var(--brand-orange);flex-shrink:0"></i><span>${escapeHtml(p.text)}</span></div>`).join('')}
  </div>`;
}

// Solo el aviso de alergias (sin notas generales de reserva/cliente, que no
// son urgentes) para la pantalla de cocina: antes esta información solo se
// veía en el modal de mesa de Sala, así que un cocinero podía preparar un
// plato con un alérgeno peligroso para ese cliente sin enterarse, porque el
// modo por defecto es "pantalla" (no impresión de tickets, que sí lo incluye).
function orderAllergyWarningHtml(order){
  const texts = [];
  if(order.clientId){
    const c = DB.clients.find(x => x.id === order.clientId);
    if(c && c.allergies) texts.push(c.allergies);
  }
  if(order.tableAllergens) texts.push(order.tableAllergens);
  if(!texts.length) return '';
  return `<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;font-weight:700;color:#fff;background:var(--red,#c0392b);border-radius:6px;padding:6px 8px;margin-bottom:8px"><i class="ti ti-alert-triangle" style="margin-top:1px;flex-shrink:0"></i><span>${t('label.allergensPresent')}: ${escapeHtml(texts.join(' / '))}</span></div>`;
}

function renderTableOrderModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  // La comanda puede haber desaparecido entre que se abrió el modal y que se
  // vuelve a pintar (p.ej. otro dispositivo la cobró o la canceló mientras
  // este camarero la tenía abierta) — cerrar en vez de romper con un error.
  if(!order){ closeModal(); renderTPV(); return; }
  const table = order.tableId ? DB.tables.find(t => t.id === order.tableId) : null;
  const titleText = table ? `${orderTableDisplayName(order, table)}${order.pax ? ` · ${order.pax} ${t('common.persAbbr')}` : ''}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`
    : `${togoOrderLabel(order)}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`;
  const reservaBadge = order.reservationId ? ` <span class="badge badge-blue"><i class="ti ti-calendar-event"></i> ${t('label.reservationShort')}</span>` : '';
  const pagadoBadge = order.pagado ? ` <span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}${order.pagoImporte!=null ? ' ('+fmtMoney(order.pagoImporte)+')' : ''}</span>` : '';
  const camarero = order.camareroId ? DB.employees.find(e=>e.id===order.camareroId) : null;
  const camareroLabel = camarero ? escapeHtml(camarero.name) : (order.openedByOwner ? escapeHtml(t('label.owner')) : t('label.assignWaiter'));
  const camareroBadge = DB.employees.length ? ` <span class="badge" style="cursor:pointer" onclick="openSetCamareroModal(${order.id})" title="${t('title.changeWaiter')}"><i class="ti ti-user"></i> ${camareroLabel}</span>` : '';
  const allergensBadge = ` <span class="badge ${order.tableAllergens?'badge-red':''}" style="cursor:pointer" onclick="promptTableAllergens(${order.id})" title="${t('tpv.tableAllergens.hint')}"><i class="ti ti-alert-triangle"></i> ${order.tableAllergens ? escapeHtml(order.tableAllergens) : t('tpv.tableAllergens.add')}</span>`;
  // Confirmación visible de que la comanda llegó de verdad a la pantalla
  // de Cocina (recibidoEnCocinaAt, ver renderComandasCocina) — antes sala
  // no tenía forma de saberlo, solo el estado de sincronización general.
  const hasFiredLines = (order.items||[]).some(l => l.estado && !l.bebida);
  const kitchenAckBadge = hasFiredLines
    ? (order.recibidoEnCocinaAt
      ? ` <span class="badge badge-green" title="${t('tpv.kitchenAck.confirmed')}"><i class="ti ti-check"></i> ${t('tpv.kitchenAck.confirmedShort')}</span>`
      : ` <span class="badge badge-amber" title="${t('tpv.kitchenAck.pending')}"><i class="ti ti-clock"></i> ${t('tpv.kitchenAck.pendingShort')}</span>`)
    : '';

  const total = orderTotal(order);
  if(order.items.some(l => l.nuevo)){
    order.items.forEach(l => delete l.nuevo);
    saveDB();
  }

  // Todas las cartas+menús activos, sala primero, luego comida — navegar
  // libremente entre todas las que estén activas (aunque haya más de una de
  // comida a la vez, p.ej. carta normal + una de evento especial) es el
  // comportamiento querido, no un problema a resolver con un selector.
  const activeCartas = getActiveCartas();
  const bebidaCartas = activeCartas.filter(isBebidaCarta);
  const comidaCartas = activeCartas.filter(c => !isBebidaCarta(c));
  const allCartas = [...bebidaCartas, ...comidaCartas];
  // Un menú de varios platos ya empezado en ESTE pedido (tiene líneas con su
  // menuId) debe seguir pudiéndose completar aunque su horario haya
  // terminado a mitad de servicio y ya no esté en activeMenuIds — si no, su
  // pestaña desaparecía y el camarero no podía añadir el 2º/3er plato de un
  // menú que el cliente ya había empezado a comer.
  // Un menú marcado como agotado desaparece de las pestañas: si se ha
  // terminado, no tiene sentido poder empezar uno nuevo. Los ya empezados en
  // esta misma comanda siguen apareciendo por el motivo de abajo — al cliente
  // que ya se está comiendo el primer plato hay que poder servirle el segundo.
  const activeMenusBase = (getActiveMenus ? getActiveMenus() : (DB.menus||[]))
    .filter(m => m.disponible !== false);
  const inProgressMenuIds = new Set(order.items.filter(l=>l.menuId).map(l=>l.menuId));
  const inProgressExtraMenus = (DB.menus||[]).filter(m => inProgressMenuIds.has(m.id) && !activeMenusBase.some(x=>x.id===m.id));
  const activeMenus = [...activeMenusBase, ...inProgressExtraMenus];

  // Autoseleccionar la primera carta si no hay selección
  if(!tpvSelectedCartaId || !allCartas.some(c=>c.id===tpvSelectedCartaId) && !activeMenus.some(m=>m.id===tpvSelectedCartaId)){
    tpvSelectedCartaId = allCartas.length ? allCartas[0].id : (activeMenus.length ? activeMenus[0].id : null);
  }

  // Pestañas de cartas/menús
  const cartaTabs = allCartas.map(c => `<button class="btn btn-sm ${tpvSelectedCartaId===c.id?'btn-primary':''}" onclick="tpvSelectedCartaId=${c.id};tpvSelectedSeccionId=null;renderTableOrderModal(${order.id})">${escapeHtml(tItem(c))}</button>`).join('');
  const menuTabs = activeMenus.map(m => `<button class="btn btn-sm ${tpvSelectedCartaId===m.id?'btn-primary':''}" onclick="tpvSelectedCartaId=${m.id};tpvSelectedSeccionId=null;renderTableOrderModal(${order.id})"><i class="ti ti-clipboard-list"></i> ${escapeHtml(tItem(m))}</button>`).join('');

  // Contenido del selector según la pestaña seleccionada
  let selectorHtml = '';
  const selectedMenu = activeMenus.find(m=>m.id===tpvSelectedCartaId);
  const selectedCarta = allCartas.find(c=>c.id===tpvSelectedCartaId);
  if(selectedMenu){
    selectorHtml = renderMenuSelectorInline(order, selectedMenu);
  } else if(selectedCarta){
    selectorHtml = renderCartaSelectorInline(order, selectedCarta);
  }

  // Comanda (lado derecho): items agrupados por sección con estado de marchar
  const comandaHtml = renderOrderComandaPanel(order);

  // Estado del servicio y botones de acción
  const allDelivered = order.items.length > 0 && (order.items||[]).filter(l=>!l.bebida).every(l=>l.estado==='entregado');
  const actionButtons = allDelivered && order.items.length
    ? `<button class="btn btn-primary" style="width:100%" onclick="openPaymentModal(${order.id})"><i class="ti ti-cash"></i> ${t('btn.charge')} · ${fmtMoney(total)}</button>`
    : `<div style="display:flex;gap:8px;flex-wrap:wrap">${renderOrderMarcharButtons(order)}<button class="btn" style="white-space:nowrap" onclick="openPaymentModal(${order.id})" ${!order.items.length?'disabled':''}><i class="ti ti-cash"></i> ${t('btn.charge')} · ${fmtMoney(total)}</button></div>`;

  openModal(`
    <div id="table-order-modal-marker" data-order-id="${order.id}" style="display:none"></div>
    <div class="modal-header" style="flex-wrap:wrap;gap:6px">
      <h3 style="flex:1;min-width:200px"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(titleText)}${reservaBadge}${pagadoBadge}${camareroBadge}${allergensBadge}${kitchenAckBadge}</h3>
      ${order.tableId && !order.items.length ? `<button class="btn btn-sm btn-danger" onclick="releaseEmptyTable(${order.id})" title="${t('btn.releaseTable')}"><i class="ti ti-door-exit"></i> ${t('btn.releaseTable')}</button>` : ''}
      ${order.tableId ? `<button class="btn btn-sm" onclick="openTableTransferModal(${order.id})" title="${t('title.transferTable')}"><i class="ti ti-transfer"></i></button>` : ''}
      ${(!order.tableId && (order.tipo==='delivery'||order.tipo==='takeaway') && order.status!=='pagada') ? `<button class="btn btn-sm btn-danger" onclick="cancelAcceptedOnlineOrder(${order.id})" title="${t('title.cancelOrder')}"><i class="ti ti-x"></i> ${t('btn.cancelOrder')}</button>` : ''}
      <button class="modal-close" onclick="closeModal();renderTPV()">&times;</button>
    </div>
    ${renderOrderClientNotesHtml(order)}
    ${esRepartoPropio(order) ? renderRepartoControlCardHtml(order) : ''}
    <!-- Pestañas de cartas/menús -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:10px">
      ${cartaTabs}${menuTabs}
    </div>
    <!-- Interruptor Carta/Comanda — solo se ve en móvil (ver
         .tpv-mobile-pane-toggle en styles.css); en tablet/PC no existe,
         ahí carta y comanda siguen una al lado de la otra. -->
    <div class="tpv-mobile-pane-toggle">
      <button class="btn btn-sm ${tpvOrderMobilePane==='carta'?'btn-primary':''}" onclick="setTpvOrderMobilePane('carta', ${order.id})"><i class="ti ti-tools-kitchen-2"></i> ${t('tpv.section.carta')}</button>
      <button class="btn btn-sm ${tpvOrderMobilePane==='comanda'?'btn-primary':''}" onclick="setTpvOrderMobilePane('comanda', ${order.id})"><i class="ti ti-clipboard-list"></i> ${t('label.order')}${order.items.length ? ` · ${order.items.length}` : ''}</button>
    </div>
    <!-- Layout a dos columnas: selector + comanda (ver .tpv-order-cols en styles.css) -->
    <div class="tpv-order-cols">
      <div class="tpv-order-col tpv-order-col-selector ${tpvOrderMobilePane==='carta'?'tpv-pane-active':''}">
        ${selectorHtml}
      </div>
      <div class="tpv-order-col tpv-order-col-comanda ${tpvOrderMobilePane==='comanda'?'tpv-pane-active':''}">
        ${comandaHtml}
      </div>
    </div>
    <div class="modal-footer" style="width:100%">
      ${actionButtons}
    </div>
  `, {order:true});
}

// Selector de platos dentro de una carta concreta (secciones + platos visibles).
// Navegación por carpetas (sección → platos → volver), en vez de enseñar de
// golpe todas las secciones con todos sus platos apilados: con una carta de
// varias secciones grandes, había que hacer scroll largo para encontrar el
// plato que se busca. Mismo patrón que ya usa la configuración de menús
// (getOrderMenuFolders/openTpvMenuFolder), aplicado aquí a la carta suelta.
function renderCartaSelectorInline(order, carta){
  const secciones = (carta.secciones||[]).filter(sec => (sec.platos||[]).some(p=>p.disponible!==false));
  if(!secciones.length) return `<div class="empty" style="padding:10px">${t('empty.noDishesInCarta')}</div>`;

  const seccionAbierta = tpvSelectedSeccionId!=null ? secciones.find(s => s.id === tpvSelectedSeccionId) : null;

  if(seccionAbierta){
    const platos = (seccionAbierta.platos||[]).filter(p=>p.disponible!==false);
    const icono = seccionAbierta.icono || guessSeccionEmoji(seccionAbierta.nombre);
    return `
      <button class="btn btn-sm" style="margin-bottom:10px" onclick="tpvSelectedSeccionId=null;renderTableOrderModal(${order.id})"><i class="ti ti-arrow-left"></i> ${t('common.sections')}</button>
      <div style="font-weight:700;font-size:13px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">${icono} ${escapeHtml(tItem(seccionAbierta))}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${platos.map(p => `<button class="btn btn-sm" style="font-size:12px" onclick="addOrderItem(${order.id}, ${seccionAbierta.id}, ${p.id})">${escapeHtml(tItem(p))} · <strong style="color:var(--brand-orange)">${fmtMoney(p.precio)}</strong></button>`).join('')}
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${secciones.map(sec => {
        const platos = (sec.platos||[]).filter(p=>p.disponible!==false);
        const icono = sec.icono || guessSeccionEmoji(sec.nombre);
        return `
        <button class="btn tpv-sec-card" style="flex:1;min-width:130px;flex-direction:column;gap:4px;padding:14px 10px;height:auto" onclick="tpvSelectedSeccionId=${sec.id};renderTableOrderModal(${order.id})">
          <span class="tpv-sec-icon" style="font-size:22px">${icono}</span>
          <span class="tpv-sec-name" style="font-size:13px;font-weight:700">${escapeHtml(tItem(sec))}</span>
          <span class="tpv-sec-count" style="font-size:11px;color:var(--muted)">${platos.length} ${platos.length===1?t('noun.product'):t('noun.products')}</span>
        </button>
      `;}).join('')}
    </div>
  `;
}

// Selector de menú (combo con grupos y opciones).
function renderMenuSelectorInline(order, menu){
  return `
    <div style="margin-bottom:8px"><strong>${escapeHtml(tItem(menu))}</strong> · <span style="color:var(--brand-orange);font-weight:700">${fmtMoney(menu.precio)}</span></div>
    <button class="btn btn-sm btn-primary" onclick="openMenuConfigModal(${order.id}, ${menu.id})"><i class="ti ti-plus"></i> ${t('btn.addToOrderNamed').replace('${name}', escapeHtml(tItem(menu)))}</button>
  `;
}

// Tarjeta de un grupo (tanda) dentro de una sección (carta o menú) — misma
// tarjeta que antes, ahora factorizada para poder usarla dos veces (una por
// sección) sin duplicar el HTML de cada línea.
function renderTandaGroupCard(order, g, isMenu){
  const pendingCount = orderPendingKitchenLines(order, g.tanda, isMenu).reduce((s,l)=>s+l.qty, 0);
  const allInGroup = g.items;
  const allFired = allInGroup.every(({line}) => line.estado && line.qty <= (line.marchada||0));
  // Las bebidas no pasan por cocina: antes cada línea llevaba su propio
  // botón de ciclo Y la cabecera de la tanda mostraba TAMBIÉN un resumen de
  // estado — dos controles para lo mismo. Ahora, si la tanda es solo de
  // bebidas, el único control vive en la cabecera (un botón que avanza
  // todas a la vez) y cada línea se queda con un badge de solo lectura,
  // igual que ya hacen los platos de cocina.
  const foodInGroup = allInGroup.filter(({line}) => !line.bebida);
  const bebidaInGroup = allInGroup.filter(({line}) => line.bebida);
  const isPureBebidaGroup = bebidaInGroup.length > 0 && foodInGroup.length === 0;
  // "Listo para recoger" y "Recogido" son cosas distintas y las decide gente
  // distinta: cocina termina el plato (estado 'entregado') y SALA confirma
  // que se lo ha llevado (recogidoAt). Antes no existía esa confirmación y el
  // badge daba por recogida la tanda en cuanto cocina acababa el último
  // plato, que es justo al revés: cuanto más terminada estaba, antes decía
  // "Recogido" sin que nadie la hubiera tocado.
  const listos = foodInGroup.filter(({line}) => line.estado === 'entregado');
  const porRecoger = listos.filter(({line}) => !line.recogidoAt);
  const allPicked = foodInGroup.length > 0 && listos.length === foodInGroup.length && !porRecoger.length;
  let statusBadge = '';
  if(isPureBebidaGroup){
    const hasCocina = bebidaInGroup.some(({line}) => line.estado === 'cocina');
    const hasPreparando = bebidaInGroup.some(({line}) => line.estado === 'preparando');
    const allServed = bebidaInGroup.every(({line}) => line.estado === 'entregado');
    if(allServed) statusBadge = `<span class="badge badge-green" style="font-size:10px"><i class="ti ti-check"></i> ${t('kitchen.delivered')}</span>`;
    else if(hasCocina) statusBadge = `<button class="btn btn-sm" style="background:var(--amber);color:#fff;border-color:var(--amber);font-size:11px;padding:4px 8px;min-height:auto" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-clock"></i> ${t('kitchen.waiting')}</button>`;
    else if(hasPreparando) statusBadge = `<button class="btn btn-sm" style="background:var(--teal);color:#fff;border-color:var(--teal);font-size:11px;padding:4px 8px;min-height:auto" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-flame"></i> ${t('kitchen.preparing')}</button>`;
  }else{
    if(allPicked) statusBadge = `<span class="badge badge-green" style="font-size:10px"><i class="ti ti-check"></i> ${t('tpv.pickedUp')}</span>`;
    else if(listos.length) statusBadge = `<span class="badge badge-green" style="font-size:10px"><i class="ti ti-tools-kitchen-2"></i> ${t('tpv.readyToPickup')}</span>`;
    else if(foodInGroup.some(({line}) => line.estado === 'preparando')) statusBadge = `<span class="badge badge-blue" style="font-size:10px"><i class="ti ti-flame"></i> ${t('kitchen.preparing')}</span>`;
    else if(allFired) statusBadge = `<span class="badge badge-amber" style="font-size:10px"><i class="ti ti-clock"></i> ${t('tpv.fired')}</span>`;
  }

  return `
  <div style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;background:var(--surface)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px">
      <strong style="font-size:12px;text-transform:uppercase;color:var(--muted)">${g.tanda ? escapeHtml(g.tanda) : t('label.noCategory')}</strong>
      <div style="display:flex;gap:4px;align-items:center">
        ${statusBadge}
        ${pendingCount ? `<button class="btn btn-sm" style="background:var(--brand-orange);color:#fff;border-color:var(--brand-orange);font-size:11px;padding:4px 8px;min-height:auto" onclick="marcharComanda(${order.id}, '${escapeJsAttr(g.tanda)}', ${isMenu})"><i class="ti ti-chef-hat"></i> ${t('btn.sendToKitchen')}</button>` : ''}
      </div>
    </div>
    ${allInGroup.map(({line, idx}) => {
      let lineStatus = '';
      if(line.bebida && line.estado){
        // El control ya vive en la cabecera de la tanda (arriba) cuando es
        // un grupo solo de bebidas — aquí, por línea, solo un badge de
        // lectura, igual que los platos de cocina.
        if(line.estado==='entregado') lineStatus = ' <span class="badge badge-green" style="font-size:9px"><i class="ti ti-check"></i></span>';
        else if(line.estado==='preparando') lineStatus = ' <span class="badge badge-blue" style="font-size:9px"><i class="ti ti-flame"></i></span>';
        else if(line.estado==='cocina') lineStatus = ' <span class="badge badge-amber" style="font-size:9px"><i class="ti ti-clock"></i></span>';
      } else {
        // Un plato terminado por cocina pero aún en el pase lleva el icono de
        // la campana: de un vistazo se ve qué falta por recoger sin tener que
        // leer el badge de la tanda entera.
        if(line.estado==='entregado' && line.recogidoAt) lineStatus = ` <span class="badge badge-green" style="font-size:9px" title="${escapeHtml(t('tpv.pickedUp'))}"><i class="ti ti-check"></i></span>`;
        else if(line.estado==='entregado') lineStatus = ` <span class="badge badge-green" style="font-size:9px" title="${escapeHtml(t('tpv.readyToPickup'))}"><i class="ti ti-bell-ringing"></i></span>`;
        else if(line.estado==='preparando') lineStatus = ' <span class="badge badge-blue" style="font-size:9px"><i class="ti ti-flame"></i></span>';
        else if(line.estado==='cocina') lineStatus = ' <span class="badge badge-amber" style="font-size:9px"><i class="ti ti-clock"></i></span>';
      }
      // Distinción visual clara entre lo que viene de un menú (combo de
      // varios platos a precio cerrado) y lo que es carta suelta — además
      // de la sección propia, cada línea sigue llevando su badge con el
      // nombre del menú concreto (útil si hay más de un menú en la mesa).
      const menu = line.menuId ? (DB.menus||[]).find(m => m.id === line.menuId) : null;
      const menuBadge = menu ? ` <span class="badge badge-blue" style="font-size:9px"><i class="ti ti-list-details"></i> ${escapeHtml(tItem(menu))}</span>` : '';
      return `
      <div class="comanda-item-row" style="display:flex;align-items:center;gap:6px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);${menu?'border-left:3px solid var(--blue,#4E5A63);padding-left:6px':''}">
        <span style="flex:1;overflow:visible;text-overflow:clip;white-space:normal"><strong>${line.qty}×</strong> ${escapeHtml(line.name)}${lineStatus}${menuBadge}${line.promoId ? ` <span class="badge badge-green" style="font-size:9px"><i class="ti ti-discount-2"></i> -${line.promoPct}%</span>` : ''}${line.pagadoOnline ? ` <span class="badge badge-green" style="font-size:9px" title="${escapeHtml((line.pagadorNombre?t('label.paidOnlineByHint').replace('${name}', line.pagadorNombre):t('label.paidOnline')))}"><i class="ti ti-credit-card"></i></span>` : line.pagoOnlinePendiente ? ` <span class="badge badge-amber" style="font-size:9px" title="${escapeHtml(t('label.paymentPending'))}"><i class="ti ti-clock-exclamation"></i></span>` : ''}${line.priceMismatch ? ` <i class="ti ti-alert-triangle" style="color:var(--brand-orange)" title="${escapeHtml(t('msg.priceChangedSinceOrder'))}"></i>` : ''}${line.unavailableNow ? ` <i class="ti ti-alert-circle" style="color:var(--red)" title="${escapeHtml(t('msg.dishNoLongerInCarta'))}"></i>` : ''}</span>
        <span style="font-family:monospace;font-weight:700;font-size:11px;color:var(--brand-orange);white-space:nowrap">${fmtMoney(line.price * line.qty)}</span>
        <button class="btn btn-sm btn-icon comanda-qty-btn" onclick="changeOrderItemQty(${order.id}, ${idx}, -1)"><i class="ti ti-minus"></i></button>
        <button class="btn btn-sm btn-icon comanda-qty-btn" onclick="changeOrderItemQty(${order.id}, ${idx}, 1)"><i class="ti ti-plus"></i></button>
        <button class="btn btn-sm btn-icon comanda-qty-btn" onclick="openLineNotesModal(${order.id}, ${idx})" title="${t('common.notes')}"><i class="ti ti-note"></i></button>
        ${line.qty > (line.marchada||0) ? `<button class="btn btn-sm btn-icon comanda-qty-btn" style="color:var(--brand-orange)" title="${t('title.sendDishToKitchen')}" onclick="marcharLine(${order.id}, ${idx})"><i class="ti ti-chef-hat"></i></button>` : ''}
        ${line.estado==='entregado' ? '' : `<button class="btn btn-sm btn-icon btn-danger comanda-qty-btn" onclick="removeOrderItem(${order.id}, ${idx})"><i class="ti ti-x"></i></button>`}
      </div>
      ${line.notas ? `<div style="font-size:10px;color:var(--muted);padding:2px 0"><i class="ti ti-note"></i> ${escapeHtml(line.notas)}</div>` : ''}
    `;}).join('')}
  </div>
  `;
}

// Panel de comanda: los ítems del pedido con estado. Primero, en un bloque
// aparte, todo lo de carta suelta; debajo, en su propio bloque, todo lo que
// viene de un menú — antes iban mezclados por tanda (Entrantes/Segundos...)
// sin distinguir de dónde venía cada plato, y con una comanda grande
// (menú + carta a la vez) costaba encontrar cada cosa.
function renderOrderComandaPanel(order){
  const sortBebidaFirst = groups => groups.sort((a,b) => {
    const aB = a.items.some(({line}) => line.bebida) ? 0 : 1;
    const bB = b.items.some(({line}) => line.bebida) ? 0 : 1;
    return aB - bB;
  });
  const cartaItems = (order.items||[]).map((line, idx) => ({line, idx})).filter(({line}) => !line.menuId);
  const menuItems = (order.items||[]).map((line, idx) => ({line, idx})).filter(({line}) => !!line.menuId);
  const cartaGroups = sortBebidaFirst(groupOrderItemsByTanda(order, cartaItems));
  const menuGroups = sortBebidaFirst(groupOrderItemsByTanda(order, menuItems));

  if(!cartaGroups.length && !menuGroups.length){
    return `<div class="empty" style="padding:20px;text-align:center"><i class="ti ti-clipboard-list"></i><br>${t('empty.orderEmpty')}<br><span style="font-size:12px;color:var(--muted)">${t('label.selectFromMenu')}</span></div>`;
  }

  const total = orderTotal(order);
  let html = `<div style="font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between"><span>${t('label.order')}</span><span>${fmtMoney(total)}</span></div>`;
  // Los títulos de sección solo aparecen si hay de los dos tipos a la vez —
  // si la mesa solo tiene carta (lo normal) o solo menú, no hace falta
  // etiquetar nada porque no hay ambigüedad que resolver.
  const showSectionTitles = cartaGroups.length > 0 && menuGroups.length > 0;
  if(cartaGroups.length){
    if(showSectionTitles) html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:2px 0 6px"><i class="ti ti-tools-kitchen-2"></i> ${t('tpv.section.carta')}</div>`;
    html += cartaGroups.map(g => renderTandaGroupCard(order, g, false)).join('');
  }
  if(menuGroups.length){
    if(showSectionTitles) html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:10px 0 6px"><i class="ti ti-list-details"></i> ${t('tpv.section.menu')}</div>`;
    html += menuGroups.map(g => renderTandaGroupCard(order, g, true)).join('');
  }
  return html;
}

// Permite anotar o cambiar qué camarero/a ha tomado o atiende esta comanda.
// Alérgenos anotados para la mesa entera (no ligados a ningún cliente
// dado de alta): se anotan al abrirla o en cualquier momento, se ven en
// pantalla en la comanda y se imprimen destacados en el vale de cocina.

// Lista de espera: clientes que llegan sin reserva y no hay mesa libre. No
// asigna mesa ni bloquea nada — es solo una cola visible para todo el
// equipo, con la opción de "sentar" cuando se libera un hueco (lo que hace
// es simplemente quitarlos de la lista; abrir la comanda de la mesa se
// sigue haciendo a mano, como con cualquier cliente).
function openWaitlistModal(){
  const waiting = (DB.waitlist||[]).filter(w => w.status === 'esperando').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-users-group"></i> ${t('waitlist.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      ${!waiting.length ? `<div class="empty"><i class="ti ti-mood-smile"></i>${t('waitlist.empty')}</div>` : waiting.map(w => `
        <div class="card" style="padding:10px 12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>${escapeHtml(w.name)}</strong> · <i class="ti ti-users"></i> ${w.people}
              ${w.phone ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-phone"></i> ${escapeHtml(w.phone)}</div>` : ''}
              ${w.notes ? `<div style="font-size:12px;color:var(--muted)">${escapeHtml(w.notes)}</div>` : ''}
              <div style="font-size:11px;color:var(--muted)">${waitlistMinutesWaiting(w)} ${t('waitlist.minutesWaiting')}</div>
            </div>
            <div style="display:flex;gap:6px">
              ${w.phone ? `<a class="btn btn-sm btn-icon" href="tel:${escapeHtml(w.phone)}" title="${t('waitlist.callHint')}"><i class="ti ti-phone"></i></a>` : ''}
              <button class="btn btn-sm btn-primary" onclick="openSeatWaitlistTableModal(${w.id})" title="${t('waitlist.seatHint')}"><i class="ti ti-armchair"></i></button>
              <button class="btn btn-sm btn-danger" onclick="cancelWaitlistEntry(${w.id})" title="${t('waitlist.cancelHint')}"><i class="ti ti-x"></i></button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <h4 style="margin:0 0 8px"><i class="ti ti-plus"></i> ${t('waitlist.addTitle')}</h4>
    <div class="field-row">
      <div class="field"><label>${t('label.clientName')}</label><input type="text" id="wl-name"></div>
      <div class="field"><label>${t('th.people')}</label><input type="number" id="wl-people" value="2" min="1" max="50"></div>
    </div>
    <div class="field"><label>${t('waitlist.phone')}</label><input type="tel" id="wl-phone" placeholder="600 000 000"></div>
    <div class="field"><label>${t('waitlist.notes')}</label><input type="text" id="wl-notes"></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="addWaitlistEntry()"><i class="ti ti-plus"></i> ${t('waitlist.add')}</button>
    </div>
  `);
}
function waitlistMinutesWaiting(w){
  return Math.max(0, Math.round((Date.now() - new Date(w.createdAt).getTime()) / 60000));
}
async function addWaitlistEntry(){
  const name = document.getElementById('wl-name').value.trim();
  const people = parseInt(document.getElementById('wl-people').value) || 1;
  const phone = document.getElementById('wl-phone').value.trim();
  const notes = document.getElementById('wl-notes').value.trim();
  if(!name){ showToast(t('waitlist.needName')); return; }
  if(!DB.waitlist) DB.waitlist = [];
  // La lista sincroniza entre dispositivos y es normal que varios camareros
  // la miren/editen a la vez (ver comentario en confirmSeatWaitlistAtTable)
  // — sin este aviso, el mismo grupo podía quedar apuntado dos veces, doble
  // puesto en la cola y contador del botón falseado.
  const dupe = DB.waitlist.find(w => w.status==='esperando' && (
    (phone && w.phone && w.phone.replace(/\D/g,'') === phone.replace(/\D/g,'')) ||
    w.name.trim().toLowerCase() === name.toLowerCase()
  ));
  if(dupe && !(await confirmModal(t('waitlist.confirmDuplicate').replace('${name}', dupe.name)))) return;
  DB.waitlist.push({id: genId(), name, phone, people, notes, status: 'esperando', createdAt: new Date().toISOString()});
  saveDB();
  openWaitlistModal();
}
// Sentar a alguien de la lista de espera ya no era más que marcarlo como
// "sentado" sin más: no abría ninguna mesa, así que había que ir aparte a
// TPV > Mesas y abrir una a mano, tecleando otra vez el nombre y el número
// de personas que ya se había apuntado en la lista de espera. Ahora se
// elige la mesa libre y se abre directamente con esos datos ya puestos.
function openSeatWaitlistTableModal(id){
  const w = (DB.waitlist||[]).find(x => x.id === id);
  if(!w) return;
  const freeTables = DB.tables.filter(t2 => !getOpenOrderForTable(t2.id));
  if(!freeTables.length){ showToast(t('waitlist.noFreeTables')); return; }
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-armchair"></i> ${t('waitlist.seatTitle')} — ${escapeHtml(w.name)}</h3>
      <button class="modal-close" onclick="openWaitlistModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('waitlist.seatPickTableDesc')}</p>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${freeTables.map(t2 => `<button class="btn${t2.plazas && w.people>t2.plazas?' btn-danger':''}" onclick="confirmSeatWaitlistAtTable(${w.id}, ${t2.id})">${escapeHtml(t2.name)}${t2.zona?` · ${escapeHtml(t2.zona)}`:''}${t2.plazas?` · ${t2.plazas} ${t('common.persAbbr')}${w.people>t2.plazas?` <i class="ti ti-alert-triangle"></i>`:''}`:''}</button>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openWaitlistModal()">${t('common.cancel')}</button>
    </div>
  `);
}
async function confirmSeatWaitlistAtTable(waitlistId, tableId){
  const w = (DB.waitlist||[]).find(x => x.id === waitlistId);
  if(!w) return;
  // Otro camarero pudo haber ocupado esa mesa entre elegirla y confirmar
  // (la lista de espera sincroniza entre dispositivos, así que dos personas
  // mirando la misma lista es el caso normal, no la excepción).
  if(getOpenOrderForTable(tableId)){ showToast(t('waitlist.tableNoLongerFree')); openSeatWaitlistTableModal(waitlistId); return; }
  const table = DB.tables.find(t2 => t2.id === tableId);
  // Mismo aviso (no bloqueante) que ya existe al crear una reserva para una
  // mesa más pequeña que el grupo — aquí faltaba del todo: un grupo de 6 se
  // podía sentar en una mesa de 2 sin ningún aviso de aforo.
  if(table && table.plazas && w.people > table.plazas){
    if(!(await confirmModal(t('msg.confirmTableTooSmall').replace('${table}', table.name).replace('${plazas}', table.plazas).replace('${people}', w.people), {icon:'ti-alert-triangle'}))) return;
  }
  const loggedEmployeeId = loggedInEmployeeId();
  const matchedClient = w.phone ? findClientByPhone(w.phone) : null;
  const order = {id: genId(), tableId, tipo:'mesa', pax: w.people, clienteNombre: w.name, clientId: matchedClient ? matchedClient.id : null, reservationId: null, camareroId: loggedEmployeeId, openedByOwner: loggedEmployeeId === null, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString()};
  DB.tpvOrders.push(order);
  w.status = 'sentado';
  w.seatedAt = new Date().toISOString();
  w.tableId = tableId;
  saveDB();
  renderTableOrderModal(order.id);
  showToast(t('waitlist.seatedOk').replace('${name}', w.name));
}
function cancelWaitlistEntry(id){
  const w = (DB.waitlist||[]).find(x => x.id === id);
  if(!w) return;
  w.status = 'cancelada';
  saveDB();
  openWaitlistModal();
}

async function promptTableAllergens(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const val = await promptText(t('tpv.tableAllergens.prompt'), order.tableAllergens || '', {allowEmpty:true});
  if(val === null) return;
  order.tableAllergens = val.trim();
  saveDB();
  renderTableOrderModal(orderId);
}

// El camarero de una mesa ya se asigna solo al abrirla, según quién esté
// fichado (ver confirmOpenTableOrder) — eso es lo que luego reparte ventas
// y estadísticas por empleado. Cambiarlo A POSTERIORI (no asignarlo por
// primera vez) es distinto: antes cualquiera podía "quitarle" la mesa a un
// compañero con un solo clic, sin ninguna restricción, pudiendo desviar a
// quién se atribuye la venta. Ahora solo el propietario real puede
// reasignar una mesa que ya tenía camarero; asignarla por primera vez
// (estaba sin nadie) sigue abierto a cualquiera, igual que al crearla.
function openSetCamareroModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  if(order.camareroId != null && !isOwnerSession()){ showToast(t('msg.onlyOwnerCanReassignWaiter')); return; }
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-user"></i> ${t('label.waiterShort')}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    ${renderCamareroFieldHtml('set-camarero-sel', order.camareroId)}
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmSetCamarero(${orderId})"><i class="ti ti-check"></i> ${t('common.save')}</button>
    </div>
  `);
}
function confirmSetCamarero(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  if(order.camareroId != null && !isOwnerSession()) return;
  const sel = document.getElementById('set-camarero-sel');
  const newId = sel && sel.value ? parseInt(sel.value) : null;
  if(order.camareroId !== newId){
    const before = order.camareroId ? DB.employees.find(e=>e.id===order.camareroId) : null;
    const after = newId ? DB.employees.find(e=>e.id===newId) : null;
    logAudit('edit', t('audit.reassignedWaiter').replace('${from}', before?before.name:t('common.unassigned')).replace('${to}', after?after.name:t('common.unassigned')));
  }
  order.camareroId = newId;
  saveDB();
  renderTableOrderModal(orderId);
}

// isMenu: undefined = cualquiera, true = solo líneas de menú, false = solo
// carta suelta. Hace falta para no marchar de golpe la carta Y el menú
// cuando comparten el mismo nombre de tanda (p.ej. ambos tienen "Segundos")
// pero se muestran ahora en dos secciones separadas de la comanda.
function orderPendingKitchenLines(order, tanda, isMenu){
  return (order.items||[])
    .filter(l => tanda === undefined || (l.tanda||'') === (tanda||''))
    .filter(l => isMenu === undefined || !!l.menuId === isMenu)
    .map(l => ({name: l.name, qty: l.qty - (l.marchada||0), notas: l.notas||'', tanda: l.tanda||''}))
    .filter(l => l.qty > 0);
}

function marcharComanda(orderId, tanda, isMenu){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const pending = orderPendingKitchenLines(order, tanda, isMenu);
  if(!pending.length){ showToast(t('msg.noNewDishes')); return; }

  const ahora = new Date().toISOString();
  const fired = [];
  (order.items||[]).forEach(l => {
    if((tanda === undefined || (l.tanda||'') === (tanda||'')) && (isMenu === undefined || !!l.menuId === isMenu) && l.qty > (l.marchada||0)){
      const qtyFired = l.qty - (l.marchada||0);
      fired.push({qty: qtyFired, name: l.name, notas: l.notas, bebida: l.bebida});
      l.estado = 'cocina';
      delete l.recogidoAt;
      l.enviadoAt = ahora;
      l.marchada = l.qty;
      if(!l.bebida) decrementDishStock(l.platoId, qtyFired);
    }
  });
  order.cerrada = false;
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  printMarchadasIfEnabled(order, fired);
  renderTableOrderModal(order.id);
  showToast(t('msg.orderSentToKitchen'));
}

// Si hay algún perfil de impresora de comandas activo, imprime un vale por cada
// uno de ellos con las líneas recién marchadas que le correspondan según su
// contenido configurado (comida / bebida / todo el pedido).
function printMarchadasIfEnabled(order, firedLines){
  if(!firedLines || !firedLines.length) return;
  // El interruptor "Mostrar en pantalla" / "Imprimir" es el que manda: si el
  // negocio eligió pantalla, no se imprime nada aunque queden perfiles de
  // impresora activos de una configuración anterior.
  const modo = (DB.business && DB.business.comandas && DB.business.comandas.modo) || 'pantalla';
  if(modo !== 'impresion') return;
  const printers = (typeof ensureComandaPrinters === 'function' ? ensureComandaPrinters() : (DB.business && DB.business.comandas && DB.business.comandas.printers) || []).filter(p => p.activo);
  if(!printers.length) return;
  const table = order.tableId ? DB.tables.find(t=>t.id===order.tableId) : null;
  const titulo = table ? table.name : togoOrderLabel(order);
  printers.forEach(p => {
    const lineas = firedLines.filter(l => l.qty > 0 && (p.contenido==='todo' || (p.contenido==='comida' ? !l.bebida : l.bebida)));
    if(lineas.length) printComandaTicket(p.nombre, titulo, lineas, p.anchoTicket, order.tableAllergens, p.id);
  });
}

/* ============================================================
   COMANDAS COCINA — Pantalla en tiempo real para cocina
   ============================================================ */
let comandasCocinaTab = 'activas';
function setComandasCocinaTab(tab){
  comandasCocinaTab = tab;
  renderComandasCocina();
}

// Comprueba si todos los platos marchados de una comanda están entregados y, si es así, la cierra
function checkComandaCierre(order){
  const food = (order.items||[]).filter(l => !l.bebida);
  // Cocina lleva el ciclo completo de cada plato: esperando -> preparación
  // -> listo para recoger -> recogido. Si la comanda se cerrara nada más
  // terminar de cocinar (como antes), desaparecería de "Activas" justo
  // cuando cocina todavía tiene que confirmar que alguien se lo ha llevado
  // del pase, y esa confirmación se quedaría sin ningún sitio desde el que
  // dar el último toque.
  order.cerrada = food.length > 0 && food.every(l => l.estado === 'entregado' && l.recogidoAt);
}

function setLineEstado(orderId, idx, estado){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const line = (order.items||[])[idx];
  if(!line) return;
  line.estado = estado;
  if(estado === 'preparando') line.preparandoAt = new Date().toISOString();
  if(estado === 'entregado') line.entregadoAt = new Date().toISOString();
  checkComandaCierre(order);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  if((order.tipo === 'takeaway' || order.tipo === 'delivery') && typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
  withScrollPreserved(() => {
    const active = document.querySelector('.view.active');
    if(active && active.id === 'view-comandascocina') renderComandasCocina();
    else if(active && active.id === 'view-tpv') renderTPV();
    const overlay = document.getElementById('modal-overlay');
    if(overlay && overlay.classList.contains('active')) renderTableOrderModal(orderId);
  });
}

// Nombre a mostrar de la mesa de una comanda, con las mesas fusionadas a
// continuación ("Mesa 3 + Mesa 4") en vez de mostrar solo la mesa destino
// como si el pedido de la mesa origen nunca hubiera existido.
function orderTableDisplayName(order, table){
  if(!table) return '';
  const extra = order.mergedTableNames||[];
  return extra.length ? `${table.name} + ${extra.join(' + ')}` : table.name;
}
function comandaOrderTitle(order){
  const table = order.tableId ? DB.tables.find(t => t.id === order.tableId) : null;
  if(table) return `${orderTableDisplayName(order, table)}${order.pax ? ` · ${order.pax} ${t('common.persAbbr')}` : ''}`;
  return `${togoOrderLabel(order)}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`;
}
// Quién atiende la mesa, visible también en Comandas Cocina — así en cocina
// se sabe de quién es cada comanda sin tener que ir a preguntar a sala,
// igual que ya se veía en la propia mesa.
function comandaWaiterChipHtml(order){
  return order.tableId ? mesaWaiterChipHtml(order.camareroId, order.openedByOwner) : '';
}

function timeAgo(iso){
  if(!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? t('time.now') : t('time.minsAgo').replace('${n}', mins);
}

function minutesSince(iso){
  if(!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// Badge de urgencia: amarillo a partir de 5 min, naranja a partir de 10, rojo a partir de 15
function urgencyBadge(mins){
  if(mins >= 15) return `<span class="badge badge-red"><i class="ti ti-clock"></i> ${mins} min</span>`;
  if(mins >= 10) return `<span class="badge" style="background:#ffe0c2;color:#b35900"><i class="ti ti-clock"></i> ${mins} min</span>`;
  if(mins >= 5) return `<span class="badge badge-amber"><i class="ti ti-clock"></i> ${mins} min</span>`;
  return `<span class="badge badge-gray"><i class="ti ti-clock"></i> ${mins} min</span>`;
}

// Click sobre un plato en cocina: avanza su estado en espera -> en
// preparación -> listo para recoger -> recogido. Los tres primeros pasos
// los da cocina sola; el último (recogido) también lo puede dar cocina
// tocando otra vez el mismo botón cuando alguien se lo lleva del pase —
// antes ese último paso solo lo podía dar Sala desde su propia pantalla,
// y en cocinas donde el mismo puesto controla el pase no tenía sentido
// obligar a cambiar de pantalla para una confirmación tan simple.
function cycleLineEstado(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line) return;
  if(line.estado === 'cocina') setLineEstado(orderId, idx, 'preparando');
  else if(line.estado === 'preparando') setLineEstado(orderId, idx, 'entregado');
  else if(line.estado === 'entregado' && !line.recogidoAt) markLineRecogida(orderId, idx);
}

function markLineRecogida(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line || line.recogidoAt) return;
  line.recogidoAt = new Date().toISOString();
  if(typeof checkComandaCierre === 'function') checkComandaCierre(order);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  withScrollPreserved(() => {
    const active = document.querySelector('.view.active');
    if(active && active.id === 'view-comandascocina') renderComandasCocina();
    else if(active && active.id === 'view-tpv') renderTPV();
    const overlay = document.getElementById('modal-overlay');
    if(overlay && overlay.classList.contains('active')) renderTableOrderModal(orderId);
  });
}

// Click sobre el nombre de un grupo (tanda) en cocina: avanza el estado de todos sus platos a la vez
function cycleGroupEstado(orderId, tanda){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  let changed = false;
  (order.items||[]).forEach(line => {
    if((line.tanda||'') === tanda){
      if(line.estado === 'cocina'){ line.estado = 'preparando'; line.preparandoAt = new Date().toISOString(); changed = true; }
      else if(line.estado === 'preparando'){ line.estado = 'entregado'; line.entregadoAt = new Date().toISOString(); changed = true; }
      else if(line.estado === 'entregado' && !line.recogidoAt){ line.recogidoAt = new Date().toISOString(); changed = true; }
    }
  });
  if(!changed) return;
  checkComandaCierre(order);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  withScrollPreserved(() => {
    const active = document.querySelector('.view.active');
    if(active && active.id === 'view-comandascocina') renderComandasCocina();
    else if(active && active.id === 'view-tpv') renderTPV();
    const overlay = document.getElementById('modal-overlay');
    if(overlay && overlay.classList.contains('active')) renderTableOrderModal(orderId);
  });
}

// Marcar un plato/bebida como agotado a media comanda, sin salir de la
// pantalla que ya se tiene abierta (Comandas Cocina, o el TPV en Sala) ni
// pedir permiso de editar: "Oferta Gastronómica" (Carta) está oculta para
// el personal sin permiso de edición, así que antes la única forma de
// avisar de que algo se había terminado era decírselo a alguien con
// acceso. Este toggle actúa directamente sobre DB.cartas (no pasa por el
// borrador del editor de Carta, cartaEdit) y se guarda al instante.
function quickToggleDishAvailability(cartaId, secId, platoId){
  const carta = (DB.cartas||[]).find(c => c.id === cartaId);
  const sec = carta && (carta.secciones||[]).find(s => s.id === secId);
  const p = sec && (sec.platos||[]).find(x => x.id === platoId);
  if(!p) return;
  p.disponible = p.disponible === false ? true : false;
  logAudit('availability', t(p.disponible===false ? 'audit.dishMarkedOut' : 'audit.dishMarkedAvailable').replace('${name}', tItem(p)));
  saveDB();
  renderMarkDishOutModal();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-carta' && typeof renderCartaSecciones === 'function') renderCartaSecciones();
}
/* Los menús también se agotan, y de dos formas distintas: puede acabarse una
   OPCIÓN concreta (el solomillo de los Segundos) sin que el menú deje de
   servirse, o puede acabarse el menú entero. Antes este modal solo recorría
   DB.cartas, así que lo único que se podía marcar era carta suelta y quien
   quisiera avisar de que se había terminado un plato del menú del día tenía
   que ir a buscar a alguien con permiso de edición. */
function quickToggleMenuOptionAvailability(menuId, grupoId, opcionId){
  const m = (DB.menus||[]).find(x => x.id === menuId);
  const g = m && (m.grupos||[]).find(x => x.id === grupoId);
  const o = g && (g.opciones||[]).find(x => x.id === opcionId);
  if(!o) return;
  o.disponible = o.disponible === false ? true : false;
  saveDB();
  renderMarkDishOutModal();
}
function quickToggleMenuAvailability(menuId){
  const m = (DB.menus||[]).find(x => x.id === menuId);
  if(!m) return;
  m.disponible = m.disponible === false ? true : false;
  saveDB();
  renderMarkDishOutModal();
}
function openMarkDishOutModal(){
  renderMarkDishOutModal();
}
function renderMarkDishOutModal(){
  const area = currentArea();
  // Antes se excluían las cartas de bebidas con !isBebidaCarta(c), que en
  // Sala (donde toda carta ES de bebidas) dejaba la lista siempre vacía —
  // el filtro por área ya es suficiente, esa exclusión era innecesaria en
  // Cocina (sus cartas nunca son de bebidas) y rompía Sala del todo.
  const cartas = (DB.cartas||[]).filter(c => (c.area||'cocina')===area);
  const rowsHtml = cartas.map(c => {
    const secsHtml = (c.secciones||[]).filter(s => (s.platos||[]).length).map(sec => `
      <div style="font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:700;text-transform:uppercase">${escapeHtml(sec.nombre)}</div>
      ${sec.platos.map(p => `
        <div class="list-row" style="padding:6px 10px">
          <div class="list-row-name"><span>${escapeHtml(tItem(p))}</span></div>
          <button class="btn btn-sm ${p.disponible===false?'btn-danger':''}" onclick="quickToggleDishAvailability(${c.id},${sec.id},${p.id})">${p.disponible===false?t('common.unavailable'):t('common.available')}</button>
        </div>
      `).join('')}
    `).join('');
    return secsHtml ? `<div style="margin-bottom:10px"><div style="font-size:13px;font-weight:700">${escapeHtml(c.nombre)}</div>${secsHtml}</div>` : '';
  }).join('');

  // Menús de precio cerrado del área actual: el menú entero arriba y debajo
  // cada opción de cada grupo, que es lo que de verdad se agota a media
  // comanda.
  const menusHtml = (DB.menus||[]).filter(m => (m.area||'cocina') === area).map(m => {
    const gruposHtml = (m.grupos||[]).filter(g => (g.opciones||[]).length).map(g => `
      <div style="font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:700;text-transform:uppercase">${escapeHtml(tItem(g))}</div>
      ${g.opciones.map(o => `
        <div class="list-row" style="padding:6px 10px">
          <div class="list-row-name"><span>${escapeHtml(tItem(o))}</span></div>
          <button class="btn btn-sm ${o.disponible===false?'btn-danger':''}" onclick="quickToggleMenuOptionAvailability(${m.id},${g.id},${o.id})">${o.disponible===false?t('common.unavailable'):t('common.available')}</button>
        </div>
      `).join('')}
    `).join('');
    return `
      <div style="margin-bottom:10px">
        <div class="list-row" style="padding:6px 10px;background:var(--bg)">
          <div class="list-row-name"><span style="font-size:13px;font-weight:700"><i class="ti ti-list-details"></i> ${escapeHtml(tItem(m))}</span></div>
          <button class="btn btn-sm ${m.disponible===false?'btn-danger':''}" onclick="quickToggleMenuAvailability(${m.id})">${m.disponible===false?t('common.unavailable'):t('common.available')}</button>
        </div>
        ${gruposHtml}
      </div>`;
  }).join('');

  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-flame-off"></i> ${t(area==='sala' ? 'title.markDishOutSala' : 'title.markDishOut')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('label.markDishOutHelp')}</p>
    ${(rowsHtml + menusHtml) || `<div class="empty" style="padding:14px">${t('empty.noDishesToday')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `, {xl:true});
}

function renderComandasCocina(){
  const box = document.getElementById('comandascocina-content');
  if(!box) return;

  const allOrders = DB.tpvOrders.filter(o => o.status !== 'pagada');

  // Sello de "ha llegado a la pantalla de Cocina", para que Sala tenga una
  // confirmación visible (ver badge en renderTableOrderModal) en vez de
  // mandar la comanda a ciegas sin saber si de verdad se está viendo en
  // cocina. Se marca solo una vez, la primera vez que esta pantalla la
  // pinta — no es prueba de que un humano la haya leído, pero sí de que
  // ha llegado de verdad al dispositivo de cocina.
  let stampedAny = false;
  allOrders.forEach(o => {
    if(!o.recibidoEnCocinaAt && (o.items||[]).some(l => l.estado && !l.bebida)){
      o.recibidoEnCocinaAt = new Date().toISOString();
      stampedAny = true;
    }
  });
  if(stampedAny) saveDB();

  const tabsHtml = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-sm ${comandasCocinaTab==='activas' ? 'btn-primary' : ''}" onclick="setComandasCocinaTab('activas')"><i class="ti ti-tools-kitchen-2"></i> ${t('tab.activeOrders')}</button>
      <button class="btn btn-sm ${comandasCocinaTab==='cerradas' ? 'btn-primary' : ''}" onclick="setComandasCocinaTab('cerradas')"><i class="ti ti-history"></i> ${t('tab.closedOrders')}</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="openMarkDishOutModal()"><i class="ti ti-flame-off"></i> ${t('btn.markDishOut')}</button>
    </div>
  `;

  if(comandasCocinaTab === 'cerradas'){
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayMs = todayStart.getTime();
    const closed = allOrders
      .filter(o => o.cerrada)
      .map(order => {
        const lines = (order.items||[]).filter(l => l.estado && !l.bebida);
        const maxMs = Math.max(0, ...lines.map(l => l.entregadoAt ? new Date(l.entregadoAt).getTime() : 0));
        return {order, lines, maxMs};
      })
      .filter(({lines, maxMs}) => lines.length && maxMs >= todayMs)
      .sort((a,b) => b.maxMs - a.maxMs);

    if(!closed.length){
      box.innerHTML = tabsHtml + `<div class="empty"><i class="ti ti-history"></i>${t('empty.noClosedOrders')}</div>`;
      return;
    }

    box.innerHTML = tabsHtml + `<div class="grid grid-kds">${closed.map(({order, lines, maxMs}) => {
      // El pedido sale de "Activas" en cuanto cocina termina su parte (eso no
      // cambia: aquí ya no hay nada más que cocinar). Pero el badge de esta
      // lista histórica no debe decir "Entregado" si sala todavía no ha
      // confirmado que se lo ha llevado — si no, cocina ve "Entregado" y
      // asume que ya está en la mesa cuando puede seguir esperando en el pase.
      const allPicked = lines.every(l => l.recogidoAt);
      const closedBadge = allPicked
        ? `<span class="badge badge-green"><i class="ti ti-circle-check"></i> ${t('kitchen.delivered')}</span>`
        : `<span class="badge badge-green"><i class="ti ti-bell-ringing"></i> ${t('kitchen.allReady')}</span>`;
      return `
      <div class="card" style="overflow-y:auto;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
          <strong>${escapeHtml(comandaOrderTitle(order))}</strong> ${comandaWaiterChipHtml(order)}
          ${closedBadge}
        </div>
        ${maxMs ? `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${timeAgo(new Date(maxMs).toISOString())}</div>` : ''}
        ${lines.map(line => `<div style="padding:4px 0"><strong>${fmtNum(line.qty)} × ${escapeHtml(line.name)}</strong></div>`).join('')}
      </div>
    `;}).join('')}</div>`;
    return;
  }

  allOrders.filter(o => !o.cerrada).forEach(o => checkComandaCierre(o));

  const tickets = allOrders
    .filter(o => !o.cerrada && (o.items||[]).some(l => l.estado && !l.bebida))
    .map(order => {
      const allLines = (order.items||[]).map((line, idx) => ({line, idx})).filter(({line}) => !line.bebida);
      return {order, allLines};
    });

  tickets.sort((a,b) => {
    const envA = a.allLines.filter(({line}) => line.enviadoAt).map(({line}) => new Date(line.enviadoAt).getTime());
    const envB = b.allLines.filter(({line}) => line.enviadoAt).map(({line}) => new Date(line.enviadoAt).getTime());
    const ta = envA.length ? Math.min(...envA) : Date.now();
    const tb = envB.length ? Math.min(...envB) : Date.now();
    return ta - tb;
  });

  if(!tickets.length){
    box.innerHTML = tabsHtml + `<div class="empty"><i class="ti ti-bell-ringing"></i>${t('empty.noPendingOrders')}</div>`;
    return;
  }

  box.innerHTML = tabsHtml + `<div class="grid grid-kds">${tickets.map(({order, allLines}) => {
    const tandaOrder = [...new Set(allLines.map(({line}) => line.tanda || ''))];
    const groups = tandaOrder.map(t => ({
      tanda: t,
      lines: allLines.filter(({line}) => (line.tanda||'') === t)
    })).filter(g => g.lines.length);

    const envTimes = allLines.filter(({line}) => line.enviadoAt).map(({line}) => new Date(line.enviadoAt).getTime());
    const minMs = envTimes.length ? Math.min(...envTimes) : Date.now();
    const mins = minutesSince(new Date(minMs).toISOString());

    return `
    <div class="card" style="overflow-y:auto;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <strong>${escapeHtml(comandaOrderTitle(order))}</strong> ${comandaWaiterChipHtml(order)}
        ${urgencyBadge(mins)}
      </div>
      ${orderAllergyWarningHtml(order)}
      ${groups.map(g => {
        const hasCocina = g.lines.some(({line}) => line.estado === 'cocina');
        const hasPreparando = g.lines.some(({line}) => line.estado === 'preparando');
        // "Listo" (cocina ha terminado) y "Entregado" (sala ya lo ha recogido
        // del pase) son cosas distintas para quien cocina: si al terminar un
        // plato ve directamente "Entregado" sin que nadie de sala lo haya
        // tocado, no sabe si de verdad ha llegado a la mesa o si sigue
        // esperando en el pase. Por eso aquí se distingue con recogidoAt,
        // igual que ya hace Sala en su propia pantalla (renderTandaGroupCard).
        const allReady = g.lines.every(({line}) => line.estado === 'entregado');
        const allPicked = allReady && g.lines.every(({line}) => line.recogidoAt);
        let groupBtn = '';
        if(allPicked) groupBtn = `<span class="badge badge-green" style="flex:none"><i class="ti ti-circle-check"></i> ${t('kitchen.allDelivered')}</span>`;
        else if(allReady) groupBtn = `<button class="btn btn-sm" style="flex:none;background:var(--olive);color:#fff;border-color:var(--olive)" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-bell-ringing"></i> ${t('kitchen.allReady')}</button>`;
        else if(hasCocina) groupBtn = `<button class="btn btn-sm" style="flex:none;background:var(--amber);color:#fff;border-color:var(--amber)" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-clock"></i> ${t('kitchen.prepareAll')}</button>`;
        else if(hasPreparando) groupBtn = `<button class="btn btn-sm" style="flex:none;background:var(--teal);color:#fff;border-color:var(--teal)" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-bell-ringing"></i> ${t('kitchen.markReady')}</button>`;
        return `
        <div style="margin-bottom:6px;padding-top:6px;border-top:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            ${g.tanda ? `<div style="flex:1;min-width:0;overflow-wrap:anywhere;font-size:11px;font-weight:700;color:var(--brand-orange);text-transform:uppercase"><i class="ti ti-chevrons-right"></i> ${escapeHtml(g.tanda)}</div>` : `<div></div>`}
            ${groupBtn}
          </div>
          ${g.lines.map(({line, idx}) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;gap:8px">
              <div style="flex:1;min-width:0;overflow-wrap:anywhere">
                <strong style="${line.estado==='entregado'?'color:var(--muted);text-decoration:line-through':''}">${fmtNum(line.qty)} × ${escapeHtml(line.name)}</strong>
                ${line.notas ? `<div style="font-size:12px;color:var(--muted)">${escapeHtml(line.notas)}</div>` : ''}
              </div>
              ${!line.estado ? `<span class="badge badge-gray" style="flex:none"><i class="ti ti-clock-pause"></i> ${t('kitchen.notFired')}</span>`
              : line.estado==='cocina' ? `<button class="btn btn-sm" style="flex:none;background:var(--amber);color:#fff;border-color:var(--amber)" onclick="cycleLineEstado(${order.id}, ${idx})"><i class="ti ti-clock"></i> ${t('kitchen.waiting')}</button>`
              : line.estado==='preparando' ? `<button class="btn btn-sm" style="flex:none;background:var(--teal);color:#fff;border-color:var(--teal)" onclick="cycleLineEstado(${order.id}, ${idx})"><i class="ti ti-flame"></i> ${t('kitchen.preparing')}</button>`
              : line.recogidoAt ? `<span class="badge badge-green" style="flex:none"><i class="ti ti-circle-check"></i> ${t('kitchen.delivered')}</span>`
              : `<button class="btn btn-sm" style="flex:none;background:var(--olive);color:#fff;border-color:var(--olive)" onclick="cycleLineEstado(${order.id}, ${idx})"><i class="ti ti-bell-ringing"></i> ${t('tpv.readyToPickup')}</button>`}
            </div>
          `).join('')}
        </div>
      `;}).join('')}
    </div>
    `;
  }).join('')}</div>`;
}

function findCartaPlato(secId, platoId){
  for(const c of getActiveCartas()){
    const sec = (c.secciones||[]).find(s=>s.id===secId);
    if(sec){ const p = (sec.platos||[]).find(x=>x.id===platoId); if(p) return p; }
  }
  return null;
}
// Busca un plato por su id en TODAS las cartas (no solo las activas), para
// poder descontar sus raciones aunque la carta se haya desactivado entre
// medias con un pedido todavía abierto.
function findCartaPlatoById(platoId){
  if(platoId == null) return null;
  for(const c of DB.cartas){
    for(const sec of (c.secciones||[])){
      const p = (sec.platos||[]).find(x=>x.id===platoId);
      if(p) return p;
    }
  }
  return null;
}
// Descuenta "qty" raciones del plato al marcharlo a cocina, si tiene un
// límite de raciones configurado (p.stock != null). Al llegar a 0 se marca
// "No disponible" sola, sin que nadie tenga que estar pendiente durante el
// servicio. Los platos sin límite (p.stock == null, el caso normal) no se
// tocan aquí.
function decrementDishStock(platoId, qty){
  if(!qty || qty <= 0) return;
  const p = findCartaPlatoById(platoId);
  if(!p || p.stock == null) return;
  p.stock = Math.max(0, p.stock - qty);
  if(p.stock === 0) p.disponible = false;
}
// Tipo de IVA repercutido real de una línea de comanda, buscando en el
// menú/plato/receta que la originó — se guarda (se "estampa") en cada línea
// de la venta en el momento de cobrar, para que quede fijo en el histórico
// tal como era entonces aunque luego cambie el IVA del plato en Carta.
function resolveLineIvaPct(line){
  if(!line) return null;
  if(line.menuId != null){
    const m = DB.menus.find(x=>x.id===line.menuId);
    if(m && m.ivaPct != null) return m.ivaPct;
  }
  if(line.platoId != null){
    const p = findCartaPlatoById(line.platoId);
    if(p && p.ivaPct != null) return p.ivaPct;
  }
  if(line.recipeId != null){
    const r = DB.recipes.find(x=>x.id===line.recipeId);
    if(r && r.ivaPct != null) return r.ivaPct;
  }
  return null;
}

// Líneas de la venta a partir del pedido, con el IVA de cada plato/bebida
// resuelto Y una línea aparte para el coste de envío si lo hay. Antes el
// envío solo vivía dentro de order.costeEnvio, sumado al total del pedido
// pero SIN representación en sale.items — como toda la facturación neta y
// el IVA repercutido del mes (Gestión Económica) se calculan iterando
// sale.items, ese dinero cobrado por envío desaparecía de esos cálculos
// (aunque sí contaba en el bruto del ticket), y su IVA nunca se declaraba
// en la liquidación. El envío lleva el tipo general (21%), no el reducido
// de la comida, por eso se le asigna su propio ivaPct explícito en vez de
// dejar que resolveLineIvaPct lo intente resolver (fallaría, al no tener
// platoId/recipeId, y caería en el tipo por defecto de las ventas).
// El coste de un plato (recipeCost) se recalcula siempre con los precios
// ACTUALES de ingredientes — necesario en Escandallo/Stock para saber cuánto
// cuesta hoy. Pero si un informe de márgenes de hace 3 meses usa esa misma
// función, el coste (y por tanto el margen) de esa venta pasada cambia solo
// cada vez que sube el precio de un ingrediente, aunque el ingreso (line.price)
// ya esté fijo desde el momento de la venta. Se "estampa" aquí el coste
// unitario vigente en ese instante, igual que ya se hace con el IVA
// (resolveLineIvaPct) — los informes históricos (ver costoUnitarioDeLinea en
// hr.js/finance.js) usan este valor cuando existe y solo recalculan en vivo
// para ventas antiguas guardadas antes de este cambio.
function buildSaleItemsForOrder(order){
  const items = order.items.map(l => {
    const r = l.recipeId ? getRecipe(l.recipeId) : null;
    const menuSelections = Array.isArray(l.menuSelections)
      ? l.menuSelections.map(sel => {
          const selRecipe = sel.recipeId ? getRecipe(sel.recipeId) : null;
          return {...sel, costeUnitario: selRecipe ? recipeCost(selRecipe) : null};
        })
      : l.menuSelections;
    return {...l, ivaPct: resolveLineIvaPct(l), costeUnitario: r ? recipeCost(r) : null, ...(menuSelections ? {menuSelections} : {})};
  });
  if(order.costeEnvio > 0){
    items.push({name: t('label.shippingLineItem'), price: order.costeEnvio, qty: 1, ivaPct: 21, bebida: false, isShipping: true});
  }
  return items;
}
// Coste unitario de una línea de venta ya cobrada: el estampado en su
// momento si existe (ventas nuevas), o si no (ventas antiguas, previas a
// este cambio) recalculado en vivo como se hacía siempre — para no dejar
// sin coste ni romper los informes con el histórico ya guardado.
function costoUnitarioDeLinea(line){
  if(line.costeUnitario != null) return line.costeUnitario;
  const r = line.recipeId ? getRecipe(line.recipeId) : null;
  return r ? recipeCost(r) : 0;
}
// Para los pedidos "para llevar" (tickets rápidos), los platos pasan a cocina automáticamente
// al añadirlos o aumentar su cantidad, sin necesidad de pulsar "Marchar".
function autoSendTakeawayLine(order, line){
  if(order.tipo !== 'takeaway' || !line) return;
  const qtyFired = line.qty - (line.marchada||0);
  line.estado = 'cocina';
  delete line.recogidoAt;
  line.enviadoAt = line.enviadoAt || new Date().toISOString();
  line.marchada = line.qty;
  if(!line.bebida) decrementDishStock(line.platoId, qtyFired);
  order.cerrada = false;
}

// Las bebidas nunca pasan por Cocina (no hay nada que cocinar) ni por el
// paso de "Marchar" — se sirven directamente desde Sala, así que en cuanto
// se añaden (o sube su cantidad) ya tienen que estar listas para su propio
// ciclo de estado (pedida → preparando → servida) sin ningún clic previo.
// marchada siempre igual a qty para que nunca cuenten como "pendiente de
// marchar" en ningún sitio (contador de la tanda, botón de "Marchar vale"...).
function syncBebidaLineEstado(line){
  if(!line || !line.bebida) return;
  line.marchada = line.qty;
  if(!line.estado){
    line.estado = 'cocina';
    delete line.recogidoAt;
    line.enviadoAt = line.enviadoAt || new Date().toISOString();
  }
}

// El primer grupo de platos (primer tanda añadida a la comanda) se marcha a
// cocina automáticamente. Los siguientes grupos se marchan manualmente.
function autoSendFirstCourse(order, line, tanda){
  if(!line || order.tipo === 'takeaway') return;
  const firstTanda = (order.tandas||[])[0];
  if(firstTanda === undefined || (tanda||'') !== (firstTanda||'')) return;
  const qtyFired = line.qty - (line.marchada||0);
  line.estado = 'cocina';
  delete line.recogidoAt;
  line.enviadoAt = line.enviadoAt || new Date().toISOString();
  line.marchada = line.qty;
  if(!line.bebida) decrementDishStock(line.platoId, qtyFired);
  order.cerrada = false;
}

function addOrderItem(orderId, secId, platoId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const p = findCartaPlato(secId, platoId);
  if(!order || !p) return;
  if((p.modificadores||[]).length){
    openAddItemModal(orderId, secId, platoId);
    return;
  }
  const sec = findCartaSeccion(secId);
  const tanda = sec ? sec.nombre : '';
  order.tandas = order.tandas || [];
  if(tanda && !order.tandas.includes(tanda)) order.tandas.push(tanda);
  // ¿Esta unidad se marchará automáticamente? (takeaway o primera tanda)
  const autoSend = order.tipo === 'takeaway' || (tanda||'') === ((order.tandas||[])[0]||'');
  // Agrupar en una línea existente del mismo plato (x2, x3...). Si la línea ya
  // está marchada, solo agrupamos cuando esta adición también se marcha sola,
  // para no fusionarla con platos que aún están pendientes de marchar a mano.
  const existing = order.items.find(l => l.platoId === platoId && l.recipeId === p.recipeId && !(l.notas) && (l.tanda||'') === tanda && l.estado !== 'entregado' && (!l.marchada || autoSend));
  let line;
  if(existing){ existing.qty += 1; line = existing; }
  else{
    line = {platoId: p.id, recipeId: p.recipeId, name: tItem(p), price: p.precio, qty:1, tanda, notas:''};
    if(isSeccionBebida(secId)) line.bebida = true;
    applyActivePromoToLine(line);
    order.items.push(line);
  }
  autoSendTakeawayLine(order, line);
  autoSendFirstCourse(order, line, tanda);
  syncBebidaLineEstado(line);
  warnIfRecipeStockShort(p.recipeId);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  renderTableOrderModal(orderId);
}

/* ============== Extras y notas al añadir un plato a la comanda ============== */
function openAddItemModal(orderId, secId, platoId){
  const p = findCartaPlato(secId, platoId);
  if(!p) return;
  const mods = p.modificadores || [];
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(tItem(p))} · ${fmtMoney(p.precio)}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    ${mods.length ? `
      <div class="field">
        <label>${t('title.extras')}</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${mods.map(m => `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" class="add-item-mod" value="${m.id}" style="width:auto">
              ${escapeHtml(tItem(m))}${m.precio ? ` <span style="color:var(--brand-orange);font-weight:600">+${fmtMoney(m.precio)}</span>` : ''}
            </label>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="field">
      <label>${t('label.notesOptional')}</label>
      <textarea id="add-item-notas" rows="2" placeholder="${t('ph.egOrderNote')}"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAddOrderItem(${orderId}, ${secId}, ${platoId})"><i class="ti ti-plus"></i> ${t("btn.addToOrder")}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('add-item-notas')?.focus(), 50);
}
function confirmAddOrderItem(orderId, secId, platoId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const p = findCartaPlato(secId, platoId);
  if(!order || !p) return;
  const mods = p.modificadores || [];
  const selectedMods = [...document.querySelectorAll('.add-item-mod:checked')]
    .map(el => mods.find(m => m.id === parseInt(el.value)))
    .filter(Boolean);
  const notas = (document.getElementById('add-item-notas')?.value || '').trim();
  const extra = selectedMods.reduce((s,m)=>s+(m.precio||0), 0);
  const name = selectedMods.length ? `${p.nombre} (${selectedMods.map(m=>m.nombre).join(', ')})` : p.nombre;
  const sec = findCartaSeccion(secId);
  const tanda = sec ? sec.nombre : '';
  order.tandas = order.tandas || [];
  if(tanda && !order.tandas.includes(tanda)) order.tandas.push(tanda);
  const modKey = selectedMods.map(m=>m.id).sort().join(',');
  const normMods = (m) => JSON.stringify(m && m.length ? m.map(x=>x.nombre).sort() : []);
  const autoSend = order.tipo === 'takeaway' || (tanda||'') === ((order.tandas||[])[0]||'');
  const existing = order.items.find(l => l.platoId === platoId && (l.tanda||'') === tanda && (l.notas||'') === notas && l.estado !== 'entregado' && (!l.marchada || autoSend) && normMods(l.modificadores) === normMods(selectedMods));
  let line;
  if(existing){
    existing.qty += 1;
    line = existing;
  } else {
    line = {
      platoId: p.id, recipeId: p.recipeId, name, price: p.precio + extra, qty:1, tanda,
      notas, modificadores: selectedMods.map(m=>({nombre:m.nombre, precio:m.precio}))
    };
    if(isSeccionBebida(secId)) line.bebida = true;
    applyActivePromoToLine(line, p.nombre);
    order.items.push(line);
  }
  autoSendTakeawayLine(order, line);
  autoSendFirstCourse(order, line, tanda);
  syncBebidaLineEstado(line);
  warnIfRecipeStockShort(p.recipeId);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  renderTableOrderModal(orderId);
}
function changeOrderItemQty(orderId, idx, delta){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items[idx]) return;
  const line = order.items[idx];
  // Bajar la cantidad de un plato que ya se ha marchado a cocina (o servido)
  // exige PIN y motivo: si no, se podría reducir en silencio la venta de
  // comida que el cliente ya se ha comido.
  if(delta < 0 && (line.marchada||0) > 0){
    requestVoidLine(orderId, idx, 'qty', delta);
    return;
  }
  line.qty += delta;
  if(line.qty <= 0){
    order.items.splice(idx,1);
    reassignMenuBasePrice(order, line);
  } else {
    autoSendTakeawayLine(order, line);
    syncBebidaLineEstado(line);
    if(delta > 0) warnIfRecipeStockShort(line.recipeId);
  }
  saveDB();
  renderTableOrderModal(orderId);
}
function removeOrderItem(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items[idx]) return;
  const line = order.items[idx];
  // Si el plato ya se ha marchado a cocina (incluido si ya se ha entregado),
  // o si ya lo pagó el cliente por su cuenta desde el móvil (confirmado o
  // aún pendiente de confirmar), anularlo exige PIN y motivo — en el caso
  // del pago, para no borrar en silencio algo que ya se ha cobrado de
  // verdad, quede o no constancia en cocina.
  if((line.marchada||0) > 0 || line.pagadoOnline || line.pagoOnlinePendiente){
    requestVoidLine(orderId, idx, 'remove', null);
    return;
  }
  order.items.splice(idx,1);
  reassignMenuBasePrice(order, line);
  saveDB();
  renderTableOrderModal(orderId);
}

// Motivos estándar de anulación de un plato, para el registro de auditoría.
const VOID_REASON_KEYS = {
  error_comanda: 'void.reason.orderError', cliente_cambio: 'void.reason.clientChanged',
  cocina_error: 'void.reason.kitchenError', producto_agotado: 'void.reason.outOfStock', otro: 'void.reason.other'
};
let voidPending = null; // {orderId, idx, type:'remove'|'qty', delta}
function requestVoidLine(orderId, idx, type, delta){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line) return;
  voidPending = {orderId, idx, type, delta};
  // Si quien está fichado ahora mismo entró con su propio PIN de empleado,
  // la app ya sabe quién es y no hace falta preguntarlo — solo si entra
  // como propietario (sin identidad de empleado concreta) se deja elegir a
  // mano, igual que ya se hace con los descuentos.
  const loggedEmployeeId = loggedInEmployeeId();
  const camareros = DB.employees.filter(e => (e.area||'cocina') === 'sala');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.voidDish')}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">"${escapeHtml(line.name)}" ${t('msg.voidDishDesc')}</p>
    ${loggedEmployeeId === null && camareros.length ? `<div class="field">
      <label>${t('label.responsible')}</label>
      <select id="void-responsable-sel">
        <option value="">—</option>
        ${camareros.map(e => `<option value="${e.id}" ${order.camareroId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="field">
      <label>${t('label.voidReason')}</label>
      <select id="void-reason-select" onchange="document.getElementById('void-reason-other').style.display=this.value==='otro'?'block':'none'">
        ${Object.entries(VOID_REASON_KEYS).map(([k,labelKey])=>`<option value="${k}">${t(labelKey)}</option>`).join('')}
      </select>
      <textarea id="void-reason-other" rows="2" placeholder="${t('ph.describeReason')}" style="display:none;margin-top:6px"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmVoidLine()"><i class="ti ti-trash"></i> ${t('btn.voidDish')}</button>
    </div>
  `);
}
// Ya no pide el PIN de negocio (igual que los descuentos): quien anula queda
// igualmente identificado por su sesión (o elegido a mano solo si nadie
// está fichado individualmente), y la anulación se ve en el Historial de
// Anulaciones para que el responsable pueda revisar quién ha hecho qué y
// actuar si algo no cuadra — el control pasa a ser "queda constancia", no
// "hace falta un PIN para poder hacerlo".
function confirmVoidLine(){
  if(!voidPending) return;
  const {orderId, idx, type, delta} = voidPending;
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!order || !line) return;
  const reasonSel = document.getElementById('void-reason-select').value;
  const reasonOther = document.getElementById('void-reason-other').value.trim();
  const motivo = reasonSel === 'otro' ? (reasonOther || t(VOID_REASON_KEYS.otro)) : t(VOID_REASON_KEYS[reasonSel]);
  const mesa = order.tableId ? (DB.tables.find(t=>t.id===order.tableId)||{}).name : togoOrderLabel(order);
  const respSel = document.getElementById('void-responsable-sel');
  const loggedEmployeeId = loggedInEmployeeId();
  const responsableId = loggedEmployeeId !== null ? loggedEmployeeId : (respSel && respSel.value ? parseInt(respSel.value) : null);
  const responsable = responsableId ? DB.employees.find(e => e.id === responsableId) : null;
  // Si nadie fichado como empleado ni elegido a mano, es el propio dueño
  // quien lo ha hecho — antes se quedaba en blanco, dando a entender que no
  // había quedado registrado nadie.
  const responsableNombre = responsable ? responsable.name : (loggedEmployeeId === null ? t('label.owner') : '');

  if(!DB.voidLog) DB.voidLog = [];
  DB.voidLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    plato: line.name, cantidad: type==='remove' ? line.qty : Math.abs(delta),
    estado: line.estado||'', motivo, mesa: mesa||'',
    responsableId, responsableNombre
  });
  // Sigue viviendo en su propio Historial de Anulaciones (con más detalle:
  // motivo, mesa...) — esto es solo para que también salga en el registro
  // general, sin duplicar cuál es la fuente de verdad de ese historial.
  logAudit('void', t('audit.voidedDish').replace('${dish}', line.name).replace('${table}', mesa||'?'), 'critical');

  // Solo se descontó stock por las raciones que de verdad se "marcharon"
  // a cocina (line.marchada) — si la línea nunca llegó a marchar, no hay
  // nada que devolver. Restaura justo esa parte, no toda la línea, para no
  // sobre-restituir si solo se había marchado una parte de la cantidad.
  const firedQty = line.marchada || 0;
  // Los ingredientes de la receta (Mega Lista) NUNCA se descuentan al marchar
  // a cocina — eso solo pasa al cobrar (discountStockForOrder, en
  // finalizeCharge/finalizeSplitOrder). Devolverlos aquí (como se hacía
  // antes) sumaba stock de ingredientes que nunca se había restado, inflando
  // el inventario en cada anulación previa al cobro. Solo se restituyen las
  // raciones directas del plato (p.stock), que sí se descontaron al marchar
  // (decrementDishStock).
  if(type === 'remove'){
    if(firedQty > 0) restockForVoidedItems([{...line, qty: firedQty}], {includeIngredients: false});
    order.items.splice(idx,1);
    reassignMenuBasePrice(order, line);
  } else {
    const removedQty = Math.abs(delta);
    const restockQty = Math.min(removedQty, firedQty);
    if(restockQty > 0) restockForVoidedItems([{...line, qty: restockQty}], {includeIngredients: false});
    line.qty += delta;
    if(line.qty <= 0){
      order.items.splice(idx,1);
      reassignMenuBasePrice(order, line);
    } else if(line.marchada > line.qty) line.marchada = line.qty;
  }
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  voidPending = null;
  renderTableOrderModal(orderId);
  showToast(t('msg.voidRegistered'));
}
// Anula una venta YA COBRADA (mesa equivocada, cobro duplicado, disputa de
// tarjeta...). Antes no existía ningún camino para esto — una vez pagada,
// la venta era permanente y había que retocar los datos a mano. Revierte
// el stock que se descontó al marchar cada línea (raciones limitadas del
// plato + ingredientes/elaboraciones de su receta) y deja constancia en
// DB.voidLog en vez de borrar el ticket, para no perder el rastro contable.
// Pide siempre el PIN del negocio: es la acción más delicada de TPV.
function requestCancelSale(saleId){
  const sale = (DB.sales||[]).find(s => s.id === saleId);
  if(!sale || sale.status === 'anulada') return;
  requestBusinessPinAction(t('title.cancelSale'), t('msg.confirmCancelSale'), (pin) => reallyCancelSale(saleId, pin));
}
function restockForVoidedItems(items, opts){
  // includeIngredients=false: solo se restituyen las raciones directas del
  // plato (p.stock), no los ingredientes de su escandallo — para el caso de
  // anular ANTES de cobrar, donde discountStockForOrder todavía no se ha
  // ejecutado y no hay nada que devolver a Mega Lista (ver confirmVoidLine).
  const includeIngredients = !opts || opts.includeIngredients !== false;
  (items||[]).forEach(line => {
    if(!line.isShipping && line.platoId != null){
      const p = findCartaPlatoById(line.platoId);
      if(p && p.stock != null){
        const wasOut = p.stock === 0;
        p.stock = p.stock + (line.qty||0);
        if(wasOut) p.disponible = true;
      }
    }
    // Una opción de menú elegida por stock directo (bebida de Carta con
    // raciones limitadas, sel.platoId) se descuenta igual que un plato normal
    // en discountStockForOrder — sin esto, aquí nunca se le devolvía su
    // ración al anular, dejando su contador de raciones por debajo de lo real.
    if(Array.isArray(line.menuSelections)){
      line.menuSelections.forEach(sel => {
        if(sel.platoId == null) return;
        const p = findCartaPlatoById(sel.platoId);
        if(p && p.stock != null){
          const wasOut = p.stock === 0;
          p.stock = p.stock + (line.qty||0);
          if(wasOut) p.disponible = true;
        }
      });
    }
    if(!includeIngredients) return;
    const recetas = [];
    if(line.recipeId) recetas.push(line.recipeId);
    else if(Array.isArray(line.menuSelections)) line.menuSelections.forEach(sel => { if(sel.recipeId) recetas.push(sel.recipeId); });
    recetas.forEach(recipeId => {
      const r = getRecipe(recipeId);
      if(!r) return;
      (r.ingredients||[]).forEach(ri => {
        // Misma merma (%) que discountStockForOrder aplica al descontar: sin
        // esto se devolvía menos de lo que de verdad se había restado, y cada
        // anulación de una venta ya cobrada dejaba el stock por debajo del
        // consumo real, tanto más cuanta más merma tuviera la receta.
        const bruto = ri.qty * (1 + (ri.merma||0)/100) * (line.qty||0);
        if(ri.type === 'base'){
          const elab = (DB.elaboraciones||[]).find(e => e.recipeId === ri.baseRecipeId);
          if(elab) elab.qty = (elab.qty||0) + bruto;
          return;
        }
        const s = getStockEntry(ri.ingredientId);
        s.qty = (s.qty||0) + bruto;
      });
    });
  });
}
function reallyCancelSale(saleId, pin){
  // El PIN se vuelve a comprobar aquí, no solo en el modal que llama a esta
  // función: sin esto, cualquiera con la consola del navegador podía anular
  // cualquier venta llamando reallyCancelSale(id) directamente, sin conocer
  // el PIN del negocio — el modal era un candado de interfaz, no de datos.
  if(!pinMatchesHash(pin, DB.business.pin)) return;
  const sale = (DB.sales||[]).find(s => s.id === saleId);
  if(!sale || sale.status === 'anulada') return;
  restockForVoidedItems(sale.items);
  sale.status = 'anulada';
  sale.anuladaAt = new Date().toISOString();
  const loggedEmployeeId = loggedInEmployeeId();
  const responsable = loggedEmployeeId != null ? DB.employees.find(e => e.id === loggedEmployeeId) : null;
  // Sin empleado fichado, es el propio dueño quien anula — antes se quedaba
  // en blanco, dando a entender que no había quedado registrado nadie.
  sale.anuladaResponsableNombre = responsable ? responsable.name : (loggedEmployeeId === null ? t('label.owner') : '');
  if(!DB.voidLog) DB.voidLog = [];
  DB.voidLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    plato: t('label.wholeSaleVoided').replace('${amount}', fmtMoney(sale.total)),
    cantidad: 1, estado: 'pagada', motivo: t('msg.saleVoidedAfterCharge'), mesa: '',
    responsableId: loggedEmployeeId, responsableNombre: sale.anuladaResponsableNombre
  });
  // Si ya se había enviado a VeriFactu, NO se puede simplemente "deshacer" —
  // hace falta una factura rectificativa. Como ese flujo con Invocash
  // todavía no está probado en vivo (ver docs/VERIFACTU_PENDIENTE.md), se
  // deja marcada para gestionarla a mano en su panel en vez de intentar
  // automatizar algo sin confirmar.
  if(sale.verifactu && sale.verifactu.status === 'sent'){
    sale.verifactu.needsRectification = true;
  }
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  closeModal();
  renderTPV();
  showToast(t('msg.saleVoided'));
}

function openVoidLogModal(){
  const log = [...(DB.voidLog||[])].reverse().slice(0, 100);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.voidLog')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.dishElaboration')}</th><th>${t('label.quantity')}</th><th>${t('label.responsible')}</th><th>${t('label.voidReason')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td data-label="${t('common.date')}">${escapeHtml(e.fecha)}</td><td data-label="${t('th.time')}">${escapeHtml(e.hora)}</td><td data-label="${t('label.tables')}">${escapeHtml(e.mesa||'—')}</td><td data-label="${t('label.dishElaboration')}">${escapeHtml(e.plato)}</td><td data-label="${t('label.quantity')}">${e.cantidad}</td><td data-label="${t('label.responsible')}">${escapeHtml(e.responsableNombre||'—')}</td><td data-label="${t('label.voidReason')}">${escapeHtml(e.motivo)}</td></tr>`).join('') : `<tr><td colspan="7"><div class="empty" style="padding:14px">${t('empty.noVoidsRegistered')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

// Momentos de servicio típicos para poder marchar la comanda por tandas
// (primeros, segundos...) independientemente de la sección de la carta.
function getCourseOptions(){ return t('tpv.courseOptions'); }

function openLineNotesModal(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line) return;
  const options = [...new Set([...getCourseOptions(), ...(order.tandas||[]), line.tanda||''])].filter(o=>o!=='');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-note"></i> ${escapeHtml(line.name)}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.serviceMoment')}</label>
      <select id="line-tanda-input">
        <option value="">${t('label.noTandaSingleDish')}</option>
        ${options.map(opt => `<option value="${escapeHtml(opt)}" ${line.tanda===opt?'selected':''}>${escapeHtml(opt)}</option>`).join('')}
      </select>
      <small style="color:var(--muted)">${t('label.serviceMomentHint')}</small>
    </div>
    <div class="field">
      <label>${t('label.kitchenNotes')}</label>
      <textarea id="line-notas-input" rows="3" placeholder="${t('ph.egOrderNote')}">${escapeHtml(line.notas||'')}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmLineNotes(${orderId}, ${idx})"><i class="ti ti-check"></i> ${t('common.save')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('line-notas-input')?.focus(), 50);
}
function confirmLineNotes(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line) return;
  line.notas = (document.getElementById('line-notas-input').value||'').trim();
  const tanda = document.getElementById('line-tanda-input').value;
  line.tanda = tanda;
  order.tandas = order.tandas || [];
  if(tanda && !order.tandas.includes(tanda)) order.tandas.push(tanda);
  saveDB();
  renderTableOrderModal(orderId);
}

function openPaymentModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items.length) return;
  paymentTab = order.splitMode || 'full';
  renderPaymentModal(orderId);
}

function setPaymentTab(orderId, tab){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(order && order.splitPayments && order.splitPayments.some(p=>p.paid) && order.splitMode !== tab){
    showToast(t('msg.finishSplitFirst'));
    return;
  }
  paymentTab = tab;
  renderPaymentModal(orderId);
}

function renderPaymentModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items.length) return;
  const total = orderTotal(order);
  const tabs = [
    {id:'full', labelKey:'label.fullBill', icon:'ti-receipt'},
    {id:'equal', labelKey:'label.splitEqually', icon:'ti-users-group'},
    {id:'items', labelKey:'label.splitByDiner', icon:'ti-friends'}
  ];
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cash"></i> ${t('title.chargeOrder')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="label">${t('label.billTotal')}</div>
      <div class="value">${fmtMoney(total)}</div>
    </div>
    <div class="tabs" style="margin-bottom:12px">
      ${tabs.map(tb => `<div class="tab${paymentTab===tb.id?' active':''}" onclick="setPaymentTab(${order.id}, '${tb.id}')"><i class="ti ${tb.icon}"></i> ${t(tb.labelKey)}</div>`).join('')}
    </div>
    <div id="payment-tab-body">
      ${paymentTab === 'equal' ? renderEqualSplitTab(order) : paymentTab === 'items' ? renderItemsSplitTab(order) : renderFullPaymentTab(order, total)}
    </div>
    <div class="modal-footer">
      ${renderPaymentModalFooterButtons(order)}
    </div>
  `);
}

// Único pie de botones del modal de cobro, sea cual sea la pestaña activa
// (cuenta completa / dividir a partes iguales / por comensal). Antes cada
// pestaña de división tenía su propio pie de botones aparte, anidado
// dentro del mismo modal que el pie general — al ser ambos "sticky" al
// fondo, podían acabar superpuestos visualmente. Centralizarlo aquí en un
// único pie evita el problema de raíz en vez de parchearlo.
function renderPaymentModalFooterButtons(order){
  const backBtn = `<button class="btn" onclick="renderTableOrderModal(${order.id})">${t('common.back')}</button>`;
  if(paymentTab === 'full'){
    return `${backBtn}<button class="btn btn-primary" onclick="finalizeCharge(${order.id})"><i class="ti ti-check"></i> ${t('btn.confirmCharge')}</button>`;
  }
  const inSplitMode = order.splitPayments && order.splitMode === paymentTab;
  if(!inSplitMode){
    // Todavía no se ha generado el reparto: el botón de "repartir/calcular" es la acción principal.
    const genFn = paymentTab === 'equal' ? `generateEqualSplit(${order.id})` : `generateItemsSplit(${order.id})`;
    const genLabel = paymentTab === 'equal' ? t('btn.splitBill') : t('btn.calcSplit');
    return `${backBtn}<button class="btn btn-primary" onclick="${genFn}"><i class="ti ti-divide"></i> ${genLabel}</button>`;
  }
  // Reparto ya generado: mostrar cancelar y, si todas las partes están cobradas, finalizar.
  const allPaid = order.splitPayments.every(p=>p.paid);
  return `${backBtn}<button class="btn" onclick="cancelSplit(${order.id})"><i class="ti ti-x"></i> ${t('btn.cancelSplit')}</button>${allPaid ? `<button class="btn btn-primary" onclick="finalizeSplitOrder(${order.id})"><i class="ti ti-check"></i> ${t('btn.finalizeCharge')}</button>` : ''}`;
}

/* ------------------ Pestaña: cuenta completa ------------------ */
// Descuento (%) y propina (importe) solo se aplican en el cobro de cuenta
// completa: cuando se divide la cuenta, cada parte se cobra por su importe
// exacto sin más ajustes, para no complicar cómo se reparten.
// El descuento SIEMPRE se lee de order.descuentoPct (ya aplicado con PIN +
// motivo), nunca directamente del input, para que no se pueda cobrar un
// descuento sin haberlo autorizado.
// Redondea a céntimos evitando el arrastre de errores de coma flotante
// típico de JS (p.ej. 12.34 - 1.851 = 10.489000000000001): todo cálculo de
// dinero que se vaya a comparar o restar (cambio, mixto, reparto) pasa por
// aquí antes de mostrarse o guardarse.
function roundMoney(x){
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

// Si hay una promo con descuento real activa hoy para este plato/bebida
// (getActivePromoForDish, en js/app.js), se aplica el precio rebajado en el
// momento de añadirlo a la comanda, guardando el precio original para poder
// mostrar el badge de promo en el panel de comanda.
function applyActivePromoToLine(line, dishName){
  const promo = getActivePromoForDish(dishName || line.name, line.platoId);
  if(!promo) return;
  line.originalPrice = line.price;
  line.price = roundMoney(line.price * (1 - promo.discountPct/100));
  line.promoId = promo.id;
  line.promoPct = promo.discountPct;
  registerPromoUse(promo.id);
}

// Desglose claro del cálculo (subtotal → descuento → propina → total),
// en vez de mostrar solo el número final sin más contexto — así se ve de
// un vistazo, por ejemplo, "100€ − 10% (10€) = 90€" en lugar de solo "90€".
function renderPaymentBreakdownHtml(total, descuentoPct, propina){
  const descuentoImporte = roundMoney(total * descuentoPct / 100);
  const parts = [`${t('label.subtotal')}: <strong>${fmtMoney(total)}</strong>`];
  if(descuentoPct > 0) parts.push(`${t('label.discount')} (${descuentoPct}%): <strong style="color:var(--red)">−${fmtMoney(descuentoImporte)}</strong>`);
  if(propina > 0) parts.push(`${t('label.tip')}: <strong style="color:var(--green)">+${fmtMoney(propina)}</strong>`);
  return parts.join(' &nbsp;·&nbsp; ');
}

function computeFinalTotal(order){
  const total = orderTotal(order);
  const tipEl = document.getElementById('payment-tip');
  const descuentoPct = order.descuentoPct || 0;
  // "propina" es solo la que se cobra ahora en caja (la del campo editable,
  // que parte de order.propina) — la propina ya pagada por móvil
  // (order.propinaPagadaOnline) NO se mete aquí para no liar el desglose que
  // ve el camarero (el campo de propina no la refleja), pero SÍ tiene que
  // sumarse a finalTotal más abajo, porque forma parte del valor real de la
  // cuenta igual que la comida ya pagada.
  const propina = tipEl ? Math.max(0, parseFloat(tipEl.value)||0) : (order.propina||0);
  const propinaOnline = order.propinaPagadaOnline || 0;
  const descuentoImporte = roundMoney(total * descuentoPct / 100);
  const finalTotal = roundMoney(total - descuentoImporte + propina + propinaOnline);
  // amountPaidOnline: lo que ya pagaron por su cuenta desde el móvil, comida
  // + propina (ver orderAmountPaidOnline). amountDue: lo que de verdad queda
  // por cobrar en caja — finalTotal sigue siendo el valor total real de la
  // cuenta (para contabilidad), amountDue es lo nuevo.
  const amountPaidOnline = orderAmountPaidOnline(order);
  const amountDue = Math.max(0, roundMoney(finalTotal - amountPaidOnline));
  return {total, descuentoPct, descuentoImporte, propina, finalTotal, amountPaidOnline, amountDue};
}

function renderFullPaymentTab(order, total){
  const descuentoPct = order.descuentoPct || 0;
  const propina = order.propina || 0;
  const propinaOnline = order.propinaPagadaOnline || 0;
  const finalTotal = total - (total*descuentoPct/100) + propina + propinaOnline;
  const amountPaidOnline = orderAmountPaidOnline(order);
  const amountDue = Math.max(0, roundMoney(finalTotal - amountPaidOnline));
  // Nombres de quienes ya pagaron su parte por móvil (QR de mesa), para que
  // el camarero sepa de un vistazo quién falta por cobrar, no solo cuánto.
  const payerNames = [...new Set((order.items||[]).filter(l => l.pagadoOnline && l.pagadorNombre).map(l => l.pagadorNombre))];
  return `
    <div class="field-row">
      <div class="field">
        <label>${t('label.discountPct')}</label>
        <div style="display:flex;gap:6px">
          <input type="number" id="payment-discount" min="0" max="100" step="1" value="${descuentoPct}" style="flex:1" onfocus="this.select()">
          <button class="btn btn-sm" onclick="requestApplyDiscount(${order.id})">${t('btn.applyDiscount')}</button>
        </div>
        ${descuentoPct > 0 ? `<small style="color:var(--muted)">${t('label.discountAppliedBy')}: ${escapeHtml(order.descuentoResponsableNombre||'—')} — "${escapeHtml(order.descuentoMotivo||'')}"</small>` : ''}
      </div>
      <div class="field">
        <label>${t('label.tip')} (€)</label>
        <input type="number" id="payment-tip" min="0" step="0.5" value="${propina}" oninput="updatePaymentTip(${order.id})" onfocus="this.select()">
      </div>
    </div>
    <div id="payment-breakdown" style="font-size:12.5px;color:var(--muted);margin-bottom:6px">
      ${renderPaymentBreakdownHtml(total, descuentoPct, propina)}
    </div>
    ${amountPaidOnline > 0 ? `
    <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12.5px;margin-bottom:10px">
      <i class="ti ti-credit-card" style="color:var(--brand-orange)"></i> ${t('label.paidOnlinePartial').replace('${amount}', fmtMoney(amountPaidOnline))}${payerNames.length ? ` (${payerNames.map(escapeHtml).join(', ')})` : ''}
    </div>` : ''}
    <div class="kpi" style="margin-bottom:12px">
      <div class="label">${amountPaidOnline > 0 ? t('label.remainingToCharge') : t('label.totalToCharge')}</div>
      <div class="value" id="payment-final-total">${fmtMoney(amountDue)}</div>
    </div>
    <div class="field">
      <label>${t('label.paymentMethod')}</label>
      <select id="payment-method" onchange="togglePaymentCash()">
        ${SELECTABLE_PAYMENT_METHODS.map(m=>`<option value="${m}">${paymentMethodTpvLabel(m)}</option>`).join('')}
        <option value="Mixto">${t('pay.mixed')}</option>
      </select>
    </div>
    <div class="field" id="payment-cash-field">
      <label>${t('label.amountGiven')}</label>
      <input type="number" id="payment-cash" step="0.01" min="0" value="${amountDue.toFixed(2)}" oninput="updatePaymentChange(${order.id})" onfocus="this.select()">
    </div>
    <div class="kpi" id="payment-change-kpi" style="margin-bottom:12px">
      <div class="label">${t('label.change')}</div>
      <div class="value" id="payment-change">${fmtMoney(0)}</div>
    </div>
    <div id="payment-mixed-fields" style="display:none">
      <div class="field-row">
        <div class="field">
          <label>${t('pay.cash')} (€)</label>
          <input type="number" id="payment-mixed-cash" step="0.01" min="0" value="${(amountDue/2).toFixed(2)}" oninput="updatePaymentMixed(${order.id}, 'cash')">
        </div>
        <div class="field">
          <label>${t('pay.card')} (€)</label>
          <input type="number" id="payment-mixed-card" step="0.01" min="0" value="${(amountDue - amountDue/2).toFixed(2)}" oninput="updatePaymentMixed(${order.id}, 'card')">
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted)" id="payment-mixed-hint"></p>
    </div>
  `;
}

function togglePaymentCash(){
  const method = document.getElementById('payment-method').value;
  const isCash = method === 'Efectivo';
  const isMixed = method === 'Mixto';
  document.getElementById('payment-cash-field').style.display = isCash ? '' : 'none';
  document.getElementById('payment-change-kpi').style.display = isCash ? '' : 'none';
  document.getElementById('payment-mixed-fields').style.display = isMixed ? '' : 'none';
  if(isMixed) updatePaymentMixedHint();
}

// Al editar uno de los dos importes del pago mixto, ajusta el otro para que
// la suma siga cuadrando con el total a cobrar.
function updatePaymentMixed(orderId, changed){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const {amountDue} = computeFinalTotal(order);
  const cashEl = document.getElementById('payment-mixed-cash');
  const cardEl = document.getElementById('payment-mixed-card');
  if(changed === 'cash'){
    const cash = Math.max(0, Math.min(amountDue, parseFloat(cashEl.value) || 0));
    cardEl.value = roundMoney(amountDue - cash).toFixed(2);
  } else {
    const card = Math.max(0, Math.min(amountDue, parseFloat(cardEl.value) || 0));
    cashEl.value = roundMoney(amountDue - card).toFixed(2);
  }
  updatePaymentMixedHint();
}
function updatePaymentMixedHint(){
  const hint = document.getElementById('payment-mixed-hint');
  if(!hint) return;
  const cash = parseFloat(document.getElementById('payment-mixed-cash')?.value) || 0;
  const card = parseFloat(document.getElementById('payment-mixed-card')?.value) || 0;
  hint.textContent = `${t('pay.cash')}: ${fmtMoney(cash)} + ${t('pay.card')}: ${fmtMoney(card)} = ${fmtMoney(cash+card)}`;
}

function updatePaymentTip(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const tipEl = document.getElementById('payment-tip');
  order.propina = tipEl ? Math.max(0, parseFloat(tipEl.value)||0) : 0;
  saveDB();
  const {total, descuentoPct, propina, amountDue} = computeFinalTotal(order);
  const kpiEl = document.getElementById('payment-final-total');
  if(kpiEl) kpiEl.textContent = fmtMoney(amountDue);
  const breakdownEl = document.getElementById('payment-breakdown');
  if(breakdownEl) breakdownEl.innerHTML = renderPaymentBreakdownHtml(total, descuentoPct, propina);
  const cashEl = document.getElementById('payment-cash');
  if(cashEl) cashEl.value = amountDue.toFixed(2);
  updatePaymentChange(orderId);
}

// Aplicar un descuento exige indicar el responsable y el motivo, para que
// quede constancia (visible al cerrar caja) de quién lo dio, cuánto y por qué.
let discountPending = null; // {orderId, pct}
function requestApplyDiscount(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const discPctEl = document.getElementById('payment-discount');
  const pct = Math.max(0, Math.min(100, parseFloat(discPctEl.value)||0));
  if(pct <= 0){
    // Quitar un descuento ya aplicado también queda registrado (con importe
    // negativo), para que en el cierre de caja se vea que se revirtió y no
    // solo que en algún momento se concedió.
    if(order.descuentoPct){
      if(!DB.discountLog) DB.discountLog = [];
      DB.discountLog.push({
        id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
        mesa: order.tableId ? (DB.tables.find(t=>t.id===order.tableId)||{}).name : togoOrderLabel(order),
        porcentaje: -order.descuentoPct, importe: -roundMoney(orderTotal(order) * order.descuentoPct / 100),
        motivo: t('msg.discountReverted') + (order.descuentoMotivo ? ` (${order.descuentoMotivo})` : ''),
        responsableId: order.descuentoResponsableId, responsableNombre: order.descuentoResponsableNombre || ''
      });
      logAudit('discount', t('audit.discountReverted').replace('${pct}', order.descuentoPct), 'normal');
    }
    order.descuentoPct = 0;
    order.descuentoMotivo = '';
    order.descuentoResponsableId = null;
    order.descuentoResponsableNombre = '';
    saveDB();
    renderPaymentModal(orderId);
    return;
  }
  discountPending = {orderId, pct};
  const loggedEmployeeId = loggedInEmployeeId();
  const camareros = DB.employees.filter(e => (e.area||'cocina') === 'sala');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-discount-2"></i> ${t('title.applyDiscount')}</h3>
      <button class="modal-close" onclick="renderPaymentModal(${orderId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.applyDiscountDesc')}</p>
    ${loggedEmployeeId === null && camareros.length ? `<div class="field">
      <label>${t('label.responsible')}</label>
      <select id="discount-responsable-sel">
        <option value="">—</option>
        ${camareros.map(e => `<option value="${e.id}" ${order.camareroId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="field">
      <label>${t('label.discountReason')}</label>
      <textarea id="discount-reason-input" rows="2" placeholder="${t('ph.discountReasonExample')}"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderPaymentModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmApplyDiscount()"><i class="ti ti-check"></i> ${t('btn.applyDiscount')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('discount-reason-input')?.focus(), 50);
}
function confirmApplyDiscount(){
  if(!discountPending) return;
  const {orderId, pct} = discountPending;
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const reason = document.getElementById('discount-reason-input').value.trim();
  if(!reason){ showToast(t('msg.discountReasonRequired')); return; }
  const respSel = document.getElementById('discount-responsable-sel');
  const loggedEmployeeId = loggedInEmployeeId();
  const responsableId = loggedEmployeeId !== null ? loggedEmployeeId : (respSel && respSel.value ? parseInt(respSel.value) : null);
  const responsable = responsableId ? DB.employees.find(e => e.id === responsableId) : null;
  // Igual que en anular un plato: sin empleado fichado ni elegido a mano,
  // es el propio dueño quien lo ha hecho — antes se quedaba en blanco.
  const responsableNombre = responsable ? responsable.name : (loggedEmployeeId === null ? t('label.owner') : '');

  const subtotal = orderTotal(order);
  const importe = roundMoney(subtotal * pct / 100);
  order.descuentoPct = pct;
  order.descuentoMotivo = reason;
  order.descuentoResponsableId = responsableId;
  order.descuentoResponsableNombre = responsableNombre;

  if(!DB.discountLog) DB.discountLog = [];
  DB.discountLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    mesa: order.tableId ? (DB.tables.find(t=>t.id===order.tableId)||{}).name : togoOrderLabel(order),
    porcentaje: pct, importe, motivo: reason, responsableId, responsableNombre
  });
  // Un descuento pequeño (redondeo, cortesía puntual) es normal del día a
  // día; uno grande de verdad afecta al margen — se marca en rojo a partir
  // del 20%, igual de criterio que un descuadre de caja "de verdad".
  logAudit('discount', t('audit.discountApplied').replace('${pct}', pct).replace('${amount}', fmtMoney(importe)), pct >= 20 ? 'critical' : 'normal');
  saveDB();
  discountPending = null;
  renderPaymentModal(orderId);
  showToast(t('msg.discountApplied'));
}

function updatePaymentChange(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const {amountDue} = computeFinalTotal(order);
  const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
  document.getElementById('payment-change').textContent = fmtMoney(Math.max(0, roundMoney(cash - amountDue)));
}

function finalizeCharge(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items.length) return;
  // Guarda de re-entrada: aunque hoy la función es síncrona (sin await de
  // por medio, así que un doble-tap real no consigue colar una segunda
  // ejecución antes de que el modal de ticket sustituya el botón), esto
  // es barato de comprobar y evita un doble cobro/doble descuento de stock
  // si en el futuro se añade algo asíncrono antes de marcar 'pagada'.
  if(order.status === 'pagada') return;
  const {total: subtotal, descuentoPct, descuentoImporte, propina: propinaCaja, finalTotal: total, amountPaidOnline, amountDue} = computeFinalTotal(order);
  // La propina que se registra en la venta es la de caja + la ya pagada
  // online (order.propinaPagadaOnline): las dos son propina real cobrada,
  // total (que sí incluye ambas, ver computeFinalTotal) tiene que cuadrar
  // con subtotal - descuento + propina.
  const propina = roundMoney(propinaCaja + (order.propinaPagadaOnline || 0));
  const metodoPago = document.getElementById('payment-method').value;
  // Si el camarero teclea por error un importe entregado menor que lo
  // debido, el cambio mostrado se queda en 0€ (Math.max(0,...) en
  // updatePaymentChange) y no avisa de nada raro — sin este control el
  // cobro se cerraría igual, dando de facto un descuento no autorizado.
  if(metodoPago === 'Efectivo'){
    const cashGiven = parseFloat(document.getElementById('payment-cash').value) || 0;
    if(cashGiven + 0.01 < amountDue){ showToast(t('msg.cashGivenInsufficient')); return; }
  }
  let pagos = null;
  if(metodoPago === 'Mixto'){
    const cash = Math.max(0, parseFloat(document.getElementById('payment-mixed-cash').value) || 0);
    const card = Math.max(0, parseFloat(document.getElementById('payment-mixed-card').value) || 0);
    if(Math.abs((cash+card) - amountDue) > 0.01){ showToast(t('msg.mixedPaymentMismatch')); return; }
    pagos = [];
    if(cash > 0) pagos.push({label: t('pay.cash'), amount: cash, metodoPago: 'Efectivo'});
    if(card > 0) pagos.push({label: t('pay.card'), amount: card, metodoPago: 'Tarjeta'});
  }
  // Lo ya pagado por móvil (QR de mesa, "Pagar ahora") se documenta como una
  // pata más del pago, igual que ya se hace con el reparto Efectivo/Tarjeta
  // del "Mixto" — así sale.total sigue siendo el valor real de toda la
  // cuenta (para contabilidad/VeriFactu), pero queda constancia exacta de
  // que una parte ya se cobró antes, no ahora mismo en caja.
  if(amountPaidOnline > 0){
    if(!pagos) pagos = [{label: paymentMethodTpvLabel(metodoPago), amount: amountDue, metodoPago}];
    // La señal de la reserva (si la hay) se desglosa aparte del resto de lo
    // ya pagado por móvil, para que quede claro en el ticket/informe de
    // dónde viene cada parte — orderAmountPaidOnline() ya la suma dentro
    // de amountPaidOnline, aquí solo se separa para mostrarla.
    const depositPart = Math.min(order.depositAmount||0, amountPaidOnline);
    const onlinePart = roundMoney(amountPaidOnline - depositPart);
    if(onlinePart > 0.001) pagos.push({label: t('label.paidOnlinePartialShort'), amount: onlinePart, metodoPago: 'Online'});
    if(depositPart > 0.001) pagos.push({label: t('label.depositAlreadyPaid'), amount: depositPart, metodoPago: 'Online'});
  }
  // El id de la venta es el del propio pedido, no uno aleatorio: si dos
  // dispositivos cobran la misma mesa casi a la vez (cada uno la ve como
  // libre para cobrar antes de enterarse del otro por sync), ambas "ventas"
  // comparten id y la fusión remota (mergeArraysById) se queda con una
  // sola en vez de duplicar el importe — un pedido genera como mucho una
  // venta normal, así que no hay riesgo de colisión con otra venta real.
  // Si el pedido ya se pagó por adelantado online (TPV virtual/Redsys,
  // order.pagado), el dinero de verdad entró el día que el banco confirmó
  // el cobro (order.pagoFecha) — no el día en que el personal termina de
  // cerrar el pedido, que en uno programado con antelación (para llevar o
  // delivery de otro día) puede ser bastante después. Sin esto, un pedido
  // cobrado hoy para dentro de una semana aparecía como venta de dentro de
  // una semana, no de hoy.
  // PERO solo cuando ya no queda nada por cobrar ahora mismo (amountDue==0):
  // si al recoger el pedido se añade algo más (típicamente una propina en
  // efectivo), ese dinero nuevo entra HOY y tiene que poder cuadrar en el
  // arqueo de HOY — dejar la venta entera fechada en el pasado hacía que
  // ese efectivo cobrado hoy no apareciera en ningún cierre de caja, ni
  // hoy (el arqueo de hoy solo mira sale.date===hoy) ni nunca.
  const saleDate = (order.pagado && order.pagoFecha && amountDue <= 0.001) ? order.pagoFecha.slice(0,10) : todayStr();
  const sale = {id: order.id, date: saleDate, createdAt: new Date().toISOString(), total, subtotal, descuentoPct, descuentoImporte, descuentoMotivo: order.descuentoMotivo||'', descuentoResponsableNombre: order.descuentoResponsableNombre||'', propina, tableId: order.tableId, pax: order.pax||null, tipo: order.tipo||'mesa', express: order.express||false, clienteNombre: order.clienteNombre||'', clientId: order.clientId||null, camareroId: order.camareroId||null, metodoPago, pagos, items: buildSaleItemsForOrder(order)};
  applyDeliveryCommission(order, sale);
  discountStockForOrder(order);
  DB.sales.push(sale);
  enqueueVerifactuSubmission(sale);
  if(order.clientId) registerClientVisit(order.clientId);
  order.status = 'pagada';
  order.closedAt = new Date().toISOString();
  saveDB();
  if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
  renderTPV();
  openTicketDeliveryModal(sale.id);
}

/* ------------------ Pestaña: dividir a partes iguales ------------------ */
function renderEqualSplitTab(order){
  if(!order.splitPayments || order.splitMode !== 'equal'){
    // Por defecto, tantas partes como comensales tiene la mesa (order.pax
    // ya incluye la suma si se han juntado dos mesas) — antes siempre
    // empezaba en 2 sin más, dando la falsa impresión de que juntar mesas
    // no sumaba los comensales. onfocus="this.select()" para que, al
    // tocar el campo en una tablet, el número de partida quede
    // seleccionado y el primer dígito que se escriba lo sustituya en vez
    // de añadirse detrás (p.ej. escribir "6" sobre un "2" sin seleccionar
    // antes daba "26", no "6" — parecía que el campo "no dejaba cambiarlo").
    const defaultN = Math.max(2, Math.min(20, order.pax || 2));
    return `
      <div class="field">
        <label>${t('label.howManySplitBill')}</label>
        <input type="number" id="split-equal-n" min="2" max="20" step="1" value="${defaultN}" onfocus="this.select()">
      </div>
    `;
  }
  return renderSplitPartsList(order);
}

function generateEqualSplit(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const n = Math.max(2, Math.min(20, parseInt(document.getElementById('split-equal-n').value) || 2));
  // Un descuento ya autorizado a la mesa (PIN + motivo) tiene que reflejarse
  // también al dividir cuenta — si no, cada comensal pagaría sobre el precio
  // lleno y el descuento desaparecería sin dejar rastro en lo cobrado.
  const descuentoPct = order.descuentoPct || 0;
  const total = roundMoney(orderTotal(order) * (1 - descuentoPct/100)) + (order.propina || 0);
  order.splitMode = 'equal';
  order.splitPayments = makeEqualParts(total, n).map((amount,i) => ({
    id: i+1, label: t('label.personN').replace('${n}', i+1), amount, paid:false, metodoPago:null
  }));
  applyOnlinePrepaidToSplit(order);
  saveDB();
  renderPaymentModal(orderId);
}

// Lo que ya se pagó online (señal de reserva, líneas/propina pagadas por
// móvil — ver orderAmountPaidOnline) no se les puede volver a cobrar a los
// comensales al dividir cuenta: sin esto, cada comensal pagaba sobre el
// importe COMPLETO de la mesa, cobrando dos veces esa parte ya pagada.
// Reparte la resta entre las partes en céntimos, proporcional a lo que ya
// le tocaba a cada una (método del resto mayor: no se pierde ni sobra
// ningún céntimo, y ninguna parte puede quedar negativa).
function applyOnlinePrepaidToSplit(order){
  const paidOnline = orderAmountPaidOnline(order);
  if(paidOnline <= 0.001 || !order.splitPayments || !order.splitPayments.length) return;
  const totalCents = order.splitPayments.reduce((s,p) => s + Math.round(p.amount*100), 0);
  if(totalCents <= 0) return;
  const paidCents = Math.min(totalCents, Math.round(paidOnline*100));
  const targetCents = totalCents - paidCents;
  const raw = order.splitPayments.map(p => Math.round(p.amount*100) * targetCents / totalCents);
  const floors = raw.map(Math.floor);
  const used = floors.reduce((a,b)=>a+b,0);
  const remainder = targetCents - used;
  const byFrac = raw.map((v,i) => ({i, frac: v - floors[i]})).sort((a,b) => b.frac - a.frac);
  const finalCents = floors.slice();
  for(let k=0; k<remainder; k++) finalCents[byFrac[k % byFrac.length].i] += 1;
  order.splitPayments.forEach((p,i) => { p.amount = finalCents[i] / 100; });
}

// Reparte el total en `n` partes en céntimos, sin perder ni un céntimo por redondeo
function makeEqualParts(total, n){
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({length:n}, (_,i) => (base + (i < remainder ? 1 : 0)) / 100);
}

/* ------------------ Pestaña: por comensal (platos, unidad a unidad) ------------------ */
function renderItemsSplitTab(order){
  if(!order.splitPayments || order.splitMode !== 'items'){
    const n = order.splitItemsN || 2;
    let assignments = order.itemAssignments;
    if(!assignments || assignments.length !== order.items.length || order.items.some((l,idx)=>!assignments[idx] || assignments[idx].length !== l.qty)){
      assignments = order.items.map(l => Array.from({length:l.qty}, ()=>1));
    }
    return `
      <div class="field">
        <label>${t('label.numDiners')}</label>
        <input type="number" id="split-items-n" min="2" max="20" step="1" value="${n}" oninput="updateItemsSplitDiners(${order.id})">
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 8px">${t('label.assignUnitsHint')}</p>
      <div id="split-items-body" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
        ${order.items.map((line,idx) => `
          <div class="card card-compact">
            <div style="font-weight:700;margin-bottom:6px">${escapeHtml(line.name)} <span style="color:var(--muted);font-weight:400">(${fmtMoney(line.price)}/ud.)</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${Array.from({length:line.qty}, (_,u) => `
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="font-size:11px;color:var(--muted)">${t('label.unitN').replace('${n}', u+1)}</span>
                  <select id="split-item-assign-${idx}-${u}" data-idx="${idx}" data-unit="${u}">
                    ${Array.from({length:n}, (_,i)=>i+1).map(p => `<option value="${p}"${assignments[idx][u]===p?' selected':''}>${t('label.dinerN').replace('${n}', p)}</option>`).join('')}
                  </select>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  return renderSplitPartsList(order);
}

// Cuando cambia el nº de comensales, regenera las opciones de los desplegables
// conservando la asignación de cada unidad siempre que siga siendo válida.
function updateItemsSplitDiners(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const n = Math.max(2, Math.min(20, parseInt(document.getElementById('split-items-n').value) || 2));
  order.itemAssignments = order.items.map((line,idx) => Array.from({length:line.qty}, (_,u) => {
    const sel = document.getElementById(`split-item-assign-${idx}-${u}`);
    const current = sel ? parseInt(sel.value) : 1;
    return Math.min(current || 1, n);
  }));
  order.splitItemsN = n;
  saveDB();
  renderPaymentModal(orderId);
}

function generateItemsSplit(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const n = Math.max(2, Math.min(20, parseInt(document.getElementById('split-items-n').value) || 2));
  const assignments = order.items.map((line,idx) => Array.from({length:line.qty}, (_,u) => {
    const sel = document.getElementById(`split-item-assign-${idx}-${u}`);
    return Math.min(Math.max(1, sel ? parseInt(sel.value) : 1), n);
  }));
  order.itemAssignments = assignments;
  order.splitItemsN = n;
  order.splitMode = 'items';
  // El coste de envío es un gasto del pedido entero, no de ningún plato
  // concreto: antes no se repartía entre los comensales, así que lo cobrado
  // sumaba menos que orderTotal() (lo que se imprime en ticket/factura) y
  // faltaba dinero en caja. Se reparte en céntimos enteros a partes iguales,
  // dando 1 céntimo extra a los primeros comensales hasta agotar el resto
  // (en vez de metérselo todo al último), para que ningún comensal pueda
  // acabar con un importe NEGATIVO cuando costeEnvio/n no es exacto.
  const costeEnvio = order.costeEnvio || 0;
  const costeEnvioCents = Math.round(costeEnvio * 100);
  const envioBaseCents = Math.floor(costeEnvioCents / n);
  const envioRestoCents = costeEnvioCents - envioBaseCents * n;
  // Igual que en el reparto a partes iguales: un descuento ya autorizado a la
  // mesa se aplica a partes iguales sobre cada comensal (no tiene sentido
  // repartirlo por plato), y la propina se reparte también a partes iguales.
  const descuentoPct = order.descuentoPct || 0;
  const propina = order.propina || 0;
  const propinaCents = Math.round(propina * 100);
  const propinaBaseCents = Math.floor(propinaCents / n);
  const propinaRestoCents = propinaCents - propinaBaseCents * n;
  order.splitPayments = Array.from({length:n}, (_,i) => {
    const personIdx = i+1;
    let amount = 0;
    const itemNames = [];
    order.items.forEach((line, idx) => {
      const units = assignments[idx].filter(p=>p===personIdx).length;
      if(units > 0){
        amount += line.price * units;
        itemNames.push(units === line.qty ? line.name : `${units} x ${line.name}`);
      }
    });
    if(costeEnvio > 0){
      const envioAsignadoCents = envioBaseCents + (personIdx <= envioRestoCents ? 1 : 0);
      const envioAsignado = envioAsignadoCents / 100;
      amount += envioAsignado;
      itemNames.push(`${t('label.deliveryCost')}: ${fmtMoney(envioAsignado)}`);
    }
    if(descuentoPct > 0) amount = amount * (1 - descuentoPct/100);
    if(propina > 0){
      const propinaAsignadoCents = propinaBaseCents + (personIdx <= propinaRestoCents ? 1 : 0);
      amount += propinaAsignadoCents / 100;
    }
    return {
      id: personIdx, label: t('label.dinerN').replace('${n}', personIdx), amount: roundMoney(amount),
      itemNames, paid:false, metodoPago:null
    };
  });
  applyOnlinePrepaidToSplit(order);
  saveDB();
  renderPaymentModal(orderId);
}

/* ------------------ Lista de partes y cobro individual ------------------ */
function renderSplitPartsList(order){
  return `
    <div class="table-wrap" style="margin-bottom:10px">
      <table>
        <thead><tr><th>${t('label.whoPays')}</th><th>${t('label.amount')}</th><th>${t('label.status')}</th><th></th></tr></thead>
        <tbody>
          ${order.splitPayments.map(p => `
            <tr>
              <td>${escapeHtml(p.label)}${p.itemNames && p.itemNames.length ? `<div style="font-size:12px;color:var(--muted)">${escapeHtml(p.itemNames.join(', '))}</div>` : ''}</td>
              <td>${fmtMoney(p.amount)}</td>
              <td>${p.paid ? `<span class="badge badge-green"><i class="ti ti-check"></i> ${t('common.paid')}${p.metodoPago ? ' · '+escapeHtml(p.metodoPago) : ''}</span>` : `<span class="badge">${t('common.pending')}</span>`}</td>
              <td>${p.paid ? '' : `<button class="btn btn-primary" onclick="openSplitPartPayment(${order.id}, ${p.id})"><i class="ti ti-cash"></i> ${t('btn.charge')}</button>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function cancelSplit(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  // Si ya se ha cobrado alguna parte, no se puede cancelar la división: se
  // perdería el rastro de ese dinero ya cobrado sin dejar ningún registro.
  // Hay que terminar de cobrar las partes que quedan pendientes.
  if(order.splitPayments && order.splitPayments.some(p=>p.paid)){
    showToast(t('msg.cannotCancelSplitPaid'));
    return;
  }
  delete order.splitMode;
  delete order.splitPayments;
  delete order.itemAssignments;
  delete order.splitItemsN;
  saveDB();
  paymentTab = 'full';
  renderPaymentModal(orderId);
}

function openSplitPartPayment(orderId, partId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const part = order.splitPayments.find(p=>p.id===partId);
  if(!part) return;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cash"></i> ${t('btn.charge')} — ${escapeHtml(part.label)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="label">${t('label.amount')}</div>
      <div class="value">${fmtMoney(part.amount)}</div>
    </div>
    <div class="field">
      <label>${t('label.paymentMethod')}</label>
      <select id="split-part-method" onchange="toggleSplitPartCash(${part.amount})">
        ${SELECTABLE_PAYMENT_METHODS.map(m=>`<option value="${m}">${paymentMethodTpvLabel(m)}</option>`).join('')}
      </select>
    </div>
    <div class="field" id="split-part-cash-field">
      <label>${t('label.amountGiven')}</label>
      <input type="number" id="split-part-cash" step="0.01" min="0" value="${part.amount.toFixed(2)}" oninput="updateSplitPartChange(${part.amount})">
    </div>
    <div class="kpi" id="split-part-change-kpi" style="margin-bottom:12px">
      <div class="label">${t('label.change')}</div>
      <div class="value" id="split-part-change">${fmtMoney(0)}</div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderPaymentModal(${order.id})">${t("common.back")}</button>
      <button class="btn btn-primary" onclick="confirmSplitPartPayment(${order.id}, ${part.id})"><i class="ti ti-check"></i> ${t('btn.confirmCharge')}</button>
    </div>
  `);
}

function toggleSplitPartCash(amount){
  const method = document.getElementById('split-part-method').value;
  const isCash = method === 'Efectivo';
  document.getElementById('split-part-cash-field').style.display = isCash ? '' : 'none';
  document.getElementById('split-part-change-kpi').style.display = isCash ? '' : 'none';
}

function updateSplitPartChange(amount){
  const cash = parseFloat(document.getElementById('split-part-cash').value) || 0;
  document.getElementById('split-part-change').textContent = fmtMoney(Math.max(0, roundMoney(cash - amount)));
}

function confirmSplitPartPayment(orderId, partId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const part = order.splitPayments.find(p=>p.id===partId);
  if(!part) return;
  part.paid = true;
  part.metodoPago = document.getElementById('split-part-method').value;
  saveDB();
  showToast(escapeHtml(part.label) + ': ' + t('title.chargeRegistered'));
  renderPaymentModal(orderId);
}

function finalizeSplitOrder(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items.length || !order.splitPayments || !order.splitPayments.every(p=>p.paid)) return;
  // Misma guarda de re-entrada que finalizeCharge: un doble tap en "Finalizar
  // cobro" antes de que el modal de ticket sustituya el botón repetiría
  // discountStockForOrder() y añadiría una venta duplicada en DB.sales.
  if(order.status === 'pagada') return;
  const subtotal = orderTotal(order);
  const descuentoPct = order.descuentoPct || 0;
  const descuentoImporte = roundMoney(subtotal * descuentoPct / 100);
  // La propina real de la venta es la de caja (repartida en las partes) +
  // la ya pagada online (order.propinaPagadaOnline) — igual que en
  // finalizeCharge. Antes se perdía la propina online al dividir cuenta,
  // porque aquí solo se sumaba order.propina.
  const propina = roundMoney((order.propina || 0) + (order.propinaPagadaOnline || 0));
  const amountPaidOnline = orderAmountPaidOnline(order);
  // El total FISCAL de la venta es el de toda la cuenta (comida + propina),
  // igual que en finalizeCharge — no solo la suma de las partes que se han
  // cobrado ahora en caja, que ya excluye lo pagado online por adelantado
  // (señal de reserva, líneas pagadas por móvil): generateEqualSplit/
  // generateItemsSplit reparten precisamente ESE importe menor entre los
  // comensales para que nadie pague dos veces lo ya cobrado online.
  const total = roundMoney(subtotal - descuentoImporte + propina);
  const collected = roundMoney(order.splitPayments.reduce((s,p)=>s+p.amount,0));
  discountStockForOrder(order);
  const pagos = order.splitPayments.map(p => ({label: p.label, amount: p.amount, metodoPago: p.metodoPago}));
  if(amountPaidOnline > 0){
    // Mismo desglose que finalizeCharge: separa la señal de reserva del
    // resto de lo ya pagado por móvil, para que quede constancia exacta de
    // dónde viene cada parte del total.
    const depositPart = Math.min(order.depositAmount||0, amountPaidOnline);
    const onlinePart = roundMoney(amountPaidOnline - depositPart);
    if(onlinePart > 0.001) pagos.push({label: t('label.paidOnlinePartialShort'), amount: onlinePart, metodoPago: 'Online'});
    if(depositPart > 0.001) pagos.push({label: t('label.depositAlreadyPaid'), amount: depositPart, metodoPago: 'Online'});
  }
  const metodos = [...new Set(order.splitPayments.map(p=>p.metodoPago))];
  // Igual que en finalizeCharge: si el pedido ya venía pagado online para
  // otro día y en caja no se ha cobrado nada nuevo ahora (collected==0), la
  // venta se fecha el día real del cobro (pagoFecha), no hoy. Si sí se ha
  // cobrado algo ahora en caja (lo normal al dividir cuenta), la fecha es
  // hoy, para que ese dinero nuevo cuadre en el arqueo de hoy.
  const saleDate = (order.pagado && order.pagoFecha && collected <= 0.001) ? order.pagoFecha.slice(0,10) : todayStr();
  // Mismo motivo que en finalizeCharge: id determinista a partir del
  // pedido, no aleatorio, para que dos dispositivos cobrando la misma
  // mesa dividida casi a la vez no dupliquen la venta al fusionarse.
  const sale = {
    id: order.id, date: saleDate, createdAt: new Date().toISOString(), total, subtotal,
    descuentoPct, descuentoImporte, descuentoMotivo: order.descuentoMotivo||'', descuentoResponsableNombre: order.descuentoResponsableNombre||'', propina,
    tableId: order.tableId, pax: order.pax||null, tipo: order.tipo||'mesa', express: order.express||false,
    clienteNombre: order.clienteNombre||'', clientId: order.clientId||null, camareroId: order.camareroId||null,
    metodoPago: metodos.length===1?metodos[0]:'Dividido',
    pagos, items: buildSaleItemsForOrder(order)
  };
  applyDeliveryCommission(order, sale);
  DB.sales.push(sale);
  enqueueVerifactuSubmission(sale);
  if(order.clientId) registerClientVisit(order.clientId);
  order.status = 'pagada';
  order.closedAt = new Date().toISOString();
  delete order.splitMode;
  delete order.splitPayments;
  delete order.itemAssignments;
  delete order.splitItemsN;
  saveDB();
  renderTPV();
  openTicketDeliveryModal(sale.id);
}

// Comprueba si vender UNA unidad más de este plato dejaría algún ingrediente
// (o elaboración base que use) por debajo de lo que hace falta, con el stock
// que hay AHORA MISMO (el descuento real no ocurre hasta cobrar, en
// discountStockForOrder — este chequeo es solo un aviso anticipado al añadir
// el plato a la comanda). No bloquea la venta: puede que se sirva igual con
// lo que quede y se reponga después, pero al menos quien cobra se entera.
function recipeStockShortageWarning(recipeId){
  const r = getRecipe(recipeId);
  if(!r) return null;
  const short = [];
  (r.ingredients||[]).forEach(line => {
    const need = line.qty * (1 + (line.merma||0)/100);
    if(line.type === 'base'){
      const elab = (DB.elaboraciones||[]).find(e => e.recipeId === line.baseRecipeId);
      if(elab && (elab.qty||0) < need) short.push(elab.name);
      return;
    }
    const ing = getIngredient(line.ingredientId);
    if(!ing || ing.activo === false) return; // descatalogado: ya no se repone, no tiene sentido avisar
    const s = getStockEntry(line.ingredientId);
    if((s.qty||0) < need) short.push(ing.name);
  });
  return short.length ? short : null;
}
// Avisa (toast, no bloqueante) si el plato recién añadido/incrementado deja
// algún ingrediente por debajo de lo necesario.
function warnIfRecipeStockShort(recipeId){
  if(!recipeId) return;
  const short = recipeStockShortageWarning(recipeId);
  if(short) showToast(t('msg.lowStockForDish').replace('${items}', short.slice(0,3).join(', ') + (short.length>3?'…':'')));
}

function discountStockForOrder(order){
  order.items.forEach(line => {
    // Una opción de menú puede llevar un plato de Carta con raciones
    // limitadas en vez de una receta (p.ej. una bebida gestionada por stock
    // directo, sel.platoId) — sin esto, elegirla dentro de un menú nunca
    // descontaba su ración, dejando su contador de disponibilidad por
    // encima de lo real.
    if(Array.isArray(line.menuSelections)){
      line.menuSelections.forEach(sel => {
        if(sel.platoId == null) return;
        const p = findCartaPlatoById(sel.platoId);
        if(p && p.stock != null){
          p.stock = Math.max(0, p.stock - (line.qty||0));
          if(p.stock === 0) p.disponible = false;
        }
      });
    }
    // Una línea normal descuenta su propia receta; un menú sin desglosar
    // descuenta las recetas de cada opción elegida (menuSelections).
    const recetas = [];
    if(line.recipeId) recetas.push(line.recipeId);
    else if(Array.isArray(line.menuSelections)) line.menuSelections.forEach(sel => { if(sel.recipeId) recetas.push(sel.recipeId); });
    recetas.forEach(recipeId => {
      const r = getRecipe(recipeId);
      if(!r) return;
      (r.ingredients||[]).forEach(ri => {
        // Igual que en el coste (recipeIngredientCost) y en el aviso de stock
        // corto (recipeStockShortageWarning): la merma (%) es lo que de
        // verdad se gasta al elaborar, no solo lo que queda en el plato —
        // antes se descontaba sin merma, así que el inventario se quedaba
        // sistemáticamente por encima del consumo real declarado en el
        // escandallo, tanto más cuanta más merma tuviera la receta.
        const bruto = ri.qty * (1 + (ri.merma||0)/100) * line.qty;
        if(ri.type === 'base'){
          // La línea usa una elaboración base (almíbar, caldo...) como ingrediente:
          // esa elaboración tiene su propio stock (DB.elaboraciones), no Mega Lista.
          const elab = (DB.elaboraciones||[]).find(e => e.recipeId === ri.baseRecipeId);
          if(elab) elab.qty = Math.max(0, (elab.qty||0) - bruto);
          return;
        }
        const s = getStockEntry(ri.ingredientId);
        s.qty = Math.max(0, s.qty - bruto);
      });
    });
  });
}

// Si el pedido es de delivery y ha llegado a través de una app (Glovo, Uber Eats...)
// calcula y guarda en la venta la comisión que esa app cobra (comisión% + IVA sobre la
// comisión), para que se descuente automáticamente como gasto en Gestión Económica.
function applyDeliveryCommission(order, sale){
  if(order.tipo !== 'delivery' || !order.plataformaId) return;
  const plat = (DB.business.deliveryPlatforms||[]).find(p => p.id === order.plataformaId);
  if(!plat) return;
  const comisionPct = parseFloat(plat.comisionPct) || 0;
  const ivaPct = parseFloat(plat.ivaPct) || 0;
  // Algunas plataformas (acuerdo comercial habitual con Glovo/Uber Eats)
  // cobran su % de comisión solo sobre la comanda, no sobre el gasto de
  // envío — antes esto no se podía distinguir y siempre se calculaba sobre
  // sale.total completo (comanda + envío), sobrestimando la comisión real
  // en negocios con ese tipo de acuerdo.
  const comisionSobreEnvio = plat.comisionSobreEnvio !== false;
  const baseComision = comisionSobreEnvio ? sale.total : Math.max(0, sale.total - (order.costeEnvio || 0));
  const comision = baseComision * (comisionPct/100) * (1 + ivaPct/100);
  sale.plataforma = {id: plat.id, nombre: plat.nombre, comisionPct, ivaPct, comisionSobreEnvio};
  sale.comisionPlataforma = Math.round(comision * 100) / 100;
}

/* ------------------ Transferir / fusionar mesas ------------------ */
function openTableTransferModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.tableId) return;
  const freeTables = DB.tables.filter(t => t.id !== order.tableId && !getOpenOrderForTable(t.id));
  const occupiedTables = DB.tables.filter(t => t.id !== order.tableId && getOpenOrderForTable(t.id));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-transfer"></i> ${t('title.transferTable')}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.moveToFreeTable')}</label>
      <select id="transfer-table-sel">
        <option value="">—</option>
        ${freeTables.map(tb => `<option value="${tb.id}">${escapeHtml(tb.name)}</option>`).join('')}
      </select>
    </div>
    <div style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="confirmTransferTable(${orderId})" ${!freeTables.length?'disabled':''}><i class="ti ti-check"></i> ${t('btn.moveOrder')}</button>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:0 0 16px">
    <div class="field">
      <label>${t('label.mergeIntoOccupiedTable')}</label>
      <select id="merge-table-sel">
        <option value="">—</option>
        ${occupiedTables.map(tb => { const o = getOpenOrderForTable(tb.id); return `<option value="${tb.id}">${escapeHtml(tb.name)} (${fmtMoney(orderTotal(o))})</option>`; }).join('')}
      </select>
      <small style="color:var(--muted)">${t('msg.mergeTableDesc')}</small>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderTableOrderModal(${orderId})">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmMergeTable(${orderId})" ${!occupiedTables.length?'disabled':''}><i class="ti ti-arrows-join"></i> ${t('btn.mergeOrders')}</button>
    </div>
  `);
}
function confirmTransferTable(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const sel = document.getElementById('transfer-table-sel');
  const newTableId = parseInt(sel.value);
  if(!newTableId){ showToast(t('msg.selectTable')); return; }
  if(getOpenOrderForTable(newTableId)){ showToast(t('msg.tableBusy')); return; }
  order.tableId = newTableId;
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  renderTableOrderModal(orderId);
  showToast(t('msg.tableTransferred'));
}
async function confirmMergeTable(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const sel = document.getElementById('merge-table-sel');
  const targetTableId = parseInt(sel.value);
  if(!targetTableId){ showToast(t('msg.selectTable')); return; }
  const targetOrder = getOpenOrderForTable(targetTableId);
  if(!targetOrder) return;
  // Si cualquiera de las dos mesas tiene una división de cuenta con partes ya
  // cobradas, no se fusiona: se perdería el rastro de ese dinero, igual que
  // ya se bloquea al cancelar una división con pagos hechos.
  const hasPaidSplit = o => o.splitPayments && o.splitPayments.some(p => p.paid);
  if(hasPaidSplit(order) || hasPaidSplit(targetOrder)){
    showToast(t('msg.cannotMergeSplitPaid'));
    return;
  }
  if(!(await confirmModal(t('msg.confirmMergeTables')))) return;
  // Se guarda el nombre de la mesa que se suma, para poder mostrar
  // "Mesa 3 + Mesa 4" en vez de perder esa identidad tras la fusión.
  const fromTableForMerge = DB.tables.find(t2 => t2.id === order.tableId);
  targetOrder.mergedTableNames = [...(targetOrder.mergedTableNames||[]), ...(fromTableForMerge?[fromTableForMerge.name]:[]), ...(order.mergedTableNames||[])];
  targetOrder.items.push(...order.items);
  targetOrder.tandas = [...new Set([...(targetOrder.tandas||[]), ...(order.tandas||[])])];
  targetOrder.pax = (targetOrder.pax||0) + (order.pax||0);
  if(!targetOrder.camareroId && order.camareroId) targetOrder.camareroId = order.camareroId;
  targetOrder.propina = (targetOrder.propina||0) + (order.propina||0);
  // Un descuento ya autorizado en la mesa que desaparece no debe perderse en
  // silencio: si la mesa destino no tiene uno propio, se traspasa entero.
  if(order.descuentoPct){
    if(!targetOrder.descuentoPct){
      targetOrder.descuentoPct = order.descuentoPct;
      targetOrder.descuentoMotivo = order.descuentoMotivo;
      targetOrder.descuentoResponsableId = order.descuentoResponsableId;
      targetOrder.descuentoResponsableNombre = order.descuentoResponsableNombre;
    } else {
      showToast(t('msg.mergeDiscountConflict'));
    }
  }
  DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== order.id);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  closeModal();
  renderTPV();
  showToast(t('msg.tablesMerged'));
}

/* ------------------ Ventas de hoy / reimprimir tique ------------------ */
function openTodaySalesModal(){
  const today = todayStr();
  const sales = [...DB.sales.filter(s => s.date === today)].reverse();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-receipt"></i> ${t('title.todaySales')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.total')}</th><th class="owner-strict">${t('tpv.margin.label')}</th><th>${t('label.paymentMethod')}</th><th></th></tr></thead>
        <tbody>${sales.length ? sales.map(s => {
          const table = s.tableId ? DB.tables.find(t=>t.id===s.tableId) : null;
          const label = table ? table.name : togoOrderLabel(s);
          const hora = s.createdAt ? new Date(s.createdAt).toTimeString().slice(0,5) : '';
          const margin = s.total - orderFoodCost(s);
          return `<tr>
            <td>${escapeHtml(hora)}</td>
            <td>${escapeHtml(label)}${s.clienteNombre?` — ${escapeHtml(s.clienteNombre)}`:''}</td>
            <td>${fmtMoney(s.total)}</td>
            <td class="owner-strict" style="color:${margin>=0?'var(--green)':'var(--red)'}">${fmtMoney(margin)}</td>
            <td>${escapeHtml(paymentMethodTpvLabel(s.metodoPago))}</td>
            <td><button class="btn btn-sm btn-icon" title="${t('btn.reprintTicket')}" onclick="printTicket(DB.sales.find(x=>x.id===${s.id}),{duplicado:true})"><i class="ti ti-printer"></i></button>${thermalPrintingSupported() ? `<button class="btn btn-sm btn-icon" title="${t('thermal.hint')}" onclick="printToThermalPrinter(buildTicketText(DB.sales.find(x=>x.id===${s.id}),{duplicado:true}))"><i class="ti ti-device-usb"></i></button>` : ''}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="6"><div class="empty" style="padding:14px">${t('empty.noSalesToday')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

/* ============================================================
   VeriFactu — envío a proveedor certificado (cuenta propia del negocio)
   ============================================================

   MODELO: cada negocio contrata y paga SU PROPIA cuenta con uno de estos
   proveedores certificados (no una cuenta de GastroGoan). Aquí solo se
   guarda su clave de API (Mi Negocio → VeriFactu) y se llama a su servicio
   al cerrar cada venta. GastroGoan no interviene en el pago, no es el
   titular del contrato, y no tiene coste propio por esto.

   ⚠️ IMPORTANTE — ESTADO DE ESTA INTEGRACIÓN, LEER ANTES DE ACTIVAR NADA:

   "facturahub" — NO RECOMENDADO. Se implementó inicialmente por tener
   documentación pública fácil de encontrar en GitHub, pero una revisión
   posterior encontró señales serias de que no es un proveedor de
   producción fiable: todos sus repos se crearon el mismo fin de semana
   (junio 2026), con 0 estrellas/forks/issues, y según su propio README lo
   opera una persona física en Países Bajos, sin declaración responsable
   publicada. Un proveedor gratuito así puede desaparecer en cualquier
   momento, dejando la cadena de huellas de tus clientes rota. Se deja el
   código por si en el futuro se confirma que es fiable, pero NO debe
   usarse con clientes reales sin volver a verificarlo a fondo.

   "verifactuapi" — proveedor recomendado por ahora. Opera como
   Colaborador Social AEAT (figura legal reconocida para representar a
   terceros ante Hacienda), tiene un SDK con actividad real en GitHub
   (github.com/NemonInvocash/verifactu-php, con forks genuinos), soporta
   explícitamente multi-negocio (un emisor = un NIF = su propia clave de
   API, mediante sus métodos crearEmisor/generarApiKey), y sus campos de
   petición siguen el esquema oficial de la AEAT (IDEmisorFactura,
   NumSerieFactura, Desglose...), no una simplificación propia.
   CONFIRMADO el 31-07-2026 contra su documentación real (aportada por el
   usuario, app.verifactuapi.es/docs/): endpoint exacto, formato de fecha,
   códigos de Desglose, y estructura de la respuesta (incluyendo que la
   huella no llega en la creación sino que hay que consultarla después,
   ya implementado). Lo único que sigue sin confirmar: su declaración
   responsable — preguntarles directamente antes de producción.

   "facturadirecta" y "contasimple" quedan como alternativas de pago sin
   confirmar contra documentación real.

   NÚMERO DE FACTURA (NumSerieFactura) — NOTA DE DISEÑO SUPERADA: esto se
   escribió pensando que GastroGoan tendría que generar el número de
   factura (de ahí verifactuSerie/nextVerifactuNumSerieFactura, y el
   campo "Serie" en Mi Negocio → VeriFactu). Al confirmar el esquema real
   de los 3 proveedores implementados (verifactuapi, facturahub, y el
   genérico de facturadirecta/contasimple — ver submitSaleToVerifactuApi/
   FacturaHub/GenericProvider más abajo), NINGUNO acepta un número de
   factura puesto por el cliente: el ID/número de factura lo asigna el
   proveedor en su respuesta (created._id, data.numeroFactura...), como
   corresponde a quien lleva la numeración fiscal oficial de verdad.
   nextVerifactuNumSerieFactura() se deja sin llamar a propósito (no
   "olvidado por conectar" — conectarlo mandaría un dato que la API
   ignoraría, o peor, que podría chocar con la numeración real del
   proveedor). El campo "Serie" en Mi Negocio queda como referencia
   interna del dispositivo, sin afectar a la factura enviada.
*/
const VERIFACTU_PROVIDERS = {
  verifactuapi: {label: 'VeriFactuAPI (recomendado)', apiBase: 'https://app.verifactuapi.es'},
  facturahub: {label: 'FacturaHub (NO recomendado, ver aviso en el código)', apiBase: 'https://api.facturahub.com'},
  facturadirecta: {label: 'FacturaDirecta', apiBase: 'https://api.facturadirecta.com/v1'},
  contasimple: {label: 'Contasimple', apiBase: 'https://api.contasimple.com/v1'},
};

function verifactuSerie(){
  return localStorage.getItem('gg_verifactu_serie') || '';
}
function setVerifactuSerie(serie){
  localStorage.setItem('gg_verifactu_serie', serie.trim());
}
function nextVerifactuNumSerieFactura(){
  const serie = verifactuSerie() || 'T1';
  const counterKey = 'gg_verifactu_counter_' + serie;
  const next = (parseInt(localStorage.getItem(counterKey)) || 0) + 1;
  localStorage.setItem(counterKey, next);
  return `${serie}-${String(next).padStart(6,'0')}`;
}

// Cuánto tiempo esperar entre reintentos de envío pendientes (la normativa
// permite remitir "de forma inmediata o inmediatamente después", así que un
// reintento cada pocos minutos si no hay conexión es correcto, no un parche).
const VERIFACTU_RETRY_MS = 3 * 60 * 1000;
let verifactuRetryTimer = null;

function verifactuConfig(){
  return (DB.business && DB.business.verifactu) || {enabled:false, provider:'', apiKey:''};
}

// Se llama justo después de guardar cada venta. Si VeriFactu no está
// activado para este negocio, no hace nada (comportamiento actual sin
// cambios). Si está activado, marca la venta como pendiente e intenta
// enviarla ya mismo; si falla (sin conexión, error del proveedor), queda en
// la cola y se reintentará solo, sin bloquear el cobro ni la impresión del
// ticket — el ticket se imprime igual, con o sin el QR de VeriFactu ya
// confirmado (ver nota en buildTicketText).
function enqueueVerifactuSubmission(sale){
  const cfg = verifactuConfig();
  if(!cfg.enabled || !cfg.provider || !cfg.apiKey) return;
  sale.verifactu = {status: 'pending'};
  saveDB();
  processVerifactuQueue();
}

function verifactuIvaPct(){
  return (DB.business.ticket && DB.business.ticket.ivaPct != null) ? DB.business.ticket.ivaPct : 10;
}
// Tipo de IVA real de una línea de venta para la factura fiscal: el
// estampado al cobrar (resolveLineIvaPct, aplicado en finalizeCharge), o el
// general de reserva solo si la venta es de antes de ese cambio.
function fiscalLineIvaPct(line){
  return line.ivaPct != null ? line.ivaPct : verifactuIvaPct();
}
// Agrupa una venta por tipo de IVA real de cada línea (con el descuento de
// la venta prorrateado), para declarar un desglose correcto a Hacienda en
// vez de un único tipo para todo el ticket — imprescindible en cuanto se
// mezclan platos con distinto IVA (ej. comida al 10% y una copa al 21%).
function saleIvaGroupsForFiscal(sale){
  const descPct = parseFloat(sale.descuentoPct)||0;
  const rates = {};
  (sale.items||[]).forEach(line => {
    const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
    if(grossLine <= 0) return;
    const rate = fiscalLineIvaPct(line);
    rates[rate] = (rates[rate]||0) + grossLine;
  });
  return Object.keys(rates).map(Number).sort((a,b)=>b-a).map(rate => {
    const gross = rates[rate];
    const base = gross / (1 + rate/100);
    return {ivaPct: rate, base: Math.round(base*100)/100, cuota: Math.round((gross-base)*100)/100};
  });
}

async function submitSaleToVerifactuProvider(sale, cfg){
  const provider = VERIFACTU_PROVIDERS[cfg.provider];
  if(!provider) throw new Error('Proveedor VeriFactu no reconocido: ' + cfg.provider);
  if(cfg.provider === 'verifactuapi') return submitSaleToVerifactuApi(sale, cfg, provider);
  if(cfg.provider === 'facturahub') return submitSaleToFacturaHub(sale, cfg, provider);
  return submitSaleToGenericProvider(sale, cfg, provider);
}

// VeriFactuAPI (Invocash) — REESCRITO Y CONFIRMADO EN VIVO el 10/08/2026
// contra una llamada real (HTTP 200, factura creada) desde el Portal de
// Desarrolladores de una cuenta real de Invocash. La versión anterior de
// esta función usaba un esquema de campos y una URL fija que YA NO SON
// LOS CORRECTOS (Invocash cambió de API en algún momento entre julio y
// agosto de 2026) — daba siempre "Token inválido" sin que tuviera nada
// que ver con la clave ni la cuenta. Lo confirmado ahora:
//   - La URL NO es fija: cada negocio tiene su propio dominio de Invocash
//     (el mismo que el de su panel, ej. "tunegocio.invo.cash"), guardado en
//     DB.business.verifactu.domain. Base real: https://{domain}/api
//   - Autenticación: cabecera "X-API-Key: <clave>" (NO "Authorization:
//     Bearer" — ese formato es solo para el login de usuario del panel,
//     no para integraciones de terceros, y da "Token inválido" en vez de
//     avisar de que la cabecera es la equivocada).
//   - Endpoint de creación: POST /invoices (no /api/alta-registro-facturacion).
//   - Payload en su propio esquema (no los nombres de campo oficiales de la
//     AEAT): due, comments, verifactu_issuer_territory, simplified, lines[]
//     con tax_base/tax_pctge/tax_amount ya calculados por nosotros (la API
//     NO los calcula), total.
// PENDIENTE (no confirmado todavía): el endpoint para VALIDAR la factura
// creada y que se envíe de verdad a la AEAT (la respuesta de creación trae
// "validated": false, "verifactu_status": null — la factura se crea pero
// se queda en borrador hasta ese segundo paso). Hasta que se localice ese
// endpoint, se lanza un error controlado para que la venta quede en la
// cola de reintento (processVerifactuQueue) en vez de darla por enviada
// sin estarlo. Ver docs/VERIFACTU_PENDIENTE.md.
async function submitSaleToVerifactuApi(sale, cfg, provider){
  if(!cfg.domain) throw new Error('VeriFactuAPI: falta configurar el dominio de tu cuenta Invocash en Mi Negocio → VeriFactu');
  const apiBase = `https://${cfg.domain}/api`;
  const headers = {'Content-Type': 'application/json', 'X-API-Key': cfg.apiKey};
  const groups = saleIvaGroupsForFiscal(sale);
  // La propina NO se factura ni se declara en el IVA (así lo confirma el
  // negocio): sale.total sí la incluye (finalTotal = total - descuento +
  // propina), así que aquí se resta para que el total enviado a VeriFactu
  // cuadre exactamente con la suma de las líneas (que tampoco la llevan).
  const total = Math.round((sale.total - (parseFloat(sale.propina)||0))*100)/100;
  const fecha = new Date(sale.date);
  const due = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;

  const body = {
    due,
    comments: sale.items.map(l => `${l.qty}x ${l.name}`).join(', ').slice(0, 500),
    verifactu_issuer_territory: 'MAINLAND',
    simplified: true, // ticket a consumidor final, sin cliente registrado — el caso normal de un restaurante
    lines: groups.map(g => ({
      product_id: null,
      description: sale.items.map(l => l.name).join(', ').slice(0, 250),
      quantity: 1,
      unit_price: Math.round(g.base*100)/100,
      tax_base: Math.round(g.base*100)/100,
      tax_pctge: g.ivaPct,
      tax_amount: Math.round(g.cuota*100)/100,
      tax_withholding_pctge: 0,
      tax_withholding_amount: 0,
      tax_type: 'IVA',
      clave_regimen: '01',
      qualification_operation: 'S1',
      exempt_operation: null,
      total: Math.round((g.base + g.cuota)*100)/100,
    })),
    total,
  };
  // Idempotencia: si un intento anterior ya creó la factura (sale.verifactuInvoiceId
  // guardado) pero falló el paso de validar, un reintento NO debe volver a crear
  // otra factura desde cero — eso duplicaba la factura en el proveedor cada vez
  // que fallaba justo después de crearla. Se reutiliza el id ya creado.
  let itemId = sale.verifactuInvoiceId;
  if(!itemId){
    const createRes = await fetch(`${apiBase}/invoices`, {method: 'POST', headers, body: JSON.stringify(body)});
    if(!createRes.ok) throw new Error(`VeriFactuAPI (crear factura) respondió ${createRes.status}`);
    const created = await createRes.json();
    const item = created.data && created.data.items && created.data.items[0];
    if(!item || !item.id) throw new Error('VeriFactuAPI no devolvió un id de factura');
    itemId = item.id;
    sale.verifactuInvoiceId = itemId;
    saveDB();
  }

  // Validar la factura (dispara la generación del número definitivo y el
  // envío a la AEAT) — CONFIRMADO en vivo el 10/08/2026: HTTP 200,
  // "validated":true, número de factura asignado. OJO: este endpoint solo
  // se puede llamar UNA VEZ por factura (su propia documentación lo avisa).
  // Si esto falla, el siguiente reintento (más arriba) reutiliza itemId en
  // vez de crear otra factura — pero este POST en sí no se reintenta contra
  // el mismo id sin más: si vuelve a fallar, queda registrada la incidencia
  // para revisar a mano en el panel del proveedor.
  const validateRes = await fetch(`${apiBase}/invoice/${itemId}/validate`, {method: 'POST', headers});
  if(!validateRes.ok) throw new Error(`VeriFactuAPI (validar factura #${itemId}) respondió ${validateRes.status} — revisar a mano en su panel`);
  const validated = await validateRes.json();
  const vItem = validated.data && validated.data.items && validated.data.items[0];

  // verifactu_status/verifactu_log llegan vacíos justo tras validar — la AEAT
  // los procesa de forma asíncrona (confirmado en vivo, tarda un rato). El
  // PDF con el QR sí está disponible ya (GET /invoice/{id}/downloadPdf,
  // devuelve el PDF en base64 dentro de JSON, no como binario directo) y es
  // lo que se imprime/adjunta al ticket.
  let pdfBase64 = null;
  try{
    const pdfRes = await fetch(`${apiBase}/invoice/${itemId}/downloadPdf`, {headers});
    if(pdfRes.ok){
      const pdfJson = await pdfRes.json();
      if(pdfJson && pdfJson.success && pdfJson.data) pdfBase64 = pdfJson.data;
    }
  }catch(e){ /* el PDF es un extra, no bloquea la venta si falla */ }

  return {
    invoiceId: (vItem && vItem.invoicenumber) || itemId,
    hash: null,
    qrData: null,
    pdfBase64,
  };
}

// FacturaHub: flujo documentado públicamente (crear factura → emitir a
// VeriFactu → consultar estado) en
// github.com/FacturaHub-com/facturahub-verifactu. Ver el aviso de la
// cabecera del bloque sobre qué campos de la respuesta de /status siguen
// sin confirmar.
async function submitSaleToFacturaHub(sale, cfg, provider){
  const headers = {'Content-Type': 'application/json', 'x-api-key': cfg.apiKey};

  // 1) Crear la factura en FacturaHub. Un ticket de restaurante a consumidor
  // final no siempre tiene NIF del cliente; se usa un nombre genérico si no
  // hay uno registrado, como hace ya el resto de la app con las facturas
  // simplificadas. Cada línea lleva su propio tipo de IVA real (no uno
  // único adivinado para todo el ticket), para declarar bien una venta que
  // mezcle platos con distinto IVA.
  // Idempotencia: igual que en submitSaleToVerifactuApi, si un intento
  // anterior ya creó la factura pero falló el paso de emitir, un reintento
  // no debe volver a crear otra desde cero.
  let invoiceId = sale.verifactuInvoiceId;
  if(!invoiceId){
    const createRes = await fetch(`${provider.apiBase}/api/invoices`, {
      method: 'POST', headers,
      body: JSON.stringify({
        client: {name: sale.clienteNombre || t('ticket.finalConsumer')},
        items: sale.items.map(l => ({description: l.name, quantity: l.qty, unitPrice: l.price, taxRate: fiscalLineIvaPct(l)})),
      }),
    });
    if(!createRes.ok) throw new Error(`FacturaHub (crear factura) respondió ${createRes.status}`);
    const created = await createRes.json();
    invoiceId = created._id || created.id;
    if(!invoiceId) throw new Error('FacturaHub no devolvió un id de factura');
    sale.verifactuInvoiceId = invoiceId;
    saveDB();
  }

  // 2) Emitirla a VeriFactu.
  const emitRes = await fetch(`${provider.apiBase}/api/einvoice/emit`, {
    method: 'POST', headers, body: JSON.stringify({invoiceId}),
  });
  if(!emitRes.ok) throw new Error(`FacturaHub (emitir a VeriFactu) respondió ${emitRes.status}`);

  // 3) Consultar el estado para obtener la huella/hash y el QR ya generados.
  // ⚠️ Nombres de campo (verifactuHash/qrUrl) asumidos por convención, sin
  // confirmar contra la respuesta real — ajustar tras una prueba real.
  const statusRes = await fetch(`${provider.apiBase}/api/einvoice/status/${invoiceId}`, {headers});
  if(!statusRes.ok) throw new Error(`FacturaHub (consultar estado) respondió ${statusRes.status}`);
  const status = await statusRes.json();
  return {
    invoiceId,
    hash: status.verifactuHash || status.hash || null,
    qrData: status.qrUrl || status.qr || null,
  };
}

// Proveedores de pago alternativos (FacturaDirecta, Contasimple): sin
// confirmar todavía contra su documentación/sandbox real (ver aviso de la
// cabecera del bloque). Estructura genérica de referencia.
async function submitSaleToGenericProvider(sale, cfg, provider){
  const body = {
    fecha: sale.date,
    cliente: sale.clienteNombre || null,
    lineas: sale.items.map(l => ({descripcion: l.name, cantidad: l.qty, precioUnitario: l.price, ivaPct: fiscalLineIvaPct(l)})),
    total: sale.total,
  };
  const res = await fetch(`${provider.apiBase}/facturas`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}`},
    body: JSON.stringify(body),
  });
  if(!res.ok) throw new Error(`Proveedor VeriFactu respondió ${res.status}`);
  const data = await res.json();
  return {invoiceId: data.numeroFactura || data.id, hash: data.huella || data.hash || null, qrData: data.qr || data.qrUrl || null};
}

// Procesa todas las ventas con envío pendiente (recién cerradas, o de una
// sesión anterior que se quedó sin conexión). Se puede llamar tantas veces
// como haga falta: las que ya estén enviadas o en curso no se reintentan.
let verifactuProcessing = false;
async function processVerifactuQueue(){
  if(verifactuProcessing) return;
  const cfg = verifactuConfig();
  if(!cfg.enabled || !cfg.provider || !cfg.apiKey) return;
  // Una venta anulada mientras estaba pendiente de envío (p. ej. cobrada sin
  // conexión y anulada antes de que el reintento tuviera éxito) no debe
  // enviarse a Hacienda como si fuera válida: se marca aparte para que quede
  // constancia de por qué no se envió, en vez de reintentarla como si nada.
  const pending = DB.sales.filter(s => s.verifactu && s.verifactu.status === 'pending' && s.status !== 'anulada');
  const anuladasPendientes = DB.sales.filter(s => s.verifactu && s.verifactu.status === 'pending' && s.status === 'anulada');
  anuladasPendientes.forEach(s => { s.verifactu = {status: 'cancelled_before_send', cancelledAt: new Date().toISOString()}; });
  if(!pending.length){
    if(anuladasPendientes.length) saveDB();
    return;
  }
  verifactuProcessing = true;
  for(const sale of pending){
    try{
      const result = await submitSaleToVerifactuProvider(sale, cfg);
      sale.verifactu = {status: 'sent', ...result, sentAt: new Date().toISOString()};
    }catch(e){
      sale.verifactu = {status: 'pending', lastError: e.message, lastAttemptAt: new Date().toISOString()};
    }
  }
  saveDB();
  verifactuProcessing = false;
  clearTimeout(verifactuRetryTimer);
  if(DB.sales.some(s => s.verifactu && s.verifactu.status === 'pending')){
    verifactuRetryTimer = setTimeout(processVerifactuQueue, VERIFACTU_RETRY_MS);
  }
}
if(typeof window !== 'undefined'){
  window.addEventListener('online', () => processVerifactuQueue());
}

/* ------------------ Ticket: contenido, impresión, email y factura ------------------ */
function buildTicketHeaderLines(){
  const b = DB.business || {};
  const tc = b.ticket || {};
  const lines = [b.name || 'GastroGoan'];
  if(tc.mostrarDireccion !== false && b.address) lines.push(b.address);
  if(tc.mostrarTelefono !== false && b.phone) lines.push(t('ticket.phone').replace('${phone}', b.phone));
  if(tc.mostrarWeb && b.web) lines.push(b.web);
  if(tc.mostrarNif !== false && b.cif) lines.push(t('ticket.taxIdLabel').replace('${cif}', b.cif));
  return lines;
}

function buildTicketText(sale, opts={}){
  const tc = (DB.business && DB.business.ticket) || {};
  const lines = [...buildTicketHeaderLines()];
  if(opts.duplicado) lines.push(t('ticket.duplicateLabel'));
  if(opts.factura) lines.push(t('ticket.invoiceNumber') + ' ' + sale.facturaNum);
  lines.push(sale.date);
  lines.push(`${sale.tipo==='mesa'?t('label.table'):sale.express?t('label.expressOrder'):sale.tipo==='delivery'?t('label.delivery'):t('label.takeAway')}${sale.clienteNombre?' - '+sale.clienteNombre:''}`);
  lines.push('------------------------------');
  // El ticket de texto plano asume un ancho de ~30 columnas (ver los
  // separadores de guiones de abajo, pensados para 58mm). Con un nombre de
  // plato largo, "cantidad x nombre" ya ocupaba solas las 28 columnas
  // reservadas y el precio quedaba pegado justo detrás, sin espacio,
  // ilegible. Si no cabe en una sola línea, el precio pasa a su propia
  // línea alineado a la derecha en vez de aplastarse contra el nombre.
  const TICKET_LINE_WIDTH = 30;
  sale.items.forEach(l => {
    const desc = `${fmtNum(l.qty)} x ${l.name}`;
    const price = fmtMoney(l.price*l.qty);
    if(desc.length <= 28){
      lines.push(desc.padEnd(28) + price);
    }else{
      lines.push(desc);
      lines.push(price.padStart(TICKET_LINE_WIDTH));
    }
  });
  lines.push('------------------------------');
  if(sale.descuentoImporte) lines.push(`${t('label.discount')} (${sale.descuentoPct}%): -${fmtMoney(sale.descuentoImporte)}`);
  if(sale.propina) lines.push(`${t('label.tip')}: ${fmtMoney(sale.propina)}`);
  // Un desglose por cada tipo de IVA real presente en la venta (no un único
  // % adivinado para todo el ticket): si se mezclan platos con distinto IVA
  // (ej. comida al 10% y una copa al 21%), cada tipo sale por separado.
  const ivaGroups = saleIvaGroupsForFiscal(sale);
  ivaGroups.forEach(g => {
    lines.push(`${t('ticket.taxBase')} (${g.ivaPct}%): ${fmtMoney(g.base)}`);
    lines.push(`${t('common.vat')} (${g.ivaPct}%): ${fmtMoney(g.cuota)}`);
  });
  lines.push(`${t('common.total')}: ${fmtMoney(sale.total)}`);
  if(sale.pagos && sale.pagos.length > 1){
    sale.pagos.forEach(p => lines.push(`${p.label}: ${fmtMoney(p.amount)} (${p.metodoPago||''})`));
  }else{
    lines.push(`${t('ticket.payment')}: ${sale.metodoPago||''}`);
  }
  lines.push('');
  if(sale.verifactu && sale.verifactu.status === 'sent'){
    lines.push('VERI*FACTU');
  } else if(DB.business && DB.business.verifactu && DB.business.verifactu.enabled){
    // Venta hecha con VeriFactu activado pero todavía sin confirmar por el
    // proveedor (p.ej. sin conexión en el momento del cobro): se avisa en el
    // propio ticket en vez de fingir que ya está confirmada.
    lines.push(t('ticket.verifactuPending'));
  }
  lines.push(tc.pie || t('ticket.thanksVisit'));
  // Sin imagen posible en texto plano (impresora térmica, email, WhatsApp):
  // el enlace igualmente sirve, se puede tocar o copiar a mano.
  if(DB.business && DB.business.gmaps && tc.mostrarResenaQr !== false){
    lines.push('');
    lines.push(t('ticket.reviewTitle'));
    lines.push(DB.business.gmaps);
  }
  return lines.join('\n');
}

// Versión con diseño real del ticket/factura para la impresión desde el
// navegador (buildTicketText() se deja tal cual — texto plano — porque la
// usan también la impresora térmica y el envío por email/WhatsApp, donde
// no tiene sentido HTML). Aquí sí: cabecera centrada con el logo si hay
// uno configurado, tabla de líneas con importes alineados, separadores
// reales en vez de guiones, y el total destacado — antes era un volcado de
// texto monoespaciado sin ninguna maquetación.
function buildTicketHtml(sale, opts={}){
  const b = DB.business || {};
  const tc = b.ticket || {};
  const logoHtml = b.logo ? `<img src="${b.logo}" alt="" style="max-height:48px;max-width:200px;display:block;margin:0 auto 8px">` : '';
  const metaLines = [];
  if(tc.mostrarDireccion !== false && b.address) metaLines.push(escapeHtml(b.address));
  if(tc.mostrarTelefono !== false && b.phone) metaLines.push(t('ticket.phone').replace('${phone}', escapeHtml(b.phone)));
  if(tc.mostrarWeb && b.web) metaLines.push(escapeHtml(b.web));
  if(tc.mostrarNif !== false && b.cif) metaLines.push(t('ticket.taxIdLabel').replace('${cif}', escapeHtml(b.cif)));

  const tipoLabel = sale.tipo==='mesa'?t('label.table'):sale.express?t('label.expressOrder'):sale.tipo==='delivery'?t('label.delivery'):t('label.takeAway');

  const itemsHtml = sale.items.map(l => `
    <tr>
      <td style="padding:3px 4px 3px 0;vertical-align:top;white-space:nowrap">${fmtNum(l.qty)}×</td>
      <td style="padding:3px 4px;vertical-align:top">${escapeHtml(l.name)}</td>
      <td style="padding:3px 0 3px 4px;vertical-align:top;text-align:right;white-space:nowrap">${fmtMoney(l.price*l.qty)}</td>
    </tr>
  `).join('');

  const ivaGroups = saleIvaGroupsForFiscal(sale);
  const summaryRows = [];
  if(sale.descuentoImporte) summaryRows.push([`${t('label.discount')} (${sale.descuentoPct}%)`, `-${fmtMoney(sale.descuentoImporte)}`]);
  if(sale.propina) summaryRows.push([t('label.tip'), fmtMoney(sale.propina)]);
  ivaGroups.forEach(g => {
    summaryRows.push([`${t('ticket.taxBase')} (${g.ivaPct}%)`, fmtMoney(g.base)]);
    summaryRows.push([`${t('common.vat')} (${g.ivaPct}%)`, fmtMoney(g.cuota)]);
  });
  const summaryHtml = summaryRows.map(([lbl,val]) => `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#555;padding:1px 0">
      <span>${lbl}</span><span>${val}</span>
    </div>
  `).join('');

  const paymentHtml = (sale.pagos && sale.pagos.length > 1)
    ? sale.pagos.map(p => `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${escapeHtml(p.label)}</span><span>${fmtMoney(p.amount)} (${escapeHtml(p.metodoPago||'')})</span></div>`).join('')
    : `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${t('ticket.payment')}</span><span>${escapeHtml(sale.metodoPago||'')}</span></div>`;

  const verifactuHtml = sale.verifactu && sale.verifactu.status === 'sent'
    ? `<div style="text-align:center;font-size:11px;font-weight:700;letter-spacing:.5px;margin-top:10px">VERI*FACTU</div>`
    : (DB.business && DB.business.verifactu && DB.business.verifactu.enabled
      ? `<div style="text-align:center;font-size:11px;color:#a15c00;margin-top:10px">${t('ticket.verifactuPending')}</div>` : '');
  const qrHtml = (sale.verifactu && sale.verifactu.status === 'sent' && sale.verifactu.qrData)
    ? `<div style="text-align:center;margin-top:10px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(sale.verifactu.qrData)}" style="width:120px;height:120px"></div>`
    : '';
  // Pedir la reseña justo al final, cuando el cliente ya tiene el ticket en
  // la mano y acaba de vivir la experiencia — reutiliza el mismo enlace de
  // Google que ya se configura en Mi Negocio → Redes sociales para nada
  // más (no hace falta pedir ni guardar una URL aparte). Se puede ocultar
  // desde Mi Negocio → Ticket sin borrar el enlace guardado.
  const reviewQrHtml = (b.gmaps && tc.mostrarResenaQr !== false)
    ? `<div style="text-align:center;margin-top:16px;padding-top:14px;border-top:1px dashed #bbb">
        <div style="font-size:13px;font-weight:700">${t('ticket.reviewTitle')}</div>
        <div style="font-size:11.5px;color:#555;margin:2px 0 8px">${t('ticket.reviewDesc')}</div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(b.gmaps)}" style="width:110px;height:110px">
      </div>`
    : '';

  return `
    <div style="width:300px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111">
      ${logoHtml}
      <div style="text-align:center;font-weight:700;font-size:16px">${escapeHtml(b.name || 'GastroGoan')}</div>
      ${opts.duplicado ? `<div style="text-align:center;font-size:12px;font-weight:700;color:#B8860B;letter-spacing:1px;margin-top:2px">${t('ticket.duplicateLabel')}</div>` : ''}
      ${metaLines.length ? `<div style="text-align:center;font-size:11px;color:#666;line-height:1.5;margin-top:2px">${metaLines.join('<br>')}</div>` : ''}
      ${opts.factura ? `<div style="text-align:center;font-size:12px;font-weight:700;margin-top:8px">${t('ticket.invoiceNumber')} ${escapeHtml(sale.facturaNum||'')}</div>` : ''}
      <div style="border-top:1px dashed #bbb;margin:10px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#555">
        <span>${escapeHtml(sale.date||'')}</span>
        <span>${escapeHtml(tipoLabel)}${sale.clienteNombre?' · '+escapeHtml(sale.clienteNombre):''}</span>
      </div>
      <div style="border-top:1px dashed #bbb;margin:10px 0"></div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="border-bottom:1px solid #ccc;font-size:10.5px;color:#888;text-transform:uppercase">
            <th style="text-align:left;padding:0 4px 4px 0;font-weight:600">${t('common.qty')}</th>
            <th style="text-align:left;padding:0 4px 4px;font-weight:600">${t('common.product')}</th>
            <th style="text-align:right;padding:0 0 4px 4px;font-weight:600">€</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="border-top:1px dashed #bbb;margin:10px 0"></div>
      ${summaryHtml}
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:8px;padding-top:8px;border-top:2px solid #111">
        <span>${t('common.total')}</span><span>${fmtMoney(sale.total)}</span>
      </div>
      <div style="margin-top:8px">${paymentHtml}</div>
      ${verifactuHtml}
      ${qrHtml}
      <div style="text-align:center;font-size:11.5px;color:#666;margin-top:14px;line-height:1.5">${escapeHtml(tc.pie || t('ticket.thanksVisit'))}</div>
      ${reviewQrHtml}
    </div>
  `;
}

function printTicket(sale, opts={}){
  const html = buildTicketHtml(sale, opts);
  const win = window.open('', '_blank', 'width=360,height=600');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${opts.factura?'Factura':'Ticket'}</title>
    <style>@page{margin:6mm} body{margin:0;padding:14px 0}</style>
    </head><body>${html}</body></html>`);
  win.document.close();
  win.print();
}

// Asigna un número de factura secuencial (solo la primera vez) e imprime
// una factura simplificada con desglose de IVA según la configuración del ticket.
function printInvoice(saleId){
  const sale = DB.sales.find(s => s.id === saleId);
  if(!sale) return;
  // Si ya tenía número de factura ANTES de entrar aquí, esto es una
  // reimpresión de una factura ya emitida — se marca como tal para que no
  // se pueda confundir con el original (mismo número, misma pinta, entregado
  // dos veces sin ninguna marca visible de que la segunda es una copia).
  const yaEmitida = !!sale.facturaNum;
  if(!sale.facturaNum){
    DB.business.facturaCounter = (DB.business.facturaCounter||0) + 1;
    const year = (sale.date || todayStr()).slice(0,4);
    sale.facturaNum = `${year}-${String(DB.business.facturaCounter).padStart(5,'0')}`;
    saveDB();
  }
  printTicket(sale, {factura:true, duplicado: yaEmitida});
}

// Abre el cliente de correo del usuario con el ticket en el cuerpo del mensaje.
async function sendTicketByEmail(saleId){
  const sale = DB.sales.find(s => s.id === saleId);
  if(!sale) return;
  const email = (await promptText(t('ticket.promptClientEmail'), '')||'').trim();
  if(!email) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast(t('msg.invalidEmail')); return; }
  const subject = t('ticket.emailSubject').replace('${biz}', DB.business.name || 'GastroGoan');
  const body = buildTicketText(sale);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // mailto: no tiene un límite oficial, pero muchos gestores de correo/SO
  // truncan el cuerpo en algún punto entre 1500-2000 caracteres — con un
  // ticket largo (mesa con muchas líneas + desglose de IVA + pie + reseña)
  // el cliente podía recibir un email cortado a medias sin que nadie se
  // enterara. showToast solo muestra un aviso a la vez (el segundo pisa al
  // primero), así que se combina en un único mensaje en vez de avisar y
  // acto seguido taparlo con "Abriendo cliente de correo...".
  showToast(body.length > 1500 ? t('msg.emailTicketMightTruncate') : t('msg.openingEmail'));
}

// Tras registrar un cobro, deja elegir qué hacer con el ticket.
function openTicketDeliveryModal(saleId){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-receipt"></i> ${t('ticket.chargeRegistered')}</h3>
      <button class="modal-close" onclick="closeModal();renderTPV()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:14px">${t('ticket.whatToDo')}</p>
    <div class="modal-footer" style="flex-wrap:wrap">
      <button class="btn" onclick="closeModal();renderTPV()"><i class="ti ti-x"></i> ${t('ticket.dontPrint')}</button>
      <button class="btn" onclick="sendTicketByEmail(${saleId})"><i class="ti ti-mail"></i> ${t('ticket.sendByEmail')}</button>
      <button class="btn" onclick="printInvoice(${saleId})"><i class="ti ti-file-invoice"></i> ${t('ticket.invoiceBtn')}</button>
      <button class="btn btn-primary" onclick="(()=>{const s=DB.sales.find(x=>x.id===${saleId});if(s)printTicket(s);})()"><i class="ti ti-printer"></i> ${t('ticket.printTicket')}</button>
      ${thermalPrintingSupported() ? `<button class="btn" onclick="(()=>{const s=DB.sales.find(x=>x.id===${saleId});if(s)printToThermalPrinter(buildTicketText(s));})()" title="${t('thermal.hint')}"><i class="ti ti-device-usb"></i> ${t('thermal.printBtn')}</button>` : ''}
      <button class="btn btn-danger" onclick="requestCancelSale(${saleId})" title="${t('title.cancelSale')}"><i class="ti ti-receipt-refund"></i> ${t('ticket.cancelSaleBtn')}</button>
    </div>
  `);
}

