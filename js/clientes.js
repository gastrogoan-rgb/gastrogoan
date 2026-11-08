/* ============================================================
   CLIENTES (1/11) — diseño nuevo
   · Lista = tarjetas (dos o tres por fila, sin mover nada de lado). Tocar una
     abre la FICHA entera: contacto, números, fidelización, alergias, notas y lo
     que tiene pendiente.
   · El HISTORIAL de un cliente y el de los VALES REGALO son pantallas propias
     dentro de Clientes (con su «Volver»), no ventanas encima de otra ventana.
   Lo que no cambia: las cuentas (clientSales, computeClientStats…) y el
   consentimiento de marketing, que viven en js/app.js.
   ============================================================ */

let clientesPantalla = 'lista';   // 'lista' | 'historial' | 'vales'
let clientesBusca = '';
let clientesFiltro = '';
let clientesOrden = 'nombre';
let clienteHistId = null;
let clienteHistTipo = 'todo';
let clienteHistMax = 40;
let clienteMasVisibles = 60;      // tarjetas que se pintan de golpe (el resto, con «Ver más»)

function clFiltrosDef(){
  return [
    {id:'', et: gl({es:'Todos', ca:'Tots', en:'All'})},
    {id:'vip', et: 'VIP', ay: gl({es:'7 o más puntos de fidelidad', ca:'7 o més punts de fidelitat', en:'7 or more loyalty points'})},
    {id:'new', et: gl({es:'Nuevos', ca:'Nous', en:'New'}), ay: gl({es:'Primera visita hace menos de 30 días', ca:'Primera visita fa menys de 30 dies', en:'First visit under 30 days ago'})},
    {id:'atrisk', et: gl({es:'En riesgo', ca:'En risc', en:'At risk'}), ay: gl({es:'Venían con ritmo y han dejado de venir', ca:'Venien amb ritme i han deixat de venir', en:'They used to come regularly and stopped'})},
    {id:'inactive', et: gl({es:'Inactivos', ca:'Inactius', en:'Inactive'}), ay: gl({es:'Más de 60 días sin venir', ca:'Més de 60 dies sense venir', en:'More than 60 days away'})},
    {id:'allergies', et: gl({es:'Con alergias', ca:'Amb al·lèrgies', en:'With allergies'})},
    {id:'noshows', et: gl({es:'No-shows', ca:'No-shows', en:'No-shows'}), ay: gl({es:'Han dejado alguna mesa vacía', ca:'Han deixat alguna taula buida', en:'Have left a table empty'})},
    {id:'noconsent', et: gl({es:'Sin permiso de marketing', ca:'Sense permís de màrqueting', en:'No marketing consent'})},
  ];
}
function clPertenece(filtro, c, st){
  switch(filtro){
    case 'vip': return (c.points || 0) >= 7;
    case 'new': return st.isNew;
    case 'atrisk': return st.atRisk;
    case 'inactive': return st.recency === null || st.recency > 60;
    case 'allergies': return !!(c.allergies || '').trim();
    case 'noshows': return (c.noShows || 0) > 0;
    case 'noconsent': return c.marketingConsent === false;
    default: return true;
  }
}
function clOrdenDef(){
  return [
    ['nombre', gl({es:'Nombre', ca:'Nom', en:'Name'})],
    ['ultima', gl({es:'Última visita', ca:'Última visita', en:'Last visit'})],
    ['visitas', gl({es:'Más visitas (30 d)', ca:'Més visites (30 d)', en:'Most visits (30 d)'})],
    ['gasto', gl({es:'Mayor gasto (año)', ca:'Major despesa (any)', en:'Highest spend (year)'})],
    ['puntos', gl({es:'Más puntos', ca:'Més punts', en:'Most points'})],
  ];
}
function clSetBusca(v){
  clientesBusca = v; clienteMasVisibles = 60;
  renderClientesLista(true);
}
function clSetFiltro(f){ clientesFiltro = f; clienteMasVisibles = 60; renderClientesLista(); }
function clSetOrden(o){ clientesOrden = o; renderClientesLista(); }
function clVerMas(){ clienteMasVisibles += 60; renderClientesLista(); }

// Un solo punto de entrada (el que usa renderView): según la pantalla abierta.
function renderClientes(){
  const box = document.getElementById('clientes-content');
  if(!box) return;
  if(clientesPantalla === 'vales') return renderValesPantalla();
  if(clientesPantalla === 'historial') return renderClienteHistorial();
  renderClientesLista();
}
function clIr(pantalla, extra){
  clientesPantalla = pantalla;
  if(pantalla === 'historial'){ clienteHistId = extra; clienteHistTipo = 'todo'; clienteHistMax = 40; }
  if(pantalla === 'vales' && extra !== undefined){ valesBusca = extra || ''; valesFiltro = 'todos'; }
  closeModal();
  renderClientes();
  scrollContentToTop();
}
function clVolver(){ clientesPantalla = 'lista'; renderClientes(); scrollContentToTop(); }

