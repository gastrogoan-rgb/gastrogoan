const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve('index.html'), { waitUntil:'networkidle' });
  await p.pdf({ path:'Cuaderno-HTML.pdf', format:'A4', printBackground:true, preferCSSPageSize:true });
  await b.close(); console.log('ok');
})();
