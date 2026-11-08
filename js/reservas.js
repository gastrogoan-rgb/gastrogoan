/* ============================================================
   RESERVAS (1/11) — diseño nuevo
   Mismas reglas de siempre (aforo por turno, lista de espera, señal, llegada,
   no-show, recordatorios); lo que cambia es cómo se ve y cuánto cuesta usarlo:
   · las cifras del día arriba (reservas, comensales, llegadas, por confirmar);
   · cada reserva con SU acción principal a la vista (Confirmar / Ha llegado) y el
     resto —editar, recordatorio, no presentado, cancelar— en el menú ⋯;
   · Semana y Mes con el mismo diseño que Promoción, y el selector de periodo;
   · el día se puede imprimir como hoja de sala.
   ============================================================ */

let reservasFiltro = '';
let reservasMes = null;          // {anio, mes}; null = el mes en curso

function reservasMesActual(){
  if(!reservasMes){ const h = new Date(); reservasMes = {anio: h.getFullYear(), mes: h.getMonth()}; }
  return reservasMes;
}
function reservasMesCb(anio, mes){
  reservasMes = {anio, mes: mes == null ? reservasMesActual().mes : mes};
  renderReservasMes();
}
function setReservasTab(tab){
  reservasTab = tab;
  renderReservas();
  scrollContentToTop();
}
function setReservasFiltro(f){ reservasFiltro = f; renderReservasDia(); }

function rvNombre(r){
  const c = r.clientId ? DB.clients.find(x => x.id === r.clientId) : null;
  return c ? c.name : (r.clientName || '—');
}
function rvTelefono(r){
  const c = r.clientId ? DB.clients.find(x => x.id === r.clientId) : null;
  return (c && c.phone) || r.clientPhone || '';
}
// «Cuenta» = ocupa sitio: no cancelada, no no-show, no en lista de espera.
function rvOcupa(r){ return r.status === 'pendiente' || r.status === 'confirmada' || r.status === 'completada'; }

function rvTabsHtml(){
  const tabs = [['dia', 'ti-calendar-event', t('common.day')], ['semana', 'ti-calendar-week', t('common.week')], ['mes', 'ti-calendar-month', t('common.month')]];
  return `<div class="left">${tabs.map(([id, ic, txt]) =>
    `<button type="button" class="btn btn-sm btn-fino${reservasTab === id ? ' is-on active' : ''}" id="reservas-tab-${id}" aria-pressed="${reservasTab === id}" onclick="setReservasTab('${id}')"><i class="ti ${ic}"></i> ${escapeHtml(txt)}</button>`).join('')}</div>`;
}

function renderReservas(){
  markReservasSeen();
  const searchInput = document.getElementById('reservas-search-input');
  const fila = document.getElementById('reservas-tabs-row');
  if(fila){ fila.innerHTML = rvTabsHtml(); }
  if(searchInput && searchInput.value.trim()){ renderReservasSearch(); return; }
  renderReservasPendingOnline();
  renderReservasRemindersDue();
  if(reservasTab === 'semana') renderReservasSemana();
  else if(reservasTab === 'mes') renderReservasMes();
  else renderReservasDia();
}

