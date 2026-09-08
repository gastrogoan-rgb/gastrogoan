// Extensión de PREFER_LOCAL_ARRAYS a TODO MERGEABLE_ARRAYS (incluidos los
// que mueven dinero: tpvOrders, sales, cashClosures, bankReconciliations).
// Esta prueba se centra en el caso de mayor riesgo real: que
// preferLocalWhenRemoteStale, colocado ANTES de mergeOrderLines, no
// reintroduzca ninguno de los dos bugs históricos de tpvOrders documentados
// en el propio js/core.js —
//   1. Cobrar una mesa y que una versión "abierta" que llega después la
//      reabra (se cobraría dos veces, con el escandallo descontado dos
//      veces).
//   2. Un plato marcado "entregado" en cocina que retrocede a "en cola"
//      porque llega una versión de sala más vieja (se cocina dos veces).
// Y confirma el caso positivo que motivó el cambio: un campo de cabecera
// editado (notas) que NO es item ni status no se pierde si la nube va con
// retraso — antes mergeOrderLines partía siempre de `remoteOrder` entero
// para la cabecera.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,800));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('HISTÓRICO: una mesa ya cobrada NUNCA se reabre aunque la nube vaya con retraso y esté "abierta"', async () => {
  const r = await page.evaluate(() => {
    const item = [{lineId:1, name:'Croqueta', qty:2, estado:'entregado', marchada:2}];
    const baseline = [{id:1, mesa:4, status:'abierta', cerrada:false, items: item}];
    const local    = [{id:1, mesa:4, status:'pagada', cerrada:true, closedAt:'2026-09-08T10:00:00.000Z', items: item}]; // se acaba de cobrar aquí
    const remote   = [{id:1, mesa:4, status:'abierta', cerrada:false, items: item}]; // la nube va con retraso, no se ha enterado del cobro
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    if(PREFER_LOCAL_ARRAYS.has('tpvOrders')) merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    // Mismo paso que applyRemoteBlock: fusión de líneas de tpvOrders.
    const localesPorId = new Map(local.map(o => [o.id, o]));
    merged = merged.map(o => {
      const loc = localesPorId.get(o.id);
      if(!loc || loc === o) return o;
      return mergeOrderLines(loc, o);
    });
    return merged;
  });
  assert.equal(r[0].status, 'pagada', 'la mesa cobrada no debe reabrirse: ' + JSON.stringify(r));
  assert.equal(r[0].cerrada, true, 'debe seguir cerrada: ' + JSON.stringify(r));
});

await caso('HISTÓRICO (dirección contraria): si la NUBE ya cobró y lo local todavía la cree abierta, gana el cobro (no se pierde)', async () => {
  const r = await page.evaluate(() => {
    const item = [{lineId:1, name:'Croqueta', qty:2, estado:'entregado', marchada:2}];
    const baseline = [{id:1, mesa:4, status:'abierta', cerrada:false, items: item}];
    const local    = [{id:1, mesa:4, status:'abierta', cerrada:false, items: item}]; // este dispositivo no se ha enterado
    const remote   = [{id:1, mesa:4, status:'pagada', cerrada:true, closedAt:'2026-09-08T10:00:00.000Z', items: item}]; // se cobró en OTRO dispositivo
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    if(PREFER_LOCAL_ARRAYS.has('tpvOrders')) merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    const localesPorId = new Map(local.map(o => [o.id, o]));
    merged = merged.map(o => {
      const loc = localesPorId.get(o.id);
      if(!loc || loc === o) return o;
      return mergeOrderLines(loc, o);
    });
    return merged;
  });
  assert.equal(r[0].status, 'pagada', 'el cobro hecho en el otro dispositivo no debe perderse: ' + JSON.stringify(r));
});

await caso('HISTÓRICO: un plato entregado en cocina no retrocede a "en cola" si sala manda una versión vieja', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}]}];
    const local    = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'entregado', marchada:2}]}]; // cocina lo entregó aquí
    const remote   = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}]}]; // sala todavía no lo sabe
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    if(PREFER_LOCAL_ARRAYS.has('tpvOrders')) merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    const localesPorId = new Map(local.map(o => [o.id, o]));
    merged = merged.map(o => {
      const loc = localesPorId.get(o.id);
      if(!loc || loc === o) return o;
      return mergeOrderLines(loc, o);
    });
    return merged;
  });
  assert.equal(r[0].items[0].estado, 'entregado', 'el plato no debe retroceder a en_cola: ' + JSON.stringify(r));
});

await caso('NUEVO: unas notas de mesa editadas no se pierden si la nube va con retraso (antes sí, porque la cabecera venía entera de la nube)', async () => {
  const r = await page.evaluate(() => {
    const item = [{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}];
    const baseline = [{id:1, mesa:4, status:'abierta', cerrada:false, notas:'', items: item}];
    const local    = [{id:1, mesa:4, status:'abierta', cerrada:false, notas:'Sin gluten', items: item}]; // se acaba de anotar aquí
    const remote   = [{id:1, mesa:4, status:'abierta', cerrada:false, notas:'', items: item}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    const localesPorId = new Map(local.map(o => [o.id, o]));
    merged = merged.map(o => {
      const loc = localesPorId.get(o.id);
      if(!loc || loc === o) return o;
      return mergeOrderLines(loc, o);
    });
    return merged;
  });
  assert.equal(r[0].notas, 'Sin gluten', 'las notas editadas no debían perderse: ' + JSON.stringify(r));
});

await caso('Una venta (sales) corregida no se resucita si la nube va con retraso', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, total:20, metodoPago:'efectivo', status:'cobrada'}];
    const local    = [{id:1, total:18, metodoPago:'efectivo', status:'cobrada'}]; // se corrigió el total aquí (línea anulada)
    const remote   = [{id:1, total:20, metodoPago:'efectivo', status:'cobrada'}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].total, 18, 'la corrección de la venta no debía resucitar: ' + JSON.stringify(r));
});

await caso('Un cierre de caja (cashClosures) con un ajuste manual reciente no se resucita si la nube va con retraso', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, esperado:500, contado:495, diferencia:-5, warnings:['Descuadre de 5€']}];
    const local    = [{id:1, esperado:500, contado:500, diferencia:0, warnings:[]}]; // se corrigió el conteo aquí
    const remote   = [{id:1, esperado:500, contado:495, diferencia:-5, warnings:['Descuadre de 5€']}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].contado, 500, 'la corrección del cierre de caja no debía resucitar: ' + JSON.stringify(r));
});

await caso('Edición concurrente real en tpvOrders (dos dispositivos añaden líneas distintas): sigue fusionando bien, no se pierde ninguna', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}]}];
    const local    = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}, {lineId:2, name:'Caña', qty:1, estado:'cocina', marchada:0}]}]; // camarero de sala añadió una caña
    const remote   = [{id:1, mesa:4, status:'abierta', cerrada:false, items:[{lineId:1, name:'Croqueta', qty:2, estado:'cocina', marchada:0}, {lineId:3, name:'Pan', qty:1, estado:'cocina', marchada:0}]}]; // otro camarero añadió pan, desde otro dispositivo
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    const localesPorId = new Map(local.map(o => [o.id, o]));
    merged = merged.map(o => {
      const loc = localesPorId.get(o.id);
      if(!loc || loc === o) return o;
      return mergeOrderLines(loc, o);
    });
    return merged;
  });
  const lineIds = r[0].items.map(i => i.lineId).sort();
  assert.deepEqual(lineIds, [1,2,3], 'las líneas de los dos dispositivos deben conservarse todas: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ casos pasaron');
await browser.close();
process.exit(fallos ? 1 : 0);
