// Calendario interactivo de disponibilidad (día/semana/mes) en el
// formulario de reservas de la web pública. Prueba real contra el motor de
// emparejamiento de mesas/aforo (checkSlotFree/computeDayStatus), no una
// simulación aparte — así una futura desincronización entre el cálculo del
// calendario y el de submitReserva la pilla esto, no un cliente real.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,500));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await page.evaluate(() => {
  window.DB = DB = {};
  DB.business = {
    name:'Restaurante Test', aforo: 0,
    horario: Array.from({length:7}, () => ({abierto:true, modo:'seguido', seguido:{ini:'13:00', fin:'23:00'}})),
    tiposServicio:{mesa:true, takeaway:false, delivery:false},
  };
  DB.tables = [{id:1, name:'Mesa 1', plazas:2}, {id:2, name:'Mesa 2', plazas:4}, {id:3, name:'Mesa 3', plazas:6}];
  DB.reservasResumen = {};
  DB.mesasOcupadas = {};
  currentTab = 'reserva';
  renderApp();
});

await caso('El calendario pinta la vista de día con huecos de media hora', async () => {
  const len = await page.evaluate(() => document.getElementById('r-cal')?.innerHTML.length || 0);
  assert.ok(len > 500, 'la vista de día no pintó nada dentro de #r-cal');
  const numSlots = await page.evaluate(() => document.querySelectorAll('#r-cal button:not([disabled])').length);
  assert.ok(numSlots >= 10, `se esperaban varios huecos de 30 min entre 13:00 y 23:00, salieron ${numSlots}`);
});

await caso('Cambiar a semana y a mes no revienta nada', async () => {
  await page.evaluate(() => calSetView('semana'));
  const semana = await page.evaluate(() => document.querySelectorAll('#r-cal button').length);
  assert.ok(semana >= 7, 'la vista de semana no pintó los 7 días');
  await page.evaluate(() => calSetView('mes'));
  const mes = await page.evaluate(() => document.querySelectorAll('#r-cal button').length);
  assert.ok(mes >= 35, 'la vista de mes no pintó la rejilla completa (5-6 semanas)');
  await page.evaluate(() => calSetView('dia'));
});

await caso('Una mesa ocupada TODO el día marca ese día como lleno para ese grupo', async () => {
  const r = await page.evaluate(() => {
    DB.tables = [{id:1, name:'Mesa 1', plazas:4}];
    const fecha = '2026-09-10';
    DB.mesasOcupadas[fecha] = {1: {}};
    ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'].forEach(s => DB.mesasOcupadas[fecha][1][s] = true);
    const lleno = computeDayStatus(fecha, 2);
    DB.mesasOcupadas[fecha][1] = {};
    const libre = computeDayStatus(fecha, 2);
    return {lleno, libre};
  });
  assert.equal(r.lleno, 'lleno', 'con la única mesa ocupada todo el día, ese día debía salir lleno');
  assert.equal(r.libre, 'libre', 'liberando la mesa, el día debía volver a salir libre');
});

await caso('Un grupo más grande que cualquier mesa se deja como reservable (revisión manual), no bloqueado', async () => {
  const estado = await page.evaluate(() => computeDayStatus('2026-09-11', 20));
  assert.equal(estado, 'libre', 'un grupo que no cabe en ninguna mesa individual debe poder reservar igualmente (el negocio lo revisa a mano), no debe salir "lleno"');
});

await caso('Elegir un hueco en la vista de día rellena los campos ocultos de fecha y hora', async () => {
  await page.evaluate(() => { DB.tables = [{id:1, name:'Mesa 1', plazas:2}, {id:2, name:'Mesa 2', plazas:4}]; renderReservaCalendar(); });
  const slot = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#r-cal button:not([disabled])')].filter(b => /^\d\d:\d\d$/.test(b.textContent.trim()));
    if(!btns.length) return null;
    btns[0].click();
    return btns[0].textContent.trim();
  });
  assert.ok(slot, 'no había ningún hueco libre para hacer clic');
  const date = await page.evaluate(() => document.getElementById('r-date').value);
  const time = await page.evaluate(() => document.getElementById('r-time').value);
  assert.equal(time, slot, 'el campo oculto de hora no se actualizó al elegir un hueco');
  assert.ok(date, 'el campo oculto de fecha no se actualizó al elegir un hueco');
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
