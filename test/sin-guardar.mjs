// «CAMBIOS SIN GUARDAR» EN TODA LA APP (13/11). El dueño: «que lo cubra todo, en cualquier lado que pase». Regla: si el usuario TOCA un campo y ese formulario tiene un
// botón de guardar, al salir —cerrar la ventana (X, Cancelar, tocar fuera), cambiar de pantalla, cerrar la pestaña— sale «Hay cambios sin guardar» con tres salidas:
// Seguir editando · Salir sin guardar · Guardar y salir. Sin haber tocado nada, no avisa. El aviso NO destruye el formulario de debajo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({width: 1280, height: 900});
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'SINGUA01', tenantId: ggBizTenantId('SINGUA01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
});
await page.reload({waitUntil: 'domcontentloaded'}); await w(2000);
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.providers = DB.providers || []; if(!DB.providers.length) DB.providers.push({id: 1, nombre: 'Makro', tel: '600111222', area: 'cocina'});
  DB.clients = DB.clients || []; if(!DB.clients.length) DB.clients.push({id: 901, name: 'Ana', phone: '600111222', points: 0});
  DB.employees = DB.employees || []; if(!DB.employees.length) DB.employees.push({id: 5, name: 'Luis', area: 'sala', pin: '', active: true});
  currentFolder = 'cocina'; ownerUnlocked = true; editUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session');
});
// Teclear de verdad (eventos de confianza), como lo haría una persona.
const teclear = async (sel, txt) => { await page.click(sel); await page.evaluate(sel => document.querySelector(sel).select(), sel); await page.keyboard.sendCharacter(txt); };
const modalAbierta = () => page.evaluate(() => document.getElementById('modal-overlay').classList.contains('active'));
const avisoSobre = () => page.evaluate(() => !!document.getElementById('gg-salida-sobre'));
const pulsar = id => page.evaluate(id => { const b = [...document.querySelectorAll('#gg-salida-sobre .btn')].find(x => (x.getAttribute('onclick') || '').includes(id)); b && b.click(); }, id);

await caso('VENTANA: sin tocar nada, cerrar con la X no avisa', async () => {
  await page.evaluate(() => openProviderModal(1)); await w(300);
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), false); assert.equal(await modalAbierta(), false, 'la ventana no se cerró');
});

await caso('VENTANA: tocar un campo y cerrar con la X avisa; «Seguir editando» deja el formulario con lo escrito', async () => {
  await page.evaluate(() => openProviderModal(1)); await w(300);
  const campo = await page.evaluate(() => { const i = [...document.querySelectorAll('#modal-box input[type=text], #modal-box input:not([type])')].find(x => x.offsetParent); return i ? (i.id ? '#' + i.id : null) : null; });
  assert.ok(campo, 'no hay campo de texto en la ficha del proveedor');
  await teclear(campo, 'Cambio de prueba');
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), true, 'no avisó');
  const txt = await page.evaluate(() => document.getElementById('gg-salida-sobre').innerText);
  assert.match(txt, /sin guardar/i); assert.match(txt, /Seguir editando/i); assert.match(txt, /Salir sin guardar/i); assert.match(txt, /Guardar y salir/i);
  await pulsar('seguir'); await w(200);
  assert.equal(await avisoSobre(), false); assert.equal(await modalAbierta(), true, 'la ventana se cerró al pulsar «Seguir editando»');
  const val = await page.evaluate(sel => document.querySelector(sel).value, campo);
  assert.equal(val, 'Cambio de prueba', 'el formulario perdió lo escrito');
  return 'aviso encima, formulario intacto';
});

await caso('VENTANA: «Salir sin guardar» cierra y no guarda', async () => {
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  await pulsar('descartar'); await w(400);
  assert.equal(await modalAbierta(), false); assert.equal(await avisoSobre(), false);
  assert.equal(await page.evaluate(() => DB.providers[0].nombre), 'Makro', 'se guardó el cambio descartado');
});

