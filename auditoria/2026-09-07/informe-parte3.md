# Auditoría GastroGoan — parte 3

## Alcance y montaje

Verificación sin fixes, realizada en el orden solicitado. Único archivo añadido al repositorio: este informe. No se editan `js/core.js`, `reservagastrogoan.html` ni las pruebas del repositorio.

Versión: copia aislada de `da9a9720586e5e6d652cc63ab0ad85fcd07406d7`, rama `claude/beautiful-dijkstra-58bru6`. Las líneas de este informe corresponden a esa versión, que incluye los cambios de código de `38fb7e6`. No se audita aquí un despliegue de producción ni posteriores cambios en paralelo.

Se reutiliza Firebase Emulator Suite oficial: CLI 15.29.0, SDK compat 10.14.1, RTDB 4.11.2 y Auth. RTDB en 9010, Auth en 9098; aplicación servida por HTTP en 8964; Chromium 149. Las reglas de plataforma y negocio se cargan y se releen en sus namespaces exactos. Los perfiles/contextos de propietario, empleada y público tienen almacenamiento separado. La red externa se bloquea; únicamente se redirigen el SDK y las peticiones de descubrimiento de Firebase al emulador. No se falsean resultados de transacciones, listeners ni funciones de la aplicación.

El primer negocio/propietario y una empleada son fixtures con la estructura real del repositorio. El fichaje y las operaciones señaladas como UI se ejecutan pulsando sus controles, no llamando a sus funciones de guardado desde la consola. Las lecturas de `DB` y REST sirven para comprobar lo que esos controles han guardado. El montaje no equivale a probar Firebase alojado, latencia WAN ni hardware Apple.

## 1. Entrada y salida de la empleada desde dispositivo nuevo — comprobado

**Resultado:** entrada y salida creadas por la empleada, recibidas en el propietario por Firebase, conservadas tras recarga y visibles en su historial de fichajes.

**Referencias:** `js/core.js:527` (`confirmEmployeeAccess`), `js/hr.js:3777` (`quickFichaje`), `:3909` (`doFichaje`), `:3653` (`openFichajeHistoryModal`); recepción de bloques en `js/core.js:5364`.

**Recorrido ejecutado:**

1. Abrir un contexto nuevo: `login=null`, `license=null`, cero empleados.
2. Acceso Empleados → `Ana Auditoría`, PIN `2468`, negocio `AUD3AAA1`.
3. Esperar el final del splash y cerrar «Entendido» en la bienvenida.
4. Cocina → Personal → Ana → posponer encuesta de clima → Fichar entrada.
5. Esperar a que el propietario reciba la entrada, sin copiarle datos manualmente.
6. Cerrar el resumen de turno, volver a la ficha y pulsar Fichar salida.
7. Comprobar el registro del propietario, RTDB y persistencia tras recargar.
8. En el propietario: Cocina → Personal → Ana → Últimos fichajes. La tabla muestra fecha `2026-09-07`, entrada `23:50`, salida `23:50`, `0h 00m` (la prueba duró dos segundos; el redondeo del historial es coherente).

**Evidencia del registro real:**

```json
{
  "id": 1788825052927342,
  "employeeId": 777,
  "fecha": "2026-09-07",
  "entrada": "2026-09-07T23:50:52.927Z",
  "salida": "2026-09-07T23:50:54.859Z",
  "entradaAuthMethod": "self",
  "salidaAuthMethod": "self"
}
```

El mismo registro aparece en `gastrogoan/tenants/Z7ZLFUSEDBETUENBKKCK/db/fichajes` y en el `DB.fichajes` del propietario tras recargar. No se detecta fallo funcional en este recorrido.

**Incidencias del arnés, sin atribuirlas al producto:** el primer recorrido pulsó antes de que la bienvenida quedara visible y terminó esperando una tarjeta tapada; se corrigió la espera y se cerró el aviso por UI. Otro intento reutilizó el perfil local después de vaciar el emulador, manteniendo cachés de un negocio cuya copia remota se había borrado. La comprobación válida usó perfil de propietario limpio y contexto de empleada nuevo. No hubo dos crashes consecutivos de Chromium en esta tanda: no fue necesario abandonar el punto por el límite técnico fijado por el usuario.

## 2. Espejo público con Firebase emulado

### Reserva creada por el propietario: datos y disponibilidad comprobados

**Referencias:** `js/app.js:3286` / `:3363` (formulario y guardado), `js/core.js:3679` (aforo agregado), `:4830` / `:4831` (publicación del resumen y mesas), `reservagastrogoan.html:1008` (listener), `:1040` (copia de `mesasOcupadas`), `:1340` (aforo), `:1423` (mesa disponible).

