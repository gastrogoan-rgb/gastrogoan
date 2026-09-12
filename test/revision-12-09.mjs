// Repaso pedido por el dueño el 12/09 recorriendo la app con datos reales.
// Nueve cosas, casi todas de las que solo se ven usando la app de verdad:
// huecos en blanco, campos que cortan el texto, cifras que no cuadran entre
// pantallas y un semáforo que decía verde donde tenía que decir rojo.
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
}, 'REVISION1209');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.business.tiposServicio = {mesa:true, takeaway:true, delivery:true};
  editUnlocked = true;
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Mi Negocio: las tarjetas fluyen en mampostería, sin dejar huecos de cientos de píxeles', async () => {
  const r = await page.evaluate(async ()=>{
    navigate('minegocio');
    await new Promise(r=>setTimeout(r,1000));
    const grid = document.querySelector('#minegocio-content .mn-grid');
    const cs = getComputedStyle(grid);
    const cards = [...grid.querySelectorAll('.card')];
    const sumaAlturas = cards.reduce((s,c)=>s+c.getBoundingClientRect().height, 0);
    return {
      columnas: cs.columnCount,
      altoBloque: Math.round(grid.getBoundingClientRect().height),
      sumaAlturas: Math.round(sumaAlturas),
      tarjetas: cards.length,
    };
  });
  assert.ok(parseInt(r.columnas) >= 2, 'debe repartir en columnas: ' + JSON.stringify(r));
  // Con dos columnas bien empaquetadas, el bloque ocupa en torno a la mitad
  // de la suma de sus tarjetas. Con la rejilla anterior, una tarjeta muy
  // alta estiraba la fila entera y esto se iba muy por encima.
  const ratio = r.altoBloque / r.sumaAlturas;
  assert.ok(ratio < 0.75, `el bloque ocupa ${(ratio*100).toFixed(0)}% de la suma de sus tarjetas — con dos columnas debería rondar el 50-60%: ` + JSON.stringify(r));
});

await caso('Mantenimiento: responsable y notas muestran el texto entero, sin cortarlo', async () => {
  const r = await page.evaluate(async ()=>{
    DB.limpieza = DB.limpieza || {};
    DB.limpieza.mantenimiento = [{id: 1, nombre:'Campana extractora', ultimo:'2026-06-09', proximo:'2026-12-09',
      responsable:'Empresa externa de mantenimiento', estado:'OK',
      notas:'Limpieza semestral obligatoria por normativa', zona:'cocina'}];
    navigate('limpieza'); setLimpiezaTab('mantenimiento');
    await new Promise(r=>setTimeout(r,700));
    return [...document.querySelectorAll('#limpieza-tab-content tbody input[type=text]')]
      .map(i => ({valor: i.value, cabe: i.scrollWidth <= i.clientWidth + 2, ancho: Math.round(i.getBoundingClientRect().width)}));
  });
  assert.equal(r.length, 2, 'deben estar los dos campos (responsable y notas)');
  r.forEach(c => assert.ok(c.cabe, `"${c.valor}" no cabe en su casilla (${c.ancho}px)`));
});

await caso('Panel: el análisis de ventas va por MES natural, igual que el resto de la app', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    const dd = n => String(n).padStart(2,'0');
    const enEsteMes = `${y}-${dd(m+1)}-05`;
    // Una venta de hace 20 días que cae en el mes ANTERIOR: con la ventana
    // móvil de 30 días entraba en el cálculo; por mes natural, no.
    const hace20 = new Date(hoy); hace20.setDate(hace20.getDate()-20);
    const fueraDelMes = `${hace20.getFullYear()}-${dd(hace20.getMonth()+1)}-${dd(hace20.getDate())}`;
    DB.sales = [
      {id:'a', date: enEsteMes, createdAt: enEsteMes+'T14:00:00.000Z', total: 100, items:[], metodoPago:'Tarjeta', tipo:'mesa'},
      {id:'b', date: fueraDelMes, createdAt: fueraDelMes+'T14:00:00.000Z', total: 900, items:[], metodoPago:'Tarjeta', tipo:'mesa'},
    ];
    saveDB();
    navigate('dashboard');
    await new Promise(r=>setTimeout(r,1400));
    return {
      texto: document.getElementById('dashboard-sales-analysis').innerText,
      mismoMes: hace20.getMonth() === m,
    };
  });
  if(r.mismoMes){ console.log('   (hoy el mes natural y los 30 días coinciden; se comprueba solo que pinta)'); assert.ok(r.texto.length > 10); return; }
  assert.ok(!r.texto.includes('900') && !r.texto.includes('1.000'),
    'la venta del mes anterior no debe contarse en el análisis de este mes: ' + r.texto.slice(0,160));
});

