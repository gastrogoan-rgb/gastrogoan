/**
 * GastroGoan - puente con el TPV virtual (Redsys). Cloudflare Worker `gastro`.
 *
 * ⚠️ ESTE FICHERO ES LA FUENTE DE LA VERDAD del Worker, pero NO se publica
 * solo: hay que pegarlo a mano en Cloudflare → Workers → gastro → Editar
 * código → Desplegar. Sin claves: las dos que necesita viven en Cloudflare
 * (Settings → Variables) y NUNCA se escriben aquí:
 *  - FIREBASE_DB_URL     https://plataforma-gastrogoan-default-rtdb.europe-west1.firebasedatabase.app
 *  - FIREBASE_DB_SECRET  "Database secret" heredado de ese proyecto
 *
 * Es el ÚNICO sitio que ve la clave secreta de Redsys de cada restaurante
 * (guardada en gastrogoan/private/{publicId}/redsysConfig, que ningún
 * navegador puede leer).
 *
 *  - POST /config  guardar, cambiar o desactivar el TPV de un negocio.
 *  - GET  /config  ¿tiene TPV? (nunca devuelve la clave).
 *  - POST /sign    firmar el formulario de pago (lo llama la web de reservas).
 *  - POST /notify  confirmación del banco (servidor a servidor).
 *
 * Cambios del 30/09 (ver worker/README.md):
 *  1. Cambiar o desactivar un TPV ya configurado exige la clave secreta
 *     ACTUAL. Antes bastaba el tenantId —que está en cualquier tablet del
 *     negocio—, y con él se podía poner OTRO código de comercio: los cobros
 *     de los clientes iban al banco de otro.
 *  2. La configuración se guarda con el publicId que usa la web de reservas,
 *     comprobando que es de ese negocio. Antes se deducía del tenantId con la
 *     fórmula antigua, y los negocios con publicId sorteado no podían cobrar.
 *  3. La confirmación del banco se deja TAMBIÉN en gastrogoan/pagos/{publicId}/{ref}.
 *     La app ya no escucha el buzón de la nube compartida (su espejo está en
 *     su propia nube), así que el «pago_confirmado» no le llegaba nunca.
 *  4. Desactivar funciona (antes el Worker lo rechazaba por «faltan datos»).
 */

const REDSYS_URL_TEST = 'https://sis-t.redsys.es:25443/sis/realizarPago';
const REDSYS_URL_REAL = 'https://sis.redsys.es/sis/realizarPago';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

/* ===================== Identificadores ===================== */

