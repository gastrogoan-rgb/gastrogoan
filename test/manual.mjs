// Manual de uso rehecho (1/11) + tour guiado: capítulos en tres idiomas, índice por áreas, buscador que marca lo encontrado,
// saltos a cada apartado, anterior/siguiente, índice plegado en móvil y el tour de punta a punta con teclado.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.setDefaultTimeout(30000);
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MANUAL01', tenantId: ggBizTenantId('MANUAL01')}));
    localStorage.setItem('gastrogoan_owner_login', '1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    manualIndiceAbierto = null; manualSearch = ''; manualChapter = 0;
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('manual');
  });
  await new Promise(r => setTimeout(r, 500));
  return {page, errs};
}

await caso('Hay un capítulo por pantalla, agrupados en las cinco áreas, cada uno en los tres idiomas y con los mismos apartados', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(() => {
    const mal = [];
    const ids = MANUAL_CHAPTERS.map(c => c.id);
    ['empezar','megalista','proveedores','escandallo','fichas','oferta','idr','stock','pedidos','horarios','distribucion','limpieza','comandascocina','tpv','reservas','online','clientes','promocion','economia','dashboard','minegocio','faq'].forEach(i => { if(!ids.includes(i)) mal.push('falta el capítulo ' + i); });
    if(new Set(ids).size !== ids.length) mal.push('ids repetidos');
    MANUAL_CHAPTERS.forEach(c => {
      if(!MANUAL_AREAS.some(a => a.key === c.area)) mal.push(c.id + ': área desconocida');
      const h4 = {};
      ['es','ca','en'].forEach(l => {
        const tit = (c.title[l] || '').replace(/<[^>]+>/g, '').trim(), txt = c.content[l] || '';
        if(tit.length < 3) mal.push(`${c.id}/${l}: sin título`);
        if(txt.length < 600) mal.push(`${c.id}/${l}: texto demasiado corto (${txt.length})`);
        if(!/<i class="ti ti-/.test(c.title[l] || '')) mal.push(`${c.id}/${l}: el título no lleva icono`);
        if(/style=|<script|\$\{/.test(txt)) mal.push(`${c.id}/${l}: lleva style, script o plantilla`);
        const abre = (txt.match(/<div/g) || []).length, cierra = (txt.match(/<\/div>/g) || []).length;
        if(abre !== cierra) mal.push(`${c.id}/${l}: div sin cerrar (${abre}/${cierra})`);
        if((txt.match(/<ul/g) || []).length !== (txt.match(/<\/ul>/g) || []).length) mal.push(`${c.id}/${l}: ul sin cerrar`);
        h4[l] = (txt.match(/<h4/g) || []).length;
      });
      if(h4.es !== h4.ca || h4.es !== h4.en) mal.push(`${c.id}: apartados distintos entre idiomas (es ${h4.es}, ca ${h4.ca}, en ${h4.en})`);
    });
    return {mal, n: MANUAL_CHAPTERS.length};
  });
  assert.deepEqual(r.mal, [], r.mal.join(' | '));
  assert.ok(r.n >= 22, 'capítulos: ' + r.n);
  await page.close();
});

await caso('Cada capítulo se pinta: título, cuerpo, «En este capítulo», anterior/siguiente y sin desbordar (1280 y 390)', async () => {
  for(const [w, h] of [[1280,800],[390,844]]){
    const {page, errs} = await abrir(w, h);
    const r = await page.evaluate(async () => {
      const mal = [];
      for(let i = 0; i < MANUAL_CHAPTERS.length; i++){
        goManualChapter(i);
        const c = MANUAL_CHAPTERS[i];
        const tit = document.querySelector('.mnl-cab-tit'), cuerpo = document.querySelector('.mnl-cuerpo');
        if(!tit || !tit.textContent.trim()) mal.push(c.id + ': sin título'); 
        if(!cuerpo || cuerpo.textContent.trim().length < 300) mal.push(c.id + ': cuerpo vacío');
        const hs = document.querySelectorAll('.mnl-cuerpo h4').length;
        if(hs >= 3 && !document.querySelector('.mnl-toc')) mal.push(c.id + ': sin «En este capítulo»');
        const sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if(sw > 1) mal.push(`${c.id}: la página se desplaza ${sw}px de lado`);
        document.querySelectorAll('.mnl-cuerpo .manual-step .st, .mnl-cuerpo p, .mnl-cuerpo li, .mnl-cuerpo td').forEach(e => { const q = e.getBoundingClientRect(); if(q.width && q.right > innerWidth + 1) mal.push(`${c.id}: texto fuera de pantalla («${e.textContent.trim().slice(0, 24)}»)`); });
        document.querySelectorAll('.mnl-cuerpo table').forEach(tb => { if(innerWidth < 500 && tb.getBoundingClientRect().right > innerWidth + 1) mal.push(c.id + ': una tabla se sale'); });
      }
      return mal.slice(0, 12);
    });
    assert.deepEqual(r, [], `${w}px: ` + r.join(' | '));
    assert.deepEqual(errs, [], errs.join(' | '));
    await page.close();
  }
});

await caso('Buscar filtra los capítulos y MARCA lo encontrado dentro del texto; sin resultados lo dice', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const total = document.querySelectorAll('.mnl-chip').length;
    setManualSearch('stripe'); await esp(200);
    const out = {total, filtrados: document.querySelectorAll('.mnl-chip').length, marcas: document.querySelectorAll('.mnl-cuerpo mark.mnl-hl').length, marcaTxt: (document.querySelector('mark.mnl-hl') || {}).textContent};
    setManualSearch('qwertyzzz'); await esp(200);
    out.vacio = !!document.querySelector('#manual-detail .empty') && document.querySelectorAll('.mnl-chip').length === 0;
    setManualSearch('TPV'); await esp(100);   // sin distinguir mayúsculas
    out.mayus = document.querySelectorAll('.mnl-chip').length;
    setManualSearch(''); await esp(100);
    out.vuelta = document.querySelectorAll('.mnl-chip').length;
    return out;
  });
  assert.ok(r.filtrados > 0 && r.filtrados < r.total, JSON.stringify(r)); assert.ok(r.marcas >= 1 && /stripe/i.test(r.marcaTxt), JSON.stringify(r));
  assert.ok(r.vacio, JSON.stringify(r)); assert.ok(r.mayus >= 1, JSON.stringify(r)); assert.equal(r.vuelta, r.total, JSON.stringify(r));
  await page.close();
});

