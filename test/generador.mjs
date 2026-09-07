// El panel de administración: emitir está probado desde hace tiempo; lo que
// faltaba —y es lo que se añade aquí— es poder DESHACER una venta.
//
// Sin esto, una devolución, un impago o un error al vender no tenían arreglo:
// el código quedaba emitido para siempre y el cliente dentro. A 5.000
// licencias eso deja de ser un detalle.
//
// ⚠️ Borrar del registro y quitar el acceso a la licencia son cosas
// DISTINTAS, y confundirlas es lo peligroso: lo primero solo limpia tu
// lista de ventas.
//
// Reescrita cuando el generador plano se rehízo como panel de
// administración completo (carpetas por cliente, calendario de cobros):
// las funciones cambiaron de nombre y de firma (antes operaban sobre el
// ÍNDICE de la lista, ahora sobre el id estable de cada venta, o
// directamente sobre el usuario), pero el comportamiento que hay que
// garantizar es el mismo.
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
// El panel nuevo llama a getApp().database() directamente (ya no pasa por
// getPlatformFirebaseApp, que era del generador viejo), así que lo que hay
// que sustituir aquí es getApp.
const fingirPlataforma = () => page.evaluate(()=>{
  window.__ops = [];
  const ref = (ruta) => ({
    set: async (v) => { window.__ops.push(['set', ruta, v]); },
    update: async (v) => { window.__ops.push(['update', ruta, v]); },
    remove: async () => { window.__ops.push(['remove', ruta]); },
    once: async () => ({val: () => null}),
  });
  // adminUser es un `let` de nivel superior del propio script de la página,
  // no una propiedad de window: hay que asignarlo por su nombre, tal cual,
  // para que las funciones que lo leen (delSale, updateSaleEntry...) lo vean.
  adminUser = {email: 'gastrogoan@gmail.com'};
  window.getApp = () => ({
    auth: () => ({currentUser: {email: 'gastrogoan@gmail.com'}}),
    database: () => ({ref}),
  });
  window.confirm = () => true;
  window.prompt = () => 'devolución';
  window.alert = (m) => { window.__ultimoAviso = m; };
});

await caso('Quitar el acceso a un código lo mata en los TRES sitios', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco', pin:''}];
    saveSales(); renderFolders();
    await quitarAcceso('v1');
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

await caso('Se puede deshacer: restablecer una licencia con el acceso quitado', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco', anulada:'2026-09-01', motivo:'error'}];
    saveSales(); renderFolders();
    await restablecerLicencia('v1');
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), entrada: sales[0]};
  });
  const rutas = r.ops.join(' | ');
  assert.ok(/set gastrogoan\/issuedCodes\/ABCD1234/.test(rutas), 'vuelve a los emitidos: ' + rutas);
  assert.ok(/remove gastrogoan\/revokedCodes\/ABCD1234/.test(rutas), 'y se quita el bloqueo: ' + rutas);
  assert.ok(!r.entrada.anulada, 'y deja de figurar como anulada');
  assert.ok(r.entrada.proximoPago, 'y se le da un próximo cobro nuevo, para que vuelva a aparecer en el calendario');
  return 'quitar el acceso por error tiene arreglo';
});

await caso('Borrar del registro NO quita el acceso a la licencia, y lo avisa', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    let textoConfirm = '';
    window.confirm = (m) => { textoConfirm = m; return true; };
    sales = [{id:'v1', date:'2026-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco'}];
    saveSales(); renderFolders();
    await delSale('v1');
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), textoConfirm, quedan: sales.length};
  });
  assert.ok(/NO revoca ni restablece/i.test(r.textoConfirm), 'el aviso debe dejar claro que NO toca la licencia: ' + r.textoConfirm);
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
    saveSales(); renderFolders();
    await borrarCuenta('casapaco');
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
    saveSales(); renderFolders();
    await borrarCuenta('sinpin');
    return {ops: window.__ops.map(o => o[0] + ' ' + o[1]), avisos};
  });
  assert.ok(r.avisos.some(a => /sin el pin guardado no se ha podido borrar el acceso/i.test(a)),
    'tiene que explicar por qué: la cuenta vive en una ruta que se calcula con el PIN');
  assert.ok(!/ownerAuth/.test(r.ops.join(' | ')), 'y no inventarse una ruta');
  assert.ok(/remove gastrogoan\/ownerNames\/sinpin/.test(r.ops.join(' | ')), 'pero sí liberar el nombre');
  return 'dice la verdad de lo que puede y no puede hacer';
});

await caso('Un código atrasado que se marca cobrado avanza su próximo vencimiento un año', async ()=>{
  await fingirPlataforma();
  const r = await page.evaluate(async ()=>{
    sales = [{id:'v4', date:'2024-09-01', name:'Casa Paco', kind:'negocio', value:'ABCD1234', owner:'casapaco', proximoPago:'2025-09-01'}];
    saveSales();
    const l = findSale('v4');
    await updateSaleEntry(l, {proximoPago: addYearsStr(l.proximoPago, 1)});
    return sales[0].proximoPago;
  });
  assert.equal(r, '2026-09-01', 'debe avanzar exactamente un año desde el vencimiento anterior, no desde hoy');
  return 'el próximo cobro avanza sin desfases de zona horaria';
});

await caso('El generador NO deja crear una licencia sin saber de qué cliente es', async ()=>{
  const fs = await import('node:fs');
  const html = fs.readFileSync('generador-licencias.html','utf8');
  const cabecera = html.slice(html.indexOf('<header>'), html.indexOf('</header>'));
  assert.ok(!/[Nn]ueva licencia/.test(cabecera),
    'la cabecera no puede tener un botón de "nueva licencia" junto al de agregar usuario: ' + cabecera);
  assert.ok(/agregar usuario/i.test(cabecera), 'pero sí el de agregar usuario');
  assert.ok(/folder-body[\s\S]*?openNuevaLicencia/.test(html),
    'el botón de nueva licencia debe estar SOLO dentro de la carpeta de un cliente concreto');
  return 'nueva licencia solo desde dentro de la carpeta de su cliente';
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