Fixture de configuración: dos mesas de dos plazas, aforo cuatro, horario diario 00:00–23:59 construido con `defaultHorario()`. No se siembra la reserva: **Sala → Reservas → Nueva Reserva**, nombre `Reserva Propietario Audit3`, fecha `2026-09-08`, hora 14:00, dos personas, Mesa Uno, Guardar.

La aplicación publica esa reserva en el Firebase del negocio. Otra sesión de navegador abre `reservagastrogoan.html?neg=1mcwqn8`, descubre su nube mediante la plataforma y carga el espejo con el SDK real. Se observa:

| Dato | Propietario / Firebase / web pública |
|---|---|
| Nombre | Auditoría Tres |
| Mesas | Mesa Uno: 2 plazas; Mesa Dos: 2 plazas |
| Ocupación de Mesa Uno | 14:00, 14:15, 14:30, 14:45, 15:00 y 15:15 |
| Aforo a las 14:00 | 4 total, 2 reservadas, 2 disponibles |
| Mesa elegible para otras dos personas | Mesa Dos, ID 2 |
| Calendario, dos personas, 14:00 | Botón habilitado |
| Calendario, tres personas, 14:00 | Botón deshabilitado |

Las dos últimas comprobaciones se hacen por los controles **Semana → 8 de septiembre → Día** y el selector de personas, leyendo el atributo `disabled` del botón real. No se deducen solamente del JSON. La web publica disponibilidad agregada; no muestra el nombre ni los datos privados del cliente de esa reserva.

**Incidencias de preparación:** un primer fixture de horario incompleto carecía de `turnos`, por lo que `migrateHorarioDia` lo interpretaba como formato desconocido. Se descartó ese resultado y se reconstruyó la configuración con el generador real. También se corrigieron únicamente en el arnés los argumentos de `getBestFitTable` y un selector CSS. No se reportan como bugs de la aplicación.

### P3-F01 — no se puede certificar el circuito completo del pedido: espejos divergentes

**Severidad: funcional; el pedido queda sin llegar al negocio en el montaje emulado.**

**Referencias:** `js/core.js:3922` (sonda), `:4002` (fallback), `:3898` (selección del espejo), `:4122` (listener de solicitudes); `reservagastrogoan.html:950` (descubrimiento de nube) y `:3463` (seguimiento).

**Reproducción realizada:** desde la web pública, Take Away → añadir una Croqueta Audit3 de 9 € → nombre `Pedido Propietario Audit3`, teléfono, 8 de septiembre a las 14:00, efectivo, consentimiento → Enviar. Se crea en el Firebase del negocio la solicitud `-P0yI97syYH-1X4P5JMs`, con `type=pedido`, `tipo=takeaway`, `createdAt=2026-09-07T23:55:46.616Z` y `clientRef=rmtrwfb5k1mkr0ped6q2`.

El propietario no recibe el pedido. La web navega al seguimiento y muestra «No encontramos ese pedido». No se llega a aceptar por UI ni a comprobar sus estados posteriores: se detiene esa cadena ante el fallo, sin inventar el pedido dentro de `DB.tpvOrders`.

**Diagnóstico confirmado por lectura:** en el propietario, `espejoEnNubePropia=false`, `reglasAntiguas=true` y `getPublicMirrorApp()` devuelve `platform`. La web, siguiendo `publicLookup`, utiliza `demo-audit-business`, donde quedó la solicitud. El espejo de plataforma contiene información anterior del mismo negocio; el de negocio contiene la reserva y la cola nuevas. Ambos SDK están autenticados; una lectura posterior del `public/info` del negocio desde el SDK del propietario funciona.

**Qué está mal / por qué importa:** al caer la app a plataforma, la guía pública previamente publicada sigue enviando al cliente a la nube del negocio. Quedan dos extremos que no se comunican: el cliente puede enviar sin que el restaurante reciba. La divergencia y el pedido retenido están reproducidos. El motivo inicial exacto del rechazo de la sonda en este emulador no queda aislado; no se afirma que las reglas desplegadas en producción sean incorrectas ni que cualquier arranque real reproduzca ese rechazo.

**Veredicto del punto 2:** reserva/disponibilidad comprobadas; **certificación integral del espejo denegada por este fallo**, no «aprobado». Los errores `PERMISSION_DENIED` de la parte 2 ya no se descartan como irrelevantes: se ha comprobado su consecuencia en el circuito. No se ha aplicado ningún fix ni cambiado el fallback para hacer pasar la prueba.

