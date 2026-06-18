const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve('index.html'), { waitUntil:'networkidle' });
  await p.addStyleTag({ content:`
    body{background:#fff!important}
    .page,.sheet{margin:0!important;box-shadow:none!important}
    .page{break-before:auto!important; break-after:page!important}
    .page:not(.cover){height:auto!important;min-height:0!important}
    .page:last-child{break-before:page!important; break-after:auto!important}
    .sheet{min-height:0!important; break-before:auto!important}
    .day-head{margin-top:4px; break-before:auto}
  `});
  await p.emulateMedia({media:'screen'});
  await p.pdf({ path:'El-Cuaderno-del-Pianista-TClas.pdf', format:'A4', printBackground:true, margin:{top:'0',right:'0',bottom:'0',left:'0'} });
  await b.close(); console.log('PDF OK');
})();
