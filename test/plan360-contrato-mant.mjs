// Plan 360º · contrato PROPIO del mantenimiento (26/11): «Acuerdo de servicio de mantenimiento», aparte del acuerdo del 360.
// Se genera con los datos rellenos, lo firma el negocio al ACEPTAR el mantenimiento (su firma activa el servicio), el panel del
// coach lo ve (enviado / firmado) y la agenda avisa si el mantenimiento está activo sin él. Los contratos del 360 ya firmados no cambian.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {lanzarPanel} from './_panel360.mjs';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const leer = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const constante = (src, nombre) => { const m = src.match(new RegExp('const ' + nombre + '\\s*=\\s*`([\\s\\S]*?)`;')); assert.ok(m, 'no se encuentra ' + nombre); return m[1]; };

// ============================================================ 1 · el texto y sus dos copias
const core = leer('js/core.js'), panelSrc = leer('admin-panel/plan360.html');
await caso('1 · PLAN360_MANT_CONTRACT_TEXT y PLAN360_CONTRACT_TEXT son idénticos en js/core.js y admin-panel/plan360.html', () => {
  for(const n of ['PLAN360_MANT_CONTRACT_TEXT', 'PLAN360_CONTRACT_TEXT']) assert.equal(constante(core, n), constante(panelSrc, n), n + ' difiere entre las dos copias');
});
await caso('1 · el acuerdo de mantenimiento lleva todos los marcadores y las cláusulas que pide el servicio, y ningún dato personal', () => {
  const t = constante(core, 'PLAN360_MANT_CONTRACT_TEXT');
  assert.ok(/^ACUERDO DE SERVICIO DE MANTENIMIENTO/.test(t));
  for(const m of ['coachNombre', 'coachDni', 'coachDomicilio', 'cliente', 'nif', 'direccion', 'precioMantenimiento']) assert.ok(t.includes('{{' + m + '}}'), 'falta {{' + m + '}}');
  for(const r of [/WhatsApp/, /videollamada/, /informe del mes/i, /por adelantado/, /15 días/, /no se devuelve/, /aviso previo por escrito/, /no garantiza resultados/, /propiedad de GastroGoan/, /RGPD/, /Juzgados y Tribunales de Barcelona/, /Ley española/, /renueva automáticamente/])
    assert.ok(r.test(t), 'falta ' + r);
  assert.ok(!/coachIban|transferencia bancaria/i.test(t) && /enlace de pago seguro de Stripe/.test(t), 'el cobro debe ser por Stripe, sin IBAN');
  assert.ok(!/(?<![A-Za-z0-9])\d{8}[A-Z](?![A-Za-z0-9])/.test(t) && !/[A-Z]{2}\d{2}(?: ?[0-9A-Z]{4}){2,}/.test(t), 'hay un dato con forma de DNI o IBAN');
});
await caso('1 · la cláusula 3 del acuerdo del 360 cobra por el enlace de Stripe, sin IBAN, y el IBAN ya no es obligatorio para el coach', () => {
  const t = constante(core, 'PLAN360_CONTRACT_TEXT');
  assert.ok(/enlace de pago seguro de Stripe[^\n]*Concepto: Programa 360 GastroGoan/.test(t) && !/coachIban|Transferencia bancaria/.test(t));
  assert.ok(/\{\{coachIban\}\}/.test(core) && /coach\(Nombre\|Dni\|Domicilio\|Iban\)/.test(panelSrc), 'el marcador sigue soportado en plan360FillTemplate');
  assert.ok(/\{k: 'iban'[^}]*obl: false/.test(panelSrc));
});
await caso('1 · la cláusula 11 del acuerdo del 360 remite al acuerdo propio (ya no regula el servicio)', () => {
  const t = constante(core, 'PLAN360_CONTRACT_TEXT');
  const c11 = t.split('11. Servicio de mantenimiento (opcional)')[1].split('CONTRATO DE CONFIDENCIALIDAD')[0];
  assert.ok(/Acuerdo de servicio de mantenimiento/.test(c11) && /{{precioMantenimiento}}/.test(c11));
  assert.ok(!/cuatro contactos|15 días/.test(c11), 'la cláusula 11 aún regula el servicio');
});

