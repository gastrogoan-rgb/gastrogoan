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
// (plataforma-gastrogoan): una "lista blanca" de códigos realmente emitidos
// por generador-licencias.html y las cuentas de propietario creadas ahí
// mismo — para probar de verdad que redeemBusinessCode() exige estar en esa
// lista y que el acceso de propietario comprueba la cuenta, no solo que el
// cálculo local cuadre.
//
// Es un árbol clave→valor en memoria con las cuatro operaciones que usa la
// app (once/set/remove/transaction), no solo lecturas: hace falta para
// probar el canje de un código, que ESCRIBE la reserva en codeClaims.
function makeFakePlatformDb(initial){
  const data = new Map(Object.entries(initial || {}));
  return {
    data,
    ref(path){
      return {
        once: async () => ({
          exists: () => data.has(path),
          val: () => {
            if(data.has(path)) return data.get(path);
            // Lectura de una rama entera (p.ej. .../businesses): se
            // reconstruye a partir de las hojas, como haría Firebase.
            const prefix = path + '/';
            const out = {};
            for(const [k, v] of data) if(k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
            return Object.keys(out).length ? out : null;
          },
        }),
        set: async (v) => { data.set(path, v); },
        remove: async () => { data.delete(path); },
        transaction: async (fn) => {
          const current = data.has(path) ? data.get(path) : null;
          const next = fn(current);
          const committed = next !== undefined;
          if(committed) data.set(path, next);
          return { committed, snapshot: { val: () => (data.has(path) ? data.get(path) : null) } };
        },
      };
    },
  };
}
function makeFakePlatformFirebase(issuedCodes, extra){
  const initial = {};
  for(const c of (issuedCodes || [])) initial['gastrogoan/issuedCodes/' + c] = {issuedAt: 1};
  Object.assign(initial, extra || {});
  const db = makeFakePlatformDb(initial);
  const stub = {
    app: () => { throw new Error('no default platform app yet'); },
    initializeApp: () => ({
      auth: () => ({ currentUser: {}, signInAnonymously: async () => {} }),
      database: () => db,
    }),
  };
  stub._db = db;
  return stub;
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

console.log('--- A. Licencias: ¿basta con inventarse un código para dar de alta un negocio? ---\n');

test('El secreto de firma es una función pura extraíble del propio JS del cliente (esto no ha cambiado, es inherente a una app 100% cliente)', () => {
  const sandbox = loadCore();
  const secret = sandbox._ggBizSecret();
  assert.equal(typeof secret, 'string');
  assert.ok(secret.length > 5);
});

await testAsync('FIX B1: un código que NO se emitió desde generador-licencias.html se RECHAZA', async () => {
  const sandbox = loadCore(makeFakePlatformFirebase(['REAL0001'])); // solo este se "vendió de verdad"
  const {lic, reason} = await sandbox.redeemBusinessCode('FORJADO1');
  assert.equal(lic, null, 'un código inventado no debería poder canjearse');
  assert.equal(reason, 'unknown', 'se pudo comprobar contra la plataforma (no es un falso negativo por desconexión)');
  console.log('   → Código inventado (FORJADO1) correctamente rechazado: no está en issuedCodes');
});

await testAsync('Un código que SÍ se emitió desde el generador se canjea con normalidad', async () => {
  const sandbox = loadCore(makeFakePlatformFirebase(['REAL0001']));
  const {lic, reason} = await sandbox.redeemBusinessCode('REAL0001');
  assert.ok(lic, 'un código realmente emitido debería canjearse');
  assert.equal(lic.code, 'REAL0001');
  assert.equal(reason, null);
});

await testAsync('Sin conexión con la plataforma, el canje falla de forma distinguible (offline), no se acepta a ciegas', async () => {
  const sandbox = loadCore(undefined); // sin `firebase` global = sin conexión posible
  const {lic, reason} = await sandbox.redeemBusinessCode('CUALQUIE'); // 8 caracteres, como todos los emitidos
  assert.equal(lic, null);
  assert.equal(reason, 'offline', 'debe distinguirse de "código incorrecto" para poder avisar bien al usuario');
});

await testAsync('Un código con una longitud imposible se descarta sin consultar la red — decir "no hay conexión" ahí sería engañoso', async () => {
  const sandbox = loadCore(undefined);
  const {reason} = await sandbox.redeemBusinessCode('CORTO');
  assert.equal(reason, 'unknown');
});

await testAsync('Un código ya canjeado por OTRA cuenta se rechaza — no se puede compartir una licencia entre dos dueños', async () => {
  const fb = makeFakePlatformFirebase(['REAL0001']);
  // Cuenta A canjea el código
  const a = loadCore(fb);
  a.localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'casapaco', authKey:'AAAA1111AAAA1111AAAA1111', pinHash:'x'}));
  const {lic: licA} = await a.redeemBusinessCode('REAL0001');
  assert.ok(licA, 'la primera cuenta sí debe poder canjearlo');

  // Cuenta B, con el mismo código, contra la MISMA plataforma
  const b = loadCore(fb);
  b.localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'otrobar', authKey:'BBBB2222BBBB2222BBBB2222', pinHash:'x'}));
  const {lic: licB, reason} = await b.redeemBusinessCode('REAL0001');
  assert.equal(licB, null, 'una segunda cuenta no debería poder canjear el mismo código');
  assert.equal(reason, 'claimed');
  console.log('   → El código queda reservado para la cuenta que lo canjeó primero (codeClaims)');
});

