// Suplemento delivery (11/09, segundo rediseño): tras probar un precio
// independiente por plataforma (solo referencia) y luego un PVP Delivery
// completo (precio propio, sin IVA, recalculado), el dueño pidió algo más
// simple: una casilla de suplemento (ej. +2€, con IVA incluido, como un
// extra/modificador) que se SUMA al precio de sala cuando el pedido es a
// domicilio con el reparto del propio negocio. Se aplica de verdad en el
// TPV y en la web pública de pedidos — no en "para llevar", que sigue con
// el precio de sala porque no tiene el sobrecoste que lo justifica.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

/* ---------- Parte 1: app principal (Escandallo + TPV) ---------- */
{
  const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
  const page = await browser.newPage();
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
  }, 'ESCSUPD1');
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2200));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.business.tiposServicio = {mesa:true, takeaway:true, delivery:true};
    DB.recipes = [{id: genId(), name:'Hamburguesa', area:'cocina', isBase:false, price:10, priceBase:10/1.10, deliverySupplement:2, ivaPct:10, comensales:1, consumiblesPct:0, ingredients:[]}];
    saveDB();
  });

  await caso('El campo "Suplemento delivery" aparece en la ficha del plato, con el valor guardado precargado', async () => {
    const r = await page.evaluate(()=>{
      openRecipeModal(DB.recipes[0].id);
      return document.getElementById('recipe-delivery-supplement')?.value;
    });
    assert.equal(r, '2', 'debía venir precargado con el suplemento guardado (2€): ' + r);
  });

  await caso('Editar el suplemento lo guarda tal cual (importe fijo, no se recalcula con el IVA)', async () => {
    const r = await page.evaluate(()=>{
      const recipe = DB.recipes[0];
      openRecipeModal(recipe.id);
      document.getElementById('recipe-delivery-supplement').value = '2.50';
      document.getElementById('recipe-price-base').value = String(recipe.priceBase);
      document.getElementById('recipe-iva').value = String(recipe.ivaPct);
      saveRecipe(recipe.id);
      return DB.recipes[0].deliverySupplement;
    });
    assert.equal(r, 2.5, 'el nuevo suplemento editado debe persistir tal cual: ' + r);
  });

  await caso('Dejar el campo vacío quita el suplemento (vuelve a "sin suplemento")', async () => {
    const r = await page.evaluate(()=>{
      const recipe = DB.recipes[0];
      openRecipeModal(recipe.id);
      document.getElementById('recipe-delivery-supplement').value = '';
      document.getElementById('recipe-price-base').value = String(recipe.priceBase);
      document.getElementById('recipe-iva').value = String(recipe.ivaPct);
      saveRecipe(recipe.id);
      return DB.recipes[0].deliverySupplement;
    });
    assert.equal(r, null, 'vacío debe guardarse como null (sin suplemento): ' + r);
    // Se deja configurado de nuevo para el resto de casos.
    await page.evaluate(()=>{ DB.recipes[0].deliverySupplement = 2.5; saveDB(); });
  });

  await caso('platoPriceForOrder: delivery SUMA el suplemento al precio de sala; para llevar y mesa cobran solo el de sala', async () => {
    const r = await page.evaluate(()=>{
      const p = {precio: 10, deliverySupplement: 2.5};
      return {
        delivery: platoPriceForOrder(p, {tipo:'delivery'}),
        takeaway: platoPriceForOrder(p, {tipo:'takeaway'}),
        mesa: platoPriceForOrder(p, {tipo:'mesa'}),
        sinConfigurar: platoPriceForOrder({precio:10, deliverySupplement:null}, {tipo:'delivery'}),
      };
    });
    assert.equal(r.delivery, 12.5, 'delivery debe cobrar precio de sala + suplemento (10+2,5): ' + JSON.stringify(r));
    assert.equal(r.takeaway, 10, 'para llevar debe cobrar solo el precio de sala: ' + JSON.stringify(r));
    assert.equal(r.mesa, 10, 'mesa debe cobrar solo el precio de sala: ' + JSON.stringify(r));
    assert.equal(r.sinConfigurar, 10, 'sin suplemento configurado, debe cobrar solo el precio de sala: ' + JSON.stringify(r));
  });

  await caso('Un plato de carta vinculado al Escandallo sincroniza el suplemento al abrir la Carta en el editor', async () => {
    const r = await page.evaluate(()=>{
      const recipe = DB.recipes[0];
      if(!DB.cartas.length) DB.cartas.push({id: genId(), nombre:'Carta', horario: Array.from({length:7},()=>({activo:true})), secciones:[{id: genId(), nombre:'Platos', platos:[]}]});
      const carta = DB.cartas[0];
      const sec = carta.secciones[0];
      sec.platos.push({id: genId(), recipeId: recipe.id, nombre: recipe.name, precio: recipe.price, precioBase: recipe.priceBase, deliverySupplement: null, ivaPct: recipe.ivaPct, disponible:true});
      DB.activeCartaIds = [carta.id];
      navigate('carta');
      openCarta(carta.id); // clona a cartaEdit y sincroniza precios desde el Escandallo
      return cartaEdit.secciones[0].platos[0].deliverySupplement;
    });
    assert.equal(r, 2.5, 'al abrir la Carta en el editor, el suplemento de la receta debe copiarse al plato: ' + r);
  });

  await caso('En el TPV, una comanda de delivery cobra precio de sala + suplemento al añadir el plato', async () => {
    const r = await page.evaluate(()=>{
      const carta = DB.cartas[0];
      const sec = carta.secciones[0];
      const plato = sec.platos[0];
      plato.deliverySupplement = 2.5; // ya sincronizado por openCarta() en el caso anterior; se fija aquí a mano porque ese sync escribe en cartaEdit, no en DB.cartas directamente (solo se vuelca al guardar la carta desde el editor)
      const order = {id: genId(), tipo:'delivery', pax:1, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString()};
      DB.tpvOrders.push(order);
      addOrderItem(order.id, sec.id, plato.id);
      return order.items[0].price;
    });
    assert.equal(r, 12.5, 'la línea de la comanda de delivery debe cobrar precio de sala + suplemento: ' + r);
  });

  await caso('En el TPV, una comanda para llevar cobra solo el precio de sala, sin el suplemento', async () => {
    const r = await page.evaluate(()=>{
      const carta = DB.cartas[0];
      const sec = carta.secciones[0];
      const plato = sec.platos[0];
      const order = {id: genId(), tipo:'takeaway', pax:1, status:'abierta', items:[], tandas:[], createdAt: new Date().toISOString()};
      DB.tpvOrders.push(order);
      addOrderItem(order.id, sec.id, plato.id);
      return order.items[0].price;
    });
    assert.equal(r, 10, 'la línea de para llevar debe cobrar el precio de sala, sin el suplemento: ' + r);
  });

  await caso('Ningún error de JavaScript en todo el recorrido (app principal)', async () => {
    assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
  });

  await browser.close();
}

