// Un vale nuevo cada vez que la mesa pide otra vez (29/10, pedido del dueño) y la cabecera de la carta
// en verde igual que la del menú. Cada línea lleva su número de vale; cocina pinta un ticket por vale.
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
}, 'VALESCOCI');
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

await caso('Lo que se apunta en la misma toma de comanda va en el MISMO vale, aunque el primero ya se haya marchado', async () => {
  const r = await page.evaluate(()=>{
    const o = {id:1, items:[], valeActual:undefined};
    const v1 = valeParaNuevaLinea(o);
    o.items.push({name:'A', estado:'cocina', vale:v1});          // el primero se marcha solo
    const v2 = valeParaNuevaLinea(o);                              // se apunta otro al instante
    return {v1, v2};
  });
  assert.equal(r.v1, 1); assert.equal(r.v2, 1, 'sigue siendo el vale 1: ' + JSON.stringify(r));
});

await caso('Si piden otra vez pasados 8 minutos, entra un vale NUEVO', async () => {
  const r = await page.evaluate(()=>{
    const o = {id:2, items:[], ultimaAdicion:null};
    const v1 = valeParaNuevaLinea(o);
    o.items.push({name:'A', estado:'cocina', vale:v1});
    o.ultimaAdicion = new Date(Date.now() - 20*60000).toISOString();   // hace 20 min de lo último apuntado
    const v2 = valeParaNuevaLinea(o);
    o.items.push({name:'B', estado:null, vale:v2});
    const v3 = valeParaNuevaLinea(o);                                   // y lo siguiente, ya en el vale 2
    return {v1, v2, v3};
  });
  assert.equal(r.v2, 2, 'otra vez = vale 2: ' + JSON.stringify(r));
  assert.equal(r.v3, 2, 'lo que siga en esa toma se queda en el 2: ' + JSON.stringify(r));
});

await caso('Sin nada marchado, aunque pase el tiempo, se sigue en el mismo vale', async () => {
  const v = await page.evaluate(()=>{
    const o = {id:3, items:[{name:'A', estado:null, vale:1}], ultimaAdicion:new Date(Date.now()-30*60000).toISOString()};
    return valeParaNuevaLinea(o);
  });
  assert.equal(v, 1);
});

const seed = () => page.evaluate(()=>{
  DB.tables = [{id:1, name:'Mesa 1', pax:4, zona:'Salón', area:'sala'}];
  DB.menus = [{id:7, nombre:'Menú del día', area:'cocina', grupos:[], precio:15, ivaPct:10, secciones:[]}];
  DB.cartas = [{id:1, nombre:'Carta principal', area:'cocina', activa:true, secciones:[{id:11, nombre:'Entrantes', platos:[{id:111, nombre:'Croquetas'}]}]}];
  const L = (n, estado, min, vale, extra) => Object.assign({platoId:111, recipeId:null, name:n, price:9, qty:1, tanda:'Entrantes', notas:'',
    estado, enviadoAt: new Date(Date.now()-min*60000).toISOString(), bebida:false, modificadores:[], vale}, extra||{});
  DB.tpvOrders = [
    {id:901, tableId:1, tipo:'mesa', pax:4, status:'abierta', createdAt:new Date().toISOString(), valeActual:2, items:[
      L('Croquetas','cocina',25,1), L('Menú plato','cocina',3,2,{menuId:7, platoId:null, tanda:'Primeros', notas:'Menú: Menú del día'}), L('Croquetas bis','cocina',3,2)]},
  ];
  saveDB(); currentFolder='cocina'; chaosCocina=false; navigate('comandascocina');
});
await seed();
await new Promise(r=>setTimeout(r,700));

await caso('Cocina pinta UN ticket por vale: la misma mesa sale dos veces, con su número de vale', async () => {
  const r = await page.evaluate(()=>[...document.querySelectorAll('.kt:not(.cz-mesa)')].map(t => ({mesa: t.querySelector('.kt-mesa').childNodes[0].textContent.trim(), vale: t.dataset.vale, etiqueta: (t.querySelector('.kt-vale')||{}).innerText||''})));
  assert.equal(r.length, 2, 'dos tickets: ' + JSON.stringify(r));
  assert.deepEqual(r.map(x => x.vale).sort(), ['1','2'], JSON.stringify(r));
  assert.ok(r.every(x => x.mesa === 'Mesa 1' && /vale/i.test(x.etiqueta)), 'con la etiqueta «Vale N»: ' + JSON.stringify(r));
});

await caso('El botón grande de un vale solo mueve SUS platos, no los del otro vale', async () => {
  const r = await page.evaluate(async ()=>{
    const t2 = document.querySelector('.kt[data-vale="2"]');
    t2.querySelector('.kt-big').click();
    await new Promise(r=>setTimeout(r,300));
    return DB.tpvOrders[0].items.map(l => l.estado);
  });
  assert.equal(r[0], 'cocina', 'el vale 1 no se toca: ' + JSON.stringify(r));
  assert.ok(r.slice(1).some(e => e === 'preparando'), 'el vale 2 avanza: ' + JSON.stringify(r));
});

await caso('Un pedido con un solo vale no enseña etiqueta de vale', async () => {
  const n = await page.evaluate(()=>{
    DB.tpvOrders[0].items.forEach(l => l.vale = 1); saveDB(); renderComandasCocina();
    return document.querySelectorAll('.kt-vale').length;
  });
  assert.equal(n, 0);
});

await caso('La cabecera de la CARTA es verde igual que la del MENÚ', async () => {
  await page.evaluate(()=>{ DB.tpvOrders[0].items.forEach(l => l.vale = 1); saveDB(); renderComandasCocina(); });
  const r = await page.evaluate(()=>{
    const c = document.querySelector('.kt-bh.c'), m = document.querySelector('.kt-bh.m');
    return {c: c && getComputedStyle(c).backgroundColor, m: m && getComputedStyle(m).backgroundColor, cTxt: c && c.innerText, mTxt: m && m.innerText};
  });
  assert.ok(r.c && r.m, 'tiene que haber un bloque de carta y uno de menú: ' + JSON.stringify(r));
  assert.equal(r.c, r.m, 'mismo verde: ' + JSON.stringify(r));
  assert.ok(/carta/i.test(r.cTxt) && /men/i.test(r.mTxt), 'y cada uno dice lo que es: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