// Mismo hash que ggLicHash / publicIdDerivadoAntiguo de js/core.js.
function ggLicHash(str){
  let h = 0x811c9dc5 >>> 0;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function getPublicIdFromTenant(tenantId){
  return ggLicHash(tenantId + '·gastrogoan·public·v1').toString(36).padStart(7, '0');
}
// Van dentro de rutas de Firebase: un «/» o un «.» abriría la puerta a
// escribir donde no toca. Mismo formato que exigen las reglas.
function idValido(s, min, max){
  return typeof s === 'string' && s.length >= min && s.length <= max && /^[A-Za-z0-9_-]+$/.test(s);
}
function claveRefPago(ref){
  return String(ref || '').replace(/[.#$\/\[\]]/g, '_').slice(0, 120);
}
// Comparación en tiempo constante: que no se pueda adivinar la clave
// midiendo cuánto tarda en decir que no.
function iguales(a, b){
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  for(let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0 && a.length > 0;
}

/* ===================== Pure-JS 3DES-EDE CBC (no padding) =====================
   Adapted from the public-domain DES core by Paul Tero (tero.co.uk), as used
   in forge/lib/des.js. Verified bit-for-bit against Node's
   crypto.createCipheriv('des-ede3-cbc', ...). Needed because
   crypto.subtle does not support DES/3DES. */

const spfunction1 = [0x1010400,0,0x10000,0x1010404,0x1010004,0x10404,0x4,0x10000,0x400,0x1010400,0x1010404,0x400,0x1000404,0x1010004,0x1000000,0x4,0x404,0x1000400,0x1000400,0x10400,0x10400,0x1010000,0x1010000,0x1000404,0x10004,0x1000004,0x1000004,0x10004,0,0x404,0x10404,0x1000000,0x10000,0x1010404,0x4,0x1010000,0x1010400,0x1000000,0x1000000,0x400,0x1010004,0x10000,0x10400,0x1000004,0x400,0x4,0x1000404,0x10404,0x1010404,0x10004,0x1010000,0x1000404,0x1000004,0x404,0x10404,0x1010400,0x404,0x1000400,0x1000400,0,0x10004,0x10400,0,0x1010004];
const spfunction2 = [-0x7fef7fe0,-0x7fff8000,0x8000,0x108020,0x100000,0x20,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,0x100000,0x20,-0x7fefffe0,0x108000,0x100020,-0x7fff7fe0,0,-0x80000000,0x8000,0x108020,-0x7ff00000,0x100020,-0x7fffffe0,0,0x108000,0x8020,-0x7fef8000,-0x7ff00000,0x8020,0,0x108020,-0x7fefffe0,0x100000,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,0x8000,-0x7ff00000,-0x7fff8000,0x20,-0x7fef7fe0,0x108020,0x20,0x8000,-0x80000000,0x8020,-0x7fef8000,0x100000,-0x7fffffe0,0x100020,-0x7fff7fe0,-0x7fffffe0,0x100020,0x108000,0,-0x7fff8000,0x8020,-0x80000000,-0x7fefffe0,-0x7fef7fe0,0x108000];
const spfunction3 = [0x208,0x8020200,0,0x8020008,0x8000200,0,0x20208,0x8000200,0x20008,0x8000008,0x8000008,0x20000,0x8020208,0x20008,0x8020000,0x208,0x8000000,0x8,0x8020200,0x200,0x20200,0x8020000,0x8020008,0x20208,0x8000208,0x20200,0x20000,0x8000208,0x8,0x8020208,0x200,0x8000000,0x8020200,0x8000000,0x20008,0x208,0x20000,0x8020200,0x8000200,0,0x200,0x20008,0x8020208,0x8000200,0x8000008,0x200,0,0x8020008,0x8000208,0x20000,0x8000000,0x8020208,0x8,0x20208,0x20200,0x8000008,0x8020000,0x8000208,0x208,0x8020000,0x20208,0x8,0x8020008,0x20200];
const spfunction4 = [0x802001,0x2081,0x2081,0x80,0x802080,0x800081,0x800001,0x2001,0,0x802000,0x802000,0x802081,0x81,0,0x800080,0x800001,0x1,0x2000,0x800000,0x802001,0x80,0x800000,0x2001,0x2080,0x800081,0x1,0x2080,0x800080,0x2000,0x802080,0x802081,0x81,0x800080,0x800001,0x802000,0x802081,0x81,0,0,0x802000,0x2080,0x800080,0x800081,0x1,0x802001,0x2081,0x2081,0x80,0x802081,0x81,0x1,0x2000,0x800001,0x2001,0x802080,0x800081,0x2001,0x2080,0x800000,0x802001,0x80,0x800000,0x2000,0x802080];
const spfunction5 = [0x100,0x2080100,0x2080000,0x42000100,0x80000,0x100,0x40000000,0x2080000,0x40080100,0x80000,0x2000100,0x40080100,0x42000100,0x42080000,0x80100,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,0x80100,0x80000,0x42000100,0x100,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,0x100,0x2000000,0x42080000,0x42080100,0x80100,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,0x80100,0x2000100,0x40000100,0x80000,0,0x40080000,0x2080100,0x40000100];
const spfunction6 = [0x20000010,0x20400000,0x4000,0x20404010,0x20400000,0x10,0x20404010,0x400000,0x20004000,0x404010,0x400000,0x20000010,0x400010,0x20004000,0x20000000,0x4010,0,0x400010,0x20004010,0x4000,0x404000,0x20004010,0x10,0x20400010,0x20400010,0,0x404010,0x20404000,0x4010,0x404000,0x20404000,0x20000000,0x20004000,0x10,0x20400010,0x404000,0x20404010,0x400000,0x4010,0x20000010,0x400000,0x20004000,0x20000000,0x4010,0x20000010,0x20404010,0x404000,0x20400000,0x404010,0x20404000,0,0x20400010,0x10,0x4000,0x20400000,0x404010,0x4000,0x400010,0x20004010,0,0x20404000,0x20000000,0x400010,0x20004010];
const spfunction7 = [0x200000,0x4200002,0x4000802,0,0x800,0x4000802,0x200802,0x4200800,0x4200802,0x200000,0,0x4000002,0x2,0x4000000,0x4200002,0x802,0x4000800,0x200802,0x200002,0x4000800,0x4000002,0x4200000,0x4200800,0x200002,0x4200000,0x800,0x802,0x4200802,0x200800,0x2,0x4000000,0x200800,0x4000000,0x200800,0x200000,0x4000802,0x4000802,0x4200002,0x4200002,0x2,0x200002,0x4000000,0x4000800,0x200000,0x4200800,0x802,0x200802,0x4200800,0x802,0x4000002,0x4200802,0x4200000,0x200800,0,0x2,0x4200802,0,0x200802,0x4200000,0x800,0x4000002,0x4000800,0x800,0x200002];
const spfunction8 = [0x10001040,0x1000,0x40000,0x10041040,0x10000000,0x10001040,0x40,0x10000000,0x40040,0x10040000,0x10041040,0x41000,0x10041000,0x41040,0x1000,0x40,0x10040000,0x10000040,0x10001000,0x1040,0x41000,0x40040,0x10040040,0x10041000,0x1040,0,0,0x10040040,0x10000040,0x10001000,0x41040,0x40000,0x41040,0x40000,0x10041000,0x1000,0x40,0x10040040,0x1000,0x41040,0x10001000,0x40,0x10000040,0x10040000,0x10040040,0x10000000,0x40000,0x10001040,0,0x10041040,0x40040,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,0x41000,0x41000,0x1040,0x1040,0x40040,0x10000000,0x10041000];

function readInt32BE(bytes, offset){
  return ((bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3]) | 0;
}

function createDes3Keys(keyBytes){
  const pc2bytes0  = [0,0x4,0x20000000,0x20000004,0x10000,0x10004,0x20010000,0x20010004,0x200,0x204,0x20000200,0x20000204,0x10200,0x10204,0x20010200,0x20010204];
  const pc2bytes1  = [0,0x1,0x100000,0x100001,0x4000000,0x4000001,0x4100000,0x4100001,0x100,0x101,0x100100,0x100101,0x4000100,0x4000101,0x4100100,0x4100101];
  const pc2bytes2  = [0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808,0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808];
  const pc2bytes3  = [0,0x200000,0x8000000,0x8200000,0x2000,0x202000,0x8002000,0x8202000,0x20000,0x220000,0x8020000,0x8220000,0x22000,0x222000,0x8022000,0x8222000];
  const pc2bytes4  = [0,0x40000,0x10,0x40010,0,0x40000,0x10,0x40010,0x1000,0x41000,0x1010,0x41010,0x1000,0x41000,0x1010,0x41010];
  const pc2bytes5  = [0,0x400,0x20,0x420,0,0x400,0x20,0x420,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420];
  const pc2bytes6  = [0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002,0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002];
  const pc2bytes7  = [0,0x10000,0x800,0x10800,0x20000000,0x20010000,0x20000800,0x20010800,0x20000,0x30000,0x20800,0x30800,0x20020000,0x20030000,0x20020800,0x20030800];
  const pc2bytes8  = [0,0x40000,0,0x40000,0x2,0x40002,0x2,0x40002,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002];
  const pc2bytes9  = [0,0x10000000,0x8,0x10000008,0,0x10000000,0x8,0x10000008,0x400,0x10000400,0x408,0x10000408,0x400,0x10000400,0x408,0x10000408];
  const pc2bytes10 = [0,0x20,0,0x20,0x100000,0x100020,0x100000,0x100020,0x2000,0x2020,0x2000,0x2020,0x102000,0x102020,0x102000,0x102020];
  const pc2bytes11 = [0,0x1000000,0x200,0x1000200,0x200000,0x1200000,0x200200,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200];
  const pc2bytes12 = [0,0x1000,0x8000000,0x8001000,0x80000,0x81000,0x8080000,0x8081000,0x10,0x1010,0x8000010,0x8001010,0x80010,0x81010,0x8080010,0x8081010];
  const pc2bytes13 = [0,0x4,0x100,0x104,0,0x4,0x100,0x104,0x1,0x5,0x101,0x105,0x1,0x5,0x101,0x105];

  const iterations = keyBytes.length > 8 ? 3 : 1;
  const keys = [];
  const shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];

  let n = 0, tmp;
  for(let j = 0; j < iterations; j++){
    let left = readInt32BE(keyBytes, j*8);
    let right = readInt32BE(keyBytes, j*8 + 4);

    tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
    right ^= tmp;
    left ^= (tmp << 4);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 2) ^ right) & 0x33333333;
    right ^= tmp;
    left ^= (tmp << 2);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
    left ^= tmp;
    right ^= (tmp << 8);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    tmp = (left << 8) | ((right >>> 20) & 0x000000f0);

    left = ((right << 24) | ((right << 8) & 0xff0000) |
      ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0));
    right = tmp;

    for(let i = 0; i < shifts.length; ++i){
      if(shifts[i]){
        left = (left << 2) | (left >>> 26);
        right = (right << 2) | (right >>> 26);
      } else {
        left = (left << 1) | (left >>> 27);
        right = (right << 1) | (right >>> 27);
      }
      left &= -0xf;
      right &= -0xf;

      const lefttmp = (
        pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf] |
        pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf] |
        pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf] |
        pc2bytes6[(left >>> 4) & 0xf]);
      const righttmp = (
        pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf] |
        pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf] |
        pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf] |
        pc2bytes13[(right >>> 4) & 0xf]);
      tmp = ((righttmp >>> 16) ^ lefttmp) & 0x0000ffff;
      keys[n++] = lefttmp ^ tmp;
      keys[n++] = righttmp ^ (tmp << 16);
    }
  }

  return keys;
}

