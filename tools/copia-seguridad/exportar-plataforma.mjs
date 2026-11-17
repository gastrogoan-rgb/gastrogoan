// Copia de seguridad de la Firebase de la PLATAFORMA (licencias, nombres de cuenta, reclamaciones de códigos…).
// Se ejecuta en TU ordenador, no en la app. Entra como administrador (el mismo correo y contraseña del generador de
// licencias) y guarda cada rama en un fichero JSON con fecha. No contiene ningún secreto: el correo y la contraseña se
// pasan por variables de entorno y no se escriben en ningún sitio.
//
//   GG_ADMIN_EMAIL=... GG_ADMIN_PASS=... node tools/copia-seguridad/exportar-plataforma.mjs [carpeta-de-salida]
//
// ⚠️ La carpeta de salida lleva datos de clientes: guárdala FUERA del repositorio (que es público) y en dos sitios
// distintos. `ownerAuth` no se puede exportar a propósito (las reglas impiden listarla: así nadie puede probar PIN);
// por eso es importante conservar `ownerNames` y `issuedCodes`: con ellos se reemite cualquier cuenta (paso 3 del generador).
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = 'AIzaSyDwZDodF6zwN11slvqkZ_yy3IOn2iko_ws';           // clave pública de la web de la plataforma (no es un secreto)
const DB = 'https://plataforma-gastrogoan-default-rtdb.europe-west1.firebasedatabase.app';
const RAMAS = ['issuedCodes', 'ownerNames', 'codeClaims', 'coachConfig', 'publicLookup', 'publicSlugs', 'tenantLookup', 'adminSalesLog', 'pagos'];

const email = process.env.GG_ADMIN_EMAIL, pass = process.env.GG_ADMIN_PASS;
if (!email || !pass) { console.error('Faltan GG_ADMIN_EMAIL y GG_ADMIN_PASS.'); process.exit(1); }

const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
});
const sesion = await r.json();
if (!r.ok || !sesion.idToken) { console.error('No se pudo entrar como administrador:', sesion.error && sesion.error.message); process.exit(1); }

const hoy = new Date().toISOString().slice(0, 10);
const salida = path.resolve(process.argv[2] || `copia-plataforma-${hoy}`);
fs.mkdirSync(salida, { recursive: true });
let bien = 0, mal = 0;
for (const rama of RAMAS) {
  const url = `${DB}/gastrogoan/${rama}.json?auth=${sesion.idToken}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log(`⚠️  ${rama}: ${res.status} (sin permiso de lectura o no existe)`); mal++; continue; }
    const datos = await res.json();
    fs.writeFileSync(path.join(salida, `${rama}.json`), JSON.stringify(datos, null, 1));
    console.log(`✅ ${rama}: ${datos ? Object.keys(datos).length : 0} entradas`);
    bien++;
  } catch (e) { console.log(`⚠️  ${rama}: ${e.message}`); mal++; }
}
fs.writeFileSync(path.join(salida, 'LEEME.txt'), `Copia de la Firebase de plataforma · ${hoy}\nRamas guardadas: ${bien}. Con aviso: ${mal}.\nGuárdala fuera del repositorio y en dos sitios distintos.\n`);
console.log(`\nGuardado en ${salida}`);
