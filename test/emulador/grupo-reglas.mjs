/* Pedido en grupo en la mesa (27/11): las reglas de `mesaGrupo` y el `uid` de `requests`, contra el EMULADOR oficial con las reglas REALES
 * (las dos nubes: la de cada negocio y la compartida; las dos llevan la misma rama pública). Sesiones anónimas de verdad.
 *
 * Qué fija (todo lo que el diseño dice que las reglas deben impedir, y lo que deben dejar hacer):
 *   · un comensal reclama un hueco libre y solo ese; nadie escribe en el hueco de otro `uid`; no existe m12 ni l30;
 *   · q = 0 / 21, p de 61 caracteres, n de 31 caracteres o vacío, claves de más: rechazados;
 *   · sin `mesaQr/{token}/grupo === true` no se lee ni se escribe `mesaGrupo` (negocio SIN el grupo activado);
 *   · token corto (< 16) rechazado;
 *   · un hueco expulsado (`mesaQr/{token}/expulsados/{slot}`) ya no puede escribir;
 *   · un hueco abandonado (ts de hace más de 8 h) lo puede reclamar otro; uno vivo no;
 *   · la limpieza (borrar `mesaGrupo/{token}`) solo se permite cuando el grupo ya no está activo;
 *   · `requests` con `uid` ajeno rechazado, sin `uid` (web antigua) o con el propio aceptado; `pago_confirmado` sigue rechazado.
 * Se ejecuta desde run.sh. */
import assert from 'node:assert/strict';

const NS_NEG = 'demo-gastrogoan', NS_PLAT = 'demo-plataforma';
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

async function anonimo(){
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({returnSecureToken: true})});
  const j = await r.json();
  return {tok: j.idToken, uid: j.localId};
}
const url = (ns, ruta, tok) => `http://127.0.0.1:9000/${ruta}.json?ns=${ns}&auth=${encodeURIComponent(tok)}`;
const put = (ns, ruta, tok, valor) => fetch(url(ns, ruta, tok), {method: 'PUT', body: JSON.stringify(valor)}).then(r => r.status);
const del = (ns, ruta, tok) => fetch(url(ns, ruta, tok), {method: 'DELETE'}).then(r => r.status);
const get = (ns, ruta, tok) => fetch(url(ns, ruta, tok)).then(async r => ({s: r.status, v: r.status === 200 ? await r.json() : null}));
const admin = (ns, ruta, valor) => fetch(`http://127.0.0.1:9000/${ruta}.json?ns=${ns}`, {method: valor === null ? 'DELETE' : 'PUT', headers: {Authorization: 'Bearer owner'}, body: JSON.stringify(valor)});

const PID = 'pubgrupo01', TOKEN = 'TokenMesaGrupoAbc123456';
const MQ = `gastrogoan/public/${PID}/mesaQr/${TOKEN}`, MG = `gastrogoan/public/${PID}/mesaGrupo/${TOKEN}`;
const mesaQr = (extra = {}) => Object.assign({mesa: 'Mesa 1', updatedAt: Date.now(), grupo: true}, extra);

