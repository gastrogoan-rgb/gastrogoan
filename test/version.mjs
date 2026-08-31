// El aviso de versión nueva y el ahorro de tráfico.
//
// El plan gratuito de Render trae 5 GB de tráfico al mes y la app pesa 4 MB.
// Con el service worker pidiendo el documento entero en cada apertura, UN
// solo negocio abriéndola 20 veces al día se comía 2,4 GB: dos clientes y se
// acababa el cupo para todos. Ahora se sirve la copia guardada y solo se
// pregunta por version.json, que son 50 bytes.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

await caso('build.sh publica el sello suelto, y coincide con el de dentro', async ()=>{
  assert.ok(fs.existsSync('dist/version.json'), 'debe generarse dist/version.json');
  const j = JSON.parse(fs.readFileSync('dist/version.json','utf8'));
  const html = fs.readFileSync('dist/index.html','utf8');
  const dentro = (html.match(/GG_BUILD = '([^']+)'/)||[])[1];
  assert.ok(j.build, 'version.json debe traer el sello');
  assert.equal(j.build, dentro, 'el sello suelto y el de dentro de la app tienen que ser el MISMO');
  const bytes = fs.statSync('dist/version.json').size;
  assert.ok(bytes < 200, `version.json debe ser minúsculo, son ${bytes} bytes`);
  return `${bytes} bytes frente a los ${(fs.statSync('dist/index.html').size/1048576).toFixed(1)} MB de la app`;
});