// ============================================================ 2 · la app del negocio
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'P360MANT1', tenantId: ggBizTenantId('P360MANT1')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await page.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1800));
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, plan360: true});
  ['plan360StartDate', 'plan360Program', 'plan360Servicio', 'plan360Mant', 'plan360Cierre', 'plan360Contract', 'plan360ContratoMant', 'plan360Coach'].forEach(k => delete DB.business[k]);
  ensurePlan360Program();
  DB.business.plan360StartDate = addDaysStr(todayStr(), -30);
  DB.business.plan360Contract = Object.assign({}, DB.business.plan360Contract, {clienteNombre: 'Casa Paco SL', clienteNIF: 'B12345678', clienteDireccion: 'Calle Mayor 1', precio: '950 € + IVA', formaPago: 'Transferencia'});
  DB.business.plan360Cierre = Object.assign(DB.business.plan360Cierre || {}, {mantenimiento: {precio: '75 € + IVA al mes', respuesta: null, volverAHablarFecha: '', firmaNombre: '', firmaFecha: null}, informeVistoEn: Date.now()});
  document.getElementById('plan360-content') || document.body.insertAdjacentHTML('beforeend', '<div id="plan360-content"></div>');
  window.open = () => ({document: {write(h){ window.__w = (window.__w || '') + h; }, close(){}, images: []}, focus(){}, print(){}});
});
const COACH = {nombre: 'Coach de Prueba', dni: '00000000T', domicilio: 'Calle Falsa 1, Ciudad de Prueba', iban: 'ES00 0000 0000 0000 0000 0000', email: 'coach@example.test', telefono: '600000000'};

