// El dinero, función por función — R23.
//
// La medición de cobertura dejó una lista incómoda: 42 funciones de dinero
// y stock que NINGUNA prueba comprobaba por su nombre. Algunas se ejecutan
// de refilón durante los recorridos completos, pero "se ejecuta" no es lo
// mismo que "da el número correcto": un error de céntimos pasa igual.
//
// Aquí se comprueba la aritmética de cada una, con números a mano y el
// resultado calculado aparte. Si un día alguien toca el IVA, la merma o el
// arqueo, esto lo dice antes de que lo diga un cliente.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'DINERO01',tenantId:ggBizTenantId('DINERO01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(async ()=>{
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.ownFirebase={apiKey:'f',databaseURL:'https://f-default-rtdb.firebaseio.com'};
  await saveDB();
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');
  window.showToast = ()=>{};
  currentArea = () => 'cocina';
});

/* ─── El total de una comanda ─── */
await caso('El total de una comanda suma bien, con envío incluido', async ()=>{
  const r = await page.evaluate(()=>({
    simple: orderTotal({items:[{price:9.5, qty:2},{price:3.2, qty:3}]}),
    conEnvio: orderTotal({items:[{price:9.5, qty:2}], costeEnvio:2.5}),
    vacia: orderTotal({items:[]}),
    sinItems: orderTotal({}),
  }));
  assert.ok(Math.abs(r.simple - 28.6) < 0.001, `9,50×2 + 3,20×3 = 28,60 · salió ${r.simple}`);
  assert.ok(Math.abs(r.conEnvio - 21.5) < 0.001, `19 + 2,50 = 21,50 · salió ${r.conEnvio}`);
  assert.equal(r.vacia, 0);
  assert.equal(r.sinItems, 0, 'una comanda sin líneas no puede dar NaN');
  return '28,60 · 21,50 con envío · 0 vacía';
});

/* ─── Qué IVA le toca a cada línea ─── */
await caso('Cada línea coge el IVA que le corresponde, en el orden correcto', async ()=>{
  const r = await page.evaluate(()=>{
    DB.menus = [{id:1, nombre:'Menú', ivaPct: 10}];
    DB.recipes = [{id:2, name:'Plato', ivaPct: 21, area:'cocina', ingredients:[], comensales:2, consumiblesPct:5, price:10}];
    DB.cartas = [{id:3, nombre:'C', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[{id:4, nombre:'S', platos:[{id:5, recipeId:2, nombre:'Plato', precio:10, ivaPct: 4, disponible:true}]}]}];
    return {
      porMenu:  resolveLineIvaPct({menuId:1, platoId:5, recipeId:2}),
      porPlato: resolveLineIvaPct({platoId:5, recipeId:2}),
      porReceta:resolveLineIvaPct({recipeId:2}),
      sinNada:  resolveLineIvaPct({}),
      nula:     resolveLineIvaPct(null),
    };
  });
  assert.equal(r.porMenu, 10, 'el menú manda sobre el plato y la receta');
  assert.equal(r.porPlato, 4, 'el plato de la carta manda sobre la receta');
  assert.equal(r.porReceta, 21, 'y en último lugar, la receta');
  assert.ok(r.nula === null || r.nula === undefined, 'una línea nula no debe reventar');
  return 'menú 10% → plato 4% → receta 21%';
});

/* ─── Quitar un plato de un menú no regala el menú ─── */
await caso('Al quitar un plato de un menú, su precio pasa al que queda', async ()=>{
  const r = await page.evaluate(()=>{
    const order = {items:[
      {menuInstanceId:'m1', menuBaseAmount: 0,  price: 0,  qty:1, name:'Segundo'},
    ]};
    const quitado = {menuInstanceId:'m1', menuBaseAmount: 14, price: 14, qty:1, name:'Primero'};
    reassignMenuBasePrice(order, quitado);
    const sinHermano = {items:[]};
    let roto = null;
    try{ reassignMenuBasePrice(sinHermano, quitado); }catch(e){ roto = e.message; }
    return {precio: order.items[0].price, base: order.items[0].menuBaseAmount, roto};
  });
  assert.equal(r.precio, 14, 'el precio del menú no puede evaporarse al quitar un plato');
  assert.equal(r.base, 14);
  assert.ok(!r.roto, 'sin hermano al que pasárselo, no debe reventar: ' + r.roto);
  return 'los 14 € del menú se conservan';
});

