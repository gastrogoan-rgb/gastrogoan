# Worker de Redsys (`gastro`)

`redsys-worker.js` es el código del Worker de Cloudflare que habla con Redsys.
Antes solo existía dentro de Cloudflare; desde el 30/09 **la fuente de la verdad
es este fichero**. Cloudflare no lo coge solo de aquí: hay que pegarlo a mano.

**No lleva ninguna clave.** Las dos que usa están guardadas en Cloudflare
(Settings → Variables and Secrets) y no se tocan:

- `FIREBASE_DB_URL` — la base de datos de `plataforma-gastrogoan`
- `FIREBASE_DB_SECRET` — su "Database secret"

## Publicarlo (desde un ordenador)

1. Abre `redsys-worker.js` en GitHub → botón **Raw** → selecciona todo y copia.
2. dash.cloudflare.com → **Workers y Pages** → `gastro` → **Editar código**.
3. En el editor: selecciona todo, bórralo y pega.
4. **Desplegar** (*Deploy*).

⚠️ Antes, publica las reglas nuevas de la plataforma
(`reglas/reglas-de-la-plataforma.json` → Firebase → `plataforma-gastrogoan` →
Realtime Database → Reglas → Publicar). Sin la regla de `pagos`, la app no
puede leer las confirmaciones del banco.

## Probarlo con el entorno de pruebas de Redsys (sin dinero real)

1. En la app: Mi Negocio → Cobro con tarjeta, con los datos de prueba de
   Redsys (FUC `999008881`, terminal `1`, clave
   `sq7HjrUOBfKmC576ILgskD5srU870gJ7`) y **sin** marcar "entorno real".
2. En la web de reservas del negocio: un pedido para llevar pagado con tarjeta.
   Tarjeta de pruebas `4548810000000003`, caducidad cualquiera futura, CVV `123`.
3. En la app, el pedido tiene que pasar solo a **pagado** en menos de un minuto.
4. Repetir con una reserva con señal y con un autopedido de mesa pagado desde el móvil.
5. Mi Negocio: cambiar el terminal sin escribir la clave actual → tiene que
   pedirla. Desactivar con la clave → la web deja de ofrecer tarjeta.

## Qué cambió el 30/09 y por qué

| Antes | Ahora |
|---|---|
| Con el `tenantId` (está en cualquier tablet del negocio) se podía poner **otro** código de comercio: los cobros iban al banco de otro. | Cambiar o desactivar exige la **clave secreta actual**, que el equipo nunca ve. |
| La configuración se guardaba con el `publicId` deducido del `tenantId`. Los negocios con `publicId` sorteado no podían cobrar ("no tiene configurado el pago con tarjeta"). | Se guarda con el `publicId` de la web, comprobando que es de ese negocio (misma nube en `tenantLookup` y `publicLookup`). Las antiguas se mudan solas. |
| La confirmación del banco iba al buzón de la nube compartida, que la app ya no escucha: el pago entraba en el banco y el pedido se quedaba "pendiente de pago". | Además se guarda en `gastrogoan/pagos/{publicId}/{ref}`, y la app pregunta ahí mientras tenga cobros a medias. |
| "Desactivar" mandaba campos vacíos y el Worker lo rechazaba: nunca funcionó. | Funciona. |

Lo que protege de que alguien pague menos **no está aquí**: está en la app,
que recalcula el precio con su carta y compara con lo que el banco confirma
(ver `revisarPreciosPedidoPublico` y `aplicarPagoConfirmado` en `js/core.js`).

Pruebas: `node test/redsys-worker.mjs` (el Worker, con Firebase simulada, y la
firma comparada con la de Node) y `test/redsys-app.mjs` (la app).

**Riesgo que queda, asumido:** el **primer** alta de un TPV no puede
comprobar que lo hace el dueño (la plataforma no tiene nada que solo el dueño
sepa, más allá de su PIN, y ese no se guarda en ningún sitio). Alguien del
equipo que se adelantara al dueño podría dar de alta el suyo. Si pasa, el
dueño lo ve al instante: la app avisa en rojo de que ese TPV no es el que
guardó él, y al intentar guardar el suyo le pide la clave del otro. Se
arregla borrando `gastrogoan/private/{publicId}/redsysConfig` desde la consola
de Firebase.