await caso('VENTANA: volver al valor original deja el formulario limpio (no avisa)', async () => {
  await page.evaluate(() => openProviderModal(1)); await w(300);
  const campo = await page.evaluate(() => { const i = [...document.querySelectorAll('#modal-box input[type=text], #modal-box input:not([type])')].find(x => x.offsetParent); return '#' + i.id; });
  const orig = await page.evaluate(sel => document.querySelector(sel).value, campo);
  await teclear(campo, 'xx'); await teclear(campo, orig || ' ');
  if(!orig) await page.evaluate(sel => { document.querySelector(sel).value = ''; }, campo);
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), false, 'avisa aunque el valor es el de partida');
  await page.evaluate(() => closeModal());
});

await caso('VENTANA: tocar fuera de la ventana y el botón Cancelar también avisan', async () => {
  await page.evaluate(() => openModal(`<div class="modal-header"><h3>Con Cancelar</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><input id="vv-c" type="text"><div class="modal-footer"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveProvider(1)">Guardar</button></div>`)); await w(300);
  await teclear('#vv-c', 'otra cosa');
  await page.evaluate(() => document.getElementById('modal-overlay').click()); await w(300);
  assert.equal(await avisoSobre(), true, 'tocar fuera no avisó'); await pulsar('seguir'); await w(150);
  await page.evaluate(() => [...document.querySelectorAll('#modal-box .modal-footer .btn')].find(x => /closeModal\(\)/.test(x.getAttribute('onclick') || '')).click()); await w(300);
  assert.equal(await avisoSobre(), true, 'Cancelar no avisó');
  await pulsar('descartar'); await w(300);
  assert.equal(await modalAbierta(), false);
});

await caso('VENTANA: «Guardar y salir» guarda de verdad y cierra', async () => {
  await page.evaluate(() => openProviderModal(1)); await w(300);
  const campo = '#prov-nombre';
  await teclear(campo, 'Makro Guardado');
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  await pulsar('guardar'); await w(1200);
  assert.equal(await modalAbierta(), false, 'no cerró tras guardar');
  assert.equal(await page.evaluate(() => DB.providers[0].nombre), 'Makro Guardado', 'no guardó');
});

await caso('VENTANA: un campo de BÚSQUEDA o una contraseña no cuentan como cambios', async () => {
  const r = await page.evaluate(async () => {
    openModal(`<div class="modal-header"><h3>Elegir</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><input type="search" id="vv-b" placeholder="Buscar"><input type="password" id="vv-p"><div class="modal-footer"><button class="btn btn-primary" onclick="saveProvider()">Guardar</button></div>`);
    await new Promise(r => setTimeout(r, 200));
    return null;
  });
  await page.click('#vv-b'); await page.keyboard.type('abc'); await page.click('#vv-p'); await page.keyboard.type('1234');
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), false, 'avisa por buscar o escribir un PIN'); assert.equal(await modalAbierta(), false);
});

await caso('VENTANA: un campo que el CÓDIGO rellena (no el usuario) no cuenta', async () => {
  await page.evaluate(async () => {
    openModal(`<div class="modal-header"><h3>Auto</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><input id="vv-a" type="text"><div class="modal-footer"><button class="btn btn-primary" onclick="saveProvider()">Guardar</button></div>`);
    const i = document.getElementById('vv-a'); i.value = 'relleno por código'; i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await w(200);
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), false); assert.equal(await modalAbierta(), false);
});

await caso('VENTANA sin botón de guardar (solo informa) o de diálogo (confirmar/avisar): nunca avisa', async () => {
  await page.evaluate(async () => {
    openModal(`<div class="modal-header"><h3>Info</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><input id="vv-i" type="text"><div class="modal-footer"><button class="btn" onclick="closeModal()">Cerrar</button></div>`);
  });
  await w(150); await page.click('#vv-i'); await page.keyboard.type('algo');
  await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
  assert.equal(await avisoSobre(), false); assert.equal(await modalAbierta(), false);
});