function des3EncryptBlock(keys, input, output){
  const iterations = keys.length === 32 ? 3 : 9;
  const looping = iterations === 3 ? [0, 32, 2] : [0, 32, 2, 62, 30, -2, 64, 96, 2];

  let tmp;
  let left = input[0];
  let right = input[1];

  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  left = ((left << 1) | (left >>> 31));
  right = ((right << 1) | (right >>> 31));

  for(let j = 0; j < iterations; j += 3){
    const endloop = looping[j + 1];
    const loopinc = looping[j + 2];

    for(let i = looping[j]; i != endloop; i += loopinc){
      const right1 = right ^ keys[i];
      const right2 = ((right >>> 4) | (right << 28)) ^ keys[i + 1];

      tmp = left;
      left = right;
      right = tmp ^ (
        spfunction2[(right1 >>> 24) & 0x3f] |
        spfunction4[(right1 >>> 16) & 0x3f] |
        spfunction6[(right1 >>>  8) & 0x3f] |
        spfunction8[right1 & 0x3f] |
        spfunction1[(right2 >>> 24) & 0x3f] |
        spfunction3[(right2 >>> 16) & 0x3f] |
        spfunction5[(right2 >>>  8) & 0x3f] |
        spfunction7[right2 & 0x3f]);
    }
    tmp = left;
    left = right;
    right = tmp;
  }

  left = ((left >>> 1) | (left << 31));
  right = ((right >>> 1) | (right << 31));

  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  output[0] = left;
  output[1] = right;
}

