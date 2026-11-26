# Pedido en grupo en la mesa (QR): diseño

Estado: **propuesta de diseño, nada implementado** (26/11/2026). Solo se ha leído código; no se ha tocado ningún fichero de la app.
Alcance fijado por el dueño el 26/11: **solo mesa, entrando por el QR de mesa** (`mesaQr/{token}`). Varias personas de una mesa piden desde su móvil sobre UNA cuenta compartida y **cada una paga sus líneas con tarjeta**, para que el camarero no tenga que dividir la cuenta.

Fuentes del código leído: `js/core.js` (`recibirPedidoMesaQr`, `aplicarPagoPedidoMesaQr`, `recibirPagoMesaQr`, `aplicarPagoMesaQr`, `cerrarMesaPagadaQr`, `cuentaMesaQr`, `cuentaPublicaMesa`, `publicarMesasQr`, `revisarPreciosPedidoPublico`, `esperarPagoTarjeta`/`comprobarPagosTarjeta`/`aplicarPagoConfirmado`, `FIREBASE_RULES_JSON`, la sonda de reglas), `js/tpv.js` (`orderAmountPaidOnline`), `js/tpv-sala.js` (`renderQrMesaPendientes`), `reservagastrogoan.html` (`renderMesaQrForm`, `submitMesaQrOrder`, `payWithCard`, `pushSolicitud`, `cifrarSolicitud`), `worker/pagos-worker.js` (`handlePagar`, `handleWebhook`, `registrarPago`), `reglas/reglas-de-cada-negocio.json`, `test/reglas.mjs`.

---

## 0. Resumen en diez líneas

1. **Mucho de lo difícil ya está hecho.** Hoy un comensal ya puede pedir por QR y pagar SU pedido con tarjeta (`pagoAlPedir`), y la línea queda `pagadoOnline` con `pagadorNombre`. Lo que NO existe es que los demás lo vean, que un plato se comparta, que cada uno pague su parte AL FINAL (no al pedir) y que la mesa sepa que está en «modo grupo».
2. **Stripe no necesita nada nuevo.** Cada comensal paga con su propia sesión de Checkout por el importe de sus líneas: es exactamente lo que ya hace `/stripe/pagar` (importe libre entre 0,50 y 3.000 €). No hacen falta PaymentIntents parciales ni nada específico de Connect v2.
3. **El carrito compartido son BORRADORES.** Lo que entra en cocina y en la cuenta sigue entrando por el mismo buzón `requests` (`pedido_mesa`), con los precios recalculados por la app. El estado compartido solo sirve para verse unos a otros; no es fuente de verdad de dinero.
4. **Estado compartido en la nube del negocio**: un nodo nuevo `public/{publicId}/mesaGrupo/{token}`, con **huecos fijos** (`m0…m11`) por comensal; cada móvil solo escribe en el suyo, identificado por su `auth.uid` anónimo de Firebase. Sin cuentas.
5. **Conexiones**: la web pública ya mantiene un socket por pestaña para `mesaQr`. Añadir otro oyente al mismo SDK **no abre otra conexión**. El riesgo real es que en una mesa de 6 ahora conecten los 6 (no solo el que pide), y el plan gratuito aguanta 100 a la vez.
6. **Reglas nuevas necesarias** (nodo `mesaGrupo` + `uid` en `requests`) en las tres copias. Son **aditivas**: ningún negocio existente se rompe; sin ellas, el grupo no se ofrece y todo sigue como pedido normal.
7. **Hallazgo importante**: hoy, si lo pagado cubre lo pedido, la mesa **se cobra y cierra sola** (`aplicarPagoMesaQr` → `cerrarMesaPagadaQr`). En grupo eso cerraría la mesa cuando Ana paga lo suyo y Bruno aún no ha pedido. Hay que apagar ese cierre automático en modo grupo.
8. **Coste que el dueño del restaurante debe conocer**: cada pago es una comisión con parte fija. Dividir una cuenta de 90 € entre 6 puede costar ~1,25 € más que cobrarla de una vez (cuenta hecha con la tarifa que ya usa la app, ver §4.7). Es del restaurante, no de GastroGoan.
9. **Estimación**: Fase 1 (carrito compartido) 6-8 jornadas; Fase 2 (pago repartido) 7-10; Fase 3 opcional 3-4. ±40 %.
10. **Decisiones del dueño** en §8. La más importante: ¿se paga al pedir (ya existe), al final (la meta), o las dos?

---

## 1. Qué hay ya y qué falta

### 1.1 Reutilizable tal cual

