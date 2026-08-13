<!--
titulo: Guía de puesta en marcha
subtitulo: En 3 pasos, tu app lista para usar
kicker: GastroGoan
archivo: Guia-puesta-en-marcha-GastroGoan.pdf
resumen: Tiempo total estimado: unos 20 minutos · Solo tienes que hacerlo UNA VEZ
-->

Sigue esta guía de principio a fin, en el orden indicado, sin saltarte pasos. No necesitas conocimientos técnicos: solo ir despacio y seguir cada paso tal y como se explica.

Al terminar el Paso 3 tu app estará completamente lista: con tu negocio dado de alta, tu propia carta digital online y un código QR para que tus clientes reserven mesa o hagan pedidos desde el móvil.

> Antes de empezar, ten a mano: los dos archivos que te hemos enviado (la app y `reservagastrogoan.html`), tu **usuario y PIN**, y tu **código de negocio**.

### Los 3 pasos

| Paso | Qué harás | Tiempo |
|---|---|---|
| 1 | Subir los archivos a internet (Netlify) | ~10 min |
| 2 | Entrar con tu cuenta y dar de alta tu negocio | ~2 min |
| 3 | Configurar tu nube (Firebase) | ~10 min |

---

## Paso 1 — Sube los archivos a internet

*Netlify · unos 10 minutos*

Para que tu app funcione correctamente —y para que el código QR de reservas y pedidos funcione en el móvil de tus clientes— los dos archivos que te hemos entregado deben subirse juntos a un servicio gratuito llamado Netlify, que les da una dirección web propia.

1. Localiza en tu ordenador los dos archivos que te hemos enviado: el archivo de la app (termina en `.html`) y `reservagastrogoan.html`. Guárdalos juntos dentro de una misma carpeta nueva, por ejemplo llamada **GastroGoan**.
2. Abre un navegador (Chrome, Safari…) y entra en **www.netlify.com**
3. Pulsa **Sign up** y crea una cuenta gratuita. Puedes registrarte con Google o con tu email. Es gratis y no pide tarjeta.
4. Ya dentro de tu panel, pulsa **Add new project**. Te llevará a una página nueva: bájala hasta el final, ahí hay una zona para arrastrar archivos.
5. Arrastra ahí la carpeta **GastroGoan** que creaste en el paso 1, con los dos archivos dentro.
6. Espera unos segundos. Netlify los subirá y te mostrará una dirección web parecida a `https://nombre-aleatorio-12345.netlify.app`
7. Copia esa dirección. **A partir de ahora ésa es la dirección de tu app.** Ábrela en el ordenador y en el móvil o tablet del restaurante, y guárdala como favorito o añádela a la pantalla de inicio del móvil para entrar con un solo toque, como si fuera una aplicación.

> Puedes cambiar ese nombre tan raro por uno más fácil de recordar: dentro del sitio, en **Site configuration → Change site name**, escribe algo como el nombre de tu restaurante.

<!-- separa las dos citas: en Markdown, dos bloques '>' seguidos se fusionan -->

> **Importante:** usa siempre esa dirección web para abrir la app, tanto en el ordenador como en el móvil. No vuelvas a abrir los archivos originales con doble clic: guárdalos como copia de seguridad, pero no trabajes con ellos.

---

## Paso 2 — Entra con tu cuenta y da de alta tu negocio

*unos 2 minutos*

Al comprar has recibido **dos cosas distintas**, y cada una sirve para algo:

- **Un usuario y un PIN** — son **tu cuenta**. Con ellos entras desde cualquier dispositivo: la tablet de la barra, tu móvil, el ordenador de la oficina.
- **Un código de negocio** de 8 caracteres — es la **licencia de este local**. Si algún día abres otro, comprarás otro código, pero tu cuenta seguirá siendo la misma.

1. Abre la dirección web que guardaste en el Paso 1. La primera vez tardará unos segundos en cargar.
2. Pulsa **Acceso Propietarios** y escribe tu usuario y tu PIN. No importa si lo escribes con mayúsculas o con acentos, la app lo entiende igual. Esta primera vez necesitas conexión a internet; después podrás entrar sin ella.
3. La app te propondrá cambiar el PIN por uno de 4 cifras que recuerdes mejor. Es recomendable: **el nuevo te valdrá en todos tus dispositivos**.
4. Verás la pantalla de negocios vacía, porque todavía no has dado de alta ninguno. Pulsa **Canjear negocio**, escribe tu código de 8 caracteres y confirma. Si te dice que no es correcto, revisa que lo has copiado entero y sin espacios.
5. Listo: tu local queda dado de alta y la app pasa sola al Paso 3.

