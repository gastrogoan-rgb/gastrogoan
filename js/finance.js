/* ============================================================
   DASHBOARD
   ============================================================ */
function geTotalFijos(){
  return (DB.ge.fijos||[]).reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
function geTotalFijosNeto(){
  return (DB.ge.fijos||[]).reduce((s,g)=>{const m=gfMonthlyImporte(g);const p=g.iva!=null?parseFloat(g.iva):0;return s+m/(1+p/100);},0);
}
// Solo la parte de "gastos fijos" que es coste de personal (nóminas), para
// poder mostrar el coste de personal como % de la facturación junto al food
// cost — los dos números de "prime cost" que todo dueño de restaurante mira
// juntos.
function geTotalPersonalNeto(){
  return (DB.ge.fijos||[]).filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>{const m=gfMonthlyImporte(g);const p=g.iva!=null?parseFloat(g.iva):0;return s+m/(1+p/100);},0);
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
function geTotalVariablesMes(year, month){
  return (DB.ge.variables||[]).filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
function geTotalVariablesNetoMes(year, month){
  const ivaDefault = (DB.ge?.config?.ivaComprasPct!=null) ? parseFloat(DB.ge.config.ivaComprasPct) : 10;
  return (DB.ge.variables||[]).filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>{const p=v.iva!=null?parseFloat(v.iva):ivaDefault;return s+parseFloat(v.importe||0)/(1+p/100);},0);
}
function salesTotalForRange(startDate, endDate){
  return DB.sales.filter(s=>s.date>=startDate && s.date<=endDate).reduce((sum,s)=>sum+s.total,0);
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
// Gastos variables (compras) registrados con fecha concreta dentro del rango (sin IVA)
function geVariablesTotalForRange(startDate, endDate){
  const ivaDefault = (DB.ge?.config?.ivaComprasPct!=null) ? parseFloat(DB.ge.config.ivaComprasPct) : 10;
  return (DB.ge.variables||[]).filter(v=>v.fecha && v.fecha>=startDate && v.fecha<=endDate).reduce((s,v)=>{const p=v.iva!=null?parseFloat(v.iva):ivaDefault;return s+parseFloat(v.importe||0)/(1+p/100);},0);
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
  const salesLast30 = DB.sales.filter(s=>s.date>=last30Start && s.date<=todayDate);
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
  const lowStockCount = DB.ingredients.filter(ing => (ing.area||'cocina')===currentArea() && getStockEntry(ing.id).qty <= getStockEntry(ing.id).min).length;
  // Antes el mantenimiento vencido (control de plagas, revisiones, etc.) solo
  // se veía si entrabas manualmente a la pestaña de Limpieza > Mantenimiento —
  // aquí se avisa igual que con el stock bajo, para que no pase desapercibido.
  const overdueMaintenanceCount = ((DB.limpieza && DB.limpieza.mantenimiento) || []).filter(e => limpiezaMantenimientoDueStatus(e) === 'overdue').length;
  // Facturas de proveedor (generadas automáticamente al recibir un pedido)
  // con fecha de pago ya vencida y todavía sin marcar como pagadas — para
  // no acumular sorpresas de tesorería por puro despiste.
  const overdueInvoicesCount = (DB.ge.variables||[]).filter(v => v.fechaPago && !v.pagada && v.fechaPago < todayDate).length;

  const attentionItems = [
    {count: openOrders, icon:'ti-tools-kitchen-2', label: t('dash.att.openOrders'), onclick: `navigate('tpv')`},
    {count: clockedIn, icon:'ti-clock-check', label: t('dash.att.clockedIn'), onclick: `navigate('horarios')`},
    {count: pendingReservations, icon:'ti-calendar-event', label: t('dash.att.pendingReservations'), onclick: `navigate('reservas')`},
    {count: tomorrowReservations, icon:'ti-calendar-plus', label: t('dash.att.tomorrowReservations'), onclick: `navigate('reservas'); goToReservasDia('${tomorrowDate}')`},
    {count: lowStockCount, icon:'ti-alert-triangle', label: t('dash.att.lowStock'), onclick: `dashboardGoToStockAlerts()`, warn:true},
    {count: overdueMaintenanceCount, icon:'ti-tool', label: t('dash.att.overdueMaintenance'), onclick: `navigate('limpieza'); setLimpiezaTab('mantenimiento')`, warn:true},
    {count: overdueInvoicesCount, icon:'ti-file-invoice', label: t('dash.att.overdueInvoices'), onclick: `navigate('economia'); GE.tab('variables'); openPendingInvoicesModal()`, warn:true},
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
  const salesToday = DB.sales.filter(s=>s.date===todayDate);
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
  const year = today.getFullYear();
  const month = today.getMonth();
  const facturacion = salesTotalForMonth(year, month);
  const variables = geTotalVariablesNetoMes(year, month);
  const fijos = geTotalFijosNeto();
  const resultado = facturacion - variables - fijos;

  const fcPct = avgFoodCost;
  const margenPct = facturacion > 0 ? (resultado/facturacion)*100 : 0;
  const personalCost = geTotalPersonalNeto();
  const staffCostPct = facturacion > 0 ? (personalCost/facturacion)*100 : 0;
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
    resultadoTrend.push({label, value: sales - variablesM - fijosM});
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

  // Margen bruto real por plato (últimos 30 días)
  const marginTotals = {};
  salesLast30.forEach(s=>{
    (s.items||[]).forEach(it=>{
      const key = it.name || '—';
      const qty = it.qty || 1;
      let unitCost = 0;
      if(it.recipeId){
        const recipe = DB.recipes.find(r=>r.id===it.recipeId);
        if(recipe) unitCost = recipeCostBreakdown(recipe).total || 0;
      }
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
  const sales = DB.sales.filter(s => s.date >= start && s.date <= end && s.createdAt);
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
    ? `<tr><td colspan="7"><div class="empty"><i class="ti ti-list-details"></i>${t('empty.ingredients')}</div></td></tr>`
    : items.map(ing => `
      <tr>
        <td><strong>${escapeHtml(ing.name)}</strong></td>
        <td><span class="badge badge-gray">${escapeHtml(ing.category?ingredientCategoryLabel(ing.category):'—')}</span></td>
        <td>${escapeHtml(ing.supplier||'—')}</td>
        <td>${escapeHtml(ing.unit)}</td>
        <td>${fmtNum(ing.packQty||1)} ${escapeHtml(ing.unit)} × ${fmtMoney(ing.packPrice!=null?ing.packPrice:ing.price)}</td>
        <td class="wrap">${(ing.allergens||[]).map(a=>`<span class="badge badge-amber">${escapeHtml(allergenLabel(a))}</span>`).join(' ') || '—'}</td>
        <td class="actions-cell">
          <button class="owner-only btn btn-sm btn-icon" onclick="openIngredientModal(${ing.id})"><i class="ti ti-edit"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteIngredient(${ing.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>
    `).join('');
  return `<div class="table-wrap"><table><thead><tr>${theadHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
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

  const items = DB.ingredients.filter(i => {
    const matchArea = (i.area||'cocina') === currentArea();
    const matchSearch = !search || i.name.toLowerCase().includes(search) || (i.supplier||'').toLowerCase().includes(search);
    const matchProv = !prov || (i.supplier||'') === prov;
    return matchArea && matchSearch && matchProv;
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
    box.innerHTML = `<div class="grid grid-compact">${cats.map(cat => `
      <div class="card card-compact" style="cursor:pointer" onclick="openMegalistaFolder('${cat.replace(/'/g,"\\'")}')">
        <h3><span style="font-size:18px;cursor:pointer" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${cat.replace(/'/g,"\\'")}','${cat.replace(/'/g,"\\'")}','renderMegalista','ingredient')">${getCategoryIcon(cat,'ingredient')}</span> ${escapeHtml(ingredientCategoryLabel(cat))}</h3>
        <div style="font-size:12px;color:var(--muted)">${byCat[cat].length===1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', byCat[cat].length)}</div>
      </div>
    `).join('')}</div>`;
    return;
  }

  const folderItems = byCat[megalistaFolder];
  if(!folderItems || !folderItems.length){ megalistaFolder = null; renderMegalista(); return; }
  const backBtn = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToMegalistaFolders()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>`;
  box.innerHTML = backBtn + renderMegalistaTable(megalistaSortItems(folderItems));
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

// Recetas (Escandallo) que usan un ingrediente, para avisar antes de
// borrarlo y evitar descuadrar el coste de esos platos sin darse cuenta.
function recipesUsingIngredient(id){
  return DB.recipes.filter(r => (r.ingredients||[]).some(line => line.type!=='base' && line.ingredientId===id));
}
function deleteIngredient(id){
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

function renderStock(){
  maybeShowCategoryIconHint();
  const search = document.getElementById('stock-search').value.toLowerCase();
  const onlyAlerts = document.getElementById('stock-only-alerts').checked;

  let items = DB.ingredients.filter(ing => {
    const s = getStockEntry(ing.id);
    const matchArea = (ing.area||'cocina') === currentArea();
    const matchSearch = !search || ing.name.toLowerCase().includes(search);
    const matchAlert = !onlyAlerts || s.qty <= s.min;
    return matchArea && matchSearch && matchAlert;
  }).map(ing => ({type:'ing', id: ing.id, name: ing.name, unit: ing.unit, category: ing.category || t('label.noCategory'), ...getStockEntry(ing.id)}));

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
    const allIngCount = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea()).length;
    const allElabList = (DB.elaboraciones||[]).filter(e => (e.area||'cocina') === currentArea());
    const lowIngCount = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea() && getStockEntry(ing.id).qty <= getStockEntry(ing.id).min).length;
    const lowElabCount = allElabList.filter(e => (e.qty||0) <= (e.min||0)).length;
    kpisBox.innerHTML = `
      <div class="kpi"><div class="label">${t('label.products')}</div><div class="value">${allIngCount}</div></div>
      <div class="kpi"><div class="label">${t('label.elaborations')}</div><div class="value">${allElabList.length}</div></div>
      <div class="kpi ${lowIngCount?'warn':''}"><div class="label">${t('label.productsBelowMin')}</div><div class="value">${lowIngCount}</div></div>
      <div class="kpi ${lowElabCount?'warn':''}"><div class="label">${t('label.elaborationsBelowMin')}</div><div class="value">${lowElabCount}</div></div>
    `;
  }
  renderMermasHtml();

  const renderRow = row => {
    const low = row.qty <= row.min;
    const isElab = row.type === 'elab';
    const fromEscandallo = isElab && !!row.recipeId;
    const statusBadge = low ? `<span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle"></i> ${t('label.belowMin')}</span>` : '<span class="badge badge-green" style="font-size:10px">OK</span>';
    return `
      <div class="list-row" style="padding:6px 10px;flex-wrap:wrap">
        <div class="list-row-name" style="flex-basis:180px"><span class="stock-name-full" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>${fromEscandallo ? ` <span class="badge badge-gray" style="font-size:10px">${t('label.costingSheet')}</span>` : ''}</div>
        <span style="font-size:12.5px;color:var(--muted);white-space:nowrap">${fmtNum(row.qty)} ${escapeHtml(row.unit)}</span>
        <span style="font-size:11.5px;color:var(--muted)">${t('label.minAbbrev')}</span>
        <input type="number" value="${row.min}" step="0.01" min="0" style="width:65px;padding:3px 5px;border:1px solid var(--border);border-radius:6px;font-size:13px" ${editUnlocked?'':'disabled'}
          onchange="${isElab ? `updateElaboracionMin(${row.id}, this.value)` : `updateStockMin(${row.id}, this.value)`}">
        ${statusBadge}
        <div class="actions-cell" style="gap:4px">
          <button class="btn btn-sm btn-icon" onclick="${isElab ? `adjustElaboracion(${row.id}, 1)` : `adjustStock(${row.id}, 1)`}"><i class="ti ti-plus"></i></button>
          <button class="btn btn-sm btn-icon" onclick="${isElab ? `adjustElaboracion(${row.id}, -1)` : `adjustStock(${row.id}, -1)`}"><i class="ti ti-minus"></i></button>
          <button class="btn btn-sm btn-icon" title="${t('common.adjust')}" onclick="${isElab ? `setElaboracionQty(${row.id})` : `setStockQty(${row.id})`}"><i class="ti ti-edit"></i></button>
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
    const cat = e.recipeId ? ((DB.recipes.find(r=>r.id===e.recipeId)||{}).category || '__none__') : '__none__';
    (elabsByRecipeCat[cat] = elabsByRecipeCat[cat] || []).push(e);
  });
  if(!elabFolders.some(([key])=>key==='__none__') && elabsByRecipeCat['__none__']){
    elabFolders.push(['__none__', t('label.noCategory'), []]);
  }

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

// Informe de mermas: agrupa, de los últimos 30 días, las correcciones de
// stock a la BAJA hechas a mano (source:'manual'), que es la señal más
// fiable que ya se registraba de "hemos contado menos de lo que decía la
// app" — sin necesitar ningún conteo nuevo, solo mirar lo que ya se
// corrige cuando alguien hace inventario.
function renderMermasHtml(){
  const box = document.getElementById('stock-mermas');
  if(!box) return;
  // Merma es un dato de negocio (cuánto se ha tirado/descuadrado), no algo
  // que un empleado sin permiso de editar necesite ver — se oculta igual
  // que el resto de módulos de coste/margen que no le corresponden.
  if(!editUnlocked){ box.innerHTML = ''; return; }
  const since = dateStr(new Date(Date.now() - 30*86400000));
  const entries = (DB.stockLog||[]).filter(e => e.source==='manual' && e.delta < 0 && e.fecha >= since && e.area === currentArea());
  if(!entries.length){ box.innerHTML = ''; return; }
  const byItem = {};
  entries.forEach(e => {
    const key = e.type + ':' + e.refId;
    if(!byItem[key]) byItem[key] = {name: e.name, qty: 0, unit: e.type==='ing' ? (DB.ingredients.find(i=>i.id===e.refId)?.unit||'') : (DB.elaboraciones.find(el=>el.id===e.refId)?.unit||'')};
    byItem[key].qty += Math.abs(e.delta);
  });
  const rows = Object.values(byItem).sort((a,b) => b.qty - a.qty).slice(0, 8);
  box.innerHTML = `
    <div class="card" style="margin-bottom:14px;border:1px solid var(--red);background:var(--red-l)">
      <h4 style="margin-bottom:4px"><i class="ti ti-trash-x"></i> ${t('stock.merma.title')}</h4>
      <p style="font-size:12px;color:var(--muted);margin-bottom:8px">${t('stock.merma.desc')}</p>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${rows.map(r => `<div style="display:flex;justify-content:space-between;font-size:13px"><span>${escapeHtml(r.name)}</span><strong>-${r.qty.toFixed(2)} ${escapeHtml(r.unit)}</strong></div>`).join('')}
      </div>
    </div>`;
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
            <td>${fmtMoney(v.importe)}</td>
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
    source: source || 'manual'
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
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('common.name')}</th><th>${t('megalista.qtyBefore')}</th><th>${t('megalista.qtyAfter')}</th><th>${t('megalista.change')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td>${escapeHtml(e.fecha)}</td><td>${escapeHtml(e.hora)}</td><td>${escapeHtml(e.name)}</td><td>${fmtNum(e.before)}</td><td>${fmtNum(e.after)}</td><td style="color:${e.delta>=0?'var(--green)':'var(--red)'}">${e.delta>=0?'+':''}${fmtNum(e.delta)}</td></tr>`).join('') : `<tr><td colspan="6"><div class="empty" style="padding:14px">${t('empty.noStockLog')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

// Hoja imprimible para el recuento físico de stock (ingredientes + elaboraciones
// del área actual), con una columna en blanco para anotar la cantidad real y
// poder cuadrarla luego contra lo que la app tiene estimado.
function printStockCountSheet(){
  const area = currentArea();
  const ings = DB.ingredients.filter(ing => (ing.area||'cocina')===area)
    .map(ing => ({name: ing.name, unit: ing.unit, category: ing.category?ingredientCategoryLabel(ing.category):t('label.noCategory'), qty: getStockEntry(ing.id).qty}))
    .sort((a,b) => (a.category||'').localeCompare(b.category||'') || a.name.localeCompare(b.name));
  const elabs = (DB.elaboraciones||[]).filter(e => (e.area||'cocina')===area)
    .map(e => ({name: e.name, unit: e.unit, category: t('label.elaborations'), qty: e.qty||0}))
    .sort((a,b) => a.name.localeCompare(b.name));
  const rows = [...ings, ...elabs].map(x => `<tr><td>${escapeHtml(x.category)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.unit)}</td><td>${fmtNum(x.qty)}</td><td></td></tr>`).join('');
  const win = window.open('', '_blank', 'width=800,height=1000');
  if(!win){ showToast(t('megalista.popupBlocked')); return; }
  const printLocale = getLang()==='en' ? 'en-GB' : getLang()==='ca' ? 'ca-ES' : 'es-ES';
  win.document.write(`<!DOCTYPE html><html lang="${getLang()}"><head><meta charset="UTF-8"><title>${t('btn.printStockSheet')}</title>
  <style>body{font-family:Arial,sans-serif;font-size:10pt;color:#111;padding:15mm 12mm}
  h1{font-size:16pt;margin:0 0 12px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
  th{background:#f5f5f3}
  @media print{body{padding:10mm}}</style></head><body>
  <h1>${t('btn.printStockSheet')} — ${new Date().toLocaleDateString(printLocale)}</h1>
  <table><thead><tr><th>${t('common.category')}</th><th>${t('common.name')}</th><th>${t('common.unit')}</th><th>${t('megalista.estimated')}</th><th>${t('megalista.real')}</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="5">${t('common.noResults')}</td></tr>`}</tbody></table>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function adjustStock(ingredientId, delta){
  const s = getStockEntry(ingredientId);
  const before = s.qty||0;
  s.qty = Math.max(0, before + delta);
  const ing = getIngredient(ingredientId);
  logStockAdjustment('ing', ingredientId, ing?ing.name:'', before, s.qty);
  saveDB();
  renderStock();
}

function setStockQty(ingredientId){
  const s = getStockEntry(ingredientId);
  openModal(`
    <div class="modal-header">
      <h3>${t('btn.adjustStock')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.stockQty')}</label>
      <input type="number" id="stock-qty-value" value="${s.qty}" step="0.01" min="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmSetStockQty(${ingredientId})">${t('common.save')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('stock-qty-value')?.focus(), 50);
}
function confirmSetStockQty(ingredientId){
  const s = getStockEntry(ingredientId);
  const val = document.getElementById('stock-qty-value').value;
  const num = parseFloat(val);
  if(isNaN(num) || num < 0){ showToast(t('msg.invalidQty')); return; }
  const before = s.qty||0;
  s.qty = num;
  const ing = getIngredient(ingredientId);
  logStockAdjustment('ing', ingredientId, ing?ing.name:'', before, num);
  saveDB();
  closeModal();
  renderStock();
}

/* ============== Elaboraciones propias (caldos, salsas, etc.) ============== */
function getElaboracion(id){ return (DB.elaboraciones||[]).find(e => e.id === id); }

function openElaboracionModal(id){
  const e = id ? getElaboracion(id) : {id:null, name:'', unit:'L', qty:0, min:0};
  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editElaboration') : t('title.newElaboration')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="elab-name" value="${escapeHtml(e.name)}" placeholder="${t('ph.elaborationName')}">
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
  const unit = document.getElementById('elab-unit').value;
  const qty = parseFloat(document.getElementById('elab-qty').value) || 0;
  const min = parseFloat(document.getElementById('elab-min').value) || 0;
  if(id){
    Object.assign(getElaboracion(id), {name, unit, qty, min});
  } else {
    if(!DB.elaboraciones) DB.elaboraciones = [];
    DB.elaboraciones.push({id: genId(), name, unit, qty, min, area: currentArea()});
  }
  saveDB();
  closeModal();
  renderStock();
  showToast(t('msg.elaborationSaved'));
}

function deleteElaboracion(id){
  if(!confirm(t('msg.confirmDeleteElaboration'))) return;
  DB.elaboraciones = (DB.elaboraciones||[]).filter(e => e.id !== id);
  saveDB();
  renderStock();
  showToast(t('msg.elaborationDeleted'));
}

function updateElaboracionMin(id, value){
  const e = getElaboracion(id); if(!e) return;
  e.min = parseFloat(value) || 0;
  saveDB();
  renderStock();
}

function adjustElaboracion(id, delta){
  const e = getElaboracion(id); if(!e) return;
  const before = e.qty||0;
  e.qty = Math.max(0, before + delta);
  logStockAdjustment('elab', id, e.name, before, e.qty);
  saveDB();
  renderStock();
}

function setElaboracionQty(id){
  const e = getElaboracion(id); if(!e) return;
  openModal(`
    <div class="modal-header">
      <h3>${t('btn.adjustStock')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('label.stockQty')}</label>
      <input type="number" id="elaboracion-qty-value" value="${e.qty||0}" step="0.01" min="0">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmSetElaboracionQty(${id})">${t('common.save')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('elaboracion-qty-value')?.focus(), 50);
}
function confirmSetElaboracionQty(id){
  const e = getElaboracion(id); if(!e){ closeModal(); return; }
  const val = document.getElementById('elaboracion-qty-value').value;
  const num = parseFloat(val);
  if(isNaN(num) || num < 0){ showToast(t('msg.invalidQty')); return; }
  const before = e.qty||0;
  e.qty = num;
  logStockAdjustment('elab', id, e.name, before, num);
  saveDB();
  closeModal();
  renderStock();
}