/* ─── El arqueo de caja ─── */
await caso('El recuento de caja suma billetes y monedas al céntimo', async ()=>{
  const r = await page.evaluate(()=>{
    // Se fabrica el formulario que la función espera
    const campos = CASH_DENOMINATIONS.map(d => `<input id="cash-count-${d.cents}" value="">`).join('');
    document.body.insertAdjacentHTML('beforeend',
      `<div id="arqueo-prueba">${campos}<input id="closure-contado"><input id="closure-fondo" value="0"><span id="cash-count-total"></span><div id="closure-diff-preview"></div></div>`);
    const pon = (cents, n) => { const el = document.getElementById('cash-count-'+cents); if(el) el.value = String(n); };
    // 2 billetes de 50, 3 de 20, 1 de 5, 4 monedas de 0,50 y 7 de 0,05
    pon(5000,2); pon(2000,3); pon(500,1); pon(50,4); pon(5,7);
    updateCashCountTotal();
    const total = document.getElementById('closure-contado').value;
    // Y en blanco: no debe poner 0, debe dejarlo vacío
    CASH_DENOMINATIONS.forEach(d => { const el=document.getElementById('cash-count-'+d.cents); if(el) el.value=''; });
    updateCashCountTotal();
    const vacio = document.getElementById('closure-contado').value;
    document.getElementById('arqueo-prueba').remove();
    return {total: parseFloat(total), vacio, denominaciones: CASH_DENOMINATIONS.length};
  });
  // 100 + 60 + 5 + 2,00 + 0,35 = 167,35
  assert.ok(Math.abs(r.total - 167.35) < 0.001, `debería dar 167,35 y dio ${r.total}`);
  assert.equal(r.vacio, '', 'sin contar nada debe quedar vacío, no un 0 que parezca un arqueo hecho');
  assert.ok(r.denominaciones >= 8, 'faltan billetes o monedas en el recuento');
  return `167,35 € con ${r.denominaciones} denominaciones`;
});

/* ─── La merma, que ya dio un disgusto ─── */
await caso('La merma encarece el bruto, no lo abarata', async ()=>{
  const r = await page.evaluate(()=>{
    // 100 g netos con 20% de merma = 125 g brutos (100 ÷ 0,80)
    const bruto = mermaBruto({qty:100, merma:20});
    const sinMerma = mermaBruto({qty:100, merma:0});
    const tope = mermaBruto({qty:100, merma:150});   // fuera de rango
    const negativa = mermaBruto({qty:100, merma:-5});
    return {bruto, sinMerma, tope, negativa};
  });
  assert.ok(Math.abs(r.bruto - 125) < 0.001, `100 g netos al 20% de merma son 125 g brutos, no ${r.bruto}`);
  assert.equal(r.sinMerma, 100);
  assert.ok(isFinite(r.tope) && r.tope > 0, 'una merma imposible no puede dar infinito');
  assert.equal(r.negativa, 100, 'una merma negativa no puede abaratar el plato');
  return '100 g netos al 20% → 125 g brutos';
});

/* ─── El precio con IVA que se enseña ─── */
await caso('El precio final con IVA se calcula igual en carta, menú y escandallo', async ()=>{
  const r = await page.evaluate(()=>{
    // ⚠️ Algunos de estos campos YA existen en la página (el formulario de
    // menús no es una ventana, vive en la pantalla). Crear un duplicado hace
    // que getElementById devuelva el de la página, vacío, y el resultado
    // salga 0. Se usan los reales cuando están, y solo se fabrican los que
    // falten.
    const mide = (idBase, idIva, idOut, fn) => {
      const creados = [];
      const asegura = (id, html) => {
        if(document.getElementById(id)) return false;
        document.body.insertAdjacentHTML('beforeend', html);
        creados.push(id);
        return true;
      };
      asegura(idBase, `<input id="${idBase}">`);
      asegura(idIva, `<select id="${idIva}"><option value="10">10</option></select>`);
      asegura(idOut, `<span id="${idOut}"></span>`);
      const base = document.getElementById(idBase);
      const iva = document.getElementById(idIva);
      const anteriorBase = base.value, anteriorIva = iva.value;
      base.value = '10';
      if(![...iva.options].some(o => o.value === '10')) iva.insertAdjacentHTML('beforeend','<option value="10">10</option>');
      iva.value = '10';
      let out = null;
      try{ fn(); out = document.getElementById(idOut).textContent; }catch(e){ out = 'ERROR: '+e.message; }
      base.value = anteriorBase; iva.value = anteriorIva;
      creados.forEach(id => document.getElementById(id)?.remove());
      return out;
    };
    return {
      carta: mide('new-carta-plato-precio-base','new-carta-plato-iva','new-carta-plato-precio-final', ()=>updateCartaPlatoFinalPriceDisplay()),
      menu: mide('menu-f-precio-base','menu-f-iva','menu-f-precio-final', ()=>updateMenuFinalPriceDisplay()),
      receta: mide('recipe-price-base','recipe-iva','recipe-price-final-display', ()=>updateRecipeFinalPriceDisplay()),
    };
  });
  // 10 € base + 10% de IVA = 11 €. Se comprueba que las tres dan lo mismo.
  const numeros = Object.entries(r).map(([k,v]) => [k, parseFloat(String(v).replace(/[^\d,.-]/g,'').replace(',','.'))]);
  numeros.forEach(([k, n]) => {
    assert.ok(isFinite(n), `${k} no devolvió un número: ${r[k]}`);
    assert.ok(Math.abs(n - 11) < 0.01, `${k}: 10 € al 10% son 11 €, dio ${n}`);
  });
  return 'las tres dan 11,00 € para 10 € al 10%';
});

