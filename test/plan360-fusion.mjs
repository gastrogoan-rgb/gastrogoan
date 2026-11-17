// Plan 360º · Fase 0.2: la fusión a tres bandas casa las listas con `id` POR ID, no por posición.
// El coach y el negocio escriben a la vez las tareas/objetivos/inversiones; por posición, quitar o meter una tarea
// corría las demás un hueco y cada cambio acababa en la fila equivocada.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|github|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
let ok = 0, mal = 0;
async function caso(nombre, fn){ try{ await fn(); console.log('✅ ' + nombre); ok++; }catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + e.message); mal++; } }
const F = (b, l, r) => page.evaluate((b, l, r) => fusion3(b, l, r), b, l, r);
const T = (id, extra = {}) => ({id, title: 'tarea ' + id, status: 'pendiente', ...extra});

await caso('El coach mete una tarea al principio y el negocio marca otra: se quedan las dos cosas', async () => {
  const base = [T('a'), T('b'), T('c')];
  const local = [T('a'), T('b', {status: 'hecha'}), T('c')];            // el negocio marca la b
  const nube = [T('n'), T('a'), T('b'), T('c')];                         // el coach mete la n delante
  const r = await F(base, local, nube);
  assert.deepEqual(r.map(x => x.id), ['n', 'a', 'b', 'c']);
  assert.equal(r.find(x => x.id === 'b').status, 'hecha', 'la marca del negocio cayó en otra fila');
  assert.equal(r.find(x => x.id === 'a').status, 'pendiente'); assert.equal(r.find(x => x.id === 'c').status, 'pendiente');
});
await caso('El coach BORRA una tarea y el negocio marca otra: la borrada no vuelve y la marca se queda', async () => {
  const base = [T('a'), T('b'), T('c')];
  const local = [T('a'), T('b'), T('c', {status: 'hecha'})];
  const nube = [T('b'), T('c')];                                         // el coach quitó la a
  const r = await F(base, local, nube);
  assert.deepEqual(r.map(x => x.id), ['b', 'c']);
  assert.equal(r.find(x => x.id === 'c').status, 'hecha');
});
await caso('Los dos tocan la MISMA tarea en campos distintos: entran los dos', async () => {
  const base = [T('a', {note: ''})];
  const local = [T('a', {note: '', status: 'hecha'})];
  const nube = [T('a', {note: 'ojo con esto'})];
  const r = await F(base, local, nube);
  assert.equal(r[0].status, 'hecha'); assert.equal(r[0].note, 'ojo con esto');
});
await caso('Cada uno añade una tarea nueva a la vez: salen las dos, sin duplicar', async () => {
  const base = [T('a')];
  const local = [T('a'), T('x')];
  const nube = [T('a'), T('y')];
  const r = await F(base, local, nube);
  assert.deepEqual(r.map(x => x.id).sort(), ['a', 'x', 'y']);
});
await caso('Ids numéricos (inversiones del panel) también se casan por id', async () => {
  const base = [{id: 1, nombre: 'A', coste: 10}, {id: 2, nombre: 'B', coste: 20}];
  const local = [{id: 1, nombre: 'A', coste: 10}, {id: 2, nombre: 'B', coste: 25}];
  const nube = [{id: 0, nombre: 'Z', coste: 5}, {id: 1, nombre: 'A', coste: 10}, {id: 2, nombre: 'B', coste: 20}];
  const r = await F(base, local, nube);
  assert.deepEqual(r.map(x => x.id), [0, 1, 2]); assert.equal(r.find(x => x.id === 2).coste, 25);
});
await caso('Listas SIN id (días del programa, mediciones) siguen casándose por posición como antes', async () => {
  const base = [{valor: '1'}, {valor: '2'}];
  const local = [{valor: '1'}, {valor: '2'}, {valor: '3'}];
  const nube = [{valor: '1'}, {valor: '2'}];
  const r = await F(base, local, nube);
  assert.equal(r.length, 3);
});
await caso('Listas vacías y base vacía no revientan', async () => {
  assert.deepEqual(await F([], [T('a')], []), [T('a')]);
  assert.deepEqual(await F(undefined, [T('a')], [T('b')]).then(r => r.map(x => x.id).sort()), ['a', 'b']);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · fusión por id: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
