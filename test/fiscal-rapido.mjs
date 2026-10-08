// Fiscal (8/10): lo que salió de la auditoría de docs/fiscal/ y ya está aplicado.
// Casos hechos a mano; ver docs/fiscal/*.md.
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISCRAP1', tenantId: ggBizTenantId('FISCRAP1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  const b = DB.business; const out = {};
  b.formaJuridica = 'autonomo'; b.regimenFiscal = 'directa'; b.modalidadDirecta = 'simplificada';
  out.base = irpfActividad(40000);
  b.otrasRentasTitular = 30000; out.conOtras = irpfActividad(40000); b.otrasRentasTitular = null;
  b.hijosTitular = 2; out.conHijos = irpfActividad(40000); b.hijosTitular = null;
  b.inicioActividad20 = true; out.inicio = irpfActividad(40000); b.inicioActividad20 = false;
  b.modalidadDirecta = 'normal'; b.tipoAmortTest = 1;
  out.coefNormal = capexCoefAmort({tipoAmort:'informatica'}); b.modalidadDirecta = 'simplificada'; out.coefSimple = capexCoefAmort({tipoAmort:'informatica'});
  b.formaJuridica = 'cooperativa'; b.coopTipo = 'especial'; b.coopFro = 20; b.coopFep = 5;
  out.coopEsp = impuestoCooperativa(112170, {año:2026, incnAnterior:380000});
  b.coopTipo = 'protegida'; out.coopProt = impuestoCooperativa(112170, {año:2026, incnAnterior:380000});
  out.coopErd = impuestoCooperativa(112170, {año:2026, incnAnterior:2000000});
  out.t26 = tiposIsAño(2026).micro[0]; out.t27 = tiposIsAño(2027).micro[0];
  b.formaJuridica = 'autonomo'; b.regimenFiscal = 'modulos';
  DB.ge.config = DB.ge.config || {};
  DB.ge.config.modulos = {epigrafe:'673.2', titularTrabaja:true, personalOverride:1, asalariadosAnterior:1, kw:10, mesas:8, barra:7, maqB:2, amortizacionAnual:1200, indicePequena:0.9};
  const A = GE.calcModulos(2026); out.modA = A && A.rendimientoAnual;
  DB.ge.config.modulos = {epigrafe:'672', titularTrabaja:true, horasTitular:9, personalOverride:0, kw:25, mesas:24, amortizacionAnual:800, temporadaDias:122, temporadaMesInicio:6, indicePequena:0.7};
  const B = GE.calcModulos(2026); out.modB = B && B.rendimientoAnual; out.modB131 = B && B.pago131Q;
  out.ret1 = GE.retencionIrpfTrabajador(19080, 1240.2, {});
  out.ret0 = GE.retencionIrpfTrabajador(15000, 975, {});
  out.ret2 = GE.retencionIrpfTrabajador(16500, 1072.5, {temporal:true});
  return out;
});
caso('IRPF: otras rentas del titular suben el tipo al que tributa la actividad', () => assert.ok(r.conOtras > r.base * 1.15, `${r.conOtras} vs ${r.base}`));
caso('IRPF: dos hijos bajan la cuota', () => assert.ok(r.conHijos < r.base - 300, `${r.conHijos} vs ${r.base}`));
caso('IRPF: inicio de actividad = 20 % menos de base', () => assert.ok(r.inicio < r.base * 0.88, `${r.inicio} vs ${r.base}`));
caso('Estimación normal usa la tabla del IS (informática 25 %), la simplificada la suya (26 %)', () => { assert.equal(r.coefNormal, 25); assert.equal(r.coefSimple, 26); });
caso('Cooperativa especialmente protegida: 8.081 € (expediente 3 de la auditoría, ±1 %)', () => assert.ok(Math.abs(r.coopEsp - 8081.01) < 81, r.coopEsp));
caso('Cooperativa protegida sin bonificación = el doble', () => assert.ok(Math.abs(r.coopProt - 16162.01) < 162, r.coopProt));
caso('Cooperativa de reducida dimensión (INCN ≥ 1 M€) al 20 % de la base', () => assert.ok(Math.abs(r.coopErd - 95344.5*0.20/2*2) < 10, r.coopErd));
caso('Tipos del IS por año: micro 19 % en 2026 y 17 % en 2027', () => { assert.equal(r.t26, 19); assert.equal(r.t27, 17); });
caso('Retención del trabajador (algoritmo AEAT 2026): camarero de 19.080 € → 7,22 % (auditoría)', () => assert.ok(Math.abs(r.ret1 - 7.22) < 0.05, r.ret1));
caso('Retención: por debajo del límite excluyente es 0 %; temporal con retención baja sube al mínimo del 2 %', () => { assert.equal(r.ret0, 0); assert.equal(r.ret2, 2); });
caso('Módulos A (bar 673.2 con 2 máquinas B, índice 0,9): rendimiento 17.644 € (auditoría, ±2 %)', () => assert.ok(r.modA && Math.abs(r.modA - 17644.29) < 353, r.modA));
caso('Módulos B (cafetería 672 de 122 días): rendimiento 12.150 € y 131 solo en 2T y 3T', () => {
  assert.ok(r.modB && Math.abs(r.modB - 12149.83) < 243, r.modB);
  assert.ok(r.modB131[0] === 0 && r.modB131[3] === 0 && Math.abs(r.modB131[1] - 59.75) < 3 && Math.abs(r.modB131[2] - 183.24) < 6, JSON.stringify(r.modB131));
});
await browser.close();
console.log('\n' + '═'.repeat(64) + '\n' + (fallos ? `❌ ${fallos} fallaron` : `✅ todos los casos de fiscal rápido pasaron (${ok})`));
process.exit(fallos ? 1 : 0);
