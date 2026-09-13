// Modo caos en Comandas Cocina (13/09, pedido del dueño): el hermano del de
// Sala. En hora punta los tickets por pedido dejan de ayudar — el cocinero
// no necesita saber de qué mesa es cada cosa, necesita saber qué saca AHORA.
// Una sola lista con lo pendiente, el que más lleva esperando arriba.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
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
}, 'CAOSCOCI');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

const sembrar = () => page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  DB.tables = [{id:1, name:'Mesa 1', pax:4, zona:'Salón', area:'sala'}, {id:2, name:'Mesa 2', pax:2, zona:'Salón', area:'sala'}];
  const L = (n, estado, minsAtras, extra) => Object.assign({
    platoId:null, recipeId:null, name:n, price:12, qty:1, tanda:'', notas:'',
    estado, enviadoAt: new Date(Date.now() - minsAtras*60000).toISOString(), bebida:false, modificadores:[],
  }, extra||{});
  DB.tpvOrders = [
    {id:901, tableId:1, tipo:'mesa', pax:2, status:'abierta', createdAt:new Date().toISOString(), items:[
      L('GG Classic','cocina',22), L('Patatas','preparando',9),
      L('Cerveza','cocina',3,{bebida:true}),          // bebida: no es de cocina
      L('Flan','entregado',30),                        // ya entregado: fuera
      L('Sin marchar', null, 40),                      // sin marchar: aún no es de cocina
    ]},
    {id:902, tableId:2, tipo:'mesa', pax:4, status:'abierta', createdAt:new Date().toISOString(), items:[
      L('Bacon & Blue','cocina',14,{notas:'sin cebolla'}),
    ]},
    {id:903, tipo:'takeaway', clienteNombre:'Anna', status:'abierta', createdAt:new Date().toISOString(), items:[
      L('Crispy Chicken','cocina',31),
    ]},
  ];
  saveDB();
  currentFolder = 'cocina';
  chaosCocina = false;
  navigate('comandascocina');
});
await sembrar();
await new Promise(r=>setTimeout(r,600));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El botón está en Comandas Cocina y enciende el modo caos', async () => {
  const r = await page.evaluate(async ()=>{
    const btn = [...document.querySelectorAll('#view-comandascocina button')]
      .find(b => /caos/i.test(b.innerText));
    if(!btn) return {sinBoton:true};
    const ticketsAntes = document.querySelectorAll('.kds-ticket').length;
    btn.click();
    await new Promise(r=>setTimeout(r,400));
    return {ticketsAntes, filas: document.querySelectorAll('.caos-fila').length,
      ticketsDespues: document.querySelectorAll('.kds-ticket').length};
  });
  assert.ok(!r.sinBoton, 'tiene que haber un botón de modo caos');
  assert.ok(r.ticketsAntes > 0, 'antes se ven los tickets de siempre: ' + JSON.stringify(r));
  assert.equal(r.ticketsDespues, 0, 'el modo caos sustituye a los tickets: ' + JSON.stringify(r));
  assert.ok(r.filas > 0, 'y pinta la lista por orden de espera: ' + JSON.stringify(r));
});

await caso('Solo lo PENDIENTE de cocina: ni bebidas, ni entregado, ni sin marchar', async () => {
  const platos = await page.evaluate(()=>[...document.querySelectorAll('.caos-fila .caos-plato strong')].map(e=>e.innerText));
  const texto = platos.join(' | ');
  assert.equal(platos.length, 4, 'cuatro platos pendientes: ' + texto);
  assert.ok(!/Cerveza/.test(texto), 'una bebida no es de cocina: ' + texto);
  assert.ok(!/Flan/.test(texto), 'lo ya entregado no está pendiente: ' + texto);
  assert.ok(!/Sin marchar/.test(texto), 'lo que no se ha marchado todavía no es de cocina: ' + texto);
});

