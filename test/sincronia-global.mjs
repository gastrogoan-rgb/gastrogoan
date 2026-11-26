// REPASO GLOBAL DE SINCRONÍA (25/11, tarea «Y6»): tras el fallo del cambio de contraseña (un dato guardado en local que se daba por bueno
// para siempre), se buscaron los mismos fallos en el resto de la app con la pregunta «¿qué pasa en un SEGUNDO aparato / negocio cuando
// cambia esto en el primero?». Cada caso de aquí se vio fallar ANTES del arreglo:
//  1. «Visto» de la campana era global del aparato: marcarlo en un negocio lo escondía en TODOS los demás.
//  2. El aviso diario de archivar datos antiguos era global: con dos negocios, solo el primero lo enseñaba.
//  3. Un empleado que cambia de ÁREA en otro aparato seguía en la anterior hasta cerrar la sesión (el desactivado sí salía).
//  4. El espejo público se publicaba al arrancar con la copia local (posiblemente anticuada) y no se corregía al llegar lo de la nube:
//     la web podía enseñar una carta/menú retirados hasta el siguiente guardado.
//  5. La huella de «ya publiqué la referencia de nube» era UNA sola por aparato: con dos negocios se reescribía en la plataforma compartida
//     en cada cambio de negocio (coste por licencia, justo lo que no puede crecer).
//  6. Guardar Mi Negocio en un aparato que aún tenía abierto un negocio borrado en otro RESUCITABA el negocio en la cuenta (pisaba la lápida).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const URL = 'http://localhost:8950/dist/index.html';
const AUTH = 'k'.repeat(24);
const CODE = 'NEGOCIOA';

// Un aparato en su propio contexto (localStorage e IndexedDB propios), con sesión de propietario y licencia puesta en el negocio `slot`.
async function aparato({slot = 'default', code = CODE, sesion = {type:'owner'}, slots = null} = {}){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); page.ctx = ctx; await page.setViewport({width:1100,height:800});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(URL, {waitUntil:'domcontentloaded'}); await w(800);
  await abrirNegocio(page, {slot, code, sesion, slots});
  return page;
}
// Deja el aparato apuntando a un negocio (como al elegirlo en el selector) y arranca de nuevo la app.
async function abrirNegocio(page, {slot, code, sesion, slots}){
  await page.evaluate(async (AUTH, slot, code, sesion, slots) => {
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey: AUTH, pinHash:'h'}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    localStorage.setItem('gastrogoan_slots_owner_migrated', 'cerrado');
    localStorage.setItem('gastrogoan_active_slot', slot);
    const lista = slots || [{id: slot, name: 'Negocio', code}];
    localStorage.setItem(SLOTS_LS, JSON.stringify(lista.map(s => Object.assign({ownerId: ggOwnerId('jefe')}, s))));
    localStorage.setItem(slot === 'default' ? 'gastrogoan_license_v1' : 'gastrogoan_license_v1_' + slot, JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify(Object.assign({ts: Date.now()}, sesion)));
    localStorage.setItem('gastrogoan_access_last_activity', String(Date.now()));
  }, AUTH, slot, code, sesion, slots);
  await page.goto('about:blank'); await page.goto(URL + '#home', {waitUntil:'domcontentloaded'}); await w(2800);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','firebase-gate','extconn-gate','revoked-gate','comprobando-negocio'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  });
}

