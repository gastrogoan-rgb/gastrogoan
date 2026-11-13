# Mejores prácticas de UX para el consumidor en delivery y take away (qué hacen los líderes)

> Notas de investigación (13/11/2026). Foco 2022-2026. Al final de cada bloque se marca qué es aplicable a una **web propia del restaurante** (sin agregador), **en navegador** (sin app nativa) y **con Stripe**, que es el caso de `reservagastrogoan.html`.
> Advertencia general: mucha información de proveedores (Flipdish, Toast, vendedores de IA de voz) es marketing propio; se indica cuando lo es. Se hicieron ~15 consultas; varios temas pedidos (Starbucks, Five Guys, Glovo, Deliveroo, Just Eat, Telepizza, ChowNow, Slice, Square, Lightspeed, accesibilidad) quedaron sin fuente propia y van en «Gaps».

## Seguimiento del pedido en tiempo real (fases, mapa, ETA, retrasos)

### Takeaway
El referente sigue siendo el Domino's Tracker, que en marzo de 2026 se SIMPLIFICÓ a cuatro fases («placed», «make», «deliver/pickup», «mmm!»), quitó la fase de «control de calidad» y ahora calcula la hora estimada con IA alimentada por lo que marca el personal en tienda; lo valioso no es el número de fases sino que cada fase la dispare un hecho real de cocina y que el ETA sea creíble.

