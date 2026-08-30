// I+D — R17.
//
// El problema nuevo: una IA no da siempre la misma respuesta, y las demás
// pruebas se apoyan en que la app sí. Se resuelve FINGIENDO el proveedor:
// con respuestas fijas se comprueba todo lo que sí es determinista, que es
// casi todo lo que importa — que la propuesta se convierte en escandallo
// correcto, que el coste lo pone la app y no el modelo, que sin clave o sin
// internet avisa y no rompe, y que el ADN llega de verdad a cada consulta.
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
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'IDRTEST1',tenantId:ggBizTenantId('IDRTEST1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));

// Semilla: ingredientes reales con precios reales, y una carta.
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  document.body.classList.add('owner-session');
  currentArea = () => 'cocina';
  DB.ingredients = [
    {id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'Pescados Mar', allergens:['Pescado'], area:'cocina'},
    {id:2, name:'Garbanzos', unit:'g', price:0.003, category:'Legumbres', supplier:'Legumbres SA', allergens:[], area:'cocina'},
    {id:3, name:'Espinacas', unit:'g', price:0.006, category:'Verduras', supplier:'Huerta Local', allergens:[], area:'cocina'},
    {id:4, name:'Aceite de oliva', unit:'ml', price:0.008, category:'Aceites', supplier:'Huerta Local', allergens:[], area:'cocina'},
  ];
  DB.recipes = []; DB.fichas = []; DB.idr = {};
  DB.cartas = [{id:1, nombre:'CARTA GENERAL', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[
    {id:1, nombre:'Entrantes', platos:[{nombre:'Escalivada'},{nombre:'Pa amb tomàquet'}]},
    {id:2, nombre:'Principales', platos:[{nombre:'Fricandó'},{nombre:'Suquet de peix'}]},
  ]}];
  saveDB();
});

// El proveedor fingido: llmChat sustituido por una respuesta fija que la
// prueba controla. Así el resto del circuito es determinista.
async function fingir(respuesta){
  await page.evaluate((r)=>{
    window.__llamadas = [];
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async (sistema, mensajes, op) => {
      window.__llamadas.push({sistema, mensajes, op});
      if(r === null) return {ok:false, motivo:'sin-conexion'};
      return {ok:true, texto: r};
    };
  }, respuesta);
}

/* ─── Sin clave, el módulo sigue ─── */
await caso('Sin asistente el módulo funciona igual, a mano', async ()=>{
  const r = await page.evaluate(()=>{
    localStorage.removeItem('gastrogoan_idr_key');
    navigate('idr');
    renderIdr();
    const html = document.getElementById('view-idr').innerHTML;
    // Crear a mano una creación y avanzar un paso sin tocar la IA
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    document.getElementById('idr-libre').value = 'Bacalao';
    idrElegirLibre();
    return {hayIA: idrHayIA(), avisa: html.includes('no está activado') || html.includes('idr.noAssistantTitle') || /activad/i.test(html), paso: idrCreacion(c.id).pasoActual, elegido: idrCreacion(c.id).pasos[0].elegido};
  });
  assert.ok(!r.hayIA, 'no debería haber IA configurada');
  assert.ok(r.avisa, 'debería avisar de que el asistente no está activado');
  assert.equal(r.paso, 1, 'debería haber avanzado un paso sin IA');
  assert.equal(r.elegido, 'Bacalao');
  return 'avisa y deja trabajar a mano';
});

/* ─── El ADN llega a cada consulta ─── */
await caso('El ADN entra de verdad en lo que se le pide al asistente', async ()=>{
  await fingir('{"comentario":"vale","opciones":[{"titulo":"Bacalao","motivo":"de temporada"}]}');
  const r = await page.evaluate(async ()=>{
    idrGuardarConfig('google','clave-de-prueba','');
    const a = idrAdn();
    a.cocina = 'Catalana de mercado';
    a.lineasRojas = 'Nada de cocina asiática';
    a.nivel = 'Bistró';
    saveDB();
    idrEmpezar('plato');
    await idrPedirPaso();
    const sis = window.__llamadas[0].sistema;
    return {
      llevaCocina: sis.includes('Catalana de mercado'),
      llevaLineasRojas: sis.includes('Nada de cocina asiática'),
      llevaIngredientes: sis.includes('Bacalao') && sis.includes('0,022') || sis.includes('Bacalao'),
      llevaCarta: sis.includes('Fricandó'),
      llevaReglas: sis.includes('NO INVENTES'),
      llevaConservacion: sis.includes('CONSERVACIÓN FUERA'),
      opciones: idrCreacion(idrCreacionActiva).pasos[0].opciones.length,
    };
  });
  assert.ok(r.llevaCocina, 'el ADN debería viajar en cada consulta');
  assert.ok(r.llevaLineasRojas, 'las líneas rojas son lo más importante del ADN');
  assert.ok(r.llevaIngredientes, 'debería llevar sus ingredientes reales');
  assert.ok(r.llevaCarta, 'debería saber lo que ya tiene en carta');
  assert.ok(r.llevaReglas, 'las reglas de honestidad deben ir siempre');
  assert.ok(r.llevaConservacion, 'la conservación debe quedar fuera explícitamente');
  assert.equal(r.opciones, 1);
  return 'ADN, ingredientes, carta y reglas viajan juntos';
});

await caso('Sin ADN definido, avisa de que las propuestas serán genéricas', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {};
    return idrContextoNegocio().includes('sin definir');
  });
  assert.ok(r, 'debería avisar en vez de callarse');
  return 'lo avisa al asistente';
});

/* ─── La respuesta estructurada ─── */
await caso('Entiende la respuesta aunque venga envuelta o con prosa delante', async ()=>{
  const r = await page.evaluate(()=>({
    limpio: idrExtraerJson('{"a":1}'),
    vallado: idrExtraerJson('```json\n{"a":2}\n```'),
    conPreambulo: idrExtraerJson('Claro, aquí tienes:\n{"a":3}\nEspero que sirva.'),
    prosa: idrExtraerJson('No tengo ni idea de qué es eso'),
  }));
  assert.equal(r.limpio.a, 1);
  assert.equal(r.vallado.a, 2, 'los modelos suelen envolverlo en ```json');
  assert.equal(r.conPreambulo.a, 3, 'y a veces añaden una frase antes');
  assert.equal(r.prosa, null, 'la prosa pura no es JSON y debe devolver null');
  return 'las tres formas y el caso sin JSON';
});

await caso('Si contesta en prosa se enseña igual, no se pierde', async ()=>{
  await fingir('No conozco bien ese plato, ¿me pasas una receta de referencia?');
  const r = await page.evaluate(async ()=>{
    idrEmpezar('plato');
    await idrPedirPaso();
    const p = idrCreacion(idrCreacionActiva).pasos[0];
    return {texto: p.texto, opciones: (p.opciones||[]).length};
  });
  assert.ok(r.texto.includes('receta de referencia'), 'la pregunta del asistente debe verse');
  assert.equal(r.opciones, 0);
  return 'se muestra la pregunta al cocinero';
});

