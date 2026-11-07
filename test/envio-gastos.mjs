// El coste de envío de un pedido a proveedor llega a Gastos con su IVA (7/11): antes se anotaba SIN IVA y el transporte
// (21 %) nunca llegaba al 303. Y el total del pedido lo suma.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const erroresJs = []; page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'ENVIOGASTO');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  DB.providers = [{id:1, nombre:'Pescados Martínez', area:'cocina', envioTipo:'fijo', envioCoste:10, tipo:'Pescados'},
                  {id:2, nombre:'Verduras Rosa', area:'cocina', envioTipo:'fijo', envioCoste:10, envioIva:10}];
  DB.ingredients = [{id:1, name:'Merluza', category:'Pescados', unit:'kg', supplier:'Pescados Martínez', price:10, iva:10, area:'cocina'},
                    {id:2, name:'Tomate', category:'Verduras', unit:'kg', supplier:'Verduras Rosa', price:2, iva:4, area:'cocina'}];
  DB.ge.variables = [];
});
await caso('Un proveedor sin IVA de envío puesto usa el 21 %, y el que lo tiene usa el suyo', async () => {
  const r = await page.evaluate(()=>[providerShippingIvaPct(DB.providers[0]), providerShippingIvaPct(DB.providers[1])]);
  assert.deepEqual(r, [21, 10]);
});
await caso('Al recibir el pedido, el envío entra en Gastos con su IVA (21 %) y marcado como envío', async () => {
  const r = await page.evaluate(()=>{
    const o = {id:77, supplier:'Pescados Martínez', estado:'RECIBIDO', date:todayStr(), items:[{ingredientId:1, cantidad:3, cantidadRecibida:3, precioCompra:10, recibidoCheck:true}]};
    DB.purchaseOrders = [o];
    registerPedidoComoGastoVariable(o);
    return DB.ge.variables.filter(v => v.pedidoId === 77).map(v => ({cat:v.categoria, imp:v.importe, iva:v.iva, envio:!!v.envio}));
  });
  const env = r.find(x => x.envio);
  assert.ok(env, JSON.stringify(r)); assert.equal(env.imp, 10); assert.equal(env.iva, 21);
  assert.ok(r.some(x => !x.envio && x.imp === 30 && x.iva === 10), 'y la mercancía, aparte, con el suyo: ' + JSON.stringify(r));
});
await caso('El formulario del proveedor lo ofrece y lo guarda', async () => {
  await page.evaluate(()=>openProviderModal(2));
  await new Promise(r=>setTimeout(r,300));
  const v = await page.evaluate(()=>document.getElementById('prov-envio-iva').value);
  assert.equal(v, '10');
  await page.evaluate(()=>{ document.getElementById('prov-envio-iva').value = '0'; saveProvider(2); });
  await new Promise(r=>setTimeout(r,400));
  assert.equal(await page.evaluate(()=>DB.providers.find(p => p.id === 2).envioIva), 0);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(erroresJs, []); });
console.log('\n' + '═'.repeat(70)); console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
