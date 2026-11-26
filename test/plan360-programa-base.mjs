// Plan 360 (panel del coach) · semilla del programa PLAN360_DEFAULT_PROGRAM.
// Se LEE (siembra el programa de un negocio sin plan) pero no debe llevar texto de relleno: ni el campo
// task «(Contenido pendiente de definir)» ni nada parecido. Extrae la constante del HTML y la evalúa.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

const html = readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const ini = html.indexOf('const PLAN360_DEFAULT_PROGRAM = [');
const fin = html.indexOf('];', ini);
const bloque = ini >= 0 && fin > ini ? html.slice(ini, fin + 2) : '';

caso('la constante existe y se lee en plan360RepararVaciosCoach', () => {
  assert.ok(bloque, 'no encuentro PLAN360_DEFAULT_PROGRAM');
  assert.match(html, /function plan360RepararVaciosCoach/);
  assert.match(html, /remoteBiz\.plan360Program = PLAN360_DEFAULT_PROGRAM\.map/);
  return 'lectura conservada';
});

caso('ningún texto de relleno «pendiente de definir» en la semilla', () => {
  assert.doesNotMatch(bloque, /pendiente de definir/i);
  assert.doesNotMatch(bloque, /\btask\s*:/);
  return 'sin task ni relleno';
});

caso('la semilla evalúa a 28 días: 2 presenciales + 26 de trabajo, sin tareas', () => {
  const PLAN360_DEFAULT_PROGRAM = new Function(bloque.replace(/^const PLAN360_DEFAULT_PROGRAM = /, 'return ').replace(/;$/, '') + ';')();
  assert.equal(PLAN360_DEFAULT_PROGRAM.length, 28);
  assert.deepEqual(PLAN360_DEFAULT_PROGRAM.slice(0, 2).map(d => d.phase), ['presencial', 'presencial']);
  assert.equal(PLAN360_DEFAULT_PROGRAM.filter(d => d.phase === 'trabajo').length, 26);
  PLAN360_DEFAULT_PROGRAM.forEach((d, i) => {
    assert.equal(d.day, i + 1);
    assert.ok(d.title && d.title.length > 0, 'día sin título: ' + d.day);
    assert.equal('task' in d, false, 'día ' + d.day + ' lleva task');
  });
  return '28 días, títulos y sin task';
});

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de la semilla del programa pasaron');
process.exit(fallos ? 1 : 0);
