# VeriFactu — estado y pendientes

Última actualización: 10/08/2026.

## ⚠️ 10/08/2026 — Invocash cambió de API, ya corregido

La integración que estaba "confirmada" el 31/07/2026 apuntaba a un esquema
de Invocash que **ya no es el vigente** (endpoint fijo `app.verifactuapi.es`,
cabecera `Authorization: Bearer`, campos AEAT en crudo tipo `IDEmisorFactura`).
Se probó en vivo esa noche con una cuenta real de Invocash y daba siempre
`401 Token inválido` — no era la cuenta ni la clave, era que su API había
cambiado de sitio y de forma.

**Confirmado en vivo (HTTP 200, factura creada de verdad) el 10/08/2026:**
- La URL **no es fija**: cada negocio tiene su propio dominio de Invocash
  (el mismo del panel, ej. `tunegocio.invo.cash`). Base real:
  `https://{dominio}/api`. Por eso ahora `DB.business.verifactu.domain` es un
  campo nuevo en Mi Negocio → VeriFactu, solo para el proveedor `verifactuapi`.
- Cabecera de autenticación: **`X-API-Key: <clave>`**, no `Authorization: Bearer`
  (ese formato es para el login de usuario del panel web, no para
  integraciones de terceros — su documentación lo distingue como dos
  esquemas de auth distintos: `bearerAuth` vs `apiKey`).
- Endpoint de creación: `POST /invoices` (no `/api/alta-registro-facturacion`).
- Esquema del payload: propio de Invocash, no los nombres de campo oficiales
  de la AEAT (`due`, `comments`, `verifactu_issuer_territory`, `simplified`,
  `lines[]` con `tax_base`/`tax_pctge`/`tax_amount` ya calculados por
  nosotros — la API no los calcula).

**Pendiente, sin confirmar todavía**: el segundo paso para VALIDAR la factura
recién creada y que se envíe de verdad a la AEAT. La respuesta de creación
trae `"validated": false` y `"verifactu_status": null` — la factura se queda
en borrador. `submitSaleToVerifactuApi()` ya crea la factura correctamente
pero lanza un error controlado a propósito después de crearla, para que la
venta quede en la cola de reintento en vez de darse por enviada sin estarlo.
Cuando se retome: mirar en su Portal de Desarrolladores → categoría
Facturación, endpoints hermanos de `POST /invoices` (algo tipo
`POST /invoices/{id}/validate` o similar) para ver cómo se dispara el envío
y cómo vienen la huella/QR en la respuesta.

## Estado actual (resto, sin cambios desde el 31/07)

El código de integración con VeriFactu **ya está implementado**, pero
la app lo muestra como "Vista previa / borrador" (`mn.verifactu.draftBadge` en
`js/i18n.js`) porque VeriFactu todavía no es obligatorio. No hay que tocar la
lógica de envío cuando llegue el momento — solo activar y rellenar lo que
falta más abajo (y completar el paso de validación pendiente de arriba).

### Ya hecho (código)

- **Envío a la API**: `submitSaleToVerifactuApi()` en `js/tpv.js` — creación
  de factura confirmada en vivo el 10/08/2026 (ver aviso arriba). Falta el
  paso de validación/envío a la AEAT.
- **Cola de reintentos**: `processVerifactuQueue()` — si falla el envío
  (sin conexión, error del proveedor), la venta queda `pending` y se
  reintenta solo cada `VERIFACTU_RETRY_MS`, sin bloquear el cobro ni la
  impresión del ticket.
- **Configuración por negocio**: `renderVerifactuConfigCard()` /
  `saveVerifactuConfig()` en `js/app.js` (dentro de Mi Negocio) — cada
  negocio pega su propia clave de API de su propia cuenta con el proveedor.
- **Exclusivamente VERI*FACTU**: una vez un negocio activa el envío y lo
  guarda, `DB.business.verifactu.lockedOnce = true` y ya no se puede
  desactivar (ni desde la UI ni forzando la función).
- **Incidencias visibles**: modal `openVerifactuPendingModal()` que lista
  fecha, importe y motivo del fallo de cada venta pendiente de confirmar.
- **Enlaces a Declaraciones Responsables**: campos
  `DB.business.verifactu.ownDeclarationUrl` / `providerDeclarationUrl`,
  editables desde la misma tarjeta — hoy están vacíos ("en trámite").

## Pendiente antes de activar VeriFactu en producción

1. **Declaración Responsable propia (fabricante)** — legal, no de código.
   Hay que redactarla y que la firme el administrador de GastroGoan con
   ayuda de un gestor/abogado. Pendiente de decidir con ellos si el sistema
   se declara "exclusivamente VERI*FACTU" (ya implementado así en el código,
   ver arriba) o de otra forma.
2. **Contrato cerrado con el proveedor final** (Invocash / VeriFactuAPI u
   otro): que manden la propuesta económica, se firmen las condiciones
   particulares, y que cada uno de los negocios que usan GastroGoan se dé de
   alta con su propia cuenta/API key en la plataforma del proveedor.
3. **Rellenar los dos enlaces de Declaraciones Responsables** ya preparados
   en la tarjeta de configuración (`ownDeclarationUrl` /
   `providerDeclarationUrl`), en cuanto estén firmadas y accesibles.
4. **Prueba real en el entorno de test del proveedor** (marcado como
   "TEST/Prod" en su panel) con un negocio piloto antes de activarlo con
   clientes reales — para confirmar en vivo que el envío, el hash y el QR
   funcionan tal cual con datos reales, no solo contra la documentación.
5. **Decidir el modelo de precio**: si cada negocio paga directamente al
   proveedor (parece ser el planteamiento actual, confirmado con Claudia de
   Invocash) o si se incluye de algún modo en la cuota de GastroGoan.
6. **Quitar el badge de "Vista previa/borrador"** una vez todo lo anterior
   esté resuelto (`mn.verifactu.draftBadge` / `draftNotice` en
   `js/i18n.js`, usado en `renderVerifactuConfigCard()` en `js/app.js`).

## Documentación de referencia ya revisada

Todos estos documentos de Invocash (carpeta de Drive "Documentacion_tecnica")
ya fueron leídos y contrastados contra el código:

- Declaración Responsable de VerifactuAPI/Invocash (18/02/2025) — en regla.
- Acuerdo de Colaboración Social de Invocash con la AEAT — confirma que
  están habilitados para actuar en representación de terceros ante Hacienda.
- CheckPoint de cumplimiento VeriFactu (los 6 puntos que exigen: bloqueo de
  borrador, inmutabilidad tras validar, envío automático, gestión de
  errores/incidencia, QR obligatorio, acceso a declaraciones responsables) —
  los puntos de código que faltaban (incidencia visible, enlaces a
  declaraciones) ya están implementados; los que son puramente de proceso de
  negocio (declaración propia, contrato) siguen en la lista de arriba.
- Condiciones generales de contratación de Invocash.
- Documentación del Cliente .exe (VBA) — no aplica a GastroGoan, usamos su
  API REST directamente.

Ojo: el CheckPoint menciona una fecha límite "28 de julio de 2025" que ya
pasó cuando se revisó este documento — pendiente de confirmar con Invocash
si es una plantilla desactualizada o si aplica un plazo real distinto.