await caso('«En este capítulo» salta al apartado y anterior/siguiente cambian de capítulo', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    goManualChapter(MANUAL_CHAPTERS.findIndex(c => c.id === 'tpv')); await esp(200);
    const its = [...document.querySelectorAll('.mnl-toc-it')];
    const out = {saltos: its.length};
    its[its.length - 1].click(); await esp(900);
    const h = document.getElementById('mnl-h-' + (its.length - 1)); const q = h.getBoundingClientRect();
    out.visible = q.top >= 0 && q.top < innerHeight;
    const antes = manualChapter;
    document.querySelector('.mnl-sig').click(); await esp(200); out.sig = manualChapter - antes;
    document.querySelector('.mnl-pie .mnl-nav:not(.mnl-sig)').click(); await esp(200); out.ant = manualChapter - antes;
    return out;
  });
  assert.ok(r.saltos >= 3 && r.visible, JSON.stringify(r)); assert.equal(r.sig, 1, JSON.stringify(r)); assert.equal(r.ant, 0, JSON.stringify(r));
  await page.close();
});

await caso('En móvil el índice empieza plegado en un botón con el capítulo actual, se abre, y al elegir se pliega', async () => {
  const {page} = await abrir(390, 844);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const vis = s => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().height > 0; };
    const out = {toggle: vis('.mnl-toggle'), cerrado: !vis('.mnl-grupos'), txt: document.querySelector('.mnl-toggle').textContent.replace(/\s+/g, ' ').trim()};
    document.querySelector('.mnl-toggle').click(); await esp(150);
    out.abierto = vis('.mnl-grupos'); out.alto = Math.round(document.querySelector('.mnl-chip').getBoundingClientRect().height);
    document.querySelectorAll('.mnl-chip')[3].click(); await esp(250);
    out.plegado = !vis('.mnl-grupos'); out.cap = manualChapter;
    return out;
  });
  assert.ok(r.toggle && r.cerrado && /Cómo empezar|empezar/i.test(r.txt), JSON.stringify(r)); assert.ok(r.abierto && r.alto >= 44, JSON.stringify(r));
  assert.ok(r.plegado && r.cap === 3, JSON.stringify(r));
  await page.close();
});