// ───────────── 1. «Visto» de la campana: por negocio, no por aparato ─────────────
{
  const p = await aparato({slot: 'default', code: 'NEGOCIOA'});
  await caso('«Visto» marcado en un negocio NO esconde el aviso en el otro negocio del mismo aparato', async () => {
    await p.evaluate(() => { try{ avisosMarcarVisto('cumple', 1); }catch(e){} });
    assert.deepEqual(await p.evaluate(() => avisosVistosLeer()), {cumple: 1}, 'el negocio A debe recordarlo');
    await abrirNegocio(p, {slot: 'bB', code: 'NEGOCIOB', sesion: {type:'owner'}, slots: [{id:'default', name:'A', code:'NEGOCIOA'}, {id:'bB', name:'B', code:'NEGOCIOB'}]});
    assert.deepEqual(await p.evaluate(() => avisosVistosLeer()), {}, 'el negocio B hereda el «Visto» de A: ' + JSON.stringify(await p.evaluate(() => avisosVistosLeer())));
    await abrirNegocio(p, {slot: 'default', code: 'NEGOCIOA', sesion: {type:'owner'}, slots: [{id:'default', name:'A', code:'NEGOCIOA'}, {id:'bB', name:'B', code:'NEGOCIOB'}]});
    assert.deepEqual(await p.evaluate(() => avisosVistosLeer()), {cumple: 1}, 'al volver a A sigue recordándolo (el negocio por defecto conserva su clave de siempre)');
  });

  // ───────────── 2. Aviso de archivar: por negocio ─────────────
  await caso('El aviso diario de archivar datos antiguos sale en CADA negocio, no solo en el primero que se abra', async () => {
    const dosSlots = [{id:'default', name:'A', code:'NEGOCIOA'}, {id:'bB', name:'B', code:'NEGOCIOB'}];
    const aviso = () => p.evaluate(() => {
      DB.sales = Array.from({length: 60}, (_, i) => ({id: 'v' + i, date: '2020-01-01', total: 1, items: []}));
      closeModal && closeModal();
      checkArchiveReminder();
      const ov = document.getElementById('modal-overlay');
      const abierto = !!(ov && ov.classList.contains('active'));
      closeModal();
      return abierto;
    });
    await abrirNegocio(p, {slot: 'default', code: 'NEGOCIOA', sesion: {type:'owner'}, slots: dosSlots});
    await p.evaluate(() => { try{ localStorage.removeItem(ARCHIVE_REMINDER_DAY_KEY); }catch(e){} });
    assert.equal(await aviso(), true, 'en A debe salir');
    assert.equal(await aviso(), false, 'en A no se repite el mismo día');
    await abrirNegocio(p, {slot: 'bB', code: 'NEGOCIOB', sesion: {type:'owner'}, slots: dosSlots});
    assert.equal(await aviso(), true, 'en B también debe salir (es otro negocio con sus propios datos antiguos)');
  });
  await p.ctx.close();
}

// ───────────── 3. Empleado que cambia de área en otro aparato ─────────────
{
  const emp = (area, extra) => Object.assign({id: 'e1', name: 'Ana', area, active: true, pin: 'x', pinChanged: true}, extra || {});
  const montar = async () => {
    const p = await aparato({slot: 'default', sesion: {type:'employee', employeeId: 'e1', area: 'cocina'}});
    await p.evaluate(e => { if(!lastSyncedSnapshot) lastSyncedSnapshot = {}; DB.employees = [e]; localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:'e1', area:'cocina', ts: Date.now()})); }, emp('cocina'));
    return p;
  };
  // Devuelve si la página se recargó al llegar el cambio.
  const llega = async (p, nuevo) => {
    const nav = p.waitForNavigation({timeout: 4000}).then(() => true).catch(() => false);
    await p.evaluate(e => { applyRemoteBlock('employees', [e]); }, nuevo).catch(() => {});
    return nav;
  };
  await caso('CONTROL: un empleado desactivado en otro aparato sale de su sesión abierta', async () => {
    const p = await montar();
    assert.equal(await llega(p, emp('cocina', {active: false})), true);
    await p.ctx.close();
  });
  await caso('Un empleado pasado de Cocina a Sala en otro aparato NO se queda con el acceso de Cocina en su sesión abierta', async () => {
    const p = await montar();
    const recargo = await llega(p, emp('sala'));
    assert.equal(recargo, true, 'la sesión abierta sigue en el área anterior');
    await w(1500);
    assert.equal(await p.evaluate(() => (getAccessSession() || {}).area), 'sala', 'la sesión debe quedar en su área nueva');
    await p.ctx.close();
  });
  await caso('Si lo que cambia no es el área ni el alta (p. ej. su nombre), la sesión sigue sin recargar', async () => {
    const p = await montar();
    assert.equal(await llega(p, emp('cocina', {name: 'Ana María'})), false);
    await p.ctx.close();
  });
}

