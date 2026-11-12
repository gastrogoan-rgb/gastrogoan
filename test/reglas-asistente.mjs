// ASISTENTE «ACTUALIZAR MIS REGLAS» (12/11, pedido del dueño): cuando las reglas del Firebase del negocio están viejas, un paso a paso de 6 pantallas y 2 minutos
// que dice exactamente qué se ve en Firebase y dónde pulsar (portada de Firebase → cuenta y proyecto → Realtime Database → Reglas → copiar → borrar todo → pegar →
// Publicar → comprobar). Se comprueba cada pantalla, el enlace (a la PORTADA, no al proyecto), la copia, los tres desenlaces de la comprobación y el móvil.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const PUERTO = process.env.PUERTO || '8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function abrir(ancho = 1280, lang = 'es'){
  const page = await browser.newPage(); await page.setViewport({width: ancho, height: 900, isMobile: ancho < 500, hasTouch: ancho < 1000});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await page.evaluate(lang => {
    localStorage.setItem('gastrogoan_lang', lang);
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'REGLAS01', tenantId: ggBizTenantId('REGLAS01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, lang);
  await page.reload({waitUntil:'domcontentloaded'}); await w(2200);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','comprobando-negocio'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://casapaco-default-rtdb.europe-west1.firebasedatabase.app'};
    delete DB.business.firebaseCuenta;
    reglasAntiguas = true; espejoEnNubePropia = false;
    window.__abiertos = []; window.open = (...a) => { window.__abiertos.push(a); return null; };
    window.__portapapeles = []; Object.defineProperty(navigator, 'clipboard', {value: {writeText: t => { window.__portapapeles.push(t); return window.__clipFalla ? Promise.reject(new Error('no')) : Promise.resolve(); }}, configurable: true});
    window.__sonda = 'viejas';   // lo que devolverá la sonda de reglas simulada
    window.comprobarEspejoEnNubePropia = async () => { await new Promise(r => setTimeout(r, 150)); if(window.__sonda === 'error') throw new Error('red'); if(window.__sonda === 'ok'){ espejoEnNubePropia = true; reglasAntiguas = false; } else { espejoEnNubePropia = false; reglasAntiguas = true; } return true; };
    avisosPintar();
  });
  return page;
}
const texto = p => p.evaluate(() => document.getElementById('reglas-wiz').innerText);
const paso = p => p.evaluate(() => reglasPaso);
const clic = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
const sig = p => p.evaluate(() => [...document.querySelectorAll('#reglas-wiz .rw-pie .btn')].pop().click());