/* ─── De propuesta a plato real: LO IMPORTANTE ─── */
await caso('Una propuesta se convierte en escandallo real con SUS precios', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Bacalao con garbanzos y espinacas',
    descripcion:'Guiso de cuchara con bacalao desalado',
    pasos:['Rehogar','Guisar'],
    ingredientes:[
      {nombre:'Bacalao', cantidad:180, unidad:'g'},
      {nombre:'Garbanzos', cantidad:120, unidad:'g'},
      {nombre:'Espinacas', cantidad:60, unidad:'g'},
      {nombre:'Pimentón de la Vera', cantidad:5, unidad:'g'},
    ],
  }));
  const r = await page.evaluate(async ()=>{
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    ['Bacalao','Guisado','Sofrito','Garbanzos','Aceite crudo','Bacalao con garbanzos'].forEach((v,i)=>{ c.pasos[i]={elegido:v}; });
    c.pasoActual = 6;
    saveDB();
    await idrCrearPlatoReal(c.id);
    const cc = idrCreacion(c.id);
    const receta = DB.recipes.find(x => x.id === cc.recipeId);
    return {
      creada: !!receta,
      lineas: receta ? receta.ingredients.length : 0,
      faltan: cc.faltan,
      // El coste que calcula LA APP con sus precios reales
      coste: receta ? recipeCost(receta) : null,
      pasos: receta ? receta.steps : '',
    };
  });
  assert.ok(r.creada, 'debería haber creado la receta');
  assert.equal(r.lineas, 3, 'los 3 ingredientes que sí tiene');
  assert.deepEqual(r.faltan, ['Pimentón de la Vera (5 g)'], 'el que no tiene se marca aparte, no se inventa');
  // 180*0,022 + 120*0,003 + 60*0,006 = 3,96 + 0,36 + 0,36 = 4,68 · +5% consumibles = 4,914
  assert.ok(Math.abs(r.coste - 4.914) < 0.001, `el coste debería salir de SUS precios, salió ${r.coste}`);
  assert.ok(r.pasos.includes('Rehogar'));
  return `3 ingredientes casados, 1 marcado como pendiente, coste ${r.coste.toFixed(3)} €`;
});

await caso('El coste lo pone la app aunque el modelo diga otra cosa', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Plato con coste inventado', descripcion:'x', pasos:['x'],
    coste: 0.5, precio: 99,   // el modelo se inventa números: deben ignorarse
    ingredientes:[{nombre:'Bacalao', cantidad:100, unidad:'g'}],
  }));
  const r = await page.evaluate(async ()=>{
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasoActual = 6; saveDB();
    await idrCrearPlatoReal(c.id);
    const receta = DB.recipes.find(x => x.id === idrCreacion(c.id).recipeId);
    return {coste: recipeCost(receta), precio: receta.price};
  });
  // 100*0,022 = 2,20 · +5% = 2,31 — y NO el 0,5 que decía el modelo
  assert.ok(Math.abs(r.coste - 2.31) < 0.001, `debería mandar el escandallo, salió ${r.coste}`);
  assert.equal(r.precio, 0, 'el precio de venta lo pone el hostelero, no el modelo');
  return 'manda el escandallo, no el modelo';
});

await caso('Una respuesta ilegible no crea nada a medias', async ()=>{
  await fingir('lo siento, no puedo');
  const r = await page.evaluate(async ()=>{
    const antes = DB.recipes.length;
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasoActual = 6; saveDB();
    await idrCrearPlatoReal(c.id);
    return {antes, despues: DB.recipes.length, recipeId: idrCreacion(c.id).recipeId};
  });
  assert.equal(r.despues, r.antes, 'no debería crear una receta a medias');
  assert.ok(!r.recipeId);
  return 'no deja basura detrás';
});

/* ─── Menú y carta: estructura, platos y después el coste ─── */
await caso('Una carta se crea entera: secciones, platos y su escandallo', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Carta de otoño',
    logica:'Tres bases distintas y una sola brasa encendida; el fondo del suquet sirve para dos platos.',
    secciones:[
      {nombre:'Entrantes', platos:[
        {nombre:'Espinacas a la catalana', descripcion:'Con pasas y piñones', ingredientes:[{nombre:'Espinacas',cantidad:200,unidad:'g'},{nombre:'Aceite de oliva',cantidad:20,unidad:'ml'}]},
      ]},
      {nombre:'Principales', platos:[
        {nombre:'Bacalao con garbanzos', descripcion:'Guiso de cuchara', ingredientes:[{nombre:'Bacalao',cantidad:160,unidad:'g'},{nombre:'Garbanzos',cantidad:100,unidad:'g'}]},
        {nombre:'Bacalao a la brasa', descripcion:'Con pimentón', ingredientes:[{nombre:'Bacalao',cantidad:180,unidad:'g'},{nombre:'Pimentón de la Vera',cantidad:4,unidad:'g'}]},
      ]},
    ],
  }));
  const r = await page.evaluate(async ()=>{
    const cartasAntes = DB.cartas.length;
    idrEmpezar('carta');
    const c = idrCreacion(idrCreacionActiva);
    c.pasos = [{elegido:'Entrantes y principales'},{elegido:'Brasa, guiso y crudo'},{elegido:'Producto de otoño'},{elegido:'Dos platos al momento como mucho'}];
    c.pasoActual = 4; saveDB();
    await idrCrearConjunto(c.id);
    const cc = idrCreacion(c.id);
    const carta = DB.cartas.find(x => x.id === cc.cartaId);
    const recetas = (cc.recipeIds||[]).map(id => DB.recipes.find(x=>x.id===id));
    return {
      cartasAntes, cartasDespues: DB.cartas.length,
      titulo: cc.titulo, logica: cc.logica, faltan: cc.faltan,
      secciones: carta ? carta.secciones.map(s=>({n:s.nombre, platos:s.platos.length})) : null,
      // Cada plato de la carta apunta a su receta real, con su coste
      vinculados: carta ? carta.secciones.every(s => s.platos.every(p => !!p.recipeId)) : false,
      costes: recetas.map(r2 => r2 ? Number(recipeCost(r2).toFixed(4)) : null),
    };
  });
  assert.equal(r.cartasDespues, r.cartasAntes + 1, 'debería haber creado la carta de verdad');
  assert.equal(r.titulo, 'Carta de otoño');
  assert.ok(r.logica.includes('fondo del suquet'), 'la lógica del conjunto debe guardarse');
  assert.deepEqual(r.secciones, [{n:'Entrantes',platos:1},{n:'Principales',platos:2}]);
  assert.ok(r.vinculados, 'cada plato de la carta debe apuntar a su receta');
  // 200*0,006 + 20*0,008 = 1,36 · +5% = 1,428
  assert.ok(Math.abs(r.costes[0] - 1.428) < 0.001, `coste 1: ${r.costes[0]}`);
  // 160*0,022 + 100*0,003 = 3,82 · +5% = 4,011
  assert.ok(Math.abs(r.costes[1] - 4.011) < 0.001, `coste 2: ${r.costes[1]}`);
  assert.equal(r.faltan.length, 1, 'el pimentón que no tiene, marcado');
  assert.ok(r.faltan[0].includes('Bacalao a la brasa'), 'y con el plato al que pertenece');
  return '2 secciones, 3 platos con su escandallo, 1 ingrediente pendiente';
});

await caso('Un menú crea sus platos pero no sustituye la carta', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Menú del día', logica:'Un fondo común para los dos segundos.',
    secciones:[{nombre:'Segundos', platos:[
      {nombre:'Garbanzos con espinacas', descripcion:'x', ingredientes:[{nombre:'Garbanzos',cantidad:150,unidad:'g'},{nombre:'Espinacas',cantidad:80,unidad:'g'}]},
    ]}],
  }));
  const r = await page.evaluate(async ()=>{
    const cartasAntes = DB.cartas.length;
    idrEmpezar('menu');
    const c = idrCreacion(idrCreacionActiva);
    c.pasoActual = 4; saveDB();
    await idrCrearConjunto(c.id);
    const cc = idrCreacion(c.id);
    return {cartasAntes, cartasDespues: DB.cartas.length, platos: (cc.recipeIds||[]).length, cartaId: cc.cartaId};
  });
  assert.equal(r.cartasDespues, r.cartasAntes, 'un menú del día NO debe sustituir la carta');
  assert.ok(!r.cartaId);
  assert.equal(r.platos, 1, 'pero sus platos sí se crean con su escandallo');
  return 'crea los platos y deja la carta en paz';
});