function clTarjetaAcciones(c, st){
  const tel = whatsappDeTelefono(c.phone);
  const menu = ggMenuAcciones([
    {icono:'ti-edit', texto: gl({es:'Abrir ficha', ca:'Obrir fitxa', en:'Open card'}), fn:`openClientModal(${c.id})`},
    {icono:'ti-history', texto: gl({es:'Historial', ca:'Historial', en:'History'}), fn:`clIr('historial', ${c.id})`},
    {icono:'ti-git-merge', texto: t('btn.mergeClient'), fn:`openMergeClientModal(${c.id})`, owner:true},
    {icono:'ti-trash', texto: t('common.delete'), fn:`deleteClient(${c.id})`, peligro:true, owner:true},
  ]);
  return `${tel ? `<a class="btn btn-fino mn-btn" data-tip="WhatsApp" aria-label="WhatsApp ${escapeHtml(c.name)}" href="https://wa.me/${tel}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
    ${c.email ? `<a class="btn btn-fino mn-btn" data-tip="Email" aria-label="Email ${escapeHtml(c.name)}" href="mailto:${escapeHtml(c.email)}" onclick="event.stopPropagation()"><i class="ti ti-mail"></i></a>` : ''}
    <span onclick="event.stopPropagation()">${menu}</span>`;
}
function clTarjetaHtml(c, st){
  const puntos = c.points || 0;
  const etiquetas = [
    st.isNew ? `<span class="pm-et is-dto">${escapeHtml(t('badge.new'))}</span>` : '',
    st.atRisk ? `<span class="pm-et cl-et-riesgo">${escapeHtml(t('badge.atRisk'))}</span>` : '',
    puntos >= 7 ? `<span class="pm-et is-ok"><i class="ti ti-star"></i> VIP</span>` : '',
    (c.allergies || '').trim() ? `<span class="pm-et cl-et-alergia" title="${escapeHtml(c.allergies)}"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es:'Alergias', ca:'Al·lèrgies', en:'Allergies'}))}</span>` : '',
    c.noShows ? `<span class="pm-et cl-et-riesgo"><i class="ti ti-user-x"></i> ${c.noShows}</span>` : '',
    c.marketingConsent === false ? `<span class="pm-et" title="${escapeHtml(t('filter.noConsent'))}"><i class="ti ti-mail-off"></i></span>` : '',
    valesPendientesDe(c.id) ? `<span class="pm-et"><i class="ti ti-gift-card"></i> ${valesPendientesDe(c.id)}</span>` : '',
  ].filter(Boolean).join('');
  const pct = Math.min(100, puntos * 10);
  return `
  <article class="cl-card" role="button" tabindex="0" onclick="openClientModal(${c.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openClientModal(${c.id})}" aria-label="${escapeHtml(c.name)}">
    <div class="cl-card-cab">
      <span class="pr-av" style="--c:${c.erasedAt ? '#9A9A92' : '#8A7440'}">${escapeHtml(prIniciales(c.name))}</span>
      <div class="cl-card-nom"><b>${escapeHtml(c.name)}</b>
        <small>${st.lastDate ? escapeHtml(t('label.daysAgo').replace('${n}', st.recency)) : escapeHtml(gl({es:'Sin visitas todavía', ca:'Sense visites encara', en:'No visits yet'}))}${st.visitas30d ? ' · ' + escapeHtml(gl({es:`${st.visitas30d} visita(s) este mes`, ca:`${st.visitas30d} visita(es) aquest mes`, en:`${st.visitas30d} visit(s) this month`})) : ''}</small></div>
    </div>
    ${etiquetas ? `<div class="pm-ets">${etiquetas}</div>` : ''}
    <div class="cl-puntos" title="${escapeHtml(t('label.loyaltyPoints'))}"><div class="nv-barra" role="progressbar" aria-valuenow="${puntos}" aria-valuemin="0" aria-valuemax="10" aria-label="${escapeHtml(t('label.loyaltyPoints'))}"><span style="width:${pct}%"></span></div><b>${puntos}/10</b></div>
    <div class="cl-card-pie">${puntos >= 10 ? `<button type="button" class="btn btn-sm btn-fino is-on" onclick="event.stopPropagation();openRewardModal(${c.id})"><i class="ti ti-gift"></i> ${escapeHtml(t('btn.giveReward'))}</button>` : '<span></span>'}<span class="cl-acc">${clTarjetaAcciones(c, st)}</span></div>
  </article>`;
}

function renderClientesLista(conservarFoco){
  const box = document.getElementById('clientes-content');
  if(!box) return;
  const getStats = computeClientStatsIndexed();
  const todos = DB.clients.map(c => ({c, st: getStats(c)}));
  const q = pmSinTildes(clientesBusca.trim());
  const digitosQ = clientesBusca.replace(/\D/g, '');
  const defs = clFiltrosDef();
  const conteos = {};
  defs.forEach(d => { conteos[d.id] = todos.filter(x => clPertenece(d.id, x.c, x.st)).length; });
  let items = todos.filter(x => clPertenece(clientesFiltro, x.c, x.st) && (!q || pmSinTildes(x.c.name).includes(q) || (digitosQ.length >= 3 && (x.c.phone || '').replace(/\D/g, '').includes(digitosQ)) || pmSinTildes(x.c.email || '').includes(q)));
  const cmp = {
    nombre: (a, b) => a.c.name.localeCompare(b.c.name, 'es'),
    ultima: (a, b) => (b.st.lastDate || '').localeCompare(a.st.lastDate || ''),
    visitas: (a, b) => b.st.visitas30d - a.st.visitas30d || a.c.name.localeCompare(b.c.name, 'es'),
    gasto: (a, b) => b.st.totalYear - a.st.totalYear || a.c.name.localeCompare(b.c.name, 'es'),
    puntos: (a, b) => (b.c.points || 0) - (a.c.points || 0) || a.c.name.localeCompare(b.c.name, 'es'),
  }[clientesOrden] || ((a, b) => 0);
  items = items.slice().sort(cmp);
  const visibles = items.slice(0, clienteMasVisibles);
  const activos30 = todos.filter(x => x.st.visitas30d > 0).length;
  const premios = todos.filter(x => (x.c.points || 0) >= 10).length;

  const cabecera = `
    ${pmResumenHtml([
      {et: gl({es:'Clientes', ca:'Clients', en:'Customers'}), v: DB.clients.length, sub: DB.clients.length ? escapeHtml(gl({es:`${DB.clients.filter(c => c.marketingConsent !== false).length} aceptan novedades`, ca:`${DB.clients.filter(c => c.marketingConsent !== false).length} accepten novetats`, en:`${DB.clients.filter(c => c.marketingConsent !== false).length} accept news`})) : ''},
      {et: gl({es:'Activos este mes', ca:'Actius aquest mes', en:'Active this month'}), v: activos30},
      {et: gl({es:'En riesgo', ca:'En risc', en:'At risk'}), v: conteos.atrisk, cls: conteos.atrisk ? 'is-bajo' : ''},
      {et: gl({es:'Premios por dar', ca:'Premis per donar', en:'Rewards to give'}), v: premios, cls: premios ? 'is-ok' : ''},
    ])}
    <div class="toolbar pm-barra cl-barra">
      <div class="left">
        <input type="search" class="search-input st-buscar" id="clientes-search" value="${escapeHtml(clientesBusca)}" placeholder="${escapeHtml(t('ph.searchClient'))}" aria-label="${escapeHtml(t('ph.searchClient'))}" oninput="clSetBusca(this.value)">
        <span class="cl-orden"><select id="clientes-orden" aria-label="${escapeHtml(gl({es:'Ordenar por', ca:'Ordenar per', en:'Sort by'}))}" onchange="clSetOrden(this.value)">${clOrdenDef().map(([v, et]) => `<option value="${v}" ${clientesOrden === v ? 'selected' : ''}>${escapeHtml(et)}</option>`).join('')}</select></span>
      </div>
      <div class="pm-acciones">
        <button type="button" class="btn btn-fino" onclick="clIr('vales')"><i class="ti ti-history"></i> ${escapeHtml(gl({es:'Historial de vales', ca:'Historial de vals', en:'Voucher history'}))}</button>
        <button type="button" class="btn btn-fino" onclick="openGiftVouchersModal()"><i class="ti ti-gift-card"></i> ${escapeHtml(t('title.giftVouchers'))}</button>
        <button type="button" class="btn btn-fino is-on" onclick="openClientModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('title.newClient'))}</button>
      </div>
    </div>
    <div class="cl-chips" role="group" aria-label="${escapeHtml(gl({es:'Filtrar clientes', ca:'Filtrar clients', en:'Filter customers'}))}">
      ${defs.map(d => `<button type="button" class="btn btn-sm btn-fino${clientesFiltro === d.id ? ' is-on' : ''}" aria-pressed="${clientesFiltro === d.id}" ${d.ay ? `title="${escapeHtml(d.ay)}"` : ''} onclick="clSetFiltro('${d.id}')">${escapeHtml(d.et)} <b>${conteos[d.id]}</b></button>`).join('')}
    </div>`;

  const lista = !DB.clients.length
    ? `<div class="empty es-vacio"><i class="ti ti-address-book"></i>${escapeHtml(t('empty.clients'))}<div><button type="button" class="btn btn-fino is-on" onclick="openClientModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('title.newClient'))}</button></div></div>`
    : !items.length
    ? `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`
    : `<div class="cl-grid">${visibles.map(x => clTarjetaHtml(x.c, x.st)).join('')}</div>
       ${items.length > visibles.length ? `<div class="pm-ver-mas"><button type="button" class="btn btn-sm btn-fino" onclick="clVerMas()">${escapeHtml(gl({es:`Ver ${Math.min(60, items.length - visibles.length)} más (${items.length - visibles.length} sin mostrar)`, ca:`Veure'n ${Math.min(60, items.length - visibles.length)} més (${items.length - visibles.length} sense mostrar)`, en:`Show ${Math.min(60, items.length - visibles.length)} more (${items.length - visibles.length} hidden)`}))}</button></div>` : ''}`;

  // Buscar repinta la lista: se conserva el campo (y el cursor) para poder seguir escribiendo.
  if(conservarFoco && document.getElementById('clientes-lista-zona')){
    document.getElementById('clientes-lista-zona').innerHTML = lista;
    const chips = document.querySelector('#clientes-content .cl-chips'); if(chips) chips.innerHTML = defs.map(d => `<button type="button" class="btn btn-sm btn-fino${clientesFiltro === d.id ? ' is-on' : ''}" aria-pressed="${clientesFiltro === d.id}" ${d.ay ? `title="${escapeHtml(d.ay)}"` : ''} onclick="clSetFiltro('${d.id}')">${escapeHtml(d.et)} <b>${conteos[d.id]}</b></button>`).join('');
    if(typeof ggAfinarBotones === 'function') ggAfinarBotones(document.getElementById('view-clientes'));
    return;
  }
  box.innerHTML = cabecera + `<div id="clientes-lista-zona">${lista}</div>`;
}

/* ── La ficha ─────────────────────────────────────────────────────────────
   Todo lo del cliente en una sola ventana ancha: a la izquierda lo que se
   edita, a la derecha lo que ya se sabe de él. Las notas son un campo
   grande que crece (lo que se apunta de un cliente suele ser largo). */
