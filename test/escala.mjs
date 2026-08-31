// ESCALA — ¿aguanta esto 5.000 negocios sin que le cueste un euro al dueño?
//
// El techo no es el tráfico: es que el plan gratuito de Firebase da 100
// CONEXIONES SIMULTÁNEAS, y una conexión es una pestaña abierta. Con el
// espejo público en la nube COMPARTIDA, cada app de gestión abierta y cada
// cliente mirando la carta ocupaban una conexión del MISMO proyecto: a partir
// de unos 50-100 negocios, la web de reservas falla para todos a la vez.
//
// Esta prueba vigila que la plataforma compartida no sostenga ni una sola
// conexión permanente, por muchos negocios que haya.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const res=[];
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const core = fs.readFileSync('js/core.js','utf8');
const publica = fs.readFileSync('reservagastrogoan.html','utf8');

// Devuelve, para cada uso de una ruta, con qué app se hace.
function appDeCadaUso(fuente, ruta){
  const lineas = fuente.split('\n');
  const usos = [];
  let ultima = null;
  lineas.forEach((l, i) => {
    // Solo cuenta la app que se RECIBE en el then: `firebase.app()` es la
    // del propio negocio y no pasa por aquí.
    const m = l.match(/get(PublicMirror|Platform[A-Za-z]*)App\(\)\.then\(app/);
    if(m) ultima = m[0];
    if(l.includes(ruta) && /\bapp\.database\(\)/.test(l)) usos.push({linea: i+1, app: ultima, texto: l.trim().slice(0,60)});
  });
  return usos;
}

caso('El espejo público NO se escribe ya en la nube compartida', ()=>{
  const usos = appDeCadaUso(core, "'gastrogoan/public/").filter(u => u.app);
  assert.ok(usos.length >= 6, `deberían encontrarse los usos del espejo, hay ${usos.length}`);
  const enPlataforma = usos.filter(u => /Platform/.test(u.app));
  assert.deepEqual(enPlataforma.map(u => u.linea), [],
    'ninguna ruta del espejo puede ir a la plataforma: ' + JSON.stringify(enPlataforma));
  return `${usos.length} usos, todos a la nube del negocio`;
});

caso('La app de gestión no abre ninguna escucha permanente en la plataforma', ()=>{
  // Una escucha (.on) mantiene el socket abierto; .once() se cierra sola.
  /* Solo cuentan las escuchas hechas sobre la app que devuelve
     getPlatformFirebaseApp() —es decir, líneas con `app.database()` dentro de
     ese bloque—. `cloudRef` y `firebase.database()` son la app POR DEFECTO,
     que es la nube del propio negocio: esas sí pueden escuchar, y de hecho
     son el corazón de la sincronización. */
  const lineas = core.split('\n');
  let ultima = null, desdeLinea = -99;
  const permanentes = [];
  lineas.forEach((l, i) => {
    const m = l.match(/get(PublicMirror|Platform[A-Za-z]*)App\(\)\.then\(app/);
    if(m){ ultima = m[0]; desdeLinea = i; }
    const esDelBloque = (i - desdeLinea) < 20;
    if(/app\.database\(\)[\s\S]*\.on\(['"]/.test(l) && esDelBloque && ultima && /Platform/.test(ultima)){
      permanentes.push(i+1 + ': ' + l.trim().slice(0,70));
    }
  });
  assert.deepEqual(permanentes, [], 'escuchas permanentes en la plataforma: ' + permanentes.join(' | '));
  return 'la plataforma solo recibe consultas puntuales';
});

caso('La web pública consulta la plataforma por REST, sin abrir socket', ()=>{
  assert.ok(/consultarPlataforma/.test(publica), 'debe existir la consulta por REST');
  assert.ok(/fetch\(`\$\{PLATAFORMA_REST\}/.test(publica), 'y hacerse con fetch, no con el SDK');
  // El SDK solo puede inicializarse con la nube DEL NEGOCIO
  const init = publica.match(/firebase\.initializeApp\(([^)]*)\)/g) || [];
  assert.deepEqual(init, ['firebase.initializeApp(config)'],
    'solo puede inicializarse una app, y con la config resuelta: ' + JSON.stringify(init));
  assert.ok(/publicLookup/.test(publica), 'debe preguntar en qué nube está el negocio');
  return 'una petición HTTP, cero conexiones simultáneas';
});

caso('Un negocio sin nube propia sigue funcionando (nadie se queda fuera)', ()=>{
  assert.ok(/FIREBASE_CONFIG;\s*\/\/ negocio anterior a la migración/.test(publica),
    'la web pública debe caer a la plataforma si el negocio no tiene su nube publicada');
  assert.ok(/return getPlatformFirebaseApp\(\);/.test(core),
    'y la app de gestión también');
  return 'con red de seguridad para los negocios de antes';
});

caso('Las reglas que se le dan al cliente cubren TODO el espejo', ()=>{
  const m = core.match(/const FIREBASE_RULES_JSON = `([\s\S]*?)`;/);
  assert.ok(m, 'deben existir las reglas del cliente');
  const reglas = JSON.parse(m[1]);
  const pub = reglas.rules.gastrogoan.public.$publicId;
  ['info','requests','aforoHold','pedidosHold','mesaHold','orderStatus','reservationStatus'].forEach(k => {
    assert.ok(pub[k], `falta el nodo "${k}" en las reglas del cliente — la web pública fallaría al usarlo`);
  });
  // Y los topes que impiden manipular el aforo saltándose la app
  assert.ok(/<= 500/.test(JSON.stringify(pub.aforoHold)), 'el aforo debe seguir acotado');
  return 'los 7 nodos del espejo, con sus topes';
});

caso('La plataforma solo guarda una guía mínima, legible sin autenticar', ()=>{
  const s = fs.readFileSync('database.rules.propuesta.json','utf8')
    .replace(/^\s*"\/\/".*$/gm,'').replace(/^\s*\/\/.*$/gm,'');
  const d = JSON.parse(s);
  const g = d.rules.gastrogoan;
  assert.equal(g.publicLookup.$publicId['.read'], true, 'la guía se lee sin autenticar (por REST)');
  assert.equal(g.publicSlugs.$slug['.read'], true, 'y el nombre corto también');
  assert.ok(/auth != null/.test(g.publicLookup.$publicId['.write']), 'pero escribir sigue exigiendo autenticación');
  // Lo de verdad sensible sigue cerrado
  assert.ok(!g.ownerAuth.$authKey['.read'] || /auth/.test(String(g.ownerAuth.$authKey['.read'])),
    'las cuentas de propietario NO pueden quedar abiertas');
  return 'guía abierta, cuentas cerradas';
});

caso('Y la guía no expone ningún secreto', ()=>{
  const bloque = core.slice(core.indexOf('function publishPublicLookup'), core.indexOf('function publishPublicLookup')+700);
  assert.ok(/apiKey/.test(bloque) && /databaseURL/.test(bloque), 'guarda dónde está la nube');
  const campos = [...bloque.matchAll(/(\w+):\s*config\.(\w+)/g)].map(m => m[2]);
  assert.deepEqual(campos.sort(), ['apiKey','databaseURL'], 'y NADA más: ' + campos.join(', '));
  return 'solo apiKey y databaseURL, que no son secretos';
});

caso('La mudanza se comprueba sola: nadie se muda con las reglas viejas', ()=>{
  /* Un negocio dado de alta antes del cambio tiene las reglas antiguas, que
     solo contemplaban info y requests. Mudarle el espejo sin comprobarlo le
     rompería las reservas a medias, y se enteraría cuando un cliente no
     pudiera reservar un sábado. */
  assert.ok(/async function comprobarEspejoEnNubePropia/.test(core),
    'debe existir la comprobación antes de mudar a nadie');
  const fn = core.slice(core.indexOf('async function comprobarEspejoEnNubePropia'));
  const cuerpo = fn.slice(0, fn.indexOf('\n}\n')+3);
  assert.ok(/aforoHold/.test(cuerpo) && /orderStatus/.test(cuerpo),
    'tiene que probar justo los nodos que las reglas viejas NO tenían');
  assert.ok(/\.remove\(\)/.test(cuerpo), 'y limpiar lo que escribe para probar');
  assert.ok(/espejoEnNubePropia = false/.test(cuerpo), 'si falla, se queda donde estaba');
  assert.ok(/publishPublicLookup/.test(cuerpo), 'y solo si funciona, se publica dónde buscarlo');
  // La guía NO puede publicarse en ningún otro sitio sin comprobar antes
  const publicaciones = (core.match(/publishPublicLookup\(/g)||[]).length;
  assert.equal(publicaciones, 2, 'la guía se define y se publica en un solo sitio: tras la comprobación');
  return 'se muda solo el que puede, y el resto sigue funcionando';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
