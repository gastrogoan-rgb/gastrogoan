// Novedades · el día de una oferta semanal sale en el idioma ACTIVO (localeActual), sin locales escritos a mano.
// Prueba: una promo semanal que cae en lunes (2026-11-30), con la app en es, ca y en, y el texto de la oferta
// que genera promoAnunciar. Ojo: el código anterior ya daba el día bien en los tres idiomas; lo que cambia es
// que no quede ningún locale fijo en el módulo (lo mira el primer caso).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

// Estática: ningún locale fijo en el módulo de Novedades (todo sale de localeActual()).
caso('js/novedades.js no fija ningún locale (es-ES / ca-ES / en-GB)', () => {
  const src = readFileSync(new URL('../js/novedades.js', import.meta.url), 'utf8');
  const hallados = src.match(/['"](es-ES|ca-ES|en-GB)['"]/g) || [];
  assert.deepEqual(hallados, [], 'quedan locales fijos: ' + hallados.join(' '));
  return 'sin literales de locale';
});

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:90000});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'NOVEDAD0002');

// Texto de la oferta semanal (lunes) generado por promoAnunciar en un idioma dado.
async function ofertaEn(lang){
  await page.evaluate(l => localStorage.setItem(LANG_LS, l), lang);
  await page.reload({waitUntil:'domcontentloaded'}); await esperar(2000);
  return page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.promos = [{id:'pr-lunes', titulo:'Menú de lunes', fecha:'2026-11-30', recurrence:'weekly', hasta:'', horaInicio:'13:00', horaFin:'16:00', discountPct:10, menuItemName:'Menú del día', descripcion:''}];
    try { promoAnunciar('pr-lunes'); } catch(e) { /* navigate() puede fallar sin sesión completa: nvMem ya está escrito */ }
    return {detalle: nvMem.oferta.detalle, asunto: nvMem.asunto};
  });
}

await caso('es: «Cada lunes» en la oferta semanal', async () => {
  const o = await ofertaEn('es');
  assert.match(o.detalle, /Cada lunes/, o.detalle);
  return o.detalle;
});
await caso('ca: «Cada dilluns» en la oferta semanal', async () => {
  const o = await ofertaEn('ca');
  assert.match(o.detalle, /Cada dilluns/, o.detalle);
  assert.doesNotMatch(o.detalle, /lunes/, 'castellano filtrado en catalán: ' + o.detalle);
  return o.detalle;
});
await caso('en: «Every Monday» en la oferta semanal (nada en castellano)', async () => {
  const o = await ofertaEn('en');
  assert.match(o.detalle, /Every Monday/, o.detalle);
  assert.doesNotMatch(o.detalle, /lunes|Cada/, 'castellano filtrado en inglés: ' + o.detalle);
  return o.detalle;
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de fecha de Novedades pasaron');
process.exit(fallos ? 1 : 0);
