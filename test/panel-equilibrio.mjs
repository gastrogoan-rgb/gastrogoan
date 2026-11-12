// PUNTO DE EQUILIBRIO DEL PANEL vs. GESTIÓN ECONÓMICA (12/11). El dueño pidió comprobar que lo que dice el Panel es cierto y coincide con
// la pestaña «Punto de equilibrio». Cuentas hechas a mano:
//   · fijos: 2.000 de personal + 1.000 de alquiler; ventas netas 200 €/día; compras 60 €/día (30 %) → equilibrio = 3.000 / 0,70 = 4.285,71 €
//   · el Panel y el simulador de Gestión (ticket 20 €, food cost 30 %) dicen lo mismo con un margen de UN ticket (el simulador cuenta cubiertos enteros)
//   · «superar el equilibrio» ⇔ resultado del mes ≥ 0, siempre (misma contabilidad que la Cuenta de Resultados)
//   · las comisiones de plataforma y la variación de existencias NO son costes fijos (suben con las ventas)
//   · un préstamo entra en el Panel como amortización + intereses y la nota dice cuál es la diferencia con la cuota del banco
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const page = await browser.newPage(); await page.setViewport({width: 1280, height: 900});
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'PANEQ001', tenantId: ggBizTenantId('PANEQ001')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
});
await page.reload({waitUntil: 'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
// Siembra: un mes con los números redondos de arriba. `dias` = los días transcurridos del mes en curso (de 1 al de hoy).
const sembrar = (extra = {}) => page.evaluate(async (extra) => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, cif: 'B12345678', formaJuridica: 'sl', regimenFiscal: 'general'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), p2 = n => String(n).padStart(2, '0'), dias = hoy.getDate();
  DB.ge = DB.ge || {};
  DB.ge.config = {distPct: {per: 30, gf: 20, mp: 30, og: 5, ben: 15}, foodCostObj: 30, scenarios: [], peOtrosPct: 0};
  DB.ge.fijos = [{id: 1, nombre: 'SUELDOS', importe: 2000, periodicidadMeses: 1, categoria: 'PERSONAL', iva: 0}, {id: 2, nombre: 'ALQUILER', importe: 1000, periodicidadMeses: 1, categoria: 'FIJOS', iva: 0}];
  DB.ge.fijosLog = []; DB.ge.capex = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; snapshotGeFijosNeto();
  DB.sales.length = 0;
  for(let d = 1; d <= dias; d++) DB.sales.push(Object.assign({id: 'v' + d, date: y + '-' + p2(m + 1) + '-' + p2(d), createdAt: new Date(y, m, d, 13, 0).toISOString(), total: 220, subtotal: 220, tipo: 'mesa', pax: 2,
    items: [{name: 'Plato', price: 220, qty: 1, ivaPct: 10}], pagos: [{metodoPago: 'Efectivo', amount: 220}]}, d === 1 ? (extra.primeraVenta || {}) : {}));
  DB.ge.variables = [{id: 'g1', mes: m, año: y, categoria: 'MATERIA PRIMA', proveedor: 'X', importe: 60 * dias, iva: 10, fecha: y + '-' + p2(m + 1) + '-01', pagada: true}];
  const kk = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  if(extra.prestamo) DB.ge.capex = [{id: 1, descripcion: 'HORNO', importe: 10000, iva: 0, fecha: kk(new Date(y, m - 1, 1)) + '-01', tipoAmort: 'maquinaria', financiado: true, cuotas: 12, cuotaMensual: 880}];
  if(extra.existencias) DB.ge.existencias = {[kk(new Date(y, m - 1, 1))]: {v: 1000, manual: true}, [kk(new Date(y, m, 1))]: {v: 1600, manual: true}};
  saveDB();
  return {dias, y, m};
}, extra);
const medir = () => page.evaluate(() => {
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), D = dpEquilibrioDatos(), E = D.E;
  return {S: D.S, F: D.F, v: D.v, obj: D.objetivo, res: E.resultado, resCdr: geResultadoAntesImpMes(y, m), dt: D.dt, suf: E.suficientes,
    comis: E.comis, exis: E.exis, amort: E.amort, inter: E.intereses, cuotas: E.cuotasBanco, personal: E.personal, gf: E.gastosFijos};
});

await caso('Cuentas a mano: fijos 3.000 € · variable 30 % → equilibrio 4.285,71 €', async () => {
  await sembrar();
  const r = await medir();
  assert.ok(Math.abs(r.S - 200 * r.dt) < 0.01, 'ventas netas ' + r.S);
  assert.ok(Math.abs(r.F - 3000) < 0.01, 'fijos ' + r.F);
  assert.ok(Math.abs(r.v - 0.3) < 1e-9, 'variable ' + r.v);
  assert.ok(Math.abs(r.obj - 3000 / 0.7) < 0.01, 'equilibrio ' + r.obj);
  assert.ok(Math.abs(r.personal - 2000) < 0.01 && Math.abs(r.gf - 1000) < 0.01, 'desglose personal/fijos');
  return `${r.obj.toFixed(2)} €`;
});

