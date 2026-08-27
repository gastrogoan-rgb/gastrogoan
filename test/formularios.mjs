// R14 — Rellenar y guardar de verdad.
//
// Hasta ahora ninguna prueba había rellenado un formulario: se pulsaban
// los botones, pero las confirmaciones se dejaban en "no" para no
// destrozar datos, así que de las 29 funciones de guardar de la app solo
// se ejecutaba saveDB. Crear un ingrediente, una receta o un empleado —lo
// primero que hace un cliente el día que compra— no se había probado.
//
// Cada caso: abrir la ventana REAL, rellenar los campos REALES, guardar
// con la función REAL, y comprobar que el dato queda y SOBREVIVE A
// RECARGAR (que es donde se ve si de verdad se guardó en disco).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
await page.setCacheEnabled(false);
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'FORMS001',tenantId:ggBizTenantId('FORMS001')}));
  localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  saveDB();
});

async function caso(nombre, fn){
  const errAntes = errs.length;
  try{
    const detalle = await fn();
    if(errs.length > errAntes) throw new Error('error JS: '+errs[errs.length-1].slice(0,80));
    console.log(`✅ ${nombre}${detalle?'  → '+detalle:''}`);
    res.push({nombre, ok:true});
  }catch(e){
    console.log(`❌ ${nombre}\n     ⤷ ${e.message}`);
    res.push({nombre, ok:false});
  }
}
// Rellena un campo por id como lo haría una persona
const escribir = (campos) => page.evaluate(c=>{
  Object.entries(c).forEach(([id,v])=>{
    const el=document.getElementById(id);
    if(!el) throw new Error('no existe el campo #'+id);
    if(el.type==='checkbox') el.checked = !!v; else el.value = v;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
}, campos);

/* ─── 0. La app no deja crear un ingrediente huérfano ─── */
await caso('Sin proveedores, el ingrediente no se puede crear a ciegas', async ()=>{
  await page.evaluate(()=>{ DB.providers=[]; currentFolder='cocina'; navigate('megalista'); openIngredientModal(); });
  await new Promise(r=>setTimeout(r,400));
  const r = await page.evaluate(()=>({
    hayCampoNombre: !!document.getElementById('ing-name'),
    ofreceCrearProveedor: !!document.querySelector('#modal-box [onclick*="openProviderModal"]'),
  }));
  assert.ok(!r.hayCampoNombre, 'no debería ofrecer el formulario sin proveedores');
  assert.ok(r.ofreceCrearProveedor, 'debería ofrecer crear el proveedor primero');
  await page.evaluate(()=>closeModal());
  return 'avisa y ofrece crear el proveedor';
});

/* ─── 1. Proveedor ─── */
await caso('Crear un proveedor desde su formulario', async ()=>{
  await page.evaluate(()=>{ currentFolder='cocina'; navigate('proveedores'); openProviderModal(); });
  await new Promise(r=>setTimeout(r,400));
  const campos = await page.evaluate(()=>[...document.querySelectorAll('#modal-box [id]')].map(e=>e.id));
  const set={};
  if(campos.includes('prov-nombre')) set['prov-nombre']='Especias Ruiz';
  else if(campos.includes('prov-name')) set['prov-name']='Especias Ruiz';
  if(campos.includes('prov-tel')) set['prov-tel']='600999888';
  await escribir(set);
  await page.evaluate(async ()=>{ await saveProvider(); });
  await new Promise(r=>setTimeout(r,500));
  const r = await page.evaluate(()=> (DB.providers||[]).find(p=>(p.nombre||p.name)==='Especias Ruiz') || null);
  assert.ok(r, 'el proveedor no se guardó (campos vistos: '+JSON.stringify(campos)+')');
  return 'guardado';
});

/* ─── 2. Ingrediente ─── */
await caso('Crear un ingrediente desde su formulario', async ()=>{
  await page.evaluate(()=>{ currentFolder='cocina'; navigate('megalista'); openIngredientModal(); });
  await new Promise(r=>setTimeout(r,400));
  await escribir({'ing-name':'Pimentón de la Vera','ing-supplier':'Especias Ruiz','ing-pack-qty':'500','ing-pack-price':'12.5'});
  await page.evaluate(async ()=>{ await saveIngredient(); });
  await new Promise(r=>setTimeout(r,500));
  const r = await page.evaluate(()=>{
    const i=(DB.ingredients||[]).find(x=>x.name==='Pimentón de la Vera');
    return i?{precio:i.price, pack:i.packQty, prov:i.supplier, tieneStock:!!DB.stock[i.id]}:null;
  });
  assert.ok(r, 'el ingrediente no se guardó');
  assert.ok(Math.abs(r.precio-0.025)<0.0001, `el precio por unidad debería ser 12,5/500 = 0,025 y es ${r.precio}`);
  assert.equal(r.prov,'Especias Ruiz');
  assert.ok(r.tieneStock, 'debería crearse su ficha de stock');
  return `precio unitario ${r.precio} €/g calculado solo`;
});

/* ─── 2. Empleado ─── */
await caso('Crear un empleado desde su formulario', async ()=>{
  await page.evaluate(()=>{ currentFolder='cocina'; navigate('horarios'); setHorariosTab('personal'); openEmployeeModal(); });
  await new Promise(r=>setTimeout(r,400));
  const campos = await page.evaluate(()=>[...document.querySelectorAll('#modal-box [id]')].map(e=>e.id));
  const set={};
  if(campos.includes('emp-name')) set['emp-name']='Rosa Jiménez';
  if(campos.includes('emp-rol')) set['emp-rol']='Segunda de cocina';
  if(campos.includes('emp-pin')) set['emp-pin']='4821';
  await escribir(set);
  await page.evaluate(async ()=>{ await saveEmployee(); });
  await new Promise(r=>setTimeout(r,500));
  const r = await page.evaluate(()=>{
    const e=(DB.employees||[]).find(x=>x.name==='Rosa Jiménez');
    return e?{rol:e.rol, area:e.area, activo:e.active!==false, pinGuardadoEnClaro: e.pin==='4821'}:null;
  });
  assert.ok(r, 'el empleado no se guardó');
  assert.equal(r.area,'cocina','debería quedar en el área donde se creó');
  assert.ok(r.activo,'debería nacer activo');
  assert.ok(!r.pinGuardadoEnClaro, 'el PIN NUNCA debe guardarse en claro');
  return `${r.rol}, área ${r.area}, PIN cifrado`;
});

/* ─── 3. Cliente ─── */
await caso('Crear un cliente desde su formulario', async ()=>{
  await page.evaluate(()=>{ currentFolder='sala'; navigate('clientes'); openClientModal(); });
  await new Promise(r=>setTimeout(r,400));
  const campos = await page.evaluate(()=>[...document.querySelectorAll('#modal-box [id]')].map(e=>e.id));
  const set={};
  if(campos.includes('client-name')) set['client-name']='Marta Sanz';
  if(campos.includes('client-phone')) set['client-phone']='600123456';
  if(campos.includes('client-email')) set['client-email']='marta@ejemplo.com';
  await escribir(set);
  await page.evaluate(async ()=>{ await saveClient(); });
  await new Promise(r=>setTimeout(r,500));
  const r = await page.evaluate(()=> (DB.clients||[]).find(c=>c.name==='Marta Sanz') || null);
  assert.ok(r, 'el cliente no se guardó');
  return `teléfono ${r.phone}`;
});

/* ─── 4. Lo guardado sobrevive a recargar ─── */
await caso('Todo lo creado sobrevive a cerrar y volver a abrir', async ()=>{
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2600));
  const r = await page.evaluate(()=>({
    ingrediente: (DB.ingredients||[]).some(i=>i.name==='Pimentón de la Vera'),
    empleado:    (DB.employees||[]).some(e=>e.name==='Rosa Jiménez'),
    cliente:     (DB.clients||[]).some(c=>c.name==='Marta Sanz'),
  }));
  assert.ok(r.ingrediente, 'el ingrediente no sobrevivió a la recarga');
  assert.ok(r.empleado, 'el empleado no sobrevivió a la recarga');
  assert.ok(r.cliente, 'el cliente no sobrevivió a la recarga');
  return 'los tres siguen ahí';
});

