// Sala (renderOrderComandaPanel/renderTandaGroupCard): el nombre del menú
// se dice una vez, en la cabecera de SU BLOQUE, no en cada tanda ni en cada
// plato (9/09, con el mismo criterio que ya se aplicó en Comandas Cocina).
// Un menú de 3 platos en 3 tandas (Primero/Segundos/Postres) ya no repite
// "Menú: X" ni por plato ni por tanda: sale una vez, arriba del bloque
// entero. Y si hay dos menús distintos, cada uno tiene su PROPIO bloque —
// ya no hace falta un badge por línea para distinguirlos, porque nunca
// comparten grupo.
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
}, 'MENUHEAD1');
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

await caso('Un menú de 3 platos en 3 tandas distintas dice su nombre UNA vez para todo el bloque, no por tanda ni por plato', async () => {
  const r = await page.evaluate(()=>{
    const menuId = genId();
    DB.menus.push({id: menuId, nombre:'Menú del día', precio:15, ivaPct:10, secciones:[]});
    const order = {
      id: genId(), tableId:1, status:'abierta', pax:2, tandas:['Primero','Segundos','Postres'],
      items:[
        {name:'Ensalada', qty:1, price:0, menuId, tanda:'Primero', notas:'Menú: Menú del día'},
        {name:'Bistec con patatas', qty:1, price:0, menuId, tanda:'Segundos', notas:'Menú: Menú del día'},
        {name:'Flan', qty:1, price:0, menuId, tanda:'Postres', notas:'Menú: Menú del día'},
      ],
    };
    const html = renderOrderComandaPanel(order);
    document.body.insertAdjacentHTML('beforeend', `<div id="test-panel">${html}</div>`);
    const box = document.getElementById('test-panel');
    const veces = box.innerHTML.split('Menú del día').length - 1;
    const notasVisibles = [...box.querySelectorAll('div')].filter(d => (d.textContent||'').trim() === 'Menú: Menú del día');
    const llevaLosTres = ['Ensalada','Bistec con patatas','Flan'].every(n => box.textContent.includes(n));
    box.remove();
    return {veces, notasVisiblesCount: notasVisibles.length, llevaLosTres};
  });
  assert.equal(r.veces, 1, 'debe salir "Menú del día" UNA vez para todo el bloque (cabecera), ni por tanda ni por plato: ' + JSON.stringify(r));
  assert.equal(r.notasVisiblesCount, 0, 'la nota autogenerada no debe repetirse debajo de cada plato: ' + JSON.stringify(r));
  assert.ok(r.llevaLosTres, 'los 3 platos deben seguir viéndose, agrupados dentro del bloque: ' + JSON.stringify(r));
});

await caso('Dos menús distintos con la misma tanda tienen cada uno su propio bloque, sin mezclarse', async () => {
  const r = await page.evaluate(()=>{
    const menuA = genId(), menuB = genId();
    DB.menus.push({id: menuA, nombre:'Menú A', precio:12, ivaPct:10, secciones:[]});
    DB.menus.push({id: menuB, nombre:'Menú B', precio:14, ivaPct:10, secciones:[]});
    const order = {
      id: genId(), tableId:1, status:'abierta', pax:2, tandas:['Primero'],
      items:[
        {name:'Sopa', qty:1, price:0, menuId: menuA, tanda:'Primero', notas:'Menú: Menú A'},
        {name:'Gazpacho', qty:1, price:0, menuId: menuB, tanda:'Primero', notas:'Menú: Menú B'},
      ],
    };
    const html = renderOrderComandaPanel(order);
    document.body.insertAdjacentHTML('beforeend', `<div id="test-panel2">${html}</div>`);
    const box = document.getElementById('test-panel2');
    const posA = box.innerHTML.indexOf('Menú A');
    const posB = box.innerHTML.indexOf('Menú B');
    const posSopa = box.innerHTML.indexOf('Sopa');
    const posGazpacho = box.innerHTML.indexOf('Gazpacho');
    box.remove();
    // La Sopa (Menú A) debe quedar dentro del rango del bloque de Menú A
    // (entre la cabecera "Menú A" y la de "Menú B"), y el Gazpacho después.
    return {ordenCorrecto: posA < posSopa && posSopa < posB && posB < posGazpacho};
  });
  assert.ok(r.ordenCorrecto, 'cada menú debe quedar en su propio bloque, sin intercalar los platos del otro: ' + JSON.stringify(r));
});

await caso('Una nota manual escrita por el camarero SÍ se sigue mostrando, aunque venga de un menú', async () => {
  const r = await page.evaluate(()=>{
    const menuId = genId();
    DB.menus.push({id: menuId, nombre:'Menú del día', precio:15, ivaPct:10, secciones:[]});
    const order = {
      id: genId(), tableId:1, status:'abierta', pax:2, tandas:['Primero'],
      items:[{name:'Ensalada', qty:1, price:0, menuId, tanda:'Primero', notas:'Sin cebolla, por favor'}],
    };
    const html = renderOrderComandaPanel(order);
    return html.includes('Sin cebolla, por favor');
  });
  assert.ok(r, 'una nota manual real no debe desaparecer');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
