const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args:['--force-device-scale-factor=2','--high-dpi-support=1'] });
  const ctx = await b.newContext({ viewport:{width:794,height:1123}, deviceScaleFactor:2 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve('index.html'), { waitUntil:'networkidle' });
  await p.addStyleTag({ content:`
    body{background:#fff!important}
    .page,.sheet{margin:0!important;box-shadow:none!important}
    .sheet{min-height:0!important}
    .page:not(.cover){height:auto!important;min-height:0!important}
  `});
  const blocks = await p.$$('.page, .sheet');
  let i=0;
  for (const el of blocks){ await el.screenshot({ path:`/tmp/blk_${String(i).padStart(3,'0')}.png` }); i++; }
  await b.close();
  console.log('IMG', i);
})();
