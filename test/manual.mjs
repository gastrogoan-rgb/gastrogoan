// Manual de uso + tour guiado: temas en tres idiomas, portada de cinco botones → temas del grupo → lectura (8/11), buscador que marca
// lo encontrado, saltos a cada apartado, anterior/siguiente dentro del grupo y el tour de punta a punta con teclado SIN tapar lo que explica.
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
    manualArea = null; manualSearch = ''; manualChapter = -1;
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

await caso('Buscar lista los temas que lo contienen (de cualquier grupo) y MARCA lo encontrado dentro del texto; sin resultados lo dice', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    setManualSearch('stripe'); await esp(200);
    out.filtrados = document.querySelectorAll('.mnl-tema').length;
    out.conArea = !!document.querySelector('.mnl-tema em');
    document.querySelector('.mnl-tema').click(); await esp(250);
    out.marcas = document.querySelectorAll('.mnl-cuerpo mark.mnl-hl').length; out.marcaTxt = (document.querySelector('mark.mnl-hl') || {}).textContent;
    setManualSearch('qwertyzzz'); await esp(200);
    out.vacio = !!document.querySelector('#manual-indice .empty') && document.querySelectorAll('.mnl-tema').length === 0;
    setManualSearch('TPV'); await esp(100);   // sin distinguir mayúsculas
    out.mayus = document.querySelectorAll('.mnl-tema').length;
    setManualSearch(''); await esp(100);
    out.vuelta = document.querySelectorAll('.mnl-area').length;
    return out;
  });
  assert.ok(r.filtrados > 0 && r.filtrados < 25 && r.conArea, JSON.stringify(r)); assert.ok(r.marcas >= 1 && /stripe/i.test(r.marcaTxt), JSON.stringify(r));
  assert.ok(r.vacio, JSON.stringify(r)); assert.ok(r.mayus >= 1, JSON.stringify(r)); assert.equal(r.vuelta, 5, 'al borrar la búsqueda vuelve la portada: ' + JSON.stringify(r));
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

await caso('Portada: al entrar solo se ven los CINCO botones (Empezar, Cocina, Sala, Gestión, Ayuda); ningún tema ni texto, en PC y móvil', async () => {
  for(const [w, h] of [[1280,800],[390,844],[320,640]]){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(() => {
      const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().height > 0);
      const botones = vis('.mnl-area');
      return {n: botones.length, nombres: botones.map(b => b.querySelector('b').textContent.trim()), temas: vis('.mnl-tema').length, cuerpo: vis('.mnl-cuerpo').length,
        altos: botones.map(b => Math.round(b.getBoundingClientRect().height)), sw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cuenta: botones.map(b => b.querySelector('.mnl-area-n').textContent.trim()), tour: vis('#manual-tour').length};
    });
    assert.equal(r.n, 5, w + ': ' + JSON.stringify(r)); assert.deepEqual(r.nombres, ['Empezar', 'Cocina', 'Sala', 'Gestión', 'Ayuda']);
    assert.equal(r.temas, 0, 'sin temas a la vista'); assert.equal(r.cuerpo, 0, 'sin texto a la vista');
    assert.ok(r.altos.every(a => a >= 64) && r.sw <= 1, JSON.stringify(r)); assert.ok(r.cuenta.every(c => /\d+ temas?/.test(c)), JSON.stringify(r.cuenta));
    await page.close();
  }
});

