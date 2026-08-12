# Análisis General — GastroGoan (pre-lanzamiento)

> Pasada final completa: código + diseño + responsive + funcionalidad, bloque a bloque, con fixes aplicados sobre la marcha.

**Estado**: 🔄 En curso — Bloque 1 completado, continuar por Bloque 2 (Cocina)

---

## Bloque 1 — Login y Licencias

Investigación: revisión de código, prueba funcional en vivo con Puppeteer (instalación nueva de verdad, sin nada en localStorage/IndexedDB) y auditoría responsive en 1440×900 / 1024×768 / 768×1024 / 390×844, en ES y CA. 18 hallazgos confirmados en total (verificación adversarial independiente de cada uno de código antes de aplicarlo).

### 🔴 Bugs críticos arreglados

**1. Login de empleado roto entre negocios / dispositivos nuevos (regresión de seguridad)**
- **Qué estaba mal**: `findEmployeeMatch()` comprobaba el PIN de un empleado hasheándolo con la sal del negocio ACTIVO en el dispositivo, en vez de con la sal del negocio al que el empleado intenta entrar. Un empleado con PIN ya cambiado en un negocio que no es el activo en ese dispositivo (típico: el móvil de un camarero nuevo, o el primer día de alguien en una sucursal) veía su PIN CORRECTO rechazado como "Nombre, PIN o código de negocio incorrectos". Era una regresión directa de un fix de seguridad anterior (sal de PIN por negocio) que protegía bien el caso de un solo negocio por dispositivo pero rompía los dos flujos multi-negocio que la propia función dice soportar en sus comentarios.
- **Archivo**: `js/core.js`
- **Cambio**: `findEmployeeMatch()` ahora recibe el código de licencia del negocio destino como parámetro y lo usa para el hash; los dos puntos donde se llama (negocio ya conocido en el dispositivo, y negocio nunca visto que se trae de la nube) le pasan el código correcto.
- **Probado en vivo**: reproducido el escenario exacto (negocio A activo, empleada Ana de negocio B con PIN ya cambiado) y confirmado que ahora entra correctamente y cambia al negocio B.

**2. "Abrir sucursal" creaba la sucursal con la licencia rota**
- **Qué estaba mal**: `addSucursal()` llamaba a `promptBusinessLicense()` (función async) sin `await`. La comprobación `if(!lic) return` nunca se cumplía (un Promise siempre es truthy), así que la sucursal se creaba igual aunque el código/contraseña de licencia fueran inválidos o el usuario cancelara — con `code: undefined` y una licencia local vacía, dejando la sucursal en un estado roto nada más crearla.
- **Archivo**: `js/core.js`
- **Cambio**: añadido el `await` que faltaba.

**3. Un empleado sin ser propietario podía dar de alta/editar empleados llamando a la función directamente**
- **Qué estaba mal**: `saveEmployee()` no comprobaba `isOwnerSession()`, a diferencia de sus funciones hermanas `deleteEmployee()` y `resetEmployeePin()` que sí lo hacen. El botón de la interfaz ya estaba oculto para no-propietarios, pero eso solo esconde el botón — llamando a la función directamente (consola del navegador) cualquiera podía crear empleados o activar `canUnlockEdit` (acceso a costes/márgenes).
- **Archivo**: `js/hr.js`
- **Cambio**: añadida la misma comprobación `if(!isOwnerSession()) return;` al principio de la función, con el mismo comentario explicativo que ya usan sus funciones hermanas.

### 🟠 Bugs medios arreglados

**4. Reset de PIN de empleado con el código maestro "GGGG" guardaba el PIN en texto plano**
- **Qué estaba mal**: en el flujo de recuperación de PIN olvidado (escribir "GGGG" en el campo PIN de Acceso Empleados), el nuevo PIN se guardaba tal cual (`owner.pin = newPin.trim()`), sin pasar por `hashPin()` ni validar el formato — inconsistente con todos los demás puntos de la app que fijan un PIN de empleado (siempre hasheado y validado como 4 dígitos).
- **Archivo**: `js/core.js`
- **Cambio**: ahora valida `/^\d{4}$/` (mismo mensaje `msg.pin4digits` que usa el reset de propietario) y guarda `hashPin(newPin.trim(), localSlot.code)` con la sal correcta del negocio destino, más `pinChanged: true`.

**5. Modal de configuración de nube mostraba "undefined" en vez del código de licencia**
- **Qué estaba mal**: `openCloudWizard()` mostraba `${lic.name}` y `${lic.key}`, restos del esquema de licencia v1 (clave larga con nombre embebido). El objeto de licencia real (`getLicense()`) solo tiene `{code, tenantId}` desde la migración a licencias v2 (código + contraseña) — esos campos nunca existieron y el modal mostraba literalmente "undefined" en dos sitios ("Licencia activada para: undefined" y en el código para conectar más dispositivos).
- **Archivo**: `js/core.js`
- **Cambio**: las 3 referencias corregidas a `lic.code`, que sí existe y es el dato real que el usuario necesita para conectar más dispositivos.

