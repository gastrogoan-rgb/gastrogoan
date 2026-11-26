// Ventas de plataformas (Glovo, Uber Eats, Just Eat…) apuntadas a mano en el CIERRE DE CAJA (25/11).
// Hoy no hay integración real: el hostelero define cada plataforma (comisión + IVA de la comisión + IVA de la venta) y, al cerrar,
// apunta lo que vendió cada una. Cuentas hechas A MANO con TRES plataformas:
//   Glovo (normal)            ventas 220,00 € a IVA 10 %  → base 200,00 · IVA 20,00 · comisión 30 % + 21 % IVA = 66,00 + 13,86 = 79,86
//   Uber Eats … (isp)          ventas 110,00 € a IVA 10 %  → base 100,00 · IVA 10,00 · comisión 25 % = 27,50, sin IVA español (se autoliquida: 27,50 × 21 % = 5,775)
//   Just Eat (factura real)    ventas 121,00 € a IVA 21 %  → base 100,00 · IVA 21,00 · la comisión NO se estima (la factura real va a Gastos Variables)
// más dos ventas de la caja del local: efectivo 55,00 y tarjeta 33,00, las dos con IVA 10 % (base 50 + 30).
//   Ventas netas del mes  = 50 + 30 + 200 + 100 + 100 = 480,00 ; IVA repercutido = 5 + 3 + 20 + 10 + 21 = 59,00 (10 %: base 380 / cuota 38 ; 21 %: base 100 / cuota 21)
//   Comisiones (base)     = 66,00 + 27,50 + 0 = 93,50 ; IVA soportado de comisiones = 13,86 (Glovo) ; resultado antes de impuestos = 480 − 93,50 = 386,50
//   Caja: efectivo esperado 55,00 y tarjeta 33,00 — las plataformas NO los tocan.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'CIERREPL1', tenantId: ggBizTenantId('CIERREPL1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));

let ok = 0, fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); ok++; console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + (e.message || e)); }
}
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.011, `${msg}: ${a} ≠ ${b}`);

await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name:'Bar Prueba', cif:'B12345678', formaJuridica:'sociedad', regimenFiscal:'directa', netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.business.ticket = Object.assign(DB.business.ticket || {}, {ivaPct:10});
  DB.business.deliveryPlatforms = [
    {id:101, nombre:'Glovo', comisionPct:30, ivaPct:21, comisionSobreEnvio:true, isp:false, facturaReal:false},
    {id:102, nombre:'Uber Eats Madrid Centro Norte', comisionPct:25, ivaPct:21, comisionSobreEnvio:true, isp:true, facturaReal:false},
    {id:103, nombre:'Just Eat', comisionPct:20, ivaPct:21, ivaVentaPct:21, comisionSobreEnvio:true, isp:false, facturaReal:true},
    {id:104, nombre:'Plataforma retirada', comisionPct:10, ivaPct:21, activa:false},
  ];
  const hoy = todayStr();
  DB.cashClosures = []; DB.sales = [
    {id:1, date:hoy, createdAt:new Date().toISOString(), total:55, tipo:'mesa', metodoPago:'Efectivo', items:[{name:'Menú', price:55, qty:1, ivaPct:10}], ticketNum:'T26AAA-000001'},
    {id:2, date:hoy, createdAt:new Date().toISOString(), total:33, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'Menú', price:33, qty:1, ivaPct:10}], ticketNum:'T26AAA-000002'},
  ];
  DB.ge.fijos = []; DB.ge.variables = []; DB.ge.fijosLog = []; DB.ge.capex = []; DB.reservations = []; DB.ge.otrosIngresos = []; DB.ge.vales = [];
  window.__printReal = printCashClosure; window.printCashClosure = () => {};   // no abrir ventanas de impresión
  window.__hoy = hoy;
});