await caso('Puede proponer productos que el negocio no tiene', async ()=>{
  const r = await page.evaluate(()=>{
    const sis = idrSistema();
    return {
      invita: /no te limites a su lista|PROPÓN CON LIBERTAD/i.test(sis),
      // y la instrucción de la receta debe pedirlo explícitamente
      reglas: IDR_REGLAS.includes('INCLÚYELO') || IDR_REGLAS.includes('propónlo igual'),
    };
  });
  assert.ok(r.invita, 'debe invitar a salirse de la Mega Lista, no solo recombinar');
  assert.ok(r.reglas);
  return 'la regla lo pide explícitamente';
});

/* ─── Carpetas del cuaderno ─── */
await caso('El cuaderno se organiza en carpetas y filtra por tipo', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.creaciones = []; DB.idr.carpetas = [];
    idrCarpetaActiva = null; idrFiltroTipo = '';
    const f = {id: 555, nombre: 'Carta otoño 2026'};
    DB.idr.carpetas.push(f);
    const a1 = idrNuevaCreacion('plato'); a1.titulo = 'Bacalao'; a1.carpetaId = 555;
    const a2 = idrNuevaCreacion('menu');  a2.titulo = 'Menú diario'; a2.carpetaId = 555;
    const a3 = idrNuevaCreacion('plato'); a3.titulo = 'Suelto';
    saveDB();
    navigate('idr'); renderIdr();
    const cuenta = () => document.querySelectorAll('#view-idr .card-compact').length;
    const todo = cuenta();
    idrVerCarpeta(555); const enCarpeta = cuenta();
    idrFiltrar('plato');  const soloPlatos = cuenta();
    idrVerCarpeta('__sin'); idrFiltrar(''); const sinClasificar = cuenta();
    idrVerCarpeta(null); idrFiltrar('');
    return {todo, enCarpeta, soloPlatos, sinClasificar};
  });
  assert.equal(r.todo, 3, 'sin filtro se ven las tres');
  assert.equal(r.enCarpeta, 2, 'en la carpeta, dos');
  assert.equal(r.soloPlatos, 1, 'filtrando por plato dentro de la carpeta, una');
  assert.equal(r.sinClasificar, 1, 'la que no tiene carpeta vive en Sin clasificar');
  return '3 → 2 → 1, y sin clasificar aparte';
});

await caso('Borrar una carpeta NO borra el trabajo de dentro', async ()=>{
  const r = await page.evaluate(async ()=>{
    // confirmModal se acepta sin tocar pantalla
    const orig = window.confirmModal;
    window.confirmModal = async () => true;
    const antes = idrCreaciones().length;
    await idrBorrarCarpeta(555);
    window.confirmModal = orig;
    return {antes, despues: idrCreaciones().length, carpetas: idrCarpetas().length, huerfanas: idrCreaciones().filter(x=>!x.carpetaId).length};
  });
  assert.equal(r.despues, r.antes, 'perder pruebas por vaciar una carpeta sería imperdonable');
  assert.equal(r.carpetas, 0);
  assert.equal(r.huerfanas, 3, 'todas vuelven a Sin clasificar');
  return 'las 3 vuelven a Sin clasificar';
});

await caso('Una prueba nace en la carpeta que estás mirando', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.carpetas = [{id: 777, nombre:'Pruebas de brasa'}];
    idrCarpetaActiva = 777;
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    idrCarpetaActiva = null;
    return c.carpetaId;
  });
  assert.equal(r, 777, 'debería caer donde estás, no en el montón general');
  return 'cae donde estás';
});

/* ─── LA APP JUZGA AL MODELO (lo que ningún chat puede hacer) ─── */
await caso('Detecta un food cost por encima del objetivo de la casa', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {foodCostObjetivo: 30};
    // 200 g de bacalao = 4,40 · +5% = 4,62. A 10 € de PVP son el 46,2%
    const receta = {id:9001, name:'Caro', price:10, comensales:2, consumiblesPct:5, area:'cocina',
      ingredients:[{type:'ingredient', ingredientId:1, qty:200, merma:0}], allergens:[]};
    DB.recipes.push(receta);
    const malo = idrValidarPlato(receta);
    receta.price = 20; // ahora el 23,1%
    const bueno = idrValidarPlato(receta);
    return {malo, bueno};
  });
  assert.equal(r.malo.length, 1, 'debería avisar');
  assert.ok(/46,2|46\.2/.test(r.malo[0]) && r.malo[0].includes('30'), `mensaje: ${r.malo[0]}`);
  assert.deepEqual(r.bueno, [], 'al bajar el food cost debería callarse');
  return 'avisa al 46,2% con objetivo 30%';
});

await caso('Detecta una técnica que su cocina no puede hacer', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {equipamiento: 'Horno mixto, brasa y abatidor. Sin Roner ni deshidratador.'};
    const receta = {id:9002, name:'x', price:0, comensales:2, consumiblesPct:5, area:'cocina', ingredients:[], allergens:[],
      steps:'Cocinar a baja temperatura 4 horas y terminar en la brasa'};
    const con = idrValidarPlato(receta);
    const sin = idrValidarPlato({...receta, steps:'Marcar en la brasa y terminar al horno'});
    return {con, sin};
  });
  assert.equal(r.con.length, 1, 'baja temperatura sin Roner debería avisar');
  assert.ok(r.con[0].includes('baja temperatura'));
  assert.deepEqual(r.sin, [], 'brasa y horno sí los tiene: no debe avisar');
  return 'caza la baja temperatura, deja pasar la brasa';
});

await caso('Detecta producto fuera de temporada con el calendario de la app', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {producto: 'Mercado y temporada'};
    DB.ingredients.push({id:50, name:'Tomate', unit:'g', price:0.003, category:'Verduras', supplier:'Huerta Local', allergens:[], area:'cocina'});
    DB.ingredients.push({id:51, name:'Calabaza', unit:'g', price:0.002, category:'Verduras', supplier:'Huerta Local', allergens:[], area:'cocina'});
    const receta = {id:9003, name:'x', price:0, comensales:2, consumiblesPct:5, area:'cocina', allergens:[],
      ingredients:[{type:'ingredient', ingredientId:50, qty:100, merma:0},{type:'ingredient', ingredientId:51, qty:100, merma:0}]};
    // Mes fijo, no "hoy": una comprobación que cambia con el calendario no
    // es reproducible. En enero no hay ni tomate ni calabaza.
    return {enero: idrValidarPlato(receta, {mes:1}), agosto: idrValidarPlato(receta, {mes:8})};
  });
  assert.equal(r.enero.length, 1, 'en enero los dos están fuera de temporada');
  assert.ok(r.enero[0].includes('Tomate') && r.enero[0].includes('Calabaza'), `debería nombrarlos: ${r.enero[0]}`);
  assert.deepEqual(r.agosto, [], 'en agosto los dos son de temporada: no debe avisar');
  return 'en enero avisa de los dos, en agosto de ninguno';
});

