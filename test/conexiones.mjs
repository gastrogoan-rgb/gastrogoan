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
const menu = fs.readFileSync(path.join(raiz, 'js/menu.js'), 'utf8');
const publica = fs.readFileSync(path.join(raiz, 'reservagastrogoan.html'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('Alérgenos marcados a mano en la ficha llegan a la web pública (no solo los del escandallo)', () => {
  const m = core.match(/function allergensForRecipe\(recipe\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró allergensForRecipe (usado por getPublicAllergensForSync)');
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

caso('Los menús combo de la web pública guardan el nombre crudo, no traducido, en el pedido', () => {
  const m = publica.match(/function confirmAddMenuFromModal\(\)[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró confirmAddMenuFromModal');
  assert.ok(!/nombre:\s*`\$\{trItem\(g\)\}/.test(m[0]),
    'la selección de un menú combo usa trItem() para el nombre que se guarda — se traduce un dato que debería quedar neutro (ver i18n)');
  assert.ok(/nombre:\s*`\$\{g\.nombre\}: \$\{o\.nombre\}`/.test(m[0]), 'debe guardar g.nombre/o.nombre crudos');
});

caso('sales y cashClosures tienen lápida (se archivan de verdad con borrado real)', () => {
  const m = core.match(/const ARRAYS_CON_LAPIDA = new Set\(\[[\s\S]*?\]\);/);
  assert.ok(m, 'no se encontró ARRAYS_CON_LAPIDA');
  ['sales', 'cashClosures'].forEach(k => {
    assert.ok(m[0].includes(`'${k}'`), `${k} no está en ARRAYS_CON_LAPIDA — archivar datos antiguos podía resucitar ventas/cierres al sincronizar`);
  });
});

caso('Restaurar un backup fusiona las lápidas en vez de sustituirlas (no resucita borrados posteriores al backup)', () => {
  const m = app.match(/function confirmRestoreBackup\(\)[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró confirmRestoreBackup');
  assert.ok(m[0].includes('lapidasFusionadas') && m[0].includes('parsed.borrados = lapidasFusionadas'),
    'confirmRestoreBackup sustituye DB.borrados con el del backup sin fusionar — resucita cualquier borrado posterior a la fecha del backup al volver a sincronizar');
});

caso('Un plato de Carta sin escandallo (recipeId null) puede marcarse alérgenos a mano y llegan a APPCC y a la web pública', () => {
  assert.ok(core.includes('function lineAllergens'), 'no se encontró lineAllergens en core.js');
  assert.ok(menu.includes('function openPlatoAllergensModal') && menu.includes('allergensManual'),
    'no se encontró la UI de alérgenos manuales para platos sin receta en menu.js');
  const appFn = app.match(/function getAllDishAllergens\(\)[\s\S]*?\n\}/);
  assert.ok(appFn && appFn[0].includes('allergensManual'), 'getAllDishAllergens no considera p.allergensManual');
  const coreFn = core.match(/function getPublicAllergensForSync\(\)[\s\S]*?\n\}/);
  assert.ok(coreFn && coreFn[0].includes('allergensManual'), 'getPublicAllergensForSync no considera p.allergensManual');
});

caso('La pantalla y el ticket de cocina avisan de los alérgenos del propio plato, no solo de lo escrito a mano en la mesa', () => {
  const warn = tpv.match(/function orderAllergyWarningHtml\(order\)\{[\s\S]*?\n\}/);
  assert.ok(warn, 'no se encontró orderAllergyWarningHtml');
  assert.ok(warn[0].includes('lineAllergens'), 'orderAllergyWarningHtml (pantalla de cocina) no consulta lineAllergens — solo repite lo escrito a mano por el camarero');
  assert.ok(tpv.includes('function comandaAllergensText') && tpv.includes('comandaAllergensText(order, lineas)'),
    'el ticket impreso de cocina no incluye los alérgenos del plato, solo order.tableAllergens');
});

caso('La carga inicial completa (mergeRemoteIntoLocal) aplica las lápidas de la nube antes de limpiar los demás arrays', () => {
  const m = core.match(/function mergeRemoteIntoLocal\(val\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró mergeRemoteIntoLocal');
  const antesDelBucle = m[0].slice(0, m[0].indexOf('Object.keys(merged).forEach'));
  assert.ok(/DB\.borrados\s*=\s*mergeLapidas\(DB\.borrados,\s*merged\.borrados\)/.test(antesDelBucle),
    'las lápidas remotas se aplican dentro del bucle (según le toque el turno a la clave "borrados"), no antes — un array procesado antes se limpia con lápidas desactualizadas');
});

caso('La sonda de comprobarEspejoEnNubePropia usa una ruta por dispositivo, no una fija compartida', () => {
  const m = core.match(/async function comprobarEspejoEnNubePropia\(\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'no se encontró comprobarEspejoEnNubePropia');
  assert.ok(m[0].includes('getOrCreateDeviceId()'),
    'la sonda sigue usando una ruta fija (_prueba/_sonda) — dos dispositivos del mismo negocio arrancando a la vez se pisan la sonda');
});

caso('Al tomar comanda hay un botón de información (i) junto a cada plato y opción de menú, con sus alérgenos', () => {
  assert.ok(tpv.includes('function openDishInfoModal'), 'no se encontró openDishInfoModal en tpv.js');
  assert.ok(tpv.includes("openDishInfoModal(${p.recipeId||'null'}"), 'el selector de platos de la carta (renderCartaSelectorInline) no tiene el botón de información');
  assert.ok(tpv.includes("openDishInfoModal(${o.recipeId||'null'}"), 'la selección de opciones de un menú (openMenuConfigModal) no tiene el botón de información');
  const fn = tpv.match(/function renderDishInfoModalHtml\([\s\S]*?\n\}/);
  assert.ok(fn && fn[0].includes('allergensForRecipe'), 'renderDishInfoModalHtml no usa allergensForRecipe para el resumen de alérgenos');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