**6. Mensaje de error de licencia describía el formato antiguo**
- **Qué estaba mal**: el error `gate.invalidLicenseKey` ("Clave no válida. Comprueba que la copiaste entera, CON LOS GUIONES...") describe el formato antiguo de licencia (una única clave larga con guiones), pero se muestra en el formulario actual de código+contraseña (dos campos separados, sin guiones).
- **Archivo**: `js/i18n.js` (los 3 idiomas)
- **Cambio**: texto actualizado a "Código o contraseña no válidos. Comprueba que los escribiste tal y como te los envió tu vendedor, sin espacios de más."

### 🟡 Diseño / responsive arreglado

**7. Texto duplicado literalmente en el asistente de conexiones externas (Redsys / Email)**
- **Qué estaba mal**: en cada paso del asistente, la descripción de la integración aparecía DOS veces seguidas — una en el recuadro introductorio del asistente y otra idéntica dentro de la tarjeta de configuración de abajo (ambas leen la misma clave i18n `mn.redsys.desc`/`mn.emailConfirm.desc`). Duplicaba el scroll necesario sin aportar nada.
- **Archivo**: `js/core.js`
- **Cambio**: quitada la descripción repetida del recuadro introductorio del asistente (la tarjeta de configuración, que se reutiliza también fuera del asistente en Mi Negocio, ya la muestra completa).

**8. Área táctil insuficiente en los enlaces "← Cancelar"/"← Negocios" de las pantallas de configuración inicial**
- **Qué estaba mal**: en las 3 pantallas completas de configuración inicial (licencia, nube/Firebase, hosting/Netlify), el enlace de volver medía solo 72×15px de área táctil real — muy por debajo del mínimo táctil recomendado de 44px, igual en las 4 resoluciones probadas por ser estilo inline sin padding.
- **Archivo**: `js/core.js` (3 ocurrencias idénticas)
- **Cambio**: añadido `padding:10px;min-height:44px`, reposicionado para mantener el aspecto visual.

**9. Botones de papelera (eliminar negocio/sucursal) por debajo del mínimo táctil**
- **Qué estaba mal**: en la pantalla de selección de negocio, los botones de papelera medían 32-36px (clase `.btn-sm` estándar), por debajo de 44px, en las 4 resoluciones.
- **Archivo**: `js/core.js` (3 ocurrencias)
- **Cambio**: `min-width:44px;min-height:44px` añadido de forma específica a esos 3 botones (sin tocar `.btn-sm` globalmente, que se usa en cientos de sitios donde el tamaño pequeño sí es apropiado).

### ⚠️ Requiere revisión antes de aplicar

**PIN de "Gestión" con valor por defecto "1234" hasta que el propietario lo cambia explícitamente**
- `requestOwnerPin()`/`verifyOwnerPin()` (`js/ui.js`) protegen el acceso a Gestión (Económica, Mi Negocio) con un PIN propio de 4 dígitos (`DB.business.pin`), distinto de la contraseña de propietario del dispositivo. Hasta que alguien pasa por ese gate por primera vez, el PIN vale `1234` (`pinSet: false`) y **cualquiera que lo sepa** (un empleado, no solo el propietario) puede entrar y, en el mismo paso, fijar un PIN nuevo — quedándose con acceso exclusivo y dejando al propietario real fuera si no sabe que cambió.
- No lo he tocado porque es una decisión de arquitectura de acceso, no un bug de una línea: ¿debería este gate comprobar `isOwnerSession()` antes incluso de ofrecer el desbloqueo por PIN (bloqueando a cualquier empleado sin importar si sabe el PIN), o es intencional que un PIN compartido pueda dar acceso temporal a Gestión a alguien que no sea el propietario del dispositivo (p. ej. un gestor/contable)? Cualquiera de las dos respuestas es una decisión de producto, no algo que deba decidir yo unilateralmente.
- **Propuesta de fix** si se quiere restringir: en `isGestionLocked()`/`requestOwnerPin()`, exigir `isOwnerSession()` además del PIN — así un empleado nunca vería siquiera el gate, ni por URL/consola.

### 🔵 Detectado, no arreglado por prioridad/alcance (no son bugs de una línea)

