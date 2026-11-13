# Gestión operativa en el restaurante de los pedidos para llevar y a domicilio (sin la parte del repartidor)

Notas de investigación (13/11/2026). Fuentes: centros de ayuda de Toast, Square, Olo, Deliverect, Otter, Last.app y Qamarero, más blogs del sector. Se marca qué es viable en GastroGoan, que funciona **solo en el navegador de la tablet + Firebase, sin servidor**.
Aviso general: muchos de los «dolores» citados vienen de blogs de fabricantes que venden la solución. No encontré hilos de Reddit ni de foros de hostelería españoles que se pudieran citar (la búsqueda no los devolvió). Faltan también reseñas de Capterra/G2.

## 1. Aceptar pedidos: automática o manual, avisos, pedidos sin aceptar, pausa y agotados

### Takeaway
La norma del sector es la **aceptación automática por defecto**, más dos válvulas: **«modo ocupado»**, que alarga el tiempo de preparación sin cerrar, y **pausa** del canal o del local con duración. Los platos agotados se «snoozean» por un tiempo. Con aceptación manual, un pedido sin aceptar **caduca y se cancela** (en las plataformas, unos 3 minutos). Por eso el aviso es **persistente hasta que alguien actúa**.

### Cited Findings
- Deliverect activa la aceptación automática por defecto: los pedidos entran directamente al TPV sin aceptarlos en una tablet. Desactivarla obliga a aceptar dos veces (tablet y TPV) y Deliverect no lo recomienda — [Deliverect vía Lightspeed](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329315466651-Managing-busy-times-with-Deliverect)
- Deliverect recomienda «snooze» y «busy mode» en lugar de rechazar pedidos. El «busy mode» tiene dos variantes:
  - Botón naranja: alarga el tiempo de preparación de los pedidos nuevos y el local sigue abierto en ese canal.
  - Cierre del local en un canal o en todos.

  No todos los canales lo admiten — [Lightspeed/Deliverect](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329315466651); [API busy mode](https://developers.deliverect.com/reference/post-busy-mode)
- Snooze de artículos (Deliverect): se eligen uno o varios artículos y una duración, y desaparecen al momento de las cartas online. Volver a activarlos puede tardar hasta 15 min en verse — [Deliverect blog snooze](https://deliverect.com/en/blog/deliverect/maximize-kitchen-efficiency-deliverect-snooze-feature-guide)
- Otter permite aceptación automática o manual por plataforma. Con la manual, si no se acepta en el plazo de la plataforma, normalmente unos 3 minutos, el pedido se cancela — [Otter, resultados del buscador sobre Auto-Accept vs Manual](https://helpdesk.tryotter.com/hc/en-us/articles/360052114914)
- Sonidos de Otter:
  - Pedido nuevo: «Wave» (por defecto) o «Chime». Cancelación: «Sonar» o «Radar».
  - Comportamiento «persistent»: el aviso no se quita hasta aceptar o rechazar.
  - Comportamiento «auto accept»: el aviso se quita a los 3 s.
  - Si no hay ni sonido ni aviso visual, la causa suele ser la hora de la tablet desajustada — [Otter Device Settings](https://helpdesk.tryotter.com/hc/en-us/articles/33781391294867-Otter-Device-Settings)
- Otter: pausa de escaparates desde la tablet, el TPV o la web, en bloque o programada, y se puede cancelar o editar una pausa programada — [Otter Pause/Unpause](https://helpdesk.tryotter.com/hc/en-us/articles/22205073836051)
- Otter Go envía «alertas en vivo» al encargado cuando pasa algo de esto: ajuste del tiempo de preparación, aceptación automática apagada, escaparate pausado o cambio de disponibilidad de un artículo — [Otter Device Settings / Live Alerts](https://helpdesk.tryotter.com/hc/en-us/articles/19456763447827)
- En el panel de Otter, «Missed Orders» son los pedidos que caducan antes de que el personal los acepte, y cuentan como métrica — [Otter Dashboard Guide](https://helpdesk.tryotter.com/hc/en-us/articles/27245439440147-Otter-Dashboard-Guide)
- Square, «Busy Mode»:
  - Suma +10, +15 o +20 min durante 15 min, 30 min o 1 h.
  - Los pedidos siguen entrando con una espera mayor.
  - Funciona para Square Online y Uber Eats.

  La pausa total de recogida o reparto se hace en Pedidos → Order Timing y muestra el tiempo de pausa que queda, con «reanudar» al instante. También se puede retrasar un pedido concreto. Una respuesta antigua de la comunidad habla de solo +15 fijo, así que depende de la versión — [Square: Manage order timing](https://squareup.com/help/us/en/article/8325-manage-order-timing-with-square)
- Square: hay comerciantes que piden pausar solos los pedidos online al llegar a N pedidos en un periodo (petición de función abierta en la comunidad) — [Square Community feature request](https://community.squareup.com/t5/Square-Online/Feature-request-Pause-Online-Orders-if-Certain-Number-of-Orders/idi-p/804238)
- Last.app abre y cierra las plataformas integradas (Glovo, Uber Eats, Shop), y la cocina puede marcar productos como no disponibles desde el propio KDS — [Last.app Delivery Management](https://desk.last.app/portal/en/kb/articles/delivery-management-closing-delivery-platforms); [Last.app KDS](https://www.last.app/en/product/kds-for-restaurants)
- Owner.com con Toast explica cómo pausar los pedidos online — [Owner.com help](https://help.owner.com/en/articles/11932299-how-can-i-pause-online-ordering-with-a-toast-integration)

### Inferences
- Para GastroGoan, la norma del dueño («si hay sitio y tiempo, se ejecuta solo») encaja con el estándar del sector: aceptación automática más válvulas. Las válvulas que faltan si no existen ya:
  - Modo ocupado con +N min y caducidad.
  - Pausa por canal (llevar / domicilio) con cuenta atrás y reanudar.
  - Agotado con duración (hasta fin de servicio / 1 h).

  Todo es viable en navegador + Firebase: la app escribe en el espejo público una marca (`pausadoHasta`, `extraMin`) y la web pública la lee. No hace falta servidor, porque la caducidad se compara con la hora.
- Con aceptación manual, el aviso tiene que ser persistente (sonido en bucle + parpadeo) hasta actuar. Sin servidor, «qué pasa si nadie acepta» solo lo puede resolver una tablet abierta, o la web pública mirando la edad de la solicitud (p. ej. «el restaurante no ha respondido en X min»). Si ninguna tablet está abierta, nada puede auto-cancelar ni avisar por SMS. Límite claro de la arquitectura.
- Avisar del desajuste de reloj de la tablet (lección de Otter) es barato: comparar con `serverTimeOffset` de Firebase (`.info/serverTimeOffset`).
- Restricción de los navegadores: el sonido necesita una interacción previa del usuario (política de autoplay), y una pestaña en segundo plano puede ralentizarse. Conviene un «activar sonido» al empezar el turno y la Wake Lock API para que la tablet no se duerma (es una inferencia técnica, no viene de fuentes del sector).

### Gaps
- No pude verificar cómo implementan la pausa, el modo ocupado y el auto-accept Flipdish, ChowNow, Lightspeed (salvo vía Deliverect), Revo y Qamarero. No los busqué en profundidad por límite de consultas.
- No hay datos sobre qué porcentaje de pedidos se pierde con la aceptación manual.

## 2. Capacidad de cocina: limitar pedidos por franja y tiempos de preparación que se adaptan a la carga

### Takeaway
Hay tres familias:
1. **Tope por franja** (pedidos o artículos cada 15 o 30 min). Al llenarse la franja, desaparece de la web y el pedido «lo antes posible» se empuja a la siguiente libre.
2. **Capacidad «en curso»**: Olo reserva capacidad durante todo el tiempo de preparación de cada pedido.
3. **Tiempo de espera que se ajusta**: según el importe del pedido, manual, o por IA (SmartQuote de Toast).

Que el cliente vea una hora más tarde en lugar de un error es la buena práctica.

### Cited Findings
- Toast tiene cuatro estrategias de tiempo prometido:
  - **SmartQuote**: IA, en lanzamiento limitado. Solo para Toast Online Ordering, Toast Local y Order with Google. No sirve para TPV, kiosco ni terceros.
  - **Manual**: tiempo fijo para recogida y reparto propio. Vale también para los pedidos por teléfono.
  - **Kitchen capacity**: tiempo base más tope de pedidos **o** de artículos por intervalo de 15 min, igual para todos los intervalos.
  - **Order price**: suma minutos según el total del pedido. Se acumulan sobre la base.

  — [Toast: Manage Your Quote Time Strategy](https://support.toasttab.com/en/article/Managing-Your-Quote-Time-Strategy)
- Detalles de «Kitchen capacity» en Toast:
  - Solo cuentan los artículos que van a cocina.
  - Un pedido cuenta en cuanto se hace, aunque no esté aprobado.
  - Si la franja está llena, las franjas futuras desaparecen del desplegable online y el «lo antes posible» se ajusta según la disponibilidad.
  - En el TPV sale un aviso con la franja libre más cercana, pero no bloquea el pedido.

  — [Toast, ídem](https://support.toasttab.com/en/article/Managing-Your-Quote-Time-Strategy)
- Toast, cuando cambia el tiempo prometido durante el pago:
  - Menos de 3 min: el pedido sigue normal.
  - Entre 3 y 10 min (pedido «lo antes posible»): sigue, con la hora actualizada en la confirmación.
  - 10 min o más: se retiene y se pregunta al cliente si acepta la hora nueva.

  — [Toast, ídem](https://support.toasttab.com/en/article/Managing-Your-Quote-Time-Strategy)
- Toast, pedidos «lo antes posible» limitados por capacidad. Ajuste «Immediately fire throttled ASAP orders»:
  - **No** (por defecto): se retiene hasta que pasa el retraso. Ejemplo: pedido a las 17:00, espera 45 min y preparación 30 → se manda a cocina a las 17:45 y se promete a las 18:15.
  - **Sí**: se manda a cocina al momento y el retraso se suma a la preparación.

  — [Toast: Firing Toast online orders](https://doc.toasttab.com/doc/platformguide/adminFiringToastOnlineOrders.html)
- En Toast, los tiempos de espera no afectan a DoorDash, Grubhub ni Uber Eats. El foro de desarrolladores dice que la limitación no entra en el tiempo de preparación de la API, lo que contradice en parte el texto de ayuda — [Toast dev forum](https://developers.toasttab.com/hc/en-us/community/posts/4419502349332-Order-Type-Prep-Times-Throttling)
- Olo:
  - La lógica nueva de capacidad «en curso» reserva capacidad durante todo el tiempo de preparación de cada pedido, en lugar de las antiguas ventanas de 15 min.
  - Hay un límite de pedidos en curso a la vez, que funciona de forma continua.
  - El «ASAP Throttling» evita mostrar un error y lleva al cliente a una hora posterior.
  - Olo no sabe cuándo termina un pedido ni cuenta los pedidos de sala, así que los límites deben reflejar solo la capacidad para pedidos online.
  - No hay informe de qué pedidos se limitaron.

  Viene de un resumen del buscador; la página original devolvió 403 — [Olo ASAP Order Throttling](https://olosupport.zendesk.com/hc/en-us/articles/360051887552-ASAP-Order-Throttling); [Olo support](https://olosupport.zendesk.com/hc/en-us/articles/13294124769179)
- Last.app pone un máximo de pedidos por franja de 30 min y deja elegir qué pasa al llegar: cerrar el takeaway o cerrar el delivery — [Last.app Delivery: Order Limits](https://help.last.app/portal/en/kb/articles/delivery)
- Last.app imprime con antelación los pedidos programados — [Last.app Scheduled Order Printing in Advance](https://help.last.app/portal/en/kb/articles/delivery-scheduled-order-printing-in-advance)
- Concepto general: limitar pedidos por ventana de tiempo para ajustar la demanda digital a la capacidad física, por pedido o por artículo; si una franja se llena, el pedido pasa a la siguiente — [ItsaCheckmate: Order Throttling](https://support.itsacheckmate.com/hc/en-us/articles/19166627767195-Order-Throttling); [QSR Automations](https://de.qsrautomations.com/blog/kitchen-automation/restaurant-order-throttling/)
- En la comunidad de Square hay hilos de comerciantes preguntando cómo limitar por capacidad de cocina, señal de que Square no lo resuelve bien — [Square Community](https://community.squareup.com/t5/Food-Beverage/How-is-everyone-dealing-with-order-throttling-kitchen-capacities/m-p/802443)

### Inferences
- Viable en GastroGoan sin servidor:
  - **Tope por franja** de 15 min, por pedidos o por artículos de cocina. La web pública ya reserva aforo de forma atómica con transacciones de Firebase (`aforoHold`); un `pedidosHold` por franja ya existe en las reglas (0–500).
  - **Tiempo por importe o tamaño** (calculado en la web).
  - **Modo ocupado** (+N min).
- Un tiempo «dinámico» de verdad (carga real de cocina) también es viable: la app conoce las comandas abiertas y puede publicar en el espejo un `cargaCocinaMin` cada X min, que la web lee. Sin tablet abierta el valor se queda viejo, así que hace falta caducidad.
- Lo recomendable, como Olo y Toast: nunca dar error. Si la franja está llena, ofrecer la siguiente libre, y si el tiempo cambia más de 10 min, preguntar al cliente.
- Que los pedidos de sala cuenten o no en la capacidad es una decisión de producto. Olo no los cuenta; GastroGoan sí podría, porque el TPV es suyo.

### Gaps
- No confirmé las implementaciones concretas de ChowNow, Flipdish, Lightspeed (propio), Otter (capacidad) ni Revo/Qamarero.
- No encontré valores de tope recomendados (por ejemplo, pedidos por 15 min según el tamaño de la cocina).

## 3. KDS para pedidos para llevar: lanzar los programados a su hora, temporizadores, estaciones, colores, despachar/recuperar, pase, lista de empaquetado y etiquetas

### Takeaway
Lo estándar:
- Los pedidos programados aparecen en el KDS a la hora de entrega menos el tiempo de preparación.
- Los platos se escalonan según su propio tiempo de preparación, para que todo termine a la vez.
- Temporizadores con umbrales amarillo y rojo configurables.
- Pantallas de preparación y de pase («expo»): despachar en el pase completa en todas las pantallas.
- Pantallas que filtran por canal.

Una queja repetida: los colores cuentan desde que el ticket llegó a la pantalla, no desde la hora de recogida. No encontré una función de «lista de empaquetado» documentada en los KDS revisados.

### Cited Findings
- Square, pedidos programados: un «Square Champion» de la comunidad explica que no deben salir en el KDS hasta que haga falta, es decir, la hora de entrega menos la preparación (preparación de 30 min y recogida a las 9 → aparece a las 8:30). Los pedidos «lo antes posible» salen al momento — [Square Community](https://sellercommunity.com/t5/Square-Online/When-are-online-and-in-person-orders-displayed-to-my-kitchen-on/m-p/203864)
- Square, «staggered item prep times»: los artículos de un ticket aparecen en el KDS en momentos escalonados según su tiempo de preparación. Hay que tenerlo en el catálogo, se activa por aparato y no se sincroniza entre aparatos — [Square: Get started with Square KDS](https://squareup.com/help/us/en/article/7944-get-started-with-square-kds-android); [Square: prioritize orders](https://squareup.com/help/ie/en/article/8168-prioritize-orders-with-square-kds)
- Square, colores y pantallas:
  - Temporizadores amarillo y rojo configurables (Timers & Alerts).
  - Color de texto por modificador, visible en preparación y en pase.
  - En el pase, completar o recuperar un ticket o artículo lo completa o recupera en todas las pantallas del local.
  - Una pantalla de preparación puede completar solo en sí misma.

  — [Square KDS](https://squareup.com/help/us/en/article/7944)
- Quejas de usuarios de Square, en publicaciones de la comunidad, no guía oficial:
  - Los temporizadores se ponen amarillos y rojos demasiado pronto porque cuentan desde que el ticket llegó a la pantalla, no desde la hora de recogida.
  - Una panadería con productos de 48 h de preparación ve el KDS de pase atascado con pedidos anticipados.
  - El apaño de mostrarlos solo al marcarlos «en curso» hace que el personal deje de usar el KDS.
  - Tickets que se imprimen a destiempo.

  — [Square Community: Improvements to Square KDS and pickup times](https://community.squareup.com/t5/Hardware-Setup-Troubleshooting/Improvements-to-Square-KDS-and-pickup-times/td-p/279705); [Square KDS and Lengthy Prep Times](https://sellercommunity.com/t5/Square-for-Restaurants/Square-KDS-and-Lengthy-Prep-Times/m-p/296164)
- Toast: cuando todos los tickets de un pedido se completan en el KDS del pase, el pedido puede marcarse solo como «Order Ready» en Orders Hub. Eso alimenta el tablero de cliente y los mensajes al cliente — [Toast: Marking KDS-fulfilled orders as Order Ready](https://doc.toasttab.com/doc/platformguide/platformMarkingKDSOrdersAsOrderReady.html)
- Fresh KDS:
  - «Takeout View»: pantalla dedicada a pedidos para llevar, con estado en tiempo real, horas de recogida y avisos «I'm Here» cuando llega el cliente.
  - Cada pantalla elige de qué canales recibe pedidos.

  — [ROLLER directory: Fresh KDS](https://www.roller.software/integrations/partner/fresh-kds); [Arryved: FreshKDS integration](https://support.arryved.com/portal/en/kb/articles/freshkds-integration-overview)
- Last.app KDS: los pedidos aparecen en cuanto se toman, con temporizadores de urgencia por color, y desde la cocina se puede marcar un producto como no disponible — [Last.app KDS](https://www.last.app/en/product/kds-for-restaurants)
- Qamarero KDS: «tiempo transcurrido configurable» — [Qamarero KDS](https://qamarero.com/pantalla-cocina-kds-restaurantes/)
- Un KDS de otro fabricante (Bank of America Merchant) dice que un ticket despachado en el pase no se puede recuperar. No es universal: Square sí permite recuperar desde el pase — [BofA KDS](https://merchanthelp.bankofamerica.com/Kitchen-Display-Order-Management-Point-of-Sale-Solution)

### Inferences
- Para GastroGoan (Comandas Cocina ya tiene vales, rondas, pase y modo caos), lo que aporta más valor y es viable en el cliente:
  1. **Lanzar los programados a su hora**: un pedido con hora de recogida aparece en cocina en `horaRecogida − preparación − margen`. Hasta entonces queda en una lista de «Programados» que se ve pero no cuenta. Lo calcula cualquier tablet con el reloj local, sin servidor.
  2. **Colores contra la hora prometida**, no contra la de entrada. Es justo la queja de Square: verde con margen, ámbar a menos de 5 min de la hora prometida, rojo pasada. Para el «lo antes posible», contra la hora prometida.
  3. **Escalonar platos** por su tiempo de preparación, si la ficha técnica tiene minutos. Las fichas ya llevan `min` por paso, así que se puede derivar.
  4. **Filtro por canal** en la pantalla de pase (Sala / Llevar / Domicilio).
- La lista de empaquetado no aparece como función de ningún KDS revisado. Es un hueco del mercado y un diferenciador posible (ver sección 5).
- Etiquetas o pegatinas: no encontré documentación concreta. En navegador, imprimir etiquetas con iframe + `@page` (ya existe el modo navegador/AirPrint 58/80 mm) es viable.

### Gaps
- No encontré documentación oficial de Toast sobre el lanzamiento de pedidos programados (la página remitía a «Settings for scheduled orders», que no abrí).
- No verifiqué impresión de etiquetas por artículo (como Toast con impresoras de etiquetas) ni que algún KDS tenga una casilla de empaquetado.

## 4. Pantalla de estado para el cliente, estanterías o taquillas, aviso de «listo» y clientes que no recogen

### Takeaway
Toast tiene un **Order Ready Board** que funciona en un navegador (TV o monitor). Tiene columnas «En preparación» y «Listo», y se alimenta de despachar en el KDS del pase; se configura la hora estimada y cuántos minutos se queda visible lo listo. El aviso por SMS al cliente es habitual. Para los clientes que no recogen no hay una norma del sector: cada local fija la suya.

### Cited Findings
- Toast Order Ready Board:
  - Muestra los pedidos «In Progress» y «Ready».
  - Se puede enseñar la hora estimada de los que están en preparación y fijar cuántos minutos se quedan a la vista los listos.
  - Quitar un pedido del tablero no cambia su estado.
  - Funciona en un navegador en `toasttab.com/order-display` (stick PC, smart TV o monitor; recomiendan Edge).

  — [Toast: Order Ready Board Overview & Configuration](https://support.toasttab.com/en/article/Order-Ready-Board-Overview-Configuration)
- Toast puede avisar por texto al cliente o al dispositivo del camarero cuando el pedido está listo — [Toast KDS](https://pos.toasttab.com/restaurant-pos/kitchen-display-system)
- Fresh KDS manda un SMS automático al cliente cuando su pedido está listo y tiene avisos «I'm Here» al llegar — [ROLLER: Fresh KDS](https://www.roller.software/integrations/partner/fresh-kds)
- Clientes que no recogen:
  - No hay plazo estándar.
  - Hay informes de pedidos que acaban en la basura por no recogerse.
  - En apps tipo Ritual se pide al cliente que avise para no preparar.
  - Toast tiene un artículo sobre un botón de «No-Show Discount» para registrar los no recogidos.

  — [The Daily Meal](https://www.thedailymeal.com/eat/what-do-restaurants-do-when-takeout-orders-aren-t-picked); [Dallas Observer](https://www.dallasobserver.com/food-drink/wasted-restaurants-deal-with-customers-not-picking-up-their-call-in-orders-13010467/); [Ritual help](https://help.ritual.co/hc/en-au/articles/115005422243-I-left-without-picking-up-my-order); [Toast No-Show Discount](https://support.toasttab.com/en/article/No-Show-Discount)

### Inferences
- **El tablero de cliente es muy viable en GastroGoan**: es otra página (o una vista de `reservagastrogoan.html`) que lee del espejo público, en la nube del negocio, los pedidos del día con su estado. Debe mostrar solo el número o las iniciales, nunca nombre y teléfono, por la RGPD y porque `public/...` se puede leer.
  - Coste: cada TV abierta es una conexión simultánea de Firebase. En la nube de cada negocio no afecta a la regla de los 5.000 clientes.
  - Mejor que la TV pregunte por REST cada pocos segundos, o use un listener sobre un nodo mínimo.
- El aviso de «listo» sin servidor no puede ser SMS (cuesta por mensaje y requiere servidor). Alternativas sin coste:
  1. La página de seguimiento del pedido que ya existe cambia a «¡Listo!» con sonido y vibración si el cliente la tiene abierta.
  2. Botón de WhatsApp con mensaje prellenado (`whatsappDeTelefono`), que pulsa el empleado.
  3. Web Push: requiere un servidor que envíe, así que se descarta salvo un Worker gratuito.
- Clientes que no recogen: registrar el estado «no recogido» con la hora, contarlo en la ficha del cliente (ya hay `No-shows` en Clientes) y sacar un aviso «lleva X min listo sin recoger» a partir de un umbral configurable.

### Gaps
- No encontré documentación de taquillas o estanterías inteligentes con fuentes verificables (Minnow, Apex, Cubbypod…). No se buscó por límite de consultas.
- No hay datos sobre el tiempo medio de espera antes de desechar un pedido.

## 5. Precisión del pedido: comprobación de bolsa, foto, bolsa precintada y envases

### Takeaway
Las buenas prácticas son de proceso:
- Comprobar cada bolsa contra el ticket: artículos, cantidades, modificaciones y extras como salsas, bebidas y cubiertos.
- Una segunda persona revisa los pedidos grandes o con alérgenos.
- Etiqueta con nombre, número y «bolsa 1 de 3».
- Medir los artículos que faltan y los reembolsos por canal y turno.

Bebidas, salsas y guarniciones son los olvidos típicos. Deliverect y Otter miden los errores a partir de las reclamaciones de las plataformas.

### Cited Findings
- Comprobación final de la plantilla de Manifestly:
  - Cada bolsa lleva el número de pedido, el nombre, el canal y las instrucciones.
  - El contenido coincide con cada artículo, cantidad, modificación y accesorio del ticket.
  - Segunda comprobación independiente en pedidos grandes, modificados o con alérgenos.

  — [Manifestly: Takeout and Delivery Service Checklist](https://app.manifest.ly/public/checklists/takeout-and-delivery-service-checklist); [Manifestly: Order Accuracy Checklist](https://app.manifest.ly/public/checklists/order-accuracy-checklist)
- Etiquetar la bolsa con nombre, número y «Bolsa 1 de 3» evita confusiones; la bebida se olvida con facilidad — [Clover: How to improve order accuracy](https://blog.clover.com/how-to-improve-order-accuracy-in-your-restaurant); [GloriaFood](https://www.gloriafood.com/how-to-improve-order-accuracy-in-restaurant)
- El TPV registra lo pedido pero no si llegó a la bolsa: conviene medir la tasa de artículos que faltan y de reembolsos por canal y turno — [Plainsight](https://plainsight.ai/blog/why-restaurant-order-errors-disappear-before-they-reach-the-dashboard) (fabricante de visión artificial: interés comercial)
- Deliverect:
  - Informe de reembolsos: pedidos, importe y parte pagada por el restaurante, con mapa de calor horario.
  - «Reclaim» detecta artículos que se reclaman una y otra vez y separa el error de cocina del de la entrega.
  - «Operation quality» da el % de pedidos inexactos.

  — [Deliverect: View refund reasons](https://help.deliverect.com/en/articles/7978960-view-refund-reasons); [Deliverect Reclaim operation quality](https://help.deliverect.com/en/articles/15595828-reclaim-operation-quality)
- Otter (cifra del propio fabricante, sin verificar): los errores y el fraude se comen entre el 5 y el 7 % de los ingresos de delivery al año — [Otter: State of restaurant delivery errors & fraud 2026](https://www.tryotter.com/resource/guides/the-state-of-restaurant-delivery-errors-fraud-2026)

### Inferences
- Un diferenciador viable y barato para GastroGoan es una **lista de empaquetado en la pantalla**. Al pasar un pedido a «Listo», el empleado marca cada línea y los extras de la ficha (salsas, cubiertos, bebida), y no se puede marcar «Entregado» sin completarla. Opcional en los pedidos con alergias.
- **Foto de la bolsa** con la cámara de la tablet (`<input capture>`). Viable, pero guardar fotos en Firebase gratuito pesa (límite de 1 GB en Realtime Database). Mejor una miniatura comprimida y borrarla a los 30 días, o no subirla y guardarla solo en la tablet.
- **Etiqueta de bolsa** imprimible (nº, nombre, canal, bolsa X de N, alérgenos) en el rollo de 58/80 mm, con la impresión que ya existe.
- **Precinto** de bolsa: es material, no software. Basta con recordarlo en la lista.

### Gaps
- No encontré estudios independientes (no de fabricantes) sobre cuánto reducen los errores las listas de comprobación o los tableros.
- Envases: no investigado (sin fuentes).

## 6. Incidencias: reembolsos, rehacer, contactar al cliente y registro

### Takeaway
Las herramientas líderes registran las incidencias **por tipo** (falta un artículo, pedido equivocado, frío, tarde) y por hora y día, y separan el coste que asume el restaurante. Rehacer y reembolsar se registran como movimientos ligados al pedido.

### Cited Findings
- Otter Advanced Analytics:
  - Tasa y tipo de incidencias de pedido, y en qué horas y días hay más.
  - Cada pedido lleva canal, comisiones, propinas, método de pago, incidencias, valoraciones, tiempo de preparación y tiempo de entrega.
  - Desde 20 $/mes por local sin paquete.

  — [Otter Analytics guide](https://helpdesk.tryotter.com/hc/en-us/articles/12558297776147-Otter-Insights)
- Deliverect: informe de reembolsos con la parte que pagó el restaurante y mapa de calor — [Deliverect](https://help.deliverect.com/en/articles/7978960-view-refund-reasons)
- Last.app: los pedidos no se pueden cancelar desde Last.app en Just Eat — [Last.app Integrations: Just Eat](https://desk.last.app/portal/en/kb/articles/integrations-just-eat)
- Otter, informe de cancelaciones: más cancelaciones de pedidos para llevar en la última hora de servicio — [Otter delivery cancellation report 2024](https://tryotter.com/blog/case-study/otter-delivery-cancellation-report-2024); [Perishable News](https://perishablenews.com/?p=197043)

### Inferences
- GastroGoan ya tiene «incidencias» en el TPV y Comandas, y anulación con rectificativa. Para pedidos para llevar y a domicilio faltaría:
  - Un **motivo tipificado** (faltó algo, equivocado, tarde, frío, cliente no vino).
  - Una **acción**: rehacer (nueva comanda ligada, coste a merma), reembolso parcial o total (rectificativa) o vale de cortesía (ya existe el vale regalo).
  - **Contactar** por WhatsApp con un mensaje prellenado.

  Todo local, sin servidor. Un reembolso con tarjeta (Stripe) requiere el Worker: la devolución desde el panel de Stripe del propio negocio es la vía sin coste.

### Gaps
- No revisé cómo resuelven Toast o Square el flujo de rehacer (si genera un ticket a coste cero, etc.).

## 7. Analítica de pedidos para llevar y a domicilio

### Takeaway
Las métricas habituales:
- Tiempo de preparación medio por canal.
- Del pedido al «listo» y del «listo» a la recogida.
- Pedidos perdidos (caducados sin aceptar).
- % de pedidos inexactos y reembolsos.
- Cancelaciones.
- Valoraciones.
- Horas y días con más incidencias.

Qamarero (España) mide el tiempo medio del KDS y lo desglosa por canal.

### Cited Findings
- Qamarero, pestaña KDS de Analíticas:
  - Comandas completadas, tiempo medio hasta «listo» y desglose y tiempo medio por canal (Sala/Autoservicio, Pickup/Delivery propio, plataformas externas).
  - Sin desglose por producto.
  - Hay una incoherencia: no está claro si el cronómetro empieza al entrar el pedido o al llegar al KDS.
  - Solo hay datos si se marcan las comandas como completadas en el KDS.

  — [Qamarero: Analíticas, pestaña de KDS](https://intercom.help/qamarero-9e4c4f5026e3/es/articles/13995213-analiticas-pestana-de-kds)
- Otter: «Missed Orders» (caducan sin aceptar), «Order Issues» (faltan artículos o están mal), tiempo de preparación y de entrega por pedido, e incidencias por hora y día — [Otter Dashboard Guide](https://helpdesk.tryotter.com/hc/en-us/articles/27245439440147-Otter-Dashboard-Guide); [Otter Analytics](https://helpdesk.tryotter.com/hc/en-us/articles/12558297776147-Otter-Insights)
- Deliverect: % de pedidos inexactos y reembolsos. No vi un indicador de pedidos tarde — [Deliverect operation quality](https://help.deliverect.com/en/articles/15595828-reclaim-operation-quality)
- Olo no ofrece informes de qué pedidos se limitaron — [Olo](https://olosupport.zendesk.com/hc/en-us/articles/360051887552-ASAP-Order-Throttling)

### Inferences
- Todo es calculable en el cliente si se guardan marcas de tiempo por pedido: `creado`, `aceptado`, `lanzado a cocina`, `listo`, `recogido/entregado` y `prometido`.
  - **% tarde** = listo > prometido.
  - **Del listo a la recogida** = recogido − listo, que sirve para detectar clientes que llegan tarde y comida que se enfría.
  - **Por canal, hora y plato.**

  Se puede pintar con `dashSerieHtml` del Panel. La lección de Qamarero es que sin marcar «listo» en la cocina no hay datos: el gesto de despachar tiene que ser obligatorio y fácil (en GastroGoan el bloque ya es el botón).

### Gaps
- Las valoraciones de clientes en el canal propio: GastroGoan tiene NPS en la web, pero no investigué cómo lo cruzan otros con el pedido.

## 8. Lo que piden o critican los restauradores

### Takeaway
La queja dominante es el **«infierno de tablets»**: una tablet por plataforma, volver a teclear pedidos en el TPV, pedidos aceptados en una y olvidados en otra. Hay quejas concretas de KDS: colores que cuentan desde la llegada y no desde la recogida, y pedidos anticipados que atascan la pantalla. También peticiones como «pausar solo al llegar a N pedidos». Casi todas las fuentes son de fabricantes; no conseguí hilos de Reddit ni de foros españoles.

### Cited Findings
- «Tablet hell»: separar apps, logins y tablets. Con 4 plataformas son 4 tablets más el TPV — [Toast blog: tablet hell](https://pos.toasttab.com/uk/blog/on-the-line/tablet-hell-in-restaurants); [ChowNow: juggling multiple tablets](https://get.chownow.com/blog/why-juggling-multiple-tablets-is-costly/)
- Volver a teclear a mano los pedidos de las plataformas en el TPV retrasa la cocina. En plena hora punta, un pedido aceptado en una tablet se pierde en otra — [ChowNow: operational problems](https://get.chownow.com/blog/operational-problems-in-restaurants/); [CBS Northstar](https://cbsnorthstar.com/third-party-delivery-tablets/)
- Toast matiza que juntar todo en el KDS no reduce las plataformas, solo cuántas veces se toca cada pedido — [Toast blog](https://pos.toasttab.com/uk/blog/on-the-line/tablet-hell-in-restaurants)
- Square KDS: temporizadores «demasiado pronto», atasco con pedidos anticipados e impresión a destiempo (usuarios de la comunidad) — [Square Community](https://community.squareup.com/t5/Hardware-Setup-Troubleshooting/Improvements-to-Square-KDS-and-pickup-times/td-p/279705)
- Square: petición de pausar al llegar a N pedidos en un periodo — [Square Community feature request](https://community.squareup.com/t5/Feature-Requests/Feature-request-Pause-Online-Orders-if-Certain-Number-of-Orders/idi-p/804238/page/2); y de más opciones de «busy» — [Square Community](https://community.squareup.com/t5/Feature-Requests/Please-allow-more-options-for-online-orders-like-having-a-busy/idi-p/836668)
- Otter y Deliverect publican las «pain points» del delivery desde su punto de vista comercial — [Otter: 5 delivery pain points](https://tryotter.com/blog/toolkit/5-delivery-pain-points-every-restaurant-faces-and-how-to-fix-them); [Deliverect: 8 challenges](https://www.deliverect.com/en/blog/online-food-delivery/8-challenges-that-delivery-restaurants-face-and-how-to-solve-them)

### Inferences
- GastroGoan parte con ventaja en el «infierno de tablets» para el canal propio: la web propia entra directo en el TPV y la cocina. No integra Glovo ni Uber Eats (requeriría un agregador de pago o un servidor), así que para esas plataformas seguirá habiendo tablet aparte. Conviene decirlo con claridad en la venta.
- Las quejas de Square apuntan a dos mejoras de bajo coste ya mencionadas: colores contra la hora prometida y no mostrar los programados hasta su momento, con una lista aparte.

### Gaps
- Faltan reseñas de Capterra/G2 y opiniones de foros españoles de hostelería (no aparecieron en las búsquedas). Faltan Revo, Flipdish, ChowNow y Lightspeed (sus propias funciones). Una segunda ronda debería buscar «Revo XEF KDS delivery», «Flipdish busy mode», «ChowNow order throttling» y reseñas «G2 Toast KDS cons».
