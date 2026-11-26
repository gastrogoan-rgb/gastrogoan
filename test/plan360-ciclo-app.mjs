// Plan 360º · CICLO COMPLETO en la app del negocio (26/11): un cliente nuevo recorre todo el servicio (alta, programa de 28 días con la
// plantilla base, tareas marcadas, objetivos, cierre, mantenimiento, solo lectura) y en CADA etapa se mide, en 320/360/390 px y en es/ca/en:
// que ninguna pantalla se salga por los lados, que no haya texto de relleno, claves sin traducir, «undefined»/«NaN» ni llaves {{…}} y que
// no haya errores de JavaScript. Los fallos se acumulan y se cuentan al final (no se corta al primero).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const fallos = [];
let ok = 0;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width: 390, height: 800});
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360CIC01', tenantId: ggBizTenantId('P360CIC01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 1800));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, plan360:true, name:'Casa Paco de la Montaña Alta'});
  ['plan360StartDate','plan360Program','plan360Servicio','plan360Mant','plan360Kpis','plan360Cierre','plan360Contract'].forEach(k => delete DB.business[k]);
  delete DB.plan360Pruebas;
  ensurePlan360Program();
  DB.business.plan360Coach = {nombre:'Coach de Prueba', dni:'00000000T', domicilio:'Calle Falsa 1', iban:'ES00 0000 0000 0000 0000 0000'};
  DB.business.plan360WelcomeShown = true;
  window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}, images: []}, focus(){}, print(){}});
});
const PANTALLAS = ['renderPlan360Grid()','renderPlan360Welcome(true)','renderPlan360Intake()','renderPlan360Questionnaire()','renderPlan360Contract()','renderPlan360LibroMarca()','renderPlan360DayDetail(1)','renderPlan360DayDetail(2)','renderPlan360PlanAccion(2)','renderPlan360Inversiones(2)','renderPlan360Objectives(2)','renderPlan360DayDetail(3)','renderPlan360DayDetail(9)','renderPlan360DayDetail(15)','renderPlan360DayDetail(28)','renderPlan360SummaryPage()','renderPlan360Mant()'];
const PROHIBIDO = [/pendiente de definir/i, /\bundefined\b/, /\bNaN\b/, /\[object /, /\{\{[a-zA-Z]+\}\}/, /\bplan360\.[a-zA-Z]+\b/, /\bnull\b/];
async function medir(etapa, ancho, lang){
  await page.setViewport({width: ancho, height: 800});
  const r = await page.evaluate(async (lang, pantallas) => {
    localStorage.setItem(LANG_LS, lang === 'es' ? '' : lang);
    if(lang === 'es') localStorage.removeItem(LANG_LS);
    const out = [];
    for(const c of pantallas){
      try{ eval(c); }catch(e){ out.push({c, err: e.message}); continue; }
      await new Promise(r => setTimeout(r, 40));
      const cont = document.getElementById('plan360-content') || document.getElementById('content');
      const sw = Math.max(cont.scrollWidth, document.documentElement.scrollWidth);
      // Cualquier elemento que sobresalga por la IZQUIERDA o más allá del ancho (salvo dentro de un scroll propio).
      let desborde = null;
      for(const el of cont.querySelectorAll('*')){
        const b = el.getBoundingClientRect(); if(!b.width) continue;
        if(b.left < -1 || b.right > innerWidth + 1){
          let p = el, enScroll = false;
          while(p && p !== cont){ const o = getComputedStyle(p).overflowX; if(o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip'){ enScroll = true; break; } p = p.parentElement; }
          if(!enScroll){ desborde = (el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right); break; }
        }
      }
      const clon = cont.cloneNode(true);
      clon.querySelectorAll('#p360-contrato-texto, .p360-txt-box, .p360-doc-body, script, style').forEach(e => e.remove());
      out.push({c, sw, iw: innerWidth, desborde, texto: clon.innerText});
    }
    return out;
  }, lang, PANTALLAS);
  for(const x of r){
    const id = `[${etapa} · ${ancho}px · ${lang}] ${x.c}`;
    if(x.err){ fallos.push(id + ' → error al pintar: ' + x.err); continue; }
    if(x.desborde) fallos.push(id + ' → se sale por los lados: ' + x.desborde);
    else if(x.sw > x.iw + 1) fallos.push(id + ` → scroll horizontal (${x.sw} > ${x.iw})`);
    for(const re of PROHIBIDO) if(re.test(x.texto)) fallos.push(id + ' → texto prohibido ' + re + ': «' + (x.texto.match(re) || [''])[0] + '»');
    ok++;
  }
}
const ETAPAS = {
  'alta (día 1)': async () => page.evaluate(() => {
    DB.business.plan360StartDate = todayStr();
    const d = DB.business.plan360Program.find(d => d.day === 9); d.tasks = [];
  }),
  'en marcha (día 10, tareas)': async () => page.evaluate(() => {
    DB.business.plan360StartDate = addDaysStr(todayStr(), -9);
    const P = DB.business.plan360Program;
    P.find(d => d.day === 2).objectives = [{id:'oc1', titulo:'Bajar el food cost del 34 % al 30 % en tres meses sin tocar la calidad de ningún plato de la carta', explicacion:'Revisar escandallos', prioridad:'prioritario', metrica:'Food cost', valorInicial:'34', valorObjetivo:'30', fechaObjetivo:addDaysStr(todayStr(), 40), mediciones:[]}];
    // Tareas reales largas (nombre de 80 letras) en varios días, algunas hechas, otras atrasadas con nota.
    [3,5,9,10,12,15,28].forEach((n, k) => { P.find(d => d.day === n).tasks = [
      {id: 1000 + k*10 + 1, title:'Escandallar los diez platos que más se venden y revisar el precio de compra de cada ingrediente', description:'Por qué: es lo que mueve tu margen. Cómo: en Escandallo. Hecho cuando: los diez tienen coste.', status: k % 2 ? 'hecha' : 'pendiente', note: k === 2 ? 'No me dio tiempo' : '', objectiveId:'oc1', enlace:'escandallo'},
      {id: 1000 + k*10 + 2, title:'(Contenido pendiente de definir)', status:'pendiente', note:''},
      {id: 1000 + k*10 + 3, title:'Revisar la limpieza de la campana extractora', description:'(Contenido pendiente de definir)', status:'pendiente', note:''}];
    });
  }),
  'cierre (día 28, números)': async () => page.evaluate(() => {
    DB.business.plan360StartDate = addDaysStr(todayStr(), -27);
    const mes = d => { const x = new Date(new Date().getFullYear(), new Date().getMonth() + d, 1); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; };
    DB.business.plan360Kpis = {meses:{[mes(-1)]:{netas:12000, tickets:600, ticketMedio:20, foodCostPct:30, personalPct:32, resultado:1500, mermasPct:2}}, dia1:{mes:mes(-2), desde: DB.business.plan360StartDate, netas:10000, tickets:500, ticketMedio:18, foodCostPct:35, personalPct:36, resultado:900, mermasPct:4, dias:20}, ts: Date.now()};
    DB.business.plan360Cierre = Object.assign(DB.business.plan360Cierre || {}, {kpis:{}, mejorasVisibles:'Menos mermas y platos con precio revisado', queVigilar:'Precio del aceite', siguienteNivel:'Abrir la terraza'});
  }),
  'mantenimiento': async () => page.evaluate(() => {
    const mes = new Date(); const k = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,'0')}`;
    DB.business.plan360Servicio = {fase:'mant', mantDesde:k, cuota:75, cobros:{[k]:{ts:Date.now(), importe:75}}};
    DB.business.plan360Mant = {meses:{[k]:{objetivo:'Bajar mermas al 2 %', semanas:{s1:{canal:'whatsapp', items:{a:{tipo:'tarea', titulo:'Revisar el escandallo de las cinco especialidades de la carta de temporada', dia:0, estado:''}, b:{tipo:'entrega', titulo:'Reporte de la semana', dia:1}}}, s2:{canal:'video', items:{c:{tipo:'tarea', titulo:'Pedir reseña', dia:0}}}}}}};
  }),
  'terminado (solo lectura)': async () => page.evaluate(() => { DB.business.plan360Servicio = Object.assign({}, DB.business.plan360Servicio, {fase:'fin'}); }),
};
const ANCHOS = [320, 360, 390], IDIOMAS = ['es','ca','en'];
for(const [etapa, prep] of Object.entries(ETAPAS)){
  await prep();
  for(const a of ANCHOS) for(const l of IDIOMAS) await medir(etapa, a, l);
}
// Funcional: en la etapa «en marcha» el relleno no se cuenta ni se pinta, y en solo lectura no se deja marcar.
const f = await page.evaluate(() => {
  localStorage.removeItem(LANG_LS);
  const P = DB.business.plan360Program;
  const reales = P.reduce((n, d) => n + plan360TareasReales(d).length, 0);
  const relleno = P.reduce((n, d) => n + (d.tasks || []).filter(t => !plan360TareaReal(t)).length, 0);
  const lectura = plan360SoloLectura();
  let antes = null, despues = null;
  const d = P.find(d => d.day === 3); antes = d.tasks[0].status;
  try{ plan360SetTaskEstado(3, 0, antes === 'hecha' ? 'pendiente' : 'hecha', d.tasks[0].id); }catch(e){}
  despues = P.find(d => d.day === 3).tasks[0].status;
  return {reales, relleno, lectura, antes, despues};
});
if(!f.lectura) fallos.push('solo lectura: plan360SoloLectura() debería ser true con fase fin');
if(f.antes !== f.despues) fallos.push(`solo lectura: marcar una tarea la cambió (${f.antes} → ${f.despues})`);
if(f.relleno < 1) fallos.push('prueba mal montada: no hay tareas de relleno que comprobar');
if(errs.length) fallos.push('errores de JavaScript: ' + [...new Set(errs)].slice(0,5).join(' | '));
await browser.close();
console.log(`${ok} pantallas medidas (5 etapas × 3 anchos × 3 idiomas × ${PANTALLAS.length})`);
if(fallos.length){ console.log('❌ ' + fallos.length + ' fallo(s):'); [...new Set(fallos)].slice(0, 80).forEach(x => console.log('  · ' + x)); process.exit(1); }
console.log('✅ Plan 360 · ciclo completo de la app: sin desbordes, sin relleno, sin claves ni errores');
