// Plan 360º · cobros del programa y CSV para el gestor (17/11). Cuentas a mano: 475 € + IVA 21 % = 574,75 €.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
const ctx = {console, remoteBiz: null, Date, Number, String, Object};
vm.createContext(ctx);
vm.runInContext([trozo('const COBROS360', 'function renderCobros360Page'), 'this.csv = cobros360CsvTexto;'].join('\n'), ctx);
let ok = 0, mal = 0;
const caso = (n, f) => { try{ f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const ts = Date.UTC(2026, 10, 3, 10), ts2 = Date.UTC(2026, 10, 18, 10);
ctx.remoteBiz = {plan360Servicio: {cobros360: {firma: {ts, importe: 475}, dia15: {ts: ts2, importe: 475}}, cobros: {'2026-12': {ts: ts2, importe: 75}}}};
const csv = ctx.csv();
caso('El CSV lleva cabecera, BOM, separador «;» y una fila por cobro (360 y mantenimiento)', () => {
  assert.ok(csv.startsWith('﻿"concepto"')); const filas = csv.split('\r\n'); assert.equal(filas.length, 4);
});
caso('475 € + IVA da 99,75 € de IVA y 574,75 € de total; el mantenimiento 75 € → 15,75 € y 90,75 €', () => {
  assert.ok(csv.includes('"Plan 360 - Al firmar";"";"2026-11-03";"475.00";"99.75";"574.75"'), csv);
  assert.ok(csv.includes('"Mantenimiento";"2026-12";"2026-11-18";"75.00";"15.75";"90.75"'), csv);
});
caso('Sin cobros solo sale la cabecera (nada inventado)', () => {
  ctx.remoteBiz = {plan360Servicio: {}}; assert.equal(ctx.csv().split('\r\n').length, 1);
});
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · cobros: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
