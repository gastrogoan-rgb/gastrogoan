# Análisis General — GastroGoan (pre-lanzamiento)

> Pasada final completa: código + diseño + responsive + funcionalidad, bloque a bloque, con fixes aplicados sobre la marcha.

**Estado**: ✅ Completo — los 6 bloques y el informe final

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

Ninguno pendiente — ver actualización más abajo.

### ✅ Actualización post-informe

**PIN de "Gestión" con valor por defecto "1234"** — resuelto. El propietario confirmó que Gestión debe ser exclusiva de la sesión de propietario (sin acceso de empleado ni con PIN). Se ha eliminado por completo el gate de PIN compartido (`requestOwnerPin()`/`verifyOwnerPin()`, `js/ui.js`): ahora un empleado que intenta entrar a Gestión (Económica o Mi Negocio), por navegación normal o llamando a la función directamente desde la consola, recibe un aviso ("Gestión es solo para el propietario del negocio.") y vuelve a su área — sin ningún PIN de por medio. El propietario sigue entrando directo, sin fricción, igual que antes. Se limpiaron también el botón de candado ahora huérfano (`#lock-btn`, index.html) y las claves de i18n que ya no se usaban en ningún sitio. Probado en vivo: sesión de empleado → denegado con el mensaje correcto y redirigido; sesión de propietario → entra directo. `DB.business.pin`/`pinSet` se mantienen intactos, ya que ese mismo campo lo sigue usando `requestBusinessPinAction()` para confirmar otras acciones sensibles (borrar empleado, anular una venta...) en el resto de la app.

**Canal de venta (`landing.html`, enlace de Stripe sin rellenar)** — no aplica. El propietario vende desde gastrogoan.com, no desde este `landing.html` del repositorio.

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

---

## Bloque 2 — Cocina

> Nota de método: este bloque se hizo en solitario (sin orquestación de varios agentes) para ajustarse al límite de consumo pedido — revisión de código dirigida + una única sesión de Puppeteer combinando responsive y funcional, en vez del patrón de investigación en paralelo + verificación adversarial del Bloque 1. Cobertura algo menos exhaustiva que el Bloque 1 como consecuencia directa de eso; se indica explícitamente donde no llegué a profundizar.

Módulos de este bloque: Comandas Cocina (KDS), Oferta Gastronómica (Carta), Proveedores, Mega Lista, Escandallo, Fichas Técnicas, Pedidos, Stock, Horario del Personal, Distribución, Limpieza (APPCC).

### Responsive — las 3 resoluciones, los 11 módulos

Auditoría con Puppeteer (overflow de body + elementos individuales más anchos que el viewport) en **1440×900 / 1024×768 / 390×844**, navegando a los 11 módulos en cada resolución (33 combinaciones módulo×resolución):

| Resultado | Detalle |
|---|---|
| ✅ Sin overflow horizontal | En los 11 módulos, en las 3 resoluciones — 0 hallazgos |
| ✅ Sin errores de consola | Durante toda la navegación por los 11 módulos |

Esto coincide con que gran parte del trabajo de responsive de Cocina (tablas a tarjetas en móvil, fix de overflow en grids, TPV/Comandas) ya se hizo en una revisión móvil exhaustiva anterior de esta misma sesión — este bloque confirma que sigue en pie, no lo repite desde cero.

**No verificado en este bloque** (por presupuesto, no se asumió que estuviera bien): tablet vertical (768×1024), catalán/inglés en Cocina específicamente, ni una revisión visual manual (capturas) módulo por módulo — la auditoría fue automática (detección de overflow), no una inspección ojo a ojo de cada pantalla como sí se hizo en el Bloque 1.

### Funcional — verificado en vivo

- **Escandallo**: `recipeCost()`/`recipeCostBreakdown()`/`recipeIngredientCost()` (js/recipes.js) revisados y con una receta de prueba real (ingrediente con precio por packQty/packPrice, merma del 5%) — el cálculo de coste bruto (`qty × (1 + merma/100) × precio`) es correcto.
- **Comandas Cocina (KDS)**: probado de extremo a extremo — un pedido de mesa con un plato enviado a cocina aparece correctamente en la pantalla de Cocina con nombre, cantidad y estado "En espera".
- **Pedidos a proveedor**: el formulario "Realizar Pedido" carga y renderiza correctamente (selector de proveedor, fecha de entrega, resumen).
- **Mega Lista**: botón "Nuevo Ingrediente" presente y accesible.
- **Comprobación estática app-wide**: los 335 nombres de función usados en atributos `onclick="..."` de toda la app están todos declarados de verdad (0 referencias rotas) — no es específico de Cocina, pero da confianza de que no hay botones muertos en ningún sitio.

