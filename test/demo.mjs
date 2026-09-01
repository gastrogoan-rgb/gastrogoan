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

await caso('Las cuentas del negocio son las de un bistró que va bien', async ()=>{
  /* Tres cosas se torcieron aquí, y las tres se veían en el vídeo:
     1) No había NI UN gasto: el resultado del mes salía igual que la
        facturación. Un P&L con costes a cero delata una demo al instante.
     2) Al meterlos con cifras infladas, el mes pasado salía en PÉRDIDAS.
     3) Y el mes se guardaba en base 1 cuando la app lo guarda en BASE 0
        (enero = 0, como Date.getMonth() — ver operations.js): las compras de
        agosto contaban como de septiembre y el panel enseñaba 4.926 € de
        gastos contra 181 € de ventas, con −13.371 € en rojo. */
  const r = await page.evaluate(()=>{
    const hoy = new Date();
    const f = new Date(hoy); f.setMonth(f.getMonth() - 1);
    const año = f.getFullYear(), mes = f.getMonth();   // BASE 0, como la app
    const neta = geFacturacionNetaMes(año, mes);
    return {
      neta,
      variables: geTotalVariablesNetoMes(año, mes),
      fijos: geTotalFijosNetoForMonth(año, mes),
      resultado: geResultadoAntesImpMes(año, mes),
      // La convención del campo `mes`, que es donde estuvo el fallo
      mesesUsados: [...new Set((DB.ge.variables||[]).map(v => v.mes))].sort((a,b)=>a-b),
    };
  });
  assert.ok(r.neta > 10000, 'un mes cerrado tiene que tener facturación de verdad');
  assert.ok(r.variables > 0 && r.fijos > 0, 'y gastos: sin ellos el P&L es de mentira');
  assert.ok(r.mesesUsados.every(m => m >= 0 && m <= 11),
    'el mes se guarda en base 0 como en la app: ' + r.mesesUsados.join(','));
  const fc = r.variables / r.neta * 100;
  const margen = r.resultado / r.neta * 100;
  assert.ok(fc > 25 && fc < 42, `el food cost del mes tiene que ser creíble, es ${fc.toFixed(1)}%`);
  assert.ok(margen > 5 && margen < 25, `y el margen también: ${margen.toFixed(1)}%`);
  assert.ok(r.resultado > 0, 'una demo que enseña un restaurante en pérdidas no vende nada');
  return `${Math.round(r.neta)} € netos · food cost ${fc.toFixed(1)}% · margen ${margen.toFixed(1)}%`;
});

await caso('El guion del vídeo no apunta a ninguna pantalla inexistente', async ()=>{
  /* `navigate('empleados')` no da error: deja la pantalla EN BLANCO. En el
     vídeo salía el rótulo "Personal — turnos, fichajes y nóminas" sobre un
     fondo vacío, y así se grabó una vez entera. */
  /* Ahora las escenas son funciones, no objetos: se mira el código fuente del
     guion, que es donde están los navigate(). Y se comprueban LOS DOS
     guiones, porque son dos vídeos distintos y cada uno puede equivocarse por
     su cuenta. */
  const reales = fs.readFileSync('index.html','utf8').match(/id="view-[a-z-]*"/g).map(s => s.slice(9,-1));
  const detalle = [];
  for(const [fichero, minimo] of [['guion-completo.js', 18], ['guion-venta.js', 6]]){
    const src = fs.readFileSync('video/' + fichero, 'utf8');
    const usadas = [...new Set([...src.matchAll(/navigate\('(\w+)'\)/g)].map(m => m[1]))];
    const inexistentes = usadas.filter(v => !reales.includes(v));
    assert.deepEqual(inexistentes, [], `${fichero}: vistas que no existen — ${inexistentes.join(', ')}`);
    assert.ok(usadas.length >= minimo,
      `${fichero}: solo recorre ${usadas.length} vistas, se esperaban ${minimo} o más`);
    detalle.push(`${fichero.replace('guion-','').replace('.js','')} ${usadas.length}`);
  }
  // El completo tiene que entrar en las carpetas COMPARTIDAS una sola vez:
  // repetirlas en Sala alargaba el vídeo sin enseñar nada nuevo.
  const comp = fs.readFileSync('video/guion-completo.js', 'utf8');
  ['megalista','escandallo','fichas','proveedores','limpieza'].forEach(v => {
    const veces = [...comp.matchAll(new RegExp(`navigate\\('${v}'\\)`, 'g'))].length;
    assert.equal(veces, 1, `${v} sale ${veces} veces en el recorrido completo, tiene que salir 1`);
  });
  return `vistas reales: ${detalle.join(' · ')}, y ninguna carpeta compartida repetida`;
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
