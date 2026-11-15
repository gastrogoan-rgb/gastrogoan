// La web comercial (gastrogoan.com) — deploy/web/public, generada por tools/web/generar.mjs (15/11).
// Vigila lo que importa para vender: que estén las 13 páginas en los tres idiomas, que ningún enlace esté roto, que el botón de compra apunte
// al enlace de pago vigente (y no al antiguo de 100 €), que NO dependa de nada externo (un bloqueo de LaLiga a una CDN la dejaría en blanco),
// que no se desborde en 6 anchos de móvil, que lo que se toca mida 44 px, que ninguna letra baje de 11 px y que se vea entera sin JavaScript.
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const DIR = 'deploy/web/public';
const STRIPE = 'https://buy.stripe.com/bJebJ0cKCfN19Bsc19dwc03';
const PAGINAS = {
  es: ['index.html', 'app.html', 'asesoria.html', 'eventos.html'],
  ca: ['ca-inici.html', 'ca-app.html', 'ca-assessoria.html', 'ca-esdeveniments.html'],
  en: ['en-home.html', 'en-app.html', 'en-advisory.html', 'en-events.html'],
};
const TODAS = [...PAGINAS.es, ...PAGINAS.ca, ...PAGINAS.en, 'gracias.html'];
const APPS = ['app.html', 'ca-app.html', 'en-app.html'];

const srv = spawn('python3', ['-m', 'http.server', '8955', '--bind', '127.0.0.1'], {cwd: DIR, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: 'new'});
let fallos = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅', n); }catch(e){ fallos++; console.log('❌', n, '\n   ⤷', String(e.message).split('\n').slice(0, 14).join(' | ')); } };
const leer = f => fs.readFileSync(path.join(DIR, f), 'utf8');

await caso('Están las 13 páginas (4 × 3 idiomas + gracias) y su CSS, JS y favicon', async () => {
  for(const f of [...TODAS, 'web.css', 'web.js', 'favicon.svg']) assert.ok(fs.existsSync(path.join(DIR, f)), 'falta ' + f);
});

await caso('Cada página tiene título, descripción, idioma, UN solo h1 y (menos gracias) canónica y los tres hreflang', async () => {
  for(const f of TODAS){
    const h = leer(f);
    assert.ok(/<title>[^<]{12,}<\/title>/.test(h), f + ': título');
    assert.ok(/<meta name="description" content="[^"]{40,}"/.test(h), f + ': descripción');
    assert.ok(/<html lang="(es|ca|en)">/.test(h), f + ': lang');
    assert.equal((h.match(/<h1[ >]/g) || []).length, 1, f + ': debe haber exactamente un h1');
    if(f !== 'gracias.html'){
      assert.ok(/<link rel="canonical" href="https:\/\/gastrogoan\.com\/[^"]+"/.test(h), f + ': canónica');
      for(const l of ['es', 'ca', 'en']) assert.ok(h.includes(`hreflang="${l}"`), f + ': hreflang ' + l);
    } else assert.ok(h.includes('noindex'), 'gracias debe llevar noindex');
  }
});

