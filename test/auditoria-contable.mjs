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
  // Por encima de la base mínima (con 1.000 € la SS iría sobre los 1.424,40 €).
  const r = await page.evaluate(() => GE.calcNomina(2000, 0, 0, 30, 14));
  assert.equal(Math.round(r.total*100)/100, Math.round(2000*14/12*1.30*100)/100);
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

// --- Para el gestor y registro de jornada --------------------------------
await caso('Borrar un empleado NO borra sus fichajes (registro de jornada, 4 años) y salen en el registro del mes', async () => {
  const r = await page.evaluate(() => {
    DB.employees = [{id:77, name:'Ana Pérez', dni:'12345678Z'}];
    DB.fichajes = [{id:1, employeeId:77, fecha:'2025-03-04', entrada:'2025-03-04T08:00:00.000Z', salida:'2025-03-04T16:00:00.000Z'}];
    window.accionSensibleAutorizada = () => true;
    reallyDeleteEmployee(77, '0000');
    const rows = GE.registroJornada(2, 2025);
    return {quedan: DB.fichajes.length, fila: rows[3]};
  });
  assert.equal(r.quedan, 1, 'el fichaje se borró');
  assert.equal(r.fila[1], 'Ana Pérez'); assert.equal(r.fila[2], '12345678Z'); assert.equal(r.fila[5], 8);
});

await caso('Libro de ingresos: asiento resumen por día y tipo, y cuadra con el IVA del mes', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'sociedad'; DB.reservations = [];
    DB.sales = [{id:'1', date:'2025-04-02', total:110, items:[{name:'a', price:110, qty:1, ivaPct:10}]},
                {id:'2', date:'2025-04-02', total:121, items:[{name:'b', price:121, qty:1, ivaPct:21}]},
                {id:'3', date:'2025-04-03', total:55, items:[{name:'a', price:55, qty:1, ivaPct:10}]}];
    const rows = GE.libroIngresos(2025);
    return {filas: rows.slice(3, 6), total: rows[rows.length-1], iva: GE.ivaVentasMes(3, 2025)};
  });
  assert.equal(r.filas.length, 3);
  assert.equal(r.total[5], Math.round(r.iva*100)/100, 'el libro no cuadra con el IVA de la Cuenta de Resultados');
});

await caso('347: sale el proveedor de más de 3.005,06 € con su NIF; el pequeño no', async () => {
  const r = await page.evaluate(() => {
    DB.ge.variables = [
      {id:1, mes:1, año:2025, fecha:'2025-02-10', importe:2000, iva:10, proveedor:'MAKRO', nifProveedor:'A28647451', categoria:'MATERIA PRIMA'},
      {id:2, mes:5, año:2025, fecha:'2025-06-10', importe:1000, iva:10, proveedor:'MAKRO', categoria:'MATERIA PRIMA'},
      {id:3, mes:5, año:2025, fecha:'2025-06-11', importe:500, iva:21, proveedor:'FRUTAS PEPE', categoria:'MATERIA PRIMA'}];
    DB.ge.config.nifProveedores = {MAKRO:'A28647451'};
    const rows = GE.resumenAño(2025);
    const i = rows.findIndex(x => x[0] === 'MAKRO');
    return {makro: rows[i], pepe: rows.some(x => x[0] === 'FRUTAS PEPE')};
  });
  assert.ok(r.makro, 'MAKRO no sale'); assert.equal(r.makro[1], 'A28647451'); assert.equal(r.makro[6], 3300); assert.ok(!r.pepe);
});

// --- Facturación: numeración, factura completa, rectificativa -----------
await caso('Cada ticket lleva número correlativo de su serie; la anulación emite rectificativa', async () => {
  const r = await page.evaluate(() => {
    DB.sales = [];
    const a = {id:1, date:'2026-10-05', total:10, items:[]}, b = {id:2, date:'2026-10-05', total:20, items:[]};
    numerarTicket(a); numerarTicket(b); DB.sales.push(a, b);
    emitirRectificativa(b, 'error de cobro');
    return {a:a.ticketNum, b:b.ticketNum, r:b.rectificativa, txt: buildTicketText(b, {rectificativa:true})};
  });
  const [sa, na] = r.a.split('-'), [sb, nb] = r.b.split('-');
  assert.match(r.a, /^T26[A-Z0-9]{3}-\d{6}$/); assert.equal(sa, sb); assert.equal(+nb, +na + 1);
  assert.match(r.r.num, /^R26/); assert.equal(r.r.rectifica, r.b);
  assert.ok(r.txt.includes(r.r.num) && r.txt.includes(r.b), 'la rectificativa impresa no dice su número y a cuál rectifica');
});

