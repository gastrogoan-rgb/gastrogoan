
/* ============================================================
   ESCANDALLO — Cálculo automático de costes de platos
   ============================================================ */
function recipeFoodCostPct(r){
  if(!r.price) return Infinity;
  const cost = recipeCost(r);
  // El food cost se mide sobre la venta SIN IVA (lo que de verdad ingresa el
  // negocio): usar el precio bruto infla el margen y esconde food cost real,
  // más cuanto más alto sea el IVA. Recetas antiguas sin priceBase/ivaPct
  // guardados no pueden derivar el neto exacto: se usa el precio bruto como
  // única opción posible, igual que antes de este arreglo.
  const priceBase = r.priceBase!=null ? r.priceBase : (r.ivaPct!=null ? r.price/(1+r.ivaPct/100) : r.price);
  if(!priceBase) return Infinity;
  return (cost / priceBase) * 100;
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
/* Cuánto hay que COMPRAR para que quede en el plato la cantidad que el
   escandallo pide.

   La columna donde se escribe la cantidad se llama "Cantidad neta" y al
   lado va "Merma %": el hostelero apunta lo que quiere que llegue al
   plato (220 g de solomillo limpio) y qué porcentaje se pierde al
   limpiarlo. Para que queden 220 g netos con un 8% de merma hay que
   comprar 220/0,92 = 239,1 g, no 220×1,08 = 237,6 g.

   Antes se sumaba el porcentaje (qty × (1+m)) en vez de descontarlo
   (qty ÷ (1−m)), y el coste salía SIEMPRE por debajo del real. Con mermas
   pequeñas se nota poco, pero crece rápido con las normales de cocina:

     merma 8%  → 0,6% de menos      merma 30% → 9% de menos
     merma 40% → 16% de menos       merma 50% → 25% de menos

   Un 30% de merma es lo corriente en pescado entero o alcachofas. El
   efecto es que el food cost sale más bajo de lo que es y el margen más
   alto: se ponen precios sobre un coste que no es el real. */
function mermaBruto(line){
  const m = Math.min(99, Math.max(0, line.merma || 0));
  return line.qty / (1 - m/100);
}
function recipeIngredientCost(line, visited, ctx){
  if(line.type === 'base'){
    const baseRecipe = getRecipe(line.baseRecipeId);
    if(!baseRecipe) return 0;
    return recipeBaseCostPerUnit(baseRecipe, visited, ctx) * mermaBruto(line);
  }
  const ing = getIngredient(line.ingredientId);
  if(!ing) return 0;
  return ing.price * mermaBruto(line);
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
/* El texto de la pestaña ya cambiaba a "Bebidas" en Sala, pero el ICONO se
   quedaba fijo en el HTML: un gorro de cocinero y un plato de sopa presidían
   la carta de vinos. Los iconos van aquí por el mismo motivo que la etiqueta,
   y con el mismo mecanismo. */
function iconoPestanaPlatos(){ return currentArea()==='sala' ? 'ti-glass-cocktail' : 'ti-chef-hat'; }
function iconoPestanaElaboraciones(){ return currentArea()==='sala' ? 'ti-bottle' : 'ti-soup'; }
function ajustaIconoPestana(idBoton, icono){
  const i = document.querySelector(`#${idBoton} i.ti`);
  if(i) i.className = 'ti ' + icono;
}

function setEscandalloTab(tab){
  // Con una hoja a medias, cambiar de pestaña también pregunta (como salir de cualquier editor).
  const cambiar = () => { escandalloHoja = null; escandalloTab = tab; escandalloFolder = null; escandalloRecipe = null; renderEscandallo(); scrollContentToTop(); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(cambiar); else cambiar();
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
  escandalloHoja = null;
  document.getElementById('escandallo-search').value = '';
  renderEscandallo();
}
// Abre la ficha completa de un plato dentro de la lista de nombres (tanto
// si esa lista viene de una carpeta como de una búsqueda/filtro).
function openEscandalloRecipe(id){
  openRecipeModal(id);
}
// Vuelve de la hoja a la lista (preguntando antes si hay cambios sin guardar).
function backToEscandalloRecipes(){
  const volver = () => { escandalloHoja = null; recipeModalLines = []; escandalloHojaBase = ''; escandalloRecipe = null; renderEscandallo(); scrollContentToTop(); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(volver); else volver();
}
// Navega directo al Escandallo completo de un plato por nombre (usado desde
// el Dashboard, mismo patrón que goToFichaForDish en js/app.js).
function goToEscandalloForDish(name){
  const r = DB.recipes.find(rec => rec.name === name && (rec.area||'cocina') === currentArea());
  if(!r){ showToast(t('msg.techSheetNotFound')); return; }
  escandalloTab = r.isBase ? 'elaboraciones' : 'platos';
  escandalloFolder = r.category || '__none__';
  escandalloRecipe = r.id;
  escandalloHoja = null;
  navigate('escandallo');
  openRecipeModal(r.id);
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

/* Renombrar y borrar las carpetas de Escandallo y Fichas Técnicas.
   Hasta ahora solo se podía cambiarles el icono: un nombre mal escrito se
   quedaba así para siempre y una carpeta que sobraba no había forma de
   quitarla. En Mega Lista sí se podía renombrar, lo que hacía la app
   incoherente consigo misma según por dónde entraras a la MISMA carpeta.

   Las categorías de receta no son una lista aparte: son lo que pone en el
   campo `category` de cada plato. Por eso renombrar es reasignar, y borrar
   obliga a decir a dónde va lo de dentro. Nunca se borra un plato. */
async function renameRecipeCategory(key){
  if(key === '__none__') return;   // "Sin categoría" no es una carpeta de verdad
  const nuevo = await promptText(t('msg.renameCategoryPrompt'), key);
  if(nuevo === null) return;
  const trimmed = nuevo.trim();
  // El nombre acaba siendo una CLAVE de Firebase (iconos y lápidas): con
  // . $ # [ ] / dentro, la sincronización del negocio entero se cae.
  if(!nombreDeCarpetaValido(trimmed)) return;
  if(!trimmed || trimmed === key) return;
  // Solo las recetas de ESTA área: Cocina y Sala pueden tener, por
  // coincidencia, una categoría con el mismo nombre.
  DB.recipes.forEach(r => {
    if(r.category === key && (r.area||'cocina') === currentArea()) r.category = trimmed;
  });
  const idx = DB.recipeCategories.findIndex(c =>
    (typeof c === 'object' ? c.name : c) === key &&
    (typeof c === 'object' ? (!c.area || c.area === currentArea()) : true));
  if(idx >= 0) DB.recipeCategories.splice(idx, 1);
  const yaEsta = DB.recipeCategories.some(c =>
    (typeof c === 'object' ? c.name : c) === trimmed);
  if(!yaEsta) DB.recipeCategories.push({name: trimmed, area: currentArea()});
  // El icono se traspasa: no se pierde por corregir el texto.
  if(DB.categoryIcons && DB.categoryIcons.recipe && DB.categoryIcons.recipe[key] != null){
    DB.categoryIcons.recipe[trimmed] = DB.categoryIcons.recipe[key];
    delete DB.categoryIcons.recipe[key];
  }
  saveDB();
  if(escandalloFolder === key) escandalloFolder = trimmed;
  if(typeof fichasFolder !== 'undefined' && fichasFolder === key) fichasFolder = trimmed;
  renderEscandallo();
  if(typeof renderFichas === 'function') renderFichas();
  showToast(t('msg.categoryRenamed'));
}

async function deleteRecipeCategory(key){
  if(key === '__none__') return;
  const dentro = DB.recipes.filter(r =>
    r.category === key && (r.area||'cocina') === currentArea());
  const quitarDeLaLista = () => {
    const idx = DB.recipeCategories.findIndex(c =>
      (typeof c === 'object' ? c.name : c) === key &&
      (typeof c === 'object' ? (!c.area || c.area === currentArea()) : true));
    if(idx >= 0) DB.recipeCategories.splice(idx, 1);
    if(DB.categoryIcons && DB.categoryIcons.recipe) delete DB.categoryIcons.recipe[key];
  };

  if(!dentro.length){
    if(!(await confirmModal(t('msg.confirmDeleteCategory').replace('${n}', key),
        {icon:'ti-trash', danger:true}))) return;
    quitarDeLaLista();
  } else {
    const otras = [...new Set(DB.recipes
      .filter(r => (r.area||'cocina') === currentArea() && r.category && r.category !== key)
      .map(r => r.category))].sort();
    const opciones = [...otras.map(c => ({valor: c, texto: c})),
                      {valor: '', texto: t('label.noCategory')}];
    const destino = await pickOption(
      t('title.deleteCategory'),
      t('msg.categoryHasDishes').replace('${n}', key).replace('${c}', dentro.length),
      opciones, {icon:'ti-trash', ok: t('btn.moveAndDelete')});
    if(destino === null) return;
    dentro.forEach(r => { r.category = destino; });
    quitarDeLaLista();
  }
  saveDB();
  if(escandalloFolder === key) escandalloFolder = null;
  if(typeof fichasFolder !== 'undefined' && fichasFolder === key) fichasFolder = null;
  renderEscandallo();
  if(typeof renderFichas === 'function') renderFichas();
  showToast(t('msg.categoryDeleted'));
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
  const vista = document.getElementById('view-escandallo');
  // Con una hoja abierta (plato nuevo o existente) no hace falta ni la tira de pestañas ni el buscador.
  vista.classList.toggle('es-en-hoja', !!escandalloHoja);
  document.getElementById('escandallo-tab-platos').classList.toggle('is-on', !isElab);
  document.getElementById('escandallo-tab-elaboraciones').classList.toggle('is-on', isElab);
  // La pestaña "Platos" pasa a llamarse "Bebidas" en Sala, igual que ya
  // pasa con el botón de "nuevo", el subtítulo y los mensajes vacíos de
  // esta misma vista — antes se quedaba fija en "Platos" también en Sala.
  const platosTabLabel = document.querySelector('#escandallo-tab-platos [data-i18n]');
  if(platosTabLabel) platosTabLabel.textContent = currentArea()==='sala' ? t('tab.drinks') : t('tab.dishes');
  ajustaIconoPestana('escandallo-tab-platos', iconoPestanaPlatos());
  ajustaIconoPestana('escandallo-tab-elaboraciones', iconoPestanaElaboraciones());

  const newBtns = document.getElementById('escandallo-new-btns');
  if(newBtns){
    newBtns.innerHTML = isElab
      ? `<button class="owner-only btn btn-fino is-on" onclick="openRecipeModal(null, true)"><i class="ti ti-plus"></i> ${t('tab.newElaboration')}</button>`
      : `<button class="owner-only btn btn-fino is-on" onclick="openRecipeModal()"><i class="ti ti-plus"></i> ${currentArea()==='sala' ? t('tab.newDrink') : t('tab.newDish')}</button>`;
  }

  document.querySelector('#view-escandallo .view-subtitle').textContent = isElab ? t('tab.elaborationSubtitle') : (currentArea()==='sala' ? t('view.escandallo.subtitle.sala') : t('view.escandallo.subtitle'));
  document.getElementById('escandallo-search').placeholder = isElab ? t('ph.searchElaboration') : t('ph.searchDish');

  // La hoja (ver más abajo) es la ÚNICA pantalla donde un plato se crea, se ve y se edita.
  if(escandalloHoja){ esPintarHoja(); return; }

  if(!areaRecipes.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-calculator"></i>${isElab ? t(currentArea()==='sala' ? 'empty.elaborations.none.sala' : 'empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
    return;
  }

  const searching = !!(search || cat);
  const nombreDe = key => key === '__none__' ? t('label.noCategory') : key;
  const unidades = n => currentArea()==='sala' ? (n===1 ? t('noun.drink') : t('noun.drinks')) : (n===1 ? t('noun.dish') : t('noun.dishes'));

  if(!searching && escandalloFolder === null){
    // Vista de carpetas por categoría (mismas tarjetas que las de Mega Lista)
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="ml-carpetas">${folders.map(([key, label, group]) => {
      const k = escapeJsAttr(key);
      const real = key !== '__none__';
      const guardado = (DB.categoryIcons && DB.categoryIcons.recipe && DB.categoryIcons.recipe[key]) || '';
      const icono = (real && iconoSeccionHtml(guardado, label, 26)) || '<i class="ti ti-folder"></i>';
      const sinIngredientes = group.filter(r => !(r.ingredients||[]).length).length;
      return `
      <div class="ml-carpeta" role="button" tabindex="0" onclick="openEscandalloFolder('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEscandalloFolder('${k}')}">
        ${real
          ? `<span class="cat-icon-btn ml-ico" role="button" title="${escapeHtml(t('title.chooseFolderIcon'))}" aria-label="${escapeHtml(t('title.chooseFolderIcon'))}" onclick="event.stopPropagation();openCategoryIconModal('${k}','${k}','renderEscandallo','recipe')">${icono}</span>`
          : `<span class="ml-ico">${icono}</span>`}
        <div class="ml-carpeta-txt">
          <div class="ml-carpeta-nom">${escapeHtml(label)}</div>
          <div class="ml-carpeta-meta">${group.length} ${unidades(group.length)}</div>
          ${sinIngredientes ? `<div class="ml-carpeta-pend">${gl({es:'sin ingredientes', ca:'sense ingredients', en:'no ingredients'})}: ${sinIngredientes}</div>` : ''}
        </div>
        ${real ? botonesDeCarpeta(key, 'recipe') : ''}
      </div>`;
    }).join('')}</div>`;
    return;
  }

  const backBtn = (!searching && escandalloFolder !== null)
    ? `<div class="ml-ruta"><button type="button" class="btn btn-sm btn-fino" onclick="backToEscandalloFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button><div class="ml-ruta-nom">${escapeHtml(nombreDe(escandalloFolder))}</div></div>` : '';

  if(!recipes.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  const visibleRecipes = (!searching && escandalloFolder !== null)
    ? recipes.filter(r => (r.category || '__none__') === escandalloFolder)
    : recipes;

  if(!visibleRecipes.length){
    box.innerHTML = backBtn + `<div class="empty"><i class="ti ti-search-off"></i>${t('common.noResults')}</div>`;
    return;
  }

  if(searching){
    box.innerHTML = groupRecipesByCategory(visibleRecipes).map(([catName, group]) => `
      <h3 class="es-grupo">${escapeHtml(catName)} <span>${group.length}</span></h3>
      <div class="es-platos">${group.map(esTarjetaHtml).join('')}</div>
    `).join('');
  } else {
    box.innerHTML = backBtn + `<div class="es-platos">${visibleRecipes.map(esTarjetaHtml).join('')}</div>`;
  }
}

// Una tarjeta por plato: quién es, cómo va de food cost y lo que cuesta/vale. Pulsarla abre su hoja.
function esTarjetaHtml(r){
  const bd = recipeCostBreakdown(r);
  const sala = (r.area||'cocina') === 'sala';
  const pct = recipeFoodCostPct(r);
  const icono = r.isBase ? (sala ? 'ti-flask' : 'ti-soup') : (sala ? 'ti-glass-cocktail' : 'ti-chef-hat');
  const color = r.isBase || !isFinite(pct) ? 'gray' : pct > 35 ? 'red' : pct > 28 ? 'amber' : 'green';
  const insignia = r.isBase
    ? `<span class="badge badge-gray">${fmtMoney(recipeBaseCostPerUnit(r))}/${escapeHtml(r.baseUnit||'L')}</span>`
    : `<span class="badge badge-${color}">${isFinite(pct) ? fmtPct1(pct) + '% FC' : t('label.noSalePrice')}</span>`;
  const avisos = [
    !(r.ingredients||[]).length ? gl({es:'sin ingredientes', ca:'sense ingredients', en:'no ingredients'}) : '',
    !r.isBase && r.ivaPct == null ? gl({es:'sin IVA', ca:'sense IVA', en:'no VAT'}) : '',
    recipeHasCircularReference(r) ? gl({es:'referencia circular', ca:'referència circular', en:'circular reference'}) : ''
  ].filter(Boolean);
  const k = (et, v) => `<span class="es-cifra"><i>${et}</i><b>${v}</b></span>`;
  const cifras = r.isBase
    ? k(t('label.totalCost'), fmtMoney(bd.total)) + k(t('label.yieldShort'), `${fmtNum(r.baseYield||1)} ${escapeHtml(r.baseUnit||'L')}`)
    : k(t('label.totalCost'), fmtMoney(bd.total)) + k(t('label.salePriceShort'), fmtMoney(r.price||0));
  return `
    <article class="es-plato" role="button" tabindex="0" onclick="openEscandalloRecipe(${r.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEscandalloRecipe(${r.id})}">
      <div class="es-plato-cab">
        <i class="ti ${icono} es-plato-ico"></i>
        <div class="es-plato-nom">${escapeHtml(r.name)}</div>
        ${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`openEscandalloRecipe(${r.id})`, owner:true},
          {icono:'ti-copy', texto:t('btn.duplicate'), fn:`duplicateRecipe(${r.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteRecipe(${r.id})`, peligro:true, owner:true}
        ])}
      </div>
      <div class="es-plato-insignias">${insignia}${avisos.map(a => `<span class="es-aviso">${escapeHtml(a)}</span>`).join('')}</div>
      <div class="es-plato-cifras">${cifras}</div>
    </article>`;
}

function renderEscandalloLineLabel(line){
  if(line.type === 'base'){
    const base = getRecipe(line.baseRecipeId);
    return base ? {name: base.name, unit: base.baseUnit||'L'} : null;
  }
  const ing = getIngredient(line.ingredientId);
  return ing ? {name: ing.name, unit: ing.unit} : null;
}


/* ============================================================
   LA HOJA DE ESCANDALLO (30/10) — una sola pantalla para crear, ver y editar un plato.
   Antes un plato nuevo se montaba en un modal estrecho y el existente se veía en una ficha ancha, con otro botón
   para editarla: dos pantallas distintas para lo mismo. Ahora la ficha ancha ES el editor: todo se escribe en
   ella, los números se recalculan mientras se teclea, y un único «Guardar» lo deja escrito.
   Los ids (recipe-name, recipe-price-base…) son los de siempre: saveRecipe y currentRecipeFormState no cambian.
   ============================================================ */
let recipeModalLines = [];          // las líneas de la hoja abierta (se copian a la receta al guardar)
let escandalloHoja = null;          // {id, isBase}: hay una hoja abierta (id null = plato nuevo)
let escandalloHojaBase = '';        // foto de la hoja al abrirla o guardarla: lo que difiera son cambios sin guardar

function esHojaFoto(){
  if(!escandalloHoja || !document.getElementById('recipe-name')) return '';
  const g = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  return JSON.stringify({n:g('recipe-name'), c:g('recipe-category'), pb:g('recipe-price-base'), i:g('recipe-iva'), d:g('recipe-delivery-supplement'),
    co:g('recipe-consumibles'), y:g('recipe-base-yield'), u:g('recipe-base-unit'),
    l:recipeModalLines.map(l => [l.type || 'ingredient', l.ingredientId || l.baseRecipeId, Number(l.qty) || 0, Number(l.merma) || 0])});
}
function esHojaSucia(){ return !!escandalloHoja && esHojaFoto() !== escandalloHojaBase; }
function esMarcarCambio(){
  const el = document.getElementById('es-sucio');
  if(el) el.hidden = !esHojaSucia();
}
if(typeof ggRegistrarEditor === 'function') ggRegistrarEditor('escandallo', {
  sucio: () => esHojaSucia(),
  nombre: () => gl({es:'Plato: ', ca:'Plat: ', en:'Dish: '}) + ((document.getElementById('recipe-name') && document.getElementById('recipe-name').value.trim()) || gl({es:'sin nombre', ca:'sense nom', en:'unnamed'})),
  guardar: () => saveRecipe(),
  descartar: () => { escandalloHoja = null; recipeModalLines = []; escandalloHojaBase = ''; renderEscandallo(); }
});

// Abre la hoja: de un plato que ya existe, o vacía para uno nuevo. Se llama igual que el modal de antes.
function openRecipeModal(id, forceBase){
  if(!isOwnerSession() && !editUnlocked) return;
  const r = id ? getRecipe(id) : null;
  if(id && !r) return;
  if(id && typeof logAudit === 'function') logAudit('recipe_view', t('audit.recipeViewed').replace('${name}', r.name||'?'));
  const isBase = id ? !!r.isBase : !!forceBase;
  escandalloTab = isBase ? 'elaboraciones' : 'platos';
  escandalloHoja = {id: id || null, isBase};
  recipeModalLines = (r && r.ingredients ? r.ingredients : []).map(l => ({...l}));
  escandalloHojaNueva = id ? null : {name:'', priceBase:0, ivaPct:null, deliverySupplement:null, consumiblesPct:5, category:(escandalloFolder && escandalloFolder !== '__none__') ? escandalloFolder : '', baseYield:1, baseUnit:'L', isBase};
  const alAbrir = () => { renderEscandallo(); scrollContentToTop(); };
  const activa = document.querySelector('.view.active');
  if(activa && activa.id === 'view-escandallo') alAbrir(); else navigate('escandallo');
}
let escandalloHojaNueva = null;     // los valores de partida de una hoja nueva (para no depender de una receta que aún no existe)

// Compatibilidad: el resto del código sigue llamando a renderRecipeModal para repintar la hoja.
function renderRecipeModal(id, r){ esPintarHoja(r); }

function esHojaDatos(){
  const id = escandalloHoja.id;
  if(id){ const r = getRecipe(id); if(r) return r; }
  return escandalloHojaNueva || {name:'', ingredients:[], isBase: escandalloHoja.isBase, consumiblesPct:5, baseYield:1, baseUnit:'L'};
}
// Un decimal y coma, como el resto de cifras de la app (toFixed pintaba «28.0%»).
function fmtPct1(v){ return (Number(v) || 0).toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1}); }
function esPrecioFinal(priceBase, ivaPct){ return ivaPct == null ? priceBase : priceBase * (1 + ivaPct/100); }

function esPintarHoja(estado){
  const box = document.getElementById('escandallo-list');
  const id = escandalloHoja.id;
  const r = estado || esHojaDatos();
  const isBase = escandalloHoja.isBase;
  const area = r.area || currentArea();
  const isSala = area === 'sala';
  const hasDelivery = !(DB.business && DB.business.tiposServicio && DB.business.tiposServicio.delivery === false);
  const areaIngredients = DB.ingredients.filter(i => (i.area||'cocina') === area);
  const priceBase = r.priceBase != null ? r.priceBase : (r.price || 0);
  const ivaPct = r.ivaPct != null ? r.ivaPct : null;
  const titulo = isBase ? (id ? t('title.editElaboration') : t('title.newElaboration'))
    : (id ? (isSala ? t('title.editDrink') : t('title.editDish')) : (isSala ? t('title.newDrink') : t('title.newDish')));
  const k = (idKpi, et, v, extra) => `<div class="es-kpi"><span class="es-kpi-et">${et}</span><b id="${idKpi}"${extra || ''}>${v}</b></div>`;
  box.innerHTML = `
    <div class="es-barra">
      <button type="button" class="btn btn-sm btn-fino" onclick="backToEscandalloRecipes()"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
      <div class="es-barra-titulo">${escapeHtml(titulo)}</div>
      <div class="es-barra-der">
        <span class="oc-sucio" id="es-sucio" hidden><i class="ti ti-point-filled"></i> ${t('oferta.sucio')}</span>
        <button type="button" class="btn btn-fino is-on" onclick="saveRecipe()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
        ${id ? ggMenuAcciones([
          {icono:'ti-copy', texto:t('btn.duplicate'), fn:`duplicateRecipe(${id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteRecipe(${id})`, peligro:true, owner:true}
        ]) : ''}
      </div>
    </div>
    <div id="es-aviso-circular"></div>
    <div class="es-hoja">
      <div class="es-principal">
        <section class="es-card es-cab">
          <div class="field">
            <label for="recipe-name">${isBase ? t('label.elaborationName') : (isSala ? t('label.drinkName') : t('label.dishName'))}</label>
            <input type="text" id="recipe-name" class="es-nombre" value="${escapeHtml(r.name || '')}" placeholder="${isBase ? (isSala ? t('ph.elaborationNameSala') : t('ph.elaborationName')) : (isSala ? t('ph.drinkName') : t('ph.dishName'))}" oninput="esMarcarCambio()">
          </div>
          <div class="field-row">
            <div class="field">
              <label for="recipe-category">${t('common.category')}</label>
              <select id="recipe-category" onchange="onRecipeCategoryChange(${id||'null'});esMarcarCambio()">
                <option value="">${t('label.noCategory')}</option>
                ${areaRecipeCategories().map(c => { const cn = typeof c === 'object' ? c.name : c; return `<option value="${escapeHtml(cn)}" ${(r.category||'')===cn ? 'selected' : ''}>${escapeHtml(cn)}</option>`; }).join('')}
                <option value="__new__">+ ${t('btn.newCategory')}...</option>
              </select>
            </div>
            ${isBase ? `
            <div class="field">
              <label for="recipe-base-yield">${t('label.yield')}</label>
              <input type="number" id="recipe-base-yield" value="${r.baseYield != null ? r.baseYield : 1}" step="0.01" min="0.01" oninput="esRecalcular()">
            </div>
            <div class="field">
              <label for="recipe-base-unit">${t('common.unit')}</label>
              <select id="recipe-base-unit" onchange="esRecalcular()">
                ${BASE_UNITS.map(u => `<option value="${u}" ${(r.baseUnit||'L')===u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </div>` : ''}
          </div>
          ${isBase ? '' : `<p class="es-nota"><i class="ti ti-info-circle"></i> ${t('msg.escandalloForOnePerson')}</p>`}
          <!-- El tipo (plato o elaboración base) lo decide el botón por el que se entró; ya no se vuelve a elegir aquí. -->
          <input type="checkbox" id="recipe-is-base" style="display:none" ${isBase ? 'checked' : ''}>
          <input type="hidden" id="recipe-comensales" value="1">
        </section>

        <section class="es-card">
          <h3 class="es-tit">${t('label.ingredients')}</h3>
          <div class="es-lineas" id="es-lineas"></div>
          ${areaIngredients.length || DB.recipes.some(b => b.isBase && (b.area||'cocina') === area) ? `
          <div class="es-anadir">
            <div class="es-anadir-buscar">
              <i class="ti ti-search"></i>
              <input type="text" id="recipe-add-ingredient-search" placeholder="${t('ph.searchIngredient')}" autocomplete="off" oninput="filterRecipeIngredientResults(${id||'null'})" onfocus="filterRecipeIngredientResults(${id||'null'})" onblur="setTimeout(()=>hideRecipeIngredientResults(${id||'null'}),150)">
              <input type="hidden" id="recipe-add-ingredient">
              <div id="recipe-add-ingredient-results" class="es-resultados" style="display:none"></div>
            </div>
            <input type="number" id="recipe-add-qty" class="es-anadir-qty" placeholder="${t('common.qty')}" aria-label="${t('common.qty')}" step="0.01" min="0" value="1">
            <button type="button" class="btn btn-fino is-on" onclick="addRecipeLine(${id||'null'})"><i class="ti ti-plus"></i> ${t('common.add')}</button>
          </div>` : `<p class="es-nota">${t('msg.addIngredientsToMegaListFirst')}</p>`}
        </section>
      </div>

      <aside class="es-lateral">
        <section class="es-card es-resumen">
          <h3 class="es-tit">${gl({es:'Números', ca:'Números', en:'Numbers'})}</h3>
          <div class="es-kpis">
            ${k('es-k-coste', t('label.totalCost'), '—')}
            ${isBase ? `
              ${k('es-k-rinde', t('label.yieldShort'), '—')}
              ${k('es-k-ud', t('label.costPer') + ' ' + escapeHtml(r.baseUnit||'L'), '—')}
            ` : `
              ${k('es-k-pvp', t('label.salePriceShort'), '—')}
              ${k('es-k-margen', t('label.margin'), '—')}
              ${k('es-k-fc', t('label.foodCost'), '—')}
            `}
          </div>
          <div class="es-desglose">
            <div><span>${t('label.ingredientsCost')}</span><b id="es-d-ing">—</b></div>
            <div class="es-d-cons"><span>${t('label.consumablesInline')}</span>
              <span class="es-d-cons-in"><input type="number" id="recipe-consumibles" value="${r.consumiblesPct != null ? r.consumiblesPct : 5}" step="0.5" min="0" max="99" aria-label="${t('label.consumables')} %" oninput="esRecalcular()"><em>%</em></span>
              <b id="es-d-cons">—</b></div>
          </div>
        </section>

        ${isBase ? '' : `
        <section class="es-card">
          <h3 class="es-tit">${gl({es:'Precio de venta', ca:'Preu de venda', en:'Sale price'})}</h3>
          <div class="field-row">
            <div class="field">
              <label for="recipe-price-base">${t('label.priceBaseNoVat')}</label>
              <input type="number" id="recipe-price-base" value="${priceBase}" step="0.01" min="0" oninput="esRecalcular()">
            </div>
            <div class="field">
              <label for="recipe-iva">${t('label.ivaTypeRepercutido')}</label>
              <select id="recipe-iva" class="es-iva${ivaPct == null ? ' is-falta' : ''}" onchange="esRecalcular()">
                <option value="" ${ivaPct == null ? 'selected' : ''} disabled>${t('label.chooseIva')}</option>
                ${[21,10,4,0].map(pct => `<option value="${pct}" ${ivaPct === pct ? 'selected' : ''}>${pct}%</option>`).join('')}
              </select>
            </div>
          </div>
          ${hasDelivery ? `
          <div class="field">
            <label for="recipe-delivery-supplement">${t('label.deliverySupplement')}</label>
            <input type="number" id="recipe-delivery-supplement" value="${r.deliverySupplement != null ? r.deliverySupplement : ''}" step="0.01" min="0" placeholder="0,00" oninput="esRecalcular()">
            <small class="es-pista">${t('label.deliverySupplementHint')}</small>
          </div>` : ''}
          <div class="es-final">
            <div><span>${t('label.finalPriceWithVat')}</span><b id="recipe-price-final-display">—</b></div>
            ${hasDelivery ? `<div><span>${t('label.priceDelivery')}</span><b id="recipe-price-delivery-final-display">—</b></div>` : ''}
          </div>
        </section>`}

        <section class="es-card" id="es-extra"></section>
      </aside>
    </div>
  `;
  esPintarLineas();
  esRecalcular();
  esPintarExtra();
  if(!estado) escandalloHojaBase = esHojaFoto();
  esMarcarCambio();
}

// «Alérgenos» (los que traen los ingredientes) y «Dónde se usa» (cartas, o platos que usan esta elaboración).
function esPintarExtra(){
  const cont = document.getElementById('es-extra');
  if(!cont) return;
  const id = escandalloHoja.id;
  const alergenos = new Set();
  recipeModalLines.forEach(line => {
    const fuente = line.type === 'base' ? getRecipe(line.baseRecipeId) : getIngredient(line.ingredientId);
    ((fuente && fuente.allergens) || []).forEach(a => alergenos.add(a));
  });
  const enCartas = id ? cartaPlatosUsingRecipe(id) : [];
  const enPlatos = id && escandalloHoja.isBase ? recipesUsingBaseRecipe(id) : [];
  cont.innerHTML = `
    <h3 class="es-tit">${t('label.allergens')}</h3>
    <div class="es-alergenos">${alergenos.size ? [...alergenos].map(a => `<span class="ml-al">${escapeHtml(allergenLabel(a))}</span>`).join('') : `<span class="es-pista">${gl({es:'Ninguno de los ingredientes declara alérgenos.', ca:'Cap dels ingredients declara al·lèrgens.', en:'None of the ingredients declare allergens.'})}</span>`}</div>
    ${id ? `
    <h3 class="es-tit es-tit-2">${gl({es:'Dónde se usa', ca:'On s\'usa', en:'Where it is used'})}</h3>
    ${(enCartas.length || enPlatos.length) ? `<ul class="es-usos">
      ${enCartas.map(h => `<li><i class="ti ti-book-2"></i> ${escapeHtml(h.carta.nombre)} · ${escapeHtml(h.seccion.nombre)}</li>`).join('')}
      ${enPlatos.map(p => `<li><i class="ti ti-chef-hat"></i> ${escapeHtml(p.name)}</li>`).join('')}
    </ul>` : `<span class="es-pista">${escandalloHoja.isBase ? gl({es:'Todavía no la usa ningún plato.', ca:'Encara no la fa servir cap plat.', en:'No dish uses it yet.'}) : gl({es:'Todavía no está en ninguna carta.', ca:'Encara no és a cap carta.', en:'Not on any menu yet.'})}</span>`}` : ''}
  `;
}

function esPintarLineas(){
  const cont = document.getElementById('es-lineas');
  if(!cont) return;
  if(!recipeModalLines.length){
    cont.innerHTML = `<div class="empty es-vacio"><i class="ti ti-basket"></i>${t('empty.addIngredients')}</div>`;
    return;
  }
  cont.innerHTML = `
    <div class="es-lcab"><span>${t('label.ingredient')}</span><span>${t('label.netQty')}</span><span>${t('th.mermaPct')}</span><span>${t('common.cost')}</span><span>${t('hr.platos.pctOfTotal')}</span><span></span></div>
    ${recipeModalLines.map((line, idx) => {
      const label = renderEscandalloLineLabel(line);
      const ingRef = line.type !== 'base' ? getIngredient(line.ingredientId) : null;
      const baja = ingRef && ingRef.activo === false;
      return `
      <div class="es-linea plegable${ggPlegableAbierta('esl-' + idx) ? ' is-abierta' : ''}" data-pl="esl-${idx}" onclick="ggTogglePlegable(event, this)">
        <div class="es-l-nom"><b>${label ? escapeHtml(label.name) : '—'}</b>${line.type === 'base' ? ` <small>(${t('label.baseShort2Lower')})</small>` : ''}${baja ? ` <span class="badge badge-gray txt-xs" title="${escapeHtml(t('msg.ingredientDiscontinued'))}">${t('label.discontinued')}</span>` : ''}</div>
        <div class="es-l-qty" data-et="${escapeHtml(t('label.netQty'))}"><input type="number" class="es-in" value="${line.qty}" step="0.01" min="0" aria-label="${escapeHtml(t('label.netQty'))}" oninput="esLineaQty(${idx}, this.value)"><span class="es-l-u">${label ? escapeHtml(label.unit) : ''}</span></div>
        <div class="es-l-coste" data-et="${escapeHtml(t('common.cost'))}"><b id="es-lc-${idx}">—</b></div>
        <button type="button" class="pl-chev" aria-expanded="${ggPlegableAbierta('esl-' + idx)}" aria-label="${escapeHtml(gl({es:'Ver el resto', ca:'Veure la resta', en:'Show more'}))}" onclick="event.stopPropagation();ggTogglePlegable(event, this.closest('.plegable'))"><i class="ti ti-chevron-down"></i></button>
        <div class="es-l-merma pl-extra" data-et="${escapeHtml(t('th.mermaPct'))}"><input type="number" class="es-in" value="${line.merma||0}" step="1" min="0" max="99" aria-label="${escapeHtml(t('th.mermaPct'))}" oninput="esLineaMerma(${idx}, this.value)"></div>
        <div class="es-l-pct pl-extra" data-et="${escapeHtml(t('hr.platos.pctOfTotal'))}"><span id="es-lp-${idx}">—</span></div>
        <div class="es-l-acc pl-extra">${ggMenuAcciones([{icono:'ti-trash', texto:gl({es:'Quitar de la receta', ca:'Treure de la recepta', en:'Remove from recipe'}), fn:`removeRecipeLine(${idx})`, peligro:true}])}</div>
      </div>`;
    }).join('')}`;
}

// Todo lo que depende de lo escrito (coste, margen, food cost, precio final, coste de cada línea) en un solo sitio.
// Se llama en cada tecla: solo toca textos, nunca repinta, así el cursor no se mueve.
function esRecalcular(){
  if(!escandalloHoja || !document.getElementById('recipe-name')) return;
  const st = currentRecipeFormState(escandalloHoja.id);
  const r = {...st, ingredients: recipeModalLines, isBase: escandalloHoja.isBase};
  const bd = recipeCostBreakdown(r);
  const set = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  set('es-k-coste', fmtMoney(bd.total));
  set('es-d-ing', fmtMoney(bd.costeIng));
  set('es-d-cons', fmtMoney(bd.costeCons));
  recipeModalLines.forEach((line, i) => {
    const c = recipeIngredientCost(line);
    set('es-lc-' + i, fmtMoney(c));
    set('es-lp-' + i, bd.total > 0 ? fmtPct1(c / bd.total * 100) + '%' : '0,0%');
  });
  if(escandalloHoja.isBase){
    const rinde = parseFloat(r.baseYield) || 1;
    set('es-k-rinde', `${fmtNum(rinde)} ${r.baseUnit || 'L'}`);
    set('es-k-ud', fmtMoney(bd.total / rinde));
  } else {
    const base = r.priceBase || 0;
    const iva = r.ivaPct;
    const final = esPrecioFinal(base, iva);
    const margen = base - bd.total;
    const pct = base > 0 ? bd.total / base * 100 : Infinity;
    set('es-k-pvp', fmtMoney(final));
    const m = document.getElementById('es-k-margen');
    if(m){ m.textContent = fmtMoney(margen); m.style.color = margen >= 0 ? 'var(--green)' : 'var(--red)'; }
    const fc = document.getElementById('es-k-fc');
    if(fc){
      fc.textContent = isFinite(pct) ? fmtPct1(pct) + '%' : '—';
      fc.style.color = !isFinite(pct) ? '' : pct > 35 ? 'var(--red)' : pct > 28 ? '#8A5A0F' : 'var(--green)';
    }
    updateRecipeFinalPriceDisplay();
    const ivaEl = document.getElementById('recipe-iva');
    if(ivaEl) ivaEl.classList.toggle('is-falta', ivaEl.value === '');
  }
  const av = document.getElementById('es-aviso-circular');
  if(av) av.innerHTML = recipeHasCircularReference(r) ? `<div class="idr-nota is-aviso"><h4><i class="ti ti-alert-triangle"></i> ${gl({es:'Referencia circular', ca:'Referència circular', en:'Circular reference'})}</h4><p>${t('escandallo.circularWarning')}</p></div>` : '';
  esMarcarCambio();
}
function esLineaQty(idx, v){ if(recipeModalLines[idx]){ recipeModalLines[idx].qty = parseFloat(v) || 0; esRecalcular(); } }
function esLineaMerma(idx, v){ if(recipeModalLines[idx]){ recipeModalLines[idx].merma = parseFloat(v) || 0; esRecalcular(); } }

function filterRecipeIngredientResults(id){
  const area = (escandalloHoja && esHojaDatos().area) || currentArea();
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
    results.innerHTML = `<div class="es-res-vacio">${t('common.noResults')}</div>`;
  } else {
    const renderItem = m => `
      <div class="es-res" onmousedown="selectRecipeIngredientResult(${id||'null'}, '${m.type}', ${m.id})">
        <span>${m.type==='base' ? `<i class="ti ${area==='sala'?'ti-flask':'ti-soup'}"></i> ` : ''}${escapeHtml(m.name)}</span>
        <small>${m.type==='base' ? `${t('label.baseShort')} · ${fmtMoney(m.perUnit)}/${escapeHtml(m.unit)}` : escapeHtml(m.unit)}</small>
      </div>`;
    const cab = label => `<div class="es-res-cab">${label}</div>`;
    results.innerHTML =
      (baseLimited.length ? cab(t('label.elaborations')) + baseLimited.map(renderItem).join('') : '') +
      (ingLimited.length ? cab(t('label.ingredients')) + ingLimited.map(renderItem).join('') : '');
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
  const q = document.getElementById('recipe-add-qty'); if(q) q.focus();
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
  document.getElementById('recipe-add-ingredient').value = '';
  document.getElementById('recipe-add-ingredient-search').value = '';
  esPintarLineas(); esRecalcular(); esPintarExtra();
  const b = document.getElementById('recipe-add-ingredient-search'); if(b) b.focus();
}
function updateRecipeLineQty(idx, value){ esLineaQty(idx, value); }
function updateRecipeLineMerma(idx, value){ esLineaMerma(idx, value); }
function removeRecipeLine(idx){
  recipeModalLines.splice(idx,1);
  esPintarLineas(); esRecalcular(); esPintarExtra();
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
        <button type="button" class="btn btn-fino" onclick="cancelNewRecipeCategory(${id||'null'})">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-on" onclick="confirmNewRecipeCategory(${id||'null'})">${t('common.add')}</button>
      </div>
    `);
    setTimeout(()=>document.getElementById('new-recipe-category-name')?.focus(), 50);
  }
}
// Al elegir o cancelar una categoría nueva se repinta la hoja con lo que ya estaba escrito.
function esRepintarConEstado(state){
  closeModal();
  const foto = escandalloHojaBase;
  esPintarHoja({...esHojaDatos(), ...state, ingredients: recipeModalLines});
  escandalloHojaBase = foto;       // es el mismo trabajo sin guardar, no una hoja nueva
  esMarcarCambio();
}
function cancelNewRecipeCategory(id){
  const state = recipeFormStateBeforeCategory || currentRecipeFormState(id);
  state.category = '';
  recipeFormStateBeforeCategory = null;
  esRepintarConEstado(state);
}
function confirmNewRecipeCategory(id){
  const name = document.getElementById('new-recipe-category-name').value;
  const state = recipeFormStateBeforeCategory || currentRecipeFormState(id);
  if(name && name.trim()){
    const cat = name.trim();
    // Se avisa aquí, no al sincronizar: el nombre acaba siendo clave de Firebase.
    if(!nombreDeCarpetaValido(cat)) return;
    const exists = areaRecipeCategories().some(c => (typeof c==='object'?c.name:c) === cat);
    if(!exists){ DB.recipeCategories.push({name: cat, area: currentArea()}); saveDB(); }
    state.category = cat;
  } else {
    state.category = '';
  }
  recipeFormStateBeforeCategory = null;
  esRepintarConEstado(state);
}
// Lo que hay escrito ahora mismo en la hoja (o, donde no hay campo, lo guardado).
function currentRecipeFormState(id){
  const nameEl = document.getElementById('recipe-name');
  const priceBaseEl = document.getElementById('recipe-price-base');
  const ivaEl = document.getElementById('recipe-iva');
  const consumiblesEl = document.getElementById('recipe-consumibles');
  const categoryEl = document.getElementById('recipe-category');
  const baseYieldEl = document.getElementById('recipe-base-yield');
  const baseUnitEl = document.getElementById('recipe-base-unit');
  const supplementEl = document.getElementById('recipe-delivery-supplement');
  const r = id ? (getRecipe(id) || {}) : {};
  const priceBase = priceBaseEl ? parseFloat(priceBaseEl.value)||0 : (r.priceBase!=null?r.priceBase:(r.price||0));
  const ivaPct = ivaEl ? (ivaEl.value===''?null:parseFloat(ivaEl.value)) : (r.ivaPct!=null?r.ivaPct:null);
  const sup = supplementEl ? parseFloat(supplementEl.value) : r.deliverySupplement;
  return {
    name: nameEl ? nameEl.value : (r.name||''),
    priceBase,
    ivaPct,
    price: ivaPct!=null ? Math.round(priceBase*(1+ivaPct/100)*100)/100 : (r.price||0),
    deliverySupplement: isFinite(sup) && sup > 0 ? sup : null,
    comensales: 1,
    consumiblesPct: consumiblesEl ? (parseFloat(consumiblesEl.value) || 0) : (r.consumiblesPct!=null?r.consumiblesPct:5),
    category: categoryEl ? categoryEl.value : (r.category||''),
    isBase: escandalloHoja ? escandalloHoja.isBase : !!r.isBase,
    baseYield: baseYieldEl ? (parseFloat(baseYieldEl.value) || 1) : (r.baseYield!=null?r.baseYield:1),
    baseUnit: baseUnitEl ? baseUnitEl.value : (r.baseUnit||'L'),
    area: r.area || currentArea(),
  };
}
// El «precio final con IVA» a partir de los dos campos de precio. Es la cuenta que comparten Carta, Menú y Escandallo
// (test/dinero.mjs la comprueba con campos sueltos), así que no depende de que haya una hoja abierta.
function updateRecipeFinalPriceDisplay(){
  const baseEl = document.getElementById('recipe-price-base');
  const ivaEl = document.getElementById('recipe-iva');
  const display = document.getElementById('recipe-price-final-display');
  if(!baseEl || !ivaEl || !display) return;
  const base = parseFloat(baseEl.value) || 0;
  const iva = ivaEl.value === '' ? 0 : parseFloat(ivaEl.value);
  display.textContent = fmtMoney(base * (1 + iva/100));
  const supplementEl = document.getElementById('recipe-delivery-supplement');
  const deliveryDisplay = document.getElementById('recipe-price-delivery-final-display');
  if(supplementEl && deliveryDisplay) deliveryDisplay.textContent = fmtMoney(base * (1 + iva/100) + (parseFloat(supplementEl.value) || 0));
}

async function saveRecipe(id){
  if(!isOwnerSession() && !editUnlocked) return false;
  // Desde la hoja se llama sin id: manda el de la hoja abierta (un plato nuevo pasa a existir al primer guardado).
  if(id === undefined && escandalloHoja) id = escandalloHoja.id;
  id = id || null;
  const name = document.getElementById('recipe-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); document.getElementById('recipe-name').focus(); return false; }
  // Aviso (no bloqueante) de posible plato duplicado, mismo criterio ya
  // usado en Clientes/Proveedores/Mega Lista — fácil dar de alta "Ensalada
  // César" dos veces sin darse cuenta y que una de las dos fichas quede
  // huérfana sin usarse en ninguna carta.
  const isBaseEl = document.getElementById('recipe-is-base');
  const isBase = isBaseEl ? isBaseEl.checked : false;
  const dupe = DB.recipes.find(r => r.id !== id && (r.area||'cocina')===currentArea() && !!r.isBase===isBase && r.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateRecipe').replace('${name}', dupe.name)))) return false;
  // Una elaboración base no se vende directamente (no tiene precio de venta
  // ni IVA repercutido propios) — lo que interesa de ella es su coste total
  // y el coste por unidad de rendimiento, no un precio de venta.
  let priceBase = 0, ivaPct = null, price = 0, deliverySupplement = null;
  if(!isBase){
    priceBase = Math.max(0, parseFloat(document.getElementById('recipe-price-base').value) || 0);
    const ivaRaw = document.getElementById('recipe-iva').value;
    if(ivaRaw === ''){ showToast(t('msg.chooseIvaForDish')); document.getElementById('recipe-iva').focus(); return false; }
    ivaPct = parseFloat(ivaRaw);
    price = Math.round(priceBase * (1 + ivaPct/100) * 100) / 100;
    // Suplemento delivery: un importe fijo (ya con IVA, como un extra/
    // modificador) que se SUMA al precio de sala en pedidos a domicilio del
    // propio negocio — no un precio independiente que mantener sincronizado.
    // null/0 = sin suplemento, se cobra igual que en sala.
    const supplementEl = document.getElementById('recipe-delivery-supplement');
    if(supplementEl){
      const raw = parseFloat(supplementEl.value);
      deliverySupplement = (isFinite(raw) && raw > 0) ? Math.round(raw*100)/100 : null;
    }
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
    if(!r) return false;
    // "Elaboración base" solo se decide al crear el plato/elaboración (el
    // checkbox está deshabilitado al editar uno existente) — así una
    // elaboración nunca puede acabar puesta a la venta como plato, ni
    // viceversa.
    Object.assign(r, {name, price, priceBase, deliverySupplement, ivaPct, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], isBase: r.isBase, baseYield, baseUnit});
  }else{
    recipeId = genId();
    DB.recipes.push({id: recipeId, name, price, priceBase, deliverySupplement, ivaPct, comensales, consumiblesPct, category, ingredients, allergens:[...allergenSet], area: currentArea(), isBase, baseYield, baseUnit});
  }
  syncElaboracionForRecipe(recipeId, isBase, name, baseUnit);
  ensureFichaForRecipe(recipeId);
  saveDB();
  // Se queda en la hoja (ya con su id, si era nueva): la lista queda a un toque en «Volver».
  if(escandalloHoja){
    escandalloHoja.id = recipeId;
    escandalloHojaNueva = null;
    recipeModalLines = (getRecipe(recipeId).ingredients || []).map(l => ({...l}));
    esPintarHoja();
  } else renderEscandallo();
  showToast(t('msg.dishSaved'));
  return true;
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
  showToast(t('msg.dishDuplicated'));
  // El menú «⋯» se puede abrir con otra hoja con cambios: antes de saltar a la copia se pregunta.
  const abrir = () => { escandalloHoja = null; openRecipeModal(copy.id); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(abrir); else abrir();
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
      <div class="idr-modal"></div>
      <div class="modal-header">
        <h3><i class="ti ti-alert-triangle"></i> ${t('title.dishInUse')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      ${cartaHits.length ? `
        <p class="ml-intro">${t('msg.dishInCartaWarning').replace('${name}', escapeHtml(r?r.name:''))}</p>
        <div class="ml-uso">
          ${cartaHits.map(h=>`<div class="ml-uso-fila">${escapeHtml(h.carta.nombre)} <span class="es-pista">· ${escapeHtml(h.seccion.nombre)}</span></div>`).join('')}
        </div>
      ` : ''}
      ${dependentRecipes.length ? `
        <p class="ml-intro">${t('msg.baseRecipeInUseWarning').replace('${name}', escapeHtml(r?r.name:''))}</p>
        <div class="ml-uso">
          ${dependentRecipes.map(dr=>`<div class="ml-uso-fila">${escapeHtml(dr.name)}</div>`).join('')}
        </div>
      ` : ''}
      <div class="modal-footer">
        <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-off" onclick="confirmDeleteRecipe(${id})">${t('btn.deleteAnyway')}</button>
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
  // Si se borraba el plato de la hoja abierta, la hoja se cierra con él (sin preguntar por cambios de algo que ya no existe).
  if(escandalloHoja && escandalloHoja.id === id){ escandalloHoja = null; recipeModalLines = []; escandalloHojaBase = ''; }
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

/* ============================================================
   FICHA DE BEBIDA — Sala
   ============================================================
   La ficha de sala era la de cocina con otra etiqueta: pedía
   "comensales", "tiempo" y "emplatado". A un vino eso no le dice nada, y
   lo que de verdad hace falta —la añada, la temperatura de servicio en
   grados, la copa, la nota de cata, con qué plato marida— no cabía en
   ningún sitio.

   Esto es un REGISTRO, no una lista cerrada: añadir un tipo de bebida
   nuevo (sidra, vermut, kombucha, lo que sea) es añadir una entrada aquí
   y nada más — el formulario, el impreso y el guardado salen solos. Por
   eso los campos se declaran en vez de escribirse a mano en el HTML.

   Los textos van con gl({es,ca,en}) y no en i18n.js a propósito: son
   vocabulario del oficio, y tenerlos junto al campo que nombran evita
   que al añadir un tipo se olvide un idioma (que es justo el fallo que
   más se repite al tocar i18n).

   El VALOR guardado de las opciones es siempre el de `v` (estable, en
   español), igual que en las categorías y los alérgenos: así se puede
   cambiar la etiqueta o el idioma sin tocar los datos ya guardados. */

// Tipos de campo: 'text' | 'num' | 'sel' | 'area' (texto largo)
//
// ⚠️ Estos campos NO son universales, aunque lo parezcan. Un zumo, un café
// o una infusión no tienen graduación alcohólica, y pedirla es un campo que
// nadie sabe qué rellenar. Y a un café tampoco se le pregunta la
// "temperatura de servicio": ya tiene la del agua y la de la leche, que es
// lo que de verdad se controla. Cada tipo declara lo que NO le aplica.
const BEBIDA_CAMPO_TEMP_SERVICIO = {k:'tempServicio', tipo:'num', unidad:'°C', min:-10, max:100, l:{es:'Temperatura de servicio',ca:'Temperatura de servei',en:'Serving temperature'}, ph:{es:'Ej. 8',ca:'Ex. 8',en:'e.g. 8'}};
const BEBIDA_CAMPO_GRADUACION = {k:'graduacion', tipo:'num', unidad:'% vol', min:0, max:100, paso:'0.1', l:{es:'Graduación',ca:'Graduació',en:'ABV'}, ph:{es:'Ej. 13,5',ca:'Ex. 13,5',en:'e.g. 13.5'}};
const BEBIDA_CAMPOS_COMUNES = [
  BEBIDA_CAMPO_TEMP_SERVICIO,
  {k:'cristaleria', tipo:'text', l:{es:'Copa, vaso o taza',ca:'Copa, got o tassa',en:'Glass or cup'}, ph:{es:'Ej. Copa de balón',ca:'Ex. Copa de baló',en:'e.g. Balloon glass'}},
  {k:'racion', tipo:'num', unidad:'ml', min:0, max:5000, l:{es:'Ración servida',ca:'Ració servida',en:'Serving size'}, ph:{es:'Ej. 150',ca:'Ex. 150',en:'e.g. 150'}},
  BEBIDA_CAMPO_GRADUACION,
];

const BEBIDA_CATA = [
  {k:'cataVista', tipo:'area', l:{es:'Cata — vista',ca:'Tast — vista',en:'Tasting — appearance'}, ph:{es:'Color, capa, lágrima…',ca:'Color, capa, llàgrima…',en:'Colour, depth, legs…'}},
  {k:'cataNariz', tipo:'area', l:{es:'Cata — nariz',ca:'Tast — nas',en:'Tasting — nose'}, ph:{es:'Intensidad, aromas…',ca:'Intensitat, aromes…',en:'Intensity, aromas…'}},
  {k:'cataBoca', tipo:'area', l:{es:'Cata — boca',ca:'Tast — boca',en:'Tasting — palate'}, ph:{es:'Acidez, taninos, final…',ca:'Acidesa, tanins, final…',en:'Acidity, tannins, finish…'}},
];
const BEBIDA_MARIDAJE = {k:'maridaje', tipo:'area', l:{es:'Maridaje',ca:'Maridatge',en:'Food pairing'}, ph:{es:'Con qué platos de la carta va bien',ca:'Amb quins plats de la carta va bé',en:'Which dishes on the menu it goes with'}};

const BEBIDA_TIPOS = [
  {
    key:'vino', icon:'ti-glass-full',
    l:{es:'Vino',ca:'Vi',en:'Wine'},
    campos:[
      {k:'tipoVino', tipo:'sel', l:{es:'Tipo',ca:'Tipus',en:'Style'}, opts:[
        {v:'Tinto', l:{es:'Tinto',ca:'Negre',en:'Red'}},
        {v:'Blanco', l:{es:'Blanco',ca:'Blanc',en:'White'}},
        {v:'Rosado', l:{es:'Rosado',ca:'Rosat',en:'Rosé'}},
        {v:'Generoso', l:{es:'Generoso',ca:'Generós',en:'Fortified'}},
        {v:'Dulce', l:{es:'Dulce',ca:'Dolç',en:'Sweet'}},
        {v:'Naranja', l:{es:'Naranja',ca:'Taronja',en:'Orange'}},
      ]},
      {k:'do', tipo:'text', l:{es:'D.O. / zona',ca:'D.O. / zona',en:'Appellation / region'}, ph:{es:'Ej. Ribera del Duero',ca:'Ex. Ribera del Duero',en:'e.g. Ribera del Duero'}},
      {k:'bodega', tipo:'text', l:{es:'Bodega',ca:'Celler',en:'Winery'}, ph:{es:'Ej. Bodegas…',ca:'Ex. Cellers…',en:'e.g. …Estate'}},
      {k:'anada', tipo:'num', min:1900, max:2100, l:{es:'Añada',ca:'Anyada',en:'Vintage'}, ph:{es:'Ej. 2019',ca:'Ex. 2019',en:'e.g. 2019'}},
      {k:'uvas', tipo:'text', l:{es:'Uva(s)',ca:'Raïm(s)',en:'Grape(s)'}, ph:{es:'Ej. Tempranillo 100%',ca:'Ex. Tempranillo 100%',en:'e.g. 100% Tempranillo'}},
      {k:'crianza', tipo:'text', l:{es:'Crianza',ca:'Criança',en:'Ageing'}, ph:{es:'Ej. 12 meses en roble francés',ca:'Ex. 12 mesos en roure francès',en:'e.g. 12 months in French oak'}},
      {k:'decantar', tipo:'sel', l:{es:'Decantación',ca:'Decantació',en:'Decanting'}, opts:[
        {v:'', l:{es:'No necesita',ca:'No cal',en:'Not needed'}},
        {v:'15 min', l:{es:'15 minutos',ca:'15 minuts',en:'15 minutes'}},
        {v:'30 min', l:{es:'30 minutos',ca:'30 minuts',en:'30 minutes'}},
        {v:'60 min', l:{es:'1 hora',ca:'1 hora',en:'1 hour'}},
        {v:'+60 min', l:{es:'Más de 1 hora',ca:'Més d\'1 hora',en:'Over 1 hour'}},
      ]},
      {k:'copasBotella', tipo:'num', min:0, max:50, l:{es:'Copas por botella',ca:'Copes per ampolla',en:'Glasses per bottle'}, ph:{es:'Ej. 5',ca:'Ex. 5',en:'e.g. 5'}},
      ...BEBIDA_CATA,
      BEBIDA_MARIDAJE,
      {k:'consumoDesde', tipo:'num', min:1900, max:2100, l:{es:'Beber desde',ca:'Beure des de',en:'Drink from'}, ph:{es:'Ej. 2024',ca:'Ex. 2024',en:'e.g. 2024'}},
      {k:'consumoHasta', tipo:'num', min:1900, max:2100, l:{es:'Beber hasta',ca:'Beure fins a',en:'Drink until'}, ph:{es:'Ej. 2030',ca:'Ex. 2030',en:'e.g. 2030'}},
    ],
  },
  {
    key:'espumoso', icon:'ti-glass-champagne',
    l:{es:'Espumoso (cava, champagne…)',ca:'Escumós (cava, xampany…)',en:'Sparkling (cava, champagne…)'},
    campos:[
      {k:'do', tipo:'text', l:{es:'D.O. / zona',ca:'D.O. / zona',en:'Appellation / region'}, ph:{es:'Ej. Cava, Champagne…',ca:'Ex. Cava, Xampany…',en:'e.g. Cava, Champagne…'}},
      {k:'bodega', tipo:'text', l:{es:'Bodega',ca:'Celler',en:'House'}, ph:{es:'Ej. Bodegas…',ca:'Ex. Cellers…',en:'e.g. …House'}},
      {k:'anada', tipo:'num', min:1900, max:2100, l:{es:'Añada',ca:'Anyada',en:'Vintage'}, ph:{es:'En blanco si no lleva',ca:'En blanc si no en porta',en:'Blank if non-vintage'}},
      {k:'metodo', tipo:'sel', l:{es:'Método',ca:'Mètode',en:'Method'}, opts:[
        {v:'Tradicional', l:{es:'Tradicional (en botella)',ca:'Tradicional (en ampolla)',en:'Traditional (bottle)'}},
        {v:'Granvás', l:{es:'Granvás / Charmat',ca:'Granvàs / Charmat',en:'Charmat (tank)'}},
        {v:'Ancestral', l:{es:'Ancestral',ca:'Ancestral',en:'Ancestral'}},
      ]},
      {k:'dosaje', tipo:'sel', l:{es:'Dosaje / dulzor',ca:'Dosatge / dolçor',en:'Dosage / sweetness'}, opts:[
        {v:'Brut Nature', l:{es:'Brut Nature',ca:'Brut Nature',en:'Brut Nature'}},
        {v:'Extra Brut', l:{es:'Extra Brut',ca:'Extra Brut',en:'Extra Brut'}},
        {v:'Brut', l:{es:'Brut',ca:'Brut',en:'Brut'}},
        {v:'Extra Seco', l:{es:'Extra Seco',ca:'Extra Sec',en:'Extra Dry'}},
        {v:'Seco', l:{es:'Seco',ca:'Sec',en:'Dry'}},
        {v:'Semiseco', l:{es:'Semiseco',ca:'Semisec',en:'Demi-sec'}},
        {v:'Dulce', l:{es:'Dulce',ca:'Dolç',en:'Sweet'}},
      ]},
      {k:'uvas', tipo:'text', l:{es:'Uva(s)',ca:'Raïm(s)',en:'Grape(s)'}, ph:{es:'Ej. Macabeo, Xarel·lo, Parellada',ca:'Ex. Macabeu, Xarel·lo, Parellada',en:'e.g. Macabeo, Xarel·lo, Parellada'}},
      {k:'crianza', tipo:'text', l:{es:'Meses en rima',ca:'Mesos en rima',en:'Months on lees'}, ph:{es:'Ej. 18 meses',ca:'Ex. 18 mesos',en:'e.g. 18 months'}},
      ...BEBIDA_CATA,
      BEBIDA_MARIDAJE,
    ],
  },
  {
    key:'cerveza', icon:'ti-beer',
    l:{es:'Cerveza',ca:'Cervesa',en:'Beer'},
    campos:[
      {k:'estilo', tipo:'text', l:{es:'Estilo',ca:'Estil',en:'Style'}, ph:{es:'Ej. IPA, Pilsner, Stout…',ca:'Ex. IPA, Pilsner, Stout…',en:'e.g. IPA, Pilsner, Stout…'}},
      {k:'cervecera', tipo:'text', l:{es:'Cervecera',ca:'Cerveseria',en:'Brewery'}, ph:{es:'Ej. …',ca:'Ex. …',en:'e.g. …'}},
      {k:'ibu', tipo:'num', min:0, max:200, l:{es:'Amargor (IBU)',ca:'Amargor (IBU)',en:'Bitterness (IBU)'}, ph:{es:'Ej. 40',ca:'Ex. 40',en:'e.g. 40'}},
      {k:'formato', tipo:'sel', l:{es:'Formato',ca:'Format',en:'Format'}, opts:[
        {v:'Barril', l:{es:'Barril (de grifo)',ca:'Barril (de aixeta)',en:'Keg (draught)'}},
        {v:'Botella', l:{es:'Botella',ca:'Ampolla',en:'Bottle'}},
        {v:'Lata', l:{es:'Lata',ca:'Llauna',en:'Can'}},
      ]},
      {k:'tirada', tipo:'area', l:{es:'Cómo tirarla',ca:'Com tirar-la',en:'How to pour it'}, ph:{es:'Ángulo, dedos de espuma, cómo enjuagar la copa…',ca:'Angle, dits d\'escuma, com esbandir la copa…',en:'Angle, head, how to rinse the glass…'}},
      BEBIDA_MARIDAJE,
    ],
  },
  {
    key:'destilado', icon:'ti-bottle',
    l:{es:'Destilado y licor',ca:'Destil·lat i licor',en:'Spirit & liqueur'},
    campos:[
      {k:'categoria', tipo:'sel', l:{es:'Categoría',ca:'Categoria',en:'Category'}, opts:[
        {v:'Whisky', l:{es:'Whisky',ca:'Whisky',en:'Whisky'}},
        {v:'Ginebra', l:{es:'Ginebra',ca:'Ginebra',en:'Gin'}},
        {v:'Ron', l:{es:'Ron',ca:'Rom',en:'Rum'}},
        {v:'Vodka', l:{es:'Vodka',ca:'Vodka',en:'Vodka'}},
        {v:'Brandy', l:{es:'Brandy / Coñac',ca:'Brandi / Conyac',en:'Brandy / Cognac'}},
        {v:'Tequila', l:{es:'Tequila',ca:'Tequila',en:'Tequila'}},
        {v:'Mezcal', l:{es:'Mezcal',ca:'Mezcal',en:'Mezcal'}},
        {v:'Vermut', l:{es:'Vermut',ca:'Vermut',en:'Vermouth'}},
        {v:'Anís', l:{es:'Anís',ca:'Anís',en:'Anise'}},
        {v:'Orujo', l:{es:'Orujo / Aguardiente',ca:'Orujo / Aiguardent',en:'Grappa / Marc'}},
        {v:'Licor', l:{es:'Licor / Crema',ca:'Licor / Crema',en:'Liqueur / Cream'}},
        {v:'Otro', l:{es:'Otro',ca:'Altre',en:'Other'}},
      ]},
      {k:'destileria', tipo:'text', l:{es:'Destilería / marca',ca:'Destil·leria / marca',en:'Distillery / brand'}, ph:{es:'Ej. …',ca:'Ex. …',en:'e.g. …'}},
      {k:'origen', tipo:'text', l:{es:'Origen',ca:'Origen',en:'Origin'}, ph:{es:'Ej. Escocia, Highlands',ca:'Ex. Escòcia, Highlands',en:'e.g. Scotland, Highlands'}},
      {k:'anejamiento', tipo:'text', l:{es:'Añejamiento',ca:'Envelliment',en:'Ageing'}, ph:{es:'Ej. 12 años en barrica de jerez',ca:'Ex. 12 anys en bóta de xerès',en:'e.g. 12 years in sherry casks'}},
      {k:'servir', tipo:'sel', l:{es:'Cómo se sirve',ca:'Com se serveix',en:'How it is served'}, opts:[
        {v:'Solo', l:{es:'Solo',ca:'Sol',en:'Neat'}},
        {v:'Con hielo', l:{es:'Con hielo',ca:'Amb gel',en:'On the rocks'}},
        {v:'Combinado', l:{es:'Combinado',ca:'Combinat',en:'Long drink'}},
        {v:'En coctelería', l:{es:'En coctelería',ca:'En cocteleria',en:'In cocktails'}},
      ]},
      {k:'guarnicion', tipo:'text', l:{es:'Guarnición',ca:'Guarnició',en:'Garnish'}, ph:{es:'Ej. Piel de limón',ca:'Ex. Pell de llimona',en:'e.g. Lemon peel'}},
      BEBIDA_MARIDAJE,
    ],
  },
  {
    key:'coctel', icon:'ti-glass-cocktail',
    l:{es:'Coctelería',ca:'Cocteleria',en:'Cocktail'},
    campos:[
      {k:'familia', tipo:'sel', l:{es:'Familia',ca:'Família',en:'Family'}, opts:[
        {v:'Sour', l:{es:'Sour',ca:'Sour',en:'Sour'}},
        {v:'Highball', l:{es:'Highball',ca:'Highball',en:'Highball'}},
        {v:'Old Fashioned', l:{es:'Old Fashioned',ca:'Old Fashioned',en:'Old Fashioned'}},
        {v:'Martini', l:{es:'Martini',ca:'Martini',en:'Martini'}},
        {v:'Tiki', l:{es:'Tiki',ca:'Tiki',en:'Tiki'}},
        {v:'Spritz', l:{es:'Spritz / Aperitivo',ca:'Spritz / Aperitiu',en:'Spritz / Aperitif'}},
        {v:'Otro', l:{es:'Otra',ca:'Altra',en:'Other'}},
      ]},
      {k:'tecnica', tipo:'sel', l:{es:'Técnica',ca:'Tècnica',en:'Technique'}, opts:[
        {v:'Batido', l:{es:'Batido (coctelera)',ca:'Batut (cocteleria)',en:'Shaken'}},
        {v:'Refrescado', l:{es:'Refrescado (vaso mezclador)',ca:'Refrescat (got mesclador)',en:'Stirred'}},
        {v:'Directo', l:{es:'Directo en copa',ca:'Directe a la copa',en:'Built in glass'}},
        {v:'Licuado', l:{es:'Licuado / frozen',ca:'Liquat / frozen',en:'Blended / frozen'}},
        {v:'Flameado', l:{es:'Flameado',ca:'Flamejat',en:'Flamed'}},
      ]},
      {k:'hielo', tipo:'sel', l:{es:'Hielo',ca:'Gel',en:'Ice'}, opts:[
        {v:'Sin hielo', l:{es:'Sin hielo',ca:'Sense gel',en:'No ice'}},
        {v:'Cubo', l:{es:'Cubo',ca:'Cub',en:'Cubed'}},
        {v:'Roca grande', l:{es:'Roca grande',ca:'Roca gran',en:'Large rock'}},
        {v:'Picado', l:{es:'Picado',ca:'Picat',en:'Crushed'}},
        {v:'Escarchado', l:{es:'Copa escarchada',ca:'Copa gebrada',en:'Frosted glass'}},
      ]},
      {k:'guarnicion', tipo:'text', l:{es:'Guarnición',ca:'Guarnició',en:'Garnish'}, ph:{es:'Ej. Twist de naranja',ca:'Ex. Twist de taronja',en:'e.g. Orange twist'}},
      // La dilución del hielo es lo que hace que el coste por copa de un
      // cóctel batido no cuadre nunca si se calcula como un plato: gana
      // entre un 20% y un 25% de agua.
      {k:'dilucion', tipo:'num', unidad:'%', min:0, max:60, l:{es:'Dilución del hielo',ca:'Dilució del gel',en:'Ice dilution'}, ph:{es:'Ej. 22',ca:'Ex. 22',en:'e.g. 22'}},
    ],
  },
  {
    key:'cafe', icon:'ti-coffee', sinAlcohol:true, sinTempServicio:true,
    l:{es:'Café',ca:'Cafè',en:'Coffee'},
    campos:[
      {k:'metodo', tipo:'sel', l:{es:'Método',ca:'Mètode',en:'Method'}, opts:[
        {v:'Espresso', l:{es:'Espresso',ca:'Espresso',en:'Espresso'}},
        {v:'Filtro', l:{es:'Filtro / goteo',ca:'Filtre / degoteig',en:'Filter / drip'}},
        {v:'V60', l:{es:'V60 / Chemex',ca:'V60 / Chemex',en:'V60 / Chemex'}},
        {v:'Aeropress', l:{es:'Aeropress',ca:'Aeropress',en:'Aeropress'}},
        {v:'Cold brew', l:{es:'Cold brew',ca:'Cold brew',en:'Cold brew'}},
        {v:'Italiana', l:{es:'Italiana / moka',ca:'Italiana / moka',en:'Moka pot'}},
        {v:'Prensa', l:{es:'Prensa francesa',ca:'Premsa francesa',en:'French press'}},
      ]},
      {k:'origen', tipo:'text', l:{es:'Origen',ca:'Origen',en:'Origin'}, ph:{es:'Ej. Etiopía, Yirgacheffe',ca:'Ex. Etiòpia, Yirgacheffe',en:'e.g. Ethiopia, Yirgacheffe'}},
      {k:'tueste', tipo:'sel', l:{es:'Tueste',ca:'Torrat',en:'Roast'}, opts:[
        {v:'Claro', l:{es:'Claro',ca:'Clar',en:'Light'}},
        {v:'Medio', l:{es:'Medio',ca:'Mitjà',en:'Medium'}},
        {v:'Oscuro', l:{es:'Oscuro',ca:'Fosc',en:'Dark'}},
        {v:'Torrefacto', l:{es:'Torrefacto',ca:'Torrefacte',en:'Torrefacto'}},
      ]},
      {k:'molienda', tipo:'text', l:{es:'Molienda',ca:'Mòlta',en:'Grind'}, ph:{es:'Ej. Fina, punto 3 del molino',ca:'Ex. Fina, punt 3 del molí',en:'e.g. Fine, grinder setting 3'}},
      {k:'gramaje', tipo:'num', unidad:'g', min:0, max:200, paso:'0.1', l:{es:'Gramaje',ca:'Gramatge',en:'Dose'}, ph:{es:'Ej. 18',ca:'Ex. 18',en:'e.g. 18'}},
      {k:'tiempoExtraccion', tipo:'num', unidad:'s', min:0, max:1200, l:{es:'Tiempo de extracción',ca:'Temps d\'extracció',en:'Extraction time'}, ph:{es:'Ej. 27',ca:'Ex. 27',en:'e.g. 27'}},
      {k:'tempAgua', tipo:'num', unidad:'°C', min:0, max:100, l:{es:'Temperatura del agua',ca:'Temperatura de l\'aigua',en:'Water temperature'}, ph:{es:'Ej. 93',ca:'Ex. 93',en:'e.g. 93'}},
      {k:'tempLeche', tipo:'num', unidad:'°C', min:0, max:100, l:{es:'Temperatura de la leche',ca:'Temperatura de la llet',en:'Milk temperature'}, ph:{es:'Ej. 65',ca:'Ex. 65',en:'e.g. 65'}},
    ],
  },
  {
    key:'infusion', icon:'ti-mug', sinAlcohol:true, sinTempServicio:true,
    l:{es:'Té e infusiones',ca:'Te i infusions',en:'Tea & infusions'},
    campos:[
      {k:'tipoInfusion', tipo:'sel', l:{es:'Tipo',ca:'Tipus',en:'Type'}, opts:[
        {v:'Verde', l:{es:'Té verde',ca:'Te verd',en:'Green tea'}},
        {v:'Negro', l:{es:'Té negro',ca:'Te negre',en:'Black tea'}},
        {v:'Blanco', l:{es:'Té blanco',ca:'Te blanc',en:'White tea'}},
        {v:'Oolong', l:{es:'Oolong',ca:'Oolong',en:'Oolong'}},
        {v:'Rooibos', l:{es:'Rooibos',ca:'Rooibos',en:'Rooibos'}},
        {v:'Herbal', l:{es:'Infusión de hierbas',ca:'Infusió d\'herbes',en:'Herbal infusion'}},
      ]},
      {k:'tempAgua', tipo:'num', unidad:'°C', min:0, max:100, l:{es:'Temperatura del agua',ca:'Temperatura de l\'aigua',en:'Water temperature'}, ph:{es:'Ej. 80',ca:'Ex. 80',en:'e.g. 80'}},
      {k:'tiempoInfusion', tipo:'num', unidad:'min', min:0, max:60, paso:'0.5', l:{es:'Tiempo de infusión',ca:'Temps d\'infusió',en:'Steeping time'}, ph:{es:'Ej. 3',ca:'Ex. 3',en:'e.g. 3'}},
      {k:'gramaje', tipo:'num', unidad:'g', min:0, max:200, paso:'0.1', l:{es:'Gramaje',ca:'Gramatge',en:'Dose'}, ph:{es:'Ej. 2',ca:'Ex. 2',en:'e.g. 2'}},
    ],
  },
  {
    key:'sinalcohol', icon:'ti-glass', sinAlcohol:true,
    l:{es:'Sin alcohol (refrescos, zumos, mocktails)',ca:'Sense alcohol (refrescs, sucs, mocktails)',en:'Non-alcoholic (soft drinks, juices, mocktails)'},
    campos:[
      {k:'guarnicion', tipo:'text', l:{es:'Guarnición',ca:'Guarnició',en:'Garnish'}, ph:{es:'Ej. Rodaja de lima',ca:'Ex. Rodanxa de llima',en:'e.g. Lime wheel'}},
      {k:'hielo', tipo:'sel', l:{es:'Hielo',ca:'Gel',en:'Ice'}, opts:[
        {v:'Sin hielo', l:{es:'Sin hielo',ca:'Sense gel',en:'No ice'}},
        {v:'Cubo', l:{es:'Cubo',ca:'Cub',en:'Cubed'}},
        {v:'Picado', l:{es:'Picado',ca:'Picat',en:'Crushed'}},
      ]},
    ],
  },
  {
    key:'otra', icon:'ti-glass-gin',
    l:{es:'Otra bebida o preparado',ca:'Altra beguda o preparat',en:'Other drink or preparation'},
    campos:[],
  },
];

function bebidaTipoDef(key){ return BEBIDA_TIPOS.find(x => x.key === key) || null; }
// Los campos de un tipo: los comunes que SÍ le aplican, más los suyos.
function bebidaCamposDe(key){
  const def = bebidaTipoDef(key);
  if(!def) return [];
  const comunes = BEBIDA_CAMPOS_COMUNES.filter(c => {
    if(def.sinAlcohol && c.k === 'graduacion') return false;
    if(def.sinTempServicio && c.k === 'tempServicio') return false;
    return true;
  });
  return [...comunes, ...def.campos];
}
// Firebase no guarda objetos vacíos: una ficha sincronizada puede volver sin
// `bebida`. Se normaliza siempre aquí en vez de en cada sitio que la lee.
function bebidaDatos(f){
  return (f && f.bebida && typeof f.bebida === 'object') ? f.bebida : {};
}
function bebidaValorLabel(campo, valor){
  if(!campo.opts) return valor;
  const op = campo.opts.find(o => o.v === valor);
  return op ? gl(op.l) : valor;
}
// Las líneas rellenas de la ficha, ya traducidas, para el formulario impreso
// y para la tarjeta. Las vacías no se enseñan: una ficha de vino a medias
// llena de "—" se lee peor que una corta.
function bebidaLineasRellenas(f){
  const datos = bebidaDatos(f);
  return bebidaCamposDe(f && f.bebidaTipo).map(c => {
    const v = datos[c.k];
    if(v === undefined || v === null || String(v).trim() === '') return null;
    return {label: gl(c.l), valor: bebidaValorLabel(c, String(v)) + (c.unidad ? ' ' + c.unidad : ''), largo: c.tipo === 'area'};
  }).filter(Boolean);
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

let fichasTab = 'platos'; // 'platos' | 'elaboraciones'
function setFichasTab(tab){
  // Con una ficha a medias, cambiar de pestaña también pregunta.
  const cambiar = () => { fichaHoja = false; fichaModalState = null; fichaHojaBase = ''; fichasTab = tab; fichasFolder = null; renderFichas(); scrollContentToTop(); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(cambiar); else cambiar();
}

// Carpeta de categoría actualmente abierta en Fichas Técnicas (null = vista de carpetas)
let fichasFolder = null;
function openFichaFolder(catKey){
  fichasFolder = catKey;
  renderFichas();
}
function backToFichaFolders(){
  fichasFolder = null;
  fichaHoja = false;
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

  document.getElementById('view-fichas').classList.toggle('es-en-hoja', !!(fichaHoja && fichaModalState));
  document.getElementById('fichas-tab-platos').classList.toggle('is-on', !isElab);
  document.getElementById('fichas-tab-elaboraciones').classList.toggle('is-on', isElab);
  const fichasPlatosTabLabel = document.querySelector('#fichas-tab-platos [data-i18n]');
  if(fichasPlatosTabLabel) fichasPlatosTabLabel.textContent = currentArea()==='sala' ? t('tab.drinks') : t('tab.dishes');
  ajustaIconoPestana('fichas-tab-platos', iconoPestanaPlatos());
  ajustaIconoPestana('fichas-tab-elaboraciones', iconoPestanaElaboraciones());

  // La ficha (ver más abajo) es la ÚNICA pantalla donde se crea, se lee y se edita.
  if(fichaHoja && fichaModalState){ renderFichaModal(); return; }

  const searching = !!(search || cat);
  const unidades = n => currentArea()==='sala' ? (n===1?t('label.oneDrink'):t('label.nDrinks').replace('${n}', n)) : (n===1?t('label.oneDish'):t('label.nDishes').replace('${n}', n));

  // Fichas sueltas (sin vincular a ningún plato de Escandallo, o vinculadas
  // a uno que ya no existe) que coinciden con la búsqueda actual — se
  // calcula ANTES de cualquier "no hay nada que enseñar" para no perderlas
  // de vista solo porque no haya ningún plato de Escandallo que además
  // coincida con esa misma búsqueda.
  const orphanFichas = (!searching && fichasFolder !== null) ? [] : DB.fichas.filter(f => (!f.recipeId || !getRecipe(f.recipeId)) && (f.area||'cocina') === currentArea() && (!search || f.name.toLowerCase().includes(search)));

  if(!areaRecipes.length){
    if(!orphanFichas.length){
      box.innerHTML = `<div class="empty"><i class="ti ti-file-description"></i>${isElab ? t(currentArea()==='sala' ? 'empty.elaborations.none.sala' : 'empty.elaborations.none') : (currentArea()==='sala' ? t('empty.drinks') : t('empty.dishes'))}</div>`;
      return;
    }
  } else if(!searching && fichasFolder === null){
    // Vista de carpetas por categoría (las mismas tarjetas que Escandallo y Mega Lista)
    const folders = getEscandalloFolders(areaRecipes);
    box.innerHTML = `<div class="ml-carpetas">${folders.map(([key, label, group]) => {
      const k = escapeJsAttr(key);
      const real = key !== '__none__';
      const guardado = (DB.categoryIcons && DB.categoryIcons.recipe && DB.categoryIcons.recipe[key]) || '';
      const icono = (real && iconoSeccionHtml(guardado, label, 26)) || '<i class="ti ti-folder"></i>';
      const sinFicha = group.filter(r => !DB.fichas.some(f => f.recipeId === r.id)).length;
      return `
      <div class="ml-carpeta" role="button" tabindex="0" onclick="openFichaFolder('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFichaFolder('${k}')}">
        ${real
          ? `<span class="cat-icon-btn ml-ico" role="button" title="${escapeHtml(t('title.chooseFolderIcon'))}" aria-label="${escapeHtml(t('title.chooseFolderIcon'))}" onclick="event.stopPropagation();openCategoryIconModal('${k}','${k}','renderFichas','recipe')">${icono}</span>`
          : `<span class="ml-ico">${icono}</span>`}
        <div class="ml-carpeta-txt">
          <div class="ml-carpeta-nom">${escapeHtml(label)}</div>
          <div class="ml-carpeta-meta">${unidades(group.length)}</div>
          ${sinFicha ? `<div class="ml-carpeta-pend">${gl({es:'sin ficha', ca:'sense fitxa', en:'no sheet'})}: ${sinFicha}</div>` : ''}
        </div>
        ${real ? botonesDeCarpeta(key, 'recipe') : ''}
      </div>`;
    }).join('')}</div>${orphanFichas.length ? `<h3 class="es-grupo">${currentArea()==='sala' ? t('title.unlinkedTechSheetsDrink') : t('title.unlinkedTechSheetsDish')} <span>${orphanFichas.length}</span></h3><div class="es-platos">${orphanFichas.map(fiTarjetaSueltaHtml).join('')}</div>` : ''}`;
    return;
  }

  const backBtn = (!searching && fichasFolder !== null)
    ? `<div class="ml-ruta"><button type="button" class="btn btn-sm btn-fino" onclick="backToFichaFolders()"><i class="ti ti-arrow-left"></i> ${t('common.category')}</button><div class="ml-ruta-nom">${escapeHtml(fichasFolder === '__none__' ? t('label.noCategory') : fichasFolder)}</div></div>` : '';

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
        <h3 class="es-grupo">${escapeHtml(catName)} <span>${group.length}</span></h3>
        <div class="es-platos">${group.map(fiTarjetaHtml).join('')}</div>
      `).join('');
    } else {
      html += backBtn + `<div class="es-platos">${visibleRecipes.map(fiTarjetaHtml).join('')}</div>`;
    }
  } else {
    html += backBtn;
  }

  if(orphanFichas.length){
    html += `<h3 class="es-grupo">${currentArea()==='sala' ? t('title.unlinkedTechSheetsDrink') : t('title.unlinkedTechSheetsDish')} <span>${orphanFichas.length}</span></h3><div class="es-platos">${orphanFichas.map(fiTarjetaSueltaHtml).join('')}</div>`;
  }

  box.innerHTML = html;
}

// Cuántos pasos tiene, cuánto tarda y cuántos alérgenos lleva: lo que se quiere saber sin abrirla.
function fiResumenHtml(f){
  const pasos = (f.pasos || []).filter(p => p && String(p).trim()).length;
  const alg = getFichaAllergens(f).length;
  const k = (et, v) => `<span class="es-cifra"><i>${et}</i><b>${v}</b></span>`;
  return k(gl({es:'Pasos', ca:'Passos', en:'Steps'}), pasos || '—')
    + k(gl({es:'Tiempo', ca:'Temps', en:'Time'}), f.tiempo ? f.tiempo + ' min' : '—')
    + k(t('label.allergens'), alg || '—');
}
function fiMenuHtml(f){
  return ggMenuAcciones([
    {icono:'ti-file-text', texto:gl({es:'Abrir', ca:'Obrir', en:'Open'}), fn:`openFichaModal(${f.id})`},
    {icono:'ti-printer', texto:t('common.print'), fn:`printFicha(${f.id})`},
    {icono:'ti-copy', texto:t('btn.duplicate'), fn:`duplicateFicha(${f.id})`, owner:true},
    {icono:'ti-trash', texto:t('common.delete'), fn:`deleteFicha(${f.id})`, peligro:true, owner:true}
  ]);
}
// La tarjeta de un plato del Escandallo: tenga o no ficha.
function fiTarjetaHtml(r){
  const f = DB.fichas.find(x => x.recipeId === r.id);
  const abrir = f ? `openFichaModal(${f.id})` : `openFichaModal(null, ${r.id})`;
  const sala = (r.area||'cocina') === 'sala';
  const icono = r.isBase ? (sala ? 'ti-flask' : 'ti-soup') : (sala ? 'ti-glass-cocktail' : 'ti-chef-hat');
  return `
    <article class="es-plato" role="button" tabindex="0" onclick="${abrir}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${abrir}}">
      <div class="es-plato-cab">
        <i class="ti ${icono} es-plato-ico"></i>
        <div class="es-plato-nom">${escapeHtml(r.name)}</div>
        ${f ? fiMenuHtml(f) : ''}
      </div>
      <div class="es-plato-insignias">${f ? `<span class="badge badge-green">${t('label.linked')}</span>${f.bebidaTipo ? fichaTipoBadgeHtml(f) : ''}` : `<span class="badge badge-amber">${t('label.noTechSheet')}</span>`}</div>
      <div class="es-plato-cifras">${f ? fiResumenHtml(f) : `<span class="es-pista">${t('title.newTechSheet')}</span>`}</div>
    </article>`;
}
// Una ficha suelta (sin escandallo detrás).
function fiTarjetaSueltaHtml(f){
  return `
    <article class="es-plato" role="button" tabindex="0" onclick="openFichaModal(${f.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFichaModal(${f.id})}">
      <div class="es-plato-cab">
        ${fichaTipoIconoHtml(f).replace('<i class="ti ', '<i class="es-plato-ico ti ')}
        <div class="es-plato-nom">${escapeHtml(f.name)}</div>
        ${fiMenuHtml(f)}
      </div>
      <div class="es-plato-insignias"><span class="badge badge-gray">${t('label.notLinked')}</span>${fichaTipoBadgeHtml(f)}</div>
      <div class="es-plato-cifras">${fiResumenHtml(f)}</div>
    </article>`;
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
  if(!isOwnerSession() && !editUnlocked && !id && !recipeId) return;
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
    // La nube tampoco guarda objetos vacíos: `bebida` puede volver sin nada.
    if(!fichaModalState.bebida || typeof fichaModalState.bebida !== 'object') fichaModalState.bebida = {};
    // Un tipo que ya no exista (ficha de una versión con otro registro) se
    // trata como "sin tipo" en vez de pintar un formulario vacío.
    if(fichaModalState.bebidaTipo && !bebidaTipoDef(fichaModalState.bebidaTipo)) fichaModalState.bebidaTipo = '';
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
      presentation: r.presentation || '',
      bebidaTipo: '', bebida: {}
    };
    if(!fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!fichaModalState.pasos.length) fichaModalState.pasos = [''];
  } else {
    fichaModalState = {id:null, name:'', recipeId:'', comensales:2, baseComensales:1, produccion:1, tiempo:'', temp: currentArea()==='sala' ? 'FRÍO' : 'CALIENTE', ingredients:[''], pasos:[''], allergens:[], presentation:'', bebidaTipo:'', bebida:{}};
  }
  if(!Array.isArray(fichaModalState.pasosDet)) fichaModalState.pasosDet = [];
  fichaHoja = true;
  renderFichaModal();
  fichaHojaBase = fiFoto();
  const activa = document.querySelector('.view.active');
  if(!activa || activa.id !== 'view-fichas') navigate('fichas');
  else scrollContentToTop();
}

function updateFichaProduccion(value){
  syncFichaModalFields();
  fichaModalState.produccion = Math.min(100000, Math.max(1, parseFloat(value)||1));
  if(fichaModalState.id){
    const ficha = getFicha(fichaModalState.id);
    if(ficha){ ficha.produccion = fichaModalState.produccion; saveDB(); }
  }
  // Solo cambian las cantidades y el título de los ingredientes: no se repinta la hoja entera (se perdería el foco).
  fiPintarIngredientes();
}

/* ============================================================
   LA FICHA (30/10) — un documento para cocinar el plato, y la misma pantalla donde se crea y se edita.
   Mismo planteamiento que la hoja de Escandallo: antes se abría en un modal. Ahora es una página con dos columnas
   —los ingredientes (la mise en place, a la cantidad de lo que se va a producir) y el paso a paso— y el resto debajo.
   Cada paso lleva, si hace falta, su tiempo, su temperatura y un «ojo» para el punto crítico: lo que separa una
   receta que sale siempre igual de una que depende de quién la haga. Quien no puede editar la ve como un documento.
   ============================================================ */
let fichaHoja = false;           // hay una ficha abierta en la pantalla (id null = ficha nueva)
let fichaHojaBase = '';          // foto de la ficha al abrirla o guardarla: lo que difiera son cambios sin guardar
function fiFoto(){
  if(!fichaHoja || !fichaModalState || !document.getElementById('fichas-list')) return '';
  syncFichaModalFields();
  const f = fichaModalState;
  // La producción NO cuenta: se guarda al instante (es una escala de trabajo, no contenido de la ficha).
  return JSON.stringify({n:f.name, c:f.comensales, t:f.tiempo, tp:f.temp, i:f.ingredients, p:f.pasos, d:f.pasosDet, a:f.allergens, pr:f.presentation, ph:f.photo ? f.photo.length : 0, bt:f.bebidaTipo, b:f.bebida});
}
function fiSucia(){ return !!(fichaHoja && fichaModalState) && fiFoto() !== fichaHojaBase; }
function fiMarcarCambio(){ const el = document.getElementById('fi-sucio'); if(el) el.hidden = !fiSucia(); }
if(typeof ggRegistrarEditor === 'function') ggRegistrarEditor('ficha', {
  sucio: () => fiSucia(),
  nombre: () => gl({es:'Ficha: ', ca:'Fitxa: ', en:'Sheet: '}) + ((fichaModalState && fichaModalState.name && fichaModalState.name.trim()) || gl({es:'sin nombre', ca:'sense nom', en:'unnamed'})),
  guardar: () => saveFicha(),
  descartar: () => { fichaHoja = false; fichaModalState = null; fichaHojaBase = ''; renderFichas(); }
});
if(typeof document !== 'undefined' && document.addEventListener){
  ['input','change'].forEach(ev => document.addEventListener(ev, e => {
    if(e.target && e.target.closest && e.target.closest('#view-fichas') && fichaHoja) fiMarcarCambio();
  }));
}

// Lo que se enseña en las ingredientes y el título «para N raciones»: se repinta aparte para no tocar el resto.
function fiPintarIngredientes(){
  const f = fichaModalState;
  if(!f) return;
  const cont = document.getElementById('ficha-ingredients');
  if(!cont) return;
  cont.innerHTML = fiIngredientesHtml(f);
  const tit = document.getElementById('fi-ing-tit');
  if(tit) tit.innerHTML = fiTituloIngredientes(f);
}
function fiFactor(f){
  const base = getFichaBaseComensales(f);
  const produccion = f.produccion || base;
  return {base, produccion, factor: (base && base > 0) ? (produccion / base) : 1};
}
function fiTituloIngredientes(f){
  const {produccion} = fiFactor(f);
  const sala = (f.area || (f.recipeId && (getRecipe(f.recipeId)||{}).area) || currentArea()) === 'sala';
  const unidad = produccion === 1 ? (sala ? t('noun.drink') : t('noun.ration')) : (sala ? t('noun.drinks') : t('noun.rations'));
  return `${t('label.ingredients')} <span class="fi-para">${gl({es:'para', ca:'per a', en:'for'})} ${fmtNum(produccion)} ${escapeHtml(unidad)}</span>`;
}
function fiIngredientesHtml(f){
  const ro = !editUnlocked;
  const {factor} = fiFactor(f);
  if(f.recipeId){
    const lineas = getFichaIngredientLines(f);
    if(!lineas.length) return `<div class="empty es-vacio"><i class="ti ti-basket"></i>${t('empty.noIngredients')}</div>`;
    return `<ul class="fi-ings">${lineas.map(l => `
      <li><span class="fi-ing-q">${l.qty != null ? `${fmtNum(l.qty * factor)} <small>${escapeHtml(l.unit)}</small>` : '—'}</span><span class="fi-ing-n">${escapeHtml(l.name)}</span></li>`).join('')}</ul>
      <p class="es-nota"><i class="ti ti-calculator"></i> ${gl({es:'Las cantidades salen del Escandallo y se ajustan solas a la producción.', ca:'Les quantitats surten de l\'Escandall i s\'ajusten soles a la producció.', en:'Quantities come from Costing and scale with the production.'})}</p>`;
  }
  const lista = (f.ingredients && f.ingredients.length) ? f.ingredients : [''];
  if(ro) return `<ul class="fi-ings">${lista.filter(Boolean).map(s => `<li><span class="fi-ing-n">${escapeHtml(s)}</span></li>`).join('')}</ul>`;
  return `<div class="fi-ings-edit">${lista.map((ing, idx) => `
    <div class="fi-ing-fila">
      <input type="text" value="${escapeHtml(ing)}" placeholder="${t('ph.egIngredientLine')}" oninput="updateFichaIngredientText(${idx}, this.value)">
      ${lista.length > 1 ? ggMenuAcciones([{icono:'ti-trash', texto:gl({es:'Quitar ingrediente', ca:'Treure ingredient', en:'Remove ingredient'}), fn:`removeFichaIngredientText(${idx})`, peligro:true, owner:true}]) : ''}
    </div>`).join('')}
    <button type="button" class="owner-only btn btn-sm btn-fino" onclick="addFichaIngredientText()"><i class="ti ti-plus"></i> ${t('btn.addIngredient')}</button></div>`;
}

function fiPasosHtml(f){
  const ro = !editUnlocked;
  const pasos = (f.pasos && f.pasos.length) ? f.pasos : [''];
  const det = f.pasosDet || [];
  if(ro){
    const llenos = pasos.map((p, i) => ({p, d: det[i] || {}, i})).filter(x => x.p && String(x.p).trim());
    if(!llenos.length) return `<p class="es-pista">${t('label.notSpecified')}</p>`;
    return `<ol class="fi-pasos">${llenos.map((x, n) => `
      <li class="fi-paso">
        <div class="fi-paso-n">${n + 1}</div>
        <div class="fi-paso-c">
          <p class="fi-paso-leer">${escapeHtml(x.p)}</p>
          ${(x.d.min || x.d.temp) ? `<div class="fi-paso-chips">${x.d.min ? `<span class="fi-chip"><i class="ti ti-clock"></i> ${escapeHtml(String(x.d.min))} min</span>` : ''}${x.d.temp ? `<span class="fi-chip"><i class="ti ti-temperature"></i> ${escapeHtml(String(x.d.temp))}</span>` : ''}</div>` : ''}
          ${x.d.aviso ? `<div class="fi-ojo"><b>${gl({es:'Ojo', ca:'Ull', en:'Watch out'})}</b> ${escapeHtml(x.d.aviso)}</div>` : ''}
        </div>
      </li>`).join('')}</ol>`;
  }
  return `<ol class="fi-pasos">${pasos.map((p, idx) => {
    const d = det[idx] || {};
    return `
    <li class="fi-paso">
      <div class="fi-paso-n">${idx + 1}</div>
      <div class="fi-paso-c">
        <textarea class="fi-paso-txt" rows="2" placeholder="${t('ficha.stepPlaceholder')}" aria-label="${gl({es:'Paso', ca:'Pas', en:'Step'})} ${idx + 1}" oninput="updateFichaStep(${idx}, this.value);fiAutoAlto(this)">${escapeHtml(p)}</textarea>
        <div class="fi-paso-det">
          <label class="fi-det"><i class="ti ti-clock"></i><input type="number" min="0" step="1" value="${d.min || ''}" placeholder="min" aria-label="${gl({es:'Minutos', ca:'Minuts', en:'Minutes'})}" oninput="updateFichaPasoDet(${idx}, 'min', this.value)"></label>
          <label class="fi-det"><i class="ti ti-temperature"></i><input type="text" value="${escapeHtml(d.temp || '')}" placeholder="180 °C" aria-label="${gl({es:'Temperatura', ca:'Temperatura', en:'Temperature'})}" oninput="updateFichaPasoDet(${idx}, 'temp', this.value)"></label>
          <label class="fi-det fi-det-ojo"><i class="ti ti-alert-triangle"></i><input type="text" value="${escapeHtml(d.aviso || '')}" placeholder="${gl({es:'Ojo: punto crítico', ca:'Ull: punt crític', en:'Watch out: critical point'})}" aria-label="${gl({es:'Punto crítico', ca:'Punt crític', en:'Critical point'})}" oninput="updateFichaPasoDet(${idx}, 'aviso', this.value)"></label>
        </div>
      </div>
      <div class="fi-paso-acc">${ggMenuAcciones([
        idx > 0 ? {icono:'ti-arrow-up', texto:gl({es:'Subir', ca:'Pujar', en:'Move up'}), fn:`moveFichaStep(${idx},-1)`, owner:true} : null,
        idx < pasos.length - 1 ? {icono:'ti-arrow-down', texto:gl({es:'Bajar', ca:'Baixar', en:'Move down'}), fn:`moveFichaStep(${idx},1)`, owner:true} : null,
        pasos.length > 1 ? {icono:'ti-trash', texto:gl({es:'Quitar paso', ca:'Treure pas', en:'Remove step'}), fn:`removeFichaStep(${idx})`, peligro:true, owner:true} : null
      ].filter(Boolean))}</div>
    </li>`;
  }).join('')}</ol>
  <button type="button" class="owner-only btn btn-fino" onclick="addFichaStep()"><i class="ti ti-plus"></i> ${t('btn.addStep')}</button>`;
}
function fiAutoAlto(el){ el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 56) + 'px'; }
function updateFichaPasoDet(idx, campo, valor){
  const f = fichaModalState;
  if(!Array.isArray(f.pasosDet)) f.pasosDet = [];
  while(f.pasosDet.length <= idx) f.pasosDet.push({});
  f.pasosDet[idx] = {...(f.pasosDet[idx] || {}), [campo]: valor};
  fiMarcarCambio();
}
function moveFichaStep(idx, dir){
  const f = fichaModalState, j = idx + dir;
  if(j < 0 || j >= f.pasos.length) return;
  syncFichaModalFields();
  while(f.pasosDet.length < f.pasos.length) f.pasosDet.push({});
  [f.pasos[idx], f.pasos[j]] = [f.pasos[j], f.pasos[idx]];
  [f.pasosDet[idx], f.pasosDet[j]] = [f.pasosDet[j], f.pasosDet[idx]];
  renderFichaModal();
  fiMarcarCambio();
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
  if(!Array.isArray(f.pasosDet)) f.pasosDet = [];

  const {produccion} = fiFactor(f);

  // Ficha de bebida (solo sala): el tipo elegido decide qué campos se piden.
  // Una ficha de vino no pregunta por el tiempo de extracción del café.
  const bebidaHtml = !isSala ? '' : (() => {
    const datos = bebidaDatos(f);
    const campoHtml = c => {
      const v = datos[c.k] !== undefined ? String(datos[c.k]) : '';
      const id = `bebida-${c.k}`;
      const lab = `<label for="${id}">${escapeHtml(gl(c.l))}${c.unidad?` <span class="es-pista">(${escapeHtml(c.unidad)})</span>`:''}</label>`;
      if(c.tipo === 'sel'){
        // La opción vacía deja decir "todavía no lo sé" sin inventarse un valor.
        const opts = (c.opts||[]).some(o => o.v === '') ? c.opts : [{v:'', l:{es:'—',ca:'—',en:'—'}}, ...(c.opts||[])];
        return `<div class="field">${lab}<select id="${id}" ${roAttr}>${opts.map(o=>`<option value="${escapeHtml(o.v)}"${o.v===v?' selected':''}>${escapeHtml(gl(o.l))}</option>`).join('')}</select></div>`;
      }
      if(c.tipo === 'area'){
        return `<div class="field">${lab}<textarea id="${id}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}" ${roAttr}>${escapeHtml(v)}</textarea></div>`;
      }
      if(c.tipo === 'num'){
        return `<div class="field">${lab}<input type="number" id="${id}" value="${escapeHtml(v)}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}" step="${c.paso||'1'}"${c.min!==undefined?` min="${c.min}"`:''}${c.max!==undefined?` max="${c.max}"`:''} ${roAttr}></div>`;
      }
      return `<div class="field">${lab}<input type="text" id="${id}" value="${escapeHtml(v)}" placeholder="${escapeHtml(c.ph?gl(c.ph):'')}" ${roAttr}></div>`;
    };
    // Los textos largos (cata, maridaje, cómo tirarla) van a lo ancho; el
    // resto de tres en tres, que es lo que cabe sin apretar en tablet.
    const campos = bebidaCamposDe(f.bebidaTipo);
    const bloques = [];
    let fila = [];
    campos.forEach(c => {
      if(c.tipo === 'area'){
        if(fila.length){ bloques.push(`<div class="field-row">${fila.join('')}</div>`); fila = []; }
        bloques.push(campoHtml(c));
      } else {
        fila.push(campoHtml(c));
        if(fila.length === 3){ bloques.push(`<div class="field-row">${fila.join('')}</div>`); fila = []; }
      }
    });
    if(fila.length) bloques.push(`<div class="field-row">${fila.join('')}</div>`);
    return `
      <section class="es-card fi-ancho">
        <h3 class="es-tit">${gl({es:'Datos de la bebida', ca:'Dades de la beguda', en:'Drink details'})}</h3>
        <div class="field">
          <label for="ficha-bebida-tipo">${t('label.drinkType')}</label>
          <select id="ficha-bebida-tipo" onchange="setFichaBebidaTipo(this.value)" ${roAttr}>
            <option value="">${t('label.drinkTypeNone')}</option>
            ${BEBIDA_TIPOS.map(x=>`<option value="${x.key}"${x.key===f.bebidaTipo?' selected':''}>${escapeHtml(gl(x.l))}</option>`).join('')}
          </select>
        </div>
        ${f.bebidaTipo ? bloques.join('') : ''}
      </section>`;
  })();

  // En vivo a partir de los ingredientes/bases ACTUALES (recipeComputedAllergens), no la foto fija guardada.
  const liveRecipeAllergens = recipeComputedAllergens(getFichaLiveRecipe(f));
  const allergenHtml = ALLERGEN_LIST.map(a => {
    const fromRecipe = liveRecipeAllergens.includes(a);
    const on = fromRecipe || (f.allergens||[]).includes(a);
    const clickable = !ro && !fromRecipe;
    if(ro && !on) return '';
    return `<div class="alg-pill${on?' on':''}" ${clickable?`onclick="toggleFichaAllergen('${escapeHtml(a)}')" role="button" tabindex="0"`:''} style="${clickable?'':'cursor:default'}" title="${fromRecipe?t('title.autoDetectedFromCosting'):''}">${escapeHtml(allergenLabel(a))}</div>`;
  }).join('');

  const titulo = f.id ? (ro ? t('title.viewTechSheet') : t('title.editTechSheet')) : t('title.newTechSheet');
  const metaCampo = (id, et, html) => `<div class="fi-meta-c"><label for="${id}">${et}</label>${html}</div>`;
  const fotoHtml = isBaseElaboration ? '' : `
    <div class="fi-foto">
      ${f.photo ? `
        <img src="${f.photo}" alt="${t('label.platingPhotoAlt')}" onclick="openFichaPhotoLightbox(this.src)">
        ${ro ? '' : `<button type="button" class="btn btn-sm btn-fino is-off fi-foto-quitar" onclick="removeFichaPhoto()"><i class="ti ti-trash"></i> ${t('btn.removePhoto')}</button>`}
      ` : (ro ? `<div class="fi-foto-vacia"><i class="ti ti-photo"></i></div>` : `
        <label class="fi-foto-vacia fi-foto-subir">
          <i class="ti ti-camera-plus"></i><span>${t('btn.uploadPlatingPhoto')}</span>
          <input type="file" accept="image/*" style="display:none" onchange="handleFichaPhotoUpload(this)">
        </label>`)}
    </div>`;

  document.getElementById('view-fichas').classList.add('es-en-hoja');
  document.getElementById('fichas-list').innerHTML = `
    <div class="es-barra">
      <button type="button" class="btn btn-sm btn-fino" onclick="backToFichaList()"><i class="ti ti-arrow-left"></i> ${t('common.back')}</button>
      <div class="es-barra-titulo">${escapeHtml(titulo)}</div>
      <div class="es-barra-der">
        <span class="oc-sucio" id="fi-sucio" hidden><i class="ti ti-point-filled"></i> ${t('oferta.sucio')}</span>
        <button type="button" class="btn btn-fino" onclick="fiImprimir()"><i class="ti ti-printer"></i> ${t('common.print')}</button>
        ${ro ? '' : `<button type="button" class="owner-only btn btn-fino is-on" onclick="saveFicha()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>`}
        ${f.id ? ggMenuAcciones([
          {icono:'ti-copy', texto:t('btn.duplicate'), fn:`duplicateFicha(${f.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteFicha(${f.id})`, peligro:true, owner:true}
        ]) : ''}
      </div>
    </div>

    <section class="es-card fi-hero${isBaseElaboration ? ' sin-foto' : ''}">
      ${fotoHtml}
      <div class="fi-hero-txt">
        <div class="field">
          <label for="ficha-name">${isSala ? t('label.drinkName') : t('label.dishName')}</label>
          <input type="text" id="ficha-name" class="es-nombre" value="${escapeHtml(f.name)}" placeholder="${isSala ? t('ph.drinkName') : t('ph.dishName')}" ${lockedAttr}>
        </div>
        <div class="fi-vinculo">
          ${linkedRecipe
            ? `<i class="ti ti-calculator"></i> ${t('label.fromCosting')}: <b>${escapeHtml(linkedRecipe.name)}</b> <button type="button" class="owner-only btn btn-sm btn-fino" onclick="fiVerEscandallo(${linkedRecipe.id})">${gl({es:'Ver escandallo', ca:'Veure escandall', en:'Open costing'})}</button>`
            : `<i class="ti ti-unlink"></i> ${t('label.notLinked')}`}
        </div>
        <div class="fi-meta">
          ${metaCampo('ficha-comensales', isSala ? t('label.servings') : t('label.diners'), `<input type="number" id="ficha-comensales" value="${f.comensales||2}" step="1" min="1" ${lockedAttr}>`)}
          ${metaCampo('ficha-produccion', t('label.production'), `<input type="number" id="ficha-produccion" value="${produccion}" step="1" min="1" max="100000" onchange="updateFichaProduccion(this.value)">`)}
          ${metaCampo('ficha-tiempo', t('label.prepTime') , `<input type="number" id="ficha-tiempo" value="${f.tiempo||''}" step="1" min="0" ${roAttr}>`)}
          ${isSala && f.bebidaTipo ? '' : metaCampo('ficha-temp', t('label.servingTemp'), `<select id="ficha-temp" ${roAttr}>${FICHA_TEMPS.map(tv=>`<option value="${tv}"${tv===f.temp?' selected':''}>${fichaTempLabel(tv)}</option>`).join('')}</select>`)}
        </div>
      </div>
    </section>

    <div class="fi-cuerpo">
      <section class="es-card fi-ingredientes">
        <h3 class="es-tit" id="fi-ing-tit">${fiTituloIngredientes(f)}</h3>
        <div id="ficha-ingredients">${fiIngredientesHtml(f)}</div>
      </section>
      <section class="es-card fi-elaboracion">
        <h3 class="es-tit">${t('label.preparation')}</h3>
        <div id="ficha-steps">${fiPasosHtml(f)}</div>
      </section>
    </div>

    ${bebidaHtml}

    ${isBaseElaboration ? '' : `
    <section class="es-card fi-ancho">
      <h3 class="es-tit">${isSala ? t('label.serviceNotes') : t('label.plating')}</h3>
      ${ro ? `<p class="fi-leer">${escapeHtml(f.presentation || '') || `<span class="es-pista">${t('label.notSpecified')}</span>`}</p>`
           : `<textarea id="ficha-presentation" rows="3" placeholder="${isSala ? t('ph.serviceNotes') : t('ph.presentationNotes')}">${escapeHtml(f.presentation||'')}</textarea>`}
    </section>`}

    <section class="es-card fi-ancho">
      <h3 class="es-tit">${t('label.allergens')}</h3>
      <div class="alg-grid">${allergenHtml || `<span class="es-pista">${t('label.none')}</span>`}</div>
    </section>
  `;
  document.querySelectorAll('#ficha-steps .fi-paso-txt').forEach(fiAutoAlto);
}

// Abrir la hoja desde donde sea: si no se está en Fichas, se va; y al volver se ve la lista, no una ficha a medias.
function backToFichaList(){
  const volver = () => { fichaHoja = false; fichaModalState = null; fichaHojaBase = ''; renderFichas(); scrollContentToTop(); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(volver); else volver();
}
function fiVerEscandallo(recipeId){
  const ir = () => { fichaHoja = false; fichaModalState = null; fichaHojaBase = ''; navigate('escandallo', true); openRecipeModal(recipeId); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(ir); else ir();
}
// Imprimir lo que se está viendo: si hay cambios, se guardan antes (el papel sale de lo guardado).
async function fiImprimir(){
  if(fiSucia()){
    if(!editUnlocked) return;
    const ok = await saveFicha();
    if(!ok) return;
  }
  if(fichaModalState && fichaModalState.id) printFicha(fichaModalState.id);
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
  // Campos de la ficha de bebida: se leen por su tipo, no todos como texto,
  // para que un número guardado siga siendo un número.
  const tipoEl = document.getElementById('ficha-bebida-tipo');
  if(tipoEl) f.bebidaTipo = tipoEl.value;
  if(f.bebidaTipo){
    if(!f.bebida || typeof f.bebida !== 'object') f.bebida = {};
    bebidaCamposDe(f.bebidaTipo).forEach(c => {
      const el = document.getElementById('bebida-' + c.k);
      if(!el) return;
      const v = (el.value||'').trim();
      if(v === ''){ delete f.bebida[c.k]; return; }
      f.bebida[c.k] = (c.tipo === 'num') ? clampBebidaNum(c, v) : v;
    });
  }
}

// Un número fuera de rango en una ficha no debe romper nada, pero tampoco
// guardarse: 400 °C de servicio o una añada del año 12 son erratas de tecleo.
function clampBebidaNum(campo, valor){
  const n = parseFloat(String(valor).replace(',', '.'));
  if(!isFinite(n)) return '';
  const min = campo.min !== undefined ? campo.min : -Infinity;
  const max = campo.max !== undefined ? campo.max : Infinity;
  return Math.min(max, Math.max(min, n));
}

// Al cambiar de tipo se conservan los campos que los dos tipos comparten
// (temperatura, copa, ración, graduación, guarnición…) y se sueltan los que
// ya no existen: pasar un vino a espumoso no debería obligar a reescribirlo
// todo, ni dejar guardado un "tiempo de extracción" invisible.
function setFichaBebidaTipo(tipo){
  syncFichaModalFields();
  const f = fichaModalState;
  f.bebidaTipo = tipo || '';
  const validos = new Set(bebidaCamposDe(f.bebidaTipo).map(c => c.k));
  const datos = bebidaDatos(f);
  const limpio = {};
  Object.keys(datos).forEach(k => { if(validos.has(k)) limpio[k] = datos[k]; });
  f.bebida = limpio;
  renderFichaModal();
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
function addFichaStep(){
  syncFichaModalFields();
  fichaModalState.pasos.push('');
  if(!Array.isArray(fichaModalState.pasosDet)) fichaModalState.pasosDet = [];
  while(fichaModalState.pasosDet.length < fichaModalState.pasos.length) fichaModalState.pasosDet.push({});
  renderFichaModal();
  fiMarcarCambio();
  const t0 = document.querySelectorAll('#ficha-steps .fi-paso-txt'); if(t0.length) t0[t0.length - 1].focus();
}
function removeFichaStep(idx){
  if(fichaModalState.pasos.length<=1) return;
  syncFichaModalFields();
  fichaModalState.pasos.splice(idx,1);
  if(Array.isArray(fichaModalState.pasosDet)) fichaModalState.pasosDet.splice(idx,1);
  renderFichaModal();
  fiMarcarCambio();
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
  if(!isOwnerSession() && !editUnlocked) return false;
  syncFichaModalFields();
  const f = fichaModalState;
  const name = (f.name||'').trim();
  if(!name){ showToast(t('msg.nameRequired')); const n0 = document.getElementById('ficha-name'); if(n0) n0.focus(); return false; }
  if(f.recipeId && DB.fichas.some(other => other.id !== f.id && other.recipeId === f.recipeId)){
    showToast(t('msg.recipeAlreadyHasTechSheet'));
    return false;
  }
  // Aviso (no bloqueante) de posible ficha duplicada, mismo criterio ya
  // usado en Escandallo/Clientes/Proveedores/Mega Lista — sin esto, era
  // fácil duplicar una ficha (con el propio botón "Duplicar") varias veces
  // y acabar con varias fichas huérfanas con el mismo nombre, imposibles
  // de distinguir en la lista de "sin vincular".
  const dupe = DB.fichas.find(other => other.id !== f.id && (other.area||'cocina')===currentArea() && other.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateTechSheet').replace('${name}', dupe.name)))) return false;
  const data = {
    name,
    recipeId: f.recipeId || '',
    comensales: Math.max(1, parseInt(f.comensales)||1),
    baseComensales: Math.max(1, f.baseComensales || parseInt(f.comensales) || 1),
    produccion: Math.max(1, f.produccion || parseInt(f.comensales) || 1),
    tiempo: f.tiempo ? Math.max(0, parseInt(f.tiempo)||0) : '',
    temp: f.temp || 'CALIENTE',
    ingredients: f.ingredients.filter(i => i && i.trim()),
    // Los pasos vacíos se tiran con sus detalles (tiempo, temperatura, ojo) para que sigan alineados.
    ...(() => {
      const det = Array.isArray(f.pasosDet) ? f.pasosDet : [];
      const pasos = [], pasosDet = [];
      (f.pasos || []).forEach((p, i) => {
        if(!p || !String(p).trim()) return;
        pasos.push(p.trim());
        const d = det[i] || {};
        const limpio = {};
        const min = parseInt(d.min); if(isFinite(min) && min > 0) limpio.min = min;
        if(d.temp && String(d.temp).trim()) limpio.temp = String(d.temp).trim();
        if(d.aviso && String(d.aviso).trim()) limpio.aviso = String(d.aviso).trim();
        pasosDet.push(limpio);
      });
      return {pasos, pasosDet: pasosDet.some(d => Object.keys(d).length) ? pasosDet : []};
    })(),
    allergens: f.allergens || [],
    presentation: (f.presentation||'').trim(),
    photo: f.photo || '',
    bebidaTipo: f.bebidaTipo || '',
    // Solo los campos del tipo elegido: si alguien cambió de tipo, lo que
    // sobra no se arrastra para siempre dentro de la ficha.
    bebida: f.bebidaTipo ? (()=>{
      const validos = new Set(bebidaCamposDe(f.bebidaTipo).map(c => c.k));
      const datos = bebidaDatos(f); const out = {};
      Object.keys(datos).forEach(k => { if(validos.has(k) && datos[k] !== '' && datos[k] !== undefined) out[k] = datos[k]; });
      return out;
    })() : {}
  };
  let guardada;
  if(f.id){
    const ficha = getFicha(f.id);
    if(!ficha) return false;
    Object.assign(ficha, data);
    guardada = ficha;
  } else {
    guardada = {id: genId(), ...data, area: currentArea()};
    DB.fichas.push(guardada);
  }
  saveDB();
  // Se queda en la ficha (ya con su id si era nueva): la lista queda a un toque en «Volver».
  if(fichaHoja){
    fichaModalState = JSON.parse(JSON.stringify(guardada));
    if(!fichaModalState.ingredients || !fichaModalState.ingredients.length) fichaModalState.ingredients = [''];
    if(!fichaModalState.pasos || !fichaModalState.pasos.length) fichaModalState.pasos = [''];
    if(!Array.isArray(fichaModalState.pasosDet)) fichaModalState.pasosDet = [];
    if(!Array.isArray(fichaModalState.allergens)) fichaModalState.allergens = [];
    if(!fichaModalState.bebida || typeof fichaModalState.bebida !== 'object') fichaModalState.bebida = {};
    renderFichaModal();
    fichaHojaBase = fiFoto();
    fiMarcarCambio();
  } else renderFichas();
  showToast(t('msg.techSheetSaved'));
  return true;
}

async function deleteFicha(id){
  if(!isOwnerSession() && !editUnlocked) return;
  if(!(await confirmModal(t('msg.confirmDeleteTechSheet')))) return;
  DB.fichas = DB.fichas.filter(f => f.id !== id);
  saveDB();
  // Si se borraba la ficha abierta, la hoja se cierra con ella (sin preguntar por cambios de algo que ya no existe).
  if(fichaHoja && fichaModalState && fichaModalState.id === id){ fichaHoja = false; fichaModalState = null; fichaHojaBase = ''; }
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
  showToast(t('msg.techSheetSaved'));
  // Se abre la copia para renombrarla y ajustar lo que cambie (antes de saltar se pregunta por lo que hubiera a medias).
  const abrir = () => { fichaHoja = false; fichaModalState = null; openFichaModal(copy.id); };
  if(ggEditorSucio()) ggGuardarSiHaceFalta(abrir); else abrir();
}

// El bloque de bebida del impreso. Los campos cortos van en dos columnas y
// los largos (cata, maridaje) debajo, a lo ancho: una nota de cata metida en
// media columna se lee fatal en un papel colgado en la barra.
// En una lista de 40 fichas de sala, saber de un vistazo qué es cada una
// ahorra abrirlas: el icono y la etiqueta del tipo lo dicen sin ocupar sitio.
function fichaTipoIconoHtml(f){
  const def = f && f.bebidaTipo ? bebidaTipoDef(f.bebidaTipo) : null;
  return `<i class="ti ${def ? def.icon : 'ti-file-description'}"></i>`;
}
function fichaTipoBadgeHtml(f){
  const def = f && f.bebidaTipo ? bebidaTipoDef(f.bebidaTipo) : null;
  if(!def) return '';
  // El nombre corto: los tipos largos llevan una aclaración entre
  // paréntesis que en una etiqueta pequeña solo estorba.
  const nombre = gl(def.l).split(' (')[0];
  return `<span class="badge">${escapeHtml(nombre)}</span>`;
}

function bebidaImpresoHtml(f){
  const lineas = bebidaLineasRellenas(f);
  if(!lineas.length) return '';
  const def = bebidaTipoDef(f.bebidaTipo);
  const cortas = lineas.filter(l => !l.largo);
  const largas = lineas.filter(l => l.largo);
  const filas = cortas.map(l => `<tr><td style="padding:3px 10px 3px 0;color:#777;white-space:nowrap">${escapeHtml(l.label)}</td><td style="padding:3px 0"><strong>${escapeHtml(l.valor)}</strong></td></tr>`).join('');
  return `
    <h2>${escapeHtml(def ? gl(def.l) : '')}</h2>
    ${cortas.length ? `<table style="width:100%;border-collapse:collapse;font-size:11pt;margin-bottom:10px">${filas}</table>` : ''}
    ${largas.map(l => `<p style="margin:6px 0"><strong style="color:#777">${escapeHtml(l.label)}:</strong> ${escapeHtml(l.valor)}</p>`).join('')}
  `;
}

// El impreso de la ficha: un documento para tener en la mano mientras se cocina. Dos columnas —a la izquierda lo que hay
// que sacar (la mise en place, con su casilla para ir marcando) y a la derecha el paso a paso, numerado y con su tiempo,
// su temperatura y su «ojo»—, y debajo el emplatado y los alérgenos bien visibles. No lleva iconos de fuente (la ventana
// de impresión no los carga): las etiquetas son texto.
function printFicha(id){
  const f = getFicha(id);
  if(!f) return;
  // Si la ficha está vinculada a un plato del Escandallo, el nombre mostrado
  // en el impreso siempre es el actual del plato (por si se renombró desde
  // que se vinculó), no el que se guardó en la ficha en su momento.
  const liveRecipe = getFichaLiveRecipe(f);
  const displayName = liveRecipe ? liveRecipe.name : f.name;
  const fichaAllergens = getFichaAllergens(f);
  const {produccion, factor} = fiFactor(f);
  const fArea = f.area || (f.recipeId && (getRecipe(f.recipeId)||{}).area) || 'cocina';
  const isBaseElaboration = !!(liveRecipe && liveRecipe.isBase);
  const unidad = produccion === 1 ? (fArea==='sala' ? t('noun.drink') : t('noun.ration')) : (fArea==='sala' ? t('noun.drinks') : t('noun.rations'));

  const ings = getFichaIngredientLines(f).map(l => `<li><span class="fp-chk"></span><span class="fp-q">${l.qty!=null ? `${fmtNum(l.qty*factor)} ${escapeHtml(l.unit)}` : ''}</span><span class="fp-n">${escapeHtml(l.name)}</span></li>`).join('');
  const det = Array.isArray(f.pasosDet) ? f.pasosDet : [];
  const pasosPrint = (f.pasos || []).map((p, i) => ({p, d: det[i] || {}})).filter(x => x.p && String(x.p).trim());
  const steps = pasosPrint.map((x, n) => `
    <div class="fp-paso">
      <div class="fp-n-paso">${n + 1}</div>
      <div class="fp-paso-c">
        <div class="fp-paso-t">${escapeHtml(x.p)}</div>
        ${(x.d.min || x.d.temp) ? `<div class="fp-chips">${x.d.min ? `<span>${escapeHtml(String(x.d.min))} MIN</span>` : ''}${x.d.temp ? `<span>${escapeHtml(String(x.d.temp))}</span>` : ''}</div>` : ''}
        ${x.d.aviso ? `<div class="fp-ojo"><b>${gl({es:'OJO', ca:'ULL', en:'WATCH OUT'})}</b> ${escapeHtml(x.d.aviso)}</div>` : ''}
      </div>
    </div>`).join('');
  const temp = (f.bebidaTipo && bebidaDatos(f).tempServicio !== undefined) ? `${escapeHtml(String(bebidaDatos(f).tempServicio))} °C` : (f.temp ? escapeHtml(fichaTempLabel(f.temp)) : '');
  const meta = [
    [fArea==='sala' ? t('label.servings') : gl({es:'Producción', ca:'Producció', en:'Production'}), `${fmtNum(produccion)} ${escapeHtml(unidad)}`],
    f.tiempo ? [t('label.prepTime'), `${f.tiempo} min`] : null,
    temp ? [t('label.servingTemp'), temp] : null,
  ].filter(Boolean).map(([et, v]) => `<div class="fp-meta"><span>${escapeHtml(et)}</span><b>${v}</b></div>`).join('');
  const algs = fichaAllergens.length
    ? fichaAllergens.map(a => `<span class="fp-alg">${escapeHtml(allergenLabel(a))}</span>`).join('')
    : `<span class="fp-sin">${t('label.none')}</span>`;
  const subtitulo = [liveRecipe && liveRecipe.category ? escapeHtml(liveRecipe.category) : '', f.bebidaTipo && bebidaTipoDef(f.bebidaTipo) ? escapeHtml(gl(bebidaTipoDef(f.bebidaTipo).l).split(' (')[0]) : ''].filter(Boolean).join(' · ');
  const body = `
    <style>
      .fp-metas{display:flex;gap:0;border:1px solid #1C1A17;margin:14px 0 20px}
      .fp-meta{flex:1;padding:9px 12px;border-right:1px solid #1C1A17}
      .fp-meta:last-child{border-right:0}
      .fp-meta span{display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#716C65}
      .fp-meta b{font-size:16px;font-weight:700;letter-spacing:-.01em}
      .fp-foto{width:100%;height:62mm;object-fit:cover;display:block;margin:0 0 18px}
      .fp-cols{display:flex;gap:26px;align-items:flex-start}
      .fp-izq{flex:0 0 38%}
      .fp-der{flex:1;min-width:0}
      .pr-page .fp-ings{list-style:none;margin:0;padding:0}
      .fp-ings li{display:flex;gap:9px;align-items:baseline;padding:6px 0;border-bottom:1px solid #EFEBE3;break-inside:avoid}
      .fp-chk{flex:none;width:11px;height:11px;border:1.4px solid #1C1A17;transform:translateY(1px)}
      .fp-q{flex:none;min-width:62px;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:12px}
      .fp-n{flex:1}
      .fp-paso{display:flex;gap:13px;margin:0 0 15px;break-inside:avoid}
      .fp-n-paso{flex:none;width:28px;height:28px;background:#1C1A17;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center}
      .fp-paso-c{flex:1;min-width:0}
      .fp-paso-t{font-size:13.5px;line-height:1.55;white-space:pre-wrap}
      .fp-chips{display:flex;gap:6px;margin-top:6px}
      .fp-chips span{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600;letter-spacing:.05em;border:1px solid #1C1A17;padding:2px 7px}
      .fp-ojo{margin-top:7px;background:#FBF1DC;border-left:3px solid #C48A1C;padding:6px 10px;font-size:12px}
      .fp-ojo b{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;color:#8A5A0F;margin-right:6px}
      .fp-alergenos{margin-top:22px;border:1.5px solid #1C1A17;padding:10px 14px;break-inside:avoid}
      .fp-alergenos h2{margin-top:0;border:0}
      .fp-alg{display:inline-block;background:#F7E9E6;color:#8A3B2E;border:1px solid #D9A79C;font-weight:700;font-size:11.5px;padding:3px 9px;margin:2px 4px 2px 0}
      .fp-sin{color:#716C65}
    </style>
    ${printReportHeaderHtml(displayName, subtitulo)}
    <div class="fp-metas">${meta}</div>
    ${isBaseElaboration ? '' : (f.photo ? `<img class="fp-foto" src="${f.photo}" alt="${t('label.platingPhotoAlt')}">` : '')}
    <div class="fp-cols">
      <div class="fp-izq">
        <h2>${t('label.ingredients')} · ${fmtNum(produccion)} ${escapeHtml(unidad)}</h2>
        <ul class="fp-ings">${ings || `<li class="pr-empty">${t('empty.noIngredients')}</li>`}</ul>
      </div>
      <div class="fp-der">
        <h2>${t('label.prepMethod')}</h2>
        ${steps || `<p class="pr-empty">${t('label.notSpecified')}</p>`}
      </div>
    </div>
    ${isBaseElaboration ? '' : `<h2>${fArea==='sala' ? t('label.serviceNotes') : t('label.plating')}</h2><p style="white-space:pre-wrap">${escapeHtml(f.presentation) || t('label.notSpecified')}</p>`}
    ${bebidaImpresoHtml(f)}
    <div class="fp-alergenos"><h2>${t('label.allergens')}</h2><div>${algs}</div></div>
  `;
  printReportWindow(displayName, body, {winSize:'width=860,height=1000'});
}
