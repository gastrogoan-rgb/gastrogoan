// R37 — La puesta a punto.
//
// El panel que le dice al cliente qué le falta por configurar. Lo pidió el
// dueño: un cliente termina el asistente de la nube —el único paso
// obligatorio— y se queda mirando la app sin saber qué le toca.
//
// Lo que se comprueba aquí no es que "salga bonito", es lo que lo convierte
// en un asistente en vez de en una regañina:
//   · que se CALCULE del dato real y no de una marca guardada,
//   · que no haya ni una cruz (una cruz roja se lee como error, y esto es lo
//     primero que ve alguien que acaba de pagar),
//   · que lo opcional no cuente para el progreso, o el panel no llegaría
//     nunca al 100% y se aprendería a ignorarlo,
//   · que cada línea lleve de verdad a su pantalla,
//   · y que un empleado no lo vea jamás.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280, height:1000});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PUESTA01', tenantId: ggBizTenantId('PUESTA01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2600));

// Un negocio recién dado de alta: la nube puesta y nada más. Es el estado
// exacto en el que se queda un cliente al terminar el asistente.
const reset = async () => {
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
      .forEach(id => document.getElementById(id)?.remove());
    localStorage.removeItem('gastrogoan_puesta_oculta');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true,
      tourSeen:true, categoryIconHintSeen:true, name:'', horario: defaultHorario()});
    DB.business.ownFirebase = {apiKey:'f', databaseURL:'https://f-default-rtdb.firebaseio.com'};
    DB.employees = []; DB.tables = []; DB.cartas = []; DB.recipes = [];
    (DB.ingredients||[]).forEach(i => { i.packPrice = 0; i.price = 0; });
    saveDB(); navigate('home');
  });
  await new Promise(r => setTimeout(r, 250));
};

await caso('Un negocio recién dado de alta no tiene NADA hecho', async ()=>{
  await reset();
  const r = await page.evaluate(()=>{
    const x = puestaAPuntoTareas();
    return {hechas: x.hechas, total: x.total, visible: puestaAPuntoVisible(),
            pintado: !!document.querySelector('#home-puesta .pp-card')};
  });
  assert.equal(r.hechas, 0, `debería empezar de cero y empieza con ${r.hechas} hechas`);
  assert.ok(r.total >= 6, 'y tener tareas de verdad');
  assert.ok(r.visible && r.pintado, 'el panel tiene que verse en el inicio');
  return `0 de ${r.total}, y el panel a la vista`;
});

await caso('El horario que viene de fábrica NO cuenta como hecho', async ()=>{
  /* Todo negocio nace con un horario por defecto. Si "tiene horario" contara,
     la tarea saldría hecha sin que nadie la haya mirado — y el cliente se
     encontraría la web pública aceptando reservas en horas en las que cierra. */
  await reset();
  const antes = await page.evaluate(()=> puestaAPuntoTareas().esencial.find(x=>x.id==='horario').hecho);
  const despues = await page.evaluate(()=>{
    const h = DB.business.horario;
    if(Array.isArray(h) && h[0]) h[0].abierto = !h[0].abierto;   // lo toca
    saveDB();
    return puestaAPuntoTareas().esencial.find(x=>x.id==='horario').hecho;
  });
  assert.equal(antes, false, 'el horario de fábrica no está revisado');
  assert.equal(despues, true, 'y en cuanto lo toca, sí');
  return 'distingue el de fábrica del suyo';
});

await caso('Se calcula del dato real, no de una marca guardada', async ()=>{
  /* Si guardáramos "personal: hecho", al borrar a todos sus empleados el panel
     seguiría diciendo que está. Le estaría mintiendo justo donde más duele. */
  await reset();
  const r = await page.evaluate(()=>{
    const emp = () => puestaAPuntoTareas().esencial.find(x => x.id === 'personal').hecho;
    const vacio = emp();
    DB.employees.push({id:genId(), name:'Ana', rol:'x', area:'cocina', active:true, color:'#DF7039', pin:'H2:x'});
    saveDB();
    const conUno = emp();
    DB.employees = [];
    saveDB();
    return {vacio, conUno, vueltaAVaciar: emp()};
  });
  assert.equal(r.vacio, false);
  assert.equal(r.conUno, true, 'al dar de alta a alguien tiene que marcarse');
  assert.equal(r.vueltaAVaciar, false, 'y al borrarlos, desmarcarse — si no, miente');
  return 'sube y baja con los datos de verdad';
});