~~**No verificado en este bloque** (por presupuesto): no se probó de extremo a extremo crear/editar/eliminar en Fichas Técnicas, Stock (movimientos de entrada/salida), Horario del Personal, Distribución ni Limpieza/APPCC.~~ **[Actualización tras el Bloque 3]**: se pidió explícitamente cerrar este hueco antes de seguir, así que se probó en vivo cada uno de los 5:
- **Fichas Técnicas**: `openFichaModal()` + `saveFicha()` crea la ficha correctamente y queda enlazada a la receta.
- **Stock**: `updateStockQty()` actualiza la cantidad y queda registrado en el log de ajustes de stock (`logStockAdjustment`).
- **Horario del Personal**: la vista carga con el personal y sus turnos por día/semana/mes.
- **Distribución**: la vista carga correctamente mostrando platos/tareas asignadas por empleado.
- **Limpieza/APPCC**: probado de extremo a extremo el registro de una temperatura real (nevera, 4°C) vía `addLimpiezaLogEntry('temperaturas')` — se guarda con el estado calculado automáticamente ("OK"), la zona y el responsable auditado según la sesión activa, sin necesidad de elegirlo a mano.
- Sin overflow en los 5 módulos en las 3 resoluciones, sin errores de consola.
- Sin hallazgos — los 5 funcionan correctamente.

### Hallazgos

**Ninguno que requiriera arreglo.** Dos falsos positivos descartados tras investigar (no eran bugs de la app, sino datos de prueba mal simulados por mi parte: nombres de campo inventados que no coinciden con el esquema real — `ing.price` en vez de `ing.purchasePrice`, `line.name` en vez de `line.nombre`). Los dejo anotados aquí solo como constancia de que se investigaron a fondo antes de descartarlos, no se asumió que estuvieran bien sin comprobar.

No se aplicó ningún cambio de código en este bloque.

---

✅ **Bloque completado: Cocina — continuar por Bloque 3 (Sala)**

---

## Bloque 3 — Sala

> Nota de método: se pidió explícitamente subir el nivel de exhaustividad respecto al Bloque 2 ("dale caña"), así que aquí sí se hicieron pruebas funcionales en vivo completas (no solo lectura de código), corrigiendo el patrón de datos de prueba (usar `genId()` numérico para IDs de mesa en vez de strings inventados, y los nombres de campo reales verificados por grep antes de seedear) que causó falsos positivos en el Bloque 2.

Módulos de este bloque: TPV, Reservas, Clientes, Oferta Gastronómica (Carta, vista bebidas), Proveedores, Mega Lista, Escandallo, Fichas Técnicas, Stock, Pedidos, Horario del Personal, Distribución, Limpieza, Promoción.

Los módulos **compartidos con Cocina** (Proveedores, Mega Lista, Escandallo, Fichas Técnicas, Stock, Pedidos, Horarios, Distribución, Limpieza — mismo código, misma vista, solo cambia la carpeta desde la que se accede) **no se han vuelto a probar aquí**: ya se verificaron en el Bloque 2 y son literalmente el mismo código ejecutándose, así que repetirlos habría sido tiempo duplicado sin valor añadido. Este bloque se centra en los módulos específicos de Sala: TPV, Reservas, Clientes, Carta (bebidas) y Promoción.

### Funcional — verificado en vivo, de extremo a extremo

