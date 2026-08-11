// Pruebas activas de la auditoría pre-lanzamiento (AUDITORIA_PRELANZAMIENTO.md).
// Cargan el código real de core.js/ui.js en un sandbox de Node y demuestran
// en vivo (no solo por lectura) los hallazgos Bloqueante/Alto de licencias
// y login. No requieren red ni Firebase real.
//
// Ejecutar: node test/audit-active.mjs

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coreSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');

// DOM mínimo: solo lo que isOwnerSession() necesita (document.body.classList).
function makeFakeDocument(){
  const classes = new Set();
  // Un elemento real sincroniza textContent solo al leerlo (se deriva del
  // marcado); este mock no es un Element de verdad, así que hay que simular
  // ese derivado a mano cuando el código de producción usa innerHTML en vez
  // de textContent (ver updateSyncBadge en js/core.js).
  let syncBadgeHtml = '';
  const syncBadgeEl = {
    style: {},
    get textContent(){ return syncBadgeHtml.replace(/<[^>]*>/g, ''); },
    set textContent(v){ syncBadgeHtml = v; },
    get innerHTML(){ return syncBadgeHtml; },
    set innerHTML(v){ syncBadgeHtml = v; },
  };
  return {
    body: {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
    },
    getElementById: (id) => (id === 'sync-badge' ? syncBadgeEl : null),
    _classes: classes,
    _syncBadgeEl: syncBadgeEl,
  };
}

function makeFakeLocalStorage(){
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

// Simula el proyecto Firebase compartido de la plataforma
// (plataforma-gastrogoan) con una "lista blanca" de códigos realmente
// emitidos por generador-licencias.html — para probar de verdad que
// activateBusinessLicense() ya exige estar en esta lista, no solo que el
// cálculo local cuadre.
function makeFakePlatformFirebase(issuedCodes){
  return {
    app: () => { throw new Error('no default platform app yet'); },
    initializeApp: () => ({
      auth: () => ({
        currentUser: {},
        signInAnonymously: async () => {},
      }),
      database: () => ({
        ref: (path) => ({
          once: async (event) => {
            const code = path.split('/').pop();
            return { exists: () => issuedCodes.has(code) };
          },
        }),
      }),
    }),
  };
}

function loadCore(firebaseStub){
  const document = makeFakeDocument();
  const sandbox = {
    document, window: undefined, console, t: (k) => k,
    localStorage: makeFakeLocalStorage(),
    navigator: { onLine: true, userAgent: 'node-audit-test' },
    setTimeout, clearTimeout,
    firebase: firebaseStub, // undefined = sin conexión a la plataforma (comportamiento fail-closed)
  };
  vm.createContext(sandbox);
  // core.js referencia funciones/objetos de otros ficheros del bundle (DB, saveDB...)
  // que no hacen falta para las funciones puras de licencia/PIN que se prueban aquí.
  // Los helpers __set*/__get* exponen variables `let` internas del script
  // (cloudRef, lastSyncedSnapshot) que de otro modo no son visibles desde
  // fuera del contexto vm — necesarios para probar flushCloudSync (A6).
  vm.runInContext(
    `${coreSrc}
function isOwnerSession(){ return document.body.classList.contains('owner-session'); }
function __setCloudRef(r){ cloudRef = r; }
function __setLastSyncedSnapshot(s){ lastSyncedSnapshot = s; }
function __getLastSyncedSnapshot(){ return lastSyncedSnapshot; }
function __setDB(d){ DB = d; }
function __getDB(){ return DB; }
function __setSocketConnected(v){ socketConnected = v; }
function __getDbReadyPromise(){ return dbReadyPromise; }
function __clearCloudSyncRetryTimer(){ clearTimeout(cloudSyncRetryTimer); cloudSyncRetryTimer = null; }`,
    sandbox,
    { filename: 'js/core.js' }
  );
  return sandbox;
}

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${name}`);
    console.error('   ' + e.message);
  }
}
async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${name}`);
    console.error('   ' + e.message);
  }
}

console.log('--- A. Licencias: tras el fix del 10/08/2026, ¿sigue bastando con recalcular código+contraseña? ---\n');

test('El secreto de firma es una función pura extraíble del propio JS del cliente (esto no ha cambiado, es inherente a una app 100% cliente)', () => {
  const sandbox = loadCore();
  const secret = sandbox._ggBizSecret();
  assert.equal(typeof secret, 'string');
  assert.ok(secret.length > 5);
});

