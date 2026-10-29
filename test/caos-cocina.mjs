// Modo caos en Comandas Cocina (13/09, pedido del dueño): el hermano del de
// Sala. En hora punta los tickets por pedido dejan de ayudar — el cocinero
// no necesita saber de qué mesa es cada cosa, necesita saber qué saca AHORA.
// Una tarjeta por mesa con lo pendiente (en rondas), la que más lleva esperando arriba (reescrito el 29/10).
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
    const ticketsAntes = document.querySelectorAll('.kt:not(.cz-mesa)').length;
    btn.click();
    await new Promise(r=>setTimeout(r,400));
    return {ticketsAntes, mesas: document.querySelectorAll('.cz-mesa').length,
      ticketsDespues: document.querySelectorAll('.kt:not(.cz-mesa)').length};
  });
  assert.ok(!r.sinBoton, 'tiene que haber un botón de modo caos');
  assert.ok(r.ticketsAntes > 0, 'antes se ven los tickets de siempre: ' + JSON.stringify(r));
  assert.equal(r.ticketsDespues, 0, 'el modo caos sustituye a los tickets: ' + JSON.stringify(r));
  assert.ok(r.mesas > 0, 'y pinta una tarjeta por mesa: ' + JSON.stringify(r));
});

await caso('Solo lo PENDIENTE de cocina: ni bebidas, ni entregado, ni sin marchar', async () => {
  const platos = await page.evaluate(()=>[...document.querySelectorAll('.cz-mesa .kt-pl .n')].map(e=>e.innerText.trim()));
  const texto = platos.join(' | ');
  assert.equal(platos.length, 4, 'cuatro platos pendientes: ' + texto);
  assert.ok(!/Cerveza/.test(texto), 'una bebida no es de cocina: ' + texto);
  assert.ok(!/Flan/.test(texto), 'lo ya entregado no está pendiente: ' + texto);
  assert.ok(!/Sin marchar/.test(texto), 'lo que no se ha marchado todavía no es de cocina: ' + texto);
});

await caso('Cada mesa es UNA tarjeta: sus platos no se reparten por la lista', async () => {
  const r = await page.evaluate(()=>{
    const tarjetas = [...document.querySelectorAll('.cz-mesa')];
    const mesa1 = tarjetas.filter(c => c.querySelector('.kt-mesa').innerText.trim() === 'Mesa 1');
    return {tarjetas: tarjetas.length, mesa1: mesa1.length, platosMesa1: mesa1[0] ? mesa1[0].innerText : ''};
  });
  assert.equal(r.tarjetas, 3, 'tres mesas con algo pendiente: ' + JSON.stringify(r));
  assert.equal(r.mesa1, 1, 'la Mesa 1 sale una sola vez: ' + JSON.stringify(r));
  assert.ok(/GG Classic/.test(r.platosMesa1) && /Patatas/.test(r.platosMesa1), 'con sus dos platos dentro: ' + r.platosMesa1);
});

await caso('La mesa que más lleva esperando, arriba del todo', async () => {
  const minutos = await page.evaluate(()=>[...document.querySelectorAll('.cz-mesa .kt-tm')].map(e=>parseInt(e.innerText,10)));
  const ordenado = [...minutos].sort((a,b)=>b-a);
  assert.deepEqual(minutos, ordenado, 'tiene que ir de más a menos espera: ' + JSON.stringify(minutos));
  assert.ok(minutos[0] >= 30, 'la primera es la de 31 minutos: ' + JSON.stringify(minutos));
});

await caso('Lo que pasa de 15 minutos se marca en rojo', async () => {
  const r = await page.evaluate(()=>[...document.querySelectorAll('.cz-mesa')].map(c => ({
    mins: parseInt(c.querySelector('.kt-tm').innerText,10), rojo: c.querySelector('.kt-tm').classList.contains('r') && c.querySelector('.kt-bar').classList.contains('r')})));
  r.forEach(({mins, rojo}) => {
    assert.equal(rojo, mins >= 15, `${mins} min debería ${mins>=15?'':'no '}estar en rojo: ` + JSON.stringify(r));
  });
});

await caso('La nota del camarero y la mesa se siguen viendo', async () => {
  const r = await page.evaluate(()=>{
    const c = [...document.querySelectorAll('.cz-mesa')].find(f => /Bacon/.test(f.innerText));
    return c ? c.innerText : '';
  });
  assert.ok(/sin cebolla/i.test(r), 'la nota del camarero no se puede perder: ' + r);
  assert.ok(/Mesa 2/.test(r), 'y de qué mesa es: ' + r);
});

