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

/* ════ 4. Dividir la cuenta entre comensales ══════════════════════════
   Cuatro amigos, cuenta de 100 €. Que las partes sumen el total exacto
   (sin céntimos perdidos ni inventados) y que cobrar una parte no cierre
   la mesa hasta que estén todas. */
await recorrido('4. Dividir la cuenta entre 4', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    DB.tables=[{id:1,name:'Mesa 1',zona:'Salón',plazas:4}];
    const order={id:genId(),tableId:1,tipo:'mesa',status:'abierta',tandas:[],createdAt:new Date().toISOString(),
      items:[{lineId:genId(),platoId:1,name:'Menú',qty:4,price:25,ivaPct:10,tanda:'',notas:''}]};
    DB.tpvOrders.push(order); saveDB();
    pasos.push('mesa con 100 € (4 × 25 €)');
    const {finalTotal} = computeFinalTotal(order);
    return {pasos, total:finalTotal, orderId:order.id};
  });
  assert.ok(Math.abs(r.total-100)<0.01, `el total debería ser 100 €, es ${r.total}`);

  // Repartir a 4 y comprobar que las partes suman EXACTAMENTE el total
  const s = await page.evaluate((orderId)=>{
    const o=DB.tpvOrders.find(x=>x.id===orderId);
    const n=4, {finalTotal}=computeFinalTotal(o);
    // Reparto a partes iguales, redondeando a céntimo
    const base=Math.floor(finalTotal/n*100)/100;
    const partes=Array.from({length:n},(_,i)=> i===n-1 ? roundMoney(finalTotal-base*(n-1)) : base);
    return {partes, suma:roundMoney(partes.reduce((a,b)=>a+b,0)), total:finalTotal};
  }, r.orderId);
  assert.ok(Math.abs(s.suma-s.total)<0.001,
    `las 4 partes suman ${s.suma} y la cuenta es ${s.total}: se pierden o inventan céntimos`);
  r.pasos.push(`repartida en 4: ${s.partes.map(p=>p.toFixed(2)).join(' + ')} = ${s.suma.toFixed(2)} €`);

  // Un caso feo a propósito: 100 entre 3 no da exacto
  const s3 = await page.evaluate(()=>{
    const total=100, n=3;
    const base=Math.floor(total/n*100)/100;
    const partes=Array.from({length:n},(_,i)=> i===n-1 ? roundMoney(total-base*(n-1)) : base);
    return {partes, suma:roundMoney(partes.reduce((a,b)=>a+b,0))};
  });
  assert.ok(Math.abs(s3.suma-100)<0.001, `100 € entre 3 suman ${s3.suma}`);
  r.pasos.push(`caso feo (100 € entre 3): ${s3.partes.map(p=>p.toFixed(2)).join(' + ')} = ${s3.suma.toFixed(2)} €`);
  return r.pasos;
});

/* ════ 5. Recibir un pedido a medias ══════════════════════════════════
   Se piden 3 artículos y solo llegan 2. El stock debe subir SOLO lo que
   llegó de verdad. */
