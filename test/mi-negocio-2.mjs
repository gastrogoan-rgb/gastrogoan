// Mi Negocio (2/11): sesión que no caduca a la hora, zonas sin plazas, días cerrados, códigos postales, colores de marca,
// enlace de reservas fijado, € en la impresora térmica y cajón en los dos pines.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:900});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MINEG002', tenantId: ggBizTenantId('MINEG002')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('minegocio');
});
await new Promise(r => setTimeout(r, 600));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('La sesión caduca por inactividad a las 8 h (propietario) y 12 h (empleado), no a la hora; y la pantalla de acceso dice por qué', async () => {
  const r = await page.evaluate(() => {
    const h = 3600 * 1000, out = {};
    setAccessSession({type:'owner', ts:Date.now()});
    const poner = horas => localStorage.setItem(ACCESS_LAST_ACTIVITY_LS, String(Date.now() - horas * h));
    poner(2); out.o2 = isAccessSessionExpiredByInactivity(); poner(7); out.o7 = isAccessSessionExpiredByInactivity(); poner(9); out.o9 = isAccessSessionExpiredByInactivity();
    setAccessSession({type:'employee', employeeId:1, area:'cocina', ts:Date.now()});
    poner(11); out.e11 = isAccessSessionExpiredByInactivity(); poner(13); out.e13 = isAccessSessionExpiredByInactivity();
    clearAccessSession('inactividad');
    out.aviso = /muchas horas/.test(accesoAvisoCierreHtml());
    setAccessSession({type:'owner', ts:Date.now()}); out.limpio = accesoAvisoCierreHtml() === '';
    return out;
  });
  assert.deepEqual(r, {o2:false, o7:false, o9:true, e11:false, e13:true, aviso:true, limpio:true});
});

await caso('Crear una zona pide solo nombre y nº de mesas; cada mesa nace con plazas', async () => {
  const r = await page.evaluate(async () => {
    DB.tables.length = 0; renderMiNegocio();
    const sinCampo = !document.getElementById('mn-zona-plazas');
    document.getElementById('mn-zona-nombre').value = 'Terraza'; document.getElementById('mn-zona-cantidad').value = '3';
    await addZonaConMesas();
    return {sinCampo, n: DB.tables.length, plazas: DB.tables.map(t => t.plazas)};
  });
  assert.ok(r.sinCampo); assert.equal(r.n, 3); assert.deepEqual(r.plazas, [4, 4, 4]);
});

await caso('Días cerrados: la app y la web tratan esas fechas como cerradas, con aviso si hay reservas; quitar el cierre lo reabre', async () => {
  const r = await page.evaluate(() => {
    DB.business.horario = defaultHorario().map(d => ({...d, abierto:true, modo:'seguido', seguido:{ini:'12:00', fin:'23:00'}}));
    const d = new Date(Date.now() + 5 * 864e5), f = x => x.toISOString().slice(0, 10);
    const dia = f(d), dia2 = f(new Date(d.getTime() + 864e5)), fuera = f(new Date(d.getTime() + 5 * 864e5));
    renderMiNegocio();
    document.getElementById('dc-desde').value = dia; document.getElementById('dc-hasta').value = dia2; document.getElementById('dc-motivo').value = 'Vacaciones';
    anadirDiaCerrado();
    const out = {cerrado: getTurnosForDate(dia).length === 0 && getTurnosForDate(dia2).length === 0, abierto: getTurnosForDate(fuera).length > 0, espejo: negocioParaElEspejoPublico().diasCerrados.length === 1, lista: document.querySelectorAll('.dc-fila').length};
    quitarDiaCerrado(DB.business.diasCerrados[0].id);
    out.reabre = getTurnosForDate(dia).length > 0;
    return out;
  });
  assert.deepEqual(r, {cerrado:true, abierto:true, espejo:true, lista:1, reabre:true});
});

await caso('Códigos postales: se leen con espacios y saltos, se validan (5 cifras, provincia 01-52) y se ordenan sin repetir', async () => {
  const r = await page.evaluate(() => ({a: parseCpList('28001, 28002  28001\n08001;46001'), b: parseCpList('2800, 28 001, 99001, 00100, 52001')}));
  assert.deepEqual(r.a, {validos:['08001','28001','28002','46001'], invalidos:[]});
  assert.deepEqual(r.b.invalidos, ['2800', '28', '001', '99001', '00100']); assert.deepEqual(r.b.validos, ['52001']);
});

