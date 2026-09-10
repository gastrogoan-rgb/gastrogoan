// Comandas Cocina: menú/carta en BLOQUES separados (9/09, cuarta vuelta).
//   1ª vuelta: dejó de repetirse por PLATO (se subió a la tanda).
//   2ª vuelta: con un solo menú en el pedido, tampoco se repetía por TANDA
//      (subía al ticket entero).
//   3ª vuelta (esta): el dueño pidió ir más allá de "no repetir el nombre"
//      — quería los platos AGRUPADOS: primero todo lo de la Carta junto,
//      después cada menú junto (no mezclado por tandas sueltas). Ahora cada
//      pedido se divide en bloques (Carta primero, luego cada menú), cada
//      uno con su propia cabecera y, dentro, sus tandas si las tiene.
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
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'COCBLOQUES1');
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
await caso('Con un solo menú (3 tandas) y una carta suelta, salen dos bloques bien separados: Carta y Menú, cada uno UNA vez', async () => {
  const r = await page.evaluate(()=>{
    DB.tables.push({id:1, name:'Mesa 7', zona:'Salón', plazas:4});
    const menuA = genId();
    DB.menus.push({id: menuA, nombre:'Menú del día', precio:15, ivaPct:10, secciones:[]});
    const platoId1 = genId(), platoId2 = genId();
    DB.cartas.push({id: genId(), nombre:'Carta principal', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[
      {id: genId(), nombre:'Entrantes', platos:[
        {id: platoId1, recipeId:null, nombre:'Jamón ibérico', precio:18, disponible:true, modificadores:[]},
        {id: platoId2, recipeId:null, nombre:'Croquetas', precio:9, disponible:true, modificadores:[]},
      ]}
    ]});
    DB.tpvOrders.push({
      id: genId(), tipo:'mesa', tableId:1, status:'abierta', cerrada:false, area:'cocina', pax:4,
      items:[
        {name:'Jamón ibérico', qty:1, estado:'cocina', bebida:false, tanda:'', platoId: platoId1},
        {name:'Croquetas', qty:1, estado:'cocina', bebida:false, tanda:'', platoId: platoId2},
        {name:'Ensalada', qty:1, estado:'cocina', bebida:false, tanda:'Primero', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Bistec', qty:1, estado:'cocina', bebida:false, tanda:'Segundos', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Flan', qty:1, estado:'cocina', bebida:false, tanda:'Postres', menuId:menuA, notas:'Menú: Menú del día'},
      ],
    });
    saveDB();
    navigate('comandascocina');
    const box = document.getElementById('comandascocina-content');
    const card = [...box.querySelectorAll('.card')].find(c => c.textContent.includes('Mesa 7'));
    const html = card.innerHTML;
    const contar = (h, s) => h.split(s).length - 1;
    return {
      vecesCarta: contar(html, 'Carta principal'),
      vecesMenu: contar(html, 'Menú del día'),
      cartaAntesQueMenu: html.indexOf('Carta principal') < html.indexOf('Menú del día'),
      llevaJamon: html.includes('Jamón ibérico'),
      llevaCroquetas: html.includes('Croquetas'),
      llevaEnsalada: html.includes('Ensalada'),
    };
  });
  assert.equal(r.vecesCarta, 1, '"Carta principal" debe salir UNA vez (cabecera del bloque), no repetida por plato: ' + JSON.stringify(r));
  assert.equal(r.vecesMenu, 1, '"Menú del día" debe salir UNA vez para todo el bloque, no una vez por cada una de sus 3 tandas: ' + JSON.stringify(r));
  assert.ok(r.cartaAntesQueMenu, 'el bloque de Carta debe ir ANTES que el de Menú: ' + JSON.stringify(r));
  assert.ok(r.llevaJamon && r.llevaCroquetas && r.llevaEnsalada, 'deben verse los platos de los dos bloques: ' + JSON.stringify(r));
});

await caso('Con DOS menús distintos mezclados, cada uno tiene su propio bloque y sus platos quedan agrupados dentro (no repartidos)', async () => {
  const r = await page.evaluate(()=>{
    DB.tables.push({id:2, name:'Mesa 8', zona:'Salón', plazas:4});
    const menuA = genId(), menuB = genId();
    DB.menus.push({id: menuA, nombre:'Menú del día', precio:15, ivaPct:10, secciones:[]});
    DB.menus.push({id: menuB, nombre:'Menú degustación', precio:35, ivaPct:10, secciones:[]});
    DB.tpvOrders.push({
      id: genId(), tipo:'mesa', tableId:2, status:'abierta', cerrada:false, area:'cocina', pax:4,
      items:[
        {name:'Ensalada', qty:1, estado:'cocina', bebida:false, tanda:'Primero', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Bistec', qty:1, estado:'cocina', bebida:false, tanda:'Segundos', menuId:menuA, notas:'Menú: Menú del día'},
        {name:'Foie', qty:1, estado:'cocina', bebida:false, tanda:'Degustación', menuId:menuB, notas:'Menú: Menú degustación'},
        {name:'Solomillo Wellington', qty:1, estado:'cocina', bebida:false, tanda:'Degustación', menuId:menuB, notas:'Menú: Menú degustación'},
      ],
    });
    saveDB();
    navigate('comandascocina');
    const box = document.getElementById('comandascocina-content');
    const card = [...box.querySelectorAll('.card')].find(c => c.textContent.includes('Mesa 8'));
    const html = card.innerHTML;
    const contar = (h, s) => h.split(s).length - 1;
    // Todo lo de "Menú del día" (cabecera + Ensalada + Bistec) debe quedar
    // ANTES de que empiece el bloque de "Menú degustación" — si estuvieran
    // mezclados por tanda como antes, "Ensalada" y "Foie" podrían
    // intercalarse en cualquier orden.
    const posMenuDia = html.indexOf('Menú del día');
    const posMenuDegustacion = html.indexOf('Menú degustación');
    const posEnsalada = html.indexOf('Ensalada');
    const posBistec = html.indexOf('Bistec');
    const posFoie = html.indexOf('Foie');
    return {
      vecesMenuDia: contar(html, 'Menú del día'),
      vecesDegustacion: contar(html, 'Menú degustación'),
      bloqueDelDiaCompletoAntes: posMenuDia < posEnsalada && posEnsalada < posMenuDegustacion && posBistec < posMenuDegustacion,
      foieDespues: posFoie > posMenuDegustacion,
    };
  });
  assert.equal(r.vecesMenuDia, 1, '"Menú del día" una vez (cabecera del bloque): ' + JSON.stringify(r));
  assert.equal(r.vecesDegustacion, 1, '"Menú degustación" una vez: ' + JSON.stringify(r));
  assert.ok(r.bloqueDelDiaCompletoAntes, 'Ensalada y Bistec (del Menú del día) deben quedar juntos, antes del bloque de Degustación: ' + JSON.stringify(r));
  assert.ok(r.foieDespues, 'Foie (Degustación) debe quedar después del bloque de Menú del día, no intercalado: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
