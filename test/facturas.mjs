// Adjuntar la factura de un gasto (1/10): foto o PDF, comprimida en el
// propio navegador y guardada como texto en SU PROPIO bloque de la base de
// datos (nunca dentro de un array que crece sin límite, igual que ya se
// hace con el PDF del Libro de marca). Tres sitios: Gastos Fijos, Gastos
// Variables al darlas de alta, y un cajón de "facturas sueltas" para
// cuando aún no sabes a qué compra pertenece.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(raiz, 'test', '.scratch-facturas');
fs.mkdirSync(scratch, {recursive: true});
const fotoPath = path.join(scratch, 'factura.jpg');
if(!fs.existsSync(fotoPath)){
  // JPEG mínimo pero real (1×1 rojo), de sobra para probar la subida y el
  // límite — la compresión de verdad (reescalar) ya se prueba aparte con
  // el tamaño real de una foto de móvil, que no hace falta repetir aquí.
  const b64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  fs.writeFileSync(fotoPath, Buffer.from(b64, 'base64'));
}
const pdfPath = path.join(scratch, 'factura.pdf');
if(!fs.existsSync(pdfPath)) fs.writeFileSync(pdfPath, '%PDF-1.4\n%fake\n');

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
page.on('dialog', d => d.accept());
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'FACTURASA1',tenantId:ggBizTenantId('FACTURASA1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
});

let ok=0, fallos=0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

await caso('Foto suelta: se sube, aparece en la lista y se puede usar para dar de alta una compra', async () => {
  await page.evaluate(() => { currentFolder='gestion'; navigate('economia'); GE.tab('variables'); });
  await new Promise(r=>setTimeout(r,300));
  const input = await page.$('#gv-suelta-input');
  await input.uploadFile(fotoPath);
  await new Promise(r=>setTimeout(r,500));
  const subida = await page.evaluate(() => {
    const ids = DB.facturasSueltas||[];
    return {n: ids.length, existe: ids.length ? !!facturaAdjunta(ids[0]) : false};
  });
  assert.equal(subida.n, 1, 'no aparece en Facturas sin asignar tras subirla');
  assert.ok(subida.existe, 'se guardó la lista de pendientes pero no el archivo en sí');

  await page.evaluate(() => GE.sueltaUsar((DB.facturasSueltas||[])[0]));
  await new Promise(r=>setTimeout(r,200));
  await page.evaluate(() => {
    document.getElementById('gv-f-prov').value = 'Proveedor Suelta';
    document.getElementById('gv-f-imp').value = '42.5';
    document.getElementById('gv-f-iva').value = '10';
    document.getElementById('gv-f-fecha').value = new Date().toISOString().slice(0,10);
    GE.saveGV();
  });
  await new Promise(r=>setTimeout(r,300));
  const r = await page.evaluate(() => {
    const v = DB.ge.variables.find(x => x.proveedor === 'PROVEEDOR SUELTA');
    return {facturaId: v?.facturaId, existeAdjunto: v ? !!facturaAdjunta(v.facturaId) : false, quedanSueltas: (DB.facturasSueltas||[]).length};
  });
  // Hallazgo real: sueltaUsar ponía el id ANTES de llamar a newGV(), que lo
  // borra al abrir el formulario en blanco — la foto "usada" se perdía.
  assert.ok(r.facturaId, 'al usar una foto suelta para dar de alta una compra, la compra se queda SIN factura (se perdió la referencia)');
  assert.ok(r.existeAdjunto, 'la compra apunta a un facturaId que ya no existe');
  assert.equal(r.quedanSueltas, 0, 'la foto usada debería salir de "Facturas sin asignar"');
});

await caso('Gastos Fijos: la factura sobrevive a editar otros campos, y se borra al borrar el gasto', async () => {
  await page.evaluate(() => { GE.tab('fijos'); GE.newGF('FIJOS'); });
  await new Promise(r=>setTimeout(r,200));
  const input = await page.$('#gf-factura-input');
  await input.uploadFile(fotoPath);
  await new Promise(r=>setTimeout(r,500));
  await page.evaluate(() => {
    document.getElementById('gf-f-nombre').value = 'Factura test GF';
    document.getElementById('gf-f-importe').value = '100';
    document.getElementById('gf-f-dia').value = '5';
    document.getElementById('gf-f-iva').value = '21';
    GE.saveGF();
  });
  await new Promise(r=>setTimeout(r,300));
  const creado = await page.evaluate(() => {
    const g = DB.ge.fijos.find(x => x.nombre === 'FACTURA TEST GF');
    return {id: g?.id, facturaId: g?.facturaId, existe: g ? !!facturaAdjunta(g.facturaId) : false};
  });
  assert.ok(creado.facturaId, 'el gasto fijo se guardó sin la factura adjuntada');
  assert.ok(creado.existe, 'el gasto apunta a una factura que no existe');

  // Reabrir y cambiar SOLO el importe: saveGF borra todas las claves del
  // objeto existente antes de reasignar — si facturaId no viajara en esa
  // reasignación, se perdería sin que nadie la hubiera tocado.
  await page.evaluate((id) => GE.editGF(id), creado.id);
  await new Promise(r=>setTimeout(r,200));
  await page.evaluate(() => { document.getElementById('gf-f-importe').value = '150'; GE.saveGF(); });
  await new Promise(r=>setTimeout(r,300));
  const editado = await page.evaluate(() => {
    const g = DB.ge.fijos.find(x => x.nombre === 'FACTURA TEST GF');
    return {importe: g.importe, facturaId: g.facturaId, existe: !!facturaAdjunta(g.facturaId)};
  });
  assert.equal(editado.importe, 150);
  assert.ok(editado.existe, 'al editar el importe, la factura adjunta desapareció');

  await page.evaluate((id) => { window.confirmModal = () => Promise.resolve(true); GE.deleteGF(id); }, creado.id);
  await new Promise(r=>setTimeout(r,500));
  const trasBorrar = await page.evaluate((fid) => ({existe: !!facturaAdjunta(fid)}), creado.facturaId);
  assert.ok(!trasBorrar.existe, 'al borrar el gasto, su factura se queda huérfana en la base de datos');
});

