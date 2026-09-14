/* Lo que endurecimos el 14/09 tras una auditoría externa, para que no se
 * deshaga solo en el próximo cambio de reglas.
 *
 * Los tres agujeros que cierra, y por qué importan:
 *
 * 1. Cualquiera con el publicId (que va en el QR: es público a propósito) y
 *    una sesión anónima podía escribir 500 en `aforoHold` de cada turno de
 *    cada día. Efecto: el negocio aparece COMPLETO para siempre y no entra
 *    ni una reserva. No es vandalismo, es cerrarle el negocio a un cliente.
 *    Ahora una escritura no puede subir el contador más de 40 de golpe, que
 *    es de sobra para la mesa más grande que existe y cortísimo para un
 *    ataque.
 *
 * 2. `orderStatus` y `reservationStatus` no tenían NINGUNA validación en las
 *    reglas de cada negocio: se podía escribir cualquier cosa, con un token
 *    de un solo carácter. Con tokens cortos el seguimiento de un pedido
 *    ajeno se adivina probando. Ahora el token tiene que medir 12 o más.
 *
 * 3. El token salía de Math.random(), que no está pensado para esto y en
 *    algunos navegadores es predecible a partir de dos valores seguidos.
 *
 * Y de paso, el zoom: `user-scalable=no` dejaba sin acercar los números a
 * quien ve poco, en una app llena de cifras de dinero.
 *
 *   node test/endurecido-publico.mjs
 */
import fs from 'node:fs';

let ok = 0, mal = 0;
const comprobar = (nombre, condicion, detalle) => {
  if(condicion){ ok++; console.log(`✅ ${nombre}` + (detalle ? `  → ${detalle}` : '')); }
  else { mal++; console.log(`❌ ${nombre}` + (detalle ? `  → ${detalle}` : '')); }
};

const leerJson = ruta => JSON.parse(fs.readFileSync(ruta, 'utf8'));
const core = fs.readFileSync('js/core.js', 'utf8');
const publica = fs.readFileSync('reservagastrogoan.html', 'utf8');
const indice = fs.readFileSync('index.html', 'utf8');

/* Las dos copias de las reglas tienen que estar endurecidas las DOS: la de
   la plataforma protege el espejo compartido, y la de cada negocio es la
   que de verdad protege a los clientes que ya se mudaron a su propia nube.
   Endurecer solo una deja a la mitad de los negocios igual que estaban. */
const juegos = [
  ['plataforma', leerJson('reglas/reglas-de-la-plataforma.json')],
  ['cada negocio', leerJson('reglas/reglas-de-cada-negocio.json')],
];

for(const [quien, reglas] of juegos){
  const pub = reglas.rules.gastrogoan.public.$publicId;

  for(const nodo of ['aforoHold', 'pedidosHold']){
    const hoja = nodo === 'aforoHold'
      ? pub.aforoHold.$dateStr.$turnoIdx
      : pub.pedidosHold.$dateStr.$slot;
    const v = hoja['.validate'] || '';
    comprobar(
      `${quien}: ${nodo} no se puede subir de golpe`,
      v.includes('data.val() + 40') && v.includes('!data.exists()'),
      v.includes('data.val() + 40') ? 'tope de +40 por escritura' : 'FALTA el tope de incremento',
    );
    comprobar(
      `${quien}: ${nodo} sigue acotado a 0–500`,
      v.includes('newData.val() >= 0') && v.includes('newData.val() <= 500'),
    );
  }

  for(const nodo of ['orderStatus', 'reservationStatus']){
    const w = pub[nodo].$token['.write'] || '';
    comprobar(
      `${quien}: el token de ${nodo} tiene que ser largo`,
      w.includes('$token.length >= 12'),
      w.includes('$token.length >= 12') ? 'mínimo 12 caracteres' : 'FALTA la longitud mínima',
    );
    const v = pub[nodo].$token['.validate'] || '';
    comprobar(
      `${quien}: ${nodo} solo acepta {status, updatedAt}`,
      v.includes("hasChildren(['status', 'updatedAt'])"),
      v ? null : 'NO hay ninguna validación: se puede escribir cualquier cosa',
    );
  }

  const lookup = pub.reservationLookup.$lookupKey.$token['.write'] || '';
  comprobar(
    `${quien}: el token de reservationLookup tiene que ser largo`,
    lookup.includes('$token.length >= 12'),
  );
}

/* Las reglas que copia el asistente del alta son las MISMAS que el fichero
   de referencia: si se separan, un cliente nuevo pega unas reglas flojas y
   nadie se entera hasta que le pasa algo. */
const embebidas = core.match(/const FIREBASE_RULES_JSON = `([\s\S]*?)`;/);
comprobar(
  'lo que copia el asistente sigue siendo el fichero de cada negocio',
  embebidas && JSON.stringify(JSON.parse(embebidas[1])) ===
    JSON.stringify(leerJson('reglas/reglas-de-cada-negocio.json')),
);

/* El token: crypto, no Math.random. El respaldo con Math.random puede
   quedarse (navegadores viejos sin crypto), pero crypto tiene que ser el
   camino normal. */
const gen = publica.match(/function genClientRef\(\)\{[\s\S]*?\n\}/);
comprobar(
  'el token del cliente sale de crypto, no de Math.random',
  gen && gen[0].includes('crypto.getRandomValues'),
  gen && gen[0].includes('crypto.getRandomValues') ? 'con respaldo para navegadores viejos' : null,
);
comprobar(
  'el token sigue siendo lo bastante largo para las reglas (12+)',
  gen && /slice\(0,\s*16\)/.test(gen[0]),
);

/* Zoom: en una app con cifras de dinero, quien ve poco tiene que poder
   acercarlas. */
const viewport = (indice.match(/<meta name="viewport"[^>]*>/) || [''])[0];
comprobar(
  'la app se deja hacer zoom',
  !/user-scalable\s*=\s*no/.test(viewport) && !/maximum-scale/.test(viewport),
  viewport.includes('user-scalable=no') ? 'sigue bloqueado' : 'sin user-scalable=no ni maximum-scale',
);

/* VeriFactu: mientras no esté homologado, el texto no puede dar a entender
   que ya sirve para cumplir. Es una promesa legal, no una frase de marketing. */
const i18n = fs.readFileSync('js/i18n.js', 'utf8');
const avisos = [...i18n.matchAll(/'mn\.verifactu\.draftNotice':\s*'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]);
comprobar(
  'el aviso de VeriFactu está en los tres idiomas',
  avisos.length === 3,
  `${avisos.length} de 3`,
);
comprobar(
  'el aviso de VeriFactu no promete que ya esté listo',
  avisos.length === 3 && avisos.every(a => !/técnicamente preparado|tècnicament preparat|already technically ready/i.test(a)),
);
comprobar(
  'el aviso de VeriFactu dice que todavía no sirve para cumplir',
  avisos.length === 3 && avisos.every(a => /desarrollo|desenvolupament|in development/i.test(a)),
);

console.log('\n' + '═'.repeat(64));
if(mal === 0) console.log(`✅ los ${ok} casos pasaron`);
else { console.log(`❌ ${mal} fallaron (de ${ok + mal})`); process.exit(1); }