// ───────────── Mi Negocio: definir la plataforma ─────────────
await caso('Mi Negocio: se define una plataforma con su comisión, el IVA de la comisión, el IVA de LA VENTA y si sale en el cierre', async () => {
  const r = await page.evaluate(() => {
    const antes = DB.business.deliveryPlatforms.length;
    newDeliveryPlatform();
    document.getElementById('dp-f-nombre').value = 'PedidosYa Barcelona Gràcia Sur';
    document.getElementById('dp-f-comision').value = '18';
    document.getElementById('dp-f-iva').value = '21';
    document.getElementById('dp-f-iva-venta').value = '21';
    document.getElementById('dp-f-activa').checked = false;
    saveDeliveryPlatform();
    const p = DB.business.deliveryPlatforms.find(x => x.nombre.startsWith('PedidosYa'));
    const out = {antes, despues: DB.business.deliveryPlatforms.length, p: {c:p.comisionPct, i:p.ivaPct, v:p.ivaVentaPct, a:p.activa}};
    DB.business.deliveryPlatforms = DB.business.deliveryPlatforms.filter(x => x !== p);   // fuera, no es de la cuenta
    // El cierre no ofrece las inactivas
    openCashClosureModal();
    out.filas = [...document.querySelectorAll('.clp-fila')].map(f => f.dataset.plat);
    closeModal();
    return out;
  });
  assert.equal(r.despues, r.antes + 1);
  assert.deepEqual(r.p, {c:18, i:21, v:21, a:false});
  assert.deepEqual(r.filas, ['101','102','103'], 'el cierre solo ofrece las plataformas activas: ' + r.filas);
});
await caso('Mi Negocio: la lista usa «⋯» para editar y eliminar (no dos botones sueltos) y enseña los chips de cada plataforma', async () => {
  const r = await page.evaluate(() => {
    navigate('minegocio'); renderMiNegocio();
    const filas = [...document.querySelectorAll('#delivery-platforms-list .dlv-fila')];
    return {n: filas.length, menus: filas.filter(f => f.querySelector('[data-acc]')).length, sueltos: document.querySelectorAll('#delivery-platforms-list .btn-danger').length, txt: filas.map(f => f.innerText)};
  });
  assert.equal(r.n, 4); assert.equal(r.menus, 4); assert.equal(r.sueltos, 0);
  assert.ok(/inversi|reverse|autoliquid/i.test(r.txt[1]) && /factura real|real invoice/i.test(r.txt[2]), JSON.stringify(r.txt));
});

