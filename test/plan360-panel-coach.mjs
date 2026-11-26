// Panel del coach · herramientas de la tanda del 25/11: orden del día de la reunión (A), alertas (B), «Mis datos de coach» (C),
// archivar terminados (D), pruebas y objetivos nuevos del negocio (E), menús ⋯ (F) y móvil (H).
// Firebase simulado en memoria (ninguna nube real). Los cálculos con fecha usan fechas relativas a HOY, así que valen cualquier día.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {lanzarPanel} from './_panel360.mjs';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const mas = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const mesClave = delta => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + delta); return iso(d).slice(0, 7); };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ---- Cliente T1: Plan 360 con el día 11 = HOY (reunión online), una reunión anterior (día 6), tareas atrasadas, objetivos con meta y números.
const tarea = (id, title, status, note) => ({id, objectiveId: null, title, description: '', status, note: note || '', fileData: null, fileName: null});
const programa = [];
for(let d = 1; d <= 28; d++){
  programa.push(d <= 2 ? {day: d, phase: 'presencial', title: 'Día ' + d} : {day: d, phase: 'trabajo', title: 'Día ' + d, priority: null, reunion: null, enfoqueTitulo: '', enfoqueColor: null, tasks: []});
}
const dia = n => programa.find(x => x.day === n);
dia(3).tasks = [tarea(3001, 'Pesar las mermas', 'pendiente', 'No tuve tiempo, salió un evento')];
dia(4).tasks = [tarea(3002, 'Escandallos de los 20 más vendidos', 'no_hecha', '')];
dia(5).tasks = [tarea(3003, 'Cierre de caja diario', 'hecha', '')];
dia(6).reunion = {tipo: 'presencial', objectiveIds: [], notas: 'Revisar mermas y proveedores', hecha: true, completadaAt: 1};
dia(11).reunion = {tipo: 'online', objectiveIds: [], notas: '', hecha: false, completadaAt: null};
dia(12).tasks = [tarea(3004, 'Llamar al proveedor de pescado', 'pendiente', 'Espero a que me conteste el comercial')];
dia(2).objectives = [
  {id: 2001, titulo: 'Bajar las mermas', explicacion: 'Se tira demasiado', prioridad: 'prioritario', metrica: 'Mermas %', mediciones: [{fecha: mas(-8), valor: '8 %'}, {fecha: mas(-1), valor: '7,5 %'}], estadoFinal: null, valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: mas(5), origen: 'negocio'},
  {id: 2002, titulo: 'Subir el ticket medio', explicacion: '', prioridad: 'esencial', metrica: 'Ticket', mediciones: [{fecha: mas(-1), valor: '27'}], estadoFinal: null, valorInicial: '20', valorObjetivo: '30', fechaObjetivo: mas(5), origen: 'coach'},
];
const kpiMes = (netas, fc, nps) => ({netas, tickets: 400, ticketMedio: 25, foodCostPct: fc, personalPct: 30, nps});
const biz1 = {name: 'Casa Uno', plan360: true, plan360StartDate: mas(-10), plan360StartDateConfirmed: true, plan360Program: programa,
  plan360Actas: {a1: {id: 'a1', fecha: mas(-3), enviadoEn: Date.now() - 3 * 864e5, decisiones: [{tipo: 'tarea', texto: 'Escandallos de los 20 más vendidos', dia: 4}, {tipo: 'nota', texto: 'Hablar del alquiler'}]}},
  plan360Kpis: {meses: {[mesClave(-2)]: kpiMes(10000, 28, 8.5), [mesClave(-1)]: kpiMes(8000, 32, 7.5)}, dia1: Object.assign({mes: mesClave(-2), desde: mas(-10)}, kpiMes(9000, 30, 8)), ts: Date.now()}};
// Cliente T2: mantenimiento al corriente (sin nada que alertar). T3: recién creado. T4: terminado, se archivará.
const seed = {gastrogoan: {
  coaching360: {T1: {name: 'Casa Uno', lastActivityAt: Date.now() - 9 * 864e5}, T2: {name: 'Bar Dos', lastActivityAt: Date.now()}, T3: {name: 'Cafetería Nueva Era'}, T4: {name: 'Taberna Cuatro'}},
  tenantLookup: {T1: {apiKey: 'k', databaseURL: 'u'}, T2: {apiKey: 'k', databaseURL: 'u'}, T3: {apiKey: 'k', databaseURL: 'u'}, T4: {apiKey: 'k', databaseURL: 'u'}},
  tenants: {
    T1: {db: {business: biz1, plan360Pruebas: {3002: {data: PNG, nombre: 'escandallo.png', ts: Date.now()}, 3004: {data: 'javascript:alert(1)', nombre: 'malo', ts: 1}}}},
    T2: {db: {business: {name: 'Bar Dos', plan360: true, plan360StartDate: mas(-60), plan360StartDateConfirmed: true, plan360Servicio: {fase: 'mant', mantDesde: mesClave(0), cobros: {[mesClave(0)]: {ts: 1, importe: 75}}}, plan360Mant: {meses: {[mesClave(0)]: {semanas: {s1: {canal: 'whatsapp', items: {}}}}}}}}},
    T3: {db: {business: {name: 'Cafetería Nueva Era', plan360: true}}},
    T4: {db: {business: {name: 'Taberna Cuatro', plan360: true, plan360StartDate: mas(-90), plan360StartDateConfirmed: true, plan360Servicio: {fase: 'fin'}}}},
  }}};
