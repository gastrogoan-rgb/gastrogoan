// Fallo real encontrado (10/09) al revisar Punto de Equilibrio: cuando
// llegaba una sincronización de la nube mientras se estaba en CUALQUIER
// pestaña de Gestión Económica, la pantalla se repintaba entera vía
// renderView('economia') → GE.init(), que SIEMPRE forzaba tab('ventas') —
// sin importar si se estaba en Tesorería, Punto de Equilibrio, CDR...
// Se vivía como "estoy tecleando y de repente salto a Ventas". Se
// reproduce aquí llamando a GE.init() de nuevo (lo mismo que hace
// core.js al terminar una sincronización) estando en otra pestaña.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'GETABSYNC1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  navigate('economia');
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

for(const [tabId, tabLabel] of [['tesoreria','Tesorería'], ['pe','Punto de equilibrio'], ['cdr','Cuenta de Resultados'], ['variables','Gastos Variables'], ['capex','CAPEX']]){
  await caso(`Una "sincronización de la nube" (GE.init() de nuevo) NO resetea a Ventas estando en ${tabLabel}`, async () => {
    const r = await page.evaluate((tabId)=>{
      const activeTabName = () => {
        const b = [...document.querySelectorAll('#ge-tabs-row .ge-tab')].find(x=>x.classList.contains('active'));
        return b ? b.textContent.trim() : null;
      };
      GE.tab(tabId);
      const antes = activeTabName();
      GE.init(); // esto es exactamente lo que llama core.js tras sincronizar
      const despues = activeTabName();
      return {antes, despues};
    }, tabId);
    assert.ok(r.antes.toLowerCase().includes(tabLabel.toLowerCase().split(' ')[0]), 'la pestaña debía estar activa antes de simular la sincronización: ' + JSON.stringify(r));
    assert.equal(r.despues, r.antes, `tras "sincronizar" debe seguir en ${tabLabel}, no saltar a Ventas: ` + JSON.stringify(r));
  });
}

await caso('La primera vez que se entra a Gestión Económica (sin ninguna pestaña pintada) sigue cayendo en Ventas por defecto', async () => {
  const r = await page.evaluate(()=>{
    document.querySelectorAll('#view-economia .ge-tab-panel').forEach(el=>el.classList.remove('active'));
    GE.init();
    const b = [...document.querySelectorAll('#ge-tabs-row .ge-tab')].find(x=>x.classList.contains('active'));
    return b ? b.textContent.trim() : null;
  });
  assert.ok(r.toLowerCase().includes('venta'), 'sin ninguna pestaña previa, debe caer en Ventas por defecto: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