## 3. Segundo negocio independiente — creación comprobada; conmutación pendiente

**Referencia:** `js/core.js:985`, `addNewBusiness`.

En el primer negocio se crea por UI el cliente `Cliente Aislamiento A`. Su estado previo contiene un empleado, una reserva y un fichaje. Desde Negocios se utiliza la opción de añadir negocio independiente y se canjea `AUD3AAA2`, previamente emitido en la plataforma emulada.

La UI crea el slot `bmtrwo5326fs7`. Antes de configurar sus conexiones se comprueba: `ownFirebase=null`, cero empleados, cero reservas y cero clientes. Este resultado confirma que el alta no heredó la nube ni esos datos del primero. Se rellena después el formulario de nube propia con la configuración dirigida al namespace emulado `demo-audit-business2`, se guarda y se cierran los pasos de configuración/bienvenida.

**Límite técnico:** la primera continuación queda esperando la desaparición del splash; una segunda sesión llega al clic de Sala, pero no consigue continuar a Clientes. En ambos casos el navegador deja también de responder a la lectura diagnóstica. No se atribuye este bloqueo a una función concreta del producto sin evidencia suficiente.

No se consigue guardar `Cliente Aislamiento B`, volver al primer negocio y regresar al segundo. Por tanto, **el aislamiento después de escribir y conmutar por UI no queda certificado**. El estado inicial vacío no sustituye esa prueba. Se interrumpen los reintentos para respetar el límite de consumo solicitado y se pasa a la muestra del punto 4.

## 4. Muestra de cinco funciones excluidas — operaciones reales y recarga

Se eligen las entradas 6, 9, 11, 14 y 34 del inventario de la parte 2: una por archivo. Se utiliza un perfil nuevo, inicializado con una lectura del negocio emulado del punto 1 y sus estructuras reales. La configuración de nube propia se deja vacía en esta copia de prueba; la aplicación puede conectar al fallback de plataforma. **Las comprobaciones de esta muestra certifican únicamente persistencia en el mismo dispositivo tras recargar**, no sincronización entre dispositivos. Hubo errores de permisos del fallback durante la continuación; no se ocultan ni se interpretan como nuevas pruebas de nube aprobadas.

Todas las altas, cambios y borrados descritos se realizan mediante controles de la UI. Las evaluaciones de JavaScript de verificación solo leen los resultados; no guardan los datos en lugar del formulario.

| Archivo y función excluida | Recorrido y evidencia tras recarga | Resultado y límite |
|---|---|---|
| `js/hr.js:3729`, `openEditFichajeModal`; guardado `:3749` | Cocina → Personal → Ana → historial → editar → PIN del negocio `1234` → entrada 09:00 y salida 17:00 → Guardar. El fichaje `1788825052927342` conserva `2026-09-07T09:00:00.000Z` y `2026-09-07T17:00:00.000Z`. | Edición y persistencia comprobadas. El alta real de este registro se probó en el punto 1. Este modal no ofrece borrado del fichaje; no se inventa una acción de borrado. |
| `js/menu.js:906`, `openPlatoModsModal`; alta `:944`, eliminación `:957`, guardado de carta `:423` | Cocina → Carta → carta 80 → extras del plato 82, sección 81 → `Extra Audit3`, 1,50 € → Añadir → cerrar modal → **Guardar carta** → recargar. Se recupera el modificador `1788826146731828` con nombre y precio correctos. Después se pulsa eliminar, se acepta y se vuelve a guardar la carta. | Alta y persistencia comprobadas; borrado no certificado: la comprobación de ausencia tras recargar falla. Véase P3-V02. El modal no ofrece edición directa del extra. |
| `js/app.js:6250`, `openDeliveryPlatformModal`; guardado `:6289`, eliminación `:6318` | Gestión → Mi Negocio → añadir plataforma → `Plataforma Audit3`, comisión 25 %, IVA 21 % → guardar y recargar. Editar comisión a 20 % → guardar y recargar. Eliminar → aceptar → recargar. | Alta, edición y borrado comprobados. ID `1788826156276496`; comisión guardada 25 → 20; ausencia final confirmada. |
| `js/finance.js:1163`, `onIngredientCategoryChange`; confirmación `:1278`, guardado `:1295` | Cocina → Mega Lista → Nuevo Ingrediente. Ante «Necesitas un proveedor», Nuevo Proveedor → `Proveedor Audit3`, teléfono y email → guardar. Nuevo Ingrediente → `Ingrediente Audit3` → categoría nueva `Categoría Audit3` → confirmar → cantidad 2, precio del paquete 8 → guardar y recargar. Abrir su carpeta, editar precio a 10 y volver a guardar/recargar. | Categoría e ingrediente persistentes; ID `1788826304833181`, proveedor correcto, precio unitario 4 → 5. El resultado del borrado se detalla debajo. |
| `js/tpv.js:3748`, `openLineNotesModal`; guardado `:3778` | Sala → TPV → mesa 2 → abrir cuenta para 2 → Entrantes → Croqueta Audit3 → añadir → notas `Sin sal Audit3` → guardar/recargar. Reabrir cuenta → cambiar a `Poca sal Audit3` → guardar/recargar. Reabrir → vaciar notas → guardar/recargar. | Cuenta `1788826200768582` y nota creadas y persistentes; edición y eliminación del contenido de la nota comprobadas. No se borra la cuenta ni se cobra: esta muestra es el flujo de notas de línea. |

