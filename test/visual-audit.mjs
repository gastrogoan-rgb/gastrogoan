// Auditoría visual automática: recorre las vistas principales de la app en
// varios tamaños de pantalla (móvil, tablet, escritorio, vertical y
// horizontal) y falla si algún elemento se desborda del ancho de la
// ventana. No sustituye una revisión visual real (no detecta que algo se
// vea "feo", solo que se salga de la pantalla), pero atrapa la clase de
// fallo que más veces hemos encontrado a mano en capturas reales.
//
// Uso:
//   python3 -m http.server 8950 &     (desde la raíz del repo)
//   node test/visual-audit.mjs
//
// Sale con código 1 si encuentra algún desbordamiento (para poder
// engancharlo a un pipeline de CI el día que se automatice el deploy).
import puppeteer from 'puppeteer-core';

const PORT = process.env.VISUAL_AUDIT_PORT || 8950;
const CHROME = process.env.VISUAL_AUDIT_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const VIEWPORTS = [
  { name: 'mob_360_portrait',  w: 360,  h: 800  },
  { name: 'mob_390_portrait',  w: 390,  h: 844  },
  { name: 'mob_390_landscape', w: 844,  h: 390  },
  { name: 'tab_768_portrait',  w: 768,  h: 1024 },
  { name: 'tab_1024_landscape',w: 1366, h: 1024 },
  { name: 'desk_1440',         w: 1440, h: 900  },
];

const VIEWS = [
  { name: 'dashboard', fn: "navigate('dashboard')" },
  { name: 'tpv', fn: "navigate('tpv')" },
  { name: 'comandascocina', fn: "navigate('comandascocina')" },
  { name: 'reservas', fn: "navigate('reservas')" },
  { name: 'carta', fn: "navigate('carta')" },
  { name: 'megalista', fn: "navigate('megalista')" },
  { name: 'escandallo', fn: "navigate('escandallo')" },
  { name: 'fichas', fn: "navigate('fichas')" },
  { name: 'stock', fn: "navigate('stock')" },
  { name: 'pedidos', fn: "navigate('pedidos')" },
  { name: 'clientes', fn: "navigate('clientes')" },
  { name: 'proveedores', fn: "navigate('proveedores')" },
  { name: 'horarios', fn: "navigate('horarios')" },
  { name: 'limpieza', fn: "navigate('limpieza')" },
  { name: 'promocion', fn: "navigate('promocion')" },
  { name: 'distribucion', fn: "navigate('distribucion')" },
  { name: 'minegocio', fn: "navigate('minegocio')" },
  { name: 'economia_fijos', fn: "navigate('economia')" },
  { name: 'economia_variables', fn: "GE.tab('variables')" },
  { name: 'economia_cdr', fn: "GE.tab('cdr')" },
  { name: 'economia_resultado', fn: "GE.tab('resultado')" },
  { name: 'economia_tesoreria', fn: "GE.tab('tesoreria')" },
  { name: 'economia_pe', fn: "GE.tab('pe')" },
  { name: 'economia_capex', fn: "GE.tab('capex')" },
];