await caso('PANTALLAS: en cada ventana de alta (cliente, empleado, ingrediente, merma…) tocar un campo y cerrar avisa', async () => {
  const ventanas = [['cliente', 'openClientModal()'], ['empleado', 'openEmployeeModal()'], ['ingrediente', 'openIngredientModal()'], ['proveedor nuevo', 'openProviderModal()'], ['merma', 'openMermaModal()']];
  const malas = [];
  for(const [nombre, abrir] of ventanas){
    await page.evaluate(() => { try{ closeModal(); }catch(e){} document.getElementById('gg-salida-sobre')?.remove(); });
    const ok = await page.evaluate(abrir => { try{ eval(abrir); return true; }catch(e){ return String(e.message); } }, abrir);
    await w(350);
    if(ok !== true || !(await modalAbierta())){ malas.push(`${nombre}: no se abrió (${ok})`); continue; }
    const campo = await page.evaluate(() => { const i = [...document.querySelectorAll('#modal-box input[type=text], #modal-box input[type=number], #modal-box input:not([type]), #modal-box textarea')].find(x => x.offsetParent && !x.readOnly && !x.disabled); return i ? (i.id ? '#' + i.id : null) : null; });
    if(!campo){ malas.push(`${nombre}: sin campo escribible`); continue; }
    await page.click(campo); await page.keyboard.type('7');
    await page.evaluate(() => document.querySelector('#modal-box .modal-close').click()); await w(300);
    if(!(await avisoSobre())) malas.push(`${nombre}: NO avisó`);
    await page.evaluate(() => { document.getElementById('gg-salida-sobre')?.remove(); try{ closeModal(); }catch(e){} });
  }
  assert.deepEqual(malas, []);
  return ventanas.length + ' ventanas';
});

await caso('PANTALLA: Mi Negocio — escribir en una tarjeta con «Guardar» y cambiar de pantalla pregunta (con las tres salidas)', async () => {
  await page.evaluate(async () => { ggGDescartar(null); document.getElementById('gg-salida-sobre')?.remove(); try{ closeModal(); }catch(e){} currentFolder = 'gestion'; navigate('minegocio'); await new Promise(r => setTimeout(r, 900)); });
  const candidatos = await page.evaluate(() => [...document.querySelectorAll('#view-minegocio input[type=text], #view-minegocio input:not([type]), #view-minegocio textarea')].filter(x => x.offsetParent && ggGVigilable(x) && ggGContexto(x) && x.id).map(x => '#' + x.id));
  assert.ok(candidatos.length, 'Mi Negocio no tiene ningún campo con botón de guardar en su tarjeta');
  let campo = null;
  for(const c of candidatos){
    await page.evaluate(sel => document.querySelector(sel).scrollIntoView({block: 'center'}), c);
    await w(150); await page.focus(c); await page.keyboard.sendCharacter('zz');
    if(await page.evaluate(sel => /zz/.test(document.querySelector(sel).value), c)){ campo = c; break; }
  }
  assert.ok(campo, 'no se pudo escribir en ningún campo de Mi Negocio: ' + candidatos.slice(0, 5) + JSON.stringify(await page.evaluate(() => ({act: document.activeElement && (document.activeElement.id || document.activeElement.tagName), ov: document.getElementById('modal-overlay').className, sobre: !!document.getElementById('gg-salida-sobre'), flag: ggSalidaSobre, hidden: document.hidden, focus: document.hasFocus(), inert: [...document.querySelectorAll('[inert]')].length, val: (document.querySelector('#dc-motivo')||{}).value}))));
  const dbg = await page.evaluate(sel => { const e = document.querySelector(sel), r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return {v: document.querySelector(sel).value, act: document.activeElement && document.activeElement.id, pend: ggGPendientes(false).length, cmp: GG_G_CAMPOS.size, enPunto: t ? (t.id || t.className || t.tagName) : null, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], modal: document.getElementById('modal-overlay').className}; }, campo);
  await page.evaluate(() => navigate('home')); await w(400);
  const txt = await page.evaluate(() => document.getElementById('modal-box').innerText);
  assert.match(txt, /sin guardar/i, JSON.stringify(dbg) + JSON.stringify(await page.evaluate(() => ({campo: document.activeElement && document.activeElement.id, pend: ggGPendientes(false).length, sucio: !!ggEditorSucio(), vista: document.querySelector('.view.active').id, abierta: document.getElementById('modal-overlay').classList.contains('active')}))));
  assert.ok(await page.evaluate(() => document.getElementById('view-minegocio').classList.contains('active')), 'cambió de pantalla sin esperar respuesta');
  await page.evaluate(() => ggRespondeSalida('seguir')); await w(200);
  assert.ok(await page.evaluate(() => document.getElementById('view-minegocio').classList.contains('active')));
  await page.evaluate(() => navigate('home')); await w(300);
  await page.evaluate(() => ggRespondeSalida('descartar')); await w(500);
  assert.ok(await page.evaluate(() => document.getElementById('view-home').classList.contains('active')), 'no salió tras «Salir sin guardar»');
  return campo;
});

