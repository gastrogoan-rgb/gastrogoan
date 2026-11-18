// BUSCADORES CON LUPA (18/11, vídeo del dueño en un Android de 360 px): «Buscar artículo» pintaba el texto ENCIMA de la lupa.
// Causa: la regla de móvil de toda la app fija `padding:6px 9px !important` a cada input y se comía el `padding-left` que deja sitio al icono.
// Arreglo único (final de css/styles.css): cualquier input cuyo hermano directo es una lupa lleva su hueco, sea cual sea el contenedor.
// Esta prueba recorre las pantallas con buscador en los cinco anchos de móvil y en tablet y exige que el texto del campo empiece
// a la derecha de la lupa y que la lupa esté dentro del campo. Cualquier buscador NUEVO con lupa queda vigilado sin tocar nada.
import puppeteer from 'puppeteer-core';
const ESTADOS = [
  ['carta', "currentFolder='cocina'; navigate('carta')"],
  ['carta-menus', "currentFolder='cocina'; navigate('carta')", ['Menús']],
  ['pedidos-realizar', "navigate('pedidos'); selectOrderSupplier((DB.providers[0]||{}).nombre)"],
  ['tpv-mesa', "currentFolder='sala'; navigate('tpv'); openTableOrder((DB.tables[0]||{}).id)"],
  ['selector-negocios', "try{ showBusinessSelectScreen(); }catch(e){}"],
  ['megalista', "navigate('megalista')"],
  ['stock', "navigate('stock')"],
  ['proveedores', "navigate('proveedores')"],
  ['clientes', "navigate('clientes')"],
  ['pedidos-hist', "navigate('pedidos')", ['Historial de Pedidos']],
  ['icono-oferta', "navigate('carta'); try{ openIconoSelector && 0; }catch(e){}"],
];
const ANCHOS = [[320,568],[360,800],[390,844],[412,915],[430,932],[768,1024],[1280,800]];
const w = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const fallos = []; let vistos = 0;
for(const [W,H] of ANCHOS){
  const page = await browser.newPage(); await page.setViewport({width:W,height:H,isMobile:W < 700,hasTouch:W < 700,deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(2500);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => { localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d); }, datos);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await w(1200);
  await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session'); });
  for(const [n, js, clics] of ESTADOS){
    try{ await page.evaluate(js); }catch(e){}
    await w(650);
    for(const txt of (clics || [])){ await page.evaluate(t => { const b = [...document.querySelectorAll('button,a,[role=tab]')].find(x => x.getClientRects().length && x.innerText.replace(/\s+/g,' ').includes(t)); if(b) b.click(); }, txt); await w(450); }
    const r = await page.evaluate(() => {
      const malos = []; let vistos = 0;
      document.querySelectorAll('input').forEach(inp => {
        if(!inp.getClientRects().length || ['checkbox','radio','hidden','file','range','color'].includes(inp.type)) return;
        const lupa = [...(inp.parentElement ? inp.parentElement.children : [])].find(c => c !== inp && c.classList && c.classList.contains('ti-search') && c.getClientRects().length);
        if(!lupa) return;
        vistos++;
        const ri = inp.getBoundingClientRect(), rl = lupa.getBoundingClientRect(), cs = getComputedStyle(inp);
        const inicioTexto = ri.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
        const etiqueta = (inp.id || inp.placeholder || inp.className).toString().slice(0, 30);
        if(rl.right > inicioTexto + 0.5) malos.push(etiqueta + ': la lupa acaba en ' + Math.round(rl.right) + ' y el texto empieza en ' + Math.round(inicioTexto));
        else if(rl.left < ri.left - 0.5 || rl.right > ri.right + 0.5 || rl.top < ri.top - 1 || rl.bottom > ri.bottom + 1) malos.push(etiqueta + ': la lupa se sale del campo');
      });
      return {malos, vistos};
    });
    vistos += r.vistos;
    r.malos.forEach(m => fallos.push(`${n} @ ${W}px · ${m}`));
    try{ await page.evaluate(() => { try{ closeModal(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} }); }catch(e){}
  }
  await page.close();
}
await browser.close();
if(vistos < 7){ console.log('❌ la prueba apenas vio buscadores con lupa (' + vistos + '): ¿cambió el marcado?'); process.exit(1); }
if(fallos.length){ console.log('❌ ' + fallos.length + ' buscador(es) con el texto sobre la lupa'); [...new Set(fallos)].slice(0, 30).forEach(f => console.log('  ▸ ' + f)); process.exit(1); }
console.log('✅ ' + vistos + ' buscadores con lupa en 7 anchos: el texto siempre empieza a la derecha del icono');
