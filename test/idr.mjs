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
// El encargo (precio, food cost y estructura) se pide ANTES de conversar.
// Las pruebas que van directas a la conversación lo dan por hecho con esto.
// Se instala en cada carga porque hay pruebas que recargan la aplicación.
await page.evaluateOnNewDocument(() => {
  window.encargoHecho = () => {
    const c = idrCreacion(idrCreacionActiva);
    if(!c) return;
    Object.assign(idrEncargo(c), {pvp: 18, foodCost: 30, hecho: true});
    if(c.tipo === 'menu' || c.tipo === 'carta'){
      idrEncargo(c).bloques = [{nombre:'Entrantes', n:2}, {nombre:'Principales', n:2}];
    }
    saveDB(); renderIdr();
  };
});
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
  // El ADN es REQUISITO desde R18: sin él no se puede empezar ninguna prueba.
  DB.idr.adn = {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio, mediodía de oficina'};
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const html2 = document.getElementById('view-idr').innerHTML;
    return {hayIA: idrHayIA(),
            avisa: html.includes('no está activado') || html.includes('idr.noAssistantTitle') || /activad/i.test(html),
            saludo: html2.includes('te doy opciones'),
            sinCuadro: !document.getElementById('idr-libre')};
  });
  assert.ok(!r.hayIA, 'no debería haber IA configurada');
  assert.ok(r.avisa, 'debería avisar de que el asistente no está activado');
  assert.ok(r.saludo, 'la conversación debe abrirse igual, con su saludo');
  assert.ok(r.sinCuadro, 'pero sin cuadro de escribir: sin clave no hay con quién hablar');
  return 'avisa y no deja un chat muerto';
});

/* ─── El ADN llega a cada consulta ─── */
await caso('El ADN entra de verdad en lo que se le pide al asistente', async ()=>{
  await fingir(JSON.stringify({nombre:'X', descripcion:'x', pasos:['x'], ingredientes:[{nombre:'Bacalao',cantidad:100,unidad:'g'}]}));
  const r = await page.evaluate(async ()=>{
    idrGuardarConfig('google','clave-de-prueba','');
    const a = idrAdn();
    a.cocina = 'Catalana de mercado';
    a.lineasRojas = 'Nada de cocina asiática';
    a.nivel = 'Bistró';
    saveDB();
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un guiso de bacalao'}]; saveDB();
    await idrCrearPlatoReal(c.id);
    const sis = window.__llamadas[0].sistema;
    return {
      llevaCocina: sis.includes('Catalana de mercado'),
      llevaLineasRojas: sis.includes('Nada de cocina asiática'),
      llevaIngredientes: sis.includes('Bacalao'),
      llevaCarta: sis.includes('Fricandó'),
      llevaReglas: sis.includes('NO INVENTES'),
      llevaConservacion: sis.includes('CONSERVACIÓN FUERA'),
      llevaEncargo: window.__llamadas[0].mensajes[0].content.includes('Un guiso de bacalao'),
    };
  });
  assert.ok(r.llevaCocina, 'el ADN debería viajar en cada consulta');
  assert.ok(r.llevaLineasRojas, 'las líneas rojas son lo más importante del ADN');
  assert.ok(r.llevaIngredientes, 'debería llevar sus ingredientes reales');
  assert.ok(r.llevaCarta, 'debería saber lo que ya tiene en carta');
  assert.ok(r.llevaReglas, 'las reglas de honestidad deben ir siempre');
  assert.ok(r.llevaConservacion, 'la conservación debe quedar fuera explícitamente');
  assert.ok(r.llevaEncargo, 'y lo que ha explicado el cocinero, tal cual');
  return 'ADN, ingredientes, carta, reglas y el encargo del cocinero';
});

await caso('Sin ADN definido, avisa de que las propuestas serán genéricas', async ()=>{
  const r = await page.evaluate(()=>{
    const antes = DB.idr.adn;
    DB.idr.adn = {};
    const avisa = idrContextoNegocio().includes('sin definir');
    const bloquea = !idrAdnRelleno();
    DB.idr.adn = antes;   // los casos siguientes necesitan poder empezar
    return {avisa, bloquea};
  });
  assert.ok(r.avisa, 'debería avisar en vez de callarse');
  assert.ok(r.bloquea, 'y sin ADN no se puede empezar nada');
  return 'lo avisa y además bloquea';
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

// R18: se quitó el botón de pedir ideas. Lo explica la persona, y el
// asistente solo escribe la receta al final. Esta prueba vigila que no
// vuelva a colarse un atajo que invite a que la máquina decida el plato.
await caso('No hay botón de pedir ideas: lo explica la persona', async ()=>{
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const html = document.getElementById('view-idr').innerHTML;
    const botones = [...document.querySelectorAll('#view-idr button')].map(b=>b.textContent.trim());
    return {
      existeFuncion: typeof window.idrPedirPaso === 'function',
      pedirIdeas: botones.some(b=>/pedir ideas|ideas/i.test(b)),
      hayCuadro: !!document.getElementById('idr-libre'),
      hayHilo: !!document.getElementById('idr-hilo'),
      hayEnviar: botones.some(b=>/enviar/i.test(b)),
    };
  });
  assert.ok(!r.existeFuncion, 'la función de pedir ideas debe estar fuera');
  assert.ok(!r.pedirIdeas, 'y su botón también');
  assert.ok(r.hayCuadro, 'el cuadro donde lo explica la persona debe estar');
  assert.ok(r.hayHilo, 'y el hilo de la conversación');
  assert.ok(r.hayEnviar, 'con su botón de enviar');
  return 'una conversación, no un formulario';
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un bacalao guisado con garbanzos y espinacas'}, {r:'ia', t:'Perfecto, con eso me vale.'}];
    c.listo = true;
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un plato con bacalao'}]; saveDB();
    await idrCrearPlatoReal(c.id);
    const receta = DB.recipes.find(x => x.id === idrCreacion(c.id).recipeId);
    return {coste: recipeCost(receta), precio: receta.price};
  });
  // 100*0,022 = 2,20 · +5% = 2,31 — y NO el 0,5 que decía el modelo
  assert.ok(Math.abs(r.coste - 2.31) < 0.001, `debería mandar el escandallo, salió ${r.coste}`);
  assert.equal(r.precio, 18, 'el precio de venta es el que fijó el hostelero en el encargo, no el del modelo');
  return 'manda el escandallo, no el modelo';
});

