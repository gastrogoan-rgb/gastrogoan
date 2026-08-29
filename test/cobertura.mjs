// Cuánto de la app se ejecuta de verdad — R22.
//
// No es una prueba que pase o falle: es el mapa de lo que NO se toca. Todas
// las demás prueban por muestras; esta responde a la única pregunta que
// importa cuando se quiere estar seguro: ¿qué parte de la app no ha
// ejecutado nadie?
//
// Recorre todas las pantallas en las tres carpetas, abre las pestañas
// internas y las ventanas, y luego cuenta qué funciones se han ejecutado y
// cuáles no. Las que no, quedan listadas por módulo para poder juzgar el
// riesgo con datos en vez de con intuición.
import puppeteer from 'puppeteer-core';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';

const dirJs = new URL('../js/', import.meta.url);
const FICHEROS = readdirSync(dirJs).filter(f => f.endsWith('.js'));

// Inventario de funciones declaradas, con su línea, para poder decir dónde
// está cada una de las que no se ejecuta.
const declaradas = [];
FICHEROS.forEach(f => {
  const src = readFileSync(new URL(f, dirJs), 'utf8');
  src.split('\n').forEach((linea, i) => {
    const m = linea.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if(m) declaradas.push({fichero: f.replace('.js',''), nombre: m[1], linea: i+1});
  });
});

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errs = [];
page.on('pageerror', e => errs.push(e.message));

await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'COBERT01', tenantId: ggBizTenantId('COBERT01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(async ()=>{
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Restaurante de Prueba'});
  DB.business.ownFirebase = {apiKey:'f', databaseURL:'https://f-default-rtdb.firebaseio.com'};
  const hoy = new Date().toISOString().slice(0,10);
  DB.suppliers = [{id:1, nombre:'Proveedor Uno', telefono:'600111222', email:'p@uno.es', categorias:['Carnes']}];
  DB.ingredients = [
    {id:1, name:'Harina', unit:'g', price:0.001, category:'Secos', supplier:'Proveedor Uno', allergens:['Gluten'], area:'cocina', stock:1000},
    {id:2, name:'Vino tinto', unit:'ml', price:0.01, category:'Vinos y Cavas', supplier:'Proveedor Uno', allergens:['Sulfitos'], area:'sala', stock:3000},
  ];
  DB.recipes = [
    {id:10, name:'Croquetas', area:'cocina', comensales:2, consumiblesPct:5, price:9, priceBase:9, ivaPct:10, allergens:[], ingredients:[{type:'ingredient', ingredientId:1, qty:100, merma:0}]},
    {id:11, name:'Copa de tinto', area:'sala', comensales:1, consumiblesPct:5, price:3, priceBase:3, ivaPct:10, allergens:[], ingredients:[{type:'ingredient', ingredientId:2, qty:150, merma:0}]},
  ];
  DB.fichas = [{id:20, name:'Croquetas', recipeId:10, area:'cocina', comensales:2, ingredients:[], pasos:['Hacer'], allergens:[], presentation:''}];
  DB.employees = [{id:30, name:'Ana', rol:'Cocinera', area:'cocina', active:true, color:'#DF7039'}];
  DB.clients = [{id:40, name:'Cliente Uno', phone:'600333444', email:'c@uno.es', visits:3}];
  DB.reservations = [{id:50, clientName:'Cliente Uno', phone:'600333444', date:hoy, time:'21:00', pax:2, estado:'CONFIRMADA', publicToken:'tok1'}];
  DB.purchaseOrders = [{id:60, supplier:'Proveedor Uno', date:hoy, estado:'ENVIADO', items:[{ingredientId:1, cantidad:5, precio:1}]}];
  DB.sales = [{id:70, date:hoy, createdAt:new Date().toISOString(), total:20, subtotal:18, propina:0, tipo:'mesa', metodoPago:'efectivo', items:[{name:'Croquetas', qty:2, price:9, ivaPct:10, costeUnitario:1}]}];
  DB.cartas = [{id:80, nombre:'CARTA', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[{id:81, nombre:'Entrantes', platos:[{id:82, recipeId:10, nombre:'Croquetas', precio:9, ivaPct:10, disponible:true}]}]}];
  await saveDB();
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2600));

