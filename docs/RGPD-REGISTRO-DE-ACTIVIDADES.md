# Registro de actividades de tratamiento (art. 30 RGPD) — BORRADOR

> **BORRADOR para revisión por un abogado; no es asesoramiento legal.** Redactado el 26/11/2026 a partir de lo que **de verdad hace el código** (js/core.js, js/app.js, js/hr.js, js/tpv.js, js/clientes.js, reservagastrogoan.html, worker/pagos-worker.js, reglas/). Todo lo que depende de una decisión jurídica va marcado **«a decidir con el abogado»**. No se citan más artículos que los que ya figuran en el código o en los textos legales del proyecto.

## 0. Quién es quién (punto a decidir primero)

| Papel | Quién | Notas |
|---|---|---|
| **Responsable del tratamiento** de los datos de clientes finales, empleados, reservas y ventas | **Cada restaurante** | Decide para qué y cómo; los datos viven en SU Firebase |
| **Encargado del tratamiento** | GastroGoan, **solo en la medida en que acceda a esos datos** | Ver §0.1 |
| **Responsable del tratamiento** de los datos de sus propios clientes (los hosteleros que compran la licencia) | GastroGoan (titular: autónomo, según `legal.py`) | Registro propio, §2 |
| Subencargados | Google (Firebase), Cloudflare, Stripe, Hetzner | Ver contrato y §4 |

### 0.1 ¿Es GastroGoan realmente encargado? (a decidir con el abogado)

La arquitectura es 100 % cliente: **GastroGoan no aloja los datos del restaurante**. El restaurante crea su propio proyecto de Firebase y la app (un fichero estático que se ejecuta en su navegador) guarda en él. Hechos relevantes que el abogado debe valorar:

- GastroGoan **no tiene un servidor de datos propio** ni copia de los datos del restaurante.
- Pero **técnicamente puede acceder** si se da cualquiera de estos casos (todos reales):
  - **Plan 360 y mantenimiento**: el panel del coach (`admin-panel/plan360.html`) lee y escribe en la nube del negocio las claves `plan360*` y lee un resumen de números (`plan360Kpis`: ventas, tickets, food cost, personal, resultado, canales, mermas, NPS). No lee clientes ni reservas, pero la nube se abre con el código del negocio (limitación conocida y documentada, CLAUDE.md: `tenants/$tenantId` solo exige `auth != null`).
  - **Soporte**: si un cliente comparte pantalla o un dispositivo.
  - **Código de licencia = acceso a los datos**: quien conoce el código de un negocio y su referencia de nube podría leer el bloque `tenants/{tenantId}` (limitación documentada; no se corrige porque exige plan de pago, decisión del dueño).
- Por eso la recomendación del borrador es **firmar el contrato de encargado** (documento `RGPD-CONTRATO-ENCARGADO.md`) aunque el acceso sea limitado: cubre el soporte y el Plan 360, y es lo que pedirá cualquier hostelero informado. **A decidir con el abogado** si basta un contrato más corto cuando el cliente no contrata el Plan 360.

---

## 1. Registro de GastroGoan como ENCARGADO (art. 30.2)

Rellenar una fila por restaurante cliente (el nombre y datos de contacto del responsable salen del generador de licencias, `adminSalesLog`).

| Campo del art. 30.2 | Contenido |
|---|---|
| Nombre y contacto del encargado | GastroGoan, titular autónomo. **Datos fiscales y de contacto: a completar por el dueño.** |
| Nombre y contacto de cada responsable | Cada restaurante cliente (ver ficha de licencia en el panel de admin). |
| Delegado de protección de datos | No consta que exista. **A decidir con el abogado** si procede. |
| Categorías de tratamientos que efectúa por cuenta de cada responsable | Soporte de la herramienta de gestión; servicio de Plan 360º y de mantenimiento (acceso a un resumen de números y a datos de gestión del negocio); servicio de reservas y pedidos online (la web pública reenvía las solicitudes al buzón del propio restaurante). |
| Transferencias a terceros países | **Google (Firebase) y Cloudflare/Stripe pueden tratar datos fuera del EEE.** No he verificado la localización de las bases de datos de cada negocio ni de la plataforma; lo decide cada negocio al crear su proyecto (la región es un ajuste del proyecto de Firebase). **A decidir con el abogado**: garantías aplicables (cláusulas contractuales tipo, marco de privacidad de datos) y qué dicen los términos vigentes de cada proveedor. |
| Medidas técnicas y organizativas | §5. |

