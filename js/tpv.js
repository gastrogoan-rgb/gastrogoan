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

const KITCHEN_STATES = {
  cocina:     {labelKey:'kitchen.waiting',    icon:'ti-clock',        cls:'badge-amber'},
  preparando: {labelKey:'kitchen.preparing',  icon:'ti-flame',        cls:'badge-blue'},
  entregado:  {labelKey:'kitchen.delivered',  icon:'ti-circle-check', cls:'badge-green'}
};
function kitchenStatusBadge(line){
  const st = KITCHEN_STATES[line.estado];
  if(!st || line.estado === 'entregado') return '';
  return ` <span class="badge ${st.cls}"><i class="ti ${st.icon}"></i> ${t(st.labelKey)}</span>`;
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

function setCartaAuto(checked){
  DB.business.cartaAuto = checked;
  saveDB();
  if(checked){ updateAutoActiveCarta(true); updateAutoActiveMenu(true); }
  else renderTPV();
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
  if(!DB.business || DB.business.cartaAuto === false) return;
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
const PAYMENT_METHODS = ['Efectivo','Tarjeta','Otro'];
// El método de pago se guarda siempre en español (valor interno/histórico);
// esto solo traduce la etiqueta que se le muestra al usuario.
const PAYMENT_METHOD_LABEL_KEYS = {'Efectivo':'pay.cash','Tarjeta':'pay.card','Otro':'pago.otro','Mixto':'pay.mixed'};
function paymentMethodTpvLabel(value){
  return PAYMENT_METHOD_LABEL_KEYS[value] ? t(PAYMENT_METHOD_LABEL_KEYS[value]) : (value||'');
}
let paymentTab = 'full'; // 'full' | 'equal' | 'items' — pestaña activa del modal de cobro
let tpvMenuOrderId = null; // id de la comanda cuyo menú por carpetas está abierto
let tpvMenuFolder = null; // {cartaId, secId} | null — carpeta de carta abierta actualmente
let tpvSelectedCartaId = null; // id de la carta/menú seleccionada en las pestañas de la comanda

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
  '🥩','🍗','🍖','🥓','🌭','🍤',
  // Pescados y marisco
  '🐟','🐠','🐡','🦐','🦀','🦞','🐙','🦑','🍣',
  // Verduras y hortalizas
  '🥬','🥦','🥒','🌽','🥕','🍅','🍆','🧄','🧅','🥔','🫑','🌶️','🍄',
  // Frutas
  '🍎','🍌','🍇','🍓','🍉','🍊','🍋','🍑','🍒','🍍','🥝','🥭','🍐',
  // Lácteos y huevos
  '🥛','🧀','🧈','🥚',
  // Pan, cereales y pasta
  '🍞','🥐','🥖','🥨','🥯','🌾','🍚','🍝','🍜',
  // Especias, condimentos y conservas
  '🧂','🌿','🍯','🫒','🥫',
  // Postres y dulces
  '🍰','🎂','🧁','🍪','🍩','🍫','🍬','🍮',
  // Bebidas sin alcohol
  '🥤','☕','🍵','🧃','🧋',
  // Bebidas con alcohol
  '🍷','🍺','🍻','🥂','🍸','🍹','🥃','🍾',
  // Platos preparados
  '🍕','🍔','🌮','🌯','🥙','🍟','🥪','🍳','🥘','🍲','🥟','🍛','🍱',
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
  const cartaAuto = DB.business.cartaAuto !== false;
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
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="tpv-carta-auto" ${cartaAuto?'checked':''} onchange="setCartaAuto(this.checked)">
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
  const cartaAuto = DB.business.cartaAuto !== false;
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
      <div class="kpi ok"><div class="label">${t('label.salesToday')}</div><div class="value">${fmtMoney(todayTotal)}</div></div>
      <div class="kpi"><div class="label">${t('label.ticketsToday')}</div><div class="value">${ticketCount}</div></div>
      <div class="kpi"><div class="label">${t('label.avgTicket')}</div><div class="value">${fmtMoney(avgTicket)}</div></div>
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
// un vistazo quién atiende cada mesa sin tener que entrar en ella.
function mesaWaiterChipHtml(camareroId){
  if(!camareroId) return '';
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
  const foodItems = (order.items||[]).filter(l => !l.bebida && l.estado);
  const allDelivered = foodItems.length > 0 && foodItems.every(l => l.estado === 'entregado');
  if(allDelivered) return {key:'served', icon:'✅', label: t('status.served')};
  const preparing = foodItems.some(l => l.estado === 'preparando');
  if(preparing) return {key:'preparing', icon:'🔥', label: t('status.inKitchen')};
  const inKitchen = foodItems.some(l => l.estado === 'cocina');
  if(inKitchen) return {key:'kitchen', icon:'⏳', label: t('status.sentToKitchen')};
  const pending = (order.items||[]).some(l => !l.bebida && l.qty > (l.marchada||0));
  if(pending) return {key:'taking', icon:'📝', label: t('status.takingOrder')};
  return null;
}

function renderMesaCard(table){
  const order = getOpenOrderForTable(table.id);
  const total = order ? orderTotal(order) : 0;
  const hayNuevos = order && (order.items||[]).some(l => l.nuevo);
  const displayName = table.zona ? (table.name||'').replace(/\s*\([^)]*\)\s*$/, '') : table.name;

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
  const waiterChip = order ? mesaWaiterChipHtml(order.camareroId) : '';
  const upcomingRes = !order ? getUpcomingReservationForTable(table.id) : null;

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
          ${phase ? `<div class="mesa-phase-row"><span>${phase.icon}</span> <span class="mesa-phase-label">${escapeHtml(phase.label)}</span></div>` : ''}
          <div class="mesa-total">${fmtMoney(total)}</div>
          <div class="mesa-meta-row">
            ${order.pax ? `<span class="mesa-pax"><i class="ti ti-users"></i> ${order.pax}</span>` : ''}
            ${waiterChip}
          </div>
        `
        : `<div class="mesa-status-free"><i class="ti ti-door-enter"></i> ${t('status.free')}</div>
           ${upcomingRes ? `<div class="mesa-reservation-hint" title="${escapeHtml(upcomingRes.clientName||'')}"><i class="ti ti-calendar-event"></i> ${t('label.reservedAt').replace('${time}', escapeHtml(upcomingRes.time))} · ${upcomingRes.people} <i class="ti ti-users"></i></div>` : ''}`}
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
  // delivery dado de alta, separado con su propio panel de las mesas del
  // local — no solo cuando hay algún pedido abierto — para que sea un sitio
  // fijo y predecible donde mirar, no algo que aparece y desaparece.
  if(tiposServicio.takeaway === false && tiposServicio.delivery === false) return '';
  const toGoOrders = DB.tpvOrders.filter(o => o.status !== 'pagada' && o.status !== 'pendiente-online' && (o.tipo==='takeaway'||o.tipo==='delivery') && isTogoOrderVisibleNow(o));
  // Los pedidos sin hora programada (ASAP) van primero; el resto, por hora
  // programada ascendente, para que el personal vea antes lo más urgente.
  toGoOrders.sort((a,b) => {
    const ma = a.time ? (reservaTimeToMinutes(a.time) ?? 9999) : -1;
    const mb = b.time ? (reservaTimeToMinutes(b.time) ?? 9999) : -1;
    return ma - mb;
  });
  return `
    <div class="togo-panel">
      <div class="togo-panel-head">
        <h3><i class="ti ti-shopping-bag"></i> ${t('title.togoDelivery')}</h3>
        <button class="btn btn-sm btn-primary" onclick="openNewToGoOrderModal()"><i class="ti ti-plus"></i> ${t('btn.expressOrder')}</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:0 0 10px">${t('tpv.onlineOrdersAutoArrive')}</p>
      ${!toGoOrders.length
        ? `<div class="empty" style="padding:18px"><i class="ti ti-moped"></i>${t('empty.noTogoOrders')}</div>`
        : `<div class="grid grid-4">${toGoOrders.map(o => {
            const plat = o.tipo==='delivery' && o.plataformaId ? (DB.business.deliveryPlatforms||[]).find(p=>p.id===o.plataformaId) : null;
            const dueMins = o.time ? minutesUntilScheduled(o.time) : null;
            const urgent = dueMins !== null && dueMins <= 30;
            const isDelivery = o.tipo==='delivery';
            // Sin chip de camarero aquí: estos pedidos entran por teléfono o
            // por la web, no los toma nadie de sala en persona.
            const repartidorChip = isDelivery ? mesaRepartidorChipHtml(o.repartidorId, o.repartidorCourierId) : '';
            return `
            <div class="card togo-card ${isDelivery?'togo-card-delivery':'togo-card-pickup'}${urgent?' togo-card-urgent':''}" style="text-align:center;cursor:pointer" onclick="openTableOrder(null, ${o.id})">
              <h3 style="justify-content:center"><i class="ti ${isDelivery?'ti-moped':'ti-shopping-bag'}"></i> ${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</h3>
              <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
                <span class="badge ${isDelivery?'badge-blue':'badge-amber'}"><i class="ti ${isDelivery?'ti-moped':'ti-walk'}"></i> ${isDelivery?t('label.deliveryShort'):t('label.pickupOrder')}</span>
                ${o.pagado ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}</span>` : ''}
                ${urgent ? `<span class="badge badge-red"><i class="ti ti-alarm"></i> ${t('label.dueSoon')}</span>` : ''}
              </div>
              ${o.time ? `<div style="margin-top:6px"><span class="badge"><i class="ti ti-clock"></i> ${t('label.scheduledFor')} ${escapeHtml(o.time)}</span></div>` : ''}
              ${isDelivery ? `<div style="margin-top:6px"><span class="badge">${plat ? escapeHtml(plat.nombre) : t('label.directOrder')}</span></div>` : ''}
              ${o.clienteAddress ? `<div style="margin-top:6px;font-size:11px;color:var(--muted)"><i class="ti ti-map-pin"></i> ${escapeHtml(o.clienteAddress)}</div>` : ''}
              <div style="margin-top:8px;font-weight:800;font-size:19px;color:var(--brand-orange)">${fmtMoney(orderTotal(o))}</div>
              ${repartidorChip ? `<div style="margin-top:4px">${repartidorChip}</div>` : ''}
            </div>
          `}).join('')}</div>`}
    </div>
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

function renderTpvPendingOnline(){
  const pendingOnline = DB.tpvOrders.filter(o => o.status === 'pendiente-online' && isTogoOrderVisibleNow(o));
  if(!pendingOnline.length) return '';
  return `
    <h3 style="margin-top:16px"><i class="ti ti-bell-ringing"></i> Pedidos online pendientes</h3>
    <div class="grid grid-4">
      ${pendingOnline.map(o => `
        <div class="card" style="border:2px solid var(--brand-orange)">
          <h3 style="justify-content:space-between;font-size:14px">
            <span><i class="ti ${o.tipo==='delivery'?'ti-moped':'ti-shopping-bag'}"></i> ${escapeHtml(o.clienteNombre || togoOrderLabel(o))}</span>
            <span class="badge badge-amber">${t('badge.newF')}</span>
          </h3>
          ${o.pendienteVerificarZona ? `<div style="font-size:12px;color:var(--brand-orange);margin:2px 0"><i class="ti ti-alert-triangle"></i> ${t('label.zoneNotVerified')}</div>` : ''}
          ${o.pagado ? `<span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}</span>` : ''}
          ${o.clienteTelefono ? `<div style="font-size:12px;color:var(--muted)"><i class="ti ti-phone"></i> ${escapeHtml(o.clienteTelefono)}</div>` : ''}
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
  applyTpvTextSize();
  const box = document.getElementById('tpv-content');
  const tiposServicio = (DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true};

  box.innerHTML = `
    ${renderTpvCartaSelector()}
    ${renderTpvMenuSelector()}
    ${renderTpvKpis()}
    ${renderLastCallBanner()}
    <div class="toolbar">
      <div class="left"></div>
      <button class="btn ${chaosMode?'btn-danger':''}" onclick="toggleChaosMode()" title="${t('tpv.chaos.hint')}"><i class="ti ti-flame"></i> ${t('tpv.chaos.btn')}</button>
      <button class="btn ${planoMode?'btn-primary':''}" onclick="togglePlanoMode()" title="${t('tpv.plano.hint')}"><i class="ti ti-layout-2"></i> ${t('tpv.plano.btn')}</button>
      <button class="btn" onclick="setTpvTextSize()" title="${t('tpv.textSize.hint')}"><i class="ti ti-text-size"></i></button>
      <button class="btn" onclick="openTodaySalesModal()"><i class="ti ti-receipt"></i> ${t('title.todaySales')}</button>
      <button class="btn" onclick="openVoidLogModal()"><i class="ti ti-alert-triangle"></i> ${t('title.voidLog')}</button>
      <button class="btn" onclick="openCashClosureHistory()"><i class="ti ti-history"></i> ${t('title.cashHistory')}</button>
      <button class="btn" onclick="openCashClosureModal()"><i class="ti ti-cash-register"></i> ${t('btn.cashClose')}</button>
      ${(tiposServicio.takeaway !== false || tiposServicio.delivery !== false) ? `<button class="btn btn-primary" onclick="openNewToGoOrderModal()"><i class="ti ti-bolt"></i> ${t('btn.expressOrder')}</button>` : ''}
    </div>
    ${renderTpvPendingOnline()}
    ${renderTpvToGo(tiposServicio)}
    ${chaosMode ? renderChaosModeMesas() : planoMode ? renderTpvMesasPlano() : renderTpvMesas(tiposServicio)}
  `;
  if(planoMode) attachPlanoDragHandlers();
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

// Plano visual de sala: en vez de la lista/rejilla de mesas, un "mapa" con
// cada mesa colocada donde de verdad está en el local (arrastrando su
// tarjeta), para reconocer la sala de un vistazo en vez de leer nombres.
// La posición (table.x/table.y, en píxeles dentro del plano) se guarda por
// mesa; si una mesa nunca se ha colocado, aparece en una rejilla por
// defecto hasta que alguien la arrastre a su sitio real.
let planoMode = false;
function togglePlanoMode(){
  planoMode = !planoMode;
  if(planoMode) chaosMode = false;
  renderTPV();
}
const PLANO_CARD_W = 118, PLANO_CARD_H = 100, PLANO_GAP = 14;
function renderTpvMesasPlano(){
  const tables = [...DB.tables].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es', {numeric:true}));
  if(!tables.length){
    return `<h3 style="margin-top:16px"><i class="ti ti-layout-2"></i> ${t('tpv.plano.title')}</h3><div class="empty">${t('empty.tables')}</div>`;
  }
  const cols = Math.max(3, Math.floor((document.getElementById('tpv-content')?.clientWidth || 900) / (PLANO_CARD_W+PLANO_GAP)));
  let maxBottom = 0;
  const cardsHtml = tables.map((table, i) => {
    const hasPos = table.x!=null && table.y!=null;
    const x = hasPos ? table.x : (i % cols) * (PLANO_CARD_W+PLANO_GAP);
    const y = hasPos ? table.y : Math.floor(i / cols) * (PLANO_CARD_H+PLANO_GAP);
    maxBottom = Math.max(maxBottom, y + PLANO_CARD_H);
    return `<div class="plano-mesa-wrap" data-table-id="${table.id}" style="position:absolute;left:${x}px;top:${y}px;width:${PLANO_CARD_W}px;cursor:${(typeof editUnlocked!=='undefined'&&editUnlocked)?'grab':'pointer'}">${renderMesaCard(table)}</div>`;
  }).join('');
  const canDrag = typeof editUnlocked !== 'undefined' && editUnlocked;
  return `
    <h3 style="margin-top:16px"><i class="ti ti-layout-2"></i> ${t('tpv.plano.title')}</h3>
    ${canDrag ? `<p style="font-size:12px;color:var(--muted);margin-bottom:6px"><i class="ti ti-hand-move"></i> ${t('tpv.plano.dragHint')}</p>` : ''}
    <div id="plano-floor" style="position:relative;min-height:${maxBottom+PLANO_GAP}px;background:var(--brand-cream);border:1px dashed var(--border);border-radius:10px;overflow:auto;padding:10px">
      ${cardsHtml}
    </div>
  `;
}
// Arrastre simple con eventos de puntero: solo activo en modo edición
// (propietario, o empleado con permiso), para que el personal normal no
// pueda desordenar el plano sin querer mientras cobra.
function attachPlanoDragHandlers(){
  const floor = document.getElementById('plano-floor');
  if(!floor) return;
  if(!(typeof editUnlocked !== 'undefined' && editUnlocked)) return;
  let dragEl = null, startX = 0, startY = 0, origX = 0, origY = 0, moved = false;
  floor.querySelectorAll('.plano-mesa-wrap').forEach(wrap => {
    // Si el puntero se movió de verdad (arrastre), se cancela el clic que
    // el navegador dispara justo después de soltar, para no abrir la mesa
    // sin querer al terminar de colocarla.
    wrap.addEventListener('click', ev => {
      if(wrap.dataset.justDragged === '1'){
        wrap.dataset.justDragged = '';
        ev.stopPropagation();
        ev.preventDefault();
      }
    }, true);
    wrap.addEventListener('pointerdown', ev => {
      dragEl = wrap;
      moved = false;
      startX = ev.clientX; startY = ev.clientY;
      origX = parseInt(wrap.style.left); origY = parseInt(wrap.style.top);
      wrap.setPointerCapture(ev.pointerId);
      wrap.style.zIndex = 10;
    });
    wrap.addEventListener('pointermove', ev => {
      if(dragEl !== wrap) return;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if(Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if(!moved) return;
      wrap.style.left = Math.max(0, origX + dx) + 'px';
      wrap.style.top = Math.max(0, origY + dy) + 'px';
    });
    const finish = () => {
      if(dragEl !== wrap) return;
      dragEl = null;
      wrap.style.zIndex = '';
      if(moved){
        wrap.dataset.justDragged = '1';
        const tableId = parseInt(wrap.dataset.tableId);
        const table = DB.tables.find(t2 => t2.id === tableId);
        if(table){
          table.x = parseInt(wrap.style.left);
          table.y = parseInt(wrap.style.top);
          saveDB();
        }
      }
    };
    wrap.addEventListener('pointerup', finish);
    wrap.addEventListener('pointercancel', finish);
  });
}

// Tamaño de letra del TPV, para quien tenga la vista cansada al final de un
// turno largo o simplemente prefiera verlo más grande en una tablet.
function setTpvTextSize(){
  const sizes = ['normal','grande','extra'];
  const current = localStorage.getItem('tpvTextSize') || 'normal';
  const next = sizes[(sizes.indexOf(current)+1) % sizes.length];
  localStorage.setItem('tpvTextSize', next);
  applyTpvTextSize();
  showToast(t('tpv.textSize.now').replace('${size}', t('tpv.textSize.'+next)));
}
function applyTpvTextSize(){
  const el = document.getElementById('view-tpv');
  if(!el) return;
  el.classList.remove('tpv-text-normal','tpv-text-grande','tpv-text-extra');
  el.classList.add('tpv-text-' + (localStorage.getItem('tpvTextSize') || 'normal'));
}

// "Última llamada de cocina": si queda poco para la hora de cierre de hoy
// (según el horario configurado en Mi Negocio), avisa arriba del todo para
// no tomar comandas que luego no da tiempo a servir con calma.
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

function acceptOnlineOrder(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  order.status = 'abierta';
  if(order.tipo === 'takeaway' || order.tipo === 'delivery'){
    const ahora = new Date().toISOString();
    let anyMismatch = false;
    (order.items||[]).forEach(l => {
      // Comprobación (no bloqueante) de precio/disponibilidad frente a la
      // carta activa actual: se marca la línea con un aviso visual, pero el
      // pedido se acepta igualmente para que el personal decida si ajusta.
      const dish = findActiveDishByName(l.name);
      l.priceMismatch = false;
      l.unavailableNow = false;
      if(!dish){
        l.unavailableNow = true;
        anyMismatch = true;
      }else{
        if(dish.disponible === false){ l.unavailableNow = true; anyMismatch = true; }
        if(typeof dish.precio === 'number' && Math.abs(dish.precio - l.price) > 0.001){ l.priceMismatch = true; anyMismatch = true; }
      }
      if(!l.estado){
        l.estado = 'cocina';
        l.enviadoAt = ahora;
        l.marchada = l.qty;
      }
    });
    order.cerrada = false;
    saveDB();
    renderTPV();
    showToast(anyMismatch ? t('msg.orderAcceptedWithMismatch') : t('msg.orderAccepted'));
    return;
  }
  saveDB();
  renderTPV();
  showToast(t('msg.orderAccepted'));
}

function rejectOnlineOrder(orderId){
  requestBusinessPinAction(t('title.rejectOrder'), t('msg.confirmRejectOrder'), () => {
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== orderId);
    saveDB();
    renderTPV();
    showToast(t('msg.orderRejected'));
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
  const match = bp.startsWith('H:') ? hashPin(val) === bp : val === bp;
  if(!match){ showToast(t('msg.pinIncorrect')); return; }
  const fn = businessPinPendingAction;
  businessPinPendingAction = null;
  closeModal();
  if(fn) fn();
}

// Ventas cerradas atendidas por un camarero/a en un conjunto de fechas
// (para Personal → Fichar), a partir del camareroId guardado en cada venta.
function camareroSalesInRange(empId, dateStrs){
  const dateSet = new Set(dateStrs);
  const sales = DB.sales.filter(s => s.camareroId === empId && dateSet.has(s.date));
  return {count: sales.length, total: sales.reduce((sum,s) => sum + (s.total||0), 0)};
}

// Selector de camarero/a que toma la comanda, para saber quién atiende cada mesa.
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

// Coste real de ingredientes de todo lo vendido en un pedido/venta, a
// partir del escandallo de cada receta — para saber el margen real de esa
// mesa concreta, no solo lo cobrado. Solo cuenta líneas con receta
// vinculada; lo que no tiene receta (p.ej. un extra manual) no suma coste.
function orderFoodCost(order){
  return (order.items||[]).reduce((sum, line) => {
    const recetas = [];
    if(line.recipeId) recetas.push(line.recipeId);
    else if(Array.isArray(line.menuSelections)) line.menuSelections.forEach(sel => { if(sel.recipeId) recetas.push(sel.recipeId); });
    const costePorUnidad = recetas.reduce((s,rid) => { const r = getRecipe(rid); return s + (r ? recipeCost(r) : 0); }, 0);
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
  return DB.reservations.filter(r => r.date === today && r.status === 'confirmada' && !r.llegada)
    .sort((a,b)=>(a.time||'').localeCompare(b.time||''));
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
      <input type="number" id="new-order-pax" min="1" value="2">
    </div>
    ${renderCamareroFieldHtml('new-order-camarero-sel')}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmOpenTableOrder(${tableId})">${t('title.openTable')}</button>
    </div>
  `);
}

