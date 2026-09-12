// Principio contable pedido por el dueño el 12/09: "todo un gasto o venta
// registrada no se puede modificar". Ni editar ni borrar — se ANULA, y la
// anulación queda a la vista con su motivo y deja de contar, igual que ya
// hacían las ventas. Sin salida de anulación, un cero de más tecleado sin
// querer dejaría la contabilidad mal para siempre, que es peor.
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
}, 'INMUTABLE1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

const sembrar = async () => await page.evaluate(()=>{
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
  const f = `${y}-${String(m+1).padStart(2,'0')}-05`;
  DB.ge = DB.ge || {}; DB.ge.cierres = [];
  DB.ge.variables = [
    {id: 5001, concepto:'Compra a mano', proveedor:'Proveedor manual', categoria:'MATERIA PRIMA',
     importe: 300, iva: 10, fecha: f, mes: m, 'año': y},
    {id: 5002, concepto:'Compras pedido', proveedor:'Proveedor pedido', categoria:'MATERIA PRIMA',
     importe: 700, iva: 10, fecha: f, mes: m, 'año': y, auto: true},
  ];
  saveDB();
  return {y, m};
});

await caso('Un gasto metido a mano ya NO se puede editar: avisa de que hay que anularlo', async () => {
  await sembrar();
  const r = await page.evaluate(async ()=>{
    navigate('economia'); GE.tab('variables');
    await new Promise(r=>setTimeout(r,900));
    let aviso = null;
    const orig = window.showToast; window.showToast = msg => { aviso = msg; };
    GE.editGV(5001);
    window.showToast = orig;
    return {aviso, modalAbierto: !!document.getElementById('gv-importe'),
            importeIntacto: DB.ge.variables.find(v=>v.id===5001).importe};
  });
  assert.equal(r.modalAbierto, false, 'no debe abrirse el formulario de edición: ' + JSON.stringify(r));
  assert.ok(r.aviso, 'debe explicar por qué, no fallar en silencio: ' + JSON.stringify(r));
  assert.equal(r.importeIntacto, 300, 'y el importe no se toca');
});

await caso('Ya no existe ninguna función para borrar un gasto (ni a mano ni de pedido)', async () => {
  const r = await page.evaluate(()=>({
    borrarSuelto: typeof GE.deleteGV, borrarGrupo: typeof GE.deleteGVGroup,
    anularSuelto: typeof GE.anularGV, anularGrupo: typeof GE.anularGVGroup,
  }));
  assert.equal(r.borrarSuelto, 'undefined', 'GE.deleteGV no debe existir: ' + JSON.stringify(r));
  assert.equal(r.borrarGrupo, 'undefined', 'GE.deleteGVGroup no debe existir: ' + JSON.stringify(r));
  assert.equal(r.anularSuelto, 'function', 'sí debe existir la anulación: ' + JSON.stringify(r));
  assert.equal(r.anularGrupo, 'function', 'y la de un pedido entero: ' + JSON.stringify(r));
});

await caso('Anular un gasto exige motivo y PIN, lo conserva tachado y deja de contar', async () => {
  const {y, m} = await sembrar();
  const r = await page.evaluate(async (y, m)=>{
    navigate('economia'); GE.tab('variables');
    await new Promise(r=>setTimeout(r,700));
    const antes = Math.round(geTotalVariablesNetoMes(y, m));
    // El motivo se pide con promptText y el PIN con requestBusinessPinAction:
    // se responden aquí para poder recorrer el flujo entero sin interfaz.
    window.promptText = async () => 'Me equivoqué de importe';
    window.requestBusinessPinAction = (titulo, texto, cb) => cb('__TEST__');
    window.accionSensibleAutorizada = () => true;
    await GE.anularGV(5001);
    await new Promise(r=>setTimeout(r,400));
    const v = DB.ge.variables.find(x=>x.id===5001);
    return {
      antes, despues: Math.round(geTotalVariablesNetoMes(y, m)),
      sigueEnLosLibros: !!v, anulado: !!(v&&v.anulado), motivo: v&&v.anuladoMotivo,
      tieneFecha: !!(v&&v.anuladoAt),
      seVeTachado: document.getElementById('gv-list').innerHTML.includes('line-through'),
    };
  }, y, m);
  assert.equal(r.antes, 1000, 'de partida, los dos gastos suman 1.000 €');
  assert.ok(r.sigueEnLosLibros, 'el gasto NO se borra de los libros: ' + JSON.stringify(r));
  assert.ok(r.anulado, 'queda marcado como anulado: ' + JSON.stringify(r));
  assert.equal(r.motivo, 'Me equivoqué de importe', 'con el motivo guardado: ' + JSON.stringify(r));
  assert.ok(r.tieneFecha, 'y la fecha de la anulación: ' + JSON.stringify(r));
  assert.equal(r.despues, 700, 'deja de contar en el total del mes (1.000 − 300): ' + JSON.stringify(r));
  assert.ok(r.seVeTachado, 'y se sigue viendo, tachado, en la lista: ' + JSON.stringify(r));
});

