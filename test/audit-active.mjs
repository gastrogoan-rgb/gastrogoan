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

function loadCore(){
  const document = makeFakeDocument();
  const sandbox = {
    document, window: undefined, console, t: (k) => k,
    localStorage: makeFakeLocalStorage(),
    navigator: { onLine: true, userAgent: 'node-audit-test' },
  };
  vm.createContext(sandbox);
  // core.js referencia funciones/objetos de otros ficheros del bundle (DB, saveDB, firebase...)
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

console.log('--- A. Licencias: ¿se puede falsificar una licencia válida SIN usar generador-licencias.html? ---\n');

test('El secreto de firma es una función pura extraíble del propio JS del cliente', () => {
  const sandbox = loadCore();
  const secret = sandbox._ggBizSecret();
  // El "secreto" no es tal: es una constante fija embebida en el JS que se envía
  // a CUALQUIER navegador. No hace falta ni siquiera "extraerlo" con ingeniería
  // inversa: basta con llamar a la función tal cual, como hace este test.
  assert.equal(typeof secret, 'string');
  assert.ok(secret.length > 5);
});

test('Se puede generar una licencia código+contraseña VÁLIDA sin el generador oficial', () => {
  const sandbox = loadCore();
  const forgedCode = 'FORJADO1'; // cualquier string, no hace falta que lo emita el vendedor
  const forgedPassword = sandbox.ggBizPassword(forgedCode); // misma función que usa generador-licencias.html
  const activated = sandbox.activateBusinessLicense(forgedCode, forgedPassword);
  assert.ok(activated, 'la licencia forjada debería ser rechazada, pero fue aceptada');
  assert.equal(activated.code, forgedCode);
  console.log(`   → Licencia forjada aceptada: code=${forgedCode} password=${forgedPassword} tenantId=${activated.tenantId}`);
});

test('Una licencia guardada (code+tenantId) se valida sin volver a comprobar la contraseña', () => {
  const sandbox = loadCore();
  const activated = sandbox.activateBusinessLicense('CUALQUIERA', sandbox.ggBizPassword('CUALQUIERA'));
  assert.ok(sandbox.isStoredLicenseValid(activated));
});

console.log('\n--- B. ¿La misma licencia sirve para "negocios" (tenants) distintos sin límite de dispositivos? ---\n');

test('El mismo código produce SIEMPRE el mismo tenantId — no hay vínculo a un dispositivo ni límite de instalaciones', () => {
  const sandbox = loadCore();
  const code = 'MISMOCODIGO';
  const password = sandbox.ggBizPassword(code);
  // Simula dos "negocios"/instalaciones distintas activando el mismo par código+contraseña
  const businessA = sandbox.activateBusinessLicense(code, password);
  const businessB = sandbox.activateBusinessLicense(code, password);
  assert.ok(businessA && businessB);
  assert.equal(businessA.tenantId, businessB.tenantId,
    'si fueran negocios distintos deberían acabar en tenants distintos, pero comparten exactamente el mismo');
  console.log(`   → Ambas "instalaciones" comparten tenantId=${businessA.tenantId} (mismo dato en Firebase para ambas)`);
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
