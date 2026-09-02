// R38 — Renombrar y borrar carpetas.
//
// Lo vio el dueño grabando el vídeo: en Mega Lista podía renombrar una
// carpeta, y en Stock, Escandallo y Fichas Técnicas no. Y borrarla, en
// ninguna. Es la MISMA carpeta vista desde otro sitio: que la app se comporte
// distinto según por dónde entres se lee como un fallo, no como una decisión.
//
// Lo que de verdad hay que vigilar aquí no es que el botón esté, es que
// BORRAR UNA CARPETA NO BORRE NADA DE DENTRO. Una categoría no es una caja:
// es lo que pone en el campo `category` de cada ingrediente o receta. Si se
// borrara a secas, sus ingredientes se quedarían huérfanos y desaparecerían de
// las listas sin que nadie los haya borrado — con los precios que el hostelero
// ha metido uno a uno dentro.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true, protocolTimeout:60000});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1400, height:1000});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'CATEG001', tenantId: ggBizTenantId('CATEG001')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2600));

/* Los diálogos se sustituyen por respuestas fijas: lo que se prueba es la
   lógica, no el modal. Con los modales de verdad la prueba se queda colgada
   esperando un clic que nadie da. */
await page.evaluate(()=>{
  window.__opcionesVistas = null;
  window.__conRespuestas = async (fn, r) => {
    const pt = window.promptText, cm = window.confirmModal, po = window.pickOption, st = window.showToast;
    window.showToast = () => {};
    window.promptText   = async () => r.texto;
    window.confirmModal = async () => r.confirma;
    window.pickOption   = async (ti, tx, ops) => { window.__opcionesVistas = ops.map(o => o.valor); return r.elige; };
    try{ await fn(); } finally {
      window.promptText = pt; window.confirmModal = cm; window.pickOption = po; window.showToast = st;
    }
  };
});

const sembrar = () => page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
    .forEach(i => document.getElementById(i)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true,
    tourSeen:true, categoryIconHintSeen:true, name:'Bar'});
  DB.ingredients = []; DB.recipes = []; DB.recipeCategories = []; DB.ingredientCategories = [];
  const mk = (n, c) => DB.ingredients.push({id:genId(), name:n, category:c, area:'cocina',
    unit:'kg', price:1, packQty:1, packPrice:10, activo:true});
  mk('Bacalao','Pescados'); mk('Merluza','Pescados'); mk('Tomate','Verduras');
  DB.ingredientCategories.push('Pescados','Verduras','VaciaIng');
  DB.recipes.push({id:genId(), name:'Pil-pil', area:'cocina', isBase:false, price:19,
    ivaPct:10, category:'Principales', ingredients:[]});
  DB.recipeCategories.push({name:'Principales', area:'cocina'}, {name:'VaciaRec', area:'cocina'});
  currentFolder = 'cocina'; saveDB();
});

await caso('Las cinco pantallas que pintan carpetas ofrecen los MISMOS botones', async ()=>{
  /* Mega Lista, Stock (ingredientes y elaboraciones), Escandallo y Fichas
     Técnicas. Antes solo Mega Lista dejaba renombrar. */
  const r = await page.evaluate(()=>{
    const fuente = [renderMegalista, renderStock, renderEscandallo, renderFichas]
      .map(f => f.toString()).join('\n');
    return {
      sitios: (fuente.match(/botonesDeCarpeta/g) || []).length,
      // Y que nadie se haya dejado el botón suelto de antes por ahí.
      sueltoViejo: /renameIngredientCategory\('\$\{safeCat\}'\)/.test(fuente),
    };
  });
  assert.ok(r.sitios >= 5, `solo ${r.sitios} pantallas con botones, deberían ser 5`);
  assert.equal(r.sueltoViejo, false, 'queda un botón suelto en vez del ayudante común');
  return `${r.sitios} sitios, todos con el mismo ayudante`;
});

