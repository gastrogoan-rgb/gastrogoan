// Plan 360º · plantilla BASE de GastroGoan (25/11): el programa nacía con 26 días vacíos y la plantilla propia del
// coach, sin nada. La base reparte las tareas por los días LABORABLES (lun-vie) de los días 3-28, cada una con su
// «Ir a…» válido, su porqué y su criterio de hecho, y aplicarla dos veces no duplica nada.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
const ctx = {console};
vm.createContext(ctx);
vm.runInContext([
  trozo('function plan360GenId', '\nfunction'),
  trozo('const PLAN360_ENLACES_PANEL', '\nfunction'),
  trozo('const PLAN360_PLANTILLA_BASE', 'function plantillaDesdePrograma'),
  trozo('function plantillaAplicar', 'function plantillaRef'),
  'this.BASE = PLAN360_PLANTILLA_BASE; this.ENL = PLAN360_ENLACES_PANEL; this.paraPrograma = plantillaBaseParaPrograma; this.aplicar = plantillaAplicar;',
].join('\n'), ctx);
let ok = 0, mal = 0;
const caso = (n, f) => { try{ f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const programa = () => [{day: 1, phase: 'presencial'}, {day: 2, phase: 'presencial'}, ...Array.from({length: 26}, (_, i) => ({day: i + 3, phase: 'trabajo', tasks: []}))];
const dow = (inicio, dia) => { const [y, m, d] = inicio.split('-').map(Number); return new Date(y, m - 1, d + dia - 1).getDay(); };

caso('Hay una base con tareas de verdad: título, porqué/cómo/hecho cuando y enlace válido', () => {
  assert.ok(ctx.BASE.length >= 30, 'pocas tareas: ' + ctx.BASE.length);
  ctx.BASE.forEach(x => {
    assert.ok(x.t && x.t.length > 10 && x.t.length <= 140, 'título raro: ' + x.t);
    assert.match(x.d, /Por qué:/, x.t); assert.match(x.d, /Cómo:/, x.t); assert.match(x.d, /Hecho cuando:/, x.t);
    assert.ok(ctx.ENL[x.e], 'enlace inexistente «' + x.e + '» en ' + x.t);
    assert.ok(!/pendiente de definir|lorem/i.test(x.t + x.d) && !/TODO/.test(x.t + x.d), x.t);
  });
  assert.equal(new Set(ctx.BASE.map(x => x.t)).size, ctx.BASE.length, 'títulos repetidos');
});
for(const inicio of ['2026-11-16', '2026-11-17', '2026-11-21', '2026-11-22']){   // lunes, martes, sábado, domingo
  caso('Empezando el ' + inicio + ': ninguna tarea cae en sábado o domingo y están repartidas en todo el programa', () => {
    const prog = programa(); const tpl = ctx.paraPrograma(prog, inicio);
    const dias = Object.values(tpl).map(t => t.day);
    dias.forEach(d => assert.ok(![0, 6].includes(dow(inicio, d)), 'día ' + d + ' cae en fin de semana'));
    assert.ok(Math.min(...dias) <= 6, 'no arranca pronto'); assert.ok(Math.max(...dias) >= 24, 'no llega al final');
    const porDia = {}; dias.forEach(d => porDia[d] = (porDia[d] || 0) + 1);
    assert.ok(Math.max(...Object.values(porDia)) <= 3, 'un día sobrecargado: ' + JSON.stringify(porDia));
  });
}
caso('Aplicarla añade las tareas con id y enlace, y aplicarla otra vez no duplica', () => {
  const prog = programa(); const tpl = ctx.paraPrograma(prog, '2026-11-16');
  const n1 = ctx.aplicar(prog, tpl); const n2 = ctx.aplicar(prog, tpl);
  assert.equal(n1, ctx.BASE.length); assert.equal(n2, 0);
  const todas = prog.flatMap(d => d.tasks || []);
  assert.equal(todas.length, ctx.BASE.length); assert.ok(todas.every(t => t.id && t.enlace && t.status === 'pendiente'));
});
caso('No pisa lo que el coach ya había puesto', () => {
  const prog = programa(); prog[5].tasks.push({id: 1, title: 'Mi tarea propia', status: 'hecha'});
  ctx.aplicar(prog, ctx.paraPrograma(prog, '2026-11-16'));
  assert.ok(prog[5].tasks.some(t => t.id === 1 && t.status === 'hecha'));
});
console.log('\n' + '═'.repeat(64)); console.log(mal ? `❌ ${mal} de ${ok + mal} fallaron` : `✅ los ${ok} casos pasaron`);
process.exit(mal ? 1 : 0);
