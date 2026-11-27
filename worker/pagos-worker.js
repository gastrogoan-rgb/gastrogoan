/**
 * GastroGoan - pagos online con Stripe. Cloudflare Worker `gastro`.
 *
 * ⚠️ ESTE FICHERO ES LA FUENTE DE LA VERDAD del Worker, pero NO se publica
 * solo: hay que pegarlo a mano en Cloudflare → Workers → gastro → Editar
 * código → Desplegar (ver worker/README.md). Sin claves: viven en Cloudflare
 * (Settings → Variables and Secrets) y NUNCA se escriben aquí:
 *  - FIREBASE_DB_URL        base de datos de `plataforma-gastrogoan`
 *  - FIREBASE_SERVICE_ACCOUNT  el JSON de una cuenta de servicio de `plataforma-gastrogoan` (secreto). Sustituye al
 *                           «Database secret», que Firebase ya da por obsoleto
 *  - FIREBASE_DB_SECRET     (heredado, opcional) su "Database secret": solo si no hay cuenta de servicio
 *  - STRIPE_SECRET_KEY      clave secreta de la cuenta de Stripe de GastroGoan
 *  - STRIPE_WEBHOOK_SECRET  secreto de firma del webhook (eventos de cuentas conectadas)
 *
 * Modelo (30/09): Stripe Connect (Accounts v2, panel completo, comisiones y
 * pérdidas a cargo del restaurante) con cobros directos. Cada
 * restaurante tiene SU cuenta de Stripe; el dinero va directo a ella y Stripe
 * le cobra la comisión a él. GastroGoan no toca el dinero ni paga nada. Aquí
 * solo se guarda qué cuenta de Stripe es de qué negocio
 * (gastrogoan/private/{publicId}/stripe), nunca una clave del negocio.
 *
 *  - POST /stripe/conectar     alta (o continuar el alta) de la cuenta del negocio. Solo el dueño (ownerAuthKey).
 *  - GET  /stripe/estado       ¿cobra con tarjeta? (sin datos de la cuenta).
 *  - POST /stripe/estado       lo mismo, con la prueba de propietario: ve además a nombre de quién.
 *  - POST /stripe/desconectar  deja de ofrecer el pago con tarjeta. Solo el dueño (ownerAuthKey).
 *  - POST /stripe/pagar        crea el pago (Stripe Checkout) en la cuenta del negocio.
 *  - POST /stripe/webhook      Stripe avisa de que está pagado; se verifica la firma.
 *
 * Sustituye al puente con Redsys: su aviso de pago dependía de cómo tuviera
 * configurado cada banco el TPV, y con el de pruebas no llegaba nunca. El de
 * Stripe llega siempre y se puede probar de punta a punta.
 */

const STRIPE_API = 'https://api.stripe.com/v1';
// Las cuentas de los restaurantes se crean con Accounts v2: Stripe ya no deja
// crear cuentas con la API v1 en integraciones nuevas («Stripe no longer
// recommends Accounts v1…», 30/09), y en esta cuenta no se puede reactivar.
// Los cobros (Checkout) y los avisos siguen en v1, que es lo normal.
const STRIPE_API_V2 = 'https://api.stripe.com/v2';
const STRIPE_VERSION_V2 = '2026-06-24.preview';
// A dónde puede volver el navegador después de Stripe. Una lista cerrada:
// si no, el Worker serviría para mandar a cualquiera a cualquier web.
const ORIGENES_APP = ['https://app.gastrogoan.com'];
const ORIGENES_WEB = ['https://reservas.gastrogoan.com'];

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
function urlPermitida(u, origenes){
  try {
    const x = new URL(u);
    if(x.protocol === 'http:' && (x.hostname === 'localhost' || x.hostname === '127.0.0.1')) return true;   // pruebas
    return origenes.includes(x.origin);
  } catch(e){ return false; }
}

