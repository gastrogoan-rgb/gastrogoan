// Fichas de bebida (sala) — R16.
//
// La ficha de sala era la de cocina con otra etiqueta. Ahora el tipo de
// bebida decide qué campos se piden. Esto comprueba que el registro está
// bien formado, que el formulario se pinta, que lo escrito se guarda, que
// cambiar de tipo no pierde lo común ni arrastra lo que sobra, y que nada
// de esto rompe la ficha de cocina.
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
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'BEBIDA01',tenantId:ggBizTenantId('BEBIDA01')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  saveDB();
});

/* ─── El registro está bien formado ─── */
await caso('Todos los tipos de bebida están completos en los tres idiomas', async ()=>{
  const malos = await page.evaluate(()=>{
    const fallos=[];
    const revisaTxt=(obj,donde)=>{ ['es','ca','en'].forEach(l=>{ if(!obj||!obj[l]) fallos.push(`${donde}: falta ${l}`); }); };
    const claves=new Set();
    BEBIDA_TIPOS.forEach(tp=>{
      if(claves.has(tp.key)) fallos.push(`clave repetida: ${tp.key}`);
      claves.add(tp.key);
      revisaTxt(tp.l, `tipo ${tp.key}`);
      if(!tp.icon) fallos.push(`tipo ${tp.key}: sin icono`);
      const ks=new Set();
      bebidaCamposDe(tp.key).forEach(c=>{
        if(ks.has(c.k)) fallos.push(`${tp.key}: campo repetido ${c.k}`);
        ks.add(c.k);
        revisaTxt(c.l, `${tp.key}.${c.k}`);
        if(!['text','num','sel','area'].includes(c.tipo)) fallos.push(`${tp.key}.${c.k}: tipo raro ${c.tipo}`);
        if(c.tipo==='sel'){
          if(!c.opts||!c.opts.length) fallos.push(`${tp.key}.${c.k}: select sin opciones`);
          (c.opts||[]).forEach(o=>revisaTxt(o.l, `${tp.key}.${c.k}=${o.v}`));
        }
        if(c.tipo==='num' && c.min!==undefined && c.max!==undefined && c.min>c.max) fallos.push(`${tp.key}.${c.k}: min>max`);
      });
    });
    return fallos;
  });
  assert.deepEqual(malos, [], malos.join(' | '));
  const n = await page.evaluate(()=>BEBIDA_TIPOS.length);
  return `${n} tipos, sin huecos`;
});

/* ─── El formulario se pinta para cada tipo ─── */
await caso('Cada tipo pinta sus campos y ninguno se queda sin dibujar', async ()=>{
  const r = await page.evaluate(async ()=>{
    const out=[];
    currentArea = () => 'sala';
    for(const tp of BEBIDA_TIPOS){
      openFichaModal();
      setFichaBebidaTipo(tp.key);
      const esperados = bebidaCamposDe(tp.key).map(c=>c.k);
      const faltan = esperados.filter(k => !document.getElementById('bebida-'+k));
      out.push({tipo:tp.key, esperados:esperados.length, faltan});
      closeModal();
    }
    return out;
  });
  const rotos = r.filter(x=>x.faltan.length);
  assert.deepEqual(rotos, [], JSON.stringify(rotos));
  return `${r.length} tipos, ${r.reduce((a,b)=>a+b.esperados,0)} campos pintados`;
});

