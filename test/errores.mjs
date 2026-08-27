// R15 — Los caminos de error: lo que le pasa a un cliente confundido.
//
// Hasta ahora solo se probaba el camino feliz. Aquí se comprueba que la
// app RECHAZA lo que tiene que rechazar y lo dice de forma entendible, en
// vez de dejar pasar o quedarse muda.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push({ok:true}); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push({ok:false}); }
}

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
await page.setCacheEnabled(false);
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'ERROR001',tenantId:ggBizTenantId('ERROR001')}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.pin = hashPin('9999','ERROR001');
  // Dos empleados: uno activo y otro dado de baja
  DB.employees=[
    {id:1,name:'Ana Fernández',rol:'Cocinera',area:'cocina',active:true,color:'#DF7039',pin:hashPin('1234','ERROR001')},
    {id:2,name:'Pedro Baja',rol:'Camarero',area:'sala',active:false,color:'#4A5D4E',pin:hashPin('5678','ERROR001')},
  ];
  const slots=getBusinessSlots();
  slots[0].code='ERROR001';
  saveBusinessSlots(slots);
  saveDB();
});

const avisos = () => page.evaluate(()=>{ const a=window.__avisos||[]; window.__avisos=[]; return a; });
await page.evaluate(()=>{ window.__avisos=[]; const o=window.showToast; window.showToast=m=>{window.__avisos.push(m); if(o)o(m);}; });

/* ─── PIN de empleado equivocado ─── */
await caso('Un PIN de empleado equivocado no deja entrar', async ()=>{
  const r = await page.evaluate(()=> pinMatchesEmployeeOrBusiness('0000', DB.employees[0]));
  assert.equal(r,false,'un PIN que no es el suyo no debería valer');
  return 'rechazado';
});
await caso('El PIN correcto del empleado sí deja entrar', async ()=>{
  const r = await page.evaluate(()=> pinMatchesEmployeeOrBusiness('1234', DB.employees[0]));
  assert.equal(r,true);
  return 'aceptado';
});
await caso('El PIN del NEGOCIO sirve de atajo (se olvidó el suyo)', async ()=>{
  const r = await page.evaluate(()=> pinMatchesEmployeeOrBusiness('9999', DB.employees[0]));
  assert.equal(r,true,'el PIN del negocio debería servir como atajo deliberado');
  return 'aceptado, es el atajo previsto';
});
await caso('Un empleado DADO DE BAJA no entra ni con el PIN del negocio', async ()=>{
  const conSuPin = await page.evaluate(()=> pinMatchesEmployeeOrBusiness('5678', DB.employees[1]));
  const conElDelNegocio = await page.evaluate(()=> pinMatchesEmployeeOrBusiness('9999', DB.employees[1]));
  assert.equal(conSuPin,false,'dar de baja debe bloquear el acceso de verdad');
  assert.equal(conElDelNegocio,false,'ni siquiera con el atajo del negocio');
  return 'bloqueado por las dos vías';
});

// El PIN del negocio viaja a Firebase dentro de DB.business: si se guardara
// en claro, cualquiera con acceso a la base del negocio lo leería.
await caso('El PIN del negocio no se guarda en claro', async ()=>{
  const r = await page.evaluate(()=>{
    const guardado = hashPin('4093', codigoNegocioParaPin());
    return {guardado, enClaro: guardado === '4093', entra: pinDeNegocioCoincide('4093', guardado), noEntra: pinDeNegocioCoincide('0000', guardado)};
  });
  assert.ok(!r.enClaro,'el PIN del negocio no debería quedar legible');
  assert.ok(r.guardado.startsWith('H2:'),'debería usar el hash reforzado');
  assert.ok(r.entra,'el PIN correcto debe seguir valiendo');
  assert.ok(!r.noEntra,'otro PIN no debe valer');
  return 'hasheado con la sal del negocio';
});

// El enlace público daba acceso de lectura a nombre, teléfono, email y notas
// de todas las reservas. Si además se podía DEDUCIR del código del negocio,
// bastaba conocer el código para leerlas todas.
await caso('El enlace público no se puede deducir del código del negocio', async ()=>{
  const r = await page.evaluate(()=>{
    delete DB.business.publicId;
    DB.business.netlifySetupDone = false; // negocio nuevo
    const pid = getPublicId();
    const derivado = publicIdDerivadoAntiguo(getTenantId());
    // Un segundo negocio con OTRO código: no deben salir parecidos ni iguales
    delete DB.business.publicId;
    const otro = getPublicId();
    return {pid, derivado, otro, persistido: DB.business.publicId};
  });
  assert.notEqual(r.pid, r.derivado, 'no debería poder deducirse del código');
  assert.ok(r.pid.length >= 12, `demasiado corto para no acertarlo: ${r.pid.length}`);
  assert.ok(r.pid.length <= 30, 'las reglas de Firebase no admiten más de 30');
  assert.notEqual(r.pid, r.otro, 'dos sorteos no deberían coincidir');
  assert.ok(r.persistido, 'debe guardarse, o cambiaría en cada llamada');
  return `${r.pid.length} caracteres sorteados (antes 7 deducibles)`;
});
await caso('Un negocio que ya tenía carteles impresos conserva su enlace', async ()=>{
  const r = await page.evaluate(()=>{
    delete DB.business.publicId;
    DB.business.netlifySetupDone = true; // ya configurado antes del cambio
    return {pid: getPublicId(), derivado: publicIdDerivadoAntiguo(getTenantId())};
  });
  assert.equal(r.pid, r.derivado, 'no se le puede matar el QR ya impreso');
  return 'mantiene el suyo, el QR sigue vivo';
});
await caso('Una vez sorteado, el enlace público ya no cambia nunca', async ()=>{
  const r = await page.evaluate(()=>{
    delete DB.business.publicId;
    DB.business.netlifySetupDone = false;
    const a = getPublicId();
    return {a, b: getPublicId(), c: getPublicId(), enLicencia: (getLicense()||{}).publicId};
  });
  assert.equal(r.a, r.b, 'cambiar de enlace rompería los QR ya repartidos');
  assert.equal(r.a, r.c);
  assert.equal(r.enLicencia, r.a, 'debe quedar junto a la licencia, para el selector de locales');
  return 'estable y guardado en los dos sitios';
});

