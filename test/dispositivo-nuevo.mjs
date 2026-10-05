// Entrar como propietario en un MÓVIL NUEVO (1/10) — hallazgo real: una
// cuenta que ya tenía negocios se encontraba pidiendo activar una licencia
// nueva, en vez de ver su lista de siempre. La causa: showNetlifySetupGate,
// en el camino "ya estamos servidos desde una URL real" (que es SIEMPRE el
// camino en producción, nunca en local), miraba getLicense() directamente
// sin comprobar antes si la CUENTA ya tenía negocios en la nube — saltaba a
// "activa tu licencia" antes incluso de que syncOwnerBusinessList tuviera
// la oportunidad de traérselos. Su hermana, confirmNetlifyDone, sí hacía
// bien el orden: ownerHasAnyBusiness() siempre antes que getLicense().
//
// Para probarlo de verdad hace falta que location.hostname NO sea
// localhost (si no, ni siquiera se entra en ese camino) — se resuelve un
// dominio falso a 127.0.0.1 con una regla de Chrome, sin tocar la red.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox','--host-resolver-rules=MAP app.gastrogoan.test 127.0.0.1'],
  headless:true
});
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://app.gastrogoan.test:8950/index.html',{waitUntil:'domcontentloaded'});

let ok=0, fallos=0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

await caso('Entrar en un móvil nuevo con una cuenta que ya tiene negocios en la nube: ve su lista, no "activa tu licencia"', async () => {
  const r = await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'casapaco', authKey:'FAKEAUTHKEY123', pinHash:'H2:x'}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    // La cuenta YA TIENE un negocio dado de alta, visto desde la nube
    // compartida — lo que syncOwnerBusinessList debería traerse.
    window.getPlatformFirebaseApp = () => Promise.resolve({
      database: () => ({
        ref: (path) => ({
          once: () => path.includes('/businesses')
            ? Promise.resolve({ val: () => ({ TENANT123: { code: 'ABCD1234', name: 'Casa Paco' } }) })
            : Promise.resolve({ val: () => null, exists: () => false })
        })
      })
    });
    enterAsOwner();
    await new Promise(res => setTimeout(res, 800));
    return {
      pidioLicencia: !!document.getElementById('license-gate'),
      selectorVisible: !document.getElementById('business-select-screen').classList.contains('hide'),
      negocios: getBusinessSlots().filter(s => s.code).map(s => s.name),
    };
  });
  assert.ok(!r.pidioLicencia, 'en un móvil nuevo, una cuenta con negocios ya dados de alta no debería pedir activar una licencia');
  assert.ok(r.selectorVisible, 'debería verse el selector de negocios, con la lista de la cuenta');
  assert.deepEqual(r.negocios, ['Casa Paco'], 'el negocio de la nube no llegó a la lista local: '+JSON.stringify(r.negocios));
});

await caso('Cuenta recién creada, sin ningún negocio todavía: ahí SÍ toca el selector vacío con el botón de canjear', async () => {
  const r = await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'cuentanueva', authKey:'FAKEAUTHKEY456', pinHash:'H2:x'}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    window.getPlatformFirebaseApp = () => Promise.resolve({
      database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null, exists: () => false }) }) })
    });
    enterAsOwner();
    await new Promise(res => setTimeout(res, 800));
    return {
      pidioLicencia: !!document.getElementById('license-gate'),
      selectorVisible: !document.getElementById('business-select-screen').classList.contains('hide'),
    };
  });
  assert.ok(!r.pidioLicencia, 'una cuenta de verdad sin negocios no debería pedir una licencia directamente, sino pasar por el selector vacío');
  assert.ok(r.selectorVisible, 'debería verse el selector (vacío, con el botón de canjear), no saltar directo a otro sitio');
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