const p = await abrir();
await caso('La campana avisa al propietario («reglas desactualizadas») con un botón «Actualizar (2 min)» que abre el asistente', async () => {
  await p.evaluate(() => toggleAvisosPanel()); await w(300);
  const fila = await p.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].map(f => f.innerText.replace(/\s+/g, ' ')).find(t => /reglas/i.test(t)));
  assert.ok(fila && /Actualizar \(2 min\)/.test(fila), 'no sale la fila: ' + fila);
  await p.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila button')].find(b => /Actualizar/.test(b.textContent)).click()); await w(400);
  assert.equal(await p.evaluate(() => !!document.getElementById('reglas-wiz')), true, 'no abre el asistente'); assert.equal(await p.evaluate(() => avisosPanelAbierto()), false);
});
await caso('Paso 1: dice que tarda 2 minutos y que no pierde nada, nombra SU proyecto (casapaco) y pide el correo; el correo se recuerda', async () => {
  const t = await texto(p);
  assert.match(t, /Tarda 2 minutos/); assert.match(t, /No pierdes ning/); assert.match(t, /casapaco/); assert.match(t, /paso 1 de 6/i); assert.match(t, /servidor compartido/);
  await p.evaluate(() => { const i = document.getElementById('rw-cuenta'); i.value = 'jefe@casapaco.es'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await w(200);
  assert.equal(await p.evaluate(() => DB.business.firebaseCuenta), 'jefe@casapaco.es');
});
await caso('Paso 2: «Abrir Firebase» abre la PORTADA de Firebase (no un proyecto), y dice con qué cuenta entrar y qué proyecto pulsar', async () => {
  await sig(p); assert.equal(await paso(p), 2);
  const t = await texto(p); assert.match(t, /jefe@casapaco\.es/); assert.match(t, /casapaco/); assert.match(t, /Verás tus proyectos como tarjetas/); assert.match(t, /Cambiar de cuenta/);
  await clic(p, '#reglas-wiz .rw-abrir'); const a = await p.evaluate(() => window.__abiertos);
  assert.equal(a.length, 1); assert.equal(a[0][0], 'https://console.firebase.google.com/', 'debe ser la portada de Firebase');
});
await caso('Paso 3: dice por dónde ir (Base de datos y almacenamiento → Realtime Database → pestaña Reglas) y enseña un dibujo de cómo se ve', async () => {
  await sig(p); assert.equal(await paso(p), 3);
  const t = await texto(p); for(const x of ['Base de datos y almacenamiento', 'Realtime Database', 'Reglas', 'Copias de seguridad', '-default-rtdb']) assert.ok(t.includes(x), 'falta «' + x + '»');
  assert.equal(await p.evaluate(() => !!document.querySelector('#reglas-wiz .rw-fb .rw-fb-tab.is-on')), true, 'falta el dibujo con «Reglas» marcada');
});
await caso('Paso 4: «Siguiente» no se activa hasta copiar; al copiar se copian EXACTAMENTE las reglas y el botón pasa a «¡Copiadas!»', async () => {
  await sig(p); assert.equal(await paso(p), 4);
  assert.equal(await p.evaluate(() => [...document.querySelectorAll('#reglas-wiz .rw-pie .btn')].pop().disabled), true, 'se puede seguir sin copiar');
  await clic(p, '#reglas-wiz .rw-abrir'); await w(300);
  const r = await p.evaluate(() => ({copiado: window.__portapapeles[0] === FIREBASE_RULES_JSON, boton: document.querySelector('#reglas-wiz .rw-abrir').innerText, sigOff: [...document.querySelectorAll('#reglas-wiz .rw-pie .btn')].pop().disabled}));
  assert.equal(r.copiado, true); assert.match(r.boton, /Copiadas/); assert.equal(r.sigOff, false);
});
await caso('Si el navegador no deja copiar solo, avisa y deja copiar a mano (no se queda bloqueado)', async () => {
  await p.evaluate(() => { reglasCopiado = false; reglasCopiaFallo = false; window.__clipFalla = true; reglasRender(); });
  await clic(p, '#reglas-wiz .rw-abrir'); await w(300);
  const r = await p.evaluate(() => ({aviso: !!document.querySelector('#reglas-wiz .rw-aviso.is-ko'), sigOff: [...document.querySelectorAll('#reglas-wiz .rw-pie .btn')].pop().disabled}));
  assert.equal(r.aviso, true); assert.equal(r.sigOff, false); await p.evaluate(() => { window.__clipFalla = false; });
});
await caso('Paso 5: siete acciones exactas (volver, clic dentro, Ctrl+A / ⌘+A, borrar, Ctrl+V / ⌘+V, Publicar, aviso «Reglas publicadas»)', async () => {
  await sig(p); assert.equal(await paso(p), 5);
  const t = await texto(p); for(const x of ['Ctrl + A', '⌘ + A', 'Suprimir', 'vacío', 'Ctrl + V', '⌘ + V', 'Publicar', 'Reglas publicadas']) assert.ok(t.includes(x), 'falta «' + x + '»');
  assert.equal(await p.evaluate(() => document.querySelectorAll('#reglas-wiz .rw-lista li').length), 7);
});
await caso('Paso 6 con las reglas AÚN viejas: no dice «error»; dice qué revisar (Publicar, cuadro vacío, proyecto) y permite volver al paso 5', async () => {
  await sig(p); assert.equal(await paso(p), 6); await w(900);
  const t = await texto(p); assert.match(t, /Todavía no están publicadas/); assert.match(t, /Publicar/); assert.match(t, /casapaco/); assert.match(t, /Volver al paso 5/);
});
await caso('Sin conexión: dice que es un problema de conexión, no de las reglas', async () => {
  await p.evaluate(() => { window.__sonda = 'error'; }); await p.evaluate(() => reglasComprobar(false)); await w(600);
  assert.match(await texto(p), /problema de conexi/);
});
await caso('Al publicar en Firebase, la app lo detecta SOLA (sin pulsar nada) y pasa a «¡Listo!»; el aviso de la campana desaparece', async () => {
  await p.evaluate(() => { window.__sonda = 'viejas'; reglasVeredicto = null; reglasIr(6); }); await w(900);
  await p.evaluate(() => { window.__sonda = 'ok'; });   // el cliente pulsa «Publicar» en Firebase
  let ok = false; for(let i = 0; i < 12 && !ok; i++){ await w(1000); ok = /¡Listo!/.test(await texto(p)); }
  assert.equal(ok, true, 'no detectó que ya estaba publicado: ' + (await texto(p)).slice(0, 80));
  assert.match(await texto(p), /Tus reglas están al día/);
  await p.evaluate(() => reglasCerrar()); await w(300); await p.evaluate(() => { if(!avisosPanelAbierto()) toggleAvisosPanel(); }); await w(300);
  assert.ok(!(await p.evaluate(() => document.getElementById('avisos-cuerpo').innerText)).match(/reglas de seguridad/i), 'el aviso sigue');
});
await caso('La ventana de la nube enseña el botón grande «Actualizar mis reglas (2 min, paso a paso)» cuando las reglas están viejas', async () => {
  await p.evaluate(() => { reglasAntiguas = true; espejoEnNubePropia = false; closeModal(); openCloudWizard(); }); await w(500);
  assert.match(await p.evaluate(() => document.getElementById('modal-box').innerText), /Actualizar mis reglas \(2 min, paso a paso\)/);
});
await caso('Sin errores de página', async () => { assert.deepEqual(p.errs, []); });
await p.close();

await caso('Un empleado NO ve el aviso de reglas en su campana', async () => {
  const e = await abrir(); await e.evaluate(() => { window.isOwnerSession = () => false; window.getAccessSession = () => ({type:'employee', area:'sala', employeeId:1, ts:Date.now()}); avisosPintar(); toggleAvisosPanel(); }); await w(300);
  assert.ok(!(await e.evaluate(() => document.getElementById('avisos-cuerpo').innerText)).match(/reglas de seguridad/i)); await e.close();
});
for(const [lang, titulo, frag] of [['en', 'Update your security rules', 'Takes 2 minutes'], ['ca', 'Actualitza les teves regles de seguretat', 'Triga 2 minuts']]){
  await caso(`Idioma ${lang}: los 6 pasos salen traducidos, sin «undefined»`, async () => {
    const q = await abrir(1280, lang); await q.evaluate(() => abrirAsistenteReglas()); await w(300);
    assert.match(await texto(q), new RegExp(titulo)); assert.ok((await texto(q)).includes(frag));
    for(let i = 2; i <= 6; i++){ await q.evaluate(n => { reglasCopiado = true; reglasIr(n); }, i); await w(200); const t = await texto(q); assert.ok(!/undefined|\[object/.test(t), `paso ${i}: ${t.slice(0, 60)}`); assert.ok(t.length > 60); }
    await q.close();
  });
}
for(const ancho of [320, 360, 390]){
  await caso(`Móvil ${ancho} px: ningún paso se desborda, los botones miden 44 px o más y ninguna letra baja de 11 px`, async () => {
    const m = await abrir(ancho); await m.evaluate(() => abrirAsistenteReglas()); await w(300);
    for(let i = 1; i <= 6; i++){
      await m.evaluate(n => { reglasCopiado = true; window.__sonda = 'viejas'; reglasVeredicto = n === 6 ? 'viejas' : null; reglasIr(n); }, i); await w(250);
      const r = await m.evaluate(() => { const box = document.getElementById('modal-box').getBoundingClientRect(); const bs = [...document.querySelectorAll('#reglas-wiz .btn')].map(b => b.getBoundingClientRect().height);
        const peq = [...document.querySelectorAll('#reglas-wiz *')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 10.5).length;
        return {der: box.right, ancho: innerWidth, scrollX: document.documentElement.scrollWidth > innerWidth, minBtn: Math.min(...bs), fuera: [...document.querySelectorAll('#reglas-wiz *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length, peq}; });
      assert.ok(r.der <= r.ancho + 1 && !r.scrollX && r.fuera === 0, `paso ${i}: ` + JSON.stringify(r)); assert.ok(r.minBtn >= 43.5, `paso ${i}: botón de ${r.minBtn} px`); assert.equal(r.peq, 0, `paso ${i}: letra pequeña`);
    }
    await m.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
