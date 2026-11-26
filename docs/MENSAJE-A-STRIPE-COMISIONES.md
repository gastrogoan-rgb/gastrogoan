# Mensaje para Stripe: comisiones de la plataforma en Connect (borrador, 26/11/2026)

**Para qué sirve:** confirmar por escrito que, con nuestro tipo de cuenta de Connect, **GastroGoan (la plataforma) no paga ninguna comisión ni cuota por cada restaurante conectado**. Si Stripe contestara lo contrario, rompería la regla de oro (nada puede costar dinero por cada cliente).

**Dónde enviarlo:** Panel de Stripe → icono de ayuda («?») → «Contactar con soporte» → tema «Connect». Conviene escribirlo en inglés, que es el idioma por el que más rápido contestan, y guardar la respuesta en el gestor de contraseñas o en la carpeta de copias.

---

## Versión en inglés (para enviar)

**Subject:** Connect pricing: confirming the platform pays no per-account fees (Accounts v2, Stripe-handled pricing)

Hello,

We are a small software platform for restaurants and we use Stripe Connect with **Accounts v2**. Each restaurant connects its own Stripe account and receives customer payments directly (**direct charges**). We do not take an application fee and we never hold the restaurant's money.

We create each connected account through `POST /v2/core/accounts` with:

- `dashboard: "full"`
- `defaults.responsibilities.fees_collector: "stripe"`
- `defaults.responsibilities.losses_collector: "stripe"`
- the merchant configuration with the `card_payments` capability

We would like to confirm in writing:

1. With `fees_collector = "stripe"` and `losses_collector = "stripe"`, does our platform pay **any** fee, per connected account or per active account per month (for example the "$2 per monthly active account" shown for the "You handle pricing" model)? We understand that this setting corresponds to the **"Stripe handles pricing for your users"** model, where the pricing page says "No fees for your platform". Can you confirm that this is the case?
2. Under this setup, who pays the card processing fees, refunds and disputes? We understand it is the connected account (the restaurant).
3. Is there any additional charge for the connected accounts having the **full Stripe Dashboard** (`dashboard: "full"`)?
4. Are there any account, payout-volume or per-payout fees charged to the platform in this configuration?
5. If any of this depends on country (our platform and connected accounts are in Spain, EUR), please tell us.

Our business model has no recurring cost per customer, so it is important for us to have this confirmed before we onboard more restaurants.

Thank you very much.

Kind regards,
GastroGoan

---

## Versión en español (para entenderlo tú)

Somos una plataforma pequeña de software para restaurantes y usamos Stripe Connect con Accounts v2. Cada restaurante conecta su propia cuenta y cobra directamente; nosotros no cobramos comisión ni tocamos su dinero. Las cuentas se crean con `fees_collector` y `losses_collector` en «stripe» y panel completo. Queremos confirmar por escrito: (1) que la plataforma no paga ninguna cuota ni comisión por cuenta conectada; (2) que las comisiones de cobro, devoluciones y disputas las paga el restaurante; (3) que el panel completo no tiene coste extra; (4) que no hay tarifas de cuenta, de volumen de pagos ni por pago a nuestro cargo; (5) si algo cambia por país (España, euros).

---

## Qué hacer con la respuesta
- **Si confirman que la plataforma no paga nada:** marcar la tarea como hecha y guardar el correo.
- **Si dicen que sí hay una cuota por cuenta activa:** avisar a Claude antes de conectar más restaurantes. Habría que valorar repercutirla (como el Worker de pagos ya está pensado para que el coste sea del negocio) o cambiar de modelo de cuenta.

> Fuente de lo que decimos de la página de precios: `stripe.com/connect/pricing`, consultada el 26/11/2026. Stripe no escribe en esa página que `fees_collector = "stripe"` equivalga a «Stripe handles pricing»: por eso se pregunta por escrito.