// Búsqueda por nombre, teléfono o el número que dice el cliente («PCERVK»), en TODAS las fechas.
function renderReservasSearch(){
  const input = document.getElementById('reservas-search-input');
  const query = (input ? input.value : '').trim().toLowerCase();
  const resultsBox = document.getElementById('reservas-search-results');
  const ocultar = v => ['reservas-tabs-row', 'reservas-tab-content', 'reservas-pending-online', 'reservas-reminders-due'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = v ? 'none' : ''; });
  if(!query){
    resultsBox.style.display = 'none'; resultsBox.innerHTML = '';
    ocultar(false);
    renderReservas();
    return;
  }
  ocultar(true);
  const normQuery = stripAccents(query);
  const digitosQ = query.replace(/\D/g, '');
  const matches = DB.reservations.filter(r => {
    const name = stripAccents(rvNombre(r).toLowerCase());
    const phone = rvTelefono(r).replace(/\D/g, '');
    const codigo = r.publicToken ? codigoCortoPublico(r.publicToken).toLowerCase() : '';
    return (name && name.includes(normQuery)) || (phone && digitosQ && phone.includes(digitosQ)) || (codigo && normQuery.replace(/^n[º°o]?\s*/, '').trim() === codigo);
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  resultsBox.style.display = '';
  if(!matches.length){
    resultsBox.innerHTML = `<div class="empty es-vacio"><i class="ti ti-search"></i>${escapeHtml(t('empty.noReservationsMatch'))}</div>`;
    return;
  }
  resultsBox.innerHTML = `
    <p class="pr-ayuda">${matches.length} ${escapeHtml(gl({es:'reservas encontradas', ca:'reserves trobades', en:'bookings found'}))}</p>
    <ul class="cl-lista-ev rv-resultados">${matches.slice(0, 120).map(r => `
      <li class="cl-ev" role="button" tabindex="0" onclick="openReservationModal(${r.id})" onkeydown="if(event.key==='Enter'){openReservationModal(${r.id})}">
        <span class="cl-ev-ico"><i class="ti ti-calendar-event"></i></span>
        <div class="cl-ev-txt"><b>${escapeHtml(rvNombre(r))}</b><small>${r.people} ${escapeHtml(t('common.people'))}${r.notes ? ' · ' + escapeHtml(r.notes) : ''}</small></div>
        <span class="cl-ev-fecha">${escapeHtml(r.date)} ${escapeHtml(r.time || '')}</span>
        <span class="cl-ev-der">${reservationStatusBadge(r.status, r.llegada)}</span>
      </li>`).join('')}</ul>
    ${matches.length > 120 ? `<p class="pr-ayuda">${escapeHtml(gl({es:'Se muestran las 120 más recientes: afina la búsqueda.', ca:'Es mostren les 120 més recents: afina la cerca.', en:'The 120 most recent are shown: narrow the search.'}))}</p>` : ''}`;
}

// Solicitudes que han entrado por la web y esperan confirmación: filas compactas, con sus botones al lado.
function renderReservasPendingOnline(){
  const box = document.getElementById('reservas-pending-online');
  if(!box) return;
  // Una solicitud pendiente de una fecha ya pasada que nadie confirmó ni rechazó ya no se gestiona
  // aquí: se sigue viendo en el histórico, solo sale de este aviso.
  const pending = DB.reservations.filter(r => r.status === 'pendiente' && r.date >= todayStr()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if(!pending.length){ box.innerHTML = ''; return; }
  box.innerHTML = `
    <section class="rv-bandeja is-solicitudes">
      <h3 class="es-tit"><i class="ti ti-bell-ringing"></i> ${escapeHtml(t('title.pendingOnlineRequests'))} <span class="dp-cuenta">${pending.length}</span></h3>
      <ul class="rv-solic-lista">${pending.map(r => {
        const waitMin = r.createdAt ? minutesSince(r.createdAt) : 0;
        const turnoIdx = getTurnoIndexForTime(r.date, r.time);
        const info = turnoIdx === null ? null : getAforoInfoForDate(r.date);
        const turno = info && info[turnoIdx];
        const lleno = turno && turno.aforo && (turno.reservados + (r.people || 0)) > turno.aforo;
        return `
        <li class="rv-solic">
          <div class="rv-solic-info">
            <div class="rv-nombre"><b>${escapeHtml(r.clientName || '—')}</b> <span class="pm-et is-dto">${escapeHtml(t('badge.newF'))}</span></div>
            <div class="pm-ets"><span class="pm-et"><i class="ti ti-calendar"></i> ${escapeHtml(r.date)}</span><span class="pm-et"><i class="ti ti-clock"></i> ${escapeHtml(r.time)}</span><span class="pm-et"><i class="ti ti-users"></i> ${r.people}</span>
              ${r.clientPhone ? `<span class="pm-et${r.phoneOdd ? ' cl-et-riesgo' : ''}"><i class="ti ti-phone"></i> ${escapeHtml(r.clientPhone)}</span>` : ''}
              ${waitMin >= 30 ? `<span class="pm-et cl-et-riesgo"><i class="ti ti-clock-exclamation"></i> ${escapeHtml(t('label.waitingSince').replace('${min}', waitMin))}</span>` : ''}
              ${r.depositRequired ? (r.depositConfirmed ? `<span class="pm-et is-ok"><i class="ti ti-cash"></i> ${escapeHtml(t('deposit.received'))} (${r.depositAmount}€)</span>` : `<span class="pm-et cl-et-alergia" title="${escapeHtml(t('deposit.confirmHint'))}"><i class="ti ti-cash-banknote"></i> ${escapeHtml(t('deposit.pending'))} (${r.depositAmount}€)</span>`) : ''}
              ${turno && turno.aforo ? `<span class="pm-et${lleno ? ' cl-et-riesgo' : ''}"><i class="ti ti-users"></i> ${turno.reservados}/${turno.aforo}${lleno ? ' · ' + escapeHtml(gl({es:'se pasaría', ca:'se\'n passaria', en:'would exceed'})) : ''}</span>` : ''}</div>
            ${r.notes ? `<p class="rv-nota"><i class="ti ti-note"></i> ${escapeHtml(r.notes)}</p>` : ''}
          </div>
          <div class="rv-acc">
            ${r.depositRequired && !r.depositConfirmed ? `<button type="button" class="btn btn-sm btn-fino is-lim" onclick="confirmReservationDeposit(${r.id})"><i class="ti ti-cash-banknote"></i> ${escapeHtml(gl({es:'Señal recibida', ca:'Senyal rebuda', en:'Deposit received'}))}</button>` : ''}
            <button type="button" class="btn btn-sm btn-fino is-on" onclick="setReservationStatus(${r.id}, 'confirmada')"><i class="ti ti-check"></i> ${escapeHtml(t('common.confirm'))}</button>
            <button type="button" class="owner-only btn btn-sm btn-fino is-off" onclick="rejectOnlineReservation(${r.id})"><i class="ti ti-x"></i> ${escapeHtml(t('common.reject'))}</button>
          </div>
        </li>`;
      }).join('')}</ul>
    </section>`;
}

// «Mañana tienen reserva y aún no se les ha recordado»: una fila por reserva, con su botón.
function renderReservasRemindersDue(){
  const box = document.getElementById('reservas-reminders-due');
  if(!box) return;
  const tomorrowDate = dateStr(new Date(Date.now() + 86400000));
  const due = DB.reservations.filter(r =>
    r.date === tomorrowDate && !r.reminderSentAt && !r.llegada &&
    (r.status === 'confirmada' || r.status === 'pendiente') && rvTelefono(r));
  if(!due.length){ box.innerHTML = ''; return; }
  box.innerHTML = `
    <section class="rv-bandeja">
      <h3 class="es-tit"><i class="ti ti-bell"></i> ${escapeHtml(t('title.remindersDueTomorrow'))} <span class="dp-cuenta">${due.length}</span></h3>
      <ul class="rv-solic-lista">${due.map(r => `
        <li class="rv-solic">
          <div class="rv-solic-info"><div class="rv-nombre"><b>${escapeHtml(rvNombre(r))}</b> <span class="pm-et"><i class="ti ti-clock"></i> ${escapeHtml(r.time || '')}</span> <span class="pm-et"><i class="ti ti-users"></i> ${r.people}</span></div></div>
          <div class="rv-acc"><button type="button" class="btn btn-sm btn-fino is-on" onclick="openReservationReminderModal(${r.id})"><i class="ti ti-brand-whatsapp"></i> ${escapeHtml(t('btn.sendReminder'))}</button></div>
        </li>`).join('')}</ul>
    </section>`;
}

// ── Día ──────────────────────────────────────────────────────────────────
function rvFiltrosDef(){
  return [
    ['', gl({es:'Todas', ca:'Totes', en:'All'}), r => true],
    ['pendiente', gl({es:'Por confirmar', ca:'Per confirmar', en:'To confirm'}), r => r.status === 'pendiente'],
    ['confirmada', gl({es:'Confirmadas', ca:'Confirmades', en:'Confirmed'}), r => r.status === 'confirmada' && !r.llegada],
    ['llegada', gl({es:'Han llegado', ca:'Han arribat', en:'Arrived'}), r => r.status === 'completada' || !!r.llegada],
    ['espera', gl({es:'Lista de espera', ca:'Llista d\'espera', en:'Waitlist'}), r => r.status === 'lista_espera'],
    ['baja', gl({es:'Canceladas / no-show', ca:'Cancel·lades / no-show', en:'Cancelled / no-show'}), r => r.status === 'cancelada' || r.status === 'no_show'],
  ];
}
function rvFilaHtml(r){
  const table = DB.tables.find(x => x.id === r.tableId);
  const tel = whatsappDeTelefono(rvTelefono(r));
  const llegada = !!r.llegada;
  const inactiva = r.status === 'cancelada' || r.status === 'no_show';
  let principal = '';
  if(r.status === 'pendiente') principal = `<button type="button" class="btn btn-sm btn-fino is-on" onclick="setReservationStatus(${r.id}, 'confirmada')"><i class="ti ti-check"></i> ${escapeHtml(t('common.confirm'))}</button>`;
  else if(r.status === 'lista_espera') principal = `<button type="button" class="btn btn-sm btn-fino is-on" onclick="setReservationStatus(${r.id}, 'confirmada')" title="${escapeHtml(t('btn.confirmAnyway'))}"><i class="ti ti-check"></i> ${escapeHtml(t('btn.confirmAnyway'))}</button>`;
  else if(r.status === 'confirmada' || r.status === 'completada') principal = `<button type="button" class="btn btn-sm btn-fino${llegada ? ' is-on' : ''}" aria-pressed="${llegada}" onclick="toggleReservaLlegada(${r.id})"><i class="ti ti-${llegada ? 'door-enter' : 'check'}"></i> ${escapeHtml(t('btn.arrived'))}</button>`;
  else if(r.status === 'no_show') principal = `<button type="button" class="btn btn-sm btn-fino" onclick="undoReservationNoShow(${r.id})"><i class="ti ti-arrow-back-up"></i> ${escapeHtml(t('btn.undoNoShow'))}</button>`;
  const acciones = [
    {icono:'ti-edit', texto: t('common.edit'), fn:`openReservationModal(${r.id})`},
    r.status === 'confirmada' && rvTelefono(r) ? {icono:'ti-bell', texto: t('btn.sendReminder'), fn:`openReservationReminderModal(${r.id})`} : null,
    (r.status === 'confirmada' || r.status === 'pendiente') && r.depositRequired && !r.depositConfirmed ? {icono:'ti-cash-banknote', texto: t('deposit.confirmHint'), fn:`confirmReservationDeposit(${r.id})`} : null,
    r.status === 'confirmada' && !llegada ? {icono:'ti-user-x', texto: t('status.noShow'), fn:`markReservationNoShow(${r.id})`, peligro:true} : null,
    (r.status === 'confirmada' || r.status === 'pendiente' || r.status === 'lista_espera') ? {icono:'ti-circle-x', texto: t('common.cancel'), fn:`cancelReservation(${r.id})`, peligro:true, owner:true} : null,
  ].filter(Boolean);
  /* El «⋯» solo hace falta donde no cabe todo (móvil): en PC y tablet las acciones van sueltas, con su rótulo (8/11). Se pintan las dos
     versiones y el CSS enseña una u otra, así un cambio de ventana o de giro de la tablet no obliga a repintar. */
  const menu = `<span class="rv-acc-menu">${ggMenuAcciones(acciones)}</span>`;
  const sueltas = `<span class="rv-acc-sueltas">${acciones.map(a => `<button type="button" class="btn btn-fino mn-btn${a.peligro ? ' is-off' : ''}${a.owner ? ' owner-only' : ''}" data-tip="${escapeHtml(a.texto)}" aria-label="${escapeHtml(a.texto)}" onclick="${a.fn}"><i class="ti ${a.icono}"></i></button>`).join('')}</span>`;
  const chips = [
    `<span class="pm-et"><i class="ti ti-users"></i> ${r.people}</span>`,
    table ? `<span class="pm-et"><i class="ti ti-armchair"></i> ${escapeHtml(table.name)}</span>` : (!inactiva ? `<span class="pm-et cl-et-alergia"><i class="ti ti-armchair-off"></i> ${escapeHtml(t('label.notAssigned'))}</span>` : ''),
    r.publicToken ? `<span class="pm-et" title="${escapeHtml(t('label.publicCode'))}"><i class="ti ti-hash"></i> ${escapeHtml(codigoCortoPublico(r.publicToken))}</span>` : '',
    r.depositRequired ? (r.depositConfirmed ? `<span class="pm-et is-ok"><i class="ti ti-cash"></i> ${r.depositAmount}€</span>` : `<span class="pm-et cl-et-alergia"><i class="ti ti-cash-banknote"></i> ${escapeHtml(t('deposit.pending'))}</span>`) : '',
    r.clientId && (DB.clients.find(c => c.id === r.clientId) || {}).allergies ? `<span class="pm-et cl-et-alergia"><i class="ti ti-alert-triangle"></i> ${escapeHtml((DB.clients.find(c => c.id === r.clientId) || {}).allergies)}</span>` : '',
  ].filter(Boolean).join('');
  return `
  <article class="rv-fila${inactiva ? ' es-inactiva' : ''}${llegada ? ' es-llegada' : ''}">
    <div class="rv-hora">${escapeHtml(r.time || '—')}</div>
    <div class="rv-main">
      <div class="rv-nombre"><b>${escapeHtml(rvNombre(r))}</b> ${reservationStatusBadge(r.status, r.llegada)}</div>
      <div class="pm-ets">${chips}</div>
      ${r.notes ? `<p class="rv-nota"><i class="ti ti-note"></i> ${escapeHtml(r.notes)}</p>` : ''}
    </div>
    <div class="rv-acc">${tel ? `<a class="btn btn-fino mn-btn" data-tip="WhatsApp" aria-label="WhatsApp ${escapeHtml(rvNombre(r))}" href="https://wa.me/${tel}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i></a>` : ''}${principal}${sueltas}${menu}</div>
  </article>`;
}
function renderReservasDia(){
  const box = document.getElementById('reservas-tab-content');
  const date = reservasDate;
  const hoy = todayStr();
  const todas = DB.reservations.filter(r => r.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const defs = rvFiltrosDef();
  const filtro = defs.find(d => d[0] === reservasFiltro) || defs[0];
  const items = todas.filter(filtro[2]);
  const ocupan = todas.filter(rvOcupa);
  const comensales = ocupan.reduce((s, r) => s + (r.people || 0), 0);
  const llegadas = todas.filter(r => r.llegada || r.status === 'completada').length;
  const porConfirmar = todas.filter(r => r.status === 'pendiente' || r.status === 'lista_espera').length;
  const sinMesa = ocupan.filter(r => !r.tableId).length;
  const bajas = todas.filter(r => r.status === 'cancelada' || r.status === 'no_show').length;
  const aforoInfo = getAforoInfoForDate(date);
  const aforoHtml = (aforoInfo && aforoInfo.length) ? `<div class="rv-aforo" role="list">${aforoInfo.map((tr, i) => {
    const pct = tr.aforo ? Math.min(100, Math.round(tr.reservados / tr.aforo * 100)) : 0;
    const estado = tr.aforo && tr.reservados >= tr.aforo ? 'is-lleno' : tr.aforo && tr.reservados >= tr.aforo * 0.8 ? 'is-casi' : '';
    return `<div class="rv-turno ${estado}" role="listitem"><div class="rv-turno-cab"><b>${escapeHtml(t('mn.schedule.slotN').replace('${n}', i + 1))}</b><span>${escapeHtml(tr.abre)}–${escapeHtml(tr.cierra)}</span></div>
      <div class="nv-barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      <div class="rv-turno-n">${tr.reservados}${tr.aforo ? ' / ' + tr.aforo : ''} ${escapeHtml(t('common.people'))}${estado === 'is-lleno' ? ' · ' + escapeHtml(t('label.full') !== 'label.full' ? t('label.full') : gl({es:'completo', ca:'complet', en:'full'})) : ''}</div></div>`;
  }).join('')}</div>` : '';

  const lista = !todas.length
    ? `<div class="empty es-vacio"><i class="ti ti-calendar-event"></i>${escapeHtml(t('empty.noReservationsDay'))}</div>`
    : !items.length ? `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`
    : `<div class="rv-lista">${items.map(rvFilaHtml).join('')}</div>`;

  box.innerHTML = `
    ${pmResumenHtml([
      {et: gl({es:'Reservas', ca:'Reserves', en:'Bookings'}), v: ocupan.length, sub: sinMesa ? escapeHtml(gl({es:`${sinMesa} sin mesa`, ca:`${sinMesa} sense taula`, en:`${sinMesa} without a table`})) : (bajas ? escapeHtml(gl({es:`${bajas} cancelada(s)`, ca:`${bajas} cancel·lada(es)`, en:`${bajas} cancelled`})) : '')},
      {et: gl({es:'Comensales', ca:'Comensals', en:'Guests'}), v: comensales},
      {et: gl({es:'Han llegado', ca:'Han arribat', en:'Arrived'}), v: `${llegadas} / ${ocupan.length}`, cls: ocupan.length && llegadas === ocupan.length ? 'is-ok' : ''},
      {et: gl({es:'Por confirmar', ca:'Per confirmar', en:'To confirm'}), v: porConfirmar, cls: porConfirmar ? 'is-bajo' : ''},
    ])}
    <div class="toolbar pm-barra">
      <div class="left pm-nav">
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Día anterior', ca:'Dia anterior', en:'Previous day'}))}" onclick="reservasDate=pmSumaDias(reservasDate,-1);renderReservas()"><i class="ti ti-chevron-left"></i></button>
        <label class="pm-fecha"><span class="pm-fecha-txt">${escapeHtml(pmFechaLarga(date, true))}</span><input type="date" id="reservas-filter-date" value="${date}" aria-label="${escapeHtml(t('common.date'))}" onchange="if(this.value){reservasDate=this.value;renderReservas()}"></label>
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Día siguiente', ca:'Dia següent', en:'Next day'}))}" onclick="reservasDate=pmSumaDias(reservasDate,1);renderReservas()"><i class="ti ti-chevron-right"></i></button>
        ${date !== hoy ? `<button type="button" class="btn btn-sm btn-fino" onclick="reservasDate=todayStr();renderReservas()">${escapeHtml(t('common.today'))}</button>` : ''}
      </div>
      <div class="pm-acciones">
        ${todas.length ? `<button type="button" class="btn btn-fino" onclick="rvImprimirDia('${date}')"><i class="ti ti-printer"></i> ${escapeHtml(gl({es:'Imprimir el día', ca:'Imprimir el dia', en:'Print the day'}))}</button>` : ''}
        <button type="button" class="btn btn-fino is-on" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.newReservation'))}</button>
      </div>
    </div>
    ${aforoHtml}
    ${todas.length > 1 ? `<div class="cl-chips" role="group" aria-label="${escapeHtml(gl({es:'Filtrar reservas', ca:'Filtrar reserves', en:'Filter bookings'}))}">${defs.map(d => { const n = todas.filter(d[2]).length; return n || d[0] === '' ? `<button type="button" class="btn btn-sm btn-fino${reservasFiltro === d[0] ? ' is-on' : ''}" aria-pressed="${reservasFiltro === d[0]}" onclick="setReservasFiltro('${d[0]}')">${escapeHtml(d[1])} <b>${n}</b></button>` : ''; }).join('')}</div>` : ''}
    ${lista}
  `;
}
function rvImprimirDia(date){
  const items = DB.reservations.filter(r => r.date === date && rvOcupa(r)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const titulo = gl({es:'Reservas del ', ca:'Reserves del ', en:'Bookings for '}) + pmFechaLarga(date, false);
  const total = items.reduce((s, r) => s + (r.people || 0), 0);
  const body = `
    ${printReportHeaderHtml(titulo, `${items.length} ${gl({es:'reservas', ca:'reserves', en:'bookings'})} · ${total} ${t('common.people')}`)}
    <table><thead><tr><th>${t('th.time')}</th><th>${t('th.client')}</th><th>${t('label.numberOfPeople')}</th><th>${t('th.table')}</th><th>${t('common.phone')}</th><th>${t('th.notes')}</th><th>${t('th.arrival')}</th></tr></thead>
    <tbody>${items.map(r => { const mesa = DB.tables.find(x => x.id === r.tableId); return `<tr><td>${escapeHtml(r.time || '')}</td><td>${escapeHtml(rvNombre(r))}</td><td>${r.people}</td><td>${mesa ? escapeHtml(mesa.name) : '—'}</td><td>${escapeHtml(rvTelefono(r))}</td><td>${escapeHtml(r.notes || '')}</td><td>☐</td></tr>`; }).join('') || `<tr><td colspan="7" class="pr-empty">${escapeHtml(t('empty.noReservationsDay'))}</td></tr>`}</tbody></table>`;
  printReportWindow(titulo, body, {winSize: 'width=900,height=1000'});
}

// ── Semana ───────────────────────────────────────────────────────────────
function renderReservasSemana(){
  const box = document.getElementById('reservas-tab-content');
  const dates = getWeekDates(reservasWeekOffset);
  const hoy = todayStr();
  let totR = 0, totP = 0, mejor = null;
  const columnas = dates.map((d, i) => {
    const ds = dateStr(d);
    const todas = DB.reservations.filter(r => r.date === ds).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const ocupan = todas.filter(rvOcupa);
    const pax = ocupan.reduce((s, r) => s + (r.people || 0), 0);
    totR += ocupan.length; totP += pax;
    if(!mejor || pax > mejor.pax) mejor = {pax, ds};
    return `
      <section class="pm-sem-dia${ds === hoy ? ' is-hoy' : ''}${ds < hoy ? ' es-pasado' : ''}" aria-label="${escapeHtml(pmFechaLarga(ds))}">
        <header class="pm-sem-cab" onclick="goToReservasDia('${ds}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goToReservasDia('${ds}')}">
          <span class="pm-sem-dia-nom">${escapeHtml(weekDayShort(i))}</span><b class="pm-sem-dia-num">${d.getDate()}</b><span class="pm-sem-dia-mes">${escapeHtml(t('months.short')[d.getMonth()])}</span>
          ${ocupan.length ? `<span class="rv-sem-n" title="${escapeHtml(t('common.people'))}">${ocupan.length} · ${pax}<i class="ti ti-users"></i></span>` : ''}
        </header>
        <div class="pm-sem-lista">
          ${todas.slice(0, 6).map(r => { const baja = !rvOcupa(r); return `
            <button type="button" class="pm-chip rv-chip${baja ? ' is-hecha' : ''}${r.llegada ? ' es-dto' : ''}" title="${escapeHtml(rvNombre(r))} · ${r.people}" onclick="openReservationModal(${r.id})">
              <b class="rv-chip-hora">${escapeHtml(r.time || '')}</b><span class="rv-chip-nom">${escapeHtml(rvNombre(r))}</span><em>${r.people}</em>
            </button>`; }).join('')}
          ${todas.length > 6 ? `<button type="button" class="pm-chip rv-chip rv-chip-mas" onclick="goToReservasDia('${ds}')"><span>${escapeHtml(gl({es:`Ver las ${todas.length - 6} restantes`, ca:`Veure les ${todas.length - 6} restants`, en:`See the other ${todas.length - 6}`}))}</span></button>` : ''}
          <button type="button" class="pm-mas" aria-label="${escapeHtml(t('btn.newReservation'))} · ${escapeHtml(pmFechaLarga(ds))}" onclick="reservasDate='${ds}';openReservationModal()"><i class="ti ti-plus"></i></button>
        </div>
      </section>`;
  }).join('');
  box.innerHTML = `
    <div class="toolbar pm-barra">
      <div class="left pm-nav">
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Semana anterior', ca:'Setmana anterior', en:'Previous week'}))}" onclick="reservasWeekOffset--;renderReservas()"><i class="ti ti-chevron-left"></i></button>
        <span class="pm-rango">${dates[0].getDate()} ${escapeHtml(t('months.short')[dates[0].getMonth()])} – ${dates[6].getDate()} ${escapeHtml(t('months.short')[dates[6].getMonth()])}</span>
        <button type="button" class="btn btn-fino pm-flecha" aria-label="${escapeHtml(gl({es:'Semana siguiente', ca:'Setmana següent', en:'Next week'}))}" onclick="reservasWeekOffset++;renderReservas()"><i class="ti ti-chevron-right"></i></button>
        ${reservasWeekOffset !== 0 ? `<button type="button" class="btn btn-sm btn-fino" onclick="reservasWeekOffset=0;renderReservas()">${escapeHtml(t('common.today'))}</button>` : ''}
      </div>
      <button type="button" class="btn btn-fino is-on" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.newReservation'))}</button>
    </div>
    ${pmResumenHtml([
      {et: gl({es:'Reservas de la semana', ca:'Reserves de la setmana', en:'Bookings this week'}), v: totR},
      {et: gl({es:'Comensales', ca:'Comensals', en:'Guests'}), v: totP},
      {et: gl({es:'Día más cargado', ca:'Dia més carregat', en:'Busiest day'}), v: mejor && mejor.pax ? `<small>${escapeHtml(pmFechaLarga(mejor.ds, true))}</small>` : '—', sub: mejor && mejor.pax ? escapeHtml(`${mejor.pax} ${t('common.people')}`) : ''},
    ])}
    <div class="pm-sem">${columnas}</div>`;
}

// ── Mes ──────────────────────────────────────────────────────────────────
function renderReservasMes(){
  const box = document.getElementById('reservas-tab-content');
  const {anio: year, mes: month} = reservasMesActual();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hoy = todayStr();
  const porDia = {}, porMes = {};
  DB.reservations.forEach(r => {
    if(!rvOcupa(r) || !r.date) return;
    (porDia[r.date] = porDia[r.date] || {n: 0, pax: 0}).n++; porDia[r.date].pax += r.people || 0;
    const m = r.date.slice(0, 7); porMes[m] = (porMes[m] || 0) + 1;
  });
  const datos = {}; Object.keys(porMes).forEach(m => { datos[m] = porMes[m]; });
  let totR = 0, totP = 0, mejor = null;
  let celdas = '';
  for(let i = 0; i < startOffset; i++) celdas += `<div class="pm-mes-vacio" aria-hidden="true"></div>`;
  for(let day = 1; day <= daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const x = porDia[ds];
    if(x){ totR += x.n; totP += x.pax; if(!mejor || x.pax > mejor.pax) mejor = {pax: x.pax, ds}; }
    celdas += `
      <button type="button" class="pm-mes-dia${ds === hoy ? ' is-hoy' : ''}${x ? ' tiene' : ''}" onclick="goToReservasDia('${ds}')" aria-label="${escapeHtml(pmFechaLarga(ds))}${x ? ' · ' + x.n + ' / ' + x.pax : ''}">
        <b>${day}</b>
        ${x ? `<span class="pm-mes-n">${x.n}</span><span class="pm-mes-tits"><i>${x.pax} ${escapeHtml(t('common.people'))}</i></span>` : ''}
      </button>`;
  }
  box.innerHTML = `
    <div class="toolbar pm-barra">
      <div class="left">${ggPeriodoHtml({anio: year, mes: month, cb: 'reservasMesCb', datos, anual: false})}</div>
      <button type="button" class="btn btn-fino is-on" onclick="openReservationModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.newReservation'))}</button>
    </div>
    ${pmResumenHtml([
      {et: gl({es:'Reservas del mes', ca:'Reserves del mes', en:'Bookings this month'}), v: totR},
      {et: gl({es:'Comensales', ca:'Comensals', en:'Guests'}), v: totP},
      {et: gl({es:'Día más cargado', ca:'Dia més carregat', en:'Busiest day'}), v: mejor ? `<small>${escapeHtml(pmFechaLarga(mejor.ds, true))}</small>` : '—', sub: mejor ? escapeHtml(`${mejor.pax} ${t('common.people')}`) : ''},
    ])}
    <div class="pm-mes" role="grid">
      ${t('days.short').map(d => `<div class="pm-mes-cab" role="columnheader">${escapeHtml(d)}</div>`).join('')}
      ${celdas}
    </div>`;
}
