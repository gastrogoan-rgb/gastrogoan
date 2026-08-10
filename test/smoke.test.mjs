// Tests mínimos "de humo" sobre la lógica pura de dinero/stock, la parte
// más delicada de la app (errores ahí = descuadres de caja reales). No
// levantan la UI ni un navegador (para eso está test-3years.mjs) — cargan
// js/tpv.js en un sandbox de Node con solo los globals que esas funciones
// necesitan, y comprueban los cálculos con casos conocidos.
//
// Ejecutar: node test/smoke.test.mjs

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'tpv.js'), 'utf8');

function loadTpv(DB) {
  const sandbox = { DB, t: (k) => k, window: undefined, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/tpv.js' });
  return sandbox;
}

const recipesSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'recipes.js'), 'utf8');
function loadRecipes(DB) {
  const sandbox = {
    DB, t: (k) => k, window: undefined, console,
    isOwnerSession: () => true, editUnlocked: true,
    moveToTrash: () => {}, logAudit: () => {}, saveDB: () => {},
    closeModal: () => {}, renderEscandallo: () => {}, showToast: () => {},
    maybeShowCategoryIconHint: () => {},
    ALLERGENS: [],
    document: {
      getElementById: () => ({value: '', style: {}, classList: {add(){}, remove(){}, contains(){return false;}}, addEventListener(){}, innerHTML: ''}),
      querySelector: () => null, querySelectorAll: () => [],
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(recipesSource, sandbox, { filename: 'js/recipes.js' });
  // recipes.js declara su propia renderEscandallo() (pinta UI real, con
  // muchas dependencias de DOM/DB no relevantes para esta prueba de lógica
  // pura) que pisa el stub inicial al cargar el script — se vuelve a
  // sobrescribir aquí, después de cargar, para que gane el stub.
  sandbox.renderEscandallo = () => {};
  return sandbox;
}

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${name}`);
    console.error('   ' + e.message);
  }
}

// --- saleIvaGroupsForFiscal: desglose de IVA de una venta ---

test('saleIvaGroupsForFiscal agrupa correctamente un único tipo de IVA', () => {
  const DB = { business: { ticket: { ivaPct: 10 } } };
  const sandbox = loadTpv(DB);
  const sale = {
    descuentoPct: 0,
    items: [
      { price: 10, qty: 2, ivaPct: 10 }, // 20€ bruto
      { price: 5, qty: 1, ivaPct: 10 },  // 5€ bruto
    ],
  };
  const groups = sandbox.saleIvaGroupsForFiscal(sale);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].ivaPct, 10);
  // 25€ bruto / 1.10 = 22.73 base, cuota = 25 - 22.73 = 2.27
  assert.equal(groups[0].base, 22.73);
  assert.equal(groups[0].cuota, 2.27);
});

test('saleIvaGroupsForFiscal separa tipos de IVA distintos en la misma venta', () => {
  const DB = { business: { ticket: { ivaPct: 10 } } };
  const sandbox = loadTpv(DB);
  const sale = {
    descuentoPct: 0,
    items: [
      { price: 12, qty: 1, ivaPct: 10 }, // comida
      { price: 4, qty: 1, ivaPct: 21 },  // copa
    ],
  };
  const groups = sandbox.saleIvaGroupsForFiscal(sale);
  assert.equal(groups.length, 2);
  const g10 = groups.find(g => g.ivaPct === 10);
  const g21 = groups.find(g => g.ivaPct === 21);
  assert.ok(g10 && g21, 'debe haber un grupo de 10% y otro de 21%');
  assert.equal(g10.base, 10.91); // 12 / 1.10
  assert.equal(g21.base, 3.31); // 4 / 1.21
});

test('saleIvaGroupsForFiscal aplica el descuento de la venta prorrateado', () => {
  const DB = { business: { ticket: { ivaPct: 10 } } };
  const sandbox = loadTpv(DB);
  const sale = {
    descuentoPct: 50, // mitad de precio
    items: [{ price: 20, qty: 1, ivaPct: 10 }],
  };
  const groups = sandbox.saleIvaGroupsForFiscal(sale);
  assert.equal(groups.length, 1);
  // bruto con descuento = 10€, base = 10/1.10 = 9.09
  assert.equal(groups[0].base, 9.09);
});

test('saleIvaGroupsForFiscal ignora líneas con importe cero o negativo', () => {
  const DB = { business: { ticket: { ivaPct: 10 } } };
  const sandbox = loadTpv(DB);
  const sale = {
    descuentoPct: 0,
    items: [
      { price: 10, qty: 1, ivaPct: 10 },
      { price: -5, qty: 1, ivaPct: 10 }, // línea corrupta/negativa: no debe colarse
      { price: 0, qty: 3, ivaPct: 10 },
    ],
  };
  const groups = sandbox.saleIvaGroupsForFiscal(sale);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].base, 9.09); // solo la línea de 10€
});

// --- decrementDishStock: raciones limitadas de un plato ---

function makeDbWithDish(stock) {
  return {
    business: {},
    cartas: [{ secciones: [{ platos: [{ id: 1, stock, disponible: true }] }] }],
  };
}

test('decrementDishStock resta raciones y no baja de 0', () => {
  const DB = makeDbWithDish(5);
  const sandbox = loadTpv(DB);
  sandbox.decrementDishStock(1, 3);
  assert.equal(DB.cartas[0].secciones[0].platos[0].stock, 2);
  sandbox.decrementDishStock(1, 10); // pide más de lo que queda
  assert.equal(DB.cartas[0].secciones[0].platos[0].stock, 0);
});

test('decrementDishStock marca "no disponible" al llegar a 0', () => {
  const DB = makeDbWithDish(2);
  const sandbox = loadTpv(DB);
  sandbox.decrementDishStock(1, 2);
  assert.equal(DB.cartas[0].secciones[0].platos[0].stock, 0);
  assert.equal(DB.cartas[0].secciones[0].platos[0].disponible, false);
});

test('decrementDishStock no toca platos sin límite de raciones (stock == null)', () => {
  const DB = makeDbWithDish(null);
  const sandbox = loadTpv(DB);
  sandbox.decrementDishStock(1, 3);
  assert.equal(DB.cartas[0].secciones[0].platos[0].stock, null);
  assert.equal(DB.cartas[0].secciones[0].platos[0].disponible, true);
});

test('decrementDishStock ignora cantidades cero, negativas o platos inexistentes', () => {
  const DB = makeDbWithDish(5);
  const sandbox = loadTpv(DB);
  sandbox.decrementDishStock(1, 0);
  sandbox.decrementDishStock(1, -2);
  sandbox.decrementDishStock(999, 3); // plato que no existe
  assert.equal(DB.cartas[0].secciones[0].platos[0].stock, 5);
});

// --- submitSaleToVerifactuApi: el total facturado debe cuadrar con las líneas ---

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${name}`);
    console.error('   ' + e.message);
  }
}

