import puppeteer from 'puppeteer-core';
import {semilla} from './_semilla-publica.mjs';
const ancho = +process.env.ANCHO || 390;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:ancho, height:ancho<600?844:900, deviceScaleFactor:1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 600));
const w = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate((s) => {
  localStorage.setItem('gastrogoan_lang','es');
  window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed:true, snapshot:{val: () => 0}})})};
  businessInfoLoadedOnce = true; setLang('es'); renderHeader(); currentTab = null; renderApp();
}, semilla());
await w(600);
const shot = async n => { await page.screenshot({path:`/tmp/claude-0/s_${ancho}_${n}.png`, fullPage:false}); };
await shot('1entrada');
for(const [n, code] of Object.entries({'2reserva':"currentTab='reserva';renderApp()", '3takeaway':"currentTab='takeaway';renderApp()"})){
  await page.evaluate(code); await w(500); await shot(n);
}
// carta: añadir platos y pasar a carta
await page.evaluate(()=>{ try{ menuSetModo('carta'); }catch(e){} }); await w(300); await shot('4carta');
await page.evaluate(()=>{ const c=[...document.querySelectorAll('.ml-carpeta,[onclick*=menuAbrirSeccion],.cf-card')][0]; if(c) c.click(); }); await w(400); await shot('5carpeta');

await page.evaluate(()=>{ currentTab='takeaway'; renderApp(); }); await w(400);
await page.evaluate(()=>{ try{ menuSetModo('carta'); }catch(e){} }); await w(300);
await page.evaluate(()=>{ const c=document.querySelector('.menu-folder-card,.cs-tile'); if(c) c.click(); }); await w(500);
await page.evaluate(()=>{ for(let i=0;i<2;i++) document.querySelector('.dc-main').click(); document.querySelectorAll('.dc-main')[1]?.click(); }); await w(400);
await w(600); await shot('6platos');
await page.evaluate(()=>{ document.querySelector('.dc-i').click(); }); await w(400); await shot('7info');
await page.evaluate(()=>{ closeInfoModal(); menuSetModo('menus'); }); await w(300);
await page.evaluate(()=>{ openMenuModal(1); }); await w(400); await shot('8menu1');
await page.evaluate(()=>{ document.querySelector('input[name=menu-grupo-1]').click(); }); await w(700); await shot('9menu2');

await page.evaluate(()=>{ closeInfoModal(); resToken='abcdef123456xyz'; resListenerAttached=true; renderReservationStatus({status:'confirmada',date:todayStr(),time:'21:00',people:4}); }); await w(600); await shot('10resconf');
await page.evaluate(()=>{ toggleResEdit(true); }); await w(500); await shot('11resedit');
await page.evaluate(()=>{ trackToken='tok123456789abc'; renderTrackStatus({status:'preparando',tipo:'delivery',items:[{name:'Croquetas',qty:2,price:9.5}],total:21.5}); }); await w(600); await shot('12track');
await browser.close();
