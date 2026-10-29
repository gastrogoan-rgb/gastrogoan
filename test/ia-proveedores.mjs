// Los tres proveedores de IA (29/10): Google (Gemini), Anthropic (Claude) y OpenAI (ChatGPT). Sin gastar ni una
// llamada real: se sustituye fetch y se comprueba que cada petición sale EXACTAMENTE como la espera esa API
// (dirección, cabeceras, cuerpo) y que cada respuesta se entiende. Que los tres aceptan llamadas directas desde el
// navegador (CORS) se comprobó aparte contra los servidores reales: las tres contestan a la comprobación previa
// permitiendo el origen de la app y las cabeceras que se mandan.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|openai|anthropic/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'IAPROVEED1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  window.__llamadas = [];
  window.__responder = null;
  window.fetch = async (url, init) => {
    window.__llamadas.push({url: String(url), metodo: (init||{}).method || 'GET', cabeceras: (init||{}).headers || {}, cuerpo: (init||{}).body ? JSON.parse(init.body) : null});
    const r = window.__responder(String(url), window.__llamadas.length);
    return {ok: r.status === undefined || r.status < 400, status: r.status || 200, json: async () => r.json, text: async () => JSON.stringify(r.json || {})};
  };
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const llamar = (proveedor, modelo, respuesta, opciones, mensajes) => page.evaluate(async (p, m, resp, o, msgs) => {
  window.__llamadas = [];
  window.__responder = () => resp;
  idrGuardarConfig(p, 'CLAVE-DE-PRUEBA', m);
  const r = await llmChat('SISTEMA', msgs || [{role:'user', content:'hola'}], o || {maxTokens:100});
  return {r, llamada: window.__llamadas[0], n: window.__llamadas.length, todas: window.__llamadas};
}, proveedor, modelo, respuesta, opciones, mensajes);

await caso('Se pueden elegir los tres proveedores: Google (Gemini), Anthropic (Claude) y OpenAI (ChatGPT)', async () => {
  const r = await page.evaluate(()=>Object.entries(IDR_PROVEEDORES).map(([k, v]) => [k, gl(v.l)]));
  assert.deepEqual(r.map(x => x[0]).sort(), ['anthropic','google','openai'], JSON.stringify(r));
  assert.ok(r.some(x => /ChatGPT/.test(x[1])) && r.some(x => /Claude/.test(x[1])) && r.some(x => /Gemini/.test(x[1])), JSON.stringify(r));
});

await caso('Gemini: dirección con la clave, cuerpo systemInstruction/contents y respuesta entendida', async () => {
  const x = await llamar('google', 'gemini-test', {json:{candidates:[{content:{parts:[{text:'Hola Gemini'}]}, finishReason:'STOP'}]}});
  assert.ok(x.r.ok && x.r.texto === 'Hola Gemini', JSON.stringify(x.r));
  assert.match(x.llamada.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-test:generateContent\?key=CLAVE-DE-PRUEBA$/);
  assert.equal(x.llamada.metodo, 'POST');
  assert.equal(x.llamada.cuerpo.systemInstruction.parts[0].text, 'SISTEMA');
  assert.equal(x.llamada.cuerpo.contents[0].role, 'user');
  assert.equal(x.llamada.cuerpo.generationConfig.maxOutputTokens, 100);
});

