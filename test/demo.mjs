// La demo: que abra sin pedir nada y con datos creíbles.
//
// La anterior era una copia suelta de junio y llevaba tres meses enseñando
// una app que ya no existía. Esta se genera desde dist/index.html en cada
// build, así que la prueba de verdad es que SIEMPRE coincida con la versión
// publicada y que no se quede en ningún asistente del alta.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

await caso('La demo lleva la MISMA versión que la app publicada', async ()=>{
  assert.ok(fs.existsSync('dist/kit-gastrogoan-DEMO.html'), 'hay que generarla: bash demo/generar.sh');
  const app = fs.readFileSync('dist/index.html','utf8').match(/GG_BUILD = '([^']+)'/)[1];
  const demo = fs.readFileSync('dist/kit-gastrogoan-DEMO.html','utf8').match(/GG_BUILD = '([^']+)'/)[1];
  assert.equal(demo, app, 'la demo tiene que salir de la app recién compilada, no ser una copia aparte');
  return app;
});

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/dist/kit-gastrogoan-DEMO.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));

await caso('Abre directa, sin licencia, sin nube y sin login', async ()=>{
  const r = await page.evaluate(()=>({
    gates: ['netlify-gate','license-gate','firebase-gate','extconn-gate','revoked-gate']
      .filter(id => !!document.getElementById(id)),
    accesoVisible: (()=>{ const e=document.getElementById('access-select-screen'); return !!e && !e.classList.contains('hide'); })(),
    selectorVisible: (()=>{ const e=document.getElementById('business-select-screen'); return !!e && !e.classList.contains('hide'); })(),
    enInicio: !!document.querySelector('#view-home.active'),
    sello: [...document.querySelectorAll('div')].some(d => d.textContent === 'DEMO'),
  }));
  assert.deepEqual(r.gates, [], 'no puede quedarse en ningún asistente del alta: ' + r.gates.join(', '));
  assert.ok(!r.accesoVisible && !r.selectorVisible, 'ni pedir acceso');
  assert.ok(r.enInicio, 'tiene que arrancar en la pantalla de inicio');
  assert.ok(r.sello, 'y llevar la marca DEMO visible');
  return 'entra directa a la app';
});

await caso('Los datos son coherentes: la carta cuadra con el escandallo', async ()=>{
  const r = await page.evaluate(()=>{
    const platos = DB.recipes.filter(x => !x.isBase);
    const fc = platos.filter(p => p.price > 0).map(p => ({n:p.name, pct: recipeCost(p)/p.price*100}));
    const carta = DB.cartas[0];
    const enCarta = carta.secciones.flatMap(s => s.platos);
    return {
      ingredientes: DB.ingredients.length,
      platos: platos.length,
      bases: DB.recipes.filter(x => x.isBase).length,
      enCarta: enCarta.length,
      todosVinculados: enCarta.every(p => DB.recipes.some(r => r.id === p.recipeId)),
      foodCosts: fc,
      encadenado: platos.some(p => (p.ingredients||[]).some(l => l.type === 'base')),
      ventas: DB.sales.length,
      empleados: DB.employees.length,
      turnos: DB.turnos.length,
      reservas: DB.reservations.length,
    };
  });
  assert.ok(r.ingredientes >= 25, 'una demo con cuatro ingredientes no convence a nadie');
  assert.ok(r.enCarta >= 6 && r.todosVinculados, 'cada plato de la carta debe apuntar a su ficha');
  assert.ok(r.bases >= 1 && r.encadenado, 'debe enseñarse una elaboración base encadenada a un plato');
  // Lo que más se nota si está mal: un food cost imposible
  const malos = r.foodCosts.filter(x => x.pct < 12 || x.pct > 45);
  assert.deepEqual(malos, [], 'food costs fuera de rango, se le nota a un hostelero: ' + JSON.stringify(malos));
  assert.ok(r.ventas > 1000, 'hacen falta ventas para que los paneles tengan de dónde tirar');
  assert.ok(r.turnos > 20 && r.reservas >= 3 && r.empleados >= 4, 'y equipo, turnos y reservas');
  return `${r.ingredientes} ingredientes · ${r.platos} platos · ${r.ventas} ventas · food cost ${Math.min(...r.foodCosts.map(x=>x.pct)).toFixed(0)}-${Math.max(...r.foodCosts.map(x=>x.pct)).toFixed(0)}%`;
});

