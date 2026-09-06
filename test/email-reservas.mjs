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
const operations = fs.readFileSync(path.join(raiz, 'js/operations.js'), 'utf8');
const idr = fs.readFileSync(path.join(raiz, 'js/idr.js'), 'utf8');
const i18n = fs.readFileSync(path.join(raiz, 'js/i18n.js'), 'utf8');

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

caso('Punto de Equilibrio: "Usar datos reales" siembra el ticket medio SIN IVA, no el bruto', () => {
  // El food cost objetivo del Punto de Equilibrio se compara siempre contra
  // ingresos SIN IVA (mismo criterio que renderVariables: tvNeto/facNeta).
  // peUseRealData rellenaba el ticket medio con sale.total (CON IVA):
  // el margen de contribución salía inflado y el punto de equilibrio
  // necesario, infravalorado en más de un 10% con IVA del 21% — un negocio
  // por debajo del equilibrio real podía ver el semáforo en verde.
  const m = hr.match(/function peUseRealData\(\)\{[\s\S]*?\n  \}/);
  assert.ok(m, 'no se encontró peUseRealData');
  assert.ok(!/const total = sales\.reduce\(\(s,x\)=>s\+parseFloat\(x\.total\|\|0\)\)/.test(m[0]),
    'sigue sumando x.total (bruto) directamente para el ticket medio');
  assert.ok(m[0].includes('rate/100') && m[0].includes('avgTicket = totalNeto/sales.length'),
    'peUseRealData no calcula el ticket medio quitando el IVA de cada línea');
});

caso('Análisis de Platos: el margen por plato se calcula SIN IVA y con el descuento de la venta aplicado (hallazgo de Codex)', () => {
  // Mismo bug que ya se corrigió en recipeFoodCostPct y en el "Top margen
  // bruto" del Dashboard: platosStats calculaba el margen restando el coste
  // (siempre neto) del importe CON IVA de la línea, y encima sin aplicar el
  // descuento de la venta — un plato con IVA alto y vendido con descuento
  // podía aparecer rentable cuando su margen real era mucho menor, o incluso
  // negativo.
  const m = hr.match(/function platosStats\(\)\{[\s\S]*?\n  \}/);
  assert.ok(m, 'no se encontró platosStats');
  assert.ok(m[0].includes('descPct') && m[0].includes('1 - descPct/100'),
    'platosStats no aplica el descuento de la venta a la línea del plato');
  assert.ok(m[0].includes('revenueNeto') && m[0].includes('lineRevenue / (1 + rate/100)'),
    'platosStats no calcula un ingreso SIN IVA por línea');
  assert.ok(/margin = cost!=null \? it\.revenueNeto - cost/.test(m[0]),
    'el margen sigue restando el coste del ingreso CON IVA, no del ingreso neto');
});

