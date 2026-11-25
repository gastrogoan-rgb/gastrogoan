// Plan 360º · app del negocio, arreglos de la auditoría QA del 25/11: duración, contrato en vivo, prueba en tareas, avisos del arranque,
// tarea plegable en móvil, objetivos, mantenimiento (casilla, baja, plural), «Dinero sobre la mesa», idiomas y cierre.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width: ancho, height: 800});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360QA001', tenantId: ggBizTenantId('P360QA001')}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 1800));
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, plan360:true});
    delete DB.business.plan360StartDate; delete DB.business.plan360Program; delete DB.business.plan360Servicio; delete DB.business.plan360Mant;   // la IndexedDB la comparten las páginas de la prueba
    ensurePlan360Program();
    DB.business.plan360StartDate = addDaysStr(todayStr(), -4);   // día 5
    const d5 = DB.business.plan360Program.find(d => d.day === 5);
    d5.tasks = [{id:101, title:'Revisar mermas', description:'Pesa lo que se tira', status:'pendiente', note:''}, {id:102, title:'Llamar al proveedor', status:'hecha', note:''}];
    const d2 = DB.business.plan360Program.find(d => d.day === 2);
    d2.objectives = [{id:'oc1', titulo:'Bajar el food cost del 34 % al 30 % en tres meses sin tocar la calidad de los platos de la carta', explicacion:'', prioridad:'prioritario', metrica:'Food cost', mediciones:[{fecha:todayStr(), valor:'34', nota:''}], estadoFinal:null}];
    navigate('plan360');
  });
  return page;
}
const page = await abrir(1280);

// ── P1-2 duración
const dur = await page.evaluate(() => ({
  carta: PLAN360_WELCOME_TEXT, contrato: PLAN360_CONTRACT_TEXT,
  tit: I18N.es['plan360.programTitle'],
}));
await caso('P1-2 La duración es «4 semanas (28 días)» en carta, contrato y cabecera; ningún «26 días»', async () => {
  assert.ok(/28 días/.test(dur.carta) && !/26 días/.test(dur.carta));
  assert.ok(/28 días/.test(dur.contrato) && !/26 días/.test(dur.contrato));
  assert.ok(/28/.test(dur.tit));
});

// ── P1-12 idiomas
const idi = await page.evaluate(() => {
  const o = {};
  ['ca','en'].forEach(l => {
    localStorage.setItem(LANG_LS, l);
    o[l] = {carta: plan360WelcomeTexto(), dia: plan360TituloDia({title:'Día 7'}), pres: plan360TituloDia({title:'Presentación y entrega del plan'}), propio: plan360TituloDia({title:'Semana de la cocina'})};
  });
  localStorage.removeItem(LANG_LS);
  return o;
});
await caso('P1-12 La carta de bienvenida y los títulos de día salen en catalán e inglés (un título del coach se respeta)', async () => {
  assert.ok(/Benvinguda|benvinguda/.test(idi.ca.carta) && !/Estimado/.test(idi.ca.carta));
  assert.ok(/welcome|Welcome/.test(idi.en.carta) && !/Estimado/.test(idi.en.carta));
  assert.equal(idi.ca.dia, 'Dia 7'); assert.equal(idi.en.dia, 'Day 7');
  assert.ok(/Presentació/.test(idi.ca.pres) && /presentation/i.test(idi.en.pres));
  assert.equal(idi.en.propio, 'Semana de la cocina');
});

