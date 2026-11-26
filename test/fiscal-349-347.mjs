// Fiscal (1/11-26): 349 (intracomunitarias), comisiones de delivery en el 347 y avisos de módulos.
// Cuentas HECHAS A MANO: los importes de cada caso están escritos aquí antes de mirar el resultado.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, fallos = 0;
function caso(n, fn){ try{ fn(); ok++; console.log('✅ '+n); }catch(e){ fallos++; console.log('❌ '+n+'\n   '+(e.message||e)); } }
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FIS349X1', tenantId: ggBizTenantId('FIS349X1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const out = {};
  // 1) Identificación del NIF-IVA de la UE (España no cuenta; sin NIF no se supone nada).
  out.pre = {
    fr: GE.nifPrefijoUE('FR12345678901'), de: GE.nifPrefijoUE('DE 123456789'), el: GE.nifPrefijoUE('EL123456789'),
    es: GE.nifPrefijoUE('ESB12345678'), cif: GE.nifPrefijoUE('B12345678'), vacio: GE.nifPrefijoUE(''),
    uk: GE.nifPrefijoUE('GB123456789'), us: GE.nifPrefijoUE('US12345'), xi: GE.nifPrefijoUE('XI123456789'),
  };
  // 2) 349 con la hoja de facturas recibidas (misma forma que hojaRecibidas): base SIN IVA por trimestre.
  const cab = t('pg.c.ejercicio');
  const comision = t('pg.concepto.comision');
  const fila = (trim, fecha, nif, nombre, concepto, base) => [2026, trim, fecha, 'F', nif, nombre, concepto, base, '21%', 0, 0, 0, base, 'N', 'N', ''];
  out.hR = {nombre:'x', cabecera:2, filas: [['t'], [], [cab, 'Trim', 'Fecha', 'Nº', 'NIF', 'Nombre', 'Concepto', 'Base', 'IVA', 'Cuota', 'Ded', 'Ret', 'Total', 'Inv', 'ISP', 'Arch'],
    fila('2026-1T', '2026-02-03', 'FR12345678901', 'VINS DUPONT', 'Vino', 1000),
    fila('2026-1T', '2026-03-03', 'FR12345678901', 'VINS DUPONT', 'Vino', 500),
    fila('2026-2T', '2026-05-03', 'DE123456789', 'WURST GMBH', 'Embutido', 300),
    fila('2026-1T', '2026-02-10', 'B12345678', 'PROVEEDOR ESP', 'Pan', 800),
    fila('2026-1T', '2026-02-12', '', 'SIN NIF SL', 'Cosas', 100),
    fila('2026-1T', '2026-02-13', '', 'Glovo', comision, 50),
  ]};
  const h = GE.hoja349(out.hR);
  out.filas349 = h.filas;
  // 3) 347: comisiones de delivery son operaciones con la plataforma (IVA incluido; ISP, base).
  DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa';
  DB.business.deliveryPlatforms = [
    {id: 1, nombre: 'Glovo', nif: 'A12345678', comisionPct: 30, ivaPct: 21, isp: false, facturaReal: false},
    {id: 2, nombre: 'Uber Eats', nif: '', comisionPct: 30, ivaPct: 21, isp: false, facturaReal: false},
    {id: 3, nombre: 'Just Eat', nif: '', comisionPct: 30, ivaPct: 21, isp: true, facturaReal: false},
  ];
  const venta = (id, date, plat, comisionPlataforma, extra={}) => ({id, date, total: 100, status: 'cobrada', items: [], pagos: [], plataforma: plat, comisionPlataforma, ...extra});
  const gl = {id: 1, nombre:'Glovo', ivaPct: 21, isp: false, facturaReal: false};
  DB.sales = DB.sales || [];
  DB.sales.push(
    venta(901001, '2026-02-10', gl, 2000),          // Glovo T1: 2.000 con IVA
    venta(901002, '2026-05-10', gl, 1500),          // Glovo T2: 1.500  → total 3.500 > 3.005,06 → sale en el 347
    venta(901003, '2026-03-05', {id: 2, nombre:'Uber Eats', ivaPct: 21, isp: false, facturaReal: false}, 2000),   // 2.000 < umbral: no sale
    venta(901004, '2026-04-01', gl, 9999, {}),      // se cambia abajo a factura real
    venta(901005, '2026-06-01', {id: 3, nombre:'Just Eat', ivaPct: 21, isp: true, facturaReal: false}, 1210),
    venta(901006, '2026-06-02', {id: 3, nombre:'Just Eat', ivaPct: 21, isp: true, facturaReal: false}, 1210),
    venta(901007, '2026-06-03', {id: 3, nombre:'Just Eat', ivaPct: 21, isp: true, facturaReal: false}, 1210),
    venta(901008, '2026-06-04', {id: 3, nombre:'Just Eat', ivaPct: 21, isp: true, facturaReal: false}, 1210),
  );
  // La venta de abril se marca como factura REAL de la plataforma (va en Gastos Variables): no cuenta en el 347 como estimación.
  DB.sales.find(s => s.id === 901004).plataforma = {...gl, facturaReal: true};
  const rows = GE.resumenAño(2026);
  out.glovo = rows.find(x => x[0] === 'Glovo');
  out.uber = rows.find(x => x[0] === 'Uber Eats');
  out.justeat = rows.find(x => x[0] === 'Just Eat');
  // 4) Avisos: plataformas sin NIF (Uber Eats y Just Eat) y, con módulos, lo que la app no hace.
  const p = {desde: '2026-01-01', hasta: '2026-12-31', nombre: 'Prueba'};
  out.avisosRegimen = GE.hojaAvisos(p, {filas: []}, {filas: []}).filas;
  DB.business.regimenFiscal = 'modulos';
  DB.ge.otrosIngresos = [{id: 1, tipo: 'subvencion', fecha: '2026-04-01', base: 500}];
  out.avisosModulos = GE.hojaAvisos(p, {filas: []}, {filas: []}).filas;
  DB.ge.otrosIngresos = [];
  return out;
});
const aviso = (filas, texto) => filas.find(f => String(f[0] || '').includes(texto));
caso('NIF-IVA de la UE: FR, DE y EL (Grecia) cuentan; GB, US, XI y el NIF español no', () => {
  assert.equal(r.pre.fr, 'FR'); assert.equal(r.pre.de, 'DE'); assert.equal(r.pre.el, 'EL');
  assert.equal(r.pre.es, null); assert.equal(r.pre.cif, null); assert.equal(r.pre.vacio, null);
  assert.equal(r.pre.uk, null); assert.equal(r.pre.us, null); assert.equal(r.pre.xi, null);
});
// 349: VINS DUPONT (FR) 1.000 + 500 = 1.500 en 1T. WURST GMBH (DE) 300 en 2T. Base SIN IVA.
// Fuera: B12345678 (español), la compra sin NIF (se avisa) y la comisión de Glovo (va en el 347, no aquí).
caso('349: el proveedor francés suma 1.000 + 500 = 1.500 € de base en el 1T', () => {
  const row = r.filas349.find(f => f[1] === 'FR12345678901');
  assert.ok(row, JSON.stringify(r.filas349));
  assert.equal(row[2], 1500); assert.equal(row[4], 1500);
});
caso('349: el alemán va en el 2T con 300 €; el español y la comisión NO salen', () => {
  const row = r.filas349.find(f => f[1] === 'DE123456789');
  assert.ok(row); assert.equal(row[3], 300); assert.equal(row[4], 300);
  assert.ok(!r.filas349.some(f => f[1] === 'B12345678'));
});
caso('349: la compra sin NIF se avisa (1) y no se supone de ningún país', () => {
  const av = r.filas349.find(f => f[1] === 1 && String(f[0]).length > 0);
  assert.ok(av, JSON.stringify(r.filas349.slice(-3)));
});
// 347: Glovo = 2.000 (T1) + 1.500 (T2) = 3.500, con su NIF. La venta con factura real (9.999) NO se cuenta.
caso('347: Glovo suma sus comisiones estimadas (3.500 €) con su NIF; la factura real no se cuenta dos veces', () => {
  assert.ok(r.glovo, 'Glovo tiene que estar en el 347');
  assert.equal(r.glovo[1], 'A12345678'); assert.equal(r.glovo[2], 2000); assert.equal(r.glovo[3], 1500); assert.equal(r.glovo[6], 3500);
});
// Uber Eats: 2.000 < 3.005,06 → no sale en el 347 (el umbral sí se aplica).
caso('347: Uber Eats (2.000 €) está por debajo del umbral y no sale', () => assert.equal(r.uber, undefined));
// Just Eat: ISP. Cada comisión 1.210 € con IVA incluido (IVA 21 %) → base 1.000 €; 4 ventas → 4.000 € de BASE > 3.005,06.
caso('347: plataforma con ISP cuenta la BASE (4 × 1.000 € = 4.000 €), no el importe con IVA', () => {
  assert.ok(r.justeat, 'Just Eat tiene que estar en el 347');
  assert.equal(r.justeat[6], 4000);
});
// Avisos: Uber Eats y Just Eat no tienen NIF → 2 plataformas sin NIF; Glovo sí.
caso('Aviso: 2 plataformas de delivery sin NIF (su comisión no sale identificada en el 347)', () => {
  const a = aviso(r.avisosRegimen, 'Plataformas de delivery sin NIF');
  assert.ok(a, JSON.stringify(r.avisosRegimen)); assert.equal(a[1], 2);
});
caso('Módulos: avisa de que la app no comprueba el límite de exclusión', () => {
  const a = aviso(r.avisosModulos, 'Módulos: la app no comprueba el límite de exclusión');
  assert.ok(a, JSON.stringify(r.avisosModulos)); assert.equal(a[1], 1);
});
caso('Módulos: avisa de la subvención (fuera del rendimiento de módulos) con su número', () => {
  const a = aviso(r.avisosModulos, 'Subvenciones en módulos');
  assert.ok(a); assert.equal(a[1], 1);
});
caso('Fuera de módulos no sale ningún aviso de módulos', () => {
  assert.equal(aviso(r.avisosRegimen, 'Módulos: la app no comprueba'), undefined);
});
console.log(fallos ? `\n${fallos} de ${ok + fallos} casos fallaron` : `\nlos ${ok} casos pasaron (349, comisiones en el 347, avisos de módulos: cuentas a mano)`);
await browser.close();
process.exit(fallos ? 1 : 0);
