/* ============================================================
   PEDIDO EN GRUPO EN LA MESA (27/11) — la parte de la app del negocio.
   Diseño y decisiones: docs/PEDIDO-EN-GRUPO-DISENO.md y docs/PEDIDO-EN-GRUPO-ESTADO.md.

   Qué es: varios comensales de una mesa piden cada uno desde su móvil (QR de mesa) sobre UNA cuenta, y cada uno paga SUS líneas con tarjeta
   (Stripe) sin que el camarero tenga que dividir nada. Solo mesa; nada de para llevar ni delivery.

   Las reglas de la casa que lo gobiernan (no negociables):
   · El estado compartido (`mesaGrupo/{token}`, en la nube DEL NEGOCIO) son BORRADORES sin un solo precio: solo sirven para que los comensales
     se vean entre ellos. Ni cocina ni la cuenta los leen. Lo que entra a cocina y a la cuenta sigue entrando por el buzón `pedido_mesa`, con los
     precios recalculados con la carta del negocio (revisarPreciosPedidoPublico), como cualquier pedido por QR.
   · Quién es cada comensal lo dice SU sesión anónima de Firebase (`uid`), no un nombre: las reglas dejan escribir un hueco solo a su `uid` y las
     solicitudes llevan `uid` y `slot` EN CLARO; aquí se comprueba (grupoVerificarSolicitud) que ese `uid` es el dueño de ese hueco. Sin cuentas.
   · El dinero lo decide esta app: cuánto debe cada uno lo calcula grupoCuenta() y lo publica; el pago solo cuenta lo que confirma Stripe
     (comprobarPagosTarjeta), con tope en lo que ese comensal debe; lo que sobre va a «Pagos sin pedido», nunca a propina por su cuenta.
   · En modo grupo la mesa NO se cierra sola al cubrir lo pedido (Ana paga lo suyo y Bruno aún no ha pedido): la cierra el camarero.
   · Un negocio SIN las reglas nuevas, o sin su nube propia, o con el QR apagado, NO ofrece el grupo: todo sigue como pedido normal.
   · Cero coste por licencia: todo vive en la nube del propio negocio y en su cuenta de Stripe. La app no abre ningún oyente nuevo (lee los
     huecos puntualmente con once('value')).
   ============================================================ */

// null = sin comprobar · true = la nube del negocio acepta el grupo · false = le faltan las reglas nuevas.
let reglasGrupo = null;
let reglasGrupoFallo = null;
const GRUPO_SLOT_RE = /^m([0-9]|1[01])$/;
const GRUPO_MAX = 12;

function grupoMesaConfig(){
  const q = (DB && DB.business && DB.business.qrMesa) || {};
  const max = Math.max(2, Math.min(GRUPO_MAX, parseInt(q.grupoMax) || GRUPO_MAX));
  // 5 € por defecto: cada pago lleva una parte fija de comisión (≈ 0,25 €) y los pagos muy pequeños se la comen. 0 = sin mínimo.
  const min = q.grupoMinPago === undefined || q.grupoMinPago === '' || q.grupoMinPago === null ? 5 : Math.max(0, Math.min(100, Number(q.grupoMinPago) || 0));
  return {activo: q.grupo === true, max, minPago: min};
}
/* ¿Se ofrece el grupo ahora mismo? Las cuatro cosas a la vez: el QR de mesa activo, la casilla del grupo, el espejo en la nube PROPIA del negocio
   (en la plataforma compartida de respaldo cargaría de sockets un proyecto de todos) y la sonda que ha ESCRITO de prueba en `mesaGrupo` y ha pasado. */
function grupoMesaDisponible(){
  return qrMesaConfig().activo && grupoMesaConfig().activo && espejoEnNubePropia === true && reglasGrupo === true;
}

/* La sonda de las reglas del grupo, como la de comprobarEspejoEnNubePropia: se comprueba ESCRIBIENDO. Un permiso denegado con sesión = «faltan las
   reglas nuevas» (se avisa aparte, sin dar por «antiguas» las reglas de quien solo no usa el grupo); un corte de red no es un veredicto. */