await caso('"Sin categoría" no lleva botones — no es una carpeta de verdad', async ()=>{
  const r = await page.evaluate(()=>({
    ninguno: botonesDeCarpeta('__none__', 'recipe') === '' && botonesDeCarpeta('', 'ingredient') === '',
    normal: /menuDeCarpeta/.test(botonesDeCarpeta('Postres','recipe')),
  }));
  assert.ok(r.ninguno, '"sin categoría" no puede renombrarse ni borrarse: es el hueco, no una carpeta');
  assert.ok(r.normal, 'y una carpeta normal sí tiene su botón de opciones');
  return 'el hueco sin botón, la carpeta con el suyo';
});

await caso('Una carpeta de Escandallo se puede renombrar (antes, no)', async ()=>{
  await sembrar();
  const r = await page.evaluate(async ()=>{
    await window.__conRespuestas(() => renameRecipeCategory('Principales'), {texto:'Platos principales'});
    return {
      enLaReceta: DB.recipes[0].category,
      enLaLista: DB.recipeCategories.some(c => (c.name||c) === 'Platos principales'),
      viejaFuera: !DB.recipeCategories.some(c => (c.name||c) === 'Principales'),
    };
  });
  assert.equal(r.enLaReceta, 'Platos principales', 'la receta tiene que quedar en la carpeta nueva');
  assert.ok(r.enLaLista, 'y la carpeta nueva, en la lista');
  assert.ok(r.viejaFuera, 'y la vieja, fuera');
  return 'se renombra y arrastra sus fichas';
});

await caso('Una carpeta vacía se borra sin más', async ()=>{
  await sembrar();
  const r = await page.evaluate(async ()=>{
    await window.__conRespuestas(() => deleteRecipeCategory('VaciaRec'), {confirma:true});
    await window.__conRespuestas(() => deleteIngredientCategory('VaciaIng'), {confirma:true});
    return {
      rec: !DB.recipeCategories.some(c => (c.name||c) === 'VaciaRec'),
      ing: !DB.ingredientCategories.includes('VaciaIng'),
    };
  });
  assert.ok(r.rec && r.ing, 'una carpeta vacía debería poder quitarse');
  return 'vacía fuera, sin preguntar a dónde mover nada';
});

await caso('Si dices que no, no se borra', async ()=>{
  await sembrar();
  const sigue = await page.evaluate(async ()=>{
    await window.__conRespuestas(() => deleteIngredientCategory('VaciaIng'), {confirma:false});
    return DB.ingredientCategories.includes('VaciaIng');
  });
  assert.ok(sigue, 'cancelar tiene que dejarlo todo como estaba');
  return 'cancelar no borra';
});