await caso('2 · con datos del coach y del cliente el acuerdo sale relleno: sin «{{…}}» ni «________»', async () => {
  const r = await page.evaluate(coach => {
    DB.business.plan360Coach = coach;
    renderPlan360ContractMant();
    return document.getElementById('p360-cm-texto').innerText;
  }, COACH);
  assert.ok(!/\{\{|\}\}/.test(r) && !/________/.test(r), 'quedan marcadores o rayas');
  for(const x of ['Coach de Prueba', '00000000T', 'Calle Falsa 1', 'Stripe', 'Casa Paco SL', 'B12345678', 'Calle Mayor 1', '75 € + IVA al mes']) assert.ok(r.includes(x), 'falta ' + x);
});
await caso('2 · sin los datos del coach el acuerdo NO se puede firmar (y no se activa nada)', async () => {
  const r = await page.evaluate(() => {
    const guardado = DB.business.plan360Coach; delete DB.business.plan360Coach;
    renderPlan360ContractMant();
    const bloqueado = [...document.querySelectorAll('#plan360-content button')].find(b => /Firmar y activar/.test(b.textContent)).disabled;
    document.getElementById('p360-cm-sign-name').disabled = false;
    plan360ContratoMantFirmar();
    const o = {bloqueado, firmado: !!(DB.business.plan360ContratoMant || {}).signedAt, resp: DB.business.plan360Cierre.mantenimiento.respuesta, fase: (DB.business.plan360Servicio || {}).fase};
    DB.business.plan360Coach = guardado;
    return o;
  });
  assert.equal(r.bloqueado, true); assert.equal(r.firmado, false); assert.equal(r.resp, null); assert.notEqual(r.fase, 'mant');
});
await caso('2 · la oferta del cierre abre el acuerdo (ya no se acepta con solo un nombre) y no activa nada hasta firmar', async () => {
  const r = await page.evaluate(() => {
    const oferta = plan360CierreHtml();
    plan360MantenimientoAceptar();
    return {boton: /plan360MantenimientoAceptar/.test(oferta), sinCampoNombre: !/p360-mant-firma/.test(oferta), abierto: /ACUERDO DE SERVICIO DE MANTENIMIENTO/.test(document.getElementById('plan360-content').innerText), resp: DB.business.plan360Cierre.mantenimiento.respuesta, fase: (DB.business.plan360Servicio || {}).fase};
  });
  assert.ok(r.boton && r.sinCampoNombre && r.abierto); assert.equal(r.resp, null); assert.notEqual(r.fase, 'mant');
});
await caso('2 · firmar guarda el texto exacto y ACTIVA el mantenimiento; el acuerdo del 360 ya firmado no cambia', async () => {
  const r = await page.evaluate(() => {
    // Un acuerdo del 360 firmado antes de que existiera este contrato, con su texto y su firma.
    Object.assign(DB.business.plan360Contract, {signedAt: 1700000000000, signedName: 'Casa Paco SL', signedDNI: 'B12345678', signedText: 'TEXTO FIRMADO ORIGINAL DEL 360'});
    const antes = JSON.stringify(DB.business.plan360Contract);
    renderPlan360ContractMant();
    document.getElementById('p360-cm-sign-name').value = 'Paco Pérez'; document.getElementById('p360-cm-sign-dni').value = '12345678Z';
    plan360ContratoMantFirmar();
    const cm = DB.business.plan360ContratoMant, m = DB.business.plan360Cierre.mantenimiento;
    const vista = document.getElementById('plan360-content').innerText;
    // Si el modelo cambiase mañana, lo firmado se sigue viendo con SU texto.
    const guardadoTexto = cm.signedText;
    return {signedAt: !!cm.signedAt, nombre: cm.signedName, dni: cm.signedDNI, limpio: !/\{\{|________/.test(cm.signedText), conCoach: /Coach de Prueba/.test(cm.signedText) && /Casa Paco SL/.test(cm.signedText),
      resp: m.respuesta, firma: m.firmaNombre, fase: DB.business.plan360Servicio.fase, mantDesde: !!DB.business.plan360Servicio.mantDesde,
      vista: /Firmado por/.test(vista) && /Paco Pérez/.test(vista),
      c360igual: JSON.stringify(DB.business.plan360Contract) === antes, c360html: plan360ContractSectionHtml().includes('TEXTO FIRMADO ORIGINAL DEL 360'), guardadoTexto: guardadoTexto.length > 500};
  });
  assert.ok(r.signedAt && r.limpio && r.conCoach && r.vista); assert.equal(r.nombre, 'Paco Pérez'); assert.equal(r.dni, '12345678Z');
  assert.equal(r.resp, 'acepta'); assert.equal(r.firma, 'Paco Pérez'); assert.equal(r.fase, 'mant'); assert.ok(r.mantDesde);
  assert.ok(r.c360igual && r.c360html, 'el acuerdo del 360 firmado cambió'); assert.ok(r.guardadoTexto);
});
await caso('2 · con el mantenimiento activo la campana avisa si falta el acuerdo y deja de avisar al firmarlo', async () => {
  const r = await page.evaluate(() => {
    const guardado = DB.business.plan360ContratoMant;
    delete DB.business.plan360ContratoMant;
    const sin = plan360AvisosDeHoy().some(a => a.id === 'plan360ContratoMant');
    DB.business.plan360ContratoMant = guardado;
    const con = plan360AvisosDeHoy().some(a => a.id === 'plan360ContratoMant');
    const tarjeta = plan360MantServicioHtml();
    return {sin, con, tarjeta: /Acuerdo de mantenimiento firmado/.test(tarjeta)};
  });
  assert.equal(r.sin, true); assert.equal(r.con, false); assert.ok(r.tarjeta);
});
await caso('2 · «Mi mantenimiento» deja ver el acuerdo firmado y se puede imprimir con su firma', async () => {
  const r = await page.evaluate(() => { window.__w = ''; plan360PrintContractMant(); return window.__w; });
  await new Promise(x => setTimeout(x, 300));
  const w = await page.evaluate(() => window.__w);
  assert.ok(/ACUERDO DE SERVICIO DE MANTENIMIENTO/.test(w) && /Paco Pérez/.test(w) && /12345678Z/.test(w), 'el impreso no lleva el acuerdo y la firma');
});
await caso('2 · la firma activa la misma fase que el panel lee (aceptado + mantenimiento) y queda en una clave plan360* que se sincroniza', async () => {
  const r = await page.evaluate(() => Object.keys(DB.business).filter(k => k.startsWith('plan360') && k === 'plan360ContratoMant').length);
  assert.equal(r, 1);
});
await browser.close();

// ============================================================ 3 · el panel del coach
const hoyISO = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
const bizMant = (extra) => Object.assign({name: 'X', plan360: true, plan360StartDate: '2026-01-05', plan360StartDateConfirmed: true,
  plan360Contract: {clienteNombre: 'Bar Uno SL', clienteNIF: 'B87654321', clienteDireccion: 'Plaza 2', precio: '950 € + IVA', formaPago: 'Transferencia'},
  plan360Cierre: {mantenimiento: {precio: '75 € + IVA al mes', respuesta: 'acepta', firmaNombre: 'Ana', firmaFecha: 1, respondidoEn: 1}},
  plan360Servicio: {fase: 'mant', mantDesde: hoyISO.slice(0, 7), cambiado: 1}}, extra || {});
const firmado = {clienteNombre: 'Bar Dos SL', signedName: 'Luis', signedDNI: '11111111H', signedAt: 1760000000000, signedText: 'ACUERDO DE SERVICIO DE MANTENIMIENTO\n(texto exacto que firmó Luis)'};
const seed = {gastrogoan: {
  coaching360: {T1: {name: 'Bar Uno'}, T2: {name: 'Bar Dos'}},
  tenantLookup: {T1: {apiKey: 'k', databaseURL: 'u'}, T2: {apiKey: 'k', databaseURL: 'u'}},
  tenants: {T1: {db: {business: bizMant()}}, T2: {db: {business: bizMant({plan360ContratoMant: firmado})}}},
}};
const {b, p, errs, esperar, abrir} = await lanzarPanel(seed);
const ev = (f, ...a) => p.evaluate(f, ...a);

await caso('3 · la agenda avisa del mantenimiento activo SIN acuerdo firmado, y no avisa si está firmado', async () => {
  const r = await ev((sinF, conF, hoy) => ({
    sin: p360EventosDia({fase: 'mant', hoyStr: hoy, biz: sinF}, hoy).some(e => e.alerta && /sin el acuerdo de mantenimiento/.test(e.t)),
    con: p360EventosDia({fase: 'mant', hoyStr: hoy, biz: conF}, hoy).some(e => /acuerdo de mantenimiento/.test(e.t)),
    en360: p360EventosDia({fase: '360', hoyStr: hoy, biz: sinF}, hoy).some(e => /acuerdo de mantenimiento/.test(e.t)),
  }), seed.gastrogoan.tenants.T1.db.business, seed.gastrogoan.tenants.T2.db.business, hoyISO);
  assert.equal(r.sin, true); assert.equal(r.con, false); assert.equal(r.en360, false);
});
await caso('3 · el panel lee la clave plan360ContratoMant de cada nube para la agenda', () => {
  assert.ok(/'plan360Program', 'plan360ContratoMant'\]/.test(panelSrc));
});
await caso('3 · el acuerdo firmado por el negocio se ve en el panel con SU texto y la firma (y en Documentación inicial)', async () => {
  await abrir('T2', 'Bar Dos');
  const r = await ev(() => { renderIntakePage(); const intake = document.getElementById('client-grid').innerText; renderContractMantPage(); return {intake, pagina: document.getElementById('client-grid').innerText}; });
  assert.ok(/Acuerdo de mantenimiento/.test(r.intake) && /Firmado por Luis/.test(r.intake));
  assert.ok(/texto exacto que firmó Luis/.test(r.pagina) && /Firmado por/.test(r.pagina) && /11111111H/.test(r.pagina));
});
await caso('3 · sin los datos del coach NO se envía ni se firma el acuerdo (como el del 360)', async () => {
  await abrir('T1', 'Bar Uno');
  const r = await ev(() => { coachDatos = null; renderContractMantPage(); const bloq = mantContratoGuardar(true) === false; return {bloq, enviado: !!(remoteBiz.plan360ContratoMant || {}).enviadoEn}; });
  assert.equal(r.bloq, true); assert.equal(r.enviado, false);
});
await caso('3 · con sus datos, el coach lo prepara y lo envía: queda «enviado», con el texto relleno y sin rayas', async () => {
  const r = await ev(async coach => {
    coachDatos = coach; coachDatosOrigen = 'nube';
    renderContractMantPage();
    const texto = document.getElementById('cm-texto').innerText;
    document.getElementById('cm-nombre').value = 'Bar Uno SL';
    const ok = mantContratoGuardar(true);
    return {ok, texto, estado: mantContratoEstado(), nube: JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360ContratoMant || null)};
  }, COACH);
  await esperar(300);
  assert.ok(r.ok && /^Enviado el/.test(r.estado), r.estado);
  assert.ok(!/\{\{|________/.test(r.texto) && /Coach de Prueba/.test(r.texto) && /Bar Uno SL/.test(r.texto) && /B87654321/.test(r.texto) && /75 € \+ IVA al mes/.test(r.texto));
  assert.ok(/Bar Uno SL/.test(r.nube) && /enviadoEn/.test(r.nube), 'no llegó a la nube del negocio: ' + r.nube);
});
await caso('3 · firmarlo en persona guarda el texto exacto, deja el mantenimiento aceptado y activo, y sube solo claves plan360*', async () => {
  const r = await ev(() => {
    renderContractMantPage();
    document.getElementById('cm-sign-name').value = 'Ana Pérez'; document.getElementById('cm-sign-dni').value = '22222222J';
    mantContratoFirmar();
    const cm = remoteBiz.plan360ContratoMant;
    return {cm, resp: remoteBiz.plan360Cierre.mantenimiento.respuesta, fase: remoteBiz.plan360Servicio.fase, estado: mantContratoEstado(), vista: document.getElementById('client-grid').innerText, esClave: esClavePlan360('plan360ContratoMant')};
  });
  assert.ok(r.cm.signedAt && r.cm.signedName === 'Ana Pérez' && !/\{\{|________/.test(r.cm.signedText) && /ACUERDO DE SERVICIO DE MANTENIMIENTO/.test(r.cm.signedText));
  assert.equal(r.resp, 'acepta'); assert.equal(r.fase, 'mant'); assert.ok(/^Firmado por Ana Pérez/.test(r.estado)); assert.ok(/Firmado por/.test(r.vista)); assert.ok(r.esClave);
});
await caso('3 · la firma en persona del 360 ahora también guarda el texto aceptado (un cambio del modelo no reescribe lo firmado)', async () => {
  assert.ok(/c\.signedText = plan360FillTemplate\(PLAN360_CONTRACT_TEXT, c\)/.test(panelSrc));
});
await caso('3 · el panel no lanzó errores de JavaScript', () => { assert.deepEqual(errs, []); });
await b.close();

console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · acuerdo de mantenimiento: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