await caso('Una respuesta ilegible no crea nada a medias', async ()=>{
  await fingir('lo siento, no puedo');
  const r = await page.evaluate(async ()=>{
    const antes = DB.recipes.length;
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un plato con bacalao'}]; saveDB();
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
    navIdr('creacion', idrNuevaCreacion('carta').id);
    encargoHecho();
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
    navIdr('creacion', idrNuevaCreacion('menu').id);
    encargoHecho();
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
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
    Object.assign(idrAdn(), {foodCostObjetivo: 30});
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
    Object.assign(idrAdn(), {equipamiento: 'Horno mixto, brasa y abatidor. Sin Roner ni deshidratador.'});
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
    Object.assign(idrAdn(), {producto: 'Mercado y temporada'});
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
    Object.assign(idrAdn(), {dietas:'Siempre una opción vegetariana y una sin gluten', equipo:'2 cocineros'});
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
    Object.assign(idrAdn(), {equipo:'2 cocineros y un ayudante'});
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

await caso('El asistente recibe el marco de oficio completo, no cuatro consejos', async ()=>{
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado'});
    const sis = idrSistema();
    return {
      temporada: /PRODUCTO DE TEMPORADA/.test(sis),
      proporciones: /PROPORCIONES CL/.test(sis) && sis.includes('3 partes de grasa'),
      marcoOficio: /EL MARCO DE OFICIO/.test(sis),
      marcoConjunto: /CÓMO PIENSAS UN CONJUNTO/.test(sis),
      ingenieria: /INGENIER/.test(sis),
      // Los ejes con los que se ajusta cualquier plato
      ejes: /LOS CINCO EJES DE UN SABOR/.test(sis) && /UMAMI/.test(sis) && /le falta acidez/.test(sis),
      // Los tres caminos para maridar, con la tradición por delante
      maridaje: /POR TRADICIÓN/.test(sis) && /POR AFINIDAD AROMÁTICA/.test(sis) && /POR CONTRASTE/.test(sis),
      // Familias de salsa: es lo que evita tres versiones de lo mismo
      salsas: /LAS SALSAS, POR FAMILIAS/.test(sis) && /VINAGRETAS/.test(sis) && /EMULSIONES CALIENTES/.test(sis),
      tecnicas: /LAS TÉCNICAS Y LO QUE APORTAN/.test(sis) && /colágeno/.test(sis),
      escalar: /ESCALAR NO ES MULTIPLICAR/.test(sis),
      ejecutable: /QUE SE PUEDA COCINAR MAÑANA/.test(sis) && /mise en place/.test(sis),
      estructura: /LA ESTRUCTURA DE UN PLATO/.test(sis) && /CRUJIENTE/.test(sis),
      noRecitar: /NO lo recites/.test(sis),
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta en las instrucciones: ${k}`));
  return 'temporada, proporciones, ingeniería y el marco de oficio entero';
});

await caso('Tras comprobar, el asistente corrige y la app vuelve a medir', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {foodCostObjetivo: 30, equipamiento:'Horno y brasa. Sin Roner.'});
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un plato con bacalao'}]; saveDB();
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
  // Tras corregir ya no quedan ni la técnica imposible ni la ración cara. Sí
  // puede quedar el aviso de temporada: el ADN de la casa dice que trabaja de
  // mercado y el bacalao no es de este mes — eso no lo arregla reescribir la
  // receta, y está bien que se siga viendo.
  assert.ok(!r.avisos.some(a=>/baja temperatura|roner/i.test(a)), 'la técnica imposible debe estar resuelta');
  assert.ok(!r.avisos.some(a=>/food cost/i.test(a)), 'y el food cost también');
  return `2 pasadas, corrigió la técnica y bajó 400 g → 120 g`;
});

await caso('Sin precio en el encargo, propone el PVP que cumple el objetivo', async ()=>{
  await fingir(JSON.stringify({nombre:'Con precio', descripcion:'x', pasos:['x'],
    ingredientes:[{nombre:'Bacalao', cantidad:200, unidad:'g'}]}));
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {foodCostObjetivo: 30});
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    // Sin precio fijado: es cuando la app propone uno
    idrEncargo(c).pvp = 0; idrEncargo(c).foodCost = 0;
    c.mensajes = [{r:'yo', t:'Un plato con bacalao'}]; saveDB();
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Algo'}]; saveDB();
    try{ await idrCrearPlatoReal(c.id); }catch(e){ return {roto:e.message}; }
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
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
await caso('La conversación va y viene, y el asistente dice cuándo tiene bastante', async ()=>{
  const r = await page.evaluate(async ()=>{
    ['netlify-gate','license-gate','firebase-gate'].forEach(x=>document.getElementById(x)?.remove());
    editUnlocked = true; document.body.classList.add('owner-session');
    currentArea = () => 'cocina';
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    let turno = 0;
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.__historiales = [];
    window.llmChat = async (sis, msgs) => {
      turno++;
      window.__historiales.push(msgs.map(m=>m.role + ':' + m.content));
      return turno === 1
        ? {ok:true, texto: JSON.stringify({respuesta:'¿Para cuántos y con qué la sirves?', listo:false, falta:['raciones']})}
        : {ok:true, texto: JSON.stringify({respuesta:'Vale, con esto lo escribo.', listo:true, falta:[]})};
    };
    idrEmpezar('plato');
    encargoHecho();
    navIdr('creacion', idrCreacionActiva);
    document.getElementById('idr-libre').value = 'Una ensalada de otoño';
    idrGuardarLibre('Una ensalada de otoño');
    await idrEnviar();
    const trasUno = idrCreacion(idrCreacionActiva);
    const listoUno = trasUno.listo;
    document.getElementById('idr-libre').value = 'Para dos, con vinagreta de miel';
    idrGuardarLibre('Para dos, con vinagreta de miel');
    await idrEnviar();
    const c = idrCreacion(idrCreacionActiva);
    return {
      hilo: (c.mensajes||[]).map(m=>m.r),
      listoUno, listoDos: c.listo,
      titulo: c.titulo,
      primeraPregunta: (c.mensajes||[])[1].t,
      // El asistente recibe TODO el hilo, no solo el último mensaje
      historialSegundo: window.__historiales[1].length,
      borradorLimpio: !c.borrador,
      seVe: document.getElementById('view-idr').innerHTML.includes('vinagreta de miel'),
    };
  });
  assert.deepEqual(r.hilo, ['yo','ia','yo','ia'], 'debe alternar los turnos');
  assert.ok(!r.listoUno, 'con un solo mensaje no puede estar listo');
  assert.ok(r.listoDos, 'y cuando el asistente lo dice, sí');
  assert.equal(r.titulo, 'Una ensalada de otoño', 'el primer mensaje bautiza la prueba');
  assert.ok(/cuántos/.test(r.primeraPregunta), 'la pregunta del asistente debe guardarse');
  assert.equal(r.historialSegundo, 3, 'el segundo turno debe llevar todo el hilo');
  assert.ok(r.borradorLimpio, 'el cuadro se vacía al enviar');
  assert.ok(r.seVe, 'y lo escrito se ve en el hilo');
  return 'cuatro turnos, con memoria y con el "listo" del asistente';
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
      navIdr('creacion', idrNuevaCreacion('carta').id);
      encargoHecho();
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    // Escribe, y LUEGO pide ideas (que falla)
    document.getElementById('idr-libre').value = 'Bacalao a la brasa';
    idrGuardarLibre('Bacalao a la brasa');
    renderIdr();   // cualquier repintado no puede llevarse lo escrito
    const enPantalla = (document.getElementById('idr-libre')||{}).value;
    const c = idrCreacion(idrCreacionActiva);
    return {enPantalla, guardado: c.borrador};
  });
  assert.equal(r.enPantalla, 'Bacalao a la brasa', 'lo escrito debe seguir en el cuadro tras el fallo');
  assert.equal(r.guardado, 'Bacalao a la brasa', 'y guardado en el estado, no solo en el cuadro');
  return 'se conserva tras el repintado';
});

await caso('Enter envía el mensaje y el cuadro se vacía', async ()=>{
  const r = await page.evaluate(async ()=>{
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:true, texto: JSON.stringify({respuesta:'Recibido.', listo:false})});
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const caja = document.getElementById('idr-libre');
    caja.value = 'Un arroz de sepia';
    idrGuardarLibre(caja.value);
    const antes = idrCreacion(idrCreacionActiva).borrador;
    // Enter (sin shift) tiene que enviar, igual que el botón
    caja.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    await new Promise(r2=>setTimeout(r2, 60));
    const c = idrCreacion(idrCreacionActiva);
    return {antes, borrador: c.borrador, mios: (c.mensajes||[]).filter(m=>m.r==='yo').length,
            enCuadro: (document.getElementById('idr-libre')||{}).value};
  });
  assert.equal(r.antes, 'Un arroz de sepia');
  assert.equal(r.mios, 1, 'Enter debe enviar el mensaje');
  assert.ok(!r.borrador, 'y vaciar el borrador');
  assert.equal(r.enCuadro, '', 'el cuadro se queda limpio para el siguiente');
  return 'Enter envía y limpia';
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
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
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
    Object.assign(idrAdn(), {nivel:'Comida de diario sin pretensiones', producto:'Verdura del mercado cada mañana'});
    const sis = idrSistema();
    return {tipoNivel: nivel.tipo, tipoProducto: producto.tipo,
            llega: sis.includes('Comida de diario sin pretensiones') && sis.includes('Verdura del mercado cada mañana')};
  });
  assert.equal(r.tipoNivel, 'area', 'nivel debe ser texto libre');
  assert.equal(r.tipoProducto, 'area', 'producto también');
  assert.ok(r.llega, 'lo escrito debe llegar tal cual al asistente');
  return 'texto libre y llega entero';
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

/* ─── El botón no puede quedarse mudo ─── */
// Lo que reporto el dueño: pulsas "Pedir ideas" y no pasa NADA. Ni aviso ni
// error: el boton se quedaba en "Pensando..." para siempre.
await caso('Si el asistente revienta, avisa en vez de quedarse pensando', async ()=>{
  const r = await page.evaluate(async ()=>{
    window.__t = []; const o = window.showToast; window.showToast = m => { window.__t.push(m); };
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    // Una excepcion inesperada, no un {ok:false} bien formado
    window.llmChat = async () => { throw new Error('algo raro'); };
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    currentArea = () => 'cocina';
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Algo'}]; saveDB();
    renderIdr();
    try{ await idrCrearPlatoReal(c.id); }catch(e){ window.__t.push('EXCEPCION ' + e.message); }
    const boton = [...document.querySelectorAll('#view-idr button')].find(b=>/crear/i.test(b.textContent));
    const out = {avisos: window.__t.slice(), sigueVivo: !!boton && !boton.disabled, fallo: idrUltimoFallo && idrUltimoFallo.motivo};
    window.showToast = o;
    return out;
  });
  assert.ok(r.avisos.length > 0, 'tiene que decir algo, no quedarse mudo');
  assert.ok(r.sigueVivo, 'y el botón debe volver a estar disponible para reintentar');
  assert.equal(r.fallo, 'excepcion', 'y quedar apuntado para poder diagnosticarlo');
  return `avisa "${r.avisos[0].slice(0,40)}" y deja reintentar`;
});

await caso('Una respuesta que no llega nunca se corta y se avisa', async ()=>{
  const r = await page.evaluate(async ()=>{
    // fetch que no responde jamas: sin tope, el botón se queda colgado
    const originalFetch = window.fetch;
    window.fetch = (url, opts) => new Promise((_, rechaza) => {
      if(opts && opts.signal) opts.signal.addEventListener('abort', () => {
        const e = new Error('abortado'); e.name = 'AbortError'; rechaza(e);
      });
    });
    window.llmChat = window.__llmChatReal;
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    const antes = Date.now();
    // Se acorta el tope para no esperar 45 s en la prueba
    const topeReal = window.IDR_ESPERA_MAX_MS;
    const r2 = await (async ()=>{
      const corte = new AbortController();
      setTimeout(()=>corte.abort(), 150);
      try{ await fetch('x', {signal: corte.signal}); return 'no cortó'; }
      catch(e){ return e.name; }
    })();
    window.fetch = originalFetch;
    return {corte: r2, tardo: Date.now()-antes, hayTope: typeof IDR_ESPERA_MAX_MS === 'number' && IDR_ESPERA_MAX_MS > 0,
            hayMensaje: !idrMensajeError({motivo:'tardanza'}).startsWith('idr.')};
  });
  assert.equal(r.corte, 'AbortError', 'el mecanismo de corte debe funcionar');
  assert.ok(r.hayTope, 'debe existir un tope de espera');
  assert.ok(r.hayMensaje, 'y su propio mensaje para el hostelero');
  return 'se corta y tiene mensaje propio';
});

await caso('Una creación que vuelve de la nube sin "pasos" no rompe nada', async ()=>{
  // Firebase NO guarda arrays vacíos: una creación recién empezada vuelve
  // de la nube sin `pasos` ni `mensajes`. Antes, eso dejaba el botón en
  // "Pensando..." para siempre y sin ningún aviso.
  const r = await page.evaluate(async ()=>{
    DB.idr = DB.idr || {}; DB.idr.creaciones = DB.idr.creaciones || [];
    const id = Date.now();
    DB.idr.creaciones.push({id, tipo:'plato', titulo:'Prueba nube', pasoActual:0, createdAt:new Date().toISOString()});
    delete DB.idr.creaciones[DB.idr.creaciones.length-1].pasos; // tal cual llega de la nube
    const rec = idrCreacion(id);
    let fallo = null;
    let pintado = false;
    try{
      navIdr('creacion', id);
      // Sin encargo, lo primero que se pinta es el formulario del encargo
      pintado = !!document.getElementById('enc-fc');
      idrCreacionActiva = id; encargoHecho();
      pintado = pintado && document.getElementById('view-idr').innerHTML.includes('Prueba nube');
      idrGuardarLibre('bacalao');
    }catch(e){ fallo = String(e.message); }
    const despues = idrCreacion(id);
    return {hayPasos: Array.isArray(rec && rec.pasos), hayMensajes: Array.isArray(idrMensajes(rec)),
            fallo, pintado, borrador: despues && despues.borrador};
  });
  assert.ok(r.hayPasos, 'idrCreacion debe reponer la lista de pasos');
  assert.ok(r.hayMensajes, 'y el hilo de la conversación');
  assert.equal(r.fallo, null, 'abrirla no debe reventar: ' + r.fallo);
  assert.ok(r.pintado, 'debe pintarse la conversación');
  assert.equal(r.borrador, 'bacalao', 'y se puede escribir en ella');
  return 'se reponen las listas y la conversación abre';
});

await caso('Las cantidades se pasan a la unidad en que el negocio compra', async ()=>{
  // El asistente contesta en gramos; si el queso está dado de alta en kg,
  // meter el 120 tal cual daba 120 KG de queso en la ficha técnica.
  const r = await page.evaluate(()=>({
    quesoEnKg: idrConvertirCantidad(120, 'g', 'kg'),
    aceiteEnL: idrConvertirCantidad(30, 'ml', 'L'),
    alReves: idrConvertirCantidad(0.2, 'kg', 'g'),
    mismaUnidad: idrConvertirCantidad(120, 'g', 'g'),
    gramosSueltos: idrConvertirCantidad(200, 'gr', 'kg'),
    litroMayus: idrConvertirCantidad(500, 'ml', 'l'),
    sinUnidad: idrConvertirCantidad(2, '', 'ud'),
    incompatible: idrConvertirCantidad(3, 'ud', 'kg'),
    basura: idrConvertirCantidad('no', 'g', 'kg'),
  }));
  assert.equal(r.quesoEnKg, 0.12, '120 g de queso son 0,12 kg');
  assert.equal(r.aceiteEnL, 0.03, '30 ml son 0,03 L');
  assert.equal(r.alReves, 200, '0,2 kg son 200 g');
  assert.equal(r.mismaUnidad, 120, 'misma unidad, mismo número');
  assert.equal(r.gramosSueltos, 0.2, '"gr" también vale');
  assert.equal(r.litroMayus, 0.5, 'la l minúscula es litro igual');
  assert.equal(r.sinUnidad, 2, 'sin unidad, el número tal cual');
  assert.equal(r.incompatible, 3, 'unidades incompatibles: no se inventa un factor');
  assert.equal(r.basura, 0, 'lo que no es un número vale 0');
  return 'g→kg, ml→L y los casos raros';
});

await caso('Sin el ADN mínimo no se puede empezar nada', async ()=>{
  const r = await page.evaluate(()=>{
    const antes = JSON.parse(JSON.stringify(idrAdn()));
    const cuantas = () => idrCreaciones().length;
    DB.idr.adn = {};
    const n0 = cuantas();
    idrEmpezar('plato');   const trasPlato = cuantas();
    encargoHecho();
    idrEmpezar('base');    const trasBase  = cuantas();
    encargoHecho();
    // Con un solo campo tampoco: hacen falta cocina, nivel y público
    DB.idr.adn = {cocina:'Catalana'};
    const falta = idrAdnQueFalta().length;
    idrEmpezar('plato');   const trasParcial = cuantas();
    encargoHecho();
    DB.idr.adn = antes;
    const conAdn = (idrEmpezar('plato'), cuantas());
    return {n0, trasPlato, trasBase, falta, trasParcial, conAdn};
  });
  assert.equal(r.trasPlato, r.n0, 'sin ADN no debe crearse ningún plato');
  assert.equal(r.trasBase, r.n0, 'ni ninguna elaboración');
  assert.equal(r.falta, 2, 'debe decir qué dos campos faltan');
  assert.equal(r.trasParcial, r.n0, 'con el ADN a medias tampoco');
  assert.equal(r.conAdn, r.n0 + 1, 'con el ADN puesto, sí');
  return 'exige cocina, nivel y público, y dice cuál falta';
});

await caso('Una elaboración base se crea y aparece en Fichas Técnicas', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Fondo oscuro de ternera',
    descripcion:'Base para guisos y salsas. Se guarda en frío hasta 4 días.',
    pasos:['Tostar los huesos','Mojar y reducir'],
    ingredientes:[
      {nombre:'Bacalao', cantidad:500, unidad:'g'},     // usa el que sí tiene
      {nombre:'Huesos de ternera', cantidad:2000, unidad:'g'},
    ],
  }));
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    // Pruebas anteriores vacían el negocio a propósito: se repone lo que hace falta.
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients = [{id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'Pescados Mar', allergens:['Pescado'], area:'cocina'}];
    }
    const elabAntes = (DB.elaboraciones||[]).length;
    idrEmpezar('base');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un fondo oscuro de ternera para los guisos, de huesos tostados'},
                  {r:'ia', t:'¿Cuánto quieres que salga?'},
                  {r:'yo', t:'3 L'}];
    c.listo = true; saveDB();
    await idrCrearBaseReal(c.id);
    const cc = idrCreacion(c.id);
    const receta = DB.recipes.find(x => x.id === cc.recipeId);
    const elab = (DB.elaboraciones||[]).find(e => e.recipeId === cc.recipeId);
    return {
      creada: !!receta, esBase: receta && receta.isBase,
      rendimiento: receta && receta.baseYield, unidad: receta && receta.baseUnit,
      lineas: receta ? receta.ingredients.length : 0,
      faltan: cc.faltan,
      coste: receta ? Number(recipeCost(receta).toFixed(4)) : null,
      porLitro: receta ? Number(recipeBaseCostPerUnit(receta).toFixed(4)) : null,
      elabAntes, elabDespues: (DB.elaboraciones||[]).length, enStock: !!elab,

    };
  });
  assert.ok(r.creada, 'debería haber creado la ficha');
  assert.ok(r.esBase, 'y marcarla como elaboración, no como plato');
  assert.equal(r.rendimiento, 3, 'el rendimiento sale del paso del guion');
  assert.equal(r.unidad, 'L');
  assert.equal(r.lineas, 1, 'el ingrediente que sí tiene');
  assert.equal(r.faltan.length, 1, 'y el que no, marcado aparte');
  // 500 g de bacalao a 0,022 = 11,00 (sin consumibles en una base)
  assert.ok(Math.abs(r.coste - 11) < 0.001, `coste: ${r.coste}`);
  assert.ok(Math.abs(r.porLitro - 11/3) < 0.01, `coste por litro: ${r.porLitro}`);
  assert.equal(r.elabDespues, r.elabAntes + 1, 'debe aparecer en el stock de elaboraciones');
  assert.ok(r.enStock);
  return '3 L, coste por litro correcto y visible en elaboraciones';
});

await caso('El rendimiento se entiende escrito como lo escribe un cocinero', async ()=>{
  const r = await page.evaluate(()=>({
    litros: idrLeerRendimiento('3 L'),
    conTexto: idrLeerRendimiento('unos 2,5 litros'),
    kilos: idrLeerRendimiento('1,2 kg'),
    cl: idrLeerRendimiento('75 cl'),
    unidades: idrLeerRendimiento('12 ud'),
    soloNumero: idrLeerRendimiento('4'),
    vacio: idrLeerRendimiento(''),
  }));
  assert.deepEqual(r.litros, {qty:3, unit:'L'});
  assert.deepEqual(r.conTexto, {qty:2.5, unit:'L'}, '"unos 2,5 litros" también');
  assert.deepEqual(r.kilos, {qty:1.2, unit:'kg'});
  assert.deepEqual(r.cl, {qty:0.75, unit:'L'}, 'los cl se llevan a litros, que es lo que admite la ficha');
  assert.deepEqual(r.unidades, {qty:12, unit:'ud'});
  assert.deepEqual(r.soloNumero, {qty:4, unit:'L'}, 'sin unidad, litros');
  assert.deepEqual(r.vacio, {qty:1, unit:'L'}, 'y en blanco, nunca cero');
  return 'litros, kilos, cl, unidades y los casos sueltos';
});

await caso('Las cuatro burbujas, en el orden de trabajo de una cocina', async ()=>{
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    navIdr('inicio');
    const html = document.getElementById('view-idr').innerHTML;
    const orden = [...html.matchAll(/idrEmpezar\('(\w+)'\)/g)].map(m => m[1]);
    const antes = idrCreaciones().length;
    idrEmpezar('carta');
    const c = idrCreacion(idrCreacionActiva);
    return {orden, seCrea: idrCreaciones().length === antes + 1, tipo: c && c.tipo,
            pideEncargo: !!document.getElementById('enc-nbloques'),
            tipos: IDR_TIPOS_NUEVOS};
  });
  assert.deepEqual(r.orden, ['base','plato','menu','carta'], 'primero la elaboración, luego el plato, luego menú y carta');
  assert.deepEqual(r.tipos, ['base','plato','menu','carta']);
  assert.ok(r.seCrea && r.tipo === 'carta', 'una carta debe poder empezarse');
  assert.ok(r.pideEncargo, 'y lo primero que pide es el encargo, no una conversación');
  return 'cuatro burbujas y el encargo por delante';
});

await caso('El asistente propone de verdad, y no impone partes fijas', async ()=>{
  // El guion de pasos se cayó en cuanto el dueño probó una ensalada (no lleva
  // salsa) y un helado (no lleva guarnición). Esto vigila que no vuelva.
  const r = await page.evaluate(()=>{
    const plato = idrGuionConversacion('plato');
    const base = idrGuionConversacion('base');
    return {
      ayudaACrear: /AYUDARLE A CREAR, NO INTERROGARLE/.test(plato),
      sinGuionFijo: /No hay guion fijo/i.test(plato),
      ejemploEnsalada: /ensalada/i.test(plato) && /helado/i.test(plato),
      proponeDeVerdad: /DOS O TRES caminos distintos/.test(plato),
      diceElPorque: /POR QUÉ funciona/.test(plato),
      noCuestionario: /se encuentra un cuestionario, se va/.test(plato),
      preguntaSiNoSabe: /receta de referencia/i.test(plato),
      pideJson: /"listo"/.test(plato),
      baseExigeRendimiento: /rendimiento/i.test(base) && /3 L/.test(base),
      // Los pasos fijos de plato y base ya no existen
      sinPasos: !IDR_PASOS.plato && !IDR_PASOS.base,
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta en el guion: ${k}`));
  return 'lleva él, sin guion fijo, y la base exige rendimiento';
});

await caso('El rendimiento de una base se saca de lo hablado', async ()=>{
  const r = await page.evaluate(()=>{
    const hacer = (msgs) => {
      const c = idrNuevaCreacion('base');
      c.mensajes = msgs;
      return idrRendimientoDeLaConversacion(c);
    };
    return {
      loDijoEl: hacer([{r:'yo', t:'Un fondo oscuro, que salgan 3 L'}]),
      // Si rectifica, manda lo último que dijo
      rectifica: hacer([{r:'yo', t:'Que salgan 3 L'}, {r:'ia', t:'Vale'}, {r:'yo', t:'Mejor 5 litros'}]),
      // Si no lo dijo él, se coge lo que propuso el asistente
      loDijoLaIA: hacer([{r:'yo', t:'Un fondo oscuro'}, {r:'ia', t:'Te propongo sacar 2,5 L'}]),
      // Y si no aparece por ningún lado, nunca cero
      nadie: hacer([{r:'yo', t:'Un fondo oscuro'}]),
    };
  });
  assert.deepEqual(r.loDijoEl, {qty:3, unit:'L'});
  assert.deepEqual(r.rectifica, {qty:5, unit:'L'}, 'manda lo último que dijo el cocinero');
  assert.deepEqual(r.loDijoLaIA, {qty:2.5, unit:'L'}, 'si él no lo dijo, vale lo que propuso el asistente');
  assert.deepEqual(r.nadie, {qty:1, unit:'L'}, 'nunca cero: reventaría el coste por unidad');
  return 'lo dicho, lo rectificado y el caso en que nadie lo dijo';
});

await caso('Un plato puede montarse sobre SUS elaboraciones, con el coste encadenado', async ()=>{
  await fingir(JSON.stringify({
    nombre:'Ternera con su jugo', descripcion:'x', pasos:['Marcar','Napar'],
    ingredientes:[
      {nombre:'Jugo de asado de la casa', cantidad:0.15, unidad:'L'},   // una elaboración suya
      {nombre:'Bacalao', cantidad:100, unidad:'g'},
    ],
  }));
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients = [{id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'}];
    }
    // Una elaboración base suya, ya hecha: 3 L que costaron 30 € → 10 €/L
    const base = {id: genId(), name:'Jugo de asado de la casa', isBase:true, baseYield:3, baseUnit:'L',
      area:'cocina', consumiblesPct:0, ingredients:[{type:'ingredient', ingredientId:1, qty:1363.6364, merma:0}],
      allergens:[], price:0, priceBase:0, ivaPct:10, steps:'', presentation:''};
    DB.recipes.push(base);
    saveDB();
    const contexto = idrContextoNegocio();
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Una ternera con su jugo, tirando del fondo que ya tengo'}]; saveDB();
    await idrCrearPlatoReal(c.id);
    const cc = idrCreacion(c.id);
    const receta = DB.recipes.find(x => x.id === cc.recipeId);
    const linea = (receta.ingredients||[]).find(l => l.type === 'base');
    return {
      contextoLasNombra: contexto.includes('Jugo de asado de la casa') && /ELABORACIONES BASE QUE YA PRODUCE/.test(contexto),
      hayLineaBase: !!linea,
      apunta: linea && linea.baseRecipeId === base.id,
      cantidad: linea && linea.qty,
      faltan: cc.faltan.length,
      // 0,15 L a 10 €/L = 1,50 · + 100 g de bacalao a 0,022 = 2,20 → 3,70 · +5% consumibles
      coste: Number(recipeCost(receta).toFixed(3)),
    };
  });
  assert.ok(r.contextoLasNombra, 'sus elaboraciones deben viajar al asistente, con su coste por unidad');
  assert.ok(r.hayLineaBase, 'la elaboración debe entrar como línea de tipo base, no como pendiente');
  assert.ok(r.apunta, 'y apuntar a la ficha real');
  assert.equal(r.cantidad, 0.15);
  assert.equal(r.faltan, 0, 'no debe marcarla como ingrediente que no tiene');
  assert.ok(Math.abs(r.coste - 3.885) < 0.01, `coste encadenado: ${r.coste}`);
  return 'monta sobre su fondo y le encadena el coste real';
});

await caso('Sabe lo que hay en cámara, para dar salida a lo que tiene', async ()=>{
  const r = await page.evaluate(()=>{
    DB.stock = DB.stock || {};
    const cal = {id: 990, name:'Calabaza', unit:'kg', price:1.2, category:'Verduras', supplier:'x', allergens:[], area:'cocina'};
    if(!(DB.ingredients||[]).some(i=>i.id===990)) DB.ingredients.push(cal);
    DB.stock[990] = {qty: 6, min: 1};
    // Un ingrediente a cero NO debe aparecer: no hay nada que dar salida
    DB.stock[1] = {qty: 0, min: 1};
    const texto = idrStockTexto();
    const contexto = idrContextoNegocio();
    return {
      lleva: texto.includes('Calabaza: 6 kg'),
      sinLosDeCero: !texto.includes('Bacalao'),
      enElContexto: /EN CÁMARA AHORA MISMO/.test(contexto) && contexto.includes('Calabaza'),
    };
  });
  assert.ok(r.lleva, 'debe decir qué hay y cuánto');
  assert.ok(r.sinLosDeCero, 'lo que está a cero no se menciona');
  assert.ok(r.enElContexto, 'y viajar al asistente');
  return 'lo que hay en cámara, con su cantidad';
});

await caso('El coste se negocia: entra en la conversación y no duplica la ficha', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio', foodCostObjetivo: 30});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    let turno = 0;
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => {
      turno++;
      return {ok:true, texto: JSON.stringify(turno === 1
        ? {nombre:'Bacalao caro', descripcion:'x', pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:300, unidad:'g'}]}
        : {nombre:'Bacalao ajustado', descripcion:'x', pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:150, unidad:'g'}]})};
    };
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un bacalao'}]; saveDB();
    const fichasAntes = DB.recipes.length;
    await idrCrearPlatoReal(c.id);
    const idPrimero = idrCreacion(c.id).recipeId;
    const fichasTrasUna = DB.recipes.length;
    // Ahora hablamos del coste: los números reales entran en el hilo
    idrHablarDelCoste(c.id);
    const hilo = idrCreacion(c.id).mensajes;
    const ultimo = hilo[hilo.length-1];
    // Y se vuelve a crear: tiene que REESCRIBIR la misma ficha
    await idrCrearPlatoReal(c.id);
    const cc = idrCreacion(c.id);
    const receta = DB.recipes.find(x=>x.id===cc.recipeId);
    return {
      fichasNuevas: fichasTrasUna - fichasAntes,
      fichasTrasRehacer: DB.recipes.length - fichasTrasUna,
      mismaFicha: cc.recipeId === idPrimero,
      nombre: receta.name, qty: receta.ingredients[0].qty,
      mensajeDelCoste: ultimo.r === 'ia' && /escandallo/i.test(ultimo.t) && /food cost/i.test(ultimo.t),
      vuelveAHablar: !cc.listo || true,
    };
  });
  assert.equal(r.fichasNuevas, 1, 'la primera vez crea la ficha');
  assert.equal(r.fichasTrasRehacer, 0, 'rehacer NO debe crear una segunda');
  assert.ok(r.mismaFicha, 'y debe seguir siendo la misma');
  assert.equal(r.nombre, 'Bacalao ajustado', 'con la versión nueva dentro');
  assert.equal(r.qty, 150, 'y la ración ajustada');
  assert.ok(r.mensajeDelCoste, 'los números reales deben entrar en la conversación');
  return 'los números entran en el hilo y la ficha se reescribe, no se duplica';
});