await caso('Factura completa: pide los datos del cliente, va en serie F y dice a qué ticket sustituye', async () => {
  const r = await page.evaluate(() => {
    const s = {id:3, date:'2026-10-05', total:30, items:[{name:'x', price:30, qty:1, ivaPct:10}]};
    numerarTicket(s); DB.sales.push(s);
    window.printTicket = () => {};
    printInvoice(3);
    document.getElementById('fc-nombre').value = 'Talleres Ruiz SL';
    document.getElementById('fc-nif').value = 'b12345678';
    document.getElementById('fc-dir').value = 'C/ Mayor 1, Girona';
    emitirFacturaCompleta(3);
    return {f: s.facturaCompleta, t: s.ticketNum, txt: buildTicketText(s, {factura:true})};
  });
  assert.match(r.f.num, /^F26/); assert.equal(r.f.nif, 'B12345678'); assert.equal(r.f.sustituye, r.t);
  assert.ok(r.txt.includes('Talleres Ruiz SL') && r.txt.includes(r.t));
});

// --- Revisión de la gestoría (5/10, tarde) --------------------------------
const limpio = () => page.evaluate(() => {
  DB.business.formaJuridica = 'sociedad'; DB.business.regimenFiscal = ''; DB.ge.config.pctImpuestoBeneficio = 25;
  DB.sales = []; DB.reservations = []; DB.ge.capex = []; DB.ge.variables = []; DB.ge.fijos = []; DB.ge.fijosLog = [];
  DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.mermas = [];
});

await caso('Anulación en otro trimestre: enero sigue igual y la rectificativa resta en marzo', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.sales = [{id:1, date:'2025-01-15', total:110, items:[{name:'x', price:110, qty:1, ivaPct:10}], status:'anulada', ticketNum:'T25AAA-000001',
      rectificativa:{num:'R25AAA-000001', fecha:'2025-03-10', rectifica:'T25AAA-000001'}}];
    return {ene: GE.ivaVentasMes(0,2025), mar: GE.ivaVentasMes(2,2025)};
  });
  assert.equal(Math.round(r.ene*100)/100, 10); assert.equal(Math.round(r.mar*100)/100, -10);
});

await caso('Seguro anual: su IVA entero el mes de la factura, no 1/12 cada mes', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.ge.fijos = [{id:1, nombre:'SEGURO DEL LOCAL', importe:1200, iva:21, categoria:'FIJOS', periodicidadMeses:12, mesPago:3}];
    return {feb: geIvaSoportadoFijosForMonth(2025,1), mar: geIvaSoportadoFijosForMonth(2025,2), gasto: geTotalFijosNetoForMonth(2025,5)};
  });
  assert.equal(r.feb, 0); assert.equal(Math.round(r.mar), 252); assert.equal(Math.round(r.gasto), 100, 'el GASTO sí se reparte');
});

await caso('Libro de gastos con el alquiler de ESE mes (histórico), no el de hoy', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    const item = (imp) => [{id:1, nombre:'ALQUILER', importe:imp, iva:21, periodicidadMeses:1, c:'FIJOS', proveedor:'INMO SL', nifProveedor:'B11111111'}];
    DB.ge.fijosLog = [{fecha:'2025-01-01', totalNeto:1000, items:item(1000)}, {fecha:'2025-06-01', totalNeto:1200, items:item(1200)}];
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:1200, iva:21, categoria:'FIJOS', periodicidadMeses:1}];
    const rows = GE.libroGastos(2025);
    return rows.filter(x => x[4] === 'ALQUILER' || String(x[4]).includes('ALQUILER')).map(x => [x[0], x[5]]);
  });
  assert.equal(r.find(x => x[0].startsWith('2025-01'))[1], 1000);
  assert.equal(r.find(x => x[0].startsWith('2025-07'))[1], 1200);
});

