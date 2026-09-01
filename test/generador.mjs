// El generador de licencias: emitir está probado desde hace tiempo; lo que
// faltaba —y es lo que se añade aquí— es poder DESHACER una venta.
//
// Sin esto, una devolución, un impago o un error al vender no tenían arreglo:
// el código quedaba emitido para siempre y el cliente dentro. A 5.000
// licencias eso deja de ser un detalle.
//
// ⚠️ Borrar del registro y anular la licencia son cosas DISTINTAS, y
// confundirlas es lo peligroso: lo primero solo limpia tu lista de ventas.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
page.on('dialog', async d => await d.accept('prueba'));
await page.goto('http://localhost:8950/generador-licencias.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1200));

// Firebase de mentira: apunta todo lo que se toca, sin salir a la red.
const fingirPlataforma = () => page.evaluate(()=>{
  window.__ops = [];
  const ref = (ruta) => ({
    set: async (v) => { window.__ops.push(['set', ruta, v]); },
    update: async (v) => { window.__ops.push(['update', ruta, v]); },
    remove: async () => { window.__ops.push(['remove', ruta]); },
    once: async () => ({val: () => null}),
  });
  window.getPlatformFirebaseApp = async () => ({
    auth: () => ({currentUser: {email: 'gastrogoan@gmail.com'}}),
    database: () => ({ref}),
  });
  window.confirm = () => true;
  window.prompt = () => 'devolución';
  window.alert = (m) => { window.__ultimoAviso = m; };
});

await caso('Anular un código lo mata en los TRES sitios', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco', pin:''}];
    saveSales(); renderLog();
    await anularCodigo(0);
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), entrada: sales[0], aviso: window.__ultimoAviso};
  });
  const rutas = r.ops.join(' | ');
  assert.ok(/set gastrogoan\/revokedCodes\/ABCD1234/.test(rutas),
    'tiene que marcarlo como anulado — es lo ÚNICO que bloquea a quien ya lo canjeó: ' + rutas);
  assert.ok(/remove gastrogoan\/issuedCodes\/ABCD1234/.test(rutas),
    'y quitarlo de los emitidos, para que no pueda canjearse: ' + rutas);
  assert.ok(/remove gastrogoan\/codeClaims\/ABCD1234/.test(rutas),
    'y liberar la reserva del código: ' + rutas);
  assert.ok(r.entrada.anulada, 'la venta queda marcada como anulada en el registro');
  assert.equal(r.entrada.motivo, 'devolución', 'con su motivo');
  return 'revokedCodes + issuedCodes + codeClaims';
});

await caso('Se puede deshacer: reactivar un código anulado', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco', anulada:'2026-09-01', motivo:'error'}];
    saveSales(); renderLog();
    await reactivarCodigo(0);
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), entrada: sales[0]};
  });
  const rutas = r.ops.join(' | ');
  assert.ok(/set gastrogoan\/issuedCodes\/ABCD1234/.test(rutas), 'vuelve a los emitidos: ' + rutas);
  assert.ok(/remove gastrogoan\/revokedCodes\/ABCD1234/.test(rutas), 'y se quita el bloqueo: ' + rutas);
  assert.ok(!r.entrada.anulada, 'y deja de figurar como anulada');
  return 'anular el código equivocado tiene arreglo';
});

await caso('Borrar del registro NO anula la licencia, y lo avisa', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    let textoConfirm = '';
    window.confirm = (m) => { textoConfirm = m; return true; };
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco'}];
    saveSales(); renderLog();
    await delSale(0);
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), textoConfirm, quedan: sales.length};
  });
  assert.ok(/NO anula/i.test(r.textoConfirm), 'el aviso debe dejar claro que NO anula: ' + r.textoConfirm);
  assert.equal(r.quedan, 0, 'sí quita la anotación');
  const rutas = r.ops.join(' | ');
  assert.ok(!/issuedCodes|revokedCodes|codeClaims/.test(rutas),
    'pero no puede tocar la licencia: ' + rutas);
  assert.ok(/remove gastrogoan\/adminSalesLog\/v1/.test(rutas), 'solo el registro');
  return 'quita la anotación y deja la licencia en paz';
});