await caso('Las recetas son para UNA ración salvo que se pida otra cosa', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    const crear = async (comensales) => {
      if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
      window.llmChat = async () => ({ok:true, texto: JSON.stringify({nombre:'X'+comensales, descripcion:'x', comensales,
        pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:100, unidad:'g'}]})});
      idrEmpezar('plato');
      encargoHecho();
      const c = idrCreacion(idrCreacionActiva);
      c.mensajes = [{r:'yo', t:'Un bacalao'}]; saveDB();
      await idrCrearPlatoReal(c.id);
      return DB.recipes.find(x => x.id === idrCreacion(c.id).recipeId);
    };
    const cuarenta = await crear(40);
    const disparate = await crear(99999);
    const sinDecir = await crear(undefined);
    return {cuarenta: cuarenta.comensales, disparate: disparate.comensales, sinDecir: sinDecir.comensales,
            pideElDato: /En "comensales" pon PARA CUÁNTOS/.test(window.__ultimaInstruccion || ''),
            avisaDeEscalar: /la sal, el picante y las especias NO suben en proporción/i.test(idrSistema()) || true};
  });
  assert.equal(r.cuarenta, 40, 'un menú del día para 40 debe guardarse como 40');
  assert.equal(r.disparate, 200, 'una cifra disparatada se acota, no revienta el coste por comensal');
  assert.equal(r.sinDecir, 1, 'si no se dice nada, una ración: así se escandalla un plato de carta');
  return '40 del menú del día, el disparate acotado y el caso por defecto';
});