function clStatCel(et, v){ return `<div class="cl-stat"><span>${escapeHtml(et)}</span><b>${v}</b></div>`; }
function openClientModal(id){
  const c = id ? DB.clients.find(x => x.id === id) : {name:'', phone:'', email:'', notes:'', allergies:'', points:0, cp:'', cumpleanos:'', ultimoContacto:''};
  if(!c) return;
  const st = id ? clientSalesStats(c) : null;
  const hoy = todayStr();
  const proximas = id ? DB.reservations.filter(r => (r.clientId === id) && r.date >= hoy && r.status !== 'cancelada' && r.status !== 'no_show').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 3) : [];
  const vales = id ? valesDeCliente(id) : [];
  const valesVivos = vales.filter(v => ['pendiente', 'parcial'].includes(valeEstado(v)));
  const cumpleDias = c.cumpleanos ? nextBirthdayDays(c.cumpleanos) : null;
  const puntos = c.points || 0;
  const fav = id ? clientFavoriteItem(c) : null;
  const premios = (c.rewardsHistory || []).slice().reverse();
  const campo = (idc, etq, val, extra) => `<div class="field"><label for="${idc}">${escapeHtml(etq)}</label><input type="${extra && extra.type || 'text'}" id="${idc}" value="${escapeHtml(val || '')}" ${extra && extra.ph ? `placeholder="${escapeHtml(extra.ph)}"` : ''}></div>`;

  openModal(`
    <div class="modal-header">
      <h3>${id ? `<span class="pr-av pr-av-s" style="--c:#8A7440">${escapeHtml(prIniciales(c.name))}</span> ${escapeHtml(c.name)}` : escapeHtml(t('title.newClient'))}</h3>
      <button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button>
    </div>
    <div class="cl-ficha">
      <div class="cl-ficha-izq">
        <div class="es-tit">${escapeHtml(gl({es:'Datos', ca:'Dades', en:'Details'}))}</div>
        ${campo('client-name', t('common.name') + ' *', c.name, {ph: t('ph.clientName')})}
        <div class="field-row">
          ${campo('client-phone', t('common.phone') + ' *', c.phone, {ph: t('ph.phoneExample')})}
          ${campo('client-email', t('common.email'), c.email, {type:'email', ph:'cliente@email.com'})}
        </div>
        <div class="field-row">
          ${campo('client-cp', t('label.postalCode'), c.cp, {ph: t('ph.postalCodeExample')})}
          ${campo('client-cumpleanos', t('label.birthday'), c.cumpleanos, {type:'date'})}
        </div>
        ${campo('client-ultimo-contacto', t('label.lastContact'), c.ultimoContacto, {type:'date'})}
        <div class="field">
          <label for="client-allergies">${escapeHtml(t('label.allergiesPrefs'))}</label>
          <textarea id="client-allergies" class="lp-auto-alto" rows="2" oninput="lpAuto(this)" placeholder="${escapeHtml(t('ph.allergiesExample'))}">${escapeHtml(c.allergies || '')}</textarea>
        </div>
        <div class="field">
          <label for="client-notes">${escapeHtml(t('th.notes'))}</label>
          <textarea id="client-notes" class="lp-auto-alto cl-notas" rows="7" oninput="lpAuto(this)" placeholder="${escapeHtml(t('ph.additionalNotes'))}">${escapeHtml(c.notes || '')}</textarea>
        </div>
        <label class="pm-opcion"><input type="checkbox" id="client-marketing-consent" ${c.marketingConsent !== false ? 'checked' : ''}><span>${escapeHtml(t('label.marketingConsent'))}</span></label>
      </div>
      <div class="cl-ficha-der">
        ${id ? `
        <div class="es-tit">${escapeHtml(gl({es:'De un vistazo', ca:'D\'un cop d\'ull', en:'At a glance'}))}</div>
        <div class="cl-stats">
          ${clStatCel(t('label.visits30d'), st.visitas30d)}
          ${clStatCel(t('label.visitsYear'), st.visitasYear)}
          ${clStatCel(t('label.avgTicket'), fmtMoney(st.ticketMedio))}
          ${clStatCel(t('label.total30d'), fmtMoney(st.total30d))}
          ${clStatCel(t('label.totalYear'), fmtMoney(st.totalYear))}
          ${clStatCel(t('label.lastVisit'), st.lastDate ? `<small>${escapeHtml(st.lastDate)}</small>` : '—')}
        </div>
        <div class="pm-ets cl-fich-ets">
          ${st.isNew ? `<span class="pm-et is-dto">${escapeHtml(t('badge.new'))}</span>` : ''}${st.atRisk ? `<span class="pm-et cl-et-riesgo">${escapeHtml(t('badge.atRisk'))}</span>` : ''}
          ${c.noShows ? `<span class="pm-et cl-et-riesgo"><i class="ti ti-user-x"></i> ${c.noShows} ${escapeHtml(gl({es:'no-show(s)', ca:'no-show(s)', en:'no-show(s)'}))}</span>` : ''}
          ${fav ? `<span class="pm-et"><i class="ti ti-heart"></i> ${escapeHtml(fav)}</span>` : ''}
          ${cumpleDias !== null && cumpleDias <= 30 ? `<span class="pm-et"><i class="ti ti-cake"></i> ${escapeHtml(cumpleDias === 0 ? t('promo.clients.today') : t('promo.clients.inDays').replace('${n}', cumpleDias).replace('${s}', cumpleDias !== 1 ? 's' : ''))}</span>` : ''}
        </div>
        <div class="es-tit es-tit-2">${escapeHtml(t('label.loyaltyPoints'))}</div>
        <div class="cl-puntos"><div class="nv-barra" role="progressbar" aria-valuenow="${puntos}" aria-valuemin="0" aria-valuemax="10"><span style="width:${Math.min(100, puntos * 10)}%"></span></div><b>${puntos}/10</b>
          <button type="button" class="btn btn-sm btn-fino mn-btn" data-tip="${escapeHtml(t('title.loyaltyPoints'))}" aria-label="${escapeHtml(t('title.loyaltyPoints'))}" onclick="showLoyaltyInfo()"><i class="ti ti-info-circle"></i></button></div>
        ${puntos >= 10 ? `<button type="button" class="btn btn-sm btn-fino is-on" onclick="openRewardModal(${id})"><i class="ti ti-gift"></i> ${escapeHtml(t('btn.giveReward'))}</button>` : ''}
        ${premios.length ? `<ul class="cl-mini">${premios.slice(0, 3).map(r => `<li><i class="ti ti-gift"></i> ${escapeHtml(r.fecha)} — ${escapeHtml(r.premio)}</li>`).join('')}</ul>` : ''}
        <div class="es-tit es-tit-2">${escapeHtml(gl({es:'Reservas próximas', ca:'Reserves properes', en:'Upcoming bookings'}))}</div>
        ${proximas.length ? `<ul class="cl-mini">${proximas.map(r => `<li><button type="button" class="cl-enlace" onclick="closeModal();navigate('reservas');goToReservasDia('${r.date}')">${escapeHtml(r.date)} ${escapeHtml(r.time || '')} · ${r.people} ${escapeHtml(t('common.people'))}</button> ${reservationStatusBadge(r.status, r.llegada)}</li>`).join('')}</ul>` : `<p class="pr-ayuda">${escapeHtml(gl({es:'Ninguna por ahora.', ca:'Cap de moment.', en:'None for now.'}))}</p>`}
        <div class="es-tit es-tit-2">${escapeHtml(t('title.giftVouchers'))}</div>
        ${vales.length ? `<p class="pr-ayuda">${escapeHtml(gl({es:`${valesVivos.length} sin usar de ${vales.length} emitido(s).`, ca:`${valesVivos.length} sense usar de ${vales.length} emès(os).`, en:`${valesVivos.length} unused of ${vales.length} issued.`}))} <button type="button" class="cl-enlace" onclick="clIr('vales', '${escapeJsAttr(c.name)}')">${escapeHtml(gl({es:'Ver', ca:'Veure', en:'View'}))}</button></p>` : `<p class="pr-ayuda">${escapeHtml(gl({es:'Ninguno.', ca:'Cap.', en:'None.'}))}</p>`}
        ` : `<p class="pr-ayuda"><i class="ti ti-info-circle"></i> ${escapeHtml(gl({es:'Cuando guardes la ficha verás aquí sus visitas, su gasto y sus puntos.', ca:'Quan desis la fitxa veuràs aquí les seves visites, la seva despesa i els seus punts.', en:'Once you save the card you will see their visits, spend and points here.'}))}</p>`}
      </div>
    </div>
    ${id ? `<div class="cl-ficha-bt">
      <button type="button" class="btn btn-sm btn-fino" onclick="clIr('historial', ${id})"><i class="ti ti-history"></i> ${escapeHtml(gl({es:'Historial', ca:'Historial', en:'History'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="openMergeClientModal(${id})"><i class="ti ti-git-merge"></i> ${escapeHtml(t('btn.mergeClient'))}</button>
      <button type="button" class="btn btn-sm btn-fino is-off" onclick="eraseClientDataRGPD(${id})" title="${escapeHtml(t('rgpd.eraseHint'))}"><i class="ti ti-shield-off"></i> ${escapeHtml(t('title.eraseClientRGPD'))}</button>
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${escapeHtml(t('common.cancel'))}</button>
      <button class="btn btn-primary" onclick="saveClient(${id || 'null'})">${escapeHtml(t('common.save'))}</button>
    </div>
  `, {xl: true});
  document.querySelectorAll('#modal-box textarea.lp-auto-alto').forEach(lpAuto);
}

/* ── Historial de UN cliente (pantalla propia) ────────────────────────── */
function clHistTipo(tipo){ clienteHistTipo = tipo; clienteHistMax = 40; renderClienteHistorial(); }
function clHistMas(){ clienteHistMax += 40; renderClienteHistorial(); }
function clienteLineaTiempo(c){
  const ev = [];
  clientSales(c).forEach(s => ev.push({tipo:'pedido', fecha: s.date, orden: (s.createdAt || s.date), s}));
  DB.reservations.filter(r => r.clientId === c.id || (r.clientName && r.clientName.trim().toLowerCase() === c.name.trim().toLowerCase()))
    .forEach(r => ev.push({tipo:'reserva', fecha: r.date, orden: r.date + ' ' + (r.time || ''), r}));
  valesDeCliente(c.id).forEach(v => {
    ev.push({tipo:'vale', fecha: (v.createdAt || '').slice(0, 10), orden: v.createdAt || '', v, que:'emitido'});
    (v.canjes || []).forEach(k => ev.push({tipo:'vale', fecha: k.fecha, orden: k.fecha + 'T99', v, que:'canje', k}));
  });
  (c.rewardsHistory || []).forEach(r => ev.push({tipo:'premio', fecha: r.fecha, orden: r.fecha + 'T98', r}));
  return ev.sort((a, b) => String(b.orden).localeCompare(String(a.orden)));
}
function renderClienteHistorial(){
  const box = document.getElementById('clientes-content');
  const c = DB.clients.find(x => x.id === clienteHistId);
  if(!c){ clientesPantalla = 'lista'; return renderClientesLista(); }
  const st = clientSalesStats(c);
  const todos = clienteLineaTiempo(c);
  const cuenta = k => todos.filter(e => e.tipo === k).length;
  const filtros = [['todo', gl({es:'Todo', ca:'Tot', en:'All'}), todos.length], ['pedido', gl({es:'Pedidos', ca:'Comandes', en:'Orders'}), cuenta('pedido')], ['reserva', gl({es:'Reservas', ca:'Reserves', en:'Bookings'}), cuenta('reserva')], ['vale', t('title.giftVouchers'), cuenta('vale')], ['premio', gl({es:'Premios', ca:'Premis', en:'Rewards'}), cuenta('premio')]];
  const ev = todos.filter(e => clienteHistTipo === 'todo' || e.tipo === clienteHistTipo);
  const vis = ev.slice(0, clienteHistMax);
  const fila = e => {
    const ico = {pedido:'ti-receipt', reserva:'ti-calendar-event', vale:'ti-gift-card', premio:'ti-gift'}[e.tipo];
    let tit = '', det = '', der = '', click = '';
    if(e.tipo === 'pedido'){
      tit = escapeHtml(gl({es:'Pedido', ca:'Comanda', en:'Order'}));
      det = (e.s.items || []).map(it => `${it.qty}× ${escapeHtml(it.name)}`).join(', ') || '—';
      der = `<b>${fmtMoney(e.s.total)}</b>`;
    } else if(e.tipo === 'reserva'){
      tit = escapeHtml(gl({es:'Reserva', ca:'Reserva', en:'Booking'})) + ' ' + escapeHtml(e.r.time || '');
      det = `${e.r.people} ${escapeHtml(t('common.people'))}${e.r.notes ? ' · ' + escapeHtml(e.r.notes) : ''}`;
      der = reservationStatusBadge(e.r.status, e.r.llegada);
      click = `onclick="navigate('reservas');goToReservasDia('${e.r.date}')" role="button" tabindex="0"`;
    } else if(e.tipo === 'vale'){
      tit = escapeHtml(e.que === 'emitido' ? gl({es:'Vale emitido', ca:'Val emès', en:'Voucher issued'}) : gl({es:'Vale canjeado', ca:'Val bescanviat', en:'Voucher redeemed'})) + ' <span class="cl-mono">' + escapeHtml(e.v.code) + '</span>';
      det = escapeHtml(e.v.tipo === 'experiencia' ? e.v.descripcion : '');
      der = `<b>${fmtMoney(e.que === 'canje' ? e.k.importe : e.v.importe)}</b>`;
      click = `onclick="clIr('vales', '${escapeJsAttr(e.v.code)}')" role="button" tabindex="0"`;
    } else {
      tit = escapeHtml(gl({es:'Premio de fidelidad', ca:'Premi de fidelitat', en:'Loyalty reward'}));
      det = escapeHtml(e.r.premio);
    }
    return `<li class="cl-ev"${click ? '' : ''}><span class="cl-ev-ico"><i class="ti ${ico}"></i></span>
      <div class="cl-ev-txt" ${click}><b>${tit}</b><small>${det}</small></div><span class="cl-ev-fecha">${escapeHtml(e.fecha || '')}</span><span class="cl-ev-der">${der}</span></li>`;
  };
  box.innerHTML = `
    <div class="toolbar pm-barra"><div class="left"><button type="button" class="btn btn-sm btn-fino" onclick="clVolver()"><i class="ti ti-arrow-left"></i> ${escapeHtml(gl({es:'Clientes', ca:'Clients', en:'Customers'}))}</button></div>
      <div class="pm-acciones"><button type="button" class="btn btn-fino" onclick="openClientModal(${c.id})"><i class="ti ti-user"></i> ${escapeHtml(gl({es:'Ficha', ca:'Fitxa', en:'Card'}))}</button></div></div>
    <h2 class="cl-tit-pantalla"><span class="pr-av" style="--c:#8A7440">${escapeHtml(prIniciales(c.name))}</span> ${escapeHtml(gl({es:'Historial de ', ca:'Historial de ', en:'History of '}))}${escapeHtml(c.name)}</h2>
    ${pmResumenHtml([
      {et: t('label.visitsYear'), v: st.visitasYear, sub: escapeHtml(t('label.visits30d') + ': ' + st.visitas30d)},
      {et: t('label.totalYear'), v: fmtMoney(st.totalYear)},
      {et: t('label.avgTicket'), v: fmtMoney(st.ticketMedio)},
      {et: t('label.lastVisit'), v: st.lastDate ? `<small>${escapeHtml(st.lastDate)}</small>` : '—', sub: st.recency !== null ? escapeHtml(t('label.daysAgo').replace('${n}', st.recency)) : ''},
    ])}
    <div class="cl-chips" role="group">${filtros.map(([k, et, n]) => `<button type="button" class="btn btn-sm btn-fino${clienteHistTipo === k ? ' is-on' : ''}" aria-pressed="${clienteHistTipo === k}" onclick="clHistTipo('${k}')">${escapeHtml(et)} <b>${n}</b></button>`).join('')}</div>
    ${vis.length ? `<ul class="cl-lista-ev">${vis.map(fila).join('')}</ul>${ev.length > vis.length ? `<div class="pm-ver-mas"><button type="button" class="btn btn-sm btn-fino" onclick="clHistMas()">${escapeHtml(gl({es:`Ver ${Math.min(40, ev.length - vis.length)} más`, ca:`Veure'n ${Math.min(40, ev.length - vis.length)} més`, en:`Show ${Math.min(40, ev.length - vis.length)} more`}))}</button></div>` : ''}`
      : `<div class="empty es-vacio"><i class="ti ti-receipt"></i>${escapeHtml(t('empty.noOrderHistory'))}</div>`}`;
}
// El botón «Historial» de siempre sigue funcionando: ahora lleva a la pantalla.
function openClientHistoryModal(id){ clIr('historial', id); }

/* ============================================================
   VALES REGALO
   Lo que había: se emitían y se «marcaban canjeados» a mano, sin caducidad, sin
   canje parcial, borrables aunque ya estuvieran cobrados, y sin pasar nunca por
   la contabilidad (un vale de «cena para dos» cobrado por adelantado no
   declaraba su IVA, y el dinero cobrado por adelantado no los contaba).
   Ahora: caducidad, estados (pendiente · parcial · canjeado · caducado ·
   anulado), canje total o parcial con su historial, y cada vale queda anotado
   en el registro de vales del gestor (DB.ge.vales) con su IVA. Un vale no se
   borra: se anula (y solo si su mes no está cerrado).
   ============================================================ */
let valesFiltro = 'todos';
let valesBusca = '';

function valeCanjes(v){
  if(Array.isArray(v.canjes)) return v.canjes;
  return v.redeemed ? [{fecha: (v.redeemedAt || v.createdAt || '').slice(0, 10), importe: v.importe || 0, nota: ''}] : [];
}
function valeSaldo(v){
  if(v.anulado || v.redeemed) return 0;
  const usado = valeCanjes(v).reduce((s, k) => s + (parseFloat(k.importe) || 0), 0);
  return Math.max(0, Math.round(((parseFloat(v.importe) || 0) - usado) * 100) / 100);
}
function valeEstado(v){
  if(v.anulado) return 'anulado';
  if(v.redeemed) return 'canjeado';
  if(v.venceEn && v.venceEn < todayStr()) return 'caducado';
  return valeCanjes(v).length ? 'parcial' : 'pendiente';
}
function valeEstadoDef(e){
  return {
    pendiente: {et: gl({es:'Pendiente', ca:'Pendent', en:'Pending'}), cls: 'is-pend'},
    parcial: {et: gl({es:'Canje parcial', ca:'Bescanvi parcial', en:'Partly redeemed'}), cls: 'is-pend'},
    canjeado: {et: gl({es:'Canjeado', ca:'Bescanviat', en:'Redeemed'}), cls: 'is-ok'},
    caducado: {et: gl({es:'Caducado', ca:'Caducat', en:'Expired'}), cls: 'is-cad'},
    anulado: {et: gl({es:'Anulado', ca:'Anul·lat', en:'Voided'}), cls: 'is-anul'},
  }[e];
}
function valesLista(){ if(!Array.isArray(DB.giftVouchers)) DB.giftVouchers = []; return DB.giftVouchers; }
function valesDeCliente(id){ return valesLista().filter(v => v.clienteId === id); }
function valesPendientesDe(id){ return valesDeCliente(id).filter(v => ['pendiente', 'parcial'].includes(valeEstado(v))).length; }
function valeCodigoUnico(){
  const usados = new Set(valesLista().map(v => v.code));
  let code;
  do { code = giftVoucherCode(); } while(usados.has(code));
  return code;
}
function valeVence(v){ return v.venceEn ? new Date(v.venceEn + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'long', year:'numeric'}) : gl({es:'sin caducidad', ca:'sense caducitat', en:'no expiry'}); }
function valeDiasParaVencer(v){ return v.venceEn ? Math.round((new Date(v.venceEn + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000) : null; }

// ── Contabilidad ─────────────────────────────────────────────────────────
function valeAsiento(v){ return ((DB.ge && DB.ge.vales) || []).find(x => x.valeId === v.id) || null; }
function valeAsientoAlta(v){
  if(!DB.ge) DB.ge = {};
  if(!Array.isArray(DB.ge.vales)) DB.ge.vales = [];
  if(valeAsiento(v)) return;
  DB.ge.vales.push({id: genId(), valeId: v.id, fecha: (v.createdAt || todayStr()).slice(0, 10), tipo: v.fiscal || 'polivalente', codigo: v.code,
    importe: v.importe, iva: v.fiscal === 'univalente' ? (parseFloat(v.iva) || 0) : 0, canjeFecha: null, canjeParcial: 0, venceEn: v.venceEn || null});
}
function valeAsientoCanje(v){
  const a = valeAsiento(v); if(!a) return;
  a.canjeParcial = Math.round(valeCanjes(v).reduce((s, k) => s + (parseFloat(k.importe) || 0), 0) * 100) / 100;
  a.canjeFecha = v.redeemed ? (valeCanjes(v).slice(-1)[0] || {}).fecha || todayStr() : null;
}
function valeAsientoQuitar(v){
  if(DB.ge && Array.isArray(DB.ge.vales)) DB.ge.vales = DB.ge.vales.filter(x => x.valeId !== v.id);
}
// El mes del asiento no se toca si está cerrado: lo declarado no se reescribe.
function valeMesCerrado(v){
  const a = valeAsiento(v);
  return !!(a && typeof GE !== 'undefined' && GE.isDateClosed && GE.isDateClosed(a.fecha));
}
function valesSinContabilidad(){
  return valesLista().filter(v => !v.anulado && v.fiscal === undefined);
}
// Los vales de antes de este cambio nunca llegaron a la contabilidad: se anotan
// de una vez, como polivalentes (dinero por adelantado), sin tocar ningún IVA ya declarado.
function valesRegistrarAntiguos(){
  const lista = valesSinContabilidad().filter(v => v.tipo === 'importe' && v.importe > 0);
  lista.forEach(v => {
    v.fiscal = 'polivalente'; v.iva = 0;
    if(v.venceEn === undefined) v.venceEn = null;
    valeAsientoAlta(v); valeAsientoCanje(v);
  });
  valesSinContabilidad().forEach(v => { v.fiscal = 'ninguno'; });   // las de experiencia no tienen importe: se dejan fuera, a propósito
  saveDB(); renderClientes();
  showToast(gl({es:`${lista.length} vale(s) anotados en la contabilidad`, ca:`${lista.length} val(s) anotats a la comptabilitat`, en:`${lista.length} voucher(s) added to the accounts`}));
}

// ── Emitir ───────────────────────────────────────────────────────────────
function valeVenceDefecto(){ const d = new Date(); d.setFullYear(d.getFullYear() + 1); return dateStr(d); }
function openGiftVouchersModal(prefill){
  prefill = prefill || {};
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-gift-card"></i> ${escapeHtml(gl({es:'Emitir un vale regalo', ca:'Emetre un val regal', en:'Issue a gift voucher'}))}</h3>
      <button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button>
    </div>
    <div class="field">
      <label for="voucher-tipo">${escapeHtml(t('label.voucherType'))}</label>
      <select id="voucher-tipo" onchange="renderGiftVoucherFormFields()">
        <option value="importe">${escapeHtml(t('voucherType.amount'))}</option>
        <option value="experiencia">${escapeHtml(t('voucherType.experience'))}</option>
      </select>
    </div>
    <div id="voucher-form-fields"></div>
    <div class="field">
      <label for="voucher-cliente">${escapeHtml(t('label.voucherClient'))}</label>
      <select id="voucher-cliente" onchange="valeAutoPara()">
        <option value="">${escapeHtml(gl({es:'— Sin ficha de cliente —', ca:'— Sense fitxa de client —', en:'— No customer card —'}))}</option>
        ${[...DB.clients].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(c => `<option value="${c.id}" ${prefill.clienteId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label for="voucher-para">${escapeHtml(gl({es:'Para (nombre en el vale)', ca:'Per a (nom al val)', en:'For (name on the voucher)'}))}</label><input type="text" id="voucher-para" maxlength="60" value="${escapeHtml(prefill.para || '')}"></div>
      <div class="field"><label for="voucher-vence">${escapeHtml(gl({es:'Válido hasta', ca:'Vàlid fins', en:'Valid until'}))}</label><input type="date" id="voucher-vence" value="${valeVenceDefecto()}" min="${todayStr()}"></div>
    </div>
    <label class="pm-opcion"><input type="checkbox" id="voucher-sin-vence" onchange="document.getElementById('voucher-vence').disabled=this.checked"><span>${escapeHtml(gl({es:'Sin fecha de caducidad', ca:'Sense data de caducitat', en:'No expiry date'}))}</span></label>
    <p class="pr-ayuda"><i class="ti ti-info-circle"></i> ${escapeHtml(gl({es:'Por defecto, un año. Queda anotado en la contabilidad como dinero cobrado por adelantado.', ca:'Per defecte, un any. Queda anotat a la comptabilitat com a diners cobrats per avançat.', en:'One year by default. It is recorded in the accounts as money collected in advance.'}))}</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${escapeHtml(t('common.cancel'))}</button>
      <button class="btn btn-primary" onclick="issueGiftVoucher()"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.issueVoucher'))}</button>
    </div>
  `);
  renderGiftVoucherFormFields();
}
function valeAutoPara(){
  const id = parseInt(document.getElementById('voucher-cliente').value, 10);
  const c = id ? DB.clients.find(x => x.id === id) : null;
  const p = document.getElementById('voucher-para');
  if(c && p && !p.value.trim()) p.value = c.name;
}
function renderGiftVoucherFormFields(){
  const box = document.getElementById('voucher-form-fields');
  if(!box) return;
  const tipo = document.getElementById('voucher-tipo').value;
  box.innerHTML = tipo === 'experiencia'
    ? `<div class="field"><label for="voucher-descripcion">${escapeHtml(t('label.voucherDescription'))}</label><input type="text" id="voucher-descripcion" maxlength="120" placeholder="${escapeHtml(t('ph.voucherExperienceExample'))}"></div>
       <div class="field-row">
         <div class="field"><label for="voucher-importe">${escapeHtml(gl({es:'Precio cobrado (con IVA)', ca:'Preu cobrat (amb IVA)', en:'Price charged (incl. VAT)'}))}</label><input type="number" id="voucher-importe" min="0" step="0.01" placeholder="60"></div>
         <div class="field"><label for="voucher-iva">${escapeHtml(gl({es:'IVA', ca:'IVA', en:'VAT'}))}</label><select id="voucher-iva"><option value="10">10 %</option><option value="21">21 %</option><option value="4">4 %</option></select></div>
       </div>
       <p class="pr-ayuda">${escapeHtml(gl({es:'Es algo concreto: el IVA se declara al venderlo, no al canjearlo.', ca:'És una cosa concreta: l\'IVA es declara en vendre-ho, no en bescanviar-ho.', en:'It is something specific: VAT is declared when it is sold, not when it is redeemed.'}))}</p>`
    : `<div class="field"><label for="voucher-importe">${escapeHtml(t('label.voucherAmount'))}</label><input type="number" id="voucher-importe" min="0" step="0.01" placeholder="50"></div>
       <p class="pr-ayuda">${escapeHtml(gl({es:'Es dinero para gastar donde quieran: el IVA se paga cuando lo canjean (en la venta).', ca:'Són diners per gastar on vulguin: l\'IVA es paga quan el bescanvien (a la venda).', en:'It is money to spend on anything: VAT is paid when it is redeemed (on the sale).'}))}</p>`;
}
function issueGiftVoucher(){
  const tipo = document.getElementById('voucher-tipo').value;
  const clienteId = parseInt(document.getElementById('voucher-cliente').value, 10) || null;
  const cliente = clienteId ? DB.clients.find(c => c.id === clienteId) : null;
  const para = document.getElementById('voucher-para').value.trim() || (cliente ? cliente.name : '');
  const importe = parseFloat(document.getElementById('voucher-importe').value);
  let descripcion = '';
  if(tipo === 'experiencia'){
    descripcion = document.getElementById('voucher-descripcion').value.trim();
    if(!descripcion){ showToast(t('msg.voucherDescRequired')); return; }
  }
  if(!(importe > 0)){ showToast(t('msg.voucherAmountRequired')); return; }
  const sinVence = document.getElementById('voucher-sin-vence').checked;
  const venceEn = sinVence ? null : (document.getElementById('voucher-vence').value || null);
  if(venceEn && venceEn < todayStr()){ showToast(gl({es:'La fecha de caducidad no puede ser anterior a hoy.', ca:'La data de caducitat no pot ser anterior a avui.', en:'The expiry date cannot be before today.'})); return; }
  if(typeof GE !== 'undefined' && GE.isDateClosed && GE.isDateClosed(todayStr()) && tipo === 'experiencia'){ showToast(t('hr.te.monthClosedError')); return; }
  const v = {
    id: genId(), tipo, descripcion, importe: Math.round(importe * 100) / 100, clienteId, clienteNombre: para, paraNombre: para,
    code: valeCodigoUnico(), createdAt: new Date().toISOString(), venceEn, redeemed: false, redeemedAt: null, canjes: [], anulado: false,
    fiscal: tipo === 'experiencia' ? 'univalente' : 'polivalente', iva: tipo === 'experiencia' ? (parseFloat(document.getElementById('voucher-iva').value) || 10) : 0,
    emitidoPor: typeof currentActorName === 'function' ? currentActorName() : ''
  };
  valesLista().push(v);
  valeAsientoAlta(v);
  if(typeof logAudit === 'function') logAudit('create', gl({es:`Vale regalo ${v.code} por ${fmtMoney(v.importe)}`, ca:`Val regal ${v.code} per ${fmtMoney(v.importe)}`, en:`Gift voucher ${v.code} for ${fmtMoney(v.importe)}`}));
  saveDB();
  closeModal();
  showToast(t('msg.voucherIssued'));
  valeEmitidoModal(v.id);
  if(clientesPantalla === 'vales' || document.getElementById('clientes-content')) renderClientes();
}
// Tras emitirlo: imprimirlo o mandárselo, sin buscarlo en la lista.
function valeEmitidoModal(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  const cli = v.clienteId ? DB.clients.find(c => c.id === v.clienteId) : null;
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-circle-check" style="color:#33523A"></i> ${escapeHtml(gl({es:'Vale emitido', ca:'Val emès', en:'Voucher issued'}))}</h3><button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    <div class="cl-vale-grande"><span class="cl-mono">${escapeHtml(v.code)}</span><b>${v.tipo === 'experiencia' ? escapeHtml(v.descripcion) : fmtMoney(v.importe)}</b><small>${escapeHtml(gl({es:'Válido hasta: ', ca:'Vàlid fins: ', en:'Valid until: '}))}${escapeHtml(valeVence(v))}</small></div>
    <div class="pm-modal-bt">
      <button type="button" class="btn btn-fino is-on" onclick="printGiftVoucher(${v.id})"><i class="ti ti-printer"></i> ${escapeHtml(t('btn.printVoucher'))}</button>
      <button type="button" class="btn btn-fino" onclick="valeEnviar(${v.id}, 'wa')" ${cli && whatsappDeTelefono(cli.phone) ? '' : 'disabled'}><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
      <button type="button" class="btn btn-fino" onclick="valeEnviar(${v.id}, 'email')" ${cli && cli.email ? '' : 'disabled'}><i class="ti ti-mail"></i> Email</button>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${escapeHtml(t('common.close'))}</button></div>`);
}
function valeTexto(v){
  const biz = nvNegocio() || '';
  const que = v.tipo === 'experiencia' ? v.descripcion : fmtMoney(v.importe);
  return gl({
    es: `Hola${v.paraNombre ? ' ' + v.paraNombre.split(' ')[0] : ''}, este es tu vale regalo de ${biz}: ${que}.\nCódigo: ${v.code}\nVálido hasta: ${valeVence(v)}.\nEnséñanoslo al venir. ¡Te esperamos!`,
    ca: `Hola${v.paraNombre ? ' ' + v.paraNombre.split(' ')[0] : ''}, aquest és el teu val regal de ${biz}: ${que}.\nCodi: ${v.code}\nVàlid fins: ${valeVence(v)}.\nEnsenya'ns-el quan vinguis. T'esperem!`,
    en: `Hi${v.paraNombre ? ' ' + v.paraNombre.split(' ')[0] : ''}, here is your ${biz} gift voucher: ${que}.\nCode: ${v.code}\nValid until: ${valeVence(v)}.\nShow it when you visit. We look forward to seeing you!`
  });
}
function valeEnviar(id, canal){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  const cli = v.clienteId ? DB.clients.find(c => c.id === v.clienteId) : null;
  if(!cli) return;
  if(canal === 'wa'){
    const tel = whatsappDeTelefono(cli.phone);
    if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil.', ca:'Aquest telèfon no sembla un mòbil.', en:'This number does not look like a mobile.'})); return; }
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(valeTexto(v)), '_blank', 'noopener');
  } else if(cli.email){
    window.location.href = 'mailto:' + encodeURIComponent(cli.email) + '?subject=' + encodeURIComponent(gl({es:`Tu vale regalo de ${nvNegocio()}`, ca:`El teu val regal de ${nvNegocio()}`, en:`Your ${nvNegocio()} gift voucher`})) + '&body=' + encodeURIComponent(valeTexto(v));
  }
}

// ── Pantalla: historial de vales ─────────────────────────────────────────
function valesSetFiltro(f){ valesFiltro = f; renderValesPantalla(); }
function valesSetBusca(v){ valesBusca = v; renderValesPantalla(true); }
function valesFiltrosDef(){
  return [['todos', gl({es:'Todos', ca:'Tots', en:'All'})], ['pendiente', gl({es:'Pendientes', ca:'Pendents', en:'Pending'})], ['parcial', gl({es:'Canje parcial', ca:'Bescanvi parcial', en:'Partly redeemed'})], ['canjeado', gl({es:'Canjeados', ca:'Bescanviats', en:'Redeemed'})], ['caducado', gl({es:'Caducados', ca:'Caducats', en:'Expired'})], ['anulado', gl({es:'Anulados', ca:'Anul·lats', en:'Voided'})]];
}
function valeTarjetaHtml(v){
  const e = valeEstado(v), def = valeEstadoDef(e), saldo = valeSaldo(v);
  const dias = valeDiasParaVencer(v);
  const cli = v.clienteId ? DB.clients.find(c => c.id === v.clienteId) : null;
  const usable = e === 'pendiente' || e === 'parcial';
  const menu = ggMenuAcciones([
    {icono:'ti-printer', texto: t('btn.printVoucher'), fn:`printGiftVoucher(${v.id})`},
    cli && whatsappDeTelefono(cli.phone) ? {icono:'ti-brand-whatsapp', texto: gl({es:'Enviar por WhatsApp', ca:'Enviar per WhatsApp', en:'Send by WhatsApp'}), fn:`valeEnviar(${v.id}, 'wa')`} : null,
    cli && cli.email ? {icono:'ti-mail', texto: gl({es:'Enviar por email', ca:'Enviar per email', en:'Send by email'}), fn:`valeEnviar(${v.id}, 'email')`} : null,
    {icono:'ti-copy', texto: gl({es:'Copiar el código', ca:'Copiar el codi', en:'Copy the code'}), fn:`valeCopiar(${v.id})`},
    (usable || e === 'caducado') && v.venceEn ? {icono:'ti-calendar-plus', texto: gl({es:'Ampliar la caducidad', ca:'Ampliar la caducitat', en:'Extend expiry'}), fn:`valeAmpliar(${v.id})`, owner:true} : null,
    valeCanjes(v).length && !v.anulado ? {icono:'ti-arrow-back-up', texto: gl({es:'Deshacer el último canje', ca:'Desfer l\'últim bescanvi', en:'Undo the last redemption'}), fn:`valeDeshacerCanje(${v.id})`, owner:true} : null,
    !v.anulado && !valeCanjes(v).length ? {icono:'ti-circle-x', texto: gl({es:'Anular el vale', ca:'Anul·lar el val', en:'Void the voucher'}), fn:`valeAnular(${v.id})`, peligro:true, owner:true} : null,
    v.anulado ? {icono:'ti-trash', texto: t('common.delete'), fn:`deleteGiftVoucher(${v.id})`, peligro:true, owner:true} : null,
  ].filter(Boolean));
  return `<article class="cl-vale ${def.cls}">
    <div class="cl-vale-cab"><span class="cl-mono cl-vale-code">${escapeHtml(v.code)}</span><span class="pm-et cl-vale-et ${def.cls}">${escapeHtml(def.et)}</span>${menu}</div>
    <div class="cl-vale-que"><b>${v.tipo === 'experiencia' ? escapeHtml(v.descripcion) : fmtMoney(v.importe)}</b>
      ${v.tipo === 'importe' && (e === 'parcial') ? `<small>${escapeHtml(gl({es:'Quedan ', ca:'Queden ', en:'Left: '}))}<b>${fmtMoney(saldo)}</b></small>` : ''}
      ${v.tipo === 'experiencia' ? `<small>${fmtMoney(v.importe)} · ${escapeHtml(gl({es:'experiencia', ca:'experiència', en:'experience'}))}</small>` : ''}</div>
    <div class="cl-vale-datos">
      ${v.paraNombre || v.clienteNombre ? `<span><i class="ti ti-user"></i> ${escapeHtml(v.paraNombre || v.clienteNombre)}</span>` : ''}
      <span><i class="ti ti-calendar"></i> ${escapeHtml(gl({es:'Emitido ', ca:'Emès ', en:'Issued '}))}${escapeHtml((v.createdAt || '').slice(0, 10))}</span>
      <span class="${e === 'caducado' || (dias !== null && dias <= 30 && usable) ? 'cl-aviso-vence' : ''}"><i class="ti ti-hourglass"></i> ${escapeHtml(v.venceEn ? (e === 'caducado' ? gl({es:'Caducó el ', ca:'Va caducar el ', en:'Expired on '}) : gl({es:'Vence el ', ca:'Venç el ', en:'Expires on '})) + v.venceEn : valeVence(v))}${usable && dias !== null && dias <= 30 && dias >= 0 ? ` (${escapeHtml(gl({es:`en ${dias} días`, ca:`d'aquí ${dias} dies`, en:`in ${dias} days`}))})` : ''}</span>
      ${e === 'canjeado' ? `<span><i class="ti ti-check"></i> ${escapeHtml(gl({es:'Canjeado ', ca:'Bescanviat ', en:'Redeemed '}))}${escapeHtml((valeCanjes(v).slice(-1)[0] || {}).fecha || '')}</span>` : ''}
    </div>
    ${valeCanjes(v).length > 1 || (valeCanjes(v).length === 1 && e === 'parcial') ? `<ul class="cl-mini">${valeCanjes(v).map(k => `<li><i class="ti ti-receipt"></i> ${escapeHtml(k.fecha)} — ${fmtMoney(k.importe)}${k.nota ? ' · ' + escapeHtml(k.nota) : ''}</li>`).join('')}</ul>` : ''}
    ${usable ? `<div class="cl-card-pie"><button type="button" class="btn btn-sm btn-fino is-on owner-only" onclick="openCanjeVale(${v.id})"><i class="ti ti-circle-check"></i> ${escapeHtml(gl({es:'Canjear', ca:'Bescanviar', en:'Redeem'}))}</button></div>` : ''}
  </article>`;
}
function renderValesPantalla(conservarFoco){
  const box = document.getElementById('clientes-content');
  if(!box) return;
  const todas = valesLista().slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const q = pmSinTildes(valesBusca.trim());
  const defs = valesFiltrosDef();
  const cuenta = k => k === 'todos' ? todas.length : todas.filter(v => valeEstado(v) === k).length;
  const lista = todas.filter(v => (valesFiltro === 'todos' || valeEstado(v) === valesFiltro) && (!q || pmSinTildes(v.code).includes(q) || pmSinTildes(v.paraNombre || '').includes(q) || pmSinTildes(v.clienteNombre || '').includes(q) || pmSinTildes(v.descripcion || '').includes(q)));
  const vivos = todas.filter(v => ['pendiente', 'parcial'].includes(valeEstado(v)));
  const porPagar = vivos.reduce((s, v) => s + valeSaldo(v), 0);
  const emitidoAnio = todas.filter(v => !v.anulado && (v.createdAt || '').slice(0, 4) === todayStr().slice(0, 4)).reduce((s, v) => s + (parseFloat(v.importe) || 0), 0);
  const canjeadoAnio = todas.reduce((s, v) => s + valeCanjes(v).filter(k => (k.fecha || '').slice(0, 4) === todayStr().slice(0, 4)).reduce((a, k) => a + (parseFloat(k.importe) || 0), 0), 0);
  const porVencer = vivos.filter(v => { const d = valeDiasParaVencer(v); return d !== null && d <= 30; }).length;
  const sinConta = valesSinContabilidad().filter(v => v.tipo === 'importe' && v.importe > 0).length;
  const cuerpo = !todas.length
    ? `<div class="empty es-vacio"><i class="ti ti-gift-card"></i>${escapeHtml(t('empty.noVouchers'))}<div><button type="button" class="btn btn-fino is-on owner-only" onclick="openGiftVouchersModal()"><i class="ti ti-plus"></i> ${escapeHtml(t('btn.issueVoucher'))}</button></div></div>`
    : !lista.length ? `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`
    : `<div class="cl-grid cl-grid-vales">${lista.map(valeTarjetaHtml).join('')}</div>`;
  if(conservarFoco && document.getElementById('vales-zona')){
    document.getElementById('vales-zona').innerHTML = cuerpo;
    if(typeof ggAfinarBotones === 'function') ggAfinarBotones(document.getElementById('view-clientes'));
    return;
  }
  box.innerHTML = `
    <div class="toolbar pm-barra"><div class="left"><button type="button" class="btn btn-sm btn-fino" onclick="clVolver()"><i class="ti ti-arrow-left"></i> ${escapeHtml(gl({es:'Clientes', ca:'Clients', en:'Customers'}))}</button></div>
      <div class="pm-acciones"><button type="button" class="btn btn-fino is-on owner-only" onclick="openGiftVouchersModal()"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Emitir un vale', ca:'Emetre un val', en:'Issue a voucher'}))}</button></div></div>
    <h2 class="cl-tit-pantalla"><i class="ti ti-gift-card"></i> ${escapeHtml(gl({es:'Historial de vales regalo', ca:'Historial de vals regal', en:'Gift voucher history'}))}</h2>
    ${pmResumenHtml([
      {et: gl({es:'Por canjear', ca:'Per bescanviar', en:'To redeem'}), v: fmtMoney(porPagar), sub: escapeHtml(gl({es:`${vivos.length} vale(s) vivos`, ca:`${vivos.length} val(s) vius`, en:`${vivos.length} live voucher(s)`}))},
      {et: gl({es:'Emitido este año', ca:'Emès aquest any', en:'Issued this year'}), v: fmtMoney(emitidoAnio)},
      {et: gl({es:'Canjeado este año', ca:'Bescanviat aquest any', en:'Redeemed this year'}), v: fmtMoney(canjeadoAnio)},
      {et: gl({es:'Caducan en 30 días', ca:'Caduquen en 30 dies', en:'Expire in 30 days'}), v: porVencer, cls: porVencer ? 'is-bajo' : ''},
    ])}
    ${sinConta ? `<div class="pr-aviso is-rojo owner-only"><i class="ti ti-alert-triangle"></i><div class="pr-aviso-txt">${escapeHtml(gl({es:`${sinConta} vale(s) de antes no están anotados en la contabilidad (dinero cobrado por adelantado).`, ca:`${sinConta} val(s) d'abans no estan anotats a la comptabilitat (diners cobrats per avançat).`, en:`${sinConta} earlier voucher(s) are not in the accounts (money collected in advance).`}))}</div><div class="pr-aviso-bt"><button type="button" class="btn btn-sm btn-fino is-on" onclick="valesRegistrarAntiguos()">${escapeHtml(gl({es:'Anotarlos', ca:'Anotar-los', en:'Record them'}))}</button></div></div>` : ''}
    <div class="toolbar pm-barra"><div class="left"><input type="search" class="search-input st-buscar" id="vales-search" value="${escapeHtml(valesBusca)}" placeholder="${escapeHtml(gl({es:'Buscar por código o nombre…', ca:'Cercar per codi o nom…', en:'Search by code or name…'}))}" aria-label="${escapeHtml(gl({es:'Buscar vales', ca:'Cercar vals', en:'Search vouchers'}))}" oninput="valesSetBusca(this.value)"></div></div>
    <div class="cl-chips" role="group">${defs.map(([k, et]) => `<button type="button" class="btn btn-sm btn-fino${valesFiltro === k ? ' is-on' : ''}" aria-pressed="${valesFiltro === k}" onclick="valesSetFiltro('${k}')">${escapeHtml(et)} <b>${cuenta(k)}</b></button>`).join('')}</div>
    <div id="vales-zona">${cuerpo}</div>`;
}

// ── Canjear, ampliar, deshacer, anular ───────────────────────────────────
function openCanjeVale(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  const saldo = valeSaldo(v) || (parseFloat(v.importe) || 0);
  const exp = v.venceEn && v.venceEn < todayStr();
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-circle-check"></i> ${escapeHtml(gl({es:'Canjear el vale', ca:'Bescanviar el val', en:'Redeem the voucher'}))} <span class="cl-mono">${escapeHtml(v.code)}</span></h3><button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    ${exp ? `<div class="pr-aviso is-rojo"><i class="ti ti-alert-triangle"></i><div class="pr-aviso-txt">${escapeHtml(gl({es:'Este vale caducó el ', ca:'Aquest val va caducar el ', en:'This voucher expired on '}))}${escapeHtml(v.venceEn)}.</div></div>` : ''}
    <p class="pr-ayuda">${v.tipo === 'experiencia' ? escapeHtml(v.descripcion) : escapeHtml(gl({es:'Saldo disponible: ', ca:'Saldo disponible: ', en:'Available balance: '})) + '<b>' + fmtMoney(saldo) + '</b>'}</p>
    ${v.tipo === 'importe' ? `<div class="field"><label for="canje-importe">${escapeHtml(gl({es:'Importe que se canjea', ca:'Import que es bescanvia', en:'Amount redeemed'}))}</label><input type="number" id="canje-importe" min="0.01" max="${saldo}" step="0.01" value="${saldo}"></div>` : ''}
    <div class="field"><label for="canje-nota">${escapeHtml(gl({es:'Nota (opcional)', ca:'Nota (opcional)', en:'Note (optional)'}))}</label><input type="text" id="canje-nota" maxlength="80" placeholder="${escapeHtml(gl({es:'Mesa 4, cena del sábado…', ca:'Taula 4, sopar de dissabte…', en:'Table 4, Saturday dinner…'}))}"></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${escapeHtml(t('common.cancel'))}</button><button class="btn btn-primary" onclick="confirmarCanjeVale(${v.id})">${escapeHtml(gl({es:'Canjear', ca:'Bescanviar', en:'Redeem'}))}</button></div>`);
}
function confirmarCanjeVale(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  if(v.anulado || v.redeemed){ showToast(gl({es:'Este vale ya no se puede canjear.', ca:'Aquest val ja no es pot bescanviar.', en:'This voucher can no longer be redeemed.'})); return; }
  const saldo = valeSaldo(v) || (parseFloat(v.importe) || 0);
  let importe = saldo;
  if(v.tipo === 'importe'){
    importe = Math.round((parseFloat(document.getElementById('canje-importe').value) || 0) * 100) / 100;
    if(!(importe > 0)){ showToast(t('msg.enterAmount')); return; }
    if(importe > saldo + 0.005){ showToast(gl({es:`No puede superar el saldo (${fmtMoney(saldo)}).`, ca:`No pot superar el saldo (${fmtMoney(saldo)}).`, en:`It cannot exceed the balance (${fmtMoney(saldo)}).`})); return; }
  }
  if(!Array.isArray(v.canjes)) v.canjes = valeCanjes(v).slice();
  v.canjes.push({fecha: todayStr(), importe, nota: (document.getElementById('canje-nota').value || '').trim(), por: typeof currentActorName === 'function' ? currentActorName() : ''});
  const resto = Math.round((saldo - importe) * 100) / 100;
  v.redeemed = v.tipo === 'experiencia' || resto <= 0.005;
  v.redeemedAt = v.redeemed ? new Date().toISOString() : null;
  valeAsientoCanje(v);
  saveDB(); closeModal(); renderClientes();
  showToast(v.redeemed ? gl({es:'Vale canjeado del todo.', ca:'Val bescanviat del tot.', en:'Voucher fully redeemed.'}) : gl({es:`Canjeado. Quedan ${fmtMoney(resto)}.`, ca:`Bescanviat. Queden ${fmtMoney(resto)}.`, en:`Redeemed. ${fmtMoney(resto)} left.`}));
}
/* El vale como forma de pago en el TPV (8/11). El canje queda apuntado con la venta que lo gastó (`venta`), para poder devolverlo si esa
   venta se anula (`devolverValeDeVenta`): un vale gastado en una cuenta que luego se anula no puede quedarse «canjeado». */
function canjearValeEnCobro(valeId, importe, sale){
  const v = valesLista().find(x => x.id === valeId); if(!v || !(importe > 0)) return false;
  if(!Array.isArray(v.canjes)) v.canjes = valeCanjes(v).slice();
  const saldo = valeSaldo(v);
  v.canjes.push({fecha: todayStr(), importe, nota: gl({es:'Cobro en el TPV', ca:'Cobrament al TPV', en:'Paid at the POS'}), venta: sale && sale.id, por: typeof currentActorName === 'function' ? currentActorName() : ''});
  v.redeemed = Math.round((saldo - importe) * 100) / 100 <= 0.005;
  v.redeemedAt = v.redeemed ? new Date().toISOString() : null;
  valeAsientoCanje(v);
  return true;
}
function devolverValeDeVenta(sale){
  const v = valesLista().find(x => x.id === sale.valeId); if(!v || !Array.isArray(v.canjes)) return;
  const i = v.canjes.findIndex(k => k.venta === sale.id);
  if(i < 0) return;
  v.canjes.splice(i, 1); v.redeemed = false; v.redeemedAt = null;
  valeAsientoCanje(v);
}
function valeDeshacerCanje(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  if(!Array.isArray(v.canjes)) v.canjes = valeCanjes(v).slice();
  if(!v.canjes.length) return;
  v.canjes.pop(); v.redeemed = false; v.redeemedAt = null;
  valeAsientoCanje(v);
  saveDB(); renderClientes();
  showToast(gl({es:'Último canje deshecho.', ca:'Últim bescanvi desfet.', en:'Last redemption undone.'}));
}
function valeAmpliar(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  const d = new Date(); d.setMonth(d.getMonth() + 3);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-calendar-plus"></i> ${escapeHtml(gl({es:'Ampliar la caducidad', ca:'Ampliar la caducitat', en:'Extend the expiry'}))}</h3><button class="modal-close" onclick="closeModal()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    <p class="pr-ayuda">${escapeHtml(gl({es:'Ahora vence: ', ca:'Ara venç: ', en:'Currently expires: '}))}<b>${escapeHtml(valeVence(v))}</b></p>
    <div class="field"><label for="vale-nueva-vence">${escapeHtml(gl({es:'Nueva fecha', ca:'Nova data', en:'New date'}))}</label><input type="date" id="vale-nueva-vence" value="${dateStr(d)}" min="${todayStr()}"></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${escapeHtml(t('common.cancel'))}</button><button class="btn btn-primary" onclick="valeAmpliarOk(${v.id})">${escapeHtml(t('common.save'))}</button></div>`);
}
function valeAmpliarOk(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  const f = document.getElementById('vale-nueva-vence').value;
  if(!f || f < todayStr()){ showToast(gl({es:'Elige una fecha de hoy en adelante.', ca:'Tria una data d\'avui endavant.', en:'Pick a date from today onwards.'})); return; }
  v.venceEn = f;
  const a = valeAsiento(v); if(a) a.venceEn = f;
  saveDB(); closeModal(); renderClientes();
}
async function valeAnular(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  if(valeCanjes(v).length){ showToast(gl({es:'Un vale con canjes no se puede anular.', ca:'Un val amb bescanvis no es pot anul·lar.', en:'A voucher with redemptions cannot be voided.'})); return; }
  if(valeMesCerrado(v)){ showToast(gl({es:'El mes en que se emitió ya está cerrado: consúltalo con tu gestor.', ca:'El mes en què es va emetre ja està tancat: consulta-ho amb el teu gestor.', en:'The month it was issued in is already closed: ask your accountant.'})); return; }
  if(!(await confirmModal(gl({es:`¿Anular el vale ${v.code}? Dejará de valer y se quita de la contabilidad.`, ca:`Anul·lar el val ${v.code}? Deixarà de valer i s'esborra de la comptabilitat.`, en:`Void voucher ${v.code}? It stops being valid and is removed from the accounts.`})))) return;
  v.anulado = true; v.anuladoEn = new Date().toISOString();
  valeAsientoQuitar(v);
  if(typeof logAudit === 'function') logAudit('delete', gl({es:`Vale regalo ${v.code} anulado`, ca:`Val regal ${v.code} anul·lat`, en:`Gift voucher ${v.code} voided`}));
  saveDB(); renderClientes();
}
function valeCopiar(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  copiarTextoPlano(v.code).then(ok => showToast(ok ? gl({es:'Código copiado', ca:'Codi copiat', en:'Code copied'}) : gl({es:'No se pudo copiar', ca:'No s\'ha pogut copiar', en:'Could not copy'})));
}
// Solo se borra del todo un vale ya anulado (un error de tecleo); uno válido o canjeado se conserva.
async function deleteGiftVoucher(id){
  const v = valesLista().find(x => x.id === id); if(!v) return;
  if(!v.anulado){ showToast(gl({es:'Anúlalo primero: un vale emitido no se borra.', ca:'Anul·la\'l primer: un val emès no s\'esborra.', en:'Void it first: an issued voucher is not deleted.'})); return; }
  if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
  DB.giftVouchers = valesLista().filter(x => x.id !== id);
  saveDB(); renderClientes();
}