// ───────────── Primer cierre del día ─────────────
let c1;
await caso('El cierre enseña el bloque de plataformas APARTE: avisa de que no entra en caja y calcula IVA, comisión y neto al teclear', async () => {
  const r = await page.evaluate(async () => {
    openCashClosureModal();
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); };
    set('closure-platform-101', '220,00'); set('closure-platform-n-101', '14');
    set('closure-platform-102', '110'); set('closure-platform-n-102', '6');
    set('closure-platform-103', '121'); set('closure-platform-n-103', '5');
    return {
      total: document.getElementById('closure-platform-total').textContent,
      glovo: document.getElementById('closure-platform-res-101').textContent,
      uber: document.getElementById('closure-platform-res-102').textContent,
      jet: document.getElementById('closure-platform-res-103').textContent,
      esperado: document.getElementById('closure-diff-preview').textContent,
      aviso: document.querySelector('.clp-total span').textContent,
    };
  });
  assert.match(r.total, /451,00/); assert.match(r.aviso, /no entra en caja/i);
  assert.match(r.glovo, /10 %.*20,00.*79,86.*140,14/s, r.glovo);   // IVA de la venta 10 % (20,00) · comisión 79,86 · te quedan 220 − 79,86 = 140,14
  assert.match(r.uber, /27,50/); assert.match(r.uber, /autoliquid/i);
  assert.match(r.jet, /21 %.*21,00/s); assert.match(r.jet, /factura real/i); assert.ok(!/comisión 2[0-9]/.test(r.jet), 'la factura real no se estima: ' + r.jet);
  assert.match(r.esperado, /55,00/, 'el efectivo esperado sigue siendo el de la caja: ' + r.esperado);
});
await caso('Confirmar el cierre: cada plataforma es UNA venta de Delivery con el modelo de siempre; efectivo y tarjeta esperados no cambian', async () => {
  c1 = await page.evaluate(async () => {
    await performCashClosure();
    const c = DB.cashClosures[DB.cashClosures.length - 1];
    const man = DB.sales.filter(esVentaPlataformaManual);
    return {c: JSON.parse(JSON.stringify(c)), man: JSON.parse(JSON.stringify(man)), pendientes: getSalesForClosure().length};
  });
  assert.equal(c1.man.length, 3);
  assert.equal(c1.c.totales.Efectivo, 55); assert.equal(c1.c.totales.Tarjeta, 33); assert.equal(c1.c.total, 88); assert.equal(c1.c.ticketCount, 2);
  assert.equal(c1.c.efectivoEsperado, 55, 'el efectivo esperado NO incluye lo de las plataformas');
  assert.equal(c1.pendientes, 0);
  const g = c1.man.find(s => s.plataforma.id === 101), u = c1.man.find(s => s.plataforma.id === 102), j = c1.man.find(s => s.plataforma.id === 103);
  for(const s of c1.man){
    assert.equal(s.tipo, 'delivery'); assert.equal(s.origen, 'plataforma-manual'); assert.equal(s.metodoPago, 'Plataforma');
    assert.equal(s.sinFichaCliente, true); assert.equal(s.clientId, null); assert.equal(s.clienteNombre, ''); assert.equal(s.cierreId, c1.c.id);
    assert.ok(!s.ticketNum, 'no es un ticket: sin número de la serie T');
  }
  assert.equal(g.total, 220); cerca(g.comisionPlataforma, 79.86, 'comisión Glovo'); assert.equal(g.items[0].ivaPct, 10); assert.equal(g.pedidosN, 14);
  assert.equal(u.total, 110); cerca(u.comisionPlataforma, 27.5, 'comisión Uber (sin IVA español)'); assert.equal(u.plataforma.ivaPct, 0); assert.equal(u.plataforma.isp, true);
  assert.equal(j.total, 121); assert.equal(j.items[0].ivaPct, 21); assert.equal(j.plataforma.facturaReal, true);
  assert.equal(c1.c.platformSales.length, 3); cerca(c1.c.platformTotal, 451, 'total plataformas del cierre');
});
await caso('Aguas abajo: ventas netas 480, IVA repercutido por tipo (10 %: 380/38 · 21 %: 100/21) y ventas del canal Delivery', async () => {
  const r = await page.evaluate(() => {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const g = geVentasIvaGroupsMes(y, m), mesStr = `${y}-${String(m+1).padStart(2,'0')}`;
    const del = activeSales().filter(s => s.date.startsWith(mesStr) && s.tipo === 'delivery').reduce((a, s) => a + s.total, 0);
    return {g, netas: geFacturacionNetaMes(y, m), del};
  });
  cerca(r.g[10].base, 380, 'base 10 %'); cerca(r.g[10].iva, 38, 'IVA 10 %'); cerca(r.g[21].base, 100, 'base 21 %'); cerca(r.g[21].iva, 21, 'IVA 21 %');
  cerca(r.netas, 480, 'ventas netas'); cerca(r.del, 451, 'ventas Delivery');
});
await caso('Gastos: comisiones 93,50 en base (Glovo 66 + Uber 27,50 + Just Eat 0 por factura real) y resultado antes de impuestos 386,50', async () => {
  const r = await page.evaluate(() => { const d = new Date(); return {com: geComisionesMes(d.getFullYear(), d.getMonth()), res: geResultadoAntesImpMes(d.getFullYear(), d.getMonth())}; });
  cerca(r.com, 93.5, 'comisiones'); cerca(r.res, 386.5, 'resultado antes de impuestos');
});
await caso('Libros del gestor: emitidas con asiento resumen por plataforma y tipo, y recibidas con la comisión (IVA soportado 13,86; Uber por inversión del sujeto pasivo; Just Eat sin estimar)', async () => {
  const r = await page.evaluate(() => {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const fin = new Date(y, m + 1, 0).getDate(), mm = String(m + 1).padStart(2, '0');
    const p = {desde:`${y}-${mm}-01`, hasta:`${y}-${mm}-${fin}`, nombre:'mes'};
    const hE = GE.hojaEmitidas(p), hR = GE.hojaRecibidas(p, new Map()), iva = GE.hojaIvaPorTipo(hE, hR);
    return {e: hE.filas.slice(3).filter(f => f.length > 4), r: hR.filas.slice(3).filter(f => f.length > 4), iva: iva.filas.slice(3)};
  });
  const plat = r.e.filter(f => /plataforma|platform/i.test(f[7]));
  assert.equal(plat.length, 3, JSON.stringify(plat));
  const fila = (nom) => plat.find(f => f[7].includes(nom));
  assert.ok(fila('Glovo') && fila('Glovo')[10] === 200 && fila('Glovo')[11] === '10%' && fila('Glovo')[14] === 14, JSON.stringify(fila('Glovo')));
  assert.ok(fila('Uber') && fila('Uber')[10] === 100 && fila('Uber')[12] === 10, JSON.stringify(fila('Uber')));
  assert.ok(fila('Just Eat') && fila('Just Eat')[10] === 100 && fila('Just Eat')[11] === '21%' && fila('Just Eat')[12] === 21, JSON.stringify(fila('Just Eat')));
  const f2 = r.e.filter(f => f[3] === 'F2'); assert.equal(f2.reduce((a, f) => a + f[10], 0), 80, 'los tickets del local son 50 + 30: lo de las plataformas no se mezcla con ellos');
  const com = r.r.filter(f => /comisi/i.test(f[6]));
  assert.equal(com.length, 2, 'Just Eat (factura real) no genera línea estimada: ' + JSON.stringify(com));
  const gl = com.find(f => f[5] === 'Glovo'), ub = com.find(f => f[5].startsWith('Uber'));
  cerca(gl[7], 66, 'base comisión Glovo'); cerca(gl[9], 13.86, 'IVA soportado Glovo'); cerca(gl[10], 13.86, 'deducible Glovo');
  cerca(ub[7], 27.5, 'base comisión Uber'); assert.equal(ub[14], 'S', 'Uber va marcada como inversión del sujeto pasivo'); cerca(ub[9], 5.775, 'cuota autoliquidada Uber');
  const rep10 = r.iva.find(f => /repercutido/i.test(f[1] || '') && f[2] === '10%'), rep21 = r.iva.find(f => /repercutido/i.test(f[1] || '') && f[2] === '21%');
  cerca(rep10[3], 380, 'repercutido 10 % base'); cerca(rep10[4], 38, 'repercutido 10 % cuota'); cerca(rep21[3], 100, 'repercutido 21 % base'); cerca(rep21[4], 21, 'repercutido 21 % cuota');
});
await caso('Conciliación bancaria: la tarjeta esperada sigue siendo 33,00 (lo de las plataformas no es tarjeta del local)', async () => {
  const b = await page.evaluate(() => cardBreakdownInRange(__hoy, __hoy));
  assert.equal(b.cerrado, 33); assert.equal(b.sinCerrar, 0); assert.equal(b.total, 33);
});
await caso('Tickets y platos: cada asiento cuenta tantos pedidos como se dijo (2 + 14 + 6 + 5 = 27) y no sale como un «plato» en el ranking', async () => {
  const r = await page.evaluate(() => {
    const d = new Date();
    return {t: plan360KpisMes(d.getFullYear(), d.getMonth()).tickets, plato: JSON.stringify(GE.platosStats ? GE.platosStats().items : [])};
  });
  assert.equal(r.t, 27); assert.ok(!/Glovo|Uber|Just Eat/.test(r.plato), 'un asiento de plataforma no es un plato: ' + r.plato);
});
await caso('El historial de arqueos muestra lo apuntado y el impreso lo lista aparte, con la nota de que no es caja', async () => {
  const r = await page.evaluate(() => {
    openCashClosureHistory(); const h = document.querySelector('.modal').innerText; closeModal();
    let html = ''; const orig = window.printReportWindow; window.printReportWindow = (t, b) => { html = b; };
    window.__printReal(DB.cashClosures[0]); window.printReportWindow = orig;
    return {h, html};
  });
  assert.match(r.h, /451,00/);
  assert.ok(/Uber Eats Madrid Centro Norte/.test(r.html) && /no entra en la caja/i.test(r.html) && /451,00/.test(r.html), 'el impreso no lista las plataformas aparte');
});