> Guarda tu usuario, tu PIN y tu código en un lugar seguro, por ejemplo en las notas del móvil. Si olvidas el PIN pero te queda algún dispositivo donde ya hubieras entrado, puedes cambiarlo tú mismo sin escribirnos: escribe `GGGG` en la casilla del PIN y elige uno nuevo.

---

## Paso 3 — Configura tu nube

*Firebase · unos 10 minutos*

Este último paso conecta tu app con un espacio de almacenamiento gratuito de Google. Sirve para que todos los dispositivos del restaurante —camareros, cocina, caja— estén siempre sincronizados, y para que la carta y los pedidos online funcionen.

1. Justo después de dar de alta tu negocio, la propia app te mostrará una guía en pantalla con 6 pasos numerados, titulada **Configura tu nube**.
2. Sigue esos 6 pasos tal y como aparecen, en orden y sin saltarte ninguno. La guía te indica exactamente dónde pulsar dentro de la web de Firebase, con explicaciones detalladas para cada botón.
3. Al final copiarás dos datos —**Clave de API** y **URL de la base de datos**— y los pegarás en la propia app, donde se te indique. Pulsa **Guardar y conectar**.
4. La app se recargará sola y quedará lista para usar. Puede aparecerte un recorrido guiado por las distintas pantallas: síguelo para familiarizarte, o ciérralo si prefieres explorar por tu cuenta.

> Guarda también esos dos datos en un lugar seguro. Los necesitarás si más adelante configuras otro dispositivo —el móvil de un camarero, la tablet de cocina—: en esos casos no hay que repetir todo el proceso, solo pegar esos dos datos cuando la app los pida.

### Ya está: tu app está lista

Desde el menú **Reservas y pedidos online**, dentro de la app, puedes descargar tu código QR y tu enlace para compartir con tus clientes. Imprímelo en las mesas, en el escaparate o publícalo en tus redes.

---

## Compartir la app con tus empleados

Cuando quieras dar acceso a un camarero, cocinero o encargado, no necesitan tu cuenta ni tu PIN, ni configurar nada.

1. Dales de alta en el módulo **Personal** de la app, con su nombre y su PIN.
2. Envíales la misma dirección web del Paso 1, junto con el **código de tu negocio**.
3. Que pulsen **Acceso Empleados** y escriban su nombre, su PIN y ese código. La app encuentra sola tu restaurante y su dispositivo queda sincronizado al instante, sin copiar ningún dato técnico.

> Tus empleados **nunca** ven la Gestión Económica ni los ajustes de Mi Negocio. Eso es solo tuyo, y para entrar ahí hace falta tu cuenta de propietario.

---

## Preguntas frecuentes

### ¿Tiene algún coste Netlify o Firebase?
No. Ambos son gratuitos para el uso normal de un restaurante, y ni siquiera piden tarjeta de crédito. Solo tendrían coste si creciera muchísimo el número de clientes que usan tu carta online, algo muy poco probable.

### ¿Puedo usar la app en varios dispositivos a la vez?
Sí. Abre la misma dirección en cada dispositivo y entra con tu usuario y tu PIN. Tus negocios aparecerán solos, sin volver a canjear ningún código.

### ¿Qué pasa si olvido mi PIN?
Si te queda algún dispositivo donde ya hubieras entrado, lo arreglas tú mismo: escribe `GGGG` en la casilla del PIN y elige uno nuevo, que te valdrá en todos tus dispositivos. Si has perdido el PIN y todos los dispositivos a la vez, escríbenos: te damos uno nuevo y recuperas tus locales volviendo a canjear tus códigos. No se pierde ningún dato.

### ¿Qué pasa si pierdo los datos del Paso 3?
Dentro de la app, en el menú de Nube, puedes volver a consultarlos en cualquier momento.

**Voy a abrir otro local. ¿Tengo que crearme otra cuenta?**
No. Tu cuenta es la misma para siempre. Compra otra licencia, te enviaremos solo un código nuevo y lo canjeas desde el botón **Negocios**. Puedes abrirlo como local independiente o como sucursal, que hereda carta, recetas y proveedores del primero.

### ¿Necesito saber programar?
No. Todos los pasos consisten en pulsar botones y copiar y pegar texto. Si sigues la guía con calma, en unos 20 minutos lo tienes todo listo.
