// Lo que vio el dueño grabando el vídeo de demo el 12/09 — cinco cosas que
// solo se ven usando la app con un negocio lleno, no con datos de prueba:
// un pedido sin el precio delante, cientos de registros APPCC en pantalla,
// un botón que se salía de su tarjeta, tickets de cocina que no se
// distinguían entre sí, y el botón "Otro" de la propina, que no hacía nada.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
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
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'VIDEO1209');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Al pedir a proveedor, cada artículo dice su precio, no solo el stock', async () => {
  const fila = await page.evaluate(async ()=>{
    DB.suppliers = [{id: 9101, name:'Proveedor Prueba', diasEntrega:[], area:'cocina'}];
    DB.ingredients = [{id: 9201, name:'Aceite de girasol', unit:'L', price: 2.45,
      supplier:'Proveedor Prueba', supplierId: 9101, category:'Aceites', area:'cocina'}];
    DB.stock = [{ingredientId: 9201, qty: 12, min: 5}];
    saveDB();
    navigate('pedidos'); pedidosTab = 'crear'; renderPedidos();
    await new Promise(r=>setTimeout(r,400));
    const sel = document.querySelector('#view-pedidos select');
    sel.value = 'Proveedor Prueba';
    sel.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,400));
    const f = document.querySelector('.list-row');
    return f ? f.innerText : '';
  });
  assert.ok(/Aceite de girasol/.test(fila), 'debería listar el artículo del proveedor: ' + fila);
  // 2,45 €/L — el precio del ingrediente, junto a su unidad de compra.
  assert.ok(/2[,.]45/.test(fila), 'la fila debe llevar el precio del ingrediente: ' + fila);
  assert.ok(/\/L/.test(fila), 'el precio va por unidad de compra: ' + fila);
});

await caso('APPCC: solo los diez últimos registros, con botón para ver el resto', async () => {
  const r = await page.evaluate(async ()=>{
    DB.limpieza.temperaturas = Array.from({length: 26}, (_, i) => ({
      id: 7000 + i, fecha:'2026-09-01', hora:'10:00', tipo:'nevera', temp: String(3 + i%3),
      estado:'OK', responsable:'Prueba', zona:'cocina',
    }));
    saveDB();
    navigate('limpieza'); setLimpiezaTab('temperaturas');
    await new Promise(r=>setTimeout(r,500));
    const filas = document.querySelectorAll('#limpieza-tab-content tbody tr').length;
    const btn = [...document.querySelectorAll('#limpieza-tab-content button')]
      .find(b => /26/.test(b.innerText));
    if(btn) btn.click();
    await new Promise(r=>setTimeout(r,400));
    return {filas, textoBoton: btn ? btn.innerText.trim() : '', filasTodo: document.querySelectorAll('#limpieza-tab-content tbody tr').length};
  });
  assert.equal(r.filas, 10, 'de entrada solo se ven los diez últimos: ' + JSON.stringify(r));
  assert.ok(r.textoBoton, 'debe haber un botón para ver todos los registros');
  assert.equal(r.filasTodo, 26, 'al pulsarlo se ven todos: ' + JSON.stringify(r));
  // Y lo que NO puede pasar: que "ver solo los últimos" haya borrado nada.
  const guardados = await page.evaluate(()=>DB.limpieza.temperaturas.length);
  assert.equal(guardados, 26, 'ocultar filas no puede borrar registros APPCC');
});

await caso('Promoción → Clientes: los botones no se salen de la tarjeta', async () => {
  const desbordes = await page.evaluate(async ()=>{
    DB.clients = [{id: 9301, name:'Cliente Prueba', phone:'600111222', email:'cliente@ejemplo.com',
      cumpleanos:'1990-09-15', ultimoContacto: todayStr(), marketingConsent:true}];
    saveDB();
    currentFolder = 'sala'; navigate('promocion'); promoTab = 'clientes'; renderPromocion();
    await new Promise(r=>setTimeout(r,500));
    return [...document.querySelectorAll('#promo-tab-content *')]
      .filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2)
      .map(e => (e.innerText||'').slice(0,40));
  });
  assert.deepEqual(desbordes, [], 'nada puede desbordar su caja: ' + JSON.stringify(desbordes));
});

