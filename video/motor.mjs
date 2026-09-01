// Motor de grabación del tour.
//
// El anterior capturaba N veces el MISMO fotograma en cada parada: el cursor
// se movía con una transición de CSS que ya había terminado cuando empezaba a
// capturar, así que el vídeo salía como una sucesión de diapositivas. Se
// notaba a la legua que aquello no lo había tocado nadie.
//
// Aquí la captura va DENTRO de la acción: el cursor se interpola fotograma a
// fotograma, los clics son clics de verdad sobre el elemento (con su onda al
// pulsar) y el desplazamiento se hace poco a poco. Lo que se graba es lo que
// pasaría si alguien estuviera usando la app.
//
// Los fotogramas no tocan el disco: van por una tubería a ffmpeg según se
// capturan. Un tour de siete minutos son 10.000 imágenes, y guardarlas
// llenaría el disco de la sesión.
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

export const ANCHO = 1600, ALTO = 900, FPS = 25;

export async function grabar({guion, salida, titulo}){
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars',
           '--force-device-scale-factor=1'],
    headless: true,
    defaultViewport: {width: ANCHO, height: ALTO},
  });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('http://localhost:8950/dist/kit-gastrogoan-DEMO.html', {waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 4000));

  await preparar(page);

  const cocina = spawn(ffmpeg, [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    salida,
  ], {stdio: ['pipe', 'inherit', 'inherit']});

  let n = 0;
  // Si ffmpeg va más lento que la captura, se espera: sin esto la tubería se
  // llena y Node se come la memoria hasta morir.
  const fotograma = async () => {
    const buf = await page.screenshot({type:'jpeg', quality:85});
    n++;
    if(!cocina.stdin.write(buf)) await new Promise(r => cocina.stdin.once('drain', r));
  };

  const api = crearApi(page, fotograma);
  console.log(`Grabando «${titulo}» — ${guion.length} escenas…`);
  for(const [i, escena] of guion.entries()){
    // Si algo se ha llevado por delante el rótulo o el cursor (una recarga,
    // una vista que rehace el body), se reponen antes de seguir. Media hora
    // de grabación no se puede perder por esto.
    const vivo = await page.evaluate(() => typeof window.__cursorA === 'function').catch(() => false);
    if(!vivo) await preparar(page);
    await escena(api);
    process.stdout.write(`  ${i+1}/${guion.length} · ${n} fotogramas (${(n/FPS).toFixed(0)}s)\n`);
  }

  await browser.close();
  cocina.stdin.end();
  await new Promise(r => cocina.on('close', r));

  const mb = (fs.statSync(salida).size / 1048576).toFixed(1);
  const seg = Math.round(n / FPS);
  console.log(`\n✅ ${salida} · ${Math.floor(seg/60)}m${String(seg%60).padStart(2,'0')}s · ${mb} MB`);
  if(errores.length) console.log(`⚠️  ${errores.length} errores en la página: ${[...new Set(errores)].slice(0,3).join(' · ')}`);
  return {segundos: seg, errores};
}

/* La app comprueba si hay versión nueva y, si acaba de abrirse sin que nadie
   haya tocado nada, se actualiza SOLA recargando la página. Es exactamente lo
   que queremos que le pase a un cliente, y exactamente lo que no puede pasar
   a mitad de grabación: la recarga se llevaba por delante el cursor y el
   rótulo, y el motor se caía con "__cursorA is not a function". */
async function preparar(page){
  await page.evaluate(() => {
    window.aplicarVersionNueva = () => {};
    window.comprobarVersionPublicada = () => {};
  }).catch(() => {});
  await page.evaluate(inyectar);
}

