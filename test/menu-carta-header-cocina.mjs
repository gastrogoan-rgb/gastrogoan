// Lo mismo que ya se arregló en Sala, pero en Comandas Cocina, que es la
// pantalla que de verdad usa el equipo de cocina (9/09, segunda vuelta: la
// primera solo tocó renderTandaGroupCard de Sala, y el dueño seguía viendo
// "MENÚ: X" repetido en Cocina, que es otra función distinta).
// Ahora, si toda una tanda es del mismo menú (o de la misma carta), se dice
// una vez en la cabecera del grupo — con dos menús y varias tandas, cada
// menú se distingue con su propia etiqueta en cada tanda que le toca.
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
}, 'COCMENUCARTA1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('En Comandas Cocina, dos menús con varias tandas cada uno dicen su nombre UNA vez por tanda', async () => {
  const r = await page.evaluate(()=>{
    DB.tables.push({id:1, name:'Mesa 4', zona:'Salón', plazas:4});
    const menuA = genId(), menuB = genId();
    DB.menus.push({id: menuA, nombre:'Menú del día', precio:15, ivaPct:10, secciones:[]});
    DB.menus.push({id: menuB, nombre:'Menú degustación', precio:35, ivaPct:10, secciones:[]});
    DB.tpvOrders.push({
      id: genId(), tipo:'mesa', tableId:1, status:'abierta', cerrada:false, area:'cocina', pax:4,
      items:[
        {name:'Ensalada', qty:1, estado:'cocina', bebida:false, tanda:'Primero (Menú del día)', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Bistec con patatas', qty:1, estado:'cocina', bebida:false, tanda:'Segundos (Menú del día)', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Foie', qty:1, estado:'cocina', bebida:false, tanda:'Degustación', menuId:menuB, notas:'Menú: Menú degustación'},
        {name:'Solomillo Wellington', qty:1, estado:'cocina', bebida:false, tanda:'Degustación', menuId:menuB, notas:'Menú: Menú degustación'},
      ],
    });
    saveDB();
    navigate('comandascocina');
    const box = document.getElementById('comandascocina-content');
    const badgesMenuDia = [...box.querySelectorAll('.badge.badge-purple')].filter(b => b.textContent.includes('Menú del día'));
    const badgesDegustacion = [...box.querySelectorAll('.badge.badge-purple')].filter(b => b.textContent.includes('Menú degustación'));
    return {badgesMenuDia: badgesMenuDia.length, badgesDegustacion: badgesDegustacion.length};
  });
  // "Menú del día" tiene 2 tandas (Primero y Segundos), cada una con su
  // propia cabecera — eso está BIEN, una tanda es un grupo real (curso
  // distinto). Lo que no debe pasar es más de un badge por tanda.
  assert.equal(r.badgesMenuDia, 2, 'debe salir "Menú del día" una vez por cada una de sus 2 tandas (Primero y Segundos), no menos ni más: ' + JSON.stringify(r));
  assert.equal(r.badgesDegustacion, 1, 'debe salir "Menú degustación" una sola vez para los 2 platos de su tanda, no repetido: ' + JSON.stringify(r));
});

await caso('3 platos sueltos de la misma Carta en una tanda dicen el nombre de la carta UNA vez, no por plato', async () => {
  const r = await page.evaluate(()=>{
    const platoId1 = genId(), platoId2 = genId(), platoId3 = genId();
    DB.cartas.push({id: genId(), nombre:'Carta principal', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[
      {id: genId(), nombre:'Entrantes', platos:[
        {id: platoId1, recipeId:null, nombre:'Jamón ibérico', precio:18, disponible:true, modificadores:[]},
        {id: platoId2, recipeId:null, nombre:'Pulpo a la gallega', precio:16, disponible:true, modificadores:[]},
        {id: platoId3, recipeId:null, nombre:'Croquetas caseras', precio:9, disponible:true, modificadores:[]},
      ]}
    ]});
    const order = DB.tpvOrders[DB.tpvOrders.length-1];
    order.items.push(
      {name:'Jamón ibérico', qty:1, estado:'cocina', bebida:false, tanda:'Carta', platoId: platoId1},
      {name:'Pulpo a la gallega', qty:1, estado:'cocina', bebida:false, tanda:'Carta', platoId: platoId2},
      {name:'Croquetas caseras', qty:1, estado:'cocina', bebida:false, tanda:'Carta', platoId: platoId3},
    );
    saveDB();
    navigate('comandascocina');
    const box = document.getElementById('comandascocina-content');
    const badgesCarta = [...box.querySelectorAll('.badge.badge-blue')].filter(b => b.textContent.includes('Carta principal'));
    return {badgesCarta: badgesCarta.length};
  });
  assert.equal(r.badgesCarta, 1, 'debe salir "Carta principal" una sola vez para los 3 platos, no 3 veces: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
