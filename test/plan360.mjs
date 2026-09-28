// Plan 360°: los fallos que encontró la auditoría del 28/09, fijados para
// que no vuelvan. Todos salen de la misma raíz: el Plan 360 lo escriben DOS
// (el coach desde su panel y el negocio desde su app) contra una nube que
// NO guarda listas ni objetos vacíos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|github|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width: 1000, height: 900});
await page.goto('http://localhost:8950/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'PLAN3601', tenantId: ggBizTenantId('PLAN3601')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await page.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, name: 'Casa Prueba'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.business.plan360 = true; ensurePlan360Program();
  DB.business.plan360WelcomeShown = true;
  DB.business.plan360StartDate = addDaysStr(todayStr(), -8); // hoy es el día 9
  if(!lastSyncedSnapshot) lastSyncedSnapshot = {}; // como tras conectar con la nube
  navigate('plan360');
});

await caso('Un día sin tareas que vuelve de la nube sin `tasks` no tumba el Plan 360', async () => {
  const r = await page.evaluate(() => {
    const remoto = JSON.parse(JSON.stringify(DB.business));
    remoto.plan360Program.forEach(d => { if(d.phase === 'trabajo') delete d.tasks; }); // lo que hace Firebase con []
    applyRemoteBlock('business', remoto);
    renderPlan360Grid(); renderPlan360DayDetail(9); renderPlan360SummaryPage();
    return DB.business.plan360Program.filter(d => d.phase === 'trabajo').every(d => Array.isArray(d.tasks));
  });
  assert.ok(r, 'los días de trabajo deberían recuperar su lista de tareas');
  return 'calendario, día y resumen se pintan';
});

await caso('Lo que el negocio marcó y aún no había subido NO se pierde al llegar un cambio del coach', async () => {
  const r = await page.evaluate(() => {
    const d9 = DB.business.plan360Program.find(x => x.day === 9);
    d9.tasks = [{id: 901, title: 'Pesar raciones', status: 'pendiente', note: ''}];
    // Lo último sincronizado con la nube = este estado.
    lastSyncedSnapshot.business = canonicalStringify(DB.business);
    // El negocio marca la tarea como hecha (todavía sin subir)...
    d9.tasks[0].status = 'hecha';
    // ...y llega el bloque del coach, que ha añadido una tarea al día 10.
    const remoto = JSON.parse(lastSyncedSnapshot.business);
    remoto.plan360Program.find(x => x.day === 10).tasks = [{id: 1001, title: 'Tarea nueva del coach', status: 'pendiente'}];
    applyRemoteBlock('business', remoto);
    const p = DB.business.plan360Program;
    return {estado: p.find(x => x.day === 9).tasks[0].status, nueva: (p.find(x => x.day === 10).tasks[0] || {}).title};
  });
  assert.equal(r.estado, 'hecha', 'el «hecha» del negocio se ha perdido');
  assert.equal(r.nueva, 'Tarea nueva del coach', 'la tarea del coach no ha llegado');
  return 'se conservan las dos cosas';
});

await caso('El estado de una tarea va por su id, no por su posición', async () => {
  const r = await page.evaluate(() => {
    const d10 = DB.business.plan360Program.find(x => x.day === 10);
    d10.tasks = [{id: 11, title: 'A', status: 'pendiente'}, {id: 22, title: 'B', status: 'pendiente'}];
    // La pantalla se pintó con B en la posición 1; el coach quita A entretanto.
    d10.tasks = d10.tasks.filter(tk => tk.id !== 11);
    plan360SetTaskEstado(10, 1, 'hecha', 22);
    return d10.tasks.map(tk => tk.title + ':' + tk.status).join(',');
  });
  assert.equal(r, 'B:hecha');
  return r;
});

await caso('La oferta de mantenimiento NO aparece a mitad de programa', async () => {
  const r = await page.evaluate(() => {
    const d2 = DB.business.plan360Program.find(x => x.day === 2);
    d2.objectives = [{id: 1, titulo: 'Bajar el food cost', prioridad: 'prioritario', mediciones: []}];
    DB.business.plan360Cierre = DB.business.plan360Cierre || {kpis: {}, mantenimiento: {}};
    renderPlan360Grid();
    const aDia9 = document.getElementById('plan360-content').textContent.includes(t('plan360.maintenancePlan'));
    DB.business.plan360StartDate = addDaysStr(todayStr(), -27); // día 28
    renderPlan360Grid();
    const aDia28 = document.getElementById('plan360-content').textContent.includes(t('plan360.maintenancePlan'));
    DB.business.plan360StartDate = addDaysStr(todayStr(), -8);
    return {aDia9, aDia28};
  });
  assert.equal(r.aDia9, false, 'con objetivos puestos ya se ofrecía el mantenimiento el día 9');
  assert.equal(r.aDia28, true, 'el día 28 sí tiene que aparecer');
  return 'día 9 no · día 28 sí';
});

await caso('El Libro de marca se lee de su propio nodo y solo si es un PDF', async () => {
  const r = await page.evaluate(() => {
    const doc = DB.business.plan360Docs.find(d => d.id === 'identidad');
    doc.sentAt = Date.now(); doc.pdfName = 'libro.pdf'; delete doc.pdfData;
    DB.plan360LibroPdf = {data: 'data:application/pdf;base64,JVBERi0=', nombre: 'libro.pdf'};
    const ok = plan360LibroPdfData(doc);
    DB.plan360LibroPdf = {data: 'javascript:alert(1)'};
    const malo = plan360LibroPdfData(doc);
    return {ok: !!ok, malo};
  });
  assert.ok(r.ok, 'no encuentra el PDF en su nodo');
  assert.equal(r.malo, '', 'aceptó algo que no es un PDF');
  return 'lee el nodo y rechaza lo que no es PDF';
});