await caso('El service worker sirve la copia guardada, no vuelve a bajar la app', async ()=>{
  const sw = fs.readFileSync('sw.js','utf8');
  assert.ok(/caches\.match\(SHELL_URL\)\.then\(cached => cached \|\| fetch/.test(sw),
    'el documento tiene que salir de caché primero');
  assert.ok(/version\.json/.test(sw), 'y el sello nunca de caché');
  assert.ok(/gg-actualizar/.test(sw), 'con una vía para traerse la versión nueva a petición');
  return 'caché primero, con salida para actualizar';
});

await caso('El deploy lleva el sello suelto a la carpeta que publica Render', async ()=>{
  const sh = fs.readFileSync('deploy/actualizar.sh','utf8');
  assert.ok(/version\.json/.test(sh), 'deploy/actualizar.sh debe copiar version.json');
  return 'copiado junto al index y el sw';
});

const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
// El sello lo inyecta build.sh al compilar, así que la versión de desarrollo
// que sirve esta prueba no lo trae. Se pone a mano para poder comparar.
await page.evaluate(()=>{ window.GG_BUILD = '01/01/2026 00:00'; });

await caso('Si hay versión nueva, avisa — y no recarga por su cuenta', async ()=>{
  const r = await page.evaluate(async ()=>{
    let recargado = false;
    const originalFetch = window.fetch;
    window.fetch = async (u) => {
      if(String(u).includes('version.json')) return {ok:true, json: async () => ({build: 'OTRA VERSION'})};
      return originalFetch(u);
    };
    localStorage.removeItem('gastrogoan_version_comprobada');
    await comprobarVersionPublicada(true);
    const barra = document.getElementById('gg-version-nueva');
    const texto = barra ? barra.textContent : '';
    const botones = barra ? [...barra.querySelectorAll('button')] : [];
    const alto = botones.map(b => b.getBoundingClientRect().height);
    // "Más tarde" tiene que quitarlo de en medio sin tocar nada
    botones[1].click();
    const trasMasTarde = !!document.getElementById('gg-version-nueva');
    window.fetch = originalFetch;
    return {hayBarra: !!barra, texto, cuantosBotones: botones.length, alto, trasMasTarde, recargado};
  });
  assert.ok(r.hayBarra, 'debe salir el aviso');
  assert.ok(/OTRA VERSION/.test(r.texto), 'con la fecha de la versión nueva');
  assert.equal(r.cuantosBotones, 2, 'actualizar y más tarde');
  assert.ok(r.alto.every(h => h >= 44), `objetivo táctil: ${r.alto.join(', ')}`);
  assert.ok(!r.trasMasTarde, '"Más tarde" debe cerrarlo');
  assert.ok(!r.recargado, 'y nunca puede recargar sin permiso: podría cortar una comanda a medias');
  return 'avisa, con sus dos botones, y decide el hostelero';
});

await caso('Si la versión es la misma, no molesta con nada', async ()=>{
  const r = await page.evaluate(async ()=>{
    const originalFetch = window.fetch;
    window.fetch = async (u) => {
      if(String(u).includes('version.json')) return {ok:true, json: async () => ({build: window.GG_BUILD})};
      return originalFetch(u);
    };
    localStorage.removeItem('gastrogoan_version_comprobada');
    await comprobarVersionPublicada(true);
    const hay = !!document.getElementById('gg-version-nueva');
    window.fetch = originalFetch;
    return {hay};
  });
  assert.ok(!r.hay, 'con la misma versión no debe salir ningún aviso');
  return 'silencio cuando todo está al día';
});

await caso('Sin conexión no da la lata ni cuenta un error', async ()=>{
  const r = await page.evaluate(async ()=>{
    const originalFetch = window.fetch;
    window.fetch = async () => { throw new Error('sin red'); };
    localStorage.removeItem('gastrogoan_version_comprobada');
    let roto = null;
    try{ await comprobarVersionPublicada(true); }catch(e){ roto = e.message; }
    window.fetch = originalFetch;
    return {roto, hay: !!document.getElementById('gg-version-nueva')};
  });
  assert.equal(r.roto, null, 'no puede reventar por no tener red');
  assert.ok(!r.hay, 'ni inventarse una versión nueva');
  return 'calla y se mira otro día';
});

await caso('No pregunta en cada apertura: como mucho, cada 6 horas', async ()=>{
  const r = await page.evaluate(async ()=>{
    let llamadas = 0;
    const originalFetch = window.fetch;
    window.fetch = async (u) => {
      if(String(u).includes('version.json')){ llamadas++; return {ok:true, json: async () => ({build: window.GG_BUILD})}; }
      return originalFetch(u);
    };
    localStorage.removeItem('gastrogoan_version_comprobada');
    await comprobarVersionPublicada();   // primera: pregunta
    await comprobarVersionPublicada();   // segunda seguida: no
    await comprobarVersionPublicada();
    window.fetch = originalFetch;
    return {llamadas, espera: GG_ESPERA_ENTRE_COMPROBACIONES};
  });
  assert.equal(r.llamadas, 1, 'tres aperturas seguidas, una sola pregunta');
  assert.equal(r.espera, 6*60*60*1000);
  return 'una comprobación cada 6 h';
});

await caso('El sello de versión se ve en la pantalla de inicio', async ()=>{
  // Estaba escondido dentro de los ajustes del asistente de I+D, y es el dato
  // que hay que mirar cada vez que se publica algo. El dueño no lo encontró.
  const r = await page.evaluate(()=>{
    window.GG_BUILD = '01/09/2026 01:17';
    navigate('home');
    renderHome();
    const el = document.getElementById('home-version');
    return {existe: !!el, texto: el ? el.textContent.trim() : '',
            visible: el ? el.getBoundingClientRect().height > 0 : false};
  });
  assert.ok(r.existe, 'debe haber un sitio para el sello en el inicio');
  assert.ok(/01\/09\/2026 01:17/.test(r.texto), 'con la fecha de la versión: ' + r.texto);
  assert.ok(r.visible, 'y verse');
  return `"${r.texto}"`;
});

await caso('El botón "Actualizar" fuerza la comprobación, sin esperar 6 horas', async ()=>{
  /* Sin esto no había forma de forzarlo: un dispositivo que ya había mirado
     se quedaba con la versión vieja hasta seis horas después, y nadie podía
     hacer nada. Justo lo que pasó al probar en Cloudflare. */
  const r = await page.evaluate(async ()=>{
    window.GG_BUILD = '01/01/2026 00:00';
    let llamadas = 0;
    const originalFetch = window.fetch;
    window.fetch = async (u) => {
      if(String(u).includes('version.json')){ llamadas++; return {ok:true, json: async () => ({build:'VERSION NUEVA'})}; }
      return originalFetch(u);
    };
    // Se marca como "ya comprobado hace un momento": el ciclo normal callaría
    localStorage.setItem('gastrogoan_version_comprobada', String(Date.now()));
    const barraAntes = !!document.getElementById('gg-version-nueva');
    await comprobarVersionPublicada();          // el ciclo normal: no debe preguntar
    const trasCiclo = llamadas;
    await manualRefresh();                      // el botón: sí debe
    await new Promise(r2=>setTimeout(r2, 80));
    const barra = document.getElementById('gg-version-nueva');
    const texto = barra ? barra.textContent : '';
    if(barra) barra.remove();
    window.fetch = originalFetch;
    return {barraAntes, trasCiclo, llamadas, hayBarra: !!barra, texto};
  });
  assert.ok(!r.barraAntes, 'no debía haber aviso de partida');
  assert.equal(r.trasCiclo, 0, 'el ciclo normal respeta las 6 horas');
  assert.equal(r.llamadas, 1, 'pero el botón Actualizar comprueba igualmente');
  assert.ok(r.hayBarra && /VERSION NUEVA/.test(r.texto), 'y avisa de la versión nueva');
  return 'el botón manda sobre el temporizador';
});

await caso('Ningún error de JavaScript en todo el recorrido', async ()=>{
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|sin red/i.test(e));
  assert.deepEqual(reales, [], reales.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
