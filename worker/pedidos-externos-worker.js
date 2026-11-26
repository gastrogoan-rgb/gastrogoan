/* ───────────────────────────────────────────────────────────────────────────────────────────────
   PUENTE DE PEDIDOS EXTERNOS (Glovo, Uber Eats, Just Eat, Deliveroo, agregadores…) — 17/11

   Qué hace: recibe UN pedido ya normalizado (JSON) por HTTPS y lo deja en el buzón del restaurante (su propia Firebase,
   `gastrogoan/public/{publicId}/requests`, el MISMO buzón por el que entran los pedidos de su web). La app lo ve al instante:
   sale en el TPV, en «Para llevar / Delivery», con la etiqueta de la plataforma y SIEMPRE por aceptar.

   Por qué es así: ninguna plataforma deja «preguntar» desde el navegador (los pedidos llegan por webhook a una URL pública), y
   la app corre entera en el navegador. Este Worker es la pieza mínima que da esa URL. Plan gratuito de Cloudflare: 100.000
   peticiones al día; ningún coste por cliente. Se publica pegándolo a mano en Cloudflare (igual que pagos-worker.js).

   QUIÉN LE ENVÍA LOS PEDIDOS (cualquiera de estas fuentes, todas hacen POST /pedido a este Worker):
     1. Un agregador (Deliverect…): su webhook → un pequeño adaptador que traduce su formato a este (ver `normalizar`).
     2. La API oficial de Glovo / Uber Eats cuando den acceso (adaptador en esta misma función).
     3. El correo de aviso de pedido que la plataforma manda al restaurante, reenviado a una dirección de Cloudflare Email
        Routing que ejecuta un Email Worker (gratis) y hace POST aquí.
     4. Automatizaciones del propio restaurante (Make, Zapier, n8n) con su plan gratuito.

   Formato del POST /pedido (JSON):
     { "publicId": "abc12de", "plataforma": "glovo", "ref": "G-12345", "tipo": "domicilio"|"recoger",
       "clienteNombre": "...", "clienteTelefono": "...", "clienteDireccion": "...", "codigoPostal": "...", "notas": "...",
       "hora": "21:30", "total": 24.5, "comision": 5.1,
       "items": [ { "nombre": "Hamburguesa", "cantidad": 2, "precio": 9.5, "notas": "sin cebolla" } ] }

   Variables del Worker (Settings → Variables): FIREBASE_DB_URL y FIREBASE_SERVICE_ACCOUNT (las mismas que pagos-worker.js; FIREBASE_DB_SECRET sigue valiendo, pero está obsoleto:
   leen gastrogoan/publicLookup/{publicId} en la plataforma) y PUENTE_CLAVE, OBLIGATORIA desde el 25/11 (auditoría de seguridad):
   cada POST debe llevar la cabecera `x-puente-clave` con ese valor. Antes era opcional y SIN ella cualquiera con el publicId
   (va impreso en el QR del local) podía inyectar pedidos falsos con el nombre de una plataforma, mezclados con los reales de
   Glovo/Uber. Sin la variable el Worker NO funciona (responde 503): un despliegue olvidado falla a la vista en vez de quedar abierto.
   ─────────────────────────────────────────────────────────────────────────────────────────────── */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-puente-clave',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...CORS } });
const idValido = (s, min, max) => typeof s === 'string' && s.length >= min && s.length <= max && /^[A-Za-z0-9_-]+$/.test(s);
const num = (v, max) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
const txt = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

// Deja el cuerpo listo para el buzón: solo campos conocidos, con tope de tamaño. Lo que sobra se descarta.
export function normalizar(b) {
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(l => ({
    nombre: txt(l && (l.nombre || l.name), 120),
    cantidad: Math.max(1, Math.round(num(l && (l.cantidad != null ? l.cantidad : l.qty), 99)) || 1),
    precio: num(l && (l.precio != null ? l.precio : l.price), 5000),
    notas: txt(l && l.notas, 200),
  })).filter(l => l.nombre);
  return {
    type: 'pedido',
    plataforma: txt(b.plataforma, 20).toLowerCase().replace(/[^a-z0-9]/g, '') || 'otro',
    ref: txt(b.ref, 60),
    tipo: /recoger|takeaway|pickup/i.test(String(b.tipo || '')) ? 'recoger' : 'domicilio',
    clienteNombre: txt(b.clienteNombre, 80), clienteTelefono: txt(b.clienteTelefono, 30),
    clienteDireccion: txt(b.clienteDireccion, 160), codigoPostal: txt(b.codigoPostal, 10),
    notas: txt(b.notas, 300), hora: txt(b.hora, 5),
    total: num(b.total, 50000), comision: b.comision != null ? num(b.comision, 5000) : undefined,
    items,
    createdAt: Date.now(),                       // lo exigen las reglas de la nube del negocio
  };
}

