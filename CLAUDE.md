# GastroGoan — contexto para Claude

App de gestión para restaurantes, **100% cliente**, que se vende por licencia a hosteleros.
Se entrega como **dos archivos HTML sueltos** que el cliente abre desde `gastrogoan.com`.

---

## La meta, y lo que obliga

**5.000 licencias vendidas.** No es una cifra decorativa: es el criterio con el
que se decide cualquier duda de arquitectura.

De ahí sale una regla que no se negocia:

> **Nada puede costarle dinero al dueño de GastroGoan por cada cliente que
> vende.** Ni tráfico, ni conexiones, ni base de datos, ni llamadas a ninguna
> IA. Si un recurso crece con el número de licencias, tiene que pagarlo el
> negocio que lo usa, desde su propia cuenta.

Es lo que ya hace la nube (cada negocio, su Firebase) y la clave de I+D (cada
negocio, la suya). Cualquier cosa nueva se mide contra esto **antes** de
construirla: a 5.000 clientes, un céntimo por cliente y mes son 50 € al mes que
no estaban en el plan.

⚠️ **Sin pagos recurrentes.** Es una decisión del dueño, no una preferencia:
las soluciones que empiezan por "sube al plan de pago" están descartadas
mientras haya alternativa técnica.

### Dónde se publica

**Cloudflare Pages** (dos proyectos, desde este repositorio). Ver
`deploy/README.md` para la configuración exacta.

Se eligió por una razón que a 5.000 licencias es decisiva: **ancho de banda
ilimitado** para contenido estático, y **500 publicaciones al mes**.

Lo que se descartó y por qué:
- **Netlify** (donde estaba): en 2026 va por créditos — 300 al mes, 15 por
  publicación (o sea **20 publicaciones**) y 20 por GB (**15 GB como mucho**).
  Ya congeló la app dos semanas una vez. Con 5.000 negocios harían falta unos
  270 GB/mes. No da ni pagando el plan Pro.
- **Render** (el paso intermedio): 5 GB/mes. Da para unos 20-70 negocios.
- **Cloudflare Workers** (primer intento): para asignarle un dominio propio
  exige el dominio ENTERO en Cloudflare, nameservers incluidos, y el
  registrador (Canva) no lo permite. **Pages sí acepta un subdominio con un
  simple CNAME desde el DNS de fuera** — esa es toda la diferencia, y es lo
  que desbloqueó la mudanza.

---

## El espejo público vive en la nube de CADA negocio

Lo que lee `reservagastrogoan.html` (carta, aforo, reservas que entran) estaba
en la Firebase compartida de la plataforma. No escala, y el techo llega mucho
antes de lo que parece: el plan gratuito da **100 conexiones simultáneas**, y
una conexión es **una pestaña abierta**. Con el espejo compartido, cada app de
gestión y cada cliente mirando la carta ocupaban una conexión del MISMO
proyecto — a partir de unos 50-100 negocios, la web de reservas falla para
todos a la vez, un viernes por la noche.

- `getPublicMirrorApp()` devuelve la nube del negocio (que ya está conectada:
  **no abre ninguna conexión nueva**) o la compartida como respaldo.
- La web pública pregunta por REST (`consultarPlataforma`) en qué nube está
  ese negocio: **una petición HTTP no abre socket**, así que no gasta
  conexiones ni crea cuentas anónimas. Solo si eso falla usa el SDK.
- En la plataforma queda únicamente una guía mínima: `publicLookup/{publicId}`
  y `publicSlugs/{slug}`, ambas de lectura abierta. No son secretos.

⚠️ **Nadie se muda hasta que su nube lo demuestra.** `comprobarEspejoEnNubePropia()`
escribe de prueba en los nodos que las reglas VIEJAS no tenían; solo si
funciona publica la guía. Un negocio con reglas antiguas sigue en la
compartida y se muda solo cuando su dueño las actualice. Los textos para pegar
están en `reglas/`.

---

## El programa se guarda, los datos vuelan

La app pesa 4 MB. El service worker la servía pidiéndola SIEMPRE a la red: un
negocio abriéndola 20 veces al día son 2,4 GB al mes de un solo cliente.

Ahora `sw.js` sirve la copia guardada (arranque instantáneo, cero tráfico) y
lo que se consulta es `version.json`: **29 bytes**. Si hay versión nueva y la
app se acaba de abrir sin que nadie haya tocado nada, **se actualiza sola**;
si se está trabajando (modal abierto, algo escrito, ya hubo un toque), avisa
con una barra y decide el hostelero. El botón "Actualizar" de la cabecera
fuerza la comprobación saltándose el ciclo de 6 h.

⚠️ Esto NO afecta a los datos: suben en 0,8 s (`CLOUD_SYNC_DELAY`) y bajan al
instante por bloques. Lo que se cachea es el programa.

---

## Arquitectura

**No hay backend propio.** Todo corre en el navegador:

- **Datos locales**: IndexedDB (`idbGet`/`idbSet`, clave `gastrogoan_data_v1`), objeto global `DB`.
- **Nube por negocio**: cada negocio configura **su propio proyecto Firebase gratuito** (`DB.business.ownFirebase = {apiKey, databaseURL}`). No hay nube compartida: así el coste de cada negocio es suyo. **Este paso es obligatorio** en la configuración inicial (`showFirebaseSetupGate`).
- **Firebase compartido de la plataforma** (`plataforma-gastrogoan`, `PLATFORM_FIREBASE_CONFIG`): se usa solo para dos cosas — la lista de códigos de licencia emitidos (`gastrogoan/issuedCodes`) y el espejo público de reservas/pedidos (`gastrogoan/public/...`).

### Build

`bash build.sh` concatena CSS + JS dentro de `index.html` y genera `dist/`:

```
js/core.js  i18n.js  ui.js  finance.js  recipes.js  menu.js
   tpv.js  operations.js  hr.js  idr.js  polish.js  app.js   ← en este orden
```

**Nunca editar `dist/` a mano** — se regenera. Editar `js/*.js` y `css/styles.css`, luego `bash build.sh`.

`dist/` está en `.gitignore` (no se commitea, pero sí se entrega al cliente).

### Los dos entregables

| Archivo | Qué es | Quién lo usa |
|---|---|---|
| `dist/index.html` | La app de gestión completa (~3,6 MB, autocontenida) | El hostelero y su personal |
| `dist/reservagastrogoan.html` | Web pública de reservas y pedidos | **Clientes finales del restaurante** |
| `generador-licencias.html` | Emite códigos de licencia | **Solo el dueño de GastroGoan — PRIVADO, nunca publicar** |

---

## Licencias y acceso

**La identidad del dueño y la licencia de un negocio son cosas separadas.** El cliente compra una **cuenta** (usuario + PIN) y, dentro de ella, va canjeando un **código de negocio** por cada local. Ambos se emiten con `generador-licencias.html` (requiere iniciar sesión como admin `gastrogoan@gmail.com` — sin eso ni la cuenta ni el código sirven).

Los dos pasos del generador son **independientes**: a un cliente que ya tiene cuenta y compra otro local se le genera **solo un código** (paso 2). El botón **"¿Ya tiene cuenta?"** consulta `ownerNames` para no equivocarse al vender.

### Cuenta de propietario (usuario + PIN)

- El nombre se **normaliza** con `ggOwnerUser()`: minúsculas, sin acentos ni espacios (`Casa Paco` → `casapaco`). Así nadie se queda fuera por escribirlo distinto.
- El generador **reserva el nombre** de forma atómica en `gastrogoan/ownerNames/{usuario}`; si ya existe propone `casapaco2`. La colisión se resuelve **al emitir**, no en la cara del cliente.
- ⚠️ **El PIN no se guarda en ningún sitio, ni hasheado.** Lo que se guarda es un nodo cuya **ruta** se deriva de usuario+PIN: `ggOwnerAuthKey()` → `gastrogoan/ownerAuth/{authKey}`. Entrar = leer esa ruta y ver si existe. Sin el PIN no se puede ni construir, y las reglas solo dan lectura a nivel de `$authKey` (nunca del padre), así que tampoco se puede listar para ir probando.
- De ese mismo nodo cuelga `businesses/{tenantId}` = la lista de negocios del dueño, que es lo que hace que aparezcan solos en cualquier dispositivo (`syncOwnerBusinessList()`).
- El login guarda `{user, authKey, pinHash}` en `gastrogoan_owner_login`. Solo la primera vez en cada dispositivo hace falta internet; después se valida contra `pinHash` en local.
- **Cambiar el PIN vale en todos los dispositivos** (`changeOwnerAccessPin`): como la ruta se deriva del PIN, cambiarlo **muda el nodo entero** a la ruta nueva, con la lista de negocios dentro. Se crea el nodo nuevo **antes** de borrar el viejo a propósito: si se corta a mitad, lo que queda es el PIN antiguo funcionando, nunca un cliente sin ningún PIN válido. Exige internet.
- ⚠️ **`ggOwnerId(user)` es el identificador ESTABLE del dueño** (solo del usuario, no del PIN) y es lo que se guarda en `codeClaims`. Usar el `authKey` ahí sería un error grave: al cambiar el PIN el dueño se quedaría bloqueado de su **propio** negocio con un "ese código ya está en uso en otra cuenta".

### Código de negocio

- 8 caracteres, registrado en `gastrogoan/issuedCodes`. **Ya no lleva contraseña**: se calculaba a partir del propio código con un algoritmo que viaja en el JS del cliente, así que no demostraba nada.
- `ggBizTenantId(code)` deriva el `tenantId`. `getPublicId()` deriva el id público (reservas) del tenantId.
- Canjear exige **internet**: `redeemBusinessCode()` devuelve `{lic, reason}` con `reason` ∈ `offline` | `unknown` | `claimed`.
- **Un código pertenece a un solo dueño**: se reserva de forma atómica en `gastrogoan/codeClaims/{code}`, guardando el `ggOwnerId`. El mismo dueño sí puede volver a canjear el suyo (reinstalación, o tras cambiar de PIN).
- **Revocación**: `checkLicenseRevocation()` lee `revoked-licenses.json` de GitHub. Es *fail-open* a propósito (sin internet no bloquea a nadie) y asíncrona, no bloquea el arranque.
- **Código maestro `GGGG`**: se escribe en el campo del PIN para resetear el acceso (de propietario o el PIN de un empleado) sin perder datos. Solo funciona en un dispositivo donde esa cuenta ya entró alguna vez, porque necesita el `authKey` guardado en local para poder mudar el nodo.
- **Si el cliente pierde el PIN y todos los dispositivos**: el generador (paso 3) reemite la cuenta con el mismo usuario y un PIN nuevo. Recupera sus negocios volviendo a canjear sus códigos — lo permite que `codeClaims` guarde el `ggOwnerId`, estable. La ruta antigua queda **huérfana** (no se puede borrar sin el PIN viejo), así que el PIN antiguo sigue siendo válido: sirve para un olvido, no para un robo.

### Sesión

`getAccessSession()` → `{type: 'owner'|'employee', employeeId, area, ts}`.
⚠️ **El campo es `type`, NO `role`.** (Error cometido varias veces.)

- **Gestión (Gestión Económica y Mi Negocio) es exclusiva del propietario.** No hay PIN alternativo — se eliminó a propósito. Un empleado ve `denyGestionAccess()`.
- `requestBusinessPinAction(...)` es un mecanismo **distinto y vigente** para confirmar acciones sensibles (anular venta, borrar empleado…). No confundir con el PIN de Gestión eliminado.

#### Los seis modos de estar dentro

Propietario, empleado de cocina, empleado de cocina CON edición, y los mismos
tres de sala. **"Es repartidor" NO es un séptimo modo**: es una casilla de la
ficha que mete al empleado en el reparto automático de pedidos a domicilio, y
ve exactamente lo mismo que cualquier otro de sala.

Dos clases de CSS, y ahí está casi todo el lío:

| Clase | Quién la ve | Para qué |
|---|---|---|
| `.owner-only` | propietario **o** empleado con `canUnlockEdit` | turnos y stock **de su área** |
| `.owner-strict` | **solo** propietario de verdad | todo lo que toca a OTRO compañero: su ficha, su PIN, sus vacaciones |

⚠️ **Decisión tomada (1/09), no volver a replantearla:** un jefe de cocina o
de sala con edición **gestiona turnos, no personal**. En Personal solo ve su
propia tarjeta (ahí están el teléfono, el email y el PIN de los compañeros);
en Día y Semana ve al equipo entero y sí puede tocar sus turnos. Visto desde
fuera parece incoherente —y por eso hay una nota en Personal que lo explica—,
pero es lo que el dueño quiere.

⚠️ **Un permiso que se niega EN SILENCIO se lee como una app rota.**
`saveEmployee` hacía `return` a secas: se rellenaba el formulario, se pulsaba
Guardar y no pasaba nada. El dueño lo contó como "no me deja editar los
empleados" — no era que no le dejara, era que no se lo explicaba. Cualquier
guard nuevo que pueda alcanzarse desde algo VISIBLE tiene que avisar y decir
qué sí se puede hacer. Los guards de segunda barrera (botón ya oculto, solo
alcanzables desde la consola) sí pueden callar.

Todo esto lo fija `test/permisos.mjs`, que recorre los seis modos. Las otras
34 pruebas corren como propietario, o sea en el único modo donde ningún
permiso puede fallar.

### Varios negocios en un dispositivo (slots)

- Cada negocio = un *slot* con su propia IndexedDB (`slotIdbName(id)`) y su propia licencia (`slotLicenseKey(id)`).
- `DB` y `DB.license` reflejan **solo el slot activo**.
- Una cuenta recién creada **no tiene ningún negocio**: `ownerHasAnyBusiness()` es false y el selector se pinta vacío, con un botón de canjear (`redeemFirstBusiness()`), que canjea dentro del hueco que ya existe en vez de crear otro al lado.
- **Diseño previsto**: entras con tu cuenta, canjeas tu primer negocio y **desde el botón "Negocios" añades los demás**:
  - `addNewBusiness()` → "Nuevo independiente": negocio aparte, vacío, con su propia nube.
  - `addSucursal(parentId)` → "Abrir sucursal": copia carta/recetas/ingredientes/proveedores/protocolos del padre; **no** copia mesas, empleados ni datos operativos; **hereda la nube del padre**.
  - Ambos requieren **otra licencia** (otra venta).

### Hash de PIN/contraseña

`hashPin(pin, salt)` → formato `H2:` con **8.000 rondas** (encarece la fuerza bruta).
`pinMatchesHash(pin, hash, salt)` verifica **tanto `H2:` como el antiguo `H:`** (compatibilidad — no romper el acceso de negocios ya activos).
⚠️ La sal depende de qué se valida: para el PIN de un **empleado** es el **código de su negocio** (al validar uno de *otro* negocio hay que pasar el código de ESE negocio); para el PIN local del **propietario** es su **nombre de usuario**.

---

## Reglas de Firebase (proyecto `plataforma-gastrogoan`)

Publicadas y verificadas con una reserva real. Copia de referencia en `database.rules.propuesta.json`.

- `issuedCodes/$code`: lectura por cualquiera autenticado, escritura **solo** `gastrogoan@gmail.com`.
- `ownerNames/$user`: igual — la reserva de nombres solo la escribe el generador.
- `ownerAuth/$authKey`: lectura solo **a nivel de `$authKey`** (nunca del padre: si no, se podría listar y probar). El cliente puede crear un nodo **solo en una ruta libre** y borrar uno existente — es lo que permite mudar la cuenta al cambiar el PIN — y se le exige que el `user` sea un nombre ya vendido (existe en `ownerNames`), para que nadie llene la base de cuentas inventadas.
- `codeClaims/$code`: cualquiera autenticado puede reservarlo **si está libre** (`!data.exists()`); solo el admin puede liberarlo.
- `public/$publicId/requests/$id`: exige `type` (`reserva`|`pedido`|`nps_response`) y `createdAt`; no se puede sobrescribir una existente.
- `public/$publicId/aforoHold` y `pedidosHold`: solo números 0–500 (impide manipular el aforo saltándose la app).

⚠️ Los campos reales de una solicitud son **`type` y `createdAt`** (en inglés), no `tipo`/`creadoEn`.

**Limitación conocida y documentada** (ver `ANALISIS_GENERAL.md`, Bloque 8): `tenants/$tenantId` solo exige `auth != null`, así que el código de licencia funciona como contraseña permanente no revocable de los datos de ese negocio. Resolverlo requiere una Cloud Function + custom claims y el plan Blaze. **Decisión tomada: no hacerlo por ahora**, riesgo bajo.

---

## Convenciones de trabajo

- **Idioma**: todo en español — mensajes de commit, comentarios de código, conversación.
- **Comentarios**: explican **por qué**, no qué. Suelen documentar el bug que motivó el código.
- **i18n**: 3 idiomas (`es`, `ca`, `en`) en `js/i18n.js`. Toda cadena nueva va en los tres. `t('clave')` para UI, `gl({es,ca,en})` para prosa larga.
  Tres cosas que la auditoría del 1/09 dejó claras y conviene no volver a
  descubrir:
  - **Un dato guardado no se traduce; se traduce al mostrarlo.** El valor
    que va a la base es SIEMPRE el nombre en castellano (clave estable con
    la que se agrupa y se ordena) y se pinta con un `…Label()`:
    `allergenLabel`, `ingredientCategoryLabel`, `businessTypeLabel`.
  - **La excepción son los 275 artículos del catálogo de materia prima.**
    Ahí se traduce en la SIEMBRA (`buildBaseIngredientsSeed`), no al pintar,
    porque el nombre del ingrediente es dato editable del negocio: en cuanto
    lo renombran es suyo, y el albarán del proveedor tiene que salir en el
    idioma en que el hostelero lo lee. Efecto conocido: un negocio creado en
    castellano que después cambia a inglés conserva su catálogo en
    castellano — que es lo correcto, porque a esas alturas ya lo ha tocado.
  - **Las fechas no se escriben a mano.** `localeActual()` (js/i18n.js) da el
    locale del idioma activo. Había quince `toLocaleDateString('es-ES')`
    sueltos, y por eso la semana de Horarios decía "31 ago – 6 sept" con la
    app en inglés. Ninguna prueba lo veía: `idiomas.mjs` mide la CAJA (que el
    texto no se desborde), no el IDIOMA.
