// Norma de móvil (30/10): lo que es denso se pliega. Una fila de la carta o de un menú se ve como nombre y precio (más
// «agotado» o el límite de raciones) y el resto cuelga de un toque. En PC todo sigue a la vista.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height:ancho < 600 ? 800 : 900});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'PLEGA001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const pl = (id,n,pr,extra={}) => Object.assign({id,nombre:n,precio:pr,precioBase:pr/1.1,ivaPct:10,disponible:true,modificadores:[]}, extra);
    DB.cartas = [{id:1,nombre:'CARTA PRINCIPAL',area:'cocina',horario:defaultItemHorario(),secciones:[{id:11,nombre:'Entrantes',platos:[
      pl(111,'Ensaladilla rusa con atún y huevo duro',7.5), pl(112,'Tartar de atún',16,{disponible:false}), pl(113,'Croquetas',9,{stock:3})]}]}];
    DB.menus = [{id:5,nombre:'Menú del día',area:'cocina',precio:14.5,precioBase:13.18,ivaPct:10,horario:defaultItemHorario(),grupos:[{id:51,nombre:'Primeros',opciones:[pl(511,'Sopa del día',0)]}]}];
    saveDB(); currentFolder = 'cocina'; navigate('carta'); openCarta(1);
  });
  await esperar(500);
  return page;
}

const visible = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);

{
  const page = await abrir(360);
  const fila = n => `.oc-plato[data-pl="cp-11-${n}"]`;

  await caso('Móvil, carta: la fila plegada enseña nombre, precio y flecha; el resto está escondido', async () => {
    assert.ok(await visible(page, fila(111) + ' .carta-plato-name') && await visible(page, fila(111) + ' .oc-precio') && await visible(page, fila(111) + ' .pl-chev'));
    assert.ok(!(await visible(page, fila(111) + ' .oc-ctrl')) && !(await visible(page, fila(111) + ' .oc-mover')), 'plegada: sin botones ni flechas de orden');
    const alto = await page.evaluate(s => document.querySelector(s).getBoundingClientRect().height, fila(111));
    assert.ok(alto < 110, 'una fila plegada ocupa poco: ' + alto);
  });

  await caso('Móvil, carta: agotado y raciones se ven aunque esté plegada', async () => {
    assert.ok(/Agotado/i.test(await page.evaluate(s => document.querySelector(s + ' .oc-estado').textContent, fila(112))));
    assert.ok(/3 raciones/i.test(await page.evaluate(s => document.querySelector(s + ' .oc-estado').textContent, fila(113))));
    assert.ok(!(await visible(page, fila(111) + ' .oc-estado')), 'un plato normal no lleva etiqueta');
  });

  await caso('Móvil, carta: tocar el nombre abre la fila (no el editor de nombre) y la flecha la cierra', async () => {
    await page.evaluate(s => document.querySelector(s + ' .carta-plato-name').click(), fila(111)); await esperar(250);
    assert.ok(await visible(page, fila(111) + ' .oc-ctrl') && await visible(page, fila(111) + ' .oc-mover'), 'abierta: botones y orden a la vista');
    assert.ok(!(await page.evaluate(() => document.getElementById('modal-overlay').classList.contains('active'))), 'el primer toque no abre ningún modal');
    await page.evaluate(() => renderCartaSecciones()); await esperar(250);
    assert.ok(await visible(page, fila(111) + ' .oc-ctrl'), 'repintar no la pliega');
    await page.evaluate(s => document.querySelector(s + ' .pl-chev').click(), fila(111)); await esperar(250);
    assert.ok(!(await visible(page, fila(111) + ' .oc-ctrl')), 'la flecha la cierra');
  });

  await caso('Móvil, carta: con la fila abierta, el precio sí se edita al tocarlo', async () => {
    await page.evaluate(s => document.querySelector(s + ' .pl-chev').click(), fila(111)); await esperar(250);
    await page.evaluate(s => document.querySelector(s + ' .oc-precio').click(), fila(111)); await esperar(400);
    assert.ok(await page.evaluate(() => !!document.getElementById('modal-box') && document.getElementById('modal-overlay').classList.contains('active')), 'abierta, el precio abre su editor');
    await page.evaluate(() => closeModal());
  });

  await caso('Móvil, carta: los botones de la fila abierta siguen funcionando (disponible)', async () => {
    await page.evaluate(s => document.querySelector(s + ' .oc-ctrl .btn').click(), fila(111)); await esperar(300);
    assert.equal(await page.evaluate(() => cartaEdit.secciones[0].platos.find(p => p.id === 111).disponible), false);
    assert.ok(await page.evaluate(s => document.querySelector(s).classList.contains('agotado'), fila(111)), 'la fila queda marcada como agotada');
  });

  await caso('Móvil, menú: las opciones se pliegan igual', async () => {
    await page.evaluate(() => { cartaEdit = null; cartaBase = ''; renderCarta(); setOfertaTab('menus'); openMenu(5); }); await esperar(500);
    const f = '.oc-plato[data-pl="mo-51-511"]';
    assert.ok(await visible(page, f + ' .carta-plato-name') && await visible(page, f + ' .pl-chev'));
    assert.ok(!(await visible(page, f + ' .oc-ctrl')));
    await page.evaluate(s => document.querySelector(s + ' .pl-chev').click(), f); await esperar(250);
    assert.ok(await visible(page, f + ' .oc-ctrl'));
  });

  await caso('Móvil: nada se desborda', async () => {
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  });
  await caso('Ningún error de JavaScript (360px)', async () => assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')));
  await page.close();
}

{
  const page = await abrir(1280);
  await caso('PC: nada plegado, todo a la vista y sin flechas', async () => {
    const f = '.oc-plato[data-pl="cp-11-111"]';
    assert.ok(await visible(page, f + ' .oc-ctrl') && await visible(page, f + ' .oc-mover'));
    assert.ok(!(await visible(page, f + ' .pl-chev')), 'sin flecha en PC');
    assert.ok(!(await visible(page, f + ' .oc-estado')), 'la etiqueta es solo para la fila plegada de móvil');
    await page.evaluate(s => document.querySelector(s + ' .carta-plato-name').click(), f); await esperar(400);
    assert.ok(await page.evaluate(() => document.getElementById('modal-overlay').classList.contains('active')), 'en PC el nombre abre su editor, como siempre');
    await page.evaluate(() => closeModal());
  });
  await caso('Ningún error de JavaScript (1280px)', async () => assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')));
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
