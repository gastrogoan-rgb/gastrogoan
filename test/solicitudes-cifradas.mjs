// Solicitudes públicas cifradas (18/11): la web cifra los datos personales con la clave pública del negocio y solo la app los abre.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'CIFRADO01', tenantId: ggBizTenantId('CIFRADO01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
import fs from 'node:fs';
const web = fs.readFileSync('reservagastrogoan.html', 'utf8');
const trozo = web.slice(web.indexOf('const CAMPOS_PRIVADOS_SOLICITUD'), web.indexOf('function pushSolicitud'));
const r = await page.evaluate(async (trozo) => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  delete DB.business.reqPub; delete DB.business.reqPriv;
  const creada = await asegurarClaveSolicitudes();
  const espejo = negocioParaElEspejoPublico();
  // La "web": mismo código que reservagastrogoan.html, con la clave pública que publicó el espejo
  const web = new Function('DB', trozo + '; return {cifrarSolicitud};')({business: {reqPub: espejo.reqPub}});
  const req = {type:'reserva', clientName:'Marta Ruiz', clientPhone:'600111222', clientEmail:'marta@ejemplo.es', notes:'alergia al gluten', date:'2026-12-01', time:'21:00', people:4, createdAt:'x'};
  const cif = await web.cifrarSolicitud(req);
  const plano = await descifrarSolicitud(cif);
  // sin clave publicada, en claro
  const web2 = new Function('DB', trozo + '; return {cifrarSolicitud};')({business: {}});
  const sin = await web2.cifrarSolicitud(req);
  // el oyente: ggDescifrando entrega la solicitud ya abierta
  let recibido = null;
  await new Promise(res => ggDescifrando(snap => { recibido = snap.val(); res(); })({val: () => cif, ref: {}, key: 'k'}));
  return {creada, espejoLlevaPriv: !!espejo.reqPriv, espejoLlevaPub: !!espejo.reqPub, cif, plano, sin, recibido, json: JSON.stringify(cif)};
}, trozo);
await caso('La app crea su clave una vez y publica SOLO la pública', async () => { assert.equal(r.creada, true); assert.equal(r.espejoLlevaPub, true); assert.equal(r.espejoLlevaPriv, false); });
await caso('La solicitud cifrada no lleva ni nombre, ni teléfono, ni email, ni notas en claro; sí lo no personal', async () => {
  assert.ok(r.cif.enc && r.cif.enc.k && r.cif.enc.iv && r.cif.enc.d);
  for(const dato of ['Marta', '600111222', 'marta@ejemplo.es', 'gluten']) assert.ok(!r.json.includes(dato), 'se ve «' + dato + '» en claro');
  assert.equal(r.cif.date, '2026-12-01'); assert.equal(r.cif.people, 4); assert.equal(r.cif.type, 'reserva');
});
await caso('La app la abre y recupera exactamente lo que escribió el cliente', async () => {
  assert.equal(r.plano.clientName, 'Marta Ruiz'); assert.equal(r.plano.clientPhone, '600111222'); assert.equal(r.plano.clientEmail, 'marta@ejemplo.es'); assert.equal(r.plano.notes, 'alergia al gluten'); assert.ok(!r.plano.enc);
});
await caso('El oyente de la app entrega la solicitud ya abierta; sin clave publicada la web envía en claro como siempre', async () => {
  assert.equal(r.recibido.clientPhone, '600111222'); assert.equal(r.sin.clientPhone, '600111222'); assert.ok(!r.sin.enc);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Solicitudes cifradas: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
