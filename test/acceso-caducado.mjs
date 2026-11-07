// SESIÓN CADUCADA + DIRECCIÓN GUARDADA (7/11): el dueño abrió app.gastrogoan.com/#promocion tras muchas horas sin usarla y salió, a la vez,
// la pantalla de entrada («Tu sesión se cerró…») Y ENCIMA el PIN de «Sala»: un login doble que se lee como un fallo de la app.
// Causa: al arrancar, `navigate('promocion')` (por el #hash) corría ANTES que la pantalla de entrada (que sale 1,8 s después); sin sesión,
// el candado de área (`requestFichaGate`) abría su ventana, y la pantalla de entrada se pintaba debajo.
// Fija: sin sesión válida NO se abre ninguna ventana de PIN de área por la dirección guardada, y la pantalla de entrada manda.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function arrancar(hash, sesion){
  const page = await browser.newPage(); await page.setViewport({width:1280,height:800});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(2000);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  datos.employees = (datos.employees || []).filter(e => (e.area || 'cocina') !== 'sala');
  datos.employees.push({id:99001, name:'Camarero Prueba', area:'sala', active:true, role:'Camarero'});   // hay alguien en Sala → el candado de área aplicaría
  await page.evaluate(async (d, sesion) => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    if(sesion === 'caducada'){   // propietario que no ha tocado la app en 20 horas
      localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now() - 20*3600e3}));
      localStorage.setItem('gastrogoan_access_last_activity', String(Date.now() - 20*3600e3));
    }
    await idbSet('gastrogoan_data_v1', d);
  }, datos, sesion);
  await page.goto('about:blank');   // ir a la MISMA dirección con otro #hash no recarga: hay que forzar un arranque de verdad
  await page.goto('http://localhost:8950/dist/index.html' + hash, {waitUntil:'domcontentloaded'}); await w(4200);   // pasa el 1,8 s de la entrada
  return page;
}
const estado = page => page.evaluate(() => {
  const ov = document.getElementById('modal-overlay'), box = document.getElementById('modal-box');
  const acc = document.getElementById('access-select-screen');
  return {modalAbierto: !!(ov && ov.classList.contains('active') || (box && box.getClientRects().length && box.innerHTML.trim().length > 20)),
          textoModal: (box && box.innerText || '').trim().slice(0, 60),
          entradaVisible: !!(acc && !acc.classList.contains('hide') && acc.getClientRects().length),
          aviso: !!document.querySelector('.access-aviso')};
});
for(const [hash, sesion, nombre] of [['#promocion','caducada','sesión CADUCADA y dirección #promocion (Sala)'], ['#promocion','ninguna','SIN sesión y dirección #promocion (Sala)'], ['#tpv','caducada','sesión caducada y #tpv'], ['#stock','caducada','sesión caducada y #stock (Cocina)']]){
  await caso('Entrada limpia: ' + nombre, async () => {
    const p = await arrancar(hash, sesion); const e = await estado(p); await p.close();
    assert.ok(e.entradaVisible, 'la pantalla de entrada tiene que verse: ' + JSON.stringify(e));
    assert.equal(e.modalAbierto, false, 'NO puede haber una ventana de PIN encima de la entrada: ' + JSON.stringify(e));
    if(sesion === 'caducada') assert.ok(e.aviso, 'y debe explicar por qué se cerró la sesión');
  });
}
await caso('Con sesión de propietario VIVA, la dirección guardada sigue llevando a su pantalla', async () => {
  const page = await browser.newPage(); await page.setViewport({width:1280,height:800});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1500);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => { localStorage.clear(); localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_access_last_activity', String(Date.now())); await idbSet('gastrogoan_data_v1', d); }, datos);
  await page.goto('about:blank');
  await page.goto('http://localhost:8950/dist/index.html#promocion', {waitUntil:'domcontentloaded'}); await w(4200);
  const v = await page.evaluate(() => (document.querySelector('.view.active') || {}).id); await page.close();
  assert.equal(v, 'view-promocion', 'con sesión viva debe abrir Promoción: ' + v);
});
await browser.close();
if(fallos){ console.log('\n❌ ' + fallos + ' caso(s) fallan'); process.exit(1); }
console.log('\n✅ todos los casos pasaron: sin sesión válida, la entrada manda y no sale ningún PIN de área encima');