/* ─── Lo que se escribe se guarda ─── */
await caso('Una ficha de vino guarda su añada, su cata y su maridaje', async ()=>{
  const r = await page.evaluate(async ()=>{
    currentArea = () => 'sala';
    openFichaModal();
    document.getElementById('ficha-name').value = 'Ribera Crianza 2019';
    setFichaBebidaTipo('vino');
    document.getElementById('bebida-tempServicio').value = '16';
    document.getElementById('bebida-anada').value = '2019';
    document.getElementById('bebida-do').value = 'Ribera del Duero';
    document.getElementById('bebida-uvas').value = 'Tempranillo 100%';
    document.getElementById('bebida-cataNariz').value = 'Fruta negra madura y tostados';
    document.getElementById('bebida-maridaje').value = 'Cordero, quesos curados';
    document.getElementById('bebida-decantar').value = '30 min';
    await saveFicha();
    const f = DB.fichas.find(x=>x.name==='Ribera Crianza 2019');
    return f ? {tipo:f.bebidaTipo, b:f.bebida} : null;
  });
  assert.ok(r, 'la ficha no se guardó');
  assert.equal(r.tipo, 'vino');
  assert.equal(r.b.anada, 2019, 'la añada debería guardarse como número');
  assert.equal(r.b.tempServicio, 16);
  assert.equal(r.b.do, 'Ribera del Duero');
  assert.equal(r.b.cataNariz, 'Fruta negra madura y tostados');
  assert.equal(r.b.maridaje, 'Cordero, quesos curados');
  assert.equal(r.b.decantar, '30 min');
  return 'añada, D.O., uva, cata, maridaje y decantación';
});

await caso('Un número imposible se corrige en vez de guardarse', async ()=>{
  const r = await page.evaluate(async ()=>{
    currentArea = () => 'sala';
    openFichaModal();
    document.getElementById('ficha-name').value = 'Erratas';
    setFichaBebidaTipo('vino');
    document.getElementById('bebida-anada').value = '12';        // año 12
    document.getElementById('bebida-tempServicio').value = '400'; // 400 °C
    document.getElementById('bebida-graduacion').value = '-5';
    await saveFicha();
    const f = DB.fichas.find(x=>x.name==='Erratas');
    return f.bebida;
  });
  assert.equal(r.anada, 1900, 'una añada del año 12 es una errata');
  assert.equal(r.tempServicio, 100, 'no se sirve un vino a 400 °C');
  assert.equal(r.graduacion, 0);
  return 'se recortan al rango razonable';
});

/* ─── Cambiar de tipo ─── */
await caso('Cambiar de tipo conserva lo común y suelta lo que ya no aplica', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'sala';
    openFichaModal();
    setFichaBebidaTipo('vino');
    document.getElementById('bebida-tempServicio').value = '8';
    document.getElementById('bebida-cristaleria').value = 'Copa de balón';
    document.getElementById('bebida-anada').value = '2021';
    setFichaBebidaTipo('cafe'); // el café no tiene añada
    const tras = {...fichaModalState.bebida};
    return tras;
  });
  assert.equal(r.tempServicio, 8, 'la temperatura la tienen los dos, no debería perderse');
  assert.equal(r.cristaleria, 'Copa de balón', 'la copa la tienen los dos');
  assert.equal(r.anada, undefined, 'un café no tiene añada: no debe quedar escondida');
  return 'conserva 2 comunes, suelta la que sobra';
});

await caso('Un tipo desconocido no rompe el formulario', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'sala';
    DB.fichas.push({id:987654321, name:'De otra versión', area:'sala', bebidaTipo:'kombucha_del_futuro', bebida:{tempServicio:5}, ingredients:[], pasos:[], allergens:[]});
    openFichaModal(987654321);
    const abierto = !!document.getElementById('ficha-bebida-tipo');
    const tipo = fichaModalState.bebidaTipo;
    closeModal();
    return {abierto, tipo};
  });
  assert.ok(r.abierto, 'la ficha debería abrirse igual');
  assert.equal(r.tipo, '', 'un tipo que ya no existe se trata como sin tipo');
  return 'se abre y se trata como sin tipo';
});

/* ─── El impreso ─── */
await caso('El impreso enseña los datos de la bebida y no los vacíos', async ()=>{
  const r = await page.evaluate(()=>{
    const f = DB.fichas.find(x=>x.name==='Ribera Crianza 2019');
    const html = bebidaImpresoHtml(f);
    const lineas = bebidaLineasRellenas(f);
    return {html, n:lineas.length, tieneVacio: html.includes('undefined') || html.includes('null')};
  });
  assert.ok(r.html.includes('2019'), 'debería salir la añada');
  assert.ok(r.html.includes('Ribera del Duero'));
  assert.ok(r.html.includes('Cordero'), 'el maridaje va en el impreso');
  assert.ok(!r.tieneVacio, 'no deberían colarse huecos sin rellenar');
  assert.ok(r.n >= 6, `pocas líneas: ${r.n}`);
  return `${r.n} líneas, sin huecos`;
});

