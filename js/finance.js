/* ============================================================
   DASHBOARD
   ============================================================ */
function geTotalFijos(){
  return (DB.ge.fijos||[]).reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
// Importe mensual equivalente de un gasto fijo: si se paga cada X meses (trimestral, anual...),
// se reparte el importe entre esos meses para poder sumarlo junto a los gastos mensuales.
function gfMonthlyImporte(g){
  return parseFloat(g.importe||0) / (parseInt(g.periodicidadMeses)||1);
}
function geTotalVariablesMes(year, month){
  return (DB.ge.variables||[]).filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
function salesTotalForRange(startDate, endDate){
  return DB.sales.filter(s=>s.date>=startDate && s.date<=endDate).reduce((sum,s)=>sum+s.total,0);
}
function salesTotalForMonth(year, month){
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const end = `${year}-${String(month+1).padStart(2,'0')}-31`;
  return salesTotalForRange(start, end);
}
function daysInMonth(year, month){
  return new Date(year, month+1, 0).getDate();
}
// Gastos variables (compras) registrados con fecha concreta dentro del rango
function geVariablesTotalForRange(startDate, endDate){
  return (DB.ge.variables||[]).filter(v=>v.fecha && v.fecha>=startDate && v.fecha<=endDate).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
// Los gastos fijos son mensuales: se prorratean por día para poder mostrar "gastos de hoy/semana"
function geFijosForRange(startDate, endDate){
  const fijosMonth = geTotalFijos();
  if(!fijosMonth) return 0;
  let total = 0;
  let d = new Date(startDate+'T00:00:00');
  const end = new Date(endDate+'T00:00:00');
  while(d <= end){
    total += fijosMonth / daysInMonth(d.getFullYear(), d.getMonth());
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
  let avgFoodCost = 0;
  if(DB.recipes.length){
    const pcts = DB.recipes.map(r => recipeFoodCostPct(r)).filter(p => isFinite(p));
    if(pcts.length) avgFoodCost = pcts.reduce((a,b)=>a+b,0) / pcts.length;
  }

  const today = new Date();
  const todayDate = todayStr();
  const weekAgo = dateStr(new Date(today.getTime() - 6*86400000));
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;

  const todaySales = salesTotalForRange(todayDate, todayDate);
  const weekSales = salesTotalForRange(weekAgo, todayDate);
  const monthSales = salesTotalForRange(monthStart, todayDate);

  document.getElementById('dashboard-period-kpis').innerHTML = `
    <div class="kpi ok"><div class="label"><i class="ti ti-cash"></i> Ventas hoy</div><div class="value">${fmtMoney(todaySales)}</div></div>
    <div class="kpi"><div class="label"><i class="ti ti-calendar-week"></i> Ventas últimos 7 días</div><div class="value">${fmtMoney(weekSales)}</div></div>
    <div class="kpi"><div class="label"><i class="ti ti-calendar-month"></i> Ventas mes en curso</div><div class="value">${fmtMoney(monthSales)}</div></div>
  `;

  // Resultado del mes (P&L)
  const year = today.getFullYear();
  const month = today.getMonth();
  const facturacion = salesTotalForMonth(year, month);
  const variables = geTotalVariablesMes(year, month);
  const fijos = geTotalFijos();
  const resultado = facturacion - variables - fijos;

  // Comparación de ventas del año (12 meses)
  const ventasTrend = [];
  const gastosTrend = [];
  const resultadoTrend = [];
  for(let i=11; i>=0; i--){
    const d = new Date(year, month - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const sales = salesTotalForMonth(y, m);
    const variablesM = geTotalVariablesMes(y, m);
    const fijosM = geTotalFijos();
    const label = MONTH_NAMES[m].slice(0,3);
    ventasTrend.push({label, value: sales});
    gastosTrend.push({label, value: variablesM + fijosM});
    resultadoTrend.push({label, value: sales - variablesM - fijosM});
  }
  renderDashboardBarTrend('dashboard-trend-ventas', ventasTrend);
  renderDashboardBarTrend('dashboard-trend-gastos', gastosTrend);
  renderDashboardBarTrend('dashboard-trend-resultado', resultadoTrend, true);

  // Gastos hoy / últimos 7 días / mes en curso (variables con fecha + fijos prorrateados)
  const todayGastos = geGastosTotalForRange(todayDate, todayDate);
  const weekGastos = geGastosTotalForRange(weekAgo, todayDate);
  const monthGastos = geGastosTotalForRange(monthStart, todayDate);

  document.getElementById('dashboard-gastos-kpis').innerHTML = `
    <div class="kpi"><div class="label"><i class="ti ti-receipt-2"></i> Gastos hoy</div><div class="value">${fmtMoney(todayGastos)}</div></div>
    <div class="kpi"><div class="label"><i class="ti ti-calendar-week"></i> Gastos últimos 7 días</div><div class="value">${fmtMoney(weekGastos)}</div></div>
    <div class="kpi"><div class="label"><i class="ti ti-calendar-month"></i> Gastos mes en curso</div><div class="value">${fmtMoney(monthGastos)}</div></div>
  `;

  // Resultado del mes (P&L)
  const fcPct = facturacion > 0 ? (avgFoodCost) : 0;
  const margenPct = facturacion > 0 ? (resultado/facturacion)*100 : 0;
  document.getElementById('dashboard-resultado').innerHTML = `
    <div class="grid grid-4">
      <div class="kpi"><div class="label">Facturación (mes)</div><div class="value">${fmtMoney(facturacion)}</div></div>
      <div class="kpi"><div class="label">Gastos variables</div><div class="value">${fmtMoney(variables)}</div></div>
      <div class="kpi"><div class="label">Gastos fijos</div><div class="value">${fmtMoney(fijos)}</div></div>
      <div class="kpi ${resultado>=0?'ok':'warn'}"><div class="label">Resultado</div><div class="value">${fmtMoney(resultado)}</div></div>
    </div>
    <div style="margin-top:8px;font-size:13px;color:var(--muted)">
      Margen sobre ventas: <strong style="color:${resultado>=0?'var(--green)':'var(--red)'}">${facturacion>0?margenPct.toFixed(1)+'%':'—'}</strong>
      &nbsp;·&nbsp; % Food Cost medio: <strong style="color:${fcPct>35?'var(--red)':'var(--green)'}">${DB.recipes.length?fcPct.toFixed(1)+'%':'—'}</strong> (objetivo ${DB.ge.config.foodCostObj||35}%)
    </div>
  `;

  // Sales analysis (last 30 days): avg ticket, top products, sales by hour
  const last30Start = dateStr(new Date(today.getTime() - 29*86400000));
  const salesLast30 = DB.sales.filter(s=>s.date>=last30Start && s.date<=todayDate);
  const totalLast30 = salesLast30.reduce((s,x)=>s+x.total,0);
  const avgTicket = salesLast30.length ? totalLast30 / salesLast30.length : 0;

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
      <div class="kpi"><div class="label"><i class="ti ti-receipt"></i> Ticket medio</div><div class="value">${fmtMoney(avgTicket)}</div></div>
      <div class="kpi"><div class="label"><i class="ti ti-shopping-cart"></i> Nº ventas</div><div class="value">${salesLast30.length}</div></div>
      <div class="kpi"><div class="label"><i class="ti ti-cash"></i> Total periodo</div><div class="value">${fmtMoney(totalLast30)}</div></div>
    </div>
    <div class="grid grid-3">
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">Platos más vendidos</h4>
        ${topProducts.length ? `<div class="table-wrap"><table><tbody>
          ${topProducts.map(([name,total]) => `<tr><td>${escapeHtml(name)}</td><td style="text-align:right;font-weight:600">${fmtMoney(total)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">Sin ventas registradas</div>`}
      </div>
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">Mayor margen bruto</h4>
        ${topMargins.length ? `<div class="table-wrap"><table><tbody>
          ${topMargins.map(([name,v]) => `<tr><td>${escapeHtml(name)}</td><td style="text-align:right;font-weight:600;color:var(--green)">${fmtMoney(v.margin)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">Sin datos de coste suficientes</div>`}
      </div>
      <div>
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">Ventas por hora del día</h4>
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

  // Breakeven tracking
  const cfg = DB.ge.config || {};
  const tick = parseFloat(cfg.ticketMedio) || 0;
  const cub = parseFloat(cfg.cubiertosActuales) || 0;
  const dias = parseFloat(cfg.diasApertura) || 0;
  const fc = parseFloat(cfg.foodCostObj) || 35;
  let breakevenHtml;
  if(!tick || !dias){
    breakevenHtml = `<div class="empty">Configura el ticket medio y los días de apertura en Gestión Económica → Punto de Equilibrio.</div>`;
  }else{
    const cvCub = tick * (fc/100);
    const contribCub = tick - cvCub;
    if(contribCub > 0){
      const cubNec = Math.ceil(fijos / contribCub);
      const diff = cub - cubNec;
      breakevenHtml = `
        <div class="grid grid-3">
          <div class="kpi"><div class="label">Cubiertos necesarios/mes</div><div class="value">${cubNec}</div></div>
          <div class="kpi"><div class="label">Cubiertos actuales/mes</div><div class="value">${cub}</div></div>
          <div class="kpi ${diff>=0?'ok':'warn'}"><div class="label">Diferencia</div><div class="value">${diff>=0?'+':''}${diff}</div></div>
        </div>
        <div style="margin-top:8px;font-weight:600;color:${diff>=0?'var(--green)':'var(--red)'}">${diff>=0?'✅ Por encima del punto de equilibrio':'⚠️ Por debajo del punto de equilibrio'}</div>
      `;
    }else{
      breakevenHtml = `<div class="empty">No se puede calcular: revisa el % food cost.</div>`;
    }
  }
  document.getElementById('dashboard-breakeven').innerHTML = breakevenHtml;

  GE.renderPlatos();
}
function todayStr(){
  return new Date().toISOString().slice(0,10);
}

/* ============================================================
   MEGA LISTA — Ingredientes y proveedores
   ============================================================ */
function populateCategoryFilter(){
  const sel = document.getElementById('megalista-filter-cat');
  const current = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  sel.value = current;
}

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
  sel.innerHTML = '<option value="">Todos los proveedores</option>' +
    sorted.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = current;
}

function renderMegalista(){
  populateCategoryFilter();
  populateProviderFilter();
  const search = document.getElementById('megalista-search').value.toLowerCase();
  const cat = document.getElementById('megalista-filter-cat').value;
  const prov = document.getElementById('megalista-filter-prov').value;

  let items = DB.ingredients.filter(i => {
    const matchArea = (i.area||'cocina') === currentArea();
    const matchSearch = !search || i.name.toLowerCase().includes(search) || (i.supplier||'').toLowerCase().includes(search);
    const matchCat = !cat || i.category === cat;
    const matchProv = !prov || (i.supplier||'') === prov;
    return matchArea && matchSearch && matchCat && matchProv;
  });

  const tbody = document.getElementById('megalista-tbody');
  if(!items.length){
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><i class="ti ti-list-details"></i>${t('empty.ingredients')}</div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(ing => `
    <tr>
      <td><strong>${escapeHtml(ing.name)}</strong></td>
      <td><span class="badge badge-gray">${escapeHtml(ing.category||'—')}</span></td>
      <td>${escapeHtml(ing.supplier||'—')}</td>
      <td>${escapeHtml(ing.unit)}</td>
      <td>${fmtNum(ing.packQty||1)} ${escapeHtml(ing.unit)} × ${fmtMoney(ing.packPrice!=null?ing.packPrice:ing.price)}</td>
      <td class="wrap">${(ing.allergens||[]).map(a=>`<span class="badge badge-amber">${escapeHtml(a)}</span>`).join(' ') || '—'}</td>
      <td class="actions-cell">
        <button class="owner-only btn btn-sm btn-icon" onclick="openIngredientModal(${ing.id})"><i class="ti ti-edit"></i></button>
        <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteIngredient(${ing.id})"><i class="ti ti-trash"></i></button>
      </td>
    </tr>
  `).join('');
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
  const ing = overrideState || (id ? getIngredient(id) : {name:'',category:CATEGORIES[0],supplier:areaProviders[0].nombre,unit:'g',price:0,packQty:1000,packPrice:0,allergens:[],area:currentArea()});
  const allergenChecks = ALLERGENS.map(a => `
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;margin-bottom:4px">
      <input type="checkbox" value="${a}" ${ing.allergens && ing.allergens.includes(a) ? 'checked':''} style="width:auto"> ${a}
    </label>
  `).join('');

  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editIngredient') : t('title.newIngredient')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="ing-name" value="${escapeHtml(ing.name)}" placeholder="${t('ph.ingredientName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="ing-category" onchange="onIngredientCategoryChange(${id||'null'})">
          ${CATEGORIES.map(c=>`<option value="${c}" ${ing.category===c?'selected':''}>${c}</option>`).join('')}
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
        <label id="ing-pack-qty-label">Cantidad por compra (en ${escapeHtml(ing.unit)}${ing.unit==='g'?', ej. 1000 = 1 kg':''})</label>
        <input type="number" id="ing-pack-qty" value="${ing.packQty!=null?ing.packQty:1000}" step="0.01" min="0.01" oninput="updateIngPackPrice()">
      </div>
      <div class="field">
        <label>${t('label.purchasePrice')}</label>
        <input type="number" id="ing-pack-price" value="${ing.packPrice!=null?ing.packPrice:ing.price}" step="0.01" min="0" oninput="updateIngPackPrice()">
      </div>
    </div>
    <div class="field">
      <label>Alérgenos</label>
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

function updateIngPackPrice(){
  const unit = document.getElementById('ing-unit').value;
  document.getElementById('ing-pack-qty-label').textContent = `Cantidad por compra (en ${unit}${unit==='g'?', ej. 1000 = 1 kg':''})`;
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
        <label>${t('ph.categoryName')}</label>
        <input type="text" id="new-ingredient-category-name" placeholder="${t('ph.categoryName')}">
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
  state.category = CATEGORIES[0];
  ingredientFormStateBeforeCategory = null;
  openIngredientModal(id, state);
}
function confirmNewIngredientCategory(id){
  const name = document.getElementById('new-ingredient-category-name').value;
  const state = ingredientFormStateBeforeCategory || currentIngredientFormState(id);
  if(name && name.trim()){
    const cat = name.trim();
    if(!CATEGORIES.includes(cat) && !DB.ingredientCategories.includes(cat)) DB.ingredientCategories.push(cat);
    state.category = cat;
  } else {
    state.category = CATEGORIES[0];
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

function deleteIngredient(id){
  if(!confirm(t('msg.confirmDeleteIngredient'))) return;
  DB.ingredients = DB.ingredients.filter(i => i.id !== id);
  delete DB.stock[id];
  DB.recipes.forEach(r => {
    r.ingredients = (r.ingredients||[]).filter(line => line.ingredientId !== id);
  });
  saveDB();
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
  document.getElementById('stock-new-elab-btn').style.display = tab === 'elab' ? '' : 'none';
}

let stockFolder = null;   // categoría abierta en la pestaña de ingredientes
let stockItem = null;     // producto seleccionado dentro de la carpeta
let elabFolder = null;    // categoría abierta en la pestaña de elaboraciones
let elabItem = null;      // elaboración seleccionada dentro de la carpeta
function openStockFolder(cat){ stockFolder = cat; stockItem = null; renderStock(); }
function openStockItem(id){ stockItem = id; renderStock(); }
function backToStockFolders(){ stockFolder = null; stockItem = null; renderStock(); }
function backToStockItems(){ stockItem = null; renderStock(); }
function openElabFolder(cat){ elabFolder = cat; elabItem = null; renderStock(); }
function openElabItem(id){ elabItem = id; renderStock(); }
function backToElabFolders(){ elabFolder = null; elabItem = null; renderStock(); }
function backToElabItems(){ elabItem = null; renderStock(); }

function renderStock(){
  const search = document.getElementById('stock-search').value.toLowerCase();
  const onlyAlerts = document.getElementById('stock-only-alerts').checked;

  let items = DB.ingredients.filter(ing => {
    const s = getStockEntry(ing.id);
    const matchArea = (ing.area||'cocina') === currentArea();
    const matchSearch = !search || ing.name.toLowerCase().includes(search);
    const matchAlert = !onlyAlerts || s.qty <= s.min;
    return matchArea && matchSearch && matchAlert;
  }).map(ing => ({type:'ing', id: ing.id, name: ing.name, unit: ing.unit, category: ing.category || 'Otros', ...getStockEntry(ing.id)}));

  let elabs = (DB.elaboraciones||[]).filter(e => {
    const matchArea = (e.area||'cocina') === currentArea();
    const matchSearch = !search || e.name.toLowerCase().includes(search);
    const matchAlert = !onlyAlerts || (e.qty||0) <= (e.min||0);
    return matchArea && matchSearch && matchAlert;
  }).map(e => ({type:'elab', id: e.id, recipeId: e.recipeId||null, name: e.name, unit: e.unit, qty: e.qty||0, min: e.min||0}));

  const renderRow = row => {
    const low = row.qty <= row.min;
    const isElab = row.type === 'elab';
    const fromEscandallo = isElab && !!row.recipeId;
    const statusBadge = low ? '<span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle"></i> Bajo mín.</span>' : '<span class="badge badge-green" style="font-size:10px">OK</span>';
    return `
      <div class="list-row" style="padding:6px 10px;flex-wrap:wrap">
        <div class="list-row-name"><span>${escapeHtml(row.name)}</span>${fromEscandallo ? ' <span class="badge badge-gray" style="font-size:10px">Escandallo</span>' : ''}</div>
        <span style="font-size:12.5px;color:var(--muted);white-space:nowrap">${fmtNum(row.qty)} ${escapeHtml(row.unit)}</span>
        <span style="font-size:11.5px;color:var(--muted)">Mín.</span>
        <input type="number" value="${row.min}" step="0.01" min="0" style="width:65px;padding:3px 5px;border:1px solid var(--border);border-radius:6px;font-size:13px" ${editUnlocked?'':'disabled'}
          onchange="${isElab ? `updateElaboracionMin(${row.id}, this.value)` : `updateStockMin(${row.id}, this.value)`}">
        ${statusBadge}
        <div class="actions-cell" style="gap:4px">
          <button class="btn btn-sm btn-icon" onclick="${isElab ? `adjustElaboracion(${row.id}, 1)` : `adjustStock(${row.id}, 1)`}"><i class="ti ti-plus"></i></button>
          <button class="btn btn-sm btn-icon" onclick="${isElab ? `adjustElaboracion(${row.id}, -1)` : `adjustStock(${row.id}, -1)`}"><i class="ti ti-minus"></i></button>
          <button class="btn btn-sm btn-icon" title="Ajustar" onclick="${isElab ? `setElaboracionQty(${row.id})` : `setStockQty(${row.id})`}"><i class="ti ti-edit"></i></button>
          ${isElab && !fromEscandallo ? `<button class="owner-only btn btn-sm btn-icon" onclick="openElaboracionModal(${row.id})"><i class="ti ti-pencil"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteElaboracion(${row.id})"><i class="ti ti-trash"></i></button>` : ''}
          ${fromEscandallo ? `<button class="owner-only btn btn-sm btn-icon" title="Editar escandallo" onclick="navigate('escandallo');openRecipeModal(${row.recipeId})"><i class="ti ti-chef-hat"></i></button>` : ''}
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
    const ia = CATEGORIES.indexOf(a), ib = CATEGORIES.indexOf(b);
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
      <div class="view-subtitle" style="margin-top:14px;margin-bottom:4px"><strong>${escapeHtml(cat)}</strong> <span style="font-size:12px;color:var(--muted)">(${byCat[cat].length})</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px">
        ${byCat[cat].map(renderRow).join('')}
      </div>
    `).join('');
  } else if(stockFolder === null){
    // Vista de carpetas por categoría.
    groupsWrap.innerHTML = `<div class="grid grid-compact">${cats.map(cat => `
      <div class="card card-compact" style="cursor:pointer" onclick="openStockFolder('${cat.replace(/'/g,"\\'")}')">
        <h3><i class="ti ti-folder"></i> ${escapeHtml(cat)}</h3>
        <div style="font-size:12px;color:var(--muted)">${byCat[cat].length} producto${byCat[cat].length===1?'':'s'}</div>
      </div>
    `).join('')}</div>`;
  } else {
    const folderItems = byCat[stockFolder] || [];
    const backFolders = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToStockFolders()"><i class="ti ti-arrow-left"></i> Categorías</button>`;
    if(!folderItems.length){
      stockFolder = null; renderStock(); return;
    }
    if(stockItem !== null){
      const row = folderItems.find(it => it.id === stockItem);
      if(!row){ stockItem = null; renderStock(); return; }
      const low = row.qty <= row.min;
      const isElab = row.type === 'elab';
      const backItems = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToStockItems()"><i class="ti ti-arrow-left"></i> ${escapeHtml(stockFolder)}</button>`;
      groupsWrap.innerHTML = backItems + `
        <div class="card" style="max-width:420px">
          <h3 style="margin-bottom:14px">${escapeHtml(row.name)} ${low ? '<span class="badge badge-red"><i class="ti ti-alert-triangle"></i> Bajo mínimo</span>' : '<span class="badge badge-green">OK</span>'}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div style="background:${low?'#FDEEE8':'#E8F8F0'};border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:${low?'#c0392b':'#1a7f4b'};margin-bottom:4px">Stock actual</div>
              <div style="font-size:28px;font-weight:800;color:${low?'#c0392b':'#1a7f4b'}">${fmtNum(row.qty)}</div>
              <div style="font-size:12px;color:var(--muted)">${escapeHtml(row.unit)}</div>
            </div>
            <div style="background:var(--brand-cream);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Stock mínimo</div>
              <div style="font-size:28px;font-weight:800;color:#555">${fmtNum(row.min)}</div>
              <div style="font-size:12px;color:var(--muted)">${escapeHtml(row.unit)}</div>
            </div>
          </div>
          <div class="field" style="margin-bottom:10px">
            <label style="font-size:12px">Cambiar stock mínimo</label>
            <input type="number" value="${row.min}" step="0.01" min="0" style="max-width:140px" ${editUnlocked?'':'disabled'}
              onchange="${isElab ? `updateElaboracionMin(${row.id}, this.value)` : `updateStockMin(${row.id}, this.value)`}">
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="${isElab ? `adjustElaboracion(${row.id}, 1)` : `adjustStock(${row.id}, 1)`}"><i class="ti ti-plus"></i> Añadir 1</button>
            <button class="btn btn-sm" onclick="${isElab ? `adjustElaboracion(${row.id}, -1)` : `adjustStock(${row.id}, -1)`}"><i class="ti ti-minus"></i> Quitar 1</button>
            <button class="btn btn-sm" onclick="${isElab ? `setElaboracionQty(${row.id})` : `setStockQty(${row.id})`}"><i class="ti ti-edit"></i> Ajustar cantidad</button>
          </div>
        </div>`;
    } else {
      // Carpeta abierta: lista de nombres clicables.
      groupsWrap.innerHTML = backFolders + `<div class="table-wrap"><table><tbody>${folderItems.map(it => {
        const low = it.qty <= it.min;
        return `<tr style="cursor:pointer" onclick="openStockItem(${it.id})">
          <td><strong>${escapeHtml(it.name)}</strong></td>
          <td style="text-align:right">${low ? '<span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle"></i> Bajo mín.</span>' : '<span class="badge badge-green" style="font-size:10px">OK</span>'} <i class="ti ti-chevron-right" style="color:var(--muted)"></i></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    }
  }

  /* Elaboraciones — misma navegación carpetas que ingredientes */
  const elabGroupsWrap = document.getElementById('stock-elab-groups');
  if(!elabs.length){
    elabGroupsWrap.innerHTML = `<div class="empty"><i class="ti ti-package"></i>${t('empty.elaborations')}</div>`;
  } else {
    const elabByCat = {};
    elabs.forEach(e => {
      const cat = (e.recipeId ? ((DB.recipes.find(r=>r.id===e.recipeId)||{}).category)||'Sin categoría' : 'Sin categoría');
      (elabByCat[cat] = elabByCat[cat] || []).push(e);
    });
    const elabCats = Object.keys(elabByCat).sort();

    if(searching){
      elabGroupsWrap.innerHTML = elabCats.map(cat => `
        <div class="view-subtitle" style="margin-top:14px;margin-bottom:4px"><strong>${escapeHtml(cat)}</strong> <span style="font-size:12px;color:var(--muted)">(${elabByCat[cat].length})</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px">
          ${elabByCat[cat].map(renderRow).join('')}
        </div>
      `).join('');
    } else if(elabFolder === null){
      if(elabCats.length === 1){
        elabFolder = elabCats[0];
      } else {
        elabGroupsWrap.innerHTML = `<div class="grid grid-compact">${elabCats.map(cat => `
          <div class="card card-compact" style="cursor:pointer" onclick="openElabFolder('${cat.replace(/'/g,"\\'")}')">
            <h3><i class="ti ti-folder"></i> ${escapeHtml(cat)}</h3>
            <div style="font-size:12px;color:var(--muted)">${elabByCat[cat].length} elaboración${elabByCat[cat].length===1?'':'es'}</div>
          </div>
        `).join('')}</div>`;
        return;
      }
    }
    if(!searching && elabFolder !== null){
      const folderElabs = elabByCat[elabFolder] || [];
      const backBtn = elabCats.length > 1 ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToElabFolders()"><i class="ti ti-arrow-left"></i> Categorías</button>` : '';
      if(!folderElabs.length){
        elabFolder = null; renderStock(); return;
      }
      if(elabItem !== null){
        const row = folderElabs.find(it => it.id === elabItem);
        if(!row){ elabItem = null; renderStock(); return; }
        const low = row.qty <= row.min;
        const isElab = true;
        const backItems = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToElabItems()"><i class="ti ti-arrow-left"></i> ${escapeHtml(elabFolder)}</button>`;
        elabGroupsWrap.innerHTML = backItems + `
          <div class="card" style="max-width:420px">
            <h3 style="margin-bottom:14px">${escapeHtml(row.name)} ${low ? '<span class="badge badge-red"><i class="ti ti-alert-triangle"></i> Bajo mínimo</span>' : '<span class="badge badge-green">OK</span>'}</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <div style="background:${low?'#FDEEE8':'#E8F8F0'};border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:${low?'#c0392b':'#1a7f4b'};margin-bottom:4px">Stock actual</div>
                <div style="font-size:28px;font-weight:800;color:${low?'#c0392b':'#1a7f4b'}">${fmtNum(row.qty)}</div>
                <div style="font-size:12px;color:var(--muted)">${escapeHtml(row.unit)}</div>
              </div>
              <div style="background:var(--brand-cream);border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Stock mínimo</div>
                <div style="font-size:28px;font-weight:800;color:#555">${fmtNum(row.min)}</div>
                <div style="font-size:12px;color:var(--muted)">${escapeHtml(row.unit)}</div>
              </div>
            </div>
            <div class="field" style="margin-bottom:10px">
              <label style="font-size:12px">Cambiar stock mínimo</label>
              <input type="number" value="${row.min}" step="0.01" min="0" style="max-width:140px" ${editUnlocked?'':'disabled'}
                onchange="updateElaboracionMin(${row.id}, this.value)">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm" onclick="adjustElaboracion(${row.id}, 1)"><i class="ti ti-plus"></i> Añadir 1</button>
              <button class="btn btn-sm" onclick="adjustElaboracion(${row.id}, -1)"><i class="ti ti-minus"></i> Quitar 1</button>
              <button class="btn btn-sm" onclick="setElaboracionQty(${row.id})"><i class="ti ti-edit"></i> Ajustar cantidad</button>
              ${row.recipeId ? `<button class="btn btn-sm" onclick="navigate('escandallo');openRecipeModal(${row.recipeId})"><i class="ti ti-chef-hat"></i> Ver escandallo</button>` : ''}
            </div>
          </div>`;
      } else {
        elabGroupsWrap.innerHTML = backBtn + `<div class="table-wrap"><table><tbody>${folderElabs.map(it => {
          const low = it.qty <= it.min;
          return `<tr style="cursor:pointer" onclick="openElabItem(${it.id})">
            <td><strong>${escapeHtml(it.name)}</strong>${it.recipeId?' <span class="badge badge-gray" style="font-size:10px">Escandallo</span>':''}</td>
            <td style="text-align:right">${low ? '<span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle"></i> Bajo mín.</span>' : '<span class="badge badge-green" style="font-size:10px">OK</span>'} <i class="ti ti-chevron-right" style="color:var(--muted)"></i></td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
      }
    }
  }
}

function updateStockMin(ingredientId, value){
  const s = getStockEntry(ingredientId);
  s.min = parseFloat(value) || 0;
  saveDB();
  renderStock();
}

function adjustStock(ingredientId, delta){
  const s = getStockEntry(ingredientId);
  s.qty = Math.max(0, (s.qty||0) + delta);
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
  s.qty = num;
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
  e.qty = Math.max(0, (e.qty||0) + delta);
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
  e.qty = num;
  saveDB();
  closeModal();
  renderStock();
}
