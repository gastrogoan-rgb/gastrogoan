// Asistente de IA en Mi Negocio + "Pregúntale a tus números" (7/10).
//
// Lo que no puede fallar:
//  - La clave se guarda en localStorage y NUNCA en DB.business (viaja a la
//    nube del negocio y la leería cualquier empleado).
//  - El modelo no inventa cifras: lo que se le manda lleva los números que
//    calcula la app con los datos sembrados.
//  - Un empleado no entra, y se le dice por qué (nada de botones mudos).
//  - Sin clave, el chat explica y lleva a Mi Negocio.
//  - El paso del alta se puede saltar siempre.
//
// La red del proveedor se intercepta: no se gasta ninguna clave de verdad.
// Puerto: GG_PUERTO (por defecto 8950, el de test/todo.sh).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PUERTO = process.env.GG_PUERTO || 8950;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}
const espera = ms => new Promise(r=>setTimeout(r, ms));

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

// El proveedor fingido: se guarda lo que la app le manda y se contesta fijo.
const enviados = [];
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if(u.includes('generativelanguage.googleapis.com')){
    if(req.method() === 'OPTIONS') return req.respond({status:204, headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, GET'}});
    let cuerpo = null; try{ cuerpo = JSON.parse(req.postData()||'null'); }catch(e){}
    enviados.push({url:u, cuerpo});
    return req.respond({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'},
      body: JSON.stringify({candidates:[{content:{parts:[{text:'Este mes llevas 1.234,00 € netos.'}]}, finishReason:'STOP'}]})});
  }
  // Nada de Firebase de verdad ni de nada de fuera.
  if(/firebaseio|googleapis|gstatic|github/.test(u)) return req.abort();
  req.continue();
});

await page.goto(`http://localhost:${PUERTO}/index.html`,{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.clear();
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'IANUM001',tenantId:ggBizTenantId('IANUM001')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await espera(2400);

await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true, name:'Bistró Prueba'});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const hoy = todayStr();
  DB.ingredients = [{id:901, name:'Solomillo', unit:'kg', price:24, category:'Carne', supplier:'Carnes Prat', allergens:[], area:'cocina'}];
  DB.recipes = [{id:801, name:'Tataki de solomillo', price:22, ivaPct:10, items:[{type:'ing', id:901, qty:0.25}]}];
  DB.sales.push({id:'v-ia-1', date:hoy, createdAt:new Date().toISOString(), total:777.77, tipo:'mesa', status:'cerrada',
    items:[{name:'Tataki de solomillo', recipeId:801, price:22, qty:3, ivaPct:10}]});
  DB.preciosHistorial = [{id:'ph1', fecha:hoy, ingredientId:901, nombre:'Solomillo', proveedor:'Carnes Prat', antes:20, despues:24, pct:20, unidad:'kg'}];
  saveDB();
});

await caso('Mi Negocio tiene la sección Asistente de IA y guarda en localStorage, no en DB.business', async ()=>{
  const r = await page.evaluate(async ()=>{
    navigate('minegocio');
    await new Promise(r=>setTimeout(r,300));
    const card = document.getElementById('mn-ia');
    document.getElementById('idr-prov').value = 'google';
    document.getElementById('idr-clave').value = 'AIzaPRUEBA-secreta-123';
    iaGuardarDesdeNegocio();
    const enLocal = localStorage.getItem(idrKeyLS()) || '';
    return {hay: !!card, consumo: !!document.getElementById('mn-ia-consumo'),
      enLocal: enLocal.includes('AIzaPRUEBA-secreta-123'),
      enDB: JSON.stringify(DB).includes('AIzaPRUEBA-secreta-123'),
      explica: card && /dispositivo/i.test(card.textContent)};
  });
  assert.ok(r.hay, 'falta la sección #mn-ia');
  assert.ok(r.consumo, 'debe enseñar el consumo del día');
  assert.ok(r.explica, 'debe explicar que la clave va por dispositivo');
  assert.ok(r.enLocal, 'la clave debe ir a localStorage');
  assert.ok(!r.enDB, 'la clave NO puede estar en DB');
  return 'clave solo en este aparato';
});

await caso('El contexto que se manda al modelo lleva las cifras reales sembradas', async ()=>{
  enviados.length = 0;
  await page.evaluate(async ()=>{
    abrirPreguntaNumeros();
    await new Promise(r=>setTimeout(r,100));
    document.querySelector('#ia-num-sugeridas button').click();
    for(let i=0;i<40 && iaNumPensando;i++) await new Promise(r=>setTimeout(r,100));
  });
  await espera(200);
  assert.ok(enviados.length >= 1, 'no llegó ninguna llamada al proveedor');
  const sistema = enviados[0].cuerpo.systemInstruction.parts[0].text;
  assert.ok(sistema.includes('707.06') || sistema.includes('777.77'), 'falta la venta sembrada (777,77 €)');
  assert.ok(sistema.includes('Tataki de solomillo'), 'falta el plato');
  assert.ok(sistema.includes('Solomillo') && sistema.includes('"pct":20'), 'falta la subida de precio del proveedor');
  assert.ok(/SOLO las cifras/.test(sistema), 'faltan las instrucciones de no inventar');
  const hilo = await page.evaluate(()=>document.getElementById('ia-num-hilo').textContent);
  assert.ok(hilo.includes('1.234,00'), 'la respuesta debe salir en el hilo');
  const persistido = await page.evaluate(()=>JSON.stringify(DB).includes('Este mes llevas'));
  assert.ok(!persistido, 'la conversación no puede guardarse en DB');
  return 'ventas, plato y subida de precio en el contexto';
});

