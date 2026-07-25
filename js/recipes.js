
/* ============================================================
   ESCANDALLO — Cálculo automático de costes de platos
   ============================================================ */
function recipeFoodCostPct(r){
  if(!r.price) return Infinity;
  const cost = recipeCost(r);
  return (cost / r.price) * 100;
}
// Coste de una elaboración base (caldo, sofrito, masa...) por unidad de su rendimiento.
// `visited` evita bucles infinitos si una base se referencia a sí misma (directa o indirectamente).
function recipeBaseCostPerUnit(baseRecipe, visited){
  if(!baseRecipe) return 0;
  visited = visited || new Set();
  if(visited.has(baseRecipe.id)) return 0;
  visited.add(baseRecipe.id);
  const total = recipeCostBreakdown(baseRecipe, visited).total;
  const yieldQty = baseRecipe.baseYield || 1;
  return yieldQty > 0 ? total / yieldQty : 0;
}
function recipeIngredientCost(line, visited){
  if(line.type === 'base'){
    const baseRecipe = getRecipe(line.baseRecipeId);
    if(!baseRecipe) return 0;
    const bruto = line.qty * (1 + (line.merma||0)/100);
    return recipeBaseCostPerUnit(baseRecipe, visited) * bruto;
  }
  const ing = getIngredient(line.ingredientId);
  if(!ing) return 0;
  const bruto = line.qty * (1 + (line.merma||0)/100);
  return ing.price * bruto;
}
function recipeCostBreakdown(r, visited){
  const costeIng = (r.ingredients||[]).reduce((sum, line) => sum + recipeIngredientCost(line, visited), 0);
  const consPct = r.consumiblesPct || 0;
  const costeCons = costeIng * consPct / 100;
  return {costeIng, costeCons, total: costeIng + costeCons};
}
function recipeCost(r){
  return recipeCostBreakdown(r).total;
}
function populateRecipeCategoryFilter(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    DB.recipeCategories.map(c => { const name = typeof c === 'object' ? c.name : c; return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`; }).join('') +
    '<option value="__none__">Sin categoría</option>';
  sel.value = current;
}

function groupRecipesByCategory(recipes){
  const groups = {};
  recipes.forEach(r => {
    const cat = r.category || '';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });
  const ordered = [];
  DB.recipeCategories.forEach(cat => {
    if(groups[cat]) ordered.push([cat, groups[cat]]);
  });
  Object.keys(groups).forEach(cat => {
    if(cat && !DB.recipeCategories.includes(cat)) ordered.push([cat, groups[cat]]);
  });
  if(groups['']) ordered.push(['Sin categoría', groups['']]);
  return ordered;
}

let escandalloView = 'grid'; // 'grid' | 'list'
let escandalloTab = 'platos'; // 'platos' | 'elaboraciones'
function setEscandalloView(mode){
  escandalloView = mode;
  renderEscandallo();
}
function setEscandalloTab(tab){
  escandalloTab = tab;
  escandalloFolder = null;
  escandalloRecipe = null;
  renderEscandallo();
}

// Carpeta de categoría actualmente abierta en Escandallo (null = vista de carpetas)
let escandalloFolder = null;
let escandalloRecipe = null;
function openEscandalloFolder(catKey){
  escandalloFolder = catKey;
  escandalloRecipe = null;
  renderEscandallo();
}
function backToEscandalloFolders(){
  escandalloFolder = null;
  escandalloRecipe = null;
  document.getElementById('escandallo-search').value = '';
  renderEscandallo();
}
// Abre el escandallo completo de un plato dentro de la carpeta.
function openEscandalloRecipe(id){
  escandalloRecipe = id;
  renderEscandallo();
}
// Vuelve de la vista de un plato a la lista de nombres de la carpeta.
function backToEscandalloRecipes(){
  escandalloRecipe = null;
  renderEscandallo();
}

// Agrupa los platos por categoría para la vista de carpetas, devolviendo
// [claveCategoria, etiqueta, platos] (clave '__none__' para sin categoría).
function getEscandalloFolders(recipes){
  const groups = {};
  recipes.forEach(r => {
    const key = r.category || '__none__';
    (groups[key] = groups[key] || []).push(r);
  });
  const result = [];
  DB.recipeCategories.forEach(c => { if(groups[c]) result.push([c, c, groups[c]]); });
  Object.keys(groups).forEach(c => { if(c !== '__none__' && !DB.recipeCategories.includes(c)) result.push([c, c, groups[c]]); });
  if(groups['__none__']) result.push(['__none__', 'Sin categoría', groups['__none__']]);
  return result;
}

function renderEscandallo(){
  populateRecipeCategoryFilter('escandallo-filter-cat');
  const search = document.getElementById('escandallo-search').value.toLowerCase();
  const cat = document.getElementById('escandallo-filter-cat').value;
  const isElab = escandalloTab === 'elaboraciones';
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && (isElab ? !!r.isBase : !r.isBase));
  const recipes = areaRecipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search);
    const matchCat = !cat || (cat==='__none__' ? !r.category : r.category===cat);
    return matchSearch && matchCat;
  });
  const box = document.getElementById('escandallo-list');
  document.getElementById('escandallo-tab-platos').classList.toggle('active', !isElab);
  document.getElementById('escandallo-tab-elaboraciones').classList.toggle('active', isElab);

  const newBtns = document.getElementById('escandallo-new-btns');
  if(newBtns){
    if(isElab){
      newBtns.innerHTML = `<button class="owner-only btn btn-primary" onclick="openRecipeModal(null, true)"><i class="ti ti-plus"></i> ${t('tab.newElaboration')}</button>`;
    } else {
      newBtns.innerHTML = `<button class="owner-only btn btn-primary" onclick="openRecipeModal()"><i class="ti ti-plus"></i> ${currentArea()==='sala' ? t('tab.newDrink') : t('tab.newDish')}</button>`;
    }
  }

  document.querySelector('#view-escandallo .view-subtitle').textContent = isElab ? t('tab.elaborationSubtitle') : (currentArea()==='sala' ? t('view.escandallo.subtitle.sala') : t('view.escandallo.subtitle'));
  document.getElementById('escandallo-search').placeholder = isElab ? t('ph.searchElaboration') : t('ph.searchDish');

  document.getElementById('escandallo-view-grid').classList.toggle('active', escandalloView==='grid');
  document.getElementById('escandallo-view-list').classList.toggle('active', escandalloView==='list');

  if(!areaRecipes.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-calculator"></i>${isElab ? t('empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
    return;
  }

  const searching = !!(search || cat);

  if(!searching && escandalloFolder === null){
    // Vista de carpetas por categoría
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="grid grid-compact">${folders.map(([key, label, group]) => `
      <div class="card card-compact" style="cursor:pointer" onclick="openEscandalloFolder('${key.replace(/'/g,"\\'")}')">
        <h3><i class="ti ti-folder"></i> ${escapeHtml(label)}</h3>
        <div style="font-size:12px;color:var(--muted)">${group.length} ${currentArea()==='sala' ? (group.length===1?t('noun.drink'):t('noun.drinks')) : (group.length===1?t('noun.dish'):t('noun.dishes'))}</div>
      </div>
    `).join('')}</div>`;
    return;
  }

  if(!recipes.length){
    const backBtn = (!searching && escandalloFolder !== null) ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToEscandalloFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button>` : '';
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  const visibleRecipes = (!searching && escandalloFolder !== null)
    ? recipes.filter(r => (r.category || '__none__') === escandalloFolder)
    : recipes;

  const backBtn = (!searching && escandalloFolder !== null) ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToEscandalloFolders()"><i class="ti ti-arrow-left"></i> Categorías</button>` : '';

  if(!visibleRecipes.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  const gridClass = escandalloView==='list' ? '' : 'grid grid-compact';

  if(searching){
    box.innerHTML = groupRecipesByCategory(visibleRecipes).map(([catName, group]) => `
      <h3 class="cat-heading">${escapeHtml(catName)}</h3>
      <div class="${gridClass}">${group.map(r => escandalloView==='list' ? renderEscandalloRow(r) : renderEscandalloCard(r)).join('')}</div>
    `).join('');
  } else if(escandalloRecipe !== null){
    // Dentro de la carpeta, con un plato seleccionado: escandallo completo.
    const sel = visibleRecipes.find(r => r.id === escandalloRecipe);
    if(!sel){ escandalloRecipe = null; renderEscandallo(); return; }
    const recBackBtn = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToEscandalloRecipes()"><i class="ti ti-arrow-left"></i> ${escapeHtml(escandalloFolder==='__none__'?'Sin categoría':escandalloFolder)}</button>`;
    box.innerHTML = recBackBtn + renderEscandalloFull(sel);
  } else {
    // Dentro de la carpeta, sin plato seleccionado: solo nombres clicables.
    box.innerHTML = backBtn + `<div class="table-wrap"><table><tbody>${visibleRecipes.map(r => `
      <tr style="cursor:pointer" onclick="openEscandalloRecipe(${r.id})">
        <td><strong><i class="ti ${r.isBase?'ti-soup':'ti-chef-hat'}"></i> ${escapeHtml(r.name)}</strong>${r.isBase?' <span style="font-size:11px;color:var(--muted);font-weight:400">(Base)</span>':''}</td>
        <td style="text-align:right;color:var(--muted)"><i class="ti ti-chevron-right"></i></td>
      </tr>
    `).join('')}</tbody></table></div>`;
  }
}

function renderEscandalloRow(r){
    const breakdown = recipeCostBreakdown(r);
    const cost = breakdown.total;
    if(r.isBase){
      const perUnit = recipeBaseCostPerUnit(r);
      return `
        <div class="list-row">
          <div class="list-row-name"><i class="ti ti-soup"></i> <span>${escapeHtml(r.name)}</span></div>
          <span style="font-size:12px;color:var(--muted)">Coste total ${fmtMoney(cost)} · Rendimiento ${fmtNum(r.baseYield||1)} ${escapeHtml(r.baseUnit||'L')}</span>
          <span class="badge badge-gray">${fmtMoney(perUnit)} / ${escapeHtml(r.baseUnit||'L')}</span>
          <div class="actions-cell">
            <button class="owner-only btn btn-sm btn-icon" onclick="openRecipeModal(${r.id})"><i class="ti ti-edit"></i></button>
            <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteRecipe(${r.id})"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `;
    }
    const pct = recipeFoodCostPct(r);
    const margin = (r.price||0) - cost;
    const pctBadge = !isFinite(pct) ? '<span class="badge badge-gray">Sin PVP</span>'
      : pct > 35 ? `<span class="badge badge-red">${pct.toFixed(1)}% FC</span>`
      : pct > 28 ? `<span class="badge badge-amber">${pct.toFixed(1)}% FC</span>`
      : `<span class="badge badge-green">${pct.toFixed(1)}% FC</span>`;
    return `
      <div class="list-row">
        <div class="list-row-name"><i class="ti ti-chef-hat"></i> <span>${escapeHtml(r.name)}</span></div>
        <span style="font-size:12px;color:var(--muted)">Coste ${fmtMoney(cost)} · PVP ${fmtMoney(r.price||0)} · Margen ${fmtMoney(margin)}</span>
        ${pctBadge}
        <div class="actions-cell">
          <button class="owner-only btn btn-sm btn-icon" onclick="openRecipeModal(${r.id})"><i class="ti ti-edit"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteRecipe(${r.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
}

function renderEscandalloLineLabel(line){
  if(line.type === 'base'){
    const base = getRecipe(line.baseRecipeId);
    return base ? {name: base.name, unit: base.baseUnit||'L'} : null;
  }
  const ing = getIngredient(line.ingredientId);
  return ing ? {name: ing.name, unit: ing.unit} : null;
}

function renderEscandalloFull(r){
    const breakdown = recipeCostBreakdown(r);
    const cost = breakdown.total;
    const pct = recipeFoodCostPct(r);
    const margin = (r.price||0) - cost;
    const perUnit = r.isBase ? recipeBaseCostPerUnit(r) : 0;
    const pctClass = r.isBase ? 'gray' : !isFinite(pct) ? 'gray' : pct > 35 ? 'red' : pct > 28 ? 'amber' : 'green';
    const pctText = r.isBase ? `${fmtMoney(perUnit)} / ${escapeHtml(r.baseUnit||'L')}` : !isFinite(pct) ? 'Sin PVP' : `${pct.toFixed(1)}% FC`;

    const lines = (r.ingredients||[]).map(line => {
      const label = renderEscandalloLineLabel(line);
      if(!label) return '';
      const lineCost = recipeIngredientCost(line);
      const merma = line.merma||0;
      const pctOfTotal = cost > 0 ? ((lineCost/cost)*100).toFixed(1) : '0.0';
      return `<tr><td><strong>${escapeHtml(label.name)}</strong></td><td>${fmtNum(line.qty)} ${escapeHtml(label.unit)}</td><td>${merma>0?merma+'%':'—'}</td><td>${fmtMoney(lineCost)}</td><td style="color:var(--muted)">${pctOfTotal}%</td></tr>`;
    }).join('');

    return `
      <div class="card" style="max-width:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <h3 style="margin:0;font-size:18px"><i class="ti ${r.isBase?'ti-soup':'ti-chef-hat'}"></i> ${escapeHtml(r.name)}${r.isBase?' <span style="font-size:12px;color:var(--muted);font-weight:400">(Elaboración base)</span>':''}</h3>
          <span class="badge badge-${pctClass}">${pctText}</span>
        </div>
        <div class="grid grid-4" style="margin-bottom:14px">
          <div class="kpi"><div class="label">Coste total</div><div class="value" style="font-size:18px">${fmtMoney(cost)}</div></div>
          ${r.isBase ? `
          <div class="kpi"><div class="label">Rendimiento</div><div class="value" style="font-size:18px">${fmtNum(r.baseYield||1)} ${escapeHtml(r.baseUnit||'L')}</div></div>
          <div class="kpi"><div class="label">Coste/${escapeHtml(r.baseUnit||'L')}</div><div class="value" style="font-size:18px">${fmtMoney(perUnit)}</div></div>
          ` : `
          <div class="kpi"><div class="label">PVP</div><div class="value" style="font-size:18px">${fmtMoney(r.price||0)}</div></div>
          <div class="kpi"><div class="label">Margen</div><div class="value" style="font-size:18px;color:${margin>=0?'var(--green)':'var(--red)'}">${fmtMoney(margin)}</div></div>
          <div class="kpi"><div class="label">Food Cost</div><div class="value" style="font-size:18px">${isFinite(pct)?pct.toFixed(1)+'%':'—'}</div></div>
          `}
        </div>
        ${r.comensales || r.consumiblesPct ? `<div style="font-size:13px;color:var(--muted);margin-bottom:10px">
          ${r.comensales ? `👥 ${r.comensales} comensal${r.comensales!==1?'es':''}` : ''}
          ${r.consumiblesPct ? ` · Consumibles: ${r.consumiblesPct}%` : ''}
        </div>` : ''}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Merma</th><th>Coste</th><th>% del total</th></tr></thead>
            <tbody>${lines || '<tr><td colspan="5"><div class="empty" style="padding:14px">Sin ingredientes</div></td></tr>'}</tbody>
          </table>
        </div>
        <div class="actions-cell" style="margin-top:10px">
          <button class="owner-only btn btn-sm" onclick="openRecipeModal(${r.id})"><i class="ti ti-edit"></i> ${t('common.edit')}</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="deleteRecipe(${r.id})"><i class="ti ti-trash"></i> ${t('common.delete')}</button>
        </div>
      </div>
    `;
}

function renderEscandalloCard(r){
    const breakdown = recipeCostBreakdown(r);
    const cost = breakdown.total;
    const pct = recipeFoodCostPct(r);
    const margin = (r.price||0) - cost;
    const perUnit = r.isBase ? recipeBaseCostPerUnit(r) : 0;
    const pctBadge = r.isBase ? `<span class="badge badge-gray">${fmtMoney(perUnit)} / ${escapeHtml(r.baseUnit||'L')}</span>`
      : !isFinite(pct) ? '<span class="badge badge-gray">Sin PVP</span>'
      : pct > 35 ? `<span class="badge badge-red">${pct.toFixed(1)}% FC</span>`
      : pct > 28 ? `<span class="badge badge-amber">${pct.toFixed(1)}% FC</span>`
      : `<span class="badge badge-green">${pct.toFixed(1)}% FC</span>`;

    const lines = (r.ingredients||[]).map(line => {
      const label = renderEscandalloLineLabel(line);
      if(!label) return '';
      const lineCost = recipeIngredientCost(line);
      const merma = line.merma||0;
      return `<tr><td>${escapeHtml(label.name)}</td><td>${fmtNum(line.qty)} ${escapeHtml(label.unit)}</td><td>${merma>0?merma+'%':'—'}</td><td>${fmtMoney(lineCost)}</td></tr>`;
    }).join('');

    return `
      <div class="card card-compact">
        <h3 style="justify-content:space-between">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="ti ${r.isBase?'ti-soup':'ti-chef-hat'}"></i> ${escapeHtml(r.name)}${r.isBase?' <span style="font-size:11px;color:var(--muted);font-weight:400">(Base)</span>':''}</span>
          ${pctBadge}
        </h3>
        <div class="grid grid-3" style="margin-bottom:6px">
          <div class="kpi"><div class="label">Coste total</div><div class="value" style="font-size:14px">${fmtMoney(cost)}</div></div>
          ${r.isBase ? `
          <div class="kpi"><div class="label">Rendimiento</div><div class="value" style="font-size:14px">${fmtNum(r.baseYield||1)} ${escapeHtml(r.baseUnit||'L')}</div></div>
          <div class="kpi"><div class="label">Coste/${escapeHtml(r.baseUnit||'L')}</div><div class="value" style="font-size:14px">${fmtMoney(perUnit)}</div></div>
          ` : `
          <div class="kpi"><div class="label">PVP</div><div class="value" style="font-size:14px">${fmtMoney(r.price||0)}</div></div>
          <div class="kpi"><div class="label">Margen</div><div class="value" style="font-size:14px">${fmtMoney(margin)}</div></div>
          `}
        </div>
        <div style="font-size:12px;color:var(--muted);margin:6px 0">
          ${r.comensales ? `👥 ${r.comensales} comensal${r.comensales!==1?'es':''}` : ''}
          ${r.consumiblesPct ? ` · Consumibles: ${r.consumiblesPct}%` : ''}
        </div>
        <div class="table-wrap" style="margin-bottom:6px">
          <table>
            <thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Merma</th><th>Coste</th></tr></thead>
            <tbody>${lines || '<tr><td colspan="4"><div class="empty" style="padding:14px">Sin ingredientes</div></td></tr>'}</tbody>
          </table>
        </div>
        <div class="actions-cell">
          <button class="owner-only btn btn-sm" onclick="openRecipeModal(${r.id})"><i class="ti ti-edit"></i> Editar</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="deleteRecipe(${r.id})"><i class="ti ti-trash"></i> Eliminar</button>
        </div>
      </div>
    `;
}

let recipeModalLines = [];

function openRecipeModal(id, forceBase){
  const r = id ? getRecipe(id) : {name:'', price:0, comensales:2, consumiblesPct:5, ingredients:[], steps:'', presentation:'', allergens:[], area: currentArea(), isBase:!!forceBase, baseYield:1, baseUnit:'L'};
  recipeModalLines = (r.ingredients||[]).map(l => ({...l}));
  renderRecipeModal(id, r);
}

function renderRecipeModal(id, r){
  const breakdown = recipeCostBreakdown({...r, ingredients: recipeModalLines});
  const area = r.area || currentArea();

  const areaIngredients = DB.ingredients.filter(i => (i.area||'cocina') === area);

  const linesHtml = recipeModalLines.map((line, idx) => {
    const label = renderEscandalloLineLabel(line);
    return `
      <tr>
        <td>${label ? escapeHtml(label.name) + (line.type==='base'?' <span style="font-size:11px;color:var(--muted)">(base)</span>':'') : '—'}</td>
        <td><input type="number" value="${line.qty}" step="0.01" min="0" style="width:80px;padding:4px 6px;border:1px solid var(--border);border-radius:6px" onchange="updateRecipeLineQty(${idx}, this.value, ${id||'null'})"></td>
        <td>${label ? escapeHtml(label.unit) : ''}</td>
        <td><input type="number" value="${line.merma||0}" step="1" min="0" max="99" style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:6px" onchange="updateRecipeLineMerma(${idx}, this.value, ${id||'null'})"></td>
        <td>${label ? fmtMoney(recipeIngredientCost(line)) : '—'}</td>
        <td><button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeRecipeLine(${idx}, ${id||'null'})"><i class="ti ti-x"></i></button></td>
      </tr>
    `;
  }).join('');

  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editDish') : t('title.newDish')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.dishName')}</label>
        <input type="text" id="recipe-name" value="${escapeHtml(r.name)}" placeholder="${t('ph.dishName')}">
      </div>
      <div class="field">
        <label>${t('label.salePrice')}</label>
        <input type="number" id="recipe-price" value="${r.price||0}" step="0.01" min="0">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.diners')}</label>
        <input type="number" id="recipe-comensales" value="${r.comensales||2}" step="1" min="1">
      </div>
      <div class="field">
        <label>${t('label.consumables')}</label>
        <input type="number" id="recipe-consumibles" value="${r.consumiblesPct!=null?r.consumiblesPct:5}" step="0.5" min="0" max="99" oninput="renderRecipeModal(${id||'null'}, currentRecipeFormState(${id||'null'}))">
      </div>
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="recipe-category" onchange="onRecipeCategoryChange(${id||'null'})">
          <option value="">Sin categoría</option>
          ${DB.recipeCategories.map(c=>{ const cn=typeof c==='object'?c.name:c; return `<option value="${escapeHtml(cn)}" ${(r.category||'')===cn?'selected':''}>${escapeHtml(cn)}</option>`; }).join('')}
          <option value="__new__">+ ${t('btn.newCategory')}...</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label style="display:flex;align-items:center;gap:8px;cursor:${id?'default':'pointer'};font-weight:400;${id?'opacity:.7':''}">
        <input type="checkbox" id="recipe-is-base" style="width:auto" ${r.isBase?'checked':''} ${id?'disabled':''} onchange="renderRecipeModal(${id||'null'}, currentRecipeFormState(${id||'null'}))">
        Es una elaboración base (caldo, sofrito, masa...) que se puede usar como ingrediente en otros platos
      </label>
      ${id ? `<p style="font-size:12px;color:var(--muted);margin-top:4px">${t('msg.isBaseLockedAfterCreation')}</p>` : ''}
    </div>
    ${r.isBase ? `
    <div class="field-row">
      <div class="field">
        <label>${t('label.yield')}</label>
        <input type="number" id="recipe-base-yield" value="${r.baseYield!=null?r.baseYield:1}" step="0.01" min="0.01" oninput="renderRecipeModal(${id||'null'}, currentRecipeFormState(${id||'null'}))">
      </div>
      <div class="field">
        <label>${t('common.unit')}</label>
        <select id="recipe-base-unit" onchange="renderRecipeModal(${id||'null'}, currentRecipeFormState(${id||'null'}))">
          ${BASE_UNITS.map(u=>`<option value="${u}" ${(r.baseUnit||'L')===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    ` : ''}

    <div class="field">
      <label>${t('label.ingredients')}</label>
      <div class="table-wrap" style="margin-bottom:8px">
        <table>
          <thead><tr><th>Ingrediente</th><th>Cantidad neta</th><th>Ud</th><th>Merma %</th><th>Coste</th><th></th></tr></thead>
          <tbody>${linesHtml || '<tr><td colspan="6"><div class="empty" style="padding:10px">Añade ingredientes</div></td></tr>'}</tbody>
        </table>
      </div>
      ${areaIngredients.length ? `
      <div class="field-row">
        <div class="field" style="margin-bottom:0;position:relative">
          <input type="text" id="recipe-add-ingredient-search" placeholder="Buscar ingrediente..." autocomplete="off" oninput="filterRecipeIngredientResults(${id||'null'})" onfocus="filterRecipeIngredientResults(${id||'null'})" onblur="setTimeout(()=>hideRecipeIngredientResults(${id||'null'}), 150)">
          <input type="hidden" id="recipe-add-ingredient">
          <div id="recipe-add-ingredient-results" style="display:none;position:absolute;z-index:10;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:220px;overflow:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>
        </div>
        <div class="field" style="margin-bottom:0">
          <input type="number" id="recipe-add-qty" placeholder="Cantidad" step="0.01" min="0" value="1">
        </div>
        <div class="field" style="margin-bottom:0">
          <button class="btn" style="width:100%" onclick="addRecipeLine(${id||'null'})"><i class="ti ti-plus"></i> Añadir</button>
        </div>
      </div>
      ` : `<p style="font-size:13px;color:var(--muted)">Añade primero ingredientes en la Mega Lista.</p>`}
    </div>

    <div class="grid grid-3" style="margin-bottom:10px">
      <div class="kpi"><div class="label">Coste ingredientes</div><div class="value" style="font-size:16px">${fmtMoney(breakdown.costeIng)}</div></div>
      <div class="kpi"><div class="label">Consumibles</div><div class="value" style="font-size:16px">${fmtMoney(breakdown.costeCons)}</div></div>
      <div class="kpi"><div class="label">Coste total</div><div class="value" style="font-size:18px">${fmtMoney(breakdown.total)}</div></div>
    </div>
    ${r.isBase ? `
    <div class="grid grid-2" style="margin-bottom:10px">
      <div class="kpi ok"><div class="label">Coste por ${escapeHtml(r.baseUnit||'L')}</div><div class="value" style="font-size:18px">${fmtMoney(breakdown.total / (parseFloat(r.baseYield)||1))}</div></div>
    </div>
    ` : ''}

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveRecipe(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

function filterRecipeIngredientResults(id){
  const r = id ? getRecipe(id) : null;
  const area = (r && r.area) || currentArea();
  const search = document.getElementById('recipe-add-ingredient-search').value.trim().toLowerCase();
  const results = document.getElementById('recipe-add-ingredient-results');
  const ingMatches = DB.ingredients
    .filter(i => (i.area||'cocina') === area)
    .filter(i => !search || i.name.toLowerCase().includes(search))
    .map(i => ({type:'ingredient', id:i.id, name:i.name, unit:i.unit}));
  const baseMatches = DB.recipes
    .filter(b => b.isBase && (b.area||'cocina') === area && b.id !== id)
    .filter(b => !search || b.name.toLowerCase().includes(search))
    .map(b => ({type:'base', id:b.id, name:b.name, unit:b.baseUnit||'L', perUnit: recipeBaseCostPerUnit(b)}));
  const baseLimited = baseMatches.slice(0, 15);
  const ingLimited = ingMatches.slice(0, 30);
  if(!baseLimited.length && !ingLimited.length){
    results.innerHTML = `<div style="padding:8px 10px;font-size:13px;color:var(--muted)">${t('common.noResults')}</div>`;
  } else {
    const renderItem = m => `
      <div style="padding:8px 10px;font-size:13px;cursor:pointer" onmousedown="selectRecipeIngredientResult(${id||'null'}, '${m.type}', ${m.id})" onmouseover="this.style.background='var(--brand-cream)'" onmouseout="this.style.background=''">
        ${m.type==='base' ? '<i class="ti ti-soup"></i> ' : ''}${escapeHtml(m.name)} <span style="color:var(--muted)">(${m.type==='base'?`Base — ${fmtMoney(m.perUnit)}/${escapeHtml(m.unit)}`:escapeHtml(m.unit)})</span>
      </div>
    `;
    const sectionHeader = label => `<div style="padding:5px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);background:var(--bg-soft,#f4f5f7)">${label}</div>`;
    results.innerHTML =
      (baseLimited.length ? sectionHeader('Elaboraciones') + baseLimited.map(renderItem).join('') : '') +
      (ingLimited.length ? sectionHeader('Ingredientes') + ingLimited.map(renderItem).join('') : '');
  }
  results.style.display = 'block';
}
function hideRecipeIngredientResults(id){
  const results = document.getElementById('recipe-add-ingredient-results');
  if(results) results.style.display = 'none';
}
function selectRecipeIngredientResult(id, type, refId){
  const name = type === 'base' ? (getRecipe(refId)||{}).name : (getIngredient(refId)||{}).name;
  document.getElementById('recipe-add-ingredient').value = `${type}:${refId}`;
  document.getElementById('recipe-add-ingredient-search').value = name || '';
  hideRecipeIngredientResults(id);
}

function addRecipeLine(id){
  const raw = document.getElementById('recipe-add-ingredient').value;
  const qty = parseFloat(document.getElementById('recipe-add-qty').value) || 0;
  const [type, refIdStr] = raw.split(':');
  const refId = parseInt(refIdStr);
  if(!refId || qty <= 0){ showToast(t('msg.selectIngredientQty')); return; }
  if(type === 'base'){
    const existing = recipeModalLines.find(l => l.type === 'base' && l.baseRecipeId === refId);
    if(existing){ existing.qty += qty; }
    else { recipeModalLines.push({type:'base', baseRecipeId: refId, qty, merma:0}); }
  } else {
    const existing = recipeModalLines.find(l => l.type !== 'base' && l.ingredientId === refId);
    if(existing){ existing.qty += qty; }
    else { recipeModalLines.push({type:'ingredient', ingredientId: refId, qty, merma:0}); }
  }
  renderRecipeModal(id, currentRecipeFormState(id));
}
function updateRecipeLineQty(idx, value, id){
  const qty = parseFloat(value) || 0;
  recipeModalLines[idx].qty = qty;
  renderRecipeModal(id, currentRecipeFormState(id));
}
function updateRecipeLineMerma(idx, value, id){
  const merma = parseFloat(value) || 0;
  recipeModalLines[idx].merma = merma;
  renderRecipeModal(id, currentRecipeFormState(id));
}
function removeRecipeLine(idx, id){
  recipeModalLines.splice(idx,1);
  renderRecipeModal(id, currentRecipeFormState(id));
}
let recipeFormStateBeforeCategory = null;
function onRecipeCategoryChange(id){
  const sel = document.getElementById('recipe-category');
  if(sel.value === '__new__'){
    recipeFormStateBeforeCategory = currentRecipeFormState(id);
    openModal(`
      <div class="modal-header">
        <h3>${t('btn.newCategory')}</h3>
        <button class="modal-close" onclick="cancelNewRecipeCategory(${id||'null'})">&times;</button>
      </div>
      <div class="field">
        <label>${t('common.name')}</label>
        <input type="text" id="new-recipe-category-name" placeholder="${t('ph.categoryDish')}">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="cancelNewRecipeCategory(${id||'null'})">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="confirmNewRecipeCategory(${id||'null'})">${t('common.add')}</button>
      </div>
    `);
    setTimeout(()=>document.getElementById('new-recipe-category-name')?.focus(), 50);
  }
}
function cancelNewRecipeCategory(id){
  const state = recipeFormStateBeforeCategory || currentRecipeFormState(id);
  state.category = '';
  recipeFormStateBeforeCategory = null;
  renderRecipeModal(id, state);
}
function confirmNewRecipeCategory(id){
  const name = document.getElementById('new-recipe-category-name').value;
  const state = recipeFormStateBeforeCategory || currentRecipeFormState(id);
  if(name && name.trim()){
    const cat = name.trim();
    if(!DB.recipeCategories.includes(cat)){ DB.recipeCategories.push(cat); saveDB(); }
    state.category = cat;
  } else {
    state.category = '';
  }
  recipeFormStateBeforeCategory = null;
  renderRecipeModal(id, state);
}
function currentRecipeFormState(id){
  const nameEl = document.getElementById('recipe-name');
  const priceEl = document.getElementById('recipe-price');
  const comensalesEl = document.getElementById('recipe-comensales');
  const consumiblesEl = document.getElementById('recipe-consumibles');
  const categoryEl = document.getElementById('recipe-category');
  const isBaseEl = document.getElementById('recipe-is-base');
  const baseYieldEl = document.getElementById('recipe-base-yield');
  const baseUnitEl = document.getElementById('recipe-base-unit');
  const r = id ? getRecipe(id) : {};
  return {
    name: nameEl ? nameEl.value : (r.name||''),
    price: priceEl ? priceEl.value : (r.price||0),
    comensales: comensalesEl ? comensalesEl.value : (r.comensales||2),
    consumiblesPct: consumiblesEl ? consumiblesEl.value : (r.consumiblesPct!=null?r.consumiblesPct:5),
    category: categoryEl ? categoryEl.value : (r.category||''),
    isBase: isBaseEl ? isBaseEl.checked : !!r.isBase,
    baseYield: baseYieldEl ? baseYieldEl.value : (r.baseYield!=null?r.baseYield:1),
    baseUnit: baseUnitEl ? baseUnitEl.value : (r.baseUnit||'L'),
    area: r.area || currentArea(),
  };
}

function saveRecipe(id){
  const name = document.getElementById('recipe-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const price = parseFloat(document.getElementById('recipe-price').value) || 0;
  const comensales = parseInt(document.getElementById('recipe-comensales').value) || 1;
  const consumiblesPct = parseFloat(document.getElementById('recipe-consumibles').value) || 0;
  const categoryEl = document.getElementById('recipe-category');
  const category = categoryEl ? categoryEl.value : '';
  const isBaseEl = document.getElementById('recipe-is-base');
  const isBase = isBaseEl ? isBaseEl.checked : false;
  const baseYield = isBase ? (parseFloat(document.getElementById('recipe-base-yield').value) || 1) : 1;
  const baseUnit = isBase ? document.getElementById('recipe-base-unit').value : 'L';
  const ingredients = recipeModalLines.map(l => ({...l}));

  // Alérgenos derivados de los ingredientes y de las bases usadas
  const allergenSet = new Set();
  ingredients.forEach(line => {
    if(line.type === 'base'){
      const base = getRecipe(line.baseRecipeId);
      (base && base.allergens || []).forEach(a => allergenSet.add(a));
      return;
    }
    const ing = getIngredient(line.ingredientId);
    (ing && ing.allergens || []).forEach(a => allergenSet.add(a));
  });

  let recipeId = id;
  if(id){
    const r = getRecipe(id);
    if(!r) return;
    // "Elaboración base" solo se decide al crear el plato/elaboración (el
    // checkbox está deshabilitado al editar uno existente) — así una
    // elaboración nunca puede acabar puesta a la venta como plato, ni
    // viceversa.
    Object.assign(r, {name, price, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], isBase: r.isBase, baseYield, baseUnit});
  }else{
    recipeId = genId();
    DB.recipes.push({id: recipeId, name, price, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], area: currentArea(), isBase, baseYield, baseUnit});
  }
  syncElaboracionForRecipe(recipeId, isBase, name, baseUnit);
  saveDB();
  closeModal();
  renderEscandallo();
  showToast(t('msg.dishSaved'));
}

// Mantiene sincronizada la entrada de Stock > Elaboraciones con los platos
// marcados como "elaboración base" en el Escandallo.
function syncElaboracionForRecipe(recipeId, isBase, name, unit){
  if(!DB.elaboraciones) DB.elaboraciones = [];
  const existing = DB.elaboraciones.find(e => e.recipeId === recipeId);
  if(isBase){
    if(existing){ existing.name = name; existing.unit = unit; }
    else { DB.elaboraciones.push({id: genId(), recipeId, name, unit, qty:0, min:0, area: currentArea()}); }
  } else if(existing){
    DB.elaboraciones = DB.elaboraciones.filter(e => e.recipeId !== recipeId);
  }
}

// Secciones de carta donde este plato/receta está puesto a la venta ahora
// mismo, para avisar antes de borrarlo (si no, desaparece de la carta sin
// avisar). Devuelve [{carta, seccion}, ...].
function cartaPlatosUsingRecipe(id){
  const hits = [];
  (DB.cartas||[]).forEach(c => {
    (c.secciones||[]).forEach(sec => {
      if((sec.platos||[]).some(p => p.recipeId === id)) hits.push({carta:c, seccion:sec});
    });
  });
  return hits;
}
// Otras recetas que usan esta (una elaboración base) como componente, para
// avisar antes de borrarla — si no, esas recetas se quedan con un coste
// más bajo del real, sin ningún aviso.
function recipesUsingBaseRecipe(id){
  return DB.recipes.filter(r => r.id!==id && (r.ingredients||[]).some(line => line.type==='base' && line.baseRecipeId===id));
}
function deleteRecipe(id){
  const r = DB.recipes.find(x=>x.id===id);
  const cartaHits = cartaPlatosUsingRecipe(id);
  const dependentRecipes = recipesUsingBaseRecipe(id);
  if(cartaHits.length || dependentRecipes.length){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-alert-triangle"></i> ${t('title.dishInUse')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      ${cartaHits.length ? `
        <p style="font-size:13px">${t('msg.dishInCartaWarning').replace('${name}', escapeHtml(r?r.name:''))}</p>
        <div style="max-height:160px;overflow-y:auto;margin:6px 0 12px;border:1px solid var(--border);border-radius:8px">
          ${cartaHits.map(h=>`<div class="ge-item"><span style="flex:1;font-weight:600">${escapeHtml(h.carta.nombre)}</span><span style="color:var(--muted)">${escapeHtml(h.seccion.nombre)}</span></div>`).join('')}
        </div>
      ` : ''}
      ${dependentRecipes.length ? `
        <p style="font-size:13px">${t('msg.baseRecipeInUseWarning').replace('${name}', escapeHtml(r?r.name:''))}</p>
        <div style="max-height:160px;overflow-y:auto;margin:6px 0 12px;border:1px solid var(--border);border-radius:8px">
          ${dependentRecipes.map(dr=>`<div class="ge-item"><span style="flex:1;font-weight:600">${escapeHtml(dr.name)}</span></div>`).join('')}
        </div>
      ` : ''}
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-danger" onclick="confirmDeleteRecipe(${id})">${t('btn.deleteAnyway')}</button>
      </div>
    `);
    return;
  }
  if(!confirm(t('msg.confirmDeleteDish'))) return;
  confirmDeleteRecipe(id);
}
function confirmDeleteRecipe(id){
  DB.recipes = DB.recipes.filter(r => r.id !== id);
  DB.elaboraciones = (DB.elaboraciones||[]).filter(e => e.recipeId !== id);
  // La ficha técnica vinculada documenta este plato en concreto: si el
  // plato se borra del Escandallo, se borra con él en vez de dejarla
  // huérfana mostrando datos de una foto fija desactualizada.
  DB.fichas = (DB.fichas||[]).filter(f => f.recipeId !== id);
  DB.cartas.forEach(c => {
    (c.secciones||[]).forEach(sec => {
      sec.platos = (sec.platos||[]).filter(p => p.recipeId !== id);
    });
  });
  saveDB();
  closeModal();
  renderEscandallo();
  showToast(t('msg.dishDeleted'));
}

/* ============================================================
   FICHAS TÉCNICAS — Elaboración estándar y alérgenos
   ============================================================ */
const ALLERGEN_LIST = ['Gluten','Crustáceos','Huevos','Pescado','Cacahuetes','Soja','Lácteos','Frutos de cáscara','Apio','Mostaza','Sésamo','Sulfitos','Altramuces','Moluscos'];
const FICHA_TEMPS = ['CALIENTE','FRÍO','AMBIENTE'];

let fichaModalState = null;

function getFicha(id){ return DB.fichas.find(f => f.id === id); }

let fichasView = 'grid'; // 'grid' | 'list'
let fichasTab = 'platos'; // 'platos' | 'elaboraciones'
function setFichasView(mode){
  fichasView = mode;
  renderFichas();
}
function setFichasTab(tab){
  fichasTab = tab;
  fichasFolder = null;
  renderFichas();
}

// Carpeta de categoría actualmente abierta en Fichas Técnicas (null = vista de carpetas)
let fichasFolder = null;
function openFichaFolder(catKey){
  fichasFolder = catKey;
  renderFichas();
}
function backToFichaFolders(){
  fichasFolder = null;
  document.getElementById('fichas-search').value = '';
  renderFichas();
}

function renderFichas(){
  populateRecipeCategoryFilter('fichas-filter-cat');
  const search = document.getElementById('fichas-search').value.toLowerCase();
  const cat = document.getElementById('fichas-filter-cat').value;
  const isElab = fichasTab === 'elaboraciones';
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && (isElab ? !!r.isBase : !r.isBase));
  const recipes = areaRecipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search);
    const matchCat = !cat || (cat==='__none__' ? !r.category : r.category===cat);
    return matchSearch && matchCat;
  });
  const box = document.getElementById('fichas-list');
  let html = '';

  document.getElementById('fichas-tab-platos').classList.toggle('active', !isElab);
  document.getElementById('fichas-tab-elaboraciones').classList.toggle('active', isElab);

  document.getElementById('fichas-view-grid').classList.toggle('active', fichasView==='grid');
  document.getElementById('fichas-view-list').classList.toggle('active', fichasView==='list');

  if(!areaRecipes.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-file-description"></i>${isElab ? t('empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
    return;
  }

  const searching = !!(search || cat);
  const gridClass = fichasView==='list' ? '' : 'grid grid-compact';
  const renderCard = r => fichasView==='list' ? renderFichaRow(r) : renderFichaCard(r);

  if(!searching && fichasFolder === null){
    // Vista de carpetas por categoría
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="grid grid-compact">${folders.map(([key, label, group]) => `
      <div class="card card-compact" style="cursor:pointer" onclick="openFichaFolder('${key.replace(/'/g,"\\'")}')">
        <h3><i class="ti ti-folder"></i> ${escapeHtml(label)}</h3>
        <div style="font-size:12px;color:var(--muted)">${group.length} plato${group.length===1?'':'s'}</div>
      </div>
    `).join('')}</div>`;
    return;
  }

  const backBtn = (!searching && fichasFolder !== null) ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToFichaFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button>` : '';

  const visibleRecipes = (!searching && fichasFolder !== null)
    ? recipes.filter(r => (r.category || '__none__') === fichasFolder)
    : recipes;

  if(!visibleRecipes.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  if(searching){
    html += groupRecipesByCategory(visibleRecipes).map(([catName, group]) => `
      <h3 class="cat-heading">${escapeHtml(catName)}</h3>
      <div class="${gridClass}">${group.map(renderCard).join('')}</div>
    `).join('');
  } else {
    html += backBtn + `<div class="${gridClass}">${visibleRecipes.map(renderCard).join('')}</div>`;
  }

  const orphanFichas = (!searching && fichasFolder !== null) ? [] : DB.fichas.filter(f => (!f.recipeId || !getRecipe(f.recipeId)) && (f.area||'cocina') === currentArea() && (!search || f.name.toLowerCase().includes(search)));
  if(orphanFichas.length){
    html += `<h3 class="cat-heading">Fichas sin vincular a un plato</h3><div class="${gridClass}">` + orphanFichas.map(f => fichasView==='list' ? `
      <div class="list-row" style="cursor:pointer" onclick="openFichaModal(${f.id})">
        <div class="list-row-name"><i class="ti ti-file-description"></i> <span>${escapeHtml(f.name)}</span></div>
        <div class="actions-cell">
          <button class="btn btn-sm btn-icon" onclick="event.stopPropagation();printFicha(${f.id})"><i class="ti ti-printer"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="event.stopPropagation();deleteFicha(${f.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    ` : `
      <div class="card card-compact" style="cursor:pointer" onclick="openFichaModal(${f.id})">
        <h3 style="justify-content:space-between"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="ti ti-file-description"></i> ${escapeHtml(f.name)}</span></h3>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();printFicha(${f.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="event.stopPropagation();deleteFicha(${f.id})"><i class="ti ti-trash"></i> ${t('common.delete')}</button>
        </div>
      </div>
    `).join('') + `</div>`;
  }

  box.innerHTML = html;
}

function renderFichaRow(r){
  const ficha = DB.fichas.find(f => f.recipeId === r.id);
  return `
    <div class="list-row" style="cursor:pointer" onclick="${ficha ? `openFichaModal(${ficha.id})` : `openFichaModal(null, ${r.id})`}">
      <div class="list-row-name"><i class="ti ti-file-description"></i> <span>${escapeHtml(r.name)}</span></div>
      ${ficha ? '<span class="badge badge-green">Vinculada</span>' : '<span class="badge badge-amber">Sin ficha</span>'}
      ${ficha ? `
        <div class="actions-cell">
          <button class="btn btn-sm btn-icon" onclick="event.stopPropagation();printFicha(${ficha.id})"><i class="ti ti-printer"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="event.stopPropagation();deleteFicha(${ficha.id})"><i class="ti ti-trash"></i></button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderFichaCard(r){
  const ficha = DB.fichas.find(f => f.recipeId === r.id);
  return `
    <div class="card card-compact" style="cursor:pointer" onclick="${ficha ? `openFichaModal(${ficha.id})` : `openFichaModal(null, ${r.id})`}">
      <h3 style="justify-content:space-between">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="ti ti-file-description"></i> ${escapeHtml(r.name)}</span>
        ${ficha ? '<span class="badge badge-green">Vinculada</span>' : '<span class="badge badge-amber">Sin ficha</span>'}
      </h3>
      ${ficha ? `
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();printFicha(${ficha.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="event.stopPropagation();deleteFicha(${ficha.id})"><i class="ti ti-trash"></i> ${t('common.delete')}</button>
        </div>
      ` : `<div style="font-size:12px;color:var(--muted)">${t('title.newTechSheet')}</div>`}
    </div>
  `;
}

// Devuelve las líneas de ingredientes (cantidad para 1 ración base, unidad y nombre)
// del escandallo vinculado a la ficha, para poder recalcularlas según la producción.
function getFichaIngredientLines(f){
  const r = f.recipeId ? getRecipe(f.recipeId) : null;
  if(r){
    return (r.ingredients||[]).map(line => {
      const info = renderEscandalloLineLabel(line);
      return info ? {qty: line.qty, unit: info.unit, name: info.name} : null;
    }).filter(Boolean);
  }
  // Sin escandallo vinculado: usar las cantidades guardadas como texto, sin recalcular
  return (f.ingredients||[]).filter(Boolean).map(s => ({qty: null, unit:'', name: s}));
}

function openFichaModal(id, recipeId){
  if(id){
    const f = getFicha(id);
    fichaModalState = JSON.parse(JSON.stringify(f));
    // La nube no guarda listas vacías: restaurarlas si faltan
    if(!Array.isArray(fichaModalState.ingredients) || !fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!Array.isArray(fichaModalState.pasos) || !fichaModalState.pasos.length) fichaModalState.pasos = [''];
    if(!Array.isArray(fichaModalState.allergens)) fichaModalState.allergens = [];
    if(!fichaModalState.baseComensales) fichaModalState.baseComensales = fichaModalState.comensales || 1;
    if(!fichaModalState.produccion) fichaModalState.produccion = fichaModalState.comensales || fichaModalState.baseComensales;
  } else if(recipeId){
    const r = getRecipe(recipeId);
    fichaModalState = {
      id: null, name: r.name, recipeId: r.id, comensales: r.comensales||2,
      baseComensales: r.comensales||1, produccion: r.comensales||1,
      tiempo: '', temp: 'CALIENTE',
      ingredients: (r.ingredients||[]).map(line => {
        const ing = getIngredient(line.ingredientId);
        return ing ? `${fmtNum(line.qty)} ${ing.unit} — ${ing.name}` : '';
      }).filter(Boolean),
      pasos: r.steps ? r.steps.split('\n').filter(Boolean) : [''],
      allergens: [...(r.allergens||[])],
      presentation: r.presentation || ''
    };
    if(!fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!fichaModalState.pasos.length) fichaModalState.pasos = [''];
  } else {
    fichaModalState = {id:null, name:'', recipeId:'', comensales:2, baseComensales:1, produccion:1, tiempo:'', temp:'CALIENTE', ingredients:[''], pasos:[''], allergens:[], presentation:''};
  }
  renderFichaModal();
}

function updateFichaProduccion(value){
  syncFichaModalFields();
  fichaModalState.produccion = Math.max(1, parseFloat(value)||1);
  if(fichaModalState.id){
    const ficha = getFicha(fichaModalState.id);
    if(ficha){ ficha.produccion = fichaModalState.produccion; saveDB(); }
  }
  renderFichaModal();
}

function renderFichaModal(){
  const f = fichaModalState;
  const ro = !editUnlocked;
  const roAttr = ro ? 'disabled' : '';
  // Los datos que vienen del escandallo (nombre, vinculación, comensales e ingredientes)
  // siempre quedan bloqueados: la ficha técnica solo aporta información de elaboración.
  const lockedAttr = 'disabled';

  const recipeOptions = `<option value="">— Sin vincular —</option>` + DB.recipes.filter(r => (r.area||'cocina') === currentArea()).map(r =>
    `<option value="${r.id}"${r.id===f.recipeId?' selected':''}>${escapeHtml(r.name)}</option>`
  ).join('');

  const baseComensales = f.baseComensales || f.comensales || 1;
  const produccion = f.produccion || baseComensales;
  const factor = (baseComensales && baseComensales > 0) ? (produccion / baseComensales) : 1;
  const ingredientLines = getFichaIngredientLines(f);
  const ingredientsHtml = ingredientLines.map(l => `
    <div class="ingredient-pill">${l.qty!=null ? `${fmtNum(l.qty*factor)} ${escapeHtml(l.unit)} — ` : ''}${escapeHtml(l.name)}</div>
  `).join('');

  const stepsHtml = f.pasos.map((p, idx) => `
    <div class="step-row">
      <div class="step-num">${idx+1}</div>
      <textarea placeholder="Describe el paso de elaboración..." style="flex:1" oninput="updateFichaStep(${idx}, this.value)" ${roAttr}>${escapeHtml(p)}</textarea>
      <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeFichaStep(${idx})" ${f.pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
    </div>
  `).join('');

  const allergenHtml = ALLERGEN_LIST.map(a => `
    <div class="alg-pill${(f.allergens||[]).includes(a)?' on':''}" ${ro?'':`onclick="toggleFichaAllergen('${escapeHtml(a)}')"`} style="${ro?'cursor:default':''}">${a}</div>
  `).join('');

  openModal(`
    <div class="modal-header">
      <h3>${f.id ? (ro?t('title.viewTechSheet'):t('title.editTechSheet')) : t('title.newTechSheet')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.dishName')}</label>
        <input type="text" id="ficha-name" value="${escapeHtml(f.name)}" placeholder="${t('ph.dishName')}" ${lockedAttr}>
      </div>
      <div class="field">
        <label>${t('label.linkToCosting')}</label>
        <select id="ficha-recipe" ${lockedAttr}>${recipeOptions}</select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('label.diners')}</label>
        <input type="number" id="ficha-comensales" value="${f.comensales||2}" step="1" min="1" ${lockedAttr}>
      </div>
      <div class="field">
        <label>${t('label.production')}</label>
        <input type="number" id="ficha-produccion" value="${produccion}" step="1" min="1" onchange="updateFichaProduccion(this.value)">
      </div>
      <div class="field">
        <label>${t('label.prepTime')}</label>
        <input type="number" id="ficha-tiempo" value="${f.tiempo||''}" step="1" min="0" ${roAttr}>
      </div>
      <div class="field">
        <label>${t('label.servingTemp')}</label>
        <select id="ficha-temp" ${roAttr}>${FICHA_TEMPS.map(t=>`<option value="${t}"${t===f.temp?' selected':''}>${t}</option>`).join('')}</select>
      </div>
    </div>

    <div class="field">
      <label>${t('label.ingredients')}</label>
      <div id="ficha-ingredients" class="ingredients-grid">${ingredientsHtml}</div>
    </div>

    <div class="field">
      <label>${t('label.preparation')}</label>
      <div id="ficha-steps">${stepsHtml}</div>
      <button class="owner-only btn btn-sm" onclick="addFichaStep()"><i class="ti ti-plus"></i> Añadir paso</button>
    </div>

    <div class="field">
      <label>${t('label.plating')}</label>
      <textarea id="ficha-presentation" placeholder="Notas de presentación..." ${roAttr}>${escapeHtml(f.presentation||'')}</textarea>
    </div>

    <div class="field">
      <label>${t('label.allergens')}</label>
      <div class="alg-grid">${allergenHtml}</div>
    </div>

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${ro?t('common.close'):t('common.cancel')}</button>
      <button class="owner-only btn btn-primary" onclick="saveFicha()">${t('common.save')}</button>
    </div>
  `, {xl:true});
}

function syncFichaModalFields(){
  const f = fichaModalState;
  const nameEl = document.getElementById('ficha-name');
  const recipeEl = document.getElementById('ficha-recipe');
  const comensalesEl = document.getElementById('ficha-comensales');
  const tiempoEl = document.getElementById('ficha-tiempo');
  const tempEl = document.getElementById('ficha-temp');
  const presEl = document.getElementById('ficha-presentation');
  if(nameEl) f.name = nameEl.value;
  if(recipeEl) f.recipeId = recipeEl.value ? parseInt(recipeEl.value) : '';
  if(comensalesEl) f.comensales = comensalesEl.value;
  if(tiempoEl) f.tiempo = tiempoEl.value;
  if(tempEl) f.temp = tempEl.value;
  if(presEl) f.presentation = presEl.value;
}


function updateFichaStep(idx, value){ fichaModalState.pasos[idx] = value; }
function addFichaStep(){ syncFichaModalFields(); fichaModalState.pasos.push(''); renderFichaModal(); }
function removeFichaStep(idx){
  if(fichaModalState.pasos.length<=1) return;
  syncFichaModalFields();
  fichaModalState.pasos.splice(idx,1);
  renderFichaModal();
}

function toggleFichaAllergen(a){
  syncFichaModalFields();
  if(!fichaModalState.allergens) fichaModalState.allergens = [];
  const i = fichaModalState.allergens.indexOf(a);
  if(i>=0) fichaModalState.allergens.splice(i,1); else fichaModalState.allergens.push(a);
  renderFichaModal();
}

function saveFicha(){
  syncFichaModalFields();
  const f = fichaModalState;
  const name = (f.name||'').trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const data = {
    name,
    recipeId: f.recipeId || '',
    comensales: parseInt(f.comensales)||1,
    baseComensales: f.baseComensales || parseInt(f.comensales) || 1,
    produccion: f.produccion || parseInt(f.comensales) || 1,
    tiempo: f.tiempo ? parseInt(f.tiempo) : '',
    temp: f.temp || 'CALIENTE',
    ingredients: f.ingredients.filter(i => i && i.trim()),
    pasos: f.pasos.filter(p => p && p.trim()),
    allergens: f.allergens || [],
    presentation: (f.presentation||'').trim()
  };
  if(f.id){
    const ficha = getFicha(f.id);
    if(!ficha) return;
    Object.assign(ficha, data);
  } else {
    DB.fichas.push({id: genId(), ...data, area: currentArea()});
  }
  saveDB();
  closeModal();
  renderFichas();
  showToast(t('msg.techSheetSaved'));
}

function deleteFicha(id){
  if(!confirm(t('msg.confirmDeleteTechSheet'))) return;
  DB.fichas = DB.fichas.filter(f => f.id !== id);
  saveDB();
  renderFichas();
  showToast(t('msg.techSheetDeleted'));
}

function printFicha(id){
  const f = getFicha(id);
  if(!f) return;
  const algs = (f.allergens||[]).length
    ? f.allergens.map(a=>`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:4px;font-size:10pt;margin:2px;display:inline-block">${escapeHtml(a)}</span>`).join('')
    : 'Ninguno';
  const baseComensales = f.baseComensales || f.comensales || 1;
  const produccion = f.produccion || baseComensales;
  const factor = (baseComensales && baseComensales > 0) ? (produccion / baseComensales) : 1;
  const ingredientLines = getFichaIngredientLines(f);
  const ings = ingredientLines.map(l=>`<li style="margin:3px 0">${l.qty!=null ? `${fmtNum(l.qty*factor)} ${escapeHtml(l.unit)} — ` : ''}${escapeHtml(l.name)}</li>`).join('');
  const steps = (f.pasos||[]).map((p,i)=>`<div style="margin-bottom:10px"><strong>${i+1}.</strong> ${escapeHtml(p)}</div>`).join('');
  const win = window.open('', '_blank', 'width=800,height=1000');
  if(!win){ showToast('Permite las ventanas emergentes para imprimir'); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(f.name)}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:20mm 18mm;max-width:180mm;margin:0 auto}
  h1{font-size:18pt;margin:0 0 4px}h2{font-size:11pt;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin:16px 0 8px}
  .meta{display:flex;gap:20px;font-size:10pt;color:#555;margin-bottom:16px}.meta span{background:#f5f5f3;padding:4px 10px;border-radius:4px}
  ul{margin:0;padding-left:18px}@media print{body{padding:15mm 12mm}}</style></head><body>
  <h1>${escapeHtml(f.name)}</h1>
  <div class="meta">
    ${produccion?`<span>👥 ${fmtNum(produccion)} ración${produccion!==1?'es':''}</span>`:''}
    ${f.tiempo?`<span>⏱ ${f.tiempo} min</span>`:''}
    ${f.temp?`<span>${escapeHtml(f.temp)}</span>`:''}
  </div>
  <h2>Ingredientes</h2><ul>${ings || '<li>Sin ingredientes</li>'}</ul>
  <h2>Modo de elaboración</h2>${steps || '<p>Sin especificar</p>'}
  <h2>Presentación</h2><p>${escapeHtml(f.presentation) || 'Sin especificar'}</p>
  <h2>Alérgenos</h2><div>${algs}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