await caso('BORRAR UNA CARPETA CON COSAS DENTRO NO BORRA NI UNA', async ()=>{
  /* El caso que de verdad importa. Los precios de esos ingredientes los ha
     metido el hostelero uno a uno: perderlos por reorganizar carpetas sería
     imperdonable, y encima sin avisar. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    const antes = DB.ingredients.length;
    await window.__conRespuestas(() => deleteIngredientCategory('Pescados'), {elige:'Verduras'});
    return {
      antes, despues: DB.ingredients.length,
      enDestino: DB.ingredients.filter(i => i.category === 'Verduras').length,
      huerfanos: DB.ingredients.filter(i => i.category === 'Pescados').length,
      carpetaFuera: !DB.ingredientCategories.includes('Pescados'),
      opciones: window.__opcionesVistas,
    };
  });
  assert.equal(r.despues, r.antes, `había ${r.antes} ingredientes y quedan ${r.despues}`);
  assert.equal(r.huerfanos, 0, 'no puede quedar ninguno apuntando a una carpeta que ya no existe');
  assert.equal(r.enDestino, 3, 'los tres tienen que estar en la carpeta elegida');
  assert.ok(r.carpetaFuera, 'y la carpeta, quitada');
  assert.ok((r.opciones||[]).includes(''), 'entre los destinos tiene que estar "sin categoría"');
  assert.ok(!(r.opciones||[]).includes('Pescados'), 'y no puede ofrecerse a sí misma como destino');
  return `${r.antes} ingredientes antes, ${r.despues} después — ninguno perdido`;
});

await caso('Cancelar el "a dónde lo muevo" tampoco toca nada', async ()=>{
  await sembrar();
  const r = await page.evaluate(async ()=>{
    const antes = DB.ingredients.map(i => i.category).join(',');
    await window.__conRespuestas(() => deleteIngredientCategory('Pescados'), {elige:null});
    return {igual: DB.ingredients.map(i => i.category).join(',') === antes,
            carpetaSigue: DB.ingredientCategories.includes('Pescados')};
  });
  assert.ok(r.igual, 'cancelar a mitad no puede haber movido nada');
  assert.ok(r.carpetaSigue, 'ni haber quitado la carpeta');
  return 'a medias no deja nada movido';
});

await caso('Lo mismo con las fichas: se mueven, no se borran', async ()=>{
  await sembrar();
  const r = await page.evaluate(async ()=>{
    DB.recipes.push({id:genId(), name:'Otro', area:'cocina', isBase:false, price:9,
      ivaPct:10, category:'Postres', ingredients:[]});
    saveDB();
    const antes = DB.recipes.length;
    await window.__conRespuestas(() => deleteRecipeCategory('Principales'), {elige:'Postres'});
    return {antes, despues: DB.recipes.length,
            enDestino: DB.recipes.filter(r => r.category === 'Postres').length};
  });
  assert.equal(r.despues, r.antes, 'no puede desaparecer ninguna ficha');
  assert.equal(r.enDestino, 2, 'las dos tienen que acabar en Postres');
  return 'ninguna ficha perdida';
});

await caso('Renombrar en Cocina no toca la carpeta del mismo nombre de Sala', async ()=>{
  /* Las dos áreas pueden tener, por coincidencia, una carpeta que se llama
     igual. Son distintas y no deben moverse a la vez. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    DB.ingredients.push({id:genId(), name:'Vino', category:'Pescados', area:'sala',
      unit:'ud', price:6, packQty:1, packPrice:6, activo:true});
    saveDB();
    currentFolder = 'cocina';
    await window.__conRespuestas(() => renameIngredientCategory('Pescados'), {texto:'Pescado fresco'});
    return {
      cocina: DB.ingredients.filter(i => (i.area||'cocina')==='cocina' && i.category === 'Pescado fresco').length,
      sala: DB.ingredients.filter(i => i.area === 'sala' && i.category === 'Pescados').length,
    };
  });
  assert.equal(r.cocina, 2, 'los de cocina tienen que renombrarse');
  assert.equal(r.sala, 1, 'y el de sala quedarse como estaba');
  return 'cada área, la suya';
});

/* ─── Y lo que de verdad se rompe: la nube ─── */
await caso('Borrar una carpeta NO la resucita cuando contesta la nube', async ()=>{
  /* mergeArraysById fusiona por `id`, y las carpetas no lo tienen: al no
     encontrarlo hacía `return remote` y mandaba la nube entera. Borrabas una
     carpeta, la nube contestaba con su copia de hace un segundo, y la carpeta
     volvía sola. Es la familia del idioma que no cambiaba y de Distribución
     del Trabajo congelada: solo se ve con la nube conectada, así que ninguna
     prueba local lo habría cazado. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    /* El escenario de verdad, con dos aparatos:
       - lo último que ESTE mandó a la nube incluía la carpeta,
       - aquí se borra (todavía sin subir),
       - y llega un bloque de la nube que todavía la lleva, porque el OTRO
         aparato acaba de guardar algo sin haberse enterado del borrado.
       Hay que meter además una carpeta del otro aparato: si el bloque que
       llega fuera idéntico a la última foto enviada, applyRemoteBlock corta
       antes de fusionar y la prueba pasaría sin probar nada. */
    const ultimoEnvio = [...DB.ingredientCategories];
    lastSyncedSnapshot = lastSyncedSnapshot || {};
    lastSyncedSnapshot.ingredientCategories = JSON.stringify(ultimoEnvio);
    await window.__conRespuestas(() => deleteIngredientCategory('VaciaIng'), {confirma:true});
    const trasBorrar = [...DB.ingredientCategories];
    applyRemoteBlock('ingredientCategories', [...ultimoEnvio, 'DesdeElMovil']);
    return {trasBorrar, trasLaNube: [...DB.ingredientCategories]};
  });
  assert.ok(!r.trasBorrar.includes('VaciaIng'), 'no llegó ni a borrarse');
  assert.ok(!r.trasLaNube.includes('VaciaIng'),
    `la nube la resucitó: ${r.trasLaNube.join(', ')}`);
  assert.ok(r.trasLaNube.includes('DesdeElMovil'),
    'y lo que hizo el otro aparato tiene que llegar igualmente');
  return 'borrada se queda borrada, y lo del otro aparato llega';
});

