/* ============================================================
   ARQUEO DE CAJA — Cierre de turno/día
   ============================================================ */
function fmtDateTime(d){
  return d.toLocaleString(localeActual(), {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
}

// ¿Ya pasó hoy la hora de cierre configurada del negocio? Sirve para avisar
// de un cierre de caja pendiente solo cuando tiene sentido — con el negocio
// todavía abierto no hay nada real que cuadrar todavía. Mismo patrón de
// lectura del horario que renderLastCallBanner() en TPV.
function isPastTodayClosingTime(){
  try{
    const horarioHoy = (DB.business.horario||[])[new Date().getDay()===0?6:new Date().getDay()-1];
    if(!horarioHoy || horarioHoy.abierto===false) return false;
    const tramos = horarioHoy.modo==='seguido' ? [horarioHoy.seguido] : (horarioHoy.turnos||[]);
    const toMin = hhmm => { const [h,m] = (hhmm||'').split(':').map(Number); return isNaN(h)?null:h*60+(m||0); };
    const now = new Date();
    const nowMin = now.getHours()*60+now.getMinutes();
    const fins = tramos.map(tr => toMin(tr && tr.fin)).filter(f => f!=null);
    if(!fins.length) return false;
    return nowMin > Math.max(...fins);
  }catch(e){ return false; }
}

function getCashClosurePeriod(){
  const today = todayStr();
  const todaysClosures = DB.cashClosures.filter(c => c.fecha === today).sort((a,b)=> new Date(a.hasta) - new Date(b.hasta));
  const last = todaysClosures[todaysClosures.length-1] || null;
  const desde = last ? new Date(last.hasta) : new Date(today+'T00:00:00');
  const hasta = new Date();
  return {desde, hasta, lastClosure: last};
}

function getSalesForClosure(){
  /* Por marca de cierre (sale.cierreId), no por ventana de tiempo — ver el
     porqué en performCashClosure, justo donde se pone la marca. Una venta de
     hoy sin cierre asignado entra siempre, sin importar su hora exacta: así
     una que llega tarde por sincronización no se pierde entre dos cierres. */
  const today = todayStr();
  return DB.sales.filter(s => {
    if(s.status === 'anulada') return false;
    if(s.date !== today) return false;
    return !s.cierreId;
  });
}

// Descuentos autorizados (responsable + motivo) durante el periodo de este
// cierre, para que el arqueo muestre quién dio cada descuento, cuánto y por
// qué (los importes/porcentajes negativos son descuentos revertidos antes de cobrar).
function getDiscountsForClosure(){
  const {desde, hasta, lastClosure} = getCashClosurePeriod();
  const today = todayStr();
  return (DB.discountLog||[]).filter(d => {
    if(d.fecha !== today) return false;
    if(!d.createdAt) return !lastClosure;
    const dt = new Date(d.createdAt);
    return dt > desde && dt <= hasta;
  });
}

// Platos anulados (con motivo) durante el periodo de este cierre: junto con
// los descuentos, es lo que hace falta para cuadrar de verdad un turno
// (ventas frente a lo descontado y lo anulado/mermado).
function getVoidsForClosure(){
  const {desde, hasta, lastClosure} = getCashClosurePeriod();
  const today = todayStr();
  return (DB.voidLog||[]).filter(v => {
    if(v.fecha !== today) return false;
    if(!v.createdAt) return !lastClosure;
    const dt = new Date(v.createdAt);
    return dt > desde && dt <= hasta;
  });
}

function computeClosureTotals(sales){
  const totales = {};
  PAYMENT_METHODS.forEach(m => totales[m] = 0);
  let total = 0;
  sales.forEach(s => {
    if(s.pagos && s.pagos.length){
      s.pagos.forEach(p => {
        const m = totales.hasOwnProperty(p.metodoPago) ? p.metodoPago : 'Otro';
        totales[m] += p.amount;
      });
    }else{
      const m = totales.hasOwnProperty(s.metodoPago) ? s.metodoPago : 'Otro';
      totales[m] += s.total;
    }
    total += s.total;
  });
  return {totales, total, ticketCount: sales.length};
}

function openCashClosureModal(){
  const {desde, hasta} = getCashClosurePeriod();
  const sales = getSalesForClosure();
  const {totales, total, ticketCount} = computeClosureTotals(sales);
  const discounts = getDiscountsForClosure();
  const totalDiscounts = discounts.reduce((s,d)=>s+d.importe, 0);
  const voids = getVoidsForClosure();
  const platforms = DB.business.deliveryPlatforms||[];
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cash-register"></i> ${t('title.cashClosure')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('label.period')}: ${fmtDateTime(desde)} — ${fmtDateTime(hasta)}<br>${ticketCount} ${ticketCount!==1?t('noun.tickets'):t('noun.ticket')}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('label.paymentMethod')}</th><th>${t('label.totalSales')}</th></tr></thead>
        <tbody>
          ${PAYMENT_METHODS.map(m => `<tr><td>${escapeHtml(paymentMethodTpvLabel(m))}</td><td>${fmtMoney(totales[m]||0)}</td></tr>`).join('')}
          <tr style="font-weight:700"><td>${t('common.total')}</td><td>${fmtMoney(total)}</td></tr>
        </tbody>
      </table>
    </div>
    ${discounts.length ? `
    <h3 style="font-size:14px;margin-top:14px"><i class="ti ti-discount-2"></i> ${t('title.discountsAppliedThisPeriod')}</h3>
    <div class="table-wrap" style="margin-bottom:14px">
      <table>
        <thead><tr><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.responsible')}</th><th>%</th><th>${t('label.total')}</th><th>${t('label.voidReason')}</th></tr></thead>
        <tbody>${discounts.map(d => `<tr><td>${escapeHtml(d.hora)}</td><td>${escapeHtml(d.mesa||'—')}</td><td>${escapeHtml(d.responsableNombre||'—')}</td><td>${d.porcentaje}%</td><td>${fmtMoney(d.importe)}</td><td>${escapeHtml(d.motivo)}</td></tr>`).join('')}</tbody>
        <tfoot><tr style="font-weight:700"><td colspan="4">${t('label.totalDiscounts')}</td><td colspan="2">${fmtMoney(totalDiscounts)}</td></tr></tfoot>
      </table>
    </div>` : ''}
    ${voids.length ? `
    <h3 style="font-size:14px;margin-top:14px"><i class="ti ti-alert-triangle"></i> ${t('title.voidsThisPeriod')}</h3>
    <div class="table-wrap" style="margin-bottom:14px">
      <table>
        <thead><tr><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.dishElaboration')}</th><th>${t('label.quantity')}</th><th>${t('label.responsible')}</th><th>${t('label.voidReason')}</th></tr></thead>
        <tbody>${voids.map(v => `<tr><td>${escapeHtml(v.hora)}</td><td>${escapeHtml(v.mesa||'—')}</td><td>${escapeHtml(v.plato)}</td><td>${v.cantidad}</td><td>${escapeHtml(v.responsableNombre||'—')}</td><td>${escapeHtml(v.motivo)}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
    ${platforms.length ? `
    <h3 style="font-size:14px;margin-top:14px"><i class="ti ti-moped"></i> ${t('title.platformSalesThisPeriod')}</h3>
    <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${t('closure.platformSalesHint')}</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      ${platforms.map(p => `
        <div class="field-row" style="align-items:center;margin-bottom:0">
          <label style="flex:1;font-weight:600;font-size:13.5px">${escapeHtml(p.nombre)}</label>
          <input type="number" id="closure-platform-${p.id}" step="0.01" min="0" placeholder="0.00" style="max-width:140px">
        </div>
      `).join('')}
    </div>` : ''}
    <div class="field"><label>${t('label.initialCashFund')}</label><input type="number" id="closure-fondo" step="0.01" value="0" oninput="updateClosureDiffPreview()"></div>
    <div class="field">
      <label>${t('label.cashCounted')}</label>
      <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${t('label.cashCountHint')}</p>
      ${cashDenominationsHtml()}
      <input type="hidden" id="closure-contado">
      <div style="font-weight:700;margin-top:4px">${t('label.cashCountTotal')}: <span id="cash-count-total">${fmtMoney(0)}</span></div>
    </div>
    <div id="closure-diff-preview" style="font-size:13px;font-weight:600;margin:6px 0"></div>
    <div class="field"><label>${t('label.notesOptional')}</label><textarea id="closure-notas" rows="2" placeholder="${t('ph.closureObservations')}"></textarea></div>
    <input type="hidden" id="closure-desde" value="${desde.toISOString()}">
    <input type="hidden" id="closure-hasta" value="${hasta.toISOString()}">
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="performCashClosure()"><i class="ti ti-check"></i> ${t('btn.confirmClosure')}</button>
    </div>
  `);
  updateClosureDiffPreview();
}

// Monedas y billetes de curso legal en la eurozona, en céntimos (para sumar
// sin errores de coma flotante). Contar cuántos hay de cada uno es más
// fiable que teclear un total a ojo, y de paso deja el desglose real por si
// hay que revisar luego cómo se llegó a esa cifra.
const CASH_DENOMINATIONS = [
  {cents: 1, kind:'coin'}, {cents: 2, kind:'coin'}, {cents: 5, kind:'coin'}, {cents: 10, kind:'coin'},
  {cents: 20, kind:'coin'}, {cents: 50, kind:'coin'}, {cents: 100, kind:'coin'}, {cents: 200, kind:'coin'},
  {cents: 500, kind:'bill'}, {cents: 1000, kind:'bill'}, {cents: 2000, kind:'bill'}, {cents: 5000, kind:'bill'}, {cents: 10000, kind:'bill'}
];
function cashDenomLabel(cents){
  return cents < 100 ? `${cents}c` : `${cents/100}€`;
}
function cashDenominationsHtml(){
  const group = (list, icon) => `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px;margin-bottom:8px">
      ${list.map(d => `
        <div style="text-align:center">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:2px"><i class="ti ${icon}"></i> ${cashDenomLabel(d.cents)}</label>
          <input type="number" min="0" step="1" id="cash-count-${d.cents}" placeholder="0" oninput="updateCashCountTotal()" style="text-align:center;padding:4px">
        </div>
      `).join('')}
    </div>
  `;
  return `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px">${t('label.coins')}</div>
    ${group(CASH_DENOMINATIONS.filter(d=>d.kind==='coin'), 'ti-circle')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px">${t('label.bills')}</div>
    ${group(CASH_DENOMINATIONS.filter(d=>d.kind==='bill'), 'ti-rectangle')}
  `;
}
// Recalcula el total contado a partir de las unidades de cada denominación
// y lo deja en el campo oculto que ya usan updateClosureDiffPreview() y
// performCashClosure() — así no hace falta tocar esa lógica, solo cómo se
// rellena el importe. Si no se ha tocado ninguna casilla todavía, el campo
// se deja vacío (no en 0) para que el aviso siga diciendo "aún sin contar"
// en vez de dar por hecho que la caja está vacía.
function updateCashCountTotal(){
  let totalCents = 0, anyTouched = false;
  CASH_DENOMINATIONS.forEach(d => {
    const el = document.getElementById(`cash-count-${d.cents}`);
    if(el && el.value !== '') anyTouched = true;
    totalCents += (el ? (parseInt(el.value) || 0) : 0) * d.cents;
  });
  const total = totalCents / 100;
  document.getElementById('closure-contado').value = anyTouched ? total : '';
  const totalEl = document.getElementById('cash-count-total');
  if(totalEl) totalEl.textContent = fmtMoney(total);
  updateClosureDiffPreview();
}

function updateClosureDiffPreview(){
  const sales = getSalesForClosure();
  const {totales} = computeClosureTotals(sales);
  const efectivo = totales['Efectivo']||0;
  const fondo = parseFloat(document.getElementById('closure-fondo').value) || 0;
  const contadoEl = document.getElementById('closure-contado');
  const contadoRaw = contadoEl.value;
  const esperado = fondo + efectivo;
  const box = document.getElementById('closure-diff-preview');
  if(contadoRaw === ''){
    box.textContent = `${t('label.expectedCash')}: ${fmtMoney(esperado)}`;
    box.style.color = '';
    return;
  }
  const contado = parseFloat(contadoRaw) || 0;
  const diff = roundMoney(contado - esperado);
  box.textContent = `${t('label.expectedCash')}: ${fmtMoney(esperado)} · ${t('label.difference')}: ${diff>0?'+':''}${fmtMoney(diff)}${diff===0?` (${t('label.exactCash')})`:diff>0?` (${t('label.cashSurplus')})`:` (${t('label.cashShortage')})`}`;
  box.style.color = diff===0 ? 'var(--ok, #2e7d32)' : (diff>0 ? 'var(--warn, #b8860b)' : 'var(--danger, #c0392b)');
}

// La caja debe cuadrar exacta: cualquier diferencia (por pequeña que sea)
// avisa al cerrar — no bloquea el cierre, solo lo señala para que no pase
// desapercibido entre turno y turno.
const CASH_DIFF_WARNING_THRESHOLD = 0;

// Detecta, sin acusar a nadie directamente, patrones que conviene revisar
// en un cierre: un descuadre de caja grande, o un mismo responsable
// concentrando muchos descuentos/anulaciones en un solo turno. Devuelve una
// lista de avisos en texto plano (vacía si no hay nada raro).
function detectClosureWarnings(diferencia, discounts, voids){
  const warnings = [];
  if(diferencia !== null && Math.abs(diferencia) > CASH_DIFF_WARNING_THRESHOLD){
    warnings.push(t('closure.warning.cashDiff').replace('${amount}', fmtMoney(Math.abs(diferencia))).replace('${sign}', diferencia<0?t('label.cashShortage'):t('label.cashSurplus')));
  }
  const byResp = {};
  discounts.forEach(d => {
    const key = d.responsableNombre || t('common.unknown');
    byResp[key] = (byResp[key]||0) + 1;
  });
  Object.entries(byResp).forEach(([name, n]) => {
    if(n >= 5) warnings.push(t('closure.warning.manyDiscounts').replace('${name}', name).replace('${n}', n));
  });
  if(voids.length >= 8){
    warnings.push(t('closure.warning.manyVoids').replace('${n}', voids.length));
  }
  return warnings;
}

// Registra el total bruto de ventas que ha reportado una plataforma de
// delivery externa (Glovo, Uber Eats...) para el periodo de este cierre,
// como una venta más — así entra automáticamente en Facturación, se le
// calcula el IVA correspondiente y se le descuenta la comisión de la
// plataforma como gasto, igual que si cada pedido se hubiera registrado
// uno a uno en el TPV. Pensado para negocios que no dan de alta cada
// pedido de la plataforma en la app y solo tienen el total del periodo.
function registerPlatformSettlementSale(plat, totalBruto, closureHasta){
  const ivaPct = verifactuIvaPct();
  // createdAt se fija al instante "hasta" del cierre (no al momento real de
  // guardar, que puede ser unos minutos después) para que la venta quede
  // dentro del periodo de ESTE cierre y no se cuele, sin etiquetar, en el
  // rango del cierre siguiente del mismo día (getSalesForClosure filtra por
  // fecha > desde y <= hasta del cierre correspondiente).
  const sale = {
    id: genId(), date: todayStr(), createdAt: closureHasta,
    total: roundMoney(totalBruto), tipo: 'delivery', express: false,
    clienteNombre: '', clientId: null, camareroId: null,
    metodoPago: 'Otro',
    items: [{name: t('label.platformSalesLineItem').replace('${platform}', plat.nombre), price: roundMoney(totalBruto), qty: 1, ivaPct}],
    isPlatformSettlement: true,
  };
  const comisionPct = parseFloat(plat.comisionPct) || 0;
  const platIvaPct = plat.isp ? 0 : (parseFloat(plat.ivaPct) || 0);
  // A diferencia de un pedido individual (applyDeliveryCommission, js/tpv.js),
  // aquí no hay un coste de envío desglosado que restar de la base: el total
  // introducido es una cifra agregada que la propia plataforma ya reporta
  // así, sin separar comanda de envío. Por eso la comisión se calcula
  // siempre sobre el bruto completo, independientemente de si la plataforma
  // tiene marcado "comisión sobre envío" — no hay forma de aplicar ese
  // matiz sin ese desglose. Se guarda el valor real configurado (no true a
  // fuego) para que quede constancia fiel de la configuración del negocio.
  const comisionSobreEnvio = plat.comisionSobreEnvio !== false;
  const comision = sale.total * (comisionPct/100) * (1 + platIvaPct/100);
  sale.plataforma = {id: plat.id, nombre: plat.nombre, comisionPct, ivaPct: platIvaPct, comisionSobreEnvio, isp: !!plat.isp, facturaReal: !!plat.facturaReal};
  sale.comisionPlataforma = roundMoney(comision);
  if(typeof numerarTicket === 'function') numerarTicket(sale);
  DB.sales.push(sale);
  enqueueVerifactuSubmission(sale);
  return sale;
}

// Dos propietarios/encargados cerrando caja casi a la vez desde dispositivos
// distintos (antes de que el sync de uno le llegue al otro) calculaban el
// mismo periodo y generaban dos cierres con el mismo rango de ventas — como
// DB.cashClosures se fusiona por id (MERGEABLE_ARRAYS), los dos sobrevivían
// enteros y duplicaban el importe del turno en el histórico de arqueos. Se
// usa una transacción de Firebase (mismo mecanismo que ya se usa para
// reservar un código de licencia o el nombre de usuario del propietario)
// sobre un nodo pequeño y aparte, no sobre el arqueo en sí: solo uno de los
// dos dispositivos "gana" el turno de cerrar caja, el otro recibe un aviso
// claro y no llega a crear su cierre. Es una mejora "si hay internet
// ahora mismo" — el arqueo tiene que poder seguir haciéndose sin conexión
// (es una caja registradora, no puede depender de la nube para funcionar
// el día a día), así que sin red se procede igual que antes.
async function acquireCashClosureLock(){
  if(typeof firebase === 'undefined' || !cloudRef) return {ok: true};
  const tenantId = getTenantId();
  if(!tenantId) return {ok: true};
  try{
    const lockRef = firebase.database().ref('gastrogoan/tenants/' + tenantId + '/cashClosureLock');
    // Si una transacción se queda a medias (se cierra la pestaña justo
    // después de ganar el turno, se cae la conexión...), el bloqueo no debe
    // dejar el cierre de caja inutilizable para siempre — pasados unos
    // segundos se considera abandonado y cualquiera puede reclamarlo.
    const STALE_MS = 20000;
    const myId = getOrCreateDeviceId();
    const result = await lockRef.transaction(current => {
      if(current === null || (Date.now() - (current.ts||0)) > STALE_MS) return {ts: Date.now(), by: myId};
      return; // no tocar: aborta la transacción, no se compromete el cambio
    });
    if(result.committed && result.snapshot.val() && result.snapshot.val().by === myId) return {ok: true, lockRef};
    return {ok: false};
  }catch(e){
    // Fallo de red/permisos al intentar el candado: es una mejora, no debe
    // poder impedir cerrar caja por sí sola.
    return {ok: true};
  }
}

async function performCashClosure(){
  const lock = await acquireCashClosureLock();
  if(!lock.ok){
    showToast(t('msg.cashClosureLocked'));
    return;
  }
  const sales = getSalesForClosure();
  const {totales, total, ticketCount} = computeClosureTotals(sales);
  const discounts = getDiscountsForClosure();
  const voids = getVoidsForClosure();
  const fondoInicial = parseFloat(document.getElementById('closure-fondo').value) || 0;
  const contadoRaw = document.getElementById('closure-contado').value;
  const efectivoContado = contadoRaw === '' ? null : (parseFloat(contadoRaw) || 0);
  const efectivoEsperado = fondoInicial + (totales['Efectivo']||0);
  const diferencia = efectivoContado === null ? null : roundMoney(efectivoContado - efectivoEsperado);
  const notas = document.getElementById('closure-notas').value.trim();
  const desde = document.getElementById('closure-desde').value;
  const hasta = document.getElementById('closure-hasta').value;
  const warnings = detectClosureWarnings(diferencia, discounts, voids);
  // Quién hizo el cierre lo dice la sesión con la que se ha entrado, igual
  // que el resto de registros de este tipo (cumplimiento de apertura/cierre,
  // gasto registrado...) — no un campo a elegir a mano. Antes no quedaba
  // constancia de quién cerró caja cada turno, así que no había forma real
  // de saber si de verdad se estaba haciendo o quién.
  const authorId = getChatAuthor();
  const responsableId = authorId==='owner' ? null : authorId;
  const responsableNombre = getChatAuthorName(authorId);

  const platformSales = [];
  const platformSaleObjs = [];
  (DB.business.deliveryPlatforms||[]).forEach(p => {
    const input = document.getElementById(`closure-platform-${p.id}`);
    const amount = input ? (parseFloat(input.value) || 0) : 0;
    if(amount > 0){
      const sale = registerPlatformSettlementSale(p, amount, hasta);
      platformSaleObjs.push(sale);
      platformSales.push({platformId: p.id, nombre: p.nombre, total: sale.total, comision: sale.comisionPlataforma});
    }
  });

  const closure = {
    id: genId(), fecha: todayStr(), desde, hasta,
    totales, total, ticketCount,
    descuentos: discounts, totalDescuentos: discounts.reduce((s,d)=>s+d.importe, 0),
    anulaciones: voids,
    platformSales,
    fondoInicial, efectivoEsperado, efectivoContado, diferencia, notas, warnings,
    responsableId, responsableNombre,
    createdAt: new Date().toISOString()
  };
  DB.cashClosures.push(closure);
  /* ⚠️ Se marca CADA venta incluida con el cierre al que pertenece.
     Antes el filtro era solo una ventana de tiempo (createdAt entre "desde"
     y "hasta"), y eso perdía ventas de verdad: una venta cobrada offline a
     las 14:00 pero sincronizada a las 15:10, con un cierre hecho a las
     15:00, no entraba en ESE cierre (no existía aún en local/remoto) ni en
     el SIGUIENTE (su hora, 14:00, ya no es "posterior" al nuevo "desde",
     15:00) — se perdía de todos los arqueos para siempre, aunque sí contara
     en la facturación del mes. Marcando por id en vez de por ventana, una
     venta que llega tarde simplemente entra en el PRÓXIMO cierre que se
     haga, sin más condición que no tener cierre asignado todavía. */
  sales.forEach(s => { s.cierreId = closure.id; });
  // Sin esto, la venta agregada de cada liquidación de plataforma (arriba)
  // se creaba DESPUÉS de capturar `sales` para este cierre, así que nunca
  // recibía cierreId — getSalesForClosure() la volvía a coger entera en el
  // SIGUIENTE cierre del día, duplicando el importe de la liquidación.
  platformSaleObjs.forEach(s => { s.cierreId = closure.id; });
  // Sigue viviendo en su propio Historial de Arqueos (con el detalle
  // completo) — esto es solo para que también salga en el registro
  // general. En rojo si hay descuadre de verdad (no solo unos céntimos de
  // redondeo), que es justo lo que un responsable querría ver de un vistazo.
  const descuadreSerio = diferencia !== null && Math.abs(diferencia) >= 5;
  logAudit('cash_close', t('audit.cashClosed').replace('${total}', fmtMoney(total)).replace('${diff}', diferencia===null ? '—' : fmtMoney(diferencia)), descuadreSerio ? 'critical' : 'normal');
  saveDB();
  closeModal();
  renderTPV();
  printCashClosure(closure);
  if(lock.lockRef) lock.lockRef.remove().catch(()=>{});
  if(warnings.length){
    showClosureWarningsModal(warnings);
    if(typeof sendPushToAll === 'function') sendPushToAll(t('notif.cashWarningTitle'), warnings[0]);
  }
  else showToast(t('msg.cashCloseDone'));
}

function showClosureWarningsModal(warnings){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${t('closure.warning.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('closure.warning.desc')}</p>
    <ul style="margin:0 0 4px 18px;font-size:13.5px;line-height:1.7">
      ${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
    </ul>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">${t('common.understood')}</button>
    </div>
  `);
}

function printCashClosure(closure){
  const diffLabel = closure.diferencia===0 ? t('label.exactCash') : closure.diferencia>0 ? t('label.cashSurplus') : t('label.cashShortage');
  const diffHtml = closure.efectivoContado === null ? '' : `
    <div class="pr-meta">${t('label.cashCounted')}: <strong>${fmtMoney(closure.efectivoContado)}</strong></div>
    <div class="pr-meta">${t('label.difference')}: <strong style="color:${closure.diferencia===0?'#111':closure.diferencia>0?'#1a7a3c':'#b3261e'}">${closure.diferencia>0?'+':''}${fmtMoney(closure.diferencia)}</strong> (${diffLabel})</div>
  `;
  const discountsHtml = (closure.descuentos||[]).length ? `
    <h2>${t('title.discountsAppliedThisPeriod')}</h2>
    <table><thead><tr><th>${t('common.time')}</th><th>${t('label.table')}</th><th>${t('common.responsible')}</th><th class="pr-num">%</th><th class="pr-num">${t('common.amount')}</th></tr></thead>
    <tbody>${closure.descuentos.map(d => `<tr><td>${escapeHtml(d.hora)}</td><td>${escapeHtml(d.mesa||'—')}</td><td>${escapeHtml(d.responsableNombre||'—')}<div class="pr-note">${escapeHtml(d.motivo||'')}</div></td><td class="pr-num">${d.porcentaje}%</td><td class="pr-num">${fmtMoney(d.importe)}</td></tr>`).join('')}
    <tr class="pr-total-row"><td colspan="4">${t('label.totalDiscounts')}</td><td class="pr-num">${fmtMoney(closure.totalDescuentos||0)}</td></tr>
    </tbody></table>` : '';
  const voidsHtml = (closure.anulaciones||[]).length ? `
    <h2>${t('title.voidsThisPeriod')}</h2>
    <table><thead><tr><th>${t('common.time')}</th><th>${t('label.table')}</th><th>${t('common.item')}</th><th>${t('common.responsible')}</th></tr></thead>
    <tbody>${closure.anulaciones.map(v => `<tr><td>${escapeHtml(v.hora)}</td><td>${escapeHtml(v.mesa||'—')}</td><td>${v.cantidad}× ${escapeHtml(v.plato)}<div class="pr-note">${escapeHtml(v.motivo||'')}</div></td><td>${escapeHtml(v.responsableNombre||'—')}</td></tr>`).join('')}</tbody></table>` : '';
  const platformSalesHtml = (closure.platformSales||[]).length ? `
    <h2>${t('title.platformSalesThisPeriod')}</h2>
    <table><thead><tr><th>${t('mn.delivery.platformName')}</th><th class="pr-num">${t('label.totalSales')}</th><th class="pr-num">${t('mn.delivery.commissionLabel')}</th></tr></thead>
    <tbody>${closure.platformSales.map(p => `<tr><td>${escapeHtml(p.nombre)}</td><td class="pr-num">${fmtMoney(p.total)}</td><td class="pr-num">${fmtMoney(p.comision)}</td></tr>`).join('')}</tbody></table>` : '';

  const body = `
    ${printReportHeaderHtml(t('title.cashClosureReceipt'), `${t('label.from')} ${fmtDateTime(new Date(closure.desde))} — ${t('label.to')} ${fmtDateTime(new Date(closure.hasta))}${closure.responsableNombre ? ` · ${t('label.responsible')}: ${escapeHtml(closure.responsableNombre)}` : ''}`)}
    <h2>${t('label.totalSales')}</h2>
    <table><thead><tr><th>${t('ticket.payment')}</th><th class="pr-num">${t('common.amount')}</th></tr></thead>
      <tbody>
        ${PAYMENT_METHODS.map(m => `<tr><td>${escapeHtml(paymentMethodTpvLabel(m))}</td><td class="pr-num">${fmtMoney(closure.totales[m]||0)}</td></tr>`).join('')}
        <tr class="pr-total-row"><td>${t('common.total')} (${closure.ticketCount} ${closure.ticketCount!==1?t('noun.tickets'):t('noun.ticket')})</td><td class="pr-num">${fmtMoney(closure.total)}</td></tr>
      </tbody>
    </table>
    ${discountsHtml}${voidsHtml}${platformSalesHtml}
    <h2>${t('label.cash')}</h2>
    <div class="pr-meta">${t('label.initialFund')}: <strong>${fmtMoney(closure.fondoInicial)}</strong></div>
    <div class="pr-meta">${t('label.expectedCash')}: <strong>${fmtMoney(closure.efectivoEsperado)}</strong></div>
    ${diffHtml}
    ${closure.notas ? `<div class="pr-divider"></div><div class="pr-meta"><strong>${t('common.notes')}:</strong> ${escapeHtml(closure.notas)}</div>` : ''}
  `;
  printReportWindow(t('title.cashClosureReceipt'), body);
}

function openCashClosureHistory(){
  const closures = [...DB.cashClosures].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${t('title.closureHistory')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${closures.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('label.closingTime')}</th><th>${t('label.responsible')}</th><th>${t('label.totalSales')}</th><th>${t('label.difference')}</th><th></th></tr></thead>
        <tbody>
          ${closures.map(c => `
            <tr>
              <td>${escapeHtml(c.fecha)}</td>
              <td>${fmtDateTime(new Date(c.hasta))}</td>
              <td>${escapeHtml(c.responsableNombre||'—')}</td>
              <td>${fmtMoney(c.total)}</td>
              <td>${c.diferencia===null ? '—' : (c.diferencia>0?'+':'')+fmtMoney(c.diferencia)}</td>
              <td><button class="btn btn-sm btn-icon" onclick="(()=>{const x=DB.cashClosures.find(z=>z.id===${c.id});if(x)printCashClosure(x);})()"><i class="ti ti-printer"></i></button>
              <button class="btn btn-sm btn-icon" title="${t('tips.splitBtn')}" onclick="openTipsSplitModal(${c.id})"><i class="ti ti-cash"></i></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : `<div class="empty"><i class="ti ti-cash-register"></i>${t('empty.cashClosures')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

/* ============================================================
   CONCILIACIÓN BANCARIA
   El arqueo de caja ya cuadra el efectivo físico al cerrar cada
   turno, pero lo cobrado con tarjeta/datáfono no llega al banco al
   instante ni tal cual (llega en lotes, con comisiones descontadas,
   días después) — sin esto no había forma de comprobar que lo que el
   TPV dice que se cobró por tarjeta coincide con lo que de verdad
   entró en la cuenta. Es manual (el dueño mira su extracto real y
   escribe el importe) porque conectar con el banco de verdad
   requeriría una integración bancaria (PSD2/Open Banking) que no
   existe hoy.
   ============================================================ */
function cardTotalInRange(fechaDesde, fechaHasta){
  return DB.cashClosures
    .filter(c => c.fecha >= fechaDesde && c.fecha <= fechaHasta)
    .reduce((sum, c) => sum + ((c.totales && c.totales['Tarjeta']) || 0), 0);
}
function openBankReconciliationModal(){
  const today = todayStr();
  const monthStart = today.slice(0,7) + '-01';
  renderBankReconciliationForm(monthStart, today);
}
function renderBankReconciliationForm(fechaDesde, fechaHasta){
  const expected = cardTotalInRange(fechaDesde, fechaHasta);
  const history = [...(DB.bankReconciliations||[])].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-building-bank"></i> ${t('reconcile.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('reconcile.desc')}</p>
    <div class="field-row">
      <div class="field"><label>${t('reconcile.fromLabel')}</label><input type="date" id="rec-bank-desde" value="${fechaDesde}" onchange="refreshBankReconciliationRange()"></div>
      <div class="field"><label>${t('reconcile.toLabel')}</label><input type="date" id="rec-bank-hasta" value="${fechaHasta}" onchange="refreshBankReconciliationRange()"></div>
    </div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="label">${t('reconcile.expectedLabel')}</div>
      <div class="value" id="rec-bank-expected" data-raw="${expected}">${fmtMoney(expected)}</div>
    </div>
    <div class="field">
      <label>${t('reconcile.bankAmountLabel')}</label>
      <input type="number" id="rec-bank-amount" step="0.01" placeholder="0.00" oninput="updateBankReconciliationDiff()">
    </div>
    <div id="rec-bank-diff" style="font-size:13px;font-weight:600;margin:6px 0"></div>
    <div class="field"><label>${t('common.notes')}</label><textarea id="rec-bank-notes" rows="2"></textarea></div>
    <button class="btn btn-primary" onclick="saveBankReconciliation()"><i class="ti ti-device-floppy"></i> ${t('reconcile.saveBtn')}</button>
    ${history.length ? `
    <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
    <h4 style="margin:0 0 8px">${t('reconcile.historyTitle')}</h4>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('label.period')}</th><th>${t('reconcile.expectedLabel')}</th><th>${t('reconcile.bankAmountLabel')}</th><th>${t('label.difference')}</th></tr></thead>
        <tbody>
          ${history.map(r => `<tr><td>${escapeHtml(r.fechaDesde)} — ${escapeHtml(r.fechaHasta)}</td><td>${fmtMoney(r.expected)}</td><td>${fmtMoney(r.bankAmount)}</td><td style="color:${Math.abs(r.difference)>0.01?'var(--red)':'var(--green)'}">${r.difference>0?'+':''}${fmtMoney(r.difference)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function refreshBankReconciliationRange(){
  const desde = document.getElementById('rec-bank-desde').value;
  const hasta = document.getElementById('rec-bank-hasta').value;
  if(!desde || !hasta || desde > hasta) return;
  renderBankReconciliationForm(desde, hasta);
}
function updateBankReconciliationDiff(){
  const expected = parseFloat(document.getElementById('rec-bank-expected').dataset.raw) || 0;
  const bankRaw = document.getElementById('rec-bank-amount').value;
  const box = document.getElementById('rec-bank-diff');
  if(bankRaw === ''){ box.textContent = ''; return; }
  const bank = parseFloat(bankRaw) || 0;
  const diff = roundMoney(bank - expected);
  box.textContent = `${t('label.difference')}: ${diff>0?'+':''}${fmtMoney(diff)}`;
  box.style.color = Math.abs(diff) < 0.01 ? 'var(--ok, #2e7d32)' : 'var(--danger, #c0392b)';
}
function saveBankReconciliation(){
  const fechaDesde = document.getElementById('rec-bank-desde').value;
  const fechaHasta = document.getElementById('rec-bank-hasta').value;
  const bankRaw = document.getElementById('rec-bank-amount').value;
  if(bankRaw === ''){ showToast(t('reconcile.needAmount')); return; }
  const bankAmount = parseFloat(bankRaw) || 0;
  const expected = cardTotalInRange(fechaDesde, fechaHasta);
  const difference = roundMoney(bankAmount - expected);
  const notes = document.getElementById('rec-bank-notes').value.trim();
  if(!DB.bankReconciliations) DB.bankReconciliations = [];
  DB.bankReconciliations.push({id: genId(), fechaDesde, fechaHasta, expected, bankAmount, difference, notes, createdAt: new Date().toISOString()});
  logAudit('bank_reconciliation', t('audit.bankReconciliation').replace('${from}', fechaDesde).replace('${to}', fechaHasta));
  saveDB();
  renderBankReconciliationForm(fechaDesde, fechaHasta);
  showToast(t('reconcile.savedOk'));
}

// Reparto automático de propinas de un cierre de caja: suma las propinas
// cobradas en el periodo del cierre y las divide a partes iguales entre
// quien estuvo fichado durante ese periodo — evita hacerlo a mano con una
// calculadora al final del mes. Es solo informativo (no mueve dinero de
// verdad, cada negocio lo reparte como prefiera con esta base).
function openTipsSplitModal(closureId){
  const c = DB.cashClosures.find(x=>x.id===closureId);
  if(!c) return;
  const desde = new Date(c.desde), hasta = new Date(c.hasta);
  const sales = DB.sales.filter(s => {
    if(s.status === 'anulada') return false;
    if(s.date !== c.fecha) return false;
    if(!s.createdAt) return true;
    const dt = new Date(s.createdAt);
    return dt > desde && dt <= hasta;
  });
  const totalPropinas = sales.reduce((s,x)=>s+(x.propina||0),0);
  const workers = (DB.fichajes||[]).filter(f => f.fecha===c.fecha && new Date(f.entrada) < hasta && (!f.salida || new Date(f.salida) > desde));
  const employees = [...new Set(workers.map(f=>f.employeeId))].map(id=>DB.employees.find(e=>e.id===id)).filter(Boolean);
  const perPerson = employees.length ? totalPropinas / employees.length : 0;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cash"></i> ${t('tips.title')}</h3>
      <button class="modal-close" onclick="openCashClosureHistory()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('tips.desc').replace('${total}', fmtMoney(totalPropinas))}</p>
    ${employees.length ? `
    <div style="display:flex;flex-direction:column;gap:4px">
      ${employees.map(e => `<div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${escapeHtml(e.name)}</span><strong>${fmtMoney(perPerson)}</strong></div>`).join('')}
    </div>` : `<div class="empty"><i class="ti ti-users"></i>${t('tips.noWorkers')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="openCashClosureHistory()">${t('common.close')}</button>
    </div>
  `);
}

/* ============================================================
   PROVEEDORES — Contactos y condiciones de compra
   ============================================================ */
let providerSearchQuery = '';
// Tipo de proveedor («Lácteos», «Carnes», «Pescados y Marisco»…): sale de las mismas categorías de la Mega Lista, más
// las que el negocio escriba. Se guarda el nombre (clave estable) y se traduce al mostrarlo.
let providerTipoFiltro = null;   // null = todos · '' = sin tipo · un nombre = ese tipo
function providerTiposDisponibles(){
  const enUso = DB.ingredients.filter(i => (i.area||'cocina') === currentArea()).map(i => i.category).filter(Boolean);
  const base = [...ingredientCategories(), ...(DB.ingredientCategories || []), ...enUso];
  const propios = DB.providers.filter(p => (p.area||'cocina') === currentArea()).map(p => p.tipo).filter(Boolean);
  return [...new Set([...base, ...propios])];
}
function providerTipoLabel(tipo){ return tipo ? ingredientCategoryLabel(tipo) : ''; }
function setProviderTipoFiltro(tipo){ providerTipoFiltro = (providerTipoFiltro === tipo ? null : tipo); renderProveedores(); }
function setProviderSearchQuery(val){
  providerSearchQuery = val;
  const el = document.getElementById('proveedores-search-input');
  const pos = el ? el.selectionStart : null;
  renderProveedores();
  const newEl = document.getElementById('proveedores-search-input');
  if(newEl && pos != null){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
}
// Ingredientes de la Mega Lista comprados a un proveedor (por nombre, que es
// como se enlazan hoy los ingredientes con su proveedor).
function ingredientsForSupplier(nombre){
  return DB.ingredients.filter(i => i.supplier === nombre && (i.area||'cocina') === currentArea());
}
function renderProveedores(){
  const box = document.getElementById('proveedores-list');
  const filtros = document.getElementById('proveedores-tipos');
  const q = providerSearchQuery.trim().toLowerCase();
  const delArea = DB.providers.filter(p => (p.area||'cocina') === currentArea());
  // Los tipos que de verdad se usan, con su recuento, para filtrar de un toque.
  if(filtros){
    const cuenta = {}; let sinTipo = 0;
    delArea.forEach(p => { if(p.tipo) cuenta[p.tipo] = (cuenta[p.tipo]||0) + 1; else sinTipo++; });
    const tipos = Object.keys(cuenta).sort((a,b) => providerTipoLabel(a).localeCompare(providerTipoLabel(b)));
    if(providerTipoFiltro !== null && !(providerTipoFiltro === '' ? sinTipo : cuenta[providerTipoFiltro])) providerTipoFiltro = null;
    const chip = (valor, texto, n) => `<button type="button" class="btn btn-sm btn-fino${providerTipoFiltro === valor ? ' is-on' : ''}" aria-pressed="${providerTipoFiltro === valor}" onclick="setProviderTipoFiltro('${escapeJsAttr(valor)}')">${escapeHtml(texto)} <span class="ml-n">${n}</span></button>`;
    filtros.innerHTML = tipos.length ? tipos.map(x => chip(x, providerTipoLabel(x), cuenta[x])).join('') + (sinTipo ? chip('', gl({es:'Sin tipo', ca:'Sense tipus', en:'No type'}), sinTipo) : '') : '';
  }
  let providers = delArea;
  if(providerTipoFiltro !== null) providers = providers.filter(p => (p.tipo || '') === providerTipoFiltro);
  if(q) providers = providers.filter(p => p.nombre.toLowerCase().includes(q) || (p.contacto||'').toLowerCase().includes(q) || (p.dir||'').toLowerCase().includes(q) || (p.tel||'').includes(q) || providerTipoLabel(p.tipo).toLowerCase().includes(q));
  if(!providers.length){
    box.innerHTML = `<div class="empty pv-vacio"><i class="ti ti-building-factory-2"></i>${q || providerTipoFiltro !== null ? t('empty.noSearchResults') : t('empty.suppliers')}</div>`;
    return;
  }
  // La tarjeta solo dice QUIÉN es: el nombre (con su tipo al lado) y los botones. Todo lo demás vive en la ficha,
  // para que con muchos proveedores la lista se lea de un vistazo.
  box.innerHTML = providers.map(p => `
    <div class="pv-card">
      <div class="pv-nombre"><i class="ti ti-building-factory-2"></i><div class="pv-nom-txt"><span class="pv-nom">${escapeHtml(p.nombre)}</span>${p.tipo ? `<span class="pv-tipo">${escapeHtml(providerTipoLabel(p.tipo))}</span>` : ''}</div></div>
      <div class="pv-acc">
        <button type="button" class="btn btn-fino" title="${escapeHtml(t('prov.info'))}" aria-label="${escapeHtml(t('prov.info'))}" onclick="openProviderInfoModal(${p.id})"><i class="ti ti-info-circle"></i></button>
        ${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`openProviderModal(${p.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteProvider(${p.id})`, peligro:true, owner:true}
        ])}
      </div>
    </div>
  `).join('');
}

// La ficha: lo que antes se pintaba entero en la tarjeta. Solo salen las filas que tienen dato.
function openProviderInfoModal(id){
  const p = DB.providers.find(x => x.id === id);
  if(!p) return;
  const ings = ingredientsForSupplier(p.nombre);
  const fila = (icono, etiqueta, html) => `
    <div class="pv-fila">
      <div class="pv-et"><i class="ti ${icono}"></i> ${etiqueta}</div>
      <div class="pv-val">${html}</div>
    </div>`;
  const dias = getProviderDiasEntrega(p);
  const filas = [
    p.tipo ? fila('ti-tag', gl({es:'Tipo', ca:'Tipus', en:'Type'}), escapeHtml(providerTipoLabel(p.tipo))) : '',
    p.contacto ? fila('ti-user', t('label.contactPerson'), escapeHtml(p.contacto)) : '',
    p.tel ? fila('ti-phone', t('common.phone'), `<a href="tel:${escapeHtml(p.tel)}">${escapeHtml(p.tel)}</a>${whatsappDeTelefono(p.tel) ? ` · <a href="https://wa.me/${whatsappDeTelefono(p.tel)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}`) : '',
    p.email ? fila('ti-mail', t('common.email'), `<a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a>`) : '',
    dias.length ? fila('ti-truck-delivery', t('label.delivery'), `${dias.map(d=>escapeHtml(weekDayLabelFromStored(d))).join(', ')}${p.horaEntrega ? ` · ${escapeHtml(p.horaEntrega)} ${t('label.hoursApprox')}` : ''}`) : '',
    p.envioTipo ? fila('ti-cash', t('label.shipping'), p.envioTipo === 'fijo'
      ? `${fmtMoney(p.envioCoste||0)} ${t('label.shippingFixedTag')}`
      : `${t('label.shippingFreeFrom')} ${fmtMoney(p.envioMinimo||0)} (${t('label.shippingOtherwise')} ${fmtMoney(p.envioCoste||0)})`) : '',
    p.dir ? fila('ti-map-pin', t('common.address'), escapeHtml(p.dir)) : '',
    p.iban ? fila('ti-credit-card', 'IBAN', `<span class="pv-mono">${escapeHtml(p.iban)}</span>`) : '',
    p.pago ? fila('ti-wallet', t('label.paymentMethod'), escapeHtml(paymentMethodLabel(p.pago))) : '',
    p.notas ? fila('ti-notes', t('common.notes'), `<span class="pv-notas">${escapeHtml(p.notas)}</span>`) : '',
  ].join('');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-building-factory-2"></i> ${escapeHtml(p.nombre)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${filas ? `<div class="pv-ficha">${filas}</div>` : `<p class="pv-sin-datos">${t('prov.sinDatos')}</p>`}
    <div class="pv-enlaces">
      ${ings.length
        ? `<button type="button" class="btn btn-sm btn-fino" onclick="openSupplierIngredientsModal(${p.id})"><i class="ti ti-list"></i> ${t('label.ingredientsFromSupplier')} (${ings.length})</button>`
        : `<span class="pv-cero"><i class="ti ti-list"></i> ${t('label.ingredientsFromSupplier')} (0)</span>`}
      <button type="button" class="btn btn-sm btn-fino" onclick="openSupplierOrdersModal(${p.id})"><i class="ti ti-history"></i> ${t('tab.orderHistory')} (${pedidosDeProveedor(p.nombre).length})</button>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button>
      <button type="button" class="owner-only btn btn-fino is-on" onclick="openProviderModal(${p.id})"><i class="ti ti-pencil"></i> ${t('common.edit')}</button>
    </div>
  `);
}
// Los pedidos hechos a un proveedor, de más nuevo a más viejo (solo los del área abierta).
function pedidosDeProveedor(nombre){
  const clave = String(nombre||'').trim().toLowerCase();
  return (DB.purchaseOrders || [])
    .filter(o => (o.area||'cocina') === currentArea() && String(o.supplier||'').trim().toLowerCase() === clave)
    .slice().sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')) || (b.id||0) - (a.id||0));
}
// El historial se ve AQUÍ, sin salir de la ficha: antes saltaba a Pedidos y volver era un rodeo. Cada pedido se
// despliega para ver sus líneas; «Abrir en Pedidos» sigue ahí para quien quiera gestionarlos.
function openSupplierOrdersModal(providerId){
  const p = DB.providers.find(x => x.id === providerId);
  if(!p) return;
  const pedidos = pedidosDeProveedor(p.nombre);
  const recibidos = pedidos.filter(o => o.estado === 'RECIBIDO');
  const totalRecibido = recibidos.reduce((s, o) => s + pedidoTotalConIva(o), 0);
  const filas = pedidos.map(o => {
    const lineas = (o.items||[]).map(line => {
      const ing = getIngredient(line.ingredientId);
      if(!ing) return '';
      const rec = o.estado === 'RECIBIDO' && line.cantidadRecibida != null && line.cantidadRecibida !== line.cantidad
        ? ` <span class="pv-ped-rec">(${gl({es:'llegó', ca:'va arribar', en:'received'})} ${fmtNum(line.cantidadRecibida)})</span>` : '';
      return `<div class="pv-ped-linea"><span>${escapeHtml(ing.name)}</span><span class="pv-ped-q">${fmtNum(line.cantidad)} ${escapeHtml(ing.unit)}${rec}</span></div>`;
    }).join('');
    return `
      <details class="pv-ped">
        <summary>
          <span class="pv-ped-f">${escapeHtml(o.date || '')}</span>
          <span class="badge ${PEDIDO_BADGE[o.estado] || 'badge-gray'}">${escapeHtml(pedidoEstadoLabel(o.estado))}</span>
          <span class="pv-ped-n">${(o.items||[]).length} ${gl({es:(o.items||[]).length === 1 ? 'artículo' : 'artículos', ca:(o.items||[]).length === 1 ? 'article' : 'articles', en:(o.items||[]).length === 1 ? 'item' : 'items'})}</span>
          <span class="pv-ped-t">${fmtMoney(pedidoTotalConIva(o))}</span>
          <i class="ti ti-chevron-down pv-ped-flecha"></i>
        </summary>
        <div class="pv-ped-lineas">${lineas || `<div class="pv-ped-linea"><span>—</span></div>`}</div>
      </details>`;
  }).join('');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${escapeHtml(p.nombre)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${pedidos.length ? `<p class="pv-ped-resumen">${pedidos.length} ${gl({es:pedidos.length === 1 ? 'pedido' : 'pedidos', ca:pedidos.length === 1 ? 'comanda' : 'comandes', en:pedidos.length === 1 ? 'order' : 'orders'})}${recibidos.length ? ` · ${fmtMoney(totalRecibido)} ${gl({es:'recibidos (con IVA)', ca:'rebuts (amb IVA)', en:'received (incl. VAT)'})}` : ''}</p>` : ''}
    <div class="pv-peds">${filas || `<div class="empty"><i class="ti ti-history"></i>${gl({es:'Todavía no hay pedidos a este proveedor.', ca:'Encara no hi ha comandes a aquest proveïdor.', en:'No orders to this supplier yet.'})}</div>`}</div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="openProviderInfoModal(${p.id})"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
      <button type="button" class="btn btn-fino" onclick="closeModal();viewSupplierOrderHistory('${escapeJsAttr(p.nombre)}')"><i class="ti ti-external-link"></i> ${gl({es:'Abrir en Pedidos', ca:'Obrir a Comandes', en:'Open in Orders'})}</button>
    </div>
  `);
}
function openSupplierIngredientsModal(providerId){
  const p = DB.providers.find(x=>x.id===providerId);
  if(!p) return;
  const ings = ingredientsForSupplier(p.nombre).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-list"></i> ${escapeHtml(p.nombre)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="pv-arts">
      ${ings.length ? ings.map(i => `
        <div class="pv-art">
          <span class="pv-art-n">${escapeHtml(i.name)}</span>
          <span class="pv-art-u">${escapeHtml(i.unit||'')}</span>
          <span class="pv-art-p">${fmtMoney(i.price)}</span>
        </div>
      `).join('') : `<div class="empty"><i class="ti ti-list"></i>${t('empty.suppliers')}</div>`}
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="openProviderInfoModal(${p.id})"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

// WhatsApp solo existe en móviles: un fijo (8xx/9xx en España) abría una conversación que nunca llega a nadie.
// Devuelve el número listo para wa.me (con prefijo de país) o '' si no es un móvil. Los españoles se reconocen por
// empezar en 6 o 7; un número de otro país no se puede juzgar desde aquí, así que se deja pasar.
function whatsappDeTelefono(tel){
  let n = String(tel||'').trim().replace(/[^\d+]/g,'');
  if(n.startsWith('00')) n = '+' + n.slice(2);
  const digitos = n.replace(/\D/g,'');
  let nacional = '';
  if(n.startsWith('+')){
    if(!digitos.startsWith('34')) return digitos.length >= 8 ? digitos : '';
    nacional = digitos.slice(2);
  }else if(digitos.length === 11 && digitos.startsWith('34')){
    nacional = digitos.slice(2);
  }else{
    nacional = digitos;
  }
  return /^[67]\d{8}$/.test(nacional) ? '34' + nacional : '';
}

// La forma de pago se guarda siempre en español (es el valor interno/histórico);
// esto solo traduce la etiqueta que se le muestra al usuario.
const PAGO_LABEL_KEYS = {'Contado':'pago.contado','Transferencia':'pago.transferencia','Recibo domiciliado':'pago.reciboDomiciliado','Otro':'pago.otro'};
function paymentMethodLabel(value){
  return PAGO_LABEL_KEYS[value] ? t(PAGO_LABEL_KEYS[value]) : (value||'');
}

// Devuelve los días de entrega de un proveedor como array, migrando el antiguo
// campo diaEntrega (un único día o "Varios días") al nuevo diasEntrega (array).
function getProviderDiasEntrega(p){
  if(Array.isArray(p.diasEntrega)) return p.diasEntrega;
  if(p.diaEntrega && WEEK_DAYS.includes(p.diaEntrega)) return [p.diaEntrega];
  return [];
}

function openProviderModal(id){
  const p = id ? DB.providers.find(x=>x.id===id) : {nombre:'',tel:'',email:'',contacto:'',pago:'Contado',dir:'',iban:'',notas:'',diaEntrega:'',horaEntrega:'',envioTipo:'',envioCoste:0,envioMinimo:0};
  const diasEntrega = getProviderDiasEntrega(p);
  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editSupplier'):t('title.newSupplier')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field"><label>${t('common.name')}</label><input type="text" id="prov-nombre" value="${escapeHtml(p.nombre)}" placeholder="${t('ph.egSupplierName')}"></div>
    <div class="field">
      <label for="prov-tipo">${gl({es:'Tipo de proveedor', ca:'Tipus de proveïdor', en:'Supplier type'})}</label>
      <select id="prov-tipo" onchange="onProviderTipoChange()">
        <option value="" ${!p.tipo ? 'selected' : ''}>${gl({es:'Sin tipo', ca:'Sense tipus', en:'No type'})}</option>
        ${providerTiposDisponibles().map(x => `<option value="${escapeHtml(x)}" ${p.tipo === x ? 'selected' : ''}>${escapeHtml(providerTipoLabel(x))}</option>`).join('')}
        <option value="__nuevo__">+ ${gl({es:'Otro tipo…', ca:'Un altre tipus…', en:'Another type…'})}</option>
      </select>
      <input type="text" id="prov-tipo-nuevo" maxlength="30" style="display:none;margin-top:8px" placeholder="${escapeHtml(gl({es:'Ej. Menaje, Congelados, Vinos…', ca:'Ex. Parament, Congelats, Vins…', en:'E.g. Tableware, Frozen, Wines…'}))}">
    </div>
    <div class="field-row">
      <div class="field"><label>${t('label.contactPerson')}</label><input type="text" id="prov-contacto" value="${escapeHtml(p.contacto)}"></div>
      <div class="field"><label>${t('label.paymentMethod')}</label>
        <select id="prov-pago">
          ${[['Contado','pago.contado'],['Transferencia','pago.transferencia'],['Recibo domiciliado','pago.reciboDomiciliado'],['Otro','pago.otro']].map(([o,key])=>`<option value="${o}" ${p.pago===o?'selected':''}>${t(key)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>${t('common.phone')}</label><input type="text" id="prov-tel" value="${escapeHtml(p.tel)}" placeholder="${t('ph.egPhone')}"></div>
      <div class="field"><label>${t('common.email')}</label><input type="email" id="prov-email" value="${escapeHtml(p.email)}"></div>
    </div>
    <div class="field">
      <label>${t('label.usualDeliveryDays')}</label>
      <div class="pv-dias">
        ${WEEK_DAYS.map((d,i)=>`
          <label class="pv-dia" title="${escapeHtml(weekDayFull(i))}">
            <input type="checkbox" id="prov-dia-entrega-${i}" value="${escapeHtml(d)}" ${diasEntrega.includes(d)?'checked':''}>
            <span>${escapeHtml(weekDayShort(i))}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="field"><label>${t('label.approxDeliveryTime')}</label><input type="time" id="prov-hora-entrega" value="${escapeHtml(p.horaEntrega||'')}"></div>
    <div class="field">
      <label>${t('label.shippingCost')}</label>
      <select id="prov-envio-tipo" onchange="toggleProviderEnvioFields()">
        <option value="" ${!p.envioTipo?'selected':''}>${t('label.shippingNone')}</option>
        <option value="fijo" ${p.envioTipo==='fijo'?'selected':''}>${t('label.shippingFixed')}</option>
        <option value="minimo" ${p.envioTipo==='minimo'?'selected':''}>${t('label.shippingMinimum')}</option>
      </select>
    </div>
    <div id="prov-envio-fields" class="field-row pv-envio" style="display:${p.envioTipo?'flex':'none'}">
      <div class="field" id="prov-envio-minimo-field" style="display:${p.envioTipo==='minimo'?'block':'none'}">
        <label>${t('label.shippingMinAmount')}</label>
        <input type="number" id="prov-envio-minimo" min="0" step="0.01" value="${p.envioMinimo||''}">
      </div>
      <div class="field">
        <label>${t('label.shippingFeeAmount')}</label>
        <input type="number" id="prov-envio-coste" min="0" step="0.01" value="${p.envioCoste||''}">
      </div>
    </div>
    <div class="field"><label>${t('common.address')}</label><input type="text" id="prov-dir" value="${escapeHtml(p.dir)}"></div>
    <div class="field"><label>IBAN</label><input type="text" id="prov-iban" value="${escapeHtml(p.iban)}"></div>
    <div class="field"><label>${t('common.notes')}</label><textarea id="prov-notas" rows="2">${escapeHtml(p.notas)}</textarea></div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button type="button" class="btn btn-fino is-on" onclick="saveProvider(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

function onProviderTipoChange(){
  const nuevo = document.getElementById('prov-tipo').value === '__nuevo__';
  const inp = document.getElementById('prov-tipo-nuevo');
  inp.style.display = nuevo ? '' : 'none';
  if(nuevo) inp.focus();
}
function toggleProviderEnvioFields(){
  const tipo = document.getElementById('prov-envio-tipo').value;
  document.getElementById('prov-envio-fields').style.display = tipo ? 'flex' : 'none';
  document.getElementById('prov-envio-minimo-field').style.display = tipo==='minimo' ? 'block' : 'none';
}

async function saveProvider(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const nombre = document.getElementById('prov-nombre').value.trim();
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  // El vínculo con los ingredientes de Mega Lista y con los pedidos es por
  // nombre exacto (no por id) — un proveedor duplicado con mayúsculas o
  // espacios distintos rompería ese vínculo en silencio, así que se avisa
  // (no bloqueante) si ya existe otro con el mismo nombre.
  const dupe = DB.providers.find(p => p.id !== id && (p.area||'cocina')===currentArea() && p.nombre.trim().toLowerCase() === nombre.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateSupplier').replace('${name}', dupe.nombre)))) return;
  let tipo = document.getElementById('prov-tipo').value;
  if(tipo === '__nuevo__') tipo = document.getElementById('prov-tipo-nuevo').value.trim();
  const data = {
    nombre,
    tipo,
    contacto: document.getElementById('prov-contacto').value.trim(),
    pago: document.getElementById('prov-pago').value,
    tel: document.getElementById('prov-tel').value.trim(),
    email: document.getElementById('prov-email').value.trim(),
    dir: document.getElementById('prov-dir').value.trim(),
    iban: document.getElementById('prov-iban').value.trim(),
    diasEntrega: WEEK_DAYS.filter((_,i)=>document.getElementById(`prov-dia-entrega-${i}`).checked),
    horaEntrega: document.getElementById('prov-hora-entrega').value,
    envioTipo: document.getElementById('prov-envio-tipo').value,
    envioCoste: parseFloat(document.getElementById('prov-envio-coste').value) || 0,
    envioMinimo: parseFloat(document.getElementById('prov-envio-minimo').value) || 0,
    notas: document.getElementById('prov-notas').value.trim()
  };
  if(id){
    const prov = DB.providers.find(p=>p.id===id);
    if(!prov) return;
    // El nombre del proveedor es la única forma en que sus ingredientes
    // (Mega Lista) y sus pedidos lo identifican — si se renombra aquí sin
    // más, esos ingredientes y pedidos se quedan huérfanos (ya no aparecen
    // como "de este proveedor") sin ningún aviso. Se propaga el cambio a
    // ambos para que el proveedor siga siendo el mismo, solo con otro nombre.
    const oldName = prov.nombre;
    if(oldName !== nombre){
      // Solo del área de ESTE proveedor: Cocina y Sala pueden tener,
      // por coincidencia, un proveedor con el mismo nombre.
      const provArea = prov.area || 'cocina';
      DB.ingredients.forEach(i => { if(i.supplier === oldName && (i.area||'cocina') === provArea) i.supplier = nombre; });
      (DB.purchaseOrders||[]).forEach(o => { if(o.supplier === oldName && (o.area||'cocina') === provArea) o.supplier = nombre; });
    }
    Object.assign(prov, data);
  }else{
    DB.providers.push({id: genId(), ...data, area: currentArea()});
  }
  saveDB();
  closeModal();
  renderProveedores();
  showToast(t('msg.supplierSaved'));
}

async function deleteProvider(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const p = DB.providers.find(x => x.id === id);
  if(!p) return;
  // Los ingredientes guardan el proveedor por NOMBRE (i.supplier), igual que
  // los pedidos — igual que saveProvider ya propaga un renombrado a esos
  // ingredientes/pedidos para no dejarlos huérfanos, borrar el proveedor sin
  // más los dejaría con un proveedor que ya no existe. En la ficha del
  // ingrediente eso hace que el desplegable no tenga ninguna opción
  // "selected" y el navegador seleccione la primera de la lista — si luego
  // se guarda ese ingrediente por cualquier otro motivo, queda reasignado a
  // OTRO proveedor sin que nadie lo haya elegido a propósito.
  const linkedCount = (DB.ingredients||[]).filter(i => (i.supplier||'').trim().toLowerCase() === p.nombre.trim().toLowerCase()).length;
  if(linkedCount > 0){
    showToast(t('msg.cannotDeleteSupplierLinked').replace('${count}', linkedCount));
    return;
  }
  if(!(await confirmModal(t('msg.confirmDeleteSupplier')))) return;
  DB.providers = DB.providers.filter(x=>x.id!==id);
  saveDB();
  renderProveedores();
}

function getProviderByName(name){
  return DB.providers.find(p => p.nombre.trim().toLowerCase() === (name||'').trim().toLowerCase());
}

// Coste de envío de un proveedor para un pedido de un importe (base, sin
// IVA) dado. 'fijo' se cobra siempre; 'minimo' solo si no se llega al
// importe pactado — por eso se calcula sobre lo PEDIDO (pedidoOrderedBase),
// no sobre lo finalmente recibido: es lo que el proveedor mira al preparar
// el envío, antes de saber si luego falta algo.
function providerShippingCost(provider, baseSubtotal){
  if(!provider || !provider.envioTipo) return 0;
  if(provider.envioTipo === 'fijo') return provider.envioCoste || 0;
  if(provider.envioTipo === 'minimo') return baseSubtotal >= (provider.envioMinimo||0) ? 0 : (provider.envioCoste || 0);
  return 0;
}
function pedidoOrderedBase(o){
  let base = 0;
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    if(ing) base += (line.cantidad||0) * (ing.price||0);
  });
  return base;
}

/* ============================================================
   PEDIDOS — Gestión de compras a proveedores
   ============================================================ */
const PEDIDO_ESTADOS = ['BORRADOR','ENVIADO','RECIBIDO'];
const PEDIDO_BADGE = {BORRADOR:'badge-gray', ENVIADO:'badge-amber', RECIBIDO:'badge-green'};
// El valor guardado (o.estado) es siempre esta clave fija en español (se usa
// para comparar/filtrar), pero se muestra traducida — mismo patrón que
// allergenLabel()/businessTypeLabel().
function pedidoEstadoLabel(estado){
  const dict = t('pedidoEstados.map');
  return (dict && dict[estado]) || estado;
}
// Función (no constante estática) para que las etiquetas se traduzcan siempre
// en el idioma activo en el momento de pintar, no en el de cargar el script.
function getPedidoComprobacionMap(){
  return {
    ok:    {label:`<i class="ti ti-check"></i> ${t('label.orderCheckOk')}`, cls:'badge-green'},
    falta: {label:`<i class="ti ti-alert-triangle"></i> ${t('label.orderCheckMissing')}`, cls:'badge-amber'},
    mal:   {label:`<i class="ti ti-x"></i> ${t('label.orderCheckBad')}`, cls:'badge-red'},
  };
}
let pedidoDetailId = null;

function getPurchaseOrder(id){ return DB.purchaseOrders.find(o => o.id === id); }

function pedidoSuppliers(){
  const fromProviders = DB.providers.filter(p => (p.area||'cocina') === currentArea()).map(p => p.nombre);
  const fromIngredients = DB.ingredients.filter(i => (i.area||'cocina') === currentArea()).map(i => i.supplier).filter(Boolean);
  return [...new Set([...fromProviders, ...fromIngredients])].sort();
}

let pedidosTab = 'crear';
// Desde la ficha de un proveedor, ir directo a su historial de pedidos ya
// filtrado — antes había que ir a mano a Pedidos > Historial y elegirlo del
// desplegable.
function viewSupplierOrderHistory(nombre){
  navigate('pedidos');
  setPedidosTab('historial');
  pedidoHistorialSupplierFilter = nombre;
  renderPedidos();
}
function setPedidosTab(tab){
  pedidosTab = tab;
  pedidoDetailId = null;
  if(tab === 'crear'){ orderModalSupplier = ''; orderModalLines = []; orderModalSearch = ''; orderFiltro = ''; }
  if(tab === 'solicitar'){ solicitudLines = []; solicitudSearch = ''; }
  renderPedidos();
}
function updatePedidosTabsUI(){
  const c = document.getElementById('pedidos-tab-crear');
  const sol = document.getElementById('pedidos-tab-solicitar');
  const h = document.getElementById('pedidos-tab-historial');
  if(c) c.classList.toggle('is-on', pedidosTab === 'crear');
  if(sol){
    // "Pedir lo que falta" es para quien NO puede hacer un pedido real
    // (sin permiso de editar): al dueño o al gerente no les aporta nada,
    // ellos ya tienen "Realizar Pedido" — mostrárselo era ruido, y además
    // era donde se veían las propias solicitudes que le llegan a ÉL, que
    // ahora se ven directamente encima de "Realizar Pedido".
    sol.style.display = editUnlocked ? 'none' : '';
    sol.classList.toggle('is-on', pedidosTab === 'solicitar');
  }
  if(h) h.classList.toggle('is-on', pedidosTab === 'historial');
}

function renderPedidos(){
  // Sin permiso de editar, "Realizar Pedido" no está disponible (el botón
  // ni siquiera se ve) — si por cualquier motivo quedó seleccionada esa
  // pestaña de una sesión anterior, se cae al historial en vez de dejar
  // ver el formulario de creación igualmente.
  if(pedidosTab === 'crear' && !editUnlocked) pedidosTab = 'historial';
  // Al revés: "solicitar" es solo de quien no puede editar — si el dueño o
  // el gerente se quedaron en esa pestaña de una sesión de empleado
  // anterior (mismo dispositivo, compartido), se cae a "Realizar Pedido".
  if(pedidosTab === 'solicitar' && editUnlocked) pedidosTab = 'crear';
  updatePedidosTabsUI();
  const o = pedidoDetailId && getPurchaseOrder(pedidoDetailId);
  if(o && (o.area||'cocina') === currentArea()){
    renderPedidoDetail();
  }else{
    pedidoDetailId = null;
    if(pedidosTab === 'crear') renderPedidoCrear();
    else if(pedidosTab === 'solicitar') renderPedidoSolicitar();
    else renderPedidoList();
  }
}

// Solicitudes de "lo que falta" hechas por cualquier empleado (sin permiso
// de editar no puede ni ver proveedores ni precios, así que no tiene
// sentido dejarle "Realizar Pedido" de verdad) — quedan pendientes de que
// el dueño o quien tenga permiso de editar (canUnlockEdit, el gerente de
// cocina/sala) las revise y haga el pedido real con ellas.
let solicitudLines = [];
let solicitudSearch = '';
let pedidoHistorialSupplierFilter = '';
let pedidoHistorialSearch = '';
function setPedidoHistorialSupplierFilter(val){
  pedidoHistorialSupplierFilter = val;
  renderPedidoList();
}
/* El historial pintaba TODOS los pedidos que ha habido nunca: con tres
   pedidos al día son mil tarjetas al año, y a los tres años la pantalla
   tarda en abrirse. Ahora se entra por el mes en curso — no se borra nada,
   solo se enseña un periodo cada vez (decisión del dueño, 12/09). Desde el
   30/10 el periodo se elige con el selector común (ggPeriodoHtml): un solo
   control con flechas de mes y, al abrirlo, los doce meses con cuántos
   pedidos hay en cada uno. `mes` null = el año entero. */
let pedidoHistorialYear = new Date().getFullYear();
let pedidoHistorialMonth = new Date().getMonth();
let pedidoHistorialEstado = '';          // '' = todos · 'BORRADOR' | 'ENVIADO' | 'RECIBIDO'
function setPedidoHistorialPeriodo(anio, mes){
  pedidoHistorialYear = anio;
  pedidoHistorialMonth = mes;
  renderPedidoList();
}
function setPedidoHistorialEstado(estado){
  pedidoHistorialEstado = (pedidoHistorialEstado === estado ? '' : estado);
  renderPedidoList();
}
// Periodo que se está mirando, como 'AAAA-MM' (o 'AAAA' si es el año entero): los pedidos guardan la fecha en ese
// mismo formato, así que basta con startsWith.
function pedidoHistorialMesStr(){
  return pedidoHistorialMonth == null ? String(pedidoHistorialYear) : `${pedidoHistorialYear}-${String(pedidoHistorialMonth+1).padStart(2,'0')}`;
}
// Como en el resto de listados (Proveedores, Stock, Mega Lista, Escandallo,
// Fichas), solo se repinta la lista de tarjetas de resultados, nunca el
// propio input, para que no pierda el foco al escribir letra a letra.
function setPedidoHistorialSearch(val){
  pedidoHistorialSearch = val.toLowerCase();
  renderPedidoResultsList();
}
function pedidoMatchesSearch(o, q){
  if(!q) return true;
  if(o.supplier.toLowerCase().includes(q)) return true;
  if((o.date||'').includes(q)) return true;
  return (o.items||[]).some(line => {
    const ing = getIngredient(line.ingredientId);
    return ing && ing.name.toLowerCase().includes(q);
  });
}
function renderPedidoList(){
  const box = document.getElementById('pedidos-list');
  const allOrders = DB.purchaseOrders.filter(o => (o.area||'cocina') === currentArea());
  const counts = {BORRADOR:0, ENVIADO:0, RECIBIDO:0};
  allOrders.forEach(o => { if(counts[o.estado] !== undefined) counts[o.estado]++; });

  if(!allOrders.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-shopping-cart"></i>${t('empty.noOrders')}</div>`;
    return;
  }

  // Un solo pedido sin proveedor (o sin fecha, más abajo) tumbaba la
  // pantalla ENTERA del historial con un error, dejando al dueño sin ver
  // ninguno de sus pedidos y sin ningún aviso de por qué. Es la misma
  // forma del fallo de Distribución del Trabajo: un dato suelto corrupto
  // que revienta al recorrer la lista. Se ordena a prueba de huecos.
  const suppliers = [...new Set(allOrders.map(o => o.supplier).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  // Cuántos pedidos hay en cada mes: el selector los enseña para ir directo a donde hay algo.
  const datos = {};
  allOrders.forEach(o => { const k = String(o.date||'').slice(0,7); if(k) datos[k] = (datos[k]||0) + 1; });
  const chip = (clave, etiqueta, n) => `<button type="button" class="btn btn-sm btn-fino${pedidoHistorialEstado === clave ? ' is-on' : ''}" aria-pressed="${pedidoHistorialEstado === clave}" onclick="setPedidoHistorialEstado('${clave}')">${etiqueta} <span class="ml-n">${n}</span></button>`;
  box.innerHTML = `
    <div class="pe-barra">
      ${ggPeriodoHtml({anio: pedidoHistorialYear, mes: pedidoHistorialMonth, cb:'setPedidoHistorialPeriodo', datos, anual:true})}
      <div class="pe-estados">
        ${chip('BORRADOR', t('label.drafts'), counts.BORRADOR)}
        ${chip('ENVIADO', t('label.sentOrders'), counts.ENVIADO)}
        ${chip('RECIBIDO', t('label.receivedOrders'), counts.RECIBIDO)}
      </div>
    </div>
    <div class="toolbar es-filtros pe-filtros">
      <div class="left">
        <input type="text" class="search-input es-buscar" value="${escapeHtml(pedidoHistorialSearch)}" placeholder="${t('ph.searchOrder')}" oninput="setPedidoHistorialSearch(this.value)">
        <select id="pedido-historial-supplier-filter" class="es-filtro" onchange="setPedidoHistorialSupplierFilter(this.value)">
          <option value="">${t('label.allSuppliers')}</option>
          ${suppliers.map(s => `<option value="${escapeHtml(s)}" ${pedidoHistorialSupplierFilter===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="pedido-results"></div>`;
  renderPedidoResultsList();
}

// Solicitudes de "lo que falta" pendientes de revisar — solo las ve quien
// puede de verdad hacer algo con ellas (el dueño o el gerente con permiso
// de editar): a un empleado normal enseñarle las de sus compañeros no le
// sirve de nada y es información que no le corresponde.
function renderPedidoSolicitudesPendientesHtml(){
  if(!editUnlocked) return '';
  const pendientes = (DB.pedidoSolicitudes||[]).filter(s => s.status==='pending' && (s.area||'cocina')===currentArea());
  if(!pendientes.length) return '';
  return `
    <section class="es-card pc-solicitudes">
      <h3 class="es-tit"><i class="ti ti-clipboard-list"></i> ${t('pedido.pendingRequestsTitle')} <span class="ml-n">${pendientes.length}</span></h3>
      ${pendientes.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).map(s => {
        const emp = DB.employees.find(e=>e.id===s.employeeId);
        return `
        <div class="pc-sol">
          <div class="pc-sol-cab"><b>${escapeHtml(emp?emp.name:'?')}</b><span>${fmtDateTime(new Date(s.createdAt))}</span></div>
          <ul class="pc-sol-lista">
            ${(s.items||[]).map(i => `<li>${escapeHtml(i.name)}${i.cantidad?` <b>${fmtNum(i.cantidad)} ${escapeHtml(i.unit||'')}</b>`:''}</li>`).join('')}
          </ul>
          ${s.notas ? `<div class="pc-sol-notas">${escapeHtml(s.notas)}</div>` : ''}
          <button type="button" class="btn btn-sm btn-fino" onclick="markPedidoSolicitudAtendida(${s.id})"><i class="ti ti-check"></i> ${t('pedido.markHandled')}</button>
        </div>`;
      }).join('')}
    </section>`;
}
// Se borra de verdad, no se marca "atendida" y se deja ahí: al empleado le
// quedaba fija en "Tus solicitudes" para siempre aunque ya estuviera hecha,
// sin ninguna forma de quitarla. Una vez atendida ya cumplió su función
// (avisar), así que no hace falta guardar el historial.
function markPedidoSolicitudAtendida(id){
  if(!editUnlocked) return;
  const s = (DB.pedidoSolicitudes||[]).find(x=>x.id===id);
  if(!s) return;
  DB.pedidoSolicitudes = DB.pedidoSolicitudes.filter(x=>x.id!==id);
  saveDB();
  showToast(t('pedido.requestHandledOk'));
  renderPedidos();
}

/* ---- "Pedir lo que falta": lo puede usar cualquiera, incluso sin permiso
   de editar — no es un pedido real (no toca proveedores ni precios), solo
   una lista de lo que hace falta para que el dueño o el gerente hagan el
   pedido de verdad. ---- */
function renderPedidoSolicitar(){
  const box = document.getElementById('pedidos-list');
  // El buscador solo repinta su propia lista de resultados (#solicitud-
  // matches), nunca el cuadro entero — igual que en Proveedores/Stock/Mega
  // Lista/Escandallo/Fichas: si no, se pierde el foco al escribir letra a
  // letra.
  box.innerHTML = `
    <section class="es-card pc-solicitar">
      <p class="es-nota"><i class="ti ti-info-circle"></i> ${t('pedido.requestDesc')}</p>
      <div class="field">
        <label for="solicitud-search-input">${t('pedido.searchToAdd')}</label>
        <div class="es-anadir-buscar">
          <i class="ti ti-search"></i>
          <input type="text" class="search-input" id="solicitud-search-input" value="${escapeHtml(solicitudSearch)}" placeholder="${t('ph.searchArticle')}" oninput="updateSolicitudSearch(this.value)">
        </div>
      </div>
      <div id="solicitud-matches"></div>
      <div id="solicitud-cart"></div>
      <div class="field">
        <label for="solicitud-notas">${t('pedido.notesLabel')}</label>
        <textarea id="solicitud-notas" rows="2" placeholder="${t('ph.solicitudNotes')}"></textarea>
      </div>
      <button type="button" class="btn btn-fino is-on" onclick="submitPedidoSolicitud()"><i class="ti ti-send"></i> ${t('pedido.sendRequestBtn')}</button>
    </section>
    <div id="solicitud-mine"></div>
  `;
  renderSolicitudMatches();
  renderSolicitudCart();
  renderSolicitudMine();
}
function renderSolicitudMatches(){
  const box = document.getElementById('solicitud-matches');
  if(!box) return;
  const area = currentArea();
  const search = solicitudSearch.toLowerCase();
  const matches = search ? DB.ingredients.filter(i => (i.area||'cocina')===area && i.activo!==false && i.name.toLowerCase().includes(search) && !solicitudLines.some(l=>l.ingredientId===i.id)).slice(0,12) : [];
  box.innerHTML = matches.length ? `<div class="pc-res">${matches.map(i => `
      <div class="pc-res-fila">
        <span>${escapeHtml(i.name)} <small>${escapeHtml(i.unit||'')}</small></span>
        <button type="button" class="btn btn-sm btn-fino" onclick="addSolicitudLine(${i.id})"><i class="ti ti-plus"></i> ${t('common.add')}</button>
      </div>`).join('')}</div>` : '';
}
function renderSolicitudCart(){
  const box = document.getElementById('solicitud-cart');
  if(!box) return;
  box.innerHTML = solicitudLines.length ? `<div class="pc-cesta">
      ${solicitudLines.map((l,idx) => `
        <div class="pc-cesta-fila">
          <span class="pc-cesta-nom">${escapeHtml(l.name)}</span>
          <div class="pc-qty">
            <button type="button" class="btn btn-fino" aria-label="−" onclick="stepSolicitudQty(${idx}, -1)"><i class="ti ti-minus"></i></button>
            <input type="number" min="0" step="0.01" value="${l.cantidad}" aria-label="${t('common.qty')}" onchange="updateSolicitudQty(${idx}, this.value)">
            <button type="button" class="btn btn-fino" aria-label="+" onclick="stepSolicitudQty(${idx}, 1)"><i class="ti ti-plus"></i></button>
            <span class="pc-qty-u">${escapeHtml(l.unit||'')}</span>
          </div>
          ${ggMenuAcciones([{icono:'ti-trash', texto:gl({es:'Quitar de la lista', ca:'Treure de la llista', en:'Remove from list'}), fn:`removeSolicitudLine(${idx})`, peligro:true}])}
        </div>`).join('')}
    </div>` : `<div class="empty"><i class="ti ti-clipboard-list"></i>${t('pedido.noItemsYet')}</div>`;
}
function stepSolicitudQty(idx, dir){
  const l = solicitudLines[idx];
  if(!l) return;
  l.cantidad = Math.max(0, Math.round(((parseFloat(l.cantidad)||0) + dir) * 100) / 100);
  renderSolicitudCart();
}
function renderSolicitudMine(){
  const box = document.getElementById('solicitud-mine');
  if(!box) return;
  const area = currentArea();
  const misSolicitudes = (DB.pedidoSolicitudes||[]).filter(s => (s.area||'cocina')===area && s.employeeId===loggedInEmployeeId()).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  box.innerHTML = misSolicitudes.length ? `
    <section class="es-card" style="margin-top:16px">
      <h3 class="es-tit"><i class="ti ti-history"></i> ${t('pedido.myRequestsTitle')}</h3>
      ${misSolicitudes.slice(0,5).map(s => `<div class="pc-mia">${fmtDateTime(new Date(s.createdAt))} <span>${(s.items||[]).length} ${t('noun.products')}</span> <b>${s.status==='pending' ? t('vacation.statusPending') : t('pedido.statusHandled')}</b></div>`).join('')}
    </section>` : '';
}
function updateSolicitudSearch(val){
  solicitudSearch = val;
  renderSolicitudMatches();
}
function addSolicitudLine(ingredientId){
  const ing = getIngredient(ingredientId);
  if(!ing) return;
  solicitudLines.push({ingredientId, name: ing.name, unit: ing.unit, cantidad: 1});
  solicitudSearch = '';
  const inp = document.getElementById('solicitud-search-input');
  if(inp) inp.value = '';
  renderSolicitudMatches();
  renderSolicitudCart();
}
function updateSolicitudQty(idx, val){
  const line = solicitudLines[idx];
  if(!line) return;
  line.cantidad = Math.max(0, parseFloat(val)||0);
}
function removeSolicitudLine(idx){
  solicitudLines.splice(idx, 1);
  renderSolicitudCart();
}
function submitPedidoSolicitud(){
  const notas = (document.getElementById('solicitud-notas')||{}).value || '';
  const items = solicitudLines.filter(l => l.cantidad > 0).map(l => ({name:l.name, unit:l.unit, cantidad:l.cantidad}));
  if(!items.length && !notas.trim()){ showToast(t('pedido.emptyRequest')); return; }
  if(!DB.pedidoSolicitudes) DB.pedidoSolicitudes = [];
  const session = getAccessSession();
  const employeeId = session && session.type==='employee' ? session.employeeId : null;
  DB.pedidoSolicitudes.push({id: genId(), employeeId, area: currentArea(), items, notas: notas.trim(), status:'pending', createdAt: new Date().toISOString()});
  saveDB();
  solicitudLines = [];
  solicitudSearch = '';
  showToast(t('pedido.requestSentOk'));
  renderPedidos();
}

function renderPedidoResultsList(){
  const box = document.getElementById('pedido-results');
  if(!box) return;
  const allOrders = DB.purchaseOrders.filter(o => (o.area||'cocina') === currentArea());
  const periodo = pedidoHistorialMesStr();
  /* Un pedido en BORRADOR o ENVIADO no es historial: es trabajo a medias, y
     el que se envió el 30 y llega el 2 no puede desaparecer de la pantalla
     al cambiar de mes. Por eso el periodo solo filtra los RECIBIDOS; lo que
     sigue pendiente se ve siempre, se pidiera cuando se pidiera. */
  const delMes = o => o.estado !== 'RECIBIDO' || String(o.date||'').startsWith(periodo);
  const coincide = o =>
    (!pedidoHistorialSupplierFilter || o.supplier === pedidoHistorialSupplierFilter) &&
    (!pedidoHistorialEstado || o.estado === pedidoHistorialEstado) &&
    pedidoMatchesSearch(o, pedidoHistorialSearch);
  const orders = allOrders.filter(o => delMes(o) && coincide(o));
  /* Buscar algo que está en otro mes no puede devolver "sin resultados" a
     secas: se dice cuántos hay fuera del periodo que se está mirando. Solo
     cuando se está buscando o filtrando de verdad — si no, el aviso saldría
     siempre (hay pedidos de otros meses casi por definición) y se acabaría
     leyendo como parte del decorado. */
  const buscando = !!pedidoHistorialSearch || !!pedidoHistorialSupplierFilter || !!pedidoHistorialEstado;
  const fuera = buscando ? allOrders.filter(o => !delMes(o) && coincide(o)).length : 0;
  const avisoFuera = fuera
    ? `<div class="pe-aviso"><i class="ti ti-info-circle"></i> ${t(fuera===1 ? 'pedido.matchesOtherMonthsOne' : 'pedido.matchesOtherMonths').replace('${n}', fuera)}</div>`
    : '';
  if(!orders.length){
    box.innerHTML = avisoFuera + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  const totalFiltrado = orders.reduce((sum,o) => sum + pedidoTotalConIva(o), 0);
  const sorted = orders.slice().sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
  box.innerHTML = avisoFuera + `
    <div class="pe-total"><span>${orders.length} ${gl({es:orders.length === 1 ? 'pedido' : 'pedidos', ca:orders.length === 1 ? 'comanda' : 'comandes', en:orders.length === 1 ? 'order' : 'orders'})}</span><span>${t('label.totalFiltered')}: <b>${fmtMoney(totalFiltrado)}</b></span></div>
    <div class="es-platos pe-lista">${sorted.map(pedidoTarjetaHtml).join('')}</div>`;
}

// Una tarjeta por pedido: a quién, para cuándo, en qué punto está y cuánto es. Pulsarla abre su hoja.
function pedidoTarjetaHtml(o){
  const itemCount = (o.items||[]).length;
  const comp = getPedidoComprobacionMap()[o.comprobacion];
  const dias = o.estado === 'ENVIADO' ? daysSincePedidoEnviado(o) : null;
  const k = (et, v) => `<span class="es-cifra"><i>${et}</i><b>${v}</b></span>`;
  return `
    <article class="es-plato pe-ped pe-${String(o.estado||'').toLowerCase()}" role="button" tabindex="0" onclick="openPedido(${o.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPedido(${o.id})}">
      <div class="es-plato-cab">
        <i class="ti ti-truck-delivery es-plato-ico"></i>
        <div class="es-plato-nom">${escapeHtml(o.supplier || '—')}</div>
        ${ggMenuAcciones([
          {icono:'ti-file-text', texto:gl({es:'Abrir', ca:'Obrir', en:'Open'}), fn:`openPedido(${o.id})`},
          {icono:'ti-copy', texto:t('btn.duplicateOrder'), fn:`duplicateOrder(${o.id})`, owner:true},
          // Un pedido RECIBIDO ya no se borra: sumó stock y generó un gasto real, y es el papel que justifica esa compra
          // ante el gestor o una inspección. Si la recepción se marcó por error, la salida es «Deshacer recepción»
          // dentro del pedido (decisión del dueño, 12/09).
          o.estado !== 'RECIBIDO' ? {icono:'ti-trash', texto:t('common.delete'), fn:`deleteOrder(${o.id})`, peligro:true, owner:true} : null
        ].filter(Boolean))}
      </div>
      <div class="es-plato-insignias">
        <span class="badge ${PEDIDO_BADGE[o.estado]||'badge-gray'}">${pedidoEstadoLabel(o.estado)}</span>
        ${dias != null && dias > 0 ? `<span class="badge ${dias>=3?'badge-red':'badge-amber'}">${t('label.daysSinceSent').replace('${days}', dias)}</span>` : ''}
        ${comp ? `<span class="badge ${comp.cls}">${comp.label}</span>` : ''}
      </div>
      <div class="es-plato-cifras">
        ${k(gl({es:'Entrega', ca:'Lliurament', en:'Delivery'}), escapeHtml(o.date || '—'))}
        ${k(gl({es:'Artículos', ca:'Articles', en:'Items'}), itemCount)}
        ${k(t('common.total'), fmtMoney(pedidoTotalConIva(o)))}
      </div>
    </article>`;
}

function openPedido(id){
  pedidoDetailId = id;
  pedidosTab = 'historial';
  updatePedidosTabsUI();
  renderPedidoDetail();
  scrollContentToTop();
}

function backToPedidoList(){
  pedidoDetailId = null;
  renderPedidoList();
}

// Desglose de base imponible/IVA/total de un pedido a proveedor, agrupado
// por tipo de IVA — cada ingrediente lleva su propio tipo (elegido en Mega
// Lista), así que un mismo pedido puede mezclar productos al 10% y al 21%
// sin que el desglose salga mal. El precio del ingrediente (ing.price) es
// la base sin IVA: aquí se le AÑADE el IVA de cada uno, no se extrae de un
// total que ya lo llevara incluido.
// Total del pedido (base + IVA de cada ingrediente), usado en el histórico
// para no tener que entrar en cada pedido para saber cuánto costó.
function pedidoTotalConIva(o){
  const isRecibido = o.estado === 'RECIBIDO';
  let total = 0;
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    if(!ing) return;
    const qty = isRecibido ? (line.cantidadRecibida!=null ? line.cantidadRecibida : 0) : (line.cantidad||0);
    const base = qty * (ing.price||0);
    if(base <= 0) return;
    const ivaPct = ing.iva != null ? ing.iva : 0;
    total += base * (1 + ivaPct/100);
  });
  total += providerShippingCost(getProviderByName(o.supplier), pedidoOrderedBase(o));
  return total;
}

// Días transcurridos desde que un pedido se marcó como Enviado — para poder
// avisar visualmente de un pedido que lleva mucho tiempo sin confirmarse ni
// recibirse (antes no había ninguna forma de detectar esto de un vistazo).
function daysSincePedidoEnviado(o){
  if(!o.enviadoEn) return null;
  return Math.floor((new Date(todayStr()) - new Date(o.enviadoEn)) / 86400000);
}

function renderPedidoIvaBreakdownHtml(o, isRecibido){
  const groups = {}; // ivaPct -> base
  let missingIva = false;
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    if(!ing) return;
    const qty = isRecibido ? (line.cantidadRecibida!=null ? line.cantidadRecibida : 0) : (line.cantidad||0);
    const base = qty * (ing.price||0);
    if(base <= 0) return;
    if(ing.iva == null){ missingIva = true; return; }
    groups[ing.iva] = (groups[ing.iva]||0) + base;
  });
  const rates = Object.keys(groups).map(Number).sort((a,b)=>b-a);
  if(!rates.length && !missingIva) return '';
  const totalBase = rates.reduce((s,r)=>s+groups[r], 0);
  const totalIva = rates.reduce((s,r)=>s+groups[r]*r/100, 0);
  const envio = providerShippingCost(getProviderByName(o.supplier), pedidoOrderedBase(o));
  return `
  <div class="pd-totales">
    ${rates.map(r => `
      <div><span>${t('label.taxBase')} ${r}%</span><b>${fmtMoney(groups[r])}</b></div>
      <div><span>${t('label.vat')} ${r}%</span><b>${fmtMoney(groups[r]*r/100)}</b></div>`).join('')}
    ${envio > 0 ? `<div><span>${t('label.shipping')}</span><b>${fmtMoney(envio)}</b></div>` : ''}
    ${rates.length ? `<div class="pd-total"><span>${t('common.total')}</span><b>${fmtMoney(totalBase+totalIva+envio)}</b></div>` : ''}
    ${missingIva ? `<p class="pd-falta"><i class="ti ti-alert-triangle"></i> ${t('msg.someIngredientsMissingIva')}</p>` : ''}
  </div>`;
}

const PEDIDO_PASOS = ['BORRADOR','ENVIADO','RECIBIDO'];
function renderPedidoDetail(){
  const o = getPurchaseOrder(pedidoDetailId);
  const box = document.getElementById('pedidos-list');
  if(!o){ pedidoDetailId = null; renderPedidoList(); return; }

  const isRecibido = o.estado === 'RECIBIDO';
  const showRecepcion = o.estado === 'ENVIADO' || o.estado === 'RECIBIDO';
  const r = o.recepcion || {};
  const items = o.items || [];

  // El checklist de recepción se ve en cuanto el pedido está Enviado (para
  // poder ir marcando mientras llega la mercancía), no solo tras marcarlo
  // Recibido. Cada línea nace sin revisar (ni tick ni cruz): es el personal
  // quien tiene que comprobar cada artículo y pulsar uno de los dos botones,
  // no algo que se dé por hecho de antemano. Tick = llegó todo bien (se
  // cuenta la cantidad pedida entera). Cruz = algo no fue bien — se anota el
  // motivo en la nota (falta cantidad, caducado, mal estado...) y no se
  // cuenta nada de esa línea para stock/gasto; no hace falta un número de
  // "cantidad recibida" aparte, la nota ya lo explica.
  const canEditChecklist = !isRecibido || editUnlocked;
  const itemsHtml = items.map((line, idx) => {
    const ing = getIngredient(line.ingredientId);
    const state = line.recibidoCheck; // true=OK, false=problema, undefined=sin revisar
    const pa = ing ? (line.precioAlbaran != null ? line.precioAlbaran : (ing.price || 0)) : 0;
    const distinto = ing && line.precioAlbaran != null && Math.abs(line.precioAlbaran - (ing.price || 0)) > 0.0001;
    return `
      <div class="pd-linea plegable${state === true ? ' ok' : state === false ? ' mal' : ''}${ggPlegableAbierta('pdl-' + idx) ? ' is-abierta' : ''}" data-pl="pdl-${idx}"${showRecepcion ? ' onclick="ggTogglePlegable(event, this)"' : ''}>
        <div class="pd-l-nom"><b>${ing ? escapeHtml(ing.name) : '—'}</b>${ing && ing.activo === false ? ` <span class="badge badge-gray txt-xs">${t('label.discontinued')}</span>` : ''}</div>
        <div class="pd-l-qty" data-et="${escapeHtml(t('label.ordered'))}">
          ${editUnlocked
            ? `<input type="number" class="es-in" value="${line.cantidad}" step="0.01" min="0" aria-label="${escapeHtml(t('label.ordered'))}" onchange="updatePedidoItem(${idx}, 'cantidad', this.value)">`
            : `<b class="pd-l-fija">${fmtNum(line.cantidad)}</b>`}
          <span class="es-l-u">${ing ? escapeHtml(ing.unit) : ''}</span>
        </div>
        ${showRecepcion ? `
        <div class="pd-l-rec">
          <button type="button" class="btn btn-fino pd-ck${state === true ? ' is-ok' : ''}" title="${escapeHtml(t('label.arrived'))}" aria-label="${escapeHtml(t('label.arrived'))}" aria-pressed="${state === true}" ${canEditChecklist ? '' : 'disabled'} onclick="event.stopPropagation();toggleRecepcionCheck(${idx}, true)"><i class="ti ti-check"></i></button>
          <button type="button" class="btn btn-fino pd-ck${state === false ? ' is-mal' : ''}" title="${escapeHtml(t('label.notArrived'))}" aria-label="${escapeHtml(t('label.notArrived'))}" aria-pressed="${state === false}" ${canEditChecklist ? '' : 'disabled'} onclick="event.stopPropagation();toggleRecepcionCheck(${idx}, false)"><i class="ti ti-x"></i></button>
        </div>
        <button type="button" class="pl-chev" aria-expanded="${ggPlegableAbierta('pdl-' + idx)}" aria-label="${escapeHtml(gl({es:'Ver el resto', ca:'Veure la resta', en:'Show more'}))}" onclick="event.stopPropagation();ggTogglePlegable(event, this.closest('.plegable'))"><i class="ti ti-chevron-down"></i></button>
        <div class="pd-l-precio pl-extra" data-et="${escapeHtml(t('precios.albaranLabel'))}" title="${escapeHtml(t('precios.albaranHint'))}">
          ${ing && !isRecibido && canEditChecklist ? `
            <input type="number" class="es-in${distinto ? ' is-distinto' : ''}" step="0.01" min="0" value="${pa}" aria-label="${escapeHtml(t('precios.albaranLabel'))}" onchange="updatePedidoLinePrecio(${idx}, this.value)"><span class="es-l-u">€/${escapeHtml(ing.unit)}</span>
            ${distinto ? `<span class="pd-delta">${line.precioAlbaran > (ing.price || 0) ? '▲' : '▼'} ${fmtNum(Math.abs((line.precioAlbaran - (ing.price || 0)) / (ing.price || 1) * 100), 1)} %</span>` : ''}`
          : `<span class="es-pista">${ing ? fmtMoney(line.precioCompra != null ? line.precioCompra : (ing.price || 0)) + '/' + escapeHtml(ing.unit) : '—'}</span>`}
        </div>
        <div class="pd-l-nota pl-extra" data-et="${escapeHtml(t('ph.receptionNote'))}">
          <input type="text" class="es-in" placeholder="${escapeHtml(t('ph.receptionNote'))}" aria-label="${escapeHtml(t('ph.receptionNote'))}" value="${escapeHtml(line.notaRecepcion||'')}" ${canEditChecklist ? '' : 'disabled'} onchange="updatePedidoLineNota(${idx}, this.value)">
        </div>` : ''}
      </div>`;
  }).join('');

  const dias = o.estado==='ENVIADO' ? daysSincePedidoEnviado(o) : null;
  const checkedCount = items.filter(l => l.recibidoCheck === true).length;
  const comp = getPedidoComprobacionMap()[o.comprobacion || pedidoComprobacionAuto(o)];
  const idx0 = PEDIDO_PASOS.indexOf(o.estado);
  const pasos = PEDIDO_PASOS.map((e, i) => `<li class="${i < idx0 ? 'hecho' : i === idx0 ? 'actual' : ''}"><i class="ti ${i < idx0 || (i === idx0 && e === 'RECIBIDO') ? 'ti-circle-check' : i === idx0 ? 'ti-circle-dot' : 'ti-circle'}"></i><span>${pedidoEstadoLabel(e)}</span></li>`).join('');
  const prov = getProviderByName(o.supplier);
  const puedeWa = !prov || !prov.tel || whatsappDeTelefono(prov.tel);

  box.innerHTML = `
    <div class="es-barra">
      <button type="button" class="btn btn-sm btn-fino" onclick="backToPedidoList()"><i class="ti ti-arrow-left"></i> ${t('btn.backToOrders')}</button>
      <div class="es-barra-titulo">${t('label.purchaseOrder')}</div>
      <div class="es-barra-der">
        ${o.estado==='BORRADOR' ? `<button type="button" class="btn btn-fino is-on" onclick="changePedidoEstado('ENVIADO')"><i class="ti ti-send"></i> ${t('btn.markSent')}</button>` : ''}
        ${o.estado==='ENVIADO' ? `<button type="button" class="btn btn-fino is-on" onclick="changePedidoEstado('RECIBIDO')"><i class="ti ti-check"></i> ${t('btn.markReceived')}</button>` : ''}
        ${puedeWa ? `<button type="button" class="btn btn-fino" onclick="sendPedidoWhatsapp()"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
        <button type="button" class="btn btn-fino" onclick="sendPedidoEmail()"><i class="ti ti-mail"></i> Email</button>
        <button type="button" class="btn btn-fino" onclick="printPedido()"><i class="ti ti-printer"></i> ${t('common.print')}</button>
        ${ggMenuAcciones([
          {icono:'ti-copy', texto:t('btn.duplicateOrder'), fn:`duplicateOrder(${o.id})`, owner:true},
          o.estado === 'RECIBIDO' ? {icono:'ti-arrow-back-up', texto:t('btn.revertReception'), fn:`revertPedidoRecepcion(${o.id})`, owner:true} : null,
          o.estado !== 'RECIBIDO' ? {icono:'ti-trash', texto:t('common.delete'), fn:`deleteOrder(${o.id})`, peligro:true, owner:true} : null
        ].filter(Boolean))}
      </div>
    </div>

    <div class="es-hoja lat-ultimo">
      <div class="es-principal">
        <section class="es-card pd-cab">
          <div class="pd-cab-t">
            <h2 class="pd-prov"><i class="ti ti-truck-delivery"></i> ${escapeHtml(o.supplier)}</h2>
            <div class="pd-fechas">
              <span><i>${t('label.deliveryDate')}</i><b>${escapeHtml(o.date || '—')}</b></span>
              ${o.enviadoEn ? `<span><i>${gl({es:'Enviado el', ca:'Enviat el', en:'Sent on'})}</i><b>${escapeHtml(o.enviadoEn)}</b></span>` : ''}
              ${isRecibido && o.recibidoPor ? `<span><i>${t('label.receivedBy')}</i><b>${escapeHtml(o.recibidoPor)}</b></span>` : ''}
            </div>
          </div>
          <ol class="pd-pasos" aria-label="${escapeHtml(gl({es:'Estado del pedido', ca:'Estat de la comanda', en:'Order status'}))}">${pasos}</ol>
          ${dias != null && dias > 0 ? `<span class="badge ${dias>=3?'badge-red':'badge-amber'}">${t('label.daysSinceSent').replace('${days}', dias)}</span>` : ''}
        </section>

        <section class="es-card">
          <h3 class="es-tit">${gl({es:'Artículos', ca:'Articles', en:'Items'})} <span class="fi-para">${items.length}</span></h3>
          ${showRecepcion ? `<p class="es-nota"><i class="ti ti-info-circle"></i> ${t('label.orderCheckHelp')}</p>` : ''}
          <div class="pd-lineas${showRecepcion ? ' con-rec' : ''}">
            ${showRecepcion ? `<div class="pd-lcab"><span>${t('label.ingredient')}</span><span>${t('label.ordered')}</span><span>${t('title.orderCheck')}</span><span>${t('precios.albaranLabel')}</span><span>${t('ph.receptionNote')}</span></div>` : ''}
            ${itemsHtml || `<div class="empty es-vacio"><i class="ti ti-basket"></i>${t('empty.noItems')}</div>`}
          </div>
        </section>

        ${showRecepcion ? `
        <section class="es-card">
          <h3 class="es-tit"><i class="ti ti-clipboard-check"></i> ${t('title.receptionAppcc')}</h3>
          <div class="field-row">
            <div class="field"><label for="rec-fecha">${t('common.date')}</label><input type="date" id="rec-fecha" value="${r.fecha||todayStr()}"></div>
            <div class="field"><label for="rec-hora">${t('common.time')}</label><input type="time" id="rec-hora" value="${r.hora||''}"></div>
            <div class="field"><label for="rec-temp">${t('label.tempC')}</label><input type="number" step="0.1" id="rec-temp" value="${r.temp!=null?r.temp:''}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="rec-condicion">${t('label.productCondition')}</label>
              <select id="rec-condicion">
                <option value="OK" ${r.condicion==='OK'||!r.condicion?'selected':''}>${t('label.ok')}</option>
                <option value="NO CONFORME" ${r.condicion==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
              </select>
            </div>
            <div class="field"><label for="rec-caducidad">${t('label.expiryConsumeDate')}</label>
              <select id="rec-caducidad">
                <option value="OK" ${r.caducidad==='OK'||!r.caducidad?'selected':''}>${t('label.ok')}</option>
                <option value="NO CONFORME" ${r.caducidad==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
              </select>
            </div>
            <div class="field"><label for="rec-albaran">${t('label.matchesDeliveryNote')}</label>
              <select id="rec-albaran">
                <option value="OK" ${r.albaran==='OK'||!r.albaran?'selected':''}>${t('label.ok')}</option>
                <option value="NO CONFORME" ${r.albaran==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label for="rec-resp">${t('label.responsible')}</label><input type="text" id="rec-resp" value="${escapeHtml(r.responsable||'')}"></div>
            <div class="field"><label for="rec-obs">${t('label.observations')}</label><textarea id="rec-obs" rows="2">${escapeHtml(r.obs||'')}</textarea></div>
          </div>
          <button type="button" class="btn btn-fino" onclick="savePedidoRecepcion()"><i class="ti ti-device-floppy"></i> ${t('btn.saveReception')}</button>
        </section>

        <section class="es-card">
          <h3 class="es-tit"><i class="ti ti-paperclip"></i> ${t('albaran.attachLabel')}</h3>
          ${o.albaranFile ? `
            <div class="pd-albaran">
              ${o.albaranFile.dataUrl.startsWith('data:image') ? `<img src="${o.albaranFile.dataUrl}" alt="">` : `<a href="${o.albaranFile.dataUrl}" download="${escapeHtml(o.albaranFile.name||'albaran')}"><i class="ti ti-file"></i> ${escapeHtml(o.albaranFile.name||'albarán')}</a>`}
              ${ggMenuAcciones([{icono:'ti-trash', texto:t('common.delete'), fn:'removeAlbaranFile()', peligro:true}])}
            </div>
          ` : `<input type="file" id="albaran-file-input" accept="image/*,application/pdf" onchange="handleAlbaranUpload(this)">`}
          <small class="es-pista">${t('albaran.attachHint')}</small>
        </section>
        ${pfTarjetaHtml(o)}
        ` : ''}
      </div>

      <aside class="es-lateral">
        <section class="es-card">
          <h3 class="es-tit">${t('common.total')}</h3>
          <div class="es-kpis"><div class="es-kpi"><span class="es-kpi-et">${isRecibido ? t('label.receivedOrders') : t('label.purchaseOrder')}</span><b>${fmtMoney(pedidoTotalConIva(o))}</b></div></div>
          ${renderPedidoIvaBreakdownHtml(o, isRecibido) || `<p class="es-pista">${t('empty.noArticlesYet')}</p>`}
        </section>
        ${showRecepcion ? `
        <section class="es-card">
          <h3 class="es-tit">${t('title.orderCheck')}</h3>
          <div class="pd-prog"><b>${checkedCount}/${items.length}</b> <span>${t('label.itemsConfirmedArrived')}</span></div>
          <div class="pd-barra"><i style="width:${items.length ? Math.round(checkedCount / items.length * 100) : 0}%"></i></div>
          ${comp ? `<span class="badge ${comp.cls}">${comp.label}</span>` : ''}
        </section>` : ''}
        <section class="es-card">
          <h3 class="es-tit">${t('common.notes')}</h3>
          <textarea id="pedido-notas" rows="3" onchange="updatePedidoNotas(this.value)">${escapeHtml(o.notas||'')}</textarea>
        </section>
      </aside>
    </div>
  `;
}

function updatePedidoItem(idx, field, value){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o || idx < 0 || idx >= (o.items||[]).length) return;
  const line = o.items[idx];
  const newVal = parseFloat(value) || 0;
  line[field] = newVal;
  // Corregir la cantidad PEDIDA de una línea ya marcada como recibida (en
  // un pedido RECIBIDO) dejaba el stock y el gasto variable ya generados
  // basados en la cantidad antigua, sin ningún aviso de que se habían
  // quedado desincronizados. toggleRecepcionCheck ya sabe recalcular todo
  // desde cero con la cantidad actual — se reutiliza en vez de duplicar
  // esa lógica aquí.
  if(field === 'cantidad' && o.estado === 'RECIBIDO' && line.recibidoCheck === true){
    toggleRecepcionCheck(idx, true);
    return;
  }
  saveDB();
}

function updatePedidoNotas(value){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  o.notas = value;
  saveDB();
}

function savePedidoRecepcion(){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  // La primera vez que se rellena el control de recepción es un paso normal
  // del flujo de compra (lo hace quien recibe la mercancía); corregirla
  // después de guardada sí exige modo edición, para no reescribir en
  // silencio un control de seguridad alimentaria ya registrado.
  if(o.recepcion && o.recepcion.fecha && !editUnlocked){
    showToast(t('msg.editModeRequiredForLog'));
    return;
  }
  o.recepcion = {
    fecha: document.getElementById('rec-fecha').value,
    hora: document.getElementById('rec-hora').value,
    temp: document.getElementById('rec-temp').value,
    condicion: document.getElementById('rec-condicion').value,
    caducidad: document.getElementById('rec-caducidad').value,
    albaran: document.getElementById('rec-albaran').value,
    responsable: document.getElementById('rec-resp').value.trim(),
    obs: document.getElementById('rec-obs').value.trim()
  };
  saveDB();
  showToast(t('msg.receptionSaved'));
}

// Adjuntar la foto/PDF real del albarán o factura del proveedor, para tener
// el justificante junto al pedido en vez de solo el resumen que ya se
// registra a mano en el control de recepción. Se guarda como data URL
// (base64) directamente en la base de datos, igual que el logo del negocio
// — sin backend de subida de archivos, con un límite de tamaño para no
// disparar el peso de la base de datos.
const ALBARAN_MAX_KB = 1500;
function handleAlbaranUpload(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > ALBARAN_MAX_KB * 1024){
    showToast(t('albaran.tooLarge').replace('${maxKb}', ALBARAN_MAX_KB));
    input.value = '';
    return;
  }
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const reader = new FileReader();
  reader.onload = () => {
    o.albaranFile = {dataUrl: reader.result, name: file.name, size: file.size, uploadedAt: new Date().toISOString()};
    saveDB();
    renderPedidoDetail();
    showToast(t('albaran.uploadedOk'));
  };
  reader.onerror = () => showToast(t('albaran.uploadFailed'));
  reader.readAsDataURL(file);
}
async function removeAlbaranFile(){
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  delete o.albaranFile;
  saveDB();
  renderPedidoDetail();
}

// El estado de comprobación del pedido ya no se elige a mano (antes eran 3
// botones ok/falta/mal sin relación con nada) — se calcula solo a partir del
// checklist de recepción: si todo está marcado como llegado y sin ninguna
// incidencia anotada, "ok"; si falta algo por marcar/llegar, "falta"; si todo
// llegó pero hay alguna nota (devuelto, mal estado...), "mal".
function pedidoComprobacionAuto(o){
  const items = o.items||[];
  if(!items.length) return '';
  const checkedCount = items.filter(l => l.recibidoCheck === true).length;
  const anyNote = items.some(l => (l.notaRecepcion||'').trim());
  if(checkedCount < items.length) return 'falta';
  return anyNote ? 'mal' : 'ok';
}

function toggleRecepcionCheck(idx, checked){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o || idx < 0 || idx >= (o.items||[]).length) return;
  if(o.estado === 'RECIBIDO' && !editUnlocked){
    showToast(t('msg.editModeRequiredForLog'));
    renderPedidoDetail();
    return;
  }
  const line = o.items[idx];
  line.recibidoCheck = checked;
  if(o.estado === 'RECIBIDO'){
    // El pedido ya sumó stock y registró un gasto con el checklist anterior:
    // corregir el tick/cruz en modo edición resincroniza ambos con la nueva
    // cantidad confirmada (toda la pedida si se marca OK, nada si no).
    const ing = getIngredient(line.ingredientId);
    const oldVal = line.cantidadRecibida||0;
    const newVal = checked ? line.cantidad : 0;
    line.cantidadRecibida = newVal;
    if(ing){
      const s = getStockEntry(line.ingredientId);
      const before = s.qty||0;
      s.qty = Math.max(0, before + (newVal - oldVal));
      if(typeof logStockAdjustment === 'function') logStockAdjustment('ing', line.ingredientId, ing.name, before, s.qty, 'purchase');
      renderStock();
    }
    DB.ge.variables = (DB.ge.variables||[]).filter(v => v.pedidoId !== o.id);
    o.gvCreated = false;
    registerPedidoComoGastoVariable(o);
  }
  o.comprobacion = pedidoComprobacionAuto(o);
  saveDB();
  renderPedidoDetail();
}
function updatePedidoLineNota(idx, value){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o || idx < 0 || idx >= (o.items||[]).length) return;
  if(o.estado === 'RECIBIDO' && !editUnlocked){
    showToast(t('msg.editModeRequiredForLog'));
    // Conserva la posición de la pantalla: sin esto, escribir un valor en
    // una lista larga repintaba la vista entera y te devolvía arriba del
    // todo, obligando a bajar otra vez tras CADA dato introducido.
    withScrollPreserved(() => renderPedidoDetail());
    return;
  }
  o.items[idx].notaRecepcion = value.trim();
  o.comprobacion = pedidoComprobacionAuto(o);
  saveDB();
  renderPedidoDetail();
}

// Categoría de Gastos Variables (Gestión Económica) a la que se imputa la compra de un ingrediente
function gvCategoryForIngredient(ing){
  if(ing && ing.category === 'Bebidas') return 'BEBIDAS';
  return 'MATERIA PRIMA';
}

/* ============== Historial de precios (29/09) ==============
   Antes el precio de un producto era un único número que se sobrescribía:
   una subida del proveedor no dejaba rastro (ni cuánto, ni cuándo) y solo
   «existía» si alguien se acordaba de cambiarlo a mano. Ahora cada cambio
   —desde la Mega Lista o desde el albarán al recibir un pedido— se anota en
   DB.preciosHistorial, que se sincroniza entre aparatos (fusión por id). */
const PRECIOS_HISTORIAL_MAX = 1500;
function registrarCambioPrecio(ing, precioNuevo, origen, proveedor){
  if(!ing) return;
  const antes = Number(ing.price) || 0;
  const despues = Math.round((Number(precioNuevo) || 0) * 10000) / 10000;
  if(!antes || Math.abs(despues - antes) < 0.0001) return; // alta nueva o sin cambio: nada que comparar
  if(!DB.preciosHistorial) DB.preciosHistorial = [];
  DB.preciosHistorial.push({
    id: genId(), fecha: todayStr(), createdAt: new Date().toISOString(),
    ingredientId: ing.id, nombre: ing.name, unidad: ing.unit || '',
    proveedor: proveedor || ing.supplier || '', antes, despues,
    pct: Math.round((despues - antes) / antes * 1000) / 10,
    origen, area: ing.area || 'cocina',
    actor: (typeof currentActorName === 'function') ? currentActorName() : ''
  });
  if(DB.preciosHistorial.length > PRECIOS_HISTORIAL_MAX) DB.preciosHistorial = DB.preciosHistorial.slice(-PRECIOS_HISTORIAL_MAX);
}
// El precio del albarán pasa a ser el precio del producto (y el del formato
// de compra, para que la ficha siga cuadrando).
function aplicarPrecioAlbaran(ing, precio, proveedor){
  registrarCambioPrecio(ing, precio, 'albaran', proveedor);
  ing.price = Math.round(precio * 10000) / 10000;
  if(ing.packQty > 0) ing.packPrice = Math.round(ing.price * ing.packQty * 100) / 100;
}
function updatePedidoLinePrecio(idx, valor){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o || !o.items || !o.items[idx]) return;
  const n = parseFloat(String(valor).replace(',', '.'));
  if(isNaN(n) || n < 0){ showToast(t('msg.invalidPrice')); renderPedidoDetail(); return; }
  o.items[idx].precioAlbaran = Math.round(n * 10000) / 10000;
  saveDB();
  renderPedidoDetail();
}
// Consumo medio al mes de un producto: lo recibido en pedidos de los
// últimos 90 días, entre 3. Es lo que convierte «+14 %» en «+29 € al mes».
function consumoMensualCompras(ingredientId){
  const desde = dateStr(new Date(Date.now() - 90 * 86400000));
  let total = 0;
  (DB.purchaseOrders || []).forEach(o => {
    if(o.estado !== 'RECIBIDO' || (o.date || '') < desde) return;
    (o.items || []).forEach(l => { if(l.ingredientId === ingredientId) total += Number(l.cantidadRecibida) || 0; });
  });
  // Compras apuntadas leyendo una factura suelta (sin pedido detrás). Las
  // facturas adjuntadas a un pedido NO se suman aquí: su cantidad ya cuenta
  // por el pedido, y contarla dos veces doblaría el impacto.
  ((DB.ge && DB.ge.variables) || []).forEach(v => {
    if(v.pedidoId || !Array.isArray(v.compras) || (v.fecha || '') < desde) return;
    v.compras.forEach(c => { if(c && c.ingredientId === ingredientId) total += Number(c.qty) || 0; });
  });
  return total / 3;
}
// Cambios de precio del periodo por producto: del primer precio al último (varios cambios seguidos del mismo producto
// cuentan como uno), con su impacto al mes y los platos cuyo escandallo lo usa. `sube` = true devuelve las subidas y false
// las bajadas. En las bajadas, impactoMes sale NEGATIVO: es lo que se ahorra.
function cambiosDePrecio(dias, sube){
  const desde = dateStr(new Date(Date.now() - dias * 86400000));
  const porIng = {};
  (DB.preciosHistorial || []).filter(h => h.fecha >= desde && (h.area || 'cocina') === currentArea())
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    .forEach(h => {
      const g = porIng[h.ingredientId] || (porIng[h.ingredientId] = {ingredientId: h.ingredientId, nombre: h.nombre, unidad: h.unidad, proveedor: h.proveedor, antes: h.antes, despues: h.despues, fecha: h.fecha, origen: h.origen});
      g.despues = h.despues; g.fecha = h.fecha; g.proveedor = h.proveedor || g.proveedor; g.origen = h.origen;
    });
  return Object.values(porIng).filter(g => sube ? g.despues > g.antes : g.despues < g.antes).map(g => {
    const ing = getIngredient(g.ingredientId);
    const consumo = consumoMensualCompras(g.ingredientId);
    const platos = (DB.recipes || []).filter(r => (r.ingredients || []).some(l => l.type !== 'base' && l.ingredientId === g.ingredientId)).map(r => r.name);
    return {...g, nombre: ing ? ing.name : g.nombre, pct: Math.round((g.despues - g.antes) / g.antes * 1000) / 10,
      impactoMes: consumo ? (g.despues - g.antes) * consumo : null, platos};
  }).sort((a, b) => Math.abs(b.impactoMes || 0) - Math.abs(a.impactoMes || 0) || Math.abs(b.pct) - Math.abs(a.pct));
}
function subidasDePrecio(dias){ return cambiosDePrecio(dias, true); }
function bajadasDePrecio(dias){ return cambiosDePrecio(dias, false); }

/* Qué le pasa a CADA plato por un cambio de precio, y a qué precio de venta habría que ponerlo para mantener el food cost
   objetivo. Se calcula con el escandallo de verdad (también cuenta lo que llega por una elaboración base): se mide el
   coste con el precio de antes y con el de ahora, y la diferencia es lo que mueve ESE ingrediente. El PVP sugerido sale
   de coste ÷ objetivo, con el IVA del plato, redondeado hacia arriba a 10 céntimos. Nunca se aplica solo: se propone. */
function platosAfectadosPorPrecio(g){
  const ing = getIngredient(g.ingredientId);
  if(!ing) return [];
  const objetivo = geFoodCostObjPct();
  const actual = ing.price;
  const costeCon = (r, precio) => { ing.price = precio; try{ return recipeCost(r); } finally { ing.price = actual; } };
  return (DB.recipes || []).filter(r => !r.isBase && (r.area || 'cocina') === currentArea()).map(r => {
    const costeAntes = costeCon(r, g.antes), costeAhora = costeCon(r, g.despues);
    if(Math.abs(costeAhora - costeAntes) < 0.0001) return null;
    const ivaPct = r.ivaPct != null ? r.ivaPct : 10;
    const base = r.priceBase != null ? r.priceBase : (r.price ? r.price / (1 + ivaPct / 100) : 0);
    const fcAntes = base > 0 ? costeAntes / base * 100 : null;
    const fcAhora = base > 0 ? costeAhora / base * 100 : null;
    // Con el objetivo ya superado se propone el precio que lo recupera; si sigue dentro, no hace falta tocar nada.
    let sugerido = null;
    if(fcAhora != null && fcAhora > objetivo + 0.05){
      const conIva = costeAhora / (objetivo / 100) * (1 + ivaPct / 100);
      sugerido = Math.ceil(conIva * 10 - 1e-9) / 10;
      if(sugerido <= (r.price || 0) + 0.004) sugerido = null;
    }
    return {id: r.id, nombre: r.name, costeAntes, costeAhora, fcAntes, fcAhora, pvp: r.price || 0, ivaPct, sugerido, objetivo};
  }).filter(Boolean).sort((a, b) => (b.fcAhora || 0) - (a.fcAhora || 0));
}
// Aplica un PVP sugerido a un plato: el mismo cálculo que al guardarlo en Escandallo (base sin IVA → precio con IVA) y
// lo reparte a las cartas donde está puesto, para que el TPV no se quede con el precio viejo.
async function aplicarPvpSugerido(recipeId, pvp){
  if(!isOwnerSession() && !editUnlocked){ showToast(t('msg.needsEditPermission')); return; }
  const r = getRecipe(recipeId);
  if(!r) return;
  const ivaPct = r.ivaPct != null ? r.ivaPct : 10;
  const priceBase = Math.round(pvp / (1 + ivaPct / 100) * 100) / 100;
  const price = Math.round(priceBase * (1 + ivaPct / 100) * 100) / 100;
  const msg = gl({es:`«${r.name}»: de ${fmtMoney(r.price||0)} a ${fmtMoney(price)} (con IVA). Se cambia también en las cartas donde está.`, ca:`«${r.name}»: de ${fmtMoney(r.price||0)} a ${fmtMoney(price)} (amb IVA). Es canvia també a les cartes on és.`, en:`“${r.name}”: from ${fmtMoney(r.price||0)} to ${fmtMoney(price)} (incl. VAT). It also changes in the menus where it appears.`});
  if(!(await confirmModal(msg))) return;
  r.priceBase = priceBase; r.price = price; r.ivaPct = ivaPct;
  (DB.cartas || []).forEach(c => (c.secciones || []).forEach(sec => (sec.platos || []).forEach(p => {
    if(p.recipeId === recipeId){ p.precio = price; p.precioBase = priceBase; p.ivaPct = ivaPct; }
  })));
  if(typeof logAudit === 'function') logAudit('recipe_price', gl({es:`Precio de «${r.name}» ajustado por subida de coste`, ca:`Preu de «${r.name}» ajustat per pujada de cost`, en:`Price of “${r.name}” adjusted after a cost increase`}));
  saveDB();
  showToast(gl({es:'Precio de venta actualizado', ca:'Preu de venda actualitzat', en:'Sale price updated'}));
  abrirCambiosPrecio(cambiosPrecioVista);
}

let cambiosPrecioVista = 'suben';
function abrirCambiosPrecio(vista){
  cambiosPrecioVista = vista === 'bajan' ? 'bajan' : 'suben';
  openSubidasPrecioModal();
}
// La ventana de «Cambios de precio»: lo que ha subido (con lo que supone al mes y qué hacer con cada plato) y lo que ha bajado.
function openSubidasPrecioModal(){
  const sube = cambiosPrecioVista !== 'bajan';
  const suben = subidasDePrecio(30), bajan = bajadasDePrecio(30);
  const lista = sube ? suben : bajan;
  const total = lista.reduce((s, x) => s + (x.impactoMes || 0), 0);
  const fc = v => v == null ? '—' : fmtPct1(v) + '%';
  const platosHtml = x => {
    const pl = platosAfectadosPorPrecio(x).slice(0, 8);
    if(!pl.length) return '';
    return `<div class="cp-platos">
      <div class="cp-platos-tit">${t('precios.platos')}</div>
      ${pl.map(p => {
        const sobre = p.fcAhora != null && p.fcAhora > p.objetivo + 0.05;
        return `<div class="cp-plato">
          <div class="cp-plato-n"><b>${escapeHtml(p.nombre)}</b>
            <span class="cp-fc${sobre ? ' alto' : ''}">${gl({es:'Food cost', ca:'Food cost', en:'Food cost'})} ${fc(p.fcAntes)} → <b>${fc(p.fcAhora)}</b></span></div>
          ${sube && p.sugerido ? `<div class="cp-sug">
              <span>${gl({es:'Para mantener el', ca:'Per mantenir el', en:'To keep'})} ${fmtNum(p.objetivo)}%: <b>${fmtMoney(p.pvp)} → ${fmtMoney(p.sugerido)}</b></span>
              <button type="button" class="btn btn-sm btn-fino owner-only" onclick="aplicarPvpSugerido(${p.id}, ${p.sugerido})">${gl({es:'Aplicar', ca:'Aplicar', en:'Apply'})}</button>
            </div>` : (sube ? `<span class="cp-ok"><i class="ti ti-circle-check"></i> ${gl({es:'Sigue dentro del objetivo', ca:'Segueix dins de l\'objectiu', en:'Still within target'})}</span>` : `<span class="cp-ok"><i class="ti ti-trending-down"></i> ${gl({es:'Mejora el margen', ca:'Millora el marge', en:'Margin improves'})}</span>`)}
        </div>`;
      }).join('')}
    </div>`;
  };
  openModal(`
    <div class="idr-modal"></div>
    <div class="modal-header">
      <h3><i class="ti ti-chart-line"></i> ${gl({es:'Cambios de precio', ca:'Canvis de preu', en:'Price changes'})}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="cp-tabs">
      <button type="button" class="btn btn-sm btn-fino${sube ? ' is-on' : ''}" onclick="abrirCambiosPrecio('suben')"><i class="ti ti-trending-up"></i> ${gl({es:'Suben', ca:'Pugen', en:'Rising'})} <span class="ml-n">${suben.length}</span></button>
      <button type="button" class="btn btn-sm btn-fino${!sube ? ' is-on' : ''}" onclick="abrirCambiosPrecio('bajan')"><i class="ti ti-trending-down"></i> ${gl({es:'Bajan', ca:'Baixen', en:'Falling'})} <span class="ml-n">${bajan.length}</span></button>
    </div>
    <p class="ml-intro">${sube ? t('precios.explica') : gl({es:'Productos que te han salido más baratos en los últimos 30 días, y lo que te ahorras al mes con lo que sueles comprar.', ca:'Productes que t\'han sortit més barats els últims 30 dies, i el que t\'estalvies al mes amb el que sols comprar.', en:'Products that got cheaper in the last 30 days, and what you save each month at your usual volume.'})}</p>
    ${lista.length ? `
      ${total ? `<div class="cp-total ${sube ? 'sube' : 'baja'}"><b>${sube ? escapeHtml(t('precios.total').replace('${v}', fmtMoney(total))) : escapeHtml(gl({es:`Ahorras unos ${fmtMoney(Math.abs(total))} al mes`, ca:`Estalvies uns ${fmtMoney(Math.abs(total))} al mes`, en:`You save about ${fmtMoney(Math.abs(total))} a month`}))}</b></div>` : ''}
      ${lista.map(x => `<section class="cp-card">
        <div class="cp-cab"><b>${escapeHtml(x.nombre)}</b><span class="cp-pct ${sube ? 'sube' : 'baja'}">${x.pct > 0 ? '+' : '−'}${fmtNum(Math.abs(x.pct), 1)} %</span></div>
        <div class="cp-precios">${fmtMoney(x.antes)} → <b>${fmtMoney(x.despues)}</b>/${escapeHtml(x.unidad || '')} · ${escapeHtml(x.proveedor || '—')} · ${escapeHtml(x.fecha || '')}</div>
        <div class="cp-impacto${x.impactoMes ? ' con' : ''}">${x.impactoMes ? escapeHtml(sube ? t('precios.impacto').replace('${v}', fmtMoney(x.impactoMes)) : gl({es:`Ahorro: ${fmtMoney(Math.abs(x.impactoMes))} al mes`, ca:`Estalvi: ${fmtMoney(Math.abs(x.impactoMes))} al mes`, en:`Saving: ${fmtMoney(Math.abs(x.impactoMes))} a month`})) : escapeHtml(t('precios.sinConsumo'))}</div>
        ${platosHtml(x)}
      </section>`).join('')}` : `<div class="empty"><i class="ti ti-circle-check"></i>${sube ? t('precios.vacio') : gl({es:'Ningún precio ha bajado en los últimos 30 días.', ca:'Cap preu ha baixat els últims 30 dies.', en:'No price has dropped in the last 30 days.'})}</div>`}
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `, {xl:true});
}

// Al recibir un pedido, registra su coste en Gastos Variables (Gestión Económica), agrupado por categoría
function registerPedidoComoGastoVariable(o){
  if(o.gvCreated) return;
  // Con la factura ya cuadrada, el gasto es el de la factura (lo que de
  // verdad se paga), no la estimación con los precios de la Mega Lista.
  if(pfFacturaLeida(o)){ pfGastoDesdeFactura(o, []); o.gvCreated = true; return; }
  // Se agrupa por categoría Y por tipo de IVA del ingrediente (ya no por un
  // único IVA de proveedor): dos ingredientes de la misma categoría pero con
  // IVA distinto (ej. dos bebidas, una al 10% y otra al 21%) generan dos
  // líneas de gasto separadas, para que el IVA que arrastra cada una a
  // Informes sea el real del producto, no uno adivinado para todo el pedido.
  const byGroup = {};
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    const costBase = (line.cantidadRecibida||0) * (line.precioCompra != null ? line.precioCompra : (ing ? (ing.price||0) : 0));
    if(costBase <= 0) return;
    const cat = gvCategoryForIngredient(ing);
    const ivaPct = ing && ing.iva != null ? ing.iva : null;
    const key = cat + '|' + (ivaPct==null ? '?' : ivaPct);
    if(!byGroup[key]) byGroup[key] = {cat, iva: ivaPct, base: 0};
    byGroup[key].base += costBase;
  });
  // El envío se calcula sobre lo PEDIDO (no sobre lo recibido, como el resto
  // de este gasto): es lo que decide el proveedor al preparar el envío.
  const envio = providerShippingCost(getProviderByName(o.supplier), pedidoOrderedBase(o));
  if(!Object.keys(byGroup).length && envio <= 0){ o.gvCreated = true; return; }
  const fecha = todayStr();
  const d = new Date(fecha);
  // Fecha de pago por defecto: 30 días desde la recepción (el plazo más
  // habitual con proveedores), editable luego desde el aviso de facturas
  // pendientes — no es más que un recordatorio, no afecta a ningún cálculo.
  const fechaPago = dateStr(new Date(d.getTime() + 30*86400000));
  Object.values(byGroup).forEach(({cat, iva, base}) => {
    // El precio del ingrediente ya es la base sin IVA, y el importe del
    // gasto (como en el resto de Gestión Económica) también se guarda sin
    // IVA — el IVA se añade encima al mostrarlo, nunca se guarda ya incluido.
    const rec = {
      id: genId(), mes: d.getMonth(), año: d.getFullYear(),
      categoria: cat, proveedor: o.supplier, importe: Math.round(base*100)/100,
      fecha, pedidoId: o.id, auto: true,
      fechaPago, pagada: false, ...pfDatosFactura(o)
    };
    if(iva != null) rec.iva = iva;
    DB.ge.variables.push(rec);
  });
  if(envio > 0){
    // Sin categoría propia (envío/transporte no tiene una en Gastos
    // Variables): 'OTROS' es la pensada precisamente para un extra así,
    // distinto de la materia prima del propio pedido.
    DB.ge.variables.push({
      id: genId(), mes: d.getMonth(), año: d.getFullYear(),
      categoria: 'OTROS', proveedor: o.supplier, importe: Math.round(envio*100)/100,
      fecha, pedidoId: o.id, auto: true,
      fechaPago, pagada: false, ...pfDatosFactura(o)
    });
  }
  o.gvCreated = true;
}

function changePedidoEstado(estado){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  if(o.estado === estado) return;
  o.estado = estado;
  if(estado === 'ENVIADO' && !o.enviadoEn) o.enviadoEn = todayStr();
  let preciosCambiados = 0;
  if(estado === 'RECIBIDO'){
    (o.items||[]).forEach(line => {
      // El checklist de recepción manda: un artículo marcado con la cruz (o
      // sin revisar) no suma stock ni genera gasto, sea cual sea la cantidad
      // que se hubiera pedido. Uno marcado con el tick suma la cantidad
      // pedida entera — si algo no cuadra (falta cantidad, etc.) se marca
      // con la cruz y se explica en la nota, no con un número aparte.
      const checked = line.recibidoCheck === true;
      const recibida = checked ? line.cantidad : 0;
      line.cantidadRecibida = recibida;
      const ing = getIngredient(line.ingredientId);
      if(!ing) return; // ingrediente borrado de Mega Lista: no hay stock real que sumar
      // El albarán manda: si trae otro precio, se actualiza el producto y
      // queda en el historial. Y el precio con el que se compró se guarda en
      // la línea, para que el gasto sea el real y no el de la Mega Lista.
      if(checked && line.precioAlbaran != null && Math.abs(line.precioAlbaran - (ing.price || 0)) > 0.0001){
        aplicarPrecioAlbaran(ing, line.precioAlbaran, o.supplier);
        preciosCambiados++;
      }
      line.precioCompra = ing.price || 0;
      const s = getStockEntry(line.ingredientId);
      s.qty = (s.qty||0) + (recibida||0);
    });
    o.comprobacion = pedidoComprobacionAuto(o);
    // Quién ha confirmado la recepción — cualquier empleado puede hacerla
    // (no hace falta permiso de editar para esto, solo para crear el
    // pedido), así que queda constancia de quién fue con el mismo criterio
    // de "quién usa el dispositivo ahora" que ya usa el chat interno.
    if(typeof getChatAuthor === 'function' && typeof getChatAuthorName === 'function'){
      o.recibidoPor = getChatAuthorName(getChatAuthor());
    }
    renderStock();
    registerPedidoComoGastoVariable(o);
    logAudit('stock_received', t('audit.orderReceived').replace('${supplier}', o.supplier||'?'));
  }
  saveDB();
  renderPedidoDetail();
  showToast(estado === 'RECIBIDO'
    ? t('msg.orderReceivedStockUpdated') + (preciosCambiados ? ' · ' + t('precios.actualizados').replace('${n}', preciosCambiados) : '')
    : t('msg.orderMarkedSent'));
}

// El texto que se manda al proveedor (WhatsApp y correo): a quién, para cuándo y qué. Una línea por artículo, sin precios
// (el proveedor ya los tiene) y con el nombre del negocio al final para que sepa de quién es.
function pedidoTexto(o){
  const prov = getProviderByName(o.supplier);
  const rows = (o.items||[]).filter(line => (line.cantidad||0) > 0).map(line => {
    const ing = getIngredient(line.ingredientId);
    return ing ? `  • ${ing.name}: ${fmtNum(line.cantidad)} ${ing.unit}` : '';
  }).filter(Boolean).join('\n');
  const hora = prov && prov.horaEntrega ? ` (${gl({es:'sobre las', ca:'cap a les', en:'around'})} ${prov.horaEntrega})` : '';
  const negocio = (DB.business && DB.business.name) ? `\n\n${DB.business.name}` : '';
  return `🛒 ${t('label.orderTo')} ${o.supplier}\n${t('label.deliveryDate')}: ${o.date}${hora}\n\n${rows}${o.notas ? '\n\n📝 '+o.notas : ''}${negocio}`;
}

// Si el proveedor no tiene teléfono/email guardado, antes se abría igualmente
// una URL de WhatsApp/mailto vacía y el pedido se quedaba marcado como
// "Enviado" aunque en realidad no le hubiera llegado nada a nadie. Ahora se
// avisa y no se manda — y si el pedido estaba en Borrador, el envío real
// (cuando sí hay datos de contacto) lo pasa a Enviado automáticamente.
function sendPedidoWhatsapp(order){
  const o = order || getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const prov = getProviderByName(o.supplier);
  if(!(prov && prov.tel)){ showToast(t('msg.supplierMissingPhone')); return; }
  const tel = whatsappDeTelefono(prov.tel);
  if(!tel){ showToast(t('msg.supplierLandline'), 4500); return; }
  const txt = encodeURIComponent(pedidoTexto(o));
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
  markPedidoSentIfDraft(o);
}

function sendPedidoEmail(order){
  const o = order || getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const prov = getProviderByName(o.supplier);
  const to = prov && prov.email ? prov.email : '';
  if(!to){ showToast(t('msg.supplierMissingEmail')); return; }
  const subject = encodeURIComponent(t('msg.supplierOrderSubject').replace('${supplier}', o.supplier).replace('${date}', o.date));
  const body = encodeURIComponent(pedidoTexto(o));
  window.location.href = 'mailto:'+to+'?subject='+subject+'&body='+body;
  markPedidoSentIfDraft(o);
}
function markPedidoSentIfDraft(o){
  if(o.estado !== 'BORRADOR') return;
  o.estado = 'ENVIADO';
  o.enviadoEn = todayStr();
  saveDB();
  renderPedidos();
}

function printPedido(){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  printReportWindow(t('label.purchaseOrder'), buildPedidoPrintHtml(o));
}

// El impreso del pedido: una hoja para el proveedor (o para tener en el muelle y marcar lo que llega). Arriba, a quién y
// para cuándo; debajo, la tabla con cada artículo, su cantidad y una casilla para ir tachando al recibir. Sin precios.
// Cuerpo compartido por printPedido() (pedido ya guardado) y printPedidoBorrador() (pedido en curso, aún sin guardar).
function buildPedidoPrintHtml(o){
  const prov = getProviderByName(o.supplier);
  const lineas = (o.items||[]).map(line => ({line, ing: getIngredient(line.ingredientId)})).filter(x => x.ing && (x.line.cantidad||0) > 0);
  const rows = lineas.map((x, i) => `<tr><td class="pp-n">${i+1}</td><td class="pp-a">${escapeHtml(x.ing.name)}</td><td class="pr-num pp-c">${fmtNum(x.line.cantidad)} <small>${escapeHtml(x.ing.unit)}</small></td><td class="pp-ck"><span></span></td></tr>`).join('');
  const contacto = [prov && prov.contacto ? escapeHtml(prov.contacto) : '', prov && prov.tel ? escapeHtml(prov.tel) : '', prov && prov.email ? escapeHtml(prov.email) : ''].filter(Boolean).join(' · ');
  const meta = [
    [t('common.supplier'), `<b>${escapeHtml(o.supplier || '—')}</b>${contacto ? `<small>${contacto}</small>` : ''}`],
    [t('label.deliveryDate'), `<b>${escapeHtml(o.date || '—')}</b>${prov && prov.horaEntrega ? `<small>${escapeHtml(prov.horaEntrega)} ${t('label.hoursApprox')}</small>` : ''}`],
    [gl({es:'Artículos', ca:'Articles', en:'Items'}), `<b>${lineas.length}</b>`],
  ].map(([et, v]) => `<div class="pp-meta"><span>${escapeHtml(et)}</span>${v}</div>`).join('');
  return `
    <style>
      .pp-metas{display:flex;border:1px solid #1C1A17;margin:14px 0 20px}
      .pp-meta{flex:1;padding:9px 12px;border-right:1px solid #1C1A17;min-width:0}
      .pp-meta:last-child{border-right:0}
      .pp-meta span{display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#716C65}
      .pp-meta b{display:block;font-size:15px;letter-spacing:-.01em}
      .pp-meta small{display:block;font-size:11px;color:#716C65;margin-top:1px;overflow-wrap:anywhere}
      table.pp-t{margin-top:4px}
      .pp-t th{padding:7px 8px}
      .pp-t td{padding:9px 8px;font-size:13.5px;border-bottom:1px solid #E7E2D9}
      .pp-n{width:34px;font-family:'IBM Plex Mono',monospace;color:#716C65;font-size:11.5px}
      .pp-c{width:120px;font-size:14px}
      .pp-c small{font-size:11px;color:#716C65;font-weight:500}
      .pp-ck{width:60px;text-align:center}
      .pp-ck span{display:inline-block;width:13px;height:13px;border:1.4px solid #1C1A17}
      .pp-notas{margin-top:20px;border:1px solid #1C1A17;padding:10px 14px;break-inside:avoid}
      .pp-notas b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#716C65;margin-bottom:4px}
    </style>
    ${printReportHeaderHtml(t('label.orderTo')+' '+o.supplier)}
    <div class="pp-metas">${meta}</div>
    <table class="pp-t"><thead><tr><th>#</th><th>${t('common.item')}</th><th class="pr-num">${t('common.qty')}</th><th style="text-align:center">${gl({es:'Recibido', ca:'Rebut', en:'Received'})}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4" class="pr-empty">${t('common.noResults')}</td></tr>`}</tbody></table>
    ${o.notas ? `<div class="pp-notas"><b>${t('common.notes')}</b>${escapeHtml(o.notas)}</div>` : ''}
  `;
}

let orderModalSupplier = '';
let orderModalLines = [];
let orderModalSearch = '';
let orderFormInline = true;   // el formulario ya no es un modal: vive siempre en la pestaña
let orderFiltro = '';         // '' = todos · 'bajo' = por debajo del mínimo · 'con' = con cantidad
// Si se acaba de elegir/cambiar el proveedor, la comprobación de fecha del
// siguiente render debe avisar con un aviso visible (antes se corregía la
// fecha en silencio en este caso, y el único indicio era que el campo de
// fecha cambiaba solo — fácil de no darse cuenta).
let orderSupplierJustChanged = false;

function openOrderModal(){
  if(!DB.ingredients.some(i => (i.area||'cocina') === currentArea())){ showToast(t('msg.addIngredientsFirst')); return; }
  navigate('pedidos');
  setPedidosTab('crear');
}

// Lo que ya viene de camino: lo pedido en pedidos ENVIADOS que aún no se han recibido. Si no se descuenta, «pedir lo que
// falta» pide dos veces lo mismo el día en que el camión todavía no ha llegado.
function pcEnCamino(ingredientId){
  return (DB.purchaseOrders||[])
    .filter(o => o.estado === 'ENVIADO' && (o.area||'cocina') === currentArea())
    .reduce((sum, o) => sum + (o.items||[]).filter(l => l.ingredientId === ingredientId).reduce((n, l) => n + (l.cantidad||0), 0), 0);
}
function pcBajoMinimo(ingredientId){
  const s = getStockEntry(ingredientId);
  return (s.min||0) > 0 && (s.qty||0) < s.min;
}
// El salto de los botones − y +: 1 en kg, L y unidades; en gramos y mililitros, el envase (o 100 si no lo hay).
function pcPaso(ing){
  if(['g','ml','cl'].includes(ing.unit)) return ing.packQty > 1 ? ing.packQty : 100;
  return 1;
}
// Un precio por gramo (0,002 €) no cabe en dos decimales: por debajo de 10 céntimos se enseñan cuatro.
const pcPrecio = n => (n > 0 && n < 0.1) ? fmtNum(n, 4) + ' €' : fmtMoney(n);
// Ese ± puede dar 0,30000000004: se redondea a céntimos de unidad.
const pcRedondea = n => Math.round(n * 100) / 100;

function pcProveedorHtml(prov){
  if(!orderModalSupplier) return '';
  if(!prov) return `<p class="es-nota"><i class="ti ti-info-circle"></i> ${gl({es:'Este proveedor no tiene ficha: añádela en Proveedores para ver sus días de reparto y poder enviarle el pedido.', ca:'Aquest proveïdor no té fitxa: afegeix-la a Proveïdors per veure els dies de repartiment i poder enviar-li la comanda.', en:'This supplier has no profile: add it under Suppliers to see their delivery days and send them the order.'})}</p>`;
  const dias = getProviderDiasEntrega(prov);
  const chips = WEEK_DAYS.map((d, i) => `<span class="pc-dia${dias.includes(d) ? ' on' : ''}" title="${escapeHtml(weekDayFull(i))}">${escapeHtml(weekDayShort(i))}</span>`).join('');
  const wa = prov.tel ? (whatsappDeTelefono(prov.tel) ? 'ok' : 'fijo') : 'no';
  const contacto = (ic, estado, texto) => `<span class="pc-contacto ${estado}"><i class="ti ${ic}"></i> ${texto}</span>`;
  const envio = prov.envioTipo === 'fijo' ? `${fmtMoney(prov.envioCoste||0)} ${t('label.shippingFixedTag')}`
    : prov.envioTipo === 'minimo' ? `${t('label.shippingFreeFrom')} ${fmtMoney(prov.envioMinimo||0)}` : '';
  return `
    <div class="pc-prov-info">
      ${dias.length ? `<div class="pc-dias" aria-label="${escapeHtml(t('label.usualDeliveryDays'))}">${chips}${prov.horaEntrega ? `<span class="pc-hora"><i class="ti ti-clock"></i> ${escapeHtml(prov.horaEntrega)}</span>` : ''}</div>` : ''}
      ${envio ? `<span class="pc-contacto"><i class="ti ti-truck-delivery"></i> ${t('label.shipping')}: ${envio}</span>` : ''}
      ${contacto('ti-brand-whatsapp', wa, wa === 'ok' ? 'WhatsApp' : wa === 'fijo' ? gl({es:'WhatsApp: es un fijo', ca:'WhatsApp: és un fix', en:'WhatsApp: landline'}) : gl({es:'WhatsApp: sin teléfono', ca:'WhatsApp: sense telèfon', en:'WhatsApp: no phone'}))}
      ${contacto('ti-mail', prov.email ? 'ok' : 'no', prov.email ? 'Email' : gl({es:'Email: sin correo', ca:'Email: sense correu', en:'Email: no address'}))}
    </div>`;
}

function pcFilasHtml(){
  const search = orderModalSearch.toLowerCase();
  const filas = orderModalLines.map(line => ({line, ing: getIngredient(line.ingredientId)})).filter(x => x.ing)
    .filter(x => !search || x.ing.name.toLowerCase().includes(search))
    .filter(x => orderFiltro === 'bajo' ? pcBajoMinimo(x.ing.id) : orderFiltro === 'con' ? x.line.cantidad > 0 : true)
    .sort((a, b) => a.ing.name.localeCompare(b.ing.name));
  if(!filas.length) return `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${orderFiltro === 'bajo' ? gl({es:'Nada por debajo del mínimo.', ca:'Res per sota del mínim.', en:'Nothing below the minimum.'}) : t('common.noResults')}</div>`;
  return filas.map(({line, ing}) => {
    const s = getStockEntry(ing.id);
    const bajo = pcBajoMinimo(ing.id);
    const camino = pcEnCamino(ing.id);
    const paso = pcPaso(ing);
    return `
      <div class="pc-art${line.cantidad > 0 ? ' con' : ''}${bajo ? ' bajo' : ''}" data-ing="${ing.id}">
        <div class="pc-art-nom">
          <b>${escapeHtml(ing.name)}</b>
          <span class="pc-art-sub">
            <span class="${bajo ? 'pc-bajo' : ''}">${t('label.stock')}: ${fmtNum(s.qty)} ${escapeHtml(ing.unit)}${(s.min||0) > 0 ? ` · ${t('label.minAbbrev')} ${fmtNum(s.min)}` : ''}</span>
            ${bajo ? `<em class="pc-tag">${gl({es:'bajo mínimo', ca:'sota el mínim', en:'below min'})}</em>` : ''}
            ${camino > 0 ? `<em class="pc-tag cam"><i class="ti ti-truck-delivery"></i> +${fmtNum(camino)} ${escapeHtml(ing.unit)} ${gl({es:'en camino', ca:'en camí', en:'on the way'})}</em>` : ''}
          </span>
        </div>
        <div class="pc-art-pr"><!-- Al pedir, lo que decide la cantidad no es solo cuánto queda: es a cuánto sale. -->${ing.price ? `${pcPrecio(ing.price)}<small>/${escapeHtml(ing.unit)}</small>` : `<span class="ml-falta">${gl({es:'sin precio', ca:'sense preu', en:'no price'})}</span>`}</div>
        <div class="pc-qty">
          <button type="button" class="btn btn-fino" aria-label="−" onclick="ordenPaso(${ing.id}, -1)"><i class="ti ti-minus"></i></button>
          <input type="number" id="oq-${ing.id}" value="${line.cantidad || ''}" step="${paso >= 1 ? 'any' : '0.01'}" min="0" placeholder="0" aria-label="${escapeHtml(ing.name)}: ${t('common.qty')}" oninput="updateOrderLineQty(${ing.id}, this.value)">
          <button type="button" class="btn btn-fino" aria-label="+" onclick="ordenPaso(${ing.id}, 1)"><i class="ti ti-plus"></i></button>
          <span class="pc-qty-u">${escapeHtml(ing.unit)}</span>
        </div>
      </div>`;
  }).join('');
}
// Alias con el nombre de siempre (lo usa el buscador y las pruebas).
function orderItemsRowsHtml(){ return pcFilasHtml(); }

// Al escribir en el buscador de artículos, solo se refresca la lista de filas de abajo — el input de búsqueda en sí no se
// toca, así conserva el foco y la posición del cursor mientras se escribe seguido.
function updateOrderItemSearch(val){
  orderModalSearch = val;
  const box = document.getElementById('order-items-rows');
  if(box) box.innerHTML = pcFilasHtml();
}
function setOrderFiltro(f){
  orderFiltro = (orderFiltro === f ? '' : f);
  refreshOrderForm();
}
function pcContadores(){
  return {
    todos: orderModalLines.length,
    bajo: orderModalLines.filter(l => pcBajoMinimo(l.ingredientId)).length,
    con: orderModalLines.filter(l => l.cantidad > 0).length
  };
}

// Tras renderizar el formulario, restaura los valores de fecha y búsqueda.
function afterOrderFormRender(dateVal){
  const dEl = document.getElementById('order-date');
  if(dEl) dEl.value = dateVal || tomorrowStr();
  if(dEl) validateOrderDate(dEl, !orderSupplierJustChanged);
  orderSupplierJustChanged = false;
  const sEl = document.getElementById('order-item-search');
  if(sEl) sEl.value = orderModalSearch;
}
function refreshOrderForm(){ renderPedidoCrear(); }
// Compat con el nombre antiguo del cuerpo del formulario (devuelve lo mismo que pinta la pestaña).
function orderFormBodyHtml(){
  const dateField = document.getElementById('order-date');
  return {dateVal: dateField ? dateField.value : tomorrowStr(), html: ''};
}

function renderPedidoCrear(){
  orderFormInline = true;
  const box = document.getElementById('pedidos-list');
  const dateField = document.getElementById('order-date');
  const dateVal = dateField ? dateField.value : tomorrowStr();
  const searchField = document.getElementById('order-item-search');
  if(searchField) orderModalSearch = searchField.value;
  const notasField = document.getElementById('order-notas');
  const notas = notasField ? notasField.value : '';
  const suppliers = pedidoSuppliers();
  const prov = getProviderByName(orderModalSupplier);
  const c = pcContadores();
  const chip = (clave, etiqueta, n) => `<button type="button" class="btn btn-sm btn-fino${orderFiltro === clave ? ' is-on' : ''}" aria-pressed="${orderFiltro === clave}" onclick="setOrderFiltro('${clave}')">${etiqueta} <span class="ml-n">${n}</span></button>`;
  const cuerpo = !orderModalSupplier
    ? `<div class="empty pc-vacio"><i class="ti ti-truck-delivery"></i>${t('empty.selectSupplierToLoadArticles')}</div>`
    : (!orderModalLines.length
      ? `<div class="empty pc-vacio"><i class="ti ti-basket-off"></i>${t('empty.supplierNoIngredients')}</div>`
      : `
    <div class="es-hoja pc-cuerpo lat-ultimo">
      <div class="es-principal">
        <section class="es-card pc-arts">
          <div class="pc-arts-cab">
            <h3 class="es-tit">${t('label.supplierArticles')} <span class="fi-para">${c.todos}</span></h3>
            <div class="pc-herr">
              <button type="button" class="btn btn-sm btn-fino" onclick="sugerirPorDeficit()" title="${escapeHtml(gl({es:'Pone lo que falta para llegar al mínimo de Stock, descontando lo que ya viene de camino', ca:'Posa el que falta per arribar al mínim d\'Estoc, descomptant el que ja ve de camí', en:'Fills in what is missing to reach the Stock minimum, minus what is already on its way'}))}"><i class="ti ti-bulb"></i> ${t('btn.suggestByStockDeficit')}</button>
              ${c.con ? `<button type="button" class="btn btn-sm btn-fino" onclick="limpiarPedidoEnCurso()"><i class="ti ti-eraser"></i> ${gl({es:'Vaciar', ca:'Buidar', en:'Clear'})}</button>` : ''}
            </div>
          </div>
          <div class="pc-filtros">
            <div class="es-anadir-buscar pc-buscar"><i class="ti ti-search"></i><input type="text" class="search-input" id="order-item-search" placeholder="${t('ph.searchArticle')}" value="${escapeHtml(orderModalSearch)}" oninput="updateOrderItemSearch(this.value)"></div>
            <div class="pc-chips">${chip('', gl({es:'Todos', ca:'Tots', en:'All'}), c.todos)}${chip('bajo', gl({es:'Bajo mínimo', ca:'Sota el mínim', en:'Below minimum'}), c.bajo)}${chip('con', gl({es:'Con cantidad', ca:'Amb quantitat', en:'With quantity'}), c.con)}</div>
          </div>
          <div id="order-items-rows" class="pc-lista">${pcFilasHtml()}</div>
        </section>
      </div>
      <aside class="es-lateral">
        <section class="es-card pc-resumen">
          <h3 class="es-tit">${t('label.orderSummary')}</h3>
          <div id="order-summary">${orderSummaryHtml()}</div>
          <div class="field pc-notas"><label for="order-notas">${t('common.notes')}</label><textarea id="order-notas" rows="2" placeholder="${escapeHtml(gl({es:'Para el proveedor: horario, avisos…', ca:'Per al proveïdor: horari, avisos…', en:'For the supplier: timing, notes…'}))}">${escapeHtml(notas)}</textarea></div>
          <div id="order-acciones" class="pc-acciones">${pcAccionesHtml()}</div>
        </section>
      </aside>
    </div>`);
  box.innerHTML = `
    ${renderPedidoSolicitudesPendientesHtml()}
    <section class="es-card pc-cab">
      <div class="field-row pc-cab-campos">
        <div class="field">
          <label for="order-supplier">${t('common.supplier')}</label>
          <select id="order-supplier" onchange="selectOrderSupplier(this.value)">
            <option value="">— ${t('label.selectSupplier')} —</option>
            ${suppliers.map(sp => `<option value="${escapeHtml(sp)}" ${orderModalSupplier===sp?'selected':''}>${escapeHtml(sp)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="order-date">${t('label.deliveryDate')}</label>
          <input type="date" id="order-date" value="${dateVal || tomorrowStr()}" min="${tomorrowStr()}" onchange="validateOrderDate(this)">
          <div id="order-date-hint" class="es-pista"></div>
        </div>
      </div>
      ${pcProveedorHtml(prov)}
    </section>
    ${cuerpo}`;
  afterOrderFormRender(dateVal);
}

function pcAccionesHtml(){
  const prov = getProviderByName(orderModalSupplier);
  const items = orderModalLines.filter(l => l.cantidad > 0).length;
  const waOk = !!(prov && prov.tel && whatsappDeTelefono(prov.tel));
  const mailOk = !!(prov && prov.email);
  const sinItems = items === 0;
  const motivo = sinItems ? gl({es:'Añade al menos un artículo.', ca:'Afegeix com a mínim un article.', en:'Add at least one item.'}) : '';
  const btn = (clase, icono, texto, fn, ok, pista) => `<button type="button" class="btn btn-fino ${clase}" ${ok ? '' : 'disabled'} ${pista ? `title="${escapeHtml(pista)}"` : ''} onclick="${fn}"><i class="ti ${icono}"></i> ${texto}</button>`;
  return `
    ${btn('is-on', 'ti-brand-whatsapp', t('btn.sendByWhatsapp'), "sendNewPedido('whatsapp')", !sinItems && waOk, sinItems ? motivo : (!prov || !prov.tel ? t('msg.supplierMissingPhone') : !waOk ? t('msg.supplierLandline') : ''))}
    ${btn('is-on', 'ti-mail', t('btn.sendByEmail'), "sendNewPedido('email')", !sinItems && mailOk, sinItems ? motivo : (!mailOk ? t('msg.supplierMissingEmail') : ''))}
    <div class="pc-acciones-2">
      ${btn('', 'ti-device-floppy', gl({es:'Guardar borrador', ca:'Desar esborrany', en:'Save draft'}), 'guardarBorradorPedido()', !sinItems, motivo)}
      ${btn('', 'ti-printer', t('common.print'), 'printPedidoBorrador()', !sinItems, motivo)}
    </div>
    ${sinItems || (waOk && mailOk) ? '' : `<p class="es-pista">${!waOk && !mailOk ? gl({es:'Este proveedor no tiene móvil ni correo guardados: imprime el pedido o guárdalo como borrador.', ca:'Aquest proveïdor no té mòbil ni correu: imprimeix la comanda o desa-la com a esborrany.', en:'This supplier has no mobile or email saved: print the order or save it as a draft.'}) : ''}</p>`}`;
}

/* Resumen del pedido con lo que va a costar cada línea y el total abajo.
   Antes solo se veían nombres y cantidades, así que había que enviar el
   pedido para enterarse del importe — y para un pedido grande eso es
   justamente lo que hay que saber ANTES de mandarlo.
   El cálculo es el mismo que usa pedidoTotalConIva() para los pedidos ya
   guardados: el precio del ingrediente es la base sin IVA y cada línea suma
   el suyo, que puede ser distinto por producto. */
function orderSummaryHtml(){
  const items = orderModalLines.filter(l => l.cantidad > 0);
  if(!items.length) return `<div class="empty es-vacio"><i class="ti ti-basket"></i>${t('empty.noArticlesYet')}</div>`;
  let base = 0, iva = 0, sinPrecio = 0;
  const filas = items.map(l => {
    const ing = getIngredient(l.ingredientId);
    if(!ing) return '';
    const precio = ing.price || 0;
    const importe = (l.cantidad||0) * precio;
    const ivaPct = ing.iva != null ? ing.iva : 0;
    base += importe;
    iva += importe * ivaPct / 100;
    if(!precio) sinPrecio++;
    return `
      <div class="pc-res-linea">
        <span class="pc-res-n">${escapeHtml(ing.name)}</span>
        <span class="pc-res-q">${fmtNum(l.cantidad)} ${escapeHtml(ing.unit)}${precio ? ` × ${pcPrecio(precio)}` : ''}</span>
        <b>${precio ? fmtMoney(importe) : '—'}</b>
      </div>`;
  }).join('');

  // Un ingrediente sin precio en la Mega Lista no puede sumar, y callarlo
  // daría un total que parece completo sin serlo.
  const aviso = sinPrecio
    ? `<p class="pc-aviso"><i class="ti ti-alert-triangle"></i> ${t('msg.orderItemsWithoutPrice').replace('${n}', sinPrecio)}</p>` : '';

  // Si el proveedor cobra envío por no llegar a un mínimo, se avisa aquí
  // mismo mientras se compone el pedido — es el momento en que sirve de
  // algo saberlo, para poder añadir más artículos y evitarlo.
  const provider = getProviderByName(orderModalSupplier);
  const envio = providerShippingCost(provider, base);
  let envioAviso = '';
  if(provider && provider.envioTipo === 'minimo'){
    envioAviso = envio > 0
      ? `<p class="pc-aviso"><i class="ti ti-truck-delivery"></i> ${t('msg.shippingMinimumNotReached').replace('${missing}', fmtMoney(Math.max(0,(provider.envioMinimo||0)-base))).replace('${fee}', fmtMoney(provider.envioCoste||0)).replace('${min}', fmtMoney(provider.envioMinimo||0))}</p>`
      : `<p class="pc-ok"><i class="ti ti-truck-delivery"></i> ${t('msg.shippingFreeReached').replace('${min}', fmtMoney(provider.envioMinimo||0))}</p>`;
  }
  const pendiente = pendingOrderForSupplier(orderModalSupplier);
  const pendAviso = pendiente ? `<p class="pc-aviso"><i class="ti ti-clock"></i> ${gl({es:`Ya hay un pedido a este proveedor (${escapeHtml(pendiente.date)}, ${escapeHtml(pedidoEstadoLabel(pendiente.estado))}) sin recibir.`, ca:`Ja hi ha una comanda a aquest proveïdor (${escapeHtml(pendiente.date)}, ${escapeHtml(pedidoEstadoLabel(pendiente.estado))}) sense rebre.`, en:`There is already an order to this supplier (${escapeHtml(pendiente.date)}, ${escapeHtml(pedidoEstadoLabel(pendiente.estado))}) not yet received.`})}</p>` : '';

  return `
    <div class="pc-res-lineas">${filas}</div>
    ${aviso}${envioAviso}${pendAviso}
    <div class="pd-totales pc-totales">
      <div><span>${t('label.subtotal')}</span><b>${fmtMoney(base)}</b></div>
      <div><span>${t('label.vat')}</span><b>${fmtMoney(iva)}</b></div>
      ${envio > 0 ? `<div><span>${t('label.shipping')}</span><b>${fmtMoney(envio)}</b></div>` : ''}
      <div class="pd-total"><span>${t('common.total')}</span><b>${fmtMoney(base + iva + envio)}</b></div>
    </div>`;
}
function renderOrderSummary(){
  const box = document.getElementById('order-summary');
  if(box) box.innerHTML = orderSummaryHtml();
  const acc = document.getElementById('order-acciones');
  if(acc) acc.innerHTML = pcAccionesHtml();
  // Contadores de los filtros y la vaciar: solo cambian cuando una cantidad pasa de/a cero.
  const c = pcContadores();
  document.querySelectorAll('.pc-chips .btn').forEach((b, i) => { const n = b.querySelector('.ml-n'); if(n) n.textContent = [c.todos, c.bajo, c.con][i]; });
}

// Comprueba que la fecha de entrega coincide con un día de entrega del proveedor.
// Si no, avisa y ajusta a la próxima fecha válida.
function validateOrderDate(input, silent){
  const hint = document.getElementById('order-date-hint');
  if(!orderModalSupplier){ if(hint) hint.textContent = ''; return; }
  const provider = DB.providers.find(p => p.nombre === orderModalSupplier);
  const diasEntrega = provider ? getProviderDiasEntrega(provider) : [];
  if(!diasEntrega.length){ if(hint) hint.textContent = ''; return; }
  const dayIdx = new Date(input.value + 'T00:00:00').getDay(); // 0=domingo
  const weekDayName = WEEK_DAYS[(dayIdx + 6) % 7];
  if(!diasEntrega.includes(weekDayName)){
    const next = nextValidDeliveryDate(input.value, diasEntrega);
    input.value = next;
    if(!silent) showToast(`${orderModalSupplier} ${t('msg.onlyDeliversOn')}: ${diasEntrega.map(weekDayLabelFromStored).join(', ')}. ${t('msg.dateAdjusted')}`);
  }
  if(hint) hint.textContent = `${t('label.deliveryDaysOf')} ${orderModalSupplier}: ${diasEntrega.map(weekDayLabelFromStored).join(', ')}`;
}

// El parámetro se llamaba `dateStr` y tapaba la función global dateStr()
// (js/hr.js) — por eso se usaba toISOString() aquí, que en España (UTC
// por delante) convierte la medianoche LOCAL a UTC y devuelve el día
// ANTERIOR al que de verdad tocaba. validateOrderDate() reescribe el campo
// de fecha del pedido con este resultado: para un proveedor que reparte los
// martes, un pedido puesto en miércoles se "corregía" al lunes en vez de al
// martes — un día en el que tampoco reparte, justo lo que se quería evitar.
function nextValidDeliveryDate(fechaStr, diasEntrega){
  const d = new Date(fechaStr + 'T00:00:00');
  for(let i=0;i<8;i++){
    const weekDayName = WEEK_DAYS[(d.getDay() + 6) % 7];
    if(diasEntrega.includes(weekDayName)) return dateStr(d);
    d.setDate(d.getDate()+1);
  }
  return fechaStr;
}

function selectOrderSupplier(supplier){
  orderModalSupplier = supplier;
  orderModalSearch = '';
  orderModalLines = supplier ? DB.ingredients.filter(i => i.supplier === supplier && (i.area||'cocina') === currentArea() && i.activo !== false).map(i => ({ingredientId: i.id, cantidad: 0, cantidadRecibida: null})) : [];
  orderSupplierJustChanged = true;
  refreshOrderForm();
}

/* «Sugerir por déficit de stock» (revisado el 30/10). Pide lo que falta para llegar al mínimo de Stock, pero:
   · descuenta lo que ya viene de camino (pedidos ENVIADOS sin recibir): si no, el mismo día en que el camión aún no ha
     llegado se pedía otra vez lo mismo;
   · redondea hacia arriba al envase (packQty de la Mega Lista: 1000 g = la bolsa de 1 kg), porque nadie pide 350 g
     de una bolsa de kilo;
   · dice qué ha hecho: cuántos artículos, y cuántos no se pueden juzgar por no tener mínimo en Stock. Antes el aviso
     era siempre «cantidades sugeridas», aunque no hubiera sugerido nada. */
async function sugerirPorDeficit(){
  const hasManualQty = orderModalLines.some(l => l.cantidad > 0);
  if(hasManualQty && !(await confirmModal(t('msg.confirmOverwriteQtyWithSuggestion')))) return;
  let sugeridos = 0, sinMinimo = 0, yaVienen = 0;
  orderModalLines.forEach(line => {
    const ing = getIngredient(line.ingredientId);
    const s = getStockEntry(line.ingredientId);
    const min = s.min || 0;
    if(!(min > 0)){ sinMinimo++; line.cantidad = 0; return; }
    const camino = pcEnCamino(line.ingredientId);
    let falta = min - (s.qty || 0) - camino;
    if(falta <= 0){ if(min - (s.qty || 0) > 0) yaVienen++; line.cantidad = 0; return; }
    if(ing && ing.packQty > 1) falta = Math.ceil(falta / ing.packQty - 1e-9) * ing.packQty;
    line.cantidad = pcRedondea(falta);
    sugeridos++;
  });
  refreshOrderForm();
  const extra = [
    yaVienen ? gl({es:`${yaVienen} ya vienen de camino`, ca:`${yaVienen} ja vénen de camí`, en:`${yaVienen} already on the way`}) : '',
    sinMinimo ? gl({es:`${sinMinimo} sin mínimo en Stock`, ca:`${sinMinimo} sense mínim a l'Estoc`, en:`${sinMinimo} with no Stock minimum`}) : ''
  ].filter(Boolean).join(' · ');
  showToast(sugeridos
    ? gl({es:`${sugeridos} artículos sugeridos`, ca:`${sugeridos} articles suggerits`, en:`${sugeridos} items suggested`}) + (extra ? ' · ' + extra : '')
    : gl({es:'Nada que pedir: todo está por encima del mínimo', ca:'Res a demanar: tot és per sobre del mínim', en:'Nothing to order: everything is above the minimum'}) + (extra ? ' · ' + extra : ''), 5000);
}

function updateOrderLineQty(ingredientId, value){
  const line = orderModalLines.find(l => l.ingredientId === ingredientId);
  if(line) line.cantidad = Math.max(0, parseFloat(value) || 0);
  const fila = document.querySelector(`.pc-art[data-ing="${ingredientId}"]`);
  if(fila) fila.classList.toggle('con', !!(line && line.cantidad > 0));
  renderOrderSummary();
}
// Los botones − y +: un paso por pulsación, sin repintar la lista (se perdería el sitio en el que se estaba).
function ordenPaso(ingredientId, dir){
  const line = orderModalLines.find(l => l.ingredientId === ingredientId);
  const ing = getIngredient(ingredientId);
  if(!line || !ing) return;
  line.cantidad = Math.max(0, pcRedondea((line.cantidad || 0) + dir * pcPaso(ing)));
  const inp = document.getElementById('oq-' + ingredientId);
  if(inp) inp.value = line.cantidad || '';
  updateOrderLineQty(ingredientId, line.cantidad);
}
async function limpiarPedidoEnCurso(){
  if(!(await confirmModal(gl({es:'¿Poner a cero todas las cantidades del pedido?', ca:'Posar a zero totes les quantitats de la comanda?', en:'Reset every quantity in the order to zero?'})))) return;
  orderModalLines.forEach(l => { l.cantidad = 0; });
  refreshOrderForm();
}

// Hay ya un pedido pendiente (no Recibido) para este proveedor? Sirve para
// avisar antes de crear uno nuevo y evitar duplicar el pedido físico sin
// darse cuenta (antes no había ningún aviso).
function pendingOrderForSupplier(supplier){
  return DB.purchaseOrders.find(o => o.supplier === supplier && (o.area||'cocina') === currentArea() && o.estado !== 'RECIBIDO');
}

// Crea (o reutiliza) el pedido a partir del formulario del modal "Nuevo Pedido".
// Devuelve el pedido creado, o null si los datos no son válidos.
async function buildNewPedido(estado){
  if(!orderModalSupplier){ showToast(t('msg.selectSupplier')); return null; }
  const date = document.getElementById('order-date').value || todayStr();
  // Un pedido para hoy mismo no da tiempo a que el proveedor lo prepare y
  // lo traiga — se bloquea aquí de forma explícita, no solo con un aviso
  // que se pueda pasar por alto.
  if(date <= todayStr()){ showToast(t('msg.orderDateMustBeFuture')); return null; }
  // Repite la comprobación de días de reparto justo antes de crear el
  // pedido de verdad (no solo al elegir la fecha en el formulario) — así
  // queda garantizado que nunca se guarda un pedido para un día que el
  // proveedor no reparte, pase lo que pase con el aviso en vivo del campo
  // de fecha.
  const provider = getProviderByName(orderModalSupplier);
  const diasEntrega = provider ? getProviderDiasEntrega(provider) : [];
  if(diasEntrega.length){
    const dayIdx = new Date(date + 'T00:00:00').getDay();
    const weekDayName = WEEK_DAYS[(dayIdx + 6) % 7];
    if(!diasEntrega.includes(weekDayName)){
      showToast(`${orderModalSupplier} ${t('msg.onlyDeliversOn')}: ${diasEntrega.map(weekDayLabelFromStored).join(', ')}`);
      return null;
    }
  }
  const items = orderModalLines.filter(l => l.cantidad > 0).map(l => ({...l}));
  if(!items.length){ showToast(t('msg.addAtLeastOneItem')); return null; }
  const pending = pendingOrderForSupplier(orderModalSupplier);
  if(pending && !(await confirmModal(t('msg.confirmPendingOrderExists').replace('${date}', pending.date).replace('${status}', pedidoEstadoLabel(pending.estado))))) return null;
  const finalEstado = estado || 'ENVIADO';
  const notasEl = document.getElementById('order-notas');
  const order = {id: genId(), supplier: orderModalSupplier, date, estado: finalEstado, items, notas: notasEl ? notasEl.value.trim() : '', recepcion:null, comprobacion:'', area: currentArea()};
  if(finalEstado === 'ENVIADO') order.enviadoEn = todayStr();
  DB.purchaseOrders.push(order);
  saveDB();
  return order;
}

// Guarda el pedido en curso como Borrador, sin enviarlo todavía — para poder
// revisarlo con calma antes de mandarlo (antes el único estado real al crear
// un pedido era "Enviado", no había forma de dejarlo a medias).
function printPedidoBorrador(){
  if(!orderModalSupplier){ showToast(t('msg.selectSupplier')); return; }
  const items = orderModalLines.filter(l => l.cantidad > 0);
  if(!items.length){ showToast(t('msg.addAtLeastOneItem')); return; }
  const date = document.getElementById('order-date').value || todayStr();
  const notasEl = document.getElementById('order-notas');
  const o = {supplier: orderModalSupplier, date, items, notas: notasEl ? notasEl.value.trim() : ''};
  printReportWindow(t('label.purchaseOrder'), buildPedidoPrintHtml(o));
}

// Guarda el pedido como borrador, sin enviarlo: para revisarlo con calma o terminarlo luego.
async function guardarBorradorPedido(){
  const order = await buildNewPedido('BORRADOR');
  if(!order) return;
  orderModalSupplier = ''; orderModalLines = []; orderModalSearch = ''; orderFiltro = '';
  pedidosTab = 'historial';
  showToast(gl({es:'Borrador guardado en el historial', ca:'Esborrany desat a l\'historial', en:'Draft saved in the history'}));
  openPedido(order.id);
}

async function sendNewPedido(method){
  if(!orderModalSupplier){ showToast(t('msg.selectSupplier')); return; }
  const prov = getProviderByName(orderModalSupplier);
  if(method === 'whatsapp' && !(prov && prov.tel)){ showToast(t('msg.supplierMissingPhone')); return; }
  if(method === 'whatsapp' && !whatsappDeTelefono(prov.tel)){ showToast(t('msg.supplierLandline'), 4500); return; }
  if(method === 'email' && !(prov && prov.email)){ showToast(t('msg.supplierMissingEmail')); return; }
  const order = await buildNewPedido();
  if(!order) return;
  if(orderFormInline){
    // Vacía el formulario inline y pasa al historial para ver el pedido creado.
    orderModalSupplier = ''; orderModalLines = []; orderModalSearch = ''; orderFiltro = '';
    pedidosTab = 'historial';
  }else{
    closeModal();
  }
  renderPedidos();
  if(method === 'whatsapp') sendPedidoWhatsapp(order);
  else sendPedidoEmail(order);
  showToast(t('msg.orderSent'));
}

async function deleteOrder(id){
  const o = getPurchaseOrder(id);
  if(!o) return;
  /* Un pedido RECIBIDO es una compra registrada: sumó stock, generó un gasto
     variable con su IVA y es lo que justifica ese gasto ante el gestor. No
     se borra nunca — ni con el PIN, como se hacía antes. Si la recepción se
     marcó por error, la salida es "Deshacer recepción" (revertPedidoRecepcion),
     que deshace stock y gasto dejando rastro en vez de hacer desaparecer el
     documento. Mismo criterio que ventas y gastos (decisión del dueño, 12/09). */
  if(o.estado === 'RECIBIDO'){
    showToast(t('msg.receivedOrderLocked'), 6000);
    return;
  }
  if(!(await confirmModal(t('msg.confirmDeleteOrder')))) return;
  reallyDeleteOrder(id);
}
function reallyDeleteOrder(id){
  const o = getPurchaseOrder(id);
  if(!o) return;
  // Segunda barrera: ni llamándola a mano desde la consola. Una compra
  // recibida solo se deshace con revertPedidoRecepcion() — ver deleteOrder.
  if(o.estado === 'RECIBIDO') return;
  DB.purchaseOrders = DB.purchaseOrders.filter(o => o.id !== id);
  if(pedidoDetailId === id) pedidoDetailId = null;
  saveDB();
  renderPedidos();
  showToast(t('msg.orderDeleted'));
}

// Clona un pedido (recibido o no) como borrador nuevo con los mismos productos
// y cantidades originales, para no tener que rehacer pedidos recurrentes.
function duplicateOrder(id){
  const o = getPurchaseOrder(id);
  if(!o) return;
  const copy = {
    id: genId(), supplier: o.supplier, date: todayStr(), estado: 'BORRADOR',
    items: (o.items||[]).map(line => ({ingredientId: line.ingredientId, cantidad: line.cantidad, cantidadRecibida: null})),
    notas: '', recepcion: null, comprobacion: '', area: o.area || currentArea()
  };
  DB.purchaseOrders.push(copy);
  saveDB();
  showToast(t('msg.orderDuplicated'));
  openPedido(copy.id);
}

// Deshace la recepción de un pedido marcado por error: revierte el stock y
// el gasto variable ya generados y lo devuelve a Enviado. Antes la única
// salida de un "Recibido" puesto sin querer era borrar el pedido entero.
function revertPedidoRecepcion(id){
  const o = getPurchaseOrder(id);
  if(!o || o.estado !== 'RECIBIDO') return;
  requestBusinessPinAction(t('title.revertReception'), t('msg.confirmRevertReception'), (pin) => reallyRevertPedidoRecepcion(id, pin));
}
function reallyRevertPedidoRecepcion(id, pin){
  if(!accionSensibleAutorizada(pin)) return;
  const o = getPurchaseOrder(id);
  if(!o) return;
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    if(!ing) return;
    const recibida = line.cantidadRecibida||0;
    const s = getStockEntry(line.ingredientId);
    const before = s.qty||0;
    s.qty = Math.max(0, before - recibida);
    if(typeof logStockAdjustment === 'function') logStockAdjustment('ing', line.ingredientId, ing.name, before, s.qty, 'purchase');
    // Vuelve a "sin revisar": la próxima recepción parte de cero, no arrastra
    // la cantidad de la vez anterior. El checklist (marcado/nota) sí se
    // conserva, porque suele reflejar justo lo que pasó de verdad.
    line.cantidadRecibida = null;
  });
  DB.ge.variables = (DB.ge.variables||[]).filter(v => v.pedidoId !== id);
  o.gvCreated = false;
  o.estado = 'ENVIADO';
  delete o.recibidoPor;
  renderStock();
  saveDB();
  renderPedidos();
  showToast(t('msg.receptionReverted'));
}

/* ============== Leer facturas de proveedor con foto o PDF (7/10) ==============
   Apuntar una factura de 30 líneas a mano es justo lo que nadie hace un
   viernes, así que los precios de la Mega Lista se quedaban viejos y el
   food cost mentía. Ahora se hace una foto y el asistente del I+D (la misma
   llamada, la misma clave del negocio, el mismo tope diario: a GastroGoan no
   le cuesta nada) devuelve la factura en JSON.
   Pero la app NO se fía del modelo:
   - comprueba ella misma que las líneas sumen la base, que base + IVA dé el
     total y que cada cuota sea su porcentaje, y marca lo que no cuadra;
   - nada se guarda sin pasar por la pantalla de revisión, donde cada línea
     se casa con un producto de la Mega Lista (y ese casamiento se recuerda
     por proveedor + descripción, porque el mismo proveedor escribe siempre
     igual sus artículos);
   - al guardar se engancha a lo que ya existe: el gasto va a Gastos
     Variables con nº de factura, NIF y la foto como factura adjunta
     (guardarFacturaAdjunta), los precios pasan por aplicarPrecioAlbaran
     (historial y aviso de subidas) y el stock, si se marca, entra igual que
     al recibir un pedido (logStockAdjustment 'purchase'). */
const LF_TOLERANCIA = 0.02; // céntimos de redondeo por línea o por cuota
let lfEstado = null;

const LF_SISTEMA = `Eres un lector de facturas y albaranes de proveedores de hostelería en España.
Devuelve SOLO un objeto JSON, sin texto alrededor ni bloques de código, con esta forma exacta:
{"proveedor":"", "nif":"", "numFactura":"", "fecha":"AAAA-MM-DD",
 "lineas":[{"descripcion":"", "cantidad":0, "unidad":"kg|g|L|ml|ud|caja|...", "precioUnitario":0, "descuento":0, "ivaPct":10, "total":0}],
 "base":0, "ivas":[{"pct":10, "base":0, "cuota":0}], "total":0}
Reglas:
- Copia las cifras TAL COMO aparecen en el documento; no las corrijas ni las recalcules aunque no cuadren.
- "total" de cada línea es su importe SIN IVA después del descuento. "descuento" es un porcentaje (0 si no hay).
- "base" es la base imponible total; "total" es el importe final con IVA.
- Números con punto decimal, sin símbolo de moneda. Si un dato no aparece, usa "" o 0.
- "proveedor" y "nif" son los del EMISOR de la factura, nunca los del cliente.`;

function lfNum(v){
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  // El modelo a veces devuelve "1.234,56" a la española pese a las reglas.
  let s = String(v == null ? '' : v).replace(/[€\s]/g, '');
  if(/,\d{1,4}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const lfR2 = v => Math.round(v * 100) / 100;
// Clave del casamiento proveedor+descripción: sin acentos ni signos, y sin
// . # $ / [ ] porque viaja a Firebase dentro de DB.ge.config.
function lfNorm(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function lfClaveCasamiento(proveedor, desc){
  return (lfNorm(proveedor) + '|' + lfNorm(desc)).replace(/ /g, '_').slice(0, 140);
}
function lfCasamientos(){
  if(!DB.ge.config) DB.ge.config = {};
  if(!DB.ge.config.casamientosFactura) DB.ge.config.casamientosFactura = {};
  return DB.ge.config.casamientosFactura;
}
// Sugerencia por nombre: primero lo recordado de la última factura de ese
// proveedor; si no, el producto cuyo nombre más se parezca.
function lfSugerirIngrediente(proveedor, desc){
  const rec = lfCasamientos()[lfClaveCasamiento(proveedor, desc)];
  if(rec != null && getIngredient(rec)) return {id: rec, como: 'recordado'};
  const d = lfNorm(desc);
  if(!d) return null;
  const tokens = d.split(' ').filter(x => x.length >= 3);
  let mejor = null, mejorScore = 0;
  (DB.ingredients || []).forEach(ing => {
    const n = lfNorm(ing.name);
    if(!n) return;
    let score = 0;
    if(n === d) score = 1000;
    else if(n.length > 3 && (' ' + d + ' ').includes(' ' + n + ' ')) score = 100 + n.length;
    else {
      const nt = n.split(' ');
      score = tokens.filter(tk => nt.some(w => w === tk || (w.length >= 4 && tk.startsWith(w)) || (tk.length >= 4 && w.startsWith(tk)))).length * 10;
    }
    if(score > mejorScore){ mejorScore = score; mejor = ing; }
  });
  return mejorScore >= 10 ? {id: mejor.id, como: 'nombre'} : null;
}
function lfUnidadesConvertibles(a, b){
  const x = idrNormalizaUnidad(a), y = idrNormalizaUnidad(b);
  if(!x || !y) return false;
  if(x === y) return true;
  return !!(IDR_FAMILIA[x] && IDR_FAMILIA[y] && IDR_FAMILIA[x] === IDR_FAMILIA[y]);
}
// Recalcula lo que depende del producto casado: cuánto entra en SU unidad
// y a cuánto sale esa unidad (importe de la línea / cantidad que entra).
function lfRecalcularLinea(l){
  const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
  l.unidadRara = false;
  if(!ing){ l.qtyIng = 0; l.precioIng = 0; return; }
  if(!l.qtyManual){
    l.unidadRara = !lfUnidadesConvertibles(l.unidad, ing.unit);
    l.qtyIng = idrConvertirCantidad(l.cantidad, l.unidad, ing.unit);
  }
  l.precioIng = l.qtyIng > 0 ? Math.round(l.total / l.qtyIng * 10000) / 10000 : 0;
}

/* Lo que la app comprueba por su cuenta. Devuelve los fallos por línea y
   los de la factura entera; nunca corrige: enseña. */
function lfValidar(f){
  const lineas = {}, global = [];
  f.lineas.forEach((l, i) => {
    if(!l.cantidad || !l.precioUnitario) return; // sin precio unitario no hay nada que comprobar
    const esperado = lfR2(l.cantidad * l.precioUnitario * (1 - (l.descuento || 0) / 100));
    if(Math.abs(esperado - l.total) > LF_TOLERANCIA){
      lineas[i] = t('lf.err.line').replace('${c}', fmtNum(l.cantidad, 3)).replace('${p}', fmtMoney(l.precioUnitario))
        .replace('${e}', fmtMoney(esperado)).replace('${t}', fmtMoney(l.total));
    }
  });
  const suma = lfR2(f.lineas.reduce((s, l) => s + l.total, 0));
  // La tolerancia crece con las líneas: cada una puede venir redondeada.
  const tolSuma = Math.max(LF_TOLERANCIA, 0.01 * f.lineas.length);
  if(f.base && Math.abs(suma - f.base) > tolSuma){
    global.push(t('lf.err.base').replace('${s}', fmtMoney(suma)).replace('${b}', fmtMoney(f.base)));
  }
  (f.ivas || []).forEach(iv => {
    if(!iv.base) return;
    const e = lfR2(iv.base * iv.pct / 100);
    if(Math.abs(e - iv.cuota) > LF_TOLERANCIA){
      global.push(t('lf.err.iva').replace(/\$\{p\}/g, fmtNum(iv.pct, 0)).replace('${b}', fmtMoney(iv.base)).replace('${e}', fmtMoney(e)).replace('${c}', fmtMoney(iv.cuota)));
    }
  });
  const cuotas = (f.ivas || []).length ? f.ivas.reduce((s, iv) => s + iv.cuota, 0) : lfCuotasDeLineas(f).cuota;
  const base = f.base || suma;
  if(f.total && Math.abs(lfR2(base + cuotas) - f.total) > tolSuma){
    global.push(t('lf.err.total').replace('${s}', fmtMoney(lfR2(base + cuotas))).replace('${t}', fmtMoney(f.total)));
  }
  return {lineas, global, ok: !global.length && !Object.keys(lineas).length};
}
function lfCuotasDeLineas(f){
  let base = 0, cuota = 0;
  f.lineas.forEach(l => { base += l.total; cuota += l.total * (l.ivaPct || 0) / 100; });
  return {base: lfR2(base), cuota: lfR2(cuota)};
}

function lfNormalizar(j){
  const lineas = (Array.isArray(j.lineas) ? j.lineas : []).map(x => ({
    descripcion: String(x.descripcion || '').trim(), cantidad: lfNum(x.cantidad), unidad: String(x.unidad || '').trim(),
    precioUnitario: lfNum(x.precioUnitario), descuento: lfNum(x.descuento), ivaPct: lfNum(x.ivaPct), total: lfR2(lfNum(x.total)),
  })).filter(l => l.descripcion || l.total);
  // Sin importe de línea pero con cantidad y precio: se calcula (y no se
  // marca como descuadre, porque no hay dos cifras que comparar).
  lineas.forEach(l => { if(!l.total && l.cantidad && l.precioUnitario) l.total = lfR2(l.cantidad * l.precioUnitario * (1 - l.descuento / 100)); });
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(j.fecha || '')) ? j.fecha : todayStr();
  return {
    proveedor: String(j.proveedor || '').trim(), nif: String(j.nif || '').trim().toUpperCase(),
    numFactura: String(j.numFactura || '').trim(), fecha,
    lineas, base: lfR2(lfNum(j.base)), total: lfR2(lfNum(j.total)),
    ivas: (Array.isArray(j.ivas) ? j.ivas : []).map(iv => ({pct: lfNum(iv.pct), base: lfR2(lfNum(iv.base)), cuota: lfR2(lfNum(iv.cuota))})).filter(iv => iv.base || iv.cuota),
  };
}
function lfCasarLineas(f){
  f.lineas.forEach(l => {
    const s = lfSugerirIngrediente(f.proveedor, l.descripcion);
    l.ingredientId = s ? s.id : null;
    l.como = s ? s.como : '';
    l.actualizarPrecio = true;
    lfRecalcularLinea(l);
  });
}

function leerFacturaAbrir(){
  // Gestión ya es solo del propietario, pero el guard avisa en vez de callar:
  // un permiso negado en silencio se lee como una app rota.
  if(typeof isOwnerSession === 'function' && !isOwnerSession()){ showToast(t('lf.ownerOnly'), 6000); return; }
  if(!idrHayIA()){
    openModal(`
      <div class="modal-header"><h3><i class="ti ti-key"></i> ${t('lf.noKeyTitle')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <p id="lf-sin-clave" style="font-size:14px;line-height:1.5">${t('lf.noKeyBody')}</p>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="lf-activar" onclick="irAConfigIA()"><i class="ti ti-key"></i> ${t('lf.noKeyBtn')}</button>
      </div>`);
    return;
  }
  lfEstado = null;
  lfAbrirVentana(`
      <p style="font-size:14px;line-height:1.5">${t('lf.intro')}</p>
      <label class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer">
        <i class="ti ti-camera"></i> ${t('lf.pick')}
        <input type="file" id="lf-input" accept="image/*,application/pdf" style="display:none" onchange="leerFacturaArchivo(this)">
      </label>`);
}
function lfAbrirVentana(contenido){
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-scan"></i> ${t('lf.title')}</h3><button class="modal-close" onclick="lfCancelar()">&times;</button></div>
    <div id="lf-cuerpo">${contenido || ''}</div>`);
}

async function leerFacturaArchivo(input){
  const file = input && input.files && input.files[0];
  if(!file) return;
  // Se guarda YA como factura adjunta (comprimida si es foto): es la misma
  // imagen que se envía al asistente y la que quedará con el gasto.
  const facturaId = await guardarFacturaAdjunta(file);
  if(!facturaId){ input.value = ''; return; }
  const adj = facturaAdjunta(facturaId);
  const m = /^data:([^;]+);base64,(.*)$/.exec((adj && adj.dataUrl) || '');
  if(!m){ borrarFacturaAdjunta(facturaId); showToast(t('lf.unreadable')); return; }
  lfEstado = {facturaId};
  const cuerpo = document.getElementById('lf-cuerpo');
  if(cuerpo) cuerpo.innerHTML = `<p style="display:flex;align-items:center;gap:8px;font-size:14px"><i class="ti ti-loader-2"></i> ${t('lf.reading')}</p>`;
  let r;
  try{
    r = await llmChat(LF_SISTEMA, [{role:'user', content:'Lee esta factura y devuelve el JSON.'}],
      {archivo: {mime: m[1], datos: m[2]}, temperatura: 0, maxTokens: 4000, esperaMs: 90000});
  }catch(e){ r = {ok:false, motivo:'excepcion', detalle: String((e && e.message) || e)}; }
  if(!lfEstado || lfEstado.facturaId !== facturaId) return; // se cerró mientras pensaba
  const j = r.ok ? idrExtraerJson(r.texto) : null;
  if(!r.ok || !j || typeof j !== 'object'){
    if(cuerpo) cuerpo.innerHTML = `<p id="lf-error" style="font-size:14px;color:var(--red)">${escapeHtml(r.ok ? t('lf.unreadable') : idrMensajeError(r))}</p>
      <label class="btn" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer"><i class="ti ti-camera"></i> ${t('lf.pick')}
      <input type="file" accept="image/*,application/pdf" style="display:none" onchange="lfReintentar(this)"></label>`;
    return;
  }
  const f = lfNormalizar(j);
  if(!f.nif && f.proveedor && typeof GE !== 'undefined') f.nif = GE.nifDeProveedor(f.proveedor.toUpperCase());
  lfCasarLineas(f);
  lfEstado = Object.assign({facturaId, stock: false}, f);
  lfPintarRevision();
}
function lfReintentar(input){
  if(lfEstado && lfEstado.facturaId) borrarFacturaAdjunta(lfEstado.facturaId);
  lfEstado = null;
  leerFacturaArchivo(input);
}
function lfCancelar(){
  // La foto se guardó al leerla: si no se llega a guardar la compra, fuera,
  // para no dejar adjuntos huérfanos pesando en la base.
  if(lfEstado && lfEstado.facturaId) borrarFacturaAdjunta(lfEstado.facturaId);
  lfEstado = null;
  closeModal();
}

function lfPintarRevision(){
  const f = lfEstado;
  const cuerpo = document.getElementById('lf-cuerpo');
  if(!f || !cuerpo) return;
  const v = lfValidar(f);
  const ings = (DB.ingredients || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const q = lfCuotasDeLineas(f);
  const inp = (campo, i, val, tipo) => `<input type="${tipo || 'number'}" ${tipo ? '' : 'step="any" inputmode="decimal"'} data-campo="${campo}" value="${escapeHtml(String(val))}" style="width:100%;min-height:44px" onchange="lfCambiarLinea(${i},'${campo}',this.value)">`;
  cuerpo.innerHTML = `
    <h4 style="margin:0 0 8px">${t('lf.review')}</h4>
    <div class="field-row">
      <div class="field"><label>${t('common.supplier')}</label><input type="text" id="lf-prov" value="${escapeHtml(f.proveedor)}" onchange="lfCambiarCabecera('proveedor',this.value)"></div>
      <div class="field"><label>${t('hr.gv.nifProveedor')}</label><input type="text" id="lf-nif" value="${escapeHtml(f.nif)}" onchange="lfCambiarCabecera('nif',this.value)"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>${t('hr.gv.numFactura')}</label><input type="text" id="lf-num" value="${escapeHtml(f.numFactura)}" onchange="lfCambiarCabecera('numFactura',this.value)"></div>
      <div class="field"><label>${t('common.date')}</label><input type="date" id="lf-fecha" value="${escapeHtml(f.fecha)}" onchange="lfCambiarCabecera('fecha',this.value)"></div>
    </div>
    <div id="lf-validacion" class="card" style="margin:8px 0;padding:10px 12px;border-left:4px solid ${v.global.length ? 'var(--red)' : '#4A5D4E'}">
      ${v.global.length ? v.global.map(x => `<div class="lf-descuadre" style="color:var(--red);font-size:13px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(x)}</div>`).join('')
        : `<div style="font-size:13px;color:#4A5D4E"><i class="ti ti-circle-check"></i> ${t('lf.ok')}</div>`}
    </div>
    <h4 style="margin:12px 0 6px">${t('lf.lines')}</h4>
    ${f.lineas.map((l, i) => {
      const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
      const antes = ing ? Number(ing.price) || 0 : 0;
      const pct = (ing && antes && l.precioIng) ? Math.round((l.precioIng - antes) / antes * 1000) / 10 : 0;
      return `<div class="card lf-linea" data-idx="${i}" style="margin-bottom:8px;padding:10px 12px;${v.lineas[i] ? 'border-left:4px solid var(--red)' : ''}">
        <div class="field"><label>${t('lf.desc')}</label>${inp('descripcion', i, l.descripcion, 'text')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px">
          <div class="field"><label>${t('lf.qty')}</label>${inp('cantidad', i, l.cantidad)}</div>
          <div class="field"><label>${t('lf.unit')}</label>${inp('unidad', i, l.unidad, 'text')}</div>
          <div class="field"><label>${t('lf.price')}</label>${inp('precioUnitario', i, l.precioUnitario)}</div>
          <div class="field"><label>${t('lf.discount')}</label>${inp('descuento', i, l.descuento)}</div>
          <div class="field"><label>${t('lf.vat')}</label>${inp('ivaPct', i, l.ivaPct)}</div>
          <div class="field"><label>${t('lf.total')}</label>${inp('total', i, l.total)}</div>
        </div>
        ${v.lineas[i] ? `<div class="lf-err-linea" style="color:var(--red);font-size:13px;margin:4px 0"><i class="ti ti-alert-triangle"></i> ${escapeHtml(v.lineas[i])}</div>` : ''}
        <div class="field"><label>${t('lf.ingredient')}</label>
          <select class="lf-ing" style="width:100%;min-height:44px" onchange="lfCambiarLinea(${i},'ingredientId',this.value)">
            <option value="">${t('lf.noIngredient')}</option>
            ${ings.map(x => `<option value="${escapeHtml(String(x.id))}" ${String(x.id) === String(l.ingredientId) ? 'selected' : ''}>${escapeHtml(x.name)} (${escapeHtml(x.unit || '')})</option>`).join('')}
          </select>
          ${l.como ? `<div class="txt-xs lf-como" style="color:var(--muted);margin-top:2px">${t(l.como === 'recordado' ? 'lf.remembered' : 'lf.suggested')}</div>` : ''}
        </div>
        ${ing ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;align-items:end">
          <div class="field"><label>${escapeHtml(t('lf.qtyIng').replace('${u}', ing.unit || ''))}</label>${inp('qtyIng', i, l.qtyIng)}</div>
          <div class="field"><label>${escapeHtml(t('lf.newPrice').replace('${u}', ing.unit || ''))}</label>
            <div style="min-height:44px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>${antes ? fmtMoney(antes) + ' → ' : ''}<strong>${fmtMoney(l.precioIng)}</strong></span>
              ${pct > 0 ? `<span class="lf-subida" style="color:var(--red);font-weight:700;white-space:nowrap"><i class="ti ti-trending-up"></i> ${escapeHtml(t('lf.rise').replace('${p}', fmtNum(pct, 1)))}</span>` : ''}
              ${pct < 0 ? `<span style="color:#4A5D4E;font-weight:700;white-space:nowrap">${escapeHtml(t('lf.drop').replace('${p}', fmtNum(-pct, 1)))}</span>` : ''}
            </div></div>
        </div>
        ${l.unidadRara ? `<div style="color:var(--red);font-size:13px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(t('lf.unitCheck').replace('${a}', l.unidad || '?').replace('${b}', ing.unit || '?'))}</div>` : ''}
        ${antes && Math.abs(l.precioIng - antes) > 0.0001 ? `<label style="display:flex;align-items:center;gap:8px;min-height:44px;font-size:13px"><input type="checkbox" ${l.actualizarPrecio ? 'checked' : ''} onchange="lfCambiarLinea(${i},'actualizarPrecio',this.checked)"> ${t('lf.updatePrice')}</label>` : ''}` : ''}
      </div>`;
    }).join('')}
    <button class="btn btn-sm" style="min-height:44px" onclick="lfAnadirLinea()"><i class="ti ti-plus"></i> ${t('lf.addLine')}</button>
    <label style="display:flex;align-items:center;gap:8px;min-height:44px;margin-top:10px;font-size:14px"><input type="checkbox" id="lf-stock" ${f.stock ? 'checked' : ''} onchange="lfEstado.stock=this.checked"> ${t('lf.stock')}</label>
    <div style="font-weight:700;margin-top:6px">${escapeHtml(t('lf.summary').replace('${b}', fmtMoney(q.base)).replace('${i}', fmtMoney(q.cuota)).replace('${t}', fmtMoney(q.base + q.cuota)))}</div>
    <div class="modal-footer">
      <button class="btn" onclick="lfCancelar()">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="lf-guardar" onclick="lfGuardar()"><i class="ti ti-device-floppy"></i> ${t('lf.save')}</button>
    </div>`;
}
function lfCambiarCabecera(campo, valor){
  if(!lfEstado) return;
  lfEstado[campo] = campo === 'nif' ? String(valor).trim().toUpperCase() : String(valor).trim();
  // Otro proveedor puede tener otros casamientos recordados: solo se
  // re-sugiere en las líneas que aún no tienen producto.
  if(campo === 'proveedor') lfEstado.lineas.forEach(l => {
    if(l.ingredientId != null) return;
    const s = lfSugerirIngrediente(lfEstado.proveedor, l.descripcion);
    if(s){ l.ingredientId = s.id; l.como = s.como; lfRecalcularLinea(l); }
  });
  withScrollPreserved(() => lfPintarRevision());
}
function lfCambiarLinea(i, campo, valor){
  const l = lfEstado && lfEstado.lineas[i];
  if(!l) return;
  if(campo === 'descripcion' || campo === 'unidad'){ l[campo] = String(valor).trim(); if(campo === 'unidad') l.qtyManual = false; }
  else if(campo === 'ingredientId'){
    // Los ids de la Mega Lista son números; el <select> los devuelve como texto.
    const ing = valor ? (DB.ingredients || []).find(x => String(x.id) === String(valor)) : null;
    l.ingredientId = ing ? ing.id : null; l.como = ''; l.qtyManual = false;
  }
  else if(campo === 'actualizarPrecio') l.actualizarPrecio = !!valor;
  else if(campo === 'qtyIng'){ l.qtyIng = lfNum(valor); l.qtyManual = true; }
  else { l[campo] = campo === 'total' ? lfR2(lfNum(valor)) : lfNum(valor); if(campo === 'cantidad') l.qtyManual = false; }
  lfRecalcularLinea(l);
  withScrollPreserved(() => lfPintarRevision());
}
function lfAnadirLinea(){
  if(!lfEstado) return;
  lfEstado.lineas.push({descripcion:'', cantidad:0, unidad:'', precioUnitario:0, descuento:0, ivaPct:10, total:0, ingredientId:null, como:'', actualizarPrecio:true});
  withScrollPreserved(() => lfPintarRevision());
}

async function lfGuardar(){
  const f = lfEstado;
  if(!f) return;
  if(typeof isOwnerSession === 'function' && !isOwnerSession()){ showToast(t('lf.ownerOnly'), 6000); return; }
  const proveedor = (f.proveedor || '').trim().toUpperCase();
  if(!proveedor){ showToast(t('lf.needSupplier')); return; }
  if(!f.fecha){ showToast(t('lf.needDate')); return; }
  const lineas = f.lineas.filter(l => l.total > 0);
  if(!lineas.length){ showToast(t('lf.noLines')); return; }
  if(GE.isDateClosed(f.fecha)){ showToast(t('hr.te.monthClosedError')); return; }
  // confirmModal usa la misma ventana que la revisión: si dice que no,
  // se vuelve a la revisión tal cual estaba, con lo ya corregido.
  if(!lfValidar(f).ok && !(await confirmModal(t('lf.confirmDescuadre')))){
    if(lfEstado === f){ lfAbrirVentana(); lfPintarRevision(); }
    return;
  }
  if(lfEstado !== f) return;

  // 1) El gasto, agrupado por categoría y tipo de IVA (mismo criterio que
  //    registerPedidoComoGastoVariable: el IVA de cada grupo es el real).
  const grupos = {};
  lineas.forEach(l => {
    const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
    const cat = gvCategoryForIngredient(ing);
    const k = cat + '|' + (l.ivaPct || 0);
    const g = (grupos[k] = grupos[k] || {cat, iva: l.ivaPct || 0, base: 0, compras: []});
    g.base += l.total;
    // Lo que entra de cada producto viaja con el gasto: sin esto, una compra
    // apuntada por factura (sin pedido) no existía para el «impacto al mes»
    // de las subidas, que solo miraba los pedidos recibidos.
    if(ing && l.qtyIng > 0) g.compras.push({ingredientId: ing.id, qty: l.qtyIng});
  });
  const [fy, fm] = f.fecha.split('-').map(Number);
  const fechaPago = dateStr(new Date(new Date(f.fecha).getTime() + 30 * 86400000));
  if(!Array.isArray(DB.ge.variables)) DB.ge.variables = [];
  Object.values(grupos).forEach(g => {
    DB.ge.variables.push({
      id: genId(), mes: fm - 1, año: fy, categoria: g.cat, proveedor, importe: lfR2(g.base), iva: g.iva,
      fecha: f.fecha, numFactura: f.numFactura || '', nifProveedor: f.nif || '',
      facturaId: f.facturaId || null, fechaPago, pagada: false, origen: 'factura-foto',
      ...(g.compras.length ? {compras: g.compras} : {}),
    });
  });
  if(f.nif){
    if(!DB.ge.config) DB.ge.config = {};
    DB.ge.config.nifProveedores = DB.ge.config.nifProveedores || {};
    DB.ge.config.nifProveedores[proveedor] = f.nif;
  }

  // 2) Casamientos, precios (con historial) y, si se pidió, stock.
  const cas = lfCasamientos();
  let precios = 0, stockTocado = false;
  lineas.forEach(l => {
    const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
    if(!ing) return;
    if(l.descripcion) cas[lfClaveCasamiento(proveedor, l.descripcion)] = ing.id;
    if(l.actualizarPrecio && l.precioIng > 0 && Math.abs(l.precioIng - (Number(ing.price) || 0)) > 0.0001){
      // Producto sin precio todavía: registrarCambioPrecio no anota nada
      // (no hay con qué comparar) y aquí simplemente se le pone.
      aplicarPrecioAlbaran(ing, l.precioIng, proveedor);
      precios++;
    }
    if(f.stock && l.qtyIng > 0){
      const s = getStockEntry(ing.id);
      const before = s.qty || 0;
      s.qty = Math.round((before + l.qtyIng) * 10000) / 10000;
      if(typeof logStockAdjustment === 'function') logStockAdjustment('ing', ing.id, ing.name, before, s.qty, 'purchase');
      stockTocado = true;
    }
  });
  if(typeof logAudit === 'function') logAudit('stock_received', `${proveedor} ${f.numFactura || ''} ${fmtMoney(lineas.reduce((s, l) => s + l.total, 0))}`.trim());
  lfEstado = null; // la foto ya es del gasto: que cerrar no la borre
  saveDB();
  closeModal();
  if(stockTocado && typeof renderStock === 'function'){ try{ renderStock(); }catch(e){} }
  try{ GE.renderVariables(); }catch(e){}
  showToast(t('lf.saved').replace('${n}', precios));
}

/* ============== La factura dentro del pedido a proveedor (7/10) ==============
   El pedido decía qué se pidió y qué llegó; la factura, qué se cobra. Iban
   por caminos distintos (la factura, como mucho, al cajón de Gastos
   Variables) y nadie comparaba una con otro: un kilo de más facturado o una
   subida de 30 céntimos pasaban sin que nadie los viera. Ahora la factura se
   adjunta AL pedido y se cuadra contra él línea a línea.
   - Se lee con la misma lectura que «Leer factura con foto» (LF_SISTEMA,
     lfNormalizar, casamientos recordados): una sola forma de leer facturas.
   - «Nada registrado se modifica»: en un pedido recibido NO se pisan las
     cantidades recibidas. Las diferencias se ANOTAN en o.factura.cuadre, y el
     stock solo se corrige si el usuario lo pide, con un ajuste explícito
     que queda en el registro de stock.
   - Los precios pasan por aplicarPrecioAlbaran (historial y aviso de
     subidas), igual que al recibir, así el «impacto al mes» también cuenta.
   - El gasto no se duplica: si el pedido ya lo generó, se rehace con los
     importes de la factura en el mismo sitio (mismo mes, mismo estado de
     pago) y con nº, NIF y adjunto; si el mes está cerrado, solo se le
     enganchan los datos. Si aún no hay gasto, nace de la factura.
   - Sin clave de IA se adjunta igual (nº, fecha, NIF a mano) y se explica
     cómo activar la lectura. */
let pfEstado = null;

function pfFacturaLeida(o){
  return !!(o && o.factura && o.factura.leida && o.factura.confirmada && Array.isArray(o.factura.lineas) && o.factura.lineas.length);
}
// Lo que se engancha a cada línea de gasto del pedido para que el libro de
// gastos y el paquete del gestor citen la factura real.
function pfDatosFactura(o){
  const fa = o && o.factura;
  if(!fa) return {};
  const r = {};
  if(fa.numFactura) r.numFactura = fa.numFactura;
  if(fa.nif) r.nifProveedor = fa.nif;
  if(fa.facturaId) r.facturaId = fa.facturaId;
  return r;
}
// Rehace (o crea) el gasto del pedido con los importes de la factura.
// `previos` son las líneas que el pedido ya tenía: se conservan su fecha
// (el mes al que se imputó) y si estaba pagado.
function pfGastoDesdeFactura(o, previos){
  const fa = o.factura;
  const grupos = {};
  fa.lineas.forEach(l => {
    if(!(l.total > 0)) return;
    const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
    const cat = gvCategoryForIngredient(ing);
    const k = cat + '|' + (l.ivaPct || 0);
    (grupos[k] = grupos[k] || {cat, iva: l.ivaPct || 0, base: 0}).base += l.total;
  });
  const base = previos[0] || null;
  const fecha = base ? base.fecha : todayStr();
  const d = new Date(fecha);
  const fechaPago = base && base.fechaPago ? base.fechaPago : dateStr(new Date(d.getTime() + 30 * 86400000));
  const pagada = previos.length > 0 && previos.every(v => v.pagada);
  if(!Array.isArray(DB.ge.variables)) DB.ge.variables = [];
  DB.ge.variables = DB.ge.variables.filter(v => v.pedidoId !== o.id);
  Object.values(grupos).forEach(g => {
    DB.ge.variables.push({
      id: genId(), mes: base ? base.mes : d.getMonth(), año: base ? base.año : d.getFullYear(),
      categoria: g.cat, proveedor: o.supplier, importe: lfR2(g.base), iva: g.iva,
      fecha, pedidoId: o.id, auto: true, fechaPago, pagada, origen: 'factura-pedido', ...pfDatosFactura(o),
    });
  });
}

function pfTarjetaHtml(o){
  const fa = o.factura;
  if(!fa){
    return `<div class="card owner-strict" id="pf-tarjeta" style="margin-bottom:10px">
      <h3><i class="ti ti-file-invoice"></i> ${t('pf.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 8px">${t('pf.help')}</p>
      <button class="btn btn-primary" id="pf-adjuntar" style="min-height:44px" onclick="pfAbrir(${o.id})"><i class="ti ti-paperclip"></i> ${t('pf.attach')}</button>
    </div>`;
  }
  const adj = facturaAdjunta(fa.facturaId);
  const cuadre = Array.isArray(fa.cuadre) ? fa.cuadre : [];
  const difs = cuadre.filter(c => c.tipo !== 'igual');
  return `<div class="card" id="pf-tarjeta" style="margin-bottom:10px">
    <h3><i class="ti ti-file-invoice"></i> ${t('pf.title')}</h3>
    <div style="font-size:13px;display:flex;gap:6px 14px;flex-wrap:wrap">
      <span><span style="color:var(--muted)">${t('hr.gv.numFactura')}:</span> <strong id="pf-num">${escapeHtml(fa.numFactura || '—')}</strong></span>
      <span><span style="color:var(--muted)">${t('common.date')}:</span> <strong>${escapeHtml(fa.fecha || '—')}</strong></span>
      <span><span style="color:var(--muted)">${t('hr.gv.nifProveedor')}:</span> <strong>${escapeHtml(fa.nif || '—')}</strong></span>
      ${fa.total ? `<span><span style="color:var(--muted)">${t('common.total')}:</span> <strong>${fmtMoney(fa.total)}</strong></span>` : ''}
    </div>
    ${adj ? `<div style="margin-top:8px">${adj.dataUrl.startsWith('data:image')
      ? `<img src="${adj.dataUrl}" alt="" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="window.open(this.src,'_blank')">`
      : `<a href="${adj.dataUrl}" download="${escapeHtml(adj.name || 'factura.pdf')}" class="btn btn-sm" style="min-height:44px"><i class="ti ti-file-text"></i> ${escapeHtml(adj.name || 'factura.pdf')}</a>`}</div>` : ''}
    ${!fa.leida ? `<p class="txt-xs" style="color:var(--muted);margin:8px 0 0">${t('pf.notRead')}</p>`
      : `<div id="pf-difs" style="margin-top:8px;font-size:13px">${difs.length
        ? difs.map(c => `<div class="pf-dif" style="color:${c.tipo === 'sube' || c.tipo === 'baja' ? '#8A7440' : 'var(--red)'}"><i class="ti ti-alert-triangle"></i> ${escapeHtml(pfTextoFila(c))}</div>`).join('')
        : `<div style="color:#4A5D4E"><i class="ti ti-circle-check"></i> ${t('pf.allMatch')}</div>`}
        ${fa.ajusteStock ? `<div class="txt-xs" style="color:var(--muted);margin-top:4px">${t('pf.stockAdjusted')}</div>` : ''}</div>`}
  </div>`;
}

function pfAbrir(pedidoId){
  // Adjuntar la factura cambia precios y el gasto: es cosa del propietario,
  // y se dice (un permiso negado en silencio se lee como una app rota).
  if(typeof isOwnerSession === 'function' && !isOwnerSession()){ showToast(t('pf.ownerOnly'), 6000); return; }
  const o = getPurchaseOrder(pedidoId);
  if(!o) return;
  pfEstado = {pedidoId};
  const hayIA = typeof idrHayIA === 'function' && idrHayIA();
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-file-invoice"></i> ${t('pf.title')}</h3><button class="modal-close" onclick="pfCancelar()">&times;</button></div>
    <div id="pf-cuerpo">
      <p style="font-size:14px;line-height:1.5">${t(hayIA ? 'pf.intro' : 'pf.introNoKey')}</p>
      ${hayIA ? '' : `<div id="pf-sin-clave" class="card" style="font-size:13px;line-height:1.5;padding:10px 12px">${t('lf.noKeyBody')}
        <div><button class="btn btn-sm" style="min-height:44px;margin-top:6px" onclick="irAConfigIA()"><i class="ti ti-key"></i> ${t('lf.noKeyBtn')}</button></div></div>`}
      <label class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer">
        <i class="ti ti-camera"></i> ${t('lf.pick')}
        <input type="file" id="pf-input" accept="image/*,application/pdf" style="display:none" onchange="pfArchivo(this)">
      </label>
    </div>`);
}
function pfCancelar(){
  if(pfEstado && pfEstado.facturaId) borrarFacturaAdjunta(pfEstado.facturaId);
  pfEstado = null;
  closeModal();
}

async function pfArchivo(input){
  const file = input && input.files && input.files[0];
  if(!file || !pfEstado) return;
  const o = getPurchaseOrder(pfEstado.pedidoId);
  if(!o) return;
  const facturaId = await guardarFacturaAdjunta(file);
  if(!facturaId){ input.value = ''; return; }
  const pedidoId = o.id;
  const nifConocido = typeof GE !== 'undefined' && GE.nifDeProveedor ? (GE.nifDeProveedor(String(o.supplier || '').toUpperCase()) || '') : '';
  pfEstado = {pedidoId, facturaId, leida: false, numFactura: '', fecha: todayStr(), nif: nifConocido, lineas: []};
  const cuerpo = document.getElementById('pf-cuerpo');
  const hayIA = typeof idrHayIA === 'function' && idrHayIA();
  const adj = facturaAdjunta(facturaId);
  const m = /^data:([^;]+);base64,(.*)$/.exec((adj && adj.dataUrl) || '');
  if(!hayIA || !m){ pfPintarManual(); return; }
  if(cuerpo) cuerpo.innerHTML = `<p style="display:flex;align-items:center;gap:8px;font-size:14px"><i class="ti ti-loader-2"></i> ${t('lf.reading')}</p>`;
  let r;
  try{
    r = await llmChat(LF_SISTEMA, [{role:'user', content:'Lee esta factura y devuelve el JSON.'}],
      {archivo: {mime: m[1], datos: m[2]}, temperatura: 0, maxTokens: 4000, esperaMs: 90000});
  }catch(e){ r = {ok:false, motivo:'excepcion', detalle: String((e && e.message) || e)}; }
  if(!pfEstado || pfEstado.facturaId !== facturaId) return; // se cerró mientras pensaba
  const j = r.ok ? idrExtraerJson(r.texto) : null;
  if(!r.ok || !j || typeof j !== 'object'){
    // Sin lectura no se pierde la factura: se adjunta a mano, avisando.
    pfEstado.error = r.ok ? t('lf.unreadable') : idrMensajeError(r);
    pfPintarManual();
    return;
  }
  const f = lfNormalizar(j);
  // El proveedor es el del pedido: los casamientos recordados son suyos.
  f.proveedor = o.supplier || f.proveedor;
  lfCasarLineas(f);
  Object.assign(pfEstado, {leida: true, numFactura: f.numFactura, fecha: f.fecha, nif: f.nif || nifConocido,
    lineas: f.lineas, base: f.base, ivas: f.ivas, total: f.total, proveedor: f.proveedor, ajustarStock: false});
  pfPintarCuadre();
}

function pfCabeceraHtml(e){
  return `<div class="field-row">
      <div class="field"><label>${t('hr.gv.numFactura')}</label><input type="text" id="pf-f-num" value="${escapeHtml(e.numFactura || '')}" onchange="pfEstado.numFactura=this.value.trim()"></div>
      <div class="field"><label>${t('common.date')}</label><input type="date" id="pf-f-fecha" value="${escapeHtml(e.fecha || '')}" onchange="pfEstado.fecha=this.value"></div>
    </div>
    <div class="field"><label>${t('hr.gv.nifProveedor')}</label><input type="text" id="pf-f-nif" value="${escapeHtml(e.nif || '')}" onchange="pfEstado.nif=this.value.trim().toUpperCase()"></div>`;
}
function pfPintarManual(){
  const e = pfEstado, cuerpo = document.getElementById('pf-cuerpo');
  if(!e || !cuerpo) return;
  cuerpo.innerHTML = `
    ${e.error ? `<p id="pf-error" style="font-size:13px;color:var(--red)"><i class="ti ti-alert-triangle"></i> ${escapeHtml(e.error)}</p>` : ''}
    <p id="pf-manual" style="font-size:13px;color:var(--muted)">${t('pf.manual')}</p>
    ${pfCabeceraHtml(e)}
    <div class="modal-footer">
      <button class="btn" onclick="pfCancelar()">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="pf-confirmar" onclick="pfConfirmar()"><i class="ti ti-device-floppy"></i> ${t('pf.saveAttach')}</button>
    </div>`;
}

// Cuadra la factura contra el pedido. Para un pedido recibido se compara con
// lo RECIBIDO (lo que entró en stock); si no, con lo pedido.
function pfCuadre(o, e){
  const recibido = o.estado === 'RECIBIDO';
  const porIng = {}, sobran = [];
  e.lineas.forEach(l => {
    if(!(l.total > 0) && !l.cantidad) return;
    if(l.ingredientId == null || !(o.items || []).some(it => it.ingredientId === l.ingredientId)){ sobran.push(l); return; }
    const g = porIng[l.ingredientId] || (porIng[l.ingredientId] = {qty: 0, total: 0, lineas: []});
    g.qty += Number(l.qtyIng) || 0; g.total += Number(l.total) || 0; g.lineas.push(l);
  });
  const filas = [];
  (o.items || []).forEach(it => {
    const ing = getIngredient(it.ingredientId);
    const nombre = ing ? ing.name : '—', unidad = ing ? (ing.unit || '') : '';
    const qtyPedido = recibido ? (it.cantidadRecibida != null ? Number(it.cantidadRecibida) : 0) : (Number(it.cantidad) || 0);
    const g = porIng[it.ingredientId];
    if(!g){
      if(qtyPedido > 0) filas.push({tipo: 'falta', ingredientId: it.ingredientId, nombre, unidad, qtyPedido, qtyFactura: 0});
      return;
    }
    const qtyFactura = Math.round(g.qty * 10000) / 10000;
    const precioFactura = qtyFactura > 0 ? Math.round(g.total / qtyFactura * 10000) / 10000 : 0;
    const precioAntes = ing ? Number(ing.price) || 0 : 0;
    const pct = precioAntes && precioFactura ? Math.round((precioFactura - precioAntes) / precioAntes * 1000) / 10 : 0;
    const fila = {ingredientId: it.ingredientId, nombre, unidad, qtyPedido, qtyFactura, precioAntes, precioFactura, pct,
      actualizarPrecio: g.lineas.every(l => l.actualizarPrecio !== false)};
    // Una fila puede traer cantidad distinta Y cambio de precio a la vez.
    fila.cambiaPrecio = !!(precioAntes && precioFactura && Math.abs(precioFactura - precioAntes) > 0.0001);
    if(Math.abs(qtyFactura - qtyPedido) > 0.001) fila.tipo = 'cantidad';
    else if(fila.cambiaPrecio) fila.tipo = precioFactura > precioAntes ? 'sube' : 'baja';
    else fila.tipo = 'igual';
    filas.push(fila);
  });
  sobran.forEach(l => {
    const ing = l.ingredientId != null ? getIngredient(l.ingredientId) : null;
    filas.push({tipo: 'sobra', ingredientId: ing ? ing.id : null, nombre: ing ? ing.name : (l.descripcion || '—'),
      unidad: ing ? (ing.unit || '') : (l.unidad || ''), qtyPedido: 0, qtyFactura: ing ? l.qtyIng : l.cantidad, importe: l.total});
  });
  const q = lfCuotasDeLineas(e);
  const totalFactura = e.total || lfR2(q.base + q.cuota);
  return {filas, totalPedido: lfR2(pedidoTotalConIva(o)), totalFactura, recibido};
}
function pfTextoPrecio(c){
  return t('pf.row.' + (c.precioFactura > c.precioAntes ? 'sube' : 'baja')).replace('${a}', fmtMoney(c.precioAntes))
    .replace('${b}', fmtMoney(c.precioFactura)).replace('${p}', fmtNum(Math.abs(c.pct), 1));
}
function pfTextoFila(c){
  const u = c.unidad || '';
  const q = n => fmtNum(n || 0, 3) + (u ? ' ' + u : '');
  if(c.tipo === 'falta') return t('pf.row.falta').replace('${q}', q(c.qtyPedido));
  if(c.tipo === 'sobra') return t('pf.row.sobra').replace('${q}', q(c.qtyFactura));
  if(c.tipo === 'cantidad') return t('pf.row.cantidad').replace('${p}', q(c.qtyPedido)).replace('${f}', q(c.qtyFactura));
  if(c.tipo === 'sube' || c.tipo === 'baja') return pfTextoPrecio(c);
  return t('pf.row.igual');
}

function pfPintarCuadre(){
  const e = pfEstado, cuerpo = document.getElementById('pf-cuerpo');
  if(!e || !cuerpo) return;
  const o = getPurchaseOrder(e.pedidoId);
  if(!o) return;
  const c = pfCuadre(o, e);
  const color = {igual: '#4A5D4E', sube: '#8A7440', baja: '#8A7440', cantidad: 'var(--red)', falta: 'var(--red)', sobra: 'var(--red)'};
  const badge = {igual: 'badge-green', sube: 'badge-amber', baja: 'badge-amber', cantidad: 'badge-red', falta: 'badge-red', sobra: 'badge-red'};
  const hayCantidad = c.recibido && c.filas.some(f => f.tipo === 'cantidad' && f.ingredientId != null);
  const v = lfValidar(e);
  const difTotal = lfR2(c.totalFactura - c.totalPedido);
  cuerpo.innerHTML = `
    <h4 style="margin:0 0 8px">${t('pf.review')}</h4>
    ${pfCabeceraHtml(e)}
    ${v.global.length ? `<div class="card" style="margin:8px 0;padding:10px 12px;border-left:4px solid var(--red)">${v.global.map(x => `<div style="color:var(--red);font-size:13px"><i class="ti ti-alert-triangle"></i> ${escapeHtml(x)}</div>`).join('')}</div>` : ''}
    <p class="txt-xs" style="color:var(--muted);margin:6px 0">${t(c.recibido ? 'pf.vsReceived' : 'pf.vsOrdered')}</p>
    ${c.filas.map(f => `<div class="card pf-fila pf-${f.tipo}" data-ing="${escapeHtml(String(f.ingredientId == null ? '' : f.ingredientId))}" style="margin-bottom:6px;padding:8px 12px;border-left:4px solid ${color[f.tipo]}">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline">
        <strong>${escapeHtml(f.nombre)}</strong>
        <span class="badge ${badge[f.tipo]}">${t('pf.tag.' + f.tipo)}${(f.tipo === 'sube' || f.tipo === 'baja') ? ' ' + (f.pct > 0 ? '+' : '−') + fmtNum(Math.abs(f.pct), 1) + ' %' : ''}</span>
      </div>
      <div style="font-size:13px;margin-top:2px">${escapeHtml(pfTextoFila(f))}</div>
      ${f.cambiaPrecio && f.tipo === 'cantidad' ? `<div style="font-size:13px;color:#8A7440">${escapeHtml(pfTextoPrecio(f))}</div>` : ''}
      ${f.cambiaPrecio ? `<label style="display:flex;align-items:center;gap:8px;min-height:44px;font-size:13px"><input type="checkbox" class="pf-precio" ${f.actualizarPrecio ? 'checked' : ''} onchange="pfMarcarPrecio(${escapeHtml(JSON.stringify(f.ingredientId))}, this.checked)"> ${t('lf.updatePrice')}</label>` : ''}
    </div>`).join('')}
    <div class="card" id="pf-totales" style="margin:8px 0;padding:10px 12px;border-left:4px solid ${Math.abs(difTotal) <= 0.05 ? '#4A5D4E' : 'var(--red)'}">
      <div style="font-size:14px">${escapeHtml(t('pf.totals').replace('${p}', fmtMoney(c.totalPedido)).replace('${f}', fmtMoney(c.totalFactura)))}</div>
      ${Math.abs(difTotal) > 0.05 ? `<div style="font-weight:700;color:var(--red)">${escapeHtml(t('pf.totalDiff').replace('${d}', (difTotal > 0 ? '+' : '−') + fmtMoney(Math.abs(difTotal))))}</div>` : ''}
    </div>
    ${hayCantidad ? `<label style="display:flex;align-items:flex-start;gap:8px;min-height:44px;font-size:13px"><input type="checkbox" id="pf-ajuste" ${e.ajustarStock ? 'checked' : ''} onchange="pfEstado.ajustarStock=this.checked" style="margin-top:3px"> ${t('pf.adjustStock')}</label>` : ''}
    <p class="txt-xs" style="color:var(--muted)">${t(o.gvCreated ? 'pf.expenseLinked' : (c.recibido ? 'pf.expenseNew' : 'pf.expenseOnReceive'))}</p>
    <div class="modal-footer">
      <button class="btn" onclick="pfCancelar()">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="pf-confirmar" onclick="pfConfirmar()"><i class="ti ti-check"></i> ${t('pf.confirm')}</button>
    </div>`;
}
function pfMarcarPrecio(ingredientId, valor){
  if(!pfEstado) return;
  pfEstado.lineas.forEach(l => { if(l.ingredientId === ingredientId) l.actualizarPrecio = !!valor; });
}

function pfConfirmar(){
  const e = pfEstado;
  if(!e) return;
  if(typeof isOwnerSession === 'function' && !isOwnerSession()){ showToast(t('pf.ownerOnly'), 6000); return; }
  const o = getPurchaseOrder(e.pedidoId);
  if(!o){ pfCancelar(); return; }
  if(!e.fecha){ showToast(t('lf.needDate')); return; }
  const fa = {facturaId: e.facturaId, numFactura: e.numFactura || '', fecha: e.fecha, nif: e.nif || '',
    leida: !!e.leida, ts: new Date().toISOString(), actor: (typeof currentActorName === 'function') ? currentActorName() : ''};
  let precios = 0;
  if(e.leida){
    const c = pfCuadre(o, e);
    fa.lineas = e.lineas.filter(l => l.total > 0).map(l => ({descripcion: l.descripcion || '', ingredientId: l.ingredientId != null ? l.ingredientId : null,
      qtyIng: Number(l.qtyIng) || 0, total: l.total, ivaPct: l.ivaPct || 0}));
    fa.base = lfCuotasDeLineas(e).base; fa.total = c.totalFactura; fa.totalPedido = c.totalPedido;
    // Las diferencias se ANOTAN tal como estaban al confirmar: es el papel
    // que se enseña al proveedor para reclamar, no un cálculo que cambie
    // cuando luego se mueva el precio de la Mega Lista.
    fa.cuadre = c.filas.map(f => {
      const r = {tipo: f.tipo, nombre: f.nombre, unidad: f.unidad, qtyPedido: f.qtyPedido, qtyFactura: f.qtyFactura || 0};
      if(f.ingredientId != null) r.ingredientId = f.ingredientId;
      if(f.precioAntes != null){ r.precioAntes = f.precioAntes; r.precioFactura = f.precioFactura; r.pct = f.pct; }
      return r;
    });
    fa.confirmada = true;
    // 1) Precios: subidas Y bajadas, por la misma puerta que la recepción.
    const cas = lfCasamientos();
    e.lineas.forEach(l => { if(l.ingredientId != null && l.descripcion) cas[lfClaveCasamiento(o.supplier, l.descripcion)] = l.ingredientId; });
    c.filas.forEach(f => {
      if(!f.cambiaPrecio || !f.actualizarPrecio) return;
      const ing = getIngredient(f.ingredientId);
      if(!ing) return;
      aplicarPrecioAlbaran(ing, f.precioFactura, o.supplier);
      precios++;
    });
    // 2) Stock: SOLO si se pidió, y como ajuste aparte. cantidadRecibida no
    //    se toca: lo que se registró al recibir sigue siendo lo registrado.
    if(e.ajustarStock && c.recibido){
      const ajustes = [];
      c.filas.forEach(f => {
        if(f.tipo !== 'cantidad' || f.ingredientId == null) return;
        const ing = getIngredient(f.ingredientId);
        if(!ing) return;
        const s = getStockEntry(f.ingredientId);
        const before = s.qty || 0;
        const delta = Math.round((f.qtyFactura - f.qtyPedido) * 10000) / 10000;
        s.qty = Math.max(0, Math.round((before + delta) * 10000) / 10000);
        // 'purchase' y no 'manual': es una corrección de la compra, no una
        // merma, y no debe inflar el informe de mermas.
        logStockAdjustment('ing', f.ingredientId, ing.name, before, s.qty, 'purchase');
        ajustes.push({ingredientId: f.ingredientId, delta});
      });
      if(ajustes.length) fa.ajusteStock = ajustes;
    }
  }
  o.factura = fa;
  if(fa.nif){
    if(!DB.ge.config) DB.ge.config = {};
    DB.ge.config.nifProveedores = DB.ge.config.nifProveedores || {};
    DB.ge.config.nifProveedores[String(o.supplier || '').toUpperCase()] = fa.nif;
  }
  // 3) El gasto, sin duplicar.
  const previos = ((DB.ge && DB.ge.variables) || []).filter(v => v.pedidoId === o.id);
  if(previos.length){
    const cerrado = typeof GE !== 'undefined' && GE.isDateClosed && GE.isDateClosed(previos[0].fecha);
    if(pfFacturaLeida(o) && !cerrado) pfGastoDesdeFactura(o, previos);
    else previos.forEach(v => Object.assign(v, pfDatosFactura(o)));
  } else if(o.estado === 'RECIBIDO' && pfFacturaLeida(o)){
    pfGastoDesdeFactura(o, []);
    o.gvCreated = true;
  }
  // Un pedido aún sin recibir: el gasto nacerá al recibirlo, ya con la
  // factura (registerPedidoComoGastoVariable la usa). Crearlo ahora lo
  // duplicaría en la recepción.
  if(typeof logAudit === 'function') logAudit('stock_received', `${o.supplier || ''} ${fa.numFactura}`.trim());
  pfEstado = null; // la foto ya es del pedido: que cerrar no la borre
  saveDB();
  closeModal();
  if(fa.ajusteStock && typeof renderStock === 'function'){ try{ renderStock(); }catch(err){} }
  if(pedidoDetailId === o.id){ try{ renderPedidoDetail(); }catch(err){} }
  showToast(t('pf.saved').replace('${n}', precios));
}