### P3-V02 — comprobación pendiente del borrado de un extra de carta

**Clasificación:** incidencia de verificación; posible problema funcional, causa no aislada. No se presenta como defecto confirmado del código ni como mejora cosmética.

**Referencias:** `js/menu.js:957` (`removePlatoMod`), `:423` (`saveCarta`) y `js/core.js:7026` (`saveDB`).

**Reproducción ejecutada:** crear y guardar el extra anterior → recargar → abrir carta y extras → eliminar → aceptar confirmación → cerrar modal → guardar carta → recargar. La lectura de `modificadores` sigue detectando `Extra Audit3`, por lo que no se aprueba el borrado persistente. El alta sí había quedado comprobada antes de eliminar.

**Importancia:** si se reproduce en un dispositivo con sincronización controlada, un extra que el restaurante retira podría seguir disponible. En esta ejecución coinciden errores de permisos/sincronización del fallback; no se ha distinguido todavía entre guardado local, reaplicación remota u otra interferencia. Se requiere aislar esos factores antes de decidir un fix.

**Correcciones del arnés, no bugs de producto:** la primera lectura buscó por error `mods`, cuando el campo real es `modificadores`. Se corrigió la lectura y se confirmó el alta sin volver a insertarla. Mega Lista bloqueó correctamente el alta sin proveedor y explicó el requisito. La primera automatización del borrado del ingrediente esperó un PIN, pero un propietario recibe un diálogo de confirmación (`js/tpv.js:1379`); ese timeout tampoco demuestra un fallo del producto.

**Cierre de Mega Lista:** reabrir `Categoría Audit3` → eliminar `Ingrediente Audit3` → aceptar la confirmación de propietario → recargar. Se confirma la ausencia del ingrediente (`deletedIngredient=true`). La categoría permanece en `DB.ingredientCategories`; no se ha ejecutado su eliminación. Así queda comprobado el CRUD del ingrediente asociado al modal de categoría, sin atribuirle un borrado de categoría no realizado.

Una última lectura independiente confirma que el extra de carta sigue presente con el mismo ID y precio después del intento de borrado; P3-V02 permanece abierto.

## Estado final y pendientes explícitos

| Prioridad | Resultado final |
|---|---|
| 1. Fichar desde dispositivo nuevo y recibir en propietario | **Comprobado** en Firebase Emulator: entrada, salida, recepción, recarga e historial visible. |
| 2. Espejo público | **Parcial y con fallo funcional reproducido:** reserva, ocupación y restricción de plazas comprobadas; pedido retenido en un espejo distinto del que escucha el propietario. No se certifican recepción ni cambios posteriores de estado. |
| 3. Segundo independiente y conmutación | **Parcial:** alta independiente vacía y configuración por UI realizadas. Pendientes cliente B, ida/vuelta por selector y aislamiento después de escribir. Dos continuaciones bloqueadas; no se siguen repitiendo. |
| 4. Cinco muestras de los 39 saltos | **Cinco muestras guardadas y recuperadas tras recarga.** Edición de fichaje, CRUD de plataforma e ingrediente, y creación/edición/vaciado de notas comprobados. Extra de carta: alta comprobada y borrado sin certificar. No se afirma que los 39 flujos estén cubiertos ni que las cinco muestras certifiquen todos los CRUD posibles. |

Se cierra esta pasada para contener el consumo solicitado. **No están completados íntegramente los cuatro puntos**: quedan las comprobaciones indicadas en 2 y 3 y el aislamiento del resultado P3-V02. No se dispone de visibilidad del saldo de créditos para afirmar cuánto queda. No se han aplicado fixes, realizado commits ni efectuado pushes en esta pasada.
