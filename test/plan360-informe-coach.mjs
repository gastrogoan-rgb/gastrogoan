// Plan 360º · informe semanal para el coach (17/11): texto con hechas / sin hacer, área y objetivos.
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const src = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const trozo = (ini, fin) => { const i = src.indexOf(ini), j = src.indexOf(fin, i); assert.ok(i >= 0 && j > i, 'no encuentro ' + ini); return src.slice(i, j); };
const hoy = new Date(); const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ctx = {console};
vm.createContext(ctx);
vm.runInContext(trozo('function todayStr()', 'function plan360DateForDay') + trozo('function plan360DateForDay', '\n}\n') + '\n}\n' + trozo('const INFORME_AREA_ENLACE', 'function renderInformeSemanaPage'), ctx);
let ok = 0, mal = 0;
const caso = async (n, f) => { try { await f(); ok++; console.log('✅ ' + n); } catch (e) { mal++; console.log('❌ ' + n + '\n   ' + e.message); } };
// Día 1 = hoy: el día 3 (trabajo) cae dos días después; si es fin de semana puede salir de la semana, así que se ancla en el lunes.
const dow = (hoy.getDay() + 6) % 7; const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - dow);
vm.runInContext(`var remoteBiz = {name:'Casa Paco', plan360StartDate:'${iso(lunes)}', plan360Program:[
 {day:1, phase:'presencial'}, {day:2, phase:'presencial', objectives:[{titulo:'Bajar el food cost', mediciones:[{valor:'33 %'},{valor:'31 %'}]},{titulo:'Más reservas'}]},
 {day:3, phase:'trabajo', tasks:[{id:1, title:'Revisar escandallos', status:'hecha', enlace:'escandallo'},{id:2, title:'Cuadrar caja', status:'pendiente', enlace:'economia', note:'falta el domingo'},{id:3, title:'Sin enlace', status:'no_hecha'}]}]};`, ctx);
const t = vm.runInContext('informeSemanaCoachTexto()', ctx);
await caso('Cuenta las tareas de la semana y separa hechas de sin hacer', async () => { assert.ok(/1 de 3 hechas/.test(t)); assert.ok(/Hechas\n• Revisar escandallos \(Cocina\)/.test(t)); assert.ok(/Sin hacer/.test(t)); });
await caso('Cada tarea con enlace dice su área; la nota del cliente viaja; sin enlace no se inventa área', async () => {
  assert.ok(/Cuadrar caja \(Gestión\) — falta el domingo/.test(t)); assert.ok(/• Sin enlace(\n|$)/.test(t));
});
await caso('Objetivos con su última medición, o «sin medir»', async () => { assert.ok(/Bajar el food cost: 31 %/.test(t)); assert.ok(/Más reservas \(sin medir\)/.test(t)); });
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · informe del coach: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