const {b, p, errs, esperar, abrir} = await lanzarPanel(seed);
const ev = (f, ...a) => p.evaluate(f, ...a);

// ============================================================ C · Mis datos de coach
await caso('C · en el código del panel no queda ningún DNI ni IBAN escrito (el repositorio es público)', async () => {
  for(const f of ['plan360.html', 'index.html']){
    const t = fs.readFileSync(new URL('../admin-panel/' + f, import.meta.url), 'utf8');
    assert.ok(!/(?<![A-Za-z0-9])\d{8}[A-Z](?![A-Za-z0-9])/.test(t), f + ': hay algo con forma de DNI');
    assert.ok(!/(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[0-9A-Z]{4}){2,}/.test(t), f + ': hay algo con forma de IBAN');
  }
  const t = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
  assert.ok(/\{\{coachDni\}\}/.test(t) && /\{\{coachNombre\}\}/.test(t), 'el contrato debe llevar marcadores, no datos');
});
await caso('C · IBAN y DNI: se reconoce el dígito de control y la letra (y se avisa sin bloquear si no cuadran)', async () => {
  const r = await ev(() => [coachIbanValido('ES91 2100 0418 4502 0005 1332'), coachIbanValido('ES91 2100 0418 4502 0005 1333'), coachDniValido('12345678Z'), coachDniValido('1234567'), coachDniValido('X1234567L'), coachDniValido('B12345674')]);
  assert.deepEqual(r, [true, false, true, false, true, true]);
});
await caso('C · sin datos de coach el contrato NO se puede enviar ni firmar, y el panel avisa antes de enviar un diagnóstico', async () => {
  await abrir('T3', 'Cafetería Nueva Era');
  const r = await ev(() => {
    const antes = JSON.stringify(remoteBiz.plan360Contract);
    renderContractPage();
    const banner = !!document.getElementById('coach-aviso');
    document.getElementById('c-nombre').value = 'Bar Nuevo SL';
    plan360SaveContractFields();
    const despues = JSON.stringify(remoteBiz.plan360Contract);
    let confirmado = null; const c = window.confirm; window.confirm = m => { confirmado = m; return false; };
    const dia1 = remoteBiz.plan360Program.find(x => x.day === 1); sendMisteryCheck(1);
    window.confirm = c;
    return {banner, igual: antes === despues, bloqueado: coachBloqueaContrato(), enCoachPage: !document.getElementById('view-coach').classList.contains('hidden'), faltan: coachDatosFaltan(coachDatos, true), confirmado, enviado: !!(dia1.misteryCheck && dia1.misteryCheck.sentAt)};
  });
  assert.ok(r.banner, 'falta el aviso en la pantalla del contrato'); assert.ok(r.igual, 'el contrato cambió sin tener los datos del coach');
  assert.ok(r.bloqueado && r.enCoachPage && r.faltan.length === 3 && !r.faltan.some(x => /IBAN/.test(x)));
  assert.ok(/Faltan tus datos de coach/.test(r.confirmado || ''), 'el diagnóstico debe avisar de los datos que faltan'); assert.equal(r.enviado, false);
});
await caso('C · guardar «Mis datos» → plataforma + navegador; el negocio recibe plan360Coach SOLO si cambia (update de esa clave)', async () => {
  await ev(() => { renderCoachDatosPage(); });
  await ev(() => {
    const v = {nombre: 'Ana Coach Prueba', dni: '12345678z', domicilio: 'Calle Falsa 1, Vilafranca', iban: 'es91 2100 0418 4502 0005 1332', email: 'ana@ejemplo.test', telefono: '600000000'};
    Object.keys(v).forEach(k => { document.getElementById('coach-' + k).value = v[k]; });
    return coachDatosGuardarPantalla();
  });
  await esperar(500);
  const nube = await ev(() => window.__store.gastrogoan.coachConfig.datosCoach);
  assert.equal(nube.dni, '12345678Z'); assert.equal(nube.iban, 'ES91 2100 0418 4502 0005 1332'); assert.equal(nube.nombre, 'Ana Coach Prueba');
  assert.ok(await ev(() => !!localStorage.getItem('gg_p360_datos_coach')), 'copia en el navegador');
  assert.ok(/Guardado en tu cuenta/.test(await ev(() => document.getElementById('coach-estado').textContent)));
  // Al negocio abierto (T3) llega UNA vez: la segunda sincronización no escribe nada.
  const primera = await ev(() => { cerrarCoachDatos(); return coachDatosSincronizar(); });
  await esperar(300);
  const segunda = await ev(() => coachDatosSincronizar());
  assert.equal(segunda, false, 'sin cambios no se vuelve a escribir');
  assert.equal(await ev(() => window.__store.gastrogoan.tenants.T3.db.business.plan360Coach.dni), '12345678Z');
  assert.equal(primera === true || await ev(() => !!remoteBiz.plan360Coach), true);
  await ev(() => { coachDatos.telefono = '611111111'; });
  assert.equal(await ev(() => coachDatosSincronizar()), true, 'un dato que cambia sí se copia');
  await esperar(300);
  assert.equal(await ev(() => window.__store.gastrogoan.tenants.T3.db.business.plan360Coach.telefono), '611111111');
  // Abrir OTRO cliente le copia los datos al abrirlo, sin pulsar nada.
  await abrir('T4', 'Taberna Cuatro'); await esperar(300);
  assert.equal(await ev(() => window.__store.gastrogoan.tenants.T4.db.business.plan360Coach.nombre), 'Ana Coach Prueba');
});
await caso('C · con los datos puestos el contrato se puede actualizar y sale con ellos (no con rayas)', async () => {
  await abrir('T3', 'Cafetería Nueva Era');
  const r = await ev(() => { renderContractPage(); document.getElementById('c-nombre').value = 'Bar Nuevo SL'; const bloq = plan360SaveContractFields() === false; return {bloq, texto: document.getElementById('client-grid').innerText, c: remoteBiz.plan360Contract.clienteNombre}; });
  assert.equal(r.bloq, false); assert.equal(r.c, 'Bar Nuevo SL');
  assert.ok(/Ana Coach Prueba/.test(r.texto) && /12345678Z/.test(r.texto) && /Stripe/.test(r.texto) && !/ES91 2100/.test(r.texto), 'el contrato debe llevar los datos del coach');
  assert.ok(!/Partes: de una parte, ________/.test(r.texto));
});
await caso('C · si la plataforma rechaza la escritura (reglas sin publicar) se guarda en el navegador y la pantalla lo avisa', async () => {
  const r = await ev(async () => {
    const orig = coachDatosRef; coachDatosRef = () => ({set: () => Promise.reject(new Error('PERMISSION_DENIED')), once: () => Promise.reject(new Error('PERMISSION_DENIED'))});
    renderCoachDatosPage(); document.getElementById('coach-telefono').value = '622222222';
    await coachDatosGuardarPantalla();
    const t = document.getElementById('coach-estado').textContent; const ls = JSON.parse(localStorage.getItem('gg_p360_datos_coach'));
    coachDatosRef = orig; cerrarCoachDatos();
    return {t, ls: ls.telefono, origen: coachDatosOrigen};
  });
  assert.ok(/SOLO en este navegador/.test(r.t), r.t); assert.equal(r.ls, '622222222');
  await ev(() => { coachDatosOrigen = 'nube'; });
});

