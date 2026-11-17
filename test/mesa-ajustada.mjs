// MESA MÁS AJUSTADA (17/11, decisión del dueño): el margen de plazas dice qué mesas PUEDEN valer (3 personas → mesas de 3 a 5), pero entre las libres solo se
// ofrecen las del tamaño más AJUSTADO. Una pareja puede sentarse en una mesa de 4 por el margen, pero NO si queda libre una de 2 o de 3. La web pública
// (getEligibleTables) y la app (mesasMasAjustadas, al recibir la reserva) aplican la misma regla.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const bloquear = page => page.setRequestInterception(true).then(() => page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue()));

// ── Web pública ──
const web = await browser.newPage(); await bloquear(web);
await web.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'}); await w(800);
const elegibles = (personas, ocupadas) => web.evaluate((personas, ocupadas) => {
  window.DB = DB = {business:{}, tables:[{id:1, name:'Mesa 1', plazas:2}, {id:2, name:'Mesa 2', plazas:2}, {id:3, name:'Mesa 3', plazas:3}, {id:4, name:'Mesa 4', plazas:4}, {id:5, name:'Mesa 5', plazas:8}], mesasOcupadas:{'2026-12-01': ocupadas}};
  return getEligibleTables('2026-12-01', personas, ['21:00']).map(t => t.name);
}, personas, ocupadas);

await caso('Web: para 2 personas con dos mesas de 2 libres, SOLO se ofrecen las de 2 (no la de 3 ni la de 4)', async () => {
  assert.deepEqual(await elegibles(2, {}), ['Mesa 1', 'Mesa 2']);
});
await caso('Web: si una de 2 está ocupada, se ofrece la que queda de 2', async () => {
  assert.deepEqual(await elegibles(2, {1: {'21:00': true}}), ['Mesa 2']);
});
await caso('Web: si las dos de 2 están ocupadas, se ofrece la de 3 (y solo ella: la de 4 sigue guardada)', async () => {
  assert.deepEqual(await elegibles(2, {1: {'21:00': true}, 2: {'21:00': true}}), ['Mesa 3']);
});
await caso('Web: si solo queda la de 4 libre (el margen lo permite), se ofrece esa', async () => {
  assert.deepEqual(await elegibles(2, {1: {'21:00': true}, 2: {'21:00': true}, 3: {'21:00': true}}), ['Mesa 4']);
});
await caso('Web: una mesa de 8 sigue sin valer para 2 personas (fuera de margen), pase lo que pase', async () => {
  assert.deepEqual(await elegibles(2, {1: {'21:00': true}, 2: {'21:00': true}, 3: {'21:00': true}, 4: {'21:00': true}}), []);
});
await caso('Web: 3 personas → entre 3 y 5 plazas, y solo la más ajustada (la de 3)', async () => {
  assert.deepEqual(await elegibles(3, {}), ['Mesa 3']);
});
await web.close();

// ── App ──
const app = await browser.newPage(); await bloquear(app);
await app.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1500);
await caso('App: mesasMasAjustadas se queda solo con el tamaño menor', async () => {
  const r = await app.evaluate(() => ({
    a: mesasMasAjustadas([{id:4, plazas:4}, {id:1, plazas:2}, {id:3, plazas:3}, {id:2, plazas:2}]).map(t => t.id),
    b: mesasMasAjustadas([{id:4, plazas:4}, {id:3, plazas:3}]).map(t => t.id),
    c: mesasMasAjustadas([]).length,
  }));
  assert.deepEqual(r.a.sort(), [1, 2]); assert.deepEqual(r.b, [3]); assert.equal(r.c, 0);
});
await app.close();
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