| Pieza | Dónde | Qué aporta |
|---|---|---|
| Token de mesa, alias, rotación | `nuevoTokenMesaQr`, `mesaPorTokenQr`, `qrAlias` | La «habitación» del grupo ya existe: el token del QR. |
| Recepción de un pedido y recálculo de precios | `recibirPedidoMesaQr` + `revisarPreciosPedidoPublico(items,'mesa')` | Los precios NUNCA los pone el navegador. Se reutiliza sin cambios. |
| Pedido que espera pago | `estado:'esperando-pago'`, `totalEsperado`, `aplicarPagoPedidoMesaQr` | Modo «pago al pedir» ya funciona por persona. |
| Pago anunciado y confirmado | `pago_mesa` → `recibirPagoMesaQr` → `esperarPagoTarjeta` → `aplicarPagoMesaQr` | Pago parcial que no cierra la mesa, sobrante a «Pagos sin pedido», descuadres. Se amplía con el comensal. |
| Confirmación de Stripe por pregunta | `comprobarPagosTarjeta` (REST cada 20 s, 15 refs por ciclo) | Sin sockets. Cada pago de cada comensal es una referencia más. |
| Líneas pagadas | `pagadoOnline`, `pagadorNombre`, `orderAmountPaidOnline` | El cobro de caja ya descuenta lo pagado por móvil. |
| Cuenta publicada | `cuentaPublicaMesa` → `mesaQr/{token}` | Hay que añadirle el desglose por comensal. |
| Cifrado de datos personales | `cifrarSolicitud` (RSA-OAEP + AES-GCM) | Nombres y tokens ya viajan cifrados por el buzón. |
| Worker de pagos | `/stripe/pagar`, webhook, `registrarPago` en `pagos/{publicId}/{ref}` | Sin cambios de fondo (ver §4.6). |
| Sonda de reglas + asistente «Actualizar mis reglas» | `comprobarEspejoEnNubePropia`, `REGLAS_PASOS` | Mecanismo de aviso y degradación ya existente. |
| Reparto en céntimos que suma exacto | `distEnteros` (método del mayor resto, js/hr.js) | Misma técnica para repartir un plato compartido. |

### 1.2 Lo que falta

1. **Identidad de comensal sin cuentas** y su hueco en la mesa (§2.2).
2. **Nodo compartido** y reglas que impidan escribir en el hueco ajeno (§2.1, §3).
3. **Propiedad de cada línea** (`comensal`) y **platos compartidos** (`reparto`).
4. **Cuenta por comensal calculada por la app** (`cuentaPorComensal`) y publicada.
5. **Modo grupo de la mesa** (`order.grupo`) que apaga el cierre automático.
6. **Pago «mi parte»** anunciado con el comensal, con su propina.
7. **Vista del camarero**: quién debe qué y cuánto ha pagado cada uno (hoy solo ve el total pagado).
8. **Aviso y degradación** de reglas (§3.3).
9. **Textos es/ca/en** (`grupo.*`) y pruebas (§6).

---

## 2. Modelo de datos y estado compartido

### 2.1 Dónde vive el carrito de grupo

En la **nube del negocio** (la misma que ya recibe `requests` y `mesaQr`; nunca la plataforma compartida):

```
gastrogoan/public/{publicId}/
  mesaQr/{token}                      <- ya existe; lo escribe la app
      mesa, updatedAt, abierta, lineas, total, pagado, pendiente, enCurso   (ya)
      grupo: true                     <- NUEVO: la app lo pone si el negocio activó el grupo Y la sonda pasó
      comensales/{slot}: {debe, pagado, enCurso}   <- NUEVO: lo calcula y publica la APP (importes verificados)
  mesaGrupo/{token}                   <- NUEVO, escribe cada móvil en lo suyo
      miembros/{slot}: {uid, n, ts}            slot = m0..m11 (12 comensales máx.)
      carritos/{slot}/{linea}: {p, q, m?, r?}  linea = l0..l29 (30 líneas máx. por persona)
```

- **No hay ningún precio en el nodo compartido.** Cada línea guarda `p` (id de plato de la carta), `q` (1-20), `m` (ids de extras) y `r` (con quién se comparte, p. ej. `"m0,m2"`). El precio de cada móvil se calcula contra la carta que ya tiene cargada; el que cuenta lo recalcula la app al recibir el pedido. Un nodo compartido sin dinero no se puede «manipular» para pagar menos.
- **Los borradores solo sirven para verse.** Ni cocina ni la cuenta leen `mesaGrupo`. Un comensal pulsa «Enviar mi pedido» y sale un `pedido_mesa` normal (mismo buzón, mismo cifrado, mismo recálculo). Resultado: **la tablet NO necesita ningún oyente nuevo** y no suma conexiones.
- **Huecos fijos en vez de claves libres** (`m0…m11`, `l0…l29`): las reglas de Firebase no pueden contar hijos, pero sí validar el NOMBRE de la clave con una expresión regular. Así el tamaño máximo del nodo queda acotado (12 × 30 líneas) sin Cloud Functions.
- **Limpieza**: `publicarMesasQr` ya borra `mesaQr/{token}` cuando la mesa cierra o se rota el token; se amplía para borrar también `mesaGrupo/{token}`. Un nodo huérfano mide pocos KB; no es un problema de coste.

### 2.2 Cómo se identifica a cada comensal sin cuentas

- Al entrar por el QR con grupo activo, la web hace `signInAnonymously` (ya lo hace: es lo que permite escribir en `requests`) y **reclama el primer hueco libre** `miembros/m{n}` con `{uid: auth.uid, n: nombre, ts}`. La regla solo deja crear un hueco libre y solo deja tocarlo a su dueño (`data.child('uid').val() === auth.uid`).
- El hueco se recuerda en `localStorage` (clave por token) para reanudar al recargar. El `uid` anónimo vive en IndexedDB del navegador: sobrevive a recargas y a cerrar la pestaña.
- **Si pierde el `uid`** (otro navegador, borrado de datos, modo privado): reclama un hueco nuevo. Sus líneas antiguas quedan en un hueco «huérfano» que el camarero puede reasignar o cobrar en caja. **No hay «soy yo otra vez»** por nombre: sería la puerta para suplantar. Se asume y se documenta.
- Verificación en el servidor (la app): el `pedido_mesa` y el `pago_mesa` llevan `uid` y `slot` EN CLARO (son opacos, no personales) y **las reglas de `requests` exigen `newData.child('uid').val() === auth.uid`** cuando el campo existe. La app resuelve `slot → uid` leyendo `miembros/{slot}/uid` UNA vez (con su SDK ya conectado, `once('value')`) y rechaza si no coincide. Así nadie pide ni paga «como» otro hueco.
- **Nombre**: lo escribe el propio comensal (≤ 30 car., escapado siempre con `escapeHtml`). Los nombres de `miembros` son legibles por quien tenga el token; es el mismo nivel de exposición que el nombre del pedido hoy, pero en claro. Se avisa en el texto de privacidad y se recomienda poner solo el nombre de pila. (Alternativa: cifrar con la clave pública del negocio; implica que los demás móviles no podrían leerlos. Descartada: el sentido es que se vean entre ellos.)