await caso('PANTALLA: sin tocar nada, cambiar de pantalla no pregunta; los ajustes que se aplican solos tampoco', async () => {
  await page.evaluate(async () => { currentFolder = 'gestion'; navigate('minegocio'); await new Promise(r => setTimeout(r, 800)); navigate('home'); await new Promise(r => setTimeout(r, 400)); });
  assert.ok(await page.evaluate(() => document.getElementById('view-home').classList.contains('active')));
  assert.equal(await page.evaluate(() => /sin guardar/i.test(document.getElementById('modal-box').innerText)), false, JSON.stringify(await page.evaluate(() => ({txt: document.getElementById('modal-box').innerText.slice(0, 160), pend: ggGPendientes(true).map(p => [p.raiz.id || p.raiz.className, p.campos.map(c => c.id)]), vista: document.querySelector('.view.active').id}))));
});

await caso('PEDIDOS: un pedido a un proveedor con cantidades puestas avisa al cambiar de pestaña, y «Guardar y salir» lo deja como borrador', async () => {
  const r = await page.evaluate(async () => {
    DB.ingredients = [{id: 1, name: 'Aceite', unit: 'L', supplier: 'Makro', area: 'cocina', price: 4, activo: true}]; DB.purchaseOrders = DB.purchaseOrders || [];
    currentFolder = 'cocina'; navigate('pedidos'); await new Promise(r => setTimeout(r, 700));
    setPedidosTab('crear'); await new Promise(r => setTimeout(r, 400));
    orderModalSupplier = 'Makro'; orderModalLines = [{ingredientId: 1, cantidad: 3, cantidadRecibida: null}]; refreshOrderForm && refreshOrderForm();
    await new Promise(r => setTimeout(r, 300));
    setPedidosTab('historial'); await new Promise(r => setTimeout(r, 400));
    return {pregunta: /sin guardar/i.test(document.getElementById('modal-box').innerText), enCrear: pedidosTab === 'crear', n: DB.purchaseOrders.length};
  });
  assert.ok(r.pregunta, 'no preguntó'); assert.ok(r.enCrear, 'cambió de pestaña sin esperar');
  await page.evaluate(() => ggRespondeSalida('guardar')); await w(1500);
  const f = await page.evaluate(() => ({n: DB.purchaseOrders.length, estado: (DB.purchaseOrders[DB.purchaseOrders.length - 1] || {}).estado}));
  assert.equal(f.n, r.n + 1, 'no se guardó el borrador'); assert.equal(f.estado, 'BORRADOR');
  return 'borrador guardado';
});

await caso('Cerrar o recargar la pestaña con algo sin guardar lo avisa el navegador (beforeunload)', async () => {
  await page.evaluate(() => { openProviderModal(1); });
  await w(300);
  const campo = '#prov-nombre';
  await teclear(campo, 'sin guardar');
  const bloquea = await page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; });
  assert.equal(bloquea, true);
  await page.evaluate(() => { ggGDescartar(null); closeModal(); });
  const libre = await page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; });
  assert.equal(libre, false);
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ cambios sin guardar: avisa donde debe y no donde no');
process.exit(fallos ? 1 : 0);