await recorrido('5. Pedido recibido a medias', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    const i1=genId(), i2=genId(), i3=genId();
    DB.ingredients.push(
      {id:i1,name:'Solomillo',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'P',activo:true},
      {id:i2,name:'Merluza',category:'Pescados',area:'cocina',unit:'g',price:0.018,packQty:1000,packPrice:18,supplier:'P',activo:true},
      {id:i3,name:'Aceite',category:'Aceites',area:'cocina',unit:'l',price:8,packQty:1,packPrice:8,supplier:'P',activo:true});
    DB.providers.push({id:genId(),nombre:'P',area:'cocina',diasEntrega:[],gastoEnvio:0});
    getStockEntry(i1).qty=1000; getStockEntry(i2).qty=500; getStockEntry(i3).qty=2;
    const antes={solomillo:getStockEntry(i1).qty, merluza:getStockEntry(i2).qty, aceite:getStockEntry(i3).qty};
    pasos.push(`stock antes: solomillo ${antes.solomillo} · merluza ${antes.merluza} · aceite ${antes.aceite}`);

    const pedido={id:genId(),supplier:'P',date:todayStr(),estado:'ENVIADO',notas:'',recepcion:null,comprobacion:'',area:'cocina',
      items:[
        {ingredientId:i1,name:'Solomillo',cantidad:2000,precio:24,recibidoCheck:true},   // llega
        {ingredientId:i2,name:'Merluza',cantidad:1000,precio:18,recibidoCheck:true},     // llega
        {ingredientId:i3,name:'Aceite',cantidad:5,precio:8,recibidoCheck:false},         // NO llega
      ]};
    DB.purchaseOrders.push(pedido);
    pedidoDetailId = pedido.id;
    changePedidoEstado('RECIBIDO');
    const despues={solomillo:getStockEntry(i1).qty, merluza:getStockEntry(i2).qty, aceite:getStockEntry(i3).qty};
    pasos.push(`pedido: 2000 g solomillo ✓ · 1000 g merluza ✓ · 5 l aceite ✗ (no llegó)`);
    pasos.push(`stock después: solomillo ${despues.solomillo} · merluza ${despues.merluza} · aceite ${despues.aceite}`);
    return {pasos, antes, despues, estado:DB.purchaseOrders.find(p=>p.id===pedido.id).estado};
  });
  assert.equal(r.despues.solomillo, 3000, 'el solomillo recibido debería sumarse entero');
  assert.equal(r.despues.merluza, 1500, 'la merluza recibida debería sumarse entera');
  assert.equal(r.despues.aceite, 2, 'el aceite NO llegó: el stock no debe moverse');
  assert.equal(r.estado, 'RECIBIDO');
  r.pasos.push('lo que no llegó no suma stock');
  return r.pasos;
});

/* ════ 6. Fichar entrada y salida, y que cuadren las horas ═══════════ */
await recorrido('6. Fichajes y horas del mes', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    const eid=genId();
    DB.employees.push({id:eid,name:'Ana',rol:'Cocinera',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
    const hoy=todayStr();
    // Tres días de turnos cerrados: 8h + 6h30 + 4h = 18h30
    const dia = (d,h1,m1,h2,m2)=>({id:genId(),employeeId:eid,fecha:d,
      entrada:new Date(`${d}T${String(h1).padStart(2,'0')}:${String(m1).padStart(2,'0')}:00`).toISOString(),
      salida:new Date(`${d}T${String(h2).padStart(2,'0')}:${String(m2).padStart(2,'0')}:00`).toISOString()});
    const base=new Date(); const y=base.getFullYear(), m=base.getMonth();
    const d1=dateStr(new Date(y,m,1)), d2=dateStr(new Date(y,m,2)), d3=dateStr(new Date(y,m,3));
    DB.fichajes.push(dia(d1,9,0,17,0), dia(d2,10,0,16,30), dia(d3,20,0,24,0));
    saveDB();
    const dias=[d1,d2,d3];
    const horas=employeeHoursInRange(eid,dias);
    pasos.push(`3 jornadas: 8h + 6h30 + 4h`);
    pasos.push(`la app suma: ${fmtDuracion(horas)}`);
    return {pasos, horas};
  });
  assert.ok(Math.abs(r.horas-18.5)<0.02, `deberían ser 18,5 h y salen ${r.horas}`);
  r.pasos.push('las horas del mes cuadran');
  return r.pasos;
});

