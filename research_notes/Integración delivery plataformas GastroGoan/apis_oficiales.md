# APIs oficiales de pedidos de las plataformas de delivery en España (Glovo, Uber Eats, Just Eat Takeaway.com, Deliveroo) y qué hace falta para ser integrador

Fecha de la investigación: 17/11/2026. Fuentes: documentación oficial cuando se pudo abrir y, si no, terceros (marcados como tales). Varios portales oficiales (api-docs.glovoapp.com/partners, developers.just-eat.com) se montan con JavaScript y la herramienta de lectura los devolvió vacíos. Lo que en ellos haya **no está verificado** aquí.

## Glovo (Delivery Hero): Partner API / Order API, requisitos, webhooks, campos, estados, catálogo y entorno de pruebas

### Takeaway
Glovo tiene una **Partner API** oficial (Order API + Stock & Price API) con OAuth 2.0 client credentials, webhooks de pedido creado y cancelado, cambios de estado (ACCEPTED, READY_FOR_PICKUP…) y entorno de pruebas. Las claves se piden al account manager o desde el Partner Portal («Shop Integrations Plugin»). Esa documentación está escrita para Q-Commerce (supermercados y tiendas). Para restaurantes, la vía de integración del TPV es la de Delivery Hero (Integration Middleware + un «plugin» que aloja el proveedor del TPV), con credenciales que entrega un representante local tras aprobación. Sea cual sea la vía, **el integrador tiene que exponer un endpoint HTTPS público**.

