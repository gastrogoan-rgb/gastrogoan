// Oferta Gastronómica (29/10): horario semanal en UNA fila (lista y editor), aviso de cambios sin guardar al salir,
// y estado del servicio (agotado / raciones) que manda lo guardado en vez de un borrador viejo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'OFERTA001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

const sembrar = () => page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  const dia = (a, d, h) => ({activo:a, franjas:[{desde: a ? d : '', hasta: a ? h : ''}]});
  DB.cartas = [{id:1, nombre:'CARTA PRINCIPAL', area:'cocina', activa:true,
    horario:[dia(true,'12:00','16:00'), dia(true,'12:00','16:30'), dia(true,'13:00','23:00'), dia(true,'12:00','23:30'), dia(false), {activo:true, franjas:[{desde:'12:00',hasta:'16:00'},{desde:'20:00',hasta:'23:30'}]}, dia(true,'','')],
    secciones:[{id:11, nombre:'Entrantes', platos:[{id:111, nombre:'Croquetas', precio:9, precioBase:8.18, ivaPct:10, disponible:true, stock:5, modificadores:[]}]}]}];
  DB.menus = [{id:5, nombre:'Menú del día', area:'cocina', precio:14.5, precioBase:13.18, ivaPct:10, stock:20,
    horario: Array.from({length:7}, () => dia(true,'13:00','16:00')),
    grupos:[{id:51, nombre:'Primeros', opciones:[{id:511, nombre:'Sopa', disponible:true, stock:8, modificadores:[]}]}]}];
  saveDB(); currentFolder='cocina'; ofertaTab='carta'; cartaEdit=null; menuEdit=null; navigate('carta');
});
await sembrar();
await esperar(700);

await caso('Lista: el horario de cada carta cabe en UNA fila (Lun…Dom) aunque cada día tenga horas distintas', async () => {
  const r = await page.evaluate(()=>{
    const it = document.querySelector('.oc-item');
    const dias = [...it.querySelectorAll('.horsem-d')];
    return {n: dias.length, tops: [...new Set(dias.map(d => Math.round(d.getBoundingClientRect().top)))], alto: Math.round(it.getBoundingClientRect().height)};
  });
  assert.equal(r.n, 7, JSON.stringify(r));
  assert.equal(r.tops.length, 1, 'los siete días en la misma fila: ' + JSON.stringify(r));
  assert.ok(r.alto < 140, 'la fila de la lista no se hace gigante: ' + JSON.stringify(r));
});

await caso('Editor: los siete días del horario también van en una fila, cada uno con su apertura y cierre', async () => {
  const r = await page.evaluate(async ()=>{
    openCarta(1); scheduleSectionOpen['carta'] = true; renderCarta();
    await new Promise(r => setTimeout(r, 300));
    const d = [...document.querySelectorAll('.hor-d')];
    return {n: d.length, tops: [...new Set(d.map(x => Math.round(x.getBoundingClientRect().top)))], lunes: document.getElementById('carta-hor-0-0-desde').value};
  });
  assert.equal(r.n, 7);
  assert.equal(r.tops.length, 1, 'una sola fila a 1280 px: ' + JSON.stringify(r));
  assert.equal(r.lunes, '12:00', 'y conserva las horas: ' + JSON.stringify(r));
});

await caso('Una franja a medias (solo apertura) no se puede guardar y lo dice', async () => {
  const r = await page.evaluate(async ()=>{
    document.getElementById('carta-hor-1-0-hasta').value = '';
    const ok = saveCarta();
    return {ok, sigueEditando: !!cartaEdit, guardada: DB.cartas[0].horario[1].franjas[0].hasta};
  });
  assert.equal(r.ok, false);
  assert.ok(r.sigueEditando, 'no sale del editor');
  assert.equal(r.guardada, '16:30', 'y no toca lo guardado: ' + JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('carta-hor-1-0-hasta').value = '16:30'; });
});

await caso('Cambiar el nombre y salir pregunta: «Seguir editando» se queda, «Descartar» no guarda nada', async () => {
  const r = await page.evaluate(async ()=>{
    const n = document.getElementById('carta-f-nombre');
    n.value = 'OTRO NOMBRE'; n.dispatchEvent(new Event('input', {bubbles:true}));
    const chip = !document.getElementById('carta-sucio').hidden;
    navigate('home');
    await new Promise(r => setTimeout(r, 300));
    const pregunta = /sin guardar/i.test(document.getElementById('modal-box').innerText);
    const sigue1 = document.getElementById('view-carta').classList.contains('active');
    ggRespondeSalida('seguir');
    await new Promise(r => setTimeout(r, 200));
    navigate('home');
    await new Promise(r => setTimeout(r, 300));
    ggRespondeSalida('descartar');
    await new Promise(r => setTimeout(r, 400));
    return {chip, pregunta, sigue1, vista: document.querySelector('.view.active').id, nombre: DB.cartas[0].nombre, editando: !!cartaEdit};
  });
  assert.ok(r.chip, 'aparece «Cambios sin guardar»: ' + JSON.stringify(r));
  assert.ok(r.pregunta && r.sigue1, 'pregunta y no se mueve: ' + JSON.stringify(r));
  assert.equal(r.vista, 'view-home', 'tras descartar, sale: ' + JSON.stringify(r));
  assert.equal(r.nombre, 'CARTA PRINCIPAL', 'y no guardó el cambio: ' + JSON.stringify(r));
  assert.ok(!r.editando, 'el borrador desaparece');
});