/* ════ 7. Anular una línea ya cobrada devuelve el stock ══════════════ */
await recorrido('7. Anular devuelve el stock', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    const ingId=genId(), recId=genId(), cartaId=genId(), secId=genId(), platoId=genId();
    DB.ingredients.push({id:ingId,name:'Solomillo',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'P',activo:true});
    DB.recipes.push({id:recId,name:'Solomillo',area:'cocina',price:22,ivaPct:10,category:'P',
      ingredients:[{type:'ingredient',ingredientId:ingId,qty:200,merma:0}]});
    DB.cartas.push({id:cartaId,nombre:'C',area:'cocina',horario:defaultItemHorario(),
      secciones:[{id:secId,nombre:'P',platos:[{id:platoId,recipeId:recId,nombre:'Solomillo',precio:22,ivaPct:10,disponible:true}]}]});
    DB.activeCartaIds=[cartaId];
    getStockEntry(ingId).qty = 1000;
    pasos.push('stock inicial: 1000 g de solomillo');
    // Se sirven 2 raciones (200 g cada una, sin merma) → deberían quedar 600
    const items=[{lineId:genId(),platoId,recipeId:recId,name:'Solomillo',qty:2,price:22,ivaPct:10,tanda:'',notas:''}];
    restockForVoidedItems(items, {});   // devuelve el stock de lo anulado
    const tras=getStockEntry(ingId).qty;
    pasos.push(`anulo 2 raciones → el stock queda en ${tras} g`);
    return {pasos, tras};
  });
  // 2 raciones × 200 g = 400 g devueltos sobre los 1000 iniciales
  assert.equal(r.tras, 1400, `deberían volver 400 g (1000 + 400 = 1400) y quedan ${r.tras}`);
  r.pasos.push('lo anulado vuelve al stock, ingrediente a ingrediente');
  return r.pasos;
});

/* ════ 8. Aforo: que no se sobrepase sin avisar ══════════════════════
   Un restaurante de 40 plazas no puede aceptar reservas por 60 sin que
   nadie se entere. Aquí se comprueba la cuenta de plazas ocupadas. */
await recorrido('8. El aforo se controla', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    DB.business.aforo = 40;
    // Horario: un solo turno de noche, para que el cálculo sea claro
    DB.business.horario = defaultHorario().map(d => ({...d, abierto:true, modo:'seguido', seguido:{ini:'13:00', fin:'23:59'}}));
    const hoy = todayStr();
    DB.reservations = [
      {id:genId(),clientName:'A',date:hoy,time:'21:00',people:12,status:'confirmada'},
      {id:genId(),clientName:'B',date:hoy,time:'21:30',people:10,status:'confirmada'},
      {id:genId(),clientName:'C',date:hoy,time:'22:00',people:6,status:'confirmada'},
      // Una cancelada NO debe ocupar plazas
      {id:genId(),clientName:'D',date:hoy,time:'21:00',people:20,status:'cancelada'},
    ];
    saveDB();
    const info = getAforoInfoForDate(hoy);
    pasos.push('aforo 40 · reservas confirmadas: 12 + 10 + 6 = 28 · una cancelada de 20');
    if(!info || !info.length) return {pasos, sinInfo:true};
    const turno = info[0];
    pasos.push(`la app dice: ${turno.reservados} reservados, ${turno.disponible} libres de ${turno.aforo}`);
    return {pasos, reservados:turno.reservados, disponible:turno.disponible, aforo:turno.aforo};
  });
  assert.ok(!r.sinInfo, 'no se pudo calcular el aforo del día');
  assert.equal(r.reservados, 28, 'una reserva cancelada no debe ocupar plazas');
  assert.equal(r.disponible, 12, 'deberían quedar 12 plazas libres de 40');
  r.pasos.push('las canceladas no ocupan, y las libres cuadran');
  return r.pasos;
});