await caso('Panel: los picos de venta se ven hora a hora, no en franjas de cuatro horas', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(); const dd = n => String(n).padStart(2,'0');
    DB.sales = [];
    for(let d = 1; d <= 20; d++){
      const f = new Date(hoy); f.setDate(f.getDate()-d);
      const fecha = `${f.getFullYear()}-${dd(f.getMonth()+1)}-${dd(f.getDate())}`;
      [13, 21, 22].forEach(h => DB.sales.push({id:'v'+d+'_'+h, date: fecha,
        createdAt: `${fecha}T${dd(h)}:30:00`, total: 50 + h, items:[], metodoPago:'Tarjeta', tipo:'mesa'}));
    }
    saveDB();
    navigate('dashboard');
    await new Promise(r=>setTimeout(r,1400));
    const ths = [...document.querySelectorAll('#dashboard-sales-heatmap th')].map(x=>x.innerText.trim()).filter(Boolean);
    return {cabeceras: ths};
  });
  // La etiqueta va en el formato del idioma activo ("21" en español, "9 PM"
  // en inglés), así que se comprueba que las dos horas están por separado,
  // no el texto exacto.
  const cab = r.cabeceras.map(h => h.toLowerCase());
  assert.ok(cab.some(h => /\b21\b/.test(h)) && cab.some(h => /\b22\b/.test(h)),
    'deben verse las 21 y las 22 por separado, no un "20-24h": ' + JSON.stringify(r.cabeceras));
  assert.ok(!cab.some(h => /\d+\s*-\s*\d+/.test(h)), 'ya no debe haber franjas de varias horas: ' + JSON.stringify(r.cabeceras));
});

await caso('Compras: ningún gasto se edita ni se borra — la salida es anularlo', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    DB.ge = DB.ge || {};
    DB.ge.variables = [
      {id: 7001, concepto:'Compras Cárnicas', proveedor:'Cárnicas Vallès', categoria:'MATERIA PRIMA',
       importe: 400, iva: 10, fecha: `${y}-${String(m+1).padStart(2,'0')}-05`, mes: m, 'año': y, auto: true},
      {id: 7002, concepto:'Compra suelta', proveedor:'Otro', categoria:'MATERIA PRIMA',
       importe: 100, iva: 10, fecha: `${y}-${String(m+1).padStart(2,'0')}-06`, mes: m, 'año': y},
    ];
    saveDB();
    navigate('economia'); GE.tab('variables');
    await new Promise(r=>setTimeout(r,900));
    const lista = document.getElementById('gv-list').innerHTML;
    let aviso = null;
    const origToast = window.showToast; window.showToast = msg => { aviso = msg; };
    GE.editGV(7001);          // intentar editarla
    const modalAbierto = !!document.getElementById('gv-importe');
    window.showToast = origToast;
    return {
      hayCandado: lista.includes('ti-lock'),
      hayBorrado: typeof GE.deleteGV !== 'undefined' || typeof GE.deleteGVGroup !== 'undefined',
      sigueExistiendo: DB.ge.variables.some(v => v.id === 7001),
      avisó: !!aviso, modalAbierto,
      seAnula: /anularGVGroup/.test(lista) && /anularGV\(7002\)/.test(lista),
    };
  });
  assert.equal(r.hayBorrado, false, 'ya no debe existir ninguna función de borrado de gastos: ' + JSON.stringify(r));
  assert.ok(r.hayCandado, 'debe verse el candado que explica por qué no se edita: ' + JSON.stringify(r));
  assert.ok(r.sigueExistiendo, 'el gasto sigue en los libros: ' + JSON.stringify(r));
  assert.ok(r.avisó, 'y debe avisar del motivo, no fallar en silencio: ' + JSON.stringify(r));
  assert.equal(r.modalAbierto, false, 'no debe abrirse el modal de edición: ' + JSON.stringify(r));
  assert.ok(r.seAnula, 'la salida es anular, tanto el pedido entero como el gasto suelto: ' + JSON.stringify(r));
});

await caso('Ventas: el desglose por tipo de servicio termina con el total', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2,'0');
    const f = `${y}-${dd(m+1)}-04`;
    DB.sales = [
      {id:'m1', date:f, createdAt:f+'T14:00:00', total:100, tipo:'mesa', items:[], metodoPago:'Tarjeta'},
      {id:'t1', date:f, createdAt:f+'T15:00:00', total:40,  tipo:'takeaway', items:[], metodoPago:'Tarjeta'},
      {id:'d1', date:f, createdAt:f+'T21:00:00', total:60,  tipo:'delivery', items:[], metodoPago:'Tarjeta'},
    ];
    saveDB();
    navigate('economia'); GE.tab('ventas');
    await new Promise(r=>setTimeout(r,1400));
    return document.getElementById('ventas-por-tipo').innerText;
  });
  assert.ok(/total/i.test(r), 'debe aparecer la palabra Total en el desglose: ' + r.replace(/\s+/g,' ').slice(0,150));
  assert.ok(/200/.test(r), 'y la suma de los tres tipos (100+40+60 = 200 €): ' + r.replace(/\s+/g,' ').slice(0,150));
});