async function comprobarReglasGrupo(){
  if(!grupoMesaConfig().activo || !qrMesaConfig().activo){ reglasGrupo = null; return null; }
  const cfg = (typeof getCloudConfig === 'function') ? getCloudConfig() : null;
  const publicId = getPublicId();
  if(!cfg || !cfg.apiKey || !cfg.databaseURL || !publicId || espejoEnNubePropia !== true){ reglasGrupo = null; return null; }
  let app; try{ app = firebase.app(); }catch(e){ return null; }
  if(!app || !(await ggEsperarSesionNegocio(app, 20000))) return null;
  const base = app.database().ref('gastrogoan/public/' + publicId);
  const uid = app.auth().currentUser && app.auth().currentUser.uid;
  const tok = ('_sondag_' + getOrCreateDeviceId()).padEnd(16, '_').slice(0, 60);
  let paso = 'mesaGrupo (pedido en grupo)';
  try{
    await base.child('mesaQr/' + tok).set({mesa: '_prueba', updatedAt: Date.now(), grupo: true});
    await base.child('mesaGrupo/' + tok + '/miembros/m0').set({uid, n: '_', ts: Date.now()});
    await base.child('mesaGrupo/' + tok + '/carritos/m0/l0').set({p: '_', q: 1});
    paso = 'requests (pedido con uid y hueco)';
    const sr = base.child('requests/_sondagrupo_' + getOrCreateDeviceId());
    await ggLimpiarSondaRequest(sr);
    await sr.set({type: 'pedido_mesa', createdAt: Date.now(), _sonda: true, uid, slot: 'm0'});
    await sr.child('_claimedAt').set(Date.now());
    await sr.remove();
    reglasGrupo = true; reglasGrupoFallo = null;
  }catch(e){
    if(!ggEsPermisoDenegado(e)){ console.warn('No se pudo comprobar las reglas del grupo (no es un permiso denegado)', e && e.message); return null; }
    reglasGrupo = false; reglasGrupoFallo = {paso, msg: String((e && e.message) || e)};
  }
  // La limpieza: primero el nodo de la mesa (sin él ya no hay «grupo activo») y luego el del grupo, que es lo que las reglas permiten borrar.
  try{ await base.child('mesaQr/' + tok).remove(); }catch(_){}
  try{ await base.child('mesaGrupo/' + tok).remove(); }catch(_){}
  try{ await ggLimpiarSondaRequest(base.child('requests/_sondagrupo_' + getOrCreateDeviceId())); }catch(_){}
  if(typeof renderMiNegocio === 'function' && document.getElementById('mn-card-qr-mesa')) renderMiNegocio();
  return reglasGrupo;
}

/* ── Verificar quién es el comensal ────────────────────────────────────────────────────────────────────────────────────────────────── */
// Pone `req._gv = {slot, n}` SOLO si el `uid` de la solicitud es el dueño de ese hueco en la nube. Todo lo que traiga el navegador con ese nombre se
// borra antes. Quien reclama un hueco que no es suyo, o uno expulsado, o con el grupo apagado, se queda sin `_gv` y su pedido se trata como el de un
// desconocido (pendiente para el camarero) y su pago como un pago sin pedido.
async function grupoVerificarSolicitud(req){
  delete req._gv;
  const slot = req.slot, uid = req.uid;
  if(!slot) return false;
  if(typeof slot !== 'string' || !GRUPO_SLOT_RE.test(slot) || typeof uid !== 'string' || !uid || uid.length > 128) return false;
  if(!grupoMesaDisponible()) return false;
  const tbl = mesaPorTokenQr(req.mesaToken);
  if(!tbl || Number(slot.slice(1)) >= grupoMesaConfig().max) return false;
  if(tbl.grupo && tbl.grupo.expulsados && (tbl.grupo.expulsados[slot] || Object.values(tbl.grupo.expulsados).includes(uid))) return false;
  const publicId = getPublicId();
  let m = null;
  for(let i = 0; i < 2 && !m; i++){
    try{
      const app = await getPublicMirrorApp();
      const snap = await app.database().ref('gastrogoan/public/' + publicId + '/mesaGrupo/' + req.mesaToken + '/miembros/' + slot).once('value');
      m = snap.val();
    }catch(e){ console.warn('No se pudo leer el hueco del grupo', e && e.message); }
  }
  if(!m || m.uid !== uid) return false;
  const n = String(m.n || '').slice(0, 30);
  if(!tbl.grupo) tbl.grupo = {sesion: Date.now(), comensales: {}, expulsados: {}};
  if(!tbl.grupo.comensales) tbl.grupo.comensales = {};
  tbl.grupo.comensales[slot] = {n, uid, ts: Date.now()};
  req._gv = {slot, n};
  return true;
}