await caso('NO depende de nada externo: ni scripts, ni hojas de estilo, ni fuentes, ni imágenes de otro dominio', async () => {
  for(const f of TODAS){
    const h = leer(f);
    const src = [...h.matchAll(/<(?:script|link|img|source)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]).filter(u => !/^https:\/\/gastrogoan\.com\//.test(u));
    const permitidos = src.filter(u => !/canonical|alternate/.test(u));
    assert.deepEqual(permitidos.filter(u => /unpkg|googleapis|gstatic|cdn|jsdelivr|cdnjs|cloudflare/i.test(u)), [], f + ': carga externa');
  }
  const css = leer('web.css'); assert.ok(!/url\(\s*["']?https?:/i.test(css.replace(/xmlns='http:\/\/www\.w3\.org\/2000\/svg'/g, '')), 'el CSS carga algo externo');
});

await caso('Todos los enlaces internos, imágenes y anclas existen', async () => {
  for(const f of TODAS){
    const h = leer(f);
    for(const m of h.matchAll(/(?:href|src)="(?!https?:|mailto:|#)([^"#]*?)(#[^"]*)?"/g)){
      const u = m[1].split('?')[0]; if(!u || u.startsWith('mailto')) continue;
      assert.ok(fs.existsSync(path.join(DIR, u)), `${f}: enlace roto → ${u}`);
    }
    for(const m of h.matchAll(/href="#([^"]+)"/g)) assert.ok(new RegExp(`id="${m[1]}"`).test(h), `${f}: ancla #${m[1]} sin destino`);
  }
});

await caso('Las tres páginas de la app venden con el enlace de pago NUEVO y ya no queda el de 100 €', async () => {
  for(const f of APPS){
    const h = leer(f);
    assert.ok((h.match(new RegExp(STRIPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length >= 4, f + ': faltan botones de compra');
    assert.ok(!h.includes('aFa6oGeSK44jaFw1mvdwc01'), f + ': sigue el enlace antiguo');
    assert.ok(!/100\s?€\s?(\/|al año|a l'any|\/año)/i.test(h) && !/€100\s?(\/|a year)/i.test(h), f + ': sigue el precio de 100 €');
    assert.ok(/300/.test(h) && /240/.test(h) && /IVA|VAT/.test(h), f + ': debe decir 300 / 240 + IVA');
  }
});

await caso('Lo que la web promete ya no es falso: sin «email en 24 h», sin «sin nube obligatoria»', async () => {
  for(const f of TODAS){
    const h = leer(f).toLowerCase();
    for(const x of ['en tu email en 24', 'sin nube obligatoria', 'recibes la app en tu email', 'bundled page']) assert.ok(!h.includes(x), `${f}: «${x}»`);
  }
});

await caso('La página de la app habla de la reunión de configuración y del precio real en los tres idiomas', async () => {
  const claves = {'app.html': ['reunión', 'puesta a punto'], 'ca-app.html': ['reunió', 'posada a punt'], 'en-app.html': ['session', 'set-up']};
  for(const [f, ks] of Object.entries(claves)){ const h = leer(f).toLowerCase(); for(const k of ks) assert.ok(h.includes(k), `${f}: falta «${k}»`); }
});

await caso('Peso: cada HTML < 60 KB y las imágenes de la app < 120 KB', async () => {
  for(const f of TODAS) assert.ok(fs.statSync(path.join(DIR, f)).size < 60000, f + ' pesa demasiado');
  for(const f of fs.readdirSync(path.join(DIR, 'img')).filter(x => /^(app|hero)-/.test(x))) assert.ok(fs.statSync(path.join(DIR, 'img', f)).size < 120000, f + ' pesa demasiado');
});

// ───────────── Navegador ─────────────
const ANCHOS = [320, 360, 390, 412, 430, 768, 1280];
const URL = f => 'http://127.0.0.1:8955/' + f;
async function abrir(f, w, opts = {}){
  const p = await browser.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if(m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  if(opts.sinJs) await p.setJavaScriptEnabled(false);
  if(opts.reducir) await p.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await p.setViewport({width: w, height: 800, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700});
  await p.goto(URL(f), {waitUntil: 'networkidle0'});
  p.errs = errs; return p;
}

await caso('Sin errores de JavaScript en ninguna de las 13 páginas', async () => {
  for(const f of TODAS){ const p = await abrir(f, 1280); assert.deepEqual(p.errs, [], f); await p.close(); }
});

await caso('Nada se desborda en horizontal en 7 anchos (320 a 1280), en las 13 páginas', async () => {
  const malos = [];
  for(const w of ANCHOS) for(const f of TODAS){
    const p = await abrir(f, w);
    const r = await p.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: innerWidth}));
    if(r.sw > r.iw + 1) malos.push(`${f}@${w}: ${r.sw}>${r.iw}`);
    await p.close();
  }
  assert.deepEqual(malos, []);
});

await caso('Lo que se toca mide 44 px o más (botones, pestañas, idiomas, preguntas, enlaces del pie) y la letra no baja de 11 px', async () => {
  const malos = [];
  for(const w of [320, 390, 1280]) for(const f of ['index.html', 'app.html', 'asesoria.html', 'eventos.html', 'gracias.html']){
    const p = await abrir(f, w);
    const r = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('.btn,.nav a,.idiomas a,.pestanas button,.faq summary,.ocasiones a,.pie li a,.camino').forEach(e => {
        const b = e.getBoundingClientRect(); if(!b.width || !b.height) return;
        if(getComputedStyle(e).visibility === 'hidden') return;
        if(b.height < 43.5) out.push(`${e.className || e.tagName} ${e.textContent.trim().slice(0, 18)} h=${Math.round(b.height)}`);
      });
      document.querySelectorAll('body *').forEach(e => {
        if(e.children.length || !e.textContent.trim()) return;
        const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); if(!b.width || cs.visibility === 'hidden') return;
        if(parseFloat(cs.fontSize) < 10.95) out.push(`letra ${cs.fontSize} «${e.textContent.trim().slice(0, 20)}»`);
      });
      return out;
    });
    r.forEach(x => malos.push(`${f}@${w}: ${x}`)); await p.close();
  }
  assert.deepEqual(malos.slice(0, 8), []);
});

await caso('Ninguna palabra se parte a media palabra en títulos y botones (320 y 390)', async () => {
  const malos = [];
  for(const w of [320, 390]) for(const f of TODAS){
    const p = await abrir(f, w);
    const r = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('h1,h2,h3,.btn,.camino h2').forEach(e => { if(e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') out.push(e.textContent.trim().slice(0, 30)); });
      // Una palabra más ancha que su caja: el navegador la parte o la desborda.
      document.querySelectorAll('h1,h2,h3').forEach(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const pw = e.getBoundingClientRect().width; if(!pw) return; const ws = e.textContent.split(/\s+/);
        const s = document.createElement('span'); s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + getComputedStyle(e).font + ';letter-spacing:' + getComputedStyle(e).letterSpacing; document.body.appendChild(s);
        ws.forEach(x => { s.textContent = x; if(s.getBoundingClientRect().width > pw + 1) out.push('palabra «' + x + '» > caja'); }); s.remove();
      });
      return out;
    });
    r.forEach(x => malos.push(`${f}@${w}: ${x}`)); await p.close();
  }
  assert.deepEqual(malos.slice(0, 8), []);
});

await caso('Las capturas de la app cambian con las pestañas y se manejan con el teclado', async () => {
  const p = await abrir('app.html', 1280);
  const vis = () => p.evaluate(() => [...document.querySelectorAll('.panel-esc')].filter(x => !x.hidden).map(x => x.id));
  assert.deepEqual(await vis(), ['esc-tpv']);
  await p.click('#tab-comandas'); assert.deepEqual(await vis(), ['esc-comandas']);
  await p.focus('#tab-comandas'); await p.keyboard.press('ArrowRight'); assert.deepEqual(await vis(), ['esc-reservas']);
  await p.keyboard.press('End'); assert.deepEqual(await vis(), ['esc-resultados']);
  const aria = await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(t => t.getAttribute('aria-selected')).join(','));
  assert.equal(aria, 'false,false,false,false,true'); await p.close();
});

await caso('Los seis menús de Le Petit Comité cambian con las pestañas (en los tres idiomas)', async () => {
  for(const f of ['eventos.html', 'ca-esdeveniments.html', 'en-events.html']){
    const p = await abrir(f, 390);
    assert.equal(await p.evaluate(() => document.querySelectorAll('.carta').length), 6, f);
    await p.click('#mt-4');
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.carta')].filter(x => !x.hidden).map(x => x.id)), ['mp-4'], f); await p.close();
  }
});

await caso('SIN JavaScript la página se ve entera: todo visible, capturas apiladas y sin pestañas muertas', async () => {
  const p = await abrir('app.html', 1280, {sinJs: true});
  const r = await p.evaluate(() => ({
    ocultos: [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity === '0').length,
    paneles: [...document.querySelectorAll('.panel-esc')].filter(e => getComputedStyle(e).display !== 'none').length,
    pest: getComputedStyle(document.querySelector('.pestanas')).display,
  }));
  assert.equal(r.ocultos, 0, 'hay bloques invisibles sin JS'); assert.equal(r.paneles, 5); assert.equal(r.pest, 'none'); await p.close();
});

await caso('Con «reducir movimiento» no se anima nada y todo queda visible al momento', async () => {
  const p = await abrir('app.html', 1280, {reducir: true});
  const r = await p.evaluate(() => ({inv: [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity !== '1').length, anim: getComputedStyle(document.querySelector('.movil')).animationName}));
  assert.equal(r.inv, 0); assert.equal(r.anim, 'none'); await p.close();
});

await caso('La cabecera lleva el idioma activo marcado y cada idioma enlaza a SU versión de la misma página', async () => {
  const p = await abrir('ca-app.html', 1280);
  const r = await p.evaluate(() => [...document.querySelectorAll('.idiomas a')].map(a => a.getAttribute('href') + (a.getAttribute('aria-current') ? '*' : '')));
  assert.deepEqual(r, ['app.html', 'ca-app.html*', 'en-app.html']); await p.close();
});

await caso('En móvil la barra de compra de la app aparece al bajar del primer bloque y no tapa el pie', async () => {
  const p = await abrir('app.html', 390);
  assert.equal(await p.evaluate(() => document.getElementById('barra-compra').classList.contains('on')), false, 'no debe verse al principio');
  await p.evaluate(() => window.scrollTo(0, 1800)); await new Promise(r => setTimeout(r, 500));
  assert.equal(await p.evaluate(() => document.getElementById('barra-compra').classList.contains('on')), true, 'debe verse al bajar');
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(() => { const f = document.querySelector('.pie-fin').getBoundingClientRect(), b = document.getElementById('barra-compra').getBoundingClientRect(); return f.bottom <= b.top + 1; });
  assert.ok(r, 'la barra tapa el final del pie'); await p.close();
});

await browser.close(); srv.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la web comercial está completa, sin dependencias externas y se ve bien en móvil y escritorio');
process.exit(fallos ? 1 : 0);