await caso('Se puede recorrer la app entera sin que reviente', async ()=>{
  const vistas = ['home','folder','dashboard','escandallo','fichas','carta','tpv','stock','proveedores','empleados','reservas','clientes','idr'];
  const problemas = [];
  for(const v of vistas){
    const ok = await page.evaluate((vista)=>{
      try{ navigate(vista); return true; }catch(e){ return String(e.message); }
    }, v);
    if(ok !== true) problemas.push(v + ': ' + ok);
    await new Promise(r=>setTimeout(r,120));
  }
  assert.deepEqual(problemas, [], problemas.join(' | '));
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|firebase|net::/i.test(e));
  assert.deepEqual(reales, [], 'errores por el camino: ' + reales.join(' | '));
  return `${vistas.length} pantallas recorridas, sin errores`;
});

await caso('No escribe en ninguna nube de verdad', async ()=>{
  const r = await page.evaluate(()=>({
    url: (DB.business.ownFirebase||{}).databaseURL || '',
    code: (getLicense()||{}).code,
  }));
  assert.ok(/demo/i.test(r.url), 'la nube de la demo tiene que ser falsa: ' + r.url);
  assert.equal(r.code, 'DEMO2026', 'y su licencia, reconocible');
  return 'nube falsa y licencia DEMO2026';
});

await caso('Las pantallas de datos salen LLENAS, no con guiones', async ()=>{
  /* La demo tenía clientes y reservas con nombres de campo inventados: la app
     no reventaba, pero pintaba una tabla de "—" y ceros. En un vídeo de venta
     eso es peor que no enseñar la pantalla. */
  const r = await page.evaluate(()=>{
    const out = {};
    navigate('clientes');
    const filas = [...document.querySelectorAll('#clientes-tbody tr')];
    out.clientes = filas.length;
    out.conNombre = filas.filter(f => {
      const t = (f.children[0]||{}).textContent || '';
      return t.trim() && t.trim() !== '—';
    }).length;
    out.conVisitas = filas.filter(f => !/^0\s*$/.test(((f.children[2]||{}).textContent||'').trim())).length;
    navigate('reservas');
    out.reservasEnDB = (DB.reservations||[]).length;
    out.reservasConNombre = (DB.reservations||[]).filter(x => x.clientName && x.date && x.time).length;
    out.ventasConCliente = (DB.sales||[]).filter(v => v.clientId).length;
    out.nubeVerde = lastSyncBadgeState === 'online';
    out.ventasHoy = (DB.sales||[]).filter(v => v.date === todayStr()).length;
    return out;
  });
  assert.ok(r.clientes >= 3, 'la tabla de clientes no puede estar vacía');
  assert.equal(r.conNombre, r.clientes, 'todos con nombre, ninguno en "—"');
  assert.ok(r.conVisitas >= 3, 'y con visitas de verdad, no ceros: ' + r.conVisitas);
  assert.equal(r.reservasConNombre, r.reservasEnDB, 'las reservas, con nombre y fecha');
  assert.ok(r.ventasConCliente > 200, 'y ventas ligadas a clientes para el ticket medio');
  assert.ok(r.nubeVerde, 'el indicador de nube no puede salir en rojo en un vídeo de venta');
  assert.ok(r.ventasHoy >= 4, 'tiene que haber ventas de HOY: el TPV y el panel enseñan justo esas cifras y salían a cero (' + r.ventasHoy + ')');
  return `${r.clientes} clientes · ${r.ventasConCliente} ventas con cliente · ${r.ventasHoy} de hoy`;
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
