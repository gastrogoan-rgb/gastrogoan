// 5/09/2026, "Confirmación de reservas por email" (Mi Negocio):
// - Al guardar la configuración salía el mensaje de "Configuración de pago
//   guardada" (copiado de Redsys, no del email).
// - Modificar una reserva desde "Gestionar mi reserva" en la web pública no
//   avisaba nunca al cliente, ni de que quedó confirmada a la nueva hora ni
//   de nada — solo existían los avisos de alta y de cancelación.
// - La guía paso a paso (y el resumen del manual de Ayuda) ya no coincidían
//   con la web real de EmailJS: el botón de conectar un email ya no se llama
//   "Add New Email Service" sino "Add New Service"; hace falta entrar en
//   "Code Editor" para poder pegar texto con {{llaves}} en una plantilla; y
//   la Public Key vive en "Account" → "API Keys", no en "Account" a secas.
//   El manual de Ayuda además solo hablaba de UNA plantilla y nunca mencionaba
//   {{manage_link}} — un negocio que lo siguiera al pie de la letra nunca
//   dejaba a sus clientes cancelar o cambiar la hora desde el email.
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
const app = fs.readFileSync(path.join(raiz, 'js/app.js'), 'utf8');
const tpv = fs.readFileSync(path.join(raiz, 'js/tpv.js'), 'utf8');
const publica = fs.readFileSync(path.join(raiz, 'reservagastrogoan.html'), 'utf8');
const finance = fs.readFileSync(path.join(raiz, 'js/finance.js'), 'utf8');
const hr = fs.readFileSync(path.join(raiz, 'js/hr.js'), 'utf8');

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

caso('Modificar una reserva desde la web pública avisa al cliente con su PROPIA plantilla, no la de confirmación', () => {
  const bloque = core.match(/\}else if\(req\.type === 'reserva_modificar'\)\{[\s\S]*?\n      \}else if\(req\.type === 'nps_response'\)/);
  assert.ok(bloque, 'no se encontró el manejador de reserva_modificar');
  assert.ok(bloque[0].includes('sendReservationModificationEmail'),
    'reserva_modificar no envía ningún email (o reutiliza el de confirmación) — el cliente cambia la hora y no se entera, o recibe un "confirmada" confuso al cambiar solo la hora');
  assert.ok(!bloque[0].includes('sendReservationConfirmationEmail'),
    'reserva_modificar reutiliza el email de CONFIRMACIÓN — un cliente que solo cambia la hora de una reserva ya confirmada no debe recibir otra vez "tu reserva está confirmada"');
});