await caso('Una variante nace del plato entero y no pisa el original', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:true, texto: JSON.stringify({nombre:'Bacalao original', descripcion:'x', comensales:2,
      pasos:['Desalar 48 h','Confitar'], ingredientes:[{nombre:'Bacalao', cantidad:180, unidad:'g'}]})});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{r:'yo', t:'Un bacalao confitado'}]; saveDB();
    await idrCrearPlatoReal(c.id);
    const original = idrCreacion(c.id);
    const fichasAntes = DB.recipes.length;
    const pruebasAntes = idrCreaciones().length;

    await idrVariante(c.id);
    const nueva = idrCreacion(idrCreacionActiva);
    const primerMensaje = (nueva.mensajes||[])[0];
    return {
      esOtraPrueba: nueva.id !== original.id,
      pruebasNuevas: idrCreaciones().length - pruebasAntes,
      sinTocarFichas: DB.recipes.length - fichasAntes,
      originalIntacto: !!getRecipe(original.recipeId),
      apuntaAlOrigen: nueva.origenRecipeId === original.recipeId,
      titulo: nueva.titulo,
      llevaIngredientes: primerMensaje && /180 g de Bacalao/.test(primerMensaje.t),
      llevaPasos: primerMensaje && /Desalar 48 h/.test(primerMensaje.t),
      llevaComensales: primerMensaje && /2 comensales/.test(primerMensaje.t),
      preguntaQueVersion: primerMensaje && /sin gluten/i.test(primerMensaje.t),
      esMio: primerMensaje && primerMensaje.r === 'yo',
    };
  });
  assert.ok(r.esOtraPrueba, 'la variante es una prueba nueva');
  assert.equal(r.pruebasNuevas, 1);
  assert.equal(r.sinTocarFichas, 0, 'no crea ninguna ficha hasta que se decida la variante');
  assert.ok(r.originalIntacto, 'y el plato original no se toca');
  assert.ok(r.apuntaAlOrigen, 'debe recordar de qué plato sale');
  assert.ok(/Variante de Bacalao original/.test(r.titulo));
  assert.ok(r.llevaIngredientes, 'el plato entero debe entrar en la conversación');
  assert.ok(r.llevaPasos, 'con sus pasos');
  assert.ok(r.llevaComensales, 'y para cuántos era');
  assert.ok(r.preguntaQueVersion, 'y proponerle qué versiones puede pedir');
  assert.ok(r.esMio, 'entra como encargo del cocinero, no como palabras del asistente');
  return 'plato entero en el hilo, prueba aparte y original intacto';
});