/* ─── Códigos de licencia ─── */
await caso('Un código de licencia inventado se rechaza', async ()=>{
  const r = await page.evaluate(async ()=>{ try{ return await redeemBusinessCode('INVENTAD'); }catch(e){ return {error:e.message}; } });
  assert.ok(!r.lic, 'un código inventado no debería canjearse');
  assert.ok(['unknown','offline'].includes(r.reason), `motivo inesperado: ${r.reason}`);
  return `rechazado (motivo: ${r.reason})`;
});
await caso('Una licencia guardada con el tenant cambiado a mano se rechaza', async ()=>{
  const r = await page.evaluate(()=>({
    buena: isStoredLicenseValid({code:'ERROR001', tenantId: ggBizTenantId('ERROR001')}),
    manipulada: isStoredLicenseValid({code:'ERROR001', tenantId:'INVENTADO'}),
    sinCodigo: isStoredLicenseValid({tenantId:'x'}),
  }));
  assert.ok(r.buena,'una licencia legítima debería valer');
  assert.ok(!r.manipulada,'no debería valer si se cambia el tenant a mano');
  assert.ok(!r.sinCodigo);
  return 'solo vale la coherente';
});

/* ─── PIN del negocio para acciones delicadas ─── */
await caso('El PIN del negocio protege las acciones delicadas', async ()=>{
  const r = await page.evaluate(()=>({
    correcto: pinMatchesHash('9999', DB.business.pin, 'ERROR001'),
    incorrecto: pinMatchesHash('1111', DB.business.pin, 'ERROR001'),
    vacio: pinMatchesHash('', DB.business.pin, 'ERROR001'),
  }));
  assert.ok(r.correcto); assert.ok(!r.incorrecto); assert.ok(!r.vacio);
  return 'solo pasa el correcto';
});

/* ─── Sin nube configurada, la app sigue funcionando ─── */
await caso('Sin nube configurada la app no se rompe, solo avisa', async ()=>{
  const r = await page.evaluate(()=>{
    delete DB.business.ownFirebase;
    initCloud();
    const badge=document.getElementById('sync-badge');
    return {
      oculto: !badge || badge.style.display === 'none',
      estadoRecordado: (typeof lastSyncBadgeState !== 'undefined') ? lastSyncBadgeState : null,
      cloudRef: typeof cloudRef!=='undefined' && !!cloudRef,
      sigueViva: !!document.getElementById('app') || !!document.querySelector('.content'),
    };
  });
  assert.ok(!r.cloudRef,'sin configuración no debería conectar');
  // El indicador se OCULTA a propósito: el asistente de nube es obligatorio
  // en el alta, así que "sin nube" no es un estado que haya que informar en
  // la cabecera, y un badge permanente ahí solo sería ruido.
  assert.ok(r.oculto,'sin nube el indicador debería ocultarse, no quedar a medias');
  assert.equal(r.estadoRecordado,'local','el estado interno debería quedar como local');
  assert.ok(r.sigueViva,'la app no debería romperse sin nube');
  return 'estado "local": la app sigue y el indicador se oculta';
});

/* ─── Datos corruptos no tumban la pantalla ─── */
await caso('Un dato corrupto no tumba la pantalla que lo muestra', async ()=>{
  const r = await page.evaluate(async ()=>{
    const fallos=[];
    // Entradas rotas a propósito en los sitios que recorren listas
    DB.workDistribution = {1:{platos:[],produccion:{}}, 99:undefined, 98:null};
    DB.purchaseOrders = [{id:1,supplier:undefined,date:undefined,estado:'ENVIADO',items:[]}];
    DB.employees.push({id:3,name:undefined,area:'cocina',active:true});
    const probar = (nombre, fn) => { try{ fn(); }catch(e){ fallos.push(nombre+': '+e.message); } };
    currentFolder='cocina';
    probar('distribución', ()=>{ navigate('distribucion'); });
    probar('pedidos/historial', ()=>{ navigate('pedidos'); setPedidosTab('historial'); });
    probar('personal', ()=>{ navigate('horarios'); setHorariosTab('personal'); });
    await new Promise(r=>setTimeout(r,300));
    return fallos;
  });
  assert.equal(r.length, 0, 'reventó con: '+r.join(' | '));
  return 'las tres aguantan';
});

await browser.close();
console.log('\n'+'═'.repeat(64));
const mal=res.filter(r=>!r.ok);
console.log(mal.length ? `❌ ${mal.length} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