await caso('Al cambiar la plantilla del cuestionario inicial, las respuestas se conservan', async () => {
  const r = await page.evaluate(() => {
    const sec = DB.business.plan360Intake.sections[0];
    sec.questions[0].a = 'Respuesta del negocio';
    sec.title = 'Título antiguo que ya no existe'; // fuerza la regeneración
    ensurePlan360Program();
    return DB.business.plan360Intake.sections[0].questions[0].a;
  });
  assert.equal(r, 'Respuesta del negocio');
  return 'respuesta intacta';
});

await caso('Panel del coach: reconoce su propio guardado aunque Firebase quite lo vacío', async () => {
  const coach = await browser.newPage();
  await coach.setRequestInterception(true);
  coach.on('request', r => /firebase|gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
  await coach.goto('http://localhost:8950/admin-panel/plan360.html', {waitUntil: 'domcontentloaded'});
  const r = await coach.evaluate(() => {
    const enviado = sinIndefinidos({name: 'X', plan360Program: [{day: 3, phase: 'trabajo', priority: null, reunion: null, tasks: []}], plan360Docs: [{id: 'a', campos: {}}], ventas: 5});
    // Lo que devuelve Firebase: sin null, sin [] ni {}; y el negocio ha cambiado algo FUERA del Plan 360.
    const devuelto = {name: 'X', plan360Program: [{day: 3, phase: 'trabajo'}], plan360Docs: [{id: 'a'}], ventas: 9};
    return {eco: plan360Huella(enviado) === plan360Huella(devuelto), cambioReal: plan360Huella(enviado) !== plan360Huella({...devuelto, plan360StartDate: '2026-10-01'})};
  });
  await coach.close();
  assert.ok(r.eco, 'confunde su propio guardado con un cambio de fuera (y saca al coach al calendario)');
  assert.ok(r.cambioReal, 'no detecta un cambio real del Plan 360');
  return 'eco reconocido · cambio real detectado';
});

await caso('Mantenimiento: el negocio ve su mes, marca SUS tareas y no las entregas del coach', async () => {
  const r = await page.evaluate(() => {
    const clave = plan360MantClave(new Date());
    // Como vuelve de Firebase: la semana 2 sin items (vacía = borrada).
    DB.business.plan360Mant = {meses: {[clave]: {semanas: {
      s1: {canal: 'whatsapp', items: {ga: {tipo: 'entrega', titulo: 'Reporte de la semana', hecho: true, orden: 0}, gb: {tipo: 'tarea', titulo: 'Publicar <b>2</b> reels', orden: 1}}},
      s2: {canal: 'video'},
    }}}};
    renderPlan360Grid();
    const tarjeta = !!document.querySelector('.p360-card[onclick="renderPlan360Mant()"]');
    renderPlan360Mant(clave);
    const html = document.getElementById('plan360-content').innerHTML;
    plan360MantMarcar('s1', 'gb', true);
    plan360MantMarcar('s1', 'ga', false);   // una entrega NO la desmarca el negocio
    const it = DB.business.plan360Mant.meses[clave].semanas.s1.items;
    return {tarjeta, escapado: html.includes('&lt;b&gt;2&lt;/b&gt;'), whatsapp: html.includes('ti-brand-whatsapp'),
      tarea: it.gb.hecho === true && !!it.gb.hechoEn, entrega: it.ga.hecho === true};
  });
  assert.ok(r.tarjeta, 'no aparece la tarjeta de Mantenimiento en el Plan 360');
  assert.ok(r.escapado, 'el título del gadget entra en el HTML sin escapar');
  assert.ok(r.whatsapp, 'no dice por dónde se trabaja esa semana');
  assert.ok(r.tarea, 'la tarea del negocio no queda marcada');
  assert.ok(r.entrega, 'el negocio ha podido desmarcar una entrega del coach');
  return 'tarjeta · escapado · tarea marcada · entrega intocable';
});

await caso('Mantenimiento (panel): el mes tipo son 4 lunes, con claves que Firebase no convierte en lista', async () => {
  const coach = await browser.newPage();
  await coach.setRequestInterception(true);
  coach.on('request', r => /firebase|gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
  await coach.goto('http://localhost:8950/admin-panel/plan360.html', {waitUntil: 'domcontentloaded'});
  const r = await coach.evaluate(() => {
    remoteBiz = {name: 'X'};
    saveRemoteBiz = () => {};
    let grid = document.getElementById('client-grid');
    if(!grid){ grid = document.createElement('div'); grid.id = 'client-grid'; document.body.appendChild(grid); }
    renderMantPage('2026-11');           // noviembre de 2026: 5 lunes
    mantAplicarPlantilla();
    const mes = remoteBiz.plan360Mant.meses['2026-11'];
    const claves = Object.keys(mes.semanas).sort();
    const canales = ['s1', 's2', 's3', 's4'].map(k => mes.semanas[k].canal).join(',');
    const tareasS1 = Object.values(mes.semanas.s1.items).filter(i => i.tipo === 'tarea').length;
    return {claves, canales, tareasS1, lunes: mantLunesDelMes('2026-11').length};
  });
  await coach.close();
  assert.equal(r.lunes, 5);
  assert.deepEqual(r.claves, ['s1', 's2', 's3', 's4'], 'el 5º lunes debería nacer libre');
  assert.equal(r.canales, 'whatsapp,video,whatsapp,video');
  assert.ok(r.tareasS1 >= 1, 'el mes tipo no deja ninguna tarea al negocio');
  return '4 lunes · WhatsApp/vídeo alternos · tareas incluidas';
});

await caso('Ningún error de JavaScript', async () => {
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|network-request-failed/i.test(e));
  assert.deepEqual(reales.slice(0, 5), []);
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