Estos tres no son bugs puntuales sino decisiones de UX más grandes; los dejo documentados para una futura pasada de pulido, no bloquean el lanzamiento:
- **Alta de negocio/sucursal adicional usa `window.prompt()` nativos del navegador** (código, contraseña, nombre) en vez de la pantalla de activación cuidada que se usa en el alta inicial — funciona, pero no tiene el mismo acabado visual/de marca.
- **El reset de PIN/contraseña con "GGGG"** también usa `window.prompt()` nativo — funciona bien y el texto sale localizado correctamente en ES/CA, pero es UI del navegador, no de la app.
- **`<meta name="viewport">` global tiene `user-scalable=no`**, lo que impide a alguien con visión reducida hacer zoom táctil en ningún sitio de la app (no solo en login) — es probablemente una decisión deliberada de "app tipo kiosko" para evitar zoom accidental en el TPV, pero tiene ese coste de accesibilidad. Cambiarlo afecta a toda la app, no solo a este bloque — mejor evaluarlo en el Bloque 6 (coherencia general) que aquí de forma aislada.

Evaluado y descartado como bug (comportamiento correcto tras revisar el código): el mensaje de error compartido `access.badCredentials` ("Nombre, PIN o código de negocio incorrectos") se muestra igual ante cualquier fallo (campo vacío, PIN incorrecto, código incorrecto) — es intencional y buena práctica de seguridad no indicar cuál de los 3 datos es el que falla.

### Cobertura responsive — confirmada explícitamente en las 3 resoluciones

| Pantalla | 1440×900 | 1024×768 | 768×1024 | 390×844 |
|---|---|---|---|---|
| Splash de bienvenida | ✅ | ✅ | ✅ | ✅ |
| Acceso Empleados/Propietarios (elección) | ✅ | ✅ | ✅ | ✅ |
| Alta de propietario (primera vez) | ✅ | ✅ | ✅ | ✅ |
| Login de empleado (nombre+PIN+código) | ✅ | ✅ | ✅ | ✅ |
| Login de propietario ya existente | ✅ | ✅ | — | ✅ |
| Selector de negocio (multi-slot, nombres largos) | ✅ | ✅ | ✅ | ✅ |
| Gate de activación de licencia (incl. error) | ✅ | ✅ | ✅ | ✅ |
| Gate de nube/Firebase (incl. scroll con campos apiKey) | ✅ | ✅ | ✅ | ✅ |
| Gate de hosting/Netlify | ✅ | ✅ | ✅ | ✅ |
| Asistente conexiones externas (Redsys/Email) | ✅ | ✅ | ✅ | — *(no repetido en 390×844 tras el fix del texto duplicado — funcionalmente no cambia layout, riesgo bajo)* |
| Reset maestro GGGG (prompt nativo) | ✅ | ✅ | — | ✅ |

**Huecos de cobertura reconocidos explícitamente** (por límite de tiempo, no se asumió que estuvieran bien):
- No se repitió el pase completo en catalán en la resolución 768×1024 (tablet vertical) — sí se hizo en 1024×768 y 390×844 en CA.
- No se probó el idioma inglés en ninguna resolución (no se pidió explícitamente en el encargo).
- No se probó la orientación móvil apaisada (844×390).
- Verificación de licencia contra el backend real de Firebase: no se pudo probar de extremo a extremo por no haber backend disponible en este entorno de pruebas — sí se verificó que el fallo de red se maneja con un mensaje claro, sin cuelgues ni pantalla en blanco.

### Funcionalidad verificada y confirmada correcta (no solo "no se tocó")

- Instalación 100% nueva: splash → pantalla de acceso, sin cuelgues ni pantalla en blanco.
- Validación de formularios (campos vacíos, credenciales inventadas) instantánea, sin llamadas de red innecesarias.
- Login de propietario y empleado, correcto e incorrecto, en ambos casos.
- Reset maestro GGGG (propietario y empleado): funciona de verdad — la nueva contraseña/PIN sirve en el siguiente login y la vieja deja de funcionar.
- Filtrado de módulos y botones por rol (propietario vs empleado, `canUnlockEdit`) correcto tanto en el DOM como visualmente (`getComputedStyle`/`offsetParent`).
- Ningún error de consola no capturado (`page error`) en todo el flujo completo probado; los únicos console errors observados fueron fallos de red esperables al intentar contactar un backend Firebase real inexistente en este entorno.
- `employeePinCollides()` protege correctamente contra que dos empleados activos compartan PIN tras cambiarlo ellos mismos.
- Las 86 claves i18n `access.*`/`gate.*`/`bs.*`/`splash.*` usadas de verdad en el código existen en los 3 idiomas, sin duplicados dentro de este bloque.
- Caducidad de sesión por inactividad enganchada de verdad en el arranque de la app (no solo declarada).

---

✅ **Bloque completado: Login y Licencias — continuar por Bloque 2 (Cocina)**
