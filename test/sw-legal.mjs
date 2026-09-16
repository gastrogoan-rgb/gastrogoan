/* El service worker NO puede secuestrar las páginas legales.
 *
 * ── El fallo que motivó esta prueba (16/09/2026) ─────────────────────────
 * El manejador de `fetch` devolvía la copia guardada de la app para
 * CUALQUIER navegación del dominio. Y en app.gastrogoan.com no vive solo la
 * app: viven también /legal/contrato-licencia.html y /legal/privacidad.html,
 * que son precisamente las dos direcciones que enlaza Stripe en la pantalla
 * de pago, y el tutorial.
 *
 * Así que quien hubiera abierto la app alguna vez —o sea, cualquier cliente—
 * pulsaba el enlace del contrato y le salía LA PANTALLA DE INICIO DE SESIÓN.
 *
 * Lo encontró el dueño, no las pruebas, y se entiende por qué: en una
 * pestaña limpia funciona perfectamente. Solo falla cuando el service worker
 * ya está instalado, que es justo el caso de quien va a pagar.
 *
 * ⚠️ Por eso esta prueba ABRE LA APP PRIMERO y espera a que el service
 * worker esté activo. Ir directo a /legal/ no probaría nada.
 */
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import fs from 'node:fs';

const PUERTO = 8961;
const RAIZ = 'deploy/app/public';

if(!fs.existsSync(`${RAIZ}/legal/contrato-licencia.html`)){
  console.error(`✗ falta ${RAIZ}/legal/ — ejecuta antes: bash deploy/actualizar.sh`);
  process.exit(1);
}

// Se sirve la carpeta de PUBLICACIÓN, no el repositorio: lo que hay que
// probar es exactamente lo que va a recibir el cliente.
const servidor = spawn('python3', ['-m', 'http.server', String(PUERTO), '--directory', RAIZ],
  {stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
  headless: true,
});

let fallos = 0;
const comprobar = (ok, texto) => {
  console.log(`${ok ? '✅' : '❌'} ${texto}`);
  if(!ok) fallos++;
};

try {
  const page = await browser.newPage();

  /* 1. Instalar el service worker y esperar a que MANDE.
        Se registra a mano porque la app no lo hace en localhost a propósito
        (ver el final de js/core.js). Y se hace desde una página ligera de
        /legal/ en vez de desde la app: así no hay que descargar los 3,9 MB
        ni esperar a los CDN. Lo que se prueba es sw.js, no el registro. */
  await page.goto(`http://localhost:${PUERTO}/legal/privacidad.html`, {waitUntil: 'domcontentloaded'});
  const activo = await page.evaluate(async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', {scope: '/'});
      await navigator.serviceWorker.ready;
      return !!navigator.serviceWorker.controller || !!(await navigator.serviceWorker.getRegistration())?.active;
    } catch { return false; }
  });
  comprobar(activo, 'el service worker queda activo y al mando');

  if(activo){
    // 2. Con el SW mandando, las páginas legales tienen que ser ELLAS.
    for(const [ruta, esperado] of [
      ['/legal/contrato-licencia.html', 'Contrato de Licencia'],
      ['/legal/privacidad.html', 'Política de Privacidad'],
    ]){
      await page.goto(`http://localhost:${PUERTO}${ruta}`, {waitUntil: 'domcontentloaded'});
      const titulo = await page.title();
      comprobar(titulo.includes(esperado),
        `${ruta} sirve el documento, no la app  (título: "${titulo}")`);
    }

    // 3. Y la app tiene que seguir sirviéndose de la copia guardada, que es
    //    para lo que existe el service worker. Si esto se rompe, el arreglo
    //    ha ido demasiado lejos.
    await page.goto(`http://localhost:${PUERTO}/`, {waitUntil: 'domcontentloaded'});
    const esApp = (await page.title()).toLowerCase().includes('gastrogoan');
    comprobar(esApp, 'la app se sigue sirviendo en la raíz');
  }
} finally {
  await browser.close();
  servidor.kill();
}

console.log('─'.repeat(56));
if(fallos){
  console.log(`❌ ${fallos} fallo(s): el service worker secuestra páginas que no son la app`);
  process.exit(1);
}
console.log('✅ el service worker respeta /legal/ y sigue sirviendo la app');