await caso('El calendario de temporada está completo, los 12 meses', async ()=>{
  const fallos = await page.evaluate(()=>{
    const f=[];
    for(let m=1;m<=12;m++){
      const d = IDR_TEMPORADA[m];
      if(!d){ f.push(`falta el mes ${m}`); continue; }
      ['verduras','frutas','pescados'].forEach(k=>{ if(!d[k] || d[k].length < 10) f.push(`mes ${m}: ${k} pobre`); });
    }
    if(!/temporada/i.test(idrTemporadaTexto())) f.push('el texto no se genera');
    return f;
  });
  assert.deepEqual(fallos, [], fallos.join(' | '));
  return '12 meses con verduras, frutas y pescados';
});

await caso('Detecta una carta repetitiva y las dietas sin cubrir', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {dietas:'Siempre una opción vegetariana y una sin gluten', equipo:'2 cocineros'};
    const conBacalao = n => ({id:9100+n, name:'Bacalao '+n, price:18, comensales:2, consumiblesPct:5, area:'cocina', allergens:[],
      ingredients:[{type:'ingredient', ingredientId:1, qty:180, merma:0}]});
    const repetitiva = [conBacalao(1), conBacalao(2), conBacalao(3), conBacalao(4)];
    const avisos = idrValidarConjunto(repetitiva, {});
    // Una carta con un plato de verdura sí cubre la vegetariana
    const variada = [conBacalao(1), {id:9200, name:'Espinacas', price:9, comensales:2, consumiblesPct:5, area:'cocina', allergens:[],
      ingredients:[{type:'ingredient', ingredientId:3, qty:200, merma:0}]}];
    return {avisos, variada: idrValidarConjunto(variada, {})};
  });
  const texto = r.avisos.join(' | ');
  assert.ok(/Bacalao/.test(texto) && /4/.test(texto), `debería avisar de la base repetida: ${texto}`);
  assert.ok(/vegetarian/i.test(texto), 'y de que falta la opción vegetariana');
  assert.ok(!/vegetarian/i.test(r.variada.join(' ')), 'con un plato de verdura ya no debe avisar');
  return 'base repetida 4 veces y sin opción vegetariana';
});

await caso('Avisa si la carta pide más trabajo del que el equipo puede sacar', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {equipo:'2 cocineros y un ayudante'};
    const recetas = [{id:9300, name:'x', price:10, comensales:2, consumiblesPct:5, area:'cocina', ingredients:[], allergens:[]}];
    return {mucho: idrValidarConjunto(recetas, {alMomento: 9}), poco: idrValidarConjunto(recetas, {alMomento: 4})};
  });
  assert.ok(r.mucho.some(x=>/al momento/i.test(x)), 'con 9 platos al momento y 2 cocineros debería avisar');
  assert.deepEqual(r.poco.filter(x=>/al momento/i.test(x)), [], 'con 4 no');
  return '9 platos con 2 cocineros: avisa';
});

await caso('La ingeniería de menú se calcula con SUS ventas, o calla', async ()=>{
  const r = await page.evaluate(()=>{
    DB.ventas = [];
    const sinDatos = idrIngenieriaMenu();
    // 60 ventas: un plato que se vende y deja, otro que se vende y no deja,
    // otro que deja pero no se vende, y un perro.
    const items = [];
    for(let i=0;i<60;i++){
      const l = [];
      l.push({name:'Estrella', qty:3, price:20, costeUnitario:4, bebida:false});
      if(i%2===0) l.push({name:'Caballo', qty:3, price:10, costeUnitario:7, bebida:false});
      if(i%20===0) l.push({name:'Puzle', qty:1, price:30, costeUnitario:5, bebida:false});
      if(i%25===0) l.push({name:'Perro', qty:1, price:8, costeUnitario:7, bebida:false});
      items.push({id:i, date:'2026-08-01', items:l});
    }
    DB.ventas = items;
    const g = idrIngenieriaMenu();
    return {sinDatos, g, texto: idrIngenieriaTexto()};
  });
  assert.equal(r.sinDatos, null, 'sin ventas suficientes debe callar, no inventar');
  assert.ok(r.g.estrella.includes('Estrella'), `estrellas: ${JSON.stringify(r.g)}`);
  assert.ok(r.g.puzle.includes('Puzle') || r.g.perro.includes('Puzle'), 'el puzle no se vende');
  assert.ok(r.texto.includes('Estrellas'));
  return 'clasifica los 4 grupos con datos reales';
});