/* ---------- Parte 2: web pública de pedidos ---------- */
{
  const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
  const page = await browser.newPage();
  const erroresJs = [];
  page.on('pageerror', e => erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,500));

  await page.evaluate(() => {
    window.DB = DB = {};
    DB.business = {
      name:'Restaurante Test', aforo: 0,
      horario: Array.from({length:7}, () => ({abierto:true, modo:'seguido', seguido:{ini:'13:00', fin:'23:00'}})),
      tiposServicio:{mesa:true, takeaway:true, delivery:true},
    };
    DB.cartas = [{id: 1, nombre:'Carta', horario: Array.from({length:7},()=>({activo:true})), secciones:[{id:1, nombre:'Platos', platos:[
      {id: 1, recipeId:1, nombre:'Hamburguesa', precio:10, deliverySupplement:2.5, ivaPct:10, disponible:true}
    ]}]}];
    DB.activeCartaIds = [1];
  });

  await caso('publicPlatoPrice: en la pestaña Delivery se suma el suplemento, en Para Llevar solo el precio de sala', async () => {
    const r = await page.evaluate(()=>{
      const p = DB.cartas[0].secciones[0].platos[0];
      currentTab = 'delivery';
      const delivery = publicPlatoPrice(p);
      currentTab = 'takeaway';
      const takeaway = publicPlatoPrice(p);
      return {delivery, takeaway};
    });
    assert.equal(r.delivery, 12.5, 'pestaña Delivery debe sumar el suplemento (10+2,5): ' + JSON.stringify(r));
    assert.equal(r.takeaway, 10, 'pestaña Para Llevar debe usar solo el precio de sala: ' + JSON.stringify(r));
  });

  await caso('El precio mostrado en la carta pública cambia según la pestaña activa', async () => {
    const r = await page.evaluate(()=>{
      currentTab = 'delivery';
      const htmlDelivery = renderMenuDishesHtml(DB.cartas[0].secciones[0]);
      currentTab = 'takeaway';
      const htmlTakeaway = renderMenuDishesHtml(DB.cartas[0].secciones[0]);
      return {htmlDelivery, htmlTakeaway};
    });
    assert.ok(r.htmlDelivery.includes('12,50'), 'la carta en Delivery debe mostrar 12,50€: ' + r.htmlDelivery.slice(0,300));
    assert.ok(r.htmlTakeaway.includes('10,00') && !r.htmlTakeaway.includes('12,50'), 'la carta en Para Llevar debe mostrar 10,00€, no 12,50€: ' + r.htmlTakeaway.slice(0,300));
  });

  await caso('Añadir al carrito en Delivery guarda el precio con el suplemento en la línea', async () => {
    const r = await page.evaluate(()=>{
      currentTab = 'delivery';
      cart = [];
      changeCartQty(1, '1', 1, 'Hamburguesa', publicPlatoPrice(DB.cartas[0].secciones[0].platos[0]));
      return cart[0]?.price;
    });
    assert.equal(r, 12.5, 'la línea del carrito en delivery debe llevar el precio con el suplemento sumado: ' + r);
  });

  await caso('Ningún error de JavaScript en todo el recorrido (web pública)', async () => {
    assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
  });

  await browser.close();
}

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