await caso('Navegar: grupo → sus temas → leer; «atrás» sube un nivel; al volver a entrar al manual sale la portada; openManualAt abre directo', async () => {
  for(const [w, h] of [[1280,800],[390,844]]){
    const {page, errs} = await abrir(w, h);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms));
      const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().height > 0);
      const out = {};
      const areaSala = [...document.querySelectorAll('.mnl-area')].find(b => /Sala/.test(b.textContent));
      areaSala.click(); await esp(250);
      out.temas = vis('.mnl-tema').length; out.esperados = MANUAL_CHAPTERS.filter(c => c.area === 'sala').length;
      out.titulosOk = vis('.mnl-tema b').every(b => b.textContent.trim().length > 2) && vis('.mnl-tema small').every(b => b.textContent.trim().length > 10);
      out.sinPortada = vis('.mnl-area').length; out.sinTexto = vis('.mnl-cuerpo').length; out.cabecera = (document.querySelector('.mnl-grupo-cab h2') || {}).textContent;
      vis('.mnl-tema').find(b => /TPV/.test(b.textContent)).click(); await esp(300);
      out.leyendo = vis('.mnl-cuerpo').length; out.titulo = (document.querySelector('.mnl-cab-tit') || {}).textContent;
      out.sinTemas = vis('.mnl-tema').length;
      document.querySelector('.mnl-atras').click(); await esp(250);          // sube al grupo
      out.enGrupo = vis('.mnl-tema').length;
      document.querySelector('.mnl-atras').click(); await esp(250);          // sube a la portada
      out.enPortada = vis('.mnl-area').length;
      // salir del manual y volver: portada otra vez
      document.querySelectorAll('.mnl-area')[1].click(); await esp(150);
      navigate('home'); await esp(200); navigate('manual'); await esp(300);
      out.reentrada = vis('.mnl-area').length + '/' + vis('.mnl-tema').length;
      // enlace directo
      openManualAt('reservas'); await esp(300);
      out.directo = (document.querySelector('.mnl-cab-tit') || {}).textContent;
      return out;
    }).catch(e => ({error: e.message}));
    assert.ok(!r.error, w + ': ' + r.error);
    assert.equal(r.temas, r.esperados, JSON.stringify(r)); assert.ok(r.titulosOk && r.sinPortada === 0 && r.sinTexto === 0 && /Sala/.test(r.cabecera), JSON.stringify(r));
    assert.ok(r.leyendo === 1 && /TPV/.test(r.titulo) && r.sinTemas === 0, JSON.stringify(r));
    assert.equal(r.enGrupo, r.esperados, JSON.stringify(r)); assert.equal(r.enPortada, 5, JSON.stringify(r));
    assert.equal(r.reentrada, '5/0', JSON.stringify(r)); assert.ok(/Reservas/.test(r.directo), JSON.stringify(r));
    assert.deepEqual(errs, [], errs.join(' | '));
    await page.close();
  }
});

await caso('Anterior / siguiente se quedan dentro del grupo (el primero y el último no tienen hueco que no exista)', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    for(const area of ['empezar', 'cocina', 'ayuda']){
      const idx = MANUAL_CHAPTERS.map((c, i) => ({c, i})).filter(x => x.c.area === area);
      goManualChapter(idx[0].i); await esp(120);
      out[area + '_primero'] = [!!document.querySelector('.mnl-pie .mnl-nav:not(.mnl-sig)'), !!document.querySelector('.mnl-sig')];
      goManualChapter(idx[idx.length - 1].i); await esp(120);
      out[area + '_ultimo'] = [!!document.querySelector('.mnl-pie .mnl-nav:not(.mnl-sig)'), !!document.querySelector('.mnl-sig')];
    }
    return out;
  });
  assert.deepEqual(r.empezar_primero, [false, false], JSON.stringify(r));   // un solo tema en «Empezar»
  assert.deepEqual(r.cocina_primero, [false, true], JSON.stringify(r)); assert.deepEqual(r.cocina_ultimo, [true, false], JSON.stringify(r));
  assert.deepEqual(r.ayuda_ultimo, [false, false], JSON.stringify(r));
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
        const f = sp.getBoundingClientRect(); const ix = Math.max(0, Math.min(q.right, f.right) - Math.max(q.left, f.left)), iy = Math.max(0, Math.min(q.bottom, f.bottom) - Math.max(q.top, f.top)); const solape = sp.classList.contains('no-target') ? 0 : Math.round(ix * iy);
        return {solape, foco: Math.round(f.width) + 'x' + Math.round(f.height), titulo: b.querySelector('h3').textContent.trim(), fuera: q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1, conFoco: !sp.classList.contains('no-target'), paso: tourStepIndex, finale: !!TOUR_STEPS[tourStepIndex].finale, sinObjetivo: !TOUR_STEPS[tourStepIndex].target && !TOUR_STEPS[tourStepIndex].view && !TOUR_STEPS[tourStepIndex].folder && !TOUR_STEPS[tourStepIndex].screen};
      });
      if(s.fuera) mal.push(`paso ${i + 1} «${s.titulo}»: la burbuja se sale de la pantalla`);
      if(s.solape > 40) mal.push(`paso ${i + 1} «${s.titulo}»: la burbuja TAPA lo que explica (${s.solape} px² de solape con el foco ${s.foco})`);
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