await caso('Lo pedido en momentos distintos queda en rondas separadas DENTRO de la misma mesa', async () => {
  const r = await page.evaluate(async ()=>{
    const pedido = DB.tpvOrders.find(o => o.id === 902);
    pedido.items.push({platoId:null, recipeId:null, name:'Segunda ronda', price:5, qty:1, tanda:'', notas:'', estado:'cocina',
      enviadoAt:new Date(Date.now() - 3*60000).toISOString(), bebida:false, modificadores:[]});
    saveDB(); renderComandasCocina();
    await new Promise(r=>setTimeout(r,300));
    const c = [...document.querySelectorAll('.cz-mesa')].find(f => f.querySelector('.kt-mesa').innerText.trim() === 'Mesa 2');
    return {rondas: c.querySelectorAll('.cz-ronda').length, tarjetasMesa2: [...document.querySelectorAll('.cz-mesa')].filter(f => f.querySelector('.kt-mesa').innerText.trim() === 'Mesa 2').length,
      botones: c.querySelectorAll('.cz-btn').length};
  });
  assert.equal(r.tarjetasMesa2, 1, 'sigue siendo una sola tarjeta: ' + JSON.stringify(r));
  assert.equal(r.rondas, 2, 'pero con dos rondas, cada una con su hora: ' + JSON.stringify(r));
  assert.equal(r.botones, 2, 'y cada ronda con su botón: ' + JSON.stringify(r));
});

await caso('«Por plato» suma las raciones de todas las mesas', async () => {
  const r = await page.evaluate(async ()=>{
    DB.tpvOrders.push({id:904, tableId:2, tipo:'mesa', pax:2, status:'abierta', createdAt:new Date().toISOString(), items:[
      {platoId:null, recipeId:null, name:'GG Classic', price:12, qty:3, tanda:'', notas:'', estado:'cocina', enviadoAt:new Date(Date.now()-2*60000).toISOString(), bebida:false, modificadores:[]}]});
    saveDB();
    setChaosVista('plato');
    await new Promise(r=>setTimeout(r,300));
    const fila = [...document.querySelectorAll('.cz-plato-fila')].find(f => /GG Classic/.test(f.innerText));
    const res = {cant: fila ? parseInt(fila.querySelector('.cz-cant').innerText,10) : 0, mesas: fila ? fila.querySelectorAll('.cz-chip').length : 0};
    setChaosVista('mesas');
    DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== 904);
    saveDB(); renderComandasCocina();
    return res;
  });
  assert.equal(r.cant, 4, '1 + 3 raciones de GG Classic entre dos mesas: ' + JSON.stringify(r));
  assert.equal(r.mesas, 2, 'y dice en qué mesas está: ' + JSON.stringify(r));
});

await caso('Marcar desde el modo caos vale para toda la app', async () => {
  const r = await page.evaluate(async ()=>{
    const c = [...document.querySelectorAll('.cz-mesa')].find(f => /Crispy Chicken/.test(f.innerText));
    c.querySelector('.cz-btn').click();
    await new Promise(r=>setTimeout(r,400));
    const pedido = DB.tpvOrders.find(o => o.id === 903);
    return {estado: pedido.items[0].estado};
  });
  // 'cocina' (en espera) → 'preparando'. Es el mismo ciclo de la vista normal.
  assert.equal(r.estado, 'preparando', 'el botón de la ronda avanza el estado real del plato');
});

await caso('Un plato listo sale de la lista, porque ya no está pendiente', async () => {
  const r = await page.evaluate(async ()=>{
    const pedido = DB.tpvOrders.find(o => o.id === 903);
    pedido.items[0].estado = 'entregado';
    saveDB();
    renderComandasCocina();
    await new Promise(r=>setTimeout(r,400));
    return [...document.querySelectorAll('.cz-mesa .kt-pl .n')].map(e=>e.innerText).join(' | ');
  });
  assert.ok(!/Crispy Chicken/.test(r), 'lo terminado ya no ocupa sitio: ' + r);
});

await caso('Se puede volver a los tickets de siempre', async () => {
  const r = await page.evaluate(async ()=>{
    toggleChaosCocina();
    await new Promise(r=>setTimeout(r,400));
    return {mesas: document.querySelectorAll('.cz-mesa').length, tickets: document.querySelectorAll('.kt:not(.cz-mesa)').length};
  });
  assert.equal(r.mesas, 0, 'el modo caos se apaga: ' + JSON.stringify(r));
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