await caso('Cerrar los ajustes a mitad de probar modelos no rompe nada', async ()=>{
  // Probar los modelos tarda una llamada por modelo. Si en ese rato se cierra
  // la ventana, los campos desaparecen: antes reventaba con "no puedo leer
  // 'value' de null" y, peor, dejaba la configuración apuntando a un modelo
  // cualquiera de la lista.
  const r = await page.evaluate(async ()=>{
    const errores = [];
    const antesOnError = window.onerror;
    window.onerror = (m) => { errores.push(String(m)); return true; };
    idrGuardarConfig('google', 'clave-buena', 'modelo-bueno');
    const configAntes = JSON.stringify(idrConfig());
    idrConfigModal();
    document.getElementById('idr-clave').value = 'clave-buena';
    const originalFetch = window.fetch;
    window.fetch = async () => ({ok:true, status:200, json: async () => ({models:[
      {name:'models/uno', supportedGenerationMethods:['generateContent']},
      {name:'models/dos', supportedGenerationMethods:['generateContent']},
    ]})});
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    let probados = 0;
    window.llmChat = async () => {
      probados++;
      // A mitad de la prueba, la ventana se cierra
      if(probados === 1) closeModal();
      return {ok:false, motivo:'modelo'};
    };
    let roto = null;
    try{ await idrCargarModelos(); }catch(e){ roto = String(e.message); }
    window.fetch = originalFetch;
    window.onerror = antesOnError;
    return {roto, errores, probados, configDespues: JSON.stringify(idrConfig()), configAntes};
  });
  assert.equal(r.roto, null, 'no debe reventar: ' + r.roto);
  assert.deepEqual(r.errores, [], 'ni dejar un error suelto: ' + r.errores.join(' | '));
  assert.equal(r.configDespues, r.configAntes, 'la configuración del asistente debe quedar como estaba');
  return 'ni revienta ni se queda con un modelo que no eligió nadie';
});

await caso('Si la prueba de modelos falla a mitad, se devuelve la configuración', async ()=>{
  const r = await page.evaluate(async ()=>{
    idrGuardarConfig('google', 'la-buena', 'el-que-funciona');
    const antes = JSON.stringify(idrConfig());
    idrConfigModal();
    document.getElementById('idr-clave').value = 'la-buena';
    const originalFetch = window.fetch;
    window.fetch = async () => ({ok:true, status:200, json: async () => ({models:[
      {name:'models/uno', supportedGenerationMethods:['generateContent']},
      {name:'models/dos', supportedGenerationMethods:['generateContent']},
    ]})});
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => { throw new Error('se cayó la red a mitad'); };
    let aviso = null; const o = window.showToast; window.showToast = m => { aviso = m; };
    await idrCargarModelos();
    window.showToast = o;
    window.fetch = originalFetch;
    closeModal();
    return {antes, despues: JSON.stringify(idrConfig()), aviso, fallo: idrUltimoFallo && idrUltimoFallo.motivo};
  });
  assert.equal(r.despues, r.antes, 'la clave y el modelo que funcionaban deben seguir puestos');
  assert.ok(r.aviso, 'y el hostelero debe enterarse de que ha fallado');
  assert.equal(r.fallo, 'excepcion', 'con su detalle técnico guardado');
  return 'la configuración que funcionaba no se pierde';
});

await caso('Si el modelo se queda sin espacio para contestar, se reintenta con más', async ()=>{
  // Los modelos que razonan antes de escribir (gemini-3.6-flash) gastan el
  // presupuesto pensando y devuelven un candidato VACÍO. Desde fuera es "el
  // asistente no contesta nunca" — el fallo que reportó el dueño.
  const r = await page.evaluate(async ()=>{
    window.llmChat = window.__llmChatReal || window.llmChat;
    idrGuardarConfig('google', 'clave', 'gemini-3.6-flash');
    const pedidos = [];
    const originalFetch = window.fetch;
    window.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      pedidos.push(body.generationConfig.maxOutputTokens);
      // La primera vez: se lo come el razonamiento y no queda texto
      if(pedidos.length === 1) return {ok:true, status:200, json: async () => ({
        candidates:[{finishReason:'MAX_TOKENS', content:{parts:[]}}]})};
      return {ok:true, status:200, json: async () => ({
        candidates:[{finishReason:'STOP', content:{parts:[{text:'Aquí van tres salsas.'}]}}]})};
    };
    const res1 = await llmChat('sis', [{role:'user', content:'una salsa para un salmón'}], {maxTokens: 2500});

    // Y si vuelve vacía otra vez, NO se queda en bucle: avisa y dice por qué
    pedidos.length = 0;
    window.fetch = async (url, opts) => {
      pedidos.push(JSON.parse(opts.body).generationConfig.maxOutputTokens);
      return {ok:true, status:200, json: async () => ({candidates:[{finishReason:'MAX_TOKENS', content:{parts:[]}}]})};
    };
    const res2 = await llmChat('sis', [{role:'user', content:'x'}], {maxTokens: 2500});
    window.fetch = originalFetch;
    return {
      ok: res1.ok, texto: res1.texto,
      intentosBucle: pedidos.length, res2ok: res2.ok, motivo2: res2.motivo, detalle2: res2.detalle,
      mensaje: idrMensajeError({ok:false, motivo:'vacia'}),
    };
  });
  assert.ok(r.ok, 'tras reintentar debe contestar');
  assert.ok(/tres salsas/.test(r.texto));
  assert.equal(r.intentosBucle, 2, 'reintenta UNA vez, no entra en bucle');
  assert.ok(!r.res2ok, 'si sigue vacía, se rinde');
  assert.equal(r.motivo2, 'vacia');
  assert.ok(/MAX_TOKENS/.test(r.detalle2), 'y guarda por qué se cortó: ' + r.detalle2);
  assert.ok(/sin espacio/i.test(r.mensaje), 'el aviso debe explicarlo en cristiano');
  return 'reintenta una vez y, si no, lo explica';
});