/* ── La cuenta de cada comensal ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
// Reparte `totalCent` (céntimos enteros) en proporción a `pesos` por el método del mayor resto: la suma de las partes es EXACTAMENTE el total.
// Los céntimos que sobran van a quien tenga más resto y, a igualdad, al primero (orden estable por hueco).
function grupoRepartir(totalCent, pesos){
  const suma = pesos.reduce((a, b) => a + b, 0);
  if(!(suma > 0) || !(totalCent > 0)) return pesos.map(() => 0);
  const exacto = pesos.map(p => totalCent * p / suma);
  const base = exacto.map(Math.floor);
  let sobran = totalCent - base.reduce((a, b) => a + b, 0);
  const orden = exacto.map((x, i) => ({i, f: Math.round((x - Math.floor(x)) * 1e6)})).sort((a, b) => b.f - a.f || a.i - b.i);
  for(let k = 0; k < orden.length && sobran > 0; k++, sobran--) base[orden[k].i]++;
  return base;
}
const grupoNumSlot = s => parseInt(String(s).slice(1)) || 0;
const grupoCent = x => Math.round((Number(x) || 0) * 100);
/* Lo que debe cada comensal, con lo que hay en la comanda. Una línea es de quien la pidió (`comensal`) y, si se comparte (`reparto`, 2 o más
   huecos), se parte a partes iguales entre ellos. Las líneas SIN dueño (las del camarero) no se reparten: las cobra el camarero en caja.
   El descuento de la mesa se aplica a cada parte en proporción y se vuelve a cuadrar al céntimo. */
function grupoCuenta(order){
  const suyo = {};
  let resto = 0;
  (order.items || []).forEach(l => {
    const imp = grupoCent((Number(l.price) || 0) * (Number(l.qty) || 0));
    let rep = Array.isArray(l.reparto) && l.reparto.length > 1 ? l.reparto : (l.comensal ? [l.comensal] : []);
    rep = [...new Set(rep.filter(s => typeof s === 'string' && GRUPO_SLOT_RE.test(s)))].sort((a, b) => grupoNumSlot(a) - grupoNumSlot(b));
    if(!rep.length){ resto += imp; return; }
    const partes = grupoRepartir(imp, rep.map(() => 1));
    rep.forEach((s, i) => { suyo[s] = (suyo[s] || 0) + partes[i]; });
  });
  const desc = Number(order.descuentoPct) || 0;
  if(desc > 0){
    const slots = Object.keys(suyo).sort((a, b) => grupoNumSlot(a) - grupoNumSlot(b));
    const pesos = slots.map(s => suyo[s]).concat([resto]);
    const total = pesos.reduce((a, b) => a + b, 0);
    const conDesc = grupoRepartir(Math.round(total * (1 - desc / 100)), pesos);
    slots.forEach((s, i) => { suyo[s] = conDesc[i]; });
    resto = conDesc[slots.length];
  }
  const pagado = {}, enCurso = {};
  const sumar = (m, s, c) => { if(s && GRUPO_SLOT_RE.test(s)) m[s] = (m[s] || 0) + c; };
  (order.pagosMesaQr || []).forEach(p => { if(p && p.slot) sumar(pagado, p.slot, grupoCent(p.importe)); });
  // Lo cobrado al pedir (la línea nace pagada): es de quien la pidió. Una línea compartida no se cobra al pedir, así que no puede estar aquí.
  (order.items || []).forEach(l => { if(l.pagadoOnline && l.comensal && !(Array.isArray(l.reparto) && l.reparto.length > 1)) sumar(pagado, l.comensal, grupoCent((Number(l.price) || 0) * (Number(l.qty) || 0))); });
  (order.pagosMesaQrPendientes || []).forEach(p => { if(p && p.slot) sumar(enCurso, p.slot, grupoCent(p.importe)); });
  const slots = {};
  new Set([...Object.keys(suyo), ...Object.keys(pagado), ...Object.keys(enCurso)]).forEach(s => {
    const su = suyo[s] || 0, pa = pagado[s] || 0;
    slots[s] = {suyo: su / 100, pagado: pa / 100, debe: Math.max(0, su - pa) / 100, enCurso: (enCurso[s] || 0) / 100};
  });
  return {slots, resto: resto / 100};
}