/* ===================== Firebase (plataforma) por REST ===================== */

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
async function fbGet(env, path){
  const res = await fetch(await fbUrl(env, path));
  if(!res.ok) throw new Error('Firebase GET ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPut(env, path, data){
  const res = await fetch(await fbUrl(env, path), { method: 'PUT', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase PUT ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPatch(env, path, data){
  const res = await fetch(await fbUrl(env, path), { method: 'PATCH', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase PATCH ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPush(env, path, data){
  const res = await fetch(await fbUrl(env, path), { method: 'POST', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase POST ' + path + ' failed: ' + res.status);
  return res.json();
}
const rutaStripe = publicId => `gastrogoan/private/${publicId}/stripe`;
// Pruebas y real son dos mundos aparte en Stripe: una cuenta conectada en
// modo pruebas NO existe con la clave real. Cada cuenta guardada lleva su
// modo, y una del otro modo se trata como si no hubiera ninguna: al pasar a
// real, el negocio vuelve a pulsar «Conectar con Stripe» y ya está, sin
// tocar Firebase a mano. Las guardadas antes de esto eran todas de pruebas.
const modoStripe = env => String(env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'real' : 'pruebas';
async function leerCfgStripe(env, publicId){
  const cfg = await fbGet(env, rutaStripe(publicId));
  if(!cfg || !cfg.accountId) return cfg;
  return (cfg.modo || 'pruebas') === modoStripe(env) ? cfg : null;
}

/* ===================== Stripe por REST ===================== */

// Stripe pide los datos como formulario, con los anidados entre corchetes:
// {line_items: [{price_data: {currency: 'eur'}}]} → line_items[0][price_data][currency]=eur
function aFormulario(obj, prefijo, out){
  out = out || new URLSearchParams();
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if(v === undefined || v === null) return;
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if(typeof v === 'object') aFormulario(v, clave, out);
    else out.append(clave, String(v));
  });
  return out;
}
async function stripe(env, metodo, ruta, datos, cuenta){
  const headers = { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY };
  if(cuenta) headers['Stripe-Account'] = cuenta;   // actuar sobre la cuenta del restaurante
  const opts = { method: metodo, headers };
  if(datos){
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = aFormulario(datos).toString();
  }
  const res = await fetch(STRIPE_API + ruta, opts);
  const j = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error((j.error && j.error.message) || ('Stripe ' + res.status));
  return j;
}

// v2 va en JSON, con su versión en la cabecera.
async function stripeV2(env, metodo, ruta, datos){
  const headers = { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY, 'Stripe-Version': STRIPE_VERSION_V2 };
  const opts = { method: metodo, headers };
  if(datos){ headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(datos); }
  const res = await fetch(STRIPE_API_V2 + ruta, opts);
  const j = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error((j.error && j.error.message) || ('Stripe ' + res.status));
  return j;
}
const leerCuenta = (env, id) => stripeV2(env, 'GET', `/core/accounts/${id}?include=configuration.merchant&include=requirements`);

/* ===================== ¿Quien llama es el DUEÑO? (auditoría 25/11, hallazgo 2) =====================
   El tenantId lo conoce cualquier empleado (entra con el código) y todo lo que cuelga de `tenants/{tenantId}` lo lee quien lo sepa, así que
   NO prueba que quien llama sea el dueño: con él solo se podía crear una cuenta de Stripe a nombre de otro y enlazarla al negocio ajeno, o
   apagarle el cobro con tarjeta. Lo que solo sabe el dueño es el authKey de su cuenta (ruta derivada de usuario + PIN: ni se puede listar ni
   se deduce del código). La app lo manda en `ownerAuthKey` y el Worker lo comprueba contra la plataforma con su clave de administrador:
     1. existe `ownerAuth/{authKey}` y de él cuelga `businesses/{tenantId}` sin lápida (el negocio es de ESA cuenta);
     2. el código guardado ahí, pasado por el MISMO algoritmo que la app, da exactamente ese tenantId (nadie puede colgarse en su cuenta un
        negocio ajeno poniendo un código cualquiera: `businesses/*` es escribible por cualquier cuenta, así que lo de 1 solo no vale);
     3. el código no está reservado por OTRO dueño en `codeClaims` (sin reserva = negocio anterior a las reservas: se acepta, porque pasar el
        punto 2 ya exige conocer el código, que es la raíz del negocio).
   Cambiar el PIN NO deja al dueño fuera: la cuenta se muda a la ruta nueva CON su lista de negocios dentro (changeOwnerAccessPin), así que el
   authKey nuevo pasa igual y no hay nada que migrar en el Worker. No se guarda ninguna credencial aquí (por eso no hay «primera vez gana»,
   que dejaría a un atacante adelantado con el negocio secuestrado). Los avisos de pago y el cobro del comensal NO pasan por aquí.
   Las funciones de abajo son una copia de las de js/core.js (ggOwnerUser, ggOwnerDerive, ggOwnerId, ggBizTenantId): test/pagos-worker.mjs
   las compara con las de la app, para que no se separen. */
const GG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const _ggBizSecret = () => [117,117,197,112,119,136,197,64,62,64,68,197,127,65].map(x => String.fromCharCode(x - 14)).join('');
const _ggOwnerSecret = () => [117,117,197,125,133,124,115,128,197,64,62,64,68,197,121,69].map(x => String.fromCharCode(x - 14)).join('');
function ggOwnerUser(raw){
  return String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function ggOwnerDerive(input, groups){
  const out = [];
  let h = ggLicHash(input);
  for(let g = 0; g < groups; g++){
    h = ggLicHash(input + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += GG_ALPHABET[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('');
}
function ggOwnerId(user){
  const u = ggOwnerUser(user);
  return u ? ggOwnerDerive(u + _ggOwnerSecret() + '·owner', 5) : null;
}
function ggBizTenantId(code){
  const secret = _ggBizSecret() + '·tenant';
  const out = [];
  let h = ggLicHash(code + secret);
  for(let g = 0; g < 5; g++){
    h = ggLicHash(code + secret + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += GG_ALPHABET[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('');
}
async function esDuenoDelNegocio(env, tenantId, authKey){
  // El authKey va dentro de una ruta de Firebase: solo letras y números, y de la longitud que fabrica la app (24).
  if(typeof authKey !== 'string' || !/^[A-Za-z0-9]{16,64}$/.test(authKey)) return false;
  const cuenta = await fbGet(env, `gastrogoan/ownerAuth/${authKey}`);
  const negocio = cuenta && cuenta.businesses && cuenta.businesses[tenantId];
  if(!negocio || negocio.deleted || typeof negocio.code !== 'string' || !/^[A-Za-z0-9]{4,16}$/.test(negocio.code)) return false;
  if(ggBizTenantId(negocio.code) !== tenantId) return false;
  const reservado = await fbGet(env, `gastrogoan/codeClaims/${negocio.code}`);
  if(reservado && reservado !== ggOwnerId(cuenta.user)) return false;
  return true;
}

/* ===================== ¿Este publicId es de este negocio? =====================
   Un publicId sorteado no se puede deducir del tenantId, así que se comprueba
   que los dos apuntan a la MISMA nube: tenantLookup/{tenantId} (lo publica la
   app al conectarse) y publicLookup/{publicId} (lo publica al mudar el espejo
   a su nube, y no se puede sobrescribir). Sin esto, bastaría con el publicId
   —que va impreso en el QR de la mesa— para enganchar una cuenta de Stripe
   ajena a la web de reservas de cualquier restaurante. */
async function publicIdDelNegocio(env, tenantId, publicId){
  const derivado = getPublicIdFromTenant(tenantId);
  if(!publicId || publicId === derivado) return {ok: true, publicId: derivado};
  const [tl, pl] = await Promise.all([
    fbGet(env, `gastrogoan/tenantLookup/${tenantId}`),
    fbGet(env, `gastrogoan/publicLookup/${publicId}`)
  ]);
  return {ok: !!(tl && pl && tl.databaseURL && tl.databaseURL === pl.databaseURL), publicId};
}
async function negocioDesdePeticion(env, tenantId, publicId, exigirDueno, ownerAuthKey){
  if(!idValido(tenantId, 4, 60)) return {error: json({ error: 'Falta el tenantId' }, 400)};
  if(publicId && !idValido(publicId, 4, 40)) return {error: json({ error: 'publicId no válido' }, 400)};
  const v = await publicIdDelNegocio(env, tenantId, publicId);
  if(!v.ok) return {error: json({ error: 'Este enlace público no es de este negocio', code: 'no_vinculado' }, 403)};
  if(exigirDueno && !(await esDuenoDelNegocio(env, tenantId, ownerAuthKey))){
    return {error: json({ error: 'No se ha podido comprobar que eres el propietario de este negocio', code: 'no_dueno' }, 403)};
  }
  return {publicId: v.publicId};
}
// Lo que se enseña de una cuenta de Stripe: si ya cobra y a nombre de quién,
// para que el dueño vea que es la SUYA (nada más). Cobra = la capacidad
// «card_payments» de su configuración de comercio está activa.
function cuentaCobra(acc){
  const c = acc && acc.configuration && acc.configuration.merchant && acc.configuration.merchant.capabilities;
  return !!(c && c.card_payments && c.card_payments.status === 'active');
}
function resumenCuenta(acc){
  return {
    cobra: cuentaCobra(acc),
    nombre: acc.display_name || (acc.identity && acc.identity.business_details && acc.identity.business_details.registered_name) || '',
    email: acc.contact_email || ''
  };
}

/* ===================== Handlers ===================== */

async function handleConectar(req, env){
  const body = await req.json().catch(() => ({}));
  const n = await negocioDesdePeticion(env, body.tenantId, body.publicId, true, body.ownerAuthKey);
  if(n.error) return n.error;
  if(!urlPermitida(body.volver, ORIGENES_APP)) return json({ error: 'Dirección de vuelta no permitida' }, 400);

  let cfg = await leerCfgStripe(env, n.publicId);
  if(cfg && cfg.accountId){
    const acc = await leerCuenta(env, cfg.accountId);
    // Ya cobra: no se abre ningún formulario de alta. Con el tenantId —que
    // está en cualquier tablet— no se puede tocar una cuenta en marcha.
    if(cuentaCobra(acc)){
      await fbPatch(env, rutaStripe(n.publicId), { disabled: false, activo: true });
      return json({ ok: true, yaConectado: true, cuenta: resumenCuenta(acc) });
    }
  }else{
    // Lo que antes era una cuenta «estándar»: del restaurante, con su panel
    // completo de Stripe, y Stripe le cobra las comisiones y responde de las
    // pérdidas a él — GastroGoan no queda de avalista de nadie.
    const acc = await stripeV2(env, 'POST', '/core/accounts', {
      dashboard: 'full',
      identity: { country: 'es' },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: { currency: 'eur', locales: ['es-ES'], responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
      metadata: { publicId: n.publicId, tenantId: body.tenantId }
    });
    cfg = { accountId: acc.id, createdAt: new Date().toISOString(), activo: false, modo: modoStripe(env) };
    await fbPut(env, rutaStripe(n.publicId), cfg);
  }
  const link = await stripeV2(env, 'POST', '/core/account_links', {
    account: cfg.accountId,
    use_case: { type: 'account_onboarding', account_onboarding: { configurations: ['merchant'], return_url: body.volver, refresh_url: body.volver } }
  });
  await fbPatch(env, rutaStripe(n.publicId), { disabled: false });
  return json({ ok: true, url: link.url });
}

/* Estado de la cuenta. Hay dos preguntas distintas:
   · GET con publicId (la web de reservas) o con tenantId (apps antiguas): SOLO «¿cobra?», sin ningún dato de la cuenta de Stripe.
   · POST con el authKey del dueño (la app actual): además el accountId, a nombre de quién está y su correo. Con el tenantId pelado ya no
     se enseña a nombre de quién está la cuenta de un negocio ajeno. */
async function handleEstado(req, env, url){
  let tenantId = url.searchParams.get('tenantId');
  let publicIdParam = url.searchParams.get('publicId');
  let conPrueba = false, authKey = null;
  if(req.method === 'POST'){
    const body = await req.json().catch(() => ({}));
    tenantId = body.tenantId; publicIdParam = body.publicId; authKey = body.ownerAuthKey; conPrueba = true;
  }
  if(tenantId){
    // Desde la app: se pregunta a Stripe y se guarda si cobra, para que la
    // web de reservas no tenga que preguntarle a Stripe en cada visita.
    const n = await negocioDesdePeticion(env, tenantId, publicIdParam, conPrueba, authKey);
    if(n.error) return n.error;
    const cfg = await leerCfgStripe(env, n.publicId);
    if(!cfg || !cfg.accountId) return json({ conectado: false, publicId: n.publicId });
    const acc = await leerCuenta(env, cfg.accountId);
    const r = resumenCuenta(acc);
    const activo = r.cobra && !cfg.disabled;
    if(activo !== !!cfg.activo) await fbPatch(env, rutaStripe(n.publicId), { activo });
    const base = { conectado: true, activo, desconectado: !!cfg.disabled, publicId: n.publicId, cobra: r.cobra };
    if(!conPrueba) return json(base);
    // accountId: para que el botón de la app abra el panel de ESA cuenta y no
    // la cuenta vacía con la que el dueño se registró en stripe.com.
    return json(Object.assign(base, r, { accountId: cfg.accountId }));
  }
  // Desde la web de reservas: solo si se puede pagar, sin más datos.
  if(!idValido(publicIdParam, 4, 40)) return json({ error: 'Falta tenantId o publicId' }, 400);
  const cfg = await leerCfgStripe(env, publicIdParam);
  return json({ activo: !!(cfg && cfg.accountId && cfg.activo && !cfg.disabled) });
}

async function handleDesconectar(req, env){
  const body = await req.json().catch(() => ({}));
  const n = await negocioDesdePeticion(env, body.tenantId, body.publicId, true, body.ownerAuthKey);
  if(n.error) return n.error;
  const cfg = await leerCfgStripe(env, n.publicId);
  // La cuenta de Stripe sigue siendo del restaurante: aquí solo se deja de
  // ofrecer el pago con tarjeta. Volver a conectar recupera la misma cuenta.
  if(cfg) await fbPatch(env, rutaStripe(n.publicId), { disabled: true, activo: false });
  return json({ ok: true });
}

async function handlePagar(req, env){
  const body = await req.json().catch(() => ({}));
  const { publicId, orderRef, amount, description, urlOk, urlKo, expiraMin, slot } = body || {};
  if(!idValido(publicId, 4, 40) || !orderRef || !(amount > 0)){
    return json({ error: 'Faltan datos (publicId, orderRef, amount)' }, 400);
  }
  if(!urlPermitida(urlOk, ORIGENES_WEB) || !urlPermitida(urlKo, ORIGENES_WEB)){
    return json({ error: 'Dirección de vuelta no permitida' }, 400);
  }
  // Cordura sobre el importe. Lo que de verdad protege al negocio no es esto:
  // es que la app compara lo que STRIPE confirma con lo que el pedido cuesta
  // según SU carta, y si falta dinero no lo da por pagado.
  // (Tolerancia: 19.90 * 100 da 1989.9999999999998 en JS.)
  const amountNum = Number(amount);
  const centimos = Math.round(amountNum * 100);
  if(!isFinite(amountNum) || amountNum < 0.5 || amountNum > 3000 || Math.abs(centimos - amountNum * 100) > 0.01){
    return json({ error: 'Importe inválido' }, 400);
  }
  const cfg = await leerCfgStripe(env, publicId);
  if(!cfg || !cfg.accountId || !cfg.activo || cfg.disabled){
    return json({ error: 'Este negocio no tiene activado el pago con tarjeta' }, 404);
  }
  const ref = String(orderRef).slice(0, 120);
  /* Pedido en grupo (27/11): cada comensal paga SU parte con su propia sesión, y el importe se fijó con la cuenta de ese momento. Una pestaña de
     Stripe abierta horas después se podría pagar con un importe ya viejo. Con `expiraMin` (opcional, y solo lo manda la web en la mesa) la sesión
     caduca: Stripe exige entre 30 minutos y 24 horas desde que se crea, así que se acota a 30-120 y se suma un minuto de margen para no cruzar
     el mínimo por una diferencia de reloj. Sin `expiraMin` todo sigue exactamente igual que antes. `slot` solo sirve para rastrear el pago. */
  const minExp = Number(expiraMin);
  const expiresAt = isFinite(minExp) && minExp > 0 ? Math.floor(Date.now() / 1000) + Math.round(Math.min(120, Math.max(30, minExp))) * 60 + 60 : null;
  const slotOk = typeof slot === 'string' && /^m([0-9]|1[01])$/.test(slot) ? slot : null;
  // Cobro DIRECTO en la cuenta del restaurante (cabecera Stripe-Account):
  // el dinero es suyo desde el primer momento. Sin payment_method_types, el
  // cliente ve los métodos que el restaurante tenga activos en su Stripe
  // (tarjeta, Apple Pay, Google Pay, Bizum…).
  const sesion = await stripe(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    locale: 'auto',
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: centimos, product_data: { name: String(description || 'Pedido').slice(0, 120) } } }],
    success_url: urlOk,
    cancel_url: urlKo,
    client_reference_id: claveRefPago(ref),
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    metadata: Object.assign({ publicId, orderRef: ref }, slotOk ? { slot: slotOk } : {}),
    payment_intent_data: { metadata: Object.assign({ publicId, orderRef: ref }, slotOk ? { slot: slotOk } : {}) }
  }, cfg.accountId);
  try {
    await fbPush(env, `gastrogoan/private/${publicId}/pagosLog`, { orderRef: ref, sesion: sesion.id, amount: amountNum, createdAt: new Date().toISOString() });
  } catch(e){ /* un rastro que falla no puede impedir cobrar */ }
  return json({ url: sesion.url });
}

// Apunta un pago confirmado. Stripe reintenta si no recibe un 200, así que
// el mismo aviso puede llegar dos veces: el segundo no hace nada.
async function registrarPago(env, publicId, orderRef, amount, extra){
  const rutaPago = `gastrogoan/pagos/${publicId}/${claveRefPago(orderRef)}`;
  if(await fbGet(env, rutaPago)) return false;
  const pago = Object.assign({
    type: 'pago_confirmado',
    orderRef: String(orderRef).slice(0, 120),
    amount,
    createdAt: new Date().toISOString()
  }, extra || {});
  // Donde lo PREGUNTA la app (ver comprobarPagosTarjeta, js/core.js).
  await fbPut(env, rutaPago, pago);
  // Y en el buzón de la nube compartida, para los negocios que aún tienen
  // allí su espejo (reglas antiguas). A los demás no les llega, y no pasa
  // nada: lo recogen de arriba.
  try { await fbPush(env, `gastrogoan/public/${publicId}/requests`, pago); } catch(e){}
  return true;
}

// Firma de Stripe: cabecera «t=…,v1=…», HMAC-SHA256 de «t.cuerpo» con el
// secreto del webhook. Y no más de 5 minutos de antigüedad: un aviso viejo
// reenviado no vale.
async function firmaStripeValida(cuerpo, cabecera, secreto){
  if(!cabecera || !secreto) return false;
  const partes = {};
  cabecera.split(',').forEach(p => { const i = p.indexOf('='); if(i > 0){ const k = p.slice(0, i).trim(); (partes[k] = partes[k] || []).push(p.slice(i + 1).trim()); } });
  const t = partes.t && partes.t[0];
  if(!t || !partes.v1) return false;
  if(Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(`${t}.${cuerpo}`));
  const hex = [...new Uint8Array(firma)].map(b => b.toString(16).padStart(2, '0')).join('');
  return partes.v1.some(v => {
    if(v.length !== hex.length) return false;
    let d = 0; for(let i = 0; i < v.length; i++) d |= v.charCodeAt(i) ^ hex.charCodeAt(i);
    return d === 0;
  });
}

async function handleWebhook(req, env){
  const cuerpo = await req.text();
  if(!(await firmaStripeValida(cuerpo, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))){
    return json({ error: 'Firma no válida' }, 400);
  }
  let evento;
  try { evento = JSON.parse(cuerpo); } catch(e){ return json({ error: 'JSON no válido' }, 400); }
  const tipo = evento.type;
  // Tarjeta: «completed» ya viene pagado. Bizum y otros métodos diferidos
  // pueden llegar después con «async_payment_succeeded».
  if(tipo !== 'checkout.session.completed' && tipo !== 'checkout.session.async_payment_succeeded') return json({ received: true });
  const s = (evento.data && evento.data.object) || {};
  if(s.payment_status !== 'paid') return json({ received: true });
  const md = s.metadata || {};
  if(!idValido(md.publicId, 4, 40) || !md.orderRef) return json({ received: true });
  // El pago tiene que venir de la cuenta de ESE negocio.
  const cfg = await leerCfgStripe(env, md.publicId);
  if(!cfg || cfg.accountId !== evento.account) return json({ received: true });
  // La comisión REAL que Stripe le ha cobrado al restaurante por este pago,
  // para que la app la apunte sola como gasto (y el banco cuadre con las
  // ventas). Si no se puede leer, la app pone una estimación y lo marca.
  let comision = null;
  try {
    if(s.payment_intent){
      const pi = await stripe(env, 'GET', `/payment_intents/${s.payment_intent}?expand[]=latest_charge.balance_transaction`, null, evento.account);
      const bt = pi && pi.latest_charge && pi.latest_charge.balance_transaction;
      if(bt && typeof bt.fee === 'number') comision = bt.fee / 100;
    }
  } catch(e){ /* sin la comisión exacta, el pago se apunta igual */ }
  await registrarPago(env, md.publicId, md.orderRef, Number(s.amount_total) / 100, { pasarela: 'stripe', sesion: String(s.id || ''), comision });
  return json({ received: true });
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if(req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    try {
      if(url.pathname === '/stripe/conectar' && req.method === 'POST') return await handleConectar(req, env);
      if(url.pathname === '/stripe/estado' && (req.method === 'GET' || req.method === 'POST')) return await handleEstado(req, env, url);
      if(url.pathname === '/stripe/desconectar' && req.method === 'POST') return await handleDesconectar(req, env);
      if(url.pathname === '/stripe/pagar' && req.method === 'POST') return await handlePagar(req, env);
      if(url.pathname === '/stripe/webhook' && req.method === 'POST') return await handleWebhook(req, env);
      return json({ error: 'Not found' }, 404);
    } catch(e){
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
};