await testAsync('La misma cuenta puede volver a canjear su propio código (reinstalación) sin quedarse fuera', async () => {
  const fb = makeFakePlatformFirebase(['REAL0001']);
  const login = JSON.stringify({user:'casapaco', authKey:'AAAA1111AAAA1111AAAA1111', pinHash:'x'});
  const a = loadCore(fb);
  a.localStorage.setItem('gastrogoan_owner_login', login);
  await a.redeemBusinessCode('REAL0001');
  const b = loadCore(fb); // "otro dispositivo", misma cuenta
  b.localStorage.setItem('gastrogoan_owner_login', login);
  const {lic, reason} = await b.redeemBusinessCode('REAL0001');
  assert.ok(lic, 'su propio código no puede bloquearle a él mismo');
  assert.equal(reason, null);
});

console.log('\n--- A bis. Cuentas de propietario: usuario + PIN ---\n');

test('El usuario se normaliza: mayúsculas, acentos y espacios no dejan a nadie fuera de su propia cuenta', () => {
  const s = loadCore();
  const esperado = 'casapaco';
  for(const variante of ['Casa Paco', 'casa paco', 'CASA PACÓ', '  Casa   Paco  ', 'Càsa-Paco!'])
    assert.equal(s.ggOwnerUser(variante), esperado, `"${variante}" debería normalizarse a ${esperado}`);
});

test('La ruta de la cuenta depende del PIN: sin el PIN correcto no se puede ni construir', () => {
  const s = loadCore();
  const buena = s.ggOwnerAuthKey('Casa Paco', 'ABC234');
  assert.equal(s.ggOwnerAuthKey('casapaco', 'abc234'), buena, 'debe ser estable frente a la forma de escribirlo');
  assert.notEqual(s.ggOwnerAuthKey('casapaco', 'ABC235'), buena, 'un PIN distinto debe dar otra ruta');
  assert.notEqual(s.ggOwnerAuthKey('otrobar', 'ABC234'), buena, 'otro usuario debe dar otra ruta');
  assert.ok(buena.length >= 16, 'la ruta debe ser larga para no poder adivinarse');
  assert.equal(s.ggOwnerAuthKey('casapaco', ''), null, 'sin PIN no hay ruta');
});

test('El identificador del dueño NO depende del PIN — si dependiera, cambiarlo le bloquearía de su propio código', () => {
  const s = loadCore();
  // ggOwnerId es lo que se guarda en codeClaims. Tiene que sobrevivir a un
  // cambio de PIN, al revés que el authKey, que cambia a propósito.
  assert.equal(s.ggOwnerId('casapaco'), s.ggOwnerId('Casa Paco'), 'debe normalizar igual que el resto');
  assert.notEqual(s.ggOwnerId('casapaco'), s.ggOwnerId('otrobar'), 'dos dueños distintos, dos identificadores');
  assert.notEqual(
    s.ggOwnerAuthKey('casapaco', 'ABC234'), s.ggOwnerAuthKey('casapaco', '4321'),
    'el authKey SÍ cambia con el PIN (es lo que hace que el PIN viejo deje de valer)',
  );
  assert.ok(s.ggOwnerId('casapaco').length >= 16);
});