// 3DES-EDE CBC encryption, IV = 8 zero bytes, no padding. `data.length` must be a multiple of 8.
function des3cbcEncryptNoPad(keyBytes, data){
  const keys = createDes3Keys(keyBytes);
  const out = new Uint8Array(data.length);
  let prev = [0, 0];

  for(let off = 0; off < data.length; off += 8){
    const b0 = readInt32BE(data, off);
    const b1 = readInt32BE(data, off + 4);
    const inBlock = [b0 ^ prev[0], b1 ^ prev[1]];
    const outBlock = [0, 0];
    des3EncryptBlock(keys, inBlock, outBlock);
    out[off]   = (outBlock[0] >>> 24) & 0xff;
    out[off+1] = (outBlock[0] >>> 16) & 0xff;
    out[off+2] = (outBlock[0] >>> 8) & 0xff;
    out[off+3] = outBlock[0] & 0xff;
    out[off+4] = (outBlock[1] >>> 24) & 0xff;
    out[off+5] = (outBlock[1] >>> 16) & 0xff;
    out[off+6] = (outBlock[1] >>> 8) & 0xff;
    out[off+7] = outBlock[1] & 0xff;
    prev = outBlock;
  }

  return out;
}

/* ===================== base64 helpers ===================== */

function bytesToBase64(bytes){
  let bin = '';
  for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToBytes(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function base64UrlToBase64(s){
  return s.replace(/-/g, '+').replace(/_/g, '/');
}
function utf8ToBytes(str){
  return new TextEncoder().encode(str);
}

/* ===================== Redsys HMAC_SHA256_V1 signature ===================== */

// Pads `bytes` with zero bytes to the next multiple of 8.
function padTo8(bytes){
  const rem = bytes.length % 8;
  if(rem === 0) return bytes;
  const out = new Uint8Array(bytes.length + (8 - rem));
  out.set(bytes);
  return out;
}

async function redsysSign(orderId, merchantParamsB64, claveSecretaB64){
  const key = base64ToBytes(claveSecretaB64);
  const orderPadded = padTo8(utf8ToBytes(orderId));
  const derivedKey = des3cbcEncryptNoPad(key, orderPadded);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', derivedKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, utf8ToBytes(merchantParamsB64));
  return bytesToBase64(new Uint8Array(sig));
}

/* ===================== Firebase RTDB REST helpers ===================== */

function fbUrl(env, path){
  return `${env.FIREBASE_DB_URL}/${path}.json?auth=${env.FIREBASE_DB_SECRET}`;
}
async function fbGet(env, path){
  const res = await fetch(fbUrl(env, path));
  if(!res.ok) throw new Error('Firebase GET ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPut(env, path, data){
  const res = await fetch(fbUrl(env, path), { method: 'PUT', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase PUT ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPush(env, path, data){
  const res = await fetch(fbUrl(env, path), { method: 'POST', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase POST ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbDelete(env, path){
  const res = await fetch(fbUrl(env, path), { method: 'DELETE' });
  if(!res.ok) throw new Error('Firebase DELETE ' + path + ' failed: ' + res.status);
}
const rutaConfig = publicId => `gastrogoan/private/${publicId}/redsysConfig`;

/* ===================== ¿Este publicId es de este negocio? =====================
   Un publicId sorteado no se puede deducir del tenantId, así que se comprueba
   que los dos apuntan a la MISMA nube: tenantLookup/{tenantId} (lo publica la
   app al conectarse) y publicLookup/{publicId} (lo publica al mudar el espejo
   a su nube, y no se puede sobrescribir). Sin esto, bastaría con saber el
   publicId —que va impreso en el QR de la mesa— para enganchar un TPV ajeno a
   la web de reservas de cualquier restaurante. */
async function publicIdDelNegocio(env, tenantId, publicId){
  const derivado = getPublicIdFromTenant(tenantId);
  if(!publicId || publicId === derivado) return {ok: true, publicId: derivado, derivado};
  const [tl, pl] = await Promise.all([
    fbGet(env, `gastrogoan/tenantLookup/${tenantId}`),
    fbGet(env, `gastrogoan/publicLookup/${publicId}`)
  ]);
  const ok = !!(tl && pl && tl.databaseURL && tl.databaseURL === pl.databaseURL);
  return {ok, publicId, derivado};
}
// La configuración de un negocio: donde debe estar, o donde la dejó la
// versión antigua (publicId deducido del tenantId).
async function configDelNegocio(env, v){
  let cfg = await fbGet(env, rutaConfig(v.publicId));
  if(cfg) return {cfg, en: v.publicId};
  if(v.derivado !== v.publicId){
    cfg = await fbGet(env, rutaConfig(v.derivado));
    if(cfg) return {cfg, en: v.derivado};
  }
  return {cfg: null, en: null};
}
// Si estaba en el sitio antiguo, se muda al publicId de verdad (el Worker ya
// tiene la clave: no hace falta pedírsela a nadie).
async function mudarSiHaceFalta(env, v, actual){
  if(!actual.cfg || actual.en === v.publicId) return;
  await fbPut(env, rutaConfig(v.publicId), actual.cfg);
  await fbDelete(env, rutaConfig(actual.en));
}

/* ===================== HTTP handlers ===================== */

async function handleConfigPost(req, env){
  const body = await req.json().catch(() => ({}));
  let { tenantId, publicId, fuc, terminal, claveSecreta, claveActual, ambiente, disabled } = body || {};
  if(!idValido(tenantId, 4, 60)) return json({ error: 'Falta el tenantId' }, 400);
  if(publicId && !idValido(publicId, 4, 40)) return json({ error: 'publicId no válido' }, 400);

  const v = await publicIdDelNegocio(env, tenantId, publicId);
  if(!v.ok) return json({ error: 'Este enlace público no es de este negocio', code: 'no_vinculado' }, 403);

  const actual = await configDelNegocio(env, v);
  // Ya hay un TPV (activo o desactivado): cambiarlo o quitarlo exige su clave.
  if(actual.cfg && actual.cfg.claveSecreta && !iguales(claveActual, actual.cfg.claveSecreta)){
    return json({ error: 'Para cambiar o desactivar el TPV hace falta la clave secreta que tiene puesta ahora', code: 'clave_actual' }, 403);
  }

  if(disabled){
    if(!actual.cfg) return json({ ok: true, publicId: v.publicId });
    await fbPut(env, rutaConfig(v.publicId), Object.assign({}, actual.cfg, { disabled: true, updatedAt: new Date().toISOString() }));
    if(actual.en !== v.publicId) await fbDelete(env, rutaConfig(actual.en));
    return json({ ok: true, publicId: v.publicId });
  }

  if(!fuc || !terminal || !claveSecreta){
    return json({ error: 'Faltan datos (fuc, terminal, claveSecreta)' }, 400);
  }
  fuc = String(fuc).trim();
  terminal = String(terminal).trim();
  claveSecreta = String(claveSecreta).trim();
  if(!/^\d{1,12}$/.test(fuc) || !/^\d{1,3}$/.test(terminal)){
    return json({ error: 'Código de comercio o terminal no válidos' }, 400);
  }

  // La clave: Base64 de 16 o 24 bytes.
  let keyBytes;
  try { keyBytes = base64ToBytes(claveSecreta); } catch(e){ keyBytes = null; }
  if(!keyBytes || (keyBytes.length !== 16 && keyBytes.length !== 24)){
    return json({ error: 'Clave secreta inválida (debe ser Base64 de 16 o 24 bytes)' }, 400);
  }

  await fbPut(env, rutaConfig(v.publicId), {
    fuc,
    terminal,
    claveSecreta,
    ambiente: ambiente === 'real' ? 'real' : 'test',
    updatedAt: new Date().toISOString()
  });
  if(actual.en && actual.en !== v.publicId) await fbDelete(env, rutaConfig(actual.en));
  return json({ ok: true, publicId: v.publicId });
}

async function handleConfigGet(req, env, url){
  const tenantId = url.searchParams.get('tenantId');
  const publicIdParam = url.searchParams.get('publicId');
  let cfg = null, publicId = null;
  if(tenantId){
    // Desde la app: se localiza (y si hace falta se muda) la configuración.
    if(!idValido(tenantId, 4, 60)) return json({ error: 'tenantId no válido' }, 400);
    if(publicIdParam && !idValido(publicIdParam, 4, 40)) return json({ error: 'publicId no válido' }, 400);
    const v = await publicIdDelNegocio(env, tenantId, publicIdParam);
    // Si el publicId no se puede vincular, se responde por el deducido: es
    // lo que había antes y no rompe a nadie.
    const vv = v.ok ? v : {publicId: v.derivado, derivado: v.derivado};
    const actual = await configDelNegocio(env, vv);
    if(v.ok) await mudarSiHaceFalta(env, vv, actual);
    cfg = actual.cfg; publicId = vv.publicId;
  }else{
    // Desde la web de reservas: solo por publicId.
    if(!idValido(publicIdParam, 4, 40)) return json({ error: 'Falta tenantId o publicId' }, 400);
    publicId = publicIdParam;
    cfg = await fbGet(env, rutaConfig(publicId));
  }
  if(!cfg || cfg.disabled || !cfg.fuc) return json({ configured: false, publicId });
  return json({ configured: true, publicId, fuc: cfg.fuc, terminal: cfg.terminal, ambiente: cfg.ambiente });
}

async function handleSign(req, env, url){
  const body = await req.json().catch(() => ({}));
  const { publicId, orderRef, amount, description, urlOk, urlKo } = body || {};
  if(!idValido(publicId, 4, 40) || !orderRef || !(amount > 0)){
    return json({ error: 'Faltan datos (publicId, orderRef, amount)' }, 400);
  }

  // Cordura sobre el importe. Lo que de verdad protege al negocio no es esto:
  // es que la app compara lo que el BANCO confirma (firmado por Redsys) con
  // lo que el pedido cuesta según SU carta, y si falta dinero no lo da por
  // pagado. Aquí solo se descarta lo que no tiene sentido en ningún pedido.
  // (Tolerancia: 19.90 * 100 da 1989.9999999999998 en JS.)
  const amountNum = Number(amount);
  const MAX_AMOUNT = 3000;
  const amountCentsCheck = Math.round(amountNum * 100);
  if(!isFinite(amountNum) || amountNum <= 0 || amountNum > MAX_AMOUNT || Math.abs(amountCentsCheck - amountNum * 100) > 0.01){
    return json({ error: 'Importe inválido' }, 400);
  }

  const cfg = await fbGet(env, rutaConfig(publicId));
  if(!cfg || cfg.disabled || !cfg.fuc) return json({ error: 'Este negocio no tiene configurado el pago con tarjeta' }, 404);

  // Ds_Merchant_Order: 4-12 caracteres, los 4 primeros numéricos. Hora + azar:
  // con solo la hora, dos pagos en el mismo milisegundo chocaban.
  const azar = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');
  const orderId = String(Date.now()).slice(-8) + azar;

  const params = {
    Ds_Merchant_Amount: String(amountCentsCheck),
    Ds_Merchant_Currency: '978',
    Ds_Merchant_Order: orderId,
    Ds_Merchant_MerchantCode: cfg.fuc,
    Ds_Merchant_Terminal: cfg.terminal,
    Ds_Merchant_TransactionType: '0',
    Ds_Merchant_MerchantURL: url.origin + '/notify',
    Ds_Merchant_MerchantData: JSON.stringify({ publicId, orderRef: String(orderRef).slice(0, 120) }),
    Ds_Merchant_ConsumerLanguage: '001'
  };
  if(description) params.Ds_Merchant_ProductDescription = String(description).slice(0, 125);
  if(urlOk) params.Ds_Merchant_UrlOK = String(urlOk).slice(0, 250);
  if(urlKo) params.Ds_Merchant_UrlKO = String(urlKo).slice(0, 250);

  const merchantParamsB64 = bytesToBase64(utf8ToBytes(JSON.stringify(params)));
  const signature = await redsysSign(orderId, merchantParamsB64, cfg.claveSecreta);

  // Rastro auditable. No bloquea el cobro si falla.
  try {
    await fbPush(env, `gastrogoan/private/${publicId}/redsysSignLog`, {
      orderRef: String(orderRef).slice(0, 120), orderId, amount: amountNum, createdAt: new Date().toISOString()
    });
  } catch(e){ /* no bloquea el cobro por esto */ }

  return json({
    url: cfg.ambiente === 'real' ? REDSYS_URL_REAL : REDSYS_URL_TEST,
    fields: {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParamsB64,
      Ds_Signature: signature
    }
  });
}

async function handleNotify(req, env){
  let merchantParamsB64, signature;
  const contentType = req.headers.get('content-type') || '';
  if(contentType.includes('application/json')){
    const body = await req.json();
    merchantParamsB64 = body.Ds_MerchantParameters;
    signature = body.Ds_Signature;
  } else {
    const form = await req.formData();
    merchantParamsB64 = form.get('Ds_MerchantParameters');
    signature = form.get('Ds_Signature');
  }

  if(!merchantParamsB64 || !signature){
    return new Response('Missing params', { status: 400 });
  }

  let params;
  try {
    params = JSON.parse(new TextDecoder().decode(base64ToBytes(base64UrlToBase64(merchantParamsB64))));
  } catch(e){
    return new Response('Bad params', { status: 400 });
  }

  let merchantData;
  try { merchantData = JSON.parse(params.Ds_MerchantData || '{}'); } catch(e){ merchantData = {}; }
  const { publicId, orderRef } = merchantData;
  if(!idValido(publicId, 4, 40) || !orderRef){
    return new Response('OK'); // nada que hacer, pero que Redsys no reintente para siempre
  }

  // Aunque esté desactivado se verifica igual: el cobro ya se hizo y el
  // negocio tiene que enterarse.
  const cfg = await fbGet(env, rutaConfig(publicId));
  if(!cfg || !cfg.claveSecreta) return new Response('OK');

  const expected = await redsysSign(params.Ds_Order, merchantParamsB64, cfg.claveSecreta);
  if(expected !== base64UrlToBase64(signature)){
    return new Response('Invalid signature', { status: 400 });
  }

  const responseCode = parseInt(params.Ds_Response, 10);
  if(responseCode >= 0 && responseCode <= 99){
    const pago = {
      type: 'pago_confirmado',
      orderRef: String(orderRef).slice(0, 120),
      amount: Number(params.Ds_Amount) / 100,
      dsOrder: String(params.Ds_Order || ''),
      createdAt: new Date().toISOString()
    };
    // Donde lo PREGUNTA la app (ver comprobarPagosTarjeta, js/core.js). Con
    // PUT y clave fija: si Redsys reintenta el aviso, no se duplica.
    await fbPut(env, `gastrogoan/pagos/${publicId}/${claveRefPago(orderRef)}`, pago);
    // Y en el buzón de la nube compartida, para los negocios que aún tienen
    // allí su espejo (reglas antiguas). A los demás no les llega, y no pasa
    // nada: lo recogen de arriba.
    try { await fbPush(env, `gastrogoan/public/${publicId}/requests`, pago); } catch(e){}
  }

  return new Response('OK');
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);

    if(req.method === 'OPTIONS'){
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if(url.pathname === '/config' && req.method === 'POST') return await handleConfigPost(req, env);
      if(url.pathname === '/config' && req.method === 'GET') return await handleConfigGet(req, env, url);
      if(url.pathname === '/sign' && req.method === 'POST') return await handleSign(req, env, url);
      if(url.pathname === '/notify' && req.method === 'POST') return await handleNotify(req, env);
      return json({ error: 'Not found' }, 404);
    } catch(e){
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
};
