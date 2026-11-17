// Plan 360º · Fase 0.3: el panel del coach funde el programa con lo que hay AHORA en la nube antes de subirlo.
// Misma lógica que fusion3 de la app; aquí se prueba la copia del panel con un programa de verdad (días sin id,
// tareas con id dentro de cada día): lo que el negocio marcó mientras el coach editaba se queda.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
const ctx = {console};
vm.createContext(ctx);
vm.runInContext([trozo('function stableJson', '\nfunction'), trozo('function fusion3Panel', 'let programaBase'), 'this.F = fusion3Panel;'].join('\n'), ctx);
let ok = 0, mal = 0;
const caso = (n, f) => { try{ f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const T = (id, x = {}) => ({id, title: 'tarea ' + id, status: 'pendiente', ...x});
const dia = (n, tasks) => ({day: n, phase: 'trabajo', tasks});
const J = o => JSON.parse(JSON.stringify(o));
const eq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);   // el vm devuelve arrays de otro contexto

caso('El coach añade una tarea al día 5 mientras el negocio marca una del día 5 y otra del día 6: salen las tres cosas', () => {
  const base = [dia(5, [T('a'), T('b')]), dia(6, [T('c')])];
  const coach = J(base); coach[0].tasks.unshift(T('nueva'));                   // lo que hizo el coach
  const nube = J(base); nube[0].tasks[1].status = 'hecha'; nube[1].tasks[0].status = 'hecha';   // lo que marcó el negocio
  const r = ctx.F(base, coach, nube);
  eq(r[0].tasks.map(t => t.id).sort(), ['a', 'b', 'nueva']);
  assert.equal(r[0].tasks.find(t => t.id === 'b').status, 'hecha'); assert.equal(r[1].tasks[0].status, 'hecha');
  assert.ok(r[0].tasks.some(t => t.id === 'nueva'));
});
caso('El coach borra una tarea y el negocio marca la de al lado: la borrada no vuelve', () => {
  const base = [dia(5, [T('a'), T('b'), T('c')])];
  const coach = J(base); coach[0].tasks.splice(0, 1);
  const nube = J(base); nube[0].tasks[2].status = 'hecha';
  const r = ctx.F(base, coach, nube);
  eq(r[0].tasks.map(t => t.id).sort(), ['b', 'c']); assert.equal(r[0].tasks.find(t => t.id === 'c').status, 'hecha');
});
caso('Sin cambios ajenos, lo del coach se sube tal cual', () => {
  const base = [dia(5, [T('a')])];
  const coach = J(base); coach[0].tasks[0].title = 'nuevo título';
  eq(ctx.F(base, coach, J(base)), coach);
});
caso('El negocio cambió la nota de la tarea y el coach su título: entran los dos campos', () => {
  const base = [dia(5, [T('a', {note: ''})])];
  const coach = J(base); coach[0].tasks[0].title = 'título del coach';
  const nube = J(base); nube[0].tasks[0].note = 'nota del negocio';
  const r = ctx.F(base, coach, nube);
  assert.equal(r[0].tasks[0].title, 'título del coach'); assert.equal(r[0].tasks[0].note, 'nota del negocio');
});
caso('Objetivos e inversiones del día 2 también por id', () => {
  const base = [{day: 2, objectives: [{id: 'o1', titulo: 'A'}, {id: 'o2', titulo: 'B'}], inversiones: [{id: 7, nombre: 'Horno', coste: 100}]}];
  const coach = J(base); coach[0].objectives.splice(0, 1);                        // el coach quita el primero
  const nube = J(base); nube[0].objectives[1].titulo = 'B (negocio)'; nube[0].inversiones[0].coste = 120;
  const r = ctx.F(base, coach, nube);
  eq(r[0].objectives.map(o => o.id), ['o2']); assert.equal(r[0].objectives[0].titulo, 'B (negocio)'); assert.equal(r[0].inversiones[0].coste, 120);
});
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · fusión del panel: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