await caso('Sin clave: explica y lleva a Mi Negocio', async ()=>{
  const r = await page.evaluate(async ()=>{
    closeModal(); idrBorrarConfig(); navigate('dashboard');
    await new Promise(r=>setTimeout(r,200));
    document.getElementById('dash-preguntale').click();
    await new Promise(r=>setTimeout(r,100));
    const aviso = !!document.getElementById('ia-num-sinclave');
    document.getElementById('ia-num-ir-config').click();
    await new Promise(r=>setTimeout(r,300));
    return {aviso, enMiNegocio: document.getElementById('view-minegocio').classList.contains('active'), seccion: !!document.getElementById('mn-ia')};
  });
  assert.ok(r.aviso, 'debe explicar que falta la clave');
  assert.ok(r.enMiNegocio && r.seccion, 'debe llevar a Mi Negocio → Asistente de IA');
  return 'aviso + salto a la sección';
});

await caso('Desde I+D, configurar lleva a Mi Negocio', async ()=>{
  const r = await page.evaluate(async ()=>{
    navigate('idr'); await new Promise(r=>setTimeout(r,200));
    const b = [...document.querySelectorAll('#view-idr button')].find(x => (x.getAttribute('onclick')||'').includes('irAConfigIA'));
    if(!b) return {boton:false};
    b.click(); await new Promise(r=>setTimeout(r,300));
    return {boton:true, enMiNegocio: document.getElementById('view-minegocio').classList.contains('active')};
  });
  assert.ok(r.boton, 'I+D debe tener el botón de configurar');
  assert.ok(r.enMiNegocio, 'debe llevar a Mi Negocio');
  return 'I+D → Mi Negocio';
});

await caso('Un empleado no accede, y se le avisa', async ()=>{
  const r = await page.evaluate(async ()=>{
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:'e1', area:'sala', ts:Date.now()}));
    const prev = window.ownerUnlocked; try{ ownerUnlocked = false; }catch(e){}
    const toasts = [];
    const real = window.showToast; window.showToast = m => toasts.push(m);
    closeModal();
    abrirPreguntaNumeros();
    const abierto = !!document.getElementById('ia-num-hilo') || !!document.getElementById('ia-num-sinclave');
    irAConfigIA();
    window.showToast = real;
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    return {abierto, toasts};
  });
  assert.ok(!r.abierto, 'el chat no debe abrirse a un empleado');
  assert.equal(r.toasts.length, 2, 'cada intento debe avisar: ' + r.toasts.join(' | '));
  return r.toasts[0];
});

await caso('El paso del alta se puede saltar con "Ahora no"', async ()=>{
  const r = await page.evaluate(async ()=>{
    idrBorrarConfig();
    DB.business.extConnPromptSeen = false; DB.business.tourSeen = true;
    showExternalConnectionsPrompt();
    // Avanzar hasta el paso de la IA
    for(let i=0;i<5 && !document.getElementById('iag-ahora-no');i++) skipExternalConnectionsPromptStep();
    const hayPaso = !!document.getElementById('iag-ahora-no');
    const explica = (document.getElementById('extconn-gate')?.textContent||'').includes(t('ia.gate.use2'));
    document.getElementById('iag-ahora-no')?.click();
    return {hayPaso, explica, cerrado: !document.getElementById('extconn-gate'), visto: DB.business.extConnPromptSeen, sinClave: !idrHayIA()};
  });
  assert.ok(r.hayPaso, 'falta el paso de la clave de IA en el alta');
  assert.ok(r.explica, 'debe explicar para qué sirve');
  assert.ok(r.cerrado && r.visto, '"Ahora no" debe terminar el alta');
  assert.ok(r.sinClave, 'saltar no guarda nada');
  return 'saltado sin dejar nada a medias';
});

await caso('Las cadenas nuevas existen en los tres idiomas', async ()=>{
  const faltan = await page.evaluate(()=>{
    const ks = ['ia.cfg.title','ia.cfg.whyLocal','ia.num.title','ia.num.q1','ia.num.q2','ia.num.q3','ia.gate.notNow','ia.num.noKey'];
    const out = [];
    ['es','ca','en'].forEach(l => ks.forEach(k => { if(!(I18N[l]||{})[k]) out.push(l+':'+k); }));
    return out;
  });
  assert.deepEqual(faltan, []);
  return 'es/ca/en';
});

await caso('Ningún error de JavaScript', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|firebase/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ todos los casos de pregúntale pasaron (${res.length})`);
await browser.close();
process.exit(fallos ? 1 : 0);