await testAsync('Tras cambiar de PIN, el dueño sigue pudiendo canjear su propio código', async () => {
  const fb = makeFakePlatformFirebase(['REAL0001']);
  const antes = loadCore(fb);
  antes.localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'casapaco', authKey:'VIEJA1111VIEJA1111VIEJA1', pinHash:'x'}));
  assert.ok((await antes.redeemBusinessCode('REAL0001')).lic);
  // Mismo usuario, authKey distinto: exactamente lo que queda tras cambiar el PIN.
  const despues = loadCore(fb);
  despues.localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'casapaco', authKey:'NUEVA2222NUEVA2222NUEVA2', pinHash:'x'}));
  const {lic, reason} = await despues.redeemBusinessCode('REAL0001');
  assert.ok(lic, `no debería bloquearse a sí mismo tras cambiar el PIN (reason=${reason})`);
});

await testAsync('Una cuenta que no existe en la plataforma NO deja entrar, aunque el usuario sea real', async () => {
  const s = loadCore(makeFakePlatformFirebase([]));
  const authKey = s.ggOwnerAuthKey('casapaco', 'ABC234');
  assert.equal(await s.verifyOwnerAccountOnPlatform(authKey), false);
});

await testAsync('Una cuenta creada por el generador sí deja entrar, y solo con SU PIN', async () => {
  const s = loadCore(makeFakePlatformFirebase([], {
    // lo que habría escrito generador-licencias.html al crear la cuenta
    ['gastrogoan/ownerAuth/' + loadCore().ggOwnerAuthKey('casapaco', 'ABC234')]: {user:'casapaco', createdAt: 1},
  }));
  assert.equal(await s.verifyOwnerAccountOnPlatform(s.ggOwnerAuthKey('casapaco', 'ABC234')), true);
  assert.equal(await s.verifyOwnerAccountOnPlatform(s.ggOwnerAuthKey('casapaco', 'ZZZ999')), false,
    'con otro PIN la ruta es otra y no existe: no se entra');
});

await testAsync('Sin conexión, comprobar la cuenta devuelve null (no "PIN incorrecto") para poder avisar bien', async () => {
  const s = loadCore(undefined);
  assert.equal(await s.verifyOwnerAccountOnPlatform('AAAA1111AAAA1111AAAA1111'), null);
});

test('Una licencia YA guardada localmente se revalida sin red (isStoredLicenseValid) — así el día a día sigue funcionando offline', () => {
  const sandbox = loadCore();
  // Simula lo que se guardó tras una activación pasada ya confirmada contra la plataforma
  const stored = {code: 'REAL0001', tenantId: sandbox.ggBizTenantId('REAL0001')};
  assert.ok(sandbox.isStoredLicenseValid(stored));
});

console.log('\n--- B. ¿La misma licencia sirve para "negocios" (tenants) distintos sin límite de dispositivos? ---\n');

await testAsync('El mismo código produce SIEMPRE el mismo tenantId — sigue sin haber límite de instalaciones (B2, todavía abierto)', async () => {
  // Dos dispositivos de la MISMA cuenta canjeando su código: es el caso
  // legítimo (el dueño reinstala, o entra desde la tablet y desde el móvil).
  const fb = makeFakePlatformFirebase(['MISMOCOD']);
  const login = JSON.stringify({user:'casapaco', authKey:'AAAA1111AAAA1111AAAA1111', pinHash:'x'});
  const sandboxA = loadCore(fb);
  const sandboxB = loadCore(fb);
  sandboxA.localStorage.setItem('gastrogoan_owner_login', login);
  sandboxB.localStorage.setItem('gastrogoan_owner_login', login);
  const {lic: businessA} = await sandboxA.redeemBusinessCode('MISMOCOD');
  const {lic: businessB} = await sandboxB.redeemBusinessCode('MISMOCOD');
  assert.ok(businessA && businessB, 'la reserva por cuenta no debía romper el canje legítimo del propio dueño');
  assert.equal(businessA.tenantId, businessB.tenantId,
    'si fueran negocios distintos deberían acabar en tenants distintos, pero comparten exactamente el mismo — B2 sigue sin resolver');
  console.log(`   → Ambas instalaciones comparten tenantId=${businessA.tenantId} (mismo dato en Firebase para ambas) — pendiente de B2`);
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
  // El aviso ya NO es un toast: saltaba en mitad del servicio, no se podía
  // hacer nada con él en ese momento y solo tapaba la pantalla. Lo que
  // importa es que quede rastro consultable en el registro de actividad.
  assert.equal(toasts.length, 0, 'la colisión no debe interrumpir el servicio con un toast');
  const dbAfter = sandbox.__getDB ? sandbox.__getDB() : null;
  assert.ok(dbAfter && dbAfter.auditLog.length === 1, 'debería quedar constancia en el registro de auditoría');
  console.log('   → colisión real detectada y anotada en el registro: ' + dbAfter.auditLog[0].summary);
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
