// 5/09/2026: en Mega Lista, un ingrediente sembrado con una categoría fina
// ('Panes y Bollería', 'Legumbres', 'Arroces'...) no encontraba esa opción
// al editarlo — esas categorías nunca se registraban en
// DB.ingredientCategories ni estaban en la lista predefinida (CATEGORIES_
// COCINA/SALA). El navegador preseleccionaba la primera opción del <select>
// (Carnes, por ser la primera de la lista) y guardar sin tocar nada le
// cambiaba la categoría en silencio. Aparte, 'Bebidas' no pinta nada en
// cocina: eso es cosa de Sala, que ya tiene su propio catálogo detallado.
//
// Prueba ESTÁTICA a propósito, igual que idr-ficha.mjs: lo que importa es
// que el patrón de código no se rompa otra vez.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = fs.readFileSync(path.join(raiz, 'js/core.js'), 'utf8');
const finance = fs.readFileSync(path.join(raiz, 'js/finance.js'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('CATEGORIES_COCINA ya no incluye Bebidas', () => {
  const m = core.match(/const CATEGORIES_COCINA = \[[\s\S]*?\];/);
  assert.ok(m, 'no se encontró CATEGORIES_COCINA');
  assert.ok(!m[0].includes("'Bebidas'"), 'Bebidas sigue en la lista predefinida de cocina');
});

caso('El catálogo base de cocina ya no siembra una sección de Bebidas', () => {
  const m = finance.match(/const BASE_INGREDIENTS_CATALOG = \{[\s\S]*?\n\};/);
  assert.ok(m, 'no se encontró BASE_INGREDIENTS_CATALOG');
  assert.ok(!/'Bebidas':\s*\{/.test(m[0]), 'la sección Bebidas sigue sembrándose en cocina');
});

caso('Cualquier categoría que un ingrediente ya tenga puesta se registra como seleccionable', () => {
  assert.ok(core.includes('function registrarCategoriasDeIngredientesEnUso'),
    'no se encontró registrarCategoriasDeIngredientesEnUso en core.js');
});

caso('loadDB registra las categorías en uso tanto para un negocio nuevo como para uno ya existente', () => {
  const m = core.match(/async function loadDB\(\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'no se encontró loadDB');
  const llamadas = (m[0].match(/registrarCategoriasDeIngredientesEnUso\(/g) || []).length;
  assert.ok(llamadas >= 2, `se esperaban al menos 2 llamadas (negocio nuevo + negocio existente), hay ${llamadas}`);
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