// A partir de aquí se apunta todo lo que se ejecuta.
await page.evaluate((nombres)=>{
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');
  window.showToast = ()=>{};
  window.__tocadas = new Set();
  nombres.forEach(n => {
    const orig = window[n];
    if(typeof orig !== 'function') return;
    try{
      window[n] = function(...a){ window.__tocadas.add(n); return orig.apply(this, a); };
    }catch(e){}
  });
}, [...new Set(declaradas.map(d => d.nombre))]);

const VISTAS = {
  cocina: ['comandascocina','carta','idr','megalista','proveedores','escandallo','fichas','pedidos','stock','horarios','distribucion','limpieza'],
  sala:   ['tpv','reservas','clientes','carta','megalista','proveedores','escandallo','fichas','stock','pedidos','horarios','distribucion','limpieza','promocion'],
  gestion:['manual','minegocio','dashboard','economia'],
};

for(const [carpeta, vistas] of Object.entries(VISTAS)){
  for(const v of vistas){
    await page.evaluate(async ({carpeta, v})=>{
      currentFolder = carpeta;
      try{ navigate(v); }catch(e){}
      // Y todas las pestañas internas que tenga
      await new Promise(r=>setTimeout(r,60));
      const pestanas = [...document.querySelectorAll(`#view-${v} .tab, #view-${v} .ge-tab, #view-${v} [class*="tab"]`)]
        .filter(el => el.tagName === 'BUTTON' || el.onclick || el.getAttribute('onclick'));
      for(const p of pestanas.slice(0, 12)){
        try{ p.click(); }catch(e){}
        await new Promise(r=>setTimeout(r,25));
      }
    }, {carpeta, v});
    await new Promise(r=>setTimeout(r,90));
  }
}

// Y todas las ventanas que se puedan abrir en frío
await page.evaluate(async (nombres)=>{
  for(const n of nombres){
    const fn = window[n];
    if(typeof fn !== 'function') continue;
    try{ closeModal(); }catch(e){}
    for(const arg of [undefined, 10, 20, 30, 40, 50, 60, 70, 80, 1]){
      try{
        const res = arg === undefined ? fn() : fn(arg);
        if(res && typeof res.then === 'function') await Promise.race([res, new Promise(r=>setTimeout(r,40))]);
      }catch(e){}
      const ov = document.getElementById('modal-overlay');
      if(ov && ov.classList.contains('active')) break;
    }
    try{ closeModal(); }catch(e){}
  }
}, declaradas.filter(d => /^(open|show)[A-Z]/.test(d.nombre)).map(d => d.nombre));

const tocadas = new Set(await page.evaluate(()=> [...window.__tocadas]));
await browser.close();

const total = new Set(declaradas.map(d => d.nombre)).size;
const sinTocar = declaradas.filter(d => !tocadas.has(d.nombre));
const pct = ((tocadas.size / total) * 100).toFixed(1);

console.log(`\n${tocadas.size} de ${total} funciones ejecutadas · ${pct}%\n`);

const porModulo = {};
sinTocar.forEach(d => { (porModulo[d.fichero] = porModulo[d.fichero] || []).push(d); });
console.log('Lo que NO se ejecuta, por módulo:');
Object.entries(porModulo).sort((a,b) => b[1].length - a[1].length).forEach(([m, fns]) => {
  const declaradasM = declaradas.filter(d => d.fichero === m).length;
  const cubierto = (((declaradasM - fns.length) / declaradasM) * 100).toFixed(0);
  console.log(`  ${m.padEnd(12)} ${String(fns.length).padStart(4)} sin tocar de ${String(declaradasM).padStart(4)}  (${cubierto}% ejecutado)`);
});

writeFileSync('/tmp/sin_cubrir.txt', sinTocar.map(d => `${d.fichero}:${d.linea} ${d.nombre}`).join('\n'));
console.log('\nLista completa en /tmp/sin_cubrir.txt');

const errsReales = errs.filter(e => !/Failed to fetch|NetworkError|firebase/i.test(e));
console.log(errsReales.length ? `\n⚠️  ${errsReales.length} errores de JavaScript durante el recorrido:\n   ` + errsReales.slice(0,8).join('\n   ') : '\n✅ Ningún error de JavaScript en todo el recorrido');
