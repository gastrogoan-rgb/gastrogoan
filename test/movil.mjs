/* LA APP EN UN MÓVIL DE VERDAD (13/09)
 * ────────────────────────────────────
 * "En mi móvil hay cosas que se ven feo, fuera de sitio, saltos de línea
 * apiñados. Muy mal." Y tenía razón: la auditoría visual que había solo
 * miraba desbordes, y solo a 390 px de ancho — así que **360 px, que es el
 * ancho más común de Android, no se probaba nunca**. Por ahí se coló todo.
 *
 * Esta mide lo que de verdad se ve mal, en los cinco anchos que existen, y
 * con los datos de un negocio lleno (con cuatro filas todo cabe):
 *
 *   1. La página se arrastra en horizontal (nunca debe pasar).
 *   2. Algo se sale de la pantalla y queda cortado.
 *   3. Texto partido en líneas absurdas: una palabra suelta en tres renglones.
 *   4. Letra por debajo de lo legible.
 *   5. Botones por debajo del objetivo táctil.
 *
 * ⚠️ CÓMO SE MIDEN LAS LÍNEAS. A ojo parece que basta con dividir la altura
 * del elemento entre su line-height, pero eso cuenta el PADDING: un botón de
 * 44 px de alto (el mínimo táctil) con letra de 14 px salía siempre como
 * "tres líneas" aunque su texto cupiera de sobra en una. Se mide con un
 * Range sobre el nodo de texto: getClientRects() devuelve un rectángulo POR
 * LÍNEA, así que el número es exacto. La primera versión de esta prueba dio
 * doscientos falsos positivos por esto.
 */
import puppeteer from 'puppeteer-core';

const ANCHOS = [
  {n:'320', w:320, h:568},   // iPhone SE y Android antiguos
  {n:'360', w:360, h:800},   // el más común en Android
  {n:'390', w:390, h:844},   // iPhone 13/14/15
  {n:'412', w:412, h:915},   // Pixel, Galaxy
  {n:'430', w:430, h:932},   // Pro Max
];

const VISTAS = [
  ['inicio', "navigate('home')"],
  ['cocina', "currentFolder='cocina'; navigate('folder')"],
  ['megalista', "navigate('megalista')"],
  ['escandallo', "navigate('escandallo')"],
  ['fichas', "navigate('fichas')"],
  ['carta', "navigate('carta')"],
  ['stock', "navigate('stock')"],
  ['proveedores', "navigate('proveedores')"],
  ['pedidos', "navigate('pedidos')"],
  ['comandascocina', "navigate('comandascocina')"],
  ['horarios', "navigate('horarios')"],
  ['distribucion', "navigate('distribucion')"],
  ['limpieza', "navigate('limpieza')"],
  ['tpv', "currentFolder='sala'; navigate('tpv')"],
  ['reservas', "navigate('reservas')"],
  ['clientes', "navigate('clientes')"],
  ['promocion', "navigate('promocion')"],
  ['dashboard', "currentFolder='gestion'; navigate('dashboard')"],
  ['ge-ventas', "navigate('economia'); GE.tab('ventas')"],
  ['ge-fijos', "navigate('economia'); GE.tab('fijos')"],
  ['ge-variables', "navigate('economia'); GE.tab('variables')"],
  ['ge-cdr', "navigate('economia'); GE.tab('cdr')"],
  ['ge-tesoreria', "navigate('economia'); GE.tab('tesoreria')"],
  ['ge-pe', "navigate('economia'); GE.tab('pe')"],
  ['ge-capex', "navigate('economia'); GE.tab('capex')"],
  ['minegocio', "navigate('minegocio')"],
  ['manual', "navigate('manual')"],
];

