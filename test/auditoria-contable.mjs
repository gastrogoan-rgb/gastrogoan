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

// --- Motor fiscal: lo que diría el gestor ---------------------------------
const base2025 = () => {
  DB.sales = []; DB.reservations = []; DB.ge.capex = []; DB.ge.variables = []; DB.ge.fijosLog = [];
  DB.ge.fijos = [];
};
const venta = (fecha, bruto) => ({id:'v'+fecha+bruto, date:fecha, total:bruto, items:[{name:'x', price:bruto, qty:1, ivaPct:10}]});

await caso('Autónomo: su "sueldo" no es gasto, sale debajo del resultado; la cuota de autónomos sí resta', async () => {
  const r = await page.evaluate((v) => {
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa';
    DB.sales = [{id:'a', date:'2025-03-10', total:11000, items:[{name:'x', price:11000, qty:1, ivaPct:10}]}];
    DB.reservations = []; DB.ge.capex = []; DB.ge.fijosLog = [];
    DB.ge.fijos = [
      {id:1, nombre:'RETRIBUCIÓN EMPRESARIO', importe:2000, categoria:'PERSONAL', periodicidadMeses:1},
      {id:2, nombre:'CUOTA AUTÓNOMOS (RETA)', importe:300, categoria:'PERSONAL', periodicidadMeses:1},
    ];
    return GE.resultadoAntesImpMes(2, 2025);
  });
  assert.equal(Math.round(r), 10000 - 300, 'en un autónomo solo resta la cuota: '+r);
});

await caso('Sociedad: el sueldo del administrador sí es gasto', async () => {
  const r = await page.evaluate(() => { DB.business.formaJuridica = 'sociedad'; return GE.resultadoAntesImpMes(2, 2025); });
  assert.equal(Math.round(r), 10000 - 2300);
});

await caso('IRPF por tramos: 30.000 € de beneficio → 5.661 € (5% de difícil justificación y mínimo personal)', async () => {
  const r = await page.evaluate(() => Math.round(irpfActividad(30000)));
  assert.equal(r, 5661);
});

await caso('El impuesto va por AÑO: +5.000 en julio y −3.000 en enero pagan por 2.000, no por 5.000', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'sociedad'; DB.ge.config.pctImpuestoBeneficio = 25;
    DB.ge.fijos = []; DB.ge.fijosLog = []; DB.ge.capex = [];
    DB.ge.fijos = [{id:9, nombre:'ALQUILER', importe:0, categoria:'LOCAL', periodicidadMeses:1, iva:21}];
    DB.ge.variables = [{id:1, mes:0, año:2025, importe:3000, iva:10, concepto:'x', categoria:'OTROS'}];
    DB.sales = [{id:'j', date:'2025-07-10', total:5500, items:[{name:'x', price:5500, qty:1, ivaPct:10}]}];
    let total = 0; for(let m=0;m<12;m++) total += GE.impuestoMes(m, 2025);
    return total;
  });
  assert.equal(Math.round(r), 500, 'impuesto del año: '+r);
});

await caso('Inversiones: la amortización es el gasto (12% al año en maquinaria) y lo de ≤300 € va entero', async () => {
  const r = await page.evaluate(() => {
    DB.ge.capex = [{id:1, descripcion:'HORNO', importe:12000, iva:21, fecha:'2025-01-15', tipoAmort:'maquinaria'},
                   {id:2, descripcion:'BATIDORA', importe:250, iva:21, fecha:'2025-02-03', tipoAmort:'utiles'}];
    return {ene: geAmortizacionMes(2025,0), feb: geAmortizacionMes(2025,1), mar: geAmortizacionMes(2025,2)};
  });
  assert.equal(Math.round(r.ene), 120); assert.equal(Math.round(r.feb), 370); assert.equal(Math.round(r.mar), 120);
});

await caso('Préstamo: solo los intereses son gasto; lo devuelto suma exactamente lo financiado', async () => {
  const r = await page.evaluate(() => {
    DB.ge.capex = [{id:1, descripcion:'COCINA', importe:10000, iva:0, fecha:'2025-01-01', tipoAmort:'maquinaria', financiado:true, cuotas:12, cuotaMensual:880}];
    let i=0, p=0; for(let m=0;m<12;m++){ i += geInteresesMes(2025,m); p += geDevolucionPrestamosMes(2025,m); }
    return {i, p};
  });
  assert.equal(Math.round(r.i), 560); assert.equal(Math.round(r.p), 10000);
});

await caso('Nómina de 14 pagas: el coste de cada mes es el bruto × 14/12 más la SS', async () => {
  const r = await page.evaluate(() => GE.calcNomina(1000, 0, 0, 30, 14));
  assert.equal(Math.round(r.total*100)/100, Math.round(1000*14/12*1.30*100)/100);
});

await caso('Autónomo: pago del 130 = 20% del beneficio acumulado menos lo ya pagado', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa';
    DB.ge.capex = []; DB.ge.variables = []; DB.ge.fijos = []; DB.ge.fijosLog = [];
    DB.sales = [{id:'1', date:'2025-02-10', total:11000, items:[{name:'x', price:11000, qty:1, ivaPct:10}]},
                {id:'2', date:'2025-05-10', total:5500, items:[{name:'x', price:5500, qty:1, ivaPct:10}]}];
    return {t1: GE.pagoACuentaTrimestre(2, 2025), t2: GE.pagoACuentaTrimestre(5, 2025)};
  });
  assert.equal(r.t1.modelo, '130'); assert.equal(Math.round(r.t1.importe), 2000); assert.equal(Math.round(r.t2.importe), 1000);
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
