const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const scratchpad = '/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad';

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml'}[ext] || 'text/plain';
  if(res.headersSent) return;
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': mime});
    res.end(data);
  } catch(e) {
    if(!res.headersSent){ res.writeHead(404); res.end('Not found'); }
  }
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(`http://127.0.0.1:${port}/`);
  await new Promise(r => setTimeout(r, 500));

  const licKey = await page.evaluate(() => {
    const name = 'TESTRESTAURANT';
    return `${name}-${ggLicSig(name)}-ABCD-E123-45FG-HIJ6-7890`;
  });
  await page.evaluate((key) => {
    localStorage.setItem('gg_license', JSON.stringify({key}));
    const biz = JSON.parse(localStorage.getItem('gg_business') || '{}');
    biz.netlifySetupDone = true;
    biz.netlifyUrl = 'https://test.netlify.app';
    biz.tourSeen = true;
    biz.ownFirebase = { apiKey: 'AIzaSyTest', databaseURL: 'https://test-default-rtdb.firebaseio.com' };
    localStorage.setItem('gg_business', JSON.stringify(biz));
    localStorage.setItem('gg_onboarding_role', 'staff');
  }, licKey);

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    document.querySelectorAll('[id$="-gate"], #business-select-screen, .modal-overlay').forEach(el => {
      el.style.display = 'none'; el.classList.add('hide');
    });
    if(typeof hideBusinessSelectScreen === 'function') hideBusinessSelectScreen();
    if(typeof closeModal === 'function') closeModal();
    DB.business.netlifySetupDone = true;
    DB.business.tourSeen = true;
    DB.business.ownFirebase = { apiKey: 'AIzaSyTest', databaseURL: 'https://test-default-rtdb.firebaseio.com' };
  });
  await new Promise(r => setTimeout(r, 300));

  // Populate financial data
  await page.evaluate(() => {
    const month = new Date().getMonth();
    const today = new Date().toISOString().slice(0,10);

    // Sales data for current month
    for(let i = 0; i < 25; i++){
      const day = String(i+1).padStart(2,'0');
      const date = `${new Date().getFullYear()}-${String(month+1).padStart(2,'0')}-${day}`;
      DB.sales.push({
        id: 5000+i, date, total: 800 + Math.floor(i*50), metodoPago: 'Efectivo',
        items: [{name:'Comida', price: 800+i*50, qty:1}],
        createdAt: date+'T14:00:00Z'
      });
    }

    // Fixed expenses (gastos fijos)
    DB.ge.fijos = [
      {id:1, concepto:'ALQUILER', categoria:'FIJOS', importe:1500, iva:21, periodo:'mensual'},
      {id:2, concepto:'ELECTRICIDAD', categoria:'FIJOS', importe:400, iva:21, periodo:'mensual'},
      {id:3, concepto:'GAS', categoria:'FIJOS', importe:200, iva:21, periodo:'mensual'},
      {id:4, concepto:'AGUA', categoria:'FIJOS', importe:80, iva:10, periodo:'mensual'},
      {id:5, concepto:'INTERNET/TELEFONÍA', categoria:'FIJOS', importe:60, iva:21, periodo:'mensual'},
      {id:6, concepto:'SEGURO DEL LOCAL', categoria:'FIJOS', importe:150, iva:21, periodo:'mensual'},
      {id:7, concepto:'GESTORÍA', categoria:'FIJOS', importe:200, iva:21, periodo:'mensual'},
      {id:10, concepto:'RETRIBUCIÓN EMPRESARIO', categoria:'PERSONAL', importe:2500, iva:0, periodo:'mensual'},
      {id:11, concepto:'CUOTA AUTÓNOMOS (RETA)', categoria:'PERSONAL', importe:350, iva:0, periodo:'mensual'},
      {id:12, concepto:'SUELDO BRUTO PERSONAL', categoria:'PERSONAL', importe:4800, iva:0, periodo:'mensual'},
      {id:13, concepto:'SS EMPRESA', categoria:'PERSONAL', importe:1500, iva:0, periodo:'mensual'},
    ];

    // Variable expenses
    const m = month;
    const y = new Date().getFullYear();
    DB.ge.variables = [
      {id:20, concepto:'MATERIA PRIMA', categoria:'MATERIA PRIMA', proveedor:'PROVEEDOR1', mes:m, año:y, importe:3200, iva:10},
      {id:21, concepto:'BEBIDAS', categoria:'BEBIDAS', proveedor:'PROVEEDOR2', mes:m, año:y, importe:1800, iva:21},
      {id:22, concepto:'CAFÉ/INFUSIONES', categoria:'CAFÉ/INFUSIONES', proveedor:'PROVEEDOR3', mes:m, año:y, importe:400, iva:21},
      {id:23, concepto:'PACKAGING', categoria:'PACKAGING', proveedor:'PROVEEDOR1', mes:m, año:y, importe:250, iva:21},
      {id:24, concepto:'LIMPIEZA', categoria:'LIMPIEZA', proveedor:'PROVEEDOR1', mes:m, año:y, importe:180, iva:21},
    ];

    // Distribution percentages
    DB.ge.config.distPct = {per:35, gf:15, mp:25, og:5, ben:20};
    DB.ge.config.pctImpuestoBeneficio = 25;

    saveDB();
  });
  await new Promise(r => setTimeout(r, 300));

  // Navigate to economia and tesoreria tab
  await page.evaluate(() => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-economia');
    if(target) target.classList.add('active');
    GE.tab('tesoreria');
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: `${scratchpad}/tesoreria-desktop.png`, fullPage: true });
  console.log('Screenshot: tesoreria desktop');

  // Also tablet
  await page.setViewport({ width: 768, height: 1024 });
  await page.evaluate(() => { GE.tab('tesoreria'); });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${scratchpad}/tesoreria-tablet.png`, fullPage: true });
  console.log('Screenshot: tesoreria tablet');

  await browser.close();
  server.close();
  console.log('Done!');
});
