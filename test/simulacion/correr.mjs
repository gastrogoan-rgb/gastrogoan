// Simulación de los cuatro flujos con un negocio realista. Yo hago de modelo:
// el script vuelca lo que la app pide y aplica las respuestas de un fichero.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RESP_PATH = path.join(AQUI, 'respuestas.json');
const SALIDA = path.join(AQUI, 'salida');
fs.mkdirSync(SALIDA, {recursive: true});

const RESPUESTAS = fs.existsSync(RESP_PATH)
  ? JSON.parse(fs.readFileSync(RESP_PATH,'utf8')) : {};

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'SIMULAR1',tenantId:ggBizTenantId('SIMULAR1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));

// Un negocio de verdad: un bistró catalán de mercado.
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,ivaPct:10});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true; document.body.classList.add('owner-session','edit-unlocked');
  currentArea = () => 'cocina';
  const ing = [
    ['Bacalao desalado','g',0.028,'Pescado','Peix del Port',['Pescado']],
    ['Calabaza','kg',1.40,'Verduras','Hortalisses Vic',[]],
    ['Cebolla','kg',0.95,'Verduras','Hortalisses Vic',[]],
    ['Puerro','kg',1.80,'Verduras','Hortalisses Vic',[]],
    ['Zanahoria','kg',1.10,'Verduras','Hortalisses Vic',[]],
    ['Huesos de ternera','kg',2.20,'Carnicería','Cárnicas Pérez',[]],
    ['Panceta ibérica','kg',9.80,'Carnicería','Cárnicas Pérez',[]],
    ['Aceite de oliva virgen','L',6.20,'Aceites','Oli de Ponent',[]],
    ['Vino tinto','L',3.40,'Bodega','Celler Roure',['Sulfitos']],
    ['Garbanzos cocidos','kg',2.30,'Legumbres','Llegums SA',[]],
    ['Espinacas','kg',3.60,'Verduras','Hortalisses Vic',[]],
    ['Piñones','kg',28.00,'Frutos secos','Fruits Secs Coll',['Frutos de cáscara']],
    ['Pasas','kg',6.40,'Frutos secos','Fruits Secs Coll',[]],
    ['Harina','kg',0.85,'Secos','Distribucions Camp',['Gluten']],
    ['Mantequilla','kg',8.90,'Lácteos','Làctics Pirineu',['Lácteos']],
    ['Nata 35%','L',4.10,'Lácteos','Làctics Pirineu',['Lácteos']],
    ['Huevos','ud',0.28,'Huevos','Ous del Camp',['Huevos']],
    ['Azúcar','kg',1.05,'Secos','Distribucions Camp',[]],
    ['Manzana','kg',1.60,'Frutas','Hortalisses Vic',[]],
    ['Vinagre de Jerez','L',7.50,'Vinagres','Oli de Ponent',['Sulfitos']],
    ['Miel','kg',9.20,'Secos','Distribucions Camp',[]],
    ['Mostaza de Dijon','kg',6.80,'Secos','Distribucions Camp',['Mostaza']],
    ['Pan de payés','kg',3.20,'Panadería','Forn Vell',['Gluten']],
    ['Sepia','kg',12.50,'Pescado','Peix del Port',['Moluscos']],
    ['Arroz bomba','kg',3.80,'Secos','Distribucions Camp',[]],
    ['Tomate maduro','kg',1.90,'Verduras','Hortalisses Vic',[]],
    ['Ajo','kg',4.20,'Verduras','Hortalisses Vic',[]],
    ['Chocolate 70%','kg',12.00,'Repostería','Distribucions Camp',['Soja']],
  ];
  DB.ingredients = ing.map((x,i)=>({id:i+1, name:x[0], unit:x[1], price:x[2], category:x[3], supplier:x[4], allergens:x[5], area:'cocina'}));
  DB.recipes = []; DB.fichas = []; DB.cartas = []; DB.elaboraciones = [];
  DB.idr = {adn:{
    cocina:'Catalana de mercado, con brasa',
    nivel:'Bistró de barrio, mantel de papel y buen producto',
    publico:'Vecinos y oficinas al mediodía; parejas los fines de semana',
    producto:'Mercado y temporada, proveedor de proximidad',
    equipamiento:'Horno mixto, brasa de carbón, abatidor. Sin Roner ni deshidratador.',
    equipo:'2 cocineros y un ayudante',
    foodCostObjetivo:30,
    lineasRojas:'Nada de espumas ni esferificaciones. Nada de cocina asiática.',
    dietas:'Siempre una opción vegetariana y una sin gluten',
    idiomaPlatos:'Catalán y castellano',
    insignia:'El bacalao a la llauna de la abuela',
  }, creaciones:[], carpetas:[]};
  localStorage.setItem('gastrogoan_idr_key', JSON.stringify({proveedor:'google', clave:'simulada', modelo:'simulado'}));
  saveDB();
});

