// R36 — iPhone y iPad.
//
// Todo se había probado en Chromium y Android. Safari es el navegador que más
// se desvía, y un hostelero con iPad es un cliente perfectamente normal: si
// algo falla ahí, no se entera nadie hasta que lo cuenta él.
//
// Esto NO sustituye a un iPad delante — Chromium no es Safari por mucho que
// se le cambie el User-Agent. Lo que sí hace es cazar lo que se puede cazar
// sin el aparato: las trampas conocidas de iOS que se ven en el código y en
// el diseño, y que son las que producen la mitad de los "en el iPad se ve
// raro".
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const UA_IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
              + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const APARATOS = [
  {n:'iPhone', w:390, h:844},
  {n:'iPad',   w:820, h:1180},
];

// ── 1. Estático: lo que Safari no traga, buscado en el código ──────────────
const FUENTES = ['js/core.js','js/i18n.js','js/ui.js','js/finance.js','js/recipes.js',
  'js/menu.js','js/tpv.js','js/operations.js','js/hr.js','js/idr.js','js/polish.js',
  'js/app.js','reservagastrogoan.html'];
const codigo = FUENTES.map(f => ({f, s: readFileSync(f,'utf8')}));

await caso('Ninguna fecha se construye con espacio en vez de "T"', ()=>{
  /* new Date('2026-09-01 14:00') devuelve NaN en Safari y una fecha válida en
     Chrome. Es el clásico "en el iPad las horas salen en blanco". */
  const malas = [];
  codigo.forEach(({f,s}) => {
    [...s.matchAll(/new Date\(([^)]{0,80})\)/g)].forEach(m => {
      if(/\d{4}-\d{2}-\d{2}\s+\d/.test(m[1]) || /['"`]\s*\+\s*['"` ]\s+\d/.test(m[1]))
        malas.push(`${f}: ${m[0].slice(0,60)}`);
    });
  });
  assert.deepEqual(malas, [], malas.join(' · '));
  return 'todas con formato ISO';
});

await caso('No se usa nada que Safari no tenga sin comprobarlo antes', ()=>{
  /* Lo que rompe con un ReferenceError en cuanto se toca. Se admite si está
     detrás de un typeof o un optional chaining. */
  const RIESGOS = [
    ['Notification',        /(?:new\s+)?Notification[.(]/],
    ['SpeechRecognition',   /webkitSpeechRecognition|SpeechRecognition\b/],
    ['showOpenFilePicker',  /showOpenFilePicker/],
    ['structuredClone',     /structuredClone\s*\(/],
    ['crypto.randomUUID',   /crypto\.randomUUID/],
  ];
  const sueltos = [];
  codigo.forEach(({f,s}) => {
    RIESGOS.forEach(([nombre, re]) => {
      [...s.matchAll(new RegExp(re, 'g'))].forEach(m => {
        // Se mira desde el principio de la función que la contiene: un guard
        // puesto al entrar protege todo el cuerpo, aunque esté 40 líneas más
        // arriba.
        const desde = Math.max(0, s.lastIndexOf('function ', m.index) - 40);
        const alrededor = s.slice(desde, m.index + 60);
        const protegido = new RegExp(`typeof\\s+${nombre.split('.')[0]}|${nombre.split('.')[0]}\\s*&&|\\?\\.`).test(alrededor);
        if(!protegido) sueltos.push(`${f}: ${nombre}`);
      });
    });
  });
  assert.deepEqual([...new Set(sueltos)], [], [...new Set(sueltos)].join(' · '));
  return 'las APIs que iOS no tiene van comprobadas';
});

await caso('Guardar un archivo tiene camino propio para iOS', ()=>{
  /* En Safari de iOS el atributo `download` sobre un blob se IGNORA: abre el
     archivo en la misma pestaña y se lleva la app por delante. Justo en la
     copia de seguridad, que es lo último que puede fallar. */
  const app = codigo.find(c => c.f === 'js/app.js').s;
  assert.ok(/function guardarArchivo/.test(app), 'debería existir un único sitio que guarde archivos');
  assert.ok(/navigator\.canShare/.test(app), 'en iOS hay que pasar por la hoja de compartir');
  assert.ok(/iPad\|iPhone\|iPod/.test(app), 'y detectar el aparato');
  assert.ok(/maxTouchPoints/.test(app), 'iPadOS se hace pasar por Mac: hay que mirar el táctil');
  // Y que nadie se haya quedado con el atajo viejo por su cuenta.
  const sueltos = codigo.filter(({f,s}) =>
    f !== 'js/app.js' && /\.download\s*=/.test(s)).map(c => c.f);
  assert.deepEqual(sueltos, [], `siguen guardando a mano: ${sueltos.join(', ')}`);
  return 'una sola puerta, y en iOS pasa por Compartir';
});

// ── 2. En pantalla, con un iPad simulado ──────────────────────────────────
for(const ap of APARATOS){
  await caso(`${ap.n}: ningún campo con letra de menos de 16 px (si no, Safari hace zoom)`, async ()=>{
    /* Safari amplía la página al tocar un campo cuya letra mida menos de
       16 px, y luego la deja desencuadrada. No se puede desactivar: la única
       cura es que ningún campo baje de 16. */
    const page = await browser.newPage();
    await page.setUserAgent(UA_IPAD);
    await page.setViewport({width:ap.w, height:ap.h, isMobile:true, hasTouch:true});
    // hasTouch NO activa `pointer: coarse` en Chromium — hay que decírselo por
    // CDP, o las reglas táctiles no se aplican y la prueba pasa en falso.
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setEmulatedMedia', {features:[{name:'pointer', value:'coarse'}]});
    await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
      localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'APPLE001', tenantId: ggBizTenantId('APPLE001')}));
      localStorage.setItem('gastrogoan_owner_login','1');
      localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
      localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    });
    await page.reload({waitUntil:'domcontentloaded'});
    await new Promise(r => setTimeout(r, 2400));
    await page.evaluate(()=>{
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
        .forEach(id => document.getElementById(id)?.remove());
      Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true,
        tourSeen:true, categoryIconHintSeen:true, name:'Bar'});
      DB.employees.push({id:genId(), name:'Ana', rol:'x', area:'cocina', active:true, color:'#DF7039', pin:'H2:x'});
      DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
      saveDB();
    });
    const VISTAS = [['megalista','cocina'],['pedidos','cocina'],['stock','cocina'],
      ['horarios','cocina'],['limpieza','cocina'],['reservas','sala'],['clientes','sala'],
      ['tpv','sala'],['minegocio','gestion'],['economia','gestion']];
    const chicos = [];
    for(const [v, carpeta] of VISTAS){
      const r = await page.evaluate(({v, carpeta})=>{
        currentFolder = carpeta; navigate(v);
        return [...document.querySelectorAll('input,select,textarea')]
          .filter(e => { const b = e.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && e.type !== 'checkbox' && e.type !== 'radio'; })
          .map(e => ({px: parseFloat(getComputedStyle(e).fontSize),
                      q: (e.id || e.placeholder || e.className || e.tagName).slice(0,28)}))
          .filter(x => x.px < 16);
      }, {v, carpeta});
      r.forEach(x => chicos.push(`${v}: ${x.q} (${x.px}px)`));
    }
    await page.close();
    const unicos = [...new Set(chicos)];
    assert.deepEqual(unicos.slice(0,8), [], `${unicos.length} campos harían zoom → ${unicos.slice(0,5).join(' · ')}`);
    return `${VISTAS.length} pantallas, ningún campo por debajo de 16 px`;
  });
}

