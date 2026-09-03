// Todo plato que crea el I+D tiene que quedar con su ficha técnica
// enganchada, igual que un plato creado a mano desde el Escandallo
// (saveRecipe, que siempre llama a ensureFichaForRecipe justo después de
// crear la receta — es lo que evita el paso que "se podía olvidar").
//
// El I+D crea recetas por su cuenta en cinco sitios (elaboraciones base,
// plato suelto, variante, plato dentro de un menú, plato dentro de una
// carta completa) y se le olvidaba enganchar la ficha en los cinco: el
// plato salía en Fichas Técnicas con la insignia ámbar "Sin ficha técnica"
// en vez de la verde de cualquier plato creado a mano, y no se podía
// imprimir/duplicar su ficha ni anotarle un alérgeno a mano hasta que
// alguien entraba y la guardaba manualmente una vez.
//
// Prueba ESTÁTICA a propósito: las funciones del I+D son async, dependen
// de una IA de verdad y son costosas de simular enteras. Lo que importa
// aquí es que el patrón de código no se rompa — que ningún DB.recipes.push
// nuevo se cuele sin su ensureFichaForRecipe al lado, hoy ni en el futuro.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const idr = fs.readFileSync(path.join(raiz, 'js/idr.js'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('El I+D crea recetas en más de un sitio (si esto falla, hay que revisar el número de abajo)', () => {
  const n = (idr.match(/DB\.recipes\.push\(receta\)/g) || []).length;
  assert.ok(n >= 5, 'se esperaban al menos 5 sitios donde el I+D crea una receta: ' + n);
  return n + ' sitios';
});

caso('CADA creación de receta del I+D engancha su ficha técnica', () => {
  // Se recorre cada aparición de DB.recipes.push(receta) y se comprueba que,
  // en las 200 líneas siguientes, aparece ensureFichaForRecipe(receta.id) —
  // margen amplio porque algunos sitios meten código intermedio (creados.push,
  // platosSec.push...) antes de terminar ese bloque.
  const lineas = idr.split('\n');
  const sitios = [];
  lineas.forEach((linea, i) => { if(linea.includes('DB.recipes.push(receta)')) sitios.push(i); });
  assert.ok(sitios.length > 0, 'no se encontró ningún DB.recipes.push(receta) — ¿cambió el nombre de la variable?');
  sitios.forEach(i => {
    const ventana = lineas.slice(i, i + 15).join('\n');
    assert.ok(ventana.includes('ensureFichaForRecipe'),
      `línea ${i+1}: crea una receta sin enganchar su ficha técnica justo después`);
  });
  return `los ${sitios.length} sitios enganchan la ficha`;
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ los 2 casos pasaron`);
process.exit(fallos ? 1 : 0);
