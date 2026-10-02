// Previsión de módulos (estimación objetiva de IRPF + IVA simplificado),
// 1/10 (BOE-A-2025-25272, Orden HAC/1425/2025, hostelería). Comprueba que
// el motor reproduce EXACTAMENTE la fórmula oficial (Fases 1-4 del anexo),
// con el ejemplo trabajado a mano en la conversación que lo pidió:
// bar 673.2, 2 asalariados, el titular trabaja, 15 kW, 10 mesas, 6 m de
// barra, 1.500 € de amortización → 15.723,27 € de rendimiento anual,
// 628,93 €/trimestre (4%, por tener más de 1 asalariado).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'MODULOST1',tenantId:ggBizTenantId('MODULOST1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
let ok=0, fallos=0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.employees = [{id:1,name:'A',active:true},{id:2,name:'B',active:true},{id:3,name:'C',active:false}];
  // Se elige en Mi Negocio (ver test del gate, más abajo) — aquí ya puesto
  // para poder probar el motor y el panel de verdad.
  DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'modulos';
  currentFolder='gestion'; navigate('economia'); GE.tab('modulos');
});

await caso('Bar (673.2) con 2 asalariados, titular trabajando: coincide con el cálculo oficial a mano', async () => {
  const r = await page.evaluate(() => {
    GE.saveModulosField('epigrafe','673.2');
    GE.saveModulosField('mesas','10');
    GE.saveModulosField('kw','15');
    GE.saveModulosField('barra','6');
    GE.saveModulosField('titularTrabaja', true, true);
    GE.saveModulosField('amortizacionAnual','1500');
    return GE.calcModulos();
  });
  assert.equal(r.asalariados, 2, 'cuenta los 3 empleados en vez de los 2 activos');
  assert.ok(Math.abs(r.rendimientoAnual - 15723.27) < 0.5, 'rendimientoAnual='+r.rendimientoAnual);
  assert.ok(Math.abs(r.pagoTrimestralIrpf - 628.93) < 0.5, 'pagoTrimestralIrpf='+r.pagoTrimestralIrpf);
  assert.equal(r.pctPago, 0.04, 'con 2 asalariados el pago fraccionado debe ser el 4%, no '+(r.pctPago*100)+'%');
  return `rendimiento=${r.rendimientoAnual.toFixed(2)} · trimestral=${r.pagoTrimestralIrpf.toFixed(2)}`;
});

await caso('Sin empleados, el pago fraccionado baja al 2% (y con 1, al 3%)', async () => {
  const r = await page.evaluate(() => {
    GE.saveModulosField('personalOverride','0');
    const sinEmpleados = GE.calcModulos();
    GE.saveModulosField('personalOverride','1');
    const unEmpleado = GE.calcModulos();
    GE.saveModulosField('personalOverride','');
    return {sinEmpleados: sinEmpleados.pctPago, unEmpleado: unEmpleado.pctPago};
  });
  assert.equal(r.sinEmpleados, 0.02);
  assert.equal(r.unEmpleado, 0.03);
});

await caso('El IVA soportado real de las compras SÍ se descuenta, con el suelo de la cuota mínima', async () => {
  const r = await page.evaluate(() => {
    if(!DB.ge.variables) DB.ge.variables = [];
    DB.ge.variables.push({id:genId(), mes:0, año:new Date().getFullYear(), categoria:'MATERIA PRIMA', proveedor:'Prov', importe:3000, iva:10, fecha:`${new Date().getFullYear()}-01-10`, pagada:true});
    return GE.calcModulos();
  });
  // cuotaDevengada 673.2 con 2 asalariados+titular, 15kW, 10 mesas, 6m barra = 9.394,25
  assert.ok(Math.abs(r.cuotaDevengada - 9394.25) < 0.5, 'cuotaDevengada='+r.cuotaDevengada);
  assert.ok(Math.abs(r.ivaSoportadoAnual - 300) < 0.5, 'no descuenta el IVA real de las compras (300€)');
  assert.ok(Math.abs(r.ivaAnual - 9000.31) < 0.5, 'ivaAnual='+r.ivaAnual);
  assert.ok(Math.abs(r.cuotaMinima - 563.66) < 0.5, 'la cuota mínima de 673.2 (6%) no es la correcta: '+r.cuotaMinima);
});

await caso('El comparador usa el beneficio real del negocio, no un número fijo', async () => {
  const r = await page.evaluate(() => {
    DB.sales = Array.from({length:12}).map((_,m)=>({id:genId(), date:`${new Date().getFullYear()}-${String(m+1).padStart(2,'0')}-10`, total:10000, metodo:'Efectivo', items:[{name:'Menú',price:10,qty:1000,ivaPct:10}]}));
    GE.renderModulos();
    return document.getElementById('ge-modulos-body').innerText;
  });
  assert.ok(!/DIRECTA[\s\S]{0,20}0,00 €/.test(r), 'el comparador sigue mostrando 0,00€ con ventas reales cargadas');
});

await caso('Las cifras oficiales de los 5 epígrafes de hostelería están verificadas contra el BOE (Orden HAC/1425/2025)', async () => {
  const vals = await page.evaluate(() => GE.modulosEpigrafes());
  assert.equal(vals['671.4'].irpf.asalariado, 3709.88);
  assert.equal(vals['671.5'].irpf.mesa, 220.45);
  assert.equal(vals['672'].iva.kw, 124.00);
  assert.equal(vals['673.1'].irpf.barra, 371.62);
  assert.equal(vals['673.2'].excesoIrpf, 19084.78);
});