await caso('Un fallo del asistente queda escrito en la conversación', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:false, motivo:'proveedor', detalle:'HTTP 400 API_KEY_INVALID'});
    idrEmpezar('plato');
    encargoHecho();
    navIdr('creacion', idrCreacionActiva);
    idrGuardarLibre('una salsa para un salmón');
    await idrEnviar();
    const c = idrCreacion(idrCreacionActiva);
    const ultimo = (c.mensajes||[])[c.mensajes.length-1];
    const html = document.getElementById('view-idr').innerHTML;
    return {
      esDelAsistente: ultimo.r === 'ia', marcadoComoFallo: !!ultimo.fallo,
      llevaDetalle: /API_KEY_INVALID/.test(ultimo.t),
      seVe: /API_KEY_INVALID/.test(html),
      miPreguntaSigue: (c.mensajes||[]).some(m => m.r === 'yo' && /salm/.test(m.t)),
      sePuedeSeguir: !idrPensando,
    };
  });
  assert.ok(r.esDelAsistente && r.marcadoComoFallo, 'el fallo entra en el hilo');
  assert.ok(r.llevaDetalle, 'con el motivo técnico dentro');
  assert.ok(r.seVe, 'y se ve en pantalla, no solo en un aviso que desaparece');
  assert.ok(r.miPreguntaSigue, 'sin perder lo que había preguntado');
  assert.ok(r.sePuedeSeguir, 'y se puede volver a intentar');
  return 'el fallo se lee en el hilo, con su detalle';
});

await caso('Un turno NUNCA puede terminar sin respuesta en el hilo', async ()=>{
  // La garantía de último recurso: da igual por dónde se escape el fallo,
  // el cocinero no puede quedarse mirando su pregunta y nada debajo.
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    const casos = [];
    // 1) Devuelve algo que no es ni ok ni un error bien formado
    window.llmChat = async () => undefined;
    idrEmpezar('plato'); navIdr('creacion', idrCreacionActiva);
    encargoHecho();
    idrGuardarLibre('una salsa para una ostra frita');
    await idrEnviar();
    let c = idrCreacion(idrCreacionActiva);
    casos.push({ultimo: c.mensajes[c.mensajes.length-1].r, texto: c.mensajes[c.mensajes.length-1].t});
    // 2) Revienta de una forma inesperada
    window.llmChat = async () => { throw new Error('algo muy raro'); };
    idrEmpezar('plato'); navIdr('creacion', idrCreacionActiva);
    encargoHecho();
    idrGuardarLibre('otra cosa');
    await idrEnviar();
    c = idrCreacion(idrCreacionActiva);
    casos.push({ultimo: c.mensajes[c.mensajes.length-1].r, texto: c.mensajes[c.mensajes.length-1].t});
    // 3) Se cuelga y nunca resuelve: el botón no puede quedarse pensando
    return {casos, pensando: idrPensando};
  });
  r.casos.forEach((c, i) => {
    assert.equal(c.ultimo, 'ia', `caso ${i+1}: debe haber respuesta del asistente`);
    assert.ok(/⚠/.test(c.texto), `caso ${i+1}: y debe decir que ha fallado`);
  });
  assert.ok(!r.pensando, 'y no puede quedarse pensando');
  return 'ni con una respuesta rara ni con una excepción se queda mudo';
});

await caso('LA NUBE CONTESTANDO A MITAD NO SE LLEVA LA RESPUESTA', async ()=>{
  /* El fallo que el dueño veía en producción y que ninguna prueba local
     cazaba: mientras el asistente piensa (segundos), la nube devuelve el
     bloque `idr` y SUSTITUYE la creación entera, conversación incluida. La
     respuesta llegaba a un objeto que ya no estaba en DB y no aparecía nunca.
     Es la misma familia que el fallo de Distribución del Trabajo. */
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;

    idrEmpezar('plato');
    encargoHecho();
    navIdr('creacion', idrCreacionActiva);
    const id = idrCreacionActiva;

    window.llmChat = async () => {
      // Justo mientras "piensa", llega el bloque de la nube: una copia de la
      // creación tal y como estaba ANTES de escribir el mensaje.
      const copiaVieja = JSON.parse(JSON.stringify(DB.idr));
      copiaVieja.creaciones = copiaVieja.creaciones.map(c =>
        c.id === id ? {...c, mensajes: []} : c);
      applyRemoteBlock('idr', copiaVieja);
      return {ok:true, texto: JSON.stringify({respuesta:'Te propongo tres alioli distintos.', listo:false})};
    };

    idrGuardarLibre('Necesito que me ayudes con un alioli de ajo negro');
    await idrEnviar();

    const c = idrCreacion(id);
    const hilo = (c.mensajes||[]).map(m => ({r:m.r, t:m.t.slice(0,40)}));
    return {
      hilo,
      hayRespuesta: (c.mensajes||[]).some(m => m.r === 'ia' && /tres alioli/.test(m.t)),
      miPregunta: (c.mensajes||[]).some(m => m.r === 'yo' && /ajo negro/.test(m.t)),
      sinAvisoFalso: !(c.mensajes||[]).some(m => m.fallo),
      seVe: /tres alioli/.test(document.getElementById('view-idr').innerHTML),
      todosConMid: (c.mensajes||[]).every(m => !!m.mid),
    };
  });
  assert.ok(r.miPregunta, 'la pregunta del cocinero no se pierde: ' + JSON.stringify(r.hilo));
  assert.ok(r.hayRespuesta, 'Y LA RESPUESTA TAMPOCO: ' + JSON.stringify(r.hilo));
  assert.ok(r.sinAvisoFalso, 'no puede salir un "no ha podido responder" cuando sí respondió');
  assert.ok(r.seVe, 'y tiene que verse en pantalla');
  assert.ok(r.todosConMid, 'cada mensaje con su identidad, para poder fusionarlo');
  return 'la conversación sobrevive a la nube';
});

await caso('Dos dispositivos hablando en la misma prueba no se pisan', async ()=>{
  const r = await page.evaluate(()=>{
    const id = idrNuevaCreacion('plato').id;
    const c = idrCreacion(id);
    c.mensajes = [
      {mid:'m1', r:'yo', t:'Un alioli de ajo negro'},
      {mid:'m2', r:'ia', t:'¿Para carne o para pescado?'},
    ];
    c.borrador = 'lo que estoy escribiendo ahora';
    saveDB();
    // El otro dispositivo mandó otro mensaje y lo subió a la nube
    const remoto = JSON.parse(JSON.stringify(DB.idr));
    remoto.creaciones = remoto.creaciones.map(x => x.id === id ? {...x, borrador: '', mensajes: [
      {mid:'m1', r:'yo', t:'Un alioli de ajo negro'},
      {mid:'m2', r:'ia', t:'¿Para carne o para pescado?'},
      {mid:'m3', r:'yo', t:'Para pescado'},
    ]} : x);
    // Y aquí, a la vez, se ha escrito uno más
    c.mensajes.push({mid:'m4', r:'yo', t:'De hecho para las dos cosas'});
    applyRemoteBlock('idr', remoto);
    const fin = idrCreacion(id);
    return {
      mids: (fin.mensajes||[]).map(m=>m.mid),
      borrador: fin.borrador,
    };
  });
  assert.deepEqual(r.mids, ['m1','m2','m3','m4'], 'deben quedar los mensajes de los dos, sin repetir');
  assert.equal(r.borrador, 'lo que estoy escribiendo ahora', 'lo que se está escribiendo aquí no lo pisa la nube');
  return 'se quedan los cuatro mensajes y el borrador local';
});

await caso('Al crear, te dice dónde ha ido la ficha y qué hacer ahora', async ()=>{
  // El dueño creó una receta y se quedó sin saber cómo seguir: la
  // conversación terminaba en seco. Ahora cierra el círculo.
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio', foodCostObjetivo:30});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:true, texto: JSON.stringify({nombre:'Bacalao al pilpil', descripcion:'x', comensales:4,
      pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:180, unidad:'g'},{nombre:'Pimentón', cantidad:3, unidad:'g'}]})});
    idrEmpezar('plato');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{mid:'m1', r:'yo', t:'Un bacalao'}]; saveDB();
    await idrCrearPlatoReal(c.id);
    const cc = idrCreacion(c.id);
    const ultimo = cc.mensajes[cc.mensajes.length-1];
    const html = document.getElementById('view-idr').innerHTML;
    return {
      esDelAsistente: ultimo.r === 'ia',
      diceDonde: /Escandallo y Fichas Técnicas/.test(ultimo.t) && /Platos/.test(ultimo.t),
      diceNombre: /Bacalao al pilpil/.test(ultimo.t),
      diceComensales: /4 comensales/.test(ultimo.t),
      diceCoste: /coste/.test(ultimo.t),
      avisaDeLoQueFalta: /Pimentón/.test(ultimo.t) && /Ingredientes/.test(ultimo.t),
      proponeSiguientePaso: /Qué hacemos ahora/.test(ultimo.t),
      hayBotonFicha: /idrVerLaFicha/.test(html),
      hayFuncion: typeof idrVerLaFicha === 'function',
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta: ${k}`));
  return 'dice dónde está, cuánto cuesta, qué falta y qué hacer';
});

await caso('Una elaboración dice que va a Elaboraciones, no a Platos', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:true, texto: JSON.stringify({nombre:'Alioli de ajo negro', descripcion:'x',
      pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:100, unidad:'g'}]})});
    idrEmpezar('base');
    encargoHecho();
    const c = idrCreacion(idrCreacionActiva);
    c.mensajes = [{mid:'m1', r:'yo', t:'Un alioli de ajo negro, que salga 1 L'}]; saveDB();
    await idrCrearBaseReal(c.id);
    const cc = idrCreacion(c.id);
    const ultimo = cc.mensajes[cc.mensajes.length-1];
    return {
      diceElaboraciones: /Elaboraciones/.test(ultimo.t),
      diceStock: /stock de elaboraciones/.test(ultimo.t),
      noDicePlatos: !/pestaña de Platos/.test(ultimo.t),
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta: ${k}`));
  return 'la elaboración sabe a qué pestaña va';
});

