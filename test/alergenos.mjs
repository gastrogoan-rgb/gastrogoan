// Alérgenos: de la ficha técnica al registro de APPCC — R18.
//
// El papel que se enseña en una inspección sale de Limpieza → Alérgenos.
// Antes esa pantalla leía SOLO los escandallos, y en el escandallo los
// alérgenos se deducen de los ingredientes: lo que el cocinero marcaba A
// MANO en la ficha (el sésamo del pan, el huevo de un rebozado comprado
// hecho, la traza que avisa el proveedor) no llegaba nunca. Y una ficha sin
// escandallo detrás no aparecía en absoluto.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'ALERG001',tenantId:ggBizTenantId('ALERG001')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));

await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');

  DB.ingredients = [
    // Cocina: la harina lleva gluten declarado en el ingrediente
    {id:1, name:'Harina', unit:'g', price:0.001, category:'Secos', supplier:'Prov', allergens:['Gluten'], area:'cocina'},
    {id:2, name:'Patata', unit:'g', price:0.001, category:'Verduras', supplier:'Prov', allergens:[], area:'cocina'},
    // Sala: el vino lleva sulfitos
    {id:3, name:'Vino tinto', unit:'ml', price:0.01, category:'Vinos y Cavas', supplier:'Prov', allergens:['Sulfitos'], area:'sala'},
    {id:4, name:'Zumo de naranja', unit:'ml', price:0.002, category:'Refrescos y Mixers', supplier:'Prov', allergens:[], area:'sala'},
  ];
  DB.recipes = [
    {id:10, name:'Croquetas', area:'cocina', comensales:2, consumiblesPct:5, price:9, allergens:[],
     ingredients:[{type:'ingredient', ingredientId:1, qty:100, merma:0}]},
    {id:11, name:'Patatas bravas', area:'cocina', comensales:2, consumiblesPct:5, price:7, allergens:[],
     ingredients:[{type:'ingredient', ingredientId:2, qty:300, merma:0}]},
    {id:12, name:'Sangría', area:'sala', comensales:2, consumiblesPct:5, price:12, allergens:[],
     ingredients:[{type:'ingredient', ingredientId:3, qty:500, merma:0}]},
    {id:13, name:'Zumo natural', area:'sala', comensales:2, consumiblesPct:5, price:3, allergens:[],
     ingredients:[{type:'ingredient', ingredientId:4, qty:250, merma:0}]},
  ];
  DB.fichas = [];
  saveDB();
});

const listado = (area) => page.evaluate((a)=>{
  currentArea = () => a;
  navigate('limpieza');
  setLimpiezaTab('alergenos');
  const filas = [...document.querySelectorAll('#limpieza-tab-content tbody tr')].map(tr => ({
    plato: tr.cells[0].textContent.trim(),
    alergenos: [...tr.cells[1].querySelectorAll('.badge')].map(b=>b.textContent.trim()),
  }));
  return {filas, datos: getAllDishAllergens()};
}, area);

/* ─── Lo que ya funcionaba: deducido de los ingredientes ─── */
await caso('COCINA: un alérgeno del ingrediente llega solo a APPCC', async ()=>{
  const r = await listado('cocina');
  const croquetas = r.filas.find(f => f.plato === 'Croquetas');
  assert.ok(croquetas, 'las croquetas deberían salir: llevan harina');
  assert.ok(croquetas.alergenos.includes('Gluten'), `alérgenos: ${croquetas.alergenos}`);
  assert.ok(!r.filas.some(f => f.plato === 'Patatas bravas'), 'un plato sin alérgenos no debe salir');
  assert.ok(!r.filas.some(f => f.plato === 'Sangría'), 'y nada de sala en cocina');
  return 'Croquetas → Gluten, y las bravas no salen';
});

await caso('SALA: los sulfitos del vino llegan solos a APPCC', async ()=>{
  const r = await listado('sala');
  const sangria = r.filas.find(f => f.plato === 'Sangría');
  assert.ok(sangria, 'la sangría debería salir: lleva vino');
  assert.ok(sangria.alergenos.includes('Sulfitos'), `alérgenos: ${sangria.alergenos}`);
  assert.ok(!r.filas.some(f => f.plato === 'Zumo natural'), 'el zumo no lleva ninguno');
  assert.ok(!r.filas.some(f => f.plato === 'Croquetas'), 'y nada de cocina en sala');
  return 'Sangría → Sulfitos, y el zumo no sale';
});

