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

Hoy en **Render** (dos sitios estáticos). **La intención es volver a Netlify.**
Al hacerlo hay que tener presente lo que ya pasó una vez: el plan gratuito de
Netlify limita las PUBLICACIONES, y se agotaron dejando la app congelada dos
semanas. Publicar en tandas, no cada arreglo suelto.

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
- **Escapado**: `escapeHtml()` en **todo** dato de usuario que entre en HTML. Verificado sin huecos.
- **Objetivo táctil mínimo**: 44×44 px. Ojo con dos trampas ya pisadas:
  las reglas de pantallas MÁS pequeñas encogían los botones aún más
  (34-36 px), y varios tamaños estaban escritos a mano en el HTML, donde
  ninguna regla de CSS los alcanza.
- **Contraste mínimo del texto**: 4,5:1 (3:1 si es grande). `--muted` es el
  gris de TODO el texto secundario y aparece 150+ veces por pantalla: si se
  toca, comprobar contra los cuatro fondos de la app (blanco, `#FAF8F4`,
  `#F1EFE9`, `#F4F4F4`). Lo verifica `test/contraste.mjs`.

---

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
node test/idr.mjs             # el módulo de I+D, 81 casos
python3 -m http.server 8950 & node test/visual-audit.mjs   # nada se desborda en 6 tamaños × 25 vistas
python3 -m http.server 8950 & node test/click-audit.mjs    # pulsa los 274 botones visibles de las 31 pantallas
node test/simulacion/correr.mjs  # el I+D entero con un negocio real (ver su README)
bash test/emulador/run.sh     # DOS dispositivos contra un Firebase de verdad (emulador oficial)
bash build.sh                 # regenerar dist/
```

O las 27 de una vez, en paralelo (son independientes; encadenarlas solo
servía para esperar):

```bash
bash test/todo.sh
```
Luego commit + `git push -u origin <rama>`. Borrar siempre los scripts de prueba temporales.

### Rama

Trabajo en `claude/beautiful-dijkstra-58bru6`. No abrir PR salvo petición explícita.

### Publicar: un cambio no está hecho hasta que se VE en el dominio

**Render publica desde `main`, no desde la rama de trabajo.** Un arreglo que se
queda en la rama no llega al dueño: parece que no se ha hecho nada, y se pierde
la tarde diagnosticando un bug ya corregido (pasó el 30/08).

Por eso, cada vez que se toque el código, la tanda entera es:

```bash
bash build.sh            # regenerar dist/
bash deploy/actualizar.sh   # copiar dist/ dentro de deploy/  ← si no, Render publica lo viejo
git commit && git push -u origin claude/beautiful-dijkstra-58bru6
git checkout main && git merge --ff-only claude/beautiful-dijkstra-58bru6 && git push origin main
git checkout claude/beautiful-dijkstra-58bru6
```

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

## Estado actual (31 ago 2026)

**Veredicto: PUBLICADO Y VENDIBLE.** Circuito completo verificado en producción (ver más abajo). Análisis completo en `ANALISIS_GENERAL.md` (8 bloques).

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
- **Un pago de prueba con Redsys, correcto.**

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

### Pendiente

0. **Probar el I+D con un modelo de verdad.** Todo lo verificado son los
   circuitos: en la simulación el asistente lo escribía una IA haciendo de
   modelo, no el proveedor del cliente. Que Gemini conteste con ese criterio
   está sin comprobar, y es lo que decide si el módulo vale.
0bis. **El aislamiento entre cuentas EN LA NUBE.** Lo del dispositivo está
   verificado (13 casos). Que la lista que devuelve la plataforma sea la de
   cada cuenta necesita dos cuentas reales y dos dispositivos.
1. *(Recomendado, no urgente)* auditoría de seguridad por un humano externo
   antes de manejar pagos de forma continuada.
2. iPhone/iPad: todo se ha probado en Chromium y Android.
3. La impresora térmica y el cajón con el hardware delante.
4. **Un servicio real, con un cliente al que se pueda llamar.** Es lo que de
   verdad encuentra fallos: de los cinco del 24 de agosto, cuatro los encontró
   el dueño usando la app; y los cuatro del 31 de agosto, todos.

> La cuenta de prueba `pruebamia` **se deja a propósito**: sirve para verificar el alta completa tras cualquier cambio en el acceso, sin gastar un código real ni tocar datos de un cliente. Conviene marcarla como prueba en el registro de ventas del generador para no contarla como venta al revisar el CSV.

### Limitaciones asumidas conscientemente

- Sesión falsificable desde las devtools (inherente a no tener servidor). El modelo de seguridad asume que el dispositivo del negocio es de confianza, como cualquier TPV offline-first.
- `tenants/$tenantId` sin identidad revocable (ver arriba).