// ───────────── Reabrir el cierre: no se duplica ─────────────
await caso('Segundo cierre del día: la fila viene rellena, escribir otra cifra la CORRIGE en el sitio (3 ventas siguen siendo 3) y la caja no se mueve', async () => {
  const r = await page.evaluate(async () => {
    openCashClosureModal();
    const pre = document.getElementById('closure-platform-101').value;
    const ya = document.querySelector('.clp-fila[data-plat="101"] .clp-ya') ? document.querySelector('.clp-fila[data-plat="101"] .clp-ya').innerText : '';
    const e = document.getElementById('closure-platform-101'); e.value = '242'; e.dispatchEvent(new Event('input', {bubbles:true}));
    await performCashClosure();
    const c2 = DB.cashClosures[DB.cashClosures.length - 1];
    const man = DB.sales.filter(esVentaPlataformaManual), g = man.find(s => s.plataforma.id === 101);
    return {pre, ya, n: man.length, g: JSON.parse(JSON.stringify(g)), c2: JSON.parse(JSON.stringify(c2)), nCierres: DB.cashClosures.length};
  });
  assert.equal(r.pre, '220'); assert.match(r.ya, /ya apuntado/i);
  assert.equal(r.n, 3); assert.equal(r.g.total, 242); cerca(r.g.comisionPlataforma, 87.85, 'comisión recalculada 242 × 30 % × 1,21');
  assert.equal(r.g.correcciones.length, 1); assert.equal(r.g.correcciones[0].de, 220); assert.equal(r.g.correcciones[0].a, 242);
  assert.equal(r.c2.ticketCount, 0); assert.equal(r.c2.total, 0); assert.equal(r.c2.efectivoEsperado, 0, 'el efectivo esperado del 2.º cierre no arrastra nada de plataformas');
  cerca(r.c2.platformTotal, 473, 'Glovo 242 + Uber 110 + Just Eat 121'); assert.equal(r.nCierres, 2);
});
await caso('Reabrir y confirmar sin tocar nada no corrige ni duplica', async () => {
  const r = await page.evaluate(async () => {
    openCashClosureModal(); await performCashClosure();
    const man = DB.sales.filter(esVentaPlataformaManual);
    return {n: man.length, corr: man.map(s => (s.correcciones || []).length)};
  });
  assert.equal(r.n, 3); assert.deepEqual(r.corr.sort(), [0, 0, 1]);
});
await caso('Un importe absurdo no deja el cierre a medias', async () => {
  const r = await page.evaluate(async () => {
    const n0 = DB.cashClosures.length;
    openCashClosureModal();
    const e = document.getElementById('closure-platform-102'); e.value = '99999999'; e.dispatchEvent(new Event('input', {bubbles:true}));
    await performCashClosure(); closeModal();
    return {n: DB.cashClosures.length - n0, uber: DB.sales.find(s => esVentaPlataformaManual(s) && s.plataforma.id === 102).total};
  });
  assert.equal(r.n, 0); assert.equal(r.uber, 110);
});