function toggleNewOrderReservaField(){
  const isReserva = document.querySelector('input[name="new-order-tipo-cliente"]:checked').value === 'reserva';
  document.getElementById('new-order-reserva-field').style.display = isReserva ? '' : 'none';
  document.getElementById('new-order-pax-field').style.display = isReserva ? 'none' : '';
}

function confirmOpenTableOrder(tableId){
  const tipo = document.querySelector('input[name="new-order-tipo-cliente"]:checked')?.value || 'paso';
  let pax, clienteNombre = '', clientId = null, reservationId = null;
  if(tipo === 'reserva'){
    const resId = parseInt(document.getElementById('new-order-reserva-sel').value);
    const r = DB.reservations.find(x=>x.id===resId);
    if(!r){ showToast(t('msg.selectReservation')); return; }
    pax = r.people;
    clientId = r.clientId;
    const client = DB.clients.find(c=>c.id===r.clientId);
    clienteNombre = client ? client.name : (r.clientName||'');
    reservationId = r.id;
    // Marca la llegada y, sobre todo, actualiza la mesa de la reserva a la
    // mesa REAL donde se sienta (no solo si estaba sin asignar): si la sala
    // se reorganiza sobre la marcha, la reserva no debe quedar "atada" a una
    // mesa distinta a la que de verdad se está usando.
    setReservationArrival(r.id, true, tableId);
  }else{
    pax = parseInt(document.getElementById('new-order-pax').value) || 0;
    if(pax <= 0){ showToast(t('msg.indicatePax')); return; }
  }
  const camareroSel = document.getElementById('new-order-camarero-sel');
  const camareroId = camareroSel && camareroSel.value ? parseInt(camareroSel.value) : null;

  const order = {id: genId(), tableId, tipo:'mesa', pax, clienteNombre, clientId, reservationId, camareroId, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString()};
  DB.tpvOrders.push(order);
  saveDB();
  renderTableOrderModal(order.id);
}

