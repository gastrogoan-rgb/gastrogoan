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
  const sandbox = { DB, t: (k) => k, window: undefined, console, saveDB: () => {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/tpv.js' });
  return sandbox;
}

const opsSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'operations.js'), 'utf8');
function loadOps(DB){
  const sandbox = { DB, t: (k) => k, window: undefined, console, saveDB: () => {}, todayStr: () => '2026-09-04' };
  vm.createContext(sandbox);
  vm.runInContext(opsSource, sandbox, { filename: 'js/operations.js' });
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

/* --- Lo mismo para un MENÚ entero ("hoy solo hay 20 menús del día") ---
   Faltaba: solo se podían limitar raciones de un plato suelto, y el menú es
   justo lo que se agota antes. Lo vio el dueño en la pantalla de Menús, donde
   no había ni el botón de disponible ni el de raciones. */
function makeDbWithMenu(stock) {
  return { business: {}, cartas: [], menus: [{ id: 7, stock, disponible: true }] };
}

// Una ración de menú son VARIAS líneas (entrante, segundo, postre) con el
// mismo menuId y el mismo menuInstanceId.
function comandaConMenu(nGrupos){
  const items = [];
  for(let i = 0; i < nGrupos; i++){
    items.push({lineId: 'l'+i, menuId: 7, menuInstanceId: 'inst1', qty: 1, name: 'Plato '+i});
  }
  return {id: 1, items};
}

test('UN menú de tres platos descuenta UNA ración, no tres', () => {
  /* ⚠️ El fallo real: se descontaba línea a línea, así que un menú de tres
     platos gastaba tres raciones. Con 20 puestas, el menú se marcaba agotado
     a los 7 vendidos y con 13 por vender, en pleno mediodía. */
  const DB = makeDbWithMenu(20);
  const sandbox = loadTpv(DB);
  const order = comandaConMenu(3);
  order.items.forEach(l => sandbox.decrementMenuStock(order, l, 1));
  assert.equal(DB.menus[0].stock, 19, 'un menú vendido = una ración menos');
});

test('decrementMenuStock resta raciones del menú y no baja de 0', () => {
  const DB = makeDbWithMenu(20);
  const sandbox = loadTpv(DB);
  const order = comandaConMenu(1);
  sandbox.decrementMenuStock(order, order.items[0], 3);
  assert.equal(DB.menus[0].stock, 17);
  sandbox.decrementMenuStock(order, order.items[0], 50);
  assert.equal(DB.menus[0].stock, 0);
});

test('un menú agotado se marca "no disponible" solo', () => {
  const DB = makeDbWithMenu(2);
  const sandbox = loadTpv(DB);
  const order = comandaConMenu(1);
  sandbox.decrementMenuStock(order, order.items[0], 2);
  assert.equal(DB.menus[0].disponible, false,
    'al llegar a 0 tiene que desaparecer del TPV y de la web pública, que filtran por disponible');
});

test('decrementMenuStock no toca los menús sin límite (lo normal)', () => {
  const DB = makeDbWithMenu(null);
  const sandbox = loadTpv(DB);
  const order = comandaConMenu(1);
  sandbox.decrementMenuStock(order, order.items[0], 3);
  assert.equal(DB.menus[0].stock, null);
  assert.equal(DB.menus[0].disponible, true);
});

/* Las raciones de CADA PLATO del menú. Es donde está el límite real de una
   cocina: se compran 8 merluzas, no 20 menús. Al acabarse la merluza el menú
   se sigue vendiendo con las demás opciones. */
function dbConOpcionesDeMenu(stockMerluza){
  return {business: {}, cartas: [], menus: [{
    id: 7, disponible: true,
    grupos: [{id: 20, nombre: 'Segundo', opciones: [
      {id: 30, nombre: 'Merluza', stock: stockMerluza, disponible: true},
      {id: 31, nombre: 'Pollo', disponible: true},
    ]}],
  }]};
}
function lineaDeOpcion(){
  return {lineId: 'l1', menuId: 7, grupoId: 20, opcionId: 30, menuInstanceId: 'i1', qty: 1};
}

/* --- Pedidos programados para más adelante: no hoy, no ahora --- */

function fechaEnHoras(h){
  const d = new Date(Date.now() + h * 3600000);
  return {date: d.toISOString().slice(0,10), time: d.toISOString().slice(11,16)};
}

test('esPedidoProgramadoLejano: un pedido para dentro de dos semanas SÍ lo es', () => {
  /* El bug real: se aceptaba un pedido a domicilio para dentro de dos
     semanas y aparecía YA en Cocina y en Control de repartos, con un
     repartidor asignado en el acto. */
  const sandbox = loadTpv({});
  const lejos = fechaEnHoras(24 * 14);
  assert.equal(sandbox.esPedidoProgramadoLejano({date: lejos.date, time: lejos.time}), true);
});

test('esPedidoProgramadoLejano: uno para dentro de 20 minutos NO lo es', () => {
  const sandbox = loadTpv({});
  const pronto = fechaEnHoras(0.33);
  assert.equal(sandbox.esPedidoProgramadoLejano({date: pronto.date, time: pronto.time}), false);
});

test('esPedidoProgramadoLejano: sin fecha/hora (mesa normal) no cuenta como lejano', () => {
  const sandbox = loadTpv({});
  assert.equal(sandbox.esPedidoProgramadoLejano({}), false);
});

/* --- Una venta que llega tarde no se pierde entre dos cierres de caja --- */

test('getSalesForClosure: una venta ya asignada a un cierre no vuelve a salir', () => {
  const DB = {business: {}, sales: [
    {id: 1, date: '2026-09-04', status: 'pagada', total: 10, cierreId: 'c1'},
    {id: 2, date: '2026-09-04', status: 'pagada', total: 20},   // sin cierre: pendiente
  ]};
  const sandbox = loadOps(DB);
  const pendientes = sandbox.getSalesForClosure();
  assert.equal(pendientes.length, 1);
  assert.equal(pendientes[0].id, 2);
});

test('getSalesForClosure: una venta sincronizada TARDE entra en el próximo cierre, no se pierde', () => {
  /* El fallo real: con una ventana de tiempo, una venta cobrada offline a
     las 14:00 pero sincronizada a las 15:10, con un cierre hecho a las
     15:00, no entraba en ESE cierre (no existía aún) ni en el SIGUIENTE (su
     hora ya no es "posterior" al nuevo desde) — se perdía para siempre. */
  const DB = {business: {}, sales: [
    {id: 3, date: '2026-09-04', status: 'pagada', total: 45, createdAt: '2026-09-04T14:00:00.000Z'},
  ]};
  const sandbox = loadOps(DB);
  const pendientes = sandbox.getSalesForClosure();
  assert.equal(pendientes.length, 1, 'entra en el próximo cierre sin importar su hora exacta');
  assert.equal(pendientes[0].id, 3);
});

test('getSalesForClosure: una venta anulada nunca entra', () => {
  const DB = {business: {}, sales: [{id: 4, date: '2026-09-04', status: 'anulada', total: 10}]};
  const sandbox = loadOps(DB);
  assert.equal(sandbox.getSalesForClosure().length, 0);
});

/* --- La propina no cuenta para la comisión de la plataforma --- */

test('applyDeliveryCommission NO cobra comisión sobre la propina', () => {
  /* La comisión de Glovo/Uber Eats es sobre la comanda, nunca sobre la
     propina — es dinero del repartidor o del negocio, no facturación suya. */
  const DB = {business: {deliveryPlatforms: [{id: 9, nombre: 'Glovo', comisionPct: 20, ivaPct: 21, comisionSobreEnvio: true}]}};
  const sandbox = loadTpv(DB);
  const order = {tipo: 'delivery', plataformaId: 9, costeEnvio: 0};
  const sale = {total: 22, propina: 2};   // 20€ de comida + 2€ propina
  sandbox.applyDeliveryCommission(order, sale);
  // 20% + 21% IVA sobre 20€ (sin la propina) = 4.84€
  assert.equal(sale.comisionPlataforma, 4.84);
});

/* --- Un pedido online: estático de verdad --- */

test('esPedidoSoloLectura: online (origenOnline o clientRef) es de solo lectura', () => {
  const sandbox = loadTpv({});
  assert.equal(sandbox.esPedidoSoloLectura({origenOnline: true}), true);
  assert.equal(sandbox.esPedidoSoloLectura({clientRef: 'abc'}), true);
  assert.equal(sandbox.esPedidoSoloLectura({}), false, 'una mesa normal no es de solo lectura');
});

function pedidoOnlineConLinea(){
  return {id: 1, origenOnline: true, tandas: [],
    items: [{lineId: 'l1', name: 'Plato', qty: 1, price: 10, estado: 'cocina', marchada: 1}]};
}

test('Un pedido online no deja cambiar la cantidad ni borrar la línea', () => {
  /* Se podía tocar +/-, notas, marchar y borrar sueltos en la fila, aunque el
     selector de platos ya estuviera bloqueado — el dueño lo pilló probando:
     "sigue dejando editar cosas como poner más o menos platos". */
  const DB = {business: {}, tpvOrders: [pedidoOnlineConLinea()]};
  const sandbox = loadTpv(DB);
  const antes = JSON.stringify(DB.tpvOrders[0].items);
  sandbox.changeOrderItemQty(1, 0, 1);
  sandbox.removeOrderItem(1, 0);
  assert.equal(JSON.stringify(DB.tpvOrders[0].items), antes, 'el pedido online no cambió nada');
});

test('Una mesa normal SÍ deja cambiar la cantidad (no se rompe lo de siempre)', () => {
  const DB = {business: {}, employees: [], tables: [], tpvOrders: [{id: 2, tandas: [],
    items: [{lineId: 'l1', name: 'Plato', qty: 1, price: 10}]}]};
  const sandbox = loadTpv(DB);
  // El render final es cosa del DOM, no de esta prueba: se sustituye por un
  // stub para comprobar solo el cambio de datos.
  sandbox.renderTableOrderModal = () => {};
  sandbox.changeOrderItemQty(2, 0, 1);
  assert.equal(DB.tpvOrders[0].items[0].qty, 2);
});

test('Se agota la MERLUZA, no el menú entero', () => {
  const DB = dbConOpcionesDeMenu(2);
  const sandbox = loadTpv(DB);
  const linea = lineaDeOpcion();
  sandbox.decrementMenuOptionStock(linea, 2);
  const merluza = DB.menus[0].grupos[0].opciones[0];
  assert.equal(merluza.stock, 0);
  assert.equal(merluza.disponible, false, 'la opción agotada deja de ofrecerse');
  assert.equal(DB.menus[0].disponible, true, 'pero el menú se sigue vendiendo con las demás opciones');
  assert.equal(DB.menus[0].grupos[0].opciones[1].disponible, true, 'y el pollo no se toca');
});

test('Al anular se devuelve la ración de la opción y vuelve a ofrecerse', () => {
  const DB = dbConOpcionesDeMenu(0);
  DB.menus[0].grupos[0].opciones[0].disponible = false;
  const sandbox = loadTpv(DB);
  sandbox.restockForVoidedItems([lineaDeOpcion()], {includeIngredients: false});
  const merluza = DB.menus[0].grupos[0].opciones[0];
  assert.equal(merluza.stock, 1);
  assert.equal(merluza.disponible, true, 'al devolver una ración, vuelve a estar disponible');
});

test('Una opción sin límite de raciones no se toca (lo normal)', () => {
  const DB = dbConOpcionesDeMenu(null);
  const sandbox = loadTpv(DB);
  sandbox.decrementMenuOptionStock(lineaDeOpcion(), 3);
  assert.equal(DB.menus[0].grupos[0].opciones[0].stock, null);
  assert.equal(DB.menus[0].grupos[0].opciones[0].disponible, true);
});

test('Al anular, un menú de tres platos devuelve UNA ración, no tres', () => {
  const DB = makeDbWithMenu(19);
  const sandbox = loadTpv(DB);
  const order = comandaConMenu(3);
  sandbox.restockForVoidedItems(order.items, {includeIngredients: false});
  assert.equal(DB.menus[0].stock, 20, 'devolver línea a línea inflaba el contador');
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

// --- recipeFoodCostPct: el food cost se mide sobre la venta SIN IVA (B7) ---

test('recipeFoodCostPct usa el precio SIN IVA (priceBase), no el precio con IVA', () => {
  const DB = {
    ingredients: [{id: 1, price: 3}], // 3€/kg o unidad, según receta
    recipes: [],
  };
  const sandbox = loadRecipes(DB);
  sandbox.getIngredient = id => DB.ingredients.find(i => i.id === id);
  // Receta con coste de ingredientes = 3€, precio de venta 21% IVA: base 10€, con IVA 12,10€.
  const r = {price: 12.10, priceBase: 10, ivaPct: 21, ingredients: [{type:'ingredient', ingredientId: 1, qty: 1, merma: 0}]};
  const pct = sandbox.recipeFoodCostPct(r);
  assert.equal(Math.round(pct * 10) / 10, 30, 'food cost = coste/precio SIN IVA = 3/10 = 30%, no 3/12.10 ≈ 24.8%');
});

test('recipeFoodCostPct deriva el precio sin IVA de ivaPct si falta priceBase (recetas antiguas)', () => {
  const DB = {
    ingredients: [{id: 1, price: 3}],
    recipes: [],
  };
  const sandbox = loadRecipes(DB);
  sandbox.getIngredient = id => DB.ingredients.find(i => i.id === id);
  const r = {price: 12.10, ivaPct: 21, ingredients: [{type:'ingredient', ingredientId: 1, qty: 1, merma: 0}]};
  const pct = sandbox.recipeFoodCostPct(r);
  assert.equal(Math.round(pct * 10) / 10, 30, 'sin priceBase guardado, debe derivar el neto con ivaPct: 12.10/1.21=10');
});

console.log(`\n${failures === 0 ? '✅ Todo OK' : `❌ ${failures} test(s) fallaron`}`);
process.exit(failures === 0 ? 0 : 1);
