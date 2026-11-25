// Auditoría 25/11, hallazgo 6: el generador guardaba el PIN del cliente EN CLARO en gastrogoan/adminSalesLog (y en localStorage).
// Ahora el PIN se enseña UNA vez al emitirlo y no se guarda en ningún sitio; la cuenta se puede borrar con su authKey; lo antiguo se limpia
// con confirmación. Falla con el generador anterior (el PIN iba dentro de lo que se escribe en la nube).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const b = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const p = await b.newPage(); await p.setViewport({width: 900, height: 900});
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setRequestInterception(true); p.on('request', r => /gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
await p.goto('http://localhost:8950/generador-licencias.html');
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
// Una «nube» de mentira que apunta todo lo que se escribe.
await p.evaluate(() => {
  window.__nube = [];
  adminUser = {email: 'gastrogoan@gmail.com'};
  window.getApp = () => ({database: () => ({ref: ruta => ({
    set: async v => { __nube.push({op: 'set', ruta, v: JSON.parse(JSON.stringify(v))}); },
    update: async v => { __nube.push({op: 'update', ruta, v: JSON.parse(JSON.stringify(v))}); },
    remove: async () => { __nube.push({op: 'remove', ruta}); },
    transaction: async fn => { const r = fn(null); __nube.push({op: 'tx', ruta}); return {committed: r !== undefined}; },
    once: async () => ({val: () => null, exists: () => false}),
  })})});
  window.confirm = () => true; window.alert = m => { (window.__alertas = window.__alertas || []).push(m); };
  document.getElementById('login-gate').classList.add('hidden'); document.getElementById('panel').classList.remove('hidden');
  sales.length = 0;
});
let pin1;
await caso('Emitir una cuenta: el PIN se ve UNA vez en pantalla y NO se guarda ni en la nube ni en el navegador', async () => {
  await p.evaluate(() => { openAgregarUsuario(); document.getElementById('nu-name').value = 'Casa Paco Prueba'; document.getElementById('nu-email').value = 'a@b.es'; });
  await p.evaluate(() => crearNuevoUsuario());
  const r = await p.evaluate(() => ({nu: document.getElementById('nu-key').textContent, nube: JSON.stringify(__nube), ls: localStorage.getItem(LOG_KEY), entrada: sales[0], lista: document.getElementById('folders').textContent}));
  pin1 = (r.nu.match(/PIN:\s*(\S+)/) || [])[1];
  assert.ok(pin1 && pin1.length >= 6, 'no enseña el PIN al emitirlo: ' + r.nu);
  // El PIN sí viaja una vez dentro del mensaje que se le da al cliente (en pantalla), nunca a lo que se escribe.
  const escrituras = JSON.parse(r.nube).filter(x => x.ruta && x.ruta.includes('adminSalesLog'));
  assert.ok(escrituras.length, 'no se registró la venta');
  for(const e of escrituras) assert.ok(!JSON.stringify(e.v).includes(pin1), 'el PIN va en claro a adminSalesLog: ' + JSON.stringify(e.v));
  assert.ok(!(r.ls || '').includes(pin1), 'el PIN queda en claro en localStorage');
  assert.ok(!('pin' in r.entrada), 'la entrada conserva un campo pin');
  assert.ok(r.entrada.authKey && r.entrada.authKey.length >= 16, 'sin authKey no se podrá borrar la cuenta');
  assert.equal(r.entrada.pinPista, '···' + pin1.slice(-2));
  return 'PIN visible una vez · en la nube solo authKey + pista';
});
await caso('Mientras esta pestaña siga abierta, «Copiar» y la bienvenida llevan el PIN; al recargar solo queda la pista', async () => {
  const antes = await p.evaluate(() => ({msg: altaBienvenidaTexto('casapacoprueba'), lista: document.getElementById('folders').textContent}));
  assert.ok(antes.msg.includes(pin1), 'la bienvenida recién emitida no lleva el PIN');
  await p.evaluate(() => { for(const k of Object.keys(pinsRecientes)) delete pinsRecientes[k]; renderFolders(); });   // = recargar la página
  const despues = await p.evaluate(() => ({msg: altaBienvenidaTexto('casapacoprueba'), lista: document.getElementById('folders').textContent}));
  assert.ok(!despues.msg.includes(pin1) && !despues.lista.includes(pin1), 'el PIN sigue visible tras olvidarlo');
  assert.ok(despues.lista.includes('···' + pin1.slice(-2)), 'no queda ni la pista');
});
await caso('Nuevo PIN: otro PIN visible una vez, sin guardarlo; y «Borrar cuenta» elimina TODOS los accesos conocidos', async () => {
  await p.evaluate(() => { __nube.length = 0; return hacerResetPin('casapacoprueba'); });
  const r = await p.evaluate(() => ({nube: JSON.stringify(__nube), pin2: pinsRecientes.casapacoprueba, nAcc: sales.filter(s => s.kind === 'cuenta' && s.authKey).length, claves: sales.filter(s => s.authKey).map(s => s.authKey)}));
  assert.ok(r.pin2 && r.pin2 !== pin1 && !r.nube.includes(r.pin2), 'el PIN nuevo se escribió en claro');
  assert.equal(r.nAcc, 2);
  await p.evaluate(() => { __nube.length = 0; return borrarCuenta('casapacoprueba'); });
  const del = await p.evaluate(() => __nube.filter(x => x.op === 'remove').map(x => x.ruta));
  for(const k of r.claves) assert.ok(del.some(x => x.endsWith('ownerAuth/' + k)), 'no se borró el acceso ' + k + ': ' + JSON.stringify(del));
  assert.ok(del.some(x => x.endsWith('ownerNames/casapacoprueba')), 'no se liberó el nombre');
});
await caso('Lo antiguo (PIN en claro ya guardado): el panel lo avisa y, con confirmación, lo borra de la nube y de aquí conservando la clave y la pista', async () => {
  const r = await p.evaluate(async () => {
    sales.length = 0; __nube.length = 0;
    sales.push({id: 'v1', kind: 'cuenta', value: 'viejo', pin: 'ZK49QP', owner: 'viejo', date: '2026-10-01'}, {id: 'v2', kind: 'negocio', value: 'CODE1234', owner: 'viejo', date: '2026-10-02'});
    saveSales(); renderFolders();
    const aviso = document.getElementById('folders').textContent;
    const esperada = ggOwnerAuthKey('viejo', 'ZK49QP');
    let preguntado = 0; window.confirm = () => { preguntado++; return true; };
    await limpiarPinsGuardados();
    return {aviso, esperada, preguntado, ls: localStorage.getItem(LOG_KEY), e: sales[0], nube: __nube, despues: document.getElementById('folders').textContent};
  });
  assert.match(r.aviso, /PIN.*en claro/i, 'no avisa de que hay PIN guardados');
  assert.equal(r.preguntado, 1, 'limpia sin pedir confirmación');
  assert.ok(!r.ls.includes('ZK49QP'), 'el PIN sigue en localStorage');
  assert.equal(r.e.authKey, r.esperada); assert.equal(r.e.pinPista, '···QP'); assert.ok(!('pin' in r.e));
  const up = r.nube.find(x => x.op === 'update' && x.ruta.endsWith('adminSalesLog/v1'));
  assert.ok(up && up.v.pin === null && up.v.authKey === r.esperada, 'no se borró el PIN en la nube: ' + JSON.stringify(r.nube));
  assert.ok(!/en claro/.test(r.despues), 'el aviso no se apaga tras limpiar');
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await b.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el PIN del cliente ya no se guarda en claro');
process.exit(fallos ? 1 : 0);
