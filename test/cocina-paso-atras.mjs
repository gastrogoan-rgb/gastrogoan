// "Un paso atrás" en Comandas de Cocina (9/09): un toque de más avanzando
// el estado de un plato (esperando -> preparación -> listo -> recogido) no
// tenía ninguna forma de deshacerse. Ahora cada plato con estado tiene un
// botón de flecha atrás que retrocede un paso, incluyendo deshacer el
// "recogido".
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
    items:[{name:'Tortilla', qty:1, estado:'cocina', bebida:false, tanda:''}],
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

await caso('El botón de "un paso atrás" existe junto al estado del plato', async () => {
  const existe = await page.evaluate(()=> !!document.querySelector('[title="Un paso atrás"]'));
  assert.ok(existe, 'debe verse el botón de retroceder');
});

await caso('Avanzar dos pasos y luego retroceder uno deja el plato en el paso intermedio, no en el primero', async () => {
  const r = await page.evaluate((id)=>{
    cycleLineEstado(id, 0); // cocina -> preparando
    cycleLineEstado(id, 0); // preparando -> entregado
    const btn = document.querySelector('[title="Un paso atrás"]');
    btn.click();
    return DB.tpvOrders.find(o=>o.id===id).items[0].estado;
  }, orderId);
  assert.equal(r, 'preparando', 'debe quedar en "preparando", no volver directo a "cocina": ' + r);
});

await caso('Retroceder otra vez lo deja en el primer estado ("cocina"), sin quitarle el estado del todo', async () => {
  const r = await page.evaluate((id)=>{
    const btn = document.querySelector('[title="Un paso atrás"]');
    btn.click();
    return DB.tpvOrders.find(o=>o.id===id).items[0].estado;
  }, orderId);
  assert.equal(r, 'cocina', 'debe quedar en "cocina": ' + r);
});

await caso('Marcar como recogido y retroceder deshace SOLO el recogido, vuelve a "listo para recoger"', async () => {
  const r = await page.evaluate((id)=>{
    cycleLineEstado(id, 0); // cocina -> preparando
    cycleLineEstado(id, 0); // preparando -> entregado
    cycleLineEstado(id, 0); // entregado -> recogido (recogidoAt): con un solo plato, esto CIERRA la comanda y sale de "Activas"
    const antes = DB.tpvOrders.find(o=>o.id===id).items[0];
    const antesRecogido = !!antes.recogidoAt;
    setComandasCocinaTab('cerradas'); // el botón de retroceder solo sigue visible aquí, ya cerrada
    const btn = document.querySelector('[title="Un paso atrás"]');
    btn.click();
    setComandasCocinaTab('activas'); // al retroceder se reabre, vuelve a Activas
    const despues = DB.tpvOrders.find(o=>o.id===id).items[0];
    return {antesRecogido, estadoDespues: despues.estado, recogidoDespues: !!despues.recogidoAt};
  }, orderId);
  assert.ok(r.antesRecogido, 'debe haber quedado marcado como recogido antes de retroceder');
  assert.equal(r.estadoDespues, 'entregado', 'el estado debe seguir siendo "entregado": ' + JSON.stringify(r));
  assert.ok(!r.recogidoDespues, 'debe deshacerse el recogido: ' + JSON.stringify(r));
});

await caso('Una vez cerrada, "Cerradas" también deja retroceder — y eso reabre la comanda', async () => {
  const r = await page.evaluate((id)=>{
    cycleLineEstado(id, 0); // recogido otra vez -> cierra la comanda, sale de "Activas"
    const cerradaAntes = DB.tpvOrders.find(o=>o.id===id).cerrada;
    setComandasCocinaTab('cerradas');
    const btnEnCerradas = !!document.querySelector('[title="Un paso atrás"]');
    document.querySelector('[title="Un paso atrás"]')?.click();
    setComandasCocinaTab('activas');
    const orderDespues = DB.tpvOrders.find(o=>o.id===id);
    return {cerradaAntes, btnEnCerradas, cerradaDespues: orderDespues.cerrada};
  }, orderId);
  assert.ok(r.cerradaAntes, 'debe haberse cerrado al completar el último paso: ' + JSON.stringify(r));
  assert.ok(r.btnEnCerradas, 'el botón de retroceder debe verse también en la pestaña Cerradas: ' + JSON.stringify(r));
  assert.ok(!r.cerradaDespues, 'debe reabrirse al retroceder: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
