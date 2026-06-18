const { chromium } = require('playwright');
const path = require('path'); const fs=require('fs');
(async () => {
  const b = await chromium.launch({ args:['--force-device-scale-factor=2'] });
  const ctx = await b.newContext({ viewport:{width:794,height:1180}, deviceScaleFactor:2 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve('index.html'), { waitUntil:'networkidle' });
  await p.addStyleTag({ content:`body{background:#fff!important;margin:0!important}.page,.sheet{margin:0!important;box-shadow:none!important}.sheet{min-height:0!important}`});
  const MAX = 1088;
  const plan = await p.evaluate((MAX)=>{
    const out=[]; const blocks=[...document.querySelectorAll('.page,.sheet')];
    for(const blk of blocks){
      const isSheet=blk.classList.contains('sheet');
      const top=blk.getBoundingClientRect().top+window.scrollY;
      if(!isSheet){ out.push({top, h: blk.offsetHeight, full:true}); continue; }
      const kids=[...blk.children]; let cs=0, chunks=[];
      for(let k=0;k<kids.length;k++){
        const kTop=kids[k].offsetTop, kBot=kids[k].offsetTop+kids[k].offsetHeight;
        if(kBot-cs>MAX && kTop>cs){ chunks.push([cs, kids[k-1].offsetTop+kids[k-1].offsetHeight]); cs=kTop; }
      }
      const last=kids[kids.length-1]; chunks.push([cs, last.offsetTop+last.offsetHeight]);
      chunks.forEach((c)=> out.push({top: top+c[0], h: c[1]-c[0], full:false}));
    }
    return out;
  }, MAX);
  let i=0;
  for(const c of plan){
    await p.evaluate(y=>window.scrollTo(0,y), c.top);
    await p.screenshot({ path:`/tmp/ch_${String(i).padStart(3,'0')}.png`, clip:{x:0,y:0,width:794,height:Math.ceil(c.h)} });
    i++;
  }
  fs.writeFileSync('/tmp/plan.json', JSON.stringify(plan));
  await b.close(); console.log('CHUNKS', i);
})();
