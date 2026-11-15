import puppeteer from 'puppeteer-core';
const [,, pagina, ancho='1440', alto='900', max='8', pref='x'] = process.argv;
const b=await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:'new'});
const w=+ancho,h=+alto,m=w<700;
const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:m,hasTouch:m});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',x=>{if(x.type()==='error')errs.push(x.text())});
await p.goto('http://127.0.0.1:8957/'+pagina,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,800));
const alto2=await p.evaluate(()=>document.documentElement.scrollHeight);
const nf=Math.min(+max,Math.ceil(alto2/(h*0.95)));
console.log(pagina,w,'alto',alto2,'frames',nf,'errores',JSON.stringify(errs));
for(let i=0;i<nf;i++){ await p.evaluate(y=>window.scrollTo(0,y),i*h*0.95); await new Promise(r=>setTimeout(r,900)); await p.screenshot({path:`/tmp/claude-0/${pref}-${w}-${String(i+1).padStart(2,'0')}.png`}); }
await b.close();