await caso('Renombrar una carpeta tampoco se deshace al sincronizar', async ()=>{
  await sembrar();
  const r = await page.evaluate(async ()=>{
    const enLaNube = DB.recipeCategories.map(c => ({...c}));
    lastSyncedSnapshot = lastSyncedSnapshot || {};
    lastSyncedSnapshot.recipeCategories = JSON.stringify(enLaNube);
    await window.__conRespuestas(() => renameRecipeCategory('Principales'), {texto:'Platos principales'});
    applyRemoteBlock('recipeCategories', enLaNube);
    const n = DB.recipeCategories.map(c => c.name || c);
    return {tieneNueva: n.includes('Platos principales'), tieneVieja: n.includes('Principales')};
  });
  assert.ok(r.tieneNueva, 'el nombre nuevo tiene que sobrevivir a la nube');
  assert.ok(!r.tieneVieja, 'y el viejo no puede volver');
  return 'el nombre nuevo aguanta';
});

await caso('Una carpeta creada en OTRO dispositivo sí llega', async ()=>{
  /* El otro lado de la moneda: no resucitar lo borrado aquí no puede
     convertirse en ignorar lo que hicieron allí. */
  await sembrar();
  const r = await page.evaluate(()=>{
    lastSyncedSnapshot = lastSyncedSnapshot || {};
    lastSyncedSnapshot.ingredientCategories = JSON.stringify([...DB.ingredientCategories]);
    applyRemoteBlock('ingredientCategories', [...DB.ingredientCategories, 'DesdeElMovil']);
    return [...DB.ingredientCategories];
  });
  assert.ok(r.includes('DesdeElMovil'), 'lo que se crea en otro aparato tiene que llegar');
  assert.ok(r.includes('Pescados'), 'y sin perder las de aquí');
  return 'llega lo de fuera y se queda lo de aquí';
});

await caso('Sin foto anterior, manda la nube (que es lo seguro)', async ()=>{
  /* Primera sincronización del dispositivo: no hay forma de distinguir
     "borrado aquí" de "todavía no ha llegado". Ante la duda, la nube. */
  await sembrar();
  const r = await page.evaluate(()=>{
    lastSyncedSnapshot = {};
    applyRemoteBlock('ingredientCategories', ['SoloLaNube']);
    return [...DB.ingredientCategories];
  });
  assert.deepEqual(r, ['SoloLaNube'], 'sin referencia previa tiene que ganar la nube');
  return 'ante la duda, la nube';
});