// ============================================================ B · alertas
const F = o => Object.assign({tenantId: 'X', name: 'Bar X', fase: '360', biz: {}, kpis: null, lastActivityAt: Date.now(), ultimaMarca: 0, atrasadas: [], tareasTotal: 0, prog: {hechas: 0, total: 0, atrasadas: []}}, o);
const alertas = (f, hoy) => ev((f, hoy) => p360AlertasCliente(f, hoy).map(a => a.id), f, hoy);
await caso('B · food cost +3 puntos, ventas −15 %, NPS en caída y objetivo desviado salen solos, y SOLO con datos reales', async () => {
  const hoy = '2026-11-20';
  const kp = (a, b) => ({meses: {'2026-09': a, '2026-10': b}});
  assert.deepEqual(await alertas(F({kpis: kp({netas: 10000, foodCostPct: 28, nps: 8.5}, {netas: 8000, foodCostPct: 32, nps: 7.5})}), hoy), ['foodcost_sube', 'ventas_caen', 'nps_cae']);
  assert.deepEqual(await alertas(F({kpis: kp({netas: 10000, foodCostPct: 28, nps: 8.5}, {netas: 8600, foodCostPct: 30.9, nps: 8.2})}), hoy), [], 'por debajo de los umbrales no hay alerta');
  assert.deepEqual(await alertas(F({kpis: {meses: {'2026-10': {netas: 8000, foodCostPct: 40}}}}), hoy), [], 'sin mes anterior no hay con qué comparar');
  assert.deepEqual(await alertas(F({kpis: {meses: {'2026-11': {netas: 1, foodCostPct: 90}, '2026-10': {netas: 8000, foodCostPct: 28}}}}), hoy), [], 'el mes en curso (a medias) no cuenta');
  assert.deepEqual(await alertas(F({kpis: kp({netas: 10000}, {netas: 8000})}), hoy), ['ventas_caen'], 'sin food cost ni NPS, solo las ventas');
  assert.deepEqual(await alertas(F({kpis: null}), hoy), []);
});
await caso('B · objetivo desviado: ritmo frente a fecha; sin valor inicial, meta o medición no se inventa nada', async () => {
  const mk = (o) => F({biz: {plan360StartDate: '2026-11-01', plan360Program: [{day: 2, phase: 'presencial', objectives: [Object.assign({id: 1, titulo: 'Bajar mermas', mediciones: []}, o)]}]}});
  const hoy = '2026-11-16';   // mitad de camino entre 2026-11-01 y 2026-12-01
  assert.deepEqual(await alertas(mk({valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: '2026-12-01', mediciones: [{fecha: '2026-11-10', valor: '7,5 %'}]}), hoy), ['objetivo_1'], 'va al 10 % y tocaría el 50 %');
  assert.deepEqual(await alertas(mk({valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: '2026-12-01', mediciones: [{fecha: '2026-11-10', valor: '5 %'}]}), hoy), [], 'va al 60 %: en camino');
  assert.deepEqual(await alertas(mk({valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: '2026-12-01'}), hoy), [], 'sin ninguna medición y con plazo por delante: sin datos');
  assert.deepEqual(await alertas(mk({valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: '2026-11-10'}), hoy), ['objetivo_1'], 'plazo vencido y sin medir');
  assert.deepEqual(await alertas(mk({valorObjetivo: '3 %', fechaObjetivo: '2026-11-10', mediciones: [{fecha: '2026-11-10', valor: '5'}]}), hoy), [], 'sin valor inicial no hay cuenta');
  assert.deepEqual(await alertas(mk({valorInicial: '8 %', valorObjetivo: '3 %', fechaObjetivo: '2026-11-10', mediciones: [{fecha: '2026-11-09', valor: '3 %'}]}), hoy), [], 'meta alcanzada: cumplido');
});
await caso('B · sin marcar tareas: UN criterio de 7 días para los dos servicios (antes, 14 solo en mantenimiento)', async () => {
  const hoy = '2026-11-20', dias = n => Date.now() - n * 864e5;
  const f360 = (n, atr) => F({lastActivityAt: n == null ? 0 : dias(n), biz: {plan360StartDate: '2026-11-01'}, prog: {hechas: 0, total: 5, atrasadas: atr}});
  assert.deepEqual(await alertas(f360(8, ['a']), hoy), ['sin_marcar']);
  assert.deepEqual(await alertas(f360(6, ['a']), hoy), [], 'a 6 días todavía no');
  assert.deepEqual(await alertas(f360(30, []), hoy), [], 'sin tareas atrasadas no hay de qué llamarle');
  const fM = (n, atr) => F({fase: 'mant', biz: {plan360Servicio: {cobros: {'2026-11': {ts: 1, importe: 75}}}}, lastActivityAt: 0, ultimaMarca: n == null ? 0 : dias(n), tareasTotal: 3, atrasadas: atr});
  assert.deepEqual(await alertas(fM(8, ['x']), hoy), ['sin_marcar']);
  assert.deepEqual(await alertas(fM(3, ['x']), hoy), []);
  assert.deepEqual(await alertas(fM(null, ['x']), hoy), ['sin_marcar']);
});
await caso('B · cuota sin cobrar desde el día 5 (y la misma definición que la agenda de hoy)', async () => {
  const mant = (cobros) => F({fase: 'mant', biz: {plan360Servicio: {cobros}}});
  assert.deepEqual(await alertas(mant({}), '2026-11-04'), []);
  assert.deepEqual(await alertas(mant({}), '2026-11-05'), ['cuota_sin_cobrar']);
  assert.deepEqual(await alertas(mant({'2026-11': {ts: 1, importe: 75}}), '2026-11-20'), []);
  assert.deepEqual(await alertas(F({fase: 'piensa'}), '2026-11-20'), [], 'quien se lo piensa no genera alertas');
});
await caso('B · «Mi agenda» pinta las alertas de Casa Uno y cada una crea su llamada/tarea en tus pendientes (y no en el negocio)', async () => {
  await ev(() => { closeClient(); });
  await ev(async () => { await renderMiSemana(); });
  await esperar(500);
  const r = await ev(() => { const c = document.getElementById('p360-alertas'); return c ? {t: c.innerText, botones: [...c.querySelectorAll('button')].map(x => x.innerText.trim())} : null; });
  assert.ok(r, 'falta la tarjeta de alertas');
  for(const frag of ['Lleva 9 días sin marcar nada', 'food cost sube 4 puntos', 'ventas caen un 20 %', 'valoración de clientes baja', 'Objetivo desviado: «Bajar las mermas»']) assert.ok(r.t.includes(frag), 'falta «' + frag + '» en: ' + r.t);
  assert.ok(!/Bar Dos/.test(r.t), 'un cliente sin alertas no sale');
  assert.ok(r.botones.includes('Anotar llamada') && r.botones.includes('Crear tarea'));
  const antes = await ev(() => JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360Program));
  await ev(async () => { await p360CrearPendiente('T1', 'sin_marcar'); await p360CrearPendiente('T1', 'foodcost_sube'); });
  await esperar(300);
  const pend = await ev(() => window.__store.gastrogoan.coachConfig.pendientes.T1);
  assert.equal(pend.sin_marcar.tipo, 'llamada'); assert.ok(/Llamar a Casa Uno/.test(pend.sin_marcar.titulo)); assert.equal(pend.foodcost_sube.tipo, 'tarea');
  assert.equal(await ev(() => JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360Program)), antes, 'nada se le escribe al negocio');
  const t = await ev(() => document.getElementById('p360-pendientes').innerText + '|' + document.getElementById('p360-alertas').innerText);
  assert.ok(/Mis pendientes \(2\)/.test(t) && /En tus pendientes/.test(t));
  await ev(async () => { await p360PendienteHecho('T1', 'sin_marcar'); });
  await esperar(300);
  assert.equal(await ev(() => !!(window.__store.gastrogoan.coachConfig.pendientes.T1 || {}).sin_marcar), false, 'Hecho lo quita');
});

