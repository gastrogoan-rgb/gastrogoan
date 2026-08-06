/* ============================================================
   ARQUEO DE CAJA — Cierre de turno/día
   ============================================================ */
function fmtDateTime(d){
  return d.toLocaleString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
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
  const {desde, hasta, lastClosure} = getCashClosurePeriod();
  const today = todayStr();
  return DB.sales.filter(s => {
    if(s.date !== today) return false;
    if(!s.createdAt) return !lastClosure;
    const dt = new Date(s.createdAt);
    return dt > desde && dt <= hasta;
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
    <div class="field-row">
      <div class="field"><label>${t('label.initialCashFund')}</label><input type="number" id="closure-fondo" step="0.01" value="0" oninput="updateClosureDiffPreview()"></div>
      <div class="field"><label>${t('label.cashCounted')}</label><input type="number" id="closure-contado" step="0.01" placeholder="0.00" oninput="updateClosureDiffPreview()"></div>
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

// Umbral a partir del cual una descuadre de caja se considera lo bastante
// grande como para avisar (no bloquea el cierre, solo lo señala para que no
// pase desapercibido entre turno y turno).
const CASH_DIFF_WARNING_THRESHOLD = 10;

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

function performCashClosure(){
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

  const closure = {
    id: genId(), fecha: todayStr(), desde, hasta,
    totales, total, ticketCount,
    descuentos: discounts, totalDescuentos: discounts.reduce((s,d)=>s+d.importe, 0),
    anulaciones: voids,
    fondoInicial, efectivoEsperado, efectivoContado, diferencia, notas, warnings,
    createdAt: new Date().toISOString()
  };
  DB.cashClosures.push(closure);
  saveDB();
  closeModal();
  renderTPV();
  printCashClosure(closure);
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
  const win = window.open('', '_blank', 'width=320,height=520');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  const diffLine = closure.efectivoContado === null ? '' :
    `${t('label.cashCounted')}: ${fmtMoney(closure.efectivoContado)}\n${t('label.difference')}: ${closure.diferencia>0?'+':''}${fmtMoney(closure.diferencia)}${closure.diferencia===0?` (${t('label.exactCash')})`:closure.diferencia>0?` (${t('label.cashSurplus')})`:` (${t('label.cashShortage')})`}\n`;
  const discountsBlock = (closure.descuentos||[]).length ? `------------------------------\n${t('title.discountsAppliedThisPeriod').toUpperCase()}\n` +
    closure.descuentos.map(d => `${escapeHtml(d.hora)} ${escapeHtml(d.mesa||'')} ${escapeHtml(d.responsableNombre||'—')} ${d.porcentaje}% ${fmtMoney(d.importe)}\n  ${escapeHtml(d.motivo)}`).join('\n') +
    `\n${t('label.totalDiscounts')}: ${fmtMoney(closure.totalDescuentos||0)}\n` : '';
  const voidsBlock = (closure.anulaciones||[]).length ? `------------------------------\n${t('title.voidsThisPeriod').toUpperCase()}\n` +
    closure.anulaciones.map(v => `${escapeHtml(v.hora)} ${escapeHtml(v.mesa||'')} ${v.cantidad}x ${escapeHtml(v.plato)} — ${escapeHtml(v.responsableNombre||'—')}\n  ${escapeHtml(v.motivo)}`).join('\n') + '\n' : '';
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('title.cashClosureReceipt')}</title></head><body style="font-family:monospace;padding:16px;font-size:12px;white-space:pre-wrap">
${escapeHtml(DB.business.name||'GastroGoan')}
${t('title.cashClosureReceipt').toUpperCase()}
${t('label.from')}: ${fmtDateTime(new Date(closure.desde))}
${t('label.to')}: ${fmtDateTime(new Date(closure.hasta))}
------------------------------
${PAYMENT_METHODS.map(m => `${paymentMethodTpvLabel(m).padEnd(12)}${fmtMoney(closure.totales[m]||0)}`).join('\n')}
------------------------------
${t('label.totalSales').toUpperCase()}: ${fmtMoney(closure.total)}
${t('noun.tickets')}: ${closure.ticketCount}
${discountsBlock}${voidsBlock}------------------------------
${t('label.initialFund')}: ${fmtMoney(closure.fondoInicial)}
${t('label.expectedCash')}: ${fmtMoney(closure.efectivoEsperado)}
${diffLine}${closure.notas ? '\n'+t('common.notes')+': '+escapeHtml(closure.notas)+'\n' : ''}
</body></html>`);
  win.document.close();
  win.print();
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
        <thead><tr><th>${t('common.date')}</th><th>${t('label.closingTime')}</th><th>${t('label.totalSales')}</th><th>${t('label.difference')}</th><th></th></tr></thead>
        <tbody>
          ${closures.map(c => `
            <tr>
              <td>${escapeHtml(c.fecha)}</td>
              <td>${fmtDateTime(new Date(c.hasta))}</td>
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
  const q = providerSearchQuery.trim().toLowerCase();
  let providers = DB.providers.filter(p => (p.area||'cocina') === currentArea());
  if(q) providers = providers.filter(p => p.nombre.toLowerCase().includes(q) || (p.contacto||'').toLowerCase().includes(q) || (p.dir||'').toLowerCase().includes(q) || (p.tel||'').includes(q));
  if(!providers.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-building-factory-2"></i>${q ? t('empty.noSearchResults') : t('empty.suppliers')}</div>`;
    return;
  }
  box.innerHTML = providers.map(p => {
    const ings = ingredientsForSupplier(p.nombre);
    return `
    <div class="card">
      <h3 style="justify-content:space-between">
        <span><i class="ti ti-building-factory-2"></i> ${escapeHtml(p.nombre)}</span>
        <span class="actions-cell">
          <button class="owner-only btn btn-sm btn-icon" onclick="openProviderModal(${p.id})"><i class="ti ti-edit"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteProvider(${p.id})"><i class="ti ti-trash"></i></button>
        </span>
      </h3>
      ${p.contacto ? `<div><i class="ti ti-user"></i> ${escapeHtml(p.contacto)}</div>` : ''}
      ${p.tel ? `<div><i class="ti ti-phone"></i> <a href="tel:${escapeHtml(p.tel)}">${escapeHtml(p.tel)}</a> · <a href="https://wa.me/${escapeHtml(p.tel.replace(/\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a></div>` : ''}
      ${p.email ? `<div><i class="ti ti-mail"></i> <a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></div>` : ''}
      ${getProviderDiasEntrega(p).length ? `<div><i class="ti ti-truck-delivery"></i> ${t('label.delivery')}: ${getProviderDiasEntrega(p).map(d=>escapeHtml(weekDayLabelFromStored(d))).join(', ')}${p.horaEntrega?` · ${escapeHtml(p.horaEntrega)}${t('label.hoursApprox')}`:''}</div>` : ''}
      ${p.dir ? `<div><i class="ti ti-map-pin"></i> ${escapeHtml(p.dir)}</div>` : ''}
      ${p.iban ? `<div><i class="ti ti-credit-card"></i> ${escapeHtml(p.iban)}</div>` : ''}
      ${p.pago ? `<span class="badge badge-gray">${escapeHtml(paymentMethodLabel(p.pago))}</span>` : ''}
      ${p.notas ? `<div style="font-size:13px;color:var(--muted);margin-top:6px">${escapeHtml(p.notas)}</div>` : ''}
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
        ${ings.length
          ? `<button class="btn btn-sm" onclick="openSupplierIngredientsModal(${p.id})"><i class="ti ti-list"></i> ${t('label.ingredientsFromSupplier')} (${ings.length})</button>`
          : `<span style="color:var(--muted);font-size:13px"><i class="ti ti-list"></i> ${t('label.ingredientsFromSupplier')} (0)</span>`}
        <button class="btn btn-sm" onclick="viewSupplierOrderHistory('${escapeJsAttr(p.nombre)}')"><i class="ti ti-history"></i> ${t('tab.orderHistory')}</button>
      </div>
    </div>
  `;}).join('');
}
function openSupplierIngredientsModal(providerId){
  const p = DB.providers.find(x=>x.id===providerId);
  if(!p) return;
  const ings = ingredientsForSupplier(p.nombre).slice().sort((a,b)=>a.name.localeCompare(b.name));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-list"></i> ${escapeHtml(p.nombre)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div style="max-height:60vh;overflow-y:auto">
      ${ings.length ? ings.map(i => `
        <div class="ge-item">
          <span style="flex:1;font-weight:600">${escapeHtml(i.name)}</span>
          <span style="font-family:monospace;color:var(--muted)">${escapeHtml(i.unit||'')}</span>
          <span style="font-family:monospace;font-weight:600;margin-left:10px">${fmtMoney(i.price)}</span>
        </div>
      `).join('') : `<div class="empty"><i class="ti ti-list"></i>${t('empty.suppliers')}</div>`}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
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
  const p = id ? DB.providers.find(x=>x.id===id) : {nombre:'',tel:'',email:'',contacto:'',pago:'Contado',dir:'',iban:'',notas:'',diaEntrega:'',horaEntrega:''};
  const diasEntrega = getProviderDiasEntrega(p);
  openModal(`
    <div class="modal-header">
      <h3>${id?t('title.editSupplier'):t('title.newSupplier')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field"><label>${t('common.name')}</label><input type="text" id="prov-nombre" value="${escapeHtml(p.nombre)}" placeholder="${t('ph.egSupplierName')}"></div>
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
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${WEEK_DAYS.map((d,i)=>`
          <label style="display:flex;align-items:center;gap:4px;font-weight:400;font-size:13px">
            <input type="checkbox" id="prov-dia-entrega-${i}" value="${escapeHtml(d)}" ${diasEntrega.includes(d)?'checked':''} style="width:auto">
            ${weekDayFull(i)}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="field"><label>${t('label.approxDeliveryTime')}</label><input type="time" id="prov-hora-entrega" value="${escapeHtml(p.horaEntrega||'')}"></div>
    <div class="field"><label>${t('common.address')}</label><input type="text" id="prov-dir" value="${escapeHtml(p.dir)}"></div>
    <div class="field"><label>IBAN</label><input type="text" id="prov-iban" value="${escapeHtml(p.iban)}"></div>
    <div class="field"><label>${t('common.notes')}</label><textarea id="prov-notas" rows="2">${escapeHtml(p.notas)}</textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveProvider(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

function saveProvider(id){
  const nombre = document.getElementById('prov-nombre').value.trim();
  if(!nombre){ showToast(t('msg.nameRequired')); return; }
  // El vínculo con los ingredientes de Mega Lista y con los pedidos es por
  // nombre exacto (no por id) — un proveedor duplicado con mayúsculas o
  // espacios distintos rompería ese vínculo en silencio, así que se avisa
  // (no bloqueante) si ya existe otro con el mismo nombre.
  const dupe = DB.providers.find(p => p.id !== id && (p.area||'cocina')===currentArea() && p.nombre.trim().toLowerCase() === nombre.toLowerCase());
  if(dupe && !confirm(t('msg.confirmDuplicateSupplier').replace('${name}', dupe.nombre))) return;
  const data = {
    nombre,
    contacto: document.getElementById('prov-contacto').value.trim(),
    pago: document.getElementById('prov-pago').value,
    tel: document.getElementById('prov-tel').value.trim(),
    email: document.getElementById('prov-email').value.trim(),
    dir: document.getElementById('prov-dir').value.trim(),
    iban: document.getElementById('prov-iban').value.trim(),
    diasEntrega: WEEK_DAYS.filter((_,i)=>document.getElementById(`prov-dia-entrega-${i}`).checked),
    horaEntrega: document.getElementById('prov-hora-entrega').value,
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
      DB.ingredients.forEach(i => { if(i.supplier === oldName) i.supplier = nombre; });
      (DB.purchaseOrders||[]).forEach(o => { if(o.supplier === oldName) o.supplier = nombre; });
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

function deleteProvider(id){
  if(!confirm(t('msg.confirmDeleteSupplier'))) return;
  DB.providers = DB.providers.filter(p=>p.id!==id);
  saveDB();
  renderProveedores();
}

function getProviderByName(name){
  return DB.providers.find(p => p.nombre.trim().toLowerCase() === (name||'').trim().toLowerCase());
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
  if(tab === 'crear'){ orderModalSupplier = ''; orderModalLines = []; orderModalSearch = ''; }
  renderPedidos();
}
function updatePedidosTabsUI(){
  const c = document.getElementById('pedidos-tab-crear');
  const h = document.getElementById('pedidos-tab-historial');
  if(c) c.classList.toggle('btn-primary', pedidosTab === 'crear');
  if(h) h.classList.toggle('btn-primary', pedidosTab === 'historial');
}

function renderPedidos(){
  // Sin permiso de editar, "Realizar Pedido" no está disponible (el botón
  // ni siquiera se ve) — si por cualquier motivo quedó seleccionada esa
  // pestaña de una sesión anterior, se cae al historial en vez de dejar
  // ver el formulario de creación igualmente.
  if(pedidosTab === 'crear' && !editUnlocked) pedidosTab = 'historial';
  updatePedidosTabsUI();
  const o = pedidoDetailId && getPurchaseOrder(pedidoDetailId);
  if(o && (o.area||'cocina') === currentArea()){
    renderPedidoDetail();
  }else{
    pedidoDetailId = null;
    if(pedidosTab === 'crear') renderPedidoCrear();
    else renderPedidoList();
  }
}

let pedidoHistorialSupplierFilter = '';
let pedidoHistorialDateFrom = '';
let pedidoHistorialDateTo = '';
let pedidoHistorialSearch = '';
function setPedidoHistorialSupplierFilter(val){
  pedidoHistorialSupplierFilter = val;
  renderPedidoList();
}
function setPedidoHistorialDateFilter(field, val){
  if(field === 'from') pedidoHistorialDateFrom = val; else pedidoHistorialDateTo = val;
  renderPedidoList();
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

  const kpiHtml = `
    <div class="grid grid-4" style="margin-bottom:14px">
      <div class="kpi"><div class="label">${t('label.drafts')}</div><div class="value">${counts.BORRADOR}</div></div>
      <div class="kpi warn"><div class="label">${t('label.sentOrders')}</div><div class="value">${counts.ENVIADO}</div></div>
      <div class="kpi ok"><div class="label">${t('label.receivedOrders')}</div><div class="value">${counts.RECIBIDO}</div></div>
      <div class="kpi"><div class="label">${t('common.total')}</div><div class="value">${allOrders.length}</div></div>
    </div>
  `;

  if(!allOrders.length){
    box.innerHTML = kpiHtml + `<div class="empty"><i class="ti ti-shopping-cart"></i>${t('empty.noOrders')}</div>`;
    return;
  }

  const suppliers = [...new Set(allOrders.map(o => o.supplier))].sort((a,b)=>a.localeCompare(b));
  const filterHtml = `
    <div class="field-row" style="margin-bottom:12px;flex-wrap:wrap">
      <div class="field" style="max-width:220px">
        <input type="text" class="search-input" value="${escapeHtml(pedidoHistorialSearch)}" placeholder="${t('ph.searchOrder')}" oninput="setPedidoHistorialSearch(this.value)">
      </div>
      <div class="field" style="max-width:280px">
        <select id="pedido-historial-supplier-filter" onchange="setPedidoHistorialSupplierFilter(this.value)">
          <option value="">${t('label.allSuppliers')}</option>
          ${suppliers.map(s => `<option value="${escapeHtml(s)}" ${pedidoHistorialSupplierFilter===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="max-width:160px">
        <label style="font-size:11px">${t('label.dateFrom')}</label>
        <input type="date" value="${pedidoHistorialDateFrom}" onchange="setPedidoHistorialDateFilter('from', this.value)">
      </div>
      <div class="field" style="max-width:160px">
        <label style="font-size:11px">${t('label.dateTo')}</label>
        <input type="date" value="${pedidoHistorialDateTo}" onchange="setPedidoHistorialDateFilter('to', this.value)">
      </div>
    </div>
  `;

  box.innerHTML = kpiHtml + filterHtml + `<div id="pedido-results"></div>`;
  renderPedidoResultsList();
}

function renderPedidoResultsList(){
  const box = document.getElementById('pedido-results');
  if(!box) return;
  const allOrders = DB.purchaseOrders.filter(o => (o.area||'cocina') === currentArea());
  const orders = allOrders.filter(o =>
    (!pedidoHistorialSupplierFilter || o.supplier === pedidoHistorialSupplierFilter) &&
    (!pedidoHistorialDateFrom || o.date >= pedidoHistorialDateFrom) &&
    (!pedidoHistorialDateTo || o.date <= pedidoHistorialDateTo) &&
    pedidoMatchesSearch(o, pedidoHistorialSearch)
  );
  if(!orders.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  const sorted = orders.slice().sort((a,b) => b.date.localeCompare(a.date));
  box.innerHTML = sorted.map(o => {
    const itemCount = (o.items||[]).length;
    const withQty = (o.items||[]).filter(i => (i.cantidad||0) > 0).length;
    const comp = getPedidoComprobacionMap()[o.comprobacion];
    return `
      <div class="card" style="cursor:pointer" onclick="openPedido(${o.id})">
        <h3 style="justify-content:space-between;gap:8px">
          <span style="min-width:0;overflow:visible;text-overflow:clip;white-space:normal"><i class="ti ti-truck-delivery"></i> ${escapeHtml(o.supplier)} — ${o.date}</span>
          <span style="display:flex;align-items:center;gap:6px;flex:none">
            <span class="badge ${PEDIDO_BADGE[o.estado]||'badge-gray'}">${pedidoEstadoLabel(o.estado)}</span>
            ${o.estado==='RECIBIDO' ? `<button class="owner-only btn btn-sm btn-icon btn-danger" onclick="event.stopPropagation();deleteOrder(${o.id})" title="${t('title.deleteOrder')}"><i class="ti ti-trash"></i></button>` : ''}
          </span>
        </h3>
        <div style="color:var(--muted);font-size:13px">${itemCount} ${itemCount!==1?t('noun.products'):t('noun.product')} · ${withQty} ${t('label.withQty')}</div>
        ${comp ? `<span class="badge ${comp.cls}" style="margin-top:6px">${comp.label}</span>` : ''}
      </div>
    `;
  }).join('');
}

function openPedido(id){
  pedidoDetailId = id;
  pedidosTab = 'historial';
  updatePedidosTabsUI();
  renderPedidoDetail();
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
function renderPedidoIvaBreakdownHtml(o, isRecibido){
  const groups = {}; // ivaPct -> base
  let missingIva = false;
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    if(!ing) return;
    const qty = isRecibido ? (line.cantidadRecibida||line.cantidad||0) : (line.cantidad||0);
    const base = qty * (ing.price||0);
    if(base <= 0) return;
    if(ing.iva == null){ missingIva = true; return; }
    groups[ing.iva] = (groups[ing.iva]||0) + base;
  });
  const rates = Object.keys(groups).map(Number).sort((a,b)=>b-a);
  if(!rates.length && !missingIva) return '';
  const totalBase = rates.reduce((s,r)=>s+groups[r], 0);
  const totalIva = rates.reduce((s,r)=>s+groups[r]*r/100, 0);
  return `
  <div style="padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:10px;font-size:13px">
    ${rates.map(r => `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:4px">
      <div><span style="color:var(--muted)">${t('label.taxBase')} ${r}%:</span> <strong>${fmtMoney(groups[r])}</strong></div>
      <div><span style="color:var(--muted)">${t('label.vat')}:</span> <strong>${fmtMoney(groups[r]*r/100)}</strong></div>
    </div>`).join('')}
    ${rates.length ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)"><span style="color:var(--muted)">${t('common.total')}:</span> <strong style="color:var(--teal)">${fmtMoney(totalBase+totalIva)}</strong></div>` : ''}
    ${missingIva ? `<div style="color:var(--red);margin-top:6px"><i class="ti ti-alert-triangle"></i> ${t('msg.someIngredientsMissingIva')}</div>` : ''}
  </div>`;
}

function renderPedidoDetail(){
  const o = getPurchaseOrder(pedidoDetailId);
  const box = document.getElementById('pedidos-list');
  if(!o){ pedidoDetailId = null; renderPedidoList(); return; }

  const isRecibido = o.estado === 'RECIBIDO';
  const showRecepcion = o.estado === 'ENVIADO' || o.estado === 'RECIBIDO';
  const r = o.recepcion || {};

  const itemsHtml = (o.items||[]).map((line, idx) => {
    const ing = getIngredient(line.ingredientId);
    return `
      <div class="list-row" style="padding:6px 10px">
        <div class="list-row-name"><span>${ing ? escapeHtml(ing.name) : '—'}</span></div>
        <span style="font-size:11.5px;color:var(--muted)">${t('label.ordered')}</span>
        ${editUnlocked
          ? `<input type="number" value="${line.cantidad}" step="0.01" min="0" style="width:70px;padding:3px 5px;border:1px solid var(--border);border-radius:6px;font-size:13px" onchange="updatePedidoItem(${idx}, 'cantidad', this.value)">`
          : `<span style="width:70px;padding:3px 5px;font-size:13px;font-weight:600">${fmtNum(line.cantidad)}</span>`}
        ${isRecibido ? `
        <span style="font-size:11.5px;color:var(--muted)">${t('label.receivedAbbrev')}</span>
        <input type="number" value="${line.cantidadRecibida||0}" step="0.01" min="0" style="width:70px;padding:3px 5px;border:1px solid var(--border);border-radius:6px;font-size:13px" onchange="updatePedidoItem(${idx}, 'cantidadRecibida', this.value)">
        ` : ''}
        <span style="font-size:12px;color:var(--muted);min-width:22px">${ing ? escapeHtml(ing.unit) : ''}</span>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <button class="btn btn-sm" onclick="backToPedidoList()"><i class="ti ti-arrow-left"></i> ${t('btn.backToOrders')}</button>
    <div class="card" style="margin-top:10px">
      <h3 style="justify-content:space-between">
        <span><i class="ti ti-truck-delivery"></i> ${escapeHtml(o.supplier)} — ${o.date}</span>
        <span class="badge ${PEDIDO_BADGE[o.estado]||'badge-gray'}">${pedidoEstadoLabel(o.estado)}</span>
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px;margin-bottom:10px">
        ${itemsHtml || `<div class="empty" style="padding:10px">${t('empty.noItems')}</div>`}
      </div>
      ${renderPedidoIvaBreakdownHtml(o, isRecibido)}

      <div class="field">
        <label>${t('common.notes')}</label>
        <textarea id="pedido-notas" rows="2" onchange="updatePedidoNotas(this.value)">${escapeHtml(o.notas||'')}</textarea>
      </div>

      ${showRecepcion ? `
      <div class="card" style="background:var(--brand-cream);margin-bottom:10px">
        <h3><i class="ti ti-clipboard-check"></i> ${t('title.orderCheck')}</h3>
        <p style="font-size:13px;color:var(--muted);margin:0 0 8px">${t('label.orderCheckHelp')}</p>
        <div class="actions-cell" style="flex-wrap:wrap;gap:8px">
          ${Object.entries(getPedidoComprobacionMap()).map(([key, c]) => `
            <button class="btn btn-sm ${o.comprobacion===key?'btn-primary':''}" onclick="setPedidoComprobacion('${key}')">${c.label}</button>
          `).join('')}
        </div>
      </div>
      <div class="card" style="background:var(--brand-cream);margin-bottom:10px">
        <h3><i class="ti ti-clipboard-check"></i> ${t('title.receptionAppcc')}</h3>
        <div class="field-row">
          <div class="field"><label>${t('common.date')}</label><input type="date" id="rec-fecha" value="${r.fecha||todayStr()}"></div>
          <div class="field"><label>${t('common.time')}</label><input type="time" id="rec-hora" value="${r.hora||''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>${t('label.tempC')}</label><input type="number" step="0.1" id="rec-temp" value="${r.temp!=null?r.temp:''}"></div>
          <div class="field"><label>${t('label.productCondition')}</label>
            <select id="rec-condicion">
              <option value="OK" ${r.condicion==='OK'||!r.condicion?'selected':''}>${t('label.ok')}</option>
              <option value="NO CONFORME" ${r.condicion==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>${t('label.expiryConsumeDate')}</label>
            <select id="rec-caducidad">
              <option value="OK" ${r.caducidad==='OK'||!r.caducidad?'selected':''}>${t('label.ok')}</option>
              <option value="NO CONFORME" ${r.caducidad==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
            </select>
          </div>
          <div class="field"><label>${t('label.matchesDeliveryNote')}</label>
            <select id="rec-albaran">
              <option value="OK" ${r.albaran==='OK'||!r.albaran?'selected':''}>${t('label.ok')}</option>
              <option value="NO CONFORME" ${r.albaran==='NO CONFORME'?'selected':''}>${t('label.nonConforming')}</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>${t('label.responsible')}</label>
          <input type="text" id="rec-resp" value="${escapeHtml(r.responsable||'')}">
        </div>
        <div class="field">
          <label>${t('label.observations')}</label>
          <textarea id="rec-obs" rows="2">${escapeHtml(r.obs||'')}</textarea>
        </div>
        <button class="btn btn-sm" onclick="savePedidoRecepcion()"><i class="ti ti-device-floppy"></i> ${t('btn.saveReception')}</button>
        <div class="field" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
          <label>${t('albaran.attachLabel')}</label>
          ${o.albaranFile ? `
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${o.albaranFile.dataUrl.startsWith('data:image') ? `<img src="${o.albaranFile.dataUrl}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--border)">` : `<a href="${o.albaranFile.dataUrl}" download="${escapeHtml(o.albaranFile.name)}" class="btn btn-sm"><i class="ti ti-file-text"></i> ${escapeHtml(o.albaranFile.name)}</a>`}
              <button class="btn btn-sm btn-danger" onclick="removeAlbaranFile()"><i class="ti ti-trash"></i></button>
            </div>
          ` : `<input type="file" id="albaran-file-input" accept="image/*,application/pdf" onchange="handleAlbaranUpload(this)">`}
          <small style="color:var(--muted)">${t('albaran.attachHint')}</small>
        </div>
      </div>
      ` : ''}

      <div class="actions-cell" style="flex-wrap:wrap;gap:8px">
        ${o.estado==='BORRADOR' ? `<button class="btn btn-primary" onclick="changePedidoEstado('ENVIADO')"><i class="ti ti-send"></i> ${t('btn.markSent')}</button>` : ''}
        ${o.estado==='ENVIADO' ? `<button class="btn btn-primary" onclick="changePedidoEstado('RECIBIDO')"><i class="ti ti-check"></i> ${t('btn.markReceived')}</button>` : ''}
        <button class="btn" style="background:#25D366;color:#fff;border-color:#25D366" onclick="sendPedidoWhatsapp()"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
        <button class="btn" onclick="sendPedidoEmail()"><i class="ti ti-mail"></i> Email</button>
        <button class="btn" onclick="printPedido()"><i class="ti ti-printer"></i> ${t('common.print')}</button>
        <button class="owner-only btn" onclick="duplicateOrder(${o.id})"><i class="ti ti-copy"></i> ${t('btn.duplicateOrder')}</button>
        <button class="owner-only btn btn-danger" onclick="deleteOrder(${o.id})"><i class="ti ti-trash"></i> ${t('common.delete')}</button>
      </div>
    </div>
  `;
}

function updatePedidoItem(idx, field, value){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o || idx < 0 || idx >= (o.items||[]).length) return;
  const line = o.items[idx];
  const newVal = parseFloat(value) || 0;
  if(field === 'cantidadRecibida' && o.estado === 'RECIBIDO'){
    // Corregir la cantidad recibida ya registrada (no la primera vez que se
    // rellena al recibir el pedido) resincroniza stock y gasto retroactivamente:
    // eso exige modo edición, igual que los registros de temperaturas/plagas.
    if(line.cantidadRecibida > 0 && !editUnlocked){
      showToast(t('msg.editModeRequiredForLog'));
      renderPedidoDetail();
      return;
    }
    // El pedido ya sumó stock y registró un gasto con la cantidad recibida
    // original: si se corrige a mano después, hay que resincronizar ambos.
    const ing = getIngredient(line.ingredientId);
    const oldVal = line.cantidadRecibida > 0 ? line.cantidadRecibida : line.cantidad;
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
  } else {
    line[field] = newVal;
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
function removeAlbaranFile(){
  if(!confirm(t('msg.confirmDeleteGeneric'))) return;
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  delete o.albaranFile;
  saveDB();
  renderPedidoDetail();
}

function setPedidoComprobacion(value){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  o.comprobacion = o.comprobacion === value ? '' : value;
  saveDB();
  renderPedidoDetail();
}

// Categoría de Gastos Variables (Gestión Económica) a la que se imputa la compra de un ingrediente
function gvCategoryForIngredient(ing){
  if(ing && ing.category === 'Bebidas') return 'BEBIDAS';
  return 'MATERIA PRIMA';
}

// Al recibir un pedido, registra su coste en Gastos Variables (Gestión Económica), agrupado por categoría
function registerPedidoComoGastoVariable(o){
  if(o.gvCreated) return;
  // Se agrupa por categoría Y por tipo de IVA del ingrediente (ya no por un
  // único IVA de proveedor): dos ingredientes de la misma categoría pero con
  // IVA distinto (ej. dos bebidas, una al 10% y otra al 21%) generan dos
  // líneas de gasto separadas, para que el IVA que arrastra cada una a
  // Informes sea el real del producto, no uno adivinado para todo el pedido.
  const byGroup = {};
  (o.items||[]).forEach(line => {
    const ing = getIngredient(line.ingredientId);
    const recibida = line.cantidadRecibida > 0 ? line.cantidadRecibida : line.cantidad;
    const costBase = (recibida||0) * (ing ? (ing.price||0) : 0);
    if(costBase <= 0) return;
    const cat = gvCategoryForIngredient(ing);
    const ivaPct = ing && ing.iva != null ? ing.iva : null;
    const key = cat + '|' + (ivaPct==null ? '?' : ivaPct);
    if(!byGroup[key]) byGroup[key] = {cat, iva: ivaPct, base: 0};
    byGroup[key].base += costBase;
  });
  if(!Object.keys(byGroup).length){ o.gvCreated = true; return; }
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
      fechaPago, pagada: false
    };
    if(iva != null) rec.iva = iva;
    DB.ge.variables.push(rec);
  });
  o.gvCreated = true;
}

function changePedidoEstado(estado){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  if(o.estado === estado) return;
  o.estado = estado;
  if(estado === 'RECIBIDO'){
    (o.items||[]).forEach(line => {
      const ing = getIngredient(line.ingredientId);
      if(!ing) return; // ingrediente borrado de Mega Lista: no hay stock real que sumar
      const s = getStockEntry(line.ingredientId);
      const recibida = line.cantidadRecibida > 0 ? line.cantidadRecibida : line.cantidad;
      s.qty = (s.qty||0) + (recibida||0);
    });
    renderStock();
    registerPedidoComoGastoVariable(o);
  }
  saveDB();
  renderPedidoDetail();
  showToast(estado === 'RECIBIDO' ? t('msg.orderReceivedStockUpdated') : t('msg.orderMarkedSent'));
}

function pedidoTexto(o){
  const rows = (o.items||[]).map(line => {
    const ing = getIngredient(line.ingredientId);
    return ing ? `  • ${ing.name}: ${fmtNum(line.cantidad)} ${ing.unit}` : '';
  }).join('\n');
  return `🛒 ${t('label.orderTo')} ${o.supplier}\n${t('common.date')}: ${o.date}\n\n${rows}${o.notas ? '\n\n📝 '+o.notas : ''}`;
}

function sendPedidoWhatsapp(order){
  const o = order || getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const prov = getProviderByName(o.supplier);
  const tel = prov && prov.tel ? prov.tel.replace(/\D/g,'') : '';
  const txt = encodeURIComponent(pedidoTexto(o));
  window.open('https://wa.me/'+tel+'?text='+txt, '_blank', 'noopener');
}

function sendPedidoEmail(order){
  const o = order || getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const prov = getProviderByName(o.supplier);
  const to = prov && prov.email ? prov.email : '';
  const subject = encodeURIComponent(t('msg.supplierOrderSubject').replace('${supplier}', o.supplier).replace('${date}', o.date));
  const body = encodeURIComponent(pedidoTexto(o));
  window.location.href = 'mailto:'+to+'?subject='+subject+'&body='+body;
}

function printPedido(){
  const o = getPurchaseOrder(pedidoDetailId);
  if(!o) return;
  const txt = pedidoTexto(o);
  const win = window.open('', '_blank', 'width=400,height=500');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html lang="${getLang()}"><head><meta charset="UTF-8"><title>${t('label.order')}</title></head><body style="font-family:Arial;padding:24px;white-space:pre-wrap;font-size:14px">${escapeHtml(txt).replace(/\n/g,'<br>')}</body></html>`);
  win.document.close();
  win.print();
}

let orderModalSupplier = '';
let orderModalLines = [];
let orderModalSearch = '';
let orderFormInline = false; // true cuando el formulario se muestra en la pestaña (no en modal)
// Si se acaba de elegir/cambiar el proveedor, la comprobación de fecha del
// siguiente render debe avisar con un aviso visible (antes se corregía la
// fecha en silencio en este caso, y el único indicio era que el campo de
// fecha cambiaba solo — fácil de no darse cuenta).
let orderSupplierJustChanged = false;

function openOrderModal(){
  if(!DB.ingredients.some(i => (i.area||'cocina') === currentArea())){ showToast(t('msg.addIngredientsFirst')); return; }
  orderModalSupplier = '';
  orderModalLines = [];
  orderModalSearch = '';
  renderOrderModal();
}

// Construye el cuerpo del formulario de pedido (campos + artículos + resumen),
// compartido por la versión inline (pestaña Realizar Pedido) y el modal.
function orderFormBodyHtml(){
  const suppliers = pedidoSuppliers();
  const supplierOptions = `<option value="">— ${t('label.selectSupplier')} —</option>` +
    suppliers.map(s => `<option value="${escapeHtml(s)}" ${orderModalSupplier===s?'selected':''}>${escapeHtml(s)}</option>`).join('');

  const dateField = document.getElementById('order-date');
  const dateVal = dateField ? dateField.value : todayStr();
  const searchField = document.getElementById('order-item-search');
  const searchVal = searchField ? searchField.value : orderModalSearch;
  orderModalSearch = searchVal || '';

  let itemsHtml = '';
  if(orderModalSupplier){
    const ings = DB.ingredients.filter(i => i.supplier === orderModalSupplier && (i.area||'cocina') === currentArea());
    if(!ings.length){
      itemsHtml = `<div class="empty" style="padding:10px">${t('empty.supplierNoIngredients')}</div>`;
    }else{
      itemsHtml = `
        <input type="text" class="search-input" id="order-item-search" placeholder="${t('ph.searchArticle')}" value="${escapeHtml(orderModalSearch)}" oninput="updateOrderItemSearch(this.value)" style="margin-bottom:8px;width:100%">
        <div id="order-items-rows" style="max-height:480px;overflow:auto;margin-bottom:8px">
          ${orderItemsRowsHtml()}
        </div>
        <button class="btn btn-sm" onclick="sugerirPorDeficit()"><i class="ti ti-bulb"></i> ${t('btn.suggestByStockDeficit')}</button>
      `;
    }
  }

  const html = `
    <div class="field-row">
      <div class="field">
        <label>${t('common.supplier')}</label>
        <select id="order-supplier" onchange="selectOrderSupplier(this.value)">${supplierOptions}</select>
      </div>
      <div class="field">
        <label>${t('label.deliveryDate')}</label>
        <input type="date" id="order-date" value="${dateVal || todayStr()}" onchange="validateOrderDate(this)">
        <div id="order-date-hint" style="font-size:12px;color:var(--muted);margin-top:4px"></div>
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div class="field" id="order-items-field" style="flex:2;min-width:280px">
        <label>${t('label.supplierArticles')}</label>
        ${itemsHtml || `<div class="empty" style="padding:10px">${t('empty.selectSupplierToLoadArticles')}</div>`}
      </div>
      <div class="field" style="flex:1;min-width:220px">
        <label>${t('label.orderSummary')}</label>
        <div id="order-summary" style="max-height:480px;overflow:auto">${orderSummaryHtml()}</div>
      </div>
    </div>
  `;
  return {dateVal, html};
}

// Filas de artículos que coinciden con la búsqueda actual (sin el propio
// campo de búsqueda) — separado de orderFormBodyHtml() para poder
// refrescar solo esto al escribir, sin recrear el input de búsqueda y que
// pierda el foco en cada letra (por eso antes solo dejaba escribir de una
// en una: cada tecla volvía a montar el formulario entero).
function orderItemsRowsHtml(){
  const search = orderModalSearch.toLowerCase();
  // Sin búsqueda no se lista nada: con proveedores de muchos artículos,
  // volcarlos todos de golpe abruma. Solo aparecen al buscarlos por nombre.
  const rows = !search ? '' : orderModalLines.filter(line => {
    const ing = getIngredient(line.ingredientId);
    return ing && ing.name.toLowerCase().includes(search);
  }).map(line => {
    const ing = getIngredient(line.ingredientId);
    const s = getStockEntry(ing.id);
    return `
      <div class="list-row">
        <div class="list-row-name"><span>${escapeHtml(ing.name)}</span></div>
        <span style="font-size:14px;font-weight:600;color:var(--muted)">${t('label.stock')}: ${fmtNum(s.qty)} ${escapeHtml(ing.unit)} · ${t('label.minAbbrev')} ${fmtNum(s.min)}</span>
        <input type="number" value="${line.cantidad}" step="0.01" min="0" placeholder="${t('common.qty')}" style="width:90px;padding:4px 6px;border:1px solid var(--border);border-radius:6px" onchange="updateOrderLineQty(${ing.id}, this.value)">
        <span style="font-size:12px;color:var(--muted)">${escapeHtml(ing.unit)}</span>
      </div>
    `;
  }).join('');
  const emptyMsg = !search
    ? `<div class="empty" style="padding:10px">${t('msg.searchSupplierProducts')}</div>`
    : `<div class="empty" style="padding:10px">${t('common.noResults')}</div>`;
  return rows || emptyMsg;
}
// Al escribir en el buscador de artículos, solo se refresca la lista de
// filas de abajo — el input de búsqueda en sí no se toca, así conserva el
// foco y la posición del cursor mientras se escribe seguido.
function updateOrderItemSearch(val){
  orderModalSearch = val;
  const box = document.getElementById('order-items-rows');
  if(box) box.innerHTML = orderItemsRowsHtml();
}

// Botones de acción del pedido (imprimir / enviar), compartidos por ambas vistas.
function orderFormButtonsHtml(){
  return `
    <button class="btn" onclick="printPedidoBorrador()"><i class="ti ti-printer"></i> ${t('common.print')}</button>
    <button class="btn" style="background:#25D366;color:#fff;border-color:#25D366" onclick="sendNewPedido('whatsapp')"><i class="ti ti-brand-whatsapp"></i> ${t('btn.sendByWhatsapp')}</button>
    <button class="btn btn-primary" onclick="sendNewPedido('email')"><i class="ti ti-mail"></i> ${t('btn.sendByEmail')}</button>
  `;
}

// Tras renderizar el formulario, restaura los valores de fecha y búsqueda.
function afterOrderFormRender(dateVal){
  const dEl = document.getElementById('order-date');
  if(dEl) dEl.value = dateVal || todayStr();
  if(dEl) validateOrderDate(dEl, !orderSupplierJustChanged);
  orderSupplierJustChanged = false;
  const sEl = document.getElementById('order-item-search');
  if(sEl) sEl.value = orderModalSearch;
}

// Re-renderiza el formulario activo (inline en la pestaña, o el modal).
function refreshOrderForm(){
  if(orderFormInline) renderPedidoCrear();
  else renderOrderModal();
}

// Versión inline del formulario, dentro de la pestaña "Realizar Pedido".
function renderPedidoCrear(){
  orderFormInline = true;
  const box = document.getElementById('pedidos-list');
  const {dateVal, html} = orderFormBodyHtml();
  box.innerHTML = `
    <div class="card">
      <h3><i class="ti ti-shopping-cart-plus"></i> ${t('title.makeOrder')}</h3>
      ${html}
      <div class="actions-cell" style="flex-wrap:wrap;gap:8px;margin-top:10px">
        ${orderFormButtonsHtml()}
      </div>
    </div>
  `;
  afterOrderFormRender(dateVal);
}

function renderOrderModal(){
  orderFormInline = false;
  const {dateVal, html} = orderFormBodyHtml();
  openModal(`
    <div class="modal-header">
      <h3>${t('title.newOrder')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${html}
    <div class="modal-footer" style="flex-wrap:wrap;gap:8px">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      ${orderFormButtonsHtml()}
    </div>
  `, {xl:true});
  afterOrderFormRender(dateVal);
}

// Resumen en vivo de los artículos con cantidad > 0 mientras se compone el pedido.
function orderSummaryHtml(){
  const items = orderModalLines.filter(l => l.cantidad > 0);
  if(!items.length) return `<div class="empty" style="padding:10px">${t('empty.noArticlesYet')}</div>`;
  return items.map(l => {
    const ing = getIngredient(l.ingredientId);
    return `<div class="list-row"><div class="list-row-name"><span>${escapeHtml(ing.name)}</span></div><strong>${fmtNum(l.cantidad)} ${escapeHtml(ing.unit)}</strong></div>`;
  }).join('');
}
function renderOrderSummary(){
  const box = document.getElementById('order-summary');
  if(box) box.innerHTML = orderSummaryHtml();
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

function nextValidDeliveryDate(dateStr, diasEntrega){
  const d = new Date(dateStr + 'T00:00:00');
  for(let i=0;i<8;i++){
    const weekDayName = WEEK_DAYS[(d.getDay() + 6) % 7];
    if(diasEntrega.includes(weekDayName)) return d.toISOString().slice(0,10);
    d.setDate(d.getDate()+1);
  }
  return dateStr;
}

function selectOrderSupplier(supplier){
  orderModalSupplier = supplier;
  orderModalSearch = '';
  orderModalLines = supplier ? DB.ingredients.filter(i => i.supplier === supplier && (i.area||'cocina') === currentArea()).map(i => ({ingredientId: i.id, cantidad: 0, cantidadRecibida: 0})) : [];
  orderSupplierJustChanged = true;
  refreshOrderForm();
}

function sugerirPorDeficit(){
  orderModalLines.forEach(line => {
    const s = getStockEntry(line.ingredientId);
    line.cantidad = Math.max(0, (s.min||0) - (s.qty||0));
  });
  refreshOrderForm();
  showToast(t('msg.suggestedQty'));
}

function updateOrderLineQty(ingredientId, value){
  const line = orderModalLines.find(l => l.ingredientId === ingredientId);
  if(line) line.cantidad = parseFloat(value) || 0;
  renderOrderSummary();
}

// Crea (o reutiliza) el pedido a partir del formulario del modal "Nuevo Pedido".
// Devuelve el pedido creado, o null si los datos no son válidos.
function buildNewPedido(){
  if(!orderModalSupplier){ showToast(t('msg.selectSupplier')); return null; }
  const date = document.getElementById('order-date').value || todayStr();
  const items = orderModalLines.filter(l => l.cantidad > 0).map(l => ({...l}));
  if(!items.length){ showToast(t('msg.addAtLeastOneItem')); return null; }
  const order = {id: genId(), supplier: orderModalSupplier, date, estado:'ENVIADO', items, notas:'', recepcion:null, comprobacion:'', area: currentArea()};
  DB.purchaseOrders.push(order);
  saveDB();
  return order;
}

function printPedidoBorrador(){
  if(!orderModalSupplier){ showToast(t('msg.selectSupplier')); return; }
  const items = orderModalLines.filter(l => l.cantidad > 0);
  if(!items.length){ showToast(t('msg.addAtLeastOneItem')); return; }
  const date = document.getElementById('order-date').value || todayStr();
  const txt = pedidoTexto({supplier: orderModalSupplier, date, items, notas:''});
  const win = window.open('', '_blank', 'width=400,height=500');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html lang="${getLang()}"><head><meta charset="UTF-8"><title>${t('label.order')}</title></head><body style="font-family:Arial;padding:24px;white-space:pre-wrap;font-size:14px">${escapeHtml(txt).replace(/\n/g,'<br>')}</body></html>`);
  win.document.close();
  win.print();
}

function sendNewPedido(method){
  const order = buildNewPedido();
  if(!order) return;
  if(orderFormInline){
    // Vacía el formulario inline y pasa al historial para ver el pedido creado.
    orderModalSupplier = ''; orderModalLines = []; orderModalSearch = '';
    pedidosTab = 'historial';
  }else{
    closeModal();
  }
  renderPedidos();
  if(method === 'whatsapp') sendPedidoWhatsapp(order);
  else sendPedidoEmail(order);
  showToast(t('msg.orderSent'));
}

function deleteOrder(id){
  const o = getPurchaseOrder(id);
  if(!o) return;
  if(o.estado === 'RECIBIDO'){
    // Ya sumó stock y registró un gasto real: borrar sin más dejaría stock
    // fantasma y un gasto huérfano, así que pide el PIN y revierte ambos.
    requestBusinessPinAction(t('title.deleteOrder'), t('msg.confirmDeleteReceivedOrder'), () => reallyDeleteOrder(id));
    return;
  }
  if(!confirm(t('msg.confirmDeleteOrder'))) return;
  reallyDeleteOrder(id);
}
function reallyDeleteOrder(id){
  const o = getPurchaseOrder(id);
  if(!o) return;
  if(o.estado === 'RECIBIDO'){
    (o.items||[]).forEach(line => {
      const ing = getIngredient(line.ingredientId);
      if(!ing) return;
      const recibida = line.cantidadRecibida > 0 ? line.cantidadRecibida : line.cantidad;
      const s = getStockEntry(line.ingredientId);
      const before = s.qty||0;
      s.qty = Math.max(0, before - (recibida||0));
      if(typeof logStockAdjustment === 'function') logStockAdjustment('ing', line.ingredientId, ing.name, before, s.qty, 'purchase');
    });
    DB.ge.variables = (DB.ge.variables||[]).filter(v => v.pedidoId !== id);
    renderStock();
  }
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
    items: (o.items||[]).map(line => ({ingredientId: line.ingredientId, cantidad: line.cantidad})),
    notas: '', recepcion: null, comprobacion: '', area: o.area || currentArea()
  };
  DB.purchaseOrders.push(copy);
  saveDB();
  showToast(t('msg.orderDuplicated'));
  openPedido(copy.id);
}