// Pedido Express: la única forma de crear a mano un pedido que no es de
// mesa (llamadas por teléfono, avisos en barra...). Un mismo modal cubre
// los dos casos (para recoger / a domicilio) y solo pide los datos que
// corresponden a cada uno, en vez de tener un botón y un modal distintos
// por cada tipo. Los platos de estos pedidos pasan a cocina automáticamente
// al añadirlos, sin necesidad de "Marchar" (ver autoSendTakeawayLine).
let toGoOrderTypeSelected = 'pickup';
function openNewToGoOrderModal(){
  const tiposServicio = (DB.business && DB.business.tiposServicio) || {};
  const canPickup = tiposServicio.takeaway !== false;
  const canDelivery = tiposServicio.delivery !== false;
  toGoOrderTypeSelected = canPickup ? 'pickup' : 'delivery';
  const platforms = (DB.business?.deliveryPlatforms||[]);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-bolt"></i> ${t('title.expressOrder')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${(canPickup && canDelivery) ? `
    <div class="field">
      <label>${t('label.orderType')}</label>
      <div style="display:flex;gap:8px">
        <button type="button" class="btn btn-primary" style="flex:1" id="togo-type-pickup" onclick="setToGoOrderType('pickup')"><i class="ti ti-shopping-bag"></i> ${t('label.pickupOrder')}</button>
        <button type="button" class="btn" style="flex:1" id="togo-type-delivery" onclick="setToGoOrderType('delivery')"><i class="ti ti-moped"></i> ${t('label.homeDelivery')}</button>
      </div>
    </div>
    ` : ''}
    <div class="field">
      <label>${t('label.clientNameOpt')}</label>
      <input type="text" id="togo-cliente-nombre" placeholder="${t('common.name')}">
    </div>
    <div class="field">
      <label>${t('label.phoneOpt')}</label>
      <input type="text" id="togo-cliente-phone" placeholder="${t('common.phone')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.date')}</label>
        <input type="date" id="togo-cliente-date" value="${todayStr()}">
      </div>
      <div class="field">
        <label>${t('label.pickupDeliveryTime')}</label>
        <input type="time" id="togo-cliente-time">
      </div>
    </div>
    <div id="togo-delivery-fields" style="display:${canDelivery && toGoOrderTypeSelected==='delivery' ? '' : 'none'}">
      <div class="field">
        <label>${t('label.deliveryAddress')}</label>
        <input type="text" id="togo-cliente-address" placeholder="${t('mn.business.addressPh')}" oninput="checkNewDeliveryZoneHint()">
        <small id="togo-del-zone-hint" style="color:var(--brand-orange);display:none"><i class="ti ti-alert-triangle"></i> ${t('msg.postalCodeOutsideZone')}</small>
      </div>
      <div class="field">
        <label>${t('label.platformOpt')}</label>
        <select id="togo-plataforma">
          <option value="">${t('label.directOrder')}</option>
          ${platforms.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')}
        </select>
      </div>
      ${renderRepartidorFieldHtml('togo-repartidor-sel')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmNewToGoOrder()"><i class="ti ti-check"></i> ${t('btn.createOrder')}</button>
    </div>
  `);
}
function setToGoOrderType(type){
  toGoOrderTypeSelected = type;
  const pickupBtn = document.getElementById('togo-type-pickup');
  const deliveryBtn = document.getElementById('togo-type-delivery');
  if(pickupBtn) pickupBtn.classList.toggle('btn-primary', type==='pickup');
  if(deliveryBtn) deliveryBtn.classList.toggle('btn-primary', type==='delivery');
  const fields = document.getElementById('togo-delivery-fields');
  if(fields) fields.style.display = type==='delivery' ? '' : 'none';
}

// Aviso simple e informativo (no bloqueante) si en la dirección escrita se
// detecta un código postal que no está en la lista configurada para reparto.
// No hace geolocalización ni comprueba el radio (eso solo lo hace la web
// pública), es solo una pista rápida para el personal al crear el pedido a mano.
function checkNewDeliveryZoneHint(){
  const input = document.getElementById('togo-cliente-address');
  const hint = document.getElementById('togo-del-zone-hint');
  if(!input || !hint) return;
  const cpList = (DB.business?.pedidos?.cpList) || [];
  const match = input.value.match(/\b\d{5}\b/);
  const show = !!(cpList.length && match && !cpList.includes(match[0]));
  hint.style.display = show ? '' : 'none';
}

function confirmNewToGoOrder(){
  const clienteNombre = document.getElementById('togo-cliente-nombre').value.trim();
  const clientePhone = document.getElementById('togo-cliente-phone').value.trim();
  // Si el teléfono coincide con un cliente ya dado de alta, se vincula el
  // pedido a su ficha — igual que ya pasa con mesas y reservas — para que
  // sume puntos de fidelidad, aparezca en su historial, y el personal pueda
  // ver sus alergias/notas. Antes esto solo pasaba si venía de una reserva.
  // Si no hay teléfono o no coincide, se prueba también por nombre exacto
  // (sin tildes/mayúsculas) para no crear una ficha duplicada de alguien que
  // ya está dado de alta pero llamó sin dar el mismo teléfono registrado.
  let matchedClient = clientePhone ? findClientByPhone(clientePhone) : null;
  if(!matchedClient && clienteNombre){
    const norm = stripAccents(clienteNombre.toLowerCase());
    matchedClient = DB.clients.find(c => stripAccents((c.name||'').trim().toLowerCase()) === norm) || null;
  }
  const clientId = matchedClient ? matchedClient.id : null;
  // Fecha/hora de recogida o entrega: por defecto es hoy sin hora concreta
  // (se entiende "cuanto antes"), pero si se programa para otro día, el
  // pedido no debe aparecer en el TPV hasta que llegue esa fecha (ver el
  // filtro `!o.date || o.date <= todayStr()` en renderTpvToGo).
  const dateEl = document.getElementById('togo-cliente-date');
  const timeEl = document.getElementById('togo-cliente-time');
  const date = dateEl && dateEl.value ? dateEl.value : todayStr();
  const time = timeEl && timeEl.value ? timeEl.value : null;
  const isDelivery = toGoOrderTypeSelected === 'delivery';
  const order = {id: genId(), tableId: null, tipo: isDelivery ? 'delivery' : 'takeaway', clienteNombre: clientId ? matchedClient.name : clienteNombre, clientePhone, clientId, date, time, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString()};
  if(isDelivery){
    const addressEl = document.getElementById('togo-cliente-address');
    const plataformaEl = document.getElementById('togo-plataforma');
    const repartidorEl = document.getElementById('togo-repartidor-sel');
    order.clienteAddress = addressEl ? addressEl.value.trim() : '';
    order.plataformaId = plataformaEl && plataformaEl.value ? parseInt(plataformaEl.value) : null;
    Object.assign(order, parseRepartidorFieldValue(repartidorEl ? repartidorEl.value : ''));
    // El coste de envío configurado en Mi Negocio solo aplica cuando el
    // reparto lo hace el propio negocio: si es una plataforma externa
    // (Glovo, Uber Eats...), esa plataforma ya cobra su propio envío aparte,
    // fuera de esta cuenta.
    order.costeEnvio = !order.plataformaId ? (parseFloat(DB.business?.pedidos?.deliveryFee) || 0) : 0;
  }
  DB.tpvOrders.push(order);
  saveDB();
  renderTableOrderModal(order.id);
}

// Una carta es de bebidas si se creó en el área de Sala (campo area==='sala').
// Para cartas antiguas sin ese campo, se mantiene la detección por nombre
// (p.ej. "Bebidas", "Carta de Bebidas"). El resto se consideran de comida.
function isBebidaCarta(c){
  if(c && c.area) return c.area === 'sala';
  return /bebida/i.test(c.nombre||'');
}

function renderMenusComboHtml(order){
  const activeMenus = getActiveMenus();
  if(!activeMenus.length) return '';
  return `
    <p style="font-size:12px;color:var(--muted);text-transform:uppercase;font-weight:700;margin:0 0 6px"><i class="ti ti-list-details"></i> Menús</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      ${activeMenus.map(m => `<button class="btn btn-sm btn-primary" onclick="openMenuConfigModal(${order.id}, ${m.id})">${escapeHtml(tItem(m))} · ${fmtMoney(m.precio)}</button>`).join('')}
    </div>
  `;
}

// Cartas de comida activas (todas las activas que no son de bebidas).
function getActiveComidaCartas(){
  return getActiveCartas().filter(c => !isBebidaCarta(c));
}

// Guarda en la comanda qué carta de comida se usará, cuando hay varias activas
// a la vez y hace falta elegir una.
function setOrderCarta(orderId, cartaId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  order.cartaElegidaId = cartaId;
  saveDB();
  renderTableOrderModal(orderId);
}