// ───────────── 4 y 5. Espejo público y huella de la referencia de nube ─────────────
{
  const p = await aparato({slot: 'default'});
  await p.evaluate(() => { getPublicId(); }); await w(2500); await p.evaluate(() => clearTimeout(publicMirrorSyncTimer));   // getPublicId guarda el id la primera vez: se hace antes para que no dispare su propio espejo
  await caso('Espejo público: lo que llega de la nube después del arranque SE PUBLICA (no se queda la copia anticuada del aparato)', async () => {
    await p.evaluate(() => {
      window.firebase = window.firebase || {};
      if(!lastSyncedSnapshot) lastSyncedSnapshot = {};
      window.__sets = [];
      const ref = ruta => ({
        set: v => { window.__sets.push([ruta, JSON.parse(JSON.stringify(v === undefined ? null : v))]); return Promise.resolve(); },
        once: () => Promise.resolve({val: () => null, exists: () => false, forEach: () => {}}),
        remove: () => Promise.resolve(), update: () => Promise.resolve(),
        transaction: () => Promise.resolve({committed: false}), on: () => {}, off: () => {}, child: c => ref(ruta + '/' + c)
      });
      const app = {database: () => ({ref}), auth: () => ({currentUser: {uid: 'x'}})};
      window.getPublicMirrorApp = async () => app;
      espejoUltimoEnvio = {huella: '', ts: 0};
      DB.menus = [{id: 'm0', name: 'Menú de ayer', grupos: []}];
      syncPublicMirror();
    });
    await w(500);
    const ultimo = () => p.evaluate(() => { const l = window.__sets.filter(s => /\/info$/.test(s[0])); return l.length ? l[l.length - 1][1] : null; });
    const antes = await ultimo();
    assert.ok(antes && (antes.menus || []).some(m => m.id === 'm0'), 'el arranque publica lo que tiene el aparato');
    // Otro aparato retiró ese menú y puso uno nuevo; la nube nos lo entrega.
    await p.evaluate(() => { applyRemoteBlock('menus', [{id: 'm0', name: 'Menú de ayer', grupos: []}, {id: 'm1', name: 'Menú de hoy', grupos: []}]); });
    await w(1800);
    const despues = await ultimo();
    const ids = (despues.menus || []).map(m => m.id);
    assert.ok(ids.includes('m1'), 'la web sigue sin ver el menú nuevo: ' + JSON.stringify(ids));
  });
  await caso('Espejo público: un bloque que no se publica (clientes) no dispara ninguna publicación', async () => {
    await w(300);
    const cuenta = () => p.evaluate(() => window.__sets.filter(s => /\/info$/.test(s[0])).length);
    const n0 = await cuenta();
    await p.evaluate(() => { applyRemoteBlock('clients', [{id: 'cx', name: 'Pepe'}]); });
    await w(1500);
    assert.equal(await cuenta(), n0);
  });
  await caso('Referencia de nube del negocio: con DOS negocios en el aparato no se reescribe en la plataforma en cada cambio de negocio', async () => {
    await p.evaluate(() => {
      window.__lookups = [];
      const app = {database: () => ({ref: ruta => ({set: () => { window.__lookups.push(ruta); return Promise.resolve(); }})})};
      window.getPlatformFirebaseApp = async () => app;
      try{ localStorage.removeItem(TENANT_LOOKUP_PUBLICADO_LS); }catch(e){}
    });
    const publica = id => p.evaluate(async id => { publishTenantLookup(id, {apiKey: 'k', databaseURL: 'https://x.firebaseio.com'}); await new Promise(r => setTimeout(r, 250)); }, id);
    await publica('tenantA'); await publica('tenantB'); await publica('tenantA'); await publica('tenantB');
    const n = await p.evaluate(() => window.__lookups.length);
    assert.equal(n, 2, 'escrituras a la plataforma: ' + n + ' (debían ser 2, una por negocio)');
  });
  await p.ctx.close();
}

