/**
 * GastroGoan - pagos online con Stripe. Cloudflare Worker `gastro`.
 *
 * ⚠️ ESTE FICHERO ES LA FUENTE DE LA VERDAD del Worker, pero NO se publica
 * solo: hay que pegarlo a mano en Cloudflare → Workers → gastro → Editar
 * código → Desplegar (ver worker/README.md). Sin claves: viven en Cloudflare
 * (Settings → Variables and Secrets) y NUNCA se escriben aquí:
 *  - FIREBASE_DB_URL        base de datos de `plataforma-gastrogoan`
 *  - FIREBASE_DB_SECRET     su "Database secret"
 *  - STRIPE_SECRET_KEY      clave secreta de la cuenta de Stripe de GastroGoan
 *  - STRIPE_WEBHOOK_SECRET  secreto de firma del webhook (eventos de cuentas conectadas)
 *
 * Modelo (30/09): Stripe Connect con cuentas ESTÁNDAR y cobros directos. Cada
 * restaurante tiene SU cuenta de Stripe; el dinero va directo a ella y Stripe
 * le cobra la comisión a él. GastroGoan no toca el dinero ni paga nada. Aquí
 * solo se guarda qué cuenta de Stripe es de qué negocio
 * (gastrogoan/private/{publicId}/stripe), nunca una clave del negocio.
 *
 *  - POST /stripe/conectar     alta (o continuar el alta) de la cuenta del negocio.
 *  - GET  /stripe/estado       ¿cobra con tarjeta? (la app ve además a nombre de quién).
 *  - POST /stripe/desconectar  deja de ofrecer el pago con tarjeta.
 *  - POST /stripe/pagar        crea el pago (Stripe Checkout) en la cuenta del negocio.
 *  - POST /stripe/webhook      Stripe avisa de que está pagado; se verifica la firma.
 *
 * Sustituye al puente con Redsys: su aviso de pago dependía de cómo tuviera
 * configurado cada banco el TPV, y con el de pruebas no llegaba nunca. El de
 * Stripe llega siempre y se puede probar de punta a punta.
 */