---

## 2. Registro de GastroGoan como RESPONSABLE (art. 30.1): sus propios clientes y su plataforma

| Actividad | Finalidad | Categorías de datos | Origen | Dónde está | Conservación real |
|---|---|---|---|---|---|
| **Alta y gestión de licencias** | Vender, entregar y revocar licencias | Nombre del negocio, nombre de usuario de cuenta, correo y teléfono de contacto, código de licencia, forma jurídica y régimen fiscal fijados, fechas de cobro (`adminSalesLog`, solo lectura del admin, `gastrogoan@gmail.com`) | El propio cliente | Firebase de la plataforma + `localStorage` del panel de admin | **No hay purga automática.** A decidir con el abogado (plazo mínimo: el que obliguen las normas fiscales y de consumo sobre facturas) |
| **Cuentas de propietario** | Entrar en la app desde cualquier aparato | Nombre de usuario; **el PIN no se guarda** (la ruta del nodo se deriva de usuario + PIN); lista de negocios del dueño (código y nombre) en `ownerAuth/{authKey}/businesses` | El propio cliente | Firebase de la plataforma | Mientras exista la cuenta; los nodos antiguos de un cambio de PIN se borran (`limpiarCuentasAntiguasPendientes`), salvo el caso de «reemisión» (queda huérfano; CLAUDE.md) |
| **Referencias técnicas de la nube** | Que un aparato nuevo encuentre su negocio | `tenantLookup` (qué proyecto de Firebase usar), `publicLookup/{publicId}` y `publicSlugs/{slug}`: **no contienen datos personales** (la API key de Firebase no es secreto) | Automático | Firebase de la plataforma | Mientras exista el negocio |
| **Pagos con tarjeta de los restaurantes** (Worker) | Saber qué cuenta de Stripe es de qué negocio y recibir la confirmación | `private/{publicId}/stripe` (ID de cuenta), `pagosLog` (referencia de pedido, importe, fecha) y `pagos/{publicId}/{ref}` (confirmación). **Sin nombres, sin tarjeta.** El correo de contacto de la cuenta conectada se lee de Stripe (`acc.contact_email`), no se guarda | Stripe | Firebase de la plataforma | No hay purga automática. **A decidir con el abogado** si se limpia `pagosLog` y cuándo |
| **Plan 360º y mantenimiento** | Prestar el servicio contratado | Cuestionarios y respuestas del negocio (clave `plan360*` en su nube), resumen de KPI, fotos o archivos de prueba de tareas (máx. 350 KB, 4 MB por negocio), PDF del libro de marca (máx. 7 MB), plantilla del coach en `coachConfig` | El cliente | Nube del negocio (lo suyo) y plataforma (`coachConfig`) | Mientras dure el servicio. **A decidir con el abogado** |
| **Web comercial** | Presentar el producto | Sin cookies, sin formularios que guarden (CLAUDE.md: «la web no usa cookies»); contacto por correo o WhatsApp iniciados por el visitante | Visitante | Cloudflare Pages | Cloudflare puede tener registros técnicos (IP): **no verificado** |
| **Cobro de licencias** | Cobrar | Lo trata Stripe (cuenta propia de GastroGoan): GastroGoan recibe nombre, correo, importe | El cliente | Stripe | Obligación fiscal. **A decidir con el abogado** |

Bases legales posibles (**a decidir con el abogado**, no las fijo): ejecución de contrato (venta de licencia), obligación legal (facturas), interés legítimo (seguridad del sistema).

---

## 3. Registro tipo de cada RESTAURANTE como responsable (art. 30.1)

Plantilla para que el restaurante la rellene (o la rellene GastroGoan con él). Está construida **con lo que la app guarda de verdad**, tratamiento a tratamiento. «Dónde» es siempre: IndexedDB del aparato (clave `gastrogoan_data_v1`) **y** el Firebase del propio negocio (datos del bloque `tenants/{tenantId}`), salvo que se diga otra cosa. Las bases legales son **propuestas a decidir con el abogado**.

### 3.1 Clientes (ficha de cliente)

