// CHAT INTERNO y AYUDA (8/11): que el chat mande, avise y respete las áreas, y que la ayuda encuentre cada tema por sus propias palabras.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:900});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'CHAT0001', tenantId: ggBizTenantId('CHAT0001')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
const w = ms => new Promise(r => setTimeout(r, ms));
await w(2200);
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.chatMessages.length = 0; currentFolder = 'gestion'; ownerUnlocked = true; navigate('dashboard');
  Object.keys(localStorage).filter(k => k.startsWith('chatLastRead_')).forEach(k => localStorage.removeItem(k));
});
await w(500);
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('Chat: se abre, el propietario manda un mensaje, sale en el canal y SU PROPIO mensaje no cuenta como «sin leer»', async () => {
  const r = await page.evaluate(async () => {
    toggleChatPanel(); await new Promise(r => setTimeout(r, 200));
    document.getElementById('chat-input').value = 'Hoy no hay salmón'; sendChatMessage();
    await new Promise(r => setTimeout(r, 200));
    const out = {abierto: document.getElementById('chat-panel').classList.contains('active'), texto: document.getElementById('chat-messages').innerText.includes('Hoy no hay salmón'), n: DB.chatMessages.length};
    updateChatBadge(); out.insignia = getComputedStyle(document.getElementById('chat-badge')).display;
    toggleChatPanel();
    updateChatBadge(); out.insigniaCerrado = getComputedStyle(document.getElementById('chat-badge')).display;
    return out;
  });
  assert.ok(r.abierto && r.texto && r.n === 1, JSON.stringify(r)); assert.equal(r.insignia, 'none', 'insignia con el panel abierto: ' + JSON.stringify(r));
  assert.equal(r.insigniaCerrado, 'none', 'mi propio mensaje no es «sin leer»: ' + JSON.stringify(r));
});
await caso('Chat: el mensaje de OTRA persona avisa con su cifra y al abrir el canal se marca como leído', async () => {
  const r = await page.evaluate(async () => {
    DB.chatMessages.push({id: genId(), channel: 'general', authorId: '77', authorName: 'Ana', text: 'Llega el pescado a las 5', ts: new Date(Date.now() + 1000).toISOString()});
    updateChatBadge(); const antes = document.getElementById('chat-badge').textContent;
    toggleChatPanel(); await new Promise(r => setTimeout(r, 200));
    updateChatBadge(); const despues = getComputedStyle(document.getElementById('chat-badge')).display;
    toggleChatPanel();
    return {antes, despues};
  });
  assert.equal(r.antes, '1'); assert.equal(r.despues, 'none');
});
await caso('Chat: Cocina no ve ni se entera del canal de Sala (y viceversa); el propietario en Gestión ve los tres', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    localStorage.setItem('chatLastRead_general', new Date(Date.now() + 60000).toISOString());   // lo de General ya está leído
    DB.chatMessages.push({id: genId(), channel: 'sala', authorId: '78', authorName: 'Luis', text: 'Mesa 4 pide la cuenta', ts: new Date(Date.now() + 2000).toISOString()});
    currentFolder = 'cocina'; out.cocina = visibleChatChannels(); updateChatBadge(); out.badgeCocina = getComputedStyle(document.getElementById('chat-badge')).display;
    currentFolder = 'sala'; out.sala = visibleChatChannels(); updateChatBadge(); out.badgeSala = document.getElementById('chat-badge').textContent;
    currentFolder = 'gestion'; out.gestion = visibleChatChannels();
    return out;
  });
  assert.deepEqual(r.cocina, ['general', 'cocina']); assert.deepEqual(r.sala, ['general', 'sala']); assert.equal(r.gestion.length, 3);
  assert.equal(r.badgeCocina, 'none', 'Cocina no debe avisar de un mensaje de Sala'); assert.equal(r.badgeSala, '1');
});
await caso('Chat: fijar un mensaje lo deja arriba y se puede quitar; «necesito ayuda ya» manda un aviso urgente a General', async () => {
  const r = await page.evaluate(async () => {
    currentFolder = 'gestion'; toggleChatPanel(); currentChatChannel = 'general'; renderChatMessages();
    const id = DB.chatMessages.find(m => m.text === 'Hoy no hay salmón').id; pinChatMessage(id);
    const fijado = document.getElementById('chat-pinned').innerText.includes('Hoy no hay salmón');
    unpinChatMessage(); const quitado = document.getElementById('chat-pinned').innerText.trim() === '';
    const antes = DB.chatMessages.length; try{ sendUrgentHelpAlert(); }catch(e){}
    await new Promise(r => setTimeout(r, 300));
    const urgente = DB.chatMessages.slice(antes).some(m => m.urgent && m.channel === 'general');
    toggleChatPanel();
    return {fijado, quitado, urgente};
  });
  assert.deepEqual(r, {fijado: true, quitado: true, urgente: true});
});
await caso('Chat directo dueño-empleado: un canal por empleado, solo entre los dos', async () => {
  const r = await page.evaluate(() => {
    DB.employees.push({id: 501, name: 'Marta', area: 'sala', pin: '1111'});
    const canal = directChatChannel(501);
    DB.chatMessages.push({id: genId(), channel: canal, authorId: 'owner', authorName: 'Jefe', text: 'Cubre el sábado', ts: new Date().toISOString()});
    return {canal, enGeneral: DB.chatMessages.filter(m => m.channel === 'general' && m.text === 'Cubre el sábado').length, enDm: DB.chatMessages.filter(m => m.channel === canal).length, visible: visibleChatChannels().includes(canal)};
  });
  assert.equal(r.canal, 'dm:501'); assert.equal(r.enGeneral, 0); assert.equal(r.enDm, 1); assert.equal(r.visible, false);
});

