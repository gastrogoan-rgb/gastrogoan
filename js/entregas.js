/* ============================================================
   PARA LLEVAR Y DELIVERY «SUBLIMES» (13/11) — plan en reports/Delivery y take away sublimes.md
   Regla de la casa: NADA de esto cuesta dinero por licencia. No hay servidor, ni SMS, ni API de WhatsApp: son marcas de tiempo,
   estados y avisos sobre datos que ya viven en la nube de cada negocio, más el navegador del cliente.
   ⚠️ Los textos nuevos van con gl({es,ca,en}) (prosa corta de interfaz): hay que escribirlos SIEMPRE en los tres idiomas.
   ============================================================ */

/* ───────── 1. ALARMA PERSISTENTE, SONIDO ACTIVADO Y PANTALLA ENCENDIDA (#1) ─────────
   Un único pitido corto se pierde con la cocina a mil. Mientras haya algo por atender (pedidos de la web pendientes, reservas por
   confirmar) suena cada 8 s, parpadea la franja y el título de la pestaña cuenta cuántos hay. Los navegadores no dejan sonar sin un
   toque previo: cualquier toque en la pantalla desbloquea el sonido y, si aún no ha habido ninguno, un botón lo dice claro. */
const ENT_ALARMA_OFF_LS = 'gastrogoan_alarma_off';
let entAudio = null, entWake = null, entTituloBase = null, entUltimoN = -1;

function entAudioCtx(){
  try{
    if(!entAudio){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; entAudio = new C(); }
    return entAudio;
  }catch(e){ return null; }
}
function entSonidoActivo(){ return !!(entAudio && entAudio.state === 'running'); }
function entAlarmaApagada(){ try{ return localStorage.getItem(ENT_ALARMA_OFF_LS) === '1'; }catch(e){ return false; } }
function entPitido(veces){
  const c = entAudioCtx();
  if(!c || c.state !== 'running') return false;
  try{
    const n = Math.max(1, veces || 1);
    for(let i = 0; i < n; i++){
      const t0 = c.currentTime + i * 0.32;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sine'; osc.frequency.value = i % 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(g); g.connect(c.destination); osc.start(t0); osc.stop(t0 + 0.28);
    }
    return true;
  }catch(e){ return false; }
}
async function entPedirWake(){
  try{
    if(!('wakeLock' in navigator) || entWake) return;
    entWake = await navigator.wakeLock.request('screen');
    entWake.addEventListener('release', () => { entWake = null; });
  }catch(e){ entWake = null; }
}
function entActivarSonido(){
  const c = entAudioCtx();
  const listo = () => { entPitido(2); entPedirWake(); try{ if(typeof renderTPV === 'function' && document.getElementById('view-tpv') && document.getElementById('view-tpv').classList.contains('active')) renderTPV(); }catch(e){} showToast(gl({es:'Sonido de avisos activado', ca:'So d\'avisos activat', en:'Alert sound on'})); };
  if(c && c.state === 'suspended') c.resume().then(listo).catch(() => {}); else listo();
}
function entToggleAlarma(){
  try{ if(entAlarmaApagada()) localStorage.removeItem(ENT_ALARMA_OFF_LS); else localStorage.setItem(ENT_ALARMA_OFF_LS, '1'); }catch(e){}
  entAlarmaTick(); if(typeof renderTPV === 'function') renderTPV();
}
// Cuántas cosas esperan a que alguien decida: pedidos de la web por aceptar y reservas por confirmar.
function entPendientesAtencion(){
  try{
    if(typeof DB === 'undefined' || !DB || !DB.tpvOrders) return 0;
    const hoy = todayStr();
    return getPendingOnlineOrders().length + (DB.reservations || []).filter(r => r && r.origen === 'publico' && r.status === 'pendiente' && (r.date || hoy) >= hoy).length;
  }catch(e){ return 0; }
}
function entAlarmaTick(){
  try{
    const n = entAlarmaApagada() ? 0 : entPendientesAtencion();
    if(entTituloBase === null) entTituloBase = document.title.replace(/^\(\d+\) ¡Atiende! — /, '');
    if(n !== entUltimoN){
      entUltimoN = n;
      document.body.classList.toggle('ent-alarma', n > 0);
      document.title = n > 0 ? '(' + n + ') ' + gl({es:'¡Atiende!', ca:'Atén!', en:'Attend!'}) + ' — ' + entTituloBase : entTituloBase;
    }
    if(n > 0){
      entPitido(2);
      try{ if(navigator.vibrate) navigator.vibrate([180, 90, 180]); }catch(e){}
    }
  }catch(e){}
}
// Primer toque en cualquier sitio: desbloquea el sonido (política de los navegadores) y pide mantener la pantalla encendida en TPV y Cocina.
function entPrimerToque(){
  const c = entAudioCtx();
  if(c && c.state === 'suspended') c.resume().catch(() => {});
  try{
    const a = document.querySelector('.view.active'); const v = a ? a.id.replace(/^view-/, '') : '';
    if(v === 'tpv' || v === 'comandascocina') entPedirWake();
  }catch(e){}
}
document.addEventListener('pointerdown', entPrimerToque, {passive: true});
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible'){ entPedirWake(); entAlarmaTick(); } });
setInterval(entAlarmaTick, 8000);

/* ───────── 2. MODO OCUPADO Y PAUSA POR CANAL, CON CADUCIDAD (#7) ─────────
   Una válvula, no un interruptor: «+10/+15/+20 min» a la hora que se promete, o pausar solo llevar / solo domicilio, durante 15, 30
   o 60 minutos. Caduca solo (la web compara con su reloj; no hay servidor que tenga que acordarse de reanudar). */
function entPedidosCfg(){ if(!DB.business.pedidos) DB.business.pedidos = {}; return DB.business.pedidos; }
function entFuturo(iso){ if(!iso) return null; const d = new Date(iso); return (!isNaN(d) && d.getTime() > Date.now()) ? d : null; }
function entOcupadoActivo(){
  const p = (DB.business && DB.business.pedidos) || {};
  const hasta = entFuturo(p.ocupadoHasta); const extra = parseInt(p.ocupadoExtraMin) || 0;
  return (hasta && extra > 0) ? {extra, hasta} : null;
}
function entCanalPausado(tipo){
  const p = (DB.business && DB.business.pedidos) || {};
  return entFuturo(tipo === 'delivery' ? p.pausaDeliveryHasta : p.pausaTakeawayHasta);
}
let entDurSel = 30;
function entSetDur(m){ entDurSel = parseInt(m) || 30; if(typeof renderTPV === 'function') renderTPV(); }
function entPonerOcupado(extra){
  const p = entPedidosCfg(); p.ocupadoExtraMin = parseInt(extra) || 0; p.ocupadoHasta = new Date(Date.now() + entDurSel * 60000).toISOString();
  saveDB(); entProgramarCaducidad(); renderTPV();
  showToast(gl({es:'Modo ocupado: +' + extra + ' min durante ' + entDurSel + ' min', ca:'Mode ocupat: +' + extra + ' min durant ' + entDurSel + ' min', en:'Busy mode: +' + extra + ' min for ' + entDurSel + ' min'}));
}
function entQuitarOcupado(){ const p = entPedidosCfg(); p.ocupadoExtraMin = 0; p.ocupadoHasta = ''; saveDB(); renderTPV(); }
function entPausarCanal(tipo){
  const p = entPedidosCfg(); p[tipo === 'delivery' ? 'pausaDeliveryHasta' : 'pausaTakeawayHasta'] = new Date(Date.now() + entDurSel * 60000).toISOString();
  saveDB(); entProgramarCaducidad(); renderTPV();
}
function entReanudarCanal(tipo){ const p = entPedidosCfg(); p[tipo === 'delivery' ? 'pausaDeliveryHasta' : 'pausaTakeawayHasta'] = ''; saveDB(); renderTPV(); }
let entTimerCaduca = null;
function entProgramarCaducidad(){
  clearTimeout(entTimerCaduca);
  if(typeof DB === 'undefined' || !DB || !DB.business) return;
  const p = (DB.business && DB.business.pedidos) || {};
  const fut = [p.ocupadoHasta, p.pausaTakeawayHasta, p.pausaDeliveryHasta].map(entFuturo).filter(Boolean).map(d => d.getTime());
  if(!fut.length) return;
  entTimerCaduca = setTimeout(() => { try{ if(typeof renderTPV === 'function' && document.querySelector('#view-tpv.active')) renderTPV(); }catch(e){} entProgramarCaducidad(); }, Math.max(1000, Math.min(...fut) - Date.now() + 500));
}
const entHoraCorta = d => d.toLocaleTimeString(localeActual(), {hour:'2-digit', minute:'2-digit'});