await caso('Sin motivo no se anula nada', async () => {
  await sembrar();
  const r = await page.evaluate(async ()=>{
    window.promptText = async () => '   ';
    window.requestBusinessPinAction = (ti, te, cb) => cb('__TEST__');
    window.accionSensibleAutorizada = () => true;
    let aviso = null; const orig = window.showToast; window.showToast = m => { aviso = m; };
    await GE.anularGV(5001);
    window.showToast = orig;
    return {aviso, anulado: !!DB.ge.variables.find(v=>v.id===5001).anulado};
  });
  assert.equal(r.anulado, false, 'sin motivo, el gasto no se anula: ' + JSON.stringify(r));
  assert.ok(r.aviso, 'y se avisa de que falta el motivo: ' + JSON.stringify(r));
});

await caso('Sin el PIN correcto tampoco se anula', async () => {
  await sembrar();
  const r = await page.evaluate(async ()=>{
    window.promptText = async () => 'Intento sin permiso';
    window.requestBusinessPinAction = (ti, te, cb) => cb('0000');
    window.accionSensibleAutorizada = () => false;   // PIN incorrecto
    await GE.anularGV(5001);
    await new Promise(r=>setTimeout(r,300));
    return {anulado: !!DB.ge.variables.find(v=>v.id===5001).anulado};
  });
  assert.equal(r.anulado, false, 'con el PIN mal, el gasto sigue vivo: ' + JSON.stringify(r));
});

await caso('Un gasto de un mes YA CERRADO no se puede ni anular', async () => {
  const {y, m} = await sembrar();
  const r = await page.evaluate(async (y, m)=>{
    DB.ge.cierres = [`${y}-${String(m+1).padStart(2,'0')}`];
    saveDB();
    window.promptText = async () => 'Da igual el motivo';
    window.requestBusinessPinAction = (ti, te, cb) => cb('__TEST__');
    window.accionSensibleAutorizada = () => true;
    let aviso = null; const orig = window.showToast; window.showToast = m2 => { aviso = m2; };
    await GE.anularGV(5001);
    window.showToast = orig;
    DB.ge.cierres = [];
    return {aviso, anulado: !!DB.ge.variables.find(v=>v.id===5001).anulado};
  }, y, m);
  assert.equal(r.anulado, false, 'un mes cerrado no se toca ni para anular: ' + JSON.stringify(r));
  assert.ok(r.aviso, 'y avisa del motivo: ' + JSON.stringify(r));
});

await caso('Una venta cobrada tampoco se puede editar: solo anularse (ya era así)', async () => {
  const r = await page.evaluate(()=>({
    hayEditarVenta: typeof window.editSale !== 'undefined' || typeof window.editarVenta !== 'undefined',
    hayAnularVenta: typeof window.requestCancelSale === 'function',
  }));
  assert.equal(r.hayEditarVenta, false, 'no debe existir forma de editar una venta cobrada');
  assert.ok(r.hayAnularVenta, 'sí la de anularla, con PIN');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