/* ─── Que no rompa lo de cocina ─── */
await caso('La ficha de cocina sigue igual, sin campos de bebida', async ()=>{
  const r = await page.evaluate(async ()=>{
    currentArea = () => 'cocina';
    openFichaModal();
    const haySelector = !!document.getElementById('ficha-bebida-tipo');
    const hayTemp = !!document.getElementById('ficha-temp');
    document.getElementById('ficha-name').value = 'Solomillo al whisky';
    await saveFicha();
    const f = DB.fichas.find(x=>x.name==='Solomillo al whisky');
    return {haySelector, hayTemp, tipo:f.bebidaTipo, area:f.area};
  });
  assert.ok(!r.haySelector, 'cocina no debería ver el selector de bebida');
  assert.ok(r.hayTemp, 'cocina conserva su temperatura de siempre');
  assert.equal(r.tipo, '', 'una ficha de cocina no tiene tipo de bebida');
  assert.equal(r.area, 'cocina');
  return 'intacta';
});

/* ─── Los tres idiomas ─── */
await caso('Los campos de bebida están en catalán e inglés, sin desbordar', async ()=>{
  const r = await page.evaluate(()=>{
    const out={};
    ['es','ca','en'].forEach(l=>{
      localStorage.setItem('gastrogoan_lang', l);
      const largos = [];
      BEBIDA_TIPOS.forEach(tp => bebidaCamposDe(tp.key).forEach(c => {
        const txt = gl(c.l);
        if(!txt || txt.length > 40) largos.push(`${l}:${tp.key}.${c.k}="${txt}"`);
      }));
      out[l]=largos;
    });
    localStorage.setItem('gastrogoan_lang','es');
    return out;
  });
  const malos = [...r.es, ...r.ca, ...r.en];
  assert.deepEqual(malos, [], malos.join(' | '));
  return 'las tres etiquetas caben';
});

/* ─── Distribución del Trabajo en sala ─── */
// Antes a sala solo se le quitaba la columna de platos y no se le ponía
// nada en su lugar: la pantalla se quedaba coja.
await caso('Sala reparte rangos donde cocina reparte platos', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'sala';
    DB.employees = [{id:501,name:'Marta',rol:'Camarera',area:'sala',active:true,color:'#4A5D4E'}];
    DB.workDistribution = {};
    distCurrentEmployeeId = 501;
    const d = getDistEmpData(501);
    document.body.classList.add('owner-session');
    navigate('distribucion');
    renderDistDetail();
    const input = document.getElementById('dist-rango-input');
    const haySelectorPlatos = !!document.getElementById('dist-plato-sel');
    if(input){ input.value = 'Mesas 1-8'; addDistRango(); }
    const i2 = document.getElementById('dist-rango-input');
    if(i2){ i2.value = 'Terraza'; addDistRango(); }
    // Duplicado con otras mayúsculas: no debería entrar dos veces
    const i3 = document.getElementById('dist-rango-input');
    if(i3){ i3.value = 'terraza'; addDistRango(); }
    return {rangos: getDistEmpData(501).rangos, haySelectorPlatos, pintado: (document.body.innerHTML.match(/Mesas 1-8/g)||[]).length};
  });
  assert.ok(!r.haySelectorPlatos, 'sala no debería ver el selector de platos');
  assert.deepEqual(r.rangos, ['Mesas 1-8','Terraza'], 'los rangos deberían guardarse sin duplicar');
  assert.ok(r.pintado > 0, 'el rango debería verse en pantalla');
  return `${r.rangos.length} rangos, el duplicado rechazado`;
});

