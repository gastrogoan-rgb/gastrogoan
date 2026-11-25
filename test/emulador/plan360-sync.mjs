// Plan 360º contra Firebase de VERDAD (emulador oficial): DOS aparatos del mismo negocio (tablet y móvil) y el coach escribiendo por
// claves `business/plan360*`, como hace su panel. Es el único sitio donde se ve lo que de verdad hace la nube: las pruebas locales no
// pueden decir si «el negocio marca sin conexión mientras el coach cambia el plan» se pisa o no.
//   1) coach pone tareas/objetivos mientras el negocio marca y escribe SIN conexión, y luego vuelve: nada se pisa
//   2) una foto de prueba viaja en su propio bloque (plan360Pruebas), llega al otro aparato y NO engorda `business`
//   3) el contrato firmado en un aparato se ve en el otro y su aviso («Firma el contrato») desaparece en los dos
//   4) el aviso del cuestionario desaparece en los dos al contestarlo (cada aparato contesta una parte)
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const CODE = 'P360SYNC1';
const DBURL = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});

async function nuevoDispositivo(nombre){
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const errs = []; page.on('pageerror', e => errs.push(nombre + ': ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
    req.continue();
  });
  return {page, errs, nombre};
}
async function arrancar(d){
  await d.page.goto('http://localhost:8951/index.html', {waitUntil:'domcontentloaded'});
  await d.page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
  await d.page.evaluate(async ({code, dburl}) => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey:'k', pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL: dburl};
    await saveDB();
  }, {code: CODE, dburl: DBURL});
  await d.page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 3000));
  await d.page.evaluate(() => ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove()));
}
const esperar = async (d, fn, arg, ms = 25000) => { try{ await d.page.waitForFunction(fn, {timeout: ms, polling: 300}, arg); return true; }catch(e){ return false; } };

const A = await nuevoDispositivo('TABLET'), B = await nuevoDispositivo('MOVIL'), C = await nuevoDispositivo('COACH');
await arrancar(A); await arrancar(B); await arrancar(C);
const conectado = async d => d.page.evaluate(() => typeof cloudRef !== 'undefined' && !!cloudRef);
await caso('Los tres aparatos (tablet, móvil y el coach) están conectados al emulador', async () => { assert.ok(await conectado(A) && await conectado(B) && await conectado(C)); });

// El negocio monta el programa en la tablet y llega al móvil.
await A.page.evaluate(() => {
  DB.business.plan360 = true; ensurePlan360Program();
  DB.business.plan360StartDate = addDaysStr(todayStr(), -8); DB.business.plan360WelcomeShown = true;
  DB.business.plan360Program.find(d => d.day === 9).tasks = [{id:5000, title:'Tarea del plan', status:'pendiente', note:''}];
  saveDB();
});
await caso('El programa que monta la tablet llega al móvil con su tarea', async () => {
  assert.ok(await esperar(B, () => ((DB.business.plan360Program || []).find(d => d.day === 9) || {tasks: []}).tasks.some(t => t.id === 5000)), 'el móvil no recibió el programa');
});

