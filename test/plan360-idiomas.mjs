// Plan 360º · la app del negocio en catalán e inglés no puede llevar castellano suelto (25/11, auditoría QA punto 12).
// Se recorren las pantallas y los impresos del Plan 360º con la app en `ca` y en `en` y se buscan palabras que solo existen en
// castellano. Quedan FUERA, a propósito (decisión del dueño): el texto del contrato y los tres playbooks de Recursos (texto legal y
// contenido del coach, que existen en un solo idioma) y los datos que escribe el coach (títulos de tarea, objetivos…): en la prueba
// llevan un texto neutro, así que cualquier castellano que salga es del propio programa.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360IDI01', tenantId: ggBizTenantId('P360IDI01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 1800));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, plan360:true, name:'Test Bar'});
  delete DB.business.plan360StartDate; delete DB.business.plan360Program; delete DB.business.plan360Servicio; delete DB.business.plan360Mant; delete DB.plan360Pruebas;
  ensurePlan360Program();
  DB.business.plan360Coach = {nombre:'Coach Test', dni:'00000000T', domicilio:'Test street 1', iban:'ES00 0000 0000 0000 0000 0000'};
  DB.business.plan360StartDate = addDaysStr(todayStr(), -8); DB.business.plan360WelcomeShown = true;
  const d2 = DB.business.plan360Program.find(d => d.day === 2);
  d2.objectives = [{id:'o1', titulo:'Goal A', explicacion:'x', prioridad:'prioritario', metrica:'M', valorInicial:'10', valorObjetivo:'5', fechaObjetivo:addDaysStr(todayStr(), 20), mediciones:[{fecha:todayStr(), valor:'8', nota:''}], estadoFinal:'parcial'}];
  DB.business.plan360Program.find(d => d.day === 9).tasks = [{id:901, title:'Task A', status:'pendiente', objectiveId:'o1', enlace:'escandallo', note:'n'}];
  // Meses y Día 1 con datos reales para que el marcador y el radar salgan.
  const hoy = new Date(), mes = d => { const x = new Date(hoy.getFullYear(), hoy.getMonth() + d, 1); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; };
  DB.business.plan360Kpis = {meses:{[mes(-1)]:{netas:12000, tickets:600, ticketMedio:20, foodCostPct:30, personalPct:32, resultado:1500, mermasPct:2}}, dia1:{mes:mes(-2), desde: DB.business.plan360StartDate, netas:10000, tickets:500, ticketMedio:18, foodCostPct:35, personalPct:36, resultado:900, mermasPct:4, dias:20}};
  DB.business.plan360Cierre = Object.assign(DB.business.plan360Cierre || {}, {kpis:{}, mejorasVisibles:'x', queVigilar:'y', siguienteNivel:'z'});
  DB.business.plan360Mant = {meses:{[mes(0)]:{objetivo:'Obj', semanas:{s1:{canal:'video', items:{a:{tipo:'tarea', titulo:'Item', dia:0}}}}}}};
  window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}, images: []}, focus(){}, print(){}});
});
const PANTALLAS = ['renderPlan360Grid()','renderPlan360Welcome(true)','renderPlan360Intake()','renderPlan360Questionnaire()','renderPlan360Contract()','renderPlan360LibroMarca()','renderPlan360DayDetail(1)','renderPlan360DayDetail(2)','renderPlan360PlanAccion(2)','renderPlan360Inversiones(2)','renderPlan360Objectives(2)','renderPlan360DayDetail(9)','renderPlan360DayDetail(10)','renderPlan360SummaryPage()','renderPlan360Mant()'];
// Palabras que NO existen ni en catalán ni en inglés. «programa», «una», «tu», «el»… se comparten con el catalán y no cuentan.
const CASTELLANO = /\b(tus|los|las|para|hecha|hechas|hecho|tarea|tareas|hoy|más|también|negocio|objetivo|objetivos|semana|cuestionario|firma|cuenta|aquí|esta|este|pero|cuando|donde|desde|hasta|mientras|nombre|entregado|siguiente|anterior|ninguna|todavía)\b|[ñ]|ción\b/i;
for(const lang of ['ca', 'en']){
  const textos = await page.evaluate(async (lang, pantallas) => {
    localStorage.setItem(LANG_LS, lang);
    const out = {};
    for(const c of pantallas){
      try{ eval(c); }catch(e){ out[c] = 'ERR ' + e.message; continue; }
      const cont = document.getElementById('plan360-content');
      const clon = cont.cloneNode(true);
      // el texto del contrato y los playbooks de Recursos son un solo idioma por decisión
      clon.querySelectorAll('#p360-contrato-texto, .p360-txt-box, .p360-doc-body').forEach(e => e.remove());
      out[c] = clon.innerText;
    }
    const imp = f => { window.__w = ''; f(); return window.__w.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); };
    out.informe = imp(() => plan360InformeCierre());
    out.plan = imp(() => plan360ImprimirPlan());
    out.actas = imp(() => plan360AbrirActas());
    out.semana = plan360SemanaTexto();
    out.marcador = (() => { const d = document.createElement('div'); d.innerHTML = plan360MarcadorSemanalHtml(); return d.innerText; })();
    out.menu = (() => { const d = document.createElement('div'); d.innerHTML = plan360SoloLecturaBannerHtml() + plan360PruebaHtml(5, 0, {id: 1, tienePrueba: true}); return d.innerText; })();
    localStorage.removeItem(LANG_LS);
    return out;
  }, lang, PANTALLAS);
  await caso(`La app en «${lang}» no lleva castellano suelto en el Plan 360º (${Object.keys(textos).length} pantallas e impresos)`, async () => {
    const fallos = [];
    Object.entries(textos).forEach(([pant, txt]) => {
      if(/^ERR/.test(txt)) { fallos.push(pant + ' → ' + txt); return; }
      // Líneas con castellano (se enseña la línea, no el dato)
      String(txt).split(/\n|(?<=\.)\s/).forEach(l => { const m = l.match(CASTELLANO); if(m) fallos.push(`${pant}: «${m[0]}» en «${l.trim().slice(0, 90)}»`); });
    });
    assert.deepEqual(fallos.slice(0, 40), [], fallos.length + ' hallazgos');
  });
}
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · idiomas ca/en: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