// ── P1-3 contrato en vivo
await page.evaluate(() => { DB.business.plan360Contract = Object.assign({}, DB.business.plan360Contract, {precio:'950 € + IVA', formaPago:'Transferencia'}); delete DB.business.plan360Contract.signedAt; renderPlan360Contract(); });
await page.type('#p360-c-nombre', 'Casa Paco SL');
await page.type('#p360-c-nif', 'B12345678');
await page.type('#p360-c-direccion', 'Calle Mayor 1');
const con = await page.evaluate(() => ({
  texto: document.getElementById('p360-contrato-texto').innerText,
  firmaN: document.getElementById('p360-sign-name').value, firmaD: document.getElementById('p360-sign-dni').value,
  boton: [...document.querySelectorAll('#plan360-content button')].some(b => /Actualizar datos del contrato/.test(b.textContent)),
}));
await caso('P1-3 Escribir nombre/NIF/dirección rehace el texto del contrato sin pulsar nada y sin «Actualizar datos»', async () => {
  assert.ok(/Casa Paco SL/.test(con.texto) && /B12345678/.test(con.texto) && /Calle Mayor 1/.test(con.texto));
  assert.ok(!/________/.test(con.texto.replace(/\s+/g, ' ').split('3. Tarifas')[0]));
  assert.equal(con.boton, false);
});
await caso('P1-3 La firma sale ya con nombre y NIF; una sola vez en todo el flujo', async () => {
  assert.equal(con.firmaN, 'Casa Paco SL'); assert.equal(con.firmaD, 'B12345678');
  await page.evaluate(() => { document.getElementById('p360-c-nombre').dispatchEvent(new Event('change')); plan360SignContract(); });
  const c = await page.evaluate(() => DB.business.plan360Contract);
  assert.ok(c.signedAt && c.signedName === 'Casa Paco SL' && /Casa Paco SL/.test(c.signedText));
});

// ── P1-4 prueba en tareas (+ P1-6 tarea plegable)
await page.evaluate(() => navigate('plan360'));
const png = await page.evaluate(() => new Promise(res => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0,0,3000,2000); x.fillStyle = '#39c'; for(let i=0;i<400;i++) x.fillRect(Math.random()*3000, Math.random()*2000, 90, 90); c.toBlob(b => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }, 'image/png'); }));
await page.evaluate(async (dataUrl) => {
  const blob = await (await fetch(dataUrl)).blob();
  const f = new File([blob], 'barra.png', {type:'image/png'});
  plan360GuardarPrueba(5, 0, 101, f);
}, png);
await page.waitForFunction(() => (DB.business.plan360Program.find(d => d.day === 5).tasks[0].pruebaData || '').startsWith('data:image/jpeg'), {timeout: 8000});
const pr = await page.evaluate(() => { const tk = DB.business.plan360Program.find(d => d.day === 5).tasks[0]; return {bytes: Math.round(tk.pruebaData.length * 0.75), nombre: tk.pruebaNombre, fileData: tk.fileData, mini: !!document.querySelector('.p360-prueba-mini img')}; });
await caso('P1-4 Una foto grande se comprime (≤ 350 KB), se guarda en campos propios y se ve la miniatura', async () => {
  assert.ok(pr.bytes <= 350 * 1024, pr.bytes + ' bytes'); assert.equal(pr.nombre, 'barra.jpg'); assert.ok(!pr.fileData); assert.ok(pr.mini);
});
await caso('P1-4 Un archivo no imagen de más de 350 KB se rechaza con aviso y no se guarda', async () => {
  await page.evaluate(() => { plan360GuardarPrueba(5, 1, 102, new File([new Uint8Array(400 * 1024)], 'grande.pdf', {type:'application/pdf'})); });
  const r = await page.evaluate(() => ({p: DB.business.plan360Program.find(d => d.day === 5).tasks[1].pruebaData || null, toast: (document.querySelector('.toast')||{}).textContent || ''}));
  assert.equal(r.p, null); assert.ok(/pesa demasiado/.test(r.toast), r.toast);
});
await caso('P1-4 Se puede ver la prueba (ventana) y quitarla con confirmación propia', async () => {
  await page.evaluate(() => plan360VerPrueba(5, 0, 101));
  assert.ok(await page.evaluate(() => !!document.querySelector('.modal img[src^="data:image/jpeg"]')));
  await page.evaluate(() => closeModal());
  await page.evaluate(() => { window.__q = plan360QuitarPrueba(5, 0, 101); });
  await new Promise(r => setTimeout(r, 300));
  assert.ok(await page.evaluate(() => !!document.querySelector('.modal-footer .btn-danger')), 'no salió la ventana de confirmación');
  await page.evaluate(() => acceptConfirmModal());
  await page.evaluate(() => window.__q);
  assert.ok(await page.evaluate(() => !DB.business.plan360Program.find(d => d.day === 5).tasks[0].pruebaData));
});