/* ─── El aviso de cobro duplicado ─── */
await caso('Un cobro duplicado se detecta y se anota una sola vez', async ()=>{
  const r = await page.evaluate(()=>{
    DB.auditLog = [];
    const ahora = new Date().toISOString();
    // Un cobro duplicado es el MISMO pedido cobrado dos veces (mismo
    // orderId), no dos ventas que casualmente sumen igual.
    const dosIguales = [
      {id:1, orderId:99, total:42.5, createdAt:ahora, items:[{name:'X',qty:1,price:42.5}]},
      {id:2, orderId:99, total:42.5, createdAt:ahora, items:[{name:'X',qty:1,price:42.5}]},
    ];
    avisarSiCobroDuplicado(dosIguales);
    const tras1 = (DB.auditLog||[]).length;
    avisarSiCobroDuplicado(dosIguales);   // otra vez: no debe duplicar el aviso
    const tras2 = (DB.auditLog||[]).length;
    DB.auditLog = [];
    avisarSiCobroDuplicado([{id:3, orderId:100, total:10, createdAt:ahora, items:[]}]);
    const unaSola = (DB.auditLog||[]).length;
    return {tras1, tras2, unaSola};
  });
  assert.ok(r.tras1 >= 1, 'dos cobros idénticos seguidos deberían dejar aviso');
  assert.equal(r.tras2, r.tras1, 'y no repetirlo cada vez que se mira');
  assert.equal(r.unaSola, 0, 'una venta sola no es un duplicado');
  return 'avisa una vez y no se repite';
});

/* ─── Raciones limitadas ─── */
await caso('Las raciones limitadas de un plato se guardan y se agotan', async ()=>{
  const r = await page.evaluate(()=>{
    cartaEdit = {id:3, nombre:'C', tipo:'GENERAL', dias:[0,1,2,3,4,5,6],
      secciones:[{id:4, nombre:'S', platos:[{id:5, nombre:'Plato', precio:10, disponible:true}]}]};
    // Pregunta por una ventana: se contesta desde aquí, como haría el dueño.
    window.renderCartaSecciones = window.renderCartaSecciones || (()=>{});
    const responder = v => { window.promptText = async () => v; };
    return (async ()=>{
      responder('8');   await setCartaPlatoStock(4, 5);
      const puesto = cartaEdit.secciones[0].platos[0].stock;
      responder('');    await setCartaPlatoStock(4, 5);
      const sinLimite = cartaEdit.secciones[0].platos[0].stock;
      responder('8');   await setCartaPlatoStock(4, 5);
      responder('-3');  await setCartaPlatoStock(4, 5);
      const negativo = cartaEdit.secciones[0].platos[0].stock;
      responder(null);  await setCartaPlatoStock(4, 5);   // cancelar
      const trasCancelar = cartaEdit.secciones[0].platos[0].stock;
      return {puesto, sinLimite, negativo, trasCancelar};
    })();
  });
  assert.equal(r.puesto, 8, 'debería guardar las 8 raciones');
  assert.ok(r.sinLimite === undefined || r.sinLimite === null || r.sinLimite === '', 'vaciar debe quitar el límite');
  assert.ok(r.negativo === undefined || r.negativo >= 0, `no puede quedar un número negativo de raciones: ${r.negativo}`);
  assert.ok(r.trasCancelar === r.negativo, 'cancelar la ventana no debe cambiar nada');
  return '8 raciones · vaciar quita el límite · nada negativo · cancelar no toca';
});

await caso('Ningún error de JavaScript', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|firebase/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
