// R35 — Los modos de sesión, uno a uno.
//
// La app tiene seis formas de estar dentro, y hasta ahora ninguna prueba las
// separaba: propietario, empleado de cocina, empleado de cocina CON permiso
// de edición, y los mismos tres de sala, uno de ellos repartidor. Todas las
// demás pruebas corren como propietario, que es el único que lo ve todo — o
// sea, el único modo en el que ningún permiso puede fallar.
//
// Hay dos clases y significan cosas distintas, y ahí está casi todo el lío:
//   .owner-only   → propietario O empleado con canUnlockEdit. Pensado para
//                   que no tenga que pedir PIN para tocar turnos y stock DE
//                   SU ÁREA.
//   .owner-strict → SOLO propietario de verdad. Todo lo que toca a OTRO
//                   compañero: su ficha, su PIN, sus vacaciones.
//
// Lo que se comprueba no es "se ve o no se ve", que eso es CSS. Es lo que de
// verdad hace daño:
//   · que nada que esté escondido se pueda ejecutar igualmente (un agujero),
//   · que nada que se VEA falle luego en silencio (una trampa: el empleado
//     rellena el formulario, guarda, y no pasa nada ni le dicen por qué).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1440, height:900});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PERMIS01', tenantId: ggBizTenantId('PERMIS01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2400));

// Un negocio con los cinco empleados que hacen falta para probar los modos.
const IDS = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
    .forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true,
    tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const mk = (name, area, extra) => {
    const e = {id: genId(), name, rol:'x', area, active:true, color:'#DF7039',
               pin:'H2:x', pinChanged:true, ...extra};
    DB.employees.push(e); return e.id;
  };
  DB.employees = [];
  const ids = {
    cocina:        mk('Cocinero Raso', 'cocina', {}),
    cocinaEdit:    mk('Jefe de Cocina', 'cocina', {canUnlockEdit:true}),
    sala:          mk('Camarero Raso', 'sala', {}),
    salaEdit:      mk('Jefe de Sala', 'sala', {canUnlockEdit:true}),
    salaReparto:   mk('Repartidor', 'sala', {esRepartidor:true}),
  };
  const ing = genId();
  DB.ingredients.push({id:ing, name:'Bacalao', category:'Pescados', area:'cocina',
    unit:'g', price:0.02, packQty:1000, packPrice:20, supplier:'P', activo:true});
  DB.providers.push({id:genId(), nombre:'Proveedor', area:'cocina', diasEntrega:[], gastoEnvio:0});
  const rid = genId();
  DB.recipes.push({id:rid, name:'Bacalao al pil-pil', area:'cocina', isBase:false,
    price:19, ivaPct:10, category:'Principales',
    ingredients:[{type:'ingredient', ingredientId:ing, qty:180, merma:5}]});
  DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
  saveDB();
  return ids;
});

/* Entrar como cada uno. Se usa el mismo camino que la app: se deja la sesión
   en localStorage y se reanuda, para no inventarse un estado que en la vida
   real no existiría. */
async function entrarComo(modo){
  await page.evaluate((m)=>{
    if(m.tipo === 'owner'){
      localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
      ownerUnlocked = true;
      applyOwnerSessionEditRights();
      areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
      currentFolder = 'cocina';
    } else {
      localStorage.setItem('gastrogoan_access_session', JSON.stringify(
        {type:'employee', employeeId: m.id, area: m.area, ts:Date.now()}));
      ownerUnlocked = false;
      lockEditMode();
      document.body.classList.remove('owner-session');
      areaUnlocked.cocina = areaUnlocked.sala = false;
      areaUnlocked.gestion = false;
      areaUnlocked[m.area] = true;
      resumeEmployeeSession();
    }
    navigate('folder');
  }, modo);
  await new Promise(r => setTimeout(r, 350));
}

