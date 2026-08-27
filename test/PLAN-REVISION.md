# Método de revisión completa de la app

Hasta ahora las revisiones iban por corazonadas: encontraban cosas, pero
sin saber **qué quedaba sin mirar**. Esto es el recorrido completo, en el
orden en que un cliente se encuentra la app, y qué se comprueba en cada
parada.

---

## La idea: zonas × lentes

Dos ejes. Las **zonas** son el recorrido real de la app. Las **lentes**
son las siete formas de mirar cada zona. Una zona no está terminada hasta
que ha pasado por todas las lentes que le aplican.

Así, en cualquier momento, se sabe exactamente qué falta.

---

## Las 7 zonas (en orden de recorrido)

### Z1 — Arranque y acceso
Lo primero que existe, antes incluso de tener negocio.
- Pantalla de carga
- Puerta de licencia (canjear código)
- **Acceso Empleados** (nombre + PIN + código)
- **Acceso Propietario** (usuario + PIN)
- Código maestro `GGGG` (recuperar acceso)
- Selector de negocios (cuenta con 0, 1 y varios negocios)
- Cierre de sesión

### Z2 — Alta de un negocio nuevo
El momento más frágil: es donde un cliente se atasca y llama.
- Los 7 pasos de la guía de Firebase
- El formulario de la nube (clave + dirección)
- Asistente de conexiones externas (Redsys, email)
- Tour de bienvenida
- Primer arranque con la nube ya conectada

### Z3 — Cocina (11 módulos)
`comandascocina` · `carta` · `proveedores` · `megalista` · `escandallo`
`fichas` · `pedidos` · `stock` · `horarios` · `distribucion` · `limpieza`

Con sus pestañas internas:
- Limpieza: protocolo, manos, mes, temperaturas, alérgenos, plagas, mantenimiento
- Horarios: personal, día, semana, mes
- Pedidos: crear, historial
- Carta: carta, menús
- Comandas: activas, cerradas
- Stock: ingredientes, elaboraciones

### Z4 — Sala (14 módulos)
`tpv` · `reservas` · `clientes` · `carta` · `proveedores` · `megalista`
`escandallo` · `fichas` · `stock` · `pedidos` · `horarios` · `distribucion`
`limpieza` · `promocion`

Más lo que vive dentro del TPV: comanda de mesa, cobro, división de
cuenta, para llevar/delivery, calendario de programados, cierre de caja.

### Z5 — Gestión (solo propietario)
`manual` · `minegocio` · `dashboard` · `economia`

Las 8 pestañas de Gestión Económica: ventas, fijos, variables, cdr,
resultado, tesorería, punto de equilibrio, capex.

### Z6 — Transversales
Están en todas partes, así que un fallo aquí se multiplica.
- Cabecera (idioma, negocios, actualizar, cerrar sesión, chat, ayuda)
- Chat interno
- Centro de ayuda
- Ventanas emergentes (las ~40 de la app)
- Avisos y confirmaciones

### Z7 — Web pública (la que ven los clientes del restaurante)
- Reservar mesa
- Para llevar
- Delivery
- Pedido desde la mesa (QR)
- Gestionar mi reserva (enlace del email)
- Encuesta de satisfacción
- Enlace corto (`reservas.gastrogoan.com/nombre`)

---

## Las 7 lentes

| | Lente | Qué busca |
|---|---|---|
| **L1** | **Funciona** | Ningún error de JavaScript; cada botón visible hace algo |
| **L8** | **Hace lo correcto** | Recorridos completos: se encadenan los pasos reales de un servicio y se verifica el resultado en cada uno. Que no reviente no basta — el número tiene que salir bien |
| **L2** | **Se ve bien** | Objetivos táctiles ≥44 px, letra ≥10,5 px, texto sin cortar, contraste ≥4,5:1, nada que se pise de verdad |
| **L3** | **Aguanta** | Vacío del todo, contenido larguísimo, mucho volumen |
| **L4** | **Roles** | Cada rol ve lo suyo y **solo** lo suyo (5 vistas: cocinero, cocinero con edición, camarero, camarero con edición, dueño) |
| **L5** | **Nube** | Dos dispositivos de verdad contra Firebase: nada se pierde, nada se pisa, nada se congela |
| **L6** | **Tamaños** | 320, 390, 768, 820, 1440 y móvil en horizontal; con teclado abierto |
| **L7** | **Idiomas** | Castellano, catalán e inglés, sin desbordes por textos más largos |

---

## Dónde estamos ahora

✅ cubierto · ⚠️ parcial · ❌ sin mirar

| | L1 Funciona | L2 Se ve | L3 Aguanta | L4 Roles | L5 Nube | L6 Tamaños | L7 Idiomas |
|---|---|---|---|---|---|---|---|
| **Z1** Acceso | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Z2** Alta | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| **Z3** Cocina | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Z4** Sala | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Z5** Gestión | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Z6** Transversales | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **Z7** Web pública | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |

*Las seis rondas del plan están hechas. Lo que sigue sin cubrir no es por
falta de método, sino porque no se puede hacer desde aquí: iPhone/iPad
reales, la impresora térmica con el cajón delante, y un servicio de
verdad con clientes.*

