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

console.log(`\n${failures === 0 ? '✅ Todo OK' : `❌ ${failures} test(s) fallaron`}`);
process.exit(failures === 0 ? 0 : 1);
