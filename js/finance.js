/* ============================================================
   DASHBOARD
   ============================================================ */
// g.importe (vía gfMonthlyImporte) es la base mensual sin IVA — el IVA se
// añade encima para el total, nunca se extrae de un total que ya lo llevara.
function geTotalFijosNeto(){
  return (DB.ge.fijos||[]).reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
function geTotalFijos(){
  return (DB.ge.fijos||[]).reduce((s,g)=>{const m=gfMonthlyImporte(g);const p=g.iva!=null?parseFloat(g.iva):0;return s+m*(1+p/100);},0);
}
// Solo la parte de "gastos fijos" que es coste de personal (nóminas), para
// poder mostrar el coste de personal como % de la facturación junto al food
// cost — los dos números de "prime cost" que todo dueño de restaurante mira
// juntos.
function geTotalPersonalNeto(){
  return (DB.ge.fijos||[]).filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
// Registra un punto en el histórico de gastos fijos (uno por día como
// máximo: si ya se tocó algo hoy, se sobrescribe con el valor final del
// día en vez de acumular varias entradas). Se llama tras cada alta/edición/
// baja de un gasto fijo. Guarda tanto el total neto como el total con IVA,
// para poder reconstruir después también el IVA soportado histórico (no
// solo el resultado neto) — importante de cara a la liquidación trimestral.
function snapshotGeFijosNeto(){
  if(!DB.ge.fijosLog) DB.ge.fijosLog = [];
  const today = todayStr();
  const totalNeto = geTotalFijosNeto();
  const totalGross = geTotalFijos();
  const personalNeto = geTotalPersonalNeto();
  const gfNeto = totalNeto - personalNeto;
  const existing = DB.ge.fijosLog.find(e => e.fecha === today);
  if(existing){ existing.totalNeto = totalNeto; existing.totalGross = totalGross; existing.personalNeto = personalNeto; existing.gfNeto = gfNeto; }
  else DB.ge.fijosLog.push({fecha: today, totalNeto, totalGross, personalNeto, gfNeto});
}
// Valor del histórico de gastos fijos "vigente" a fecha de un mes concreto:
// el último punto anterior o igual al último día de ese mes. Si no hay
// ningún punto anterior (el histórico empezó después), se usa el más
// antiguo conocido en vez de la configuración de hoy, por ser una mejor
// estimación de lo que probablemente había entonces. Sin histórico todavía
// (negocio recién empezado a usar la app), se cae en la configuración
// actual, igual que el comportamiento de siempre.
function geFijosLogValueForMonth(year, month, field){
  const log = DB.ge.fijosLog || [];
  if(!log.length) return null;
  const endOfMonth = dateStr(new Date(year, month+1, 0));
  const sorted = [...log].sort((a,b) => a.fecha.localeCompare(b.fecha));
  const upTo = sorted.filter(e => e.fecha <= endOfMonth);
  return upTo.length ? upTo[upTo.length-1][field] : sorted[0][field];
}
function geTotalFijosNetoForMonth(year, month){
  const v = geFijosLogValueForMonth(year, month, 'totalNeto');
  return v==null ? geTotalFijosNeto() : v;
}
function geTotalFijosGrossForMonth(year, month){
  const v = geFijosLogValueForMonth(year, month, 'totalGross');
  return v==null ? geTotalFijos() : v;
}
// IVA soportado en gastos fijos de un mes concreto, a partir del histórico
// (gross - neto de ese momento), en vez de recalcularlo siempre con la
// configuración actual de gastos fijos.
function geIvaSoportadoFijosForMonth(year, month){
  return geTotalFijosGrossForMonth(year, month) - geTotalFijosNetoForMonth(year, month);
}
// Igual que geTotalFijosNetoForMonth pero para el desglose PERSONAL vs resto
// de fijos (GF), necesario en Tesorería para no mezclar la configuración de
// hoy con la de un mes pasado. Los puntos del histórico anteriores a este
// desglose (personalNeto/gfNeto) no tienen estos campos: en ese caso se cae
// en la configuración actual, igual que el resto de fallbacks del histórico.
function geTotalPersonalNetoForMonth(year, month){
  const v = geFijosLogValueForMonth(year, month, 'personalNeto');
  return v==null ? geTotalPersonalNeto() : v;
}
function geTotalGFNetoForMonth(year, month){
  const v = geFijosLogValueForMonth(year, month, 'gfNeto');
  return v==null ? (geTotalFijosNeto() - geTotalPersonalNeto()) : v;
}
// True si TODO el año consultado es anterior al primer punto del histórico
// (es decir, no tenemos ningún dato real de cómo eran los gastos fijos en
// esas fechas y se está usando la estimación más antigua conocida como
// aproximación) — para poder avisar solo en ese caso, no siempre.
function geFijosHistoryPredatesYear(year){
  const log = DB.ge.fijosLog || [];
  if(!log.length) return true;
  const earliestYear = parseInt([...log].sort((a,b)=>a.fecha.localeCompare(b.fecha))[0].fecha.slice(0,4));
  return year < earliestYear;
}
// Importe mensual equivalente de un gasto fijo: si se paga cada X meses (trimestral, anual...),
// se reparte el importe entre esos meses para poder sumarlo junto a los gastos mensuales.
function gfMonthlyImporte(g){
  return parseFloat(g.importe||0) / (parseInt(g.periodicidadMeses)||1);
}
// v.importe es la base sin IVA (como en Ingredientes/Escandallo/Carta/Fijos):
// el IVA se AÑADE encima para el total con IVA, nunca se extrae de un total
// que ya lo llevara incluido.
function geTotalVariablesNetoMes(year, month){
  return (DB.ge.variables||[]).filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
function geTotalVariablesMes(year, month){
  const ivaDefault = (DB.ge?.config?.ivaComprasPct!=null) ? parseFloat(DB.ge.config.ivaComprasPct) : 10;
  return (DB.ge.variables||[]).filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>{const p=v.iva!=null?parseFloat(v.iva):ivaDefault;return s+parseFloat(v.importe||0)*(1+p/100);},0);
}
// Ventas anuladas (ver requestCancelSale/tpv.js) se excluyen de todas las
// cifras de facturación: siguen en DB.sales por trazabilidad, pero no son
// ingreso real.
function activeSales(){
  return (DB.sales||[]).filter(s => s.status !== 'anulada');
}
function salesTotalForRange(startDate, endDate){
  return activeSales().filter(s=>s.date>=startDate && s.date<=endDate).reduce((sum,s)=>sum+s.total,0);
}
function salesTotalForMonth(year, month){
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const end = `${year}-${String(month+1).padStart(2,'0')}-31`;
  return salesTotalForRange(start, end);
}
function salesTotalForDate(dateStr){
  return salesTotalForRange(dateStr, dateStr);
}
function daysInMonth(year, month){
  return new Date(year, month+1, 0).getDate();
}
// Gastos variables (compras) registrados con fecha concreta dentro del rango
// (sin IVA) — v.importe ya es la base, no hace falta extraer nada.
function geVariablesTotalForRange(startDate, endDate){
  return (DB.ge.variables||[]).filter(v=>v.fecha && v.fecha>=startDate && v.fecha<=endDate).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
// Los gastos fijos son mensuales: se prorratean por día para poder mostrar "gastos de hoy/semana" (sin IVA).
// Usa el histórico de gastos fijos vigente en CADA día (no la configuración de HOY, que
// podía dar un número incorrecto para "ayer"/"hace 7 días" si los gastos fijos cambiaron
// de un día para otro — el mismo tipo de bug ya corregido esta sesión para Gestión Económica).
function geFijosForRange(startDate, endDate){
  // geTotalFijosNetoForMonth() reordena TODO el histórico de gastos fijos en
  // cada llamada (ver geFijosLogValueForMonth) — para no repetir ese trabajo
  // en cada día del rango (y para no repetirlo varias veces dentro del mismo
  // mes, ya que el valor no cambia día a día), se ordena una sola vez aquí y
  // se cachea el resultado por mes.
  const monthCache = {};
  let total = 0;
  let d = new Date(startDate+'T00:00:00');
  const end = new Date(endDate+'T00:00:00');
  while(d <= end){
    const year = d.getFullYear(), month = d.getMonth();
    const cacheKey = `${year}-${month}`;
    if(!(cacheKey in monthCache)) monthCache[cacheKey] = geTotalFijosNetoForMonth(year, month);
    const fijosMonth = monthCache[cacheKey];
    if(fijosMonth) total += fijosMonth / daysInMonth(year, month);
    d.setDate(d.getDate()+1);
  }
  return total;
}
function geGastosTotalForRange(startDate, endDate){
  return geVariablesTotalForRange(startDate, endDate) + geFijosForRange(startDate, endDate);
}
// Facturación NETA (sin IVA) de un mes, a partir del IVA real de cada línea
// de venta (line.ivaPct) — mismo criterio que ventasIvaGroups/
// facturacionNetaMes dentro del módulo Gestión Económica (js/hr.js), pero
// como funciones globales reutilizables desde el Dashboard sin depender de
// los closures internos de GE. Antes el "Resultado del mes" del Dashboard
// se calculaba como facturación CON IVA (salesTotalForMonth) menos gastos
// SIN IVA (netos), lo que inflaba el resultado mostrado en un 10-21% —
// y encima nunca restaba comisiones de plataformas de delivery ni cuotas
// de inversiones CAPEX financiadas, a diferencia de GE → Resultado/CDR
// (resultadoAntesImpMes), que sí lo hacen bien. Con esto el Dashboard usa
// exactamente la misma fórmula que esas dos pestañas.
function geVentasIvaGroupsMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const fallbackRate = (DB.business.ticket && DB.business.ticket.ivaPct!=null) ? parseFloat(DB.business.ticket.ivaPct) : 10;
  const groups = {};
  activeSales().filter(v=>(v.date||'').startsWith(mesStr)).forEach(sale => {
    const descPct = parseFloat(sale.descuentoPct)||0;
    (sale.items||[]).forEach(line => {
      const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
      if(grossLine <= 0) return;
      const rate = line.ivaPct != null ? parseFloat(line.ivaPct) : fallbackRate;
      const base = grossLine / (1 + rate/100);
      if(!groups[rate]) groups[rate] = {base:0, iva:0};
      groups[rate].base += base;
      groups[rate].iva += grossLine - base;
    });
  });
  return groups;
}
function geFacturacionNetaMes(year, month){
  return Object.values(geVentasIvaGroupsMes(year, month)).reduce((s,g)=>s+g.base, 0);
}
// Comisiones de plataformas de delivery (Glovo, Uber Eats...) cobradas en
// ventas del mes, en BASE (sin IVA) — igual que comisionesMes en GE
// (js/hr.js): sale.comisionPlataforma se guarda con el IVA de la plataforma
// ya sumado, hay que descontarlo para no mezclar un bruto con el resto de
// cifras netas de esta fórmula.
function geComisionesMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  return activeSales().filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v) => {
    const bruto = parseFloat(v.comisionPlataforma||0);
    if(!bruto) return s;
    const ivaPct = (v.plataforma && v.plataforma.ivaPct!=null) ? parseFloat(v.plataforma.ivaPct) : 0;
    return s + bruto / (1 + ivaPct/100);
  }, 0);
}
// Cuota mensual de inversiones CAPEX financiadas a plazos, mientras dure el pago.
function geCapexCuotaMes(year, month){
  return (DB.ge.capex||[]).filter(c=>c.financiado && c.cuotaMensual && c.fecha).reduce((s,c)=>{
    const [fy,fm] = c.fecha.split('-').map(Number);
    const elapsed = (year*12+month) - (fy*12+(fm-1));
    const cuotas = parseInt(c.cuotas)||0;
    return s + (elapsed>=0 && elapsed<cuotas ? parseFloat(c.cuotaMensual||0) : 0);
  }, 0);
}
// Resultado antes de impuestos de un mes: facturación neta menos todos los
// gastos netos — misma fórmula que GE → Resultado/CDR (resultadoAntesImpMes).
function geResultadoAntesImpMes(year, month){
  return geFacturacionNetaMes(year,month) - geTotalVariablesNetoMes(year,month) - geTotalFijosNetoForMonth(year,month) - geComisionesMes(year,month) - geCapexCuotaMes(year,month);
}
function renderDashboardBarTrend(elId, trend, allowNegative){
  const maxVal = Math.max(...trend.map(t=>Math.abs(t.value)), 1);
  document.getElementById(elId).innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:6px;height:140px">
      ${trend.map(t => {
        const color = (allowNegative && t.value < 0) ? 'var(--red)' : 'var(--brand-orange)';
        return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">${t.value!==0?fmtMoney(t.value):''}</div>
          <div style="width:100%;background:${color};border-radius:4px 4px 0 0;height:${Math.max(2,(Math.abs(t.value)/maxVal*100))}%"></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${t.label}</div>
        </div>
      `}).join('')}
    </div>
  `;
}

function renderDashboard(){
  const today = new Date();
  const todayDate = todayStr();
  const yesterdayDate = dateStr(new Date(today.getTime() - 86400000));
  const lastWeekSameDayDate = dateStr(new Date(today.getTime() - 7*86400000));
  const weekAgo = dateStr(new Date(today.getTime() - 6*86400000));
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;

  const hasAnySales = DB.sales.length > 0;

  // Sales analysis (last 30 days): avg ticket, top products, sales by hour
  const last30Start = dateStr(new Date(today.getTime() - 29*86400000));
  const salesLast30 = activeSales().filter(s=>s.date>=last30Start && s.date<=todayDate);
  const totalLast30 = salesLast30.reduce((s,x)=>s+x.total,0);
  const avgTicket = salesLast30.length ? totalLast30 / salesLast30.length : 0;

  // % Food Cost medio ponderado por unidades vendidas en los últimos 30 días,
  // para que un plato sin ventas no distorsione el indicador frente al objetivo.
  const recipeUnits30 = {};
  salesLast30.forEach(s=>{
    (s.items||[]).forEach(it=>{
      if(it.recipeId) recipeUnits30[it.recipeId] = (recipeUnits30[it.recipeId]||0) + (it.qty||1);
    });
  });
  let avgFoodCost = 0;
  const weightedFc = DB.recipes
    .map(r => ({pct: recipeFoodCostPct(r), units: recipeUnits30[r.id]||0}))
    .filter(e => isFinite(e.pct) && e.units>0);
  const weightedFcUnits = weightedFc.reduce((s,e)=>s+e.units,0);
  if(weightedFcUnits > 0){
    avgFoodCost = weightedFc.reduce((s,e)=>s+e.pct*e.units,0) / weightedFcUnits;
  } else if(DB.recipes.length){
    const pcts = DB.recipes.map(r => recipeFoodCostPct(r)).filter(p => isFinite(p));
    if(pcts.length) avgFoodCost = pcts.reduce((a,b)=>a+b,0) / pcts.length;
  }

  /* ---------- Hoy — Atención (acciones a un vistazo) ---------- */
  const openOrders = DB.tpvOrders.filter(o => o.status==='abierta').length;
  const clockedIn = DB.employees.filter(e => getOpenFichaje(e.id)).length;
  const pendingReservations = DB.reservations.filter(r => r.date===todayDate && !r.llegada && (r.status==='confirmada'||r.status==='pendiente')).length;
  const tomorrowDate = dateStr(new Date(today.getTime() + 86400000));
  const tomorrowReservations = DB.reservations.filter(r => r.date===tomorrowDate && !r.llegada && (r.status==='confirmada'||r.status==='pendiente')).length;
  // Incluye tanto ingredientes (sin contar los descatalogados, que ya no se
  // reponen y no deberían generar aviso) como elaboraciones (fondos, salsas,
  // caldos) por debajo de mínimo — antes el aviso principal del dashboard
  // solo miraba ingredientes, así que un fondo agotado no se notaba aquí.
  const lowStockIngCount = DB.ingredients.filter(ing => (ing.area||'cocina')===currentArea() && ing.activo !== false && getStockEntry(ing.id).qty <= getStockEntry(ing.id).min).length;
  const lowStockElabCount = (DB.elaboraciones||[]).filter(e => (e.area||'cocina')===currentArea() && (e.qty||0) <= (e.min||0)).length;
  const lowStockCount = lowStockIngCount + lowStockElabCount;
  // Antes el mantenimiento vencido (control de plagas, revisiones, etc.) solo
  // se veía si entrabas manualmente a la pestaña de Limpieza > Mantenimiento —
  // aquí se avisa igual que con el stock bajo, para que no pase desapercibido.
  const overdueMaintenanceCount = ((DB.limpieza && DB.limpieza.mantenimiento) || []).filter(e => limpiezaMantenimientoDueStatus(e) === 'overdue').length;
  // Misma idea que el mantenimiento, pero para la próxima revisión de
  // control de plagas (pestaña Plagas) — antes no se avisaba de esta en el
  // panel, solo entrando a mano a esa pestaña.
  const overduePestControlCount = ((DB.limpieza && DB.limpieza.plagas) || []).filter(e => limpiezaMantenimientoDueStatus({proximo: e.proxima}) === 'overdue').length;
  // Facturas de proveedor (generadas automáticamente al recibir un pedido)
  // con fecha de pago ya vencida y todavía sin marcar como pagadas — para
  // no acumular sorpresas de tesorería por puro despiste.
  const overdueInvoicesCount = (DB.ge.variables||[]).filter(v => v.fechaPago && !v.pagada && v.fechaPago < todayDate).length;
  // Repartos propios en curso (aún sin entregar) — antes solo se veían
  // entrando a TPV → Para Llevar/Delivery → Control de repartos; con esto
  // se sabe de un vistazo si hay entregas activas sin salir de Gestión.
  const activeRepartosCount = typeof getActiveRepartosOrders === 'function' ? getActiveRepartosOrders().length : 0;
  // Antes nada avisaba si un turno terminaba sin cerrar caja: quedaba a la
  // memoria de cada uno. Se avisa solo cuando ya pasó la hora de cierre de
  // hoy Y quedan ventas sin cuadrar en el periodo abierto — con el negocio
  // todavía en servicio no tiene sentido pedir un arqueo a medio turno.
  const cashClosurePendingCount = (typeof isPastTodayClosingTime === 'function' && isPastTodayClosingTime() && typeof getSalesForClosure === 'function') ? getSalesForClosure().length : 0;

  // Orden pensado por urgencia/tipo, no por casualidad de cuándo se añadió
  // cada chip: primero lo que de verdad necesita una acción (avisos en
  // rojo — son literalmente lo más "atención" de toda la fila), luego lo
  // que está pasando ahora mismo en el negocio (mesas, repartos, personal),
  // y al final lo que mira hacia adelante (reservas de hoy y mañana).
  const attentionItems = [
    {count: lowStockCount, icon:'ti-alert-triangle', label: t('dash.att.lowStock'), onclick: `dashboardGoToStockAlerts()`, warn:true},
    {count: overdueMaintenanceCount, icon:'ti-tool', label: t('dash.att.overdueMaintenance'), onclick: `navigate('limpieza'); setLimpiezaTab('mantenimiento')`, warn:true},
    {count: overduePestControlCount, icon:'ti-bug', label: t('dash.att.overduePestControl'), onclick: `navigate('limpieza'); setLimpiezaTab('plagas')`, warn:true},
    {count: overdueInvoicesCount, icon:'ti-file-invoice', label: t('dash.att.overdueInvoices'), onclick: `navigate('economia'); GE.tab('variables'); openPendingInvoicesModal()`, warn:true},
    {count: cashClosurePendingCount, icon:'ti-cash-register', label: t('dash.att.cashClosurePending'), onclick: `navigate('tpv'); openCashClosureModal()`, warn:true},
    {count: openOrders, icon:'ti-tools-kitchen-2', label: t('dash.att.openOrders'), onclick: `navigate('tpv')`},
    {count: activeRepartosCount, icon:'ti-moped', label: t('dash.att.activeDeliveries'), onclick: `navigate('tpv'); openRepartosControlModal()`},
    {count: clockedIn, icon:'ti-clock-check', label: t('dash.att.clockedIn'), onclick: `navigate('horarios')`},
    {count: pendingReservations, icon:'ti-calendar-event', label: t('dash.att.pendingReservations'), onclick: `navigate('reservas')`},
    {count: tomorrowReservations, icon:'ti-calendar-plus', label: t('dash.att.tomorrowReservations'), onclick: `navigate('reservas'); goToReservasDia('${tomorrowDate}')`},
  ];
  const anyAttention = attentionItems.some(i => i.count > 0);
  document.getElementById('dashboard-attention').innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${attentionItems.map(i => `
        <div onclick="${i.onclick}" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:var(--surface);${i.count===0?'opacity:.45':''}${i.count>0 && i.warn?';border-color:var(--red);color:var(--red)':''}">
          <i class="ti ${i.icon}" style="font-size:18px"></i>
          <strong style="font-size:16px">${i.count}</strong>
          <span style="font-size:12.5px;color:${i.count>0 && i.warn?'var(--red)':'var(--muted)'}">${i.label}</span>
        </div>
      `).join('')}
    </div>
    ${anyAttention ? '' : `<div style="font-size:12.5px;color:var(--muted);margin-top:4px">${t('dash.att.allQuiet')}</div>`}
  `;

  /* ---------- Hero: venta de hoy + comparativas ---------- */
  const todaySales = salesTotalForDate(todayDate);
  const salesToday = activeSales().filter(s=>s.date===todayDate);
  const todayTicketCount = salesToday.length;
  const todayAvgTicket = todayTicketCount ? todaySales / todayTicketCount : 0;

  function heroDelta(compareDate){
    const compareSales = salesTotalForDate(compareDate);
    if(compareSales <= 0) return todaySales>0 ? null : 0; // null = sin referencia real para comparar
    return ((todaySales - compareSales) / compareSales) * 100;
  }
  const deltaYesterday = heroDelta(yesterdayDate);
  const deltaLastWeek = heroDelta(lastWeekSameDayDate);
  function deltaBadge(delta, label){
    if(delta===null) return `<span class="badge badge-gray">${label}: —</span>`;
    const cls = delta>=0 ? 'badge-green' : 'badge-red';
    const sign = delta>=0 ? '+' : '';
    return `<span class="badge ${cls}"><i class="ti ${delta>=0?'ti-arrow-up':'ti-arrow-down'}"></i> ${sign}${delta.toFixed(1)}% ${label}</span>`;
  }

  document.getElementById('dashboard-hero').innerHTML = !hasAnySales ? `
    <div class="card" style="text-align:center;padding:32px 20px">
      <i class="ti ti-chart-line" style="font-size:32px;color:var(--border);display:block;margin-bottom:8px"></i>
      <div style="font-size:15px;color:var(--muted)">${t('dash.noSalesYet')}</div>
    </div>
  ` : `
    <div class="card" style="text-align:center">
      <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600">${t('dash.hero.salesToday')}</div>
      <div style="font-size:44px;font-weight:800;margin:6px 0;line-height:1">${fmtMoney(todaySales)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px">
        ${deltaBadge(deltaYesterday, t('dash.hero.vsYesterday'))}
        ${deltaBadge(deltaLastWeek, t('dash.hero.vsLastWeek'))}
      </div>
      <div style="display:flex;gap:24px;justify-content:center;font-size:13px;color:var(--muted)">
        <div>${t('dash.hero.ticketsToday')}: <strong style="color:var(--text)">${todayTicketCount}</strong></div>
        <div>${t('dash.avgTicket')}: <strong style="color:var(--text)">${fmtMoney(todayAvgTicket)}</strong></div>
      </div>
    </div>
  `;

  // Esta semana (ventas y gastos): datos que no se muestran en ningún otro sitio del dashboard.
  const weekSales = salesTotalForRange(weekAgo, todayDate);
  const weekGastos = geGastosTotalForRange(weekAgo, todayDate);
  document.getElementById('dashboard-period-kpis').innerHTML = `
    <div class="kpi"><div class="label"><i class="ti ti-calendar-week"></i> ${t('dash.salesLast7Days')}</div><div class="value">${fmtMoney(weekSales)}</div></div>
    <div class="kpi"><div class="label"><i class="ti ti-calendar-week"></i> ${t('dash.expensesLast7Days')}</div><div class="value">${fmtMoney(weekGastos)}</div></div>
  `;

  // Carga de reservas de los próximos 7 días (comensales esperados por día),
  // para planificar personal y compras con antelación en vez de reaccionar
  // solo a hoy/mañana. Igual que en el resto de la app, las canceladas/
  // no-show/lista de espera no cuentan como cobertura real esperada.
  {
    const weekResHtml = document.getElementById('dashboard-reservations-week');
    const days = Array.from({length:7}, (_,i) => dateStr(new Date(today.getTime() + i*86400000)));
    const dayCovers = days.map(ds => {
      const covers = DB.reservations
        .filter(r => r.date===ds && (r.status==='confirmada'||r.status==='pendiente'))
        .reduce((s,r) => s+(r.people||0), 0);
      return {ds, covers};
    });
    const maxCovers = Math.max(...dayCovers.map(d=>d.covers), 1);
    const anyReservations = dayCovers.some(d=>d.covers>0);
    weekResHtml.innerHTML = !anyReservations ? `<div class="empty">${t('dash.noUpcomingReservations')}</div>` : `
      <div style="display:flex;align-items:flex-end;gap:6px;height:120px">
        ${dayCovers.map(({ds,covers},i) => {
          const d = new Date(ds+'T00:00:00');
          const isToday = ds === todayDate;
          return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:pointer" onclick="navigate('reservas');goToReservasDia('${ds}')" title="${t('dash.viewReservationsDay')}">
            <div style="font-size:11px;font-weight:700;color:var(--brand-orange);margin-bottom:2px">${covers||''}</div>
            <div style="width:100%;background:${isToday?'var(--brand-orange)':'var(--teal)'};border-radius:4px 4px 0 0;height:${Math.max(2,(covers/maxCovers*100))}%"></div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${weekDayShort(d.getDay()===0?6:d.getDay()-1)}<br>${d.getDate()}/${d.getMonth()+1}</div>
          </div>
        `;}).join('')}
      </div>
    `;
  }

  // Resultado del mes (P&L) — única fuente de verdad para las cifras del mes en curso.
  // "Facturación" se muestra CON IVA (lo que de verdad ha entrado en caja,
  // como en GE → CDR), pero el "Resultado" se calcula sobre la facturación
  // NETA y todos los gastos netos, exactamente igual que GE → Resultado/CDR
  // (geResultadoAntesImpMes) — antes mezclaba facturación bruta con gastos
  // netos y no restaba comisiones de delivery ni cuotas CAPEX, ver comentario
  // en geResultadoAntesImpMes.
  const year = today.getFullYear();
  const month = today.getMonth();
  const facturacion = salesTotalForMonth(year, month);
  const variables = geTotalVariablesNetoMes(year, month);
  const fijos = geTotalFijosNetoForMonth(year, month);
  const resultado = geResultadoAntesImpMes(year, month);

  const facturacionNeta = geFacturacionNetaMes(year, month);
  const fcPct = avgFoodCost;
  // Los % se calculan sobre la facturación NETA (sin IVA), no la bruta: el
  // IVA no es un ingreso real del negocio, así que dividir entre facturación
  // con IVA infla artificialmente estos ratios (más cuanto más alto el tipo
  // de IVA aplicado). Mismo criterio que food cost/prime cost, que ya se
  // calculaban así.
  const margenPct = facturacionNeta > 0 ? (resultado/facturacionNeta)*100 : 0;
  const personalCost = geTotalPersonalNetoForMonth(year, month);
  const staffCostPct = facturacionNeta > 0 ? (personalCost/facturacionNeta)*100 : 0;
  const hasFoodCost = weightedFcUnits>0||DB.recipes.length;
  const primeCostPct = (hasFoodCost?fcPct:0) + staffCostPct;
  document.getElementById('dashboard-resultado').innerHTML = `
    <div class="grid grid-4">
      <div class="kpi"><div class="label">${t('dash.revenueMonth')}</div><div class="value">${fmtMoney(facturacion)}</div></div>
      <div class="kpi"><div class="label">${t('hr.lbl.variableExpensesNoVat')}</div><div class="value">${fmtMoney(variables)}</div></div>
      <div class="kpi"><div class="label">${t('hr.lbl.fixedNoVat')}</div><div class="value">${fmtMoney(fijos)}</div></div>
      <div class="kpi ${resultado>=0?'ok':'warn'}"><div class="label">${t('dash.result')}</div><div class="value">${fmtMoney(resultado)}</div></div>
    </div>
    <div style="margin-top:8px;font-size:13px;color:var(--muted)">
      ${t('dash.marginOnSales')} <strong style="color:${resultado>=0?'var(--green)':'var(--red)'}">${facturacion>0?margenPct.toFixed(1)+'%':'—'}</strong>
      &nbsp;·&nbsp; ${t('dash.avgFoodCost')} <strong style="color:${fcPct>35?'var(--red)':'var(--green)'}">${hasFoodCost?fcPct.toFixed(1)+'%':'—'}</strong> ${t('dash.foodCostTarget').replace('${n}', DB.ge.config.foodCostObj||35)}
      &nbsp;·&nbsp; ${t('dash.staffCostPct')} <strong style="color:${staffCostPct>30?'var(--red)':'var(--green)'}">${facturacion>0&&personalCost>0?staffCostPct.toFixed(1)+'%':'—'}</strong>
      ${facturacion>0 && personalCost>0 && hasFoodCost ? `&nbsp;·&nbsp; ${t('dash.primeCost')} <strong style="color:${primeCostPct>65?'var(--red)':'var(--green)'}">${primeCostPct.toFixed(1)}%</strong>` : ''}
    </div>
  `;

  // Comparación de ventas / gastos / resultado del año (12 meses)
  const ventasTrend = [];
  const gastosTrend = [];
  const resultadoTrend = [];
  for(let i=11; i>=0; i--){
    const d = new Date(year, month - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const sales = salesTotalForMonth(y, m);
    const variablesM = geTotalVariablesNetoMes(y, m);
    const fijosM = geTotalFijosNetoForMonth(y, m);
    const label = monthFull(m).slice(0,3);
    ventasTrend.push({label, value: sales});
    gastosTrend.push({label, value: variablesM + fijosM});
    // Misma fórmula que el KPI "Resultado del mes" de arriba (facturación
    // neta menos todos los gastos netos, incluidas comisiones y CAPEX) —
    // antes aquí se restaban gastos netos de la facturación CON IVA.
    resultadoTrend.push({label, value: geResultadoAntesImpMes(y, m)});
  }
  if(hasAnySales){
    renderDashboardBarTrend('dashboard-trend-ventas', ventasTrend);
    renderDashboardBarTrend('dashboard-trend-gastos', gastosTrend);
    renderDashboardBarTrend('dashboard-trend-resultado', resultadoTrend, true);
  } else {
    const emptyMsg = `<div class="empty">${t('dash.noSalesYet')}</div>`;
    document.getElementById('dashboard-trend-ventas').innerHTML = emptyMsg;
    document.getElementById('dashboard-trend-gastos').innerHTML = emptyMsg;
    document.getElementById('dashboard-trend-resultado').innerHTML = emptyMsg;
  }

  const productTotals = {};
  salesLast30.forEach(s=>{
    (s.items||[]).forEach(it=>{
      const key = it.name || '—';
      productTotals[key] = (productTotals[key]||0) + (it.price||0) * (it.qty||1);
    });
  });
  const topProducts = Object.entries(productTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Margen bruto real por plato (últimos 30 días) — coste estampado en el
  // momento de cada venta (costoUnitarioDeLinea), no el coste actual de la
  // receta: si no, un cambio de precio de un ingrediente HOY movería el
  // margen "real" de ventas de hace semanas cada vez que se abre el panel.
  const marginTotals = {};
  salesLast30.forEach(s=>{
    (s.items||[]).forEach(it=>{
      const key = it.name || '—';
      const qty = it.qty || 1;
      const unitCost = it.recipeId ? costoUnitarioDeLinea(it) : 0;
      const margin = ((it.price||0) - unitCost) * qty;
      if(!marginTotals[key]) marginTotals[key] = {margin:0, hasCost: !!it.recipeId};
      marginTotals[key].margin += margin;
      if(it.recipeId) marginTotals[key].hasCost = true;
    });
  });
  const topMargins = Object.entries(marginTotals)
    .filter(([,v])=>v.hasCost)
    .sort((a,b)=>b[1].margin-a[1].margin)
    .slice(0,5);

  const hourTotals = new Array(24).fill(0);
  salesLast30.forEach(s=>{
    if(s.createdAt){
      const h = new Date(s.createdAt).getHours();
      hourTotals[h] += s.total;
    }
  });
  const maxHour = Math.max(...hourTotals, 1);

  document.getElementById('dashboard-sales-analysis').innerHTML = `
    <div class="grid grid-3" style="margin-bottom:14px">
      <div class="kpi"><div class="label"><i class="ti ti-receipt"></i> ${t('dash.avgTicket')}</div><div class="value">${fmtMoney(avgTicket)}</div></div>
      <div class="kpi"><div class="label"><i class="ti ti-shopping-cart"></i> ${t('dash.numSales')}</div><div class="value">${salesLast30.length}</div></div>
      <div class="kpi"><div class="label"><i class="ti ti-cash"></i> ${t('dash.periodTotal')}</div><div class="value">${fmtMoney(totalLast30)}</div></div>
    </div>
    <div class="grid grid-3">
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">${t('dash.topSellingDishes')}</h4>
        ${topProducts.length ? `<div class="table-wrap"><table><tbody>
          ${topProducts.map(([name,total]) => `<tr style="cursor:pointer" onclick="goToEscandalloForDish('${escapeJsAttr(name)}')" title="${t('title.viewTechSpec')}"><td>${escapeHtml(name)}</td><td style="text-align:right;font-weight:600">${fmtMoney(total)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">${t('dash.noSalesRegistered')}</div>`}
      </div>
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">${t('dash.topGrossMargin')}</h4>
        ${topMargins.length ? `<div class="table-wrap"><table><tbody>
          ${topMargins.map(([name,v]) => `<tr style="cursor:pointer" onclick="goToEscandalloForDish('${escapeJsAttr(name)}')" title="${t('title.viewTechSpec')}"><td>${escapeHtml(name)}</td><td style="text-align:right;font-weight:600;color:var(--green)">${fmtMoney(v.margin)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">${t('dash.noCostDataEnough')}</div>`}
      </div>
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">${t('dash.salesByHour')}</h4>
        <div style="display:flex;align-items:flex-end;gap:2px;height:120px">
          ${hourTotals.map((v,h) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="${h}:00 - ${fmtMoney(v)}">
              <div style="width:100%;background:var(--brand-orange);border-radius:2px 2px 0 0;height:${Math.max(2,(v/maxHour*100))}%"></div>
              ${h%3===0?`<div style="font-size:9px;color:var(--muted);margin-top:2px">${h}h</div>`:''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  renderSalesHeatmap();

  // Breakeven tracking
  const cfg = DB.ge.config || {};
  const tick = parseFloat(cfg.ticketMedio) || 0;
  const cub = parseFloat(cfg.cubiertosActuales) || 0;
  const dias = parseFloat(cfg.diasApertura) || 0;
  const fc = parseFloat(cfg.foodCostObj) || 35;
  let breakevenHtml;
  if(!tick || !dias){
    breakevenHtml = `<div class="empty">${t('dash.configureBreakeven')}</div>`;
  }else{
    const cvCub = tick * (fc/100);
    const contribCub = tick - cvCub;
    if(contribCub > 0){
      const cubNec = Math.ceil(fijos / contribCub);
      const diff = cub - cubNec;
      breakevenHtml = `
        <div class="grid grid-3">
          <div class="kpi"><div class="label">${t('dash.coversNeededMonth')}</div><div class="value">${cubNec}</div></div>
          <div class="kpi"><div class="label">${t('dash.coversCurrentMonth')}</div><div class="value">${cub}</div></div>
          <div class="kpi ${diff>=0?'ok':'warn'}"><div class="label">${t('dash.difference')}</div><div class="value">${diff>=0?'+':''}${diff}</div></div>
        </div>
        <div style="margin-top:8px;font-weight:600;color:${diff>=0?'var(--green)':'var(--red)'}">
          ${diff>=0?t('hr.pe.aboveBreakeven'):`${t('hr.pe.belowBreakeven')} <span style="cursor:pointer;text-decoration:underline;font-weight:600" onclick="navigate('economia');GE.tab('fijos')">${t('dash.reviewFixedExpenses')}</span>`}
        </div>
      `;
    }else{
      breakevenHtml = `<div class="empty">${t('dash.cantCalculateFoodCost')}</div>`;
    }
  }
  document.getElementById('dashboard-breakeven').innerHTML = breakevenHtml;

  GE.renderPlatos();
}

// Mapa de calor día de la semana × franja horaria (últimas 8 semanas), para
// detectar visualmente los picos de venta y ayudar a planificar personal/compras.
function renderSalesHeatmap(){
  const el = document.getElementById('dashboard-sales-heatmap');
  if(!el) return;
  const today = new Date();
  const start = dateStr(new Date(today.getTime() - 55*86400000)); // 8 semanas
  const end = todayStr();
  const sales = activeSales().filter(s => s.date >= start && s.date <= end && s.createdAt);
  if(!sales.length){ el.innerHTML = `<div class="empty">${t('dash.noSalesYet')}</div>`; return; }

  const bands = [
    {lbl:'8-12h', from:8, to:12}, {lbl:'12-16h', from:12, to:16},
    {lbl:'16-20h', from:16, to:20}, {lbl:'20-24h', from:20, to:24},
  ];
  const dayLabels = t('days.short');
  const grid = dayLabels.map(()=>bands.map(()=>0));
  sales.forEach(s => {
    const d = new Date(s.createdAt);
    const dow = (d.getDay()+6)%7; // 0=lunes ... 6=domingo
    const hour = d.getHours();
    const bandIdx = bands.findIndex(b => hour>=b.from && hour<b.to);
    if(bandIdx>=0) grid[dow][bandIdx] += s.total;
  });
  const maxVal = Math.max(...grid.flat(), 1);
  el.innerHTML = `
    <div style="overflow-x:auto">
      <table style="border-collapse:collapse;width:100%;min-width:420px">
        <thead><tr><th></th>${bands.map(b=>`<th style="font-size:11px;color:var(--muted);font-weight:600;padding:4px">${b.lbl}</th>`).join('')}</tr></thead>
        <tbody>
          ${dayLabels.map((dl,di) => `
            <tr>
              <td style="font-size:11px;color:var(--muted);font-weight:600;padding:4px;white-space:nowrap">${dl}</td>
              ${grid[di].map(v => {
                const intensity = v/maxVal;
                const bg = v>0 ? `rgba(255,138,0,${(0.12+intensity*0.78).toFixed(2)})` : 'transparent';
                return `<td style="padding:4px"><div title="${fmtMoney(v)}" style="height:34px;border-radius:6px;background:${bg};border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${intensity>0.5?'#fff':'var(--muted)'}">${v>0?fmtMoney(v):''}</div></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
// Fecha "hoy" en base local (misma convención que dateStr, usada en toda la
// app), para evitar desajustes de un día cerca de medianoche por huso horario.
function todayStr(){
  return dateStr(new Date());
}
// Igual que todayStr() pero para mañana — usado, por ejemplo, para no
// dejar pedir a un proveedor con fecha de entrega de hoy mismo (no le da
// tiempo a prepararlo y traerlo).
function tomorrowStr(){
  const d = new Date();
  d.setDate(d.getDate()+1);
  return dateStr(d);
}
// Navega a Stock y activa el filtro "Solo alertas" (usado desde el panel
// Hoy — Atención del Dashboard).
function dashboardGoToStockAlerts(){
  navigate('stock');
  const cb = document.getElementById('stock-only-alerts');
  if(cb){ cb.checked = true; renderStock(); }
}

/* ============================================================
   MEGA LISTA — Ingredientes y proveedores
   ============================================================ */
// Llena el filtro de proveedores con los proveedores del área actual más
// cualquier proveedor que aparezca en los ingredientes (por si quedó alguno
// de un proveedor ya borrado de la lista).
function populateProviderFilter(){
  const sel = document.getElementById('megalista-filter-prov');
  if(!sel) return;
  const current = sel.value;
  const names = new Set();
  DB.providers.filter(p => (p.area||'cocina') === currentArea())
    .forEach(p => { if(p.nombre) names.add(p.nombre); });
  DB.ingredients.filter(i => (i.area||'cocina') === currentArea())
    .forEach(i => { if(i.supplier) names.add(i.supplier); });
  const sorted = [...names].sort((a,b)=>a.localeCompare(b));
  sel.innerHTML = `<option value="">${t('megalista.allProviders')}</option>` +
    sorted.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = current;
}

// Orden de la tabla de Mega Lista: clic en una cabecera ordena por esa
// columna, un segundo clic invierte el sentido.
let megalistaSortKey = 'name';
let megalistaSortDir = 1;
const MEGALISTA_COLUMNS = [
  {key:'name', label:t('megalista.colIngredient')},
  {key:'category', label:t('common.category')},
  {key:'supplier', label:t('common.supplier')},
  {key:'unit', label:t('common.unit')},
  {key:'price', label:t('megalista.colPurchase')},
  {key:'iva', label:t('megalista.colIva')},
  {key:null, label:t('label.allergens')},
  {key:null, label:''}
];
function setMegalistaSort(key){
  if(!key) return;
  if(megalistaSortKey === key) megalistaSortDir *= -1;
  else { megalistaSortKey = key; megalistaSortDir = 1; }
  renderMegalista();
}
function megalistaSortItems(items){
  return items.slice().sort((a,b) => {
    let av, bv;
    if(megalistaSortKey === 'price'){ av = a.packPrice!=null?a.packPrice:a.price; bv = b.packPrice!=null?b.packPrice:b.price; }
    else if(megalistaSortKey === 'iva'){
      // Los que todavía no tienen IVA elegido (null, no 0%) se agrupan
      // siempre al final, sea cual sea el sentido del orden — así se ven
      // de un vistazo los que faltan por revisar, en vez de intercalarse
      // de forma inconsistente por culpa de comparar null/NaN.
      const aNull = a.iva==null, bNull = b.iva==null;
      if(aNull && bNull) return 0;
      if(aNull) return 1;
      if(bNull) return -1;
      return (a.iva - b.iva) * megalistaSortDir;
    }
    else { av = (a[megalistaSortKey]||''); bv = (b[megalistaSortKey]||''); }
    if(typeof av === 'string') return av.localeCompare(bv) * megalistaSortDir;
    return ((av||0) - (bv||0)) * megalistaSortDir;
  });
}
function renderMegalistaTable(items){
  const theadHtml = MEGALISTA_COLUMNS.map(c => {
    if(!c.key) return `<th>${c.label}</th>`;
    const active = megalistaSortKey === c.key;
    const arrow = active ? (megalistaSortDir === 1 ? ' <i class="ti ti-arrow-up"></i>' : ' <i class="ti ti-arrow-down"></i>') : '';
    return `<th style="cursor:pointer;white-space:nowrap" onclick="setMegalistaSort('${c.key}')">${c.label}${arrow}</th>`;
  }).join('');
  const rowsHtml = !items.length
    ? `<tr><td colspan="8"><div class="empty"><i class="ti ti-list-details"></i>${t('empty.ingredients')}</div></td></tr>`
    : items.map(ing => `
      <tr style="${ing.activo===false?'opacity:.55':''}">
        <td data-label="${MEGALISTA_COLUMNS[0].label}"><strong>${escapeHtml(ing.name)}</strong>${ing.activo===false?` <span class="badge badge-gray" style="font-size:9px">${t('label.discontinued')}</span>`:''}</td>
        <td data-label="${MEGALISTA_COLUMNS[1].label}"><span class="badge badge-gray">${escapeHtml(ing.category?ingredientCategoryLabel(ing.category):'—')}</span></td>
        <td data-label="${MEGALISTA_COLUMNS[2].label}">${escapeHtml(ing.supplier||'—')}</td>
        <td data-label="${MEGALISTA_COLUMNS[3].label}">${escapeHtml(ing.unit)}</td>
        <td data-label="${MEGALISTA_COLUMNS[4].label}">${fmtNum(ing.packQty||1)} ${escapeHtml(ing.unit)} × ${fmtMoney(ing.packPrice!=null?ing.packPrice:ing.price)}</td>
        <td data-label="${MEGALISTA_COLUMNS[5].label}">
          <select onchange="updateIngredientIva(${ing.id}, this.value)" style="font-size:12px;padding:3px 4px;${ing.iva==null?'border-color:var(--red);color:var(--red)':''}" title="${t('label.ivaSoportado')}">
            <option value="" ${ing.iva==null?'selected':''} disabled>${t('label.chooseIva')}</option>
            ${[21,10,4,0].map(pct => `<option value="${pct}" ${ing.iva===pct?'selected':''}>${pct}%</option>`).join('')}
          </select>
        </td>
        <td class="wrap" data-label="${t('label.allergens')}">${(ing.allergens||[]).map(a=>`<span class="badge badge-amber">${escapeHtml(allergenLabel(a))}</span>`).join(' ') || '—'}</td>
        <td class="actions-cell" data-label="">
          <button class="owner-only btn btn-sm btn-icon" onclick="openIngredientModal(${ing.id})"><i class="ti ti-edit"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteIngredient(${ing.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>
    `).join('');
  // .table-cards: en móvil cada fila pasa a ser una tarjeta apilada (mismo
  // patrón que ya usan Clientes/Reservas) en vez de forzar scroll lateral —
  // esta tabla tiene 8 columnas, demasiadas para caber en una pantalla
  // estrecha de cualquier forma razonable.
  return `<div class="table-wrap"><table class="table-cards"><thead><tr>${theadHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

// Carpeta de categoría actualmente abierta en Mega Lista (null = vista de carpetas)
let megalistaFolder = null;
function openMegalistaFolder(cat){ megalistaFolder = cat; renderMegalista(); }
function backToMegalistaFolders(){ megalistaFolder = null; renderMegalista(); }

function renderMegalista(){
  maybeShowCategoryIconHint();
  populateProviderFilter();
  const search = document.getElementById('megalista-search').value.toLowerCase();
  const prov = document.getElementById('megalista-filter-prov').value;
  const box = document.getElementById('megalista-content');

  const showInactive = document.getElementById('megalista-show-inactive')?.checked;
  const items = DB.ingredients.filter(i => {
    const matchArea = (i.area||'cocina') === currentArea();
    const matchSearch = !search || i.name.toLowerCase().includes(search) || (i.supplier||'').toLowerCase().includes(search);
    const matchProv = !prov || (i.supplier||'') === prov;
    const matchActivo = showInactive || i.activo !== false;
    return matchArea && matchSearch && matchProv && matchActivo;
  });

  if(!items.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-list-details"></i>${t('empty.ingredients')}</div>`;
    return;
  }

  const searching = !!(search || prov);
  if(searching){
    box.innerHTML = renderMegalistaTable(megalistaSortItems(items));
    return;
  }

  const byCat = {};
  items.forEach(i => { const c = i.category || t('label.noCategory'); (byCat[c] = byCat[c] || []).push(i); });
  const cats = Object.keys(byCat).sort((a,b) => a.localeCompare(b));

  if(megalistaFolder === null){
    box.innerHTML = `<div class="grid grid-compact">${cats.map(cat => {
      const safeCat = cat.replace(/'/g,"\\'");
      const isCustom = !ingredientCategories().includes(cat);
      return `
      <div class="card card-compact" style="cursor:pointer" onclick="openMegalistaFolder('${safeCat}')">
        <h3>
          <span style="font-size:18px;cursor:pointer" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${safeCat}','${safeCat}','renderMegalista','ingredient')">${getCategoryIcon(cat,'ingredient')}</span>
          ${escapeHtml(ingredientCategoryLabel(cat))}
          ${isCustom ? `<button class="btn btn-sm btn-icon" style="margin-left:auto" title="${t('title.renameCategory')}" onclick="event.stopPropagation();renameIngredientCategory('${safeCat}')"><i class="ti ti-pencil"></i></button>` : ''}
        </h3>
        <div style="font-size:12px;color:var(--muted)">${byCat[cat].length===1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', byCat[cat].length)}</div>
      </div>
    `;}).join('')}</div>`;
    return;
  }

  const folderItems = byCat[megalistaFolder];
  if(!folderItems || !folderItems.length){ megalistaFolder = null; renderMegalista(); return; }
  const backBtn = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToMegalistaFolders()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>`;
  box.innerHTML = backBtn + renderMegalistaTable(megalistaSortItems(folderItems));
}

// Catálogo de materia prima básica de cocina, para no obligar a un negocio
// nuevo a dar de alta uno a uno los ingredientes más habituales de un
// restaurante español. Cada entrada es [nombre, unidad, alérgenos]; la
// categoría la pone el bloque que la contiene. El cliente solo tiene que
// rellenar precio, IVA, proveedor y cantidad de compra de los que de verdad
// usa — el resto los puede borrar o dejar descatalogados.
const BASE_INGREDIENTS_CATALOG = {
  'Verduras': {icon:'🥬', items:[
    ['Tomate','kg',[]], ['Cebolla','kg',[]], ['Ajo','kg',[]], ['Pimiento rojo','kg',[]], ['Pimiento verde','kg',[]],
    ['Calabacín','kg',[]], ['Berenjena','kg',[]], ['Patata','kg',[]], ['Zanahoria','kg',[]], ['Lechuga','ud',[]],
    ['Espinaca','kg',[]], ['Champiñón','kg',[]], ['Puerro','kg',[]], ['Pepino','kg',[]], ['Col','ud',[]],
    ['Brócoli','kg',[]], ['Calabaza','kg',[]], ['Apio','kg',['Apio']], ['Espárrago verde','kg',[]], ['Alcachofa','kg',[]],
  ]},
  'Frutas': {icon:'🍎', items:[
    ['Limón','kg',[]], ['Naranja','kg',[]], ['Manzana','kg',[]], ['Plátano','kg',[]], ['Fresa','kg',[]],
    ['Aguacate','kg',[]], ['Uva','kg',['Sulfitos']], ['Pera','kg',[]], ['Melón','ud',[]], ['Sandía','ud',[]],
    ['Piña','ud',[]], ['Kiwi','kg',[]], ['Mango','kg',[]], ['Melocotón','kg',[]], ['Frutos rojos (mix)','kg',[]],
  ]},
  'Carnes': {icon:'🥩', items:[
    ['Solomillo de ternera','kg',[]], ['Entrecot de ternera','kg',[]], ['Carne picada de ternera','kg',[]],
    ['Pechuga de pollo','kg',[]], ['Muslo de pollo','kg',[]], ['Pollo entero','kg',[]], ['Secreto ibérico','kg',[]],
    ['Solomillo de cerdo','kg',[]], ['Costilla de cerdo','kg',[]], ['Panceta','kg',[]], ['Cordero (paletilla)','kg',[]],
    ['Chuletas de cordero','kg',[]], ['Carne picada mixta','kg',[]], ['Conejo','kg',[]], ['Pato (magret)','kg',[]],
  ]},
  'Pescados y Marisco': {icon:'🐟', items:[
    ['Merluza','kg',['Pescado']], ['Salmón','kg',['Pescado']], ['Atún fresco','kg',['Pescado']], ['Bacalao','kg',['Pescado']],
    ['Lubina','kg',['Pescado']], ['Dorada','kg',['Pescado']], ['Boquerón','kg',['Pescado']], ['Sardina','kg',['Pescado']],
    ['Rape','kg',['Pescado']], ['Pulpo','kg',['Moluscos']], ['Calamar','kg',['Moluscos']], ['Sepia','kg',['Moluscos']],
    ['Gamba','kg',['Crustáceos']], ['Langostino','kg',['Crustáceos']], ['Mejillón','kg',['Moluscos']], ['Almeja','kg',['Moluscos']],
    ['Cigala','kg',['Crustáceos']], ['Marisco mixto (cocido)','kg',['Crustáceos','Moluscos']],
  ]},
  'Huevos': {icon:'🥚', items:[
    ['Huevo de gallina (docena)','ud',['Huevos']], ['Huevo de codorniz (docena)','ud',['Huevos']], ['Clara de huevo pasteurizada','L',['Huevos']],
  ]},
  'Lácteos': {icon:'🧀', items:[
    ['Leche entera','L',['Lácteos']], ['Nata para cocinar','L',['Lácteos']], ['Nata para montar','L',['Lácteos']],
    ['Mantequilla','kg',['Lácteos']], ['Queso mozzarella','kg',['Lácteos']], ['Queso parmesano','kg',['Lácteos']],
    ['Queso manchego','kg',['Lácteos']], ['Queso de cabra','kg',['Lácteos']], ['Queso crema','kg',['Lácteos']],
    ['Yogur natural','ud',['Lácteos']], ['Leche condensada','kg',['Lácteos']], ['Requesón','kg',['Lácteos']],
  ]},
  'Panes y Bollería': {icon:'🍞', items:[
    ['Pan de barra','kg',['Gluten']], ['Pan de hamburguesa','ud',['Gluten']], ['Pan de perrito','ud',['Gluten']],
    ['Pan rallado','kg',['Gluten']], ['Pan de molde','ud',['Gluten']], ['Baguette','ud',['Gluten']],
    ['Masa de pizza','kg',['Gluten']], ['Croissant','ud',['Gluten','Lácteos']], ['Bollería mixta','ud',['Gluten','Lácteos','Huevos']],
    ['Picos / colines','kg',['Gluten']],
  ]},
  'Pastas': {icon:'🍝', items:[
    ['Espagueti','kg',['Gluten']], ['Macarrón','kg',['Gluten']], ['Tallarín','kg',['Gluten']], ['Lasaña (placas)','kg',['Gluten']],
    ['Canelón (placas)','kg',['Gluten']], ['Ravioli fresco','kg',['Gluten','Huevos']], ['Ñoquis','kg',['Gluten']],
    ['Pasta fresca al huevo','kg',['Gluten','Huevos']], ['Fideos','kg',['Gluten']],
  ]},
  'Arroces': {icon:'🍚', items:[
    ['Arroz bomba','kg',[]], ['Arroz redondo','kg',[]], ['Arroz basmati','kg',[]], ['Arroz largo','kg',[]],
    ['Arroz integral','kg',[]], ['Arroz para sushi','kg',[]],
  ]},
  'Legumbres': {icon:'🫘', items:[
    ['Garbanzo seco','kg',[]], ['Lenteja','kg',[]], ['Alubia blanca','kg',[]], ['Alubia roja','kg',[]],
    ['Garbanzo cocido (bote)','kg',[]], ['Lenteja cocida (bote)','kg',[]], ['Guisante congelado','kg',[]],
    ['Haba','kg',[]], ['Soja (grano)','kg',['Soja']],
  ]},
  'Aceites y Vinagres': {icon:'🫒', items:[
    ['Aceite de oliva virgen extra','L',[]], ['Aceite de oliva suave','L',[]], ['Aceite de girasol','L',[]],
    ['Vinagre de vino','L',['Sulfitos']], ['Vinagre de Módena','L',['Sulfitos']], ['Vinagre de manzana','L',[]],
    ['Aceite de sésamo','L',['Sésamo']],
  ]},
  'Condimentos y Especias': {icon:'🧂', items:[
    ['Sal fina','kg',[]], ['Sal gruesa','kg',[]], ['Pimienta negra molida','kg',[]], ['Pimentón dulce','kg',[]],
    ['Pimentón picante','kg',[]], ['Orégano','kg',[]], ['Perejil seco','kg',[]], ['Tomillo','kg',[]], ['Romero','kg',[]],
    ['Laurel','kg',[]], ['Comino','kg',[]], ['Curry','kg',[]], ['Azafrán','g',[]], ['Ajo en polvo','kg',[]],
    ['Canela molida','kg',[]], ['Mostaza','kg',['Mostaza']], ['Salsa de soja','L',['Soja','Gluten']],
    ['Caldo concentrado (bote)','kg',['Apio']], ['Levadura fresca','kg',[]], ['Levadura química','kg',[]],
  ]},
  'Despensa': {icon:'📦', items:[
    ['Harina de trigo','kg',['Gluten']], ['Harina de maíz','kg',[]], ['Harina de repostería','kg',['Gluten']],
    ['Azúcar blanco','kg',[]], ['Azúcar moreno','kg',[]], ['Miel','kg',[]], ['Tomate triturado (bote)','kg',[]],
    ['Tomate frito (bote)','kg',[]], ['Puré de patata (copos)','kg',[]], ['Maicena','kg',[]], ['Chocolate de cobertura','kg',['Lácteos']],
    ['Frutos secos variados','kg',['Frutos de cáscara']], ['Almendra','kg',['Frutos de cáscara']], ['Piñón','kg',['Frutos de cáscara']],
    ['Aceituna (bote)','kg',[]], ['Alcaparra (bote)','kg',[]], ['Pepinillo (bote)','kg',[]],
  ]},
  'Conservas': {icon:'🥫', items:[
    ['Atún en aceite (lata)','kg',['Pescado']], ['Anchoa en aceite (lata)','kg',['Pescado']], ['Mejillón en escabeche (lata)','kg',['Moluscos']],
    ['Berberecho (lata)','kg',['Moluscos']], ['Pimiento del piquillo (bote)','kg',[]], ['Espárrago blanco (bote)','kg',[]],
    ['Maíz dulce (lata)','kg',[]], ['Champiñón en conserva (bote)','kg',[]],
  ]},
  'Embutidos y Fiambres': {icon:'🌭', items:[
    ['Jamón ibérico','kg',[]], ['Jamón serrano','kg',[]], ['Jamón cocido','kg',[]], ['Chorizo','kg',[]],
    ['Salchichón','kg',[]], ['Lomo embuchado','kg',[]], ['Bacon / panceta curada','kg',[]], ['Mortadela','kg',['Frutos de cáscara']],
    ['Salchicha fresca','kg',[]], ['Morcilla','kg',[]],
  ]},
  'Congelados': {icon:'🧊', items:[
    ['Patata prefrita congelada','kg',[]], ['Verdura congelada (mix)','kg',[]], ['Pescado congelado (surtido)','kg',['Pescado']],
    ['Marisco congelado (surtido)','kg',['Crustáceos','Moluscos']], ['Masa de hojaldre congelada','kg',['Gluten','Lácteos']],
    ['Helado (tarrina)','kg',['Lácteos']],
  ]},
  'Bebidas': {icon:'🥤', items:[
    ['Agua mineral','L',[]], ['Refresco de cola','L',[]], ['Refresco de naranja','L',[]], ['Zumo de naranja','L',[]],
    ['Café en grano','kg',[]], ['Té / infusiones','kg',[]], ['Cerveza','L',['Gluten']], ['Vino tinto','L',['Sulfitos']],
    ['Vino blanco','L',['Sulfitos']],
  ]},
};

// Igual que BASE_INGREDIENTS_CATALOG pero para el área de Sala (barra):
// aquí lo que se escandalla no es un plato sino una copa/cóctel, así que
// interesa tener el vino, el licor o el refresco desglosado por tipo, no
// agrupado en un "Bebidas" genérico como en cocina.
const BASE_INGREDIENTS_CATALOG_SALA = {
  'Vinos Blancos': {icon:'🥂', items:[
    ['Vino blanco verdejo','L',['Sulfitos']], ['Vino blanco albariño','L',['Sulfitos']], ['Vino blanco viura','L',['Sulfitos']],
    ['Vino blanco copa (genérico)','L',['Sulfitos']],
  ]},
  'Vinos Tintos': {icon:'🍷', items:[
    ['Vino tinto joven','L',['Sulfitos']], ['Vino tinto crianza','L',['Sulfitos']], ['Vino tinto reserva','L',['Sulfitos']],
    ['Vino tinto copa (genérico)','L',['Sulfitos']],
  ]},
  'Vinos Rosados': {icon:'🌸', items:[
    ['Vino rosado','L',['Sulfitos']], ['Vino rosado copa (genérico)','L',['Sulfitos']],
  ]},
  'Cavas y Espumosos': {icon:'🍾', items:[
    ['Cava brut','L',['Sulfitos']], ['Cava brut nature','L',['Sulfitos']], ['Champagne','L',['Sulfitos']], ['Vino espumoso dulce','L',['Sulfitos']],
  ]},
  'Vermús y Aperitivos': {icon:'🍹', items:[
    ['Vermut rojo','L',['Sulfitos']], ['Vermut blanco','L',['Sulfitos']], ['Jerez fino','L',['Sulfitos']], ['Jerez oloroso','L',['Sulfitos']],
  ]},
  'Cervezas': {icon:'🍺', items:[
    ['Cerveza lager (barril)','L',['Gluten']], ['Cerveza lager (botellín)','ud',['Gluten']], ['Cerveza sin alcohol','ud',['Gluten']],
    ['Cerveza tostada/rubia especial','ud',['Gluten']], ['Sidra','L',['Sulfitos']],
  ]},
  'Licores y Destilados': {icon:'🥃', items:[
    ['Ginebra','L',[]], ['Vodka','L',[]], ['Ron blanco','L',[]], ['Ron añejo','L',[]], ['Whisky','L',[]],
    ['Brandy / Coñac','L',['Sulfitos']], ['Tequila','L',[]], ['Orujo','L',[]], ['Licor de hierbas','L',[]],
    ['Amaretto','L',['Frutos de cáscara']], ['Baileys / licor de crema','L',['Lácteos']], ['Triple seco / Cointreau','L',[]],
    ['Pacharán','L',[]],
  ]},
  'Refrescos': {icon:'🥤', items:[
    ['Cola','L',[]], ['Cola sin cafeína/zero','L',[]], ['Naranja gaseosa','L',[]], ['Limón gaseosa','L',[]], ['Tónica','L',[]],
    ['Ginger ale / Ginger beer','L',[]], ['Bitter (sin alcohol)','L',[]], ['Soda','L',[]], ['Bebida energética','ud',[]],
  ]},
  'Zumos': {icon:'🧃', items:[
    ['Zumo de naranja','L',[]], ['Zumo de piña','L',[]], ['Zumo de tomate','L',[]], ['Zumo de melocotón','L',[]],
    ['Zumo de manzana','L',[]], ['Mosto','L',[]], ['Granadina','L',[]],
  ]},
  'Aguas': {icon:'💧', items:[
    ['Agua mineral con gas','L',[]], ['Agua mineral sin gas','L',[]],
  ]},
  'Café e Infusiones': {icon:'☕', items:[
    ['Café en grano','kg',[]], ['Café molido','kg',[]], ['Café descafeinado','kg',[]], ['Té negro','kg',[]], ['Té verde','kg',[]],
    ['Manzanilla','kg',[]], ['Poleo menta','kg',[]], ['Cacao en polvo','kg',['Lácteos']],
  ]},
  'Leches y Batidos': {icon:'🥛', items:[
    ['Leche entera','L',['Lácteos']], ['Leche desnatada','L',['Lácteos']], ['Leche de avena','L',[]], ['Leche de soja','L',['Soja']],
    ['Leche de almendra','L',['Frutos de cáscara']], ['Nata para café','L',['Lácteos']], ['Horchata','L',['Frutos de cáscara']],
  ]},
  'Hielo y Guarniciones': {icon:'🧊', items:[
    ['Hielo','kg',[]], ['Aceituna para cóctel','kg',[]], ['Guinda para cóctel','kg',[]], ['Sal para rimmer','kg',[]],
    ['Azúcar para rimmer','kg',[]],
  ]},
  'Despensa Sala': {icon:'📦', items:[
    ['Azúcar (sobres)','kg',[]], ['Sacarina/edulcorante (sobres)','kg',[]], ['Sirope de vainilla','L',[]], ['Sirope de caramelo','L',['Lácteos']],
    ['Angostura / bitter de cóctel','L',[]], ['Frutos secos para aperitivo','kg',['Frutos de cáscara']], ['Patatas fritas (bolsa)','kg',[]],
    ['Servilletas de barra','ud',[]], ['Palillos de cóctel','ud',[]], ['Pajitas','ud',[]],
  ]},
};

// Construye la lista de ingredientes + stock + iconos de carpeta del
// catálogo base de materia prima (cocina o sala), sin tocar DB — la llama
// loadDB() (ver js/core.js) para que cualquier negocio recién creado
// arranque ya con Mega Lista poblada, sin que nadie tenga que pulsar nada.
// idStart evita colisiones de id: se llama antes de que DB (y por tanto
// genId()) exista todavía, en el arranque en frío de un negocio nuevo.
function buildBaseIngredientsSeed(area, idStart){
  const catalog = area === 'sala' ? BASE_INGREDIENTS_CATALOG_SALA : BASE_INGREDIENTS_CATALOG;
  const ingredients = [];
  const stock = {};
  const categoryIcons = {};
  let nextId = idStart;
  Object.keys(catalog).forEach(cat => {
    const {icon, items} = catalog[cat];
    categoryIcons[cat] = icon;
    items.forEach(([name, unit, allergens]) => {
      const id = nextId++;
      ingredients.push({
        id, name, category: cat, unit, supplier: '', price: 0, packQty: 1, packPrice: 0,
        allergens: [...allergens], area, activo: true,
      });
      stock[id] = {qty:0, min:0};
    });
  });
  return {ingredients, stock, categoryIcons};
}

function openIngredientModal(id, overrideState){
  const areaProviders = DB.providers.filter(p => (p.area||'cocina') === currentArea());
  if(!areaProviders.length){
    openModal(`
      <div class="modal-header">
        <h3>${t('msg.needSupplier')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p style="font-size:13.5px;line-height:1.6">${t('msg.needSupplierDesc')}</p>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="closeModal();openProviderModal()"><i class="ti ti-building-factory-2"></i> ${t('btn.newSupplier')}</button>
      </div>
    `);
    return;
  }
  const ing = overrideState || (id ? getIngredient(id) : {name:'',category:ingredientCategories()[0],supplier:areaProviders[0].nombre,unit:currentArea()==='sala'?'ml':'g',price:0,packQty:1000,packPrice:0,allergens:[],area:currentArea()});
  const allergenChecks = ALLERGENS.map(a => `
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;margin-bottom:4px">
      <input type="checkbox" value="${a}" ${ing.allergens && ing.allergens.includes(a) ? 'checked':''} style="width:auto"> ${escapeHtml(allergenLabel(a))}
    </label>
  `).join('');

  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editIngredient') : t('title.newIngredient')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="ing-name" value="${escapeHtml(ing.name)}" placeholder="${currentArea()==='sala' ? t('ph.ingredientNameSala') : t('ph.ingredientName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="ing-category" onchange="onIngredientCategoryChange(${id||'null'})">
          ${ingredientCategories().map(c=>`<option value="${c}" ${ing.category===c?'selected':''}>${escapeHtml(ingredientCategoryLabel(c))}</option>`).join('')}
          ${DB.ingredientCategories.map(c=>`<option value="${escapeHtml(c)}" ${ing.category===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
          <option value="__new__">+ ${t('btn.newCategory')}...</option>
        </select>
      </div>
      <div class="field">
        <label>${t('common.unit')}</label>
        <select id="ing-unit" onchange="updateIngPackPrice()">
          ${UNITS.map(u=>`<option value="${u}" ${ing.unit===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.supplier')}</label>
        <select id="ing-supplier">
          ${areaProviders.map(p=>`<option value="${escapeHtml(p.nombre)}" ${ing.supplier===p.nombre?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label id="ing-pack-qty-label">${t('megalista.purchaseQtyLabel').replace('${unit}', escapeHtml(ing.unit)).replace('${hint}', ingPackQtyHint(ing.unit))}</label>
        <input type="number" id="ing-pack-qty" value="${ing.packQty!=null?ing.packQty:1000}" step="0.01" min="0.01" oninput="updateIngPackPrice()">
      </div>
      <div class="field">
        <label>${t('label.purchasePrice')}</label>
        <input type="number" id="ing-pack-price" value="${ing.packPrice!=null?ing.packPrice:ing.price}" step="0.01" min="0" oninput="updateIngPackPrice()">
      </div>
    </div>
    <div class="field">
      <label>${t('label.allergens')}</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:4px">
        ${allergenChecks}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveIngredient(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

// Ejemplo aclaratorio para la cantidad por compra, según la unidad elegida
// (kg/L a partir de la unidad "pequeña" — g/ml —, cl como fracción de litro).
function ingPackQtyHint(unit){
  if(unit === 'g') return t('megalista.hintKg');
  if(unit === 'ml') return t('megalista.hintL');
  if(unit === 'cl') return t('megalista.hintCl');
  return '';
}
function updateIngPackPrice(){
  const unit = document.getElementById('ing-unit').value;
  document.getElementById('ing-pack-qty-label').textContent = t('megalista.purchaseQtyLabel').replace('${unit}', unit).replace('${hint}', ingPackQtyHint(unit));
}

let ingredientFormStateBeforeCategory = null;
function currentIngredientFormState(id){
  const ing = id ? getIngredient(id) : {};
  const allergens = Array.from(document.querySelectorAll('#modal-box input[type="checkbox"]:checked')).map(c=>c.value);
  return {
    name: document.getElementById('ing-name').value,
    category: document.getElementById('ing-category').value,
    unit: document.getElementById('ing-unit').value,
    supplier: document.getElementById('ing-supplier').value,
    packQty: document.getElementById('ing-pack-qty').value,
    packPrice: document.getElementById('ing-pack-price').value,
    price: ing.price,
    allergens,
    area: ing.area || currentArea()
  };
}
function onIngredientCategoryChange(id){
  const sel = document.getElementById('ing-category');
  if(sel.value === '__new__'){
    ingredientFormStateBeforeCategory = currentIngredientFormState(id);
    openModal(`
      <div class="modal-header">
        <h3>${t('btn.newCategory')}</h3>
        <button class="modal-close" onclick="cancelNewIngredientCategory(${id||'null'})">&times;</button>
      </div>
      <div class="field">
        <label>${currentArea()==='sala' ? t('ph.categoryNameSala') : t('ph.categoryName')}</label>
        <input type="text" id="new-ingredient-category-name" placeholder="${currentArea()==='sala' ? t('ph.categoryNameSala') : t('ph.categoryName')}">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="cancelNewIngredientCategory(${id||'null'})">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="confirmNewIngredientCategory(${id||'null'})">${t('common.save')}</button>
      </div>
    `);
    setTimeout(()=>document.getElementById('new-ingredient-category-name')?.focus(), 50);
  }
}
// Corrige un nombre de categoría personalizada (ej. un error tipográfico al
// crearla) sin tener que mover uno a uno todos los ingredientes que la
// usan: antes, una vez creada, un nombre mal escrito se quedaba así para
// siempre — no había forma de arreglarlo, solo de crear una categoría
// nueva y reasignar ingredientes a mano.
function renameIngredientCategory(oldName){
  const nuevo = prompt(t('msg.renameCategoryPrompt'), oldName);
  if(nuevo === null) return;
  const trimmed = nuevo.trim();
  if(!trimmed || trimmed === oldName) return;
  // Solo los ingredientes de ESTA área: Cocina y Sala pueden tener, por
  // coincidencia, una categoría con el mismo nombre, y renombrarla en una
  // no debe tocar la de la otra.
  DB.ingredients.forEach(i => { if(i.category === oldName && (i.area||'cocina') === currentArea()) i.category = trimmed; });
  const idx = DB.ingredientCategories.indexOf(oldName);
  if(idx >= 0) DB.ingredientCategories.splice(idx, 1);
  if(!ingredientCategories().includes(trimmed) && !DB.ingredientCategories.includes(trimmed)) DB.ingredientCategories.push(trimmed);
  // El icono elegido para la categoría antigua se traspasa al nuevo nombre,
  // para no perderlo solo por corregir el texto.
  if(DB.categoryIcons && DB.categoryIcons.ingredient && DB.categoryIcons.ingredient[oldName] != null){
    DB.categoryIcons.ingredient[trimmed] = DB.categoryIcons.ingredient[oldName];
    delete DB.categoryIcons.ingredient[oldName];
  }
  saveDB();
  renderMegalista();
  showToast(t('msg.categoryRenamed'));
}
function cancelNewIngredientCategory(id){
  const state = ingredientFormStateBeforeCategory || currentIngredientFormState(id);
  state.category = ingredientCategories()[0];
  ingredientFormStateBeforeCategory = null;
  openIngredientModal(id, state);
}
function confirmNewIngredientCategory(id){
  const name = document.getElementById('new-ingredient-category-name').value;
  const state = ingredientFormStateBeforeCategory || currentIngredientFormState(id);
  if(name && name.trim()){
    const cat = name.trim();
    if(!ingredientCategories().includes(cat) && !DB.ingredientCategories.includes(cat)) DB.ingredientCategories.push(cat);
    state.category = cat;
  } else {
    state.category = ingredientCategories()[0];
  }
  ingredientFormStateBeforeCategory = null;
  saveDB();
  openIngredientModal(id, state);
}

function saveIngredient(id){
  const name = document.getElementById('ing-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const category = document.getElementById('ing-category').value;
  const unit = document.getElementById('ing-unit').value;
  const supplier = document.getElementById('ing-supplier').value.trim();
  const packQty = parseFloat(document.getElementById('ing-pack-qty').value) || 0;
  const packPrice = parseFloat(document.getElementById('ing-pack-price').value) || 0;
  const price = packQty > 0 ? packPrice / packQty : 0;
  const allergens = Array.from(document.querySelectorAll('#modal-box input[type="checkbox"]:checked')).map(c=>c.value);

  // Aviso (no bloqueante) de posible ingrediente duplicado: mismo nombre en
  // la misma área, dado de alta quizás con otro proveedor sin darse cuenta
  // de que ya existía — para no acabar con el coste/IVA de un mismo
  // ingrediente repartido entre dos fichas distintas.
  const dupe = DB.ingredients.find(i => i.id !== id && (i.area||'cocina')===currentArea() && i.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !confirm(t('msg.confirmDuplicateIngredient').replace('${name}', dupe.name))) return;

  if(id){
    const ing = getIngredient(id);
    if(!ing) return;
    Object.assign(ing, {name, category, unit, supplier, price, packQty, packPrice, allergens});
  }else{
    const newId = genId();
    DB.ingredients.push({id:newId, name, category, unit, supplier, price, packQty, packPrice, allergens, area: currentArea()});
    getStockEntry(newId);
  }
  saveDB();
  closeModal();
  renderMegalista();
  showToast(t('msg.ingredientSaved'));
}

// IVA soportado de este ingrediente (el que se paga al comprarlo) — se
// edita desde Mega Lista, no desde la ficha del proveedor: un mismo
// proveedor puede venderte productos con tipos de IVA distintos (ej. una
// tienda de bebidas que vende agua al 10% y vino al 21%), así que el tipo
// tiene que ir ligado al producto, no a quién te lo vende.
function updateIngredientIva(id, val){
  const ing = DB.ingredients.find(i=>i.id===id);
  if(!ing) return;
  ing.iva = parseFloat(val);
  saveDB();
}

// Marca un ingrediente como descatalogado/inactivo sin borrarlo — a
// diferencia de borrarlo (deleteIngredient), esto NO desvincula el
// ingrediente de las recetas que ya lo usan (su coste histórico sigue
// intacto), solo deja de ofrecerse para comprarlo o para añadirlo a un
// plato nuevo. Útil para un ingrediente de temporada o que ha dejado de
// servir el proveedor, sin perder ni el histórico ni el vínculo con las
// recetas que lo llevan.
function toggleIngredientActivo(id){
  if(!isOwnerSession()) return;
  const ing = DB.ingredients.find(i=>i.id===id);
  if(!ing) return;
  ing.activo = ing.activo===false ? true : false;
  saveDB();
  renderMegalista();
  showToast(ing.activo===false ? t('msg.ingredientDiscontinued') : t('msg.ingredientReactivated'));
}

// Recetas (Escandallo) que usan un ingrediente, para avisar antes de
// borrarlo y evitar descuadrar el coste de esos platos sin darse cuenta.
function recipesUsingIngredient(id){
  return DB.recipes.filter(r => (r.ingredients||[]).some(line => line.type!=='base' && line.ingredientId===id));
}
function deleteIngredient(id){
  if(!isOwnerSession()) return;
  const ing = DB.ingredients.find(i=>i.id===id);
  const usedIn = recipesUsingIngredient(id);
  if(usedIn.length){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-alert-triangle"></i> ${t('title.ingredientInUse')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p style="font-size:13px">${t('msg.ingredientInUseWarning').replace('${name}', escapeHtml(ing?ing.name:'')).replace('${count}', usedIn.length)}</p>
      <div style="max-height:200px;overflow-y:auto;margin:10px 0;border:1px solid var(--border);border-radius:8px">
        ${usedIn.map(r=>`<div class="ge-item"><span style="flex:1;font-weight:600">${escapeHtml(r.name)}</span></div>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-danger" onclick="confirmDeleteIngredient(${id})">${t('btn.deleteAnyway')}</button>
      </div>
    `);
    return;
  }
  confirmDeleteIngredient(id);
}
// Borrar un ingrediente pierde para siempre su historial de stock, igual de
// irreversible que borrar un cliente o una mesa con pedido: se pide el PIN.
function confirmDeleteIngredient(id){
  requestBusinessPinAction(t('title.deleteIngredient'), t('msg.confirmDeleteIngredient'), () => reallyDeleteIngredient(id));
}
function reallyDeleteIngredient(id){
  const ing0 = DB.ingredients.find(i => i.id === id);
  if(ing0){ moveToTrash('ingredient', ing0); logAudit('delete', t('audit.deletedIngredient').replace('${name}', ing0.name)); }
  DB.ingredients = DB.ingredients.filter(i => i.id !== id);
  delete DB.stock[id];
  DB.recipes.forEach(r => {
    r.ingredients = (r.ingredients||[]).filter(line => line.ingredientId !== id);
  });
  saveDB();
  closeModal();
  renderMegalista();
  showToast(t('msg.ingredientDeleted'));
}

/* ============================================================
   STOCK
   ============================================================ */
function stockTab(tab){
  document.getElementById('stock-tab-btn-ing').classList.toggle('active', tab === 'ing');
  document.getElementById('stock-tab-btn-elab').classList.toggle('active', tab === 'elab');
  document.getElementById('stock-tab-ing').classList.toggle('active', tab === 'ing');
  document.getElementById('stock-tab-elab').classList.toggle('active', tab === 'elab');
}

let stockFolder = null;   // categoría abierta en la pestaña de ingredientes
let elabFolder = null;    // categoría abierta en la pestaña de elaboraciones
function openStockFolder(cat){ stockFolder = cat; renderStock(); }
function backToStockFolders(){ stockFolder = null; renderStock(); }
function openElabFolder(cat){ elabFolder = cat; renderStock(); }
function backToElabFolders(){ elabFolder = null; renderStock(); }

// Valor económico total del stock actual (a precio de coste), separado por
// ingredientes y elaboraciones, para las dos áreas si el negocio las tiene.
// Las elaboraciones manuales (sin escandallo detrás) no tienen coste
// conocido y se excluyen del total en vez de contarlas como 0 en silencio.
function stockTotalValueBreakdown(){
  let ingTotal = 0, elabTotal = 0, elabSinCoste = 0;
  DB.ingredients.forEach(ing => {
    if(ing.activo === false) return;
    const entry = getStockEntry(ing.id);
    ingTotal += (entry.qty||0) * (ing.price||0);
  });
  (DB.elaboraciones||[]).forEach(e => {
    if(!e.recipeId){ if(e.qty) elabSinCoste++; return; }
    const recipe = getRecipe(e.recipeId);
    if(!recipe){ if(e.qty) elabSinCoste++; return; }
    const costPerUnit = recipeBaseCostPerUnit(recipe);
    elabTotal += (e.qty||0) * costPerUnit;
  });
  return {ingTotal, elabTotal, total: ingTotal + elabTotal, elabSinCoste};
}

function openStockValueModal(){
  const b = stockTotalValueBreakdown();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-report-money"></i> ${t('title.stockValue')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-top:-4px">${t('msg.stockValueHint')}</p>
    <div class="kpi" style="margin-bottom:14px">
      <div class="label">${t('label.stockValueTotal')}</div>
      <div class="value">${fmtMoney(b.total)}</div>
    </div>
    <div class="field-row">
      <div class="field"><label>${t('label.ingredients')}</label><div style="font-size:16px;font-weight:700">${fmtMoney(b.ingTotal)}</div></div>
      <div class="field"><label>${t('label.elaborations')}</label><div style="font-size:16px;font-weight:700">${fmtMoney(b.elabTotal)}</div></div>
    </div>
    ${b.elabSinCoste ? `<p style="font-size:12px;color:var(--muted)">${t('msg.stockValueElabSinCoste').replace('${n}', b.elabSinCoste)}</p>` : ''}
  `);
}

function renderStock(){
  maybeShowCategoryIconHint();
  const search = document.getElementById('stock-search').value.toLowerCase();
  const onlyAlerts = document.getElementById('stock-only-alerts').checked;

  // Un solo getStockEntry() por ingrediente (antes se llamaba una vez para
  // filtrar y otra para pintar la fila, el doble de trabajo en cada
  // render — y esto se repinta en cada +/- que se pulsa).
  let items = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea() && (!search || ing.name.toLowerCase().includes(search)))
    .map(ing => ({type:'ing', id: ing.id, name: ing.name, unit: ing.unit, category: ing.category || t('label.noCategory'), ...getStockEntry(ing.id)}))
    .filter(row => onlyAlerts ? row.qty <= row.min : true);

  let elabs = (DB.elaboraciones||[]).filter(e => {
    const matchArea = (e.area||'cocina') === currentArea();
    const matchSearch = !search || e.name.toLowerCase().includes(search);
    const matchAlert = !onlyAlerts || (e.qty||0) <= (e.min||0);
    return matchArea && matchSearch && matchAlert;
  }).map(e => ({type:'elab', id: e.id, recipeId: e.recipeId||null, name: e.name, unit: e.unit, qty: e.qty||0, min: e.min||0}));

  // Totales de referencia: cuántos productos (Mega Lista) y elaboraciones
  // (escandalladas o creadas a mano) hay en total en esta área, sin que la
  // búsqueda ni el filtro "Solo alertas" afecten al recuento.
  const kpisBox = document.getElementById('stock-kpis');
  if(kpisBox){
    const activeArea = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea() && ing.activo !== false);
    const allIngCount = activeArea.length;
    const allElabList = (DB.elaboraciones||[]).filter(e => (e.area||'cocina') === currentArea());
    const lowIngCount = activeArea.filter(ing => { const s = getStockEntry(ing.id); return s.qty <= s.min; }).length;
    const lowElabCount = allElabList.filter(e => (e.qty||0) <= (e.min||0)).length;
    kpisBox.innerHTML = `
      <div class="kpi"><div class="label">${t('label.products')}</div><div class="value">${allIngCount}</div></div>
      <div class="kpi"><div class="label">${t('label.elaborations')}</div><div class="value">${allElabList.length}</div></div>
      <div class="kpi ${lowIngCount?'warn':''}"><div class="label">${t('label.productsBelowMin')}</div><div class="value">${lowIngCount}</div></div>
      <div class="kpi ${lowElabCount?'warn':''}"><div class="label">${t('label.elaborationsBelowMin')}</div><div class="value">${lowElabCount}</div></div>
    `;
  }

  const renderRow = row => {
    const low = row.qty <= row.min;
    const isElab = row.type === 'elab';
    const fromEscandallo = isElab && !!row.recipeId;
    // Antes el aviso de "bajo mínimo" era una pequeña etiqueta roja/verde
    // fácil de pasar por alto en una lista larga — ahora todo el recuadro
    // se pone en rojo, así se ve de un vistazo qué hay que reponer sin
    // tener que leer cada fila una a una.
    return `
      <div class="list-row" style="padding:8px 10px;flex-wrap:wrap;${low?'background:var(--red-l);border:1px solid var(--red);border-radius:8px':''}">
        <div class="list-row-name"><span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>${fromEscandallo ? ` <span class="badge badge-gray" style="font-size:10px">${t('label.costingSheet')}</span>` : ''}</div>
        <span style="font-size:11.5px;color:var(--muted)">${t('label.minAbbrev')}</span>
        <input type="number" value="${row.min}" step="0.01" min="0" style="width:65px;padding:3px 5px;border:1px solid var(--border);border-radius:6px;font-size:13px" ${editUnlocked?'':'disabled'}
          onchange="${isElab ? `updateElaboracionMin(${row.id}, this.value)` : `updateStockMin(${row.id}, this.value)`}">
        <span style="font-size:11.5px;${low?'color:var(--red);font-weight:700':'color:var(--muted)'}">${t('label.currentAbbrev')}</span>
        <input type="number" value="${row.qty}" step="0.01" min="0" style="width:65px;padding:3px 5px;border:1px solid ${low?'var(--red)':'var(--border)'};border-radius:6px;font-size:13px" ${editUnlocked?'':'disabled'}
          onchange="${isElab ? `updateElaboracionQty(${row.id}, this.value)` : `updateStockQty(${row.id}, this.value)`}">
        <span style="font-size:12.5px;color:var(--muted)">${escapeHtml(row.unit)}</span>
        <div class="actions-cell" style="gap:4px">
          ${isElab && !fromEscandallo ? `<button class="owner-only btn btn-sm btn-icon" onclick="openElaboracionModal(${row.id})"><i class="ti ti-pencil"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteElaboracion(${row.id})"><i class="ti ti-trash"></i></button>` : ''}
          ${fromEscandallo ? `<button class="owner-only btn btn-sm btn-icon" title="${t('title.editCostingSheet')}" onclick="navigate('escandallo');openRecipeModal(${row.recipeId})"><i class="ti ${currentArea()==='sala'?'ti-glass-cocktail':'ti-chef-hat'}"></i></button>` : ''}
        </div>
      </div>
    `;
  };

  /* Ingredientes: navegación carpetas (categoría) → nombres → detalle */
  const groupsWrap = document.getElementById('stock-ing-groups');
  const searching = !!(search || onlyAlerts);

  const byCat = {};
  items.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });
  const cats = Object.keys(byCat).sort((a,b) => {
    const ia = ingredientCategories().indexOf(a), ib = ingredientCategories().indexOf(b);
    if(ia === -1 && ib === -1) return a.localeCompare(b);
    if(ia === -1) return 1;
    if(ib === -1) return -1;
    return ia - ib;
  });

  if(!items.length){
    groupsWrap.innerHTML = `<div class="empty"><i class="ti ti-package"></i>${t('empty.stock')}</div>`;
  } else if(searching){
    // Con búsqueda o "solo alertas": resultados planos agrupados por categoría.
    groupsWrap.innerHTML = cats.map(cat => `
      <div class="view-subtitle" style="margin-top:14px;margin-bottom:4px"><strong>${escapeHtml(ingredientCategoryLabel(cat))}</strong> <span style="font-size:12px;color:var(--muted)">(${byCat[cat].length})</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:6px">
        ${byCat[cat].map(renderRow).join('')}
      </div>
    `).join('');
  } else if(stockFolder === null){
    // Vista de carpetas por categoría.
    groupsWrap.innerHTML = `<div class="grid grid-compact">${cats.map(cat => `
      <div class="card card-compact" style="cursor:pointer" onclick="openStockFolder('${cat.replace(/'/g,"\\'")}')">
        <h3><span style="font-size:18px;cursor:pointer" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${cat.replace(/'/g,"\\'")}','${cat.replace(/'/g,"\\'")}','renderStock','ingredient')">${getCategoryIcon(cat,'ingredient')}</span> ${escapeHtml(ingredientCategoryLabel(cat))}</h3>
        <div style="font-size:12px;color:var(--muted)">${byCat[cat].length===1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', byCat[cat].length)}</div>
      </div>
    `).join('')}</div>`;
  } else {
    const folderItems = byCat[stockFolder] || [];
    const backFolders = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToStockFolders()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>`;
    if(!folderItems.length){
      stockFolder = null; renderStock(); return;
    }
    // Carpeta abierta: todo a la vista de golpe (cantidad, mínimo, +/-, ajustar),
    // sin tener que entrar a cada producto para verlo — mismo detalle que en
    // los resultados de búsqueda, solo que ya filtrado por esta categoría.
    groupsWrap.innerHTML = backFolders + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:6px">${folderItems.map(renderRow).join('')}</div>`;
  }

  /* Elaboraciones — mismas carpetas por categoría que Escandallo → Elaboraciones
     (no las que "haya en stock ahora mismo"), para que sea consistente estén o
     no todavía en stock, y siempre mostrando la vista de carpetas primero
     (antes, si solo había una categoría con stock, se saltaba directo a la
     lista plana sin ninguna carpeta a la vista). */
  const elabGroupsWrap = document.getElementById('stock-elab-groups');
  const baseRecipes = DB.recipes.filter(r => r.isBase && (r.area||'cocina') === currentArea());
  const elabFolders = getEscandalloFolders(baseRecipes); // [[key, label, recipes], ...]
  const elabsByRecipeCat = {};
  elabs.forEach(e => {
    // Las elaboraciones que vienen de una receta base del Escandallo heredan
    // su categoría; las creadas a mano desde Stock antes no tenían ninguna
    // (siempre "Sin categoría") — ahora usan la que se les asigne en su
    // propia ficha (elab.category), con las mismas categorías de receta.
    const cat = e.recipeId ? ((DB.recipes.find(r=>r.id===e.recipeId)||{}).category || '__none__') : (e.category || '__none__');
    (elabsByRecipeCat[cat] = elabsByRecipeCat[cat] || []).push(e);
  });
  if(!elabFolders.some(([key])=>key==='__none__') && elabsByRecipeCat['__none__']){
    elabFolders.push(['__none__', t('label.noCategory'), []]);
  }
  // Una elaboración manual puede llevar una categoría que ninguna receta
  // base usa todavía (getEscandalloFolders solo conoce las de baseRecipes):
  // se añade igualmente para que su carpeta no quede invisible.
  Object.keys(elabsByRecipeCat).forEach(cat => {
    if(cat !== '__none__' && !elabFolders.some(([key]) => key === cat)){
      elabFolders.push([cat, cat, []]);
    }
  });

  if(!elabs.length){
    elabGroupsWrap.innerHTML = `<div class="empty"><i class="ti ti-package"></i>${t('empty.elaborations')}</div>`;
  } else if(searching){
    elabGroupsWrap.innerHTML = elabFolders.filter(([key]) => (elabsByRecipeCat[key]||[]).length).map(([key, label]) => `
      <div class="view-subtitle" style="margin-top:14px;margin-bottom:4px"><strong>${escapeHtml(label)}</strong> <span style="font-size:12px;color:var(--muted)">(${elabsByRecipeCat[key].length})</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:6px">
        ${elabsByRecipeCat[key].map(renderRow).join('')}
      </div>
    `).join('');
  } else if(elabFolder === null){
    elabGroupsWrap.innerHTML = `<div class="grid grid-compact">${elabFolders.map(([key, label]) => {
      const n = (elabsByRecipeCat[key]||[]).length;
      return `
      <div class="card card-compact" style="cursor:pointer" onclick="openElabFolder('${key.replace(/'/g,"\\'")}')">
        <h3><span style="font-size:18px;cursor:pointer" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${key.replace(/'/g,"\\'")}','${label.replace(/'/g,"\\'")}','renderStock','recipe')">${getCategoryIcon(key,'recipe')}</span> ${escapeHtml(label)}</h3>
        <div style="font-size:12px;color:var(--muted)">${n===1 ? t('label.oneElaboration') : t('label.nElaborations').replace('${n}', n)}</div>
      </div>`;
    }).join('')}</div>`;
  } else {
    const folderElabs = elabsByRecipeCat[elabFolder] || [];
    const backBtn = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToElabFolders()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>`;
    // Carpeta abierta: todo a la vista de golpe, igual que Ingredientes — sin
    // tener que entrar en cada elaboración para ver cantidad/mínimo/ajustar.
    elabGroupsWrap.innerHTML = backBtn + (folderElabs.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:6px">${folderElabs.map(renderRow).join('')}</div>`
      : `<div class="empty" style="padding:10px">${t('empty.elaborations')}</div>`);
  }
}


function updateStockMin(ingredientId, value){
  const s = getStockEntry(ingredientId);
  s.min = parseFloat(value) || 0;
  saveDB();
  renderStock();
}

// Registro de ajustes de stock (manuales y rápidos), para poder investigar
// mermas/descuadres: qué se tocó, cuándo y de qué cantidad a qué cantidad.
// Facturas de proveedor pendientes de pago (generadas automáticamente al
// recibir un pedido) — vencidas primero, luego las que vencen en los
// próximos 7 días, con un botón para marcarlas pagadas sin salir de aquí.
function openPendingInvoicesModal(){
  const today = todayStr();
  const in7 = dateStr(new Date(Date.now() + 7*86400000));
  const pending = (DB.ge.variables||[])
    .filter(v => v.fechaPago && !v.pagada && v.fechaPago <= in7)
    .sort((a,b) => a.fechaPago.localeCompare(b.fechaPago));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-file-invoice"></i> ${t('invoices.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${pending.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('invoices.dueDate')}</th><th>${t('common.supplier')}</th><th>${t('label.total')}</th><th></th></tr></thead>
        <tbody>${pending.map(v => `
          <tr>
            <td style="color:${v.fechaPago<today?'var(--red)':''}">${escapeHtml(v.fechaPago)}${v.fechaPago<today?` <span class="badge badge-red" style="font-size:9px">${t('invoices.overdue')}</span>`:''}</td>
            <td>${escapeHtml(v.proveedor||'—')}</td>
            <td>${fmtMoney((parseFloat(v.importe)||0) * (1 + (v.iva!=null?parseFloat(v.iva):(DB.ge?.config?.ivaComprasPct!=null?parseFloat(DB.ge.config.ivaComprasPct):10))/100))}</td>
            <td><button class="btn btn-sm" onclick="markInvoicePaid(${v.id})">${t('invoices.markPaid')}</button></td>
          </tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-circle-check"></i>${t('invoices.none')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function markInvoicePaid(id){
  const v = (DB.ge.variables||[]).find(x=>x.id===id);
  if(!v) return;
  v.pagada = true;
  saveDB();
  openPendingInvoicesModal();
  if(typeof renderDashboard === 'function') renderDashboard();
}

function logStockAdjustment(type, refId, name, before, after, source){
  if(!DB.stockLog) DB.stockLog = [];
  DB.stockLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    type, refId, name, before, after, delta: after - before, area: currentArea(),
    // 'purchase' = recepción de pedido a proveedor (entrada esperada, no es
    // merma); 'manual' = alguien corrigió el stock a mano (típicamente tras
    // un recuento físico) — si esa corrección es a la baja, es la señal más
    // fiable de merma real que tenemos, y es lo que alimenta el informe de
    // mermas en Stock.
    source: source || 'manual',
    // Quién hizo el ajuste — antes el histórico solo decía "qué" y "cuándo",
    // nunca "quién", que es justo lo que hace falta para investigar mermas
    // repetidas de una persona concreta. Mismo criterio que logAudit().
    actor: (typeof currentActorName === 'function') ? currentActorName() : ''
  });
  if(DB.stockLog.length > 500) DB.stockLog = DB.stockLog.slice(-500);
}

function openStockLogModal(){
  const log = [...(DB.stockLog||[])].filter(e => (e.area||'cocina')===currentArea()).reverse().slice(0, 100);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${t('title.stockLog')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('common.name')}</th><th>${t('megalista.qtyBefore')}</th><th>${t('megalista.qtyAfter')}</th><th>${t('megalista.change')}</th><th>${t('common.responsible')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td data-label="${t('common.date')}">${escapeHtml(e.fecha)}</td><td data-label="${t('th.time')}">${escapeHtml(e.hora)}</td><td data-label="${t('common.name')}">${escapeHtml(e.name)}</td><td data-label="${t('megalista.qtyBefore')}">${fmtNum(e.before)}</td><td data-label="${t('megalista.qtyAfter')}">${fmtNum(e.after)}</td><td data-label="${t('megalista.change')}" style="color:${e.delta>=0?'var(--green)':'var(--red)'}">${e.delta>=0?'+':''}${fmtNum(e.delta)}</td><td data-label="${t('common.responsible')}">${escapeHtml(e.actor||'—')}</td></tr>`).join('') : `<tr><td colspan="7"><div class="empty" style="padding:14px">${t('empty.noStockLog')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

// Cantidad "Actual" editable directamente en la propia fila, sin pasar por
// un modal — antes hacía falta abrir un modal aparte solo para escribir un
// número. Sigue quedando registrado en el Historial igual que antes.
function updateStockQty(ingredientId, value){
  const s = getStockEntry(ingredientId);
  const num = parseFloat(value);
  if(isNaN(num) || num < 0) return;
  const before = s.qty||0;
  if(before === num) return;
  s.qty = num;
  const ing = getIngredient(ingredientId);
  logStockAdjustment('ing', ingredientId, ing?ing.name:'', before, num);
  saveDB();
  renderStock();
}

/* ============== Elaboraciones propias (caldos, salsas, etc.) ============== */
function getElaboracion(id){ return (DB.elaboraciones||[]).find(e => e.id === id); }

function openElaboracionModal(id){
  const e = id ? getElaboracion(id) : {id:null, name:'', unit:'L', qty:0, min:0, category:''};
  const catOptions = `<option value="">${t('label.noCategory')}</option>` +
    areaRecipeCategories().map(c => { const name = typeof c === 'object' ? c.name : c; return `<option value="${escapeHtml(name)}" ${e.category===name?'selected':''}>${escapeHtml(name)}</option>`; }).join('');
  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editElaboration') : t('title.newElaboration')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="elab-name" value="${escapeHtml(e.name)}" placeholder="${t('ph.elaborationName')}">
    </div>
    <div class="field">
      <label>${t('common.category')}</label>
      <select id="elab-category">${catOptions}</select>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.unit')}</label>
        <select id="elab-unit">
          ${['L','ml','kg','g','ud'].map(u => `<option value="${u}"${u===e.unit?' selected':''}>${u}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>${t('label.stockQty')}</label>
        <input type="number" id="elab-qty" value="${e.qty||0}" step="0.01" min="0">
      </div>
      <div class="field">
        <label>${t('label.minStock')}</label>
        <input type="number" id="elab-min" value="${e.min||0}" step="0.01" min="0">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveElaboracion(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

function saveElaboracion(id){
  const name = document.getElementById('elab-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const category = document.getElementById('elab-category').value;
  const unit = document.getElementById('elab-unit').value;
  const qty = parseFloat(document.getElementById('elab-qty').value) || 0;
  const min = parseFloat(document.getElementById('elab-min').value) || 0;
  // Igual que con ingredientes/recetas/proveedores: avisa de un posible
  // duplicado (mismo nombre, misma área) en vez de dejarlo pasar en
  // silencio — antes no había ningún aviso al crear una elaboración.
  const dupe = (DB.elaboraciones||[]).find(x => x.id !== id && (x.area||'cocina')===currentArea() && x.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !confirm(t('msg.confirmDuplicateElaboration').replace('${name}', dupe.name))) return;
  if(id){
    Object.assign(getElaboracion(id), {name, category, unit, qty, min});
  } else {
    if(!DB.elaboraciones) DB.elaboraciones = [];
    DB.elaboraciones.push({id: genId(), name, category, unit, qty, min, area: currentArea()});
  }
  saveDB();
  closeModal();
  renderStock();
  showToast(t('msg.elaborationSaved'));
}

// Antes se borraba con un simple confirm() del navegador y sin pasar por la
// papelera — al contrario que un ingrediente, que exige el PIN de negocio y
// se puede recuperar. Una elaboración también tiene su stock y su mínimo
// configurados: perderla de un clic de más era demasiado fácil.
function deleteElaboracion(id){
  requestBusinessPinAction(t('title.deleteElaboration'), t('msg.confirmDeleteElaboration'), () => reallyDeleteElaboracion(id));
}
function reallyDeleteElaboracion(id){
  const e = getElaboracion(id);
  if(!e) return;
  moveToTrash('elaboracion', e);
  logAudit('delete', t('audit.deletedElaboration').replace('${name}', e.name));
  DB.elaboraciones = (DB.elaboraciones||[]).filter(x => x.id !== id);
  saveDB();
  closeModal();
  renderStock();
  showToast(t('msg.elaborationDeleted'));
}

function updateElaboracionMin(id, value){
  const e = getElaboracion(id); if(!e) return;
  e.min = parseFloat(value) || 0;
  saveDB();
  renderStock();
}

function updateElaboracionQty(id, value){
  const e = getElaboracion(id); if(!e) return;
  const num = parseFloat(value);
  if(isNaN(num) || num < 0) return;
  const before = e.qty||0;
  if(before === num) return;
  e.qty = num;
  logStockAdjustment('elab', id, e.name, before, num);
  saveDB();
  renderStock();
}
