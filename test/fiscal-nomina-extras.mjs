// Fiscal (1/11-26): horas extra y pluses del mes en la nómina.
// Cuentas HECHAS A MANO antes de mirar el código (ver los comentarios de cada caso).
// Regla de la app: las horas extra y los pluses que cotizan suben la base de cotización (con el tope de 5.101,20 €);
// lo que pasa del tope solo paga la solidaridad. El IRPF va al tipo de la nómina (aproximación, lo dice la app).
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISEXT01', tenantId: ggBizTenantId('FISEXT01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const out = {};
  // Ficha de nómina de prueba: bruto 1.500 €/mes en 12 pagas, grupo 7, SS empresa 32,15 %, SS trabajador 6,5 %, IRPF 15 %.
  const base = {brutoMes: 1500, ssPct: 32.15, ssTrabPct: 6.5, irpfPct: 15, grupo: 7, jornada: 100};
  out.A = GE.nominaExtrasMes({horas: 10, precioHora: 10}, base);            // 100 € que cotizan
  out.B = GE.nominaExtrasMes({plusCot: 500}, {...base, brutoMes: 5000});     // tope: 5.000 + 500 = 5.500 > 5.101,20
  out.C = GE.nominaExtrasMes({plusNoCot: 200}, base);                        // plus que no cotiza
  out.D = GE.nominaExtrasMes({}, base);                                      // sin extras
  out.E = GE.nominaExtrasMes({horas: 2.5, precioHora: 13}, base);            // horas decimales: 32,50 €
  out.sinNomina = GE.nominaExtrasMes({horas: 5, precioHora: 10}, {brutoMes: 0, ssPct: 0, ssTrabPct: 0, irpfPct: 0});
  // Negocio de prueba como persona física (autónomo): el titular no cobra nómina.
  DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa';

  // Integración: un empleado con nómina automática y extras en marzo de 2026 (mes index 2).
  DB.ge.fijos = DB.ge.fijos || [];
  DB.ge.fijos.push({id: 990001, nombre:'CAMARERO PRUEBA', categoria:'PERSONAL', importe: 1800, periodicidadMeses: 1, autoCalc: true,
    sueldoBruto: 1500, pagas: 12, ssPct: 32.15, ssTrabPct: 6.5, irpfPct: 15, irpfMensual: 0, grupo: 7, jornada: 100, esTitular: false,
    extrasMes: {'2026-03': {horas: 10, precioHora: 10, plusCot: 0, plusNoCot: 0}}});
  DB.ge.fijos.push({id: 990002, nombre:'AYUDANTE PRUEBA', categoria:'PERSONAL', importe: 900, periodicidadMeses: 1, autoCalc: false, esTitular: false,
    extrasMes: {'2026-03': {horas: 10, precioHora: 10, plusCot: 0, plusNoCot: 0}}});   // sin nómina automática: NO cuenta
  out.perfilPF = fiscalPerfil().personaFisica;
  out.extrasMarzo = geExtrasPersonalMes(2026, 2);
  out.irpfMarzo = geExtrasIrpfMes(2026, 2);
  out.extrasAbril = geExtrasPersonalMes(2026, 3);
  // Diferencia con y sin extras: así no depende de lo que haya en el resto de la base de prueba.
  const emp = DB.ge.fijos.find(x => x.id === 990001);
  const con = {p: geTotalPersonalNetoForMonth(2026, 2), m: geModelo111ForMonth(2026, 2), f: geTotalFijosNetoForMonth(2026, 2)};
  emp.extrasMes = {}; const sin = {p: geTotalPersonalNetoForMonth(2026, 2), m: geModelo111ForMonth(2026, 2), f: geTotalFijosNetoForMonth(2026, 2)};
  emp.extrasMes = {'2026-03': {horas: 10, precioHora: 10, plusCot: 0, plusNoCot: 0}};
  out.difPersonal = con.p - sin.p; out.difModelo111 = con.m - sin.m; out.difFijos = con.f - sin.f;
  // El titular de un autónomo no tiene nómina: sus extras no cuentan.
  DB.ge.fijos.push({id: 990003, nombre:'RETRIBUCIÓN EMPRESARIO', categoria:'PERSONAL', importe: 1500, periodicidadMeses: 1, autoCalc: true, esTitular: true,
    sueldoBruto: 1500, pagas: 12, ssPct: 0, ssTrabPct: 0, irpfPct: 15, grupo: 7, jornada: 100, extrasMes: {'2026-03': {horas: 10, precioHora: 10}}});
  out.titularExtras = geExtrasItemMes(DB.ge.fijos.find(x => x.id === 990003), 2026, 2);
  out.extrasTrasTitular = geExtrasPersonalMes(2026, 2) - out.extrasMarzo;   // solo el titular añadido: debe ser 0
  DB.ge.fijos = DB.ge.fijos.filter(x => ![990001,990002,990003].includes(x.id));
  return out;
});
caso('Sin extras no cambia nada (todo a cero)', () => { assert.equal(r.D.costeEmpresa, 0); assert.equal(r.D.netoDelta, 0); });
// A) 10 h × 10 € = 100 € que cotizan. Base 1.500 → 1.600 (sin tope). SS empresa = 100 × 32,15 % = 32,15 €.
//    Coste = 100 + 32,15 = 132,15 €. IRPF 15 % de 100 = 15 €. SS trabajador 6,5 % de 100 = 6,50 €. Neto = 100 − 6,5 − 15 = 78,50 €.
caso('Horas extra que cotizan: 10 h × 10 € → coste 132,15 € (SS empresa 32,15 €)', () => {
  assert.equal(r.A.total, 100); assert.equal(r.A.ssEmpresaDelta, 32.15); assert.equal(r.A.costeEmpresa, 132.15);
});
caso('Horas extra: IRPF 15 € y neto 78,50 € (SS trabajador 6,50 €)', () => {
  assert.equal(r.A.irpfDelta, 15); assert.equal(r.A.ssTrabDelta, 6.5); assert.equal(r.A.netoDelta, 78.5);
});
// B) Bruto 5.000 + 500 de pluses que cotizan = 5.500. Base sube hasta el tope 5.101,20: +101,20 × 32,15 % = 32,5358.
//    Solidaridad: exceso 398,80 €, todo en el primer tramo (hasta 10 % más = 510,12 €) al 0,96 % = 3,82848 €.
//    SS empresa extra = 32,5358 + 3,82848 = 36,36428 → 36,36 €. Coste = 500 + 36,36 = 536,36 €.
caso('Tope de cotización: 500 € de pluses sobre 5.000 € cuestan 536,36 € (base hasta 5.101,20 € + solidaridad)', () => {
  assert.equal(r.B.ssEmpresaDelta, 36.36); assert.equal(r.B.costeEmpresa, 536.36);
});
// C) Plus de 200 € que NO cotiza: no sube la base. Coste = 200 €. IRPF 30 €. Neto 170 €.
caso('Plus que no cotiza: coste igual al plus, sin SS, con IRPF', () => {
  assert.equal(r.C.ssEmpresaDelta, 0); assert.equal(r.C.costeEmpresa, 200); assert.equal(r.C.irpfDelta, 30); assert.equal(r.C.netoDelta, 170);
});
// E) 2,5 h × 13 € = 32,50 € que cotizan → SS 32,5 × 32,15 % = 10,44875 → coste 32,50 + 10,45 = 42,95 €.
caso('Horas decimales: 2,5 h × 13 € = 32,50 € de extras (coste 42,95 €)', () => {
  assert.equal(r.E.total, 32.5); assert.equal(r.E.costeEmpresa, 42.95);
});
caso('Sin nómina de convenio las extras se cuentan tal cual (sin SS si el % es 0)', () => {
  assert.equal(r.sinNomina.total, 50); assert.equal(r.sinNomina.costeEmpresa, 50);
});
caso('Integración: extras de marzo = 132,15 € de coste; el empleado sin nómina automática NO cuenta', () => {
  assert.equal(r.extrasMarzo, 132.15);
});
caso('Integración: el IRPF de los extras (15 €) entra en el Modelo 111 de ese mes', () => {
  assert.equal(r.irpfMarzo, 15); assert.ok(Math.abs(r.difModelo111 - 15) < 0.005, r.difModelo111);
});
caso('Integración: el coste de personal y el total de fijos del mes suben exactamente 132,15 €', () => {
  assert.ok(Math.abs(r.difPersonal - 132.15) < 0.005, r.difPersonal);
  assert.ok(Math.abs(r.difFijos - 132.15) < 0.005, r.difFijos);
});
caso('Integración: en un mes sin extras no cambia el personal', () => assert.equal(r.extrasAbril, 0));
caso('El titular de un autónomo no tiene nómina: sus extras no cuentan', () => {
  assert.equal(r.perfilPF, true, 'el negocio de prueba debe ser persona física');
  assert.equal(r.titularExtras, null); assert.equal(r.extrasTrasTitular, 0);
});
// Guardar la ficha de un empleado NO puede borrar los meses de horas extra ya anotados (saveGF recrea el objeto).
const guardado = await page.evaluate(() => {
  DB.ge.fijos = DB.ge.fijos || [];
  DB.ge.fijos.push({id: 990010, nombre:'GUARDAR PRUEBA', categoria:'PERSONAL', importe: 1800, periodicidadMeses: 1, autoCalc: true, esTitular: false,
    sueldoBruto: 1500, sueldoNeto: 1200, pagas: 12, irpfPct: 15, ssTrabPct: 6.5, ssPct: 32.15, grupo: 7, jornada: 100,
    extrasMes: {'2026-01': {horas: 5, precioHora: 10, plusCot: 0, plusNoCot: 0}}});
  GE.editGF(990010);
  document.getElementById('gf-ex-mes').value = '2026-03';
  GE.gfExtrasCargarMes();
  document.getElementById('gf-ex-horas').value = '10';
  document.getElementById('gf-ex-precio').value = '10';
  GE.saveGF();
  const it = DB.ge.fijos.find(x => x.id === 990010);
  const mapa = it ? it.extrasMes : null;
  DB.ge.fijos = DB.ge.fijos.filter(x => x.id !== 990010);
  return mapa;
});
caso('Guardar la ficha conserva los meses ya anotados (enero) y añade marzo', () => {
  assert.ok(guardado, 'el gasto tiene que existir tras guardar');
  assert.deepEqual(guardado['2026-01'], {horas: 5, precioHora: 10, plusCot: 0, plusNoCot: 0});
  assert.deepEqual(guardado['2026-03'], {horas: 10, precioHora: 10, plusCot: 0, plusNoCot: 0});
});
console.log(fallos ? `\n${fallos} de ${ok + fallos} casos fallaron` : `\nlos ${ok} casos pasaron (horas extra y pluses: cuentas a mano)`);
await browser.close();
process.exit(fallos ? 1 : 0);