// Devuelve las "carpetas" del menú para una comanda: una por cada sección de
// carta con platos disponibles, ordenadas con las cartas de bebida primero.
// Si hay varias cartas de comida activas a la vez, solo se usa la elegida
// para esta comanda (ver setOrderCarta).
function getOrderMenuFolders(order){
  const activeCartas = getActiveCartas();
  const bebidaCartas = activeCartas.filter(isBebidaCarta);
  let comidaCartas = activeCartas.filter(c => !isBebidaCarta(c));
  if(comidaCartas.length > 1){
    const elegida = comidaCartas.find(c => c.id === order.cartaElegidaId);
    if(elegida) comidaCartas = [elegida];
  }
  const folders = [];
  [...bebidaCartas, ...comidaCartas].forEach(c => {
    (c.secciones||[]).forEach(sec => {
      const platos = (sec.platos||[]).filter(p=>p.disponible!==false);
      if(platos.length) folders.push({cartaId: c.id, secId: sec.id, nombre: sec.nombre, i18n: sec.i18n, icono: sec.icono || guessSeccionEmoji(sec.nombre), platos});
    });
  });
  return folders;
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

function openTpvMenuFolder(orderId, cartaId, secId){
  tpvMenuOrderId = orderId;
  tpvMenuFolder = {cartaId, secId};
  renderTableOrderModal(orderId);
}

function closeTpvMenuFolder(orderId){
  tpvMenuFolder = null;
  renderTableOrderModal(orderId);
}

function renderOrderMenuHtml(order){
  const menusHtml = renderMenusComboHtml(order);

  const comidaCartas = getActiveComidaCartas();
  if(comidaCartas.length > 1 && !comidaCartas.some(c => c.id === order.cartaElegidaId)){
    return menusHtml + `
      <p style="font-size:13px;color:var(--muted);margin-bottom:8px">Hay varias cartas activas a esta hora. Elige cuál usar para esta comanda:</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${comidaCartas.map(c => `<button class="btn" onclick="setOrderCarta(${order.id}, ${c.id})"><i class="ti ti-book-2"></i> ${escapeHtml(tItem(c))}</button>`).join('')}
      </div>
    `;
  }

  const folders = getOrderMenuFolders(order);
  if(!folders.length) return menusHtml + `<p style="font-size:13px;color:var(--muted)">No hay platos disponibles. Selecciona al menos una carta activa en TPV con platos disponibles.</p>`;

  if(tpvMenuOrderId !== order.id){ tpvMenuOrderId = order.id; tpvMenuFolder = null; }

  const folder = tpvMenuFolder ? folders.find(f => f.cartaId===tpvMenuFolder.cartaId && f.secId===tpvMenuFolder.secId) : null;
  if(folder){
    return menusHtml + `
      <div style="margin-bottom:8px">
        <button class="btn btn-sm" onclick="closeTpvMenuFolder(${order.id})"><i class="ti ti-arrow-left"></i> ${folder.icono} ${escapeHtml(tItem(folder))}</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${folder.platos.map(p => `<button class="btn" onclick="addOrderItem(${order.id}, ${folder.secId}, ${p.id})">${escapeHtml(tItem(p))} · <strong style="color:var(--brand-orange)">${fmtMoney(p.precio)}</strong></button>`).join('')}
      </div>
    `;
  }

  return menusHtml + `
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${folders.map(f => `<button class="btn" style="min-width:88px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 10px" onclick="openTpvMenuFolder(${order.id}, ${f.cartaId}, ${f.secId})"><span style="font-size:26px">${f.icono}</span><span style="font-size:12px;font-weight:700">${escapeHtml(f.nombre)}</span></button>`).join('')}
    </div>
  `;
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
          ${(g.opciones||[]).map((o,i) => `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="radio" name="menu-grupo-${g.id}" value="${o.id}" ${i===0?'checked':''} style="width:auto" onchange="toggleMenuExtras(${g.id})">
              ${escapeHtml(tItem(o))}${o.suplemento ? ` <span style="color:var(--brand-orange);font-weight:600">+${fmtMoney(o.suplemento)}</span>` : ''}
            </label>
            ${(o.modificadores||[]).length ? `<div class="menu-extras-${g.id}-${o.id}" style="margin-left:28px;display:${i===0?'block':'none'}">
              ${o.modificadores.map(mod => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                  <input type="checkbox" class="menu-mod-${g.id}" data-opcion="${o.id}" data-mod-id="${mod.id}" style="width:auto">
                  ${escapeHtml(tItem(mod))}${mod.precio ? ` <span style="color:var(--brand-orange);font-weight:600">+${fmtMoney(mod.precio)}</span>` : ''}
                </label>
              `).join('')}
            </div>` : ''}
          `).join('')}
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
    if(existing){
      existing.qty += 1;
    } else {
      const line = {
        menuId: m.id, recipeId: s.recipeId, platoId: null,
        name: lineName, price: linePrice,
        qty:1, tanda: s.grupoNombre, notas: `Menú: ${m.nombre}`,
        modificadores: s.modificadores, menuInstanceId, menuBaseAmount: baseAmount
      };
      if(isBebida) line.bebida = true;
      order.items.push(line);
      autoSendTakeawayLine(order, line);
    }
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

function groupOrderItemsByTanda(order){
  const groups = {};
  (order.items||[]).forEach((line, idx) => {
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

// Marcha automáticamente: todas las bebidas + el primer grupo de comida con platos pendientes.
function marcharValeCompleto(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const ahora = new Date().toISOString();
  const fired = [];

  // 1. Marchar todas las bebidas pendientes
  (order.items||[]).forEach(l => {
    if(l.bebida && l.qty > (l.marchada||0)){
      fired.push({qty: l.qty - (l.marchada||0), name: l.name, notas: l.notas, bebida: true});
      l.estado = 'cocina';
      l.enviadoAt = ahora;
      l.marchada = l.qty;
    }
  });

  // 2. Marchar el primer grupo de comida (tanda) con platos pendientes
  const groups = groupOrderItemsByTanda(order);
  const firstPendingFood = groups.find(g => g.items.some(({line}) => !line.bebida && line.qty > (line.marchada||0)));
  if(firstPendingFood){
    firstPendingFood.items.forEach(({line}) => {
      if(!line.bebida && line.qty > (line.marchada||0)){
        fired.push({qty: line.qty - (line.marchada||0), name: line.name, notas: line.notas, bebida: false});
        line.estado = 'cocina';
        line.enviadoAt = ahora;
        line.marchada = line.qty;
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
  const fired = [{qty: line.qty - (line.marchada||0), name: line.name, notas: line.notas, bebida: line.bebida}];
  line.estado = 'cocina';
  line.enviadoAt = new Date().toISOString();
  line.marchada = line.qty;
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

function renderTableOrderModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const table = order.tableId ? DB.tables.find(t => t.id === order.tableId) : null;
  const titleText = table ? `${table.name}${order.pax ? ` · ${order.pax} ${t('common.persAbbr')}` : ''}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`
    : `${togoOrderLabel(order)}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`;
  const reservaBadge = order.reservationId ? ` <span class="badge badge-blue"><i class="ti ti-calendar-event"></i> ${t('label.reservationShort')}</span>` : '';
  const pagadoBadge = order.pagado ? ` <span class="badge badge-green"><i class="ti ti-credit-card"></i> ${t('label.paidOnline')}${order.pagoImporte!=null ? ' ('+fmtMoney(order.pagoImporte)+')' : ''}</span>` : '';
  const camarero = order.camareroId ? DB.employees.find(e=>e.id===order.camareroId) : null;
  const camareroBadge = DB.employees.length ? ` <span class="badge" style="cursor:pointer" onclick="openSetCamareroModal(${order.id})" title="${t('title.changeWaiter')}"><i class="ti ti-user"></i> ${camarero ? escapeHtml(camarero.name) : t('label.assignWaiter')}</span>` : '';
  const allergensBadge = ` <span class="badge ${order.tableAllergens?'badge-red':''}" style="cursor:pointer" onclick="promptTableAllergens(${order.id})" title="${t('tpv.tableAllergens.hint')}"><i class="ti ti-alert-triangle"></i> ${order.tableAllergens ? escapeHtml(order.tableAllergens) : t('tpv.tableAllergens.add')}</span>`;

  const total = orderTotal(order);
  if(order.items.some(l => l.nuevo)){
    order.items.forEach(l => delete l.nuevo);
    saveDB();
  }

  // Todas las cartas+menús activos, sala primero, luego comida
  const activeCartas = getActiveCartas();
  const bebidaCartas = activeCartas.filter(isBebidaCarta);
  let comidaCartas = activeCartas.filter(c => !isBebidaCarta(c));
  if(comidaCartas.length > 1){
    const elegida = comidaCartas.find(c => c.id === order.cartaElegidaId);
    if(elegida) comidaCartas = [elegida];
  }
  const allCartas = [...bebidaCartas, ...comidaCartas];
  // Un menú de varios platos ya empezado en ESTE pedido (tiene líneas con su
  // menuId) debe seguir pudiéndose completar aunque su horario haya
  // terminado a mitad de servicio y ya no esté en activeMenuIds — si no, su
  // pestaña desaparecía y el camarero no podía añadir el 2º/3er plato de un
  // menú que el cliente ya había empezado a comer.
  const activeMenusBase = getActiveMenus ? getActiveMenus() : (DB.menus||[]);
  const inProgressMenuIds = new Set(order.items.filter(l=>l.menuId).map(l=>l.menuId));
  const inProgressExtraMenus = (DB.menus||[]).filter(m => inProgressMenuIds.has(m.id) && !activeMenusBase.some(x=>x.id===m.id));
  const activeMenus = [...activeMenusBase, ...inProgressExtraMenus];

  // Autoseleccionar la primera carta si no hay selección
  if(!tpvSelectedCartaId || !allCartas.some(c=>c.id===tpvSelectedCartaId) && !activeMenus.some(m=>m.id===tpvSelectedCartaId)){
    tpvSelectedCartaId = allCartas.length ? allCartas[0].id : (activeMenus.length ? activeMenus[0].id : null);
  }

  // Pestañas de cartas/menús
  const cartaTabs = allCartas.map(c => `<button class="btn btn-sm ${tpvSelectedCartaId===c.id?'btn-primary':''}" onclick="tpvSelectedCartaId=${c.id};renderTableOrderModal(${order.id})">${escapeHtml(tItem(c))}</button>`).join('');
  const menuTabs = activeMenus.map(m => `<button class="btn btn-sm ${tpvSelectedCartaId===m.id?'btn-primary':''}" onclick="tpvSelectedCartaId=${m.id};renderTableOrderModal(${order.id})">📋 ${escapeHtml(tItem(m))}</button>`).join('');

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
    : `<div style="display:flex;gap:8px;flex-wrap:wrap">${renderOrderMarcharButtons(order)}<button class="btn" onclick="openPaymentModal(${order.id})" ${!order.items.length?'disabled':''}><i class="ti ti-cash"></i> ${t('btn.charge')} · ${fmtMoney(total)}</button></div>`;

  openModal(`
    <div class="modal-header" style="flex-wrap:wrap;gap:6px">
      <h3 style="flex:1;min-width:200px"><i class="ti ti-tools-kitchen-2"></i> ${escapeHtml(titleText)}${reservaBadge}${pagadoBadge}${camareroBadge}${allergensBadge}</h3>
      ${order.tableId ? `<button class="btn btn-sm" onclick="openTableTransferModal(${order.id})" title="${t('title.transferTable')}"><i class="ti ti-transfer"></i></button>` : ''}
      <button class="modal-close" onclick="closeModal();renderTPV()">&times;</button>
    </div>
    ${renderOrderClientNotesHtml(order)}
    <!-- Pestañas de cartas/menús -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:10px">
      ${cartaTabs}${menuTabs}
      ${order.tipo==='delivery' || order.tipo==='takeaway' ? `<button class="btn btn-sm" style="margin-left:auto" onclick="openPasteOrderModal(${order.id})" title="${t('title.pasteOrderHint')}"><i class="ti ti-clipboard-text"></i> ${t('btn.pasteOrder')}</button>` : ''}
    </div>
    <!-- Layout a dos columnas (se apilan en móvil): selector + comanda -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;min-height:50vh;max-height:70vh">
      <div style="flex:1 1 300px;min-width:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px">
        ${selectorHtml}
      </div>
      <div style="flex:1 1 280px;min-width:240px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px;background:var(--brand-cream)">
        ${comandaHtml}
      </div>
    </div>
    <div class="modal-footer" style="width:100%">
      ${actionButtons}
    </div>
  `, {order:true});
}

// Recopila todos los platos de todas las cartas activas (aunque no sea la
// pestaña seleccionada) para poder buscar por nombre, con su sección para
// poder añadirlos a la comanda con addOrderItem.
function allActivePlatosFlat(){
  const cartas = getActiveCartas();
  const out = [];
  cartas.forEach(c => {
    (c.secciones||[]).forEach(sec => {
      (sec.platos||[]).filter(p=>p.disponible!==false).forEach(p => {
        out.push({secId: sec.id, platoId: p.id, name: tItem(p), hasMods: !!(p.modificadores||[]).length});
      });
    });
  });
  return out;
}

// "Pegar pedido": para agilizar meter a mano un pedido que ha llegado por
// Glovo/Uber Eats/Just Eat (u otra plataforma) sin necesidad de ir tocando
// plato a plato en la carta. El personal copia el texto del pedido de la
// plataforma y lo pega aquí; la app intenta emparejar cada línea con un
// plato de la carta por nombre y prepara todo para añadirlo con un click.
// No hay integración real con esas plataformas (requeriría acuerdos de API
// con cada una), esto solo agiliza la parte manual.
function openPasteOrderModal(orderId){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-clipboard-text"></i> ${t('title.pasteOrder')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted)">${t('msg.pasteOrderHint')}</p>
    <div class="field">
      <textarea id="paste-order-text" rows="6" placeholder="${t('ph.pasteOrderExample')}"></textarea>
    </div>
    <div id="paste-order-preview"></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="analyzePastedOrder(${orderId})"><i class="ti ti-search"></i> ${t('btn.analyzeOrder')}</button>
    </div>
  `);
}

function analyzePastedOrder(orderId){
  const raw = document.getElementById('paste-order-text').value;
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const catalog = allActivePlatosFlat();
  const parsed = lines.map(line => {
    const m = line.match(/^(\d+)\s*[x×]?\s*(.+)$/i) || line.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
    let qty = 1, text = line;
    if(m){
      if(/^\d+$/.test(m[1])){ qty = parseInt(m[1]); text = m[2]; }
      else { text = m[1]; qty = parseInt(m[2]); }
    }
    const norm = stripAccents(text.trim().toLowerCase());
    let match = catalog.find(p => stripAccents(p.name.toLowerCase()) === norm);
    if(!match) match = catalog.find(p => stripAccents(p.name.toLowerCase()).includes(norm) || norm.includes(stripAccents(p.name.toLowerCase())));
    return {raw: line, qty, text: text.trim(), match};
  });
  window._pasteOrderParsed = parsed;
  const preview = document.getElementById('paste-order-preview');
  preview.innerHTML = `
    <div class="table-wrap" style="margin-top:6px">
      <table>
        <thead><tr><th>${t('hr.lbl.unitsAbbrev')}</th><th style="text-align:left">${t('hr.platos.dish')}</th><th></th></tr></thead>
        <tbody>${parsed.map((p,i) => `
          <tr>
            <td>${p.qty}</td>
            <td style="text-align:left;font-family:inherit;font-weight:400;background:none;border-left:none">${escapeHtml(p.text)}</td>
            <td>${p.match ? (p.match.hasMods ? `<span class="badge badge-amber" title="${t('msg.hasModsAddManually')}">${escapeHtml(p.match.name)} — ${t('msg.hasModsShort')}</span>` : `<span class="badge badge-green">✓ ${escapeHtml(p.match.name)}</span>`) : `<span class="badge badge-red">${t('msg.dishNotFoundInCarta')}</span>`}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    ${parsed.some(p=>!p.match || p.match.hasMods) ? `<small style="color:var(--muted)">${t('msg.unmatchedLinesHint')}</small>` : ''}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmPastedOrder(${orderId})" ${parsed.some(p=>p.match && !p.match.hasMods)?'':'disabled'}><i class="ti ti-check"></i> ${t('btn.addMatchedItems')}</button>
    </div>
  `;
}

function confirmPastedOrder(orderId){
  const parsed = window._pasteOrderParsed || [];
  let added = 0;
  parsed.filter(p=>p.match && !p.match.hasMods).forEach(p => {
    for(let i=0;i<p.qty;i++) addOrderItem(orderId, p.match.secId, p.match.platoId);
    added += p.qty;
  });
  window._pasteOrderParsed = null;
  closeModal();
  showToast(t('msg.nItemsAddedFromPaste').replace('${n}', added));
  renderTableOrderModal(orderId);
}

// Selector de platos dentro de una carta concreta (secciones + platos visibles).
function renderCartaSelectorInline(order, carta){
  const secciones = (carta.secciones||[]).filter(sec => (sec.platos||[]).some(p=>p.disponible!==false));
  if(!secciones.length) return `<div class="empty" style="padding:10px">${t('empty.noDishesInCarta')}</div>`;
  return secciones.map(sec => {
    const platos = (sec.platos||[]).filter(p=>p.disponible!==false);
    const icono = sec.icono || guessSeccionEmoji(sec.nombre);
    return `
      <div style="margin-bottom:12px">
        <div style="font-weight:700;font-size:13px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">${icono} ${escapeHtml(tItem(sec))}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${platos.map(p => `<button class="btn btn-sm" style="font-size:12px" onclick="addOrderItem(${order.id}, ${sec.id}, ${p.id})">${escapeHtml(tItem(p))} · <strong style="color:var(--brand-orange)">${fmtMoney(p.precio)}</strong></button>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Selector de menú (combo con grupos y opciones).
function renderMenuSelectorInline(order, menu){
  return `
    <div style="margin-bottom:8px"><strong>${escapeHtml(tItem(menu))}</strong> · <span style="color:var(--brand-orange);font-weight:700">${fmtMoney(menu.precio)}</span></div>
    <button class="btn btn-sm btn-primary" onclick="openMenuConfigModal(${order.id}, ${menu.id})"><i class="ti ti-plus"></i> ${t('btn.addToOrderNamed').replace('${name}', escapeHtml(tItem(menu)))}</button>
  `;
}

// Panel de comanda: los ítems del pedido con estado, agrupados por sección (tanda),
// ordenados como se fueron añadiendo (arriba lo primero, abajo lo último).
function renderOrderComandaPanel(order){
  const groups = groupOrderItemsByTanda(order);
  if(!groups.length) return `<div class="empty" style="padding:20px;text-align:center"><i class="ti ti-clipboard-list"></i><br>${t('empty.orderEmpty')}<br><span style="font-size:12px;color:var(--muted)">${t('label.selectFromMenu')}</span></div>`;
  groups.sort((a,b) => {
    const aB = a.items.some(({line}) => line.bebida) ? 0 : 1;
    const bB = b.items.some(({line}) => line.bebida) ? 0 : 1;
    return aB - bB;
  });
  const total = orderTotal(order);
  let html = `<div style="font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between"><span>${t('label.order')}</span><span>${fmtMoney(total)}</span></div>`;
  html += groups.map(g => {
    const pendingCount = orderPendingKitchenLines(order, g.tanda).reduce((s,l)=>s+l.qty, 0);
    const allInGroup = g.items;
    const allFired = allInGroup.every(({line}) => line.estado && line.qty <= (line.marchada||0));
    const allDelivered = allInGroup.every(({line}) => line.estado === 'entregado');
    let statusBadge = '';
    if(allDelivered) statusBadge = `<span class="badge badge-green" style="font-size:10px">✅ ${t('tpv.pickedUp')}</span>`;
    else if(allInGroup.some(({line}) => line.estado === 'entregado')) statusBadge = `<span class="badge badge-green" style="font-size:10px">🍽️ ${t('tpv.readyToPickup')}</span>`;
    else if(allInGroup.some(({line}) => line.estado === 'preparando')) statusBadge = `<span class="badge badge-blue" style="font-size:10px">🔥 ${t('kitchen.preparing')}</span>`;
    else if(allFired) statusBadge = `<span class="badge badge-amber" style="font-size:10px">⏳ ${t('tpv.fired')}</span>`;

    return `
    <div style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;background:var(--surface)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px">
        <strong style="font-size:12px;text-transform:uppercase;color:var(--muted)">${g.tanda ? escapeHtml(g.tanda) : t('label.noCategory')}</strong>
        <div style="display:flex;gap:4px;align-items:center">
          ${statusBadge}
          ${pendingCount ? `<button class="btn btn-sm" style="background:var(--brand-orange);color:#fff;border-color:var(--brand-orange);font-size:11px;padding:4px 8px;min-height:auto" onclick="marcharComanda(${order.id}, '${escapeJsAttr(g.tanda)}')"><i class="ti ti-chef-hat"></i> ${t('btn.sendToKitchen')}</button>` : ''}
        </div>
      </div>
      ${allInGroup.map(({line, idx}) => {
        // Las bebidas no pasan por la pantalla de Cocina (no hay nada que
        // cocinar), así que aquí en Sala es donde se marca su propio estado
        // (pedida → preparando → servida) con un botón, no solo un badge de
        // solo lectura como el resto de platos (que se controlan desde Cocina).
        let lineStatus = '';
        if(line.bebida && line.estado){
          if(line.estado==='entregado') lineStatus = ' <span class="badge badge-green" style="font-size:9px">✅</span>';
          else if(line.estado==='preparando') lineStatus = ` <button class="btn btn-sm" style="font-size:9px;padding:2px 6px;min-height:auto;background:var(--teal);color:#fff;border-color:var(--teal)" onclick="cycleLineEstado(${order.id}, ${idx})" title="${t('kitchen.preparing')}">🔥 ${t('kitchen.preparing')}</button>`;
          else if(line.estado==='cocina') lineStatus = ` <button class="btn btn-sm" style="font-size:9px;padding:2px 6px;min-height:auto;background:var(--amber);color:#fff;border-color:var(--amber)" onclick="cycleLineEstado(${order.id}, ${idx})" title="${t('kitchen.waiting')}">⏳ ${t('kitchen.waiting')}</button>`;
        } else {
          if(line.estado==='entregado') lineStatus = ' <span class="badge badge-green" style="font-size:9px">✅</span>';
          else if(line.estado==='preparando') lineStatus = ' <span class="badge badge-blue" style="font-size:9px">🔥</span>';
          else if(line.estado==='cocina') lineStatus = ' <span class="badge badge-amber" style="font-size:9px">⏳</span>';
        }
        return `
        <div class="comanda-item-row" style="display:flex;align-items:center;gap:6px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>${line.qty}×</strong> ${escapeHtml(line.name)}${lineStatus}${line.promoId ? ` <span class="badge badge-green" style="font-size:9px"><i class="ti ti-discount-2"></i> -${line.promoPct}%</span>` : ''}${line.priceMismatch ? ` <i class="ti ti-alert-triangle" style="color:var(--brand-orange)" title="${escapeHtml(t('msg.priceChangedSinceOrder'))}"></i>` : ''}${line.unavailableNow ? ` <i class="ti ti-alert-circle" style="color:var(--red)" title="${escapeHtml(t('msg.dishNoLongerInCarta'))}"></i>` : ''}</span>
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
  }).join('');
  return html;
}

// Permite anotar o cambiar qué camarero/a ha tomado o atiende esta comanda.
// Alérgenos anotados para la mesa entera (no ligados a ningún cliente
// dado de alta): se anotan al abrirla o en cualquier momento, se ven en
// pantalla en la comanda y se imprimen destacados en el vale de cocina.
function promptTableAllergens(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const val = prompt(t('tpv.tableAllergens.prompt'), order.tableAllergens || '');
  if(val === null) return;
  order.tableAllergens = val.trim();
  saveDB();
  renderTableOrderModal(orderId);
}

function openSetCamareroModal(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
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
  const sel = document.getElementById('set-camarero-sel');
  order.camareroId = sel && sel.value ? parseInt(sel.value) : null;
  saveDB();
  renderTableOrderModal(orderId);
}

function orderPendingKitchenLines(order, tanda){
  return (order.items||[])
    .filter(l => tanda === undefined || (l.tanda||'') === (tanda||''))
    .map(l => ({name: l.name, qty: l.qty - (l.marchada||0), notas: l.notas||'', tanda: l.tanda||''}))
    .filter(l => l.qty > 0);
}

function marcharComanda(orderId, tanda){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const pending = orderPendingKitchenLines(order, tanda);
  if(!pending.length){ showToast(t('msg.noNewDishes')); return; }

  const ahora = new Date().toISOString();
  const fired = [];
  (order.items||[]).forEach(l => {
    if((tanda === undefined || (l.tanda||'') === (tanda||'')) && l.qty > (l.marchada||0)){
      fired.push({qty: l.qty - (l.marchada||0), name: l.name, notas: l.notas, bebida: l.bebida});
      l.estado = 'cocina';
      l.enviadoAt = ahora;
      l.marchada = l.qty;
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
    if(lineas.length) printComandaTicket(p.nombre, titulo, lineas, p.anchoTicket, order.tableAllergens);
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
  order.cerrada = food.length > 0 && food.every(l => l.estado === 'entregado');
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
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-comandascocina') renderComandasCocina();
  else if(active && active.id === 'view-tpv') renderTPV();
  const overlay = document.getElementById('modal-overlay');
  if(overlay && overlay.classList.contains('active')) renderTableOrderModal(orderId);
}

function comandaOrderTitle(order){
  const table = order.tableId ? DB.tables.find(t => t.id === order.tableId) : null;
  if(table) return `${table.name}${order.pax ? ` · ${order.pax} ${t('common.persAbbr')}` : ''}`;
  return `${togoOrderLabel(order)}${order.clienteNombre ? ' — '+order.clienteNombre : ''}`;
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

// Click sobre un plato en cocina: avanza su estado en espera -> en preparación -> entregado
function cycleLineEstado(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!line) return;
  if(line.estado === 'cocina') setLineEstado(orderId, idx, 'preparando');
  else if(line.estado === 'preparando') setLineEstado(orderId, idx, 'entregado');
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
    }
  });
  if(!changed) return;
  checkComandaCierre(order);
  saveDB();
  if(typeof flushCloudSync === 'function') flushCloudSync();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-comandascocina') renderComandasCocina();
  else if(active && active.id === 'view-tpv') renderTPV();
  const overlay = document.getElementById('modal-overlay');
  if(overlay && overlay.classList.contains('active')) renderTableOrderModal(orderId);
}

function renderComandasCocina(){
  const box = document.getElementById('comandascocina-content');
  if(!box) return;

  const allOrders = DB.tpvOrders.filter(o => o.status !== 'pagada');

  const tabsHtml = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-sm ${comandasCocinaTab==='activas' ? 'btn-primary' : ''}" onclick="setComandasCocinaTab('activas')"><i class="ti ti-tools-kitchen-2"></i> ${t('tab.activeOrders')}</button>
      <button class="btn btn-sm ${comandasCocinaTab==='cerradas' ? 'btn-primary' : ''}" onclick="setComandasCocinaTab('cerradas')"><i class="ti ti-history"></i> ${t('tab.closedOrders')}</button>
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

    box.innerHTML = tabsHtml + `<div class="grid grid-3">${closed.map(({order, lines, maxMs}) => `
      <div class="card" style="overflow-y:auto;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
          <strong>${escapeHtml(comandaOrderTitle(order))}</strong>
          <span class="badge badge-green"><i class="ti ti-circle-check"></i> ${t('kitchen.delivered')}</span>
        </div>
        ${maxMs ? `<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${timeAgo(new Date(maxMs).toISOString())}</div>` : ''}
        ${lines.map(line => `<div style="padding:4px 0"><strong>${fmtNum(line.qty)} × ${escapeHtml(line.name)}</strong></div>`).join('')}
      </div>
    `).join('')}</div>`;
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

  box.innerHTML = tabsHtml + `<div class="grid grid-3">${tickets.map(({order, allLines}) => {
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
        <strong>${escapeHtml(comandaOrderTitle(order))}</strong>
        ${urgencyBadge(mins)}
      </div>
      ${groups.map(g => {
        const hasCocina = g.lines.some(({line}) => line.estado === 'cocina');
        const hasPreparando = g.lines.some(({line}) => line.estado === 'preparando');
        const allEntregado = g.lines.every(({line}) => line.estado === 'entregado');
        let groupBtn = '';
        if(allEntregado) groupBtn = `<span class="badge badge-green"><i class="ti ti-circle-check"></i> ${t('kitchen.allDelivered')}</span>`;
        else if(hasCocina) groupBtn = `<button class="btn btn-sm" style="background:var(--amber);color:#fff;border-color:var(--amber)" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-clock"></i> ${t('kitchen.prepareAll')}</button>`;
        else if(hasPreparando) groupBtn = `<button class="btn btn-sm" style="background:var(--teal);color:#fff;border-color:var(--teal)" onclick="cycleGroupEstado(${order.id}, '${escapeJsAttr(g.tanda||'')}')"><i class="ti ti-flame"></i> ${t('kitchen.deliverAll')}</button>`;
        return `
        <div style="margin-bottom:6px;padding-top:6px;border-top:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            ${g.tanda ? `<div style="font-size:11px;font-weight:700;color:var(--brand-orange);text-transform:uppercase"><i class="ti ti-chevrons-right"></i> ${escapeHtml(g.tanda)}</div>` : `<div></div>`}
            ${groupBtn}
          </div>
          ${g.lines.map(({line, idx}) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;gap:8px">
              <div style="flex:1;min-width:0">
                <strong style="${line.estado==='entregado'?'color:var(--muted);text-decoration:line-through':''}">${fmtNum(line.qty)} × ${escapeHtml(line.name)}</strong>
                ${line.notas ? `<div style="font-size:12px;color:var(--muted)">${escapeHtml(line.notas)}</div>` : ''}
              </div>
              ${!line.estado ? `<span class="badge badge-gray"><i class="ti ti-clock-pause"></i> ${t('kitchen.notFired')}</span>`
              : line.estado==='cocina' ? `<button class="btn btn-sm" style="flex:none;background:var(--amber);color:#fff;border-color:var(--amber)" onclick="cycleLineEstado(${order.id}, ${idx})"><i class="ti ti-clock"></i> ${t('kitchen.waiting')}</button>`
              : line.estado==='preparando' ? `<button class="btn btn-sm" style="flex:none;background:var(--teal);color:#fff;border-color:var(--teal)" onclick="cycleLineEstado(${order.id}, ${idx})"><i class="ti ti-flame"></i> ${t('kitchen.preparing')}</button>`
              : `<span class="badge badge-green"><i class="ti ti-circle-check"></i> ${t('kitchen.delivered')}</span>`}
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
// Para los pedidos "para llevar" (tickets rápidos), los platos pasan a cocina automáticamente
// al añadirlos o aumentar su cantidad, sin necesidad de pulsar "Marchar".
function autoSendTakeawayLine(order, line){
  if(order.tipo !== 'takeaway' || !line) return;
  line.estado = 'cocina';
  line.enviadoAt = line.enviadoAt || new Date().toISOString();
  line.marchada = line.qty;
  order.cerrada = false;
}

// El primer grupo de platos (primer tanda añadida a la comanda) se marcha a
// cocina automáticamente. Los siguientes grupos se marchan manualmente.
function autoSendFirstCourse(order, line, tanda){
  if(!line || order.tipo === 'takeaway') return;
  const firstTanda = (order.tandas||[])[0];
  if(firstTanda === undefined || (tanda||'') !== (firstTanda||'')) return;
  line.estado = 'cocina';
  line.enviadoAt = line.enviadoAt || new Date().toISOString();
  line.marchada = line.qty;
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
  } else autoSendTakeawayLine(order, line);
  saveDB();
  renderTableOrderModal(orderId);
}
function removeOrderItem(orderId, idx){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items[idx]) return;
  const line = order.items[idx];
  // Si el plato ya se ha marchado a cocina (incluido si ya se ha entregado),
  // anularlo exige PIN y motivo, para no borrar en silencio comida que se
  // está preparando o que el cliente ya se ha comido.
  if((line.marchada||0) > 0){
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
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.voidDish')}</h3>
      <button class="modal-close" onclick="renderTableOrderModal(${orderId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">"${escapeHtml(line.name)}" ${t('msg.voidDishDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="void-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
    </div>
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
  setTimeout(()=>document.getElementById('void-pin-input')?.focus(), 50);
}
function confirmVoidLine(){
  if(!voidPending) return;
  const {orderId, idx, type, delta} = voidPending;
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const line = order && order.items[idx];
  if(!order || !line) return;
  const pin = document.getElementById('void-pin-input').value;
  const bp = DB.business.pin;
  const match = bp.startsWith('H:') ? hashPin(pin) === bp : pin === bp;
  if(!match){ showToast(t('msg.pinIncorrect')); return; }
  const reasonSel = document.getElementById('void-reason-select').value;
  const reasonOther = document.getElementById('void-reason-other').value.trim();
  const motivo = reasonSel === 'otro' ? (reasonOther || t(VOID_REASON_KEYS.otro)) : t(VOID_REASON_KEYS[reasonSel]);
  const mesa = order.tableId ? (DB.tables.find(t=>t.id===order.tableId)||{}).name : togoOrderLabel(order);

  if(!DB.voidLog) DB.voidLog = [];
  DB.voidLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    plato: line.name, cantidad: type==='remove' ? line.qty : Math.abs(delta),
    estado: line.estado||'', motivo, mesa: mesa||''
  });

  if(type === 'remove'){
    order.items.splice(idx,1);
    reassignMenuBasePrice(order, line);
  } else {
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
function openVoidLogModal(){
  const log = [...(DB.voidLog||[])].reverse().slice(0, 100);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle"></i> ${t('title.voidLog')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.dishElaboration')}</th><th>${t('label.quantity')}</th><th>${t('label.voidReason')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td>${escapeHtml(e.fecha)}</td><td>${escapeHtml(e.hora)}</td><td>${escapeHtml(e.mesa||'—')}</td><td>${escapeHtml(e.plato)}</td><td>${e.cantidad}</td><td>${escapeHtml(e.motivo)}</td></tr>`).join('') : `<tr><td colspan="6"><div class="empty" style="padding:14px">${t('empty.noVoidsRegistered')}</div></td></tr>`}</tbody>
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
  const promo = getActivePromoForDish(dishName || line.name);
  if(!promo) return;
  line.originalPrice = line.price;
  line.price = roundMoney(line.price * (1 - promo.discountPct/100));
  line.promoId = promo.id;
  line.promoPct = promo.discountPct;
}

function computeFinalTotal(order){
  const total = orderTotal(order);
  const tipEl = document.getElementById('payment-tip');
  const descuentoPct = order.descuentoPct || 0;
  const propina = tipEl ? Math.max(0, parseFloat(tipEl.value)||0) : (order.propina||0);
  const descuentoImporte = roundMoney(total * descuentoPct / 100);
  return {total, descuentoPct, descuentoImporte, propina, finalTotal: roundMoney(total - descuentoImporte + propina)};
}

function renderFullPaymentTab(order, total){
  const descuentoPct = order.descuentoPct || 0;
  const propina = order.propina || 0;
  const finalTotal = total - (total*descuentoPct/100) + propina;
  return `
    <div class="field-row">
      <div class="field">
        <label>${t('label.discountPct')}</label>
        <div style="display:flex;gap:6px">
          <input type="number" id="payment-discount" min="0" max="100" step="1" value="${descuentoPct}" style="flex:1">
          <button class="btn btn-sm" onclick="requestApplyDiscount(${order.id})">${t('btn.applyDiscount')}</button>
        </div>
        ${descuentoPct > 0 ? `<small style="color:var(--muted)">${t('label.discountAppliedBy')}: ${escapeHtml(order.descuentoResponsableNombre||'—')} — "${escapeHtml(order.descuentoMotivo||'')}"</small>` : ''}
      </div>
      <div class="field">
        <label>${t('label.tip')} (€)</label>
        <input type="number" id="payment-tip" min="0" step="0.5" value="${propina}" oninput="updatePaymentTip(${order.id})">
      </div>
    </div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="label">${t('label.totalToCharge')}</div>
      <div class="value" id="payment-final-total">${fmtMoney(finalTotal)}</div>
    </div>
    <div class="field">
      <label>${t('label.paymentMethod')}</label>
      <select id="payment-method" onchange="togglePaymentCash()">
        ${PAYMENT_METHODS.map(m=>`<option value="${m}">${paymentMethodTpvLabel(m)}</option>`).join('')}
        <option value="Mixto">${t('pay.mixed')}</option>
      </select>
    </div>
    <div class="field" id="payment-cash-field">
      <label>${t('label.amountGiven')}</label>
      <input type="number" id="payment-cash" step="0.01" min="0" value="${finalTotal.toFixed(2)}" oninput="updatePaymentChange(${order.id})">
    </div>
    <div class="kpi" id="payment-change-kpi" style="margin-bottom:12px">
      <div class="label">${t('label.change')}</div>
      <div class="value" id="payment-change">${fmtMoney(0)}</div>
    </div>
    <div id="payment-mixed-fields" style="display:none">
      <div class="field-row">
        <div class="field">
          <label>${t('pay.cash')} (€)</label>
          <input type="number" id="payment-mixed-cash" step="0.01" min="0" value="${(finalTotal/2).toFixed(2)}" oninput="updatePaymentMixed(${order.id}, 'cash')">
        </div>
        <div class="field">
          <label>${t('pay.card')} (€)</label>
          <input type="number" id="payment-mixed-card" step="0.01" min="0" value="${(finalTotal - finalTotal/2).toFixed(2)}" oninput="updatePaymentMixed(${order.id}, 'card')">
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
  const {finalTotal} = computeFinalTotal(order);
  const cashEl = document.getElementById('payment-mixed-cash');
  const cardEl = document.getElementById('payment-mixed-card');
  if(changed === 'cash'){
    const cash = Math.max(0, Math.min(finalTotal, parseFloat(cashEl.value) || 0));
    cardEl.value = roundMoney(finalTotal - cash).toFixed(2);
  } else {
    const card = Math.max(0, Math.min(finalTotal, parseFloat(cardEl.value) || 0));
    cashEl.value = roundMoney(finalTotal - card).toFixed(2);
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
  const {finalTotal} = computeFinalTotal(order);
  const kpiEl = document.getElementById('payment-final-total');
  if(kpiEl) kpiEl.textContent = fmtMoney(finalTotal);
  const cashEl = document.getElementById('payment-cash');
  if(cashEl) cashEl.value = finalTotal.toFixed(2);
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
  const camareros = DB.employees.filter(e => (e.area||'cocina') === 'sala');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-discount-2"></i> ${t('title.applyDiscount')}</h3>
      <button class="modal-close" onclick="renderPaymentModal(${orderId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.applyDiscountDesc')}</p>
    ${camareros.length ? `<div class="field">
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
  const responsableId = respSel && respSel.value ? parseInt(respSel.value) : null;
  const responsable = responsableId ? DB.employees.find(e => e.id === responsableId) : null;

  const subtotal = orderTotal(order);
  const importe = roundMoney(subtotal * pct / 100);
  order.descuentoPct = pct;
  order.descuentoMotivo = reason;
  order.descuentoResponsableId = responsableId;
  order.descuentoResponsableNombre = responsable ? responsable.name : '';

  if(!DB.discountLog) DB.discountLog = [];
  DB.discountLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    mesa: order.tableId ? (DB.tables.find(t=>t.id===order.tableId)||{}).name : togoOrderLabel(order),
    porcentaje: pct, importe, motivo: reason, responsableId, responsableNombre: responsable ? responsable.name : ''
  });
  saveDB();
  discountPending = null;
  renderPaymentModal(orderId);
  showToast(t('msg.discountApplied'));
}

function updatePaymentChange(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order) return;
  const {finalTotal} = computeFinalTotal(order);
  const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
  document.getElementById('payment-change').textContent = fmtMoney(Math.max(0, roundMoney(cash - finalTotal)));
}

function finalizeCharge(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  if(!order || !order.items.length) return;
  const {total: subtotal, descuentoPct, descuentoImporte, propina, finalTotal: total} = computeFinalTotal(order);
  const metodoPago = document.getElementById('payment-method').value;
  let pagos = null;
  if(metodoPago === 'Mixto'){
    const cash = Math.max(0, parseFloat(document.getElementById('payment-mixed-cash').value) || 0);
    const card = Math.max(0, parseFloat(document.getElementById('payment-mixed-card').value) || 0);
    if(Math.abs((cash+card) - total) > 0.01){ showToast(t('msg.mixedPaymentMismatch')); return; }
    pagos = [];
    if(cash > 0) pagos.push({label: t('pay.cash'), amount: cash, metodoPago: 'Efectivo'});
    if(card > 0) pagos.push({label: t('pay.card'), amount: card, metodoPago: 'Tarjeta'});
  }
  const sale = {id: genId(), date: todayStr(), createdAt: new Date().toISOString(), total, subtotal, descuentoPct, descuentoImporte, descuentoMotivo: order.descuentoMotivo||'', descuentoResponsableNombre: order.descuentoResponsableNombre||'', propina, tableId: order.tableId, pax: order.pax||null, tipo: order.tipo||'mesa', express: order.express||false, clienteNombre: order.clienteNombre||'', clientId: order.clientId||null, camareroId: order.camareroId||null, metodoPago, pagos, items: order.items.map(l=>({...l}))};
  applyDeliveryCommission(order, sale);
  discountStockForOrder(order);
  DB.sales.push(sale);
  enqueueVerifactuSubmission(sale);
  if(order.clientId) registerClientVisit(order.clientId);
  order.status = 'pagada';
  order.closedAt = new Date().toISOString();
  saveDB();
  renderTPV();
  openTicketDeliveryModal(sale.id);
}

/* ------------------ Pestaña: dividir a partes iguales ------------------ */
function renderEqualSplitTab(order){
  if(!order.splitPayments || order.splitMode !== 'equal'){
    return `
      <div class="field">
        <label>${t('label.howManySplitBill')}</label>
        <input type="number" id="split-equal-n" min="2" max="20" step="1" value="2">
      </div>
    `;
  }
  return renderSplitPartsList(order);
}

function generateEqualSplit(orderId){
  const order = DB.tpvOrders.find(o => o.id === orderId);
  const n = Math.max(2, Math.min(20, parseInt(document.getElementById('split-equal-n').value) || 2));
  const total = orderTotal(order);
  order.splitMode = 'equal';
  order.splitPayments = makeEqualParts(total, n).map((amount,i) => ({
    id: i+1, label: t('label.personN').replace('${n}', i+1), amount, paid:false, metodoPago:null
  }));
  saveDB();
  renderPaymentModal(orderId);
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
    return {
      id: personIdx, label: t('label.dinerN').replace('${n}', personIdx), amount: roundMoney(amount),
      itemNames, paid:false, metodoPago:null
    };
  });
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
        ${PAYMENT_METHODS.map(m=>`<option value="${m}">${paymentMethodTpvLabel(m)}</option>`).join('')}
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
  const total = orderTotal(order);
  discountStockForOrder(order);
  const pagos = order.splitPayments.map(p => ({label: p.label, amount: p.amount, metodoPago: p.metodoPago}));
  const metodos = [...new Set(pagos.map(p=>p.metodoPago))];
  const sale = {
    id: genId(), date: todayStr(), createdAt: new Date().toISOString(), total,
    tableId: order.tableId, pax: order.pax||null, tipo: order.tipo||'mesa', express: order.express||false,
    clienteNombre: order.clienteNombre||'', clientId: order.clientId||null, camareroId: order.camareroId||null,
    metodoPago: metodos.length===1?metodos[0]:'Dividido',
    pagos, items: order.items.map(l=>({...l}))
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

function discountStockForOrder(order){
  order.items.forEach(line => {
    // Una línea normal descuenta su propia receta; un menú sin desglosar
    // descuenta las recetas de cada opción elegida (menuSelections).
    const recetas = [];
    if(line.recipeId) recetas.push(line.recipeId);
    else if(Array.isArray(line.menuSelections)) line.menuSelections.forEach(sel => { if(sel.recipeId) recetas.push(sel.recipeId); });
    recetas.forEach(recipeId => {
      const r = getRecipe(recipeId);
      if(!r) return;
      (r.ingredients||[]).forEach(ri => {
        if(ri.type === 'base'){
          // La línea usa una elaboración base (almíbar, caldo...) como ingrediente:
          // esa elaboración tiene su propio stock (DB.elaboraciones), no Mega Lista.
          const elab = (DB.elaboraciones||[]).find(e => e.recipeId === ri.baseRecipeId);
          if(elab) elab.qty = Math.max(0, (elab.qty||0) - ri.qty * line.qty);
          return;
        }
        const s = getStockEntry(ri.ingredientId);
        s.qty = Math.max(0, s.qty - ri.qty * line.qty);
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
  const comision = sale.total * (comisionPct/100) * (1 + ivaPct/100);
  sale.plataforma = {id: plat.id, nombre: plat.nombre, comisionPct, ivaPct};
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
function confirmMergeTable(orderId){
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
  if(!confirm(t('msg.confirmMergeTables'))) return;
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
        <thead><tr><th>${t('th.time')}</th><th>${t('label.tables')}</th><th>${t('label.total')}</th><th class="owner-only">${t('tpv.margin.label')}</th><th>${t('label.paymentMethod')}</th><th></th></tr></thead>
        <tbody>${sales.length ? sales.map(s => {
          const table = s.tableId ? DB.tables.find(t=>t.id===s.tableId) : null;
          const label = table ? table.name : togoOrderLabel(s);
          const hora = s.createdAt ? new Date(s.createdAt).toTimeString().slice(0,5) : '';
          const margin = s.total - orderFoodCost(s);
          return `<tr>
            <td>${escapeHtml(hora)}</td>
            <td>${escapeHtml(label)}${s.clienteNombre?` — ${escapeHtml(s.clienteNombre)}`:''}</td>
            <td>${fmtMoney(s.total)}</td>
            <td class="owner-only" style="color:${margin>=0?'var(--green)':'var(--red)'}">${fmtMoney(margin)}</td>
            <td>${escapeHtml(paymentMethodTpvLabel(s.metodoPago))}</td>
            <td><button class="btn btn-sm btn-icon" title="${t('btn.reprintTicket')}" onclick="printTicket(DB.sales.find(x=>x.id===${s.id}))"><i class="ti ti-printer"></i></button></td>
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

   NÚMERO DE FACTURA (NumSerieFactura): lo genera GastroGoan, no el
   proveedor. Si el negocio usa la app desde más de un dispositivo/TPV a
   la vez, cada dispositivo necesita su PROPIA serie (p.ej. "T1-", "T2-")
   para que dos dispositivos nunca puedan generar el mismo número — es la
   práctica estándar en varios puntos de venta, no un parche. Por eso la
   serie se guarda en localStorage (por dispositivo), no en DB.business
   (que se sincroniza entre dispositivos). Configurar la serie de este
   dispositivo en Mi Negocio → VeriFactu antes de activarlo.
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

async function submitSaleToVerifactuProvider(sale, cfg){
  const provider = VERIFACTU_PROVIDERS[cfg.provider];
  if(!provider) throw new Error('Proveedor VeriFactu no reconocido: ' + cfg.provider);
  if(cfg.provider === 'verifactuapi') return submitSaleToVerifactuApi(sale, cfg, provider);
  if(cfg.provider === 'facturahub') return submitSaleToFacturaHub(sale, cfg, provider);
  return submitSaleToGenericProvider(sale, cfg, provider);
}

// VeriFactuAPI (Invocash) — usa el esquema de campos oficial de la AEAT
// (no una simplificación propia), confirmado vía su SDK público
// (github.com/NemonInvocash/verifactu-php). CONFIRMADO contra su
// documentación real (app.verifactuapi.es/docs/, aportada por el usuario
// el 31-07-2026): endpoint base, nombres de campo, formato de fecha,
// códigos de Desglose, y estructura de la respuesta (data.items[0]).
// Autenticación por clave de emisor (Bearer, limitada al NIF de este
// negocio, generada por el propio negocio desde su cuenta).
// La huella (Huella) no llega en la respuesta inmediata de creación — la
// AEAT la procesa de forma asíncrona — así que tras crear el registro se
// consulta GET /api/alta-registro-facturacion/{id} unas pocas veces con
// una pequeña espera; si todavía no está lista, la venta queda en la cola
// normal de reintento (processVerifactuQueue) y se comprueba en la
// siguiente pasada, sin bloquear nada.
async function submitSaleToVerifactuApi(sale, cfg, provider){
  const ivaPct = verifactuIvaPct();
  const nif = (DB.business && DB.business.cif) || '';
  const numSerieFactura = sale.verifactuNumSerie || (sale.verifactuNumSerie = nextVerifactuNumSerieFactura());
  const fecha = new Date(sale.date);
  const fechaExpedicion = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}`; // formato confirmado en su doc: "2025-1-1"
  const base = sale.total / (1 + ivaPct/100);
  const cuota = sale.total - base;
  const headers = {'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}`};
  const body = {
    IDEmisorFactura: nif,
    NumSerieFactura: numSerieFactura,
    FechaExpedicionFactura: fechaExpedicion,
    TipoFactura: 'F2', // factura simplificada (tique), el caso normal de un restaurante; sin Destinatarios
    DescripcionOperacion: sale.items.map(l => `${l.qty}x ${l.name}`).join(', ').slice(0, 500),
    FacturaSimplificadaArt7273: 'S',
    Desglose: [{
      Impuesto: '01', ClaveRegimen: 1, CalificacionOperacion: 1,
      TipoImpositivo: ivaPct, BaseImponibleOImporteNoSujeto: Math.round(base*100)/100, CuotaRepercutida: Math.round(cuota*100)/100,
    }],
    CuotaTotal: Math.round(cuota*100)/100,
    ImporteTotal: Math.round(sale.total*100)/100,
  };
  const createRes = await fetch(`${provider.apiBase}/api/alta-registro-facturacion`, {method: 'POST', headers, body: JSON.stringify(body)});
  if(!createRes.ok) throw new Error(`VeriFactuAPI (crear registro) respondió ${createRes.status}`);
  const created = await createRes.json();
  const item = created.data && created.data.items && created.data.items[0];
  if(!item || !item.id) throw new Error('VeriFactuAPI no devolvió un id de registro');

  // Consulta corta de la huella/QR ya procesados (unos segundos de margen;
  // si la AEAT tarda más, la cola general lo reintentará más tarde).
  for(let i=0; i<3; i++){
    await new Promise(r => setTimeout(r, 1500));
    const getRes = await fetch(`${provider.apiBase}/api/alta-registro-facturacion/${item.id}`, {headers});
    if(!getRes.ok) continue;
    const record = await getRes.json();
    const data = (record.data && record.data.items ? record.data.items[0] : record.data) || {};
    if(data.Huella){
      return {invoiceId: numSerieFactura, hash: data.Huella, qrData: data.url_qr || null};
    }
  }
  throw new Error('VeriFactuAPI: la huella todavía no estaba lista, se reintentará');
}

// FacturaHub: flujo documentado públicamente (crear factura → emitir a
// VeriFactu → consultar estado) en
// github.com/FacturaHub-com/facturahub-verifactu. Ver el aviso de la
// cabecera del bloque sobre qué campos de la respuesta de /status siguen
// sin confirmar.
async function submitSaleToFacturaHub(sale, cfg, provider){
  const ivaPct = verifactuIvaPct();
  const headers = {'Content-Type': 'application/json', 'x-api-key': cfg.apiKey};

  // 1) Crear la factura en FacturaHub. Un ticket de restaurante a consumidor
  // final no siempre tiene NIF del cliente; se usa un nombre genérico si no
  // hay uno registrado, como hace ya el resto de la app con las facturas
  // simplificadas.
  const createRes = await fetch(`${provider.apiBase}/api/invoices`, {
    method: 'POST', headers,
    body: JSON.stringify({
      client: {name: sale.clienteNombre || t('ticket.finalConsumer')},
      items: sale.items.map(l => ({description: l.name, quantity: l.qty, unitPrice: l.price, taxRate: ivaPct})),
    }),
  });
  if(!createRes.ok) throw new Error(`FacturaHub (crear factura) respondió ${createRes.status}`);
  const created = await createRes.json();
  const invoiceId = created._id || created.id;
  if(!invoiceId) throw new Error('FacturaHub no devolvió un id de factura');

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
  const ivaPct = verifactuIvaPct();
  const body = {
    fecha: sale.date,
    cliente: sale.clienteNombre || null,
    lineas: sale.items.map(l => ({descripcion: l.name, cantidad: l.qty, precioUnitario: l.price, ivaPct})),
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
  const pending = DB.sales.filter(s => s.verifactu && s.verifactu.status === 'pending');
  if(!pending.length) return;
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
  if(tc.mostrarTelefono !== false && b.phone) lines.push('Tel: ' + b.phone);
  if(tc.mostrarWeb && b.web) lines.push(b.web);
  if(tc.mostrarNif !== false && b.cif) lines.push('NIF/CIF: ' + b.cif);
  return lines;
}

function buildTicketText(sale, opts={}){
  const tc = (DB.business && DB.business.ticket) || {};
  const lines = [...buildTicketHeaderLines()];
  if(opts.factura) lines.push(t('ticket.invoiceNumber') + ' ' + sale.facturaNum);
  lines.push(sale.date);
  lines.push(`${sale.tipo==='mesa'?t('label.table'):sale.express?t('label.expressOrder'):sale.tipo==='delivery'?t('label.delivery'):t('label.takeAway')}${sale.clienteNombre?' - '+sale.clienteNombre:''}`);
  lines.push('------------------------------');
  sale.items.forEach(l => lines.push(`${fmtNum(l.qty)} x ${l.name}`.padEnd(28) + fmtMoney(l.price*l.qty)));
  lines.push('------------------------------');
  if(sale.descuentoImporte) lines.push(`${t('label.discount')} (${sale.descuentoPct}%): -${fmtMoney(sale.descuentoImporte)}`);
  if(sale.propina) lines.push(`${t('label.tip')}: ${fmtMoney(sale.propina)}`);
  const ivaPct = tc.ivaPct != null ? tc.ivaPct : 10;
  const base = sale.total / (1 + ivaPct/100);
  const iva = sale.total - base;
  lines.push(`${t('ticket.taxBase')}: ${fmtMoney(base)}`);
  lines.push(`${t('common.vat')} (${ivaPct}%): ${fmtMoney(iva)}`);
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
  return lines.join('\n');
}

function printTicket(sale, opts={}){
  const text = buildTicketText(sale, opts);
  const qrHtml = (sale.verifactu && sale.verifactu.status === 'sent' && sale.verifactu.qrData)
    ? `<div style="text-align:center;margin-top:10px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(sale.verifactu.qrData)}" style="width:120px;height:120px"></div>`
    : '';
  const win = window.open('', '_blank', 'width=320,height=520');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${opts.factura?'Factura':'Ticket'}</title></head><body style="font-family:monospace;padding:16px;font-size:12px;white-space:pre-wrap">${escapeHtml(text)}${qrHtml}</body></html>`);
  win.document.close();
  win.print();
}

// Asigna un número de factura secuencial (solo la primera vez) e imprime
// una factura simplificada con desglose de IVA según la configuración del ticket.
function printInvoice(saleId){
  const sale = DB.sales.find(s => s.id === saleId);
  if(!sale) return;
  if(!sale.facturaNum){
    DB.business.facturaCounter = (DB.business.facturaCounter||0) + 1;
    const year = (sale.date || todayStr()).slice(0,4);
    sale.facturaNum = `${year}-${String(DB.business.facturaCounter).padStart(5,'0')}`;
    saveDB();
  }
  printTicket(sale, {factura:true});
}

// Abre el cliente de correo del usuario con el ticket en el cuerpo del mensaje.
function sendTicketByEmail(saleId){
  const sale = DB.sales.find(s => s.id === saleId);
  if(!sale) return;
  const email = (prompt(t('ticket.promptClientEmail'), '')||'').trim();
  if(!email) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast(t('msg.invalidEmail')); return; }
  const subject = t('ticket.emailSubject').replace('${biz}', DB.business.name || 'GastroGoan');
  const body = buildTicketText(sale);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showToast(t('msg.openingEmail'));
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
    </div>
  `);
}