await testAsync('submitSaleToVerifactuApi: el total facturado NO incluye la propina (no se declara IVA sobre ella)', async () => {
  const DB = { business: { ticket: { ivaPct: 10 } } };
  const sandbox = loadTpv(DB);
  const sale = {
    date: '2026-08-10',
    total: 22, // 20€ de comida + 2€ de propina (finalTotal ya la incluye, como hace finalizeCharge)
    propina: 2,
    descuentoPct: 0,
    items: [{ price: 20, qty: 1, ivaPct: 10, name: 'Menú del día' }],
  };
  const cfg = { domain: 'test.invo.cash', apiKey: 'TEST' };
  let capturedBody = null;
  sandbox.fetch = async (url, opts) => {
    if (url.endsWith('/invoices')) {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ data: { items: [{ id: 1 }] } }) };
    }
    if (url.includes('/validate')) {
      return { ok: true, json: async () => ({ data: { items: [{ id: 1, invoicenumber: 'T-1' }] } }) };
    }
    if (url.includes('/downloadPdf')) {
      return { ok: true, json: async () => ({ success: true, data: '' }) };
    }
    throw new Error('unexpected fetch: ' + url);
  };
  await sandbox.submitSaleToVerifactuApi(sale, cfg, {});
  assert.ok(capturedBody, 'debería haber llamado a POST /invoices');
  const sumLines = capturedBody.lines.reduce((s, l) => s + l.total, 0);
  assert.equal(Math.round(sumLines * 100) / 100, capturedBody.total,
    'la suma de las líneas de la factura debe cuadrar exactamente con el total del documento');
  assert.equal(capturedBody.total, 20, 'el total facturado no debe incluir la propina');
});

// --- recipesUsingBaseRecipe: dependencias de recetas base en cadena (A4) ---

test('recipesUsingBaseRecipe detecta dependencias INDIRECTAS (base dentro de otra base)', () => {
  const DB = {
    recipes: [
      {id: 1, name: 'Sofrito (base)', ingredients: []},
      {id: 2, name: 'Salsa boloñesa (base)', ingredients: [{type:'base', baseRecipeId: 1, qty: 1}]},
      {id: 3, name: 'Lasaña', ingredients: [{type:'base', baseRecipeId: 2, qty: 1}]},
    ],
  };
  const sandbox = loadRecipes(DB);
  const dependents = sandbox.recipesUsingBaseRecipe(1); // borrar el Sofrito
  // Array.from (de este realm, no del sandbox vm) evita el problema de
  // comparar arrays "cross-realm" con assert.deepEqual, que node trata
  // como distintos aunque el contenido sea idéntico.
  const ids = Array.from(dependents, r => r.id).sort();
  assert.deepEqual(ids, [2, 3],
    'debe avisar tanto de la Salsa (dependencia directa) como de la Lasaña (indirecta, a través de la Salsa)');
});

test('confirmDeleteRecipe limpia las líneas baseRecipeId que quedarían huérfanas', () => {
  const DB = {
    recipes: [
      {id: 1, name: 'Sofrito (base)', ingredients: []},
      {id: 2, name: 'Salsa boloñesa (base)', ingredients: [{type:'base', baseRecipeId: 1, qty: 1}, {type:'ingredient', ingredientId: 99, qty: 2}]},
    ],
    elaboraciones: [], fichas: [], cartas: [],
  };
  const sandbox = loadRecipes(DB);
  sandbox.confirmDeleteRecipe(1); // borra el Sofrito "de todas formas"
  const salsa = DB.recipes.find(r => r.id === 2);
  assert.ok(salsa, 'la Salsa no debería borrarse, solo el Sofrito');
  assert.equal(salsa.ingredients.length, 1, 'la línea que apuntaba al Sofrito borrado debe desaparecer');
  assert.equal(salsa.ingredients[0].ingredientId, 99, 'la otra línea (un ingrediente normal) no debe tocarse');
});

console.log(`\n${failures === 0 ? '✅ Todo OK' : `❌ ${failures} test(s) fallaron`}`);
process.exit(failures === 0 ? 0 : 1);
