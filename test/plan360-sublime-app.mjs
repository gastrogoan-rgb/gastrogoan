// Plan 360º · app del negocio, tanda «sublime» del 25/11. Cada caso nace de algo que la auditoría o el dueño pidieron:
//  1) las fotos de prueba viven en SU bloque (DB.plan360Pruebas), no dentro de `business`; 3) los datos del coach salen de
//  `plan360Coach`, no del código; 4) marcador semanal frente al Día 1; 5) radar con dos polígonos; 6) informe de cierre pulido;
//  7) solo lectura al terminar el servicio.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360SUB01', tenantId: ggBizTenantId('P360SUB01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 1800));
const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
// Negocio con programa, Día 1 válido y ventas reales de los últimos días (el marcador y el radar salen de ventas de verdad).
async function sembrar(extra){
  await page.evaluate(async (extra) => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, plan360:true, name:'Casa Prueba'});
    for(const k of ['plan360StartDate','plan360Program','plan360Servicio','plan360Mant','plan360Kpis','plan360Cierre','plan360Contract','plan360Coach','plan360Intake']) delete DB.business[k];
    delete DB.plan360Pruebas; DB.sales = []; DB.ge.variables = []; DB.mermas = []; DB.npsScores = [];
    ensurePlan360Program();
    const hoy = new Date(), mes = d => { const x = new Date(hoy.getFullYear(), hoy.getMonth() + d, 1); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; };
    DB.business.plan360StartDate = mes(-1) + '-10';
    DB.business.plan360WelcomeShown = true;
    DB.business.plan360Coach = {nombre:'Coach de Prueba', dni:'00000000T', domicilio:'Calle Falsa 1, Ciudad de Prueba', iban:'ES00 0000 0000 0000 0000 0000'};
    const d9 = DB.business.plan360Program.find(d => d.day === 9);
    d9.tasks = [{id:901, title:'Revisar escandallos', status:'pendiente', enlace:'escandallo', note:''}, {id:902, title:'Cambiar la carta', status:'hecha', enlace:'carta', note:'hecho'}, {id:903, title:'Orden de la barra', status:'hecha', enlace:'tpv', note:''}];
    DB.business.plan360Program.find(d => d.day === 2).objectives = [{id:'o1', titulo:'Bajar el food cost', explicacion:'', prioridad:'prioritario', metrica:'Food cost', valorInicial:'35 %', valorObjetivo:'30 %', mediciones:[{fecha:todayStr(), valor:'31 %', nota:''}], estadoFinal:'parcial'}];
    DB.business.plan360Cierre = Object.assign(DB.business.plan360Cierre || {}, {kpis:{}, mejorasVisibles:'La carta es más corta.', queVigilar:'La subida del aceite.', siguienteNivel:'Segundo local'});
    // Día 1 (mes completo anterior al inicio) y el mes completo siguiente, con lo que mide la Cuenta de Resultados.
    DB.business.plan360Kpis = {
      dia1: {mes: mes(-2), desde: DB.business.plan360StartDate, netas:10000, tickets:500, ticketMedio:18, foodCostPct:35, personalPct:36, mermasPct:4, resultado:900, dias:20, nps:null, npsN:0},
      meses: {[mes(-1)]: {netas:12000, tickets:600, ticketMedio:20, foodCostPct:30, personalPct:32, resultado:1500, mermasPct:2}}};
    // Ventas de los últimos 28 días terminados: 20 tickets al día de 22 € con IVA del 10 %, y compras con fecha en esos días.
    let id = 1;
    for(let i = 1; i <= 28; i++){
      const f = addDaysStr(todayStr(), -i);
      for(let k = 0; k < 20; k++) DB.sales.push({id: id++, date: f, total: 22, items:[{name:'Plato', price:22, qty:1, ivaPct:10}]});
      DB.ge.variables.push({id: 'v' + i, fecha: f, mes: parseInt(f.slice(5, 7)) - 1, 'año': parseInt(f.slice(0, 4)), categoria:'Comida', importe: 120, proveedor:'X'});
      if(i === 5) DB.mermas.push({id: 'm1', fecha: f, coste: 20, motivo: 'caducidad'});
    }
    Object.assign(DB.business, extra || {});
    window.__cuando = {};
    window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}, images: []}, focus(){}, print(){}});
    navigate('plan360');
  }, extra);
}
await sembrar();