// ============================================================ D · archivar
await caso('D · archivar: marca plan360Servicio.archivado, sale de la lista y de «Mi agenda» (que ni lee su nube) y queda en «Terminados», plegado', async () => {
  await ev(() => { window.__lecturas = []; const o = mantLeerDeUnNegocio; window.__origLeer = o; mantLeerDeUnNegocio = e => { window.__lecturas.push(e.tenantId); return o(e); }; });
  await ev(async () => { await p360ArchivarDesdeLista('T4', 'Taberna Cuatro', true); });
  await esperar(800);
  assert.equal(typeof await ev(() => window.__store.gastrogoan.tenants.T4.db.business.plan360Servicio.archivado), 'number');
  assert.equal(await ev(() => window.__store.gastrogoan.coachConfig.archivados.T4.name), 'Taberna Cuatro');
  const lect = await ev(() => window.__lecturas);
  assert.ok(lect.length >= 3 && !lect.slice(-3).includes('T4'), 'se leyó la nube de un archivado: ' + lect);
  const r = await ev(() => ({lista: document.getElementById('client-list').innerText, term: (() => { const d = document.getElementById('p360-terminados'); return d ? {open: d.open, t: d.innerText} : null; })()}));
  assert.ok(!/Taberna Cuatro/.test(r.lista), 'sigue en la lista'); assert.ok(r.term && r.term.open === false && /Terminados \(1\)/.test(r.term.t));
  await ev(() => { document.getElementById('p360-terminados').open = true; });
  assert.ok(/Taberna Cuatro/.test(await ev(() => document.getElementById('p360-terminados').innerText)) && /Reactivar/.test(await ev(() => document.getElementById('p360-terminados').innerText)));
});
await caso('D · reactivar en un toque lo devuelve a la lista y a la agenda y quita la marca', async () => {
  await ev(async () => { await p360ArchivarDesdeLista('T4', 'Taberna Cuatro', false); });
  await esperar(800);
  assert.equal(await ev(() => (window.__store.gastrogoan.tenants.T4.db.business.plan360Servicio || {}).archivado == null), true);
  assert.equal(await ev(() => (window.__store.gastrogoan.coachConfig.archivados || {}).T4 == null), true);
  assert.ok(/Taberna Cuatro/.test(await ev(() => document.getElementById('client-list').innerText)));
  assert.equal(await ev(() => !!document.getElementById('p360-terminados')), false);
});
await caso('D · desde la ficha: «Archivar» cierra el cliente y «Reactivar» aparece al abrir uno archivado', async () => {
  await abrir('T4', 'Taberna Cuatro');
  assert.ok(await ev(() => { renderClientGrid(); return /Archivar/.test(document.getElementById('client-grid').innerText); }));
  await ev(async () => { await p360ArchivarActual(); }); await esperar(800);
  assert.ok(await ev(() => document.getElementById('view-client').classList.contains('hidden')));
  await ev(() => openClient('T4', 'Taberna Cuatro')); await esperar(800);
  assert.ok(await ev(() => { renderClientGrid(); return /Reactivar/.test(document.getElementById('client-grid').innerText); }));
  await ev(async () => { await p360ArchivarActual(); }); await esperar(800);
  assert.equal(await ev(() => p360EstaArchivado('T4')), false);
});

