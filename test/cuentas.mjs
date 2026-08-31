// AISLAMIENTO ENTRE CUENTAS — lo que no puede fallar nunca.
//
// La lista de negocios vive en el DISPOSITIVO. Dos dueños pueden compartir
// una tablet (socios, un local que se traspasa, o el propio comercial dando
// de alta a un cliente detrás de otro). Que una cuenta vea, abra o herede el
// negocio de otra no es un fallo de comodidad: es enseñarle a alguien las
// ventas, los proveedores y las nóminas de otro negocio.
//
// Cada caso de aquí es un camino real por el que se han mezclado o se
// podrían mezclar.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

// Entrar como un dueño concreto, por el camino local (sin internet), que es
// el que usa el 99% de las veces un cliente ya dado de alta.
const entrar = (user) => `(() => {
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: ggOwnerUser('${user}'), authKey: 'ak_${user}', pinHash: hashPin('1234', ggOwnerUser('${user}'))}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
})()`;

await caso('Un negocio canjeado por una cuenta no aparece en la otra', async ()=>{
  const r = await page.evaluate((eA, eB)=>{
    eval(eA);
    const idA = ggOwnerId('casapaco');
    saveBusinessSlots([
      {id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA},
      {id:'hueco', name:'Mi negocio', ownerId: idA},
    ]);
    const veA = slotsOfCurrentOwner().map(s=>s.id);
    eval(eB);
    const veB = slotsOfCurrentOwner().map(s=>s.id);
    return {veA, veB, tieneB: ownerHasAnyBusiness()};
  }, entrar('casapaco'), entrar('barlolo'));
  assert.ok(r.veA.includes('bA'), 'el dueño debe ver el suyo');
  assert.ok(!r.veB.includes('bA'), 'LA OTRA CUENTA NO PUEDE VERLO');
  assert.ok(!r.tieneB, 'y para ella el aparato no tiene ningún negocio');
  return 'A ve el suyo, B no ve nada';
});

await caso('Entrar con otra cuenta no te mete dentro del negocio abierto', async ()=>{
  const r = await page.evaluate((eA, eB)=>{
    eval(eA);
    const idA = ggOwnerId('casapaco');
    saveBusinessSlots([{id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA}]);
    localStorage.setItem('gastrogoan_active_slot', 'bA');   // el de A se quedó abierto
    eval(eB);
    // B entra: no puede aterrizar dentro de bA
    enterAsOwner();
    const sel = document.getElementById('business-select-screen');
    const dentro = !!sel && !sel.classList.contains('hide');
    const activoEsDeB = slotsOfCurrentOwner().some(s => s.id === getActiveSlot());
    return {selectorAbierto: dentro, activoEsDeB, activo: getActiveSlot()};
  }, entrar('casapaco'), entrar('barlolo'));
  assert.ok(r.selectorAbierto, 'B debe quedarse en el selector, no dentro del negocio de A');
  assert.ok(!r.activoEsDeB, 'el hueco activo sigue siendo de A: no se puede abrir');
  return 'se queda en el selector';
});

await caso('Y no puede cerrar el selector para colarse en el negocio ajeno', async ()=>{
  const r = await page.evaluate((eA, eB)=>{
    eval(eA);
    const idA = ggOwnerId('casapaco');
    const idB = ggOwnerId('barlolo');
    saveBusinessSlots([
      {id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA},
      {id:'bB', name:'Bar Lolo', code:'BBBBBBBB', ownerId: idB},
    ]);
    localStorage.setItem('gastrogoan_active_slot', 'bA');
    eval(eB);
    showBusinessSelectScreen();
    const sel = document.getElementById('business-select-screen');
    const aspa = [...sel.querySelectorAll('button')].find(b => /×|&times;/.test(b.innerHTML) || /modal-close/.test(b.className));
    return {hayAspa: !!aspa, activo: getActiveSlot()};
  }, entrar('casapaco'), entrar('barlolo'));
  assert.ok(!r.hayAspa, 'con el negocio de OTRA cuenta abierto detrás, no puede haber aspa de cerrar');
  return 'sin salida al negocio ajeno';
});

await caso('Los datos de cada negocio viven en cajones distintos', async ()=>{
  const r = await page.evaluate(()=>({
    idbA: slotIdbName('bA'), idbB: slotIdbName('bB'),
    licA: slotLicenseKey('bA'), licB: slotLicenseKey('bB'),
    idbDefault: slotIdbName('default'),
  }));
  assert.notEqual(r.idbA, r.idbB, 'cada negocio, su propia base de datos');
  assert.notEqual(r.licA, r.licB, 'y su propia licencia');
  return `${r.idbA} ≠ ${r.idbB}`;
});