### 2.3 Cómo ve cada móvil lo que añaden los demás

Hay dos mecanismos y la elección es el punto delicado por el **límite de 100 conexiones simultáneas del plan gratuito** (Firebase, «Limits»: *«The Spark plan limit on simultaneous connections is 100»*; una conexión es *«one connected mobile device, browser tab, or server app»*; consultado el 26/11 en firebase.google.com/docs/database/usage/limits).

**Cuenta honesta de conexiones**
- Hoy, quien abre el QR ya tiene un socket (`engancharCuentaMesaQr` usa `db.ref(...).on('value')`). Añadir `mesaGrupo/{token}` al mismo SDK **no abre otro**: el SDK multiplexa en un solo websocket por pestaña.
- Lo que cambia es **cuánta gente conecta**: sin grupo, normalmente 1 móvil por mesa; con grupo, los 4-8 de la mesa. Un local con 20 mesas ocupadas × 5 móviles = 100, más tablets y el móvil del dueño: **se alcanza el techo un viernes**. El límite es por negocio (cada uno tiene su proyecto), no crece con las licencias: no vulnera la regla de oro, pero es una limitación real de un negocio grande en el plan gratuito.

**Socket frente a consulta periódica**

| | Socket (SDK `.on`) | REST con consulta cada N s |
|---|---|---|
| Conexiones | 1 por pestaña, mientras esté abierta | 0 (cada petición es suelta) *(no verificado en esta sesión que cuente 0 con `?auth=`; es lo que ya asume el proyecto para `consultarPlataforma`)* |
| Latencia | casi inmediata | de N segundos |
| Datos descargados | solo los cambios | el nodo entero en cada consulta |
| Detalle | — | las lecturas del negocio exigen `auth != null`: hace falta un ID token anónimo (`getIdToken()` + `?auth=`), o sea seguir usando el SDK de Auth (HTTPS, sin socket de base de datos) |

Cuenta de datos de la consulta periódica (estimación mía, sin medir): un nodo de ~2 KB × una consulta cada 5 s × 6 comensales × 90 min ≈ 13 MB por mesa y servicio; con 20 mesas y 30 servicios al mes ≈ 8 GB descargados. El plan gratuito de Realtime Database tiene un tope mensual de descarga que **no he podido verificar en esta sesión** (la página de límites consultada no lo lista); hay que mirarlo en la página de precios de Firebase antes de elegir. El socket envía solo diferencias y sale mucho más barato en datos. Se puede reducir mucho con `If-None-Match`/ETag en REST *(no verificado)*.

**Recomendación (híbrido, por orden):**
1. **Socket por defecto**, pero **solo mientras la pantalla de grupo esté visible y haya actividad**: al pasar a segundo plano (`visibilitychange`) o a los 3 minutos sin tocar, `goOffline()`; al volver, `goOnline()` y se repinta. Un móvil con la pantalla bloqueada no ocupa conexión.
2. **Tras pagar su parte y confirmarse**, el comensal se desconecta del grupo.
3. **Respaldo**: si `.info/connected` no pasa a `true` en ~8 s (señal de techo alcanzado o red mala), la web cambia a consulta REST cada 6-8 s con un mensaje «actualizando cada pocos segundos».
4. **Tope duro configurable** por el negocio (por defecto 12 comensales por mesa, `m0…m11`), y un aviso en Mi Negocio explicando que el plan gratuito aguanta ~100 móviles simultáneos.
5. **No se crea ningún oyente nuevo en la app**: ella ya está conectada a su nube y solo lee `miembros` puntualmente.

### 2.4 Cuenta por comensal (la calcula la app, no el navegador)

`cuentaPorComensal(order)` (nueva, en `js/core.js` junto a `cuentaMesaQr`):
- Cada línea del pedido lleva `comensal` (slot de quien la envió) y, si se comparte, `reparto: ['m0','m2']`.
- **Importe de una línea** = `price × qty`. Se reparte en céntimos con el método del mayor resto (como `distEnteros`) entre su reparto (por defecto, solo su dueño), orden estable por slot, para que **la suma de lo que debe cada uno sea exactamente el total de la línea**.
- **Descuento de la mesa** (`order.descuentoPct`): se aplica a cada parte proporcionalmente y se vuelve a cuadrar a céntimos, igual que `cuentaMesaQr`.
- **Líneas sin dueño** (las añade el camarero, o un hueco huérfano): se quedan en `restoMesa` y las cobra el camarero en caja, salvo que el negocio elija «repartir lo común a partes iguales entre los presentes» (decisión §8).
- **Pagado por comensal** = suma de sus pagos confirmados (`pagosMesaQr[].slot`). `debe = suyo − pagado`.
- Se publica en `mesaQr/{token}/comensales/{slot}` = `{debe, pagado, enCurso}` solo si cambió (la firma ya se compara en `publicarMesasQr`). Los móviles **leen su importe de ahí**: nunca lo calculan ellos.