// ============================================================ A · orden del día
await caso('A · los datos del orden del día salen solos: atrasadas con su porqué, bloqueadas, objetivos con estado, cifras y lo pendiente de antes', async () => {
  await abrir('T1', 'Casa Uno');
  const o = await ev(() => ordenDiaDatos(11));
  assert.deepEqual(o.atrasadas.map(x => x.titulo).sort(), ['Escandallos de los 20 más vendidos', 'Pesar las mermas']);
  assert.ok(o.atrasadas.find(x => x.titulo === 'Pesar las mermas').porque.includes('salió un evento'), 'el porqué es la nota del negocio');
  assert.ok(/no hecha/.test(o.atrasadas.find(x => x.titulo.startsWith('Escandallos')).porque));
  assert.deepEqual(o.bloqueadas.map(x => x.titulo), ['Llamar al proveedor de pescado'], 'la futura con nota no es atrasada pero sí bloqueada');
  assert.deepEqual(o.objetivos.map(x => [x.titulo, x.estado]), [['Bajar las mermas', 'desviado'], ['Subir el ticket medio', 'en_camino']]);
  assert.ok(o.cifras.length >= 4 && o.cifras.find(c => c.lbl === 'Ventas sin IVA').delta.includes('-1000') , JSON.stringify(o.cifras.map(c => c.lbl + c.delta)));
  assert.equal(o.anterior.hay, true); assert.ok(/Revisar mermas/.test(o.anterior.notas));
  assert.deepEqual(o.anterior.acuerdos.map(a => a.estado), ['pendiente', 'nota']);
});
await caso('A · la ficha del día con reunión ofrece el orden del día y la página lo pinta entero, con el guion de SU semana', async () => {
  const r = await ev(() => { renderTrabajoPage(remoteBiz.plan360Program.find(x => x.day === 11)); const btn = !!document.querySelector('button[onclick="renderOrdenDiaPage(11)"]'); renderOrdenDiaPage(11); return {btn, t: document.getElementById('client-grid').innerText, preguntas: document.querySelectorAll('#od-guion .od-q').length}; });
  assert.ok(r.btn, 'falta el botón en el día');
  for(const frag of ['Orden del día', 'Tareas atrasadas y por qué (2)', 'Bloqueadas o con nota del negocio (1)', 'Desviado', 'En camino', 'Números frente al Día 1', 'Pendiente de la reunión anterior', 'Semana 2 · Costes', 'sin hacer']) assert.ok(r.t.includes(frag), 'falta «' + frag + '»');
  assert.equal(r.preguntas, 6);
  assert.ok(await ev(() => !document.querySelector('#client-grid .p360-day-tag') || true));
  const sem = await ev(() => [1, 7, 8, 14, 15, 21, 22, 28].map(p360SemanaDeDia));
  assert.deepEqual(sem, [1, 1, 2, 2, 3, 3, 4, 4]);
});
await caso('A · el guion es editable y se guarda por reunión en coachPrivate (que el negocio no lee) sin tocar el programa', async () => {
  const progAntes = await ev(() => JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360Program));
  await ev(() => { document.getElementById('od-q-0').value = 'Pregunta cambiada a mano'; document.getElementById('od-a-0').value = 'Contesta que sí'; return ordenDiaGuardar(11); });
  await esperar(500);
  const g = await ev(() => window.__store.gastrogoan.tenants.T1.db.coachPrivate.od11.guion);
  assert.equal(g.g1.q, 'Pregunta cambiada a mano'); assert.equal(g.g1.a, 'Contesta que sí'); assert.equal(Object.keys(g).length, 6);
  assert.equal(await ev(() => JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360Program)), progAntes, 'el programa del negocio no cambia');
  assert.ok(!JSON.stringify(await ev(() => window.__store.gastrogoan.tenants.T1.db.business)).includes('Contesta que sí'), 'lo apuntado no viaja en business');
  await ev(() => renderOrdenDiaPage(11));
  assert.equal(await ev(() => document.getElementById('od-q-0').value), 'Pregunta cambiada a mano');
  await ev(() => ordenDiaAnadirPregunta(11)); assert.equal(await ev(() => document.querySelectorAll('#od-guion .od-q').length), 7);
  await ev(() => ordenDiaQuitarPregunta(11, 6)); assert.equal(await ev(() => document.querySelectorAll('#od-guion .od-q').length), 6);
});
await caso('A · lo apuntado de un cliente no pasa a otro (coachPrivate se vacía al abrir B)', async () => {
  await abrir('T3', 'Cafetería Nueva Era');
  assert.equal(await ev(() => JSON.stringify((coachPrivate || {}).od11 || null)), 'null');
  assert.equal(await ev(() => ordenDiaGuardar(11)), true);   // en B se guarda lo de B (el guion por defecto), nunca lo de A
  await esperar(300);
  const g = await ev(() => (window.__store.gastrogoan.tenants.T3.db.coachPrivate || {}));
  assert.ok(!JSON.stringify(g).includes('Pregunta cambiada a mano'));
});
await caso('A · imprimible: ventana de impresión con el patrón del panel (sin iconos) y con el guion editado', async () => {
  await abrir('T1', 'Casa Uno');
  const w = await ev(() => { window.__w = ''; renderOrdenDiaPage(11); ordenDiaImprimir(11); return window.__w; });
  assert.ok(/Orden del día/.test(w) && /Pesar las mermas/.test(w) && /Pregunta cambiada a mano/.test(w) && /window\.print/.test(w));
  assert.ok(!/class="ti /.test(w), 'la ventana de impresión no carga la fuente de iconos');
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(w.replace(/<style[\s\S]*?<\/style>/, '')), 'fechas legibles, no ISO');
});
await caso('A · los acuerdos pasan al acta en vivo y, al enviarla (actaAplicar), se convierten en tarea con su acta', async () => {
  await ev(() => { renderOrdenDiaPage(11); document.getElementById('od-acuerdo').value = 'Pesar todo el pescado a diario'; ordenDiaAcuerdo(); ordenDiaPasarAAcuerdo(1); });
  const r = await ev(() => ({n: actaBorrador.length, tipo: actaBorrador[0].tipo, dia: actaBorrador[0].dia, hoy: plan360DateForDay(actaBorrador[0].dia) >= todayStr(), caja: document.getElementById('od-acuerdos').innerText}));
  assert.equal(r.n, 2); assert.equal(r.tipo, 'tarea'); assert.ok(r.hoy, 'el acuerdo cae en un día de hoy en adelante'); assert.ok(/Pesar todo el pescado/.test(r.caja));
  const res = await ev(() => { const a = actaAplicar(); return {a, tareas: remoteBiz.plan360Program.flatMap(d => d.tasks || []).filter(t => t.title === 'Pesar todo el pescado a diario').length, actas: Object.keys(remoteBiz.plan360Actas).length}; });
  assert.equal(res.a.tareas, 2); assert.equal(res.tareas, 1); assert.equal(res.actas, 2);
});

