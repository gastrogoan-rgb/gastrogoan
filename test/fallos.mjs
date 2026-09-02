// La sección de "informar de un fallo" del panel de ayuda.
//
// Lo que la hace útil no es el formulario: es que la app rellene sola el
// contexto técnico. "No me deja editar los empleados" costó una conversación
// entera de averiguar; con la pantalla, la versión y el modo de sesión
// delante, habría sido inmediato.
//
// Y lo que la hace ACEPTABLE es que no viaje ni un dato del negocio.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
const errs = [];
page.on('pageerror', e => errs.push(String(e.message)));
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});

await page.evaluate(async () => {
  await window.dbReadyPromise;
  const code = 'TESTTEST';
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true,
    categoryIconHintSeen:true, name:'Casa Paco', pin:'H2:SECRETO', cif:'B12345678'});
  DB.business.ownFirebase = {apiKey:'CLAVE_NUBE', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.business.verifactu = {enabled:true, apiKey:'CLAVE_FACTURACION'};
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  await saveDB();
});
await page.reload({waitUntil: 'domcontentloaded'});
await page.evaluate(() => window.dbReadyPromise);

let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

await caso('El formulario está en el panel de ayuda, en Contacto', async () => {
  const r = await page.evaluate(() => {
    toggleHelpPanel(); switchHelpTab('contacto');
    return {que: !!document.getElementById('bug-que-paso'),
            esperaba: !!document.getElementById('bug-que-esperaba'),
            visible: !!document.getElementById('help-tab-contacto').classList.contains('active')};
  });
  assert.ok(r.que && r.esperaba, 'faltan los campos del informe');
  assert.ok(r.visible, 'la pestaña de contacto no se abre');
  return 'dos campos, y el segundo es opcional';
});

await caso('La app rellena sola lo que hace falta para encontrar el fallo', async () => {
  const ctx = await page.evaluate(() => contextoParaInformeDeFallo());
  ['Pantalla:', 'Versión:', 'Sesión:', 'Nube:', 'Navegador:', 'Idioma:'].forEach(x =>
    assert.ok(ctx.includes(x), 'falta "' + x + '" en el contexto:\n' + ctx));
  return ctx.split('\n').length + ' datos, sin que el cliente escriba ninguno';
});

await caso('NO viaja ningún dato del negocio', async () => {
  /* Es lo que hace aceptable mandar esto por correo. Si un día se añade un
     campo al contexto y arrastra algo del negocio, esta prueba lo caza. */
  const ctx = await page.evaluate(() => contextoParaInformeDeFallo());
  ['H2:SECRETO', 'CLAVE_NUBE', 'CLAVE_FACTURACION', 'B12345678', 'TESTTEST']
    .forEach(x => assert.equal(ctx.includes(x), false, `el contexto lleva "${x}", que es del negocio`));
  return 'ni PIN, ni claves, ni código de licencia, ni CIF';
});

await caso('Sin contar qué ha pasado no se envía, y se dice por qué', async () => {
  // Un botón que no hace nada se lee como una app rota: aquí tiene que avisar.
  const r = await page.evaluate(() => {
    document.getElementById('bug-que-paso').value = '';
    let navego = false;
    const antes = window.location.href;
    enviarInformeDeFallo();
    navego = window.location.href !== antes;
    const toast = document.querySelector('.toast, #toast');
    return {navego, aviso: !!toast && !!(toast.textContent || '').trim()};
  });
  assert.equal(r.navego, false, 'no puede abrir el correo sin que cuente nada');
  assert.ok(r.aviso, 'y tiene que explicar por qué no se ha enviado');
  return 'avisa en vez de callarse';
});

await caso('Ningún error de JavaScript', async () => {
  const reales = errs.filter(e => !/Failed to fetch|NetworkError/i.test(e));
  assert.deepEqual(reales.slice(0,3), [], reales.slice(0,2).join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ los 5 casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
