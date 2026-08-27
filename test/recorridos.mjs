// R13 — Recorridos completos de principio a fin.
//
// Las demás pruebas comprueban que las pantallas se ven bien y no
// revientan. Estas comprueban que la app hace lo CORRECTO: se encadenan
// los pasos reales de un servicio y se verifica el resultado en cada uno.
// Es donde vive la lógica que hasta ahora no se ejecutaba nunca.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function recorrido(nombre, fn){
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'RECORR01',tenantId:ggBizTenantId('RECORR01')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    saveDB();
  });
  let pasos=[];
  try{
    pasos = await fn(page);
    if(errs.length) throw new Error('errores JS: '+errs.slice(0,2).join(' | '));
    console.log(`\n✅ ${nombre}`);
    pasos.forEach(p=>console.log(`     ${p}`));
    res.push({nombre, ok:true});
  }catch(e){
    console.log(`\n❌ ${nombre}`);
    pasos.forEach(p=>console.log(`     ${p}`));
    console.log(`     ⤷ ${e.message}`);
    res.push({nombre, ok:false});
  }
  await page.close();
}

/* ════ 1. De ingrediente a factura ════════════════════════════════════
   Crear ingrediente → escandallo → plato en carta → venderlo →
   comprobar el IVA de la venta y que llega a Gestión Económica. */
await recorrido('1. De ingrediente a factura', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    // 1) Ingrediente: 24 €/kg
    const ingId=genId();
    DB.ingredients.push({id:ingId,name:'Solomillo de ternera',category:'Carnes',area:'cocina',
      unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Cárnicas',activo:true});
    pasos.push('ingrediente a 24 €/kg');

    // 2) Escandallo: 220 g con 8% de merma, PVP 22 € (IVA 10%)
    const recId=genId();
    DB.recipes.push({id:recId,name:'Solomillo al PX',area:'cocina',isBase:false,
      price:22,ivaPct:10,category:'Principales',
      ingredients:[{type:'ingredient',ingredientId:ingId,qty:220,merma:8}]});
    const coste = recipeCost(DB.recipes.find(r=>r.id===recId));
    const fc = recipeFoodCostPct(DB.recipes.find(r=>r.id===recId));
    pasos.push(`escandallo: coste ${coste.toFixed(2)} € · food cost ${fc.toFixed(1)}%`);

    // 3) A la carta
    const cartaId=genId(), secId=genId(), platoId=genId();
    DB.cartas.push({id:cartaId,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),
      secciones:[{id:secId,nombre:'Principales',platos:[
        {id:platoId,recipeId:recId,nombre:'Solomillo al PX',precio:22,ivaPct:10,disponible:true}]}]});
    DB.activeCartaIds=[cartaId];
    DB.tables=[{id:1,name:'Mesa 1',zona:'Salón',plazas:4}];
    saveDB();
    pasos.push('plato publicado en la carta');

    // 4) Abrir mesa y pedir 2 unidades — con las funciones reales del TPV
    const order={id:genId(),tableId:1,tipo:'mesa',status:'abierta',items:[],tandas:[],createdAt:new Date().toISOString()};
    DB.tpvOrders.push(order);
    addOrderItem(order.id, secId, platoId);
    addOrderItem(order.id, secId, platoId);
    const o=DB.tpvOrders.find(x=>x.id===order.id);
    pasos.push(`comanda: ${o.items.length} línea(s), ${o.items.reduce((s,l)=>s+l.qty,0)} unidad(es)`);

    return {pasos, orderId:order.id, coste, fc,
            lineas:o.items.length, unidades:o.items.reduce((s,l)=>s+l.qty,0),
            conLineId:o.items.every(l=>l.lineId)};
  });
  // Comprobaciones del escandallo: 220 g con 8% de merma a 0,024 €/g
  const esperado = 220/(1-0.08)*0.024;  // 220 g NETOS con 8% de merma
  assert.ok(Math.abs(r.coste-esperado)<0.02, `coste ${r.coste.toFixed(3)} ≠ esperado ${esperado.toFixed(3)}`);
  assert.ok(r.fc>25 && r.fc<30, `food cost fuera de rango: ${r.fc.toFixed(1)}%`);
  // Dos veces el mismo plato se agrupan en UNA línea con qty 2
  assert.equal(r.lineas, 1, 'dos unidades del mismo plato deberían agruparse en una línea');
  assert.equal(r.unidades, 2, 'deberían ser 2 unidades');
  assert.ok(r.conLineId, 'cada línea debe nacer con su lineId (para poder fusionar entre dispositivos)');

  // 5) Cobrar y comprobar el IVA y la facturación
  const c = await page.evaluate((orderId)=>{
    const o=DB.tpvOrders.find(x=>x.id===orderId);
    const venta={id:genId(),date:todayStr(),createdAt:new Date().toISOString(),
      total:44,subtotal:40,propina:0,tipo:'mesa',metodoPago:'Efectivo',orderId,items:o.items};
    DB.sales.push(venta); o.status='pagada'; saveDB();
    const grupos=saleIvaGroupsForFiscal(venta);
    const hoy=new Date();
    return {grupos, facturacion:geFacturacionNetaMes(hoy.getFullYear(),hoy.getMonth()), ventas:DB.sales.length};
  }, r.orderId);
  const g10 = c.grupos.find(g=>Math.round(g.ivaPct)===10);
  assert.ok(g10, 'la venta debería declarar IVA al 10%');
  assert.ok(Math.abs(g10.base-40)<0.5, `base imponible ${g10.base} ≠ 40`);
  assert.ok(Math.abs(c.facturacion-40)<0.5, `facturación del mes ${c.facturacion} ≠ 40 (neto sin IVA)`);
  r.pasos.push(`cobrado: base ${g10.base.toFixed(2)} € + IVA 10% = 44,00 €`);
  r.pasos.push(`Gestión Económica: facturación neta del mes ${c.facturacion.toFixed(2)} €`);
  return r.pasos;
});

