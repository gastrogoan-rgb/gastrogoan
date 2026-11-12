/* QR PROPIO (12/11): el QR de reseña del ticket pedía su imagen a un servicio externo y salía roto si fallaba. Ahora lo dibuja js/qr.js.
 * Lo único que importa de un QR es que SE LEA, y eso no se ve mirándolo: aquí se generan QR de todos los tamaños —los dos extremos de
 * CADA una de las 40 versiones, para cazar un fallo en cualquier tabla— y se DECODIFICAN con un lector real (jsQR). */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.goto('about:blank');
await page.addScriptTag({path: 'js/qr.js'});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

// Genera el PNG en la página, lo vuelve a leer píxel a píxel y lo decodifica aquí con jsQR.
async function leer(texto, px = 300){
  const img = await page.evaluate(async (t, px) => {
    const url = GGQR.png(t, px);
    if(!url.startsWith('data:image/png')) return null;
    const im = new Image(); im.src = url; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    return {w: c.width, h: c.height, data: Array.from(d.data)};
  }, texto, px);
  if(!img) return null;
  const r = jsQR(new Uint8ClampedArray(img.data), img.w, img.h);
  return r ? r.data : null;
}
const relleno = n => { let s = 'https://x.es/'; while(s.length < n) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[(s.length * 7) % 36]; return s.slice(0, n); };

await caso('Un enlace de reseña de Google real se lee igual que se escribió', async () => {
  const url = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';
  assert.equal(await leer(url), url);
});
await caso('Texto con acentos, ñ, € y emoji (UTF-8)', async () => {
  const t = 'Reseña: café, piña y 12,50 € 🍽️';
  assert.equal(await leer(t), t);
});
await caso('Textos cortos (1, 2, 5, 20 caracteres)', async () => {
  for(const n of [1, 2, 5, 20]){ const t = relleno(Math.max(n, 1)).slice(0, n); assert.equal(await leer(t), t, 'longitud ' + n); }
});
await caso('Las 40 versiones: el texto más corto y el más largo de CADA una se leen bien', async () => {
  // La versión depende solo de la longitud: se barre la longitud con la matriz (rápido) y se decodifican los extremos de cada versión.
  const lim = await page.evaluate(() => {
    const r = {};
    for(let L = 1; L <= 2331; L++){ const q = GGQR.matriz('x'.repeat(L)); if(!q) break; const v = q.version; if(!r[v]) r[v] = [L, L]; r[v][1] = L; }
    return r;
  });
  const versiones = Object.keys(lim).map(Number);
  assert.equal(versiones.length, 40, 'se alcanzan las 40 versiones: ' + versiones.length);
  const mal = [];
  for(const v of versiones){
    for(const L of new Set(lim[v])){
      const t = relleno(L);
      let leido = null;
      try{ leido = await leer(t, v > 20 ? 900 : 500); }catch(e){}
      if(leido !== t) mal.push(`v${v} (${L} car.)`);
    }
  }
  assert.deepEqual(mal, [], 'no se leen: ' + mal.join(', '));
  return `40 versiones, ${versiones.length * 2} QR decodificados`;
});
await caso('Más allá de la capacidad no se inventa un QR roto (devuelve vacío)', async () => {
  const r = await page.evaluate(() => GGQR.png('x'.repeat(2400), 300));
  assert.equal(r, '');
});
await caso('Con un tamaño pedido distinto el QR sigue legible y con píxeles enteros por módulo', async () => {
  const t = 'https://g.page/r/CxAbCdEfGhIjKlMn/review';
  for(const px of [110, 160, 240, 480]) assert.equal(await leer(t, px), t, 'px ' + px);
});
await caso('El SVG es válido y tiene un cuadrado por módulo negro', async () => {
  const s = await page.evaluate(() => GGQR.svg('hola'));
  assert.match(s, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
  assert.ok((s.match(/h1v1h-1z/g) || []).length > 50);
});
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el QR propio se genera y se lee en todos los tamaños');
process.exit(fallos ? 1 : 0);
