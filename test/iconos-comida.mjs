// Iconos de las secciones de la carta (29/10): catálogo amplio de comida con trazo fino, «Sin icono» como primera
// opción, secciones antiguas con emoji que siguen viéndose, y la web pública pintando EXACTAMENTE lo mismo.
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
}, 'ICONOSCOM1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
});

await caso('El catálogo es amplio y está completo: svg, tres idiomas y un grupo en cada icono', async () => {
  const r = await page.evaluate(()=>{
    const e = Object.entries(ICONOS_COMIDA);
    const grupos = ICONOS_COMIDA_GRUPOS.map(g => g[0]);
    return {n: e.length, sinSvg: e.filter(([,v]) => !v[0] || v[0].length < 20).map(([k]) => k),
      sinNombre: e.filter(([,v]) => !v[1] || !v[2] || !v[3]).map(([k]) => k),
      grupoRaro: e.filter(([,v]) => !grupos.includes(v[4])).map(([k]) => k),
      pequenos: grupos.filter(g => e.filter(([,v]) => v[4] === g).length < 4)};
  });
  assert.ok(r.n >= 170, `pocos iconos: ${r.n}`);
  assert.deepEqual([r.sinSvg, r.sinNombre, r.grupoRaro, r.pequenos], [[],[],[],[]], JSON.stringify(r));
});

await caso('Qué icono toca: el elegido, «sin icono», el emoji antiguo y, si no hay nada, el del nombre', async () => {
  const r = await page.evaluate(()=>({
    elegido: iconoComidaClave('ic:pizza', 'x'),
    ninguno: iconoComidaClave('ic:none', 'Postres'),
    emojiViejo: iconoComidaClave('🥗', 'x'),
    porNombre: iconoComidaClave('', 'Ensaladas'),
    desconocido: iconoComidaClave('ic:inventado', 'Tintos'),
    cubiertos: iconoComidaClave(undefined, 'Zzzz'),
    htmlNinguno: iconoSeccionHtml('ic:none', 'Postres'),
    htmlElegido: iconoSeccionHtml('ic:pizza', 'x').startsWith('<svg'),
  }));
  assert.equal(r.elegido, 'pizza'); assert.equal(r.ninguno, ''); assert.equal(r.emojiViejo, 'ensalada');
  assert.ok(/ensalada/.test(r.porNombre), JSON.stringify(r));
  assert.equal(r.desconocido, 'copa-vino', 'una clave que no existe cae al nombre: ' + JSON.stringify(r));
  assert.equal(r.cubiertos, 'cubiertos-cruz');
  assert.equal(r.htmlNinguno, ''); assert.ok(r.htmlElegido);
});

await caso('El selector: «Sin icono» es lo PRIMERO, hay buscador y el catálogo entero', async () => {
  const r = await page.evaluate(async ()=>{
    DB.cartas = [{id:1, nombre:'C', area:'cocina', horario:defaultItemHorario(), secciones:[{id:11, nombre:'Postres', platos:[]}]}];
    saveDB(); currentFolder='cocina'; navigate('carta'); await new Promise(r => setTimeout(r, 300));
    openCarta(1); await new Promise(r => setTimeout(r, 300));
    openCartaSectionIconModal(11); await new Promise(r => setTimeout(r, 300));
    const box = document.getElementById('modal-box');
    const botones = [...box.querySelectorAll('.ico-especiales .btn')].map(b => b.innerText.trim());
    const primerControl = box.querySelector('.ico-cab .ico-especiales .btn');
    return {botones, primero: primerControl && primerControl.innerText.trim(), n: box.querySelectorAll('.ico-btn').length, buscador: !!box.querySelector('#ico-buscar')};
  });
  assert.ok(/sin icono/i.test(r.primero), 'primero «Sin icono»: ' + JSON.stringify(r));
  assert.ok(/autom/i.test(r.botones[1]||''), JSON.stringify(r));
  assert.ok(r.n >= 170 && r.buscador, JSON.stringify(r));
});

await caso('El buscador filtra por nombre en el idioma que sea («vino» deja los de vino)', async () => {
  const r = await page.evaluate(async ()=>{
    const i = document.getElementById('ico-buscar'); i.value = 'vino'; filtrarIconosComida('vino');
    const visibles = [...document.querySelectorAll('#ico-lista .ico-btn')].filter(b => !b.hidden).length;
    filtrarIconosComida('zzzzzz');
    const ninguno = [...document.querySelectorAll('#ico-lista .ico-btn')].filter(b => !b.hidden).length;
    filtrarIconosComida('');
    return {visibles, ninguno, todos: [...document.querySelectorAll('#ico-lista .ico-btn')].filter(b => !b.hidden).length};
  });
  assert.ok(r.visibles >= 3 && r.visibles < 40, JSON.stringify(r));
  assert.equal(r.ninguno, 0); assert.ok(r.todos >= 170);
});

await caso('Elegir un icono lo guarda como «ic:…»; «Sin icono» guarda «ic:none» y la sección no pinta dibujo', async () => {
  const r = await page.evaluate(async ()=>{
    setCartaSectionIcon(11, 'ic:helado'); await new Promise(r => setTimeout(r, 200));
    const elegido = cartaEdit.secciones[0].icono;
    const hayDibujo = !!document.querySelector('.oc-icono svg');
    openCartaSectionIconModal(11); await new Promise(r => setTimeout(r, 200));
    document.querySelector('.ico-especiales .btn').click(); await new Promise(r => setTimeout(r, 200));
    return {elegido, hayDibujo, ninguno: cartaEdit.secciones[0].icono, sinDibujo: !document.querySelector('.oc-icono svg')};
  });
  assert.equal(r.elegido, 'ic:helado'); assert.ok(r.hayDibujo);
  assert.equal(r.ninguno, 'ic:none'); assert.ok(r.sinDibujo, JSON.stringify(r));
});

await caso('La web pública pinta lo mismo: mismo catálogo y mismo resultado para cada tipo de valor', async () => {
  const app = await page.evaluate(()=>({n: Object.keys(ICONOS_COMIDA).length, pizza: iconoSeccionHtml('ic:pizza','x',22), viejo: iconoSeccionHtml('🍰','x',22), ninguno: iconoSeccionHtml('ic:none','x',22), auto: iconoSeccionHtml('', 'Cafés', 22)}));
  const web = await browser.newPage();
  await web.setRequestInterception(true);
  web.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await web.goto('http://localhost:8950/dist/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
  await esperar(1500);
  const pub = await web.evaluate(()=>({n: Object.keys(ICONOS_COMIDA).length, pizza: menuFolderIcon({icono:'ic:pizza'},'x'), viejo: menuFolderIcon({icono:'🍰'},'x'), ninguno: menuFolderIcon({icono:'ic:none'},'x'), auto: menuFolderIcon({}, 'Cafés')}));
  await web.close();
  assert.deepEqual(pub, app, 'la web pública tiene que pintar igual que la app');
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