// ───────────── Anular ─────────────
await caso('Anular lo apuntado = la regla de siempre: rectificativa, no se borra; revierte ventas, IVA y comisión; y se puede volver a apuntar', async () => {
  const r = await page.evaluate(async () => {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const g = DB.sales.find(s => esVentaPlataformaManual(s) && s.plataforma.id === 101);
    reallyCancelSale(g.id, null);
    const g2 = DB.sales.find(s => s.id === g.id);
    const out = {status: g2.status, rect: !!g2.rectificativa, sigue: DB.sales.length, netas: geFacturacionNetaMes(y, m), com: geComisionesMes(y, m), ya: ventaPlataformaDelDia(101, todayStr())};
    // Volver a apuntarla el mismo día: venta NUEVA (la anulada conserva su rectificativa)
    openCashClosureModal();
    const e = document.getElementById('closure-platform-101'); e.value = '110'; e.dispatchEvent(new Event('input', {bubbles:true}));
    await performCashClosure();
    const nueva = ventaPlataformaDelDia(101, todayStr());
    out.nueva = nueva && nueva.id !== g.id && nueva.total === 110;
    out.netas2 = geFacturacionNetaMes(y, m);
    // El libro de emitidas: la original y su rectificativa (R5) se compensan
    const mm = String(m + 1).padStart(2, '0'), p = {desde:`${y}-${mm}-01`, hasta:`${y}-${mm}-${new Date(y, m + 1, 0).getDate()}`, nombre:'mes'};
    out.r5 = GE.hojaEmitidas(p).filas.slice(3).filter(f => f[3] === 'R5').reduce((a, f) => a + f[10], 0);
    return out;
  });
  assert.equal(r.status, 'anulada'); assert.equal(r.rect, true); assert.equal(r.ya, null);
  cerca(r.netas, 500 - 220, 'ventas netas sin Glovo: 50 + 30 + 220 (Glovo corregido a 242 / 1,10) + 100 + 100 − 220'); cerca(r.com, 27.5, 'comisiones sin Glovo');
  assert.equal(r.nueva, true, 'se pudo volver a apuntar'); cerca(r.netas2, 280 + 100, 'ventas netas con el nuevo apunte de Glovo (110 / 1,10 = 100)');
  cerca(r.r5, -220, 'la rectificativa resta la base original en el libro');
});
await caso('Ventas de hoy: el asiento de plataforma sale con su nombre, sin botón de ticket ni factura', async () => {
  const r = await page.evaluate(() => { openTodaySalesModal(); const t = document.querySelector('.modal').innerText, b = document.querySelectorAll('.modal .ti-file-invoice').length; closeModal(); return {t, b}; });
  assert.match(r.t, /Glovo/); assert.match(r.t, /Plataforma/i);
  assert.equal(r.b, 2, 'solo las dos ventas de caja ofrecen factura');
});
await caso('Sin errores de JavaScript durante todo el recorrido', async () => { assert.deepEqual(errs, []); });

console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron de ${ok + fallos}` : `\n✅ Cierre con plataformas: los ${ok} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
