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

- **Stripe Connect, cuentas estándar, cobro directo.** Cada restaurante tiene
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

**Riesgo que queda, asumido:** el primer alta no puede comprobar que lo hace el
dueño (la plataforma no tiene nada que solo sepa el dueño). Por eso Mi Negocio
enseña **a nombre de quién** está la cuenta de Stripe conectada; y una cuenta
que ya cobra no se puede cambiar desde la app. Si alguna vez pasa, se arregla
borrando `gastrogoan/private/{publicId}/stripe` en Firebase.