const SEED = async () => {
  editUnlocked = true;
  DB.business.name = 'La Taberna de Ana';
  DB.business.tipo = 'restaurante';
  DB.business.zonaOrder = ['interior','terraza'];
  DB.tables = [
    {id:1,name:'Mesa 1',zona:'interior',plazas:2},{id:2,name:'Mesa 2',zona:'interior',plazas:4},
    {id:3,name:'Mesa 3',zona:'interior',plazas:4},{id:4,name:'Mesa 4',zona:'terraza',plazas:6},
  ];
  DB.employees = [
    {id:1,name:'Carlos Ruiz',area:'sala',pin:'1111',pinChanged:true,activo:true,role:'camarero'},
    {id:2,name:'María López',area:'cocina',pin:'2222',pinChanged:true,activo:true,role:'cocina'},
  ];
  DB.clients = [
    {id:1,name:'Ana García Pérez',phone:'600111222',email:'ana@example.com',points:8,allergies:'Frutos secos',cumpleanos:'1990-05-12'},
    {id:2,name:'Marc Vidal Soler',phone:'611222333',email:'marc@example.com',points:3},
    {id:3,name:'Laura Fernández Ruiz de la Cámara',phone:'622333444',points:10},
  ];
  DB.ingredientCategories = ['Verduras','Carnes','Bebidas'];
  DB.ingredients = [
    {id:1,name:'Tomate',unit:'kg',category:'Verduras',price:2.1,supplier:'Makro',area:'cocina',activo:true},
    {id:2,name:'Solomillo de ternera',unit:'kg',category:'Carnes',price:18.5,supplier:'Makro',area:'cocina',activo:true},
    {id:3,name:'Cerveza 33cl',unit:'ud',category:'Bebidas',price:0.6,area:'sala',activo:true},
  ];
  DB.stock = {1:{qty:12,min:5}, 2:{qty:3,min:5}, 3:{qty:80,min:20}};
  DB.recipeCategories = ['Principales','Entrantes'];
  DB.recipes = [
    {id:1,nombre:'Solomillo a la pimienta con salsa de whisky y guarnición de patatas panadera',category:'Principales',price:22.5,area:'cocina',ingredients:[{type:'ingredient',ingredientId:2,qty:0.25,merma:5}],consumiblesPct:5},
    {id:2,nombre:'Ensalada de tomate',category:'Entrantes',price:9,area:'cocina',ingredients:[{type:'ingredient',ingredientId:1,qty:0.2,merma:0}]},
  ];
  DB.fichas = [{id:1,recipeId:1,name:'Solomillo a la pimienta',area:'cocina',category:'Principales'}];
  DB.menuItems = [
    {id:1,nombre:'Solomillo a la pimienta con salsa de whisky y guarnición de patatas panadera',price:22.5,category:'Principales',recipeId:1,visible:true},
    {id:2,nombre:'Ensalada de tomate',price:9,category:'Entrantes',recipeId:2,visible:true},
    {id:3,nombre:'Cerveza',price:2.8,category:'Bebidas',visible:true},
  ];
  DB.cartas = [{id:1,nombre:'Carta principal',secciones:[{id:'s1',nombre:'Principales',platos:[{id:1,nombre:'Solomillo a la pimienta con salsa de whisky',precio:22.5,disponible:true,recipeId:1}]}]}];
  DB.activeCartaIds = [1];
  const today = todayStr();
  DB.reservations = [
    {id:1,clientId:1,date:today,time:'20:00',people:4,status:'confirmada',tableId:1},
    {id:2,clientId:2,date:today,time:'21:30',people:2,status:'confirmada'},
  ];
  DB.tpvOrders = [
    {id:1,tableId:2,tipo:'mesa',status:'abierta',createdAt:new Date().toISOString(),pax:4,camareroId:1,tandas:['Principales'],
      items:[
        {id:1,name:'Solomillo a la pimienta con salsa de whisky',qty:2,price:22.5,marchada:2,tanda:'Principales',estado:'entregado',entregadoAt:new Date().toISOString(),enviadoAt:new Date().toISOString()},
        {id:2,name:'Cerveza',qty:3,price:2.8,bebida:true,marchada:3,tanda:'Principales',estado:'preparando',enviadoAt:new Date().toISOString()},
      ]},
  ];
  DB.providers = [{id:1,nombre:'Makro',tel:'900111222',area:'cocina'}];
  DB.turnos = [{id:1,employeeId:1,fecha:today,tipo:'M',entrada:'09:00',salida:'17:00'}];
  DB.giftVouchers = [];
  await idbSet(DB_KEY, DB);
};

const OVERFLOW_SCANNER = () => {
  function hasScrollableAncestor(el){
    let p = el.parentElement;
    while(p){
      const cs = getComputedStyle(p);
      if((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
      p = p.parentElement;
    }
    return false;
  }
  const results = [];
  const vw = window.innerWidth;
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if(cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if(r.width === 0 || r.height === 0) return;
    if(r.right > vw + 2){
      if(hasScrollableAncestor(el)) return;
      results.push({
        tag: el.tagName,
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0,60) : '',
        id: el.id || '',
        text: (el.textContent || '').trim().slice(0,50),
        right: Math.round(r.right), vw,
      });
    }
  });
  const seen = new Set();
  return results.filter(r => {
    const k = r.tag+'|'+r.cls+'|'+r.id;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
};

async function main(){
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await dbReadyPromise;
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    await idbSet(DB_KEY, DB);
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ABCDEFGH', tenantId: ggBizTenantId('ABCDEFGH')}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_seen','1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1800));
  await page.evaluate(() => { if (typeof confirmNetlifyDone === 'function') confirmNetlifyDone(); if (typeof closeModal === 'function') closeModal(); });
  await new Promise(r => setTimeout(r, 250));
  await page.evaluate(SEED);
  await new Promise(r => setTimeout(r, 250));

  const report = {};
  let totalIssues = 0;
  for(const vp of VIEWPORTS){
    await page.setViewport({ width: vp.w, height: vp.h });
    for(const view of VIEWS){
      try{
        await page.evaluate(view.fn);
        await new Promise(r => setTimeout(r, 200));
        const overflow = await page.evaluate(OVERFLOW_SCANNER);
        if(overflow.length){
          report[`${vp.name} / ${view.name}`] = overflow;
          totalIssues += overflow.length;
        }
      }catch(e){
        report[`${vp.name} / ${view.name}`] = [{error: e.message}];
        totalIssues++;
      }
    }
  }
  await browser.close();

  if(totalIssues === 0){
    console.log(`✅ Sin desbordamientos en ${VIEWPORTS.length} tamaños × ${VIEWS.length} vistas.`);
    process.exit(0);
  }
  console.log(`❌ ${totalIssues} desbordamiento(s) encontrados:\n`);
  for(const [key, items] of Object.entries(report)){
    console.log(key);
    items.forEach(it => console.log('  ', JSON.stringify(it)));
  }
  process.exit(1);
}

main();
