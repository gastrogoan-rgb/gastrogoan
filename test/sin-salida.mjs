// Callejones sin salida del alta.
//
// El dueño se lo encontró dando de alta a un cliente: una cuenta recién
// creada aterriza en "Selecciona tu negocio" con la lista vacía y NINGUNA
// forma de volver — ni aspa, ni "atrás", ni cambiar de cuenta. Quien entraba
// con la cuenta equivocada solo podía salir recargando la página, y eso, en
// el momento de vender, es un cliente mirándote.
//
// Esta prueba recorre las pantallas por las que pasa un cliente nuevo y
// exige que TODAS tengan una salida visible y pulsable.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

// Una salida es un botón visible, de 44px, que lleva de vuelta a algún sitio.
const SALIDA = `(caja) => {
  const rx = /salir|volver|atr[áa]s|cancelar|negocios|cerrar|×|&times;/i;
  return [...caja.querySelectorAll('button, a')].filter(b => {
    const r = b.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return false;
    const txt = (b.textContent||'') + ' ' + (b.title||'') + ' ' + (b.className||'');
    return rx.test(txt) || /exitToAccessScreen|exitSetupGateToLogin|hideBusinessSelectScreen|backToBusinessSelector/.test(b.getAttribute('onclick')||'');
  });
}`;

await caso('Una cuenta nueva, sin ningún negocio, puede salir', async ()=>{
  await page.evaluate((buscar)=>{
    const salidas = eval('(' + buscar + ')');
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'cuentanueva', authKey:'x', pinHash:'H2:x'}));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    saveBusinessSlots([{id:'b1', name:'Mi negocio', ownerId: ggOwnerId('cuentanueva')}]);
    showBusinessSelectScreen();
  }, SALIDA);
  await new Promise(r2=>setTimeout(r2, 600));   // que termine la animación de entrada
  const r = await page.evaluate((buscar)=>{
    const salidas = eval('(' + buscar + ')');
    const caja = document.getElementById('business-select-screen') || document.body;
    const encontradas = salidas(caja).map(b => (b.textContent||'').trim().slice(0,40));
    const alto = salidas(caja).map(b => b.getBoundingClientRect().height);
    return {vacia: !ownerHasAnyBusiness(), encontradas, alto, html: salidas(caja).map(b=>{const cs=getComputedStyle(b);return {mh:cs.minHeight, h:cs.height, pt:cs.paddingTop, fs:cs.fontSize, box:cs.boxSizing, disp:cs.display, ancestro:getComputedStyle(b.parentElement).display};}),
            hayFuncion: typeof exitToAccessScreen === 'function'};
  }, SALIDA);
  assert.ok(r.vacia, 'la cuenta debe estar sin negocios para que valga la prueba');
  assert.ok(r.hayFuncion, 'debe existir la salida');
  assert.ok(r.encontradas.length > 0, 'la pantalla vacía DEBE tener una salida visible');
  assert.ok(r.alto.every(h => h >= 44), `la salida debe cumplir el objetivo táctil de 44 px: ${r.alto.join(', ')}`);
  return `salida: "${r.encontradas[0]}"`;
});

await caso('La salida devuelve de verdad a la pantalla de acceso', async ()=>{
  const r = await page.evaluate(()=>{
    exitToAccessScreen();
    const sel = document.getElementById('business-select-screen');
    const acc = document.getElementById('access-select-screen');
    return {
      selectorCerrado: !sel || sel.classList.contains('hide') || sel.offsetParent === null,
      accesoVisible: !!acc && !acc.classList.contains('hide'),
      sesionCerrada: !localStorage.getItem('gastrogoan_access_session'),
      // Salir NO puede borrar los negocios del aparato
      slots: getBusinessSlots().length,
    };
  });
  assert.ok(r.selectorCerrado, 'el selector debe cerrarse');
  assert.ok(r.accesoVisible, 'y verse la pantalla de acceso');
  assert.ok(r.sesionCerrada, 'la sesión se cierra');
  assert.equal(r.slots, 1, 'pero no se borra ningún negocio');
  return 'vuelve al acceso sin perder nada';
});

await caso('La pantalla de canjear el código tiene salida', async ()=>{
  const r = await page.evaluate((buscar)=>{
    const salidas = eval('(' + buscar + ')');
    showActivationGate();
    const g = document.getElementById('license-gate');
    const encontradas = salidas(g).map(b => ({t:(b.textContent||'').trim().slice(0,30), h:b.getBoundingClientRect().height}));
    const out = {hay: encontradas.length > 0, encontradas};
    hideActivationGate();
    return out;
  }, SALIDA);
  assert.ok(r.hay, 'el gate de licencia debe tener botón de volver');
  assert.ok(r.encontradas.every(b => b.h >= 44), `objetivo táctil: ${JSON.stringify(r.encontradas)}`);
  return `salida: "${r.encontradas[0].t}"`;
});

await caso('Ningún error de JavaScript en todo el recorrido', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
