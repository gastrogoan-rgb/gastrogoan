const { chromium } = require('playwright');
const path=require('path');
(async()=>{
  const b=await chromium.launch({args:['--force-device-scale-factor=3']});
  const ctx=await b.newContext({viewport:{width:400,height:400},deviceScaleFactor:3});
  const p=await ctx.newPage();
  await p.goto('file://'+path.resolve('index.html'),{waitUntil:'networkidle'});
  const el=await p.$('.cover-logo');
  await el.screenshot({path:'/tmp/logo.png', omitBackground:true});
  await b.close(); console.log('logo ok');
})();