await caso('Ninguna altura fija a 100vh sin respaldo (la barra de Safari se mueve)', ()=>{
  /* En iOS, 100vh cuenta la barra de direcciones como si no estuviera: la
     pantalla queda más alta que el hueco real y el último botón se va debajo
     de la barra, donde no se puede pulsar. La cura es repetir la propiedad
     con 100dvh justo después: el navegador que no lo entienda se queda con la
     primera. */
  const css = readFileSync('css/styles.css','utf8');
  const lineas = css.split('\n');
  const malas = [];
  lineas.forEach((l, i) => {
    if(!/100vh/.test(l)) return;
    if(/^\s*\/?\*/.test(l) || /^\s*\*/.test(l)) return;   // comentarios
    const contexto = lineas.slice(i, i + 2).join(' ');
    // `height`/`max-height` fijos son los que hacen daño; un calc() dentro de
    // un max-height con dvh al lado ya está resuelto.
    if(!/100dvh/.test(contexto)) malas.push(`línea ${i+1}: ${l.trim().slice(0,70)}`);
  });
  assert.deepEqual(malas, [], `${malas.length} alturas sin respaldo → ${malas.slice(0,4).join(' · ')}`);
  return 'todas las alturas de pantalla llevan su 100dvh';
});

await caso('La app avisa si el navegador no la deja guardar nada', async ()=>{
  /* Navegación privada de Safari: localStorage e IndexedDB lanzan al
     escribir. Sin avisar, la app parece que funciona y no guarda NADA —
     el peor fallo posible en un TPV. */
  const core = codigo.find(c => c.f === 'js/core.js').s;
  const guardado = /try\s*\{[^}]*localStorage\.setItem/.test(core) ||
                   /catch[^)]*\)\s*\{[^}]*\}/.test(core);
  assert.ok(guardado, 'escribir en localStorage tiene que ir dentro de un try');
  return 'las escrituras van protegidas';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