// La franja que va encima de Para llevar / Delivery: sonido, modo ocupado y pausas.
function entBarraHtml(){
  const oc = entOcupadoActivo(), pT = entCanalPausado('takeaway'), pD = entCanalPausado('delivery');
  const alarmaOff = entAlarmaApagada();
  const durBtn = m => `<button type="button" class="btn btn-sm btn-fino${entDurSel === m ? ' is-on' : ''}" aria-pressed="${entDurSel === m}" onclick="entSetDur(${m})">${m} min</button>`;
  const extraBtn = m => `<button type="button" class="btn btn-sm btn-fino${oc && oc.extra === m ? ' is-lim' : ''}" onclick="entPonerOcupado(${m})">+${m} min</button>`;
  return `
  <div class="ent-barra" id="ent-barra">
    <div class="ent-sonido" id="ent-aviso-reloj" hidden></div>
    ${!entSonidoActivo() ? `<div class="ent-sonido"><i class="ti ti-volume-off"></i><span>${escapeHtml(gl({es:'El sonido de avisos está desactivado en este aparato: toca para activarlo y mantener la pantalla encendida.', ca:'El so d\'avisos està desactivat en aquest aparell: toca per activar-lo i mantenir la pantalla encesa.', en:'Alert sound is off on this device: tap to turn it on and keep the screen awake.'}))}</span><button type="button" class="btn btn-fino is-lim" id="ent-activar-sonido" onclick="entActivarSonido()">${escapeHtml(gl({es:'Activar sonido', ca:'Activar so', en:'Turn sound on'}))}</button></div>` : ''}
    <details class="ent-herr"${window.innerWidth > 720 || oc || pT || pD ? ' open' : ''}>
    <summary class="btn btn-sm btn-fino"><i class="ti ti-adjustments-horizontal"></i> ${escapeHtml(gl({es:'Herramientas de pedidos', ca:'Eines de comandes', en:'Order tools'}))}${oc || pT || pD ? ' <b class="ent-herr-on">' + escapeHtml(gl({es:'activo', ca:'actiu', en:'on'})) + '</b>' : ''}</summary>
    <div class="ent-fila">
      <span class="ent-rot">${escapeHtml(gl({es:'Cocina saturada', ca:'Cuina saturada', en:'Kitchen busy'}))}</span>
      <span class="ent-chips" role="group">${extraBtn(10)}${extraBtn(15)}${extraBtn(20)}</span>
      <span class="ent-rot">${escapeHtml(gl({es:'durante', ca:'durant', en:'for'}))}</span>
      <span class="ent-chips" role="group">${durBtn(15)}${durBtn(30)}${durBtn(60)}</span>
      <button type="button" class="btn btn-sm btn-fino" id="ent-alarma-toggle" aria-pressed="${!alarmaOff}" onclick="entToggleAlarma()"><i class="ti ${alarmaOff ? 'ti-bell-off' : 'ti-bell-ringing'}"></i> ${escapeHtml(alarmaOff ? gl({es:'Alarma apagada', ca:'Alarma apagada', en:'Alarm off'}) : gl({es:'Alarma activa', ca:'Alarma activa', en:'Alarm on'}))}</button>
    </div>
    <div class="ent-fila">
      ${oc ? `<span class="ent-estado is-lim"><i class="ti ti-flame"></i> ${escapeHtml(gl({es:'Ocupado +' + oc.extra + ' min hasta las ' + entHoraCorta(oc.hasta), ca:'Ocupat +' + oc.extra + ' min fins a les ' + entHoraCorta(oc.hasta), en:'Busy +' + oc.extra + ' min until ' + entHoraCorta(oc.hasta)}))}</span><button type="button" class="btn btn-sm btn-fino" onclick="entQuitarOcupado()">${escapeHtml(gl({es:'Reanudar', ca:'Reprendre', en:'Resume'}))}</button>` : ''}
      ${pT ? `<span class="ent-estado is-off"><i class="ti ti-player-pause"></i> ${escapeHtml(gl({es:'Para llevar en pausa hasta las ' + entHoraCorta(pT), ca:'Per emportar en pausa fins a les ' + entHoraCorta(pT), en:'Pickup paused until ' + entHoraCorta(pT)}))}</span><button type="button" class="btn btn-sm btn-fino" onclick="entReanudarCanal('takeaway')">${escapeHtml(gl({es:'Reanudar', ca:'Reprendre', en:'Resume'}))}</button>`
          : `<button type="button" class="btn btn-sm btn-fino" onclick="entPausarCanal('takeaway')"><i class="ti ti-player-pause"></i> ${escapeHtml(gl({es:'Pausar para llevar', ca:'Pausar per emportar', en:'Pause pickup'}))}</button>`}
      ${pD ? `<span class="ent-estado is-off"><i class="ti ti-player-pause"></i> ${escapeHtml(gl({es:'Domicilio en pausa hasta las ' + entHoraCorta(pD), ca:'Domicili en pausa fins a les ' + entHoraCorta(pD), en:'Delivery paused until ' + entHoraCorta(pD)}))}</span><button type="button" class="btn btn-sm btn-fino" onclick="entReanudarCanal('delivery')">${escapeHtml(gl({es:'Reanudar', ca:'Reprendre', en:'Resume'}))}</button>`
          : `<button type="button" class="btn btn-sm btn-fino" onclick="entPausarCanal('delivery')"><i class="ti ti-player-pause"></i> ${escapeHtml(gl({es:'Pausar domicilio', ca:'Pausar domicili', en:'Pause delivery'}))}</button>`}
      <button type="button" class="btn btn-sm btn-fino" onclick="entNuevoPedidoTelefono()"><i class="ti ti-phone-plus"></i> ${escapeHtml(gl({es:'Pedido por teléfono', ca:'Comanda per telèfon', en:'Phone order'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="entAbrirRepartidor()"><i class="ti ti-moped"></i> ${escapeHtml(gl({es:'Mi reparto', ca:'El meu repartiment', en:'My deliveries'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="entAbrirTablero()"><i class="ti ti-device-tv"></i> ${escapeHtml(gl({es:'Pantalla de listos', ca:'Pantalla de llestos', en:'Ready screen'}))}</button>
      <button type="button" class="btn btn-sm btn-fino owner-only" onclick="entAbrirKit()"><i class="ti ti-share"></i> ${escapeHtml(gl({es:'Captación', ca:'Captació', en:'Acquisition'}))}</button>
      <button type="button" class="btn btn-sm btn-fino owner-only" onclick="entAbrirAnalitica()"><i class="ti ti-chart-line"></i> ${escapeHtml(gl({es:'Tiempos', ca:'Temps', en:'Timings'}))}</button>
    </div>
    </details>
  </div>`;
}

/* ───────── 3. «EN CAMINO»: el repartidor pulsa «Salgo» (#2) ─────────
   El estado lo dispara un hecho real. Antes el cliente pasaba de «listo» a «entregado» sin enterarse de que salió. */
function markRepartoSalida(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || order.entregaEstado === 'entregado' || order.entregaEstado === 'encamino') return;
  const sigue = () => {
    order.entregaEstado = 'encamino';
    order.entregaSalidaAt = new Date().toISOString();
    logAudit('edit', gl({es:'Reparto: salió el pedido de ' + (order.clienteNombre || '?'), ca:'Repartiment: ha sortit la comanda de ' + (order.clienteNombre || '?'), en:'Delivery: order left for ' + (order.clienteNombre || '?')}));
    entGuardarTiempos(order);
    saveDB();
    if(typeof syncOrderStatusForPublic === 'function') syncOrderStatusForPublic(order);
    refreshRepartoUI(orderId);
    showToast(gl({es:'En camino. El cliente ya lo ve en su seguimiento.', ca:'En camí. El client ja ho veu al seu seguiment.', en:'On its way. The customer sees it now.'}));
  };
  if(!entEmpaquetadoCompleto(order)){
    confirmModal(gl({es:'La lista de empaquetado no está completa. ¿Salir igualmente?', ca:'La llista d\'empaquetat no està completa. Sortir igualment?', en:'The packing list is not complete. Leave anyway?'}), {confirmLabel: gl({es:'Salir igualmente', ca:'Sortir igualment', en:'Leave anyway'})}).then(ok => { if(ok) sigue(); });
    return;
  }
  sigue();
}
// Minutos reales de reparto de un código postal: mediana de las entregas de los últimos 60 días (mínimo 5), o null si no hay histórico.
function tiempoRepartoCp(cp){
  cp = String(cp || '').replace(/\s+/g, ''); if(!cp) return null;
  const desde = Date.now() - 60 * 86400000, mins = [];
  (DB.sales || []).forEach(s => {
    const tm = s && s.tiempos; if(!tm || !tm.salio || !tm.entregado || String(tm.cp || '').replace(/\s+/g, '') !== cp) return;
    const a = new Date(tm.salio).getTime(), b = new Date(tm.entregado).getTime();
    if(!isNaN(a) && !isNaN(b) && b > a && b >= desde) mins.push((b - a) / 60000);
  });
  if(mins.length < 5) return null;
  mins.sort((x, y) => x - y);
  return Math.max(5, Math.round(mins[Math.floor(mins.length / 2)]));
}
// Marcas de tiempo del pedido, para la analítica (#18). Se guardan en la venta, que es lo que no se purga.
function entTiemposDeOrder(order){
  if(!order || (order.tipo !== 'takeaway' && order.tipo !== 'delivery')) return null;
  const prom = (order.date && order.time) ? new Date(order.date + 'T' + order.time) : null;
  const v = ventanaPromesaPedido(order);
  return {
    canal: order.tipo, cp: order.clienteCodigoPostal || '', origen: order.origenOnline ? 'web' : (order.plataformaId ? 'plataforma' : 'local'),
    creado: order.createdAt || '', prometida: prom && !isNaN(prom) ? prom.toISOString() : '', hasta: v ? v.hasta : '',
    aceptado: order.aceptadoAt || '', listo: order.listoAt || '', salio: order.entregaSalidaAt || '', entregado: order.entregadoAt || '', recogido: order.recogidoAt || '',
    repartidor: order.repartidorId || order.repartidorCourierId || null
  };
}
function entGuardarTiempos(order){
  try{ const sale = (DB.sales || []).find(s => s && s.id === order.id); const tm = entTiemposDeOrder(order); if(sale && tm) sale.tiempos = tm; }catch(e){}
}

/* ───────── 4. LISTA DE EMPAQUETADO Y ETIQUETA DE BOLSA (#9, #17) ─────────
   Lo que más falla es la bolsa: la bebida, la salsa, los cubiertos. Una lista que hay que completar antes de salir, con una
   comprobación más si el pedido lleva alergias, y la etiqueta «bolsa 1 de 2» para el rollo de 58/80 mm. */
