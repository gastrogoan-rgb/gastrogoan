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

await caso('Si hay versión nueva a media faena, avisa y no recarga', async ()=>{
  const r = await page.evaluate(async ()=>{
    window.ggHuboInteraccion = true;   // ya está trabajando: no se le interrumpe
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
    window.ggHuboInteraccion = true;
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
    window.ggHuboInteraccion = true;
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
    window.ggHuboInteraccion = true;   // a media faena: debe preguntar, no recargar
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

await caso('El aviso se ve bien y no se pega al borde de la pantalla', async ()=>{
  // Pegado abajo del todo se mezclaba con la barra del navegador de la
  // tablet y quedaba aplastado.
  const tamanos = [[390,844,'móvil'], [820,1180,'tablet'], [1280,900,'escritorio']];
  const medidas = [];
  for(const [w,h,nombre] of tamanos){
    await page.setViewport({width:w, height:h});
    await page.evaluate((b)=>{
      document.getElementById('gg-version-nueva')?.remove();
      window.GG_BUILD = '01/01/2026 00:00';
      mostrarAvisoVersionNueva(b);
    }, '01/09/2026 02:23');
    await new Promise(r=>setTimeout(r, 120));
    const m = await page.evaluate(()=>{
      const b = document.getElementById('gg-version-nueva');
      const r = b.getBoundingClientRect();
      const botones = [...b.querySelectorAll('button')].map(x => x.getBoundingClientRect());
      return {
        alto: Math.round(r.height),
        huecoAbajo: Math.round(window.innerHeight - r.bottom),
        sobresale: r.right > window.innerWidth + 1 || r.left < -1,
        botonesOk: botones.every(x => x.height >= 44 && x.width > 60),
        botonesDentro: botones.every(x => x.right <= window.innerWidth + 1),
      };
    });
    medidas.push([nombre, m]);
  }
  await page.evaluate(()=>document.getElementById('gg-version-nueva')?.remove());
  medidas.forEach(([nombre, m]) => {
    assert.ok(m.huecoAbajo >= 8, `en ${nombre} debe quedar hueco bajo el aviso, hay ${m.huecoAbajo}px`);
    assert.ok(!m.sobresale, `en ${nombre} no puede salirse de la pantalla`);
    assert.ok(m.botonesOk, `en ${nombre} los botones deben cumplir el objetivo táctil`);
    assert.ok(m.botonesDentro, `en ${nombre} los botones deben caber`);
  });
  return medidas.map(([n,m]) => `${n} ${m.alto}px`).join(' · ');
});

await caso('Al abrir, si hay versión nueva se actualiza SOLA', async ()=>{
  /* No se deja recargar de verdad (el navegador no permite falsear
     location.reload y se llevaría por delante el resto de pruebas): se
     comprueba que DECIDE actualizar, que es lo mismo. */
  const r = await page.evaluate(async ()=>{
    document.getElementById('gg-version-nueva')?.remove();
    window.GG_BUILD = '01/01/2026 00:00';
    window.ggHuboInteraccion = false;
    let aplicado = null;
    const aplicarReal = window.aplicarVersionNueva;
    window.aplicarVersionNueva = (silencioso) => { aplicado = {silencioso}; };
    const originalFetch = window.fetch;
    window.fetch = async (u) => {
      if(String(u).includes('version.json')) return {ok:true, json: async () => ({build:'VERSION NUEVA'})};
      return originalFetch(u);
    };
    localStorage.removeItem('gastrogoan_version_comprobada');
    await comprobarVersionPublicada(true);
    const hayBarra = !!document.getElementById('gg-version-nueva');
    window.aplicarVersionNueva = aplicarReal;
    window.fetch = originalFetch;
    return {aplicado, hayBarra, seguro: esSeguroActualizarSolo()};
  });
  assert.ok(r.seguro, 'con la app recién abierta y nada tocado, debe considerarse seguro');
  assert.ok(r.aplicado, 'y actualizarse sola');
  assert.equal(r.aplicado.silencioso, true, 'en silencio, sin dar la lata');
  assert.ok(!r.hayBarra, 'sin sacar ninguna barra');
  return 'se actualiza sin que nadie pulse nada';
});

await caso('Pero NUNCA a media faena: ahí pregunta', async ()=>{
  const casos = await page.evaluate(async ()=>{
    const out = {};
    const originalFetch = window.fetch;
    const aplicarReal = window.aplicarVersionNueva;
    const probar = async (preparar, limpiar) => {
      document.getElementById('gg-version-nueva')?.remove();
      window.GG_BUILD = '01/01/2026 00:00';
      window.ggHuboInteraccion = false;
      let aplicado = false;
      window.aplicarVersionNueva = () => { aplicado = true; };
      window.fetch = async (u) => {
        if(String(u).includes('version.json')) return {ok:true, json: async () => ({build:'VERSION NUEVA'})};
        return originalFetch(u);
      };
      preparar();
      localStorage.removeItem('gastrogoan_version_comprobada');
      await comprobarVersionPublicada(true);
      const res = {aplicado, barra: !!document.getElementById('gg-version-nueva')};
      limpiar();
      document.getElementById('gg-version-nueva')?.remove();
      return res;
    };
    out.trasTocar = await probar(()=>{ window.ggHuboInteraccion = true; }, ()=>{});
    out.conModal = await probar(
      ()=>{ document.getElementById('modal-overlay').classList.add('active'); },
      ()=>{ document.getElementById('modal-overlay').classList.remove('active'); });
    out.conTexto = await probar(()=>{
      const i = document.createElement('input');
      i.id = '__prueba'; i.value = 'a medio escribir';
      i.style.cssText = 'position:fixed;top:0;left:0';
      document.body.appendChild(i);
    }, ()=>{ document.getElementById('__prueba')?.remove(); });
    out.enAlta = await probar(
      ()=>{ document.getElementById('business-select-screen').classList.remove('hide'); },
      ()=>{ document.getElementById('business-select-screen').classList.add('hide'); });
    window.aplicarVersionNueva = aplicarReal;
    window.fetch = originalFetch;
    return out;
  });
  Object.entries(casos).forEach(([nombre, c]) => {
    assert.ok(!c.aplicado, `${nombre}: NO puede recargar por su cuenta`);
    assert.ok(c.barra, `${nombre}: debe preguntar con la barra`);
  });
  return 'con algo tocado, un modal, texto sin guardar o el alta a medias: pregunta';
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