const MODOS = {
  propietario:      {tipo:'owner'},
  cocina:           {tipo:'emp', id: IDS.cocina,      area:'cocina'},
  cocinaEdicion:    {tipo:'emp', id: IDS.cocinaEdit,  area:'cocina'},
  sala:             {tipo:'emp', id: IDS.sala,        area:'sala'},
  salaEdicion:      {tipo:'emp', id: IDS.salaEdit,    area:'sala'},
  salaRepartidor:   {tipo:'emp', id: IDS.salaReparto, area:'sala'},
};

// Lo que se ve y se puede pulsar en una vista concreta.
async function radiografia(vista, carpeta){
  return await page.evaluate(({vista, carpeta})=>{
    if(carpeta) currentFolder = carpeta;
    navigate(vista);
    const c = document.getElementById('content');
    const visible = e => { const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const acciones = [...c.querySelectorAll('[onclick]')].filter(visible).map(e => {
      const on = e.getAttribute('onclick') || '';
      const fn = (on.match(/([a-zA-Z_$][\w$]*)\s*\(/) || [])[1] || on.slice(0, 24);
      return {fn, strict: !!e.closest('.owner-strict'), only: !!e.closest('.owner-only')};
    });
    return {
      texto: (c.innerText || '').slice(0, 400),
      vacia: (c.innerText || '').trim().length < 30,
      acciones,
      strictVisibles: [...new Set(acciones.filter(a => a.strict).map(a => a.fn))],
      onlyVisibles:   [...new Set(acciones.filter(a => a.only).map(a => a.fn))],
      fns: [...new Set(acciones.map(a => a.fn))],
    };
  }, {vista, carpeta});
}

const VISTAS_COCINA = ['comandascocina','carta','idr','proveedores','megalista',
  'escandallo','fichas','pedidos','stock','horarios','distribucion','limpieza'];
const VISTAS_SALA = ['tpv','reservas','clientes','promocion','carta','stock',
  'horarios','distribucion','limpieza'];
const VISTAS_GESTION = ['manual','minegocio','dashboard','economia'];

// ── 1. Lo que está escondido no se puede ejecutar igualmente ───────────────
await caso('Ningún botón de "solo propietario" se ve en una sesión de empleado', async ()=>{
  const fugas = [];
  for(const [nombre, modo] of Object.entries(MODOS)){
    if(nombre === 'propietario') continue;
    await entrarComo(modo);
    const vistas = modo.area === 'cocina' ? VISTAS_COCINA : VISTAS_SALA;
    for(const v of vistas){
      const r = await radiografia(v, modo.area);
      r.strictVisibles.forEach(fn => fugas.push(`${nombre}/${v}: ${fn}`));
    }
  }
  assert.deepEqual(fugas.slice(0,10), [], `${fugas.length} acciones de propietario a la vista → ${fugas.slice(0,6).join(' · ')}`);
  return 'ninguna acción de propietario visible para un empleado';
});

await caso('Un empleado SIN permiso de edición no ve los botones de editar', async ()=>{
  const fugas = [];
  for(const nombre of ['cocina','sala','salaRepartidor']){
    await entrarComo(MODOS[nombre]);
    const vistas = MODOS[nombre].area === 'cocina' ? VISTAS_COCINA : VISTAS_SALA;
    for(const v of vistas){
      const r = await radiografia(v, MODOS[nombre].area);
      r.onlyVisibles.forEach(fn => fugas.push(`${nombre}/${v}: ${fn}`));
    }
  }
  assert.deepEqual(fugas.slice(0,10), [], `${fugas.length} → ${fugas.slice(0,6).join(' · ')}`);
  return 'sin permiso de edición no se ve ningún botón de editar';
});

await caso('Un empleado CON permiso de edición sí los ve — si no, el permiso no sirve de nada', async ()=>{
  const conEdicion = {};
  for(const nombre of ['cocinaEdicion','salaEdicion']){
    await entrarComo(MODOS[nombre]);
    const vistas = MODOS[nombre].area === 'cocina' ? VISTAS_COCINA : VISTAS_SALA;
    let n = 0;
    for(const v of vistas){
      const r = await radiografia(v, MODOS[nombre].area);
      n += r.onlyVisibles.length;
    }
    conEdicion[nombre] = n;
  }
  assert.ok(conEdicion.cocinaEdicion > 0, 'un jefe de cocina con edición no puede editar NADA');
  assert.ok(conEdicion.salaEdicion > 0, 'un jefe de sala con edición no puede editar NADA');
  return `cocina ${conEdicion.cocinaEdicion} acciones · sala ${conEdicion.salaEdicion}`;
});

// ── 2. Gestión es del propietario, y no se entra por la puerta de atrás ────
await caso('Gestión Económica no se abre desde una sesión de empleado', async ()=>{
  const fugas = [];
  for(const nombre of ['cocina','cocinaEdicion','sala','salaEdicion','salaRepartidor']){
    await entrarComo(MODOS[nombre]);
    for(const v of VISTAS_GESTION){
      /* La app NO pinta una pantalla de "esto es del propietario": avisa con
         un mensaje y te devuelve a tu carpeta (denyGestionAccess). Así que
         hay que cazar el aviso, no leer el contenido — que a esas alturas ya
         es el de la carpeta del empleado. */
      const abierto = await page.evaluate((v)=>{
        let aviso = null;
        const original = window.showToast;
        window.showToast = m => { aviso = String(m); };
        currentFolder = 'gestion';
        // renderView es la última barrera real: se llama directamente para
        // probar también el atajo por consola, no solo el camino del menú.
        renderView(v);
        window.showToast = original;
        const txt = (document.getElementById('content').innerText||'');
        return {avisado: !!aviso, aviso, pista: txt.slice(0,60).replace(/\s+/g,' ')};
      }, v);
      if(!abierto.avisado) fugas.push(`${nombre}/${v}: entró sin avisar — "${abierto.pista}"`);
    }
  }
  assert.deepEqual(fugas.slice(0,8), [], `${fugas.length} vistas de Gestión abiertas a un empleado → ${fugas.slice(0,4).join(' · ')}`);
  return 'las 4 vistas de Gestión, cerradas en los 5 modos de empleado';
});

await caso('Los módulos de coste no se abren sin permiso de edición', async ()=>{
  /* Carta, Proveedores, Mega Lista y Escandallo enseñan precios de compra y
     márgenes. Se ocultan de la carpeta, pero eso no basta: navigate() a mano
     los abría igual. */
  const fugas = [];
  for(const nombre of ['cocina','sala','salaRepartidor']){
    await entrarComo(MODOS[nombre]);
    for(const v of ['carta','proveedores','megalista','escandallo']){
      const r = await page.evaluate(({v, area})=>{
        currentFolder = area; navigate(v);
        return {bloqueado: isReadonlyLockedModule(v),
                texto: (document.getElementById('content').innerText||'').slice(0,50)};
      }, {v, area: MODOS[nombre].area});
      if(!r.bloqueado) fugas.push(`${nombre}/${v}`);
    }
  }
  assert.deepEqual(fugas, [], `${fugas.length} módulos de coste abiertos → ${fugas.join(' · ')}`);
  return 'los 4 módulos de coste, cerrados sin permiso de edición';
});

// ── 3. Nada de lo que se VE puede fallar en silencio ───────────────────────
await caso('Guardar un empleado desde una sesión que no puede AVISA, no calla', async ()=>{
  /* Lo encontró el dueño: entró como cocinero con edición y "no le dejaba
     editar los empleados". El botón está oculto a propósito (.owner-strict:
     la ficha de un compañero es cosa del propietario), pero si por cualquier
     camino se llega al formulario, saveEmployee hacía `return` a secas. El
     empleado rellena, pulsa Guardar, la ventana se queda ahí y no pasa nada.
     Un permiso que se niega sin decirlo se lee como una app rota. */
  await entrarComo(MODOS.cocinaEdicion);
  const r = await page.evaluate((id)=>{
    currentFolder = 'cocina'; navigate('horarios');
    openEmployeeModal(id);
    const hay = !!document.getElementById('emp-name');
    let aviso = null;
    const toastOriginal = window.showToast, alertOriginal = window.alertModal;
    window.showToast = m => { aviso = String(m); };
    window.alertModal = m => { aviso = String(m); return Promise.resolve(); };
    try{ saveEmployee(id); } catch(e){ aviso = 'EXCEPCIÓN: ' + e.message; }
    window.showToast = toastOriginal; window.alertModal = alertOriginal;
    return {formulario: hay, aviso};
  }, IDS.cocina);
  assert.ok(r.formulario, 'el formulario debería haberse abierto para la prueba');
  assert.ok(r.aviso && !/EXCEPCIÓN/.test(r.aviso),
    `guardar tenía que avisar de que no puede, y ${r.aviso ? 'lanzó ' + r.aviso : 'no dijo nada'}`);
  return `avisa: "${String(r.aviso).slice(0,52)}"`;
});

await caso('Un empleado no puede cambiar la ficha de un compañero ni llamando a la función', async ()=>{
  await entrarComo(MODOS.cocinaEdicion);
  const r = await page.evaluate((id)=>{
    const antes = DB.employees.find(e => e.id === id).name;
    currentFolder = 'cocina'; navigate('horarios');
    openEmployeeModal(id);
    const campo = document.getElementById('emp-name');
    if(campo) campo.value = 'NOMBRE CAMBIADO A MANO';
    const toastOriginal = window.showToast, alertOriginal = window.alertModal;
    window.showToast = () => {}; window.alertModal = () => Promise.resolve();
    try{ saveEmployee(id); } catch(e){}
    window.showToast = toastOriginal; window.alertModal = alertOriginal;
    return {antes, despues: DB.employees.find(e => e.id === id).name};
  }, IDS.cocina);
  assert.equal(r.despues, r.antes, `le ha cambiado el nombre al compañero: "${r.despues}"`);
  return 'la ficha del compañero queda intacta';
});

// ── 4. Cada uno ve SU área, y el repartidor lo suyo ────────────────────────
await caso('Un empleado solo entra en su área', async ()=>{
  const fugas = [];
  for(const nombre of ['cocina','cocinaEdicion','sala','salaEdicion','salaRepartidor']){
    const modo = MODOS[nombre];
    await entrarComo(modo);
    const otra = modo.area === 'cocina' ? 'sala' : 'cocina';
    const abre = await page.evaluate((otra)=>{
      currentFolder = otra; navigate('folder');
      return !isOperationalAreaLocked('folder');
    }, otra);
    if(abre) fugas.push(`${nombre} entra en ${otra}`);
  }
  assert.deepEqual(fugas, [], fugas.join(' · '));
  return 'cocina no entra en sala y sala no entra en cocina';
});

await caso('El repartidor ve el control de repartos, y el resto de sala también', async ()=>{
  /* "Es repartidor" no es un modo de sesión aparte: es una casilla de la
     ficha que mete al empleado en el reparto AUTOMÁTICO de pedidos a
     domicilio. Conviene tenerlo claro y comprobar que no cambia lo que ve:
     si cambiara, sería un cuarto modo sin documentar. */
  const vistos = {};
  for(const nombre of ['sala','salaRepartidor']){
    await entrarComo(MODOS[nombre]);
    const r = await radiografia('tpv', 'sala');
    vistos[nombre] = r.fns.sort().join(',');
  }
  assert.equal(vistos.sala, vistos.salaRepartidor,
    'ser repartidor NO debería cambiar lo que se ve en el TPV, y lo cambia');
  const hayControl = await page.evaluate(()=> typeof openRepartosControlModal === 'function');
  assert.ok(hayControl, 'el control de repartos tiene que existir');
  const enTurno = await page.evaluate((id)=>{
    // El reparto automático solo debe caer en quien está de turno AHORA.
    DB.turnos = [];
    return typeof repartidoresDisponibles === 'function'
      ? repartidoresDisponibles().length : null;
  }, IDS.salaReparto);
  return `mismo TPV para los dos${enTurno === 0 ? ' · sin turno, no entra en el reparto' : ''}`;
});

await caso('Ningún error de JavaScript en ninguno de los seis modos', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales.slice(0,5), [], reales.slice(0,3).join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
