// Ajustes que viven en el aparato (localStorage) y que el dueño podría creer «del negocio»: el texto de pantalla debe decirlo
// (26/11). Alarma de pedidos, avisos del navegador y emparejado Bluetooth son de CADA tablet o móvil.
// Y la regla de las claves secretas: la clave de IA y la de VeriFactu NUNCA se escriben en DB.business (viaja a la nube).
import fs from 'node:fs';
import assert from 'node:assert/strict';
let fallos = 0;
function caso(n, fn){ try{ fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const leer = f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const ent = leer('entregas.js'), app = leer('app.js'), i18n = leer('i18n.js'), core = leer('core.js');
caso('El botón de la alarma de pedidos dice que es de este aparato (en es, ca y en)', () => {
  for(const t of ['Alarma apagada (este aparato)', 'Alarma apagada (aquest aparell)', 'Alarm off (this device)', 'Alarma activa (este aparato)']) assert.ok(ent.includes(t), t);
});
caso('Los avisos del navegador dicen que se activan en cada aparato por separado (es, ca, en)', () => {
  for(const t of ['en cada aparato por separado', 'a cada aparell per separat', 'separately on each device']) assert.ok(i18n.includes(t), t);
});
caso('Falta emparejar por Bluetooth: dice que es en ESTE aparato (es, ca, en)', () => {
  for(const t of ['en ESTE aparato', 'en AQUEST aparell', 'on THIS device']) assert.ok(app.includes(t), t);
});
caso('Las claves secretas (IA y VeriFactu) solo se guardan en localStorage, nunca en DB.business', () => {
  const todo = core + app + leer('idr.js') + leer('finance.js') + leer('tpv.js');
  assert.ok(!/DB\.business\.(idrKey|iaKey|verifactuKey|verifactuApiKey|apiKeyIA)\s*=/.test(todo));
  assert.ok(/localStorage\.setItem\(idrKeyLS\(/.test(todo), 'la clave de IA va a localStorage');
  assert.ok(/localStorage\.setItem\(verifactuKeyLS\(/.test(todo), 'la de VeriFactu va a localStorage');
});
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