### Cited Findings
- El Tracker original (2008) tenía cinco fases: Pedido realizado, Preparación, Horno, Control de calidad y En reparto — [Verdict Foodservice / búsqueda](https://www.verdictfoodservice.com/newsletters/dominos-pizza-refreshes-tracker); [Domino's NZ](https://www.dominos.co.nz/inside-dominos/technology/pizza-tracker)
- Actualización de marzo de 2026: motor de seguimiento con IA sobre la plataforma DomOS que combina las entradas en tiempo real del equipo con aprendizaje automático para estimar la hora de entrega y de recogida; se elimina la fase de control de calidad; las fases pasan a «placed», «make», «deliver» o «pickup», y «mmm» — [Restaurant Dive, 25/03/2026](https://www.restaurantdive.com/news/dominos-tracker-update-artificial-intelligence-real-time-order-status/815556/)
- El cliente ve: hora de realización del pedido y de entrada al horno, cuándo salió el repartidor, un registro paso a paso, datos de la tienda y GPS del repartidor; en iOS, «Live Activities» con estado y ubicación del repartidor en la pantalla de bloqueo — [Restaurant Dive](https://www.restaurantdive.com/news/dominos-tracker-update-artificial-intelligence-real-time-order-status/815556/)
- Domino's dice haber seguido más de 2.500 millones de pedidos con el Tracker; prueba en seis tiendas un «smart dispatch» que retiene pedidos que el repartidor no podrá recoger a tiempo — [Restaurant Dive](https://www.restaurantdive.com/news/dominos-tracker-update-artificial-intelligence-real-time-order-status/815556/)
- Crítica: el Tracker es una serie de hitos, no un directo; según un artículo de consumo, en versiones antiguas el estado «entregado» se disparaba cuando el repartidor salía de la tienda — fuente de baja calidad, citada en búsqueda ([gethuman](https://gethuman.com/customer-service/Domino-s-Pizza/how/How-Do-I-Track-My-Domino-s-Pizza-Order/fu6)); tratar como anecdótico.
- Gestión de retrasos (DoorDash, programa VIP en EE. UU.): si el pedido llega 10 minutos o más tarde que el FINAL de la ventana mostrada en el pago, se da automáticamente un crédito de 10 $ «como disculpa» — [DoorDash Help, VIP Delivery Terms](https://help.doordash.com/en-us/consumers/article/vip-delivery-terms-and-conditions); en AU/NZ es una «on-time guarantee» de DashPass VIP — [DoorDash AU](https://help.doordash.com/en-au/consumers/article/dashpass-vip-terms-and-conditions)
- Fuera de esos programas, DoorDash no publica que «tarde = reembolso»; la hora del pago es una estimación — [Financial Panther (secundaria)](https://financialpanther.com/doordash-late-delivery-policy/)
- Baymard (benchmark 2026): los tiempos de entrega y la propina se muestran «sin el detalle que el usuario necesita para comprometerse con el pedido» — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)

### Inferences
- Para una web propia: mostrar el ETA como **ventana** («21:10–21:25») y no como un minuto exacto, porque la promesa se mide contra el final de la ventana (así lo hace DoorDash).
- Las fases deben ser pocas (3-4) y cada una disparada por algo que el personal ya hace en el TPV/Comandas (aceptar, «listo en el pase», «sale el repartidor», «entregado»). GastroGoan ya tiene esos eventos en Comandas Cocina y Control de repartos: pueden alimentar la web sin coste.
- GPS del repartidor en vivo exige app/permisos de geolocalización continua del repartidor; en una web es posible (el móvil del repartidor abierto en una página) pero cuesta batería y tráfico. Alternativa barata: «salió a las 21:12, llegada estimada 21:25».
- Retraso proactivo: si la hora estimada se supera, cambiar el texto («Vamos con X min de retraso») antes de que el cliente pregunte; una compensación automática (cupón para el próximo pedido) es replicable sin coste por cliente.
- Live Activities requieren app nativa: no aplica a una web.

### Gaps
- No se encontró cómo calcula exactamente Uber Eats/Glovo/Deliveroo el ETA (fuentes oficiales no consultadas).
- No se encontró dato independiente sobre la precisión del nuevo motor de Domino's.

## Notificaciones (SMS, WhatsApp, push, email; «tu pedido está listo»; aviso de llegada)

### Takeaway
Los líderes envían pocos avisos y en los momentos clave (confirmado, listo para recoger, en camino, entregado); el «está listo» para recogida es el más valorado y Toast lo limita a UN mensaje (otro solo si el pedido cambia).

### Cited Findings
- Toast «Order Ready Messaging»: texto al cliente cuando el pedido está listo; se activa por Takeout, Curbside o ambos; mensaje personalizable; se envía un solo texto, salvo que el pedido se actualice o reabra — [Toast, Configuring order ready messaging](https://doc.toasttab.com/doc/platformguide/platformConfiguringOrderReadyMessaging.html); [Toast Support, Orders Hub](https://support.toasttab.com/en/article/Order-Ready-Text-Messaging-from-the-Orders-Hub)
- Toast permite un SMS cuando el pedido se marca «cumplido» y guarda el teléfono en la cuenta de pedidos online para futuros avisos — [Toast, Send Text Message When Order is Fulfilled](https://support.toasttab.com/article/Send-Text-Message-when-Order-is-Fulfilled-1492800294544)
- Curbside en Toast: «avisos de llegada» que envían instrucciones por SMS y dan al cliente una forma sin contacto de indicar que ha llegado — [Toast, Set Up Curbside Pickup](https://support.toasttab.com/article/Setting-Up-Curbside-Pickup-for-Online-Orders)
- Domino's ofrece pedir/seguir por WhatsApp, Messenger y SMS; KFC India usa WhatsApp para ver la carta y pedir sin descargar app — [ChatMaxima (blog de proveedor de chatbots)](https://chatmaxima.com/blog/how-restaurants-use-ai-chatbots-2026/)

### Inferences
- **Regla de la casa de GastroGoan: nada que cueste por cliente.** SMS y la API de WhatsApp Business cuestan por mensaje: descartados como canal automático pagado por GastroGoan. Alternativas sin coste: (1) la página de seguimiento en vivo (ya existe) con **notificaciones del navegador** (Web Push sin servidor no es posible; pero la Notification API funciona mientras la pestaña esté abierta) y cambio de título/favicon de la pestaña («✅ Listo»); (2) sonido/vibración en la página abierta; (3) botón «Avisarme por WhatsApp» que abre `wa.me` del NEGOCIO con el número de pedido (el cliente escribe, el negocio contesta desde su WhatsApp). (4) Email solo si el negocio lo envía desde su cuenta.
- Para recogida, el aviso clave es «Listo para recoger» con el lugar exacto (mostrador, estantería, puerta lateral).

### Gaps
- No se encontraron datos sobre tasas de apertura/eficacia por canal (SMS vs push vs WhatsApp) de fuentes fiables.
- Mejores prácticas de Uber Eats/Just Eat sobre frecuencia de notificaciones: no consultadas.

## Repetir pedido, favoritos, direcciones, invitado, pago en un toque, Apple/Google Pay, Bizum, propinas, códigos promocionales

### Takeaway
Según Baymard 2026, repetir pedido es una de las tareas más frecuentes y ninguno de los 8 líderes lo resuelve bien: falta acceso a pedidos anteriores desde la portada y los historiales son pobres. Es la mejor oportunidad para una web propia. En España, Bizum ya está disponible en Stripe.

### Cited Findings
- Baymard 2026 (8 apps/webs: Just Eat, KFC, Uber Eats, Domino's, DoorDash, McDonald's, Deliveroo, Burger King; 390+ parámetros, 3.100+ puntuaciones): UX global entre «pobre» y «mediocre», ninguno llega a «decente». Repetir pedido infra-soportado: sin ruta a pedidos anteriores desde la portada y historiales demasiado escuetos para encontrar uno — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)
- Baymard recomienda permitir añadir «compras anteriores» al carrito desde la portada — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)
- Ediciones anteriores del benchmark: 2022 y 2024 (8 sitios, 400+ parámetros) — [Baymard 2024](https://baymard.com/blog/food-delivery-and-takeout-2024-benchmark); [Baymard 2022](https://baymard.com/blog/benchmark-takeout-food-delivery)
- Flipdish (marketing propio) destaca en su app de marca el «reorder con un clic» y checkout fácil con estado del pedido — [Flipdish](https://www.flipdish.com/branded-app)
- Bizum en Stripe: método de pago en tiempo real en España; solo clientes en España y EUR; admite reembolsos y disputas; se activa desde el Dashboard; Stripe lo ofrece a través de Open Bank S.A. (Santander) — [Stripe Docs, Bizum](https://docs.stripe.com/payments/bizum)
- Stripe (dato de marketing): de enero a septiembre de 2025, 18.600 negocios de e-commerce activaron Bizum; el 38 % de los clientes en España prefiere pagar con Bizum; límite citado de 5.000 € por operación vía Stripe (redacción ambigua) — [Stripe, Bizum for businesses in Spain](https://stripe.com/resources/more/bizum-for-buisinesses-spain)
- Contradicción: un blog de MONEI afirma que Stripe no procesa Bizum por sí mismo — [MONEI](https://monei.com/blog/stripe-bizum-payments/); contradicho por la documentación oficial de Stripe ([Stripe Docs](https://docs.stripe.com/payments/bizum)). Prevalece Stripe Docs.
- Propina: Baymard señala que la propina se presenta sin el detalle necesario para decidir — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)

### Inferences
- Web propia sin cuentas de cliente: «Repetir mi último pedido» puede guardarse en `localStorage` del navegador del cliente (coste cero) y en la ficha del cliente del negocio (por teléfono/email). Mostrarlo arriba en la entrada de la web.
- Guardar nombre, teléfono, dirección y notas de entrega en el navegador → checkout de un toque sin crear cuenta (checkout de invitado como norma).
- Con Stripe Checkout/Payment Element, Apple Pay, Google Pay, Link y Bizum se activan como métodos de pago de la cuenta conectada del negocio: es el mayor recorte de fricción posible sin desarrollo propio. Verificar que Bizum funciona con cuentas Connect (v2) y en cobro directo.
- Propina: opcional, sin preselección agresiva, explicando a quién va (cocina/repartidor) — coherente con la crítica de Baymard.

### Gaps
- No se encontró confirmación de compatibilidad de Bizum con Stripe Connect cuentas v2 y cargos directos (revisar docs técnicas).
- Datos sobre conversión de Apple/Google Pay en pedidos de comida: no encontrados.
- Prácticas de cupones/códigos promocionales de los líderes: no investigado.

## Pedidos programados y modos de recogida (mostrador, en coche «I'm here», estanterías, taquillas)

### Takeaway
La recogida excelente elimina la espera: Chipotle separa el flujo digital (estanterías propias, carriles «Chipotlane», «I'm here» en el coche) y McDonald's empieza a preparar cuando el cliente está a ~3 minutos («Ready on Arrival»), con 62 s menos de espera.

### Cited Findings
- Chipotle instaló estanterías de recogida autoservicio para pedidos digitales en cientos de restaurantes (~2018) — [Trend Hunter](https://www.trendhunter.com/trends/food-pickup); [Restaurant Dive](https://www.restaurantdive.com/news/chipotles-digital-business-is-closing-in-on-1b-sales-heres-how-it-got-t/567254/)
- «Chipotlane»: carril de recogida solo para pedidos digitales prepagados; restaurantes con Chipotlane venden ~10 % más — [QSR Magazine](https://www.qsrmagazine.com/uncategorized/inside-rise-game-changing-chipotlane/)
- Piloto «Carside» (enero 2021, 29 locales en California): aparcar, abrir la app, pulsar «I'm Here» y un empleado lleva el pedido al coche — [Restaurant Dive](https://www.restaurantdive.com/news/chipotle-pilots-carside-pickup/594114/)
- Toast curbside: en el pago aparece «Bring my order to my car», se piden datos del vehículo, y el personal los usa para localizar el coche — [Toast Support](https://support.toasttab.com/article/Setting-Up-Curbside-Pickup-for-Online-Orders)
- McDonald's «Ready on Arrival»: la app avisa al restaurante cuando el cliente está a unos 3 minutos para empezar a preparar; ampliación a sus 6 mercados principales para 2025; reducción de 62 segundos en la espera de recogida — [Restaurant Dive](https://restaurantdive.com/news/mcdonalds-implements-geofencing-technology-for-pickup/646126); [Restaurant Dive, 2023-24](https://restaurantdive.com/news/McDonalds-doubles-down-geofencing-loyalty-growth/701753); [Retail Gazette, 08/2026](https://www.retailgazette.co.uk/blog/2026/08/mcdonalds-head-of-technology-on-why-ready-on-arrival-is-a-customer-experience-story/)
- Plazas de aparcamiento exclusivas para pedidos de la app de McDonald's — [The Daily Meal](https://www.thedailymeal.com/1372552/skip-line-curbside-service-mcdonalds)

### Inferences
- En web propia: geofencing continuo no es viable (exige app en segundo plano), pero sí un botón **«Ya estoy aquí» / «Estoy a 5 min»** en la página de seguimiento que avisa al TPV (escritura en el buzón público del negocio, como el resto de solicitudes). Coste cero.
- Pedido programado por franja ya existe en GastroGoan (huecos reales, «Cuanto antes» primero). Lo excelente: decir CUÁNDO empezará a prepararse y garantizar que el hueco elegido se respeta.
- Instrucciones de recogida: texto configurable por el negocio («entra por la puerta lateral, estantería verde, di tu nº de pedido») mostrado en confirmación y seguimiento, con enlace a Maps.

### Gaps
- Starbucks Mobile Order & Pay (estados, «pickup counter», tiempos): no consultado con fuente.
- Taquillas/lockers de recogida (p. ej. cadenas con Apex/Minnow): no investigado.

## UX de la carta para pedir (modificadores, combos, upsell, alérgenos y filtros, fotos, agotados, sustituciones)

### Takeaway
Baymard detecta que ningún líder ofrece un camino para necesidades dietéticas: sin filtros por categoría y fichas de producto que no explican las opciones de personalización. Alérgenos/filtros dietéticos bien hechos son una ventaja diferencial (y en la UE, obligación de información de los 14 alérgenos).

### Cited Findings
- Baymard 2026: «no había camino para necesidades dietéticas o de personalización en ningún punto de decisión»; faltaban filtros por categoría; las fichas no describían las opciones, lo que dificulta resolver alergias y restricciones — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)
- Baymard 2026: orientación y caminos de vuelta fallan en todos los pasos del flujo (sin marcadores de ámbito, migas de pan ni «atrás» fiable) — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)
- Flipdish (marketing): flujo de upsell integrado, p. ej. sugerir un acompañamiento en el checkout; extras por plato, ofertas por horario y descuentos — [Flipdish](https://www.flipdish.com/online-ordering); [startups.co.uk](https://startups.co.uk/payment-processing/online-ordering-systems-takeaway-delivery/)
- Upsell por IA de voz (todo cifras de proveedor, no verificadas): A/B de Maple (14 locales, abril 2025) 34 % de conversión de upsell frente a 17 % del personal; Hostie +15 % de ticket medio; SoundHound vía Olo, +15 % de ticket — [Maple](https://maple.inc/blog/how-voice-ai-increases-upsells-in-restaurants-2025-guide.md); [Hostie](https://hostie.ai/resources/voice-ai-upselling-scripts-restaurant-average-ticket-boost-2025); [Growwstacks](https://growwstacks.com/blog/voice-ai-restaurants-soundhound-olo/)

### Inferences
- Filtro «sin [alérgeno]» y etiquetas dietéticas (vegano, sin gluten) en la carta pública: GastroGoan ya tiene alérgenos por plato y la «i»; falta el FILTRO (excluir platos con X), que es justo lo que Baymard echa en falta en todos los líderes.
- Upsell sin agobio: una sola sugerencia relevante antes de pagar («¿Bebida? / ¿Postre?»), basada en lo que no lleva el carrito; nunca un modal bloqueante.
- Agotados: mostrar el plato atenuado con «Agotado hoy» en vez de ocultarlo (el cliente que lo busca entiende qué pasa) — es la lógica que ya tiene el TPV con «Marcar agotado».
- «Atrás» y orientación (dónde estoy, cuántos pasos) son baratos y Baymard dice que todos fallan.

### Gaps
- Política de sustituciones (cuando falta un ingrediente tras pagar) de los líderes: no encontrada.
- Evidencia independiente de impacto del upsell en webs (no voz): no encontrada.

## Específico de reparto (direcciones, zonas y gastos, pedido mínimo, instrucciones, sin contacto, foto de entrega, contacto con el repartidor)

### Takeaway
Los líderes integran la entrega «sin contacto» en el carrito («Dejar en la puerta») con foto como prueba de entrega; la foto la toma el repartidor y Uber afirma que no se guarda en su teléfono.

### Cited Findings
- Uber Eats: en el carrito, «Opciones de entrega» → «Dejar en la puerta»; el repartidor hace una foto del pedido en la puerta como confirmación — [Uber Blog (AU)](https://www.uber.com/au/en/blog/delivering-non-food-items/); [Uber Eats merchants, proof of delivery](https://merchants.ubereats.com/nz/en/resources/articles/proof-of-delivery/)
- La foto no queda accesible al repartidor tras la entrega y se borra al cerrar la app — [TechCrunch](https://techcrunch.com/?p=2476273)
- Deliveroo pide a sus riders fotografiar el pedido en lugar seguro — [Deliveroo Riders](https://riders.deliveroo.co.uk/en/news/taking-photos-of-an-order-in-a-safe-place)
- Uber API de entregas documenta prueba de entrega (foto, firma, PIN) — [Uber Developer, Proof of delivery](https://developer.uber.com/docs/deliveries/guides/proof-of-delivery)
- Los repartidores revisan si se eligió «dejar en la puerta» y las notas, y pueden escribir o llamar desde la app antes de llegar — [Uber Blog (zh-TW)](https://www.uber.com/zh-TW/blog/delivery-partner-leave-at-door)
- Baymard: tiempo de entrega y costes sin el detalle necesario para decidir — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)

### Inferences
- GastroGoan ya valida zona por código postal (decisión del 8/11). Lo excelente: decir el gasto de envío y el pedido mínimo ANTES de elegir platos (en la tarjeta del servicio) y un contador «te faltan 4,50 € para el mínimo / para envío gratis» en la bandeja.
- Instrucciones de entrega (piso, timbre, portal) y casilla «Sin contacto — dejar en la puerta» son simples campos más.
- Foto de entrega: el repartidor del negocio ya usa Control de repartos; una foto opcional desde su móvil guardada en la nube DEL NEGOCIO no cuesta a GastroGoan (ojo al tamaño: Firebase gratis y el bloque de pedidos).
- Llamadas enmascaradas exigen telefonía de pago (Twilio, etc.): descartado por la regla de coste. Alternativa: botón de llamar al LOCAL, no al repartidor.

### Gaps
- No se encontró documentación oficial sobre llamadas enmascaradas de Uber/Glovo/Just Eat.
- Autocompletado y validación de direcciones (Google Places cuesta por petición; no investigado alternativas gratuitas como Photon/Nominatim con sus límites de uso).

## Post-pedido (valoración, incidencias con reembolso/crédito automático, ticket/factura, fidelización)

### Takeaway
El estándar es reportar un problema por plato desde el propio pedido y recibir un crédito sin hablar con nadie; DoorDash incluso compensa automáticamente el retraso en su programa premium.

### Cited Findings
- DoorDash VIP: crédito automático de 10 $ por llegar 10+ min tarde respecto al final de la ventana; las condiciones dicen que la forma y cuantía del remedio la decide DoorDash — [DoorDash Help](https://help.doordash.com/en-us/consumers/article/vip-delivery-terms-and-conditions)
- En Canadá el remedio es devolución por artículos faltantes o defectuosos — [DoorDash Help (CA)](https://help.doordash.com/en-ca/consumers/article/vip-delivery-terms-and-conditions)
- Flipdish vende fidelización y campañas con datos propios del cliente como razón para pedir directo frente a agregadores — [Flipdish, what we do](https://www.flipdish.com/what-we-do)
- Comisiones de agregadores entre el 15 % y el 35 % (dato de un proveedor de WhatsApp, orientativo) — [Sleekflow](https://sleekflow.io/es/blog/whatsapp-business-restaurants)

### Inferences
- En web propia: tras «entregado», pantalla con valoración de 1 toque (ya existe NPS) + «¿Algo ha ido mal?» por línea (faltó / llegó mal / frío) que crea una incidencia en el TPV; el negocio decide reembolso con Stripe o vale para el próximo pedido (GastroGoan ya tiene vales regalo y devolución).
- Factura: el ticket es factura simplificada; ofrecer «Pedir factura completa» (NIF) desde el seguimiento conecta con la numeración F… ya existente.
- Fidelización: puntos/vales por teléfono del cliente sin crear cuenta.

### Gaps
- Flujos concretos de reembolso de Uber Eats/Just Eat/Glovo/Deliveroo: no consultados.
- Programas de fidelidad (Starbucks Rewards, MyMcDonald's, Telepizza): no investigados con fuente.

## Accesibilidad y rendimiento (mobile-first, velocidad)

### Takeaway
Sin fuente específica encontrada en esta tanda; Baymard evalúa móvil (sitios y apps) y señala que el uso es habitual, con prisa y desde el teléfono.

### Cited Findings
- Baymard justifica que repetir pedido, dietas y orientación son el núcleo de la tarea dado el reordenado habitual en móvil, la presión de tiempo y las restricciones dietéticas — [Baymard 2026](https://baymard.com/blog/food-delivery-and-takeout-ux-benchmark-2026)

### Inferences
- La web pública de GastroGoan ya cumple reglas propias (44 px, ≥16 px en campos, contraste 4,5:1, `prefers-reduced-motion`): están alineadas con WCAG 2.2 AA, pero no se ha buscado fuente específica del sector.

### Gaps
- No se consultaron NN/g ni WCAG para comida a domicilio; no hay datos de velocidad/conversión del sector en esta investigación.

## Innovaciones 2023-2026 (IA, voz, WhatsApp, pedidos en grupo, pago dividido)

### Takeaway
Pedidos en grupo con pago dividido (Uber Eats, 2022) y pedido por WhatsApp/voz con IA son las novedades más citadas; las cifras de IA de voz vienen casi siempre de quien la vende.

### Cited Findings
- Uber Eats relanzó el pedido en grupo con división de cuenta (primera app de reparto en EE. UU., según Uber): el organizador paga todo o cada uno paga lo suyo; fecha límite con recordatorios automáticos y, al vencer, el pedido sale aunque falte gente; límite de gasto por invitado; solo mismo restaurante; no se podía dividir después de pedir — [Engadget](https://www.engadget.com/uber-eats-bill-splitting-group-order-deadlines-140019462.html); [Uber Newsroom](https://www.uber.com/newsroom/bill-splitting)
- Mayo 2023: carritos compartidos con reparto de pago también en supermercado — [Canadian Grocer](https://canadiangrocer.com/uber-debuts-group-ordering-grocery)
- IA de voz por teléfono integrada con Olo (BiteBuddy, Hostie, SoundHound); cifras de ticket +12-25 % todas de proveedor — [Olo partners](https://partners.olo.com/partners/bite-buddy-ai); [Hostie x Olo](https://hostie.ai/articles/new-hostie-x-olo-integration-enables-seamless-ai-phone-ordering-for-restaurants)
- WhatsApp: KFC India (pedir sin app), Domino's en WhatsApp/Messenger/SMS — [ChatMaxima](https://chatmaxima.com/blog/how-restaurants-use-ai-chatbots-2026/)
- Domino's Tracker con IA para ETA (2026) — [Restaurant Dive](https://www.restaurantdive.com/news/dominos-tracker-update-artificial-intelligence-real-time-order-status/815556/)
- Last.app (España) ofrece LastSHOP, tienda online del restaurante «sin costes fijos» — [Software DOIT](https://www.softwaredoit.es/last-app/last-app.html); no se pudo verificar en su web si cobra comisión ni si hace seguimiento por WhatsApp.

### Inferences
- Pedido en grupo en web propia: un enlace compartible del carrito (cada uno añade lo suyo en su móvil, fecha límite, el organizador paga) es posible con el buzón público del negocio; pago dividido con Stripe = varios PaymentIntents. Esfuerzo alto; valorar después de lo básico.
- IA de voz/WhatsApp con IA cuestan por uso: si se ofrece, con la clave del propio negocio (como el I+D), nunca a cargo de GastroGoan.

### Gaps
- No se encontraron anuncios oficiales 2024-2025 de Uber Eats/DoorDash sobre grupo/pago dividido más allá de 2022-2023.
- Glovo, Just Eat, Telepizza, Five Guys, Starbucks, ChowNow, Slice, Square Online, Lightspeed Order Anywhere: sin fuentes propias en esta tanda (límite de consultas). Conviene una segunda pasada si el informe necesita ejemplos de ellos.
