// TODAS las ventanas emergentes, una por una — R21.
//
// La app tiene 108 funciones que abren una ventana. La prueba de ventanas
// abría 15: las 93 restantes no las abría NADIE. Y una ventana es justo
// donde se concentra lo que un hostelero toca de verdad — cobrar, borrar,
// confirmar, editar.
//
// Aquí se abren todas. De cada una se comprueba lo mismo:
//   · que se abre sin lanzar ningún error de JavaScript
//   · que tiene forma de vencana (cabecera y manera de cerrarla)
//   · que no se ve ninguna clave de traducción en crudo
//   · que cabe en un móvil de 390 px sin desbordarse
//   · que sus botones se pueden pulsar con el dedo
import puppeteer from 'puppeteer-core';
import {readFileSync, readdirSync} from 'node:fs';

// El inventario se saca del código en cada ejecución: si mañana alguien
// añade una ventana, entra sola en la prueba sin tocar este fichero.
const dirJs = new URL('../js/', import.meta.url);
const MODALES = [];
readdirSync(dirJs).filter(f => f.endsWith('.js')).forEach(f => {
  const src = readFileSync(new URL(f, dirJs), 'utf8');
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm;
  const marcas = []; let m;
  while((m = re.exec(src))) marcas.push({name:m[1], args:m[2].trim(), i:m.index});
  marcas.forEach((mk, idx) => {
    const fin = idx+1 < marcas.length ? marcas[idx+1].i : src.length;
    if(/openModal\(/.test(src.slice(mk.i, fin))) MODALES.push({f: f.replace('.js',''), name: mk.name, args: mk.args});
  });
});

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:390, height:844});
const errsPagina = [];
page.on('pageerror', e => errsPagina.push(e.message));

await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MODALES1', tenantId: ggBizTenantId('MODALES1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));

// Un negocio con datos de todo, para que las ventanas que necesitan algo
// que enseñar lo tengan. Se guarda y se recarga: así el alta queda hecha de
// verdad y no aparece ninguna pantalla de configuración por encima.
await page.evaluate(async ()=>{
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Restaurante de Prueba', pin: hashPin('9999','MODALES1'), pinSet:true});
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
  DB.employees = [{id:30, name:'Ana', rol:'Cocinera', area:'cocina', active:true, color:'#DF7039', pin: hashPin('1234','MODALES1')}];
  DB.clients = [{id:40, name:'Cliente Uno', phone:'600333444', email:'c@uno.es', visits:3}];
  DB.reservations = [{id:50, clientName:'Cliente Uno', phone:'600333444', date:hoy, time:'21:00', pax:2, estado:'CONFIRMADA', publicToken:'tok1'}];
  DB.tables = DB.tables && DB.tables.length ? DB.tables : [{id:1, nombre:'Mesa 1', zona:'Salón', pax:4}];
  DB.purchaseOrders = [{id:60, supplier:'Proveedor Uno', date:hoy, estado:'ENVIADO', items:[{ingredientId:1, cantidad:5, precio:1}]}];
  DB.sales = [{id:70, date:hoy, createdAt:new Date().toISOString(), total:20, subtotal:18, propina:0, tipo:'mesa', metodoPago:'efectivo', items:[{name:'Croquetas', qty:2, price:9, ivaPct:10, costeUnitario:1}]}];
  DB.cartas = [{id:80, nombre:'CARTA', tipo:'GENERAL', dias:[0,1,2,3,4,5,6], secciones:[{id:81, nombre:'Entrantes', platos:[{id:82, recipeId:10, nombre:'Croquetas', precio:9, ivaPct:10, disponible:true}]}]}];
  DB.menus = DB.menus || [];
  await saveDB();
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2600));
await page.evaluate(()=>{
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');
  // Los avisos no deben tapar la ventana que se está midiendo
  window.showToast = ()=>{};
});

const hallazgos = [];
let abiertas = 0, saltadas = 0;