const ENT_RX_ALERGIA = /alerg|celiac|cel[ií]ac|gluten|lactosa|frutos? secos|cacahuet|marisco|huevo|s[eé]samo|sulfit|intoleran/i;
function entTieneAlergia(order){
  if(ENT_RX_ALERGIA.test(String(order.notas || '') + ' ' + String(order.instrucciones || ''))) return true;
  return (order.items || []).some(l => ENT_RX_ALERGIA.test(String(l.notas || '')));
}
function entEmpaquetadoLineas(order){
  const out = [];
  (order.items || []).filter(l => !l.isShipping).forEach((l, i) => out.push({k: 'l' + i, txt: l.qty + '× ' + l.name, bebida: !!l.bebida}));
  out.push({k: 'cub', txt: gl({es:'Cubiertos y servilletas', ca:'Coberts i tovallons', en:'Cutlery and napkins'})});
  out.push({k: 'sal', txt: gl({es:'Salsas y extras', ca:'Salses i extres', en:'Sauces and extras'})});
  out.push({k: 'tic', txt: gl({es:'Bolsa revisada contra el ticket', ca:'Bossa revisada contra el tiquet', en:'Bag checked against the receipt'})});
  if(entTieneAlergia(order)) out.push({k: 'ale', txt: gl({es:'Alergias: comprobado dos veces', ca:'Al·lèrgies: comprovat dues vegades', en:'Allergies: checked twice'})});
  return out;
}
function entEmpaquetadoCompleto(order){
  if(!order || (order.tipo !== 'delivery' && order.tipo !== 'takeaway')) return true;
  if(!(order.items || []).length) return true;
  const c = (order.empaq && order.empaq.c) || {};
  return entEmpaquetadoLineas(order).every(x => c[x.k]);
}
function entEmpaqToggle(orderId, k){
  const order = DB.tpvOrders.find(o => o.id === orderId); if(!order) return;
  if(!order.empaq) order.empaq = {c: {}, bolsas: 1};
  order.empaq.c[k] = !order.empaq.c[k];
  saveDB(); refreshEntregaUI(orderId);
}
function entEmpaqBolsas(orderId, n){
  const order = DB.tpvOrders.find(o => o.id === orderId); if(!order) return;
  if(!order.empaq) order.empaq = {c: {}, bolsas: 1};
  order.empaq.bolsas = Math.min(9, Math.max(1, parseInt(n) || 1));
  saveDB(); refreshEntregaUI(orderId);
}
function refreshEntregaUI(orderId){
  if(document.querySelector('.modal-overlay.active') && !document.getElementById('repartos-control-modal-body')) renderTableOrderModal(orderId);
  else if(typeof renderTPV === 'function') renderTPV();
}
function entEmpaquetadoHtml(order){
  const lineas = entEmpaquetadoLineas(order), c = (order.empaq && order.empaq.c) || {}, bolsas = (order.empaq && order.empaq.bolsas) || 1;
  const hechos = lineas.filter(x => c[x.k]).length;
  return `<div class="card ent-empaq" id="ent-empaq-${order.id}">
    <h3 style="justify-content:space-between;font-size:14px"><span><i class="ti ti-package"></i> ${escapeHtml(gl({es:'Empaquetado', ca:'Empaquetat', en:'Packing'}))}</span><span class="badge ${hechos === lineas.length ? 'badge-green' : 'badge-amber'}">${hechos}/${lineas.length}</span></h3>
    <div class="ent-empaq-lista">${lineas.map(x => `<label class="ent-chk${c[x.k] ? ' is-hecho' : ''}"><input type="checkbox" ${c[x.k] ? 'checked' : ''} onchange="entEmpaqToggle(${order.id}, '${x.k}')"><span>${escapeHtml(x.txt)}${x.bebida ? ' <i class="ti ti-cup"></i>' : ''}</span></label>`).join('')}</div>
    <div class="ent-empaq-pie">
      <label class="txt-xs">${escapeHtml(gl({es:'Bolsas', ca:'Bosses', en:'Bags'}))} <input type="number" min="1" max="9" value="${bolsas}" style="width:64px" onchange="entEmpaqBolsas(${order.id}, this.value)"></label>
      <button type="button" class="btn btn-sm btn-fino" onclick="entImprimirEtiquetas(${order.id})"><i class="ti ti-printer"></i> ${escapeHtml(gl({es:'Etiquetas de bolsa', ca:'Etiquetes de bossa', en:'Bag labels'}))}</button>
    </div>
  </div>`;
}
function entTituloComanda(order){
  const v = ventanaPromesaPedido(order);
  const hora = v ? entHoraCorta(new Date(v.desde)) + '–' + entHoraCorta(new Date(v.hasta)) : (order.time || '');
  const canal = order.tipo === 'delivery' ? gl({es:'DOMICILIO', ca:'DOMICILI', en:'DELIVERY'}) : gl({es:'RECOGER', ca:'RECOLLIR', en:'PICKUP'});
  const ref = order.clientRef && typeof codigoCortoPublico === 'function' ? ' · Nº ' + codigoCortoPublico(order.clientRef) : '';
  return [canal, order.clienteNombre || '', hora, ref.trim()].filter(Boolean).join(' · ');
}
function entImprimirEtiquetas(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId); if(!order) return;
  const n = (order.empaq && order.empaq.bolsas) || 1;
  const ancho = 80;
  const v = ventanaPromesaPedido(order);
  const hora = v ? entHoraCorta(new Date(v.desde)) + '–' + entHoraCorta(new Date(v.hasta)) : (order.time || '');
  const ref = order.clientRef && typeof codigoCortoPublico === 'function' ? codigoCortoPublico(order.clientRef) : String(order.id).slice(-4);
  const alergia = entTieneAlergia(order);
  const una = i => `<div style="${i < n ? 'page-break-after:always;' : ''}text-align:center;padding:4px 0">
    <div style="font-size:22px;font-weight:800">${escapeHtml(order.clienteNombre || togoOrderLabel(order))}</div>
    <div style="font-size:15px;margin:2px 0">${escapeHtml(order.tipo === 'delivery' ? gl({es:'Domicilio', ca:'Domicili', en:'Delivery'}) : gl({es:'Para recoger', ca:'Per recollir', en:'Pickup'}))} · ${escapeHtml(hora)}</div>
    <div style="font-size:15px">Nº ${escapeHtml(ref)}</div>
    <div style="font-size:30px;font-weight:800;margin-top:4px;border-top:1px dashed #000;padding-top:4px">${escapeHtml(gl({es:'BOLSA', ca:'BOSSA', en:'BAG'}))} ${i} / ${n}</div>
    ${alergia ? `<div style="border:2px solid #000;margin-top:6px;padding:3px;font-weight:700;font-size:14px">⚠ ${escapeHtml(gl({es:'ALERGIAS: revisar', ca:'AL·LÈRGIES: revisar', en:'ALLERGIES: check'}))}</div>` : ''}
  </div>`;
  let h = ''; for(let i = 1; i <= n; i++) h += una(i);
  printViaBrowser(h, ancho, gl({es:'Etiquetas de bolsa', ca:'Etiquetes de bossa', en:'Bag labels'}), {html: true});
}

/* ───────── 5. VISTA DEL REPARTIDOR (#15) ─────────
   Lo mínimo para quien va en moto: lista por hora prometida, un botón enorme por paso («Salgo», «Entregado»), dirección con Maps
   y Waze, teléfono, cuánto cobrar y con qué billete paga. Funciona sin conexión como el resto de la app. */
