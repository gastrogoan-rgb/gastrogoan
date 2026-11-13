# Repartidores propios (flota interna del restaurante): funciones, buenas prácticas y marco legal en España

> Notas de investigación (13/11/2026). Fuentes de 2021-2026. Mucha información de fabricantes es marketing propio: se indica cuando lo es.
> Contexto de viabilidad: GastroGoan es una app 100 % navegador, sin servidor propio, con Firebase por negocio y sin coste por cliente para el vendedor.

## 1. Despacho: asignación manual/automática, agrupación, rutas, tablero, ETA, disponibilidad y zonas

### Takeaway
El mercado va de lo mínimo (lista de pedidos «sin asignar → en ruta → entregado» y elegir repartidor fichado, como Toast) a lo sofisticado (asignación automática por algoritmo, agrupación por distancia/tiempo y geovallas, como Tookan o Shipday). Para un restaurante pequeño con 1-4 repartidores, el patrón dominante y suficiente es: asignación manual desde el TPV o un mapa, agrupación manual de varios pedidos en una salida, y que el repartidor abra cada dirección en Google Maps; la optimización de rutas multi-parada suele ser de pago o «próximamente» incluso en TPV españoles.

### Cited Findings
- **Toast (flota propia, modo Delivery)**: tres pestañas, *Unassigned* (enviado sin repartidor), *En Route* (asignado; el nombre del repartidor arriba a la derecha) y *Delivered*. Se pueden ordenar por hora prometida (*Quoted Time*) para priorizar. Para despachar se seleccionan uno o varios pedidos y se elige repartidor; **solo aparecen los empleados fichados con puesto «Driver»** («Only drivers that are clocked in can be dispatched»). Los pedidos deben marcarse entregados antes de cerrar el turno del repartidor, y desde *Delivered* se puede cambiar de repartidor (se lleva la cuenta y la propina) — [Toast: Delivery Mode](https://support.toasttab.com/en/article/Delivery-Mode-1493048871021)
- **Qamarero (TPV español, módulo Qdelivery)**: pedidos sobre un mapa, asignación manual individual o **agrupada** al mismo repartidor, reasignación al reorganizar una salida, asignación directa si solo hay un repartidor disponible, y una **tablet fija «Riders»** en la zona de recogida donde los repartidores se autoasignan. Autoasignación desde el móvil y asignación automática general: «en desarrollo». El mapa **no optimiza el orden de paradas** (previsto); el repartidor abre cada dirección en Google Maps. Sin GPS en directo ni ETA. La pantalla de cocina (KDS) indica cuándo está listo para salir — [Qamarero: gestión de repartidores](https://qamarero.com/gestion-repartidores-restaurantes/)
- **Last.app (TPV español)**: se dan de alta los repartidores (nombre y teléfono) en LastAdmin › Delivery, se asignan pedidos desde el TPV, y se pueden **imprimir códigos de barras de repartidor**: se escanea el código del pedido y luego el del repartidor para asociarlos — [Last.app: Managing in-house delivery drivers](https://desk.last.app/portal/en/kb/articles/managing-in-house-delivery-drivers). Ofrece modo automático o manual; el manual se recomienda cuando se mezclan repartidores propios y servicios externos — [Last.app: Third-party delivery integration](https://help.last.app/portal/en/kb/articles/delivery-management-third-party-delivery-integration). Para algo más completo se integra con Shipday (los pedidos de Last.app aparecen en Shipday) — [Shipday: integración Last.app](https://www.shipday.com/es/integrations/last-app)
- **Shipday**: asignación automática («Send each order to the right driver automatically»), optimización de rutas en el plan Professional (marketing: «hasta un 30 % más rápido»), ETA por SMS, geovallas en planes Business AI, informes de rendimiento del repartidor. Precios: plan gratis 300 pedidos/mes; de pago 29-399 $/mes; pedidos extra 0,06-0,25 $ — [Shipday: driver management](https://www.shipday.com/features/driver-management)
- **Tookan (Jungleworks)**: 5 algoritmos de asignación (round-robin, el más cercano disponible, **batch-wise** por distancia y tiempo, etc.); *pooling* agrupa tareas dentro de un radio con límites como tiempo máximo de entrega; autoasignación por difusión a repartidores dentro de un radio (gana quien acepta primero); geovallas para disparar estados al llegar, dividir equipos y fijar precios por zona; vista de mapa para el gerente — [Jungleworks: batch allocation](https://jungleworks.com/how-to-reduce-delivery-time-and-maximise-output-with-tookan/); [Jungleworks: geofence/journey](https://jungleworks.com/tookan/resources/admin/journey/); [Jungleworks: food delivery](https://jungleworks.com/tookan/lp-food-delivery-management/). Reseñas en Capterra indican autoasignación poco fiable en algunos casos — [Capterra: Tookan](https://www.capterra.com/p/218952/Tookan/reviews/1967284/)
- **Deliverect Dispatch**: asigna automáticamente a la flota propia o a proveedores de última milla, con reglas por tienda o grupo de tiendas; asignación manual desde «My Couriers»; app de repartidor con seguimiento y valoraciones; idea de «desborde»: la flota propia hace lo que puede (sin comisión) y el exceso se manda a terceros. Si no hay repartidor disponible, toca repartir uno mismo o cancelar — [Deliverect Dispatch](https://www.deliverect.com/dispatch); [Deliverect help: Dispatch overview](https://help.deliverect.com/en/articles/7979513-dispatch-overview); [Deliverect Courier](https://www.deliverect.com/en/courier)

### Inferences
- El mínimo viable que todos comparten: estados *sin asignar / en ruta / entregado*, lista ordenada por hora prometida, «solo repartidores fichados» y asignación multi-pedido. Esto es 100 % implementable en una app de navegador con Firebase (es un cambio de estado de pedido sincronizado), sin coste por cliente.
- La optimización de rutas real (TSP con tiempos de tráfico) exige una API de rutas de pago (Google Directions/Routes, Mapbox…) que crecería con el número de clientes: choca con la regla de «nada por cliente». Alternativas sin coste: ordenar paradas por código postal/cercanía con una heurística local (vecino más próximo con coordenadas aproximadas por código postal) o generar **un enlace de Google Maps con varias paradas** (waypoints en la URL) que el repartidor abre en su móvil — la navegación la pone Google y es gratis para el usuario.
- La ETA sin GPS puede estimarse como: hora de «listo» + tiempo medio por zona/código postal aprendido del histórico de entregas del propio negocio (se puede calcular en el cliente).
- La «tablet Riders» con autoasignación (Qamarero) y el código de barras de repartidor (Last.app) son formas baratas de evitar que el encargado haga de despachador en hora punta.

### Gaps
- No encontré documentación pública de cómo calculan la ETA Shipday u Onfleet (algoritmo, si usan tráfico).
- No verifiqué funciones concretas de Revo (XEF/Revo Delivery) para repartidores propios: la búsqueda no devolvió nada útil.
- No hay cifras independientes del ahorro por agrupar pedidos; las que hay (22 %, 30 %) son del fabricante.

## 2. App del repartidor: lista de pedidos, navegación, llamada al cliente, estados, prueba de entrega, efectivo, sin conexión

### Takeaway
Las apps dedicadas (Shipday Drive, Onfleet, Tookan) son nativas: lista de pedidos, navegación, chat, cambio de estado, foto/firma/código de barras como prueba de entrega. Las soluciones de TPV españolas (Qamarero) usan una **webapp** sin instalación con lo esencial: pedidos asignados, dirección, teléfono, importe y si está pagado o hay que cobrar. El modo sin conexión y el cobro contra reembolso no están bien cubiertos por las grandes (Onfleet).

### Cited Findings
- **Shipday Drive**: gratis en iOS y Android; actualizaciones de pedidos en tiempo real, chat integrado, optimización de rutas; prueba de entrega con **foto y firma** con fecha y hora — [Shipday: mobile app for drivers](https://www.shipday.com/features/mobile-app-for-drivers); [Shipday: proof of delivery](https://www.shipday.com/features/proof-of-delivery); [App Store: Shipday Drive](https://apps.apple.com/us/app/shipday-drive/id1531504620?uo=4)
- **Onfleet**: prueba de entrega con fotos, códigos de barras (varios por entrega, se pueden hacer obligatorios), firma, verificación de edad/DNI y notas — [Onfleet: proof of delivery](https://onfleet.com/proof-of-delivery). Usuarios piden sincronización sin conexión y se quejan de problemas en Android — [Capterra: Onfleet](https://capterra.com/p/142633/Onfleet/). No encontré confirmación de cobro contra reembolso en Onfleet; sí en Track-POD (COD y modo sin conexión) — [Track-POD blog](https://track-pod.com/blog/paperless-applications/)
- **Qamarero**: webapp sin instalación nativa, se entra con la cuenta de empleado con perfil de repartidor; muestra pedidos asignados, dirección, teléfono del cliente, importe y estado del cobro; distingue **prepagado** de **cobrar al entregar** (efectivo o datáfono externo); el repartidor registra entrega y cobro y el local ve pendiente/asignado/entregado — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)
- **Toast + Shipday**: con Toast, los repartidores propios que quieran app usan Shipday Drive (deben estar también como empleados en Toast) y el despacho se hace en Shipday — [Toast: Shipday integration](https://support.toasttab.com/en/article/Getting-Started-Shipday-Integration-for-Restaurant-Managed-Deliveries)
- **Cobro contra reembolso en general**: Shipox asigna el pedido con el importe a cobrar y la app recuerda cobrarlo; Shipsy captura el importe del envío y genera recibo — [Shipox features](https://shipox.dst.uz/features/); [Shipsy: driver app design](https://www.shipsy.ai/insights/driver-app-execution-design)
- **Comparación plataformas**: Uber avisa al repartidor en la app cuando el pedido es en efectivo y descuenta su comisión de las ganancias por separado — [Uber: viajes en efectivo](https://www.uber.com/gt/es/deliver/basics/making-deliveries/cash-trips). En Uruguay los repartidores de PedidosYa dejaron de aceptar efectivo desde las 19:00 (desde el 4/05/2026) por robos nocturnos — [Montevideo Portal](https://www.montevideo.com.uy/Noticias/Repartidores-de-PedidosYa-dejaran-de-aceptar-pedidos-en-efectivo-a-partir-de-las-19-00-uc960798)
- **Usabilidad**: en Shipday, reseñas de SelectHub dicen que los repartidores tienen que pulsar demasiados botones mientras conducen — [SelectHub: Shipday](https://www.selecthub.com/p/delivery-management-software/shipday/)

### Inferences
- Lo que GastroGoan puede hacer sin app nativa ni servidor: una vista «Repartidor» dentro de la propia app (perfil de empleado con «Es repartidor», que ya existe) con: mis pedidos de la salida, dirección con botón «Abrir en Google Maps / Waze» (URL `https://www.google.com/maps/dir/?api=1&destination=…` o multi-parada; `https://waze.com/ul?q=…`), botón `tel:` para llamar, estados grandes (Recogido · En camino · Entregado · Incidencia) de 44+ px, importe a cobrar destacado y si va pagado.
- **Llamada enmascarada** (número proxy) requiere telefonía de pago (Twilio, etc.) → coste por cliente; descartable. Alternativa: el repartidor llama desde el móvil del negocio, o se muestra solo el teléfono durante el pedido y se oculta al entregarlo.
- **Prueba de entrega**: foto con `<input type="file" capture>` y firma en `<canvas>` son posibles en navegador, pero las fotos pesan en Firebase (almacenamiento del negocio). Lo más barato y útil: **PIN de entrega** de 4 cifras que el cliente ve en su seguimiento y dice al repartidor (cero almacenamiento), y foto opcional solo si «dejado en la puerta».
- **Sin conexión**: la app ya es offline-first (IndexedDB + sincronización); los cambios de estado del repartidor pueden encolarse y subir al recuperar cobertura, igual que el resto de datos.

### Gaps
- No encontré documentación pública detallada de la app de repartidor de Domino's ni de Square para flota propia.
- No pude confirmar si Glovo/Uber exigen PIN de entrega en España (en otros mercados sí existe el código de entrega).

## 3. Seguimiento GPS en vivo compartido con el cliente desde una app web

### Takeaway
En navegador se puede usar `navigator.geolocation.watchPosition` mientras la página está en primer plano y con la pantalla encendida (Screen Wake Lock), pero **en cuanto el repartidor cambia a Google Maps o bloquea el móvil, el seguimiento se para** (Chrome Android y PWAs de iOS). Las apps de reparto lo resuelven con apps nativas con permiso de ubicación en segundo plano, lo que a su vez gasta batería. Para una app solo-navegador, el seguimiento «en vivo» fiable no es viable; sí lo es un seguimiento por hitos (preparando → en camino con hora de salida → entregado) y posiciones puntuales al cambiar de estado.

### Cited Findings
- El Screen Wake Lock (Chrome desde la v84) mantiene la pantalla encendida pero se libera automáticamente cuando el usuario minimiza o cambia de pestaña/app — [Chrome Developers: Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock?hl=de); [caniuse: wake-lock](https://caniuse.com/wake-lock)
- En Chrome Android la geolocalización deja de actualizar al pasar la app a segundo plano (reporte en el bug tracker de Mozilla comparando comportamientos; un usuario describe que el indicador GPS desaparece al volver a la pantalla de inicio) — [Mozilla Bugzilla 1653549](https://bugzilla.mozilla.org/show_bug.cgi?id=1653549); `watchPosition` no funciona en segundo plano en Android O+ (Firefox) — [Mozilla Bugzilla 1482733](https://bugzilla.mozilla.org/show_bug.cgi?id=1482733). Evidencia indirecta (bug reports), no documentación oficial.
- En iOS el Wake Lock funciona en Safari 16.4 pero **no** en la PWA añadida a la pantalla de inicio (bug de WebKit) — [WebKit Bug 254545](https://lists.webkit.org/pipermail/webkit-unassigned/2023-March/1095262.html); todos los navegadores en iPhone usan WebKit, así que las limitaciones de Safari aplican a todos — [MagicBell: PWA iOS limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide). Hay reportes de *throttling* de `getCurrentPosition` en PWA de Safari — [Apple Developer Forums](https://developer.apple.com/forums/thread/771778)
- Las apps nativas sí lo hacen: Shipday Drive declara que usa la ubicación incluso cerrada, lo que puede reducir la batería; Shipday no publica intervalo ni consumo — [App Store: Shipday Drive](https://apps.apple.com/bg/app/shipday-drive/id1531504620); [Shipday: real-time GPS tracking](https://www.shipday.com/post/real-time-gps-tracking). Shipday ofrece páginas de seguimiento con marca para el cliente — [Shipday: driver management](https://www.shipday.com/features/driver-management)
- Qamarero (TPV español) **no** ofrece GPS en directo ni ETA: solo estados — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)

### Inferences
- Opción realista para GastroGoan: el repartidor pulsa «Salgo» (una lectura de `getCurrentPosition` opcional) y «Entregado»; el cliente ve en su seguimiento (que ya existe en la web pública) «En camino desde las 21:12 · llegada estimada 21:30» calculada con el tiempo medio de su zona. Un «modo ruta» con `watchPosition` + Wake Lock solo funcionaría si el repartidor deja la app en pantalla (sin usar Google Maps), lo cual es poco realista.
- Coste: escribir la posición cada 10-15 s en el Firebase del negocio es gratis para GastroGoan, pero cada cliente que mira el seguimiento abre una conexión (límite de 100 simultáneas del plan gratuito, ver CLAUDE.md); con la consulta REST periódica en vez de socket se evita.
- Privacidad: el cliente solo debería ver la posición mientras SU pedido está en camino, y la posición no debería guardarse como historial (minimización, ver punto 6).

### Gaps
- No encontré documentación oficial de Google/Apple que fije con precisión cuándo se cortan los callbacks de `watchPosition` con la pantalla bloqueada; conviene probarlo en aparatos reales.
- Sin datos públicos de consumo de batería del seguimiento web frente al nativo.

## 4. Efectivo, propinas, liquidación al final del turno y métricas del repartidor

### Takeaway
La práctica de referencia es un **«monedero» por repartidor**: cambio entregado al salir + cobros en efectivo − entregas parciales en caja = lo que debe devolver al cerrar; el encargado declara lo recibido y anota diferencias (Qamarero). Las propinas van por defecto al repartidor asignado, con opción de bote común (Toast). Las métricas por repartidor existen en las herramientas grandes, pero los TPV españoles apenas las detallan.

### Cited Findings
- **Qamarero, monedero del repartidor**: registra cambio entregado, cobros en efectivo e ingresos parciales en caja; al cerrar la jornada el encargado declara el importe recibido y puede comentar diferencias; los cierres X/Z **avisan** de monederos abiertos sin bloquear; un movimiento posterior reabre el monedero; permisos separados para ver y gestionar monederos, con código maestro y **cierre a ciegas** opcional — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)
- **Toast, propinas**: por defecto el repartidor asignado recibe la propina/servicio de la cuenta; al reasignar el pedido la propina pasa al nuevo; existe la opción de **bote de propinas de reparto** (*pool tips*) con un ajuste en la revisión de turno que declara propinas en efectivo y una propina declarada negativa para redistribuir — [Toast: Pool tips for delivery orders](https://support.toasttab.com/en/article/Pooling-Tips-for-Delivery-Orders); [Toast: Delivery Mode](https://support.toasttab.com/en/article/Delivery-Mode-1493048871021). Los pedidos repartidos por un tercero no entran en ese bote — [Toast: Pool tips](https://intercom.help/toast-central/en/articles/9303028-pool-tips-for-delivery-orders). Con Toast Delivery Services las propinas las cobra el proveedor y hay que restarlas antes de repartir a la plantilla — [Toast: TDS tip payouts](https://support.toasttab.com/article/Toast-Delivery-Services-Tip-Payouts)
- **Métricas**: Shipday ofrece informes de ventas, reparto y rendimiento del repartidor (analítica avanzada en el plan Business AI) — [Shipday](https://www.shipday.com/features/driver-management); Deliverect recoge valoraciones de la flota propia — [Deliverect Courier](https://www.deliverect.com/en/courier). Qamarero no detalla métricas de reparto — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)
- **Riesgo del efectivo**: los robos nocturnos llevaron a repartidores de PedidosYa (Uruguay) a rechazar efectivo desde las 19:00 — [Montevideo Portal](https://www.montevideo.com.uy/Noticias/Repartidores-de-PedidosYa-dejaran-de-aceptar-pedidos-en-efectivo-a-partir-de-las-19-00-uc960798)

### Inferences
- Encaja con lo que GastroGoan ya tiene (cierre de caja con «esperado» por forma de pago, cierre a ciegas posible, `puedeCancelar`): una **liquidación de repartidor** = fondo de cambio + Σ efectivo de sus pedidos «cobrar al entregar» − entregas parciales → esperado; contado → diferencia; con aviso en el cierre de caja si queda algún repartidor sin liquidar (avisar, no bloquear).
- Métricas calculables en local con los timestamps de estado: entregas/hora de turno, tiempo medio listo→entregado, % tarde frente a la hora prometida, efectivo manejado, diferencias acumuladas. Cuidado con presentarlas como ranking punitivo (punto 6: transparencia algorítmica).
- Propinas: con tarjeta (pagado online por Stripe o datáfono) se anotan al repartidor asignado; en efectivo, el repartidor las declara al liquidar; opción de bote.

### Gaps
- No encontré cómo liquidan efectivo Last.app ni Revo.
- No hay datos sobre el % de pedidos en efectivo en el reparto propio en España.

## 5. Tarifas y zonas de reparto

### Takeaway
La configuración estándar en TPV españoles es **por zona**: pedido mínimo, gastos de envío y envío gratis a partir de un importe por zona. Las herramientas internacionales añaden precio por geovalla/distancia y ETA por SMS; los recargos por hora punta son más propios de plataformas que de reparto propio.

### Cited Findings
- Qamarero: costes de reparto por zona con pedido mínimo, gastos de envío y envío gratis a partir de un importe — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)
- Tookan: geovallas para fijar lógica de precios por zona — [Jungleworks: geofence](https://jungleworks.com/tookan/resources/admin/journey/)
- Shipday: geovallas en los planes Business AI — [Shipday](https://www.shipday.com/features/driver-management)

### Inferences
- GastroGoan ya reparte **solo por códigos postales** (decisión del 8/11). Lo natural es que cada código postal (o grupo de códigos = zona) tenga su propio envío, mínimo y umbral de envío gratis, y un «tiempo de entrega típico» para la ETA. Precio por distancia exige geocodificar (se quitó Nominatim a propósito): no recomendado.
- Recargo en hora punta / lluvia: técnicamente trivial (franja horaria → suplemento), pero no encontré fuentes de buenas prácticas para reparto propio; decisión de negocio.

### Gaps
- No encontré fuentes fiables con importes típicos de envío o mínimos en restaurantes españoles con reparto propio.

## 6. Marco legal en España: Ley Rider, laboral vs autónomo, seguro, RGPD y geolocalización

### Takeaway
La Ley Rider (RDL 9/2021 → Ley 12/2021) crea una **presunción de laboralidad para repartidores gestionados por plataformas digitales con gestión algorítmica**; un restaurante con sus propios repartidores no es, en principio, una «plataforma», pero sus repartidores son trabajadores por cuenta ajena según la regla general (art. 8.1 ET: ajenidad y dependencia) y tenerlos como «autónomos» es el clásico falso autónomo que la Inspección persigue. Si se usa un algoritmo para asignar o evaluar repartidores, hay deber de informar a la representación legal (art. 64.4.d ET). Geolocalizar a empleados está permitido (art. 90 LOPDGDD + 20.3 ET) pero con información previa expresa, proporcionalidad y solo en jornada; y la empresa **no puede obligar al trabajador a usar su móvil personal** para geolocalizarle.

### Cited Findings
- RDL 9/2021, de 11 de mayo (BOE 12/05/2021), vigente desde el 12/08/2021; convalidado como Ley 12/2021, de 28 de septiembre. Añade la DA 23ª ET (presunción de laboralidad) y modifica el art. 64.4 ET — [Cuestiones Laborales](https://www.cuestioneslaborales.es/ley-rider-repartidores-plataformas/); [Garrigues](https://www.garrigues.com/es_ES/noticia/entra-vigor-ley-rider-nuevas-exigencias-laborales-plataformas-digitales-reparto); [Osborne Clarke](https://www.osborneclarke.com/es/insights/principales-novedades-de-la-ley-rider)
- La presunción alcanza a quien reparte cualquier producto cuando la empresa organiza, dirige y controla, directa o implícitamente, **mediante gestión algorítmica** y **a través de una plataforma digital**; es una presunción que admite prueba en contrario. Art. 64.4.d ET: el comité tiene derecho a conocer «parámetros, reglas e instrucciones» de algoritmos o IA que afecten a condiciones de trabajo, acceso y mantenimiento del empleo y elaboración de perfiles, **en cualquier empresa**, no solo plataformas. La Directiva (UE) 2024/2831 debe transponerse antes del 2/12/2026; a 11/10/2026 el ET aún no se había modificado — [Cuestiones Laborales](https://www.cuestioneslaborales.es/ley-rider-repartidores-plataformas/)
- El Tribunal Constitucional desestimó el recurso de inconstitucionalidad contra el RDL 9/2021 — [Diario de León](https://www.diariodeleon.es/economia/260812/2094064/imprescindible-trabajo-ineficiente-repartidores-5-anos-ley-rider.html)
- Críticas: la ley se redactó sin tener en cuenta a restaurantes, plataformas y repartidores — [Economist & Jurist](https://www.economistjurist.es/?p=115677)
- Falsos autónomos: la Inspección ha rechazado que los repartidores de Glovo sean «mensajeros independientes» (ajenidad, dependencia, falta de poder de negociación) — [elDiario.es](https://www.eldiario.es/economia/inspeccion-trabajo-desmonta-glovo-repartidores_1_1771319.html); reclamó a Uber Eats 110 M€ de cotizaciones por 60.000 falsos autónomos — [Forbes](https://forbes.es/economia/897620/la-inspeccion-reclama-a-uber-eats-110-millones-por-cotizaciones-impagadas-de-60-000-falsos-autonomos/); multas de 3.126-6.250 € (grado mínimo) y 6.251-8.000 € (medio) según Infoautónomos (fuente divulgativa) — [Infoautónomos](https://www.infoautonomos.com/seguridad-social/que-es-el-falso-autonomo); una guía de gestoría cita a los restaurantes con repartidores propios entre los sectores vigilados (fuente divulgativa) — [Copilot Gestoría](https://copilotgestoria.com/blog/falsos-autonomos-2026-uber-eats-110-millones-inspeccion-trabajo-indicios-guia-gestorias); Hacienda advierte que los riders deben cobrar nómina, no facturar con IVA — [Economist & Jurist](https://www.economistjurist.es/actualidad-juridica/hacienda-advierte-que-los-riders-deben-cobrar-nomina-no-facturar-con-iva)
- Alternativa usada por plataformas: sustituir falsos autónomos por empresas contratistas (análisis de Cuatrecasas) — [Cuatrecasas](https://www.cuatrecasas.com/es/global/laboral/art/sustitucion-plataformas-delivery-falsos-autonomos-contratistas)
- **AEPD**: guía «La protección de datos en las relaciones laborales» (actualizada mayo 2021, con Ministerio de Trabajo, patronal y sindicatos) — [AEPD nota de prensa](https://www.aepd.es/es/prensa-y-comunicacion/notas-de-prensa/aepd-publica-guia-pd-y-relaciones-laborales). Art. 90 LOPDGDD: habilita al empleador a tratar datos de geolocalización para control laboral (art. 20.3 ET) pero exige informar **de forma expresa, clara e inequívoca** de la existencia y características del sistema y de los derechos ARSL; también a los representantes — [conceptosjuridicos.com](https://www.conceptosjuridicos.com/articulos/ley-organica-de-proteccion-de-datos-articulo-90/); [protecciondatos-lopd.com](https://protecciondatos-lopd.com/empresas/legal-localizacion-gps-trabajadores/). Hay que ponderar proporcionalidad, idoneidad y necesidad — [Gómez-Acebo & Pombo](https://ga-p.com/publicaciones/puede-la-configuracion-dada-a-un-sistema-de-geolocalizacion-echar-por-tierra-un-proyecto-empresarial/). Un documento de la AEPD de 2016 advierte que seguir al trabajador fuera de la jornada invade su privacidad — [AEPD 2016-0321](https://www.aepd.es/documento/2016-0321.pdf). Sanción de la AEPD a un ayuntamiento por usar la geolocalización de un policía local para sancionarle (uso para otra finalidad) — [Derecho Local](https://derecholocal.es/?p=5436)
- **Móvil personal**: la empresa no puede obligar al trabajador a aportar su propio teléfono para geolocalizarle — [Cuatrecasas](https://www.cuatrecasas.com/es/spain/laboral/art/la-empresa-no-puede-obligar-al-trabajador-a-aportar-su-propio-telefono-movil-para-geolocalizarle-1)

### Inferences
- Para GastroGoan: el repartidor propio es un empleado más (ficha, fichaje, nómina con la SS ya modelada); no conviene ofrecer flujos que sugieran «repartidor autónomo que factura». Un texto de ayuda puede advertirlo sin dar asesoría.
- Si se añade seguimiento de ubicación: (1) desactivado por defecto, (2) activado por el repartidor en su turno y solo mientras lleva pedidos, (3) aviso informativo expreso que el negocio enseña/firma (podría generarse como impreso, como el manual del puesto), (4) sin historial de trayectos, solo última posición mientras el pedido está en camino, (5) nunca obligatorio en un móvil personal (un móvil del negocio para reparto es la vía limpia).
- Si la app asigna repartidores automáticamente o puntúa su rendimiento, documentar las reglas en lenguaje claro (art. 64.4.d ET) — encaja con la costumbre de la casa de explicar «cómo se calcula».
- Seguro: no encontré fuentes específicas; inferencia general: el vehículo usado debe tener seguro que cubra uso profesional y la empresa responde por accidentes laborales in itinere/en misión vía Seguridad Social. Verificar con fuente antes de afirmarlo.

### Gaps
- No encontré un caso de Inspección o sentencia específico de un restaurante/pizzería con repartidores propios (todo lo hallado es de plataformas).
- No obtuve el texto literal del art. 90 LOPDGDD del BOE ni el apartado exacto de la guía AEPD sobre geolocalización (se citan fuentes secundarias).
- Seguro de vehículo/moto para reparto propio: sin fuentes.
- Pendiente: estado de la transposición de la Directiva 2024/2831 (plazo 2/12/2026), que podría ampliar la presunción.

## 7. De qué se quejan los operadores y qué piden

### Takeaway
Las quejas recurrentes son: demasiados toques para el repartidor mientras conduce, asignación automática poco fiable, falta de modo sin conexión, problemas en Android, batería por el GPS en segundo plano, y soporte deficiente. En España los TPV aún tienen como «próximamente» la autoasignación, la optimización de rutas y el GPS en vivo.

### Cited Findings
- Shipday: «drivers need to navigate an excessive number of buttons» — [SelectHub](https://www.selecthub.com/p/delivery-management-software/shipday/); reseñas de una estrella por fallos y mal soporte en Shopify — [Shopify App Store: Shipday](https://apps.shopify.com/shipday/reviews); valoraciones dispares (GetApp 4,7/5 de 29 reseñas; Shopify 3,6) — [GetApp](https://www.getapp.com/delivery-management-software/a/shipday); batería por ubicación en segundo plano — [App Store](https://apps.apple.com/bg/app/shipday-drive/id1531504620)
- Onfleet: piden herramientas móviles de despacho, sincronización sin conexión y menos problemas en Android — [Capterra: Onfleet](https://capterra.com/p/142633/Onfleet/)
- Tookan: autoasignación poco fiable y huecos funcionales según algunos usuarios — [Capterra: Tookan](https://www.capterra.com/p/218952/Tookan/reviews/1967284/)
- Qamarero: autoasignación, asignación automática, optimización de rutas multi-parada y GPS en vivo **no disponibles aún** — [Qamarero](https://qamarero.com/gestion-repartidores-restaurantes/)
- Deliverect: si no hay repartidores disponibles, hay que repartir uno mismo o cancelar — [Deliverect help](https://help.deliverect.com/en/articles/7979513-dispatch-overview)

### Inferences
- Diferenciadores alcanzables sin coste por cliente: (1) pocas pulsaciones (un botón grande por estado), (2) funciona sin conexión, (3) liquidación de efectivo clara, (4) enlace multi-parada a Google Maps, (5) ETA honesta basada en histórico de la zona en vez de GPS en vivo, (6) aviso de «desborde» (nadie disponible) con alternativa: ofrecer recogida o ampliar la hora.
- Lo que NO conviene prometer en la web pública (regla de la casa): «sigue a tu repartidor en el mapa» si no es fiable en navegador.

### Gaps
- Pocas reseñas en español de operadores con flota propia; no encontré foros/hilos de hosteleros españoles sobre estas herramientas.