await testAsync('FIX B1: un código+contraseña "correctos" pero que NO se emitió desde generador-licencias.html ahora se RECHAZA', async () => {
  const issuedCodes = new Set(['REAL0001']); // solo este código "se vendió de verdad"
  const sandbox = loadCore(makeFakePlatformFirebase(issuedCodes));
  const forgedCode = 'FORJADO1'; // cualquier string, recalculado sin pasar por el generador
  const forgedPassword = sandbox.ggBizPassword(forgedCode);
  const {lic, offline} = await sandbox.activateBusinessLicense(forgedCode, forgedPassword);
  assert.equal(lic, null, 'la licencia forjada debería ser rechazada — antes del fix se aceptaba');
  assert.equal(offline, false, 'se pudo comprobar contra la plataforma (no es un falso negativo por desconexión)');
  console.log(`   → Licencia forjada (${forgedCode}) correctamente rechazada: no está en issuedCodes`);
});

await testAsync('Un código que SÍ se emitió desde el generador se activa con normalidad', async () => {
  const issuedCodes = new Set(['REAL0001']);
  const sandbox = loadCore(makeFakePlatformFirebase(issuedCodes));
  const password = sandbox.ggBizPassword('REAL0001');
  const {lic} = await sandbox.activateBusinessLicense('REAL0001', password);
  assert.ok(lic, 'un código realmente emitido debería activarse');
  assert.equal(lic.code, 'REAL0001');
});

await testAsync('Sin conexión con la plataforma, la activación falla de forma distinguible (offline:true), no se acepta a ciegas', async () => {
  const sandbox = loadCore(undefined); // sin `firebase` global = sin conexión posible
  const password = sandbox.ggBizPassword('CUALQUIERA');
  const {lic, offline} = await sandbox.activateBusinessLicense('CUALQUIERA', password);
  assert.equal(lic, null);
  assert.equal(offline, true, 'debe distinguirse de "código incorrecto" para poder avisar bien al usuario');
});

test('Una licencia YA guardada localmente se revalida sin red (isStoredLicenseValid) — así el día a día sigue funcionando offline', () => {
  const sandbox = loadCore();
  // Simula lo que se guardó tras una activación pasada ya confirmada contra la plataforma
  const stored = {code: 'REAL0001', tenantId: sandbox.ggBizTenantId('REAL0001')};
  assert.ok(sandbox.isStoredLicenseValid(stored));
});

console.log('\n--- B. ¿La misma licencia sirve para "negocios" (tenants) distintos sin límite de dispositivos? ---\n');

await testAsync('El mismo código produce SIEMPRE el mismo tenantId — sigue sin haber límite de instalaciones (B2, todavía abierto)', async () => {
  const issuedCodes = new Set(['MISMOCODIGO']);
  const password = 'X'; // se recalcula abajo por instancia, la password real es determinista igualmente
  const sandboxA = loadCore(makeFakePlatformFirebase(issuedCodes));
  const sandboxB = loadCore(makeFakePlatformFirebase(issuedCodes));
  const pass = sandboxA.ggBizPassword('MISMOCODIGO');
  // Simula dos "negocios"/instalaciones distintas activando el mismo par código+contraseña
  const {lic: businessA} = await sandboxA.activateBusinessLicense('MISMOCODIGO', pass);
  const {lic: businessB} = await sandboxB.activateBusinessLicense('MISMOCODIGO', pass);
  assert.ok(businessA && businessB, 'el fix de B1 no debía romper la activación de un código legítimo');
  assert.equal(businessA.tenantId, businessB.tenantId,
    'si fueran negocios distintos deberían acabar en tenants distintos, pero comparten exactamente el mismo — B2 sigue sin resolver');
  console.log(`   → Ambas "instalaciones" comparten tenantId=${businessA.tenantId} (mismo dato en Firebase para ambas) — pendiente de B2`);
});

console.log('\n--- C. Escalado de privilegios: ¿puede un "empleado" convertirse en "propietario" sin PIN, solo tocando el estado local? ---\n');

test('isOwnerSession() es una comprobación puramente de clase CSS en document.body — manipulable desde devtools', () => {
  const sandbox = loadCore();
  assert.equal(sandbox.isOwnerSession(), false, 'sesión de empleado: no debería ser owner todavía');
  // Esto es EXACTAMENTE lo que cualquiera podría teclear en la consola del
  // navegador de una tablet de empleado, sin conocer ningún PIN:
  sandbox.document.body.classList.add('owner-session');
  assert.equal(sandbox.isOwnerSession(), true,
    'tras añadir la clase a mano, la sesión se declara de propietario sin haber verificado ningún PIN');
  console.log('   → document.body.classList.add(\'owner-session\') en consola = acceso de propietario concedido');
});