/* ─── 5. Validación: un formulario vacío no debe guardar basura ─── */
await caso('Un formulario sin nombre NO crea nada', async ()=>{
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    currentFolder='cocina'; navigate('megalista'); openIngredientModal();
  });
  await new Promise(r=>setTimeout(r,400));
  const antes = await page.evaluate(()=>DB.ingredients.length);
  await escribir({'ing-name':'   ','ing-pack-qty':'100','ing-pack-price':'5'});
  await page.evaluate(async ()=>{ await saveIngredient(); });
  await new Promise(r=>setTimeout(r,400));
  const despues = await page.evaluate(()=>DB.ingredients.length);
  assert.equal(despues, antes, 'un ingrediente sin nombre no debería crearse');
  return 'rechazado, como debe';
});

/* ─── 6. Validación: precios negativos ─── */
await caso('Un precio negativo NO se acepta', async ()=>{
  const antes = await page.evaluate(()=>DB.ingredients.length);
  await escribir({'ing-name':'Producto raro','ing-pack-qty':'-5','ing-pack-price':'-10'});
  await page.evaluate(async ()=>{ await saveIngredient(); });
  await new Promise(r=>setTimeout(r,400));
  const r = await page.evaluate(()=>({
    n:DB.ingredients.length,
    creado:(DB.ingredients||[]).some(i=>i.name==='Producto raro'),
  }));
  assert.equal(r.n, antes, 'no debería haberse creado nada con cantidades negativas');
  assert.ok(!r.creado);
  return 'rechazado, como debe';
});

await browser.close();
console.log('\n'+'═'.repeat(64));
const mal=res.filter(r=>!r.ok);
console.log(mal.length ? `❌ ${mal.length} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