caso('sendReservationModificationEmail usa su propia plantilla (modifyTemplateId), no la de confirmación', () => {
  const m = core.match(/function sendReservationModificationEmail\(reservation, overrideCfg\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró sendReservationModificationEmail');
  assert.ok(m[0].includes('cfg.modifyTemplateId') && m[0].includes('emailjs.send(cfg.serviceId, cfg.modifyTemplateId'),
    'no usa un Template ID propio para la modificación');
});

caso('La guía de EmailJS usa los nombres reales de los botones actuales (no los antiguos)', () => {
  const m = core.match(/const EMAILJS_GUIDE_STEPS = \[[\s\S]*?\n\];/);
  assert.ok(m, 'no se encontró EMAILJS_GUIDE_STEPS');
  assert.ok(m[0].includes('Add New Service'), 'sigue diciendo "Add New Email Service" (el botón real es "Add New Service")');
  assert.ok(!m[0].includes('Add New Email Service'), 'todavía queda el nombre de botón antiguo');
  assert.ok(m[0].includes('Code Editor'), 'no explica que hay que entrar en "Code Editor" para pegar las {{variables}}');
  assert.ok(m[0].includes('API Keys'), 'sigue diciendo que la Public Key está en "Account" a secas (está en "Account" → "API Keys")');
});

caso('Los botones de copiar plantilla de la guía llaman a copyEmailJsTemplate, para las CUATRO plantillas', () => {
  assert.ok(core.includes('function copyEmailJsTemplate'), 'no se encontró copyEmailJsTemplate');
  assert.ok(core.includes("onclick=\"copyEmailJsTemplate('confirm')\""), 'la plantilla de confirmación no tiene botón de copiar');
  assert.ok(core.includes("onclick=\"copyEmailJsTemplate('modify')\""), 'la plantilla de modificación no tiene botón de copiar');
  assert.ok(core.includes("onclick=\"copyEmailJsTemplate('order')\""), 'la plantilla de pedido aceptado no tiene botón de copiar');
  assert.ok(core.includes("onclick=\"copyEmailJsTemplate('cancel')\""), 'la plantilla de cancelación no tiene botón de copiar');
});

caso('La tarjeta de Mi Negocio pide y prueba las CUATRO plantillas (confirmación, modificación, pedido aceptado, cancelación)', () => {
  const m = core.match(/function renderEmailConfirmCard\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró renderEmailConfirmCard');
  ['ec-template', 'ec-modify-template', 'ec-order-template', 'ec-cancel-template', 'ec-pubkey'].forEach(id => {
    assert.ok(m[0].includes(`id="${id}"`), `falta el campo ${id} en la tarjeta de configuración`);
  });
  assert.ok(m[0].includes('testEmailModifyConfig()'), 'falta el botón para probar la plantilla de modificación');
  assert.ok(m[0].includes('testEmailOrderConfig()'), 'falta el botón para probar la plantilla de pedido aceptado');
});

caso('Aceptar un pedido online (para llevar/domicilio) envía un email de confirmación con enlace de seguimiento', () => {
  assert.ok(tpv.includes('function acceptOnlineOrder'), 'no se encontró acceptOnlineOrder en tpv.js');
  const m = tpv.match(/async function acceptOnlineOrder\(orderId, auto\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se pudo aislar el cuerpo de acceptOnlineOrder');
  assert.ok(m[0].includes('sendOrderConfirmationEmail'),
    'aceptar un pedido para llevar/domicilio no envía ningún email — el cliente no sabe si se está preparando ni tiene enlace para seguir el estado');
});

caso('sendOrderConfirmationEmail usa su propia plantilla y el enlace de seguimiento del pedido', () => {
  const m = core.match(/function sendOrderConfirmationEmail\(order, overrideCfg\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró sendOrderConfirmationEmail');
  assert.ok(m[0].includes('cfg.orderTemplateId') && m[0].includes('emailjs.send(cfg.serviceId, cfg.orderTemplateId'),
    'no usa un Template ID propio para el pedido aceptado');
  assert.ok(m[0].includes('getOrderTrackingLink(order)'), 'no incluye el enlace de seguimiento del pedido (track_link)');
});

caso('El manual de Ayuda menciona las CUATRO plantillas y los enlaces de gestión/seguimiento', () => {
  assert.ok(app.includes('manage_link'), 'el manual de Ayuda no menciona {{manage_link}} — un negocio que lo siguiera al pie de la letra nunca daría a sus clientes forma de cancelar/modificar una reserva desde el email');
  assert.ok(app.includes('track_link'), 'el manual de Ayuda no menciona {{track_link}} — un negocio que lo siguiera al pie de la letra nunca daría a sus clientes forma de seguir el estado de un pedido desde el email');
  assert.ok(/segunda plantilla/.test(app) && /tercera plantilla/.test(app) && /cuarta vez/.test(app),
    'el manual de Ayuda no explica que hacen falta CUATRO plantillas (confirmación, modificación, pedido aceptado y cancelación)');
});

caso('El aviso de antelación vs. horario solo mira la antelación de PEDIDOS, no la de reservas', () => {
  // 5/09/2026: el dueño reportó que el aviso "la antelación es mayor que el
  // horario de Martes" salía SIEMPRE que guardaba cualquier cosa en Mi
  // Negocio. Causa: se comparaba Math.max(antelación reservas, antelación
  // pedidos) contra el horario de un solo día — pero la antelación de
  // reservas se mide en DÍAS (2 días = 2880 min es una política normal) y
  // no tiene relación con cuánto dura un turno suelto; solo la de PEDIDOS
  // (que se cumple el mismo día) tiene sentido compararla así.
  const m = app.match(/DB\.business\.horario, [^)]*\);\s*\n\s*saveDB\(\);/);
  assert.ok(m, 'no se encontró la llamada a leadTimeVsHorarioWarning justo antes de saveDB() en la función de guardado de Mi Negocio');
  assert.ok(m[0].includes('leadTimeMinPedidos') && !m[0].includes('leadTimeMinReservas') && !m[0].includes('Math.max'),
    'sigue comparando con la antelación de reservas (o con el máximo de las dos) — el aviso volverá a saltar siempre con una antelación de reservas de varios días');
});

caso('La señal de reserva se puede pedir solo a partir de un número de personas (0 = siempre)', () => {
  assert.ok(publica.includes('function depositAppliesForPeople'), 'no se encontró depositAppliesForPeople en reservagastrogoan.html');
  const m = publica.match(/function depositAppliesForPeople\(people\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se pudo aislar el cuerpo de depositAppliesForPeople');
  assert.ok(m[0].includes('depositMinPeople'), 'no lee el umbral de personas (depositMinPeople)');
  assert.ok(publica.includes('depositAppliesForPeople(people)') && !publica.includes('!!(DB.business||{}).requireDeposit && redsysConfigured'),
    'submitReserva sigue exigiendo la señal a TODAS las reservas sin mirar el umbral de personas');
  assert.ok(publica.includes("oninput=\"updateDepositNoticeUi()\""),
    'el aviso de señal y el texto del botón no se actualizan al cambiar el número de personas, sin recargar la página');
});

caso('printTicket no imprime hasta que carga el QR externo (Google/VeriFactu) — salía en blanco', () => {
  const m = tpv.match(/function printTicket\(sale, opts=\{\}\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró printTicket');
  assert.ok(!/win\.print\(\);\s*\n\}/.test(m[0]),
    'printTicket sigue llamando a win.print() justo después de escribir el HTML, antes de que cargue el QR (api.qrserver.com), en vez de esperar a window.onload');
  assert.ok(m[0].includes('window.onload=function(){window.print();}'),
    'printTicket no usa el mismo patrón que printComandaTicket (esperar a window.onload antes de imprimir)');
});

caso('El tutorial de Netlify solo se enseña fuera de *.gastrogoan.com (autoalojado), y se despliega junto a index.html', () => {
  // Reportado: el enlace "tutorial-netlify.html" dentro de Mi Negocio
  // llevaba de vuelta a la propia app. Causa doble: (1) el archivo nunca se
  // copiaba a dist/ ni a deploy/app/public/, así que en app.gastrogoan.com
  // daba 404 y el comodín de la SPA devolvía la app; (2) ese aviso es del
  // modelo antiguo de autoalojamiento (el Kit descargable) y no pinta nada
  // en la app alojada por GastroGoan, donde no hay nada que subir a ningún
  // sitio.
  assert.ok(core.includes('function esKitAutoAlojado'), 'no se encontró esKitAutoAlojado en core.js');
  const m = core.match(/function renderOnlineCard\(\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'no se encontró renderOnlineCard');
  assert.ok(/esKitAutoAlojado\(\)\s*\?\s*`\s*<details/.test(m[0]),
    'el aviso de alojamiento (con el enlace a tutorial-netlify.html) sigue mostrándose siempre, no solo cuando la app está autoalojada');

  const build = fs.readFileSync(path.join(raiz, 'build.sh'), 'utf8');
  assert.ok(build.includes('cp tutorial-netlify.html dist/tutorial-netlify.html'),
    'build.sh no copia tutorial-netlify.html a dist/ — en cualquier sitio autoalojado que sí lo enseñe, el enlace seguiría dando 404');
  const deployScript = fs.readFileSync(path.join(raiz, 'deploy/actualizar.sh'), 'utf8');
  assert.ok(deployScript.includes('tutorial-netlify.html'),
    'deploy/actualizar.sh no copia tutorial-netlify.html junto al resto de index.html');
});

caso('"Platos más vendidos" del Panel de Control ordena por UNIDADES, no por dinero facturado', () => {
  // Reportado: "análisis de ventas" y "análisis de platos" (la misma
  // pantalla, Panel de Control) parecían dar información distinta. Causa:
  // la tabla "Platos más vendidos" sumaba price*qty (dinero) y ordenaba por
  // ESO — un plato vendido UNA vez a 50€ salía por delante de uno vendido
  // 100 veces a 2€, que es justo el que cualquiera llamaría "más vendido".
  // Encima la tabla solo mostraba el importe, nunca las unidades, así que
  // no había forma de comprobarlo a simple vista.
  const m = finance.match(/const productTotals = \{\};[\s\S]*?const topProducts = Object\.values\(productTotals\)[^;]*;/);
  assert.ok(m, 'no se encontró el cálculo de productTotals/topProducts en finance.js');
  assert.ok(m[0].includes('.units += (it.qty||1)') && m[0].includes('b.units-a.units'),
    'topProducts sigue sin sumar/ordenar por unidades (it.qty) — puede seguir ordenando por dinero facturado');
});

caso('"Platos más vendidos" del Panel de Control agrupa por receta, no por el texto del nombre (evita el "Salmón"/"Salmon" duplicado)', () => {
  // El dueño vio el mismo plato salir DOS VECES en el ranking del Panel de
  // Control ("Salmón" y "Salmon"). Causa: se agrupaba por it.name a secas;
  // en cuanto una venta antigua o un renombrado del plato guardó el nombre
  // de otra forma, se contaba como un plato distinto. "Análisis de Platos"
  // (platosStats, js/hr.js) ya agrupaba por recipeId con el nombre como
  // fallback — mismo criterio aquí para que los dos paneles coincidan sobre
  // los mismos datos.
  const m = finance.match(/const dishKey = it => [^;]*;[\s\S]*?const topMargins = Object\.values\(marginTotals\)[\s\S]*?;/);
  assert.ok(m, 'no se encontró dishKey/productTotals/marginTotals en finance.js');
  assert.ok(m[0].includes("it.recipeId ? ('r'+it.recipeId) : ('m'+(it.name||''))"),
    'dishKey no agrupa por recipeId cuando existe — puede seguir separando el mismo plato por una diferencia de texto en el nombre');
  assert.ok((m[0].match(/dishKey\(it\)/g)||[]).length >= 2,
    'productTotals y/o marginTotals no usan dishKey — alguno de los dos sigue agrupando por el nombre a secas');
});

caso('"Análisis de Platos" arranca en "Últimos 30 días", la misma ventana que "Análisis de ventas" del Panel de Control', () => {
  // El dueño veía cifras distintas entre los dos paneles con solo abrir la
  // pantalla: "Análisis de ventas" mira siempre los últimos 30 días,
  // "Análisis de Platos" arrancaba en "Este mes" (del día 1 a hoy) — dos
  // ventanas de tiempo distintas mirando la MISMA tabla de ventas. Ahora
  // los dos arrancan con la misma ventana móvil de 30 días.
  assert.ok(hr.includes("let platosPeriod = '30dias'"), 'el periodo por defecto de Análisis de Platos ya no es "últimos 30 días"');
  const m = hr.match(/function getPlatosRange\(\)\{[\s\S]*?\n  \}/);
  assert.ok(m, 'no se encontró getPlatosRange');
  assert.ok(m[0].includes("platosPeriod === '30dias'") && m[0].includes('29*86400000'),
    'getPlatosRange no calcula "30dias" con la misma ventana de 29 días atrás + hoy que usa renderDashboard (js/finance.js)');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