for(const [quien, ns] of [['nube del negocio', NS_NEG], ['plataforma', NS_PLAT]]){
  const A = await anonimo(), B = await anonimo(), C = await anonimo();
  const reset = async (conGrupo = true) => { await admin(ns, `gastrogoan/public/${PID}`, null); if(conGrupo) await admin(ns, MQ, mesaQr()); };
  const miembro = (u, n = 'Ana', ts = Date.now()) => ({uid: u.uid, n, ts});

  await caso(`${quien}: reclamar un hueco libre sí; reclamar uno ocupado por otro uid no; el dueño lo puede actualizar`, async () => {
    await reset();
    assert.equal(await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A)), 200);
    assert.equal(await put(ns, `${MG}/miembros/m0`, B.tok, miembro(B, 'Bruno')), 401, 'B no puede quitarle el hueco a A');
    assert.equal(await put(ns, `${MG}/miembros/m1`, B.tok, miembro(B, 'Bruno')), 200);
    assert.equal(await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A, 'Ana María')), 200, 'A actualiza lo suyo');
    assert.equal(await del(ns, `${MG}/miembros/m0`, B.tok), 401, 'B no puede borrar el hueco de A');
  });
  await caso(`${quien}: no se puede poner el uid de otro, ni reclamar m12, ni nombres vacíos o de 31 caracteres, ni claves de más`, async () => {
    await reset();
    assert.equal(await put(ns, `${MG}/miembros/m2`, B.tok, miembro(A)), 401, 'hueco a nombre del uid de A escrito por B');
    assert.equal(await put(ns, `${MG}/miembros/m12`, A.tok, miembro(A)), 401, 'no existe m12');
    assert.equal(await put(ns, `${MG}/miembros/m3`, A.tok, miembro(A, '')), 401, 'nombre vacío');
    assert.equal(await put(ns, `${MG}/miembros/m3`, A.tok, miembro(A, 'x'.repeat(31))), 401, 'nombre de 31');
    assert.equal(await put(ns, `${MG}/miembros/m3`, A.tok, miembro(A, 'x'.repeat(30))), 200, 'nombre de 30 sí');
    assert.equal(await put(ns, `${MG}/miembros/m4`, A.tok, Object.assign(miembro(A), {extra: 'x'.repeat(5000)})), 401, 'clave de más (relleno del nodo)');
  });
  await caso(`${quien}: borradores: solo en el carrito del hueco propio; l30, q=0, q=21, p de 61 y claves de más, rechazados`, async () => {
    await reset();
    await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A));
    assert.equal(await put(ns, `${MG}/carritos/m0/l0`, A.tok, {p: 'plato1', q: 2}), 200);
    assert.equal(await put(ns, `${MG}/carritos/m0/l1`, A.tok, {p: 'plato2', q: 1, m: 'a,b', r: 'm0,m1'}), 200, 'con extras y reparto');
    assert.equal(await put(ns, `${MG}/carritos/m0/l1`, B.tok, {p: 'plato2', q: 5}), 401, 'B escribiendo en el carrito de A');
    assert.equal(await put(ns, `${MG}/carritos/m5/l0`, B.tok, {p: 'plato1', q: 1}), 401, 'carrito de un hueco que B no tiene');
    assert.equal(await put(ns, `${MG}/carritos/m0/l30`, A.tok, {p: 'plato1', q: 1}), 401, 'l30 no existe');
    assert.equal(await put(ns, `${MG}/carritos/m0/l29`, A.tok, {p: 'plato1', q: 1}), 200, 'l29 sí');
    assert.equal(await put(ns, `${MG}/carritos/m0/l2`, A.tok, {p: 'plato1', q: 0}), 401, 'q = 0');
    assert.equal(await put(ns, `${MG}/carritos/m0/l2`, A.tok, {p: 'plato1', q: 21}), 401, 'q = 21');
    assert.equal(await put(ns, `${MG}/carritos/m0/l2`, A.tok, {p: 'p'.repeat(61), q: 1}), 401, 'p de 61');
    assert.equal(await put(ns, `${MG}/carritos/m0/l2`, A.tok, {p: 'plato1', q: 1, precio: 0.01}), 401, 'un precio no tiene sitio en el nodo compartido');
    assert.equal(await put(ns, `${MG}/carritos/m0/l2`, A.tok, {p: 'plato1', q: 1, m: 'm'.repeat(121)}), 401, 'm de 121');
  });
  await caso(`${quien}: lectura: cualquiera con el token y sesión lo ve; con token corto, no`, async () => {
    await reset();
    await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A));
    const r = await get(ns, MG, B.tok);
    assert.equal(r.s, 200); assert.equal(r.v.miembros.m0.n, 'Ana');
    const corto = `gastrogoan/public/${PID}/mesaGrupo/corto`;
    await admin(ns, `gastrogoan/public/${PID}/mesaQr/corto`, mesaQr());
    assert.equal(await put(ns, `${corto}/miembros/m0`, A.tok, miembro(A)), 401, 'token de 5 caracteres');
    assert.equal((await get(ns, corto, A.tok)).s, 401);
    assert.equal((await get(ns, `gastrogoan/public/${PID}/mesaGrupo`, A.tok)).s, 401, 'no se puede listar el padre (ni saber qué mesas tienen grupo)');
  });
  await caso(`${quien}: sin grupo activado (grupo ≠ true) no se lee ni se escribe: un negocio que no lo usa no se ve afectado`, async () => {
    await reset(false);
    await admin(ns, MQ, mesaQr({grupo: false}));
    assert.equal(await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A)), 401);
    assert.equal((await get(ns, MG, A.tok)).s, 401);
    await admin(ns, MQ, {mesa: 'Mesa 1', updatedAt: Date.now()});   // mesa sin el campo grupo (negocio sin la opción)
    assert.equal(await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A)), 401);
    // Y la cuenta de siempre (sin el campo) sigue aceptándose con normalidad: no se rompe nada anterior.
    assert.equal(await put(ns, MQ, A.tok, {mesa: 'Mesa 1', updatedAt: Date.now(), lineas: [], total: 0}), 200);
  });
  await caso(`${quien}: un hueco expulsado ya no puede escribir ni reclamar; el resto sigue`, async () => {
    await reset();
    await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A));
    await put(ns, `${MG}/miembros/m1`, B.tok, miembro(B, 'Bruno'));
    await admin(ns, MQ, mesaQr({expulsados: {m1: true}}));
    assert.equal(await put(ns, `${MG}/carritos/m1/l0`, B.tok, {p: 'plato1', q: 1}), 401, 'expulsado: sin carrito');
    assert.equal(await put(ns, `${MG}/miembros/m1`, B.tok, miembro(B, 'Bruno otra vez')), 401, 'expulsado: sin volver a reclamar');
    assert.equal(await put(ns, `${MG}/carritos/m0/l0`, A.tok, {p: 'plato1', q: 1}), 200, 'el resto sigue');
  });
  await caso(`${quien}: un hueco abandonado (más de 8 h) lo reclama otro; uno reciente no`, async () => {
    await reset();
    await admin(ns, `${MG}/miembros/m0`, {uid: A.uid, n: 'Ana', ts: Date.now() - 9 * 3600 * 1000});
    await admin(ns, `${MG}/miembros/m1`, {uid: A.uid, n: 'Ana', ts: Date.now() - 3600 * 1000});
    assert.equal(await put(ns, `${MG}/miembros/m1`, C.tok, miembro(C, 'Carla')), 401, 'hueco con 1 h de vida');
    assert.equal(await put(ns, `${MG}/miembros/m0`, C.tok, miembro(C, 'Carla')), 200, 'hueco de ayer');
  });
  await caso(`${quien}: limpiar (borrar el nodo del token) solo con el grupo ya apagado`, async () => {
    await reset();
    await put(ns, `${MG}/miembros/m0`, A.tok, miembro(A));
    assert.equal(await del(ns, MG, B.tok), 401, 'con el grupo activo nadie borra la mesa de los demás');
    await admin(ns, MQ, mesaQr({grupo: false}));
    assert.equal(await del(ns, MG, B.tok), 200, 'la app (cualquier sesión) puede limpiar cuando el grupo se cerró');
    assert.equal((await get(ns, MG, B.tok)).s, 401);
    await admin(ns, MQ, null);
    await admin(ns, `${MG}/miembros/m0`, miembro(A));
    assert.equal(await del(ns, MG, B.tok), 200, 'y cuando se borró la mesa entera (rotar el QR)');
  });
  await caso(`${quien}: requests: un uid ajeno se rechaza; sin uid (web antigua) o con el propio, se acepta; un slot raro no; pago_confirmado sigue prohibido`, async () => {
    await reset();
    const R = id => `gastrogoan/public/${PID}/requests/${id}`;
    const base = {type: 'pedido_mesa', createdAt: Date.now()};
    assert.equal(await put(ns, R('r1'), A.tok, Object.assign({uid: B.uid, slot: 'm0'}, base)), 401, 'pedir «como» el uid de otro');
    assert.equal(await put(ns, R('r2'), A.tok, Object.assign({uid: A.uid, slot: 'm0'}, base)), 200, 'el propio uid');
    assert.equal(await put(ns, R('r3'), A.tok, base), 200, 'sin uid: una web anterior sigue pudiendo pedir');
    assert.equal(await put(ns, R('r4'), A.tok, Object.assign({uid: A.uid, slot: 'm99'}, base)), 401, 'slot que no existe');
    assert.equal(await put(ns, R('r5'), A.tok, {type: 'pago_confirmado', createdAt: Date.now()}), 401, 'declararse pagado');
    assert.equal(await put(ns, R('r6'), A.tok, {type: 'pago_mesa', createdAt: Date.now(), uid: A.uid, slot: 'm1', importe: 5}), 200, 'anunciar un pago propio');
  });
}

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ las reglas del grupo hacen lo que dice el diseño (negocio y plataforma)');
process.exit(fallos ? 1 : 0);
