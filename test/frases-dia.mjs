// Frases del día (js/frases.js): 365, una por día del año, sin repetir, con autor y fuente en los tres idiomas.
// Las 8 últimas se añadieron con su cita comprobada en Wikiquote (obra y referencia en «f»).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

const src = readFileSync(new URL('../js/frases.js', import.meta.url), 'utf8');
const { FRASES_DIA, fraseDelDia } = new Function(src + '\nreturn {FRASES_DIA, fraseDelDia};')();

caso('hay 365 frases, una por día del año', () => {
  assert.equal(FRASES_DIA.length, 365, 'son ' + FRASES_DIA.length);
  return '365';
});
caso('cada frase tiene texto en es, ca y en, autor y fuente', () => {
  FRASES_DIA.forEach((f, i) => {
    for(const k of ['es', 'ca', 'en', 'a', 'f']) assert.ok(typeof f[k] === 'string' && f[k].trim().length > 0, `frase ${i + 1} sin «${k}»`);
  });
  return 'completas';
});
caso('ninguna frase se repite (castellano e inglés)', () => {
  assert.equal(new Set(FRASES_DIA.map(f => f.es)).size, 365, 'hay frases repetidas en es');
  assert.equal(new Set(FRASES_DIA.map(f => f.en)).size, 365, 'hay frases repetidas en en');
  return 'únicas';
});
caso('fraseDelDia da 365 frases distintas en un año entero', () => {
  const vistas = new Set();
  for(let d = 0; d < 365; d++){
    const fecha = new Date(2026, 0, 1 + d, 12);
    vistas.add(fraseDelDia(fecha).es);
  }
  assert.equal(vistas.size, 365, 'el ciclo repite: ' + vistas.size + ' distintas');
  return '365 en el año';
});
caso('las 8 añadidas están en su sitio con su fuente', () => {
  const ultimas = FRASES_DIA.slice(-8).map(f => f.a);
  assert.deepEqual(ultimas, ['Brian Stableford', 'Auguste Gusteau', 'Del Jones', 'Thomas Bailey Aldrich', 'Homero (trad. de Pope)', 'Hebreos 13:2', 'George Herbert', 'William Shakespeare']);
  FRASES_DIA.slice(-8).forEach(f => assert.match(f.f, /wikiquote|Biblia/i, 'sin cita comprobable: ' + f.a));
  return 'ok';
});

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todas las frases del día pasaron');
process.exit(fallos ? 1 : 0);