/* ════ 2. Cobro con descuento y propina, y que cuadre el arqueo ══════ */
await recorrido('2. Descuento, propina y arqueo', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    DB.sales=[
      {id:'S1',date:todayStr(),createdAt:new Date().toISOString(),subtotal:100,total:100,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[]},
      {id:'S2',date:todayStr(),createdAt:new Date().toISOString(),subtotal:50,total:55,propina:5,tipo:'mesa',metodoPago:'Tarjeta',items:[]},
      {id:'S3',date:todayStr(),createdAt:new Date().toISOString(),subtotal:40,total:36,propina:0,descuentoImporte:4,tipo:'mesa',metodoPago:'Efectivo',items:[]},
    ];
    saveDB();
    const ventas=getSalesForClosure();
    const {totales,total,ticketCount}=computeClosureTotals(ventas);
    pasos.push(`3 ventas: ${ticketCount} tickets, ${total.toFixed(2)} € en total`);
    pasos.push(`por método: efectivo ${(totales['Efectivo']||0).toFixed(2)} € · tarjeta ${(totales['Tarjeta']||0).toFixed(2)} €`);
    return {pasos, totales, total, ticketCount};
  });
  assert.equal(r.ticketCount, 3, 'deberían contarse los 3 tickets');
  // 100 (efectivo) + 36 (efectivo con descuento) = 136 · 55 (tarjeta, con propina) = 55
  assert.ok(Math.abs((r.totales['Efectivo']||0)-136)<0.01, `efectivo ${r.totales['Efectivo']} ≠ 136`);
  assert.ok(Math.abs((r.totales['Tarjeta']||0)-55)<0.01, `tarjeta ${r.totales['Tarjeta']} ≠ 55 (propina incluida)`);
  assert.ok(Math.abs(r.total-191)<0.01, `total ${r.total} ≠ 191`);
  r.pasos.push('el arqueo cuadra: descuento restado y propina incluida');
  return r.pasos;
});

/* ════ 3. Raciones limitadas: se agotan y el plato deja de ofrecerse ═ */
await recorrido('3. Raciones limitadas se agotan solas', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    const recId=genId(), cartaId=genId(), secId=genId(), platoId=genId();
    DB.recipes.push({id:recId,name:'Especial del día',area:'cocina',price:18,ivaPct:10,category:'P',ingredients:[]});
    DB.cartas.push({id:cartaId,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),
      secciones:[{id:secId,nombre:'P',platos:[{id:platoId,recipeId:recId,nombre:'Especial del día',precio:18,ivaPct:10,disponible:true,stock:3}]}]});
    DB.activeCartaIds=[cartaId];
    saveDB();
    pasos.push('plato con 3 raciones disponibles');
    // OJO: findCartaPlatoById devuelve el objeto VIVO, no una copia. Hay
    // que leer el número en el momento; guardando la referencia y leyendo
    // .stock al final, los tres valores salían iguales (el último).
    const leer = () => { const p = findCartaPlatoById(platoId); return {stock:p.stock, disponible:p.disponible}; };
    const antes = leer().stock;
    decrementDishStock(platoId, 2);   const tras2 = leer();
    decrementDishStock(platoId, 1);   const tras3 = leer();
    decrementDishStock(platoId, 5);   const trasPasarse = leer();   // pedir más de las que quedan
    pasos.push(`sirvo 2 → quedan ${tras2.stock}`);
    pasos.push(`sirvo 1 más → quedan ${tras3.stock}, disponible: ${tras3.disponible}`);
    return {pasos, antes, tras2:tras2.stock, tras3:tras3.stock,
            disponibleTras3:tras3.disponible, trasPasarse:trasPasarse.stock};
  });
  assert.equal(r.antes, 3);
  assert.equal(r.tras2, 1, 'tras servir 2 de 3 deberían quedar 1');
  assert.equal(r.tras3, 0, 'tras servir la última debería quedar 0');
  assert.equal(r.disponibleTras3, false, 'al agotarse debería marcarse como NO disponible');
  assert.equal(r.trasPasarse, 0, 'no debería bajar de 0 aunque se pidan más');
  r.pasos.push('al agotarse se marca no disponible y nunca baja de 0');
  return r.pasos;
});

await browser.close();
console.log('\n'+'═'.repeat(64));
const mal=res.filter(r=>!r.ok);
console.log(mal.length ? `❌ ${mal.length} de ${res.length} recorridos fallaron` : `✅ los ${res.length} recorridos completos pasaron`);