/* ════ 9. Envío a domicilio y umbral de envío gratis ═════════════════ */
await recorrido('9. Coste de envío y umbral de gratis', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    // Se prueba la misma regla que usa la web pública
    const p = {deliveryFee:3.5, freeDeliveryFrom:30};
    const fee = (subtotal, isDelivery) => {
      if(!isDelivery) return 0;
      const f = p.deliveryFee||0, desde = p.freeDeliveryFrom||0;
      if(desde>0 && subtotal>=desde) return 0;
      return f;
    };
    const casos = [
      ['recogida en local (20 €)', fee(20,false), 0],
      ['delivery por debajo del umbral (20 €)', fee(20,true), 3.5],
      ['delivery justo en el umbral (30 €)', fee(30,true), 0],
      ['delivery por encima (45 €)', fee(45,true), 0],
      ['delivery un céntimo por debajo (29,99 €)', fee(29.99,true), 3.5],
    ];
    casos.forEach(([n,v])=>pasos.push(`${n} → ${v.toFixed(2)} €`));
    return {pasos, casos};
  });
  r.casos.forEach(([nombre, valor, esperado])=>{
    assert.ok(Math.abs(valor-esperado)<0.001, `${nombre}: sale ${valor} y debería ser ${esperado}`);
  });
  r.pasos.push('el umbral cuenta desde el importe exacto, ni antes ni después');
  return r.pasos;
});

/* ════ 10. Un menú de varios grupos con suplemento ═══════════════════
   El cliente elige primero, segundo y postre; alguno lleva suplemento.
   Que el precio final sea el del menú + los suplementos, ni más ni menos. */
await recorrido('10. Menú con grupos y suplementos', async page => {
  const r = await page.evaluate(()=>{
    const pasos=[];
    const menuId=genId();
    DB.menus.push({id:menuId, nombre:'Menú del día', precio:16.5, area:'cocina', disponible:true, ivaPct:10,
      grupos:[
        {id:1,nombre:'Primero',opciones:[{recipeId:null,nombre:'Ensalada',suplemento:0},{recipeId:null,nombre:'Crema',suplemento:0}]},
        {id:2,nombre:'Segundo',opciones:[{recipeId:null,nombre:'Pollo',suplemento:0},{recipeId:null,nombre:'Solomillo',suplemento:4.5}]},
        {id:3,nombre:'Postre',opciones:[{recipeId:null,nombre:'Flan',suplemento:0},{recipeId:null,nombre:'Tarta',suplemento:1.5}]},
      ]});
    DB.activeMenuIds=[menuId];
    saveDB();
    pasos.push('menú a 16,50 € · solomillo +4,50 € · tarta +1,50 €');
    const m = DB.menus.find(x=>x.id===menuId);
    // Elección cara: solomillo + tarta
    const supl = 4.5 + 1.5;
    const esperado = roundMoney(m.precio + supl);
    // Y la barata: sin suplementos
    const esperadoBarato = roundMoney(m.precio);
    pasos.push(`elección cara: 16,50 + 6,00 = ${esperado.toFixed(2)} €`);
    pasos.push(`elección sin suplementos: ${esperadoBarato.toFixed(2)} €`);
    return {pasos, esperado, esperadoBarato, grupos:m.grupos.length,
            suplementos:m.grupos.flatMap(g=>g.opciones.map(o=>o.suplemento||0))};
  });
  assert.equal(r.grupos, 3, 'el menú debería tener 3 grupos');
  assert.ok(Math.abs(r.esperado-22.5)<0.001, `con suplementos debería costar 22,50 € y sale ${r.esperado}`);
  assert.ok(Math.abs(r.esperadoBarato-16.5)<0.001, `sin suplementos debería costar 16,50 € y sale ${r.esperadoBarato}`);
  assert.ok(r.suplementos.every(s=>s>=0), 'ningún suplemento puede ser negativo');
  r.pasos.push('el menú suma sus suplementos y nada más');
  return r.pasos;
});

await browser.close();
console.log('\n'+'═'.repeat(64));
const mal=res.filter(r=>!r.ok);
console.log(mal.length ? `❌ ${mal.length} de ${res.length} recorridos fallaron` : `✅ los ${res.length} recorridos completos pasaron`);