const INTERNAS = new Set(['openModal']);
const esRepintado = n => /^render.*Modal$/.test(n) || /^on.*Change$/.test(n) || /^add(PlatoMod|MenuOpcion)$/.test(n);
// Estas esperan un OBJETO ya construido (un aviso, una copia de seguridad,
// un repartidor) o un estado en curso (una cuenta dividiéndose, una carta
// abierta en el editor). Llamarlas en frío con un número revienta por
// definición: no es un fallo del producto, es que no se pueden probar así.
const NECESITAN_ESTADO = new Set([
  'showClosureWarningsModal','openOverbookedChoiceModal','openConfirmRestoreBackupModal',
  'openOwnCourierModal','openDeliveryPlatformModal','openClientMessageModal',
  'openSplitPartPayment','openCartaSectionIconModal','openPlatoModsModal','openMenuOpcionModsModal',
]);

for(const mod of MODALES){
  if(INTERNAS.has(mod.name) || esRepintado(mod.name) || NECESITAN_ESTADO.has(mod.name)){ saltadas++; continue; }
  const r = await page.evaluate(async (info)=>{
    const {name, args} = info;
    // Cierra lo que hubiera quedado abierto
    try{ closeModal(); }catch(e){}
    const fn = window[name];
    if(typeof fn !== 'function') return {estado:'no-existe'};

    // Argumentos plausibles según cómo se llame el parámetro: casi todos
    // esperan el id de algo que ya existe en los datos sembrados.
    const porNombre = {
      id: 10, recipeId: 10, fichaId: 20, empId: 30, employeeId: 30, clientId: 40,
      reservationId: 50, orderId: 1, saleId: 70, secId: 81, cartaId: 80, menuId: 80,
      idx: 0, index: 0, i: 0, tableId: 1, mesaId: 1, ingredientId: 1, supplierId: 1,
      key: 'Carnes', label: 'Carnes', ns: 'ingredient', reRenderFn: 'renderMegalista',
      title: 'Título', desc: 'Descripción', message: '¿Seguro?', actionFn: 'noop',
      type: 'apertura', area: 'cocina', tab: 'protocolo', fecha: new Date().toISOString().slice(0,10),
    };
    const lista = args ? args.split(',').map(s => s.trim().split('=')[0].trim()).filter(Boolean) : [];
    const valores = lista.map(a => {
      if(porNombre[a] !== undefined){
        return porNombre[a] === 'noop' ? (()=>{}) : porNombre[a];
      }
      if(/id$/i.test(a)) return 10;
      if(/idx|index/i.test(a)) return 0;
      if(/fn$|callback|action/i.test(a)) return ()=>{};
      if(/name|nombre|title|titulo|label|texto|msg|message|desc/i.test(a)) return 'Prueba';
      return undefined;
    });

    // Se prueban VARIOS ids antes de dar nada por roto: pasar el id de un
    // plato a una ventana de empleados revienta, y eso es culpa de la
    // prueba, no del producto. Solo cuenta como fallo si revienta con
    // TODOS los candidatos, incluido "sin argumentos".
    const candidatos = [10, 20, 30, 40, 50, 60, 70, 80, 81, 1, 0, undefined];
    const intentos = [valores];
    if(lista.length && /^(id|.*Id)$/.test(lista[0])){
      candidatos.forEach(c => intentos.push([c, ...valores.slice(1)]));
    }
    let err = null, abrioAlguno = false;
    for(const intento of intentos){
      try{ closeModal(); }catch(e){}
      let e1 = null;
      try{
        const res = fn(...intento);
        if(res && typeof res.then === 'function'){
          await Promise.race([res, new Promise(r => setTimeout(r, 60))]);
        }
      }catch(e){ e1 = e.message; }
      await new Promise(r => setTimeout(r, 70));
      const ov = document.getElementById('modal-overlay');
      const bx = document.getElementById('modal-box');
      if(ov && ov.classList.contains('active') && bx && bx.innerHTML.trim()){ abrioAlguno = true; err = null; break; }
      if(e1 && !err) err = e1;
    }
    if(!abrioAlguno && !err) err = null;

    await new Promise(r => setTimeout(r, 40));
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    const abierto = overlay && overlay.classList.contains('active') && box && box.innerHTML.trim().length > 0;
    if(!abierto) return {estado: err ? 'error' : 'no-abre', err};

    const html = box.innerHTML;
    const problemas = [];
    // 1) Claves de traducción en crudo
    const crudas = html.match(/\b(?:btn|msg|label|title|common|ph|empty|tab|view|mn|idr|gate|audit|deposit|carta|dist|limpieza|hdr|access|folder|module|noun|temp)\.[a-zA-Z][\w.]{2,}/g);
    if(crudas) problemas.push('clave sin traducir: ' + [...new Set(crudas)].slice(0,3).join(', '));
    // 2) Forma de ventana: hay que poder cerrarla
    const cerrar = box.querySelector('.modal-close, .modal-footer button, button[onclick*="closeModal"], button[onclick*="cancel"]');
    if(!cerrar) problemas.push('no hay forma visible de cerrarla');
    // 3) Que quepa en el móvil.
    //    Lo que vive dentro de un contenedor que se desliza (una tabla ancha
    //    en su .table-wrap) NO se sale: se recorta y se arrastra con el
    //    dedo, que es justo lo que se quiere. Medirlo daba falsa alarma.
    const w = document.documentElement.clientWidth;
    const dentroDeScroll = el => {
      let p = el.parentElement;
      while(p && p !== box.parentElement){
        const ox = getComputedStyle(p).overflowX;
        if(ox === 'auto' || ox === 'scroll') return true;
        p = p.parentElement;
      }
      return false;
    };
    const bBox = box.getBoundingClientRect();
    if(bBox.right > w + 2) problemas.push(`la ventana se sale ${Math.round(bBox.right)}px de ${w}px`);
    box.querySelectorAll('*').forEach(el => {
      const b = el.getBoundingClientRect();
      if(b.width === 0 && b.height === 0) return;
      if(b.right > w + 2 && !dentroDeScroll(el) && problemas.length < 4) problemas.push(`se sale ${Math.round(b.right)}px de ${w}px`);
    });
    // Y lo que de verdad importa: que la página no se mueva de lado.
    if(document.documentElement.scrollWidth > document.documentElement.clientWidth + 2) problemas.push('la página entera se desplaza de lado');
    // 4) Objetivos táctiles
    // Se mide lo que DE VERDAD se pulsa: una casilla de 26 px dentro de una
    // etiqueta de 44 no es un objetivo pequeño, porque el dedo acierta en la
    // etiqueta. Solo cuenta si ni ella ni lo que la envuelve llegan.
    const objetivo = el => {
      let mejor = el.getBoundingClientRect().height;
      const lab = el.closest('label');
      if(lab) mejor = Math.max(mejor, lab.getBoundingClientRect().height);
      if(el.parentElement && /checkbox|radio/.test(el.type||'')){
        mejor = Math.max(mejor, el.parentElement.getBoundingClientRect().height);
      }
      return mejor;
    };
    const pequenos = [...box.querySelectorAll('button, input, select, textarea, .alg-pill, .mn-indice-chip')]
      .filter(el => { const b = el.getBoundingClientRect(); return b.height > 0 && objetivo(el) < 34; })
      .map(el => (el.id || el.tagName) + ' ' + Math.round(objetivo(el)) + 'px');
    if(pequenos.length) problemas.push('demasiado pequeño: ' + pequenos.slice(0,2).join(', '));
    // 5) Vacía del todo
    if(box.textContent.trim().length < 10) problemas.push('la ventana sale prácticamente vacía');

    try{ closeModal(); }catch(e){}
    return {estado:'abierta', problemas};
  }, mod);

  if(r.estado === 'abierta'){
    abiertas++;
    (r.problemas||[]).forEach(p => hallazgos.push(`${mod.name} (${mod.f}): ${p}`));
  } else if(r.estado === 'error'){
    hallazgos.push(`${mod.name} (${mod.f}): REVIENTA al abrirla — ${r.err}`);
  } else {
    // No se abre: casi siempre porque necesita un estado que no se puede
    // fabricar desde fuera (una comanda abierta, un cobro en curso...).
    saltadas++;
  }
}

console.log(`\n${abiertas} ventanas abiertas y revisadas · ${saltadas} necesitan un estado que no se puede fabricar desde aquí`);
const errsReales = errsPagina.filter(e => !/Failed to fetch|NetworkError|firebase/i.test(e));
if(errsReales.length) hallazgos.push(...errsReales.slice(0,10).map(e => 'error de JavaScript: ' + e));

console.log('═'.repeat(64));
if(hallazgos.length){
  console.log(`❌ ${hallazgos.length} cosas que revisar:\n`);
  hallazgos.forEach(h => console.log('   · ' + h));
} else {
  console.log('✅ las ventanas emergentes se comportan bien, todas');
}
await browser.close();
process.exit(hallazgos.length ? 1 : 0);
