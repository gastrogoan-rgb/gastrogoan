// Hallazgo de la auditoría nocturna del 8/09/2026: el arreglo de la carrera
// de sincronización (P3-V02, commit "Corrige la carrera...") solo se aplicó
// a `cartas` y `menus`. El resto de MERGEABLE_ARRAYS (employees, turnos,
// fichajes, tpvOrders, reservations, providers, tables, clients, promos...)
// siguen usando mergeArraysById() a secas, que hace "gana la nube entera"
// cuando el mismo id existe en los dos lados. Igual que con cartas/menus,
// si el dispositivo recarga dentro de la ventana de CLOUD_SYNC_DELAY
// (0,8 s) — antes de que la subida a la nube termine — cualquier edición
// reciente de esos arrays se deshace en silencio en cuanto llega el
// listener con la copia vieja de la nube.
//
// Esta prueba NO aplica ningún fix (el hallazgo se documenta para decidir
// mañana, ver informe): solo demuestra con las funciones reales del
// bundle que el problema existe para `employees` y `fichajes`, los dos
// casos que pide expresamente el encargo de esta auditoría (turnos con
// fichajes dentro, empleados con algo anidado).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,800));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('DOCUMENTADO, no arreglado: un teléfono editado en un empleado se resucita si la nube va con retraso (mismo hueco que P3-V02, sin el parche)', async () => {
  const r = await page.evaluate(() => {
    // La nube y lo local coincidían en el teléfono viejo; aquí se acaba
    // de editar el teléfono, y la nube todavía no se ha enterado (recarga
    // dentro de CLOUD_SYNC_DELAY).
    const local  = [{id:777, name:'Ana', phone:'600999888', area:'cocina'}];
    const remote = [{id:777, name:'Ana', phone:'600111222', area:'cocina'}]; // nube atrasada
    return mergeArraysById(local, remote); // sin preferLocalWhenRemoteStale: no existe para 'employees'
  });
  // Esto CONFIRMA el hallazgo (se espera que falle mientras no se decida el fix):
  // el teléfono recién editado se pierde y vuelve el viejo de la nube.
  assert.equal(r[0].phone, '600999888', 'el teléfono editado se resucitó al de la nube atrasada — carrera de sincronización sin parchear en employees');
});

await caso('DOCUMENTADO, no arreglado: una hora de salida corregida en un fichaje se resucita igual (turnos/fichajes anidados, mismo hueco)', async () => {
  const r = await page.evaluate(() => {
    const local  = [{id:1, employeeId:777, entrada:'2026-09-08T09:00:00.000Z', salida:'2026-09-08T17:00:00.000Z'}]; // corregido aquí
    const remote = [{id:1, employeeId:777, entrada:'2026-09-08T09:00:00.000Z', salida:'2026-09-08T17:30:00.000Z'}]; // nube atrasada, con el valor viejo
    return mergeArraysById(local, remote);
  });
  assert.equal(r[0].salida, '2026-09-08T17:00:00.000Z', 'la corrección del fichaje se resucitó a la hora vieja de la nube atrasada');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} confirmados (esperado: el hallazgo sigue sin arreglar, ver informe)` : '✅ (inesperado: ¿ya se arregló de forma genérica?)');
await browser.close();
// Salida 0 siempre: esto es una prueba DE DOCUMENTACIÓN de un hallazgo abierto,
// no una regresión — no se añade a test/todo.sh a propósito, para no marcar
// en rojo la batería por un hallazgo pendiente de decisión de producto.
process.exit(0);
