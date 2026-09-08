// Hallazgo real de una auditoría externa (Codex, P3-V02): borrar un extra de
// un plato (o cualquier otra edición de una carta/menú) podía deshacerse
// solo, si el dispositivo recargaba dentro de la ventana de
// CLOUD_SYNC_DELAY (0,8 s) antes de que la subida terminara. La causa era
// mergeArraysById() haciendo "gana la nube entera" siempre que el mismo id
// existiera en los dos lados — correcto ante una edición concurrente real,
// pero un desastre cuando la nube simplemente iba con retraso.
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

await caso('La nube todavía no se enteró (misma que el último punto en común): gana lo LOCAL, no se resucita el extra borrado', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, nombre:'Croqueta', modificadores:[{id:'m1', nombre:'Extra queso', precio:1}]}];
    const local    = [{id:1, nombre:'Croqueta', modificadores:[]}]; // el extra se acaba de borrar aquí
    const remote   = [{id:1, nombre:'Croqueta', modificadores:[{id:'m1', nombre:'Extra queso', precio:1}]}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].modificadores.length, 0, 'el extra borrado no debía resucitar: ' + JSON.stringify(r));
});

await caso('Edición concurrente real en dos dispositivos: sigue ganando la nube (no se sobreescribe un cambio ajeno)', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, nombre:'Croqueta', modificadores:[{id:'m1', nombre:'Extra queso', precio:1}]}];
    const local    = [{id:1, nombre:'Croqueta', modificadores:[]}]; // aquí se borró el extra
    const remote   = [{id:1, nombre:'Croqueta de pollo', modificadores:[{id:'m1', nombre:'Extra queso', precio:1}]}]; // en el otro aparato se cambió el NOMBRE, de verdad distinto del baseline
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].nombre, 'Croqueta de pollo', 'un cambio real y distinto en la nube no debe perderse: ' + JSON.stringify(r));
});

await caso('Sin baseline (primera sincronización de este negocio): no se toca nada, se comporta como antes', async () => {
  const r = await page.evaluate(() => {
    const local  = [{id:1, nombre:'Croqueta', modificadores:[]}];
    const remote = [{id:1, nombre:'Croqueta', modificadores:[{id:'m1', nombre:'Extra queso', precio:1}]}];
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, null);
    return merged;
  });
  assert.equal(r[0].modificadores.length, 1, 'sin punto en común no hay forma segura de saber quién va con retraso: debe ganar la nube, como siempre');
});

await caso('El stock de una carta sigue fusionándose por delta, no por "gana el local a lo bruto"', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, secciones:[{platos:[{id:9, stock:5, disponible:true}]}]}];
    const local    = [{id:1, secciones:[{platos:[{id:9, stock:3, disponible:true}]}]}]; // vendió 2 aquí
    const remote   = [{id:1, secciones:[{platos:[{id:9, stock:2, disponible:true}]}]}]; // vendió 3 en el otro aparato
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    merged = mergeCartaStock(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].secciones[0].platos[0].stock, 0, 'deben restarse las DOS ventas desde el punto en común (5-2-3=0): ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ casos pasaron');
await browser.close();
process.exit(fallos ? 1 : 0);