| Campo | Contenido |
|---|---|
| Finalidad | Gestionar la relación: historial de visitas, alergias, puntos de fidelidad, vales regalo, avisos de cumpleaños y, solo con consentimiento, promociones |
| Datos | Nombre, teléfono, correo, código postal, fecha de cumpleaños, alergias, notas, puntos, consentimiento de marketing (`marketingConsent`), último contacto (`js/app.js`, alta de cliente) |
| Datos especiales | **Alergias** (salud, art. 9): categoría especial. **A decidir con el abogado**: base legal y si procede evaluación de impacto. Las notas libres pueden contener más |
| Origen | El propio cliente (en persona, por teléfono, o por la web de reservas) |
| Destinatarios | Personal con acceso; Google (Firebase) como proveedor de la nube del negocio |
| Conservación **real** | **No hay purga automática.** Una ficha se conserva hasta que el propietario la borra. Al borrar, va a la **papelera 30 días** (`TRASH_RETENTION_DAYS`, js/core.js) y luego desaparece. La **supresión RGPD** (`eraseClientDataRGPD`, botón en la ficha) borra de verdad y al instante: nombre → «cliente eliminado», teléfono, correo, alergias, notas, código postal, cumpleaños y consentimiento; nombre en los vales; conserva un registro anónimo. Pide el PIN del negocio y deja anotación en el registro de auditoría |
| Plazo recomendado | **A decidir con el abogado** (p. ej. caducidad por inactividad: la app no la implementa) |

### 3.2 Reservas

| Campo | Contenido |
|---|---|
| Finalidad | Gestionar la mesa y el aforo, avisar al cliente |
| Datos | Nombre, teléfono, correo, fecha, hora, personas, notas/alergias, estado, mesa; token de seguimiento |
| Origen | La web pública `reservas…` o la propia app |
| Cómo viajan | La web **cifra** nombre, teléfono, correo, dirección, notas, fecha, hora, personas, líneas, importes y tokens con la clave pública del negocio (RSA-OAEP 2048 + AES-GCM, WebCrypto; `CAMPOS_PRIVADOS_SOLICITUD`, js/core.js) antes de dejarlo en el buzón `public/{publicId}/requests`; solo la app, con su clave privada guardada en `DB.business.reqPriv`, lo descifra y borra la solicitud tras procesarla. Quedan en claro `type` y `createdAt`. Con reglas o app antiguas, o sin WebCrypto, la web envía en claro (**limitación documentada**) |
| Conservación **real** | Las reservas **no se purgan solas**: quedan en la base hasta que el propietario las **archiva** (Mi Negocio → Mantenimiento, `archiveOldData`: descarga un JSON y las borra; la app recuerda diariamente si hay datos de más de 1 año). Una solicitud que nadie procesa (app cerrada) **se queda en el buzón** sin caducidad (cifrada si se cumplen las condiciones de arriba). Los estados `orderStatus` del seguimiento público se **borran a las 24 h** (`js/core.js`, sincronización del espejo). `reservationStatus` y `reservationLookup` (token, estado y fecha; sin datos personales) **no tienen limpieza**: no verificado que sean un riesgo, **a revisar** |
| Plazo recomendado | **A decidir con el abogado** |

### 3.3 Pedidos online y TPV (comandas, ventas, tickets, facturas)

| Campo | Contenido |
|---|---|
| Finalidad | Prestar el servicio, cobrar, llevar la contabilidad y cumplir obligaciones fiscales; reparto a domicilio |
| Datos | Nombre, teléfono, dirección y código postal (pedidos a domicilio), líneas del pedido, importe, propina, forma de pago, factura completa con nombre/NIF/domicilio del cliente (series `T`, `F`, `R`), foto de entrega (480 px), PIN de entrega. Los pedidos de plataformas (Glovo, etc.) se registran **sin ficha de cliente** (`sinFichaCliente`) |
| Pago con tarjeta | **La app y GastroGoan no ven el número de tarjeta**: lo trata Stripe en la cuenta del propio restaurante (cobro directo) |
| Conservación **real** | Las **ventas no se borran ni se purgan solas**: se anulan (rectificativa) y solo salen con el archivado manual. Las **comandas pagadas** (`DB.tpvOrders` con `status 'pagada'`) se **purgan cada día pasadas las 6:00** (`purgePaidOrders`, js/tpv.js); la venta queda en `DB.sales`. `sale.tiempos` (para las estadísticas) sobrevive. Plazo fiscal de conservación de facturas y libros: **a decidir con el abogado/gestor** (la app no lo impone) |

### 3.4 Empleados