await caso('Claude: /v1/messages con las tres cabeceras que exige el navegador y respuesta entendida', async () => {
  const x = await llamar('anthropic', 'claude-test', {json:{content:[{type:'text', text:'Hola Claude'}], stop_reason:'end_turn'}});
  assert.ok(x.r.ok && x.r.texto === 'Hola Claude', JSON.stringify(x.r));
  assert.equal(x.llamada.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(x.llamada.cabeceras['x-api-key'], 'CLAVE-DE-PRUEBA');
  assert.equal(x.llamada.cabeceras['anthropic-version'], '2023-06-01');
  assert.equal(x.llamada.cabeceras['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(x.llamada.cuerpo.system, 'SISTEMA');
  assert.equal(x.llamada.cuerpo.max_tokens, 100);
  assert.equal(x.llamada.cuerpo.model, 'claude-test');
});

await caso('ChatGPT: /v1/chat/completions con «Authorization: Bearer», sin temperatura y respuesta entendida', async () => {
  const x = await llamar('openai', 'gpt-4o-test', {json:{choices:[{message:{role:'assistant', content:'Hola ChatGPT'}, finish_reason:'stop'}]}});
  assert.ok(x.r.ok && x.r.texto === 'Hola ChatGPT', JSON.stringify(x.r));
  assert.equal(x.llamada.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(x.llamada.cabeceras.authorization, 'Bearer CLAVE-DE-PRUEBA');
  assert.equal(x.llamada.cuerpo.model, 'gpt-4o-test');
  assert.deepEqual(x.llamada.cuerpo.messages[0], {role:'system', content:'SISTEMA'});
  assert.deepEqual(x.llamada.cuerpo.messages[1], {role:'user', content:'hola'});
  assert.equal(x.llamada.cuerpo.max_completion_tokens, 100, 'un modelo normal usa el tope que se pide');
  assert.ok(!('temperature' in x.llamada.cuerpo) && !('max_tokens' in x.llamada.cuerpo), 'ni temperatura ni el max_tokens retirado: ' + Object.keys(x.llamada.cuerpo));
});

await caso('ChatGPT con un modelo que razona (gpt-5…) recibe margen para pensar, y si aun así se corta, se reintenta con el triple', async () => {
  const x = await page.evaluate(async () => {
    window.__llamadas = [];
    window.__responder = (url, n) => n === 1
      ? {json:{choices:[{message:{content:''}, finish_reason:'length'}]}}
      : {json:{choices:[{message:{content:'Por fin'}, finish_reason:'stop'}]}};
    idrGuardarConfig('openai', 'K', 'gpt-5-mini');
    const r = await llmChat('S', [{role:'user', content:'x'}], {maxTokens: 800});
    return {r, topes: window.__llamadas.map(l => l.cuerpo.max_completion_tokens)};
  });
  assert.ok(x.r.ok && x.r.texto === 'Por fin', JSON.stringify(x));
  assert.ok(x.topes[0] >= 1500, 'margen inicial: ' + JSON.stringify(x.topes));
  assert.ok(x.topes[1] > x.topes[0], 'el reintento da más: ' + JSON.stringify(x.topes));
});

await caso('Una foto o un PDF viajan con la forma de cada proveedor (lectura de facturas)', async () => {
  const msgs = [{role:'user', content:'lee esto'}];
  const foto = {mime:'image/jpeg', datos:'AAAA'}, pdf = {mime:'application/pdf', datos:'BBBB'};
  const ok = {json:{choices:[{message:{content:'ok'}}], content:[{text:'ok'}], candidates:[{content:{parts:[{text:'ok'}]}}]}};
  const g = (await llamar('google', 'm', ok, {maxTokens:50, archivo: foto}, msgs)).llamada.cuerpo.contents[0].parts[0];
  assert.deepEqual(g, {inlineData:{mimeType:'image/jpeg', data:'AAAA'}});
  const aFoto = (await llamar('anthropic', 'm', ok, {maxTokens:50, archivo: foto}, msgs)).llamada.cuerpo.messages[0].content[0];
  assert.equal(aFoto.type, 'image'); assert.equal(aFoto.source.media_type, 'image/jpeg');
  const aPdf = (await llamar('anthropic', 'm', ok, {maxTokens:50, archivo: pdf}, msgs)).llamada.cuerpo.messages[0].content[0];
  assert.equal(aPdf.type, 'document');
  const oFoto = (await llamar('openai', 'gpt-4o', ok, {maxTokens:50, archivo: foto}, msgs)).llamada.cuerpo.messages[1].content[0];
  assert.equal(oFoto.type, 'image_url'); assert.equal(oFoto.image_url.url, 'data:image/jpeg;base64,AAAA');
  const oPdf = (await llamar('openai', 'gpt-4o', ok, {maxTokens:50, archivo: pdf}, msgs)).llamada.cuerpo.messages[1].content[0];
  assert.equal(oPdf.type, 'file'); assert.equal(oPdf.file.file_data, 'data:application/pdf;base64,BBBB');
});

await caso('Los errores de los tres se traducen igual: clave mala, cuota, modelo retirado y fallo del proveedor', async () => {
  for(const prov of ['google','anthropic','openai']){
    const mot = {};
    for(const st of [401, 403, 429, 404, 500]){
      const x = await llamar(prov, 'm', {status: st, json:{error:'x'}});
      mot[st] = x.r.motivo;
    }
    assert.deepEqual(mot, {401:'clave-mala', 403:'clave-mala', 429:'cuota', 404:'modelo', 500:'proveedor'}, prov + ' ' + JSON.stringify(mot));
  }
});

await caso('La lista de modelos de ChatGPT deja solo los de chat y pone primero los nuevos y ligeros', async () => {
  const r = await page.evaluate(()=>IDR_PROVEEDORES.openai.extraerModelos({data:[
    {id:'text-embedding-3-small'},{id:'whisper-1'},{id:'gpt-4o'},{id:'gpt-5-mini'},{id:'dall-e-3'},{id:'gpt-4o-mini-tts'},
    {id:'gpt-5'},{id:'o3-mini'},{id:'gpt-4o-realtime-preview'},{id:'omni-moderation-latest'},{id:'gpt-image-1'}]}));
  assert.equal(r[0], 'gpt-5-mini', JSON.stringify(r));
  assert.ok(r.includes('gpt-4o') && r.includes('gpt-5') && r.includes('o3-mini'), JSON.stringify(r));
  assert.ok(!r.some(x => /embedding|whisper|dall|tts|realtime|moderation|image/.test(x)), JSON.stringify(r));
});

await caso('Probar la conexión con una clave mala NO deja el asistente roto: se devuelve lo que funcionaba', async () => {
  const r = await page.evaluate(async () => {
    idrGuardarConfig('google', 'CLAVE-BUENA', 'gemini-ok');
    idrConfigModal();
    document.getElementById('idr-prov').value = 'openai';
    document.getElementById('idr-clave').value = 'sk-mala';
    document.getElementById('idr-modelo').value = 'gpt-4o';
    window.__responder = () => ({status:401, json:{error:'bad'}});
    await idrProbarConexion();
    const tras = idrConfig();
    closeModal();
    return tras;
  });
  assert.equal(r.proveedor, 'google'); assert.equal(r.clave, 'CLAVE-BUENA'); assert.equal(r.modelo, 'gemini-ok');
});

await caso('Y si la prueba sale bien, queda guardada la nueva', async () => {
  const r = await page.evaluate(async () => {
    idrGuardarConfig('google', 'CLAVE-BUENA', 'gemini-ok');
    idrConfigModal();
    document.getElementById('idr-prov').value = 'openai';
    document.getElementById('idr-clave').value = 'sk-buena';
    document.getElementById('idr-modelo').value = 'gpt-4o';
    window.__responder = () => ({json:{choices:[{message:{content:'OK'}}]}});
    await idrProbarConexion();
    const tras = idrConfig(); closeModal(); return tras;
  });
  assert.equal(r.proveedor, 'openai'); assert.equal(r.clave, 'sk-buena'); assert.equal(r.modelo, 'gpt-4o');
});

await caso('Cada proveedor enseña de dónde sacar la clave: enlace de verdad y pasos, y avisa de que la suscripción no incluye la API', async () => {
  const r = await page.evaluate(()=>({o: idrAyudaHtml('openai'), a: idrAyudaHtml('anthropic'), g: idrAyudaHtml('google')}));
  assert.ok(/href="https:\/\/platform\.openai\.com\/api-keys"/.test(r.o) && /ChatGPT Plus/.test(r.o) && (r.o.match(/<li>/g)||[]).length === 4, r.o);
  assert.ok(/href="https:\/\/console\.anthropic\.com/.test(r.a) && /Claude Pro/.test(r.a), r.a);
  assert.ok(/href="https:\/\/aistudio\.google\.com\/apikey"/.test(r.g) && (r.g.match(/<li>/g)||[]).length === 4, r.g);
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
