// El nombre del empleado en la cabecera (26/11). Con sesión de empleado la cabecera enseña quién está dentro; con la del propietario, nada.
// Mide lo que importa en un móvil: que el nombre se vea (recortado con puntos suspensivos si es largo), que la cabecera no se desborde ni se
// solape con sus botones, y que la letra no baje de 11 px.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const res = [];
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); res.push(true); }catch(e){ console.log('❌ ' + n + '\n   ⤷ ' + e.message); res.push(false); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const ANCHOS = [320, 360, 390, 412, 430, 1280];
const CORTO = 'Ana', LARGO = 'María de los Ángeles Fernández';

async function abrir(ancho, sesion, nombre){
  const page = await browser.newPage();
  await page.setViewport({width: ancho, height: 800});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'EMPCAB01', tenantId: ggBizTenantId('EMPCAB01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => typeof DB !== 'undefined' && DB && typeof ggBizTenantId === 'function' && typeof renderHeader === 'function', {timeout: 20000}); await w(900);
  await page.evaluate(async (sesion, nombre) => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {name:'Pruebas GastroGoanApp', netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.employees = [{id:'emp-1', name: nombre, area:'sala', pin:'1234', active:true}];
    localStorage.setItem('gastrogoan_access_session', JSON.stringify(sesion === 'empleado' ? {type:'employee', employeeId:'emp-1', area:'sala', ts: Date.now()} : {type:'owner', ts: Date.now()}));
    try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){}
    renderHeader(); updateLogoutBtn();
  }, sesion, nombre);
  await w(400);
  return {page, errs};
}
const medir = page => page.evaluate(() => {
  const chip = document.getElementById('app-user-chip'), nom = document.getElementById('app-user-name');
  const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  const r = e => { const b = e.getBoundingClientRect(); return {l: b.left, r: b.right, t: b.top, b: b.bottom}; };
  const hdr = document.getElementById('app-header');
  const vecinos = [...hdr.querySelectorAll('button, a')].filter(vis).map(r);
  const rc = vis(chip) ? r(chip) : null;
  const solapa = rc ? vecinos.some(v => v.l < rc.r - 1 && v.r > rc.l + 1 && v.t < rc.b - 1 && v.b > rc.t + 1) : false;
  return {
    visible: vis(chip), texto: nom ? nom.textContent : '', titulo: chip ? chip.getAttribute('title') : null,
    recortado: !!nom && nom.scrollWidth > nom.clientWidth + 1,
    fuente: chip ? parseFloat(getComputedStyle(chip).fontSize) : 0,
    desborde: document.documentElement.scrollWidth - innerWidth,
    dentro: rc ? (rc.l >= -1 && rc.r <= innerWidth + 1) : true,
    solapa, medidas: nom ? `nombre ${nom.clientWidth}/${nom.scrollWidth}px, chip ${Math.round(chip.getBoundingClientRect().width)}px, max ${getComputedStyle(chip).maxWidth}, overflow ${getComputedStyle(nom).overflow}, display ${getComputedStyle(nom).display}` : '',
  };
});

for(const ancho of ANCHOS){
  await caso(`Empleado de nombre corto, ${ancho}px: el nombre se ve entero, sin desbordes ni solapes`, async () => {
    const {page, errs} = await abrir(ancho, 'empleado', CORTO);
    const m = await medir(page);
    assert.ok(m.visible, 'la etiqueta no se ve');
    assert.equal(m.texto, CORTO); assert.equal(m.titulo, CORTO); assert.ok(!m.recortado, 'el nombre corto salió recortado');
    assert.ok(m.fuente >= 11, 'letra de ' + m.fuente + ' px');
    assert.ok(m.desborde <= 1, 'la página se desborda ' + m.desborde + ' px');
    assert.ok(m.dentro, 'la etiqueta se sale de la pantalla'); assert.ok(!m.solapa, 'la etiqueta se solapa con un botón de la cabecera');
    assert.deepEqual(errs, []); await page.close();
  });
  await caso(`Empleado de nombre largo, ${ancho}px: se recorta con puntos suspensivos y el nombre completo va en el título`, async () => {
    const {page} = await abrir(ancho, 'empleado', LARGO);
    const m = await medir(page);
    assert.ok(m.visible, 'la etiqueta no se ve');
    assert.equal(m.titulo, LARGO, 'el nombre completo debe estar en el title');
    assert.ok(m.desborde <= 1, 'la página se desborda ' + m.desborde + ' px');
    assert.ok(m.dentro && !m.solapa, 'se sale o se solapa');
    if(ancho <= 430) assert.ok(m.recortado, 'a ' + ancho + ' px un nombre tan largo debe recortarse (' + m.medidas + ')');
    await page.close();
  });
}
await caso('Con sesión de propietario no sale ninguna etiqueta (ni en móvil ni en escritorio)', async () => {
  for(const ancho of [320, 1280]){
    const {page} = await abrir(ancho, 'propietario', CORTO);
    const m = await medir(page);
    assert.ok(!m.visible, 'la etiqueta se ve al propietario a ' + ancho + ' px'); assert.equal(m.texto, '');
    await page.close();
  }
});
await caso('Al cerrar la sesión del empleado la etiqueta desaparece y no queda su nombre', async () => {
  const {page} = await abrir(390, 'empleado', CORTO);
  assert.ok((await medir(page)).visible);
  await page.evaluate(() => { localStorage.removeItem('gastrogoan_access_session'); updateLogoutBtn(); });
  const m = await medir(page);
  assert.ok(!m.visible); assert.equal(m.texto, ''); assert.equal(m.titulo, null);
  await page.close();
});
await caso('Un empleado borrado en otro aparato no deja una etiqueta vacía ni «Desconocido»', async () => {
  const {page} = await abrir(390, 'empleado', CORTO);
  await page.evaluate(() => { DB.employees = []; updateLogoutBtn(); });
  const m = await medir(page);
  assert.ok(!m.visible, 'quedó una etiqueta: «' + m.texto + '»');
  await page.close();
});

await browser.close();
console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