- **Escapado**: `escapeHtml()` en **todo** dato de usuario que entre en HTML. Verificado sin huecos.
- **Objetivo táctil mínimo**: 44×44 px. Ojo con dos trampas ya pisadas:
  las reglas de pantallas MÁS pequeñas encogían los botones aún más
  (34-36 px), y varios tamaños estaban escritos a mano en el HTML, donde
  ninguna regla de CSS los alcanza.
- **En un móvil tiene que verse igual de bien que en un PC** (13/09). El
  dueño lo dijo así: *"lo que deba estar en una misma fila que esté, y si
  debe saltar que se vea bien; nada cortado ni fuera de lugar"*. Cinco
  reglas, y las cinco salieron de fallos reales:
  - **Se prueba en CINCO anchos: 320, 360, 390, 412 y 430.** El 360 es el
    más común en Android y **no se probaba** — por ahí se coló todo. Lo mide
    `test/movil.mjs`, con datos de un negocio lleno (con cuatro filas cabe
    cualquier cosa) y también **con los modales abiertos**, que es donde se
    escribe y lo que ninguna auditoría miraba.
  - **Una palabra NUNCA se parte**, y N palabras no deberían necesitar más
    de N renglones. "Hamburguesas" salía en tres líneas dentro de 40 px.
  - **Nada de letra por debajo de 11 px.** Y los tamaños no se escriben a
    mano: para eso está `.txt-xs`. Había 36 `style="font-size:10.5px"`
    sueltos en el JS, donde ninguna regla de CSS los alcanzaba — la misma
    trampa de los objetivos táctiles, dos líneas más arriba.
  - **Las tiras de pestañas envuelven, no se arrastran.** Siete pestañas en
    Gestión Económica no caben en 360 px: envolviendo se ven todas; con
    scroll horizontal, la fila se queda cortada a media palabra y nadie
    descubre que existe CAPEX.
  - **Las reglas de móvil van TODAS juntas** al final de `css/styles.css`,
    no como excepción metida en cada pantalla. Arreglar la causa arregla
    veinte pantallas, y la pantalla que se escriba mañana nace bien.

  ⚠️ Al medir líneas de texto, se cuentan con un `Range` sobre el nodo
  (`getClientRects()` da un rectángulo por línea). Dividir la altura del
  elemento entre su `line-height` cuenta el PADDING: un botón de 44 px
  "tenía" tres líneas siempre, y la primera versión de la prueba dio
  doscientos falsos positivos.
- **Contraste mínimo del texto**: 4,5:1 (3:1 si es grande). `--muted` es el
  gris de TODO el texto secundario y aparece 150+ veces por pantalla: si se
  toca, comprobar contra los cuatro fondos de la app (blanco, `#FAF8F4`,
  `#F1EFE9`, `#F4F4F4`). Lo verifica `test/contraste.mjs`.

### Un linter por fichero NO entiende esta app (probado el 16/09)

Se probó **anti-slop** (reglas de Oxlint). **No se adopta, y no por pereza:**

- **752 de sus 1.017 avisos eran falsos.** Dice que `localeActual`, `gl`,
  `setLang`… "no se usan nunca". Y es normal: `build.sh` **concatena los once
  ficheros** dentro de un solo HTML, así que cualquier función declarada en
  `i18n.js` y usada en `app.js` le parece muerta. Un linter que mira fichero
  a fichero se equivoca con esta arquitectura por definición.
- **247 avisos eran la regla `no-runtime-typeof`**, que pide no usar `typeof`
  y "parsear en la frontera de entrada". Es doctrina de código tipado; aquí,
  con IndexedDB y JSON fusionado desde la nube, `typeof x === 'string'` es la
  comprobación correcta y necesaria.
- **Los 3 avisos de `<\/script>` son un ERROR del linter.** Pide quitar la
  barra invertida de `<\/script>` dentro de las plantillas que generan las
  ventanas de impresión. Si se quita, `</script>` **cierra el script de
  fuera** y revienta la impresión. El aviso automático pedía romper la app.
- **`oxlint` además no se puede instalar aquí**: arrastra `vite-plus →
  vitest → webdriverio`, que exige `puppeteer-core <= 24.x`, y el repositorio
  necesita la 25.x para las 84 pruebas de navegador.

De las 1.017, **una sola era de verdad**: `[...DB.sales.filter(...)]` en
`tpv.js` copiaba dos veces el mismo array. Corregida.

⚠️ La moraleja no es "los linters no sirven": es que **aquí un aviso
automático hay que comprobarlo antes de hacerle caso**, y arreglar 1.017 de
golpe habría roto la impresión de tickets sin que ninguna prueba lo viera.

### El plugin de diseño MEJORA lo que hay, no lo cambia

`.claude/settings.json` carga **ui-ux-pro-max** (paletas, tipografías,
jerarquía) en cualquier sesión de este repositorio. Está para afinar, no para
rediseñar:

> ⚠️ **El sistema de diseño de GastroGoan manda siempre.** Los cuatro fondos,
> `--muted` y su contraste, los 44×44 px de objetivo táctil, `.txt-xs` y las
> reglas de móvil al final del CSS son decisiones tomadas, casi todas a raíz
> de un fallo real. Si el plugin propone otra paleta, otros tamaños o mover
> las reglas de sitio, **gana lo que ya existe**.

El motivo no es gusto: `test/contraste.mjs`, `test/movil.mjs` y
`test/visual-audit.mjs` miden precisamente eso. Una sugerencia aceptada a la
ligera tumba la batería y cuesta media tarde entender por qué.

---

## Libro de marca (Plan 360º) — tarea pendiente de repetir por negocio

