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

## 2. Prepara Stripe UNA VEZ (antes de la primera venta)

El cliente compra **una cuenta** (usuario + PIN) y, dentro de ella, **un código por cada local**. Quien ya es cliente y abre otro local solo necesita el código.

Para saber cuál es el caso **sin tener que acordarte**, añade dos preguntas al enlace de pago. En Stripe: **Payment links → tu enlace → Editar → Campos personalizados (custom fields)**.

| Tipo | Etiqueta | Opciones |
|---|---|---|
| Desplegable | `¿Ya tienes cuenta de GastroGoan?` | `No, es mi primera licencia` / `Sí, ya tengo cuenta` |
| Texto | `Tu usuario (el que ya tienes, o el que quieres)` | — |

Marca las dos como **obligatorias**. Con eso, cada notificación de cobro te llega ya con la respuesta.

> **Por qué las dos y no solo el usuario:** el nombre de usuario NO identifica a la persona. Dos clientes distintos pueden querer llamarse `casapaco`. La pregunta del desplegable es la que te dice si es alguien nuevo; el usuario es solo el dato con el que trabajas.

---

## 3. Proceso de una venta (paso a paso)

1. **El cliente paga.** En el aviso de Stripe verás sus dos respuestas.
2. **Abre `generador-licencias.html`** (🔑 PRIVADO) e **inicia sesión de administrador** (botón de arriba). Sin eso, nada de lo que generes servirá.
3. **Escribe el usuario que ha puesto, elige qué contestó y pulsa "¿Qué le tengo que dar?"**. Te responde una de estas cinco cosas:

| Te dice | Qué haces |
|---|---|
| ✅ Genera SOLO un código | Solo el paso 2. |
| ✅ Créale la cuenta Y un código | Paso 1 y paso 2. |
| ⚠️ Ya lo cogió otro cliente | Paso 1 igual: se le asignará `casapaco2`. **Dile cuál es su usuario exacto** o no podrá entrar. |
| 🛑 No generes nada todavía | Dice que ya es cliente pero ese usuario no existe: lo habrá escrito distinto. Pregúntale el suyo exacto antes de nada. |
| ⚠️ (sin respuesta de Stripe) | Solo te informa. Decide tú si tu comprador es esa misma persona. |

4. **Genera** lo que te haya dicho y **envíaselo** con el botón de WhatsApp o email.
5. Todo queda apuntado en el **Registro de ventas** del generador. **Descarga el CSV de vez en cuando**: vive solo en ese navegador.

⚠️ **El PIN no se puede recuperar.** No se guarda en ningún sitio (ni siquiera hasheado): lo que se guarda es una ruta derivada de usuario+PIN. Si el cliente lo pierde y no le queda ningún dispositivo donde ya hubiera entrado, hay que crearle una cuenta nueva. Guarda el CSV.

---

## 3 bis. Cómo funciona la licencia (para que entiendas qué entregas)

- **Cuenta:** un usuario normalizado (`Casa Paco` → `casapaco`) y un PIN de 6 caracteres. Con eso entra desde cualquier dispositivo, y ahí le aparecen todos sus negocios.
- **Código de negocio:** 8 caracteres, uno por local. **No lleva contraseña.** Queda registrado en la plataforma al generarlo; si no existe ahí, no se puede canjear.
- **Un código es de un solo dueño:** en cuanto lo canjea alguien, nadie más puede. Así una licencia no se puede compartir entre dos negocios.
- **El cliente puede cambiar su PIN** cuando quiera, y el nuevo le vale en todos sus dispositivos.
- **Revocación:** añade el `tenantId` a `revoked-licenses.json` y publícalo. Es *fail-open* a propósito: si el archivo no es accesible, la app sigue funcionando para no penalizar a clientes legítimos.

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