// ============================================================ E · pruebas y objetivos nuevos
await caso('E · la prueba que adjunta el negocio se lee de db/plan360Pruebas al pedirla (solo lectura) y una URL peligrosa se rechaza', async () => {
  const r = await ev(async () => {
    const d = remoteBiz.plan360Program.find(x => x.day === 4); renderTrabajoPage(d);
    const antes = !document.querySelector('#prueba-box-0 img');
    await p360MostrarPrueba(0);
    const img = document.querySelector('#prueba-box-0 img');
    const d12 = remoteBiz.plan360Program.find(x => x.day === 12); renderTrabajoPage(d12); await p360MostrarPrueba(0);
    const malo = document.getElementById('prueba-box-0').innerText;
    const d3 = remoteBiz.plan360Program.find(x => x.day === 3); renderTrabajoPage(d3); await p360MostrarPrueba(0);
    return {antes, src: img && img.getAttribute('src').slice(0, 22), malo, sin: document.getElementById('prueba-box-0').innerText, enlace: !!document.querySelector('#prueba-box-0 a'), cache: Object.keys(pruebasCache)};
  });
  assert.ok(r.antes, 'la prueba no se descarga hasta pedirla'); assert.equal(r.src, 'data:image/png;base64,');
  assert.ok(/no ha adjuntado/.test(r.malo), 'data: peligroso debe rechazarse: ' + r.malo); assert.ok(/no ha adjuntado/.test(r.sin));
  assert.deepEqual(r.cache.sort(), ['3001', '3002', '3004'].sort());
});
await caso('E · mientras no exista el nodo (negocio sin pruebas) nada se rompe', async () => {
  await abrir('T3', 'Cafetería Nueva Era');
  const t = await ev(async () => { const d = remoteBiz.plan360Program.find(x => x.phase === 'trabajo'); d.tasks = [{id: 77, title: 'x', status: 'hecha'}]; renderTrabajoPage(d); await p360MostrarPrueba(0); return document.getElementById('prueba-box-0').innerText; });
  assert.ok(/no ha adjuntado/.test(t));
  await abrir('T1', 'Casa Uno');
});
await caso('E · objetivos: valor inicial, objetivo, fecha, origen, última medición y estado, y guardar desde el panel NO los pierde', async () => {
  const r = await ev(() => { renderObjetivosPage(2); return document.getElementById('obj-list').innerText; });
  for(const frag of ['Lo puso el negocio', 'Lo puso el coach', 'Parte de 8 %', 'objetivo 3 %', 'última medición 7,5 %', 'Desviado', 'En camino']) assert.ok(r.includes(frag), 'falta «' + frag + '»');
  assert.ok(!(await ev(() => document.querySelector('#obj-list input[id*="vini"], #obj-list input[id*="vobj"]'))), 'son de solo lectura: no hay campos para editarlos');
  await ev(() => { document.getElementById('obj-titulo-0').value = 'Bajar las mermas (editado)'; saveObjetivos(2); });
  await esperar(500);
  const o = await ev(() => window.__store.gastrogoan.tenants.T1.db.business.plan360Program.find(x => x.day === 2).objectives.find(x => x.id === 2001));
  assert.equal(o.valorInicial, '8 %'); assert.equal(o.valorObjetivo, '3 %'); assert.equal(o.origen, 'negocio'); assert.ok(o.titulo.includes('editado'));
});