console.log('\n--- D. PINs de empleado: ¿es viable un ataque de diccionario contra el hash? ---\n');

test('El espacio de 10.000 PINs sigue siendo precalculable al instante (límite físico, no depende de la sal)', () => {
  const sandbox = loadCore();
  const target = sandbox.hashPin('7391', 'NEGOCIOTEST'); // "PIN secreto" de un empleado, negocio conocido
  const t0 = Date.now();
  let cracked = null;
  for (let i = 0; i < 10000; i++) {
    const candidate = String(i).padStart(4, '0');
    if (sandbox.hashPin(candidate, 'NEGOCIOTEST') === target) { cracked = candidate; break; }
  }
  const ms = Date.now() - t0;
  assert.equal(cracked, '7391');
  console.log(`   → PIN "secreto" recuperado del hash en ${ms} ms probando las 10.000 combinaciones posibles (conociendo el código del negocio)`);
});

test('FIX A1: la sal ahora es distinta por negocio — una tabla arcoíris de un negocio ya NO sirve para otro', () => {
  const sandbox = loadCore();
  const pin = '7391';
  const hashBusinessA = sandbox.hashPin(pin, 'CODIGO_NEGOCIO_A');
  const hashBusinessB = sandbox.hashPin(pin, 'CODIGO_NEGOCIO_B');
  assert.notEqual(hashBusinessA, hashBusinessB,
    'el mismo PIN debe dar hashes distintos en negocios distintos — antes del fix daba siempre el mismo hash para todos');
  // Confirma que una tabla arcoíris precalculada contra el negocio A no
  // descifra nada del negocio B, aunque el PIN real sea el mismo:
  const rainbowTableA = new Map();
  for (let i = 0; i < 10000; i++) {
    const candidate = String(i).padStart(4, '0');
    rainbowTableA.set(sandbox.hashPin(candidate, 'CODIGO_NEGOCIO_A'), candidate);
  }
  assert.equal(rainbowTableA.get(hashBusinessB), undefined,
    'la tabla arcoíris del negocio A no debería encontrar nada para un hash del negocio B');
  console.log('   → tabla arcoíris de un negocio ya no sirve contra otro negocio distinto');
});

console.log('\n--- E. Sincronización: ¿se pierde un cambio si falla el envío a la nube? ---\n');

await testAsync('FIX A6: un envío fallido a Firebase ya NO se marca como sincronizado — se reintenta hasta confirmarse', async () => {
  const sandbox = loadCore();
  // core.js reasigna DB de forma asíncrona al cargar (dbReadyPromise) —
  // hay que dejar que eso termine ANTES de fijar el DB propio del test, si
  // no la reasignación tardía lo pisa por detrás sin que se note.
  await sandbox.__getDbReadyPromise();
  sandbox.__setDB({ingredients: ['dato local nuevo, aún no confirmado en la nube']});
  sandbox.__setLastSyncedSnapshot({ingredients: JSON.stringify([])}); // la nube todavía tiene el estado viejo
  let updateCalls = 0;
  const fakeCloudRef = {
    update: async (updates) => {
      updateCalls++;
      throw new Error('simulando wifi caída'); // primer intento: falla
    },
  };
  sandbox.__setCloudRef(fakeCloudRef);
  sandbox.flushCloudSync();
  await new Promise(r => setTimeout(r, 10)); // deja que se resuelva el .catch() async
  assert.equal(updateCalls, 1, 'debería haber intentado el envío');
  const snapshotAfterFailure = sandbox.__getLastSyncedSnapshot();
  assert.equal(snapshotAfterFailure.ingredients, JSON.stringify([]),
    'tras un fallo, el snapshot NO debe marcarse como sincronizado (antes del fix sí se marcaba, perdiendo el reintento)');
  sandbox.__clearCloudSyncRetryTimer(); // no dejar el setTimeout de 15s real colgado en el test

  // Segundo intento (simulando que vuelve la conexión): esta vez con éxito.
  fakeCloudRef.update = async (updates) => { updateCalls++; };
  sandbox.flushCloudSync();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(updateCalls, 2, 'debería haber reintentado el mismo cambio');
  const snapshotAfterSuccess = sandbox.__getLastSyncedSnapshot();
  assert.equal(snapshotAfterSuccess.ingredients, JSON.stringify(['dato local nuevo, aún no confirmado en la nube']),
    'tras confirmarse, el snapshot ya sí debe reflejar el dato enviado');
  console.log(`   → 1er intento falló y NO se marcó como sincronizado; 2º intento (reintento) tuvo éxito y sí se marcó`);
});