const STRIPE_API = 'https://api.stripe.com/v1';
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
async function fbPatch(env, path, data){
  const res = await fetch(fbUrl(env, path), { method: 'PATCH', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase PATCH ' + path + ' failed: ' + res.status);
  return res.json();
}
async function fbPush(env, path, data){
  const res = await fetch(fbUrl(env, path), { method: 'POST', body: JSON.stringify(data) });
  if(!res.ok) throw new Error('Firebase POST ' + path + ' failed: ' + res.status);
  return res.json();
}
const rutaStripe = publicId => `gastrogoan/private/${publicId}/stripe`;

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
async function negocioDesdePeticion(env, tenantId, publicId){
  if(!idValido(tenantId, 4, 60)) return {error: json({ error: 'Falta el tenantId' }, 400)};
  if(publicId && !idValido(publicId, 4, 40)) return {error: json({ error: 'publicId no válido' }, 400)};
  const v = await publicIdDelNegocio(env, tenantId, publicId);
  if(!v.ok) return {error: json({ error: 'Este enlace público no es de este negocio', code: 'no_vinculado' }, 403)};
  return {publicId: v.publicId};
}
// Lo que se enseña de una cuenta de Stripe: si ya cobra y a nombre de quién,
// para que el dueño vea que es la SUYA (nada más).
function resumenCuenta(acc){
  return {
    cobra: !!acc.charges_enabled,
    datosCompletos: !!acc.details_submitted,
    nombre: (acc.settings && acc.settings.dashboard && acc.settings.dashboard.display_name) || (acc.business_profile && acc.business_profile.name) || '',
    email: acc.email || ''
  };
}

/* ===================== Handlers ===================== */

async function handleConectar(req, env){
  const body = await req.json().catch(() => ({}));
  const n = await negocioDesdePeticion(env, body.tenantId, body.publicId);
  if(n.error) return n.error;
  if(!urlPermitida(body.volver, ORIGENES_APP)) return json({ error: 'Dirección de vuelta no permitida' }, 400);

  let cfg = await fbGet(env, rutaStripe(n.publicId));
  if(cfg && cfg.accountId){
    const acc = await stripe(env, 'GET', `/accounts/${cfg.accountId}`);
    // Ya cobra: no se abre ningún formulario de alta. Con el tenantId —que
    // está en cualquier tablet— no se puede tocar una cuenta en marcha.
    if(acc.charges_enabled){
      await fbPatch(env, rutaStripe(n.publicId), { disabled: false, activo: true });
      return json({ ok: true, yaConectado: true, cuenta: resumenCuenta(acc) });
    }
  }else{
    // Cuenta ESTÁNDAR: es del restaurante, con su panel completo de Stripe.
    const acc = await stripe(env, 'POST', '/accounts', {
      type: 'standard', country: 'ES',
      metadata: { publicId: n.publicId, tenantId: body.tenantId }
    });
    cfg = { accountId: acc.id, createdAt: new Date().toISOString(), activo: false };
    await fbPut(env, rutaStripe(n.publicId), cfg);
  }
  const link = await stripe(env, 'POST', '/account_links', {
    account: cfg.accountId, type: 'account_onboarding',
    refresh_url: body.volver, return_url: body.volver
  });
  await fbPatch(env, rutaStripe(n.publicId), { disabled: false });
  return json({ ok: true, url: link.url });
}

async function handleEstado(req, env, url){
  const tenantId = url.searchParams.get('tenantId');
  const publicIdParam = url.searchParams.get('publicId');
  if(tenantId){
    // Desde la app: se pregunta a Stripe y se guarda si cobra, para que la
    // web de reservas no tenga que preguntarle a Stripe en cada visita.
    const n = await negocioDesdePeticion(env, tenantId, publicIdParam);
    if(n.error) return n.error;
    const cfg = await fbGet(env, rutaStripe(n.publicId));
    if(!cfg || !cfg.accountId) return json({ conectado: false, publicId: n.publicId });
    const acc = await stripe(env, 'GET', `/accounts/${cfg.accountId}`);
    const r = resumenCuenta(acc);
    const activo = r.cobra && !cfg.disabled;
    if(activo !== !!cfg.activo) await fbPatch(env, rutaStripe(n.publicId), { activo });
    return json(Object.assign({ conectado: true, activo, desconectado: !!cfg.disabled, publicId: n.publicId }, r));
  }
  // Desde la web de reservas: solo si se puede pagar, sin más datos.
  if(!idValido(publicIdParam, 4, 40)) return json({ error: 'Falta tenantId o publicId' }, 400);
  const cfg = await fbGet(env, rutaStripe(publicIdParam));
  return json({ activo: !!(cfg && cfg.accountId && cfg.activo && !cfg.disabled) });
}

async function handleDesconectar(req, env){
  const body = await req.json().catch(() => ({}));
  const n = await negocioDesdePeticion(env, body.tenantId, body.publicId);
  if(n.error) return n.error;
  const cfg = await fbGet(env, rutaStripe(n.publicId));
  // La cuenta de Stripe sigue siendo del restaurante: aquí solo se deja de
  // ofrecer el pago con tarjeta. Volver a conectar recupera la misma cuenta.
  if(cfg) await fbPatch(env, rutaStripe(n.publicId), { disabled: true, activo: false });
  return json({ ok: true });
}

async function handlePagar(req, env){
  const body = await req.json().catch(() => ({}));
  const { publicId, orderRef, amount, description, urlOk, urlKo } = body || {};
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
  const cfg = await fbGet(env, rutaStripe(publicId));
  if(!cfg || !cfg.accountId || !cfg.activo || cfg.disabled){
    return json({ error: 'Este negocio no tiene activado el pago con tarjeta' }, 404);
  }
  const ref = String(orderRef).slice(0, 120);
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
    metadata: { publicId, orderRef: ref },
    payment_intent_data: { metadata: { publicId, orderRef: ref } }
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
  const cfg = await fbGet(env, rutaStripe(md.publicId));
  if(!cfg || cfg.accountId !== evento.account) return json({ received: true });
  await registrarPago(env, md.publicId, md.orderRef, Number(s.amount_total) / 100, { pasarela: 'stripe', sesion: String(s.id || '') });
  return json({ received: true });
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if(req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    try {
      if(url.pathname === '/stripe/conectar' && req.method === 'POST') return await handleConectar(req, env);
      if(url.pathname === '/stripe/estado' && req.method === 'GET') return await handleEstado(req, env, url);
      if(url.pathname === '/stripe/desconectar' && req.method === 'POST') return await handleDesconectar(req, env);
      if(url.pathname === '/stripe/pagar' && req.method === 'POST') return await handlePagar(req, env);
      if(url.pathname === '/stripe/webhook' && req.method === 'POST') return await handleWebhook(req, env);
      return json({ error: 'Not found' }, 404);
    } catch(e){
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
};