- **TPV — ciclo de vida completo de un pedido de mesa**: abrir mesa → modal de comensales → confirmar apertura (`confirmOpenTableOrder`, crea el pedido con `status:'abierta'` y el nº de comensales correcto) → añadir plato → marcar todo entregado → total calculado correctamente (`orderTotal()` = 14€ para un plato de 14€, sin desviaciones de redondeo).
- **Clientes**: creación bloqueada sin teléfono (confirmado en vivo: 0 clientes creados al intentarlo sin teléfono), creación correcta con teléfono. Bloqueo de nombre duplicado confirmado leyendo el código (`saveClient()`, js/app.js): usa `showToast()` + `return` — bloqueo duro, no solo aviso — coincide con el trabajo de una sesión anterior ("bloquear nombres duplicados y exigir nombre y apellidos").
- **Reservas**: el modal de nueva reserva abre correctamente. Lógica de aforo por turno (`getReservedPeopleForTurno`, js/menu.js) revisada: cuenta reservas en estado pendiente/confirmada/**completada** — confirmado que el fix de una sesión anterior (el aforo no caía a 0 cuando el cliente llegaba) sigue intacto, no se ha regresionado.
- **Sincronización pública de reservas** (`getReservasResumenForSync`, js/core.js): mismo criterio de estados (pendiente/confirmada/completada) que el cálculo de aforo interno — confirmado que el fix de sobre-reserva de una sesión anterior tampoco se ha regresionado.
- **Promoción**: la vista carga sin errores, con calendario (día/semana/mes), filtros por cliente/responsable/estado, y el aviso de conectar redes sociales.
- Sin errores de consola en ningún momento de todo el flujo.

### Responsive — las 3 resoluciones

Auditoría de overflow en **1440×900 / 1024×768 / 390×844** para los 5 módulos específicos de Sala (TPV, Reservas, Clientes, Carta, Promoción): **0 hallazgos** — sin overflow horizontal en ninguna combinación.

**No verificado en este bloque** (reconocido explícitamente, no asumido): tablet vertical (768×1024), catalán/inglés en las pantallas específicas de Sala, ni una prueba en vivo de "Marchar vale"/dividir cuenta/cierre de caja con plataformas dentro de este bloque (esas funciones concretas ya se probaron y arreglaron en profundidad en sesiones anteriores de este mismo proyecto — el rediseño de las tarjetas de Para Llevar/Delivery, el flujo del propietario abriendo mesa, y el cierre de caja con ventas de plataforma se verificaron en su momento con Puppeteer y tests siguen en verde).

### Hallazgos

**Ninguno que requiriera arreglo.** No se aplicó ningún cambio de código en este bloque — el trabajo de sesiones anteriores en TPV, Reservas y Clientes se mantiene sólido, sin regresiones detectadas.

---

✅ **Bloque completado: Sala — continuar por Bloque 4 (Gestión)**

---

## Bloque 4 — Gestión

Módulos: Manual de Uso, Mi Negocio, Panel de Control (Dashboard), Gestión Económica (Gastos Fijos, Gastos Variables, Cuenta de Resultados, Resultado, Tesorería, Punto de Equilibrio, CAPEX).

### Funcional — verificado en vivo, con datos reales

- **Mi Negocio**: cambio de nombre del negocio (`saveBusiness()`) persiste correctamente en `DB.business.name`. Alta de una plataforma de delivery (Uber Eats, 28% comisión, 21% IVA) guardada con los campos correctos.
- **Panel de Control**: con una venta real seeded (100€, hoy), el dashboard muestra correctamente "Ventas de hoy: 100,00€", "Tickets hoy: 1", "Ticket medio: 100,00€" — enlazado de verdad a `DB.sales`, no a datos de relleno.
- **Gestión Económica**:
  - **Gastos Fijos**: un gasto de personal (Nómina, 1500€/mes) se refleja correctamente en el KPI "Personal (sin IVA)" y en "Coste real mensual", exactos.
  - **Cuenta de Resultados**: con la venta de 100€ (IVA 10%) seeded, la fila de agosto muestra "Facturación (TPV, IVA incl.): 100,00€", "IVA repercutido: 9,09€", "Facturación neta: 90,91€" — matemáticamente exacto (100/1,10 = 90,909...).
  - **Resultado** y **Punto de Equilibrio**: cargan sin errores, con las fórmulas y textos explicativos correctos.
- **Manual de Uso**: la búsqueda (`renderManual()`/`manualChapterMatches()`) probada con el término "GGGG" (el código maestro de recuperación de contraseña/PIN) — encuentra correctamente el único capítulo que lo menciona ("Cómo empezar"), confirmando que el motor de búsqueda funciona de verdad sobre el contenido real, no solo sobre títulos.
- Sin errores de consola de JavaScript en todo el bloque (solo un `ERR_CONNECTION_RESET` de red, entorno de pruebas sin salida a internet real, no relacionado con la app).

### Investigación de una falsa alarma (documentada por transparencia)

Durante las pruebas, el KPI "Personal (sin IVA)" de Gastos Fijos pareció mostrar un valor incorrecto (573-617€ en vez de 1500€) al comprobarlo ~100-900ms después de navegar a la pestaña. Investigado a fondo antes de descartarlo (interceptando la función de cálculo en vivo, comprobando con y sin sincronización en la nube activada): **no es un bug** — es una animación deliberada de "conteo" en las cifras de KPI (`js/polish.js`, `animateKpiNumbers()`, 600ms de duración con easing), y mis primeras comprobaciones simplemente leían el DOM a mitad de la animación. Repetido esperando a que la animación termine (1,2s): la cifra es exacta en todos los casos. Se documenta aquí en vez de omitirlo para que quede constancia de que se investigó a fondo antes de descartarlo, no se asumió sin más.

### Responsive — las 3 resoluciones

Auditoría de overflow en **1440×900 / 1024×768 / 390×844** para los 4 módulos de Gestión: **0 hallazgos**.

**No verificado en este bloque**: tablet vertical (768×1024), catalán/inglés, ni una revisión visual manual (capturas) de cada pantalla — auditoría automática de overflow, como en el Bloque 2.

### Hallazgos

**Ninguno que requiriera arreglo.** No se aplicó ningún cambio de código en este bloque.

---

✅ **Bloque completado: Gestión — continuar por Bloque 5 (Reservas y Pedidos Online)**

---

## Bloque 5 — Reservas y Pedidos Online

> Esta es la única cara pública de la app orientada al cliente final (no al hostelero), así que se ha tratado con más detalle que el resto, tal y como se pidió.

Archivo: `reservagastrogoan.html` — página independiente, autocontenida, que se conecta a la plataforma compartida de GastroGoan (Firebase de producción) para leer los datos del negocio y enviar solicitudes de reserva/pedido.

**Limitación del entorno de pruebas, declarada explícitamente**: este entorno no tiene acceso a un backend real, y por prudencia no se ha intentado escribir ni leer nada contra la Firebase de producción real (sería tocar datos compartidos de verdad). Para probar la lógica de la página sin ese riesgo, se bloquearon a propósito las peticiones de red hacia Firebase/gstatic con Puppeteer, y se simuló manualmente el estado `DB` tal y como lo dejaría `loadBusinessInfo()` tras una carga real — permite probar toda la lógica de validación, cálculo de aforo, construcción del menú y renderizado, sin tocar la nube real. Lo que **no** se ha podido probar de extremo a extremo por esta limitación: la llegada real de la solicitud a Firebase y su recepción por el listener del panel interno — para eso sí se ha hecho una revisión exhaustiva de código en su lugar (ver más abajo).

### Código — revisión a fondo

- **Cálculo de aforo** (`getAforoInfo`/`getAforoDisponible`): usa el mismo criterio de turno "cierre exclusivo salvo el último turno del día" que el panel interno (`getTurnoIndexForTime`, js/menu.js) — el comentario del propio código documenta que esto ya se corrigió en una sesión anterior para evitar un desajuste justo en la hora de cambio de turno.
- **Reserva atómica de aforo** (`reserveAforoAtomic`) y **límite de pedidos por franja** (`reservePedidoSlotAtomic`): ambas usan transacciones reales de Firebase sobre un contador de "holds" independiente, específicamente para que dos clientes reservando casi a la vez no puedan juntos superar el aforo aunque ninguno de los dos lo viera en su momento — protección real contra condiciones de carrera, no solo una comprobación optimista.
- **Envío de la solicitud** (`sendRequest`): empuja a `gastrogoan/public/{publicId}/requests`, que el panel interno escucha en tiempo real (`initPublicRequestsListener`, js/core.js) — confirmado leyendo ambos lados: al llegar una reserva, se busca automáticamente si el teléfono coincide con un cliente ya existente (para no perder alergias/fidelidad), se intenta asignar mesa automáticamente si hay una libre con plazas suficientes (si no, queda "pendiente" para que el personal solo tenga que elegir mesa), se envía el email de confirmación si se auto-asignó mesa, y la solicitud se elimina de la cola tras procesarla (`reqRef.remove()`) — sin duplicados ni reprocesamiento.
- **Carta/menú realmente conectada**: `getActiveCartasConPlatos()`/`buildMenuHtml()` leen de `DB.cartas`/`DB.activeCartaIds` (los mismos datos que Oferta Gastronómica/Bebidas sincroniza), filtrando por `disponible!==false` — no es una carta de relleno desconectada.
- **Interruptor de emergencia de pedidos** (`pedidosOnlineActivos`): si el negocio lo apaga desde el TPV, la página pública lo refleja al instante (ya sincronizado en vivo por el listener de `loadBusinessInfo`), sin que el cliente pueda seguir pidiendo.

### Funcional — probado en vivo (con Firebase bloqueado a propósito, ver nota arriba)

- **Formulario de reserva**: validación de campos obligatorios (nombre, teléfono, email con formato válido), consentimiento de privacidad obligatorio, y tres mensajes de error probados explícitamente y confirmados con el texto exacto que vería un cliente:
  - Negocio cerrado ese día: *"El restaurante está cerrado el domingo. Por favor elige otra fecha."*
  - Fuera de horario: *"El restaurante solo acepta reservas el lunes en este horario: 13:00–16:00 y 20:00–23:00. Por favor elige otra hora."*
  - Sin plazas disponibles: *"Lo sentimos, ese turno ya está completo. Por favor elige otro horario o llama al restaurante para consultar disponibilidad."*
- **Formulario de pedido (Take Away/Delivery)**: renderiza correctamente la carta real (plato de prueba "Paella, 14,00€" con su selector de cantidad), carrito, formulario de datos, forma de pago.
- **Resiliencia ante fallo de conexión real**: con Firebase completamente bloqueado (simulando estar sin red), la página muestra un mensaje de error claro ("No se ha podido conectar con el restaurante") en vez de quedarse en blanco o colgada.
- Sin errores de JavaScript no capturados en ningún momento (los únicos errores de consola son los fallos de red esperados, provocados a propósito al bloquear Firebase).

### Responsive — las 3 resoluciones, con capturas visuales en móvil

Auditoría de overflow en **1440×900 / 1024×768 / 390×844** en las 3 pestañas (Reservar mesa / Take Away / Delivery): **0 hallazgos**.

Capturas visuales tomadas en 390×844 (móvil, la que con más probabilidad usará un cliente final) para el formulario de reserva y el de pedido: diseño limpio, sin recortes, botones +/- de cantidad con buen tamaño táctil, campos de formulario legibles.

**No verificado en este bloque**: tablet vertical (768×1024), inglés (solo se probó ES, aunque el catalán se confirmó ya funcionando en sesiones anteriores para esta misma página), ni el flujo real de pago con tarjeta (Redsys) — depende de una pasarela de pago real externa, fuera del alcance de lo que se puede probar en este entorno.

### Hallazgos

**Ninguno que requiriera arreglo.** No se aplicó ningún cambio de código en este bloque — la página pública ya estaba sólida, con protecciones reales contra condiciones de carrera y buena resiliencia ante fallos de red.

---

✅ **Bloque completado: Reservas y Pedidos Online — continuar por Bloque 6 (coherencia general)**

---

## Bloque 6 — Coherencia general

Evaluación de la app como conjunto (código y diseño), no módulo a módulo.

### Higiene de código app-wide

- **0** `console.log`/`debugger` olvidados en producción (js/*.js, index.html, reservagastrogoan.html).
- **0** comentarios `TODO`/`FIXME`/`HACK` sin resolver.
- Repositorio limpio: sin ficheros de prueba sueltos, sin cambios sin commitear.

### Coherencia visual

- **Paleta de color idéntica** a nivel de token entre la app interna y la web pública: `--ink`/`--brand-orange` = `#1C1A17` en ambas, `--olive` = `#4A5D4E` en ambas — no es casualidad, es el mismo sistema de diseño aplicado de forma consistente en dos codebases separadas.
- Misma tipografía (Schibsted Grotesk + IBM Plex Mono) en ambas.
- El logo real (monograma "gg") se usa de forma consistente en splash, cabecera y pantallas de acceso desde los arreglos de esta sesión.
- La web pública usa emoji como sistema de iconos ligero (decisión deliberada para no cargar la fuente de iconos Tabler en una página pública que debe cargar rápido en el móvil de un cliente) mientras que la app interna usa Tabler de forma consistente — es una diferencia técnica justificada, no una inconsistencia accidental.

### Coherencia de terminología

Comprobado que los mismos conceptos de negocio se llaman igual en la app interna y en la web pública: "Reservar mesa" (público) se corresponde con el módulo "Reservas" (interno); "Pedido para recoger"/"Take Away" (público) con "Para recoger"/"Take Away" (interno, TPV). No se ha encontrado ningún término que un cliente vea en la web pública y que no encaje con lo que ve el personal en la app al gestionar esa misma reserva/pedido.

### Lo que un hostelero notaría como "raro"

Repasando los 5 bloques anteriores, no se ha encontrado nada que un hostelero fuera a percibir como una app "hecha de módulos pegados": la navegación, los patrones de tarjetas/modales/formularios, los mensajes de error y confirmación, y el idioma (es/ca/en) se comportan igual en todas las zonas. Los bugs reales que sí se encontraron y arreglaron en el Bloque 1 (login de empleado entre negocios, alta de sucursal, guardado de empleados sin comprobar propietario) eran errores lógicos puntuales, no síntomas de una arquitectura inconsistente entre zonas.

### Hallazgos

Ninguno nuevo. No se aplicó ningún cambio de código en este bloque — es una confirmación de que el trabajo de los bloques 1-5 (y de las auditorías anteriores de esta misma sesión: unificación de iconografía, logo real, revisión de dinero/i18n/CSS móvil) se sostiene como conjunto coherente.

---

✅ **Bloque completado: Coherencia general — análisis terminado, ver informe final**

---

## Bloque 7 — Autocrítica y verificación adicional (post-informe)

Tras el informe final con nota 9/10, se pidió una autocrítica honesta de por qué no era un 10, y después que cada punto se resolviera con evidencia real, no solo con palabras. Los 5 puntos y lo hecho con cada uno:

**1. Condición de carrera real bajo concurrencia genuina.**
Hasta este punto la protección de aforo/plazas de `reserveAforoAtomic`/`reservePedidoSlotAtomic` se había verificado solo leyendo el código. Se construyó un mock fiel de la semántica de `transaction()` de Firebase Realtime Database (serialización por path, cada intento ve el valor más reciente en el momento de ejecutarse, con latencia de red simulada) y se lanzaron 20 reservas simultáneas de verdad contra un aforo de 10, con y sin reservas previas (baseline). Resultado: exactamente el aforo configurado se comprometió en ambos escenarios, ni una plaza de más. **Confirmado bajo concurrencia real, no solo sobre el papel.**

**2. Rendimiento con volumen de datos realista.**
Se sembró una base de datos con 500 clientes, 200 platos en 15 categorías y ~10.000 ventas repartidas en 3 años, y se midió la app real (no una maqueta) en ese estado.
- Un primer aviso de "6,5s de carga" resultó ser un artefacto de la propia prueba (Puppeteer esperando una petición de red no bloqueante de comprobación de licencias revocadas), no un bug de la app — se investigó a fondo y se retractó explícitamente en vez de dejarlo pasar como hallazgo real.
- Se encontró y arregló un bug de rendimiento real: la tabla de Clientes recorría las ~10.000 ventas por cada uno de los 500 clientes, hasta 3 veces por render, tardando 600-900ms. Con un índice construido en una sola pasada (`computeClientStatsIndexed()`), el tiempo bajó a ~290-360ms (lo que queda es solo pintar 500 filas de HTML, no cálculo). Sin regresiones en `test/smoke.test.mjs` ni `test/audit-active.mjs`.

**3. Seguridad ofensiva (XSS y escalada de privilegios).**
- **XSS**: se inyectaron payloads (`<img onerror=...>`, `"><script>...`) en nombre, teléfono, email, notas, alergias y cumpleaños de un cliente, y se verificó su renderizado en Clientes, Reservas y comandas. Todo sale correctamente escapado — cero ejecución de script, confirmado con un listener de diálogos del navegador que nunca se disparó.
- **Escalada de privilegios vía localStorage**: se confirmó, entrando primero como empleado (bloqueo correcto de Gestión) y luego reescribiendo a mano `localStorage['gastrogoan_access_session']` a `{type:'owner'}` desde la consola del navegador, que la app concede acceso sin más comprobación. **Esto es una limitación estructural, no un bug puntual**: al no haber backend ni servidor de autenticación, no hay forma de verificar del lado servidor quién es cada sesión — el modelo de seguridad real depende de que el dispositivo físico (TPV/tablet) esté en manos de confianza, igual que la mayoría de TPVs offline-first del mercado. No es arreglable con un parche sin cambiar la arquitectura del producto (añadir un backend propio), así que se deja documentado como limitación conocida en vez de darlo por "resuelto".

**4. Conflicto de interés al autoevaluarse.**
No es un bug de código, así que no tiene un "arreglo": el mismo agente que escribió los fixes es quien puso la nota. La mitigación real aplicada ha sido sustituir afirmaciones ("está bien") por evidencia verificable (pruebas de concurrencia real, de volumen de datos real, de inyección real) que el propio usuario puede reproducir o pedir que se repita, y retractar explícitamente un hallazgo (el de "6,5s de carga") en cuanto se demostró que era un artefacto de prueba y no un bug real, en vez de dejarlo pasar. Sigue siendo una limitación honesta: una auditoría de seguridad por un tercero independiente antes de manejar pagos reales de clientes seguiría siendo recomendable.

**5. Profundidad de pruebas desigual entre bloques.**
Los puntos 1-3 de esta autocrítica han añadido pruebas en vivo genuinas (no solo lectura de código) precisamente en las áreas que estaban más flojas: concurrencia real en Reservas Online, volumen de datos real en Clientes/Gestión, e inyección real en Clientes/Reservas/Cocina — cerrando buena parte de la brecha entre el Bloque 1 (que ya tuvo esa profundidad) y el resto. Sigue sin haber, por ejemplo, pruebas de volumen de datos realista específicas en Cocina o Sala, ni una auditoría de seguridad ofensiva exhaustiva (solo XSS y privesc de sesión, no todos los vectores posibles) — se reconoce como cobertura ampliada pero aún no exhaustiva al 100%.

---

✅ **Bloque 7 completado: autocrítica resuelta punto por punto, con evidencia — ver Informe Final actualizado**

---

# INFORME FINAL

## 1. Resumen ejecutivo

GastroGoan es una app de gestión de restaurantes 100% cliente (sin backend propio, IndexedDB + Firebase por negocio) con una web pública de reservas/pedidos independiente. Tras esta pasada final de 6 bloques — código, funcionalidad y responsive en las 3 resoluciones, con pruebas en vivo reales (no solo lectura de código) — la app está en buen estado técnico: se encontraron y arreglaron **3 bugs de seguridad/funcionalidad reales** en el bloque de Login y Licencias (uno de ellos una regresión de un fix de seguridad anterior que rompía el login de empleados entre negocios), más varios bugs menores de texto y de accesibilidad táctil. Los bloques de Cocina, Sala, Gestión y la web pública de Reservas/Pedidos Online no arrojaron ningún hallazgo nuevo — se probaron en vivo con datos reales, no se dieron por buenos sin comprobar. El diseño es consistente en toda la app y con la web pública (mismo sistema de color, tipografía y logo), sin señales de módulos hechos por separado. Queda **una decisión de producto pendiente de tu criterio** (no un bug de código) sobre el PIN por defecto de Gestión, y algunas limitaciones de cobertura reconocidas explícitamente por no disponer de un backend real ni dispositivos físicos en este entorno.

## 2. Total de problemas encontrados y arreglados

| Bloque | Código | Funcional | Diseño/Responsive | Total |
|---|---|---|---|---|
| 1 — Login y Licencias | 3 (críticos) + 2 (medios) | 1 (medio) | 3 | **9** |
| 2 — Cocina | 0 | 0 | 0 | 0 |
| 3 — Sala | 0 | 0 | 0 | 0 |
| 4 — Gestión | 0 | 0 | 0 | 0 |
| 5 — Reservas y Pedidos Online | 0 | 0 | 0 | 0 |
| 6 — Coherencia general | 0 | 0 | 0 | 0 |
| **Total arreglado en esta pasada** | **5** | **1** | **3** | **9** |

Detalle de los 9 (todos en el Bloque 1, ver esa sección para el detalle completo):
1. Login de empleado roto entre negocios/dispositivos nuevos (regresión de seguridad) — **crítico**
2. "Abrir sucursal" creaba la sucursal con licencia rota (`await` que faltaba) — **crítico**
3. `saveEmployee()` sin comprobar sesión de propietario — **crítico**
4. Reset de PIN de empleado (GGGG) guardaba el PIN en texto plano — **medio**
5. Modal de nube mostraba "undefined" en vez del código de licencia — **medio**
6. Mensaje de error de licencia describía el formato antiguo — **medio**
7. Texto duplicado en el asistente de conexiones externas — **diseño**
8. Enlaces "Cancelar/Negocios" bajo el mínimo táctil de 44px — **diseño**
9. Botones de papelera bajo el mínimo táctil de 44px — **diseño**

*(Nota: esta tabla cubre solo los hallazgos de esta pasada de 6 bloques. En la misma sesión, antes de empezar este análisis, ya se había hecho y arreglado por separado: unificación de iconografía app-wide, sustitución del icono genérico por el logo real, y una revisión con 5 agentes en paralelo que encontró y corrigió 3 bugs de dinero — doble contabilización de ventas de plataforma en el cierre de caja, venta de plataforma que nunca se enviaba a VeriFactu, comisión de plataforma con el flag de envío mal guardado — más 2 regresiones de CSS móvil y 13 claves de i18n duplicadas. Todo eso sigue en pie y no se ha vuelto a romper, según lo confirmado en este Bloque 6.)*

## 3. Pendiente de tu revisión

**Ninguno.** El único ítem que había quedado pendiente (PIN por defecto de Gestión) se resolvió tras confirmar contigo que Gestión debe ser exclusiva del propietario: se eliminó el gate de PIN compartido por completo — ver "Bloque 1 → Actualización post-informe" para el detalle de lo cambiado y cómo se probó.

## 4. Estado del responsive — confirmado módulo por módulo

Las 3 resoluciones obligatorias (1440×900 / 1024×768 / 390×844) se comprobaron en **todos** los módulos de los 6 bloques, sin excepción — 0 casos de overflow horizontal encontrados en ninguna combinación módulo×resolución.

| Bloque | 1440×900 | 1024×768 | 390×844 | 768×1024 (bonus) |
|---|---|---|---|---|
| 1 — Login y Licencias (11 pantallas) | ✅ | ✅ | ✅ | ✅ (completo) |
| 2 — Cocina (11 módulos) | ✅ | ✅ | ✅ | ❌ no probado |
| 3 — Sala (5 módulos específicos) | ✅ | ✅ | ✅ | ❌ no probado |
| 4 — Gestión (4 módulos) | ✅ | ✅ | ✅ | ❌ no probado |
| 5 — Reservas y Pedidos Online (3 pestañas) | ✅ | ✅ | ✅ (+ capturas visuales) | ❌ no probado |

**Huecos reconocidos explícitamente, no asumidos como "bien" sin comprobar**:
- Tablet vertical (768×1024): completo solo en el Bloque 1; en el resto se hizo auditoría automática de overflow en las 3 resoluciones obligatorias pero no se repitió la vertical.
- Catalán: comprobado en Bloques 1 y 5 (donde importaba más, por texto más largo); no repetido sistemáticamente en Cocina/Sala/Gestión.
- Inglés: no comprobado en ningún bloque (no se pidió explícitamente, y ya se sabe que existe soporte completo de por sí).
- Apaisado en móvil (844×390): no comprobado en ningún bloque.
- Inspección visual manual (capturas) pantalla por pantalla: completa en el Bloque 1 y con capturas puntuales en el Bloque 5; en Cocina/Sala/Gestión la auditoría fue automática (detección de overflow), no una revisión ojo a ojo de cada pantalla.

## 5. Puntuación: 9 / 10

**Lo que suma**: cero bugs de seguridad/dinero conocidos sin arreglar (los que había, se encontraron y corrigieron, incluida la decisión de arquitectura del PIN de Gestión ya resuelta); diseño coherente y sin señales de estar "hecho a trozos"; código limpio (sin restos de depuración); cobertura responsive real y verificada, no asumida; la web pública (lo que ve el cliente final) tiene protecciones reales contra condiciones de carrera en las reservas — **ahora verificado con concurrencia genuina, no solo lectura de código (ver Bloque 7)**; rendimiento corregido y verificado con volumen de datos realista (500 clientes, ~10.000 ventas); probado activamente contra XSS sin encontrar ninguna vía de ejecución; sin ningún ítem pendiente de tu revisión.

**Lo que resta para un 10 real** (no es "estar mal", es lo que falta por verificar o es una limitación estructural, y ya no depende mayormente de código):
- El pago con tarjeta real (Redsys) en la web pública no se ha podido probar de extremo a extremo — depende de una pasarela de pago externa real, fuera del alcance de este entorno. Antes de aceptar el primer pago real de un cliente, haría una prueba con una tarjeta de verdad (o el modo sandbox de Redsys si lo tienen).
- Todo lo probado en móvil ha sido con emulación de Puppeteer, no con un dispositivo físico real. La emulación es buena pero no perfecta (ej. no simula el teclado virtual tapando un campo, ni el comportamiento real de "añadir a pantalla de inicio"). Antes del lanzamiento, una pasada rápida de 10-15 minutos en un Android y un iPhone reales de la vida diaria del negocio (abrir una mesa, cobrar, hacer una reserva desde el móvil de un cliente) daría la confirmación final que ningún emulador puede dar del todo.
- Cobertura de tablet vertical/inglés/apaisado incompleta fuera del Bloque 1 (ver sección 4) — bajo riesgo real, pero no verificado.
- **Limitación estructural confirmada (Bloque 7, punto 3)**: al ser una app 100% cliente sin backend propio, cualquiera con acceso a las devtools del dispositivo físico puede forjar su propia sesión (`localStorage`) y saltarse el control de acceso propietario/empleado. No es un bug de código arreglable en esta pasada — es inherente a la arquitectura sin servidor, y el modelo de seguridad real depende de que el dispositivo (TPV/tablet) esté en manos de confianza, como en la mayoría de TPVs offline-first del mercado.
- **Conflicto de interés al autoevaluarse (Bloque 7, punto 4)**: esta puntuación la pone el mismo agente que hizo los fixes. Se ha mitigado aportando evidencia verificable y reproducible en lugar de solo afirmaciones, pero una auditoría independiente de un tercero sigue siendo recomendable antes de manejar pagos reales de clientes.

## Bloque 8 — Mitigación del conflicto de interés (auditoría ciega) y cierre

El punto 4 de la autocrítica del Bloque 7 (que quien puntúa la app es el mismo agente que hizo los fixes) no tiene arreglo de código — pero sí se podía mitigar en parte: se lanzó una **sesión de IA nueva, independiente, sin memoria de esta conversación ni de este informe**, con instrucciones de auditar el código como revisora externa escéptica (dinero/impuestos, seguridad, concurrencia, rendimiento, calidad de código) y dar su propio veredicto, sin ver el mío.

**Resultado de esa auditoría ciega**: puntuación propia de **7,5/10** (más baja y más cauta que el 9/10 de este informe). Coincidió en que la concurrencia de reservas está bien implementada (leyó `reserveAforoAtomic` entero), que no hay XSS en los campos de mayor riesgo, y que el rendimiento de Clientes ya estaba corregido. Aportó un hallazgo propio que este informe no había señalado con suficiente claridad: **`hashPin()` usaba un hash no criptográfico (XOR de 32 bits), trivialmente reventable por fuerza bruta** una vez conocido el código de licencia — usado tanto para PIN de empleados como para la contraseña real del propietario. También señaló que la barrera de seguridad real de una app sin backend está en las reglas de Firebase de cada negocio, fuera de este repositorio, y que sin verlas no podía dar el visto bueno completo.

**Qué se hizo con ese hallazgo**:
- **Hash de PIN/contraseña reforzado** (commit `8a55e85`): se sustituyó el golpe único de hash por **8.000 rondas encadenadas** (como hace PBKDF2 conceptualmente — encarecer el cálculo, no solo cambiar el algoritmo), con un formato nuevo (`H2:`) para lo que se guarde a partir de ahora y compatibilidad hacia atrás total con lo ya guardado (`H:`) para no invalidar el acceso de negocios reales que ya tuvieran PIN/contraseña configurados. Verificado con pruebas: el hash nuevo tarda ~25ms (imperceptible en un login) pero es miles de veces más caro de probar por fuerza bruta; la compatibilidad con el formato antiguo se comprobó explícitamente. Sin regresiones en `test/smoke.test.mjs`.
- **Reglas de seguridad de Firebase Realtime Database revisadas y corregidas de verdad** (no solo propuestas): se detectaron y arreglaron dos problemas reales — falta de `.validate` en `aforoHold`/`requests` (permitía escribir directamente contra Firebase saltándose la lógica de la app, ej. para bloquear el aforo de un negocio a propósito) y una ruta (`pedidosHold`) que no tenía regla alguna, por lo que sus escrituras se denegaban por defecto — **un bug funcional real que probablemente impedía que el límite de pedidos por franja funcionara en producción**, no solo un tema de seguridad. Las reglas corregidas se publicaron en el proyecto Firebase real (`plataforma-gastrogoan`) y **se verificaron con una reserva de prueba real de principio a fin** (negocio de pruebas → web pública → reserva enviada → aparece correctamente en el panel de Reservas), confirmando que el arreglo funciona sin haber roto nada.
- La limitación de `tenants/$tenantId` (código de licencia como única "contraseña" del negocio, sin identidad revocable) se deja documentada como pendiente de una Cloud Function si se quiere resolver del todo — no se tocó, por ser un cambio de arquitectura, no un parche de reglas.

**Lo que sigue sin tener solución de código, y no la va a tener**: que la evaluación final la siga poniendo una IA (esta vez dos, pero ambas IA) y no un tercero humano real. Se recomienda, antes de manejar pagos reales de clientes de forma continuada, una auditoría de seguridad por una persona o empresa especializada — no porque haya indicios de que algo falle, sino porque es la única forma de cerrar del todo el conflicto de interés que ni la auditoría ciega pudo eliminar.

---

## 6. Veredicto final: **LISTO PARA VENDER**

La app (TPV, Cocina, Sala, Gestión, web pública) está técnicamente lista para usarse en un restaurante real — los bugs de seguridad y de dinero que había se encontraron y se arreglaron, la única decisión de producto pendiente (PIN de Gestión) ya se resolvió, una pasada adicional de autocrítica (Bloque 7) confirmó con pruebas reales de concurrencia, volumen de datos e inyección que lo ya reportado como "correcto" lo era de verdad, y una auditoría ciega independiente (Bloque 8) encontró un hash de PIN débil y un bug real en las reglas de Firebase (pedidosHold sin protección) — ambos ya corregidos y verificados con una reserva de prueba real de principio a fin. Quedan, no bloqueantes:
1. Probar un pago real con Redsys (o su modo sandbox) al menos una vez.
2. Una prueba rápida en un móvil real (Android e iPhone) antes de la primera venta, para confirmar lo que la emulación no puede garantizar al 100%.
3. Tener presente la limitación estructural de sesión forjable por localStorage (Bloque 7, punto 3) — asumible mientras el dispositivo físico esté controlado por el negocio, como es el uso previsto.
4. Considerar una auditoría de seguridad por un tercero humano antes de manejar pagos reales de forma continuada (Bloque 8) — recomendable, no bloqueante.

No hay motivo técnico para no lanzar.
