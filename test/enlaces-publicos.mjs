// Los enlaces de la web pública, los tres que reparte un negocio.
//
// El QR y el enlace corto son lo que el cliente final tiene en la mano. Si
// fallan, el hostelero se entera cuando alguien no puede reservar — nunca
// antes. Aquí se comprueba que los tres formatos ARRANCAN sin errores de
// JavaScript, que es justo lo que se coló al refactorizar el arranque:
// "slug is not defined", y solo con enlaces cortos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

// Los tres caminos de entrada. El corto llega por 404.html (así lo sirve el
// hosting), y por eso hay que probarlo pidiendo ESE fichero.
const CAMINOS = [
  ['enlace largo con el negocio', '/reservagastrogoan.html?neg=ABCD1234'],
  ['enlace corto con nombre', '/reservagastrogoan.html?n=pruebaapp'],
  ['sin nada: tiene que avisar bien', '/reservagastrogoan.html'],
];

for(const [nombre, ruta] of CAMINOS){
  await caso(nombre, async ()=>{
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    // Sin red hacia Firebase: aquí se prueba el ARRANQUE, no la nube.
    await page.setRequestInterception(true);
    page.on('request', r => {
      const u = r.url();
      // Se corta la BASE DE DATOS, no el SDK: sin el SDK cargado el fallo
      // sería "firebase is not defined" y taparía lo que se quiere medir.
      if(/firebaseio\.com|firebasedatabase\.app|identitytoolkit/.test(u)) r.abort();
      else r.continue();
    });
    await page.goto('http://localhost:8950' + ruta, {waitUntil:'domcontentloaded'});
    await new Promise(r => setTimeout(r, 1800));
    const info = await page.evaluate(()=>{
      const det = document.querySelector('.error-box details');
      return {
        pintado: !!document.getElementById('app').innerHTML.trim(),
        detalle: det ? det.textContent : '',
      };
    });
    await page.close();
    // Los errores de red son esperables (se ha cortado Firebase a propósito)
    const reales = errs.filter(e => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(e));
    assert.deepEqual(reales, [], 'errores de JavaScript: ' + reales.join(' | '));
    /* Solo se vigilan NUESTRAS variables. Que falte `firebase` es normal
       aquí: la prueba corre sin red y el SDK viene de un CDN. Lo que no puede
       pasar nunca es que a nuestro propio código se le escape una variable
       fuera de alcance, como pasó con `slug`. */
    const fuera = (info.detalle.match(/\b(slug|publicId|config|db|detalleTecnico|appPlataforma|PLATAFORMA_REST) is not defined/g) || []);
    assert.deepEqual(fuera, [], 'variables nuestras fuera de alcance: ' + fuera.join(', ') + ' · ' + info.detalle);
    assert.ok(info.pintado, 'la página tiene que pintar algo, aunque sea el aviso');
    return 'arranca sin errores';
  });
}

await caso('El arranque recibe el nombre corto por parámetro', async ()=>{
  const fs = await import('node:fs');
  const s = fs.readFileSync('reservagastrogoan.html','utf8');
  assert.ok(/async function arrancarConLaNubeDelNegocio\(slug\)/.test(s),
    'tiene que recibirlo, no confiar en una variable global que no existe');
  assert.ok(/arrancarConLaNubeDelNegocio\(slug\)/.test(s), 'y pasárselo al llamar');
  return 'sin variables fuera de alcance';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