await caso('Los 275 ingredientes sembrados no cuentan: cuentan los que tienen PRECIO', async ()=>{
  /* Todo negocio nace con el catálogo entero a precio cero. Contar
     "ingredientes dados de alta" daría 275 desde el primer día y la tarea
     nacería hecha, cuando lo que hace falta —y lo que hace que el escandallo
     deje de salir a cero— es que les ponga SU precio. */
  await reset();
  const r = await page.evaluate(()=>{
    const tarea = () => puestaAPuntoTareas().esencial.find(x => x.id === 'precios');
    const total = (DB.ingredients||[]).length;
    const alPrincipio = tarea();
    /* UNO basta, como en todas las demás tareas. Con cinco, el dueño ponía
       un precio, volvía al inicio y la tarea seguía pendiente sin explicar
       por qué: se leía como que no se iba nunca. */
    (DB.ingredients||[]).slice(0, 1).forEach(i => { i.packPrice = 10; });
    saveDB();
    return {total, hechoAlPrincipio: alPrincipio.hecho, datoAlPrincipio: alPrincipio.dato,
            hechoDespues: tarea().hecho};
  });
  assert.ok(r.total > 100, 'el catálogo se siembra entero: ' + r.total);
  assert.equal(r.hechoAlPrincipio, false, 'con todo a cero no puede estar hecha');
  assert.equal(r.datoAlPrincipio, 0, 'y el contador tiene que decir 0, no 275');
  assert.equal(r.hechoDespues, true, 'con UN solo precio puesto, hecha');
  return `${r.total} sembrados, 0 con precio al empezar`;
});

await caso('Ni una cruz: lo pendiente es un círculo vacío', async ()=>{
  /* Una cruz roja se lee como "algo ha ido mal", y esto es lo primero que ve
     alguien que acaba de pagar por la app. */
  await reset();
  const r = await page.evaluate(()=>{
    const c = document.querySelector('#home-puesta');
    const iconos = [...c.querySelectorAll('.pp-marca i')].map(i => i.className);
    return {iconos, hayCruz: iconos.some(x => /ti-(x|circle-x|square-x|alert)/.test(x))};
  });
  assert.equal(r.hayCruz, false, 'hay cruces: ' + r.iconos.join(', '));
  assert.ok(r.iconos.some(x => /ti-circle\b/.test(x)), 'lo pendiente debe ser un círculo vacío');
  return 'círculos vacíos y ticks, ninguna cruz';
});

await caso('Lo opcional no cuenta para el progreso', async ()=>{
  /* El cobro con tarjeta o los correos no los quiere todo el mundo. Si
     contaran, un restaurante que no los usa nunca llegaría al 100% y el panel
     se quedaría ahí para siempre hasta que se aprende a ignorarlo. */
  const r = await page.evaluate(()=>{
    const x = puestaAPuntoTareas();
    return {total: x.total, esenciales: x.esencial.length, opcionales: x.opcional.length};
  });
  assert.equal(r.total, r.esenciales, 'el progreso solo puede contar lo esencial');
  assert.ok(r.opcionales >= 3, 'y lo opcional tiene que estar, pero aparte');
  return `${r.esenciales} cuentan · ${r.opcionales} son opcionales`;
});

await caso('Cuando está todo hecho, el panel se va solo', async ()=>{
  await reset();
  const r = await page.evaluate(()=>{
    DB.business.name = 'Cal Ramon';
    if(Array.isArray(DB.business.horario) && DB.business.horario[0])
      DB.business.horario[0].abierto = !DB.business.horario[0].abierto;
    (DB.ingredients||[]).slice(0, 8).forEach(i => { i.packPrice = 10; });
    DB.employees.push({id:genId(), name:'Ana', rol:'x', area:'cocina', active:true, color:'#DF7039', pin:'H2:x'});
    DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
    const rid = genId();
    DB.recipes.push({id:rid, name:'Plato', area:'cocina', isBase:false, price:12, ivaPct:10,
                     category:'x', ingredients:[]});
    DB.cartas.push({id:genId(), nombre:'CARTA', area:'cocina', horario: defaultItemHorario(),
      secciones:[{id:genId(), nombre:'Principales', platos:[{id:genId(), recipeId:rid,
        nombre:'Plato', precio:12, ivaPct:10, disponible:true}]}]});
    saveDB(); navigate('home');
    const x = puestaAPuntoTareas();
    return {completa: x.completa, hechas: x.hechas, total: x.total,
            visible: puestaAPuntoVisible(),
            pintado: !!document.querySelector('#home-puesta .pp-card')};
  });
  assert.ok(r.completa, `debería estar completa y va ${r.hechas}/${r.total}`);
  assert.equal(r.visible, false, 'completa, ya no tiene nada que decir');
  assert.equal(r.pintado, false, 'y no debería quedar pintada');
  return `${r.hechas} de ${r.total}, y desaparece`;
});

