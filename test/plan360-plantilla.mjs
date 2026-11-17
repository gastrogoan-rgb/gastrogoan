// Plan 360º · plantilla del programa (17/11): guardar las tareas de un plan y aplicarlas a otro sin pisar nada.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
let n = 500;
const ctx = {console, plan360GenId: () => ++n, JSON, Object, Array, String};
vm.createContext(ctx);
vm.runInContext([trozo('function plantillaDesdePrograma', 'function plantillaRef'), 'this.D = plantillaDesdePrograma; this.A = plantillaAplicar;'].join('\n'), ctx);
let ok = 0, mal = 0;
const caso = (nom, f) => { try{ f(); console.log('✅ ' + nom); ok++; }catch(e){ console.log('❌ ' + nom + '\n     ⤷ ' + e.message); mal++; } };
const J = o => JSON.parse(JSON.stringify(o));
const origen = [
  {day: 2, phase: 'presencial', objectives: [{id: 1, titulo: 'X'}]},
  {day: 5, phase: 'trabajo', tasks: [{id: 1, title: 'Pesar al recibir', description: 'd1', status: 'hecha', note: 'nota privada', fileData: 'DATA', fileName: 'f.pdf', enlace: 'stock'}, {id: 2, title: '  ', status: 'pendiente'}]},
  {day: 6, phase: 'trabajo', tasks: [{id: 3, title: 'Ficha del arroz', status: 'pendiente'}]},
];
const tpl = ctx.D(origen);
caso('La plantilla guarda título, descripción y «Se hace en…», pero NUNCA estado, notas ni archivos del cliente de origen', () => {
  const t = Object.values(tpl); assert.equal(t.length, 2);
  const s = JSON.stringify(tpl); assert.ok(!/nota privada|DATA|f\.pdf|hecha/.test(s), s);
  assert.equal(t[0].enlace, 'stock'); assert.equal(t[0].day, 5);
});
caso('Las tareas sin título no entran en la plantilla', () => assert.ok(!JSON.stringify(tpl).includes('"title":""')));
caso('Aplicarla a otro cliente añade las tareas en su día, nuevas y pendientes', () => {
  const dest = [{day: 5, phase: 'trabajo', tasks: []}, {day: 6, phase: 'trabajo'}];
  const k = ctx.A(dest, tpl); assert.equal(k, 2);
  assert.equal(dest[0].tasks[0].title, 'Pesar al recibir'); assert.equal(dest[0].tasks[0].status, 'pendiente'); assert.equal(dest[0].tasks[0].note, ''); assert.equal(dest[0].tasks[0].enlace, 'stock');
  assert.equal(dest[1].tasks.length, 1);
});
caso('Aplicarla dos veces, o a un plan que ya tiene esa tarea (aunque cambie mayúsculas), no duplica nada ni pisa lo existente', () => {
  const dest = [{day: 5, phase: 'trabajo', tasks: [{id: 9, title: 'PESAR AL RECIBIR', status: 'hecha'}]}, {day: 6, phase: 'trabajo', tasks: []}];
  assert.equal(ctx.A(dest, tpl), 1); assert.equal(ctx.A(dest, tpl), 0);
  assert.equal(dest[0].tasks.length, 1); assert.equal(dest[0].tasks[0].status, 'hecha');
});
caso('Una tarea de un día que el destino no tiene se ignora sin romper', () => assert.equal(ctx.A([{day: 7, phase: 'trabajo', tasks: []}], tpl), 0));
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · plantilla del programa: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
