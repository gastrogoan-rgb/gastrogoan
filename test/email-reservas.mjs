// 5/09/2026, tres cositas que el dueño vio en "Confirmación de reservas por
// email" (Mi Negocio): al guardar la configuración salía el mensaje de
// "Configuración de pago guardada" (copiado de Redsys, no del email); y
// modificar una reserva desde "Gestionar mi reserva" en la web pública no
// avisaba nunca al cliente, ni de que quedó confirmada a la nueva hora ni de
// nada — solo existían los avisos de alta y de cancelación.
//
// Prueba ESTÁTICA a propósito: el flujo de modificación corre dentro del
// listener de Firebase (initPublicRequestsListener), que solo se puede
// probar de verdad contra el emulador oficial (test/emulador/) — coste alto
// para un cambio que sigue al pie de la letra el mismo patrón ya usado (y
// verificado en producción) para una reserva nueva, 20 líneas más arriba en
// la misma función.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = fs.readFileSync(path.join(raiz, 'js/core.js'), 'utf8');

let fallos = 0;
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ fallos++; console.error(`❌ ${nombre}\n   ${e.message}`); }
}

caso('Guardar la config de email de reservas no dice "pago guardado"', () => {
  const m = core.match(/function saveEmailConfirmConfig\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró saveEmailConfirmConfig');
  assert.ok(!m[0].includes('msg.payConfigSaved'), 'sigue mostrando el mensaje de Redsys al guardar el email de reservas');
  assert.ok(m[0].includes('msg.emailConfirmConfigSaved'), 'no usa un mensaje propio de confirmación');
});

caso('Modificar una reserva desde la web pública avisa al cliente si queda confirmada', () => {
  const bloque = core.match(/\}else if\(req\.type === 'reserva_modificar'\)\{[\s\S]*?\n      \}else if\(req\.type === 'nps_response'\)/);
  assert.ok(bloque, 'no se encontró el manejador de reserva_modificar');
  assert.ok(bloque[0].includes('sendReservationConfirmationEmail'),
    'reserva_modificar no envía ningún email — el cliente cambia la hora y no se entera de si le han dado mesa');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