await caso('Una cuenta NUEVA no hereda los negocios sin dueño del aparato', async ()=>{
  // El camino que de verdad puede mezclar cuentas: negocios de una versión
  // antigua, sin `ownerId`. Si la cuenta que se acaba de crear se los queda,
  // ve el negocio del cliente anterior entero.
  const r = await page.evaluate((eA, eB)=>{
    localStorage.removeItem('gastrogoan_owner_login');
    // Negocios antiguos, sin dueño puesto, del cliente que usaba el aparato
    saveBusinessSlots([{id:'viejo', name:'Casa Paco', code:'AAAAAAAA'}]);
    eval(eA);                    // A ya estaba dentro cuando se actualizó
    migrateSlotOwners();         // el arranque se los adjudica a A
    const trasA = getBusinessSlots().map(s=>({id:s.id, owner:s.ownerId}));
    // Ahora entra una cuenta NUEVA en el mismo aparato
    setOwnerLogin('barlolo', 'ak_barlolo', '1234');
    migrateSlotOwners();
    const trasB = getBusinessSlots().map(s=>({id:s.id, owner:s.ownerId}));
    return {trasA, trasB, idA: ggOwnerId('casapaco'), idB: ggOwnerId('barlolo'),
            veB: slotsOfCurrentOwner().map(s=>s.id), tieneB: ownerHasAnyBusiness()};
  }, entrar('casapaco'), entrar('barlolo'));
  assert.equal(r.trasA[0].owner, r.idA, 'al actualizar, los negocios son de quien estaba dentro');
  assert.equal(r.trasB[0].owner, r.idA, 'Y SIGUEN SIENDO SUYOS cuando entra otra cuenta');
  assert.ok(!r.veB.includes('viejo'), 'la cuenta nueva no debe verlo');
  assert.ok(!r.tieneB, 'ni contarlo como suyo');
  return 'los antiguos se quedan con su dueño';
});

await caso('Nadie hereda nada si el aparato no sabe de quién eran', async ()=>{
  // Caso peor: se actualiza y el PRIMERO en entrar es una cuenta nueva.
  const r = await page.evaluate((eB)=>{
    localStorage.removeItem('gastrogoan_owner_login');
    localStorage.removeItem('gastrogoan_slots_owner_migrated');
    saveBusinessSlots([{id:'huerfano', name:'De alguien', code:'CCCCCCCC'}]);
    setOwnerLogin('cuentanueva', 'ak_nueva', '1234');
    migrateSlotOwners();
    const slots = getBusinessSlots();
    return {owner: slots.find(s=>s.id==='huerfano').ownerId,
            idNueva: ggOwnerId('cuentanueva'),
            ve: slotsOfCurrentOwner().map(s=>s.id)};
  }, entrar('cuentanueva'));
  assert.notEqual(r.owner, r.idNueva, 'una cuenta recién creada NO puede quedarse el negocio de otro');
  assert.ok(!r.ve.includes('huerfano'), 'ni verlo');
  return 'el huérfano no se regala';
});

await caso('Salir de la cuenta no deja el negocio anterior a la vista', async ()=>{
  const r = await page.evaluate((eA)=>{
    eval(eA);
    const idA = ggOwnerId('casapaco');
    saveBusinessSlots([{id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA}]);
    localStorage.setItem('gastrogoan_active_slot', 'bA');
    exitToAccessScreen();
    return {
      sesion: localStorage.getItem('gastrogoan_access_session'),
      acceso: !!document.getElementById('access-select-screen') && !document.getElementById('access-select-screen').classList.contains('hide'),
      selectorCerrado: (()=>{ const s=document.getElementById('business-select-screen'); return !s || s.classList.contains('hide'); })(),
    };
  }, entrar('casapaco'));
  assert.ok(!r.sesion, 'la sesión debe cerrarse');
  assert.ok(r.acceso, 'y verse la pantalla de acceso');
  assert.ok(r.selectorCerrado, 'sin dejar el selector detrás');
  return 'sesión cerrada y pantalla de acceso';
});

await caso('El acceso de empleado no abre la puerta a otros negocios', async ()=>{
  const r = await page.evaluate(()=>{
    localStorage.removeItem('gastrogoan_owner_login');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId: 1, ts: Date.now()}));
    const ses = getAccessSession();
    return {tipo: ses.type, esDueno: ses.type === 'owner'};
  });
  assert.equal(r.tipo, 'employee');
  assert.ok(!r.esDueno, 'un empleado nunca es propietario');
  return 'el empleado entra por su puerta';
});