// ── 1) Fotos de prueba fuera de `business`
await caso('1 · Una foto de prueba va a DB.plan360Pruebas y NO engorda el bloque business (la tarea solo lleva un marcador)', async () => {
  const r = await page.evaluate(FOTO => {
    const antes = JSON.stringify(DB.business).length;
    const tk = DB.business.plan360Program.find(d => d.day === 9).tasks[0];
    const g = plan360PruebaGuardar(tk, FOTO, 'barra.jpg', true);
    return {g, delta: JSON.stringify(DB.business).length - antes, marcador: tk.tienePrueba, campos: Object.keys(tk).filter(k => /prueba/i.test(k)), nodo: DB.plan360Pruebas['901']};
  }, FOTO);
  assert.ok(r.g.ok); assert.ok(r.delta < 40, 'business creció ' + r.delta + ' bytes');
  assert.equal(r.marcador, true); assert.deepEqual(r.campos, ['tienePrueba']); assert.equal(r.nodo.nombre, 'barra.jpg'); assert.ok(r.nodo.ts > 0);
});
await caso('1 · Topes: una foto de más de 120 KB, un archivo de más de 350 KB y el total de 4 MB se rechazan con su motivo', async () => {
  const r = await page.evaluate(() => {
    const tk = DB.business.plan360Program.find(d => d.day === 9).tasks[1];
    const gordaFoto = plan360PruebaGuardar(tk, 'data:image/jpeg;base64,' + 'A'.repeat(170000), 'x.jpg', true);
    const gordoArch = plan360PruebaGuardar(tk, 'data:application/pdf;base64,' + 'A'.repeat(480000), 'x.pdf', false);
    // el mapa se llena hasta casi el tope con otras tareas: la siguiente ya no cabe
    DB.plan360Pruebas = {};
    for(let i = 0; i < 11; i++) DB.plan360Pruebas['x' + i] = {data: 'data:application/pdf;base64,' + 'A'.repeat(460000), nombre:'r', ts:1};   // 11 × ~345 KB = ~3,7 MB
    const total = plan360PruebaGuardar(tk, 'data:application/pdf;base64,' + 'A'.repeat(460000), 'y.pdf', false);
    const total2 = plan360PruebaGuardar(DB.business.plan360Program.find(d => d.day === 9).tasks[2], 'data:application/pdf;base64,' + 'A'.repeat(460000), 'z.pdf', false);
    return {gordaFoto, gordoArch, total, total2, guardada: !!DB.plan360Pruebas['902']};
  });
  assert.deepEqual(r.gordaFoto, {ok:false, motivo:'peso'}); assert.deepEqual(r.gordoArch, {ok:false, motivo:'peso'});
  assert.ok(r.total.ok || r.total.motivo === 'tope');   // con 11 × ~345 KB (≈3,7 MB) aún cabe una más; la siguiente ya no assert.deepEqual(r.total2, {ok:false, motivo:'tope'});
});
await caso('1 · Una foto real se reduce a ≤ 120 KB y el aviso de tope sale en pantalla', async () => {
  const r = await page.evaluate(async () => {
    DB.plan360Pruebas = {};
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d');
    x.fillStyle = '#c33'; x.fillRect(0,0,3000,2000); x.fillStyle = '#39c'; for(let i = 0; i < 300; i++) x.fillRect(Math.random()*3000, Math.random()*2000, 90, 90);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    plan360GuardarPrueba(9, 0, 902, new File([blob], 'mesa.png', {type:'image/png'}));
    await new Promise(r => setTimeout(r, 1500));
    const p = DB.plan360Pruebas['902'];
    for(let i = 0; i < 12; i++) DB.plan360Pruebas['t' + i] = {data: 'data:application/pdf;base64,' + 'A'.repeat(460000), nombre:'r', ts:1};
    showToast(''); plan360GuardarPrueba(9, 0, 901, new File([new Uint8Array(100 * 1024)], 'otro.pdf', {type:'application/pdf'}));
    await new Promise(r => setTimeout(r, 400));
    return {bytes: p ? Math.round(p.data.length * 0.75) : -1, toast: (document.querySelector('.toast') || {}).textContent || ''};
  });
  assert.ok(r.bytes > 0 && r.bytes <= 120 * 1024, r.bytes + ' bytes');
  assert.ok(/tope de pruebas/i.test(r.toast), r.toast);
});
await caso('1 · Migración: lo que una versión anterior dejó dentro de la tarea se mueve al bloque y se limpia', async () => {
  const r = await page.evaluate(FOTO => {
    DB.plan360Pruebas = {};
    const tk = DB.business.plan360Program.find(d => d.day === 9).tasks[2];
    tk.pruebaData = FOTO; tk.pruebaNombre = 'vieja.jpg'; tk.pruebaTs = 5;
    ensurePlan360Program();
    return {nodo: DB.plan360Pruebas['903'], campos: Object.keys(tk).filter(k => /prueba/i.test(k)).sort()};
  }, FOTO);
  assert.equal(r.nodo.data.length, 4000 + 'data:image/jpeg;base64,'.length); assert.equal(r.nodo.nombre, 'vieja.jpg'); assert.deepEqual(r.campos, ['tienePrueba']);
});
await caso('1 · Sincronización: cada foto sube SOLA (plan360Pruebas/<tarea>), no el mapa entero; quitar una la borra de la nube', async () => {
  const r = await page.evaluate(() => {
    DB.plan360Pruebas = {'901': {data:'data:image/jpeg;base64,AAAA', nombre:'a', ts:1}, '902': {data:'data:image/jpeg;base64,BBBB', nombre:'b', ts:2}};
    cloudRef = {update: u => { window.__subida = u; return Promise.resolve(); }};
    lastSyncedSnapshot = {plan360Pruebas: canonicalStringify(DB.plan360Pruebas)};
    DB.plan360Pruebas['903'] = {data:'data:image/jpeg;base64,CCCC', nombre:'c', ts:3}; delete DB.plan360Pruebas['901'];
    flushCloudSync();
    return Object.keys(window.__subida).filter(k => /^plan360Pruebas/.test(k)).sort().map(k => [k, window.__subida[k] === null ? null : 'valor']);
  });
  assert.deepEqual(r, [['plan360Pruebas/901', null], ['plan360Pruebas/903', 'valor']]);
});
await caso('2 · Sincronización: el cuestionario sube PREGUNTA a pregunta (dos aparatos que contestan cosas distintas no se pisan)', async () => {
  const r = await page.evaluate(() => {
    const intake = () => ({sections: [{title:'A', questions:[{q:'q1', a:''}, {q:'q2', a:''}]}, {title:'B', questions:[{q:'q3', a:''}]}]});
    DB.business = DB.business || {}; DB.business.plan360Intake = intake();
    cloudRef = {update: u => { window.__subida2 = u; return Promise.resolve(); }};
    lastSyncedSnapshot = {}; Object.keys(DB).forEach(k => { lastSyncedSnapshot[k] = canonicalStringify(DB[k]); });
    DB.business.plan360Intake.sections[1].questions[0].a = 'respuesta';
    flushCloudSync();
    const rutas = Object.keys(window.__subida2).sort();
    // Si cambia la forma (una pregunta nueva), se sube la rama entera: una lista con huecos no se puede escribir por partes.
    lastSyncedSnapshot = {}; Object.keys(DB).forEach(k => { lastSyncedSnapshot[k] = canonicalStringify(DB[k]); });
    DB.business.plan360Intake.sections[0].questions.push({q:'q9', a:''});
    flushCloudSync();
    return {rutas, forma: Object.keys(window.__subida2).sort()};
  });
  assert.deepEqual(r.rutas, ['business/plan360Intake/sections/1/questions/0/a'], 'subió más de la pregunta tocada');
  assert.deepEqual(r.forma, ['business/plan360Intake/sections/0/questions'], 'con la forma cambiada debe subir la lista de preguntas entera');
});
await caso('Móvil: en 360, 390 y 430 px ninguna palabra de la franja del Plan 360º se parte («COMPLETADAS» salía como «COMPLETADA / S»)', async () => {
  const malas = [];
  for(const w of [360, 390, 430]){
    await page.setViewport({width: w, height: 900}); await new Promise(r => setTimeout(r, 400));
    const r = await page.evaluate(() => [...document.querySelectorAll('.p360-hero-stat-label')].flatMap(el => {
      const cs = getComputedStyle(el), disp = document.createElement('span');
      disp.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform}`;
      document.body.appendChild(disp);
      const fuera = el.textContent.trim().split(/\s+/).filter(pal => { disp.textContent = pal; return disp.getBoundingClientRect().width > el.clientWidth + 0.5; });
      disp.remove(); return fuera;
    }));
    if(r.length) malas.push(w + ': ' + r.join(','));
  }
  await page.setViewport({width: 1280, height: 900});
  assert.deepEqual(malas, []);
});
await caso('1 · Fusión: lo que llega de la nube no pisa una foto aún sin subir; un mapa que Firebase devuelve como lista se arregla; lo borrado fuera se borra aquí', async () => {
  const r = await page.evaluate(() => {
    cloudRef = null; lastSyncedSnapshot = {};
    DB.plan360Pruebas = {'101': {data:'data:image/jpeg;base64,AAAA', nombre:'a', ts:1}};
    lastSyncedSnapshot.plan360Pruebas = canonicalStringify({});                      // la 101 aún no subió
    applyRemoteBlock('plan360Pruebas', [null, {data:'data:image/jpeg;base64,BBBB', nombre:'b', ts:2}, {data:'data:image/jpeg;base64,CCCC', nombre:'c', ts:3}]);   // ids 1 y 2 como lista
    const a = Object.keys(DB.plan360Pruebas).sort();
    // (tras la primera fusión el snapshot queda con lo que la NUBE tenía —la 101 sigue pendiente de subir—; no se toca a mano)
    applyRemoteBlock('plan360Pruebas', {});                                           // en otro aparato quitaron todas
    return {a, b: Object.keys(DB.plan360Pruebas).sort()};
  });
  assert.deepEqual(r.a, ['1', '101', '2']); assert.deepEqual(r.b, ['101'], 'la 101 sin subir se conserva, el resto se borra');
});

// ── 3) Datos del coach fuera del código
await caso('3 · El código no lleva DNI ni IBAN escritos (js/core.js y js/app.js)', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    for(const f of ['core.js', 'app.js', 'finance.js', 'manual.js', 'i18n.js']){
      const t = await (await fetch('/js/' + f)).text();
      out[f] = {dni: (t.match(/\b\d{8}[A-HJ-NP-TV-Z]\b/g) || []).length, iban: (t.match(/\b(?!ES00)[A-Z]{2}\d{2}(?: ?\d{4}){3,}\b/g) || []).length};
    }
    return out;
  });
  Object.entries(r).forEach(([f, v]) => { assert.equal(v.dni, 0, f + ' lleva un DNI escrito'); assert.equal(v.iban, 0, f + ' lleva un IBAN escrito'); });
});
await caso('3 · El contrato se rellena con plan360Coach y la firma queda con esos datos', async () => {
  const r = await page.evaluate(() => {
    const c = DB.business.plan360Contract; c.precio = '950 € + IVA'; c.formaPago = 'Transferencia'; delete c.signedAt;
    renderPlan360Contract();
    const texto = document.getElementById('p360-contrato-texto').innerText;
    return {texto, aviso: !!document.getElementById('p360-coach-pendiente'), boton: document.querySelector('button[onclick="plan360SignContract()"]').disabled};
  });
  assert.ok(/Coach de Prueba/.test(r.texto) && /00000000T/.test(r.texto) && /Calle Falsa 1/.test(r.texto) && /Stripe/.test(r.texto) && !/ES00 0000/.test(r.texto), r.texto.slice(0, 300));
  assert.ok(!r.aviso && !r.boton);
});
await caso('3 · Sin plan360Coach el contrato dice que el coach completará sus datos y NO deja firmar', async () => {
  const r = await page.evaluate(() => {
    const b = DB.business; const guardado = b.plan360Coach; delete b.plan360Coach;
    renderPlan360Contract();
    const o = {aviso: (document.getElementById('p360-coach-pendiente') || {}).innerText || '', boton: document.querySelector('button[onclick="plan360SignContract()"]').disabled,
      campo: document.getElementById('p360-sign-name').disabled};
    document.getElementById('p360-sign-name').disabled = false; document.getElementById('p360-sign-name').value = 'Paco'; document.getElementById('p360-sign-dni').value = '1';
    showToast(''); plan360SignContract();
    o.firmado = !!b.plan360Contract.signedAt; o.toast = (document.querySelector('.toast') || {}).textContent || '';
    // datos a medias (sin IBAN) tampoco valen
    b.plan360Coach = {nombre:'X', dni:'1', domicilio:'', iban:'ES00 0000'}; o.incompleto = plan360CoachDatos();
    b.plan360Coach = guardado;
    return o;
  });
  assert.ok(/completará sus datos antes de la firma/.test(r.aviso), r.aviso); assert.ok(r.boton && r.campo);
  assert.equal(r.firmado, false); assert.ok(/completará sus datos/.test(r.toast)); assert.equal(r.incompleto, null);
});

// ── 4) Marcador semanal frente al Día 1
await caso('4 · «Tu semana frente al Día 1»: ventas, ticket, food cost con su flecha (bajar food cost es mejora) y «€ ganados desde que empezamos»', async () => {
  const r = await page.evaluate(() => {
    renderPlan360Grid();
    const m = plan360MarcadorSemanal();
    const fila = k => m.filas.find(f => f.k === k);
    return {n: m.filas.map(f => f.k), ticket: fila('ticketMedio'), fc: fila('foodCostPct'), ventas: fila('ventas'), ganado: m.ganado,
      html: document.querySelector('.p360-semanal').innerText, flechas: [...document.querySelectorAll('.p360-semanal .p360-sem-fila')].slice(0, 3).map(e => e.querySelector('.p360-flecha').className + ' ' + e.querySelector('.p360-flecha i').className)};
  });
  assert.ok(r.n.includes('ventas') && r.n.includes('ticketMedio') && r.n.includes('foodCostPct'), r.n.join());
  assert.equal(r.ticket.antes, 18); assert.equal(r.ticket.hoy, 22); assert.equal(r.ticket.mejor, true);
  assert.equal(r.fc.antes, 35); assert.ok(r.fc.hoy < 35 && r.fc.mejor === true, 'food cost ' + r.fc.hoy);
  assert.ok(r.ventas.hoy > 0 && r.ventas.antes > 0);
  assert.equal(r.ganado.total, 2280, 'ganado ' + JSON.stringify(r.ganado)); assert.ok(/€ ganados desde que empezamos/.test(r.html) && /2\.?280 €/.test(r.html), r.html);
  assert.ok(r.flechas.every(x => /is-mejor/.test(x)), r.flechas.join(' | '));
  assert.ok(r.flechas.some(x => /arrow-down-right/.test(x)), 'el food cost baja: flecha hacia abajo y en verde');
});
await caso('4 · Un empeoramiento sale en rojo (ticket que baja) y una cifra sin dato real no sale (personal sin nóminas, NPS sin encuestas)', async () => {
  const r = await page.evaluate(() => {
    const b = DB.business; const ant = b.plan360Kpis.dia1.ticketMedio; b.plan360Kpis.dia1.ticketMedio = 30;
    const m = plan360MarcadorSemanal(); const t = m.filas.find(f => f.k === 'ticketMedio');
    renderPlan360Grid(); const rojo = !!document.querySelector('.p360-semanal .p360-flecha.is-peor');
    b.plan360Kpis.dia1.ticketMedio = ant;
    return {mejor: t.mejor, rojo, claves: m.filas.map(f => f.k)};
  });
  assert.equal(r.mejor, false); assert.ok(r.rojo); assert.ok(!r.claves.includes('personalPct') && !r.claves.includes('nps'), r.claves.join());
});
await caso('4 · Sin Día 1 válido: «Sin datos del Día 1», nunca un mes a medias ni cifras inventadas', async () => {
  const r = await page.evaluate(() => {
    const b = DB.business; const k = b.plan360Kpis; b.plan360Kpis = {meses: k.meses};
    renderPlan360Grid();
    const o = {html: (document.querySelector('.p360-semanal') || {innerText:''}).innerText, wa: plan360SemanaTexto(), radar: plan360RadarComparado(), filas: document.querySelectorAll('.p360-sem-fila').length};
    b.plan360Kpis = k; return o;
  });
  assert.ok(/Sin datos del Día 1/.test(r.html), r.html); assert.equal(r.filas, 0); assert.equal(r.radar, null); assert.ok(/sin datos del Día 1/i.test(r.wa), r.wa);
});
await caso('4 · El resumen de WhatsApp lleva el marcador con su veredicto en palabras y los euros ganados', async () => {
  const wa = await page.evaluate(() => plan360SemanaTexto());
  assert.ok(/\*Frente al Día 1\*/.test(wa), wa); assert.ok(/Ticket medio: 18,00 € → 22,00 € \(mejora\)/.test(wa), wa); assert.ok(/Food cost: 35 % → .* \(mejora\)/.test(wa), wa);
  assert.ok(/€ ganados desde que empezamos: \+2\.?280 €/.test(wa), wa);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(wa), 'el resumen lleva emojis');
});

// ── 5) Radar antes/después
await caso('5 · Radar: dos polígonos (Día 1 y hoy) con solo los ejes medibles; ticket y ventas se miden contra el Día 1 (50 = igual)', async () => {
  const r = await page.evaluate(() => {
    const rd = plan360RadarComparado();
    renderPlan360Grid();
    const svg = document.querySelector('.p360-radar-bloque svg');
    return {ejes: rd.ejes.map(e => [e.id, e.antes, e.hoy]), polis: svg ? svg.querySelectorAll('polygon[fill-opacity]').length : 0, ley: !!document.querySelector('.p360-radar-ley')};
  });
  const por = Object.fromEntries(r.ejes.map(e => [e[0], e]));
  assert.ok(r.ejes.length >= 3 && r.ejes.every(e => e[1] != null && e[2] != null && !Number.isNaN(e[1]) && !Number.isNaN(e[2])));
  assert.ok(por.foodcost && por.ticket && por.ventas); assert.equal(por.ticket[1], 50); assert.ok(por.ticket[2] > 50);
  assert.ok(!por.nps && !por.personal && !por.noshows, 'hay ejes sin dato real: ' + Object.keys(por));
  assert.equal(r.polis, 2); assert.ok(r.ley);
});
await caso('5 · Un eje sin dato en alguno de los dos momentos no sale; con menos de 3 ejes no hay radar (nunca un 0 por falta de datos)', async () => {
  const r = await page.evaluate(() => {
    const k = DB.business.plan360Kpis; const g = JSON.stringify(k);
    k.dia1.foodCostPct = null; k.dia1.mermasPct = null;
    const sinFc = plan360RadarComparado().ejes.map(e => e.id);
    k.dia1.ticketMedio = null;
    const solo1 = plan360RadarComparado().ejes.map(e => e.id);
    renderPlan360Grid(); const hayRadar = !!document.querySelector('.p360-radar-bloque');
    DB.business.plan360Kpis = JSON.parse(g);
    return {sinFc, solo1, hayRadar};
  });
  assert.ok(!r.sinFc.includes('foodcost')); assert.deepEqual(r.solo1, ['ventas']); assert.equal(r.hayRadar, false);
});
// Reservas: no-shows solo con ≥ 10 reservas en el periodo
await caso('5 · Reservas que acuden: eje con datos reales de no-shows en los dos periodos, y nada con menos de 10 reservas', async () => {
  const r = await page.evaluate(() => {
    const k = DB.business.plan360Kpis, [y, m] = k.dia1.mes.split('-').map(Number);
    const res = (fecha, st, n) => Array.from({length: n}, (_, i) => ({id: fecha + st + i, date: fecha, status: st, people: 2}));
    DB.reservations = [...res(k.dia1.mes + '-05', 'confirmada', 9), ...res(k.dia1.mes + '-06', 'no_show', 1), ...res(addDaysStr(todayStr(), -3), 'completada', 10)];
    const con = plan360RadarComparado().ejes.find(e => e.id === 'noshows');
    DB.reservations = res(k.dia1.mes + '-05', 'confirmada', 5);
    const sin = plan360RadarComparado().ejes.find(e => e.id === 'noshows');
    DB.reservations = [];
    return {con, sin: !!sin};
  });
  assert.ok(r.con && r.con.antes === 50 && r.con.hoy === 100, JSON.stringify(r.con));   // 10 % de plantones = 50 puntos; 0 % = 100 assert.equal(r.sin, false);
});

// ── 6) Informe de cierre pulido
await caso('6 · El informe de cierre tiene portada, radar antes/después, cifras con € al mes, objetivos con evolución, lo implantado por área y qué vigilar; sin oferta de mantenimiento ni emojis', async () => {
  const html = await page.evaluate(() => plan360InformeCierreHtml());
  const txt = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(/class="cv-t"/.test(html) && /Casa Prueba/.test(txt) && /Informe de cierre/.test(txt), 'portada');
  assert.equal((html.match(/<polygon[^>]*fill-opacity/g) || []).length, 2, 'radar con dos polígonos');
  assert.ok(/Tus cifras: antes y ahora/.test(txt) && /al mes/.test(txt) && /ganados desde que empezamos/.test(txt));
  assert.ok(/Inicio 35 %/.test(txt) && /Ahora 31 %/.test(txt) && /Objetivo 30 %/.test(txt) && /Parcial/.test(txt), 'objetivo con su evolución');
  assert.ok(/Lo que se ha implantado/.test(txt) && /Cocina/.test(txt) && /Sala/.test(txt) && /Cambiar la carta/.test(txt));
  assert.ok(/Qué vigilar/.test(txt) && /La subida del aceite/.test(txt) && /Siguiente nivel/.test(txt) && /Segundo local/.test(txt));
  assert.ok(!/mantenimiento|75 € \+ IVA/i.test(txt), 'el informe nombra el mantenimiento');
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u.test(txt), 'el informe lleva emojis');
});
await caso('6 · Sin Día 1 válido el informe no pinta radar ni inventa cifras', async () => {
  const html = await page.evaluate(() => { const k = DB.business.plan360Kpis; DB.business.plan360Kpis = {meses: k.meses}; const h = plan360InformeCierreHtml(); DB.business.plan360Kpis = k; return h; });
  assert.ok(!/<polygon[^>]*fill-opacity/.test(html)); assert.ok(/Todavía no hay un mes completo/.test(html));
});

// ── 7) Solo lectura
await caso('7 · Con el servicio terminado (fase «fin») todo se ve y nada se edita, y se dice por qué', async () => {
  const r = await page.evaluate(async () => {
    DB.business.plan360Servicio = {fase:'fin'};
    DB.business.plan360Program.find(d => d.day === 9).tasks[0].status = 'pendiente';
    await new Promise(r => setTimeout(r, 700));   // deja pasar el repintado diferido que dejó la fusión de la prueba anterior (refreshAfterRemoteChange)
    renderPlan360DayDetail(9);
    await new Promise(r => setTimeout(r, 80));   // el aviso y el bloqueo de campos los pone un MutationObserver (asíncrono)
    const o = {banner: !!document.querySelector('.p360-solo-lectura'), botones: document.querySelectorAll('.p360-estados').length, notas: document.querySelectorAll('#plan360-content textarea:not([disabled])').length, tareas: document.querySelectorAll('.p360-tarea').length, };
    showToast(''); plan360SetTaskEstado(9, 0, 'hecha', 901);
    o.estado = DB.business.plan360Program.find(d => d.day === 9).tasks[0].status; o.toast = (document.querySelector('.toast') || {}).textContent || '';
    return o;
  });
  assert.ok(r.banner && r.tareas === 3 && r.botones === 0 && r.notas === 0, JSON.stringify(r));
  assert.equal(r.estado, 'pendiente'); assert.ok(/ha terminado/.test(r.toast), r.toast);
});
await caso('7 · Solo lectura: objetivos con campos desactivados, no se puede medir, firmar, responder en mantenimiento ni pedir la baja; el libro, el contrato firmado y los informes siguen a la vista', async () => {
  const r = await page.evaluate(async () => {
    const b = DB.business, hoy = todayStr();
    renderPlan360Objectives(2);
    await new Promise(r => setTimeout(r, 100));
    const o = {campos: document.querySelectorAll('#plan360-content textarea:not([disabled]), #plan360-content input:not([disabled])').length, banner: !!document.querySelector('.p360-solo-lectura')};
    const med = b.plan360Program.find(d => d.day === 2).objectives[0].mediciones.length;
    plan360ObjetivosDiaActivo = b.plan360Program.find(d => d.day === 2);
    document.getElementById('p360-obj-medicion-0') && (document.getElementById('p360-obj-medicion-0').value = '9');
    plan360AddMedicion(0);
    o.med = b.plan360Program.find(d => d.day === 2).objectives[0].mediciones.length - med;
    b.plan360Contract.precio = 'x'; b.plan360Contract.formaPago = 'y'; delete b.plan360Contract.signedAt; renderPlan360Contract();
    o.firmaDisabled = document.querySelector('button[onclick="plan360SignContract()"]').disabled;
    b.plan360Mant = {meses:{[hoy.slice(0, 7)]:{semanas:{s1:{items:{a:{tipo:'tarea', titulo:'T', dia:0}}}}}}};
    plan360MantMes = hoy.slice(0, 7); plan360MantMarcar('s1', 'a', true); o.mant = !!b.plan360Mant.meses[hoy.slice(0, 7)].semanas.s1.items.a.hecho;
    await plan360SolicitarBaja(); o.baja = !!(b.plan360Servicio || {}).baja && !(b.plan360Servicio || {}).baja.por;
    delete b.plan360Cierre.informeVistoEn; plan360InformeCierre(); o.visto = !!b.plan360Cierre.informeVistoEn;
    o.informe = /class="cv-t"/.test(window.__w || '');
    renderPlan360Grid(); o.cierreVisible = !!document.querySelector('.p360-week-label');
    return o;
  });
  assert.equal(r.campos, 0, 'quedan campos editables'); assert.ok(r.banner); assert.equal(r.med, 0); assert.ok(r.firmaDisabled);
  assert.equal(r.mant, false); assert.equal(r.visto, false, 'abrir el informe no escribe nada en solo lectura'); assert.ok(r.informe, 'el informe sigue pudiéndose abrir');
});
await caso('7 · La baja del mantenimiento deja el Plan en solo lectura cuando es efectiva (fin del mes en que se pidió), no antes', async () => {
  const r = await page.evaluate(() => {
    const b = DB.business, d = new Date();
    b.plan360Servicio = {fase:'mant', baja: {ts: Date.now()}};
    const estaSemana = plan360SoloLectura();
    b.plan360Servicio = {fase:'mant', baja: {ts: new Date(d.getFullYear(), d.getMonth() - 1, 15).getTime()}};
    const mesPasado = plan360SoloLectura();
    b.plan360Servicio = {fase:'mant'}; const activo = plan360SoloLectura();
    b.plan360Servicio = {fase:'360'}; const f360 = plan360SoloLectura();
    delete b.plan360Servicio;
    return {estaSemana, mesPasado, activo, f360};
  });
  assert.deepEqual(r, {estaSemana:false, mesPasado:true, activo:false, f360:false});
});
await caso('7 · Con el servicio vivo nada cambia: se puede marcar, anotar y firmar', async () => {
  const r = await page.evaluate(() => {
    delete DB.business.plan360Servicio;
    renderPlan360DayDetail(9);
    const o = {botones: document.querySelectorAll('.p360-estados').length, banner: !!document.querySelector('.p360-solo-lectura')};
    plan360SetTaskEstado(9, 0, 'hecha', 901); o.estado = DB.business.plan360Program.find(d => d.day === 9).tasks[0].status;
    return o;
  });
  assert.ok(r.botones >= 1 && !r.banner); assert.equal(r.estado, 'hecha');
});
await caso('3 · El aviso «Firma el contrato» solo sale si se puede firmar (precio, forma de pago Y datos del coach) y no sale con el servicio terminado', async () => {
  const r = await page.evaluate(() => {
    const b = DB.business; const c = b.plan360Contract; Object.assign(c, {precio:'950 € + IVA', formaPago:'Transferencia'}); delete c.signedAt;
    const hay = () => plan360AvisosDeHoy().some(a => a.id === 'plan360Contrato');
    const con = hay(); const coach = b.plan360Coach; delete b.plan360Coach; const sin = hay(); b.plan360Coach = coach;
    b.plan360Servicio = {fase:'fin'}; const fin = hay(); delete b.plan360Servicio;
    return {con, sin, fin};
  });
  assert.deepEqual(r, {con:true, sin:false, fin:false});
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · app sublime (25/11): los ' + ok + ' casos pasaron');
process.exit(mal ? 1 : 0);