// ── P1-5 avisos
await page.evaluate(() => {
  const b = DB.business;
  b.plan360Contract = Object.assign({}, b.plan360Contract, {precio:'950 € + IVA', formaPago:'Transferencia'}); delete b.plan360Contract.signedAt;
  b.plan360Intake = {sections:[{title:'A', questions:[{q:'a', a:'x'},{q:'b', a:''},{q:'c', a:''}]}]};
  b.plan360Actas = {a1:{fecha:todayStr(), enviadoEn:Date.now(), decisiones:[{tipo:'nota', texto:'x'}]}};
  localStorage.removeItem('gastrogoan_avisos_vistos');
});
const av = await page.evaluate(() => avisosDeLaApp().filter(i => /plan360/.test(i.id || '')).map(i => ({id:i.id, count:i.count, label:i.label, campana:i.campana, soloDueno:i.soloDueno, oc:!!i.ocultable})));
await caso('P1-5 Sin firmar y con el cuestionario a medias salen los avisos, en campana y solo para el propietario', async () => {
  const c = av.find(x => x.id === 'plan360Contrato'), q = av.find(x => x.id === 'plan360Cuestionario');
  assert.ok(c && c.campana && c.soloDueno); assert.ok(q && q.count === 2 && /1\/3/.test(q.label));
});
await caso('P1-5 «Tu coach te ha enviado el acta» sale con Visto y se apaga al marcarlo', async () => {
  const e = av.find(x => /^plan360Envio-acta/.test(x.id)); assert.ok(e && e.oc);
  await page.evaluate(id => plan360AvisoEnvioVisto(id), e.id);
  assert.equal(await page.evaluate(() => avisosDeLaApp().filter(i => /^plan360Envio-acta/.test(i.id || '')).length), 0);
});
await caso('P1-5 Firmado y cuestionario completo, los avisos desaparecen; un empleado no los ve', async () => {
  await page.evaluate(() => { const b = DB.business; b.plan360Contract.signedAt = Date.now(); b.plan360Intake.sections[0].questions.forEach(q => q.a = 'ok'); });
  assert.equal(await page.evaluate(() => avisosDeLaApp().filter(i => /^plan360(Contrato|Cuestionario)/.test(i.id || '')).length), 0);
  await page.evaluate(() => { DB.business.plan360Contract.signedAt = 0; localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:'x', area:'sala', ts:Date.now()})); });
  assert.equal(await page.evaluate(() => avisosDeLaApp().filter(i => /^plan360/.test(i.id || '')).length), 0);
  await page.evaluate(() => localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})));
});