await caso('Colores de marca: el contraste se vigila, se oscurece lo que no se lee y se ofrecen los del logo', async () => {
  const r = await page.evaluate(async () => {
    const amarillo = '#F2C200', osc = ggOscurecerHasta(amarillo, 4.5);
    const logo = (() => { const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 40, 40); x.fillStyle = '#C0392B'; x.fillRect(0, 0, 20, 40); x.fillStyle = '#2E5E8C'; x.fillRect(20, 0, 20, 20); return c.toDataURL(); })();
    const cols = await ggColoresDeImagen(logo, 5);
    DB.business.logo = logo; DB.business.brandColor = amarillo; renderMiNegocio(); await new Promise(r => setTimeout(r, 300));
    return {malo: ggContrasteHex(amarillo, '#FFFFFF') < 4.5, ok: ggContrasteHex(osc, '#FFFFFF') >= 4.5, cols, aviso: !!document.querySelector('.bc-bloque .manual-warning'), sugeridos: document.querySelectorAll('.bc-sug').length, campo2: !!document.getElementById('mn-brand-color2'), publico: negocioParaElEspejoPublico().brandColor2 !== undefined || true};
  });
  assert.ok(r.malo && r.ok && r.aviso && r.campo2, JSON.stringify(r)); assert.ok(r.cols.length >= 2, JSON.stringify(r)); assert.ok(r.sugeridos >= 2, JSON.stringify(r));
});

await caso('Enlace de reservas fijado por GastroGoan: el campo sale bloqueado y no se puede cambiar', async () => {
  const r = await page.evaluate(async () => {
    DB.business.publicSlug = 'casa-paco'; DB.business.publicSlugFijado = true; renderMiNegocio();
    const campo = document.getElementById('mn-public-slug');
    if(!campo) return {sinCampo: true};
    campo.value = 'otro'; await savePublicSlug();
    return {ro: campo.readOnly, sinBoton: !document.querySelector('#mn-public-slug ~ button.btn-primary'), sigue: DB.business.publicSlug, candado: !!document.querySelector('.ti-lock')};
  });
  assert.ok(!r.sinCampo, 'la tarjeta del enlace no se pinta (sin licencia/nube en la prueba)'); assert.ok(r.ro && r.sinBoton && r.sigue === 'casa-paco', JSON.stringify(r));
});

await caso('Impresora térmica: el € sale como byte de CP858 (o «EUR» en el juego clásico) y el cajón manda los dos pulsos', async () => {
  const r = await page.evaluate(() => {
    setPrintCodepage('cp858'); const a = [...textToEscPos('12,50 €')];
    setPrintCodepage('cp437'); const b = String.fromCharCode(...[...textToEscPos('12,50 €')].slice(5, 14));
    setPrintCodepage('cp858'); const c = [...textToEscPos('Ñandú À')];
    return {a, b, c, kick: [...CASH_DRAWER_KICK]};
  });
  assert.equal(r.a[3], 0x74); assert.equal(r.a[4], 0x13); assert.ok(r.a.includes(0xD5) && !r.a.includes(0x3F), 'el € debe ir como 0xD5 y no como ?');
  assert.ok(/12,50 EUR/.test(r.b), r.b); assert.ok(r.c.includes(0xA5) && r.c.includes(0xB7), JSON.stringify(r.c));
  assert.deepEqual(r.kick, [0x1B,0x70,0x00,0x19,0xFA,0x1B,0x70,0x01,0x19,0xFA]);
});

await caso('IRPF del autónomo en estimación directa: la reducción de 6.498 € (art. 32.1, desde 2023) se aplica hasta 19.747,50 € y solo con otras rentas ≤ 6.500 €', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa'; DB.business.modalidadDirecta = 'simplificada'; DB.business.otrasRentasTitular = 0; DB.business.hijosTitular = 0; DB.business.inicioActividad20 = false;
    const bajo = irpfActividad(10000), medio = irpfActividad(18000), alto = irpfActividad(25000);
    DB.business.otrasRentasTitular = 10000; const conOtras = irpfActividad(10000);
    return {bajo, medio, alto, conOtras, red: [reduccionActividadesEconomicas(14047.5), reduccionActividadesEconomicas(19747.5), Math.round(reduccionActividadesEconomicas(17000))]};
  });
  assert.equal(r.bajo, 0, 'con 10.000 € de rendimiento y las dos reducciones, no hay cuota: ' + JSON.stringify(r));
  assert.ok(Math.abs(r.medio - 1702.7) < 2, 'con 18.000 € la cuota ronda 1.703 €: ' + JSON.stringify(r));
  assert.ok(r.alto > 3000, JSON.stringify(r)); assert.ok(r.conOtras > 0, 'con otras rentas de 10.000 € ya no se aplica: ' + JSON.stringify(r));
  assert.deepEqual(r.red, [6498, 0, 3132]);
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, [], errs.join(' | ')); });
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron');
if(fallos) process.exitCode = 1;
await browser.close();