---

## 3. Reglas de Firebase

### 3.1 Cambios (aditivos)

1. **`mesaGrupo`** (dentro de `public/$publicId`), esquema:

```json
"mesaGrupo": {
  "$token": {
    ".read": "auth != null && $publicId.length >= 4 && $publicId.length <= 30 && $token.length >= 16 && $token.length <= 64 && root.child('gastrogoan/public/'+$publicId+'/mesaQr/'+$token+'/grupo').val() === true",
    "miembros": {
      "$slot": {
        ".write": "auth != null && $publicId.length >= 4 && $publicId.length <= 30 && $token.length >= 16 && $token.length <= 64 && root.child('gastrogoan/public/'+$publicId+'/mesaQr/'+$token+'/grupo').val() === true && (!data.exists() || data.child('uid').val() === auth.uid)",
        ".validate": "$slot.matches(/^m([0-9]|1[01])$/) && newData.hasChildren(['uid','n','ts']) && newData.child('uid').val() === auth.uid && newData.child('n').isString() && newData.child('n').val().length <= 30 && newData.child('ts').isNumber()"
      }
    },
    "carritos": {
      "$slot": {
        ".write": "auth != null && $publicId.length >= 4 && $publicId.length <= 30 && $token.length >= 16 && $token.length <= 64 && root.child('gastrogoan/public/'+$publicId+'/mesaQr/'+$token+'/grupo').val() === true && root.child('gastrogoan/public/'+$publicId+'/mesaGrupo/'+$token+'/miembros/'+$slot+'/uid').val() === auth.uid",
        "$linea": {
          ".validate": "$linea.matches(/^l([0-9]|[12][0-9])$/) && newData.hasChildren(['p','q']) && newData.child('p').isString() && newData.child('p').val().length <= 60 && newData.child('q').isNumber() && newData.child('q').val() >= 1 && newData.child('q').val() <= 20"
        }
      }
    }
  }
}
```
(Es un borrador: hay que probarlo en el emulador antes de darlo por bueno; la sintaxis de `matches` y la jerarquía de `.write` hacia abajo son comportamientos que conviene comprobar, no suponer.)

2. **`requests/$requestId`**: añadir al `.validate` existente `&& (!newData.child('uid').exists() || newData.child('uid').val() === auth.uid)`. Impide que una solicitud diga ser de otro `uid`. **No** se añade `pago_confirmado` (la prueba `test/reglas.mjs` lo prohíbe y es lo correcto).
3. **Sin cambios** en `mesaQr` ni en `info`. Los tipos `pedido_mesa` y `pago_mesa` ya están permitidos.
4. **Las tres copias idénticas**: `FIREBASE_RULES_JSON` (js/core.js), `reglas/reglas-de-cada-negocio.json` y `reglas/reglas-de-la-plataforma.json` (esta última sigue la misma rama `public`). `test/reglas.mjs` debe ampliarse para comprobar que las tres llevan `mesaGrupo` y la condición de `uid`. Además, la lista `TIPOS` no cambia.
5. La sonda (`comprobarEspejoEnNubePropia`) añade, **solo si el grupo está activado**, un paso «mesaGrupo»: escribe `mesaQr/_sonda_…/grupo=true`, un `miembros/m0` y un `carritos/m0/l0`, y los borra. Si falla por permiso → `reglasGrupo=false` (indicador APARTE de `reglasAntiguas`, para no dar el aviso rojo de «reglas antiguas» a quien solo no usa el grupo).

### 3.2 Límite estructural que hay que asumir por escrito

La app del negocio y los comensales **son la misma clase de usuario para las reglas** (sesión anónima). Por eso las reglas no pueden distinguir «escribe la tablet» de «escribe un comensal». Consecuencias ya existentes y que el grupo hereda:
- Quien tenga el token puede reescribir `mesaQr/{token}` (p. ej. dejar `grupo:false` o un `pendiente` falso). Hoy ya es así. Efecto: cosmético y pasajero (la app lo republica al cambiar la cuenta); **ni el dinero ni la cocina dependen de ello**, porque se decide en la app con lo que confirma Stripe y con precios de la carta.
- La única forma de separar app de comensal sería una identidad de administrador del negocio (custom claims), que exige Cloud Functions/plan de pago y está descartada (CLAUDE.md, «Limitación conocida»). Se documenta; no se resuelve.
- Mitigación barata, opcional: que la app republique `mesaQr/{token}` si detecta que cambió algo que ella no escribió.

### 3.3 Coste para los negocios ya dados de alta y degradación

- **Nadie tiene que hacer nada** para seguir como hoy. El grupo es una opción de Mi Negocio → QR auto pedido («Pedido en grupo»), **apagada por defecto**.
- Para activarlo: se necesitan las reglas nuevas. La casilla se muestra con aviso ámbar «Necesita actualizar las reglas de tu nube» y el botón abre el asistente existente (`REGLAS_PASOS`: portada de Firebase, qué cuenta/proyecto, comprobación automática). La sonda confirma y solo entonces la app publica `grupo:true` y `info.business.qrMesa.grupoListo`.
- **Degradación a «pedido normal»**: la web solo ofrece el modo grupo si `grupoListo` está publicado Y `mesaQr/{token}.grupo === true`. Si falta cualquiera, sale la pantalla de siempre (un pedido, individual). Una web antigua en el móvil de un comensal no conoce `mesaGrupo`: funciona como pedido normal.
- **Solo en nube propia**: el grupo se ofrece únicamente si `espejoEnNubePropia === true`. Un negocio que sigue en la plataforma compartida de respaldo **no** puede activarlo (cargaría de sockets el proyecto compartido, justo lo que se evita). Las reglas de la plataforma llevan igualmente la rama, por la regla de las tres copias idénticas.
- Texto de aviso en los tres idiomas, sin culpar al hostelero: «Esto necesita un paso más en tu Firebase (2 minutos).»