await caso('Se puede esconder, y se recupera desde Mi Negocio', async ()=>{
  /* Que se pueda quitar es del cliente, no nuestro. Pero un panel que
     desaparece para siempre sin decir dónde estaba es peor que no tenerlo. */
  await reset();
  const r = await page.evaluate(()=>{
    const avisos = [];
    const original = window.showToast;
    window.showToast = m => avisos.push(String(m));
    ocultarPuestaAPunto();
    const trasOcultar = {visible: puestaAPuntoVisible(),
                         pintado: !!document.querySelector('#home-puesta .pp-card')};
    window.showToast = original;
    mostrarPuestaAPunto();
    return {trasOcultar, avisos, vuelve: puestaAPuntoVisible()};
  });
  assert.equal(r.trasOcultar.visible, false, 'al ocultarla tiene que irse');
  assert.equal(r.trasOcultar.pintado, false);
  assert.ok(r.avisos.length && /Mi Negocio|Meu Negoci|My Business/i.test(r.avisos[0]),
    'y decir dónde encontrarla: ' + (r.avisos[0] || '(no dijo nada)'));
  assert.ok(r.vuelve, 'y poder volver');
  return 'se quita, avisa dónde está, y vuelve';
});

await caso('Un empleado no ve la puesta a punto del negocio', async ()=>{
  await reset();
  const r = await page.evaluate(()=>{
    const id = genId();
    DB.employees.push({id, name:'Ana', rol:'x', area:'cocina', active:true,
                       color:'#DF7039', pin:'H2:x', pinChanged:true});
    saveDB();
    localStorage.setItem('gastrogoan_access_session',
      JSON.stringify({type:'employee', employeeId:id, area:'cocina', ts:Date.now()}));
    return puestaAPuntoVisible();
  });
  assert.equal(r, false, 'un empleado no tiene que ver la configuración del negocio');
  return 'solo el propietario';
});

await caso('Cada línea lleva a una pantalla que existe de verdad', async ()=>{
  /* navigate('ingredientes') no da error: deja la pantalla EN BLANCO. Un
     asistente que te manda a una pantalla vacía es peor que no tenerlo. */
  await reset();
  const vistas = readFileSync('index.html','utf8').match(/id="view-[a-z-]*"/g).map(s => s.slice(9,-1));
  const destinos = await page.evaluate(()=>{
    const x = puestaAPuntoTareas();
    return [...x.esencial, ...x.opcional].map(tr => ({id: tr.id, ir: tr.ir}));
  });
  const malos = [];
  destinos.forEach(d => {
    const m = (d.ir || '').match(/navigate\('(\w+)'\)/);
    if(!m) return malos.push(`${d.id}: no navega a ninguna parte`);
    if(!vistas.includes(m[1])) malos.push(`${d.id} → ${m[1]} (no existe)`);
  });
  assert.deepEqual(malos, [], malos.join(' · '));
  // Y que al pulsarlas se llegue de verdad, sin quedarse en blanco.
  const vacias = await page.evaluate((ds)=>{
    const out = [];
    ds.forEach(d => {
      try{ (new Function(d.ir))(); }catch(e){ out.push(`${d.id}: ${e.message}`); return; }
      const txt = (document.getElementById('content').innerText||'').trim();
      if(txt.length < 40) out.push(`${d.id}: pantalla en blanco`);
    });
    return out;
  }, destinos);
  assert.deepEqual(vacias, [], vacias.join(' · '));
  return `${destinos.length} destinos, todos reales y con contenido`;
});

await caso('Ningún error de JavaScript', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales.slice(0,4), [], reales.slice(0,2).join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
