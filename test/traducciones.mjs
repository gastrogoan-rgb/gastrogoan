// R34 — ¿La app entera se puede usar en catalán y en inglés?
//
// Hasta ahora había dos pruebas de idioma, y ninguna contestaba a esto:
//   · i18n-paridad.mjs mira que los tres diccionarios tengan las mismas
//     claves. Pero una cadena escrita a mano en el HTML —sin pasar por
//     t()— no está en ningún diccionario: para esa prueba no existe.
//   · idiomas.mjs abre las pantallas en catalán e inglés y mira que el
//     texto no se desborde. Comprueba la CAJA, no el IDIOMA: un botón que
//     siga diciendo "Guardar" en inglés cabe perfectamente.
//
// Esta abre CADA pantalla en los tres idiomas y compara lo que se lee. Si
// un texto es idéntico en castellano, catalán e inglés, o no está
// traducido, o es un nombre propio. Se filtra lo segundo y se enseña lo
// primero.
//
// También caza el fallo más feo de todos: que se vea la CLAVE en crudo
// ("view.tpv.subtitle") porque falta en ese diccionario.
import puppeteer from 'puppeteer-core';

const IDIOMAS = ['es', 'ca', 'en'];
const VISTAS = [
  ['comandascocina','cocina'],['carta','cocina'],['idr','cocina'],['megalista','cocina'],
  ['escandallo','cocina'],['fichas','cocina'],['pedidos','cocina'],['stock','cocina'],
  ['horarios','cocina'],['distribucion','cocina'],['limpieza','cocina'],['proveedores','cocina'],
  ['tpv','sala'],['reservas','sala'],['clientes','sala'],['promocion','sala'],
  ['dashboard','gestion'],['economia','gestion'],['minegocio','gestion'],['manual','gestion'],
];
const PESTANAS = {
  economia: ['ventas','fijos','variables','cdr','resultado','tesoreria','pe','capex'].map(t=>[`GE.tab('${t}')`,t]),
  limpieza: ['protocolo','manos','temperaturas','alergenos','plagas','mantenimiento'].map(t=>[`setLimpiezaTab('${t}')`,t]),
  horarios: ['personal','semana','mes'].map(t=>[`setHorariosTab('${t}')`,t]),
  minegocio: ['negocio','equipo','nube','datos'].map(t=>[`setMiNegocioTab && setMiNegocioTab('${t}')`,t]),
};

// Lo que la semilla mete en la base: son datos del negocio, no interfaz.
// Que "Solomillo al PX" no se traduzca es lo correcto.
const DATOS_SEMBRADOS = [
  'Restaurante de Prueba','Ana Fernández','Luis Martín','Mesa 1','Salón','Solomillo de ternera',
  'Carnes','Distribuciones del Norte','Solomillo al PX','Principales','CARTA','Familia Rodríguez',
  'Campana','Desengrasante','Cámara 1','Horno','Técnicos S.L.','Alquiler','Cuota autónomos',
  'Seguros sociales','Compra semanal','Horno nuevo','Jefa de cocina','Camarero','Efectivo',
  'ALQUILER','SS AUTÓNOMOS','SS EMPRESA','MATERIA PRIMA','Prov','Solomillo','ENVIADO','600111222',
];

// Palabras que se escriben igual en los tres idiomas. No son un fallo:
// señalarlas ahogaría los hallazgos de verdad entre ruido.
const IGUALES_DE_VERDAD = new Set([
  'total','iva','pin','tpv','qr','ok','no','email','e-mail','menu','menú','stock','web','id',
  'gastrogoan','firebase','pdf','csv','sms','whatsapp','app','nps','food cost','ticket','tickets',
  'bar','restaurant','extra','extras','normal','general','local','base','bases','test','gas',
  'internet','sms','tel','tel.','€','%','·','—','–','+','-','×','✓','⚠','€/kg','kg','g','l','ml',
  'ud','uds','h','min','pax','a','b','c','d','ok!','info','plus','premium','online','offline',
]);