await caso('Sin cambios, salir NO pregunta nada', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder = 'cocina'; navigate('carta'); await new Promise(r => setTimeout(r, 300));
    openCarta(1); await new Promise(r => setTimeout(r, 300));
    navigate('home'); await new Promise(r => setTimeout(r, 300));
    return {pregunta: /sin guardar/i.test(document.getElementById('modal-box').innerText) && document.getElementById('modal-overlay').classList.contains('active'), vista: document.querySelector('.view.active').id};
  });
  assert.ok(!r.pregunta, JSON.stringify(r));
  assert.equal(r.vista, 'view-home');
});

await caso('«Guardar y salir» guarda y sale', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder = 'cocina'; navigate('carta'); await new Promise(r => setTimeout(r, 300));
    openCarta(1); await new Promise(r => setTimeout(r, 300));
    const n = document.getElementById('carta-f-nombre');
    n.value = 'Carta nueva'; n.dispatchEvent(new Event('input', {bubbles:true}));
    navigate('home'); await new Promise(r => setTimeout(r, 300));
    ggRespondeSalida('guardar'); await new Promise(r => setTimeout(r, 500));
    return {vista: document.querySelector('.view.active').id, nombre: DB.cartas[0].nombre};
  });
  assert.equal(r.vista, 'view-home');
  assert.equal(r.nombre, 'CARTA NUEVA', JSON.stringify(r));
});

await caso('Marcar agotado en el editor se aplica YA sobre lo guardado, sin esperar a «Guardar»', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder = 'cocina'; navigate('carta'); await new Promise(r => setTimeout(r, 300));
    openCarta(1); await new Promise(r => setTimeout(r, 300));
    toggleCartaPlato(11, 111);
    const vivo = DB.cartas[0].secciones[0].platos[0].disponible;
    const sucio = !document.getElementById('carta-sucio').hidden;
    return {vivo, sucio};
  });
  assert.equal(r.vivo, false, 'ya está agotado en lo guardado: ' + JSON.stringify(r));
  assert.ok(!r.sucio, 'y no cuenta como «cambio sin guardar»: ' + JSON.stringify(r));
});

await caso('Guardar un borrador abierto ANTES del servicio no pisa las raciones que las ventas han ido restando', async () => {
  const r = await page.evaluate(async ()=>{
    DB.cartas[0].secciones[0].platos[0].disponible = true;
    DB.cartas[0].secciones[0].platos[0].stock = 5; saveDB();
    openCarta(1); await new Promise(r => setTimeout(r, 300));       // el borrador ve 5 raciones
    DB.cartas[0].secciones[0].platos[0].stock = 2;                    // el TPV vende y resta
    const n = document.getElementById('carta-f-nombre');
    n.value = 'Carta renombrada'; n.dispatchEvent(new Event('input', {bubbles:true}));
    saveCarta();
    return DB.cartas[0].secciones[0].platos[0].stock;
  });
  assert.equal(r, 2, 'manda lo vivo (2), no la foto vieja (5): ' + r);
});

await caso('Menús: mismo aviso al salir con cambios, y el menú entero conserva sus raciones al guardar', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder = 'cocina'; navigate('carta'); setOfertaTab('menus'); await new Promise(r => setTimeout(r, 400));
    openMenu(5); await new Promise(r => setTimeout(r, 300));
    DB.menus[0].stock = 11;                                            // el TPV resta mientras se edita
    const n = document.getElementById('menu-f-nombre');
    n.value = 'Menú renombrado'; n.dispatchEvent(new Event('input', {bubbles:true}));
    const chip = !document.getElementById('menu-sucio').hidden;
    navigate('home'); await new Promise(r => setTimeout(r, 300));
    const pregunta = /sin guardar/i.test(document.getElementById('modal-box').innerText);
    ggRespondeSalida('guardar'); await new Promise(r => setTimeout(r, 500));
    return {chip, pregunta, vista: document.querySelector('.view.active').id, nombre: DB.menus[0].nombre, stock: DB.menus[0].stock};
  });
  assert.ok(r.chip && r.pregunta, JSON.stringify(r));
  assert.equal(r.vista, 'view-home', JSON.stringify(r));
  assert.equal(r.nombre, 'Menú renombrado');
  assert.equal(r.stock, 11, 'las raciones vivas se respetan: ' + JSON.stringify(r));
});

await caso('La ventana de raciones: número, «sin límite» y rechazo de negativos', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder = 'cocina'; navigate('carta'); setOfertaTab('carta'); await new Promise(r => setTimeout(r, 400));
    openCarta(1); await new Promise(r => setTimeout(r, 300));
    const p = () => DB.cartas[0].secciones[0].platos[0];
    const poner = v => { setCartaPlatoStock(11, 111); document.getElementById('raciones-n').value = v; confirmarRaciones(); };
    poner('7'); const a = p().stock;
    poner('-1'); const b = p().stock;          // se rechaza
    closeModal();
    poner(''); const c = p().stock;
    return {a, b, c: c === undefined || c === null};
  });
  assert.equal(r.a, 7); assert.equal(r.b, 7, 'un negativo no cambia nada'); assert.ok(r.c, 'vacío = sin límite');
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
