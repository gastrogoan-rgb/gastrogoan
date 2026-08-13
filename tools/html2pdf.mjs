// Imprime a PDF un HTML ya maquetado, usando el Chromium del sistema.
// Lo llama build_docs.py; no se usa por separado.
//
// El pie va aquí y no en el CSS porque Chromium solo permite repetir un
// encabezado o pie en todas las páginas a través de estas plantillas: con
// position:fixed en el HTML solo saldría en la primera.
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';

const [, , entrada, salida, titulo = 'GastroGoan', modo = 'normal'] = process.argv;
const privado = modo === 'privado';

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.goto(pathToFileURL(entrada).href, { waitUntil: 'networkidle0' });
// Las fuentes van incrustadas en base64, pero conviene esperar a que el
// motor las haya aplicado antes de medir la paginación.
await page.evaluateHandle('document.fonts.ready');

const pie = `
  <div style="width:100%;padding:0 20mm;font-family:'IBM Plex Mono',monospace;
              font-size:7pt;color:#8A857C;display:flex;justify-content:space-between;
              letter-spacing:.06em;">
    <span>${privado ? 'PRIVADO · ' : ''}${titulo}</span>
    <span class="pageNumber"></span>
  </div>`;

await page.pdf({
  path: salida,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: pie,
  margin: { top: '18mm', bottom: '20mm', left: '0', right: '0' },
});

await browser.close();