// ── 1) El coach cambia el plan mientras la tablet trabaja sin conexión
const FOTO = 'data:image/jpeg;base64,' + 'QUJD'.repeat(20000);   // ~60 KB
await caso('1 · El coach añade una tarea, un objetivo y sus datos mientras la tablet marca y escribe SIN conexión: al volver, nada se pisa', async () => {
  await A.page.evaluate(() => { firebase.database().goOffline(); });
  await A.page.evaluate(() => {
    const t = DB.business.plan360Program.find(d => d.day === 9).tasks.find(x => x.id === 5000);
    t.status = 'hecha'; t.note = 'nota escrita sin conexión';
    DB.business.plan360Intake.sections[0].questions[0].a = 'respuesta de la tablet';
    saveDB();
  });
  // El coach, como su panel: lee lo que hay en la nube y sube SOLO claves plan360* del negocio.
  await C.page.evaluate(async () => {
    const raiz = cloudRef.child('business');
    const prog = (await raiz.child('plan360Program').once('value')).val();
    const d9 = prog.find(d => d && d.day === 9), d2 = prog.find(d => d && d.day === 2);
    d9.tasks.push({id:5001, title:'Tarea nueva del coach', status:'pendiente', note:'', description:'x'});
    d2.objectives = [{id:'oc1', titulo:'Objetivo del coach', explicacion:'', prioridad:'prioritario', metrica:'Food cost', mediciones:[{fecha: todayStr(), valor:'35 %', nota:''}], estadoFinal:null}];
    const contrato = (await raiz.child('plan360Contract').once('value')).val() || {};
    await raiz.update({plan360Program: prog, plan360Contract: Object.assign({}, contrato, {precio:'950 € + IVA', formaPago:'Transferencia'}),
      plan360Coach: {nombre:'Coach de Prueba', dni:'00000000T', domicilio:'Calle Falsa 1', iban:'ES00 0000 0000 0000 0000 0000'}});
  });
  assert.ok(await esperar(B, () => ((DB.business.plan360Program.find(d => d.day === 9) || {}).tasks || []).some(t => t.id === 5001)), 'el móvil no recibió lo del coach');
  await A.page.evaluate(() => { firebase.database().goOnline(); });
  const llegaA = await esperar(A, () => ((DB.business.plan360Program.find(d => d.day === 9) || {}).tasks || []).some(t => t.id === 5001), null, 30000);
  assert.ok(llegaA, 'la tablet, al volver, no recibió la tarea del coach');
  await new Promise(r => setTimeout(r, 4000));   // la tablet sube lo suyo
  const vista = d => d.page.evaluate(() => { const t = DB.business.plan360Program.find(x => x.day === 9).tasks; const o = DB.business.plan360Program.find(x => x.day === 2).objectives || [];
    return {t5000: t.find(x => x.id === 5000), t5001: !!t.find(x => x.id === 5001), obj: o.some(x => x.id === 'oc1'), q: DB.business.plan360Intake.sections[0].questions[0].a, precio: (DB.business.plan360Contract || {}).precio, coach: !!(DB.business.plan360Coach || {}).nombre}; });
  for(const d of [A, B]){
    const v = await vista(d);
    assert.equal(v.t5000.status, 'hecha', d.nombre + ': se perdió la marca de la tarea'); assert.equal(v.t5000.note, 'nota escrita sin conexión', d.nombre + ': se perdió la nota');
    assert.ok(v.t5001 && v.obj && v.coach && v.precio === '950 € + IVA', d.nombre + ': falta lo del coach ' + JSON.stringify(v));
    assert.equal(v.q, 'respuesta de la tablet', d.nombre + ': se perdió la respuesta del cuestionario');
  }
  const nube = await C.page.evaluate(async () => { const p = (await cloudRef.child('business/plan360Program').once('value')).val(); const t = p.find(d => d && d.day === 9).tasks; return {hecha: t.find(x => x.id === 5000).status, nueva: t.some(x => x.id === 5001)}; });
  assert.deepEqual(nube, {hecha:'hecha', nueva:true}, 'la nube no quedó con las dos cosas');
});
await caso('1 · El negocio sube por rutas (business/plan360…): no aparece ningún nodo suelto «business_*» en la nube', async () => {
  const claves = await C.page.evaluate(async () => Object.keys((await cloudRef.once('value')).val() || {}).filter(k => /^business_|^plan360Pruebas_/.test(k)));
  assert.deepEqual(claves, []);
});

// ── 2) Foto de prueba en su bloque
await caso('2 · Una foto de prueba llega al otro aparato por su propio bloque y NO engorda `business` en la nube', async () => {
  await A.page.evaluate(FOTO => { const t = DB.business.plan360Program.find(d => d.day === 9).tasks.find(x => x.id === 5000); plan360PruebaGuardar(t, FOTO, 'barra.jpg', true); saveDB(); }, FOTO);
  assert.ok(await esperar(B, () => !!(DB.plan360Pruebas && DB.plan360Pruebas['5000'] && DB.plan360Pruebas['5000'].data), null, 30000), 'la foto no llegó al móvil');
  const r = await B.page.evaluate(() => ({nombre: DB.plan360Pruebas['5000'].nombre, bytes: DB.plan360Pruebas['5000'].data.length, marca: DB.business.plan360Program.find(d => d.day === 9).tasks.find(x => x.id === 5000).tienePrueba}));
  assert.equal(r.nombre, 'barra.jpg'); assert.equal(r.bytes, FOTO.length); assert.equal(r.marca, true, 'la marca de «tiene prueba» no llegó con la tarea');
  const nube = await C.page.evaluate(async () => { const b = JSON.stringify((await cloudRef.child('business').once('value')).val()); const f = (await cloudRef.child('plan360Pruebas/5000').once('value')).val();
    return {bizBytes: b.length, fotoEnBiz: /data:image/.test(b), nombre: f && f.nombre}; });
  assert.equal(nube.fotoEnBiz, false, 'la foto sigue dentro del bloque business'); assert.ok(nube.bizBytes < 60000, 'business pesa ' + nube.bizBytes); assert.equal(nube.nombre, 'barra.jpg');
});
await caso('2 · Quitar la foto en el móvil la quita en la tablet y en la nube (no resucita)', async () => {
  await B.page.evaluate(() => { const t = DB.business.plan360Program.find(d => d.day === 9).tasks.find(x => x.id === 5000); delete DB.plan360Pruebas['5000']; delete t.tienePrueba; saveDB(); });
  assert.ok(await esperar(A, () => !(DB.plan360Pruebas && DB.plan360Pruebas['5000']), null, 30000), 'la tablet sigue con la foto');
  await new Promise(r => setTimeout(r, 3000));
  const r = await A.page.evaluate(() => ({foto: !!(DB.plan360Pruebas || {})['5000'], marca: DB.business.plan360Program.find(d => d.day === 9).tasks.find(x => x.id === 5000).tienePrueba}));
  assert.equal(r.foto, false); assert.ok(!r.marca);
  const nube = await C.page.evaluate(async () => (await cloudRef.child('plan360Pruebas').once('value')).val());
  assert.equal(nube, null, 'la foto quedó en la nube');
});