/* ─── EL FALLO: lo marcado A MANO en la ficha ─── */
await caso('COCINA: un alérgeno marcado a mano en la ficha llega a APPCC', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    // El cocinero abre la ficha de las bravas y marca Huevos: el alioli
    // viene comprado hecho y el proveedor avisa. No hay ningún ingrediente
    // que lo declare, así que el escandallo NO puede saberlo.
    const ficha = ensureFichaForRecipe(11);
    toggleFichaAllergen && (ficha.allergens = ['Huevos']);
    saveDB();
    navigate('limpieza'); setLimpiezaTab('alergenos');
    return getAllDishAllergens();
  });
  const bravas = r.find(d => d.name === 'Patatas bravas');
  assert.ok(bravas, 'las bravas deben aparecer ahora: su ficha declara Huevos');
  assert.deepEqual(bravas.allergens, ['Huevos']);
  return 'Patatas bravas → Huevos, marcado a mano';
});

await caso('SALA: lo marcado a mano en la ficha de una bebida también llega', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'sala';
    // Un zumo servido con una galleta de cortesía: gluten que no está en
    // ningún ingrediente del escandallo.
    const ficha = ensureFichaForRecipe(13);
    ficha.allergens = ['Gluten'];
    saveDB();
    navigate('limpieza'); setLimpiezaTab('alergenos');
    return getAllDishAllergens();
  });
  const zumo = r.find(d => d.name === 'Zumo natural');
  assert.ok(zumo, 'el zumo debe aparecer: su ficha declara Gluten');
  assert.deepEqual(zumo.allergens, ['Gluten']);
  return 'Zumo natural → Gluten, marcado a mano';
});

await caso('Lo deducido y lo marcado a mano se SUMAN, no se pisan', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    const ficha = ensureFichaForRecipe(10);   // Croquetas, ya llevan Gluten del ingrediente
    ficha.allergens = ['Lácteos'];             // y el cocinero añade la leche de la bechamel
    saveDB();
    return getAllDishAllergens();
  });
  const croquetas = r.find(d => d.name === 'Croquetas');
  assert.ok(croquetas.allergens.includes('Gluten'), 'el deducido del ingrediente debe seguir');
  assert.ok(croquetas.allergens.includes('Lácteos'), 'y el marcado a mano sumarse');
  assert.equal(croquetas.allergens.length, 2);
  return 'Croquetas → Gluten (ingrediente) + Lácteos (a mano)';
});

/* ─── Una ficha suelta, sin escandallo detrás ─── */
await caso('Una ficha sin escandallo con alérgenos también sale', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    DB.fichas.push({id:9999, name:'Pan de la casa', area:'cocina', recipeId:'', allergens:['Gluten','Sésamo'],
      ingredients:[], pasos:[], comensales:2});
    saveDB();
    return getAllDishAllergens();
  });
  const pan = r.find(d => d.name === 'Pan de la casa');
  assert.ok(pan, 'una ficha suelta con alérgenos no puede quedarse fuera del registro');
  assert.deepEqual(pan.allergens.sort(), ['Gluten','Sésamo']);
  return 'Pan de la casa → Gluten + Sésamo, sin escandallo detrás';
});

/* ─── Nada se duplica ─── */
await caso('Un plato con ficha y escandallo sale UNA vez, no dos', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    return getAllDishAllergens();
  });
  const veces = r.filter(d => d.name === 'Croquetas').length;
  assert.equal(veces, 1, 'aparecer dos veces en el registro confunde en una inspección');
  return 'una sola fila por plato';
});

await caso('Si el plato se renombra en el escandallo, el registro sigue el nombre nuevo', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    getRecipe(10).name = 'Croquetas de la abuela';
    saveDB();
    return getAllDishAllergens();
  });
  assert.ok(r.some(d => d.name === 'Croquetas de la abuela'), 'debería usar el nombre actual del plato');
  assert.ok(!r.some(d => d.name === 'Croquetas'), 'y no el que se guardó en la ficha en su día');
  return 'manda el nombre del escandallo';
});

await caso('Ningún error de JavaScript', async ()=>{
  assert.deepEqual(errs, [], errs.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