await caso('El asistente recibe temporada, proporciones y marco de oficio', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr.adn = {cocina:'Catalana de mercado'};
    const sis = idrSistema();
    return {
      temporada: /PRODUCTO DE TEMPORADA/.test(sis),
      proporciones: /PROPORCIONES CL/.test(sis) && sis.includes('3 partes de grasa'),
      marcoPlato: /CÓMO PIENSAS UN PLATO/.test(sis),
      marcoConjunto: /CÓMO PIENSAS UN CONJUNTO/.test(sis),
      ingenieria: /INGENIER/.test(sis),
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta en las instrucciones: ${k}`));
  return 'temporada, proporciones, marco de plato y de conjunto, e ingeniería';
});

await caso('Tras comprobar, el asistente corrige y la app vuelve a medir', async ()=>{
  const r = await page.evaluate(async ()=>{
    DB.idr.adn = {foodCostObjetivo: 30, equipamiento:'Horno y brasa. Sin Roner.'};
    let llamada = 0;
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async (sis, msgs) => {
      llamada++;
      // 1ª: propone algo caro. 2ª: lo corrige tras el aviso de la app.
      // Propone una técnica que su cocina NO tiene: es lo que la app caza.
      if(llamada === 1) return {ok:true, texto: JSON.stringify({nombre:'Caro', descripcion:'x',
        pasos:['Cocinar a baja temperatura 6 horas'],
        ingredientes:[{nombre:'Bacalao', cantidad:400, unidad:'g'}]})};
      window.__correccion = msgs[msgs.length-1].content;
      return {ok:true, texto: JSON.stringify({nombre:'Ajustado', descripcion:'x', pasos:['Marcar en la brasa'], nota:'He bajado la ración y cambiado a brasa',
        ingredientes:[{nombre:'Bacalao', cantidad:120, unidad:'g'},{nombre:'Garbanzos', cantidad:120, unidad:'g'}]})};
    };
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasoActual = 6; saveDB();
    await idrCrearPlatoReal(c.id);
    const cc = idrCreacion(c.id);
    const receta = DB.recipes.find(x=>x.id===cc.recipeId);
    return {llamadas: llamada, corregido: cc.corregido, nota: cc.nota, nombre: receta.name,
      qty: receta.ingredients[0].qty, correccion: window.__correccion, avisos: cc.avisos};
  });
  assert.equal(r.llamadas, 2, 'debería hacer una segunda pasada de corrección');
  assert.ok(/baja temperatura/i.test(r.correccion), 'debe decirle QUÉ falló, medido por la app');
  assert.ok(r.corregido, 'debería marcar que se corrigió');
  assert.equal(r.nombre, 'Ajustado', 'debe quedarse con la versión corregida');
  assert.equal(r.qty, 120);
  assert.ok(r.nota.includes('bajado'), 'la explicación del asistente se conserva');
  assert.deepEqual(r.avisos, [], 'tras corregir, la app vuelve a medir y ya no debe quedar aviso');
  return `2 pasadas, corrigió la técnica y bajó 400 g → 120 g`;
});

await caso('Propone el PVP que cumple el objetivo de food cost', async ()=>{
  await fingir(JSON.stringify({nombre:'Con precio', descripcion:'x', pasos:['x'],
    ingredientes:[{nombre:'Bacalao', cantidad:200, unidad:'g'}]}));
  const r = await page.evaluate(async ()=>{
    DB.idr.adn = {foodCostObjetivo: 30};
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasoActual = 6; saveDB();
    await idrCrearPlatoReal(c.id);
    const receta = DB.recipes.find(x=>x.id===idrCreacion(c.id).recipeId);
    return {precio: receta.price, coste: recipeCost(receta), fc: recipeCost(receta)/receta.price*100};
  });
  // 200*0,022 = 4,40 · +5% = 4,62 → PVP para el 30% = 15,40
  assert.ok(Math.abs(r.precio - 15.4) < 0.001, `PVP sugerido: ${r.precio}`);
  assert.ok(Math.abs(r.fc - 30) < 0.5, `el food cost resultante debería ser el objetivo, es ${r.fc}`);
  return `coste ${r.coste.toFixed(2)} € → PVP sugerido ${r.precio} € (30%)`;
});

/* ─── Los caminos de error ─── */
await caso('Sin internet avisa en cristiano y no rompe', async ()=>{
  await fingir(null);
  const r = await page.evaluate(async ()=>{
    idrEmpezar('plato');
    try{ await idrPedirPaso(); }catch(e){ return {roto:e.message}; }
    return {roto:null, mensaje: idrMensajeError({motivo:'sin-conexion'}), vista: !!document.getElementById('view-idr').innerHTML};
  });
  assert.ok(!r.roto, 'reventó: ' + r.roto);
  assert.ok(/conexión|internet/i.test(r.mensaje), `mensaje poco claro: ${r.mensaje}`);
  assert.ok(r.vista, 'la pantalla debería seguir pintada');
  return `avisa: "${r.mensaje}"`;
});

await caso('Cada motivo de fallo tiene su mensaje, en los tres idiomas', async ()=>{
  const r = await page.evaluate(()=>{
    const motivos = ['sin-clave','tope','sin-conexion','clave-mala','cuota','proveedor','vacia'];
    const fallos = [];
    ['es','ca','en'].forEach(l => {
      localStorage.setItem('gastrogoan_lang', l);
      motivos.forEach(m => {
        const msg = idrMensajeError({motivo:m});
        if(!msg || msg.startsWith('idr.')) fallos.push(`${l}:${m}`);
      });
    });
    localStorage.setItem('gastrogoan_lang','es');
    return fallos;
  });
  assert.deepEqual(r, [], 'sin traducir: ' + r.join(', '));
  return '7 motivos × 3 idiomas';
});

/* ─── El tope de gasto ─── */
await caso('El tope de consultas corta antes de gastar más', async ()=>{
  const r = await page.evaluate(async ()=>{
    // Se restaura el llmChat de verdad para comprobar el tope, que vive en él
    localStorage.setItem('gastrogoan_idr_gasto', JSON.stringify({dia:new Date().toISOString().slice(0,10), llamadas: IDR_TOPE_DIA}));
    const antes = idrQuedanLlamadas();
    const r2 = await window.__llmChatReal('sistema', [{role:'user',content:'hola'}]);
    localStorage.removeItem('gastrogoan_idr_gasto');
    return {antes, motivo: r2.motivo, despues: idrQuedanLlamadas()};
  });
  assert.equal(r.antes, 0, 'no deberían quedar consultas');
  assert.equal(r.motivo, 'tope', 'debería cortar por tope, no intentar la llamada');
  assert.ok(r.despues > 0, 'al borrar el contador vuelven a quedar');
  return 'corta en seco y no llama al proveedor';
});

/* ─── Que sobreviva a cerrar la tablet ─── */
await caso('Una conversación a medias sobrevive a recargar la app', async ()=>{
  const id = await page.evaluate(()=>{
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasos[0] = {elegido:'Bacalao'};
    c.pasos[1] = {elegido:'A la brasa'};
    c.pasoActual = 2;
    c.titulo = 'Prueba de otoño';
    saveDB();
    return c.id;
  });
  await new Promise(r=>setTimeout(r,400));
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2400));
  const r = await page.evaluate((id)=>{
    const c = idrCreacion(id);
    return c ? {titulo:c.titulo, paso:c.pasoActual, primero:c.pasos[0].elegido} : null;
  }, id);
  assert.ok(r, 'la creación debería seguir ahí después de recargar');
  assert.equal(r.paso, 2, 'debería seguir por donde iba');
  assert.equal(r.primero, 'Bacalao');
  return 'sigue por el paso 2';
});

/* ─── Volver atrás ─── */
await caso('Volver a un paso rehace lo que dependía y respeta lo anterior', async ()=>{
  const r = await page.evaluate(()=>{
    ['netlify-gate','license-gate','firebase-gate'].forEach(x=>document.getElementById(x)?.remove());
    editUnlocked = true; document.body.classList.add('owner-session');
    currentArea = () => 'cocina';
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    c.pasos = [{elegido:'Bacalao'},{elegido:'A la brasa'},{elegido:'Pilpil'},{elegido:'Garbanzos'}];
    c.pasoActual = 4;
    saveDB();
    idrVolverA(1);
    const cc = idrCreacion(c.id);
    return {pasos: cc.pasos.map(p=>p.elegido), actual: cc.pasoActual};
  });
  assert.deepEqual(r.pasos, ['Bacalao'], 'lo anterior se respeta, lo que dependía se va');
  assert.equal(r.actual, 1);
  return 'conserva el paso 1, rehace del 2 en adelante';
});

/* ─── La clave no viaja a la nube ─── */
await caso('La clave se queda en el dispositivo y no entra en la nube', async ()=>{
  const r = await page.evaluate(()=>{
    idrGuardarConfig('anthropic','sk-secreta-de-prueba','');
    const enDB = JSON.stringify(DB).includes('sk-secreta-de-prueba');
    const enLocal = (localStorage.getItem('gastrogoan_idr_key')||'').includes('sk-secreta-de-prueba');
    return {enDB, enLocal, cfg: idrConfig().proveedor};
  });
  assert.ok(!r.enDB, 'la clave NUNCA debe estar en DB: ese bloque se sincroniza con Firebase');
  assert.ok(r.enLocal, 'debería estar en este dispositivo');
  assert.equal(r.cfg, 'anthropic');
  return 'solo en localStorage, como el idioma';
});

/* ─── Los proveedores están bien formados ─── */
await caso('Los proveedores tienen todo lo que necesitan para llamar', async ()=>{
  const fallos = await page.evaluate(()=>{
    const f=[];
    Object.keys(IDR_PROVEEDORES).forEach(k=>{
      const p = IDR_PROVEEDORES[k];
      ['es','ca','en'].forEach(l=>{ if(!p.l||!p.l[l]) f.push(`${k}: falta idioma ${l}`); });
      if(!p.modeloPorDefecto) f.push(`${k}: sin modelo por defecto`);
      ['url','cabeceras','cuerpo','extraer'].forEach(fn=>{ if(typeof p[fn]!=='function') f.push(`${k}: falta ${fn}`); });
      if(!/^https:\/\//.test(String(p.url(p.modeloPorDefecto,'k')))) f.push(`${k}: la URL no es https`);
      if(!p.ayuda) f.push(`${k}: sin página de ayuda para sacar la clave`);
      // El cuerpo debe llevar el sistema: es donde van las reglas y el ADN
      const cuerpo = JSON.stringify(p.cuerpo('SISTEMA-X',[{role:'user',content:'hola'}],100,p.modeloPorDefecto));
      if(!cuerpo.includes('SISTEMA-X')) f.push(`${k}: el cuerpo pierde las instrucciones`);
      if(!cuerpo.includes('hola')) f.push(`${k}: el cuerpo pierde el mensaje`);
    });
    return f;
  });
  assert.deepEqual(fallos, [], fallos.join(' | '));
  const n = await page.evaluate(()=>Object.keys(IDR_PROVEEDORES).length);
  return `${n} proveedores bien formados`;
});

/* ─── Los cinco roles ─── */
// Un cocinero sin edición no debe poder tocar el ADN ni borrar el cuaderno
// del negocio; uno con edición sí trabaja. El módulo vive en Cocina, así
// que un camarero no debería ni verlo.
await caso('Cada rol ve lo suyo en I+D y solo lo suyo', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr = {adn:{cocina:'Catalana'}, creaciones:[], carpetas:[]};
    idrCarpetaActiva = null; idrFiltroTipo = '';
    idrNuevaCreacion('plato').titulo = 'Prueba';
    saveDB();
    const visibles = () => {
      renderIdr();
      const box = document.getElementById('view-idr');
      const vis = el => { const st = getComputedStyle(el); return st.display !== 'none' && st.visibility !== 'hidden'; };
      const todos = [...box.querySelectorAll('button, select')];
      return {
        soloDuenyo: todos.filter(e => e.classList.contains('owner-strict') && vis(e)).length,
        conEdicion: todos.filter(e => e.classList.contains('owner-only') && vis(e)).length,
        libres: todos.filter(e => !e.classList.contains('owner-only') && !e.classList.contains('owner-strict') && vis(e)).length,
      };
    };
    const poner = (owner, edit) => {
      document.body.classList.toggle('owner-session', owner);
      document.body.classList.toggle('edit-unlocked', edit || owner);
      editUnlocked = edit || owner;
    };
    currentArea = () => 'cocina';
    navigate('idr');
    poner(false, false); const cocinero = visibles();
    poner(false, true);  const cocineroEdit = visibles();
    poner(true, true);   const duenyo = visibles();
    // El módulo está en la carpeta de Cocina, no en la de Sala
    const enSala = (FOLDERS.sala.modules||[]).some(m => m.id === 'idr');
    const enCocina = (FOLDERS.cocina.modules||[]).some(m => m.id === 'idr');
    return {cocinero, cocineroEdit, duenyo, enSala, enCocina};
  });
  assert.equal(r.cocinero.conEdicion, 0, 'un cocinero sin edición no debería ver los botones de editar');
  assert.equal(r.cocinero.soloDuenyo, 0, 'ni los exclusivos del dueño');
  assert.ok(r.cocinero.libres > 0, 'pero sí debe poder mirar y usar el asistente');
  assert.ok(r.cocineroEdit.conEdicion > 0, 'con edición desbloqueada sí trabaja');
  assert.ok(r.duenyo.conEdicion >= r.cocineroEdit.conEdicion, 'el dueño ve al menos lo mismo');
  assert.ok(!r.enSala, 'I+D es de cocina: un camarero no debería verlo');
  assert.ok(r.enCocina);
  return `cocinero ${r.cocinero.libres} botones, con edición ${r.cocineroEdit.conEdicion} más, y no aparece en sala`;
});

/* ─── Un negocio recién dado de alta ─── */
await caso('En un negocio vacío I+D no se rompe y guía qué hacer', async ()=>{
  const r = await page.evaluate(()=>{
    DB.idr = {}; DB.ingredients = []; DB.recipes = []; DB.cartas = []; DB.ventas = [];
    localStorage.removeItem('gastrogoan_idr_key');
    document.body.classList.add('owner-session','edit-unlocked'); editUnlocked = true;
    currentArea = () => 'cocina';
    let roto = null;
    try{
      navigate('idr'); renderIdr();
      // Y que se pueda empezar algo aunque no haya NADA cargado
      idrEmpezar('carta');
      renderIdr();
      navIdr('inicio');
    }catch(e){ roto = e.message; }
    const html = document.getElementById('view-idr').innerHTML;
    return {roto, guia: /ADN/.test(html), contexto: idrContextoNegocio(), ing: idrIngenieriaMenu()};
  });
  assert.ok(!r.roto, 'reventó: ' + r.roto);
  assert.ok(r.guia, 'debería guiar hacia el ADN, que es lo primero');
  assert.ok(r.contexto.includes('sin definir'), 'y avisar al asistente de que no hay ADN');
  assert.equal(r.ing, null, 'sin ventas no debe inventarse ninguna ingeniería de menú');
  return 'aguanta vacío y señala el ADN';
});

/* ─── LA NUBE (la familia de fallo que ya se coló dos veces) ─── */
await caso('Dos dispositivos creando pruebas a la vez no se pisan', async ()=>{
  const r = await page.evaluate(()=>{
    // Este dispositivo tiene la prueba A; la nube devuelve la B, creada en
    // otro. Después del merge tienen que estar las DOS.
    DB.idr = {adn:{cocina:'Catalana'}, carpetas:[{id:1,nombre:'Otoño'}], creaciones:[
      {id:101, tipo:'plato', titulo:'Bacalao (tablet)', pasos:[], updatedAt:'2026-08-28T10:00:00Z'},
    ]};
    lastSyncedSnapshot = lastSyncedSnapshot || {};
    lastSyncedSnapshot.idr = canonicalStringify({adn:{cocina:'Catalana'}, carpetas:[{id:1,nombre:'Otoño'}], creaciones:[]});
    const remoto = {adn:{cocina:'Catalana'}, carpetas:[{id:1,nombre:'Otoño'},{id:2,nombre:'Brasa'}], creaciones:[
      {id:202, tipo:'menu', titulo:'Menú del día (móvil)', pasos:[], updatedAt:'2026-08-28T10:01:00Z'},
    ]};
    applyRemoteBlock('idr', remoto);
    return {
      titulos: (DB.idr.creaciones||[]).map(c=>c.titulo).sort(),
      carpetas: (DB.idr.carpetas||[]).map(c=>c.nombre).sort(),
      adn: DB.idr.adn && DB.idr.adn.cocina,
    };
  });
  assert.deepEqual(r.titulos, ['Bacalao (tablet)','Menú del día (móvil)'], 'no debería perderse ninguna de las dos');
  assert.deepEqual(r.carpetas, ['Brasa','Otoño'], 'ni las carpetas');
  assert.equal(r.adn, 'Catalana', 'y el ADN debe seguir en pie');
  return 'las dos pruebas y las dos carpetas sobreviven';
});

await caso('La nube devolviendo el bloque vacío no borra el cuaderno', async ()=>{
  // Firebase NO guarda objetos vacíos: un bloque puede volver a medias o
  // sin nada. Es la raíz del bug histórico de Distribución del Trabajo.
  const r = await page.evaluate(()=>{
    DB.idr = {adn:{cocina:'Catalana'}, carpetas:[], creaciones:[{id:303, tipo:'plato', titulo:'Solo local', pasos:[]}]};
    let roto = null;
    try{
      applyRemoteBlock('idr', undefined);
      applyRemoteBlock('idr', {});
      // Y que la pantalla siga pintándose después
      currentArea = () => 'cocina';
      navigate('idr'); renderIdr();
    }catch(e){ roto = e.message; }
    return {roto, creaciones: (idrCreaciones()||[]).length, adnOk: !!idrAdn(), pintado: !!document.getElementById('view-idr').innerHTML};
  });
  assert.ok(!r.roto, 'reventó: ' + r.roto);
  assert.equal(r.creaciones, 1, 'la prueba local no debería desaparecer');
  assert.ok(r.adnOk && r.pintado, 'y la pantalla debe seguir viva');
  return 'aguanta el bloque vacío sin perder nada';
});

await caso('El cuaderno de I+D viaja de verdad a la nube', async ()=>{
  const r = await page.evaluate(()=>{
    const def = defaultData();
    return {enDefaults: !!def.idr, forma: def.idr ? Object.keys(def.idr).sort() : null};
  });
  assert.ok(r.enDefaults, 'sin estar en los datos por defecto, el bloque no se trata como los demás');
  assert.deepEqual(r.forma, ['adn','carpetas','creaciones']);
  return 'adn, carpetas y creaciones';
});

/* ─── Lo escrito no se pierde ─── */
// Era el fallo que hacía parecer muerto el botón de continuar: al fallar
// "Pedir ideas" la pantalla se repintaba y se llevaba por delante lo que el
// cocinero había escrito, así que decía "escribe algo primero".
await caso('Lo escrito sobrevive a que falle el asistente', async ()=>{
  await fingir(null);   // el asistente no contesta
  const r = await page.evaluate(async ()=>{
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    currentArea = () => 'cocina';
    document.body.classList.add('owner-session','edit-unlocked'); editUnlocked = true;
    navigate('idr'); renderIdr();
    idrEmpezar('plato');
    // Escribe, y LUEGO pide ideas (que falla)
    document.getElementById('idr-libre').value = 'Bacalao a la brasa';
    idrGuardarLibre('Bacalao a la brasa');
    await idrPedirPaso();
    const enPantalla = (document.getElementById('idr-libre')||{}).value;
    idrElegirLibre();
    const c = idrCreacion(idrCreacionActiva);
    return {enPantalla, paso: c.pasoActual, elegido: (c.pasos[0]||{}).elegido};
  });
  assert.equal(r.enPantalla, 'Bacalao a la brasa', 'lo escrito debe seguir en el cuadro tras el fallo');
  assert.equal(r.elegido, 'Bacalao a la brasa', 'y continuar debe funcionar');
  assert.equal(r.paso, 1);
  return 'se conserva y continúa';
});

await caso('Enter continúa; el borrador se borra al avanzar', async ()=>{
  const r = await page.evaluate(()=>{
    idrEmpezar('menu');
    idrGuardarLibre('Menú de otoño');
    const c = idrCreacion(idrCreacionActiva);
    const antesDeAvanzar = c.pasos[0].libre;
    idrElegirLibre();
    return {antesDeAvanzar, libreTrasAvanzar: c.pasos[0].libre, elegido: c.pasos[0].elegido, paso: c.pasoActual};
  });
  assert.equal(r.antesDeAvanzar, 'Menú de otoño');
  assert.equal(r.elegido, 'Menú de otoño');
  assert.equal(r.libreTrasAvanzar, undefined, 'el borrador ya no hace falta una vez decidido');
  return 'avanza y limpia el borrador';
});

await caso('La prueba de conexión dice exactamente qué pasa', async ()=>{
  const r = await page.evaluate(async ()=>{
    // Un fallo con detalle técnico: debe quedar guardado para poder mirarlo
    idrMensajeError({ok:false, motivo:'clave-mala', detalle:'HTTP 400 API_KEY_INVALID'});
    return {motivo: idrUltimoFallo.motivo, detalle: idrUltimoFallo.detalle, hayFn: typeof idrProbarConexion};
  });
  assert.equal(r.motivo, 'clave-mala');
  assert.ok(r.detalle.includes('API_KEY_INVALID'), 'el detalle técnico debe conservarse');
  assert.equal(r.hayFn, 'function', 'debe existir el botón de probar la conexión');
  return 'guarda motivo y detalle';
});

/* ─── Que el módulo se trate como el resto de la app ─── */
await caso('Se puede volver al panel desde I+D, como en cualquier módulo', async ()=>{
  const r = await page.evaluate(()=>{
    // Como llegaría un usuario: entrando por la carpeta de Cocina, y en la
    // pantalla principal del módulo (dentro de una creación el "Volver" es
    // otro: lleva al cuaderno, que es lo correcto).
    currentFolder = 'cocina';
    currentArea = () => 'cocina';
    navigate('idr'); navIdr('inicio');
    const volver = [...document.querySelectorAll('#view-idr button')].find(b => /volver|tornar|back/i.test(b.textContent));
    if(!volver) return {hay:false};
    volver.click();
    // La vista activa se lee del DOM, que es lo que ve el usuario
    const activa = document.querySelector('.view.active');
    return {hay:true, vista: activa ? activa.id : null};
  });
  assert.ok(r.hay, 'faltaba el botón de volver: todos los módulos lo tienen');
  assert.equal(r.vista, 'view-folder', 'debería llevar al panel de la carpeta');
  // Y desde dentro de una creación, el Volver lleva al cuaderno
  const dentro = await page.evaluate(()=>{
    idrEmpezar('plato');
    const v = [...document.querySelectorAll('#view-idr button')].find(b => /volver|tornar|back/i.test(b.textContent));
    v.click();
    return idrVista;
  });
  assert.equal(dentro, 'inicio', 'desde una creación debe volver al cuaderno, no salirse del módulo');
  return 'del módulo al panel, y de una creación al cuaderno';
});

await caso('Todos los campos del ADN tienen ejemplo y ayuda', async ()=>{
  const fallos = await page.evaluate(()=>{
    const f = [];
    IDR_ADN_CAMPOS.forEach(c => {
      ['es','ca','en'].forEach(l => {
        if(!c.l || !c.l[l]) f.push(`${c.k}: falta etiqueta ${l}`);
        if(c.tipo !== 'sel'){
          if(!c.ph || !c.ph[l]) f.push(`${c.k}: falta ejemplo ${l}`);
          if(!c.ayuda || !c.ayuda[l]) f.push(`${c.k}: falta ayuda ${l}`);
        }
      });
    });
    return f;
  });
  assert.deepEqual(fallos, [], fallos.join(' | '));
  const n = await page.evaluate(()=>IDR_ADN_CAMPOS.length);
  return `${n} campos, todos con ejemplo y ayuda en 3 idiomas`;
});

await caso('Nivel y producto son texto libre, no listas cerradas', async ()=>{
  const r = await page.evaluate(()=>{
    const nivel = IDR_ADN_CAMPOS.find(c=>c.k==='nivel');
    const producto = IDR_ADN_CAMPOS.find(c=>c.k==='producto');
    // Y que lo escrito a mano llegue tal cual al asistente
    DB.idr.adn = {nivel:'Comida de diario sin pretensiones', producto:'Verdura del mercado cada mañana'};
    const sis = idrSistema();
    return {tipoNivel: nivel.tipo, tipoProducto: producto.tipo,
            llega: sis.includes('Comida de diario sin pretensiones') && sis.includes('Verdura del mercado cada mañana')};
  });
  assert.equal(r.tipoNivel, 'area', 'nivel debe ser texto libre');
  assert.equal(r.tipoProducto, 'area', 'producto también');
  assert.ok(r.llega, 'lo escrito debe llegar tal cual al asistente');
  return 'texto libre y llega entero';
});

await caso('En cada paso baja al detalle de lo que haría falta', async ()=>{
  await fingir(JSON.stringify({comentario:'¿Qué te parece?', opciones:[
    {titulo:'Bacalao guisado', motivo:'de temporada', necesita:'180 g de bacalao, garbanzos cocidos y un buen sofrito'},
  ]}));
  const r = await page.evaluate(async ()=>{
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    currentArea = () => 'cocina';
    idrEmpezar('plato');
    await idrPedirPaso();
    const pedido = window.__llamadas[0].mensajes[0].content;
    const html = document.getElementById('view-idr').innerHTML;
    return {
      pideDetalle: /necesita/.test(pedido) && /cantidad aproximada/i.test(pedido),
      pidePreguntar: /PREGUNT/i.test(pedido),
      seVe: html.includes('180 g de bacalao'),
      reglas: /NO TE QUEDES EN LA IDEA/.test(IDR_REGLAS),
    };
  });
  assert.ok(r.pideDetalle, 'debe pedirle ingredientes y cantidades, no solo la idea');
  assert.ok(r.pidePreguntar, 'y que termine preguntando al cocinero');
  assert.ok(r.seVe, 'lo que haría falta debe verse en la tarjeta');
  assert.ok(r.reglas);
  return 'pide detalle, pregunta, y se ve en pantalla';
});

/* ─── Los modelos se retiran: la app tiene que sobrevivir a eso ─── */
// Google retiró gemini-2.0-flash y devolvía un 404 que, sin diagnóstico, un
// hostelero solo veía como "el asistente no ha podido responder".
await caso('Un modelo retirado se explica y se puede cambiar sin tocar la app', async ()=>{
  const r = await page.evaluate(()=>{
    const msg = idrMensajeError({ok:false, motivo:'modelo', detalle:'HTTP 404 no longer available'});
    return {
      msg,
      guardado: idrUltimoFallo.motivo,
      hayLista: typeof idrCargarModelos === 'function',
      // Cada proveedor debe saber preguntar por sus modelos
      preguntan: Object.keys(IDR_PROVEEDORES).filter(k => typeof IDR_PROVEEDORES[k].listaModelos === 'function' && typeof IDR_PROVEEDORES[k].extraerModelos === 'function'),
      proveedores: Object.keys(IDR_PROVEEDORES).length,
    };
  });
  assert.ok(/modelo/i.test(r.msg) && /disponibles/i.test(r.msg), `el mensaje debe decir qué hacer: ${r.msg}`);
  assert.equal(r.guardado, 'modelo');
  assert.ok(r.hayLista, 'debe existir el botón que pregunta por los modelos');
  assert.equal(r.preguntan.length, r.proveedores, 'los dos proveedores deben saber listar sus modelos');
  return 'lo explica y ofrece elegir otro';
});

await caso('La lista de modelos se lee bien de lo que devuelve cada proveedor', async ()=>{
  const r = await page.evaluate(()=>({
    google: IDR_PROVEEDORES.google.extraerModelos({models:[
      {name:'models/gemini-3.6-flash', supportedGenerationMethods:['generateContent']},
      {name:'models/embedding-001', supportedGenerationMethods:['embedContent']},
    ]}),
    anthropic: IDR_PROVEEDORES.anthropic.extraerModelos({data:[{id:'claude-sonnet-4-5'},{id:'claude-opus-4-1'}]}),
    vacio: IDR_PROVEEDORES.google.extraerModelos({}),
  }));
  assert.deepEqual(r.google, ['gemini-3.6-flash'], 'debe quitar el prefijo y filtrar los que no sirven para escribir');
  assert.deepEqual(r.anthropic, ['claude-sonnet-4-5','claude-opus-4-1']);
  assert.deepEqual(r.vacio, [], 'una respuesta vacía no puede reventar');
  return 'filtra los que no valen y quita el prefijo';
});

/* ─── La lista de modelos: solo los que responden ─── */
// El proveedor lista muchos y la mayoria no sirven. Ofrecerlos todos es
// mandar al hostelero a probar a ciegas, que es lo que le paso al dueño.
await caso('Solo se ofrecen los modelos que de verdad contestan', async ()=>{
  const r = await page.evaluate(async ()=>{
    // Se finge el proveedor: lista 4 modelos y solo 2 contestan
    const probados = [];
    window.fetch = async (url) => ({
      ok: true,
      json: async () => ({models: ['uno','dos','tres','cuatro'].map(n => ({name:'models/'+n, supportedGenerationMethods:['generateContent']}))}),
      text: async () => '',
    });
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => {
      const m = (idrConfig()||{}).modelo;
      probados.push(m);
      return (m === 'dos' || m === 'cuatro') ? {ok:true, texto:'OK'} : {ok:false, motivo:'modelo'};
    };
    idrGuardarConfig('google','clave-buena','uno');
    idrConfigModal();
    document.getElementById('idr-clave').value = 'clave-buena';
    await idrCargarModelos();
    const sel = document.getElementById('idr-modelo');
    const ofrecidos = sel && sel.tagName === 'SELECT' ? [...sel.options].map(o=>o.value) : null;
    const aviso = (document.getElementById('idr-test-res')||{}).textContent || '';
    // Y que la configuracion guardada NO se quede con el ultimo probado
    const trasProbar = (idrConfig()||{}).modelo;
    closeModal();
    return {probados, ofrecidos, aviso, trasProbar};
  });
  assert.deepEqual(r.probados, ['uno','dos','tres','cuatro'], 'debe probarlos uno a uno');
  assert.deepEqual(r.ofrecidos, ['dos','cuatro'], 'solo los que contestan: ' + JSON.stringify(r.ofrecidos));
  assert.ok(/2/.test(r.aviso), 'debe decir cuántos han pasado la prueba');
  assert.equal(r.trasProbar, 'uno', 'probar no puede cambiarle el modelo que tenía guardado');
  return '4 probados, 2 ofrecidos, y no toca lo guardado';
});

await caso('Si ninguno responde, lo dice claro en vez de ofrecer una lista muerta', async ()=>{
  const r = await page.evaluate(async ()=>{
    window.fetch = async () => ({ok:true, json: async () => ({models:[{name:'models/x', supportedGenerationMethods:['generateContent']}]}), text: async () => ''});
    window.llmChat = async () => ({ok:false, motivo:'clave-mala'});
    idrConfigModal();
    document.getElementById('idr-clave').value = 'k';
    await idrCargarModelos();
    const sel = document.getElementById('idr-modelo');
    const aviso = (document.getElementById('idr-test-res')||{}).textContent || '';
    closeModal();
    return {esLista: !!(sel && sel.tagName === 'SELECT'), aviso};
  });
  assert.ok(!r.esLista, 'no debe ofrecer una lista si ninguno vale');
  assert.ok(/responde|permisos/i.test(r.aviso), `mensaje poco claro: ${r.aviso}`);
  return 'lo dice y no ofrece nada';
});

await caso('Cambiar de proveedor suelta la clave y el modelo del anterior', async ()=>{
  const r = await page.evaluate(()=>{
    idrGuardarConfig('google','clave-de-google','gemini-x');
    idrConfigModal();
    // Se cambia el desplegable a Anthropic, como haría el dueño
    document.getElementById('idr-prov').value = 'anthropic';
    idrConfigModalRefrescar();
    const modelo = document.getElementById('idr-modelo');
    const clave = document.getElementById('idr-clave');
    const aviso = (document.getElementById('idr-test-res')||{}).textContent || '';
    const out = {modelo: modelo.value, clave: clave.value, marcador: modelo.placeholder, aviso};
    closeModal();
    return out;
  });
  assert.equal(r.modelo, '', 'el modelo del proveedor viejo no vale en el nuevo');
  assert.equal(r.clave, '', 'ni la clave');
  assert.ok(/claude/i.test(r.marcador), `debe sugerir un modelo del nuevo proveedor: ${r.marcador}`);
  assert.ok(/proveedor/i.test(r.aviso), 'y avisar de que hace falta la clave nueva');
  return 'suelta clave y modelo, y sugiere el del proveedor nuevo';
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