| Campo | Contenido |
|---|---|
| Finalidad | Horarios, fichajes, nóminas y control interno |
| Datos | Nombre, rol, teléfono, correo, color, área, permisos, **PIN (hash)**, vacaciones, turnos, fichajes (entrada/salida, hora original si se corrige), horas extra y pluses, DNI/NIF (si se rellena, `empleadoDni`), coste de nómina (para la Cuenta de Resultados) |
| Origen | El propio empleado / el propietario |
| Destinatarios | Propietario; el jefe de área solo ve su propia ficha (CLAUDE.md, decisión del 1/09); asesoría laboral si el propietario le envía el paquete |
| Conservación **real** | Los **fichajes se guardan 4 años** (art. 34.9 ET, documentado en js/hr.js) y **no se purgan solos a los 4 años**: la app no tiene ese borrado. **Al eliminar un empleado** su ficha va a la papelera 30 días y **sus fichajes NO se borran**: se les apunta nombre y DNI para seguir siendo legibles. Turnos y horarios fijos sí se borran con él. **A decidir con el abogado**: purga a los 4 años y qué se hace con nombre/DNI en el fichaje |
| Registro de auditoría | `DB.auditLog` se limita a los **500 últimos** eventos (js/core.js); incluye nombres de empleados y de clientes en las acciones críticas |

### 3.5 Novedades comerciales (email/WhatsApp)

| Campo | Contenido |
|---|---|
| Finalidad | Comunicaciones comerciales a clientes que lo han consentido |
| Datos | Teléfonos y correos de la ficha; historial de envíos; bajas |
| Cómo funciona | **No hay servidor de correo ni API de WhatsApp**: el mensaje sale del correo y del WhatsApp del propio negocio; la app prepara la lista, el asunto y el texto, con el enlace de baja y el pie con el responsable |
| Consentimiento | Casilla en la ficha y en la web (`marketingConsent`); quien responde BAJA pierde el consentimiento |
| Conservación | Sin purga; el historial de envíos queda en `DB.novedades` |
| A decidir con el abogado | Redacción de la casilla de consentimiento y del pie de baja (LSSI) |

### 3.6 Plan 360º y mantenimiento (solo si lo contrata)

El negocio responde un cuestionario; el coach de GastroGoan lee/escribe `plan360*` y lee `plan360Kpis`. **Acceso del coach: ver §0.1.**

### 3.7 Chat interno, tareas y distribución del trabajo

Nombre del empleado, mensajes y notas. Sin purga automática del chat (no encontrado en el código). **A revisar.**

### 3.8 IA opcional (I+D, «Pregúntale a tus números»)

El negocio usa **su propia clave** (guardada en `localStorage` del aparato, nunca en la nube); la llamada va **directa del navegador al proveedor de IA** elegido (Google, Anthropic, OpenAI). GastroGoan **no interviene**. «Pregúntale a tus números» envía cifras y **clientela agregada sin datos personales** (js/idr.js, `iaNumContexto`). El proveedor de IA es un encargado **del restaurante**, no de GastroGoan. **A decidir con el abogado**: advertir en el manual de no escribir datos personales en las consultas.

### 3.9 Copia de seguridad

Descarga manual del JSON completo (incluye todo lo anterior) en el aparato del propietario. Sin cifrado de la copia (**no verificado**; si se confirma, a mejorar). Recordatorio diario por negocio.

---

## 4. Dónde está cada dato y qué ve GastroGoan

| Sitio | Qué contiene | Quién puede leer |
|---|---|---|
| IndexedDB del aparato | Toda la base del negocio | Quien use el aparato (sesión por PIN) |
| `localStorage` del aparato | Sesión, licencia, clave de IA, clave VeriFactu, preferencias | Quien use el aparato |
| **Firebase del negocio** (proyecto Google del propio restaurante) | `tenants/{tenantId}` (todo), `public/{publicId}` (carta, aforo, estado de pedidos, buzón de solicitudes cifrado, token de seguimiento) | Sus aparatos autenticados; **cualquiera con el `publicId` puede LEER el buzón `requests`** (por eso se cifra); `tenants/{tenantId}` solo exige sesión (limitación documentada) |
| **Firebase de la plataforma** | Licencias, cuentas (sin PIN), referencias técnicas, confirmaciones de pago | Solo el admin escribe licencias; ciertos nodos de lectura abierta no son personales |
| **Web pública de reservas** (Hetzner y Cloudflare Pages) | Sirve ficheros estáticos; **no guarda datos de clientes** | El cliente en su navegador: la web recuerda sus datos en su propio `localStorage` |
| Cloudflare (Pages, Worker) | Tráfico y ejecución | Registros técnicos: **no verificado** |
| Hetzner | Servidor de la web de reservas | El Caddyfile del repositorio no activa el registro de accesos (`log`); **comprobar en el servidor** que no hay otro |
| Stripe | Pagos con tarjeta del restaurante (cuenta propia del restaurante) | El restaurante y Stripe |