---

## 4. Flujo de pago repartido

### 4.1 Dos modos (decisión del dueño, §8)

- **Modo A, «pago al pedir»** (ya existe): cada uno paga lo que pide al enviarlo. El grupo aporta solo ver lo de los demás. Casi no hay trabajo de dinero nuevo.
- **Modo B, «cada uno paga su parte al final»** (la meta de camarero sin dividir): se pide sin pagar, se cena, y cada uno pulsa «Pagar mi parte». Aquí está el diseño nuevo.
- Con ambos activos, cada comensal elige (como hoy con `qrMesaHayEleccion`).

### 4.2 «Pagar mi parte» (Modo B), paso a paso

1. La web lee `mesaQr/{token}/comensales/{mi slot}.debe`. Si es 0, no hay botón.
2. El comensal ve el desglose de SUS líneas (y la fracción de las compartidas), elige propina (0/5/10/«otra», sobre su parte) y pulsa **Pagar**.
3. La web crea `clientRef` único, llama a `/stripe/pagar` con `amount = debe + propina` y descripción «Mesa N · Ana», y **antes de salir a Stripe** anuncia un `pago_mesa` con `{mesaToken, clientRef, importe, uid, slot, propina}` (mismo buzón cifrado).
4. La app (`recibirPagoMesaQr`) comprueba `uid ↔ slot`, apunta el pago en `order.pagosMesaQrPendientes` (con slot) y `esperarPagoTarjeta(ref, importe)`.
5. Stripe → Worker (firma verificada) → `pagos/{publicId}/{ref}` → la app PREGUNTA (`comprobarPagosTarjeta`) → `aplicarPagoMesaQr`.
6. `aplicarPagoMesaQr` suma `min(confirmado − propina, debe_del_slot)` a `pagosMesaQr` con `slot`, la propina a `propinaPagadaOnline`, y devuelve el sobrante (si lo hay) a «Pagos sin pedido». Se republica `comensales/{slot}` (`pagado` sube, `debe` baja).
7. Al volver de Stripe (`&pago=ok`), el móvil muestra «Pagado ✓» cuando `comensales/{slot}.pagado` lo refleja (lo confirma la app, no la URL de retorno).

### 4.3 El importe lo fija la app, no el navegador

- La web no calcula nada: lee `debe` publicado por la app. Si un comensal manda a Stripe un importe distinto, **no se aplica más de `debe`** al hueco y no se da nada por pagado de más: lo que sobre va a «Pagos sin pedido»; si paga **de menos**, `aplicarPagoMesaQr` ya registra el descuadre y solo suma lo realmente cobrado (la deuda sigue en `debe`).
- Los precios de líneas nuevas siguen pasando por `revisarPreciosPedidoPublico` al entrar el `pedido_mesa`. Lo guardado en `mesaGrupo` no tiene precios.
- El Worker sigue sin conocer la mesa: no puede ni debe comprobar el importe (no tiene la carta). La defensa es la de siempre: **la app compara lo que Stripe confirma con lo que debe**.

### 4.4 Casos

| Caso | Qué pasa |
|---|---|
| **Uno no paga** | Su `debe` sigue pendiente. La mesa NO se cierra sola. El camarero ve «Pedro: debe 12,40 €» y cobra el resto en caja (el cobro ya descuenta lo pagado online: `orderAmountPaidOnline`). Opcional (Fase 3): botón «Cubrir a Pedro» en el móvil de otro comensal. |
| **Paga de menos** | Se aplica lo cobrado, `debe` queda con la diferencia, aviso en TPV («Descuadre»). El móvil muestra «Falta 3,00 €». |
| **Paga de más** | Se aplica hasta `debe`; el sobrante va a «Pagos sin pedido» para devolver (nunca se convierte en propina por su cuenta, regla vigente). |
| **Se va sin pagar** | Igual que «no paga». El camarero conserva la mesa abierta hasta cobrar. Es lo mismo que hoy, no peor. |
| **Pide más después de pagar** | Su `debe` vuelve a subir (se recalcula). Puede pagar otra vez. |
| **Plato compartido** | `reparto` entre varios; si uno se baja del reparto antes de enviar, se recalcula (los 3 céntimos de redondeo van al primer slot del orden estable). Una línea ya enviada y repartida solo la edita el camarero. |
| **Propina** | Por pago, sobre la parte del que paga, tope sugerido 50 % del importe (más es probable error de tecleo). Se suma a `propinaPagadaOnline`. No se reparte entre camareros: eso ya lo decide el negocio. |
| **Cierre** | En modo grupo, `aplicarPagoMesaQr` **no llama a `cerrarMesaPagadaQr`**. La mesa se cierra cuando el camarero pulsa «Cerrar mesa» (botón visible solo si `pendiente ≤ 0,01`) o, si el negocio lo elige, cuando está todo pagado Y todos los miembros han marcado «Hemos terminado». Evita cerrar la mesa cuando Ana paga lo suyo y Bruno aún no ha pedido. |
| **Cobrar en caja con grupo** | `orderAmountPaidOnline` ya descuenta `pagosMesaQr`; el TPV muestra además el desglose por comensal (nuevo). |
| **Anulación de una línea** | Baja el `debe` de su dueño. Si ya había pagado de más, el exceso va a «Pagos sin pedido» (devolver a mano). |
| **Devoluciones** | Hoy son **manuales** (el dueño devuelve desde su panel de Stripe; la app lo apunta en «Pagos sin pedido»). Fase 3 opcional: `/stripe/reembolsar` en el Worker protegido con `esDuenoDelNegocio` (ya existe). **No verificado** que Stripe devuelva la comisión en un reembolso de cobro directo: hay que leerlo en la documentación de reembolsos de Connect antes de prometérselo al hostelero. |