// ── Ayuda ──────────────────────────────────────────────────────────────────────────────────────────
await caso('Ayuda: cada tema se encuentra con SU primera frase clave, en los tres idiomas (o, si hay empate, ofrece ese tema entre las opciones)', async () => {
  const r = await page.evaluate(() => {
    const fallos = [], getLangOriginal = window.getLang;
    for(const lang of ['es', 'ca', 'en']){
      window.getLang = () => lang;
      HELP_FAQS.forEach((faq, idx) => {
        const frase = (faq.keywords[lang] || faq.keywords.es)[0];
        const res = scoreHelpFaqs(frase);
        const top = res.slice(0, 3).map(x => x.idx);
        if(!top.includes(idx)) fallos.push(lang + ' «' + frase + '» → ' + top.join(','));
      });
    }
    window.getLang = getLangOriginal;
    return fallos;
  });
  assert.deepEqual(r, [], r.length + ' temas que su propia frase no encuentra: ' + r.slice(0, 6).join(' | '));
});
await caso('Ayuda: una pregunta con otras palabras responde, y una sin sentido no inventa: ofrece hablar con una persona', async () => {
  const r = await page.evaluate(async () => {
    toggleHelpPanel(); await new Promise(r => setTimeout(r, 200));
    const box = document.getElementById('help-chat-messages'); const n0 = box.children.length;
    document.getElementById('help-input') && (document.getElementById('help-input').value = 'cómo cobro una mesa con tarjeta y efectivo');
    respondHelp('cómo cobro una mesa con tarjeta y efectivo'); const buena = box.lastElementChild.innerText;
    helpConvo.misses = 0; respondHelp('xyzzy plugh qwerty'); const rara = box.lastElementChild.innerText; respondHelp('xyzzy plugh qwerty'); const rara2 = box.lastElementChild.innerText;
    toggleHelpPanel();
    return {buena, rara: rara.slice(0, 80), rara2: rara2.slice(0, 80), nuevos: box.children.length - n0};
  });
  assert.match(r.buena, /cobr/i, r.buena.slice(0, 120)); assert.ok(r.nuevos >= 3); assert.notEqual(r.rara, r.rara2, 'al segundo fallo debe ofrecer hablar con una persona');
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
