// "Deshacer" en Comandas de Cocina (9/09): un toque de más avanzando el
// estado de un plato (esperando -> preparación -> listo -> recogido) no
// tenía ninguna forma de deshacerse. En vez de una flecha en cada plato
// (que el dueño consideró innecesario a ese nivel de detalle), un único
// botón "Deshacer" en la barra deshace el ÚLTIMO movimiento, sea de un
// plato suelto o de una tanda entera marcada de golpe.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
}, 'COCPASO1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
const orderId = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const orderId = genId();
  DB.tpvOrders.push({
    id: orderId, tipo:'mesa', tableId:null, status:'abierta', cerrada:false, area:'cocina',
    items:[
      {name:'Tortilla', qty:1, estado:'cocina', bebida:false, tanda:'Uno'},
      {name:'Croquetas', qty:1, estado:'cocina', bebida:false, tanda:'Uno'},
      {name:'Bistec', qty:1, estado:'cocina', bebida:false, tanda:'Dos'},
    ],
  });
  saveDB();
  navigate('comandascocina');
  return orderId;
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El botón general "Deshacer" existe en la barra de Comandas de Cocina', async () => {
  const existe = await page.evaluate(()=> !!document.getElementById('comandascocina-content').innerText.includes('Deshacer'));
  assert.ok(existe, 'debe verse el botón "Deshacer" en la barra');
});

await caso('Deshacer sin haber hecho nada no rompe (pila vacía)', async () => {
  const stackLen = await page.evaluate(()=>{
    kitchenUndoStack = [];
    undoLastKitchenAction();
    return kitchenUndoStack.length;
  });
  assert.equal(stackLen, 0, 'la pila debe seguir vacía, sin lanzar ningún error');
});

await caso('Avanzar un plato y "Deshacer" lo devuelve exactamente a como estaba (mismo estado, sin fecha)', async () => {
  const r = await page.evaluate((id)=>{
    cycleLineEstado(id, 0); // Tortilla: cocina -> preparando
    const antes = {...DB.tpvOrders.find(o=>o.id===id).items[0]};
    undoLastKitchenAction();
    const despues = DB.tpvOrders.find(o=>o.id===id).items[0];
    return {antes, estadoDespues: despues.estado, preparandoAtDespues: despues.preparandoAt};
  }, orderId);
  assert.equal(r.antes.estado, 'preparando', 'antes de deshacer debía estar en preparando: ' + JSON.stringify(r));
  assert.equal(r.estadoDespues, 'cocina', 'deshacer debe volver a "cocina": ' + JSON.stringify(r));
  assert.equal(r.preparandoAtDespues, undefined, 'no debe quedar preparandoAt colgando: ' + JSON.stringify(r));
});

await caso('Marcar como recogido (cierra la comanda) y "Deshacer" lo reabre y quita el recogido', async () => {
  const r = await page.evaluate((id)=>{
    cycleLineEstado(id, 0); // cocina -> preparando
    cycleLineEstado(id, 0); // preparando -> entregado
    cycleLineEstado(id, 1); // Croquetas también a preparando, para que la comanda no se cierre entera al recoger la Tortilla
    cycleLineEstado(id, 0); // entregado -> recogido
    const cerradaAntes = DB.tpvOrders.find(o=>o.id===id).cerrada;
    undoLastKitchenAction(); // deshace SOLO el último movimiento (el recogido de la Tortilla)
    const item0 = DB.tpvOrders.find(o=>o.id===id).items[0];
    return {cerradaAntes, estado: item0.estado, recogidoAt: item0.recogidoAt};
  }, orderId);
  assert.equal(r.estado, 'entregado', 'debe seguir "entregado" tras deshacer solo el recogido: ' + JSON.stringify(r));
  assert.equal(r.recogidoAt, undefined, 'debe quitarse el recogido: ' + JSON.stringify(r));
});

await caso('Marcar una tanda entera con el botón de grupo y "Deshacer" revierte los DOS platos a la vez', async () => {
  const r = await page.evaluate((id)=>{
    // La Tortilla (idx 0) sigue en "entregado" del caso anterior; las
    // Croquetas (idx 1) están en "preparando". Agrupamos su avance con
    // cycleGroupEstado sobre la tanda "Uno" y comprobamos que un solo
    // "Deshacer" recupera el estado de ambas.
    const antes = DB.tpvOrders.find(o=>o.id===id).items.map(i=>({estado:i.estado, recogidoAt:i.recogidoAt}));
    cycleGroupEstado(id, 'Uno');
    const stackLen = kitchenUndoStack.length;
    undoLastKitchenAction();
    const despues = DB.tpvOrders.find(o=>o.id===id).items.map(i=>({estado:i.estado, recogidoAt:i.recogidoAt}));
    return {antes, despues, stackLen};
  }, orderId);
  assert.deepEqual(r.despues.slice(0,2), r.antes.slice(0,2), 'las dos líneas de la tanda deben volver exactamente a como estaban: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