await caso('Borrar una cuenta libera el nombre y quita el acceso', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v2', date:'2026-09-01', name:'Casa Paco', kind:'cuenta', value:'casapaco', owner:'casapaco', pin:'A1B2C3'}];
    saveSales(); renderLog();
    await borrarCuenta(0);
    const esperado = ggOwnerAuthKey('casapaco', 'A1B2C3');
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), esperado, entrada: sales[0]};
  });
  const rutas = r.ops.join(' | ');
  assert.ok(rutas.includes('remove gastrogoan/ownerAuth/' + r.esperado),
    'debe borrar el nodo de la cuenta, que se calcula con usuario+PIN: ' + rutas);
  assert.ok(/remove gastrogoan\/ownerNames\/casapaco/.test(rutas),
    'y liberar el nombre para poder volver a venderlo: ' + rutas);
  assert.ok(r.entrada.anulada, 'y queda marcada en el registro');
  return 'acceso borrado y nombre liberado';
});

await caso('Sin el PIN, avisa de que solo puede liberar el nombre', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    const avisos = [];
    window.alert = (m) => avisos.push(m);
    sales = [{id:'v3', date:'2026-09-01', name:'Sin pin', kind:'cuenta', value:'sinpin', owner:'sinpin', pin:''}];
    saveSales(); renderLog();
    await borrarCuenta(0);
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), avisos};
  });
  assert.ok(r.avisos.some(a => /sin él no se puede borrar/i.test(a)),
    'tiene que explicar por qué: la cuenta vive en una ruta que se calcula con el PIN');
  assert.ok(!/ownerAuth/.test(r.ops.join(' | ')), 'y no inventarse una ruta');
  assert.ok(/remove gastrogoan\/ownerNames\/sinpin/.test(r.ops.join(' | ')), 'pero sí liberar el nombre');
  return 'dice la verdad de lo que puede y no puede hacer';
});

await caso('La app comprueba los códigos anulados contra la plataforma', async ()=>{
  const fs = await import('node:fs');
  const core = fs.readFileSync('js/core.js','utf8');
  const fn = core.slice(core.indexOf('async function checkLicenseRevocation'));
  const cuerpo = fn.slice(0, fn.indexOf('\nfunction showRevokedGate'));
  assert.ok(/revokedCodes/.test(cuerpo), 'debe mirar la lista de la plataforma');
  assert.ok(/showRevokedGate\(\)/.test(cuerpo), 'y bloquear si el código está ahí');
  assert.ok(/catch/.test(cuerpo), 'fail-open: sin conexión no se bloquea a nadie');
  // La lista de GitHub se conserva como respaldo
  assert.ok(/REVOKED_LIST_URL/.test(cuerpo), 'sin perder la lista de respaldo de GitHub');
  return 'la app se entera, y sin bloquear a nadie por un fallo de red';
});

await caso('Las reglas permiten anular, y solo al administrador', async ()=>{
  const fs = await import('node:fs');
  const s = fs.readFileSync('database.rules.propuesta.json','utf8')
    .replace(/^\s*"\/\/".*$/gm,'').replace(/^\s*\/\/.*$/gm,'');
  const g = JSON.parse(s).rules.gastrogoan;
  assert.ok(/!newData.exists\(\)/.test(g.issuedCodes.$code['.write']),
    'un código emitido tiene que poder BORRARSE (antes era irreversible)');
  assert.ok(/gastrogoan@gmail.com/.test(g.issuedCodes.$code['.write']), 'y solo por el admin');
  assert.ok(g.revokedCodes, 'debe existir el nodo de anulados');
  assert.ok(/gastrogoan@gmail.com/.test(g.revokedCodes.$code['.write']), 'que solo escribe el admin');
  assert.ok(/\$code.length == 8/.test(g.revokedCodes.$code['.read']),
    'y que se lee por código concreto: nadie puede listar los anulados');
  return 'anulable por el admin, no enumerable por nadie';
});

await caso('Ningún error de JavaScript', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|firebase/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
