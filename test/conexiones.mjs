// Auditoría de conexiones (4/09/2026): cinco cables rotos encontrados al
// verificar que una acción en un sitio se propaga a todos los sitios donde
// debería (el ejemplo del dueño: lácteo en una ficha técnica → debe verse
// en APPCC). Prueba ESTÁTICA a propósito, igual que idr-ficha.mjs: lo que
// importa es que el patrón de código no se rompa otra vez.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = fs.readFileSync(path.join(raiz, 'js/core.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'js/app.js'), 'utf8');
const tpv = fs.readFileSync(path.join(raiz, 'js/tpv.js'), 'utf8');
const hr = fs.readFileSync(path.join(raiz, 'js/hr.js'), 'utf8');
const publica = fs.readFileSync(path.join(raiz, 'reservagastrogoan.html'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('Alérgenos marcados a mano en la ficha llegan a la web pública (no solo los del escandallo)', () => {
  const m = core.match(/function getPublicAllergensForSync\(\)[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró getPublicAllergensForSync');
  assert.ok(m[0].includes('getFichaAllergens'), 'debe usar getFichaAllergens (suma lo manual de la ficha), no solo recipeComputedAllergens');
});

caso('Los menús/combos entran en el aviso interno de alérgenos (APPCC)', () => {
  const m = app.match(/function getAllDishAllergens\(\)[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró getAllDishAllergens');
  assert.ok(m[0].includes('DB.menus'), 'getAllDishAllergens no recorre DB.menus: un plato con alérgeno metido en un menú no aparecería en APPCC');
});

caso('Los menús/combos entran en el sync de alérgenos a la web pública', () => {
  const m = core.match(/function getPublicAllergensForSync\(\)[\s\S]*?\n\}/);
  assert.ok(m[0].includes('DB.menus'), 'getPublicAllergensForSync no recorre DB.menus');
});

caso('La web pública muestra el aviso de alérgenos al elegir opción de un menú', () => {
  const m = publica.match(/function openMenuModal\([\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró openMenuModal');
  assert.ok(m[0].includes('dishAllergensHtml'), 'openMenuModal no pinta dishAllergensHtml junto a cada opción');
});

caso('El interruptor de emergencia "pedidos online" se publica al espejo público', () => {
  const m = core.match(/const CAMPOS_PUBLICOS_DEL_NEGOCIO = \[[\s\S]*?\];/);
  assert.ok(m, 'no se encontró CAMPOS_PUBLICOS_DEL_NEGOCIO');
  assert.ok(m[0].includes('pedidosOnlineActivos'), 'pedidosOnlineActivos no está en la lista blanca — el botón de emergencia no llega a la web pública');
});

caso('Anular una venta revierte el punto de fidelidad que sumó al cobrarla', () => {
  const m = tpv.match(/function reallyCancelSale\([\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró reallyCancelSale');
  assert.ok(/points\s*=\s*Math\.max\(0,\s*\(c\.points\|\|0\)\s*-\s*1\)/.test(m[0]),
    'reallyCancelSale no resta el punto de fidelidad — el cliente se queda con puntos de una venta anulada');
});

caso('reservations, promos, turnos y purchaseOrders tienen lápida (se borran de verdad, no solo se anulan)', () => {
  const m = core.match(/const ARRAYS_CON_LAPIDA = new Set\(\[[\s\S]*?\]\);/);
  assert.ok(m, 'no se encontró ARRAYS_CON_LAPIDA');
  ['reservations', 'promos', 'turnos', 'purchaseOrders'].forEach(k => {
    assert.ok(m[0].includes(`'${k}'`), `${k} no está en ARRAYS_CON_LAPIDA — riesgo de resurrección al sincronizar un dispositivo desactualizado`);
  });
});

caso('fichajes, turnoSwapRequests, vacationRequests y trash tienen lápida (borrado real de reallyDeleteEmployee/restoreTrashItem)', () => {
  const m = core.match(/const ARRAYS_CON_LAPIDA = new Set\(\[[\s\S]*?\]\);/);
  assert.ok(m, 'no se encontró ARRAYS_CON_LAPIDA');
  ['fichajes', 'turnoSwapRequests', 'vacationRequests', 'trash'].forEach(k => {
    assert.ok(m[0].includes(`'${k}'`), `${k} no está en ARRAYS_CON_LAPIDA — riesgo de resurrección/duplicado al sincronizar un dispositivo desactualizado`);
  });
});

caso('Quitar "es repartidor" o borrar al repartidor libera sus pedidos de reparto en curso', () => {
  assert.ok(tpv.includes('function liberarPedidosDeRepartidor'), 'no se encontró liberarPedidosDeRepartidor en tpv.js');
  assert.ok(hr.includes('liberarPedidosDeRepartidor(id)'), 'saveEmployee/reallyDeleteEmployee no llaman a liberarPedidosDeRepartidor');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
