// Comandas Cocina (7/11, pedido del dueño): 1) nada de Sala/bebidas mezclado, 2) el NOMBRE del bloque avanza el
// bloque entero (cada plato sigue avanzando solo), 3) ya no hay botón grande de pase, 4) cada comanda con borde.
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
}, 'COCINACOM1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
});
await page.evaluate(()=>{
  DB.tables = [{id:1, name:'Mesa 1', pax:4, zona:'Salón', area:'sala'}];
  DB.cartas = [
    {id:1, nombre:'Carta principal', area:'cocina', activa:true, secciones:[{id:11, nombre:'Entrantes', platos:[{id:111, nombre:'Croquetas', allergensManual:['Gluten']},{id:112, nombre:'Ensalada', allergensManual:[]}]}]},
    {id:2, nombre:'Bebidas', area:'sala', activa:true, secciones:[{id:21, nombre:'Cócteles', platos:[{id:211, nombre:'Mojito', allergensManual:['Sulfitos']}]}]}
  ];
  const L = (n, platoId, extra) => Object.assign({platoId, recipeId:null, name:n, price:9, qty:1, tanda:'Entrantes', notas:'', estado:'cocina',
    enviadoAt:new Date(Date.now()-4*60000).toISOString(), bebida:false, modificadores:[], vale:1}, extra||{});
  DB.tpvOrders = [{id:901, tableId:1, tipo:'mesa', pax:4, status:'abierta', createdAt:new Date().toISOString(), valeActual:1, items:[
    L('Croquetas',111), L('Ensalada',112),
    L('Mojito',211,{tanda:'Bebidas'}),                         // una línea de Sala SIN la marca de bebida (líneas antiguas)
    L('Caña',null,{bebida:true, tanda:'Bebidas'})]}];
  saveDB(); currentFolder='cocina'; chaosCocina=false; navigate('comandascocina');
});
await new Promise(r=>setTimeout(r,700));

await caso('Cocina no enseña ninguna bebida, ni la que perdió su marca', async () => {
  const txt = await page.evaluate(()=>document.getElementById('comandascocina-content').innerText);
  assert.ok(/Croquetas/.test(txt) && /Ensalada/.test(txt), 'los platos de cocina están');
  assert.ok(!/Mojito|Caña/.test(txt), 'ni rastro de las bebidas: ' + txt);
});
await caso('El aviso de alergias solo lleva las de cocina (las del mojito no)', async () => {
  const al = await page.evaluate(()=>(document.querySelector('.kt-alergia')||{}).innerText||'');
  assert.ok(/gluten/i.test(al), 'gluten de las croquetas: ' + al);
  assert.ok(!/sulfito/i.test(al), 'sin los sulfitos de la bebida: ' + al);
});
await caso('Ya no existe el botón grande de pase', async () => {
  assert.equal(await page.evaluate(()=>document.querySelectorAll('.kt-big').length), 0);
});
await caso('Cada comanda lleva un borde marcado (≥2 px)', async () => {
  const b = await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.kt')).borderTopWidth));
  assert.ok(b >= 2, 'borde de ' + b);
});
await caso('Un plato avanza SOLO él', async () => {
  const r = await page.evaluate(async ()=>{
    document.querySelector('.kt-pl.avanza').click();
    await new Promise(r=>setTimeout(r,300));
    return DB.tpvOrders[0].items.map(l => l.estado);
  });
  assert.equal(r[0], 'preparando'); assert.equal(r[1], 'cocina', JSON.stringify(r));
});
await caso('El nombre del bloque avanza TODO el bloque; las bebidas no se tocan', async () => {
  const r = await page.evaluate(async ()=>{
    const b = document.querySelector('button.kt-cn.avanza');
    if(!b) return {sinBoton:true};
    b.click();
    await new Promise(r=>setTimeout(r,300));
    return DB.tpvOrders[0].items.map(l => l.estado);
  });
  assert.ok(!r.sinBoton, 'hay botón en el nombre del bloque');
  // la croqueta estaba en preparación → entregado; la ensalada en cocina → preparando
  assert.equal(r[0], 'entregado'); assert.equal(r[1], 'preparando', JSON.stringify(r));
  assert.equal(r[2], 'cocina', 'la bebida sin marca no se mueve: ' + JSON.stringify(r));
});
await caso('«Recogido» lo marca COCINA: con el bloque listo en el pase, su nombre pasa a ser el botón; Sala solo lo ve («Listo en el pase»)', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const o = DB.tpvOrders[0];
    o.items.forEach(l => { if(!esLineaDeBebida(l) && l.estado){ l.estado = 'entregado'; l.entregadoAt = new Date().toISOString(); delete l.recogidoAt; } });
    saveDB(); renderComandasCocina(); await esp(300);
    const boton = document.querySelector('button.kt-cn.recoge');
    const out = {boton: !!boton, texto: boton ? boton.textContent.replace(/\s+/g,' ').trim() : ''};
    // Sala: ningún botón de entregar/recogido, solo el aviso
    currentFolder = 'sala'; navigate('tpv'); openTableOrder(1, o.id); await esp(350);
    out.salaBotones = [...document.querySelectorAll('.tp-tanda-bt')].filter(b => /Entregar|Recoger|Hand over|Lliurar/i.test(b.textContent)).length;
    out.salaAviso = /Listo en el pase/i.test(document.getElementById('modal-box')?.textContent || ''); out.salaTxt = (document.getElementById('modal-box')?.textContent || '').replace(/\s+/g,' ').slice(0,300);
    closeModal(); currentFolder = 'cocina'; navigate('comandascocina'); await esp(400);
    for(const b of [...document.querySelectorAll('button.kt-cn.recoge')]){ b.click(); await esp(250); }
    out.recogidas = o.items.filter(l => !esLineaDeBebida(l) && l.estado === 'entregado').every(l => l.recogidoAt);
    out.cerrada = !!o.cerrada;
    return out;
  });
  assert.ok(r.boton && /recogido/i.test(r.texto), JSON.stringify(r)); assert.equal(r.salaBotones, 0, 'Sala ya no tiene botón de entregar: ' + JSON.stringify(r)); assert.ok(r.salaAviso, JSON.stringify(r));
  assert.ok(r.recogidas && r.cerrada, 'Cocina lo marca y la comanda se cierra: ' + JSON.stringify(r));
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(erroresJs, []); });

console.log('\n' + '═'.repeat(70)); console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