await caso('Un PDF también se puede adjuntar (no solo fotos)', async () => {
  await page.evaluate(() => GE.newGF('FIJOS'));
  await new Promise(r=>setTimeout(r,200));
  const input = await page.$('#gf-factura-input');
  await input.uploadFile(pdfPath);
  await new Promise(r=>setTimeout(r,500));
  const box = await page.evaluate(() => document.getElementById('gf-factura-box')?.innerHTML || '');
  assert.ok(box.includes('.pdf') || box.includes('factura.pdf'), 'no se ve el PDF adjuntado en el formulario: '+box.slice(0,120));
  await page.evaluate(() => { document.getElementById('gf-f-nombre').value='Con PDF'; document.getElementById('gf-f-importe').value='10'; document.getElementById('gf-f-dia').value='1'; document.getElementById('gf-f-iva').value='21'; });
});

await caso('Las fotos se comprimen antes de guardarse (lado largo ≤1600px)', async () => {
  await page.evaluate(async () => {
    // Genera una imagen de 2000×2000 en memoria (sin depender de un
    // archivo de prueba pesado) y la pasa por el mismo compresor.
    const canvas = document.createElement('canvas');
    canvas.width = 2000; canvas.height = 2000;
    canvas.getContext('2d').fillRect(0,0,2000,2000);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    window.__archivoGrande = new File([blob], 'grande.jpg', {type:'image/jpeg'});
  });
  const dims = await page.evaluate(() => new Promise(async (resolve) => {
    const r = await comprimirFotoFactura(window.__archivoGrande);
    const img = new Image();
    img.onload = () => resolve({w: img.width, h: img.height});
    img.src = r.dataUrl;
  }));
  assert.ok(dims.w <= 1600 && dims.h <= 1600, 'una foto de 2000×2000 no se redujo al comprimirla: '+JSON.stringify(dims));
});

await caso('Descargar facturas del mes: un ZIP de verdad, válido, con lo que corresponde dentro', async () => {
  const descargas = path.join(scratch, 'descargas');
  fs.rmSync(descargas, {recursive: true, force: true});
  fs.mkdirSync(descargas, {recursive: true});
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: descargas});
  // Un gasto fijo con factura, propio de este caso (no depender de que
  // otro caso anterior haya dejado uno sin borrar).
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width=20; canvas.height=20;
    canvas.getContext('2d').fillRect(0,0,20,20);
    const adjId = genId();
    DB['adj_'+adjId] = {dataUrl: canvas.toDataURL('image/jpeg',0.7), name:'alquiler.jpg', size:500, uploadedAt:new Date().toISOString()};
    DB.ge.fijos.push({id: genId(), nombre:'ALQUILER ZIP TEST', importe:500, categoria:'FIJOS', periodicidadMeses:1, facturaId: adjId});
    saveDB();
  });
  await page.evaluate(() => { currentFolder='gestion'; navigate('economia'); GE.openExportModal(); });
  await new Promise(r=>setTimeout(r,200));
  await page.evaluate(() => GE.downloadMonthInvoices());
  await new Promise(r=>setTimeout(r,1500));
  const files = fs.readdirSync(descargas).filter(f => f.endsWith('.zip'));
  assert.equal(files.length, 1, 'no se ha descargado ningún ZIP: '+JSON.stringify(fs.readdirSync(descargas)));
  // No basta con que exista el archivo: que sea un ZIP de VERDAD, legible
  // por una herramienta real (unzip del sistema), no solo "parece correcto"
  // a ojo contando bytes a mano.
  const zipPath = path.join(descargas, files[0]);
  const { execSync } = await import('node:child_process');
  execSync(`unzip -t "${zipPath}"`, {stdio: 'pipe'}); // lanza si el ZIP está corrupto
  const listado = execSync(`unzip -l "${zipPath}"`, {encoding: 'utf8'});
  assert.ok(/fijo.*ALQUILER/i.test(listado), 'falta la factura del gasto fijo en el ZIP:\n'+listado);
  assert.ok(/compra/i.test(listado), 'falta la factura de la compra en el ZIP:\n'+listado);
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
