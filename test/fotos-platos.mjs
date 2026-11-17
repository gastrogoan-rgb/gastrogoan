// Fotos de platos en la web de pedidos (17/11): miniatura pequeña, solo con el interruptor, nunca la foto original.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FOTOPL01', tenantId: ggBizTenantId('FOTOPL01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(async () => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
  const g = c.getContext('2d'); for(let i = 0; i < 400; i++){ g.fillStyle = `hsl(${i * 7 % 360},70%,50%)`; g.fillRect(Math.random() * 1600, Math.random() * 1200, 90, 70); }
  const grande = c.toDataURL('image/jpeg', .92);
  DB.fichas = [{id:1, recipeId:77, name:'Arroz', photo: grande}, {id:2, recipeId:78, name:'Sin foto'}];
  DB.cartas = [{id:1, nombre:'Carta', secciones:[{id:1, nombre:'Arroces', platos:[{id:10, nombre:'Arroz', recipeId:77, precio:12}, {id:11, nombre:'Otro', recipeId:78, precio:5}]}]}];
  const foto = () => cartasParaElEspejo()[0].secciones[0].platos;
  const out = {grande: grande.length};
  DB.business.fotosPlatosWeb = false; foto(); await new Promise(r => setTimeout(r, 600));
  out.apagado = foto()[0].foto || null;
  DB.business.fotosPlatosWeb = true; foto(); await new Promise(r => setTimeout(r, 900));
  const p = foto(); out.p0 = p[0].foto || null; out.p1 = p[1].foto || null;
  return out;
});
await caso('Con el interruptor apagado no sube ninguna foto al espejo', async () => assert.equal(r.apagado, null));
await caso('Encendido: el plato con foto sale con una miniatura JPEG pequeña (muy por debajo de la original); el que no la tiene, sin foto', async () => {
  assert.ok(r.p0 && r.p0.startsWith('data:image/jpeg'), 'falta la miniatura'); assert.ok(r.p0.length < r.grande / 4, `pesa ${r.p0.length} frente a ${r.grande}`); assert.equal(r.p1, null);
});
await caso('La web pública solo acepta data:image como foto y la pinta en la «i»', async () => {
  const fs = await import('node:fs'); const w = fs.readFileSync('reservagastrogoan.html', 'utf8');
  assert.ok(/data:image\\\/\(jpeg\|png\|webp\)/.test(w) && /class="inf-foto"/.test(w));
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Fotos de platos en la web: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
