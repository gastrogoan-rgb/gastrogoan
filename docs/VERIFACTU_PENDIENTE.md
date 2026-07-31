# VeriFactu — estado y pendientes

Última actualización: 31/07/2026.

## Estado actual

El código de integración con VeriFactu **ya está implementado y probado**, pero
la app lo muestra como "Vista previa / borrador" (`mn.verifactu.draftBadge` en
`js/i18n.js`) porque VeriFactu todavía no es obligatorio. No hay que tocar la
lógica de envío cuando llegue el momento — solo activar y rellenar lo que
falta más abajo.

### Ya hecho (código)

- **Envío a la API**: `submitSaleToVerifactuApi()` en `js/tpv.js`, contrastado
  campo a campo contra la documentación real de Invocash (endpoint, nombres de
  campo, formato de fecha, estructura de respuesta `data.items[0]`).
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
