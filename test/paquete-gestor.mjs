// Paquete para el gestor (5/10): de punta a punta, con el ZIP de verdad.
// Un negocio con tickets, una factura completa, una venta anulada con su
// rectificativa, una compra con foto, un seguro anual con foto y fichajes.
// Se exporta el TRIMESTRE y se abre el ZIP con herramientas reales: el
// Excel tiene que ser un .xlsx válido (XML bien formado, una hoja por
// libro), los CSV tienen que traer F1/F2/R5 y cada foto citada en el libro
// tiene que estar dentro del ZIP con ese nombre exacto.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const scratch = path.join(raiz, 'test', '.scratch-paquete');
fs.rmSync(scratch, {recursive: true, force: true});
fs.mkdirSync(scratch, {recursive: true});

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PAQUETE01', tenantId: ggBizTenantId('PAQUETE01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));

let ok = 0, fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

const y = 2025;
await page.evaluate((y) => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {name:'Bar Prueba', cif:'B12345678', formaJuridica:'sociedad', netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true});
  const foto = () => { const c = document.createElement('canvas'); c.width = 10; c.height = 10; c.getContext('2d').fillRect(0,0,10,10); return c.toDataURL('image/jpeg', 0.7); };
  DB['adj_901'] = {dataUrl: foto(), name:'makro.jpg'};
  DB['adj_902'] = {dataUrl: foto(), name:'seguro.jpg'};
  DB.sales = [
    {id:1, date:`${y}-04-02`, total:110, items:[{name:'a', price:110, qty:1, ivaPct:10}], ticketNum:'T25AAA-000001'},
    {id:2, date:`${y}-04-02`, total:121, items:[{name:'b', price:121, qty:1, ivaPct:21}], ticketNum:'T25AAA-000002'},
    {id:3, date:`${y}-04-10`, total:550, items:[{name:'c', price:550, qty:1, ivaPct:10}], ticketNum:'T25AAA-000003',
      facturaCompleta:{num:'F25AAA-000001', fecha:`${y}-04-10`, nombre:'Eventos SL', nif:'B87654321', direccion:'C/ Mayor 1', sustituye:'T25AAA-000003'}},
    {id:4, date:`${y}-04-15`, total:55, items:[{name:'d', price:55, qty:1, ivaPct:10}], ticketNum:'T25AAA-000004', status:'anulada',
      rectificativa:{num:'R25AAA-000001', fecha:`${y}-05-03`, rectifica:'T25AAA-000004', motivo:'error'}},
  ];
  DB.ge.variables = [{id:11, mes:4, año:y, fecha:`${y}-05-12`, importe:800, iva:10, proveedor:'MAKRO', nifProveedor:'A28647451', numFactura:'MK-778', categoria:'MATERIA PRIMA', facturaId:901}];
  DB.ge.fijos = [{id:21, nombre:'SEGURO DEL LOCAL', importe:1200, iva:21, categoria:'FIJOS', periodicidadMeses:12, mesPago:6, proveedor:'MAPFRE', nifProveedor:'A28141935', facturaId:902}];
  DB.ge.fijosLog = []; DB.ge.capex = []; DB.reservations = []; DB.ge.otrosIngresos = []; DB.ge.vales = [];
  DB.employees = [{id:31, name:'Ana', dni:'12345678Z'}];
  DB.fichajes = [{id:41, employeeId:31, fecha:`${y}-04-03`, entrada:`${y}-04-03T08:00:00Z`, salida:`${y}-04-03T16:00:00Z`}];
}, y);