await caso('El que más lleva esperando, arriba del todo', async () => {
  const minutos = await page.evaluate(()=>[...document.querySelectorAll('.caos-fila .caos-reloj')].map(e=>parseInt(e.innerText,10)));
  const ordenado = [...minutos].sort((a,b)=>b-a);
  assert.deepEqual(minutos, ordenado, 'tiene que ir de más a menos espera: ' + JSON.stringify(minutos));
  assert.ok(minutos[0] >= 30, 'el primero es el de 31 minutos: ' + JSON.stringify(minutos));
});

await caso('Lo que pasa de 15 minutos se marca en rojo', async () => {
  const r = await page.evaluate(()=>{
    const filas = [...document.querySelectorAll('.caos-fila')];
    return filas.map(f => ({mins: parseInt(f.querySelector('.caos-reloj').innerText,10), urgente: f.classList.contains('caos-urgente')}));
  });
  r.forEach(({mins, urgente}) => {
    assert.equal(urgente, mins >= 15, `${mins} min debería ${mins>=15?'':'no '}estar marcado: ` + JSON.stringify(r));
  });
});

await caso('La nota del camarero y la mesa se siguen viendo', async () => {
  const r = await page.evaluate(()=>{
    const fila = [...document.querySelectorAll('.caos-fila')].find(f => /Bacon/.test(f.innerText));
    return fila ? fila.innerText : '';
  });
  assert.ok(/sin cebolla/i.test(r), 'la nota del camarero no se puede perder: ' + r);
  assert.ok(/Mesa 2/.test(r), 'y de qué mesa es: ' + r);
});

await caso('Marcar un plato desde el modo caos vale para toda la app', async () => {
  const r = await page.evaluate(async ()=>{
    const fila = [...document.querySelectorAll('.caos-fila')].find(f => /Crispy Chicken/.test(f.innerText));
    fila.querySelector('button').click();
    await new Promise(r=>setTimeout(r,400));
    const pedido = DB.tpvOrders.find(o => o.id === 903);
    return {estado: pedido.items[0].estado, sigueEnLista: !!document.querySelector('.caos-fila')};
  });
  // 'cocina' (en espera) → 'preparando'. Es el mismo ciclo de la vista normal.
  assert.equal(r.estado, 'preparando', 'el botón avanza el estado real del plato');
});

await caso('Un plato listo sale de la lista, porque ya no está pendiente', async () => {
  const r = await page.evaluate(async ()=>{
    // Dos toques más: preparando → entregado (listo para recoger).
    const pedido = DB.tpvOrders.find(o => o.id === 903);
    pedido.items[0].estado = 'entregado';
    saveDB();
    renderComandasCocina();
    await new Promise(r=>setTimeout(r,400));
    return [...document.querySelectorAll('.caos-fila .caos-plato strong')].map(e=>e.innerText).join(' | ');
  });
  assert.ok(!/Crispy Chicken/.test(r), 'lo terminado ya no ocupa sitio: ' + r);
});

await caso('Se puede volver a los tickets de siempre', async () => {
  const r = await page.evaluate(async ()=>{
    toggleChaosCocina();
    await new Promise(r=>setTimeout(r,400));
    return {filas: document.querySelectorAll('.caos-fila').length, tickets: document.querySelectorAll('.kds-ticket').length};
  });
  assert.equal(r.filas, 0, 'el modo caos se apaga: ' + JSON.stringify(r));
  assert.ok(r.tickets > 0, 'y vuelven los tickets: ' + JSON.stringify(r));
});

await caso('Sin nada pendiente, lo dice en vez de dejar la pantalla vacía', async () => {
  const texto = await page.evaluate(async ()=>{
    DB.tpvOrders = [];
    saveDB();
    chaosCocina = true;
    renderComandasCocina();
    await new Promise(r=>setTimeout(r,400));
    return document.getElementById('comandascocina-content').innerText;
  });
  assert.ok(/Nada pendiente/i.test(texto), 'tiene que decirlo: ' + texto.slice(0,160));
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
