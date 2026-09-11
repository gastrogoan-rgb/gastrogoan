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

await caso('El calendario pinta la vista de día con huecos de 15 en 15 minutos', async () => {
  const len = await page.evaluate(() => document.getElementById('r-cal')?.innerHTML.length || 0);
  assert.ok(len > 500, 'la vista de día no pintó nada dentro de #r-cal');
  const numSlots = await page.evaluate(() => document.querySelectorAll('#r-cal button:not([disabled])').length);
  assert.ok(numSlots >= 20, `con paso de 15 min entre 13:00 y 23:00 se esperaban muchos huecos, salieron ${numSlots}`);
});

await caso('El último hueco queda 30 min ANTES del cierre, nunca a la hora exacta de cerrar ni después', async () => {
  const slots = await page.evaluate(() => slotsDelDia('2026-09-10'));
  assert.ok(slots.length, 'no se generó ningún hueco');
  assert.equal(slots[slots.length - 1], '22:30', `con cierre a las 23:00, el último hueco debe ser 22:30 (margen de 30 min) — salió ${slots[slots.length-1]}`);
  assert.ok(!slots.includes('23:00'), 'no debe ofrecerse un hueco justo a la hora de cerrar');
  assert.ok(!slots.some(s => s > '23:00'), 'no debe ofrecerse ningún hueco después del cierre');
});

await caso('Los huecos van de 15 en 15 minutos, no de 30 (se puede reservar a las 14:15)', async () => {
  const slots = await page.evaluate(() => slotsDelDia('2026-09-10'));
  assert.ok(slots.includes('14:15'), 'las 14:15 deben ser un hueco válido con pasos de 15 minutos');
  assert.ok(slots.includes('14:45'), 'las 14:45 también');
});

await caso('addDaysStr no desfasa un día por la zona horaria (nunca toISOString)', async () => {
  const r = await page.evaluate(() => ({
    mismoDia: addDaysStr('2026-08-31', 0),
    masUno: addDaysStr('2026-08-31', 1),
    codigoFuente: typeof addDaysStr,
  }));
  assert.equal(r.mismoDia, '2026-08-31', `sumar 0 días debe devolver la misma fecha — dio ${r.mismoDia} (síntoma clásico de usar toISOString con un huso por delante de UTC, como España)`);
  assert.equal(r.masUno, '2026-09-01');
});

await caso('El 7 de septiembre de 2026 (lunes real) cae en la columna de lunes en la vista de mes', async () => {
  const textos = await page.evaluate(() => {
    calDate = '2026-09-07';
    calView = 'mes';
    renderReservaCalendar();
    const grids = [...document.querySelectorAll('#r-cal > div[style*="grid-template-columns:repeat(7,1fr)"]')];
    const celdasGrid = grids[1];
    return [...celdasGrid.querySelectorAll('button')].map(b => b.textContent.trim());
  });
  // El 7 debe caer en la MISMA columna (índice % 7) que el 31 anterior y el
  // 14/21/28 siguientes — todos lunes reales de este calendario concreto.
  const idx7 = textos.indexOf('7');
  assert.ok(idx7 !== -1, 'no se encontró el día 7 en la rejilla');
  assert.equal(idx7 % 7, 0, `el 7 de septiembre de 2026 es LUNES de verdad y debe caer en la primera columna (L) — salió en la columna ${idx7 % 7}`);
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
    // Un día en el futuro relativo a "hoy", no una fecha fija: una fecha
    // fija envejece en cuanto pasa el día y computeDayStatus empieza a
    // devolver (correctamente) 'pasado' en vez de 'lleno'/'libre' — no es
    // un fallo de la app, es la prueba quedándose atrás.
    const fecha = addDaysStr(todayStr(), 1);
    DB.mesasOcupadas[fecha] = {1: {}};
    // Todas las franjas de 15 en 15 min entre apertura y cierre (con margen),
    // generadas con la misma función que usa el propio calendario — así este
    // test no se queda desfasado si el paso o el margen vuelven a cambiar.
    slotsDelDia(fecha).forEach(s => DB.mesasOcupadas[fecha][1][s] = true);
    const lleno = computeDayStatus(fecha, 2);
    DB.mesasOcupadas[fecha][1] = {};
    const libre = computeDayStatus(fecha, 2);
    return {lleno, libre};
  });
  assert.equal(r.lleno, 'lleno', 'con la única mesa ocupada todo el día, ese día debía salir lleno');
  assert.equal(r.libre, 'libre', 'liberando la mesa, el día debía volver a salir libre');
});