### 4.5 Pagos duplicados

- Cada intento = un `clientRef` nuevo. Si el comensal pulsa dos veces, se crean dos sesiones. Defensas: botón desactivado mientras haya un pago en curso en `localStorage` y mientras `comensales/{slot}.enCurso > 0`; la app anota `enCurso` por slot al recibir el `pago_mesa`.
- **Caducidad de la sesión de Checkout**: el Worker debe poner `expires_at` corto (30 min). Stripe permite *«anywhere from 30 minutes to 24 hours after Checkout Session creation»*, y por defecto son 24 h (docs.stripe.com/api/checkout/sessions/create, consultado el 26/11). Sin esto, una pestaña abierta de Stripe se podría pagar horas después con un importe ya obsoleto. Cambio mínimo en `handlePagar`: parámetro opcional `expiraMin` (acotado a 30-120) → `expires_at`.
- Un segundo pago que ya no tiene deuda a la que aplicarse cae en «Pagos sin pedido»: nada se pierde, hay que devolverlo a mano.

### 4.6 Qué cambia en Stripe/Worker

Casi nada, y es la parte buena:
- **Sin PaymentIntents parciales**: cada comensal es un cobro independiente (una sesión de Checkout por importe), que es lo que ya funciona en producción con cuenta Connect y cabecera `Stripe-Account`. No hace falta nada específico de Accounts v2 más allá de lo que ya se usa.
- `expires_at` (arriba) y, opcional, `metadata.slot` para facilitar el rastreo.
- El webhook y `registrarPago` no cambian.
- `client_reference_id` admite hasta 200 caracteres (docs); `claveRefPago` ya recorta a 120.

### 4.7 Coste de comisiones (decisión de negocio, no técnica)

La app estima la comisión de Stripe como 1,5 % + 0,25 € (`STRIPE_TARIFA_PCT/FIJA`). Con esa tarifa:
- 1 pago de 90 € → 1,35 + 0,25 = **1,60 €**.
- 6 pagos de 15 € → 6 × (0,225 + 0,25) = **2,85 €** (≈ 1,25 € más).
- Pagos pequeños pesan mucho: uno de 4 € cuesta ≈ 0,31 € (casi el 8 %).

Medidas: importe mínimo por pago configurable (sugerido 5 €; por debajo el comensal «se agrupa» con otro o paga en caja) y mostrarle al hostelero esta cuenta al activar el modo B. Cada comisión sigue apuntándose sola como gasto (`apuntarComisionPagoOnline`, por referencia). **Cero coste para GastroGoan**: todo corre en el navegador, la nube del negocio y la cuenta Stripe del restaurante.

---

## 5. Ataques y abusos

| Amenaza | Mitigación |
|---|---|
| **Ajeno entra al grupo** (conoce el token: foto del QR, mesa de al lado) | Mismo nivel de confianza que hoy: el QR es la llave física. Defensas: máx. 12 huecos; el camarero ve la lista de miembros y puede **echar a un hueco** (la app borra `miembros/{slot}` y el hueco queda «bloqueado» con un marcador); opción «Pedir contraseña de mesa» (4 dígitos que muestra el camarero en la comanda; el primero la teclea y las reglas no la ven: se comprueba en la app al recibir el primer `pedido_mesa`, y sin ella el pedido va a «pendiente de camarero»). Un ajeno solo puede ensuciar borradores, **no cargar cuenta**: lo que entra a cocina/cuenta exige que la app acepte el `pedido_mesa` (ver siguiente). |
| **Pedidos de un ajeno a la cuenta de la mesa** | Hoy se acepta cualquier `pedido_mesa` con token válido (`aceptaCamarero` por defecto lo pasa por el camarero). En modo grupo **se recomienda forzar la revisión del camarero para el primer pedido de un hueco nuevo**, y el TPV muestra el nombre del hueco. |
| **Manipular importes** | No hay importes en el nodo compartido; precios recalculados con la carta en `recibirPedidoMesaQr`; `debe` lo publica la app; el pago se aplica con el importe que confirma Stripe, con tope en `debe`. |
| **Declararse pagado** | Imposible por el buzón (`pago_confirmado` prohibido por las reglas y por `test/reglas.mjs`). Solo cuenta lo que deja el Worker en `pagos/{publicId}/{ref}`. |
| **Suplantar a otro hueco** | `uid` obligatorio en `requests` y comprobado contra `miembros/{slot}/uid` en la app; reglas impiden escribir en un hueco que no es tuyo. |
| **Doble pago / pago de un importe viejo** | Sesión que caduca a 30 min; `enCurso`; sobrante a «Pagos sin pedido». |
| **Pago cruzado** (A paga la parte de B) | Permitido y sin riesgo: se aplica al hueco indicado por el `pago_mesa` o, si el `uid` no cuadra, a «Pagos sin pedido». |
| **Token rotado a mitad** (`Cambiar código`) | Hoy invalida el QR y borra `mesaQr/{token}`. En grupo, rotar con pagos en curso es peligroso: **la app avisa y pide confirmación si la mesa tiene miembros o pagos pendientes**; al rotar, se borra `mesaGrupo/{token}`; los pagos ya anunciados siguen aplicándose por `clientRef` (no dependen del token, como hoy en `recibirPagoMesaQr`, que espera el pago aunque el token no cuadre). Los alias (`qrAlias`) siguen valiendo para el grupo como para la cuenta. |
| **Inundación** (llenar el nodo de basura) | Claves con nombre acotado (12 × 30), valores con tipo y longitud validados, nodo bajo el token. El resto es el mismo riesgo que el buzón actual. |
| **Datos personales** | Nombres de pila en claro dentro del grupo (aviso de privacidad ampliado); notas y alergias siguen viajando cifradas dentro del `pedido_mesa`. Se borra al cerrar la mesa. |
| **Reloj / retraso entre móvil y app** | Ninguna decisión depende de la hora del móvil; `ts` es solo informativo. |