await caso('Cuenta de Resultados: la cabecera da el resultado NETO, el de después de impuestos', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2,'0');
    const f = `${y}-${dd(m+1)}-04`;
    DB.sales = [{id:'x1', date:f, createdAt:f+'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta',
      items:[{name:'Plato', qty:1, price:11000, ivaPct:10, recipeId:null}]}];
    DB.ge = DB.ge || {}; DB.ge.fijos = []; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = [];
    DB.ge.config = DB.ge.config || {}; DB.ge.config.pctImpuestoBeneficio = 25;
    saveDB();
    navigate('economia'); GE.tab('cdr');
    await new Promise(r=>setTimeout(r,1400));
    const texto = document.getElementById('cdr-comparison').innerText;
    return {texto, antesDeImp: Math.round(geResultadoAntesImpMes(y, m))};
  });
  // Sin gastos, el resultado antes de impuestos son 10.000 € (11.000 con 10%
  // de IVA) y el neto, tras el 25%, 7.500 €. La cabecera debe dar el neto.
  assert.ok(/7\.?500/.test(r.texto), 'la cabecera debe enseñar el resultado NETO (7.500 €): ' + r.texto.replace(/\s+/g,' ').slice(0,160));
  assert.ok(!/10\.000/.test(r.texto), 'y no el de antes de impuestos (10.000 €): ' + r.texto.replace(/\s+/g,' ').slice(0,160));
  assert.equal(r.antesDeImp, 10000, 'comprobación de partida: antes de impuestos son 10.000 €');
});

await caso('Tesorería: pasarse del objetivo en un GASTO es cruz roja; quedarse corto, tick verde', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2,'0');
    const f = `${y}-${dd(m+1)}-04`;
    DB.sales = [{id:'s1', date:f, createdAt:f+'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta',
      items:[{name:'Plato', qty:1, price:11000, ivaPct:10, recipeId:null}]}];
    DB.ge = DB.ge || {};
    DB.ge.config = {...(DB.ge.config||{}), distPct:{per:30, gf:20, mp:30, og:5, ben:15}, pctImpuestoBeneficio:25};
    // Materia prima MUY por encima del objetivo (30% de 10.000 = 3.000):
    // se compra por 5.000, así que tiene que salir en rojo.
    DB.ge.variables = [{id: 8001, concepto:'Compras', proveedor:'P', categoria:'MATERIA PRIMA',
      importe: 5000, iva: 10, fecha: f, mes: m, 'año': y}];
    // Gastos fijos por debajo del objetivo (20% de 10.000 = 2.000): verde.
    DB.ge.fijos = [{id: 8002, nombre:'Alquiler', importe: 500, periodicidadMeses: 1, iva: 21, categoria:'FIJOS'}];
    DB.ge.fijosLog = []; DB.ge.capex = [];
    saveDB();
    navigate('economia'); GE.tab('tesoreria'); GE.setMonthTe(m);
    await new Promise(r=>setTimeout(r,1200));
    const filas = [...document.querySelectorAll('#te-rows .te-row')];
    const buscar = txt => {
      const fila = filas.find(f => f.textContent.includes(txt));
      return fila ? (fila.querySelector('span:last-child')||{}).innerHTML || '' : null;
    };
    return {
      materiaPrima: buscar('Gastos Variables') || buscar('Materia'),
      fijos: buscar('Gastos Fijos'),
      todoElBloque: document.getElementById('te-rows').innerHTML,
    };
  });
  assert.ok(r.materiaPrima && r.materiaPrima.includes('ti-x'),
    'gastar 5.000 € contra un objetivo de 3.000 € debe ser CRUZ ROJA: ' + r.materiaPrima);
  assert.ok(r.fijos && r.fijos.includes('ti-check'),
    'gastar 500 € contra un objetivo de 2.000 € debe ser TICK VERDE: ' + r.fijos);
  assert.ok(!r.todoElBloque.includes('ti-alert-triangle'),
    'ya no debe salir el triángulo de aviso intermedio en ninguna fila');
});

await caso('Tesorería: la reserva de IRPF se ve siempre que haya nóminas, y dice dónde activarla', async () => {
  const r = await page.evaluate(async ()=>{
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2,'0');
    const f = `${y}-${dd(m+1)}-04`;
    DB.sales = [{id:'s2', date:f, createdAt:f+'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta',
      items:[{name:'Plato', qty:1, price:11000, ivaPct:10, recipeId:null}]}];
    DB.ge.fijos = [{id: 8100, nombre:'Nóminas', importe: 3000, periodicidadMeses: 1, iva: 0, categoria:'PERSONAL'}];
    DB.ge.fijosLog = [];
    saveDB();
    navigate('economia'); GE.tab('tesoreria'); GE.setMonthTe(m);
    await new Promise(r=>setTimeout(r,1200));
    return document.getElementById('te-rows').innerText;
  });
  assert.ok(/IRPF/i.test(r), 'con nóminas registradas, la fila de IRPF debe verse aunque no esté configurado: ' + r.slice(0,240));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
