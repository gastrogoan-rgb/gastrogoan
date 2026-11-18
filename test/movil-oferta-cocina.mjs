// Vista móvil del 18/11 (Android del dueño, ~360 px): campana por delante del chat, botones de Comandas Cocina que caben
// (y «Deshacer» sin fila propia), «⋯» de cada carta junto a su nombre, horas de los días legibles y cabecera de sección compacta.
// Se mide en 320, 360, 390, 412, 430 y en tablet (768).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PUERTO = process.env.PUERTO || 8950;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const w = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height:900});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MOVIL1811', tenantId: ggBizTenantId('MOVIL1811')}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await w(2200);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    document.getElementById('app-splash')?.remove();
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Restaurante La Bodeguilla del Puerto'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    editUnlocked = true;
    const dia = (a, d, h) => ({activo:a, franjas:[{desde: a ? d : '', hasta: a ? h : ''}]});
    DB.cartas = [{id:1, nombre:'CARTA PRINCIPAL DE TEMPORADA DE OTOÑO', area:'cocina', activa:true,
      horario:[dia(true,'12:30','16:30'), dia(true,'12:00','16:30'), dia(true,'13:00','23:00'), dia(true,'12:30','23:30'), dia(false), {activo:true, franjas:[{desde:'12:00',hasta:'16:00'},{desde:'20:00',hasta:'23:30'}]}, dia(true,'','')],
      secciones:[{id:11, nombre:'Entrantes y para compartir', platos:[{id:111, nombre:'Croquetas', precio:9, precioBase:8.18, ivaPct:10, disponible:true, stock:5, modificadores:[]}]}]}];
    DB.menus = [{id:5, nombre:'Menú del día', area:'cocina', precio:14.5, precioBase:13.18, ivaPct:10, stock:20,
      horario: Array.from({length:7}, () => dia(true,'13:00','16:00')),
      grupos:[{id:51, nombre:'Primeros', opciones:[{id:511, nombre:'Sopa', disponible:true, stock:8, modificadores:[]}]}]}];
    DB.tpvOrders.length = 0;
    saveDB();
    // un globo con número en la campana y otro en el chat
    const b = document.getElementById('avisos-badge'); b.style.display = 'flex'; b.textContent = '12';
    const c = document.getElementById('chat-badge'); c.style.display = 'flex'; c.textContent = '3';
  });
  return {page, errs};
}