caso('La venta de liquidación de una plataforma recibe cierreId, no se duplica en el siguiente cierre (hallazgo de Codex)', () => {
  // registerPlatformSettlementSale se llamaba ANTES de que existiera
  // closure.id, así que la venta agregada de Glovo/Uber Eats/etc. nunca
  // recibía cierreId — getSalesForClosure() la volvía a coger entera en el
  // SIGUIENTE cierre de caja del mismo día, duplicando su importe.
  const m = operations.match(/async function performCashClosure\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró performCashClosure');
  assert.ok(m[0].includes('platformSaleObjs.push(sale)'),
    'no se guarda la referencia a la venta de liquidación creada');
  assert.ok(m[0].includes('platformSaleObjs.forEach(s => { s.cierreId = closure.id; })'),
    'la venta de liquidación de plataforma no recibe cierreId — se duplicará en el próximo cierre');
});

caso('Un pedido online que reserva franja y luego se rechaza (zona fuera de cobertura, cambio insuficiente) libera esa franja (hallazgo de Codex)', () => {
  // reservePedidoSlotAtomic ocupaba la franja ANTES de las comprobaciones de
  // zona de reparto y de cambio suficiente. Si cualquiera de las dos
  // rechazaba el pedido, la función salía con un `return` sin liberar la
  // franja — un hueco real quedaba "lleno" para el resto del servicio sin
  // ningún pedido detrás, hasta que el negocio volviera a sincronizar.
  assert.ok(publica.includes('function releasePedidoSlot('), 'no se encontró releasePedidoSlot');
  const m = publica.match(/if\(zoneRestricted\)\{[\s\S]*?\n  \}/);
  assert.ok(m, 'no se encontró el bloque de comprobación de zona');
  assert.ok(m[0].includes('releasePedidoSlot(pedidoSlotReservado.date, pedidoSlotReservado.slot)'),
    'el fallo de zona de reparto no libera la franja ya reservada');
  const m2 = publica.match(/if\(isNaN\(pagaCon\) \|\| pagaCon < total\)\{[\s\S]*?\n\s*\}/);
  assert.ok(m2, 'no se encontró la validación de "paga con"');
  assert.ok(m2[0].includes('releasePedidoSlot(pedidoSlotReservado.date, pedidoSlotReservado.slot)'),
    'el fallo de cambio insuficiente no libera la franja ya reservada');
});

caso('La clave y la cuota del I+D son por SLOT, no solo por dispositivo (hallazgo de Codex)', () => {
  // Un dueño con varios negocios en la misma tablet (o una tablet que pasa
  // de un negocio a otro) compartía sin querer la clave del proveedor de IA
  // y la cuota de 500 llamadas/día, porque las dos vivían en una clave FIJA
  // de localStorage ('gastrogoan_idr_key'/'gastrogoan_idr_gasto'), igual
  // para cualquier slot activo. Ahora incorporan ACTIVE_SLOT, mismo
  // criterio que slotLicenseKey (js/core.js).
  assert.ok(idr.includes("function idrKeyLS()") && idr.includes("ACTIVE_SLOT === 'default' ? 'gastrogoan_idr_key' : 'gastrogoan_idr_key_' + ACTIVE_SLOT"),
    'la clave de IA no está aislada por slot');
  assert.ok(idr.includes("function idrGastoLS()") && idr.includes("ACTIVE_SLOT === 'default' ? 'gastrogoan_idr_gasto' : 'gastrogoan_idr_gasto_' + ACTIVE_SLOT"),
    'la cuota diaria de IA no está aislada por slot');
  assert.ok(!/\bIDR_KEY_LS\b/.test(idr) && !/\bIDR_GASTO_LS\b/.test(idr),
    'queda algún uso de la clave fija sin aislar por slot');
});

caso('downloadJSON devuelve la promesa de guardarArchivo (hallazgo de Codex sobre js/app.js)', () => {
  // Sin el `return`, quien hace `await downloadJSON(...)` (el archivado, que
  // BORRA después) recibía `undefined` al instante en vez del rechazo real
  // de una hoja de compartir cancelada en iPad.
  const m = app.match(/function downloadJSON\(obj, filename\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró downloadJSON');
  assert.ok(m[0].includes('return guardarArchivo('), 'downloadJSON no devuelve la promesa de guardarArchivo');
});

caso('downloadFullBackup solo marca la copia como hecha si downloadJSON no falla/cancela', () => {
  const m = app.match(/async function downloadFullBackup\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró downloadFullBackup (¿sigue sin ser async?)');
  assert.ok(m[0].includes('try{') && m[0].includes('await downloadJSON') && m[0].includes('catch(e){'),
    'downloadFullBackup no espera ni comprueba el resultado de downloadJSON');
  const idxCatchClose = m[0].indexOf("}catch(e){\n    showToast(t('msg.backupFailedNoDelete'), 6000);\n    return;\n  }");
  const idxAssignLastBackupAt = m[0].indexOf('DB.business.lastBackupAt = ');
  assert.ok(idxCatchClose !== -1 && idxAssignLastBackupAt > idxCatchClose, 'DB.business.lastBackupAt se asigna antes de comprobar si la descarga funcionó');
});

caso('El archivado borra por los IDs exportados, no re-filtrando DB por fecha (evita borrar lo que llegó después de exportar)', () => {
  const m = app.match(/async function archiveOldData\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró archiveOldData');
  assert.ok(m[0].includes('const salesIds = new Set(sales.map(s => s.id))'), 'no se capturan los IDs de ventas exportados');
  assert.ok(m[0].includes('DB.sales = DB.sales.filter(s => !salesIds.has(s.id))'),
    'el borrado de ventas sigue re-aplicando el filtro de fecha en vez de borrar por ID exportado');
  assert.ok(m[0].includes('DB.reservations = DB.reservations.filter(r => !reservationIds.has(r.id))'), 'igual para reservas');
  assert.ok(m[0].includes('DB.cashClosures = DB.cashClosures.filter(c => !cashClosureIds.has(c.id))'), 'igual para cierres de caja');
});

caso('Borrar una mesa vuelve a comprobar la comanda justo antes de borrarla (no la versión de antes del confirmModal)', () => {
  // Dos dispositivos: uno añade un plato a la mesa mientras el otro confirma
  // borrarla. Sin re-consultar, se borraba la comanda YA ACTUAL (con el
  // plato nuevo) usando una referencia capturada antes de esperar.
  const m = app.match(/async function deleteTableFromConfig\(id\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró deleteTableFromConfig');
  assert.ok(m[0].includes('const ordenActual = DB.tpvOrders.find(o => o.id === order.id)'),
    'no se vuelve a consultar la comanda actual justo antes de borrarla');
});

caso('"Guardar todo" no pisa los tipos de servicio leyéndolos otra vez del DOM (evita revertir un cambio sincronizado)', () => {
  const m = app.match(/async function saveBusiness\(silent\)\{[\s\S]*?\n\}\n\n\/\/ Compara/);
  assert.ok(m, 'no se encontró saveBusiness completo');
  assert.ok(!m[0].includes("el('mn-serv-mesa').checked"),
    'saveBusiness sigue leyendo los checkboxes de tipos de servicio del DOM: puede revertir un cambio remoto reciente');
});

caso('El horario NO se puede guardar en silencio cuando el propio horario es lo que acaba de cambiar', () => {
  // saveBusiness(true) (silente) se salta la confirmación de horario
  // inválido a propósito para no interrumpir por campos ajenos — pero eso
  // incluía los propios campos de horario, que nunca llegaban a bloquear
  // nada por mucho que el cierre quedara antes que la apertura.
  assert.ok(!/id="\$\{prefix\}-ini"[^>]*onchange="saveBusiness\(true\)"/.test(app) && !app.includes('${prefix}-ini" class="mn-horario-time" value="${escapeHtml(tramo.ini||\'\')}" style="padding:3px 5px;font-size:12.5px;width:auto;min-height:auto" onchange="saveBusiness(true)"'),
    'el campo de hora de inicio del horario sigue guardando en silencio');
  const m = app.match(/function toggleHorarioDia\(i\)\{[\s\S]*?\n\}/);
  assert.ok(m && !m[0].includes('saveBusiness(true)') && m[0].includes('saveBusiness()'),
    'toggleHorarioDia sigue guardando el horario en silencio');
  const m2 = app.match(/function toggleHorarioModo\(i\)\{[\s\S]*?\n\}/);
  assert.ok(m2 && !m2[0].includes('saveBusiness(true)') && m2[0].includes('saveBusiness()'),
    'toggleHorarioModo sigue guardando el horario en silencio');
});

caso('El IVA general del ticket rechaza valores negativos o mayores de 100 (evita una división por cero en el desglose fiscal)', () => {
  const m = app.match(/function saveTicketConfig\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró saveTicketConfig');
  assert.ok(m[0].includes('isFinite(ivaPct)') && m[0].includes('ivaPct < 0') && m[0].includes('ivaPct > 100'),
    'saveTicketConfig no valida el rango del IVA antes de guardarlo');
  assert.ok(m[0].includes('return;'), 'saveTicketConfig no rechaza el guardado con un IVA inválido');
});

caso('Borrar una zona completa vuelve a comprobar sus mesas justo antes de borrarlas (mismo patrón que la mesa suelta)', () => {
  // Mismo hallazgo que deleteTableFromConfig, encontrado en una segunda
  // pasada de la auditoría buscando el mismo patrón: la lista de mesas se
  // capturaba antes del confirmModal, y al borrar se volvía a filtrar DB.tables
  // por zona en vez de por los IDs concretos ya comprobados — una mesa nueva
  // llegada por sincronización durante la espera se borraba sin haberse
  // mostrado ni comprobado, y una reserva podía quedar apuntando a ella.
  const m = app.match(/async function deleteZonaCompleta\(zona\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró deleteZonaCompleta');
  assert.ok(m[0].includes('const tablesNow = DB.tables.filter(tb => tb.zona === zona)'),
    'no se vuelve a consultar las mesas de la zona justo antes de borrar');
  assert.ok(m[0].includes('clearDanglingTableRefs(tablesNow.map(tb => tb.id))'),
    'la limpieza de referencias sigue usando la lista capturada antes de confirmar, no la actual');
});

caso('Desactivar el TPV virtual no borra la configuración local si el Worker rechaza la petición (hallazgo de Codex sobre conexiones externas)', () => {
  const m = core.match(/async function disableRedsysConfig\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró disableRedsysConfig');
  assert.ok(m[0].includes('if(!res.ok) throw new Error'),
    'disableRedsysConfig no comprueba res.ok — puede mostrarse como desactivado aunque el Worker haya fallado');
  assert.ok(m[0].includes("['rs-fuc','rs-terminal','rs-clave'].forEach"),
    'no se encontró el bloque de limpieza de campos locales');
  const idxThrow = m[0].indexOf('throw new Error');
  const idxLimpieza = m[0].indexOf("['rs-fuc'");
  assert.ok(idxThrow !== -1 && idxLimpieza > idxThrow, 'la limpieza de campos locales sigue ocurriendo antes de comprobar si el Worker confirmó la desactivación');
});

caso('El email de confirmación de reserva no sale si la reserva sigue pendiente de señal (hallazgo de Codex)', () => {
  // Antes se enviaba con solo tener mesa asignada, aunque el status siguiera
  // 'pendiente' por exigir señal — el cliente recibía "reserva confirmada"
  // aunque hubiera abandonado el pago de la señal a mitad.
  const m = core.match(/if\(req\.type === 'reserva'\)\{[\s\S]*?notifyNewRequest = true;\n\s*\}else if\(req\.type === 'reserva_cancelar'\)/);
  assert.ok(m, 'no se encontró el bloque de alta de reserva pública');
  assert.ok(m[0].includes("newReservation.status === 'confirmada' && typeof sendReservationConfirmationEmail"),
    'el email de confirmación se envía sin comprobar que la reserva esté realmente confirmada');
  assert.ok(!m[0].includes("if(confirmedTableId && typeof sendReservationConfirmationEmail"),
    'sigue quedando la condición vieja (solo mesa asignada, sin comprobar el status)');
});

caso('El email de confirmación SÍ sale cuando la señal se confirma más tarde (para no dejar esas reservas sin ningún aviso)', () => {
  const m = core.match(/const reservationPaid = \(DB\.reservations\|\|\[\]\)\.find[\s\S]*?logAudit\('edit', t\('audit\.depositConfirmed'\)/);
  assert.ok(m, 'no se encontró el bloque de confirmación de depósito de reserva');
  assert.ok(m[0].includes('const pasaAConfirmada =') && m[0].includes('sendReservationConfirmationEmail({...reservationPaid'),
    'la confirmación del depósito no dispara el email de confirmación que se difirió al crear la reserva');
});

caso('El guardado local se espera ANTES de borrar la solicitud pública de Firebase (evita perder un pedido/reserva si el dispositivo se cierra en ese hueco)', () => {
  const m = core.match(/reqRef\.child\('_claimedAt'\)\.transaction[\s\S]*?\}\)\.catch\(e => console\.error\('Error reclamando solicitud pública', e\)\);/);
  assert.ok(m, 'no se encontró el manejador de reclamación de solicitudes públicas');
  assert.ok(m[0].includes('.then(async claimResult') , 'el manejador ya no es async: no puede esperar el guardado');
  assert.ok(m[0].includes('await saveDB();'), 'el guardado local no se espera antes de borrar la solicitud de la nube');
  const idxAwait = m[0].indexOf('await saveDB();');
  const idxRemove = m[0].indexOf('reqRef.remove();');
  assert.ok(idxAwait !== -1 && idxRemove > idxAwait, 'reqRef.remove() sigue pudiendo ejecutarse antes de que el guardado local termine');
});

caso('El cuaderno de I+D se fusiona igual en la carga inicial completa que en la sincronización en caliente (hallazgo de Codex)', () => {
  // mergeRemoteIntoLocal (arranque) le faltaba el mismo tratamiento que
  // applyRemoteBlock (listener incremental) ya tenía: sin él, abrir la app
  // sustituía el cuaderno de IA entero por el de la nube, perdiendo una
  // prueba local sin subir o una respuesta que llegara a mitad de conversación.
  const m = core.match(/function mergeRemoteIntoLocal\(val\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró mergeRemoteIntoLocal');
  assert.ok(m[0].includes("if(key === 'idr' && DB[key] && typeof value === 'object')"),
    'a la carga inicial completa le sigue faltando el tratamiento especial de idr');
  assert.ok(m[0].includes("mergeNestedArraysByKey(DB[key], value, ['creaciones','carpetas'])") && m[0].includes('fusionarCreacionIdr(local, c)'),
    'falta fusionar las creaciones de IDR por id y por conversación, no solo por documento completo');
});

caso('La propina de un autopedido de mesa pagado online no cuenta como cobrada hasta que el banco confirma (hallazgo de Codex)', () => {
  assert.ok(core.includes('order.propinasPendientes.push({ref: req.clientRef, importe: req.propina})'),
    'la propina de un autopedido pagado online sigue sumándose a propinaPagadaOnline en cuanto llega la solicitud, antes de que el banco confirme nada');
  const m = core.match(/if\(Array\.isArray\(o\.propinasPendientes\) && o\.propinasPendientes\.length\)\{[\s\S]*?\n\s*\}/);
  assert.ok(m, 'no se encontró el reclamo de propinas pendientes en pago_confirmado');
  assert.ok(m[0].includes('o.propinaPagadaOnline = (o.propinaPagadaOnline||0) + pendiente.importe'),
    'pago_confirmado no mueve la propina pendiente a propinaPagadaOnline al confirmarse el pago');
});

caso('El listener de conexión de la nube no se duplica en cada reconexión (hallazgo de Codex)', () => {
  assert.ok(core.includes('let infoConnectedListenerAttached = false;'), 'no se encontró el flag de listener único');
  const m = core.match(/if\(!infoConnectedListenerAttached\)\{[\s\S]*?'\.info\/connected'\)\.on\('value'/);
  assert.ok(m, 'el listener de .info/connected ya no está protegido por el flag');
});

caso('Los reintentos de subida a la nube crecen con backoff exponencial, no cada 15s fijos (hallazgo de Codex)', () => {
  const m = core.match(/function scheduleCloudSyncRetry\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró scheduleCloudSyncRetry');
  assert.ok(m[0].includes('cloudSyncRetryAttempt++') && m[0].includes('Math.pow(2, cloudSyncRetryAttempt - 1)'),
    'los reintentos de subida siguen siendo cada 15s fijos, sin backoff — machacan la nube sin parar si el permiso está denegado de forma permanente');
  assert.ok(core.includes('cloudSyncRetryAttempt = 0; // subida buena'),
    'el contador de reintentos no se resetea tras una subida buena');
});

caso('Dividir cuenta a partes iguales o por artículos incluye la propina ya pagada online, no solo la de caja (hallazgo de Codex)', () => {
  const m = tpv.match(/function generateEqualSplit\(orderId\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'no se encontró generateEqualSplit');
  assert.ok(m[0].includes("(order.propina || 0) + (order.propinaPagadaOnline || 0)"),
    'generateEqualSplit no suma propinaPagadaOnline al total a repartir — esa propina desaparece de la cuenta al dividir');
  const m2 = tpv.match(/function generateItemsSplit\(orderId\)\{[\s\S]*?\n\}/);
  assert.ok(m2, 'no se encontró generateItemsSplit');
  assert.ok(m2[0].includes("const propina = (order.propina || 0) + (order.propinaPagadaOnline || 0)"),
    'generateItemsSplit no suma propinaPagadaOnline al total a repartir');
});

caso('Dos instancias de menú distintas no comparten línea aunque elijan la misma opción (hallazgo de Codex)', () => {
  const m = tpv.match(/const existing = order\.items\.find\(l =>[\s\S]*?\);/);
  assert.ok(m, 'no se encontró la búsqueda de línea existente al añadir un menú');
  assert.ok(m[0].includes('l.menuInstanceId === menuInstanceId'),
    'la fusión de líneas de menú no comprueba menuInstanceId — dos instancias distintas con la misma opción se funden en una sola línea, descuadrando el stock de menús al marchar');
});

caso('Un pago de Redsys confirmado con un importe distinto del pedido se avisa, sin bloquear el cobro (hallazgo de Codex)', () => {
  const m = core.match(/const importeEsperado = roundMoney\([\s\S]*?\n(?:\s{10}order\.pagado = true;)/);
  assert.ok(m, 'no se encontró la comprobación de importe de Redsys en el manejador de pago_confirmado');
  const bloque = m[0];
  assert.ok(bloque.includes('orderTotal(order)'),
    'el importe esperado no se calcula a partir de orderTotal(order) — el TPV virtual manda el importe y nadie comprueba que cuadre con lo que de verdad cuesta el pedido');
  assert.ok(bloque.includes('Math.abs(importeConfirmado - importeEsperado) > 0.02'),
    'falta el margen de tolerancia al comparar el importe confirmado con el esperado');
  assert.ok(bloque.includes('DB.paymentAmountMismatches'),
    'los desajustes de importe no quedan anotados en ningún sitio para poder revisarlos luego');
  assert.ok(bloque.includes("notifyDesktop(t('notif.paymentMismatchTitle')"),
    'un desajuste de importe no avisa al hostelero');
  assert.ok(bloque.trim().endsWith('order.pagado = true;'),
    'la comprobación de importe bloquea (o se salta) el marcado de pagado — tiene que ser un aviso, no un bloqueo: el origen real del problema es el Worker externo de Redsys, que no valida el importe contra el pedido y no se puede arreglar desde este repositorio');
  const apariciones = (i18n.match(/'notif\.paymentMismatchTitle'/g) || []).length;
  assert.equal(apariciones, 3, 'falta la traducción del aviso de importe no coincidente en alguno de los tres idiomas');
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
process.exit(fallos ? 1 : 0);