// El detector, en la página. Devuelve solo hechos, sin interpretarlos.
const MIRAR = W => {
  const vista = document.querySelector('.view.active');
  if(!vista) return null;
  const out = {arrastraDoc: document.documentElement.scrollWidth > W + 1, cortado: [], partido: [], letra: [], toque: []};
  const seVe = el => el.getClientRects().length > 0;
  const texto = el => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const quien = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  // ¿Cuelga de algo que scrollea en horizontal a propósito (una tabla ancha,
  // una tira de pestañas)? Entonces salirse del ancho no es un fallo.
  const dentroDeScroll = el => {
    for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
      const o = getComputedStyle(p).overflowX;
      if(o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };
  // Líneas REALES que ocupa el texto de un elemento hoja.
  const lineasDe = el => {
    const nodo = el.firstChild;
    if(!nodo || nodo.nodeType !== 3) return 1;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter(x => x.width > 0 && x.height > 0);
    // Rectángulos que comparten línea (mismo `top`) cuentan como una sola.
    const tops = new Set(rects.map(x => Math.round(x.top)));
    return Math.max(1, tops.size);
  };

  vista.querySelectorAll('*').forEach(el => {
    if(!seVe(el)) return;
    const r = el.getBoundingClientRect();
    if(r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);

    if((r.right > W + 1.5 || r.left < -1.5) && !dentroDeScroll(el)){
      out.cortado.push(`${quien(el)} «${texto(el)}»`);
    }
    const esHoja = el.children.length === 0 && (el.textContent || '').trim().length > 0;
    if(esHoja){
      const palabras = (el.textContent || '').trim().split(/\s+/).length;
      const lineas = lineasDe(el);
      /* Criterio: una palabra NUNCA debe partirse, y N palabras no deberían
         necesitar más de N renglones. "Comandas Cocina" en dos líneas es un
         título normal; "Hamburguesas" en tres es una columna de 40 px. */
      if(lineas > palabras){
        out.partido.push(`«${texto(el)}» ${palabras}pal→${lineas}líneas ${Math.round(r.width)}px [${quien(el)}]`);
      }
      const fs = parseFloat(cs.fontSize);
      if(fs && fs < 11) out.letra.push(`«${texto(el)}» ${fs}px [${quien(el)}]`);
    }
    const esBoton = el.tagName === 'BUTTON' || (el.tagName === 'A' && String(el.className).includes('btn'));
    if(esBoton && (r.height < 40 || r.width < 40)) out.toque.push(`«${texto(el)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  const uniq = a => [...new Set(a)];
  return {arrastraDoc: out.arrastraDoc, cortado: uniq(out.cortado), partido: uniq(out.partido),
    letra: uniq(out.letra), toque: uniq(out.toque)};
};

/* Lo ya hablado con el dueño y aceptado a conciencia: los botones compactos
   de Comandas Cocina (los pidió él el 9/09 para que no ocuparan media
   pantalla en hora punta). Todo lo demás es un fallo. */
const ACEPTADO = [
  {vista: 'comandascocina', tipo: 'toque'},
  /* Un nombre de archivo largo y sin espacios ("tutorial-netlify.html") en
     dos renglones no es texto espachurrado: es una palabra que no cabe y
     que hay que poder leer entera, así que se parte por el guion. */
  {vista: 'minegocio', tipo: 'partido'},
];
const estaAceptado = (vista, tipo) => ACEPTADO.some(a => a.vista === vista && a.tipo === tipo);

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const hallazgos = [];

for(const t of ANCHOS){
  const page = await browser.newPage();
  await page.setViewport({width:t.w, height:t.h, isMobile:true, hasTouch:true, deviceScaleFactor:2});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2500));
  const datos = await page.evaluate(async ()=> (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => {
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    await idbSet('gastrogoan_data_v1', d);
  }, datos);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=> typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000});
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x=>document.getElementById(x)?.remove());
    try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){}
    editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session');
  });
  await new Promise(r=>setTimeout(r,700));

  for(const [nombre, js] of VISTAS){
    try{ await page.evaluate(js); }catch(e){}
    await new Promise(r=>setTimeout(r,420));
    const f = await page.evaluate(MIRAR, t.w);
    if(f) hallazgos.push({ancho:t.n, vista:nombre, ...f});
  }
  await page.close();
}
await browser.close();

let total = 0;
const porVista = {};
const detalle = [];
hallazgos.forEach(h => {
  const filtrado = {
    arrastraDoc: h.arrastraDoc,
    cortado: estaAceptado(h.vista,'cortado') ? [] : h.cortado,
    partido: estaAceptado(h.vista,'partido') ? [] : h.partido,
    letra: estaAceptado(h.vista,'letra') ? [] : h.letra,
    toque: estaAceptado(h.vista,'toque') ? [] : h.toque,
  };
  const n = (filtrado.arrastraDoc?1:0) + filtrado.cortado.length + filtrado.partido.length + filtrado.letra.length + filtrado.toque.length;
  total += n;
  if(n){
    porVista[h.vista] = (porVista[h.vista]||0) + n;
    detalle.push({...h, ...filtrado, n});
  }
});

console.log('\n── PANTALLAS CON FALLOS (suma de los 5 anchos) ──');
Object.entries(porVista).sort((a,b)=>b[1]-a[1]).forEach(([v,n])=>console.log(`  ${String(n).padStart(4)}  ${v}`));

console.log('\n── DETALLE ──');
detalle.slice(0, 60).forEach(d => {
  console.log(`\n▸ ${d.vista} @ ${d.ancho}px${d.arrastraDoc ? '   ⚠ LA PÁGINA SE ARRASTRA EN HORIZONTAL' : ''}`);
  if(d.cortado.length) console.log('   cortado: ' + d.cortado.slice(0,5).join(' · '));
  if(d.partido.length) console.log('   partido: ' + d.partido.slice(0,5).join(' · '));
  if(d.letra.length)   console.log('   letra:   ' + d.letra.slice(0,5).join(' · '));
  if(d.toque.length)   console.log('   toque:   ' + d.toque.slice(0,5).join(' · '));
});

console.log('\n' + '═'.repeat(66));
if(total){ console.log(`❌ ${total} hallazgo(s) en móvil`); process.exitCode = 1; }
else console.log('✅ la app se ve bien en los cinco anchos de móvil');