### Cited Findings
- La Partner API son dos APIs: la «Order API» gobierna la integración del TPV entre los socios y Delivery Hero y permite recibir y gestionar los pedidos entrantes; la «Stock & Price API» gestiona disponibilidad y precios — [Glovo Partners API (qcommerce-integrations)](https://qcommerce-integrations.glovoapp.com/this-is-api-detail-page)
- Obtener credenciales: «Contact your account manager or visit our Partner Portal to request your API keys». Las claves se generan en el Partner Portal, en «Shop Integrations Plugin» dentro de «All Settings». Las credenciales de sandbox son autoservicio en el Partner Portal o se piden al account manager. Producción y sandbox son credenciales distintas — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Autenticación: «Our platform uses OAuth 2.0 Client Credentials Flow». Token JWT que se cachea hasta `expires_in`. La clave es por cadena: «manage all outlets in the chain with a single API key», y los endpoints de cada local llevan `vendor_id`. El endpoint de token admite 50 peticiones/minuto por client ID — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Guía de integración, versión más antigua: Glovo entrega un token de webhook para stage y otro para producción, y en producción «All the stores use the same token». Antes de aceptar el pedido, Glovo debe recibir las URL de tus endpoints y su equipo de integraciones tiene que aprobarlo. Pasos: Glovo crea una tienda de prueba, compartes la carta con su plantilla, Glovo crea las tiendas de producción con tu `external_id`, se conecta un local y después se activa el resto — [Glovo Partners API (qcommerce-integrations)](https://qcommerce-integrations.glovoapp.com/this-is-api-detail-page)
- Webhooks: notificación de pedido creado y de pedido cancelado — [Glovo Partners API (qcommerce-integrations)](https://qcommerce-integrations.glovoapp.com/this-is-api-detail-page). En la v2, un webhook «will be retried up to 5 times» — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Campos del pedido en la v2: `order_id`, `order_code`, `order_type` (DELIVERY/PICKUP), `status`, `promised_for`, `comment`, `cancellation`, `customer` (first_name, last_name, phone_number, delivery_address, national_id; «All the details inside are masked to protect customer identity»), `items` (sku, name, pricing, original_pricing, promotion, instructions, status) y `payment` (sub_total, order_total, delivery_fee, service_fee, discount, total_taxes, type). **No se encontraron campos de comisión ni de modificadores/atributos** — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Estados: `PUT /v2/chains/{chain_id}/orders/{order_id}` con ACCEPTED, READY_FOR_PICKUP, DISPATCHED o UPDATE_CART. Ese endpoint no tiene estado de cancelar. CANCELED solo llega como webhook («canceled by the customer, delivery rider or the partner») — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Catálogo y stock: actualización masiva (POST) y PATCH por producto, con un límite de «120 calls per minute per store». Aviso de la documentación: subir un catálogo nuevo pone TODOS los productos como disponibles. Antes de salir a producción hay que enviar la primera actualización de precio y stock — [Glovo Partners API (qcommerce-integrations)](https://qcommerce-integrations.glovoapp.com/this-is-api-detail-page)
- Entorno de pruebas: hosts `stageapi.glovoapp.com` y `api.glovoapp.com` en la guía antigua, con pedidos de prueba en testglovo.com (Barcelona) — [qcommerce-integrations](https://qcommerce-integrations.glovoapp.com/this-is-api-detail-page). En la v2 el sandbox es `https://sandbox.partner.deliveryhero.io`, y las credenciales de producción no funcionan en él — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- La v2 no menciona restaurantes: habla de Q-Commerce («Internal Store ID / Vendor ID defined under Q-Commerce by Catalog») — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)
- Vía de restaurantes en Delivery Hero: la «Integration Middleware» reenvía los pedidos al TPV del local. El «Plugin» es el adaptador que construye el proveedor del TPV, que implementa los endpoints del plugin. Para las credenciales hay que dar una clave PGP pública; las comparte el representante local tras la aprobación. Pasos: pedir credenciales → desarrollar el plugin → dar su URL al representante → probar con un local de prueba → desplegar. El plugin «should support HTTPS protocol using a valid SSL certificate». Al aceptar hay que devolver la hora de entrega, al rechazar un motivo, avisar de «listo para recoger» y de no disponible / disponible. La carta va por la Catalog Import API. **La página no nombra a Glovo**: cubre Foodpanda, Talabat, Foodora, PedidosYa…, y para otras plataformas remite al «local representative» — [Delivery Hero POS docs](https://developers.deliveryhero.com/documentation/pos.html)
- En PedidosYa, otra marca de Delivery Hero, el plugin debe admitir en su lista blanca las IP de la Middleware — [integrar.pedidosya.com](https://integrar.pedidosya.com/es/documentation) (vía resultados de búsqueda, no se abrió)
- Integradores comerciales: Deliverect dice que su integración con Glovo tarda 3-5 días hábiles en activarse (dato de un tercero) — [Deliverect help](https://help.deliverect.com/en/articles/7979360-glovo-integration-overview). Last.app integra Glovo con aceptación automática — [Last.app](https://help.last.app/portal/en/kb/articles/integrations-glovo)

### Inferences
- Para un restaurante en España, lo más probable es que la integración pase por Glovo/Delivery Hero con aprobación manual (account manager o representante). No hay registro abierto de integradores documentado.
- El modelo de token es **por integrador** (o por cadena), no por restaurante. Ese secreto no puede vivir en el navegador del cliente: estaría en el JS de cada licencia.
- Los pedidos llegan **por push a una URL del integrador**. Una app sin servidor no puede recibirlos: necesita al menos un endpoint (p. ej. un Worker), que GastroGoan tendría que mantener.
- Con lo encontrado, la comisión de Glovo no llega en el pedido: habría que calcularla con el % pactado de cada restaurante o sacarla de facturas o informes.

### Gaps
- No se pudo leer api-docs.glovoapp.com/partners (la API de restaurantes de Glovo; la página se monta con JS). Quedan sin confirmar sus requisitos (tamaño de empresa, volumen, contrato, certificación), si hay cuota y qué modificadores/atributos llegan.
- No hay fuente oficial sobre el plazo de aprobación de un integrador nuevo ni sobre cuotas.
- Sin confirmar si la vía «Delivery Hero POS plugin» aplica hoy a Glovo España.

## Uber Eats: Marketplace APIs (NDA, licencia, partner manager, calidad, OAuth por comercio, webhooks)

### Takeaway
Para acceder hay que firmar un **NDA y un acuerdo de licencia de API**, tener aprobación de un partner manager de Uber Eats y que Uber active los scopes en lista blanca. Hay una verificación conjunta antes de salir a producción. Se exige un 99 % de inyección como mínimo (objetivo 99,9 %), y si no se cumple Uber puede retirar el acceso o desactivar locales. Los webhooks van a una URL del integrador, firmada con HMAC del client secret. Cada comercio autoriza con OAuth authorization_code, pero los pedidos se operan con un token client_credentials del integrador. Para un proveedor pequeño en España es poco realista a corto plazo.

### Cited Findings
- Requisitos previos: «Complete NDA and API licensing agreement». Se empieza con una app de sandbox. La aprobación pasa por el partner manager de Uber Eats. Para usos distintos del cumplimiento de pedidos: «ensure you have an aligned business agreement with Uber ahead of beginning development». Los tokens client-credentials caducan a los 30 días. Dominios de pruebas: test-api.uber.com y sandbox-auth.uber.com — [Uber Getting Started](https://developer.uber.com/docs/eats/guides/getting-started)
- «Access to These APIs May Require Written Approval From Uber». Para dudas de negocio, «Contact your Uber Eats partner manager» — [Uber Eats Marketplace APIs](https://developer.uber.com/docs/eats/introduction)
- Salida a producción: se pide por soporte técnico una «integration verification» conjunta. Después hay que crear la app de producción con una cuenta de Uber de producción aparte y enviar su client_id para que activen los scopes Eats en lista blanca. Cada URL de webhook distinta necesita su propia cuenta y app de producción. El local piloto se comunica al partner manager con al menos una semana de antelación. Para ampliar a más locales: «a minimum of three days with an injection success rate of 98% or higher». No se indica un mínimo de comercios — [Uber Going Live](https://developer.uber.com/docs/eats/guides/going-live)
- Calidad: objetivo de inyección del 99,9 %. Son obligatorios la gestión de la integración (Activate/Update/Remove), los webhooks de notificación y de fallo de pedido, el Accept/Deny/Cancel explícito, el estado de la tienda y el tiempo de preparación, y el Menu API V2. Hay que **rechazar el pedido si los alérgenos o las instrucciones especiales no pueden llegar al TPV**. Un incumplimiento «may result in temporarily or permanently revoked API access and/or removal or disabling of merchant stores» — [Uber Quality & Performance](https://developer.uber.com/docs/eats/quality-and-performance)
- Webhooks: una URL principal por app. Cabecera `X-Uber-Signature` = HMAC-SHA256 del cuerpo con el client secret. Hay que responder 200 con el cuerpo vacío y luego llamar a `/accept_pos_order` o `/deny_pos_order`. Si no, el pedido se cancela solo (plazo de 11,5 min; llamada automática al local a los 90 s). Reintentos a los 10 s y después con espera creciente, 7 intentos en total. El webhook solo trae `resource_href`, y el pedido completo se pide aparte. Eventos: `orders.notification`, `orders.release`, `store.menu_refresh_request`, `store.provisioned` — [Uber Webhooks](https://developer.uber.com/docs/eats/guides/webhooks); [Uber intro](https://developer.uber.com/docs/eats/introduction)
- Autorización por comercio: el scope `eats.pos_provisioning` es authorization_code (el comercio inicia sesión en la pantalla de consentimiento de Uber y **tu servidor** canjea el código). La operación diaria (`eats.order`) usa client_credentials. Un mismo token no puede llevar los dos scopes. La tienda se provisiona con `POST /v1/eats/stores/{store_id}/pos_data` — [Uber Integration Activation Flows](https://developer.uber.com/docs/eats/guides/integration-activation-flows), [Uber Authentication](https://developer.uber.com/docs/eats/guides/authentication) (resumen vía resultados de búsqueda; las páginas no se abrieron enteras)
- Coste: Uber no cobra un extra por la integración, aunque el proveedor del TPV puede cobrarla. Fuente: web de comercios de Suiza, no de España — [merchants.ubereats.com (CH)](https://merchants.ubereats.com/ch/en/resources/learning-center/pos/)
- Las pymes suelen integrarse a través de su proveedor de TPV, y el autoalta varía según ese proveedor (web de Alemania) — [merchants.ubereats.com (DE)](https://merchants.ubereats.com/de/en/resources/learning-center/pos/)

### Inferences
- El client secret firma los webhooks y da tokens para TODOS los comercios. Es un secreto del integrador y obliga a tener servidor: no puede estar en el navegador.
- Con 99 % de inyección, piloto supervisado y partner manager, Uber busca integradores con volumen y soporte. Un proveedor sin backend y sin clientes en Uber difícilmente conseguirá el acuerdo.

### Gaps
- No hay fuente oficial sobre criterios de elegibilidad, plazos o cuotas para España.
- Sin confirmar si el pedido trae la comisión. Probablemente haga falta otra API de informes o pagos, sin verificar.

## Just Eat Takeaway.com (España): JET Connect / Partner API

### Takeaway
La vía documentada para integrar un TPV es **JET Connect** (antes Flyt). La clave de API solo se da a socios **con acuerdo comercial**. Los pedidos se **empujan** a un endpoint del integrador (con Authorization y/o HMAC `X-JET-Connect-Hash`), que acepta o rechaza en 5 minutos. No se encontró confirmación oficial de cómo funciona hoy en España.

### Cited Findings
- JET entrega la clave de API solo a socios con acuerdo comercial («JET gives its API key only to partners under a commercial agreement»). Alta por local: enlace de un solo uso a la clave de la marca (válido 7 días), configuración, envío de carta y horarios y llamada `go-live`. Las llamadas salientes llevan la cabecera `X-Flyt-Api-Key`, por marca. Los webhooks entrantes se verifican con una clave Authorization, con HMAC-SHA256 en `X-JET-Connect-Hash` o con ambos. Pedidos por push al endpoint «Receive Order»: se responde 200 si se inyectó en el TPV, o 202 y luego aceptar/rechazar en 5 min. Eventos: Receive Order, Cancel Order, Driver Status, Restaurant Temporarily Offline y Failed Order. **No se pueden leer ni listar pedidos** — [paquete no oficial omnifood/justeat (Packagist)](https://packagist.org/packages/omnifood/justeat). ⚠️ Es un paquete no oficial, escrito desde la documentación pública de JET y no probado contra la API real.
- La configuración de JET Connect pide un identificador de restaurante y, opcionalmente, una clave de API de carta, que da el contacto de JET Connect. Fuente: proveedor de TPV alemán — [get-sides.de](https://support.get-sides.de/portal/en/kb/articles/jet-connect-set-up)
- En España, Qamarero se contradice sobre su integración con Just Eat: en una página está activa y en otra aparece como «Próximamente» — [Qamarero integrador delivery](https://qamarero.com/integrador-delivery-restaurantes/), [Qamarero blog](https://qamarero.com/blog/mejores-software-pedidos-online-restaurantes/)

### Inferences
- El modelo es igual que los demás: secreto del integrador y webhook entrante, así que hace falta servidor.
- Antes de escribir código hace falta un acuerdo comercial con JET.

### Gaps
- developers.just-eat.com no se pudo leer (portal con JS). Sin requisitos oficiales, cuotas, plazos ni confirmación de que JET Connect cubra el mercado español.

## Deliveroo: situación en España

### Takeaway
**Deliveroo no opera en España desde el 29/11/2021.** Su API no sirve para restaurantes españoles.

### Cited Findings
- Deliveroo anunció que dejaba España, y su último día de operación fue el 29 de noviembre de 2021 — [Deliveroo corporate](https://corporate.deliveroo.co.uk/media/deliveroo-announces-agreement-end-operations-spain); [marketing4ecommerce](https://marketing4ecommerce.net/deliveroo-abandona-espana/)
- Motivo alegado: España era menos del 2 % de su volumen bruto (GTV) en los nueve primeros meses de 2021. El cierre coincidió con la Ley Rider — [Forbes.es](https://forbes.es/empresas/146085/deliveroo-perdidas-espana-27-millones/); [Eurofound](https://apps.eurofound.europa.eu/restructuring-events/detail/106015)

### Gaps
- No se revisaron los requisitos de la Order API de Deliveroo (api-docs.deliveroo.com): no aplica a España.

## Navegador sin servidor (CORS), modelo de autenticación y consecuencias para un proveedor sin backend

### Takeaway
**Ninguna de las tres plataformas activas permite un integrador que sea solo navegador.** Las tres **empujan** los pedidos por webhook a una URL HTTPS pública del integrador, y se autentican con un **secreto del integrador**: client secret de Uber, client credentials de Glovo por cadena, clave de API de JET por marca. Ese secreto no puede ir en un HTML que se entrega a cada cliente.

### Cited Findings
- Uber: los webhooks van a una URL configurada por app y se firman con el client secret. Los tokens de operación son client_credentials del integrador — [Uber Webhooks](https://developer.uber.com/docs/eats/guides/webhooks)
- Glovo: OAuth client credentials con clave de cadena, entrega por webhook con 5 reintentos — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications). Delivery Hero exige que el plugin esté en HTTPS con certificado válido — [DH POS docs](https://developers.deliveryhero.com/documentation/pos.html)
- JET: pedidos por push, sin endpoint para leer o listar pedidos — [omnifood/justeat](https://packagist.org/packages/omnifood/justeat) (no oficial)

### Inferences
- Para GastroGoan, integrarse supondría como mínimo un receptor de webhooks (un Worker de Cloudflare gratuito sirve técnicamente) que guarde el secreto, verifique firmas y reenvíe cada pedido a la Firebase de su negocio. Ese patrón ya existe con Stripe (`worker/pagos-worker.js`). Pero la responsabilidad contractual, la disponibilidad (99 % en Uber) y el soporte quedarían en GastroGoan, y el volumen de peticiones crece con las licencias. Hay que medirlo contra la regla de «coste cero por cliente».
- Las alternativas habituales en España (Deliverect, Last.app, Qamarero) ya hacen de agregador. Integrarse con un agregador (un contrato, una API) en vez de con cada plataforma es la vía que usan los TPV pequeños, aunque normalmente el coste lo paga el restaurante.
- Ninguna fuente menciona CORS. Como todo va por webhook, no es relevante: el problema es recibir, no llamar.

### Gaps
- Sin confirmar si alguna plataforma ofrece polling (leer pedidos), que permitiría a un cliente sin servidor consultarlos. JET dice explícitamente que no tiene. Para Glovo y Uber no se encontró un endpoint de listar pedidos pendientes.

## Datos personales (RGPD / encargo de tratamiento) como integrador

### Takeaway
No se encontró ningún documento oficial de las plataformas sobre el acuerdo de tratamiento que exigen al integrador. Glovo enmascara los datos del cliente en el pedido.

### Cited Findings
- En la v2 de Glovo, los datos del cliente (nombre, teléfono, dirección, `national_id`) vienen enmascarados: «All the details inside are masked to protect customer identity» — [Glovo Partner API v2.0.2](https://qcommerce.developer.glovoapp.com/api-specifications)

### Inferences
- Al recibir y reenviar pedidos con datos de clientes, GastroGoan actuaría al menos como encargado del tratamiento del restaurante (y posiblemente con obligaciones frente a la plataforma por el NDA y la licencia). Esto no está verificado con ninguna fuente.

### Gaps
- No se encontraron cláusulas de protección de datos de los acuerdos de integrador de Glovo, Uber o JET (son documentos bajo NDA o no públicos).