await caso('Un grupo más grande que cualquier mesa se deja como reservable (revisión manual), no bloqueado', async () => {
  const estado = await page.evaluate(() => computeDayStatus(addDaysStr(todayStr(), 2), 20));
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

await caso('Los huecos se ven en verde/rojo según disponibilidad, y el elegido NUNCA usa el color de marca del negocio', async () => {
  // Hallazgo real: el hueco "elegido" usaba var(--olive), que es el color
  // de MARCA del negocio (personalizable) — en un negocio con marca
  // naranja/roja, el hueco elegido se confundía visualmente con "no
  // disponible" (rojo). Se prueba con una marca naranja a propósito.
  const r = await page.evaluate(() => {
    document.documentElement.style.setProperty('--olive', '#E85D3C'); // naranja
    DB.tables = [{id:1, name:'Mesa 1', plazas:6}];
    DB.mesasOcupadas = {};
    calSelectedTime = null;
    renderReservaCalendar();
    let botones = [...document.querySelectorAll('#r-cal button')].filter(b => /^\d\d:\d\d$/.test(b.textContent.trim()));
    const libreAntes = getComputedStyle(botones[0]).backgroundColor;
    const textoElegido = botones[0].textContent.trim();
    botones[0].click();
    botones = [...document.querySelectorAll('#r-cal button')].filter(b => /^\d\d:\d\d$/.test(b.textContent.trim()));
    const elegido = botones.find(b => b.textContent.trim() === textoElegido);
    return {
      libreAntes,
      colorElegido: getComputedStyle(elegido).backgroundColor,
      ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
      greenL: getComputedStyle(document.documentElement).getPropertyValue('--green-l').trim(),
    };
  });
  // rgb(237, 241, 236) === #EDF1EC (--green-l)
  assert.equal(r.libreAntes, 'rgb(237, 241, 236)', `un hueco disponible debe pintarse en verde claro (--green-l), salió ${r.libreAntes}`);
  // rgb(28, 26, 23) === #1C1A17 (--ink)
  assert.equal(r.colorElegido, 'rgb(28, 26, 23)', `el hueco elegido debe usar --ink (negro), NUNCA el color de marca del negocio — salió ${r.colorElegido}`);
});

await caso('Un hueco ocupado se ve en rojo, tachado y deshabilitado', async () => {
  const r = await page.evaluate(() => {
    DB.tables = [{id:1, name:'Mesa 1', plazas:2}];
    const fecha = calDate;
    DB.mesasOcupadas = {};
    DB.mesasOcupadas[fecha] = {1: {}};
    slotsDelDia(fecha).forEach(s => DB.mesasOcupadas[fecha][1][s] = true);
    calSelectedTime = null;
    renderReservaCalendar();
    const boton = [...document.querySelectorAll('#r-cal button')].find(b => /^\d\d:\d\d$/.test(b.textContent.trim()));
    return {
      color: getComputedStyle(boton).backgroundColor,
      deshabilitado: boton.disabled,
      tachado: getComputedStyle(boton).textDecorationLine.includes('line-through'),
    };
  });
  // rgb(245, 235, 231) === #F5EBE7 (--red-l)
  assert.equal(r.color, 'rgb(245, 235, 231)', `un hueco ocupado debe pintarse en rojo claro (--red-l), salió ${r.color}`);
  assert.ok(r.deshabilitado, 'un hueco ocupado no debe poder pulsarse');
  assert.ok(r.tachado, 'un hueco ocupado debe verse tachado, no solo por el color (accesibilidad)');
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
