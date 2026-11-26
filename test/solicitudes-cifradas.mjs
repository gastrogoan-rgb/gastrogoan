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
  // v2 (25/11): la app publica reqPubV=2 y la web cifra también fecha, hora, personas, líneas del pedido y tokens.
  const web3 = new Function('DB', trozo + '; return {cifrarSolicitud};')({business: {reqPub: espejo.reqPub, reqPubV: espejo.reqPubV}});
  const ped = {type:'pedido', tipo:'delivery', clienteNombre:'Luis', items:[{platoId:5, name:'Hamburguesa trufada', price:12.5, qty:2}], total:25, date:'2026-12-02', time:'21:15', clientRef:'REFsecreto123456', createdAt:'x'};
  const cif3 = await web3.cifrarSolicitud(ped), plano3 = await descifrarSolicitud(cif3);
  const res3 = await web3.cifrarSolicitud(Object.assign({}, req, {resToken:'TOKENreserva123456'}));
  // una app ANTERIOR (sin reqPubV) no conoce los campos nuevos: la web no los cifra, o los perdería al abrirlos
  const webViejo = new Function('DB', trozo + '; return {cifrarSolicitud};')({business: {reqPub: espejo.reqPub}});
  const cifViejo = await webViejo.cifrarSolicitud(ped);
  return {v2: espejo.reqPubV, cif3, plano3, json3: JSON.stringify(cif3), json3b: JSON.stringify(res3), cifViejo, creada, espejoLlevaPriv: !!espejo.reqPriv, espejoLlevaPub: !!espejo.reqPub, cif, plano, sin, recibido, json: JSON.stringify(cif)};
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
await caso('v2: la app lo anuncia y la web cifra líneas del pedido, fecha, hora, importes y tokens; solo type y createdAt quedan en claro', async () => {
  assert.equal(r.v2, 2);
  for(const dato of ['Hamburguesa', 'REFsecreto', '21:15', '2026-12-02']) assert.ok(!r.json3.includes(dato), 'se ve «' + dato + '» en claro');
  assert.ok(!r.json3b.includes('TOKENreserva'), 'el token de la reserva sigue en claro');
  assert.equal(r.cif3.type, 'pedido'); assert.equal(r.cif3.createdAt, 'x'); assert.equal(r.cif3.items, undefined); assert.equal(r.cif3.date, undefined);
});
await caso('v2: la app recupera EXACTAMENTE lo cifrado (líneas, total, fecha, hora, token)', async () => {
  assert.deepEqual(r.plano3.items, [{platoId:5, name:'Hamburguesa trufada', price:12.5, qty:2}]); assert.equal(r.plano3.total, 25);
  assert.equal(r.plano3.date, '2026-12-02'); assert.equal(r.plano3.time, '21:15'); assert.equal(r.plano3.clientRef, 'REFsecreto123456'); assert.equal(r.plano3.clienteNombre, 'Luis');
});
await caso('Una app anterior (sin reqPubV) sigue recibiendo líneas y fecha en claro: nada se pierde', async () => {
  assert.ok(r.cifViejo.items && r.cifViejo.date === '2026-12-02' && r.cifViejo.enc);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Solicitudes cifradas: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