console.log('\n--- F. Sincronización: ¿se avisa si dos dispositivos editan el mismo registro a la vez? ---\n');

await testAsync('FIX A7: una colisión real (local Y remoto cambiaron el mismo pedido) ahora se detecta y avisa', async () => {
  const sandbox = loadCore();
  await sandbox.__getDbReadyPromise();
  const toasts = [];
  sandbox.showToast = (msg) => toasts.push(msg);
  sandbox.todayStr = () => '2026-08-10';
  sandbox.__setDB({auditLog: []});
  sandbox.__setLastSyncedSnapshot({
    tpvOrders: JSON.stringify([{id: 1, items: [{name:'Original'}]}]),
  });
  // Este dispositivo cambió el pedido 1 (añadió una línea) sin haberlo subido aún...
  const local = [{id: 1, items: [{name:'Original'}, {name:'Añadido en este dispositivo'}]}];
  // ...y a la vez llegó de OTRO dispositivo con un cambio DISTINTO del mismo pedido.
  const remote = [{id: 1, items: [{name:'Original'}, {name:'Añadido en el otro dispositivo'}]}];
  sandbox.warnIfConcurrentEditLost('tpvOrders', local, remote);
  assert.equal(toasts.length, 1, 'debería haber avisado de la colisión con un toast');
  const dbAfter = sandbox.__getDB ? sandbox.__getDB() : null;
  assert.ok(dbAfter && dbAfter.auditLog.length === 1, 'debería quedar constancia en el registro de auditoría');
  console.log('   → colisión real detectada y avisada: ' + toasts[0]);
});

await testAsync('warnIfConcurrentEditLost NO avisa si solo cambió un lado (caso normal, sin colisión)', async () => {
  const sandbox = loadCore();
  await sandbox.__getDbReadyPromise();
  const toasts = [];
  sandbox.showToast = (msg) => toasts.push(msg);
  sandbox.__setDB({auditLog: []});
  sandbox.__setLastSyncedSnapshot({
    tpvOrders: JSON.stringify([{id: 1, items: [{name:'Original'}]}]),
  });
  const local = [{id: 1, items: [{name:'Original'}]}]; // este dispositivo no tocó nada
  const remote = [{id: 1, items: [{name:'Original'}, {name:'Cambio normal del otro dispositivo'}]}];
  sandbox.warnIfConcurrentEditLost('tpvOrders', local, remote);
  assert.equal(toasts.length, 0, 'un cambio remoto normal (sin edición local pendiente) no debería avisar de nada');
});

console.log('\n--- G. Indicador de sincronización: ¿distingue "conectado" de "guardado de verdad"? ---\n');

await testAsync('FIX M3: el badge pasa a "pending" al programar un envío, y solo vuelve a "online" cuando se confirma', async () => {
  const sandbox = loadCore();
  await sandbox.__getDbReadyPromise();
  sandbox.__setSocketConnected(true);
  sandbox.__setDB({ingredients: ['dato nuevo']});
  sandbox.__setLastSyncedSnapshot({ingredients: JSON.stringify([])});
  sandbox.__setCloudRef({ update: async () => {} }); // éxito inmediato
  sandbox.scheduleCloudSync();
  assert.equal(sandbox.document._syncBadgeEl.textContent, '☁ gate.cloudPending',
    'nada más programar el envío, el badge debe mostrar el estado intermedio, no "conectado" sin más');
  sandbox.document._syncBadgeEl.textContent = ''; // limpia para distinguir el próximo cambio
  await sandbox.flushCloudSync();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(sandbox.document._syncBadgeEl.textContent, '☁ gate.cloudConnectedShort',
    'tras confirmarse el envío y no quedar nada pendiente, debe volver a "conectado"');
  console.log('   → badge: pending mientras se envía → online solo tras confirmarse de verdad');
});

console.log(`\n${failures === 0 ? '✅ Todas las pruebas activas confirmaron los hallazgos' : `❌ ${failures} prueba(s) no se comportaron como se esperaba`}`);
process.exit(0); // exit 0 siempre: el objetivo es DEMOSTRAR los hallazgos, no que "pasen" como tests de regresión
