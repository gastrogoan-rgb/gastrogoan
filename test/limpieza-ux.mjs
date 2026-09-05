// 5/09/2026, tres cositas que el dueño vio usando la app:
// 1) el paso del protocolo de lavado de manos era un <input> de una sola
//    línea: un paso con mucho texto se veía cortado, sin wrap ni scroll.
// 2) "Equivale a cantar Cumpleaños feliz dos veces" — fuera.
// 3) Limpieza mensual solo dejaba crear tareas que se repiten cada mes, sin
//    forma de anotar una limpieza puntual de un solo día.
// Prueba ESTÁTICA a propósito, igual que idr-ficha.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(raiz, 'js/app.js'), 'utf8');
const i18n = fs.readFileSync(path.join(raiz, 'js/i18n.js'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('Cada paso del lavado de manos es un textarea (envuelve el texto largo)', () => {
  const m = app.match(/function renderLimpiezaManos\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró renderLimpiezaManos');
  assert.ok(m[0].includes('<textarea') , 'sigue usando <input> de una sola línea para cada paso');
});

caso('Ya no se compara el lavado de manos con cantar Cumpleaños feliz', () => {
  assert.ok(!app.includes('happyBirthdayEquivalent'), 'app.js todavía referencia msg.happyBirthdayEquivalent');
  assert.ok(!i18n.includes('happyBirthdayEquivalent'), 'la clave sigue en el diccionario aunque nadie la usa');
});

caso('Limpieza mensual deja elegir entre "cada mes" y "un solo día" (puntual)', () => {
  const m = app.match(/function openLimpiezaTareaMesModal\(id\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró openLimpiezaTareaMesModal');
  assert.ok(m[0].includes("id=\"new-limpieza-tipo\""), 'no hay selector de repetición (cada mes / puntual)');
  assert.ok(m[0].includes('new-limpieza-fecha'), 'no hay campo de fecha para la limpieza puntual');
});

caso('Una tarea puntual se guarda con fecha exacta, no con día del mes', () => {
  const m = app.match(/function confirmLimpiezaTareaMes\(id\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró confirmLimpiezaTareaMes');
  assert.ok(/tipo === 'puntual'/.test(m[0]) && m[0].includes('fecha'), 'no distingue entre tipo mensual y puntual al guardar');
});

caso('limpiezaTareasParaDia reconoce tareas puntuales por fecha exacta, no solo mensuales por día del mes', () => {
  const m = app.match(/function limpiezaTareasParaDia\(date\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró limpiezaTareasParaDia (o sigue recibiendo solo el día, no la fecha completa)');
  assert.ok(m[0].includes("t.tipo === 'puntual'"), 'no filtra tareas puntuales');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
