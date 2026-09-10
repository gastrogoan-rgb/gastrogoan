/* ============================================================
   GESTIÓN ECONÓMICA — Gastos, P&L, punto de equilibrio,
   CAPEX, resultado y tesorería (7 pestañas)
   ============================================================ */
const GE = (function(){
  function getMeses(){ return t('months.short'); }
  const TABS = ['ventas','fijos','variables','cdr','tesoreria','pe','capex'];
  const GF_PERSONAL = ['RETRIBUCIÓN EMPRESARIO','CUOTA AUTÓNOMOS (RETA)','SS AUTÓNOMOS','SUELDO BRUTO PERSONAL','SS EMPRESA'];
  const GF_FIJOS = ['ALQUILER','SEGURO DEL LOCAL','TASAS MUNICIPALES','ELECTRICIDAD','GAS','AGUA','INTERNET/TELEFONÍA','GESTORÍA','SOFTWARE/TPV','COMISIONES BANCARIAS','PRÉSTAMOS','MANTENIMIENTO','PUBLICIDAD','OTROS GASTOS FIJOS'];
  const VARIABLE_CATEGORIES = ['MATERIA PRIMA','BEBIDAS','CAFÉ/INFUSIONES','PACKAGING','CONSUMIBLES','LIMPIEZA','COMISIONES VENTA','MANO DE OBRA EXTRA','OTROS'];
  // Sugerencias de conceptos de gasto (autocompletado de texto libre) y
  // categorías de gasto variable (select cerrado): son contenido que ofrece
  // la app, así que se traducen. El select de categoría guarda siempre la
  // clave en español (value=) y solo muestra la etiqueta traducida.
  function gfConceptLabel(name){ const dict = t('hr.gfConceptLabels'); return (dict && dict[name]) || name; }
  function variableCategoryLabel(name){ const dict = t('hr.variableCategoryLabels'); return (dict && dict[name]) || name; }
  function getIvaOptions(){ return [{v:21,l:t('vat.general')},{v:10,l:t('vat.reduced')},{v:4,l:t('vat.superReduced')},{v:0,l:t('vat.exempt')}]; }
  // Sin valor por defecto: obliga a elegir un tipo a propósito (igual que en
  // Mega Lista/Escandallo/Carta), en vez de dar por hecho un 21%/10% que
  // podría no ser el real de ese gasto concreto.
  function ivaSelect(id, val){
    const hasVal = val != null && val !== '';
    return `<select id="${id}" style="${hasVal?'':'border-color:var(--red);color:var(--red)'}">
      <option value="" ${hasVal?'':'selected'} disabled>${t('label.chooseIva')}</option>
      ${getIvaOptions().map(o=>`<option value="${o.v}" ${hasVal && parseFloat(val)===o.v?'selected':''}>${o.l}</option>`).join('')}
    </select>`;
  }
  let activeMonth = new Date().getMonth(), editingGF = null, editingCX = null, editingGV = null;
  let cdrYear = new Date().getFullYear();
  let teYear = new Date().getFullYear();
  // Año que se está consultando en la pestaña Variables — antes esta
  // pestaña no tenía selector de año (a diferencia de CDR/Tesorería, que sí
  // navegan por año) y usaba siempre currentYear fijo, así que si el dueño
  // estaba mirando el CDR de un año anterior no podía ver el detalle de
  // compras de ese mismo mes/año en Variables.
  let gvYear = new Date().getFullYear();
  let distPctLoaded = false;
  // Por defecto coincide con la misma ventana móvil que usa "Análisis de
  // ventas" en el Panel de Control (últimos 30 días) — antes arrancaba en
  // "Este mes" (del día 1 al de hoy), así que dos paneles mirando la MISMA
  // base de ventas mostraban totales distintos con solo abrir la pantalla,
  // sin que nadie hubiera tocado ningún filtro.
  let platosPeriod = '30dias', platosFrom = '', platosTo = '';
  let gvSearch = '';
  // Función, no una constante congelada al cargar la página: si se quedara
  // fija en el año de carga, un negocio que mantiene la app abierta sin
  // recargar al cruzar la medianoche del 31 de diciembre (nada raro en
  // hostelería, precisamente esa noche) archivaría gastos/ventas del año
  // nuevo bajo el año anterior en todas las funciones que la usan como
  // valor por defecto.
  function currentYear(){ return new Date().getFullYear(); }

  function ge(){ return DB.ge; }
  function fijos(){ return ge().fijos; }
  function variables(){ return ge().variables; }
  function capex(){ return ge().capex; }
  function config(){ return ge().config; }
  // El "% Gastos Variables" que se reparte en Tesorería (config().distPct.mp)
  // y el "objetivo de food cost" (config().foodCostObj) eran dos números
  // separados para la MISMA idea: todo lo que entra en fabricar el plato o
  // la bebida (materia prima, bebidas, packaging, limpieza, comisiones, mano
  // de obra extra) es food cost, según el propio dueño — la cifra real que
  // se compara contra el objetivo (totalVariablesNetoMes) ya sumaba todo eso
  // en los dos sitios, pero el objetivo con el que se comparaba no era el
  // mismo en cada pantalla. Ahora hay un único objetivo: si ya se configuró
  // un reparto en Tesorería, manda ese "mp"; si no, el de food cost (o 35%
  // por defecto), y editarlo desde cualquiera de los dos sitios actualiza
  // ambos a la vez.
  function foodCostObjPct(){
    const dp = config().distPct;
    if(dp && dp.mp != null) return dp.mp;
    return config().foodCostObj != null ? config().foodCostObj : 35;
  }
  // Fija el objetivo desde CUALQUIER pantalla (Gastos Variables, Punto de
  // Equilibrio) manteniendo sincronizado el reparto de Tesorería: si ya
  // existía un reparto (Personal/Fijos/Variables/Otros/Beneficio sumando
  // 100%), reajusta los otros cuatro proporcionalmente para que la suma
  // siga siendo 100 — mismo criterio que adjustDistPct(), pero operando
  // sobre la configuración directamente, no sobre inputs de un formulario
  // que puede no estar en pantalla.
  function setFoodCostObjPct(n){
    const val = Math.max(0, Math.min(100, n));
    config().foodCostObj = val;
    // Mismos valores por defecto que ya llevan los campos de Tesorería en el
    // HTML (30/20/35/5/10) — si el negocio nunca tocó ese reparto, se crea
    // aquí con esa base para que quede sincronizado desde la primera vez.
    const dp = config().distPct || {per:30, gf:20, mp:35, og:5, ben:10};
    const otherKeys = ['per','gf','og','ben'];
    const othersSum = otherKeys.reduce((s,k)=>s+(parseFloat(dp[k])||0),0);
    const remaining = 100 - val;
    if(othersSum<=0){ otherKeys.forEach(k=>dp[k]=remaining/otherKeys.length); }
    else{ otherKeys.forEach(k=>dp[k]=Math.max(0, remaining*(parseFloat(dp[k])||0)/othersSum)); }
    dp.mp = val;
    config().distPct = dp;
  }
  function cierres(){ if(!ge().cierres) ge().cierres = []; return ge().cierres; }
  function mesKey(year, month){ return `${year}-${String(month+1).padStart(2,'0')}`; }
  function isMonthClosed(year, month){ return cierres().includes(mesKey(year, month)); }
  function isDateClosed(fechaStr){
    if(!fechaStr) return false;
    const [y,m] = fechaStr.split('-').map(Number);
    return isMonthClosed(y, m-1);
  }
  async function toggleCierreTe(){
    const key = mesKey(teYear, activeMonth);
    const idx = cierres().indexOf(key);
    if(idx>=0){
      if(!(await confirmModal(t('hr.te.confirmReopenMonth')))) return;
      cierres().splice(idx,1);
    } else {
      if(!(await confirmModal(t('hr.te.confirmCloseMonth')))) return;
      cierres().push(key);
    }
    saveDB();
    renderTesoreria();
  }

  // Solo proveedores del área actual (Cocina/Sala) — antes mezclaba los de
  // ambas, así que Sala podía ver sugerencias de proveedores de Cocina y
  // viceversa en el desplegable de gasto.
  function proveedores(){
    const area = currentArea();
    return [...new Set([
      ...DB.ingredients.filter(i => (i.area||'cocina') === area).map(i=>i.supplier),
      ...(DB.providers||[]).filter(p => (p.area||'cocina') === area).map(p=>p.nombre),
    ].filter(Boolean))];
  }

  // Última barrera antes de pintar Gestión Económica, por si se llega
  // aquí saltándose navigate()/renderView() (p.ej. GE.init() a mano desde
  // la consola de un dispositivo de empleado).
  function init(){
    if(isGestionLocked('economia')){ denyGestionAccess(); return; }
    tab('ventas');
  }
  function tab(name){
    document.querySelectorAll('#ge-tabs-row .ge-tab').forEach((b,i)=>b.classList.toggle('active', TABS[i]===name));
    document.querySelectorAll('#view-economia .ge-tab-panel').forEach(el=>el.classList.remove('active'));
    document.getElementById('ge-'+name).classList.add('active');
    scrollActiveTabIntoView(document.getElementById('ge-tabs-row'));
    if(name==='ventas') renderVentas();
    if(name==='fijos') renderFijos();
    if(name==='variables') renderVariables();
    if(name==='cdr') renderCDR();
    if(name==='pe') renderPE();
    if(name==='capex') renderCapex();
    if(name==='tesoreria') renderTesoreria();
    if(typeof scrollContentToTop==='function') scrollContentToTop();
    requestAnimationFrame(function(){ if(typeof runPolishAnimations==='function') runPolishAnimations(); });
  }

  /* -- Helpers --
     g.importe es la BASE mensual equivalente sin IVA (gfMonthlyImporte ya
     reparte por periodicidad) — el IVA se AÑADE encima para el total con
     IVA, nunca se extrae de un total que ya lo llevara incluido. Mismo
     criterio que Ingredientes/Escandallo/Carta/CAPEX: siempre "base + IVA",
     nunca "importe con IVA incluido, adivina cuánto es cada cosa". */
  function gfMonthlyGross(g){ const m=gfMonthlyImporte(g); const p=g.iva!=null?parseFloat(g.iva):0; return m*(1+p/100); }
  function totalFijosNeto(){ return fijos().reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function totalFijos(){ return fijos().reduce((s,g)=>s+gfMonthlyGross(g),0); }
  function totalPersonalNeto(){ return fijos().filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function totalPersonal(){ return fijos().filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>s+gfMonthlyGross(g),0); }
  function totalGFNeto(){ return fijos().filter(g=>g.categoria==='FIJOS').reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function totalGF(){ return fijos().filter(g=>g.categoria==='FIJOS').reduce((s,g)=>s+gfMonthlyGross(g),0); }
  function variablesMes(mes, año=currentYear()){ return variables().filter(v=>parseInt(v.mes)===mes && parseInt(v.año)===año); }
  function facturacionMes(mes, año=currentYear()){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return activeSales().filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v)=>s+parseFloat(v.total||0),0);
  }
  // % de IVA de reserva por defecto (Ajustes > Facturación, 10% si no se ha
  // tocado) — solo se usa como último recurso para líneas de venta que no
  // llevan su propio tipo estampado (ventas de antes de este cambio, o de un
  // plato al que nunca se le eligió IVA en Carta/Escandallo).
  function ivaVentasPct(){
    return (DB.business.ticket && DB.business.ticket.ivaPct!=null) ? parseFloat(DB.business.ticket.ivaPct) : 10;
  }
  // Agrupa la facturación del mes por tipo de IVA REAL de cada línea vendida
  // (line.ivaPct, estampado al cobrar en finalizeCharge/finalizeSplitOrder),
  // aplicando el % de descuento de la venta proporcionalmente a cada línea.
  // Las líneas sin tipo asignado (ventas antiguas o platos sin IVA elegido)
  // caen en el tipo general por defecto para no perder ese importe del
  // cálculo, pero se contabilizan aparte como "sinAsignar" para poder
  // avisar de que conviene revisarlas.
  function ventasIvaGroups(mes, año=currentYear()){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    const groups = {};
    let sinAsignar = 0;
    const fallbackRate = ivaVentasPct();
    activeSales().filter(v=>(v.date||'').startsWith(mesStr)).forEach(sale => {
      const descPct = parseFloat(sale.descuentoPct)||0;
      (sale.items||[]).forEach(line => {
        const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
        if(grossLine <= 0) return;
        const usedFallback = line.ivaPct == null;
        const rate = usedFallback ? fallbackRate : line.ivaPct;
        if(!groups[rate]) groups[rate] = {base:0, iva:0};
        const net = grossLine / (1 + rate/100);
        groups[rate].base += net;
        groups[rate].iva += grossLine - net;
        if(usedFallback) sinAsignar += grossLine;
      });
    });
    return {groups, sinAsignar};
  }
  // Facturación sin IVA: el IVA cobrado no es ingreso del negocio, hay que reservarlo para Hacienda.
  function facturacionNetaMes(mes, año=currentYear()){
    return Object.values(ventasIvaGroups(mes,año).groups).reduce((s,g)=>s+g.base, 0);
  }
  function ivaVentasMes(mes, año=currentYear()){
    return Object.values(ventasIvaGroups(mes,año).groups).reduce((s,g)=>s+g.iva, 0);
  }
  // Antes había un "% IVA soportado en compras" fijo, configurable a mano,
  // que se aplicaba a cualquier compra sin IVA propio asignado — pero no
  // todas las compras llevan el mismo IVA (10% en materia prima, 21% en
  // packaging...), así que un único % adivinaba mal. Se quita: cada línea
  // usa SIEMPRE su propio IVA real (elegido al darla de alta, obligatorio
  // desde hace tiempo — ver saveGV); si una línea antigua no lo tiene, se
  // trata como 0% en vez de adivinar, para no inventar un dato que no
  // existe (mejor "no lo sé" que un número falso).
  function ivaDeGastoVariable(v){ return parseFloat(v.iva)||0; }
  // v.importe es la base sin IVA (como Ingredientes/Escandallo/Carta/Fijos):
  // el IVA se añade encima, nunca se extrae de un total que ya lo llevara.
  function totalVariablesNetoMes(mes, año=currentYear()){
    return variablesMes(mes,año).reduce((s,v) => s + (parseFloat(v.importe)||0), 0);
  }
  function totalVariablesMes(mes, año=currentYear()){
    return variablesMes(mes,año).reduce((s,v) => {
      const pct = ivaDeGastoVariable(v);
      return s + (parseFloat(v.importe)||0) * (1 + pct/100);
    }, 0);
  }
  function ivaSoportadoComprasMes(mes, año=currentYear()){
    return totalVariablesMes(mes,año) - totalVariablesNetoMes(mes,año);
  }
  // Usa el histórico (DB.ge.fijosLog) en vez de recalcular siempre con la
  // configuración ACTUAL de gastos fijos, para que un mes/trimestre pasado
  // no cambie de golpe si después se edita un gasto fijo — clave de cara a
  // la liquidación real de IVA con Hacienda.
  function ivaSoportadoFijosMes(mes, año=currentYear()){
    return geIvaSoportadoFijosForMonth(año, mes);
  }
  // IVA soportado en inversiones CAPEX compradas ese mes (deducible en el periodo de la compra).
  function ivaSoportadoCapexMes(mes, año=currentYear()){
    return capex().filter(c=>c.fecha).reduce((s,c)=>{
      const [fy,fm] = c.fecha.split('-').map(Number);
      if(fy===año && (fm-1)===mes) return s + parseFloat(c.importe||0)*(parseFloat(c.iva||0)/100);
      return s;
    }, 0);
  }
  // sale.comisionPlataforma se guarda ya con el IVA de la plataforma sumado
  // (ver applyDeliveryCommission, js/tpv.js) — hay que descontarlo aquí para
  // no mezclar un importe bruto con el resto de gastos de esta hoja, que
  // están todos en base (ver comentario en gfMonthlyGross más arriba). Antes
  // comisionesMes devolvía el bruto directamente, y resultadoAntesImpMes lo
  // restaba junto a cifras netas; además ese IVA soportado en comisiones
  // nunca se descontaba de ivaLiquidarMes, así que el IVA pagado a la
  // plataforma de delivery no se recuperaba nunca en la liquidación.
  function comisionPlataformaNeta(sale){
    const bruto = parseFloat(sale.comisionPlataforma||0);
    if(!bruto) return 0;
    const ivaPct = (sale.plataforma && sale.plataforma.ivaPct!=null) ? parseFloat(sale.plataforma.ivaPct) : 0;
    return bruto / (1 + ivaPct/100);
  }
  function ivaSoportadoComisionesMes(mes, año=currentYear()){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return activeSales().filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v)=>s+(parseFloat(v.comisionPlataforma||0) - comisionPlataformaNeta(v)),0);
  }
  // IVA neto a liquidar con Hacienda (modelo 303): repercutido en ventas menos soportado en compras e inversiones.
  // Si es negativo, Hacienda te lo debe a ti (a tu favor).
  function ivaLiquidarMes(mes, año=currentYear()){
    return ivaVentasMes(mes,año) - ivaSoportadoComprasMes(mes,año) - ivaSoportadoCapexMes(mes,año) - ivaSoportadoFijosMes(mes,año) - ivaSoportadoComisionesMes(mes,año);
  }
  // Comisiones de apps de delivery (Glovo, Uber Eats...) calculadas automáticamente
  // sobre las ventas del mes que llegaron por esas plataformas — en BASE,
  // como el resto de gastos de esta hoja.
  function comisionesMes(mes, año=currentYear()){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return activeSales().filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v)=>s+comisionPlataformaNeta(v),0);
  }
  // Cuota mensual de inversiones CAPEX financiadas a plazos, mientras dure el pago.
  function capexCuotaMes(mes, año=currentYear()){
    return capex().filter(c=>c.financiado && c.cuotaMensual && c.fecha).reduce((s,c)=>{
      const [fy,fm] = c.fecha.split('-').map(Number);
      const elapsed = (año*12+mes) - (fy*12+(fm-1));
      const cuotas = parseInt(c.cuotas)||0;
      return s + (elapsed>=0 && elapsed<cuotas ? parseFloat(c.cuotaMensual||0) : 0);
    }, 0);
  }
  // Resultado antes de impuestos: facturación neta de IVA menos todos los gastos (compras sin IVA, ya que ese IVA es deducible).
  function resultadoAntesImpMes(mes, año=currentYear()){
    return facturacionNetaMes(mes,año) - totalVariablesNetoMes(mes,año) - geTotalFijosNetoForMonth(año,mes) - comisionesMes(mes,año) - capexCuotaMes(mes,año);
  }
  // Resultado Neto: lo que realmente te llevas, después de IVA e impuesto sobre beneficios.
  function resultadoMes(mes, año=currentYear()){
    const r = resultadoAntesImpMes(mes,año);
    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    return r>0 ? r*(1-pctImp) : r;
  }
  function ivaLiquidarQTD(mes, año=currentYear()){
    const qStart = Math.floor(mes/3)*3;
    let s = 0;
    for(let m=qStart; m<=mes; m++) s += ivaLiquidarMes(m,año);
    return s;
  }
  // Próximo vencimiento de gastos fijos periódicos (periodicidadMeses>1). El modelo de
  // datos no guarda fecha de alta del gasto, así que usamos el id (basado en Date.now())
  // como ancla aproximada al mes de creación/primer pago — no es perfecto pero es útil
  // en la gran mayoría de casos reales.
  function gfAnchorDate(g){ return new Date(g.id/1000); }
  function gfDueInMonth(g, year, month){
    const per = parseInt(g.periodicidadMeses)||1;
    if(per<=1) return null;
    const anchor = gfAnchorDate(g);
    const anchorTotal = anchor.getFullYear()*12 + anchor.getMonth();
    const viewedTotal = year*12 + month;
    const diff = viewedTotal - anchorTotal;
    if(diff<0 || diff%per!==0) return null;
    const day = g.diaPago || 1;
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function gfNextDueDate(g, fromYear, fromMonth){
    const per = parseInt(g.periodicidadMeses)||1;
    if(per<=1) return null;
    for(let i=0;i<per;i++){
      const total = fromYear*12 + fromMonth + i;
      const y = Math.floor(total/12), m = ((total%12)+12)%12;
      const date = gfDueInMonth(g,y,m);
      if(date) return {year:y, month:m, date};
    }
    return null;
  }

  /* -- GASTOS FIJOS -- */
  function renderFijos(){
    const personal = fijos().filter(g=>g.categoria==='PERSONAL');
    const generales = fijos().filter(g=>g.categoria==='FIJOS');
    const tpN = totalPersonalNeto(), tgN = totalGFNeto(), totN = tpN+tgN;
    const ivFijos = totalFijos() - totalFijosNeto();
    // El IRPF retenido a los empleados ya va DENTRO del bruto (y por tanto
    // dentro de tpN/totN) — no se suma aparte a ningún total, es solo una
    // cifra informativa para saber cuánto hay que ingresar en el Modelo 111.
    const irpfMes = personal.filter(g=>g.autoCalc).reduce((s,g)=>s+(parseFloat(g.irpfMensual)||0),0);
    document.getElementById('gf-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.personalNoVat')}</div><div class="val">${fmtMoney(tpN)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.fixedNoVat')}</div><div class="val">${fmtMoney(tgN)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.vatSupportedFixed')}</div><div class="val" style="color:var(--muted)">${fmtMoney(ivFijos)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.realMonthlyCost')}</div><div class="val" style="color:var(--teal)">${fmtMoney(totN)}</div></div>
      ${irpfMes>0.001 ? `<div class="ge-kpi" title="${escapeHtml(t('hr.gf.irpfWithheldHint'))}"><div class="lbl">${t('hr.gf.irpfWithheld')}</div><div class="val" style="color:var(--amber-dark)">${fmtMoney(irpfMes)}</div></div>` : ''}`;
    document.getElementById('gf-cost-hint').textContent = t('hr.lbl.realMonthlyCostHint');
    renderGFList('gf-personal', personal);
    // Se descarta por employeeId cuando la línea de gasto ya está enlazada a
    // una ficha (el caso normal desde que existe este enlace); las líneas
    // antiguas sin employeeId siguen comparándose por nombre, para no volver
    // a sugerir a alguien que ya tiene su coste dado de alta desde antes de
    // este cambio.
    const gfEmployeeIds = new Set(personal.filter(g => g.employeeId != null).map(g => g.employeeId));
    const gfNames = new Set(personal.filter(g => g.employeeId == null).map(g => g.nombre.trim().toLowerCase()));
    const empSuggestions = DB.employees.filter(e => !gfEmployeeIds.has(e.id) && !gfNames.has(e.name.trim().toLowerCase()));
    const sugBox = document.getElementById('gf-personal');
    if(empSuggestions.length){
      sugBox.insertAdjacentHTML('beforeend', `
        <div style="padding:8px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="font-size:12px;color:var(--muted)"><i class="ti ti-users"></i> ${t('hr.gf.employeesNoCost')}</span>
          ${empSuggestions.map(e => `<button class="btn btn-sm" onclick="GE.newGFFromEmployee(${e.id})" style="font-weight:600"><i class="ti ti-plus"></i> ${escapeHtml(e.name)}</button>`).join('')}
        </div>`);
    }
    renderGFList('gf-fijos', generales);
    document.getElementById('gf-total-val').innerHTML = `${fmtMoney(totN)} <span style="font-size:11px;font-weight:400;color:var(--muted)">+ ${t('common.vat')} ${fmtMoney(ivFijos)} = ${fmtMoney(totalFijos())}</span>`;

    const facNeta12 = getMeses().map((_,i)=>facturacionNetaMes(i)).reduce((s,v)=>s+v,0)/12;
    const visEl = document.getElementById('gf-dist-visual');
    const visContent = document.getElementById('gf-visual-content');
    if(facNeta12 > 0){
      visEl.style.display = 'block';
      const items = [
        {lbl:t('hr.lbl.personalNoVat'), v:tpN, pct:tpN/facNeta12*100, color:'var(--blue)'},
        {lbl:t('hr.lbl.fixedNoVat'), v:tgN, pct:tgN/facNeta12*100, color:'var(--purple)'},
      ];
      visContent.innerHTML = items.map(it=>`
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:600">${it.lbl}</span>
            <span style="font-family:monospace">${fmtMoney(it.v)} · <span style="color:${it.pct>35?'var(--red)':'var(--teal-d)'}">${it.pct>999?'&gt;999':it.pct.toFixed(1)}% ${t('hr.lbl.ofSales')}</span></span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(it.pct/50*100,100)}%;background:${it.color};border-radius:4px;transition:width .4s"></div>
          </div>
        </div>`).join('');
    }else{
      visEl.style.display = 'none';
    }
  }
  const GF_PERIODOS = [
    {v:1, lbl:t('hr.periodo.monthly')}, {v:2, lbl:t('hr.periodo.bimonthly')}, {v:3, lbl:t('hr.periodo.quarterly')},
    {v:4, lbl:t('hr.periodo.fourMonthly')}, {v:6, lbl:t('hr.periodo.semiannual')}, {v:12, lbl:t('hr.periodo.annual')}
  ];
  function renderGFList(elId, items){
    document.getElementById(elId).innerHTML = items.length ? items.map(g=>{
      const periodoMeses = parseInt(g.periodicidadMeses)||1;
      const mensual = gfMonthlyImporte(g);
      const detalles = [];
      if(g.diaPago) detalles.push(t('hr.gf.payDay').replace('${d}', g.diaPago));
      const gIva = g.iva!=null ? parseFloat(g.iva) : 0;
      // "mensual" YA es la base sin IVA (gfMonthlyImporte) — el IVA se AÑADE
      // encima para mostrar el total con IVA, nunca se extrae de "mensual"
      // como si ya lo llevara incluido (antes dividía mensual/(1+iva%), lo
      // que daba una base y un IVA por debajo de los reales — p.ej. con
      // 1.200€ de base al 21%, mostraba "Base 991,74€ + IVA 208,26€" en vez
      // de "Base 1.200€ + IVA 252€", aunque los KPI de arriba sí eran
      // correctos porque usan gfMonthlyGross, no este cálculo).
      if(gIva > 0){ const ivaImporte = mensual*gIva/100; detalles.push(`${t('hr.lbl.base')} ${fmtMoney(mensual)} + ${t('common.vat')} ${gIva}% (${fmtMoney(ivaImporte)})`); }
      if(periodoMeses>1){
        detalles.push(`${t('hr.gf.everyMonths').replace('${n}', periodoMeses)} · ${fmtMoney(parseFloat(g.importe||0))}${t('hr.gf.perPayment')}`);
        const today = new Date();
        const next = gfNextDueDate(g, today.getFullYear(), today.getMonth());
        if(next) detalles.push(`<span class="badge badge-blue" style="font-size:10.5px">${t('hr.gf.nextDue').replace('${date}', next.date)}</span>`);
      }
      if(g.autoCalc) detalles.push(t('hr.gf.autoCalcSummary').replace('${neto}', fmtMoney(parseFloat(g.sueldoNeto||0))).replace('${bruto}', fmtMoney(g.sueldoBruto||0)).replace('${ss}', fmtMoney(g.ssEmpresa||0)).replace('${irpf}', fmtMoney(g.irpfMensual||0)));
      return `
      <div class="ge-item" style="flex-wrap:wrap">
        <span style="flex:1;font-size:14px;font-weight:500;min-width:140px">${escapeHtml(g.nombre)}</span>
        <span style="font-family:monospace;font-weight:700;font-size:14px;min-width:80px;text-align:right">${fmtMoney(mensual)}${periodoMeses>1?'<span style="font-size:10.5px;color:var(--muted);font-weight:400">/mes</span>':''}</span>
        <button class="btn btn-sm btn-icon" onclick="GE.editGF(${g.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGF(${g.id})"><i class="ti ti-trash"></i></button>
        ${detalles.length || g.notas ? `<div style="flex-basis:100%;font-size:11.5px;color:var(--muted)">${detalles.join(' · ')}${g.notas?`${detalles.length?' · ':''}<i class="ti ti-note"></i> ${escapeHtml(g.notas)}`:''}</div>` : ''}
      </div>`;
    }).join('')
    : `<div class="empty" style="padding:12px 16px">${t('hr.gf.emptyList')}</div>`;
  }
  function newGF(cat){
    editingGF = null;
    openGFModal(cat==='PERSONAL'?t('hr.gf.titlePersonal'):t('hr.gf.titleFixed'), {nombre:'',importe:'',diaPago:'',categoria:cat, periodicidadMeses:1});
  }
  function newGFFromEmployee(employeeId){
    const emp = DB.employees.find(e => e.id === employeeId);
    if(!emp) return;
    editingGF = null;
    // Enlazada a la ficha del empleado (employeeId), no solo al nombre en
    // texto libre: así no se puede duplicar por una errata ni desincroniza
    // si el empleado se renombra más adelante.
    openGFModal(t('hr.gf.titlePersonal'), {nombre:emp.name,importe:'',diaPago:'',categoria:'PERSONAL', periodicidadMeses:1, employeeId});
  }
  function editGF(id){
    const g = fijos().find(x=>x.id===id); if(!g) return;
    editingGF = id;
    openGFModal(t('hr.gf.titleEdit'), g);
  }
  function openGFModal(title, g){
    const sugerencias = (g.categoria==='PERSONAL'?GF_PERSONAL:GF_FIJOS).map(s=>`<option value="${escapeHtml(gfConceptLabel(s))}">`).join('');
    const autoCalc = !!g.autoCalc;
    // Antes había un único "% Retenciones (IRPF + SS trabajador)" mezclado —
    // servía para calcular el bruto, pero no dejaba ver cuánto de eso era
    // IRPF (lo que hay que declarar en el Modelo 111) frente a Seguridad
    // Social del trabajador. Una ficha antigua que solo tenga el combinado
    // (g.retPct) se reparte con un valor típico de IRPF (15%) y el resto a
    // SS trabajador, para no cambiarle el bruto ya calculado a nadie.
    const irpfPctVal = g.irpfPct != null ? g.irpfPct : (g.retPct != null ? Math.min(15, g.retPct) : 15);
    const ssTrabPctVal = g.ssTrabPct != null ? g.ssTrabPct : (g.retPct != null ? Math.max(0, g.retPct - 15) : 6.35);
    openModal(`
      <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field">
        <label>${t('hr.lbl.concept')}</label>
        <input type="text" id="gf-f-nombre" list="gf-sugerencias" value="${escapeHtml(g.nombre)}">
        <datalist id="gf-sugerencias">${sugerencias}</datalist>
      </div>
      ${g.categoria==='PERSONAL' ? `
      <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:10px;cursor:pointer">
        <input type="checkbox" id="gf-f-autocalc" ${autoCalc?'checked':''} onchange="GE.toggleGFAutoCalc()" style="width:auto">
        ${t('hr.gf.autoCalcCheckbox')}
      </label>
      <div id="gf-autocalc-fields" style="display:${autoCalc?'block':'none'}">
        <div class="field-row">
          <div class="field"><label>${t('hr.gf.netMonthlySalary')}</label><input type="number" id="gf-f-neto" min="0" step="0.01" value="${g.sueldoNeto||''}" oninput="GE.recalcGFAuto()"></div>
          <div class="field"><label>${t('hr.gf.irpfPct')}</label><input type="number" id="gf-f-irpfpct" min="0" max="99" step="0.1" value="${irpfPctVal}" oninput="GE.recalcGFAuto()"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>${t('hr.gf.ssTrabPct')}</label><input type="number" id="gf-f-sstrabpct" min="0" max="99" step="0.1" value="${ssTrabPctVal}" oninput="GE.recalcGFAuto()"></div>
          <div class="field"><label>${t('hr.gf.companySsPct')}</label><input type="number" id="gf-f-sspct" min="0" max="100" step="0.1" value="${g.ssPct!=null?g.ssPct:30}" oninput="GE.recalcGFAuto()"></div>
        </div>
        <div class="ge-kpi-grid" style="margin-bottom:10px">
          <div class="ge-kpi"><div class="lbl">${t('hr.gf.grossSalary')}</div><div class="val" id="gf-auto-bruto">0,00 €</div></div>
          <div class="ge-kpi"><div class="lbl">${t('hr.gf.companySs')}</div><div class="val" id="gf-auto-ss">0,00 €</div></div>
          <div class="ge-kpi"><div class="lbl">${t('hr.gf.irpfWithheld')}</div><div class="val" id="gf-auto-irpf" style="color:var(--amber-dark)">0,00 €</div></div>
          <div class="ge-kpi"><div class="lbl">${t('hr.gf.totalCompanyCost')}</div><div class="val" id="gf-auto-total" style="color:var(--teal)">0,00 €</div></div>
        </div>
      </div>
      ` : ''}
      <div class="field-row">
        <div class="field"><label>${g.categoria==='PERSONAL'?t('hr.lbl.amountEur'):t('hr.lbl.amountNoVat')} ${autoCalc?'<span class="ge-auto">AUTO</span>':''}</label><input type="number" id="gf-f-importe" min="0" step="0.01" value="${g.importe}" ${autoCalc?'readonly':''}></div>
        <div class="field"><label>${t('hr.gf.payDayLabel')}</label><input type="number" id="gf-f-dia" min="1" max="31" placeholder="25" value="${g.diaPago||''}"></div>
      </div>
      <div class="field">
        <label>${t('hr.gf.payPeriodicity')}</label>
        <select id="gf-f-periodo" ${autoCalc?'disabled':''}>
          ${GF_PERIODOS.map(p=>`<option value="${p.v}" ${(autoCalc?1:(parseInt(g.periodicidadMeses)||1))===p.v?'selected':''}>${p.lbl}</option>`).join('')}
        </select>
        ${autoCalc?`<small style="color:var(--muted)">${t('hr.gf.autoCalcMonthlyHint')}</small>`:''}
      </div>
      ${g.categoria!=='PERSONAL' ? `<div class="field"><label>${t('hr.lbl.vatType')}</label>${ivaSelect('gf-f-iva', g.iva)}</div>` : ''}
      <div class="field">
        <label>${t('hr.lbl.commentOptional')}</label>
        <textarea id="gf-f-notas" rows="2" placeholder="${t('hr.gf.internalNotesPh')}">${escapeHtml(g.notas||'')}</textarea>
      </div>
      <input type="hidden" id="gf-f-cat" value="${g.categoria}">
      <input type="hidden" id="gf-f-empid" value="${g.employeeId!=null?g.employeeId:''}">
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="GE.saveGF()">${t('common.save')}</button>
      </div>
    `);
    if(autoCalc) recalcGFAuto();
  }
  function toggleGFAutoCalc(){
    const on = document.getElementById('gf-f-autocalc').checked;
    document.getElementById('gf-autocalc-fields').style.display = on ? 'block' : 'none';
    const importeInput = document.getElementById('gf-f-importe');
    importeInput.readOnly = on;
    // El sueldo neto que se pide arriba es SIEMPRE mensual ("Sueldo neto
    // MENSUAL") — si además se pudiera fijar una periodicidad de pago
    // distinta (p.ej. trimestral), gfMonthlyImporte() volvería a dividir
    // ese total ya mensual entre 3, descuadrando el coste real. Con
    // auto-cálculo activo, la periodicidad queda fija en Mensual.
    const periodoSel = document.getElementById('gf-f-periodo');
    if(periodoSel){ periodoSel.disabled = on; if(on) periodoSel.value = '1'; }
    if(on) recalcGFAuto();
  }
  // Sueldo bruto = neto / (1 - (IRPF% + SS trabajador%)); SS empresa = bruto
  // * ss%; coste total EMPRESA = bruto + SS empresa (el IRPF y la SS del
  // trabajador ya van descontados DENTRO del bruto, no son coste aparte:
  // es dinero del propio sueldo del empleado que la empresa retiene y
  // paga por él, no un gasto extra del negocio).
  function recalcGFAuto(){
    const neto = parseFloat(document.getElementById('gf-f-neto').value) || 0;
    const irpfPct = parseFloat(document.getElementById('gf-f-irpfpct').value) || 0;
    const ssTrabPct = parseFloat(document.getElementById('gf-f-sstrabpct').value) || 0;
    const ssPct = parseFloat(document.getElementById('gf-f-sspct').value) || 0;
    const retPct = irpfPct + ssTrabPct;
    const bruto = retPct < 100 ? neto / (1 - retPct/100) : 0;
    const ssEmpresa = bruto * ssPct/100;
    const irpfMensual = bruto * irpfPct/100;
    const total = bruto + ssEmpresa;
    document.getElementById('gf-auto-bruto').textContent = fmtMoney(bruto);
    document.getElementById('gf-auto-ss').textContent = fmtMoney(ssEmpresa);
    document.getElementById('gf-auto-irpf').textContent = fmtMoney(irpfMensual);
    document.getElementById('gf-auto-total').textContent = fmtMoney(total);
    document.getElementById('gf-f-importe').value = total.toFixed(2);
  }
  function saveGF(){
    const nombre = document.getElementById('gf-f-nombre').value.trim();
    const importe = parseFloat(document.getElementById('gf-f-importe').value);
    if(!nombre){ showToast(t('msg.conceptRequired')); return; }
    if(isNaN(importe) || importe<0){ showToast(t('msg.enterAmount')); return; }
    const catVal = document.getElementById('gf-f-cat').value;
    const ivaEl = document.getElementById('gf-f-iva');
    if(catVal!=='PERSONAL' && ivaEl && ivaEl.value===''){ showToast(t('msg.chooseIvaForExpense')); return; }
    const autocalcEl = document.getElementById('gf-f-autocalc');
    const isAutoCalc = !!(autocalcEl && autocalcEl.checked);
    const data = {
      nombre:nombre.toUpperCase(), importe, diaPago:parseInt(document.getElementById('gf-f-dia').value)||null,
      categoria: catVal,
      // El sueldo neto del auto-cálculo es siempre MENSUAL — con otra
      // periodicidad, gfMonthlyImporte() lo dividiría otra vez entre los
      // meses del periodo, descuadrando el coste real.
      periodicidadMeses: isAutoCalc ? 1 : (parseInt(document.getElementById('gf-f-periodo').value)||1),
      notas: document.getElementById('gf-f-notas').value.trim(),
      iva: ivaEl ? parseFloat(ivaEl.value) : 0
    };
    const empIdVal = document.getElementById('gf-f-empid').value;
    if(empIdVal !== '') data.employeeId = parseInt(empIdVal);
    if(isAutoCalc){
      const neto = parseFloat(document.getElementById('gf-f-neto').value) || 0;
      const irpfPct = parseFloat(document.getElementById('gf-f-irpfpct').value) || 0;
      const ssTrabPct = parseFloat(document.getElementById('gf-f-sstrabpct').value) || 0;
      const ssPct = parseFloat(document.getElementById('gf-f-sspct').value) || 0;
      const retPct = irpfPct + ssTrabPct;
      const bruto = retPct < 100 ? neto / (1 - retPct/100) : 0;
      data.autoCalc = true;
      data.sueldoNeto = neto;
      data.irpfPct = irpfPct;
      data.ssTrabPct = ssTrabPct;
      data.ssPct = ssPct;
      data.sueldoBruto = bruto;
      data.ssEmpresa = bruto * ssPct/100;
      data.irpfMensual = bruto * irpfPct/100;
    }else{
      data.autoCalc = false;
      delete data.sueldoNeto; delete data.irpfPct; delete data.ssTrabPct; delete data.retPct; delete data.ssPct; delete data.sueldoBruto; delete data.ssEmpresa; delete data.irpfMensual;
    }
    if(editingGF){
      const existing = fijos().find(x=>x.id===editingGF);
      Object.keys(existing).forEach(k=>delete existing[k]);
      Object.assign(existing, {id:editingGF}, data);
    }else{
      fijos().push({id:genId(), ...data});
    }
    snapshotGeFijosNeto();
    saveDB();
    closeModal();
    renderFijos();
    showToast(t('msg.expenseSaved'));
  }
  async function deleteGF(id){
    if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
    ge().fijos = fijos().filter(g=>g.id!==id);
    snapshotGeFijosNeto();
    saveDB();
    renderFijos();
  }

  /* -- VENTAS (histórico por día y por mes) --
     Antes Gestión Económica solo tenía histórico de GASTOS (fijos, variables,
     CAPEX) — para ver cuánto se vendió un día concreto, o comparar meses,
     había que ir a TPV → Historial de cierres de caja y sumar a mano. Con el
     dueño probando un pedido online programado para dentro de una semana,
     quedó claro además que sin una vista por FECHA no hay forma de ver de un
     vistazo "¿tengo algo entrando ese día?" — el pedido en sí (DB.tpvOrders)
     no es una venta todavía (no se cobra hasta que se sirve/entrega), así
     que no aparece aquí hasta que se cobre; esta pestaña muestra ventas ya
     cerradas, no pedidos pendientes. */
  let ventasYear = new Date().getFullYear();
  let ventasMonth = new Date().getMonth();
  let ventasTipoFiltro = ''; // '' = todos, o 'mesa'|'takeaway'|'delivery'
  function setVentasYear(delta){ ventasYear += delta; renderVentas(); }
  function setVentasMonth(i){ ventasMonth = i; renderVentas(); }
  function setVentasTipoFiltro(tipo){ ventasTipoFiltro = tipo; renderVentas(); }
  function ventasSalesForMonth(mes, año){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return activeSales().filter(v => (v.date||'').startsWith(mesStr) && (!ventasTipoFiltro || (v.tipo||'mesa')===ventasTipoFiltro));
  }
  function ventasSalesForDay(dateStr){
    return activeSales().filter(v => v.date===dateStr && (!ventasTipoFiltro || (v.tipo||'mesa')===ventasTipoFiltro));
  }
  // La propina ya viaja SUMADA dentro de sale.total (ver finalizeCharge/
  // finalizeSplitOrder) porque de cara al ticket y al cobro es dinero que
  // entra igual en caja — pero para "Ventas" no es facturación del negocio,
  // es del personal. Se resta aquí para que el total de esta pestaña sea la
  // venta real del negocio, y se muestra aparte solo como referencia.
  function ventaSinPropina(sale){ return (parseFloat(sale.total)||0) - (parseFloat(sale.propina)||0); }
  // Qué tipos de servicio tiene activado el negocio (Mi Negocio → Tipos de
  // servicio) — no tiene sentido mostrar un filtro o un desglose de
  // "Delivery" a un negocio que nunca ha tenido esa opción activada.
  function tiposServicioActivos(){
    const ts = (DB.business && DB.business.tiposServicio) || {mesa:true, takeaway:true, delivery:true};
    return ['mesa','takeaway','delivery'].filter(k => ts[k] !== false);
  }
  // Desglose REAL por tipo de servicio del mes entero — independiente del
  // filtro de la tabla de abajo (ventasTipoFiltro), que solo afecta a qué
  // días se listan. Antes lo único que había para distinguir mesa/take
  // away/delivery era ese filtro (uno a la vez, sin verlos juntos).
  function ventasPorTipoMes(mes, año){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    const totales = {mesa:0, takeaway:0, delivery:0};
    activeSales().filter(v => (v.date||'').startsWith(mesStr)).forEach(v => {
      const tipo = v.tipo || 'mesa';
      if(tipo in totales) totales[tipo] += ventaSinPropina(v);
    });
    return totales;
  }
  // Señales de reserva cobradas ese mes — aparte de la facturación oficial
  // a propósito (ver pago_confirmado, js/core.js): todavía no se sabe qué
  // va a pedirse en la mesa ni con qué IVA, así que no se mete como venta
  // fiscal hasta que se cobre la cuenta real (donde se descuenta, ver
  // confirmOpenTableOrder/orderAmountPaidOnline, js/tpv.js). Aun así el
  // dinero SÍ entró ese mes, y sin esto no había forma de verlo en ningún
  // sitio hasta que llegara el día de la reserva.
  function ventasDepositosForMonth(mes, año){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    // Una reserva cancelada tras cobrar la señal (ver setReservationStatus)
    // ya no es un ingreso que se vaya a quedar el negocio — se excluye de
    // esta nota informativa para no seguir contándola como venta del mes
    // indefinidamente mientras esté pendiente de devolver.
    return (DB.reservations||[]).filter(r => r.depositConfirmed && !r.depositNeedsRefund && (r.depositPagoFecha||'').startsWith(mesStr)).reduce((s,r)=>s+parseFloat(r.depositPagoImporte||0),0);
  }
  function renderVentas(){
    document.getElementById('ventas-year').textContent = ventasYear;
    document.getElementById('ventas-months').innerHTML = getMeses().map((m,i)=>`
      <div class="month-pill${i===ventasMonth?' active':''}" onclick="GE.setVentasMonth(${i})">${m}</div>`).join('');
    // Solo se ofrece filtrar por los tipos de servicio que el negocio tiene
    // activados de verdad (Mi Negocio → Tipos de servicio) — antes salían
    // los tres fijos aunque el negocio no hiciera, por ejemplo, delivery.
    // Con un solo tipo activo no hace falta ni el filtro: no hay nada entre
    // lo que elegir.
    const tiposActivos = tiposServicioActivos();
    const tipoFilterBox = document.getElementById('ventas-tipo-filter');
    if(tiposActivos.length < 2){
      tipoFilterBox.innerHTML = '';
      ventasTipoFiltro = '';
    } else {
      const tipos = [{v:'', lbl:t('common.all')}, ...tiposActivos.map(v => ({v, lbl:t('ge.ventas.tipo.'+v)}))];
      tipoFilterBox.innerHTML = tipos.map(x=>`
        <button class="btn btn-sm ${ventasTipoFiltro===x.v?'btn-primary':''}" onclick="GE.setVentasTipoFiltro('${x.v}')">${x.lbl}</button>`).join('');
    }

    const depositosMes = ventasDepositosForMonth(ventasMonth, ventasYear);
    document.getElementById('ventas-depositos-note').innerHTML = depositosMes > 0.001 ? `
      <p style="font-size:12px;color:var(--muted);margin:8px 0 0"><i class="ti ti-cash-banknote"></i> ${t('ge.ventas.depositsNote').replace('${amount}', fmtMoney(depositosMes))}</p>
    ` : '';

    // -- Desglose REAL por tipo de servicio (mes entero, ignora el filtro
    // de la tabla de abajo) — solo se pinta si el negocio tiene más de un
    // tipo activado; con uno solo, el desglose sería igual al total. --
    const tipoBox = document.getElementById('ventas-por-tipo');
    if(tipoBox){
      if(tiposActivos.length < 2){
        tipoBox.innerHTML = '';
      } else {
        const porTipo = ventasPorTipoMes(ventasMonth, ventasYear);
        tipoBox.innerHTML = `
          <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">${t('ge.ventas.byType')}</h4>
          <div class="ge-kpi-grid" style="margin-bottom:14px">
            ${tiposActivos.map(k => `<div class="ge-kpi"><div class="lbl">${t('ge.ventas.tipo.'+k)}</div><div class="val">${fmtMoney(porTipo[k])}</div></div>`).join('')}
          </div>`;
      }
    }

    // -- Histórico por día del mes seleccionado, con total al final --
    // La propina viaja sumada en sale.total (así se cobra en caja) pero NO
    // es facturación del negocio — normalmente es para el personal. Se
    // resta del total de esta pestaña y se muestra aparte, solo a título
    // informativo, para no inflar las ventas reales del negocio.
    document.getElementById('ventas-dia-title').textContent = `${t('ge.ventas.byDay')} — ${getMeses()[ventasMonth]} ${ventasYear}`;
    const nDias = daysInMonth(ventasYear, ventasMonth);
    let diaRows = '';
    let totalMes = 0, ticketsMes = 0, propinaMes = 0;
    for(let d=1; d<=nDias; d++){
      const dateStr = `${ventasYear}-${String(ventasMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const salesDia = ventasSalesForDay(dateStr);
      if(!salesDia.length) continue;
      const totalDia = salesDia.reduce((s,v)=>s+ventaSinPropina(v),0);
      const propinaDia = salesDia.reduce((s,v)=>s+(parseFloat(v.propina)||0),0);
      const ticketsDia = salesDia.length;
      totalMes += totalDia; ticketsMes += ticketsDia; propinaMes += propinaDia;
      diaRows += `<tr><td>${d} ${getMeses()[ventasMonth]}</td><td>${ticketsDia}</td><td>${fmtMoney(totalDia/ticketsDia)}</td><td style="font-weight:700">${fmtMoney(totalDia)}${propinaDia>0.001?`<div style="font-size:10.5px;font-weight:400;color:var(--muted)">↳ ${t('ge.ventas.tips')}: ${fmtMoney(propinaDia)}</div>`:''}</td></tr>`;
    }
    document.getElementById('ventas-dia-table').innerHTML = diaRows ? `
      <thead><tr><th>${t('hr.lbl.day')}</th><th>${t('ge.ventas.tickets')}</th><th>${t('ge.ventas.avgTicket')}</th><th>${t('common.total')}</th></tr></thead>
      <tbody>${diaRows}</tbody>
      <tfoot><tr style="font-weight:700;background:var(--teal-l,#e6f4f1)"><td>${t('ge.ventas.monthTotal')}</td><td>${ticketsMes}</td><td>${fmtMoney(ticketsMes?totalMes/ticketsMes:0)}</td><td>${fmtMoney(totalMes)}${propinaMes>0.001?`<div style="font-size:10.5px;font-weight:400;color:var(--muted)">↳ ${t('ge.ventas.tips')}: ${fmtMoney(propinaMes)}</div>`:''}</td></tr></tfoot>
      ` : `<tbody><tr><td colspan="4"><div class="empty">${t('ge.ventas.emptyMonth')}</div></td></tr></tbody>`;
    const notaPropinas = document.getElementById('ventas-propinas-note');
    if(notaPropinas){
      notaPropinas.innerHTML = propinaMes > 0.001
        ? `<p style="font-size:12px;color:var(--muted);margin:8px 0 0"><i class="ti ti-hand-heart"></i> ${t('ge.ventas.tips')} ${getMeses()[ventasMonth]}: <strong>${fmtMoney(propinaMes)}</strong> — ${t('ge.ventas.tipsHint')}</p>`
        : '';
    }
  }

  /* -- GASTOS VARIABLES -- */
  function setGVYear(delta){ gvYear += delta; renderVariables(); }
  function renderVariables(){
    const gvYearEl = document.getElementById('gv-year');
    if(gvYearEl) gvYearEl.textContent = gvYear;
    document.getElementById('gv-months').innerHTML = getMeses().map((m,i)=>`
      <div class="month-pill${i===activeMonth?' active':''}" onclick="GE.setMonth(${i})">${m}</div>`).join('');
    const mes = activeMonth, tvMes = totalVariablesMes(mes,gvYear), tvNeto = totalVariablesNetoMes(mes,gvYear), ivaSop = tvMes - tvNeto;
    const facNeta = facturacionNetaMes(mes,gvYear), fac = facturacionMes(mes,gvYear);
    const fcPct = facNeta>0 ? (tvNeto/facNeta*100) : 0;
    document.getElementById('gv-sec-title').textContent = `${t('hr.lbl.purchases')} — ${getMeses()[mes]} ${gvYear}`;
    document.getElementById('gv-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.realCostNoVat')}</div><div class="val">${fmtMoney(tvNeto)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.vatSupported')}</div><div class="val" style="color:var(--muted)">${fmtMoney(ivaSop)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.netRevenue')} <span class="ge-auto">TPV</span></div><div class="val">${fmtMoney(facNeta)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.lbl.realFoodCost')}</div><div class="val" style="color:${fcPct>foodCostObjPct()?'var(--red)':fcPct>0?'var(--green)':'var(--muted)'}">${facNeta>0?fcPct.toFixed(1)+'%':'—'}</div><div class="sub">${t('hr.lbl.target')}: ${foodCostObjPct().toFixed(1)}% <button class="btn btn-sm btn-icon" style="min-height:auto;padding:1px 4px;vertical-align:middle" onclick="GE.editFoodCostObj()" title="${t('common.edit')}"><i class="ti ti-edit" style="font-size:11px"></i></button></div></div>`;
    const allItems = variablesMes(mes,gvYear);
    const chartEl = document.getElementById('gv-cat-chart');
    if(chartEl){
      const catTotals = {};
      allItems.forEach(v=>{ catTotals[v.categoria] = (catTotals[v.categoria]||0) + parseFloat(v.importe||0); });
      const chartData = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,v])=>({lbl:truncateSafeText(variableCategoryLabel(cat),18), v}));
      chartEl.innerHTML = chartData.length ? barChartHTML(chartData) : `<div class="empty">${t('hr.gf.emptyList')}</div>`;
    }
    const searchLower = gvSearch.trim().toLowerCase();
    const items = searchLower ? allItems.filter(v=>(v.proveedor||'').toLowerCase().includes(searchLower) || variableCategoryLabel(v.categoria).toLowerCase().includes(searchLower)) : allItems;
    const list = document.getElementById('gv-list');
    const empty = document.getElementById('gv-empty');
    if(!items.length){ list.innerHTML=''; empty.style.display='block'; empty.textContent = searchLower ? t('hr.gv.noSearchResults') : t('empty.noPurchasesMonth'); }
    else{
      empty.style.display='none';
      const bycat = {};
      items.forEach(v=>{ (bycat[v.categoria] = bycat[v.categoria]||[]).push(v); });
      list.innerHTML = Object.entries(bycat).map(([cat,its])=>{
        const autoItems = its.filter(v=>v.auto);
        const manualItems = its.filter(v=>!v.auto);
        const byProv = {};
        autoItems.forEach(v=>{ (byProv[v.proveedor||'—'] = byProv[v.proveedor||'—']||[]).push(v); });
        const autoHtml = Object.entries(byProv).map(([prov,vs])=>{
          const totalBase = vs.reduce((s,v)=>s+parseFloat(v.importe||0),0);
          const totalIva = vs.reduce((s,v)=>s+parseFloat(v.importe||0)*ivaDeGastoVariable(v)/100,0);
          const total = totalBase + totalIva;
          const ids = vs.map(v=>v.id).join(',');
          return `<div class="ge-item" style="flex-wrap:wrap">
            <span style="flex:1;font-size:14px;min-width:140px">${escapeHtml(prov)} <span class="badge badge-gray" style="font-size:10.5px;font-weight:400"><i class="ti ti-truck-delivery"></i> ${t('hr.lbl.receivedOrders')}</span></span>
            <span style="font-size:11px;color:var(--muted);margin-right:4px">${t('hr.lbl.base')} ${fmtMoney(totalBase)} + ${t('common.vat')} ${fmtMoney(totalIva)}</span>
            <span style="font-family:monospace;font-weight:700">${fmtMoney(total)}</span>
            <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGVGroup('${ids}')"><i class="ti ti-trash"></i></button>
          </div>`;
        }).join('');
        const manualHtml = manualItems.map(v=>{
          const base = parseFloat(v.importe||0);
          const pct = ivaDeGastoVariable(v);
          const ivaAmt = base * pct/100;
          const total = base + ivaAmt;
          return `<div class="ge-item" style="flex-wrap:wrap">
          <span style="flex:1;font-size:14px;min-width:140px">${escapeHtml(v.proveedor||'—')}</span>
          <span style="font-size:12px;color:var(--muted);margin-right:4px">${escapeHtml(v.fecha||'')}</span>
          <span style="font-size:11px;color:var(--muted);margin-right:4px">${t('hr.lbl.base')} ${fmtMoney(base)} + ${t('common.vat')} ${pct}% (${fmtMoney(ivaAmt)})</span>
          <span style="font-family:monospace;font-weight:700">${fmtMoney(total)}</span>
          <button class="btn btn-sm btn-icon" onclick="GE.editGV(${v.id})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGV(${v.id})"><i class="ti ti-trash"></i></button>
        </div>`; }).join('');
        return `<div style="padding:8px 16px;background:var(--bg);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:1px solid var(--border)">${escapeHtml(variableCategoryLabel(cat))}</div>${autoHtml}${manualHtml}`;
      }).join('');
    }
    document.getElementById('gv-total-lbl').textContent = `${t('hr.lbl.totalVariables')} ${getMeses()[mes].toUpperCase()}`;
    document.getElementById('gv-total-val').innerHTML = `${fmtMoney(tvNeto)} <span style="font-size:11px;font-weight:400;color:var(--muted)">+ ${t('common.vat')} ${fmtMoney(ivaSop)} = ${fmtMoney(tvMes)}</span>`;
    renderGastoHormiga();
  }
  // El objetivo de food cost también se edita desde Punto de Equilibrio, y
  // el mismo número alimenta el "% Gastos Variables" de Tesorería — antes se
  // podía cambiar en un sitio y quedaba desactualizado en los demás; ahora
  // los tres leen y escriben el mismo valor (ver foodCostObjPct/
  // setFoodCostObjPct arriba).
  async function editFoodCostObj(){
    const actual = foodCostObjPct();
    const val = await promptText(t('hr.gv.editFoodCostObjPrompt'), String(actual));
    if(val === null) return;
    const n = parseFloat(val);
    if(isNaN(n) || n<=0 || n>100){ showToast(t('msg.enterAmount')); return; }
    setFoodCostObjPct(n);
    saveDB();
    renderVariables();
    showToast(t('msg.expenseSaved'));
  }

  // "Gasto hormiga": proveedores con muchos cargos pequeños y recurrentes a
  // lo largo del año (comisiones, suministros puntuales...) que por
  // separado parecen insignificantes pero suman más de lo que parece.
  // Mira el año entero, no solo el mes activo, para detectar el patrón.
  function renderGastoHormiga(){
    const box = document.getElementById('gv-hormiga');
    if(!box) return;
    const all = variables().filter(v => parseInt(v.año) === gvYear);
    const byProv = {};
    all.forEach(v => {
      const key = v.proveedor || t('common.unknown');
      (byProv[key] = byProv[key]||[]).push(parseFloat(v.importe||0));
    });
    const candidates = Object.entries(byProv)
      .map(([prov, amounts]) => ({prov, n: amounts.length, total: amounts.reduce((a,b)=>a+b,0), avg: amounts.reduce((a,b)=>a+b,0)/amounts.length}))
      .filter(c => c.n >= 6 && c.avg < 60)
      .sort((a,b) => b.total - a.total)
      .slice(0, 5);
    if(!candidates.length){ box.innerHTML = ''; return; }
    box.innerHTML = `
      <div class="card" style="margin-bottom:14px;border:1px solid var(--amber);background:var(--amber-l)">
        <h4 style="margin-bottom:4px"><i class="ti ti-ant"></i> ${t('hr.hormiga.title')}</h4>
        <p style="font-size:12px;color:var(--muted);margin-bottom:8px">${t('hr.hormiga.desc').replace('${year}', currentYear())}</p>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${candidates.map(c => `<div style="display:flex;justify-content:space-between;font-size:13px"><span>${escapeHtml(c.prov)} <span style="color:var(--muted)">(${c.n}${t('hr.hormiga.timesSuffix')}, ${fmtMoney(c.avg)}${t('hr.hormiga.avgSuffix')})</span></span><strong>${fmtMoney(c.total)}</strong></div>`).join('')}
        </div>
      </div>`;
  }
  function setMonth(m){ activeMonth = m; renderVariables(); }
  function setGVSearch(v){ gvSearch = v; renderVariables(); }
  function newGV(){
    editingGV = null;
    openGVModal({categoria:VARIABLE_CATEGORIES[0], proveedor:'', importe:'', iva:null, fecha:`${gvYear}-${String(activeMonth+1).padStart(2,'0')}-01`});
  }
  function editGV(id){
    const v = variables().find(x=>x.id===id); if(!v) return;
    editingGV = id;
    openGVModal(v);
  }
  function openGVModal(v){
    const provs = proveedores();
    openModal(`
      <div class="modal-header"><h3>${editingGV?t('hr.gv.editPurchase'):t('hr.gv.addPurchase')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="gv-f-cat">${VARIABLE_CATEGORIES.map(c=>`<option value="${c}" ${v.categoria===c?'selected':''}>${escapeHtml(variableCategoryLabel(c))}</option>`).join('')}</select>
      </div>
      <div class="field" style="position:relative">
        <label>${t('common.supplier')}</label>
        <input type="text" id="gv-f-prov" value="${escapeHtml(v.proveedor||'')}" autocomplete="off" oninput="runTypeahead('gv-f-prov')" onfocus="runTypeahead('gv-f-prov')" onblur="setTimeout(()=>hideTypeahead('gv-f-prov'),150)">
        <div id="gv-f-prov-results" class="typeahead-results" style="display:none"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t('hr.lbl.amountNoVat')}</label><input type="number" id="gv-f-imp" min="0" step="0.01" value="${v.importe||''}"></div>
        <div class="field"><label>${t('hr.lbl.vatType')}</label>${ivaSelect('gv-f-iva', v.iva)}</div>
      </div>
      <div class="field">
        <label>${t('common.date')}</label><input type="date" id="gv-f-fecha" value="${v.fecha||''}">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.saveGV()">${t("common.save")}</button>
      </div>
    `);
    attachTypeahead('gv-f-prov', 'gv-f-prov-results',
      q => provs.filter(p => p.toLowerCase().includes(q)),
      p => escapeHtml(p),
      p => { document.getElementById('gv-f-prov').value = p; });
  }
  function saveGV(){
    const imp = parseFloat(document.getElementById('gv-f-imp').value);
    if(isNaN(imp) || imp<=0){ showToast(t('msg.enterAmount')); return; }
    const ivaRaw = document.getElementById('gv-f-iva').value;
    if(ivaRaw === ''){ showToast(t('msg.chooseIvaForExpense')); return; }
    const fecha = document.getElementById('gv-f-fecha').value;
    if(!fecha){ showToast(t('msg.chooseDateForExpense')); return; }
    // mes/año se derivan SIEMPRE de la fecha, tanto al crear como al editar.
    // Antes solo se fijaban una vez al crear el gasto (mes: activeMonth, año:
    // currentYear) y nunca se resincronizaban al editar la fecha — así que
    // corregir la fecha de una compra para moverla a otro mes (caso muy
    // habitual: registrar hoy una factura que llegó tarde y es del mes
    // anterior) no la movía de verdad en ningún cálculo (CDR, Resultado,
    // Tesorería, food cost real), que filtran todos por mes/año, no por
    // fecha. El bloqueo de mes cerrado (isDateClosed) sí mira la fecha, así
    // que antes podía usar un criterio distinto al que de verdad determinaba
    // en qué mes contaba el gasto.
    const [fy, fm] = fecha.split('-').map(Number);
    const data = {
      categoria: document.getElementById('gv-f-cat').value,
      proveedor: document.getElementById('gv-f-prov').value.trim().toUpperCase() || 'SIN PROVEEDOR',
      importe: imp,
      iva: parseFloat(ivaRaw),
      fecha, mes: fm - 1, año: fy
    };
    if(editingGV){
      const existing = variables().find(x=>x.id===editingGV);
      if(existing){
        if(isDateClosed(existing.fecha) || isDateClosed(data.fecha)){ showToast(t('hr.te.monthClosedError')); return; }
        Object.assign(existing, data);
      }
    }else{
      if(isDateClosed(data.fecha)){ showToast(t('hr.te.monthClosedError')); return; }
      variables().push({id: genId(), ...data});
    }
    saveDB();
    closeModal();
    renderVariables();
    showToast(t('msg.purchaseSaved'));
  }
  async function deleteGV(id){
    const v = variables().find(x=>x.id===id);
    if(v && isDateClosed(v.fecha)){ showToast(t('hr.te.monthClosedError')); return; }
    if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
    ge().variables = variables().filter(v=>v.id!==id);
    saveDB();
    renderVariables();
  }
  async function deleteGVGroup(idsStr){
    const ids = idsStr.split(',').map(s=>parseInt(s));
    if(variables().some(v=>ids.includes(v.id) && isDateClosed(v.fecha))){ showToast(t('hr.te.monthClosedError')); return; }
    if(!(await confirmModal(t('msg.confirmDeletePurchases')))) return;
    ge().variables = variables().filter(v=>!ids.includes(v.id));
    saveDB();
    renderVariables();
  }

  /* -- CUENTA DE RESULTADOS -- */
  // Antes eran dos pestañas separadas (Cuenta de Resultados y Resultado)
  // con las mismas cifras pero a distinta resolución temporal (mes a mes
  // vs. trimestre a trimestre) — y encima con filas que no coincidían entre
  // una y otra (Margen Bruto/EBITDA solo en una, IVA a liquidar solo en la
  // otra). Fusionadas en una sola tabla con un interruptor de resolución,
  // todas las filas de las dos juntas.
  let cdrGranularidad = 'trimestre';
  function setCDRGranularidad(g){ cdrGranularidad = g; renderCDR(); }
  function setCDRYear(delta){ cdrYear += delta; renderCDR(); }
  function syncYearLabels(){
    const el = document.getElementById('cdr-year'); if(el) el.textContent = cdrYear;
  }
  function renderCDR(){
    syncYearLabels();
    ['cdr-gran-mes','cdr-gran-trimestre'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle('btn-primary', id==='cdr-gran-'+cdrGranularidad);
    });
    const pctImpEl = document.getElementById('res-pct-impuesto');
    if(pctImpEl) pctImpEl.value = config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25;
    const ivaPct = ivaVentasPct();
    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    // El aviso solo tiene sentido si TODO el año consultado es anterior al
    // primer punto del histórico de gastos fijos (no hay ningún dato real
    // de esas fechas). Si hay histórico, cada mes ya usa su propio valor
    // real de entonces (geTotalFijosNetoForMonth), no el de hoy.
    const fijosNote = geFijosHistoryPredatesYear(cdrYear) ? ` <span style="font-size:10.5px;font-weight:400;color:var(--muted)">${t('hr.res.currentFijosNote')}</span>` : '';
    // Una sola tabla, con TODAS las filas de las dos vistas que había antes
    // (algunas solo estaban en una: Margen Bruto/EBITDA solo en "Resultado",
    // IVA a liquidar solo en "Cuenta de Resultados") — nunca más un desglose
    // distinto según en qué pestaña se mirase. Todo en valores CON SIGNO
    // (gasto = negativo) para que sumar trimestre/año sea una simple resta.
    const rows = [
      // Ingresos = facturación neta + IVA repercutido (no facturacionMes, que
      // suma v.total e incluye la propina): así la fila de abajo, "IVA
      // repercutido", resta exactamente lo que hace falta para llegar a
      // "Facturación neta" — si no, con propina en el mes la resta no cuadraba.
      {lbl:t('hr.cdr.revenue'), vals:getMeses().map((_,i)=>facturacionNetaMes(i,cdrYear)+ivaVentasMes(i,cdrYear)), auto:true, bold:true, yoyFn:i=>facturacionNetaMes(i,cdrYear-1)+ivaVentasMes(i,cdrYear-1)},
      {lbl:t('hr.cdr.vatOnSales').replace('${pct}', ivaPct), vals:getMeses().map((_,i)=>-ivaVentasMes(i,cdrYear)), auto:true},
      {lbl:t('hr.cdr.netRevenue'), vals:getMeses().map((_,i)=>facturacionNetaMes(i,cdrYear)), auto:true, highlight:true, bold:true},
      {lbl:t('hr.lbl.variableExpensesNoVat'), vals:getMeses().map((_,i)=>-totalVariablesNetoMes(i,cdrYear)), auto:true},
      {lbl:t('hr.res.grossMargin'), vals:getMeses().map((_,i)=>facturacionNetaMes(i,cdrYear)-totalVariablesNetoMes(i,cdrYear)), highlight:true, bold:true},
      {lbl:t('hr.lbl.deliveryCommissions'), vals:getMeses().map((_,i)=>-comisionesMes(i,cdrYear)), auto:true},
      {lbl:t('hr.lbl.fixedNoVat')+fijosNote, vals:getMeses().map((_,i)=>-geTotalFijosNetoForMonth(cdrYear,i)), auto:true},
      {lbl:t('hr.res.operatingEbitda'), vals:getMeses().map((_,i)=>facturacionNetaMes(i,cdrYear)-totalVariablesNetoMes(i,cdrYear)-geTotalFijosNetoForMonth(cdrYear,i)-comisionesMes(i,cdrYear)), highlight:true, bold:true},
      {lbl:t('hr.lbl.financedInvestmentInstallments'), vals:getMeses().map((_,i)=>-capexCuotaMes(i,cdrYear)), auto:true},
      {lbl:t('hr.cdr.resultBeforeTax'), vals:getMeses().map((_,i)=>resultadoAntesImpMes(i,cdrYear)), highlight:true, isResult:true},
      {lbl:`${t('hr.cdr.profitTax')} (${(pctImp*100).toFixed(0)}%)`, vals:getMeses().map((_,i)=>{ const r=resultadoAntesImpMes(i,cdrYear); return r>0?-(r*pctImp):0; }), auto:true},
      {lbl:t('hr.cdr.netResult'), vals:getMeses().map((_,i)=>resultadoMes(i,cdrYear)), auto:true, highlight:true, isResult:true, yoyFn:i=>resultadoMes(i,cdrYear-1)},
      {lbl:t('hr.cdr.vatToSettle'), vals:getMeses().map((_,i)=>ivaLiquidarMes(i,cdrYear)), auto:true, ivaRow:true},
      // El IRPF retenido a los empleados, a diferencia del IVA, no tiene
      // "a favor": siempre es dinero ya retenido pendiente de ingresar, así
      // que no lleva el mismo pos/neg que la fila de IVA.
      {lbl:t('hr.cdr.irpfToDeposit'), vals:getMeses().map((_,i)=>geIrpfMensualForMonth(cdrYear,i)), auto:true, irpfRow:true},
    ];
    const quarters = ['T1','T2','T3','T4'];
    const isMes = cdrGranularidad === 'mes';
    let html = `<thead><tr><th>${t('hr.lbl.concept')}</th>${isMes?getMeses().map(m=>`<th>${m}</th>`).join(''):''}${quarters.map(q=>`<th style="background:var(--dark);color:#fff">${q}</th>`).join('')}<th style="background:var(--dark);color:#fff">${t('hr.lbl.yearAbbrev')}</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const total = r.vals.reduce((s,v)=>s+v,0);
      const q = [0,1,2,3].map(qi=>r.vals.slice(qi*3,qi*3+3).reduce((s,v)=>s+v,0));
      const cls = r.highlight ? (r.isResult?'total':'highlight') : '';
      let yoyHtml = '';
      if(r.yoyFn){
        const prevTotal = getMeses().reduce((s,_,i)=>s+r.yoyFn(i),0);
        if(prevTotal !== 0){
          const pct = (total-prevTotal)/Math.abs(prevTotal)*100;
          const color = pct>=0?'var(--green)':'var(--red)';
          yoyHtml = `<br><span style="font-size:10.5px;color:${color}">${pct>=0?'▲':'▼'} ${Math.abs(pct).toFixed(1)}% ${t('hr.cdr.yoyLabel')}</span>`;
        }
      }
      // Al pasar el cursor por una columna de trimestre o del año, se ve el
      // desglose de lo que la compone (los 3 meses del trimestre, o los 4
      // trimestres del año) — en modo Trimestral no hay otra forma de ver
      // los meses sueltos sin cambiar a Mensual.
      const qTitle = qi => [0,1,2].map(mi => `${getMeses()[qi*3+mi]}: ${fmtMoney(r.vals[qi*3+mi])}`).join(' · ');
      const yearTitle = quarters.map((ql,qi) => `${ql}: ${fmtMoney(q[qi])}`).join(' · ');
      html += `<tr class="${cls}"><td>${r.lbl}${r.auto?'<span class="ge-auto">AUTO</span>':''}</td>`;
      if(r.ivaRow){
        if(isMes) r.vals.forEach(v=>{
          const c = v>0?'neg':(v<0?'pos':'');
          const suf = v>0?' '+t('hr.lbl.toPay'):(v<0?' '+t('hr.lbl.inYourFavor'):'');
          html += `<td class="${c}">${v!==0?fmtMoney(Math.abs(v))+suf:'—'}</td>`;
        });
        q.forEach((v,qi)=>{ const c = v>0?'neg':(v<0?'pos':''); const suf = v>0?' '+t('hr.lbl.toPay'):(v<0?' '+t('hr.lbl.inYourFavor'):''); html += `<td style="background:rgba(0,0,0,.05)" class="${c}" title="${escapeHtml(qTitle(qi))}">${v!==0?fmtMoney(Math.abs(v))+suf:'—'}</td>`; });
        const c = total>0?'neg':(total<0?'pos':''); const suf = total>0?' '+t('hr.lbl.toPay'):(total<0?' '+t('hr.lbl.inYourFavor'):'');
        html += `<td style="background:rgba(0,0,0,.1)" class="${c}" title="${escapeHtml(yearTitle)}">${total!==0?fmtMoney(Math.abs(total))+suf:'—'}</td></tr>`;
      } else if(r.irpfRow){
        if(isMes) r.vals.forEach(v=>{ html += `<td class="${v>0?'neg':''}">${v!==0?fmtMoney(v):'—'}</td>`; });
        q.forEach((v,qi)=>{ html += `<td style="background:rgba(0,0,0,.05)" class="${v>0?'neg':''}" title="${escapeHtml(qTitle(qi))}">${v!==0?fmtMoney(v):'—'}</td>`; });
        html += `<td style="background:rgba(0,0,0,.1)" class="${total>0?'neg':''}" title="${escapeHtml(yearTitle)}">${total!==0?fmtMoney(total):'—'}</td></tr>`;
      } else {
        if(isMes) r.vals.forEach(v=>{
          const c = r.isResult ? (v>=0?'pos':'neg') : '';
          const sign = r.isResult && v<0 ? '-' : '';
          html += `<td class="${c}">${v!==0?sign+fmtMoney(Math.abs(v)):'—'}</td>`;
        });
        q.forEach((v,qi)=>{ const c = r.isResult ? (v>=0?'pos':'neg') : ''; html += `<td style="background:rgba(0,0,0,.05)" class="${c}" title="${escapeHtml(qTitle(qi))}">${v!==0?(r.isResult&&v<0?'-':'')+fmtMoney(Math.abs(v)):'—'}</td>`; });
        const c = r.isResult ? (total>=0?'pos':'neg') : '';
        html += `<td style="background:rgba(0,0,0,.1)" class="${c}" title="${escapeHtml(yearTitle)}">${total!==0?(r.isResult&&total<0?'-':'')+fmtMoney(Math.abs(total)):'—'}${yoyHtml}</td></tr>`;
      }
    });
    html += '</tbody>';
    document.getElementById('cdr-table').innerHTML = html;
    document.getElementById('cdr-chart').innerHTML = barChartHTML(getMeses().map((m,i)=>({lbl:m, v:resultadoMes(i,cdrYear)})));
    renderMonthComparison();
  }

  /* -- PUNTO DE EQUILIBRIO -- */
  function peScenarios(){ if(!config().scenarios) config().scenarios = []; return config().scenarios; }
  function renderPE(){
    const tf = totalFijosNeto();
    document.getElementById('pe-fijos').value = tf.toFixed(2);
    document.getElementById('pe-ticket').value = config().ticketMedio || '';
    document.getElementById('pe-cubiertos').value = config().cubiertosActuales || '';
    document.getElementById('pe-dias').value = config().diasApertura || '';
    document.getElementById('pe-fc').value = foodCostObjPct();
    const sel = document.getElementById('pe-scenario-sel');
    if(sel){
      const scenarios = peScenarios();
      sel.innerHTML = `<option value="">${t('hr.pe.scenarioDefaultOption')}</option>` + scenarios.map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    }
    calcPE();
  }
  function resetPEOutputs(msg){
    ['pe-r1','pe-r2','pe-r4','pe-r5','pe-r6'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='—'; });
    const r3 = document.getElementById('pe-r3'); if(r3) r3.textContent = msg || '—';
    const estadoEl = document.getElementById('pe-estado');
    if(estadoEl){ estadoEl.textContent = '—'; estadoEl.style.color = ''; }
    const gaugeEl = document.getElementById('pe-gauge');
    if(gaugeEl) gaugeEl.innerHTML = '';
  }
  function calcPE(){
    const fij = parseFloat(document.getElementById('pe-fijos').value) || 0;
    const tick = parseFloat(document.getElementById('pe-ticket').value) || 0;
    const cub = parseFloat(document.getElementById('pe-cubiertos').value) || 0;
    const dias = parseFloat(document.getElementById('pe-dias').value) || 0;
    const fc = parseFloat(document.getElementById('pe-fc').value) || 35;
    Object.assign(config(), {ticketMedio:tick, cubiertosActuales:cub, diasApertura:dias});
    setFoodCostObjPct(fc);
    saveDB();
    if(!tick || !dias){
      resetPEOutputs();
      return;
    }
    const cvCub = tick*(fc/100);
    const contribCub = tick - cvCub;
    if(contribCub<=0){ resetPEOutputs(t('hr.pe.notCalculable')); return; }
    const cubNec = Math.ceil(fij/contribCub);
    const cubDia = Math.ceil(cubNec/dias);
    const ventasMin = cubNec*tick;
    document.getElementById('pe-r1').textContent = fmtMoney(cvCub)+t('hr.pe.perCover');
    document.getElementById('pe-r2').textContent = fmtMoney(contribCub)+t('hr.pe.perCover');
    document.getElementById('pe-r3').textContent = t('hr.pe.coversPerMonth').replace('${n}', cubNec);
    document.getElementById('pe-r4').textContent = t('hr.pe.coversPerDay').replace('${n}', cubDia);
    document.getElementById('pe-r5').textContent = fmtMoney(ventasMin);
    const diff = cub - cubNec;
    document.getElementById('pe-r6').textContent = (diff>=0?'+':'')+diff+t('hr.pe.coversSuffix');
    const estadoEl = document.getElementById('pe-estado');
    estadoEl.textContent = diff>=0 ? t('hr.pe.aboveBreakeven') : t('hr.pe.belowBreakeven');
    estadoEl.style.color = diff>=0 ? 'var(--green)' : 'var(--red)';
    peGauge(cub, cubNec);
  }
  function peGauge(cub, cubNec){
    const el = document.getElementById('pe-gauge'); if(!el) return;
    const max = Math.max(cub, cubNec, 1)*1.2;
    const pctAct = Math.min(cub/max*100, 100);
    const pctNec = Math.min(cubNec/max*100, 100);
    const ok = cub >= cubNec;
    el.innerHTML = `
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between">
        <span>0</span><span style="color:var(--amber-dark);font-weight:600">${t('hr.pe.breakevenGauge').replace('${n}', cubNec)}</span><span>${Math.ceil(max)}</span>
      </div>
      <div style="position:relative;height:28px;background:var(--border);border-radius:6px;overflow:visible">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctAct}%;background:${ok?'var(--teal)':'var(--red)'};border-radius:6px;transition:width .4s"></div>
        <div style="position:absolute;left:${pctNec}%;top:-4px;height:36px;width:3px;background:var(--amber-dark);border-radius:2px"></div>
        <div style="position:absolute;left:clamp(28px,${pctNec}%,calc(100% - 28px));top:34px;transform:translateX(-50%);font-size:10.5px;color:var(--amber-dark);font-weight:700;white-space:nowrap">${t('hr.pe.equilibriumArrow')}</div>
      </div>
      <div style="margin-top:24px;font-size:13px;font-weight:600;color:${ok?'var(--green)':'var(--red)'}">
        ${ok?t('hr.pe.aboveBreakevenLong'):t('hr.pe.belowBreakevenLong')} · ${t('hr.pe.currentCovers').replace('${n}', cub)}
      </div>`;
  }
  // Autorrelleno de ticket medio y cubiertos/mes a partir de las ventas reales de los
  // últimos 30 días (mismo criterio que el Panel principal). Un solo click, no forzado:
  // el usuario puede seguir ajustando los valores a mano después.
  function peUseRealData(){
    const today = new Date();
    const start = dateStr(new Date(today.getTime() - 29*86400000));
    const end = todayStr();
    const sales = activeSales().filter(s=>s.date>=start && s.date<=end);
    if(!sales.length){ showToast(t('hr.pe.noRecentSalesData')); return; }
    // El ticket medio del Punto de Equilibrio se compara contra un food cost
    // objetivo definido SIN IVA (mismo criterio que en el resto de la app:
    // renderVariables usa tvNeto/facNeta). Si aquí se metiera el ticket CON
    // IVA (sale.total), el margen de contribución salía inflado y el punto
    // de equilibrio necesario, infravalorado — un negocio por debajo del
    // equilibrio real podía ver el semáforo en verde.
    const fallbackRate = ivaVentasPct();
    const totalNeto = sales.reduce((s,x)=>{
      const descPct = parseFloat(x.descuentoPct)||0;
      const netoVenta = (x.items||[]).reduce((sl,line)=>{
        const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
        const rate = line.ivaPct != null ? parseFloat(line.ivaPct) : fallbackRate;
        return sl + grossLine/(1+rate/100);
      }, 0);
      return s + netoVenta;
    }, 0);
    const avgTicket = totalNeto/sales.length;
    document.getElementById('pe-ticket').value = avgTicket.toFixed(2);
    document.getElementById('pe-cubiertos').value = sales.length;
    calcPE();
    showToast(t('hr.pe.realDataApplied'));
  }
  async function peSaveScenario(){
    const name = (await promptText(t('hr.pe.scenarioNamePrompt'), '')||'').trim();
    if(!name) return;
    const data = {
      name,
      ticketMedio: parseFloat(document.getElementById('pe-ticket').value)||0,
      cubiertosActuales: parseFloat(document.getElementById('pe-cubiertos').value)||0,
      diasApertura: parseFloat(document.getElementById('pe-dias').value)||0,
      foodCostObj: parseFloat(document.getElementById('pe-fc').value)||35
    };
    const scenarios = peScenarios();
    const existing = scenarios.find(s=>s.name===name);
    if(existing) Object.assign(existing, data); else scenarios.push(data);
    saveDB();
    renderPE();
    const sel = document.getElementById('pe-scenario-sel');
    if(sel) sel.value = name;
    showToast(t('msg.scenarioSaved'));
  }
  function peLoadScenario(name){
    if(!name) return;
    const sc = peScenarios().find(s=>s.name===name);
    if(!sc) return;
    document.getElementById('pe-ticket').value = sc.ticketMedio;
    document.getElementById('pe-cubiertos').value = sc.cubiertosActuales;
    document.getElementById('pe-dias').value = sc.diasApertura;
    document.getElementById('pe-fc').value = sc.foodCostObj;
    calcPE();
  }
  async function peDeleteScenario(){
    const sel = document.getElementById('pe-scenario-sel');
    const name = sel ? sel.value : '';
    if(!name) return;
    if(!(await confirmModal(t('msg.confirmDeleteGeneric')))) return;
    ge().config.scenarios = peScenarios().filter(s=>s.name!==name);
    saveDB();
    renderPE();
  }

  /* -- CAPEX -- */
  // Cuotas restantes de una inversión financiada correctamente configurada (cuotas>=1
  // y cuotaMensual>0). Devuelve null si no está configurada (para no confundir "sin
  // configurar" con "ya pagado").
  function capexRestantes(c){
    const cuotas = parseInt(c.cuotas)||0;
    if(cuotas<1 || !(parseFloat(c.cuotaMensual)>0)) return null;
    if(!c.fecha) return cuotas;
    const [fy,fm] = c.fecha.split('-').map(Number);
    const now = new Date();
    const elapsed = (now.getFullYear()*12+now.getMonth()) - (fy*12+(fm-1));
    const pagadas = Math.min(Math.max(elapsed,0), cuotas);
    return Math.max(cuotas-pagadas, 0);
  }
  // Una inversión financiada reparte su coste en cuotas mes a mes: si se edita/borra,
  // afecta a TODOS los meses de su ventana de financiación, no solo al mes de alta.
  // Por eso al comprobar el cierre no basta con mirar c.fecha: si cualquiera de esos
  // meses ya está cerrado, también hay que bloquear el cambio.
  function capexTouchesClosedMonth(c){
    if(!c.fecha) return false;
    if(isDateClosed(c.fecha)) return true;
    if(!c.financiado) return false;
    const cuotas = parseInt(c.cuotas)||0;
    if(cuotas<1) return false;
    const [fy,fm] = c.fecha.split('-').map(Number);
    for(let i=0;i<cuotas;i++){
      const total = fy*12+(fm-1)+i;
      if(isMonthClosed(Math.floor(total/12), total%12)) return true;
    }
    return false;
  }
  function capexDeudaPendiente(){
    let totalDeuda = 0, totalCuotas = 0;
    capex().forEach(c=>{
      if(!c.financiado) return;
      const restantes = capexRestantes(c);
      if(restantes==null) return;
      totalDeuda += restantes * parseFloat(c.cuotaMensual||0);
      totalCuotas += restantes;
    });
    return {totalDeuda, totalCuotas};
  }
  function renderCapex(){
    const tbody = document.getElementById('capex-tbody');
    const empty = document.getElementById('capex-empty');
    const deudaEl = document.getElementById('capex-deuda-val');
    const overdueAlert = document.getElementById('capex-overdue-alert');
    if(overdueAlert){
      const overdue = capex().filter(c=>c.financiado && capexRestantes(c)===0 && c.estadoPago!=='PAGADO');
      if(overdue.length){
        overdueAlert.style.display='block';
        overdueAlert.innerHTML = `<div class="ge-section" style="background:var(--amber-l);border:1px solid var(--amber)">
          <div style="font-weight:600;color:var(--amber-dark);margin-bottom:4px"><i class="ti ti-alert-triangle"></i> ${t('hr.capex.overdueTitle')}</div>
          <div style="font-size:12px;color:var(--amber-dark)">${overdue.map(c=>escapeHtml(c.descripcion)).join(', ')} — ${t('hr.capex.overdueDesc')}</div>
        </div>`;
      } else {
        overdueAlert.style.display='none';
        overdueAlert.innerHTML='';
      }
    }
    if(deudaEl){
      const {totalDeuda, totalCuotas} = capexDeudaPendiente();
      deudaEl.innerHTML = `${fmtMoney(totalDeuda)} <span style="font-size:11px;font-weight:400;color:var(--muted)">${t('hr.capex.debtPendingSub').replace('${n}', totalCuotas)}</span>`;
    }
    if(!capex().length){
      tbody.innerHTML='';
      empty.style.display='block';
      ['capex-base','capex-iva','capex-total'].forEach(id=>document.getElementById(id).textContent='—');
      return;
    }
    empty.style.display='none';
    let base=0, ivaT=0;
    tbody.innerHTML = capex().map(c=>{
      const imp=parseFloat(c.importe||0), ivaPct=parseFloat(c.iva||0);
      const ivaAmt=imp*ivaPct/100, tot=imp+ivaAmt;
      base+=imp; ivaT+=ivaAmt;
      const cs = c.estadoPago==='PAGADO' ? {bg:'var(--green-l)',tx:'var(--green)'}
        : c.estadoPago==='PARCIAL' ? {bg:'var(--amber-l)',tx:'var(--amber-dark)'}
        : {bg:'var(--red-l)',tx:'var(--red)'};
      let financInfo = '—';
      if(c.financiado){
        const restantes = capexRestantes(c);
        if(restantes==null){
          financInfo = `<span style="color:var(--red)">${t('hr.capex.notConfigured')}</span>`;
        } else {
          const overdueTag = (restantes===0 && c.estadoPago!=='PAGADO') ? ` <span style="color:var(--amber-dark)" title="${t('hr.capex.overdueDesc')}"><i class="ti ti-alert-triangle"></i></span>` : '';
          financInfo = `${fmtMoney(c.cuotaMensual||0)}${t('hr.capex.perMonth')} · ${restantes>0?t('hr.capex.installmentsRemaining').replace('${n}', restantes):t('hr.capex.paidOff')}${overdueTag}`;
        }
      }
      return `<tr>
        <td style="text-align:left;font-weight:600">${escapeHtml(c.descripcion)}</td>
        <td>${escapeHtml(c.fecha||'—')}</td>
        <td>${fmtMoney(imp)}</td>
        <td>${fmtMoney(ivaAmt)}</td>
        <td>${fmtMoney(tot)}</td>
        <td><span class="badge" style="background:${cs.bg};color:${cs.tx}">${estadoPagoLabel(c.estadoPago)}</span></td>
        <td style="font-size:12px">${financInfo}</td>
        <td style="text-align:left">
          <button class="btn btn-sm btn-icon" onclick="GE.editCapex(${c.id})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteCapex(${c.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('capex-base').textContent = fmtMoney(base);
    document.getElementById('capex-iva').textContent = fmtMoney(ivaT);
    document.getElementById('capex-total').textContent = fmtMoney(base+ivaT);
  }
  const ESTADO_PAGO_KEYS = {PAGADO:'hr.capex.paid', PENDIENTE:'hr.capex.pending', PARCIAL:'hr.capex.partial'};
  // Una inversión guardada antes de que existiera el estado de pago no tiene
  // el campo. Sin esta guarda, t(undefined) pinta literalmente "undefined"
  // dentro de una etiqueta roja, como si fuera un estado.
  function estadoPagoLabel(code){ return code ? t(ESTADO_PAGO_KEYS[code]||code) : '—'; }
  function newCapex(){
    editingCX = null;
    openCapexModal(t('hr.capex.newInvestment'), {descripcion:'', importe:'', iva:null, fecha:todayStr(), estadoPago:'PENDIENTE', financiado:false, cuotaMensual:'', cuotas:''});
  }
  function editCapex(id){
    const c = capex().find(x=>x.id===id); if(!c) return;
    editingCX = id;
    openCapexModal(t('hr.capex.editInvestment'), c);
  }
  function toggleCapexFinanciado(){
    const checked = document.getElementById('cx-f-financiado').checked;
    document.getElementById('cx-f-cuotas-row').style.display = checked ? 'flex' : 'none';
  }
  function openCapexModal(title, c){
    openModal(`
      <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field"><label>${t('hr.lbl.description')}</label><input type="text" id="cx-f-desc" value="${escapeHtml(c.descripcion)}"></div>
      <div class="field-row">
        <div class="field"><label>${t('hr.lbl.amountNoVat')}</label><input type="number" id="cx-f-imp" min="0" step="0.01" value="${c.importe}"></div>
        <div class="field"><label>${t('hr.lbl.vatType')}</label>${ivaSelect('cx-f-iva', c.iva)}</div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t('common.date')}</label><input type="date" id="cx-f-fecha" value="${c.fecha||''}"></div>
        <div class="field"><label>${t('hr.lbl.status')}</label>
          <select id="cx-f-estado">
            ${['PAGADO','PENDIENTE','PARCIAL'].map(s=>`<option value="${s}" ${c.estadoPago===s?'selected':''}>${estadoPagoLabel(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="cx-f-financiado" style="width:auto" ${c.financiado?'checked':''} onchange="GE.toggleCapexFinanciado()">
        <label style="margin:0">${t('hr.capex.financedCheckbox')}</label>
      </div>
      <div class="field-row" id="cx-f-cuotas-row" style="display:${c.financiado?'flex':'none'}">
        <div class="field"><label>${t('hr.capex.monthlyInstallment')}</label><input type="number" id="cx-f-cuota" min="0" step="0.01" value="${c.cuotaMensual||''}"></div>
        <div class="field"><label>${t('hr.capex.numInstallments')}</label><input type="number" id="cx-f-numcuotas" min="1" step="1" value="${c.cuotas||''}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.saveCapex()">${t("common.save")}</button>
      </div>
    `);
  }
  function saveCapex(){
    const desc = document.getElementById('cx-f-desc').value.trim();
    const imp = parseFloat(document.getElementById('cx-f-imp').value);
    if(!desc){ showToast(t('msg.descRequired')); return; }
    if(isNaN(imp) || imp<=0){ showToast(t('msg.enterAmount')); return; }
    const ivaRaw = document.getElementById('cx-f-iva').value;
    if(ivaRaw === ''){ showToast(t('msg.chooseIvaForExpense')); return; }
    // Sin fecha, la inversión sigue viéndose en la propia lista de CAPEX
    // (engañoso: parece que todo está bien) pero desaparece EN SILENCIO del
    // IVA a liquidar, del Resultado/CDR, de Tesorería y del CSV mensual —
    // todas esas funciones filtran por c.fecha y la descartan sin avisar.
    // El campo de fecha (input type=date) se puede vaciar con la "x" del
    // propio input, así que hacía falta exigirlo igual que el resto.
    if(!document.getElementById('cx-f-fecha').value){ showToast(t('msg.chooseDateForExpense')); return; }
    const financiado = document.getElementById('cx-f-financiado').checked;
    const cuotaMensual = financiado ? (parseFloat(document.getElementById('cx-f-cuota').value)||0) : 0;
    const cuotas = financiado ? (parseInt(document.getElementById('cx-f-numcuotas').value)||0) : 0;
    if(financiado && (cuotas<1 || cuotaMensual<=0)){ showToast(t('msg.capexFinancingRequired')); return; }
    const data = {
      descripcion: desc.toUpperCase(), importe: imp,
      iva: parseFloat(ivaRaw),
      fecha: document.getElementById('cx-f-fecha').value,
      estadoPago: document.getElementById('cx-f-estado').value,
      financiado,
      cuotaMensual,
      cuotas
    };
    if(editingCX){
      const existing = capex().find(x=>x.id===editingCX);
      if(capexTouchesClosedMonth(existing) || capexTouchesClosedMonth(data)){ showToast(t('hr.te.monthClosedError')); return; }
      Object.assign(existing, data);
    }else{
      if(capexTouchesClosedMonth(data)){ showToast(t('hr.te.monthClosedError')); return; }
      capex().push({id:genId(), ...data});
    }
    saveDB();
    closeModal();
    renderCapex();
    showToast(t('msg.investmentSaved'));
  }
  async function deleteCapex(id){
    const c = capex().find(x=>x.id===id);
    if(c && capexTouchesClosedMonth(c)){ showToast(t('hr.te.monthClosedError')); return; }
    if(!(await confirmModal(t('msg.confirmDeleteInvestment')))) return;
    ge().capex = capex().filter(c=>c.id!==id);
    saveDB();
    renderCapex();
  }

  // Compara el mes en curso (año actual) con el mes anterior y con el mismo
  // mes del año pasado — de un vistazo, sin tener que leer la tabla entera
  // de trimestres para hacer la resta mentalmente.
  function renderMonthComparison(){
    const box = document.getElementById('cdr-comparison');
    if(!box) return;
    const now = new Date();
    const curM = now.getMonth(), curY = now.getFullYear();
    const prevM = curM===0?11:curM-1, prevMY = curM===0?curY-1:curY;
    // Con IVA incluido (lo que de verdad ha entrado en caja) — la
    // facturación NETA ya se ve un poco más abajo, en la propia tabla. Un
    // dueño reconoce antes el total cobrado que la base sin IVA.
    const revCur = facturacionNetaMes(curM, curY) + ivaVentasMes(curM, curY);
    const revPrev = facturacionNetaMes(prevM, prevMY) + ivaVentasMes(prevM, prevMY);
    const revYoy = facturacionNetaMes(curM, curY-1) + ivaVentasMes(curM, curY-1);
    const resCur = resultadoAntesImpMes(curM, curY);
    const resPrev = resultadoAntesImpMes(prevM, prevMY);
    const resYoy = resultadoAntesImpMes(curM, curY-1);
    function pctDelta(cur, ref){
      if(!ref) return null;
      return ((cur-ref)/Math.abs(ref))*100;
    }
    function badge(delta){
      if(delta===null) return `<span class="badge badge-gray">—</span>`;
      const cls = delta>=0 ? 'badge-green' : 'badge-red';
      const sign = delta>=0 ? '+' : '';
      return `<span class="badge ${cls}">${sign}${delta.toFixed(1)}%</span>`;
    }
    box.innerHTML = `
      <div class="grid grid-2" style="margin-bottom:14px">
        <div class="ge-kpi"><div class="lbl">${t('hr.compare.revenueLabel').replace('${month}', getMeses()[curM])}</div><div class="val">${fmtMoney(revCur)}</div><div class="sub">${t('hr.compare.vsPrevMonth')} ${badge(pctDelta(revCur, revPrev))} · ${t('hr.compare.vsLastYear')} ${badge(pctDelta(revCur, revYoy))}</div></div>
        <div class="ge-kpi"><div class="lbl">${t('hr.compare.resultLabel').replace('${month}', getMeses()[curM])}</div><div class="val">${fmtMoney(resCur)}</div><div class="sub">${t('hr.compare.vsPrevMonth')} ${badge(pctDelta(resCur, resPrev))} · ${t('hr.compare.vsLastYear')} ${badge(pctDelta(resCur, resYoy))}</div></div>
      </div>`;
  }

  /* -- TESORERÍA -- */
  function renderTesoreria(){
    const teYearEl = document.getElementById('te-year');
    if(teYearEl) teYearEl.textContent = teYear;
    document.getElementById('te-months').innerHTML = getMeses().map((m,i)=>`
      <div class="month-pill${i===activeMonth?' active':''}" onclick="GE.setMonthTe(${i})">${m}${isMonthClosed(teYear,i)?' <i class="ti ti-lock"></i>':''}</div>`).join('');
    const closeBtn = document.getElementById('te-close-month-btn');
    if(closeBtn){
      const closed = isMonthClosed(teYear, activeMonth);
      closeBtn.innerHTML = closed
        ? `<i class="ti ti-lock-open"></i> ${t('hr.te.reopenMonth')}`
        : `<i class="ti ti-lock"></i> ${t('hr.te.closeMonth')}`;
      closeBtn.className = closed ? 'btn btn-sm' : 'btn btn-sm btn-primary';
    }

    const dp = config().distPct;
    if(dp && !distPctLoaded){
      document.getElementById('te-pct-per').value = dp.per;
      document.getElementById('te-pct-gf').value = dp.gf;
      document.getElementById('te-pct-mp').value = dp.mp;
      document.getElementById('te-pct-og').value = dp.og;
      document.getElementById('te-pct-ben').value = dp.ben;
      distPctLoaded = true;
    }

    const pctPer = (parseFloat(document.getElementById('te-pct-per')?.value)||0)/100;
    const pctGF = (parseFloat(document.getElementById('te-pct-gf')?.value)||0)/100;
    const pctMP = (parseFloat(document.getElementById('te-pct-mp')?.value)||0)/100;
    const pctOG = (parseFloat(document.getElementById('te-pct-og')?.value)||0)/100;
    const pctBen = (parseFloat(document.getElementById('te-pct-ben')?.value)||0)/100;

    const facBruta = facturacionMes(activeMonth, teYear);
    const facNeta = facturacionNetaMes(activeMonth, teYear);
    const ivaLiquidar = ivaLiquidarMes(activeMonth, teYear);

    // NO "facBruta - facNeta": facBruta suma sale.total (incluye propina y
    // gastos de envío, que no son IVA), mientras que facNeta se calcula
    // línea a línea sin ninguno de los dos — restarlos habría metido la
    // propina de cada mesa dentro del "IVA a reservar", inflándolo. Mismo
    // criterio ya usado en CDR/Resultado (ivaVentasMes, línea a línea).
    const ivaVentas = ivaVentasMes(activeMonth, teYear);

    document.getElementById('te-kpis').innerHTML = `
      <div class="kpi-mini"><div class="l">${t('hr.te.grossRevenue')}</div><div class="v">${fmtMoney(facBruta)}</div><div style="font-size:11px;color:var(--muted)">${t('hr.te.salesWithVat')}</div></div>
      <div class="kpi-mini" style="border-color:var(--amber)"><div class="l">${t('hr.te.vatPassedOn')}</div><div class="v" style="color:var(--amber-dark)">${fmtMoney(ivaVentas)}</div><div style="font-size:11px;color:var(--muted)">${t('hr.te.vatIncludedInSales')}</div></div>
      <div class="kpi-mini" style="border-color:var(--teal)"><div class="l">${t('hr.lbl.netRevenue')}</div><div class="v" style="color:var(--teal-d)">${fmtMoney(facNeta)}</div><div style="font-size:11px;color:var(--muted)">${t('hr.te.baseToDistribute')}</div></div>`;

    const realPer = geTotalPersonalNetoForMonth(teYear, activeMonth);
    const realGF = geTotalGFNetoForMonth(teYear, activeMonth);
    const realMP = totalVariablesNetoMes(activeMonth, teYear);
    const realComisiones = comisionesMes(activeMonth, teYear);
    const realOG = capexCuotaMes(activeMonth, teYear) + realComisiones;
    const realBenPreTax = facNeta - realPer - realGF - realMP - realOG;
    // Igual que resultadoMes(): tras IVA, el "Beneficio/Ahorro" también debe descontar
    // el impuesto sobre beneficios para que coincida con el "Resultado Neto" post-impuestos
    // que se muestra en CDR/Resultado — si no, aquí se sobreestimaba el beneficio real.
    const pctImpTe = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    const realBen = realBenPreTax>0 ? realBenPreTax*(1-pctImpTe) : realBenPreTax;
    // IVA: Modelo 303 se liquida trimestralmente, no cada mes — mostramos el acumulado
    // del trimestre en curso hasta el mes visto, no solo la porción de este mes.
    const ivaLiquidarAcum = ivaLiquidarQTD(activeMonth, teYear);
    const ivaReserva = ivaLiquidarAcum >= 0 ? ivaLiquidarAcum : 0;
    const qIdx = Math.floor(activeMonth/3);
    const qMesesLbls = getMeses().slice(qIdx*3, qIdx*3+3);
    const qLabel = `T${qIdx+1} (${qMesesLbls[0]}-${qMesesLbls[2]})`;
    // Igual que el IVA (Modelo 303), el IRPF retenido a los empleados se
    // declara e ingresa trimestralmente (Modelo 111) — se acumulan los
    // meses del trimestre en curso hasta el visto, con el histórico de
    // gastos fijos (no la nómina de HOY para un mes pasado).
    let irpfReserva = 0;
    for(let m=qIdx*3; m<=activeMonth; m++) irpfReserva += geIrpfMensualForMonth(teYear, m);

    const rows = [
      {lbl:t('hr.lbl.personalNoVat'), pct:pctPer, obj:facNeta*pctPer, real:realPer, color:'var(--blue)'},
      {lbl:t('hr.lbl.fixedNoVat'), pct:pctGF, obj:facNeta*pctGF, real:realGF, color:'var(--purple)'},
      {lbl:t('hr.lbl.variableExpenses'), pct:pctMP, obj:facNeta*pctMP, real:realMP, color:'var(--red)'},
      {lbl:t('hr.te.otherExpenses'), pct:pctOG, obj:facNeta*pctOG, real:realOG, color:'var(--amber)'},
      {lbl:t('hr.te.profitSavings'), pct:pctBen, obj:facNeta*pctBen, real:realBen, color:'var(--teal)', isBen:true},
      {lbl:`${t('hr.te.vatReserve')} · ${qLabel}`, obj:null, real:ivaReserva, color:'var(--amber-dark)', isReserve:true, icon:'ti-pig-money'},
      ...(irpfReserva>0.001 ? [{lbl:`${t('hr.gf.irpfWithheld')} · ${qLabel}`, obj:null, real:irpfReserva, color:'var(--purple)', isReserve:true, icon:'ti-receipt-tax'}] : []),
    ];

    document.getElementById('te-rows').innerHTML = rows.map(r=>{
      if(r.isReserve){
        return `<div class="te-row" style="border-top:2px solid var(--border);padding-top:10px;margin-top:6px">
          <span style="font-size:14px;font-weight:600">${r.lbl}</span>
          <span></span>
          <span></span>
          <span style="text-align:right;font-family:monospace;font-weight:700;color:${r.color}">${fmtMoney(r.real)}</span>
          <span class="te-hint" style="text-align:right;font-size:11px;color:var(--muted)">${t('hr.te.setAsideQuarterly')}</span>
          <span style="text-align:center;font-size:16px"><i class="ti ${r.icon}"></i></span>
        </div>`;
      }
      const diff = r.real - r.obj;
      const absDiff = Math.abs(diff);
      const pctDev = r.obj ? Math.abs(diff)/r.obj : 0;
      // Para el Beneficio, gastar/ganar por encima del objetivo es bueno (diff>=0).
      // Para las filas de gasto (Personal, Fijos, Variables, Otros), es al revés:
      // superar el objetivo de gasto es MALO, así que se invierte el criterio.
      const isGood = r.isBen ? diff >= 0 : diff <= 0;
      const estado = !r.real ? '—' : (pctDev < 0.1 ? '<i class="ti ti-check" style="color:var(--green)"></i>' : isGood ? '<i class="ti ti-check" style="color:var(--green)"></i>' : pctDev < 0.2 ? '<i class="ti ti-alert-triangle" style="color:var(--amber-dark)"></i>' : '<i class="ti ti-x" style="color:var(--red)"></i>');
      const diffColor = !r.real ? '' : isGood ? 'var(--green)' : 'var(--red)';
      const diffSign = diff > 0 ? '+' : diff < 0 ? '-' : '';
      const diffText = r.real ? `${diffSign}${fmtMoney(absDiff)}` : '—';
      const barPct = r.obj>0 ? Math.min(r.real/r.obj*100, 150) : 0;
      // Igual que en isGood: para el Beneficio, más del objetivo es mejor
      // (barra verde al superarlo); para las filas de gasto es al revés.
      const barColor = r.isBen
        ? (barPct<90?'var(--red)':barPct>=100?'var(--green)':'var(--amber)')
        : (barPct>110?'var(--red)':barPct>90?'var(--green)':'var(--amber)');
      return `<div class="te-row">
        <span style="font-size:14px;font-weight:600">${r.lbl}</span>
        <span style="text-align:right;font-weight:600;color:${r.color}">${(r.pct*100).toFixed(0)}%</span>
        <span style="text-align:right;font-family:monospace">${fmtMoney(r.obj)}</span>
        <span style="text-align:right;font-family:monospace;font-weight:700">${r.real?fmtMoney(r.real):'—'}</span>
        <span style="text-align:right;font-family:monospace;font-weight:700;color:${diffColor}">${diffText}</span>
        <span style="text-align:center;font-size:16px">${estado}</span>
      </div>
      <div class="te-bar-wrap"><div class="te-bar-fill" style="width:${Math.min(barPct,100)}%;background:${barColor}"></div></div>`;
    }).join('');

    document.getElementById('te-annual-chart').innerHTML = barChartHTML(getMeses().map((m,i)=>({lbl:m, v:resultadoMes(i, teYear)})));
    renderTesoreriaUpcoming();
    renderTreasuryForecast();
  }

  // Previsión de tesorería a 30/60/90 días: parte del resultado medio de
  // los últimos 3 meses naturales anteriores (no el actual, que va a medias)
  // y lo proyecta hacia delante día a día. Usa el resultado NETO, después de
  // impuestos (resultadoMes) — no el de antes de impuestos: ese dinero de
  // Hacienda no es tesorería disponible de verdad, y antes se sobreestimaba
  // la previsión usándolo (además no cuadraba con el gráfico de justo
  // arriba, que si usa el neto). Es una estimación basada en tu propio
  // histórico reciente, no una promesa — por eso se marca como tal.
  function renderTreasuryForecast(){
    const box = document.getElementById('te-forecast');
    if(!box) return;
    const now = new Date();
    let m = now.getMonth(), y = now.getFullYear();
    const lastMonths = [];
    for(let i=0; i<3; i++){
      m -= 1;
      if(m < 0){ m = 11; y -= 1; }
      lastMonths.push({m, y});
    }
    const results = lastMonths.map(({m,y}) => resultadoMes(m,y));
    const hasHistory = results.some(r => r !== 0);
    if(!hasHistory){ box.innerHTML = ''; return; }
    const avgMonthly = results.reduce((a,b)=>a+b,0) / results.length;
    const dailyRate = avgMonthly / 30.4;
    const proj = n => dailyRate * n;
    box.innerHTML = `
      <div class="card" style="margin:12px 0">
        <h4 style="margin-bottom:4px"><i class="ti ti-crystal-ball"></i> ${t('hr.forecast.title')}</h4>
        <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('hr.forecast.desc')}</p>
        <div class="grid grid-3">
          <div class="ge-kpi"><div class="lbl">${t('hr.forecast.days').replace('${n}',30)}</div><div class="val" style="color:${proj(30)>=0?'var(--green)':'var(--red)'}">${proj(30)>=0?'+':''}${fmtMoney(proj(30))}</div></div>
          <div class="ge-kpi"><div class="lbl">${t('hr.forecast.days').replace('${n}',60)}</div><div class="val" style="color:${proj(60)>=0?'var(--green)':'var(--red)'}">${proj(60)>=0?'+':''}${fmtMoney(proj(60))}</div></div>
          <div class="ge-kpi"><div class="lbl">${t('hr.forecast.days').replace('${n}',90)}</div><div class="val" style="color:${proj(90)>=0?'var(--green)':'var(--red)'}">${proj(90)>=0?'+':''}${fmtMoney(proj(90))}</div></div>
        </div>
      </div>`;
  }
  // Gastos Fijos periódicos (periodicidadMeses>1) cuyo pago cae en el mes visto: son un
  // desembolso de caja real que no se ve en el "Resultado" mensual (ya suavizado).
  function renderTesoreriaUpcoming(){
    const el = document.getElementById('te-upcoming');
    if(!el) return;
    const dueItems = fijos()
      .filter(g=>(parseInt(g.periodicidadMeses)||1)>1)
      .map(g=>({g, date:gfDueInMonth(g, currentYear(), activeMonth)}))
      .filter(x=>x.date);
    if(!dueItems.length){ el.innerHTML=''; el.style.display='none'; return; }
    el.style.display='block';
    el.innerHTML = `
      <div class="ge-sec-head"><h4><i class="ti ti-alert-triangle"></i> ${t('hr.te.upcomingLumpTitle')}</h4></div>
      <div style="font-size:12px;color:var(--muted);padding:0 16px 8px">${t('hr.te.upcomingLumpNote')}</div>
      ${dueItems.map(x=>{
        const base = parseFloat(x.g.importe||0);
        const pct = x.g.iva!=null ? parseFloat(x.g.iva) : 0;
        return `
        <div class="ge-item">
          <span style="flex:1;font-size:14px;font-weight:500">${escapeHtml(x.g.nombre)}</span>
          <span style="font-family:monospace;font-weight:700">${fmtMoney(base*(1+pct/100))}</span>
        </div>`;
      }).join('')}
    `;
  }
  function setMonthTe(m){ activeMonth=m; renderTesoreria(); }
  function setTeYear(delta){ teYear += delta; renderTesoreria(); }
  // Bug real encontrado (10/09, reportado desde móvil): esto colgaba de
  // oninput (cada pulsación) y RE-ESCRIBÍA el valor del propio campo que se
  // estaba tecleando, a mitad de escribir — en un teclado numérico de
  // móvil, que el campo se autocorrija mientras compones el número le
  // hace perder el cursor y el foco de forma errática (se veía como un
  // salto brusco a otra pestaña). Ahora cuelga de onchange (se dispara solo
  // al terminar de editar el campo — perder el foco o "Hecho" en el
  // teclado), y ya NUNCA reescribe el valor del campo que se acaba de
  // tocar, solo reparte lo que sobra entre los otros cuatro.
  function adjustDistPct(changedId){
    const ids = ['te-pct-per','te-pct-gf','te-pct-mp','te-pct-og','te-pct-ben'];
    const els = {}; ids.forEach(id=>els[id]=document.getElementById(id));
    const vals = {}; ids.forEach(id=>vals[id]=Math.max(0,Math.min(100,parseFloat(els[id].value)||0)));
    const changedVal = vals[changedId];
    els[changedId].value = Math.round(changedVal*10)/10;
    const otherIds = ids.filter(id=>id!==changedId);
    const othersSum = otherIds.reduce((s,id)=>s+vals[id],0);
    const remaining = 100 - changedVal;
    if(othersSum<=0){
      otherIds.forEach(id=>vals[id]=remaining/otherIds.length);
    }else{
      otherIds.forEach(id=>vals[id]=Math.max(0, remaining*vals[id]/othersSum));
    }
    vals[changedId]=changedVal;
    otherIds.forEach(id=>els[id].value = Math.round(vals[id]*10)/10);
    config().distPct = {per:vals['te-pct-per'], gf:vals['te-pct-gf'], mp:vals['te-pct-mp'], og:vals['te-pct-og'], ben:vals['te-pct-ben']};
    distPctLoaded = true;
    saveDB();
    renderTesoreria();
  }
  function setPctImpuesto(){
    config().pctImpuestoBeneficio = parseFloat(document.getElementById('res-pct-impuesto').value) || 0;
    saveDB();
    renderCDR();
  }

  function barChartHTML(data){
    const vals = data.map(d=>d.v);
    const max = Math.max(...vals.map(Math.abs), 1);
    return data.map(d=>{
      const pct = Math.abs(d.v)/max*100;
      const color = d.v>=0 ? 'var(--teal)' : 'var(--red)';
      return `<div class="bar-col" title="${d.lbl}: ${fmtMoney(d.v)}">
        <div class="bar-fill" style="height:${pct*0.7}px;background:${color}"></div>
        <div class="bar-lbl">${d.lbl}</div>
      </div>`;
    }).join('');
  }

  /* -- ANÁLISIS DE PLATOS -- */
  function getPlatosRange(){
    const today = todayStr();
    if(platosPeriod === 'custom' && platosFrom && platosTo){
      return platosFrom <= platosTo ? {start: platosFrom, end: platosTo} : {start: platosTo, end: platosFrom};
    }
    const d = new Date();
    if(platosPeriod === 'hoy') return {start: today, end: today};
    if(platosPeriod === 'semana') return {start: dateStr(new Date(d.getTime() - 6*86400000)), end: today};
    // Misma ventana que renderDashboard (js/finance.js): 29 días atrás + hoy
    // = 30 días exactos, para que "Análisis de ventas" y "Análisis de
    // Platos" miren de verdad el mismo tramo de ventas por defecto.
    if(platosPeriod === '30dias') return {start: dateStr(new Date(d.getTime() - 29*86400000)), end: today};
    if(platosPeriod === 'año') return {start: `${d.getFullYear()}-01-01`, end: today};
    if(platosPeriod === 'todo') return {start: '0000-01-01', end: '9999-12-31'};
    return {start: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, end: today}; // mes
  }

  function platosStats(){
    const {start, end} = getPlatosRange();
    const sales = activeSales().filter(s => s.date >= start && s.date <= end);
    const map = {};
    // El coste se suma línea a línea con costoUnitarioDeLinea (el coste
    // estampado en el momento de esa venta concreta, o recalculado en vivo
    // solo si es una venta antigua sin ese dato) en vez de coger el coste
    // ACTUAL de la receta y multiplicarlo por el total de unidades del
    // periodo — así el margen de un mes pasado no cambia solo porque hoy
    // haya subido el precio de un ingrediente.
    const fallbackIvaPct = ivaVentasPct();
    sales.forEach(sale => {
      const descPct = parseFloat(sale.descuentoPct)||0;
      (sale.items||[]).forEach(line => {
        const key = line.recipeId ? ('r'+line.recipeId) : ('m'+(line.name||''));
        if(!map[key]){
          const recipe = line.recipeId ? getRecipe(line.recipeId) : null;
          map[key] = {
            name: line.name || t('hr.platos.noName'),
            recipeId: line.recipeId || null,
            category: recipe ? (recipe.category||t('hr.platos.noCategory')) : t('hr.platos.noCosting'),
            hasCost: !!recipe,
            units: 0, revenue: 0, revenueNeto: 0, costTotal: 0
          };
        }
        // El descuento de la venta (sale.descuentoPct) se aplica proporcional
        // a cada línea, igual que en ventasIvaGroups — si no, un plato
        // vendido siempre con descuento aparecía facturando más de lo que
        // de verdad entró en caja.
        const rate = line.ivaPct != null ? parseFloat(line.ivaPct) : fallbackIvaPct;
        const lineRevenue = (line.price||0) * (line.qty||0) * (1 - descPct/100);
        map[key].units += (line.qty||0);
        map[key].revenue += lineRevenue;
        // El margen se calcula sobre la venta SIN IVA (mismo criterio que
        // recipeFoodCostPct y el "Top margen bruto" del Dashboard): el coste
        // de la receta es siempre neto, así que restarlo del precio CON IVA
        // infla el margen — más cuanto más alto sea el IVA del plato.
        map[key].revenueNeto += lineRevenue / (1 + rate/100);
        if(map[key].hasCost) map[key].costTotal += costoUnitarioDeLinea(line) * (line.qty||0);
      });
    });
    const items = Object.values(map).map(it => {
      const cost = it.hasCost ? it.costTotal : null;
      const margin = cost!=null ? it.revenueNeto - cost : null;
      const marginPct = (cost!=null && it.revenueNeto>0) ? (margin/it.revenueNeto*100) : null;
      const unitCost = (cost!=null && it.units>0) ? cost/it.units : null;
      return {...it, cost, margin, marginPct, unitCost};
    });
    return {start, end, items};
  }

  function renderPlatosPeriodSel(){
    const periods = [{k:'hoy',l:t('common.today')},{k:'semana',l:t('hr.platos.last7Days')},{k:'30dias',l:t('hr.platos.last30Days')},{k:'mes',l:t('hr.platos.thisMonth')},{k:'año',l:t('hr.platos.thisYear')},{k:'todo',l:t('hr.platos.allTime')}];
    document.getElementById('platos-period-sel').innerHTML = periods.map(p=>`
      <div class="month-pill${platosPeriod===p.k?' active':''}" onclick="GE.setPlatosPeriod('${p.k}')">${p.l}</div>
    `).join('') + `
      <input type="date" id="platos-from-input" value="${platosFrom}" style="border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12px" onchange="GE.setPlatosCustom()">
      <span style="font-size:12px;color:var(--muted);align-self:center">${t('hr.lbl.toDate')}</span>
      <input type="date" id="platos-to-input" value="${platosTo}" style="border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12px" onchange="GE.setPlatosCustom()">
    `;
  }
  function setPlatosPeriod(p){ platosPeriod = p; renderPlatos(); }
  function setPlatosCustom(){
    platosFrom = document.getElementById('platos-from-input').value;
    platosTo = document.getElementById('platos-to-input').value;
    if(platosFrom && platosTo){ platosPeriod = 'custom'; renderPlatos(); }
  }

  function renderPlatosRankingTable(elId, list, totalIngresos){
    const tbl = document.getElementById(elId);
    if(!list.length){ tbl.innerHTML = `<tr><td colspan="5"><div class="empty" style="padding:14px">${t('hr.platos.noSalesPeriod')}</div></td></tr>`; return; }
    tbl.innerHTML = `
      <thead><tr><th>${t('hr.platos.dish')}</th><th style="text-align:left">${t('common.category')}</th><th>${t('hr.lbl.unitsAbbrev')}</th><th>${t('hr.lbl.revenue')}</th><th>${t('hr.platos.pctOfTotal')}</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td data-label="${t('hr.platos.dish')}">${escapeHtml(i.name)}</td>
          <td style="text-align:left;font-family:inherit;font-weight:400;background:none;border-left:none" data-label="${t('common.category')}">${escapeHtml(i.category)}</td>
          <td data-label="${t('hr.lbl.unitsAbbrev')}">${fmtNum(i.units,0)}</td>
          <td data-label="${t('hr.lbl.revenue')}">${fmtMoney(i.revenue)}</td>
          <td data-label="${t('hr.platos.pctOfTotal')}">${totalIngresos>0?(i.revenue/totalIngresos*100).toFixed(1)+'%':'—'}</td>
        </tr>`).join('')}</tbody>
    `;
  }

  // Matriz de "menu engineering": cruza margen % con unidades vendidas para
  // clasificar cada plato con receta en uno de 4 cuadrantes accionables.
  function median(nums){
    if(!nums.length) return 0;
    const s = [...nums].sort((a,b)=>a-b);
    const mid = Math.floor(s.length/2);
    return s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2;
  }
  function renderPlatosMatrix(conReceta){
    const kpisEl = document.getElementById('platos-matrix-kpis');
    const tbl = document.getElementById('platos-matrix');
    if(!kpisEl || !tbl) return;
    if(conReceta.length < 4){
      kpisEl.innerHTML = '';
      tbl.innerHTML = `<tr><td><div class="empty" style="padding:14px">${t('dash.menuEngineeringNeedMore')}</div></td></tr>`;
      return;
    }
    const medUnits = median(conReceta.map(i=>i.units));
    const medMargin = median(conReceta.map(i=>i.marginPct));
    const classified = conReceta.map(i => {
      const highUnits = i.units >= medUnits, highMargin = i.marginPct >= medMargin;
      let cls, label, hint;
      if(highUnits && highMargin){ cls='star'; label=t('dash.menuEngStar'); hint=t('dash.menuEngStarHint'); }
      else if(highUnits && !highMargin){ cls='review'; label=t('dash.menuEngReview'); hint=t('dash.menuEngReviewHint'); }
      else if(!highUnits && highMargin){ cls='promote'; label=t('dash.menuEngPromote'); hint=t('dash.menuEngPromoteHint'); }
      else { cls='drop'; label=t('dash.menuEngDrop'); hint=t('dash.menuEngDropHint'); }
      return {...i, cls, label, hint};
    }).sort((a,b) => b.revenue - a.revenue);
    const counts = {star:0, review:0, promote:0, drop:0};
    classified.forEach(i => counts[i.cls]++);
    const badgeColor = {star:'var(--green)', review:'var(--brand-orange)', promote:'var(--blue)', drop:'var(--red)'};
    kpisEl.innerHTML = `
      <div class="ge-kpi"><div class="lbl"><i class="ti ti-star"></i> ${t('dash.menuEngStar')}</div><div class="val" style="color:${badgeColor.star}">${counts.star}</div></div>
      <div class="ge-kpi"><div class="lbl"><i class="ti ti-search"></i> ${t('dash.menuEngReview')}</div><div class="val" style="color:${badgeColor.review}">${counts.review}</div></div>
      <div class="ge-kpi"><div class="lbl"><i class="ti ti-speakerphone"></i> ${t('dash.menuEngPromote')}</div><div class="val" style="color:${badgeColor.promote}">${counts.promote}</div></div>
      <div class="ge-kpi"><div class="lbl"><i class="ti ti-scissors"></i> ${t('dash.menuEngDrop')}</div><div class="val" style="color:${badgeColor.drop}">${counts.drop}</div></div>
    `;
    tbl.innerHTML = `
      <thead><tr><th>${t('hr.platos.dish')}</th><th>${t('hr.lbl.unitsAbbrev')}</th><th>${t('hr.platos.pctMargin')}</th><th>${t('dash.menuEngClassification')}</th></tr></thead>
      <tbody>${classified.map(i => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td>${fmtNum(i.units,0)}</td>
          <td>${i.marginPct!=null?i.marginPct.toFixed(1)+'%':'—'}</td>
          <td><span class="badge" style="background:${badgeColor[i.cls]}22;color:${badgeColor[i.cls]}" title="${escapeHtml(i.hint)}">${i.label}</span></td>
        </tr>`).join('')}</tbody>
    `;
  }

  function renderPlatosRentabilidadTable(elId, list){
    const tbl = document.getElementById(elId);
    if(!list.length){ tbl.innerHTML = `<tr><td colspan="6"><div class="empty" style="padding:14px">${t('hr.platos.linkRecipesHint')}</div></td></tr>`; return; }
    tbl.innerHTML = `
      <thead><tr><th>${t('hr.platos.dish')}</th><th>${t('hr.lbl.unitsAbbrev')}</th><th>${t('hr.lbl.revenue')}</th><th>${t('hr.lbl.cost')}</th><th>${t('hr.lbl.margin')}</th><th>${t('hr.platos.pctMargin')}</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td data-label="${t('hr.platos.dish')}">${escapeHtml(i.name)}</td>
          <td data-label="${t('hr.lbl.unitsAbbrev')}">${fmtNum(i.units,0)}</td>
          <td data-label="${t('hr.lbl.revenue')}">${fmtMoney(i.revenue)}</td>
          <td data-label="${t('hr.lbl.cost')}">${fmtMoney(i.cost)}</td>
          <td class="${i.margin>=0?'pos':'neg'}" data-label="${t('hr.lbl.margin')}">${fmtMoney(i.margin)}</td>
          <td class="${i.marginPct>=0?(i.marginPct<25?'':'pos'):'neg'}" data-label="${t('hr.platos.pctMargin')}">${i.marginPct!=null?i.marginPct.toFixed(1)+'%':'—'}</td>
        </tr>`).join('')}</tbody>
    `;
  }

  function renderPlatos(){
    renderPlatosPeriodSel();
    const {items} = platosStats();
    const totalUnidades = items.reduce((s,i)=>s+i.units,0);
    const totalIngresos = items.reduce((s,i)=>s+i.revenue,0);
    const conReceta = items.filter(i=>i.margin!=null);
    const totalMargen = conReceta.reduce((s,i)=>s+i.margin,0);
    const ingresosConReceta = conReceta.reduce((s,i)=>s+i.revenue,0);
    const margenPct = ingresosConReceta>0 ? (totalMargen/ingresosConReceta*100) : 0;
    const ticketMedio = totalUnidades>0 ? totalIngresos/totalUnidades : 0;

    document.getElementById('platos-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.dishesSold')}</div><div class="val">${fmtNum(totalUnidades,0)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.totalRevenue')}</div><div class="val">${fmtMoney(totalIngresos)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.totalMargin')}</div><div class="val" style="color:${totalMargen>=0?'var(--green)':'var(--red)'}">${conReceta.length?fmtMoney(totalMargen):'—'}</div><div class="sub">${conReceta.length?t('hr.platos.dishesWithCosting'):t('hr.platos.createCostingHint')}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.avgMarginPct')}</div><div class="val">${conReceta.length?margenPct.toFixed(1)+'%':'—'}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.avgTicketPerLine')}</div><div class="val">${fmtMoney(ticketMedio)}</div></div>
      <div class="ge-kpi"><div class="lbl">${t('hr.platos.referencesSold')}</div><div class="val">${items.length}</div></div>
    `;

    const top5 = [...items].sort((a,b)=>b.revenue-a.revenue).slice(0,5);
    document.getElementById('platos-chart').innerHTML = top5.length
      ? barChartHTML(top5.map(i=>({lbl: truncateSafeText(i.name,10), v:i.revenue})))
      : `<div class="empty">${t('hr.platos.noSalesPeriod')}</div>`;

    renderPlatosRankingTable('platos-mas-vendidos', [...items].sort((a,b)=>b.units-a.units).slice(0,10), totalIngresos);
    renderPlatosRankingTable('platos-menos-vendidos', [...items].sort((a,b)=>a.units-b.units).slice(0,10), totalIngresos);
    renderPlatosMatrix(conReceta);
    renderPlatosRentabilidadTable('platos-mas-rentables', conReceta.slice().sort((a,b)=>b.margin-a.margin).slice(0,10));
    renderPlatosRentabilidadTable('platos-menos-rentables', conReceta.slice().sort((a,b)=>a.margin-b.margin).slice(0,10));

    const soldRecipeIds = new Set(items.filter(i=>i.recipeId).map(i=>i.recipeId));
    const sinVentas = DB.recipes.filter(r => !r.isBase && !soldRecipeIds.has(r.id));
    document.getElementById('platos-sin-ventas').innerHTML = sinVentas.length
      ? `<div style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px">${sinVentas.map(r=>`<span class="badge badge-gray">${escapeHtml(r.name)}</span>`).join('')}</div>`
      : `<div class="empty" style="padding:12px 16px">${t('hr.platos.allSoldThisPeriod')} 🎉</div>`;
  }

  /* -- EXPORTAR CONTABILIDAD PARA EL GESTOR -- */
  function openExportModal(){
    const now = new Date();
    openModal(`
      <div class="modal-header"><h3><i class="ti ti-file-export"></i> ${t('hr.export.title')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <p style="font-size:13px;color:var(--muted)">${t('hr.export.description')}</p>
      <div class="field-row">
        <div class="field">
          <label>${t('common.month')}</label>
          <select id="exp-mes">${getMeses().map((m,i)=>`<option value="${i}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>${t('common.year')}</label>
          <input type="number" id="exp-anyo" value="${now.getFullYear()}" min="2000" max="2100">
        </div>
      </div>
      <div class="field">
        <label>${t('hr.export.accountantEmail')}</label>
        <input type="email" id="exp-email" value="${escapeHtml((DB.business||{}).gestorEmail||'')}" placeholder="gestoria@ejemplo.com">
        <small style="color:var(--muted)">${t('hr.export.emailHint')}</small>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.exportMonth()"><i class="ti ti-download"></i> ${t('hr.export.downloadCsv')}</button>
        <button class="btn btn-primary" onclick="GE.emailMonth()"><i class="ti ti-mail"></i> ${t('hr.export.sendToAccountant')}</button>
        <button class="btn" onclick="GE.copyMonthSummary()"><i class="ti ti-copy"></i> ${t('hr.export.copySummary')}</button>
      </div>
    `);
  }

  // Desglose de base/IVA de UNA venta usando el tipo real de cada línea
  // (estampado al cobrar), en vez de un único % adivinado para todo el
  // ticket — si la venta mezcla platos con distinto IVA (ej. comida al 10%
  // y una copa al 21%), pctLabel devuelve 'mixto' en vez de un porcentaje
  // que no sería correcto para toda la venta.
  function saleIvaBreakdown(sale){
    const descPct = parseFloat(sale.descuentoPct)||0;
    const fallbackRate = ivaVentasPct();
    const rates = {};
    (sale.items||[]).forEach(line => {
      const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
      if(grossLine <= 0) return;
      const rate = line.ivaPct != null ? line.ivaPct : fallbackRate;
      rates[rate] = (rates[rate]||0) + grossLine;
    });
    let base = 0, iva = 0;
    Object.entries(rates).forEach(([rate, gross]) => {
      const r = parseFloat(rate);
      const net = gross / (1 + r/100);
      base += net; iva += gross - net;
    });
    const distinctRates = Object.keys(rates).map(Number);
    const pctLabel = distinctRates.length <= 1 ? (distinctRates[0] != null ? distinctRates[0] : fallbackRate) : 'mixto';
    return {base, iva, pctLabel};
  }
  function buildMonthReport(mes, año){
    const b = DB.business || {};
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;

    const ventas = activeSales().filter(v => (v.date||'').startsWith(mesStr)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));

    const rows = [];
    rows.push([t('hr.csv.reportTitle')]);
    rows.push([t('hr.csv.business'), b.name || '']);
    if(b.cif) rows.push([t('hr.csv.taxId'), b.cif]);
    rows.push([t('hr.csv.period'), `${getMeses()[mes]} ${año}`]);
    const isoStart = `${mesStr}-01`;
    const isoEnd = `${mesStr}-${String(new Date(año, mes+1, 0).getDate()).padStart(2,'0')}`;
    rows.push([t('hr.csv.periodStart'), isoStart]);
    rows.push([t('hr.csv.periodEnd'), isoEnd]);
    rows.push([t('hr.csv.generatedOn'), new Date().toLocaleString(localeActual())]);
    rows.push([]);

    rows.push([t('hr.csv.salesLedger')]);
    rows.push([t('common.date'), t('hr.csv.invoiceNo'), t('hr.lbl.type'), t('hr.csv.client'), t('hr.csv.paymentMethod'), t('hr.csv.taxBase'), t('hr.csv.vatPct'), t('hr.csv.vatAmount'), t('hr.csv.totalEur')]);
    let sumBase=0, sumIva=0, sumTotal=0, sumPropina=0;
    ventas.forEach(v => {
      const total = parseFloat(v.total||0);
      const {base, iva, pctLabel} = saleIvaBreakdown(v);
      sumBase += base; sumIva += iva; sumTotal += total; sumPropina += parseFloat(v.propina||0);
      rows.push([v.date||'', v.facturaNum||'', v.tipo||'', v.clienteNombre||'', v.metodoPago||'', base, pctLabel==='mixto'?t('label.mixedRatesShort'):pctLabel, iva, total]);
    });
    if(!ventas.length) rows.push([t('hr.csv.noSalesThisMonth')]);
    rows.push(['','','','',t('common.total'), sumBase, '', sumIva, sumTotal]);
    rows.push([]);

    // El desglose línea a línea es siempre la configuración ACTUAL de gastos
    // fijos (no se guarda un histórico por concepto individual, solo el
    // total agregado) — si el mes del informe no es el actual, se avisa y
    // el resumen final usa el total histórico real en vez de este desglose,
    // para que la cifra que de verdad importa (el resultado/IVA a liquidar)
    // no dependa de la configuración de hoy.
    const isHistoricalMonth = !(año===currentYear() && mes===new Date().getMonth());
    rows.push([t('hr.csv.monthlyFixedExpenses') + (isHistoricalMonth ? ` (${t('hr.csv.currentConfigNote')})` : '')]);
    rows.push([t('hr.lbl.concept'), t('common.category'), t('hr.gf.payDayLabel'), t('hr.gf.payPeriodicity'), t('hr.csv.baseEur'), t('hr.csv.vatPct'), t('hr.csv.vatEur'), t('hr.csv.totalEur')]);
    let sumFijos = 0, sumFijosBase = 0, sumFijosIva = 0;
    fijos().forEach(g => {
      const base = gfMonthlyImporte(g);
      const pct = g.iva!=null ? parseFloat(g.iva) : 0;
      const ivaAmt = base * pct/100;
      const total = base + ivaAmt;
      sumFijos += total; sumFijosBase += base; sumFijosIva += ivaAmt;
      const periodo = (parseInt(g.periodicidadMeses)||1)===1 ? t('hr.periodo.monthly') : t('hr.gf.everyMonths').replace('${n}', g.periodicidadMeses);
      rows.push([g.nombre||'', g.categoria||'', g.diaPago||'', periodo, base, pct, ivaAmt, total]);
    });
    if(!fijos().length) rows.push([t('hr.csv.noFixedExpenses')]);
    rows.push(['','','',t('common.total'), sumFijosBase, '', sumFijosIva, sumFijos]);
    rows.push([]);
    // Totales históricos reales de gastos fijos para ESE mes concreto (los
    // que sí se usan en el resumen final), pueden diferir del desglose de
    // arriba si la configuración ha cambiado desde entonces.
    const sumFijosBaseHist = geTotalFijosNetoForMonth(año, mes);
    const sumFijosIvaHist = geIvaSoportadoFijosForMonth(año, mes);

    rows.push([t('hr.csv.variableExpensesMonth')]);
    rows.push([t('common.date'), t('common.category'), t('common.supplier'), t('hr.csv.baseEur'), t('hr.csv.vatPct'), t('hr.csv.vatEur'), t('hr.csv.totalEur')]);
    let sumVar = 0, sumVarBase = 0, sumVarIva = 0;
    const variablesDelMes = variablesMes(mes, año).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    variablesDelMes.forEach(v => {
      const base = parseFloat(v.importe||0);
      const pct = ivaDeGastoVariable(v);
      const ivaAmt = base * pct/100;
      const total = base + ivaAmt;
      sumVar += total; sumVarBase += base; sumVarIva += ivaAmt;
      rows.push([v.fecha||'', v.categoria||'', v.proveedor||'', base, pct, ivaAmt, total]);
    });
    if(!variablesDelMes.length) rows.push([t('hr.csv.noVariableExpenses')]);
    rows.push(['','',t('common.total'), sumVarBase, '', sumVarIva, sumVar]);
    rows.push([]);

    const capexMes = capex().filter(c => (c.fecha||'').startsWith(mesStr));
    rows.push([t('hr.csv.capexMonth')]);
    rows.push([t('hr.lbl.description'), t('common.date'), t('hr.csv.baseEur'), t('hr.csv.vatPct'), t('hr.csv.vatAmount'), t('hr.csv.totalEur'), t('hr.lbl.status')]);
    let sumCapexBase=0, sumCapexIva=0, sumCapexTotal=0;
    capexMes.forEach(c => {
      const imp = parseFloat(c.importe||0);
      const ivaPct = parseFloat(c.iva||0);
      const ivaAmt = imp * ivaPct/100;
      const total = imp + ivaAmt;
      sumCapexBase += imp; sumCapexIva += ivaAmt; sumCapexTotal += total;
      rows.push([c.descripcion||'', c.fecha||'', imp, ivaPct, ivaAmt, total, c.estadoPago?estadoPagoLabel(c.estadoPago):'']);
    });
    if(!capexMes.length) rows.push([t('hr.csv.noInvestments')]);
    rows.push(['','',t('common.total'), sumCapexBase, '', sumCapexIva, sumCapexTotal, '']);
    rows.push([]);

    // Desglose por tipo de IVA real (21/10/4/0%) de los gastos del mes, necesario para
    // el Modelo 303/347 en vez de un único importe de IVA soportado sin detalle.
    rows.push([t('hr.csv.vatBreakdownTitle')]);
    rows.push([t('hr.csv.vatRatePct'), t('hr.csv.baseEur'), t('hr.csv.vatEur'), t('hr.csv.totalEur')]);
    const ivaGroups = {};
    function addToVatGroup(pct, base, ivaAmt){
      pct = parseFloat(pct)||0;
      if(!ivaGroups[pct]) ivaGroups[pct] = {base:0, iva:0};
      ivaGroups[pct].base += base; ivaGroups[pct].iva += ivaAmt;
    }
    variablesDelMes.forEach(v => {
      const base = parseFloat(v.importe||0);
      const pct = ivaDeGastoVariable(v);
      addToVatGroup(pct, base, base*pct/100);
    });
    fijos().forEach(g => {
      const base = gfMonthlyImporte(g);
      const pct = g.iva!=null ? parseFloat(g.iva) : 0;
      addToVatGroup(pct, base, base*pct/100);
    });
    capexMes.forEach(c => {
      const imp = parseFloat(c.importe||0);
      const pct = parseFloat(c.iva||0);
      addToVatGroup(pct, imp, imp*pct/100);
    });
    Object.keys(ivaGroups).map(Number).sort((a,b)=>b-a).forEach(pct => {
      const g = ivaGroups[pct];
      rows.push([`${pct}%`, g.base, g.iva, g.base+g.iva]);
    });
    rows.push([]);

    // Igual que arriba pero al revés: el IVA REPERCUTIDO (el que se cobra
    // al cliente en cada venta), por tipo real de cada plato/menú vendido —
    // no el mismo desglose que el de compras de arriba, que es el soportado.
    const {groups: ventasGroups, sinAsignar} = ventasIvaGroups(mes, año);
    rows.push([t('hr.csv.vatBreakdownTitleVentas')]);
    rows.push([t('hr.csv.vatRatePct'), t('hr.csv.baseEur'), t('hr.csv.vatEur'), t('hr.csv.totalEur')]);
    Object.keys(ventasGroups).map(Number).sort((a,b)=>b-a).forEach(pct => {
      const g = ventasGroups[pct];
      rows.push([`${pct}%`, g.base, g.iva, g.base+g.iva]);
    });
    if(sinAsignar > 0) rows.push([t('hr.csv.vatVentasSinAsignarNote'), sinAsignar]);
    rows.push([]);

    const comisiones = comisionesMes(mes, año);
    const resultado = sumBase - sumVarBase - sumFijosBaseHist - comisiones - capexCuotaMes(mes, año);
    const totalIvaSoportado = sumVarIva + sumFijosIvaHist + sumCapexIva;
    rows.push([t('hr.csv.monthSummary')]);
    rows.push([t('hr.lbl.concept'), t('hr.lbl.amountEur')]);
    // "Total con IVA" tiene que cuadrar exactamente con base+IVA de las dos
    // filas de abajo — antes se usaba sumTotal (que incluye propinas, sin
    // IVA por no ser un ingreso del negocio) y esa fila no coincidía con el
    // resto del propio informe: es la cifra que ve el gestor, y si no cuadra
    // con base+IVA parece un error (o peor, se declara de más si el gestor
    // la usa tal cual para el 303/347). La propina se informa aparte.
    rows.push([t('hr.csv.totalRevenueWithVat'), roundMoney(sumBase + sumIva)]);
    rows.push([t('hr.csv.salesTaxBase'), sumBase]);
    rows.push([t('hr.csv.vatOnSalesLabel'), sumIva]);
    rows.push([t('hr.csv.tipsCollected'), roundMoney(sumPropina)]);
    rows.push([t('hr.lbl.deliveryCommissions'), comisiones]);
    rows.push([t('hr.csv.variableExpensesBase'), sumVarBase]);
    rows.push([t('hr.csv.fixedExpensesBase'), sumFijosBaseHist]);
    rows.push([t('hr.csv.capexBase'), sumCapexBase]);
    rows.push([t('hr.csv.totalVatSupported'), totalIvaSoportado]);
    rows.push([t('hr.csv.vatToSettleShort'), sumIva - totalIvaSoportado]);
    rows.push([t('hr.csv.monthResult'), resultado]);

    // Nota informativa: el "Resultado del mes" se calcula a partir de las
    // ventas registradas, no del efectivo físico contado en los arqueos de
    // caja — son fuentes con propósitos distintos (ingresos reconocidos vs.
    // dinero realmente en el cajón) y no se mezclan aquí. Pero si ha habido
    // diferencias de caja ese mes (sobras/faltas al arquear), se muestran
    // aparte para que quien lleve la contabilidad las tenga a la vista sin
    // tener que ir a buscarlas a Operaciones > Arqueo de Caja.
    const cierresDelMes = (DB.cashClosures||[]).filter(c => (c.fecha||'').startsWith(mesStr) && c.diferencia != null);
    if(cierresDelMes.length){
      const sumDiferencias = cierresDelMes.reduce((s,c)=>s+parseFloat(c.diferencia||0), 0);
      rows.push([]);
      rows.push([t('hr.csv.cashClosuresNote')]);
      rows.push([t('hr.csv.cashClosuresCount').replace('${n}', cierresDelMes.length), sumDiferencias]);
    }

    const nombreNegocio = (b.name||'gastrogoan').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const vatByRate = Object.keys(ivaGroups).map(Number).sort((a,b)=>b-a).map(pct => ({pct, base: ivaGroups[pct].base, iva: ivaGroups[pct].iva}));
    const vatByRateVentas = Object.keys(ventasGroups).map(Number).sort((a,b)=>b-a).map(pct => ({pct, base: ventasGroups[pct].base, iva: ventasGroups[pct].iva}));
    return {rows, mesStr, nombreNegocio, sumTotal, sumBase, sumIva, sumFijos: sumFijosBase, sumVar: sumVarBase, comisiones, resultado, vatByRate, vatByRateVentas};
  }

  function exportMonth(){
    const mes = parseInt(document.getElementById('exp-mes').value);
    const año = parseInt(document.getElementById('exp-anyo').value) || currentYear();
    const report = buildMonthReport(mes, año);
    downloadCSV(report.rows, `contabilidad-${report.nombreNegocio}-${report.mesStr}.csv`);
    closeModal();
    showToast(t('msg.reportDownloaded'));
  }

  function emailMonth(){
    const mes = parseInt(document.getElementById('exp-mes').value);
    const año = parseInt(document.getElementById('exp-anyo').value) || currentYear();
    const email = document.getElementById('exp-email').value.trim();
    if(!email){ showToast(t('msg.enterAccountantEmail')); return; }

    const b = DB.business || {};
    b.gestorEmail = email;
    saveDB();

    const report = buildMonthReport(mes, año);
    const fmt = n => (Math.round(n*100)/100).toFixed(2).replace('.', ',') + ' €';
    const subject = t('hr.email.subject').replace('${month}', getMeses()[mes]).replace('${year}', año).replace('${business}', b.name||'GastroGoan');
    const csvName = `contabilidad-${report.nombreNegocio}-${report.mesStr}.csv`;
    // El desglose de IVA por tipo (21/10/4/0%) es el dato que más falta suele
    // hacerle al gestor para el Modelo 303/347, así que va también en el
    // cuerpo del email en texto plano: si el CSV se queda sin adjuntar (se le
    // olvida, o su cliente de correo se comporta raro con el mailto), el dato
    // fiscal más importante llega igualmente.
    const vatLines = (report.vatByRate||[]).length
      ? [t('hr.email.vatBreakdownTitle'), ...report.vatByRate.map(v => `- IVA ${v.pct}%: ${t('hr.csv.baseEur')} ${fmt(v.base)} · ${t('hr.csv.vatEur')} ${fmt(v.iva)}`), ``]
      : [];

    const body = [
      t('hr.email.greeting'),
      ``,
      t('hr.email.intro').replace('${month}', getMeses()[mes]).replace('${year}', año).replace('${business}', b.name||t('hr.email.theBusiness')),
      ``,
      t('hr.email.summaryTitle'),
      `- ${t('hr.csv.totalRevenueWithVat')}: ${fmt(report.sumBase + report.sumIva)}`,
      `- ${t('hr.csv.salesTaxBase')}: ${fmt(report.sumBase)}`,
      `- ${t('hr.te.vatPassedOn')}: ${fmt(report.sumIva)}`,
      `- ${t('hr.lbl.fixedExpenses')}: ${fmt(report.sumFijos)}`,
      `- ${t('hr.lbl.variableExpenses')}: ${fmt(report.sumVar)}`,
      `- ${t('hr.csv.monthResult')}: ${fmt(report.resultado)}`,
      ``,
      ...vatLines,
      t('hr.email.attachReminder').replace('${filename}', csvName),
      ``,
      t('hr.email.signoff')
    ].join('\n');

    downloadCSV(report.rows, `contabilidad-${report.nombreNegocio}-${report.mesStr}.csv`);
    closeModal();
    // El toast debe verse ANTES de que se abra el cliente de email (el mailto puede
    // llevarse el foco de la pestaña), así el usuario no se pierde el aviso de que
    // tiene que adjuntar el CSV a mano.
    showToast(t('msg.csvDownloadedAttachManually'), 6000);
    setTimeout(()=>{
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }, 500);
  }

  // Alternativa al email: copiar el mismo resumen (con desglose de IVA) al
  // portapapeles, para negocios cuyo gestor prefiere WhatsApp, un Drive
  // compartido u otro canal distinto del correo.
  function copyMonthSummary(){
    const mes = parseInt(document.getElementById('exp-mes').value);
    const año = parseInt(document.getElementById('exp-anyo').value) || currentYear();
    const report = buildMonthReport(mes, año);
    const b = DB.business || {};
    const fmt = n => (Math.round(n*100)/100).toFixed(2).replace('.', ',') + ' €';
    const vatLines = (report.vatByRate||[]).length
      ? [t('hr.email.vatBreakdownTitle'), ...report.vatByRate.map(v => `- IVA ${v.pct}%: ${t('hr.csv.baseEur')} ${fmt(v.base)} · ${t('hr.csv.vatEur')} ${fmt(v.iva)}`)]
      : [];
    const text = [
      t('hr.email.intro').replace('${month}', getMeses()[mes]).replace('${year}', año).replace('${business}', b.name||t('hr.email.theBusiness')),
      ``,
      t('hr.email.summaryTitle'),
      `- ${t('hr.csv.totalRevenueWithVat')}: ${fmt(report.sumBase + report.sumIva)}`,
      `- ${t('hr.csv.salesTaxBase')}: ${fmt(report.sumBase)}`,
      `- ${t('hr.te.vatPassedOn')}: ${fmt(report.sumIva)}`,
      `- ${t('hr.lbl.fixedExpenses')}: ${fmt(report.sumFijos)}`,
      `- ${t('hr.lbl.variableExpenses')}: ${fmt(report.sumVar)}`,
      `- ${t('hr.csv.monthResult')}: ${fmt(report.resultado)}`,
      ``,
      ...vatLines,
    ].join('\n');
    navigator.clipboard.writeText(text).then(
      () => showToast(t('msg.summaryCopied')),
      () => showToast(t('msg.copyFailed'))
    );
  }

  const api = {init, tab, renderVentas, setVentasYear, setVentasMonth, setVentasTipoFiltro, newGF, newGFFromEmployee, editGF, saveGF, deleteGF, toggleGFAutoCalc, recalcGFAuto, setMonth, setGVSearch, setGVYear, newGV, editGV, saveGV, deleteGV, deleteGVGroup, editFoodCostObj, calcPE, peUseRealData, peSaveScenario, peLoadScenario, peDeleteScenario, newCapex, editCapex, saveCapex, deleteCapex, toggleCapexFinanciado, setMonthTe, setTeYear, toggleCierreTe, adjustDistPct, setPctImpuesto, renderTesoreria, setCDRYear, setCDRGranularidad, renderPlatos, setPlatosPeriod, setPlatosCustom, openExportModal, exportMonth, emailMonth, copyMonthSummary};
  // GE se expone como objeto global (window.GE) para que los onclick="GE.x()"
  // del HTML funcionen — pero eso también significa que cualquiera con la
  // consola del navegador puede llamar GE.saveGF()/GE.deleteCapex()/etc.
  // directamente, saltándose por completo la comprobación de init(). Solo
  // init() (y renderView() antes de pintar #view-economia) comprobaban
  // isGestionLocked() — el resto de métodos confiaban en que nadie llegara
  // a ellos sin pasar por ahí. Se envuelve cada método público con el mismo
  // guard, para que Gestión Económica sea de verdad exclusiva del
  // propietario y no solo en la interfaz visible.
  const guarded = {};
  Object.keys(api).forEach(name => {
    guarded[name] = function(...args){
      if(isGestionLocked('economia')){ denyGestionAccess(); return; }
      return api[name].apply(null, args);
    };
  });
  return guarded;
})();

/* ============================================================
   HORARIOS — Turnos del personal
   ============================================================ */
const WEEK_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const WEEK_DAY_KEYS = ['lun','mar','mie','jue','vie','sab','dom'];
const SHIFT_TYPE_KEYS = {M:'shift.morning', T:'shift.afternoon', P:'shift.split', D:'shift.rest', V:'shift.vacation', B:'shift.leave', C:'shift.other'};
const SHIFT_TYPES = {
  get M(){ return {label:t('shift.morning'), bg:'#DBEAFE', tx:'#1E40AF'}; },
  get T(){ return {label:t('shift.afternoon'), bg:'#FEF9C3', tx:'#854D0E'}; },
  get P(){ return {label:t('shift.split'), bg:'#DCFCE7', tx:'#166534'}; },
  get D(){ return {label:t('shift.rest'), bg:'#F3F4F6', tx:'#6B7280'}; },
  get V(){ return {label:t('shift.vacation'), bg:'#FFF7ED', tx:'#9A3412'}; },
  get B(){ return {label:t('shift.leave'), bg:'#FEE2E2', tx:'#991B1B'}; },
  get C(){ return {label:t('shift.other'), bg:'#EDE9FE', tx:'#5B21B6'}; }
};

let horariosTab = 'personal';
let horariosWeekOffset = 0;
let horariosDate = todayStr();
let horariosMonthOffset = 0;

function getWeekDates(offset){
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day-1) + offset*7);
  return Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });
}
function dateStr(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
// Nunca con toISOString (desfase de un día en cualquier huso por delante de
// UTC, como España) — se construye la fecha con sus componentes locales y
// se avanza con setDate, que respeta el calendario local de verdad.
function addDaysStr(fechaStr, dias){
  const [y,m,d] = fechaStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + dias);
  return dateStr(dt);
}
function hoursBetween(t1, t2){
  if(!t1 || !t2) return 0;
  const [h1,m1] = t1.split(':').map(Number), [h2,m2] = t2.split(':').map(Number);
  let diff = (h2*60+m2) - (h1*60+m1);
  if(diff < 0) diff += 24*60;
  return diff/60;
}
function turnoHours(t){
  if(['D','V','B'].includes(t.tipo)) return 0;
  let h = hoursBetween(t.entrada, t.salida);
  if(t.tipo==='P' && t.entrada2 && t.salida2) h += hoursBetween(t.entrada2, t.salida2);
  return h;
}
function turnoHorarioLabel(t){
  if(['D','V','B'].includes(t.tipo)) return '—';
  let s = `${t.entrada}-${t.salida}`;
  if(t.tipo==='P' && t.entrada2 && t.salida2) s += ` / ${t.entrada2}-${t.salida2}`;
  return s;
}

// ¿Está este empleado dentro de su turno AHORA MISMO, según el horario que
// se le ha planificado hoy? Se usa para el reparto automático (asignar el
// pedido a un repartidor que de verdad esté trabajando ahora, no a
// cualquiera dado de alta como repartidor aunque libre o de vacaciones).
// Contempla turnos partidos (dos franjas) y turnos que cruzan medianoche.
function isEmployeeOnShiftNow(employeeId){
  const turno = (DB.turnos||[]).find(x => x.employeeId === employeeId && x.fecha === todayStr());
  if(!turno || ['D','V','B'].includes(turno.tipo)) return false;
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  const inRange = (entrada, salida) => {
    if(!entrada || !salida) return false;
    const [eh,em] = entrada.split(':').map(Number);
    const [sh,sm] = salida.split(':').map(Number);
    const e = eh*60+em, s = sh*60+sm;
    return s > e ? (nowMin >= e && nowMin <= s) : (nowMin >= e || nowMin <= s);
  };
  if(inRange(turno.entrada, turno.salida)) return true;
  if(turno.tipo === 'P' && inRange(turno.entrada2, turno.salida2)) return true;
  return false;
}

/* ============================================================
   HORARIO FIJO — patrón semanal que se repite indefinidamente
   El hostelero define UNA vez qué hace cada empleado cada día de la semana
   (lun..dom) y la app va generando sola, por delante, los turnos reales en
   DB.turnos — que es lo único que leen las vistas Día/Semana/Mes, el
   reparto automático (isEmployeeOnShiftNow) y la hoja imprimible: no hace
   falta tocar ninguna de ellas, el patrón solo "rellena" turnos normales.

   Un turno generado así lleva origen:'fijo'. En cuanto el hostelero lo
   edita a mano (saveTurno) o lo borra, deja de llevar esa marca — el día
   queda "suelto" del patrón para siempre y ni una regeneración futura ni un
   cambio del patrón general vuelven a tocarlo. Es la pieza clave para que
   "puedo tocar un día concreto sin romper el patrón" sea cierto de verdad. */
const HORIZONTE_HORARIO_FIJO_DIAS = 28; // 4 semanas por delante, siempre

function horarioFijoDe(employeeId){
  return (DB.horariosFijos||[]).find(h => h.employeeId===employeeId && h.activo!==false) || null;
}

// Genera (si hace falta) los turnos que faltan por delante para TODOS los
// empleados con horario fijo activo. Se llama cada vez que se abre
// Horarios — barato si no hay nada que generar (generadoHasta ya cubre la
// ventana) y así el patrón "para siempre" se mantiene solo, sin depender de
// que nadie recuerde tocar nada cada 4 semanas.
function generarTurnosFijos(){
  if(!DB.horariosFijos || !DB.horariosFijos.length) return;
  const hoy = todayStr();
  const limite = addDaysStr(hoy, HORIZONTE_HORARIO_FIJO_DIAS);
  let cambiado = false;
  DB.horariosFijos.forEach(hf => {
    if(hf.activo===false) return;
    if(!DB.employees.some(e => e.id===hf.employeeId)) return; // empleado borrado, por si acaso
    let cursor = hf.generadoHasta && hf.generadoHasta >= hoy ? addDaysStr(hf.generadoHasta, 1) : hoy;
    while(cursor <= limite){
      const diaSemana = (new Date(cursor+'T00:00:00').getDay() + 6) % 7; // 0=lunes .. 6=domingo
      const patronDia = hf.patron[diaSemana];
      // Ya hay un turno ese día para este empleado (a mano, o de otro
      // origen): nunca se pisa — ver comentario del bloque de arriba.
      const yaExiste = (DB.turnos||[]).some(x => x.employeeId===hf.employeeId && x.fecha===cursor);
      if(patronDia && patronDia.tipo && !yaExiste){
        DB.turnos.push({
          id: genId(), employeeId: hf.employeeId, fecha: cursor,
          tipo: patronDia.tipo,
          entrada: patronDia.entrada||'', salida: patronDia.salida||'',
          entrada2: patronDia.entrada2||'', salida2: patronDia.salida2||'',
          notas: '', origen: 'fijo'
        });
        cambiado = true;
      }
      cursor = addDaysStr(cursor, 1);
    }
    if(hf.generadoHasta !== limite){ hf.generadoHasta = limite; cambiado = true; }
  });
  if(cambiado) saveDB();
}

function renderHorarios(){
  generarTurnosFijos();
  const box = document.getElementById('horarios-content');
  box.innerHTML = `
    <nav class="ge-tab-row">
      <button class="ge-tab ${horariosTab==='personal'?'active':''}" onclick="setHorariosTab('personal')"><i class="ti ti-users"></i> ${t('label.staff')}</button>
      <button class="ge-tab ${horariosTab==='calendario'?'active':''}" onclick="setHorariosTab('calendario')"><i class="ti ti-calendar"></i> ${t('label.calendar')}</button>
    </nav>
    <div id="horarios-tab-content"></div>
  `;
  renderHorariosTab();
}
function setHorariosTab(tab){ horariosTab = tab; renderHorarios(); }
function renderHorariosTab(){
  if(horariosTab === 'personal') renderHorariosPersonal();
  else renderHorariosCalendario();
}

// El calendario de Horarios es un único subtab (Día/Semana/Mes), con el
// mismo interruptor tri-estado que ya usa el calendario de reservas de la
// web pública — mismo patrón visual, no se inventa uno nuevo.
let horariosCalView = 'dia';
function setHorariosCalView(v){ horariosCalView = v; renderHorariosCalendario(); }
function renderHorariosCalendario(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;
  box.innerHTML = `
    <div class="view-toggle" style="margin-bottom:12px">
      <button class="btn ${horariosCalView==='dia'?'active':''}" onclick="setHorariosCalView('dia')">${t('common.day')}</button>
      <button class="btn ${horariosCalView==='semana'?'active':''}" onclick="setHorariosCalView('semana')">${t('common.week')}</button>
      <button class="btn ${horariosCalView==='mes'?'active':''}" onclick="setHorariosCalView('mes')">${t('common.month')}</button>
    </div>
    <div id="horarios-cal-body"></div>
  `;
  if(horariosCalView==='dia') renderHorariosDia();
  else if(horariosCalView==='mes') renderHorariosMes();
  else renderHorariosSemana();
}

function goToHorariosDia(date){
  horariosDate = date;
  horariosTab = 'calendario';
  horariosCalView = 'dia';
  renderHorarios();
}

function renderHorariosDia(){
  const box = document.getElementById('horarios-cal-body');
  if(!box) return;

  const emps = areaEmployees();
  if(!emps.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`;
    return;
  }

  const date = horariosDate;
  const turnos = (DB.turnos||[]).filter(t => t.fecha === date);

  const rows = emps.map(emp => {
    const turno = turnos.find(x => x.employeeId===emp.id);
    if(turno){
      const tipo = SHIFT_TYPES[turno.tipo] || SHIFT_TYPES.C;
      const hh = turnoHours(turno);
      return `
        <tr>
          <td>
            <span style="display:inline-flex;align-items:center;gap:6px">
              <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
              <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
            </span>
          </td>
          <td><span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${tipo.bg};color:${tipo.tx};font-weight:700;font-size:12px">${turno.tipo} - ${tipo.label}</span></td>
          <td>${escapeHtml(turnoHorarioLabel(turno))}</td>
          <td>${hh>0?hh.toFixed(1)+'h':'—'}</td>
          <td class="wrap">${escapeHtml(turno.notas||'—')}</td>
          <td class="actions-cell">
            <button class="owner-only btn btn-sm btn-icon" onclick="openTurnoModal(${turno.id})"><i class="ti ti-edit"></i></button>
            <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteTurno(${turno.id})"><i class="ti ti-trash"></i></button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
            <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
          </span>
        </td>
        <td colspan="5"><span style="color:var(--muted)">${t('label.noShiftAssigned')}</span></td>
      </tr>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <input type="date" id="horarios-filter-date" value="${date}" onchange="horariosDate=this.value;renderHorarios()">
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      ${Object.entries(SHIFT_TYPES).map(([k,v]) => `<span class="badge" style="background:${v.bg};color:${v.tx}">${k} = ${v.label}</span>`).join('')}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('th.employee')}</th><th>${t('th.shift')}</th><th>${t('label.schedule')}</th><th>${t('th.hours')}</th><th>${t('th.notes')}</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderHorariosMes(){
  const box = document.getElementById('horarios-cal-body');
  if(!box) return;

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + horariosMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const empIds = new Set(areaEmployees().map(e => e.id));
  const counts = {};
  (DB.turnos||[]).forEach(t => { if(t.tipo !== 'D' && empIds.has(t.employeeId)) counts[t.fecha] = (counts[t.fecha]||0) + 1; });

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const count = counts[ds] || 0;
    const isToday = ds === todayStr();
    cells += `
      <div class="card cal-day-cell" style="cursor:pointer;padding:8px;text-align:center;min-width:0;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToHorariosDia('${ds}')">
        <div style="font-weight:700">${day}</div>
        ${count ? `<span class="badge badge-blue cal-day-badge" title="${escapeHtml(count===1?t('hr2.oneShift'):t('hr2.nShifts').replace('${n}', count))}">${count}</span>` : ''}
      </div>
    `;
  }

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="horariosMonthOffset--;renderHorarios()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="horariosMonthOffset=0;renderHorarios()">${t('common.today')}</button>
        <button class="btn btn-sm" onclick="horariosMonthOffset++;renderHorarios()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${monthFull(month)} ${year}</strong>
      </div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">
      ${t('days.short').map(d=>`<div style="text-align:center;font-size:12px;font-weight:700;color:var(--muted)">${d}</div>`).join('')}
      ${cells}
    </div>
  `;
}

function renderHorariosSemana(){
  const box = document.getElementById('horarios-cal-body');
  if(!box) return;

  const emps = areaEmployees();
  if(!emps.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`;
    return;
  }

  const dates = getWeekDates(horariosWeekOffset);
  const dateStrs = dates.map(dateStr);
  const label = `${dates[0].toLocaleDateString(localeActual(),{day:'numeric',month:'short'})} – ${dates[6].toLocaleDateString(localeActual(),{day:'numeric',month:'short',year:'numeric'})}`;
  const headerCells = dates.map((d,i) => `<th>${weekDayShort(i)}<br><span style="font-size:10.5px;font-weight:400">${d.getDate()}/${d.getMonth()+1}</span></th>`).join('');

  const rows = emps.map(emp => {
    let totalH = 0;
    const cells = dateStrs.map(ds => {
      const turno = (DB.turnos||[]).find(x => x.employeeId===emp.id && x.fecha===ds);
      if(turno){
        const tipo = SHIFT_TYPES[turno.tipo] || SHIFT_TYPES.C;
        const hh = turnoHours(turno);
        if(hh > 0) totalH += hh;
        return `<td><span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${tipo.bg};color:${tipo.tx};font-weight:700;font-size:12px;text-align:center;${editUnlocked?'cursor:pointer':''}" ${editUnlocked?`onclick="openTurnoModal(${turno.id})"`:''}>${turno.tipo}${turno.tipo!=='D'?`<br><span style="font-size:10.5px;font-weight:400">${escapeHtml(turnoHorarioLabel(turno))}</span>`:''}</span></td>`;
      }
      // El calendario es solo VISTA: asignar un turno nuevo se hace desde el
      // botón de calendario de la ficha del empleado (horario fijo o por
      // periodo), nunca desde una casilla vacía aquí — solo se puede tocar
      // un turno que ya existe.
      return `<td style="text-align:center;padding:2px;color:var(--muted)">—</td>`;
    }).join('');
    return `<tr>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
          <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
        </span>
      </td>
      ${cells}
      <td style="text-align:center;font-weight:700">${totalH>0?totalH.toFixed(1)+'h':'—'}</td>
    </tr>`;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="horariosWeekOffset--; renderHorariosSemana()"><i class="ti ti-chevron-left"></i></button>
        <strong style="margin:0 8px">${label}</strong>
        <button class="btn btn-sm" onclick="horariosWeekOffset++; renderHorariosSemana()"><i class="ti ti-chevron-right"></i></button>
        <button class="btn btn-sm" onclick="horariosWeekOffset=0; renderHorariosSemana()">${t('common.today')}</button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="printWeeklySchedule()"><i class="ti ti-printer"></i> ${t('btn.printSchedule')}</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      ${Object.entries(SHIFT_TYPES).map(([k,v]) => `<span class="badge" style="background:${v.bg};color:${v.tx}">${k} = ${v.label}</span>`).join('')}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('th.employee')}</th>${headerCells}<th>${t('label.totalHoursAbbrev')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Hoja imprimible del horario semanal visible, para pegar en cocina/barra.
function printWeeklySchedule(){
  const emps = areaEmployees();
  const dates = getWeekDates(horariosWeekOffset);
  const dateStrs = dates.map(dateStr);
  const label = `${dates[0].toLocaleDateString(localeActual(),{day:'numeric',month:'short'})} – ${dates[6].toLocaleDateString(localeActual(),{day:'numeric',month:'short',year:'numeric'})}`;
  const headerCells = dates.map((d,i) => `<th>${weekDayShort(i)} ${d.getDate()}/${d.getMonth()+1}</th>`).join('');
  const rows = emps.map(emp => {
    const cells = dateStrs.map(ds => {
      const turno = (DB.turnos||[]).find(x => x.employeeId===emp.id && x.fecha===ds);
      if(!turno) return '<td>—</td>';
      const tipo = SHIFT_TYPES[turno.tipo] || SHIFT_TYPES.C;
      return `<td>${turno.tipo}${turno.tipo!=='D'?` (${escapeHtml(turnoHorarioLabel(turno))})`:''} — ${escapeHtml(tipo.label)}</td>`;
    }).join('');
    return `<tr><td><strong>${escapeHtml(emp.name)}</strong>${emp.rol?` <span style="color:#888">(${escapeHtml(emp.rol)})</span>`:''}</td>${cells}</tr>`;
  }).join('');
  const body = `
    ${printReportHeaderHtml(t('btn.printSchedule'), label)}
    <table><thead><tr><th>${t('th.employee')}</th>${headerCells}</tr></thead>
    <tbody>${rows || `<tr><td colspan="8" class="pr-empty">${t('empty.employees')}</td></tr>`}</tbody></table>
  `;
  printReportWindow(t('btn.printSchedule'), body, {winSize:'width=900,height=1000'});
}

function openTurnoModal(id, employeeId, fecha){
  if(!isOwnerSession() && !editUnlocked) return;
  let turno = id ? (DB.turnos||[]).find(x => x.id===id) : null;
  // Un empleado desactivado (baja temporal) no debería poder recibir turnos
  // NUEVOS — solo se conserva en la lista si el turno que se está editando
  // ya era suyo, para no romper la edición de algo ya asignado.
  const emps = areaEmployees().filter(e => e.active!==false || (turno && turno.employeeId===e.id));
  if(!emps.length){ showToast(t('msg.addEmployeesFirst')); return; }
  const state = turno ? {...turno} : {id:null, employeeId: employeeId||emps[0].id, fecha: fecha||dateStr(new Date()), tipo:'M', entrada:'09:00', salida:'17:00', notas:''};
  const empOptions = emps.map(e => `<option value="${e.id}"${e.id===state.employeeId?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const tipoOptions = Object.entries(SHIFT_TYPES).map(([k,v]) => `<option value="${k}"${k===state.tipo?' selected':''}>${k} - ${v.label}</option>`).join('');
  const noHorario = ['D','V','B'].includes(state.tipo);
  const isPartido = state.tipo === 'P';
  // Este turno concreto sigue el patrón de un horario fijo activo: al
  // guardarlo hay que preguntar si el cambio es solo para hoy o para
  // siempre (todos los ${diaSemana} desde esta fecha) — ver saveTurno.
  const puedeElegirAlcance = turno && turno.origen === 'fijo' && !!horarioFijoDe(turno.employeeId);

  openModal(`
    <div class="modal-header">
      <h3>${state.id ? t('common.edit') : t('common.new')} ${t('hr2.shift')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${puedeElegirAlcance ? `<div class="manual-warning" style="margin-bottom:10px"><i class="ti ti-repeat"></i> ${t('hr2.followsFixedSchedule')}</div>` : ''}
    <div class="field-row">
      <div class="field">
        <label>${t('hr2.employee')}</label>
        <select id="turno-employee">${empOptions}</select>
      </div>
      <div class="field">
        <label>${t('common.date')}</label>
        <input type="date" id="turno-fecha" value="${state.fecha}">
      </div>
    </div>
    <div class="field">
      <label>${t('hr2.shiftType')}</label>
      <select id="turno-tipo" onchange="turnoTipoChanged()">${tipoOptions}</select>
    </div>
    <div id="turno-horarios" style="display:${noHorario?'none':'block'}">
      <div class="field-row">
        <div class="field">
          <label>${isPartido?t('hr2.entryMorning'):t('hr2.clockIn')}</label>
          <input type="time" id="turno-entrada" value="${state.entrada}">
        </div>
        <div class="field">
          <label>${isPartido?t('hr2.exitMorning'):t('hr2.clockOut')}</label>
          <input type="time" id="turno-salida" value="${state.salida}">
        </div>
      </div>
      <div id="turno-partido" style="display:${isPartido?'block':'none'}">
        <div class="field-row">
          <div class="field">
            <label>${t('hr2.entryAfternoon')}</label>
            <input type="time" id="turno-entrada2" value="${state.entrada2||'16:00'}">
          </div>
          <div class="field">
            <label>${t('hr2.exitAfternoon')}</label>
            <input type="time" id="turno-salida2" value="${state.salida2||'23:00'}">
          </div>
        </div>
      </div>
    </div>
    <div id="turno-descanso-msg" style="display:${noHorario?'block':'none'};background:#F3F4F6;border-radius:8px;padding:12px;font-size:13px;color:var(--muted);text-align:center;margin-bottom:10px">
      ${t('hr2.noScheduleThisDay')}
    </div>
    <div class="field">
      <label>${t('common.notes')}</label>
      <input type="text" id="turno-notas" value="${escapeHtml(state.notas||'')}" placeholder="${t('hr2.shiftNotesPh')}">
    </div>
    <div class="modal-footer">
      ${state.id ? `<button class="owner-only btn btn-danger" onclick="deleteTurno(${state.id})">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      ${puedeElegirAlcance ? `
        <button class="btn" onclick="saveTurno(${state.id}, 'dia')">${t('btn.onlyThisDay')}</button>
        <button class="btn btn-primary" onclick="saveTurno(${state.id}, 'siempre')">${t('btn.forever')}</button>
      ` : `<button class="btn btn-primary" onclick="saveTurno(${state.id||'null'})">${t("common.save")}</button>`}
    </div>
  `);
}

function turnoTipoChanged(){
  const tipo = document.getElementById('turno-tipo').value;
  const noHorario = ['D','V','B'].includes(tipo);
  const isPartido = tipo === 'P';
  document.getElementById('turno-horarios').style.display = noHorario ? 'none' : 'block';
  document.getElementById('turno-partido').style.display = isPartido ? 'block' : 'none';
  document.getElementById('turno-descanso-msg').style.display = noHorario ? 'block' : 'none';
}

// "Para siempre": el hostelero cambió el horario de UN día concreto que
// seguía el patrón fijo y eligió que valga para todos los ${diaSemana}
// futuros, no solo hoy. Actualiza el propio patrón (el hueco de ESE día de
// la semana) y, con él, todos los turnos futuros —incluida esta fecha— que
// SIGAN siendo automáticos para ese mismo día de la semana. Un día que el
// hostelero ya hubiera tocado a mano en otro momento (aunque fuera el mismo
// día de la semana) no lleva origen:'fijo' y por tanto no se toca aquí:
// sigue siendo suyo, como siempre.
function aplicarCambioPermanentePatron(employeeId, desdeFecha, data){
  const hf = horarioFijoDe(employeeId);
  if(!hf) return;
  const diaSemana = (new Date(desdeFecha+'T00:00:00').getDay() + 6) % 7;
  hf.patron[diaSemana] = {tipo:data.tipo, entrada:data.entrada, salida:data.salida, entrada2:data.entrada2, salida2:data.salida2};
  (DB.turnos||[]).forEach(x => {
    if(x.employeeId!==employeeId || x.origen!=='fijo' || x.fecha < desdeFecha) return;
    if(((new Date(x.fecha+'T00:00:00').getDay() + 6) % 7) !== diaSemana) return;
    Object.assign(x, {tipo:data.tipo, entrada:data.entrada, salida:data.salida, entrada2:data.entrada2, salida2:data.salida2});
  });
}

async function saveTurno(id, alcance){
  if(!isOwnerSession() && !editUnlocked) return;
  const tipo = document.getElementById('turno-tipo').value;
  const noHorario = ['D','V','B'].includes(tipo);
  const isPartido = tipo === 'P';
  const data = {
    employeeId: parseInt(document.getElementById('turno-employee').value),
    fecha: document.getElementById('turno-fecha').value,
    tipo,
    entrada: noHorario ? '' : document.getElementById('turno-entrada').value,
    salida: noHorario ? '' : document.getElementById('turno-salida').value,
    entrada2: isPartido && document.getElementById('turno-entrada2') ? document.getElementById('turno-entrada2').value : '',
    salida2: isPartido && document.getElementById('turno-salida2') ? document.getElementById('turno-salida2').value : '',
    notas: document.getElementById('turno-notas').value.trim()
  };
  if(!DB.turnos) DB.turnos = [];
  let turno = id ? DB.turnos.find(x => x.id===id) : null;
  if(id && !turno){ showToast(t('msg.shiftNotFound')); return; }
  // Un empleado solo puede tener un turno por día: si ya hay OTRO turno (con
  // distinto id) para ese empleado+fecha, se sustituye en vez de crear o
  // dejar un duplicado que descuadraría las horas totales. Esto se comprueba
  // tanto al crear un turno nuevo como al EDITAR uno existente — antes solo
  // se comprobaba al crear, así que editar un turno para que coincidiera con
  // el empleado+fecha de otro ya existente dejaba los dos duplicados.
  const collision = DB.turnos.find(x => x.employeeId===data.employeeId && x.fecha===data.fecha && x.id !== id);
  const emp = DB.employees.find(x=>x.id===data.employeeId);
  if(collision){
    // Antes esto se fusionaba en silencio: si ya había OTRO turno asignado
    // ese día para este empleado, se pisaba sin ningún aviso específico
    // (solo un texto genérico fijo en el modal, fácil de no leer). Ahora se
    // avisa con los datos concretos del turno que se va a sustituir.
    if(!(await confirmModal(t('msg.confirmOverwriteShift').replace('${name}', emp?emp.name:'?').replace('${date}', data.fecha).replace('${tipo}', collision.tipo)))) return;
    if(turno) DB.turnos = DB.turnos.filter(x => x.id !== turno.id);
    turno = collision;
  }
  // wasNew se calcula DESPUÉS de resolver la colisión: si un turno nuevo
  // (sin id) colisiona con uno existente, el resultado es una fusión sobre
  // el turno colisionante (no se crea fila nueva), así que el registro de
  // auditoría debe decir "editado", no "creado".
  const wasNew = !turno;
  if(turno){
    if(alcance === 'siempre' && turno.origen === 'fijo'){
      // Para siempre: actualiza el patrón y todos los ${diaSemana} futuros
      // que sigan siendo automáticos. Este turno se queda origen:'fijo'
      // (lo actualiza el propio bucle de arriba, por ser >= desdeFecha).
      aplicarCambioPermanentePatron(data.employeeId, data.fecha, data);
    } else {
      // Solo este día (o no había patrón que elegir): se suelta del
      // horario fijo para siempre — ni una regeneración futura ni un
      // cambio del patrón general de este empleado vuelven a tocarlo.
      delete turno.origen;
      Object.assign(turno, data);
    }
  } else {
    turno = {id: genId(), ...data};
    DB.turnos.push(turno);
  }
  logPersonalEvent(wasNew?'shiftCreated':'shiftEdited', {name: emp?emp.name:'?', fecha: data.fecha, tipo: data.tipo});
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(t('msg.shiftSaved'));
}

async function deleteTurno(id){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteShift')))) return;
  const turno = (DB.turnos||[]).find(t => t.id===id);
  if(turno){
    const emp = DB.employees.find(x=>x.id===turno.employeeId);
    logPersonalEvent('shiftDeleted', {name: emp?emp.name:'?', fecha: turno.fecha, tipo: turno.tipo});
  }
  DB.turnos = (DB.turnos||[]).filter(t => t.id!==id);
  saveDB();
  closeModal();
  renderHorariosTab();
}

// Empleados del área actual (cocina o sala). El personal se gestiona por separado
// según desde qué carpeta (Cocina/Sala) se entre a Horarios.
function areaEmployees(){
  return DB.employees.filter(e => (e.area||'cocina') === currentArea());
}

// Registro de cambios sensibles de Personal (turnos, reseteos de PIN), para
// poder consultar quién cambió qué y cuándo — mismo espíritu que el
// historial de ajustes de Stock.
function logPersonalEvent(type, params){
  if(!DB.personalLog) DB.personalLog = [];
  DB.personalLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5),
    createdAt: new Date().toISOString(), type, params: params||{}, area: currentArea()
  });
  if(DB.personalLog.length > 500) DB.personalLog = DB.personalLog.slice(-500);
  // Sigue viviendo en su propio Historial de Personal — esto es solo para
  // que también salga en el registro general. "Resetear PIN" es la única
  // de estas cuatro que de verdad duele si la hace quien no debe.
  const p = params || {};
  const typeLabel = {shiftCreated:t('audit.personal.shiftCreated'), shiftEdited:t('audit.personal.shiftEdited'), shiftDeleted:t('audit.personal.shiftDeleted'), pinReset:t('audit.personal.pinReset'), clockedByOther:t('audit.personal.clockedByOther'), fixedScheduleSet:t('audit.personal.fixedScheduleSet'), fixedScheduleRemoved:t('audit.personal.fixedScheduleRemoved')}[type] || type;
  logAudit('personal', `${typeLabel}: ${p.name||'?'}`, type==='pinReset' ? 'critical' : 'normal');
}

// Formatea una entrada del historial en el idioma activo. `desc` (texto ya
// formateado) se sigue leyendo para entradas antiguas guardadas antes de
// este cambio, así el historial previo no se rompe ni desaparece.
function formatPersonalLogEntry(e){
  if(e.desc && !e.type) return e.desc;
  const p = e.params || {};
  const shiftDetail = `${p.name} — ${p.fecha} (${p.tipo})`;
  switch(e.type){
    case 'shiftCreated': return t('personalLog.shiftCreated').replace('${detail}', shiftDetail);
    case 'shiftEdited': return t('personalLog.shiftEdited').replace('${detail}', shiftDetail);
    case 'shiftDeleted': return t('personalLog.shiftDeleted').replace('${detail}', shiftDetail);
    case 'pinReset': return t('personalLog.pinReset').replace('${name}', p.name);
    case 'clockedByOther': return t('personalLog.clockedByOther').replace('${name}', p.name).replace('${action}', p.action==='entrada'?t('hr2.clockIn'):t('hr2.clockOut')).replace('${via}', p.via==='owner_session'?t('common.owner'):t('label.businessPin'));
    case 'fixedScheduleSet': return t('personalLog.fixedScheduleSet').replace('${name}', p.name);
    case 'fixedScheduleRemoved': return t('personalLog.fixedScheduleRemoved').replace('${name}', p.name);
    default: return '';
  }
}

function openPersonalLogModal(){
  const log = [...(DB.personalLog||[])].filter(e => (e.area||'cocina')===currentArea()).reverse().slice(0, 100);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${t('title.personalLog')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('th.detail')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td>${escapeHtml(e.fecha)}</td><td>${escapeHtml(e.hora)}</td><td>${escapeHtml(formatPersonalLogEntry(e))}</td></tr>`).join('') : `<tr><td colspan="3"><div class="empty" style="padding:14px">${t('empty.noPersonalLog')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

let personalSearch = '';
function setPersonalSearch(val){
  personalSearch = val.toLowerCase();
  renderHorariosPersonal();
}

// Ranking amistoso de ventas del mes (por camarero, a partir de camareroId
// en cada venta) + termómetro de clima del equipo (media de las respuestas
// de esta semana) — ambos solo para el propietario, con tono positivo, sin
// mostrar a nadie "el peor", solo reconocer a los que más venden.
function renderTeamPulseHtml(){
  const parts = [];
  const pendingSwaps = (DB.turnoSwapRequests||[]).filter(r => r.status==='pending_owner').filter(r => {
    const from = DB.employees.find(e=>e.id===r.fromEmployeeId);
    return from && (from.area||'cocina')===currentArea();
  });
  if(pendingSwaps.length){
    parts.push(`
      <div class="card owner-strict" style="margin-bottom:10px;border:1px solid var(--amber)">
        <h4 style="margin-bottom:6px"><i class="ti ti-replace"></i> ${t('swap.ownerPendingTitle')}</h4>
        ${pendingSwaps.map(r => {
          const from = DB.employees.find(e=>e.id===r.fromEmployeeId);
          const to = DB.employees.find(e=>e.id===r.toEmployeeId);
          const turno = (DB.turnos||[]).find(x=>x.id===r.fromTurnoId);
          return `<div style="font-size:12.5px;margin-bottom:6px">
            ${t('swap.ownerPendingLine').replace('${from}', escapeHtml(from?from.name:'?')).replace('${to}', escapeHtml(to?to.name:'?')).replace('${date}', escapeHtml(turno?turno.fecha:'?'))}
            <div style="display:flex;gap:6px;margin-top:4px">
              <button class="btn btn-sm btn-primary" onclick="ownerApproveTurnoSwap(${r.id}, true)">${t('common.accept')}</button>
              <button class="btn btn-sm" onclick="ownerApproveTurnoSwap(${r.id}, false)">${t('common.reject')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>`);
  }
  const pendingVacations = (DB.vacationRequests||[]).filter(r => r.status==='pending').filter(r => {
    const emp = DB.employees.find(e=>e.id===r.employeeId);
    return emp && (emp.area||'cocina')===currentArea();
  });
  if(pendingVacations.length){
    parts.push(`
      <div class="card owner-strict" style="margin-bottom:10px;border:1px solid var(--amber)">
        <h4 style="margin-bottom:6px"><i class="ti ti-beach"></i> ${t('vacation.ownerPendingTitle')}</h4>
        ${pendingVacations.map(r => {
          const emp = DB.employees.find(e=>e.id===r.employeeId);
          const summary = vacationAllowanceSummary(r.employeeId);
          return `<div style="font-size:12.5px;margin-bottom:6px">
            ${t('vacation.ownerPendingLine').replace('${name}', escapeHtml(emp?emp.name:'?')).replace('${from}', escapeHtml(r.fromDate)).replace('${to}', escapeHtml(r.toDate))}
            ${summary ? ` <span style="color:var(--muted)">${t('vacation.ownerPendingRemaining').replace('${remaining}', summary.remaining).replace('${total}', summary.total)}</span>` : ''}
            ${r.notes ? `<div style="color:var(--muted)">${escapeHtml(r.notes)}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:4px">
              <button class="btn btn-sm btn-primary" onclick="ownerRespondVacationRequest(${r.id}, true)">${t('common.accept')}</button>
              <button class="btn btn-sm" onclick="ownerRespondVacationRequest(${r.id}, false)">${t('common.reject')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>`);
  }
  const longShifts = getLongShiftWarnings().filter(x => (x.employee.area||'cocina')===currentArea());
  if(longShifts.length){
    parts.push(`
      <div class="card owner-strict" style="margin-bottom:10px;border:1px solid var(--red);background:var(--red-l)">
        <h4 style="margin-bottom:6px"><i class="ti ti-alert-triangle"></i> ${t('hr.descanso.longShiftTitle')}</h4>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${longShifts.map(x => `<div style="font-size:13px">${escapeHtml(x.employee.name)} — ${x.horas.toFixed(1)}h ${t('hr.descanso.seguidas')}</div>`).join('')}
        </div>
      </div>`);
  }
  const wk = currentWeekKey();
  // Solo los check-ins de esta área: cocina y sala son equipos distintos,
  // y mezclar su ánimo en una sola media no dice nada útil de ninguno de
  // los dos — antes se veía la del negocio entero en las dos pestañas.
  const moodThisWeek = (DB.moodCheckins||[]).filter(c => c.weekKey===wk).filter(c => {
    const emp = DB.employees.find(e => e.id===c.employeeId);
    return (emp && (emp.area||'cocina')) === currentArea();
  });
  if(moodThisWeek.length){
    const avg = moodThisWeek.reduce((s,c)=>s+c.value,0) / moodThisWeek.length;
    const faces = ['😞','🙁','😐','🙂','😄'];
    parts.push(`
      <div class="card owner-strict" style="margin-bottom:10px">
        <h4 style="margin-bottom:4px"><i class="ti ti-mood-smile"></i> ${t('hr.moodPulse.title')}</h4>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:28px">${faces[Math.round(avg)-1]||'😐'}</span>
          <span style="font-size:13px;color:var(--muted)">${t('hr.moodPulse.desc').replace('${n}', moodThisWeek.length).replace('${avg}', avg.toFixed(1))}</span>
        </div>
      </div>`);
  }
  return parts.join('');
}

// Antigüedad en texto legible (días/meses/años) — sustituye a las antiguas
// estrellas, que se confundían con una valoración de desempeño.
function formatTenureText(fechaAlta){
  if(!fechaAlta) return null;
  const days = Math.floor((Date.now() - new Date(fechaAlta+'T00:00:00')) / 86400000);
  if(days < 0) return null;
  if(days < 30) return t('hr.tenure.days').replace('${n}', days);
  const months = Math.floor(days / 30.44);
  if(months < 12) return t('hr.tenure.months').replace('${n}', months);
  const years = Math.floor(days / 365.25);
  return t('hr.tenure.years').replace('${n}', years);
}

function renderHorariosPersonal(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;
  const allEmps = areaEmployees();
  // Un empleado que entró con su propio usuario (Acceso Empleados) solo ve
  // su propia tarjeta aquí, no la de sus compañeros — antes veía a todo el
  // equipo del área igual que el dueño, y solo el PIN por tarjeta impedía
  // tocar la de otro, pero ni siquiera debería poder verla. El dueño (y
  // cualquier dispositivo sin una sesión de empleado concreta) sigue viendo
  // a todo el equipo, que es quien necesita gestionarlo.
  const myEmployeeId = loggedInEmployeeId();
  const visibleEmps = myEmployeeId != null ? allEmps.filter(e => e.id === myEmployeeId) : allEmps;
  const emps = personalSearch ? visibleEmps.filter(e => e.name.toLowerCase().includes(personalSearch) || (e.rol||'').toLowerCase().includes(personalSearch)) : visibleEmps;
  // El dueño ya se identificó a nivel de sesión al entrar: no tiene sentido
  // volver a pedirle el PIN del empleado (o del negocio) solo para abrir su
  // ficha de fichaje/horas, y la tarjeta debe dejar claro que está viendo la
  // ficha de gestión, no un kiosko de fichar como el que ve el propio
  // empleado.
  const isOwnerSession = (getAccessSession()||{}).type === 'owner';
  const isSala = currentArea()==='sala';

  // En Sala, las ventas quedan atribuidas a un camarero concreto: usamos eso
  // para un podio de ventas del mes (fomenta competitividad sana entre el
  // equipo), con ticket medio incluido.
  let monthSales = null;
  if(isSala){
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const salesThisMonth = activeSales().filter(s => s.date >= monthStart && s.camareroId);
    const byWaiter = {};
    salesThisMonth.forEach(s => {
      const id = String(s.camareroId);
      if(!byWaiter[id]) byWaiter[id] = {total:0, count:0};
      byWaiter[id].total += parseFloat(s.total)||0;
      byWaiter[id].count += 1;
    });
    monthSales = byWaiter;
  }

  // Condecoración 🥇🥈🥉 para los 3 que más facturan este mes (solo entre
  // activos) — se recalcula sola día a día según van entrando ventas, y al
  // empezar el mes siguiente vuelve a partir de cero.
  let medalByEmpId = null;
  if(isSala){
    const medals = ['🥇','🥈','🥉'];
    // Sobre allEmps (todo el equipo), no sobre emps (lo que se ve en
    // pantalla) — si no, la vista de un solo empleado (la suya propia) le
    // pondría siempre 🥇 sea cual sea su facturación real.
    const ranked = allEmps.filter(e => e.active !== false)
      .map(e => ({id: e.id, total: (monthSales[String(e.id)]||{total:0}).total}))
      .filter(r => r.total > 0)
      .sort((a,b) => b.total - a.total)
      .slice(0, 3);
    medalByEmpId = {};
    ranked.forEach((r,i) => { medalByEmpId[String(r.id)] = medals[i]; });
  }

  const cardHtml = e => {
    const open = getOpenFichaje(e.id);
    const isInactive = e.active === false;
    const tenureText = formatTenureText(e.fechaAlta);
    const w = monthSales ? (monthSales[String(e.id)] || {total:0, count:0}) : null;
    const medal = medalByEmpId ? medalByEmpId[String(e.id)] : null;
    const unreadMsgs = isOwnerSession ? directChatUnreadCount(e.id, true) : 0;
    return `
    <div class="card" style="cursor:pointer${isInactive?';opacity:.6':''}" onclick="openEmployeePersonalCard(${e.id})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="width:14px;height:14px;border-radius:50%;background:${e.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
        <div style="min-width:0;flex:1">
          <strong style="display:block;overflow:visible;text-overflow:clip;white-space:normal">${escapeHtml(e.name)} ${medal?`<span title="${t('hr.podium.title')}">${medal}</span>`:''}</strong>
          <div style="font-size:12px;color:var(--muted)">${escapeHtml(e.rol||t('label.noRole'))}${tenureText?` · ${tenureText}`:''}</div>
        </div>
        ${unreadMsgs ? `<span class="badge badge-red" style="white-space:nowrap"><i class="ti ti-message"></i> ${unreadMsgs}</span>` : ''}
        ${isInactive ? `<span class="badge badge-gray" style="white-space:nowrap">${t('label.inactive')}</span>` : open ? `<span class="badge badge-green" style="white-space:nowrap"><i class="ti ti-clock-play"></i> ${t('hr2.checkedIn')}</span>` : ''}
      </div>
      ${w ? `
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:10px;font-size:12.5px;color:var(--muted)">
        <span style="white-space:nowrap">${t('hr.podium.sales')}: <strong style="color:var(--text);white-space:nowrap">${fmtMoney(w.total)}</strong></span>
        <span style="white-space:nowrap">${t('label.avgTicket')}: <strong style="color:var(--text);white-space:nowrap">${fmtMoney(w.count?w.total/w.count:0)}</strong></span>
      </div>` : ''}
      <div style="text-align:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:#fff;background:${isOwnerSession?'var(--teal)':'var(--brand-orange)'};padding:4px 10px;border-radius:999px;white-space:nowrap"><i class="ti ${isOwnerSession?'ti-id-badge-2':'ti-click'}"></i> ${isOwnerSession?t('label.viewEmployeeFile'):t('label.clickToClockIn')}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px" onclick="event.stopPropagation()">
        <div class="actions-cell">
          <button class="btn btn-sm btn-icon" title="${t('btn.messages')}" onclick="openEmployeeDirectChat(${e.id}, ${isOwnerSession})"><i class="ti ti-message"></i></button>
          <button class="btn btn-sm btn-icon" title="${t('title.workDistribution')}" onclick="navigate('distribucion');openDistEmployee(${e.id})"><i class="ti ti-clipboard-list"></i></button>
          ${isOwnerSession ? `
          ${e.phone ? `<a class="btn btn-sm btn-icon" href="https://wa.me/${escapeJsAttr(e.phone.replace(/[^\d+]/g,''))}" target="_blank" rel="noopener" title="Enviar WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
          ${e.email ? `<a class="btn btn-sm btn-icon" href="mailto:${escapeJsAttr(e.email)}" title="${t('title.sendEmail')}"><i class="ti ti-mail"></i></a>` : ''}
          ` : ''}
          <button class="owner-strict btn btn-sm btn-icon" onclick="openEmployeeModal(${e.id})"><i class="ti ti-edit"></i></button>
          <button class="owner-strict btn btn-sm btn-icon" title="${t('title.employeeSchedule')}" onclick="openEmployeeScheduleChooser(${e.id})"><i class="ti ti-calendar"></i></button>
          <button class="owner-strict btn btn-sm btn-icon btn-danger" onclick="deleteEmployee(${e.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
  `;};

  const listHtml = `<div class="grid grid-personal">${emps.map(cardHtml).join('')}</div>`;

  box.innerHTML = `
    ${renderTeamPulseHtml()}
    ${myEmployeeId == null ? `
    <div class="toolbar">
      <div class="left">
        <input type="text" class="search-input" value="${escapeHtml(personalSearch)}" placeholder="${t('ph.searchEmployee')}" oninput="setPersonalSearch(this.value)">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="owner-strict btn" onclick="openPersonalLogModal()"><i class="ti ti-history"></i> ${t('title.personalLog')}</button>
        <button class="owner-strict btn btn-primary" onclick="openEmployeeModal()"><i class="ti ti-plus"></i> ${t('btn.addEmployee')}</button>
      </div>
    </div>
    ` : ''}
    ${emps.length ? listHtml : `<div class="empty"><i class="ti ${allEmps.length?'ti-search-off':'ti-users'}"></i>${allEmps.length?t('common.noResults'):t("empty.employees")}</div>`}
  `;
}

// El horario fijo es un patrón que se repite CADA SEMANA para siempre —
// Vacaciones y Baja no tienen sentido ahí (nadie está de vacaciones todos
// los lunes, para siempre): esos dos se siguen poniendo como excepción de
// un día concreto, no como parte del patrón general.
const HORARIO_FIJO_TIPOS = ['M','T','P','C','D'];
function horarioFijoDiaRowHtml(i, dia){
  const tipoOptions = HORARIO_FIJO_TIPOS.map(k => `<option value="${k}"${k===dia.tipo?' selected':''}>${k} - ${SHIFT_TYPES[k].label}</option>`).join('');
  const noHorario = dia.tipo === 'D';
  const isPartido = dia.tipo === 'P';
  return `
    <div class="field-row" style="align-items:flex-end;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:10px">
      <div class="field" style="flex:0 0 90px">
        <label>${t('common.day')}</label>
        <div style="font-weight:700;padding:11px 0">${WEEK_DAYS[i]}</div>
      </div>
      <div class="field" style="flex:1;min-width:140px">
        <label>${t('hr2.shiftType')}</label>
        <select id="hf-tipo-${i}" onchange="horarioFijoTipoChanged(${i})">${tipoOptions}</select>
      </div>
      <div class="field" id="hf-horas-${i}" style="display:${noHorario?'none':'flex'};gap:8px;flex:2;min-width:220px">
        <div style="flex:1">
          <label>${t('hr2.clockIn')}</label>
          <input type="time" id="hf-entrada-${i}" value="${dia.entrada||'09:00'}">
        </div>
        <div style="flex:1">
          <label>${t('hr2.clockOut')}</label>
          <input type="time" id="hf-salida-${i}" value="${dia.salida||'17:00'}">
        </div>
        <div id="hf-partido-${i}" style="display:${isPartido?'flex':'none'};gap:8px;flex:2">
          <div style="flex:1">
            <label>${t('hr2.entryAfternoon')}</label>
            <input type="time" id="hf-entrada2-${i}" value="${dia.entrada2||'16:00'}">
          </div>
          <div style="flex:1">
            <label>${t('hr2.exitAfternoon')}</label>
            <input type="time" id="hf-salida2-${i}" value="${dia.salida2||'23:00'}">
          </div>
        </div>
      </div>
    </div>`;
}
function horarioFijoTipoChanged(i){
  const tipo = document.getElementById(`hf-tipo-${i}`).value;
  const noHorario = tipo === 'D';
  const isPartido = tipo === 'P';
  document.getElementById(`hf-horas-${i}`).style.display = noHorario ? 'none' : 'flex';
  document.getElementById(`hf-partido-${i}`).style.display = isPartido ? 'flex' : 'none';
}

// El patrón por defecto de un empleado nuevo se deja TODO en descanso: no
// se inventa un horario -de lunes a viernes, por ejemplo- que quizás no
// tenga nada que ver con lo que de verdad trabaja.
// Punto de entrada único, desde la propia tarjeta del empleado, a las tres
// formas de tener turnos: horario fijo para siempre, asignado por un
// periodo concreto, o sin nada asignado (se pone a mano en el Calendario
// cuando haga falta — no hace falta elegir nada para eso, solo cerrar).
function openEmployeeScheduleChooser(employeeId){
  const emp = DB.employees.find(e => e.id===employeeId);
  if(!emp) return;
  const hf = horarioFijoDe(employeeId);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-calendar"></i> ${escapeHtml(emp.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="muted" style="margin-bottom:14px">${hf ? t('msg.employeeHasFixedSchedule') : t('msg.employeeNoFixedSchedule')}</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" style="justify-content:flex-start;align-items:flex-start;text-align:left;height:auto;padding:14px;gap:12px" onclick="closeModal();openHorarioFijoModal(${employeeId})">
        <i class="ti ti-repeat" style="font-size:20px"></i>
        <span><strong>${t('title.fixedSchedule')}</strong><br><span style="font-weight:400;font-size:12.5px;color:var(--muted)">${t('hr2.chooserFixedDesc')}</span></span>
      </button>
      <button class="btn" style="justify-content:flex-start;align-items:flex-start;text-align:left;height:auto;padding:14px;gap:12px" onclick="closeModal();openBulkTurnoModal(${employeeId})">
        <i class="ti ti-calendar-plus" style="font-size:20px"></i>
        <span><strong>${t('title.assignShiftsByPeriod')}</strong><br><span style="font-weight:400;font-size:12.5px;color:var(--muted)">${t('hr2.chooserPeriodDesc')}</span></span>
      </button>
      <button class="btn" style="justify-content:flex-start;align-items:flex-start;text-align:left;height:auto;padding:14px;gap:12px" onclick="closeModal();setHorariosTab('calendario')">
        <i class="ti ti-calendar-event" style="font-size:20px"></i>
        <span><strong>${t('hr2.chooserNoneTitle')}</strong><br><span style="font-weight:400;font-size:12.5px;color:var(--muted)">${t('hr2.chooserNoneDesc')}</span></span>
      </button>
    </div>
  `);
}

function horarioFijoPatronVacio(){
  return Array.from({length:7}, () => ({tipo:'D', entrada:'', salida:'', entrada2:'', salida2:''}));
}
function openHorarioFijoModal(employeeId){
  // Solo empleados de ESTA área: cocina y sala son equipos separados, y un
  // desplegable que mezcla los dos deja asignar sin querer un horario fijo
  // de sala a alguien de cocina (o al revés) con un solo clic.
  const emps = areaEmployees();
  if(!emps.length){ showToast(t('msg.addEmployeesFirst')); return; }
  const empId = employeeId || emps[0].id;
  const empOptions = emps.map(e => `<option value="${e.id}"${e.id===empId?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const hf = horarioFijoDe(empId);
  const patron = hf ? hf.patron : horarioFijoPatronVacio();

  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-repeat"></i> ${t('title.fixedSchedule')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="muted" style="margin-bottom:12px">${t('hr2.fixedScheduleExplain')}</p>
    <div class="field">
      <label>${t('th.employee')}</label>
      <select id="hf-employee" onchange="openHorarioFijoModal(parseInt(this.value))">${empOptions}</select>
    </div>
    <div id="hf-dias" style="margin-top:12px">
      ${patron.map((dia,i) => horarioFijoDiaRowHtml(i, dia)).join('')}
    </div>
    <div class="modal-footer">
      ${hf ? `<button class="btn btn-danger" onclick="quitarHorarioFijo(${empId})">${t('btn.removeFixedSchedule')}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveHorarioFijo(${empId})">${t("common.save")}</button>
    </div>
  `);
}

async function saveHorarioFijo(employeeId){
  if(!isOwnerSession() && !editUnlocked) return;
  const patron = Array.from({length:7}, (_,i) => {
    const tipo = document.getElementById(`hf-tipo-${i}`).value;
    const noHorario = ['D','V','B'].includes(tipo);
    const isPartido = tipo === 'P';
    return {
      tipo,
      entrada: noHorario ? '' : document.getElementById(`hf-entrada-${i}`).value,
      salida: noHorario ? '' : document.getElementById(`hf-salida-${i}`).value,
      entrada2: isPartido ? document.getElementById(`hf-entrada2-${i}`).value : '',
      salida2: isPartido ? document.getElementById(`hf-salida2-${i}`).value : '',
    };
  });
  if(!DB.horariosFijos) DB.horariosFijos = [];
  let hf = DB.horariosFijos.find(h => h.employeeId===employeeId);
  // El patrón cambia "desde hoy hacia delante, para siempre" — nunca toca
  // el pasado. Se borran únicamente los turnos FUTUROS que todavía llevaban
  // la marca del horario fijo (origen:'fijo'): un día que el hostelero ya
  // había tocado a mano se queda exactamente como estaba, ver saveTurno.
  const hoy = todayStr();
  DB.turnos = (DB.turnos||[]).filter(x => !(x.employeeId===employeeId && x.fecha>=hoy && x.origen==='fijo'));
  if(hf){
    hf.patron = patron;
    hf.activo = true;
    hf.generadoHasta = addDaysStr(hoy, -1); // fuerza a regenerar desde hoy con el patrón nuevo
  } else {
    hf = {id: genId(), employeeId, patron, activo: true, generadoHasta: addDaysStr(hoy, -1)};
    DB.horariosFijos.push(hf);
  }
  generarTurnosFijos();
  const emp = DB.employees.find(e=>e.id===employeeId);
  logPersonalEvent('fixedScheduleSet', {name: emp?emp.name:'?'});
  closeModal();
  renderHorariosTab();
  showToast(t('msg.fixedScheduleSaved'));
}

async function quitarHorarioFijo(employeeId){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmRemoveFixedSchedule')))) return;
  DB.horariosFijos = (DB.horariosFijos||[]).filter(h => h.employeeId!==employeeId);
  // Los turnos futuros ya generados se quedan tal cual (no se borran solos):
  // quitar el horario fijo detiene la generación de MÁS turnos por delante,
  // no borra lo que ya estaba puesto.
  const emp = DB.employees.find(e=>e.id===employeeId);
  logPersonalEvent('fixedScheduleRemoved', {name: emp?emp.name:'?'});
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(t('msg.fixedScheduleRemoved'));
}

function openBulkTurnoModal(employeeId){
  // Igual que en openHorarioFijoModal: solo empleados de esta área.
  const emps = areaEmployees();
  if(!emps.length){ showToast(t('msg.addEmployeesFirst')); return; }
  const empOptions = emps.map(e => `<option value="${e.id}"${e.id===(employeeId||emps[0].id)?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const today = new Date();
  const end = new Date(today); end.setDate(today.getDate()+6);

  openModal(`
    <div class="modal-header">
      <h3>${t('title.assignShiftsByPeriod')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('th.employee')}</label>
      <select id="bulk-employee" onchange="renderBulkCalendar()">${empOptions}</select>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.from')}</label>
        <input type="date" id="bulk-desde" value="${dateStr(today)}" onchange="renderBulkCalendar()">
      </div>
      <div class="field">
        <label>${t('label.to')}</label>
        <input type="date" id="bulk-hasta" value="${dateStr(end)}" onchange="renderBulkCalendar()">
      </div>
    </div>
    <div class="field">
      <label>${t('label.scheduleForEachDay')}</label>
      <div id="bulk-calendar"></div>
    </div>
    <div class="field">
      <label>${t('label.notesAppliedToAllDays')}</label>
      <input type="text" id="bulk-notas" placeholder="${t('ph.notesForAllShifts')}">
    </div>
    <p style="font-size:12px;color:var(--muted)">${t('msg.existingShiftReplaced')}</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="applyBulkTurno()">${t('common.apply')}</button>
    </div>
  `);
  renderBulkCalendar();
}

function bulkTipoOptions(selected){
  return ['M','T','P','C'].map(k => `<option value="${k}"${k===selected?' selected':''}>${k} - ${SHIFT_TYPES[k].label}</option>`).join('');
}

function renderBulkCalendar(){
  const box = document.getElementById('bulk-calendar');
  if(!box) return;
  const desde = document.getElementById('bulk-desde').value;
  const hasta = document.getElementById('bulk-hasta').value;
  const employeeId = parseInt(document.getElementById('bulk-employee').value);
  if(!desde || !hasta || desde > hasta){
    box.innerHTML = `<p style="font-size:12px;color:var(--muted)">${t('label.validPeriod')}</p>`;
    return;
  }

  let html = '';
  const cursor = new Date(desde + 'T00:00:00');
  const end = new Date(hasta + 'T00:00:00');
  let guard = 0;
  while(cursor <= end && guard < 62){
    const ds = dateStr(cursor);
    const dow = (cursor.getDay()+6)%7;
    const existing = (DB.turnos||[]).find(x => x.employeeId===employeeId && x.fecha===ds);
    const isFestivo = !!existing && existing.tipo === 'D';
    const isPartido = !!existing && existing.tipo === 'P';
    const tipo = (existing && !isFestivo && !isPartido) ? existing.tipo : 'M';
    const entrada = existing?.entrada || '09:00';
    const salida = existing?.salida || '17:00';
    const entrada2 = existing?.entrada2 || '17:00';
    const salida2 = existing?.salida2 || '21:00';

    html += `
      <div class="card bulk-day-card" data-date="${ds}" style="margin-bottom:8px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <strong>${weekDayFull(dow)} ${cursor.getDate()}/${cursor.getMonth()+1}</strong>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" class="bulk-day-festivo" ${isFestivo?'checked':''} onchange="toggleBulkDayFields(this)"> ${t('label.holiday')}</label>
        </div>
        <div class="bulk-day-fields" style="${isFestivo?'display:none':''}">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;margin-bottom:6px"><input type="checkbox" class="bulk-day-partido" ${isPartido?'checked':''} onchange="toggleBulkDayFields(this)"> ${t('label.splitShift2Legs')}</label>
          <div class="field-row bulk-day-seguido" style="${isPartido?'display:none':''}">
            <select class="bulk-day-tipo">${bulkTipoOptions(tipo)}</select>
            <input type="time" class="bulk-day-entrada" value="${entrada}">
            <input type="time" class="bulk-day-salida" value="${salida}">
          </div>
          <div class="field-row bulk-day-partido-fields" style="${isPartido?'':'display:none'}">
            <input type="time" class="bulk-day-entrada1" value="${entrada}">
            <input type="time" class="bulk-day-salida1" value="${salida}">
            <input type="time" class="bulk-day-entrada2" value="${entrada2}">
            <input type="time" class="bulk-day-salida2" value="${salida2}">
          </div>
        </div>
      </div>
    `;
    cursor.setDate(cursor.getDate()+1);
    guard++;
  }
  box.innerHTML = html;
}

function toggleBulkDayFields(el){
  const card = el.closest('.bulk-day-card');
  const festivo = card.querySelector('.bulk-day-festivo').checked;
  const partido = card.querySelector('.bulk-day-partido').checked;
  card.querySelector('.bulk-day-fields').style.display = festivo ? 'none' : '';
  card.querySelector('.bulk-day-seguido').style.display = partido ? 'none' : '';
  card.querySelector('.bulk-day-partido-fields').style.display = partido ? '' : 'none';
}

function applyBulkTurno(){
  const employeeId = parseInt(document.getElementById('bulk-employee').value);
  const notas = document.getElementById('bulk-notas').value.trim();
  const cards = document.querySelectorAll('.bulk-day-card');
  if(!cards.length){ showToast(t('msg.checkDates')); return; }

  if(!DB.turnos) DB.turnos = [];
  let count = 0;
  cards.forEach(card => {
    const ds = card.dataset.date;
    const festivo = card.querySelector('.bulk-day-festivo').checked;
    const partido = card.querySelector('.bulk-day-partido').checked;
    let data;
    if(festivo){
      data = {tipo:'D', entrada:'', salida:'', entrada2:'', salida2:'', notas};
    } else if(partido){
      data = {
        tipo:'P',
        entrada: card.querySelector('.bulk-day-entrada1').value,
        salida: card.querySelector('.bulk-day-salida1').value,
        entrada2: card.querySelector('.bulk-day-entrada2').value,
        salida2: card.querySelector('.bulk-day-salida2').value,
        notas
      };
    } else {
      data = {
        tipo: card.querySelector('.bulk-day-tipo').value,
        entrada: card.querySelector('.bulk-day-entrada').value,
        salida: card.querySelector('.bulk-day-salida').value,
        entrada2: '', salida2: '',
        notas
      };
    }
    const existing = DB.turnos.find(x => x.employeeId===employeeId && x.fecha===ds);
    if(existing){ delete existing.origen; Object.assign(existing, data); } // suelta el día del horario fijo, ver saveTurno
    else DB.turnos.push({id: genId(), employeeId, fecha: ds, ...data});
    count++;
  });
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(count===1 ? t('hr2.oneShiftAssigned') : t('hr2.nShiftsAssigned').replace('${n}', count));
}

// Paleta amplia a propósito (para poder distinguir a golpe de vista a
// muchos empleados a la vez, sin tener que abrir el selector de color
// nativo cada vez) — cubre toda la rueda de color con tonos bien
// diferenciados entre sí, no solo unos pocos básicos.
const EMPLOYEE_COLOR_CHOICES = [
  '#E74C3C','#C0392B','#DF7039','#E67E22','#F39C12','#F1C40F','#D4AC0D',
  '#2ECC71','#27AE60','#1ABC9C','#16A085','#00B8A9','#3498DB','#2980B9',
  '#5DADE2','#2E86C1','#5B6DCD','#6C5CE7','#8E44AD','#9B59B6','#AF7AC5',
  '#E056A0','#EC7063','#C2185B','#795548','#6D4C41','#546E7A','#34495E',
  '#95A5A6','#7F8C8D',
];
function openEmployeeModal(id){
  const e = id ? DB.employees.find(x => x.id===id) : {name:'', rol:'', color:'#DF7039', area: currentArea()};
  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editEmployee') : t('title.newEmployee')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="emp-name" value="${escapeHtml(e.name)}" placeholder="${t('ph.employeeName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.role')}</label>
        <input type="text" id="emp-rol" value="${escapeHtml(e.rol||'')}" placeholder="${t('ph.roleExample')}">
      </div>
      <div class="field">
        <label>${t('label.identifyingColor')}</label>
        <input type="color" id="emp-color" value="${e.color||'#DF7039'}" style="height:40px;padding:4px">
        <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin-top:8px">
          ${EMPLOYEE_COLOR_CHOICES.map(c => `<span onclick="document.getElementById('emp-color').value='${c}'" title="${c}" style="width:100%;aspect-ratio:1;border-radius:50%;background:${c};cursor:pointer;border:1px solid rgba(0,0,0,.15);display:inline-block"></span>`).join('')}
        </div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.phone')}</label>
        <input type="tel" id="emp-phone" value="${escapeHtml(e.phone||'')}" placeholder="${t('ph.egPhone')}">
      </div>
      <div class="field">
        <label>${t('common.email')}</label>
        <input type="email" id="emp-email" value="${escapeHtml(e.email||'')}" placeholder="ejemplo@correo.com">
      </div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin:-4px 0 6px">${t('msg.forCommentsOrDocs')}</p>
    <div class="field owner-strict">
      <label>${t('label.vacationDaysPerYear')}</label>
      <input type="number" id="emp-vacation-days" min="0" step="1" placeholder="${t('ph.notSet')}" value="${e.vacationDaysPerYear!=null?e.vacationDaysPerYear:''}">
      <p style="font-size:12px;color:var(--muted);margin:6px 0 0">${t('msg.vacationDaysPerYearHelp')}</p>
    </div>
    ${id ? `
    <label class="owner-strict" style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:4px;cursor:pointer">
      <input type="checkbox" id="emp-active" ${e.active!==false?'checked':''} style="width:auto">
      ${t('label.employeeActive').replace('${area}', (e.area||currentArea())==='sala' ? t('folder.sala.title') : t('folder.cocina.title'))}
    </label>
    <p class="owner-strict" style="font-size:12px;color:var(--muted);margin:0 0 14px">${t('msg.employeeActiveDesc')}</p>` : ''}
    <label class="owner-strict" style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:14px;cursor:pointer">
      <input type="checkbox" id="emp-can-edit" ${e.canUnlockEdit?'checked':''} style="width:auto">
      ${t('label.canUnlockEditMode').replace('${area}', (e.area||currentArea())==='sala' ? t('folder.sala.title') : t('folder.cocina.title'))}
    </label>
    <p class="owner-strict" style="font-size:12px;color:var(--muted);margin:-10px 0 6px">${t('msg.canUnlockEditModeDesc')}</p>
    ${(e.area||currentArea())==='sala' ? `
    <label class="owner-strict" style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:4px;cursor:pointer">
      <input type="checkbox" id="emp-es-repartidor" ${e.esRepartidor?'checked':''} style="width:auto">
      ${t('label.isDeliveryRider')}
    </label>
    <p class="owner-strict" style="font-size:12px;color:var(--muted);margin:0 0 14px">${t('msg.isDeliveryRiderDesc')}</p>` : ''}
    ${id ? `
    <div class="field owner-strict">
      <label>${t('label.clockInPin')}</label>
      <p style="font-size:13px;color:var(--muted);margin:0 0 6px">${e.pinChanged ? t('msg.employeeSetOwnPin') : t('msg.defaultPinExplainer')}</p>
      <button class="btn btn-sm" onclick="resetEmployeePin(${id})"><i class="ti ti-key"></i> ${t('btn.resetPinTo1234')}</button>
    </div>` : ''}
    <div class="modal-footer">
      ${id ? `<button class="owner-strict btn btn-danger" onclick="deleteEmployee(${id})">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveEmployee(${id||'null'})">${t("common.save")}</button>
    </div>
  `);
}

async function resetEmployeePin(id){
  // El botón ya está oculto a quien no sea propietario (.owner-strict), pero
  // eso solo esconde el botón — esta comprobación es la que de verdad impide
  // que se llame desde la consola sin ser el propietario.
  if(!isOwnerSession()) return;
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
  // Ya sabemos que es el propietario, así que no hace falta pedir otro PIN
  // — pero sí una confirmación explícita, porque deja el PIN de esa persona
  // en el valor por defecto (1234) hasta que vuelva a cambiarlo.
  if(!(await confirmModal(t('msg.confirmResetEmployeePin').replace('${name}', e.name)))) return;
  e.pin = hashPin('1234', codigoNegocioParaPin());
  e.pinChanged = false;
  logPersonalEvent('pinReset', {name: e.name});
  saveDB();
  showToast(t('msg.pinResetDone'));
  openEmployeeModal(id);
}

function saveEmployee(id){
  // El botón "Añadir/Editar empleado" ya está oculto a quien no sea
  // propietario (.owner-strict), pero eso solo esconde el botón — esta
  // comprobación es la que de verdad impide dar de alta un empleado o
  // tocar canUnlockEdit (acceso a costes/márgenes) llamando a la función
  // directamente sin ser el propietario.
  //
  // ⚠️ Y tiene que DECIRLO. Hacía `return` a secas: el jefe de cocina, que
  // sí tiene permiso de edición de su área, llegaba al formulario, rellenaba,
  // pulsaba Guardar y no pasaba nada — ni se cerraba la ventana ni le decían
  // por qué. Lo contó el dueño como "entro como cocinero con edición y no me
  // deja editar los empleados": no era que no le dejara, era que no se lo
  // explicaba. Un permiso que se niega en silencio se lee como una app rota.
  if(!isOwnerSession()){ showToast(t('msg.staffOwnerOnly'), 5000); return; }
  const name = document.getElementById('emp-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const rol = document.getElementById('emp-rol').value.trim();
  const color = document.getElementById('emp-color').value;
  const phone = document.getElementById('emp-phone').value.trim();
  const email = document.getElementById('emp-email').value.trim();
  const canUnlockEdit = document.getElementById('emp-can-edit').checked;
  const empActiveEl = document.getElementById('emp-active');
  const esRepartidorEl = document.getElementById('emp-es-repartidor');
  const esRepartidor = esRepartidorEl ? esRepartidorEl.checked : false;
  const vacDaysEl = document.getElementById('emp-vacation-days');
  const vacationDaysPerYear = vacDaysEl && vacDaysEl.value!=='' ? Math.max(0, parseInt(vacDaysEl.value,10)||0) : null;
  if(id){
    const emp = DB.employees.find(e => e.id===id);
    if(!emp) return;
    // El área no se pregunta: se conserva la del empleado (o la actual si no tenía).
    const eraRepartidor = emp.esRepartidor;
    Object.assign(emp, {name, rol, color, phone, email, canUnlockEdit, esRepartidor, vacationDaysPerYear, area: emp.area||currentArea()});
    if(empActiveEl) emp.active = empActiveEl.checked;
    // Si deja de repartir con pedidos ya asignados, esos pedidos se quedaban
    // "en camino" apuntando a alguien que ya no reparte — autoAssignRepartidor
    // solo se dispara al crear el pedido, nunca al cambiar la plantilla.
    if(eraRepartidor && !esRepartidor) liberarPedidosDeRepartidor(id);
  } else {
    // Nuevo empleado: se asigna automáticamente al área desde la que se crea, siempre activo.
    DB.employees.push({id: genId(), name, rol, color, phone, email, canUnlockEdit, esRepartidor, vacationDaysPerYear, area: currentArea(), pin:hashPin('1234', codigoNegocioParaPin()), pinChanged:false, active:true, fechaAlta: todayStr()});
    logAudit('create', t('audit.createdEmployee').replace('${name}', name));
  }
  saveDB();
  closeModal();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-horarios') renderHorarios();
  else if(active && active.id === 'view-distribucion') renderDistribucion();
  showToast(t('msg.employeeSaved'));
}

// Eliminar a un empleado revoca su acceso de inmediato: al desaparecer de
// DB.employees, ya no puede fichar (desaparece del selector de la pantalla
// de "fichar para entrar") ni desbloquear nada con su PIN. Es irreversible
// (se pierden sus turnos/fichajes) y deja huecos en pedidos/tareas
// asignadas, así que se protege con el PIN del negocio.
function deleteEmployee(id){
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
  requestBusinessPinAction(t('title.deleteEmployee'), t('msg.confirmDeleteEmployee'), (pin) => reallyDeleteEmployee(id, pin));
}
function reallyDeleteEmployee(id, pin){
  // Comprobación real del PIN dentro de la función (no solo en el modal
  // que la llama), para que no se pueda borrar un empleado llamando esta
  // función directamente desde la consola sin conocer el PIN del negocio.
  if(!accionSensibleAutorizada(pin)) return;
  const e0 = DB.employees.find(e => e.id === id);
  if(e0){ moveToTrash('employee', e0); logAudit('delete', t('audit.deletedEmployee').replace('${name}', e0.name), 'critical'); }
  DB.employees = DB.employees.filter(e => e.id!==id);
  DB.turnos = (DB.turnos||[]).filter(t => t.employeeId!==id);
  DB.fichajes = (DB.fichajes||[]).filter(f => f.employeeId!==id);
  DB.horariosFijos = (DB.horariosFijos||[]).filter(h => h.employeeId!==id);
  liberarPedidosDeRepartidor(id);
  delete DB.shifts[id];
  delete DB.workDistribution[id];
  // Limpia referencias sueltas en otros módulos para que no quede un id
  // fantasma apuntando a un empleado que ya no existe.
  (DB.tpvOrders||[]).forEach(o => { if(o.camareroId===id) o.camareroId = null; });
  // Igual en las ventas YA CERRADAS: si no, una venta histórica se queda con
  // el id de un empleado que ya no existe — sin efecto visible hoy, pero un
  // informe futuro que recorra DB.sales directamente encontraría un dato
  // huérfano en vez de "sin asignar".
  (DB.sales||[]).forEach(s => { if(s.camareroId===id) s.camareroId = null; });
  (DB.limpieza && DB.limpieza.tareas||[]).forEach(t => { if(t.responsableId===id) t.responsableId = null; });
  if(DB.limpieza){
    Object.keys(DB.limpieza).forEach(key => {
      if(Array.isArray(DB.limpieza[key])){
        DB.limpieza[key].forEach(entry => { if(entry && entry.responsableId===id) entry.responsableId = null; });
      }
    });
  }
  (DB.promos||[]).forEach(p => { if(p.responsableId===id) p.responsableId = null; });
  // Peticiones de cambio de turno / vacaciones pendientes de este empleado
  // (como origen o como destino de un swap): si no se limpian, quedan
  // "Pendientes" para siempre con nombre "?" y, si alguien las aprobara,
  // reasignarían un turno real a un employeeId que ya no existe.
  DB.turnoSwapRequests = (DB.turnoSwapRequests||[]).filter(r => r.employeeId!==id && r.toEmployeeId!==id);
  DB.vacationRequests = (DB.vacationRequests||[]).filter(r => r.employeeId!==id);
  DB.pedidoSolicitudes = (DB.pedidoSolicitudes||[]).filter(r => r.employeeId!==id);
  saveDB();
  closeModal();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-horarios') renderHorarios();
  else if(active && active.id === 'view-distribucion') renderDistribucion();
  showToast(t('msg.employeeDeleted'));
}

/* ============================================================
   FICHAR — Control de horario de entrada/salida del personal
   ============================================================ */
function fmtHora(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function fmtDuracion(hours){
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2,'0')}m`;
}
function getOpenFichaje(employeeId){
  return (DB.fichajes||[]).find(f => f.employeeId===employeeId && !f.salida);
}
function fichajeHoras(f){
  if(!f.entrada) return 0;
  // Si el fichaje sigue abierto (sin salida), cuenta hasta ahora mismo, para
  // que las horas de esta semana/mes no ignoren un turno que está en curso.
  const salida = f.salida ? new Date(f.salida) : new Date();
  // Un reloj mal puesto o un fichaje manual manipulado puede dejar la salida
  // antes que la entrada: sin este suelo, esas horas negativas se sumaban
  // sin más al total semanal/mensual, pudiendo dar un total absurdamente
  // bajo (o negativo) sin ningún aviso.
  return Math.max(0, (salida - new Date(f.entrada)) / 3600000);
}
function employeeHoursInRange(employeeId, dates){
  return (DB.fichajes||[]).filter(f => f.employeeId===employeeId && dates.includes(f.fecha)).reduce((s,f) => s + fichajeHoras(f), 0);
}

// Descanso mínimo legal entre jornadas (12h) y máximo de horas seguidas sin
// descanso (9h) — igual que cualquier control de este tipo, es solo un
// aviso para que el propio negocio se proteja de una inspección de
// trabajo, no bloquea nada.
const DESCANSO_MIN_ENTRE_JORNADAS_H = 12;
const JORNADA_MAX_SEGUIDA_H = 9;
function checkDescansoWarning(employeeId){
  const fichajes = (DB.fichajes||[]).filter(f => f.employeeId===employeeId && f.salida).sort((a,b) => new Date(b.salida) - new Date(a.salida));
  if(!fichajes.length) return null;
  const lastSalida = new Date(fichajes[0].salida);
  const gapH = (Date.now() - lastSalida) / 3600000;
  if(gapH < DESCANSO_MIN_ENTRE_JORNADAS_H) return t('hr.descanso.tooShort').replace('${h}', gapH.toFixed(1)).replace('${min}', DESCANSO_MIN_ENTRE_JORNADAS_H);
  return null;
}
// Empleados con un fichaje ABIERTO ahora mismo que ya supera la jornada
// máxima seguida recomendada — para el aviso en Personal, sin esperar a
// que se cierre el turno para darse cuenta.
function getLongShiftWarnings(){
  return (DB.fichajes||[])
    .filter(f => !f.salida)
    .map(f => ({f, horas: fichajeHoras(f)}))
    .filter(x => x.horas >= JORNADA_MAX_SEGUIDA_H)
    .map(x => ({employee: DB.employees.find(e=>e.id===x.f.employeeId), horas: x.horas}))
    .filter(x => x.employee);
}
// El dueño ya se identificó al iniciar sesión: entra directo a la ficha,
// sin pedirle un PIN otra vez (ni el suyo propio ni el del empleado). Para
// cualquier otra sesión (empleado mirando la pestaña Personal) se mantiene
// el PIN por empleado, igual que para fichar — así cada uno solo ve sus
// propios datos salvo que conozca el PIN de otra persona o el del negocio.
// Con qué se autorizó el fichaje que se está a punto de hacer — para poder
// distinguir después "fichó la propia persona" de "alguien fichó por
// ella usando el PIN del negocio (o entrando como dueño)". Antes no quedaba
// ningún rastro de esto: cualquiera con el PIN de negocio podía fichar
// entrada/salida de otro empleado sin que constara quién lo hizo de verdad.
let personalFicharAuthMethod = 'self';
function openEmployeePersonalCard(employeeId){
  const session = getAccessSession();
  if((session||{}).type === 'owner'){
    personalFicharAuthMethod = 'owner_session';
    openEmployeeFicharModal(employeeId);
    return;
  }
  // Igual que en Distribución del Trabajo: un empleado abriendo SU PROPIA
  // ficha ya se identificó al entrar por Acceso Empleados, así que volver
  // a pedirle el PIN aquí era un paso de más. La de un compañero sí lo
  // sigue pidiendo.
  if((session||{}).type === 'employee' && session.employeeId === employeeId){
    // 'self', no un valor nuevo: es exactamente el mismo caso que teclear
    // su propio PIN (wasOwnPin=true en confirmEmployeePersonalPin) — ya
    // demostró ser él al entrar por Acceso Empleados. Con cualquier otro
    // valor, el aviso de "fichado por otra persona" (más abajo, donde se
    // compara contra 'self') saltaría sin sentido en su propio fichaje.
    personalFicharAuthMethod = 'self';
    // La encuesta semanal de clima solo se dispara hoy justo tras
    // confirmar el PIN (ver confirmEmployeePersonalPin) — sin repetir ese
    // paso aquí, un empleado que entra directo a su ficha dejaría de verla
    // nunca, precisamente el caso para el que existe.
    if(!hasAnsweredMoodThisWeek(employeeId)){ promptMoodCheckin(employeeId); return; }
    openEmployeeFicharModal(employeeId);
    return;
  }
  requestEmployeePersonalPin(employeeId);
}
let personalPendingPinEmployeeId = null;
function requestEmployeePersonalPin(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  personalPendingPinEmployeeId = employeeId;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.employeePersonalPinDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="personal-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmEmployeePersonalPin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmEmployeePersonalPin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('personal-pin-input')?.focus(), 50);
}
// Un PIN "coincide" si es el del propio empleado, o si es el PIN del negocio
// (el dueño siempre puede entrar aunque no sepa el PIN de cada empleado).
// Un empleado dado de baja (active===false) no puede ficharse NUNCA, ni
// siquiera con el PIN del negocio como atajo — dar de baja debe bloquear el
// acceso de verdad, no solo dejar de mostrarlo en los selectores.
function pinMatchesEmployeeOrBusiness(val, employee){
  if(employee.active === false) return false;
  const storedPin = employee.pin || '1234';
  // Con la sal del negocio, igual que el acceso de empleados: antes esta
  // comprobación iba sin sal y las dos rutas se contradecían.
  if(pinDeEmpleadoCoincide(val, storedPin, codigoNegocioParaPin())) return true;
  return pinDeNegocioCoincide(val);
}
function confirmEmployeePersonalPin(){
  const e = DB.employees.find(x=>x.id===personalPendingPinEmployeeId);
  if(!e) return;
  const val = document.getElementById('personal-pin-input').value;
  if(!pinMatchesEmployeeOrBusiness(val, e)){ showToast(t('msg.pinIncorrect')); return; }
  const storedPin = e.pin || '1234';
  const wasOwnPin = pinMatchesHash(val, storedPin);
  personalFicharAuthMethod = wasOwnPin ? 'self' : 'business_pin';
  if(!hasAnsweredMoodThisWeek(e.id)){ promptMoodCheckin(e.id); return; }
  openEmployeeFicharModal(e.id);
}

// Clave de la semana en curso (lunes de esa semana), para no preguntar el
// check-in de clima más de una vez por semana a la misma persona.
function currentWeekKey(){ return dateStr(getWeekDates(0)[0]); }
function hasAnsweredMoodThisWeek(employeeId){
  const wk = currentWeekKey();
  return (DB.moodCheckins||[]).some(c => c.employeeId===employeeId && c.weekKey===wk);
}
// Encuesta de clima semanal: un solo toque (1-5), totalmente opcional, para
// que el dueño pueda ver de un vistazo cómo está el equipo sin tener que
// preguntar uno a uno. No bloquea fichar ni ninguna otra acción.
function promptMoodCheckin(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const faces = ['😞','🙁','😐','🙂','😄'];
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-mood-smile"></i> ${t('mood.title')}</h3>
      <button class="modal-close" onclick="skipMoodCheckin(${employeeId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('mood.desc')}</p>
    <div style="display:flex;justify-content:space-between;gap:6px;margin:14px 0">
      ${faces.map((f,i) => `<button class="btn" style="flex:1;font-size:26px;padding:12px 0" onclick="submitMoodCheckin(${employeeId},${i+1})">${f}</button>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="skipMoodCheckin(${employeeId})">${t('common.later')}</button>
    </div>
  `);
}
function submitMoodCheckin(employeeId, value){
  DB.moodCheckins.push({id: genId(), employeeId, weekKey: currentWeekKey(), value, ts: new Date().toISOString()});
  saveDB();
  closeModal();
  showToast(t('mood.thanks'));
  openEmployeeFicharModal(employeeId);
}
function skipMoodCheckin(employeeId){
  closeModal();
  openEmployeeFicharModal(employeeId);
}
function openEmployeeFicharModal(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const open = getOpenFichaje(e.id);
  const weekDates = getWeekDates(0).map(d=>dateStr(d));
  const now = new Date();
  const monthDates = Array.from({length: new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}, (_,i) => dateStr(new Date(now.getFullYear(), now.getMonth(), i+1)));
  const horasSemana = employeeHoursInRange(e.id, weekDates);
  const horasMes = employeeHoursInRange(e.id, monthDates);
  // Ventas atendidas: solo tiene sentido para camareros/as de Sala, ya que
  // camareroId solo se asigna al abrir mesas/pedidos desde el TPV de Sala.
  const isSala = (e.area||'cocina') === 'sala';
  const ventasSemana = isSala ? camareroSalesInRange(e.id, weekDates) : null;
  const ventasMes = isSala ? camareroSalesInRange(e.id, monthDates) : null;
  // El dueño ve la ficha de gestión (horas, fichajes y chat, todo en solo
  // lectura salvo el mensaje), no el kiosko de autoservicio con el que el
  // propio empleado ficha y pide turnos/vacaciones — fichar por otra
  // persona sin su PIN no debería ser posible desde aquí. (Con el PIN del
  // negocio en vez del suyo propio SÍ se sigue pudiendo: es un atajo
  // distinto y deliberado para "se me olvidó mi PIN", no este caso.)
  const asOwner = personalFicharAuthMethod === 'owner_session';
  openModal(`
    <div class="modal-header">
      <h3><span style="width:12px;height:12px;border-radius:50%;background:${e.color||'#DF7039'};display:inline-block"></span> ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div style="text-align:center">
      ${open ? `<span class="badge badge-green"><i class="ti ti-clock-play"></i> ${t('hr2.checkedInSince').replace('${time}', fmtHora(open.entrada))}</span>` : `<span class="badge badge-gray">${t('hr2.offDuty')}</span>`}
      ${asOwner ? '' : `
      <div style="margin-top:10px;display:flex;gap:6px;justify-content:center">
        <button class="btn btn-sm btn-primary" ${open?'disabled':''} onclick="quickFichaje(${e.id}, 'entrada')"><i class="ti ti-login"></i> ${t('hr2.clockIn')}</button>
        <button class="btn btn-sm btn-danger" ${!open?'disabled':''} onclick="quickFichaje(${e.id}, 'salida')"><i class="ti ti-logout"></i> ${t('hr2.clockOut')}</button>
      </div>`}
      <div style="margin-top:8px;font-size:12px;color:var(--muted)">${t('hr2.hoursThisWeek')}: <strong>${fmtDuracion(horasSemana)}</strong></div>
      <div style="font-size:12px;color:var(--muted)">${t('hr2.hoursThisMonth')}: <strong>${fmtDuracion(horasMes)}</strong></div>
      ${isSala ? `
      <div style="margin-top:8px;font-size:12px;color:var(--muted)">${t('hr2.salesServedWeek')}: <strong>${ventasSemana.count}</strong> (${fmtMoney(ventasSemana.total)})</div>
      <div style="font-size:12px;color:var(--muted)">${t('hr2.salesServedMonth')}: <strong>${ventasMes.count}</strong> (${fmtMoney(ventasMes.total)})</div>
      ` : ''}
      <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="openFichajeHistoryModal(${e.id})"><i class="ti ti-history"></i> ${t('hr2.viewLastClockIns')}</button>
        ${asOwner ? '' : `
        <button class="btn btn-sm" onclick="openTurnoSwapRequestModal(${e.id})"><i class="ti ti-replace"></i> ${t('swap.requestBtn')}</button>
        <button class="btn btn-sm" onclick="openVacationRequestModal(${e.id})"><i class="ti ti-beach"></i> ${t('vacation.requestBtn')}</button>
        `}
      </div>
      ${asOwner ? '' : renderIncomingSwapRequestsHtml(e.id)}
      ${asOwner ? '' : renderMyVacationRequestsHtml(e.id)}
      ${asOwner ? '' : `
      <div class="field" style="margin-top:12px;text-align:left">
        <label>${t('handoff.label')}</label>
        <textarea id="handoff-note-input" rows="2" placeholder="${t('handoff.placeholder')}" onchange="saveShiftHandoffNote('${(e.area||'cocina')}', this.value)">${escapeHtml(getShiftHandoffNote(e.area||'cocina'))}</textarea>
      </div>
      `}
    </div>
  `);
}

// Peticiones de cambio de turno dirigidas a este empleado, esperando su
// respuesta (aceptar/rechazar) — se ven nada más entrar en su propia ficha
// de fichar, sin tener que ir a buscarlas a otro sitio.
function renderIncomingSwapRequestsHtml(employeeId){
  const pending = (DB.turnoSwapRequests||[]).filter(r => r.toEmployeeId===employeeId && r.status==='pending_peer');
  if(!pending.length) return '';
  return `
    <div class="card" style="margin-top:12px;text-align:left;border:1px solid var(--amber)">
      <h4 style="margin-bottom:6px;font-size:13px"><i class="ti ti-replace"></i> ${t('swap.incomingTitle')}</h4>
      ${pending.map(r => {
        const from = DB.employees.find(x=>x.id===r.fromEmployeeId);
        const turno = (DB.turnos||[]).find(x=>x.id===r.fromTurnoId);
        return `<div style="font-size:12.5px;margin-bottom:6px">
          ${t('swap.incomingLine').replace('${name}', escapeHtml(from?from.name:'?')).replace('${date}', escapeHtml(turno?turno.fecha:'?'))}
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="btn btn-sm btn-primary" onclick="respondTurnoSwapRequest(${r.id}, true)">${t('common.accept')}</button>
            <button class="btn btn-sm" onclick="respondTurnoSwapRequest(${r.id}, false)">${t('common.reject')}</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// Antelación mínima para pedir un cambio de turno: por debajo de esto ya
// no da tiempo real a que el compañero lo acepte Y el propietario lo
// confirme antes de que llegue el turno, así que ni se ofrece como opción
// (mejor evitarlo aquí que dejar una petición que nadie llega a resolver
// a tiempo). Se mide desde la medianoche del día del turno, el caso más
// exigente (un turno de mañana temprano), no desde la hora exacta de
// entrada — los turnos no siempre la tienen guardada.
const SWAP_MIN_NOTICE_HOURS = 24;
function turnoMeetsSwapNotice(fecha){
  return new Date(fecha+'T00:00:00') - new Date() >= SWAP_MIN_NOTICE_HOURS * 3600000;
}
function openTurnoSwapRequestModal(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const today = todayStr();
  const myTurnos = (DB.turnos||[]).filter(t2 => t2.employeeId===employeeId && t2.fecha >= today && turnoMeetsSwapNotice(t2.fecha)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const colleagues = DB.employees.filter(x => x.id!==employeeId && (x.area||'cocina')===(e.area||'cocina') && x.active!==false);
  if(!myTurnos.length){ showToast(t('swap.noUpcomingTurnos').replace('${h}', SWAP_MIN_NOTICE_HOURS)); return; }
  if(!colleagues.length){ showToast(t('swap.noColleagues')); return; }
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-replace"></i> ${t('swap.requestBtn')}</h3>
      <button class="modal-close" onclick="openEmployeeFicharModal(${employeeId})">&times;</button>
    </div>
    <div class="field">
      <label>${t('swap.pickTurnoLabel')}</label>
      <select id="swap-turno-sel">${myTurnos.map(t2 => `<option value="${t2.id}">${escapeHtml(t2.fecha)} — ${escapeHtml((SHIFT_TYPES[t2.tipo]||SHIFT_TYPES.C).label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>${t('swap.pickColleagueLabel')}</label>
      <select id="swap-colleague-sel">${colleagues.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openEmployeeFicharModal(${employeeId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="submitTurnoSwapRequest(${employeeId})">${t('swap.sendRequest')}</button>
    </div>
  `);
}
function submitTurnoSwapRequest(employeeId){
  const fromTurnoId = parseInt(document.getElementById('swap-turno-sel').value);
  const toEmployeeId = parseInt(document.getElementById('swap-colleague-sel').value);
  const turno = (DB.turnos||[]).find(t2=>t2.id===fromTurnoId);
  if(!turno || !turnoMeetsSwapNotice(turno.fecha)){ showToast(t('swap.noUpcomingTurnos').replace('${h}', SWAP_MIN_NOTICE_HOURS)); openEmployeeFicharModal(employeeId); return; }
  DB.turnoSwapRequests.push({id: genId(), fromEmployeeId: employeeId, fromTurnoId, toEmployeeId, status:'pending_peer', createdAt: new Date().toISOString()});
  saveDB();
  showToast(t('swap.requestSent'));
  openEmployeeFicharModal(employeeId);
}
// El compañero acepta o rechaza; si acepta, pasa a esperar la aprobación
// final del propietario (no se cambia nada de verdad hasta que él lo
// confirme, por si hay que ajustar cobertura de personal).
function respondTurnoSwapRequest(requestId, accept){
  const r = (DB.turnoSwapRequests||[]).find(x=>x.id===requestId);
  if(!r) return;
  r.status = accept ? 'pending_owner' : 'rejected';
  saveDB();
  showToast(accept ? t('swap.acceptedWaitingOwner') : t('swap.rejected'));
  openEmployeeFicharModal(r.toEmployeeId);
}
// Aprobación final del propietario: reasigna de verdad el turno al
// compañero que aceptó cubrirlo.
function ownerApproveTurnoSwap(requestId, approve){
  if(!isOwnerSession()) return;
  const r = (DB.turnoSwapRequests||[]).find(x=>x.id===requestId);
  if(!r) return;
  if(approve){
    const turno = (DB.turnos||[]).find(t2=>t2.id===r.fromTurnoId);
    // Reasignar el turno directamente (sin pasar por saveTurno) podía dejar
    // dos turnos del mismo empleado el mismo día si quien acepta cubrir ya
    // tenía uno propio esa fecha — las horas de esa semana descuadraban en
    // silencio (la vista solo mostraba/contaba uno de los dos). Se bloquea
    // igual que saveTurno bloquearía esa misma colisión.
    if(turno){
      const yaTieneOtro = (DB.turnos||[]).some(t2 => t2.id !== turno.id && t2.employeeId === r.toEmployeeId && t2.fecha === turno.fecha);
      if(yaTieneOtro){
        showToast(t('swap.targetAlreadyHasShift'));
        return;
      }
      turno.employeeId = r.toEmployeeId;
    }
    r.status = 'approved';
  }else{
    r.status = 'rejected';
  }
  saveDB();
  showToast(approve ? t('swap.approvedOk') : t('swap.rejected'));
  renderHorariosTab();
}

// Solicitud de vacaciones: el empleado pide un rango de fechas, el
// propietario la aprueba o la rechaza. Al aprobarla se crean turnos tipo
// "V" (vacaciones, ya existente en SHIFT_TYPES) para cada día del rango,
// igual que ownerApproveTurnoSwap reasigna un turno ya existente — aquí en
// vez de reasignar, se crean turnos nuevos que "ocupan" ese hueco en el
// cuadrante para que quede reflejado sin tener que rellenarlo a mano día
// a día.
// Cuenta días NATURALES entre dos fechas (ambas incluidas), igual que se
// generan los turnos "V" al aprobar — no días laborables, para que cuadre
// con lo que de verdad ocupa el cuadrante.
function vacationDaysBetween(fromDate, toDate){
  return Math.round((new Date(toDate+'T00:00:00') - new Date(fromDate+'T00:00:00')) / 86400000) + 1;
}
// Días ya comprometidos este año: aprobados (ya gastados de verdad) +
// pendientes (todavía puede rechazarse, pero mientras está pendiente ya
// "reserva" el hueco para que no le aprueben dos rangos que se pasan del
// total sin darse cuenta). Recorta cada solicitud al año en curso.
function vacationDaysCommitted(employeeId, year, statuses){
  const yFrom = year+'-01-01', yTo = year+'-12-31';
  return (DB.vacationRequests||[]).filter(r => r.employeeId===employeeId && statuses.includes(r.status)).reduce((sum, r) => {
    const from = r.fromDate < yFrom ? yFrom : r.fromDate;
    const to = r.toDate > yTo ? yTo : r.toDate;
    if(to < from) return sum;
    return sum + vacationDaysBetween(from, to);
  }, 0);
}
function vacationAllowanceSummary(employeeId){
  const emp = DB.employees.find(e => e.id===employeeId);
  if(!emp || emp.vacationDaysPerYear==null) return null;
  const year = todayStr().slice(0,4);
  const used = vacationDaysCommitted(employeeId, year, ['approved']);
  const pending = vacationDaysCommitted(employeeId, year, ['pending']);
  const total = emp.vacationDaysPerYear;
  return {total, used, pending, remaining: Math.max(0, total - used - pending)};
}
function renderMyVacationRequestsHtml(employeeId){
  const mine = (DB.vacationRequests||[]).filter(r => r.employeeId===employeeId).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
  const summary = vacationAllowanceSummary(employeeId);
  const summaryHtml = summary ? `<div style="font-size:12.5px;margin-bottom:6px">${t('vacation.remainingLine').replace('${remaining}', summary.remaining).replace('${total}', summary.total).replace('${used}', summary.used)}</div>` : '';
  if(!mine.length && !summaryHtml) return '';
  const statusLabel = s => s==='pending' ? t('vacation.statusPending') : s==='approved' ? t('vacation.statusApproved') : t('vacation.statusRejected');
  return `
    <div class="card" style="margin-top:12px;text-align:left">
      <h4 style="margin-bottom:6px;font-size:13px"><i class="ti ti-beach"></i> ${t('vacation.myRequestsTitle')}</h4>
      ${summaryHtml}
      ${mine.slice(0,5).map(r => `<div style="font-size:12.5px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:6px">
        <span>${escapeHtml(r.fromDate)} → ${escapeHtml(r.toDate)} — <strong>${statusLabel(r.status)}</strong></span>
        ${r.status==='pending' ? `<button class="btn btn-sm btn-icon" title="${t('vacation.cancelRequest')}" onclick="cancelVacationRequest(${r.id}, ${employeeId})"><i class="ti ti-x"></i></button>` : ''}
      </div>`).join('')}
    </div>`;
}
function openVacationRequestModal(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const summary = vacationAllowanceSummary(employeeId);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-beach"></i> ${t('vacation.requestBtn')}</h3>
      <button class="modal-close" onclick="openEmployeeFicharModal(${employeeId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted);margin:-4px 0 12px">${summary ? t('vacation.remainingLine').replace('${remaining}', summary.remaining).replace('${total}', summary.total).replace('${used}', summary.used) : t('vacation.noAllowanceSet')}</p>
    <div class="field-row">
      <div class="field"><label>${t('vacation.fromLabel')}</label><input type="date" id="vac-from" min="${todayStr()}" value="${todayStr()}"></div>
      <div class="field"><label>${t('vacation.toLabel')}</label><input type="date" id="vac-to" min="${todayStr()}" value="${todayStr()}"></div>
    </div>
    <div class="field"><label>${t('vacation.notesLabel')}</label><textarea id="vac-notes" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="openEmployeeFicharModal(${employeeId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="submitVacationRequest(${employeeId})">${t('swap.sendRequest')}</button>
    </div>
  `);
}
function submitVacationRequest(employeeId){
  const fromDate = document.getElementById('vac-from').value;
  const toDate = document.getElementById('vac-to').value;
  const notes = document.getElementById('vac-notes').value.trim();
  if(!fromDate || !toDate || toDate < fromDate){ showToast(t('vacation.badRange')); return; }
  const summary = vacationAllowanceSummary(employeeId);
  if(summary){
    const requested = vacationDaysBetween(fromDate, toDate);
    if(requested > summary.remaining){
      showToast(t('vacation.notEnoughDays').replace('${requested}', requested).replace('${remaining}', summary.remaining), 5000);
      return;
    }
  }
  if(!DB.vacationRequests) DB.vacationRequests = [];
  DB.vacationRequests.push({id: genId(), employeeId, fromDate, toDate, notes, status:'pending', createdAt: new Date().toISOString()});
  saveDB();
  showToast(t('swap.requestSent'));
  openEmployeeFicharModal(employeeId);
}
// Retirar una solicitud propia todavía pendiente — antes se quedaba fija
// en la lista sin ninguna forma de sacarla si el empleado cambiaba de idea
// o se equivocó de fechas. Solo tiene sentido en pendiente: una ya
// aprobada tiene turnos "V" reales generados (eso lo deshace el propietario).
function cancelVacationRequest(requestId, employeeId){
  const r = (DB.vacationRequests||[]).find(x=>x.id===requestId);
  if(!r || r.status!=='pending') return;
  DB.vacationRequests = DB.vacationRequests.filter(x=>x.id!==requestId);
  saveDB();
  showToast(t('vacation.cancelledOk'));
  openEmployeeFicharModal(employeeId);
}
function ownerRespondVacationRequest(requestId, approve){
  if(!isOwnerSession()) return;
  const r = (DB.vacationRequests||[]).find(x=>x.id===requestId);
  if(!r) return;
  if(approve){
    r.status = 'approved';
    let d = new Date(r.fromDate);
    const end = new Date(r.toDate);
    while(d <= end){
      const fecha = dateStr(d);
      // Si ya tenía un turno de trabajo normal asignado ese día, se
      // convertía en un fantasma: la vacación quedaba "aprobada" pero el
      // cuadrante seguía esperando que fichara ese turno. Aquí se convierte
      // el turno existente a vacaciones en vez de dejarlo tal cual.
      const existente = (DB.turnos||[]).find(t2 => t2.employeeId===r.employeeId && t2.fecha===fecha);
      if(existente) existente.tipo = 'V';
      else DB.turnos.push({id: genId(), employeeId: r.employeeId, fecha, tipo:'V', entrada:'', salida:''});
      d.setDate(d.getDate()+1);
    }
  }else{
    r.status = 'rejected';
  }
  logAudit(approve?'vacation_approved':'vacation_rejected', t(approve?'audit.vacationApproved':'audit.vacationRejected').replace('${name}', (DB.employees.find(e=>e.id===r.employeeId)||{}).name||'?'));
  saveDB();
  showToast(approve ? t('vacation.approvedOk') : t('swap.rejected'));
  renderHorariosTab();
}

// "Traspaso de turno": una nota de texto libre por área y día, visible para
// quien fiche entrada después — para dejar dicho "cosas a tener en cuenta"
// sin depender de que alguien se acuerde de decirlo de palabra.
function shiftHandoffKey(area, fecha){ return area + '_' + (fecha||todayStr()); }
function getShiftHandoffNote(area, fecha){ return (DB.shiftHandoffNotes||{})[shiftHandoffKey(area,fecha)] || ''; }
function saveShiftHandoffNote(area, text){
  if(!DB.shiftHandoffNotes) DB.shiftHandoffNotes = {};
  const key = shiftHandoffKey(area);
  if(text.trim()) DB.shiftHandoffNotes[key] = text.trim();
  else delete DB.shiftHandoffNotes[key];
  saveDB();
}

// Resumen del turno al fichar entrada: qué turno le toca hoy, cuántas
// reservas hay (solo tiene sentido en Sala), tareas de limpieza asignadas
// hoy, y la nota de traspaso que haya dejado el turno anterior — para que
// fichar deje de ser un simple trámite y sea el briefing del día.
function showShiftBriefing(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const today = todayStr();
  const area = e.area || 'cocina';
  const turno = turnoForDate(employeeId, today);
  const turnoLine = turno
    ? `${(SHIFT_TYPES[turno.tipo]||SHIFT_TYPES.C).label}${turno.entrada ? ` (${turno.entrada}${turno.salida?'–'+turno.salida:''})` : ''}`
    : t('briefing.noTurnoToday');
  const tareasHoy = ((DB.limpieza||{}).tareas||[]).filter(lt => lt.tipo==='mensual' && lt.responsableId===employeeId && lt.diaMes===new Date().getDate() && (lt.zona||'cocina')===area);
  const reservasHoy = area==='sala' ? DB.reservations.filter(r => r.date===today && (r.status==='confirmada'||r.status==='pendiente')).length : null;
  const handoffNote = getShiftHandoffNote(area, today);
  const descansoWarning = checkDescansoWarning(employeeId);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-clipboard-text"></i> ${t('briefing.title').replace('${name}', escapeHtml(e.name))}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div style="font-size:13.5px;line-height:1.9">
      <div><i class="ti ti-calendar" style="width:18px"></i> ${t('briefing.turnoLabel')}: <strong>${escapeHtml(turnoLine)}</strong></div>
      ${reservasHoy!=null ? `<div><i class="ti ti-calendar-event" style="width:18px"></i> ${t('briefing.reservationsLabel').replace('${n}', reservasHoy)}</div>` : ''}
      ${tareasHoy.length ? `<div><i class="ti ti-spray" style="width:18px"></i> ${t('briefing.cleaningTasksLabel').replace('${n}', tareasHoy.length)}: ${tareasHoy.map(x=>escapeHtml(x.producto||x.area||'')).join(', ')}</div>` : ''}
    </div>
    ${descansoWarning ? `<div class="card owner-only" style="margin-top:10px;border:1px solid var(--red);background:var(--red-l)"><i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${escapeHtml(descansoWarning)}</div>` : ''}
    ${handoffNote ? `<div class="card" style="margin-top:10px;background:var(--brand-cream)"><strong><i class="ti ti-arrow-forward-up"></i> ${t('briefing.handoffLabel')}:</strong><br>${escapeHtml(handoffNote)}</div>` : ''}
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">${t('common.understood')}</button>
    </div>
  `);
}

// Turno planificado de un empleado para una fecha concreta (para comparar
// horas planificadas vs. fichadas de verdad).
function turnoForDate(employeeId, fecha){
  return (DB.turnos||[]).find(t => t.employeeId===employeeId && t.fecha===fecha);
}
// Umbral (en horas) a partir del cual se avisa de que lo fichado no
// coincide con el turno planificado para ese día.
const FICHAJE_TURNO_MISMATCH_THRESHOLD = 0.25;

function openFichajeHistoryModal(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const fichajes = (DB.fichajes||[]).filter(f => f.employeeId===employeeId)
    .sort((a,b) => (b.entrada||'').localeCompare(a.entrada||'')).slice(0, 20);

  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${t('hr2.lastClockIns')} — ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${fichajes.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t('common.date')}</th><th>${t('hr2.clockIn')}</th><th>${t('hr2.clockOut')}</th><th>${t('common.hours')}</th><th>${t('hr2.plannedHours')}</th><th></th></tr></thead>
          <tbody>
            ${fichajes.map(f => {
              const turno = turnoForDate(employeeId, f.fecha);
              const planned = turno ? turnoHours(turno) : null;
              const actual = f.salida ? fichajeHoras(f) : null;
              const mismatch = planned!=null && actual!=null && Math.abs(actual-planned) > FICHAJE_TURNO_MISMATCH_THRESHOLD;
              return `
              <tr>
                <td>${escapeHtml(f.fecha)}</td>
                <td>${fmtHora(f.entrada)}</td>
                <td>${f.salida ? fmtHora(f.salida) : `<span class="badge badge-green">${t('hr2.inProgress')}</span>`}</td>
                <td style="${mismatch?'color:var(--red);font-weight:700':''}">${actual!=null ? fmtDuracion(actual) : '—'}${mismatch?` <i class="ti ti-alert-triangle" title="${t('hr2.shiftMismatch')}"></i>`:''}</td>
                <td style="color:var(--muted)">${planned!=null ? fmtDuracion(planned) : '—'}</td>
                <td class="actions-cell"><button class="btn btn-sm btn-icon" title="${t('hr2.fixClockInTitle')}" onclick="requestFichajeEditPin(${f.id})"><i class="ti ti-lock-edit"></i></button></td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty"><i class="ti ti-clock-play"></i>${t('hr2.noClockInsYet')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `, {xl:true});
}

// Corregir un fichaje cambia las horas realmente trabajadas de un empleado,
// así que se pide siempre el PIN del negocio en el momento (no basta con que
// el modo edición esté ya desbloqueado): evita que un empleado se "añada"
// horas de más aunque tenga el dispositivo en la mano.
let fichajePendingEditId = null;
function requestFichajeEditPin(fichajeId){
  fichajePendingEditId = fichajeId;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${t('title.bossAccess')}</h3>
      <button class="modal-close" onclick="openFichajeHistoryModal(${(DB.fichajes||[]).find(x=>x.id===fichajeId)?.employeeId})">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.fichajeEditPinDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="fichaje-edit-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmFichajeEditPin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openFichajeHistoryModal(${(DB.fichajes||[]).find(x=>x.id===fichajeId)?.employeeId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmFichajeEditPin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('fichaje-edit-pin-input')?.focus(), 50);
}
function confirmFichajeEditPin(){
  const f = (DB.fichajes||[]).find(x=>x.id===fichajePendingEditId);
  if(!f) return;
  const val = document.getElementById('fichaje-edit-pin-input').value;
  const match = pinDeNegocioCoincide(val);
  if(!match){
    showToast(t('msg.pinIncorrect'));
    return;
  }
  openEditFichajeModal(fichajePendingEditId);
}
function openEditFichajeModal(fichajeId){
  const f = (DB.fichajes||[]).find(x=>x.id===fichajeId);
  if(!f) return;
  const entradaTime = f.entrada ? new Date(f.entrada).toTimeString().slice(0,5) : '';
  const salidaTime = f.salida ? new Date(f.salida).toTimeString().slice(0,5) : '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-edit"></i> ${t('hr2.fixClockIn')} — ${escapeHtml(f.fecha)}</h3>
      <button class="modal-close" onclick="openFichajeHistoryModal(${f.employeeId})">&times;</button>
    </div>
    <div class="field-row">
      <div class="field"><label>${t('hr2.clockInTime')}</label><input type="time" id="edit-fichaje-entrada" value="${entradaTime}"></div>
      <div class="field"><label>${t('hr2.clockOutTime')}</label><input type="time" id="edit-fichaje-salida" value="${salidaTime}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openFichajeHistoryModal(${f.employeeId})">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveEditedFichaje(${fichajeId})">${t('common.save')}</button>
    </div>
  `);
}
function saveEditedFichaje(fichajeId){
  const f = (DB.fichajes||[]).find(x=>x.id===fichajeId);
  if(!f) return;
  const entradaVal = document.getElementById('edit-fichaje-entrada').value;
  const salidaVal = document.getElementById('edit-fichaje-salida').value;
  if(!entradaVal || !salidaVal){ showToast(t('msg.indicateBothTimes')); return; }
  const entradaDate = new Date(`${f.fecha}T${entradaVal}:00`);
  let salidaDate = new Date(`${f.fecha}T${salidaVal}:00`);
  // Turno de noche (entrada 23:00, salida 06:00): si la hora de salida es
  // menor o igual que la de entrada, se asume que fue al día siguiente, igual
  // que ya hace hoursBetween() al fichar en tiempo real — si no, un fichaje
  // real de este tipo nunca se podría corregir desde aquí (siempre "la
  // salida debe ser posterior a la entrada").
  if(salidaDate <= entradaDate) salidaDate = new Date(salidaDate.getTime() + 24*60*60*1000);
  f.entrada = entradaDate.toISOString();
  f.salida = salidaDate.toISOString();
  saveDB();
  showToast(t('msg.fichajeUpdated'));
  openFichajeHistoryModal(f.employeeId);
  renderHorariosTab();
}

// Fichar entrada/salida directamente desde el modal del empleado: el PIN ya
// se pidió y comprobó una vez al entrar a este modal (confirmEmployeePersonalPin),
// así que no hace falta volver a pedirlo para cada botón — antes se pedía dos
// veces seguidas para lo mismo. La única excepción es si el empleado todavía
// no ha cambiado el PIN de fábrica (1234): ahí sí se le pide, una vez, que
// elija el suyo propio antes de completar el fichaje.
function quickFichaje(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  if(!e.pinChanged){
    openNewPinModal(employeeId, action);
    return;
  }
  doFichaje(employeeId, action);
}

function openNewPinModal(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${t('title.createYourPin')}</h3>
      <button class="modal-close" onclick="renderHorariosTab();closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.firstClockIn').replace('${name}', escapeHtml(e.name))}</p>
    <div class="field">
      <label>${t('label.newPin4Digits')}</label>
      <input type="password" id="new-pin-1" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    <div class="field">
      <label>${t('label.repeatPin')}</label>
      <input type="password" id="new-pin-2" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderHorariosTab();closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmNewPin(${employeeId}, '${action}')">${t('btn.saveAndClockIn')}</button>
    </div>
  `);
}

function confirmNewPin(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const p1 = document.getElementById('new-pin-1').value.trim();
  const p2 = document.getElementById('new-pin-2').value.trim();
  if(!/^\d{4}$/.test(p1)){ showToast(t('msg.pinMustBe4')); return; }
  if(p1 !== p2){ showToast(t('msg.pinsDontMatch')); return; }
  if(p1 === '1234'){ showToast(t('msg.pinNotDefault')); return; }
  e.pin = hashPin(p1, codigoNegocioParaPin());
  e.pinChanged = true;
  saveDB();
  doFichaje(employeeId, action);
}

// Igual que openNewPinModal/confirmNewPin (Fichar), pero para el momento de
// entrar por "Acceso Empleados": mientras el empleado siga con el PIN de
// fábrica (1234), se le anima a elegir el suyo — sin bloquear la entrada,
// "Ahora no" lo deja pasar igual y no se le pregunta otra vez hasta que lo
// cambie de verdad.
function promptEmployeeFirstPinChange(employeeId){
  const e = (DB.employees||[]).find(x => x.id === employeeId);
  if(!e || e.pinChanged) return;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${t('title.createYourPin')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.firstLoginPinExplainer').replace('${name}', escapeHtml(e.name))}</p>
    <div class="field">
      <label>${t('label.newPin4Digits')}</label>
      <input type="password" id="new-pin-1" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    <div class="field">
      <label>${t('label.repeatPin')}</label>
      <input type="password" id="new-pin-2" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center" onkeydown="if(event.key==='Enter')confirmFirstPinChange(${JSON.stringify(employeeId)})">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal();maybeShowEmployeeOnboarding(${JSON.stringify(employeeId)})">${t('common.later')}</button>
      <button class="btn btn-primary" onclick="confirmFirstPinChange(${JSON.stringify(employeeId)})">${t('common.save')}</button>
    </div>
  `);
}
function confirmFirstPinChange(employeeId){
  const e = (DB.employees||[]).find(x => x.id === employeeId);
  if(!e) return;
  const p1 = document.getElementById('new-pin-1').value.trim();
  const p2 = document.getElementById('new-pin-2').value.trim();
  if(!/^\d{4}$/.test(p1)){ showToast(t('msg.pinMustBe4')); return; }
  if(p1 !== p2){ showToast(t('msg.pinsDontMatch')); return; }
  if(p1 === '1234'){ showToast(t('msg.pinNotDefault')); return; }
  e.pin = hashPin(p1, codigoNegocioParaPin());
  e.pinChanged = true;
  saveDB();
  closeModal();
  showToast(t('msg.pinUpdated'));
  maybeShowEmployeeOnboarding(employeeId);
}

// Mini-tour para un empleado nuevo: 3-4 tarjetas rápidas explicando lo básico
// de su área (fichar, comandas/mesas según toque), se muestra solo una vez
// (se marca con `onboardingSeen`) y nunca bloquea el acceso — "Entendido" es
// la única salida, no hay "más tarde" para no dejarlo a medias sin marcarlo.
function maybeShowEmployeeOnboarding(employeeId){
  const e = (DB.employees||[]).find(x => x.id === employeeId);
  if(!e || e.onboardingSeen) return;
  const area = e.area || 'cocina';
  const tips = area === 'sala'
    ? [t('onboarding.tip.clockInOut'), t('onboarding.tip.salaMesas'), t('onboarding.tip.salaComandas'), t('onboarding.tip.chat')]
    : [t('onboarding.tip.clockInOut'), t('onboarding.tip.cocinaComandas'), t('onboarding.tip.cocinaVoice'), t('onboarding.tip.chat')];
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-confetti"></i> ${t('onboarding.title').replace('${name}', escapeHtml(e.name))}</h3>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${tips.map(tip => `<div style="display:flex;gap:8px;align-items:flex-start"><i class="ti ti-circle-check" style="color:var(--brand-orange);margin-top:2px"></i><span style="font-size:13.5px">${tip}</span></div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" style="flex:1" onclick="dismissEmployeeOnboarding(${JSON.stringify(employeeId)})">${t('onboarding.gotIt')}</button>
    </div>
  `);
}
function dismissEmployeeOnboarding(employeeId){
  const e = (DB.employees||[]).find(x => x.id === employeeId);
  if(e) e.onboardingSeen = true;
  saveDB();
  closeModal();
}

function doFichaje(employeeId, action){
  const now = new Date().toISOString();
  let descansoWarning = null;
  if(action === 'entrada'){
    if(getOpenFichaje(employeeId)){ showToast(t('msg.alreadyClockedIn')); closeModal(); renderHorariosTab(); return; }
    // Se calcula ANTES de registrar la nueva entrada (si no, se compararía
    // contra sí misma). Solo avisa, no bloquea el fichaje.
    descansoWarning = checkDescansoWarning(employeeId);
    DB.fichajes.push({id: genId(), employeeId, fecha: todayStr(), entrada: now, salida: null, entradaAuthMethod: personalFicharAuthMethod});
  }else{
    const open = getOpenFichaje(employeeId);
    if(!open){ showToast(t('msg.noClockedIn')); closeModal(); renderHorariosTab(); return; }
    open.salida = now;
    open.salidaAuthMethod = personalFicharAuthMethod;
  }
  // Deja rastro en el historial cuando el fichaje NO lo hizo la propia
  // persona (se usó el PIN de negocio, o se hizo desde sesión de dueño) —
  // antes cualquiera con el PIN de negocio podía fichar entrada/salida de
  // otro empleado sin que quedara constancia de quién lo hizo de verdad.
  if(personalFicharAuthMethod !== 'self'){
    const emp = DB.employees.find(x=>x.id===employeeId);
    logPersonalEvent('clockedByOther', {name: emp?emp.name:'?', action, via: personalFicharAuthMethod});
  }
  saveDB();
  closeModal();
  // Si este fichaje de entrada venía de la pantalla de bloqueo (fichar para
  // entrar en Cocina/Sala), retomamos la navegación pendiente en vez de
  // simplemente refrescar la pestaña de Personal (que puede ni existir
  // todavía, si aún no se había llegado a entrar en la carpeta).
  if(action === 'entrada' && typeof fichaGatePendingView !== 'undefined' && fichaGatePendingView){
    const resumeView = fichaGatePendingView;
    fichaGatePendingView = null;
    showToast(descansoWarning || t('msg.clockInRegistered'));
    navigate(resumeView);
    showShiftBriefing(employeeId);
    return;
  }
  renderHorariosTab();
  showToast(action === 'entrada' ? (descansoWarning || t('msg.clockInRegistered')) : t('msg.clockOutRegistered'));
  if(action === 'entrada') showShiftBriefing(employeeId);
}

