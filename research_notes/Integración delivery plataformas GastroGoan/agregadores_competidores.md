# Agregadores de delivery y cómo integran los TPV competidores (España, nov. 2026)

Alcance: middleware y agregadores (HubRise, Deliverect, Ordatic, Sinqro, Last.app y otros) que llevan pedidos de Glovo, Uber Eats o Just Eat a un TPV, y cómo lo hacen los TPV de la competencia en España. Se investigó el 17/11/2026. Hubo unas 18 consultas. Dos sitios no se podían abrir desde esta sesión por la red: developers.hubrise.com (la documentación equivalente está en www.hubrise.com/developers y sí se leyó) y ordatic.com.

## HubRise: precio, API, OAuth, callbacks, CORS, plataformas, campos, alta como app

### Takeaway
HubRise es la única opción encontrada con una API pública y documentada a la que puede conectarse cualquier proveedor nuevo. La paga cada restaurante: 35 € + IVA al mes por local, sin límite de pedidos y sin plan gratuito. Su API acepta llamadas desde el navegador (CORS `*`) y tiene callbacks "pasivos" que se consultan por polling, sin servidor propio. El intercambio del token OAuth, en cambio, debe hacerse desde un servidor, porque usa el client secret.

### Cited Findings
- **Precio estándar:** 35 € al mes por local, sin IVA. Pedidos ilimitados ("No limit for standard locations"), conexiones ilimitadas, sin permanencia y sin cuota de alta. Paga el local. — [HubRise Pricing](https://www.hubrise.com/pricing)
- **Cadenas:** los locales 1–5 pagan 35 € cada uno, los 6–30 pagan 30 € y del 31 en adelante, 27 €. Ejemplo de la página: 12 locales = 385 €/mes. — [HubRise Pricing](https://www.hubrise.com/pricing)
- **Dark kitchens:** se paga por volumen. 35 € hasta 1.500 pedidos, 55 € hasta 3.000, 75 € hasta 4.500 y 20 € más por cada 1.500 adicionales. Además, 25 € únicos de alta por marca y plataforma. — [HubRise Pricing](https://www.hubrise.com/pricing)
- **Sin plan gratuito ni comisión por pedido:** la página de precios no muestra ninguna de las dos cosas. — [HubRise Pricing](https://www.hubrise.com/pricing)
- **Desarrollo gratis:** mientras se desarrolla, HubRise no cobra la suscripción, para poder hacer pedidos de prueba ilimitados. — [HubRise Integration guide](https://www.hubrise.com/developers/integration-guide)
- **Cómo se empieza:** se escribe a integration@hubrise.com. La conexión se pide a nivel de local, con los permisos mínimos (normalmente `orders.write` y `customers.read/write`; `catalog` si se toca la carta). HubRise recomienda ofrecer "one-click OAuth" desde el back office del proveedor. — [Integration guide](https://www.hubrise.com/developers/integration-guide)
- **Salir en su directorio de apps:** hace falta pasar una evaluación de la integración ya funcionando. HubRise revisa los registros de las transacciones de prueba, pide rellenar una "Integration Sheet" y hace una llamada de ~1,5 h con un ingeniero. Después documenta la integración y la publica en "Integrated Apps". No se encontró ninguna cuota por aparecer en el directorio. — [Integration guide](https://www.hubrise.com/developers/integration-guide)
- **Flujos OAuth 2.0:**
  - *Web flow:* el código se canjea por token con `POST /oauth2/v1/token` y Basic auth (client_id + secret).
  - *Installed app flow:* usa `redirect_uri=urn:ietf:wg:oauth:2.0:oob`. El usuario copia el código a mano y el secret viaja dentro de la aplicación.
  - Los tokens de acceso **no caducan**, aunque pueden invalidarse por impago, revocación o bloqueo (la API devuelve 401).
  - Al autorizar, el usuario elige un solo local.

  — [HubRise Authentication](https://www.hubrise.com/developers/api/authentication)
- **Token desde el navegador:** las peticiones de token y de revocación deben salir de un servidor, no del navegador, para evitar el error de CORS y proteger el secret. — [Authentication](https://www.hubrise.com/developers/api/authentication)
- **CORS:** la API responde `Access-Control-Allow-Origin: *`, es decir, acepta peticiones del navegador desde cualquier origen. El servidor OAuth tiene una política más estricta. HubRise advierte de que llamar desde el navegador expone el token del usuario y recomienda un proxy. — [General concepts](https://www.hubrise.com/developers/api/general-concepts)
- **Límites de uso:** 500 peticiones/min, 2.500/h y 10.000/día por conexión. `GET /orders` y `GET /catalogs/:id` tienen además un tope de 10 por minuto. — [General concepts](https://www.hubrise.com/developers/api/general-concepts)
- **Callbacks activos:** HubRise hace un POST a la URL del proveedor, que debe responder 2xx–4xx en menos de 20 s. Si falla, reintenta hasta 6 veces. La firma va en `X-HubRise-Hmac-SHA256`, un HMAC-SHA256 del cuerpo con el client secret. — [Callbacks](https://www.hubrise.com/developers/api/callbacks)
- **Callbacks pasivos:** son el respaldo para clientes que no pueden montar un callback activo. Se consulta `GET /callback/events` cada ≥30 s (sugieren "cada minuto") y cada evento procesado se borra con `DELETE /callback/events/:id`. **No necesitan URL de servidor.** La lista no trae el estado del pedido, así que hace falta un GET del recurso. — [Callbacks](https://www.hubrise.com/developers/api/callbacks)
- **Importes:** número con dos decimales seguido del código de moneda ISO 4217. Se pueden adjuntar refs privadas a pedidos y líneas. — [General concepts](https://www.hubrise.com/developers/api/general-concepts)
- **Glovo:** HubRise tiene una página "Glovo Bridge" que se conecta desde su back office. El restaurante tiene que ser partner de Glovo. La página habla de traer pedidos (con su estado) y datos de cliente cuando reparte el propio restaurante. No confirma España ni da precio del bridge. — [HubRise – Glovo](https://www.hubrise.com/apps/glovo)

### Inferences
- **Modelo de coste:** cuadra con la regla de GastroGoan. El restaurante paga HubRise (35 €/mes) desde su cuenta y GastroGoan, como proveedor, no paga nada (desarrollo gratis; no se vio cuota de directorio).
- **App 100 % en navegador:** es técnicamente viable para leer pedidos. CORS `*` más callbacks pasivos por polling cada ~60 s permiten hacerlo sin backend.
- **El obstáculo es el OAuth.** El token se intercambia en servidor con el secret. Hay tres salidas:
  - (a) un Worker mínimo de Cloudflare que solo canjee el código, como el de pagos actual. Coste por cliente ~0 dentro del plan gratuito, pero hay que comprobar los límites.
  - (b) el flujo "installed app / oob". El secret iría en el JS público, que se ve en un repo público, y el usuario tendría que copiar el código. Puede que HubRise no lo acepte para una app web.
  - (c) un token generado a mano. Hay que confirmarlo con HubRise.
- **Token a la vista:** como el token no caduca y quedaría en el aparato o en la Firebase del negocio, un token filtrado da acceso a los pedidos de ese local. Es un riesgo parecido al ya asumido con `tenants/$tenantId`.
- **Polling:** si cada aparato abierto consulta, se gasta del límite de 10.000 peticiones/día por conexión. A una cada 60 s son ~1.440/día por aparato, así que conviene que solo un aparato consulte.

### Gaps
- No se pudo leer el esquema exacto de un pedido de HubRise (items, opciones, `charges`, `payments`, `discounts`, `deals`, si trae la comisión de la plataforma) porque developers.hubrise.com estaba bloqueado. Hay que verlo en www.hubrise.com/developers/api/order-management.
- No se confirmó que existan bridges de Uber Eats y Just Eat activos en España, ni quién los hace, ni si tienen coste aparte. La página de Glovo Bridge tampoco da país ni precio.
- No está claro si el flujo installed/oob se permite a una app web y si HubRise certificaría una integración sin servidor.

## Deliverect: programa de partners, requisitos, coste para el restaurante, modelo de API

### Takeaway
Deliverect es el agregador dominante con los TPV españoles (Revo, por ejemplo). No publica precios en España, solo presupuesto a medida, y su API de TPV **exige webhook y no admite polling**. Una app sin servidor no puede integrarse sin un intermediario. En foros de desarrolladores se habla de un umbral de ~100 locales para entrar como partner, pero no está confirmado.

### Cited Findings
- **Precios:** la página española no muestra precios. El coste depende de la ubicación, la escala, el número de locales y la solución elegida (Restaurants, Retail, Direct, Dispatch). Se pide demo o presupuesto. — [Deliverect precios ES](https://www.deliverect.com/es-es/precios)
- **Precios de terceros:** Capterra España le da 2,2/5 en calidad-precio. Una noticia antigua de Forbes ES sobre "Deliverect Prime" menciona un descuento de 100 €/mes en la cuota mensual, sin dar la cuota. Esta cifra es de terceros y no está vigente. — [Capterra ES](https://www.capterra.es/software/197514/delivery-management-sofware); [Forbes ES](https://forbes.es/?p=373912)
- **Integrar un TPV:**
  - Se rellena una solicitud de partner y el equipo de Partnerships guía el proceso.
  - Hay que superar una certificación contra un documento de funcionalidades obligatorias, con una llamada de certificación.
  - **"Polling is not supported; you must configure an Orders Webhook URL."**
  - Pasos: registrar la URL del webhook del TPV, sincronizar productos, obtener los canales y configurar el webhook de notificación de pedidos.

  — [Deliverect Developers – POS integration overview](https://developers.deliverect.com/v1.1-restaurants/docs); [Become an integration partner](https://developers.deliverect.com/docs/building-a-channel-integration-overview) (resumen del buscador)
- **Umbral de 100 locales:** varios posts del foro de Deliverect dicen que el formulario descartaba a solicitantes por debajo de un mínimo de locales, y uno cita 100. Son posts de usuarios, no política oficial. — [Deliverect developer forum](https://developers.deliverect.com/discuss/691d05446819c39894db041f)
- **Glovo:** Deliverect lo integra, pero "only available for existing Deliverect customers" y exige suscripción a Glovo y a Deliverect. — [Deliverect – Glovo](https://deliverect.com/en/integrations/glovo)
- **Revo:** Deliverect anuncia una integración bidireccional con Revo XEF, que se configura en Revo con datos de cuenta que da Deliverect. — [Deliverect – Revo](https://www.deliverect.com/en/integrations/revo); [Help: Revo XEF configure Deliverect](https://help.deliverect.com/en/articles/7979259-revo-xef-configure-deliverect-and-upload-products)

### Inferences
- Para GastroGoan, Deliverect no encaja como primera opción por tres motivos:
  - obliga a tener un servidor para el webhook;
  - parece pedir un volumen mínimo para aceptar al partner;
  - el precio es opaco y, según terceros, alto.
- Además, al hostelero pequeño le añade una cuota que suele superar la de HubRise (estimación; no hay precio oficial).

### Gaps
- No hay precio oficial en euros para un restaurante español.
- El umbral de locales para partners de TPV no está confirmado oficialmente.

## Competidores españoles: quién integra Glovo, Uber Eats y Just Eat, cómo y cuánto cobra

### Takeaway
Los TPV españoles modernos lo resuelven de dos formas. Last.app tiene agregador propio incluido en el plan, con tope de pedidos y coste por pedido extra. Los TPV clásicos (Revo XEF) dependen de un agregador externo: Deliverect, Sinqro u Ordatic. Qamarero tiene Uber Eats y Just Eat dentro de un plan "Delivery", con Glovo "próximamente". Ninguno incluye la comisión de la plataforma como dato del pedido según sus páginas públicas.

### Cited Findings
- **Last.app (precios por local, sin IVA, facturación anual):**

  | Plan | Cuota | Pedidos delivery incluidos | Pedido extra | Integraciones |
  |---|---|---|---|---|
  | Starter | 50 €/mes | 100 | 0,25 € | 1 |
  | Growth | 95 €/mes | 550 | 0,19 € | 6 |
  | Unlimited | 175 €/mes | ilimitados | — | ilimitadas |

  Se suma una instalación única de 500 € + IVA. Glovo, Uber Eats y Just Eat se conectan a su TPV "a través del agregador de delivery, incluido en todos los planes". — [Last.app pricing](https://www.last.app/en/pricing)
- **Last.app, comportamiento con cada plataforma:**
  - Uber Eats y Glovo: integración bidireccional con aceptación automática de pedidos.
  - Just Eat: los pedidos también se aceptan solos, pero no se pueden cancelar desde Last.app.
  - Promociones y zonas de reparto se gestionan en el portal de cada plataforma.

  — [Last.app help – Uber](https://help.last.app/portal/en/kb/articles/integrations-uber); [Glovo](https://help.last.app/portal/en/kb/articles/integrations-glovo); [Just Eat](https://help.last.app/portal/en/kb/articles/integrations-just-eat)
- **Qamarero:**
  - Uber Eats está disponible: los pedidos entran al TPV y al KDS, y la carta, los precios y los horarios se gestionan desde Qamarero.
  - Just Eat está disponible con el "plan Delivery", y lo configura su equipo.
  - Glovo está "próximamente".
  - El pedido llega "con su origen, productos, modificadores y notas" y la modalidad (domicilio o recogida). **No aparece la comisión** ("cada plataforma mantiene sus tarifas").
  - Uber Eats se queda con los datos del cliente.
  - No dice si la integración es nativa o pasa por un agregador.

  — [Qamarero integrador delivery](https://qamarero.com/integrador-delivery-restaurantes/)
- **Precio de Qamarero:** según su propio blog (4/11/2026), el delivery va "por propuesta" y el total es de 249 €/mes + IVA, con pagos, delivery, equipos y alta aparte. — [Qamarero blog 2026](https://qamarero.com/blog/mejores-software-pedidos-online-restaurantes/)
- **Discrepancia sobre Glovo:** el blog de Qamarero dice que Glovo sigue "próximamente" en Last.app, pero la ayuda oficial de Last.app documenta la integración con Glovo. Prevalece la fuente oficial. — [Qamarero blog](https://qamarero.com/blog/mejores-software-pedidos-online-restaurantes/) vs [Last.app Glovo](https://help.last.app/portal/en/kb/articles/integrations-glovo)
- **Revo XEF (Cegid Revo):** usa Deliverect (integración bidireccional). También existe la ruta Uber Eats → Sinqro → Revo. Revo no publica precio, solo presupuesto. — [Deliverect – Revo](https://www.deliverect.com/en/integrations/revo); [Sinqro Revo + Uber Eats](https://sinqro.com/compatibility/revo+ubereats); [Qamarero blog](https://qamarero.com/blog/mejores-software-pedidos-online-restaurantes/)
- **Ordatic (agregador español):** lleva los pedidos de Uber Eats y Glovo directamente al TPV. Para Glovo "you just need to subscribe on Glovo and Ordatic". Waitry lo usa como socio para Glovo, Just Eat y Uber Eats. No se encontró precio. — [Ordatic – integrate Glovo](https://ordatic.com/en/integrate-glovo/) (resumen del buscador; el sitio no se pudo abrir); [Picker Express](https://www.pickerexpress.com/en/partners-ecommerce/ordatic); [Waitry](https://waitry.net/en/optimize-the-management-of-your-delivery-orders-with-waitry-and-ordatic)
- **Otros con precio publicado (pedidos online propios, no agregación):**
  - Delitbee: Start sin cuota fija, con 7 % + 0,50 € por pedido; Pro a 69,90 €/mes con 3 % + 0,30 €.
  - Waitry: 60 €/mes, más 1,5 % por pedido de take away o delivery.
  - Flipdish: desde 49 €/mes.
  - GloriaFood anuncia su cierre en 2027.

  — [Qamarero blog 2026](https://qamarero.com/blog/mejores-software-pedidos-online-restaurantes/) (fuente de un competidor; tómese como estimación)

### Inferences
- Precio de mercado en España para "delivery integrado en el TPV": va de unos 35 €/mes (HubRise solo) a 50–175 €/mes (Last.app con TPV incluido), más instalación. Un hostelero pequeño ya paga algo así por su TPV más el agregador. Si GastroGoan delega en HubRise, el sobrecoste para el restaurante (35 €/mes) es comparable o menor.
- Ningún competidor anuncia que guarde la comisión de la plataforma en el pedido. La comisión suele llegar después, en la factura o liquidación de la plataforma. GastroGoan tendría que estimarla con el % pactado (ya tiene `facturaReal` e `isp` para plataformas en Gestión Económica).
- Lo habitual es usar un agregador (Deliverect, Sinqro, Ordatic, HubRise). La certificación directa con cada plataforma la hacen pocos; Last.app parece tener su propio agregador.

### Gaps
- **No investigados por límite de tiempo y consultas:** Otter, Orderlord, Cuenti, Bitpos, Mapal, Glop, Ágora, Haddock, Camarero10, Numier, ICG y Lightspeed. Para ninguno hay datos verificados de integración ni de precio.
- Sinqro: no se encontró página de precios (su /pricing devuelve 404), ni plataformas, ni si tiene API abierta para TPV nuevos. Solo se confirmó la compatibilidad Revo + Uber Eats.
- Ordatic: no se encontraron precios ni condiciones para un TPV nuevo; el sitio no se pudo abrir desde esta sesión.
- No se verificaron APIs directas de Glovo, Uber Eats o Just Eat para TPV nuevos. Lo cubren otros investigadores.

## Opción gratuita o muy barata con API abierta para un proveedor pequeño

### Takeaway
No se encontró ningún agregador gratuito con API abierta. HubRise es lo más abierto y transparente (35 €/mes que paga el restaurante, desarrollo gratis y documentación pública). Deliverect está cerrado tras partnership y certificación, y Ordatic y Sinqro no publican condiciones.

### Cited Findings
- **HubRise:** sin plan gratuito; 35 €/local/mes; API y docs públicas; desarrollo sin coste. — [HubRise Pricing](https://www.hubrise.com/pricing); [Integration guide](https://www.hubrise.com/developers/integration-guide)
- **Deliverect:** sin precios públicos; partnership con certificación; webhook obligatorio. — [Deliverect precios](https://www.deliverect.com/es-es/precios); [Deliverect developers](https://developers.deliverect.com/v1.1-restaurants/docs)

### Inferences
- **Camino más barato y compatible con "nada le cuesta a GastroGoan por cliente":** HubRise, pagado por cada restaurante, con callbacks pasivos leídos desde el navegador y un único paso de servidor (el canje del código OAuth) en un Worker gratuito. Alternativa: pedir a HubRise que permita un token manual por local.
- **Esfuerzo:** hay que contar con una evaluación de ~1,5 h para salir en su directorio.

### Gaps
- No se confirmó si HubRise ofrece condiciones de reventa o "white-label" para proveedores; la página cita "Find out more" sin cifras.
- Tampoco si hay descuentos para el restaurante cuando el TPV es partner.
