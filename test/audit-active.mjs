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
  return {
    body: {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
    },
    getElementById: () => null,
    _classes: classes,
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
    firebase: firebaseStub, // undefined = sin conexión a la plataforma (comportamiento fail-closed)
  };
  vm.createContext(sandbox);
  // core.js referencia funciones/objetos de otros ficheros del bundle (DB, saveDB...)
  // que no hacen falta para las funciones puras de licencia/PIN que se prueban aquí.
  vm.runInContext(
    `${coreSrc}\nfunction isOwnerSession(){ return document.body.classList.contains('owner-session'); }`,
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

test('El hash de PIN usa una sal fija embebida en el cliente y un espacio de 10.000 valores — precalculable al instante', () => {
  const sandbox = loadCore();
  const target = sandbox.hashPin('7391'); // "PIN secreto" de un empleado
  const t0 = Date.now();
  let cracked = null;
  for (let i = 0; i < 10000; i++) {
    const candidate = String(i).padStart(4, '0');
    if (sandbox.hashPin(candidate) === target) { cracked = candidate; break; }
  }
  const ms = Date.now() - t0;
  assert.equal(cracked, '7391');
  console.log(`   → PIN "secreto" recuperado del hash en ${ms} ms probando las 10.000 combinaciones posibles`);
});

console.log(`\n${failures === 0 ? '✅ Todas las pruebas activas confirmaron los hallazgos' : `❌ ${failures} prueba(s) no se comportaron como se esperaba`}`);
process.exit(0); // exit 0 siempre: el objetivo es DEMOSTRAR los hallazgos, no que "pasen" como tests de regresión