/* Lo que se añade al nodo público de la mesa (`mesaQr/{token}`): que el grupo está disponible, sus topes, quién está expulsado y lo que debe y
   lleva pagado cada hueco. Solo importes que calcula esta app: los móviles los LEEN, nunca los calculan. */
function grupoPublicaMesa(tbl, order){
  if(!grupoMesaDisponible()) return {};
  const cfg = grupoMesaConfig();
  const out = {grupo: true, grupoMax: cfg.max, grupoMin: cfg.minPago};
  const exp = tbl.grupo && tbl.grupo.expulsados;
  if(exp && Object.keys(exp).length) out.expulsados = Object.assign({}, exp);
  if(order && (order.items || []).length){
    const c = grupoCuenta(order), com = {};
    Object.keys(c.slots).forEach(s => { com[s] = {debe: c.slots[s].debe, pagado: c.slots[s].pagado, enCurso: c.slots[s].enCurso}; });
    if(Object.keys(com).length) out.comensales = com;
  }
  return out;
}

/* ── Vida de un grupo: limpiar cuando se cierra la mesa ──────────────────────────────────────────────────────────────────────────── */
// El token de una mesa es el mismo para siempre: sin limpiar, la siguiente cuadrilla vería los fantasmas de la anterior. Se limpia cuando la mesa
// que tuvo pedidos de grupo ya no tiene comanda abierta, cuando el grupo se apaga, o si nadie pidió nada en 12 h.
// Orden obligado por las reglas: `mesaGrupo/{token}` solo se puede borrar cuando `mesaQr/{token}/grupo` ya no es true.
async function grupoLimpiarToken(app, publicId, tok){
  const raiz = app.database().ref('gastrogoan/public/' + publicId);
  try{ await raiz.child('mesaQr/' + tok + '/grupo').set(false); }catch(e){ /* la mesa ya no existe: se borra igual */ }
  try{ await raiz.child('mesaGrupo/' + tok).remove(); }catch(e){ console.warn('No se pudo limpiar el grupo de la mesa', e && e.message); }
  delete mesaQrPublicado[tok];   // lo siguiente que se publique vuelve a escribir la mesa entera
}
let grupoRepublicarT = null;
function grupoMantenerMesa(tbl, espejoApp, publicId){
  if(!tbl || !tbl.grupo) return false;
  const order = typeof getOpenOrderForTable === 'function' ? getOpenOrderForTable(tbl.id) : null;
  if(order && order.grupo) tbl.grupo.conPedido = true;
  const caducado = !order && Date.now() - (tbl.grupo.sesion || 0) > 12 * 3600 * 1000;
  const cerrada = !order && tbl.grupo.conPedido === true;
  // «Apagado» es una decisión del negocio (casilla o QR), no un «todavía no sé»: mientras la sonda no ha contestado no se toca nada.
  const apagado = !grupoMesaConfig().activo || !qrMesaConfig().activo;
  if(!(cerrada || caducado || apagado)) return false;
  delete tbl.grupo;
  const tokens = [tbl.qrToken].concat(Array.isArray(tbl.qrAlias) ? tbl.qrAlias : []).filter(x => typeof x === 'string' && x.length >= 16);
  Promise.all(tokens.map(tok => grupoLimpiarToken(espejoApp, publicId, tok))).then(() => {
    clearTimeout(grupoRepublicarT);
    grupoRepublicarT = setTimeout(() => { if(typeof syncPublicMirror === 'function') syncPublicMirror(); }, 300);
  });
  if(typeof saveDB === 'function') saveDB();
  return true;
}

