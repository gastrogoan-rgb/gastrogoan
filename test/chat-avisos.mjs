// CHAT: avisos de mensajes nuevos (11/11, pedido del dueño: «que cuando alguien envía algo se vea resaltado y que al entrar se quite el aviso»).
// Fallos que encontró: el contador solo se recalculaba al abrir/escribir (un mensaje llegado de OTRO aparato no lo movía), el panel abierto no se
// repintaba con lo que llegaba, nada se resaltaba, y `markChatRead` usaba la hora de ESTE aparato: con el reloj del otro adelantado unos minutos
// los mensajes se quedaban «sin leer» para siempre.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({width:1280,height:800});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(2000);
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => {
  localStorage.clear();
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  d.chatMessages = [];
  await idbSet('gastrogoan_data_v1', d);
}, datos);
await page.goto('about:blank');
await page.goto('http://localhost:8950/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(4500);
const badge = () => page.evaluate(() => { const b = document.getElementById('chat-badge'); return {visible: !!b && getComputedStyle(b).display !== 'none', texto: b && b.textContent}; });
// Llega, desde OTRO aparato, un mensaje (misma ruta que la nube: applyRemoteBlock)
const llega = (texto, canal = 'general', ts) => page.evaluate((texto, canal, ts) => {
  lastSyncedSnapshot = lastSyncedSnapshot || {};
  const lista = (DB.chatMessages || []).slice();
  lista.push({id: genId(), channel: canal, authorId: 'otro-aparato', authorName: 'Ana', text: texto, ts: ts || new Date().toISOString()});
  applyRemoteBlock('chatMessages', lista);
}, texto, canal, ts);

await caso('Un mensaje que llega de otro aparato enciende el aviso SIN abrir nada', async () => {
  assert.equal((await badge()).visible, false, 'al empezar no debe haber aviso');
  await llega('Hola desde cocina');
  await w(300);
  const b = await badge(); assert.equal(b.visible, true, 'el contador no se enciende al llegar un mensaje'); assert.equal(b.texto, '1');
});
await caso('Dos más suben el contador y el botón del chat avisa (clase de aviso)', async () => {
  await llega('Segundo'); await llega('Tercero'); await w(300);
  assert.equal((await badge()).texto, '3');
  const aviso = await page.evaluate(() => document.getElementById('chat-fab').classList.contains('chat-con-aviso'));
  assert.equal(aviso, true, 'el botón del chat no cambia cuando hay mensajes nuevos');
});
await caso('Al abrir el chat, lo nuevo sale RESALTADO y el aviso se quita', async () => {
  await page.evaluate(() => toggleChatPanel()); await w(300);
  const r = await page.evaluate(() => ({nuevos: document.querySelectorAll('#chat-messages .chat-msg-new').length, marca: !!document.querySelector('#chat-messages .chat-new-tag')}));
  assert.equal(r.nuevos, 3, 'los 3 mensajes nuevos deben ir resaltados'); assert.ok(r.marca, 'falta la etiqueta «Nuevo»');
  assert.equal((await badge()).visible, false, 'el aviso no se quita al entrar');
  assert.equal(await page.evaluate(() => document.getElementById('chat-fab').classList.contains('chat-con-aviso')), false);
});
await caso('Con el panel abierto, un mensaje que llega se pinta solo, resaltado, sin avisar de nuevo', async () => {
  await llega('Llega con el chat abierto'); await w(300);
  const r = await page.evaluate(() => ({total: document.querySelectorAll('#chat-messages .help-msg').length, nuevos: document.querySelectorAll('#chat-messages .chat-msg-new').length}));
  assert.equal(r.total, 4, 'el mensaje que llega no aparece en el panel abierto'); assert.equal(r.nuevos, 4);
  assert.equal((await badge()).visible, false, 'con el panel abierto en ese canal no debe haber contador');
});
await caso('Al cerrar y volver a abrir, ya NO está resaltado (se leyó)', async () => {
  await page.evaluate(() => toggleChatPanel()); await w(150); await page.evaluate(() => toggleChatPanel()); await w(300);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#chat-messages .chat-msg-new').length), 0);
});
await caso('Un canal de otra pestaña cuenta y se quita al entrar en él', async () => {
  await page.evaluate(() => toggleChatPanel()); await w(150);              // cerrado
  await llega('Aviso de cocina', 'cocina'); await w(300);
  assert.equal((await badge()).texto, '1');
  await page.evaluate(() => { toggleChatPanel(); switchChatTab('cocina'); }); await w(300);
  assert.equal((await badge()).visible, false);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#chat-messages .chat-msg-new').length), 1);
});
await caso('Reloj del otro aparato ADELANTADO 10 min: al leer, el aviso se quita igualmente', async () => {
  await page.evaluate(() => { if(document.getElementById('chat-panel').classList.contains('active')) toggleChatPanel(); });
  await llega('Desde un reloj adelantado', 'general', new Date(Date.now() + 10 * 60000).toISOString()); await w(300);
  assert.equal((await badge()).visible, true);
  await page.evaluate(() => { switchChatTab('general'); toggleChatPanel(); }); await w(300);
  await page.evaluate(() => toggleChatPanel()); await w(200);
  assert.equal((await badge()).visible, false, 'el mensaje con hora futura se queda «sin leer» para siempre');
});
await caso('Mis propios mensajes no encienden nada', async () => {
  await page.evaluate(() => { toggleChatPanel(); document.getElementById('chat-input').value = 'yo escribo'; sendChatMessage(); toggleChatPanel(); }); await w(300);
  assert.equal((await badge()).visible, false);
});
await caso('Sin errores de página', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
