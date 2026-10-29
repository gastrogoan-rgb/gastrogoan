// Proveedores (30/10): la tarjeta dice quién es y lleva tres botones (ficha, editar, eliminar); todo lo demás vive en la ficha.
// Comprueba además que lo de siempre sigue funcionando: guardar, renombrar sin dejar huérfanos, no borrar con artículos y buscar.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 900});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'PROVEE001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.providers = [
      {id:1, nombre:'Pescados Martínez', contacto:'Juan', tel:'600 111 222', email:'p@m.es', pago:'Transferencia', dir:'Mercabarna', iban:'ES12 3456', notas:'Llamar antes de las 10h', diasEntrega:['Martes','Jueves'], horaEntrega:'08:30', envioTipo:'minimo', envioMinimo:150, envioCoste:12, area:'cocina'},
      {id:2, nombre:'Verduras Ca la Rosa', area:'cocina'},
      {id:3, nombre:'Bebidas Pirineu', area:'cocina'},
    ];
    DB.ingredients = [{id:1, name:'Gambas', unit:'kg', price:38, supplier:'Pescados Martínez', area:'cocina'}];
    DB.purchaseOrders = [{id:7, supplier:'Pescados Martínez', date:todayStr(), estado:'RECIBIDO', items:[], area:'cocina'}];
    saveDB(); currentFolder = 'cocina'; navigate('proveedores');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const tarjetas = () => page.evaluate(() => [...document.querySelectorAll('#proveedores-list .pv-card')].map(c => ({
    nombre: c.querySelector('.pv-nombre').textContent.trim(),
    botones: [...c.querySelectorAll('button')].map(b => (b.getAttribute('onclick')||'').split('(')[0]),
    soloOwner: [...c.querySelectorAll('button')].map(b => b.classList.contains('owner-only')),
    texto: c.innerText.replace(/\s+/g,' ').trim(),
  })));

  await caso(`La tarjeta lleva el nombre y tres botones: ficha, editar, eliminar (${ancho}px)`, async () => {
    const t = await tarjetas();
    assert.equal(t.length, 3);
    for(const c of t){
      assert.deepEqual(c.botones, ['openProviderInfoModal','openProviderModal','deleteProvider']);
      assert.deepEqual(c.soloOwner, [false, true, true], 'la ficha la ve cualquiera; editar y eliminar, solo quien puede');
      assert.equal(c.texto, c.nombre, 'la tarjeta no debe llevar nada más que el nombre: ' + c.texto);
    }
  });

  await caso(`Los botones son pequeños pero se pueden tocar (${ancho}px)`, async () => {
    const m = await page.evaluate(() => [...document.querySelectorAll('#proveedores-list .pv-card button')].map(b => {
      const r = b.getBoundingClientRect(); const q = getComputedStyle(b, '::before');
      return {w:Math.round(r.width), h:Math.round(r.height), caja:parseFloat(q.height), fino:b.classList.contains('btn-fino')};
    }));
    for(const b of m){
      assert.ok(b.fino, 'botón sin estilo fino');
      assert.ok(b.caja <= 28, 'la caja visible debe ser pequeña: ' + b.caja);
      assert.ok(b.w >= 36 && b.h >= 36, `zona de toque pequeña: ${b.w}×${b.h}`);
    }
  });

  await caso(`La ficha enseña todo lo que antes se veía en la tarjeta (${ancho}px)`, async () => {
    await page.evaluate(() => openProviderInfoModal(1)); await esperar(400);
    const f = await page.evaluate(() => document.getElementById('modal-box').innerText.replace(/\s+/g,' '));
    for(const dato of ['Pescados Martínez','Juan','600 111 222','WhatsApp','p@m.es','Martes, Jueves','08:30','150,00','12,00','Mercabarna','ES12 3456','Llamar antes de las 10h'])
      assert.ok(f.includes(dato), 'falta en la ficha: ' + dato + ' → ' + f);
    const enlaces = await page.evaluate(() => [...document.querySelectorAll('#modal-box a')].map(a => a.getAttribute('href')));
    assert.ok(enlaces.includes('tel:600 111 222') && enlaces.some(h => h === 'https://wa.me/34600111222') && enlaces.includes('mailto:p@m.es'), 'teléfono, WhatsApp y email deben ser enlaces: ' + enlaces);
    assert.ok(/Artículos de este proveedor \(1\)/i.test(f) && /Historial de Pedidos/i.test(f), 'faltan los accesos a artículos e historial');
    await page.evaluate(() => closeModal());
  });

  await caso(`WhatsApp solo con móviles: un fijo no lo lleva, ni en la ficha ni al enviar un pedido (${ancho}px)`, async () => {
    const n = await page.evaluate(() => ['600 111 222','+34 611 222 333','0034 622333444','34633444555','+34 93 123 45 67','931234567','976 12 34 56','+44 7911 123456','12345'].map(x => whatsappDeTelefono(x)));
    assert.deepEqual(n, ['34600111222','34611222333','34622333444','34633444555','','','','447911123456','']);
    await page.evaluate(() => { DB.providers.find(p => p.id === 2).tel = '93 123 45 67'; openProviderInfoModal(2); }); await esperar(400);
    const fijo = await page.evaluate(() => ({tel: !!document.querySelector('#modal-box a[href^="tel:"]'), wa: !!document.querySelector('#modal-box a[href*="wa.me"]')}));
    assert.ok(fijo.tel && !fijo.wa, 'un fijo se puede llamar pero no lleva WhatsApp: ' + JSON.stringify(fijo));
    await page.evaluate(() => closeModal());
    await page.evaluate(() => openProviderInfoModal(1)); await esperar(400);
    const href = await page.evaluate(() => document.querySelector('#modal-box a[href*="wa.me"]')?.getAttribute('href'));
    assert.equal(href, 'https://wa.me/34600111222', 'el móvil lleva el prefijo del país para que wa.me lo encuentre');
    await page.evaluate(() => closeModal());
    // Enviar un pedido a un proveedor con fijo: avisa y no abre nada.
    const r = await page.evaluate(async () => { let abierto = 0; const w = window.open; window.open = () => { abierto++; return null; };
      DB.purchaseOrders.push({id:70, supplier:DB.providers.find(p => p.id === 2).nombre, date:todayStr(), estado:'BORRADOR', items:[], area:'cocina'});
      sendPedidoWhatsapp(DB.purchaseOrders.find(o => o.id === 70)); window.open = w; return {abierto, estado: DB.purchaseOrders.find(o => o.id === 70).estado}; });
    assert.equal(r.abierto, 0, 'no debe abrir WhatsApp con un fijo'); assert.equal(r.estado, 'BORRADOR', 'y el pedido no debe quedar como enviado');
    await page.evaluate(() => { DB.purchaseOrders = DB.purchaseOrders.filter(o => o.id !== 70); DB.providers.find(p => p.id === 2).tel = ''; });
  });

  await caso(`Una ficha casi vacía no enseña filas vacías (${ancho}px)`, async () => {
    await page.evaluate(() => openProviderInfoModal(3)); await esperar(400);
    const r = await page.evaluate(() => ({filas: document.querySelectorAll('#modal-box .pv-fila').length, aviso: !!document.querySelector('#modal-box .pv-sin-datos')}));
    assert.equal(r.filas, 0); assert.ok(r.aviso, 'debe explicar qué hacer');
    await page.evaluate(() => closeModal());
  });

  await caso(`Artículos del proveedor: se abre desde la ficha y vuelve (${ancho}px)`, async () => {
    await page.evaluate(() => { openProviderInfoModal(1); openSupplierIngredientsModal(1); }); await esperar(400);
    assert.ok((await page.evaluate(() => document.querySelector('#modal-box .pv-art-n')?.textContent)) === 'Gambas');
    await page.evaluate(() => [...document.querySelectorAll('#modal-box button')].find(b => /Volver/.test(b.textContent)).click()); await esperar(400);
    assert.ok(await page.evaluate(() => !!document.querySelector('#modal-box .pv-ficha')), 'Volver debe dejar la ficha');
    await page.evaluate(() => closeModal());
  });

  await caso(`Historial de pedidos: salta a Pedidos filtrado por ese proveedor (${ancho}px)`, async () => {
    await page.evaluate(() => { openProviderInfoModal(1); }); await esperar(300);
    await page.evaluate(() => [...document.querySelectorAll('#modal-box button')].find(b => /Historial/.test(b.textContent)).click()); await esperar(600);
    const r = await page.evaluate(() => ({vista: document.querySelector('.view.active')?.id, abierto: document.getElementById('modal-overlay').classList.contains('active'), filtro: pedidoHistorialSupplierFilter}));
    assert.equal(r.vista, 'view-pedidos'); assert.ok(!r.abierto, 'el modal debe cerrarse al saltar'); assert.equal(r.filtro, 'Pescados Martínez');
    await page.evaluate(() => navigate('proveedores')); await esperar(300);
  });

  await caso(`Editar desde la ficha y desde la tarjeta guarda y renombra sin dejar huérfanos (${ancho}px)`, async () => {
    await page.evaluate(() => { openProviderInfoModal(1); }); await esperar(300);
    await page.evaluate(() => [...document.querySelectorAll('#modal-box button')].find(b => /Editar/.test(b.textContent)).click()); await esperar(400);
    assert.ok(await page.evaluate(() => !!document.getElementById('prov-nombre')), 'Editar desde la ficha debe abrir el formulario');
    await page.evaluate(() => { document.getElementById('prov-nombre').value = 'Pescados Martínez e Hijos'; document.getElementById('prov-dia-entrega-4').checked = true; saveProvider(1); });
    await esperar(600);
    const r = await page.evaluate(() => ({p: DB.providers.find(x => x.id === 1), ing: DB.ingredients[0].supplier, ped: DB.purchaseOrders[0].supplier}));
    assert.equal(r.p.nombre, 'Pescados Martínez e Hijos');
    assert.deepEqual(r.p.diasEntrega, ['Martes','Jueves','Viernes']);
    assert.equal(r.ing, 'Pescados Martínez e Hijos'); assert.equal(r.ped, 'Pescados Martínez e Hijos');
    assert.ok((await tarjetas())[0].nombre === 'Pescados Martínez e Hijos', 'la tarjeta debe repintarse');
  });

  await caso(`Eliminar: con artículos vinculados avisa y no borra; sin ellos pide confirmación y borra (${ancho}px)`, async () => {
    await page.evaluate(() => deleteProvider(1)); await esperar(400);
    assert.equal(await page.evaluate(() => DB.providers.length), 3, 'no debe borrar uno con artículos');
    assert.ok(/artículo|vinculad/i.test(await page.evaluate(() => document.getElementById('toast')?.innerText || document.body.innerText)), 'debe explicar por qué');
    await page.evaluate(() => { deleteProvider(3); }); await esperar(400);
    await page.evaluate(() => [...document.querySelectorAll('#modal-box button')].find(b => /Confirmar|Aceptar|Sí/i.test(b.textContent))?.click()); await esperar(500);
    assert.equal(await page.evaluate(() => DB.providers.some(p => p.id === 3)), false, 'el proveedor sin artículos debe borrarse');
  });

  await caso(`El buscador filtra por nombre, contacto, teléfono y dirección (${ancho}px)`, async () => {
    const buscar = async q => { await page.evaluate(q => setProviderSearchQuery(q), q); await esperar(150); return (await tarjetas()).map(c => c.nombre); };
    assert.equal((await buscar('rosa')).length, 1);
    assert.equal((await buscar('mercabarna')).length, 1);
    assert.equal((await buscar('600 111')).length, 1);
    assert.equal((await buscar('zzzz')).length, 0);
    assert.ok(await page.evaluate(() => !!document.querySelector('#proveedores-list .empty')), 'sin resultados debe decirlo');
    await buscar('');
  });

  await caso(`Nada se desborda ni se corta (${ancho}px)`, async () => {
    const r = await page.evaluate(() => ({pagina: document.documentElement.scrollWidth > innerWidth + 1,
      cajas: [...document.querySelectorAll('#proveedores-list .pv-card')].filter(c => c.scrollWidth > c.clientWidth + 1).length}));
    assert.ok(!r.pagina && r.cajas === 0, JSON.stringify(r));
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
