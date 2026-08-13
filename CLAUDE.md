# GastroGoan — contexto para Claude

App de gestión para restaurantes, **100% cliente**, que se vende por licencia a hosteleros.
Se entrega como **dos archivos HTML sueltos** que el cliente abre desde `gastrogoan.com`.

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
   tpv.js  operations.js  hr.js  polish.js  app.js      ← en este orden
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

- El **código de licencia** (8 caracteres) y su contraseña se generan con `generador-licencias.html`, que además los registra en `gastrogoan/issuedCodes` (requiere iniciar sesión como admin `gastrogoan@gmail.com` en ese archivo — sin eso el código **no se podrá activar**).
- `ggBizTenantId(code)` deriva el `tenantId` del código. `getPublicId()` deriva el id público (reservas) del tenantId.
- Activar exige **internet**: `activateBusinessLicense()` comprueba el código contra `issuedCodes`.
- **Revocación**: `checkLicenseRevocation()` lee `revoked-licenses.json` de GitHub. Es *fail-open* a propósito (sin internet no bloquea a nadie) y asíncrona, no bloquea el arranque.
- **Código maestro `GGGG`**: se escribe en el campo de contraseña para resetear el acceso (de propietario o el PIN de un empleado) sin perder datos.

### Sesión

`getAccessSession()` → `{type: 'owner'|'employee', employeeId, area, ts}`.
⚠️ **El campo es `type`, NO `role`.** (Error cometido varias veces.)

- **Gestión (Gestión Económica y Mi Negocio) es exclusiva del propietario.** No hay PIN alternativo — se eliminó a propósito. Un empleado ve `denyGestionAccess()`.
- `requestBusinessPinAction(...)` es un mecanismo **distinto y vigente** para confirmar acciones sensibles (anular venta, borrar empleado…). No confundir con el PIN de Gestión eliminado.

### Varios negocios en un dispositivo (slots)

- Cada negocio = un *slot* con su propia IndexedDB (`slotIdbName(id)`) y su propia licencia (`slotLicenseKey(id)`).
- `DB` y `DB.license` reflejan **solo el slot activo**.
- **Diseño previsto**: entras con tu primera licencia y **desde el botón "Negocios" añades las demás**:
  - `addNewBusiness()` → "Nuevo independiente": negocio aparte, vacío, con su propia nube.
  - `addSucursal(parentId)` → "Abrir sucursal": copia carta/recetas/ingredientes/proveedores/protocolos del padre; **no** copia mesas, empleados ni datos operativos; **hereda la nube del padre**.
  - Ambos requieren **otra licencia** (otra venta).

### Hash de PIN/contraseña

`hashPin(pin, licenseCode)` → formato `H2:` con **8.000 rondas** (encarece la fuerza bruta).
`pinMatchesHash(pin, hash, licenseCode)` verifica **tanto `H2:` como el antiguo `H:`** (compatibilidad — no romper el acceso de negocios ya activos).
⚠️ La sal es el **código de licencia**; al validar el PIN de un empleado de *otro* negocio hay que pasar el código de ESE negocio.

---

## Reglas de Firebase (proyecto `plataforma-gastrogoan`)

Publicadas y verificadas con una reserva real. Copia de referencia en `database.rules.propuesta.json`.

- `issuedCodes/$code`: lectura por cualquiera autenticado, escritura **solo** `gastrogoan@gmail.com`.
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
- **Objetivo táctil mínimo**: 44×44 px.

### Antes de dar algo por terminado

```bash
node -c js/<fichero>.js       # sintaxis
node test/smoke.test.mjs      # cálculos de dinero/IVA, stock, recetas
node test/audit-active.mjs    # regresiones de sincronización
bash build.sh                 # regenerar dist/
```
Luego commit + `git push -u origin <rama>`. Borrar siempre los scripts de prueba temporales.

### Rama

Trabajo en `claude/beautiful-dijkstra-58bru6`. No abrir PR salvo petición explícita.

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

---

## Estado actual (13 ago 2026)

**Veredicto: LISTO PARA VENDER — 9/10.** Análisis completo en `ANALISIS_GENERAL.md` (8 bloques).

Verificado con pruebas reales, no solo revisión de código: concurrencia genuina en reservas (20 simultáneas contra aforo 10), volumen realista (500 clientes / 10.000 ventas), inyección XSS, responsive en 3 idiomas × 5 resoluciones × 18 módulos, y una auditoría ciega por una sesión de IA independiente (7,5/10 antes de corregir su hallazgo del hash débil).

### Pendiente — solo lo puede hacer el dueño

1. Subir `dist/` a gastrogoan.com.
2. Probar el paso de **configurar la nube** como cliente nuevo (único punto donde un cliente puede atascarse).
3. Un pago real con **Redsys** (o su sandbox).
4. Una vuelta desde el móvil, **ya servido desde gastrogoan.com**.
5. *(Recomendado, no urgente)* auditoría de seguridad por un humano externo antes de manejar pagos de forma continuada.

### Limitaciones asumidas conscientemente

- Sesión falsificable desde las devtools (inherente a no tener servidor). El modelo de seguridad asume que el dispositivo del negocio es de confianza, como cualquier TPV offline-first.
- `tenants/$tenantId` sin identidad revocable (ver arriba).