await caso('Emitidas: tickets en asiento resumen (F2), factura completa (F1) con el cliente y rectificativa (R5) en su fecha', async () => {
  const r = await page.evaluate((y) => GE.hojaEmitidas({desde:`${y}-04-01`, hasta:`${y}-06-30`, nombre:'2T'}).filas.slice(3).filter(f => f.length > 4), y);
  const f2 = r.filter(f => f[3] === 'F2'), f1 = r.find(f => f[3] === 'F1'), r5 = r.find(f => f[3] === 'R5');
  assert.ok(f1 && f1[8] === 'B87654321' && f1[9] === 'Eventos SL', 'falta la F1 con el cliente');
  assert.ok(r5 && r5[2] === `${y}-05-03` && r5[10] < 0, 'falta la R5 en negativo el día de la anulación');
  // Una línea por día, serie y TIPO de IVA (art. 63.4 RIVA): el 1 va al 10%
  // y el 2 al 21%, así que son dos líneas del mismo día.
  const dia = f2.filter(f => f[2] === `${y}-04-02`);
  assert.equal(dia.length, 2, 'el 2/4 debería tener una línea por tipo: '+JSON.stringify(dia));
  assert.ok(dia.some(f => f[11] === '10%' && f[5] === '000001' && f[10] === 100), 'línea del 10%');
  assert.ok(dia.some(f => f[11] === '21%' && f[5] === '000002' && f[12] === 21), 'línea del 21%');
  assert.ok(!f2.some(f => f[5] === '000003'), 'el ticket sustituido por la factura completa no puede contar dos veces');
});

let zipPath;
await caso('Descargar el trimestre: un ZIP válido con Excel, CSV, fotos y LÉEME', async () => {
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {behavior:'allow', downloadPath: scratch});
  await page.evaluate((y) => {
    GE.openExportModal();
    document.getElementById('pg-tipo').value = 'trimestre'; GE.pgTipoCambia();
    document.getElementById('pg-anyo').value = String(y);
    document.getElementById('pg-trim').value = '1';
    return GE.descargarPaqueteGestor();
  }, y);
  await new Promise(r => setTimeout(r, 1500));
  const f = fs.readdirSync(scratch).find(x => x.endsWith('.zip'));
  assert.ok(f, 'no se descargó el ZIP');
  zipPath = path.join(scratch, f);
  execSync(`unzip -t "${zipPath}"`, {stdio:'pipe'});
  const l = execSync(`unzip -l "${zipPath}"`, {encoding:'utf8'});
  assert.ok(/contabilidad_Bar_Prueba_2025-2T\.xlsx/.test(l), 'falta el Excel:\n'+l);
  assert.ok(/LEEME\.txt/.test(l) && /csv\/01_/.test(l), 'faltan LÉEME o CSV:\n'+l);
  assert.ok(/facturas\/recibidas\/2025-05-12_MAKRO_MK_778/.test(l), 'falta la foto de la compra con nombre ordenado:\n'+l);
  assert.ok(/facturas\/recibidas\/2025-06-01_MAPFRE/.test(l), 'falta la foto del seguro anual en el mes de su factura:\n'+l);
  return f;
});

await caso('El Excel es un .xlsx de verdad: XML bien formado y una hoja por libro', async () => {
  const dir = path.join(scratch, 'x'); fs.mkdirSync(dir, {recursive:true});
  execSync(`cd "${dir}" && unzip -o -q "${zipPath}"`);
  const xlsx = fs.readdirSync(dir).find(x => x.endsWith('.xlsx'));
  const out = execSync(`python3 - "${path.join(dir, xlsx)}" <<'PY'
import sys, zipfile, xml.dom.minidom as m
z = zipfile.ZipFile(sys.argv[1])
for n in z.namelist():
    if n.endswith('.xml') or n.endswith('.rels'): m.parseString(z.read(n))
wb = m.parseString(z.read('xl/workbook.xml'))
print('|'.join(s.getAttribute('name') for s in wb.getElementsByTagName('sheet')))
PY`, {encoding:'utf8'}).trim();
  assert.ok(/Facturas emitidas/.test(out) && /Facturas recibidas/.test(out) && /Registro de jornada/.test(out), 'hojas: '+out);
  return out;
});

await caso('Cada foto que cita el libro de recibidas está dentro del ZIP con ese nombre', async () => {
  const dir = path.join(scratch, 'x');
  const csv = fs.readdirSync(path.join(dir, 'csv')).find(x => /recibidas/i.test(x));
  const lineas = fs.readFileSync(path.join(dir, 'csv', csv), 'utf8').split(/\r\n/);
  const rutas = lineas.map(l => l.split(';').pop()).filter(x => x.startsWith('facturas/'));
  assert.equal(rutas.length, 2, 'esperaba 2 fotos citadas: '+rutas.join(', '));
  rutas.forEach(r => assert.ok(fs.existsSync(path.join(dir, r)), 'la foto citada no está: '+r));
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
fs.rmSync(scratch, {recursive: true, force: true});
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
