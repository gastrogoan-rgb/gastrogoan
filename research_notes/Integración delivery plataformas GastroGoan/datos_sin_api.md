# Datos de pedidos de plataformas (Glovo, Uber Eats, Just Eat) sin API: informes, emails, tickets impresos y lectura de pantalla

Notas de investigación (17/11/2026). Foco: España. Se separa lo confirmado en fuentes oficiales de lo que dicen vendedores o blogs. Muchas páginas de ayuda oficiales encontradas son de OTROS países (Reino Unido, Irlanda, Kenia, Nigeria, Suecia); se indica siempre.

## 1. Informes descargables (Glovo Manager Portal, Uber Eats Manager, Just Eat Partner Hub) y liquidaciones

### Takeaway
Las tres plataformas dan al restaurante una factura/liquidación periódica (Glovo quincenal, Uber Eats quincenal en el contrato sueco, Just Eat semanal) y un historial de pedidos en su portal; solo para Uber Eats está confirmado un CSV por pedido (ID, ventas, impuestos, ajustes, neto). Para Glovo y Just Eat no se encontró ninguna fuente que confirme una exportación CSV/Excel de pedidos, y en ninguna plataforma se confirmó una exportación de platos vendidos por pedido.

### Cited Findings
**Uber Eats**
- La sección Payment History del Uber Eats Manager tiene una columna "CSV" con botón de descarga; el CSV "muestra todos los order IDs, ventas, impuestos, ajustes y neto de pago de cada pedido de la semana seleccionada" (granularidad: una fila por pedido, periodo semanal). La tabla en pantalla tiene: Orders, Sales, Tax, Total, Adjustments, Misc. (cargos como activación o tablet), Uber Service Fee (= ventas × % de comisión), Net Payout, Status. La página no da los nombres exactos de las cabeceras del CSV — [Uber Help: View past payments and breakdowns](https://help.uber.com/h/51a4bf78-6b4e-47d3-898f-606b70ad1b9f)
- Uber añadió columnas Refund (excl. tax), Tax on Refund y Refund (incl. tax) a los informes Payment Details de tienda y de artículo (item) y al Payout Summary; antes los reembolsos salían como fila aparte. Existe por tanto un informe Payment Details "de artículo" (dato de mercado NZ) — [Uber NZ blog: changes to merchant payment reports 2023](https://www.uber.com/nz/en/blog/changes-to-merchant-payment-reports-2023)
- El informe Payment Details incluye una fila por cada ajuste por error de pedido; hay un informe aparte de Order Errors (tipo de incidencia, artículos, reembolso al cliente, cargo al comercio, importe cubierto por Uber) — resultados de búsqueda sobre [Uber merchants: order errors](https://merchants.ubereats.com/ca/en/order-errors) (no verificado página a página)
- En Reino Unido (agosto 2025) cambiaron etiquetas de columnas y Uber avisó de que podía afectar a macros de Excel u otras automatizaciones; la documentación de su Reporting API pide leer columnas por nombre de cabecera, no por posición, porque pueden añadirse en cualquier momento — [Uber developer: Reporting](https://developer.uber.com/docs/eats/guides/reporting) (vía resumen de búsqueda)
- Contrato de comercio Uber Eats (versión Suecia, inglés): cl. 4 "Reporting": el comercio recibe información del número de artículos vendidos y de reembolsos; pagos quincenales con "payment statement" que detalla compensaciones y deducciones (Aggregator Method cl. 2(c)-(d)); Uber puede emitir facturas al cliente y autofacturas en nombre del comercio, en PDF dentro de las Uber Tools (cl. 6); el comercio es el único responsable de fijar el tipo de IVA (cl. 5(b)(i)) — [Uber Eats Merchant Terms (SE)](https://www.uber.com/se/en/legal/uber-eats-merchant-terms-and-conditions/)

**Glovo**
- Condiciones para Partners de Glovo en España (versión "Agosto 2026"): pagos en dos ciclos mensuales (del 1 al 15 y del 16 a fin de mes), abono "en un plazo máximo de tres (3) días hábiles" (cl. 3.6); la comisión es "un porcentaje preestablecido (%) + IVA" sobre ventas (cl. 3.1); la Prime Order Fee "se detallará y reflejará claramente en la factura final" (cl. 3.7); los servicios de Marketplace incluyen "acceso a informes de ventas y datos operativos del PARTNER" (definiciones) — [Glovo: Términos y condiciones Partners (ES)](https://glovoapp.com/docs/es/legal/terms-partners/)
- El Manager Portal tiene: Dashboard, Performance ("ventas, operaciones y métricas de cliente"), Order History (filtrar por estado, tipo, método de pago e incidencias) y Knowledge Center. La página no menciona exportación — [Glovo Kenya: Manager Portal](https://sell.glovoapp.com/ke/en/resource/tutorials-and-tips/category/manager-portal)
- Sección de facturas del Manager Portal: "revisar y descargar todas las facturas y notas de crédito" (con aviso de que puede no estar disponible en todos los países); en Nigeria desde 21/10/2024 las facturas ya no están en la app Orders y se envían por email tras cada ciclo, editable en "Account settings → Invoice contact details" — [Glovo Nigeria: help (resumen de búsqueda)](https://sell.glovoapp.com/ng/en/?p=849)
- Blogs españoles (no oficiales): el restaurante recibe "el neto en la liquidación quincenal, con su factura correspondiente"; comisión sobre el subtotal sin IVA; posibles cuota fija semanal y costes de marketing — [Qamarero: cuánto cobra Glovo](https://qamarero.com/blog/cuanto-cobra-glovo-restaurantes/). Cifras de comisión discrepantes entre blogs (30 %/15 %/15 % según [Asest](https://asest.es/story/abrir-franquicia-glovo/); 35-43 % según otros) — no fiables
- Glovo ofrece a socios sin API subir CSV de precios/stock por SFTP (catálogo, no exportación de pedidos) — [Glovo Q-commerce integrations](https://qcommerce-integrations.glovoapp.com)

**Just Eat**
- (Reino Unido/Irlanda) Factura semanal disponible normalmente los martes en Partner Hub y enviada por email si hay dirección; histórico en "Orders & invoices → Invoices" para ver y descargar; reembolsos aparecen en la factura semanal — [Just Eat UK: Your invoice explained](https://partner.just-eat.co.uk/knowledge-centre/your-invoice-explained) (hoy redirige a partner-centre.just-eat.co.uk; contenido tomado del resumen de búsqueda) y [Just Eat IE partner blog](https://www.just-eat.ie/partner-blog/?p=988)
- Partner Hub tiene una analítica con desglose de pedidos e ingresos a lo largo del día — [Just Eat UK: How to check your analytics](https://partner.just-eat.co.uk/knowledge-centre/how-to-check-your-analytics) (vía resumen)

**Marco legal útil**
- Reglamento (UE) 2019/1150 (P2B), art. 9: el intermediario debe describir en sus condiciones el acceso técnico y contractual a los datos, incluido si el usuario profesional puede acceder a los datos que aportó o que se generaron con su actividad y en qué condiciones (9(2)(b)) — [EUR-Lex 2019/1150](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R1150)

### Inferences
- La vía más sólida y legal es: el restaurante descarga (o recibe por email) la liquidación/factura de cada periodo y la sube a GastroGoan, que la lee. Para Uber Eats, un CSV por pedido; para Glovo y Just Eat, probablemente PDF de factura/liquidación (y quizá exportaciones no documentadas públicamente). GastroGoan ya tiene "Leer factura con foto/PDF" con la IA del negocio (coste del negocio, no de GastroGoan) que encaja con esto.
- Con una liquidación por periodo se cubren bien: ventas brutas, comisión, IVA de la comisión, ajustes/reembolsos y neto cobrado. Los platos vendidos por pedido probablemente NO vienen en la factura; en Uber Eats podría salir del informe Payment Details por artículo (sin confirmar en España).
- El parser debe leer por nombre de cabecera y tolerar cambios de etiquetas (Uber ya los cambió).
- El art. 9 P2B da base para pedir a cada plataforma qué datos puede exportar el restaurante; vale la pena leer la sección de datos completa de las condiciones de Glovo (no se pudo leer entera: 369.000 caracteres).

### Gaps
- No se encontró documentación oficial ESPAÑOLA de: exportación CSV/XLSX de pedidos en Glovo Manager Portal ni en Just Eat Partner Hub; columnas exactas del CSV de Uber Eats en España; contenido línea a línea de la "liquidación quincenal" de Glovo (si lista pedidos uno a uno). Se necesita una cuenta real o capturas de un restaurante cliente.
- No se encontraron informes programados/enviados automáticamente con datos por pedido en ninguna de las tres.

## 2. Emails por pedido o resúmenes diarios

### Takeaway
Confirmado solo el envío por email de facturas periódicas (Just Eat en UK; Glovo en Nigeria). No se encontró ninguna fuente que confirme emails por pedido o resúmenes diarios al restaurante en España.

### Cited Findings
- Just Eat (UK) envía la factura semanal por email si tiene la dirección — [Just Eat UK: Your invoice explained](https://partner.just-eat.co.uk/knowledge-centre/your-invoice-explained)
- Glovo (Nigeria) envía facturas por email tras cada ciclo de facturación; el email de facturación se configura en Manager Portal → Account settings — [Glovo Nigeria](https://sell.glovoapp.com/ng/en/?p=849)
- Uber Eats: facturas y autofacturas en PDF dentro de las Uber Tools (contrato SE, cl. 6); no se encontró envío por email por pedido — [Uber Eats Merchant Terms (SE)](https://www.uber.com/se/en/legal/uber-eats-merchant-terms-and-conditions/)

### Inferences
- Si el restaurante pone como email de facturas una dirección que reenvía a su propio buzón, el flujo "le llega la factura → la sube a GastroGoan" es de esfuerzo mínimo. Leer el buzón automáticamente requeriría un servidor o integración de correo (coste por cliente o credenciales sensibles): choca con la regla de coste cero, salvo que se haga desde el propio navegador del negocio.

### Gaps
- No hay datos sobre emails por pedido en España ni sobre su configurabilidad.

## 3. Tickets impresos: impresoras, captura de ESC/POS y OCR

### Takeaway
Las apps de tablet de Uber Eats y Glovo imprimen tickets en impresoras térmicas concretas (Uber: Star TSP650/654 y Epson TM-m30/m10 por Bluetooth; Glovo: su Sunmi con impresora integrada o un aparato propio). No se encontró ningún producto que capture el flujo ESC/POS de la tablet de Glovo/Uber/Just Eat para convertirlo en datos; los "virtual printer" que existen son del lado del TPV (Eats365) o integraciones por API. El OCR de foto del ticket es técnicamente viable pero no hay fuente que lo valide para estos tickets.

### Cited Findings
- Uber Eats Orders: modelos soportados Star Micronics TSP650, TSP654, Epson TM-M30 y TM-M10; se empareja la tablet con la impresora según instrucciones del fabricante — [Uber Help: How to enable printing](https://help.uber.com/h/dd35f6dc-1253-4f1f-bc8a-af4e1501ad04)
- Vendedores citan además Star TSP143IIIBI, Star SM-L200, Epson TM-m30II, Sunmi NT311 como compatibles (afirmaciones de vendedor, a veces contradictorias) — [Spartan POS guide](https://spartanpos.com/pages/food-delivery-printer-guide-doordash-uber-eats-grubhub), [POS Hardware UK](https://www.pos-hardware.co.uk/blogs/news/uber-eats-compatible-printers-uk-guide), [Hospitality Hub: Sunmi NT311](https://img0.hospitalityhub.com.au/new-uber-eats-android-compatible-sunmi-nt311-bluetooth-receipt-printer/f/24130)
- Glovo: se puede imprimir el ticket "con el Glovo Sunmi o con tu propio dispositivo"; el ticket impreso no identifica pedidos agrupados (hay que mirarlo en la app) — [Glovo Kenya: Orders app](https://sell.glovoapp.com/ke/en/resource/tutorials-and-tips/category/orders-app). La app GoDroid ha sustituido a la app Orders en algunos mercados y aparece sola en el Sunmi — [Glovo Uganda: GoDroid](https://sell.glovoapp.com/ug/en/resource/tutorials-and-tips/category/godroid)
- Condiciones Glovo España: "Dispositivos (con o sin impresora) suministrados por GLOVO" siguen siendo de Glovo; devolución en 15 días al terminar o penalización de 200 € (cl. 3.8) — [Glovo: Términos Partners (ES)](https://glovoapp.com/docs/es/legal/terms-partners/)
- Deliveroo (referencia de mercado) recomienda la impresora integrada del Sunmi por fiabilidad, aunque admite Bluetooth — [Deliveroo: Sunmi](https://help.deliveroo.com/en/articles/3863955-setting-up-your-sunmi-d...)
- "Virtual printer" de Eats365: es el TPV quien envía los trabajos a un endpoint externo (emparejado por IP y clave, cuerpo cifrado AES) — no captura tickets de una tablet de plataforma — [Eats365: set up a virtual printer](https://support.eats365pos.com/set-up-a-virtual-printer)
- Agregadores (Restimo, Food&Service/foodyservice, Mergeport, Last.app, Sinqro) integran Glovo/Uber/Just Eat por API/partnership, no por captura de impresión — [Restimo](https://www.restimo.com/en/integrations/poster), [Foodyservice: Glovo](https://foodyservice.com/en/integrations/glovo), [Mergeport](https://help.mergeport.com/article/using-the-mergeport-controller-on-android-sunmi-tablets-incl-receipt-printing), [Last.app](https://help.last.app/portal/en/kb/articles/delivery-management-third-party-delivery-integration)
- Existe una app iOS "Virtual Thermal Printer" (emulador de impresora) — [App Store](https://apps.apple.com/app/id1547812356) (no se verificó si emula Bluetooth/ESC/POS para estas apps)

### Inferences
- Capturar ESC/POS exigiría un aparato que se haga pasar por una impresora soportada (Bluetooth con perfil de Star/Epson, o impresora de red). Una web app (GastroGoan) no puede actuar como servidor Bluetooth ni escuchar en el puerto 9100: haría falta una app nativa o un mini-ordenador (hardware y desarrollo nuevos). Además, en Uber la lista de impresoras es cerrada, y el Sunmi de Glovo imprime por su impresora interna, sin flujo externo que interceptar.
- Opción realista de bajo coste: foto del ticket (o del resumen del pedido) → lectura con la IA del propio negocio (ya existe en GastroGoan para facturas). Daría platos y total por pedido, pero depende de que alguien haga la foto en cada pedido (esfuerzo alto en servicio) y los tickets contienen datos personales del cliente (ver punto 4).
- El ticket sirve para platos y total, no para comisión ni neto: la conciliación económica sigue necesitando la liquidación.

### Gaps
- Formato exacto (campos) de los tickets impresos de cada plataforma en España; si incluyen precios por línea e IVA.
- No se encontró ningún producto que haga captura de impresión de tablets de plataformas, ni fiabilidad de OCR sobre estos tickets.

## 4. Lectura de pantalla/portal web, extensiones y condiciones de uso

### Takeaway
Uber Eats tiene versión web de pedidos (merchants-beta.ubereats.com, limitada); Glovo tiene Manager Portal web; Just Eat, Partner Hub. Técnicamente una extensión de navegador podría leerlos, pero los contratos limitan el uso de las herramientas y, sobre todo, prohíben sacar y guardar los datos personales de los clientes fuera de las herramientas de la plataforma. No se encontró una cláusula expresa anti-scraping en la parte leída de los contratos.

### Cited Findings
- Uber Eats Orders web: merchants-beta.ubereats.com con usuario y contraseña del restaurante; "la funcionalidad es limitada y el dispositivo puede no sonar ni conectar con la impresora"; "esta pestaña debe permanecer abierta para seguir en línea" — [Uber Eats outage support (GB)](https://merchants.ubereats.com/gb/en/uber-eats-outage-support/)
- Contrato Uber Eats (SE): las Uber Tools solo pueden usarse "en relación con el uso de los Servicios Uber Eats" (cl. 1(f)); prohibido usarlas para competir con Uber o hacer ingeniería inversa (cl. 2(d)); la información confidencial incluye datos transaccionales y operativos de ventas y no puede revelarse a terceros (cl. 11(a)); los datos personales del cliente solo para entregar el pedido y el comercio "no copiará, almacenará, retendrá, sacará de las Uber Tools ni tratará de otro modo" esos datos (cl. 11(b)); prohibido combinarlos para marketing o analítica (cl. 11(f)); no compartir credenciales con terceros (cl. 11(e)). En la parte leída no hay cláusula expresa contra scraping o acceso automatizado — [Uber Eats Merchant Terms (SE)](https://www.uber.com/se/en/legal/uber-eats-merchant-terms-and-conditions/)
- Condiciones Glovo España: los datos de clientes "se ceden con el único fin de gestionar los Pedidos" (cl. 6). En la parte leída (100.000 de 369.000 caracteres) no se halló cláusula de acceso automatizado — [Glovo: Términos Partners (ES)](https://glovoapp.com/docs/es/legal/terms-partners/)
- Un blog de terceros afirma que los Términos de Uso de Uber prohíben scripts de scraping según el país (sin citar cláusula) — [ScrapingBee](https://www.scrapingbee.com/blog/how-to-scrape-uber-eats-data/)

### Inferences
- Una extensión que lea la propia cuenta del restaurante, en su navegador, sin dar credenciales a GastroGoan ni enviar datos a un servidor ajeno, es lo menos arriesgado; aun así podría chocar con "uso solo en relación con los servicios" y con la confidencialidad de datos transaccionales (cl. 11(a) Uber) si se interpreta GastroGoan como tercero. Imprescindible: descartar nombre, teléfono y dirección del cliente (cl. 11(b) Uber, cl. 6 Glovo, RGPD) y quedarse con importes, hora, ID y platos.
- Riesgo práctico más que penal: suspensión de la cuenta del restaurante y roturas por cambios de la web. Una extensión además obliga a usar Chrome de escritorio (no tablets Android/iPad), lo que encaja mal con el uso real en cocina.
- Es más defendible leer los ficheros que la plataforma entrega al restaurante (facturas, CSV): son del propio negocio y el art. 9 P2B obliga a describir ese acceso.

### Gaps
- Texto completo de la sección de datos/uso aceptable de las condiciones de Glovo España, Uber Eats España y Just Eat España (no leído completo; las de Uber leídas son las suecas).
- No se buscó jurisprudencia española concreta sobre scraping de cuentas propias; no se puede afirmar el riesgo legal más allá de lo contractual y el RGPD.

## 5. Funcionamiento con varias pantallas y reenvío de notificaciones Android

### Takeaway
Es viable tener la app de la plataforma y GastroGoan en aparatos separados (lo normal), o la web de Uber Eats en una pestaña. Existen apps Android de código abierto que reenvían notificaciones de apps elegidas a un webhook (NotificationListenerService), pero no se encontró ninguna que exporte específicamente pedidos de estas plataformas, y el texto de una notificación no contiene la comisión ni el detalle económico.

### Cited Findings
- Notification2Webhook (Android 7+): reenvía notificaciones de apps seleccionadas a una URL de webhook — [GitHub BigShoots/NotificationWebhookApp](https://github.com/BigShoots/NotificationWebhookApp)
- Message487 (F-Droid): envía notificaciones seleccionadas y SMS a un endpoint HTTPS; avisa de duplicados en reintentos — [F-Droid](https://f-droid.org/en/packages/life.andre.message487/)
- Otros: Message Mirror (listener en Kotlin que publica JSON), FlowBell (agrupa notificaciones cada pocos segundos), NotificationForwarder (con receptor Node.js) — [DEV: Message Mirror](https://dev.to/dragonborn/message-mirror-a-tiny-resilient-android-notification-sms-forwarder-flutter-kotlin-36om), [GitHub NotificationForwarder](https://github.com/ItsAzni/NotificationForwarder)
- Tasker + AutoNotification puede interceptar cualquier notificación y mandarla por webhook — [Homey community](https://community.homey.app/t/connect-with-webhook-json-format-and-use-in-flow/63539/5)
- Todas requieren permiso de acceso a notificaciones y la optimización de batería de algunos fabricantes puede matar el servicio (según resumen de búsqueda sobre esos proyectos)
- La tablet de Glovo es propiedad de Glovo (cl. 3.8 condiciones ES) — [Glovo: Términos Partners (ES)](https://glovoapp.com/docs/es/legal/terms-partners/)

### Inferences
- Un webhook necesita un receptor: GastroGoan no tiene backend; podría apuntar a la Firebase del propio negocio (REST con reglas que lo permitan), sin coste para GastroGoan, pero añade configuración y una superficie de escritura abierta que habría que validar.
- La notificación solo da aviso de "nuevo pedido" (quizá número e importe), útil como contador/alarma, no como contabilidad; los datos se cuadrarían después con la liquidación.
- Instalar apps de terceros en la tablet que presta Glovo probablemente no esté permitido o esté bloqueado (dispositivo gestionado); sería en un móvil propio del restaurante.
- Pantalla partida en Android con app de plataforma + GastroGoan web es posible a nivel de sistema, pero no aporta captura de datos: solo comodidad para que el personal teclee el pedido.

### Gaps
- Qué texto exacto muestran las notificaciones de Glovo/Uber Eats/Just Eat para restaurantes (si llevan importe o platos).
- No se encontró ninguna app que exporte pedidos de estas plataformas desde notificaciones, ni experiencias de restaurantes con este enfoque.
- No se verificó si los Sunmi de Glovo permiten instalar apps ajenas o pantalla partida.