await caso('Comandas Cocina: cada ticket se distingue del de al lado', async () => {
  const r = await page.evaluate(async ()=>{
    const linea = n => ({platoId:null, recipeId:null, name:'Plato '+n, price:10, qty:1, tanda:'', notas:'',
      estado:'cocina', enviadoAt: new Date().toISOString(), bebida:false, modificadores:[]});
    DB.tpvOrders = [1,2,3].map(i => ({id: 9400+i, status:'abierta', tipo:'mesa', tableId:null,
      pax:2, items:[linea(i)], createdAt:new Date().toISOString()}));
    saveDB();
    currentFolder = 'cocina'; navigate('comandascocina');
    await new Promise(r=>setTimeout(r,500));
    const tickets = [...document.querySelectorAll('.kds-ticket')];
    if(!tickets.length) return {tickets: 0};
    const cs = getComputedStyle(tickets[0]);
    return {
      tickets: tickets.length,
      borde: parseFloat(cs.borderTopWidth),
      cabeceras: document.querySelectorAll('.kds-ticket > .kds-head').length,
    };
  });
  assert.equal(r.tickets, 3, 'los tres pedidos deben verse: ' + JSON.stringify(r));
  // Un borde de 1 px del mismo gris que todo lo demás era justo el problema.
  assert.ok(r.borde >= 2, 'el borde del ticket tiene que marcarse: ' + JSON.stringify(r));
  assert.equal(r.cabeceras, 3, 'cada ticket lleva su cabecera con fondo: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

// ── La web pública: el botón "Otro" de la propina ─────────────────────────
const pub = await browser.newPage();
await pub.setViewport({width:420, height:900});
const erroresPub = [];
pub.on('pageerror', e => erroresPub.push(e.message));
await pub.setRequestInterception(true);
pub.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await pub.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1200));

await caso('Web pública: "Otro" abre el campo de la propina y la suma al total', async () => {
  const r = await pub.evaluate(async ()=>{
    // Sin tocar la red: se inyecta a mano lo que dejaría loadBusinessInfo().
    // `DB` es una variable del módulo, no window.DB: se rellena imitando lo
    // que dejaría loadBusinessInfo(), sin tocar la red ni Firebase.
    DB = {
      business:{name:'Prueba', tiposServicio:{mesa:true,takeaway:true,delivery:true}},
      cartas:[{id:1, nombre:'Carta', activa:true, secciones:[
        {id:1, nombre:'Platos', platos:[{id:1, nombre:'Plato', precio:10, disponible:true}]},
      ]}],
      activeCartaIds:[1], menus:[], allergens:{},
    };
    if(!document.getElementById('tab-content')){
      const d = document.createElement('div'); d.id = 'tab-content'; document.body.appendChild(d);
    }
    // Se pinta directamente el formulario de Take Away: renderApp() volvería
    // a pasar por la carga del negocio, que aquí no existe (sin red).
    currentTab = 'takeaway';
    renderTabContent();
    await new Promise(r=>setTimeout(r,400));
    cart = [{platoId: 1, name:'Plato', price: 10, qty: 2, modificadores:[]}];
    cartTipPct = 0; cartTipCustom = 0;
    const box = document.getElementById('cart-summary');
    if(!box) return {sinCarrito:true, html: document.getElementById('tab-content').innerHTML.slice(0,300)};
    renderCartSummary();
    const btn = [...box.querySelectorAll('button')].find(b => b.innerText.trim() === t('cart.tip.other'));
    if(!btn) return {sinBoton:true};
    btn.click();
    await new Promise(r=>setTimeout(r,200));
    const input = document.getElementById('tip-custom-input');
    if(!input) return {sinCampo:true};
    setTipCustom('3');
    await new Promise(r=>setTimeout(r,200));
    return {campo: true, propina: computeTipAmount(20), texto: box.innerText};
  });
  assert.ok(!r.sinCarrito && !r.sinBoton, 'debe existir el botón de propina "Otro": ' + JSON.stringify(r));
  // Era exactamente esto: pulsarlo no pintaba el campo, así que no pasaba nada.
  assert.ok(r.campo, 'pulsar "Otro" tiene que abrir el campo del importe: ' + JSON.stringify(r));
  assert.equal(r.propina, 3, 'el importe escrito es la propina: ' + JSON.stringify(r));
  assert.ok(/23/.test(r.texto.replace(/\s/g,'')), 'y se suma al total (20 + 3): ' + r.texto.slice(0,200));
});

await caso('Ningún error de JavaScript en la web pública', async () => {
  assert.deepEqual(erroresPub, [], 'errores: ' + erroresPub.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
