// Forma jurídica y régimen fiscal FIJADOS por quien da de alta (generador → issuedCodes → licencia): en Mi Negocio salen bloqueados,
// el motor fiscal usa SIEMPRE lo de la licencia, un negocio antiguo (sin nada fijado) sigue editándolos, y «Comprobar cambios» los refresca.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const page = await browser.newPage(); await page.setViewport({width:1280, height:900});
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISFIJ01', tenantId: ggBizTenantId('FISFIJ01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(async () => {
  DB.license = {code:'FISFIJ01', tenantId: ggBizTenantId('FISFIJ01')};
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true;
});
const mn = () => page.evaluate(async () => { navigate('minegocio'); await new Promise(r => setTimeout(r, 500)); const s = id => { const e = document.getElementById(id); return e ? {dis: e.disabled, val: e.value} : null; };
  return {forma: s('mn-forma-juridica'), reg: s('mn-regimen-fiscal'), mod: s('mn-modalidad-directa'), aviso: !!document.querySelector('.mn-bloqueo'), btn: !!document.querySelector('.mn-bloqueo button')}; });
await caso('Un negocio ANTIGUO (sin nada fijado) tampoco los edita (8/11): salen bloqueados y un aviso dice que los fija GastroGoan', async () => {
  await page.evaluate(() => { DB.license = {...DB.license}; delete DB.license.fiscal; delete DB.business.fiscalFijado; Object.assign(DB.business, {formaJuridica:'autonomo', regimenFiscal:'directa'}); saveDB(); });
  const r = await mn(); assert.equal(r.forma.dis, true); assert.equal(r.forma.val, 'autonomo'); assert.ok(await page.evaluate(() => !!document.querySelector('.mn-bloqueo-aviso')));
});
await caso('Con la forma fijada en la licencia (sociedad): Mi Negocio la muestra BLOQUEADA con su aviso, y el motor usa la de la licencia aunque el negocio tuviera otra', async () => {
  await page.evaluate(() => { DB.license = {...DB.license, fiscal:{formaJuridica:'sociedad', regimenFiscal:'directa', modalidadDirecta:null}}; Object.assign(DB.business, {formaJuridica:'autonomo', regimenFiscal:'modulos'}); saveDB(); });
  const perfil = await page.evaluate(() => ({forma: fiscalPerfil().forma, pf: fiscalPerfil().personaFisica, modulos: fiscalPerfil().modulos, negocio: DB.business.formaJuridica, fijado: DB.business.fiscalFijado}));
  assert.deepEqual(perfil, {forma:'sociedad', pf:false, modulos:false, negocio:'sociedad', fijado:true});
  const r = await mn(); assert.equal(r.forma.dis, true); assert.equal(r.forma.val, 'sociedad'); assert.ok(r.aviso && r.btn);
});
await caso('Autónomo fijado en estimación directa NORMAL: régimen y modalidad bloqueados y el IRPF usa la normal (sin el 5 %): 30.000 € → 6.111,00 €', async () => {
  await page.evaluate(() => { DB.license = {...DB.license, fiscal:{formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'normal'}}; saveDB(); });
  const r = await mn(); assert.equal(r.forma.dis, true); assert.equal(r.reg.dis, true); assert.equal(r.mod.dis, true); assert.equal(r.mod.val, 'normal');
  const irpf = await page.evaluate(() => { fiscalPerfil(); return irpfActividad(30000); }); assert.ok(Math.abs(irpf - 6111) < 0.01, 'IRPF ' + irpf);
});
await caso('Autónomo en módulos fijado: el motor lo trata como módulos', async () => {
  await page.evaluate(() => { DB.license = {...DB.license, fiscal:{formaJuridica:'autonomo', regimenFiscal:'modulos', modalidadDirecta:null}}; saveDB(); });
  assert.equal(await page.evaluate(() => fiscalPerfil().modulos), true);
});
await caso('«Comprobar cambios» lee lo que GastroGoan tiene fijado (una lectura) y lo aplica; si no hay nada fijado, lo dice sin tocar nada', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {}; const orig = window.verifyCodeIssuedOnPlatform; const avisos = []; const t0 = window.showToast; window.showToast = m => avisos.push(m);
    window.verifyCodeIssuedOnPlatform = async () => ({at: 1, formaJuridica:'cooperativa', regimenFiscal:'directa'});
    await refrescarFiscalDeLicencia(); await esp(200);
    out.tras = {forma: DB.business.formaJuridica, lic: DB.license.fiscal.formaJuridica};
    window.verifyCodeIssuedOnPlatform = async () => ({at: 1}); await refrescarFiscalDeLicencia(); out.sinFijar = avisos[avisos.length - 1]; out.sigue = DB.business.formaJuridica;
    window.verifyCodeIssuedOnPlatform = async () => null; await refrescarFiscalDeLicencia(); out.offline = avisos[avisos.length - 1];
    window.verifyCodeIssuedOnPlatform = orig; window.showToast = t0; return out;
  });
  assert.deepEqual(r.tras, {forma:'cooperativa', lic:'cooperativa'}); assert.match(r.sinFijar, /todavía no ha fijado/i); assert.equal(r.sigue, 'cooperativa'); assert.match(r.offline, /Sin conexión/i);
});
await caso('El generador de licencias ofrece forma jurídica y régimen al dar el alta y los guarda en issuedCodes y en el registro', async () => {
  const g = fs.readFileSync('generador-licencias.html', 'utf8');
  for(const t of ['fiscalFormHtml(\'nl\')', "leerFiscal('nl')", 'formaJuridica: fiscal.formaJuridica', "fiscal: fiscal || null", 'abrirFiscal(', 'guardarFiscal(']) assert.ok(g.includes(t), 'falta ' + t);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