// Revisadas una a una y aceptadas: o son ejemplos dentro de un campo vacío
// (que enseñan el formato, no se leen), o términos que el oficio usa igual
// en los tres idiomas, o rótulos de eje de una gráfica. Se listan aquí, con
// su motivo, para que cualquier cadena NUEVA que aparezca destaque.
const ACEPTADAS = new Set([
  // ejemplos dentro de campos vacíos, en Mi Negocio
  'contacto@negocio.com','www.milocal.com','B12345678','@milocal','milocal',
  'https://maps.app.goo.gl/...','https://...','service_xxxxxxx','template_xxxxxxx',
  'user_xxxxxxxxxxxxxxxx','Logo','Instagram','Facebook','TikTok','Terminal',
  'Service ID','Public Key',
  // términos que en hostelería y contabilidad se dicen igual en los tres
  'CAPEX','TOTAL CAPEX','AUTO','Take Away','Delivery','Total h.',
  // abreviaturas de mes que coinciden en es/ca/en (las que no, ya se traducen)
  'Oct','Nov','Feb','Mar','Jun','Jul',
  // rótulos del eje de horas de las gráficas del panel
  '12h','15h','18h','21h','8-12h','12-16h','16-20h','20-24h','8.0h',
  // el manual: un nombre de aparato y el código maestro
  'iPhone/iPad (Safari):','GGGG',
]);

const esRuido = s =>
  !s ||
  ACEPTADAS.has(s) ||
  s.length < 3 ||                          // símbolos, iniciales, unidades
  !/[a-záéíóúàèòïüçñ]/i.test(s) ||         // sin letras: números, fechas, importes
  /^[\d\s.,:/€%+\-()]+$/.test(s) ||        // "1.850,00 €", "21/09", "09:00 - 17:00"
  IGUALES_DE_VERDAD.has(s.toLowerCase()) ||
  DATOS_SEMBRADOS.some(d => s.includes(d));

// Un texto que se ve tal cual la clave del diccionario: falta en ese idioma.
// Un dominio de ejemplo ("www.milocal.com") tiene la misma forma, así que se
// descartan las terminaciones que delatan una dirección, no una clave.
const TERMINACIONES_WEB = /\.(com|es|cat|net|org|eu|io|app|dev|gl)$/i;
const esClaveEnCrudo = s =>
  /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){1,}$/.test(s) &&
  !s.includes(' ') && !TERMINACIONES_WEB.test(s) && !s.startsWith('www.');