await caso('347: entra la luz (gasto fijo) y el cliente con facturas completas; 202 suma tres pagos', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.ge.fijos = [{id:1, nombre:'ELECTRICIDAD', importe:300, iva:21, categoria:'FIJOS', periodicidadMeses:1, proveedor:'IBERDROLA', nifProveedor:'A95758389'}];
    DB.sales = [{id:2, date:'2025-05-02', total:4000, items:[{name:'x', price:4000, qty:1, ivaPct:10}], facturaCompleta:{num:'F25AAA-000001', fecha:'2025-05-02', nombre:'EVENTOS SL', nif:'B22222222', direccion:'x'}},
                {id:3, date:'2024-06-01', total:110000, items:[{name:'x', price:110000, qty:1, ivaPct:10}]}];
    const rows = GE.resumenAño(2025);
    const pc = rows.find(x => String(x[0]).includes('(202)'));
    return {luz: rows.find(x => x[0] === 'IBERDROLA'), cli: rows.find(x => x[0] === 'EVENTOS SL'), pc};
  });
  assert.ok(r.luz, 'la luz no sale en el 347'); assert.equal(r.luz[6], 4356);
  assert.ok(r.cli, 'el cliente de 4.000 € no sale en el 347');
  assert.ok(r.pc, 'no sale el 202'); assert.equal(r.pc[1], 0); assert.equal(r.pc[3], 0); assert.equal(Math.round(r.pc[4] / r.pc[2]), 2, 'diciembre y octubre: dos pagos en T4');
});

await caso('Módulos: el IVA de una inversión se recupera aunque haya cuota mínima; minoración por tramos del BOE', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'modulos';
    DB.ge.config.modulos = {epigrafe:'672', mesas:10, kw:20, titularTrabaja:true, personalOverride:4};
    const sin = GE.calcModulos(2025).ivaAnual;
    DB.ge.capex = [{id:1, descripcion:'CAFETERA', importe:10000, iva:21, fecha:'2025-03-01', tipoAmort:'maquinaria'}];
    const con = GE.calcModulos(2025);
    return {sin, con: con.ivaAnual, min: con.minoracionEmpleo};
  });
  assert.equal(Math.round(r.sin - r.con), 2100, 'el IVA de la inversión no se descuenta entero');
  // BOE: 4 personas por tramos = 1×0,10 + 2×0,15 + 1×0,20 = 0,60
  assert.equal(Math.round(r.min), Math.round(0.60 * 1448.68));
});

await caso('Existencias: acabar el mes con más género en el almacén baja el gasto del mes', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.ge.variables = [{id:1, mes:1, año:2025, fecha:'2025-02-10', importe:5000, iva:10, proveedor:'X', categoria:'MATERIA PRIMA'}];
    DB.sales = [{id:1, date:'2025-02-10', total:11000, items:[{name:'x', price:11000, qty:1, ivaPct:10}]}];
    DB.ge.existencias = {'2025-01':{v:2000}, '2025-02':{v:3500}};
    return GE.resultadoAntesImpMes(1, 2025);
  });
  assert.equal(Math.round(r), 10000 - 5000 + 1500);
});

await caso('Plataforma con factura real: la estimación no se resta dos veces; autónomo con 9.000 € tiene la reducción del art. 32.2.3', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.sales = [{id:1, date:'2025-04-01', total:100, items:[], comisionPlataforma:36.3, plataforma:{id:1, ivaPct:21, facturaReal:true}},
                {id:2, date:'2025-04-02', total:100, items:[], comisionPlataforma:36.3, plataforma:{id:1, ivaPct:21}}];
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa'; DB.business.modalidadDirecta = 'simplificada';
    return {com: GE.comisionesMes(3, 2025), irpf9000: irpfActividad(9000), red: reduccionRendimientosBajos(9000)};
  });
  assert.equal(Math.round(r.com*100)/100, 30);
  assert.equal(Math.round(r.red*100)/100, 1215);
});

await caso('Obras en local con 5 años de contrato: 20% al año; vehículo: la mitad del IVA es coste', async () => {
  await limpio();
  const r = await page.evaluate(() => ({
    obras: capexCoefAmort({tipoAmort:'obras', añosContrato:5}),
    coche: capexBaseAmortizable({tipoAmort:'vehiculo', importe:20000, iva:21}),
  }));
  assert.equal(r.obras, 20); assert.equal(r.coche, 22100);
});

await caso('Otros ingresos: una subvención suma al resultado sin IVA; el autoconsumo del titular lleva IVA', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.ge.otrosIngresos = [{id:1, fecha:'2025-06-10', tipo:'subvencion', base:3000, iva:0}, {id:2, fecha:'2025-06-12', tipo:'maquinas', base:100, iva:21}];
    DB.mermas = [{id:1, fecha:'2025-06-20', motivo:'consumoPropio', coste:50}];
    return {res: GE.resultadoAntesImpMes(5, 2025), iva: GE.ivaLiquidarMes(5, 2025)};
  });
  assert.equal(Math.round(r.res), 3150); assert.equal(Math.round(r.iva*100)/100, 26);
});

