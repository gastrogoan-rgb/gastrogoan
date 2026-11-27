// Genera el PDF A4 apaisado (2 caras) del tríptico desde triptico.html.
// Uso: node tools/triptico/imprimir.mjs [salida.pdf]
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.dirname(new URL(import.meta.url).pathname);
const salida = path.resolve(process.argv[2] || path.join(dir, 'triptico-gastrogoan.pdf'));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--allow-file-access-from-files'], headless: true});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(dir, 'triptico.html')).href, {waitUntil: 'networkidle0'});
await page.evaluateHandle('document.fonts.ready');
await page.pdf({path: salida, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true, margin: {top:0,right:0,bottom:0,left:0}});
await browser.close();
console.log('PDF:', salida);