// Comparación sin atajos (el tiempo no depende de en qué carácter falla).
function clavesIguales(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* Cómo se identifica el Worker ante Firebase. Lo normal ahora es una CUENTA DE SERVICIO (FIREBASE_SERVICE_ACCOUNT, el JSON
   que descarga Firebase): el Worker firma un JWT con su clave privada, Google le da un token de una hora y ese token va en
   cada llamada REST. Los «secretos de la base de datos» (FIREBASE_DB_SECRET) están OBSOLETOS en Firebase: se conservan solo como
   respaldo para quien aún no haya cambiado, y si están las dos cosas manda la cuenta de servicio. Sin Admin SDK: no corre en Workers. */
let _tokenGoogle = null;   // {token, exp, clave}: vive mientras viva la instancia del Worker; así no se pide un token por llamada
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlTexto = txt => b64url(new TextEncoder().encode(txt));
let _tokenPendiente = null;   // la petición a Google en curso: dos llamadas a Firebase a la vez comparten UN solo token, no piden uno cada una
async function tokenDeGoogle(env){
  const ahora = Math.floor(Date.now() / 1000);
  if(_tokenGoogle && _tokenGoogle.clave === env.FIREBASE_SERVICE_ACCOUNT && _tokenGoogle.exp - 120 > ahora) return _tokenGoogle.token;
  if(!_tokenPendiente || _tokenPendiente.clave !== env.FIREBASE_SERVICE_ACCOUNT){
    const p = pedirTokenAGoogle(env, ahora).finally(() => { if(_tokenPendiente && _tokenPendiente.p === p) _tokenPendiente = null; });
    _tokenPendiente = {p, clave: env.FIREBASE_SERVICE_ACCOUNT};
  }
  return _tokenPendiente.p;
}
async function pedirTokenAGoogle(env, ahora){
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT); } catch(e){ throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido'); }
  if(!sa.client_email || !sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT no trae client_email y private_key');
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey('pkcs8', der, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['sign']);
  const cab = b64urlTexto(JSON.stringify({alg: 'RS256', typ: 'JWT'}));
  const cuerpo = b64urlTexto(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600,
  }));
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave, new TextEncoder().encode(cab + '.' + cuerpo));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: cab + '.' + cuerpo + '.' + b64url(firma)}),
  });
  if(!r.ok) throw new Error('Google token failed: ' + r.status);
  const j = await r.json();
  _tokenGoogle = {token: j.access_token, exp: ahora + (j.expires_in || 3600), clave: env.FIREBASE_SERVICE_ACCOUNT};
  return _tokenGoogle.token;
}
async function fbUrl(env, path){
  const base = `${env.FIREBASE_DB_URL}/${path}.json`;
  if(env.FIREBASE_SERVICE_ACCOUNT) return `${base}?access_token=${encodeURIComponent(await tokenDeGoogle(env))}`;
  if(env.FIREBASE_DB_SECRET) return `${base}?auth=${env.FIREBASE_DB_SECRET}`;
  throw new Error('Falta FIREBASE_SERVICE_ACCOUNT (o, heredado, FIREBASE_DB_SECRET)');
}
async function fbPlataforma(env, path) {
  const r = await fetch(await fbUrl(env, path));
  if (!r.ok) throw new Error('plataforma ' + r.status);
  return r.json();
}

// Entra en la nube del restaurante como sesión anónima (la misma que usa su web pública) y deja el pedido en el buzón.
async function depositar(env, publicId, pedido) {
  const dest = await fbPlataforma(env, `gastrogoan/publicLookup/${publicId}`);
  if (!dest || !dest.apiKey || !dest.databaseURL) return { ok: false, motivo: 'negocio-desconocido' };
  const alta = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(dest.apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
  });
  const sesion = await alta.json();
  if (!alta.ok || !sesion.idToken) return { ok: false, motivo: 'sin-sesion' };
  const res = await fetch(`${dest.databaseURL}/gastrogoan/public/${publicId}/requests.json?auth=${sesion.idToken}`, {
    method: 'POST', body: JSON.stringify(pedido),
  });
  if (!res.ok) return { ok: false, motivo: 'rechazado-' + res.status };
  return { ok: true };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (url.pathname !== '/pedido' || req.method !== 'POST') return json({ error: 'No existe' }, 404);
    // Cerrado por defecto: sin PUENTE_CLAVE configurada no se acepta NADA (ni siquiera con cabecera vacía).
    if (!env.PUENTE_CLAVE || String(env.PUENTE_CLAVE).length < 16) return json({ error: 'Puente sin configurar: falta PUENTE_CLAVE (mínimo 16 caracteres)' }, 503);
    if (!clavesIguales(req.headers.get('x-puente-clave') || '', String(env.PUENTE_CLAVE))) return json({ error: 'Clave incorrecta' }, 401);
    let cuerpo;
    try { cuerpo = await req.json(); } catch (e) { return json({ error: 'JSON no válido' }, 400); }
    if (!idValido(cuerpo.publicId, 4, 60)) return json({ error: 'Falta el publicId' }, 400);
    const pedido = normalizar(cuerpo);
    if (!pedido.items.length) return json({ error: 'El pedido no tiene líneas' }, 400);
    try {
      const r = await depositar(env, cuerpo.publicId, pedido);
      return r.ok ? json({ ok: true }) : json({ error: r.motivo }, r.motivo === 'negocio-desconocido' ? 404 : 502);
    } catch (e) {
      return json({ error: 'No se pudo entregar' }, 502);
    }
  },
};