function entRepartosDe(empId){
  const todos = getActiveRepartosOrders();
  const mios = empId ? todos.filter(o => o.repartidorId === empId) : todos;
  return mios.slice().sort((a, b) => (((a.date || '') + ' ' + (a.time || '99:99')).localeCompare((b.date || '') + ' ' + (b.time || '99:99'))));
}
function entAbrirRepartidor(){
  openModal(`<div class="modal-header"><h3><i class="ti ti-moped"></i> ${escapeHtml(gl({es:'Mi reparto', ca:'El meu repartiment', en:'My deliveries'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div id="ent-rep-body"></div>`, {order: true});
  entPintarRepartidor();
}
function entPintarRepartidor(){
  const box = document.getElementById('ent-rep-body'); if(!box) return;
  const yo = loggedInEmployeeId();
  const lista = entRepartosDe(yo);
  const cobro = o => { const f = computeFinalTotal(o); return f.amountDue; };
  const tarjeta = o => lista.length ? `
    <article class="card ent-rep-card${o.entregaEstado === 'encamino' ? ' is-encamino' : ''}${o === lista[0] ? ' is-siguiente' : ''}">
      <div class="ent-rep-top"><b>${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</b><span class="ent-rep-hora"><i class="ti ti-clock"></i> ${escapeHtml(o.time || '—')}</span></div>
      ${o.clienteDireccion ? `<div class="ent-rep-dir"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteDireccion)}${o.clienteCodigoPostal ? ' (' + escapeHtml(o.clienteCodigoPostal) + ')' : ''}</div>
        <div class="ent-rep-nav"><a class="btn btn-fino" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.clienteDireccion + ' ' + (o.clienteCodigoPostal || ''))}"><i class="ti ti-map-2"></i> Maps</a>
        <a class="btn btn-fino" target="_blank" rel="noopener" href="https://waze.com/ul?q=${encodeURIComponent(o.clienteDireccion + ' ' + (o.clienteCodigoPostal || ''))}&navigate=yes"><i class="ti ti-navigation"></i> Waze</a>
        ${o.clienteTelefono ? `<a class="btn btn-fino" href="tel:${escapeHtml(o.clienteTelefono.replace(/\s+/g, ''))}"><i class="ti ti-phone"></i> ${escapeHtml(gl({es:'Llamar', ca:'Trucar', en:'Call'}))}</a>` : ''}</div>` : ''}
      ${o.instrucciones ? `<div class="ent-rep-nota"><i class="ti ti-note"></i> ${escapeHtml(o.instrucciones)}</div>` : ''}
      ${o.sinContacto ? `<div class="ent-rep-nota">${o.fotoEntrega ? `<img src="${o.fotoEntrega}" alt="" style="max-width:120px;border-radius:4px;vertical-align:middle"> ` : `<button type="button" class="btn btn-sm btn-fino" onclick="entFotoEntrega(${o.id})"><i class="ti ti-camera"></i> ${escapeHtml(gl({es:'Foto de entrega', ca:'Foto de lliurament', en:'Delivery photo'}))}</button> `}<i class="ti ti-hand-off"></i> ${escapeHtml(gl({es:'Sin contacto: déjalo en la puerta', ca:'Sense contacte: deixa-ho a la porta', en:'Contactless: leave at the door'}))}</div>` : ''}
      <div class="ent-rep-cobro">${o.pagado ? `<span class="tp-av is-pago"><i class="ti ti-credit-card"></i> ${escapeHtml(t('label.paidOnline'))}</span>` : o.metodoPagoLocal === 'tarjeta' ? `<span class="tp-av"><i class="ti ti-credit-card"></i> ${escapeHtml(gl({es:'Paga con tarjeta al llegar · ', ca:'Paga amb targeta en arribar · ', en:'Pays by card on arrival · '}))}${fmtMoney(cobro(o))}</span>` : `<span class="tp-av is-inc"><i class="ti ti-cash"></i> ${escapeHtml(gl({es:'Cobrar ', ca:'Cobrar ', en:'Collect '}))}<b>${fmtMoney(cobro(o))}</b>${o.pagaCon ? ' · ' + escapeHtml(gl({es:'paga con ', ca:'paga amb ', en:'pays with '})) + fmtMoney(o.pagaCon) + ' → ' + escapeHtml(gl({es:'cambio ', ca:'canvi ', en:'change '})) + fmtMoney(Math.max(0, o.pagaCon - cobro(o))) : ''}</span>`}</div>
      <div class="ent-rep-btns">
        ${o.entregaEstado !== 'encamino' ? `<button type="button" class="btn btn-primary ent-grande" onclick="markRepartoSalida(${o.id}); setTimeout(entPintarRepartidor, 50)"><i class="ti ti-moped"></i> ${escapeHtml(gl({es:'Salgo', ca:'Surto', en:'Leaving'}))}</button>` : ''}
        <button type="button" class="btn ${o.entregaEstado === 'encamino' ? 'btn-primary' : 'btn-fino'} ent-grande" onclick="markRepartoEntregado(${o.id}); setTimeout(entPintarRepartidor, 50)"><i class="ti ti-circle-check"></i> ${escapeHtml(gl({es:'Entregado', ca:'Lliurat', en:'Delivered'}))}</button>
      </div>
    </article>` : '';
  const ruta = lista.length ? buildRouteMapsUrl(lista, {respetarOrden: true}) : null;
  box.innerHTML = `
    ${lista.length ? `<div class="ent-rep-sig"><span class="ent-rot">${escapeHtml(gl({es:'Siguiente parada', ca:'Propera parada', en:'Next stop'}))}</span><b>${escapeHtml(lista[0].clienteNombre || togoOrderLabel(lista[0]))}</b> · ${escapeHtml(lista[0].time || '—')}${lista[0].clienteDireccion ? ' · ' + escapeHtml(lista[0].clienteDireccion) : ''}${ruta && lista.length > 1 ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="${ruta}"><i class="ti ti-route"></i> ${escapeHtml(gl({es:'Ruta completa (' + lista.length + ' paradas, por hora prometida)', ca:'Ruta completa (' + lista.length + ' parades, per hora promesa)', en:'Full route (' + lista.length + ' stops, by promised time)'}))}</a>` : ''}</div>` : ''}
    <p class="pr-ayuda">${escapeHtml(yo ? gl({es:'Solo ves los pedidos que te tocan.', ca:'Només veus les comandes que et toquen.', en:'You only see the orders assigned to you.'}) : gl({es:'Ves todos los repartos en curso, ordenados por la hora prometida.', ca:'Veus tots els repartiments en curs, ordenats per l\'hora promesa.', en:'You see every delivery in progress, ordered by promised time.'}))}</p>
    ${lista.length ? `<div class="ent-rep-lista">${lista.map(tarjeta).join('')}</div>` : `<div class="empty es-vacio"><i class="ti ti-moped"></i>${escapeHtml(gl({es:'No hay repartos pendientes.', ca:'No hi ha repartiments pendents.', en:'No deliveries pending.'}))}</div>`}
    ${yo || entEsRepartidorActual() ? `<div style="margin-top:10px"><button type="button" class="btn btn-fino" onclick="entAbrirMonedero()"><i class="ti ti-wallet"></i> ${escapeHtml(gl({es:'Mi monedero de hoy', ca:'La meva cartera d\'avui', en:'My wallet today'}))}</button></div>` : `<div style="margin-top:10px"><button type="button" class="btn btn-fino owner-only" onclick="entAbrirMonedero()"><i class="ti ti-wallet"></i> ${escapeHtml(gl({es:'Monederos de hoy', ca:'Carteres d\'avui', en:'Wallets today'}))}</button></div>`}`;
}
function entEsRepartidorActual(){ const id = loggedInEmployeeId(); const e = id ? (DB.employees || []).find(x => x.id === id) : null; return !!(e && e.esRepartidor); }

/* ───────── 6. MONEDERO Y LIQUIDACIÓN DEL REPARTIDOR (#16) ─────────
   Fondo (cambio que se le da) + efectivo que cobra − lo que entrega en caja = esperado. El encargado cuenta lo recibido SIN ver el
   esperado hasta guardar (a ciegas), y la diferencia queda anotada. La propina de cada pedido es del repartidor (norma del plan,
   igual que Toast); un bote común sería una decisión del negocio. */
function entMonederoKey(riderKey){ return String(riderKey); }
function entMonederoDatos(fecha){
  if(!DB.business.repartoMonederos) DB.business.repartoMonederos = {};
  const dia = DB.business.repartoMonederos[fecha] || (DB.business.repartoMonederos[fecha] = {});
  return dia;
}
function entRepartosEntregadosDe(fecha){
  const out = {};
  const sumar = (o, ent) => {
    const k = o.repartidorId ? 'emp:' + o.repartidorId : (o.repartidorCourierId ? 'courier:' + o.repartidorCourierId : null); if(!k) return;
    const r = out[k] || (out[k] = {k, n: 0, efectivo: 0, propinas: 0});
    r.n++; const f = computeFinalTotal(o);
    if(!o.pagado && o.metodoPagoLocal !== 'tarjeta') r.efectivo += f.amountDue || 0;
    r.propinas += o.propina || 0;
  };
  (DB.tpvOrders || []).forEach(o => { if(esRepartoPropio(o) && o.entregaEstado === 'entregado' && o.entregadoAt && o.entregadoAt.slice(0, 10) === fecha) sumar(o); });
  return out;
}
function entRiderNombre(k){
  if(k.startsWith('emp:')){ const e = (DB.employees || []).find(x => x.id === parseInt(k.slice(4))); return e ? e.name : k; }
  const c = ((DB.business && DB.business.ownCouriers) || []).find(x => x.id === parseInt(k.slice(8))); return c ? c.nombre : k;
}
function entMonederosAbiertos(fecha){
  const dia = (DB.business.repartoMonederos || {})[fecha || todayStr()] || {};
  return Object.values(entRepartosEntregadosDe(fecha || todayStr())).filter(r => r.efectivo > 0 && !(dia[r.k] && dia[r.k].cerrado));
}
function entAbrirMonedero(){
  const hoy = todayStr(), datos = entRepartosEntregadosDe(hoy), dia = entMonederoDatos(hoy);
  const yo = loggedInEmployeeId(); const mioKey = yo ? 'emp:' + yo : null;
  const claves = new Set(Object.keys(datos)); Object.keys(dia).forEach(k => claves.add(k));
  if(mioKey) claves.add(mioKey);
  const filas = Array.from(claves).filter(k => !mioKey || k === mioKey).map(k => {
    const d = datos[k] || {n: 0, efectivo: 0, propinas: 0}, m = dia[k] || {};
    const esperado = (parseFloat(m.fondo) || 0) + d.efectivo;
    return `<div class="card ent-mon" data-k="${escapeHtml(k)}">
      <h3 style="justify-content:space-between;font-size:14px"><span><i class="ti ti-user"></i> ${escapeHtml(entRiderNombre(k))}</span>${m.cerrado ? `<span class="badge badge-green">${escapeHtml(gl({es:'Liquidado', ca:'Liquidat', en:'Settled'}))}</span>` : `<span class="badge badge-amber">${escapeHtml(gl({es:'Abierto', ca:'Obert', en:'Open'}))}</span>`}</h3>
      <div class="txt-xs">${escapeHtml(gl({es:'Entregas hoy: ', ca:'Lliuraments avui: ', en:'Deliveries today: '}))}<b>${d.n}</b> · ${escapeHtml(((DB.business.pedidos || {}).propinaBote) ? gl({es:'Propinas (al bote común): ', ca:'Propines (al pot comú): ', en:'Tips (shared pot): '}) : gl({es:'Propinas (suyas): ', ca:'Propines (seves): ', en:'Tips (theirs): '}))}<b>${fmtMoney(d.propinas)}</b></div>
      <div class="ent-mon-campos">
        <label>${escapeHtml(gl({es:'Cambio que lleva (fondo)', ca:'Canvi que porta (fons)', en:'Change carried (float)'}))}<input type="number" min="0" step="0.5" id="ent-mon-fondo-${escapeHtml(k)}" value="${m.fondo != null ? m.fondo : ''}" ${m.cerrado ? 'disabled' : ''} onchange="entMonederoFondo('${escapeHtml(k)}', this.value)"></label>
        <label>${escapeHtml(gl({es:'Efectivo que entrega', ca:'Efectiu que lliura', en:'Cash handed in'}))}<input type="number" min="0" step="0.01" id="ent-mon-contado-${escapeHtml(k)}" value="${m.contado != null ? m.contado : ''}" ${m.cerrado ? 'disabled' : ''}></label>
      </div>
      ${m.cerrado ? `<div class="txt-xs">${escapeHtml(gl({es:'Esperado ', ca:'Esperat ', en:'Expected '}))}<b>${fmtMoney(m.esperado)}</b> · ${escapeHtml(gl({es:'contado ', ca:'comptat ', en:'counted '}))}<b>${fmtMoney(m.contado)}</b> · ${escapeHtml(gl({es:'diferencia ', ca:'diferència ', en:'difference '}))}<b style="color:${Math.abs(m.diferencia) < 0.01 ? 'var(--olive)' : 'var(--red)'}">${fmtMoney(m.diferencia)}</b></div>`
        : `<button type="button" class="btn btn-primary btn-sm" onclick="entMonederoLiquidar('${escapeHtml(k)}')">${escapeHtml(gl({es:'Liquidar', ca:'Liquidar', en:'Settle'}))}</button>`}
    </div>`;
  }).join('') || `<div class="empty es-vacio">${escapeHtml(gl({es:'Hoy no hay repartos con efectivo.', ca:'Avui no hi ha repartiments amb efectiu.', en:'No cash deliveries today.'}))}</div>`;
  openModal(`<div class="modal-header"><h3><i class="ti ti-wallet"></i> ${escapeHtml(gl({es:'Monedero del repartidor', ca:'Cartera del repartidor', en:'Rider wallet'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <p class="pr-ayuda">${escapeHtml(gl({es:'Cuenta el efectivo que te entrega SIN mirar el esperado: el esperado solo se enseña al liquidar.', ca:'Compta l\'efectiu que et lliura SENSE mirar l\'esperat: l\'esperat només es mostra en liquidar.', en:'Count the cash handed in WITHOUT looking at the expected amount: it is only shown once settled.'}))}</p>${filas}`);
}
function entMonederoFondo(k, v){ const dia = entMonederoDatos(todayStr()); const m = dia[k] || (dia[k] = {}); m.fondo = parseFloat(v) || 0; saveDB(); }
function entMonederoLiquidar(k){
  const dia = entMonederoDatos(todayStr()); const m = dia[k] || (dia[k] = {});
  const el = document.getElementById('ent-mon-contado-' + k); const contado = parseFloat(el && el.value);
  if(isNaN(contado) || contado < 0){ showToast(gl({es:'Escribe el efectivo que entrega', ca:'Escriu l\'efectiu que lliura', en:'Enter the cash handed in'})); return; }
  const d = entRepartosEntregadosDe(todayStr())[k] || {efectivo: 0};
  m.contado = contado; m.esperado = Math.round(((parseFloat(m.fondo) || 0) + d.efectivo) * 100) / 100; m.diferencia = Math.round((contado - m.esperado) * 100) / 100; m.cerrado = true; m.ts = new Date().toISOString();
  // Solo se guardan los últimos 60 días: sin esto el bloque del negocio crecería para siempre.
  const lim = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  Object.keys(DB.business.repartoMonederos).forEach(f => { if(f < lim) delete DB.business.repartoMonederos[f]; });
  saveDB(); entAbrirMonedero();
}
// Aviso (no bloqueo) en el cierre de caja: hay efectivo de reparto sin liquidar.
function entAvisoMonederosHtml(){
  const ab = entMonederosAbiertos(todayStr()); if(!ab.length) return '';
  return `<div class="manual-warning"><i class="ti ti-wallet"></i> ${escapeHtml(gl({es:'Hay efectivo de reparto sin liquidar: ' + ab.map(r => entRiderNombre(r.k)).join(', ') + '. Puedes cerrar la caja igualmente.', ca:'Hi ha efectiu de repartiment sense liquidar: ' + ab.map(r => entRiderNombre(r.k)).join(', ') + '. Pots tancar la caixa igualment.', en:'There is delivery cash not settled: ' + ab.map(r => entRiderNombre(r.k)).join(', ') + '. You can close the till anyway.'}))}</div>`;
}

/* ───────── 7. PEDIDO POR TELÉFONO EN EL TPV (#14) ─────────
   Hasta hoy un pedido para llevar o a domicilio solo podía nacer en la web. Ahora se toma al teléfono con cliente, hora y zona, y
   entra en el MISMO flujo que uno de la web (franja, cocina, reparto, seguimiento). */
function entNuevoPedidoTelefono(){
  const p = (DB.business && DB.business.pedidos) || {};
  const d = new Date(Date.now() + 30 * 60000); const hh = String(d.getHours()).padStart(2, '0') + ':' + String(Math.ceil(d.getMinutes() / 5) * 5 % 60).padStart(2, '0');
  const tipos = DB.business.tiposServicio || {};
  openModal(`<div class="modal-header"><h3><i class="ti ti-phone-plus"></i> ${escapeHtml(gl({es:'Pedido por teléfono', ca:'Comanda per telèfon', en:'Phone order'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <div class="field"><label>${escapeHtml(gl({es:'Tipo', ca:'Tipus', en:'Type'}))}</label>
        <select id="tel-tipo" onchange="entTelTipo()"><option value="takeaway">${escapeHtml(gl({es:'Para recoger', ca:'Per recollir', en:'Pickup'}))}</option><option value="delivery">${escapeHtml(gl({es:'A domicilio', ca:'A domicili', en:'Delivery'}))}</option></select></div>
      <div class="field"><label>${escapeHtml(gl({es:'Nombre', ca:'Nom', en:'Name'}))}</label><input id="tel-nombre" autocomplete="off"></div>
      <div class="field"><label>${escapeHtml(gl({es:'Teléfono', ca:'Telèfon', en:'Phone'}))}</label><input id="tel-tel" type="tel" inputmode="tel" autocomplete="off"></div>
      <div id="tel-dom" style="display:none">
        <div class="field"><label>${escapeHtml(gl({es:'Dirección', ca:'Adreça', en:'Address'}))}</label><input id="tel-dir" autocomplete="off"></div>
        <div class="field"><label>${escapeHtml(gl({es:'Código postal', ca:'Codi postal', en:'Postal code'}))}</label><input id="tel-cp" inputmode="numeric" maxlength="5" autocomplete="off" oninput="entTelCp()"><small id="tel-cp-av" class="txt-xs" style="color:var(--red)"></small></div>
      </div>
      <div class="field"><label>${escapeHtml(gl({es:'Hora', ca:'Hora', en:'Time'}))}</label><input id="tel-hora" type="time" value="${hh}"></div>
      <div class="field"><label>${escapeHtml(gl({es:'Notas, alergias o instrucciones', ca:'Notes, al·lèrgies o instruccions', en:'Notes, allergies or instructions'}))}</label><textarea id="tel-notas" rows="2"></textarea></div>
      ${p.pedidoMinimo ? `<p class="txt-xs">${escapeHtml(gl({es:'Mínimo de pedido: ', ca:'Mínim de comanda: ', en:'Order minimum: '}))}${fmtMoney(p.pedidoMinimo)}</p>` : ''}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${escapeHtml(t('common.cancel'))}</button><button class="btn btn-primary" onclick="entCrearPedidoTelefono()">${escapeHtml(gl({es:'Crear y añadir platos', ca:'Crear i afegir plats', en:'Create and add dishes'}))}</button></div>`);
  void tipos;
}
function entTelTipo(){ const d = document.getElementById('tel-dom'); if(d) d.style.display = document.getElementById('tel-tipo').value === 'delivery' ? '' : 'none'; entTelCp(); }
function entTelCp(){
  const av = document.getElementById('tel-cp-av'); if(!av) return;
  const cp = (document.getElementById('tel-cp').value || '').replace(/\s+/g, '');
  const lista = ((DB.business.pedidos || {}).cpList) || [];
  av.textContent = (document.getElementById('tel-tipo').value === 'delivery' && cp.length === 5 && lista.length && !lista.includes(cp)) ? gl({es:'Fuera de tu zona de reparto', ca:'Fora de la teva zona de repartiment', en:'Outside your delivery area'}) : '';
}
function entCrearPedidoTelefono(){
  const tipo = document.getElementById('tel-tipo').value === 'delivery' ? 'delivery' : 'takeaway';
  const nombre = document.getElementById('tel-nombre').value.trim();
  const tel = document.getElementById('tel-tel').value.trim();
  const dir = (document.getElementById('tel-dir') || {}).value || '', cp = ((document.getElementById('tel-cp') || {}).value || '').replace(/\s+/g, '');
  const hora = document.getElementById('tel-hora').value, notas = document.getElementById('tel-notas').value.trim();
  if(!nombre){ showToast(gl({es:'Falta el nombre', ca:'Falta el nom', en:'Name missing'})); return; }
  if(tipo === 'delivery' && (!dir.trim() || !cp)){ showToast(gl({es:'Faltan la dirección y el código postal', ca:'Falten l\'adreça i el codi postal', en:'Address and postal code missing'})); return; }
  const matched = tel ? findClientByPhone(tel) : null;
  const lista = ((DB.business.pedidos || {}).cpList) || [];
  const fuera = tipo === 'delivery' && lista.length && !lista.includes(cp);
  const fin = () => {
    const id = genId();
    DB.tpvOrders.push({
      id, tableId: null, tipo, clienteNombre: nombre, clienteTelefono: tel, clienteEmail: '', clienteDireccion: tipo === 'delivery' ? dir.trim() : '', clienteCodigoPostal: tipo === 'delivery' ? cp : '',
      notas, date: todayStr(), time: hora, costeEnvio: tipo === 'delivery' ? costeEnvioPedidoPublico('delivery', 0, 0) : 0, propina: 0,
      status: 'abierta', items: [], tandas: [], createdAt: new Date().toISOString(), aceptadoAt: new Date().toISOString(), origenOnline: false, origenTelefono: true,
      clientRef: entNuevoToken(), clientId: matched ? matched.id : null, metodoPagoLocal: null, pagaCon: null
    });
    // Con token propio entra en el tablero de listos y tiene su Nº como cualquier pedido de la web.
    try{ syncOrderStatusForPublic(DB.tpvOrders[DB.tpvOrders.length - 1]); }catch(e){}
    saveDB(); closeModal(); renderTPV(); openTableOrder(null, id);
  };
  if(fuera){ confirmModal(gl({es:'Ese código postal está fuera de tu zona de reparto. ¿Crear el pedido igualmente?', ca:'Aquest codi postal és fora de la teva zona de repartiment. Crear la comanda igualment?', en:'That postal code is outside your delivery area. Create the order anyway?'}), {confirmLabel: gl({es:'Crear igualmente', ca:'Crear igualment', en:'Create anyway'})}).then(ok => { if(ok) fin(); }); return; }
  fin();
}

/* ───────── 8. ANALÍTICA DE TIEMPOS (#18) ─────────
   Sale de las marcas que ya se guardan en cada venta de para llevar/domicilio (`sale.tiempos`). Sin ellas nadie sabe si la promesa
   se cumple: es lo que enseña dónde se pierde el tiempo (cocina, bolsa o calle) y qué código postal se queda corto. */
function entAnaliticaDatos(dias){
  const desde = Date.now() - dias * 86400000;
  const v = (DB.sales || []).filter(s => s && s.tiempos && new Date(s.createdAt || s.date || 0).getTime() >= desde);
  const ms = (a, b) => { const x = new Date(a).getTime(), y = new Date(b).getTime(); return (isNaN(x) || isNaN(y) || !a || !b) ? null : (y - x) / 60000; };
  const prom = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;
  let tarde = 0, conPromesa = 0; const listoARec = [], salidaAEnt = [], porCp = {};
  v.forEach(s => {
    const tm = s.tiempos;
    const fin = tm.entregado || tm.recogido || '';
    if(tm.hasta && fin){ conPromesa++; if(new Date(fin).getTime() > new Date(tm.hasta).getTime()) tarde++; }
    const a = ms(tm.listo, tm.recogido || tm.salio); if(a != null && a >= 0 && a < 600) listoARec.push(a);
    const b = ms(tm.salio, tm.entregado); if(b != null && b >= 0 && b < 600){ salidaAEnt.push(b); if(tm.cp){ (porCp[tm.cp] = porCp[tm.cp] || []).push(b); } }
  });
  return {total: v.length, conPromesa, tarde, pctTarde: conPromesa ? Math.round(tarde * 100 / conPromesa) : null, listoARec: prom(listoARec), salidaAEnt: prom(salidaAEnt),
    porCp: Object.keys(porCp).map(cp => ({cp, n: porCp[cp].length, min: prom(porCp[cp])})).sort((a, b) => b.n - a.n).slice(0, 8)};
}
let entAnDias = 30;
function entAbrirAnalitica(){
  openModal(`<div class="modal-header"><h3><i class="ti ti-chart-line"></i> ${escapeHtml(gl({es:'Tiempos de para llevar y domicilio', ca:'Temps de per emportar i domicili', en:'Pickup and delivery timings'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div id="ent-an-body"></div>`);
  entPintarAnalitica();
}
function entAnDiasSet(n){ entAnDias = n; entPintarAnalitica(); }
function entPintarAnalitica(){
  const box = document.getElementById('ent-an-body'); if(!box) return;
  const d = entAnaliticaDatos(entAnDias);
  const perdidos = (DB.auditLog || []).filter(a => a && /rechaz|rejected|cancel/i.test(String(a.action || a.text || a.msg || '')) && new Date(a.ts || a.date || 0).getTime() >= Date.now() - entAnDias * 86400000).length;
  void perdidos;
  const kpi = (v, l) => `<div class="kpi"><div class="val te-valor">${v}</div><div class="lbl">${escapeHtml(l)}</div></div>`;
  box.innerHTML = `
    <div class="cl-chips" role="group">${[7, 30, 90].map(n => `<button type="button" class="btn btn-sm btn-fino${entAnDias === n ? ' is-on' : ''}" onclick="entAnDiasSet(${n})">${n} ${escapeHtml(gl({es:'días', ca:'dies', en:'days'}))}</button>`).join('')}</div>
    ${d.total ? `<div class="grid grid-3" style="margin:10px 0">
      ${kpi(d.pctTarde == null ? '—' : d.pctTarde + ' %', gl({es:'Pedidos fuera de la ventana prometida', ca:'Comandes fora de la finestra promesa', en:'Orders outside the promised window'}))}
      ${kpi(d.listoARec == null ? '—' : d.listoARec + ' min', gl({es:'Desde «listo» hasta recogida o salida', ca:'Des de «llest» fins a recollida o sortida', en:'From "ready" to pickup or departure'}))}
      ${kpi(d.salidaAEnt == null ? '—' : d.salidaAEnt + ' min', gl({es:'Desde la salida hasta la entrega', ca:'Des de la sortida fins al lliurament', en:'From departure to delivery'}))}</div>
    <h4>${escapeHtml(gl({es:'Por código postal', ca:'Per codi postal', en:'By postal code'}))}</h4>
    ${d.porCp.length ? `<table class="table"><thead><tr><th>CP</th><th>${escapeHtml(gl({es:'Entregas', ca:'Lliuraments', en:'Deliveries'}))}</th><th>${escapeHtml(gl({es:'Tiempo medio', ca:'Temps mitjà', en:'Average time'}))}</th></tr></thead><tbody>${d.porCp.map(r => `<tr><td>${escapeHtml(r.cp)}</td><td>${r.n}</td><td>${r.min} min</td></tr>`).join('')}</tbody></table>` : `<p class="txt-xs">${escapeHtml(gl({es:'Aún no hay entregas con salida marcada.', ca:'Encara no hi ha lliuraments amb sortida marcada.', en:'No deliveries with a departure mark yet.'}))}</p>`}
    <p class="txt-xs" style="color:var(--muted)">${escapeHtml(gl({es:d.total + ' pedidos medidos. Los tiempos salen de las marcas que se hacen al aceptar, dejar listo, salir y entregar; un pedido sin esas marcas no cuenta. Con 5 entregas o más a un código postal, la hora estimada del cliente usa su tiempo real.', ca:d.total + ' comandes mesurades. Els temps surten de les marques que es fan en acceptar, deixar llest, sortir i lliurar; una comanda sense aquestes marques no compta. Amb 5 lliuraments o més a un codi postal, l\'hora estimada del client fa servir el seu temps real.', en:d.total + ' orders measured. Times come from the marks made on accept, ready, leave and deliver; an order without them does not count. With 5+ deliveries to a postal code, the customer\'s estimate uses its real time.'}))}</p>`
      : `<div class="empty es-vacio"><i class="ti ti-chart-line"></i>${escapeHtml(gl({es:'Todavía no hay pedidos medidos. Aparecerán según se vayan cobrando.', ca:'Encara no hi ha comandes mesurades. Apareixeran a mesura que es cobrin.', en:'No measured orders yet. They will appear as they are charged.'}))}</div>`}`;
}

/* ───────── 9. AVISO POR WHATSAPP AL CLIENTE, YA ESCRITO (#6) ───────── */
function entMensajeCliente(order, que){
  const nom = order.clienteNombre || '';
  const neg = (DB.business && DB.business.name) || '';
  if(que === 'encamino') return gl({es:'Hola ' + nom + ', tu pedido de ' + neg + ' ya va en camino.', ca:'Hola ' + nom + ', la teva comanda de ' + neg + ' ja va de camí.', en:'Hi ' + nom + ', your order from ' + neg + ' is on its way.'});
  return gl({es:'Hola ' + nom + ', tu pedido de ' + neg + ' ya está listo para recoger.', ca:'Hola ' + nom + ', la teva comanda de ' + neg + ' ja és a punt per recollir.', en:'Hi ' + nom + ', your order from ' + neg + ' is ready for pickup.'});
}
function entAvisarWhatsApp(orderId, que){
  const o = DB.tpvOrders.find(x => x.id === orderId); if(!o) return;
  const num = whatsappDeTelefono(o.clienteTelefono);
  if(!num){ showToast(gl({es:'Solo se puede avisar a móviles', ca:'Només es pot avisar mòbils', en:'Only mobile numbers can be messaged'})); return; }
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(entMensajeCliente(o, que)), '_blank', 'noopener');
}

/* ───────── 10. AVISOS DEL CLIENTE SOBRE SU PEDIDO (#23, #24, #22) ─────────
   «Ya estoy aquí», cancelar y «¿algo ha ido mal?» llegan por el buzón público como `pedido_aviso`. ⚠️ Necesita las reglas nuevas
   (tipo `pedido_aviso`): con las viejas la web lo dice y manda llamar. Se busca el pedido por el token, nunca por id. */
function entAvisoDelCliente(req){
  const o = (DB.tpvOrders || []).find(x => x.clientRef && x.clientRef === req.token);
  if(!o) return false;
  const ahora = new Date().toISOString();
  if(req.accion === 'llegada' || req.accion === 'cinco'){
    o.llegadaAviso = {accion: req.accion, ts: ahora};
    logAudit('edit', gl({es:'El cliente avisa de su llegada: ' + (o.clienteNombre || '?'), ca:'El client avisa de la seva arribada: ' + (o.clienteNombre || '?'), en:'Customer announces arrival: ' + (o.clienteNombre || '?')}));
    return true;
  }
  if(req.accion === 'cancelar'){
    const empezado = (o.items || []).some(l => l.estado === 'preparando' || l.estado === 'entregado' || o.entregaEstado === 'encamino' || o.entregaEstado === 'entregado');
    if(o.status === 'pagada') return false;
    if(!o.pagado && !empezado && (o.status === 'pendiente-online' || o.status === 'abierta')){
      restockForVoidedItems(o.items, {includeIngredients: false});
      syncOrderStatusForPublic(o, 'rechazado');
      anularVentaPagoOnline(o);
      moveToTrash('order', o);
      logAudit('delete', gl({es:'Pedido cancelado por el cliente: ' + (o.clienteNombre || '?'), ca:'Comanda cancel·lada pel client: ' + (o.clienteNombre || '?'), en:'Order cancelled by customer: ' + (o.clienteNombre || '?')}), 'critical');
      DB.tpvOrders = DB.tpvOrders.filter(x => x.id !== o.id);
      return true;
    }
    // Ya pagado o ya en marcha: no se cancela solo (hay dinero o comida de por medio). Se marca y el negocio decide.
    o.cancelacionPedida = ahora;
    syncOrderStatusForPublic(o);
    return true;
  }
  if(req.accion === 'incidencia'){
    const motivo = ['faltaba', 'mal', 'frio', 'otro'].includes(req.motivo) ? req.motivo : 'otro';
    if(!Array.isArray(o.incidencias)) o.incidencias = [];
    o.incidencias.push({id: genId(), tipo: 'cliente', estado: 'abierta', creadaAt: ahora, motivo, mensajes: [{de: 'cliente', texto: String(req.detalle || '').slice(0, 300) || motivo, ts: ahora}], sinLeer: {sala: true, cocina: true}});
    return true;
  }
  return false;
}

/* ───────── 11. LATIDO DE LA APP (14/11, auditoría de veracidad) ─────────
   La web da un pedido por «confirmado» al instante, pero si la tablet está cerrada nadie lo ve. Cada 2 min (y al volver a la pestaña) la
   app escribe un sello en `info/appVistaTs`: una sola escritura mínima, en la nube del propio negocio. Si el sello es viejo, la web lo dice. */
function entLatido(){
  try{
    if(typeof DB === 'undefined' || !DB || !DB.business || typeof firebase === 'undefined' || document.visibilityState === 'hidden') return;
    const id = typeof getPublicId === 'function' ? getPublicId() : null; if(!id) return;
    getPublicMirrorApp().then(app => { if(app) app.database().ref('gastrogoan/public/' + id + '/info/appVistaTs').set(Date.now()).catch(() => {}); }).catch(() => {});
  }catch(e){}
}
setInterval(entLatido, 120000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(entLatido, 1500); });
setTimeout(entLatido, 8000);

/* ───────── 12. ZONAS CON TARIFA PROPIA Y CÓDIGOS PROMOCIONALES (14/11, plan delivery #20, #21) ───────── */
function entZonasATexto(zonas){
  return (zonas || []).map(z => [z.nombre || '', (z.cps || []).join(','), z.fee ?? '', z.minimo ?? '', z.gratis ?? ''].join(' | ')).join('\n');
}
function entZonasDeTexto(txt){
  const out = [];
  String(txt || '').split('\n').forEach(l => {
    const c = l.split('|').map(x => x.trim()); if(c.length < 2 || !c[1]) return;
    const cps = c[1].split(/[,\s]+/).map(x => x.replace(/\D/g, '')).filter(x => x.length === 5);
    if(!cps.length) return;
    const num = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? '' : Math.max(0, n); };
    out.push({nombre: c[0].slice(0, 40), cps, fee: num(c[2]), minimo: num(c[3]), gratis: num(c[4])});
  });
  return out.slice(0, 30);
}
function entCodigosATexto(cods){
  return (cods || []).filter(c => !c.compensacion).map(c => [c.codigo, c.pct ? c.pct + '%' : (c.eur ? c.eur + '€' : ''), c.minimo || '', c.hasta || '', c.usosMax || ''].join(' | ')).join('\n');
}
function entCodigosDeTexto(txt, previos){
  const usados = {}; (previos || []).forEach(c => { usados[c.codigo] = c.usados || 0; });
  const out = [];
  String(txt || '').split('\n').forEach(l => {
    const c = l.split('|').map(x => x.trim()); const codigo = (c[0] || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
    if(!codigo || !c[1]) return;
    const m = c[1].replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(%|€|eur)?$/i); if(!m) return;
    const v = parseFloat(m[1]); const esPct = m[2] === '%' || !m[2];
    const it = {codigo, minimo: parseFloat(String(c[2] || '').replace(',', '.')) || 0, hasta: /^\d{4}-\d{2}-\d{2}$/.test(c[3] || '') ? c[3] : '', usosMax: parseInt(c[4]) || 0, usados: usados[codigo] || 0};
    if(esPct) it.pct = Math.min(100, v); else it.eur = v;
    out.push(it);
  });
  // Los códigos de compensación por retraso (los crea la app, un solo uso) no se editan a mano: se conservan.
  return out.concat((previos || []).filter(c => c.compensacion && !(c.usosMax > 0 && c.usados >= c.usosMax))).slice(0, 60);
}
// La app valida el código con SUS reglas al recibir el pedido (el navegador solo lo enseña). Devuelve {codigo, pct} o null.
function entAplicarCodigo(codigo, subtotal){
  const p = (DB.business && DB.business.pedidos) || {}; const cod = String(codigo || '').trim().toUpperCase(); if(!cod) return null;
  const c = (p.codigos || []).find(x => x && String(x.codigo).toUpperCase() === cod); if(!c) return null;
  if(c.hasta && c.hasta < todayStr()) return null;
  if(c.usosMax > 0 && (c.usados || 0) >= c.usosMax) return null;
  if(c.minimo > 0 && subtotal + 0.001 < c.minimo) return null;
  c.usados = (c.usados || 0) + 1;
  const pct = c.pct > 0 ? c.pct : Math.min(100, Math.round(c.eur / Math.max(0.01, subtotal) * 10000) / 100);
  return {codigo: c.codigo, pct};
}
// Compensación por retraso: si llegó tarde (pasada la ventana por más de `compensarMin`), la app prepara un código de UN solo uso y lo deja
// listo para mandarlo por WhatsApp. Nunca se manda solo (no hay API de mensajes): lo pulsa una persona.
function entOfrecerCompensacion(order){
  try{
    const p = (DB.business && DB.business.pedidos) || {}; const pct = parseFloat(p.compensarRetrasoPct) || 0; if(pct <= 0) return;
    const v = ventanaPromesaPedido(order); if(!v || !order.entregadoAt) return;
    const tarde = Math.round((new Date(order.entregadoAt) - new Date(v.hasta)) / 60000);
    if(tarde < (parseInt(p.compensarMin) || 10)) return;
    const hasta = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const cod = 'LO' + Math.random().toString(36).slice(2, 7).toUpperCase();
    confirmModal(gl({es:'El pedido llegó ' + tarde + ' min tarde. ¿Preparar un código de ' + pct + ' % para el cliente?', ca:'La comanda ha arribat ' + tarde + ' min tard. Preparar un codi del ' + pct + ' % per al client?', en:'The order arrived ' + tarde + ' min late. Prepare a ' + pct + ' % code for the customer?'}), {confirmLabel: gl({es:'Preparar código', ca:'Preparar codi', en:'Prepare code'})}).then(ok => {
      if(!ok) return;
      if(!Array.isArray(p.codigos)) p.codigos = [];
      p.codigos.push({codigo: cod, pct, minimo: 0, hasta, usosMax: 1, usados: 0, compensacion: true});
      saveDB();
      const texto = gl({es:'Hola ' + (order.clienteNombre || '') + ', sentimos el retraso. Para tu próximo pedido tienes un ' + pct + ' % con el código ' + cod + ' (válido 30 días).', ca:'Hola ' + (order.clienteNombre || '') + ', sentim el retard. Per a la teva propera comanda tens un ' + pct + ' % amb el codi ' + cod + ' (vàlid 30 dies).', en:'Hi ' + (order.clienteNombre || '') + ', sorry for the delay. For your next order you get ' + pct + ' % off with code ' + cod + ' (valid 30 days).'});
      const num = whatsappDeTelefono(order.clienteTelefono);
      if(num) window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
      else { try{ navigator.clipboard.writeText(texto); }catch(e){} showToast(gl({es:'Código ' + cod + ' copiado: el cliente no tiene móvil para WhatsApp', ca:'Codi ' + cod + ' copiat: el client no té mòbil per a WhatsApp', en:'Code ' + cod + ' copied: the customer has no mobile for WhatsApp'})); }
    });
  }catch(e){ console.error(e); }
}

/* ───────── 13. AUTOPAUSA (#28) ─────────
   Con `pedidos.autopausaN` = N, al llegar a N pedidos para llevar/domicilio EN CURSO se pausan los dos canales 15 min (con aviso). La válvula de
   «cocina saturada» sin que nadie tenga que acordarse; el negocio la reanuda cuando quiera. */
function entEnCurso(){ return (DB.tpvOrders || []).filter(o => o && (o.tipo === 'takeaway' || o.tipo === 'delivery') && o.status === 'abierta' && o.entregaEstado !== 'entregado' && !(typeof esPedidoProgramadoLejano === 'function' && esPedidoProgramadoLejano(o))).length; }
function entAutopausaTick(){
  try{
    const n = parseInt(((DB.business && DB.business.pedidos) || {}).autopausaN) || 0; if(n <= 0) return;
    if(entCanalPausado('takeaway') && entCanalPausado('delivery')) return;
    if(entEnCurso() < n) return;
    const p = entPedidosCfg(), hasta = new Date(Date.now() + 15 * 60000).toISOString();
    if(!entCanalPausado('takeaway')) p.pausaTakeawayHasta = hasta;
    if(!entCanalPausado('delivery')) p.pausaDeliveryHasta = hasta;
    saveDB(); entProgramarCaducidad();
    logAudit('edit', gl({es:'Autopausa: ' + n + ' pedidos en curso, canales pausados 15 min', ca:'Autopausa: ' + n + ' comandes en curs, canals en pausa 15 min', en:'Auto-pause: ' + n + ' orders in progress, channels paused 15 min'}));
    showToast(gl({es:'Autopausa: hay ' + n + ' pedidos en curso. Pedidos pausados 15 min.', ca:'Autopausa: hi ha ' + n + ' comandes en curs. Comandes en pausa 15 min.', en:'Auto-pause: ' + n + ' orders in progress. Orders paused for 15 min.'}));
    if(typeof renderTPV === 'function' && document.querySelector('#view-tpv.active')) renderTPV();
  }catch(e){}
}
setInterval(entAutopausaTick, 20000);

/* ───────── 14. RELOJ DESAJUSTADO (#1) ─────────
   Todo lo que se promete se mide con el reloj de la tablet. Si va adelantada o atrasada, «a las 21:10» es mentira. Se compara con el reloj del
   servidor de Firebase (`.info/serverTimeOffset`, sin coste) y se avisa desde 3 min de diferencia. */
let entRelojOffsetMs = null;
function entComprobarReloj(){
  try{
    if(typeof firebase === 'undefined' || typeof getPublicMirrorApp !== 'function') return;
    getPublicMirrorApp().then(app => { if(!app) return; app.database().ref('.info/serverTimeOffset').once('value').then(sn => { entRelojOffsetMs = Number(sn.val()) || 0; entPintarAvisoReloj(); }).catch(() => {}); }).catch(() => {});
  }catch(e){}
}
function entPintarAvisoReloj(){
  const b = document.getElementById('ent-aviso-reloj'); if(!b) return;
  const min = Math.round(Math.abs(entRelojOffsetMs || 0) / 60000);
  b.hidden = min < 3; if(min >= 3) b.textContent = gl({es:'El reloj de este aparato va ' + min + ' min ' + (entRelojOffsetMs > 0 ? 'atrasado' : 'adelantado') + ': las horas prometidas saldrán mal. Corrígelo en los ajustes del aparato.', ca:'El rellotge d\'aquest aparell va ' + min + ' min ' + (entRelojOffsetMs > 0 ? 'endarrerit' : 'avançat') + ': les hores promeses sortiran malament. Corregeix-ho als ajustos de l\'aparell.', en:'This device\'s clock is ' + min + ' min ' + (entRelojOffsetMs > 0 ? 'behind' : 'ahead') + ': promised times will be wrong. Fix it in the device settings.'});
}
setInterval(entComprobarReloj, 30 * 60000); setTimeout(entComprobarReloj, 15000);

/* ───────── 15. FOTO DE ENTREGA «sin contacto» (#25) ─────────
   Solo en pedidos «déjalo en la puerta». Se reduce a 480 px y calidad .5 (~25 KB) y se guarda en el pedido y en su venta (la nube del propio
   negocio): sin servidor ni almacenamiento extra por licencia. */
function entFotoEntrega(orderId){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if(!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const o = DB.tpvOrders.find(x => x.id === orderId); URL.revokeObjectURL(url); if(!o) return;
      o.fotoEntrega = c.toDataURL('image/jpeg', 0.5); const sale = (DB.sales || []).find(x => x && x.id === orderId); if(sale) sale.fotoEntrega = o.fotoEntrega;
      saveDB(); showToast(gl({es:'Foto guardada', ca:'Foto desada', en:'Photo saved'})); if(document.getElementById('ent-rep-body')) entPintarRepartidor();
    };
    img.src = url;
  };
  inp.click();
}

/* ───────── 16. ORDEN DE COCINA PARA QUE TODO TERMINE A LA VEZ (#27) ─────────
   Con los minutos de la ficha técnica de cada plato (`ficha.pasosDet[].min`), se calcula a qué hora empezar cada uno para que el pedido
   termine junto. Es una ayuda: se enseña en la hoja del pedido y no mueve nada solo. */
function entMinutosPlato(linea){
  try{
    const plato = typeof findActiveDishByName === 'function' ? findActiveDishByName(linea.name) : null;
    const rid = (linea.recipeId != null ? linea.recipeId : (plato && plato.recipeId));
    const f = rid != null ? (DB.fichas || []).find(x => String(x.recipeId) === String(rid)) : null;
    return f && Array.isArray(f.pasosDet) ? f.pasosDet.reduce((s, x) => s + (parseInt(x && x.min) || 0), 0) : 0;
  }catch(e){ return 0; }
}
function entOrdenCocina(order){
  const v = ventanaPromesaPedido(order); if(!v) return null;
  const fin = new Date(v.desde).getTime(), lineas = (order.items || []).filter(l => !l.isShipping && !l.bebida).map(l => ({n: l.qty + '× ' + l.name, min: entMinutosPlato(l)})).filter(l => l.min > 0);
  if(lineas.length < 2) return null;
  return lineas.sort((a, b) => b.min - a.min).map(l => ({n: l.n, min: l.min, empezar: new Date(fin - l.min * 60000)}));
}
function entOrdenCocinaHtml(order){
  const o = entOrdenCocina(order); if(!o) return '';
  return `<div class="card ent-empaq"><h3 style="font-size:14px"><i class="ti ti-chef-hat"></i> ${escapeHtml(gl({es:'Orden de cocina', ca:'Ordre de cuina', en:'Kitchen order'}))}</h3><p class="txt-xs">${escapeHtml(gl({es:'Para que todo esté a la hora prometida, según los minutos de cada ficha técnica:', ca:'Perquè tot estigui a l\'hora promesa, segons els minuts de cada fitxa tècnica:', en:'So everything is ready at the promised time, from each recipe card\'s minutes:'}))}</p><ul class="tp-mini">${o.map(l => `<li><b>${entHoraCorta(l.empezar)}</b> ${escapeHtml(l.n)} <span class="txt-xs">(${l.min} min)</span></li>`).join('')}</ul></div>`;
}

/* ───────── 17. KIT DE CAPTACIÓN (#26) ─────────
   Enlaces con `?origen=` (Google, Instagram, WhatsApp, bolsa) para saber de dónde llega cada pedido, su QR y un flyer imprimible para meter en
   la bolsa de los pedidos de plataforma («la próxima vez, directo y sin comisión») con un código del primer pedido. */
const ENT_ORIGENES = [['google', 'Google'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['bolsa', gl({es:'Flyer en la bolsa', ca:'Flyer a la bossa', en:'Bag flyer'})]];
function entEnlaceOrigen(o){ const base = getPublicClientLink(); return base ? base + (base.includes('?') ? '&' : '?') + 'origen=' + o : ''; }
function entAbrirKit(){
  const p = (DB.business && DB.business.pedidos) || {}; const cod = (p.codigos || []).filter(c => !c.compensacion);
  openModal(`<div class="modal-header"><h3><i class="ti ti-share"></i> ${escapeHtml(gl({es:'Kit de captación', ca:'Kit de captació', en:'Acquisition kit'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <p class="pr-ayuda">${escapeHtml(gl({es:'Un enlace por canal: así ves de dónde llega cada pedido (queda en el pedido como «origen»). Para Google, pégalo en tu ficha como enlace de «Pedir» / «Comida por encargo».', ca:'Un enllaç per canal: així veus d\'on arriba cada comanda (queda a la comanda com a «origen»). Per a Google, enganxa\'l a la teva fitxa com a enllaç de «Demanar» / «Menjar per encàrrec».', en:'One link per channel: you see where each order comes from (it is stored on the order as «origin»). For Google, paste it in your listing as the «Order» / «Food pickup» link.'}))}</p>
      ${ENT_ORIGENES.map(([k, nom]) => { const url = entEnlaceOrigen(k); return `<div class="card" style="margin-bottom:8px"><b>${escapeHtml(nom)}</b><div class="txt-xs" style="word-break:break-all">${escapeHtml(url)}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="btn btn-sm btn-fino" onclick="navigator.clipboard.writeText('${escapeHtml(url)}');showToast('${escapeHtml(gl({es:'Enlace copiado', ca:'Enllaç copiat', en:'Link copied'}))}')"><i class="ti ti-copy"></i> ${escapeHtml(gl({es:'Copiar', ca:'Copiar', en:'Copy'}))}</button></div></div>`; }).join('')}
      <div class="field"><label>${escapeHtml(gl({es:'Código para el flyer de la bolsa', ca:'Codi per al flyer de la bossa', en:'Code for the bag flyer'}))}</label>
        <select id="ent-kit-cod"><option value="">${escapeHtml(gl({es:'(sin código)', ca:'(sense codi)', en:'(no code)'}))}</option>${cod.map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.codigo)} · ${c.pct ? c.pct + '%' : c.eur + '€'}</option>`).join('')}</select>
        <small style="color:var(--muted)">${escapeHtml(gl({es:'Créalos en Mi Negocio › Pedidos › Códigos promocionales.', ca:'Crea\'ls a Mi Negocio › Comandes › Codis promocionals.', en:'Create them in My Business › Orders › Promo codes.'}))}</small></div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="entImprimirFlyer()"><i class="ti ti-printer"></i> ${escapeHtml(gl({es:'Imprimir flyer para la bolsa', ca:'Imprimir flyer per a la bossa', en:'Print bag flyer'}))}</button></div>`);
}
function entImprimirFlyer(){
  const url = entEnlaceOrigen('bolsa'); const sel = document.getElementById('ent-kit-cod'); const cod = sel ? sel.value : '';
  const c = ((DB.business.pedidos || {}).codigos || []).find(x => x.codigo === cod);
  const dto = c ? (c.pct ? c.pct + ' %' : c.eur + ' €') : '';
  const nombre = (DB.business && DB.business.name) || '';
  const h = `<div style="font-family:sans-serif;text-align:center;padding:24px;border:3px solid #000;max-width:520px;margin:0 auto">
    <div style="font-size:28px;font-weight:800">${escapeHtml(nombre)}</div>
    <div style="font-size:22px;margin:14px 0">${escapeHtml(gl({es:'¿Te ha gustado? La próxima vez, pide directo.', ca:'T\'ha agradat? La propera vegada, demana directe.', en:'Enjoyed it? Next time, order direct.'}))}</div>
    <div style="font-size:16px">${escapeHtml(gl({es:'Sin comisiones de plataforma: mejor para ti y para nosotros.', ca:'Sense comissions de plataforma: millor per a tu i per a nosaltres.', en:'No platform fees: better for you and for us.'}))}</div>
    ${dto ? `<div style="font-size:26px;font-weight:800;border:2px dashed #000;margin:16px 0;padding:10px">${escapeHtml(dto)} ${escapeHtml(gl({es:'en tu primer pedido · código', ca:'a la teva primera comanda · codi', en:'off your first order · code'}))} ${escapeHtml(c.codigo)}</div>` : ''}
    <img src="${qrImagenUrl(url, 260)}" width="220" height="220" alt="QR"><div style="font-size:13px;margin-top:6px">${escapeHtml(url)}</div></div>`;
  printReportWindow(gl({es:'Flyer para la bolsa', ca:'Flyer per a la bossa', en:'Bag flyer'}), h);
}

/* ───────── 18. PANTALLA DE PEDIDOS LISTOS PARA EL LOCAL (14/11) ─────────
   Una tele o tablet junto al mostrador con «En preparación» y «Listos para recoger», solo con el número de pedido. Antes el enlace vivía dentro
   del «Kit de captación» (mal sitio: es de operación diaria, no de captación) y no tenía botones. */
function entEnlaceTablero(){ const b = getPublicClientLink(); return b ? b + (b.includes('?') ? '&' : '?') + 'listos=1' : ''; }
function entAbrirTablero(){
  const url = entEnlaceTablero();
  openModal(`<div class="modal-header"><h3><i class="ti ti-device-tv"></i> ${escapeHtml(gl({es:'Pantalla de pedidos listos', ca:'Pantalla de comandes llestes', en:'Ready-orders screen'}))}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <p class="pr-ayuda">${escapeHtml(gl({es:'Ábrela en una tele o tablet junto al mostrador. Enseña dos columnas, «En preparación» y «Listos para recoger», solo con el NÚMERO de pedido (el mismo que ve el cliente en su seguimiento y el que sale en cada pedido del TPV), nunca nombres ni teléfonos. Avisa de los que llevan 10 min o más sin recoger. Incluye los pedidos de la web y los que tomas por teléfono; no los de plataformas externas.', ca:'Obre-la en una tele o tauleta al costat del taulell. Mostra dues columnes, «En preparació» i «Llestos per recollir», només amb el NÚMERO de comanda (el mateix que veu el client al seu seguiment i el que surt a cada comanda del TPV), mai noms ni telèfons. Avisa dels que porten 10 min o més sense recollir. Inclou les comandes del web i les que prens per telèfon; no les de plataformes externes.', en:'Open it on a TV or tablet by the counter. It shows two columns, "Being prepared" and "Ready for pickup", with the order NUMBER only (the same the customer sees in their tracking and shown on each POS order), never names or phones. It flags orders waiting 10+ min. It includes web orders and the ones you take by phone; not external platforms.'}))}</p>
      <div class="card" style="word-break:break-all;font-size:13px">${escapeHtml(url)}</div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="navigator.clipboard.writeText('${escapeHtml(url)}');showToast('${escapeHtml(gl({es:'Enlace copiado', ca:'Enllaç copiat', en:'Link copied'}))}')"><i class="ti ti-copy"></i> ${escapeHtml(gl({es:'Copiar enlace', ca:'Copiar enllaç', en:'Copy link'}))}</button>
      <a class="btn btn-primary" href="${escapeHtml(url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> ${escapeHtml(gl({es:'Abrir pantalla', ca:'Obrir pantalla', en:'Open screen'}))}</a>
    </div>`);
}
// Token propio para un pedido tomado por teléfono (mismo formato que el de la web: 12+ caracteres, ver reglas de orderStatus).
function entNuevoToken(){ return Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(36).padStart(2, '0')).join(''); }