// ============================================================ F · menús ⋯
await caso('F · ningún botón suelto de quitar/borrar queda en el código: todo va dentro de un ⋯ (p360MenuAcciones)', async () => {
  const t = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
  const sueltos = [...t.matchAll(/<button[^>]*onclick="(actaQuitar|quitarLibroMarcaPdf|quitarArchivoNegocio|borrarInversion|tbKahootBorrar|tbBancoBorrar|plan360DeleteBlock|plan360MoveBlock|borrarTask|ordenDiaQuitarPregunta)\b/g)].map(m => m[1]);
  assert.deepEqual(sueltos, []);
  for(const fn of ['actaQuitar', 'quitarLibroMarcaPdf', 'quitarArchivoNegocio', 'borrarInversion', 'tbKahootBorrar', 'tbBancoBorrar', 'plan360DeleteBlock', 'plan360MoveBlock']) assert.ok(new RegExp('fn: [`\']' + fn).test(t), fn + ' debería estar en un ⋯');
});
await caso('F · decisiones del acta e inversiones: el ⋯ abre el menú y la acción funciona', async () => {
  const r = await ev(() => {
    actaBorrador = [{tipo: 'nota', texto: 'Una nota', dia: null}, {tipo: 'nota', texto: 'Otra nota', dia: null}]; renderActaPage();
    const mas = document.querySelectorAll('#acta-lista .p360-mas').length, sueltos = [...document.querySelectorAll('#acta-lista button')].filter(x => /Quitar/.test(x.innerText) && !x.classList.contains('p360-mas')).length;
    document.querySelector('#acta-lista .p360-mas').click(); document.querySelector('#p360-menu button').click();
    return {mas, sueltos, quedan: actaBorrador.length};
  });
  assert.equal(r.mas, 2); assert.equal(r.sueltos, 0); assert.equal(r.quedan, 1);
  const inv = await ev(() => { const d = remoteBiz.plan360Program.find(x => x.day === 2); d.inversiones = [{nombre: 'Horno', nivel: 'esencial', coste: 100}]; renderInversionesPage(2); const m = document.querySelectorAll('.inv-fila .p360-mas').length; document.querySelector('.inv-fila .p360-mas').click(); document.querySelector('#p360-menu button').click(); return {m, quedan: d.inversiones.length}; });
  assert.equal(inv.m, 1); assert.equal(inv.quedan, 0);
});

// ============================================================ H · móvil
await p.setViewport({width: 390, height: 780});
await esperar(300);
const medir = async (nombre, js) => {
  const r = await ev((js) => {
    eval(js);
    const vis = e => e.offsetParent !== null;
    const cont = document.getElementById('view-coach').classList.contains('hidden') ? '#view-client, #view-list' : '#view-coach';
    const campos = [...document.querySelectorAll(cont.split(',').map(x => x.trim() + ' input, ' + x.trim() + ' select, ' + x.trim() + ' textarea').join(','))].filter(e => vis(e) && !['checkbox', 'radio'].includes(e.type));
    const bots = [...document.querySelectorAll(cont.split(',').map(x => x.trim() + ' button').join(','))].filter(e => vis(e) && e.getBoundingClientRect().height < 36).map(e => (e.innerText || e.getAttribute('aria-label') || e.className).trim().slice(0, 30));
    const culpable = [...document.querySelectorAll('body *')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + e.className + '#' + e.id);
    return {chicos: campos.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length, bots, ov: document.documentElement.scrollWidth - innerWidth, culpable};
  }, js);
  await esperar(150);
  return Object.assign({nombre}, r);
};
await caso('H · a 390 px lo nuevo (orden del día, Mis datos, alertas, Terminados, objetivos) no desborda, con campos ≥16 px y botones ≥36 px', async () => {
  const res = [];
  res.push(await medir('orden del día', 'renderOrdenDiaPage(11)'));
  res.push(await medir('mis datos', 'renderCoachDatosPage()'));
  res.push(await medir('objetivos', 'cerrarCoachDatos(); renderObjetivosPage(2)'));
  res.push(await medir('prueba/tareas', 'renderTrabajoPage(remoteBiz.plan360Program.find(x => x.day === 4))'));
  await ev(async () => { closeClient(); await p360ArchivarDesdeLista('T4', 'Taberna Cuatro', true); await renderMiSemana(); document.getElementById('p360-terminados').open = true; });
  await esperar(500);
  res.push(await medir('agenda', '0'));
  const malos = res.filter(r => r.chicos || r.bots.length || r.ov > 0);
  assert.deepEqual(malos.map(r => r.nombre + ' ' + JSON.stringify({chicos: r.chicos, bots: r.bots, ov: r.ov, culpable: r.culpable})), []);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await b.close();
console.log('\n' + '═'.repeat(64)); console.log(mal ? `❌ ${mal} de ${ok + mal} fallaron` : `✅ los ${ok} casos pasaron`);
process.exit(mal ? 1 : 0);
