// El código de negocio del acceso de empleado (8 caracteres al azar) no
// hay quien se lo aprenda de memoria. Ahora se recuerda en ESTE
// dispositivo (localStorage, no es dato del negocio) y el campo lleva un
// <datalist> con los últimos usados — pero sin rellenarlo ni preseleccionar
// ninguno solo, el empleado tiene que abrirlo y elegir (9/09).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
}, 'RECORDCODE1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Sin códigos usados antes, el campo está vacío y sin ningún desplegable con opciones', async () => {
  const r = await page.evaluate(()=>{
    localStorage.removeItem('gastrogoan_recent_emp_codes');
    setAccessScreenMode('employee');
    const input = document.getElementById('acc-emp-code');
    const list = document.getElementById(input.getAttribute('list'));
    return {valor: input.value, opciones: list ? list.querySelectorAll('option').length : -1};
  });
  assert.equal(r.valor, '', 'el campo no debe venir relleno: ' + JSON.stringify(r));
  assert.equal(r.opciones, 0, 'sin códigos recordados aún no debe haber opciones: ' + JSON.stringify(r));
});

await caso('rememberBusinessCode guarda el código pero NO lo mete en el campo ni lo preselecciona', async () => {
  const r = await page.evaluate(()=>{
    rememberBusinessCode('ABCD1234');
    setAccessScreenMode('owner');
    setAccessScreenMode('employee');
    const input = document.getElementById('acc-emp-code');
    const list = document.getElementById(input.getAttribute('list'));
    const opciones = [...list.querySelectorAll('option')].map(o => o.value);
    return {valorCampo: input.value, opciones};
  });
  assert.equal(r.valorCampo, '', 'el campo debe seguir vacío, sin autoseleccionar el único código guardado: ' + JSON.stringify(r));
  assert.deepEqual(r.opciones, ['ABCD1234'], 'el código recordado debe aparecer como opción del desplegable: ' + JSON.stringify(r));
});

await caso('Varios códigos: el más reciente va primero y no se duplica si se repite', async () => {
  const r = await page.evaluate(()=>{
    localStorage.removeItem('gastrogoan_recent_emp_codes');
    rememberBusinessCode('AAAA1111');
    rememberBusinessCode('BBBB2222');
    rememberBusinessCode('AAAA1111'); // reusar uno ya guardado no debe duplicarlo, y sube al principio
    return getRecentBusinessCodes();
  });
  assert.deepEqual(r, ['AAAA1111', 'BBBB2222'], 'orden por uso más reciente, sin duplicados: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
