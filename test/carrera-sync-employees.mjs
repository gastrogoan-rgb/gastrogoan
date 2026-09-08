// Mismo hallazgo que test/carrera-sync-carta.mjs (P3-V02), confirmado en la
// auditoría nocturna del 8/09 para el resto de arrays con campos editables
// sueltos: mergeArraysById() hacía "gana la nube entera" cuando el mismo id
// existe en los dos lados, así que editar el teléfono de un empleado o
// corregir la hora de un fichaje podía deshacerse solo con recargar dentro
// de la ventana de CLOUD_SYNC_DELAY (0,8 s), antes de que la nube se
// enterara. Extiende preferLocalWhenRemoteStale (ya probado para
// cartas/menús) a employees/turnos/fichajes.
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

await caso('Un teléfono de empleado editado no se resucita si la nube va con retraso', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:777, name:'Ana', phone:'600111222'}];
    const local    = [{id:777, name:'Ana', phone:'600999888'}]; // se acaba de editar aquí
    const remote   = [{id:777, name:'Ana', phone:'600111222'}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = PREFER_LOCAL_ARRAYS.has('employees') ? preferLocalWhenRemoteStale(local, merged, baselineJson) : merged;
    return merged;
  });
  assert.equal(r[0].phone, '600999888', 'el teléfono editado no debía resucitar: ' + JSON.stringify(r));
});

await caso('Una hora de fichaje corregida no se resucita si la nube va con retraso', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:1, employeeId:777, entrada:'2026-09-08T09:00:00.000Z', salida:'2026-09-08T17:30:00.000Z'}];
    const local    = [{id:1, employeeId:777, entrada:'2026-09-08T09:00:00.000Z', salida:'2026-09-08T17:00:00.000Z'}]; // corregido aquí
    const remote   = [{id:1, employeeId:777, entrada:'2026-09-08T09:00:00.000Z', salida:'2026-09-08T17:30:00.000Z'}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].salida, '2026-09-08T17:00:00.000Z', 'la corrección del fichaje no debía resucitar: ' + JSON.stringify(r));
});

await caso('Un turno movido a otro día no se resucita si la nube va con retraso', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:5, employeeId:777, dia:'2026-09-08', abre:'09:00', cierra:'17:00'}];
    const local    = [{id:5, employeeId:777, dia:'2026-09-09', abre:'09:00', cierra:'17:00'}]; // movido aquí
    const remote   = [{id:5, employeeId:777, dia:'2026-09-08', abre:'09:00', cierra:'17:00'}]; // la nube va con retraso
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].dia, '2026-09-09', 'el turno movido no debía resucitar al día viejo: ' + JSON.stringify(r));
});

await caso('Edición concurrente real en dos dispositivos: sigue ganando la nube', async () => {
  const r = await page.evaluate(() => {
    const baseline = [{id:777, name:'Ana', phone:'600111222'}];
    const local    = [{id:777, name:'Ana', phone:'600999888'}]; // aquí se cambió el teléfono
    const remote   = [{id:777, name:'Ana Auditoría', phone:'600111222'}]; // en el otro aparato se cambió el NOMBRE, distinto del baseline
    const baselineJson = canonicalStringify(baseline);
    let merged = mergeArraysById(local, remote);
    merged = preferLocalWhenRemoteStale(local, merged, baselineJson);
    return merged;
  });
  assert.equal(r[0].name, 'Ana Auditoría', 'un cambio real y distinto en la nube no debe perderse: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ casos pasaron');
await browser.close();
process.exit(fallos ? 1 : 0);