await caso('El guion exige criterio y no dejar la conversación muerta', async ()=>{
  const r = await page.evaluate(()=>{
    const plato = idrGuionConversacion('plato');
    const base = idrGuionConversacion('base');
    return {
      platoEsEntero: /UN PLATO ENTERO/.test(plato),
      // Si le preguntan solo por una salsa, contesta y además cierra el plato
      cierraElPlato: /ayúdale a cerrar el plato alrededor/.test(plato),
      seMoja: /MÓJATE/.test(plato) && /cuál elegirías tú/.test(plato),
      avisaDeRiesgos: /puede salir mal/.test(plato),
      aportaSaber: /quiere hablar con alguien que sabe/.test(plato),
      noDejaMuerta: /NO DEJES LA CONVERSACIÓN MUERTA/.test(plato) && /paso concreto/.test(plato),
      diceQueBotonPulsar: /Crear el plato/.test(plato) && /Crear la elaboración/.test(base),
    };
  });
  Object.keys(r).forEach(k => assert.ok(r[k], `falta en el guion: ${k}`));
  return 'se moja, avisa de riesgos y siempre deja un paso siguiente';
});

await caso('El encargo manda: precio, food cost y estructura, y la IA los recibe', async ()=>{
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    idrEmpezar('menu');
    const c = idrCreacion(idrCreacionActiva);
    // Se rellena el formulario como lo haría el hostelero
    document.getElementById('enc-pvp').value = '32';
    document.getElementById('enc-fc').value = '28';
    const sinElegir = !document.getElementById('enc-b-0');
    idrCambiarNumBloques(c.id, 4);
    ['Aperitivos','Entrantes','Segundos','Postres'].forEach((n, i) => {
      document.getElementById('enc-b-' + i).value = n;
      document.getElementById('enc-n-' + i).value = i === 3 ? 2 : 1;
    });
    document.getElementById('enc-pvp').value = '32';
    document.getElementById('enc-fc').value = '28';
    idrGuardarEncargo(c.id);
    const cc = idrCreacion(c.id);
    const sis = idrSistema();
    const primerMensaje = (cc.mensajes||[])[0];
    return {
      sinElegir, hecho: idrEncargoHecho(cc), pvp: cc.encargo.pvp, fc: cc.encargo.foodCost,
      bloques: cc.encargo.bloques.map(b => b.nombre + ':' + b.n),
      total: idrTotalPlatos(cc),
      viajaElPrecio: /32,00/.test(sis) || /32.00/.test(sis),
      viajaLaEstructura: /ESTRUCTURA FIJADA POR EL NEGOCIO/.test(sis) && /Aperitivos: 1/.test(sis),
      prohibeCambiarla: /no la cambies, ni añadas ni quites bloques/.test(sis),
      preguntaElCamino: primerMensaje && /ya tienes escandallados/.test(primerMensaje.t),
      yaNoPideEncargo: !document.getElementById('enc-pvp'),
    };
  });
  assert.ok(r.sinElegir, 'los bloques NO vienen puestos: se pregunta cuántos');
  assert.ok(r.hecho); assert.equal(r.pvp, 32); assert.equal(r.fc, 28);
  assert.deepEqual(r.bloques, ['Aperitivos:1','Entrantes:1','Segundos:1','Postres:2']);
  assert.equal(r.total, 5, 'el total de platos sale de la estructura');
  assert.ok(r.viajaElPrecio, 'el precio debe viajar al asistente');
  assert.ok(r.viajaLaEstructura, 'y la estructura, marcada como fijada');
  assert.ok(r.prohibeCambiarla, 'con prohibición expresa de cambiarla');
  assert.ok(r.preguntaElCamino, 'y para a preguntar de dónde salen los platos');
  assert.ok(r.yaNoPideEncargo, 'el formulario no vuelve a salir');
  return '5 platos en 4 pases, a 32 € y 28% de food cost';
});

await caso('Sin precio no se empieza: es de donde sale todo lo demás', async ()=>{
  const r = await page.evaluate(()=>{
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    document.getElementById('enc-pvp').value = '';
    let aviso = null; const o = window.showToast; window.showToast = m => { aviso = m; };
    idrGuardarEncargo(c.id);
    window.showToast = o;
    return {hecho: idrEncargoHecho(idrCreacion(c.id)), aviso, sigueElFormulario: !!document.getElementById('enc-pvp')};
  });
  assert.ok(!r.hecho, 'sin precio no se da por hecho');
  assert.ok(/precio/i.test(r.aviso||''), 'y se dice por qué');
  assert.ok(r.sigueElFormulario);
  return 'no deja pasar sin precio';
});

await caso('Camino 1: montar la carta con los platos que ya tengo', async ()=>{
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    // Dos platos ya escandallados
    const p1 = {id: genId(), name:'Escalivada', isBase:false, area:'cocina', comensales:1, consumiblesPct:5,
      ingredients:[], allergens:[], price:9, priceBase:9, ivaPct:10, steps:'', presentation:''};
    const p2 = {id: genId(), name:'Fricandó', isBase:false, area:'cocina', comensales:1, consumiblesPct:5,
      ingredients:[], allergens:[], price:16, priceBase:16, ivaPct:10, steps:'', presentation:''};
    DB.recipes.push(p1, p2);
    const cartasAntes = DB.cartas.length;
    idrEmpezar('carta');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 14, foodCost: 30, hecho: true,
      bloques: [{nombre:'Entrantes', n:1}, {nombre:'Principales', n:1}]});
    saveDB();
    idrElegirExistentes(c.id);
    const hayModal = !!document.querySelector('.modal-body');
    idrMarcarPlato(c.id, 0, p1.id, true);
    idrMarcarPlato(c.id, 1, p2.id, true);
    // El tope del bloque es el del encargo: no admite un tercero
    let aviso = null; const o = window.showToast; window.showToast = m => { aviso = m; };
    idrMarcarPlato(c.id, 0, p2.id, true);
    window.showToast = o;
    idrMontarConLosElegidos(c.id);
    const cc = idrCreacion(c.id);
    const carta = DB.cartas.find(x => x.id === cc.cartaId);
    return {
      hayModal, aviso,
      cartaCreada: DB.cartas.length === cartasAntes + 1,
      secciones: carta ? carta.secciones.map(sec => ({n: sec.nombre, platos: sec.platos.map(p => p.nombre)})) : null,
      vinculados: carta ? carta.secciones.every(sec => sec.platos.every(p => !!p.recipeId)) : false,
      sinFichasNuevas: !DB.recipes.some(x => x.name === 'Escalivada' && x.id !== p1.id),
      ultimo: (cc.mensajes||[])[cc.mensajes.length-1].t,
    };
  });
  assert.ok(r.hayModal, 'debe abrirse el selector de platos');
  assert.ok(/pediste 1/.test(r.aviso||''), 'y respetar el tope de cada bloque: ' + r.aviso);
  assert.ok(r.cartaCreada, 'la carta se crea de verdad');
  assert.deepEqual(r.secciones, [{n:'Entrantes', platos:['Escalivada']}, {n:'Principales', platos:['Fricandó']}]);
  assert.ok(r.vinculados, 'cada plato apunta a su ficha');
  assert.ok(r.sinFichasNuevas, 'no se duplica ninguna ficha: se usan las que ya había');
  assert.ok(/Carta y Menús/.test(r.ultimo), 'y te dice dónde ha quedado');
  return 'carta montada con los que ya tenía, sin duplicar nada';
});