await caso('Canjear con el negocio de otro abierto abre un hueco propio', async ()=>{
  // Sin este guardián, la licencia nueva se escribía ENCIMA del negocio que
  // estuviera activo: el del otro dueño se quedaba con el código nuevo y la
  // cuenta recién creada aterrizaba dentro de sus datos.
  const r = await page.evaluate((eA, eB)=>{
    eval(eA);
    const idA = ggOwnerId('casapaco');
    saveBusinessSlots([{id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA}]);
    localStorage.setItem('gastrogoan_active_slot', 'bA');
    eval(eB);
    const recargas = [];
    const recargaReal = window.switchToBusiness;
    window.switchToBusiness = (id) => { recargas.push(id); };   // no recargamos de verdad
    redeemFirstBusiness();
    window.switchToBusiness = recargaReal;
    const slots = getBusinessSlots();
    const deA = slots.find(x => x.id === 'bA');
    return {
      seguiaSiendoDeA: deA.ownerId === ggOwnerId('casapaco') && deA.code === 'AAAAAAAA',
      huecoNuevo: slots.length === 2 && slots[1].ownerId === ggOwnerId('barlolo') && !slots[1].code,
      cambiaAlHuecoNuevo: recargas.length === 1 && recargas[0] === slots[1].id,
    };
  }, entrar('casapaco'), entrar('barlolo'));
  assert.ok(r.seguiaSiendoDeA, 'el negocio del otro dueño NO se toca');
  assert.ok(r.huecoNuevo, 'se abre un hueco propio y vacío');
  assert.ok(r.cambiaAlHuecoNuevo, 'y se canjea ahí');
  return 'el negocio ajeno queda intacto';
});

await caso('Cada negocio apunta a su nube, nunca a la del otro', async ()=>{
  const r = await page.evaluate(()=>{
    localStorage.setItem(slotLicenseKey('bA'), JSON.stringify({code:'AAAAAAAA', tenantId: ggBizTenantId('AAAAAAAA')}));
    localStorage.setItem(slotLicenseKey('bB'), JSON.stringify({code:'BBBBBBBB', tenantId: ggBizTenantId('BBBBBBBB')}));
    const a = JSON.parse(localStorage.getItem(slotLicenseKey('bA')));
    const b = JSON.parse(localStorage.getItem(slotLicenseKey('bB')));
    return {tA: a.tenantId, tB: b.tenantId, pubA: null, distintos: a.tenantId !== b.tenantId};
  });
  assert.ok(r.distintos, 'dos negocios distintos no pueden compartir tenant');
  assert.ok(r.tA && r.tB);
  return `${r.tA} ≠ ${r.tB}`;
});

await caso('RECARGA REAL: al volver a la app, la otra cuenta sigue sin ver nada', async ()=>{
  // Es literalmente lo que hizo el dueño: dar de alta una cuenta y volver a
  // entrar en la app. Aquí se recarga la página de verdad, con lo que se
  // ejecuta todo el arranque (incluida la adjudicación de negocios).
  await page.evaluate((eA)=>{
    localStorage.clear();
    eval(eA);
    const idA = ggOwnerId('casapaco');
    saveBusinessSlots([{id:'bA', name:'Casa Paco', code:'AAAAAAAA', ownerId: idA}]);
    localStorage.setItem('gastrogoan_active_slot', 'bA');
  }, entrar('casapaco'));
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r2=>setTimeout(r2, 2000));
  // Ahora se crea la cuenta nueva en el mismo aparato, como en una venta
  await page.evaluate(()=>{ setOwnerLogin('clientenuevo', 'ak_nuevo', '1234'); });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r2=>setTimeout(r2, 2000));
  const r = await page.evaluate(()=>({
    quienSoy: (getOwnerLogin()||{}).user,
    ve: slotsOfCurrentOwner().filter(x=>x.code).map(x=>x.name),
    tiene: ownerHasAnyBusiness(),
    duenoDelViejo: (getBusinessSlots().find(x=>x.id==='bA')||{}).ownerId,
    idPaco: ggOwnerId('casapaco'),
  }));
  assert.equal(r.quienSoy, 'clientenuevo');
  assert.deepEqual(r.ve, [], 'tras recargar dos veces, la cuenta nueva NO puede ver el negocio del anterior');
  assert.ok(!r.tiene, 'para ella el aparato sigue sin negocios');
  assert.equal(r.duenoDelViejo, r.idPaco, 'y el negocio sigue siendo de su dueño');
  return 'dos recargas completas y sigue aislado';
});

await caso('Ningún error de JavaScript en todo el recorrido', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
