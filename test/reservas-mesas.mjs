// Reservas en la web pública (decisión del dueño, 1/10): una hora sale en
// verde solo si hay una mesa LIBRE de N a N+2 plazas; al tocarla, el cliente
// elige entre esas mesas (la más ajustada, preseleccionada); un grupo de X o
// más (Mi Negocio) o sin mesa de su tamaño ve un aviso para llamar/escribir.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:360,height:800,isMobile:true,hasTouch:true});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1500));
let ok=0, fallos=0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+e.message); }
}
const dia = await page.evaluate(()=>{
  const d = new Date(Date.now()+3*86400000);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
});
async function preparar(extra){
  await page.evaluate(({dia, extra})=>{
    window.DB = DB = {};
    DB.business = Object.assign({name:'Casa Prueba', phone:'600 111 222', email:'hola@casaprueba.es',
      horario:{}}, extra||{});
    DB.tables = [{id:1,name:'1',plazas:2},{id:2,name:'2',plazas:4},{id:3,name:'3',plazas:5},{id:4,name:'4',plazas:8}];
    // La mesa 3 ocupada a las 21:00
    DB.mesasOcupadas = {[dia]:{3:{'21:00':true,'21:15':true}}};
    DB.cartas=[]; DB.activeCartaIds=[]; DB.menus=[]; DB.activeMenuIds=[];
    getTurnosForDate = () => [{abre:'20:00', cierra:'23:00'}];
    currentTab='reserva'; renderApp();
    calDate = dia; renderReservaCalendar();
  }, {dia, extra});
}
async function personas(n){
  await page.evaluate(n=>{ const i=document.getElementById('r-people'); i.value=n; i.dispatchEvent(new Event('input')); }, n);
}
function horas(){ return page.evaluate(()=>[...document.querySelectorAll('#r-cal button')].filter(b=>/^\d\d:\d\d$/.test(b.textContent.trim())).map(b=>[b.textContent.trim(), !b.disabled])); }

await caso('3 personas: verde si hay mesa de 3 a 5 libre; a las 21:00 (la de 5 ocupada) mesa de 4', async ()=>{
  await preparar(); await personas(3);
  const h = Object.fromEntries(await horas());
  assert.equal(h['20:00'], true); assert.equal(h['21:00'], true, 'la de 4 está libre a las 21:00');
  await page.evaluate(d=>calPickSlot(d,'21:00'), dia);
  const mesas = await page.evaluate(()=>[...document.querySelectorAll('.mesa-opt')].map(b=>[b.textContent.replace(/\s+/g,' ').trim(), b.classList.contains('on')]));
  assert.deepEqual(mesas.map(m=>m[1]), [true], 'debe ofrecer solo la mesa 2 (4 plazas), preseleccionada: '+JSON.stringify(mesas));
  assert.ok(/4/.test(mesas[0][0]));
  return mesas.map(m=>m[0]).join(' | ');
});

await caso('3 personas a las 22:30: elige entre la de 4 y la de 5 (nunca la de 2 ni la de 8)', async ()=>{
  await page.evaluate(d=>calPickSlot(d,'22:30'), dia);
  const n = await page.evaluate(()=>document.querySelectorAll('.mesa-opt').length);
  assert.equal(n, 2);
  await page.evaluate(()=>calPickTable(3));
  const sel = await page.evaluate(()=>calSelectedTable);
  assert.equal(sel, 3);
});

await caso('5 personas: la 21:00 en rojo (la única de 5 a 7 está ocupada; la de 8 le sobra)', async ()=>{
  await preparar(); await personas(5);
  const h = Object.fromEntries(await horas());
  assert.equal(h['21:00'], false, '21:00 debe salir en rojo');
  assert.equal(h['22:30'], true, 'a las 22:30 la de 5 ya está libre');
});

await caso('Grupo de 10 con umbral en 8: aviso con teléfono y email, sin calendario ni envío', async ()=>{
  await preparar({reservaConfirmManualDesde: 8}); await personas(10);
  const r = await page.evaluate(()=>({aviso: !!document.querySelector('.grp-aviso'), tel: document.querySelector('.grp-aviso a[href^="tel:"]')?.getAttribute('href'),
    mail: document.querySelector('.grp-aviso a[href^="mailto:"]')?.getAttribute('href'), boton: document.getElementById('r-submit').disabled, horas: document.querySelectorAll('#r-cal button').length}));
  assert.ok(r.aviso); assert.equal(r.tel, 'tel:600111222'); assert.ok(r.mail.startsWith('mailto:hola@casaprueba.es'));
  assert.equal(r.boton, true); assert.equal(r.horas, 0);
});

await caso('Sin umbral, 12 personas y la mesa mayor de 8: mismo aviso (no hay mesa de su tamaño)', async ()=>{
  await preparar(); await personas(12);
  assert.ok(await page.evaluate(()=>!!document.querySelector('.grp-aviso')));
  await personas(2);
  assert.ok(await page.evaluate(()=>!document.querySelector('.grp-aviso') && !document.getElementById('r-submit').disabled), 'al bajar a 2 vuelve el calendario');
});

await caso('La reserva enviada lleva la mesa que eligió el cliente', async ()=>{
  await preparar(); await personas(3);
  await page.evaluate(d=>{ calPickSlot(d,'22:30'); calPickTable(3); }, dia);
  const req = await page.evaluate(()=>new Promise(res=>{
    document.getElementById('r-name').value='Ana'; document.getElementById('r-phone').value='600000000';
    document.getElementById('r-email').value='ana@ejemplo.es'; document.getElementById('r-privacy-consent').checked=true;
    window.reserveAforoAtomic = () => Promise.resolve({committed:true});
    window.reserveTableAtomic = () => Promise.resolve({committed:true});
    window.sendReservaRequest = (r) => res(r);
    window.sendRequest = (r) => res(r);
    try{ submitReserva(); }catch(e){ res({error:e.message}); }
    setTimeout(()=>res({timeout:true}), 3000);
  }));
  assert.equal(req.tableId, 3, JSON.stringify(req));
});

await page.screenshot({path:'/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad/res.png', fullPage:true}).catch(()=>{});
await caso('Ningún error de JavaScript', async ()=>{ assert.deepEqual(errs, []); });
await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