await caso('Se decide en Mi Negocio: oculta por defecto, visible solo para autónomo en módulos, nunca para sociedad', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    DB.business.formaJuridica = null; DB.business.regimenFiscal = null;
    currentFolder='gestion'; navigate('economia');
    out.ocultaSinElegir = document.getElementById('ge-tab-modulos').style.display === 'none';
    DB.business.formaJuridica = 'sociedad'; DB.business.regimenFiscal = null;
    navigate('economia');
    out.ocultaConSociedad = document.getElementById('ge-tab-modulos').style.display === 'none';
    GE.tab('cdr');
    out.labelSociedad = document.getElementById('res-pct-impuesto-label').textContent;
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa';
    navigate('economia');
    out.ocultaAutonomoDirecta = document.getElementById('ge-tab-modulos').style.display === 'none';
    DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'modulos';
    navigate('economia');
    out.visibleAutonomoModulos = document.getElementById('ge-tab-modulos').style.display !== 'none';
    GE.tab('cdr');
    out.notaModulos = document.getElementById('res-pct-impuesto-nota').innerText;
    return out;
  });
  assert.ok(r.ocultaSinElegir, 'sin elegir nada en Mi Negocio, la pestaña Módulos no debería verse');
  assert.ok(r.ocultaConSociedad, 'una sociedad no puede ver la pestaña Módulos (eso es solo de personas físicas)');
  assert.equal(r.labelSociedad, 'Impuesto de Sociedades', 'con sociedad, la etiqueta del CDR debe decir Impuesto de Sociedades');
  assert.ok(r.ocultaAutonomoDirecta, 'un autónomo en estimación directa no debería ver la pestaña Módulos');
  assert.ok(r.visibleAutonomoModulos, 'un autónomo en módulos SÍ debe ver la pestaña');
  assert.ok(r.notaModulos.includes('Módulos'), 'con módulos, el CDR debe avisar de que el impuesto real está en la pestaña Módulos');
});


await caso('Comunidad de Bienes: tributa cada comunero por SU IRPF, no un % único del negocio', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'cb';
    DB.business.comuneros = [{nombre:'Ana', pct:60, tipoIrpf:30}, {nombre:'Luis', pct:40, tipoIrpf:19}];
    currentFolder='gestion'; navigate('economia'); GE.tab('cdr');
    return {
      filaOculta: document.getElementById('res-pct-impuesto-row').style.display === 'none',
      pctEfectivo: Math.round(GE.pctEfectivo()*1000)/10,
      nota: document.getElementById('res-pct-impuesto-nota').innerText,
    };
  });
  assert.ok(r.filaOculta, 'el campo de impuesto único sigue visible con una Comunidad de Bienes');
  assert.equal(r.pctEfectivo, 25.6, '60%×30% + 40%×19% debe dar 25,6%: '+r.pctEfectivo);
  assert.ok(r.nota.includes('comunero'), 'falta explicar que tributa cada comunero, no la CB');
});

await caso('Sociedad: sugiere el tipo real (Ley 7/2024), no un 25% plano siempre', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'sociedad';
    DB.business.anyo = String(new Date().getFullYear());
    currentFolder='gestion'; navigate('economia'); GE.tab('cdr');
    const nueva = document.getElementById('res-pct-impuesto-nota').innerText;
    DB.business.anyo = String(new Date().getFullYear() - 10);
    GE.tab('cdr');
    const vieja = document.getElementById('res-pct-impuesto-nota').innerText;
    return {nueva, vieja};
  });
  assert.ok(r.nueva.includes('15%'), 'un negocio recién dado de alta debería sugerir el 15% de nueva creación: '+r.nueva);
  assert.ok(!r.vieja.includes('15%'), 'un negocio de hace 10 años no debería seguir sugiriendo el 15% de nueva creación: '+r.vieja);
});

await caso('Cooperativa: avisa de que no se calcula, no inventa un tipo', async () => {
  const r = await page.evaluate(() => {
    DB.business.formaJuridica = 'cooperativa';
    currentFolder='gestion'; navigate('economia'); GE.tab('cdr');
    return document.getElementById('res-pct-impuesto-nota').innerText;
  });
  assert.ok(r.includes('gestoría') || r.includes('gestoria'), 'la cooperativa debería remitir a la gestoría, no calcular un tipo inventado: '+r);
});

await caso('El selector de Mi Negocio ofrece las formas jurídicas reales (autónomo, CB, sociedad, cooperativa)', async () => {
  const opciones = await page.evaluate(() => {
    DB.business.formaJuridica = null;
    navigate('minegocio');
    return [...document.getElementById('mn-forma-juridica').options].map(o => o.value).filter(Boolean);
  });
  assert.deepEqual(opciones, ['autonomo','cb','sociedad','cooperativa']);
});

await caso('La pestaña y sus textos están en los tres idiomas', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    ['es','en','ca'].forEach(l => { setLang ? setLang(l) : (currentLang = l); out[l] = t('hr.modulos.irpfTitle'); });
    return out;
  });
  assert.notEqual(r.es, r.en, 'el texto en inglés es idéntico al español — falta traducir');
  assert.notEqual(r.es, r.ca, 'el texto en catalán es idéntico al español — falta traducir');
  assert.ok(!/^hr\.modulos/.test(r.en) && !/^hr\.modulos/.test(r.ca), 'falta alguna clave de traducción, sale la clave en crudo');
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
