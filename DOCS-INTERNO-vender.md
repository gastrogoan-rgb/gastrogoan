# 🔒 GastroGoan — Manual interno de venta (PRIVADO)

> **NO compartas este documento ni los archivos marcados como PRIVADOS con ningún cliente.**
> Quien tenga el generador de licencias puede crear claves gratis.

---

## 1. Qué vendes y a qué precio

- **Producto:** GastroGoan, app de gestión integral para restaurantes (TPV + cocina + sala + reservas + stock + personal + finanzas), todo en un solo archivo que funciona offline.
- **Precio:** **100 € pago único.** Sin suscripción, sin comisiones, del cliente para siempre.
- **Argumento de venta:** sustituye 6-7 apps con cuota mensual (TPV, delivery, carta QR, personal, reservas, stock, economía) que suman **+300 €/mes (~3.600 €/año)**. Se amortiza el primer mes.
- **Cobro:** enlace de Stripe → `https://buy.stripe.com/aFa6oGeSK44jaFw1mvdwc01`
  - ⚠️ `landing.html` todavía tiene el enlace como `PLACEHOLDER`. Sustitúyelo por el enlace real antes de publicar la web.

---

## 2. Proceso completo de una venta (paso a paso)

1. **El cliente paga** los 100 € (Stripe o el método que acuerdes).
2. **Generas su licencia:**
   - Abre **`generador-licencias.html`** (🔑 ARCHIVO PRIVADO) en tu navegador.
   - Escribe el **nombre del restaurante** tal cual quieres que aparezca en su app (ej: `Casa Paco`).
   - Pulsa **Generar clave**. Cópiala o envíala directamente por WhatsApp / email con el botón.
   - Cada clave queda apuntada en el **Registro de ventas** del propio generador. Descarga el **CSV** de vez en cuando como copia de seguridad (vive solo en ese navegador).
3. **Entregas al cliente** (ver sección 4 — "Lo que SÍ se entrega").
4. **El cliente activa** la app pegando la clave en la pantalla de activación la primera vez que la abre.

---

## 3. Cómo funciona la licencia (para que entiendas qué entregas)

- La clave tiene el formato: `NOMBRE-XXXX-XXXX-XXXX-TENANT(5 grupos)`.
- Lleva una **firma** calculada con un secreto (`ggLicSig`) que la app valida offline: no se puede falsificar sin el generador.
- Incluye un **tenant ID** único de 20 caracteres → es el identificador de la nube privada de ese restaurante (cada cliente tiene sus datos aislados).
- **Revocación (opcional):** el archivo `revoked-licenses.json` permite anular una clave (p. ej. un impago o reembolso). La comprobación es *fail-open*: si el archivo no es accesible, la app sigue funcionando para no penalizar a clientes legítimos. Para revocar, añade la clave al JSON y publícalo en la URL que la app consulta.

---

## 4. Lo que SÍ se entrega al cliente

| Archivo | Para qué |
|---|---|
| **`kit-gastrogoan (52).html`** | La aplicación. Es el producto. (Puedes renombrarlo a `GastroGoan.html` al enviarlo.) |
| **Clave de licencia** | Generada con el generador. Se envía por WhatsApp/email. |
| **`Guia-puesta-en-marcha-GastroGoan.pdf`** | Guía de primeros pasos. |
| **`tutorial-nube.html`** | Cómo configurar la nube (Firebase) para sincronizar dispositivos. |
| **`tutorial-netlify.html`** | Cómo publicar la app online para pedidos/reservas con QR. |
| **`reservagastrogoan.html`** | Página pública de reservas/pedidos. Se sube junto a la app. **⚠️ No la renombres** — la app genera los enlaces QR usando ese nombre exacto de archivo. |

> Material de marketing (catálogo, capturas) puedes enseñarlo libremente, pero **no** es parte de la entrega.

---

## 5. Lo que NUNCA se entrega (PRIVADO)

| Archivo | Por qué |
|---|---|
| 🔑 **`generador-licencias.html`** | Permite crear claves válidas gratis. **NUNCA.** |
| **`revoked-licenses.json`** | Control interno de revocaciones. |
| **`build_pdf.py`** | Herramienta interna. |
| **`landing.html`** | Web de venta (es tuya, no del cliente). |
| **`kit-gastrogoan-PREVIEW.html`** | Versión con licencia/nube **desactivadas**: quien la tenga usaría la app gratis para siempre. Solo para tus demos/capturas. |
| **`kit-gastrogoan-DEMO.html`** | Igual, uso interno. |

---

## 6. Onboarding del cliente (qué verá al abrir la app)

La app guía al cliente con pantallas en orden:

1. **Activación** → pega la clave de licencia.
2. **Configurar la nube (Firebase)** → opcional pero recomendado; sincroniza varios dispositivos (cocina, barra, móviles). Tutorial: `tutorial-nube.html`.
3. **Publicar online (Netlify)** → opcional; necesario solo si quiere pedidos/reservas por QR. Tutorial: `tutorial-netlify.html`.
4. **Tour guiado** dentro de la app.

> Si el cliente solo quiere un TPV en una tablet sin internet, puede saltarse los pasos 2 y 3 y empezar a trabajar directamente.

---

## 7. Checklist de entrega (copia y pega por cada venta)

```
[ ] Pago de 100 € recibido
[ ] Licencia generada en generador-licencias.html (nombre correcto del restaurante)
[ ] Clave enviada al cliente (WhatsApp/email)
[ ] App enviada (kit-gastrogoan.html renombrado)
[ ] Guía de puesta en marcha (PDF) enviada
[ ] Tutoriales de nube y Netlify enviados (si los necesita)
[ ] reservagastrogoan.html enviado (si quiere reservas/pedidos online)
[ ] Venta apuntada en el registro / CSV descargado
```