/* ── El camarero ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function grupoNombreDe(tbl, slot){
  const c = tbl && tbl.grupo && tbl.grupo.comensales && tbl.grupo.comensales[slot];
  return (c && c.n) || slot.toUpperCase();
}
function grupoPanelHtml(order){
  if(!order || !order.grupo || !order.tableId) return '';
  const tbl = (DB.tables || []).find(x => x.id === order.tableId);
  if(!tbl) return '';
  const c = grupoCuenta(order);
  const slots = [...new Set([...Object.keys(c.slots), ...Object.keys((tbl.grupo && tbl.grupo.comensales) || {})])].sort((a, b) => grupoNumSlot(a) - grupoNumSlot(b));
  const cu = cuentaMesaQr(order);
  const filas = slots.map(s => {
    const x = c.slots[s] || {suyo: 0, pagado: 0, debe: 0, enCurso: 0};
    const fuera = tbl.grupo && tbl.grupo.expulsados && tbl.grupo.expulsados[s];
    const estado = fuera ? gl({es:'Expulsado', ca:'Expulsat', en:'Removed'})
      : (x.enCurso > 0 ? gl({es:'Pagando…', ca:'Pagant…', en:'Paying…'})
      : (x.debe > 0.009 ? gl({es:'Debe ' + fmtMoney(x.debe), ca:'Deu ' + fmtMoney(x.debe), en:'Owes ' + fmtMoney(x.debe)})
      : (x.suyo > 0 ? gl({es:'Al día', ca:'Al dia', en:'Settled'}) : gl({es:'Sin pedir', ca:'Sense demanar', en:'No order yet'}))));
    const ok = !fuera && x.suyo > 0 && x.debe <= 0.009 && !(x.enCurso > 0);
    return `<div class="gr-fila" data-slot="${escapeHtml(s)}">
      <span class="gr-nom">${escapeHtml(grupoNombreDe(tbl, s))}</span>
      <span class="gr-cifras">${x.suyo > 0 ? escapeHtml(gl({es:'Pidió', ca:'Va demanar', en:'Ordered'})) + ' ' + fmtMoney(x.suyo) + ' · ' + escapeHtml(gl({es:'pagó', ca:'va pagar', en:'paid'})) + ' ' + fmtMoney(x.pagado) : ''}</span>
      <span class="gr-est ${ok ? 'is-ok' : (x.debe > 0.009 ? 'is-debe' : '')}">${ok ? '<i class="ti ti-check"></i> ' : ''}${escapeHtml(estado)}</span>
      ${fuera ? '' : `<button type="button" class="btn btn-sm btn-fino is-off gr-exp owner-only" onclick="grupoExpulsar(${JSON.stringify(tbl.id)}, '${s}')" aria-label="${escapeHtml(gl({es:'Expulsar a ', ca:'Expulsar a ', en:'Remove '}) + grupoNombreDe(tbl, s))}">${escapeHtml(gl({es:'Expulsar', ca:'Expulsar', en:'Remove'}))}</button>`}
    </div>`;
  }).join('');
  const sinDuenyo = c.resto > 0.009 ? `<p class="gr-nota">${escapeHtml(gl({es:'Sin comensal (lo cobra el camarero): ' + fmtMoney(c.resto), ca:'Sense comensal (ho cobra el cambrer): ' + fmtMoney(c.resto), en:'No diner (the waiter collects it): ' + fmtMoney(c.resto)}))}</p>` : '';
  const cierre = cu.pendiente <= 0.01
    ? `<button type="button" class="btn btn-fino is-on gr-cerrar" onclick="grupoCerrarMesa(${order.id})"><i class="ti ti-check"></i> ${escapeHtml(gl({es:'Cerrar mesa (todo pagado)', ca:'Tancar taula (tot pagat)', en:'Close table (all paid)'}))}</button>`
    : `<p class="gr-nota">${escapeHtml(gl({es:'Falta por cobrar ' + fmtMoney(cu.pendiente) + ': la mesa sigue abierta.', ca:'Falta per cobrar ' + fmtMoney(cu.pendiente) + ': la taula continua oberta.', en:fmtMoney(cu.pendiente) + ' still to collect: the table stays open.'}))}</p>`;
  return `<section class="gr-panel" id="gr-panel" aria-label="${escapeHtml(gl({es:'Pedido en grupo', ca:'Comanda en grup', en:'Group order'}))}">
    <div class="gr-cab"><b><i class="ti ti-users"></i> ${escapeHtml(gl({es:'Grupo de la mesa', ca:'Grup de la taula', en:'Table group'}))}</b>
      <button type="button" class="btn btn-sm btn-fino" onclick="grupoRefrescarMiembros(${JSON.stringify(tbl.id)}, ${order.id})">${escapeHtml(gl({es:'Actualizar', ca:'Actualitzar', en:'Refresh'}))}</button></div>
    ${filas || ''}${sinDuenyo}${cierre}
  </section>`;
}
// Lee UNA vez quién hay en el grupo (puede haber gente que se ha unido y aún no ha pedido) y repinta. No deja ningún oyente puesto.
async function grupoRefrescarMiembros(tableId, orderId){
  const tbl = (DB.tables || []).find(x => x.id === tableId);
  if(!tbl || !tbl.qrToken) return;
  try{
    const app = await getPublicMirrorApp();
    const snap = await app.database().ref('gastrogoan/public/' + getPublicId() + '/mesaGrupo/' + tbl.qrToken + '/miembros').once('value');
    const m = snap.val() || {};
    if(!tbl.grupo) tbl.grupo = {sesion: Date.now(), comensales: {}, expulsados: {}};
    if(!tbl.grupo.comensales) tbl.grupo.comensales = {};
    Object.keys(m).forEach(s => { if(GRUPO_SLOT_RE.test(s) && m[s] && m[s].uid) tbl.grupo.comensales[s] = {n: String(m[s].n || '').slice(0, 30), uid: m[s].uid, ts: m[s].ts || Date.now()}; });
    saveDB();
  }catch(e){ showToast(gl({es:'No se ha podido leer el grupo ahora mismo', ca:'No s\'ha pogut llegir el grup ara mateix', en:'Could not read the group right now'})); }
  if(typeof renderTableOrderModal === 'function' && document.getElementById('gr-panel')) renderTableOrderModal(orderId);
}
function grupoExpulsar(tableId, slot){
  if(typeof puedeCancelar === 'function' && !puedeCancelar()) return;
  const tbl = (DB.tables || []).find(x => x.id === tableId);
  if(!tbl || !GRUPO_SLOT_RE.test(slot)) return;
  if(!tbl.grupo) tbl.grupo = {sesion: Date.now(), comensales: {}, expulsados: {}};
  if(!tbl.grupo.expulsados) tbl.grupo.expulsados = {};
  // Se guarda el uid del expulsado (opaco): así la web le impide reclamar OTRO hueco con la misma sesión, y la app rechaza sus pedidos y pagos.
  tbl.grupo.expulsados[slot] = (tbl.grupo.comensales && tbl.grupo.comensales[slot] && tbl.grupo.comensales[slot].uid) || true;
  if(typeof logAudit === 'function') logAudit('edit', gl({es:'Grupo de mesa: se expulsa a ' + grupoNombreDe(tbl, slot) + ' (' + (tbl.name || '') + ')', ca:'Grup de taula: s\'expulsa ' + grupoNombreDe(tbl, slot) + ' (' + (tbl.name || '') + ')', en:'Table group: ' + grupoNombreDe(tbl, slot) + ' removed (' + (tbl.name || '') + ')'}));
  saveDB();
  if(typeof syncPublicMirror === 'function') syncPublicMirror();
  const o = typeof getOpenOrderForTable === 'function' ? getOpenOrderForTable(tableId) : null;
  if(o && typeof renderTableOrderModal === 'function' && document.getElementById('gr-panel')) renderTableOrderModal(o.id);
  showToast(gl({es:'Comensal expulsado. Lo que ya pidió o pagó se mantiene en la cuenta.', ca:'Comensal expulsat. El que ja va demanar o pagar es manté al compte.', en:'Diner removed. What they already ordered or paid stays on the bill.'}));
}
// Con todo cobrado, la mesa se cierra como una venta normal (ticket numerado, método «Online»). Solo el camarero decide cuándo.
function grupoCerrarMesa(orderId){
  const order = (DB.tpvOrders || []).find(o => o && o.id === orderId);
  if(!order) return;
  if(cuentaMesaQr(order).pendiente > 0.01){ showToast(gl({es:'Todavía falta por cobrar: no se puede cerrar', ca:'Encara falta per cobrar: no es pot tancar', en:'There is still something to collect: it cannot be closed'})); return; }
  const sale = cerrarMesaPagadaQr(order);
  if(!sale){ showToast(gl({es:'Para cerrar la mesa, cierra primero la ventana de cobro y vuelve a pulsar', ca:'Per tancar la taula, tanca primer la finestra de cobrament i torna a prémer', en:'To close the table, close the payment window first and press again'})); return; }
  closeModal();
  saveDB();
  if(typeof renderTPV === 'function' && document.getElementById('tpv-content')) renderTPV();
}

/* ── Mi Negocio ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function grupoMiNegocioHtml(){
  const g = grupoMesaConfig(), q = qrMesaConfig();
  if(!q.activo) return '';
  const nubePropia = espejoEnNubePropia === true;
  let estado = '';
  if(g.activo){
    if(espejoEnNubePropia === false) estado = `<p class="txt-xs gr-estado is-aviso"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es:'El pedido en grupo solo funciona con la nube propia del negocio y las reglas al día. Actualiza tus reglas.', ca:'La comanda en grup només funciona amb el núvol propi del negoci i les regles al dia. Actualitza les teves regles.', en:'Group ordering only works with the business\'s own cloud and up-to-date rules. Update your rules.'}))}</p>`;
    else if(reglasGrupo === false) estado = `<p class="txt-xs gr-estado is-aviso"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es:'Esto necesita un paso más en tu Firebase (2 minutos): actualizar las reglas.', ca:'Això necessita un pas més al teu Firebase (2 minuts): actualitzar les regles.', en:'This needs one more step in your Firebase (2 minutes): update the rules.'}))}</p><button type="button" class="btn btn-sm btn-fino" style="min-height:44px" onclick="abrirAsistenteReglas()">${escapeHtml(gl({es:'Actualizar mis reglas', ca:'Actualitzar les meves regles', en:'Update my rules'}))}</button>${reglasGrupoFallo ? `<p class="txt-xs" style="color:var(--muted);margin:4px 0 0">${escapeHtml(reglasGrupoFallo.paso)}</p>` : ''}`;
    else if(reglasGrupo === true) estado = `<p class="txt-xs gr-estado is-ok"><i class="ti ti-circle-check"></i> ${escapeHtml(gl({es:'Listo: tus clientes ya pueden pedir en grupo desde el QR de la mesa.', ca:'A punt: els teus clients ja poden demanar en grup des del QR de la taula.', en:'Ready: your guests can now order as a group from the table QR.'}))}</p>`;
    else estado = `<p class="txt-xs gr-estado"><i class="ti ti-loader"></i> ${escapeHtml(gl({es:'Comprobando las reglas de tu nube…', ca:'Comprovant les regles del teu núvol…', en:'Checking your cloud rules…'}))}</p><button type="button" class="btn btn-sm btn-fino" style="min-height:44px" onclick="comprobarReglasGrupo()">${escapeHtml(gl({es:'Comprobar ahora', ca:'Comprovar ara', en:'Check now'}))}</button>`;
  }
  return `
    <fieldset class="mn-grupo" id="mn-grupo" style="border:0;padding:10px 0 0;margin:10px 0 0;border-top:1px solid var(--border)">
      <legend style="font-weight:700;padding:0;margin-bottom:4px">${escapeHtml(gl({es:'Pedido en grupo', ca:'Comanda en grup', en:'Group ordering'}))}</legend>
      <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;min-height:44px">
        <input type="checkbox" id="mn-grupo-activo" style="width:auto;margin-top:3px" ${g.activo ? 'checked' : ''} onchange="saveGrupoConfig()">
        <span>${escapeHtml(gl({es:'Varios comensales piden desde su móvil sobre la misma mesa y cada uno paga lo suyo', ca:'Diversos comensals demanen des del seu mòbil sobre la mateixa taula i cadascú paga el seu', en:'Several guests order from their phones on the same table and each pays their own'}))}</span>
      </label>
      <p class="txt-xs" style="color:var(--muted);margin:2px 0 6px">${escapeHtml(gl({es:'Apagado por defecto. Cada pago es un cobro de Stripe con su comisión (parte fija incluida): dividir una cuenta entre varios cuesta algo más que cobrarla de una vez. Es de tu cuenta de Stripe; a GastroGoan no le cuesta nada. No se cierra la mesa sola: la cierras tú cuando está todo pagado.', ca:'Apagat per defecte. Cada pagament és un cobrament de Stripe amb la seva comissió (part fixa inclosa): dividir un compte entre diversos costa una mica més que cobrar-lo d\'una vegada. És del teu compte de Stripe; a GastroGoan no li costa res. No es tanca la taula sola: la tanques tu quan tot és pagat.', en:'Off by default. Each payment is a Stripe charge with its own fee (fixed part included): splitting a bill between several guests costs a little more than one charge. It comes out of your Stripe account; it costs GastroGoan nothing. The table does not close by itself: you close it once everything is paid.'}))}</p>
      ${g.activo ? `<div style="display:flex;flex-wrap:wrap;gap:12px">
        <div class="field" style="margin:0;min-width:140px;flex:1"><label for="mn-grupo-min">${escapeHtml(gl({es:'Importe mínimo por pago (€)', ca:'Import mínim per pagament (€)', en:'Minimum per payment (€)'}))}</label><input type="number" id="mn-grupo-min" min="0" max="100" step="0.5" inputmode="decimal" value="${g.minPago}" onchange="saveGrupoConfig()"></div>
        <div class="field" style="margin:0;min-width:140px;flex:1"><label for="mn-grupo-max">${escapeHtml(gl({es:'Comensales por mesa (máx.)', ca:'Comensals per taula (màx.)', en:'Diners per table (max.)'}))}</label><input type="number" id="mn-grupo-max" min="2" max="12" step="1" inputmode="numeric" value="${g.max}" onchange="saveGrupoConfig()"></div>
      </div>
      <p class="txt-xs" style="color:var(--muted);margin:6px 0 0">${escapeHtml(gl({es:'Tu plan gratuito de Firebase aguanta unas 100 conexiones a la vez: cada móvil conectado cuenta una. Se desconectan solos a los 3 minutos sin tocar la pantalla.', ca:'El teu pla gratuït de Firebase aguanta unes 100 connexions alhora: cada mòbil connectat en compta una. Es desconnecten sols als 3 minuts sense tocar la pantalla.', en:'Your free Firebase plan handles about 100 simultaneous connections: each connected phone counts as one. They disconnect by themselves after 3 minutes without touching the screen.'}))}</p>` : ''}
      ${estado}
    </fieldset>`;
}
function saveGrupoConfig(){
  if(!DB.business.qrMesa) DB.business.qrMesa = {};
  const antes = grupoMesaConfig();
  const chk = document.getElementById('mn-grupo-activo'), mn = document.getElementById('mn-grupo-min'), mx = document.getElementById('mn-grupo-max');
  const q = DB.business.qrMesa;
  q.grupo = chk ? chk.checked : antes.activo;
  if(mn) q.grupoMinPago = Math.max(0, Math.min(100, Number(String(mn.value).replace(',', '.')) || 0));
  if(mx) q.grupoMax = Math.max(2, Math.min(GRUPO_MAX, parseInt(mx.value) || GRUPO_MAX));
  reglasGrupo = q.grupo ? reglasGrupo : null;
  saveDB();
  if(q.grupo && !antes.activo) comprobarReglasGrupo().then(() => { if(typeof syncPublicMirror === 'function') syncPublicMirror(); });
  else if(typeof syncPublicMirror === 'function') syncPublicMirror();
  if(typeof renderMiNegocio === 'function') renderMiNegocio();
}