---

## 5. Medidas de seguridad (art. 32), tal como están implementadas

- **Aislamiento entre cuentas** y negocios en el dispositivo (slots, base de datos separada por negocio), con pruebas automáticas.
- **Cuentas de propietario**: el PIN no se guarda; hash H3 (PBKDF2-SHA256, 210.000 iteraciones, sal aleatoria) en la validación local, con compatibilidad H2 todavía activa (limitación documentada en CLAUDE.md: el H2 se rompe con facilidad si alguien lee los hashes de la nube). PIN del dueño de 6-12 caracteres para cuentas nuevas; **los PIN de empleado siguen siendo de 4 dígitos**.
- **Sesión**: caduca a las 8 h de inactividad (propietario); se puede forzar el cierre.
- **Roles y permisos**: seis modos de acceso, Gestión Económica exclusiva del propietario, acciones sensibles con PIN del negocio. Sesión «falsificable desde las herramientas del navegador» (limitación inherente a no tener servidor).
- **Solicitudes de reserva y pedido cifradas** (hallazgo de la auditoría del 18/11 y ampliado el 25/11).
- **Reglas de Firebase** que limitan escrituras (tamaño del aforo, tokens de ≥12 caracteres, solo `type` y `createdAt` en claro). Tres copias idénticas vigiladas por `test/reglas.mjs`.
- **Cabeceras de seguridad** en los tres sitios (nosniff, referrer, HSTS; la app y el admin no se pueden incrustar). **Falta política de contenido (CSP).**
- **Copia de seguridad y archivado** manuales con recordatorio; lápidas para que lo borrado no resucite entre aparatos (60 días).
- **Pruebas automáticas**: batería de ~237 comprobaciones (`test/todo.sh`).
- **Limitaciones reconocidas** que el abogado debe conocer (todas están en CLAUDE.md y `docs/SECURITY_NOTES.md`): código de licencia como credencial no revocable de `tenants/{tenantId}`; sesión anónima de Firebase; lectura abierta del buzón con el `publicId`; repositorio público (con el generador de licencias dentro); no hay auditoría de seguridad por un humano externo todavía.

---

## 6. Derechos de los interesados (cómo se atienden hoy)

| Derecho | Cómo | Situación |
|---|---|---|
| Acceso / portabilidad | Exportación de datos (paquete del gestor, CSV, JSON) por el propietario | Parcial: no hay una «ficha para entregar al cliente» automática. **Pendiente** |
| Supresión | `eraseClientDataRGPD` para un cliente; borrado de empleado (papelera 30 días) | Hecho para clientes; **fichajes de empleados se conservan** a propósito |
| Rectificación | Edición de la ficha | Hecho |
| Oposición / baja de comunicaciones | «Registrar una baja» en Novedades | Hecho |
| Información (art. 13) | Aviso de privacidad en la web de reservas, con responsable, NIF (si el propietario lo publica en Mi Negocio), base legal y vía de reclamación ante la AEPD | Hecho en la web pública; **texto a revisar por el abogado** |

## 7. Brechas de seguridad

La app **no tiene un procedimiento de aviso de brechas**. **A decidir con el abogado**: quién avisa a quién y en qué plazo entre responsable y encargado (el contrato lo recoge).

## 8. Lista de decisiones para el abogado

1. ¿GastroGoan es encargado de todos los clientes o solo de los del Plan 360 y soporte? (§0.1)
2. Plazos de conservación por categoría: clientes, reservas, ventas y facturas, fichajes (tras 4 años), buzón sin procesar, `pagosLog`, `adminSalesLog`.
3. Alergias como categoría especial: base legal y evaluación de impacto.
4. Transferencias internacionales y localización de las bases de Firebase.
5. Delegado de protección de datos.
6. Texto del aviso de privacidad, casilla de marketing y pie de baja.
7. Qué pasa con los datos del restaurante cuando termina la licencia (la app los deja en SU Firebase; GastroGoan no los aloja).
