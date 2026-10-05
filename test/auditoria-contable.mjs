// Auditoría contable de Gestión Económica (5/10): los cuatro hallazgos.
// 1) Pista de IVA del plato (la copa en sala va al 10%).
// 2) El envío a domicilio tributa al 10% (accesorio de la comida), no al 21%.
// 3) La señal tributa el mes en que se cobra, y la venta final la descuenta.
// 4) Retenciones de gastos fijos: alquiler → modelo 115; profesionales → 111.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{ localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_login','1'); });
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof DB!=='undefined' && DB && DB.business);

let ok=0, fallos=0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

await caso('Retención del alquiler (19%) → modelo 115; la del gestor (15%) se suma al 111', async () => {
  const r = await page.evaluate(() => {
    DB.ge = DB.ge || {}; DB.ge.fijosLog = [];
    DB.ge.fijos = [
      {id:1, nombre:'ALQUILER', importe:1000, categoria:'LOCAL', periodicidadMeses:1, iva:21, retencion:'115_19'},
      {id:2, nombre:'GESTORIA', importe:200, categoria:'SERVICIOS', periodicidadMeses:1, iva:21, retencion:'111_15'},
      {id:3, nombre:'LUZ', importe:300, categoria:'SUMINISTROS', periodicidadMeses:1, iva:21},
    ];
    const d = new Date();
    return {r115: geRetencionForMonth(d.getFullYear(), d.getMonth(), '115'), m111: geModelo111ForMonth(d.getFullYear(), d.getMonth()), irpf: geIrpfMensualForMonth(d.getFullYear(), d.getMonth())};
  });
  assert.equal(Math.round(r.r115*100)/100, 190);
  assert.equal(Math.round((r.m111 - r.irpf)*100)/100, 30);
  return `115=${r.r115} · 111 profesionales=${r.m111-r.irpf}`;
});

await caso('El modal de gasto fijo ofrece la retención', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../js/hr.js', import.meta.url),'utf8') + (await import('node:fs')).readFileSync(new URL('../js/tpv.js', import.meta.url),'utf8');
  assert.ok(src.includes('gf-f-ret'), 'el select de retención no está en la app');
});

await caso('Envío a domicilio al 10%', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../js/hr.js', import.meta.url),'utf8') + (await import('node:fs')).readFileSync(new URL('../js/tpv.js', import.meta.url),'utf8');
  assert.ok(src.includes("price: order.costeEnvio, qty: 1, ivaPct: 10"), 'la línea de envío no va al 10%');
  assert.ok(!src.includes("price: order.costeEnvio, qty: 1, ivaPct: 21"));
});

await caso('Pista de IVA en el plato, en los tres idiomas', async () => {
  const r = await page.evaluate(() => ['es','ca','en'].map(l => (I18N[l]||{})['label.ivaPlatoHint']));
  r.forEach(v => assert.ok(v && v.includes('10%') && v.includes('21%'), JSON.stringify(r)));
});

await caso('Señal: su IVA cuenta el mes del cobro y la venta de la cena lo descuenta', async () => {
  const r = await page.evaluate(() => {
    DB.reservations = [{id:'R1', depositConfirmed:true, depositPagoImporte:22, depositPagoFecha:'2026-10-20T10:00:00.000Z'}];
    DB.sales = [{id:'S1', date:'2026-11-03', total:110, items:[{name:'Menú', price:110, qty:1, ivaPct:10}], reservationId:'R1', senal:22, senalPagoFecha:'2026-10-20T10:00:00.000Z'}];
    return {oct: GE.ivaVentasMes ? GE.ivaVentasMes(9,2026) : null, nov: GE.ivaVentasMes ? GE.ivaVentasMes(10,2026) : null};
  });
  assert.equal(Math.round(r.oct*100)/100, 2, 'octubre debería llevar el IVA de la señal (22 → 2 €)');
  assert.equal(Math.round(r.nov*100)/100, 8, 'noviembre: 10 € de la cena menos 2 € ya pagados');
  return `oct ${r.oct.toFixed(2)} · nov ${r.nov.toFixed(2)}`;
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
