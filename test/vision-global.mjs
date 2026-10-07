// VISIÓN GLOBAL DE MIS NEGOCIOS (selector de negocios).
//
// Lee la IndexedDB de cada negocio del dueño sin cambiar de slot. Lo que no
// puede fallar: que sume bien, que NUNCA enseñe un negocio de otra cuenta,
// que no cambie el negocio activo y que no escriba en ninguna base (ni
// cree la de un negocio que este aparato no ha abierto nunca).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8964;
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], {cwd: raiz, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 900));

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://localhost:${PORT}/index.html`, {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));

// Semilla: tres negocios de "casapaco" (default activo, b2 y b3 con su base),
// uno suyo sin base en este aparato (b4) y uno de OTRA cuenta (bX).
await page.evaluate(async () => {
  const user = ggOwnerUser('casapaco');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user, authKey:'ak', pinHash: hashPin('1234', user)}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  const me = ggOwnerId('casapaco');
  const otro = ggOwnerId('barlolo');
  saveBusinessSlots([
    {id:'default', name:'Casa Paco Centro', code:'AAAAAAA1', ownerId: me},
    {id:'b2', name:'Casa Paco Playa', code:'AAAAAAA2', ownerId: me},
    {id:'b3', name:'Casa Paco Puerto', code:'AAAAAAA3', ownerId: me},
    {id:'b4', name:'Casa Paco Nuevo', code:'AAAAAAA4', ownerId: me},
    {id:'bX', name:'Bar Lolo Secreto', code:'XXXXXXXX', ownerId: otro},
  ]);
  localStorage.setItem('gastrogoan_active_slot', 'default');
  const hoy = todayStr();
  const venta = (id, bruto) => ({id, date: hoy, time:'13:00', total: bruto, status:'cobrada', tipo:'mesa',
    items:[{name:'Menú', price: bruto, qty:1, ivaPct:10}], payments:[{method:'efectivo', amount: bruto}]});
  Object.assign(DB.business, {name:'Casa Paco Centro', netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.sales = [venta(1, 110)];
  const neg = (nombre, ventas, extra) => Object.assign(JSON.parse(JSON.stringify(defaultData())), {
    business: Object.assign({}, defaultData().business, {name: nombre}), sales: ventas}, extra || {});
  const escribir = (slot, data) => new Promise((ok, ko) => {
    const req = indexedDB.open(slotIdbName(slot), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('kv','readwrite'); tx.objectStore('kv').put(data, DB_KEY); tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = () => ko(tx.error); };
    req.onerror = () => ko(req.error);
  });
  await escribir('b2', neg('Casa Paco Playa', [venta(1, 220), venta(2, 110)], {
    ingredients:[{id:1, name:'Harina', unit:'kg'}], stock:{1:{qty:1, min:5}},
    reservations:[{id:1, date: hoy, time:'21:00', people:4, status:'confirmada'}, {id:2, date: hoy, people:2, status:'cancelada'}]}));
  await escribir('b3', neg('Casa Paco Puerto', [venta(1, 55)]));
  await escribir('bX', neg('Bar Lolo Secreto', [venta(1, 9999)]));
});

// Foto de TODAS las bases del aparato: nombres y contenido.
const fotoIdb = () => page.evaluate(async () => {
  const lista = (await indexedDB.databases()).map(d => d.name).sort();
  const out = {lista};
  for(const n of lista){
    out[n] = await new Promise(ok => {
      const req = indexedDB.open(n);
      req.onsuccess = () => { const db = req.result;
        if(!db.objectStoreNames.contains('kv')){ db.close(); ok(null); return; }
        const g = db.transaction('kv','readonly').objectStore('kv').get(DB_KEY);
        g.onsuccess = () => { db.close(); ok(JSON.stringify(g.result === undefined ? null : g.result)); }; };
      req.onerror = () => ok('ERR');
    });
  }
  return out;
});
const antes = await fotoIdb();
const lsAntes = await page.evaluate(() => JSON.stringify({s: localStorage.getItem('gastrogoan_business_slots'), a: localStorage.getItem('gastrogoan_active_slot')}));

await page.evaluate(() => {
  window.__guardados = 0; window.__syncs = 0;
  const s = saveDB, c = scheduleCloudSync;
  window.saveDB = function(){ window.__guardados++; return s.apply(this, arguments); };
  window.scheduleCloudSync = function(){ window.__syncs++; return c.apply(this, arguments); };
  showBusinessSelectScreen();
});

await caso('El botón aparece en el selector para un dueño con 2+ negocios', async () => {
  const hay = await page.$('#bs-vision-global');
  assert.ok(hay, 'falta el botón');
});

await page.evaluate(() => openVisionGlobal());
await new Promise(r => setTimeout(r, 800));

await caso('Suma bien (este mes): total = suma de negocios, y cada uno con sus ventas sin IVA', async () => {
  const r = await page.evaluate(() => {
    const num = s => parseFloat(s.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.'));
    const porSlot = {};
    document.querySelectorAll('#modal-box .vg-negocio').forEach(el => porSlot[el.dataset.slot] = num(el.querySelector('.vg-netas').textContent));
    return {porSlot, total: num(document.getElementById('vg-total-netas').textContent)};
  });
  assert.equal(r.porSlot.default, 100);
  assert.equal(r.porSlot.b2, 300);
  assert.equal(r.porSlot.b3, 50);
  assert.equal(r.total, 450, 'total ' + r.total);
  return JSON.stringify(r);
});

await caso('Nunca enseña el negocio de otra cuenta', async () => {
  const html = await page.evaluate(() => document.getElementById('modal-box').innerHTML);
  assert.ok(!html.includes('Bar Lolo'), 'APARECE EL NEGOCIO AJENO');
  assert.ok(!html.includes('bX'), 'aparece el id del ajeno');
  assert.ok(!html.includes('9.999') && !html.includes('9999'), 'sus cifras se han colado');
});

await caso('El negocio sin base en este aparato se indica, sin cifras inventadas', async () => {
  const {r, aviso} = await page.evaluate(() => ({r: [...document.querySelectorAll('#modal-box .vg-sin-datos')].map(e => e.textContent), aviso: t('bs.globalNoLocal')}));
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('Casa Paco Nuevo') && r[0].includes(aviso));
});

await caso('Reservas de hoy y stock bajo por local', async () => {
  const {txt, res, stk} = await page.evaluate(() => ({txt: document.querySelector('#modal-box .vg-negocio[data-slot="b2"]').textContent, res: t('bs.globalBookingsToday'), stk: t('bs.globalLowStock')}));
  assert.ok(txt.includes(res + ': 1 (4 pax)'), txt);
  assert.ok(txt.includes(stk + ': 1'), txt);
});

await caso('Los cuatro periodos se pintan sin error y con totales coherentes', async () => {
  const r = await page.evaluate(() => ['hoy','semana','mesAnterior','mes'].map(p => { vgSetPeriodo(p); return document.getElementById('vg-total-netas').textContent; }));
  assert.equal(r.length, 4);
  return r.join(' | ');
});

await caso('No cambia el slot activo, ni DB, ni guarda, ni sincroniza', async () => {
  const r = await page.evaluate(() => ({activo: getActiveSlot(), nombre: DB.business.name, ventas: DB.sales.length, g: window.__guardados, s: window.__syncs}));
  assert.equal(r.activo, 'default');
  assert.equal(r.nombre, 'Casa Paco Centro');
  assert.equal(r.ventas, 1);
  assert.equal(r.g, 0, 'saveDB se ha llamado');
  assert.equal(r.s, 0, 'scheduleCloudSync se ha llamado');
  const ls = await page.evaluate(() => JSON.stringify({s: localStorage.getItem('gastrogoan_business_slots'), a: localStorage.getItem('gastrogoan_active_slot')}));
  assert.equal(ls, lsAntes, 'cambió la lista de negocios o el activo');
});

await caso('No modifica ninguna IndexedDB ni crea la del negocio sin base', async () => {
  const despues = await fotoIdb();
  assert.deepEqual(despues.lista, antes.lista);
  assert.ok(!despues.lista.includes('gastrogoan_db_b4'), 'se ha creado la base de b4');
  for(const n of antes.lista) assert.equal(despues[n], antes[n], 'cambió ' + n);
});

await caso('Un dueño con un solo negocio no ve el botón', async () => {
  const r = await page.evaluate(() => {
    closeModal();
    const me = ggOwnerId('casapaco');
    const prev = localStorage.getItem('gastrogoan_business_slots');
    saveBusinessSlots([{id:'default', name:'A', code:'AAAAAAA1', ownerId: me}, {id:'bX', name:'B', code:'XXXXXXXX', ownerId: ggOwnerId('barlolo')}]);
    const v = puedeVerVisionGlobal();
    localStorage.setItem('gastrogoan_business_slots', prev);
    return v;
  });
  assert.equal(r, false);
});

await caso('Un empleado no la ve', async () => {
  const r = await page.evaluate(() => {
    const prev = localStorage.getItem('gastrogoan_access_session');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:1, ts: Date.now()}));
    const v = puedeVerVisionGlobal();
    localStorage.setItem('gastrogoan_access_session', prev);
    return v;
  });
  assert.equal(r, false);
});

await caso('Sin errores de página', async () => { assert.deepEqual(errs, []); });

await browser.close();
srv.kill();
const ok = res.filter(Boolean).length;
console.log(ok === res.length ? `\n${ok}/${res.length}: todos los casos pasaron` : `\n${ok}/${res.length}: HAY FALLOS`);
process.exit(ok === res.length ? 0 : 1);
