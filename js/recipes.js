
/* ============================================================
   ESCANDALLO — Cálculo automático de costes de platos
   ============================================================ */
function recipeFoodCostPct(r){
  if(!r.price) return Infinity;
  const cost = recipeCost(r);
  return (cost / r.price) * 100;
}
// Coste de una elaboración base (caldo, sofrito, masa...) por unidad de su rendimiento.
// `visited` evita bucles infinitos si una base se referencia a sí misma (directa o
// indirectamente) — representa la RUTA actual de la recursión (ancestros), no "todo lo
// visitado alguna vez". Por eso se borra al volver (backtrack): si no se borrara, una
// misma base reutilizada en dos ramas distintas del mismo árbol (que no es un ciclo real)
// se contaría con coste 0 la segunda vez, infravalorando el coste del plato en silencio.
// `ctx` (opcional, {circular:false}) se rellena a true si en algún punto de
// la recursión se detecta un ciclo real (visited.has) — se usa solo para
// poder avisar en la UI (ver recipeHasCircularReference); el cálculo del
// coste en sí sigue devolviendo 0 para ese tramo, igual que siempre.
function recipeBaseCostPerUnit(baseRecipe, visited, ctx){
  if(!baseRecipe) return 0;
  visited = visited || new Set();
  if(visited.has(baseRecipe.id)){
    if(ctx) ctx.circular = true;
    return 0;
  }
  visited.add(baseRecipe.id);
  const total = recipeCostBreakdown(baseRecipe, visited, ctx).total;
  visited.delete(baseRecipe.id);
  const yieldQty = baseRecipe.baseYield || 1;
  return yieldQty > 0 ? total / yieldQty : 0;
}
function recipeIngredientCost(line, visited, ctx){
  if(line.type === 'base'){
    const baseRecipe = getRecipe(line.baseRecipeId);
    if(!baseRecipe) return 0;
    const bruto = line.qty * (1 + (line.merma||0)/100);
    return recipeBaseCostPerUnit(baseRecipe, visited, ctx) * bruto;
  }
  const ing = getIngredient(line.ingredientId);
  if(!ing) return 0;
  const bruto = line.qty * (1 + (line.merma||0)/100);
  return ing.price * bruto;
}
function recipeCostBreakdown(r, visited, ctx){
  const costeIng = (r.ingredients||[]).reduce((sum, line) => sum + recipeIngredientCost(line, visited, ctx), 0);
  const consPct = r.consumiblesPct || 0;
  const costeCons = costeIng * consPct / 100;
  return {costeIng, costeCons, total: costeIng + costeCons};
}
function recipeCost(r){
  return recipeCostBreakdown(r).total;
}
// Para avisar en Escandallo si el coste de este plato/elaboración está
// infravalorado por una referencia circular entre elaboraciones base
// (A usa B, B usa A, directa o indirectamente) — sin esto, el food cost
// simplemente salía sospechosamente bajo sin explicación.
function recipeHasCircularReference(r){
  const ctx = {circular:false};
  recipeCostBreakdown(r, new Set(), ctx);
  return ctx.circular;
}
// Categorías de recetas visibles para el área actual: strings antiguas (sin etiquetar)
// se consideran compartidas; los objetos {name, area} solo se muestran en su área.
function areaRecipeCategories(){
  return DB.recipeCategories.filter(c => typeof c !== 'object' || !c.area || c.area === currentArea());
}

// Antes este desplegable enseñaba SIEMPRE todas las categorías del área
// (platos Y elaboraciones mezcladas), aunque estuvieras en la pestaña de
// Elaboraciones y esa categoría fuera solo de un plato normal (o al
// revés) — elegirla no daba ningún error, solo una lista vacía sin
// explicación. Ahora, si se pasan `recipesInScope` (los platos o
// elaboraciones de la pestaña activa, ya filtrados), solo se listan las
// categorías que de verdad tienen algo en esa pestaña — mismo criterio
// que ya usaba la vista de carpetas (getEscandalloFolders).
function populateRecipeCategoryFilter(selectId, recipesInScope){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const current = sel.value;
  const catNames = areaRecipeCategories().map(c => typeof c === 'object' ? c.name : c);
  const relevantNames = recipesInScope
    ? catNames.filter(name => recipesInScope.some(r => (r.category||'') === name))
    : catNames;
  sel.innerHTML = `<option value="">${t('label.allCategories')}</option>` +
    relevantNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('') +
    `<option value="__none__">${t('label.noCategory')}</option>`;
  sel.value = relevantNames.includes(current) || current === '__none__' || current === '' ? current : '';
}

function groupRecipesByCategory(recipes){
  const groups = {};
  recipes.forEach(r => {
    const cat = r.category || '';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });
  const ordered = [];
  const catNames = areaRecipeCategories().map(c => typeof c==='object'?c.name:c);
  catNames.forEach(cat => {
    if(groups[cat]) ordered.push([cat, groups[cat]]);
  });
  Object.keys(groups).forEach(cat => {
    if(cat && !catNames.includes(cat)) ordered.push([cat, groups[cat]]);
  });
  if(groups['']) ordered.push([t('label.noCategory'), groups['']]);
  return ordered;
}