await caso('Una carpeta guardada como texto y como objeto es la MISMA', async ()=>{
  /* Las carpetas de receta de siempre son texto suelto ("Postres"); las que
     se crean al renombrar llevan área ({name, area}). Si la fusión las
     tratara como distintas, la lista acabaría con la misma carpeta dos
     veces — una por cada forma. */
  await sembrar();
  const r = await page.evaluate(()=>{
    DB.recipeCategories = ['Postres', {name:'Entrantes', area:'cocina'}];
    saveDB();
    lastSyncedSnapshot = lastSyncedSnapshot || {};
    lastSyncedSnapshot.recipeCategories = JSON.stringify(DB.recipeCategories);
    // La nube las tiene las dos, pero al revés: la de objeto como texto.
    applyRemoteBlock('recipeCategories', ['Postres', 'Entrantes', 'Nueva']);
    const nombres = DB.recipeCategories.map(c => (c && c.name) || c);
    return {nombres, repetidas: nombres.length !== new Set(nombres).size};
  });
  assert.equal(r.repetidas, false, 'salieron duplicadas: ' + r.nombres.join(', '));
  assert.ok(r.nombres.includes('Nueva'), 'y la nueva de la nube tiene que llegar');
  return r.nombres.join(', ');
});

/* ─── LÁPIDAS: que un borrado no se deshaga solo ─── */
await caso('La lápida se anota SOLA al subir, sin tocar la función de borrado', async ()=>{
  /* Se anota comparando lo que se va a subir con lo último subido. Si hubiera
     que anotarla en cada función de borrado, la app tiene decenas y bastaría
     olvidar una para que ese borrado se deshiciera solo. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    DB.borrados = {};
    lastSyncedSnapshot = {ingredientCategories: JSON.stringify(DB.ingredientCategories)};
    await window.__conRespuestas(() => deleteIngredientCategory('VaciaIng'), {confirma:true});
    anotarLapidas();
    return {lapidas: Object.keys(DB.borrados),
            tiene: hayLapida('ingredientCategories','VaciaIng')};
  });
  assert.ok(r.tiene, 'debería haber quedado anotada: ' + r.lapidas.join(', '));
  return r.lapidas.join(', ');
});

await caso('Con lápida, el otro aparato NO puede resucitar la carpeta', async ()=>{
  /* El caso que el emulador destapó: A borra y sube; el móvil, que llevaba un
     día apagado con la lista vieja, la sube entera y la carpeta volvía. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    DB.borrados = {};
    const listaVieja = [...DB.ingredientCategories];
    lastSyncedSnapshot = {ingredientCategories: JSON.stringify(listaVieja)};
    await window.__conRespuestas(() => deleteIngredientCategory('VaciaIng'), {confirma:true});
    anotarLapidas();
    // Se sube el borrado: a partir de aquí la foto ya NO contiene la carpeta,
    // que es justo donde se perdía el rastro antes.
    lastSyncedSnapshot.ingredientCategories = JSON.stringify(DB.ingredientCategories);
    // Y ahora el móvil sube su lista de ayer, con la carpeta dentro.
    applyRemoteBlock('ingredientCategories', [...listaVieja, 'DesdeElMovil']);
    return [...DB.ingredientCategories];
  });
  assert.ok(!r.includes('VaciaIng'), 'volvió a colarse: ' + r.join(', '));
  assert.ok(r.includes('DesdeElMovil'), 'y lo que hizo el otro aparato sí tiene que llegar');
  return r.join(', ');
});

await caso('Un ingrediente borrado tampoco vuelve', async ()=>{
  /* No es solo cosa de carpetas: mergeArraysById se queda con TODO lo de los
     dos lados, así que cualquier cosa borrada volvía. */
  await sembrar();
  const r = await page.evaluate(async ()=>{
    DB.borrados = {};
    const todos = DB.ingredients.map(i => ({...i}));
    lastSyncedSnapshot = {ingredients: JSON.stringify(todos)};
    const fuera = DB.ingredients[0].id;
    DB.ingredients = DB.ingredients.filter(i => i.id !== fuera);
    anotarLapidas();
    lastSyncedSnapshot.ingredients = JSON.stringify(DB.ingredients);
    applyRemoteBlock('ingredients', todos);   // el otro aparato aún los tenía todos
    return {quedan: DB.ingredients.length, sigue: DB.ingredients.some(i => i.id === fuera)};
  });
  assert.equal(r.sigue, false, 'el ingrediente borrado ha vuelto');
  assert.equal(r.quedan, 2, 'y los otros dos tienen que seguir ahí');
  return '2 de 3, el borrado no vuelve';
});