// ── Lo que se inyecta en la página ────────────────────────────────────────
function inyectar(){
  const barra = document.createElement('div');
  barra.id = '__rotulo';
  barra.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:34px;z-index:2147483646;'
    + 'background:rgba(20,20,20,.93);color:#fff;padding:14px 30px;border-radius:12px;text-align:center;'
    + 'font:600 25px/1.35 -apple-system,system-ui,sans-serif;letter-spacing:-.01em;max-width:78%;'
    + 'box-shadow:0 8px 28px rgba(0,0,0,.28);opacity:0;transition:opacity .3s ease';
  document.body.appendChild(barra);

  const cursor = document.createElement('div');
  cursor.id = '__cursor';
  cursor.style.cssText = 'position:fixed;z-index:2147483647;width:26px;height:26px;pointer-events:none;left:50%;top:50%';
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">'
    + '<path d="M5 2l14 9-6 1 3.5 7-2.6 1.2L10.4 13 5 17z" fill="#111" stroke="#fff" stroke-width="1.5"/></svg>';
  document.body.appendChild(cursor);

  const onda = document.createElement('div');
  onda.id = '__onda';
  onda.style.cssText = 'position:fixed;z-index:2147483645;width:0;height:0;border-radius:50%;pointer-events:none;'
    + 'background:rgba(223,112,57,.35);border:2px solid rgba(223,112,57,.9);opacity:0;'
    + 'transform:translate(-50%,-50%)';
  document.body.appendChild(onda);

  window.__rotular = t => {
    const b = document.getElementById('__rotulo');
    if(!t){ b.style.opacity = '0'; return; }
    b.textContent = t; b.style.opacity = '1';
  };
  window.__cursorA = (x, y) => {
    const c = document.getElementById('__cursor');
    c.style.left = x + 'px'; c.style.top = y + 'px';
  };
  window.__onda = (x, y, p) => {   // p = 0..1, el avance de la onda
    const o = document.getElementById('__onda');
    o.style.left = x + 'px'; o.style.top = y + 'px';
    o.style.width = o.style.height = (10 + p * 46) + 'px';
    o.style.opacity = String(1 - p);
  };

  /* Buscar por TEXTO y no por selector: el marcado de las pestañas cambia de
     una pantalla a otra, pero lo que se lee no. Así el guion dice "Ventas" y
     no depende de cómo esté construido ese botón por dentro. */
  window.__buscar = (texto, dentro) => {
    const raiz = dentro ? document.querySelector(dentro) : document;
    if(!raiz) return null;
    const cands = [...raiz.querySelectorAll('button,.tab,a,.folder-card,.module-card,[onclick]')];
    const norm = s => (s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const busca = norm(texto);
    const el = cands.find(e => {
      if(e.closest('#__rotulo')) return false;
      const r = e.getBoundingClientRect();
      if(r.width < 4 || r.height < 4 || r.top > innerHeight || r.bottom < 0) return false;
      return norm(e.textContent) === busca;
    }) || cands.find(e => {
      const r = e.getBoundingClientRect();
      if(r.width < 4 || r.height < 4 || r.top > innerHeight || r.bottom < 0) return false;
      return norm(e.textContent).includes(busca);
    });
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2};
  };
  window.__pulsarEn = (texto, dentro) => {
    const raiz = dentro ? document.querySelector(dentro) : document;
    const cands = [...(raiz||document).querySelectorAll('button,.tab,a,.folder-card,.module-card,[onclick]')];
    const norm = s => (s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const el = cands.find(e => !e.closest('#__rotulo') && norm(e.textContent) === norm(texto))
            || cands.find(e => !e.closest('#__rotulo') && norm(e.textContent).includes(norm(texto)));
    if(el) el.click();
    return !!el;
  };
  window.__alturaScroll = () => Math.max(0,
    document.documentElement.scrollHeight - window.innerHeight);
}

// ── Las piezas con las que se escribe un guion ────────────────────────────
function crearApi(page, fotograma){
  let cx = ANCHO/2, cy = ALTO/2;   // dónde está el cursor ahora mismo
  const suave = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

  const api = {
    // Rótulo de abajo. Sin texto, lo esconde.
    async rotulo(t){ await page.evaluate(x => window.__rotular(x), t || ''); },

    // Espera quieto, capturando. Es lo único que se parece al motor viejo, y
    // se usa con cuentagotas: solo para que dé tiempo a leer.
    async quieto(seg){
      const f = Math.round(seg * FPS);
      for(let i = 0; i < f; i++) await fotograma();
    },

    // Lleva el cursor a un punto, interpolando. Cada paso es un fotograma.
    async moverA(x, y, seg = .55){
      const pasos = Math.max(2, Math.round(seg * FPS));
      const x0 = cx, y0 = cy;
      for(let i = 1; i <= pasos; i++){
        const p = suave(i / pasos);
        cx = x0 + (x - x0) * p; cy = y0 + (y - y0) * p;
        await page.evaluate(([a,b]) => window.__cursorA(a,b), [cx, cy]);
        await fotograma();
      }
    },

    /* Pulsar de verdad: el cursor va hasta el elemento, se dibuja la onda y
       SOLO ENTONCES se dispara el click. El cambio de pantalla se ve ocurrir,
       que es justo lo que le faltaba al vídeo anterior. */
    async pulsar(texto, {dentro, tras = .8, rotulo} = {}){
      const punto = await page.evaluate(([t,d]) => window.__buscar(t,d), [texto, dentro]);
      if(!punto){ console.log(`     ⚠ no encuentro "${texto}" — sigo`); return false; }
      await api.moverA(punto.x, punto.y);
      for(let i = 1; i <= 6; i++){
        await page.evaluate(([x,y,p]) => window.__onda(x,y,p), [punto.x, punto.y, i/6]);
        await fotograma();
      }
      await page.evaluate(([t,d]) => window.__pulsarEn(t,d), [texto, dentro]);
      if(rotulo) await api.rotulo(rotulo);
      await api.quieto(tras);
      return true;
    },

    // Ir a una vista sin clic (para saltos que no tienen un botón a mano),
    // pero moviendo antes el cursor: en pantalla se ve igual que un clic.
    async ir(js, {rotulo, tras = 1} = {}){
      await page.evaluate(j => { try{ (new Function(j))(); }catch(e){ console.error(e); } }, js);
      if(rotulo !== undefined) await api.rotulo(rotulo);
      await new Promise(r => setTimeout(r, 450));
      await api.quieto(tras);
    },

    // Bajar por la pantalla poco a poco, como quien la lee.
    async recorrer(seg = 2.2){
      const alto = await page.evaluate(() => window.__alturaScroll());
      if(alto < 40){ await api.quieto(seg); return; }
      const pasos = Math.round(seg * FPS);
      for(let i = 1; i <= pasos; i++){
        await page.evaluate(y => window.scrollTo(0, y), alto * suave(i/pasos));
        await fotograma();
      }
      await api.quieto(.5);
      const vuelta = Math.round(.6 * FPS);
      for(let i = 1; i <= vuelta; i++){
        await page.evaluate(([a,p]) => window.scrollTo(0, a*(1-p)), [alto, i/vuelta]);
        await fotograma();
      }
    },

    /* Cambiar de página: la web pública de reservas es OTRO archivo, así que
       el tour tiene que salir de la app para enseñarla. Se vuelve a inyectar
       el rótulo y el cursor, que se pierden con la navegación. */
    /* La carta que se enseña en la web pública es la MISMA que se acaba de
       ver en la app: se saca de la página de la app antes de salir de ella.
       Si se inventara otra, el vídeo estaría enseñando dos restaurantes
       distintos y diciendo que son el mismo. */
    async datosDeLaApp(){
      return await page.evaluate(() => ({
        business: {name: DB.business.name, tiposServicio: DB.business.tiposServicio || {takeaway:true, delivery:true}},
        cartas: DB.cartas, menus: DB.menus,
        activeCartaIds: DB.activeCartaIds, activeMenuIds: DB.activeMenuIds,
      }));
    },

    async abrir(url, {ancho, alto, antes, sinRed} = {}){
      if(ancho) await page.setViewport({width: ancho, height: alto, deviceScaleFactor: 1});
      /* ⚠️ La web pública pregunta a la Firebase de la plataforma en qué nube
         está el negocio. En una grabación eso sería tocar producción, así que
         se corta la red de Firebase y se le dan los datos a mano — igual que
         hacen las pruebas de la web pública. */
      if(sinRed){
        await page.setRequestInterception(true);
        page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url())
          ? r.abort() : r.continue());
      }
      await page.goto(url, {waitUntil: 'domcontentloaded'});
      await new Promise(r => setTimeout(r, 2600));
      if(antes){ await page.evaluate(j => { try{ (new Function(j))(); }catch(e){ console.error(e); } }, antes); }
      await new Promise(r => setTimeout(r, 900));
      await preparar(page);
      cx = ANCHO/2; cy = ALTO/2;
    },

    // Un vistazo lento por la pantalla, moviendo el cursor sin pulsar nada.
    async pasear(){
      await api.moverA(ANCHO*.30, ALTO*.42, .7);
      await api.moverA(ANCHO*.62, ALTO*.58, .7);
    },
  };
  return api;
}