**Los huecos que este mapa destapó** (y que ya están cerrados):

1. **Z1 y Z2 estaban casi sin mirar.** Son las dos primeras pantallas que
   ve quien compra, y ninguna prueba las recorría: todas empezaban
   saltándose el acceso para llegar antes a los módulos.
2. **Las pestañas internas no las abría nadie.** 84 en total. Ahí estaba
   el fallo de Distribución del Trabajo, y ahí apareció el del Historial
   de pedidos.
3. **Los idiomas solo se comprobaban por traducciones que faltaran**, no
   por que cupieran.
4. **La web pública nunca se probó con volumen.**

---

## Orden de ataque

Por riesgo × cuánto se usa, no por comodidad:

| Ronda | Qué | Por qué primero |
|---|---|---|
| **R7** | Z1 + Z2 con todas las lentes | Son las dos primeras pantallas del cliente y están casi sin mirar |
| **R8** | Pestañas internas de Z3/Z4/Z5 (L1+L2) | ~25 pantallas que hoy no abre ninguna prueba |
| **R9** | L7 (idiomas) sobre todas las zonas | Los textos largos rompen diseños; hoy no se mira |
| **R10** | Z6 transversales (L1+L2+L3) | Un fallo aquí se multiplica por toda la app |
| **R11** | L3 en Z7 (web pública con volumen) | Es la cara del negocio ante sus clientes |
| **R12** | L5 (nube) sobre Z1/Z2 y el cobro | Los bugs más caros han salido todos de aquí |

| **R13** | Recorridos completos de principio a fin | Medida la cobertura: solo el 43% del código llegaba a ejecutarse, y lo que faltaba era justo la lógica de negocio |

| **R15** | Los caminos de error (lo que la app debe **rechazar**) | Hasta aquí solo se probaba el camino feliz: nadie comprobaba qué pasa con el cliente confundido |

**Las ocho rondas están hechas.** Lo que encontró cada una está en el
historial de commits; el resumen: 58 defectos visuales, un módulo que
podía reventar entero (Historial de pedidos), el botón de cerrar el chat
a 12×20 px, el gris de todo el texto secundario por debajo del mínimo
legible, la casilla obligatoria de la web pública a 13×13 px, el
duplicado de cobro que ahora queda anotado, y —el más caro— el coste de
los escandallos, que salía por debajo del real porque la merma se sumaba
en vez de descontarse.

### Los 10 recorridos completos (R13)

Encadenan pasos reales y comprueban el resultado, no solo que no
reviente:

1. De ingrediente a factura (escandallo → carta → venta → IVA → Gestión Económica)
2. Descuento, propina y arqueo
3. Raciones limitadas que se agotan solas
4. Dividir la cuenta entre 4 (y el caso feo: 100 € entre 3)
5. Pedido recibido a medias (lo que no llega no suma stock)
6. Fichajes y horas del mes
7. Anular devuelve el stock, ingrediente a ingrediente
8. Aforo (las canceladas no ocupan plaza)
9. Coste de envío y umbral de envío gratis
10. Menú con grupos y suplementos

**Lo que sigue sin cubrirse** y no se puede desde aquí: iPhone/iPad
reales, la impresora térmica con el cajón delante, el pago con Redsys en
producción continuada, y un servicio real con clientes.

---

## Reglas de trabajo

1. **Reproducir antes de arreglar.** Nada se toca sin haber visto el fallo.
2. **Confirmar antes de avisar.** Una alarma geométrica no basta: si dos
   botones "se pisan", se comprueba con `elementFromPoint` que de verdad
   sean pulsables ahí. Ya hubo una falsa alarma así.
### Lo que destapó R15 (caminos de error)

Dos fallos reales, los dos en el mismo sitio: **el PIN**.

1. **Ningún empleado que cambiara su PIN podía volver a entrar.** Se
   guardaba sin sal (`hashPin(p1)`) y se validaba con la sal del código del
   negocio: las dos rutas nunca coincidían. Y como la app prohíbe quedarse
   con el '1234' de fábrica, el bloqueo era seguro para todos. Habría
   aparecido el primer día de servicio real, con el personal delante.
2. **El PIN del negocio se guardaba en texto plano** en `DB.business.pin`, y
   ese bloque **se sincroniza con Firebase**: quedaba legible en la nube.
   Ahora se hashea con la misma sal que el de los empleados, con respaldo
   para los guardados de antes.

Y una **falsa alarma más** (van 11): "sin nube el indicador se queda mudo".
No: se **oculta a propósito** (`updateSyncBadge('local')`), porque el
asistente de nube es obligatorio en el alta y un aviso permanente ahí solo
sería ruido.

3. **Desconfiar de la propia prueba.** Cuando algo falla, la primera
   sospecha es la semilla de datos, no el producto. Ha pasado media docena
   de veces (nombres de campo inventados, dispositivos que en realidad
   compartían almacenamiento, emulador sin vaciar entre tandas).
4. **Cada hallazgo deja prueba puesta**, para que no vuelva.
5. **La batería completa (`bash test/todo.sh`) solo antes de publicar**,
   no en cada ronda: son ~20 minutos.