await caso('Cocina sigue repartiendo platos, no rangos', async ()=>{
  const r = await page.evaluate(()=>{
    currentArea = () => 'cocina';
    DB.employees.push({id:502,name:'Luis',rol:'Cocinero',area:'cocina',active:true,color:'#DF7039'});
    distCurrentEmployeeId = 502;
    navigate('distribucion');
    renderDistDetail();
    return {hayRango: !!document.getElementById('dist-rango-input'), hayPlato: !!document.getElementById('dist-plato-sel')};
  });
  assert.ok(!r.hayRango, 'cocina no debería ver los rangos de sala');
  assert.ok(r.hayPlato, 'cocina conserva su reparto de platos');
  return 'intacta';
});

await caso('Un empleado borrado en otro dispositivo no congela Distribución', async ()=>{
  // Es el bug que ya pasó a producción una vez: Firebase no guarda objetos
  // vacíos y mergeStockField dejaba la clave valiendo undefined.
  const r = await page.evaluate(()=>{
    currentArea = () => 'sala';
    DB.workDistribution = {501:{platos:[],rangos:['Barra'],produccion:{}}, 999:undefined};
    distCurrentEmployeeId = 501;
    try{ navigate('distribucion'); renderDistDetail(); return {ok:true, rangos:getDistEmpData(501).rangos}; }
    catch(e){ return {ok:false, err:e.message}; }
  });
  assert.ok(r.ok, 'reventó: ' + r.err);
  assert.deepEqual(r.rangos, ['Barra']);
  return 'aguanta';
});

/* ─── El formulario largo en móvil ─── */
// La ficha de vino son 16 campos: es la ventana más larga de la app y la
// que más papeletas tiene de desbordarse en un móvil de 320 px.
await caso('La ficha de vino cabe en un móvil, sin desbordes ni botones diminutos', async ()=>{
  const hallazgos = [];
  for(const ancho of [320, 390, 768]){
    await page.setViewport({width:ancho, height:800});
    // setViewport recarga en modo móvil y borraría el estado: se re-siembra.
    await page.evaluate(()=>{
      Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true});
      editUnlocked = true;
      currentArea = () => 'sala';
      openFichaModal();
      setFichaBebidaTipo('vino');
    });
    await new Promise(r=>setTimeout(r,250));
    const r = await page.evaluate((w)=>{
      const out = {desbordes:[], pequenos:[]};
      const modal = document.querySelector('.modal, .modal-content, [class*="modal"]');
      document.querySelectorAll('.modal input, .modal select, .modal textarea, .modal button, [class*="modal"] input, [class*="modal"] select, [class*="modal"] textarea, [class*="modal"] button').forEach(el=>{
        const b = el.getBoundingClientRect();
        if(b.width === 0 && b.height === 0) return;
        if(b.right > w + 1) out.desbordes.push((el.id||el.tagName) + ' hasta ' + Math.round(b.right));
        if(b.height < 36) out.pequenos.push((el.id||el.tagName) + ' ' + Math.round(b.height) + 'px');
      });
      out.scrollH = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      out.abierto = !!modal;
      return out;
    }, ancho);
    if(!r.abierto) hallazgos.push(`${ancho}: la ventana no se abrió`);
    if(r.desbordes.length) hallazgos.push(`${ancho}: se sale ${r.desbordes.slice(0,3).join(', ')}`);
    if(r.pequenos.length) hallazgos.push(`${ancho}: demasiado pequeño ${r.pequenos.slice(0,3).join(', ')}`);
    if(r.scrollH) hallazgos.push(`${ancho}: scroll horizontal en la página`);
    await page.evaluate(()=>closeModal());
  }
  await page.setViewport({width:1280, height:900});
  assert.deepEqual(hallazgos, [], hallazgos.join(' | '));
  return '320, 390 y 768 px limpios';
});

await caso('Ningún error de JavaScript en todo el recorrido', async ()=>{
  assert.deepEqual(errs, [], errs.join(' | '));
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