await caso('Vale univalente: IVA al venderlo y se resta al canjearlo; el polivalente no toca el IVA', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.ge.vales = [{id:1, fecha:'2025-11-20', tipo:'univalente', importe:110, iva:10, canjeFecha:'2026-01-15'},
                   {id:2, fecha:'2025-11-21', tipo:'polivalente', importe:50, iva:0, canjeFecha:null}];
    return {nov: geOtrosIngresosIvaMes(2025,10), ene: geOtrosIngresosIvaMes(2026,0), pend: geValesPendientes()};
  });
  assert.equal(Math.round(r.nov*100)/100, 10); assert.equal(Math.round(r.ene*100)/100, -10); assert.equal(r.pend, 50);
});

await caso('Nómina 2026: la SS va sobre la base (suelo por grupo y jornada, techo 5.101,20) y la solidaridad por encima', async () => {
  const r = await page.evaluate(() => ({
    parcial: GE.calcNomina(500, 0, 0, 32.15, 12, {grupo:7, jornada:50}),
    alto: GE.calcNomina(7000, 0, 0, 32.15, 12, {grupo:1}),
    corto: GE.calcNomina(1500, 0, 0, 32.15, 12, {grupo:7, contratosCortos:2}),
  }));
  assert.equal(Math.round(r.parcial.base*100)/100, 712.20, 'media jornada: base mínima a la mitad');
  assert.equal(r.alto.base, 5101.20);
  // exceso 1.898,80: 510,12 × 0,96% + 1.388,68 × 1,04%
  assert.equal(Math.round((r.alto.ssEmpresa - 5101.20*0.3215)*100)/100, Math.round((510.12*0.0096 + 1388.68*0.0104)*100)/100);
  assert.equal(Math.round((r.corto.ssEmpresa - 1500*0.3215)*100)/100, 67.24);
});

// --- Revisión de uso (5/10, noche) ---------------------------------------
await caso('Sin gastos fijos en meses futuros ni antes del primer dato del negocio', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:1000, iva:21, categoria:'FIJOS', periodicidadMeses:1}];
    DB.sales = [{id:1, date:`${y}-${String(m+1).padStart(2,'0')}-01`, total:110, items:[{name:'x', price:110, qty:1, ivaPct:10}]}];
    const sig = new Date(y, m+1, 1), ant = new Date(y, m-1, 1);
    return {hoy: geTotalFijosNetoForMonth(y, m), futuro: geTotalFijosNetoForMonth(sig.getFullYear(), sig.getMonth()), antes: geTotalFijosNetoForMonth(ant.getFullYear(), ant.getMonth())};
  });
  assert.equal(r.hoy, 1000); assert.equal(r.futuro, 0, 'mes futuro'); assert.equal(r.antes, 0, 'mes anterior al primer dato');
});

await caso('Cuenta de Resultados: un EBITDA negativo se ve con su signo menos y en rojo', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    DB.business.formaJuridica = 'sociedad';
    DB.sales = [{id:1, date:`${y}-${String(m+1).padStart(2,'0')}-01`, total:110, items:[{name:'x', price:110, qty:1, ivaPct:10}]}];
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:1000, iva:21, categoria:'FIJOS', periodicidadMeses:1}];
    currentFolder='gestion'; navigate('economia'); GE.tab('cdr');
    const fila = [...document.querySelectorAll('#cdr-table tr')].find(tr => /EBITDA/.test(tr.textContent));
    const celda = fila.querySelectorAll('td')[fila.querySelectorAll('td').length-1];
    return {txt: celda.textContent, clase: celda.className};
  });
  assert.ok(/^-/.test(r.txt.trim()), 'sin signo menos: '+r.txt); assert.equal(r.clase, 'neg');
});

await caso('Sin forma jurídica: aviso rojo arriba de Gestión Económica; y el calendario de pagos en Tesorería', async () => {
  await limpio();
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = '';
    currentFolder='gestion'; navigate('economia'); GE.init();
    const aviso = document.getElementById('ge-checklist').textContent;
    DB.business.formaJuridica = 'sociedad';
    GE.tab('tesoreria');
    return {aviso, cal: document.getElementById('te-calendario').textContent};
  });
  assert.ok(/autónomo, comunidad de bienes o sociedad/.test(r.aviso), 'falta el aviso: '+r.aviso.slice(0,120));
  assert.ok(/303/.test(r.cal) && /hasta el/.test(r.cal), 'falta el calendario: '+r.cal.slice(0,160));
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