---

## 6. Accesibilidad móvil, i18n y pruebas

### 6.1 Móvil 320-430 px
- Una columna; el nombre del comensal y su importe nunca se parten a media palabra (`.gg-fila`, `overflow-wrap:break-word`); botones de 44 px; letra ≥ 11 px (sin `style="font-size"` a mano); campos ≥ 16 px.
- La lista de comensales envuelve (no scroll horizontal). Nombres largos con elipsis y el nombre completo accesible.
- El estado de cada persona **no se comunica solo con color**: texto («Pagado», «Debe 12,40 €», «Pidiendo») + icono. Contraste ≥ 4,5:1.
- Los cambios de otros comensales se anuncian con una región `aria-live="polite"` y sin saltos de scroll (se conserva el scroll al repintar, norma de la comanda).
- Reducir movimiento respetado (nada de animaciones fuera de `prefers-reduced-motion:no-preference`).
- Recuerda: **esta web no carga la fuente de iconos de la app**; nada de `ti ti-…` (la prueba de la web lo exige).
- Compartir el enlace: no hace falta; todos entran por el mismo QR. Un botón «Invitar» no se diseña (el QR físico es la invitación).

### 6.2 i18n
- Textos nuevos en la web: `I18N_WZ`/claves `grupo.*` en es/ca/en (la prueba exige los tres). En la app (TPV, Mi Negocio): `t('qrMesa.grupo.*')` o `gl({es,ca,en})`.
- Dinero con `fmtMoney`; nunca fechas escritas a mano (`localeActual`).
- **No prometer en la web nada que la app no haga** (regla de la casa): p. ej. no decir «recibirás el recibo por correo».

### 6.3 Pruebas que habría que escribir

**De navegador (Puppeteer, contextos SEPARADOS: en el mismo contexto comparten `localStorage` y no son dos aparatos)** — `test/grupo-mesa.mjs`:
1. Dos o tres móviles abren el QR; cada uno reclama su hueco; ven los borradores de los otros (con la nube simulada).
2. Cada uno envía; la app recibe tres `pedido_mesa` con precios recalculados (uno manipulado en consola → corregido y avisado).
3. Plato compartido entre 3: la suma de partes es EXACTAMENTE el total (con 10,00 €/3 y con descuento).
4. «Pagar mi parte»: importe publicado por la app; el móvil NO puede cambiarlo.
5. Pago parcial no cierra la mesa; modo grupo no cierra aunque `pendiente = 0` hasta «Cerrar mesa».
6. Uno paga de menos, de más y dos veces (sobrante a «Pagos sin pedido»).
7. Degradación: sin `grupoListo` o con `grupo:false` sale el pedido normal.
8. Anchos 320, 360, 390, 412, 430 (`movil.mjs`, `movil-lectura.mjs`), 3 idiomas (`traducciones.mjs`), contraste, ventanas visibles, sin texto < 11 px, sin `ti ti-` en la web.
9. TPV: desglose por comensal y botón «Cerrar mesa»; permisos de los seis modos (`permisos.mjs`: solo propietario/edición expulsa a un hueco).
10. Rotar token con miembros: pide confirmación; pagos anunciados se siguen aplicando.

**De emulador (Firebase real con las reglas REALES)** — `test/emulador/grupo-reglas.mjs` (y añadir a `run.sh`):
- No se puede escribir en el hueco de otro `uid`; no se puede reclamar un hueco ocupado; no existe `m12`; no existe `l30`; `q = 0`, `q = 21`, `p` de 61 caracteres, `n` de 31 caracteres: rechazados.
- Con `mesaQr/{token}.grupo` ≠ `true` no se escribe ni se lee `mesaGrupo`.
- Token corto (< 16) rechazado.
- `requests` con `uid` ajeno rechazado; sin `uid` sigue aceptado (compatibilidad).
- `pago_confirmado` sigue rechazado.
- **Dos aparatos** (patrón de `aparato-nuevo.mjs`): uno añade, el otro lo ve por socket; REST con `?auth` devuelve lo mismo.
- Sonda de reglas (`sonda-reglas.mjs`): con reglas viejas `reglasGrupo=false` y NO `reglasAntiguas` si el negocio no usa grupo.
- Cadena completa con Stripe simulado (extender `qr-mesa-stripe.mjs` y `qr-mesa-nube.mjs`): pedido → pago por slot → confirmación por pregunta → mesa abierta → cierre por camarero.

