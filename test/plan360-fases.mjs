// Plan 360 y mantenimiento, separados (6/10): el servicio activo de cada
// cliente y la agenda del coach. Funciones del panel, sin navegador.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let ok = 0, fallos = 0;
function caso(nombre, fn){
  try{ fn(); ok++; console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ' + (e.message || e)); }
}
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
const ctx = {console, Date, remoteBiz: null};
vm.createContext(ctx);
vm.runInContext([
  trozo('function kpiClaveMes', '\nfunction', ),
  trozo('function kpiNombreMes', '\nfunction'),
  trozo('function mantLunesDelMes', '\nfunction'),
  trozo('function mantFechaItem', '\nfunction'),
  trozo('const P360_FASES', 'function p360CambiarFase'),
  trozo('function p360Fecha(', 'async function renderMiSemana'),
  trozo('function stableJson', '\nfunction'),
  trozo('const MANT_NIVELES', 'function saveRemoteBiz'),
  'const MANT_CUOTA = 75;',
  'this.mantDiferencias = mantDiferencias;',
  'this.p360Fase = p360Fase; this.p360EventosDia = p360EventosDia; this.p360Fecha = p360Fecha;',
].join('\n'), ctx);
const hace = n => { const d = new Date(); d.setDate(d.getDate() - n); return ctx.p360Fecha(d); };
const hoy = ctx.p360Fecha(new Date());

caso('Día 10 del programa: Plan 360', () => assert.equal(ctx.p360Fase({plan360StartDate: hace(9)}), '360'));
caso('Acepta el mantenimiento: Mantenimiento', () => assert.equal(ctx.p360Fase({plan360StartDate: hace(30), plan360Cierre: {mantenimiento: {respuesta: 'acepta'}}}), 'mant'));
caso('Se lo piensa tras el día 28', () => assert.equal(ctx.p360Fase({plan360StartDate: hace(30), plan360Cierre: {mantenimiento: {respuesta: 'piensa'}}}), 'piensa'));
caso('Terminado sin respuesta: sin servicio', () => assert.equal(ctx.p360Fase({plan360StartDate: hace(40)}), 'fin'));
caso('«Plan 360» fijado a mano deja de valer pasados los 28 días', () => assert.equal(ctx.p360Fase({plan360StartDate: hace(40), plan360Servicio: {fase: '360', cambiado: 1}}), 'fin'));
caso('Si el negocio contesta DESPUÉS de fijarlo el coach, manda su respuesta', () =>
  assert.equal(ctx.p360Fase({plan360StartDate: hace(30), plan360Servicio: {fase: 'fin', cambiado: 1}, plan360Cierre: {mantenimiento: {respuesta: 'acepta', respondidoEn: 2}}}), 'mant'));
caso('Un día vacío en el programa no tumba la agenda', () => {
  const ev = ctx.p360EventosDia({fase: '360', hoyStr: hoy, biz: {plan360StartDate: hoy, plan360Program: [null, {day: 1, phase: 'presencial'}]}}, hoy);
  assert.ok(ev.some(e => /presencial/.test(e.t)));
});
caso('«Volver a hablar» vencido sale hoy en rojo', () => {
  const ev = ctx.p360EventosDia({fase: 'piensa', hoyStr: hoy, biz: {plan360Cierre: {mantenimiento: {respuesta: 'piensa', volverAHablarFecha: hace(5)}}}}, hoy);
  assert.ok(ev.some(e => e.alerta && /Vencido/.test(e.t)));
});
caso('Mantenimiento sin el mes preparado: aviso hoy', () => {
  const ev = ctx.p360EventosDia({fase: 'mant', hoyStr: hoy, biz: {plan360Mant: {meses: {}}}}, hoy);
  assert.ok(ev.some(e => /sin preparar/.test(e.t)));
});
caso('El coach sube solo el elemento que ha tocado: el tick del negocio no se pisa', () => {
  const antes = {meses: {'2026-10': {objetivo: 'a', semanas: {s1: {canal: 'whatsapp', items: {x: {titulo: 'X'}, y: {titulo: 'Y'}}}}}}};
  const ahora = JSON.parse(JSON.stringify(antes));
  ahora.meses['2026-10'].semanas.s1.items.x.hecho = true;
  delete ahora.meses['2026-10'].semanas.s1.items.y;
  ahora.meses['2026-10'].objetivo = 'b';
  const d = ctx.mantDiferencias(antes, ahora, 'plan360Mant');
  assert.deepEqual(Object.keys(d).sort(), ['plan360Mant/meses/2026-10/objetivo', 'plan360Mant/meses/2026-10/semanas/s1/items/x', 'plan360Mant/meses/2026-10/semanas/s1/items/y']);
  assert.equal(d['plan360Mant/meses/2026-10/semanas/s1/items/y'], null);
});
caso('Cuota sin cobrar a partir del día 5, y aviso de renovación', () => {
  const d = new Date(); d.setDate(10); const f = ctx.p360Fecha(d), clave = f.slice(0, 7);
  const ev = ctx.p360EventosDia({fase: 'mant', hoyStr: f, biz: {plan360Servicio: {fase: 'mant', mantHasta: clave}, plan360Mant: {meses: {[clave]: {semanas: {s1: {items: {}}}}}}}}, f);
  assert.ok(ev.some(e => /sin cobrar/.test(e.t)), 'falta el cobro');
  assert.ok(ev.some(e => /Renueva/.test(e.t)), 'falta la renovación');
  const ev2 = ctx.p360EventosDia({fase: 'mant', hoyStr: f, biz: {plan360Servicio: {fase: 'mant', cobros: {[clave]: {ts: 1, importe: 75}}}, plan360Mant: {meses: {[clave]: {semanas: {s1: {items: {}}}}}}}}, f);
  assert.ok(!ev2.some(e => /sin cobrar/.test(e.t)));
});
console.log('\n' + '═'.repeat(64) + '\n' + (fallos ? `❌ ${fallos} fallaron` : `✅ los ${ok} casos pasaron`));
process.exit(fallos ? 1 : 0);
