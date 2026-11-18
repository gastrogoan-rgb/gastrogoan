import puppeteer from 'puppeteer-core';
import {semilla} from './_semilla-publica.mjs';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width:360, height:+(process.env.H||800), deviceScaleFactor:1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,600));
await page.evaluate((s) => { localStorage.setItem('gastrogoan_lang','es'); window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed:true})})}; businessInfoLoadedOnce = true; setLang('es'); renderHeader(); currentTab = null; renderApp(); }, semilla({}));
await new Promise(r=>setTimeout(r,500));
if(process.env.VIEW==='menus'){ await page.evaluate(()=>{ currentTab='takeaway'; renderApp(); }); await new Promise(r=>setTimeout(r,500)); await page.evaluate(()=>{ try{ wzState.step=1; menuSetModo('menus'); }catch(e){} }); await new Promise(r=>setTimeout(r,400)); }
await page.screenshot({path: process.env.OUT||'/tmp/claude-0/web.png', fullPage: false});
await browser.close();