await caso('El Panel y la pestaña Punto de equilibrio de Gestión dicen lo mismo (margen de un ticket: el simulador cuenta cubiertos enteros)', async () => {
  await sembrar();
  const r = await page.evaluate(async () => {
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('pe'); await new Promise(r => setTimeout(r, 700));
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event(id === 'pe-fc' ? 'change' : 'input', {bubbles: true})); };
    set('pe-ticket', '20'); set('pe-cubiertos', '300'); set('pe-dias', '25'); set('pe-fc', '30'); set('pe-otros', '0');
    await new Promise(r => setTimeout(r, 300));
    const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ').trim();
    const D = dpEquilibrioDatos();
    return {fijosTab: parseFloat(document.getElementById('pe-fijos').value), ventasMin: txt('pe-r5'), F: D.F, obj: D.objetivo};
  });
  const ventasMin = parseFloat(r.ventasMin.replace(/[^\d,]/g, '').replace(',', '.'));
  assert.ok(Math.abs(r.fijosTab - r.F) < 0.01, `costes fijos: tab ${r.fijosTab} · panel ${r.F}`);
  assert.ok(Math.abs(ventasMin - r.obj) <= 20, `ventas mínimas: tab ${ventasMin} · panel ${r.obj.toFixed(2)}`);
  return `fijos ${r.F} = ${r.fijosTab} · ventas mínimas ${ventasMin} ≈ ${r.obj.toFixed(0)}`;
});

await caso('«Superar el equilibrio» ⇔ resultado del mes ≥ 0: con ventas muy por debajo, justo en el equilibrio y muy por encima', async () => {
  const out = [];
  for(const factor of [0.5, 1, 1.5, 2, 3]){
    await sembrar();
    const r = await page.evaluate(factor => {
      DB.sales.forEach(s => { s.total *= factor; s.subtotal *= factor; s.items[0].price *= factor; s.pagos[0].amount *= factor; });
      const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), D = dpEquilibrioDatos();
      // Con las compras fijas en 60 €/día, cambiar las ventas cambia el % variable real; el Panel usa el real si hay ≥ 7 días de datos.
      return {superado: D.S >= D.objetivo - 1e-6, res: D.E.resultado, cdr: geResultadoAntesImpMes(y, m), v: D.v, suf: D.E.suficientes};
    }, factor);
    assert.ok(Math.abs(r.res - r.cdr) < 0.01, `x${factor}: el resultado del Panel (${r.res}) no es el de la Cuenta de Resultados (${r.cdr})`);
    if(r.suf) assert.equal(r.superado, r.res >= -0.01, `x${factor}: dice «superado=${r.superado}» con resultado ${r.res}`);
    out.push(`x${factor}: ${r.res.toFixed(0)} €`);
  }
  return out.join(' · ');
});

await caso('Comisiones de plataforma y variación de existencias NO son costes fijos: el equilibrio sube por el % variable, no por los fijos', async () => {
  await sembrar({primeraVenta: {comisionPlataforma: 100, plataforma: {ivaPct: 0}}, existencias: true});
  const r = await medir();
  assert.ok(Math.abs(r.comis - 100) < 0.01, 'comisiones ' + r.comis); assert.ok(Math.abs(r.exis + 600) < 0.01, 'existencias ' + r.exis);
  assert.ok(Math.abs(r.F - 3000) < 0.01, 'los fijos deben seguir siendo 3.000 € y son ' + r.F);
  assert.ok(Math.abs(r.res - r.resCdr) < 0.01, 'resultado distinto del de la Cuenta de Resultados');
  // v = (compras + variación + comisiones) / ventas, si hay datos suficientes
  const esperadoV = Math.min(0.95, Math.max(0, (60 * r.dt - 600 + 100) / r.S));
  if(r.suf) assert.ok(Math.abs(r.v - esperadoV) < 1e-6, `% variable ${r.v} vs ${esperadoV}`);
  return `fijos ${r.F} · comisiones ${r.comis} y existencias ${r.exis} van al % variable`;
});

await caso('Con un préstamo: los fijos suman amortización + intereses (no la cuota); la nota dice cuál es la cuota del banco', async () => {
  await sembrar({prestamo: true});
  const r = await medir();
  assert.ok(r.amort > 0 && r.inter > 0 && r.cuotas > 0, JSON.stringify(r));
  assert.ok(Math.abs(r.F - (3000 + r.amort + r.inter)) < 0.01, `fijos ${r.F} ≠ 3000 + ${r.amort} + ${r.inter}`);
  assert.ok(Math.abs(r.res - r.resCdr) < 0.01);
  const html = await page.evaluate(async () => { currentFolder = 'gestion'; ownerUnlocked = true; navigate('dashboard'); await new Promise(r => setTimeout(r, 900)); return document.getElementById('dp-equilibrio').textContent; });
  assert.match(html, /¿Cómo se calcula\?/i); assert.match(html, /amortizaci/i);
  assert.ok(html.includes(String(r.cuotas.toFixed(2)).replace('.', ',')), 'la nota no dice la cuota del banco (' + r.cuotas.toFixed(2) + ')');
  return `fijos ${r.F.toFixed(2)} = 3000 + ${r.amort.toFixed(2)} + ${r.inter.toFixed(2)} · cuota banco ${r.cuotas}`;
});

await caso('Con pocos datos (antes del día 7) el % variable es el objetivo del negocio y el Panel lo dice', async () => {
  await sembrar();
  const r = await page.evaluate(() => {
    const E = geEquilibrioMes(new Date().getFullYear(), new Date().getMonth(), 3);
    return {suf: E.suficientes, v: E.v, obj: E.vObjetivo};
  });
  assert.equal(r.suf, false); assert.ok(Math.abs(r.v - r.obj) < 1e-9);
  return 'v = food cost objetivo hasta el día 7';
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el equilibrio del Panel es cierto y coincide con Gestión Económica');
process.exit(fallos ? 1 : 0);