await caso('Volver a crear algo con el mismo nombre quita su lápida', async ()=>{
  /* Si no, una carpeta borrada dejaría su nombre inutilizado para siempre. */
  await sembrar();
  const r = await page.evaluate(()=>{
    DB.borrados = {'ingredientCategories:Salsas': Date.now()};
    const antes = hayLapida('ingredientCategories','Salsas');
    DB.ingredientCategories.push('Salsas');
    lastSyncedSnapshot = {ingredientCategories: JSON.stringify(['Pescados'])};
    anotarLapidas();
    return {antes, despues: hayLapida('ingredientCategories','Salsas')};
  });
  assert.ok(r.antes, 'la lápida tenía que estar puesta al empezar');
  assert.equal(r.despues, false, 'al volver a crearla, la lápida tiene que irse');
  return 'se puede reutilizar el nombre';
});

await caso('Las lápidas de los dos aparatos se suman', async ()=>{
  await sembrar();
  const r = await page.evaluate(()=>{
    DB.borrados = {'ingredients:1': 1000};
    applyRemoteBlock('borrados', {'ingredients:2': 2000, 'ingredients:1': 500});
    return DB.borrados;
  });
  assert.ok(r['ingredients:2'], 'la lápida del otro aparato tiene que llegar');
  assert.equal(r['ingredients:1'], 1000, 'y ante la misma clave gana la más reciente');
  return 'se suman, y gana la más nueva';
});

await caso('Al llegar la lápida del otro aparato, aquí desaparece lo borrado', async ()=>{
  /* Si solo se filtrara al fusionar la lista, lo que él borró se seguiría
     viendo aquí hasta que cambiara cualquier otra cosa. */
  await sembrar();
  const r = await page.evaluate(()=>{
    DB.borrados = {};
    applyRemoteBlock('borrados', {'ingredientCategories:Verduras': Date.now()});
    return [...DB.ingredientCategories];
  });
  assert.ok(!r.includes('Verduras'), 'debería haber desaparecido al llegar la lápida: ' + r.join(', '));
  return r.join(', ') || '(vacía)';
});

await caso('Una lápida caducada deja de estorbar', async ()=>{
  /* A los 60 días. Sin caducidad el mapa crece para siempre, y un nombre
     borrado hace un año no puede seguir bloqueado. */
  await sembrar();
  const r = await page.evaluate(()=>{
    const hace70dias = Date.now() - 70*86400000;
    DB.borrados = {'ingredientCategories:Antigua': hace70dias};
    const bloquea = hayLapida('ingredientCategories','Antigua');
    lastSyncedSnapshot = {};
    anotarLapidas();
    /* Ojo: al quedarse sin lápidas el mapa NO se queda en {} — se borra
       entero. Es a propósito: un {} haría que cada sincronización tuviera
       algo que subir y, como Firebase no guarda objetos vacíos, el
       indicador de nube se quedaría clavado en "Guardando…". */
    const mapa = DB.borrados || {};
    return {bloquea, sigueEnElMapa: 'ingredientCategories:Antigua' in mapa};
  });
  assert.equal(r.bloquea, false, 'una lápida de hace 70 días no puede seguir bloqueando');
  assert.equal(r.sigueEnElMapa, false, 'y se limpia del mapa');
  return 'caducan a los 60 días y se limpian solas';
});

await caso('Ningún error de JavaScript', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales.slice(0,4), [], reales.slice(0,2).join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