const SEMILLA = `(function(){
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
  const hoy=todayStr(); const eid=genId();
  DB.employees.push({id:eid,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
  DB.employees.push({id:genId(),name:'Luis Martín',rol:'Camarero',area:'sala',active:true,color:'#4A5D4E',pin:'H2:y'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
  const ing=genId();
  DB.ingredients.push({id:ing,name:'Solomillo de ternera',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Prov',activo:true});
  DB.providers.push({id:genId(),nombre:'Distribuciones del Norte',area:'cocina',diasEntrega:[],gastoEnvio:0});
  const rid=genId();
  DB.recipes.push({id:rid,name:'Solomillo al PX',area:'cocina',isBase:false,price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:220,merma:8}]});
  const cid=genId();
  DB.cartas.push({id:cid,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),secciones:[{id:genId(),nombre:'Principales',platos:[{id:genId(),recipeId:rid,nombre:'Solomillo al PX',precio:22,ivaPct:10,disponible:true}]}]});
  DB.activeCartaIds=[cid];
  DB.sales.push({id:genId(),date:hoy,createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[{name:'Solomillo al PX',price:22,qty:1,ivaPct:10}]});
  DB.reservations.push({id:genId(),clientName:'Familia Rodríguez',date:hoy,time:'21:30',people:6,status:'confirmada',tableId:1});
  DB.clients.push({id:genId(),name:'Familia Rodríguez',phone:'600111222'});
  DB.turnos.push({id:genId(),employeeId:eid,fecha:hoy,tipo:'M',entrada:'09:00',salida:'17:00'});
  DB.purchaseOrders.push({id:genId(),supplier:'Distribuciones del Norte',date:hoy,estado:'ENVIADO',items:[{ingredientId:ing,name:'Solomillo',cantidad:5,precio:24}],notas:'',recepcion:null,comprobacion:'',area:'cocina'});
  DB.limpieza.tareas.push({id:genId(),area:'Campana',producto:'Desengrasante',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
  DB.limpieza.temperaturas=(DB.limpieza.temperaturas||[]).concat([{id:genId(),equipo:'Cámara 1',fecha:hoy,valor:4,responsableId:eid}]);
  DB.limpieza.mantenimiento=(DB.limpieza.mantenimiento||[]).concat([{id:genId(),equipo:'Horno',fecha:hoy,tipo:'preventivo',empresa:'Técnicos S.L.'}]);
  DB.ge.fijos.push({id:genId(),concepto:'Alquiler',importe:1850,iva:21,categoria:'ALQUILER'});
  DB.ge.fijos.push({id:genId(),concepto:'Cuota autónomos',importe:320,iva:0,categoria:'SS AUTÓNOMOS'});
  DB.ge.variables.push({id:genId(),concepto:'Compra semanal',importe:640,iva:10,fecha:hoy,categoria:'MATERIA PRIMA'});
  DB.ge.capex=(DB.ge.capex||[]).concat([{id:genId(),descripcion:'Horno nuevo',importe:4200,iva:21,fecha:hoy,estadoPago:'PENDIENTE'}]);
  saveDB();
})`;

// Se recogen los textos VISIBLES, uno por elemento hoja, más los
// marcadores de posición y las etiquetas de los botones sin texto.
const RECOGER = `(function(){
  const fuera = new Set(['SCRIPT','STYLE','SVG','PATH','NOSCRIPT']);
  const vis = e => { const r=e.getBoundingClientRect();
    return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
  const out = [];
  const raiz = document.getElementById('content') || document.body;
  // Cabecera y menú lateral también son interfaz que hay que traducir.
  [document.querySelector('.app-header'), document.querySelector('.sidebar'), raiz]
    .filter(Boolean).forEach(root => {
      root.querySelectorAll('*').forEach(e=>{
        if(fuera.has(e.tagName)) return;
        if(!vis(e)) return;
        if(e.placeholder) out.push(e.placeholder.trim());
        const aria = e.getAttribute && e.getAttribute('aria-label');
        if(aria) out.push(aria.trim());
        if(e.tagName==='OPTION'){ out.push((e.textContent||'').trim()); return; }
        // solo hojas de texto: si tiene hijos con texto, ya se recogerán ellos
        const propio = [...e.childNodes].filter(n=>n.nodeType===3)
          .map(n=>n.textContent.trim()).filter(Boolean).join(' ');
        if(propio) out.push(propio.replace(/\\s+/g,' '));
      });
    });
  return out.filter(Boolean);
})`;

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true});

const recogido = {};          // idioma → parada → [textos]
const clavesCrudas = [];      // {idioma, parada, texto}
let paradas = 0, errores = [];