**Del Worker**: `test/pagos-worker.mjs` — `expires_at` presente y dentro de 30-120 min; importe fuera de rango rechazado como hoy.
**Estáticas**: `test/reglas.mjs` (tres copias iguales y con `mesaGrupo`), `test/estatico.mjs`, y, si se añade fichero JS nuevo, darlo de alta en los CUATRO sitios (`build.sh`, `index.html`, `test/estatico.mjs`, `test/apple.mjs`) y en las dos listas de `todo.sh`.

---

## 7. Fases y estimación

(Jornadas de una persona con el contexto ya cargado; incluyen pruebas e i18n; ±40 %.)

**Fase 0, decisiones y comprobaciones (0,5-1 j).** Resolver §8; verificar en la documentación de Firebase el tope de descarga mensual y el trato de REST/ETag; leer la documentación de reembolsos de Connect. Escribir el borrador de reglas en el emulador.

**Fase 1, carrito compartido (6-8 j).**
- Reglas (3 copias) + sonda + `reglasGrupo` + aviso y asistente (1,5 j).
- Web: huecos, nombre, borradores, oyente con `goOffline` por inactividad, respaldo REST, UI de grupo, i18n (2,5-3 j).
- App: `grupo` en `cuentaPublicaMesa`, `uid/slot` en `pedido_mesa`, verificación y marca de comensal en las líneas, vista del camarero con la lista de miembros y «expulsar», limpieza de `mesaGrupo`, ajuste de Mi Negocio (2-3 j).
- Pruebas de navegador y de emulador (1-1,5 j).
- Resultado entregable: se ve lo de los demás, cada línea tiene dueño, **pago al pedir por persona** (Modo A) funciona, nadie paga todavía al final. Ya aporta valor al camarero (sabe quién pidió qué).

**Fase 2, pago repartido (7-10 j).**
- `cuentaPorComensal` con reparto exacto en céntimos, descuento y propina (1,5-2 j).
- Anuncio y aplicación de pago por slot, modo grupo que apaga el cierre automático, botón «Cerrar mesa», desglose en TPV y cobro en caja (2-3 j).
- Web: «Pagar mi parte», propina, estados, vuelta de Stripe (2 j).
- Worker: `expires_at` (0,5 j).
- Pruebas de dinero con cuentas hechas A MANO (como `auditoria-contable.mjs`), de navegador y de emulador (2-2,5 j).

**Fase 3, opcional (3-4 j).** «Cubrir a otro», `/stripe/reembolsar` con `esDuenoDelNegocio`, importe mínimo por pago, indicador de uso de conexiones, contraseña de mesa.

**Orden recomendado:** 0 → 1 → (probar con un local real un par de semanas) → 2 → 3 solo si se pide. Publicar por tandas como pide el dueño (no en cada cambio).

---

## 8. Decisiones que necesita del dueño

1. **¿Qué modo?** A (pagar al pedir, ya existe), B (cada uno paga su parte al final, la meta) o ambos a elegir por el comensal. Recomendación: Fase 1 con A, Fase 2 añade B.
2. **¿Qué se hace con lo no pagado?** Recomendado: la mesa queda abierta y el camarero cobra el resto. Opcional: «cubrir a otro».
3. **¿Se pueden compartir platos?** (Complica el reparto y los céntimos; recomendado sí, con partes iguales; sin porcentajes.)
4. **Líneas sin dueño** (las del camarero): ¿cobra el resto el camarero, o se reparten a partes iguales entre los presentes?
5. **Importe mínimo por pago** (sugerido 5 €) y si se enseña al hostelero la cuenta de comisiones (§4.7).
6. **Propina**: ¿porcentajes sugeridos? ¿tope?
7. **Cierre**: ¿solo el camarero, o también automático cuando todos marcan «Hemos terminado»?
8. **Primer pedido de cada comensal**: ¿lo revisa siempre el camarero (más seguro) o entra solo?
9. **Máximo de comensales por mesa** (propuesto 12) y qué decir al hostelero sobre el techo de ~100 móviles conectados del plan gratuito.
10. **Aceptar el paso de reglas**: es un trámite por negocio (el asistente ya existe). ¿Se vende como «módulo opcional» con la casilla apagada por defecto?
11. **Privacidad**: nombres de pila visibles entre los comensales de la misma mesa; revisar el texto con quien redacte el aviso legal.

---

## 9. Lo que NO se hace (a propósito)

- **Otros canales (para llevar, delivery, reserva con pedido previo): descartados por decisión del dueño (26/11).** En el TPV ya se puede dividir la cuenta a mano y en para llevar/delivery nadie lo necesita.
- Sin cuentas de usuario, sin servidor propio, sin Cloud Functions, sin plan de pago de Firebase.
- Sin pago de la cuenta entera desde el móvil (quitado el 12/11; aquí cada uno paga SU parte, no «la mesa»).
- Sin precios en el estado compartido.
- Sin mapa ni identificación del comensal más allá de un nombre de pila.

---

## 10. Cosas que no he podido verificar

- Si REST con `?auth=` cuenta como conexión simultánea (el proyecto ya asume que no; la página de límites consultada no lo trata).
- El tope mensual de descarga del plan gratuito de Realtime Database (no aparece en la página de límites consultada).
- Si las consultas REST aceptan `If-None-Match`/ETag para ahorrar datos.
- Si Stripe devuelve la comisión al reembolsar un cobro directo en una cuenta Connect.
- La sintaxis exacta y el comportamiento en cascada de las reglas propuestas: se prueban en el emulador (Fase 0), no se dan por buenas por lectura.