// ── P1-7 objetivos
await page.evaluate(() => { DB.business.plan360Contract.signedAt = Date.now(); renderPlan360Objectives(2); });
const ob = await page.evaluate(() => {
  const t = document.getElementById('p360-obj-titulo-0');
  return {tag: t.tagName, alto: t.offsetHeight, select: !!document.getElementById('p360-obj-prioridad-0'), fijo: !!document.querySelector('.p360-obj-urg-fija'), campos: ['vini','vobj','fecha'].every(k => document.getElementById('p360-obj-' + k + '-0'))};
});
await caso('P1-7 El título es un textarea que crece; el objetivo del coach no deja cambiar la urgencia; hay valor inicial/objetivo/fecha', async () => {
  assert.equal(ob.tag, 'TEXTAREA'); assert.ok(ob.alto > 40, 'alto ' + ob.alto); assert.equal(ob.select, false); assert.equal(ob.fijo, true); assert.equal(ob.campos, true);
});
await caso('P1-7 Un objetivo del negocio sí tiene urgencia y se puede borrar; los valores se guardan', async () => {
  await page.evaluate(() => addPlan360Objective(2));
  assert.ok(await page.evaluate(() => !!document.getElementById('p360-obj-prioridad-1')));
  await page.type('#p360-obj-titulo-1', 'Subir el ticket medio');
  await page.type('#p360-obj-vini-1', '18'); await page.type('#p360-obj-vobj-1', '21');
  await page.evaluate(() => savePlan360ObjectivesOnly(2));
  const o = await page.evaluate(() => DB.business.plan360Program.find(d => d.day === 2).objectives.find(x => x.titulo === 'Subir el ticket medio'));
  assert.equal(o.valorInicial, '18'); assert.equal(o.valorObjetivo, '21'); assert.equal(o.origen, 'negocio');
  await page.evaluate(() => { window.__b = plan360BorrarObjetivo(2, 1); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => acceptConfirmModal()); await page.evaluate(() => window.__b);
  assert.equal(await page.evaluate(() => DB.business.plan360Program.find(d => d.day === 2).objectives.length), 1);
  // el del coach no se puede borrar
  await page.evaluate(() => plan360BorrarObjetivo(2, 0));
  assert.equal(await page.evaluate(() => DB.business.plan360Program.find(d => d.day === 2).objectives.length), 1);
});
await caso('P1-7 Una medición se edita y se borra con ventana propia', async () => {
  await page.evaluate(() => plan360EditarMedicion(0, 0));
  await page.evaluate(() => { document.getElementById('p360-med-valor').value = '33'; plan360GuardarMedicionEditada(0, 0); });
  assert.equal(await page.evaluate(() => DB.business.plan360Program.find(d => d.day === 2).objectives[0].mediciones[0].valor), '33');
  await page.evaluate(() => { window.__m = plan360BorrarMedicion(0, 0); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => acceptConfirmModal()); await page.evaluate(() => window.__m);
  assert.equal(await page.evaluate(() => DB.business.plan360Program.find(d => d.day === 2).objectives[0].mediciones.length), 0);
});

// ── P1-8 mantenimiento
await page.evaluate(() => {
  const k = plan360MantClave(new Date());
  DB.business.plan360Mant = {meses:{[k]:{semanas:{s1:{canal:'whatsapp', items:{a:{tipo:'tarea', titulo:'Revisar el cuaderno de pedidos', dia:1, hecho:false}, r:{tipo:'entrega', titulo:'Reporte del mes', icono:'ti-file-analytics', hecho:true, dia:2}}}}}}};
  DB.business.plan360Servicio = {fase:'mant'};
  renderPlan360Mant(k);
});
const mt = await page.evaluate(() => {
  const lab = document.querySelector('.p360-chk44'); const r = lab.getBoundingClientRect();
  return {w: r.width, h: r.height, txt: document.getElementById('plan360-content').innerText, nativo: /confirm\(/.test(String(plan360SolicitarBaja))};
});
await caso('P1-8 Casilla de tarea con zona de toque de 44 px; «1 reporte» en singular; la baja no usa confirm() nativo', async () => {
  assert.ok(mt.w >= 44 && mt.h >= 44, mt.w + '×' + mt.h);
  assert.ok(/\b1\s*\n?\s*reporte\b/i.test(mt.txt) && !/reportes/i.test(mt.txt), 'plural');
  assert.equal(mt.nativo, false);
  await page.evaluate(() => { window.__baja = plan360SolicitarBaja(); });
  await new Promise(r => setTimeout(r, 300));
  assert.ok(await page.evaluate(() => !!document.querySelector('.modal-footer .btn-danger')));
  await page.evaluate(() => acceptConfirmModal()); await page.evaluate(() => window.__baja);
  assert.ok(await page.evaluate(() => DB.business.plan360Servicio.baja && DB.business.plan360Servicio.baja.por === 'negocio'));
});

// ── P1-11 dinero sobre la mesa
const pu = await page.evaluate(() => ({
  sinPersonal: plan360Puntuaciones({foodCostPct:30, personalPct:0, mermasPct:1, nps:8, npsN:5}).map(x => x.id),
  conPersonal: plan360Puntuaciones({foodCostPct:30, personalPct:28, mermasPct:1, nps:8, npsN:5}).map(x => x.id),
  svg: plan360RadarSvg(plan360Puntuaciones({foodCostPct:30, personalPct:28, mermasPct:1, nps:8, npsN:5})),
}));
await caso('P1-11 Con 0 % de personal «Equipo» no puntúa; el radar deja margen para etiquetas largas', async () => {
  assert.ok(!pu.sinPersonal.includes('personal')); assert.ok(pu.conPersonal.includes('personal'));
  const vb = /viewBox="(-?\d+) 0 (\d+) 240"/.exec(pu.svg); assert.ok(vb && Number(vb[1]) <= -60 && Number(vb[2]) >= 420, pu.svg.slice(0, 60));
});

// ── P1-18 / P2
await caso('P1-18 El balance no nombra el mantenimiento y la oferta cuadra con el servicio; sin emojis en el WhatsApp semanal', async () => {
  const x = await page.evaluate(() => ({a: I18N.es['plan360.bal.seguimos'], b: I18N.es['plan360.maintenanceIncludes'], w: plan360SemanaTexto()}));
  assert.ok(!/mantenimiento/i.test(x.a)); assert.ok(!/presencial/i.test(x.b) && /WhatsApp/.test(x.b) && /videollamada/.test(x.b));
  assert.ok(!/[\u{1F300}-\u{1FAFF}✅\u{1F3AF}]/u.test(x.w), x.w);
});

// ── P1-6 móvil: tarea plegable (otra página a 360 px)
const m = await abrir(360);
const mv = await m.evaluate(() => { renderPlan360Grid(); const f = document.querySelector('.p360-hoy .p360-tarea'); return {cerrada: !f.classList.contains('is-abierta'), extra: getComputedStyle(f.querySelector('.pl-extra')).display, alto: f.offsetHeight, est: !!f.querySelector('.p360-tarea-est'), tit: f.querySelector('.p360-tarea-tit').getBoundingClientRect().height}; });
await caso('P1-6 A 360 px la tarea de «Hoy» muestra título y estado, y lo demás cuelga de un toque (≤ 90 px plegada)', async () => {
  assert.equal(mv.extra, 'none'); assert.ok(mv.est); assert.ok(mv.alto <= 90, 'alto ' + mv.alto);
  await m.evaluate(() => ggTogglePlegable(null, document.querySelector('.p360-hoy .p360-tarea')));
  assert.notEqual(await m.evaluate(() => getComputedStyle(document.querySelector('.p360-hoy .p360-tarea .pl-extra')).display), 'none');
});
await caso('P1-6 En PC todo sigue a la vista', async () => {
  await page.evaluate(() => renderPlan360Grid());
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.p360-hoy .p360-tarea .pl-extra')).display), 'none');
});
const sc = await m.evaluate(() => { renderPlan360Contract(); return document.documentElement.scrollWidth - document.documentElement.clientWidth; });
await caso('Sin desborde horizontal a 360 px en contrato ni objetivos', async () => {
  assert.ok(sc <= 0, 'contrato +' + sc);
  const s2 = await m.evaluate(() => { DB.business.plan360Program.find(d => d.day === 2).objectives = [{id:'z', titulo:'Objetivo largo de ejemplo para medir el desborde', prioridad:'esencial', metrica:'x', mediciones:[{fecha:todayStr(), valor:'3', nota:'una nota larga de verdad'}], origen:'negocio'}]; renderPlan360Objectives(2); return document.documentElement.scrollWidth - document.documentElement.clientWidth; });
  assert.ok(s2 <= 0, 'objetivos +' + s2);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · app (QA 25/11): ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