let escandalloTab = 'platos'; // 'platos' | 'elaboraciones'
function setEscandalloTab(tab){
  escandalloTab = tab;
  escandalloFolder = null;
  escandalloRecipe = null;
  renderEscandallo();
  scrollContentToTop();
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
// Abre la ficha completa de un plato dentro de la lista de nombres (tanto
// si esa lista viene de una carpeta como de una búsqueda/filtro).
function openEscandalloRecipe(id){
  escandalloRecipe = id;
  renderEscandallo();
}
// Vuelve de la ficha completa a la lista de nombres.
function backToEscandalloRecipes(){
  escandalloRecipe = null;
  renderEscandallo();
}
// Navega directo al Escandallo completo de un plato por nombre (usado desde
// el Dashboard, mismo patrón que goToFichaForDish en js/app.js).
function goToEscandalloForDish(name){
  const r = DB.recipes.find(rec => rec.name === name && (rec.area||'cocina') === currentArea());
  if(!r){ showToast(t('msg.techSheetNotFound')); return; }
  escandalloTab = r.isBase ? 'elaboraciones' : 'platos';
  escandalloFolder = r.category || '__none__';
  escandalloRecipe = r.id;
  navigate('escandallo');
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
  const catNames = areaRecipeCategories().map(c => typeof c==='object'?c.name:c);
  catNames.forEach(c => { if(groups[c]) result.push([c, c, groups[c]]); });
  Object.keys(groups).forEach(c => { if(c !== '__none__' && !catNames.includes(c)) result.push([c, c, groups[c]]); });
  if(groups['__none__']) result.push(['__none__', t('label.noCategory'), groups['__none__']]);
  return result;
}

function renderEscandallo(){
  maybeShowCategoryIconHint();
  const isElab = escandalloTab === 'elaboraciones';
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && (isElab ? !!r.isBase : !r.isBase));
  populateRecipeCategoryFilter('escandallo-filter-cat', areaRecipes);
  const search = document.getElementById('escandallo-search').value.toLowerCase();
  const cat = document.getElementById('escandallo-filter-cat').value;
  const recipes = areaRecipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search);
    const matchCat = !cat || (cat==='__none__' ? !r.category : r.category===cat);
    return matchSearch && matchCat;
  });
  const box = document.getElementById('escandallo-list');
  document.getElementById('escandallo-tab-platos').classList.toggle('active', !isElab);
  document.getElementById('escandallo-tab-elaboraciones').classList.toggle('active', isElab);
  // La pestaña "Platos" pasa a llamarse "Bebidas" en Sala, igual que ya
  // pasa con el botón de "nuevo", el subtítulo y los mensajes vacíos de
  // esta misma vista — antes se quedaba fija en "Platos" también en Sala.
  const platosTabLabel = document.querySelector('#escandallo-tab-platos [data-i18n]');
  if(platosTabLabel) platosTabLabel.textContent = currentArea()==='sala' ? t('tab.drinks') : t('tab.dishes');

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

  if(!areaRecipes.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-calculator"></i>${isElab ? t(currentArea()==='sala' ? 'empty.elaborations.none.sala' : 'empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
    return;
  }

  const searching = !!(search || cat);

  if(!searching && escandalloFolder === null){
    // Vista de carpetas por categoría
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="grid grid-compact">${folders.map(([key, label, group]) => `
      <div class="card card-compact" style="cursor:pointer" onclick="openEscandalloFolder('${key.replace(/'/g,"\\'")}')">
        <h3 style="flex-wrap:nowrap;align-items:flex-start"><span style="font-size:18px;cursor:pointer;flex-shrink:0" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${key.replace(/'/g,"\\'")}','${label.replace(/'/g,"\\'")}','renderEscandallo','recipe')">${getCategoryIcon(key,'recipe')}</span> <span class="folder-card-name">${escapeHtml(label)}</span></h3>
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

  const backBtn = (!searching && escandalloFolder !== null) ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToEscandalloFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button>` : '';

  if(!visibleRecipes.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  // Mismo comportamiento tanto si se llega buscando/filtrando por categoría
  // como si se navega por carpeta: una lista compacta de solo nombres, y al
  // pinchar uno se abre su ficha completa (coste/PVP/margen/ingredientes) —
  // antes filtrar por categoría enseñaba directamente todas las fichas
  // completas de golpe, distinto de cómo se veía entrando por carpeta.
  const renderNameList = (recs) => `<div class="table-wrap"><table><tbody>${recs.map(r => `
    <tr style="cursor:pointer" onclick="openEscandalloRecipe(${r.id})">
      <td><strong><i class="ti ${r.isBase?((r.area||'cocina')==='sala'?'ti-flask':'ti-soup'):((r.area||'cocina')==='sala'?'ti-glass-cocktail':'ti-chef-hat')}"></i> ${escapeHtml(r.name)}</strong>${r.isBase?` <span style="font-size:11px;color:var(--muted);font-weight:400">(${t('label.baseShort')})</span>`:''}</td>
      <td style="text-align:right;color:var(--muted)"><i class="ti ti-chevron-right"></i></td>
    </tr>
  `).join('')}</tbody></table></div>`;

  if(escandalloRecipe !== null){
    const sel = visibleRecipes.find(r => r.id === escandalloRecipe);
    if(!sel){ escandalloRecipe = null; renderEscandallo(); return; }
    const recBackBtn = `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToEscandalloRecipes()"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>`;
    box.innerHTML = recBackBtn + renderEscandalloFull(sel);
  } else if(searching){
    box.innerHTML = groupRecipesByCategory(visibleRecipes).map(([catName, group]) => `
      <h3 class="cat-heading">${escapeHtml(catName)}</h3>
      ${renderNameList(group)}
    `).join('');
  } else {
    box.innerHTML = backBtn + renderNameList(visibleRecipes);
  }
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
    const pctText = r.isBase ? `${fmtMoney(perUnit)} / ${escapeHtml(r.baseUnit||'L')}` : !isFinite(pct) ? t('label.noSalePrice') : `${pct.toFixed(1)}% FC`;
    const circularWarning = recipeHasCircularReference(r)
      ? `<div class="card" style="background:var(--red-light,#FBEAEA);border-left:3px solid var(--red);margin-bottom:12px;padding:10px 14px;font-size:13px"><i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${t('escandallo.circularWarning')}</div>`
      : '';

    const lines = (r.ingredients||[]).map(line => {
      const label = renderEscandalloLineLabel(line);
      if(!label) return '';
      const lineCost = recipeIngredientCost(line);
      const merma = line.merma||0;
      const pctOfTotal = cost > 0 ? ((lineCost/cost)*100).toFixed(1) : '0.0';
      return `<tr><td><strong>${escapeHtml(label.name)}</strong></td><td>${fmtNum(line.qty)} ${escapeHtml(label.unit)}</td><td>${merma>0?merma+'%':'—'}</td><td>${fmtMoney(lineCost)}</td><td style="color:var(--muted)">${pctOfTotal}%</td></tr>`;
    }).join('');

    return `
      ${circularWarning}
      <div class="card" style="max-width:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <h3 style="margin:0;font-size:18px"><i class="ti ${r.isBase?((r.area||'cocina')==='sala'?'ti-flask':'ti-soup'):((r.area||'cocina')==='sala'?'ti-glass-cocktail':'ti-chef-hat')}"></i> ${escapeHtml(r.name)}${r.isBase?` <span style="font-size:12px;color:var(--muted);font-weight:400">(${t('label.baseElaborationTag')})</span>`:''}</h3>
          <span class="badge badge-${pctClass}">${pctText}</span>
        </div>
        <div class="grid grid-4" style="margin-bottom:14px">
          <div class="kpi"><div class="label">${t('label.totalCost')}</div><div class="value" style="font-size:18px">${fmtMoney(cost)}</div></div>
          ${r.isBase ? `
          <div class="kpi"><div class="label">${t('label.yieldShort')}</div><div class="value" style="font-size:18px">${fmtNum(r.baseYield||1)} ${escapeHtml(r.baseUnit||'L')}</div></div>
          <div class="kpi"><div class="label">${t('common.cost')}/${escapeHtml(r.baseUnit||'L')}</div><div class="value" style="font-size:18px">${fmtMoney(perUnit)}</div></div>
          ` : `
          <div class="kpi"><div class="label">${t('label.salePriceShort')}</div><div class="value" style="font-size:18px">${fmtMoney(r.price||0)}</div></div>
          <div class="kpi"><div class="label">${t('label.margin')}</div><div class="value" style="font-size:18px;color:${margin>=0?'var(--green)':'var(--red)'}">${fmtMoney(margin)}</div></div>
          <div class="kpi"><div class="label">${t('label.foodCost')}</div><div class="value" style="font-size:18px">${isFinite(pct)?pct.toFixed(1)+'%':'—'}</div></div>
          `}
        </div>
        ${r.consumiblesPct ? `<div style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('label.consumablesInline')}: ${r.consumiblesPct}%</div>` : ''}
        ${!r.isBase ? `<div style="font-size:12px;color:var(--muted);margin-bottom:10px"><i class="ti ti-info-circle"></i> ${t('msg.escandalloForOnePersonShort')}</div>` : ''}
        <div class="table-wrap">
          <table>
            <thead><tr><th>${t('label.ingredient')}</th><th>${t('common.qty')}</th><th>${t('th.merma')}</th><th>${t('common.cost')}</th><th>${t('hr.platos.pctOfTotal')}</th></tr></thead>
            <tbody>${lines || `<tr><td colspan="5"><div class="empty" style="padding:14px">${t('empty.noIngredients')}</div></td></tr>`}</tbody>
          </table>
        </div>
        <div class="actions-cell" style="margin-top:10px">
          <button class="owner-only btn btn-sm" onclick="openRecipeModal(${r.id})"><i class="ti ti-edit"></i> ${t('common.edit')}</button>
          <button class="owner-only btn btn-sm" onclick="duplicateRecipe(${r.id})"><i class="ti ti-copy"></i> ${t('btn.duplicate')}</button>
          <button class="owner-only btn btn-sm btn-danger" onclick="deleteRecipe(${r.id})"><i class="ti ti-trash"></i> ${t('common.delete')}</button>
        </div>
      </div>
    `;
}

let recipeModalLines = [];

function openRecipeModal(id, forceBase){
  if(!isOwnerSession() && !editUnlocked) return;
  const r = id ? getRecipe(id) : {name:'', price:0, comensales:2, consumiblesPct:5, ingredients:[], steps:'', presentation:'', allergens:[], area: currentArea(), isBase:!!forceBase, baseYield:1, baseUnit:'L'};
  recipeModalLines = (r.ingredients||[]).map(l => ({...l}));
  if(id && typeof logAudit === 'function') logAudit('recipe_view', t('audit.recipeViewed').replace('${name}', r.name||'?'));
  renderRecipeModal(id, r);
}

function renderRecipeModal(id, r){
  const breakdown = recipeCostBreakdown({...r, ingredients: recipeModalLines});
  const area = r.area || currentArea();
  const isSala = area === 'sala';

  const areaIngredients = DB.ingredients.filter(i => (i.area||'cocina') === area);

  const linesHtml = recipeModalLines.map((line, idx) => {
    const label = renderEscandalloLineLabel(line);
    const ingRef = line.type !== 'base' ? getIngredient(line.ingredientId) : null;
    const discontinued = ingRef && ingRef.activo === false;
    return `
      <tr>
        <td>${label ? escapeHtml(label.name) + (line.type==='base'?` <span style="font-size:11px;color:var(--muted)">(${t('label.baseShort2Lower')})</span>`:'') + (discontinued?` <span class="badge badge-gray" style="font-size:9px" title="${t('msg.ingredientDiscontinuedHint')}">${t('label.discontinued')}</span>`:'') : '—'}</td>
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
      <h3>${r.isBase ? (id ? t('title.editElaboration') : t('title.newElaboration')) : (id ? (isSala ? t('title.editDrink') : t('title.editDish')) : (isSala ? t('title.newDrink') : t('title.newDish')))}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${r.isBase ? t('label.elaborationName') : (isSala ? t('label.drinkName') : t('label.dishName'))}</label>
        <input type="text" id="recipe-name" value="${escapeHtml(r.name)}" placeholder="${r.isBase ? (isSala ? t('ph.elaborationNameSala') : t('ph.elaborationName')) : (isSala ? t('ph.drinkName') : t('ph.dishName'))}">
      </div>
    </div>
    ${r.isBase ? '' : `
    <div class="field-row">
      <div class="field">
        <label>${t('label.priceBaseNoVat')}</label>
        <input type="number" id="recipe-price-base" value="${r.priceBase!=null?r.priceBase:(r.price||0)}" step="0.01" min="0" oninput="updateRecipeFinalPriceDisplay()">
      </div>
      <div class="field">
        <label>${t('label.ivaTypeRepercutido')}</label>
        <select id="recipe-iva" onchange="updateRecipeFinalPriceDisplay()" style="${r.ivaPct==null?'border-color:var(--red);color:var(--red)':''}">
          <option value="" ${r.ivaPct==null?'selected':''} disabled>${t('label.chooseIva')}</option>
          ${[21,10,4,0].map(pct => `<option value="${pct}" ${r.ivaPct===pct?'selected':''}>${pct}%</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field" style="margin-top:-8px">
      <span style="font-size:12.5px;color:var(--muted)">${t('label.finalPriceWithVat')}: <strong id="recipe-price-final-display">${fmtMoney(r.priceBase!=null && r.ivaPct!=null ? r.priceBase*(1+r.ivaPct/100) : (r.price||0))}</strong></span>
    </div>
    `}
    <div class="field-row">
      ${r.isBase ? '' : `
      <div class="field">
        <label>${isSala ? t('label.servings') : t('label.diners')}</label>
        <input type="number" id="recipe-comensales" value="1" step="1" min="1" disabled style="background:var(--bg);color:var(--muted)">
      </div>
      `}
      <div class="field">
        <label>${t('label.consumables')}</label>
        <input type="number" id="recipe-consumibles" value="${r.consumiblesPct!=null?r.consumiblesPct:5}" step="0.5" min="0" max="99" oninput="renderRecipeModal(${id||'null'}, currentRecipeFormState(${id||'null'}))">
      </div>
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="recipe-category" onchange="onRecipeCategoryChange(${id||'null'})">
          <option value="">${t('label.noCategory')}</option>
          ${areaRecipeCategories().map(c=>{ const cn=typeof c==='object'?c.name:c; return `<option value="${escapeHtml(cn)}" ${(r.category||'')===cn?'selected':''}>${escapeHtml(cn)}</option>`; }).join('')}
          <option value="__new__">+ ${t('btn.newCategory')}...</option>
        </select>
      </div>
    </div>
    ${!r.isBase ? `<div style="display:flex;align-items:center;gap:8px;background:var(--brand-cream);border-radius:8px;padding:8px 12px;margin:-6px 0 12px;font-size:12.5px;color:#7a5c1e">
      <i class="ti ti-info-circle" style="font-size:16px;flex-shrink:0"></i>
      ${t('msg.escandalloForOnePerson')}
    </div>` : ''}

    <!-- El tipo (plato normal o elaboración base) ya lo decide el botón por
    el que se entró a este formulario ("+ Nuevo Plato" o "+ Nueva
    Elaboración", ver openRecipeModal(id, forceBase)) — antes había además
    una casilla aquí dentro para volver a elegirlo, redundante con esos dos
    botones y que solo confundía. -->
    <input type="checkbox" id="recipe-is-base" style="display:none" ${r.isBase?'checked':''}>
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
          <thead><tr><th>${t('label.ingredient')}</th><th>${t('label.netQty')}</th><th>${t('th.unitAbbr')}</th><th>${t('th.mermaPct')}</th><th>${t('common.cost')}</th><th></th></tr></thead>
          <tbody>${linesHtml || `<tr><td colspan="6"><div class="empty" style="padding:10px">${t('empty.addIngredients')}</div></td></tr>`}</tbody>
        </table>
      </div>
      ${areaIngredients.length ? `
      <div class="field-row">
        <div class="field" style="margin-bottom:0;position:relative">
          <input type="text" id="recipe-add-ingredient-search" placeholder="${t('ph.searchIngredient')}" autocomplete="off" oninput="filterRecipeIngredientResults(${id||'null'})" onfocus="filterRecipeIngredientResults(${id||'null'})" onblur="setTimeout(()=>hideRecipeIngredientResults(${id||'null'}), 150)">
          <input type="hidden" id="recipe-add-ingredient">
          <div id="recipe-add-ingredient-results" style="display:none;position:absolute;z-index:10;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:220px;overflow:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>
        </div>
        <div class="field" style="margin-bottom:0">
          <input type="number" id="recipe-add-qty" placeholder="${t('common.qty')}" step="0.01" min="0" value="1">
        </div>
        <div class="field" style="margin-bottom:0">
          <button class="btn" style="width:100%" onclick="addRecipeLine(${id||'null'})"><i class="ti ti-plus"></i> ${t('common.add')}</button>
        </div>
      </div>
      ` : `<p style="font-size:13px;color:var(--muted)">${t('msg.addIngredientsToMegaListFirst')}</p>`}
    </div>

    <div class="grid grid-3" style="margin-bottom:10px">
      <div class="kpi"><div class="label">${t('label.ingredientsCost')}</div><div class="value" style="font-size:16px">${fmtMoney(breakdown.costeIng)}</div></div>
      <div class="kpi"><div class="label">${t('label.consumablesInline')}</div><div class="value" style="font-size:16px">${fmtMoney(breakdown.costeCons)}</div></div>
      <div class="kpi"><div class="label">${t('label.totalCost')}</div><div class="value" style="font-size:18px">${fmtMoney(breakdown.total)}</div></div>
    </div>
    ${r.isBase ? `
    <div class="grid grid-2" style="margin-bottom:10px">
      <div class="kpi ok"><div class="label">${t('label.costPer')} ${escapeHtml(r.baseUnit||'L')}</div><div class="value" style="font-size:18px">${fmtMoney(breakdown.total / (parseFloat(r.baseYield)||1))}</div></div>
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
    .filter(i => i.activo !== false)
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
        ${m.type==='base' ? `<i class="ti ${area==='sala'?'ti-flask':'ti-soup'}"></i> ` : ''}${escapeHtml(m.name)} <span style="color:var(--muted)">(${m.type==='base'?`${t('label.baseShort')} — ${fmtMoney(m.perUnit)}/${escapeHtml(m.unit)}`:escapeHtml(m.unit)})</span>
      </div>
    `;
    const sectionHeader = label => `<div style="padding:5px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);background:var(--bg-soft,#f4f5f7)">${label}</div>`;
    results.innerHTML =
      (baseLimited.length ? sectionHeader(t('label.elaborations')) + baseLimited.map(renderItem).join('') : '') +
      (ingLimited.length ? sectionHeader(t('label.ingredients')) + ingLimited.map(renderItem).join('') : '');
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
    const exists = areaRecipeCategories().some(c => (typeof c==='object'?c.name:c) === cat);
    if(!exists){ DB.recipeCategories.push({name: cat, area: currentArea()}); saveDB(); }
    state.category = cat;
  } else {
    state.category = '';
  }
  recipeFormStateBeforeCategory = null;
  renderRecipeModal(id, state);
}
// Actualiza en vivo el "precio final (IVA incluido)" mostrado bajo el precio
// base y el tipo de IVA, sin volver a pintar todo el modal (evita perder el
// foco mientras se escribe, igual que ya se hacía para el % de consumibles).
function updateRecipeFinalPriceDisplay(){
  const baseEl = document.getElementById('recipe-price-base');
  const ivaEl = document.getElementById('recipe-iva');
  const display = document.getElementById('recipe-price-final-display');
  if(!baseEl || !ivaEl || !display) return;
  const base = parseFloat(baseEl.value) || 0;
  const iva = ivaEl.value === '' ? 0 : parseFloat(ivaEl.value);
  display.textContent = fmtMoney(base * (1 + iva/100));
  ivaEl.style.borderColor = ivaEl.value === '' ? 'var(--red)' : '';
  ivaEl.style.color = ivaEl.value === '' ? 'var(--red)' : '';
}
function currentRecipeFormState(id){
  const nameEl = document.getElementById('recipe-name');
  const priceBaseEl = document.getElementById('recipe-price-base');
  const ivaEl = document.getElementById('recipe-iva');
  const comensalesEl = document.getElementById('recipe-comensales');
  const consumiblesEl = document.getElementById('recipe-consumibles');
  const categoryEl = document.getElementById('recipe-category');
  const isBaseEl = document.getElementById('recipe-is-base');
  const baseYieldEl = document.getElementById('recipe-base-yield');
  const baseUnitEl = document.getElementById('recipe-base-unit');
  const r = id ? getRecipe(id) : {};
  const priceBase = priceBaseEl ? parseFloat(priceBaseEl.value)||0 : (r.priceBase!=null?r.priceBase:(r.price||0));
  const ivaPct = ivaEl ? (ivaEl.value===''?null:parseFloat(ivaEl.value)) : (r.ivaPct!=null?r.ivaPct:null);
  return {
    name: nameEl ? nameEl.value : (r.name||''),
    priceBase,
    ivaPct,
    price: ivaPct!=null ? Math.round(priceBase*(1+ivaPct/100)*100)/100 : (r.price||0),
    comensales: (isBaseEl ? isBaseEl.checked : !!r.isBase) ? (comensalesEl ? comensalesEl.value : (r.comensales||2)) : 1,
    consumiblesPct: consumiblesEl ? consumiblesEl.value : (r.consumiblesPct!=null?r.consumiblesPct:5),
    category: categoryEl ? categoryEl.value : (r.category||''),
    isBase: isBaseEl ? isBaseEl.checked : !!r.isBase,
    baseYield: baseYieldEl ? baseYieldEl.value : (r.baseYield!=null?r.baseYield:1),
    baseUnit: baseUnitEl ? baseUnitEl.value : (r.baseUnit||'L'),
    area: r.area || currentArea(),
  };
}

async function saveRecipe(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const name = document.getElementById('recipe-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  // Aviso (no bloqueante) de posible plato duplicado, mismo criterio ya
  // usado en Clientes/Proveedores/Mega Lista — fácil dar de alta "Ensalada
  // César" dos veces sin darse cuenta y que una de las dos fichas quede
  // huérfana sin usarse en ninguna carta.
  const isBaseEl = document.getElementById('recipe-is-base');
  const isBase = isBaseEl ? isBaseEl.checked : false;
  const dupe = DB.recipes.find(r => r.id !== id && (r.area||'cocina')===currentArea() && !!r.isBase===isBase && r.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateRecipe').replace('${name}', dupe.name)))) return;
  // Una elaboración base no se vende directamente (no tiene precio de venta
  // ni IVA repercutido propios) — lo que interesa de ella es su coste total
  // y el coste por unidad de rendimiento, no un precio de venta.
  let priceBase = 0, ivaPct = null, price = 0;
  if(!isBase){
    priceBase = Math.max(0, parseFloat(document.getElementById('recipe-price-base').value) || 0);
    const ivaRaw = document.getElementById('recipe-iva').value;
    if(ivaRaw === ''){ showToast(t('msg.chooseIvaForDish')); return; }
    ivaPct = parseFloat(ivaRaw);
    price = Math.round(priceBase * (1 + ivaPct/100) * 100) / 100;
  }
  const consumiblesPct = Math.min(99, Math.max(0, parseFloat(document.getElementById('recipe-consumibles').value) || 0));
  const categoryEl = document.getElementById('recipe-category');
  const category = categoryEl ? categoryEl.value : '';
  // Un plato/bebida (no elaboración base) se calcula SIEMPRE para 1 ración:
  // las cantidades de ingredientes son las que lleva una sola unidad
  // vendida, así el coste, el precio y el descuento de stock al vender
  // coinciden sin depender de que alguien recuerde dividir a mano. Se
  // fuerza aquí además de deshabilitar el campo, por si acaso.
  // Una elaboración base ya no se mide en "comensales": se mide en
  // rendimiento (baseYield/baseUnit, ver más abajo) — cuánto produce el
  // lote, no para cuánta gente.
  const comensales = 1;
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
    Object.assign(r, {name, price, priceBase, ivaPct, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], isBase: r.isBase, baseYield, baseUnit});
  }else{
    recipeId = genId();
    DB.recipes.push({id: recipeId, name, price, priceBase, ivaPct, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], area: currentArea(), isBase, baseYield, baseUnit});
  }
  syncElaboracionForRecipe(recipeId, isBase, name, baseUnit);
  ensureFichaForRecipe(recipeId);
  saveDB();
  closeModal();
  renderEscandallo();
  showToast(t('msg.dishSaved'));
}

/* Cada plato del Escandallo tiene su hoja de ficha técnica desde el momento
   en que se crea, sin que nadie tenga que vincularla a mano. Antes había que
   crear el escandallo y después ir a Fichas Técnicas a elegirlo de una lista,
   un paso que no decidía nada -la ficha de un plato es la de ESE plato- y que
   además se podía olvidar, dejando platos sin ficha y fichas sueltas sin
   vincular.

   La ficha nace con lo que ya se sabe del plato (nombre y comensales) y con
   el resto en blanco: los ingredientes salen del propio escandallo, y pasos,
   alérgenos, foto y emplatado se rellenan cuando se quiera. Ser una ficha
   vacía no molesta: la tarjeta ya aparecía en la lista aunque no existiera. */
function ensureFichaForRecipe(recipeId){
  if(!recipeId) return null;
  const r = getRecipe(recipeId);
  if(!r) return null;
  const yaTiene = (DB.fichas||[]).find(f => f.recipeId === recipeId);
  if(yaTiene) return yaTiene;
  const ficha = {
    id: genId(),
    name: r.name,
    recipeId: r.id,
    comensales: r.comensales || 2,
    baseComensales: r.comensales || 2,
    produccion: r.comensales || 2,
    tiempo: '',
    temp: (r.area||'cocina') === 'sala' ? 'FRÍO' : 'CALIENTE',
    ingredients: [],   // los ingredientes reales vienen del escandallo
    pasos: [],
    allergens: [],
    presentation: '',
    photo: '',
    area: r.area || currentArea()
  };
  if(!Array.isArray(DB.fichas)) DB.fichas = [];
  DB.fichas.push(ficha);
  return ficha;
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

// Duplica un plato/elaboración como punto de partida para otro parecido
// (ej. "Ensalada César" → "Ensalada César con pollo"), sin tener que volver
// a montar toda la lista de ingredientes a mano. Abre directamente la ficha
// de la copia para renombrarla y ajustar lo que cambie.
function duplicateRecipe(id){
  const r = getRecipe(id);
  if(!r) return;
  const copy = JSON.parse(JSON.stringify(r));
  copy.id = genId();
  copy.name = `${r.name} ${t('label.copySuffix')}`;
  DB.recipes.push(copy);
  syncElaboracionForRecipe(copy.id, copy.isBase, copy.name, copy.baseUnit);
  saveDB();
  escandalloRecipe = null;
  renderEscandallo();
  showToast(t('msg.dishDuplicated'));
  openRecipeModal(copy.id);
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
// más bajo del real, sin ningún aviso. Recursivo: una base usada dentro de
// OTRA base (A dentro de B, B dentro del plato C) también cuenta — antes
// solo se miraba el nivel directo, así que borrar A no avisaba de que C
// también dependía de ella indirectamente.
function recipesUsingBaseRecipe(id, seen){
  seen = seen || new Set();
  if(seen.has(id)) return [];
  seen.add(id);
  const direct = DB.recipes.filter(r => r.id!==id && (r.ingredients||[]).some(line => line.type==='base' && line.baseRecipeId===id));
  const indirect = direct.flatMap(r => recipesUsingBaseRecipe(r.id, seen));
  const all = [...direct, ...indirect];
  const byId = new Map(all.map(r => [r.id, r]));
  return [...byId.values()];
}
async function deleteRecipe(id){
  if(!isOwnerSession() && !editUnlocked) return;
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
  if(!(await confirmModal(t('msg.confirmDeleteDish')))) return;
  confirmDeleteRecipe(id);
}
function confirmDeleteRecipe(id){
  const r0 = DB.recipes.find(r => r.id === id);
  if(r0){
    // La ficha técnica se guarda DENTRO de la misma entrada de la papelera
    // que la receta (no en su propio array de papelera aparte): así, si se
    // restaura la receta desde Papelera dentro de los 30 días, su ficha
    // vuelve con ella en vez de quedar perdida para siempre — antes se
    // borraba directamente sin pasar por la papelera en absoluto.
    const ficha0 = (DB.fichas||[]).find(f => f.recipeId === id);
    const r0ForTrash = ficha0 ? {...r0, _trashedFicha: ficha0} : r0;
    moveToTrash('recipe', r0ForTrash);
    logAudit('delete', t('audit.deletedRecipe').replace('${name}', r0.name), 'critical');
  }
  DB.recipes = DB.recipes.filter(r => r.id !== id);
  // Si se borra "de todas formas" pese al aviso, no dejar líneas de otras
  // recetas apuntando a un baseRecipeId que ya no existe: recipeIngredientCost
  // las trataría como coste 0 en silencio, infravalorando el food cost de
  // cualquier receta que dependiera de esta, sin ningún aviso posterior al
  // modal inicial. Se quitan (no se recalcula el precio de esas recetas
  // automáticamente: mejor que el propietario vea el hueco y lo revise).
  DB.recipes.forEach(r => {
    r.ingredients = (r.ingredients||[]).filter(line => !(line.type==='base' && line.baseRecipeId===id));
  });
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
const ALLERGEN_LIST = ALLERGENS;
// Los valores internos de temperatura de servicio se guardan siempre en español
// (es el valor interno/histórico); esto solo traduce la etiqueta que se le muestra.
const FICHA_TEMPS = ['CALIENTE','FRÍO','AMBIENTE'];
const FICHA_TEMP_LABEL_KEYS = {'CALIENTE':'temp.hot','FRÍO':'temp.cold','AMBIENTE':'temp.roomTemp'};
function fichaTempLabel(value){
  return FICHA_TEMP_LABEL_KEYS[value] ? t(FICHA_TEMP_LABEL_KEYS[value]) : (value||'');
}

let fichaModalState = null;

function getFicha(id){ return DB.fichas.find(f => f.id === id); }

// La receta vinculada (si sigue existiendo) para leer siempre sus datos actuales
// (comensales, alérgenos) en vez de una foto fija tomada al vincular la ficha.
function getFichaLiveRecipe(f){ return f.recipeId ? getRecipe(f.recipeId) : null; }

// Comensales/raciones "base" de la ficha: si hay receta vinculada se usa siempre
// su valor actual (evita que el factor de escalado quede desfasado si luego se
// edita el escandallo), si no la última base guardada en la propia ficha.
function getFichaBaseComensales(f){
  const r = getFichaLiveRecipe(f);
  return (r && r.comensales) ? r.comensales : (f.baseComensales || f.comensales || 1);
}

// Alérgenos de una receta recalculados EN VIVO a partir de sus ingredientes y
// elaboraciones base actuales — a diferencia de r.allergens (guardado como foto
// fija solo en saveRecipe()), esto refleja el alérgeno de un ingrediente aunque
// se haya editado después de guardar la receta por última vez.
function recipeComputedAllergens(r, visited){
  if(!r) return [];
  visited = visited || new Set();
  if(visited.has(r.id)) return [];
  visited.add(r.id);
  const allergenSet = new Set();
  (r.ingredients||[]).forEach(line => {
    if(line.type === 'base'){
      const base = getRecipe(line.baseRecipeId);
      recipeComputedAllergens(base, visited).forEach(a => allergenSet.add(a));
      return;
    }
    const ing = getIngredient(line.ingredientId);
    (ing && ing.allergens || []).forEach(a => allergenSet.add(a));
  });
  visited.delete(r.id);
  return Array.from(allergenSet);
}
// Alérgenos a mostrar/imprimir: unión de los que vienen automáticamente del
// escandallo vinculado (recalculados en vivo, siempre al día) más los añadidos
// manualmente en la propia ficha (para casos sin escandallo o alérgenos por
// manipulación).
function getFichaAllergens(f){
  const r = getFichaLiveRecipe(f);
  return Array.from(new Set([...(r?recipeComputedAllergens(r):[]), ...(f.allergens||[])]));
}

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
  scrollContentToTop();
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
  maybeShowCategoryIconHint();
  const isElab = fichasTab === 'elaboraciones';
  const areaRecipes = DB.recipes.filter(r => (r.area||'cocina') === currentArea() && (isElab ? !!r.isBase : !r.isBase));
  populateRecipeCategoryFilter('fichas-filter-cat', areaRecipes);
  const search = document.getElementById('fichas-search').value.toLowerCase();
  const cat = document.getElementById('fichas-filter-cat').value;
  const recipes = areaRecipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search);
    const matchCat = !cat || (cat==='__none__' ? !r.category : r.category===cat);
    return matchSearch && matchCat;
  });
  const box = document.getElementById('fichas-list');
  let html = '';

  document.getElementById('fichas-tab-platos').classList.toggle('active', !isElab);
  document.getElementById('fichas-tab-elaboraciones').classList.toggle('active', isElab);
  const fichasPlatosTabLabel = document.querySelector('#fichas-tab-platos [data-i18n]');
  if(fichasPlatosTabLabel) fichasPlatosTabLabel.textContent = currentArea()==='sala' ? t('tab.drinks') : t('tab.dishes');

  document.getElementById('fichas-view-grid').classList.toggle('active', fichasView==='grid');
  document.getElementById('fichas-view-list').classList.toggle('active', fichasView==='list');

  const searching = !!(search || cat);
  const gridClass = fichasView==='list' ? '' : 'grid grid-compact';
  const renderCard = r => fichasView==='list' ? renderFichaRow(r) : renderFichaCard(r);

  // Fichas sueltas (sin vincular a ningún plato de Escandallo, o vinculadas
  // a uno que ya no existe) que coinciden con la búsqueda actual — se
  // calcula ANTES de cualquier "no hay nada que enseñar" para no perderlas
  // de vista solo porque no haya ningún plato de Escandallo que además
  // coincida con esa misma búsqueda (antes pasaba justo eso: una ficha
  // suelta con un nombre que ningún escandallo comparte se quedaba
  // invisible, aunque existiera).
  const orphanFichas = (!searching && fichasFolder !== null) ? [] : DB.fichas.filter(f => (!f.recipeId || !getRecipe(f.recipeId)) && (f.area||'cocina') === currentArea() && (!search || f.name.toLowerCase().includes(search)));

  if(!areaRecipes.length){
    if(!orphanFichas.length){
      box.innerHTML = `<div class="empty"><i class="ti ti-file-description"></i>${isElab ? t(currentArea()==='sala' ? 'empty.elaborations.none.sala' : 'empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
      return;
    }
  } else if(!searching && fichasFolder === null){
    // Vista de carpetas por categoría
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="grid grid-compact">${folders.map(([key, label, group]) => `
      <div class="card card-compact" style="cursor:pointer" onclick="openFichaFolder('${key.replace(/'/g,"\\'")}')">
        <h3 style="flex-wrap:nowrap;align-items:flex-start"><span style="font-size:18px;cursor:pointer;flex-shrink:0" title="${t('title.chooseFolderIcon')}" onclick="event.stopPropagation();openCategoryIconModal('${key.replace(/'/g,"\\'")}','${label.replace(/'/g,"\\'")}','renderFichas','recipe')">${getCategoryIcon(key,'recipe')}</span> <span class="folder-card-name">${escapeHtml(label)}</span></h3>
        <div style="font-size:12px;color:var(--muted)">${currentArea()==='sala' ? (group.length===1?t('label.oneDrink'):t('label.nDrinks').replace('${n}', group.length)) : (group.length===1?t('label.oneDish'):t('label.nDishes').replace('${n}', group.length))}</div>
      </div>
    `).join('')}</div>`;
    return;
  }

  const backBtn = (!searching && fichasFolder !== null) ? `<button class="btn btn-sm" style="margin-bottom:10px" onclick="backToFichaFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button>` : '';

  const visibleRecipes = (!searching && fichasFolder !== null)
    ? recipes.filter(r => (r.category || '__none__') === fichasFolder)
    : recipes;

  if(!visibleRecipes.length && !orphanFichas.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  if(visibleRecipes.length){
    if(searching){
      html += groupRecipesByCategory(visibleRecipes).map(([catName, group]) => `
        <h3 class="cat-heading">${escapeHtml(catName)}</h3>
        <div class="${gridClass}">${group.map(renderCard).join('')}</div>
      `).join('');
    } else {
      html += backBtn + `<div class="${gridClass}">${visibleRecipes.map(renderCard).join('')}</div>`;
    }
  } else {
    html += backBtn;
  }

  if(orphanFichas.length){
    html += `<h3 class="cat-heading">${currentArea()==='sala' ? t('title.unlinkedTechSheetsDrink') : t('title.unlinkedTechSheetsDish')}</h3><div class="${gridClass}">` + orphanFichas.map(f => fichasView==='list' ? `
      <div class="list-row" style="cursor:pointer" onclick="openFichaModal(${f.id})">
        <div class="list-row-name"><i class="ti ti-file-description"></i> <span>${escapeHtml(f.name)}</span></div>
        <div class="actions-cell">
          <button class="btn btn-sm btn-icon" onclick="event.stopPropagation();printFicha(${f.id})"><i class="ti ti-printer"></i></button>
          <button class="owner-only btn btn-sm btn-icon" onclick="event.stopPropagation();duplicateFicha(${f.id})"><i class="ti ti-copy"></i></button>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="event.stopPropagation();deleteFicha(${f.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    ` : `
      <div class="card card-compact" style="cursor:pointer" onclick="openFichaModal(${f.id})">
        <h3 style="justify-content:space-between"><span style="overflow:visible;text-overflow:clip;white-space:normal"><i class="ti ti-file-description"></i> ${escapeHtml(f.name)}</span></h3>
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();printFicha(${f.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
          <button class="owner-only btn btn-sm" onclick="event.stopPropagation();duplicateFicha(${f.id})"><i class="ti ti-copy"></i></button>
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
      ${ficha ? `<span class="badge badge-green">${t('label.linked')}</span>` : `<span class="badge badge-amber">${t('label.noTechSheet')}</span>`}
      ${ficha ? `
        <div class="actions-cell">
          <button class="btn btn-sm btn-icon" onclick="event.stopPropagation();printFicha(${ficha.id})"><i class="ti ti-printer"></i></button>
          <button class="owner-only btn btn-sm btn-icon" onclick="event.stopPropagation();duplicateFicha(${ficha.id})"><i class="ti ti-copy"></i></button>
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
      <h3 style="justify-content:space-between;flex-wrap:wrap;gap:6px">
        <span style="overflow:visible;text-overflow:clip;white-space:normal;flex:1;min-width:0"><i class="ti ti-file-description"></i> ${escapeHtml(r.name)}</span>
        ${ficha ? `<span class="badge badge-green" style="flex:none">${t('label.linked')}</span>` : `<span class="badge badge-amber" style="flex:none">${t('label.noTechSheet')}</span>`}
      </h3>
      ${ficha ? `
        <div class="actions-cell">
          <button class="btn btn-sm" onclick="event.stopPropagation();printFicha(${ficha.id})"><i class="ti ti-printer"></i> ${t('common.print')}</button>
          <button class="owner-only btn btn-sm" onclick="event.stopPropagation();duplicateFicha(${ficha.id})"><i class="ti ti-copy"></i></button>
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
    // f puede no existir si se borró desde otro dispositivo mientras esta
    // pantalla seguía mostrando el botón para abrirla (dato ya sincronizado
    // vía Firebase en el otro dispositivo, pero esta vista aún no se había
    // vuelto a pintar) — sin este guard, JSON.stringify(undefined) hace
    // que JSON.parse reviente con un SyntaxError.
    if(!f){ showToast(t('msg.recordNoLongerExists')); return; }
    fichaModalState = JSON.parse(JSON.stringify(f));
    // La nube no guarda listas vacías: restaurarlas si faltan
    if(!Array.isArray(fichaModalState.ingredients) || !fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!Array.isArray(fichaModalState.pasos) || !fichaModalState.pasos.length) fichaModalState.pasos = [''];
    if(!Array.isArray(fichaModalState.allergens)) fichaModalState.allergens = [];
    if(!fichaModalState.baseComensales) fichaModalState.baseComensales = fichaModalState.comensales || 1;
    if(!fichaModalState.produccion) fichaModalState.produccion = fichaModalState.comensales || fichaModalState.baseComensales;
  } else if(recipeId){
    const r = getRecipe(recipeId);
    if(!r){ showToast(t('msg.recordNoLongerExists')); return; }
    fichaModalState = {
      id: null, name: r.name, recipeId: r.id, comensales: r.comensales||2,
      baseComensales: r.comensales||1, produccion: r.comensales||1,
      tiempo: '', temp: currentArea()==='sala' ? 'FRÍO' : 'CALIENTE',
      ingredients: (r.ingredients||[]).map(line => {
        const ing = getIngredient(line.ingredientId);
        return ing ? `${fmtNum(line.qty)} ${ing.unit} — ${ing.name}` : '';
      }).filter(Boolean),
      pasos: r.steps ? r.steps.split('\n').filter(Boolean) : [''],
      allergens: [],
      presentation: r.presentation || ''
    };
    if(!fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!fichaModalState.pasos.length) fichaModalState.pasos = [''];
  } else {
    fichaModalState = {id:null, name:'', recipeId:'', comensales:2, baseComensales:1, produccion:1, tiempo:'', temp: currentArea()==='sala' ? 'FRÍO' : 'CALIENTE', ingredients:[''], pasos:[''], allergens:[], presentation:''};
  }
  renderFichaModal();
}

function updateFichaProduccion(value){
  syncFichaModalFields();
  fichaModalState.produccion = Math.min(100000, Math.max(1, parseFloat(value)||1));
  if(fichaModalState.id){
    const ficha = getFicha(fichaModalState.id);
    if(ficha){ ficha.produccion = fichaModalState.produccion; saveDB(); }
  }
  renderFichaModal();
}

function renderFichaModal(){
  const f = fichaModalState;
  const linkedRecipe = f.recipeId ? getRecipe(f.recipeId) : null;
  const fArea = f.area || (linkedRecipe && linkedRecipe.area) || currentArea();
  const isSala = fArea === 'sala';
  // Una elaboración base (caldo, sofrito, masa...) no se sirve ni se
  // emplata directamente a un cliente — solo se usa como ingrediente en
  // otros platos — así que no tiene sentido pedirle foto ni notas de
  // emplatado.
  const isBaseElaboration = !!(linkedRecipe && linkedRecipe.isBase);
  const ro = !editUnlocked;
  const roAttr = ro ? 'disabled' : '';
  // Cuando la ficha está vinculada a un escandallo, el nombre/comensales vienen de
  // ahí y quedan bloqueados; una ficha sin vincular permite editarlos a mano.
  const lockedAttr = (ro || f.recipeId) ? 'disabled' : '';

  const baseComensales = getFichaBaseComensales(f);
  const produccion = f.produccion || baseComensales;
  const factor = (baseComensales && baseComensales > 0) ? (produccion / baseComensales) : 1;
  const ingredientsHtml = f.recipeId ? getFichaIngredientLines(f).map(l => `
    <div class="ingredient-pill">${l.qty!=null ? `${fmtNum(l.qty*factor)} ${escapeHtml(l.unit)} — ` : ''}${escapeHtml(l.name)}</div>
  `).join('') : `
    <div style="width:100%">
      ${(f.ingredients&&f.ingredients.length?f.ingredients:['']).map((ing, idx) => `
        <div class="step-row" style="margin-bottom:6px">
          <input type="text" value="${escapeHtml(ing)}" placeholder="${t('ph.egIngredientLine')}" style="flex:1" oninput="updateFichaIngredientText(${idx}, this.value)" ${roAttr}>
          <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeFichaIngredientText(${idx})" ${(f.ingredients&&f.ingredients.length?f.ingredients:['']).length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
        </div>
      `).join('')}
      <button class="owner-only btn btn-sm" onclick="addFichaIngredientText()"><i class="ti ti-plus"></i> ${t('btn.addIngredient')}</button>
    </div>
  `;

  const stepsHtml = f.pasos.map((p, idx) => `
    <div class="step-row">
      <div class="step-num">${idx+1}</div>
      <textarea placeholder="${t('ficha.stepPlaceholder')}" style="flex:1" oninput="updateFichaStep(${idx}, this.value)" ${roAttr}>${escapeHtml(p)}</textarea>
      <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="removeFichaStep(${idx})" ${f.pasos.length===1?'style="visibility:hidden"':''}><i class="ti ti-x"></i></button>
    </div>
  `).join('');

  // En vivo a partir de los ingredientes/bases ACTUALES (recipeComputedAllergens),
  // no la foto fija r.allergens guardada en el último "Guardar" del escandallo —
  // si no, editar un ingrediente después dejaba este modal mostrando alérgenos
  // desactualizados aunque la impresión (getFichaAllergens, mismo cálculo en
  // vivo) ya mostrara los correctos.
  const liveRecipeAllergens = recipeComputedAllergens(getFichaLiveRecipe(f));
  const allergenHtml = ALLERGEN_LIST.map(a => {
    const fromRecipe = liveRecipeAllergens.includes(a);
    const on = fromRecipe || (f.allergens||[]).includes(a);
    const clickable = !ro && !fromRecipe;
    return `<div class="alg-pill${on?' on':''}" ${clickable?`onclick="toggleFichaAllergen('${escapeHtml(a)}')"`:''} style="${clickable?'':'cursor:default'}" title="${fromRecipe?t('title.autoDetectedFromCosting'):''}">${escapeHtml(allergenLabel(a))}</div>`;
  }).join('');

  openModal(`
    <div class="modal-header">
      <h3>${f.id ? (ro?t('title.viewTechSheet'):t('title.editTechSheet')) : t('title.newTechSheet')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${isSala ? t('label.drinkName') : t('label.dishName')}</label>
        <input type="text" id="ficha-name" value="${escapeHtml(f.name)}" placeholder="${isSala ? t('ph.drinkName') : t('ph.dishName')}" ${lockedAttr}>
      </div>
      <div class="field">
        <label>${t('label.fromCosting')}</label>
        ${linkedRecipe
          ? `<div style="padding:10px 12px;border:1px solid var(--border);background:var(--bg);font-size:13px"><i class="ti ti-calculator"></i> ${escapeHtml(linkedRecipe.name)}</div>`
          : `<div style="padding:10px 12px;border:1px solid var(--border);background:var(--bg);font-size:13px;color:var(--muted)">${t('label.notLinked')}</div>`}
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${isSala ? t('label.servings') : t('label.diners')}</label>
        <input type="number" id="ficha-comensales" value="${f.comensales||2}" step="1" min="1" ${lockedAttr}>
      </div>
      <div class="field">
        <label>${t('label.production')}</label>
        <input type="number" id="ficha-produccion" value="${produccion}" step="1" min="1" max="100000" onchange="updateFichaProduccion(this.value)">
      </div>
      <div class="field">
        <label>${t('label.prepTime')}</label>
        <input type="number" id="ficha-tiempo" value="${f.tiempo||''}" step="1" min="0" ${roAttr}>
      </div>
      <div class="field">
        <label>${t('label.servingTemp')}</label>
        <select id="ficha-temp" ${roAttr}>${FICHA_TEMPS.map(tv=>`<option value="${tv}"${tv===f.temp?' selected':''}>${fichaTempLabel(tv)}</option>`).join('')}</select>
      </div>
    </div>

    <div class="field">
      <label>${t('label.ingredients')}</label>
      <div id="ficha-ingredients" class="ingredients-grid">${ingredientsHtml}</div>
    </div>

    <div class="field">
      <label>${t('label.preparation')}</label>
      <div id="ficha-steps">${stepsHtml}</div>
      <button class="owner-only btn btn-sm" onclick="addFichaStep()"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>
    </div>

    ${isBaseElaboration ? '' : `
    <div class="field">
      <label>${t('label.plating')}</label>
      <textarea id="ficha-presentation" placeholder="${t('ph.presentationNotes')}" ${roAttr}>${escapeHtml(f.presentation||'')}</textarea>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-top:8px;flex-wrap:wrap">
        ${f.photo ? `
          <img src="${f.photo}" alt="${t('label.platingPhotoAlt')}" style="width:260px;height:260px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:zoom-in" onclick="openFichaPhotoLightbox('${escapeJsAttr(f.photo)}')" title="${t('title.clickToEnlarge')}">
          ${ro ? '' : `<button class="btn btn-sm btn-danger" onclick="removeFichaPhoto()"><i class="ti ti-trash"></i> ${t('btn.removePhoto')}</button>`}
        ` : (ro ? '' : `
          <label class="btn btn-sm" style="cursor:pointer">
            <i class="ti ti-camera-plus"></i> ${t('btn.uploadPlatingPhoto')}
            <input type="file" accept="image/*" style="display:none" onchange="handleFichaPhotoUpload(this)">
          </label>
        `)}
      </div>
    </div>
    `}

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
  const comensalesEl = document.getElementById('ficha-comensales');
  const tiempoEl = document.getElementById('ficha-tiempo');
  const tempEl = document.getElementById('ficha-temp');
  const presEl = document.getElementById('ficha-presentation');
  if(nameEl) f.name = nameEl.value;
  if(comensalesEl) f.comensales = comensalesEl.value;
  if(tiempoEl) f.tiempo = tiempoEl.value;
  if(tempEl) f.temp = tempEl.value;
  if(presEl) f.presentation = presEl.value;
}


function updateFichaIngredientText(idx, value){ fichaModalState.ingredients[idx] = value; }
function addFichaIngredientText(){ syncFichaModalFields(); fichaModalState.ingredients.push(''); renderFichaModal(); }
function removeFichaIngredientText(idx){
  if(fichaModalState.ingredients.length<=1) return;
  syncFichaModalFields();
  fichaModalState.ingredients.splice(idx,1);
  renderFichaModal();
}

function updateFichaStep(idx, value){ fichaModalState.pasos[idx] = value; }
function addFichaStep(){ syncFichaModalFields(); fichaModalState.pasos.push(''); renderFichaModal(); }
function removeFichaStep(idx){
  if(fichaModalState.pasos.length<=1) return;
  syncFichaModalFields();
  fichaModalState.pasos.splice(idx,1);
  renderFichaModal();
}

function handleFichaPhotoUpload(input){
  const file = input.files[0];
  if(!file) return;
  if(!file.type || !file.type.startsWith('image/')){ showToast(t('msg.selectValidImageFile')); return; }
  if(file.size > 2 * 1024 * 1024){ showToast(t('msg.photoTooLarge')); return; }
  syncFichaModalFields();
  const reader = new FileReader();
  reader.onload = e => {
    fichaModalState.photo = e.target.result;
    renderFichaModal();
  };
  reader.readAsDataURL(file);
}
function removeFichaPhoto(){
  syncFichaModalFields();
  fichaModalState.photo = '';
  renderFichaModal();
}
// La miniatura de la ficha (para no ocupar demasiado sitio en el
// formulario) se puede ampliar a pantalla completa con un clic — antes no
// había forma de ver el emplatado en grande, solo el recorte pequeño.
function openFichaPhotoLightbox(src){
  openModal(`
    <div class="modal-header">
      <h3>${t('label.plating')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <img src="${src}" alt="${t('label.platingPhotoAlt')}" style="width:100%;max-height:75vh;object-fit:contain;border-radius:8px">
  `, {xl:true});
}
function toggleFichaAllergen(a){
  syncFichaModalFields();
  if(!fichaModalState.allergens) fichaModalState.allergens = [];
  const i = fichaModalState.allergens.indexOf(a);
  if(i>=0) fichaModalState.allergens.splice(i,1); else fichaModalState.allergens.push(a);
  renderFichaModal();
}

async function saveFicha(){
  syncFichaModalFields();
  const f = fichaModalState;
  const name = (f.name||'').trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  if(f.recipeId && DB.fichas.some(other => other.id !== f.id && other.recipeId === f.recipeId)){
    showToast(t('msg.recipeAlreadyHasTechSheet'));
    return;
  }
  // Aviso (no bloqueante) de posible ficha duplicada, mismo criterio ya
  // usado en Escandallo/Clientes/Proveedores/Mega Lista — sin esto, era
  // fácil duplicar una ficha (con el propio botón "Duplicar") varias veces
  // y acabar con varias fichas huérfanas con el mismo nombre, imposibles
  // de distinguir en la lista de "sin vincular".
  const dupe = DB.fichas.find(other => other.id !== f.id && (other.area||'cocina')===currentArea() && other.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateTechSheet').replace('${name}', dupe.name)))) return;
  const data = {
    name,
    recipeId: f.recipeId || '',
    comensales: Math.max(1, parseInt(f.comensales)||1),
    baseComensales: Math.max(1, f.baseComensales || parseInt(f.comensales) || 1),
    produccion: Math.max(1, f.produccion || parseInt(f.comensales) || 1),
    tiempo: f.tiempo ? Math.max(0, parseInt(f.tiempo)||0) : '',
    temp: f.temp || 'CALIENTE',
    ingredients: f.ingredients.filter(i => i && i.trim()),
    pasos: f.pasos.filter(p => p && p.trim()),
    allergens: f.allergens || [],
    presentation: (f.presentation||'').trim(),
    photo: f.photo || ''
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

async function deleteFicha(id){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteTechSheet')))) return;
  DB.fichas = DB.fichas.filter(f => f.id !== id);
  saveDB();
  renderFichas();
  showToast(t('msg.techSheetDeleted'));
}

// Duplica una ficha como plantilla suelta (sin vincular, para no chocar con la
// protección de una sola ficha por escandallo); útil para variantes similares.
function duplicateFicha(id){
  const f = getFicha(id);
  if(!f) return;
  const copy = JSON.parse(JSON.stringify(f));
  copy.id = genId();
  // Si ya existe una copia (o varias), numera la siguiente en vez de crear
  // otra con el mismo nombre exacto — antes duplicar la misma ficha dos
  // veces daba dos fichas idénticamente llamadas "X (copia)", imposibles
  // de distinguir en la lista.
  const existingNames = new Set(DB.fichas.filter(x=>(x.area||'cocina')===(f.area||'cocina')).map(x=>x.name));
  let candidate = `${f.name} (copia)`;
  let n = 2;
  while(existingNames.has(candidate)){ candidate = `${f.name} (copia ${n})`; n++; }
  copy.name = candidate;
  copy.recipeId = '';
  DB.fichas.push(copy);
  saveDB();
  renderFichas();
  showToast(t('msg.techSheetSaved'));
}

function printFicha(id){
  const f = getFicha(id);
  if(!f) return;
  // Si la ficha está vinculada a un plato del Escandallo, el nombre mostrado
  // en el impreso siempre es el actual del plato (por si se renombró desde
  // que se vinculó), no el que se guardó en la ficha en su momento.
  const liveRecipe = getFichaLiveRecipe(f);
  const displayName = liveRecipe ? liveRecipe.name : f.name;
  const fichaAllergens = getFichaAllergens(f);
  const algs = fichaAllergens.length
    ? fichaAllergens.map(a=>`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:4px;font-size:10pt;margin:2px;display:inline-block">${escapeHtml(allergenLabel(a))}</span>`).join('')
    : t('label.none');
  const baseComensales = getFichaBaseComensales(f);
  const produccion = f.produccion || baseComensales;
  const factor = (baseComensales && baseComensales > 0) ? (produccion / baseComensales) : 1;
  const ingredientLines = getFichaIngredientLines(f);
  const ings = ingredientLines.map(l=>`<li style="margin:3px 0">${l.qty!=null ? `${fmtNum(l.qty*factor)} ${escapeHtml(l.unit)} — ` : ''}${escapeHtml(l.name)}</li>`).join('');
  const fArea = f.area || (f.recipeId && (getRecipe(f.recipeId)||{}).area) || 'cocina';
  const isBaseElaboration = !!(liveRecipe && liveRecipe.isBase);
  const steps = (f.pasos||[]).map((p,i)=>`<div style="margin-bottom:10px;display:flex;gap:10px"><strong style="flex-shrink:0;color:#999">${i+1}.</strong><span>${escapeHtml(p)}</span></div>`).join('');
  const metaChips = [
    produccion ? `<span><i class="ti ${fArea==='sala'?'ti-glass-cocktail':'ti-users'}"></i> ${fmtNum(produccion)} ${produccion!==1?t('noun.rations'):t('noun.ration')}</span>` : '',
    f.tiempo ? `<span><i class="ti ti-clock"></i> ${f.tiempo} min</span>` : '',
    f.temp ? `<span>${escapeHtml(fichaTempLabel(f.temp))}</span>` : ''
  ].filter(Boolean).join('');
  const body = `
    ${printReportHeaderHtml(displayName)}
    ${metaChips ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 18px">${metaChips.replace(/<span>/g,'<span style="background:#f5f5f3;padding:4px 10px;border-radius:4px;font-size:11.5px;color:#555">')}</div>` : ''}
    ${isBaseElaboration ? '' : (f.photo ? `<img src="${f.photo}" alt="${t('label.platingPhotoAlt')}" style="max-width:100%;max-height:100mm;border-radius:8px;display:block;margin:0 0 18px;object-fit:cover">` : '')}
    <h2>${t('label.ingredients')}</h2><ul class="pr-steps">${ings || `<li class="pr-empty">${t('empty.noIngredients')}</li>`}</ul>
    <h2>${t('label.prepMethod')}</h2>${steps || `<p class="pr-empty">${t('label.notSpecified')}</p>`}
    ${isBaseElaboration ? '' : `<h2>${t('label.plating')}</h2><p>${escapeHtml(f.presentation) || t('label.notSpecified')}</p>`}
    <h2>${t('label.allergens')}</h2><div>${algs}</div>
  `;
  printReportWindow(displayName, body, {winSize:'width=800,height=1000'});
}

