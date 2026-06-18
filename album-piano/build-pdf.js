const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve('index.html'), { waitUntil:'networkidle' });
  await p.pdf({ path:'El-Cuaderno-del-Pianista-TClas.pdf', format:'A4', printBackground:true, preferCSSPageSize:true });
  await b.close(); console.log('PDF OK');
})();
