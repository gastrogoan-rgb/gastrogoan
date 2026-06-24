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
  // iPhone-like viewport
  await page.setViewport({ width: 390, height: 844 });

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

  // Create test data
  await page.evaluate(() => {
    for(let i = 1; i <= 6; i++) DB.tables.push({id: 100+i, name: `Mesa ${i}`, zona: 'interior'});
    DB.cartas.push({
      id: 200, nombre: 'Carta Principal', area: 'cocina', horarios: [],
      secciones: [{id: 301, nombre: 'Entrantes', icon: '🥗', platos: [
        {id: 401, nombre: 'Ensalada mixta', precio: 8.50, visible: true},
        {id: 402, nombre: 'Croquetas caseras', precio: 9.00, visible: true},
        {id: 403, nombre: 'Patatas bravas', precio: 7.50, visible: true},
      ]}, {id: 302, nombre: 'Segundos', icon: '🥩', platos: [
        {id: 404, nombre: 'Entrecot de ternera', precio: 18.50, visible: true},
      ]}]
    });
    DB.cartas.push({
      id: 210, nombre: 'Bebidas', area: 'sala', horarios: [],
      secciones: [{id: 310, nombre: 'Bebidas', icon: '🍺', platos: [
        {id: 410, nombre: 'Cerveza', precio: 3.00, visible: true},
      ]}]
    });
    DB.tpvOrders.push({
      id: 500, tableId: 101, tipo: 'mesa', pax: 4, status: 'abierta',
      items: [
        {secId:301, id:401, name:'Ensalada mixta', price:8.50, qty:2, tanda:'Entrantes', estado:'cocina', enviadoAt:new Date().toISOString()},
        {secId:301, id:402, name:'Croquetas caseras', price:9.00, qty:1, tanda:'Entrantes', estado:'preparando', enviadoAt:new Date().toISOString()},
        {secId:302, id:404, name:'Entrecot de ternera', price:18.50, qty:2, tanda:'Segundos'},
        {secId:310, id:410, name:'Cerveza', price:3.00, qty:4, bebida:true, tanda:'Bebidas', estado:'entregado'},
      ],
      tandas: ['Entrantes','Segundos','Bebidas'], createdAt: new Date().toISOString()
    });
    DB.employees.push({id:1, name:'Ana García', area:'sala', color:'#E74C3C'});
    DB.employees.push({id:2, name:'Carlos López', area:'cocina', color:'#3498DB'});
    saveDB();
  });
  await new Promise(r => setTimeout(r, 300));

  const views = [
    { name: 'home', fn: () => navigate('home') },
    { name: 'sala', fn: () => openFolder('sala') },
    { name: 'cocina', fn: () => openFolder('cocina') },
    { name: 'gestion', fn: () => openFolder('gestion') },
    { name: 'tpv', fn: () => navigate('tpv') },
    { name: 'comandas', fn: () => navigate('comandascocina') },
    { name: 'limpieza', fn: () => navigate('limpieza') },
    { name: 'pedidos', fn: () => navigate('pedidos') },
    { name: 'personal', fn: () => navigate('personal') },
    { name: 'negocio', fn: () => navigate('minegocio') },
    { name: 'economia', fn: () => navigate('economia') },
  ];

  for (const v of views) {
    try {
      await page.evaluate(v.fn);
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: `${scratchpad}/mobile-${v.name}.png`, fullPage: false });
      console.log(`Screenshot: ${v.name}`);
    } catch(e) { console.log(`${v.name} error:`, e.message); }
  }

  // Open comanda modal at tablet width
  try {
    await page.setViewport({ width: 1024, height: 768 });
    await page.evaluate(() => {
      DB.activeCartaIds = DB.cartas.map(c => c.id);
      saveDB();
      navigate('tpv');
    });
    await new Promise(r => setTimeout(r, 500));
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.evaluate(() => {
      const order = DB.tpvOrders.find(o => o.id === 500);
      console.log('ITEMS:', JSON.stringify(order.items.map(l => ({name:l.name, bebida:l.bebida, tanda:l.tanda}))));
      openTableOrder(101);
      const overlay = document.getElementById('modal-overlay');
      if(overlay) { overlay.classList.remove('hide'); overlay.style.display = ''; }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: `${scratchpad}/tablet-comanda-modal.png`, fullPage: false });
    console.log('Screenshot: tablet comanda modal');
    await page.setViewport({ width: 390, height: 844 });
  } catch(e) { console.log('comanda error:', e.message); }

  await browser.close();
  server.close();
  console.log('Done!');
});