**Cuando el dueño diga "hazme el libro de marca de [negocio]", es ESTO:**
él pasa las respuestas del Cuestionario en profundidad (botón "Ver /
copiar todo" del panel del coach, más fotos si las hay) → Claude rellena la
plantilla con respuestas y **conclusiones** (sin preguntas) → entrega un PDF
→ el coach lo sube en Recursos → Libro de marca → "Subir PDF" (máx. 15 MB) y
lo envía. Sin PDF subido, el negocio no ve nada.

Todo está en `tools/libro-marca/` (léase su README antes de empezar):
`generar.mjs` hace la plantilla de 39 páginas y **aborta si alguna de las
323 preguntas del cuestionario no tiene sitio** (`cobertura.mjs`). Eso lo
exigió el dueño: tiene que entrar TODO, con más espacio para lo importante
(páginas de diseño) y lo operativo en las fichas detalladas.

⚠️ Costó muchas vueltas llegar aquí. Lo que el dueño rechazó, para no
repetirlo: un resumen que se salte cosas, la lista plana de pregunta +
respuesta, un editor tipo Word, y cualquier diseño que "huela a IA"
(tipografías inventadas, tarjetas con borde de color, chips por todas
partes). Tipografía y paleta: siempre las de GastroGoan.

## Plan 360°: lo escriben DOS, contra una nube que borra lo vacío (28/09)

Auditoría completa del 28/09 (panel del coach + app del negocio): 37 fallos,
casi todos de dos causas. Conviene tenerlas presentes al tocar cualquier cosa
del Plan 360:

- **Firebase no guarda `[]`, `{}` ni `null`.** Un día de trabajo sin tareas
  volvía de la nube SIN `tasks` y la pantalla entera se quedaba en blanco (en
  la app y en el panel). Se reponen al llegar: `plan360RepararVacios`
  (js/core.js, también en `applyRemoteBlock('business')`) y
  `plan360RepararVaciosCoach` (panel).
- **El bloque `business` lo escriben el coach y el negocio.**
  - La app lo fusiona **a tres bandas** (`fusion3`, contra
    `lastSyncedSnapshot.business`): lo que el negocio cambió sin subir se
    queda, lo del coach entra, y si los dos tocaron el mismo dato gana la nube.
  - El panel guarda con `update()` **solo las claves `plan360*`**, nunca el
    negocio entero con `set()`.
  - El panel reconoce su propio eco con `plan360Huella` (compara como lo
    devuelve Firebase, sin lo vacío). Sin eso, cada guardado parecía un cambio
    de fuera y te sacaba al calendario. Si el negocio cambia algo mientras el
    coach edita, sale un aviso, no un redibujado.
- **El PDF del Libro de marca vive en `db/plan360LibroPdf`**, no dentro de
  `business` (viajaba entero con cada cambio y, pasado ~7 MB, Firebase
  rechazaba TODOS los guardados). Tope: 7 MB.
- Tareas por **id**, no por posición. Claves de Firebase sin `. # $ / [ ]`
  (`plan360ClaveFirebase`). Nada de `blob:` en lo que se guarda.
- Prueba permanente: `test/plan360.mjs`.

⚠️ **Las reglas de Firebase no admiten claves `"//"`.** Desde el 14/09 las
tres copias llevaban comentarios así y el emulador oficial las rechazaba
(«Expected '{'»), así que la batería del emulador no arrancaba. Las
explicaciones están ahora en `reglas/NOTAS.md`.

## Mantenimiento: el mes del gestor, después del Plan 360 (29/09)

Servicio de 75 € + IVA al mes (precio fijado el 6/10; el Plan 360, 950 € + IVA): un mes tipo de cuatro lunes (1º y 3º por WhatsApp, 2º
y 4º por videollamada) donde el coach va soltando **entregas suyas** y
**tareas para el negocio**. Las tareas son el plus: el hostelero ve que hay
alguien encima.

- Vive en `plan360Mant.meses['AAAA-MM'].semanas.sN.items[id]`. **Todo
  objetos con clave, nunca listas** (la fusión a tres bandas no se pisa por
  posición) y semanas `s1…s5` (Firebase convierte `{"1":…}` en lista).
- Catálogo de ~200 actividades con icono en `MANT_GADGETS`
  (admin-panel/plan360.html). ⚠️ Sus iconos se pintan en la app como DATO:
  por eso `tools/recortar-iconos.py` rastrea también ese fichero. Escribir
  siempre el nombre entero (`'ti-glass'`), nunca armado.
- `meses` de cada actividad = cuándo se sugiere en «Este mes toca».
- El negocio marca sus tareas, contesta en cada una (`respuesta`) y ve «Lo
  que llevamos juntos». Las tareas de la semana salen en el Panel de Control.
- «Mi semana» (lista de clientes del panel) lee SOLO `plan360Mant` de cada
  nube y se desconecta (`goOffline`) al terminar.
- La plantilla del coach está en `gastrogoan/coachConfig` de la plataforma
  (solo admin). ⚠️ Necesita las reglas nuevas publicadas; sin ellas se
  guarda solo en el navegador y lo avisa.

### Plan 360 y mantenimiento, separados (6/10)

Son dos servicios distintos y el panel los trata así:
- **Servicio activo** de cada cliente: `p360Fase(b)` → `360` | `mant` |
  `piensa` | `fin`. Manda `plan360Servicio.fase` si existe (lo fija el coach
  con el selector, o la app al aceptar el mantenimiento en el cierre); si no,
  se deduce de la fecha de inicio, la respuesta del cierre y si hay meses.
- El cliente se abre en su servicio activo, con dos pestañas arriba.
- **«Mi agenda»** (antes «Mi semana»): lunes a domingo con los dos servicios
  (días presenciales, reuniones, cierre del día 28, lunes de mantenimiento,
  entregas, «volver a hablar») y la lista de clientes agrupada por servicio.
  Lee solo seis claves `plan360*` de cada nube, nunca el negocio entero.
- Cada mes de mantenimiento tiene **objetivo** (`mes.objetivo`) y **cierre**
  (`mes.cierre = {bien, mal, siguiente, objetivo, ts}`); el siguiente pasa
  solo a ser el objetivo del mes que viene. El negocio ve los dos en su app.
- La agenda pinta HOY lo que no puede depender de la memoria: mes de
  mantenimiento sin preparar, mes anterior sin cerrar, Plan 360 terminado
  sin respuesta y «volver a hablar» vencido. Una fase fijada a mano cede si
  el negocio contesta después (`respondidoEn`) o si es «360» pasado el día 28.
- El cierre compara el Día 1 con el último mes COMPLETO, nunca el mes en curso.
- **Cuota, renovación y baja** (7/10) en `plan360Servicio`: `cobros['AAAA-MM']
  = {ts, importe}`, `cuota` (75 por defecto), `mantHasta` y `baja`. La agenda
  avisa de la cuota sin cobrar desde el día 5 y de la renovación, y suma lo
  cobrado y lo pendiente del mes. La app solo FUSIONA en `plan360Servicio`.
- ⚠️ **El coach sube `plan360Mant` por diferencias, elemento a elemento**
  (`mantDiferencias` contra `mantBase`, lo último leído o subido). Mandarlo
  entero borraba el tick o la respuesta que el negocio pusiera entre medias.
- Prueba: `test/plan360-fases.mjs`.

### Números del negocio para el coach (6/10)

- La app calcula cada mes un resumen pequeño (`plan360KpisMes`, js/finance.js)
  con las MISMAS funciones que su Cuenta de Resultados y lo deja en
  `business.plan360Kpis` = `{meses:{'AAAA-MM':…}, dia1:{…}, ts}`: ventas,
  tickets, ticket medio, food cost, personal, resultado, punto de
  equilibrio, canales, mermas, NPS y tres alertas (subida de proveedor,
  plato con peor food cost, día más flojo). Solo si el negocio está en el
  Plan 360 o en mantenimiento, cada 10 min como mucho y sin guardar si no
  cambia nada. `dia1` (mes anterior al inicio) se guarda una vez.
- ⚠️ `plan360Kpis` lo escribe SOLO la app: el panel lo excluye de
  `esClavePlan360` para no devolver una copia vieja ni tomarlo por un
  cambio del negocio.
- Panel: informe del mes en Mantenimiento (frente al mes anterior y al de
  hace un año, alertas, «Copiar para WhatsApp», «Añadir como Reporte del
  mes»), cierre «Día 1 → hoy» con botón para pasarlo a los KPIs del cierre,
  y en «Mi semana» las cifras de cada cliente y el aviso «llámale» si lleva
  14 días sin marcar tareas. App: marcador «En números» con lo ganado en
  euros al mes.
- Prueba: `test/kpis-coach.mjs`.

## Pagos online: solo Stripe (desde el 30/09)

**Redsys se quitó entero.** Su aviso de «pagado» dependía de cómo configurara
el banco cada TPV, con el comercio de pruebas genérico no llegaba nunca, y hay
un problema conocido entre los avisos de Redsys y Cloudflare. Decisión del
dueño: solo Stripe. No volver a replantearlo sin un motivo nuevo.

- **Stripe Connect (Accounts v2, panel completo, comisiones a su cargo), cobro
  directo**. ⚠️ Las cuentas se crean con la API **v2** (`/v2/core/accounts`):
  Stripe rechaza la v1 en integraciones nuevas y no se puede reactivar. Cada restaurante
  conecta SU cuenta («Conectar con Stripe», Mi Negocio); el dinero es suyo y
  la comisión la paga él. A GastroGoan no le cuesta nada.
- El Worker (`worker/pagos-worker.js`, ver su README) **se publica pegándolo a
  mano en Cloudflare**: tocar el fichero no cambia nada hasta entonces. Solo
  guarda qué cuenta de Stripe es de qué negocio (`private/{publicId}/stripe`).
- **Los precios de la web pública los pone el negocio, no el navegador**
  (`revisarPreciosPedidoPublico`, `senalReservaPropia`): antes llegaba una
  hamburguesa a 0,01 € y se cobraba 0,01 €, también en efectivo.
- **Pagar de menos no confirma nada** (`aplicarPagoConfirmado`).
- **La confirmación se PREGUNTA** (`comprobarPagosTarjeta`): el Worker la deja,
  tras verificar la firma de Stripe, en `gastrogoan/pagos/{publicId}/{ref}` y la
  app pregunta por REST mientras tenga cobros a medias. ⚠️ El buzón de cada
  negocio NO acepta `pago_confirmado` a propósito: si lo aceptara, cualquier
  comensal se declararía pagado desde la consola.
- Al volver de pagar, el cliente cae en el seguimiento de su pedido o en
  «Gestionar mi reserva».
- ⚠️ Necesita las reglas de la plataforma con `pagos` y `coachConfig`.

Pruebas: `test/pagos-worker.mjs` y `test/pagos-app.mjs`.

## La Cuenta de Resultados es la del gestor (motor fiscal, 5/10)

Lo que cambia según la forma del negocio (Mi Negocio → forma jurídica y
régimen) vive en el **motor fiscal** de `js/finance.js`, y lo usan la
Cuenta de Resultados, Tesorería y el Panel. Estructura del Plan General
Contable: cifra de negocios → aprovisionamientos → personal → otros gastos
→ EBITDA → amortización → resultado de explotación → intereses → antes de
impuestos → impuesto → resultado del ejercicio.

- **El impuesto va por AÑO**, no mes a mes: tipo efectivo del año ×
  beneficio acumulado, menos pérdidas de años anteriores (sociedad sin
  límite, persona física 4 años). Un mes puede salir con impuesto negativo:
  es lo provisionado de más que se devuelve.
- **Autónomo y CB: escala del IRPF por tramos** (`irpfActividad`), con el
  mínimo personal y el 5% de difícil justificación (máx. 2.000 €). Su
  "sueldo" (`gfEsRetribucionTitular`) **no es gasto**: sale debajo del
  resultado. La cuota de autónomos sí es gasto. En una sociedad, la nómina
  del administrador sí es gasto.
- **Inversiones: gasto = amortización + intereses**, nunca la cuota del
  préstamo (que es caja y va en Tesorería). Coeficientes de la tabla del IS
  o de la de estimación directa (`AMORT_TIPOS`); ≤300 € va entero a gasto.
- **Módulos**: el IVA y el IRPF salen de `calcularModulos`, no de lo vendido.
- **Pagos a cuenta en Tesorería**: 130 (20% acumulado), 131 (módulos), 202
  (18% del último IS, abril/octubre/diciembre).
- **Nóminas**: contrato indefinido/temporal pone la SS de 2026 (`SS_2026`,
  revisar cada enero: el MEI sube hasta 2029) y 14 pagas devengan ×14/12.
- Retenciones de gastos fijos: alquiler → 115; profesionales → 111.
- Envío a domicilio al 10% (accesorio de la comida). Señales: el IVA se
  devenga al cobrarlas (`geAjustarSenalesIva`).

- **Enviar al gestor** (botón Exportar, desde el 5/10): paquete por periodo
  (mes, trimestre, año o fechas) → un ZIP con un Excel real
  (`construirXlsx`, js/core.js; una hoja por libro, cifras como números),
  los mismos libros en `csv/`, las fotos de las facturas del periodo en
  `facturas/` (cada línea de recibidas cita su archivo) y un `LEEME.txt`.
  Emitidas con columnas de libro registro: F2 (tickets en asiento resumen
  por día, serie y TIPO), F1 (factura completa con cliente), R5
  (rectificativa en su fecha). "Enviar" usa Web Share con el ZIP adjunto;
  si no se puede, descarga + mailto. Prueba: `test/paquete-gestor.mjs`.
- **Libros sueltos** (anteriores, siguen dentro del paquete): libro de ingresos
  (asiento resumen por día y tipo), libro de gastos (con nº de factura y NIF
  del proveedor, que se recuerda por proveedor), bienes de inversión,
  resumen del año (303/390, 111/190, 115/180, pagos a cuenta, 347) y
  registro de jornada del mes. ⚠️ La app NO es una gestoría: ordena los
  datos de forma objetiva; presentar lo hace el gestor.
- **Registro de jornada**: borrar un empleado ya NO borra sus fichajes (4
  años, art. 34.9 ET); un fichaje corregido guarda la hora original.
- **Web de reservas**: aviso de privacidad con responsable, NIF (si el dueño
  lo publica en Mi Negocio → `legalPublico`), base legal y AEPD.
- **Facturas (RD 1619/2012)**: TODO ticket es factura simplificada con
  número, en una serie POR APARATO (`serieDispositivo`, art. 6.2) para que
  dos tablets sin conexión nunca repitan: `T26K4P-000123` (ticket),
  `F…` (factura completa con nombre/NIF/domicilio del cliente, dice a qué
  ticket sustituye), `R…` (rectificativa al anular una venta cobrada). El
  NIF del negocio sale siempre en el ticket (obligatorio). VeriFactu lo
  hará una empresa externa en diciembre, encima de esta numeración.

- **Revisión de una gestoría (5/10)**, todo aplicado:
  - Anulación = rectificativa: la venta cuenta en su mes y la rectificativa
    resta en el suyo (`geAjustarAnulaciones`), nunca se reescribe un
    trimestre presentado.
  - Gasto fijo periódico: el GASTO se reparte, el IVA va entero al mes de la
    factura (`mesPago`, `gfPagaEnMes`). `fijosLog` guarda la foto de los
    gastos (`items`): libro de gastos y 347 usan la de ESE mes.
  - 347 con gastos fijos (proveedor + NIF) y clientes con factura completa.
    202: abril, octubre y diciembre.
  - Módulos: año que se mira; IVA de inversiones DESPUÉS de la cuota
    mínima.
  - Existencias (`DB.ge.existencias`, foto automática del stock o recuento
    a mano) → variación en la Cuenta de Resultados.
  - Plataformas: `isp` (factura desde la UE, inversión del sujeto pasivo) y
    `facturaReal` (no estimar la comisión).
  - Autónomo: simplificada/normal, reducción art. 32.2.3, deducción del 130.
    Sociedad sin tipo puesto → el legal; cooperativa 20%.
  - Obras según años de contrato, vehículo con IVA al 50%, tope 25.000 €.
  - Otros ingresos (subvención, máquinas, alquiler de espacio), autoconsumo
    del titular (merma «Consumo propio»), comidas del personal, vales regalo
    (univalente/polivalente) y renta atribuida de la CB (184).
  - Nómina con bases de cotización 2026 (Orden PJC/297/2026: máx. 5.101,20,
    mín. por grupo y jornada), solidaridad y contratos < 30 días (33,62 €).
    ⚠️ Revisar cada año con la Orden nueva.
  - Dividendos (sociedad): no son gasto; retención 19% → modelo 123.
  - Módulos: minoración por empleo POR TRAMOS (texto del BOE, fase 2.ª a),
    más 0,40 por incremento de plantilla.

- **Revisión de uso (5/10, noche)**: signo y color en TODOS los subtotales
  de la Cuenta de Resultados (un EBITDA negativo salía en positivo); sin
  gastos fijos en meses futuros ni antes del primer dato del negocio
  (`geMesConActividad`); aviso rojo si falta la forma jurídica y lista
  «Para que tus números salgan bien» (`renderChecklist`); botón «Mi sueldo
  (titular)»; mes de factura obligatorio en gastos no mensuales; calendario
  de pagos a Hacienda en Tesorería (`renderCalendarioFiscal`); «Inversiones»
  en vez de CAPEX.

Prueba: `test/auditoria-contable.mjs`, con las cuentas hechas a mano.

## Lo de la tanda del 7/10 (frente a la competencia: Alexia Rest y compañía)

- **Impresión sin Bluetooth**: modo Navegador/AirPrint (iframe con `@page`
  80/58 mm) por impresora y por aparato (localStorage); caída avisada si el
  Bluetooth falla. Tarjeta propia en Mi Negocio. Prueba `test/impresion.mjs`.
- **Leer factura con foto/PDF** (Gastos Variables, `lf.*`) y **factura dentro
  del pedido** (`pf.*`, `o.factura`): la IA del negocio lee, la app CUADRA
  (sumas, IVA, línea a línea contra el pedido) y nada se guarda sin revisión.
  Precios por `aplicarPrecioAlbaran` (historial y aviso). Lo recibido no se
  pisa: las diferencias se anotan. Pruebas `leer-facturas.mjs`, `factura-pedido.mjs`.
- **Carta por QR en la mesa** (`pedido_mesa`, `pago_mesa`, `mesaQr/{token}`):
  token por mesa rotable, precios de la carta propia, pago parcial no cierra.
  Desactivado por defecto. ⚠️ Necesita las reglas nuevas en la nube del
  negocio que lo active (y las de la plataforma). Prueba `qr-mesa.mjs`.
- **Visión global de mis negocios** (selector): lee los slots propios en solo
  lectura, sin cambiar el activo ni disparar guardados. `vision-global.mjs`.
- **Asistente de IA en Mi Negocio** (la clave sigue en localStorage, nunca en
  la nube), paso opcional en el alta y **«Pregúntale a tus números»**: la app
  calcula, el modelo solo explica. `preguntale.mjs`.
- ⚠️ Mi Negocio va en dos columnas: una tarjeta `mn-grid-full` o mal colocada
  deja huecos y tumba `revision-12-09.mjs`.

## Diseño (27/10): «Nórdico afinado» + «Comanda» — REVERTIDO el 28/10

⚠️ **El dueño pidió volver a la app original (la del 9/10).** El rediseño entero (iconos finos, menú lateral, movimiento, selector de idioma, `test/diseno-total.mjs`) vive en la rama `diseno-nordico-comanda`. Los cambios de diseño se harán a partir de ahora uno a uno, guiados por el dueño, y se publican cada 3-4. Lo de abajo describe lo que había en esa rama.


Elegidas entre cinco propuestas (https://claude.ai/artifact/N1GNS33J75CtqnTZ4WKBj1). Misma marca de siempre.
- **Nórdico afinado (toda la app)**: capa al final de `css/styles.css`, justo antes de las reglas de móvil:
  esquinas rectas, cifras y etiquetas en IBM Plex Mono (`--mono`), KPI en una sola franja (`:has(> .kpi)`),
  cabeceras de tabla en mono. Todo `font-family:monospace` suelto se sustituyó por `var(--mono)`.
- **Comanda (donde se sirve y lo impreso)**: en `#view-tpv` y `#view-comandascocina` las tarjetas son tique
  (borde dentado, separadores de puntos, títulos en mono mayúsculas); la cuenta de la web de reservas
  (`#cart-summary`) también. Impresos: tique/factura en IBM Plex Mono, informes (`printReportWindow`),
  vale regalo, QR de mesa y contrato con Schibsted Grotesk + mono; acento por defecto el oliva (antes un
  marrón que no era de la marca).
- **Segunda pasada, la radical (27/10 noche)** — la primera era tan sutil que no se veía. Ahora, también en
  `css/styles.css` (capa «SEGUNDA PASADA»): barra superior de TINTA con raya oliva; cada pantalla abre con
  título grande + subtítulo mono mayúsculas + raya gruesa de tinta; toda `.card`/tabla/KPI lleva raya de
  tinta arriba; botones con borde de tinta que se INVIERTEN al pasar; fichas del inicio y módulos que se
  invierten (tinta/crema); la venta del día del Panel es el titular (`.dash-hero`, mono 84 px); pestañas y
  títulos de ventana en mono mayúsculas. ⚠️ `innerText` respeta `text-transform`: una prueba que busque un
  título de ventana debe comparar en minúsculas (pasó con aviso-cancelar-pedido.mjs).
- **Iconos y selector de idioma (27/10)**: todos los iconos pasan por máscaras CSS de trazo fino (1,8; 1,1 en
  módulos/carpetas) generadas por `tools/generar-iconos-gg.py` → `css/iconos-gg.css` (build.sh lo mete tras el
  subconjunto de Tabler; un icono que no esté ahí sigue saliendo con la fuente). Los colores de JS/CSS/reservas se
  llevaron a la paleta de marca y los del personal salen de `EMPLOYEE_COLOR_CHOICES`. El idioma ya no son banderas:
  desplegable ES/CA/EN (`LANG_CODES`, `LANG_NAMES`; `toggleLangDd` en reservas). Paneles de admin con su capa compacta.
  Prueba permanente: `test/diseno-total.mjs`. ⚠️ `innerText` devuelve MAYÚSCULAS donde hay `text-transform`: comparar en minúsculas.
- Pendiente: la web comercial (`deploy/web/public`) y los PDF/Excel generados fuera de la app (libro de marca,
  documentos de venta), que ya usan la tipografía y la paleta de la marca.
- ⚠️ Un entorno nuevo necesita `pip install fonttools brotli` (el build recorta los iconos) y un enlace
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` al Chromium disponible para las pruebas.

## Rediseño pantalla a pantalla (29-30/10): cómo se hace y qué hay hecho

El dueño guía una pantalla cada vez. Hechas: **Comandas Cocina, Oferta Gastronómica, I+D, Proveedores, Mega Lista, Escandallo, Fichas Técnicas, Pedidos, Stock, Personal (con su Calendario), Distribución del Trabajo («Mi puesto»), Plan de Limpieza e I+D de Sala** — con eso, **la carpeta Cocina está entera con el diseño nuevo**.
La orden de fondo, dicha tras ver que se tocaba solo la pantalla principal: **cuando se rediseña una pantalla se
abre CADA botón, pestaña, modal y confirmación que cuelga de ella** (la prueba `test/subpantallas.mjs` lo exige).

- **Botones**: `btn btn-fino` (caja visible de 28 px, zona de toque de 40-44), `is-on` verde, `is-off` rojo, `is-lim` ámbar.
  Los hace solo `ggAfinarBotones` (js/ui.js) en cualquier vista listada en `GG_VISTAS_NUEVAS` y en los modales que
  llevan `ds-nuevo`: **al migrar una pantalla se añade su `view-…` a esa lista**. `openModal` pone `ds-nuevo` si la vista
  activa está en la lista o el HTML lleva `class="idr-modal"`. ⚠️ El botón fino pinta su caja con `::before`: una prueba
  de contraste debe leer el fondo de ahí (`contraste.mjs` ya lo hace).
- **Guarda de cambios sin guardar** (`ggRegistrarEditor`…): editores de carta y menú, y cualquier `navigate` los respeta.
- **NORMA DE MÓVIL: lo denso se pliega** (dicho por el dueño el 30/10). Una fila con nombre, precio, proveedor, IVA,
  alérgenos y botones es un muro de texto en 360 px: se ve **nombre y precio** y el resto cuelga de un toque.
  Marcado: la fila lleva `plegable` + `data-pl` único, lo escondido `pl-extra`, y un `pl-chev` (`ggTogglePlegable`,
  `ggSiPlegada`, `ggPlegableAbierta` en js/ui.js; el estado sobrevive a repintar). En PC todo sigue a la vista.
  Un estado que importa (agotado, raciones, falta el IVA) se ve aunque la fila esté plegada. **Hecho en**: Mega Lista y
  las filas de plato/opción de Oferta. **Descartado a propósito**: los tickets de Comandas (es lo que se opera y no
  debe costar un toque más), las tarjetas de Proveedores (ya son nombre + tres botones). Al rediseñar una pantalla
  nueva, plantearse esto antes de maquetarla. Prueba: `test/plegables.mjs`.
- **NORMA: editar y eliminar van dentro de un botón de tres puntos** (dicho por el dueño el 30/10). No se ponen dos
  botones sueltos en cada fila: `ggMenuAcciones([{icono, texto, fn, peligro, owner}])` (js/ui.js) pinta el «⋯» y
  `ggAbrirMenuAcciones` despliega UN menú flotante (fuera de la fila, para que ningún `overflow` lo recorte; se cierra con
  un toque fuera, Escape o scroll; flechas y Enter; 44 px por acción). `owner:true` esconde la acción a quien no puede
  editar, y si lo son todas desaparece el botón. Los demás botones de la fila (la `i` de la ficha, Disponible…) no se
  tocan. Hecho en Proveedores, Mega Lista, Oferta (cartas, menús, secciones, grupos, platos, opciones y sus extras), I+D
  (carpetas y trabajos) y las carpetas de Mega Lista/Stock/Escandallo/Fichas (`botonesDeCarpeta`). **Toda pantalla que se
  rediseñe lo lleva.** Prueba: `test/menu-acciones.mjs`.
- **Escandallo = una sola HOJA** (30/10): crear, ver y editar un plato es la MISMA pantalla (`esPintarHoja`, js/recipes.js).
  Antes un plato nuevo se montaba en un modal estrecho y el existente se veía en otra ficha: el dueño pidió la ancha
  como única. `openRecipeModal(id, forceBase)` conserva el nombre pero abre la hoja; los ids (`recipe-name`,
  `recipe-price-base`…) son los de siempre. Los números se recalculan al teclear (`esRecalcular`, solo toca textos, nunca
  repinta: el cursor no salta); un único «Guardar» (`saveRecipe()` devuelve true/false y se queda en la hoja, ya con id);
  sin guardar al salir → pregunta (`ggRegistrarEditor('escandallo')`). La lista son tarjetas (`es-plato`), no filas, y las
  carpetas reutilizan las de Mega Lista (`ml-carpeta`): **un nombre nunca se parte a media palabra** (`overflow-wrap:break-word`,
  columnas de mínimo 260 px). Ingredientes plegables en móvil. Prueba: `test/escandallo.mjs`.
- **Ficha técnica = un documento para cocinar** (30/10), en la misma pantalla donde se crea y se edita (como la hoja de
  Escandallo): `renderFichaModal` (conserva el nombre) pinta una página con foto y datos, **ingredientes a la izquierda
  (escalados por la «producción», que se guarda sola y no cuenta como cambio) y paso a paso a la derecha**. Cada paso lleva
  opcionalmente `min`, `temp` y `aviso` («ojo», el punto crítico) en `ficha.pasosDet`, **un array alineado con `pasos`**:
  `pasos` sigue siendo una lista de textos (I+D y lo antiguo la escriben así), así que quitar o mover un paso mueve los dos.
  Sin permiso de editar se ve como documento (sin campos). El impreso (`printFicha`) va a dos columnas con casillas para
  la mise en place y SIN iconos de fuente (la ventana de impresión no los carga). Prueba: `test/fichas.mjs`.
- **Selector de periodo común** (30/10): `ggPeriodoHtml({anio, mes, cb, datos, anual})` (js/ui.js) es un solo control
  «‹ octubre 2026 ▾ ›»: las flechas van de mes en mes y, al abrirlo, el año con sus doce meses y **cuántos registros hay
  en cada uno** (`datos` = {'AAAA-MM': n}), más «todo el año» (`mes` null) y «este mes». Quien lo usa guarda `anio` y `mes`
  y le pasa una función global `cb(anio, mes)` que repinta. Lo estrena el Historial de Pedidos; **es el que deben llevar
  Gestión Económica y el resto de pantallas con año y mes** (hoy aún usan las doce píldoras `month-pill`).
- **Pedidos** (30/10): «Realizar pedido» es una lista de la compra (`pc-art`: stock, precio y cantidad con − y +; filtros
  «bajo mínimo» y «con cantidad»; resumen en vivo con envío y avisos), ya NO hay modal (`openOrderModal` abre la pestaña).
  **«Sugerir por déficit»** (`sugerirPorDeficit`): falta = mínimo − stock − lo que ya viene de camino (pedidos ENVIADOS
  sin recibir, `pcEnCamino`), redondeado hacia arriba al envase (`packQty`), y avisa de cuántos sugiere, cuántos ya vienen
  y cuántos no tienen mínimo en Stock. Enviar por WhatsApp solo con móvil (`whatsappDeTelefono`), email con correo; sin
  datos de contacto el botón se desactiva y dice por qué; «Guardar borrador» e imprimir (hoja con casillas de recibido y
  SIN precios). Cada pedido es una hoja (`renderPedidoDetail`): estado en tres pasos, líneas con ✓/✗, precio de albarán y
  nota (plegables en móvil), control APPCC, albarán y factura. Prueba: `test/pedidos.mjs`.
- **Stock** (30/10): una fila = un producto (`stFilaHtml`, js/finance.js): nombre con su estado («Falta 3 L», «en camino», «sin mínimo»),
  cantidad con − / + y, plegados en móvil, el mínimo y el menú ⋯ (merma de ESE producto, su historial, Mega Lista / Escandallo, editar
  y borrar una elaboración manual). **El − / + no guarda en cada toque**: espera 0,7 s tras el último y guarda UNA vez (`stPend`),
  si no el Historial anotaba un ajuste por cada pulsación. Escribir la cantidad a mano guarda al momento (`stEscribir`) y anula lo
  pendiente. Arriba, un resumen de cuatro cifras (productos, elaboraciones, **bajo mínimo** —pulsarlo filtra— y valor del stock, solo
  propietario) y el número de alertas en cada pestaña. Las carpetas dicen cuántos están bajo mínimo y dentro lo que pide atención va
  primero. «Pedir lo que falta» solo sale con alertas y lleva a Pedidos. Mermas (informe) e Historial viven en el ⋯ de la cabecera,
  «Anotar merma» sigue a la vista. En PC y tablet (>760 px) las filas son tarjetas **de dos en dos**; en móvil, una. Cada casilla lleva su rótulo («ACTUAL · kg», «MÍNIMO · kg»)
  y **el mínimo va BLOQUEADO (gris, `readonly`) hasta pulsar el lápiz** (`stMinEditar`; Enter o salir lo guarda y vuelve a bloquear, Esc cancela);
  sin permiso de edición no hay lápiz sino un candado y el campo es `disabled`. ⚠️ El orden de los `<input>` de cada fila es mínimo, cantidad (lo usa `stock-empleados.mjs`); la
  posición visual la ponen `order` y las áreas de la rejilla. Un empleado sin edición cuenta existencias (− / +) pero no toca el mínimo. Prueba: `test/stock.mjs`.
- **Personal** (31/10, pestaña «Personal» de Horarios, `renderHorariosPersonal`): arriba un resumen de cuatro cifras (plantilla, trabajando ahora,
  esperan respuesta, clima) y «Requiere tu atención» con cada cambio de turno / vacaciones / jornada larga y sus botones (`teamPulseData`,
  `prResumenHtml`, `prAtencionHtml`; solo propietario). Cada empleado es una tarjeta (`pr-card`): avatar con iniciales y aro del color del
  empleado (el color va en el aro porque ni el blanco ni el negro se leen sobre los 30 colores), estado de fichaje y, al pie, iconos
  de acción. ⚠️ **Todo icono suelto lleva su rótulo** (`data-tip`, CSS global `[data-tip]` al pasar el ratón o enfocar con teclado; sirve
  también de `aria-label`; **sin `title` nativo**, que duplicaría el globo). En táctil no hay «pasar por encima»: ahí manda el `aria-label`. Editar ficha y
  eliminar van en el ⋯ (`ggMenuAcciones` con `estricto:true` = `.owner-strict`, no `.owner-only`: un jefe de cocina con edición no gestiona a
  un compañero). La ficha, el formulario (secciones, colores seleccionables, permisos como opciones) y el selector de horario siguen el diseño nuevo.
  Prueba: `test/personal.mjs` (⚠️ para probar `:hover` en headless hay que lanzar Chromium con `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`).
- **Distribución del Trabajo = «Mi puesto»** (31/10, js/app.js, sección «MI PUESTO»): el panel de cada empleado. Arriba **Hoy** (su turno, si está
  fichado, «3 de 7 hechas» con barra), la **tira de la semana** (siete días con su turno y lo hecho; pulsar uno cambia la lista de abajo) y el aviso
  de atrasadas. Abajo, la lista del día (casillas de 44 px; plantilla semanal, tarea puntual, limpieza y promos juntas, salen de `distTareasDelDia`,
  la MISMA función que cuenta el «1/3» de la tira y el resumen del equipo) y, al lado, **a su cargo** (platos → su ficha, con alérgenos; zonas en Sala),
  **manual del puesto**, próximos turnos, nota para el siguiente turno y accesos rápidos. El propietario ve primero el equipo (hoy hecho, atrasadas,
  manual sin leer) y entra en cada panel con los mandos de repartir.
  ⚠️ **Un empleado SOLO ve su panel**: `distPuedeVer(id)` es la puerta única (`openDistEmployee`, `openDistEmployeeAuthed`, `renderDistribucion`, y todas las
  escrituras pasan por `distDatosActuales()`, que devuelve null si no toca). Antes solo se filtraba la lista: un id guardado de otra sesión o un
  `openDistEmployee(otro)` enseñaba el trabajo ajeno. A un compañero no se entra ni con su PIN. Imprimir también se limita a lo suyo.
  **Manual del puesto** (`d.manual = {items:[{id,tipo,titulo,texto}], version}` y `d.manualLeido = {version, ts}`): lo escribe SOLO el propietario (obligaciones,
  responsabilidades, normas, consejos; plantilla por área); cada cambio sube la versión y el empleado vuelve a ver «por leer» hasta confirmar. Se
  imprime con casilla de firma. Firebase no guarda `[]`: `getDistEmpData` repone `manual.items`. Prueba: `test/mi-puesto.mjs`.
  **2.ª pasada (31/10, tras usarlo el dueño)**: «a su cargo» y «manual» son **botones** (`.dp-tile`), no listas que crecen: «a su cargo» abre UNA ventana
  (`openDistCargo`) con todos los platos y **elaboraciones** (`d.elabs`) como botones y, al elegir uno, **su receta se lee ahí mismo** (alérgenos, ingredientes a la
  producción de la ficha, paso a paso con minutos/temperatura/«ojo») sin ir a la ficha técnica y volver; el propietario asigna y quita desde esa ventana
  (`#dist-plato-sel` mezcla `plato:`/`elab:`). La columna derecha se quedó en botones + próximos turnos + nota para que no se alargue más que la lista del día;
  **Accesos rápidos se quitó a propósito**. **Cada tarea dice quién la puso** (`.dp-origen`: «Puesta por el jefe» en tinta, «Puesta por mí» en verde con la fila clara;
  el propietario ve «por ti» / «por Ana»). **Marcar es directo; DESMARCAR pregunta** (`dpConfirmarDesmarcar`, también en limpieza y promos). Las cuentas «hechas / total»
  van **en verde si está todo hecho y en rojo si queda algo de un día pasado** (`dpEstadoCuenta`).
- **Calendario de Horarios** (31/10, js/hr.js, `renderHorariosDia/Semana/Mes`): **Día** = resumen (trabajan, horas, descansan, sin turno), **línea de horas** con una barra por empleado (el
  partido, en dos tramos) y «personal por hora» para ver si el turno de comidas va corto; **Semana** = tabla con totales y «trabajan» por día en PC y **una tarjeta por empleado** en móvil;
  **Mes** = rejilla con el selector de periodo común (`ggPeriodoHtml`, cuenta los turnos de cada mes) y «días sin nadie». Sigue siendo VISTA: un turno nuevo se asigna desde la ficha del
  empleado, nunca desde una casilla vacía. Prueba: `test/calendario.mjs`.
- **Plan de Limpieza** (31/10, js/app.js): **arriba, siempre, el estado de hoy** (`limpiezaEstadoHoy`: apertura, cierre, tareas hechas, temperaturas fuera de rango, mantenimiento vencido; cada cifra
  lleva a su pestaña y se repinta sola con `lpRefrescarResumen`). Protocolos con pasos editables en su sitio (subir/bajar/quitar en el ⋯) y el cumplimiento de los últimos tres días
  (es lo que se conserva); tareas en día/semana/mes; **temperaturas con una tarjeta por equipo** (última lectura, fuera de rango, «sin lectura hoy»; pulsarla prepara el formulario);
  alérgenos con buscador y «platos SIN un alérgeno»; mantenimiento en tarjetas. Un empleado sin edición sigue pudiendo anotar temperaturas pero no borrar. Prueba: `test/limpieza.mjs`.
- **I+D de Sala** (31/10, js/idr.js): el asistente vive también en la carpeta Sala, con LO SUYO. `idrArea()` = la carpeta en la que estás, y todo se filtra y se marca con ella:
  **ADN propio** (`DB.idr.adnSala`, campos de barra: tipo de local, bebida insignia, coste de bebida objetivo…; el de Cocina sigue en `DB.idr.adn`), **reglamento propio**
  (`IDR_REGLAS_SALA`: equilibrio, técnicas, hielo y copa, sin alcohol, maridaje; y `IDR_PROPORCIONES_SALA`), ingredientes, carta de bebidas, elaboraciones, ventas de bebida,
  **creaciones y carpetas marcadas con `area`**. Tipos de Sala: cóctel o bebida (el flujo de plato, escrito para UNA copa), preparación de barra (el de elaboración base),
  **maridajes** (nuevo, `renderIdrMaridaje`) y carta de bebidas; sin menús. Cocina no cambia. El maridaje es lo único que LEE la otra área (la carta de la cocina, con sus
  ingredientes y alérgenos) y no escribe nada en ella; cada bebida se casa con lo que el local ya tiene y, si es un cóctel que falta, se puede crear desde ahí.
  ⚠️ Hay 14 sitios donde el módulo decía `'cocina'` a mano: se cambiaron por `idrArea()`; al añadir uno nuevo, no escribir el área en literal. Prueba: `test/idr-sala.mjs`.
- **Sala adaptada a Sala** (1/11, `test/sala-adaptada.mjs`): Sala nació como copia de Cocina y hablaba de platos, raciones, ingredientes y «food cost»
  donde una barra habla de bebidas, copas, productos y coste de bebida. Mecanismo: `tA(clave)` (js/i18n.js) devuelve `clave.sala` si existe y
  estás en Sala, y `aplicarPalabrasDeArea` (la llama `renderView`) hace lo mismo con los `data-i18n` fijos del HTML — **solo toca los que tienen
  variante** y los restaura al volver a Cocina. Para adaptar un texto: añadir `clave.sala` en los tres idiomas y, si se pinta desde JS, usar `tA`.
  Hecho: Mega Lista («productos»), Escandallo (aviso «1 copa o bebida», «Coste de bebida», «Preparaciones»), Fichas, Stock («Productos» /
  «Preparaciones», singular/plural), alérgenos («por bebida»), higiene de manos, equipos de temperatura sugeridos (cámara de cerveza, botellero,
  máquina de hielo…). **Mermas por área** (`mermaMotivos()`): Sala ofrece «rotura de botella o cristalería» e «invitación» y no «sobreproducción»;
  las claves son estables, el historial de las dos sigue legible. ⚠️ **Fuga corregida: `DB.ingredientCategories` es UNA lista para las dos áreas**
  (la siembra del catálogo la llena con nombres de ambas) y se veía entera en cada una; ahora `ingredientCategoriesPropias()` enseña solo las que
  usa algún producto del área (una que nadie usa aún se ve en las dos). Al añadir una pantalla compartida nueva, añadirla a la prueba.
  «Ingrediente» se queda en el escandallo: en un cóctel es la palabra correcta.
- **Promoción** (1/11, js/app.js sección PROMOCIÓN, `test/promocion.mjs`): seis pestañas pintadas desde `promoTabsHtml` (Día, Semana, Mes, **Novedades**, Clientes, Ideas),
  franja de cifras (`pmResumenHtml`), tarjeta común `.pm-card` con menú ⋯ (editar, duplicar al día siguiente, eliminar) y la ventana de la acción por secciones.
  Mes con `ggPeriodoHtml` (`promoMesCb`), Ideas con buscador. Fallos que salieron al revisarla entera y conviene no repetir:
  · **Desde Sala solo se podían rebajar BEBIDAS** (`getAllDishNames` filtraba por área y `getDishPlatoIdForName` solo miraba las cartas de bebida): un restaurante no podía
    rebajar una hamburguesa. Ahora `promoDishOptions()` ofrece platos Y bebidas (separados) y el enlace al id del plato busca en todas las cartas.
  · **WhatsApp abría `wa.me/612345678`** sin prefijo de país (no abre ningún chat): ahora `whatsappDeTelefono`, y un fijo no abre.
  · **Una promo semanal no podía terminar**: campo `hasta` (opcional) respetado por `promoOccursOn`, que también usan el TPV y el espejo público.
  Una acción con descuento tiene «Anunciar a clientes» (`promoAnunciar`), que la lleva a Novedades ya escrita.
- **Novedades** (1/11, **js/novedades.js**, pestaña de Promoción, solo propietario/edición, `test/novedades.mjs`): enviar novedades comerciales por email y WhatsApp.
  ⚠️ **Regla de la casa: no hay servidor de correo ni API de WhatsApp** (costaría por cliente): el mensaje sale del correo y del WhatsApp DEL NEGOCIO, y la app prepara todo.
  · **Audiencia** (`nvCalcular`): todos, habituales, nuevos, inactivos, en riesgo, cumpleaños del mes, mejores clientes (20 % por gasto del año), código postal, elegir uno a uno;
    siempre sin quien retiró el consentimiento, con exclusiones a mano y las cifras de email válido / móvil real (no fijos).
  · **Temas** (`NV_TEMAS`, 11, es/ca/en): rellenan asunto, titular, texto, oferta y botón. Lo que va entre `[corchetes]` hay que rellenarlo y **se avisa antes de copiar/enviar**.
  · **El email** (`nvEmailHtml`): tablas y estilos en línea, 600 px, botón a prueba de Outlook, texto de previsualización, pie con la **baja** (LSSI) y el responsable; todo escapado.
    Texto plano (`nvEmailTexto`) para mailto y `.eml` (`nvConstruirEml`: borrador con logo por `cid:`, copia oculta, abre en Outlook de escritorio/Apple Mail/Thunderbird).
  · **Enviar = una GUÍA paso a paso** (pedido por el dueño el 1/11): **Email** → abrir correo (Gmail/Outlook/mailto) · copiar asunto · copiar destinatarios (a **CCO**, por lotes de 25/50/100)
    · copiar el mensaje con diseño · fotos/vídeos/archivos (opcional) · enviar y marcar el lote. **WhatsApp** → crear **lista de difusión** en el móvil · tener a los clientes en la agenda
    (descarga `.vcf`, `nvConstruirVcf`) · añadirlos y copiar el nombre de la lista (lotes de hasta 256, el tope de WhatsApp) · copiar el mensaje (sin nombre) · adjuntos · enviar y marcar.
    Cada paso copia lo suyo y se marca «hecho» (`nvGuia`, solo de la pantalla). Alternativa «Uno a uno» (mailto de texto / `wa.me` con el nombre de cada cliente).
    ⚠️ La difusión solo llega a quien tiene el número del negocio guardado: la guía lo dice.
  · **Historial** (`DB.novedades`, sincroniza y lleva lápida; `enviados:{clienteId:{em,wa}}`), «Usar como base» y **«Registrar una baja»** (quien responde BAJA pierde el consentimiento).
  · Pendiente conocido: el email no lleva imagen subida desde la app (solo enlace https) porque Gmail bloquea las imágenes incrustadas; el logo sí va (en el `.eml` por `cid:`).
- **Clientes** (1/11, **js/clientes.js**, `test/clientes.mjs`): la lista son **tarjetas** (`.cl-grid`, 2-3 por fila, nadie mueve nada de lado) con filtros en fichas con su cuenta, orden y
  buscador que no pierde el foco. **Tocar una tarjeta abre la FICHA entera** (`openClientModal`, ventana ancha `xl`): a la izquierda lo que se edita (notas = campo grande que crece), a la derecha
  lo que ya se sabe (visitas, gasto, puntos, reservas próximas, vales). **El historial es una PANTALLA propia** dentro de Clientes (`clientesPantalla` = lista · historial · vales, con su «Volver»,
  `clIr`/`clVolver`), no una ventana encima de otra; `openClientHistoryModal` sigue existiendo y lleva allí. `renderClientes()` es el punto de entrada y reparte según la pantalla.
  · **Vales regalo** (mismas funciones públicas de antes + `valeEstado`, `valeSaldo`…): **caducidad** (1 año por defecto, o sin ella), estados **pendiente · canje parcial · canjeado · caducado · anulado**
    (calculados, no guardados salvo `redeemed`/`anulado`), **canje parcial** con su historial (`canjes:[{fecha,importe,nota}]`; los antiguos con solo `redeemed` se leen igual: `valeCanjes`),
    «Emitir» (ventana) y «Historial de vales» (pantalla con cifras, filtros y buscador). **Pasan por la contabilidad**: cada vale crea su asiento en `DB.ge.vales` (`valeId`; importe → **polivalente**,
    experiencia con precio e IVA → **univalente**, que ya entra en el libro y en el IVA del mes), el canje lo actualiza (`canjeParcial`, `canjeFecha`) y `geValeVivo()` deja fuera lo caducado de «dinero por
    adelantado». **No se borra un vale emitido: se ANULA** (solo sin canjes y con el mes abierto; quita su asiento); borrar solo vale para un anulado. Los vales de antes (sin asiento) se anotan con un
    botón (`valesRegistrarAntiguos`); los de experiencia antiguos no tenían importe y se dejan fuera a propósito. Fusionar clientes mueve sus vales; el olvido RGPD borra su nombre de los vales.
    ⚠️ **El TPV todavía no acepta un vale como forma de pago**: se canjea a mano desde esta pantalla. Pendiente si el dueño lo quiere.
- **Reservas** (1/11, **js/reservas.js**, `test/reservas.mjs`): cifras del día (reservas, comensales, han llegado, por confirmar), cada reserva con su **acción principal a la vista** (Confirmar / Ha llegado /
  Deshacer no-show) y el resto en el ⋯; filtros con su cuenta; turnos con barra de aforo; **Semana y Mes con el diseño de Promoción** (`pm-sem`, `pm-mes`, `ggPeriodoHtml` → `reservasMesCb`);
  «Imprimir el día» (hoja de sala con casilla de llegada); solicitudes de la web y recordatorios de mañana en **filas compactas** (antes empujaban la lista del día). Las reglas no cambian:
  confirmar exige mesa asignada (si no, abre la reserva), aforo por turno, lista de espera, señal.
- **TPV rehecho desde cero** (1/11, **js/tpv-sala.js**, `test/tpv.mjs`): pensado para un servicio con volumen y móvil/tablet primero.
  · **Franja corta arriba** (`tpvBarraHtml`): 4 cifras (en móvil solo «Ventas hoy» y «En cocina»; las otras dos viven en la ventana de ventas) + botones **Cartas** (un chip que cuenta las activas y abre `openCartasActivasModal`; las dos cajas de «cartas y menús activos» ya no existen) · Lista de espera · Cerrar caja (`#tpv-close-cash-btn`) · Anulaciones · Marcar agotado · Historial de arqueos (· Cajón si hay), **los seis en una rejilla de tres columnas** (`.tp-botonera`; el dueño rechazó el «⋯» y los botones desiguales). En móvil las etiquetas se acortan (`.tp-largo`/`.tp-corto`). Objetivo medido: la primera mesa se ve sin bajar en PC y a menos de 580 px en 360.
  · **Mesas = fichas** (`renderMesaCard`, `.tp-mesa.is-libre|tomando|cocina|servida|ocupada`): barra de color a la izquierda, tiempo (aviso a los 60 min, urgente a los 120), total en mono, personas, camarero y avisos (QR, incidencia, nuevo, mesa fría, pagado online). **Filtros con su cuenta** (Todas · Libres · Ocupadas · Servidas · Mis mesas), zonas (un toque en la zona activa la desmarca), buscador «Ir a mesa…» y modo caos (una lista por antigüedad). `tpvEstadoMesa` es la única que decide el estado. Los ids `#tpv-mesas-section` y `#tpv-togo-section` y el objetivo del tour `.tp-mesa` no se tocan.
  · **Tomar nota** (`renderTableOrderModal`): cabecera con «Cambiar de mesa» **primero y visible** (decisión del 9/09, lo fija `sala-cabecera-mesa.mjs`) y el nombre como `<h3>` hijo directo. Carta a un lado y **comanda siempre a la vista** al otro (en móvil, una a la vez a pantalla completa con una barra «Comanda · total» en el pie). Fichas de carpeta y de plato **con cuántos lleva ya la mesa (×N) y su «−»**; buscador de platos; comanda con − / cantidad / + por línea, estado, nota **destacada** y precio. **Notas rápidas** (`TPV_NOTAS_RAPIDAS`, 10 frases en es/ca/en) en la ventana de notas de línea: un toque las añade o quita.
  · ⚠️ **Un `style="background…;color:#fff"` en un botón del TPV lo deja ILEGIBLE**: `ggAfinarBotones` añade `btn-fino` (la caja se pinta en `::before`) y el texto blanco cae sobre blanco. Usar `btn-primary` (→ olive), `is-lim` o `is-off`. Y la regla de móvil de toda la app fija **todo `.btn` a 36,5 px con `!important`**: los botones de servicio (Marchar, Cobrar, Aceptar/Rechazar…) la vencen con otro `!important` en el bloque de móvil del TPV.
  · **Para llevar y delivery** (`renderTpvToGo`, `.tp-ped`): una ficha por pedido (tipo, hora, cliente, dirección, total, pago, repartidor); pendientes de la web con Aceptar/Rechazar de 52 px.
  · **NORMA DE AIRE (dicha por el dueño el 1/11)**: todo bloque tiene espacio **por sus cuatro lados**. `.modal-body` lleva `padding:4px 6px 18px` con margen negativo (el contenido no pega con el pie ni se recortan los bordes y aros de foco), el pie se separa con un filete y un velo al fondo del cuerpo indica que hay más (`mask-image`). La comanda a pantalla completa pone ese aire en cada columna con scroll (`.tp-or-col`). Lo vigila `tpv.mjs` (6 anchos × 6 ventanas).
  · Pendiente conocido: el vale regalo no se acepta como forma de pago en el cobro.
- **Gestión Económica, 1.ª tanda** (6/11, js/hr.js, `test/economia-ventas.mjs`): `view-economia` en `GG_VISTAS_NUEVAS`; pestañas en mono que envuelven; tarjetas `.ge-section`. **Ventas** = periodo con `ggPeriodoHtml` (`setVentasPeriodo`), filtro de canal (Todos · Mesa · Take away · Delivery) que **manda sobre todo lo de la pantalla** (cifras, curva, tabla del día, propinas): dentro de un canal solo se ve ese canal; el global es «Todos». Desglose por tipo con barra apilada, leyenda que filtra y fila **Total**. **Los vales regalo ya no salen en Ventas** (se emiten y canjean desde Clientes; su asiento sigue en `DB.ge.vales`; el TPV aún no los acepta como pago). Variables y Tesorería usan también el selector común (`gePeriodoVariables`, `gePeriodoTes`). El aviso «gastos no mensuales sin mes de factura» lleva ya a la ficha del primero (`GE.irPrimeroSinMesPago`). **Gastos Fijos** (6/11, `test/economia-fijos.mjs`): cada gasto es una fila `.gf-fila` con chips (periodicidad, IVA, nómina automática, titular, avisos «Falta el IVA» / «Sin mes de factura»), importe mensual y menú ⋯ (editar, **duplicar**, eliminar); el detalle (proveedor, base + IVA, próximo pago, notas) es `pl-extra` y se pliega en móvil. Arriba, «A dónde va cada euro» (barra apilada) y «Próximos pagos que no son mensuales» (`gfRenderResumen`); la ficha va por secciones (`.gf-mh`). **Gastos Variables** (6/11, `test/economia-variables.mjs`): cada compra es una fila `gvFila` (mismas clases `.gf-fila`/`.gf-chip` que Fijos) con chips (fecha, IVA, factura, «Pedidos recibidos» + «Bloqueado») y menú ⋯ (**ver factura**, **anular**; el motivo y el PIN de siempre); encabezado por categoría con su subtotal; arriba, reparto por categoría (barra apilada) y «Dónde más compras» (`gvRenderResumen`), existencias en una nota, gasto hormiga en ámbar, facturas sin asignar en miniaturas con ⋯. Los anulados se tachan, siguen en los libros y **también obedecen al buscador**. ⚠️ Tres tests miran el HTML de `#gv-list` (candado `ti-lock`, `anularGV(id)`/`anularGVGroup` y `line-through`): no quitarlos al retocar las filas. **Tesorería** (6/11, `test/economia-tesoreria.mjs`): el reparto objetivo (Personal / Fijos / Variables / Otros / Beneficio) va SIEMPRE en **enteros que suman 100** (`distEnteros`, método del mayor resto; `distFijar` para cambiar uno y repartir el resto; `distPctActual` lee un reparto antiguo con decimales ya redondo; el objetivo de food cost es el mismo número y también entero). El % se edita **en la propia fila** (`#te-pct-…`, `onchange`, nunca `oninput`), hay plantillas orientativas del sector (`DIST_PLANTILLAS`) y avisos si personal + variables (coste primo) pasa del 65 % o el beneficio objetivo baja del 5 %. **Objetivo cumplido = cantidad en verde con tick; fuera = rojo con cruz** (`teEstado`; gasto: pasarse es cruz; beneficio: quedarse corto es cruz). Reservas agrupadas en «Dinero que no es tuyo»: IVA del trimestre, IRPF de nóminas (111), alquileres (115), dividendos (123), pago a cuenta (130/131/202) y, solo informativo, el impuesto sobre beneficios acumulado del año; el total «Para Hacienda» NO incluye ese último. ⚠️ Un `.val` de un KPI se reescribe al animar las cifras (`polish.js`) y se lleva cualquier icono dentro: el coste primo usa `.te-valor`. Los tests de Tesorería buscan `#te-rows .te-row` y el `span:last-child` de cada fila: no meter `<span>` dentro de las celdas ni nada detrás de la celda «Real».
  **Conciliación bancaria** (`js/operations.js`): lo esperado = tarjeta de los cierres de caja del rango + lo cobrado y aún sin cerrar (`cardBreakdownInRange`, sin contar dos veces las ventas viejas sin `cierreId`); casilla de comisiones descontadas; ✓ si la diferencia es ≤ 1 € (`BANK_REC_TOLERANCIA`), ✗ si no, con la causa probable (solo habla de comisión si la diferencia es ≤ 5 %); cambiar las fechas NO repinta la ventana (antes borraba lo escrito); propone empezar donde acabó la anterior y terminar AYER; avisa si las fechas se pisan con otra. El historial no se borra. Junto al botón sale «Conciliado hasta…» o «Sin conciliar todavía». Es manual (no hay integración bancaria: costaría por cliente).
  **Punto de equilibrio** (6/11, `test/economia-equilibrio.mjs`): todas las cuentas salen de UNA función pura, `peCalcular` (la usan el resultado, el gráfico, las palancas «¿y si…?» y la lista de escenarios, así no se contradicen). Costes fijos = personal + gastos fijos + cuotas de préstamos e inversiones (caja); otros costes variables (comisión del datáfono, plataformas) se suman al food cost; margen de seguridad, resultado estimado y cubiertos para el beneficio objetivo de Tesorería (`distPctActual().ben`). El food cost es EL MISMO número que el reparto de Tesorería y se sincroniza al terminar de editar (`peFoodCostCambia`, `onchange`), no a cada tecla. «Usar datos del último mes» cuenta **cubiertos** (suma de `pax`; sin pax, una venta = un cubierto) y los días con ventas. Los escenarios se comparan en una lista con ⋯ para eliminar. ⚠️ `peUseRealData` lo vigila `email-reservas.mjs` (ticket SIN IVA).
  **Inversiones** (6/11, `test/economia-inversiones.mjs`): cada inversión es una tarjeta `.gf-fila.cx-fila` (chips de tipo, estado de pago y financiación; total con IVA; menú ⋯ editar/duplicar/eliminar) con su detalle plegable (`.cx-det`: fecha, base, IVA, amortización y % anual, **valor hoy** = base amortizable − amortizado, cuota, última cuota, deuda e intereses) y barra de cuotas pagadas. Arriba cinco cifras de la cartera entera (invertido, valor hoy, deuda, cuotas de cada mes y hasta cuándo, amortización del mes) y filtros con su cuenta (todas / financiadas / por pagar / pagadas). El aviso de «cuotas acabadas y sin marcar pagado» sigue. La ficha va por secciones.
  **Cuenta de Resultados** (6/11, `test/economia-resultados.mjs`): barra de periodo + chips; **gráfica = curva** (`renderCdrGrafica`, pestañas neto / antes de impuestos / ventas) con el resultado del mes en el titular y en un globo al pasar el ratón (`dashSerieHtml(..., {tooltip:true})`, atributo `data-v`); solo dibuja los meses ya llegados. Las notas largas viven detrás de **«¿Cómo se calcula?»** (`cdrComoSeCalcula`, con la explicación de la forma jurídica de ESE negocio) y del `?` de cada fila (`cdrAyuda`: intereses —con el HORNO del propio negocio partido en intereses y devolución—, EBITDA, antes de impuestos, IVA 303, retenciones 111/115). A la vista solo quedan los avisos que piden una acción (sugerencia de tipo de sociedad, comuneros que faltan, forma jurídica sin fijar).
  **Auditoría fiscal** (`docs/CONTINUIDAD-ECONOMICO.md`, `test/fiscal-independiente.mjs`): ⚠️ `irpfActividad`: las reducciones de **6.498 €** y de **1.620 €** son ALTERNATIVAS (AEAT, Manual de Renta 2025), no se suman; la de 1.620 € se mira con las rentas TOTALES (actividad + otras) < 12.000 €. El IS de una sociedad sin tipo puesto a mano es la cuota EXACTA por tramos del año calculado (`impuestoSociedades`), no un % «sugerido» con los números de hoy. `TIPOS_IS` tiene 2025-2029 verificados con la AEAT (micro 21/22 · 19/21 · 17/20 desde 2027; reducida 24-23-22-21-20); ⚠️ los de COOPERATIVA siguen sin verificar. Las cifras de esa prueba están hechas A MANO: si falla, no se «arregla» copiando lo que sale.
  **Forma jurídica y régimen FIJADOS** (`test/fiscal-fijado.mjs`): los pone quien da el alta en `generador-licencias.html` (nueva licencia o botón «⚖ Fiscal» de cada licencia) → `issuedCodes/{código}` → `lic.fiscal` al canjear. `aplicarFiscalDeLicencia()` (js/finance.js, la llama `fiscalPerfil()` y `renderMiNegocio`) los vuelca a `DB.business` y pone `fiscalFijado`; en Mi Negocio salen BLOQUEADOS con «Comprobar cambios» (`refrescarFiscalDeLicencia`). Un negocio antiguo sin nada fijado los sigue editando.
  **Motor fiscal** (`js/motor-fiscal.js`, `test/fiscal-motor.mjs`): UNA fuente para las reglas con su fuente, referencia, vigencia, territorio y estado (`FISCAL_REGLAS`: verificada / revisada / pendiente — si no se puede verificar NO se presenta como certeza), las escalas del IRPF por territorio (Cataluña = estatal + autonómica 2025 verificada con la AEAT; el resto, escala general de referencia con aviso), `fiscalTrazaAnual` (el impuesto paso a paso + fiabilidad alta/media/baja con sus motivos), `fiscalPrevision` (303, 111, 115, 123, 130/131/202 y el impuesto del ejercicio con estado estimado/devengado/plazo pasado/presentado/pagado; lo marca el usuario en `DB.ge.obligaciones` con el importe REAL para comparar con lo previsto) y `fiscalSimular` (simulación, nunca mezclada con la previsión). `irpfActividadDetalle` es la única implementación del IRPF del autónomo. ⚠️ Un fichero JS nuevo = cuatro sitios (build.sh, index.html, estatico.mjs, apple.mjs): ya hecho para este.
  **Deducibilidad** (`deducPct`, `deducRevisar`, `geAjusteFiscalMes`): cada gasto fijo/variable lleva «¿Es deducible?» (sí / parcial con % / no / pendiente). El resultado CONTABLE cuenta todo; la base fiscal suma la parte no deducible; su IVA no se deduce. La app no decide qué es deducible.
  **Beneficio y caja** (pestaña `bc`, `renderBC`, `test/beneficio-caja.mjs`): puente del resultado neto a la caja estimada con las cifras ya auditadas; «dinero disponible de verdad» con el saldo que escribe el usuario; liquidez a 30/60/90 días con lo CONFIRMADO aparte de lo ESTIMADO. Es una estimación: no ve el banco.
  **Comunidades autónomas** (6/11, `IRPF_ESCALAS_AUTONOMICAS` en js/motor-fiscal.js): las 15 de régimen común están cargadas con la escala 2025 de la AEAT (Manual de Renta 2025, «Gravamen autonómico»), más Ceuta y Melilla (escala supletoria del art. 65). Cada fila es `[desde, tipo]` y la regla `IRPF-ESC-<ID>` se genera de la misma tabla. ⚠️ El texto de la página de la AEAT no dice si la base de cada fila es el principio o el final del tramo: se comprobó con la columna «cuota íntegra» (Asturias: 12.450 × 9 % = 1.120,50). La prueba de `fiscal-motor.mjs` repite esas cuotas. **Navarra y País Vasco (foral)** van con su escala (`IRPF_ESCALAS_FORALES`, País Vasco = la de Gipuzkoa) pero copiada de webs de terceros: no se pudo abrir ninguna fuente oficial, así que las reglas están «pendiente de verificar» y la fiabilidad es MEDIA (a petición del dueño, ninguna comunidad sale en baja). En foral el mínimo, las reducciones y las deducciones son las forales y aquí se usan las estatales como aproximación. **Contrastar con Hacienda Foral antes de decir «verificada».** Límites declarados: se usa el mínimo personal ESTATAL (varias comunidades fijan otro) y en Ceuta/Melilla no se aplica la deducción del art. 68.4. Las claves del territorio viven en TRES sitios: `FISCAL_TERRITORIOS` (motor), `TERRITORIOS_FISCALES` (generador-licencias.html) y el select de Mi Negocio (usa `fiscalTerritoriosLista()`).
  **Módulos** rediseñado (6/11): tarjetas con cabecera, campos agrupados (`.gf-mh`), y el comparativo dice cuál sale mejor. Manual y tour de Gestión Económica al día (Beneficio y caja, previsión, simulador, deducibilidad, comunidad fijada).
  **Cooperativas** (6/11): tipos verificados con la tabla de la AEAT (Manual de Sociedades 2025) para 2025-2028 y la bonificación del 50 % (Ley 20/1990 art. 34.2). ⚠️ La app llevaba 16/18 % en 2025 y era un error: son 18/19 % (microempresa), 20 % (reducida dimensión), 12 % (nueva creación). 2029 se deriva de la regla «tipo general − 3 puntos, máx. 20 %». Límite declarado: se supone fiscalmente protegida y NO se separan los resultados extracooperativos (al tipo del art. 29.1); fiabilidad MEDIA con ese aviso.
  **La forma jurídica es obligatoria** (decisión del dueño, 6/11): el generador ya no deja «sin fijar» ni al emitir una licencia ni en «⚖ Fiscal». «Sin forma → fiabilidad baja» solo queda como red de seguridad para negocios antiguos aún sin fijar.
  **Pendiente**: 5 % de difícil justificación dentro del 130, mínimos personales autonómicos, prorrata de IVA, recargo de equivalencia, IVA simplificado, criterio de caja, ejercicios anteriores a 2025.
- **Plan 360, Visión global y «Herramientas»/«Legal»** (6/11): ⚠️ **«Herramientas» y «Legal» NO son pantallas, son capítulos del manual** (`herramientas`, `legal` en js/manual.js); no hay `view-herramientas` ni `view-legal`. Las funciones de «Herramientas» viven en otros sitios: Visión global (botón del selector de negocios, `openVisionGlobal`/`renderVisionGlobal` en js/core.js), «Pregúntale a tus números» (`abrirPreguntaNumeros`, js/idr.js) y el Asistente de IA (Mi Negocio). Con eso, **el diseño nuevo está en TODAS las pantallas de la app**. Plan 360 ya llevaba el estilo; se añadió `view-plan360` a `GG_VISTAS_NUEVAS` y los estados de tarea del día son ámbar (pendiente) / verde (hecha) / rojo (no hecha). Visión global ya no tiene estilos sueltos: clases `.vg-*` (conservan los ids que lee `test/vision-global.mjs`: `vg-total`, `vg-total-netas`, `.vg-negocio`, `.vg-netas`, `.vg-sin-datos`). El capítulo Legal se contrastó con la app: los doce rótulos que cita existen.
- **Web pública 2.0** (6/11, `reservagastrogoan.html`, `test/web-publica-pasos.mjs`, semilla compartida `test/_semilla-publica.mjs`): reservas y pedidos **por pasos** (`wzState`, `wzIr`, `wzValidar`; reservar = Cuándo → Tus datos → Confirmar; pedir = Elige → Tus datos → Confirmar). ⚠️ **Los campos, sus ids y `submitReserva()`/`submitOrder()` son los de siempre**: los pasos solo muestran u ocultan secciones, así que ninguna regla de negocio cambió. Si un envío falla por un campo de un paso anterior, `markFieldInvalid()` → `wzMostrarCampo()` devuelve al cliente a ese paso. `wzValidarDatosPedido` repite (sin reservar franja) las comprobaciones de `submitOrder` para avisar antes: obligatorios, email, horario, cierre de cocina, antelación y código postal fuera de zona (con radio configurado la geocodificación sigue siendo del envío).
  · **Cabecera que se adapta al logo** (`ggTonoLogo`): estaba SIEMPRE negra y un logo negro —y hasta el nombre, `--brand2` = tinta sobre tinta— desaparecían. Se mide el logo en un canvas: oscuro → franja clara; claro → franja de tinta (`hd-oscuro`); si el navegador no deja medirlo (imagen de otro dominio) → tinta con placa blanca (`hd-placa`). El idioma va en la esquina para que la cabecera sea compacta. La cabecera enseña dirección, horario, teléfono (enlace `tel:`) y email (enlace `mailto:`); la barra Reservar · Take Away · Delivery va centrada.
  · **Menús y Carta son dos vistas** (`menuModoActual`, `menuSetModo`, selector `.seg`): Menús = una tarjeta por menú; al tocarla se abre en una hoja (`abrirHoja`, `.is-sheet`) con todos sus apartados numerados, el suplemento y el total en el botón. Carta = carpetas con el nº de platos y lo que ya llevas, buscador que cruza toda la carta (`menuBuscar`, actualiza solo `#menu-results` para no perder el foco) y cabecera fija para volver. Cada plato lleva «Añadir» → − n + (`dishCtlHtml`, `dishCtlRefreshAll` se llama desde `renderCartSummary`: **toda mutación del carrito pasa por ahí**).
  · **El botón «Continuar» del pedido** dice lo que falta (vacío, mínimo) y lleva el total (`wzNavActualizar`); en PC y tablet va una sola columna centrada (≥768 px, 640 px): un resumen lateral «Tu pedido»/«Revisa y confirma» se probó y se QUITÓ a petición del dueño, porque el resumen ya está al final de la hoja y repetirlo no aportaba. **Horas con un toque** (`updateOrderSlots`): los huecos reales del día (horario + antelación + cierre de cocina), «Cuanto antes» primero.
  · ⚠️ **El aviso del email mentía**: decía «Te mandaremos aquí la confirmación y el enlace…» pero la app NO envía correos al cliente (EmailJS se quitó el 7/09; lo que hay es el seguimiento en vivo y «Accede a tu reserva»). Ahora dice para qué sirve de verdad (encontrar la reserva y que el restaurante pueda escribir). `test/web-publica-pasos.mjs` lo vigila. Regla de la casa: **no prometer en la web pública nada que la app no haga.**
  · **Efectos** (6/11, bloque «EFECTOS» del CSS): todo lo que se mueve va dentro de `@media (prefers-reduced-motion:no-preference)` (lo vigila la prueba). Transición entre pasos con dirección (`wzState.dir` → `data-dir="fw|bk"`, entra por el lado al que se va) y contenido en cascada; progreso que se rellena con ✓; etiqueta «Paso N de 3»; el control del plato «salta» al añadir, la línea se resalta y el botón «Continuar» late. ⚠️ **El deslizamiento lateral hacía asomar scroll horizontal en 320 px mientras duraba**: se recorta con `.wrap{overflow-x:clip}`; no quitarlo. No animar `.cl-l` ni `#menu-results>.dish`: se repintan en cada pulsación/tecla y parpadearían.
  · **Entrada y pedido (6/11, 2.ª tanda)**: ⚠️ **ya NO hay pestañas.** Con varios servicios el cliente ELIGE al entrar (`renderServicios`: una tarjeta por servicio); con uno solo entra directo; el QR de mesa entra directo en «Pedir en mesa». Dentro, `serviceBarHtml` (chip del servicio + «Cambiar» → `volverAServicios`, que avisa si ya llevaba algo). **Cada plato es UNA tarjeta que es el botón** (`.dc`, 2 por fila en móvil y 3 desde 600 px; `dishTap`): tocar añade, la cantidad va en la esquina y el «−» solo aparece con cantidad; `dishCtlRefreshAll` actualiza las tarjetas EN SU SITIO (no recrea el botón: se conserva el foco). La **bandeja «Tu selección»** (`#wz-tray`, `trayActualizar`, se pinta desde `wzNavActualizar` → toda mutación del carrito la actualiza) va pegada abajo en el paso «Elige» y se despliega con − n + para ajustar sin salir de la carta. Carpetas de la carta pequeñas (3 por fila). **Descripción del plato**: se escribe en la **Ficha técnica** («Descripción en carta», `ficha.descripcionCarta`, 140 letras) y la ven el cliente (tarjeta del plato) y el camarero (ⓘ del TPV, `renderDishInfoModalHtml`); `platoDescripcion(p)` (js/menu.js) manda la ficha y, en un plato manual sin receta, el propio `p.descripcion` (botón «Descripción» de Oferta, solo en esos); `cartasParaElEspejo()` publica la carta con la descripción ya resuelta SIN tocar `DB.cartas`. Prueba: `test/descripcion-plato.mjs`.
  · **Subpantallas** revisadas (error, saturación, elegir local, encuesta NPS, «Accede a tu reserva», seguimiento del pedido, gestión/edición/cancelación de la reserva, pago, pedido en mesa, privacidad). ⚠️ **Esta web NO carga la fuente de iconos de la app**: un `<i class="ti ti-…">` sale como una caja vacía (la pantalla de saturación llevaba uno, y un emoji); la prueba exige cero `class="ti ti-`. `--amber` no existe en esta página: el icono de aviso es `var(--red)`.
  · Los textos nuevos son `I18N_WZ` (claves `wz.*`, es/ca/en); la prueba exige que existan en los tres. `renderTabContentPreservingForm` ya se usa también al cambiar de idioma (antes se vaciaba lo escrito). Un cliente que en `setTipCustom` escribía la propina «Otra» solo podía poner UNA cifra (el resumen se repintaba y perdía el foco): arreglado.
- **Manual de uso + tour guiado rehechos** (2/11, **js/manual.js**, `test/manual.mjs`): `MANUAL_CHAPTERS` (25 capítulos, `{id, area, title, content}` en es/ca/en, con HTML) vive ahora en su fichero, ya no en app.js. Áreas del índice: Empezar · Cocina · Sala · Gestión · Ayuda (`MANUAL_AREAS`). Diseño: índice agrupado por áreas (en móvil, un botón con el capítulo actual que despliega la lista), capítulo en columna de 780 px con «En este capítulo» (saltos a cada `<h4>`), buscador que filtra capítulos y **marca lo encontrado** (`mark.mnl-hl`), anterior/siguiente e imprimir. Clases `.mnl-*`; las de contenido (`.manual-step`, `.manual-tip`, `.manual-warning`, tablas) siguen siendo las de siempre. `openManualAt(id)` abre un capítulo concreto. ⚠️ **Al cambiar una pantalla hay que cambiar su capítulo en LOS TRES idiomas**, con los nombres de botones tal cual los ve el usuario (la prueba exige los mismos `<h4>` en los tres). Los capítulos los escribieron agentes contra el código; **conviene que el dueño los lea** (hay un puñado de textos de la app que no cuadran con ellos, ver la lista que dejó la sesión del 2/11).
  · **Tour** (`TOUR_STEPS`, js/ui.js): 48 pasos con textos nuevos en los tres idiomas (`tour.sN.*` en i18n.js). `target` puede ser **una lista de selectores** (el primero que exista y se vea); sin objetivo se resalta el primer bloque de contenido de la pantalla, no la pantalla entera. Teclado: ← → y Escape. El Centro de ayuda (`HELP_FAQS`, js/ui.js) **sigue con textos viejos** (habla de «Carta», de añadir notas con extras…): pendiente de repasar.
- **Panel de Control** (2/11, js/finance.js `renderDashboard`, `test/panel.mjs`): tarjetas con el diseño nuevo (`view-dashboard` en `GG_VISTAS_NUEVAS`). **Los gráficos de barras ya no existen**: `dashSerieHtml(serie, opts)` pinta cualquier serie como curva con área (SVG que se estira + puntos, etiquetas y meses en HTML encima, así el texto no se deforma ni hace scroll lateral; cada punto es un botón de 44 px que pone su cifra en el titular, `dashSerieVer`). Ventas, gastos y resultado del año son UNA tarjeta con pestañas (`dashTrendPintar`, el mes en curso va marcado como parcial); las ventas por hora usan la misma función con «Hora punta».
- ⚠️ **WhatsApp siempre por `whatsappDeTelefono`**: `wa.me/612345678` (sin prefijo de país) no abre ningún chat y estaba en media docena de sitios (recordatorios y avisos de reserva, premio de
  fidelidad, aviso de pedido del TPV, Promoción, lista de Clientes). Un fijo avisa y no abre nada. Al escribir un `wa.me` nuevo, usar el helper.
- ⚠️ **Un fichero JS nuevo se da de alta en CUATRO sitios**: `build.sh`, las etiquetas `<script>` de `index.html` (las usan las pruebas que cargan el HTML de desarrollo, p. ej. `apple.mjs`),
  y la lista de `test/estatico.mjs` y de `test/apple.mjs`. Olvidar `index.html` no rompe `dist/` pero sí esas pruebas.
- **Cambios de precio** (30/10, `openSubidasPrecioModal` / `abrirCambiosPrecio('suben'|'bajan')`): el precio de un producto
  cambia por tres vías —Mega Lista, «precio albarán» al recibir, o factura leída por la IA— y cada cambio queda en
  `DB.preciosHistorial`. La ventana tiene dos pestañas (suben / bajan, con su impacto o ahorro al mes) y, por cada subida,
  **qué le hace a cada plato** (`platosAfectadosPorPrecio`: coste con el precio de antes y de ahora, también por elaboraciones
  base) y **el PVP que mantiene el food cost objetivo** (`geFoodCostObjPct`; coste ÷ objetivo, con IVA, a 10 céntimos).
  «Aplicar» (`aplicarPvpSugerido`) lo propone y pide confirmación; nunca se cambia solo. También cambia el precio en las
  cartas donde está el plato, para que el TPV no se quede con el viejo. Prueba: `test/cambios-precio.mjs`.
- **Catálogo de iconos de comida** (224, trazo; 181 de comida y 43 de utensilios y equipo de cocina): `tools/iconos-comida-lista.txt` → `node tools/generar-iconos-comida.mjs <tabler> <lucide> <phosphor>` (hacen falta los tres paquetes npm descomprimidos)
  → `js/iconos-comida.js`; el uso (`iconoSeccionHtml`, `iconoSelectorHtml`) va en `js/iconos-comida-uso.js` y `menu.js`, y se
  copia a `reservagastrogoan.html`. Lo guardado: `ic:<clave>`, `ic:none` o un emoji antiguo (se sigue viendo).
  `getCategoryIcon` devuelve el dibujo si es `ic:`; las carpetas de Mega Lista traen su icono de fábrica
  (`MEGALISTA_ICONOS_BASE`). Un selector único para carta y carpetas.
- **Oferta**: lo vivo (agotado, raciones) es estado de servicio y manda sobre el borrador al guardar (`ocCopiarVivo`).
- **Comandas**: un vale nuevo cuando la mesa pide otra vez a los 8 min de que el actual tenga comida disparada; modo
  caos por mesas; pase; incidencias; todo el camino de avanzar platos pasa por `avanzarLineasCocina`.
- **I+D**: tres proveedores de IA (Gemini, Claude, ChatGPT) en la tabla `IDR_PROVEEDORES`; la clave sigue en
  `localStorage`. Los tres aceptan el preflight CORS desde el dominio, pero **nunca se han probado con una clave real**.
- **Proveedores**: la tarjeta es el nombre + ficha / editar / eliminar; todo lo demás vive en la ficha. **WhatsApp solo
  con móviles** (`whatsappDeTelefono`: 6/7 en España, con prefijo 34 para `wa.me`; un fijo avisa y no abre nada).
- **Mega Lista**: el precio de compra es **sin IVA** y el IVA va justo al lado (lista y formulario); «por revisar»
  (sin precio / IVA / proveedor), IVA en línea y por carpeta, cálculo en vivo (coste por unidad y con IVA).
- Pruebas que siguen el diseño nuevo: `oferta`, `vales-cocina`, `iconos-comida`, `ia-proveedores`, `subpantallas`,
  `proveedores`, `megalista`, `plegables`, `menu-acciones`, `escandallo`, `fichas`, `pedidos`. ✅ `acceso-alta.mjs` ya pasa (7/11): el selector de idioma de la entrada vuelve a 44 px en móvil y tablet.

## Barrido de toda la app y `CONTROL_CALIDAD/` (7/11, noche)

El dueño pidió revisar **toda** la app, no solo las pantallas elegidas, con el prompt maestro. Se hizo SIN cambiar la identidad
(el rediseño total sigue revertido): se capturó cada pantalla con el negocio de prueba lleno, a 390 y 1280 px, y se corrigió lo que
estaba mal. `CONTROL_CALIDAD/` guarda inventario, seguimiento por página (con la cobertura REAL de cada métrica), incidencias,
pruebas, sistema de diseño, continuidad e informe. **Léelo antes de volver a auditar: dice qué NO se ha mirado.**
- ⚠️ **Lo marcado o elegido va en verde oliva, nunca en negro** (pestañas, selectores, horas). Había negro en Gestión Económica y en
  controles de la web pública. Al pasar el ratón: fondo crema + borde verde. Sin raya negra gruesa sobre cada tarjeta ni barras de acento.
- ⚠️ **Un módulo nuevo en una carpeta necesita sus textos `module.<carpeta>.<id>.name/.desc` en es, ca y en**: el de I+D de Sala salía
  como `module.sala.idr.name`. Lo vigila `test/claves-sin-traducir.mjs` (todas las vistas × 3 idiomas).
- Franjas de cifras en móvil: con celdas impares la última ocupa la fila entera (`.st-resumen`, `.grid-N:has(> .kpi)`).
- En Gestión Económica las pestañas van ANTES del aviso y la lista de pendientes (`.ck-det`, plegada en móvil).
- ⚠️ Para capturar `home` hay que quitar `#app-splash`; si no, sale la pantalla de carga.
- `movil.mjs` ahora incluye `idr`, `idr-sala` y `plan360`.
- Decisiones del dueño abiertas: `landing.html` y `catalogo.html` (identidad antigua, no se publican) y los emojis de los paneles privados.

## Entrada, selector y frase del día (28-29/10)

Cambios guiados pantalla a pantalla por el dueño, partiendo SIEMPRE de la base que ya tenía aprobada
(lo dijo claro: «mejora la base, no la cambies»; un rediseño a dos mitades se descartó al momento).
- **Fondo de entrada** (`--entry-bg`, css/styles.css): luz cálida desde arriba + grano finísimo de papel,
  sin cuadrícula ni resplandores (la cuadrícula «se veía a km que era IA»). Carga, acceso, selector y asistentes.
- **Acceso**: logo gg a la izquierda, del alto exacto de nombre + kit (`--bh`, `--bgap`, `--bkit`); el nombre es el
  logotipo ORIGINAL de gastrogoan.com (`.gg-wordmark`: «gastro» 400, «goan» 600, punto verde).
  Movimiento (todo con «reducir movimiento» apagado): las gg flotan (`gg-flotar`, también en el selector), la
  frase entra la última, brillo al pasar por Propietarios, luz de lámpara que respira y negocios escalonados. Propietarios en el verde de la marca; «Acceso Empleados · Áreas de cocina y sala»; respuesta
  al pasar y al pulsar; al pie, la **frase del día** y la fecha.
- **Barra superior de la app** (29/10): sin «Kit de gestión»; el logo gg + el nombre del negocio (o el logotipo
  «gastrogoan.» si no hay) quedan solos. TODOS los botones (idioma, Negocios, Actualizar, Ayuda, Cerrar sesión)
  con el aspecto del selector de idioma (caja con filete, mono, blanco); el de chat, en verde de la marca.
  Las medidas mínimas de toque de móvil no se tocan. La prueba de traducciones acepta «gastro» y «goan» (la marca).
- **Inicio** (29/10): cabecera «diario» (día a la izquierda en mono, pregunta en Schibsted 300) y tres áreas SOLO con
  icono y nombre: Cocina en blanco, Sala en verde, Gestión en tinta. Sin cifras (viven en el Panel). **Página fija,
  sin scroll** en cualquier tamaño: las tarjetas se reparten el alto que sobra (tope 400 px, 168 en móvil) y el
  sello de versión queda abajo. Se mide con scrollHeight de `#content`; el `padding-bottom` de 92 px del móvil
  se anula aquí con `:has()` y `!important`.
- **Selector de negocios**: no hay tope de negocios por cuenta. Hasta 5 se ven todos; desde 6, buscador y
  lista con desplazamiento propio. Cambiar contraseña / Salir como botones (`.bs-footbtn`).
- **Frase del día** (`js/frases.js`, en build.sh tras i18n.js), fija bajo la tarjeta de acceso, sin caja:
  fecha, la frase (Schibsted) y el autor debajo (mono, verde). **TODAS llevan autor** (lo exigió el dueño:
  «no me sirve que no tenga autor»): hoy son 238 (75 comprobadas en Wikiquote con su fuente, 163 aportadas
  por el dueño) y se repiten en ciclo (`fraseDelDia`). Para llegar a 365 distintas faltan 127 CON autor.
  ⚠️ No añadir frases con nombre de un chef sin fuente: una cita inventada en una app que se vende es un
  riesgo de imagen. Nada de serifa: se probó y se descartó.

## Seguridad rápida (9/10, tras una revisión externa)

- **Cabeceras** en `deploy/{app,admin,reservas}/public/_headers` (nosniff, referrer, HSTS; la app y
  el panel no se pueden incrustar; la web de reservas SÍ, porque el restaurante la puede meter en su
  web). Falta la política de contenido (CSP): hay que afinarla con cuidado, la app lleva mucho código en el HTML.
- **La clave de VeriFactu vive en el aparato** (`verifactuKeyLS`, localStorage), no en `DB.business`:
  igual que la clave de la IA. Hay que ponerla en cada tablet que facture.
- **PIN del PROPIETARIO: 6-12 letras o números** (antes 4 dígitos: 10.000 intentos bastaban, la ruta de la
  cuenta se deriva de usuario + PIN y Firebase no limita intentos). El PIN de empleado sigue en 4 dígitos
  (es local). Los PIN de 4 dígitos ya existentes siguen valiendo hasta que se cambien.
- La cabecera muestra «Nube conectada · hace N s» (`lastSyncOkAt`): última subida confirmada.
- `npm test` ya lanza TODA la batería (`npm run test:smoke` para solo el humo). Dependabot mensual.
- ⚠️ **Pendiente grande**: todo es sesión ANÓNIMA, y `public/$id/requests` (reservas con nombre y
  teléfono) se puede LEER con solo conocer el publicId. Arreglo previsto sin coste: que la app del negocio
  entre con correo y contraseña de Firebase y que las reglas exijan `sign_in_provider != 'anonymous'` para
  leer; la web pública queda anónima y solo escribe. Migrar a los negocios ya dados de alta con el emulador.

## El módulo de I+D (`js/idr.js`)

Un asistente de cocina que crea **elaboraciones base, platos, menús y cartas**
con los ingredientes, los precios y el criterio de ESE negocio. Es la última
capa de la app y se trata igual de bien que el resto.

### Cómo funciona por dentro

- **La clave del proveedor de IA la pone cada negocio** y vive en
  `localStorage` (`gastrogoan_idr_key`), **nunca en `DB.business`**: ese bloque
  se sincroniza con la nube del negocio y cualquier empleado podría leerla.
  Google (Gemini) y Anthropic (Claude), llamados directamente desde el
  navegador. A GastroGoan no le cuesta nada.
- **Tope de 500 consultas al día por dispositivo**, para que nada se desboque.
- **El ADN gastronómico es REQUISITO**: sin cocina, nivel y público no se
  empieza nada. Sin eso el asistente propone cocina de folleto, y una
  propuesta genérica no solo no sirve: quema la confianza en la herramienta.
- **El encargo va antes que la conversación**: precio sin IVA, food cost
  objetivo y —en menú y carta— la estructura (cuántos bloques, cómo se llaman
  y cuántos platos lleva cada uno). Nada viene por defecto: la estructura de
  su carta la decide el hostelero, no nosotros. Ese encargo viaja en TODAS las
  consultas marcado como intocable.
- **No hay guion de pasos.** Lo hubo, y se cayó en cuanto el dueño probó a
  hacer una ensalada (no lleva salsa) y un helado (no lleva guarnición). Ahora
  lleva la conversación el asistente, con el marco de oficio de `IDR_REGLAS`.
- **Las recetas se escriben para UNA ración**, que es como se escandalla un
  plato de carta.
- **Los números los pone la app, no el modelo**: casa los ingredientes con los
  suyos, convierte las unidades y calcula el coste con sus precios. Un plato
  puede engancharse a una elaboración base suya (`{type:'base'}`) y el coste
  se encadena solo.
- **La app juzga lo que propone** (`idrValidarPlato` / `idrRevisarConjunto`) y
  lo que falla vuelve al modelo para que lo corrija antes de que el cocinero
  lo vea.

### Trampas ya pisadas aquí (no repetirlas)

| Síntoma | Causa real |
|---|---|
| "Pregunto y no contesta nunca", sin ningún error | La nube devolvía el bloque `idr` mientras el asistente pensaba y **sustituía la creación entera**, conversación incluida. La respuesta llegaba a un objeto que ya no estaba en `DB`. Solo pasa con la nube conectada: ninguna prueba local lo veía. Ver `fusionarCreacionIdr` y el `cVivo` de `idrEnviarInterno`. |
| El botón se queda en "Pensando…" para siempre | Un fallo al repintar dejaba la pantalla igual, sin aviso. Todo lo que espera está envuelto, y **un turno no puede terminar sin respuesta en el hilo**. |
| Respuesta vacía del modelo | Los modelos que razonan (gemini-3.6-flash) gastan el presupuesto de tokens pensando y devuelven un candidato SIN TEXTO. Se reintenta una vez con el triple de margen. |
| 120 kg de queso en una ficha | El modelo contesta en gramos y el negocio compra en kg. `idrConvertirCantidad`. |
| Avisos de equipamiento falsos | El campo del ADN es una descripción, no un inventario: **solo se puede afirmar lo que NIEGA** ("sin Roner"). Avisar de que no tiene plancha porque no la escribió enseña a ignorar todos los avisos. |
| El food cost solo se miraba por exceso | Un plato al 5% con objetivo del 30% es dinero sobre la mesa o media receta que falta. Y **un menú se cuesta ENTERO por comensal**, no pase a pase. |

### La simulación

`test/simulacion/` corre los cuatro flujos con un bistró catalán completo (28
ingredientes con precios, ADN entero) **sin necesitar ninguna clave**: las
respuestas del asistente están escritas a mano en `respuestas.json`. De ahí
salieron tres fallos que ninguna prueba unitaria veía. Al tocar el módulo,
correrla y comparar `salida/estado.json`.

---

### Antes de dar algo por terminado

```bash
node -c js/<fichero>.js       # sintaxis
node test/smoke.test.mjs      # cálculos de dinero/IVA, stock, recetas
node test/audit-active.mjs    # regresiones de sincronización
node test/cuentas.mjs         # aislamiento entre cuentas — lo que NO puede fallar nunca
node test/sin-salida.mjs      # que ninguna pantalla del alta sea un callejón sin salida
node test/idr.mjs             # el módulo de I+D, 85 casos
node test/permisos.mjs        # los 6 modos de sesión (empleado, edición, reparto)
python3 -m http.server 8950 & node test/traducciones.mjs  # la app entera en es/ca/en, 41 pantallas
python3 -m http.server 8950 & node test/movil.mjs          # 5 anchos de móvil (320-430), vistas Y modales
python3 -m http.server 8950 & node test/visual-audit.mjs   # nada se desborda en 6 tamaños × 25 vistas
python3 -m http.server 8950 & node test/click-audit.mjs    # pulsa los 274 botones visibles de las 31 pantallas
node test/simulacion/correr.mjs  # el I+D entero con un negocio real (ver su README)
bash test/emulador/run.sh     # DOS dispositivos contra un Firebase de verdad (emulador oficial),
                              #  incluido bucle-sync.mjs: que la app no se pase la vida subiendo
bash build.sh                 # regenerar dist/
```

O las 87 de una vez, en paralelo (son independientes; encadenarlas solo
servía para esperar):

```bash
bash test/todo.sh
```

⚠️ **Un solo fallo está aceptado a conciencia**: *"visual real en PC, tablet
y movil"* avisa de los botones compactos de Comandas Cocina (91×25 px, por
debajo del mínimo táctil). Los pidió así el dueño el 9/09 para que no ocupen
media pantalla en hora punta. Desde el 14/09 **sale en amarillo (🟡) y NO
tumba la batería**: se declara con `acepta` en vez de `espera`, diciendo por
qué. Se toleraba de memoria, y eso vale con una persona mirando, pero no con
una comprobación automática — un rojo permanente enseña a no mirar ninguno.
Cualquier OTRO fallo sigue siendo un fallo de verdad, y `todo.sh` sale con 0
solo si no hay ninguno.

**Desde el 14/09 la batería corre sola en cada push y cada pull request**
(`.github/workflows/pruebas.yml`). Antes `npm test` solo lanzaba el humo y
las 87 se pedían a mano, así que una regresión podía llegar a `main` —y de
ahí a Cloudflare— sin que nada la parase. Es gratis: Actions no tiene límite
en repositorios públicos y no crece con las licencias vendidas.

⚠️ Las 84 pruebas de navegador llevan la ruta de Chromium **escrita a mano**
(`/opt/pw-browsers/chromium-1194/...`). El workflow **crea esa misma ruta**
apuntando al Chromium de Playwright en vez de editar 84 ficheros.

Luego commit + `git push -u origin <rama>`. Borrar siempre los scripts de prueba temporales.

### Rama

Trabajo en `claude/beautiful-dijkstra-58bru6`. No abrir PR salvo petición explícita.

### Publicar: un cambio no está hecho hasta que se VE en el dominio

**Cloudflare Pages publica desde `main`, no desde la rama de trabajo.** Un
arreglo que se queda en la rama no llega al dueño: parece que no se ha hecho
nada, y se pierde la tarde diagnosticando un bug ya corregido (pasó el
30/08, cuando el hosting todavía era Render).

Por eso, cada vez que se toque el código, la tanda entera es:

```bash
bash build.sh            # regenerar dist/
bash deploy/actualizar.sh   # copiar dist/ dentro de deploy/  ← si no, se publica lo viejo
git commit && git push -u origin claude/beautiful-dijkstra-58bru6
git checkout main && git merge --no-ff claude/beautiful-dijkstra-58bru6 && git push origin main
git checkout claude/beautiful-dijkstra-58bru6
```

⚠️ `--ff-only` falla en cuanto `main` tiene un commit de fusión propio (o
sea, casi siempre): usar `--no-ff`, que además deja en el historial de qué
tanda salió cada cosa.

Y decirle al dueño **qué sello de versión tiene que ver** (`GG_BUILD`, abajo en
la app, en hora de Madrid). Si ve otro, no está mirando el cambio: no tiene
sentido pedirle que pruebe nada todavía.

---

## Pruebas (Puppeteer) — trampas ya conocidas

**Chromium**: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, con `--no-sandbox`. Servir con `python3 -m http.server <puerto>`. Los `.mjs` deben crearse **dentro del repo** (ahí está `puppeteer-core`).

Semilla mínima para entrar sin pasar por la configuración inicial:

```js
Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'}; // si no, aparece el asistente de nube
localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
localStorage.setItem('gastrogoan_owner_login','1');
localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
localStorage.setItem('gastrogoan_owner_pass_prompted','1');
```

⚠️ **NUNCA escribir en la Firebase de producción.** Para probar `reservagastrogoan.html`: bloquear la red de Firebase/gstatic e inyectar `DB` a mano imitando lo que haría `loadBusinessInfo()`.

### Falsos positivos ya investigados — no volver a "descubrirlos"

| Síntoma | Realidad |
|---|---|
| KPI muestra un número que no cuadra | `animateKpiNumbers()` (js/polish.js) anima 600 ms. Leer el DOM antes hace ver cifras intermedias. Esperar ~1,2 s. |
| "La app tarda 6,5 s en cargar" | Artefacto de `waitUntil:'networkidle0'`: espera al fetch de licencias revocadas. El arranque real son ~38 ms. |
| Crash al sembrar datos | Casi siempre **nombres de campo inventados** en la semilla. Verificar la estructura real con grep antes. |
| `DB` es `null` a media prueba | `setViewport({isMobile:true})` **recarga la página** y borra el estado inyectado. Re-sembrar después. |
| Abriendo el HTML como archivo local aparecen datos raros | `file://` y `content://` comparten `localStorage` entre archivos: se ven datos de pruebas anteriores. **Nada de esto le pasa a un cliente que entra por gastrogoan.com.** Probar siempre servido por HTTP. |

### El hueco que dejó pasar dos bugs a producción

Las pruebas corren **en local, sin Firebase**, así que solo cubrían "¿funciona
la app?" y no "¿qué pasa cuando la nube contesta?". Por ahí se colaron dos
fallos que solo aparecen con la nube conectada de verdad:

- **El selector de idioma no hacía nada.** El idioma vivía en `DB.business`,
  que se sincroniza; la recarga de `setLang` cortaba el guardado y la nube
  devolvía el idioma viejo. Ahora vive en `localStorage` (es de cada
  dispositivo, no del negocio).
- **Distribución del Trabajo se quedaba congelada.** Al borrarse un empleado
  en otro dispositivo, `mergeStockField` dejaba su clave puesta valiendo
  `undefined`, y recorrer el mapa reventaba antes de dibujar nada — los
  botones parecían muertos. Afectaba igual a `shifts`, `chatPinned` y
  `shiftHandoffNotes`, que usan esa misma fusión.

### Lo borrado no vuelve: las lápidas

`mergeArraysById` fusiona quedándose con **todo** lo que hay en los dos lados.
Eso está bien para no perder trabajo hecho a la vez en dos sitios, pero
significa que **cualquier cosa borrada aquí vuelve** en cuanto sincroniza un
aparato que todavía la tenía — el móvil que pasó el día apagado. Llevaba ahí
desde siempre y solo se ve con dos aparatos de verdad; lo destapó el emulador
el 1/09.

Lo que faltaba era memoria. La foto de lo último enviado (`lastSyncedSnapshot`)
no basta: en cuanto se sube el borrado, esa foto ya no contiene el elemento y
se pierde el rastro. Ahora se anota en `DB.borrados` =
`{"<bloque>:<clave>": cuándo}`, que viaja como un bloque más y **se suma**
entre aparatos en vez de pisarse (`mergeLapidas`).

- ⚠️ **La lápida se anota SOLA al subir** (`anotarLapidas`, dentro de
  `flushCloudSync`), comparando lo que se va a enviar con lo último enviado.
  A propósito: la app tiene decenas de funciones de borrado y bastaría olvidar
  una para que ese borrado se siguiera deshaciendo, sin que nadie se entere.
- Solo en `ARRAYS_CON_LAPIDA` — donde una resurrección se VE y molesta. Las
  ventas y las comandas no se borran, se anulan.
- **Caducan a los 60 días**, y volver a crear algo con la misma clave quita su
  lápida: si no, una carpeta borrada dejaría su nombre inutilizado para
  siempre.

**Al tocar cualquier cosa que se sincronice, simular la respuesta de la nube**
(`applyRemoteBlock` / `mergeStockField` a mano) y no darlo por bueno solo
porque funcione en local. Los dos casos tienen ya prueba permanente en
`test/audit-active.mjs`, bloque H.

Y mejor todavía, sin simular nada: `bash test/emulador/run.sh` levanta el
**emulador oficial de Firebase** y abre **dos navegadores reales** contra
él. Es el único sitio donde se ve lo que de verdad hace la nube — ahí se
descubrió, por ejemplo, que **Firebase no guarda objetos vacíos**, que es
la raíz del bug de Distribución del Trabajo. Ver `test/emulador/README.md`.

---

## Estado actual (13 sep 2026)

**Veredicto: PUBLICADO Y VENDIBLE — y ahora también en un móvil.** Circuito
completo verificado en producción (ver más abajo). Análisis completo en
`ANALISIS_GENERAL.md` (8 bloques). Lo único que falta ya no es técnico: es
vender la primera licencia a alguien que no sea el dueño.

Verificado con pruebas reales, no solo revisión de código: concurrencia genuina en reservas (20 simultáneas contra aforo 10), volumen realista (500 clientes / 10.000 ventas), inyección XSS, responsive en 3 idiomas × 5 resoluciones × 18 módulos, y una auditoría ciega por una sesión de IA independiente (7,5/10 antes de corregir su hallazgo del hash débil).

### Hecho (14 ago 2026)

- **Reglas de Firebase publicadas** con los nodos del modelo de cuentas (`ownerNames`, `ownerAuth`, `codeClaims`) y con `tenantLookup`, sin el cual **ningún empleado podía entrar desde un dispositivo nuevo**.
- **Alta completa verificada contra la plataforma real**, servida por HTTP: crear cuenta y código en el generador → entrar con usuario+PIN → canjear el código → negocio dado de alta.
- **Campos personalizados de Stripe configurados**: cada venta llega ya con la respuesta de si el cliente es nuevo o repite.
- **Documentos rehechos** con el sistema de diseño real (`build_docs.py`, un solo generador para los cuatro PDF).
- **Acceso de empleado verificado** contra la plataforma real desde un dispositivo que no conocía el negocio (nombre + PIN + código). Con esto, todo el modelo de acceso -propietario y empleado- está probado de punta a punta.
- **Configuración de la nube probada** como cliente nuevo, de principio a fin. Era el paso que se daba por más frágil: el único del alta donde un cliente podía atascarse.

### Publicado y verificado en producción (24 ago 2026)

La app vive en **dos sitios de Netlify** bajo el dominio (gestionado por
Netlify DNS, así que los subdominios se crean solos):

| Sitio | Contenido | Quién entra |
|---|---|---|
| `app.gastrogoan.com` | `index.html` + `sw.js` | El hostelero y su personal |
| `reservas.gastrogoan.com` | `reservagastrogoan.html` + `fonts/` + `_redirects` | Clientes del restaurante |

`gastrogoan.com` a secas sigue siendo la web comercial, intacta.

⚠️ **Al canjear una licencia**, el enlace público NO se deduce de dónde esté
abierta la app: se dice en `PUBLIC_RESERVAS_BASE` (js/core.js). Con los dos
sitios separados, deducirlo generaba `app.gastrogoan.com/reservagastrogoan.html`
— que no existe, y el QR de todos los clientes daba error.

⚠️ **Cada negocio tiene que autorizar los dos dominios en SU PROPIO proyecto
de Firebase** (Authentication → Settings → Dominios autorizados). No basta con
autorizarlos en `plataforma-gastrogoan`: la app se autentica contra la nube del
negocio. Firebase solo trae `localhost` y los suyos de fábrica. Es el paso 4 de
`FIREBASE_GATE_STEPS` — sin él, el alta termina bien y la nube falla al final.

Verificado de punta a punta el 24 de agosto, por el dueño, sobre el dominio real:

- Alta completa desde cero con una cuenta nueva (**~10 min** con soltura,
  ~20 min alguien sin nociones — el tiempo que promete la guía).
- Indicador de nube en verde.
- **Sincronización real entre tablet y móvil**, con una reserva de verdad
  entrando por la web pública y apareciendo en el panel.
- **Un pago de prueba con Redsys, correcto** (Redsys se sustituyó por Stripe el 30/09).

Con esto, todo el circuito de venta está probado: cuenta → código →
alta → nube → panel → web pública → reserva → cobro.

### Hecho el 31 de agosto de 2026

Un día entero de fallos encontrados **por el dueño usando la app**, no por las
pruebas. Merece la pena leerlo antes de tocar nada de esto:

- **Una cuenta nueva podía heredar el negocio del cliente anterior.** Los
  negocios dados de alta antes de que existiera el `ownerId` se adjudicaban
  *a quien estuviera delante* al arrancar. Si el primero en entrar tras
  actualizar era una cuenta recién creada — justo lo que pasa dando de alta a
  un cliente en un aparato que ya se usó — esa cuenta se quedaba con sus
  ventas, sus proveedores y sus nóminas. Ahora la adjudicación ocurre **una
  sola vez por dispositivo** y solo desde el arranque (`SLOTS_MIGRATED_LS`).
- **El aspa del selector de negocios metía dentro del negocio ajeno.** Solo
  hay aspa si el negocio abierto detrás es tuyo.
- **El selector vacío no tenía ninguna salida**: una cuenta nueva se quedaba
  atrapada y solo salía recargando la página. Ahora hay "Salir y entrar con
  otra cuenta", también junto a "Cambiar mi contraseña".
- **El indicador de nube se quedaba clavado en "Guardando…"** — y lo hacía
  precisamente cuando ya estaba todo guardado: si al ir a subir no había
  ningún bloque distinto, la app se iba sin devolverlo a "conectada".
- Todo el módulo de I+D, reescrito (ver su sección).

Pruebas nuevas permanentes: `test/cuentas.mjs` (13 casos de aislamiento entre
cuentas), `test/sin-salida.mjs` (callejones sin salida del alta),
`test/simulacion/` y `test/idr.mjs` (81 casos). La batería pasa de 25 a 27.

### Verificado el 1 de septiembre de 2026

- **El aislamiento entre cuentas EN LA NUBE**, por el dueño, con dos cuentas
  reales en dos aparatos: la plataforma le devuelve a cada una sus negocios y
  no los del otro. Era el único hueco que quedaba del modelo de cuentas — los
  14 casos de `test/cuentas.mjs` cubren el dispositivo, pero corren sin nube.
- **La app entera en los tres idiomas** (`test/traducciones.mjs`, 41 pantallas
  × es/ca/en). Ver la sección de i18n en las convenciones.

### Hecho el 12 y 13 de septiembre de 2026

Dos días de fallos encontrados **por el dueño usando la app**, otra vez. El
patrón se repite y conviene no olvidarlo: lo que rompe la app no lo
encuentran las pruebas, lo encuentra alguien trabajando con ella.

- **La app en un móvil de verdad.** Lo dijo sin rodeos: *"está muy dejada,
  se ve feo, fuera de sitio, saltos de línea apiñados"*. Se midió antes de
  tocar nada: **más de 500 hallazgos** en cinco anchos, que eran **cuatro
  causas** repetidas (letra de 10,5 px escrita a mano, palabras partidas,
  pestañas que había que arrastrar, gráficos cortados). Ahora cero, con
  `test/movil.mjs` vigilando. Ver las reglas en las convenciones.
- **Modo caos también en Cocina**: una sola lista con lo pendiente, el que
  más lleva esperando arriba. El hermano del de Sala.
- **Cuenta de Resultados: se elige año Y periodo** (mes o trimestre). Antes
  la cabecera daba siempre el mes en curso: al retroceder de año, la tabla
  enseñaba 2025 y la cabecera los números de este septiembre.
- **"En riesgo" en Clientes ya no se lo lleva quien vino ayer.** Era
  `dias_sin_venir > intervalo_medio * 2` sin ningún suelo: quien viene a
  diario tiene un intervalo de 0,4 días, así que con UN día sin aparecer ya
  pasaba del doble. Había clientes con MIL visitas marcados como perdidos.
  Ahora exige además 30 días de histórico y 14 de ausencia. **Un aviso que
  no lleva a ninguna acción enseña a ignorar todos los demás** — el mismo
  criterio que ya valía para los avisos de equipamiento del I+D.
- **Cancelar es del dueño, o de un empleado con permiso de editar.** Da
  igual qué se cancele: reserva, pedido online, venta, lista de espera. Iban
  cada una por su lado —unas pedían el PIN del negocio, cancelar una reserva
  confirmada era un "¿seguro?" y ya— y el PIN **no es un permiso**: lo acaba
  sabiendo cualquiera del equipo. Todas pasan por `puedeCancelar()`.
- **Nada registrado se modifica**: los pedidos a proveedor recibidos ya no
  se borran (solo "Deshacer recepción"), y el historial entra por el mes en
  curso con selector de año y mes. Archivar datos antiguos se lleva también
  los pedidos, que se quedaron fuera desde siempre.
- **El vídeo de venta, hecho** (ver abajo, el punto 0 ya no está pendiente).

### El vídeo de demo (13/09)

Grabado por el dueño sobre el dominio real y montado aquí. `video/`:

| Archivo | Para qué |
|---|---|
| `montar-demo-final.mjs` | El montaje entero: portada, recorrido y cierre |
| `rotulos.mjs` | Rótulos y pantallas, dibujados con Chromium y la tipografía real |
| `musica.mjs` | La música, sintetizada con código |

- La grabación entera son **380 MB y no cabe de una pieza**: llega partida
  en trozos y el montador los empalma.
- `VELOCIDAD = 1` da la versión larga (7m16s, la que quiso entregar);
  `2.6` da la corta de tres minutos.
- **El PIN va emborronado.** No basta con el campo (que tapa los dígitos con
  puntos): **el teclado de la tablet ilumina la tecla pulsada**, así que el
  PIN se leía fotograma a fotograma. Se tapan las dos zonas.
- **La música se sintetiza, no se descarga**: el vídeo es uso comercial y la
  música "gratis" de internet casi nunca lo permite sin licencia.
- ⚠️ Para comprobar dónde cae un rótulo, **fotogramas SUELTOS con `-ss`**.
  El filtro `fps=1/N` de una hoja de contactos coge el del CENTRO del
  intervalo, así que viene desplazada y parece que los rótulos van por
  detrás del contenido. Ya costó dos vueltas.

### Hecho el 14 de septiembre de 2026 — auditoría externa

Una IA independiente revisó el repositorio (que es **público**) y sacó cinco
hallazgos. Tres eran reales y se han corregido; dos no lo eran tanto:

- **El espejo público se podía bloquear desde fuera, y eso sí era grave.**
  Con el `publicId` (va en el QR, es público a propósito) y una sesión
  anónima, cualquiera podía escribir **500 en `aforoHold`** de cada turno de
  cada día: el negocio aparece COMPLETO para siempre y no entra ni una
  reserva. Ahora **una escritura no puede subir el contador más de 40**, que
  sobra para la mesa más grande y es cortísimo para un ataque. La app solo
  suma los comensales de UNA reserva, así que no la roza.
- **`orderStatus` y `reservationStatus` no tenían NINGUNA validación** en
  las reglas de cada negocio (sí en las de la plataforma): se escribía
  cualquier cosa, con un token de un solo carácter. Ahora el token debe
  medir 12+ y el cuerpo tiene que ser `{status, updatedAt}`. Esto **no lo
  vio el auditor** y era peor que lo que sí señaló.
- **El token salía de `Math.random()`**, predecible en algunos navegadores.
  Ahora `crypto.getRandomValues`, con respaldo para navegadores viejos.
- **Zoom desbloqueado** (`user-scalable=no` fuera). En una app llena de
  cifras de dinero, quien ve poco no podía acercarlas; iOS lo ignora desde
  hace años, así que solo penalizaba a Android.
- **VeriFactu**: el texto decía *"ya está técnicamente preparado"*. No lo
  está. Ahora dice que está en desarrollo y que **no sirve para cumplir**.
  El auditor lo llamó "bloqueante legal": no lo es mientras no se venda como
  funcional, pero la frase era una promesa que había que poder cumplir.

⚠️ **Las reglas viven en TRES sitios y la prueba exige que sean idénticas**:
`FIREBASE_RULES_JSON` (js/core.js, lo que copia el asistente del alta),
`reglas/reglas-de-cada-negocio.json` y `reglas/reglas-de-la-plataforma.json`.
Tocar una sola hace que `test/reglas.mjs` cante. Es a propósito: si se
separan, un cliente nuevo pega unas reglas flojas y nadie se entera.

⚠️ **Endurecer las reglas no basta con publicarlas aquí.** Cada negocio ya
dado de alta tiene las VIEJAS en su propio proyecto de Firebase: hasta que
su dueño no pegue las nuevas, sigue expuesto. El aviso de reglas
desactualizadas ya existe en la app.

Dos hallazgos **no se tocan**, y conviene no volver a replantearlos:
- *"Una licencia conocida se puede reclamar antes que su comprador"*: cierto,
  pero hay que **conocer** el código de 8 caracteres, `codeClaims` no se
  puede listar, y tú puedes liberarlo desde el generador. Es Bajo, no Alto.
- *"La licencia es credencial permanente del tenant"*: es la limitación ya
  documentada en `ANALISIS_GENERAL.md` (bloque 8). Arreglarla pide Cloud
  Function + plan Blaze, o sea pagos recurrentes. Decisión tomada: no.

Prueba nueva permanente: `test/endurecido-publico.mjs` (25 casos). La
batería pasa de 85 a 87.

**La fuente de iconos, recortada (800 KB → 53 KB).** La misma auditoría dijo
*"el HTML pesa 4,8 MB con caché de revalidación, partidlo en módulos"*. Las
dos premisas eran falsas —el service worker es *cache-first* (sirve la copia
guardada y solo pide `version.json`, 29 bytes) y Cloudflare comprime, así que
por la red iban 1,8 MB, no 4,8— pero **la primera carga sí pesaba**, y la
causa no era el fichero único (que ES el producto: dos HTML sueltos).

Era `css/tabler-icons.min.css`: **5.147 iconos, de los que la app usa 264**.
Y no se notaba en ninguna medida de compresión porque la fuente viaja como
**woff2 en base64, que ya viene comprimido**: gzip no podía tocarlo, así que
esos ~600 KB eran **un tercio de todo lo que se descarga la primera vez**.

Ahora `build.sh` llama a `tools/recortar-iconos.py`. **Primera descarga real:
1,8 MB → 1,3 MB**, sin partir el fichero ni tocar la arquitectura.

⚠️ El juego completo (`css/tabler-icons.min.css`) **sigue siendo la fuente de
la verdad y no se toca**: el recorte se genera en `build/` (ignorado por git,
como `dist/`). Así un icono nuevo entra solo en la siguiente compilación, sin
que nadie tenga que acordarse.

⚠️ **Los iconos que se arman en tiempo de ejecución no los ve el rastreador**
y van a mano en `DINAMICOS` (hoy: `sunrise`, `sunset`, `chevron-up`,
`history`). Si se añade otro `ti-${...}`, hay que apuntarlo ahí. Lo vigilan
`test/iconos.mjs` (8 casos) y una comprobación dentro del propio recortador:
un icono perdido no falla, sale como un **cuadradito vacío** en una pantalla
concreta, y solo lo ve quien abra esa pantalla.

⚠️ **`todo.sh` tiene DOS listas**: la de `lanzar` y la de `espera`. Añadir
solo la primera deja la prueba corriendo **sin que nadie mire su resultado** —
pasó con P86 el 14/09 y no lo canta nada. Al añadir una prueba, comprobar que
su nombre SALE en la tanda.

⚠️ **El repositorio es PÚBLICO y `generador-licencias.html` está dentro.**
No se pueden emitir licencias sin la contraseña de Firebase del admin (las
reglas solo dejan escribir a `gastrogoan@gmail.com`, y el `apiKey` no es un
secreto), así que no hay puerta abierta — pero sí se regala el plano del
modelo de licencias. Decisión del dueño pendiente.

### Pendiente

0. **Vender.** Es lo único que falta de verdad: la app está publicada, el
   móvil arreglado, el vídeo hecho y los documentos listos. Objetivo
   acordado: **15-20 licencias el primer mes a 100 €/año**, sin presupuesto
   de publicidad. El paso que está bloqueado es la lista de prospección —
   hace falta que el dueño diga la ZONA para sacar los negocios y montar el
   guion de contacto.
1. **Probar el I+D con un modelo de verdad.** Todo lo verificado son los
   circuitos: en la simulación el asistente lo escribía una IA haciendo de
   modelo, no el proveedor del cliente. Que Gemini conteste con ese criterio
   está sin comprobar, y es lo que decide si el módulo vale. Hace falta una
   clave de Google (gratuita) y media hora. Es la herramienta que más vende
   y la que peor queda si falla delante de un cliente.
2. *(Recomendado, no urgente)* auditoría de seguridad por un humano externo
   antes de manejar pagos de forma continuada.
3. iPhone/iPad: las trampas conocidas de Safari están cerradas y hay prueba
   (`test/apple.mjs`), pero **sigue sin probarse en un aparato de verdad**.
4. La impresora térmica y el cajón con el hardware delante.
5. **Un servicio real, con un cliente al que se pueda llamar.** Es lo que de
   verdad encuentra fallos: de los cinco del 24 de agosto, cuatro los encontró
   el dueño usando la app; y los cuatro del 31 de agosto, todos.

> La cuenta de prueba `pruebamia` **se deja a propósito**: sirve para verificar el alta completa tras cualquier cambio en el acceso, sin gastar un código real ni tocar datos de un cliente. Conviene marcarla como prueba en el registro de ventas del generador para no contarla como venta al revisar el CSV.

### Limitaciones asumidas conscientemente

- Sesión falsificable desde las devtools (inherente a no tener servidor). El modelo de seguridad asume que el dispositivo del negocio es de confianza, como cualquier TPV offline-first.
- `tenants/$tenantId` sin identidad revocable (ver arriba).