// ───────────── 6. Renombrar un negocio no resucita uno borrado en otro aparato ─────────────
{
  const nube = {arbol: {gastrogoan: {ownerAuth: {}}}};
  const p = await aparato({slot: 'default', code: CODE});
  const tid = await p.evaluate(c => ggBizTenantId(c), CODE);
  nube.arbol.gastrogoan.ownerAuth[AUTH] = {user: 'jefe', businesses: {[tid]: {code: CODE, name: 'Casa Paco', deleted: true, deletedAt: 1}}};
  await p.evaluate(nube => {
    window.__nube = nube;
    const get = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o == null ? null : (o[k] === undefined ? null : o[k])), window.__nube.arbol);
    const set = (ruta, v) => { const ks = ruta.split('/').filter(Boolean); let o = window.__nube.arbol; ks.slice(0, -1).forEach(k => { if(o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); if(v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
    const app = {database: () => ({ref: ruta => ({
      once: () => Promise.resolve({val: () => { const v = get(ruta); return v == null ? null : JSON.parse(JSON.stringify(v)); }, exists: () => get(ruta) != null}),
      set: v => (set(ruta, v), Promise.resolve()), remove: () => (set(ruta, null), Promise.resolve())
    })})};
    window.getPlatformFirebaseApp = async () => app;
  }, nube);
  const nodo = () => p.evaluate((a, t) => __nube.arbol.gastrogoan.ownerAuth[a].businesses[t], AUTH, tid);
  await caso('Otro aparato borró el negocio (lápida); aquí aún estaba abierto y se guarda Mi Negocio con un nombre nuevo: la lápida SE QUEDA', async () => {
    await p.evaluate(() => { DB.license = {code: 'NEGOCIOA', tenantId: ggBizTenantId('NEGOCIOA')}; _lastLinkedBusinessName = null; document.getElementById('app-splash')?.remove(); navigate('minegocio'); });
    await w(800);
    await p.evaluate(() => { document.getElementById('business-name').value = 'Casa Paco Nuevo'; });
    await p.evaluate(() => saveBusiness(true)).catch(e => console.log('saveBusiness:', e.message, (e.stack||'').slice(0,400)));
    await w(800);
    const n = await nodo();
    assert.equal(n && n.deleted, true, 'la lápida se pisó y el negocio resucita en todos los aparatos: ' + JSON.stringify(n));
  });
  await caso('Un negocio que SIGUE en la cuenta sí recibe su nombre nuevo (y conserva el código)', async () => {
    await p.evaluate((a, t) => { __nube.arbol.gastrogoan.ownerAuth[a].businesses[t] = {code: 'NEGOCIOA', name: 'Casa Paco'}; document.getElementById('business-name').value = 'Casa Paco Renovada'; _lastLinkedBusinessName = null; }, AUTH, tid);
    await p.evaluate(() => saveBusiness(true)).catch(() => {});
    await w(800);
    const n = await nodo();
    assert.deepEqual([n.name, n.code, !!n.deleted], ['Casa Paco Renovada', CODE, false]);
  });
  await caso('Un renombrado no cancela un borrado que aún espera en la cola', async () => {
    await p.evaluate(() => { ownerListOutboxEscribir([]); });
    await p.evaluate((t) => { const a = getOwnerAuthKey(); ownerListOutboxEscribir([{op: 'unlink', authKey: a, tenantId: t, code: 'NEGOCIOA', name: 'x', ts: Date.now()}]); renombrarNegocioEnCuenta(t, 'NEGOCIOA', 'Otro'); }, tid);
    const cola = await p.evaluate(() => ownerListOutboxLeer().map(o => o.op));
    assert.ok(cola.includes('unlink') || cola.length === 0, 'cola: ' + JSON.stringify(cola));
    assert.ok(!cola.includes('rename') || cola.includes('unlink') === false, 'el renombrado no debe sustituir al borrado pendiente: ' + JSON.stringify(cola));
  });
  await p.ctx.close();
}

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
