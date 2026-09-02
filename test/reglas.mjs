// Que las reglas que la app le da a un negocio nuevo sean EXACTAMENTE las
// del fichero de referencia.
//
// Por qué existe: había tres copias de las reglas —el fichero de `reglas/`,
// las incrustadas en el asistente de alta y `database.rules.propuesta.json`—
// y no coincidían entre sí. Eso provocó dos fallos reales el 2/09: la sonda
// del espejo escribía un `orderStatus` que una de las copias rechazaba, y
// `pago_confirmado` no estaba en la lista blanca de ninguna, así que toda
// confirmación de pago con tarjeta se rechazaba.
//
// Una divergencia aquí no se ve en ninguna pantalla: se descubre cuando a un
// cliente le deja de funcionar algo, semanas después.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

const core = leer('js/core.js');
const marca = 'const FIREBASE_RULES_JSON = `';
const desde = core.indexOf(marca);
const hasta = core.indexOf('`;', desde);
const incrustadas = core.slice(desde + marca.length, hasta);
const negocio = leer('reglas/reglas-de-cada-negocio.json');
const plataforma = leer('reglas/reglas-de-la-plataforma.json');

caso('Las tres son JSON válido', () => {
  [incrustadas, negocio, plataforma].forEach(x => JSON.parse(x));
  return 'asistente, negocio y plataforma';
});

caso('Lo que copia el asistente es EXACTAMENTE el fichero de cada negocio', () => {
  assert.deepEqual(JSON.parse(incrustadas), JSON.parse(negocio),
    'el botón "Copiar reglas" del alta le daría a un cliente nuevo unas reglas distintas de las de referencia');
  return 'idénticas';
});

caso('El asistente no cita números de paso', () => {
  /* Los números se desincronizan solos en cuanto se añade o mueve un paso.
     Pasó: las reglas eran el paso 5 y el aviso decía "paso 4", así que el
     hostelero iba al sitio equivocado. Se nombra el paso, no se numera. */
  const desde2 = core.indexOf('const FIREBASE_GATE_STEPS');
  const guia = core.slice(desde2, core.indexOf('\n];', desde2));
  const citas = guia.match(/paso \d|pas \d|step \d/gi) || [];
  assert.deepEqual(citas, [], 'la guía se cita a sí misma con números: ' + citas.join(', '));
  return 'se nombra el paso, no se numera';
});

const TIPOS = ['reserva','pedido','nps_response','reserva_cancelar','reserva_modificar','pago_confirmado'];
caso('Todos los tipos de solicitud que la app usa están permitidos', () => {
  const publico = leer('reservagastrogoan.html') + core;
  [negocio, plataforma, incrustadas].forEach(reglas => {
    TIPOS.forEach(tipo => {
      if(!publico.includes(`'${tipo}'`) && !publico.includes(`"${tipo}"`)) return;
      assert.ok(reglas.includes(`=== '${tipo}'`),
        `la app escribe solicitudes de tipo "${tipo}" pero las reglas lo rechazan`);
    });
  });
  return TIPOS.length + ' tipos';
});

caso('Una solicitud YA PROCESADA se puede borrar', () => {
  /* Si no, el histórico con nombres, teléfonos y direcciones de reparto crece
     sin fin y se descarga entero en cada arranque. Solo las ya reclamadas por
     la app: si no, un cliente podría borrar las reservas de otro. */
  [negocio, plataforma, incrustadas].forEach(reglas => {
    assert.ok(reglas.includes("!newData.exists() && data.child('_claimedAt').exists()"),
      'la regla de requests no permite borrar una solicitud ya reclamada');
  });
  return 'y solo las reclamadas';
});

caso('La sonda del espejo escribe donde las reglas la dejan', () => {
  /* ⚠️ Esto tenía rota la mudanza ENTERA a la nube propia. El permiso de
     Firebase BAJA pero no SUBE: con `.write` en aforoHold/$fecha/$turno, borrar
     aforoHold/$fecha se rechaza siempre. La sonda borraba el padre, así que
     fallaba incluso con las reglas nuevas bien puestas y ningún negocio se
     mudaba nunca — de ahí que la plataforma compartida aguantara el peso de
     todos y el techo fueran ~67 negocios. */
  assert.ok(!core.includes("base.child('aforoHold/_prueba').remove()"),
    'la sonda vuelve a borrar el nodo PADRE: las reglas lo rechazan siempre');
  assert.ok(core.includes("base.child('aforoHold/_prueba/_prueba').remove()"),
    'la sonda tiene que borrar el hijo, que es lo que las reglas permiten');
  assert.ok(core.includes("orderStatus/_prueba').set({status:"),
    'el orderStatus de prueba tiene que llevar los campos que exige el validador');
  return 'borra el hijo, no el padre';
});

caso('La app no borra ningún nodo padre de los holds', () => {
  ['aforoHold','mesaHold','pedidosHold'].forEach(rama => {
    assert.ok(!core.includes(`'/${rama}/' + fecha).remove()`),
      `se borra el padre de ${rama}: Firebase lo rechaza siempre, y en silencio`);
  });
  return 'aforo, mesa y pedidos';
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ los 7 casos pasaron`);
process.exit(fallos ? 1 : 0);