for(const lang of IDIOMAS){
  recogido[lang] = {};
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({width:1440,height:900});
  await page.setCacheEnabled(false);
  page.on('pageerror', e => errores.push(`${lang}: ${e.message.slice(0,90)}`));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(l=>{
    localStorage.setItem('gastrogoan_lang', l);
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'TRADU001',tenantId:ggBizTenantId('TRADU001')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  }, lang);
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(s=>eval(s)(), SEMILLA);

  // Sin esto, "0 hallazgos" podría significar que las tres vueltas
  // corrieron en castellano sin que nadie se enterara.
  const aplicado = await page.evaluate(()=>getLang());
  if(aplicado !== lang) throw new Error(`pedí ${lang} y la app quedó en ${aplicado}`);

  for(const [vista,carpeta] of VISTAS){
    for(const [codigo, tab] of [[null,'']].concat(PESTANAS[vista]||[])){
      const clave = vista + (tab ? '→'+tab : '');
      const textos = await page.evaluate(({vista,carpeta,codigo,src})=>{
        currentFolder=carpeta; navigate(vista);
        if(codigo){ try{ eval(codigo); }catch(e){ /* pestaña que no existe: se mide la vista base */ } }
        return eval(src)();
      }, {vista,carpeta,codigo,src:RECOGER});
      await new Promise(r=>setTimeout(r,200));
      recogido[lang][clave] = textos;
      textos.forEach(t => { if(esClaveEnCrudo(t)) clavesCrudas.push({lang, clave, t}); });
      if(lang==='es') paradas++;
    }
  }
  await ctx.close();
}
await browser.close();

// ── Comparación ────────────────────────────────────────────────────────
// Un texto sin traducir aparece IGUAL en las tres vueltas. Se cuenta una
// sola vez aunque salga en diez pantallas: lo que interesa es la cadena.
const sinTraducir = new Map();   // texto → Set(pantallas)
for(const clave of Object.keys(recogido.es)){
  const es = new Set(recogido.es[clave]);
  const ca = new Set(recogido.ca[clave] || []);
  const en = new Set(recogido.en[clave] || []);
  for(const s of es){
    if(esRuido(s) || esClaveEnCrudo(s)) continue;
    if(ca.has(s) && en.has(s)){
      if(!sinTraducir.has(s)) sinTraducir.set(s, new Set());
      sinTraducir.get(s).add(clave);
    }
  }
}

console.log('═'.repeat(70));
console.log(`Auditoría de traducciones — ${paradas} pantallas × 3 idiomas`);
console.log('═'.repeat(70));

let fallos = 0;

if(clavesCrudas.length){
  fallos++;
  console.log(`\n❌ CLAVE SIN TRADUCIR A LA VISTA (${clavesCrudas.length})`);
  console.log('   Se lee la clave del diccionario en pantalla: falta en ese idioma.');
  clavesCrudas.slice(0,25).forEach(c=>console.log(`   [${c.lang}] ${c.clave}: "${c.t}"`));
  if(clavesCrudas.length>25) console.log(`   … y ${clavesCrudas.length-25} más`);
} else {
  console.log('\n✅ Ninguna clave del diccionario se ve en crudo en ningún idioma');
}

if(sinTraducir.size){
  fallos++;
  const lista = [...sinTraducir.entries()].sort((a,b)=>b[1].size-a[1].size);
  console.log(`\n❌ TEXTO IDÉNTICO EN LOS TRES IDIOMAS (${lista.length} cadenas)`);
  console.log('   Candidatas a estar escritas a mano, sin pasar por t().');
  lista.slice(0,60).forEach(([s,pant])=>{
    const d = [...pant].slice(0,3).join(', ') + (pant.size>3 ? ` +${pant.size-3}` : '');
    console.log(`   "${s.slice(0,64)}"\n        ↳ ${d}`);
  });
  if(lista.length>60) console.log(`   … y ${lista.length-60} cadenas más`);
} else {
  console.log('\n✅ No queda ningún texto de interfaz igual en los tres idiomas');
}

if(errores.length){
  fallos++;
  console.log(`\n❌ ERRORES DE JS (${errores.length})`);
  [...new Set(errores)].slice(0,10).forEach(e=>console.log('   '+e));
}

console.log('\n' + '─'.repeat(70));
console.log(fallos ? `${fallos} tipo(s) de hallazgo` : '✅ La app entera se puede usar en los tres idiomas');
process.exit(fallos ? 1 : 0);
