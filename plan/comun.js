/* Base compartida del Plan 360° — panel del coach y vista del cliente.
 *
 * ── Por qué esto es un proyecto de Firebase APARTE del de cada negocio ───
 * Aquí SÍ es Marcos quien presta el servicio activamente (dos días
 * presenciales + seguimiento mensual), a diferencia de la app, donde cada
 * negocio paga y administra su propia nube. Por eso el coste de esta pieza
 * es suyo — y con 2-3 clientes al mes, gratis de sobra en el plan Spark de
 * Firebase (ver la cuenta en el hilo: ~30 KB por cliente-año, 1 GB de
 * cupo).
 *
 * ── Usuario + PIN, SIN Firebase Auth de email/contraseña ──────────────────
 * Mismo patrón que ya funciona en producción en GastroGoan App
 * (ggOwnerAuthKey, js/core.js): el PIN NUNCA se guarda en ningún sitio, ni
 * cifrado. Se deriva una clave a partir de usuario+PIN, y "entrar" es
 * comprobar si esa ruta existe en la base de datos — las reglas de
 * seguridad solo dan lectura A NIVEL de esa clave exacta, nunca del padre,
 * así que tampoco se puede listar para ir probando.
 *
 * ⚠️ El secreto de abajo es DISTINTO del que usa la app (_ggOwnerSecret en
 * js/core.js) a propósito: son dos sistemas independientes, y que alguien
 * comprometa uno no debe decirle nada sobre el otro.
 *
 * La autenticación anónima de Firebase SIGUE haciendo falta (como en
 * reservagastrogoan.html): las reglas de Realtime Database exigen
 * `auth != null` para leer nada, y el inicio anónimo es lo que cumple esa
 * condición sin pedirle ni un email al cliente.
 */

// ⚠️ RELLENAR con el bloque que da Firebase al crear la app web
// (Consola → ⚙️ Configuración del proyecto → Tus apps → Web).
const COACH_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAqcyizI63uOTMERlBtNLO_-v-HMrIjMqs",
  authDomain: "gastrogoan-81b86.firebaseapp.com",
  databaseURL: "https://gastrogoan-81b86-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gastrogoan-81b86",
  storageBucket: "gastrogoan-81b86.firebasestorage.app",
  messagingSenderId: "65377429848",
  appId: "1:65377429848:web:2a506eed1eea2e380add2d",
};

const GG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1: ilegibles al dictarlos

function coachHash(str){
  let h = 0x811c9dc5 >>> 0;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Normaliza igual que ggOwnerUser: minúsculas, sin acentos ni espacios.
// "Casa Paco" y "casapaco" tienen que ser el mismo cliente.
function coachNormalizeUser(raw){
  return String(raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Secreto propio del Plan 360°, distinto del de la app (ver el aviso de
// arriba). Codificado igual —desplazamiento de char codes— para que no
// viaje en claro y legible en el código fuente, aunque no es un secreto
// criptográfico fuerte: es solo una sal, como en la app.
function _coachSecret(){
  const c = [104,110,193,120,129,120,111,124,193,60,58,60,64,193,117,65,192,58,64];
  return c.map(x => String.fromCharCode(x - 14)).join('');
}

function coachDerive(input, groups){
  const out = [];
  let h = coachHash(input);
  for(let g = 0; g < groups; g++){
    h = coachHash(input + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += GG_ALPHABET[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('');
}

// La ruta en la base de datos: coaching/clientes/{authKey}. Entrar = que
// esa ruta EXISTA. Cambiar el PIN de un cliente = mover el nodo a la ruta
// nueva (mismo patrón que changeOwnerAccessPin en la app).
function coachAuthKey(user, pin){
  const u = coachNormalizeUser(user);
  const p = String(pin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(!u || !p) return null;
  return coachDerive(u + '·' + p + _coachSecret() + '·coachauth', 6);
}

let _coachApp = null;
async function initCoachFirebase(){
  if(_coachApp) return _coachApp;
  if(!COACH_FIREBASE_CONFIG.apiKey || !COACH_FIREBASE_CONFIG.databaseURL){
    throw new Error('Falta rellenar COACH_FIREBASE_CONFIG en plan/comun.js');
  }
  _coachApp = firebase.initializeApp(COACH_FIREBASE_CONFIG);
  await firebase.auth().signInAnonymously();
  return _coachApp;
}

function coachEscapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
