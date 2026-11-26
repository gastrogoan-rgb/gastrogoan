# Worker de pagos (`gastro`) — Stripe

`pagos-worker.js` es el código del Worker de Cloudflare que habla con Stripe.
**Es la fuente de la verdad, pero Cloudflare no lo coge solo de aquí:** hay que
pegarlo a mano cada vez que cambie.

Desde el 30/09 **solo se usa Stripe**. Redsys se quitó: su aviso de "pagado"
dependía de cómo tuviera configurado el banco cada TPV, con el comercio de
pruebas no llegaba nunca, y además hay un problema conocido entre los avisos
de Redsys y Cloudflare. Con Stripe el aviso llega siempre y se puede probar de
punta a punta en modo pruebas.

## Cómo funciona

- **Stripe Connect con Accounts v2** (panel completo del restaurante, comisiones
  y pérdidas a su cargo, lo que antes eran cuentas "estándar"), **cobro directo**.
  Las cuentas se crean con la API v2: Stripe ya no deja crearlas con la v1 en
  integraciones nuevas, y en nuestra cuenta no se puede reactivar. Cada restaurante tiene
  SU cuenta de Stripe (la crea él en 10 minutos con el botón "Conectar con
  Stripe" de Mi Negocio). El dinero va directo a ella y Stripe le cobra la
  comisión a él. A GastroGoan no le cuesta nada ni pasa ningún euro por aquí.
- El Worker solo guarda **qué cuenta de Stripe es de qué negocio**
  (`gastrogoan/private/{publicId}/stripe`). Ninguna clave del negocio.
- Al pagar, Stripe avisa al Worker (`/stripe/webhook`), que **comprueba la
  firma** y apunta el pago en `gastrogoan/pagos/{publicId}/{ref}`. La app lo
  pregunta ahí mientras tenga cobros a medias.
- Lo que protege de que alguien pague de menos está en la app: recalcula el
  precio con su carta y compara con lo que Stripe confirma
  (`revisarPreciosPedidoPublico` y `aplicarPagoConfirmado`, `js/core.js`).

## Claves (en Cloudflare → gastro → Settings → Variables and Secrets)

| Nombre | Qué es |
|---|---|
| `FIREBASE_DB_URL` | la base de datos de `plataforma-gastrogoan` |
| `FIREBASE_DB_SECRET` | su "Database secret" |
| `STRIPE_SECRET_KEY` | clave secreta de la cuenta de Stripe de GastroGoan (`sk_test_…` en pruebas, `sk_live_…` en real) |
| `STRIPE_WEBHOOK_SECRET` | secreto de firma del webhook (`whsec_…`) |

El webhook de Stripe: **Desarrolladores → Webhooks**, eventos de **cuentas
conectadas**, `checkout.session.completed` (y, si se activa Bizum,
`checkout.session.async_payment_succeeded`), a
`https://gastro.gastrogoan.workers.dev/stripe/webhook`.

⚠️ **Pruebas y real son dos mundos aparte en Stripe**: el webhook y las claves
de modo real se crean otra vez, en modo real. Al pasar a real se cambian las
dos claves de Cloudflare y los restaurantes conectan su cuenta de verdad.
La cuenta de pruebas que tuviera guardada un negocio se olvida sola (cada
cuenta lleva su `modo`): basta con volver a pulsar «Conectar con Stripe».

## Publicarlo (desde un ordenador)

1. Abre `pagos-worker.js` en GitHub → **Raw** → selecciona todo y copia.
2. dash.cloudflare.com → **Workers y Pages** → `gastro` → **Editar código**.
3. Selecciona todo, bórralo, pega y **Desplegar**.

## Probarlo en modo pruebas (sin dinero real)

1. App → Mi Negocio → Pago online con tarjeta → **Conectar con Stripe**.
   En la web de Stripe (modo prueba) se puede rellenar con datos de prueba.
2. Al volver tiene que salir **Activo**.
3. Web de reservas → pedido para llevar → pagar con tarjeta `4242 4242 4242 4242`,
   cualquier fecha futura y cualquier CVC.
4. En Cloudflare (Observability) debe aparecer un **POST /stripe/webhook**, y
   en la app el pedido pasa solo a **pagado** en menos de un minuto.

Pruebas automáticas: `node test/pagos-worker.mjs` (el Worker, con Stripe y
Firebase simulados) y `test/pagos-app.mjs` (la app).

## Quién puede conectar o desconectar Stripe (auditoría de seguridad, 25/11)

Antes el Worker se fiaba del `tenantId` que mandaba el navegador, y el `tenantId` lo conoce cualquier empleado (entra con el código). Con él
se podía crear una cuenta de Stripe a nombre de otro y enlazarla al restaurante ajeno (los cobros con tarjeta de sus clientes irían a esa
cuenta) o apagarle el cobro. Ahora **`/stripe/conectar`, `/stripe/desconectar` y `POST /stripe/estado` exigen la prueba de propietario**:

- La app manda `ownerAuthKey` (el authKey de la cuenta del dueño, derivado de usuario + PIN; va en el CUERPO, nunca en la URL).
- El Worker, con su clave de administrador de la plataforma, comprueba que (1) existe `ownerAuth/{authKey}` y de él cuelga el negocio sin
  lápida, (2) el código guardado ahí da, con el algoritmo de la app, exactamente ese `tenantId` (como `businesses/*` lo puede escribir cualquier
  cuenta, solo «estar en la lista» no vale) y (3) el código no está reservado por otro dueño en `codeClaims`.
- **No se guarda ninguna credencial en el Worker**: no hay «el primero que llega gana», que dejaría a un atacante adelantado dueño del alta.
- **Cambiar el PIN no deja al dueño sin su Stripe**: la cuenta se muda a la ruta nueva con su lista de negocios dentro, así que el authKey nuevo
  pasa igual y no hay nada que migrar. Un aparato con el PIN viejo recibe «no se ha podido comprobar que eres el propietario» y la app le pide
  volver a entrar. Un negocio cuya alta en la lista de la cuenta no llegó a subirse se vuelve a anotar solo y se reintenta una vez.
- `GET /stripe/estado` (la web de reservas, y apps antiguas) solo dice si cobra: ya no enseña a nombre de quién está la cuenta.
- La app, además, enseña a nombre de quién está la cuenta y **avisa en rojo si cambia** (`stripeCuentaCambioAviso`); y una cuenta que ya cobra
  sigue sin poder cambiarse desde la app.
- Las tres funciones de derivación del Worker (`ggBizTenantId`, `ggOwnerId`, `ggOwnerUser`) son copia de las de `js/core.js`:
  `test/pagos-worker.mjs` las ejecuta contra las de la app para que no se separen. Si algún día se cambia el algoritmo de la app, hay que
  cambiarlo aquí y volver a pegar el Worker.

⚠️ **Orden de publicación**: primero la app (Cloudflare Pages), luego pegar este Worker. Una app antigua en caché no manda la prueba y un Worker
nuevo le diría «no se ha podido comprobar»; la app se actualiza sola en horas.

**Riesgo que queda:** quien tenga a la vez el código de licencia del negocio y consiga reservarlo antes que su dueño (`codeClaims`) sería, para el
sistema, el dueño: es el límite de licencias sin servidor, ya documentado. Si algún día una cuenta de Stripe queda mal enlazada, se arregla
borrando `gastrogoan/private/{publicId}/stripe` en Firebase.


## Puente de pedidos externos (`pedidos-externos-worker.js`, 17/11)

Recibe un pedido de Glovo / Uber Eats / Just Eat / un agregador (ya normalizado, `POST /pedido`) y lo deja en el buzón de la
nube del restaurante. La app lo muestra en el TPV con la etiqueta de la plataforma, **siempre por aceptar**. Formato del JSON y
las cuatro fuentes posibles, en la cabecera del propio fichero. Se publica pegándolo a mano en Cloudflare (otro Worker, p. ej.
`pedidos.gastrogoan.com`) con las variables `FIREBASE_DB_URL`, `FIREBASE_DB_SECRET` y **`PUENTE_CLAVE` (obligatoria, mínimo 16 caracteres; desde el 25/11)**: cada POST lleva la
cabecera `x-puente-clave` con ese valor, y sin la variable el Worker responde 503 y no acepta nada. Sin clave, cualquiera con el `publicId` (impreso
en el QR del local) podía inyectar pedidos falsos con el nombre de Glovo o Uber. Las fuentes (Make, Zapier, el Email Worker…) tienen que mandarla.
Pruebas: `test/pedidos-plataforma.mjs` (la parte de la app y la normalización del puente).
⚠️ Pendiente de comprobar con una plataforma real: el formato de cada una y su plazo para aceptar el pedido.