// ── 3 y 4) Contrato y cuestionario: los avisos
const avisos = d => d.page.evaluate(() => plan360AvisosDeHoy().map(a => a.id).filter(Boolean).sort());
await caso('3 · Con precio, forma de pago y datos del coach, los dos aparatos avisan «Firma el contrato» y «Contesta el cuestionario»', async () => {
  assert.ok(await esperar(B, () => plan360AvisosDeHoy().some(a => a.id === 'plan360Contrato'), null, 20000));
  for(const d of [A, B]){ const a = await avisos(d); assert.ok(a.includes('plan360Contrato') && a.includes('plan360Cuestionario'), d.nombre + ': ' + a.join()); }
});
await caso('3 · El propietario firma en la tablet: el contrato firmado y el texto con los datos del coach se ven en el móvil y el aviso desaparece en los dos', async () => {
  await A.page.evaluate(() => { navigate('plan360'); renderPlan360Contract();
    document.getElementById('p360-c-nombre').value = 'Casa Prueba SL'; document.getElementById('p360-c-nif').value = 'B00000000'; document.getElementById('p360-c-direccion').value = 'Calle Mayor 1';
    plan360SaveContractFields();
    document.getElementById('p360-sign-name').value = 'Paco Prueba'; document.getElementById('p360-sign-dni').value = '11111111H'; plan360SignContract(); });
  assert.ok(await esperar(B, () => !!(DB.business.plan360Contract || {}).signedAt, null, 30000), 'el móvil no vio la firma');
  const r = await B.page.evaluate(() => { const c = DB.business.plan360Contract; return {nombre: c.signedName, texto: c.signedText, coach: /Coach de Prueba/.test(c.signedText) && /Calle Falsa 1/.test(c.signedText) && /ES00 0000/.test(c.signedText), cliente: /Casa Prueba SL/.test(c.signedText), aviso: plan360AvisosDeHoy().some(a => a.id === 'plan360Contrato')}; });
  assert.equal(r.nombre, 'Paco Prueba'); assert.ok(r.coach && r.cliente, 'el texto firmado no lleva los datos de las dos partes'); assert.equal(r.aviso, false);
  assert.ok(!(await avisos(A)).includes('plan360Contrato'), 'la tablet sigue avisando de firmar');
  const nube = await C.page.evaluate(async () => !!((await cloudRef.child('business/plan360Contract/signedAt').once('value')).val()));
  assert.ok(nube);
});
await caso('4 · El cuestionario se contesta entre los dos aparatos (cada uno una parte): el aviso desaparece en ambos y no se pierde ninguna respuesta', async () => {
  await B.page.evaluate(() => { DB.business.plan360Intake.sections.forEach((s, si) => s.questions.forEach((q, qi) => { if(si === 0 && qi === 0) return; if(si % 2 === 1) return; q.a = q.a || 'respuesta móvil'; })); saveDB(); });
  await A.page.evaluate(() => { DB.business.plan360Intake.sections.forEach((s, si) => s.questions.forEach(q => { if(!q.a) q.a = 'respuesta tablet'; })); saveDB(); });
  const sin = d => d.page.evaluate(() => DB.business.plan360Intake.sections.reduce((n, s) => n + s.questions.filter(q => !q.a).length, 0));
  const cuales = d => d.page.evaluate(() => DB.business.plan360Intake.sections.flatMap((s, si) => s.questions.map((q, qi) => q.a ? null : si + ':' + qi).filter(Boolean)).join(','));
  const diag = async () => JSON.stringify({A: await cuales(A), B: await cuales(B), nube: await C.page.evaluate(async () => { const i = (await cloudRef.child('business/plan360Intake').once('value')).val(); return ((i && i.sections) || []).reduce((n, s) => n + ((s && s.questions) || []).filter(q => q && !q.a).length, 0); })});
  const llego = await esperar(B, () => DB.business.plan360Intake.sections.every(s => s.questions.every(q => q.a)), null, 30000);
  assert.ok(llego, 'al móvil le faltan respuestas de la tablet ' + (llego ? '' : await diag()));
  assert.ok(await esperar(A, () => DB.business.plan360Intake.sections.every(s => s.questions.every(q => q.a)), null, 30000));
  for(const d of [A, B]){ assert.equal(await sin(d), 0); assert.ok(!(await avisos(d)).includes('plan360Cuestionario'), d.nombre + ' sigue avisando del cuestionario'); }
  assert.equal(await A.page.evaluate(() => DB.business.plan360Intake.sections[0].questions[0].a), 'respuesta de la tablet', 'se pisó la respuesta de antes');
});
await caso('Ningún error de JavaScript en ningún aparato', async () => { assert.deepEqual([...A.errs, ...B.errs, ...C.errs].filter(e => !/ERR_|Failed to load/.test(e)), []); });
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · sincronización real (emulador): los ' + ok + ' casos pasaron');
process.exit(mal ? 1 : 0);