// El "modelo": devuelve lo que haya en sim-respuestas.json para esa clave, y
// apunta TODO lo que la app le pide para poder revisarlo.
await page.evaluate((resp)=>{
  window.__prompts = [];
  window.__pendiente = null;
  window.llmChat = async (sistema, mensajes, op) => {
    const instruccion = mensajes[mensajes.length-1].content;
    window.__prompts.push({sistema, mensajes: mensajes.map(m=>({role:m.role, content:m.content})), op});
    const clave = window.__claveActual + ':' + (window.__prompts.length);
    if(resp[clave]) return {ok:true, texto: JSON.stringify(resp[clave])};
    window.__pendiente = clave;
    return {ok:true, texto: JSON.stringify({respuesta:'(sin respuesta preparada para ' + clave + ')', listo:false})};
  };
}, RESPUESTAS);

const paso = async (nombre, fn) => {
  await page.evaluate(n => { window.__claveActual = n; window.__prompts = []; }, nombre);
  await fn();
  const info = await page.evaluate(()=>({prompts: window.__prompts, pendiente: window.__pendiente}));
  fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify(info, null, 2));
  console.log(`— ${nombre}: ${info.prompts.length} peticiones`);
};

// 1) ELABORACIÓN BASE
await paso('base', async ()=>{
  await page.evaluate(async ()=>{
    idrEmpezar('base');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 0, foodCost: 30, hecho: true});
    saveDB(); renderIdr();
    idrGuardarLibre('Necesito un fondo oscuro de ternera para los guisos y las carnes de la semana. Que salgan 4 L.');
    await idrEnviar();
    await idrCrearBaseReal(c.id);
  });
});

// 2) PLATO
await paso('plato', async ()=>{
  await page.evaluate(async ()=>{
    idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 16.5, foodCost: 30, hecho: true});
    saveDB(); renderIdr();
    idrGuardarLibre('Quiero un plato de calabaza para la carta de otoño, de entrante caliente, que no sea la crema de siempre.');
    await idrEnviar();
    await idrCrearPlatoReal(c.id);
  });
});

// 3) CARTA
await paso('carta', async ()=>{
  await page.evaluate(async ()=>{
    idrEmpezar('carta');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 14, foodCost: 30, hecho: true,
      bloques:[{nombre:'Entrantes', n:2},{nombre:'Principales', n:2},{nombre:'Postres', n:1}]});
    saveDB(); renderIdr();
    await idrProponerPlatos(c.id);
    await idrCrearLosPlatosPropuestos(c.id);
  });
});

// 4) MENÚ
await paso('menu', async ()=>{
  await page.evaluate(async ()=>{
    idrEmpezar('menu');
    const c = idrCreacion(idrCreacionActiva);
    Object.assign(idrEncargo(c), {pvp: 32, foodCost: 28, hecho: true,
      bloques:[{nombre:'Aperitivo', n:1},{nombre:'Entrante', n:1},{nombre:'Segundo', n:1},{nombre:'Postre', n:1}]});
    saveDB(); renderIdr();
    await idrProponerPlatos(c.id);
    await idrCrearLosPlatosPropuestos(c.id);
  });
});

const estado = await page.evaluate(()=>({
  recetas: DB.recipes.map(r => ({
    nombre: r.name, base: !!r.isBase, comensales: r.comensales,
    rendimiento: r.isBase ? r.baseYield + ' ' + r.baseUnit : null,
    lineas: (r.ingredients||[]).length,
    coste: Number(recipeCost(r).toFixed(3)),
    pvp: r.price,
    fc: r.price ? Number((recipeCost(r)/r.price*100).toFixed(1)) : null,
    pasos: (r.steps||'').split('\n').filter(Boolean).length,
    alergenos: typeof recipeComputedAllergens === 'function' ? recipeComputedAllergens(r) : [],
  })),
  elaboraciones: (DB.elaboraciones||[]).map(e => e.name + ' (' + e.unit + ')'),
  cartas: (DB.cartas||[]).map(c => ({nombre: c.nombre, secciones: (c.secciones||[]).map(s => s.nombre + ': ' + s.platos.map(p=>p.nombre).join(' | '))})),
  creaciones: idrCreaciones().map(c => ({tipo: c.tipo, titulo: c.titulo, faltan: c.faltan, avisos: c.avisos, recetas: (c.recipeIds||[]).length})),
}));
fs.writeFileSync(path.join(SALIDA, 'estado.json'), JSON.stringify(estado, null, 2));
console.log('\nEstado guardado en test/simulacion/salida/estado.json');
await browser.close();