for(const ancho of [320, 360, 390, 412, 430, 768]){
  const {page, errs} = await abrir(ancho);

  await caso(`Campana: el globo con el número se ve por delante del botón de chat (${ancho}px)`, async () => {
    const r = await page.evaluate(() => {
      const b = document.getElementById('avisos-badge').getBoundingClientRect();
      // se prueban varios puntos del globo: ninguno puede pertenecer al botón del chat
      const pts = [[.5,.5],[.8,.5],[.9,.5],[.5,.2]].map(([x,y]) => document.elementFromPoint(b.left + b.width*x, b.top + b.height*y));
      return {tapados: pts.filter(e => !e || !e.closest('#avisos-fab')).map(e => e ? (e.id || e.className) : 'nada'), vis: b.width > 10};
    });
    assert.ok(r.vis, 'el globo se pinta');
    assert.deepEqual(r.tapados, [], 'algún punto del globo cae sobre otro elemento');
  });

  await caso(`Comandas Cocina: los botones caben, sin partir palabras, letra ≥ 11 px, y «Deshacer» no tiene fila propia (${ancho}px)`, async () => {
    await page.evaluate(() => { currentFolder = 'cocina'; navigate('comandascocina'); });
    await w(500);
    const r = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('#view-comandascocina .kds-toolbar .btn')];
      return bs.map(b => {
        const cs = getComputedStyle(b), rc = b.getBoundingClientRect();
        // la palabra más larga, medida en una sola línea con la misma tipografía
        const palabras = b.innerText.trim().split(/\s+/);
        const tmp = document.createElement('span'); tmp.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
        document.body.appendChild(tmp);
        let maxPal = 0; palabras.forEach(p => { tmp.textContent = p; maxPal = Math.max(maxPal, tmp.getBoundingClientRect().width); }); tmp.remove();
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        return {t: b.innerText.trim() || b.getAttribute('aria-label'), top: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), fs: parseFloat(cs.fontSize),
                sobra: b.scrollWidth - b.clientWidth, maxPal: Math.round(maxPal), util: Math.round(rc.width - padX), wb: cs.wordBreak, ow: cs.overflowWrap, deshacer: b.classList.contains('kds-undo')};
      });
    });
    assert.equal(r.length, 6, JSON.stringify(r));
    r.forEach(b => {
      if(!b.deshacer) assert.ok(b.fs >= 11, `letra ${b.fs}px en «${b.t}»`);
      assert.ok(b.sobra <= 1, `el texto de «${b.t}» se sale de la caja (${b.sobra}px)`);
      assert.ok(b.h >= 40, `«${b.t}» mide ${b.h}px de alto`);
      if(!b.deshacer){ assert.ok(b.maxPal <= b.util + 1, `una palabra de «${b.t}» no cabe y se partiría (${b.maxPal} > ${b.util})`); assert.ok(b.wb !== 'break-all' && b.ow !== 'anywhere', 'rotura de palabras'); }
    });
    if(ancho <= 600){
      const d = r.find(b => b.deshacer), tab = r[0];
      assert.equal(d.top, tab.top, 'Deshacer en la fila de las pestañas');
      assert.ok(d.w <= 80, `Deshacer compacto (${d.w}px)`);
      const filas = new Set(r.map(b => b.top));
      assert.equal(filas.size, 2, 'dos filas en total: ' + [...filas]);
    }
  });

  await caso(`Oferta (lista): «⋯» junto al nombre, no en una fila suelta; horas de los días legibles y sin solaparse (${ancho}px)`, async () => {
    await page.evaluate(() => { currentFolder = 'cocina'; ofertaTab = 'carta'; cartaEdit = null; menuEdit = null; navigate('carta'); });
    await w(600);
    const r = await page.evaluate(() => {
      const it = document.querySelector('#carta-list .oc-item'), nom = it.querySelector('.oc-nombre').getBoundingClientRect(), acc = it.querySelector('.oc-acc').getBoundingClientRect();
      const hs = it.querySelector('.horsem').getBoundingClientRect(), ir = it.getBoundingClientRect();
      const dias = [...it.querySelectorAll('.horsem-d')].map(d => {
        const dr = d.getBoundingClientRect();
        return {l: dr.left, r: dr.right, sobra: Math.max(0, ...[...d.querySelectorAll('span')].map(s => s.scrollWidth - s.clientWidth)), txt: d.innerText.replace(/\s+/g,' ')};
      });
      let solapa = false; for(let i = 1; i < dias.length; i++) if(dias[i].l < dias[i-1].r - 0.5) solapa = true;
      return {accTop: acc.top, nomTop: nom.top, accBottom: acc.bottom, hsTop: hs.top, dias, solapa, desborda: it.scrollWidth > it.clientWidth + 1};
    });
    assert.ok(r.accBottom <= r.hsTop + 1, `«⋯» encima del horario, no debajo: ${JSON.stringify({acc:r.accBottom, hs:r.hsTop})}`);
    assert.ok(Math.abs(r.accTop - r.nomTop) < 40, 'a la altura del nombre');
    assert.equal(r.solapa, false, 'casillas de días solapadas');
    assert.equal(r.desborda, false);
    r.dias.forEach(d => assert.ok(d.sobra <= 1, `texto fuera de su casilla «${d.txt}» (${d.sobra}px)`));
    assert.ok(r.dias.some(d => /12:30/.test(d.txt)), 'se conservan las horas con minutos: ' + JSON.stringify(r.dias.map(d => d.txt)));
  });

  await caso(`Oferta (editor): la cabecera de cada sección es un bloque compacto: nombre y «⋯» arriba, acciones debajo (${ancho}px)`, async () => {
    await page.evaluate(() => { openCarta(1); });
    await w(700);
    const r = await page.evaluate(() => {
      const cab = document.querySelector('#carta-editor-view .oc-sec-cab'); const cr = cab.getBoundingClientRect();
      const nom = cab.querySelector('h4').getBoundingClientRect(), mas = cab.querySelector('.mn-btn').getBoundingClientRect();
      const hijos = [...cab.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      return {alto: Math.round(cr.height), nomTop: nom.top, masTop: mas.top, masRight: mas.right, cabRight: cr.right, fuera: hijos.filter(h => h.right > cr.right + 1 || h.left < cr.left - 1).length, desborda: cab.scrollWidth > cab.clientWidth + 1};
    });
    assert.equal(r.desborda, false); assert.equal(r.fuera, 0, 'botones fuera de la cabecera');
    if(ancho <= 600){
      assert.ok(Math.abs(r.nomTop - r.masTop) < 30, 'el «⋯» va en la fila del nombre: ' + JSON.stringify(r));
      assert.ok(r.cabRight - r.masRight < 20, '«⋯» pegado al borde derecho');
      assert.ok(r.alto <= 150, 'cabecera compacta: ' + r.alto + ' px');
    }
  });

  await caso(`Sin errores de JavaScript (${ancho}px)`, async () => { assert.deepEqual(errs, []); });
  await page.close();
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ vista móvil de Oferta y Comandas Cocina en orden');
process.exit(fallos ? 1 : 0);
