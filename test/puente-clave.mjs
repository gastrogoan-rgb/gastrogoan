// Auditoría 25/11, hallazgo 5: el puente de pedidos externos aceptaba pedidos de cualquiera con solo el publicId (impreso en el QR del
// local) cuando PUENTE_CLAVE no estaba puesta, y ponerla era opcional. Ahora es OBLIGATORIA: sin ella el Worker no acepta nada.
// Falla con el Worker antiguo (200/502 sin clave en vez de 503) y pasa con el actual.
import assert from 'node:assert/strict';
import worker from '../worker/pedidos-externos-worker.js';

let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

const llamadasRed = [];
globalThis.fetch = async url => { llamadasRed.push(String(url)); return new Response('null'); };
const pedido = {publicId: 'abc12de', plataforma: 'glovo', ref: 'G-1', tipo: 'recoger', total: 10, items: [{nombre: 'Hamburguesa', cantidad: 1, precio: 10}]};
const post = (env, cabeceras) => worker.fetch(new Request('https://puente.test/pedido', {method: 'POST', headers: Object.assign({'content-type': 'application/json'}, cabeceras || {}), body: JSON.stringify(pedido)}), env);
const BASE = {FIREBASE_DB_URL: 'https://plataforma.test', FIREBASE_DB_SECRET: 's'};
const CLAVE = 'una-clave-larga-de-16+';

await caso('Sin PUENTE_CLAVE en el Worker NO acepta nada (503), traiga la cabecera que traiga', async () => {
  for(const cab of [undefined, {'x-puente-clave': ''}, {'x-puente-clave': 'cualquiera'}, {'x-puente-clave': 'undefined'}]){
    const r = await post(BASE, cab);
    assert.equal(r.status, 503, 'el puente aceptó o procesó un pedido sin tener clave configurada: ' + r.status);
  }
  assert.equal(llamadasRed.length, 0, 'tocó la nube antes de comprobar la clave');
});
await caso('Una clave demasiado corta no cuenta como configurada', async () => {
  assert.equal((await post(Object.assign({PUENTE_CLAVE: '1234'}, BASE), {'x-puente-clave': '1234'})).status, 503);
});
await caso('Con la clave puesta: sin cabecera o con otra → 401 y sin tocar la nube; con la buena, pasa de la puerta', async () => {
  const env = Object.assign({PUENTE_CLAVE: CLAVE}, BASE);
  assert.equal((await post(env)).status, 401);
  assert.equal((await post(env, {'x-puente-clave': CLAVE + 'x'})).status, 401);
  assert.equal((await post(env, {'x-puente-clave': CLAVE.slice(0, -1)})).status, 401);
  assert.equal(llamadasRed.length, 0, 'con la clave mala llegó a la nube');
  const r = await post(env, {'x-puente-clave': CLAVE});
  assert.notEqual(r.status, 401); assert.notEqual(r.status, 503);
  assert.ok(llamadasRed.length > 0, 'con la clave buena no se intentó entregar');
});
await caso('El README y la cabecera del Worker dicen que la clave es obligatoria', async () => {
  const fs = await import('node:fs');
  const readme = fs.readFileSync(new URL('../worker/README.md', import.meta.url), 'utf8');
  assert.ok(/PUENTE_CLAVE[^\n]*obligatoria/i.test(readme), 'el README sigue diciendo que es opcional');
  assert.ok(!/opcional,? `?PUENTE_CLAVE/.test(readme));
});
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el puente ya no acepta pedidos sin clave');
process.exit(fallos ? 1 : 0);