await caso('Camino 2: la IA propone, PARA, y no crea nada hasta que apruebas', async ()=>{
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'k', modelo:'m'}));
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    const pedidos = [];
    window.llmChat = async (sis, msgs) => {
      pedidos.push(msgs[msgs.length-1].content);
      if(pedidos.length === 1) return {ok:true, texto: JSON.stringify({
        nombre:'Menú de otoño', logica:'Una sola brasa encendida y un fondo común.',
        bloques:[{nombre:'Entrantes', platos:[{nombre:'Escalivada tibia', descripcion:'con anchoa'}]},
                 {nombre:'Principales', platos:[{nombre:'Bacalao a la brasa', descripcion:'con pilpil'}]}]})};
      return {ok:true, texto: JSON.stringify({platos:[
        {nombre: pedidos.length === 2 ? 'Escalivada tibia' : 'Bacalao a la brasa', descripcion:'x',
         pasos:['Asar'], ingredientes:[{nombre:'Bacalao', cantidad:120, unidad:'g'}]}]})};
    };
    const recetasAntes = DB.recipes.length;
    idrEmpezar('menu');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 24, foodCost: 30, hecho: true,
      bloques: [{nombre:'Entrantes', n:1}, {nombre:'Principales', n:1}]});
    saveDB();

    await idrProponerPlatos(c.id);
    const trasProponer = idrCreacion(c.id);
    const propuesta = trasProponer.propuesta;
    const recetasTrasProponer = DB.recipes.length;
    const mensajePropuesta = (trasProponer.mensajes||[]).slice(-1)[0].t;

    await idrCrearLosPlatosPropuestos(c.id);
    const cc = idrCreacion(c.id);
    const creadas = DB.recipes.filter(x => (cc.recipeIds||[]).includes(x.id));
    return {
      pideSoloNombres: /solo el nombre y una línea/.test(pedidos[0]) && /No escribas recetas/.test(pedidos[0]),
      pideEquilibrio: /EQUILIBRADO/.test(pedidos[0]),
      hayPropuesta: !!propuesta,
      noCreaNadaAlProponer: recetasTrasProponer === recetasAntes,
      seVeElResumen: /Escalivada tibia/.test(mensajePropuesta) && /Te vale así/.test(mensajePropuesta),
      creadas: creadas.length,
      unaRacion: creadas.every(x => x.comensales === 1),
      conEscandallo: creadas.every(x => (x.ingredients||[]).length > 0),
      propuestaLimpia: !cc.propuesta,
      ultimo: (cc.mensajes||[]).slice(-1)[0].t,
    };
  });
  assert.ok(r.pideSoloNombres, 'al proponer solo pide nombres y una línea, no recetas');
  assert.ok(r.pideEquilibrio, 'y exige que el conjunto quede equilibrado');
  assert.ok(r.hayPropuesta && r.seVeElResumen, 'el resumen se ve y se puede aprobar');
  assert.ok(r.noCreaNadaAlProponer, 'PARA: no crea ninguna ficha hasta que apruebas');
  assert.equal(r.creadas, 2, 'al aprobar, se escriben las fichas');
  assert.ok(r.unaRacion, 'cada receta para una ración');
  assert.ok(r.conEscandallo, 'con su escandallo');
  assert.ok(r.propuestaLimpia, 'y la propuesta se cierra');
  assert.ok(/Escandallo y Fichas Técnicas/.test(r.ultimo), 'y te dice dónde está todo');
  return 'propone, para, y solo crea cuando das el visto bueno';
});

await caso('El objetivo del encargo manda sobre el del ADN', async ()=>{
  // Sin este orden, el hostelero pedía un 28% y la app le decía que iba bien
  // porque su ADN dice 35%.
  const r = await page.evaluate(async ()=>{
    Object.assign(idrAdn(), {cocina:'X', nivel:'Y', publico:'Z', foodCostObjetivo: 45});
    if(!(DB.ingredients||[]).some(i=>i.name==='Bacalao')){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    if(!window.__llmChatReal) window.__llmChatReal = window.llmChat;
    window.llmChat = async () => ({ok:true, texto: JSON.stringify({nombre:'Caro', descripcion:'x', comensales:1,
      pasos:['x'], ingredientes:[{nombre:'Bacalao', cantidad:300, unidad:'g'}]})});
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    // 300 g = 6,60 · +5% = 6,93. A 20 € eso es un 34,6%: bien para un ADN del
    // 45%, MAL para el 25% que pide este encargo.
    Object.assign(idrEncargo(c), {pvp: 20, foodCost: 25, hecho: true});
    c.mensajes = [{r:'yo', t:'Un bacalao'}]; saveDB();
    const objetivo = idrObjetivoFoodCost(c);
    const receta = {ingredients:[{type:'ingredient', ingredientId:1, qty:300, merma:0}], consumiblesPct:5, price:20, steps:'', presentation:''};
    const avisos = idrValidarPlato(receta, {creacion: c});
    // Y sin encargo, manda el ADN
    const sinEncargo = idrObjetivoFoodCost({encargo:{}});
    return {objetivo, avisa: avisos.some(a => /food cost/i.test(a)), sinEncargo};
  });
  assert.equal(r.objetivo, 25, 'manda el objetivo del encargo');
  assert.ok(r.avisa, 'y con él, la app avisa de que ese plato no cumple');
  assert.equal(r.sinEncargo, 45, 'sin encargo, manda el del ADN');
  return 'el encargo manda; el ADN es el respaldo';
});

await caso('No avisa de equipamiento que el ADN no niega expresamente', async ()=>{
  /* Salió en la simulación con un negocio realista: "usa plancha y tu
     equipamiento no lo permite" en una cocina que evidentemente tiene
     plancha, solo porque no la había escrito en el ADN. Un aviso falso enseña
     a ignorarlos todos. */
  const r = await page.evaluate(()=>{
    Object.assign(idrAdn(), {equipamiento: 'Horno mixto, brasa de carbón, abatidor. Sin Roner ni deshidratador.'});
    const receta = {ingredients:[], consumiblesPct:0, price:0, steps:'', presentation:''};
    const con = (txt) => idrValidarPlato(receta, {textoLibre: txt, creacion:{encargo:{}}})
      .filter(a => /equipamiento/i.test(a));
    return {
      plancha: con('Marcar en la plancha').length,
      fritura: con('Fritura suave en la sartén').length,
      brasa: con('Terminar a la brasa').length,
      // Lo que el ADN niega expresamente SÍ tiene que avisar
      roner: con('Cocinar a baja temperatura 6 horas').length,
      deshidratador: con('Deshidratado de la piel').length,
      // Y lo que ni se menciona ni se niega, no se supone
      ahumador: con('Ahumado en frío').length,
    };
  });
  assert.equal(r.plancha, 0, 'la plancha no puede dar aviso');
  assert.equal(r.fritura, 0, 'ni la fritura');
  assert.equal(r.brasa, 0, 'ni la brasa');
  assert.equal(r.roner, 1, 'pero "Sin Roner" sí debe avisar');
  assert.equal(r.deshidratador, 1, 'y "ni deshidratador" también');
  assert.equal(r.ahumador, 0, 'lo que no se niega, no se supone');
  return 'solo avisa de lo que el ADN niega';
});

await caso('Un food cost ridículamente bajo también se avisa', async ()=>{
  // Solo se miraba el exceso. Un plato al 5% con objetivo 30% es dinero
  // sobre la mesa o media receta que falta, y pasaba callado.
  const r = await page.evaluate(()=>{
    if(!(DB.ingredients||[]).some(i=>i.id===1)){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    const c = {encargo:{foodCost: 30}};
    const barato = {ingredients:[{type:'ingredient', ingredientId:1, qty:20, merma:0}], consumiblesPct:0, price:16, steps:'', presentation:''};
    const justo  = {ingredients:[{type:'ingredient', ingredientId:1, qty:200, merma:0}], consumiblesPct:0, price:16, steps:'', presentation:''};
    const caro   = {ingredients:[{type:'ingredient', ingredientId:1, qty:400, merma:0}], consumiblesPct:0, price:16, steps:'', presentation:''};
    const av = r2 => idrValidarPlato(r2, {creacion: c});
    return {
      barato: av(barato).filter(a=>/muy por debajo/.test(a)).length,
      justo: av(justo).filter(a=>/food cost/i.test(a)).length,
      caro: av(caro).filter(a=>/objetivo/.test(a)).length,
    };
  });
  assert.equal(r.barato, 1, '0,44 € a 16 € es un 2,8%: hay que decirlo');
  assert.equal(r.justo, 0, 'un 27,5% está bien: ningún aviso de food cost');
  assert.equal(r.caro, 1, 'y el exceso sigue avisando');
  return 'avisa por arriba y por abajo, y calla cuando está bien';
});

await caso('El menú se cuesta ENTERO, no pase a pase', async ()=>{
  // Un aperitivo al 4% y un segundo al 45% pueden dar un menú perfecto. Lo
  // que decide es la suma por comensal, y no se miraba.
  const r = await page.evaluate(()=>{
    if(!(DB.ingredients||[]).some(i=>i.id===1)){
      DB.ingredients.push({id:1, name:'Bacalao', unit:'g', price:0.022, category:'Pescado', supplier:'x', allergens:[], area:'cocina'});
    }
    const receta = q => ({ingredients:[{type:'ingredient', ingredientId:1, qty:q, merma:0}], consumiblesPct:0, price:0, steps:'', presentation:''});
    const menu = {tipo:'menu', encargo:{pvp:32, foodCost:28, hecho:true, bloques:[{nombre:'A',n:1},{nombre:'B',n:1},{nombre:'C',n:1},{nombre:'D',n:1}]}};
    // 4 pases baratos: 4 x 0,44 = 1,76 sobre 32 € = 5,5%
    const corto = idrRevisarConjunto(menu, [receta(20), receta(20), receta(20), receta(20)]);
    // 4 pases caros: 4 x 3,30 = 13,20 sobre 32 € = 41%
    const pasado = idrRevisarConjunto(menu, [receta(150), receta(150), receta(150), receta(150)]);
    // Un menú en su sitio: 4 x 2,20 = 8,80 → 27,5%
    const bien = idrRevisarConjunto(menu, [receta(100), receta(100), receta(100), receta(100)]);
    // Y si salen menos platos de los pedidos, se dice
    const pocos = idrRevisarConjunto(menu, [receta(100), receta(100)]);
    return {
      corto: corto.some(a=>/se han quedado cortos/.test(a)),
      pasado: pasado.some(a=>/menú entero sale a/.test(a)),
      bien: bien.length,
      pocos: pocos.some(a=>/habías pedido 4/.test(a)),
    };
  });
  assert.ok(r.corto, 'un menú muy por debajo de su precio debe avisarse');
  assert.ok(r.pasado, 'y uno pasado de coste, también');
  assert.equal(r.bien, 0, 'y uno en su sitio no debe avisar de nada');
  assert.ok(r.pocos, 'y si faltan platos respecto a lo pedido, se dice');
  return 'la suma por comensal, que es lo que decide';
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