await caso('Tour: 48 pasos con título y texto en los tres idiomas, ningún texto sin traducir', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(() => {
    const mal = [];
    TOUR_STEPS.forEach((s, i) => ['es','ca','en'].forEach(l => {
      [s.titleKey, s.descKey].forEach(k => { const v = I18N[l][k]; if(!v || v === k) mal.push(`${l}:${k}`); else if(l !== 'es' && v === I18N.es[k] && !/^(TPV|Stock|Menús)/.test(v)) mal.push(`${l}:${k} igual que el castellano`); });
    }));
    return {mal, n: TOUR_STEPS.length};
  });
  assert.deepEqual(r.mal, [], r.mal.join(' | ')); assert.ok(r.n >= 46, 'pasos: ' + r.n);
  await page.close();
});

await caso('Tour: de punta a punta con el teclado, con el foco sobre algo real en cada pantalla y la burbuja siempre entera (1280 y 390)', async () => {
  for(const [w, h] of [[1280,800],[390,844]]){
    const {page, errs} = await abrir(w, h);
    await page.evaluate(() => { DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4}); saveDB(); startAppTour(); });
    const total = await page.evaluate(() => TOUR_STEPS.length);
    const mal = [];
    for(let i = 0; i < total; i++){
      await new Promise(r => setTimeout(r, i === 0 ? 800 : 950));
      const s = await page.evaluate(() => {
        const b = document.getElementById('tour-bubble'); const q = b.getBoundingClientRect(); const sp = document.getElementById('tour-spotlight');
        return {titulo: b.querySelector('h3').textContent.trim(), fuera: q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1, conFoco: !sp.classList.contains('no-target'), paso: tourStepIndex, finale: !!TOUR_STEPS[tourStepIndex].finale, sinObjetivo: !TOUR_STEPS[tourStepIndex].target && !TOUR_STEPS[tourStepIndex].view && !TOUR_STEPS[tourStepIndex].folder && !TOUR_STEPS[tourStepIndex].screen};
      });
      if(s.fuera) mal.push(`paso ${i + 1} «${s.titulo}»: la burbuja se sale de la pantalla`);
      if(!s.conFoco && !s.finale && !s.sinObjetivo && !(w < 500 && /logo/i.test(s.titulo))) mal.push(`paso ${i + 1} «${s.titulo}»: sin foco sobre nada`);
      if(s.paso !== i) mal.push(`paso ${i + 1}: el índice va por ${s.paso}`);
      if(i < total - 1) await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.press('ArrowLeft'); await new Promise(r => setTimeout(r, 200));
    const atras = await page.evaluate(() => tourStepIndex);
    await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 300));
    const fin = await page.evaluate(() => ({burbuja: !!document.getElementById('tour-bubble'), visto: DB.business.tourSeen}));
    assert.deepEqual(mal, [], `${w}px: ` + mal.slice(0, 8).join(' | '));
    assert.equal(atras, total - 2, 'la flecha izquierda retrocede');
    assert.ok(!fin.burbuja && fin.visto, 'Escape cierra el tour y lo da por visto');
    assert.deepEqual(errs, [], errs.join(' | '));
    await page.close();
  }
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ todos los casos pasaron');
await browser.close();
