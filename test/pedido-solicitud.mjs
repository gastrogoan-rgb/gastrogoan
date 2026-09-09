// Pedido "lo que falta" + I+D oculto para empleado sin edición (9/09).
//
// Dos cambios pedidos por el dueño:
//   1. El I+D no debe verse en la carpeta de Cocina de un empleado sin
//      permiso de editar (igual que Carta/Proveedores/Mega Lista/Escandallo).
//   2. En Pedidos, un empleado sin permiso de editar no puede "Realizar
//      Pedido" de verdad, pero sí puede mandar una solicitud de "lo que
//      falta" (sin proveedor ni precios) que el dueño o el gerente
//      (canUnlockEdit) revisan y marcan como atendida.
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
}, 'PEDSOL01');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
const IDS = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.employees = [
    {id: genId(), name:'Cocinero Raso', rol:'Cocinero', area:'cocina', active:true, color:'#DF7039', pin:'H2:x', pinChanged:true},
  ];
  const rasoId = DB.employees[0].id;
  DB.ingredients.push({id: genId(), name:'Harina de trigo', category:'Secos', area:'cocina', unit:'g', price:0.002, packQty:1000, packPrice:2, supplier:'Proveedor Uno', activo:true});
  DB.pedidoSolicitudes = [];
  saveDB();
  return {rasoId};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function entrarComoEmpleadoRaso(){
  await page.evaluate((id)=>{
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:id, area:'cocina', ts:Date.now()}));
    lockEditMode();
    document.body.classList.remove('owner-session');
    areaUnlocked.cocina = true;
    resumeEmployeeSession();
    currentFolder = 'cocina';
    navigate('folder');
  }, IDS.rasoId);
  await new Promise(r=>setTimeout(r,300));
}
async function entrarComoDueno(){
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    applyOwnerSessionEditRights();
    document.body.classList.add('owner-session');
    areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    currentFolder = 'cocina';
    navigate('folder');
  });
  await new Promise(r=>setTimeout(r,300));
}

await caso('Un empleado sin permiso de editar no ve el módulo de I+D en su carpeta de Cocina', async () => {
  await entrarComoEmpleadoRaso();
  const tieneIdr = await page.evaluate(()=> !!document.querySelector('#folder-modules .module-card[onclick*="\'idr\'"]'));
  assert.ok(!tieneIdr, 'el módulo I+D no debería aparecer en la carpeta de un empleado sin edición');
});

await caso('El dueño sí ve el módulo de I+D', async () => {
  await entrarComoDueno();
  const tieneIdr = await page.evaluate(()=> !!document.querySelector('#folder-modules .module-card[onclick*="\'idr\'"]'));
  assert.ok(tieneIdr, 'el dueño debe seguir viendo I+D');
});

await caso('Un empleado sin permiso de editar no ve "Realizar Pedido" pero sí "Pedir lo que falta"', async () => {
  await entrarComoEmpleadoRaso();
  const r = await page.evaluate(()=>{
    navigate('pedidos');
    const crear = document.getElementById('pedidos-tab-crear');
    const solicitar = document.getElementById('pedidos-tab-solicitar');
    const crearVisible = crear && crear.getBoundingClientRect().width > 0;
    const solicitarVisible = solicitar && solicitar.getBoundingClientRect().width > 0;
    return {crearVisible, solicitarVisible};
  });
  assert.ok(!r.crearVisible, '"Realizar Pedido" no debe verse sin permiso de editar');
  assert.ok(r.solicitarVisible, '"Pedir lo que falta" sí debe verse');
});

await caso('El empleado busca un artículo, lo añade con cantidad y envía la solicitud', async () => {
  await entrarComoEmpleadoRaso();
  await page.evaluate(()=>{ navigate('pedidos'); setPedidosTab('solicitar'); });
  await new Promise(r=>setTimeout(r,150));
  await page.type('#solicitud-search-input', 'Harina');
  await new Promise(r=>setTimeout(r,150));
  await page.evaluate(()=>{
    const btn = [...document.querySelectorAll('#solicitud-matches button')].find(b => b.textContent.includes('Añadir'));
    btn.click();
  });
  await new Promise(r=>setTimeout(r,150));
  await page.evaluate(()=>{ document.getElementById('solicitud-notas').value = 'Urge para mañana'; });
  await page.evaluate(()=> submitPedidoSolicitud());
  const solicitudes = await page.evaluate(()=> DB.pedidoSolicitudes.length);
  assert.equal(solicitudes, 1, 'debe haberse creado una solicitud');
  const s = await page.evaluate(()=> DB.pedidoSolicitudes[0]);
  assert.equal(s.status, 'pending');
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].name, 'Harina de trigo');
  assert.equal(s.items[0].cantidad, 1);
  assert.equal(s.notas, 'Urge para mañana');
});

await caso('El dueño ve la solicitud pendiente en el historial y puede marcarla atendida', async () => {
  await entrarComoDueno();
  await page.evaluate(()=>{ navigate('pedidos'); setPedidosTab('historial'); });
  await new Promise(r=>setTimeout(r,150));
  const antes = await page.evaluate(()=> document.getElementById('pedidos-list').innerText.includes('Harina de trigo'));
  assert.ok(antes, 'el dueño debe ver el contenido de la solicitud pendiente');
  await page.evaluate(()=>{
    const btn = [...document.querySelectorAll('#pedidos-list button')].find(b => b.textContent.includes('Marcar atendida'));
    btn.click();
  });
  await new Promise(r=>setTimeout(r,150));
  const estado = await page.evaluate(()=> DB.pedidoSolicitudes[0].status);
  assert.equal(estado, 'atendida');
  const yaNoSale = await page.evaluate(()=> !document.getElementById('pedidos-list').innerText.includes('Solicitudes de'));
  assert.ok(yaNoSale, 'una vez atendida no debe seguir apareciendo como pendiente');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
