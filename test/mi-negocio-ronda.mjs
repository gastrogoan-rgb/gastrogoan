// Mi Negocio, ronda del 8/11: fiscal bloqueado, reservas por grupo desmarcable, plano de sala + mesas juntos y en rejilla,
// horario especial, IVA por producto, impresoras/pantallas y zona de reparto.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:900});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MINEG003', tenantId: ggBizTenantId('MINEG003')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('minegocio');
});
await new Promise(r => setTimeout(r, 600));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('Forma jurídica y régimen fiscal NO se pueden tocar desde Mi Negocio (los pone quien da el alta)', async () => {
  const r = await page.evaluate(() => {
    DB.business.fiscalFijado = false; DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa'; renderMiNegocio();
    const ids = ['mn-forma-juridica','mn-regimen-fiscal','mn-modalidad-directa'];
    return ids.map(i => { const e = document.getElementById(i); return e ? e.disabled : 'sin campo'; });
  });
  assert.deepEqual(r, [true, true, true]);
});

await caso('Reservas por grupo: la casilla se marca y se DESMARCA (el valor vuelve a 0)', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    DB.business.reservaConfirmManualDesde = 0; renderMiNegocio();
    document.getElementById('mn-require-manual-confirm').click();
    await new Promise(r => setTimeout(r, 300));
    out.marcada = document.getElementById('mn-require-manual-confirm').checked; out.v1 = DB.business.reservaConfirmManualDesde;
    document.getElementById('mn-require-manual-confirm').click();
    await new Promise(r => setTimeout(r, 300));
    out.desmarcada = !document.getElementById('mn-require-manual-confirm').checked; out.v2 = DB.business.reservaConfirmManualDesde;
    return out;
  });
  assert.equal(r.marcada, true); assert.ok(r.v1 > 0); assert.equal(r.desmarcada, true); assert.equal(r.v2, 0);
});

await caso('Plano de sala: crear zona y mesas configuradas van juntas; las mesas en rejilla de 3 por fila en PC y 1 en móvil; «plazas» rotulado en cada mesa', async () => {
  await page.evaluate(async () => {
    DB.tables.length = 0; renderMiNegocio();
    document.getElementById('mn-zona-nombre').value = 'Sala'; document.getElementById('mn-zona-cantidad').value = '6';
    await addZonaConMesas();
  });
  const medir = async () => page.evaluate(() => {
    const mesas = [...document.querySelectorAll('#mn-mesas-list .mn-mesa')];
    const filas = new Set(mesas.map(m => Math.round(m.getBoundingClientRect().top)));
    const cab = document.querySelector('.mn-mesas-cab').getBoundingClientRect();
    const btn = [...document.querySelectorAll('button')].find(b => /addZonaConMesas/.test(b.getAttribute('onclick')||'')).getBoundingClientRect();
    const rot = mesas.every(m => /plazas|places|seats/i.test(m.querySelector('.mn-mesa-plazas span').textContent));
    const w = document.documentElement.scrollWidth <= innerWidth;
    return {n: mesas.length, filas: filas.size, rot, w, distancia: Math.round(cab.top - btn.bottom)};
  });
  const pc = await medir();
  assert.equal(pc.n, 6); assert.equal(pc.filas, 2, 'en PC deben ir 3 por fila: ' + JSON.stringify(pc)); assert.ok(pc.rot); assert.ok(pc.w);
  assert.ok(pc.distancia < 110, 'zona nueva y mesas configuradas separadas ' + pc.distancia + 'px');
  await page.setViewport({width:390, height:844}); await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { renderMiNegocio(); (typeof mnAbrirDe==='function') && mnAbrirDe(document.getElementById('mn-mesas-list')); });
  const mov = await medir();
  assert.equal(mov.filas, 6, 'en móvil una por fila: ' + JSON.stringify(mov)); assert.ok(mov.w, 'scroll lateral en móvil');
  await page.setViewport({width:1280, height:900});
});

// (las demás secciones de la ronda se añaden debajo)

assert.equal(errs.length, 0, 'errores de página: ' + errs.join(' | '));
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
await browser.close();
process.exit(fallos ? 1 : 0);
